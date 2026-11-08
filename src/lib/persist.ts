import { BACKUP_KEY, DEFAULT_REWARDS, DEFAULT_SIDE_QUESTS, STORAGE_KEY, makeInitialState, sanitizeTargets, sanitizeXp } from "./config";
import { isISO, todayISO } from "./dates";
import { emptyDay, type ConfigEntry, type DayLog, type GameState } from "./types";

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const arr = <T>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);
const num = (x: unknown, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : d);
const str = (x: unknown, d = "") => (typeof x === "string" ? x : d);

function normalizeDay(x: unknown): DayLog {
  const d = emptyDay();
  if (!isObj(x)) return d;
  if (isObj(x.sleep) && Number.isFinite(Number(x.sleep.hours))) {
    d.sleep = { hours: Number(x.sleep.hours), bedtime: str(x.sleep.bedtime) || undefined, wake: str(x.sleep.wake) || undefined };
  }
  d.reading = arr<DayLog["reading"][number]>(x.reading).filter((r) => isObj(r) && num(r.pages) > 0).map((r) => ({ id: str(r.id, Math.random().toString(36).slice(2, 10)), pages: num(r.pages), bookId: str(r.bookId) || undefined, ts: num(r.ts) }));
  d.learning = arr<DayLog["learning"][number]>(x.learning).filter((r) => isObj(r) && num(r.minutes) > 0).map((r) => ({ id: str(r.id, Math.random().toString(36).slice(2, 10)), topic: (str(r.topic, "python") as DayLog["learning"][number]["topic"]), kind: (str(r.kind, "practice") as DayLog["learning"][number]["kind"]), minutes: num(r.minutes), note: str(r.note), ts: num(r.ts) }));
  d.activity = arr<DayLog["activity"][number]>(x.activity).filter((r) => isObj(r) && num(r.minutes) > 0).map((r) => ({ id: str(r.id, Math.random().toString(36).slice(2, 10)), type: (str(r.type, "walk") as DayLog["activity"][number]["type"]), minutes: num(r.minutes), ts: num(r.ts) }));
  if (typeof x.healthyEating === "boolean") d.healthyEating = x.healthyEating;
  if (x.screen != null && Number.isFinite(Number(x.screen))) d.screen = Number(x.screen);
  d.sideDone = arr<string>(x.sideDone).filter((s) => typeof s === "string");
  if (isObj(x.reflection)) {
    const r = x.reflection;
    d.reflection = {
      accomplished: str(r.accomplished), distraction: str(r.distraction), learned: str(r.learned), improve: str(r.improve),
      journal: str(r.journal), mood: ([1, 2, 3, 4, 5].includes(Number(r.mood)) ? Number(r.mood) : 3) as 1 | 2 | 3 | 4 | 5, updatedAt: num(r.updatedAt),
    };
  }
  return d;
}

/** Turn anything that looks like a saved game into a valid GameState (or null if it clearly isn't one). */
export function normalizeState(raw: unknown): GameState | null {
  if (!isObj(raw)) return null;
  const src = isObj(raw.state) && raw.app === "project26" ? raw.state : raw;
  if (!isObj(src) || !isObj(src.days) || !isObj(src.settings)) return null;
  const base = makeInitialState();
  const s = src.settings;
  const out: GameState = {
    ...base,
    createdAt: num(src.createdAt, Date.now()),
    onboarded: src.onboarded !== false,
    settings: {
      heroName: str(s.heroName),
      startDate: isISO(s.startDate) ? (s.startDate as string) : base.settings.startDate,
      sound: s.sound !== false,
    },
    days: {},
    books: arr<GameState["books"][number]>(src.books).filter((b) => isObj(b) && str(b.title)).map((b) => ({ id: str(b.id), title: str(b.title), author: str(b.author) || undefined, totalPages: num(b.totalPages) || undefined, startedOn: isISO(b.startedOn) ? b.startedOn : todayISO(), finishedOn: isISO(b.finishedOn) ? b.finishedOn : undefined })),
    tasks: arr<GameState["tasks"][number]>(src.tasks).filter((t) => isObj(t) && str(t.title)).map((t) => ({ id: str(t.id), title: str(t.title), priority: (["high", "medium", "low"].includes(str(t.priority)) ? t.priority : "medium") as GameState["tasks"][number]["priority"], createdOn: isISO(t.createdOn) ? t.createdOn : todayISO(), doneOn: isISO(t.doneOn) ? t.doneOn : undefined, win: str(t.win) || undefined })),
    learnQuests: arr<GameState["learnQuests"][number]>(src.learnQuests).filter((q) => isObj(q) && str(q.title)).map((q) => ({ id: str(q.id), title: str(q.title), topic: (str(q.topic, "python") as GameState["learnQuests"][number]["topic"]), createdOn: isISO(q.createdOn) ? q.createdOn : todayISO(), doneOn: isISO(q.doneOn) ? q.doneOn : undefined, outcome: str(q.outcome) || undefined })),
    weeklyReflections: {},
    rewards: arr<GameState["rewards"][number]>(src.rewards).filter((r) => isObj(r) && str(r.title)).map((r) => ({ id: str(r.id), title: str(r.title), cost: Math.max(0, num(r.cost)), icon: str(r.icon, "gift"), minLevel: num(r.minLevel) || undefined, note: str(r.note) || undefined })),
    redemptions: arr<GameState["redemptions"][number]>(src.redemptions).filter((r) => isObj(r) && isISO(r.date)).map((r) => ({ id: str(r.id), rewardId: str(r.rewardId), title: str(r.title), cost: Math.max(0, num(r.cost)), date: r.date as string, ts: num(r.ts) })),
    sideQuests: arr<GameState["sideQuests"][number]>(src.sideQuests).filter((q) => isObj(q) && str(q.title)).map((q) => ({ id: str(q.id), title: str(q.title), xp: Math.min(30, Math.max(1, num(q.xp, 8))), custom: q.custom === true || undefined })),
    lastUsed: isObj(src.lastUsed) ? { ...base.lastUsed, ...(src.lastUsed as object) } : base.lastUsed,
    lastExportAt: num(src.lastExportAt) || undefined,
  };
  for (const [k, v] of Object.entries(src.days)) if (isISO(k)) out.days[k] = normalizeDay(v);
  if (isObj(src.weeklyReflections)) {
    for (const [k, v] of Object.entries(src.weeklyReflections)) {
      if (isISO(k) && isObj(v)) out.weeklyReflections[k] = { improvement: str(v.improvement), note: str(v.note), savedOn: isISO(v.savedOn) ? v.savedOn : k, updatedAt: num(v.updatedAt) };
    }
  }
  const hist = arr<ConfigEntry>(src.configHistory).filter((h) => isObj(h) && isObj(h.targets) && isObj(h.xp));
  out.configHistory = hist.length
    ? hist.map((h) => ({ from: isISO(h.from) ? h.from : "0000-01-01", targets: sanitizeTargets({ ...base.configHistory[0].targets, ...h.targets }), xp: sanitizeXp({ ...base.configHistory[0].xp, ...h.xp }) })).sort((a, b) => a.from.localeCompare(b.from))
    : base.configHistory;
  if (!out.rewards.length && !Array.isArray(src.rewards)) out.rewards = DEFAULT_REWARDS.map((r) => ({ ...r }));
  if (!out.sideQuests.length && !Array.isArray(src.sideQuests)) out.sideQuests = DEFAULT_SIDE_QUESTS.map((r) => ({ ...r }));
  return out;
}

// ───────────────────────── Storage ─────────────────────────
export type LoadResult = { state: GameState | null; corruptRaw?: string };

export function loadState(): LoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: null };
    const parsed = normalizeState(JSON.parse(raw));
    if (!parsed) return { state: null, corruptRaw: raw };
    return { state: parsed };
  } catch {
    let raw: string | undefined;
    try { raw = localStorage.getItem(STORAGE_KEY) ?? undefined; } catch { /* ignore */ }
    return { state: null, corruptRaw: raw };
  }
}

/** Returns an error message on failure (e.g. storage full / blocked). */
export function saveState(state: GameState): string | null {
  try {
    const next = JSON.stringify(state);
    const prev = localStorage.getItem(STORAGE_KEY);
    // Rolling daily safety net: keep yesterday's snapshot before the first write of a new day.
    if (prev && prev !== next) {
      const t = todayISO();
      let meta: { date?: string } | null = null;
      try { meta = JSON.parse(localStorage.getItem(BACKUP_KEY) ?? "null"); } catch { /* ignore */ }
      if (!meta || meta.date !== t) localStorage.setItem(BACKUP_KEY, JSON.stringify({ date: t, raw: prev }));
    }
    localStorage.setItem(STORAGE_KEY, next);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Could not save";
  }
}

export function loadBackup(): { date: string; state: GameState } | null {
  try {
    const b = JSON.parse(localStorage.getItem(BACKUP_KEY) ?? "null");
    const st = b && typeof b.raw === "string" ? normalizeState(JSON.parse(b.raw)) : null;
    return st ? { date: b.date, state: st } : null;
  } catch {
    return null;
  }
}

export function exportPayload(state: GameState): string {
  return JSON.stringify({ app: "project26", version: 1, exportedAt: new Date().toISOString(), state }, null, 2);
}

// ───────────────────────── Merge (phone ⇄ laptop) ─────────────────────────
const byId = <T extends { id: string }>(a: T[], b: T[]) => {
  const seen = new Set(a.map((x) => x.id));
  return [...a, ...b.filter((x) => !seen.has(x.id))];
};

/**
 * Union two saves: every logged entry from both is kept (entries have unique ids, so nothing is
 * counted twice). For single-value fields (sleep, screen, reflection) this device's value wins,
 * except reflections where the most recently edited one wins.
 */
export function mergeStates(local: GameState, incoming: GameState): GameState {
  const out: GameState = JSON.parse(JSON.stringify(local));
  for (const [date, inc] of Object.entries(incoming.days)) {
    const cur = (out.days[date] ||= emptyDay());
    cur.reading = byId(cur.reading, inc.reading);
    cur.learning = byId(cur.learning, inc.learning);
    cur.activity = byId(cur.activity, inc.activity);
    cur.sideDone = Array.from(new Set([...cur.sideDone, ...inc.sideDone]));
    cur.sleep ??= inc.sleep;
    cur.screen ??= inc.screen;
    cur.healthyEating ??= inc.healthyEating;
    if (inc.reflection && (!cur.reflection || inc.reflection.updatedAt > cur.reflection.updatedAt)) cur.reflection = inc.reflection;
  }
  const taskMap = new Map(out.tasks.map((t) => [t.id, t]));
  for (const t of incoming.tasks) {
    const cur = taskMap.get(t.id);
    if (!cur) out.tasks.push(t);
    else if (!cur.doneOn && t.doneOn) { cur.doneOn = t.doneOn; cur.win = t.win ?? cur.win; }
  }
  const lqMap = new Map(out.learnQuests.map((q) => [q.id, q]));
  for (const q of incoming.learnQuests) {
    const cur = lqMap.get(q.id);
    if (!cur) out.learnQuests.push(q);
    else if (!cur.doneOn && q.doneOn) { cur.doneOn = q.doneOn; cur.outcome = q.outcome ?? cur.outcome; }
  }
  const bookMap = new Map(out.books.map((b) => [b.id, b]));
  for (const b of incoming.books) {
    const cur = bookMap.get(b.id);
    if (!cur) out.books.push(b);
    else if (!cur.finishedOn && b.finishedOn) cur.finishedOn = b.finishedOn;
  }
  out.redemptions = byId(out.redemptions, incoming.redemptions);
  out.rewards = byId(out.rewards, incoming.rewards);
  out.sideQuests = byId(out.sideQuests, incoming.sideQuests);
  for (const [ws, w] of Object.entries(incoming.weeklyReflections)) {
    const cur = out.weeklyReflections[ws];
    if (!cur || w.updatedAt > cur.updatedAt) out.weeklyReflections[ws] = cur ? { ...w, savedOn: cur.savedOn } : w;
  }
  const hist = [...out.configHistory];
  for (const h of incoming.configHistory) if (!hist.some((x) => x.from === h.from)) hist.push(h);
  out.configHistory = hist.sort((a, b) => a.from.localeCompare(b.from));
  out.createdAt = Math.min(out.createdAt, incoming.createdAt);
  return out;
}
