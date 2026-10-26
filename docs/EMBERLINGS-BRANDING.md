# EMBERLINGS branding and riding update

This updates the existing game and existing public Site. The public URL and the legacy `mythlings-playable-v1` save key are deliberately retained so collections, coins, cleared levels, training, fusion and pack history load unchanged. Online cookie names, profiles, friends, matches and database schema are unchanged.

## Branding

The owner-supplied `emebrling` PNG is copied byte-for-byte to `public/branding/emberlings-logo.png`. Its orange/gold/red artwork is not redrawn or recolored. Its supplied navy background is retained. Adventure HQ uses a responsive 170–260px image; the phone layout stacks it above the heading. The header, loading/splash screen, browser title, application metadata and web manifest use EMBERLINGS. App icons are square crops of the supplied flame-crystal crest, at 32/180/192/512px; the main logo remains the original image.

Individual species names and all campaign rules are unchanged. Generic references to the game's creatures now say Emberlings.

## Hidden Hollow

The outing remains a Training Field option. It now uses a 6000×6000 world (the prior arena was 800×440), a first-person camera and mandatory riding of the selected creature. W/up rides forward, S/down rides backward, A/D/left/right steer, and dragging the scene looks around. Touch joystick up/down rides and left/right steers. Shift/Gallop boosts speed. Space/Catch catches a visible creature nearby; E/Whistle lures an existing nearby creature closer.

No wild creatures spawn while standing still. The first encounter requires 800 units of actual travel and being more than 700 units from the starting point. Later encounters require 650 more units of travel. Encounter creatures are visible immediately and remain visible; there are no hiding bushes or reveal timers. Each outing retains the three-creature bag, immediate per-catch saves, and +25 training XP on completion. The player stays mounted until leaving the outing. Other battle/training cameras are unchanged.

For devices without WebGL, a perspective first-person compatibility renderer is used, preserving riding, travel-triggered spawning and catching. It does not switch to an overhead view.

## Validation

- Client regression checks: normal battles and all five bosses, rewards/replays, existing training modes, fusion selections, pack tiers/purchases, saves, Ultimate caps, growth selection, riding steering/gallop/pause/bounds, travel-triggered spawns, visible catches and outing rewards.
- Server regression checks: usernames, sessions/recovery, friend acceptance, participant access, concurrent match inputs, duel/co-op victory and Ultimate caps.
- Browser QA: logo rendering and preserved local collection; complete first-person riding outing with visible catches and XP; phone and tablet viewport checks; forced WebGL-unavailable test confirming first-person compatibility rendering. Viewport tests do not measure physical iPad performance.

Launch at https://mythlings-adventure.proud-book-0456.chatgpt.site/ and refresh an existing tab. Use the same browser/device to retain its collection. On iPad, open in Safari; Add to Home Screen is optional. An already-installed Home Screen shortcut may need to be removed and added again for iOS to refresh its cached name/icon; removing only the shortcut does not request clearing website data.
