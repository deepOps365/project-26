import { makeInitialState } from "../src/lib/config";
import { simulate } from "../src/lib/engine";
import { emptyDay } from "../src/lib/types";
import { addDays } from "../src/lib/dates";
import { rankForLevel } from "../src/lib/progression";

// Simulates heroes of different consistency and prints the year-end outcome.
function hero(skipP: number, effort: number, seed = 7) {
  const s = makeInitialState("2026-11-14"); s.onboarded = true;
  let r = seed; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  let id = 0;
  for (let i = 0; i < 365; i++) {
    const d = addDays("2026-11-14", i); const day = (s.days[d] = emptyDay());
    if (rnd() < skipP) continue;
    // each quest is attempted with probability `effort`
    if (rnd() < effort) day.reading.push({ id: `r${id++}`, pages: 2 + Math.floor(rnd() * 12), ts: 0 });
    if (rnd() < effort) day.learning.push({ id: `l${id++}`, topic: (["python", "aws", "kubernetes", "ai"] as const)[i % 4], kind: "practice", minutes: 20 + Math.floor(rnd() * 40), note: rnd() < 0.5 ? "wrote a few notes about it" : "", ts: 0 });
    if (rnd() < effort) { day.activity.push({ id: `a${id++}`, type: "walk", minutes: 15 + Math.floor(rnd() * 25), ts: 0 }); if (rnd() < 0.4) day.activity.push({ id: `m${id++}`, type: "meditate", minutes: 8, ts: 0 }); if (rnd() < 0.5) day.healthyEating = true; }
    if (rnd() < effort) day.sleep = { hours: 6.8 + rnd() * 2 };
    if (rnd() < effort) day.screen = 100 + Math.floor(rnd() * 160);
    if (rnd() < effort) for (let k = 0; k < 4 + Math.floor(rnd() * 3); k++) s.tasks.push({ id: `y${i}-${k}`, title: "t", priority: rnd() < 0.3 ? "high" : "low", createdOn: d, doneOn: d, win: rnd() < 0.3 ? "shipped" : undefined });
    if (rnd() < effort * 0.8) day.reflection = { accomplished: "stuff done", distraction: "phone", learned: "things", improve: "sleep", mood: 4, journal: "", updatedAt: 0 };
  }
  return simulate(s, "2027-11-13");
}
for (const [label, skip, eff] of [["perfect-ish (3% skip, 97% effort)", 0.03, 0.97], ["strong (10% skip, 88%)", 0.1, 0.88], ["good (15% skip, 75%)", 0.15, 0.75], ["average (30% skip, 65%)", 0.3, 0.65], ["rough (50% skip, 55%)", 0.5, 0.55]] as const) {
  const d = hero(skip, eff);
  const by: Record<string, number> = {}; d.awards.forEach((a) => (by[a.kind] = (by[a.kind] ?? 0) + a.xp));
  console.log(`${label.padEnd(36)} XP ${String(d.totalXp).padStart(6)}  L${d.level.level} ${rankForLevel(d.level.level).name.padEnd(11)} streak ${String(d.streak.longest).padStart(3)}  kept ${d.stats.keptDays}  ach ${Object.keys(d.unlocked).length}/${61}  boss ${d.stats.bossWins}  regions ${Object.keys(d.cleared).length}`);
  if (label.startsWith("good")) console.log("   skill levels:", Object.entries(d.skills).map(([k, v]) => `${k}:${v.level}`).join(" "));
  if (label.startsWith("good")) console.log("   breakdown:", Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join("  "));
}
