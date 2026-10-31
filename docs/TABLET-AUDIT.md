# Tablet screen audit

Audited October 31, 2026. Existing desktop artwork and the `mythlings-playable-v1` save key are preserved.

## Changes

- Tablet layouts cover widths from 600 to 1366 CSS pixels, including split view. Home and Adventure HQ retain their desktop illustrations, with panels arranged for the available space.
- Packs, Vault, Mutation, Fusion and Friends use live responsive panels with the existing artwork and readable controls instead of shrinking an entire desktop canvas.
- Header and navigation heights are measured. Page padding, scroll margins, menus and tutorials account for their actual size. Navigation hides when a text input has a reduced visual viewport from the keyboard.
- Binder keeps its spine and tabs inside the screen and shows six pockets per tablet page. Desktop keeps twelve. Deck Builder grids and Merfling controls no longer widen the page.
- Adventure HQ has a readable map legend and full-size region, quest and Current Level buttons. Repeated quest selection no longer duplicates button listeners.
- Menus close correctly when tapping the avatar, outside the menu, or Escape.
- Battles, pack reveals, practice, trade rooms, dialogs and collection screens keep their controls within the screen width. Long collections scroll vertically; battle hands can scroll horizontally inside their own row.

## Browser verification

Chromium with touch enabled, against the local application and disposable local profiles:

| Viewports (CSS pixels) | Coverage |
| --- | --- |
| 600 × 900, 768 × 1024, 889 × 1100, 1180 × 820, 1024 × 768, 1366 × 1024 | 15 main views each: 90 checks |
| 600 × 900, 889 × 1100, 1024 × 768 | 28 interactive states each: 84 checks |

All 90 main-view checks passed with no document horizontal overflow, clipped controls, undersized effective touch targets under the audit threshold, or JavaScript errors. Views: Home, Adventure HQ, Packs, Binder, Index, Deck Builder, Vault, Mutation, Fusion, Training, Friends, Trading, Album, Achievements and Rules.

All 84 interactive checks passed: menu, settings, backup, tutorial, Binder filters, card details, deck save and saved decks, mutation replacement, fusion selection/confirmation/result, pack review/opening/reveal/summary, practice challenge/result, battle setup/turn/result, friend actions, co-op lobby/battle and trade invitation/room/picker/cancellation. Critical controls were scrolled into view and checked against the bottom navigation. Two-player checks used disposable profiles in the local database.

Rotation and tablet-to-desktop transitions preserved the selected quest and player progress; Current Level and battle launch passed. Focused navigation, audio, collection/preset/Vault, and release asset-version checks passed, along with the production build.

## Limits

This is browser emulation, not a physical iPad Safari certification. Real on-device keyboard behavior still needs a device check. No player saves, production multiplayer records or credentials were changed by the audit.

## Illustrated sanctum update

The subsequent design pass extends the Mutation Vault's gold framing and moonlit library setting to responsive Fusion, Packs, Vault, Deck Builder, Training, Friends, Trading, Album and Achievements. Chapter banners reuse the game's existing illustrations. Mutation choices have larger illustrated previews, and the large Mutation preview now has explicit portrait bounds so its image remains visible. All values and controls remain live; no artwork contains replacement gameplay data. The original desktop mockup screens remain in place.

The 90-view tablet audit and 84 interactive checks were repeated for this design pass. Navigation, collection/preset/Vault and asset-version checks and the production build also passed.
