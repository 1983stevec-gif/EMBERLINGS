# Adventure HQ sideways map — November 1, 2026

Adventure HQ now has one horizontal scrolling world containing all five campaign regions and all 100 existing quests. The original three islands retain their artwork; Thunder Valley and Shadow Realm have new illustrated island scenery. Their quest paths remain on the map instead of replacing the original islands with a region overlay.

Touch swiping, a visible scrollbar, left/right buttons and keyboard arrow keys move the map. Region buttons and Current Level bring the relevant quests into view. The quest/deck panel stays outside the scrolling map. Quest locks, boss milestones, rewards and saved progress are unchanged.

## Checks

- Chromium touch emulation at 889×1100, 1180×820, 1440×1000 and 768×1024.
- All 100 quest markers and five region selectors present; no document horizontal overflow.
- Explicit touch-start/move/end swipe moved the map horizontally.
- Left/right scrolling, region jumps, Current Level and repeated Previous/Next selection passed.
- Locked quest selection did not launch a battle. An unlocked quest launched normally.
- Tablet rotation preserved the selected quest and all markers.
- Production build and focused visual, progress, Vault, Equip Best, level and mutation-rule tests passed.

Tests used disposable localhost saves. Physical iPad Safari was not available for device verification.
