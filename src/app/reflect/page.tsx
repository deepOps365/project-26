"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { ReflectionForm } from "@/components/reflect/ReflectionForm";
import { WeeklyReflection } from "@/components/reflect/WeeklyReflection";
import { PageHeader, Panel, Segmented } from "@/components/ui";
import { SKILLS } from "@/lib/content/skills";
import { addDays, fmtLong, relativeDay } from "@/lib/dates";
import { dayEvalFor } from "@/lib/engine";
import { useGame } from "@/lib/store";
import { SKILL_IDS } from "@/lib/types";

export default function ReflectPage() {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const [tab, setTab] = useState<"tonight" | "week">("tonight");
  const [date, setDate] = useState(today);
  const ev = dayEvalFor(state, d, date);
  const xp = d.xpByDate[date] ?? 0;
  const done = SKILL_IDS.filter((k) => ["done", "exceeded"].includes(ev.quests[k].state));

  return (
    <div className="space-y-4">
      <PageHeader icon="feather" title="Reflection" subtitle="One quiet minute turns a day into a lesson." right={<Link href="/journal/" className="btn btn-sm"><Icon name="bookmarked" size={14} />Journal</Link>} />
      <div className="flex justify-center"><Segmented value={tab} onChange={setTab} options={[{ value: "tonight", label: "Evening" }, { value: "week", label: "Weekly" }]} /></div>
      {tab === "tonight" ? (
        <>
          <div className="flex gap-2 justify-center">
            {[today, addDays(today, -1)].map((x) => <button key={x} className="chip" data-on={date === x} onClick={() => setDate(x)}>{relativeDay(x, today)}</button>)}
          </div>
          <Panel>
            <div className="flex items-center justify-between gap-3 mb-2"><div className="rune-title">{fmtLong(date)} · recap</div><div className="font-display gold-text tabular">{xp} XP</div></div>
            <div className="flex flex-wrap gap-2">
              {done.length ? done.map((k) => <span key={k} className="text-xs px-2.5 py-1 rounded-full ring-1 flex items-center gap-1.5" style={{ color: SKILLS[k].color, background: `${SKILLS[k].color}14`, ["--tw-ring-color" as string]: `${SKILLS[k].color}44` }}><Icon name="check" size={12} strokeWidth={3} />{SKILLS[k].quest}</span>) : <span className="text-sm text-mist">No quests completed — that&apos;s okay. Reflection still counts.</span>}
            </div>
          </Panel>
          <Panel gold><ReflectionForm key={date} date={date} /></Panel>
        </>
      ) : <WeeklyReflection />}
    </div>
  );
}
