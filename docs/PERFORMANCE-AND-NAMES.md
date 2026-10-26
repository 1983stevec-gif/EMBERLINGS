# Performance and creature-name correction

The game title and supplied logo remain EMBERLINGS. Animals are called Mythlings again; individual species names and saved IDs are unchanged. The save key, public URL, profile sessions and database are preserved.

## Confirmed issue

A local browser probe of the previous release measured a paused Hidden Hollow scene continuing to render at 60 frames per second. The same viewport rendered 45,566 triangles per frame. Its JavaScript render/HUD work averaged about 1.1ms on this desktop, so poor active frame rate was not reproduced on this machine; these measurements do not establish the frame rate or main bottleneck on the user's iPad. Several older game tabs were open, which can multiply unnecessary rendering. The static logo does not participate in battle rendering; it is retained.

## Removed work

- Paused scenes redraw only for the pause transition or a resize; hidden scenes do not render or simulate locally. Online server matches continue as intended.
- Rendering is capped at 60Hz independently of simulation updates, avoiding extra draws on high-refresh displays.
- HUD updates are limited to 10Hz, with unchanged text left alone.
- Optional anti-aliasing, supersampling and real-time shadows are removed. Framebuffers are limited to 900,000 pixels while preserving camera aspect and pointer coordinates.
- Hidden Hollow forest instances drop from 420 to 140. World bounds, first-person riding, spawning and catching rules are unchanged.
- A pack reveal stops rendering when its window loses focus or its document is hidden.

Tests cover pause/background rendering, render frequency, unchanged HUD updates, action labels, naming, and the existing battle/training/pack/fusion/save flows. The desktop preview is a resource check, not a promise of a particular physical-device frame rate.

The updated browser preview measured 0.0 redraws/sec after pausing, 16,446 triangles/frame in the same starting scene (about 64% fewer), and a 899,232-pixel framebuffer at a 2560×1440 viewport. A normal battle was completed through the browser and awarded coins/XP without console errors.

Refresh an existing game tab after publication. Older already-open tabs still execute their old code until refreshed; close duplicate game tabs if unused. No browser data needs to be cleared.
