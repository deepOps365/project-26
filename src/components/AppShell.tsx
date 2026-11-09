"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { journeyDay, JOURNEY_DAYS, diffDays, fmtFull } from "@/lib/dates";
import { rankForLevel } from "@/lib/progression";
import { useGame, type GameEvent } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { Icon } from "./Icon";
import { Modal, cx } from "./ui";

const NAV = [
  { href: "/", label: "Hero", icon: "home" },
  { href: "/quests/", label: "Quests", icon: "scroll" },
  { href: "/skills/", label: "Skills", icon: "sparkles" },
  { href: "/battle/", label: "Battle", icon: "swords" },
  { href: "/reflect/", label: "Reflect", icon: "feather" },
  { href: "/reminders/", label: "Reminders", icon: "bell" },
  { href: "/achievements/", label: "Trophies", icon: "trophy" },
  { href: "/map/", label: "World", icon: "map" },
  { href: "/rewards/", label: "Shop", icon: "gift" },
  { href: "/stats/", label: "Stats", icon: "chart" },
  { href: "/settings/", label: "Settings", icon: "settings" },
];
const BOTTOM = ["/", "/quests/", "/skills/", "/reflect/"];

const norm = (p: string) => (p.endsWith("/") ? p : p + "/");

function Embers() {
  // deterministic so server and client markup match
  const items = useMemo(() => Array.from({ length: 16 }, (_, i) => ({
    left: (i * 61) % 100, size: 2 + (i % 3), dur: 14 + ((i * 7) % 12), delay: -((i * 5) % 20), dx: ((i % 5) - 2) * 18,
    color: i % 3 === 0 ? "#b592ff" : i % 3 === 1 ? "#f6cb62" : "#5eeaa8",
  })), []);
  return (
    <div className="embers fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      {items.map((e, i) => (
        <span key={i} className="absolute bottom-[-10px] rounded-full"
          style={{ left: `${e.left}%`, width: e.size, height: e.size, background: e.color, boxShadow: `0 0 8px ${e.color}`, animation: `ember ${e.dur}s linear ${e.delay}s infinite`, ["--dx" as string]: `${e.dx}px`, opacity: 0 }} />
      ))}
    </div>
  );
}

function Splash() {
  return (
    <div className="min-h-dvh grid place-items-center">
      <div className="text-center animate-float">
        <div className="font-display text-4xl gold-text tracking-[0.2em]">PROJECT 26</div>
        <div className="text-fog text-xs mt-2 tracking-widest uppercase">Loading your world…</div>
      </div>
    </div>
  );
}

function Sigil({ burst, color }: { burst?: boolean; color: string }) {
  const rays = Array.from({ length: 12 });
  const sparks = Array.from({ length: 18 });
  return (
    <div className="relative w-44 h-44 mx-auto grid place-items-center">
      {burst && rays.map((_, i) => (
        <div key={i} className="absolute left-1/2 top-1/2 h-1 w-24 origin-left rounded-full"
          style={{ transform: `rotate(${i * 30}deg)`, background: `linear-gradient(90deg, ${color}, transparent)`, animation: `burst 1.6s ease-out ${i * 0.03}s both` }} />
      ))}
      {burst && sparks.map((_, i) => {
        const a = (i / sparks.length) * Math.PI * 2, d = 70 + (i % 3) * 22;
        return <span key={i} className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full" style={{ background: i % 2 ? "#fff0c2" : color, ["--x" as string]: `${Math.cos(a) * d}px`, ["--y" as string]: `${Math.sin(a) * d}px`, animation: `spark 1.4s ease-out ${0.1 + (i % 6) * 0.05}s both` }} />;
      })}
    </div>
  );
}

function Celebration({ ev, onClose }: { ev: GameEvent; onClose: () => void }) {
  const color = ev.color ?? "#f6cb62";
  const isLevel = ev.type === "level" || ev.type === "rank";
  return (
    <Modal open onClose={onClose}>
      <div className="relative text-center pb-2 -mt-6">
        <Sigil burst color={color} />
        <div className="-mt-32 relative">
          <div className="mx-auto w-20 h-20 rounded-full grid place-items-center animate-pop" style={{ background: `radial-gradient(circle, ${color}55, transparent 70%)`, boxShadow: `0 0 50px ${color}88` }}>
            <Icon name={ev.icon ?? "crown"} size={40} style={{ color }} strokeWidth={1.5} />
          </div>
        </div>
        <div className="mt-14">
          <div className="rune-title">{ev.type === "rank" ? "New rank" : ev.type === "level" ? "Level up" : ev.type === "boss" ? "Boss defeated" : "Region cleared"}</div>
          <h2 className="font-display text-3xl gold-text mt-1">{ev.title}</h2>
          {isLevel && ev.level && <div className="font-display text-6xl tabular mt-2" style={{ color }}>{ev.level}</div>}
          {ev.subtitle && <p className="text-mist mt-2 text-sm max-w-xs mx-auto">{ev.subtitle}</p>}
          <button className="btn btn-gold mt-6 px-8" onClick={() => { sfx("tap"); onClose(); }}>Continue</button>
        </div>
      </div>
    </Modal>
  );
}

function Toasts() {
  const events = useGame((s) => s.events);
  const dismiss = useGame((s) => s.dismissEvent);
  const toasts = events.filter((e) => !["level", "rank", "boss", "region"].includes(e.type)).slice(-3);
  const modal = events.find((e) => ["level", "rank", "boss", "region"].includes(e.type));
  useEffect(() => {
    const timers = toasts.map((t) => setTimeout(() => dismiss(t.id), t.type === "achievement" ? 5200 : 3200));
    return () => timers.forEach(clearTimeout);
  }, [toasts.map((t) => t.id).join(","), dismiss]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className="fixed left-0 right-0 z-[90] flex flex-col items-center gap-2 px-3 pointer-events-none" style={{ top: "calc(0.75rem + var(--safe-t))" }} aria-live="polite">
        {toasts.map((t) => {
          const c = t.color ?? (t.type === "xp" ? "#f6cb62" : t.type === "correction" ? "#a9a7bd" : "#b592ff");
          return (
            <button key={t.id} onClick={() => dismiss(t.id)} className="pointer-events-auto animate-toast panel px-4 py-3 w-full max-w-sm text-left flex items-center gap-3"
              style={{ borderColor: `${c}66`, boxShadow: `0 0 28px -6px ${c}77, 0 14px 30px -12px #000` }}>
              <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: `${c}22`, color: c }}>
                <Icon name={t.type === "xp" ? "zap" : t.type === "correction" ? "undo" : t.icon ?? "star"} size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-base leading-tight" style={{ color: c }}>{t.title}</div>
                {t.subtitle && <div className="text-xs text-mist truncate">{t.subtitle}</div>}
                {t.lines && <div className="text-xs text-mist truncate">{t.lines.map((l) => l.label).join(" · ")}</div>}
              </div>
            </button>
          );
        })}
      </div>
      {modal && <Celebration ev={modal} onClose={() => dismiss(modal.id)} />}
    </>
  );
}

function Onboarding() {
  const [name, setName] = useState("");
  const done = useGame((s) => s.completeOnboarding);
  const start = useGame((s) => s.state.settings.startDate);
  const today = useGame((s) => s.today);
  const until = diffDays(today, start);
  return (
    <Modal open onClose={() => done(name)} title="Welcome, adventurer">
      <div className="space-y-4 text-sm text-mist">
        <p>
          <span className="text-parchment font-semibold">PROJECT 26</span> turns your real year into a game — but the real wins happen <em>off</em> this screen. Check in fast, then go live your life.
        </p>
        <ul className="space-y-2">
          {[
            ["target", "Minimums are small on purpose.", "2 pages, 20 minutes, 15 minutes. On a hard day, the minimum is a victory."],
            ["shield", "Missing a day never breaks you.", "One rest day per week is shielded. Coming back earns a bonus, never shame."],
            ["sofa", "Rest is free.", "The shop is for treats — you never have to earn the right to relax."],
          ].map(([i, t, d]) => (
            <li key={t} className="flex gap-3"><Icon name={i} size={18} className="text-gold-400 mt-0.5 shrink-0" /><span><span className="text-parchment font-semibold">{t}</span> {d}</span></li>
          ))}
        </ul>
        <div>
          <label className="label block mb-1.5" htmlFor="hero">What should we call your hero?</label>
          <input id="hero" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={24} autoFocus onKeyDown={(e) => e.key === "Enter" && done(name)} />
        </div>
        <p className="text-xs text-fog">
          {until > 0 ? `Your journey begins ${fmtFull(start)} — ${until} day${until === 1 ? "" : "s"} from now. Until then you can practise freely; use “Start fresh” in Settings on Day 1.` : `Your journey began ${fmtFull(start)}.`}
        </p>
        <button className="btn btn-gold w-full" onClick={() => { sfx("open"); done(name); }}>Begin the journey</button>
      </div>
    </Modal>
  );
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = norm(usePathname() || "/");
  return (
    <Modal open={open} onClose={onClose} title="The Realm">
      <div className="grid grid-cols-3 gap-2.5 pb-2">
        {NAV.filter((n) => !BOTTOM.includes(n.href)).map((n) => (
          <Link key={n.href} href={n.href} onClick={onClose}
            className={cx("panel flex flex-col items-center gap-2 py-4 text-sm font-semibold", pathname === n.href && "panel-gold")}>
            <Icon name={n.icon} size={24} className="text-gold-400" />{n.label}
          </Link>
        ))}
        <Link href="/journal/" onClick={onClose} className="panel flex flex-col items-center gap-2 py-4 text-sm font-semibold"><Icon name="bookmarked" size={24} className="text-gold-400" />Journal</Link>
      </div>
    </Modal>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useGame((s) => s.hydrated);
  const init = useGame((s) => s.init);
  const tick = useGame((s) => s.tick);
  const onboarded = useGame((s) => s.state.onboarded);
  const notice = useGame((s) => s.notice);
  const setNotice = useGame((s) => s.setNotice);
  const corruptRaw = useGame((s) => s.corruptRaw);
  const state = useGame((s) => s.state);
  const derived = useGame((s) => s.derived);
  const today = useGame((s) => s.today);
  const pathname = norm(usePathname() || "/");
  const [more, setMore] = useState(false);
  const { theme, font, textScale } = state.settings;

  useEffect(() => { init(); }, [init]);
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = theme; el.dataset.font = font; el.dataset.scale = textScale;
    try { localStorage.setItem("p26-look", JSON.stringify({ t: theme, f: font, s: textScale })); } catch { /* optional */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", getComputedStyle(el).getPropertyValue("--color-ink-950").trim() || "#06060a");
  }, [theme, font, textScale]);
  useEffect(() => { const t = setInterval(tick, 30_000); return () => clearInterval(t); }, [tick]);
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator && window.isSecureContext) {
      const hadController = !!navigator.serviceWorker.controller;
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        // A new version just took over: refresh once so you're on it (skipped while you're typing — data is already saved).
        const a = document.activeElement?.tagName;
        if (!hadController || reloaded || a === "INPUT" || a === "TEXTAREA") return;
        reloaded = true; location.reload();
      });
      navigator.serviceWorker.register(`${base}/sw.js`).then((reg) => {
        document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });
      }).catch(() => {});
    }
  }, []);
  useEffect(() => { setMore(false); window.scrollTo({ top: 0 }); }, [pathname]);

  if (!hydrated) return <Splash />;

  const level = derived.level.level;
  const rank = rankForLevel(level);
  const day = journeyDay(state.settings.startDate, today);

  return (
    <div className="relative z-[1] min-h-dvh md:flex">
      <Embers />
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 sticky top-0 h-dvh p-4 gap-3 z-10">
        <Link href="/" className="panel panel-gold p-4 block text-center">
          <div className="font-display text-xl gold-text tracking-[0.18em]">PROJECT 26</div>
          <div className="text-[10px] text-fog tracking-widest uppercase mt-1">365 days · one character</div>
        </Link>
        <nav className="panel p-2 flex-1 flex flex-col gap-0.5 overflow-y-auto no-scrollbar">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => sfx("tap")}
              className={cx("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition", pathname === n.href ? "bg-gold-400/15 text-gold-300 ring-1 ring-gold-500/30" : "text-mist hover:text-parchment hover:bg-white/5")}>
              <Icon name={n.icon} size={18} />{n.label}
            </Link>
          ))}
          <Link href="/journal/" className={cx("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition", pathname === "/journal/" ? "bg-gold-400/15 text-gold-300 ring-1 ring-gold-500/30" : "text-mist hover:text-parchment hover:bg-white/5")}>
            <Icon name="bookmarked" size={18} />Journal
          </Link>
        </nav>
        <div className="panel px-4 py-3 text-xs">
          <div className="flex justify-between text-mist"><span style={{ color: rank.color }} className="font-semibold">{rank.name}</span><span>Lv {level}</span></div>
          <div className="text-fog mt-0.5">{day < 1 ? "Prologue" : day > JOURNEY_DAYS ? "Epilogue" : `Day ${day} of ${JOURNEY_DAYS}`}</div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 relative z-[2]">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-5 pb-28 md:pb-12" style={{ paddingTop: "calc(1.25rem + var(--safe-t))" }}>
          {corruptRaw && (
            <div className="panel panel-pad mb-4 border-blood-500/50 text-sm">
              <div className="font-semibold text-blood-400 mb-1">Saved data couldn&apos;t be read</div>
              <p className="text-mist">Your browser has data under this app that isn&apos;t valid, so a fresh game was started. The unreadable data is kept — you can download it, or restore your automatic daily backup in Settings.</p>
              <button className="btn btn-sm mt-2" onClick={() => { const b = new Blob([corruptRaw], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "project26-unreadable-data.json"; a.click(); }}>Download unreadable data</button>
            </div>
          )}
          {notice && (
            <div className="panel panel-pad mb-4 border-blood-500/50 text-sm flex items-start gap-3">
              <Icon name="warn" size={18} className="text-blood-400 mt-0.5 shrink-0" /><p className="text-mist flex-1">{notice}</p>
              <button className="btn btn-icon btn-sm" onClick={() => setNotice(null)} aria-label="Dismiss"><Icon name="x" size={14} /></button>
            </div>
          )}
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-ink-900/92 backdrop-blur-xl" style={{ paddingBottom: "var(--safe-b)" }} aria-label="Primary">
        <ul className="grid grid-cols-5 max-w-lg mx-auto">
          {NAV.filter((n) => BOTTOM.includes(n.href)).map((n) => {
            const on = pathname === n.href;
            return (
              <li key={n.href}>
                <Link href={n.href} onClick={() => sfx("tap")} className={cx("flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-semibold transition", on ? "text-gold-300" : "text-fog")}>
                  <span className={cx("grid place-items-center w-11 h-7 rounded-full transition", on && "bg-gold-400/15")}><Icon name={n.icon} size={20} /></span>{n.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button onClick={() => { sfx("open"); setMore(true); }} className={cx("w-full flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-semibold", !BOTTOM.includes(pathname) ? "text-gold-300" : "text-fog")}>
              <span className="grid place-items-center w-11 h-7"><Icon name="menu" size={20} /></span>More
            </button>
          </li>
        </ul>
      </nav>
      <MoreSheet open={more} onClose={() => setMore(false)} />
      <Toasts />
      {!onboarded && <Onboarding />}
    </div>
  );
}
