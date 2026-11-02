# EMBERLINGS adventure RPG build plan

Preserve existing card IDs, saved progress, coins, deck rules and multiplayer. Deliver small playable milestones through the existing Sites project. All effects must work with touch and reduced-motion settings; decorative effects cannot intercept input or change combat results.

## 1. Signature attacks — complete

- [x] Tiderend water-wave trail, Shardwarden crystal strike, Skyrend cyclone, Thornmaw root lash.
- [x] Elemental trails for other creatures.
- [x] Prevent repeated effects when the same battle state renders again; skip old attacks on resume.
- [x] Add dedicated wind-up/impact timing and named VFX for each remaining creature.

## 2. Creature idle animation — complete

- [x] Subtle breathing movement on active creature artwork; reduced motion disables it.
- [x] Individual blinking, tail movements, wing beats and elemental auras. Use authored face positions and masked artwork layers; wing and tail motion applies to matching creature families.

## 3. Boss introductions — complete

- [x] One short entrance per new boss battle: arena dimming, boss artwork, name and a short challenge.
- [x] Tap-to-skip, reduced-motion alternative, and immediate access to battle controls after the introduction.
- [x] Never repeat the entrance on state refresh, reconnect or resume.

## 4. Clearer battle feedback — complete

- [x] Damage numbers, blocked-hit labels and hit flash/recoil.
- [x] Shield-cracking effects and compact, accessible status-effect icons.

## 5. Quest variety

- [x] Optional survival encounters with a clearly stated turn goal.
- [x] Elemental challenges, treasure encounters and optional minibosses.
- [x] Separate encounter identifiers and reward claims; no overwrite of campaign clears or double rewards.
- [x] Review difficulty, rewards and saved progress compatibility before enabling each mode.

## 6. Living adventure map

- [x] Moving clouds, waterfalls, island lightning and glowing available quest markers.
- [x] Island arrival effects with short region names; keep level markers clear and tappable.
- [x] Pause offscreen effects and disable motion when requested.

## 7. Verification for every milestone

- [x] Phone portrait/landscape, tablet and desktop interaction checks.
- [x] Local battle, friend battle and shared co-op presentation.
- [x] No replayed effects, duplicate rewards, blocked controls or save changes.
- [x] Production build and prepare the completed milestone for publication through the existing Sites project.

Completed validation: 20 unique island encounters cover survival, single-element squads, timed treasure guards and elite guardians. Tests verify one-time rewards, replay/reload, losses, storage rollback, island locks and unchanged campaign progress. Existing 22 card-rule cases, 10 multiplayer cases and the 25-card collection checks pass.

Browser checks at 390×844, 844×390, 889×1100 and 1440×1000 cover encounter controls, turn goals, results, boss intro/skip/reload, creature motion, status icons, named attacks, shields, map weather and reduced motion. Two independent local browser clients verify real friend-duel and shared co-op setup, presentation, polling and results. Existing inventory and currency remain unchanged except explicit encounter awards. Motion layers cannot receive pointer input; offscreen and hidden-document effects pause.

Implementation: `public/rpg-adventure.js`, `public/battle-fx.js`, `public/theme.css` and the existing game/bridge. Optional IDs and reward claims are separate from campaign levels. Existing save key and species IDs remain unchanged. Encounter difficulty scales within each unlocked island; turn limits and first-win rewards are shown before entry. Full balance tuning can continue from player feedback without changing those IDs.
