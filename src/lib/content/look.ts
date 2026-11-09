import type { FontId, ThemeId } from "../types";

export interface ThemeMeta { id: ThemeId; name: string; tagline: string; bg: string; panel: string; accent: string; accent2: string; text: string }
export const THEMES: ThemeMeta[] = [
  { id: "ember", name: "Ember Gold", tagline: "The original dark-fantasy look", bg: "#06060a", panel: "#1a1a27", accent: "#f6cb62", accent2: "#b592ff", text: "#ece5d3" },
  { id: "arcane", name: "Midnight Arcane", tagline: "Deep indigo, violet magic", bg: "#05050f", panel: "#191c36", accent: "#b99bff", accent2: "#7cc8ff", text: "#e8e6f7" },
  { id: "grove", name: "Emerald Grove", tagline: "Forest dark, living green", bg: "#040907", panel: "#15271f", accent: "#52dc99", accent2: "#f3cd6a", text: "#e6efe6" },
  { id: "crimson", name: "Crimson Dusk", tagline: "Warm embers, battle-ready", bg: "#0a0506", panel: "#2b171a", accent: "#ff8f78", accent2: "#ffc15e", text: "#f2e6e1" },
  { id: "frost", name: "Frost Steel", tagline: "Cool slate, ice-blue focus", bg: "#05080d", panel: "#182231", accent: "#7ad2f7", accent2: "#aab2ff", text: "#e6eef5" },
  { id: "ash", name: "Ash", tagline: "Minimal monochrome, zero fantasy", bg: "#050505", panel: "#1d1d1d", accent: "#d4d4d4", accent2: "#bdbdbd", text: "#ededed" },
];

export interface FontMeta { id: FontId; name: string; display: string; body: string; displayCss: string; bodyCss: string; note: string }
export const FONTS: FontMeta[] = [
  { id: "classic", name: "Classic RPG", display: "Cinzel", body: "Inter", displayCss: "var(--font-cinzel), serif", bodyCss: "var(--font-inter), sans-serif", note: "Engraved capitals — the original" },
  { id: "elegant", name: "Elegant", display: "Cormorant Garamond", body: "DM Sans", displayCss: "var(--font-cormorant), serif", bodyCss: "var(--font-dmsans), sans-serif", note: "Refined, literary, calm" },
  { id: "hud", name: "Game HUD", display: "Rajdhani", body: "Inter", displayCss: "var(--font-rajdhani), sans-serif", bodyCss: "var(--font-inter), sans-serif", note: "Squared, techy, like a game interface" },
  { id: "storybook", name: "Storybook", display: "Fraunces", body: "Nunito", displayCss: "var(--font-fraunces), serif", bodyCss: "var(--font-nunito), sans-serif", note: "Friendly and warm, easy to read" },
  { id: "royal", name: "Royal", display: "Playfair Display", body: "Source Sans 3", displayCss: "var(--font-playfair), serif", bodyCss: "var(--font-sourcesans), sans-serif", note: "High-contrast, editorial, bold" },
  { id: "clean", name: "Clean", display: "Inter", body: "Inter", displayCss: "var(--font-inter), sans-serif", bodyCss: "var(--font-inter), sans-serif", note: "Modern app style, no ornament" },
];
