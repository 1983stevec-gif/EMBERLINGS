# EMBERLINGS v2 plan: item drops, training levels, login streaks, heroes and pets

Status: plan only, nothing built yet. Each phase below would ship as its own PR.

## Where we are today

| | Today |
|---|---|
| XP needed per level | `level × 60` (level 1→2 needs 60, level 99→100 needs 5,940) |
| Total XP to level 100 | 297,000 (25: 18,000 · 50: 73,500 · 75: 166,500) |
| Training XP | 15 + 3 per correct answer, max **30 per session**, 5 rewarded sessions a day |
| Extra sessions | Academy Pass (120 coins, or from a boss's first clear) |
| Battle XP | Quest XP is shared across the cards in your deck |
| Items | Academy Pass and Study Scroll (50 XP), bought in the Shop. Nothing drops. |
| Level path | +5 HP every 5 levels, new move at 25/50/75/100 (newest two kept), abilities at 10/30/60/90, special roll every 10 levels |

**Problem:** at 150 training XP a day, getting one card to level 25 takes about 4 months, and level 100 is out of reach. Training feels pointless after the first few levels, and the new level-100 path cannot be seen in practice.

## Goals

1. Training is the main way to level a card. A regular player reaches level 25 in about 3 weeks and level 100 in about 4 to 6 months, per card.
2. Battles, training and daily play drop **items** that speed this up and feel exciting to open.
3. Everything is additive: same save key `mythlings-playable-v1`, no lost cards, coins or levels, no database migration.
4. Bloom, Tide, Crystal, Solar, Void and Prism mutations stay **pack-only**. No item can grant them.
5. Coming back every day pays more the longer the streak, without punishing a missed day too hard.
6. Every player has their own **hero** and a **pet** companion from the first minutes, giving the game a face and a story while staying a card game.

---

## Part 1: Item drops

### The Satchel (new inventory)
A new **Satchel** tab in My Binder lists every item with its count, what it does, and a **Use** button. It is stored in `state.items`, which already exists (`trainingPasses` lives there), so old saves just start with an empty satchel.

### Items

| Item | Rarity | Effect |
|---|---|---|
| Study Scroll | Common | +50 XP to one card (already exists, now also drops) |
| Study Tome | Uncommon | +300 XP to one card |
| Grand Codex | Rare | +1,500 XP to one card |
| Academy Pass | Uncommon | One extra rewarded training session (already exists) |
| Focus Charm | Rare | Next training session gives double XP |
| Coach's Whistle | Rare | Next training session also gives the same XP to a second card |
| Ember Shard | Uncommon | Needed for Limit Breaks (Part 2) |
| Star Ember | Very rare | Re-rolls one special-ability slot on a card (cannot touch pack-only mutations) |
| Coin Pouch | Common | 100 to 1,000 coins, opened at once |
| Cosmetic piece | Rare | 1 of 5 pieces of a binder cover or sleeve; collect 5 to unlock |

### Where items drop

| Source | Drops |
|---|---|
| Quest win | 1 roll. Rarer items on higher islands |
| Boss win | 2 rolls, one guaranteed Uncommon or better. First clear also gives an Academy Pass (as today) |
| Training, 5/5 score | 1 roll from the training table (Scrolls, Tomes, Focus Charm, Ember Shard) |
| Daily quests (see recommendation #5) | Set rewards, e.g. 1 Ember Shard |
| Packs | 5% chance of a bonus item card in the reveal |
| Vault Collect All | A Coin Pouch once a day when you collect over 1,000 coins |

### Drop rates (starting values, tune later)
- Common 60%, Uncommon 28%, Rare 10%, Very rare 2%.
- **Pity counter:** if 10 rolls in a row give no Rare, the 11th is guaranteed Rare. The counter is saved, so reloading cannot reset it.
- Higher islands move rates up a little (island 5: Common 45 / Uncommon 33 / Rare 17 / Very rare 5).

### Fairness and anti-farming
- The drop is rolled and **saved before it is shown** (the same pattern packs use with `pendingPackData`). Refreshing the page shows the same item and never rolls again.
- Each battle and training session can award its drop only once (the existing "repeated result cannot pay twice" checks).
- Drops come only from rewarded training sessions, so the daily cap still applies.

### How players see drops
- **Victory screen** (`results.js`): a new "Items found" row with a short reveal. A gold flash for Rare and a rainbow burst for Very rare.
- **Training result**: the same reveal under the XP bar.
- A small red dot on My Binder → Satchel when new items arrive.

---

## Part 2: Levelling cards through training

### 1. Training XP that keeps up with the curve
Change the session reward from a flat 15–30 XP to one that scales with the card's level:

```
session XP = max(30, level × 12) × (score ÷ 5)
```

At 5/5, five sessions give `level × 60` XP, which is **exactly one level a day from training alone**, at any level. Battles, items and the rested bonus speed this up.

| Target | Training only (5/5 every day) | With battles and normal drops (estimate) |
|---|---|---|
| Level 10 | ~10 days | ~4 days |
| Level 25 | ~25 days | ~2–3 weeks |
| Level 50 | ~50 days | ~5–7 weeks |
| Level 100 | ~100 days | ~3–4 months |

### 2. Rested sessions
Unused daily sessions bank up, to a maximum of 10. Missing a day doesn't lose progress, and nobody needs to log in every day.

### 3. Three training modes (same Training Field, same Attack Academy design)
- **Quick Drill**: today's 5 questions. Fast, works anywhere.
- **Sparring**: a short 3-turn battle against a training dummy, with the chosen card as Active. XP depends on how well you play (damage dealt, good Merfling use, smart retreats). Uses the existing card engine, so no new battle code.
- **Mastery Trial**: unlocked at levels 25, 50 and 75 (see Limit Breaks). A harder 5-question set about that card's own element and moves.

### 4. Limit Breaks at 25, 50 and 75
A card stops at level 25, 50 or 75 until it passes a **Limit Break**:
- Pass its Mastery Trial (3/5 or better), **and**
- Spend Ember Shards: 3 at level 25, 6 at level 50, 10 at level 75.

Passing unlocks that milestone's move (the existing `LEVEL_MOVES` at 25/50/75) with a short animation, using the level-up popup in `levels.js`. Extra XP earned while capped is kept, so nothing is wasted.

**Existing cards already above a milestone are not affected.** They count as already broken through.

### 5. Academy Rank (player progress)
Every rewarded session gives Academy points. Ranks (Novice → Adept → Master → Grandmaster) give small permanent perks:
- +1 rested session cap
- +5% training XP
- One free Focus Charm a week

These show on your profile next to your title.

---

## Part 3: Daily login bonus coins and streaks

Builds on the daily rewards in [PR #34](https://github.com/1983stevec-gif/EMBERLINGS/pull/34). That PR has a 7-day cycle (100, 150 coins, Academy Pass, 250, 300, 400 coins, Star Pack) that restarts after a missed day. v2 turns it into a long-term streak.

### Login bonus coins that grow with the streak
Every daily login gives **base coins + a streak bonus**:

```
login coins = 100 + 10 × min(streak days, 50)
```

So day 1 gives 110, day 10 gives 200, and day 50 onwards gives 600 every day. The 7-day reward cycle (Academy Pass on day 3, a pack on day 7) stays on top of this.

### Streak milestones (one-time rewards)

| Streak | Reward |
|---|---|
| 7 days | Star Pack + "Regular" title |
| 14 days | Crystal Pack + 1 Ember Shard |
| 30 days | Mythic Pack + "Devoted" title + gold streak flame on your profile |
| 60 days | Legend Pack + 3 Ember Shards |
| 100 days | Celestial Pack + "Unbreakable" title + animated streak flame |
| Every 100 days after | Celestial Pack |

Titles join the existing Achievements title list, so friends can see them.

### Keeping a streak fair
- **Streak Shield:** missing a single day doesn't reset the streak if you have a Shield. You get one free Shield every 7 streak days, and can hold up to 2. A Shield is used up automatically.
- **Gentle reset:** missing 2 or more days without a Shield doesn't drop you to day 1. You fall back to the last milestone you reached (7, 14, 30…), so long-time players never lose everything.
- **Longest streak:** saved and shown on the profile next to the current streak.
- Days follow the player's local midnight, as in PR #34. A day can be claimed only once, and changing the device clock can't claim the same day twice (each claimed date is saved).

### Where players see it
- **Home:** a small flame counter next to coins, e.g. "🔥 12".
- **Daily panel:** current streak, next milestone with a progress bar, Shields held, and "Come back tomorrow for +X coins".
- **Profile (Achievements):** current streak, longest streak, and the streak flame.

---

## Part 4: Main heroes and introducing pets

An original addition. EMBERLINGS keeps its card-game feel: heroes and pets appear as illustrated cards and portraits, never as a first-person or walk-around view.

### Main heroes (your character)
The player chooses one of four original heroes when starting. They can switch later at the Academy for free, once a day.

| Hero | Theme | Hero Power (once per battle, costs 1 Merfling) |
|---|---|---|
| **Kaelen, the Ember Warden** | Fire, courage | **Rally:** your Active Mythling does +20 damage this turn |
| **Mira, the Tide Scholar** | Water, wisdom | **Insight:** draw 2 cards |
| **Bramble, the Grove Ranger** | Nature, care | **Mend:** heal 30 from one of your Mythlings and clear its conditions |
| **Sola, the Star Seer** | Star / Moon, luck | **Foresight:** look at your top 3 cards and put one in your hand |

- **Hero card:** shown beside your deck on Home and at the edge of the battle board, with a Hero Power button that glows when it's ready.
- **Hero level (1–30):** heroes gain a little XP from every battle and quest. Every 5 levels unlocks a new outfit or frame (cosmetic) or a small passive bonus, for example Kaelen +5% coins from wins.
- **Fairness in friend battles:** Hero Powers are balanced against each other. In online duels both players use their heroes, the server validates the power exactly like attacks, and it can be used only once.

### Introducing pets
Pets are small companion creatures. They're not battle cards: they travel with your hero and help between battles.

- **First pet:** given during the beginner guide. After choosing a hero, the player picks one of three starter **pet eggs** (Ember, Tide or Grove). It hatches after their first quest win, with a short hatch animation and a naming box.
- **More pets:** further eggs come from boss first clears, streak milestones (Part 3) and rare item drops (Part 1). Eggs hatch after a number of battles.
- **Each pet has one helper skill**, active while it's your companion (one at a time):
  - **Pip (Ember):** +10% coins from quest wins
  - **Drizzle (Tide):** +10% XP from training
  - **Mossle (Grove):** Vault slots earn 10% more
  - **Glimmer (Star, rare egg):** +3% chance of a Rare-or-better item drop
- **Care, kept light:** feed your pet once a day with a free Treat from the daily login. A fed pet gets a happy glow and +5% to its skill that day. Pets never get sick or run away; skipping days only removes the bonus.
- **Pet growth:** pets grow from Baby → Young → Grown after 10 and 30 fed days. Each stage gets new art and a slightly bigger bonus (up to +20%).
- **Where they appear:** next to the hero card on Home, in a corner of the battle board (a little cheer animation on knockouts), and on a new **Pets** page in My Binder.

### New player introduction (replaces the start of the beginner guide)
1. **Welcome:** a short illustrated story panel: "The islands' embers are fading. A new keeper is needed…"
2. **Choose your hero:** four hero cards with their Hero Power explained in one line each.
3. **Choose your egg:** three starter eggs.
4. **Your first cards:** the existing starter Mythlings, with the current guide steps (binder, deck, first quest).
5. **First win:** the egg hatches and the player names the pet. The pet's helper skill is explained.

Existing players see a one-time "Meet your hero" screen to pick a hero and a starter egg. Nothing they own changes.

---

## Data and safety

- Save key stays `mythlings-playable-v1`. New fields are added only when missing:
  - `state.items`: item counts
  - `state.dropPity`
  - `state.restedSessions`
  - `state.academyRank`
  - `card.limitBreak`: highest milestone passed
  - `state.daily.streak`, `longestStreak`, `shields`, `claimedDays`, `milestones` (Part 3; extends PR #34's `state.daily`)
  - `state.hero`: chosen hero, hero level and XP, unlocked outfits
  - `state.pets`: list of pets (species, name, stage, fed days, last fed date), plus `activePet` and `eggs`
- Hero Powers in online battles need a small server change in the match engine (validated like attacks). That's still no database migration, because matches are stored as JSON.
- Cloud saves are stored as JSON, so **no database migration** is needed.
- Items are not tradeable in v2 (trades stay card-only). This can be revisited.
- Same rollback rule as purchases: if saving fails, using an item is undone.

## Tests to add
- Drops: each source awards exactly once. Reloading shows the same drop. The pity counter guarantees a Rare. Higher islands improve the odds.
- No item can ever set a pack-only mutation.
- Items: each one does exactly what it says, and counts never go below 0.
- Training: XP formula at levels 1, 25, 60 and 99. The daily cap still applies. Rested sessions cap at 10.
- Limit Breaks: XP is held at the cap. A Trial pass plus shards unlocks the move. Old high-level cards are untouched.
- Login streak: coins formula at days 1, 10 and 60. Each milestone pays once. A Shield covers exactly one missed day. The gentle reset falls back to the last milestone. A day can't be claimed twice, even after changing the device clock.
- Heroes: each Hero Power works once per battle and costs 1 Merfling. The server rejects a second use or a forged power in online duels. Switching hero is allowed once a day.
- Pets: an egg hatches after the right number of wins. Only the active pet's skill applies. Feeding works once a day. Stages change at 10 and 30 fed days.
- An old save with no new fields loads and plays normally. Existing players get the one-time "Meet your hero" screen.

## Phases (one PR each)

| Phase | What ships |
|---|---|
| **v2.0** | Satchel, item list, drops from battles and training, reveal on Victory and training screens |
| **v2.1** | New training XP formula, rested sessions, Academy Rank |
| **v2.2** | Sparring mode, Mastery Trials, Limit Breaks with Ember Shards |
| **v2.3** | Login streak upgrade: growing coins, milestones, Streak Shields, gentle reset, streak flame (Part 3) |
| **v2.4** | Heroes: choose a hero, hero card, Hero Powers in solo and online battles, hero levels (Part 4) |
| **v2.5** | Pets: eggs, hatching, naming, helper skills, daily feeding, growth stages, Pets page, new player introduction (Part 4) |
| **v2.6** | Balance pass: tune drop rates, XP, streak coins and pet bonuses after a few weeks of play |

## Decisions for you
1. **Limit Breaks:** required (a cap at 25/50/75, recommended), or only a bonus so XP never stops?
2. **Tradeable items:** keep items untradeable (recommended for v2), or allow trading them?
3. **Buying with coins:** keep Study Scrolls and Academy Passes in the Shop (recommended), or make them drop-only?
4. **Level-100 pace:** is about 3–4 months per card right, or should it be faster or slower?
5. **Streak reset:** gentle reset to the last milestone (recommended), or a full reset to day 1?
6. **Hero Powers in friend duels:** on (recommended, balanced and checked by the server), or solo-only at first?
7. **Hero names and looks:** keep Kaelen, Mira, Bramble and Sola, or send your own names or art and I'll match them.
8. **Pets:** one active pet at a time (recommended), or let players pick two later?
