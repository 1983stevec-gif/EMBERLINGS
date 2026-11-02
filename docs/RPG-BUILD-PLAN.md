# EMBERLINGS adventure RPG build plan

Preserve existing card IDs, saved progress, coins, deck rules and multiplayer. Deliver small playable milestones through the existing Sites project. All effects must work with touch and reduced-motion settings; decorative effects cannot intercept input or change combat results.

## 1. Signature attacks — first pass built

- [x] Tiderend water-wave trail, Shardwarden crystal strike, Skyrend cyclone, Thornmaw root lash.
- [x] Elemental trails for other creatures.
- [x] Prevent repeated effects when the same battle state renders again; skip old attacks on resume.
- [ ] Add dedicated wind-up/impact timing and named VFX for each remaining creature.

## 2. Creature idle animation — first pass built

- [x] Subtle breathing movement on active creature artwork; reduced motion disables it.
- [ ] Individual blinking, tail movements, wing beats and elemental auras. Use authored animation assets so faces and limbs remain correct.

## 3. Boss introductions — next milestone

- [ ] One short entrance per new boss battle: arena dimming, boss artwork, name and a short challenge.
- [ ] Tap-to-skip, reduced-motion alternative, and immediate access to battle controls after the introduction.
- [ ] Never repeat the entrance on state refresh, reconnect or resume.

## 4. Clearer battle feedback — first pass built

- [x] Damage numbers, blocked-hit labels and hit flash/recoil.
- [ ] Shield-cracking effects and compact, accessible status-effect icons.

## 5. Quest variety

- [ ] Optional survival encounters with a clearly stated turn goal.
- [ ] Elemental challenges, treasure encounters and optional minibosses.
- [ ] Separate encounter identifiers and reward claims; no overwrite of campaign clears or double rewards.
- [ ] Review difficulty, rewards and saved progress compatibility before enabling each mode.

## 6. Living adventure map

- [ ] Moving clouds, waterfalls, lightning by island and glowing available paths.
- [ ] Island arrival effects with short region names; keep level markers clear and tappable.
- [ ] Pause offscreen effects and disable motion when requested.

## 7. Verification for every milestone

- [ ] Phone portrait/landscape, tablet and desktop interaction checks.
- [ ] Local battle, friend battle and shared co-op presentation.
- [ ] No replayed effects, duplicate rewards, blocked controls or save changes.
- [ ] Production build and publish the completed milestone.

Phase-one validation: production build and JavaScript syntax check pass. Local browser checks at 390×844, 889×1100 and 1440×1000 exercise all four signature trails, damage labels, repeated-state deduplication and reduced-motion behavior. The checks confirm that effects leave coins and owned cards unchanged. Battle mechanics and reward code are unchanged. Later milestones remain unchecked until implemented and verified.
