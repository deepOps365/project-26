import { type ISODate } from "./dates";
import type { ConfigEntry, GameState, Reward, SideQuestDef, Targets, XpTable } from "./types";

export const PROJECT_START: ISODate = "2026-11-14";
export const STORAGE_KEY = "project26:v1";
export const BACKUP_KEY = "project26:backup";

export const DEFAULT_TARGETS: Targets = {
  sleepMin: 7,
  sleepMax: 9,
  readMin: 2,
  readGoal: 10,
  learnMin: 20,
  learnGoal: 45,
  moveMin: 15,
  meditateMin: 5,
  screenLimit: 240,
  screenGoal: 180,
  workTasks: 5,
  streakQuests: 3,
};

export const DEFAULT_XP: XpTable = {
  sleep: 20, reading: 15, learning: 25, health: 20, screen: 20, work: 25,
  reflection: 10, flawless: 20, comeback: 15,
};

/** Fixed rules (not user-editable on purpose — they protect the spirit of the game). */
export const RULES = {
  partialPct: 0.4, // partial credit for ≥ half a minimum
  learnCapMin: 180, // effective learning minutes counted per day
  activeCapMin: 90, // exercise minutes counted per day — more is not better
  taskCap: 8, // work tasks counted per day
  sideQuestDailyCap: 3,
  sleepFloor: 6, // below this = recovery night (partial credit starts here)
  bedtimeWindow: 45, // ± minutes around your recent median bedtime for the rhythm bonus
  shieldGapDays: 7, // one missed day per rolling week never breaks a streak
  maxEntryPages: 400,
  maxEntryMinutes: 600,
  learnQuestXp: 40,
};

/** Hard bounds for the editable targets. The screen limit can be tightened but never loosened past 4h. */
export const TARGET_LIMITS: Record<keyof Targets, [number, number]> = {
  sleepMin: [6, 8],
  sleepMax: [8, 10],
  readMin: [1, 20],
  readGoal: [2, 100],
  learnMin: [10, 120],
  learnGoal: [15, 180],
  moveMin: [10, 90],
  meditateMin: [2, 60],
  screenLimit: [30, 240],
  screenGoal: [30, 240],
  workTasks: [1, 8],
  streakQuests: [1, 6],
};

export function sanitizeTargets(t: Targets): Targets {
  const out = { ...t };
  (Object.keys(TARGET_LIMITS) as (keyof Targets)[]).forEach((k) => {
    const [lo, hi] = TARGET_LIMITS[k];
    const v = Number(out[k]);
    out[k] = Math.round(Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : DEFAULT_TARGETS[k])) * 10) / 10;
  });
  out.sleepMax = Math.max(out.sleepMax, out.sleepMin + 0.5);
  out.readGoal = Math.max(out.readGoal, out.readMin);
  out.learnGoal = Math.max(out.learnGoal, out.learnMin);
  out.screenGoal = Math.min(out.screenGoal, out.screenLimit);
  return out;
}

export function sanitizeXp(x: XpTable): XpTable {
  const out = { ...x };
  (Object.keys(DEFAULT_XP) as (keyof XpTable)[]).forEach((k) => {
    const v = Number(out[k]);
    out[k] = Math.round(Math.min(100, Math.max(0, Number.isFinite(v) ? v : DEFAULT_XP[k])));
  });
  return out;
}

export const DEFAULT_SIDE_QUESTS: SideQuestDef[] = [
  { id: "sq-walk-nophone", title: "Take a walk without your phone", xp: 8 },
  { id: "sq-call", title: "Reach out to someone you care about", xp: 8 },
  { id: "sq-tidy", title: "Tidy your space for 10 minutes", xp: 8 },
  { id: "sq-word", title: "Learn a new word and use it today", xp: 8 },
  { id: "sq-gratitude", title: "Write three lines of gratitude", xp: 8 },
  { id: "sq-cook", title: "Cook or prep a healthy meal", xp: 8 },
  { id: "sq-sun", title: "Get 10 minutes of daylight outside", xp: 8 },
  { id: "sq-teach", title: "Explain something you learned to someone", xp: 8 },
  { id: "sq-plan", title: "Plan tomorrow's top three", xp: 8 },
  { id: "sq-phonefree-meal", title: "Eat one meal phone-free", xp: 8 },
  { id: "sq-stretch-bed", title: "Stretch for 5 minutes before bed", xp: 8 },
  { id: "sq-water", title: "Drink water through the day (6+ glasses)", xp: 8 },
];

export const DEFAULT_REWARDS: Reward[] = [
  { id: "rw-anime", title: "Watch an anime episode", cost: 60, icon: "tv" },
  { id: "rw-snack", title: "A favourite treat", cost: 80, icon: "cookie" },
  { id: "rw-game", title: "Play a game for an hour", cost: 120, icon: "gamepad" },
  { id: "rw-evening", title: "A guilt-free leisure evening", cost: 250, icon: "sofa" },
  { id: "rw-book", title: "Buy a book", cost: 400, icon: "book" },
  { id: "rw-place", title: "Explore a new place", cost: 500, icon: "compass" },
  { id: "rw-dinner", title: "A proper dinner out", cost: 700, icon: "utensils", minLevel: 10 },
];

export function makeInitialState(startDate: ISODate = PROJECT_START): GameState {
  return {
    version: 1,
    createdAt: Date.now(),
    onboarded: false,
    settings: { heroName: "", startDate, sound: true },
    configHistory: [{ from: "0000-01-01", targets: { ...DEFAULT_TARGETS }, xp: { ...DEFAULT_XP } }],
    days: {},
    books: [],
    tasks: [],
    learnQuests: [],
    weeklyReflections: {},
    rewards: DEFAULT_REWARDS.map((r) => ({ ...r })),
    redemptions: [],
    sideQuests: DEFAULT_SIDE_QUESTS.map((s) => ({ ...s })),
    lastUsed: { topic: "python", kind: "practice", activity: "walk" },
  };
}

/** Config in force on a given date (latest entry whose `from` ≤ date). */
export function configFor(history: ConfigEntry[], date: ISODate): ConfigEntry {
  let cur = history[0];
  for (const h of history) if (h.from <= date) cur = h;
  return cur;
}
