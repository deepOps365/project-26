"use client";

import { useMemo, useState } from "react";
import { AchievementTile } from "@/components/AchievementTile";
import { PageHeader, Panel, Segmented } from "@/components/ui";
import { ACHIEVEMENTS, RARITY_COLOR, RARITY_ORDER, RARITY_XP } from "@/lib/content/defs";
import { useGame } from "@/lib/store";

const GROUPS = ["Journey", "Battle", "Reading", "Learning", "Health", "Sleep", "Focus", "Work", "Reflection", "Secret"];

export default function Achievements() {
  const d = useGame((s) => s.derived);
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");
  const total = ACHIEVEMENTS.length;
  const got = Object.keys(d.unlocked).length;
  const xp = ACHIEVEMENTS.filter((a) => d.unlocked[a.id]).reduce((s, a) => s + RARITY_XP[a.rarity], 0);
  const byRarity = useMemo(() => RARITY_ORDER.map((r) => ({ r, total: ACHIEVEMENTS.filter((a) => a.rarity === r).length, got: ACHIEVEMENTS.filter((a) => a.rarity === r && d.unlocked[a.id]).length })), [d.unlocked]);

  return (
    <div className="space-y-5">
      <PageHeader icon="trophy" title="Hall of Trophies" subtitle="Locked trophies show only a silhouette and a hint. Secrets reveal themselves." />
      <Panel gold>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div><div className="font-display text-3xl gold-text tabular">{got}<span className="text-fog text-xl"> / {total}</span></div><div className="text-xs text-mist">unlocked · {xp.toLocaleString()} XP earned from trophies</div></div>
          <div className="flex gap-3 flex-wrap">
            {byRarity.map((x) => <div key={x.r} className="text-center min-w-12"><div className="font-display tabular" style={{ color: RARITY_COLOR[x.r] }}>{x.got}/{x.total}</div><div className="text-[9px] uppercase tracking-widest text-fog">{x.r}</div></div>)}
          </div>
        </div>
      </Panel>
      <div className="flex justify-center"><Segmented value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "unlocked", label: "Unlocked" }, { value: "locked", label: "Locked" }]} /></div>
      {GROUPS.map((g) => {
        const list = ACHIEVEMENTS.filter((a) => a.group === g).filter((a) => filter === "all" || (filter === "unlocked" ? d.unlocked[a.id] : !d.unlocked[a.id]))
          .sort((a, b) => Number(!!d.unlocked[b.id]) - Number(!!d.unlocked[a.id]) || RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
        if (!list.length) return null;
        return (
          <section key={g}>
            <h2 className="rune-title mb-2.5">{g}{g === "Secret" ? " · hidden until found" : ""}</h2>
            <div className="grid sm:grid-cols-2 gap-2.5">{list.map((a) => <AchievementTile key={a.id} ach={a} unlockedOn={d.unlocked[a.id]} current={a.metric(d.stats)} />)}</div>
          </section>
        );
      })}
    </div>
  );
}
