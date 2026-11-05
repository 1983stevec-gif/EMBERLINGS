# EMBERLINGS: enhancement ideas (not gameplay)

Ideas that improve EMBERLINGS **without changing how it plays or what players earn**. Gameplay ideas are in `GAMEPLAY-IDEAS.md`.

Status: **▶ Starting now** = being built in this round · ✅ = already built · blank = idea only.
Effort: **S** = a day or two · **M** = about a week · **L** = several weeks. "Server" means it changes the online server; "DB" means it needs a database migration that Codex applies when publishing.

## Already built (November 2026)

Animations for battles, packs, cards and menus · Effects Full/Light/Off · sound effects · background music · boss art and intros · profiles with showcase · card backs, avatars and rings · card details page · share pictures (cards, packs, battle highlights) · Collection page · My Stats · deck share codes and deck ideas · friend activity and cheers · What's New panel and loading tips · Home life · accessibility (text size, element symbols, keyboard, screen reader) · install as an app · faster loading · phone/tablet/desktop fit passes · logo arch art.

## 1. Look and feel

| Idea | What players get | Effort | Notes |
|---|---|---|---|
| **Seasonal themes** ▶ Starting now | Automatic decorations by date: autumn leaves, winter snow and lights, spring blossoms, a summer glow; small festive touches on Home, header and packs | M | Cosmetic only; follows the Effects setting |
| Painted art for the bosses | Boss portraits that truly match the painted Mythling cards | M | Needs art made the same way as the Mythling art |
| Animated card art for the rarest cards | Secret and Celestial cards gently move (flames flicker, water ripples) | M | Subtle loops on the card art only |
| Full-art card frames (cosmetic) | An alternative full-art frame you can choose for cards you own | M | Purely cosmetic; unlocked by achievements |
| Binder covers and page themes | Choose your binder's cover and page colour | S–M | Fits with card backs |
| Dynamic battle backgrounds | Battle board changes with the island and time of day | M | |
| Victory poses | Your MVP Mythling does a short celebration on the Victory screen | S | |
| More pack designs | Animated pack wrappers per pack type | S–M | |
| Dark/light reading mode for text pages | A parchment-light option for Rules and Index | S | |
| Weather on the Adventure HQ map | Clouds drift over islands, sea shimmer | S | |

## 2. Settings and comfort

| Idea | What players get | Effort | Notes |
|---|---|---|---|
| **Settings hub** ▶ Starting now | One tidy Settings page for Sound, Music, Effects, Accessibility, Install, What's new, Account, Backup and privacy, instead of a long menu | M | The user menu has grown long; this tidies it |
| Haptic feedback on phones | Small vibrations on hits, pack reveals and rewards | S | Android supports it; off by default |
| Left-handed layout | Battle buttons mirrored for left-handed play | S | |
| Battle speed | Faster or slower battle animations | S | Visual speed only |
| Confirm before spending | Optional "Are you sure?" for big coin spends | S | |
| Quiet hours | No sounds or pop-ups between chosen hours | S | |

## 3. Help and learning

| Idea | What players get | Effort | Notes |
|---|---|---|---|
| **First-time tips for new screens** ▶ Starting now | A short, friendly tip the first time you open Profile, Collection, My Stats, Card details, Deck codes, Activity and so on | S–M | Never repeats; can be reset in Settings |
| Searchable help page | "How do I…?" answers with links to the right screen | M | |
| Mythling lore pages | Short story for each species in the Index | M | Writing plus art |
| Glossary | Merfling, mutations, Vault and so on explained in one place | S | |
| Interactive rules demo | Try a sample turn with guided arrows | M | Uses the real battle engine, no rewards |

## 4. Social (no gameplay changes)

| Idea | What players get | Effort | Notes |
|---|---|---|---|
| **Spectate a friend's battle** ▶ Starting now | Watch a friend's live duel or quest, read-only | L | Server |
| **Notification inbox** ▶ Starting now | A bell with everything new: trade invites, cheers, daily rewards ready, what's new, friend requests | M | Gathers existing alerts in one place |
| Push notifications (installed app) | "Your daily reward is ready", "Mira invited you to trade" | M | Server + push keys set up by Codex |
| Friend nicknames and favourites | Pin favourite friends to the top | S | |
| Emote reactions in friend duels | A few safe preset emotes (no free text) | M | Server; preset only to avoid abuse |
| Friend leaderboards | Compare collection %, win streaks and level with friends | M | Server |
| Gift a cosmetic | Send a friend a card back you've unlocked a copy of | M | Cosmetic only |
| Clubs | Small friend groups with a shared banner | L | Server + DB |

## 5. Collection and history

| Idea | What players get | Effort | Notes |
|---|---|---|---|
| Card art gallery | View every Mythling's art full screen, zoom in, with lore | S–M | |
| Collection milestones banner | A celebration when you complete a species or rarity set | S | Uses the Collection page's data |
| Pack opening replays | Re-watch your last 10 pack openings | M | Uses My Stats records |
| Battle replays | Re-watch a past battle turn by turn | L | Needs recording each battle's moves |
| Favourite cards | Star cards to find them fast in the binder | S | |
| Binder sort and filter presets | Save your favourite filters | S | |
| Export collection | Download your collection as a picture sheet or spreadsheet | S | |

## 6. Speed, reliability and upkeep

| Idea | What players get | Effort | Notes |
|---|---|---|---|
| **Polish round 2** ▶ Starting now | Fix the binder sideways scroll on desktop, the remaining 18 small layout issues, the achievement pop-up covering titles, and check Training Field and Battle Rules | M | Follows the fit-and-polish pass |
| Automatic checks on every PR | GitHub runs the tests and browser checks before merging | S–M | Needs GitHub Actions workflow permission |
| Error reporting | The game quietly reports crashes so they can be fixed | M | Server; no personal data |
| Save safety | Automatic local backups and an "undo last change" for accidental deletes | M | |
| Offline solo play | Play quests and open saved packs fully offline | M | Builds on install-as-app |
| Smaller art for slow phones | Lower-resolution art on very slow connections | S–M | |
| Translations | Make the game translatable, then add languages | L | Touches every screen |

## 7. Sharing and community

| Idea | What players get | Effort | Notes |
|---|---|---|---|
| Profile share link | A link that shows your profile card to anyone | M | Server; opt-in |
| Deck pictures | Share a deck as a picture with its code | S | Builds on deck codes and share pictures |
| Weekly recap | "Your week in EMBERLINGS" picture: packs, wins, best pull | S–M | Uses My Stats |
| Screenshot mode | Hide buttons for a clean screenshot of any screen | S | |

## Suggested next round after this one

1. Push notifications (needs Codex to set up keys)
2. Automatic checks on every PR
3. Card art gallery and lore
4. Battle replays
5. Translations
