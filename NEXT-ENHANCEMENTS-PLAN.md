# EMBERLINGS: build plan for the next enhancements (not gameplay)

This plan turns every idea still open in `ENHANCEMENT-IDEAS.md` into PRs, grouped into four rounds. None of it changes how the game plays or what players earn; gameplay ideas stay in `GAMEPLAY-IDEAS.md`.

Written 5 November 2026. `main` is at PR #77; the live site is still **version 60**.

## 0. Before Round 4: publish what's already merged

Everything from PR #29 to #77 is merged but not live. **Publish it first** (paste `PUBLISH-CODEX.md` into Codex, including the two database steps 0008 and 0009). Reasons:
- A smaller next release is easier to check and to roll back.
- Real players will show which of the new features matter most, which may reorder the rounds below.
- Rounds 5 and 7 add more database steps; it's safer to apply 0008/0009 on their own first.

## 1. How every PR is built (same rules as the last three rounds)

- **One feature, one PR, one new module** in `public/<name>.js` that talks to the game only through `window.EmberBridge`, `ember:*` events and the DOM. CSS is injected by the module (or one commented block at the end of `public/theme.css`).
- **`game/index.html`**: only a `<script type="module" src="/<name>.js">` tag before `</body></html>`, unless the PR says otherwise.
- **Settings:** any option goes on the Settings page through `window.EmberSettings.addSection(...)`, not into the player menu.
- **First-time tips:** a new screen adds its tip to `public/tips.js` (one entry).
- **Save data:** only added under `state.ember.*`, missing means default; the save key `mythlings-playable-v1` is never renamed or cleared.
- **Effects:** every animation follows Effects Full / Light / Off (`html[data-fx]`) and reduced motion.
- **Fit:** checked at 1366×900, 1536×1024, 768×1024 and 1024×768 (touch), 390×844 and 360×740 (touch) with `scripts/shots/sweep/`: no sideways scroll, nothing cut off or covered, taps at least 40–44 px.
- **Checks:** `npm run build` and `npm test` pass locally and in the GitHub check on the PR; server features add a `tests/<name>-server.mjs` registered in `tests/run-card-edition.mjs`.
- **Merging:** only when the owner says "merge"; merge in the order listed, re-test after each.
- **End of each round:** one PR adding a What's New entry (`public/whats-new.js`), updating `PUBLISH-CODEX.md` checks and any database steps, `NEXT-CHAT-HANDOFF.md` and `ENHANCEMENT-IDEAS.md` ✅ marks. Then publish.

## 2. Round 4: quick wins (no server changes)

All nine can be built at the same time; they touch different files.

| # | PR | What players get | Main files | Effort |
|---|---|---|---|---|
| 4.1 | **Collection milestones** | A celebration banner (and a share button) when you complete a species, a rarity set or a mutation set, plus a "Milestones" list on the Collection page | `public/milestones.js`; reads `public/collection.js` maths | S |
| 4.2 | **Weekly recap** | Each Monday, "Your week in EMBERLINGS": packs opened, best pull, wins, streak, MVP; shareable picture | `public/weekly-recap.js`; reads `state.ember.stats` (My Stats); reuses the share-picture canvas code | S–M |
| 4.3 | **Deck pictures** | "Share as picture" next to Share deck: the deck's cards in a grid with its code printed underneath | extend `public/deck-share.js` + `public/share-card.js` helpers | S |
| 4.4 | **Help centre** | A searchable Help page ("How do I…?") and a Glossary (Merfling, mutations, Vault, Limit…), each answer with a "Take me there" button | `public/help.js`, `public/help-data.js`; entry in Settings and the menu | M |
| 4.5 | **Comfort settings** | Haptics on phones (off by default), battle animation speed (visual only), "Confirm before spending over N coins", quiet hours (no sounds or pop-ups), left-handed battle layout | `public/comfort.js`; small hooks in `fx-*.js` for speed; Settings section | M (five S parts) |
| 4.6 | **Look pack A** | Weather and sea shimmer on the Adventure HQ map, a short victory pose for your MVP, a parchment-light reading mode for Rules and Index | `public/look-a.js` | S–M |
| 4.7 | **Save safety** | Automatic rolling local backups (last 5, kept in the browser's own storage), a "Restore a backup" screen, and a gentle monthly "Download a backup" reminder | `public/save-safety.js`; builds on the existing backup in `enhancements.js` | M |
| 4.8 | **Screenshot mode** | One tap hides buttons and menus for a clean picture of any screen; tap again to come back | `public/screenshot-mode.js` | S |
| 4.9 | **Friend nicknames and favourites** | Give friends a private nickname and pin favourites to the top of Friends | `public/friend-notes.js` (local only) | S |

**Done when:** all nine merged, sweep clean, What's New entry added, published.

## 3. Round 5: online features (server changes)

Each needs the server; they're built in parallel but merged one at a time, because they all touch `lib/social-api.mjs` routing.

| # | PR | What players get | Server / database | Effort |
|---|---|---|---|---|
| 5.1 | **Error reporting** | Nothing visible; crashes in the game are reported quietly so they can be fixed | New `POST /api/social/errors` (rate-limited, no personal data, no save contents); **migration 0010** `client_errors` table, pruned after 30 days; a small `scripts/errors-report.mjs` to list the top errors | M |
| 5.2 | **Push notifications** (installed app) | Optional alerts: "Your daily reward is ready", "Mira invited you to trade", "Bo cheered your pull" | Web Push: **migration 0011** `push_subscriptions`; VAPID keys stored as **Sites environment secrets set by Codex** (never in Git); sending from the Worker when trades/cheers/daily events happen; opt-in in Settings, per-type switches | M |
| 5.3 | **Friend leaderboards** | Compare with friends: collection %, best win streak, highest level, packs opened, boss clears | Reads the profile JSON (0008) the game already sends; extend `lib/profile-api.mjs` with a small numbers block; friends only; no migration | M |
| 5.4 | **Emote reactions in duels** | 6–8 preset emotes in friend duels (👋 Good luck, 🔥 Nice!, 😮 Wow, 🤝 Good game…), no free text, mute button | Match events in `lib/card-api.mjs` (rate-limited, preset ids only); shown to players and watchers | M |
| 5.5 | **Profile share link** | Opt-in public link to your profile card (showcase, frame, badges) to send to anyone | `GET /p/<name>` public read when opted in; `profile` JSON flag; off by default | M |

**Owner decisions for Round 5:** OK to collect anonymous error reports? Which push alerts to offer? Should leaderboards include all five numbers? Public profile links allowed?

## 4. Round 6: bigger features

| # | PR | What players get | Notes | Effort |
|---|---|---|---|---|
| 6.1 | **Battle replays** | Re-watch your last 10 battles turn by turn, with play/pause/step and the attack effects | Record each turn's state locally (compact, capped); viewer reuses the spectate board (`public/spectate.js`); share a replay picture | L |
| 6.2 | **Pack opening replays** | Re-watch your last 10 pack openings with the full animation | Uses My Stats pack records; replays never grant cards | M |
| 6.3 | **Offline solo play** | Quests, binder, collection and opening already-paid packs work offline; online features say "back online soon" | `public/sw.js` caching + guard every `/api/` call; pending results sync on reconnect only where the game already supports it | M |
| 6.4 | **Interactive rules demo** | A guided sample turn with arrows, using the real battle engine; no rewards | `public/rules-demo.js`; linked from Battle Rules and Help | M |
| 6.5 | **Smaller art for slow phones** | On slow connections or Data Saver, lighter art loads first | Generated half-size WebP variants; `navigator.connection` / `Save-Data` check | S–M |
| 6.6 | **Look pack B** | Gently animated art on Secret and Celestial cards, cosmetic full-art frames and binder covers unlocked by achievements, animated pack wrappers, battle backgrounds that follow the island and time of day | Extends `public/cosmetics.js` and `profile-items.js`; all cosmetic | M–L |

## 5. Round 7: the largest jobs

| # | PR(s) | What players get | Notes | Effort |
|---|---|---|---|---|
| 7.1 | **Translations** | The game in more languages, chosen in Settings | Step 1: move all text into language files (touches every screen, so build it when no other PRs are open). Step 2: add languages one PR each. **Owner decision:** which languages first | L |
| 7.2 | **Clubs** | Small friend groups with a name, banner and shared progress board | **Migration** for clubs and members; invite-only; no chat | L |
| 7.3 | **Gift a cosmetic** | Send a friend a copy of a card back or frame you've unlocked | Server records gifts; cosmetic only; limits per day | M |
| 7.4 | **Painted boss art** | Boss portraits that truly match the painted Mythling cards | Needs the owner to supply art made the same way as the Mythling art; then swapping the five files is a small PR | S (once art exists) |

## 6. Order and timing at a glance

1. **Now:** publish PRs #29–#77 (Section 0).
2. **Round 4:** nine parallel workers, about 1 day of building plus merging; publish.
3. **Round 5:** five parallel workers, merged one at a time; Codex applies migrations 0010 and 0011 and sets the push keys; publish.
4. **Round 6:** six workers; publish.
5. **Round 7:** translations alone first (it touches everything), then clubs and gifts; publish.

## 7. Risks and how they're handled

| Risk | Handling |
|---|---|
| Many modules listening to `ember:frame` slow the game down | Each PR measures frame time on Home, binder and battle; the load-speed checks run every round |
| Two PRs editing the same shared file | Each PR owns its module; shared files (`social-api.mjs`, `index.html` script list, `run-card-edition.mjs`, `theme.css` end) are merged one PR at a time with the usual keep-both resolution and a re-test |
| Push and error reporting handle data | No personal data or save contents; opt-in where it reaches the player; keys only in Sites secrets |
| Migrations | Additive only (new tables or columns), listed in bold at the top of each PR and in `PUBLISH-CODEX.md`; the game keeps working if a step hasn't been applied yet |
| A random test failure blocks the GitHub check | Tests that use random numbers must fix their seed (as done in PR #71) |

## 8. Owner decisions (answered 5 November 2026)

| Question | Decision |
|---|---|
| Publish #29–#77 before Round 4? | **Yes** — the owner pastes `PUBLISH-CODEX.md` into Codex |
| Round 4 scope | **All nine PRs**, started 5 November 2026 |
| Anonymous crash reports (5.1) | **Yes** |
| Which push alerts (5.2) | **Decided by Claude:** trade invitations, friend requests, "daily reward ready" (at most once a day) and cheers on your highlights (grouped, at most once a day). Each has its own switch in Settings; all are off until the player turns notifications on. No marketing or "come back" alerts. |
| Leaderboard numbers (5.3) | **Battle stats only:** wins, win streak, best win streak, boss clears, biggest single hit (friends only) |
| Public profile links (5.5) | **Yes** (opt-in, off by default) |
| Translations (7.1) | **English only for now** — 7.1 is not scheduled |
| Clubs (7.2) | **Later, in the v2 timeframe** — not scheduled now |
| Painted boss art (7.4) | **Owner will supply the art** — spec in Section 9 |

## 9. Painted boss art: what to create

Five pictures, one per boss, in the same painted style as the Mythling card art (`public/art/mythlings/*.webp`).

| File name | Boss | Level | Element | Look (match the current design so the lore and intro still fit) |
|---|---|---|---|---|
| `magmarok.webp` | Magmarok | 10 | Fire | Rock golem with a glowing molten core and lava cracks, angry glowing eyes, obsidian horns; erupting volcano and smoky sunset behind |
| `thorn-guardian.webp` | Thorn Guardian | 25 | Nature | Tree giant with an antler-branch crown, glowing green eyes, thorny vines with small flowers, moss and a root beard; misty forest with light rays |
| `frostfang.webp` | Frostfang | 45 | Ice | Big white wolf with an ice-crystal mane and ice fangs, glowing eyes; snowy peaks, aurora and falling snow |
| `voltitan.webp` | Voltitan | 70 | Lightning | Golden storm dragon with crackling horns and wings, lightning in the mouth; stormy sky with lightning-lit clouds and rain |
| `voidra.webp` | Voidra | 100 | Shadow / Void | Floating dark orb with one giant glowing eye, small watching eyes and tentacles; purple swirling spiral background |

**Format**
- Square, **512 × 512 px minimum** (1024 × 1024 preferred; it gets resized).
- **Full background** (not transparent), like the Mythling art.
- The boss's **face and body centred**, with the important part inside the middle circle about 70 % of the width: the boss introduction shows it in a **round crest**, so the corners are cut off.
- PNG, JPG or WebP; any is fine. Name each file as above, or just say which is which.
- Original artwork only (not based on characters from other games).

**Optional extras** (only if you want them): a wider 1600 × 900 version of each for a future boss splash screen.

When the five are ready, send them; a small PR swaps them into `public/art/bosses/`, re-checks them in the boss introduction and on Friend activity, and nothing else changes.
