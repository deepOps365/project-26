import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, DM_Sans, Fraunces, Inter, Nunito, Playfair_Display, Rajdhani, Source_Sans_3 } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
// Alternative pairings — only downloaded when you pick them (preload off; the browser fetches a face when it is first used).
// (next/font needs literal options, so they can't be shared via a spread.)
const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", weight: ["500", "600", "700"], subsets: ["latin"], display: "swap", preload: false });
const dmsans = DM_Sans({ variable: "--font-dmsans", subsets: ["latin"], display: "swap", preload: false });
const rajdhani = Rajdhani({ variable: "--font-rajdhani", weight: ["500", "600", "700"], subsets: ["latin"], display: "swap", preload: false });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap", preload: false });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], display: "swap", preload: false });
const playfair = Playfair_Display({ variable: "--font-playfair", weight: ["500", "600", "700"], subsets: ["latin"], display: "swap", preload: false });
const sourcesans = Source_Sans_3({ variable: "--font-sourcesans", subsets: ["latin"], display: "swap", preload: false });
const fontVars = [cinzel, inter, cormorant, dmsans, rajdhani, fraunces, nunito, playfair, sourcesans].map((f) => f.variable).join(" ");

// Applies the saved theme/font/size before first paint so there is never a flash of the default look.
const LOOK_SCRIPT = `try{var l=JSON.parse(localStorage.getItem("p26-look")||"null");if(l){var e=document.documentElement;l.t&&(e.dataset.theme=l.t);l.f&&(e.dataset.font=l.f);l.s&&(e.dataset.scale=l.s)}}catch(_){}`;

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "PROJECT 26 — 365 Days. One Character.",
  description: "A personal RPG for your real life. Quests, skills, bosses and a year-long journey.",
  manifest: `${base}/manifest.webmanifest`,
  icons: { icon: `${base}/icons/icon-192.png`, apple: `${base}/icons/apple-touch-icon.png` },
  appleWebApp: { capable: true, title: "Project 26", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#06060a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={fontVars} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: LOOK_SCRIPT }} /></head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
