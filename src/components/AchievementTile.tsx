"use client";

import { RARITY_COLOR, RARITY_XP, type Achievement } from "@/lib/content/defs";
import { fmtShort } from "@/lib/dates";
import { Icon } from "./Icon";
import { Bar, cx } from "./ui";

export function AchievementTile({ ach, unlockedOn, current, compact }: { ach: Achievement; unlockedOn?: string; current: number; compact?: boolean }) {
  const color = RARITY_COLOR[ach.rarity];
  const got = !!unlockedOn;
  const hidden = !got && ach.secret;
  const pct = Math.min(1, current / ach.target);
  return (
    <div
      className={cx("panel flex gap-3 items-center relative overflow-hidden transition", compact ? "!p-2.5" : "!p-3.5", got && "panel-glow")}
      style={got ? ({ ["--glow" as string]: `${color}55`, ["--accent" as string]: color } as React.CSSProperties) : undefined}
      aria-label={`${hidden ? "Secret achievement" : ach.title}${got ? " — unlocked" : " — locked"}`}
    >
      {got && <div className="absolute -top-8 -left-8 w-28 h-28 rounded-full blur-2xl opacity-30" style={{ background: color }} />}
      <div
        className={cx("relative shrink-0 grid place-items-center rounded-2xl", compact ? "w-11 h-11" : "w-14 h-14")}
        style={got ? { background: `radial-gradient(circle at 30% 25%, ${color}55, ${color}15)`, boxShadow: `0 0 18px ${color}55, inset 0 0 0 1px ${color}77`, color } : { background: "rgba(255,255,255,.04)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.07)" }}
      >
        {got ? <Icon name={ach.icon} size={compact ? 20 : 26} strokeWidth={1.6} /> : hidden ? <Icon name="lock" size={compact ? 18 : 22} className="text-fog" /> : (
          <>
            <Icon name={ach.icon} size={compact ? 20 : 26} strokeWidth={1.6} className="text-black brightness-0 opacity-70" style={{ filter: "brightness(0) opacity(.55)" }} />
            <Icon name="lock" size={11} className="absolute -bottom-1 -right-1 text-fog bg-ink-800 rounded-full p-0.5 box-content" />
          </>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className={cx("font-display truncate", compact ? "text-sm" : "text-[15px]", got ? "text-parchment" : "text-mist")}>{hidden ? "???" : ach.title}</h4>
          <span className="text-[9px] font-bold uppercase tracking-widest shrink-0 px-1.5 py-0.5 rounded" style={{ color, background: `${color}18` }}>{ach.rarity}</span>
        </div>
        <p className="text-xs text-fog leading-snug mt-0.5">{hidden ? ach.riddle : ach.hint}</p>
        {got ? (
          <p className="text-[11px] mt-1" style={{ color }}>Unlocked {fmtShort(unlockedOn!)} · +{RARITY_XP[ach.rarity]} XP</p>
        ) : !hidden ? (
          <div className="flex items-center gap-2 mt-1.5"><Bar pct={pct} color={color} height={4} /><span className="text-[10px] tabular text-fog shrink-0">{Math.min(Math.floor(current), ach.target).toLocaleString()}/{ach.target.toLocaleString()}</span></div>
        ) : null}
      </div>
    </div>
  );
}
