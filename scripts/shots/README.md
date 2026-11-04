# Browser check scripts (Playwright)

Quick scripts used to check features in a real browser. They are not part of `npm test`.

Start the game first (see `NEXT-CHAT-HANDOFF.md`), then run a script from this folder. Screenshots are written to the folder you run it from. Set `BASE` to use another address (default `http://127.0.0.1:8848`).

| Script | What it does | Example |
|---|---|---|
| `shot.cjs` | Screenshot one page at any size, with touch on | `node shot.cjs 768 1024 rules out.png` (`FULL=1` for a full page) |
| `tp.cjs` | Portrait tablet pages: rules, training, trading | `FULL=1 node tp.cjs 768 1024 training tp.png` |
| `alerts.cjs` | Two live accounts: befriend, invite (badge and pop-up), 2-for-1 trade, Trade complete, Past trades | `node alerts.cjs` or `W=768 H=1024 TOUCH=1 node alerts.cjs` |
| `daily.cjs` | Daily rewards: login claim, quest from a real pack, bonus, weekly, day 7 | `node daily.cjs` |
| `rare.cjs` | Opens a Legend Pack with lucky rolls; rare-find banner and profile | `node rare.cjs` |
| `speed.cjs` | First-visit size and time over simulated 4G, empty cache | `node speed.cjs` or `W=1366 H=900 node speed.cjs` |
| `artcheck.cjs` | Finds broken images and failed downloads on the welcome screen and binder | `node artcheck.cjs` |

`alerts.cjs`, `daily.cjs` and `rare.cjs` need the features from PRs #31 to #34 merged.
