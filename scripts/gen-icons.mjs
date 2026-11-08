// Generates the PWA icons (any / maskable / apple-touch) from an inline SVG sigil.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const figure = `
  <path d="M50 21c-12 0-19 9-19 20 0 7 3 12 7 16l-8 21c8 6 32 6 40 0l-8-21c4-4 7-9 7-16 0-11-7-20-19-20z" fill="url(#cl)" stroke="#e3b04b" stroke-opacity=".6" stroke-width=".8"/>
  <ellipse cx="50" cy="43" rx="9.5" ry="11.5" fill="#05040a"/>
  <circle cx="46" cy="43" r="1.9" fill="#ffe08a"/><circle cx="54" cy="43" r="1.9" fill="#ffe08a"/>`;

const defs = `<defs>
  <radialGradient id="bg" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#2a2150"/><stop offset=".6" stop-color="#0f0c1c"/><stop offset="1" stop-color="#06060a"/></radialGradient>
  <linearGradient id="gold" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff0c2"/><stop offset=".55" stop-color="#e3b04b"/><stop offset="1" stop-color="#8a621f"/></linearGradient>
  <linearGradient id="cl" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3f3766"/><stop offset="1" stop-color="#14111f"/></linearGradient>
  <radialGradient id="halo" cx="50%" cy="45%" r="50%"><stop offset="0" stop-color="#9b6bff" stop-opacity=".55"/><stop offset="1" stop-color="#9b6bff" stop-opacity="0"/></radialGradient>
</defs>`;

const art = (scale = 1, rounded = true) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${defs}
  <rect width="512" height="512" ${rounded ? 'rx="116"' : ""} fill="url(#bg)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <circle cx="256" cy="244" r="210" fill="url(#halo)"/>
    <circle cx="256" cy="244" r="196" fill="none" stroke="url(#gold)" stroke-width="9"/>
    <circle cx="256" cy="244" r="180" fill="none" stroke="#e3b04b" stroke-opacity=".35" stroke-width="2" stroke-dasharray="3 11"/>
    <g transform="translate(78 66) scale(3.56)">${figure}</g>
    <g transform="translate(256 420)">
      <rect x="-76" y="-44" width="152" height="82" rx="24" fill="url(#gold)" stroke="#06060a" stroke-width="7"/>
      <text x="0" y="22" text-anchor="middle" font-family="Cinzel, 'Palatino Linotype', Georgia, serif" font-weight="700" font-size="66" fill="#1b1204">26</text>
    </g>
  </g></svg>`;

mkdirSync("public/icons", { recursive: true });
const out = async (name, svg, size) => sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/${name}`);
await out("icon-192.png", art(1, true), 192);
await out("icon-512.png", art(1, true), 512);
await out("maskable-512.png", art(0.74, false), 512); // content kept inside the 80% safe zone
await out("apple-touch-icon.png", art(0.9, false), 180);
console.log("icons written to public/icons");
