"use client";

import { useEffect, useMemo, useState } from "react";
import { configFor } from "@/lib/config";
import { ACTIVITIES, ACTIVITY_BY_ID, KIND_BY_ID, LEARN_KINDS, TOPICS, TOPIC_BY_ID } from "@/lib/content/skills";
import type { ISODate } from "@/lib/dates";
import { hoursBetween } from "@/lib/engine";
import { fmtMinutes } from "@/lib/format";
import { sfx } from "@/lib/sound";
import { useGame } from "@/lib/store";
import type { ActivityType, LearnKind, Priority, TopicId } from "@/lib/types";
import { Icon } from "../Icon";
import { cx } from "../ui";

const useDay = (date: ISODate) => useGame((s) => s.state.days[date]);

function Entry({ icon, color, title, sub, onDelete }: { icon: string; color?: string; title: string; sub?: string; onDelete: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-black/25 ring-1 ring-white/5 px-3 py-2">
      <Icon name={icon} size={16} style={{ color }} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm truncate">{title}</div>
        {sub && <div className="text-xs text-fog truncate">{sub}</div>}
      </div>
      <button className="btn btn-icon btn-sm !min-h-8 !min-w-8" onClick={() => { sfx("undo"); onDelete(); }} aria-label={`Remove ${title}`} title="Remove (corrects XP)"><Icon name="trash" size={14} /></button>
    </li>
  );
}

function CustomNumber({ placeholder, unit, onAdd, max }: { placeholder: string; unit: string; onAdd: (n: number) => void; max: number }) {
  const [v, setV] = useState("");
  const n = Number(v);
  const ok = v !== "" && Number.isFinite(n) && n > 0 && n <= max;
  const submit = () => { if (ok) { onAdd(n); setV(""); } };
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input className="input pr-12" inputMode="decimal" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value.replace(/[^\d.]/g, ""))} onKeyDown={(e) => e.key === "Enter" && submit()} aria-label={placeholder} />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fog pointer-events-none">{unit}</span>
      </div>
      <button className="btn btn-gold" disabled={!ok} onClick={submit}>Add</button>
    </div>
  );
}

// ───────────────────────── Sleep ─────────────────────────
export function SleepInput({ date }: { date: ISODate }) {
  const log = useDay(date)?.sleep;
  const set = useGame((s) => s.setSleep);
  const [bed, setBed] = useState(log?.bedtime ?? "");
  const [wake, setWake] = useState(log?.wake ?? "");
  useEffect(() => { setBed(log?.bedtime ?? ""); setWake(log?.wake ?? ""); }, [date, log?.bedtime, log?.wake]);
  const chips = [6, 6.5, 7, 7.5, 8, 8.5, 9];
  const pick = (h: number) => { sfx("tap"); set(date, { hours: h, bedtime: bed || undefined, wake: wake || undefined }); };
  const onTimes = (b: string, w: string) => {
    setBed(b); setWake(w);
    const h = hoursBetween(b, w);
    if (h != null) set(date, { hours: h, bedtime: b, wake: w });
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-fog">Log <em>last night&apos;s</em> sleep. Healthy range earns XP; oversleeping doesn&apos;t.</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((h) => <button key={h} className="chip" data-on={log?.hours === h} onClick={() => pick(h)}>{h}h</button>)}
        <button className="chip" onClick={() => { sfx("undo"); set(date, null); }} disabled={!log}><Icon name="undo" size={13} />Clear</button>
      </div>
      <details className="group">
        <summary className="text-xs text-mist cursor-pointer hover:text-parchment select-none">Add bedtime &amp; wake time <span className="text-fog">(steady-rhythm bonus)</span></summary>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <label className="text-xs text-fog">Bedtime<input type="time" className="input mt-1" value={bed} onChange={(e) => onTimes(e.target.value, wake)} /></label>
          <label className="text-xs text-fog">Woke up<input type="time" className="input mt-1" value={wake} onChange={(e) => onTimes(bed, e.target.value)} /></label>
        </div>
      </details>
      <CustomNumber placeholder="Other hours (e.g. 7.25)" unit="h" max={16} onAdd={(n) => pick(n)} />
    </div>
  );
}

// ───────────────────────── Reading ─────────────────────────
export function ReadingInput({ date }: { date: ISODate }) {
  const log = useDay(date);
  const books = useGame((s) => s.state.books);
  const lastBook = useGame((s) => s.state.lastUsed.bookId);
  const add = useGame((s) => s.addReading);
  const remove = useGame((s) => s.removeReading);
  const open = books.filter((b) => !b.finishedOn);
  const [bookId, setBookId] = useState<string>("");
  useEffect(() => { setBookId(lastBook && open.some((b) => b.id === lastBook) ? lastBook : ""); }, [lastBook, books.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const log1 = (n: number) => { sfx("tap"); add(date, n, bookId || undefined); };
  return (
    <div className="space-y-3">
      {open.length > 0 && (
        <select className="input" value={bookId} onChange={(e) => setBookId(e.target.value)} aria-label="Book">
          <option value="">No specific book</option>
          {open.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>
      )}
      <div className="flex flex-wrap gap-2">{[2, 5, 10, 20].map((n) => <button key={n} className="chip" onClick={() => log1(n)}>+{n} pages</button>)}</div>
      <CustomNumber placeholder="Pages read" unit="pages" max={400} onAdd={log1} />
      <ul className="space-y-1.5">
        {(log?.reading ?? []).map((r) => (
          <Entry key={r.id} icon="book" title={`${r.pages} pages`} sub={books.find((b) => b.id === r.bookId)?.title} onDelete={() => remove(date, r.id)} />
        ))}
      </ul>
    </div>
  );
}

// ───────────────────────── Learning ─────────────────────────
export function LearningInput({ date }: { date: ISODate }) {
  const log = useDay(date);
  const last = useGame((s) => s.state.lastUsed);
  const add = useGame((s) => s.addLearning);
  const remove = useGame((s) => s.removeLearning);
  const [topic, setTopic] = useState<TopicId>(last.topic);
  const [kind, setKind] = useState<LearnKind>(last.kind);
  const [note, setNote] = useState("");
  const submit = (m: number) => { sfx("tap"); add(date, { topic, kind, minutes: m, note }); setNote(""); };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <select className="input" value={topic} onChange={(e) => setTopic(e.target.value as TopicId)} aria-label="Topic">
          {TOPICS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value as LearnKind)} aria-label="Type of learning">
          {LEARN_KINDS.map((k) => <option key={k.id} value={k.id}>{k.name}{k.weight < 1 ? " (½)" : ""}</option>)}
        </select>
      </div>
      <p className="text-xs text-fog">{KIND_BY_ID[kind].hint}. Practice &amp; building count fully — passive study counts half.</p>
      <input className="input" placeholder="What did you practise or build? (+5 XP for a real note)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} />
      <div className="flex flex-wrap gap-2">{[10, 20, 30, 45, 60].map((m) => <button key={m} className="chip" onClick={() => submit(m)}>+{m} min</button>)}</div>
      <CustomNumber placeholder="Other minutes" unit="min" max={600} onAdd={submit} />
      <ul className="space-y-1.5">
        {(log?.learning ?? []).map((s) => (
          <Entry key={s.id} icon="brain" title={`${TOPIC_BY_ID[s.topic]?.name ?? s.topic} · ${KIND_BY_ID[s.kind]?.name ?? s.kind} · ${fmtMinutes(s.minutes)}`} sub={s.note || undefined} onDelete={() => remove(date, s.id)} />
        ))}
      </ul>
    </div>
  );
}

// ───────────────────────── Health ─────────────────────────
export function HealthInput({ date }: { date: ISODate }) {
  const log = useDay(date);
  const lastAct = useGame((s) => s.state.lastUsed.activity);
  const add = useGame((s) => s.addActivity);
  const remove = useGame((s) => s.removeActivity);
  const setEating = useGame((s) => s.setEating);
  const [type, setType] = useState<ActivityType>(lastAct);
  const mins = type === "meditate" ? [5, 10, 15, 20] : [10, 15, 20, 30, 45];
  const submit = (m: number) => { sfx("tap"); add(date, type, m); };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {ACTIVITIES.map((a) => <button key={a.id} className="chip" data-on={type === a.id} onClick={() => setType(a.id)}><Icon name={a.icon} size={13} />{a.name}</button>)}
      </div>
      <div className="flex flex-wrap gap-2">{mins.map((m) => <button key={m} className="chip" onClick={() => submit(m)}>+{m} min</button>)}</div>
      <CustomNumber placeholder={`Minutes of ${ACTIVITY_BY_ID[type].name.toLowerCase()}`} unit="min" max={600} onAdd={submit} />
      <button className="chip" data-on={!!log?.healthyEating} onClick={() => { sfx("tap"); setEating(date, !log?.healthyEating); }}><Icon name="leaf" size={13} />Ate well today (+5 XP)</button>
      <p className="text-xs text-fog">Up to 90 min of exercise counts per day — more isn&apos;t better. Rest is part of training. No weight or calorie tracking, by design.</p>
      <ul className="space-y-1.5">
        {(log?.activity ?? []).map((a) => <Entry key={a.id} icon={ACTIVITY_BY_ID[a.type]?.icon ?? "heart"} title={`${ACTIVITY_BY_ID[a.type]?.name ?? a.type} · ${a.minutes} min`} onDelete={() => remove(date, a.id)} />)}
      </ul>
    </div>
  );
}

// ───────────────────────── Screen time ─────────────────────────
export function ScreenInput({ date }: { date: ISODate }) {
  const log = useDay(date);
  const set = useGame((s) => s.setScreen);
  const limit = useGame((s) => configFor(s.state.configHistory, date).targets.screenLimit);
  const v = log?.screen;
  const chips = [0, 30, 60, 90, 120, 180, 240, 300];
  return (
    <div className="space-y-3">
      <p className="text-xs text-fog">Recreational screen time only — social media, videos, games, scrolling. <span className="text-mist">Work and study don&apos;t count against you.</span> Log it at the end of the day.</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((m) => <button key={m} className="chip" data-on={v === m} onClick={() => { sfx("tap"); set(date, m); }}>{m === 0 ? "0" : fmtMinutes(m)}</button>)}
        <button className="chip" onClick={() => { sfx("undo"); set(date, null); }} disabled={v == null}><Icon name="undo" size={13} />Clear</button>
      </div>
      <CustomNumber placeholder={`Minutes (limit ${fmtMinutes(limit)})`} unit="min" max={1440} onAdd={(n) => { sfx("tap"); set(date, n); }} />
      {v != null && <p className="text-sm text-mist">Logged: <b className="text-parchment">{fmtMinutes(v)}</b></p>}
    </div>
  );
}

// ───────────────────────── Work ─────────────────────────
const PRI: Record<Priority, { label: string; color: string; rank: number }> = {
  high: { label: "High", color: "#ef4a5f", rank: 0 },
  medium: { label: "Medium", color: "var(--color-gold-500)", rank: 1 },
  low: { label: "Low", color: "#46c2f2", rank: 2 },
};
export const PRIORITY = PRI;

export function WorkInput({ date, showAll }: { date: ISODate; showAll?: boolean }) {
  const tasks = useGame((s) => s.state.tasks);
  const { addTask, completeTask, uncompleteTask, deleteTask, updateTask } = useGame.getState();
  const [title, setTitle] = useState("");
  const [pri, setPri] = useState<Priority>("medium");
  const [more, setMore] = useState(false);
  const [winFor, setWinFor] = useState<string | null>(null);
  const [win, setWin] = useState("");
  const open = useMemo(() => tasks.filter((t) => !t.doneOn).sort((a, b) => PRI[a.priority].rank - PRI[b.priority].rank || a.createdOn.localeCompare(b.createdOn)), [tasks]);
  const done = useMemo(() => tasks.filter((t) => t.doneOn === date), [tasks, date]);
  const shown = showAll || more ? open : open.slice(0, 6);
  const submit = () => { if (title.trim()) { sfx("tap"); addTask(title, pri); setTitle(""); } };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Add a meaningful task…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} maxLength={140} aria-label="New task" />
        <select className="input !w-28" value={pri} onChange={(e) => setPri(e.target.value as Priority)} aria-label="Priority">
          {(["high", "medium", "low"] as Priority[]).map((p) => <option key={p} value={p}>{PRI[p].label}</option>)}
        </select>
        <button className="btn btn-gold btn-icon" onClick={submit} disabled={!title.trim()} aria-label="Add task"><Icon name="plus" size={18} /></button>
      </div>
      {open.length === 0 && done.length === 0 && <p className="text-xs text-fog">No tasks yet. Add what truly matters — then finish it. Quality over hours.</p>}
      <ul className="space-y-1.5">
        {shown.map((t) => (
          <li key={t.id} className="flex items-center gap-2 rounded-xl bg-black/25 ring-1 ring-white/5 pl-2 pr-1 py-1.5">
            <button className="w-8 h-8 rounded-full grid place-items-center ring-2 hover:bg-white/10 transition shrink-0" style={{ ["--tw-ring-color" as string]: PRI[t.priority].color }} onClick={() => { completeTask(t.id, date); }} aria-label={`Complete ${t.title}`}><Icon name="check" size={14} className="opacity-0 hover:opacity-100" /></button>
            <span className="flex-1 min-w-0 text-sm truncate">{t.title}</span>
            <select className="bg-transparent text-[11px] font-semibold rounded-md px-1 py-1 border border-white/10" style={{ color: PRI[t.priority].color }} value={t.priority} onChange={(e) => updateTask(t.id, { priority: e.target.value as Priority })} aria-label="Priority">
              {(["high", "medium", "low"] as Priority[]).map((p) => <option key={p} value={p} className="text-black">{PRI[p].label}</option>)}
            </select>
            <button className="btn btn-icon btn-sm !min-h-8 !min-w-8 !bg-transparent !border-0" onClick={() => deleteTask(t.id)} aria-label={`Delete ${t.title}`}><Icon name="trash" size={14} /></button>
          </li>
        ))}
      </ul>
      {!showAll && open.length > 6 && <button className="text-xs text-mist hover:text-parchment" onClick={() => setMore(!more)}>{more ? "Show fewer" : `Show ${open.length - 6} more`}</button>}
      {done.length > 0 && (
        <div>
          <div className="label mb-1.5">Completed {date === useGame.getState().today ? "today" : "that day"} · {done.length}</div>
          <ul className="space-y-1.5">
            {done.map((t) => (
              <li key={t.id} className="rounded-xl bg-jade-500/8 ring-1 ring-jade-500/20 px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full grid place-items-center bg-jade-500/20 text-jade-400 shrink-0"><Icon name="check" size={14} /></span>
                  <span className="flex-1 min-w-0 text-sm truncate text-mist line-through decoration-white/20">{t.title}</span>
                  <button className="btn btn-icon btn-sm !min-h-8 !min-w-8" onClick={() => { setWinFor(winFor === t.id ? null : t.id); setWin(t.win ?? ""); }} aria-label="Record accomplishment" title="Record the win (+5 XP)"><Icon name="pencil" size={13} /></button>
                  <button className="btn btn-icon btn-sm !min-h-8 !min-w-8" onClick={() => { sfx("undo"); uncompleteTask(t.id); }} aria-label={`Mark ${t.title} not done`} title="Undo — not done"><Icon name="undo" size={13} /></button>
                </div>
                {t.win && winFor !== t.id && <div className="text-xs text-jade-400/80 pl-10 mt-1">★ {t.win}</div>}
                {winFor === t.id && (
                  <div className="flex gap-2 mt-2 pl-10">
                    <input className="input" placeholder="What did you accomplish? (+5 XP)" value={win} onChange={(e) => setWin(e.target.value)} maxLength={240} autoFocus onKeyDown={(e) => { if (e.key === "Enter") { updateTask(t.id, { win }); setWinFor(null); } }} />
                    <button className="btn btn-gold btn-sm" onClick={() => { updateTask(t.id, { win }); setWinFor(null); }}>Save</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export const SkillInputs = { sleep: SleepInput, reading: ReadingInput, learning: LearningInput, health: HealthInput, screen: ScreenInput, work: WorkInput } as const;
export { cx };
