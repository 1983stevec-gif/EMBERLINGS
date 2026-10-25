# Mythlings graphics build plan — zero budget

Keep the existing Three.js game, save format, combat rules, map, training activities, Inventory, packs and fusion picker. Use Blender for reusable GLB assets. Release small playable upgrades.

| Phase | Work | Completion check |
|---|---|---|
| 1 — First art pass (implemented) | Original Flaminyx in Blender; idle, walk, attack and hit animation clips; GLB loading; improved meadow arena. | Browser checks passed for normal and boss victories; the GLB loads and animates. |
| 2 — Creature roster | Upgrade the remaining nine species with consistent materials and animation conventions. | Distinct silhouettes, working shiny variants, independent animation state. |
| 3 — Bosses | Distinct models and signature attack animations for the five bosses. | Readable windups and unchanged campaign milestones and rewards. |
| 4 — World art | Five region palettes, scenery and arena props; consistent art in Inventory, pack reveals and fusion. | Scenery does not hide warnings or silently change collisions. |
| 5 — Effects | Elemental trails, hit sparks, victory poses, restrained camera motion, sound options and graphics settings. | Health and controls remain readable; camera motion can be reduced. |
| 6 — Tablet performance | Profile real iPad play; share materials, compress assets, test loading and repeated battle cleanup. | Target at least 30 fps on the user's iPad. A desktop viewport test cannot certify actual-device performance. |

## First-pass targets

- No paid models, subscriptions or add-ons.
- Flaminyx target: no more than 5,000 triangles and a GLB below 300 KB.
- Named clips: Idle, Walk, Attack and Hit.
- Keep editable Blender source and an export script.
- Bundle the Three.js loader locally; no runtime CDN requirement.
- Retain the existing model when the new asset fails to load.
- Do not start combat before graphics are ready or change the save format.

## Release checks

1. Inspect and preserve existing gameplay.
2. Validate model size, triangle count, skinning and animation clips.
3. Enter and win normal and boss battles; verify rewards and navigation.
4. Re-enter battles to verify independent animations and cleanup.
5. Run save, training and fusion regression checks.
6. Publish to the existing Mythlings link.

## First build results

- Flaminyx: 4,856 triangles, 246,988-byte GLB, ten-bone rig and seven materials.
- All four exported clips validated. Independently cloned skeletons were tested.
- Browser confirmed that the actual GLB loaded and the Walk clip played.
- A normal victory awarded 52 coins and 22 XP; a boss victory awarded 440 coins and 120 XP in isolated test saves.
- The normal test scene reported 50 render calls and 16,136 rendered triangles. These are scene measurements, not a real-iPad frame-rate certification.
- Save, training, fusion and combat regression checks passed.

Phase 1 is implemented and tested. The remaining creatures, custom boss art, UI art and later effects/performance work are planned phases, not completed features or scheduled background jobs.
