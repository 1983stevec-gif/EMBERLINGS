// EMBERLINGS sound effects for the newer animations (fx-battle, fx-packs, fx-cards, fx-menus).
// Every sound is synthesized with Web Audio: no audio files are downloaded. Sound only: it never changes
// cards, rewards or the save. It follows the existing Sound On/Off button (state.ember.muted): while muted it
// plays nothing and does not even create an audio context. Audio starts only after the player's first tap or key.
// Talks to the game only through window.EmberBridge, ember:* events and the elements the fx-*.js modules add.
//
// enhancements.js already plays a click, the pack roll ticks, the 3D pack burst, a hit thump, heal, KO, win/lose
// and a coin jingle when coins are collected. The sounds here are timed to the new animations and kept quieter
// so they sit on top of those as a flavour layer rather than a second loud sound for the same moment.
import { ADVANTAGE } from './card-engine.js';

const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s);
const muted = () => !!B?.state?.ember?.muted;
const rnd = (a, b) => a + Math.random() * (b - a);
const vary = (k = .04) => 1 + rnd(-k, k); // tiny pitch variation so repeats never sound identical

/* ---------------------------------------------------------------- Audio core */
let ctx = null, out = null, noiseBuf = null, unlocked = false;
function ac() {
  if (muted() || !unlocked || document.hidden) return null;
  try {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      ctx = new C();
      // Gentle limiter so layered moments never clip, then a quiet master level.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .15;
      out = ctx.createGain(); out.gain.value = .3;
      out.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}
function unlock() {
  unlocked = true;
  if (muted()) { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); return; }
  ac();
}
// One shared second of white noise; each noise sound plays a random slice of it.
function noiseBuffer(c) {
  if (noiseBuf) return noiseBuf;
  const len = c.sampleRate, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf = buf;
}
function env(c, g, t, v, a, d) {
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(.0002, v), t + a);
  g.gain.exponentialRampToValueAtTime(.0001, t + d);
}
// A single oscillator note with an attack/decay envelope and an optional pitch glide.
function tone({ f = 440, to = 0, type = 'sine', at = 0, d = .15, v = .1, a = .005, glide = 0 }) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + (glide || d));
  env(c, g, t, v, a, d);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + d + .05);
}
// Filtered noise: whooshes, splashes, crackles. f/to sweep the filter frequency.
function noise({ at = 0, d = .2, v = .1, f = 1200, to = 0, q = .8, type = 'bandpass', a = .01 }) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + at, src = c.createBufferSource(), filt = c.createBiquadFilter(), g = c.createGain();
  src.buffer = noiseBuffer(c);
  filt.type = type; filt.Q.value = q; filt.frequency.setValueAtTime(f, t);
  if (to) filt.frequency.exponentialRampToValueAtTime(to, t + d);
  env(c, g, t, v, a, d);
  src.connect(filt); filt.connect(g); g.connect(out);
  src.start(t, rnd(0, .5), d + .05);
}
// Rate limit per sound name, so busy moments never stack into a wall of noise.
const lastAt = new Map();
function gate(name, ms) {
  const now = performance.now();
  if (now - (lastAt.get(name) || -1e9) < ms) return false;
  lastAt.set(name, now); return true;
}
const play = (name, ms, fn) => { if (!gate(name, ms) || !ac()) return false; fn(); return true; };

/* ---------------------------------------------------------------- Sounds */
const S = {};
// Battle: one short cast sound per element (starts with the lunge) and a light element accent at impact (t = hit).
S.attack = (el, hit) => {
  const p = vary();
  switch (el) {
    case 'Fire':
      noise({ d: hit + .12, v: .09, f: 350 * p, to: 1800 * p, q: 1.2 });
      noise({ at: hit, d: .3, v: .11, f: 900, to: 300, type: 'lowpass', q: .5 });
      for (let i = 0; i < 4; i++) noise({ at: hit + rnd(.02, .25), d: .03, v: .07, f: rnd(2500, 4500), q: 4 });
      break;
    case 'Lightning':
      tone({ f: 1900 * p, to: 180, type: 'sawtooth', d: .16, v: .045 });
      noise({ d: .12, v: .07, f: 5000, type: 'highpass', q: .7 });
      for (let i = 0; i < 3; i++) noise({ at: .05 + i * .07 + rnd(0, .03), d: .04, v: .08, f: rnd(3000, 6000), q: 2 });
      tone({ f: 70 * p, to: 45, at: .08, d: .18, v: .08 });
      break;
    case 'Water':
      for (let i = 0; i < 3; i++) tone({ f: 320 * p * (1 + i * .25), to: 900 * p * (1 + i * .2), at: i * .06, d: .07, v: .06, glide: .06 });
      noise({ at: hit, d: .38, v: .1, f: 2200, to: 500, type: 'lowpass', q: .4 });
      break;
    case 'Nature':
      for (let i = 0; i < 5; i++) noise({ at: i * .05 + rnd(0, .02), d: .07, v: .05, f: rnd(2500, 4200), q: 3 });
      tone({ f: 196 * p, to: 150, type: 'triangle', at: hit, d: .22, v: .1 });
      tone({ f: 294 * p, type: 'triangle', at: hit + .05, d: .2, v: .05 });
      break;
    case 'Ice':
      for (let i = 0; i < 4; i++) tone({ f: rnd(2300, 3600) * p, type: 'sine', at: i * .045, d: .12, v: .035 });
      noise({ at: hit, d: .08, v: .1, f: 4000, type: 'highpass', q: .5 });
      tone({ f: 2637 * p, type: 'triangle', at: hit + .02, d: .35, v: .035 });
      break;
    case 'Shadow':
      tone({ f: 120 * p, to: 60, type: 'sawtooth', d: hit + .25, v: .045 });
      noise({ d: hit + .2, v: .08, f: 700, to: 180, type: 'lowpass', q: 1.5 });
      noise({ at: hit, d: .4, v: .07, f: 400, to: 150, type: 'lowpass', q: .7 });
      break;
    case 'Moon':
      noise({ d: .26, v: .07, f: 600 * p, to: 2600 * p, q: 3 });
      noise({ at: .09, d: .26, v: .06, f: 2400 * p, to: 700 * p, q: 3 });
      tone({ f: 880 * p, type: 'sine', at: hit, d: .5, v: .045 });
      tone({ f: 1318.5 * p, type: 'sine', at: hit + .03, d: .45, v: .03 });
      break;
    case 'Crystal':
      [1568, 2093, 2637].forEach((f, i) => tone({ f: f * p, type: 'triangle', at: i * .05, d: .2, v: .035 }));
      noise({ at: hit, d: .12, v: .08, f: 6000, type: 'highpass', q: .6 });
      for (let i = 0; i < 3; i++) tone({ f: rnd(3000, 4200), at: hit + .03 + i * .04, d: .1, v: .025 });
      break;
    case 'Wind':
      noise({ d: hit + .3, v: .1, f: 300 * p, to: 1800 * p, q: 2.2, a: .08 });
      noise({ at: hit * .5, d: .35, v: .06, f: 1600 * p, to: 500, q: 2 });
      break;
    default:
      noise({ d: hit + .1, v: .08, f: 500, to: 1500, q: 1 });
  }
};
// Extra weight for weakness or huge hits, on top of enhancements.js's hit thump: a soft sub boom and,
// for weakness, a bright two-note "super effective" sting.
S.heavy = (weak, at) => {
  tone({ f: 75 * vary(), to: 34, at, d: .42, v: .2, a: .004 });
  noise({ at, d: .25, v: .07, f: 500, type: 'lowpass', q: .5 });
  if (weak) { tone({ f: 784 * vary(.02), type: 'triangle', at: at + .05, d: .12, v: .05 }); tone({ f: 1175, type: 'triangle', at: at + .13, d: .25, v: .05 }); }
};
S.evolve = () => {
  tone({ f: 330, to: 1320, type: 'sine', d: .7, v: .05, a: .08 });
  tone({ f: 495, to: 1980, type: 'triangle', d: .7, v: .025, a: .1 });
  for (let i = 0; i < 6; i++) tone({ f: rnd(2000, 4200), at: .15 + i * .08, d: .14, v: .025 });
  [1046.5, 1318.5, 1568].forEach(f => tone({ f, type: 'sine', at: .68, d: .7, v: .03, a: .02 }));
};
S.enter = () => tone({ f: 260 * vary(), to: 560, type: 'sine', d: .12, v: .06, glide: .08 });

// Packs
S.rip = () => {
  for (let i = 0; i < 3; i++) noise({ at: .25 + i * .1, d: .05, v: .03, f: 1500, q: 1 }); // foil rustle while it shakes
  noise({ at: .64, d: .26, v: .16, f: 1800 * vary(), to: 4500, q: .9, a: .004 });       // the rip itself
  noise({ at: .66, d: .08, v: .1, f: 900, q: 1.5 });
  tone({ f: 140, to: 70, at: .64, d: .18, v: .06 });
};
S.heart = level => {
  const v = level >= 2 ? .16 : .11, f = level >= 2 ? 62 : 56;
  tone({ f, to: 40, d: .14, v, a: .004 }); tone({ f: f * .9, to: 38, at: .14, d: .12, v: v * .7, a: .004 });
};
S.land = level => { tone({ f: 1568, type: 'triangle', d: .4, v: .04 }); if (level >= 2) tone({ f: 2093, type: 'sine', at: .05, d: .5, v: .035 }); };
S.fanfare = (level, rank) => {
  const scale = [784, 988, 1175, 1568, 1976, 2349, 3136];
  const n = Math.min(7, 3 + Math.max(0, rank) + (level >= 2 ? 1 : 0)), v = level >= 2 ? .06 : .045;
  for (let i = 0; i < n; i++) tone({ f: scale[i], type: 'sine', at: .1 + i * .06, d: .3, v });
  noise({ at: .05, d: .5, v: .04, f: 7000, type: 'highpass', q: .5, a: .05 }); // confetti "shh"
  if (level >= 2) {
    [1568, 1976, 2349].forEach((f, i) => tone({ f, type: 'triangle', at: .15 + n * .06 + i * .015, d: 1.1, v: .03, a: .02 }));
    for (let i = 0; i < 6; i++) tone({ f: rnd(2800, 4800), at: .5 + i * .09, d: .12, v: .02 });
  }
};

// Binder, coins, chest, level up
S.page = dir => { noise({ d: .22, v: .07, f: dir < 0 ? 2800 : 900, to: dir < 0 ? 900 : 2800, q: 1.1, a: .03 }); noise({ at: .17, d: .03, v: .04, f: 3000, q: 2 }); };
S.clink = () => { const p = vary(.06); tone({ f: 2350 * p, type: 'triangle', d: .09, v: .045 }); tone({ f: 3150 * p, at: .045, d: .12, v: .03 }); };
S.chest = (big, open) => {
  const sh = big ? .2 : .06;
  tone({ f: 170, to: 230, type: 'sawtooth', at: sh, d: .3, v: .018, a: .05 });          // creak while it shakes
  noise({ at: sh, d: .3, v: .03, f: 600, q: 6 });
  tone({ f: 110, to: 70, at: open - .02, d: .14, v: .1 });                              // lid clunk
  tone({ f: 240, to: 420, type: 'sawtooth', at: open - .06, d: .14, v: .015, a: .03 });  // hinge
  const notes = [1046.5, 1318.5, 1568, 2093, 2637];
  notes.forEach((f, i) => tone({ f, type: 'sine', at: open + .04 + i * .05, d: .3, v: .035 })); // sparkle
};
S.levelUp = () => {
  [784, 988, 1175, 1568].forEach((f, i) => tone({ f, type: 'triangle', at: i * .085, d: i === 3 ? .7 : .2, v: .06 }));
  tone({ f: 3136, type: 'sine', at: .34, d: .6, v: .02 });
};
S.levelToast = () => { tone({ f: 1175, type: 'triangle', d: .14, v: .045 }); tone({ f: 1568, type: 'triangle', at: .08, d: .35, v: .045 }); };

/* ---------------------------------------------------------------- Battle moments (from ember:cardBattle) */
let prev = null, lastSig = '';
function snap(match) {
  return match.sides.map(s => {
    const c = s.cards.find(c => c.id === s.active);
    return { active: s.active, hp: c?.hp, maxhp: c?.maxhp, el: c?.element, under: c?.under || [], bench: [...(s.bench || [])],
      benchUnder: (s.bench || []).map(id => s.cards.find(c => c.id === id)?.under || []) };
  });
}
const attackKey = la => la ? [la.side, la.move, la.damage, la.at].join(':') : '';
function onBattle({ match }) {
  if (!match?.sides) return;
  const sig = match.sides.map(s => s.name).join('|');
  if (sig !== lastSig) { lastSig = sig; prev = null; }
  const now = snap(match), key = attackKey(match.lastAttack), before = prev;
  prev = { snap: now, key };
  if (!before || (B.view !== 'cardBattle' && B.view !== 'spectate')) return;
  const la = match.lastAttack;
  let attacked = -1;
  if (key && key !== before.key && la && (la.side === 0 || la.side === 1)) {
    const a = la.side, d = 1 - a, was = before.snap[d], atk = before.snap[a];
    if (was.active) {
      attacked = d;
      const weak = !!atk.el && ADVANTAGE[atk.el] === was.el;
      const ko = now[d].active !== was.active || now[d].hp <= 0;
      const huge = !ko && la.damage > 0 && la.damage >= (was.maxhp || 999) * .5;
      const hit = .24; // fx-battle's projectile travel time
      play('attack', 250, () => {
        S.attack(atk.el || 'Fire', hit);
        if ((weak || huge) && la.damage > 0 && !ko) S.heavy(weak, hit);
      });
    }
  }
  let evolved = false, entered = false;
  for (let i = 0; i < 2; i++) {
    const w = before.snap[i], n = now[i];
    if (n.active && n.active !== w.active) { if (n.under.includes(w.active)) evolved = true; else entered = true; }
    n.bench.forEach((id, k) => { if (w.bench[k] && w.bench[k] !== id && n.benchUnder[k].includes(w.bench[k])) evolved = true; });
  }
  if (evolved) setTimeout(() => play('evolve', 600, S.evolve), attacked >= 0 ? 450 : 0);
  else if (entered) setTimeout(() => play('enter', 300, S.enter), attacked >= 0 ? 450 : 0);
}

/* ---------------------------------------------------------------- Pack moments (from fx-packs.js elements) */
let lastRank = 0;
const rankOf = c => { try { return B.rarityRank(c) || 0; } catch { return 0; } };
function onPackLayer(records) {
  let confetti = 0;
  for (const r of records) for (const n of r.addedNodes) {
    if (n.nodeType !== 1) continue;
    if (n.classList.contains('fxpTear')) play('rip', 1200, S.rip);
    else if (n.classList.contains('fxpConfetti')) confetti++;
  }
  if (confetti) {
    const level = document.querySelector('.fxpAura.fxpHot2') || confetti >= 40 ? 2 : 1;
    play('fanfare', 900, () => S.fanfare(level, lastRank));
  }
}
let stageObs = null;
function watchShuffle() {
  stageObs?.disconnect(); stageObs = null;
  const app = $('#app'); if (!app) return;
  stageObs = new MutationObserver(records => {
    for (const r of records) {
      if (r.type === 'attributes') {
        const st = r.target;
        if (st.classList?.contains('psStage') && st.classList.contains('psDone') && st.classList.contains('fxpRoll') && !st.dataset.fxs) {
          st.dataset.fxs = '1';
          const level = st.classList.contains('fxpHype2') ? 2 : st.classList.contains('fxpHype1') ? 1 : 0;
          if (level) play('land', 400, () => S.land(level));
        }
        continue;
      }
      for (const n of r.addedNodes) if (n.nodeType === 1 && n.classList.contains('fxpPull')) {
        const st = n.closest('.psStage');
        play('heart', 150, () => S.heart(st?.classList.contains('fxpHype2') ? 2 : 1));
      }
    }
  });
  stageObs.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
}

/* ---------------------------------------------------------------- Menu moments (from fx-menus.js elements) */
function onMenuLayer(records) {
  let sparks = 0;
  for (const r of records) for (const n of r.addedNodes) {
    if (n.nodeType !== 1) continue;
    if (n.classList.contains('fxmSpark')) sparks++;
    else if (n.classList.contains('fxmChest')) {
      const big = n.classList.contains('big');
      play('chest', 600, () => S.chest(big, big ? .62 : .42));
    }
  }
  // landing() adds five sparks where a group of coins reaches the counter: one clink per landing.
  if (sparks) play('clink', 110, S.clink);
}

/* ---------------------------------------------------------------- Wiring */
const layerObs = new Map();
function watchLayers() {
  for (const [id, fn] of [['fxpLayer', onPackLayer], ['fxmLayer', onMenuLayer]]) {
    const l = document.getElementById(id);
    if (!l || layerObs.get(id)?.el === l) continue;
    layerObs.get(id)?.obs.disconnect();
    const obs = new MutationObserver(fn); obs.observe(l, { childList: true });
    layerObs.set(id, { el: l, obs });
    // A layer is created by the first effect that needs it, so that effect is already inside: handle it too.
    if (l.children.length) fn([{ addedNodes: [...l.children] }]);
  }
}
let lastBinder = null;
function onBinder(d = {}) {
  const now = { index: !!d.index, page: d.page | 0 }, was = lastBinder; lastBinder = now;
  if (!was || was.index !== now.index || was.page === now.page) return;
  play('page', 140, () => S.page(Math.sign(now.page - was.page)));
}

if (B) {
  // Autoplay rules: audio may only start after the player interacts with the page.
  for (const type of ['pointerdown', 'keydown']) document.addEventListener(type, unlock, { capture: true, passive: true });
  // The Sound button lives in enhancements.js; when it turns sound off, quiet anything still ringing out.
  document.addEventListener('click', () => setTimeout(() => { if (muted() && ctx?.state === 'running') ctx.suspend().catch(() => {}); }, 0), true);
  document.addEventListener('visibilitychange', () => { if (document.hidden && ctx?.state === 'running') ctx.suspend().catch(() => {}); });

  addEventListener('ember:cardBattle', e => { try { onBattle(e.detail || {}); } catch (err) { console.warn('fx-sound', err); } });
  addEventListener('ember:spectateBattle', e => { try { onBattle(e.detail || {}); } catch (err) { console.warn('fx-sound', err); } });
  addEventListener('ember:cardResult', () => { prev = null; lastSig = ''; });
  addEventListener('ember:packReveal', e => { lastRank = rankOf(e.detail?.creature); });
  addEventListener('ember:packSummary', e => { lastRank = Math.max(0, ...(e.detail?.creatures || []).map(rankOf)); });
  addEventListener('ember:binderReady', e => onBinder(e.detail));
  addEventListener('ember:levelUp', () => setTimeout(() => {
    // levels.js shows a popup for new moves and abilities (handled below) and a toast for plain level-ups.
    if (!document.querySelector('.uiLvUp')) play('levelToast', 500, S.levelToast);
  }, 60));
  addEventListener('ember:frame', e => {
    const v = e.detail?.view;
    if (v === 'packOpening') watchShuffle(); else { stageObs?.disconnect(); stageObs = null; }
    if (v !== 'inventory' && v !== 'index') lastBinder = null;
    watchLayers();
  });
  // The effect layers and the level-up popup are added straight to <body>.
  new MutationObserver(records => {
    watchLayers();
    for (const r of records) for (const n of r.addedNodes) if (n.nodeType === 1 && n.classList.contains('uiLvUp')) play('levelUp', 800, S.levelUp);
  }).observe(document.body, { childList: true });
  watchLayers();
}
