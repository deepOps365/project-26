"use client";

import { create } from "zustand";
import { DEFAULT_REMINDERS, RULES, STORAGE_KEY, configFor, makeInitialState, sanitizeTargets, sanitizeXp } from "./config";
import { ACH_BY_ID, REGION_BY_ID, RARITY_COLOR, type Rarity } from "./content/defs";
import { SKILLS } from "./content/skills";
import { isISO, todayISO, uid, weekStart, type ISODate } from "./dates";
import { simulate, type Derived } from "./engine";
import { exportPayload, loadBackup, loadState, mergeStates, normalizeState, saveState } from "./persist";
import { rankForLevel } from "./progression";
import { setSoundEnabled, sfx } from "./sound";
import {
  SKILL_IDS, emptyDay, type ActivityType, type Book, type DayLog, type FontId, type GameState, type LearnKind, type Priority, type Reflection,
  type Reminder, type Reward, type TextScale, type Targets, type ThemeId, type TopicId, type XpTable,
} from "./types";

export interface GameEvent {
  id: number;
  type: "xp" | "achievement" | "level" | "rank" | "boss" | "region" | "skill" | "valiant" | "weekly" | "monthly" | "correction" | "info";
  title: string;
  subtitle?: string;
  lines?: { label: string; xp: number }[];
  xp?: number;
  icon?: string;
  color?: string;
  rarity?: Rarity;
  level?: number;
}

let eventId = 1;

function diffEvents(prev: Derived, next: Derived): GameEvent[] {
  const ev: GameEvent[] = [];
  const prevXp = new Map(prev.awards.map((a) => [a.key, a.xp]));
  const nextKeys = new Set(next.awards.map((a) => a.key));
  const plain: { label: string; xp: number }[] = [];
  let plainTotal = 0;

  for (const a of next.awards) {
    const before = prevXp.get(a.key) ?? 0;
    if (a.xp <= before) continue;
    const gain = a.xp - before;
    const isNew = before === 0;
    if (a.kind === "achievement" && isNew) {
      const ach = ACH_BY_ID[a.refId ?? ""];
      ev.push({ id: eventId++, type: "achievement", title: ach?.title ?? a.label, subtitle: `Achievement unlocked · +${gain} XP`, icon: ach?.icon ?? "trophy", rarity: ach?.rarity, color: ach ? RARITY_COLOR[ach.rarity] : undefined, xp: gain });
    } else if (a.kind === "boss" && isNew) {
      ev.push({ id: eventId++, type: "boss", title: a.label, subtitle: `+${gain} XP`, icon: a.icon, xp: gain });
    } else if (a.kind === "region" && isNew) {
      const r = REGION_BY_ID[a.refId ?? ""];
      ev.push({ id: eventId++, type: "region", title: a.label, subtitle: `Region cleared · +${gain} XP`, icon: a.icon, color: r?.color, xp: gain });
    } else if ((a.kind === "weekly" || a.kind === "monthly" || a.kind === "valiant") && isNew) {
      ev.push({ id: eventId++, type: a.kind, title: a.label, subtitle: `${a.kind === "weekly" ? "Weekly quest" : a.kind === "monthly" ? "Monthly challenge" : "Valiant effort"} · +${gain} XP`, icon: a.icon, color: a.skill ? SKILLS[a.skill].color : undefined, xp: gain });
    } else {
      plain.push({ label: a.label, xp: gain });
      plainTotal += gain;
    }
  }
  if (plainTotal > 0) {
    ev.unshift({ id: eventId++, type: "xp", title: `+${plainTotal} XP`, lines: plain.slice(0, 4), xp: plainTotal });
  }

  // Corrections: awards that no longer exist or shrank
  let lost = 0;
  for (const a of prev.awards) {
    const still = next.awards.find((n) => n.key === a.key);
    if (!still) lost += a.xp;
    else if (still.xp < a.xp) lost += a.xp - still.xp;
  }
  void nextKeys;
  if (lost > 0 && ev.length === 0) ev.push({ id: eventId++, type: "correction", title: `Entry corrected`, subtitle: `−${lost} XP recalculated`, xp: -lost });

  // Skill level-ups
  for (const k of SKILL_IDS) {
    if (next.skills[k].level > prev.skills[k].level) {
      const node = SKILLS[k].tree.filter((t) => t.level <= next.skills[k].level).pop();
      ev.push({ id: eventId++, type: "skill", title: `${SKILLS[k].attribute} Lv ${next.skills[k].level}`, subtitle: node ? `New title · ${node.title}` : SKILLS[k].area, icon: SKILLS[k].icon, color: SKILLS[k].color });
    }
  }

  // Hero level / rank
  if (next.level.level > prev.level.level) {
    const r0 = rankForLevel(prev.level.level), r1 = rankForLevel(next.level.level);
    ev.push({ id: eventId++, type: r1.id !== r0.id ? "rank" : "level", title: r1.id !== r0.id ? `Rank up: ${r1.name}` : `Level ${next.level.level}`, subtitle: r1.id !== r0.id ? `You reached level ${next.level.level} — ${r1.blurb}` : "Your legend grows.", level: next.level.level, color: r1.color, icon: "crown" });
  }
  return ev;
}

const chooseSound = (events: GameEvent[]) => {
  if (events.some((e) => e.type === "level" || e.type === "rank")) return "level" as const;
  if (events.some((e) => e.type === "boss" || e.type === "region")) return "boss" as const;
  if (events.some((e) => e.type === "achievement")) return "achievement" as const;
  if (events.some((e) => e.type === "xp" || e.type === "weekly" || e.type === "monthly" || e.type === "valiant")) return "xp" as const;
  if (events.some((e) => e.type === "correction")) return "undo" as const;
  return null;
};

interface Store {
  hydrated: boolean;
  state: GameState;
  derived: Derived;
  today: ISODate;
  events: GameEvent[];
  notice: string | null;
  corruptRaw: string | null;

  init: () => void;
  tick: () => void;
  dismissEvent: (id: number) => void;
  setNotice: (n: string | null) => void;
  commit: (mut: (s: GameState) => void, opts?: { silent?: boolean }) => void;

  completeOnboarding: (name: string) => void;
  setHeroName: (name: string) => void;
  setSound: (on: boolean) => void;
  setStartDate: (d: ISODate) => void;
  setLook: (look: { theme?: ThemeId; font?: FontId; textScale?: TextScale }) => void;
  addReminder: () => void;
  updateReminder: (id: string, patch: Partial<Omit<Reminder, "id">>) => void;
  removeReminder: (id: string) => void;
  resetReminders: () => void;
  updateConfig: (patch: { targets?: Partial<Targets>; xp?: Partial<XpTable> }) => void;
  resetConfig: () => void;

  addReading: (date: ISODate, pages: number, bookId?: string) => void;
  removeReading: (date: ISODate, id: string) => void;
  addLearning: (date: ISODate, v: { topic: TopicId; kind: LearnKind; minutes: number; note: string }) => void;
  removeLearning: (date: ISODate, id: string) => void;
  addActivity: (date: ISODate, type: ActivityType, minutes: number) => void;
  removeActivity: (date: ISODate, id: string) => void;
  setSleep: (date: ISODate, v: { hours: number; bedtime?: string; wake?: string } | null) => void;
  setScreen: (date: ISODate, minutes: number | null) => void;
  setEating: (date: ISODate, on: boolean) => void;

  addTask: (title: string, priority: Priority) => void;
  updateTask: (id: string, patch: { title?: string; priority?: Priority; win?: string }) => void;
  completeTask: (id: string, date: ISODate, win?: string) => void;
  uncompleteTask: (id: string) => void;
  deleteTask: (id: string) => void;

  addLearnQuest: (title: string, topic: TopicId) => void;
  completeLearnQuest: (id: string, date: ISODate, outcome: string) => string | null;
  reopenLearnQuest: (id: string) => void;
  deleteLearnQuest: (id: string) => void;

  addBook: (b: { title: string; author?: string; totalPages?: number }) => void;
  updateBook: (id: string, patch: Partial<Pick<Book, "title" | "author" | "totalPages">>) => void;
  deleteBook: (id: string) => void;
  finishBook: (id: string, date: ISODate) => string | null;
  reopenBook: (id: string) => void;

  saveReflection: (date: ISODate, r: Omit<Reflection, "updatedAt">) => void;
  deleteReflection: (date: ISODate) => void;
  saveWeeklyReflection: (ws: ISODate, v: { improvement: string; note: string }) => void;

  toggleSide: (date: ISODate, id: string) => void;
  addSideQuest: (title: string) => void;
  removeSideQuest: (id: string) => void;

  addReward: (r: Omit<Reward, "id">) => void;
  updateReward: (id: string, patch: Partial<Reward>) => void;
  removeReward: (id: string) => void;
  redeem: (id: string) => string | null;
  refund: (redemptionId: string) => void;

  exportJSON: () => string;
  importJSON: (text: string, mode: "replace" | "merge") => { ok: boolean; message: string };
  restoreBackup: () => boolean;
  resetProgress: () => void;
  eraseEverything: () => void;
}

const initial = makeInitialState();

export const useGame = create<Store>()((set, get) => {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleSave = () => {
    if (typeof window === "undefined") return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 120);
  };
  const flush = () => {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    const err = saveState(get().state);
    if (err) set({ notice: `Couldn't save to this browser (${err}). Export a backup from Settings.` });
  };

  const day = (s: GameState, date: ISODate): DayLog => (s.days[date] ||= emptyDay());
  const okDate = (d: ISODate) => isISO(d) && d <= todayISO();

  return {
    hydrated: false,
    state: initial,
    derived: simulate(initial, todayISO()),
    today: todayISO(),
    events: [],
    notice: null,
    corruptRaw: null,

    init: () => {
      if (get().hydrated) return;
      const { state: loaded, corruptRaw } = loadState();
      const state = loaded ?? makeInitialState();
      const today = todayISO();
      setSoundEnabled(state.settings.sound);
      set({ state, derived: simulate(state, today), today, hydrated: true, corruptRaw: corruptRaw ?? null });
      try { void navigator.storage?.persist?.(); } catch { /* best effort: ask browser not to evict our data */ }
      if (typeof window !== "undefined") {
        window.addEventListener("pagehide", flush);
        document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); else get().tick(); });
        // another tab of the same browser changed the data → follow it
        window.addEventListener("storage", (e) => {
          if (e.key !== STORAGE_KEY || !e.newValue) return;
          try {
            const st = normalizeState(JSON.parse(e.newValue));
            if (st) set({ state: st, derived: simulate(st, todayISO()), today: todayISO() });
          } catch { /* ignore */ }
        });
      }
    },

    tick: () => {
      const t = todayISO();
      if (t !== get().today) set({ today: t, derived: simulate(get().state, t) });
    },

    dismissEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
    setNotice: (notice) => set({ notice }),

    commit: (mut, opts) => {
      const cur = get();
      const next: GameState = structuredClone(cur.state);
      mut(next);
      const today = todayISO();
      const derived = simulate(next, today);
      const events = opts?.silent ? [] : diffEvents(cur.derived, derived);
      setSoundEnabled(next.settings.sound);
      set({ state: next, derived, today, events: [...cur.events, ...events].slice(-12) });
      if (!opts?.silent) { const s = chooseSound(events); if (s) sfx(s); }
      scheduleSave();
    },

    completeOnboarding: (name) => get().commit((s) => { s.onboarded = true; s.settings.heroName = name.trim().slice(0, 24) || "Hero"; }, { silent: true }),
    setHeroName: (name) => get().commit((s) => { s.settings.heroName = name.trim().slice(0, 24); }, { silent: true }),
    setSound: (on) => { get().commit((s) => { s.settings.sound = on; }, { silent: true }); if (on) sfx("open"); },
    setStartDate: (d) => { if (isISO(d)) get().commit((s) => { s.settings.startDate = d; }, { silent: true }); },
    setLook: (look) => get().commit((s) => { Object.assign(s.settings, look); }, { silent: true }),
    addReminder: () => get().commit((s) => { s.reminders.push({ id: uid(), label: "New reminder", time: "12:00", enabled: true, target: "checkin" }); }, { silent: true }),
    updateReminder: (id, patch) => get().commit((s) => {
      const r = s.reminders.find((x) => x.id === id);
      if (!r) return;
      if (patch.label !== undefined) r.label = patch.label.slice(0, 140);
      if (patch.time && /^\d{2}:\d{2}$/.test(patch.time)) r.time = patch.time;
      if (patch.enabled !== undefined) r.enabled = patch.enabled;
      if (patch.target) r.target = patch.target;
    }, { silent: true }),
    removeReminder: (id) => get().commit((s) => { s.reminders = s.reminders.filter((r) => r.id !== id); }, { silent: true }),
    resetReminders: () => get().commit((s) => { s.reminders = DEFAULT_REMINDERS.map((r) => ({ ...r })); }, { silent: true }),
    updateConfig: ({ targets, xp }) =>
      get().commit((s) => {
        const t = todayISO();
        const cur = configFor(s.configHistory, t);
        const entry = { from: t, targets: sanitizeTargets({ ...cur.targets, ...targets }), xp: sanitizeXp({ ...cur.xp, ...xp }) };
        const i = s.configHistory.findIndex((h) => h.from === t);
        if (i >= 0) s.configHistory[i] = entry; else s.configHistory.push(entry);
        s.configHistory.sort((a, b) => a.from.localeCompare(b.from));
      }, { silent: true }),
    resetConfig: () => get().commit((s) => {
      const t = todayISO();
      const base = makeInitialState().configHistory[0];
      const entry = { from: t, targets: base.targets, xp: base.xp };
      const i = s.configHistory.findIndex((h) => h.from === t);
      if (i >= 0) s.configHistory[i] = entry; else s.configHistory.push(entry);
      s.configHistory.sort((a, b) => a.from.localeCompare(b.from));
    }, { silent: true }),

    addReading: (date, pages, bookId) => {
      const p = Math.round(pages);
      if (!okDate(date) || !(p >= 1 && p <= RULES.maxEntryPages)) return;
      get().commit((s) => { day(s, date).reading.push({ id: uid(), pages: p, bookId, ts: Date.now() }); s.lastUsed.bookId = bookId; });
    },
    removeReading: (date, id) => get().commit((s) => { const d = day(s, date); d.reading = d.reading.filter((r) => r.id !== id); }),
    addLearning: (date, v) => {
      const m = Math.round(v.minutes);
      if (!okDate(date) || !(m >= 1 && m <= RULES.maxEntryMinutes)) return;
      get().commit((s) => { day(s, date).learning.push({ id: uid(), topic: v.topic, kind: v.kind, minutes: m, note: v.note.trim().slice(0, 400), ts: Date.now() }); s.lastUsed.topic = v.topic; s.lastUsed.kind = v.kind; });
    },
    removeLearning: (date, id) => get().commit((s) => { const d = day(s, date); d.learning = d.learning.filter((r) => r.id !== id); }),
    addActivity: (date, type, minutes) => {
      const m = Math.round(minutes);
      if (!okDate(date) || !(m >= 1 && m <= RULES.maxEntryMinutes)) return;
      get().commit((s) => { day(s, date).activity.push({ id: uid(), type, minutes: m, ts: Date.now() }); if (type !== "meditate") s.lastUsed.activity = type; });
    },
    removeActivity: (date, id) => get().commit((s) => { const d = day(s, date); d.activity = d.activity.filter((r) => r.id !== id); }),
    setSleep: (date, v) => {
      if (!okDate(date)) return;
      if (v && !(v.hours >= 0 && v.hours <= 16)) return;
      get().commit((s) => {
        const d = day(s, date);
        if (!v) delete d.sleep; else d.sleep = { hours: Math.round(v.hours * 4) / 4, bedtime: v.bedtime || undefined, wake: v.wake || undefined };
      });
    },
    setScreen: (date, minutes) => {
      if (!okDate(date)) return;
      if (minutes != null && !(minutes >= 0 && minutes <= 1440)) return;
      get().commit((s) => { const d = day(s, date); if (minutes == null) delete d.screen; else d.screen = Math.round(minutes); });
    },
    setEating: (date, on) => { if (okDate(date)) get().commit((s) => { day(s, date).healthyEating = on || undefined; }); },

    addTask: (title, priority) => {
      const t = title.trim().slice(0, 140);
      if (!t) return;
      get().commit((s) => { s.tasks.push({ id: uid(), title: t, priority, createdOn: todayISO() }); }, { silent: true });
    },
    updateTask: (id, patch) => get().commit((s) => {
      const t = s.tasks.find((x) => x.id === id);
      if (!t) return;
      if (patch.title != null && patch.title.trim()) t.title = patch.title.trim().slice(0, 140);
      if (patch.priority) t.priority = patch.priority;
      if (patch.win != null) t.win = patch.win.trim().slice(0, 240) || undefined;
    }),
    completeTask: (id, date, win) => {
      if (!okDate(date)) return;
      get().commit((s) => { const t = s.tasks.find((x) => x.id === id); if (t) { t.doneOn = date; t.win = win?.trim().slice(0, 240) || t.win; } });
    },
    uncompleteTask: (id) => get().commit((s) => { const t = s.tasks.find((x) => x.id === id); if (t) { delete t.doneOn; } }),
    deleteTask: (id) => get().commit((s) => { s.tasks = s.tasks.filter((x) => x.id !== id); }),

    addLearnQuest: (title, topic) => {
      const t = title.trim().slice(0, 120);
      if (t) get().commit((s) => { s.learnQuests.push({ id: uid(), title: t, topic, createdOn: todayISO() }); }, { silent: true });
    },
    completeLearnQuest: (id, date, outcome) => {
      const o = outcome.trim();
      if (o.length < 10) return "Write a sentence about what you built or understood (10+ characters) — practice, not passive watching.";
      if (!okDate(date)) return "Pick a valid date";
      get().commit((s) => { const q = s.learnQuests.find((x) => x.id === id); if (q) { q.doneOn = date; q.outcome = o.slice(0, 400); } });
      return null;
    },
    reopenLearnQuest: (id) => get().commit((s) => { const q = s.learnQuests.find((x) => x.id === id); if (q) delete q.doneOn; }),
    deleteLearnQuest: (id) => get().commit((s) => { s.learnQuests = s.learnQuests.filter((q) => q.id !== id); }),

    addBook: ({ title, author, totalPages }) => {
      const t = title.trim().slice(0, 120);
      if (!t) return;
      const id = uid();
      get().commit((s) => { s.books.push({ id, title: t, author: author?.trim() || undefined, totalPages: totalPages && totalPages > 0 ? Math.round(totalPages) : undefined, startedOn: todayISO() }); s.lastUsed.bookId = id; }, { silent: true });
    },
    updateBook: (id, patch) => get().commit((s) => {
      const b = s.books.find((x) => x.id === id);
      if (!b) return;
      if (patch.title?.trim()) b.title = patch.title.trim().slice(0, 120);
      if (patch.author !== undefined) b.author = patch.author?.trim() || undefined;
      if (patch.totalPages !== undefined) b.totalPages = patch.totalPages && patch.totalPages > 0 ? Math.round(patch.totalPages) : undefined;
    }, { silent: true }),
    deleteBook: (id) => get().commit((s) => {
      s.books = s.books.filter((b) => b.id !== id);
      Object.values(s.days).forEach((d) => d.reading.forEach((r) => { if (r.bookId === id) delete r.bookId; }));
      if (s.lastUsed.bookId === id) delete s.lastUsed.bookId;
    }),
    finishBook: (id, date) => {
      const s = get().state;
      const b = s.books.find((x) => x.id === id);
      if (!b) return "Book not found";
      const read = Object.values(s.days).reduce((n, d) => n + d.reading.filter((r) => r.bookId === id).reduce((m, r) => m + r.pages, 0), 0);
      const need = b.totalPages ? Math.ceil(b.totalPages * 0.9) : 20;
      if (read < need) return b.totalPages ? `Log at least ${need} of ${b.totalPages} pages (90%) to finish this book — you've logged ${read}.` : `Log at least 20 pages to this book before finishing it — you've logged ${read}.`;
      get().commit((st) => { const x = st.books.find((k) => k.id === id); if (x) x.finishedOn = isISO(date) && date <= todayISO() ? date : todayISO(); });
      return null;
    },
    reopenBook: (id) => get().commit((s) => { const b = s.books.find((x) => x.id === id); if (b) delete b.finishedOn; }),

    saveReflection: (date, r) => {
      if (!okDate(date)) return;
      get().commit((s) => { day(s, date).reflection = { ...r, accomplished: r.accomplished.trim(), distraction: r.distraction.trim(), learned: r.learned.trim(), improve: r.improve.trim(), journal: r.journal.trim(), updatedAt: Date.now() }; });
    },
    deleteReflection: (date) => get().commit((s) => { delete day(s, date).reflection; }),
    saveWeeklyReflection: (ws, v) => get().commit((s) => {
      const cur = s.weeklyReflections[ws];
      s.weeklyReflections[ws] = { improvement: v.improvement.trim(), note: v.note.trim(), savedOn: cur?.savedOn ?? todayISO(), updatedAt: Date.now() };
    }),

    toggleSide: (date, id) => {
      if (!okDate(date)) return;
      get().commit((s) => { const d = day(s, date); d.sideDone = d.sideDone.includes(id) ? d.sideDone.filter((x) => x !== id) : [...d.sideDone, id]; });
    },
    addSideQuest: (title) => {
      const t = title.trim().slice(0, 100);
      if (t) get().commit((s) => { s.sideQuests.push({ id: uid(), title: t, xp: 8, custom: true }); }, { silent: true });
    },
    removeSideQuest: (id) => get().commit((s) => { s.sideQuests = s.sideQuests.filter((q) => q.id !== id); }, { silent: true }),

    addReward: (r) => {
      if (!r.title.trim()) return;
      get().commit((s) => { s.rewards.push({ ...r, id: uid(), title: r.title.trim().slice(0, 80), cost: Math.max(0, Math.round(r.cost)) }); }, { silent: true });
    },
    updateReward: (id, patch) => get().commit((s) => { const r = s.rewards.find((x) => x.id === id); if (r) Object.assign(r, patch); }, { silent: true }),
    removeReward: (id) => get().commit((s) => { s.rewards = s.rewards.filter((r) => r.id !== id); }, { silent: true }),
    redeem: (id) => {
      const { state, derived } = get();
      const r = state.rewards.find((x) => x.id === id);
      if (!r) return "Reward not found";
      if (r.minLevel && derived.level.level < r.minLevel) return `Unlocks at Level ${r.minLevel}`;
      if (derived.gold < r.cost) return `You need ${r.cost - derived.gold} more gold`;
      get().commit((s) => { s.redemptions.push({ id: uid(), rewardId: r.id, title: r.title, cost: r.cost, date: todayISO(), ts: Date.now() }); });
      return null;
    },
    refund: (rid) => get().commit((s) => { s.redemptions = s.redemptions.filter((r) => r.id !== rid); }),

    exportJSON: () => {
      const text = exportPayload(get().state);
      get().commit((s) => { s.lastExportAt = Date.now(); }, { silent: true });
      return text;
    },
    importJSON: (text, mode) => {
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { return { ok: false, message: "That doesn't look like valid JSON." }; }
      const incoming = normalizeState(parsed);
      if (!incoming) return { ok: false, message: "This file isn't a Project 26 backup." };
      const cur = get();
      const next = mode === "merge" ? mergeStates(cur.state, incoming) : incoming;
      const today = todayISO();
      setSoundEnabled(next.settings.sound);
      set({ state: next, derived: simulate(next, today), today, events: [] });
      flush();
      const n = Object.keys(incoming.days).length;
      return { ok: true, message: mode === "merge" ? `Merged ${n} logged days into this device.` : `Restored ${n} logged days.` };
    },
    restoreBackup: () => {
      const b = loadBackup();
      if (!b) return false;
      const today = todayISO();
      set({ state: b.state, derived: simulate(b.state, today), today, events: [] });
      flush();
      return true;
    },
    resetProgress: () => get().commit((s) => {
      s.days = {}; s.tasks = []; s.learnQuests = []; s.books = []; s.redemptions = []; s.weeklyReflections = {}; delete s.lastExportAt;
    }, { silent: true }),
    eraseEverything: () => {
      const fresh = makeInitialState();
      setSoundEnabled(true);
      set({ state: fresh, derived: simulate(fresh, todayISO()), events: [] });
      flush();
    },
  };
});

export const currentWeekStart = (today: ISODate) => weekStart(today);
