import assert from "node:assert/strict";
import { makeInitialState } from "../src/lib/config";
import { simulate, bossForWeek, firstBossWeek } from "../src/lib/engine";
import { emptyDay, type GameState } from "../src/lib/types";
import { levelInfo, xpForLevel, rankForLevel } from "../src/lib/progression";
import { addDays, weekStart, dow } from "../src/lib/dates";
import { BOSSES } from "../src/lib/content/defs";

let n = 0;
const test = (name: string, fn: () => void) => { fn(); n++; console.log("  ✓", name); };
const S = () => { const s = makeInitialState("2026-11-14"); s.onboarded = true; return s; };
const day = (s: GameState, d: string) => (s.days[d] ||= emptyDay());
const D1 = "2026-11-14";
let id = 0;
const read = (s: GameState, d: string, pages: number) => day(s, d).reading.push({ id: `r${id++}`, pages, ts: 0 });
const learn = (s: GameState, d: string, minutes: number, kind: any = "practice", topic: any = "python", note = "") =>
  day(s, d).learning.push({ id: `l${id++}`, topic, kind, minutes, note, ts: 0 });
const move = (s: GameState, d: string, minutes: number, type: any = "walk") => day(s, d).activity.push({ id: `a${id++}`, type, minutes, ts: 0 });
const xpOf = (s: GameState, today: string) => simulate(s, today).totalXp;
const awardKeys = (s: GameState, today: string) => simulate(s, today).awards.map((a) => a.key);

console.log("Level curve");
console.log("  ", [2, 5, 10, 18, 27, 37, 48, 60].map((l) => `L${l}=${xpForLevel(l)}`).join("  "));
test("level maths", () => {
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(xpForLevel(10)).level, 10);
  assert.equal(levelInfo(xpForLevel(10) - 1).level, 9);
  assert.equal(rankForLevel(1).name, "Beginner");
  assert.equal(rankForLevel(10).name, "Explorer");
  assert.equal(rankForLevel(44).name, "Master");
  assert.equal(rankForLevel(60).name, "Legend");
});

console.log("Daily quests");
test("empty world has no XP and is Level 1", () => {
  const d = simulate(S(), "2026-11-08");
  assert.equal(d.totalXp, 0); assert.equal(d.level.level, 1);
});
test("quest pays only when the logged number meets the minimum", () => {
  const s = S(); read(s, D1, 1);
  let d = simulate(s, D1);
  assert.equal(d.days[D1].quests.reading.state, "partial");
  assert.equal(d.days[D1].quests.reading.xp, 6); // 40% of 15
  read(s, D1, 1);
  d = simulate(s, D1);
  assert.equal(d.days[D1].quests.reading.state, "done");
  assert.equal(d.skillXp.reading, 15);
});
test("no duplicate XP: re-running the pass is stable, extra entries don't re-pay", () => {
  const s = S(); read(s, D1, 2);
  const a = xpOf(s, D1), b = xpOf(s, D1);
  assert.equal(a, b);
  read(s, D1, 3); // still < goal(10): same quest XP
  assert.equal(simulate(s, D1).skillXp.reading, 15);
  const keys = awardKeys(s, D1); assert.equal(new Set(keys).size, keys.length);
});
test("correcting an entry revokes its XP and achievements", () => {
  const s = S(); read(s, D1, 2);
  assert.ok(simulate(s, D1).unlocked["first_blood"]);
  day(s, D1).reading = [];
  const d = simulate(s, D1);
  assert.equal(d.totalXp, 0); assert.equal(d.unlocked["first_blood"], undefined);
});
test("reading goal gives a bonus", () => {
  const s = S(); read(s, D1, 12);
  const q = simulate(s, D1).days[D1].quests.reading;
  assert.equal(q.state, "exceeded"); assert.equal(q.total, 15 + 8);
});
test("sleep: healthy 7–9h pays, oversleeping and short nights don't (partial from 6h)", () => {
  const s = S();
  day(s, D1).sleep = { hours: 7.5 };
  assert.equal(simulate(s, D1).days[D1].quests.sleep.xp, 20);
  day(s, D1).sleep = { hours: 11 };
  assert.equal(simulate(s, D1).days[D1].quests.sleep.xp, 0);
  day(s, D1).sleep = { hours: 6.2 };
  assert.equal(simulate(s, D1).days[D1].quests.sleep.state, "partial");
  day(s, D1).sleep = { hours: 4 };
  assert.equal(simulate(s, D1).days[D1].quests.sleep.xp, 0);
});
test("sleep recovery bonus after a short night", () => {
  const s = S();
  day(s, D1).sleep = { hours: 4.5 };
  day(s, addDays(D1, 1)).sleep = { hours: 8 };
  const q = simulate(s, addDays(D1, 1)).days[addDays(D1, 1)].quests.sleep;
  assert.ok(q.bonuses.some((b) => b.key === "recovery"));
});
test("learning: practice counts fully, passive study counts half", () => {
  const s = S(); learn(s, D1, 20, "practice");
  assert.equal(simulate(s, D1).days[D1].quests.learning.state, "done");
  const t = S(); learn(t, D1, 30, "study");
  assert.equal(simulate(t, D1).days[D1].quests.learning.state, "partial"); // 15 eff of 20
  learn(t, D1, 10, "study");
  assert.equal(simulate(t, D1).days[D1].quests.learning.state, "done"); // 20 eff
});
test("learning is capped per day (can't farm one day)", () => {
  const s = S(); learn(s, D1, 600, "practice");
  assert.equal(Math.round(simulate(s, D1).days[D1].metrics.learnEff), 180);
});
test("health: minutes capped, meditation-only is partial, meditation+eating are bonuses", () => {
  const s = S(); move(s, D1, 15);
  assert.equal(simulate(s, D1).days[D1].quests.health.state, "done");
  move(s, D1, 5, "meditate"); day(s, D1).healthyEating = true;
  const q = simulate(s, D1).days[D1].quests.health;
  assert.equal(q.state, "exceeded"); assert.equal(q.total, 30);
  const t = S(); move(t, D1, 600, "run");
  assert.equal(simulate(t, D1).days[D1].metrics.activeMin, 90);
  const u = S(); move(u, D1, 6, "meditate");
  assert.equal(simulate(u, D1).days[D1].quests.health.state, "partial");
});
test("screen: must be logged; 0 is a valid log; over the limit is no penalty", () => {
  const s = S();
  assert.equal(simulate(s, D1).days[D1].quests.screen.xp, 0);
  day(s, D1).screen = 0;
  assert.equal(simulate(s, D1).days[D1].quests.screen.state, "exceeded");
  day(s, D1).screen = 300;
  const d = simulate(s, D1); assert.equal(d.days[D1].quests.screen.xp, 0); assert.equal(d.totalXp, 0);
  day(s, D1).screen = 240;
  assert.equal(simulate(s, D1).days[D1].quests.screen.state, "done");
});
test("work: tasks done today (not hours), partial at 3 of 5, completion date matters", () => {
  const s = S();
  for (let i = 0; i < 3; i++) s.tasks.push({ id: `t${i}`, title: "x", priority: "medium", createdOn: D1, doneOn: D1 });
  assert.equal(simulate(s, D1).days[D1].quests.work.state, "partial");
  for (let i = 3; i < 5; i++) s.tasks.push({ id: `t${i}`, title: "x", priority: "high", createdOn: D1, doneOn: D1, win: "shipped it" });
  const q = simulate(s, D1).days[D1].quests.work;
  assert.equal(q.state, "exceeded"); assert.equal(q.total, 35);
  s.tasks[0].doneOn = addDays(D1, 1); // un-done today
  assert.equal(simulate(s, D1).days[D1].quests.work.state, "partial");
});

console.log("Streaks");
const keep = (s: GameState, d: string) => { read(s, d, 2); learn(s, d, 20); move(s, d, 15); };
test("kept day = ≥3 quests; streak counts; today pending doesn't break it", () => {
  const s = S();
  keep(s, "2026-11-14"); keep(s, "2026-11-15");
  let d = simulate(s, "2026-11-16"); // today (16th) not kept yet
  assert.equal(d.streak.current, 2);
  keep(s, "2026-11-16");
  d = simulate(s, "2026-11-16"); assert.equal(d.streak.current, 3);
  assert.ok(d.unlocked["consistency_begins"]);
});
test("one missed day per week is shielded; two in a row reset", () => {
  const s = S();
  keep(s, "2026-11-14"); keep(s, "2026-11-15"); /* miss 16 */ keep(s, "2026-11-17");
  let d = simulate(s, "2026-11-17");
  assert.equal(d.streak.current, 3); assert.deepEqual(d.streak.shielded, ["2026-11-16"]);
  // miss 18 within 7 days of shield use → breaks
  d = simulate(s, "2026-11-19");
  assert.equal(d.streak.current, 0); assert.equal(d.streak.longest, 3);
});
test("comeback bonus after ≥2 missed days", () => {
  const s = S(); keep(s, "2026-11-14"); keep(s, "2026-11-18");
  const d = simulate(s, "2026-11-18");
  assert.ok(d.awards.some((a) => a.kind === "comeback"));
  assert.ok(d.unlocked["hero_returns"]);
});
test("flawless day pays the bonus", () => {
  const s = S(); keep(s, D1); day(s, D1).sleep = { hours: 8 }; day(s, D1).screen = 100;
  for (let i = 0; i < 5; i++) s.tasks.push({ id: `f${i}`, title: "x", priority: "low", createdOn: D1, doneOn: D1 });
  const d = simulate(s, D1);
  assert.ok(d.days[D1].perfect); assert.ok(d.awards.some((a) => a.kind === "flawless")); assert.ok(d.unlocked["flawless"]);
});

console.log("Bosses & weeks");
test("weeks run Sunday→Saturday; first boss appears the first Sunday inside the journey", () => {
  assert.equal(dow("2026-11-15"), 0);
  assert.equal(firstBossWeek("2026-11-14"), "2026-11-15");
  assert.equal(bossForWeek("2026-11-08", "2026-11-14"), null); // 1-day prologue week
  assert.equal(bossForWeek("2026-11-15", "2026-11-14")!.id, BOSSES[0].id);
  assert.equal(bossForWeek("2026-11-22", "2026-11-14")!.id, BOSSES[1].id);
  assert.equal(weekStart("2026-11-21"), "2026-11-15");
});
test("boss falls on consistency, not perfection (misses allowed)", () => {
  const s = S();
  // Distraction Demon: screen ok 5d, 4 learning sessions, read 5 days — across Sun 15 … Sat 21 with 2 missed days
  for (const d of ["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-19", "2026-11-20"]) {
    day(s, d).screen = 120; read(s, d, 3); learn(s, d, 20);
  }
  const d = simulate(s, "2026-11-21");
  const w = d.weeks["2026-11-15"];
  assert.equal(w.bossWon, "2026-11-20");
  assert.ok(d.awards.some((a) => a.key === "boss:2026-11-15"));
  assert.ok(d.unlocked["boss_1"]);
});
test("valiant effort when the week ends one objective short", () => {
  const s = S();
  for (const d of ["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"]) { day(s, d).screen = 120; read(s, d, 3); }
  learn(s, "2026-11-15", 20); // only 1 session
  const d = simulate(s, "2026-11-23");
  assert.equal(d.weeks["2026-11-15"].bossWon, undefined);
  assert.equal(d.weeks["2026-11-15"].valiant, "2026-11-21");
});
test("weekly quest pays once", () => {
  const s = S();
  for (const d of ["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"]) read(s, d, 2);
  const d = simulate(s, "2026-11-21");
  assert.equal(d.awards.filter((a) => a.key === "w:2026-11-15:wq_read").length, 1);
});

console.log("Config history");
test("changing XP applies from that day forward; history isn't re-scored", () => {
  const s = S(); read(s, "2026-11-14", 2); read(s, "2026-11-16", 2);
  s.configHistory.push({ from: "2026-11-16", targets: { ...s.configHistory[0].targets }, xp: { ...s.configHistory[0].xp, reading: 30 } });
  const d = simulate(s, "2026-11-16");
  assert.equal(d.days["2026-11-14"].quests.reading.xp, 15);
  assert.equal(d.days["2026-11-16"].quests.reading.xp, 30);
});

console.log("Shop");
test("gold = XP − spent; spending never lowers the level", () => {
  const s = S(); for (let i = 0; i < 6; i++) { const d = addDays(D1, i); read(s, d, 12); learn(s, d, 50, "practice", "python", "a real written note here"); move(s, d, 30); }
  const before = simulate(s, addDays(D1, 6));
  s.redemptions.push({ id: "x", rewardId: "rw-anime", title: "Anime", cost: 60, date: addDays(D1, 6), ts: 0 });
  const after = simulate(s, addDays(D1, 6));
  assert.equal(after.gold, after.totalXp - 60); assert.equal(after.spent, 60); assert.ok(after.level.level >= before.level.level);
  assert.ok(after.unlocked["treat"]);
});

console.log("Achievements cascade & unlock dates");
test("achievement unlock date is the first day it became true", () => {
  const s = S(); read(s, "2026-11-14", 60); read(s, "2026-11-15", 60);
  const d = simulate(s, "2026-11-16");
  assert.equal(d.unlocked["pages_100"], "2026-11-15");
});
test("year simulation runs fast and levels sensibly (85% consistent hero)", () => {
  const s = S(); const t0 = Date.now();
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 365; i++) {
    const d = addDays("2026-11-14", i);
    if (rnd() < 0.15) continue;
    read(s, d, 2 + Math.floor(rnd() * 14)); learn(s, d, 20 + Math.floor(rnd() * 40), "practice", ["python", "aws", "kubernetes", "ai"][i % 4], "wrote notes on it");
    move(s, d, 15 + Math.floor(rnd() * 25)); if (rnd() < 0.5) move(s, d, 8, "meditate");
    day(s, d).sleep = { hours: 6.5 + rnd() * 2 }; day(s, d).screen = 90 + Math.floor(rnd() * 190);
    for (let k = 0; k < 3 + Math.floor(rnd() * 4); k++) s.tasks.push({ id: `y${i}-${k}`, title: "t", priority: rnd() < 0.3 ? "high" : "low", createdOn: d, doneOn: d });
    if (rnd() < 0.6) day(s, d).reflection = { accomplished: "stuff done", distraction: "phone", learned: "things", improve: "sleep", mood: 4, journal: "", updatedAt: 0 };
  }
  const d = simulate(s, "2027-11-13");
  const ms = Date.now() - t0;
  console.log(`    year total XP ${d.totalXp} → Level ${d.level.level} (${rankForLevel(d.level.level).name}); longest streak ${d.streak.longest}; achievements ${Object.keys(d.unlocked).length}; bosses ${d.stats.bossWins}; regions ${Object.keys(d.cleared).length}; ${ms}ms`);
  assert.ok(ms < 1500);
  assert.ok(d.level.level >= 40 && d.level.level <= 62);
});
console.log(`\n${n} tests passed`);
