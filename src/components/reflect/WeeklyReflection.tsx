"use client";

import { useState } from "react";
import { ACH_BY_ID, RARITY_ORDER } from "@/lib/content/defs";
import { SKILLS } from "@/lib/content/skills";
import { addDays, dow, fmtLong, fmtShort, weekDates, weekEnd, weekStart, type ISODate } from "@/lib/dates";
import { weekInfoFor, xpInRange } from "@/lib/engine";
import { useGame } from "@/lib/store";
import { SKILL_IDS } from "@/lib/types";
import { Icon } from "../Icon";
import { Bar, Panel, Stat } from "../ui";

export function WeeklyReflection() {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const { saveWeeklyReflection } = useGame.getState();
  const thisWs = weekStart(today);
  const [ws, setWs] = useState<ISODate>(dow(today) === 0 ? addDays(thisWs, -7) : thisWs);
  const saved = state.weeklyReflections[ws];
  const [improvement, setImprovement] = useState(saved?.improvement ?? "");
  const [note, setNote] = useState(saved?.note ?? "");
  const go = (n: number) => { const next = addDays(ws, n * 7); setWs(next); const sv = state.weeklyReflections[next]; setImprovement(sv?.improvement ?? ""); setNote(sv?.note ?? ""); };

  const dates = weekDates(ws).filter((x) => x <= today);
  const evs = dates.map((x) => d.days[x]).filter(Boolean);
  const week = weekInfoFor(state, d, ws);
  const xp = xpInRange(d, ws, weekEnd(ws));
  const questsDone = evs.reduce((s, e) => s + e.questsDone, 0);
  const possible = dates.length * 6;
  const per = SKILL_IDS.map((k) => ({ k, days: evs.filter((e) => ["done", "exceeded"].includes(e.quests[k].state)).length, avg: evs.reduce((s, e) => s + e.quests[k].pct, 0) / Math.max(1, evs.length) }));
  const sorted = [...per].sort((a, b) => b.days - a.days || b.avg - a.avg);
  const best = sorted[0], worst = sorted[sorted.length - 1];
  const unlockedThisWeek = Object.entries(d.unlocked).filter(([, dt]) => dt >= ws && dt <= weekEnd(ws)).map(([id]) => ACH_BY_ID[id]).filter(Boolean)
    .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity));
  const bestDay = [...evs].sort((a, b) => b.questsDone - a.questsDone)[0];
  const biggest = week.bossWon && week.boss ? `Defeated ${week.boss.name}` : unlockedThisWeek[0] ? `Trophy: ${unlockedThisWeek[0].title}` : bestDay && bestDay.questsDone > 0 ? `Best day: ${fmtLong(bestDay.date)} (${bestDay.questsDone}/6 quests)` : "A week begun is a week won — start small.";
  const canSave = improvement.trim().length >= 3;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button className="btn btn-icon btn-sm" onClick={() => go(-1)} aria-label="Previous week"><Icon name="left" size={16} /></button>
        <div className="text-center"><div className="font-display">{ws === thisWs ? "This week" : ws === addDays(thisWs, -7) ? "Last week" : "Week of"}</div><div className="text-xs text-fog">{fmtShort(ws)} – {fmtShort(weekEnd(ws))}</div></div>
        <button className="btn btn-icon btn-sm" onClick={() => go(1)} disabled={ws >= thisWs} aria-label="Next week"><Icon name="right" size={16} /></button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Stat icon="zap" label="XP earned" value={xp.toLocaleString()} color="var(--color-gold-400)" />
        <Stat icon="scroll" label="Quests completed" value={`${questsDone}/${possible}`} color="#b592ff" />
        <Stat icon="check" label="Habit minimums" value={`${week.stats.minimumDays}/${dates.length}`} sub="read · learn · move" color="#3ddc97" />
        <Stat icon="shield" label="Days kept" value={`${week.stats.kept}/${dates.length}`} color="#46c2f2" />
      </div>

      <Panel>
        <div className="space-y-3">
          {per.map((p) => (
            <div key={p.k}>
              <div className="flex items-center justify-between text-sm mb-1"><span className="flex items-center gap-2"><Icon name={SKILLS[p.k].icon} size={15} style={{ color: SKILLS[p.k].color }} />{SKILLS[p.k].attribute}</span><span className="text-xs text-mist tabular">{p.days}/{dates.length} days</span></div>
              <Bar pct={dates.length ? p.days / dates.length : 0} color={SKILLS[p.k].color} height={6} />
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid sm:grid-cols-3 gap-2.5">
        <Panel className="!p-3.5"><div className="label">Most consistent</div><div className="font-display text-lg mt-1" style={{ color: SKILLS[best.k].color }}>{SKILLS[best.k].attribute}</div><div className="text-xs text-fog">{best.days} of {dates.length} days</div></Panel>
        <Panel className="!p-3.5"><div className="label">Needs love</div><div className="font-display text-lg mt-1" style={{ color: SKILLS[worst.k].color }}>{SKILLS[worst.k].attribute}</div><div className="text-xs text-fog">{worst.days} of {dates.length} days — not a failure, a signal</div></Panel>
        <Panel className="!p-3.5"><div className="label">Biggest achievement</div><div className="text-sm mt-1.5 text-gold-300">{biggest}</div></Panel>
      </div>

      <Panel gold>
        <h3 className="font-display text-lg gold-text mb-3">One improvement for next week</h3>
        <label className="sr-only" htmlFor="wk-improve">One improvement</label>
        <textarea id="wk-improve" className="input" rows={2} placeholder="One small, specific change — e.g. “Phone charges outside the bedroom.”" value={improvement} onChange={(e) => setImprovement(e.target.value)} maxLength={400} />
        <label className="block text-sm font-semibold mt-3 mb-1.5" htmlFor="wk-note">Anything else about this week? <span className="text-fog font-normal">(optional)</span></label>
        <textarea id="wk-note" className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1500} />
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <button className="btn btn-gold" disabled={!canSave} onClick={() => saveWeeklyReflection(ws, { improvement, note })}><Icon name="scroll" size={16} />{saved ? "Update weekly reflection" : "Save weekly reflection · +25 XP"}</button>
          {saved && <span className="text-xs text-jade-400">Saved {fmtShort(saved.savedOn)}</span>}
        </div>
      </Panel>
    </div>
  );
}
