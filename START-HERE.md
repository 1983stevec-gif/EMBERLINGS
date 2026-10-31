# EMBERLINGS

Live game: https://mythlings-adventure.proud-book-0456.chatgpt.site/

## Work on another computer

Install Git and Node.js 22.13 or newer. Sign in to your GitHub account, then run:

```sh
git clone https://github.com/1983stevec-gif/EMBERLINGS.git
cd EMBERLINGS
npm ci
npm run build
npm run db:local
npm start -- --port 8848
```

Open http://127.0.0.1:8848/. `npm run db:local` sets up the local database for usernames, friends and trades; run it again after pulling updates (it is safe to repeat). Read [HANDOFF.md](HANDOFF.md) before making changes.

Before editing on either computer: git pull --ff-only

After finishing changes:

```sh
git add .
git commit -m "Describe the update"
git push origin main
```

GitHub synchronizes source code. It does not synchronize browser player saves, and pushing here does not automatically publish the live game. Ask Codex to publish through the existing Sites project. Do not commit credentials, browser saves, local databases or node_modules.
