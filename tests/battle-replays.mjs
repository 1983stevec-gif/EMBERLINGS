// Battle replays: compact frames (built from publicBattleView), the capped store, the byte budget
// and the frame player. Pure functions only: no browser.
import assert from 'node:assert/strict';
import { createCardMatch, cardAction, chooseAI, buildBattleDeck, publicBattleView } from '../public/card-engine.js';
import {
  buildFrame, frameForMatch, outcomeLine, readFrame, MAX_FRAMES, MAX_BATTLES, STORE_BUDGET, FRAME_BUDGET,
  FRAME_SLOTS, SIDE_SLOTS, ACTIVE_SLOTS, BENCH_SLOTS,
  ensureReplays, insertReplay, pruneReplays, storeBytes,
  createPlayer, playerStep, playerRestart, playerToggle, playerTick
} from '../public/battle-replays.js';

let n = 0;
const test = (name, f) => { f(); n++; console.log('PASS ' + name); };
const pool = (prefix = 'p') => Array.from({ length: 10 }, (_, i) => ({ id: prefix + i, kind: i, level: 2, rarity: 'Common' }));
const NAMES = ['Flaminyx', 'Lunamo', 'Verdele', 'Voltix', 'Aquabub', 'Crystella', 'Frostbit', 'Umbryx', 'Emberoo', 'Zephyra'];
const nameOf = kind => NAMES[kind] || 'Mythling';
const rng = () => 0.2;

function makeMatch() {
  const selection = buildBattleDeck(pool()).map(c => c.cardType === 'trainer' ? 't-' + c.trainer : c.template);
  selection[selection.length - 1] = 't-mantle';
  return createCardMatch([pool(), pool('e')], { selections: [selection, selection], now: 0, rng });
}

// Play a full deterministic battle and keep one frame per new revision, like the recorder does.
function recordBattle() {
  const s = makeMatch(), names = [], frames = new Map();
  let now = 1;
  const snap = () => { if (!frames.has(s.revision)) frames.set(s.revision, buildFrame(publicBattleView(s, 0), 0, names, nameOf)); };
  snap();
  for (let i = 0; i < 1200 && !s.result; i++) {
    const side = s.phase === 'setup' ? (s.sides[0].ready ? 1 : 0) : s.phase === 'replace' ? s.replacement : s.turn;
    const a = chooseAI(s, side, 3, rng);
    assert(a, 'the deterministic battle always has a next action');
    cardAction(s, side, a, now, rng);
    now += 5;
    snap();
  }
  assert(s.result, 'the deterministic battle finishes');
  const framesOut = [...frames.values()].slice(-MAX_FRAMES);
  return { match: s, names, frames: framesOut, battle: { id: 'battle-one', at: 1000, level: 10, boss: 'Magmarok', result: outcomeLine(s.result, 0), frames: framesOut, names } };
}

test('One full battle record stays well inside the 12 KB frame budget', () => {
  const { battle, frames } = recordBattle();
  assert(frames.length >= 8, 'a real battle records several frames');
  assert(frames.length <= MAX_FRAMES);
  const size = JSON.stringify(battle).length;
  assert.ok(size < FRAME_BUDGET, 'one full battle is ' + size + ' bytes, under ' + FRAME_BUDGET);
  console.log('  one battle: ' + frames.length + ' frames, ' + size + ' bytes (' + Math.round(size / frames.length) + ' per frame)');
});

test('Frames hold only the whitelisted, public fields (no hands or deck order)', () => {
  const { battle, names, match } = recordBattle();
  assert(Array.isArray(names) && names.every(v => typeof v === 'string' && v.length > 0), 'the shared name list is plain text');
  const str = JSON.stringify(battle);
  assert(!str.includes('"hand"') && !str.includes('"drawPile"') && !str.includes('"cards"') && !str.includes('"sourceId"') && !str.includes('"ownedId"'), 'no hidden save fields are stored');
  // Every card id from either hand or deck must be absent from the record.
  for (const p of match.sides) {
    const ids = new Set([...p.hand, ...p.drawPile, ...p.cards.map(c => c.id)]);
    for (const id of ids) assert(!str.includes(id), 'hidden card id is not stored: ' + id);
  }
  for (const frame of battle.frames) {
    assert(Array.isArray(frame) && frame.length === FRAME_SLOTS.length, 'fixed frame slots');
    assert.deepEqual([0, 1, 2, 3, 4, 5].map(i => typeof frame[i]), ['number', 'number', 'number', 'number', 'number', 'number']);
    assert(Array.isArray(frame[8]) && frame[8].every(t => typeof t === 'string'), 'log lines are strings');
    assert(frame[9] === null || (Array.isArray(frame[9]) && frame[9].length === 3), 'last attack is small or null');
    for (const side of [frame[6], frame[7]]) {
      assert(Array.isArray(side) && side.length === SIDE_SLOTS.length);
      assert.equal(typeof side[0], 'number');
      assert(side[1] === null || (Array.isArray(side[1]) && side[1].length === ACTIVE_SLOTS.length), 'active is name/kind/hp/maxhp/energy');
      assert(Array.isArray(side[2]) && side[2].every(b => Array.isArray(b) && b.length === BENCH_SLOTS.length), 'bench is name/HP pairs');
    }
    const view = readFrame(frame, names);
    assert(view.you.name && view.them.name, 'readable names come from the shared list');
    if (view.you.active) assert(view.you.active.name, 'an Active keeps its readable name');
  }
  assert(battle.frames.some(f => readFrame(f, names).you.active), 'later frames carry an Active');
  // The frame builder ignores the viewer's own hand even though publicBattleView still carries it.
  const view = publicBattleView(match, 0);
  const names2 = [];
  const one = buildFrame(view, 0, names2, nameOf);
  assert.equal(one.length, FRAME_SLOTS.length);
  assert(!JSON.stringify(one).includes(match.sides[0].hand[0]), 'the viewer hand is never copied');
  const names3 = [];
  assert.deepEqual(frameForMatch(match, 0, names3, nameOf), buildFrame(publicBattleView(match, 0), 0, names3, nameOf), 'the match helper uses the same public builder');
});

test('The store keeps at most 10 battles, newest first', () => {
  const st = {};
  const r = ensureReplays(st);
  assert.deepEqual(r, { list: [] });
  for (let i = 0; i < 12; i++) insertReplay(r, { id: 'b' + i, at: i, level: 1, boss: null, result: 'Victory', frames: [[i, 1, 1, -1, 0, 0, [0, null, []], [0, null, []], [], null]], names: ['You', 'Opponent'] });
  assert.equal(r.list.length, MAX_BATTLES);
  assert.equal(r.list[0].id, 'b11', 'newest kept first');
  assert.equal(r.list[9].id, 'b2');
  assert(!r.list.some(b => b.id === 'b0' || b.id === 'b1'), 'the two oldest are gone');
});

test('The 100 KB budget drops whole oldest battles before trimming the newest', () => {
  const r = { list: [] };
  const bigFrame = (i) => [i, 1, 1, -1, 0, 0, [0, null, []], [0, null, []], ['x'.repeat(900)], null];
  for (let b = 0; b < 4; b++) insertReplay(r, { id: 'big' + b, at: b, level: 1, boss: null, result: 'Victory', frames: Array.from({ length: MAX_FRAMES }, (_, i) => bigFrame(i)), names: ['You', 'Opponent'] });
  assert(storeBytes(r) <= STORE_BUDGET, 'the store is ' + storeBytes(r) + ' bytes');
  assert.equal(r.list[0].id, 'big3', 'the newest battle is always kept');
  assert(!r.list.some(b => b.id === 'big0'), 'the oldest battle went first');
  assert(r.list.length < 4);
  // One single oversize battle: the store survives by trimming frames from the front.
  const one = { list: [] };
  const huge = Array.from({ length: MAX_FRAMES }, (_, i) => [i, 1, 1, -1, 0, 0, [0, null, []], [0, null, []], ['frame ' + i + ' ' + 'y'.repeat(2000)], null]);
  insertReplay(one, { id: 'huge', at: 0, level: 1, boss: null, result: 'Victory', frames: huge, names: ['You', 'Opponent'] });
  assert(storeBytes(one) <= STORE_BUDGET);
  assert.equal(one.list[0].id, 'huge');
  assert(one.list[0].frames.length < MAX_FRAMES, 'front frames were trimmed');
  assert.equal(one.list[0].frames.at(-1)[0], MAX_FRAMES - 1, 'the newest frame is kept');
  assert.notEqual(one.list[0].frames.at(-1)[0], one.list[0].frames[0][0], 'the first frame is no longer the original first');
});

test('The frame player steps, pauses and wraps on restart', () => {
  let p = createPlayer(0);
  assert.equal(p.total, 1, 'a record always has at least one step');
  p = createPlayer(5);
  assert.deepEqual([p.index, p.playing], [0, false]);
  for (let i = 0; i < 10; i++) p = playerStep(p, 1);
  assert.equal(p.index, 4, 'stepping stops at the last frame');
  assert.equal(p.playing, false, 'stepping pauses');
  p = playerStep(p, -1);
  assert.equal(p.index, 3);
  p = playerToggle(p);
  assert.equal(p.playing, true);
  p = playerTick(p);
  assert.equal(p.index, 4);
  p = playerTick(p);
  assert.equal(p.playing, false, 'playback pauses at the end');
  p = playerRestart(p);
  assert.deepEqual([p.index, p.playing], [0, false], 'restart wraps to the first frame');
  p = playerToggle(p);
  assert.deepEqual([p.index, p.playing], [0, true], 'play from the end starts again');
  p = playerToggle(p);
  assert.equal(p.playing, false, 'the play button also pauses');
  // The budget helper is idempotent and never leaves the store over size.
  const r = { list: [{ id: 'x', frames: [[0], [1], [2]] }] };
  pruneReplays(r);
  assert(storeBytes(r) <= STORE_BUDGET);
});

console.log(n + ' battle-replays cases passed');
