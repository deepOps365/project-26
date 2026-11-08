"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { QuestCard } from "@/components/quest/QuestCard";
import { PageHeader, Panel, Ring } from "@/components/ui";
import { SKILLS } from "@/lib/content/skills";
import { dayEvalFor } from "@/lib/engine";
import { sfx } from "@/lib/sound";
import { useGame } from "@/lib/store";
import { SKILL_IDS } from "@/lib/types";

export default function CheckIn() {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const ev = dayEvalFor(state, d, today);
  const [i, setI] = useState(0);
  const last = i >= SKILL_IDS.length;
  const skill = SKILL_IDS[Math.min(i, SKILL_IDS.length - 1)];
  const xp = d.xpByDate[today] ?? 0;
  const hasReflection = !!state.days[today]?.reflection;

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <PageHeader icon="zap" title="Quick check-in" subtitle="Thirty seconds. Log what's true, skip what isn't." />
      <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Check-in steps">
        {SKILL_IDS.map((k, idx) => {
          const q = ev.quests[k], m = SKILLS[k];
          const ok = q.state === "done" || q.state === "exceeded";
          return (
            <button key={k} onClick={() => { sfx("tap"); setI(idx); }} aria-label={m.quest} aria-current={idx === i}>
              <Ring pct={q.pct} size={idx === i ? 46 : 36} stroke={3.5} color={m.color}>
                {ok ? <Icon name="check" size={idx === i ? 18 : 14} style={{ color: m.color }} strokeWidth={3} /> : <Icon name={m.icon} size={idx === i ? 18 : 14} style={{ color: m.color }} />}
              </Ring>
            </button>
          );
        })}
      </div>

      {!last ? (
        <>
          <p className="text-center text-xs text-fog">Step {i + 1} of {SKILL_IDS.length}</p>
          <QuestCard key={skill} skill={skill} date={today} defaultOpen />
          <div className="flex gap-3">
            <button className="btn flex-1" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}><Icon name="left" size={16} />Back</button>
            <button className="btn btn-gold flex-1" onClick={() => { sfx("tap"); setI(i + 1); }}>
              {["done", "exceeded"].includes(ev.quests[skill].state) ? "Next" : "Skip for now"}<Icon name="right" size={16} />
            </button>
          </div>
        </>
      ) : (
        <Panel gold className="text-center py-7 space-y-3 animate-rise">
          <Icon name="sparkles" size={30} className="text-gold-300 mx-auto" />
          <h2 className="font-display text-2xl gold-text">{ev.questsDone === 6 ? "Flawless day" : ev.kept ? "Day kept" : ev.questsDone > 0 ? "Good start" : "Nothing logged — and that's okay"}</h2>
          <p className="text-sm text-mist">{ev.questsDone}/6 quests · {xp} XP today. {ev.kept ? "The streak lives." : `Complete ${state.configHistory.at(-1)?.targets.streakQuests ?? 3} to keep the day.`}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            {!hasReflection && <Link href="/reflect/" className="btn btn-gold"><Icon name="feather" size={16} />One-minute reflection</Link>}
            <Link href="/" className="btn">Done — go live your life</Link>
          </div>
        </Panel>
      )}
    </div>
  );
}
