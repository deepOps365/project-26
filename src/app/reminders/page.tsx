"use client";

import { useMemo } from "react";
import { Icon } from "@/components/Icon";
import { PageHeader, Panel, SectionTitle, Toggle } from "@/components/ui";
import { addDays, journeyEnd } from "@/lib/dates";
import { TARGETS, buildIcs, googleCalendarUrl, type CalOpts } from "@/lib/reminders";
import { sfx } from "@/lib/sound";
import { useGame } from "@/lib/store";
import type { Reminder } from "@/lib/types";

export default function RemindersPage() {
  const reminders = useGame((s) => s.state.reminders);
  const start = useGame((s) => s.state.settings.startDate);
  const today = useGame((s) => s.today);
  const g = useGame.getState();
  const sorted = [...reminders].sort((a, b) => a.time.localeCompare(b.time));
  const enabled = reminders.filter((r) => r.enabled).length;

  const opts: CalOpts = useMemo(() => {
    const end = journeyEnd(start);
    return {
      origin: typeof location !== "undefined" ? location.origin : "", basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
      startDate: start, endDate: end < addDays(today, 7) ? addDays(today, 30) : end, today,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    };
  }, [start, today]);

  const download = () => {
    sfx("tap");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([buildIcs(reminders, opts)], { type: "text/calendar;charset=utf-8" }));
    a.download = "project26-reminders.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  return (
    <div className="space-y-5">
      <PageHeader icon="bell" title="Reminders" subtitle="Know when it's time to act — without another notification you'll swipe away." />

      <Panel gold className="space-y-2.5 text-sm text-mist">
        <div className="font-display text-base gold-text">How reminders work here</div>
        <p>A website can&apos;t reliably ring your phone at a set time while it&apos;s closed — that needs a server pushing messages, and without one the alert silently never arrives. So I use the thing your phone already does perfectly: <b className="text-parchment">calendar alerts</b>. They fire on time, work offline, survive reboots, and tapping one opens straight to the right screen.</p>
        <p>Set your times below, send them to Google Calendar once (they repeat daily through 13 Nov 2027), and you&apos;re done. Inside the app, a <b className="text-parchment">“due now”</b> card on the home screen also nudges you at those times — and disappears as soon as the task is done.</p>
      </Panel>

      <section>
        <SectionTitle icon="clock" right={<span className="text-xs text-fog">{enabled} of {reminders.length} on</span>}>Your times</SectionTitle>
        <div className="space-y-3">
          {sorted.map((r) => (
            <Panel key={r.id} className={r.enabled ? "" : "opacity-60"}>
              <div className="flex items-center gap-3">
                <input type="time" className="input !w-[7.2rem] font-display text-lg" value={r.time} onChange={(e) => g.updateReminder(r.id, { time: e.target.value })} aria-label="Time" />
                <div className="flex-1" />
                <Toggle on={r.enabled} onChange={(v) => g.updateReminder(r.id, { enabled: v })} label={`${r.label} enabled`} />
              </div>
              <input className="input mt-3" value={r.label} onChange={(e) => g.updateReminder(r.id, { label: e.target.value })} placeholder="What should future-you do?" maxLength={140} aria-label="Reminder text" />
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <label className="text-xs text-fog flex items-center gap-2">Opens
                  <select className="input !w-auto !min-h-9 !py-1.5" value={r.target} onChange={(e) => g.updateReminder(r.id, { target: e.target.value as Reminder["target"] })} aria-label="Opens">
                    {TARGETS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>
                <div className="flex-1" />
                <a className="btn btn-gold btn-sm" href={googleCalendarUrl(r, opts)} target="_blank" rel="noopener noreferrer"><Icon name="calendar" size={14} />Add to Google Calendar</a>
                <button className="btn btn-icon btn-sm" onClick={() => g.removeReminder(r.id)} aria-label={`Delete ${r.label}`}><Icon name="trash" size={14} /></button>
              </div>
            </Panel>
          ))}
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button className="btn" onClick={() => g.addReminder()}><Icon name="plus" size={16} />Add a reminder</button>
          <button className="btn" onClick={() => g.resetReminders()}><Icon name="reset" size={14} />Suggested set</button>
        </div>
        <p className="text-[11px] text-fog mt-2.5">Each “Add to Google Calendar” creates one repeating event. Tap it <b className="text-mist">once per reminder</b>; to change a time later, edit that event in your calendar (or delete it and add again).</p>
      </section>

      <Panel>
        <SectionTitle icon="calendar">Other calendar apps</SectionTitle>
        <p className="text-sm text-mist mb-3">Samsung Calendar, Outlook, Apple Calendar and others can import all your enabled reminders at once from a calendar file. Re-importing later updates the same events instead of duplicating them.</p>
        <button className="btn" onClick={download} disabled={!enabled}><Icon name="download" size={16} />Download all as .ics</button>
      </Panel>

      <Panel>
        <SectionTitle icon="settings">One-time phone setup (2 minutes)</SectionTitle>
        <ol className="space-y-2.5 text-sm text-mist list-decimal pl-5">
          <li>Tap <b className="text-parchment">Add to Google Calendar</b> on each reminder and press <b className="text-parchment">Save</b> in Calendar.</li>
          <li>Open the Google Calendar app → ☰ → <b className="text-parchment">Settings</b> → your account → <b className="text-parchment">Event notifications</b> and set the default alert to <b className="text-parchment">0 minutes</b> before, so it rings at the exact time. (Menu names vary a little between versions.)</li>
          <li>In Android Settings, make sure <b className="text-parchment">Calendar</b> notifications are allowed and its battery use is not “restricted”, and that the phone isn&apos;t on silent / Do Not Disturb at those times.</li>
        </ol>
      </Panel>

      <Panel>
        <SectionTitle icon="target">Making reminders actually work for you</SectionTitle>
        <p className="text-xs text-fog mb-2.5 -mt-1">You&apos;ve said you tend to dismiss alerts. These make that less likely:</p>
        <ul className="space-y-2.5 text-sm text-mist">
          {[
            ["Attach each one to something you already do.", "“After lunch”, “when I get home”, “brushing teeth” beat a random clock time. Pick times that match your real routine."],
            ["Keep the ask tiny and specific.", "“Two pages before bed” gets done; “work on yourself” gets dismissed."],
            ["Use fewer, not more.", "Three to five a day is plenty. A flood teaches your brain to ignore all of them."],
            ["Tap through — don't swipe away.", "The event opens the exact screen. If you can't act right now, snooze it rather than dismissing."],
          ].map(([t, b]) => <li key={t} className="flex gap-3"><Icon name="sparkles" size={15} className="text-gold-400 mt-1 shrink-0" /><span><b className="text-parchment">{t}</b> {b}</span></li>)}
        </ul>
      </Panel>
    </div>
  );
}
