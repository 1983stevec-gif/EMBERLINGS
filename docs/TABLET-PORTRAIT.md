# Tablet portrait artwork update — November 1, 2026

Friends uses its dedicated portrait illustration across the available tablet width, with no landscape thumbnail above a large black gap. Its original live search form, requests, friend actions and recovery controls remain in use.

Painted Home, Adventure HQ, Mutation Vault, Vault, Packs and Fusion screens remain available on portrait tablets. Mutation Vault, Vault and Packs reflow rectangles of the original paintings into portrait panels. Live controls are moved rather than cloned, preserving IDs, handlers and refresh behavior. Landscape retains the original composition. Rotation rebuilds the affected panels.

The latest GitHub tablet artwork and UI changes were merged before implementation. Existing saves and the `mythlings-playable-v1` key are preserved.

## Verification

- 35 browser checks across Friends, Mutation Vault, Fusion, Vault, Packs, Home and Adventure HQ at 889×1100, 1180×820, 768×1024, 1024×768 and 1024×1366. Painted backgrounds remained present, with no document horizontal overflow or runtime errors.
- Friend search and recovery controls exercised on portrait tablets.
- Mutation selection/purchase, pack review, and Vault controls exercised at 889, 768 and 1180 pixels wide.
- Upright battle cards, a ten-card scrolling hand, setup selection and turn transition checked at 889, 1180, 1440 and 390 pixels wide.
- Production build, focused visual/progress/Vault checks and Equip Best/level/mutation checks passed.
- `npm test` stops at the existing `tests/dragon-pack.cjs` assertion requiring the dragon to outperform every other species. Current rules have multiple equally strong species; that older requirement was left unchanged.

Browser checks used Chromium with touch emulation and disposable localhost profiles, not physical iPad Safari. No production player records were used for tests.

## Full room scenery follow-up

Portrait Mutation Vault, Vault and Packs now retain the original room scenery beside the reflowed panels. Fixed side scenery preserves the painting's proportions and remains visible during page scrolling; panel gutters keep the bookshelves, candles, vines and moonlit arch exposed. Landscape composition is unchanged. The 35 rotation/artwork checks and mutation, pack and Vault control checks passed again after this update.
