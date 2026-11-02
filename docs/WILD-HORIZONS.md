# Wild Horizons and fitted animated logo

Adds 25 illustrated Mythlings at permanent IDs 21–45. Each has its own name, creature silhouette, habitat, illustration and signature move names. Artwork uses the original game atlas as its style reference, with a 5×5 atlas at `public/art/mythlings/wild-horizons-battle-atlas.png`. Runtime and preview-canvas crops use the catalog's exact rows and columns. Original species IDs 0–15 and saved boss IDs 16–20 retain their identities. Existing saved cards, progress and coins are not migrated or reset.

Wild Horizons Pack costs 1,200 in-game coins and awards five different new species per purchase, at Rare / Lv 5. Shiny 15%, Secret 3%, mutations use the Crystal tier. The original seven packs keep their existing lineups. The offer is visible above both painted and narrow pack layouts. Purchased cards follow the existing transactional purchase, reveal and save flow; replaying the purchase UI cannot charge again.

New cards use existing combat-role rules with custom move names. Collection, Index/Album, profiles, deck validation, combat, and multi-card trade validation recognize all 46 IDs. Boss art, frames and saved card identities from the previous edition are retained alongside the newer published screens.

The current transparent logo is centered inside a fitted upper-left header area. Desktop and compact headers use the same logo component with flame glow and rising embers. Reduced-motion settings stop animation. Compact logo dimensions preserve aspect ratio and fit a 60px header; right-side balances/menu align to the opposite edge. Phone Binder pages show four readable pockets; tablet/desktop pages retain twelve. Page navigation reaches every owned copy without skipping cards.

Validation:
- `node tests/horizons-cards.cjs`: 25 distinct designs/art cells/names, stable IDs, printed markup, legal decks and combat for every new species, five different cards per pack, one charge, reload and preservation.
- `node tests/horizons-server.mjs`: isolated local D1 profiles, all 25 card inputs, online decks and all 25 persisted trade assets. Unknown IDs rejected.
- Equip Best and 22 Pocket rules checks pass. Existing visual check passes collection and Vault checks, but its old guided-tutorial Vault-step assertion conflicts with the imported version-60 tutorial. This change does not edit tutorial steps.
- Local Chromium at 320×740, 390×844, 889×1100, 1180×820, 1440×1000: fitted logo, animation/reduced-motion, visible pack offer, purchase/reload, 25 individual art crops and card layouts, no horizontal page overflow or JavaScript/asset errors.
- Production build passes. Tests use disposable local saves and databases only.


## RPG combat artwork and four replacements

All 25 Wild Horizons illustrations now use armored fantasy silhouettes, focused expressions and active attack or defensive battle stances. The four requested replacements occupy the original slots:

| Permanent ID | Previous character | Replacement |
| --- | --- | --- |
| 25 | Corallume / seahorse | Tiderend / Tidal Crocodile |
| 38 | Glasswing / dragonfly | Shardwarden / Crystal Golem |
| 40 | Galecrest / crane | Skyrend / Wind Gryphon |
| 44 | Bloomtail / peacock | Thornmaw / Thorn Chimera |

Names, illustrations, creature descriptions and signature move names change. IDs, elemental types, combat roles, stat formulas, pack availability, rarity, card levels, mutation traits, earned upgrades and art tile coordinates stay intact. Existing owned copies and saved decks use the replacement characters automatically. The new atlas filename prevents browsers from displaying the earlier peaceful artwork from cache. Original artwork remains in Git history.

Combat-art update checks: the Horizons card/pack/phone-pagination and local online/trade tests pass. A comparison against the previous published catalog verifies every stat/role/element/art-coordinate field is unchanged. Upgraded copies of all four replacement IDs preserve their levels, EXP, mutations, bonuses and special-ability seeds across save/reload. Local Chromium at 390×844, 889×1100 and 1440×1000 verifies replacement names, card inspection, all 25 image tiles, reload, and no page/asset errors. Production build passes.
