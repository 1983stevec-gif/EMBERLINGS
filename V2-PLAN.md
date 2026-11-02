# EMBERLINGS v2 plan: item drops and levelling cards through training

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

## Data and safety

- Save key stays `mythlings-playable-v1`. New fields are added only when missing:
  - `state.items`: item counts
  - `state.dropPity`
  - `state.restedSessions`
  - `state.academyRank`
  - `card.limitBreak`: highest milestone passed
- Cloud saves are stored as JSON, so **no database migration** is needed.
- Items are not tradeable in v2 (trades stay card-only). This can be revisited.
- Same rollback rule as purchases: if saving fails, using an item is undone.

## Tests to add
- Drops: each source awards exactly once. Reloading shows the same drop. The pity counter guarantees a Rare. Higher islands improve the odds.
- No item can ever set a pack-only mutation.
- Items: each one does exactly what it says, and counts never go below 0.
- Training: XP formula at levels 1, 25, 60 and 99. The daily cap still applies. Rested sessions cap at 10.
- Limit Breaks: XP is held at the cap. A Trial pass plus shards unlocks the move. Old high-level cards are untouched.
- An old save with no new fields loads and plays normally.

## Phases (one PR each)

| Phase | What ships |
|---|---|
| **v2.0** | Satchel, item list, drops from battles and training, reveal on Victory and training screens |
| **v2.1** | New training XP formula, rested sessions, Academy Rank |
| **v2.2** | Sparring mode, Mastery Trials, Limit Breaks with Ember Shards |
| **v2.3** | Balance pass: tune drop rates and XP after a few weeks of play |

## Decisions for you
1. **Limit Breaks:** required (a cap at 25/50/75, recommended), or only a bonus so XP never stops?
2. **Tradeable items:** keep items untradeable (recommended for v2), or allow trading them?
3. **Buying with coins:** keep Study Scrolls and Academy Passes in the Shop (recommended), or make them drop-only?
4. **Level-100 pace:** is about 3–4 months per card right, or should it be faster or slower?
