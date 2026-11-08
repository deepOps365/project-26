"use client";

import { ACHIEVEMENTS } from "@/lib/content/defs";
import { SKILLS } from "@/lib/content/skills";
import { JOURNEY_DAYS, journeyDay } from "@/lib/dates";
import { fmtNum } from "@/lib/format";
import { RANKS, nextRank, rankForLevel } from "@/lib/progression";
import { useGame } from "@/lib/store";
import { SKILL_IDS } from "@/lib/types";
import { Icon } from "./Icon";
import { Avatar, Bar, Panel, Stat } from "./ui";

export function heroTitle(skills: Record<string, { level: number }>) {
  let best = SKILL_IDS[0];
  for (const k of SKILL_IDS) if (skills[k].level > skills[best].level) best = k;
  const node = SKILLS[best].tree.filter((t) => t.level <= skills[best].level).pop();
  return node?.title ?? "Wanderer";
}

export function HeroCard() {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const lvl = d.level;
  const rank = rankForLevel(lvl.level);
  const nxt = nextRank(lvl.level);
  const day = journeyDay(state.settings.startDate, today);
  const dayClamped = Math.max(0, Math.min(JOURNEY_DAYS, day));
  const unlocked = Object.keys(d.unlocked).length;

  return (
    <Panel gold className="relative overflow-hidden animate-rise">
      <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl opacity-25 pointer-events-none" style={{ background: rank.color }} />
      <div className="relative flex flex-col sm:flex-row gap-5 sm:items-center">
        <div className="flex sm:block items-center gap-4">
          <Avatar size={116} pct={lvl.pct} color={rank.color} level={lvl.level} />
          <div className="sm:hidden min-w-0">
            <div className="font-display text-2xl gold-text truncate">{state.settings.heroName || "Hero"}</div>
            <div className="text-sm font-semibold" style={{ color: rank.color }}>{rank.name}</div>
            <div className="text-xs text-fog italic truncate">{heroTitle(d.skills)}</div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="hidden sm:block">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="font-display text-3xl gold-text">{state.settings.heroName || "Hero"}</h2>
              <span className="text-sm font-semibold px-2 py-0.5 rounded-full ring-1" style={{ color: rank.color, background: `${rank.color}1f`, ["--tw-ring-color" as string]: `${rank.color}66` }}>{rank.name}</span>
            </div>
            <div className="text-sm text-fog italic mt-0.5">“{heroTitle(d.skills)}” · {rank.blurb}</div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="flex items-end justify-between text-xs mb-1.5">
              <span className="text-mist"><b className="text-parchment tabular">{fmtNum(lvl.into)}</b> / {fmtNum(lvl.needed)} XP to Level {lvl.level + 1}</span>
              <span className="text-fog tabular">{fmtNum(d.totalXp)} total XP</span>
            </div>
            <Bar pct={lvl.pct} color="#f6cb62" height={12} glow label="XP to next level" />
            {nxt && <div className="text-[11px] text-fog mt-1.5">Next rank: <span style={{ color: nxt.color }} className="font-semibold">{nxt.name}</span> at Level {nxt.minLevel} · {RANKS.findIndex((r) => r.id === rank.id) + 1} of {RANKS.length} ranks</div>}
          </div>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <Stat icon="map" label="Journey" value={day < 1 ? "Prologue" : day > JOURNEY_DAYS ? "Complete" : `Day ${day}`} sub={day < 1 ? "begins soon" : `of ${JOURNEY_DAYS}`} color="#46c2f2" />
        <Stat icon="flame" label="Streak" value={`${d.streak.current}`} sub={`days · best ${d.streak.longest}`} color="#ff9f6b" />
        <Stat icon="scroll" label="Quests done" value={fmtNum(d.stats.questsDone)} sub="all time" color="#b592ff" />
        <Stat icon="trophy" label="Trophies" value={`${unlocked}`} sub={`of ${ACHIEVEMENTS.length}`} color="#f6cb62" />
        <Stat icon="coins" label="Gold" value={fmtNum(d.gold)} sub="to spend on treats" color="#ffe08a" />
        <Stat icon="shield" label="Kept days" value={`${d.stats.keptDays}`} sub={`${d.stats.minimumDays} min. days`} color="#5eeaa8" />
      </div>

      <div className="relative mt-4">
        <div className="flex justify-between text-[11px] text-fog mb-1"><span className="uppercase tracking-widest">Journey progress</span><span className="tabular">{Math.round((dayClamped / JOURNEY_DAYS) * 100)}%</span></div>
        <Bar pct={dayClamped / JOURNEY_DAYS} color="#46c2f2" height={6} label="Journey progress" />
      </div>
    </Panel>
  );
}
