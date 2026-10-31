# Play Together, collection tools and save transfers

Added October 31, 2026.

- Home has an interactive EMBERLINGS logo and Save Backup entry point. The bottom Friends tab retains all co-op hosting and joining controls; the separate Play with Friends Home tile is removed.
- Host a Game selects an accepted friend. Join a Game accepts the host's copied invitation code; codes remain private to the invited pair and expire under the existing three-minute invitation rule.
- Co-op uses the existing shared deck and alternating team turns. The battle explains who controls the team and what to do next. Both players can resume through invitations.
- Species and availability filters join existing rarity, element and mutation filters. Strongest sorts by damage plus one-quarter HP. Locked-card details explain how to free a card.
- Backup downloads a versioned JSON snapshot. Import validates it, previews progress and requires confirmation before replacement. The save key remains mythlings-playable-v1. Online identity/recovery secrets are excluded; destination identity is retained. Trade asset identities are preserved. Finish trades and battles on both devices before transfer. This is manual transfer, not cloud synchronization.
- Mobile pinch zoom is enabled, with larger friend/battle touch targets and visible keyboard focus.

Checks: enhancements.cjs, pocket-server.mjs (including a complete two-client co-op quest), equip-best.mjs, visual-update.cjs, production build. The older pocket-client.cjs expects the superseded fixed 20-card builder title. No full browser or physical-device gameplay verification was available in this environment.

## Move animations

Damaging attacks now send bounded visual events with their actual move name, element and damage. Waves, bubbles, flames, lightning, ice, crystal, vines, moon, shadow and wind have distinct SVG effects travelling from attacker to target, followed by an impact and damage label. Solo, enemy, duel and co-op attacks use the same presentation; final hits also animate. Repeated renders/polls and resumed battles do not replay old attacks. Effects never block controls. Game and system Reduce Motion settings show a brief stationary cue instead. Checks: battle-effects.mjs, battle-effects-client.cjs, merfling.mjs, pocket-server.mjs and the production build.

## Interactive logo

The existing Home logo responds to pointer movement with a small tilt and light reflection. Tapping or keyboard activation cycles flame, crystal and ember bursts with a status caption. Both game and system Reduce Motion settings suppress moving effects. Interactions are decorative and do not affect player progress.
