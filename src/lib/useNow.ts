"use client";
import { useEffect, useState } from "react";

/** Current time, refreshed every 30s so time-of-day UI stays accurate while the app is open. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    const vis = () => { if (!document.hidden) setNow(new Date()); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [intervalMs]);
  return now;
}
