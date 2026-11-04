# EMBERLINGS: gameplay ideas (summary)

Every gameplay idea discussed so far, in one place. **None of these are built.** Each changes how the game plays or what players earn, so each needs the owner's decision before work starts.

Sources: `V2-PLAN.md` (full details, phases v2.0 to v2.6) and the comparison with Magic: The Gathering Arena, Pokémon TCG Pocket, Hearthstone and Marvel Snap (November 2026).

Effort: **S** = a day or two · **M** = about a week · **L** = several weeks. "Server" means it changes the online server; "DB" means it needs a database migration that Codex applies when publishing.

## 1. Ideas from the comparison with other card games

These fill the biggest gaps against the leading digital card games. They are listed from most to least important.

| # | Idea | What players get | Seen in | Effort | Server / DB | Decision needed |
|---|---|---|---|---|---|---|
| 1 | **Ranked battles vs random players** | Matchmaking against strangers, ranks (e.g. Ember → Flame → Inferno), season resets and rank rewards | MTG Arena, Pocket, Hearthstone, Snap | L | Server + DB | Ranked tiers, season length and rewards; bots to fill quiet hours? |
| 2 | **Crafting with Ember Dust** | Turn spare duplicates into Dust, then craft a chosen card, so you can target what you want | MTG Arena (wildcards), Hearthstone (dust) | M | No | Dust value per rarity; can pack-only mutations be crafted? (recommended: no) |
| 3 | **Pick from a friend's pack** | After a friend opens a pack, you get a chance to pick one of its cards (limited per day) | Pocket (Wonder Pick) | M | Server + DB | How often per day; cost (free, or a small currency) |
| 4 | **Events and seasons** | Limited-time events with their own rules and rewards, plus a season reward track | All four | M–L | Maybe | Event calendar; whether a reward track is free only or has a premium tier |
| 5 | **Regular new sets** | A new set of 4–6 species every few weeks, with its own pack | All four | M per set (mostly art) | No | Release schedule; who makes the painted art |
| 6 | **Weekly event mode** | A rotating rule each week (e.g. "Fire only", "10-card decks", "double Merfling") with event rewards | Hearthstone (Tavern Brawl), Pocket events | M | No | Rule list; rewards |
| 7 | **Draft mode** | Open packs on the spot and build a temporary deck from them, then play for prizes | MTG Arena (Draft), Hearthstone (Arena) | L | Server for online | Entry cost and prizes |
| 8 | **Spectate a friend's battle** | Watch a friend's live duel | Hearthstone | M | Server | None really (it's close to non-gameplay) |

## 2. The v2 plan (`V2-PLAN.md`)

Already designed in detail. Each phase is one PR. No database migration is needed for any of them.

| Phase | Idea | What players get | Effort | Notes |
|---|---|---|---|---|
| v2.0 | **Item drops and the Satchel** | Items drop from quests, bosses, training, daily quests, packs (5% bonus) and the Vault: Study Scroll / Tome / Grand Codex (XP), Academy Pass, Focus Charm (double XP), Coach's Whistle (share XP), Ember Shard, Star Ember (re-roll an ability), Coin Pouch, cosmetic pieces. A pity counter guarantees a Rare after 10 misses. | M | Drops are saved before being shown, so refreshing can't re-roll |
| v2.1 | **Training XP that scales with level** | Session XP = max(30, level × 12) × score ÷ 5, which is about one level a day from training at any level. Unused sessions bank up (max 10). Academy Rank (Novice → Grandmaster) with small perks. | M | Level 25 in about 2–3 weeks, level 100 in about 3–4 months per card |
| v2.2 | **Sparring, Mastery Trials and Limit Breaks** | Sparring: a 3-turn battle against a dummy for XP. Mastery Trial at levels 25/50/75. Limit Break = pass the trial + spend 3/6/10 Ember Shards to go past the cap and unlock that level's move. | M | Cards already past a milestone are not affected |
| v2.3 | **Login streak upgrade** | Login coins = 100 + 10 × streak (max 600/day). Milestones at 7/14/30/60/100 days (packs, Ember Shards, titles, streak flame). Streak Shields and a gentle reset to the last milestone. | S–M | Builds on the daily rewards already merged |
| v2.4 | **Heroes and Hero Powers** | Choose Kaelen (Rally +20 damage), Mira (Insight: draw 2), Bramble (Mend: heal 30) or Sola (Foresight: pick from top 3). Once per battle, costs 1 Merfling. Hero levels 1–30 with outfits and small bonuses. | L | Online duels need server checks for Hero Powers |
| v2.5 | **Pets** | Starter egg (Ember / Tide / Grove) hatches after the first win; more eggs from bosses, streaks and drops. One helper skill each (e.g. +10% coins, +10% training XP, +10% Vault). Daily feeding and growth stages. New player introduction with hero and egg. | L | One active pet at a time (recommended) |
| v2.6 | **Balance pass** | Tune drop rates, XP, streak coins and pet bonuses after a few weeks of real play | S–M | Needs play data |

## 3. Decisions the owner needs to make

| # | Question | Options | Recommended |
|---|---|---|---|
| 1 | Limit Breaks | Required cap at 25/50/75, or only a bonus so XP never stops | Required cap |
| 2 | Can items be traded? | Untradeable, or tradeable | Untradeable for v2 |
| 3 | Buying Study Scrolls and Academy Passes with coins | Keep them buyable, or drop-only | Keep buyable (there is no Shop screen today, so this means wherever they're sold now) |
| 4 | Level-100 pace | About 3–4 months per card, faster, or slower | About 3–4 months |
| 5 | Streak reset after missing days | Gentle reset to the last milestone, or back to day 1 | Gentle reset |
| 6 | Hero Powers in friend duels | On (server-checked), or solo play only at first | On |
| 7 | Hero names and looks | Keep Kaelen, Mira, Bramble and Sola, or send your own names or art | Owner's choice |
| 8 | Pets | One active pet, or two later | One |
| 9 | Ranked battles | Build it, and if so: ranks, season length, rewards | Build it after v2.0–v2.3 |
| 10 | Crafting with Ember Dust | Yes or no; dust values; pack-only mutations craftable? | Yes; pack-only mutations not craftable |
| 11 | Pick from a friend's pack | Yes or no; how many per day | Yes, 1–2 a day |
| 12 | New sets | Schedule and art source | Every 4–6 weeks, if art is available |

## 4. Suggested order

1. **v2.0 → v2.3** (items, training, Limit Breaks, streaks): the most daily value, no server work, and they use systems that already exist.
2. **Crafting with Ember Dust**: makes duplicate pack pulls useful and lets players chase specific cards.
3. **Ranked battles**: the biggest gap against other card games, but also the biggest job (server, database, matchmaking).
4. **v2.4 Heroes and v2.5 Pets**: big new features; settle the hero and pet decisions first.
5. **Events, new sets, pick from a friend's pack, draft**: once the core loop above is in place.

Rules that apply to all of them: the save key `mythlings-playable-v1` is never renamed or cleared, new save data is only ever added, and Bloom, Tide, Crystal, Solar, Void and Prism stay pack-only mutations.
