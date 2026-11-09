import { SKILLS } from "./content/skills";
import { addDays, diffDays, type ISODate } from "./dates";
import type { Reminder } from "./types";

export const TARGETS: { value: Reminder["target"]; label: string }[] = [
  { value: "checkin", label: "Quick check-in" },
  { value: "reflect", label: "Evening reflection" },
  ...(["sleep", "reading", "learning", "health", "screen", "work"] as const).map((k) => ({ value: k, label: SKILLS[k].quest })),
];

/** Where tapping the reminder should land you in the app. */
export const targetPath = (t: Reminder["target"]) => (t === "reflect" ? "/reflect/" : t === "checkin" ? "/checkin/" : "/quests/");

const mins = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

/**
 * The reminder to surface in the app right now: the most recent enabled one whose time has passed
 * within the last `windowMin` minutes and whose task isn't done yet. Never nags about finished things.
 */
export function dueNow(reminders: Reminder[], now: Date, isDone: (t: Reminder["target"]) => boolean, windowMin = 180): Reminder | null {
  const cur = now.getHours() * 60 + now.getMinutes();
  const due = reminders
    .filter((r) => r.enabled && mins(r.time) <= cur && cur - mins(r.time) <= windowMin && !isDone(r.target))
    .sort((a, b) => mins(b.time) - mins(a.time));
  return due[0] ?? null;
}

// ───────────────────────── Calendar export ─────────────────────────
export interface CalOpts { origin: string; basePath: string; startDate: ISODate; endDate: ISODate; today: ISODate; tz: string; now?: Date }

const pad = (n: number) => String(n).padStart(2, "0");
/** Local "floating" timestamp: YYYYMMDDTHHMMSS */
const stamp = (date: ISODate, hhmm: string, addMin = 0) => {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const t = new Date(y, mo - 1, d, h, mi + addMin, 0);
  return `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}T${pad(t.getHours())}${pad(t.getMinutes())}00`;
};

export const appUrl = (o: CalOpts, r: Reminder) => `${o.origin}${o.basePath}${targetPath(r.target)}`;
/** Repeat daily from tomorrow until the journey ends (at least a week). */
const firstDay = (o: CalOpts) => addDays(o.today, 1);
const occurrences = (o: CalOpts) => Math.max(7, diffDays(firstDay(o), o.endDate) + 1);
const title = (r: Reminder) => `Project 26 · ${r.label}`.slice(0, 120);

export function googleCalendarUrl(r: Reminder, o: CalOpts): string {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: title(r),
    details: `${r.label}\n\nOpen the game: ${appUrl(o, r)}`,
    dates: `${stamp(firstDay(o), r.time)}/${stamp(firstDay(o), r.time, 10)}`,
    recur: `RRULE:FREQ=DAILY;COUNT=${occurrences(o)}`,
    ctz: o.tz,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** RFC 5545 line folding at 75 characters. */
const fold = (line: string) => {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = " " + rest.slice(74); }
  out.push(rest);
  return out.join("\r\n");
};

export function buildIcs(reminders: Reminder[], o: CalOpts): string {
  const now = o.now ?? new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Project 26//Reminders//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Project 26 reminders"];
  for (const r of reminders.filter((x) => x.enabled)) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:p26-${r.id}@project26`, // stable, so re-importing updates the same event instead of duplicating it
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${stamp(firstDay(o), r.time)}`,
      `DTEND:${stamp(firstDay(o), r.time, 10)}`,
      `RRULE:FREQ=DAILY;COUNT=${occurrences(o)}`,
      `SUMMARY:${esc(title(r))}`,
      `DESCRIPTION:${esc(`${r.label}\n\nOpen the game: ${appUrl(o, r)}`)}`,
      `URL:${appUrl(o, r)}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(r.label)}`, "TRIGGER:PT0M", "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
