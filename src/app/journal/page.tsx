"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BarChart } from "@/components/charts";
import { Icon } from "@/components/Icon";
import { MOODS, ReflectionForm } from "@/components/reflect/ReflectionForm";
import { Empty, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { fmtFull, fmtShort, weekEnd } from "@/lib/dates";
import { useGame } from "@/lib/store";

export default function Journal() {
  const days = useGame((s) => s.state.days);
  const weekly = useGame((s) => s.state.weeklyReflections);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const list = useMemo(() => Object.entries(days).filter(([, l]) => l.reflection).map(([date, l]) => ({ date, r: l.reflection! })).sort((a, b) => b.date.localeCompare(a.date)), [days]);
  const filtered = q.trim() ? list.filter(({ r }) => [r.accomplished, r.distraction, r.learned, r.improve, r.journal].join(" ").toLowerCase().includes(q.trim().toLowerCase())) : list;
  const recent = [...list].slice(0, 14).reverse();
  const weeks = Object.entries(weekly).sort((a, b) => b[0].localeCompare(a[0]));
  const toggle = (id: string) => setOpenIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-5">
      <PageHeader icon="bookmarked" title="Journal" subtitle={`${list.length} reflection${list.length === 1 ? "" : "s"} · revisit who you were, and how far you've come.`} right={<Link href="/reflect/" className="btn btn-sm btn-gold"><Icon name="feather" size={14} />Write</Link>} />
      {recent.length >= 3 && (
        <Panel>
          <SectionTitle icon="heart">Mood · last {recent.length} reflections</SectionTitle>
          <BarChart data={recent.map(({ date, r }) => ({ label: fmtShort(date).split(" ")[0], value: r.mood, color: ["#ef4a5f", "#ff9f6b", "#a9a7bd", "#5eeaa8", "#f6cb62"][r.mood - 1], title: `${fmtShort(date)}: ${MOODS[r.mood - 1].label}` }))} max={5} height={80} format={(n) => MOODS[Math.round(n) - 1]?.label ?? ""} />
        </Panel>
      )}
      {list.length > 0 && <input className="input" placeholder="Search your reflections…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search reflections" />}
      {list.length === 0 ? <Panel><Empty icon="feather" title="No reflections yet">Your evening reflections will gather here. Even two honest sentences count.</Empty></Panel> : filtered.length === 0 ? <Panel><Empty icon="feather" title="Nothing matches that search" /></Panel> : (
        <ul className="space-y-3">
          {filtered.map(({ date, r }) => {
            const open = openIds.has(date), editing = edit === date;
            return (
              <li key={date}>
                <Panel className="!p-0 overflow-hidden">
                  <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left" onClick={() => toggle(date)} aria-expanded={open}>
                    <span className="text-2xl">{MOODS[r.mood - 1].e}</span>
                    <div className="min-w-0 flex-1"><div className="font-display text-[15px]">{fmtFull(date)}</div><div className="text-xs text-fog truncate">{r.accomplished || r.learned || r.journal}</div></div>
                    <Icon name="down" size={16} className={`text-fog transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div className="px-4 pb-4 animate-rise">
                      <div className="divider mb-3" />
                      {editing ? <ReflectionForm date={date} onSaved={() => setEdit(null)} /> : (
                        <div className="space-y-3 text-sm">
                          {([["Accomplished", r.accomplished], ["Biggest distraction", r.distraction], ["Learned", r.learned], ["To improve", r.improve], ["Journal", r.journal]] as const).filter(([, v]) => v).map(([k, v]) => <div key={k}><div className="label">{k}</div><p className="text-mist whitespace-pre-wrap mt-0.5">{v}</p></div>)}
                          <button className="btn btn-sm" onClick={() => setEdit(date)}><Icon name="pencil" size={13} />Edit</button>
                        </div>
                      )}
                    </div>
                  )}
                </Panel>
              </li>
            );
          })}
        </ul>
      )}
      {weeks.length > 0 && (
        <section>
          <SectionTitle icon="scroll">Weekly reflections</SectionTitle>
          <div className="space-y-2.5">
            {weeks.map(([ws, w]) => (
              <Panel key={ws} className="!p-3.5">
                <div className="text-xs text-fog mb-1">{fmtShort(ws)} – {fmtShort(weekEnd(ws))}</div>
                <div className="text-sm"><span className="label mr-2">Improve</span>{w.improvement}</div>
                {w.note && <p className="text-xs text-mist mt-1.5 whitespace-pre-wrap">{w.note}</p>}
              </Panel>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
