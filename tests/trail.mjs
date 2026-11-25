// Trail look pack (public/trail.js): stops, gates and the "Now entering" banner follow quest progress only, nothing is
// saved, every picture exists and is small, and every quest on the painted map has its own spot.
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { GUARDIANS, artFor, guardianArt, gateOpen, stopState, stopsFor, newIsland } from '../public/trail.js';
import { ISLANDS } from '../public/look-b.js';

const root = new URL('../', import.meta.url);
const at = f => new URL(f, root);
const read = f => readFileSync(at(f), 'utf8');
let n = 0;
const test = (name, f) => { f(); n++; console.log('PASS ' + name); };

test('each island ends with its Guardian, the same bosses as the boss intros', () => {
  assert.deepEqual(Object.keys(GUARDIANS).map(Number), ISLANDS.map(i => i.to));
  const intro = [...read('public/boss-intro.js').matchAll(/^ {2}(\d+): \{ art: '([a-z-]+)'/gm)].map(m => [m[1], m[2]]);
  assert.deepEqual(Object.entries(GUARDIANS), intro);
});

test('every picture exists and is small', () => {
  for (const i of ISLANDS) {
    const f = at('public' + artFor(i.from));
    assert.ok(existsSync(f), i.id);
    assert.ok(statSync(f).size < 90 * 1024, i.id + ' size');
  }
  for (const level of Object.keys(GUARDIANS)) assert.ok(existsSync(at('public' + guardianArt(+level))), level);
  assert.equal(artFor(0), '');
  assert.equal(guardianArt(11), '');
});

test('stops are done, ready or locked', () => {
  assert.equal(stopState(3, [1, 2, 3], 4), 'done');
  assert.equal(stopState(4, [1, 2, 3], 4), 'ready');
  assert.equal(stopState(5, [1, 2, 3], 4), 'locked');
  assert.equal(stopState(1, undefined, 1), 'ready');
  const stops = stopsFor(12, [10, 11], 12);
  assert.equal(stops.length, 15);
  assert.deepEqual(stops.slice(0, 3).map(s => [s.level, s.state]), [[11, 'done'], [12, 'ready'], [13, 'locked']]);
  assert.deepEqual(stops.filter(s => s.guardian).map(s => s.level), [25]);
  assert.deepEqual(stopsFor(0, [], 1), []);
});

test('a gate opens only when its own Guardian is cleared', () => {
  assert.equal(gateOpen([1, 2, 10], 10), true);
  assert.equal(gateOpen([1, 2, 9], 10), false);
  assert.equal(gateOpen(null, 10), false);
});

test("the banner shows only after a Guardian's first defeat", () => {
  const fight = { id: 'a', level: 10, before: false }, win = { id: 'a', victory: true, level: 10 };
  assert.equal(newIsland(fight, win).island.id, 'crystalwood');
  assert.equal(newIsland(fight, win).gate, 10);
  assert.equal(newIsland(fight, win).done, false);
  assert.equal(newIsland({ ...fight, before: true }, win), null, 'replay');
  assert.equal(newIsland(fight, { ...win, victory: false }), null, 'lost');
  assert.equal(newIsland(fight, { ...win, id: 'b' }), null, 'another battle');
  assert.equal(newIsland({ ...fight, level: 9 }, win), null, 'not a Guardian');
  assert.equal(newIsland(null, win), null);
  assert.equal(newIsland(fight, null), null);
  const last = newIsland({ id: 'a', level: 100, before: false }, win);
  assert.deepEqual([last.island.id, last.done], ['shadow', true]);
});

test('nothing is saved and progress is never changed', () => {
  const src = read('public/trail.js');
  assert.doesNotMatch(src, /B\.save|localStorage|sessionStorage|state\.ember\s*=|cleared\.push|state\.\w+\s*=[^=]/);
  const cleared = Object.freeze([1, 2, 3]);
  stopsFor(3, cleared, 4);
});

test('every quest on the painted map has a spot of its own', () => {
  const src = read('public/ui-exact.js');
  const code = src.slice(src.indexOf('const MEADOW'), src.indexOf('let selected'));
  const game = { regions: ISLANDS.map(i => [i.name, i.from, i.to]) };
  const levelPos = new Function('B', code + '; return levelPos;')(game);
  for (const i of ISLANDS) {
    const spots = [];
    for (let l = i.from; l <= i.to; l++) spots.push(levelPos(l));
    for (let a = 0; a < spots.length; a++) for (let b = a + 1; b < spots.length; b++) {
      const d = Math.hypot(spots[a][0] - spots[b][0], spots[a][1] - spots[b][1]);
      assert.ok(d > 34, `quests ${i.from + a} and ${i.from + b} are ${d.toFixed(0)} apart`);
    }
    if (i.from > 45) for (const [x, y] of spots) assert.ok(x > 210 && x < 1120 && y > 230 && y < 780, `${i.id} ${x},${y} on the sheet`);
  }
});

test('the loading scene follows saved progress and survives a missing or odd save', () => {
  const html = read('game/index.html'), m = /m=(\/"cleared".*?)\.exec\(raw\|\|''\),n=(.*?),u='/.exec(html);
  assert.ok(m);
  const pick = new Function('raw', `var m=${m[1]}.exec(raw||''),n=${m[2]};return n`);
  assert.equal(pick(null), 1);
  assert.equal(pick('{"cleared":[]}'), 1);
  assert.equal(pick('{"cleared":[1,2,3]}'), 4);
  assert.equal(pick('{"cleared":[99,100,1]}'), 100);
  assert.equal(pick('not a save'), 1);
});

console.log(`trail: ${n} checks passed`);
