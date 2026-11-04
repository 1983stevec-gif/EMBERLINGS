# Browser check scripts (Playwright)

Quick scripts used to check features in a real browser. They are not part of `npm test`.

Start the game first (see `NEXT-CHAT-HANDOFF.md`; `alerts.cjs` also needs `npm run db:local` once), then run a script with `node`. Screenshots are written to the folder you run it from. Set `BASE` to use another address (default `http://127.0.0.1:8848`), for example `BASE=http://127.0.0.1:8864 node scripts/shots/rare.cjs`. Playwright isn't a project dependency; if `require('playwright')` fails, point Node at a global install: `NODE_PATH=$(npm root -g) node scripts/shots/rare.cjs`.

New players get the beginner guide and, once a day, the Daily rewards panel (`#dailyPanel`) on top of Home. Both block clicks, so every script except `daily.cjs` calls `quiet.cjs` right after creating its player to close them (it marks today's panel as already shown for that test player only). `daily.cjs` checks the panel itself, so it leaves it open. Use `quiet.cjs` in any new script too:

```js
const quiet = require('./quiet.cjs');
// ...after typing the new username:
await quiet(page);
```

| Script | What it does | Example |
|---|---|---|
| `shot.cjs` | Screenshot one page at any size, with touch on | `node shot.cjs 768 1024 rules out.png` (`FULL=1` for a full page) |
| `tp.cjs` | Portrait tablet pages: rules, training, trading | `FULL=1 node tp.cjs 768 1024 training tp.png` |
| `alerts.cjs` | Two live accounts: befriend, invite (badge and pop-up), 2-for-1 trade, Trade complete, Past trades. Waits for the invite pop-up, which hides itself after 12 s | `node alerts.cjs` or `W=768 H=1024 TOUCH=1 node alerts.cjs` |
| `cosmetics.cjs` | Gallery of every card back and avatar ring; a test player picks a back, avatar and ring, then card details flip, pack reveal, battle deck, a friend's view, tablet and phone fit. Set `OUT` for the screenshot folder | `OUT=/tmp/shots node cosmetics.cjs` |
| `daily.cjs` | Daily rewards: the panel opening by itself, login claim, quest from a real pack, bonus, weekly, day 7 | `node daily.cjs` or `W=390 H=844 node daily.cjs` |
| `rare.cjs` | Opens a Legend Pack with lucky rolls; rare-find banner and profile | `node rare.cjs` or `W=390 H=844 node rare.cjs` |
| `speed.cjs` | First-visit size and time over simulated 4G, empty cache (default size 768×1024) | `W=390 H=844 node speed.cjs` or `W=1366 H=900 node speed.cjs` |
| `artcheck.cjs` | Finds broken images and failed downloads on the welcome screen and binder | `node artcheck.cjs` |
| `activity.cjs` | Friend activity: two players, rare pull, boss win, level 25, cheer, sharing off; screenshots at three sizes | `BASE=http://127.0.0.1:8894 OUT=/tmp/ node activity.cjs` |
| `sweep/` | Fit sweep over every screen at six sizes (1366×900, 1536×1024, 768×1024 and 1024×768 with touch, 390×844 and 360×740 with touch): sideways scroll, things off screen or cut off, things covered by the header / tab bar / Daily button, pop-ups off screen and tap targets under 40 px (a button passes if taps 20 px from its centre still land on it). `setup.cjs` makes one test player per size (with a friend, coins and rare cards), `runall.cjs` runs `sweep.cjs` for all sizes and prints totals, `traderoom.cjs` checks the Trade Room with two live players. Data goes to `$DATA` (default `<tmp>/ember-sweep`), pictures to `$OUT` | `cd sweep; BASE=http://127.0.0.1:8848 node setup.cjs; OUT=/tmp/shots TAG=before node runall.cjs` (`SIZES=390x844 SCREENS=home,stats node sweep.cjs` for a few) |
| `quiet.cjs` | Helper, not run by itself: closes the beginner guide and the Daily rewards panel for a new test player | `await quiet(page)` |

All scripts were checked against `main` on 4 Nov 2026 (after PR #41).

**Last speed check (4 Nov 2026, after the load-faster change, simulated 4G, empty cache, new player):** phone 390×844: about 2.0 MB, 62 requests, page loaded in ~1.9 s (first paint ~0.4 s, largest paint ~1.8 s). Desktop 1366×900: about 2.6 MB, 66 requests, ~2.1 s (first paint ~0.4 s, largest paint ~2.1 s). A returning player's Home picture shows in ~0.9 s on both. Scripts are about 235 KB of that; images are most of the weight (the creature sheet `mythlings-atlas-v2.webp` is 416 KB). The first screen's picture is preloaded per screen size in `game/index.html`; the binder cover logo is fetched after the page has loaded.
