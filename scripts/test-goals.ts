import assert from "node:assert/strict";
import { DEFAULT_TARGETS, DEFAULT_XP, makeInitialState } from "../src/lib/config";
import { simulate } from "../src/lib/engine";
import { bestDay, dailyXp, goalProgress, goalTiers, nextStreakMilestone, withinReach } from "../src/lib/goals";
import { emptyDay } from "../src/lib/types";

let n = 0;
const test = (name: string, fn: () => void) => { fn(); n++; console.log("  ✓", name); };
const cfg = { from: "0000-01-01", targets: { ...DEFAULT_TARGETS }, xp: { ...DEFAULT_XP } };
const D = "2026-11-14";

console.log("Goals");
test("default tiers: keep (3 quests ≈ 63 XP) → strong (5) → flawless (6 + bonus = 145)", () => {
  const t = goalTiers(cfg);
  assert.deepEqual(t.map((x) => [x.id, x.quests, x.xp]), [["keep", 3, 63], ["strong", 5, 104], ["flawless", 6, 145]]);
});
test("tiers adapt to config (keep=5 drops the redundant 'strong' tier)", () => {
  const t = goalTiers({ ...cfg, targets: { ...cfg.targets, streakQuests: 5 } });
  assert.deepEqual(t.map((x) => x.id), ["keep", "flawless"]);
});
test("progress: reached tiers, next tier and XP still needed", () => {
  const t = goalTiers(cfg);
  const p = goalProgress(70, t);
  assert.equal(p.reached.length, 1); assert.equal(p.next!.id, "strong"); assert.equal(p.toNext, 34);
  assert.equal(goalProgress(200, t).next, null);
});
test("daily XP counts quests/bonuses but never trophies or boss rewards", () => {
  const s = makeInitialState("2026-11-14"); s.onboarded = true;
  const day = (s.days[D] = emptyDay()); day.reading.push({ id: "r", pages: 2, ts: 0 });
  const d = simulate(s, D);
  assert.equal(dailyXp(d, D), 15); // reading quest only; "First Blood"/"First Chapter" trophies (+50) excluded
  assert.ok(d.totalXp > 15);
});
test("'within reach' lists the closest unfinished, non-secret trophies", () => {
  const s = makeInitialState("2026-11-14"); s.onboarded = true;
  (s.days[D] = emptyDay()).reading.push({ id: "r", pages: 80, ts: 0 });
  const r = withinReach(simulate(s, D));
  assert.ok(r.length > 0 && r.every((x) => x.pct > 0 && x.pct < 1 && !x.ach.secret));
  assert.equal(r[0].ach.id, "pages_100");
  assert.ok(r.every((x, i) => i === 0 || r[i - 1].pct >= x.pct));
});
test("streak milestones and personal best", () => {
  assert.equal(nextStreakMilestone(0), 3); assert.equal(nextStreakMilestone(3), 7); assert.equal(nextStreakMilestone(365), null);
  const s = makeInitialState("2026-11-14"); s.onboarded = true;
  (s.days[D] = emptyDay()).reading.push({ id: "r", pages: 2, ts: 0 });
  const d = simulate(s, "2026-11-15");
  assert.deepEqual(bestDay(d), { date: D, xp: 15 });
});
console.log(`${n} goal tests passed`);
