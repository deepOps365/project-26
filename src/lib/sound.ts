// Tiny synthesized sound effects (no audio files). Quiet by design; fully mutable.
let ctx: AudioContext | null = null;
let enabled = true;

export const setSoundEnabled = (on: boolean) => { enabled = on; };

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.05) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export type Sfx = "tap" | "xp" | "achievement" | "level" | "boss" | "undo" | "open";

export function sfx(name: Sfx) {
  if (!enabled) return;
  switch (name) {
    case "tap": tone(520, 0, 0.06, "triangle", 0.03); break;
    case "open": tone(330, 0, 0.1, "sine", 0.03); tone(440, 0.05, 0.12, "sine", 0.03); break;
    case "undo": tone(300, 0, 0.12, "sine", 0.035); tone(220, 0.07, 0.14, "sine", 0.03); break;
    case "xp": tone(660, 0, 0.12, "triangle", 0.05); tone(880, 0.07, 0.18, "triangle", 0.045); break;
    case "achievement": [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.08, 0.3, "sine", 0.045)); break;
    case "level": [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.42, "triangle", 0.05)); break;
    case "boss": tone(110, 0, 0.35, "sawtooth", 0.05); tone(165, 0.1, 0.35, "sawtooth", 0.04); [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.35 + i * 0.09, 0.4, "triangle", 0.05)); break;
  }
}
