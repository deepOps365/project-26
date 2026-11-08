"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Bar, Confirm, Empty, Modal, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { fmtShort } from "@/lib/dates";
import { fmtNum } from "@/lib/format";
import { sfx } from "@/lib/sound";
import { useGame } from "@/lib/store";
import type { Reward } from "@/lib/types";

const ICONS = ["tv", "gamepad", "cookie", "sofa", "book", "compass", "utensils", "gift", "coins", "sparkles", "moon", "sun", "heart", "map", "star", "trophy"];

function RewardForm({ initial, onSave, onClose }: { initial?: Reward; onSave: (r: Omit<Reward, "id">) => void; onClose: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [cost, setCost] = useState(String(initial?.cost ?? 100));
  const [icon, setIcon] = useState(initial?.icon ?? "gift");
  const [minLevel, setMinLevel] = useState(initial?.minLevel ? String(initial.minLevel) : "");
  const ok = title.trim() && Number(cost) >= 0;
  return (
    <div className="space-y-3">
      <div><label className="label block mb-1" htmlFor="rw-title">Reward</label><input id="rw-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Movie night" maxLength={80} autoFocus /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label block mb-1" htmlFor="rw-cost">Cost (gold)</label><input id="rw-cost" className="input" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value.replace(/\D/g, ""))} /></div>
        <div><label className="label block mb-1" htmlFor="rw-lvl">Min. level (optional)</label><input id="rw-lvl" className="input" inputMode="numeric" value={minLevel} onChange={(e) => setMinLevel(e.target.value.replace(/\D/g, ""))} placeholder="none" /></div>
      </div>
      <div className="flex flex-wrap gap-2">{ICONS.map((i) => <button key={i} className="chip !p-2 !min-h-0" data-on={icon === i} onClick={() => setIcon(i)} aria-label={i} aria-pressed={icon === i}><Icon name={i} size={16} /></button>)}</div>
      <div className="flex gap-2 justify-end pt-1"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-gold" disabled={!ok} onClick={() => { onSave({ title, cost: Number(cost) || 0, icon, minLevel: Number(minLevel) || undefined }); onClose(); }}>Save</button></div>
    </div>
  );
}

export default function Rewards() {
  const state = useGame((s) => s.state);
  const d = useGame((s) => s.derived);
  const { redeem, refund, addReward, updateReward, removeReward } = useGame.getState();
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [form, setForm] = useState<{ open: boolean; edit?: Reward }>({ open: false });
  const [del, setDel] = useState<Reward | null>(null);
  const history = [...state.redemptions].sort((a, b) => b.ts - a.ts);
  const rewards = [...state.rewards].sort((a, b) => a.cost - b.cost);

  return (
    <div className="space-y-5">
      <PageHeader icon="gift" title="Reward Shop" subtitle="Optional treats you define yourself. Spend gold earned from XP — spending never lowers your level." right={<button className="btn btn-gold btn-sm" onClick={() => setForm({ open: true })}><Icon name="plus" size={14} />New reward</button>} />
      <Panel gold className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl grid place-items-center bg-gold-400/15 text-gold-300 shrink-0" style={{ boxShadow: "0 0 24px rgba(246,203,98,.3)" }}><Icon name="coins" size={28} /></div>
        <div className="flex-1"><div className="font-display text-3xl gold-text tabular">{fmtNum(d.gold)} <span className="text-base text-mist font-sans">gold</span></div><div className="text-xs text-fog tabular">{fmtNum(d.totalXp)} earned · {fmtNum(d.spent)} spent</div></div>
      </Panel>
      <Panel className="flex gap-3 items-start border-jade-500/25"><Icon name="sofa" size={20} className="text-jade-400 mt-0.5 shrink-0" /><p className="text-sm text-mist"><b className="text-parchment">Rest is always free.</b> Sleeping in, a slow evening, a walk, a good meal with friends — none of that needs to be earned. The shop is only for extra treats you&apos;d like a little ceremony around.</p></Panel>

      {rewards.length === 0 ? <Panel><Empty icon="gift" title="No rewards yet">Add something you&apos;d genuinely look forward to.</Empty></Panel> : (
        <div className="grid sm:grid-cols-2 gap-3">
          {rewards.map((r) => {
            const lvlLocked = !!r.minLevel && d.level.level < r.minLevel;
            const afford = d.gold >= r.cost;
            return (
              <Panel key={r.id} className={afford && !lvlLocked ? "panel-glow" : ""} glow={afford && !lvlLocked ? "rgba(246,203,98,.35)" : undefined} accent="#f6cb62">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl grid place-items-center shrink-0" style={lvlLocked ? { background: "rgba(255,255,255,.05)", color: "#6f6e86" } : { background: "rgba(246,203,98,.12)", color: "#f6cb62" }}><Icon name={lvlLocked ? "lock" : r.icon} size={22} /></div>
                  <div className="min-w-0 flex-1"><div className="font-display text-[15px] leading-snug">{r.title}</div><div className="text-xs text-fog mt-0.5">{lvlLocked ? `Unlocks at Level ${r.minLevel}` : r.minLevel ? `Level ${r.minLevel}+ ✓` : "Always available"}</div></div>
                  <div className="text-right shrink-0"><div className="font-display text-gold-300 tabular">{fmtNum(r.cost)}</div><div className="text-[10px] text-fog tracking-widest">GOLD</div></div>
                </div>
                {!afford && !lvlLocked && <div className="mt-3"><Bar pct={d.gold / Math.max(1, r.cost)} color="#f6cb62" height={5} /><div className="text-[11px] text-fog mt-1 tabular">{fmtNum(r.cost - d.gold)} gold to go</div></div>}
                <div className="flex items-center gap-2 mt-3">
                  <button className="btn btn-gold flex-1" disabled={!afford || lvlLocked} onClick={() => { const e = redeem(r.id); setMsg({ ...msg, [r.id]: e ?? "Claimed — enjoy it, guilt-free." }); if (!e) sfx("achievement"); }}>Claim</button>
                  <button className="btn btn-icon btn-sm" onClick={() => setForm({ open: true, edit: r })} aria-label={`Edit ${r.title}`}><Icon name="pencil" size={14} /></button>
                  <button className="btn btn-icon btn-sm" onClick={() => setDel(r)} aria-label={`Delete ${r.title}`}><Icon name="trash" size={14} /></button>
                </div>
                {msg[r.id] && <p className="text-xs mt-2 text-jade-400">{msg[r.id]}</p>}
              </Panel>
            );
          })}
        </div>
      )}

      <section>
        <SectionTitle icon="hourglass">Claimed</SectionTitle>
        {history.length === 0 ? <Panel><p className="text-sm text-fog text-center py-2">Nothing claimed yet.</p></Panel> : (
          <Panel className="!p-2 divide-y divide-white/5">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-2 py-2.5">
                <div className="flex-1 min-w-0"><div className="text-sm truncate">{h.title}</div><div className="text-[11px] text-fog">{fmtShort(h.date)} · −{fmtNum(h.cost)} gold</div></div>
                <button className="btn btn-sm" onClick={() => refund(h.id)} title="Accidental claim? Get the gold back."><Icon name="undo" size={13} />Undo</button>
              </div>
            ))}
          </Panel>
        )}
      </section>

      <Modal open={form.open} onClose={() => setForm({ open: false })} title={form.edit ? "Edit reward" : "New reward"}>
        <RewardForm key={form.edit?.id ?? "new"} initial={form.edit} onClose={() => setForm({ open: false })} onSave={(r) => (form.edit ? updateReward(form.edit.id, r) : addReward(r))} />
      </Modal>
      <Confirm open={!!del} danger title="Delete this reward?" body={`“${del?.title}” will be removed from the shop. Past claims stay in your history.`} confirmLabel="Delete" onConfirm={() => del && removeReward(del.id)} onClose={() => setDel(null)} />
    </div>
  );
}
