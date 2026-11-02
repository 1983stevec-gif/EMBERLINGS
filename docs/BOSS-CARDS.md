# Island Guardian cards

Five boss species append to the existing creature IDs (16–20): Magmarok, Thorn Guardian, Frostfang, Voltitan, and Voidra. Existing species IDs, saves, cards, coins, progress, packs, and mutation rules are retained. The shared catalog, combat stats/effects, Index/Album counts, server profile/deck/trade validation, and exported card-art crop support all five.

Artwork: `public/art/mythlings/bosses-atlas.png`, generated using the original `mythlings-atlas-v2.png` and Glacipaw artwork as visual references. The 1536×1024 atlas has six square tiles: the five bosses and an unused moonlit island. CSS and exported card canvases crop the correct tile without changing the image. Bosses use the existing printed card frame and a Boss label, with matching signature moves.

Boss stages (.9) feature their actual boss card, guaranteed in the opponent's opening hand. Each boss stage awards one Legendary boss card on victory; `bossCardClaims` records the integer quest ID inside the existing save transaction. Previously completed stages can be replayed for the new card. Subsequent wins retain existing replay rewards without duplicating the boss card. Losses and failed saves do not claim or grant it. Repeated appearances of the same guardian at later .9 stages can earn another owned copy. Bosses remain outside paid packs and normal enemy pools.

Validation:
- `node tests/boss-cards.cjs`: all five species, all 11 boss-stage drops, deck support, printed artwork, actual signature effects, first-card/replay/loss/storage rollback/reload, and old-save replay eligibility.
- `node tests/boss-cards-server.mjs`: isolated local D1 profiles, online battle decks and persisted trade assets for all five; unknown IDs rejected.
- Existing adventure stages, mutations, Equip Best, 22 Pocket rules, phone Binder and visual/progression checks pass.
- Local Chromium at 360×800, 889×1100 and 1440×1000: five card illustrations and crop coordinates, boss map art, actual boss opening card, victory → Binder reward, reload and once-only claims. No page overflow or JavaScript errors. Disposable local saves only.
- Production build passes.

## Boss edition frame — November 2

Boss cards have a dark enamel face, double gold trim, illustrated corner details, crown seal, element accents, and a foil sweep confined to the artwork. The normal collection's rainbow overlay is suppressed on this edition to preserve readable stats and original illustration colors. Boss/Shiny labels and the Boss Edition footer remain visible. Reduced-motion settings stop the foil animation. Preview canvases use matching gold borders and crown details. The printed card renderer applies this treatment consistently in Binder, battle, deck and inspection views; card values, rewards and saves are unchanged.

Existing boss/reward and visual checks and production build pass. Local browser checks cover all five frames, normal-card comparison, artwork crops, reduced-motion behavior, boss battle presentation and reward/reload flow at phone, tablet and desktop sizes.
