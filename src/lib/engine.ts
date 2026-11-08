// The rules of the world.
//
// Everything the player sees — XP, levels, streaks, achievements, boss results — is *derived*
// from the raw logs by one deterministic chronological pass (`simulate`). Nothing is "claimed":
//   • a quest can only pay out if the logged numbers meet its requirement,
//   • each award has a unique key, so XP can never be counted twice,
//   • correcting or deleting an entry simply re-runs the pass and the award disappears,
//   • config changes apply from the day they were made, so history is never silently re-scored.

import { RULES, configFor } from "./config";
import {
  ACHIEVEMENTS, BOSSES, MONTHLY_QUESTS, RARITY_XP, REGIONS, VALIANT_XP, WEEKLY_QUESTS, emptyPeriod,
  type Boss, type PeriodStats, type Stats,
} from "./content/defs";
import { CODING_KINDS, KIND_BY_ID, SKILLS, TOPICS } from "./content/skills";
import {
  addDays, diffDays, eachDay, isISO, journeyDay, journeyEnd, monthDates, monthKey, todayISO, weekDates, weekEnd,
  weekStart, type ISODate,
} from "./dates";
import { fmtHours, fmtMinutes } from "./format";
import { levelInfo, skillLevelInfo, type LevelInfo } from "./progression";
import {
  SKILL_IDS, emptyDay, type ConfigEntry, type DayLog, type GameState, type SideQuestDef, type SkillId, type TopicId, type WorkTask,
} from "./types";

// ───────────────────────── Types ─────────────────────────
export interface Bonus { key: string; label: string; xp: number }
export type QuestState = "empty" | "partial" | "done" | "exceeded";
export interface QuestEval {
  id: SkillId;
  state: QuestState;
  logged: boolean;
  value: number;
  min: number;
  goal: number;
  pct: number; // progress toward the minimum, 0..1
  xp: number; // base (full or partial) XP
  bonuses: Bonus[];
  total: number;
  summary: string;
  note?: string;
}
export interface DayMetrics {
  pages: number;
  readDay: boolean;
  learnEff: number;
  learnDay: boolean;
  learnSessions: number;
  codingSessions: number;
  topicEff: Partial<Record<TopicId, number>>;
  activeMin: number;
  meditateMin: number;
  workoutDay: boolean;
  meditateDay: boolean;
  healthyDay: boolean;
  sleepHours: number | null;
  sleepGood: boolean;
  rhythm: boolean;
  recovery: boolean;
  earlyWake: boolean;
  screenMin: number | null;
  screenOk: boolean;
  screenGoalOk: boolean;
  lowScreen: boolean;
  tasksDone: number;
  highTasks: number;
  fiveTaskDay: boolean;
  reflection: boolean;
}
export interface DayEval {
  date: ISODate;
  quests: Record<SkillId, QuestEval>;
  questsDone: number;
  kept: boolean;
  perfect: boolean;
  minimumDay: boolean;
  flawlessXp: number;
  comebackXp: number;
  reflectionXp: number;
  sideXp: number;
  sideCounted: string[];
  metrics: DayMetrics;
}
export type AwardKind =
  | "daily" | "bonus" | "flawless" | "comeback" | "reflect" | "side" | "weekly" | "monthly" | "boss" | "valiant"
  | "achievement" | "region" | "wreflect";
export interface Award { key: string; date: ISODate; xp: number; kind: AwardKind; label: string; skill?: SkillId; icon?: string; refId?: string }

export interface WeekInfo {
  weekStart: ISODate;
  active: boolean;
  stats: PeriodStats;
  boss: Boss | null;
  bossWon?: ISODate;
  valiant?: ISODate;
  weekly: Record<string, ISODate>;
}
export interface MonthInfo {
  ym: string;
  active: boolean;
  activeDays: number;
  totalDays: number;
  stats: PeriodStats;
  done: Record<string, ISODate>;
}

export interface Derived {
  today: ISODate;
  first: ISODate;
  last: ISODate;
  awards: Award[];
  totalXp: number;
  skillXp: Record<SkillId, number>;
  level: LevelInfo;
  skills: Record<SkillId, LevelInfo>;
  days: Record<ISODate, DayEval>;
  streak: { current: number; longest: number; shielded: ISODate[]; shieldReady: boolean; shieldReadyOn?: ISODate; lastKept?: ISODate };
  unlocked: Record<string, ISODate>;
  cleared: Record<string, ISODate>;
  stats: Stats;
  weeks: Record<ISODate, WeekInfo>;
  months: Record<string, MonthInfo>;
  xpByDate: Record<ISODate, number>;
  spent: number;
  gold: number;
}

// ───────────────────────── Helpers ─────────────────────────
const toMin = (hhmm?: string) => {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
/** Bedtime as minutes after 18:00 so 23:30 and 00:30 are an hour apart, not 23. */
const shiftBed = (mins: number) => (mins - 18 * 60 + 1440) % 1440;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

export function hoursBetween(bed: string, wake: string): number | null {
  const b = toMin(bed), w = toMin(wake);
  if (b == null || w == null) return null;
  let d = w - b;
  if (d <= 0) d += 1440;
  return Math.round((d / 60) * 4) / 4;
}

export function hasReflection(r: DayLog["reflection"]): boolean {
  if (!r) return false;
  const filled = [r.accomplished, r.distraction, r.learned, r.improve, r.journal].filter((x) => x && x.trim().length >= 3).length;
  return filled >= 2;
}

export interface DayCtx { prevSleep: number | null; bedtimes: number[]; lastKept: ISODate | null }
export const freshCtx = (): DayCtx => ({ prevSleep: null, bedtimes: [], lastKept: null });

const qBase = (id: SkillId, min: number, goal: number): QuestEval => ({
  id, state: "empty", logged: false, value: 0, min, goal, pct: 0, xp: 0, bonuses: [], total: 0, summary: "",
});

// ───────────────────────── One day ─────────────────────────
export function evalDay(
  date: ISODate, log: DayLog, doneTasks: WorkTask[], cfg: ConfigEntry, ctx: DayCtx, sideDefs: Record<string, SideQuestDef>,
): DayEval {
  const T = cfg.targets, X = cfg.xp;
  const partialXp = (base: number) => Math.round(base * RULES.partialPct);
  const halfXp = (base: number) => Math.max(1, Math.round(base * 0.5));
  const quests = {} as Record<SkillId, QuestEval>;
  const finish = (q: QuestEval, base: number) => {
    if (q.state === "done" && q.bonuses.length) q.state = "exceeded";
    q.xp = q.state === "partial" ? partialXp(base) : q.state === "done" || q.state === "exceeded" ? base : 0;
    q.total = q.xp + q.bonuses.reduce((s, b) => s + b.xp, 0);
    quests[q.id] = q;
  };

  // SLEEP — healthy consistency, never oversleeping
  const sq = qBase("sleep", T.sleepMin, T.sleepMax);
  const sleep = log.sleep;
  let sleepGood = false, rhythm = false, recovery = false, earlyWake = false;
  if (sleep) {
    const h = sleep.hours;
    sq.logged = true; sq.value = h;
    sq.summary = `${fmtHours(h)} slept`;
    if (h >= T.sleepMin && h <= T.sleepMax) {
      sq.state = "done"; sq.pct = 1; sleepGood = true;
      const bed = toMin(sleep.bedtime), wake = toMin(sleep.wake);
      if (bed != null && wake != null && ctx.bedtimes.length >= 3 &&
          Math.abs(shiftBed(bed) - median(ctx.bedtimes)) <= RULES.bedtimeWindow) {
        rhythm = true;
        sq.bonuses.push({ key: "rhythm", label: "Steady rhythm", xp: 5 });
      }
      if (ctx.prevSleep != null && ctx.prevSleep < RULES.sleepFloor) {
        recovery = true;
        sq.bonuses.push({ key: "recovery", label: "Recovery night", xp: 10 });
      }
      if (wake != null && wake >= 180 && wake <= 390) earlyWake = true;
    } else if (h >= RULES.sleepFloor && h < T.sleepMin) {
      sq.state = "partial"; sq.pct = h / T.sleepMin;
      sq.note = "A little short — partial credit. Tonight is a fresh chance.";
    } else if (h > T.sleepMax) {
      sq.pct = 0;
      sq.note = `Over ${fmtHours(T.sleepMax)} — rest is welcome, but oversleeping doesn't earn XP.`;
    } else {
      sq.pct = h / T.sleepMin;
      sq.note = "A short night. Be kind to yourself — recover tonight for a bonus.";
    }
  } else {
    sq.summary = "Not logged";
    sq.note = "Log last night's sleep.";
  }
  finish(sq, X.sleep);

  // READING
  const pages = log.reading.reduce((s, r) => s + r.pages, 0);
  const rq = qBase("reading", T.readMin, T.readGoal);
  rq.logged = pages > 0; rq.value = pages; rq.pct = Math.min(1, pages / T.readMin);
  rq.summary = `${pages} / ${T.readMin} pages`;
  if (pages >= T.readMin) {
    rq.state = "done";
    if (pages >= T.readGoal) rq.bonuses.push({ key: "goal", label: "Deep reader", xp: halfXp(X.reading) });
  } else if (pages >= Math.ceil(T.readMin / 2)) {
    rq.state = "partial";
    rq.note = "One more page completes the minimum.";
  }
  finish(rq, X.reading);

  // LEARNING — practice counts fully, passive study counts half
  let rawEff = 0, notedSession = false;
  const rawTopic: Partial<Record<TopicId, number>> = {};
  let sessions = 0, coding = 0;
  for (const s of log.learning) {
    const eff = s.minutes * (KIND_BY_ID[s.kind]?.weight ?? 1);
    rawEff += eff;
    rawTopic[s.topic] = (rawTopic[s.topic] ?? 0) + eff;
    if (s.minutes >= 10) sessions++;
    if (s.minutes >= 10 && CODING_KINDS.includes(s.kind)) coding++;
    if ((s.note ?? "").trim().length >= 15) notedSession = true;
  }
  const capFactor = rawEff > RULES.learnCapMin ? RULES.learnCapMin / rawEff : 1;
  const learnEff = rawEff * capFactor;
  const topicEff: Partial<Record<TopicId, number>> = {};
  (Object.keys(rawTopic) as TopicId[]).forEach((k) => (topicEff[k] = (rawTopic[k] ?? 0) * capFactor));
  const lq = qBase("learning", T.learnMin, T.learnGoal);
  lq.logged = log.learning.length > 0; lq.value = Math.round(learnEff); lq.pct = Math.min(1, learnEff / T.learnMin);
  lq.summary = `${Math.round(learnEff)} / ${T.learnMin} focused min`;
  if (learnEff >= T.learnMin) {
    lq.state = "done";
    if (learnEff >= T.learnGoal) lq.bonuses.push({ key: "goal", label: "Deep session", xp: halfXp(X.learning) });
    if (notedSession) lq.bonuses.push({ key: "notes", label: "Written understanding", xp: 5 });
  } else if (learnEff >= Math.ceil(T.learnMin / 2)) {
    lq.state = "partial";
  }
  if (lq.logged && log.learning.every((s) => s.kind === "study") && lq.state !== "done") {
    lq.note = "Passive study counts at half. A problem or mini-build makes it count fully.";
  }
  finish(lq, X.learning);

  // HEALTH — capped, no weight/calorie tracking by design
  const activeRaw = log.activity.filter((a) => a.type !== "meditate").reduce((s, a) => s + a.minutes, 0);
  const meditateMin = log.activity.filter((a) => a.type === "meditate").reduce((s, a) => s + a.minutes, 0);
  const activeMin = Math.min(activeRaw, RULES.activeCapMin);
  const hq = qBase("health", T.moveMin, T.moveMin + T.meditateMin);
  hq.logged = log.activity.length > 0 || !!log.healthyEating;
  hq.value = activeMin; hq.pct = Math.min(1, activeMin / T.moveMin);
  hq.summary = `${activeMin} / ${T.moveMin} min moving`;
  const meditated = meditateMin >= T.meditateMin;
  if (activeMin >= T.moveMin) {
    hq.state = "done";
    if (meditated) hq.bonuses.push({ key: "still", label: "Stillness", xp: 5 });
    if (log.healthyEating) hq.bonuses.push({ key: "eat", label: "Nourished", xp: 5 });
  } else if (activeMin >= Math.ceil(T.moveMin / 2) || meditated) {
    hq.state = "partial";
    hq.note = meditated && activeMin < Math.ceil(T.moveMin / 2) ? "Stillness counts. A short walk completes it." : "Almost — a few more minutes.";
  }
  if (activeRaw > 120) hq.note = "That's plenty. Rest is part of training.";
  finish(hq, X.health);

  // SCREEN — honest recreational time only; must be logged to count
  const scr = log.screen;
  const cq = qBase("screen", T.screenLimit, T.screenGoal);
  let screenOk = false, screenGoalOk = false, lowScreen = false;
  if (scr != null) {
    cq.logged = true; cq.value = scr;
    cq.summary = `${fmtMinutes(scr)} / ${fmtMinutes(T.screenLimit)} limit`;
    if (scr <= T.screenLimit) {
      cq.state = "done"; cq.pct = 1; screenOk = true;
      if (scr <= T.screenGoal) { screenGoalOk = true; cq.bonuses.push({ key: "goal", label: "Deep focus", xp: halfXp(X.screen) }); }
      if (scr < 60) lowScreen = true;
    } else {
      cq.note = "Over today's limit — no penalty. Tomorrow is a clean slate.";
    }
  } else {
    cq.summary = "Not logged";
    cq.note = "Log recreational screen time (work & study don't count).";
  }
  finish(cq, X.screen);

  // WORK — tasks done, not hours
  const tasksDone = doneTasks.length;
  const counted = Math.min(tasksDone, RULES.taskCap);
  const highTasks = doneTasks.filter((t) => t.priority === "high").length;
  const hasWin = doneTasks.some((t) => (t.win ?? "").trim().length >= 3);
  const wq = qBase("work", T.workTasks, T.workTasks);
  wq.logged = tasksDone > 0; wq.value = tasksDone; wq.pct = Math.min(1, counted / T.workTasks);
  wq.summary = `${tasksDone} / ${T.workTasks} tasks`;
  if (counted >= T.workTasks) {
    wq.state = "done";
    if (highTasks > 0) wq.bonuses.push({ key: "own", label: "Ownership", xp: 5 });
    if (hasWin) wq.bonuses.push({ key: "win", label: "Recorded win", xp: 5 });
  } else if (counted >= Math.ceil(T.workTasks / 2)) {
    wq.state = "partial";
  }
  finish(wq, X.work);

  const questsDone = SKILL_IDS.filter((k) => quests[k].state === "done" || quests[k].state === "exceeded").length;
  const kept = questsDone >= T.streakQuests;
  const perfect = questsDone === SKILL_IDS.length;
  const minimumDay = ["reading", "learning", "health"].every((k) => {
    const st = quests[k as SkillId].state;
    return st === "done" || st === "exceeded";
  });
  const comebackXp = kept && ctx.lastKept && diffDays(ctx.lastKept, date) >= 3 ? X.comeback : 0;
  const reflection = hasReflection(log.reflection);

  const sideCounted: string[] = [];
  let sideXp = 0;
  for (const id of log.sideDone) {
    const def = sideDefs[id];
    if (def && sideCounted.length < RULES.sideQuestDailyCap && !sideCounted.includes(id)) {
      sideCounted.push(id);
      sideXp += def.xp;
    }
  }

  return {
    date, quests, questsDone, kept, perfect, minimumDay,
    flawlessXp: perfect ? X.flawless : 0,
    comebackXp,
    reflectionXp: reflection ? X.reflection : 0,
    sideXp, sideCounted,
    metrics: {
      pages, readDay: ["done", "exceeded"].includes(rq.state), learnEff, learnDay: ["done", "exceeded"].includes(lq.state),
      learnSessions: sessions, codingSessions: coding, topicEff,
      activeMin, meditateMin, workoutDay: activeMin >= T.moveMin, meditateDay: meditated, healthyDay: !!log.healthyEating,
      sleepHours: sleep ? sleep.hours : null, sleepGood, rhythm, recovery, earlyWake,
      screenMin: scr ?? null, screenOk, screenGoalOk, lowScreen,
      tasksDone, highTasks, fiveTaskDay: counted >= T.workTasks, reflection,
    },
  };
}

// ───────────────────────── Weeks / bosses ─────────────────────────
const journeyDaysInWeek = (ws: ISODate, start: ISODate) => {
  const end = journeyEnd(start);
  return weekDates(ws).filter((d) => d >= start && d <= end).length;
};
/** A week only hosts a boss if at least four of its days belong to the journey. */
export const isActiveWeek = (ws: ISODate, start: ISODate) => journeyDaysInWeek(ws, start) >= 4;

export function firstBossWeek(start: ISODate): ISODate {
  let ws = weekStart(start);
  while (!isActiveWeek(ws, start)) ws = addDays(ws, 7);
  return ws;
}
export function bossForWeek(ws: ISODate, start: ISODate): Boss | null {
  if (!isActiveWeek(ws, start)) return null;
  const idx = Math.round(diffDays(firstBossWeek(start), ws) / 7);
  if (idx < 0) return null;
  return BOSSES[idx % BOSSES.length];
}

const activeMonthDays = (ym: string, start: ISODate) => {
  const end = journeyEnd(start);
  return monthDates(ym).filter((d) => d >= start && d <= end).length;
};
export const scaledTarget = (target: number, activeDays: number, totalDays: number) =>
  Math.max(1, Math.ceil((target * activeDays) / totalDays));

function accumulate(p: PeriodStats, ev: DayEval) {
  const m = ev.metrics;
  p.logDays += 1;
  p.kept += ev.kept ? 1 : 0;
  p.minimumDays += ev.minimumDay ? 1 : 0;
  p.perfectDays += ev.perfect ? 1 : 0;
  p.questsDone += ev.questsDone;
  p.readDays += m.readDay ? 1 : 0;
  p.pages += m.pages;
  p.learnDays += m.learnDay ? 1 : 0;
  p.learnSessions += m.learnSessions;
  p.codingSessions += m.codingSessions;
  p.learnEff += m.learnEff;
  p.workoutDays += m.workoutDay ? 1 : 0;
  p.meditateDays += m.meditateDay ? 1 : 0;
  p.healthyDays += m.healthyDay ? 1 : 0;
  p.sleepGoodDays += m.sleepGood ? 1 : 0;
  p.rhythmDays += m.rhythm ? 1 : 0;
  p.screenOkDays += m.screenOk ? 1 : 0;
  p.tasksDone += m.tasksDone;
  p.highTasks += m.highTasks;
  p.reflections += m.reflection ? 1 : 0;
}

const emptyStats = (): Stats => ({
  day: 0, xp: 0, level: 1, questsDone: 0, keptDays: 0, minimumDays: 0, perfectDays: 0, harmonyDays: 0, streak: 0, longest: 0,
  comebacks: 0, pages: 0, readDays: 0, books: 0, sessions: 0, codingSessions: 0, learnEff: 0,
  topicEff: Object.fromEntries(TOPICS.map((t) => [t.id, 0])) as Record<TopicId, number>,
  topicsTouched: 0, topicsAdept: 0, topicsMaster: 0, workoutDays: 0, activeMin: 0, meditateDays: 0, healthyDays: 0,
  sleepGoodDays: 0, bestSleepStreak: 0, recoveries: 0, earlyWakeDays: 0, screenOkDays: 0, bestScreenStreak: 0,
  screenGoalDays: 0, lowScreenDays: 0, tasksDone: 0, highTasksDone: 0, fiveTaskDays: 0, reflections: 0, weeklyReflections: 0,
  bossWins: 0, valiants: 0, weeklyQuests: 0, monthlyChallenges: 0, sideQuests: 0, learnQuestsDone: 0, rewardsClaimed: 0, regionsCleared: 0,
  finalDayKept: 0,
  skillLevel: { sleep: 1, reading: 1, learning: 1, health: 1, screen: 1, work: 1 },
});

// ───────────────────────── The whole journey ─────────────────────────
export function simulate(state: GameState, today: ISODate = todayISO()): Derived {
  const start = state.settings.startDate;
  const end = journeyEnd(start);
  const sideDefs = Object.fromEntries(state.sideQuests.map((s) => [s.id, s]));

  const logDates = Object.keys(state.days).filter(isISO).sort();
  const doneByDate: Record<ISODate, WorkTask[]> = {};
  for (const t of state.tasks) if (t.doneOn && isISO(t.doneOn)) (doneByDate[t.doneOn] ||= []).push(t);
  const finishedByDate: Record<ISODate, number> = {};
  for (const b of state.books) if (b.finishedOn) finishedByDate[b.finishedOn] = (finishedByDate[b.finishedOn] ?? 0) + 1;
  const lqByDate: Record<ISODate, typeof state.learnQuests> = {};
  for (const q of state.learnQuests) if (q.doneOn && isISO(q.doneOn)) (lqByDate[q.doneOn] ||= []).push(q);
  const claimedByDate: Record<ISODate, number> = {};
  for (const r of state.redemptions) claimedByDate[r.date] = (claimedByDate[r.date] ?? 0) + 1;
  const wrByDate: Record<ISODate, string[]> = {};
  for (const [ws, w] of Object.entries(state.weeklyReflections)) (wrByDate[w.savedOn] ||= []).push(ws);

  const touched = [...logDates, ...Object.keys(doneByDate).filter(isISO), ...Object.keys(lqByDate)].sort();
  let first = start;
  if (touched[0] && touched[0] < first) first = touched[0];
  let last = today;
  const latestTouched = touched[touched.length - 1];
  if (latestTouched && latestTouched > last) last = latestTouched;

  const awards: Award[] = [];
  const xpByDate: Record<ISODate, number> = {};
  const skillXp: Record<SkillId, number> = { sleep: 0, reading: 0, learning: 0, health: 0, screen: 0, work: 0 };
  let xp = 0;
  const push = (a: Award) => {
    if (a.xp <= 0) return;
    awards.push(a);
    xp += a.xp;
    if (a.skill) skillXp[a.skill] += a.xp;
    xpByDate[a.date] = (xpByDate[a.date] ?? 0) + a.xp;
  };

  const S = emptyStats();
  const days: Record<ISODate, DayEval> = {};
  const weeks: Record<ISODate, WeekInfo> = {};
  const months: Record<string, MonthInfo> = {};
  const unlocked: Record<string, ISODate> = {};
  const cleared: Record<string, ISODate> = {};
  const ctx = freshCtx();

  let streak = 0, longest = 0, lastShield: ISODate | null = null;
  const shielded: ISODate[] = [];
  let sleepRun = 0, screenRun = 0;

  const getWeek = (ws: ISODate): WeekInfo =>
    (weeks[ws] ||= { weekStart: ws, active: isActiveWeek(ws, start), stats: emptyPeriod(), boss: bossForWeek(ws, start), weekly: {} });
  const getMonth = (ym: string): MonthInfo => {
    if (!months[ym]) {
      const active = activeMonthDays(ym, start);
      months[ym] = { ym, active: active >= 7, activeDays: active, totalDays: monthDates(ym).length, stats: emptyPeriod(), done: {} };
    }
    return months[ym];
  };
  const refreshLevels = () => {
    S.xp = xp;
    S.level = levelInfo(xp).level;
    for (const k of SKILL_IDS) S.skillLevel[k] = skillLevelInfo(skillXp[k]).level;
  };

  if (first <= last) {
    for (const date of eachDay(first, last)) {
      const log = state.days[date] ?? emptyDay();
      const cfg = configFor(state.configHistory, date);
      const ev = evalDay(date, log, doneByDate[date] ?? [], cfg, ctx, sideDefs);
      days[date] = ev;
      const m = ev.metrics;

      // Daily awards
      for (const k of SKILL_IDS) {
        const q = ev.quests[k];
        const meta = SKILLS[k];
        if (q.xp > 0) push({ key: `q:${date}:${k}`, date, xp: q.xp, kind: "daily", label: `${meta.quest}${q.state === "partial" ? " (partial)" : ""}`, skill: k, icon: meta.icon });
        for (const b of q.bonuses) push({ key: `b:${date}:${k}:${b.key}`, date, xp: b.xp, kind: "bonus", label: b.label, skill: k, icon: meta.icon });
      }
      if (ev.flawlessXp) push({ key: `flawless:${date}`, date, xp: ev.flawlessXp, kind: "flawless", label: "Flawless Day", icon: "gem" });
      if (ev.comebackXp) { push({ key: `comeback:${date}`, date, xp: ev.comebackXp, kind: "comeback", label: "The Hero Returns", icon: "sunrise" }); S.comebacks++; }
      if (ev.reflectionXp) push({ key: `reflect:${date}`, date, xp: ev.reflectionXp, kind: "reflect", label: "Evening reflection", icon: "feather" });
      for (const id of ev.sideCounted) push({ key: `side:${date}:${id}`, date, xp: sideDefs[id].xp, kind: "side", label: sideDefs[id].title, icon: "compass", refId: id });
      for (const q of lqByDate[date] ?? []) {
        push({ key: `lq:${q.id}`, date, xp: RULES.learnQuestXp, kind: "bonus", label: `Learning quest: ${q.title}`, skill: "learning", icon: "rocket", refId: q.id });
        S.learnQuestsDone++;
      }
      S.sideQuests += ev.sideCounted.length;
      S.rewardsClaimed += claimedByDate[date] ?? 0;
      S.books += finishedByDate[date] ?? 0;

      // Cumulative stats
      S.day = journeyDay(start, date);
      S.questsDone += ev.questsDone;
      S.keptDays += ev.kept ? 1 : 0;
      S.minimumDays += ev.minimumDay ? 1 : 0;
      S.perfectDays += ev.perfect ? 1 : 0;
      S.harmonyDays += ev.perfect && m.reflection ? 1 : 0;
      S.pages += m.pages;
      S.readDays += m.readDay ? 1 : 0;
      S.sessions += m.learnSessions;
      S.codingSessions += m.codingSessions;
      S.learnEff += m.learnEff;
      for (const t of TOPICS) S.topicEff[t.id] += m.topicEff[t.id] ?? 0;
      S.topicsTouched = TOPICS.filter((t) => S.topicEff[t.id] >= 60).length;
      S.topicsAdept = TOPICS.filter((t) => S.topicEff[t.id] >= 420).length;
      S.topicsMaster = TOPICS.filter((t) => S.topicEff[t.id] >= 1800).length;
      S.workoutDays += m.workoutDay ? 1 : 0;
      S.activeMin += m.activeMin;
      S.meditateDays += m.meditateDay ? 1 : 0;
      S.healthyDays += m.healthyDay ? 1 : 0;
      S.sleepGoodDays += m.sleepGood ? 1 : 0;
      sleepRun = m.sleepGood ? sleepRun + 1 : 0;
      S.bestSleepStreak = Math.max(S.bestSleepStreak, sleepRun);
      S.recoveries += m.recovery ? 1 : 0;
      S.earlyWakeDays += m.earlyWake ? 1 : 0;
      S.screenOkDays += m.screenOk ? 1 : 0;
      screenRun = m.screenOk ? screenRun + 1 : 0;
      S.bestScreenStreak = Math.max(S.bestScreenStreak, screenRun);
      S.screenGoalDays += m.screenGoalOk ? 1 : 0;
      S.lowScreenDays += m.lowScreen ? 1 : 0;
      S.tasksDone += m.tasksDone;
      S.highTasksDone += m.highTasks;
      S.fiveTaskDays += m.fiveTaskDay ? 1 : 0;
      S.reflections += m.reflection ? 1 : 0;
      S.finalDayKept = S.day >= 365 && ev.kept ? 1 : S.finalDayKept;

      // Streak with a weekly rest shield
      if (ev.kept) {
        streak++;
        longest = Math.max(longest, streak);
        ctx.lastKept = date;
      } else if (date === today) {
        // today isn't over — pending, neither kept nor missed
      } else if (streak > 0 && (lastShield == null || diffDays(lastShield, date) >= RULES.shieldGapDays)) {
        lastShield = date;
        shielded.push(date);
      } else {
        streak = 0;
      }
      S.streak = streak;
      S.longest = longest;

      // Weekly reflections saved today
      for (const ws of wrByDate[date] ?? []) {
        push({ key: `wr:${ws}`, date, xp: 25, kind: "wreflect", label: "Weekly reflection", icon: "scroll" });
        S.weeklyReflections++;
      }

      // Week / boss
      const ws = weekStart(date);
      const W = getWeek(ws);
      accumulate(W.stats, ev);
      if (W.active) {
        for (const q of WEEKLY_QUESTS) {
          if (!W.weekly[q.id] && q.value(W.stats) >= q.target) {
            W.weekly[q.id] = date;
            S.weeklyQuests++;
            push({ key: `w:${ws}:${q.id}`, date, xp: q.xp, kind: "weekly", label: q.name, skill: q.skill, icon: q.icon, refId: q.id });
          }
        }
        if (W.boss && !W.bossWon && W.boss.objectives.every((o) => o.value(W.stats) >= o.target)) {
          W.bossWon = date;
          S.bossWins++;
          push({ key: `boss:${ws}`, date, xp: W.boss.xp, kind: "boss", label: `Defeated ${W.boss.name}`, icon: W.boss.icon, refId: W.boss.id });
        }
        if (W.boss && !W.bossWon && !W.valiant && date === weekEnd(ws) && date < today) {
          const hit = W.boss.objectives.filter((o) => o.value(W.stats) >= o.target).length;
          if (hit >= W.boss.objectives.length - 1 && hit > 0) {
            W.valiant = date;
            S.valiants++;
            push({ key: `valiant:${ws}`, date, xp: VALIANT_XP, kind: "valiant", label: `Valiant stand vs ${W.boss.name}`, icon: "heart", refId: W.boss.id });
          }
        }
      }

      // Month
      const M = getMonth(monthKey(date));
      accumulate(M.stats, ev);
      if (M.active) {
        for (const q of MONTHLY_QUESTS) {
          if (!M.done[q.id] && q.value(M.stats) >= scaledTarget(q.target, M.activeDays, M.totalDays)) {
            M.done[q.id] = date;
            S.monthlyChallenges++;
            push({ key: `m:${M.ym}:${q.id}`, date, xp: q.xp, kind: "monthly", label: q.name, skill: q.skill, icon: q.icon, refId: q.id });
          }
        }
      }

      // Achievements & regions (their XP can cascade into more unlocks the same day)
      let changed: boolean;
      do {
        changed = false;
        refreshLevels();
        for (const ach of ACHIEVEMENTS) {
          if (!unlocked[ach.id] && ach.metric(S) >= ach.target) {
            unlocked[ach.id] = date;
            push({ key: `a:${ach.id}`, date, xp: RARITY_XP[ach.rarity], kind: "achievement", label: ach.title, icon: ach.icon, refId: ach.id });
            changed = true;
          }
        }
        for (const r of REGIONS) {
          if (!cleared[r.id] && S.level >= r.unlockLevel && r.milestones.every((ms) => ms.metric(S) >= ms.target)) {
            cleared[r.id] = date;
            S.regionsCleared++;
            push({ key: `r:${r.id}`, date, xp: r.xp, kind: "region", label: `Cleared ${r.name}`, icon: r.icon, refId: r.id });
            changed = true;
          }
        }
      } while (changed);

      // carry context to the next day
      ctx.prevSleep = log.sleep ? log.sleep.hours : null;
      const bed = toMin(log.sleep?.bedtime);
      if (bed != null) ctx.bedtimes = [...ctx.bedtimes, shiftBed(bed)].slice(-6);
    }
  }
  refreshLevels();

  const spent = state.redemptions.reduce((s, r) => s + r.cost, 0);
  const shieldReady = lastShield == null || diffDays(lastShield, today) >= RULES.shieldGapDays;
  return {
    today, first, last, awards, totalXp: xp, skillXp, level: levelInfo(xp),
    skills: Object.fromEntries(SKILL_IDS.map((k) => [k, skillLevelInfo(skillXp[k])])) as Record<SkillId, LevelInfo>,
    days,
    streak: {
      current: streak, longest, shielded, shieldReady,
      shieldReadyOn: lastShield && !shieldReady ? addDays(lastShield, RULES.shieldGapDays) : undefined,
      lastKept: ctx.lastKept ?? undefined,
    },
    unlocked, cleared, stats: S, weeks, months, xpByDate, spent, gold: Math.max(0, xp - spent),
  };
}

// ───────────────────────── Lookups used by the UI ─────────────────────────
export function dayEvalFor(state: GameState, d: Derived, date: ISODate): DayEval {
  return d.days[date] ?? evalDay(
    date, state.days[date] ?? emptyDay(), state.tasks.filter((t) => t.doneOn === date),
    configFor(state.configHistory, date), freshCtx(), Object.fromEntries(state.sideQuests.map((s) => [s.id, s])),
  );
}
export function weekInfoFor(state: GameState, d: Derived, ws: ISODate): WeekInfo {
  return d.weeks[ws] ?? {
    weekStart: ws, active: isActiveWeek(ws, state.settings.startDate), stats: emptyPeriod(),
    boss: bossForWeek(ws, state.settings.startDate), weekly: {},
  };
}
export function monthInfoFor(state: GameState, d: Derived, ym: string): MonthInfo {
  if (d.months[ym]) return d.months[ym];
  const active = activeMonthDays(ym, state.settings.startDate);
  return { ym, active: active >= 7, activeDays: active, totalDays: monthDates(ym).length, stats: emptyPeriod(), done: {} };
}
export const xpInRange = (d: Derived, from: ISODate, to: ISODate) =>
  d.awards.reduce((s, a) => (a.date >= from && a.date <= to ? s + a.xp : s), 0);
