# Publish the latest EMBERLINGS to the live site (instructions for Codex)

Paste everything below the line into Codex.

---

Publish the latest EMBERLINGS code from GitHub to the existing live site. Do not change gameplay or artwork. This is a publish task only.

## 1. Get the latest code
- Repository: https://github.com/1983stevec-gif/EMBERLINGS (branch `main`).
- Pull `main` into the existing checkout (or clone it fresh). The newest commit should be "Merge pull request #28 from 1983stevec-gif/trade-design" or later.
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
node tests/trades-server.mjs
node tests/equip-best.mjs
```
The build and these two tests must pass. Some older tests (dragon-pack, cards-client, cards-server, cards, new-six, pocket-client, short-decks) already failed before this release; don't rewrite features to fix them.

## 5. Publish
Follow the "Publishing" section of `HANDOFF.md`: use the Sites source helper to prepare, push and package the exact source and build output, then `save_site_version` and `deploy_site_version`.

## 6. Check the live site
Open the public link and confirm:
1. Desktop: the intro guide has large, readable text and walks a new player through 12 simple steps; Packs and Friends fit the screen.
2. Training (Attack Academy) and Battle Rules show the new painted designs.
3. Mythling Index looks like a parchment field guide, not the card inventory.
4. Battle: knocked-out Mythlings show a clear "Knocked out" banner; the hand has big ‹ › arrows and swipes on tablet; End Turn is a button without "[Space]"; losing shows a "Defeated!" screen with tips, winning shows a Victory screen with rewards.
5. Friend Trading and Trade Room match the new designs; you can offer up to 5 Mythlings with + between them, and "Choose a Mythling" shows real cards grouped by species.
6. An existing player's coins, cards, levels and progress are still there.

## 7. Update the handoff
Add the new publish date and result to `HANDOFF.md`. Commit and push that change to GitHub.

Report back: the live URL, the deployed version, and the result of each check in step 6.
