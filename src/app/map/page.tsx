"use client";

import { Icon } from "@/components/Icon";
import { Avatar, Bar, PageHeader, Panel, cx } from "@/components/ui";
import { REGIONS, type Region } from "@/lib/content/defs";
import { fmtShort } from "@/lib/dates";
import { rankForLevel } from "@/lib/progression";
import { useGame } from "@/lib/store";

/** Layered silhouette scenery per region (pure SVG, no assets). */
function Scenery({ id, color }: { id: string; color: string }) {
  const far = `${color}22`, mid = `${color}44`, near = `${color}77`;
  const shapes: Record<string, React.ReactNode> = {
    forest: <>{[10, 70, 130, 200, 260, 330, 400, 470, 540].map((x, i) => <path key={i} d={`M${x} 120 L${x + 22} ${52 - (i % 3) * 10} L${x + 44} 120Z`} fill={i % 2 ? mid : near} />)}<circle cx="480" cy="30" r="14" fill={`${color}88`} /></>,
    mountains: <><path d="M0 120 L90 40 L150 90 L240 20 L340 100 L420 50 L520 110 L600 60 V120Z" fill={mid} /><path d="M0 120 L60 80 L130 110 L230 64 L330 118 L440 78 L600 120Z" fill={near} /><path d="M240 20 L222 44 L240 38 L256 46Z" fill="#fff" opacity=".55" /></>,
    library: <>{[20, 90, 160, 230, 300, 370, 440, 510].map((x, i) => <g key={i}><rect x={x} y={30 + (i % 2) * 12} width="46" height="90" rx="3" fill={i % 2 ? mid : near} /><path d={`M${x + 8} ${58 + (i % 2) * 12} h30 M${x + 8} ${74 + (i % 2) * 12} h30`} stroke={far} strokeWidth="3" /></g>)}</>,
    valley: <><path d="M0 100 Q150 30 300 90 T600 70 V120 H0Z" fill={mid} /><path d="M0 120 Q200 70 350 108 T600 96 V120Z" fill={near} /><circle cx="90" cy="34" r="16" fill={`${color}aa`} /></>,
    citadel: <><path d="M0 120V84h40V60h30V84h40V50h36V30h12v20h36v34h40V66h44V84h60V56h30V84h50V70h40v50Z" fill={mid} /><path d="M120 120V70h50v50ZM360 120V60h60v60Z" fill={near} /></>,
    kingdom: <><path d="M0 120V80h60l14-30 14 30h60l18-48 18 48h80l22-60 22 60h80l14-30 14 30h60l18-40 18 40h50v40Z" fill={mid} /><path d="M0 120V100h600v20Z" fill={near} /></>,
    summit: <><path d="M0 120 L120 70 L220 100 L320 10 L440 94 L520 60 L600 110 V120Z" fill={near} /><path d="M320 10 L296 44 L320 36 L338 46Z" fill="#fff" opacity=".7" />{[40, 120, 200, 260, 380, 460, 540].map((x, i) => <circle key={i} cx={x} cy={14 + (i % 3) * 14} r="1.6" fill="#fff" opacity=".7" />)}</>,
  };
  return (
    <svg viewBox="0 0 600 120" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full" aria-hidden>
      <rect width="600" height="120" fill={`url(#sky-${id})`} />
      <defs><linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".22" /><stop offset="1" stopColor="#000" stopOpacity="0" /></linearGradient></defs>
      {shapes[id]}
    </svg>
  );
}

function RegionCard({ r, state, here }: { r: Region; state: "locked" | "open" | "cleared"; here: boolean }) {
  const d = useGame((s) => s.derived);
  const level = d.level.level;
  const prog = r.milestones.map((m) => ({ m, cur: m.metric(d.stats) }));
  const done = prog.filter((p) => p.cur >= p.m.target).length;
  const locked = state === "locked";
  return (
    <Panel className={cx("!p-0 overflow-hidden relative", state === "cleared" && "panel-gold", here && "panel-glow")} glow={here ? `${r.color}66` : undefined} accent={r.color}>
      <div className="relative h-28 overflow-hidden" style={{ background: "linear-gradient(180deg,#14141f,#0b0b12)" }}>
        <div className={locked ? "opacity-30 grayscale" : ""}><Scenery id={r.id} color={r.color} /></div>
        <div className="absolute inset-0 flex items-end justify-between p-4 bg-gradient-to-t from-ink-900/95 via-ink-900/20 to-transparent">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0 ring-1" style={{ background: `${r.color}26`, color: locked ? "#6f6e86" : r.color, ["--tw-ring-color" as string]: `${r.color}66` }}><Icon name={locked ? "lock" : r.icon} size={22} /></div>
            <div className="min-w-0"><h3 className="font-display text-lg leading-tight truncate" style={{ color: locked ? "#a9a7bd" : r.color }}>{r.name}</h3><div className="text-xs text-mist truncate">{r.subtitle}</div></div>
          </div>
          <span className={cx("text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shrink-0", state === "cleared" ? "bg-gold-400/20 text-gold-300" : locked ? "bg-white/10 text-fog" : "bg-jade-500/15 text-jade-400")}>{state === "cleared" ? "Cleared" : locked ? `Level ${r.unlockLevel}` : "Explorable"}</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {locked ? (
          <div className="text-sm text-mist">Shrouded in fog. Reach <b className="text-parchment">Level {r.unlockLevel}</b> to enter — you&apos;re Level {level}.
            <Bar pct={level / r.unlockLevel} color={r.color} height={5} className="mt-2" /></div>
        ) : (
          <>
            <p className="text-sm text-mist italic">{r.story}</p>
            <ul className="space-y-2">
              {prog.map(({ m, cur }) => {
                const ok = cur >= m.target;
                return (
                  <li key={m.id} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full grid place-items-center shrink-0 ring-2" style={ok ? { background: r.color, color: "#0a0a10", ["--tw-ring-color" as string]: r.color } : { ["--tw-ring-color" as string]: "rgba(255,255,255,.15)" }}>{ok && <Icon name="check" size={12} strokeWidth={3} />}</span>
                    <span className={cx("text-sm flex-1 min-w-0", ok ? "text-parchment" : "text-mist")}>{m.label}</span>
                    {!ok && <span className="text-[11px] tabular text-fog shrink-0">{Math.min(Math.floor(cur), m.target)}/{m.target}</span>}
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between text-xs text-fog pt-1"><span>{done}/{r.milestones.length} milestones</span><span className={state === "cleared" ? "text-gold-300" : ""}>{state === "cleared" ? `Cleared ${fmtShort(d.cleared[r.id])} · +${r.xp} XP` : `Clear for +${r.xp} XP`}</span></div>
          </>
        )}
      </div>
    </Panel>
  );
}

export default function MapPage() {
  const d = useGame((s) => s.derived);
  const level = d.level.level;
  const rank = rankForLevel(level);
  const status = (r: Region): "locked" | "open" | "cleared" => (d.cleared[r.id] ? "cleared" : level >= r.unlockLevel ? "open" : "locked");
  const here = REGIONS.filter((r) => status(r) === "open").at(0) ?? REGIONS.filter((r) => status(r) === "cleared").at(-1) ?? REGIONS[0];
  return (
    <div>
      <PageHeader icon="map" title="The World" subtitle="Seven regions, one for each stage of your growth. Level up to unlock them; clear their milestones to claim them." />
      <div className="relative">
        <div className="absolute left-[19px] sm:left-1/2 top-0 bottom-0 w-px sm:-translate-x-1/2" style={{ background: "linear-gradient(180deg, rgba(227,176,75,.6), rgba(255,255,255,.08))" }} aria-hidden />
        <ol className="space-y-6">
          {REGIONS.map((r, i) => {
            const st = status(r);
            const isHere = r.id === here.id;
            const left = i % 2 === 0;
            return (
              <li key={r.id} className="relative sm:grid sm:grid-cols-2 sm:gap-10 pl-12 sm:pl-0 animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
                <div className={cx("absolute left-0 sm:left-1/2 top-6 sm:-translate-x-1/2 z-[1]")}>
                  {isHere ? <div className="-ml-0.5 sm:-ml-0"><Avatar size={40} pct={d.level.pct} color={rank.color} level={level} /></div> : (
                    <div className="w-[38px] h-[38px] rounded-full grid place-items-center ring-2 bg-ink-900" style={{ ["--tw-ring-color" as string]: st === "cleared" ? "#f6cb62" : st === "open" ? r.color : "rgba(255,255,255,.12)", color: st === "locked" ? "#6f6e86" : r.color }}><Icon name={st === "cleared" ? "check" : st === "locked" ? "lock" : r.icon} size={16} /></div>
                  )}
                </div>
                <div className={cx(left ? "sm:col-start-1" : "sm:col-start-2")}>
                  {isHere && <div className="text-[10px] font-bold uppercase tracking-widest text-gold-300 mb-1.5 pl-1">★ You are here</div>}
                  <RegionCard r={r} state={st} here={isHere} />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
