# Publish the latest EMBERLINGS to the live site (instructions for Codex)

Paste everything below the line into Codex.

---

Publish the latest EMBERLINGS code from GitHub to the existing live site. Do not change gameplay or artwork. This is a publish task only.

## 1. Get the latest code
- Repository: https://github.com/1983stevec-gif/EMBERLINGS (branch `main`).
- Pull `main` into the existing checkout (or clone it fresh). The newest commit should be "Merge pull request #41 from 1983stevec-gif/fx-packs" or later (later polish PRs are fine). This release is everything merged since live version 60: PRs #29 to #41 and anything after them.
- Read `HANDOFF.md` and `.openai/hosting.json` before publishing.

## 2. Rules (from HANDOFF.md, do not break)
- Use the **existing** Sites project: `appgprj_6ade72f8031081918f304ef6bf4af0fb`. Do not create a new project. Keep the public audience.
- The browser save key `mythlings-playable-v1` must **never** be renamed or cleared.
- Get fresh credentials through the Sites tools. Never put tokens in code, Git, handoff files or chat.
- Do not commit credentials, browser saves, local databases or `node_modules`.

## 3. Database
No new migrations in this release. Migrations 0006 and 0007 should already be applied on the live site; if either is missing, apply it once using the same method as before. Multi-card trades reuse the existing `host_offer` / `guest_offer` columns, and old single-card offers still work.

## 4. Build and check
```
npm run install:ci
npm run build
npm test
```
The build must pass. `npm test` now runs the whole active test suite (about 104 checks, around 30 seconds) and **every test must pass** before you publish. If one fails, stop and report it instead of publishing; don't rewrite features to make it pass. (Old tests that no longer apply live in `tests/retired/` and are not run.)

## 5. Publish
Follow the "Publishing" section of `HANDOFF.md`: use the Sites source helper to prepare, push and package the exact source and build output, then `save_site_version` and `deploy_site_version`.

## 6. Check the live site
Open the public link and check each item. Use a phone (or a narrow window), a portrait tablet and a desktop where it says so.
1. **Existing players:** an existing player's coins, cards, levels and progress are still there after the update.
2. **Faster first load:** a first visit loads quickly; on a phone the page is about 2 MB, with WebP art and logos.
3. **Tablet pages (portrait tablet):** Battle Rules, Training, Friend Trading and Trade Room have their own tablet layouts, and trade invitations stay on the trading table.
4. **Trade alerts and past trades:** when a friend invites you to trade, Friends shows a badge and a pop-up appears with an Open button. After a trade, a "Trade complete!" screen shows what you gave and got, and "Past trades" lists it on the trading page.
5. **Rare finds:** a special pack pull (high rarity, shiny or pack-only mutation) shows a "Rare find!" or "Very rare find!" banner, and Achievements shows "Your rarest find".
6. **Daily rewards:** a player opening Home for the first time today sees the Daily rewards panel (7-day login streak, 3 quests, weekly challenge). Claiming gives the reward once, and the Daily button stays on Home.
7. **Boss intro and art:** starting a boss quest battle plays a short entrance with the boss's painted portrait and name; tapping skips it; the battle then works as before.
8. **Animations:** battles show attack effects, hit shakes and damage numbers; packs tear open with rarity-coloured glow and a fanfare for rare pulls; rare and mutated cards have a foil shine; menus switch smoothly and coins fly into the coin counter. Nothing about rewards changes.
9. **Phones:** pages don't scroll sideways (including while a pack is opening), and the Adventure HQ map is visible on a phone.

## 7. Update the handoff
Add the new publish date and result to `HANDOFF.md`. Commit and push that change to GitHub.

Report back: the live URL, the deployed version, the `npm test` result, and the result of each check in step 6.
