// Balanced curve: early levels fall in days, late levels demand sustained effort.
//   cumulative XP to reach level L = 55 * (L-1)^1.8
//   L5 ≈ 665 (≈ week 1)   L10 ≈ 2.9k (≈ week 3)   L18 ≈ 9k   L32 ≈ 27k
//   L44 ≈ 49k            L53 ≈ 68k               L60 ≈ 85k  (a near-perfect year)
// Simulated year (scripts/balance.ts): rough ≈ Warrior · average ≈ Elite · good ≈ Master ·
// strong ≈ Grandmaster · near-perfect ≈ Legend.

export const MAX_LEVEL = 99;
export const xpForLevel = (L: number) => (L <= 1 ? 0 : Math.round(55 * Math.pow(L - 1, 1.8)));

export interface LevelInfo {
  level: number;
  xp: number;
  curAt: number;
  nextAt: number;
  into: number;
  needed: number;
  pct: number;
  maxed: boolean;
}

function levelFrom(xp: number, at: (l: number) => number, max: number): LevelInfo {
  let level = 1;
  while (level < max && xp >= at(level + 1)) level++;
  const curAt = at(level);
  const maxed = level >= max;
  const nextAt = maxed ? curAt : at(level + 1);
  const needed = Math.max(1, nextAt - curAt);
  const into = Math.max(0, xp - curAt);
  return { level, xp, curAt, nextAt, into, needed, pct: maxed ? 1 : Math.min(1, into / needed), maxed };
}

export const levelInfo = (xp: number) => levelFrom(Math.max(0, xp), xpForLevel, MAX_LEVEL);

export const SKILL_MAX_LEVEL = 30;
export const xpForSkillLevel = (L: number) => (L <= 1 ? 0 : Math.round(70 * Math.pow(L - 1, 1.6)));
export const skillLevelInfo = (xp: number) => levelFrom(Math.max(0, xp), xpForSkillLevel, SKILL_MAX_LEVEL);

export interface Rank { id: string; name: string; minLevel: number; color: string; blurb: string }
export const RANKS: Rank[] = [
  { id: "beginner", name: "Beginner", minLevel: 1, color: "#9AA5B1", blurb: "A new adventurer steps onto the road." },
  { id: "apprentice", name: "Apprentice", minLevel: 5, color: "#3DDC97", blurb: "The habits are taking root." },
  { id: "explorer", name: "Explorer", minLevel: 10, color: "#46C2F2", blurb: "You've left the forest and found the map." },
  { id: "warrior", name: "Warrior", minLevel: 18, color: "#A978FF", blurb: "Discipline is a muscle and it's growing." },
  { id: "elite", name: "Elite", minLevel: 32, color: "#7C5CFF", blurb: "Few keep promises to themselves like this." },
  { id: "master", name: "Master", minLevel: 44, color: "#F0BC4E", blurb: "The craft has become who you are." },
  { id: "grandmaster", name: "Grandmaster", minLevel: 53, color: "#FF9F6B", blurb: "Quiet, relentless, unmistakable." },
  { id: "legend", name: "Legend", minLevel: 60, color: "#FFE08A", blurb: "A story people will retell." },
];

export function rankForLevel(level: number): Rank {
  let r = RANKS[0];
  for (const x of RANKS) if (level >= x.minLevel) r = x;
  return r;
}
export function nextRank(level: number): Rank | undefined {
  return RANKS.find((r) => r.minLevel > level);
}
