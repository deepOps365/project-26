"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Bar, PageHeader, Panel } from "@/components/ui";
import { SKILLS } from "@/lib/content/skills";
import { fmtNum } from "@/lib/format";
import { dayEvalFor } from "@/lib/engine";
import { useGame } from "@/lib/store";
import { SKILL_IDS } from "@/lib/types";

export default function SkillsPage() {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const ev = dayEvalFor(state, d, today);
  return (
    <div>
      <PageHeader icon="sparkles" title="Skill Trees" subtitle="Six attributes. Each grows only from real actions in your real life." />
      <div className="grid sm:grid-cols-2 gap-3.5">
        {SKILL_IDS.map((k, i) => {
          const m = SKILLS[k], s = d.skills[k];
          const node = m.tree.filter((t) => t.level <= s.level).pop();
          const next = m.tree.find((t) => t.level > s.level);
          const q = ev.quests[k];
          return (
            <Link key={k} href={`/skills/${k}/`} className="group animate-rise" style={{ animationDelay: `${i * 50}ms` }}>
              <Panel glow={m.glow} accent={m.color} className="h-full transition group-hover:-translate-y-0.5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl grid place-items-center shrink-0" style={{ background: `${m.color}1f`, color: m.color, boxShadow: `0 0 22px ${m.color}33, inset 0 0 0 1px ${m.color}55` }}><Icon name={m.icon} size={28} strokeWidth={1.5} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2"><h3 className="font-display text-lg">{m.attribute}</h3><span className="text-xs text-fog">{m.area}</span></div>
                    <div className="text-xs italic text-mist truncate">{node ? `“${node.title}”` : "Untrained"}</div>
                  </div>
                  <div className="text-right"><div className="font-display text-2xl tabular" style={{ color: m.color }}>{s.level}</div><div className="text-[10px] text-fog tracking-widest">LEVEL</div></div>
                </div>
                <div className="mt-4"><Bar pct={s.pct} color={m.color} height={8} glow label={`${m.attribute} XP`} /></div>
                <div className="flex justify-between text-[11px] text-fog mt-1.5 tabular"><span>{fmtNum(s.into)} / {fmtNum(s.needed)} XP</span><span>{next ? `Next title: ${next.title}` : "Maxed"}</span></div>
                <div className="mt-3 text-xs flex items-center gap-1.5" style={{ color: q.state === "done" || q.state === "exceeded" ? m.color : "#a9a7bd" }}><Icon name={q.state === "done" || q.state === "exceeded" ? "check" : "target"} size={13} />Today: {q.summary}</div>
              </Panel>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
