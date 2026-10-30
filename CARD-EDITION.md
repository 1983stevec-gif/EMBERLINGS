# EMBERLINGS Card Edition — Batch 3

Play at https://mythlings-adventure.proud-book-0456.chatgpt.site/ and refresh once.

Adventure uses randomized five-card owned stacks, active-card selection, a fair coin flip, focus-based attacks, persistent match HP, knockout points, first-to-three wins and a five-minute timer. Tied matches get 45-second sudden death, then remaining health or a draw. Keys 1–4 activate attack runes.

Friend duels use the same engine with server-validated choices and cryptographic coin flips. Co-op combines five cards from each friend into a shared ten-card stack; friends alternate allied attack turns against Rift Guardians. Friendly matches do not award campaign progress.

Inventory is a paged, filterable card binder. Index remembers species discoveries after cards leave the collection. Training chooses one of five independent random card challenges per visit. Five rewarded sessions per UTC day; Academy Passes allow extra sessions. Permanent Academy attack progression caps at five per creature.

Shop sells functional cosmetics, existing/themed packs, Academy Passes and EXP scrolls using game coins. Cosmetic purchases equip immediately. Existing five-card packs, trading, Fusion, Mutation Vault and creature artwork remain.

The five existing islands require Rebirth counts 0–4. Rebirth still requires its coins and recommended-pack Mythling. Quest wins grant assigned coins and EXP; first boss clears also grant a free pack and Academy Pass. Final-boss completion grants a collectible.

Regular Vault earnings are greatly reduced. Base rates range 0.001–0.008 coins/second, level adds up to 50%, shiny adds 10%, passive Rebirth adds at most 2x and Cosmic passive income adds at most 2.5x. This supersedes the old 1,000x Cosmic Vault payout. Owned traits and purchased slots remain. Offline income caps at two hours and uses server time plus a monotonic session clock. Fractions and prior pending coins are retained.

The existing browser-local save key remains mythlings-playable-v1. No save resets automatically. Home > Test save tools provides a one-time backed-up test restart, blocked while a trade or battle is active. It preserves online username/friends. A separate marker and saved version prevent accidental repetition. Collections remain browser-local; online match decisions and trading receipts use the existing server.

Run npm test for the maintained card-edition suite, including real normal/boss client playthroughs, complete friend API duels and existing D1 trading concurrency tests. Historical action-combat/high-Vault-rate test fixtures describe superseded behavior. Also run TypeScript checks and the Sites production build helper.

For local play after dependencies are installed: npm run build, then npm start. Open the Local URL printed by Wrangler. The public URL is the easiest way to play with friends across devices.
