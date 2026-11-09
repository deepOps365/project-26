"use client";

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { Icon } from "./Icon";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

export function Panel({ children, className, gold, glow, accent, style, ...rest }: {
  children: ReactNode; className?: string; gold?: boolean; glow?: string; accent?: string; style?: CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cx("panel panel-pad", gold && "panel-gold", glow && "panel-glow", className)}
      style={{ ...(glow ? ({ "--glow": glow, "--accent": accent ?? glow } as CSSProperties) : null), ...style }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, icon, right, className }: { children: ReactNode; icon?: string; right?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex items-center justify-between gap-3 mb-3", className)}>
      <h2 className="rune-title flex items-center gap-2">
        {icon && <Icon name={icon} size={14} />}
        {children}
      </h2>
      {right}
    </div>
  );
}

export function PageHeader({ title, subtitle, right, icon }: { title: string; subtitle?: ReactNode; right?: ReactNode; icon?: string }) {
  return (
    <header className="flex items-start justify-between gap-4 mb-5 animate-rise">
      <div className="min-w-0">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold gold-text flex items-center gap-3">
          {icon && <Icon name={icon} size={26} className="text-gold-400 shrink-0" />}
          <span className="truncate">{title}</span>
        </h1>
        {subtitle && <p className="text-sm text-mist mt-1">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

/** Animated progress bar. pct is 0..1 */
export function Bar({ pct, color = "var(--color-gold-500)", height = 8, glow, className, label }: {
  pct: number; color?: string; height?: number; glow?: boolean; className?: string; label?: string;
}) {
  const p = Math.max(0, Math.min(1, Number.isFinite(pct) ? pct : 0));
  return (
    <div
      className={cx("relative w-full overflow-hidden rounded-full bg-black/45 ring-1 ring-white/5", className)}
      style={{ height }}
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)} aria-label={label}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: `${p * 100}%`,
          background: `linear-gradient(90deg, color-mix(in srgb, ${color} 70%, #000), ${color})`,
          boxShadow: glow ? `0 0 14px ${color}` : undefined,
        }}
      />
    </div>
  );
}

export function Ring({ pct, size = 56, stroke = 5, color = "var(--color-gold-500)", children, track = "rgba(255,255,255,.08)" }: {
  pct: number; size?: number; stroke?: number; color?: string; children?: ReactNode; track?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: "stroke-dashoffset .8s ease-out", filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide, footer }: {
  open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean; footer?: ReactNode;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  // Keep the latest onClose in a ref so the effect below runs only when `open` changes —
  // otherwise every re-render (e.g. each keystroke in an input) would re-focus the dialog.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = ref.current;
    if (el && !el.contains(document.activeElement)) el.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby={title ? id : undefined}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[pop_.2s_ease-out]" onClick={onClose} />
      <div
        ref={ref} tabIndex={-1}
        className={cx(
          "relative panel panel-gold w-full max-h-[88dvh] overflow-y-auto rounded-b-none sm:rounded-b-[1.1rem] animate-[rise_.28s_ease-out] outline-none",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
        style={{ paddingBottom: "calc(1.25rem + var(--safe-b))" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 pt-4 pb-3 bg-gradient-to-b from-[#1b1710] to-transparent">
          <h3 id={id} className="font-display text-lg gold-text">{title}</h3>
          <button onClick={onClose} className="btn btn-icon btn-sm" aria-label="Close"><Icon name="x" size={16} /></button>
        </div>
        <div className="px-5 pb-1">{children}</div>
        {footer && <div className="px-5 pt-3 flex gap-2 justify-end flex-wrap">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ open, title, body, confirmLabel = "Confirm", danger, onConfirm, onClose }: {
  open: boolean; title: string; body: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className={cx("btn", danger ? "btn-danger" : "btn-gold")} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
      </>}>
      <div className="text-sm text-mist leading-relaxed">{body}</div>
    </Modal>
  );
}

export function Segmented<T extends string>({ value, options, onChange, className }: {
  value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; className?: string;
}) {
  return (
    <div className={cx("inline-flex p-1 rounded-xl bg-black/40 ring-1 ring-white/5 gap-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cx("px-3 py-1.5 rounded-lg text-sm font-semibold transition min-h-9", value === o.value ? "bg-gold-400 text-[#1b1204] shadow" : "text-mist hover:text-parchment")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={cx("relative w-12 h-7 rounded-full transition shrink-0", on ? "bg-gold-500" : "bg-ink-500")}>
      <span className={cx("absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow", on ? "left-6" : "left-1")} />
    </button>
  );
}

export function Empty({ icon = "sparkles", title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="text-center py-8 px-4">
      <div className="mx-auto w-12 h-12 rounded-full grid place-items-center bg-white/5 ring-1 ring-white/10 text-fog mb-3"><Icon name={icon} size={22} /></div>
      <p className="font-display text-parchment">{title}</p>
      {children && <p className="text-sm text-mist mt-1 max-w-sm mx-auto">{children}</p>}
    </div>
  );
}

export function Stat({ label, value, sub, icon, color }: { label: string; value: ReactNode; sub?: ReactNode; icon?: string; color?: string }) {
  return (
    <div className="rounded-xl bg-black/30 ring-1 ring-white/5 px-3 py-2.5 min-w-0">
      <div className="label flex items-center gap-1.5">{icon && <Icon name={icon} size={12} style={{ color }} />}{label}</div>
      <div className="font-display text-xl tabular mt-0.5 truncate" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] text-fog truncate">{sub}</div>}
    </div>
  );
}

/** Hooded-adventurer sigil with an XP ring. Rank colours the glow. */
export function Avatar({ size = 120, pct, color, level }: { size?: number; pct: number; color: string; level: number }) {
  const id = useId().replace(/:/g, "");
  const R = 46, C = 2 * Math.PI * R;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size, ["--glow" as string]: `${color}66` }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="animate-glow overflow-visible">
        <defs>
          <radialGradient id={`bg${id}`} cx="50%" cy="38%" r="70%"><stop offset="0%" stopColor="#2a2640" /><stop offset="100%" stopColor="#0b0a12" /></radialGradient>
          <linearGradient id={`cl${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#3a3358" /><stop offset="100%" stopColor="#15121f" /></linearGradient>
        </defs>
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="3.2" />
        <circle cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - Math.max(0.005, pct))} transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 1s ease-out", filter: `drop-shadow(0 0 3px ${color})` }} />
        <circle cx="50" cy="50" r="39" fill={`url(#bg${id})`} stroke={color} strokeOpacity=".5" strokeWidth="1" />
        <path d="M50 21c-12 0-19 9-19 20 0 7 3 12 7 16l-8 21c8 6 32 6 40 0l-8-21c4-4 7-9 7-16 0-11-7-20-19-20z" fill={`url(#cl${id})`} stroke={color} strokeOpacity=".55" strokeWidth=".8" />
        <ellipse cx="50" cy="43" rx="9.5" ry="11.5" fill="#05040a" />
        <circle cx="46" cy="43" r="1.7" fill={color} style={{ filter: `drop-shadow(0 0 2px ${color})` }} />
        <circle cx="54" cy="43" r="1.7" fill={color} style={{ filter: `drop-shadow(0 0 2px ${color})` }} />
        <path d="M33 70c6 4 28 4 34 0" stroke={color} strokeOpacity=".4" strokeWidth=".8" fill="none" />
      </svg>
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-display tabular text-[#1b1204] ring-2 ring-[#0b0a12]"
        style={{ background: `linear-gradient(180deg, var(--color-gold-200), ${color})` }}>LV {level}</div>
    </div>
  );
}

export function Rarity({ r }: { r: string }) {
  return <span className="text-[10px] font-bold uppercase tracking-widest">{r}</span>;
}

/** Collapsible settings-style section. Controlled so quick-links can open it. */
export function Fold({ id, title, icon, summary, open, onToggle, tone, children }: {
  id: string; title: string; icon: string; summary?: ReactNode; open: boolean; onToggle: () => void; tone?: "danger" | "gold"; children: ReactNode;
}) {
  return (
    <section id={id} className={cx("panel overflow-hidden scroll-mt-4", tone === "gold" && "panel-gold", tone === "danger" && "!border-blood-500/30")}>
      <button className="w-full flex items-center gap-3.5 p-4 text-left" onClick={onToggle} aria-expanded={open} aria-controls={`${id}-body`}>
        <span className={cx("w-10 h-10 rounded-xl grid place-items-center shrink-0", tone === "danger" ? "bg-blood-500/15 text-blood-400" : "bg-gold-400/12 text-gold-400")} style={tone === "danger" ? undefined : { background: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)" }}><Icon name={icon} size={19} /></span>
        <span className="min-w-0 flex-1">
          <span className={cx("block font-display text-[15px]", tone === "danger" && "text-blood-400")}>{title}</span>
          {summary && <span className="block text-xs text-fog truncate">{summary}</span>}
        </span>
        <Icon name="down" size={16} className={cx("text-fog transition-transform shrink-0", open && "rotate-180")} />
      </button>
      {open && <div id={`${id}-body`} className="px-4 pb-5 pt-1 animate-rise"><div className="divider mb-4" />{children}</div>}
    </section>
  );
}
