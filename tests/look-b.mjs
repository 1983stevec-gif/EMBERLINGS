// Look pack B (public/look-b.js) and the picture card backs: island scenes follow the game's own level ranges,
// only the player's own quest battle gets one, old saves are never written to, and every picture exists and is small.
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { ISLANDS, islandFor, scenesOn, sceneFor, SPOTS, spotStyle } from '../public/look-b.js';
import { CARD_BACKS, CARD_BACK_IDS, achievementFor } from '../public/profile-items.js';

const root = new URL('../', import.meta.url);
const at = f => new URL(f, root);
const read = f => readFileSync(at(f), 'utf8');
let n = 0;
const test = (name, f) => { f(); n++; console.log('PASS ' + name); };

test('the islands match the regions in the game', () => {
  const block = /regions=(\[\[[\s\S]*?\]\])/.exec(read('game/index.html'));
  assert.ok(block, 'regions list found');
  const regions = [...block[1].matchAll(/\[(['"])([^'"]+)\1,(\d+),(\d+)/g)].map(m => [m[2], +m[3], +m[4]]);
  assert.deepEqual(ISLANDS.map(i => [i.name, i.from, i.to]), regions);
});

test('every quest level has one island and nothing else does', () => {
  for (let l = 1; l <= 100; l++) assert.equal(ISLANDS.filter(i => l >= i.from && l <= i.to).length, 1, 'level ' + l);
  assert.equal(islandFor(1).id, 'meadows');
  assert.equal(islandFor(10).id, 'meadows');
  assert.equal(islandFor(11).id, 'crystalwood');
  assert.equal(islandFor(45).id, 'peaks');
  assert.equal(islandFor(46).id, 'thunder');
  assert.equal(islandFor(100).id, 'shadow');
  for (const bad of [0, 101, -1, 2.5, '5', null, undefined, NaN]) assert.equal(islandFor(bad), null, String(bad));
});

test("only the player's own quest battle gets a scene", () => {
  const match = {}, st = { cardBattle: { level: 30, match } };
  assert.equal(sceneFor(st, match), 'peaks');
  assert.equal(sceneFor(st, {}), null, 'a friend battle while a quest waits');
  assert.equal(sceneFor({}, match), null);
  assert.equal(sceneFor(null, match), null);
  assert.equal(sceneFor(st, null), null);
  assert.equal(sceneFor({ cardBattle: { match } }, match), null, 'no level');
});

test('scenes are on for old saves, can be turned off, and reading never writes', () => {
  const match = {}, old = { coins: 5, ember: { muted: true }, cardBattle: { level: 1, match } };
  const before = JSON.stringify(old);
  assert.equal(scenesOn(old), true);
  assert.equal(scenesOn({}), true);
  assert.equal(scenesOn(undefined), true);
  assert.equal(sceneFor(old, match), 'meadows');
  assert.equal(JSON.stringify(old), before);
  old.ember.battleScenes = { on: false };
  assert.equal(scenesOn(old), false);
  assert.equal(sceneFor(old, match), null);
});

test('the scene stays inside the painted board', () => {
  for (const [W, H, x, y, w, h] of Object.values(SPOTS)) assert.ok(x >= 0 && y >= 0 && x + w <= W && y + h <= H);
  assert.equal(spotStyle([200, 100, 20, 10, 100, 50]), 'left:10.000%;top:10.000%;width:50.000%;height:50.000%');
});

test('every scene and card back picture exists and is small', () => {
  const files = ISLANDS.flatMap(i => ['', '-wide', '-tab'].map(k => `public/art/battle-bg/${i.id}${k}.webp`));
  const src = read('public/cosmetics.js'), pics = /PICTURES = Object\.fromEntries\(\[(.*?)\]\.map/.exec(src);
  assert.ok(pics, 'picture backs found');
  const ids = [...pics[1].matchAll(/'([a-z]+)'/g)].map(m => m[1]);
  assert.equal(ids.length, 4);
  for (const id of ids) { assert.ok(CARD_BACK_IDS.includes(id), 'the server accepts ' + id); files.push(`public/art/card-backs/${id}.webp`); }
  for (const f of files) { assert.ok(existsSync(at(f)), 'missing ' + f); assert.ok(statSync(at(f)).size < 130000, f + ' is too big'); }
});

test('card backs are unique and unlocked by real achievements', () => {
  assert.equal(new Set(CARD_BACK_IDS).size, CARD_BACKS.length);
  assert.equal(CARD_BACKS.filter(b => !b.need).length, 1, 'only the first back is free from the start');
  for (const b of CARD_BACKS) if (b.need) assert.ok(achievementFor(b.need), b.id + ' needs ' + b.need);
});

console.log(`look-b: ${n} tests passed`);
