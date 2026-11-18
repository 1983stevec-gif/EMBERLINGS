// Pack replays: recording from a pack summary, the 10-entry cap, the save-size budget, the replay player,
// and the promise that a replay never grants anything. No browser: without window.EmberBridge the module
// only loads its pure exports, which are the same functions the page uses.
import assert from 'node:assert/strict';
import { REPLAY_CAP, CARDS_PER_PACK, SIZE_BUDGET, compactCard, ensureReplays, recordOpening,
  validEntry, replaysSize, playerStart, playerNext, playerAll, playerBack, playerView } from '../public/pack-replays.js';

let count = 0;
const test = (name, fn) => { fn(); count++; console.log('PASS ' + name); };

// A creature the way the game stores it in state.owned, with an id that must never be recorded.
const creature = (i, extra = {}) => ({
  id: 'owned-card-' + i, kind: i % 16, level: 6, xp: 40, bonus: 2, rarity: 'Common', sourcePack: 'pack',
  shiny: false, secret: false, mutation: null, ...extra
});
const summary = (extra = {}, n = 5) => ({ creatures: Array.from({ length: n }, (_, i) => creature(i, extra)) });

test(`Recording a pack summary keeps ${CARDS_PER_PACK} compact snapshots and no ids`, () => {
  const st = { coins: 500, owned: [creature(0)], pendingPack: { id: 'pending', ids: ['owned-card-0'] } };
  const entry = recordOpening(st, {
    creatures: [
      creature(0),
      creature(1, { shiny: true }),
      creature(2, { secret: true, rarity: 'Mythic' }),
      creature(3, { mutation: 'bloom' }),
      creature(4, { level: 100, rarity: 'Legendary' })
    ]
  }, 1760000000000);

  assert.ok(entry, 'an opening is recorded');
  const list = st.ember.packReplays.list;
  assert.equal(list.length, 1);
  assert.equal(list[0].at, 1760000000000);
  assert.equal(list[0].packId, 'pack', 'the pack comes from the pack screen, not from the card ids');
  assert.equal(list[0].cards.length, 5);

  const [a, b, c, d, e] = list[0].cards;
  assert.deepEqual(Object.keys(a).sort(), ['kind', 'level', 'mutation', 'rarity', 'secret', 'shiny']);
  assert.deepEqual(a, { kind: 0, rarity: 'Common', level: 6, shiny: false, secret: false, mutation: null });
  assert.equal(b.shiny, true);
  assert.equal(c.secret, true);
  assert.equal(d.mutation, 'bloom');
  assert.deepEqual([e.level, e.rarity], [100, 'Legendary']);

  const text = JSON.stringify(st.ember.packReplays);
  assert.ok(!text.includes('owned-card-'), 'no card ids are stored');
  assert.ok(!/"id"/.test(text), 'no id field is stored');
  assert.ok(validEntry(list[0]));

  // Details that are not a finished 5-card pack are ignored, and nothing else is written.
  assert.equal(compactCard({ kind: 99 }), null, 'a card without a real species is never recorded');
  assert.equal(compactCard(null), null);
  assert.equal(recordOpening(st, { creatures: [] }), null);
  assert.equal(recordOpening(st, null), null);
  assert.equal(recordOpening(st, summary({}, 4)), null);
  assert.equal(st.ember.packReplays.list.length, 1, 'a bad detail leaves the store alone');
  assert.equal(st.coins, 500);
});

test(`The store keeps the newest ${REPLAY_CAP} openings and drops the oldest`, () => {
  const st = {};
  for (let i = 0; i < 12; i++) {
    recordOpening(st, summary({ sourcePack: i === 11 ? 'celestial' : 'pack' }), 1000 + i);
  }
  const list = st.ember.packReplays.list;
  assert.equal(list.length, REPLAY_CAP);
  assert.deepEqual(list.map(e => e.at), Array.from({ length: REPLAY_CAP }, (_, i) => 1011 - i), 'newest first');
  assert.equal(list[0].packId, 'celestial', 'the last opening is on top');
  assert.equal(list[REPLAY_CAP - 1].at, 1002, 'the two oldest are gone');
  assert.equal(ensureReplays(st), st.ember.packReplays, 'existing entries are kept');
});

const fancy = { ember: { stats: { packs: [] } } };
const worst = summary({ kind: 15, level: 100, rarity: 'Legendary', shiny: true, secret: true, mutation: 'crystal', sourcePack: 'x'.repeat(24) });
for (let i = 0; i < REPLAY_CAP + 3; i++) recordOpening(fancy, worst, 1900000000000 + i);
const fancyBytes = replaysSize(fancy);

test(`A full store of the fanciest cards stays under ${SIZE_BUDGET} bytes (${fancyBytes} bytes)`, () => {
  const list = fancy.ember.packReplays.list;
  assert.equal(list.length, REPLAY_CAP);
  assert.equal(list[0].cards.length, 5);
  assert.ok(fancyBytes <= SIZE_BUDGET, `save block is ${fancyBytes} bytes, budget is ${SIZE_BUDGET}`);
  assert.ok(fancyBytes > 0);
  assert.ok(JSON.stringify(fancy.ember.stats).length > 0, 'other save data is untouched');
});

test('The player turns over all five cards once, Reveal all finishes, Back leaves no trace', () => {
  let p = playerStart(5);
  assert.deepEqual(playerView(p), { step: 0, total: 5, revealed: 0, remaining: 5, atSummary: false });
  const visited = [];
  for (let i = 0; i < 5; i++) {
    const before = p.step;
    p = playerNext(p);
    assert.equal(p.step, before + 1, 'exactly one card per step');
    visited.push(before);
  }
  assert.deepEqual(visited, [0, 1, 2, 3, 4], 'each card is visited once, in order');
  assert.deepEqual(playerView(p), { step: 5, total: 5, revealed: 5, remaining: 0, atSummary: true });
  assert.deepEqual(playerNext(p), p, 'the last card is the end');

  const all = playerAll(playerStart(5));
  assert.deepEqual(all, p, 'Reveal all lands on the same summary state');
  assert.deepEqual(playerAll(playerNext(playerNext(playerStart(5)))), p);
  assert.equal(playerView(all).atSummary, true);

  assert.deepEqual(playerBack(p), playerStart(5), 'Back starts a fresh replay, face down');
  assert.deepEqual(playerBack(playerStart(5)), playerStart(5));
  assert.deepEqual(playerStart(0), { n: 0, step: 0 });
  assert.equal(playerView(playerStart(0)).atSummary, true);
});

test('Recording and replaying never touch cards, coins or pending packs', () => {
  const st = {
    coins: 420,
    owned: [creature(0), creature(1)],
    pendingPack: { id: 'pending-pack', packId: 'pack', ids: ['owned-card-0', 'owned-card-1'], revealed: 1 },
    ember: { stats: { packs: [['pack', 1, 0, 1]] }, cardOrigins: { 'owned-card-0': { at: 5, how: 'pack' } } }
  };
  const owned = JSON.parse(JSON.stringify(st.owned));
  const ember = JSON.parse(JSON.stringify(st.ember));

  const entry = recordOpening(st, summary({}), 7000);
  assert.ok(entry);
  let view = playerStart(entry.cards.length);
  for (let i = 0; i < 5; i++) view = playerNext(view);
  playerView(view);
  playerAll(view);
  playerBack(view);

  assert.deepEqual(st.owned, owned, 'owned cards are unchanged');
  assert.equal(st.coins, 420, 'coins are unchanged');
  assert.deepEqual(st.pendingPack, { id: 'pending-pack', packId: 'pack', ids: ['owned-card-0', 'owned-card-1'], revealed: 1 }, 'the pending pack is unchanged');
  assert.deepEqual(st.ember.stats, ember.stats, 'other records are unchanged');
  assert.deepEqual(st.ember.cardOrigins, ember.cardOrigins);
  assert.deepEqual(Object.keys(st).sort(), ['coins', 'ember', 'owned', 'pendingPack'], 'nothing new outside the packReplays block');
  assert.deepEqual(Object.keys(st.ember.packReplays), ['list'], 'only the additive block was created');
});

console.log(`${count} pack replay cases passed`);
