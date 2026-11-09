// Goals & motivation helpers. Pure UI-side maths on top of the engine's output — no new XP is created here,
// so the economy (and the balance tests) stay exactly as they were.
import { ACHIEVEMENTS, type Achievement } from "./content/defs";
import { addDays, type ISODate } from "./dates";
import type { Derived } from "./engine";
import type { ConfigEntry } from "./types";

/** XP that counts toward the *daily* goal: quests, their bonuses, flawless/comeback, reflection, side quests.
 *  Trophies, weekly/monthly rewards, bosses and region clears are big one-offs and are deliberately excluded. */
const DAILY_KINDS = new Set(["daily", "bonus", "flawless", "comeback", "reflect", "side"]);
export function dailyXp(d: Derived, date: ISODate): number {
  return d.awards.reduce((s, a) => (a.date === date && DAILY_KINDS.has(a.kind) && !a.key.startsWith("lq:") ? s + a.xp : s), 0);
}

export interface GoalTier { id: "keep" | "strong" | "flawless"; name: string; quests: number; xp: number; blurb: string }

export function goalTiers(cfg: ConfigEntry): GoalTier[] {
  const X = cfg.xp;
  const base = X.sleep + X.reading + X.learning + X.health + X.screen + X.work;
  const keepQ = cfg.targets.streakQuests;
  const tiers: GoalTier[] = [];
  const per = (q: number) => Math.round((base * q) / 6);
  tiers.push({ id: "keep", name: "Keep the day", quests: keepQ, xp: per(keepQ), blurb: "Your streak lives. This is the real minimum." });
  if (keepQ < 5) tiers.push({ id: "strong", name: "Strong day", quests: 5, xp: per(5), blurb: "Five quests — an excellent day." });
  tiers.push({ id: "flawless", name: "Flawless", quests: 6, xp: base + X.flawless, blurb: "All six quests, plus the flawless bonus." });
  return tiers;
}

export function goalProgress(xp: number, tiers: GoalTier[]) {
  const reached = tiers.filter((t) => xp >= t.xp);
  const next = tiers.find((t) => xp < t.xp) ?? null;
  const top = tiers[tiers.length - 1].xp;
  return { reached, next, toNext: next ? next.xp - xp : 0, pct: Math.min(1, xp / top) };
}

export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 100, 200, 365];
export const nextStreakMilestone = (streak: number) => STREAK_MILESTONES.find((m) => m > streak) ?? null;

export const WEEKLY_KEEP_GOAL = 5;

export interface Reach { ach: Achievement; cur: number; pct: number }
/** Trophies you're closest to — "almost there" is the honest kind of motivating. */
export function withinReach(d: Derived, limit = 3): Reach[] {
  return ACHIEVEMENTS.filter((a) => !a.secret && !d.unlocked[a.id])
    .map((ach) => { const cur = ach.metric(d.stats); return { ach, cur, pct: cur / ach.target }; })
    .filter((x) => x.pct > 0 && x.pct < 1)
    .sort((a, b) => b.pct - a.pct || a.ach.target - b.ach.target)
    .slice(0, limit);
}

/** Highest single-day *daily* XP so far (for "beat your best"). */
export function bestDay(d: Derived): { date: ISODate; xp: number } | null {
  let best: { date: ISODate; xp: number } | null = null;
  for (const date of Object.keys(d.days)) {
    const xp = dailyXp(d, date);
    if (xp > 0 && (!best || xp > best.xp)) best = { date, xp };
  }
  return best;
}
export const yesterdayOf = (today: ISODate) => addDays(today, -1);
