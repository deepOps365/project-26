"use client";

import { useState } from "react";
import { RULES, configFor } from "@/lib/config";
import { ACTIVITIES, TOPICS, TOPIC_BY_ID, TOPIC_TIERS, topicTier, KIND_BY_ID } from "@/lib/content/skills";
import { DAY_LETTERS, addDays, dow, fmtLong, fmtShort, parseISO, weekDates, weekStart } from "@/lib/dates";
import { fmtHours, fmtMinutes, fmtNum } from "@/lib/format";
import { sfx } from "@/lib/sound";
import { useGame } from "@/lib/store";
import type { GameState, TopicId } from "@/lib/types";
import { BarChart } from "../charts";
import { Icon } from "../Icon";
import { WorkInput } from "../quest/Inputs";
import { Bar, Confirm, Empty, Panel, SectionTitle, Stat } from "../ui";

const lastDays = (today: string, n: number) => Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
const dayLabel = (d: string) => `${DAY_LETTERS[dow(d)]}${parseISO(d).getDate() === 1 ? "·1" : ""}`;
export const bookPages = (s: GameState, id: string) => Object.values(s.days).reduce((n, d) => n + d.reading.filter((r) => r.bookId === id).reduce((m, r) => m + r.pages, 0), 0);

export function SleepPanel() {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const days = lastDays(today, 14);
  const t = configFor(state.configHistory, today).targets;
  const logged = days.map((x) => state.days[x]?.sleep?.hours ?? null);
  const nums = logged.slice(-7).filter((x): x is number => x != null);
  const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  const rhythm = Object.values(d.days).filter((x) => x.metrics.rhythm).length;
  return (
    <Panel>
      <SectionTitle icon="moon">Last 14 nights</SectionTitle>
      <BarChart
        data={days.map((x, i) => ({ label: dayLabel(x), value: logged[i], color: logged[i] == null ? undefined : logged[i]! >= t.sleepMin && logged[i]! <= t.sleepMax ? "#3ddc97" : logged[i]! > t.sleepMax ? "#7c93ff" : "#ff9f6b", title: `${fmtLong(x)}: ${logged[i] == null ? "not logged" : fmtHours(logged[i]!)}` }))}
        max={11} band={{ from: t.sleepMin, to: t.sleepMax, color: "#3ddc97" }} format={(n) => fmtHours(n)} height={130}
      />
      <p className="text-[11px] text-fog mt-2">Green = healthy range ({fmtHours(t.sleepMin)}–{fmtHours(t.sleepMax)}). Oversleeping isn&apos;t rewarded; short nights get gentle partial credit from 6h.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
        <Stat label="7-night avg" value={avg == null ? "—" : fmtHours(avg)} color="#7c93ff" />
        <Stat label="Healthy nights" value={d.stats.sleepGoodDays} color="#3ddc97" />
        <Stat label="Best run" value={`${d.stats.bestSleepStreak}`} sub="nights in a row" color="var(--color-gold-400)" />
        <Stat label="Steady rhythm" value={rhythm} sub={`${d.stats.recoveries} recoveries`} color="#b592ff" />
      </div>
    </Panel>
  );
}

export function ReadingPanel() {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const { addBook, finishBook, reopenBook, deleteBook, updateBook } = useGame.getState();
  const [title, setTitle] = useState(""), [author, setAuthor] = useState(""), [pages, setPages] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [del, setDel] = useState<string | null>(null);
  const books = [...state.books].sort((a, b) => Number(!!a.finishedOn) - Number(!!b.finishedOn) || b.startedOn.localeCompare(a.startedOn));
  const submit = () => { if (title.trim()) { sfx("tap"); addBook({ title, author, totalPages: Number(pages) || undefined }); setTitle(""); setAuthor(""); setPages(""); } };
  const readDays = d.stats.readDays;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Stat label="Pages read" value={fmtNum(d.stats.pages)} color="#a978ff" />
        <Stat label="Reading days" value={readDays} color="#b592ff" />
        <Stat label="Avg / reading day" value={readDays ? Math.round(d.stats.pages / readDays) : "—"} sub="pages" color="#cdb4ff" />
        <Stat label="Books finished" value={d.stats.books} color="var(--color-gold-400)" />
      </div>
      <Panel>
        <SectionTitle icon="library">Bookshelf</SectionTitle>
        <div className="grid sm:grid-cols-[1fr_1fr_6rem_auto] gap-2 mb-4">
          <input className="input" placeholder="Book title" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} maxLength={120} aria-label="Book title" />
          <input className="input" placeholder="Author (optional)" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={80} aria-label="Author" />
          <input className="input" placeholder="Pages" inputMode="numeric" value={pages} onChange={(e) => setPages(e.target.value.replace(/\D/g, ""))} aria-label="Total pages" />
          <button className="btn btn-gold" onClick={submit} disabled={!title.trim()}><Icon name="plus" size={16} />Add</button>
        </div>
        {books.length === 0 ? <Empty icon="book" title="Your shelf is empty">Add the book you&apos;re reading, then attach pages to it when you log reading.</Empty> : (
          <ul className="space-y-3">
            {books.map((b) => {
              const read = bookPages(state, b.id);
              const pct = b.totalPages ? Math.min(1, read / b.totalPages) : 0;
              return (
                <li key={b.id} className="rounded-2xl bg-black/25 ring-1 ring-white/5 p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-14 rounded-md shrink-0 grid place-items-center" style={{ background: b.finishedOn ? "linear-gradient(160deg,#f6cb62,#7d5a1e)" : "linear-gradient(160deg,#7c4dff,#2a1a66)" }}><Icon name={b.finishedOn ? "check" : "bookopen"} size={18} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-[15px] truncate">{b.title}</div>
                      <div className="text-xs text-fog truncate">{b.author ? `${b.author} · ` : ""}{b.finishedOn ? `Finished ${fmtShort(b.finishedOn)}` : `Started ${fmtShort(b.startedOn)}`}</div>
                      <div className="text-xs text-mist mt-1 tabular">{read}{b.totalPages ? ` / ${b.totalPages}` : ""} pages</div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {b.finishedOn ? <button className="btn btn-sm" onClick={() => reopenBook(b.id)}>Reopen</button> : <button className="btn btn-sm btn-gold" onClick={() => { const e = finishBook(b.id, today); setErr({ ...err, [b.id]: e ?? "" }); }}>Finish</button>}
                      <button className="btn btn-icon btn-sm" onClick={() => setDel(b.id)} aria-label={`Delete ${b.title}`}><Icon name="trash" size={14} /></button>
                    </div>
                  </div>
                  {b.totalPages ? <Bar pct={b.finishedOn ? 1 : pct} color="#a978ff" height={5} className="mt-3" /> : !b.finishedOn && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-fog">Set total pages for a progress bar: <input className="input !w-24 !min-h-8 !py-1" inputMode="numeric" placeholder="pages" onBlur={(e) => { const n = Number(e.target.value); if (n > 0) updateBook(b.id, { totalPages: n }); }} aria-label="Total pages" /></div>
                  )}
                  {err[b.id] && <p className="text-xs text-blood-400 mt-2">{err[b.id]}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <Confirm open={!!del} danger title="Delete this book?" body="Logged pages stay counted — they just won't be attached to a book anymore." confirmLabel="Delete" onConfirm={() => del && deleteBook(del)} onClose={() => setDel(null)} />
    </div>
  );
}

export function LearningPanel() {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const { addLearnQuest, completeLearnQuest, reopenLearnQuest, deleteLearnQuest } = useGame.getState();
  const [title, setTitle] = useState(""), [topic, setTopic] = useState<TopicId>("python");
  const [openId, setOpenId] = useState<string | null>(null), [outcome, setOutcome] = useState(""), [err, setErr] = useState("");
  const active = state.learnQuests.filter((q) => !q.doneOn);
  const done = state.learnQuests.filter((q) => q.doneOn).sort((a, b) => b.doneOn!.localeCompare(a.doneOn!));
  const sessions = Object.entries(state.days).flatMap(([date, l]) => l.learning.map((x) => ({ ...x, date }))).sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts).slice(0, 8);
  const submit = () => { if (title.trim()) { sfx("tap"); addLearnQuest(title, topic); setTitle(""); } };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Stat label="Focused hours" value={(d.stats.learnEff / 60).toFixed(1)} color="#f0bc4e" />
        <Stat label="Coding sessions" value={d.stats.codingSessions} color="var(--color-gold-400)" />
        <Stat label="Topics at Apprentice+" value={`${d.stats.topicsTouched}/8`} color="#b592ff" />
        <Stat label="Quests completed" value={d.stats.learnQuestsDone} color="#3ddc97" />
      </div>
      <Panel>
        <SectionTitle icon="network">Topic branches</SectionTitle>
        <p className="text-xs text-fog mb-3 -mt-1">Practice, problems and builds count fully; passive study counts half. Tiers: {TOPIC_TIERS.map((t) => t.name).join(" → ")}.</p>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {TOPICS.map((t) => {
            const min = d.stats.topicEff[t.id] ?? 0, tier = topicTier(min);
            return (
              <div key={t.id} className="rounded-2xl bg-black/25 ring-1 ring-white/5 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl grid place-items-center bg-gold-400/10 text-gold-400"><Icon name={t.icon} size={18} /></div>
                  <div className="min-w-0 flex-1"><div className="text-sm font-semibold truncate">{t.name}</div><div className="text-[11px] text-fog truncate">{t.blurb}</div></div>
                  <div className="text-right"><div className="text-xs font-semibold text-gold-300">{tier.name}</div><div className="text-[10px] text-fog tabular">{fmtMinutes(min)}</div></div>
                </div>
                <Bar pct={tier.pct} color="#f0bc4e" height={5} className="mt-2.5" label={`${t.name} tier progress`} />
                {tier.next && <div className="text-[10px] text-fog mt-1 text-right tabular">{fmtMinutes(Math.max(0, tier.next.at - min))} to {tier.next.name}</div>}
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel>
        <SectionTitle icon="rocket">Learning quests</SectionTitle>
        <p className="text-xs text-fog mb-3 -mt-1">Set a concrete goal — &quot;deploy a 3-node cluster&quot;, &quot;solve 10 graph problems&quot;. Finishing one pays +40 XP, but you must write what you actually built or understood.</p>
        <div className="grid sm:grid-cols-[1fr_9rem_auto] gap-2 mb-4">
          <input className="input" placeholder="New learning quest…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} maxLength={120} aria-label="Learning quest title" />
          <select className="input" value={topic} onChange={(e) => setTopic(e.target.value as TopicId)} aria-label="Topic">{TOPICS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <button className="btn btn-gold" onClick={submit} disabled={!title.trim()}><Icon name="plus" size={16} />Add</button>
        </div>
        {active.length === 0 && done.length === 0 && <Empty icon="rocket" title="No learning quests yet">A goal you can finish beats a course you&apos;ll never complete.</Empty>}
        <ul className="space-y-2">
          {active.map((q) => (
            <li key={q.id} className="rounded-xl bg-black/25 ring-1 ring-white/5 p-3">
              <div className="flex items-center gap-3">
                <Icon name={TOPIC_BY_ID[q.topic]?.icon ?? "code"} size={18} className="text-gold-400 shrink-0" />
                <div className="min-w-0 flex-1"><div className="text-sm font-semibold truncate">{q.title}</div><div className="text-[11px] text-fog">{TOPIC_BY_ID[q.topic]?.name} · since {fmtShort(q.createdOn)}</div></div>
                <button className="btn btn-sm" onClick={() => { setOpenId(openId === q.id ? null : q.id); setOutcome(""); setErr(""); }}>Complete</button>
                <button className="btn btn-icon btn-sm" onClick={() => deleteLearnQuest(q.id)} aria-label="Delete quest"><Icon name="trash" size={14} /></button>
              </div>
              {openId === q.id && (
                <div className="mt-3 space-y-2">
                  <textarea className="input" placeholder="What did you build, solve or finally understand?" value={outcome} onChange={(e) => setOutcome(e.target.value)} maxLength={400} autoFocus />
                  {err && <p className="text-xs text-blood-400">{err}</p>}
                  <button className="btn btn-gold btn-sm" onClick={() => { const e = completeLearnQuest(q.id, today, outcome); if (e) setErr(e); else setOpenId(null); }}>Claim +40 XP</button>
                </div>
              )}
            </li>
          ))}
          {done.map((q) => (
            <li key={q.id} className="rounded-xl bg-jade-500/8 ring-1 ring-jade-500/20 p-3 flex items-start gap-3">
              <Icon name="check" size={18} className="text-jade-400 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold truncate">{q.title}</div><div className="text-xs text-mist">{q.outcome}</div><div className="text-[11px] text-fog mt-0.5">{TOPIC_BY_ID[q.topic]?.name} · {fmtShort(q.doneOn!)}</div></div>
              <button className="btn btn-icon btn-sm" onClick={() => reopenLearnQuest(q.id)} aria-label="Reopen quest" title="Reopen (removes the XP)"><Icon name="undo" size={14} /></button>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel>
        <SectionTitle icon="scroll">Recent sessions</SectionTitle>
        {sessions.length === 0 ? <Empty icon="terminal" title="No sessions logged yet">Log one from the Quests page — notes included.</Empty> : (
          <ul className="divide-y divide-white/5">
            {sessions.map((s) => (
              <li key={s.id} className="py-2.5 flex gap-3">
                <div className="text-[11px] text-fog w-14 shrink-0 pt-0.5">{fmtShort(s.date)}</div>
                <div className="min-w-0"><div className="text-sm">{TOPIC_BY_ID[s.topic]?.name} · {KIND_BY_ID[s.kind]?.name} · {fmtMinutes(s.minutes)}</div>{s.note && <div className="text-xs text-mist mt-0.5">{s.note}</div>}</div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

export function HealthPanel() {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const t = configFor(state.configHistory, today).targets;
  const days = lastDays(today, 14);
  const totals = Object.fromEntries(ACTIVITIES.map((a) => [a.id, 0])) as Record<string, number>;
  Object.values(state.days).forEach((l) => l.activity.forEach((a) => { totals[a.type] = (totals[a.type] ?? 0) + a.minutes; }));
  const max = Math.max(1, ...Object.values(totals));
  return (
    <div className="space-y-4">
      <Panel>
        <SectionTitle icon="heart">Movement · last 14 days</SectionTitle>
        <BarChart data={days.map((x) => ({ label: dayLabel(x), value: d.days[x]?.metrics.activeMin ?? 0, color: (d.days[x]?.metrics.activeMin ?? 0) >= t.moveMin ? "#3ddc97" : "#46c2f2", title: `${fmtLong(x)}: ${d.days[x]?.metrics.activeMin ?? 0} min` }))} ref={{ value: t.moveMin, label: `${t.moveMin} min`, color: "#3ddc97" }} max={Math.max(60, t.moveMin * 2)} height={120} format={(n) => `${Math.round(n)} min`} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
          <Stat label="Workouts" value={d.stats.workoutDays} sub="days ≥ minimum" color="#3ddc97" />
          <Stat label="Active hours" value={(d.stats.activeMin / 60).toFixed(1)} color="#46c2f2" />
          <Stat label="Meditation days" value={d.stats.meditateDays} color="#b592ff" />
          <Stat label="Ate-well days" value={d.stats.healthyDays} color="var(--color-gold-400)" />
        </div>
      </Panel>
      <Panel>
        <SectionTitle icon="dumbbell">Branches</SectionTitle>
        <div className="space-y-3">
          {ACTIVITIES.map((a) => (
            <div key={a.id}>
              <div className="flex items-center justify-between text-sm mb-1"><span className="flex items-center gap-2"><Icon name={a.icon} size={15} className="text-jade-400" />{a.name}</span><span className="text-xs text-mist tabular">{fmtMinutes(totals[a.id] ?? 0)}</span></div>
              <Bar pct={(totals[a.id] ?? 0) / max} color="#3ddc97" height={6} />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-fog mt-3">Capped at {RULES.activeCapMin} minutes of exercise per day for XP — more isn&apos;t better, and rest is part of training. This game never tracks weight or calories.</p>
      </Panel>
    </div>
  );
}

export function ScreenPanel() {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const t = configFor(state.configHistory, today).targets;
  const { updateConfig } = useGame.getState();
  const days = lastDays(today, 14);
  const vals = days.map((x) => state.days[x]?.screen ?? null);
  const nums = vals.filter((x): x is number => x != null);
  const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  return (
    <div className="space-y-4">
      <Panel>
        <SectionTitle icon="eye">Recreational screen time · last 14 days</SectionTitle>
        <BarChart data={days.map((x, i) => ({ label: dayLabel(x), value: vals[i], color: vals[i] == null ? undefined : vals[i]! <= t.screenLimit ? "#46c2f2" : "#ff9f6b", title: `${fmtLong(x)}: ${vals[i] == null ? "not logged" : fmtMinutes(vals[i]!)}` }))} ref={{ value: t.screenLimit, label: `limit ${fmtMinutes(t.screenLimit)}`, color: "#46c2f2" }} max={Math.max(360, t.screenLimit * 1.5)} height={130} format={(n) => fmtMinutes(n)} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
          <Stat label="Average" value={avg == null ? "—" : fmtMinutes(avg)} color="#46c2f2" />
          <Stat label="Days under limit" value={d.stats.screenOkDays} color="#3ddc97" />
          <Stat label="Best run" value={d.stats.bestScreenStreak} sub="days in a row" color="var(--color-gold-400)" />
          <Stat label="Deep-focus days" value={d.stats.screenGoalDays} sub={`≤ ${fmtMinutes(t.screenGoal)}`} color="#b592ff" />
        </div>
      </Panel>
      <Panel>
        <SectionTitle icon="target">Your limit</SectionTitle>
        <p className="text-sm text-mist mb-3">Currently <b className="text-parchment">{fmtMinutes(t.screenLimit)}</b> of recreational time. You can tighten it any time (applies from today). It can&apos;t be loosened past 4 hours — raising the bar is the point, not lowering it.</p>
        <div className="flex flex-wrap gap-2">{[60, 90, 120, 150, 180, 210, 240].map((m) => <button key={m} className="chip" data-on={t.screenLimit === m} onClick={() => updateConfig({ targets: { screenLimit: m, screenGoal: Math.min(t.screenGoal, m) } })}>{fmtMinutes(m)}</button>)}</div>
        <p className="text-[11px] text-fog mt-3">Work and study screen time never counts. Only log scrolling, feeds, videos and games.</p>
      </Panel>
    </div>
  );
}

export function WorkPanel() {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const t = configFor(state.configHistory, today).targets;
  const ws = weekStart(today);
  const days = weekDates(ws);
  const weekTotal = days.reduce((n, x) => n + (d.days[x]?.metrics.tasksDone ?? 0), 0);
  const wins = state.tasks.filter((x) => x.win && x.doneOn).sort((a, b) => b.doneOn!.localeCompare(a.doneOn!)).slice(0, 8);
  const activeDays = Object.values(d.days).filter((x) => x.metrics.tasksDone > 0).length;
  return (
    <div className="space-y-4">
      <Panel>
        <SectionTitle icon="briefcase" right={<span className="text-xs text-fog">{fmtShort(ws)} – {fmtShort(days[6])}</span>}>This week</SectionTitle>
        <BarChart data={days.map((x) => ({ label: DAY_LETTERS[dow(x)], value: x > today ? null : d.days[x]?.metrics.tasksDone ?? 0, color: (d.days[x]?.metrics.tasksDone ?? 0) >= t.workTasks ? "#ff7a59" : "var(--color-gold-500)", title: `${fmtLong(x)}: ${d.days[x]?.metrics.tasksDone ?? 0} tasks` }))} ref={{ value: t.workTasks, label: `${t.workTasks}`, color: "#ff7a59" }} max={Math.max(8, t.workTasks + 2)} height={110} format={(n) => `${Math.round(n)} tasks`} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
          <Stat label="This week" value={weekTotal} sub="tasks done" color="#ff7a59" />
          <Stat label="All time" value={fmtNum(d.stats.tasksDone)} color="var(--color-gold-400)" />
          <Stat label="High priority" value={d.stats.highTasksDone} sub="finished" color="#ef4a5f" />
          <Stat label="Avg / active day" value={activeDays ? (d.stats.tasksDone / activeDays).toFixed(1) : "—"} color="#46c2f2" />
        </div>
        <p className="text-[11px] text-fog mt-3">Hours worked are never tracked. Finishing five things that matter beats twelve hours of busyness.</p>
      </Panel>
      <Panel>
        <SectionTitle icon="check">Task board</SectionTitle>
        <WorkInput date={today} showAll />
      </Panel>
      <Panel>
        <SectionTitle icon="trophy">Accomplishments</SectionTitle>
        {wins.length === 0 ? <Empty icon="feather" title="Record your wins">Tap the pencil on a finished task to write what you accomplished (+5 XP).</Empty> : (
          <ul className="divide-y divide-white/5">{wins.map((w) => <li key={w.id} className="py-2.5"><div className="text-sm">★ {w.win}</div><div className="text-[11px] text-fog">{w.title} · {fmtShort(w.doneOn!)}</div></li>)}</ul>
        )}
      </Panel>
    </div>
  );
}

