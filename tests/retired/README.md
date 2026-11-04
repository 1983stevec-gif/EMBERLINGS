# Retired tests

These files test the game as it was before the card edition: single pets, the one-slot Vault, Rebirth and `petAttack`. Those features were removed or replaced, so the files cannot run against the current game. `npm test` does not run them.

They are kept for reference. Current coverage lives in:

- `cards-trading.cjs`, `trades-server.mjs`: trades
- `visual-update.cjs`, `cards-client.cjs`: Vault, mutations, packs
- `pocket-client.cjs`, `pocket-rules.mjs`, `pocket-server.mjs`: battles and decks

Trade checks with no newer equivalent yet: a lost accept reply recovered on reconnect (`trades-network.cjs`), and a stale accept that asks for review again.
