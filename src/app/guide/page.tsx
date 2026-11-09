"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { Fold, PageHeader, Panel, cx } from "@/components/ui";
import { configFor } from "@/lib/config";
import { SKILLS } from "@/lib/content/skills";
import { fmtHours, fmtMinutes, fmtNum } from "@/lib/format";
import { goalTiers } from "@/lib/goals";
import { RANKS, xpForLevel } from "@/lib/progression";
import { useGame } from "@/lib/store";
import { SKILL_IDS } from "@/lib/types";

const P = ({ children }: { children: ReactNode }) => <p className="text-sm text-mist leading-relaxed">{children}</p>;
const B = ({ children }: { children: ReactNode }) => <b className="text-parchment">{children}</b>;
const Li = ({ icon = "sparkles", children }: { icon?: string; children: ReactNode }) => (
  <li className="flex gap-3 text-sm text-mist leading-relaxed"><Icon name={icon} size={15} className="text-gold-400 mt-1 shrink-0" /><span>{children}</span></li>
);

const SECTIONS: [string, string, string][] = [
  ["mission", "target", "Daily mission"], ["goals", "zap", "XP goals"], ["bonus", "sparkles", "Credit & bonuses"], ["streak", "flame", "Streaks"],
  ["levels", "crown", "Levels"], ["week", "swords", "Weekly & monthly"], ["trophies", "trophy", "Trophies & map"], ["gold", "coins", "Gold & shop"],
  ["limits", "shield", "Healthy limits"], ["week1", "calendar", "First 7 days"], ["faq", "info", "FAQ"],
];

export default function Guide() {
  const state = useGame((s) => s.state);
  const today = useGame((s) => s.today);
  const d = useGame((s) => s.derived);
  const cfg = configFor(state.configHistory, today);
  const T = cfg.targets, X = cfg.xp;
  const tiers = goalTiers(cfg);
  const [open, setOpen] = useState<Set<string>>(new Set(["mission", "goals"]));
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const jump = useCallback((id: string) => {
    setOpen((o) => new Set(o).add(id));
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, []);
  useEffect(() => { const h = location.hash.replace("#", ""); if (h) jump(h); }, [jump]);

  const rows: [string, string, string, number, string][] = [
    ["sleep", `Sleep ${fmtHours(T.sleepMin)}–${fmtHours(T.sleepMax)}`, `${fmtHours(T.sleepMin)}+ slept (log last night)`, X.sleep, "+5 steady bedtime · +10 recovery night"],
    ["reading", `Read ${T.readMin} pages`, `${T.readMin} pages`, X.reading, `+${Math.round(X.reading / 2)} at ${T.readGoal}+ pages`],
    ["learning", `Learn ${T.learnMin} focused min`, `${T.learnMin} focused minutes`, X.learning, `+${Math.round(X.learning / 2)} at ${T.learnGoal}+ min · +5 for a written note`],
    ["health", `Move ${T.moveMin} min`, `${T.moveMin} minutes of movement`, X.health, `+5 meditate ${T.meditateMin}+ min · +5 ate well`],
    ["screen", `Under ${fmtMinutes(T.screenLimit)} screens`, `under ${fmtMinutes(T.screenLimit)} recreational`, X.screen, `+${Math.round(X.screen / 2)} under ${fmtMinutes(T.screenGoal)}`],
    ["work", `${T.workTasks} meaningful tasks`, `${T.workTasks} tasks finished`, X.work, "+5 high-priority task · +5 recorded win"],
  ];

  return (
    <div className="space-y-4">
      <PageHeader icon="bookopen" title="How to Play" subtitle="The whole game, in plain words. Numbers here are live — they follow your settings." />

      <Panel gold className="space-y-3.5">
        <div className="font-display text-lg gold-text">The game in 30 seconds</div>
        <ol className="space-y-3">
          {[
            ["1", "Live your day.", "Read a little, learn something real, move, sleep well, keep scrolling in check, finish your work tasks."],
            ["2", "Log it — takes 30 seconds.", "Tap Quick check-in on the Hero screen. Log what's true, skip what isn't."],
            ["3", "Watch your character grow.", "Logging earns XP → levels, ranks, trophies, weekly boss fights, gold for treats."],
          ].map(([n, t, b]) => (
            <li key={n} className="flex gap-3.5"><span className="w-8 h-8 rounded-full grid place-items-center shrink-0 font-display text-[#12100a]" style={{ background: "linear-gradient(180deg, var(--color-gold-200), var(--color-gold-500))" }}>{n}</span><span className="text-sm text-mist leading-relaxed"><B>{t}</B> {b}</span></li>
          ))}
        </ol>
        <p className="text-sm text-parchment leading-relaxed rounded-xl bg-black/25 ring-1 ring-white/8 p-3.5"><b className="gold-text">Your only job:</b> keep the day — any <B>{T.streakQuests} of 6</B> quests (about <B>{tiers[0].xp} XP</B>) — on most days. Minimums are small on purpose. Consistency beats intensity, every time.</p>
      </Panel>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1" aria-label="Jump to a section">
        {SECTIONS.map(([id, , label]) => <button key={id} className="chip shrink-0" onClick={() => jump(id)}>{label}</button>)}
      </div>

      <Fold id="mission" icon="target" title="Your daily mission" summary="Six quests · minimums count" open={open.has("mission")} onToggle={() => toggle("mission")}>
        <P>Every day has six quests, one per attribute. Reach the <B>minimum</B> and the quest is done and pays full XP.</P>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-fog"><th className="py-2 pr-3 font-semibold">Quest</th><th className="py-2 pr-3 font-semibold">Minimum</th><th className="py-2 font-semibold text-right">XP</th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {rows.map(([k, , min, xp, bonus]) => { const m = SKILLS[k as keyof typeof SKILLS]; return (
              <tr key={k} className="align-top">
                <td className="py-2.5 pr-3"><div className="flex items-center gap-2 font-semibold" style={{ color: m.color }}><Icon name={m.icon} size={15} />{m.quest}</div><div className="text-[11px] text-fog mt-0.5">{m.attribute}</div></td>
                <td className="py-2.5 pr-3 text-mist"><div>{min}</div><div className="text-[11px] text-fog mt-0.5">{bonus}</div></td>
                <td className="py-2.5 text-right font-display tabular text-gold-300">{xp}</td>
              </tr>); })}
          </tbody>
        </table></div>
        <p className="text-[11px] text-fog mt-3">Adjust any of these in Settings → Quest rules (applies from today forward; history is never re-scored). You can't claim a quest — the numbers you log decide.</p>
      </Fold>

      <Fold id="goals" icon="zap" tone="gold" title="How much XP per day?" summary={`Keep ${tiers[0].xp} · ${tiers.length === 3 ? `Strong ${tiers[1].xp} · ` : ""}Flawless ${tiers[tiers.length - 1].xp}`} open={open.has("goals")} onToggle={() => toggle("goals")}>
        <P>Instead of one scary number, there are <B>three daily goals</B>. Your bar on the Hero screen fills toward them.</P>
        <ul className="mt-3 space-y-2.5">
          {tiers.map((t) => (
            <li key={t.id} className="rounded-xl bg-black/25 ring-1 ring-white/8 p-3.5 flex items-center gap-3.5">
              <div className="text-center shrink-0 w-16"><div className="font-display text-xl gold-text tabular leading-none">{t.xp}</div><div className="text-[10px] text-fog">XP</div></div>
              <div className="min-w-0"><div className="font-display text-[15px]">{t.name} <span className="text-fog text-xs font-sans">· {t.quests} quests</span></div><div className="text-xs text-mist">{t.blurb}</div></div>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2">
          <P><B>A realistic good day is 100–130 XP</B> once bonuses are included. A rough day where you only do the minimums is still a win at {tiers[0].xp}.</P>
          <P>This daily total counts quests, their bonuses, the flawless/comeback bonuses, reflections and side quests. Trophies, boss wins and weekly/monthly rewards are extra on top.</P>
        </div>
      </Fold>

      <Fold id="bonus" icon="sparkles" title="Partial credit & bonuses" summary="Hard days still count" open={open.has("bonus")} onToggle={() => toggle("bonus")}>
        <ul className="space-y-2.5">
          <Li><B>Half a minimum = 40% of the XP.</B> Example: 3 of {T.workTasks} tasks pays {Math.round(X.work * 0.4)} XP. It doesn&apos;t count toward &quot;keeping the day&quot;, but it&apos;s never zero.</Li>
          <Li><B>Bonuses come after the minimum.</B> Hit the quest first, then stretch for the extra (see the table above).</Li>
          <Li><B>Flawless Day:</B> all six quests done → +{X.flawless} XP.</Li>
          <Li><B>Evening reflection:</B> answer two prompts → +{X.reflection} XP.</Li>
          <Li><B>Side quests:</B> small optional detours, +8 XP each, up to 3 a day.</Li>
          <Li><B>Learning quests:</B> a goal you set yourself (&quot;deploy a cluster&quot;). Finish it by writing what you built → +40 XP.</Li>
        </ul>
      </Fold>

      <Fold id="streak" icon="flame" title="Streaks, the Rest Shield & comebacks" summary="Missing a day doesn't break you" open={open.has("streak")} onToggle={() => toggle("streak")}>
        <ul className="space-y-2.5">
          <Li icon="check"><B>A day is &quot;kept&quot;</B> when you complete {T.streakQuests}+ quests. Your streak counts consecutive kept days.</Li>
          <Li icon="shield"><B>Rest Shield:</B> one missed day in any 7 never breaks the streak. Two misses in a week do.</Li>
          <Li icon="sunrise"><B>Comeback bonus:</B> return after 2+ days away and keep a day → +{X.comeback} XP and &quot;The Hero Returns&quot;. No shame, no catch-up.</Li>
          <Li icon="flame"><B>Milestones:</B> 3 · 7 · 14 · 30 · 60 · 100 days each have a trophy. The Hero screen always shows the next one.</Li>
          <Li icon="clock"><B>The day resets at your local midnight.</B> Forgot to log yesterday? Quests → tap yesterday in the date strip and log it.</Li>
        </ul>
      </Fold>

      <Fold id="levels" icon="crown" title="Levels & ranks" summary="Early levels fast, late levels earned" open={open.has("levels")} onToggle={() => toggle("levels")}>
        <P>XP fills your level bar. Each level needs more than the last — early ones fall in days, later ones take sustained effort. Spending gold never lowers your level.</P>
        <div className="mt-3 divide-y divide-white/5">
          {RANKS.map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-2.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold" style={{ color: r.color }}>{r.name}</div><div className="text-[11px] text-fog truncate">{r.blurb}</div></div>
              <div className="text-right text-xs tabular text-mist shrink-0">Lv {r.minLevel}<div className="text-fog">{fmtNum(xpForLevel(r.minLevel))} XP</div></div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-fog mt-3">You&apos;re Level {d.level.level} with {fmtNum(d.totalXp)} XP. Legend (Level 60) is designed for a near-perfect year.</p>
      </Fold>

      <Fold id="week" icon="swords" title="Weekly boss, weekly quests & monthly challenges" summary="Bigger goals, fair rules" open={open.has("week")} onToggle={() => toggle("week")}>
        <ul className="space-y-2.5">
          <Li icon="swords"><B>Boss battle:</B> every <B>Sunday</B> a new boss arrives (weeks run Sun–Sat). It has 3 objectives like &quot;read on 5 days&quot;. They are <B>counts, not streaks</B> — a rough day can&apos;t sink your week. Win all three → +150 XP. Miss by one → a &quot;Valiant&quot; +40 XP.</Li>
          <Li icon="scroll"><B>Weekly quests:</B> six goals, +30–40 XP each (e.g. read on 5 days, 3 workouts).</Li>
          <Li icon="trophy"><B>Monthly challenges:</B> +100–120 XP each. The partial first and last months have scaled-down targets so they&apos;re fair.</Li>
          <Li icon="target"><B>Weekly goal:</B> keep {5} days. It&apos;s a guide, not a requirement — the Hero screen tracks it.</Li>
        </ul>
      </Fold>

      <Fold id="trophies" icon="trophy" title="Trophies & the world map" summary="81 trophies · 7 regions" open={open.has("trophies")} onToggle={() => toggle("trophies")}>
        <ul className="space-y-2.5">
          <Li><B>Trophies</B> unlock automatically when you hit their goal and pay XP by rarity (Common 25 → Legendary 500). Locked ones show a silhouette and a hint. <B>5 are secret</B> — you only get a riddle.</Li>
          <Li><B>Within reach</B> on the Hero screen shows the trophies you&apos;re closest to.</Li>
          <Li icon="map"><B>The World map</B> has 7 regions. Reach their level to enter; finish their 4 milestones to clear them for bonus XP.</Li>
        </ul>
      </Fold>

      <Fold id="gold" icon="coins" title="Gold & the reward shop" summary="Optional treats — rest is always free" open={open.has("gold")} onToggle={() => toggle("gold")}>
        <ul className="space-y-2.5">
          <Li><B>1 XP earned = 1 gold.</B> Spend it in the Shop on treats you define yourself (an anime episode, a game hour, a book).</Li>
          <Li icon="sofa"><B>You never have to earn rest.</B> Sleeping in, a lazy evening, time with friends — all free. The shop is just for a little extra ceremony.</Li>
          <Li icon="undo">Claimed by accident? Tap Undo in the Shop history and the gold comes back.</Li>
        </ul>
      </Fold>

      <Fold id="limits" icon="shield" title="Healthy limits" summary="What deliberately doesn't earn XP" open={open.has("limits")} onToggle={() => toggle("limits")}>
        <ul className="space-y-2.5">
          <Li>Sleeping more than {fmtHours(T.sleepMax)} earns nothing — rest is welcome, oversleeping isn&apos;t rewarded.</Li>
          <Li>Exercise counts up to 90 minutes a day. More isn&apos;t better. No weight or calorie tracking, ever.</Li>
          <Li>Learning counts up to 180 focused minutes a day, and passive study (just watching) counts <B>half</B>. Practice and building count fully.</Li>
          <Li>Hours worked are never tracked — only finished, meaningful tasks.</Li>
          <Li>The screen limit can be tightened but never loosened past 4 hours. Work and study screen time never counts against you.</Li>
        </ul>
      </Fold>

      <Fold id="week1" icon="calendar" title="Your first 7 days" summary="Start tiny, build the habit" open={open.has("week1")} onToggle={() => toggle("week1")}>
        <ol className="space-y-3">
          {[
            ["Days 1–2", `Only the Core Three: ${T.readMin} pages, ${T.learnMin} minutes of practice, ${T.moveMin} minutes moving. That's a kept day.`],
            ["Day 3", "Add sleep: log last night when you wake up."],
            ["Days 4–5", "Add screen time at the end of the day. Be honest — only you benefit."],
            ["Day 6", "Add your work tasks. Write the real ones, then finish them."],
            ["Day 7 (Sat)", "Do the weekly reflection and export a backup. A new boss arrives tomorrow."],
          ].map(([t, b]) => <li key={t} className="flex gap-3"><span className="text-xs font-semibold text-gold-300 w-20 shrink-0 pt-0.5">{t}</span><span className="text-sm text-mist leading-relaxed">{b}</span></li>)}
        </ol>
        <p className="text-sm text-parchment leading-relaxed mt-4 rounded-xl bg-black/25 ring-1 ring-white/8 p-3.5"><b className="gold-text">Hard day?</b> Do the smallest version of one thing, log it, and close the app. That still counts. The goal is to need this app less, not more.</p>
      </Fold>

      <Fold id="faq" icon="info" title="Questions" summary="Forgot, mistakes, lost XP" open={open.has("faq")} onToggle={() => toggle("faq")}>
        <dl className="space-y-3.5 text-sm">
          {[
            ["I forgot to log yesterday.", "Quests → in the date strip, tap yesterday and log it. Recovery is always welcome."],
            ["I logged something wrong.", "Open that quest and tap the bin next to the entry. Its XP is removed and recalculated automatically."],
            ["Can I lose XP?", "Only by deleting an entry or undoing something. Missing a day never subtracts XP."],
            ["My level went down after an edit.", "Levels are calculated from your entries. Remove XP-earning entries and the level follows. That's what keeps the game honest."],
            ["Phone and laptop show different progress.", "Data is stored per device. Export on one, then Import → Merge on the other (Settings → Backup)."],
            ["When should I press Start fresh?", "On Nov 14, Day 1, to clear practice data. Your settings, look and shop stay."],
          ].map(([q, a]) => <div key={q}><dt className="font-semibold text-parchment">{q}</dt><dd className="text-mist mt-0.5 leading-relaxed">{a}</dd></div>)}
        </dl>
      </Fold>

      <div className="flex gap-2 flex-wrap pb-2">
        <Link href="/checkin/" className="btn btn-gold"><Icon name="zap" size={16} />Start today&apos;s check-in</Link>
        <Link href="/" className={cx("btn")}>Back to Hero</Link>
      </div>
    </div>
  );
}
