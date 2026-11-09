import assert from "node:assert/strict";
import { DEFAULT_REMINDERS } from "../src/lib/config";
import { buildIcs, dueNow, googleCalendarUrl, targetPath, type CalOpts } from "../src/lib/reminders";

let n = 0;
const test = (name: string, fn: () => void) => { fn(); n++; console.log("  ✓", name); };
const o: CalOpts = { origin: "https://deepops365.github.io", basePath: "/project-26", startDate: "2026-11-14", endDate: "2027-11-13", today: "2026-11-09", tz: "Asia/Kolkata", now: new Date(Date.UTC(2026, 10, 9, 12, 0, 0)) };
const at = (h: number, m = 0) => new Date(2026, 10, 9, h, m);

console.log("Reminders");
test("calendar file is valid iCalendar: balanced, CRLF, stable UIDs, daily until the journey ends", () => {
  const ics = buildIcs(DEFAULT_REMINDERS, o);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.endsWith("END:VCALENDAR\r\n"));
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 5);
  assert.equal((ics.match(/END:VEVENT/g) ?? []).length, 5);
  assert.ok(!/[^\r]\n/.test(ics), "every newline is CRLF");
  assert.ok(ics.split("\r\n").every((l) => l.length <= 75), "lines folded at 75");
  const uids = ics.match(/UID:[^\r]+/g)!; assert.equal(new Set(uids).size, 5);
  assert.ok(ics.includes("DTSTART:20261110T074500"), "first event is tomorrow 07:45 local");
  assert.ok(ics.includes("RRULE:FREQ=DAILY;COUNT=369"), "tomorrow → 13 Nov 2027 inclusive");
  assert.ok(ics.includes("TRIGGER:PT0M"));
});
test("special characters are escaped; disabled reminders are skipped", () => {
  const ics = buildIcs([{ id: "a", label: "Read, then; relax", time: "09:00", enabled: true, target: "reading" }, { id: "b", label: "off", time: "10:00", enabled: false, target: "work" }], o);
  assert.ok(ics.includes("Read\\, then\; relax"));
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 1);
});
test("late-night event rolls past midnight correctly", () => {
  const ics = buildIcs([{ id: "z", label: "late", time: "23:55", enabled: true, target: "reading" }], o);
  assert.ok(ics.includes("DTSTART:20261110T235500") && ics.includes("DTEND:20261111T000500"));
});
test("Google Calendar link carries title, daily recurrence, timezone and an app link", () => {
  const u = new URL(googleCalendarUrl(DEFAULT_REMINDERS[1], o));
  assert.equal(u.hostname, "calendar.google.com");
  assert.equal(u.searchParams.get("recur"), "RRULE:FREQ=DAILY;COUNT=369");
  assert.equal(u.searchParams.get("ctz"), "Asia/Kolkata");
  assert.equal(u.searchParams.get("dates"), "20261110T133000/20261110T134000");
  assert.ok(u.searchParams.get("details")!.includes("https://deepops365.github.io/project-26/quests/"));
});
test("deep links land on the right screen", () => {
  assert.equal(targetPath("reflect"), "/reflect/"); assert.equal(targetPath("checkin"), "/checkin/"); assert.equal(targetPath("learning"), "/quests/");
});
test("in-app 'due now': latest passed reminder, within 3h, never for finished tasks", () => {
  const none = () => false;
  assert.equal(dueNow(DEFAULT_REMINDERS, at(7, 0), none), null, "before the first reminder");
  assert.equal(dueNow(DEFAULT_REMINDERS, at(7, 50), none)!.id, "rm-morning");
  assert.equal(dueNow(DEFAULT_REMINDERS, at(14, 0), none)!.id, "rm-learn");
  assert.equal(dueNow(DEFAULT_REMINDERS, at(17, 0), none), null, "learning block is >3h old");
  assert.equal(dueNow(DEFAULT_REMINDERS, at(14, 0), (t) => t === "learning"), null, "already done → no nag");
  assert.equal(dueNow(DEFAULT_REMINDERS.map((r) => ({ ...r, enabled: false })), at(14, 0), none), null, "disabled");
});
console.log(`${n} reminder tests passed`);
