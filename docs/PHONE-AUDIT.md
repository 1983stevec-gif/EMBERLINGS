# Phone audit — November 1, 2026

## Updates

- Phone layouts apply to narrow portrait screens and short landscape phone windows, instead of shrinking the desktop paintings into tiny controls.
- Compact header fits small widths. The bottom navigation, menus and disclosure controls have usable touch targets; text fields use 16px text. Menu avatar/outside/Escape closing is repaired. Visual viewport handling hides navigation when an iOS-style keyboard reduces the visible area.
- Adventure HQ uses the continuous five-island map on phones, with a live quest panel, reachable battle button and sideways deck preview. Region navigation and Current Level bring markers into view even when the first three islands do not fit at once.
- Binder has four-card phone pages, matched pagination and pocket numbering, two-column filters and reserved space for tabs. A regression check verifies that pages do not skip or duplicate owned cards.
- Deck Builder controls wrap and saved-deck actions fit. Mutation previews have explicit portrait bounds. Battle hands remain straight and scroll horizontally. Forms, Vault, practice, Friends, trading and cloud dialogs have bounded phone layouts.
- Full-screen training arenas keep their original full-screen controls without the bottom navigation.

## Verification

75 main-view checks: 15 views at 320×568, 360×800, 390×844, 430×932 and 844×390. All passed with no document horizontal overflow, off-screen controls outside intentional scrolling areas, undersized effective targets under the audit threshold, or JavaScript runtime errors.

Views: Home, Adventure HQ, Packs, Binder, Index, Deck Builder, Vault, Mutation, Fusion, Training, Friends, Trading, Album, Achievements and Rules.

Interactive checks covered:

- Menu toggle, Sound on/off, Binder paging and details, deck save, pack review/reveal, practice rounds and battle setup/turn/concede in phone portrait and landscape.
- All 100 map markers, region jumps, Current Level, locked-quest protection and battle launch at four phone sizes and a tablet size; touch swipe and rotation checks retained.
- Mutation purchase, copy confirmation/cancellation, preservation of originals and existing spare copies, exact charges, Inventory rendering and reload persistence.
- Two local profiles: friend acceptance, co-op invite/join/battle, trade invitation/room/picker/cancellation at 390×844.
- Production build and focused Binder pagination, mutation-copy, visual/progress/Vault, Equip Best and level-rule checks passed.

Tests used Chromium with touch emulation and disposable localhost saves/profiles. Physical iPhone Safari, real-device keyboard behavior and speaker output were not certified. Player save key and existing game progression are unchanged.
