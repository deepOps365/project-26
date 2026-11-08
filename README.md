# PROJECT 26 — 365 Days. One Character. One Life to Level Up.

A personal RPG for your real year (14 Nov 2026 → 13 Nov 2027). Your real actions become XP, levels, skills, quests, boss fights and trophies. It's built to be *needed less*, not more: check in fast, then go live your life.

## Run it

Node is required (installed via Homebrew in this session: `brew install node`).

```bash
cd ~/project-26
export PATH=/opt/homebrew/bin:$PATH   # only if `node` isn't found in a new terminal

npm run phone      # build + serve on your network (prints a QR code for your phone)
npm run build && npm run serve   # same thing in two steps
npm run dev        # hot-reload development (http://localhost:3026)
npm test           # 25 engine rule tests
npm run balance    # simulate heroes of different consistency (XP/level tuning)
```

## Use it on your phone AND laptop

Progress is stored **in each browser on each device** (there is no server, so nothing leaves your machine). Pick one of these:

### Option A — same Wi-Fi (fastest, zero accounts)
1. On the laptop: `npm run phone`
2. On the phone (same Wi-Fi): scan the QR code, or open the `http://192.168.x.x:3026` it prints.
3. iPhone: Safari → Share → **Add to Home Screen**. Android: Chrome menu → **Add to Home screen**.

Limitation: over plain `http://` on a LAN IP, browsers will not install it as an *offline* app (service workers need HTTPS). It works as a full web app while the laptop is serving it. If it doesn't load, check the laptop firewall allows Node, and that both devices are on the same network.

### Option B — host it once over HTTPS (recommended for a year-long project)
Gives you a permanent address, true install-as-app and offline use, and no need to keep the laptop on. Build, then host the **`out/`** folder anywhere static:

- **Netlify Drop**: `npm run build`, then drag the `out` folder onto <https://app.netlify.com/drop>.
- **Vercel**: `npx vercel --prod` inside the project (it detects Next.js).
- **GitHub Pages** (served from a sub-path): build with `NEXT_PUBLIC_BASE_PATH=/your-repo-name npm run build` and publish `out/`.

Open that **same address on both devices** and add it to the home screen. (I did not deploy anything for you — hosting is your call.)

### Keeping phone and laptop in sync
Because data is per-device, choose a **primary device** (the phone is natural for daily check-ins). To move or combine progress: Settings → **Backup & restore** → export on one device (download, "Share / send to phone", or "Copy as text"), then on the other device → import with **Merge**. Merge keeps every entry from both devices and never double-counts (entries have unique IDs). Use **Replace** only to overwrite a device.

## Backing up your progress (do this!)
Your data lives in the browser's storage. Clearing site data, switching browsers, or a lost phone loses it.
- **Weekly**: Settings → Backup & restore → *Download backup* (JSON). Keep it in a cloud drive or email it to yourself. The home screen nudges you after 14 days.
- The app also keeps an automatic daily snapshot (restorable in Settings) and asks the browser for persistent storage.
- Restore anywhere: Settings → Import → choose file or paste text.

## How the game works (the important rules)
- **Nothing is "claimed".** XP, levels, streaks, trophies and boss results are *calculated* from your logs by one deterministic pass (`src/lib/engine.ts`). You can't claim a quest without logged progress, can never be paid twice, and deleting a mistaken entry automatically removes the XP/trophies it earned. Changing XP/targets applies from *today*, so history is never re-scored.
- **Six daily quests** (Energy, Intelligence, Knowledge, Vitality, Focus, Discipline). Reaching the minimum = full XP; half the minimum = 40% partial credit; stretch goals add bonus XP.
- **A day is "kept"** with 3+ of 6 quests (configurable). **One missed day per week is shielded** and never breaks the streak. Returning after 2+ days away earns a comeback bonus — never a penalty.
- **Healthy limits**: oversleeping earns nothing, exercise XP is capped at 90 min/day, learning at 180 effective min/day, passive study counts half, side quests are capped at 3/day, the screen limit can be tightened but never loosened past 4 h. No weight/calorie tracking; hours worked are never tracked.
- **Bosses**: a new boss every **Sunday** (weeks run Sun–Sat). Objectives are counts, so one bad day can't sink the week. Finish all but one for a "Valiant" consolation.
- **Gold**: 1 earned XP = 1 gold. The shop is for optional treats; spending never lowers your level, and rest is never gated.
- Weekly quests, monthly challenges (scaled for the partial months at the start/end), 81 trophies (incl. 5 secret), a 7-region world map, evening + weekly reflections and a searchable journal.

Levels: `XP to reach level L = 55 · (L−1)^1.8`. Simulated outcomes (see `npm run balance`): a rough year ≈ Warrior, average ≈ Elite, good ≈ Master, strong ≈ Grandmaster, near-perfect ≈ Legend.

## Project structure
```
src/
  app/                    Next.js App Router pages (all statically exported)
    page.tsx              Hero dashboard + "next move"      quests/  Daily/Weekly/Monthly/Side board
    checkin/              One-quest-at-a-time quick check-in  skills/ + skills/[id]/  Six skill trees
    battle/               Weekly boss                         achievements/  Trophy hall
    map/                  World map & regions                 reflect/ + journal/  Evening, weekly, history
    rewards/  stats/  settings/  layout.tsx  globals.css (design system)
  components/             AppShell (nav, toasts, level-up), QuestCard + Inputs, HeroCard, charts, ui kit
  lib/
    types.ts config.ts    Data model, defaults, tunable rules
    engine.ts             ★ The rules: simulate(state) → XP, levels, streaks, awards, bosses, trophies
    content/              Skills & topics, achievements, bosses, weekly/monthly quests, regions
    progression.ts        Level curve and ranks
    store.ts persist.ts   Zustand store, localStorage, import/export/merge, daily backup
    sound.ts dates.ts     Synthesised sfx (mutable), local-date helpers
public/                   manifest.webmanifest, icons/
scripts/                  test-engine.ts, balance.ts, gen-icons.mjs, gen-sw.mjs, serve.mjs
```

## Known limitations
- **No cloud sync** between devices (by design — private and free). Use export/merge, or ask to add an optional sync backend later.
- Data is tied to one browser per device and to the **web address** (localhost, LAN IP and your hosted URL are three *different* stores). Pick one address as home.
- Sleep is self-reported (log last night's sleep on the wake-up day); screen time is self-reported too — the game is on your honour, since only you benefit.
- There are deliberately no push notifications; the app never nags.
- Sound is synthesised and quiet; browsers only play it after a tap.
