# EMBERLINGS — handoff for another computer
Updated November 1, 2026. Current live version: 60.

## Play
https://mythlings-adventure.proud-book-0456.chatgpt.site/

## Continue development
This is an existing game: update it, do not rebuild it. The user prefers quick changes and a few focused tests.

GitHub repository: https://github.com/1983stevec-gif/EMBERLINGS
The user created this repository as public. Preserve its visibility. Keep the existing Sites project for live publication.

The accompanying Emberlings-source.zip contains the current tracked project. Emberlings-history.bundle contains its Git history and main branch. Both exclude local player saves, local databases, dependencies, and credentials.

To restore history on another computer, install Git and Node.js 22.13 or newer, then run in the folder containing the bundle:

```sh
git clone Emberlings-history.bundle emberlings
cd emberlings
npm ci
npm run build
npm start -- --port 8848
```

Open http://127.0.0.1:8848/ after the server reports ready. For ZIP, extract it and run the same npm commands in the extracted project folder. Local multiplayer uses a separate local database; use the public game to reach the existing online friends and trade service.

Clone the GitHub repository on the other computer with git clone https://github.com/1983stevec-gif/EMBERLINGS.git. Pull before editing; commit and push completed changes. Publishing the game still requires the Sites publishing workflow; pushing to GitHub alone does not update the public game.

## Give this to Codex on the other computer
Continue my existing EMBERLINGS game from this project. Read this handoff and inspect the current code before changing anything. Preserve gameplay, player progress, inventory, coins, Vault upgrades, multiplayer and all artwork. Keep changes quick and use only a few relevant checks plus the required build. Use the existing Sites project for publication, not a new project.

Sites project ID: appgprj_6ade72f8031081918f304ef6bf4af0fb
Live version: 60
Source commit: 6554c0c1517c0000b93f4bc8e8434e5bf866c27d (PR #28 main plus user-requested transparent logo)
Save key: mythlings-playable-v1 — NEVER rename or clear it.

Main implementation: game/index.html
Card rules and Equip Best: public/card-engine.js
Combat metadata/mutations: public/combat-rules.js
Progression/Vault rates: public/card-progression.js
Multiplayer: lib/card-api.mjs, lib/social-api.mjs, lib/trade-api.mjs
Artwork: public/art/
Focused tests: tests/equip-best.mjs, tests/visual-update.cjs
Some older tests encode superseded requirements; inspect them before treating failures as regressions.

## Current rules to preserve
- Game title EMBERLINGS; creatures Mythlings. Sixteen species, illustrated 2D cards.
- Deck: 1–20 cards, at least one Basic, max two copies of each card, limited by owned copies. Evolution stages are battle forms.
- Equip Best considers the whole available collection, selects strongest actual copies including mutation/rarity, retains evolution chains and max three Merfling types. It optimizes a damage/health/rarity strength score; it does not guarantee wins. Vault/trade-locked Mythlings excluded.
- Merfling is earned by ending a turn, including attacking. No initial free Merfling.
- Packs award exactly five, with one-by-one or reveal-all animation.
- Hacker Pack: 600,000 coins; Voltix (dragon), Noctalon (crow), Crystella, Frostbit, Umbryx and boosted Emberoo. Equal species odds. These species share the highest base damage with equal upgrades, including previously owned copies.
- Celestial Pack: 6,000 coins; Sparquill, Cindermane, Glacipaw. Its former lineup is removed. No rare-dragon callout.
- Cosmic now grants 100x Vault earnings, not 1,000x. Its attack modifier is unchanged.
- Current whole base Vault rates: 4, 9, 20, 40, 80, 150, 280 by rarity. Unmutated rates cap at 450/sec after level/shiny/permanent bonuses; mutation multipliers apply AFTER that cap, so Cosmic can exceed 450. All displayed earning rates and collected coins remain whole numbers.
- Vault rate edition 5 settles accrued earnings at prior rates before changing rates. Preserve pending fractions and prevent double collection.
- No Rebirth or Shop UI. Preserve already-earned permanent coin bonuses. Adventure HQ is the bottom map tab; its obsolete island-name strip is removed.
- Saved decks equip from top buttons. Hold/right-click a name for Delete. Deletion keeps the current equipped loadout and all creatures.

## Player progress is separate from source code
Free accounts (username + password) and cloud save are available under Account in the user menu. Local progress still uses mythlings-playable-v1; never rename or clear this key. On another browser, sign in and explicitly load the cloud save. GitHub does not contain player saves. Localhost and the public site have separate browser storage. Finish active trades and battles before transferring saves.

## Publishing
Use the installed Sites skill. Read .openai/hosting.json; preserve project ID and public audience. Obtain fresh credentials through Sites tools; never put tokens in code, Git, handoff files or chat. Use the Sites source helper to prepare/push/package the exact source and build output, then save_site_version and deploy_site_version. A GitHub remote is for cross-computer code collaboration, separate from Sites publication.

Original checkout:
C:/Users/djste/Documents/Codex/2026-10-25/continue-developing-my-existing-playable-mythlings/work/mythlings-site

Latest checks passed: focused Vault/Cosmic/migration and visual/preset checks; production build; successful native public deployment. No claim of full-suite or cross-device gameplay testing.

## Publish result - October 31, 2026 (America/Chicago)

Published version 46 publicly to https://mythlings-adventure.proud-book-0456.chatgpt.site/ from GitHub PR #17 merge fff84a2. No gameplay or artwork changes.

- npm run install:ci: PASS. npm run build: PASS.
- npm test: FAIL in tests/dragon-pack.cjs at assert(dragon.damage>other.damage); conflicts with the documented equal-damage lineup. Tests and gameplay were not rewritten.
- node tests/visual-update.cjs: all 3 reports PASS.
- Migration 0006 already applied; not rerun. Migration 0007 applied by Sites before Worker publication; password_hash and cloud_saves verified afterward.
- Live account API: password setup, separate-session login, and exact cloud-save payload retrieval PASS using isolated account QA_mvx4a6az. Both test sessions logged out. This verifies the server roundtrip, not browser game-save import.
- Step 6 checks 1-4: NOT VERIFIED visually. Browser control timed out; public URL open was queued. Welcome art/logo, all painted screens/header, 768-1199px bottom picture menu/gold selection, and pack shuffle/reveal require browser review.
- Step 6 check 5: API checks PASS; cross-browser UI and game-save loading NOT VERIFIED.
- Step 6 check 6: existing-player coins/cards/progress NOT VERIFIED on their device. No existing player data was cleared or modified; save key unchanged; focused preservation checks pass.

## Publish result - October 31, 2026: PR #19

PR #19 merged with user approval. Published version 47 from exact main commit 69ab0dbba58a54a31ec5486e7f1dddb86dfa535a to https://mythlings-adventure.proud-book-0456.chatgpt.site/. Public audience preserved. No additional gameplay or artwork changes.

Free accounts (username + password), cloud save under Account, and a level path through 100 now exist. Save key remains mythlings-playable-v1.

- npm run install:ci and npm run build: PASS.
- Live migrations 0006 and 0007 already applied; both skipped. title, password_hash and cloud_saves verified before publish.
- Live browser at 820x1180: painted Adventure HQ and burning-logo assets loaded; flame CSS animations uiBurn/uiBurn2/uiFlick active. Full-width portrait map, quest/deck panels and bottom journey bar verified.
- Five bottom picture buttons and gold selected tile: PASS.
- Home Your adventure starts here cards and working Login & Password route: PASS.
- Fusion Lab printed cards: PASS.
- Profile Log out: PASS.
- Account screen reports a cloud save. Password setup, independent-session login and exact save retrieval via API: PASS on isolated test account QA_mvx6f788; sessions logged out. Full second-browser game-save import remains NOT VERIFIED; no existing player password changed.
- Existing browser player tero: 400 coins before and after reload; collection remains visible with five cards. No claim of exhaustive preservation audit for all players.
- Full visual coverage of every painted screen not performed. Tablet viewport override reset after checks.


## Publish result - November 1, 2026 (America/Chicago)

Published public version 60 to https://mythlings-adventure.proud-book-0456.chatgpt.site/ from source 6554c0c1517c0000b93f4bc8e8434e5bf866c27d. Pulled GitHub main d6aa9ab, including PR #28 merge 6f995d2. User then requested the attached new logo without its background; added a transparent PNG and wired the shared compact/painted header. No gameplay changes. Sites history reconciled while retaining the GitHub main file tree before the logo edit.

- npm run install:ci: PASS. npm run build: PASS.
- node tests/trades-server.mjs: PASS, 14 reports including multi-Mythling atomic trades.
- node tests/equip-best.mjs: PASS, 3 reports including inventory preservation, levels and mutations. Known older failing tests were not changed.
- Migrations 0006 and 0007 already present: players.title, players.password_hash and cloud_saves confirmed; neither rerun.
- Live HTTP checks: root, ui.js, transparent logo, academy/rules/trading/trade-room artwork, field-guide.js and results.js return 200. All checked static assets match local SHA-256.
- Requested check 1 (readable 12-step guide): visual/interactive check NOT VERIFIED.
- Check 2 (Academy and Battle Rules): live artwork source match PASS; visual layouts NOT VERIFIED.
- Check 3 (parchment Mythling Index): field-guide script source match PASS; visual layout NOT VERIFIED.
- Check 4 (knockout banner, hand arrows, End Turn, defeat/victory): result script source match PASS; live battle flow NOT VERIFIED.
- Check 5 (Friend Trading, Trade Room, five-card offers, grouped picker): live artwork source match and server multi-card tests PASS; browser interaction NOT VERIFIED.
- Check 6 (existing coins/cards/levels): no live player data or save key changed; focused preservation test PASS; existing-player browser comparison NOT VERIFIED.
- Browser checks blocked because local browser use is disabled in Work settings. No player saves, credentials, databases or dependencies included in the commit.

## Publish result - November 15, 2026 (America/Chicago)

Published public version 68 to https://mythlings-adventure.proud-book-0456.chatgpt.site/.
Deployed source: dec0c91cc6fdb124c7048e2cbd8e008fef37d5ef. GitHub main was
39dd1eb91a34342047665b8fd9d885845805e2cc (PR #89, r4-wrapup).
Reconciled divergent Sites history with a history-only merge retaining the exact
GitHub PR #89 file tree (git diff between the two source trees is empty).
No gameplay or artwork edits. Existing project and public audience preserved.
Save key remains mythlings-playable-v1; no player save was cleared or renamed.

- npm run install:ci: PASS (682 packages).
- npm run build: PASS.
- npm test: PASS, exit 0, all 30 active test files completed; no tests changed.
- 0006 and 0007 already present (title, password_hash and cloud_saves).
- 0008 and 0009 were missing before publication. Sites applied pending migrations
  before Worker upload. After successful deployment, players.profile and both
  activity_events/activity_cheers are confirmed present. No new migrations added.
- Source helper push/package, save_site_version and deploy_site_version: PASS.
- Deployment ID: appgdep_6afa5dde50fc8191912aed5b7cf67725.
- Saved version ID: appgprj_6ade72f8031081918f304ef6bf4af0fb~appgver_5d5c9701d6b081918a812796f166f77c.
- Archive SHA-256: 0f98219105261fe37e9e7911d00f6316b892fd6fe3044db53cfa091f4b7ec943.
- Live root returns HTTP 200. All 57 public root JavaScript files, manifest,
  WebP logo and creature atlas return 200 and exactly match local SHA-256.
  Service worker has JavaScript content type; manifest has application/manifest+json.
- Browser verification BLOCKED: in-app browser timed out attaching its webview;
  native Edge observation failed because the window remained minimized, including
  after an app-launch recovery attempt. No existing player's browser was changed.

### PUBLISH-CODEX.md step 6: individual live checks

HTTP/source checks below are partial evidence, not a browser interaction PASS.
No phone/tablet/desktop visual or multi-account user-flow verification is claimed.

1. Existing players: NOT VERIFIED on an existing player; save-preservation suite passed.
2. Faster first load: PARTIAL - live WebP logo/atlas match; phone transfer size and timing NOT VERIFIED.
3. Portrait tablet layouts: NOT VERIFIED.
4. Trade alerts/past trades: PARTIAL - live script match; invitations, pop-up and completed-trade UI NOT VERIFIED.
5. Rare finds: PARTIAL - live script match; pull/banner UI NOT VERIFIED.
6. Daily rewards: PARTIAL - live script match; daily panel and one-time claim UI NOT VERIFIED.
7. Boss intro/art: PARTIAL - live script match; entrance, skip and battle flow NOT VERIFIED.
8. Animations: PARTIAL - live effect scripts match; rendered effects NOT VERIFIED.
9. Phone overflow/map: NOT VERIFIED.
10. Profiles: PARTIAL - players.profile confirmed and script match; showcase/frame/second-account UI NOT VERIFIED.
11. Card details: PARTIAL - live script match; drag/flip/details UI NOT VERIFIED.
12. Collection/deck codes/highlights: PARTIAL - live scripts match; live user flow NOT VERIFIED.
13. Menu: PARTIAL - live scripts match; menu/options/once-only display NOT VERIFIED.
14. Sound: NOT VERIFIED audibly.
15. Logo/Home: PARTIAL - WebP logo and Home script match; rendered arch/lighting NOT VERIFIED.
16. Friend activity: PARTIAL - both activity tables confirmed and script match; two-account cheer/privacy flow NOT VERIFIED.
17. Cosmetics/stats/share card: PARTIAL - live scripts match; UI and sharing NOT VERIFIED.
18. Music: NOT VERIFIED audibly or interactively.
19. Online presence/spectating: PARTIAL - live scripts match; three-account flow NOT VERIFIED.
20. Bell/Settings/tips: PARTIAL - live scripts match; interactive UI NOT VERIFIED.
21. Gallery/favourites: PARTIAL - live scripts match; gallery/hold/filter UI NOT VERIFIED.
22. Autumn decorations: PARTIAL - live script match; rendered season/toggle NOT VERIFIED.
23. Install/PWA: PARTIAL - sw.js and manifest return 200, correct MIME types and exact source matches; source excludes /api/ from caching. Browser activation/caches/revisit/online flows NOT VERIFIED.
24. Phone header/large coins: NOT VERIFIED at 390 px.
25. Help centre: PARTIAL - live scripts match and help tests pass; live search/navigation NOT VERIFIED.
26. Collection milestones: PARTIAL - live script match and milestone tests pass; live banner/share NOT VERIFIED.
27. Weekly recap: PARTIAL - live script match and recap tests pass; live numbers/image sharing NOT VERIFIED.
28. Comfort settings: PARTIAL - live script match and comfort tests pass; live purchase cancellation NOT VERIFIED.
29. Save safety: PARTIAL - live script match and restore/preservation tests pass; existing-player live restore/sign-in NOT VERIFIED.
30. Deck pictures/friend notes: PARTIAL - live scripts match and tests pass; live sharing/nickname/favourite UI NOT VERIFIED.
31. Look pack A/screenshot mode: PARTIAL - live scripts match; clouds/parchment/hide-and-restore UI NOT VERIFIED.
32. Round 4 What's New: PARTIAL - live script match; returning-player once-only display NOT VERIFIED.

The release is deployed; the 32-item browser acceptance remains incomplete.
No credentials, player saves, local databases or dependencies are committed.
