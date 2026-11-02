# Wild Horizons and fitted animated logo

Adds 25 illustrated Mythlings at permanent IDs 21–45. Each has its own name, animal silhouette, habitat, illustration and signature move names. Artwork uses the original game atlas as its style reference, with a 5×5 atlas at `public/art/mythlings/wild-horizons-atlas.png`. Runtime and preview-canvas crops use the catalog's exact rows and columns. Original species IDs 0–15 and saved boss IDs 16–20 retain their identities. Existing saved cards, progress and coins are not migrated or reset.

Wild Horizons Pack costs 1,200 in-game coins and awards five different new species per purchase, at Rare / Lv 5. Shiny 15%, Secret 3%, mutations use the Crystal tier. The original seven packs keep their existing lineups. The offer is visible above both painted and narrow pack layouts. Purchased cards follow the existing transactional purchase, reveal and save flow; replaying the purchase UI cannot charge again.

New cards use existing combat-role rules with custom move names. Collection, Index/Album, profiles, deck validation, combat, and multi-card trade validation recognize all 46 IDs. Boss art, frames and saved card identities from the previous edition are retained alongside the newer published screens.

The current transparent logo is centered inside a fitted upper-left header area. Desktop and compact headers use the same logo component with flame glow and rising embers. Reduced-motion settings stop animation. Compact logo dimensions preserve aspect ratio and fit a 60px header; right-side balances/menu align to the opposite edge. Phone Binder pages show four readable pockets; tablet/desktop pages retain twelve. Page navigation reaches every owned copy without skipping cards.

Validation:
- `node tests/horizons-cards.cjs`: 25 distinct designs/art cells/names, stable IDs, printed markup, legal decks and combat for every new species, five different cards per pack, one charge, reload and preservation.
- `node tests/horizons-server.mjs`: isolated local D1 profiles, all 25 card inputs, online decks and all 25 persisted trade assets. Unknown IDs rejected.
- Equip Best and 22 Pocket rules checks pass. Existing visual check passes collection and Vault checks, but its old guided-tutorial Vault-step assertion conflicts with the imported version-60 tutorial. This change does not edit tutorial steps.
- Local Chromium at 320×740, 390×844, 889×1100, 1180×820, 1440×1000: fitted logo, animation/reduced-motion, visible pack offer, purchase/reload, 25 individual art crops and card layouts, no horizontal page overflow or JavaScript/asset errors.
- Production build passes. Tests use disposable local saves and databases only.
