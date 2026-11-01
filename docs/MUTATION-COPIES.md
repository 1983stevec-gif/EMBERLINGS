# Mutation purchases create new copies

- The first mutation purchase applies to the selected unmutated inventory card.
- If the selected card already has a mutation, the purchase creates a new copy with the chosen mutation. The original stays unchanged, and no other owned copy is consumed.
- The new copy has a fresh inventory ID and keeps the original's species, level, XP, rarity, shiny status, fusion and training bonuses. It inherits the special-ability seed so a new ID does not reroll earned abilities.
- Copies have their own trade identity and are not automatically assigned to the original's Vault slot. The upgrade seed is preserved in online decks and trades.
- Each card has one mutation. A copy can receive the same mutation as its source. Pack-only mutations remain unavailable for purchase.
- Copy purchases show their price and a Create Copy confirmation. Cancelling spends nothing. Coins and the inventory change save together; insufficient coins, invalid choices, trade locks, stale selection, ID collisions and failed storage do not leave a partial purchase.

## Verification

`node tests/mutation-purchases.cjs` covers original preservation, fresh copies, duplicate-confirm protection, retained upgrades, persistence, Vault assignment and failed-purchase rollback.

`node tests/mutation-copy-server.mjs` verifies retained abilities in an online deck, separate trade assets and invalid upgrade metadata rejection, using a disposable local database.

Focused visual/progress/Vault and Equip Best checks and the production build passed. Chromium touch-browser checks at 889×1100, 1180×820, 1440×1000 and 390×844 covered the first purchase, cancel, copying without using an existing spare, exact coin charges, both mutation variants in Inventory, and persistence after reload. Tests used disposable localhost saves; physical iPad Safari was not available.
