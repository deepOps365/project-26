"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Bar, Empty, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { VALIANT_XP, WEEKLY_QUESTS } from "@/lib/content/defs";
import { SKILLS } from "@/lib/content/skills";
import { addDays, dow, fmtLong, fmtShort, weekEnd, weekStart, type ISODate } from "@/lib/dates";
import { firstBossWeek, weekInfoFor } from "@/lib/engine";
import { useGame } from "@/lib/store";

export default function BattlePage() {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const start = state.settings.startDate;
  const thisWeek = weekStart(today);
  const [ws, setWs] = useState<ISODate>(thisWeek);
  const week = weekInfoFor(state, d, ws);
  const boss = week.boss;
  const ended = weekEnd(ws) < today;
  const current = ws === thisWeek;
  const firstWs = firstBossWeek(start);
  const objs = boss?.objectives.map((o) => ({ ...o, val: o.value(week.stats) })) ?? [];
  const progress = objs.length ? objs.reduce((s, o) => s + Math.min(1, o.val / o.target), 0) / objs.length : 0;
  const hit = objs.filter((o) => o.val >= o.target).length;
  const hp = week.bossWon ? 0 : 1 - progress;
  const lastWs = addDays(thisWeek, -7);
  const lastWeek = weekInfoFor(state, d, lastWs);
  const isSunday = dow(today) === 0;
  const history = Array.from({ length: 8 }, (_, i) => addDays(thisWeek, -7 * (i + 1))).filter((w) => w >= firstWs).map((w) => weekInfoFor(state, d, w));
  const dayInWeek = Math.min(7, Math.max(1, dow(today) + 1));

  return (
    <div className="space-y-5">
      <PageHeader icon="swords" title="Boss Battle" subtitle="A new boss appears every Sunday. Win through consistency, not perfection." />

      {isSunday && lastWeek.boss && lastWeek.active && current && (
        <Panel gold className="flex items-center gap-4 animate-rise">
          <Icon name={lastWeek.bossWon ? "trophy" : lastWeek.valiant ? "heart" : "shield"} size={26} className="text-gold-300 shrink-0" />
          <div className="text-sm">
            <b className="font-display text-base block">Last week&apos;s verdict</b>
            <span className="text-mist">{lastWeek.bossWon ? `You defeated ${lastWeek.boss.name}.` : lastWeek.valiant ? `A valiant stand against ${lastWeek.boss.name} — +${VALIANT_XP} XP.` : `${lastWeek.boss.name} held the field. It happens — a new boss arrives today.`}</span>
          </div>
        </Panel>
      )}

      <div className="flex items-center justify-between gap-2">
        <button className="btn btn-icon btn-sm" onClick={() => setWs(addDays(ws, -7))} disabled={ws <= firstWs} aria-label="Previous week"><Icon name="left" size={16} /></button>
        <div className="text-center"><div className="font-display">{current ? "This week" : ws === lastWs ? "Last week" : "Week of"}</div><div className="text-xs text-fog">{fmtShort(ws)} – {fmtShort(weekEnd(ws))}</div></div>
        <button className="btn btn-icon btn-sm" onClick={() => setWs(addDays(ws, 7))} disabled={ws >= thisWeek} aria-label="Next week"><Icon name="right" size={16} /></button>
      </div>

      {!boss || !week.active ? (
        <Panel><Empty icon="swords" title="No boss this week">The first boss appears on Sunday, {fmtLong(firstWs)} — your first full week.</Empty></Panel>
      ) : (
        <Panel glow={`${boss.color}66`} accent={boss.color} className="relative overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: boss.color }} />
          <div className="relative text-center pt-2">
            <div className={`mx-auto w-28 h-28 rounded-3xl grid place-items-center ${week.bossWon ? "" : "animate-float"}`} style={{ background: `radial-gradient(circle at 50% 30%, ${boss.color}33, ${boss.color}0d)`, boxShadow: `0 0 50px ${boss.color}55, inset 0 0 0 1.5px ${boss.color}77`, color: boss.color, filter: week.bossWon ? "grayscale(.9) brightness(.7)" : undefined }}>
              <Icon name={boss.icon} size={60} strokeWidth={1.2} />
            </div>
            <div className="rune-title mt-4">{week.bossWon ? "Defeated" : ended ? "Week over" : "Boss"}</div>
            <h2 className="font-display text-2xl sm:text-3xl mt-1" style={{ color: boss.color }}>{boss.name}</h2>
            <div className="text-sm text-mist italic">{boss.epithet}</div>
            <p className="text-sm text-fog max-w-md mx-auto mt-2">{boss.flavor}</p>
          </div>

          <div className="relative mt-5">
            <div className="flex justify-between text-[11px] mb-1.5 tabular"><span className="text-mist uppercase tracking-widest">Boss HP</span><span className="text-fog">{week.bossWon ? "0%" : `${Math.round(hp * 100)}%`}</span></div>
            <div className="h-4 rounded-full bg-black/50 ring-1 ring-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-1000 ease-out" style={{ width: `${hp * 100}%`, background: "linear-gradient(90deg,#7a1c2a,#ef4a5f)", boxShadow: "0 0 14px #ef4a5f88" }} />
            </div>
          </div>

          <ul className="relative mt-5 space-y-3">
            {objs.map((o) => {
              const ok = o.val >= o.target;
              return (
                <li key={o.id} className="rounded-xl bg-black/30 ring-1 ring-white/5 p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full grid place-items-center shrink-0 mt-0.5 ring-2" style={ok ? { background: boss.color, color: "#0a0a10", ["--tw-ring-color" as string]: boss.color } : { ["--tw-ring-color" as string]: "rgba(255,255,255,.15)" }}>{ok && <Icon name="check" size={13} strokeWidth={3} />}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{o.label}</div>
                      <div className="flex items-center gap-3 mt-2"><Bar pct={o.val / o.target} color={boss.color} height={6} /><span className="text-xs tabular text-mist shrink-0">{Math.min(o.val, o.target)}/{o.target}</span></div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="relative mt-4 text-center text-sm">
            {week.bossWon ? <p className="text-gold-300 font-display">Victory on {fmtLong(week.bossWon)} · +{boss.xp} XP</p>
              : week.valiant ? <p className="text-mist">You fell one objective short — a valiant stand. <span className="text-gold-300">+{VALIANT_XP} XP</span></p>
              : ended ? <p className="text-fog">The week has ended. The boss won this round.</p>
              : <p className="text-mist">{hit}/{objs.length} objectives met · day {dayInWeek} of 7 · <span className="text-gold-300">+{boss.xp} XP</span> on victory{" "}<span className="text-fog">(finish all but one for +{VALIANT_XP} XP)</span></p>}
          </div>
          <p className="relative text-[11px] text-fog text-center mt-3">Objectives are counts, not streaks — one rough day can&apos;t sink your week.</p>
        </Panel>
      )}

      <section>
        <SectionTitle icon="scroll">Weekly quests</SectionTitle>
        {week.active ? (
          <div className="grid sm:grid-cols-2 gap-2.5">
            {WEEKLY_QUESTS.map((q) => {
              const m = SKILLS[q.skill], val = q.value(week.stats), ok = !!week.weekly[q.id];
              return (
                <Panel key={q.id} className="!p-3.5">
                  <div className="flex items-center gap-3">
                    <Icon name={ok ? "check" : q.icon} size={18} style={{ color: m.color }} />
                    <div className="min-w-0 flex-1"><div className="text-sm font-semibold truncate">{q.name}</div><div className="text-xs text-fog truncate">{q.desc}</div></div>
                    <span className={`font-display text-sm tabular ${ok ? "text-gold-300" : "text-fog"}`}>+{q.xp}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2.5"><Bar pct={val / q.target} color={m.color} height={5} /><span className="text-[11px] tabular text-mist">{Math.min(val, q.target)}/{q.target}</span></div>
                </Panel>
              );
            })}
          </div>
        ) : <Panel><Empty icon="scroll" title="Weekly quests start with your first full week" /></Panel>}
      </section>

      {history.length > 0 && (
        <section>
          <SectionTitle icon="hourglass">Battle record</SectionTitle>
          <Panel className="!p-2 divide-y divide-white/5">
            {history.map((w) => (
              <button key={w.weekStart} className="w-full flex items-center gap-3 px-2 py-2.5 text-left hover:bg-white/5 rounded-xl" onClick={() => setWs(w.weekStart)}>
                <Icon name={w.boss?.icon ?? "swords"} size={18} style={{ color: w.boss?.color }} />
                <div className="flex-1 min-w-0"><div className="text-sm truncate">{w.boss?.name}</div><div className="text-[11px] text-fog">{fmtShort(w.weekStart)} – {fmtShort(weekEnd(w.weekStart))}</div></div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${w.bossWon ? "bg-gold-400/15 text-gold-300" : w.valiant ? "bg-white/10 text-mist" : "bg-white/5 text-fog"}`}>{w.bossWon ? "Victory" : w.valiant ? "Valiant" : "Defeat"}</span>
              </button>
            ))}
          </Panel>
          <p className="text-xs text-fog mt-2 px-1">{d.stats.bossWins} boss{d.stats.bossWins === 1 ? "" : "es"} defeated so far.</p>
        </section>
      )}
    </div>
  );
}
