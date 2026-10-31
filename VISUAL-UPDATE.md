# Illustrated cards and deck presets

This update preserves the existing save key and all owned copy IDs, inventory, battles, trades, packs and progression.

- Ten original 2D animal illustrations replace WebGL portrait generation. A shared atlas is decoded once by the browser and reused; the card/binder screens no longer import Three.js for portraits.
- Cards print HP, two attacks, Energy symbols, weakness, retreat, rarity and level. Battle controls emphasize icons and damage; full effect text is available on hover and in details.
- Card Inventory opens with an animated illustrated hand gripping the binder cover. Reduced-motion settings skip the animation.
- Equip Best ranks available owned copies by battle stats and rarity, selects up to three Energy types and legal evolution lines, and equips immediately. Save Deck creates a named persistent preset. Saved buttons equip validated loadouts without changing ownership. Unavailable stored/traded cards cannot be equipped.
- Vault base earnings are 4/10/22/45/90/180/360 whole coins per second, around 10% below the former base rates. Shiny, level, Rebirth and purchased mutation bonuses remain; Cosmic is 1,000 times the same unmutated rate. Existing pending earnings are settled at the previous rate before migration, avoiding retroactive new-rate windfalls. Partial seconds remain internal; displayed rates and collected coins are integers.
- Replay Tutorial now tours the real Home, Inventory, Deck, Map, Training, Packs, Vault and Friends screens using a pointer, highlights, icons and short instructions. It does not automatically purchase packs or consume creatures.

Validation requested by the player was intentionally focused: three new grouped checks in tests/visual-update.cjs; existing client/preservation checks; build and TypeScript. Browser smoke check covered binder, tutorial navigation, Equip Best + named save and entering a normal quest. A full multiplayer/end-to-end rerun was not performed for this visual update.

Artwork refinement: atlas v2 uses ink contours, flatter painted color, reduced glow and simplified animal forms. Card layout, stats, economy, saved deck presets and progress are unchanged by this artwork-only refinement.

Mobile artwork fix: uses actual lazy-loaded image elements in clipped tiles, with reserved square dimensions and a CSS height fallback, rather than relying only on CSS background painting. Card image minimums are set for small screens.
