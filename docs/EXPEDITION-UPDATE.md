# Mythlings expedition update

Existing site and saves are retained. Save key: `mythlings-playable-v1`.

- Arenas fill the browser viewport automatically, reserve touch controls and HUD space, and resize the WebGL camera/framebuffer. Native fullscreen is attempted from a user gesture where supported; the ⛶ button retries. Browsers that restrict native fullscreen still get the full-window layout.
- Ultimate damage is capped at 40% of each target's maximum health, locally and in the authoritative multiplayer server. It can finish a weakened enemy.
- Training → Hidden Hollow: walk to bushes, Scan (E), approach a revealed creature and Catch (Space). Each visit holds three catches; each catch is saved immediately to Inventory, including if the player leaves early.
- Training → Growth Garden: choose any owned Mythling, collect six crystals and break two targets. Completion grants exactly one level, preserving its partial XP and the active battle partner.
- Packs have an in-game purchase review, a skippable unsealing animation, and rotating 3D reveals. Payment and creature creation happen once before the animation. A pending reveal survives reload; navigating away keeps the purchased creature.
- First start offers username creation without an external sign-in. Friends → Add Player → Find Player → Yes, Add Player; the recipient accepts. Existing platform profiles remain supported. Online identities use hashed opaque sessions in HttpOnly, SameSite cookies. Recovery codes restore online identity/friends on another device; collections remain device-local.

Launch the public game in a current browser: https://mythlings-adventure.proud-book-0456.chatgpt.site/
On iPad, open this address in Safari; optionally use Share → Add to Home Screen. Refresh an already-open tab to receive the update. Use the same browser/device to retain the local collection.

Source: game/index.html, lib/social-api.mjs, lib/match-engine.mjs. New D1 migration: drizzle/0002_absent_mad_thinker.sql. Existing migrations are unchanged.

Verification: client simulation covers normal battles and all five bosses, wins/replays, all previous training activities, exact fusion selections, six pack tiers, Ultimate caps, catches/reloads, selected-pet leveling and duplicate purchase prevention. Real D1 tests cover session creation/recovery, origin/participant checks, friend requests/acceptance, concurrent matches and inputs, duel/co-op wins and capped Ultimate. Browser checks cover username setup, two-player friendship, fullscreen 3D arenas, catching and animated pack reveals. Tablet viewport checks are browser emulation, not physical iPad performance measurements.
