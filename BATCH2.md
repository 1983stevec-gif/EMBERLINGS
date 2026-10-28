# Batch 2: Fusion, mutations, Rebirth requirements and equipped portraits

Fusion Lab and its legacy aliases now route directly to the original two-Mythling picker. The Home coin Vault stays separate. All paid fusion mechanics and result generation stay intact.

Mutation Vault stores a single `mutation` ID on each owned creature. Shared combat rules define Spark (+10% damage/+10% Vault coins, 2,500), Flame (+20%/+20%, 10,000), Frost (+25%/+15%, 25,000), Storm (+35%/+30%, 75,000), Shadow (+50%/+40%, 200,000), and Cosmic (+75%/+60%, 500,000). Damage applies once after the existing species/level/rarity/shiny calculation; coin bonus multiplies the existing Vault rarity/shiny/Rebirth rate. Replacements revalidate the expected old trait and require confirmation; same-trait purchases are rejected. An occupied slot settles its old rate before mutation. Saved transactions roll back when browser storage fails. Rebirth never removes traits.

The Mutation Vault shows actual creature artwork, per-trait comparisons and a brief CSS transformation. Creature selection is paginated by 24 with no inventory cap. Inventory and Vault show mutation badges and colored auras; battles show the trait and its bonuses in the HUD and a matching ground ring. Friend duel/co-op profiles persist the nullable `pet_mutation` column (migration 0004), validate IDs and calculate server damage from shared rules. Old profiles default to no mutation.

Rebirth retains all previous costs and permanent multipliers, and now also requires an owned species at the displayed minimum rarity. Adventure level recommends Wonder (1–10), Star (11–25), Crystal (26–45), Mythic (46–70), Legend (71–99), or Celestial (100). The stage requirement is saved once and stays fixed while progressing. Its species is picked deterministically from that pack's actual pool, using the rebirth stage. Matching higher-rarity/shiny/secret/fused/stored copies count, preserving compatibility with old saves without pack provenance. The required creature is never consumed. After success, the next stage calculates from the then-current adventure level. Missing-creature screens link to the appropriate pack.

All packs still save five independent creatures with unique IDs, species, tier stats and original shiny/secret chances. New results also record the source pack. Mutations are never awarded or counted as creatures in packs. Reveal Next/All and saved reveal recovery remain.

Occupied regular Vault slots now show still portraits rendered from their own equipped Mythling model, not a bank icon. Empty slots retain the bank placeholder. One renderer makes any missing thumbnails, then disposes; up to 24 portrait variants are cached in memory. There is no portrait render loop. Mutation chamber motion uses CSS transforms, with reduced-motion support. No per-second save writes were added.

Checks (project root):
- `node tests/economy.cjs` — existing 17 economy/preservation cases.
- `node tests/mutations.cjs` — 12 new frontend/state cases.
- `node tests/mutations-server.mjs` — 4 new API/migration/authoritative damage cases.
- TypeScript and the production build.

Existing campaign, all five bosses, training, fusion, movement prediction, combat and social tests are also run in the parent QA workspace.
