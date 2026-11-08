export const fmtMinutes = (m: number) => {
  m = Math.round(m);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
};
export const fmtHours = (h: number) => `${Math.round(h * 10) / 10}h`;
export const fmtNum = (n: number) => Math.round(n).toLocaleString("en-US");
export const plural = (n: number, s: string, p = s + "s") => `${n} ${n === 1 ? s : p}`;
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const pct = (n: number) => `${Math.round(n * 100)}%`;
