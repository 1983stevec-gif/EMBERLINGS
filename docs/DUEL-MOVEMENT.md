# Responsive online movement

The previous client displayed only server-returned positions, added a 250ms wait after every HTTP response, and then interpolated the local player toward that old position. A key change could also wait behind an in-flight request. This produced a noticeable movement delay and could make a short press coast on the server after the key was released.

The updated client moves the local Mythling on the next animation frame using the same bounds, cover and speeds as the authoritative simulation. It sends bounded movement frames and immediately queues changed directions/actions. A single request remains in flight at a time, with a 100ms target cadence including response time instead of a 250ms post-response delay. The server acknowledges movement frame IDs; the client replays only unacknowledged frames and reconciles any position error. Keyboard, joystick and tap-to-walk use the same path.

The server validates frame structure, normalizes axes, enforces collision/bounds, caps processing to 60 frames per packet, and limits movement time with server-earned credit capped at 650ms (250ms initial jitter allowance). Health, hits, damage, energy, cooldowns, wins and losses remain server-authoritative. Older clients without movement frames retain their original server simulation. No database migration, identity change or save-key change is involved.

Inputs stop locally on release. Countdown, defeated players, hidden documents and connection stalls do not keep predicting movement. A lost HTTP response retries the same input sequence so an accepted attack cannot be duplicated. One redundant match lookup was removed from the server input route; participant checks and version-checked updates remain in mutateMatch.

Validation includes simulated 200–370ms variable round trips, dropped action responses, precise short presses, keyboard and touch intent, tap stop distance, cover/world bounds, bounded server time, duel and co-op flows, and the existing regression suites. A browser test with 320ms artificial transport delay measured approximately 400ms total round trips: a 150ms forward press changed the local Y before the authoritative response, then settled to the same server Y without coasting. A real two-browser duel completed with matching winner/loser screens and no console errors.

Refresh the game on both players' devices before starting a new match. Very poor connectivity can still delay opponent updates and damage confirmations; local movement no longer waits for those replies.
