"use client";

import { useMemo, useState } from "react";
import { BarChart, Heatmap } from "@/components/charts";
import { PageHeader, Panel, Segmented, SectionTitle, Stat, Bar } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { SKILLS } from "@/lib/content/skills";
import { addDays, addMonths, eachDay, fmtMonth, fmtShort, journeyEnd, monthDates, monthKey, parseISO, weekEnd, weekStart } from "@/lib/dates";
import { monthInfoFor, weekInfoFor, xpInRange } from "@/lib/engine";
import { fmtMinutes, fmtNum } from "@/lib/format";
import { useGame } from "@/lib/store";
import { SKILL_IDS } from "@/lib/types";

export default function Stats() {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const [tab, setTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const start = state.settings.startDate, end = journeyEnd(start);

  const heat = useMemo(() => eachDay(start, end).map((x) => {
    const e = d.days[x];
    const n = e?.questsDone ?? 0;
    return { date: x, level: n === 0 ? 0 : n <= 2 ? 1 : n === 3 ? 2 : n <= 5 ? 3 : 4, perfect: !!e?.perfect, today: x === today, future: x > today, title: `${fmtShort(x)}: ${n}/6 quests${e ? ` · ${d.xpByDate[x] ?? 0} XP` : ""}` };
  }), [d, start, end, today]);

  const last30 = eachDay(addDays(today, -29), today);
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(weekStart(today), -7 * (11 - i)));
  const months = useMemo(() => { const out: string[] = []; for (let m = monthKey(start); m <= monthKey(end > today ? today : end) && out.length < 14; m = addMonths(m, 1)) out.push(m); return out; }, [start, end, today]);

  const rate = SKILL_IDS.map((k) => ({ k, pct: last30.filter((x) => ["done", "exceeded"].includes(d.days[x]?.quests[k].state ?? "empty")).length / 30 }));
  const sleepVals = Object.values(state.days).map((l) => l.sleep?.hours).filter((x): x is number => x != null);
  const screenVals = Object.values(state.days).map((l) => l.screen).filter((x): x is number => x != null);
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

  return (
    <div className="space-y-5">
      <PageHeader icon="chart" title="Statistics" subtitle="Patterns over time — for insight, not judgement." />
      <Panel>
        <SectionTitle icon="calendar" right={<span className="text-[11px] text-fog">gold = flawless day</span>}>The journey · 365 days</SectionTitle>
        <Heatmap cells={heat} />
        <div className="flex items-center gap-1.5 mt-3 text-[11px] text-fog"><span>Fewer</span>{["bg-white/[.06]", "bg-jade-500/25", "bg-jade-500/45", "bg-jade-500/70", "bg-jade-400"].map((c) => <span key={c} className={`w-3 h-3 rounded-[3px] ${c}`} />)}<span>More quests</span></div>
      </Panel>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Stat icon="book" label="Pages read" value={fmtNum(d.stats.pages)} color="#a978ff" />
        <Stat icon="brain" label="Focused learning" value={`${(d.stats.learnEff / 60).toFixed(1)}h`} color="#f0bc4e" />
        <Stat icon="heart" label="Workouts" value={d.stats.workoutDays} color="#3ddc97" />
        <Stat icon="briefcase" label="Tasks done" value={fmtNum(d.stats.tasksDone)} color="#ff7a59" />
        <Stat icon="moon" label="Avg sleep" value={avg(sleepVals) == null ? "—" : `${avg(sleepVals)!.toFixed(1)}h`} color="#7c93ff" />
        <Stat icon="eye" label="Avg screen" value={avg(screenVals) == null ? "—" : fmtMinutes(avg(screenVals)!)} color="#46c2f2" />
        <Stat icon="flame" label="Longest streak" value={d.streak.longest} color="#ff9f6b" />
        <Stat icon="zap" label="Total XP" value={fmtNum(d.totalXp)} color="#f6cb62" />
      </div>

      <Panel>
        <SectionTitle icon="target">Consistency · last 30 days</SectionTitle>
        <div className="space-y-3">
          {rate.map(({ k, pct }) => (
            <div key={k}>
              <div className="flex justify-between text-sm mb-1"><span className="flex items-center gap-2"><Icon name={SKILLS[k].icon} size={15} style={{ color: SKILLS[k].color }} />{SKILLS[k].attribute}</span><span className="text-xs text-mist tabular">{Math.round(pct * 100)}%</span></div>
              <Bar pct={pct} color={SKILLS[k].color} height={6} />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-fog mt-3">Consistency beats intensity. Anything above 50% is a habit forming.</p>
      </Panel>

      <div className="flex justify-center"><Segmented value={tab} onChange={setTab} options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]} /></div>

      {tab === "daily" && (
        <Panel>
          <SectionTitle icon="zap">XP per day · last 30 days</SectionTitle>
          <BarChart height={140} data={last30.map((x) => ({ label: parseISO(x).getDate() % 5 === 0 || x === today ? String(parseISO(x).getDate()) : "", value: d.xpByDate[x] ?? 0, title: `${fmtShort(x)}: ${d.xpByDate[x] ?? 0} XP · ${d.days[x]?.questsDone ?? 0}/6 quests`, color: d.days[x]?.perfect ? "#f6cb62" : d.days[x]?.kept ? "#3ddc97" : "#b592ff" }))} format={(n) => `${Math.round(n)} XP`} />
          <p className="text-[11px] text-fog mt-2">Gold = flawless · green = day kept · purple = other.</p>
        </Panel>
      )}
      {tab === "weekly" && (
        <Panel>
          <SectionTitle icon="calendar">XP per week · last 12 weeks</SectionTitle>
          <BarChart height={140} data={weeks.map((w) => ({ label: fmtShort(w).replace(" ", " "), value: xpInRange(d, w, weekEnd(w)), color: "#f6cb62" }))} format={(n) => `${Math.round(n)} XP`} />
          <div className="mt-4 divide-y divide-white/5 text-sm">
            {[...weeks].reverse().slice(0, 8).map((w) => { const wi = weekInfoFor(state, d, w); const quests = Object.values(d.days).filter((e) => e.date >= w && e.date <= weekEnd(w)).reduce((s, e) => s + e.questsDone, 0); return (
              <div key={w} className="flex items-center gap-3 py-2"><span className="text-xs text-fog w-24 shrink-0">{fmtShort(w)} – {fmtShort(weekEnd(w))}</span><span className="tabular text-gold-300 w-16">{xpInRange(d, w, weekEnd(w))} XP</span><span className="tabular text-mist w-20">{quests} quests</span><span className="text-xs text-fog truncate ml-auto">{wi.bossWon ? "Boss ✓" : wi.valiant ? "Valiant" : wi.boss && wi.active ? "—" : ""}</span></div>
            ); })}
          </div>
        </Panel>
      )}
      {tab === "monthly" && (
        <div className="space-y-3">
          {months.length === 0 && <Panel><p className="text-sm text-fog text-center">Monthly stats appear once the journey begins.</p></Panel>}
          {[...months].reverse().map((ym) => {
            const m = monthInfoFor(state, d, ym);
            const dates = monthDates(ym);
            const xp = xpInRange(d, dates[0], dates[dates.length - 1]);
            return (
              <Panel key={ym}>
                <div className="flex items-baseline justify-between mb-3"><h3 className="font-display text-lg">{fmtMonth(ym)}</h3><span className="font-display gold-text tabular">{fmtNum(xp)} XP</span></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  {[["Days kept", m.stats.kept], ["Pages", m.stats.pages], ["Workouts", m.stats.workoutDays], ["Tasks", m.stats.tasksDone], ["Learning days", m.stats.learnDays], ["Healthy nights", m.stats.sleepGoodDays], ["Under limit", m.stats.screenOkDays], ["Reflections", m.stats.reflections]].map(([k, v]) => <div key={k as string} className="rounded-xl bg-black/25 py-2"><div className="font-display text-lg tabular">{v}</div><div className="text-[10px] text-fog uppercase tracking-wider">{k}</div></div>)}
                </div>
                <div className="text-xs text-fog mt-3">Challenges: {Object.keys(m.done).length} completed</div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
