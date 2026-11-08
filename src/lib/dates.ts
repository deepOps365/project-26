// All dates in the game are *local* calendar dates as "YYYY-MM-DD" strings.
// We never store UTC timestamps for day-keyed data, so the "day" always matches the
// device's wall clock (and travelling / DST can't shift an entry onto the wrong day).

export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayISO = (): ISODate => toISO(new Date());

/** Local noon avoids any DST edge when adding/subtracting days. */
export function parseISO(s: ISODate): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function isISO(s: unknown): s is ISODate {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseISO(s).getTime());
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

export const dow = (s: ISODate) => parseISO(s).getDay(); // 0 = Sunday

/** Weeks run Sunday → Saturday: a new boss appears every Sunday. */
export const weekStart = (s: ISODate): ISODate => addDays(s, -dow(s));
export const weekEnd = (ws: ISODate): ISODate => addDays(ws, 6);
export const weekDates = (ws: ISODate): ISODate[] => Array.from({ length: 7 }, (_, i) => addDays(ws, i));

export const monthKey = (s: ISODate) => s.slice(0, 7);
export function monthDates(ym: string): ISODate[] {
  const [y, m] = ym.split("-").map(Number);
  const n = new Date(y, m, 0).getDate();
  return Array.from({ length: n }, (_, i) => `${ym}-${pad(i + 1)}`);
}
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const n = diffDays(from, to);
  if (n < 0) return [];
  const out: ISODate[] = [];
  for (let i = 0; i <= n; i++) out.push(addDays(from, i));
  return out;
}

export const minDate = (a: ISODate, b: ISODate) => (a <= b ? a : b);
export const maxDate = (a: ISODate, b: ISODate) => (a >= b ? a : b);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export function fmtShort(s: ISODate) {
  const d = parseISO(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
export function fmtLong(s: ISODate) {
  const d = parseISO(s);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
export function fmtFull(s: ISODate) {
  const d = parseISO(s);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}
export function fmtMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}
export const fmtDow = (s: ISODate) => DAYS[dow(s)];

export function relativeDay(s: ISODate, today: ISODate) {
  const n = diffDays(s, today);
  if (n === 0) return "Today";
  if (n === 1) return "Yesterday";
  if (n === -1) return "Tomorrow";
  return fmtLong(s);
}

export const JOURNEY_DAYS = 365;
export const journeyEnd = (start: ISODate) => addDays(start, JOURNEY_DAYS - 1);
/** Day number inside the journey. <1 means the prologue, >365 means the epilogue. */
export const journeyDay = (start: ISODate, date: ISODate) => diffDays(start, date) + 1;

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().slice(0, 12);
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
