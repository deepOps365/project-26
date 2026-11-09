"use client";

import { cx } from "./ui";

export interface Datum { label: string; value: number | null; color?: string; title?: string; sub?: string }

/** Lightweight CSS bar chart. `null` values render as an empty slot (not logged). */
export function BarChart({ data, height = 120, max, ref: refLine, band, color = "var(--color-gold-500)", className, format = (n: number) => String(Math.round(n * 10) / 10) }: {
  data: Datum[]; height?: number; max?: number; ref?: { value: number; label: string; color?: string };
  band?: { from: number; to: number; color: string }; color?: string; className?: string; format?: (n: number) => string;
}) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value ?? 0), refLine?.value ?? 0, band?.to ?? 0) * 1.12;
  const y = (v: number) => `${Math.min(100, (v / top) * 100)}%`;
  return (
    <div className={cx("w-full", className)} role="img" aria-label={`Bar chart: ${data.map((d) => `${d.label} ${d.value ?? "none"}`).join(", ")}`}>
      <div className="relative" style={{ height }}>
        {band && <div className="absolute inset-x-0 rounded" style={{ bottom: y(band.from), height: `calc(${y(band.to)} - ${y(band.from)})`, background: band.color, opacity: 0.14 }} />}
        {refLine && (
          <div className="absolute inset-x-0 border-t border-dashed z-10" style={{ bottom: y(refLine.value), borderColor: refLine.color ?? "color-mix(in srgb, var(--color-gold-400) 67%, transparent)" }}>
            <span className="absolute right-0 -top-4 text-[10px] font-semibold px-1 rounded bg-ink-900/80" style={{ color: refLine.color ?? "var(--color-gold-400)" }}>{refLine.label}</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-end gap-1 sm:gap-1.5">
          {data.map((d, i) => (
            <div key={i} className="flex-1 h-full flex items-end group relative" title={d.title ?? `${d.label}: ${d.value == null ? "—" : format(d.value)}`}>
              {d.value != null && d.value > 0 ? (
                <div className="w-full rounded-t-md transition-[height] duration-700 ease-out min-h-[3px]" style={{ height: y(d.value), background: `linear-gradient(180deg, ${d.color ?? color}, color-mix(in srgb, ${d.color ?? color} 45%, #000))`, boxShadow: `0 0 10px -2px color-mix(in srgb, ${d.color ?? color} 53%, transparent)` }} />
              ) : <div className="w-full h-[3px] rounded bg-white/8" />}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-1 sm:gap-1.5 mt-1.5">
        {data.map((d, i) => <div key={i} className="flex-1 text-center text-[10px] text-fog truncate">{d.label}</div>)}
      </div>
    </div>
  );
}

/** Journey heatmap: columns are weeks (Sun→Sat), cell intensity = quests done that day. */
export function Heatmap({ cells, className }: { cells: { date: string; level: number; title: string; today?: boolean; future?: boolean; perfect?: boolean }[]; className?: string }) {
  const cols: (typeof cells)[] = [];
  let col: typeof cells = [];
  // pad the first column so rows line up with weekdays
  const firstDow = cells.length ? new Date(`${cells[0].date}T12:00:00`).getDay() : 0;
  for (let i = 0; i < firstDow; i++) col.push({ date: `pad${i}`, level: -1, title: "" });
  for (const c of cells) { col.push(c); if (col.length === 7) { cols.push(col); col = []; } }
  if (col.length) cols.push(col);
  const shade = ["bg-white/[.06]", "bg-jade-500/25", "bg-jade-500/45", "bg-jade-500/70", "bg-jade-400"];
  return (
    <div className={cx("overflow-x-auto no-scrollbar", className)}>
      <div className="flex gap-[3px] min-w-max" role="img" aria-label="Journey heatmap">
        {cols.map((c, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {c.map((cell) => cell.level < 0 ? <div key={cell.date} className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : (
              <div key={cell.date} title={cell.title}
                className={cx("w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[3px]", cell.future ? "bg-white/[.025]" : shade[Math.min(4, cell.level)], cell.perfect && "!bg-gold-300 shadow-[0_0_6px_#f6cb62]", cell.today && "ring-1 ring-gold-300")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
