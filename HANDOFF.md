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
