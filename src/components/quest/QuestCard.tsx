"use client";

import { useState } from "react";
import { configFor } from "@/lib/config";
import { SKILLS } from "@/lib/content/skills";
import type { ISODate } from "@/lib/dates";
import { dayEvalFor, type QuestEval } from "@/lib/engine";
import { fmtHours, fmtMinutes } from "@/lib/format";
import { sfx } from "@/lib/sound";
import { useGame } from "@/lib/store";
import type { SkillId, Targets } from "@/lib/types";
import { Icon } from "../Icon";
import { Bar, Ring, cx } from "../ui";
import { SkillInputs } from "./Inputs";

export const requirementText = (k: SkillId, t: Targets) => ({
  sleep: `Sleep ${fmtHours(t.sleepMin)}–${fmtHours(t.sleepMax)}`,
  reading: `Read ${t.readMin} pages`,
  learning: `Learn ${t.learnMin} focused minutes`,
  health: `Move ${t.moveMin} minutes`,
  screen: `Under ${fmtMinutes(t.screenLimit)} recreational screen time`,
  work: `Complete ${t.workTasks} meaningful tasks`,
}[k]);

export const bonusHint = (k: SkillId, t: Targets) => ({
  sleep: "Bonus: steady bedtime · recovery after a short night",
  reading: `Bonus at ${t.readGoal}+ pages`,
  learning: `Bonus at ${t.learnGoal}+ min, and for a written note`,
  health: `Bonus: ${t.meditateMin}+ min meditation · eating well`,
  screen: `Bonus under ${fmtMinutes(t.screenGoal)}`,
  work: "Bonus: a high-priority win · recorded accomplishment",
}[k]);

export function QuestCard({ skill, date, defaultOpen }: { skill: SkillId; date: ISODate; defaultOpen?: boolean }) {
  const state = useGame((s) => s.state);
  const derived = useGame((s) => s.derived);
  const [open, setOpen] = useState(!!defaultOpen);
  const meta = SKILLS[skill];
  const cfg = configFor(state.configHistory, date);
  const q: QuestEval = dayEvalFor(state, derived, date).quests[skill];
  const done = q.state === "done" || q.state === "exceeded";
  const Input = SkillInputs[skill];
  const base = cfg.xp[skill];

  return (
    <div
      className={cx("panel overflow-hidden transition-all", done && "panel-glow")}
      style={done ? ({ ["--glow" as string]: meta.glow, ["--accent" as string]: meta.color } as React.CSSProperties) : undefined}
    >
      <button
        className="w-full text-left p-4 flex items-center gap-3.5"
        onClick={() => { sfx("tap"); setOpen(!open); }} aria-expanded={open} aria-label={`${meta.quest} — ${q.summary}`}
      >
        <Ring pct={q.pct} size={52} stroke={4.5} color={meta.color}>
          {done ? <Icon name="check" size={22} style={{ color: meta.color }} strokeWidth={2.6} /> : <Icon name={meta.icon} size={20} style={{ color: meta.color }} />}
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-[15px] sm:text-base leading-tight truncate">{meta.quest}</h3>
            {q.state === "partial" && <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-mist shrink-0">Partial</span>}
            {q.state === "exceeded" && <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0" style={{ background: `${meta.color}33`, color: meta.color }}>Exceeded</span>}
          </div>
          <div className="text-xs text-mist truncate">{requirementText(skill, cfg.targets)}</div>
          <div className="text-xs mt-0.5 tabular" style={{ color: done ? meta.color : "#6f6e86" }}>{q.summary}</div>
        </div>
        <div className="text-right shrink-0">
          <div className={cx("font-display text-lg tabular", q.total > 0 ? "text-gold-300" : "text-fog")}>+{q.total > 0 ? q.total : base}</div>
          <div className="text-[10px] text-fog tracking-widest">XP</div>
        </div>
        <Icon name="down" size={16} className={cx("text-fog transition-transform shrink-0", open && "rotate-180")} />
      </button>
      <div className="px-4 pb-1"><Bar pct={q.pct} color={meta.color} height={5} label={`${meta.quest} progress`} /></div>
      {(q.bonuses.length > 0 || q.note) && (
        <div className="px-4 pt-2 flex flex-wrap gap-1.5 items-center">
          {q.bonuses.map((b) => <span key={b.key} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gold-400/15 text-gold-300 ring-1 ring-gold-500/30">+{b.xp} {b.label}</span>)}
          {q.note && <span className="text-[11px] text-mist">{q.note}</span>}
        </div>
      )}
      {open && (
        <div className="px-4 pt-3 pb-4 animate-rise">
          <div className="divider mb-3" />
          <Input date={date} />
          <p className="text-[11px] text-fog mt-3">{bonusHint(skill, cfg.targets)}</p>
        </div>
      )}
      <div className="h-3" />
    </div>
  );
}
