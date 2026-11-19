# EMBERLINGS: ideas from Pokémon Trail

A plan only. **Nothing here is built.** It maps what the fan game *Pokémon Trail* (pokemontrail.com, viewed November 2026) does onto EMBERLINGS, so the owner can choose what, if anything, to build.

We take ideas about **structure, flow and feel** only. No Pokémon names, characters, art, music, maps or wording. Everything uses our own Mythlings, islands and art.

Effort: **S** = a day or two · **M** = about a week · **L** = several weeks. "Gameplay" means it changes how the game plays or what players earn, so it needs the owner's decision.

## 1. What Pokémon Trail is

- A **3D real-time action game** in the browser (built with three.js). You walk along routes through a region, one zone at a time.
- You lead a **team**. One creature is your **Captain**, and the others follow and help. **Tab** swaps creatures, **Space** dodges, and **Q** uses a **Signature** move.
- Each route sends **waves** (a "Horde") at you. A **Threat** meter and a **Rush** meter build up as you fight, with a knocked-out counter and damage and health multipliers.
- **Gates** stay shut until you clear a part of the route. A **Guardian** blocks the way at the end.
- Between parts you **make camp**. Supporting screens: a **Clinic** (healing), a **Mart** (shop), a **Bag**, and a **Journal / Pokédex** (creatures you have met).
- Progress reads as "Part cleared" → "Zone cleared" → "Now entering [next zone]". There is a mini-map showing You, Team, Captain and Guardian. It is in beta and shows one region.
- It looks elegant: dark backgrounds, serif display fonts (Marcellus, Shippori Mincho, Spectral, Source Serif), and loading scenes with tips.

## 2. How each part could map onto EMBERLINGS

| # | Pokémon Trail feature | EMBERLINGS version | Gameplay? | Effort | Notes |
|---|---|---|---|---|---|
| 1 | Routes split into parts and zones | Show each island's quests as a **trail of stops** on Adventure HQ (path, stops, a Guardian at the end) | No (look only) | M | Same quests and rewards, new map look |
| 2 | "Now entering…" zone banner | Big banner with the island name and art when you start a new island | No | S | Follows the Effects setting |
| 3 | Gate shut / Gate open | A visible gate on the trail that opens with an animation after the island's last quest | No | S | Uses existing quest progress |
| 4 | Guardian at the end of a route | Bosses shown as Guardians on the trail, with their intros | No | S | Uses the boss art and intros already built; needs the painted boss art |
| 5 | Make camp between parts | A **Camp** screen after a quest: heal, check your deck, see rewards, then "Continue the trail" | No if it only links existing screens | S–M | Healing between quests would be gameplay |
| 6 | Clinic, Mart, Bag | Group the existing shop, packs and items behind camp tents | No | S | Mostly navigation |
| 7 | Journal / Pokédex | We already have the Index, Collection and art gallery. Add a "met on the trail" marker | No | S | |
| 8 | Captain plus team | Pick a **Captain Mythling** from your deck that leads on the trail map and in share pictures | No if cosmetic | S | Giving the Captain a bonus would be gameplay |
| 9 | Signature move | Each Mythling's strongest move gets a special full-screen animation | No | M | Builds on the battle animations |
| 10 | Threat / Rush meters | A "Rush" meter that fills during a battle and powers a one-off bonus | **Yes** | M | Changes the balance |
| 11 | Waves (Horde) | A **Gauntlet**: 3–5 battles in a row with no healing, ending at a Guardian | **Yes** | M | Uses the current battle engine; rewards need deciding |
| 12 | Real-time dodging and attacks | A separate top-down 2D action mode with your lead Mythling | **Yes** | L | A new game style; biggest job |
| 13 | Full 3D walkable world | A 3D region with routes and camps | **Yes** | L+ | Several weeks; not recommended now |
| 14 | Loading scenes with tips | Already have loading tips. Could add island scenes behind them | No | S | |
| 15 | Elegant serif look | Optional serif title font for banners and the Camp screen | No | S | Keep the current UI font for body text |

## 3. Suggested order (if the owner wants any of it)

1. **Trail look pack** (rows 1–4 and 14): one PR, about **M**, no gameplay change. This gives the biggest "trail" feel for the cost.
2. **Camp screen and Captain** (rows 5, 6, 8): one PR, **S–M**, no gameplay change.
3. **Signature move animations** (row 9): one PR, **M**.
4. **Gauntlet** (row 11): the first gameplay idea, only after the owner decides the rewards. It would join `GAMEPLAY-IDEAS.md`.
5. Rows 10, 12 and 13 only as part of a future v3 decision.

## 4. Decisions for the owner

| # | Question | Options | Recommended |
|---|---|---|---|
| 1 | Build the trail look? | Yes / no | Yes, as one PR when credit allows |
| 2 | Camp heals between quests? | Look only / real healing (gameplay) | Look only |
| 3 | Captain Mythling | Cosmetic only / small bonus (gameplay) | Cosmetic only |
| 4 | Gauntlet mode | Build / skip; rewards | Decide after v2.0–v2.3 |
| 5 | Action or 3D mode | Never / later v3 | Later v3, if at all |

Rules that always apply: the save key `mythlings-playable-v1` is never renamed or cleared; new save data only goes under `state.ember.*`; Bloom, Tide, Crystal, Solar, Void and Prism stay pack-only mutations; plain, friendly wording.
