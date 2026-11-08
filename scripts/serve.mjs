// Serves the exported game (./out) on your network so a phone on the same Wi-Fi can open it.
//   npm run phone      (builds, then runs this)
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { extname, join, normalize } from "node:path";
import qr from "qrcode-terminal";

const ROOT = join(process.cwd(), "out");
const PORT = Number(process.env.PORT || 3026);
const local = process.argv.includes("--local");
if (!existsSync(ROOT)) { console.error("No ./out folder — run `npm run build` first."); process.exit(1); }

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".txt": "text/plain; charset=utf-8", ".map": "application/json" };

createServer((req, res) => {
  let path = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file) && existsSync(file + ".html")) file += ".html";
  let status = 200;
  if (!existsSync(file)) { file = join(ROOT, "404.html"); status = 404; if (!existsSync(file)) { res.writeHead(404).end("Not found"); return; } }
  const headers = { "Content-Type": MIME[extname(file)] || "application/octet-stream" };
  headers["Cache-Control"] = file.endsWith("sw.js") || file.endsWith(".html") ? "no-cache" : path.includes("/_next/static/") ? "public, max-age=31536000, immutable" : "public, max-age=3600";
  res.writeHead(status, headers).end(readFileSync(file));
}).listen(PORT, local ? "127.0.0.1" : "0.0.0.0", () => {
  console.log("\n  PROJECT 26 is running\n");
  console.log(`  Laptop:  http://localhost:${PORT}`);
  if (!local) {
    const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
    ips.forEach((ip) => console.log(`  Phone:   http://${ip}:${PORT}   (same Wi-Fi)`));
    if (ips[0]) { console.log("\n  Scan with your phone camera:\n"); qr.generate(`http://${ips[0]}:${PORT}`, { small: true }); }
    console.log("\n  Note: over plain http the phone can use the game but can't install it as an offline app.");
    console.log("  For install + offline, host the ./out folder over HTTPS — see README.\n");
  }
});
