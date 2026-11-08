"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { DateStrip } from "@/components/quest/DateStrip";
import { QuestCard } from "@/components/quest/QuestCard";
import { Bar, Empty, PageHeader, Panel, Segmented, SectionTitle } from "@/components/ui";
import { RULES, configFor } from "@/lib/config";
import { MONTHLY_QUESTS, WEEKLY_QUESTS, type PeriodQuest } from "@/lib/content/defs";
import { SKILLS } from "@/lib/content/skills";
import { diffDays, fmtMonth, fmtShort, journeyDay, journeyEnd, monthKey, weekDates, weekEnd, weekStart, type ISODate } from "@/lib/dates";
import { dayEvalFor, monthInfoFor, scaledTarget, weekInfoFor } from "@/lib/engine";
import { sfx } from "@/lib/sound";
import { useGame } from "@/lib/store";
import { SKILL_IDS } from "@/lib/types";

function PeriodList({ quests, stats, target, done }: { quests: PeriodQuest[]; stats: Parameters<PeriodQuest["value"]>[0]; target: (q: PeriodQuest) => number; done: Record<string, ISODate> }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2.5">
      {quests.map((q) => {
        const m = SKILLS[q.skill];
        const tgt = target(q);
        const val = Math.min(q.value(stats), tgt * 10);
        const ok = !!done[q.id];
        return (
          <Panel key={q.id} className={ok ? "panel-glow" : ""} glow={ok ? m.glow : undefined} accent={m.color}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: `${m.color}1f`, color: m.color }}><Icon name={ok ? "check" : q.icon} size={20} /></div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[15px] truncate">{q.name}</div>
                <div className="text-xs text-mist truncate">{q.desc.replace(/\d+/, String(tgt))}</div>
              </div>
              <div className="text-right"><div className="font-display text-gold-300 tabular">+{q.xp}</div><div className="text-[10px] text-fog tracking-widest">XP</div></div>
            </div>
            <div className="flex items-center gap-3 mt-3"><Bar pct={val / tgt} color={m.color} height={6} /><span className="text-xs tabular text-mist shrink-0">{Math.min(val, tgt)}/{tgt}</span></div>
          </Panel>
        );
      })}
    </div>
  );
}

function SideQuests({ date }: { date: ISODate }) {
  const defs = useGame((s) => s.state.sideQuests);
  const done = useGame((s) => s.state.days[date]?.sideDone ?? []);
  const { toggleSide, addSideQuest, removeSideQuest } = useGame.getState();
  const [text, setText] = useState("");
  const [all, setAll] = useState(false);
  const idx = Math.floor(new Date(`${date}T12:00:00`).getTime() / 86400000);
  const base = defs.filter((d) => !d.custom);
  const custom = defs.filter((d) => d.custom);
  const todays = base.length ? [0, 1, 2].map((i) => base[(idx * 3 + i) % base.length]).filter((v, i, a) => a.indexOf(v) === i) : [];
  const list = all ? defs : [...todays, ...custom.filter((c) => !todays.includes(c))];
  const counted = done.filter((id) => defs.some((d) => d.id === id)).slice(0, RULES.sideQuestDailyCap);
  return (
    <div className="space-y-3">
      <p className="text-sm text-mist">Optional detours for fun and balance. Tiny XP, capped at {RULES.sideQuestDailyCap} a day — they&apos;re an invitation, never a duty. <span className="text-fog">({counted.length}/{RULES.sideQuestDailyCap} counted today)</span></p>
      <ul className="space-y-2">
        {list.map((q) => {
          const on = done.includes(q.id);
          const counts = counted.includes(q.id);
          return (
            <li key={q.id} className="flex items-center gap-3 panel !p-3">
              <button onClick={() => { sfx("tap"); toggleSide(date, q.id); }} className={`w-8 h-8 rounded-lg grid place-items-center ring-2 transition shrink-0 ${on ? "bg-jade-500/25 ring-jade-500 text-jade-400" : "ring-white/15 hover:ring-gold-400"}`} aria-pressed={on} aria-label={`${on ? "Unmark" : "Mark"} ${q.title}`}>{on && <Icon name="check" size={16} strokeWidth={3} />}</button>
              <span className="flex-1 text-sm min-w-0">{q.title}</span>
              <span className={`text-xs font-display tabular ${on && counts ? "text-gold-300" : "text-fog"}`}>+{q.xp}</span>
              {q.custom && <button className="btn btn-icon btn-sm !min-h-8 !min-w-8" onClick={() => removeSideQuest(q.id)} aria-label="Delete side quest"><Icon name="trash" size={13} /></button>}
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Invent your own side quest…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { addSideQuest(text); setText(""); } }} maxLength={100} />
        <button className="btn btn-gold" disabled={!text.trim()} onClick={() => { addSideQuest(text); setText(""); }}>Add</button>
      </div>
      <button className="text-xs text-mist hover:text-parchment" onClick={() => setAll(!all)}>{all ? "Show today's suggestions" : `Browse all ${defs.length} side quests`}</button>
    </div>
  );
}

export default function QuestsPage() {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const [date, setDate] = useState<ISODate>(today);
  const [tab, setTab] = useState<"daily" | "weekly" | "monthly" | "side">("daily");
  const ev = dayEvalFor(state, d, date);
  const cfg = configFor(state.configHistory, date);
  const jd = journeyDay(state.settings.startDate, date);
  const ws = weekStart(today);
  const week = weekInfoFor(state, d, ws);
  const ym = monthKey(today);
  const month = monthInfoFor(state, d, ym);
  const dayXp = useMemo(() => d.awards.filter((a) => a.date === date).reduce((s, a) => s + a.xp, 0), [d.awards, date]);
  const need = cfg.targets.streakQuests;
  const daysLeft = Math.max(0, Math.min(365, diffDays(today, journeyEnd(state.settings.startDate)) + (diffDays(today, state.settings.startDate) > 0 ? 0 : 1)));

  return (
    <div className="space-y-4">
      <PageHeader icon="scroll" title={jd >= 1 && jd <= 365 ? `The Daily Adventure — Day ${String(jd).padStart(2, "0")}` : "The Daily Adventure"} subtitle="Six quests. Minimums count. Partial progress counts. Tap a quest to log." />
      <div className="flex justify-center"><Segmented value={tab} onChange={setTab} options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }, { value: "side", label: "Side" }]} /></div>

      {tab === "daily" && (
        <>
          <DateStrip date={date} onChange={setDate} />
          <Panel className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-mist">{ev.kept ? <b className="text-jade-400">Day kept ✓</b> : <>Keep the day with <b className="text-parchment">{need}</b> quests</>}{ev.perfect && <b className="text-gold-300"> · Flawless!</b>}</span>
                <span className="tabular text-fog">{ev.questsDone}/6 quests</span>
              </div>
              <div className="flex gap-1">{SKILL_IDS.map((k, i) => { const ok = ["done", "exceeded"].includes(ev.quests[k].state); return <div key={k} className="h-2 flex-1 rounded-full relative" style={{ background: ok ? SKILLS[k].color : "rgba(255,255,255,.08)", boxShadow: ok ? `0 0 8px ${SKILLS[k].color}` : undefined }}>{i + 1 === need && <span className="absolute -right-[3px] -top-1 w-0.5 h-4 bg-gold-300/80 rounded" />}</div>; })}</div>
            </div>
            <div className="text-right shrink-0"><div className="font-display text-xl gold-text tabular">+{dayXp}</div><div className="text-[10px] text-fog tracking-widest">XP THIS DAY</div></div>
          </Panel>
          <div className="space-y-3">{SKILL_IDS.map((k) => <QuestCard key={`${k}-${date}`} skill={k} date={date} />)}</div>
          <Link href="/checkin/" className="btn btn-gold w-full"><Icon name="zap" size={16} />Quick check-in — one at a time</Link>
        </>
      )}

      {tab === "weekly" && (
        <div className="space-y-3">
          <SectionTitle icon="calendar" right={<span className="text-xs text-fog">{fmtShort(ws)} – {fmtShort(weekEnd(ws))}</span>}>Weekly quests</SectionTitle>
          {week.active ? <PeriodList quests={WEEKLY_QUESTS} stats={week.stats} target={(q) => q.target} done={week.weekly} /> : <Panel><Empty icon="calendar" title="Prologue week">Weekly quests begin with your first full week — Sunday {fmtShort(weekDates(ws).find((x) => x > today) ?? today)} and onward.</Empty></Panel>}
          <p className="text-xs text-fog px-1">Weeks run Sunday → Saturday. A new boss arrives every Sunday — <Link href="/battle/" className="text-gold-300 hover:underline">see this week&apos;s battle</Link>.</p>
        </div>
      )}

      {tab === "monthly" && (
        <div className="space-y-3">
          <SectionTitle icon="trophy" right={<span className="text-xs text-fog">{fmtMonth(ym)}</span>}>Monthly challenges</SectionTitle>
          {month.active ? <PeriodList quests={MONTHLY_QUESTS} stats={month.stats} target={(q) => scaledTarget(q.target, month.activeDays, month.totalDays)} done={month.done} /> : <Panel><Empty icon="trophy" title="Not part of the journey">This month is too far from your journey window to host challenges.</Empty></Panel>}
          {month.active && month.activeDays < month.totalDays && <p className="text-xs text-fog px-1">Targets are scaled to the {month.activeDays} journey days in {fmtMonth(ym)} — a fair share of a full month.</p>}
          <p className="text-xs text-fog px-1">{daysLeft} day{daysLeft === 1 ? "" : "s"} left in the journey.</p>
        </div>
      )}

      {tab === "side" && <SideQuests date={date} />}
    </div>
  );
}
