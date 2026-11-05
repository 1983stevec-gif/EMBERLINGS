// Weekly recap maths: ISO week keys, local Monday ranges, the weekly due check, coins earned and the week summary.
import assert from 'node:assert/strict';
import { isoWeek, weekRange, prevWeekRange, inRange, ensureRecap, autoOn, noteCoins, coinsEarned, coinTotal, summarize, newSpecies, wasActive, isDue } from '../public/weekly-recap.js';
import { encodeCard } from '../public/stats.js';

const D = (y, m, d, h = 12) => new Date(y, m - 1, d, h);

// ISO week keys, including the year edges.
assert.equal(isoWeek(D(2026, 11, 5)), '2026-W45');
assert.equal(isoWeek(D(2026, 11, 2, 0)), '2026-W45', 'Monday starts the week');
assert.equal(isoWeek(D(2026, 11, 1, 23)), '2026-W44', 'Sunday ends the week before');
assert.equal(isoWeek(D(2021, 1, 3)), '2020-W53', '3 Jan 2021 is in the last week of 2020');
assert.equal(isoWeek(D(2021, 1, 4)), '2021-W01');
assert.equal(isoWeek(D(2024, 12, 30)), '2025-W01', '30 Dec 2024 is in week 1 of 2025');
assert.equal(isoWeek(D(2026, 1, 1)), '2026-W01');
assert.equal(isoWeek(D(2027, 1, 1)), '2026-W53');
assert.equal(isoWeek(D(2028, 1, 2)), '2027-W52');

// Ranges: local Monday 00:00 to next Monday 00:00, for every day of a week.
for (let day = 2; day <= 8; day++) {
  const r = weekRange(D(2026, 11, day, day === 8 ? 23 : 9));
  assert.equal(r.key, '2026-W45');
  assert.equal(r.start, new Date(2026, 10, 2).getTime());
  assert.equal(r.end, new Date(2026, 10, 9).getTime());
}
const prev = prevWeekRange(D(2026, 11, 2, 0));
assert.equal(prev.key, '2026-W44'); assert.equal(prev.end, weekRange(D(2026, 11, 2)).start, 'last week ends where this week starts');
// Weeks across a clock change (late March / late October in Europe) still start at local midnight.
for (const d of [D(2026, 3, 30), D(2026, 10, 26), D(2026, 4, 1)]) {
  const r = weekRange(d), s = new Date(r.start), e = new Date(r.end);
  assert.equal(s.getDay(), 1); assert.equal(s.getHours(), 0); assert.equal(e.getDay(), 1); assert.equal(e.getHours(), 0);
  assert.ok(inRange(d.getTime(), r)); assert.ok(!inRange(r.end, r));
}
// Year change: the week of 28 Dec 2026 – 3 Jan 2027.
const ny = weekRange(D(2027, 1, 2));
assert.equal(ny.key, '2026-W53'); assert.equal(new Date(ny.start).getDate(), 28);

// Save block: additive, default on.
const st = { coins: 9, owned: [] };
const r = ensureRecap(st);
assert.deepEqual(st.ember.recap, { coins: [] }); assert.equal(st.coins, 9); assert.equal(autoOn(r), true);
r.auto = false; assert.equal(autoOn(r), false); delete r.auto;
r.lastShown = '2026-W44'; ensureRecap(st); assert.equal(st.ember.recap.lastShown, '2026-W44', 'existing data kept');

// Coins earned from first-visit snapshots.
assert.equal(coinTotal({ vault: 100, battleCoins: 50.4, dailyCoins: 250 }), 400);
assert.equal(coinTotal(undefined), 0);
assert.equal(noteCoins(r, '2026-W44', 1000), true);
assert.equal(noteCoins(r, '2026-W44', 1200), false, 'only the first visit of a week');
assert.equal(noteCoins(r, '2026-W45', 1750), true);
assert.equal(coinsEarned(r, '2026-W44', '2026-W45', 2000, false), 750, 'last week');
assert.equal(coinsEarned(r, '2026-W45', '2026-W45', 2000, true), 250, 'this week so far');
assert.equal(coinsEarned(r, '2026-W43', '2026-W44', 2000, false), null, 'unknown week');
for (let w = 46; w < 52; w++) noteCoins(r, '2026-W' + w, 2000 + w);
assert.equal(r.coins.length, 4, 'snapshots capped');

// Summary of one week from My Stats records.
const wk = weekRange(D(2026, 11, 3)), t = (d, h = 12) => Math.floor(D(2026, 11, d, h).getTime() / 1000);
const code = (kind, rarity, extra = {}) => encodeCard({ kind, rarity, ...extra });
const game = {
  owned: [{ id: 'a', kind: 1 }, { id: 'b', kind: 5 }, { id: 'c', kind: 7 }, { id: 'd', kind: 9 }],
  ember: {
    cardOrigins: { b: { at: D(2026, 11, 4).getTime(), how: 'pack' }, c: { at: D(2026, 10, 20).getTime(), how: 'pack' }, d: { at: D(2026, 11, 6).getTime(), how: 'trade' } },
    stats: {
      packs: [
        ['pack', t(1), 0, code(3, 'Common'), code(3, 'Rare'), code(1, 'Common'), code(1, 'Common'), code(1, 'Common')],   // last week
        ['star', t(3), 0, code(5, 'Uncommon'), code(3, 'Common'), code(2, 'Common'), code(2, 'Common'), code(2, 'Common')],
        ['crystal', t(4), 1, code(6, 'Mythic', { shiny: true }), code(3, 'Rare'), code(5, 'Rare'), code(2, 'Common'), code(2, 'Common')],
        ['pack', t(10), 0, code(12, 'Secret', { secret: true }), code(1, 'Common'), code(1, 'Common'), code(1, 'Common'), code(1, 'Common')] // next week
      ],
      battles: [
        ['q', 'W', t(1), 3, '1.3', 40, 1],
        ['q', 'W', t(2, 9), 4, '5.6', 30, 5],
        ['q', 'W', t(2, 10), 5, '5', 55, 5],
        ['b', 'L', t(3), 10, '5.6', 20, 6],
        ['f', 'D', t(4), 0, '6', 70, 6],
        ['q', 'W', t(5), 6, '5.2', 12, 5],
        ['q', 'W', t(6), 7, '6', 0, -1],
        ['q', 'W', t(7), 8, '6', 25, 6]
      ]
    }
  }
};
const sum = summarize(game, wk, { coins: 640, cheers: 3 });
assert.equal(sum.packs, 2); assert.equal(sum.cards, 10);
assert.deepEqual(sum.best.card, { kind: 6, rank: 3, mut: -1, shiny: true }); assert.equal(sum.best.pack, 'crystal');
assert.equal(sum.battles, 7); assert.equal(sum.wins, 5); assert.equal(sum.losses, 1); assert.equal(sum.draws, 1);
assert.equal(sum.bestStreak, 3, 'a draw neither adds to nor breaks the streak');
assert.deepEqual(sum.mvp, { kind: 6, battles: 5, hit: 70 }, 'most battles first');
assert.equal(sum.coins, 640); assert.equal(sum.cheers, 3);
// New species: 5, 6 and 2 first found this week (by pack), 9 by trade; 3 and 1 were found last week, 7 before records.
assert.deepEqual(sum.species, [5, 2, 6, 9], "in the order they were found");
assert.deepEqual(newSpecies(game, weekRange(D(2026, 11, 10))), [12]);
assert.equal(wasActive(sum), true);

// Tie on battles: the bigger hit wins MVP.
const tie = summarize({ ember: { stats: { packs: [], battles: [['q', 'W', t(3), 1, '4.8', 30, 4], ['q', 'L', t(4), 1, '4.8', 60, 8]] } } }, wk);
assert.equal(tie.mvp.kind, 8); assert.equal(tie.bestStreak, 1); assert.equal(tie.coins, null); assert.equal(tie.cheers, null);

// An empty week (or an old save without records) is not active, and summarize never throws.
const none = summarize({}, wk);
assert.equal(none.packs, 0); assert.equal(none.best, null); assert.equal(none.mvp, null); assert.deepEqual(none.species, []);
assert.equal(wasActive(none), false);
assert.equal(wasActive({ packs: 0, battles: 0, coins: 150 }), true, 'coins alone count as active');

// Due once per ISO week, only after an active week, and never when switched off.
const mon = D(2026, 11, 9, 8);
assert.equal(isDue({}, mon, sum), true);
assert.equal(isDue({ lastShown: '2026-W46' }, mon, sum), false, 'already shown this week');
assert.equal(isDue({ lastShown: '2026-W45' }, mon, sum), true);
assert.equal(isDue({ auto: false }, mon, sum), false, 'pop-up switched off');
assert.equal(isDue({}, mon, none), false, 'quiet week: no pop-up');

console.log('weekly-recap: ok');
