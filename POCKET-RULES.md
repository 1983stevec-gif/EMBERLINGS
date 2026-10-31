# EMBERLINGS — Pocket-format battle update

This replaces the previous five-card stack, focus meter, universal Guard, charged ultimate, attack cooldown, percentage weakness/resistance, damage cap, five-minute score result and sudden-death rules.

## Play

Home > Battle Deck: Auto-build or select exactly 20 cards. Maximum two cards with the same name; a Basic is required. Save the deck and optionally select up to three Merfling types. Your existing owned Mythlings supply species, stats and original art. Ascended and Apex are battle-only evolution templates for owned species, not extra Inventory creatures. A free reusable Trainer toolkit fills out decks without spending coins or consuming Mythlings.

Start Adventure or invite an accepted Friend. An automatic fair coin determines first player. The opening five cards include a Basic. Choose an Active and up to three Basic Benched Mythlings, then Ready.

Each turn draws one card. Custom Emberlings rule: both players start with no Merfling (formerly Energy). Ending a turn, including an attack, earns one Merfling for that player’s next turn. It can be attached once per turn to Active or Bench. Unused zone Merfling is replaced on the next turn-end rather than stacking. Attacks check attached Merfling (including the printed typed requirement) and end the turn. Merfling is normally retained, not spent. Keys 1/2 activate attacks, E attaches to Active, and Space ends a turn.

You may play Basics, Items, one Supporter per turn, a Tool on a Mythling without one, and a Stadium. Only one Stadium is in play. Printed activated abilities can be used while Active or Benched according to their text and do not end the turn. The original Grove Care and Lunar Insight abilities have per-card, once-per-turn limits.

Evolution requires the matching previous Stage and cannot happen on your first turn or the same turn that Mythling entered play/already evolved. It preserves damage, attached Merfling and Tools and clears Special Conditions.

Retreat once per turn by discarding the printed retreat cost in attached Merfling, then promote a Benched Mythling. Retreat preserves damage and remaining Merfling, clears Special Conditions and does not end the turn. You may choose the attached Merfling to discard. Asleep or Paralyzed Mythlings cannot attack or retreat.

Weakness adds 20 damage to Active targets. No resistance; Bench damage ignores Weakness. A knockout discards the card, evolution stack, Merfling and Tool for this match. Normal cards give one point, Radiant cards give two. Radiant is Emberlings' own two-point designation; card art, elements, abilities and stats remain original. Promote from the Bench after a knockout. No Mythlings left in play loses even with more in hand/deck. First to three points wins; simultaneous victory conditions draw.

Poison deals 10 between turns. Burn deals 20 then flips to recover. Sleep flips to wake between turns. Paralysis clears after the affected owner's turn. Confusion flips before an attack and tails deals 30 to the attacker instead. Poison/Burn may coexist; Sleep/Paralysis/Confusion replace each other.

A game reaches a draw after 30 turns; an empty draw pile does not cause a loss. Each player has a 20-minute clock and 90 seconds for turns/replacements. Turn timeouts end the turn automatically; an individual battle clock reaching zero loses. Co-op remains an Emberlings shared-deck extension, with alternating allied control; it is not a Pocket mode.

## Preservation

No player save is reset by this update. Existing Inventory IDs, packs, Fusion, both Vaults, Rebirth, island progress, friends, trading and artwork are retained. Unsupported unfinished battles close safely or are retained in the local previousRulesBattle backup; cards are never deleted. The existing explicit one-time backed-up test restart is unchanged. Collection saves remain browser-local; online battles and trades use the existing D1 backend.

Training and the tutorial now teach Merfling, Bench, retreat, Trainer and evolution sequencing. The binder and Shop remain in place. Battle Deck and Battle Rules are available on Home.

## Verification

Run npm test for current Pocket-format rules, client/preservation, trading, D1 multiplayer and D1 trade-concurrency cases. Older five-card battle fixtures are historical and are no longer the maintained test entry point. Run TypeScript and the Sites build helper as well.

Reference: developer overview https://dena.com/intl/news/4742/ and official battle FAQ https://support.pokemon.com/hc/en-us/articles/38906248102292-Pok%C3%A9mon-TCG-Pocket-Battle-Rules-FAQ . This is an Emberlings implementation of the core mobile format, not a copy of Pokémon's cards, assets or full card database.
