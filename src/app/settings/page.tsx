"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Confirm, Fold, Modal, PageHeader, Panel, Segmented, Toggle, cx } from "@/components/ui";
import { DEFAULT_TARGETS, DEFAULT_XP, TARGET_LIMITS, configFor } from "@/lib/config";
import { FONTS, THEMES } from "@/lib/content/look";
import { SKILLS } from "@/lib/content/skills";
import { diffDays, fmtFull, isISO, journeyDay, journeyEnd } from "@/lib/dates";
import { loadBackup } from "@/lib/persist";
import { useGame } from "@/lib/store";
import { sfx } from "@/lib/sound";
import type { TextScale, Targets, XpTable } from "@/lib/types";

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

function useInstall() {
  const [ev, setEv] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const on = (e: Event) => { e.preventDefault(); setEv(e as BIPEvent); };
    const done = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", on); window.removeEventListener("appinstalled", done); };
  }, []);
  return { ev, installed, ios, install: async () => { if (!ev) return; await ev.prompt(); await ev.userChoice; setEv(null); } };
}

const download = (name: string, text: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};

const TARGET_FIELDS: { key: keyof Targets; label: string; unit: string; step?: number }[] = [
  { key: "sleepMin", label: "Sleep — minimum", unit: "h", step: 0.5 }, { key: "sleepMax", label: "Sleep — upper bound (no XP above)", unit: "h", step: 0.5 },
  { key: "readMin", label: "Reading — daily minimum", unit: "pages" }, { key: "readGoal", label: "Reading — bonus at", unit: "pages" },
  { key: "learnMin", label: "Learning — daily minimum", unit: "focused min" }, { key: "learnGoal", label: "Learning — bonus at", unit: "focused min" },
  { key: "moveMin", label: "Movement — daily minimum", unit: "min" }, { key: "meditateMin", label: "Meditation — bonus at", unit: "min" },
  { key: "screenLimit", label: "Screen limit (max 4h)", unit: "min" }, { key: "screenGoal", label: "Screen — deep-focus bonus at", unit: "min" },
  { key: "workTasks", label: "Work — daily tasks", unit: "tasks" }, { key: "streakQuests", label: "Quests needed to keep a day", unit: "of 6" },
];

export default function Settings() {
  const state = useGame((s) => s.state);
  const today = useGame((s) => s.today);
  const d = useGame((s) => s.derived);
  const g = useGame.getState();
  const cfg = configFor(state.configHistory, today);
  const [name, setName] = useState(state.settings.heroName);
  const [targets, setTargets] = useState<Targets>(cfg.targets);
  const [xp, setXp] = useState<XpTable>(cfg.xp);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<null | "replace" | "fresh" | "erase" | "backup">(null);
  const [typed, setTyped] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const install = useInstall();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const jump = useCallback((id: string) => {
    setOpen((o) => new Set(o).add(id));
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, []);
  useEffect(() => {
    const go = () => { const h = location.hash.replace("#", ""); if (h) jump(h === "phone" ? "phone" : h); };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, [jump]);
  const backup = typeof window !== "undefined" ? loadBackup() : null;
  const dirty = JSON.stringify(targets) !== JSON.stringify(cfg.targets) || JSON.stringify(xp) !== JSON.stringify(cfg.xp);
  const until = diffDays(today, state.settings.startDate);
  const jd = journeyDay(state.settings.startDate, today);

  const json = () => g.exportJSON();
  const stamp = () => new Date().toISOString().slice(0, 10);
  const doShare = async () => {
    const text = json();
    const file = new File([text], `project26-backup-${stamp()}.json`, { type: "application/json" });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Project 26 backup" });
      else if (navigator.share) await navigator.share({ title: "Project 26 backup", text });
      else { download(file.name, text); }
    } catch { /* cancelled */ }
  };
  const applyImport = (mode: "replace" | "merge") => { if (pending == null) return; const r = g.importJSON(pending, mode); setMsg({ ok: r.ok, text: r.message }); if (r.ok) { setPending(null); setPaste(""); } };
  const lastExport = state.lastExportAt ? Math.floor((Date.now() - state.lastExportAt) / 86400000) : null;

  const JUMPS: [string, string][] = [["look", "Look & feel"], ["backup", "Backup"], ["danger", "Reset"]];
  return (
    <div className="space-y-4">
      <PageHeader icon="settings" title="Settings" subtitle="Tune the rules, protect your progress, take the game with you." />
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1" aria-label="Jump to a section">
        {JUMPS.map(([id, label]) => <button key={id} className="chip shrink-0" onClick={() => jump(id)}>{label}</button>)}
      </div>

      <Panel className="flex items-center gap-3.5 border-blood-500/30">
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px]">Starting your real journey?</div>
          <div className="text-xs text-fog">Clears practice logs, tasks and books. Keeps your settings, look and shop.</div>
        </div>
        <button className="btn btn-danger shrink-0" onClick={() => setConfirm("fresh")}>Start fresh</button>
      </Panel>

      <Fold id="look" icon="palette" title="Look & feel" summary={`${THEMES.find((t) => t.id === state.settings.theme)?.name} · ${FONTS.find((f) => f.id === state.settings.font)?.name}`} open={open.has("look")} onToggle={() => toggle("look")}>
        <div className="space-y-6">
          <div>
            <div className="label mb-2.5">Colour theme</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {THEMES.map((t) => {
                const on = state.settings.theme === t.id;
                return (
                  <button key={t.id} onClick={() => { sfx("tap"); g.setLook({ theme: t.id }); }} aria-pressed={on}
                    className={cx("rounded-2xl p-2.5 text-left ring-2 transition active:scale-[.98]", on ? "ring-[var(--color-gold-400)]" : "ring-white/10 hover:ring-white/25")}>
                    <div className="rounded-xl p-2.5 mb-2" style={{ background: t.bg, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.07)" }}>
                      <div className="rounded-lg p-2" style={{ background: t.panel }}>
                        <div className="h-1.5 w-2/3 rounded-full mb-1.5" style={{ background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})` }} />
                        <div className="h-1 w-full rounded-full mb-1" style={{ background: t.text, opacity: 0.25 }} />
                        <div className="h-1 w-1/2 rounded-full" style={{ background: t.text, opacity: 0.25 }} />
                      </div>
                      <div className="flex gap-1.5 mt-2"><span className="w-3 h-3 rounded-full" style={{ background: t.accent }} /><span className="w-3 h-3 rounded-full" style={{ background: t.accent2 }} /></div>
                    </div>
                    <div className="text-sm font-semibold flex items-center justify-between">{t.name}{on && <Icon name="check" size={14} className="text-gold-400" strokeWidth={3} />}</div>
                    <div className="text-[11px] text-fog leading-snug">{t.tagline}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="label mb-2.5">Fonts</div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {FONTS.map((f) => {
                const on = state.settings.font === f.id;
                return (
                  <button key={f.id} onClick={() => { sfx("tap"); g.setLook({ font: f.id }); }} aria-pressed={on}
                    className={cx("rounded-2xl p-3.5 text-left ring-2 transition active:scale-[.99]", on ? "ring-[var(--color-gold-400)] bg-white/[.04]" : "ring-white/10 hover:ring-white/25")}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xl leading-tight gold-text" style={{ fontFamily: f.displayCss, fontWeight: 600 }}>{f.name}</span>
                      {on && <Icon name="check" size={14} className="text-gold-400 shrink-0" strokeWidth={3} />}
                    </div>
                    <div className="text-sm mt-1" style={{ fontFamily: f.displayCss, fontWeight: 600 }}>Level 12 · Explorer</div>
                    <div className="text-xs text-mist mt-1" style={{ fontFamily: f.bodyCss }}>Read 2 pages, learn 20 minutes, walk 15. Small steps, every day.</div>
                    <div className="text-[10px] text-fog mt-2">{f.display}{f.display !== f.body ? ` + ${f.body}` : ""} · {f.note}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="label mb-2.5">Text size</div>
            <Segmented<TextScale> value={state.settings.textScale} onChange={(v) => g.setLook({ textScale: v })} options={[{ value: "sm", label: "Compact" }, { value: "md", label: "Standard" }, { value: "lg", label: "Large" }]} />
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            <button className="btn btn-sm" onClick={() => g.setLook({ theme: "ember", font: "classic", textScale: "md" })}><Icon name="reset" size={13} />Back to the original look</button>
          </div>
          <p className="text-xs text-fog leading-relaxed">
            Want to explore beyond these? Browse <a className="text-gold-300 underline" href="https://fonts.google.com" target="_blank" rel="noopener noreferrer">fonts.google.com</a>, <a className="text-gold-300 underline" href="https://www.fontpair.co" target="_blank" rel="noopener noreferrer">fontpair.co</a> (ready-made pairings) and <a className="text-gold-300 underline" href="https://www.realtimecolors.com" target="_blank" rel="noopener noreferrer">realtimecolors.com</a> or <a className="text-gold-300 underline" href="https://coolors.co" target="_blank" rel="noopener noreferrer">coolors.co</a> (colour palettes). Tell me the font names or hex colours you like and I&apos;ll add them here as new options.
          </p>
        </div>
      </Fold>

      <Link href="/reminders/" className="panel flex items-center gap-3.5 p-4">
        <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)", color: "var(--color-gold-400)" }}><Icon name="bell" size={19} /></span>
        <span className="min-w-0 flex-1"><span className="block font-display text-[15px]">Reminders</span><span className="block text-xs text-fog truncate">Time-of-day nudges on your phone</span></span>
        <Icon name="right" size={16} className="text-fog" />
      </Link>

      <Fold id="hero" icon="crown" title="Hero & journey" summary={`${state.settings.heroName || "Hero"} · ${until > 0 ? `starts in ${until} day${until === 1 ? "" : "s"}` : jd <= 365 ? `day ${jd} of 365` : "complete"}`} open={open.has("hero")} onToggle={() => toggle("hero")}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label block mb-1.5" htmlFor="name">Hero name</label><input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => g.setHeroName(name)} maxLength={24} /></div>
          <div>
            <label className="label block mb-1.5" htmlFor="start">Journey starts</label>
            <input id="start" type="date" className="input" value={state.settings.startDate} onChange={(e) => isISO(e.target.value) && g.setStartDate(e.target.value)} />
            <p className="text-[11px] text-fog mt-1.5">Ends {fmtFull(journeyEnd(state.settings.startDate))} · {until > 0 ? `begins in ${until} day${until === 1 ? "" : "s"}` : jd <= 365 ? `day ${jd} of 365` : "complete"}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
          <div><div className="text-sm font-semibold">Sound effects</div><div className="text-xs text-fog">Soft, synthesised chimes. Mute any time.</div></div>
          <Toggle on={state.settings.sound} onChange={g.setSound} label="Sound effects" />
        </div>
      </Fold>

      <Fold id="phone" icon="phone" tone="gold" title="Phone & install" summary="Use it on phone and laptop" open={open.has("phone")} onToggle={() => toggle("phone")}>
        <div className="space-y-3 text-sm text-mist">
          <p>Project 26 is a web app that works offline once installed. Open the <b className="text-parchment">same web address</b> on both devices — but note: <b className="text-parchment">progress is stored on each device separately</b> (there is no server). Move progress between devices with a backup file; <em>Merge</em> combines both without double-counting.</p>
          {install.installed ? <p className="text-jade-400 flex items-center gap-2"><Icon name="check" size={16} />Installed — you&apos;re running it as an app.</p> : install.ev ? (
            <button className="btn btn-gold" onClick={install.install}><Icon name="download" size={16} />Install as an app</button>
          ) : install.ios ? (
            <ol className="list-decimal pl-5 space-y-1"><li>Open this page in <b className="text-parchment">Safari</b>.</li><li>Tap the <b className="text-parchment">Share</b> button, then <b className="text-parchment">Add to Home Screen</b>.</li></ol>
          ) : (
            <p className="text-fog">On Android Chrome: menu ⋮ → <b className="text-parchment">Install app</b>. On desktop Chrome/Edge: the install icon in the address bar. (Install needs the page to be served over HTTPS or localhost.)</p>
          )}
        </div>
      </Fold>

      <Fold id="rules" icon="target" title="Quest rules" summary={dirty ? "Unsaved changes" : "XP and daily targets"} open={open.has("rules")} onToggle={() => toggle("rules")}>
        <p className="text-xs text-fog mb-4 -mt-1">Changes apply <b className="text-mist">from today forward</b> — past days keep the rules they were played under, so your history is never re-scored.</p>
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3">
          {TARGET_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="label block mb-1">{f.label}</span>
              <div className="relative">
                <input type="number" className="input pr-20" step={f.step ?? 1} min={TARGET_LIMITS[f.key][0]} max={TARGET_LIMITS[f.key][1]} value={targets[f.key]} onChange={(e) => setTargets({ ...targets, [f.key]: Number(e.target.value) })} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fog pointer-events-none">{f.unit}</span>
              </div>
            </label>
          ))}
        </div>
        <div className="divider my-5" />
        <h3 className="text-sm font-semibold mb-3">XP per quest</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(["sleep", "reading", "learning", "health", "screen", "work"] as const).map((k) => (
            <label key={k} className="block"><span className="label block mb-1" style={{ color: SKILLS[k].color }}>{SKILLS[k].quest}</span><input type="number" min={0} max={100} className="input" value={xp[k]} onChange={(e) => setXp({ ...xp, [k]: Number(e.target.value) })} /></label>
          ))}
          {([["reflection", "Reflection"], ["flawless", "Flawless day"], ["comeback", "Comeback"]] as const).map(([k, l]) => (
            <label key={k} className="block"><span className="label block mb-1">{l}</span><input type="number" min={0} max={100} className="input" value={xp[k]} onChange={(e) => setXp({ ...xp, [k]: Number(e.target.value) })} /></label>
          ))}
        </div>
        <div className="flex gap-2 mt-5 flex-wrap">
          <button className="btn btn-gold" disabled={!dirty} onClick={() => { g.updateConfig({ targets, xp }); setSaved(true); setTimeout(() => setSaved(false), 2500); }}>Save from today</button>
          <button className="btn" onClick={() => { setTargets({ ...DEFAULT_TARGETS }); setXp({ ...DEFAULT_XP }); }}>Load defaults</button>
          {dirty && <button className="btn" onClick={() => { setTargets(cfg.targets); setXp(cfg.xp); }}>Discard</button>}
        </div>
      </Fold>

      <Fold id="backup" icon="download" title="Backup & restore" summary={lastExport == null ? "Not exported yet" : lastExport === 0 ? "Exported today" : `Exported ${lastExport} day${lastExport === 1 ? "" : "s"} ago`} open={open.has("backup")} onToggle={() => toggle("backup")}>
        <p className="text-sm text-mist mb-1">Everything lives in this browser. {lastExport == null ? "You haven't exported a backup yet." : lastExport === 0 ? "Last exported today." : `Last exported ${lastExport} day${lastExport === 1 ? "" : "s"} ago.`}</p>
        <p className="text-xs text-fog mb-4">Tip: export weekly (e.g. after your Sunday boss) and keep the file somewhere safe — cloud drive or email it to yourself.</p>
        <div className="flex flex-wrap gap-2 mb-5">
          <button className="btn btn-gold" onClick={() => download(`project26-backup-${stamp()}.json`, json())}><Icon name="download" size={16} />Download backup</button>
          <button className="btn" onClick={doShare}><Icon name="share" size={16} />Share / send to phone</button>
          <button className="btn" onClick={async () => { await navigator.clipboard?.writeText(json()); setMsg({ ok: true, text: "Backup copied to clipboard — paste it into a note or message." }); }}><Icon name="copy" size={16} />Copy as text</button>
        </div>
        <div className="divider mb-4" />
        <h3 className="text-sm font-semibold mb-2">Import</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setPending(await f.text()); setMsg(null); } e.target.value = ""; }} />
          <button className="btn" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} />Choose backup file</button>
        </div>
        <textarea className="input" rows={3} placeholder="…or paste backup text here" value={paste} onChange={(e) => { setPaste(e.target.value); setPending(e.target.value.trim() ? e.target.value : null); setMsg(null); }} aria-label="Paste backup JSON" />
        {pending != null && (
          <div className="mt-3 rounded-xl bg-black/30 ring-1 ring-white/10 p-3.5 space-y-3">
            <p className="text-sm text-mist">Backup ready. How should it be applied?</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-gold" onClick={() => applyImport("merge")}>Merge into this device</button>
              <button className="btn btn-danger" onClick={() => setConfirm("replace")}>Replace everything</button>
              <button className="btn" onClick={() => { setPending(null); setPaste(""); }}>Cancel</button>
            </div>
            <p className="text-[11px] text-fog"><b className="text-mist">Merge</b> keeps every entry from both devices (nothing is double-counted). <b className="text-mist">Replace</b> overwrites this device with the backup.</p>
          </div>
        )}
        {msg && <p className={`text-sm mt-3 ${msg.ok ? "text-jade-400" : "text-blood-400"}`}>{msg.text}</p>}
        {backup && (
          <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-fog">Automatic safety net: a snapshot from before {backup.date}&apos;s first change is kept in this browser.</p>
            <button className="btn btn-sm" onClick={() => setConfirm("backup")}><Icon name="reset" size={13} />Restore it</button>
          </div>
        )}
      </Fold>

      <Fold id="how" icon="scroll" title="How the rules work" summary="XP, streaks, shield, limits" open={open.has("how")} onToggle={() => toggle("how")}>
        <ul className="space-y-2.5 text-sm text-mist">
          {[
            ["Nothing is claimed", "XP is always calculated from what you logged. Fix a mistake and the XP corrects itself; you can never get paid twice."],
            ["Minimums & partial credit", "Reaching a quest's minimum earns full XP. Reaching half earns 40% — hard days still count."],
            ["Days kept & the shield", `A day is kept with ${cfg.targets.streakQuests}+ quests. One missed day per week is shielded and never breaks your streak. Return after 2+ days away for a comeback bonus.`],
            ["Healthy limits", "Oversleeping, 90+ minutes of exercise and marathon study days don't earn extra. Passive study counts half. Screen limits can be tightened, never loosened past 4 hours."],
            ["Bosses", "Every Sunday a new boss arrives (weeks run Sun–Sat). Objectives are counts — consistency wins, perfection isn't required."],
            ["Gold", "1 earned XP = 1 gold. Spending gold on treats never lowers your level."],
          ].map(([t, b]) => <li key={t} className="flex gap-3"><Icon name="sparkles" size={15} className="text-gold-400 mt-1 shrink-0" /><span><b className="text-parchment">{t}.</b> {b}</span></li>)}
        </ul>
      </Fold>

      <Fold id="danger" icon="warn" tone="danger" title="Reset · Start fresh" summary="Clear practice data on Day 1, or erase everything" open={open.has("danger")} onToggle={() => toggle("danger")}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap"><div className="text-sm"><b>Start fresh</b><div className="text-xs text-fog">Clears all logs, tasks, books and claims. Keeps your settings, rules and shop. Perfect for Day 1.</div></div><button className="btn btn-danger" onClick={() => setConfirm("fresh")}>Start fresh</button></div>
          <div className="flex items-center justify-between gap-3 flex-wrap"><div className="text-sm"><b>Erase everything</b><div className="text-xs text-fog">Factory reset — removes all data from this browser.</div></div><button className="btn btn-danger" onClick={() => { setTyped(""); setConfirm("erase"); }}>Erase everything</button></div>
        </div>
      </Fold>
      <p className="text-center text-xs text-fog pb-4">PROJECT 26 · {d.stats.keptDays} days kept · built to be needed less, not more.</p>

      <Confirm open={confirm === "replace"} danger title="Replace everything?" body="This device's current progress will be overwritten by the backup. Export first if you're unsure." confirmLabel="Replace" onConfirm={() => applyImport("replace")} onClose={() => setConfirm(null)} />
      <Confirm open={confirm === "backup"} danger title="Restore the automatic snapshot?" body="This replaces your current progress with the snapshot taken before today's first change." confirmLabel="Restore" onConfirm={() => setMsg(g.restoreBackup() ? { ok: true, text: "Snapshot restored." } : { ok: false, text: "No snapshot found." })} onClose={() => setConfirm(null)} />
      <Confirm open={confirm === "fresh"} danger title="Start fresh?" body="All logged days, tasks, books, reflections and claimed rewards will be cleared. Settings, rules and the shop stay. Consider exporting a backup first." confirmLabel="Start fresh" onConfirm={() => g.resetProgress()} onClose={() => setConfirm(null)} />
      <Modal open={confirm === "erase"} onClose={() => setConfirm(null)} title="Erase everything?"
        footer={<><button className="btn" onClick={() => setConfirm(null)}>Cancel</button><button className="btn btn-danger" disabled={typed.trim().toUpperCase() !== "RESET"} onClick={() => { g.eraseEverything(); setConfirm(null); }}>Erase</button></>}>
        <p className="text-sm text-mist mb-3">This removes <b>all</b> data from this browser and cannot be undone. Type <b className="text-parchment">RESET</b> to confirm.</p>
        <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="RESET" autoFocus aria-label="Type RESET to confirm" />
      </Modal>
    </div>
  );
}
