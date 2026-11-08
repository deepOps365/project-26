"use client";

import { useState } from "react";
import { hasReflection } from "@/lib/engine";
import type { ISODate } from "@/lib/dates";
import { sfx } from "@/lib/sound";
import { useGame } from "@/lib/store";
import type { Reflection } from "@/lib/types";
import { Icon } from "../Icon";
import { Confirm, cx } from "../ui";

export const MOODS: { v: 1 | 2 | 3 | 4 | 5; e: string; label: string }[] = [
  { v: 1, e: "😞", label: "Rough" }, { v: 2, e: "😕", label: "Low" }, { v: 3, e: "😐", label: "Okay" }, { v: 4, e: "🙂", label: "Good" }, { v: 5, e: "😄", label: "Great" },
];

const PROMPTS: { key: "accomplished" | "distraction" | "learned" | "improve"; q: string; ph: string }[] = [
  { key: "accomplished", q: "What did I accomplish today?", ph: "Even small things count…" },
  { key: "distraction", q: "What was my biggest distraction?", ph: "Name it, without judgement." },
  { key: "learned", q: "What did I learn today?", ph: "A fact, a skill, a realisation." },
  { key: "improve", q: "What could I improve tomorrow?", ph: "One small, specific change." },
];

export function ReflectionForm({ date, onSaved }: { date: ISODate; onSaved?: () => void }) {
  const existing = useGame((s) => s.state.days[date]?.reflection);
  const { saveReflection, deleteReflection } = useGame.getState();
  const [f, setF] = useState<Omit<Reflection, "updatedAt">>(() => ({
    accomplished: existing?.accomplished ?? "", distraction: existing?.distraction ?? "", learned: existing?.learned ?? "",
    improve: existing?.improve ?? "", mood: existing?.mood ?? 3, journal: existing?.journal ?? "",
  }));
  const [moodSet, setMoodSet] = useState(!!existing);
  const [confirmDel, setConfirmDel] = useState(false);
  const ok = hasReflection({ ...f, updatedAt: 0 });
  return (
    <div className="space-y-4">
      {PROMPTS.map((p) => (
        <div key={p.key}>
          <label className="block text-sm font-semibold mb-1.5" htmlFor={`${p.key}-${date}`}>{p.q}</label>
          <textarea id={`${p.key}-${date}`} className="input !min-h-[4.2rem]" rows={2} placeholder={p.ph} value={f[p.key]} onChange={(e) => setF({ ...f, [p.key]: e.target.value })} maxLength={600} />
        </div>
      ))}
      <div>
        <div className="text-sm font-semibold mb-1.5">How am I feeling?</div>
        <div className="grid grid-cols-5 gap-2">
          {MOODS.map((m) => (
            <button key={m.v} type="button" onClick={() => { sfx("tap"); setF({ ...f, mood: m.v }); setMoodSet(true); }} aria-pressed={moodSet && f.mood === m.v}
              className={cx("rounded-xl py-2.5 flex flex-col items-center gap-0.5 ring-1 transition", moodSet && f.mood === m.v ? "bg-gold-400/15 ring-gold-500/60 scale-[1.04]" : "ring-white/10 hover:bg-white/5")}>
              <span className="text-2xl leading-none">{m.e}</span><span className="text-[10px] text-mist">{m.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1.5" htmlFor={`journal-${date}`}>Journal <span className="text-fog font-normal">(optional — anything else)</span></label>
        <textarea id={`journal-${date}`} className="input" rows={3} placeholder="Write freely…" value={f.journal} onChange={(e) => setF({ ...f, journal: e.target.value })} maxLength={3000} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button className="btn btn-gold" disabled={!ok && !existing} onClick={() => { saveReflection(date, f); onSaved?.(); }}>
          <Icon name="feather" size={16} />{existing ? "Update reflection" : "Save reflection"}{!existing && ok && " · +10 XP"}
        </button>
        {existing && <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(true)}><Icon name="trash" size={14} />Delete</button>}
        {!ok && <span className="text-xs text-fog">Answer at least two prompts to save.</span>}
      </div>
      <Confirm open={confirmDel} danger title="Delete this reflection?" body="Its +10 XP will be removed too. You can always write it again." confirmLabel="Delete" onConfirm={() => deleteReflection(date)} onClose={() => setConfirmDel(false)} />
    </div>
  );
}
