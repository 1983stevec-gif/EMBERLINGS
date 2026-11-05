# Publish the latest EMBERLINGS to the live site (instructions for Codex)

Paste everything below the line into Codex.

---

Publish the latest EMBERLINGS code from GitHub to the existing live site. Do not change gameplay or artwork. This is a publish task only.

## 1. Get the latest code
- Repository: https://github.com/1983stevec-gif/EMBERLINGS (branch `main`).
- Pull `main` into the existing checkout (or clone it fresh). The newest commit should be "Merge pull request #76 from 1983stevec-gif/seasons" or later (later polish PRs are fine). This release is everything merged since live version 60: PRs #29 to #76 and anything after them.
- Read `HANDOFF.md` and `.openai/hosting.json` before publishing.

## 2. Rules (from HANDOFF.md, do not break)
- Use the **existing** Sites project: `appgprj_6ade72f8031081918f304ef6bf4af0fb`. Do not create a new project. Keep the public audience.
- The browser save key `mythlings-playable-v1` must **never** be renamed or cleared.
- Get fresh credentials through the Sites tools. Never put tokens in code, Git, handoff files or chat.
- Do not commit credentials, browser saves, local databases or `node_modules`.

## 3. Database
**Two new migrations.** Apply each **once**, in this order, to the live database **before** publishing the Worker (same method as 0006 and 0007):

1. `drizzle/0008_player_profile.sql`: adds one empty column (`ALTER TABLE players ADD profile text;`). Confirm `players.profile` exists. Without it, friends can't see each other's profiles ("Profiles are not available online yet").
2. `drizzle/0009_activity.sql`: adds two new tables (`activity_events`, `activity_cheers`) and their indexes for Friend activity; it changes no existing table. Confirm both tables exist. Without it, the Activity panel says "Activity isn't available yet".

The rest of the game works either way. Migrations 0006 and 0007 should already be applied; if either is missing, apply it once. Multi-card trades reuse the existing `host_offer` / `guest_offer` columns.

## 4. Build and check
```
npm run install:ci
npm run build
npm test
```
The build must pass. `npm test` now runs the whole active test suite (about 134 checks, around a minute) and **every test must pass** before you publish. If one fails, stop and report it instead of publishing; don't rewrite features to make it pass. (Old tests that no longer apply live in `tests/retired/` and are not run.)

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
10. **Profiles:** the user menu opens My Profile; "Auto-pick my best 5" fills the showcase; a frame you've earned can be chosen. A friend (second account) opens it from the Friends list with the "Profile" button.
11. **Card details:** tapping a card in My Binder opens a big card you can drag to turn (the back shows the EMBERLINGS crest), with stats, where it came from and how many you own.
12. **Collection, deck codes, highlights:** My Binder has a "Collection" button; the Battle Deck screen has Share deck / Import deck / Deck ideas; winning a battle shows "Battle highlights" with a Share button.
13. **Menu:** Effects (Full / Light / Off), Accessibility (text size, element symbols), What's new and Install are in the user menu. Returning players see "What's new" once (not at the same time as Daily rewards).
14. **Sound:** with Sound on, attacks, pack openings, coins and level-ups make sounds; with Sound off, nothing plays.
15. **Logo and Home:** the header logo shows art inside its arch; Home has a few floating Mythlings and time-of-day lighting.
16. **Friend activity (two accounts):** A opens a pack with a rare pull; B sees it under Friends → Activity and presses 🎉 Cheer; A gets "… cheered your …". Turning "Share my highlights" off stops new posts.
17. **Cosmetics and stats:** My Profile has Card backs and Avatar tabs (locked items say how to unlock); "📈 My Stats" in the menu shows packs, luck meter and battle record; card details has "📤 Share card".
18. **Music:** off by default; turning "Music" on in the menu plays a calm theme on Home and a livelier one in battle; Sound off silences it.
19. **Friends online and watching:** two friends signed in see each other as "🟢 Online now" in the Friends list and on the friend's profile. Start a duel between them; a third friend sees "👁 Watch" and can watch it live without seeing either hand.
20. **Bell, Settings, tips:** the 🔔 bell next to the coins lists friend requests, trade invites and cheers; ⚙ Settings in the menu holds Sound, Music, Effects, Accessibility, Install and Backup; opening My Profile for the first time shows a short tip.
21. **Gallery and binder:** "🖼 Gallery" on the Mythling Index opens full-screen art with a short story; in My Binder, holding a card stars it and "★ Favourites" filters to starred cards.
22. **Seasons:** in November (autumn) Home shows drifting leaves and an "Autumn" badge; turning "Seasonal decorations" off in Settings removes them.
23. **Install as an app:** `https://<live site>/sw.js` loads (JavaScript) and `/manifest.webmanifest` loads (JSON). Open the site twice in Chrome: DevTools → Application shows an activated service worker and `emberlings-*` caches, and the second visit is fast. Online features (friends, trades, cloud save, watching duels) still work — `/api/` calls must never come from the cache.

## 7. Update the handoff
Add the new publish date and result to `HANDOFF.md`. Commit and push that change to GitHub.

Report back: the live URL, the deployed version, the `npm test` result, and the result of each check in step 6.
