"use client";

import Link from "next/link";
import { configFor } from "@/lib/config";
import { SKILLS } from "@/lib/content/skills";
import { DAY_LETTERS, addDays, dow, fmtShort, parseISO, weekDates, weekStart, type ISODate } from "@/lib/dates";
import { dayEvalFor, weekInfoFor } from "@/lib/engine";
import { WEEKLY_KEEP_GOAL, bestDay, dailyXp, goalProgress, goalTiers, nextStreakMilestone, withinReach, yesterdayOf } from "@/lib/goals";
import { useGame } from "@/lib/store";
import { SKILL_IDS } from "@/lib/types";
import { Icon } from "./Icon";
import { Bar, Panel, SectionTitle, cx } from "./ui";

/** Today's XP against three clear targets: Keep the day → Strong day → Flawless. */
export function DailyGoalBar({ date }: { date: ISODate }) {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const cfg = configFor(state.configHistory, date);
  const tiers = goalTiers(cfg);
  const xp = dailyXp(d, date);
  const p = goalProgress(xp, tiers);
  const ev = dayEvalFor(state, d, date);
  const quick = SKILL_IDS.filter((k) => !["done", "exceeded"].includes(ev.quests[k].state))
    .sort((a, b) => ev.quests[b].pct - ev.quests[a].pct || cfg.xp[a] - cfg.xp[b])[0];
  const yest = date === today ? dailyXp(d, yesterdayOf(today)) : 0;
  const best = bestDay(d);

  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-2">
        <div><div className="label">{date === today ? "Today's goal" : "That day's goal"}</div>
          <div className="font-display text-3xl gold-text tabular leading-none mt-1">{xp}<span className="text-base text-fog font-sans"> XP</span></div></div>
        <div className="text-right text-xs text-mist max-w-[60%]">
          {p.next ? <><b className="text-parchment tabular">{p.toNext} XP</b> to <b className="text-parchment">{p.next.name}</b>{quick && <span className="block text-fog">Quickest win: {SKILLS[quick].quest} (+{cfg.xp[quick]})</span>}</>
            : <b className="text-gold-300">Flawless day — nothing left to chase. Go live it.</b>}
        </div>
      </div>
      <Bar pct={p.pct} color="var(--color-gold-400)" height={12} glow label="Daily XP goal" />
      <div className={cx("grid gap-2 mt-3", tiers.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {tiers.map((t) => {
          const ok = xp >= t.xp;
          return (
            <div key={t.id} className={cx("rounded-xl px-2.5 py-2 ring-1 text-center transition", ok ? "bg-gold-400/15 ring-gold-500/50" : "bg-black/25 ring-white/8")} style={ok ? { background: "color-mix(in srgb, var(--color-gold-400) 14%, transparent)" } : undefined}>
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold" style={{ color: ok ? "var(--color-gold-300)" : undefined }}>{ok && <Icon name="check" size={12} strokeWidth={3} />}{t.name}</div>
              <div className="font-display tabular text-sm">{t.xp}<span className="text-[10px] text-fog font-sans"> XP</span></div>
              <div className="text-[10px] text-fog">{t.quests} quests</div>
            </div>
          );
        })}
      </div>
      {(yest > 0 || best) && (
        <p className="text-[11px] text-fog mt-2.5">
          {yest > 0 && <>Yesterday <b className="text-mist tabular">{yest}</b> XP{xp > yest ? " — you've beaten it" : ""}</>}
          {yest > 0 && best && " · "}
          {best && <>Best day <b className="text-mist tabular">{best.xp}</b> XP ({fmtShort(best.date)})</>}
        </p>
      )}
    </div>
  );
}

export function GoalsCard() {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const ws = weekStart(today);
  const week = weekInfoFor(state, d, ws);
  const dates = weekDates(ws);
  const keptSoFar = dates.filter((x) => d.days[x]?.kept).length;
  const daysLeft = dates.filter((x) => x >= today).length;
  const reach = withinReach(d, 3);
  const ms = nextStreakMilestone(d.streak.current);
  const lvl = d.level;

  return (
    <Panel gold className="space-y-5 animate-rise">
      <DailyGoalBar date={today} />

      <div className="divider" />
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="label">This week · keep {WEEKLY_KEEP_GOAL} days</div>
          <div className="text-xs tabular text-mist"><b className={keptSoFar >= WEEKLY_KEEP_GOAL ? "text-gold-300" : "text-parchment"}>{keptSoFar}</b>/{WEEKLY_KEEP_GOAL}{keptSoFar >= WEEKLY_KEEP_GOAL && " ✓"}</div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {dates.map((x) => {
            const e = d.days[x], kept = !!e?.kept, isToday = x === today, future = x > today, shield = d.streak.shielded.includes(x);
            return (
              <div key={x} className="text-center">
                <div className="text-[10px] text-fog mb-1">{DAY_LETTERS[dow(x)]}</div>
                <div className={cx("mx-auto w-8 h-8 rounded-full grid place-items-center ring-2 text-xs font-semibold tabular", kept ? "bg-jade-500/25 ring-jade-500 text-jade-400" : shield ? "ring-azure-500/60 text-azure-400" : future ? "ring-white/5 text-fog/50" : "ring-white/15 text-fog", isToday && !kept && "ring-[var(--color-gold-400)] text-parchment")}>
                  {kept ? <Icon name="check" size={14} strokeWidth={3} /> : shield ? <Icon name="shield" size={13} /> : parseISO(x).getDate()}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-fog mt-2">{keptSoFar >= WEEKLY_KEEP_GOAL ? "Weekly goal reached — everything else is a bonus." : `${Math.max(0, WEEKLY_KEEP_GOAL - keptSoFar)} more kept day${WEEKLY_KEEP_GOAL - keptSoFar === 1 ? "" : "s"} to hit the weekly goal · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left.`}
          {week.boss && week.active && <> <Link href="/battle/" className="text-gold-300 underline">Boss: {week.bossWon ? "defeated" : `${week.boss.objectives.filter((o) => o.value(week.stats) >= o.target).length}/${week.boss.objectives.length}`}</Link></>}</p>
      </div>

      <div className="divider" />
      <div>
        <SectionTitle icon="target" className="!mb-2.5">Within reach</SectionTitle>
        <ul className="space-y-2.5">
          <li className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0 bg-gold-400/12" style={{ background: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)", color: "var(--color-gold-400)" }}><Icon name="crown" size={15} /></span>
            <div className="min-w-0 flex-1"><div className="text-sm">Level {lvl.level + 1}</div><Bar pct={lvl.pct} color="var(--color-gold-400)" height={4} className="mt-1.5" /></div>
            <span className="text-[11px] tabular text-fog shrink-0">{(lvl.needed - lvl.into).toLocaleString()} XP</span>
          </li>
          {ms && (
            <li className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0 bg-orange-400/10 text-[#ff9f6b]"><Icon name="flame" size={15} /></span>
              <div className="min-w-0 flex-1"><div className="text-sm">{ms}-day streak</div><Bar pct={d.streak.current / ms} color="#ff9f6b" height={4} className="mt-1.5" /></div>
              <span className="text-[11px] tabular text-fog shrink-0">{d.streak.current}/{ms}</span>
            </li>
          )}
          {reach.map(({ ach, cur, pct }) => (
            <li key={ach.id} className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0 bg-white/5 text-mist"><Icon name={ach.icon} size={15} /></span>
              <div className="min-w-0 flex-1"><div className="text-sm truncate">{ach.title}</div><Bar pct={pct} color="var(--color-gold-500)" height={4} className="mt-1.5" /></div>
              <span className="text-[11px] tabular text-fog shrink-0">{Math.floor(cur)}/{ach.target}</span>
            </li>
          ))}
        </ul>
        <Link href="/achievements/" className="text-xs text-gold-300 hover:underline inline-block mt-3">All trophies →</Link>
      </div>
    </Panel>
  );
}
