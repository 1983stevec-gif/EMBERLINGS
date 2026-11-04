// Collection tracker maths: slot counting, completion %, hints from real pack data and goal ordering.
import assert from 'node:assert/strict';
import { collectionStats, collectionGoals, whereFrom, SLOTS_PER_SPECIES, FORMS } from '../public/collection.js';
import { RARITIES, MUTATIONS } from '../public/combat-rules.js';

// Same shape as the game's pack list (game/index.html packCatalog).
const packs = [
  { id: 'pack', name: 'Wonder Pack', kinds: [8, 2, 1, 4, 9, 10], shiny: .10, secret: 0, rarity: 'Common', cost: 150 },
  { id: 'star', name: 'Star Pack', kinds: [0, 1, 2, 4, 5, 6, 7, 8, 9, 11], shiny: .25, secret: .05, rarity: 'Uncommon', cost: 350 },
  { id: 'crystal', name: 'Crystal Pack', kinds: [5, 6, 7, 12], shiny: .30, secret: .07, rarity: 'Rare', cost: 750 },
  { id: 'mythic', name: 'Mythic Pack', kinds: [5, 6, 7, 13], shiny: .45, secret: .12, rarity: 'Mythic', cost: 1500 },
  { id: 'legend', name: 'Legend Pack', kinds: [5, 7, 14], shiny: .65, secret: .25, rarity: 'Legendary', cost: 3000 },
  { id: 'celestial', name: 'Celestial Pack', kinds: [12, 13, 14], shiny: 1, secret: .40, rarity: 'Celestial', cost: 6000 },
  { id: 'hacker', name: 'Hacker Pack', kinds: [3, 15, 5, 7, 6, 8], shiny: 1, secret: .40, rarity: 'Celestial', cost: 600000 }
];
const names = Array.from({ length: 16 }, (_, k) => 'S' + k);
assert.equal(SLOTS_PER_SPECIES, FORMS.length + RARITIES.length + MUTATIONS.length + 1);

// Fresh player: nothing found, discovery leads.
const fresh = collectionStats([], [], 16);
assert.equal(fresh.filled, 0); assert.equal(fresh.percent, 0); assert.equal(fresh.total, 16 * SLOTS_PER_SPECIES);
const g0 = collectionGoals(fresh, packs, names.map(() => null));
assert.equal(g0[0].id, 'discover'); assert.equal(g0[0].left, 16);
assert.equal(g0[0].missing[0].label, "No. 001 (not found yet)");

// One Flaminyx (kind 0): Common, shiny, Spark mutation. Forms Basic/Ascended/Apex, no Radiant.
const one = collectionStats([{ id: 'a', kind: 0, rarity: 'Common', shiny: true, mutation: 'spark' }], [0], 16);
const s0 = one.species[0];
assert.deepEqual(s0.forms.map(Boolean), [true, true, true, false]);
assert.equal(s0.filled, 3 + 1 + 1 + 1);
assert.equal(one.filled, 6); assert.equal(one.parts.species.have, 1); assert.equal(one.parts.shiny.have, 1);

// Secret flag counts as the Secret rarity and unlocks Radiant forms; bad entries are ignored.
const sec = collectionStats([{ kind: 5, rarity: 'Rare', secret: true }, null, { kind: 99 }, { kind: '3' }], [], 16);
assert.equal(sec.species[5].rarities[6], 1); assert.equal(sec.species[5].rarities[2], 0); assert.equal(sec.species[5].forms[3], 1);
assert.equal(sec.filled, 3 + 1 + 1);

// Hints use real pack data.
assert.deepEqual(whereFrom({ type: 'rarity', i: 1 }, 0, packs), ['Star Pack']);
assert.match(whereFrom({ type: 'rarity', i: 0 }, 0, packs)[0], /Fusion Lab/); // no pack has Common Flaminyx
assert.deepEqual(whereFrom({ type: 'rarity', i: 6 }, 5, packs), ['Legend Pack (25%)', 'Hacker Pack (40%)', 'Crystal Pack (7%)', 'Mythic Pack (12%)', 'Star Pack (5%)'].sort((a, b) => parseInt(b.match(/\d+/)) - parseInt(a.match(/\d+/))));
const prism = MUTATIONS.findIndex(m => m.id === 'prism');
assert.deepEqual(whereFrom({ type: 'mutation', i: prism }, 15, packs), ['Hacker Pack']); // pack only, Hacker reaches Prism
assert.deepEqual(whereFrom({ type: 'mutation', i: prism }, 0, packs), []); // no pack can roll Prism on Flaminyx
const sparkWhere = whereFrom({ type: 'mutation', i: 1 }, 0, packs);
assert(sparkWhere.some(w => /Mutation Vault/.test(w)));
for (const m of MUTATIONS.filter(m => m.packOnly)) for (let k = 0; k < 16; k++) assert(!whereFrom({ type: 'mutation', i: MUTATIONS.indexOf(m) }, k, packs).some(w => /Vault/.test(w)), m.id + ' must stay pack only');
assert.deepEqual(whereFrom({ type: 'form', i: 3 }, 14, packs), ['Legend Pack', 'Celestial Pack']);

// Goals: closest first, one per species, cross-species sets included.
const owned = [];
for (let i = 0; i < 6; i++) owned.push({ kind: 0, rarity: RARITIES[i], mutation: MUTATIONS[i].id, shiny: i === 0 }); // Flaminyx: 6/7 rarities
for (let k = 0; k < 16; k++) if (k !== 3) owned.push({ kind: k, rarity: 'Common', mutation: 'prism' }); // Prism on 15/16
const big = collectionStats(owned, [], 16), goals = collectionGoals(big, packs, names, 20);
assert.equal(goals[0].left, 1);
const ids = goals.map(g => g.id);
assert(ids.includes('rar-0')); assert(ids.includes('set-prism'));
const ps = goals.find(g => g.id === 'set-prism');
assert.equal(ps.text, '1 more mutation for a Prism set'); assert.equal(ps.packOnly, true); assert.deepEqual(ps.missing[0].where, ['Hacker Pack']);
assert.equal(goals.find(g => g.id === 'rar-0').text, '1 rarity away from every S0 rarity');
assert.equal(new Set(goals.filter(g => !g.cross).map(g => g.kind)).size, goals.filter(g => !g.cross).length);
// Goals you can actually finish come before ones that need something no pack offers.
for (let i = 1; i < goals.length; i++) assert(goals[i - 1].blocked <= goals[i].blocked);
const open = goals.filter(g => !g.blocked && g.have > 0);
for (let i = 1; i < open.length; i++) assert(open[i - 1].left <= open[i].left);
// Varied: no more than two goals of one kind in the default top six.
const top = collectionGoals(big, packs, names), groups = {};
for (const g of top) groups[g.id.replace(/-.*$/, '')] = (groups[g.id.replace(/-.*$/, '')] || 0) + 1;
assert(Object.values(groups).every(v => v <= 2), JSON.stringify(groups));

// Large collections stay fast: 20,000 cards.
const many = Array.from({ length: 20000 }, (_, i) => ({ kind: i % 16, rarity: RARITIES[Math.floor(i / 16) % 6], secret: i % 97 === 0, shiny: i % 13 === 0, mutation: Math.floor(i / 192) % 2 ? null : MUTATIONS[Math.floor(i / 16) % 12].id }));
const t0 = performance.now(), st = collectionStats(many, [], 16); collectionGoals(st, packs, names); const ms = performance.now() - t0;
assert.equal(st.filled, st.total); assert.equal(st.percent, 100);
assert(ms < 200, 'too slow: ' + ms);
console.log(`PASS collection tracker: slots, completion %, pack hints, pack-only mutations, goal order, 20,000 cards in ${ms.toFixed(1)}ms`);
