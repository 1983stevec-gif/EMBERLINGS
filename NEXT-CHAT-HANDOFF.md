# EMBERLINGS: handoff for a new chat

Give this file to a new chat to continue the work. Copy the box below as the first message, then ask for whatever you want next.

```
You are continuing work on my browser card game EMBERLINGS
(GitHub: 1983stevec-gif/EMBERLINGS). Read NEXT-CHAT-HANDOFF.md in the
repository root first, then HANDOFF.md and START-HERE.md. Follow the rules
in them. Every change goes in its own pull request; only merge when I say
"merge". After merging, give me the Codex prompt to publish.
```

---

## 1. What the game is

EMBERLINGS is an original collectible card game that runs in the browser. Players collect creature cards called **Mythlings**, open packs, build 1–20 card decks and play turn-based card battles (Active + Bench, "Merfling" battle energy, first to 3 points). They can also battle and trade with friends online.

The game has a painted look: desktop pages are drawn from supplied design images ("mockups"), with live buttons and text placed on top. It has 16 species, 12 mutations, levels up to 100, fusion, a Vault that earns coins, quests on five islands, achievements and titles, and accounts with cloud saves.

## 2. Rules that must not be broken

- **Save key:** `mythlings-playable-v1`. Never rename or clear it. New save data must be added only when it's missing, so old saves keep loading.
- **No secrets in the repo or chat:** don't commit credentials, browser saves, local databases or `node_modules`. Get fresh credentials through the Sites tools. Never put tokens in code, Git, handoff files or chat.
- **Live site:** keep using the existing Sites project `appgprj_6ade72f8031081918f304ef6bf4af0fb`. Publishing is done by **Codex** (it has the Sites tools). Claude prepares the code and writes the Codex prompt (see `PUBLISH-CODEX.md`).
- **Owner's preferences:**
  - Keep it a card game: no first-person or walk-around views, no lag.
  - When given a design image, match it exactly and keep our own card designs.
  - Plain, friendly wording. Every change goes in its own PR, and merge only on "merge".
- **Pack-only mutations:** Bloom, Tide, Crystal, Solar, Void and Prism can only come from packs. They can't be bought, and nothing else may grant them.
- Don't put AI model names in commits, PRs or code.

## 3. Where things stand (4 Nov 2026)

**Live:** Codex published **version 60** from `main` (commit `de355ac`). Everything below is merged into `main` but **not published yet**. `PUBLISH-CODEX.md` has the publish prompt for this release.

**Merged since version 60 (PRs #29 to #76):**

| PR | Branch | What it does |
|---|---|---|
| [#29](https://github.com/1983stevec-gif/EMBERLINGS/pull/29) | `fix-tests` | All tests pass. `npm test` runs the whole active suite (about 104 checks, ~30 s). Retired old tests moved to `tests/retired/`. Adds a Vault step to the beginner guide. |
| [#30](https://github.com/1983stevec-gif/EMBERLINGS/pull/30) | `v2-plan` | `V2-PLAN.md` (item drops, training levels, login streaks, heroes and pets), this handoff, and `scripts/shots/`. |
| [#31](https://github.com/1983stevec-gif/EMBERLINGS/pull/31) | `tablet-pages` | Portrait tablet layouts for Battle Rules, Training, Friend Trading and Trade Room. Fixes invitations vanishing from the trading table. |
| [#32](https://github.com/1983stevec-gif/EMBERLINGS/pull/32) | `trade-history` | Trade alerts (`trade-alerts.js`): Friends invite badge, invitation pop-up, "Trade complete!" screen, Past trades. The server adds the partner's name to receipts. |
| [#33](https://github.com/1983stevec-gif/EMBERLINGS/pull/33) | `rare-finds` | Rare finds (`rare-finds.js`): "Rare / Very rare find!" banner after special pack pulls; "Your rarest find" on Achievements. |
| [#34](https://github.com/1983stevec-gif/EMBERLINGS/pull/34) | `daily-rewards` | Daily rewards (`daily.js`): 7-day login streak, 3 daily quests, weekly challenge, Daily button. The panel opens by itself once a day on Home. |
| [#35](https://github.com/1983stevec-gif/EMBERLINGS/pull/35) | `load-speed` | WebP art and logos, and no hidden header downloads on tablets. First load goes from ~8.6 MB to ~2.1 MB. |
| [#36](https://github.com/1983stevec-gif/EMBERLINGS/pull/36) | `boss-intro` | Boss introductions (`boss-intro.js`): a short entrance when a boss quest battle opens. |
| [#37](https://github.com/1983stevec-gif/EMBERLINGS/pull/37) | `boss-art` | Painted boss portraits in `public/art/bosses/`, used by the boss intro. |
| [#38](https://github.com/1983stevec-gif/EMBERLINGS/pull/38) | `fx-menus` | Menu and reward animations (`fx-menus.js`). |
| [#39](https://github.com/1983stevec-gif/EMBERLINGS/pull/39) | `fx-battle` | Battle attack animations (`fx-battle.js`). |
| [#40](https://github.com/1983stevec-gif/EMBERLINGS/pull/40) | `fx-cards` | Card shine and foil effects (`fx-cards.js`). |
| [#41](https://github.com/1983stevec-gif/EMBERLINGS/pull/41) | `fx-packs` | Pack opening effects (`fx-packs.js`). |
| [#42](https://github.com/1983stevec-gif/EMBERLINGS/pull/42) | `fx-setting` | Effects setting Full / Light / Off in the user menu and Settings (`fx-level.js`, saved in `state.ember.fx`; Off also sets `state.reducedMotion`). |
| [#43](https://github.com/1983stevec-gif/EMBERLINGS/pull/43) | `fx-sound` | Synthesized sounds for the new effects (`fx-sound.js`), controlled by the existing Sound button. |
| [#44](https://github.com/1983stevec-gif/EMBERLINGS/pull/44) | `boss-art-painted` | Richer boss art (sources and render script in `scripts/art/bosses/`). |
| [#45](https://github.com/1983stevec-gif/EMBERLINGS/pull/45) | `profiles` | Profiles (`profile.js`, `profile-items.js`, `lib/profile-api.mjs`): showcase, frames, backgrounds, badges; friends can view. **Needs migration `drizzle/0008_player_profile.sql`.** |
| [#46](https://github.com/1983stevec-gif/EMBERLINGS/pull/46) | `install-app` | Install as an app (`manifest.webmanifest`, `sw.js`, `pwa.js`, new app icons); never caches `/api/`. |
| [#47](https://github.com/1983stevec-gif/EMBERLINGS/pull/47) | `battle-highlights` | Battle highlights on Victory/Defeated with a shareable picture (`highlights.js`). |
| [#48](https://github.com/1983stevec-gif/EMBERLINGS/pull/48) | `phone-polish` | Phone layout fixes (map visible, no sideways scroll), `scripts/shots/quiet.cjs`, docs. |
| [#49](https://github.com/1983stevec-gif/EMBERLINGS/pull/49) | `card-details` | Card details page with a card you can turn (`card-details.js`); records where new cards came from in `state.ember.cardOrigins`. |
| [#50](https://github.com/1983stevec-gif/EMBERLINGS/pull/50) | `home-life` | Home life (`home-life.js`): floating Mythlings, time-of-day lighting, weather, animated logo. |
| [#51](https://github.com/1983stevec-gif/EMBERLINGS/pull/51) | `logo-arch` | Header logo: art back inside the arch (`scripts/art/logo-arch.cjs`) and a soft drop backdrop. |
| [#52](https://github.com/1983stevec-gif/EMBERLINGS/pull/52) | `accessibility` | Accessibility (`a11y.js`): text size, element symbols, keyboard and screen-reader support (`state.ember.a11y`). |
| [#53](https://github.com/1983stevec-gif/EMBERLINGS/pull/53) | `collection-tracker` | Collection page (`collection.js`): completion, goals, filters. |
| [#54](https://github.com/1983stevec-gif/EMBERLINGS/pull/54) | `whats-new` | What's New panel (`whats-new.js`, release notes list at the top) and a loading screen with tips. |
| [#55](https://github.com/1983stevec-gif/EMBERLINGS/pull/55) | `deck-share` | Deck share codes, import and Deck ideas (`deck-share.js`). |
| [#57](https://github.com/1983stevec-gif/EMBERLINGS/pull/57) | `gameplay-ideas` | `GAMEPLAY-IDEAS.md`: every gameplay idea and the owner decisions. |
| [#58](https://github.com/1983stevec-gif/EMBERLINGS/pull/58) | `cosmetics` | Card backs and avatar rings unlocked by achievements (`cosmetics.js`, `profile-items.js`). |
| [#59](https://github.com/1983stevec-gif/EMBERLINGS/pull/59) | `share-card` | Share a card, rare pull or pack as a picture (`share-card.js`). |
| [#60](https://github.com/1983stevec-gif/EMBERLINGS/pull/60) | `my-stats` | My Stats page (`stats.js`, `state.ember.stats`). |
| [#61](https://github.com/1983stevec-gif/EMBERLINGS/pull/61) | `fx-music` | Optional background music, off by default (`fx-music.js`). |
| [#62](https://github.com/1983stevec-gif/EMBERLINGS/pull/62) | `friend-activity` | Friend activity and cheers (`activity.js`, `lib/activity-api.mjs`). **Needs migration `drizzle/0009_activity.sql`.** |
| [#63](https://github.com/1983stevec-gif/EMBERLINGS/pull/63) | `fit-polish` | Fit and polish at six sizes. |
| [#64](https://github.com/1983stevec-gif/EMBERLINGS/pull/64) | `load-faster` | Faster first load (preloads, smaller creature sheet, lighter binder). |
| [#65](https://github.com/1983stevec-gif/EMBERLINGS/pull/65) | `enhancement-ideas` | `ENHANCEMENT-IDEAS.md` and release notes. |
| [#66](https://github.com/1983stevec-gif/EMBERLINGS/pull/66) | `friend-online` | Friends' online status, last seen and In a duel (`presence.js`, `POST /api/social/presence`). |
| [#67](https://github.com/1983stevec-gif/EMBERLINGS/pull/67) | `ci-checks` | GitHub Actions runs build and `npm test` on every PR (`.github/workflows/checks.yml`). |
| [#68](https://github.com/1983stevec-gif/EMBERLINGS/pull/68) | `settings-hub` | Settings page (`settings.js`, `window.EmberSettings.addSection`). |
| [#69](https://github.com/1983stevec-gif/EMBERLINGS/pull/69) | `spectate` | Watch a friend's live duel, read-only (`spectate.js`, `lib/spectate-api.mjs`). |
| [#70](https://github.com/1983stevec-gif/EMBERLINGS/pull/70) | `inbox` | Notification bell (`inbox.js`). |
| [#71](https://github.com/1983stevec-gif/EMBERLINGS/pull/71) | `fix-flaky-quest-test` | Quest-victory test made deterministic. |
| [#72](https://github.com/1983stevec-gif/EMBERLINGS/pull/72) | `art-gallery` | Art gallery and lore (`gallery.js`, `lore.js`). |
| [#73](https://github.com/1983stevec-gif/EMBERLINGS/pull/73) | `binder-tools` | Favourites, saved binder views, CSV/picture export (`binder-tools.js`). |
| [#74](https://github.com/1983stevec-gif/EMBERLINGS/pull/74) | `first-tips` | First-time tips (`tips.js`, `window.EmberTips`). |
| [#75](https://github.com/1983stevec-gif/EMBERLINGS/pull/75) | `polish-2` | Polish round 2 and the sweep scripts in `scripts/shots/sweep/`. |
| [#76](https://github.com/1983stevec-gif/EMBERLINGS/pull/76) | `seasons` | Seasonal decorations (`seasons.js`, `window.EmberSeasons`). |

Two need a database migration: #45 (`0008_player_profile.sql`) and #62 (`0009_activity.sql`); the rest need none. Every PR now runs the build and tests automatically on GitHub. First load (simulated 4G, empty cache) is about 2.1 MB on a phone and 3.0 MB on desktop; the four effect modules add about 25 KB of that (compressed).

**When adding a release:** add an entry to the top of `RELEASES` in `public/whats-new.js` so returning players see what's new.

**Next work:** the phases in `V2-PLAN.md` (v2.0 to v2.6). It ends with 8 decisions for the owner. Ask about the ones that matter before building.

## 4. Where files are saved

All project files are in the GitHub repository **1983stevec-gif/EMBERLINGS**. Anything not pushed there is lost when a chat ends.

| What | Where |
|---|---|
| Main game (one big script inside one HTML file) | `game/index.html` |
| Add-on game modules (loaded by `<script type="module">` tags at the end of `game/index.html`) | `public/*.js` (see section 5) |
| All styles | `public/theme.css` (new styles are added at the end, in commented blocks) |
| Shared rules: cards, levels, specials, battle engine | `public/card-engine.js` |
| Shared rules: rarities, mutations, Vault rates, pack mutation odds | `public/combat-rules.js` |
| Progression: Vault maths, Shop items, training rewards | `public/card-progression.js` |
| Server API (Cloudflare Workers, D1 database) | `lib/social-api.mjs` (friends, accounts), `lib/trade-api.mjs` (trades), `lib/card-api.mjs` (online battles), `lib/match-engine.mjs`, `worker/index.ts`, `app/api/` |
| Database tables and migrations | `db/schema.ts`, `drizzle/0000…0007_*.sql` |
| Creature art | `public/art/mythlings/` (single images) and `public/art/mythlings-atlas-v2.webp` (sheet for the first 10 species) |
| Page art cut from the design images | `public/art/ui/` (backgrounds, header bars, tablet tiles, home cards) |
| Logos | `public/branding/` |
| Scripts that cut and clean design images (Python and OpenCV) | `scripts/art/` |
| Automated tests (`npm test` runs the active ones) | `tests/` (runner: `tests/run-card-edition.mjs`; harness: `tests/batch3-harness.cjs`; old ones in `tests/retired/`) |
| Browser check scripts (Playwright) | `scripts/shots/` (see its README) |
| Build output (generated, not edited) | `dist/` |
| Plans and notes | `V2-PLAN.md`, `HANDOFF.md` (kept up to date by Codex after each publish), `START-HERE.md`, `PUBLISH-CODEX.md` (Codex publish prompt), `POCKET-RULES.md` (battle rules), `ONLINE-PLAY.md`, `VAULT-UPDATE.md`, `VISUAL-UPDATE.md`, `GRAPHICS-PLAN.md`, `docs/` |
| Screenshots for the owner | `.preview/` in the working copy. **Not saved in Git** (it's excluded), so make new ones in each chat. |
| Design images the owner sends in chat | Not saved anywhere automatically. Ask them to resend if needed. |

## 5. How the code fits together

- **`game/index.html`** holds the whole core game in one script. At the end it exposes **`window.EmberBridge`**, which gives:
  - `state`, `view`, `go(view)`, `save()`, `transact(fn)` (saves, or rolls back if saving fails), `toast()`
  - `cardHTML(card)` (the printed card), `art(card)`, `species`, `MUTATIONS` (a list), `packCatalog()`, `grantXP`, `online(path, body)`, `registerView(name, render)`, `render(html)`, `tradeNotices`, and more

  It also sends browser events named `ember:*`: `frame` (after every screen draw), `levelUp`, `packRoll`, `packReveal`, `packSummary`, `fusion`, `coins` (Vault collect), `cardBattle`, `cardResult`, `friends`. `tradeInvites` and `tradeComplete` (used by `trade-alerts.js` and `daily.js`).
- **Add-on modules in `public/`** listen to those events and add features without touching the core:

  | Module | Purpose |
  |---|---|
  | `enhancements.js` | sounds, 3D pack reveal, achievements, effects |
  | `ui.js` | header, tablet picture menu, Home |
  | `ui-exact.js` | painted "exact" pages and portrait-tablet pages |
  | `cloud.js` | accounts, cloud save, log out |
  | `battle-fx.js` | battle board helpers, knockout banner, hand arrows |
  | `pack-shuffle.js` | pack shuffle animation |
  | `levels.js` | level-up pop-up |
  | `mutation-book.js` | mutation pages |
  | `field-guide.js` | Mythling Index |
  | `results.js` | Victory and Defeated screens |
  | `achievements.js` | achievements |
  | `trade-alerts.js` | Friends invite badge, invitation pop-up, "Trade complete!" screen, Past trades |
  | `rare-finds.js` | "Rare / Very rare find!" banner after special pack pulls; "Your rarest find" on Achievements |
  | `daily.js` | Daily rewards: login streak, daily quests, weekly challenge, Daily button (saved under `state.daily`) |
  | `boss-intro.js` | short boss entrance (crest, name, challenge) when a boss quest battle opens; tap or press a key to skip |
  | `fx-battle.js` | battle animations: element attack effects, lunge, hit shake, floating damage numbers, evolve/Active glow |
  | `fx-packs.js` | pack effects: pack tearing open, rarity glow and light rays, build-up before special cards, fanfare for the rarest pulls |
  | `fx-cards.js` | card effects: holographic foil with 3D tilt, shine sweep on rare and mutated cards, smoother binder pages |
  | `fx-menus.js` | menu effects: quick screen transitions, coin showers, counting coin counter, livelier level-up, opening chest for daily rewards |
  | `cosmetics.js` | card backs and avatar rings unlocked by achievements, and an avatar Mythling of your choice (picked on My Profile, saved in `state.ember.profile.cardBack` / `.ring` / `.avatar`). Sets `<html data-cardback>` / `data-avring`; `.cosBack` draws a face-down card |

  All of these are presentation or add-on features: they talk to the game only through `EmberBridge`, `ember:*` events and the page.
- **Painted ("exact") pages:**
  - A cleaned design image is the page background.
  - Live parts are placed in the design's own pixel positions using the helpers in `ui-exact.js`: `canvas(W,H,bg,cls,inner)`, `box`, `fs`, `hot`, `text`, `fitCard`.
  - The `CROP` map trims each background.
  - Art is cut by the scripts in `scripts/art/`.
- **Screen sizes:**
  - Desktop exact pages show when `wide()` is true (1000 px and up, or a landscape screen of 700 px and up).
  - Tablet layouts show only on touch screens (`pointer:coarse`), via `touchTablet()` and `tabPortrait()`.
  - The tablet picture menu shows on touch screens 700–1199 px wide. The painted header shows at 900 px and up.
  - Narrow desktop windows keep the desktop look.
- **Trades:** offers are lists of up to 5 card ids, stored in the existing `host_offer` / `guest_offer` columns. The swap is all-or-nothing on the server (`json_each`). The client applies a signed "receipt" exactly once (`applyTradeReceipt`).

## 6. How to work on it

From the repository folder:

```bash
npm run install:ci
```

```bash
npm run build
```

```bash
setsid nohup npm start -- --port 8848 > /tmp/srv.log 2>&1 &
```

The game is then at `http://127.0.0.1:8848/`. **After every rebuild, restart the server**, otherwise pages fail with wrong-file-type errors:

```bash
pkill -f '[w]rangler.js dev'
```

Then run the start command again and wait about 12 seconds.

Run the tests:

```bash
npm test
```

Browser checks: run the scripts in `scripts/shots/`. Playwright and Chromium are already installed in Claude's cloud environment; don't reinstall them. Test at desktop sizes (1366×900, 1536×1024) and tablet sizes (768×1024 and 1024×768, with touch on). Copy screenshots for the owner into `.preview/` and send them.

Online features (friends, trades) need two separate browser contexts signed in as two new players. `scripts/shots/alerts.cjs` shows how. On tablet sizes, the friend form is hidden behind "Add Player". Befriend at desktop size first, or open the form.

## 7. Git and PR habits that worked

- One branch and one PR per change, with a plain-English PR description and screenshots sent in chat.
- Use `env -u GH_TOKEN gh api ...` for GitHub calls: creating PRs, merging (`PUT .../pulls/N/merge` with `merge_method=merge`), and checking `mergeable_state`.
- New branches pushed in this environment may need:

  ```bash
  git config --add remote.origin.fetch '+refs/heads/BRANCH:refs/remotes/origin/BRANCH'
  ```

  then `git branch -u origin/BRANCH`, so they show as pushed.
- When PRs conflict after an earlier one merges, it's almost always CSS added at the end of `public/theme.css` or a `CROP` line in `ui-exact.js`. Merge `origin/main` into the branch, keep both sides, rebuild, retest, push, then merge.
- Codex sometimes pushes to `main` (publishes, art, fixes). Always `git fetch` and check `main` before merging.

## 8. Things learned the hard way

- `MUTATIONS` is a **list**: look names up with `.find(m => m.id === id)`.
- Moving elements out of a list that a `MutationObserver` watches triggers another repaint. Guard against re-processing (see `moveInvites` in `ui-exact.js`).
- Playwright screenshots after resizing a "mobile" browser can drop fixed elements. For final tablet screenshots, open a fresh browser at tablet size (you can copy login cookies with `storageState`).
- The 3D pack reveal takes about 3 seconds. Anything shown "after the reveal" needs a delay.
- Big PNGs slow the first load a lot. Use WebP (Pillow: `quality=88–90, method=6`, and `alpha_quality=100` for transparent images), and size images to how large they're actually shown.
- The tests run the game in a Node sandbox. Override `g.sandbox.Math` to make random results repeatable.

## 9. Ideas waiting

- Everything in `V2-PLAN.md`: item drops, the training rework, the login streak upgrade, heroes, pets, and the new player introduction.
- Two trade safety checks have no newer test yet (see `tests/retired/README.md`): recovering a lost "accept" reply, and a stale accept asking for review again.
- Phone layouts for the newest pages (tablet and desktop are covered).
