// Collection milestones maths: completion of species, rarity sets and mutation sets, quiet first-run seeding,
// detecting new completions only once, and the "next closest" order.
import assert from 'node:assert/strict';
import { milestoneList, detect, nextClosest, earnedList } from '../public/milestones.js';
import { collectionStats, SLOTS_PER_SPECIES } from '../public/collection.js';
import { RARITIES, MUTATIONS } from '../public/combat-rules.js';

const N = 16, names = Array.from({ length: N }, (_, k) => 'S' + k);
let uid = 0;
const card = (kind, extra = {}) => ({ id: 'c' + uid++, kind, rarity: 'Common', ...extra });
// Every slot for one species: each rarity (Secret is a flag), each mutation and a Shiny.
const fullSpecies = kind => [
  ...RARITIES.slice(0, -1).map(r => card(kind, { rarity: r })), card(kind, { rarity: 'Legendary', secret: true }),
  ...MUTATIONS.map(m => card(kind, { mutation: m.id })), card(kind, { shiny: true })
];
const listFor = owned => milestoneList(collectionStats(owned, [], N), names);
const byId = (list, id) => list.find(m => m.id === id);

// Shape: 16 species + 7 rarity sets + 12 mutation sets.
const empty = listFor([]);
assert.equal(empty.length, N + RARITIES.length + MUTATIONS.length);
assert.ok(empty.every(m => !m.done));
assert.equal(byId(empty, 'species-0').total, SLOTS_PER_SPECIES);
assert.equal(byId(empty, 'rarity-legendary').total, N);
assert.equal(byId(empty, 'mutation-spark').name, 'Spark set');

// A complete species uses the Collection page's own definition (every slot filled).
const one = listFor(fullSpecies(3));
assert.equal(byId(one, 'species-3').done, true);
assert.equal(byId(one, 'species-3').have, SLOTS_PER_SPECIES);
assert.equal(byId(one, 'species-3').name, 'S3 complete');
assert.equal(byId(one, 'species-4').done, false);
// Missing the Shiny means not complete.
const noShiny = listFor(fullSpecies(3).filter(c => !c.shiny));
assert.equal(byId(noShiny, 'species-3').done, false);
assert.equal(byId(noShiny, 'species-3').have, SLOTS_PER_SPECIES - 1);

// Rarity set: a Legendary of every species. 15 is not enough.
const leg15 = Array.from({ length: 15 }, (_, k) => card(k, { rarity: 'Legendary' }));
assert.equal(byId(listFor(leg15), 'rarity-legendary').have, 15);
assert.equal(byId(listFor(leg15), 'rarity-legendary').done, false);
const leg16 = [...leg15, card(15, { rarity: 'Legendary' })];
assert.equal(byId(listFor(leg16), 'rarity-legendary').done, true);
// A Secret card counts as Secret, not as its printed rarity.
const sec = Array.from({ length: N }, (_, k) => card(k, { rarity: 'Legendary', secret: true }));
assert.equal(byId(listFor(sec), 'rarity-secret').done, true);
assert.equal(byId(listFor(sec), 'rarity-legendary').done, false);

// Mutation set: Spark on every species (all Legendary, so the Legendary set is complete too).
const spark = Array.from({ length: N }, (_, k) => card(k, { rarity: 'Legendary', mutation: 'spark' }));
assert.equal(byId(listFor(spark), 'mutation-spark').done, true);
assert.equal(byId(listFor(spark), 'mutation-bloom').done, false);

// First run: everything already complete is recorded quietly, nothing is celebrated.
const t0 = 1_700_000_000_000;
const first = detect(undefined, listFor(leg16), t0);
assert.equal(first.seeded, true); assert.equal(first.changed, true); assert.deepEqual(first.fresh, []);
assert.equal(first.data.earned['rarity-legendary'], t0);
assert.equal(Object.keys(first.data.earned).length, 1);
// An empty new player is seeded with an empty list (and is not seeded again later).
const fresh0 = detect({}, empty, t0);
assert.equal(fresh0.seeded, true); assert.deepEqual(fresh0.data.earned, {});
assert.equal(detect(fresh0.data, empty, t0).changed, false);

// Next check: a newly finished set is fresh once, then never again.
const owned2 = [...leg16, ...spark];
const second = detect(first.data, listFor(owned2), t0 + 1000);
assert.deepEqual(second.fresh.map(m => m.id), ['mutation-spark']);
assert.equal(second.data.earned['mutation-spark'], t0 + 1000);
assert.equal(second.data.earned['rarity-legendary'], t0, 'old dates are kept');
assert.equal(first.data.earned['mutation-spark'], undefined, 'saved data is not changed in place');
const third = detect(second.data, listFor(owned2), t0 + 2000);
assert.equal(third.changed, false); assert.deepEqual(third.fresh, []);
// Trading the cards away keeps the milestone earned, and finishing again does not celebrate twice.
assert.equal(detect(second.data, listFor(leg16), t0 + 3000).changed, false);
assert.equal(detect(second.data, listFor(owned2), t0 + 4000).fresh.length, 0);
// Bad saved data counts as a first run (quiet).
assert.equal(detect({ earned: [] }, listFor(owned2), t0).seeded, true);
assert.equal(detect({ earned: null }, listFor(owned2), t0).fresh.length, 0);
// Other keys in the saved object are kept.
assert.equal(detect({ earned: {}, extra: 1 }, listFor(spark), t0).data.extra, 1);

// Several at once (a big pack or trade) are all fresh together.
const multi = detect({ earned: {} }, listFor([...fullSpecies(0), ...spark]), t0);
assert.deepEqual(multi.fresh.map(m => m.id).sort(), ['mutation-spark', 'rarity-legendary', 'species-0']);

// Earned list: newest first, with dates; unknown ids are skipped.
const got = earnedList(listFor(owned2), { ...second.data.earned, 'future-thing': t0 + 9 });
assert.deepEqual(got.map(m => m.id), ['mutation-spark', 'rarity-legendary']);
assert.equal(got[0].at, t0 + 1000);

// Next closest: highest share done first, earned ones left out, ties go to fewer pieces left.
const near = [...leg15, ...Array.from({ length: 10 }, (_, k) => card(k, { rarity: 'Legendary', mutation: 'tide' })), ...fullSpecies(5).filter(c => !c.shiny)];
const nl = listFor(near), nc = nextClosest(nl, {}, 3);
assert.equal(nc.length, 3);
assert.deepEqual(nc.map(m => m.id), ['species-5', 'rarity-legendary', 'mutation-tide']);
assert.ok(nc[0].have / nc[0].total >= nc[1].have / nc[1].total);
// Already earned (even if no longer complete) never shows as next.
assert.ok(!nextClosest(nl, { 'species-5': t0 }, 3).some(m => m.id === 'species-5'));
// Done ones never show.
assert.ok(!nextClosest(listFor(owned2), {}, 40).some(m => m.done));
// A completed collection has nothing next.
const all = Array.from({ length: N }, (_, k) => fullSpecies(k)).flat();
const allList = listFor(all);
assert.ok(allList.every(m => m.done));
assert.deepEqual(nextClosest(allList, {}, 3), []);

console.log('milestones: ok');
