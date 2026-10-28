# Batch 1: packs, Rebirth, and Vault slots

The existing save key (`mythlings-playable-v1`) and gameplay remain in place. The old one-slot Vault migrates to slot 1, preserving its Mythling, pending coins and timestamp. No backend or database changes are needed.

Every pack purchases five independent results at the existing pack price and odds. All five unique creature IDs are saved in one transaction before animations begin. A saved reveal queue supports individual reveals, Reveal All and resuming after reload. Revealing never creates creatures. Old one-result pending reveals still work.

Rebirth requirements: 10,000 / 50,000 / 150,000 / 500,000 / 1,500,000 wallet coins. First-five multipliers: 1.25× / 1.5× / 2× / 2.5× / 3×. After five, requirements double and smaller multiplier gains asymptotically approach 4×. A dedicated inline confirmation explicitly resets wallet and uncollected Vault coins. Creatures, slot purchases, cleared levels, training and other inventory/progress stay intact. Occupied Vault slots remain occupied and immediately earn at the new multiplier.

Vault starts with one free slot; additional slots cost 2,500 / 10,000 / 35,000 / 100,000. Slots settle separately using elapsed timestamps and per-second rates. Collection floors each slot independently and retains fractions. Collect All displays the exact sum collectible. Active partners and deposited creatures remain protected from fusion/training; only spare fused Mythlings are eligible, as before.

Pack purchases, unlocks, claims, withdrawals and Rebirth use a single persisted transaction, reverting in-memory changes when storage fails. Repeat/stale clicks revalidate coins and current state. Five-result packs allow repeated species with distinct IDs.

Run `node tests/economy.cjs` from the project root for migration, five-result packs, queue persistence, prices, simultaneous earnings, Rebirth thresholds/bonuses/preservation, duplicate protection and failed-save tests.

Performance: one rolling transform and one 3D creature preview at a time; Reveal All uses five static cards with short entrance animations. One visible Vault counter timer, no per-second storage writes. Rebirth portal rotates one border with CSS transform and respects reduced motion. Existing renderer caps and immediate online movement remain unchanged.
