"use client";

import { DAY_LETTERS, addDays, dow, fmtFull, journeyDay, parseISO, relativeDay, type ISODate } from "@/lib/dates";
import { sfx } from "@/lib/sound";
import { useGame } from "@/lib/store";
import { Icon } from "../Icon";
import { cx } from "../ui";

export function DateStrip({ date, onChange }: { date: ISODate; onChange: (d: ISODate) => void }) {
  const today = useGame((s) => s.today);
  const days = useGame((s) => s.derived.days);
  const start = useGame((s) => s.state.settings.startDate);
  const strip = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const go = (d: ISODate) => { if (d <= today) { sfx("tap"); onChange(d); } };
  const jd = journeyDay(start, date);
  return (
    <div className="panel !p-3">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <button className="btn btn-icon btn-sm" onClick={() => go(addDays(date, -1))} aria-label="Previous day"><Icon name="left" size={16} /></button>
        <div className="text-center min-w-0">
          <div className="font-display text-base">{relativeDay(date, today)}{jd >= 1 && jd <= 365 && <span className="text-fog text-xs font-sans"> · Day {jd}</span>}</div>
          <div className="text-xs text-fog">{fmtFull(date)}</div>
        </div>
        <button className="btn btn-icon btn-sm" onClick={() => go(addDays(date, 1))} disabled={date >= today} aria-label="Next day"><Icon name="right" size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {strip.map((d) => {
          const ev = days[d];
          const sel = d === date;
          return (
            <button key={d} onClick={() => go(d)} aria-label={relativeDay(d, today)} aria-pressed={sel}
              className={cx("rounded-xl py-1.5 flex flex-col items-center gap-1 transition ring-1", sel ? "bg-gold-400/15 ring-gold-500/50" : "ring-white/5 hover:bg-white/5")}>
              <span className="text-[10px] text-fog">{DAY_LETTERS[dow(d)]}</span>
              <span className="text-sm font-semibold tabular">{parseISO(d).getDate()}</span>
              <span className={cx("w-1.5 h-1.5 rounded-full", ev?.perfect ? "bg-gold-300" : ev?.kept ? "bg-jade-500" : ev && ev.questsDone > 0 ? "bg-fog" : "bg-white/10")} />
            </button>
          );
        })}
      </div>
      {date !== today && (
        <div className="flex items-center justify-between mt-2.5 text-xs">
          <span className="text-mist">Editing a past day — recovery is always welcome.</span>
          <button className="text-gold-300 font-semibold hover:underline" onClick={() => go(today)}>Back to today</button>
        </div>
      )}
    </div>
  );
}
