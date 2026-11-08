"use client";

import Link from "next/link";
import { AchievementTile } from "../AchievementTile";
import { Icon } from "../Icon";
import { Bar, PageHeader, Panel, Ring, SectionTitle, cx } from "../ui";
import { ACHIEVEMENTS } from "@/lib/content/defs";
import { SKILLS } from "@/lib/content/skills";
import { fmtNum } from "@/lib/format";
import { xpForSkillLevel } from "@/lib/progression";
import { useGame } from "@/lib/store";
import type { SkillId } from "@/lib/types";
import { HealthPanel, LearningPanel, ReadingPanel, ScreenPanel, SleepPanel, WorkPanel } from "./panels";

const GROUP: Record<SkillId, string> = { sleep: "Sleep", reading: "Reading", learning: "Learning", health: "Health", screen: "Focus", work: "Work" };
const PANEL = { sleep: SleepPanel, reading: ReadingPanel, learning: LearningPanel, health: HealthPanel, screen: ScreenPanel, work: WorkPanel } as const;

export function SkillDetail({ id }: { id: SkillId }) {
  const d = useGame((s) => s.derived);
  const meta = SKILLS[id], s = d.skills[id];
  const xp = d.skillXp[id];
  const Panel_ = PANEL[id];
  const nextIdx = meta.tree.findIndex((n) => n.level > s.level);
  const node = meta.tree.filter((n) => n.level <= s.level).pop();
  const achs = ACHIEVEMENTS.filter((a) => a.group === GROUP[id]);

  return (
    <div className="space-y-5">
      <Link href="/skills/" className="inline-flex items-center gap-1 text-xs text-mist hover:text-parchment"><Icon name="left" size={14} />All skill trees</Link>
      <PageHeader icon={meta.icon} title={`${meta.attribute} — ${meta.area}`} subtitle={meta.tagline} />
      <Panel glow={meta.glow} accent={meta.color} className="flex items-center gap-5">
        <Ring pct={s.pct} size={84} stroke={6} color={meta.color}>
          <div className="text-center leading-none"><div className="font-display text-2xl tabular" style={{ color: meta.color }}>{s.level}</div><div className="text-[9px] text-fog tracking-widest mt-0.5">LEVEL</div></div>
        </Ring>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-fog">Current title</div>
          <div className="font-display text-lg truncate" style={{ color: meta.color }}>{node?.title ?? "Untrained"}</div>
          <div className="flex justify-between text-[11px] text-fog mt-2 mb-1 tabular"><span>{fmtNum(s.into)} / {fmtNum(s.needed)} XP</span><span>{fmtNum(xp)} total</span></div>
          <Bar pct={s.pct} color={meta.color} height={8} glow label={`${meta.attribute} XP`} />
        </div>
      </Panel>

      <Panel>
        <SectionTitle icon="sparkles">Skill tree</SectionTitle>
        <ol className="relative ml-1">
          <div className="absolute left-[21px] top-5 bottom-5 w-px" style={{ background: `linear-gradient(180deg, ${meta.color}, rgba(255,255,255,.08) ${Math.max(10, (meta.tree.filter((n) => n.level <= s.level).length / meta.tree.length) * 100)}%)` }} />
          {meta.tree.map((n, i) => {
            const got = s.level >= n.level, isNext = i === nextIdx;
            return (
              <li key={n.level} className="relative flex gap-4 py-2.5">
                <div className={cx("relative z-[1] w-[43px] h-[43px] rounded-full grid place-items-center shrink-0 transition", isNext && "animate-pulse")}
                  style={got ? { background: `${meta.color}2b`, boxShadow: `0 0 18px ${meta.color}66, inset 0 0 0 2px ${meta.color}`, color: meta.color } : { background: "#13131d", boxShadow: `inset 0 0 0 1.5px ${isNext ? meta.color + "99" : "rgba(255,255,255,.1)"}`, color: isNext ? meta.color : "#6f6e86" }}>
                  <Icon name={got ? "check" : isNext ? meta.icon : "lock"} size={got ? 20 : 17} strokeWidth={got ? 2.6 : 1.8} />
                </div>
                <div className={cx("min-w-0 pt-0.5", !got && !isNext && "opacity-55")}>
                  <div className="flex items-baseline gap-2"><span className="font-display text-[15px]" style={got ? { color: meta.color } : undefined}>{n.title}</span><span className="text-[11px] text-fog tabular">Lv {n.level}</span></div>
                  <div className="text-xs text-mist">{got || isNext ? n.flavor : "Keep levelling to reveal."}</div>
                  {isNext && <div className="text-[11px] mt-0.5 tabular" style={{ color: meta.color }}>{fmtNum(Math.max(0, xpForSkillLevel(n.level) - xp))} XP to unlock</div>}
                </div>
              </li>
            );
          })}
        </ol>
      </Panel>

      <Panel_ />

      <section>
        <SectionTitle icon="trophy" right={<Link href="/achievements/" className="text-xs text-gold-300 hover:underline">All trophies →</Link>}>{meta.area} trophies</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {achs.map((a) => <AchievementTile key={a.id} ach={a} unlockedOn={d.unlocked[a.id]} current={a.metric(d.stats)} compact />)}
        </div>
      </section>
    </div>
  );
}
