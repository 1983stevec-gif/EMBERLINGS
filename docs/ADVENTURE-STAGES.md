# Decimal adventure stages

Campaign quest IDs remain the integers 1–100 in `mythlings-playable-v1`, active battles, cloud saves and cleared history. No migration or reset is needed. Display ID `q` as `floor((q−1)/9)+1` followed by `.` and `(q−1)%9+1`: 1 → 1.1, 9 → 1.9, 10 → 2.1, 99 → 11.9, 100 → 12.1. Creature levels are unchanged.

Every ninth quest (9, 18, …, 99) is an actual boss with stronger encounters/decks and first-clear pack/pass rewards. Existing sequential quest unlocking makes the .9 boss gate the next level. Existing completed quests and active battle rewards are preserved. Islands retain their original quest ranges and artwork; their displayed ranges use decimal stages. Old boss achievements/titles remain credited.

Validation: `node tests/adventure-stages.cjs`, `node tests/phone-binder.cjs`, `node tests/visual-update.cjs`, and production build. Local Chromium checks at 360×800, 889×1100, 1180×820 and 1440×1000 cover all 100 decimal markers, 11 bosses, locked 2.1, tappable 1.9, battle launch and resume, preserved progress, and no page overflow or JavaScript errors. These use disposable local saves, never player data.
