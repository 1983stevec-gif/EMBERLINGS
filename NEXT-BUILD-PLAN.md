# EMBERLINGS: the next build plan (rounds 5 to 8)

Written 18 November 2026. Status: live version 68; the audit round is merged (PR #90); battle
hints are open (PR #91). This plan supersedes the "next" sections of `NEXT-ENHANCEMENTS-PLAN.md`
(its Round 4 shipped) and keeps the same rules: one feature, one PR, one module in `public/`;
save data only under `state.ember.*`; the save key never changes; merge only on "merge".

**Progress, 18 November (evening):** items 5.1, 5.3, 5.4, 5.5, 6.4 and the two Round-7 quick
fixes are built and open as PRs #93 (leaderboards), #94 (duel emotes), #95 (quick fixes),
#96 (profile links), #97 (crash reports — carries migration 0010) and #98 (rules demo). All
pass GitHub CI. 5.2 (push notifications) is the only Round-5 item left, and it waits for
publish-time keys. Suggested merge order: #91 → #93 → #94 → #95 → #97 → #98 → this plan;
the only conflicts to expect are one line each in the include list, the test list, the What's
New head and the social route block — keep both sides, re-run the build and tests after each.

Effort: **S** a day or two · **M** about a week · **L** several weeks. "DB" means a migration is
needed; Codex applies migrations when publishing.

## Round 5 — online features (decisions already answered, 5 November)

Built in parallel branches, merged one at a time. The owner's answers are in
`NEXT-ENHANCEMENTS-PLAN.md` section 8.

| # | Feature | What players get | Main files | Effort |
|---|---|---|---|---|
| 5.3 | **Friend leaderboards** | Compare with friends: wins, win streak, best win streak, boss clears, biggest single hit (battle stats only, friends only) | `public/leaderboards.js`, `lib/profile-api.mjs`, `lib/social-api.mjs` (one route line) | M |
| 5.4 | **Duel emotes** | 8 preset emotes in friend duels (no free text), shown to players and watchers, mute button | `public/duel-emotes.js`, `lib/card-api.mjs`, `lib/spectate-api.mjs` | M |
| 5.1 | **Error reporting** | Crashes in the game are reported quietly so they can be fixed; nothing visible | `public/error-report.js`, `lib/social-api.mjs`, **migration 0010** `client_errors`, pruned after 30 days; `scripts/errors-report.mjs` | M |
| 5.5 | **Profile share link** | An opt-in public link to your profile card, off by default | `lib/profile-api.mjs`, `public/profile.js` | M |
| 5.2 | **Push notifications** | Installed-app alerts: trade invites, friend requests, daily ready, cheers (each with its own switch, all off by default) | Web Push; **migration 0011** `push_subscriptions`; VAPID keys are set by Codex as Sites secrets at publish time | M |

**Order:** 5.3 and 5.4 now (both in this session). Then 5.1 and 5.5. Push (5.2) last, because it
cannot be tested end-to-end until Codex sets the keys at publish.

## Round 6 — client-side features (no server changes)

| # | Feature | What players get | Notes | Effort |
|---|---|---|---|---|
| 6.1 | **Battle replays** | Re-watch your last 10 battles turn by turn | Records each turn compactly, capped; viewer reuses the spectate board | L |
| 6.2 | **Pack opening replays** | Re-watch your last 10 pack openings | Uses My Stats pack records; never grants cards | M |
| 6.3 | **Offline solo play** | Quests, binder and opening already-paid packs work offline | `sw.js` caching; online features say "back online soon" | M |
| 6.4 | **Interactive rules demo** | A guided sample turn with arrows, using the real engine | Linked from Battle Rules and Help; no rewards; natural follow-up to battle hints | M |
| 6.5 | **Smaller art for slow phones** | Lighter art loads first on slow connections | Half-size WebP variants; `navigator.connection` / `Save-Data` | S–M |
| 6.6 | **Look pack B** | Animated Secret/Celestial cards, full-art frames, binder covers, animated wrappers, island/time-of-day battle backgrounds | Cosmetic only | M–L |

Battle hints (the suggested-play line) were not on this list and shipped ahead of plan as PR #91.

## Round 7 — reliability and polish (from the 16 November audit)

Things the audit found. The first group is safe to build any time; the second needs decisions.

**Safe, build when convenient:**

| Item | What it fixes | Effort |
|---|---|---|
| Phone layouts for the newest painted screens | The newest pages were checked at tablet/desktop sizes, not phone widths | M |
| Offline clock fallback | If the server clock is unreachable, the Vault keeps time locally instead of freezing | S |
| Dead-code cleanup PR | The unreachable old Shop, the superseded legacy battle layer, the walk-around-mode remap | M |
| fx-cards shine cost on touch | Keep the idle shine only for the pressed/hovered card on coarse pointers | S |

**Needs an owner decision (nothing built until decided):**

1. **Player menu length** (~21 items, scrolls on portrait tablets). Options:
   - (a) drop the 12 screen links from the menu — the tab bar, Home cards and Settings hub already
     reach everything (my recommendation);
   - (b) group them under one expandable "Screens" section.
2. **Server hardening** (architecture, discuss with Codex): the identity headers can be forged
   outside the platform proxy; `/login` and `/recover` have no attempt throttling; a player can
   hold several concurrent battle invites; the cloud-save cap (1.8 MB) exceeds the database's
   ~100 KB statement limit; session rows are never purged; password hashing is below current
   guidance (100k PBKDF2 iterations). None of these is urgent for play; all are real.

## Round 8 — gameplay (the v2 plan)

`V2-PLAN.md` has the full design and the 12 decisions are answered in `GAMEPLAY-IDEAS.md`
section 3. In order: **v2.0** item drops and the Satchel, **v2.1** training XP that scales with
level, **v2.2** Sparring and Limit Breaks, **v2.3** the login streak upgrade. Then crafting
with Ember Dust, then ranked battles. These change how the game plays and what players earn,
so **this round starts only when you say "start v2"**.

## Risks and handling

- Round 5 branches share three small spots (the include list, the test list, the What's New
  head): merge one at a time, keep both sides, re-test after each — the established pattern.
- Migrations are additive only and listed at the top of their PR plus in the publish prompt.
- The local test suite's Miniflare checks can be blocked by a busy disk (seen 17 November); when
  that happens, GitHub's CI run on the PR is the authoritative full-suite result.
