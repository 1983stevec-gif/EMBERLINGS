// Interactive rules demo: the practice match is repeatable, every guided step is legal in order,
// the steps only name real cards, and the Help answer points at a screen that exists.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DEMO_POOLS, DEMO_STEPS, buildDemoMatch, applyStep, playChallenger } from '../public/rules-demo.js';
import { ANSWERS } from '../public/help-data.js';
import { target } from '../public/help.js';

let n = 0;
const test = (name, f) => { f(); n++; console.log('PASS ' + name); };
const rng = () => 0.5;

// The runtime's loop: one guided step, then the challenger answers with its own chooser.
function guidedTurn() {
  const s = buildDemoMatch(rng);
  let now = 1;
  for (let i = 0; i < DEMO_STEPS.length; i++) {
    applyStep(s, i, 0, now, rng);
    playChallenger(s, now, rng);
    now += 1000;
  }
  return s;
}

test('the practice match is the same every time it is built', () => {
  const a = buildDemoMatch(rng), b = buildDemoMatch(rng);
  assert.deepEqual(a, b);
  assert.equal(a.sides.length, 2);
  assert.equal(a.sides[0].hand.length, 5);
  assert.equal(a.sides[1].hand.length, 5);
  assert.equal(a.first, 1, 'the fixed opening coin gives the challenger the first turn');
  assert.equal(a.phase, 'setup');
});

test('every guided step is legal in order and the challenger answers between them', () => {
  const s = guidedTurn();
  assert.equal(s.result, null, 'the practice turn ends with the battle still open');
  assert.equal(s.phase, 'turn');
  assert.equal(s.turn, 0, 'the last challenger reply hands the turn back to you');
  assert.equal(s.turnNumber, 6, 'three turns each');
  assert.deepEqual([s.sides[0].points, s.sides[1].points], [0, 0], 'no knockouts, so no points');
  const you = s.sides[0].cards.find(c => c.id === s.sides[0].active);
  const foe = s.sides[1].cards.find(c => c.id === s.sides[1].active);
  assert.equal(you.hp, 38, 'two challenger basic attacks landed on your Fire Active');
  assert.equal(foe.hp, 54, 'your guided attack landed once');
  assert.equal(you.energies.length, 1, 'the attached Merfling stays on the Active after attacking');
  assert.ok(you.maxhp > 0 && foe.maxhp > 0);
});

test('the demo keeps no shared state: pools and a second build are untouched', () => {
  const pools = structuredClone(DEMO_POOLS);
  const first = buildDemoMatch(rng);
  const snapshot = structuredClone(first);
  const second = buildDemoMatch(rng);
  guidedTurnUsing(first);
  assert.deepEqual(second, snapshot, 'a fresh build still equals the saved structure');
  assert.deepEqual(DEMO_POOLS, pools, 'the demo never changes its pools');
});

test('the steps only name cards that are in the practice match and from the demo pools', () => {
  const s = buildDemoMatch(rng);
  const ids = new Set([...s.sides[0].cards, ...s.sides[1].cards].map(c => c.id));
  const poolIds = new Set([...DEMO_POOLS[0], ...DEMO_POOLS[1]].map(c => c.id));
  const named = DEMO_STEPS.flatMap(st => [st.action.cardId, st.action.targetId]).filter(Boolean);
  assert.ok(named.length >= 3, 'the steps name the Active, the Bench card and the attach target');
  for (const id of named) assert.ok(ids.has(id), 'step card ' + id + ' exists in the practice match');
  for (const side of s.sides) for (const c of side.cards) {
    assert.ok(poolIds.has(c.cardType === 'trainer' ? c.id : c.sourceId || c.ownedId), 'card ' + c.id + ' comes from a demo pool');
  }
  assert.ok(DEMO_STEPS.every(st => st.title && st.rule && st.action && st.action.type), 'every step has a title, a rule and an action');
});

test('the Help answer about practice points at the demo screen', () => {
  const html = fs.readFileSync('game/index.html', 'utf8');
  const mods = fs.readdirSync('public').filter(f => f.endsWith('.js')).map(f => fs.readFileSync('public/' + f, 'utf8')).join('\n');
  const all = html + '\n' + mods;
  const views = new Set();
  for (const re of [/view='([A-Za-z]+)'/g, /go\('([A-Za-z]+)'\)/g, /data-go="([A-Za-z]+)"/g, /registerView\('([A-Za-z]+)'/g]) for (const m of all.matchAll(re)) views.add(m[1]);
  const entry = ANSWERS.find(a => a.id === 'battle-practice');
  assert.ok(entry, 'the practice answer is in the Help data');
  assert.equal(entry.cat, 'battles');
  assert.ok(entry.q.endsWith('?'), 'the question ends with a question mark');
  assert.ok(entry.a.length >= 20 && entry.a.length <= 420, 'the answer is a readable length');
  assert.ok(!/[<>]/.test(entry.q + entry.a), 'plain text only');
  const t = target(entry.to);
  assert.equal(t.kind, 'view', 'the target is a screen');
  assert.ok(views.has(t.id), 'the demo screen is registered by rules-demo.js');
  assert.equal(entry.to, 'rulesDemo');
});

// Same loop as guidedTurn(), for a match that already exists.
function guidedTurnUsing(s) {
  let now = 1;
  for (let i = 0; i < DEMO_STEPS.length; i++) {
    applyStep(s, i, 0, now, rng);
    playChallenger(s, now, rng);
    now += 1000;
  }
  return s;
}

console.log(n + ' rules-demo cases passed');
