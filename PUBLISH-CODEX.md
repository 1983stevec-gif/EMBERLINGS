# Publish the latest EMBERLINGS to the live site (instructions for Codex)

Paste everything below the line into Codex.

---

Publish the latest EMBERLINGS code from GitHub to the existing live site. Do not change gameplay or artwork. This is a publish task only.

## 1. Get the latest code
- Repository: https://github.com/1983stevec-gif/EMBERLINGS (branch `main`).
- Pull `main` into the existing checkout (or clone it fresh). The newest commit should be "Merge pull request #17 from 1983stevec-gif/tablet-menu" or later.
- Read `HANDOFF.md` and `.openai/hosting.json` before publishing.

## 2. Rules (from HANDOFF.md, do not break)
- Use the **existing** Sites project: `appgprj_6ade72f8031081918f304ef6bf4af0fb`. Do not create a new project. Keep the public audience.
- The browser save key `mythlings-playable-v1` must **never** be renamed or cleared.
- Get fresh credentials through the Sites tools. Never put tokens in code, Git, handoff files or chat.
- Do not commit credentials, browser saves, local databases or `node_modules`.

## 3. Apply the two new database migrations
The live D1 database needs these before the new code goes live, or sign-in, cloud save and titles will fail:

| File | What it does |
|---|---|
| `drizzle/0006_zippy_guardian.sql` | `ALTER TABLE players ADD title text;` |
| `drizzle/0007_easy_molecule_man.sql` | adds `players.password_hash` and creates the `cloud_saves` table |

Use the same method that applied migrations 0000 to 0005 on the live site. Both are additive only: no existing rows or columns are changed or deleted. If 0006 or 0007 is already applied, skip it. Don't run it twice.

## 4. Build and check
```
npm run install:ci
npm run build
npm test
```
The build must succeed. Fix only real build errors; don't rewrite features.

## 5. Publish
Follow the "Publishing" section of `HANDOFF.md`: use the Sites source helper to prepare, push and package the exact source and build output, then `save_site_version` and `deploy_site_version`.

## 6. Check the live site
Open the public link and confirm:
1. The welcome/username screen shows the new art and the animated burning logo.
2. Home, Packs, My Binder (Card Vault, Mutation Vault, Fusion Lab), Adventure HQ map, Friends and Battle all show the new painted screens and the shared header.
3. On a tablet-sized window (about 768–1199px wide), the five-tile picture menu appears at the bottom and the selected tile is gold.
4. Opening a pack plays the card-shuffle animation, then reveals the cards.
5. Account & cloud save: setting a password, signing in on another browser and loading the cloud save all work (this confirms migrations 0006 and 0007).
6. An existing player's coins, cards and progress are still there.

## 7. Update the handoff
Add the new publish date and result to `HANDOFF.md`. Replace the old line saying there's no cloud save: there are now free accounts (username + password) with cloud save, under Account in the user menu. Commit and push that change to GitHub.

Report back: the live URL, the deployed version, whether both migrations ran, and the result of each check in step 6.
