# Online play and the existing game

The original game remains in `game/index.html`, served at the same root URL. Its browser save key is unchanged. Static models and Three.js modules are in `public/`. The Sites project ID and audience are preserved.

The Vinext Worker adds a D1 database and authenticated `/api/social/*` routes. Sites owns sign-in. Each player signs in to their own ChatGPT account and registers a unique 3–20 character username. No passwords or authentication tokens are stored in game source.

Friend requests require explicit acceptance by the recipient. Accepted friends may invite one another to a duel or a two-player boss battle. Both clients submit movement and action intentions; the server computes movement, cooldowns, health, hits and the result. Conditional version updates prevent concurrent input from overwriting the other participant's changes. Match records are readable only by the two participants. Writes require same-origin requests and authenticated identity.

Online battle stats are balanced at Level 12. Online matches are friendly practice: they do not spend coins or advance the single-player map. Existing collections, packs, inventory, fusion and campaign progress remain device-local. Profiles, friendships and match state are stored online. Collection syncing and trading are not part of this update.

Invitations expire after three minutes. A disconnected participant has a short reconnect window; leaving a duel forfeits it, and leaving a team battle ends it. Active match records that stop receiving updates are expired before new invitations are created. Clients send at most one input request at a time, approximately every 250 ms plus network latency, and friend lists refresh every four seconds while open. This first multiplayer version is intended for two friends on a stable connection, not competitive matchmaking.

Database migrations are in `drizzle/`. Do not alter applied migrations. Publishing applies the schema to the hosted D1 binding. Use the Sites build and deployment helpers; do not upload the old static-only archive.

The two-client QA proxy and test profiles are outside this repository and are not deployed. Local `.wrangler` databases, dependency folders and execution-profile state are ignored. There are no production test accounts or development identity overrides in the application.
