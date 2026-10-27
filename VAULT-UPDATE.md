# Vault and species combat

The game keeps its existing `mythlings-playable-v1` save key. Vault deposits reference an owned creature ID; they never remove the creature. Balance is settled from elapsed timestamps when saving or claiming, with a 24-hour cap per settlement and whole-coin claims preserving fractions. New fusions store provenance and the maximum parent rarity; old untagged fusions require an explicit user mark.

`public/combat-rules.js` is the shared ESM source for species skills, rarity damage and Vault rates. The HTML module and authoritative match engine import the same definitions. Profile/loadout rarity is validated and persisted through migration 0003. Previous migrations are unchanged. Server damage never accepts a client-provided damage value.

Pack rolls contain 32 fixed-width cards and animate only a transform for 2.6 seconds. The already saved purchased creature occupies landing index 26. Normal finish, skip and reduced motion all land on that same result. Collection cards no longer run perpetual bobbing animations. Vault refreshes only a text counter while visible, without storage writes each second.
