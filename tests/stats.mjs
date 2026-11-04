// My Stats maths: card codes, pack/battle recording, de-duplication, caps, luck meter and save size.
import assert from 'node:assert/strict';
import { encodeCard, decodeCard, ensureStats, recordPack, recordBattle, luck, luckVerdict, battleTotals, mostUsed, favouriteElement, statsSize, PACK_CAP, BATTLE_CAP } from '../public/stats.js';

// Same shape as the game's pack list (game/index.html packCatalog).
const packs = [
  { id: 'pack', name: 'Wonder Pack', cost: 150, shiny: .10, secret: 0, rarity: 'Common' },
  { id: 'star', name: 'Star Pack', cost: 350, shiny: .25, secret: .05, rarity: 'Uncommon' },
  { id: 'crystal', name: 'Crystal Pack', cost: 750, shiny: .30, secret: .07, rarity: 'Rare' },
  { id: 'mythic', name: 'Mythic Pack', cost: 1500, shiny: .45, secret: .12, rarity: 'Mythic' },
  { id: 'legend', name: 'Legend Pack', cost: 3000, shiny: .65, secret: .25, rarity: 'Legendary' }
];

// Card codes round-trip.
const c = { kind: 13, rarity: 'Rare', secret: true, shiny: true, mutation: 'prism' };
assert.deepEqual(decodeCard(encodeCard(c)), { kind: 13, rank: 6, mut: 11, shiny: true });
assert.deepEqual(decodeCard(encodeCard({ kind: 0, rarity: 'Common' })), { kind: 0, rank: 0, mut: -1, shiny: false });

// Old save: no ember block at all. ensureStats adds without touching anything else, and keeps existing data.
const st = { coins: 5, packCount: 7, owned: [] };
const s = ensureStats(st, 1000);
assert.equal(st.coins, 5); assert.equal(s.since, 1000); assert.equal(s.base.packCount, 7);
s.packs.push(['pack', 1, 0, 0]);
assert.equal(ensureStats(st, 2000).packs.length, 1, 'existing history kept');
s.packs.length = 0;

// A Wonder pack (bought) and a free Star pack, with de-duplication by key.
const five = (kind, rarity, extra = {}) => Array.from({ length: 5 }, () => ({ kind, rarity, ...extra }));
assert.equal(recordPack(s, packs[0], 0, five(8, 'Common'), { key: 'p:a' }), true);
assert.equal(recordPack(s, packs[0], 0, five(8, 'Common'), { key: 'p:a' }), false, 'same pack only once');
assert.equal(recordPack(s, packs[1], 1, [...five(1, 'Uncommon').slice(0, 4), { kind: 5, rarity: 'Uncommon', secret: true, shiny: true }], { key: 'p:b', free: true }), true);
const a = s.agg;
assert.deepEqual(a.packs.pack, [1, 0, 150]); assert.deepEqual(a.packs.star, [1, 1, 0]);
assert.equal(a.cards, 10); assert.equal(a.rar[0], 5); assert.equal(a.rar[1], 4); assert.equal(a.rar[6], 1);
assert.equal(a.exp[0], 5); assert.equal(a.exp[1], 4.75); assert.equal(a.exp[6], 0.25);
assert.equal(a.eShiny, 0.5 + 1.25); assert.equal(a.shiny, 1);
assert.equal(a.eMut, 0.15, 'free reward packs roll no mutation, so no expected mutation');
assert.equal(a.leg, 1); assert.equal(a.eLeg, 0.25);
assert.equal(a.dryBest, 9); assert.equal(a.dry, 0, 'the secret ended the dry streak');
assert.equal(decodeCard(a.best[0]).rank, 6); assert.equal(a.best[1], 'star');

// Luck: specials (shiny + secret + mutation) vs expected.
const L = luck(a);
assert.equal(L.got, 2); assert.ok(Math.abs(L.exp - (1.75 + 0.25 + 0.15)) < 1e-9);
assert.ok(Math.abs(L.ratio - 2 / 2.15) < 1e-9); assert.equal(L.verdict.id, 'unlucky');
assert.equal(luckVerdict(1, 0.2).id, 'early'); assert.equal(luckVerdict(1.3, 5).id, 'vlucky'); assert.equal(luckVerdict(1, 5).id, 'even'); assert.equal(luckVerdict(0.5, 5).id, 'vunlucky');

// Battles: modes, streaks, usage, biggest hit, coins, de-duplication.
assert.equal(recordBattle(s, { mode: 'q', result: 'W', level: 3, kinds: [0, 0, 4], hit: { dmg: 40, kind: 0 }, coins: 120, key: 'b:1' }), true);
assert.equal(recordBattle(s, { mode: 'q', result: 'W', level: 3, kinds: [0], key: 'b:1' }), false);
recordBattle(s, { mode: 'b', result: 'W', level: 10, kinds: [0, 13], hit: { dmg: 96, kind: 13 }, coins: 500, key: 'b:2' });
recordBattle(s, { mode: 'f', result: 'D', kinds: [4] });
recordBattle(s, { mode: 'f', result: 'L', kinds: [4], hit: { dmg: 200, kind: 4 } });
recordBattle(s, { mode: 'q', result: 'W', level: 4, kinds: [0] });
assert.equal(recordBattle(s, { mode: 'x', result: 'W' }), false);
const bt = battleTotals(a);
assert.deepEqual([bt.wins, bt.losses, bt.draws, bt.played], [3, 1, 1, 5]); assert.equal(bt.rate, 0.6);
assert.deepEqual(a.battles.q, [2, 0, 0]); assert.deepEqual(a.battles.b, [1, 0, 0]); assert.deepEqual(a.battles.f, [0, 1, 1]);
assert.equal(a.streak, 1); assert.equal(a.bestStreak, 2, 'a draw does not break a streak, a loss does');
assert.deepEqual(mostUsed(a, 2), [{ kind: 0, n: 3 }, { kind: 4, n: 3 }]);
assert.deepEqual(favouriteElement(a, k => ({ 0: 'Fire', 4: 'Water', 13: 'Fire' })[k]), { element: 'Fire', n: 4 });
assert.equal(a.hit[0], 200); assert.equal(a.hit[1], 4); assert.equal(a.battleCoins, 620);

// Caps and size: a very long history stays within the caps and under ~50 KB, while lifetime totals keep counting.
const big = ensureStats({}, 0);
for (let i = 0; i < PACK_CAP + 250; i++) recordPack(big, packs[i % 5], i % 5, five(i % 16, packs[i % 5].rarity, { shiny: i % 3 === 0, mutation: i % 7 === 0 ? 'storm' : null }), { key: 'p:' + i, now: 1.79e12 + i * 6e4 });
for (let i = 0; i < BATTLE_CAP + 200; i++) recordBattle(big, { mode: 'qbf'[i % 3], result: 'WLD'[i % 3], level: 1 + i % 100, kinds: [i % 16, (i + 3) % 16, (i + 7) % 16, (i + 9) % 16], hit: { dmg: 50 + i % 90, kind: i % 16 }, coins: 100, key: 'b:' + i, now: 1.79e12 + i * 6e4 });
assert.equal(big.packs.length, PACK_CAP); assert.equal(big.battles.length, BATTLE_CAP);
assert.equal(Object.values(big.agg.packs).reduce((n, r) => n + r[0], 0), PACK_CAP + 250);
assert.equal(battleTotals(big.agg).played, BATTLE_CAP + 200);
assert.ok(big.keys.length <= 40);
assert.ok(statsSize(big) < 50000, `stats size ${statsSize(big)} bytes`);
console.log(`stats tests passed (big history: ${statsSize(big)} bytes)`);
