"use client";

import Link from "next/link";
import { useState } from "react";
import { GoalsCard } from "@/components/GoalsCard";
import { HeroCard } from "@/components/HeroCard";
import { Icon } from "@/components/Icon";
import { QuestCard } from "@/components/quest/QuestCard";
import { Bar, Confirm, Panel, Ring, SectionTitle } from "@/components/ui";
import { SKILLS } from "@/lib/content/skills";
import { diffDays, fmtFull, fmtLong, weekStart } from "@/lib/dates";
import { dayEvalFor, hasReflection as reflectionDone, weekInfoFor } from "@/lib/engine";
import { dueNow, targetPath } from "@/lib/reminders";
import { useNow } from "@/lib/useNow";
import { useGame } from "@/lib/store";
import { SKILL_IDS, type SkillId } from "@/lib/types";

const ORDER: Record<"morning" | "day" | "evening", SkillId[]> = {
  morning: ["sleep", "reading", "health", "learning", "work", "screen"],
  day: ["learning", "work", "health", "reading", "screen", "sleep"],
  evening: ["screen", "reading", "health", "learning", "work", "sleep"],
};

export default function Home() {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const ev = dayEvalFor(state, d, today);
  const [askFresh, setAskFresh] = useState(false);
  const now = useNow();
  const hour = now.getHours();
  const due = dueNow(state.reminders, now, (t) =>
    t === "reflect" ? reflectionDone(state.days[today]?.reflection)
    : t === "checkin" ? ev.quests.sleep.logged || ev.questsDone > 0
    : ["done", "exceeded"].includes(ev.quests[t].state));
  const part = hour < 12 ? "morning" : hour < 18 ? "day" : "evening";
  const greeting = hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const until = diffDays(today, state.settings.startDate);
  const unfinished = ORDER[part].filter((k) => !["done", "exceeded"].includes(ev.quests[k].state));
  // "almost there" first: highest progress, then time-of-day preference
  const next = [...unfinished].sort((a, b) => ev.quests[b].pct - ev.quests[a].pct)[0];
  const ws = weekStart(today);
  const week = weekInfoFor(state, d, ws);
  const boss = week.boss;
  const bossPct = boss ? boss.objectives.reduce((s, o) => s + Math.min(1, o.value(week.stats) / o.target), 0) / boss.objectives.length : 0;
  const gap = d.streak.lastKept ? diffDays(d.streak.lastKept, today) : 0;
  const todayXp = d.xpByDate[today] ?? 0;
  const hasReflection = !!state.days[today]?.reflection;
  const daysSinceExport = state.lastExportAt ? Math.floor((Date.now() - state.lastExportAt) / 86400000) : null;
  const logged = Object.keys(state.days).length;

  return (
    <div className="space-y-5">
      <div className="animate-rise">
        <p className="text-sm text-mist">{fmtFull(today)}</p>
        <h1 className="font-display text-xl sm:text-2xl">{greeting}{state.settings.heroName ? `, ${state.settings.heroName}` : ""}.</h1>
      </div>

      {until > 0 && (
        <Panel className="border-azure-500/30 space-y-3">
          <div className="flex gap-3 items-start">
            <Icon name="map" size={20} className="text-azure-400 mt-0.5 shrink-0" />
            <div className="text-sm text-mist">
              <b className="text-parchment">The journey begins in {until} day{until === 1 ? "" : "s"}</b> — {fmtFull(state.settings.startDate)}. Practise freely now; when Day 1 arrives, clear the practice data for a clean slate.
            </div>
          </div>
          <button className="btn btn-sm w-full" onClick={() => setAskFresh(true)}><Icon name="reset" size={14} />Start fresh (clear practice data)</button>
        </Panel>
      )}
      <Confirm open={askFresh} danger title="Start fresh?" body="All logged days, tasks, books, reflections and claimed rewards will be cleared. Your settings, look and shop stay. You can export a backup first from Settings." confirmLabel="Start fresh" onConfirm={() => useGame.getState().resetProgress()} onClose={() => setAskFresh(false)} />

      {due && (
        <Link href={targetPath(due.target)} className="block animate-rise">
          <Panel gold className="flex items-center gap-3.5">
            <span className="w-11 h-11 rounded-xl grid place-items-center shrink-0 animate-pulse" style={{ background: "color-mix(in srgb, var(--color-gold-400) 16%, transparent)", color: "var(--color-gold-400)" }}><Icon name="bell" size={20} /></span>
            <div className="min-w-0 flex-1"><div className="text-[11px] uppercase tracking-widest text-gold-400 font-semibold">Due now · {due.time}</div><div className="text-sm text-parchment leading-snug">{due.label}</div></div>
            <span className="btn btn-gold btn-sm shrink-0">Do it</span>
          </Panel>
        </Link>
      )}

      {d.stats.questsDone < 12 && (
        <Link href="/guide/" className="block">
          <Panel className="flex items-center gap-3 border-azure-500/30">
            <Icon name="bookopen" size={20} className="text-azure-400 shrink-0" />
            <div className="flex-1 text-sm"><b>New here? Read how to play</b> <span className="text-mist">— 2 minutes, every rule in plain words.</span></div>
            <Icon name="right" size={16} className="text-fog" />
          </Panel>
        </Link>
      )}

      <HeroCard />

      <GoalsCard />

      {gap >= 2 && !ev.kept && (
        <Panel className="border-jade-500/30 flex gap-3 items-start">
          <Icon name="sunrise" size={20} className="text-jade-400 mt-0.5 shrink-0" />
          <div className="text-sm text-mist"><b className="text-parchment">Welcome back.</b> No guilt, no catch-up. Keep just {state.configHistory.at(-1)?.targets.streakQuests ?? 3} quests today for <span className="text-gold-300">The Hero Returns +15 XP</span>.</div>
        </Panel>
      )}

      {/* Next action */}
      <section>
        <SectionTitle icon="target" right={<Link href="/checkin/" className="btn btn-sm btn-gold"><Icon name="zap" size={14} />Quick check-in</Link>}>Your next move</SectionTitle>
        {next ? (
          <div className="space-y-2">
            <p className="text-sm text-mist px-1">
              {ev.questsDone === 0 ? "Start small — one quest is enough to begin." : `${ev.questsDone} of 6 done today. Next up:`} <span className="text-fog">({unfinished.length} left, minimums only)</span>
            </p>
            <QuestCard key={next} skill={next} date={today} defaultOpen />
          </div>
        ) : (
          <Panel gold className="text-center py-6">
            <Icon name="sparkles" size={28} className="text-gold-300 mx-auto mb-2" />
            <div className="font-display text-xl gold-text">All six quests complete</div>
            <p className="text-sm text-mist mt-1 max-w-md mx-auto">That&apos;s the whole day. Close the app and go live it — {todayXp} XP earned today.</p>
            {!hasReflection && <Link href="/reflect/" className="btn btn-gold mt-4"><Icon name="feather" size={16} />One-minute reflection</Link>}
          </Panel>
        )}
      </section>

      {/* Today at a glance */}
      <section>
        <SectionTitle icon="scroll" right={<Link href="/quests/" className="text-xs text-gold-300 hover:underline">Full board →</Link>}>Today&apos;s quests</SectionTitle>
        <Panel className="!p-2 divide-y divide-white/5">
          {SKILL_IDS.map((k) => {
            const q = ev.quests[k], m = SKILLS[k];
            const done = q.state === "done" || q.state === "exceeded";
            return (
              <Link key={k} href="/quests/" className="flex items-center gap-3 px-2 py-2.5 hover:bg-white/5 rounded-xl transition">
                <Ring pct={q.pct} size={34} stroke={3.5} color={m.color}>{done ? <Icon name="check" size={14} style={{ color: m.color }} strokeWidth={3} /> : <Icon name={m.icon} size={13} style={{ color: m.color }} />}</Ring>
                <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{m.quest}</div><div className="text-xs text-fog truncate">{q.summary}</div></div>
                <div className={`text-sm font-display tabular ${q.total ? "text-gold-300" : "text-fog"}`}>{q.total ? `+${q.total}` : "—"}</div>
              </Link>
            );
          })}
        </Panel>
        <p className="text-xs text-fog mt-2 px-1 flex items-center gap-1.5"><Icon name="shield" size={12} />
          {d.streak.shieldReady ? "Rest shield ready — one missed day this week won't break your streak." : `Rest shield recharges ${d.streak.shieldReadyOn ? fmtLong(d.streak.shieldReadyOn) : "soon"}.`}
        </p>
      </section>

      {/* Boss teaser */}
      {boss && week.active ? (
        <section>
          <SectionTitle icon="swords" right={<Link href="/battle/" className="text-xs text-gold-300 hover:underline">Battle →</Link>}>This week&apos;s boss</SectionTitle>
          <Link href="/battle/">
            <Panel glow={`${boss.color}55`} accent={boss.color} className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl grid place-items-center shrink-0 animate-float" style={{ background: `${boss.color}22`, color: boss.color, boxShadow: `0 0 24px ${boss.color}44` }}><Icon name={boss.icon} size={30} strokeWidth={1.5} /></div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-base truncate">{week.bossWon ? `${boss.name} — defeated` : boss.name}</div>
                <div className="text-xs text-mist mb-2 truncate">{boss.objectives.filter((o) => o.value(week.stats) >= o.target).length} / {boss.objectives.length} objectives · resets Sunday</div>
                <Bar pct={week.bossWon ? 1 : bossPct} color={boss.color} height={8} label="Boss damage" />
              </div>
            </Panel>
          </Link>
        </section>
      ) : null}

      {/* Skills */}
      <section>
        <SectionTitle icon="sparkles" right={<Link href="/skills/" className="text-xs text-gold-300 hover:underline">Skill trees →</Link>}>Attributes</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {SKILL_IDS.map((k) => {
            const m = SKILLS[k], s = d.skills[k];
            return (
              <Link key={k} href={`/skills/${k}/`}>
                <Panel className="!p-3.5 hover:ring-1 hover:ring-white/15 transition">
                  <div className="flex items-center gap-2.5 mb-2"><Icon name={m.icon} size={18} style={{ color: m.color }} /><span className="text-sm font-semibold">{m.attribute}</span><span className="ml-auto font-display text-sm tabular" style={{ color: m.color }}>Lv {s.level}</span></div>
                  <Bar pct={s.pct} color={m.color} height={5} label={`${m.attribute} level progress`} />
                </Panel>
              </Link>
            );
          })}
        </div>
      </section>

      {(part === "evening" && !hasReflection) && (
        <Link href="/reflect/"><Panel className="flex items-center gap-3 border-arcane-500/30"><Icon name="feather" size={20} className="text-arcane-400" /><div className="flex-1 text-sm"><b>Evening reflection</b> <span className="text-mist">— 60 seconds, +10 XP</span></div><Icon name="right" size={16} className="text-fog" /></Panel></Link>
      )}
      {logged >= 7 && (daysSinceExport == null || daysSinceExport >= 14) && (
        <Link href="/settings/#backup"><Panel className="flex items-center gap-3 border-gold-500/25"><Icon name="download" size={20} className="text-gold-400" /><div className="flex-1 text-sm"><b>Back up your progress</b> <span className="text-mist">— {daysSinceExport == null ? "you haven't exported yet" : `last export ${daysSinceExport} days ago`}. Your data lives in this browser.</span></div><Icon name="right" size={16} className="text-fog" /></Panel></Link>
      )}
      <p className="text-center text-xs text-fog pb-2">The goal isn&apos;t to use this app more. It&apos;s to need it less.</p>
    </div>
  );
}
