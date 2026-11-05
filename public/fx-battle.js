// EMBERLINGS battle attack animations (presentation only: rules, damage, rewards and saves are untouched).
// Element-themed attack effects, a lunge toward the target, a hit shake, floating damage numbers,
// and a short glow when a Mythling evolves or steps into the Active spot.
// Talks to the game only through window.EmberBridge, the ember:* events and the DOM.
import { ADVANTAGE } from './card-engine.js';
import { fxCalm, fxLight } from '/fx-level.js';

const B = window.EmberBridge;
const ELEMENT_COLORS = { Fire: '#e67e4e', Moon: '#a796dc', Nature: '#72b987', Lightning: '#e3c857', Water: '#64b5d6', Crystal: '#cba0d8', Ice: '#9bd5dd', Shadow: '#9276b5', Wind: '#86cbb6' };
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
// Effects setting: Off = numbers only; Light = no flashes or shaking, a third of the particles.
const calm = fxCalm;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const SVG = 'http://www.w3.org/2000/svg';
const MAX_PARTS = 30;
let live = 0, prev = null, lastSig = '', tick = 0;
// Battle animation speed (comfort.js): 1 = normal, smaller = quicker. Visual only: the game never waits on these.
const pace = () => { const k = window.EmberComfort?.animScale?.(); return k > 0 && k <= 1 ? k : 1; };
const later = (fn, ms) => setTimeout(fn, ms * pace());

/* ------------------------------------------------------------ Layer and particles */
function layer() {
  let l = $('#fxbLayer');
  if (!l) { l = document.createElement('div'); l.id = 'fxbLayer'; l.setAttribute('aria-hidden', 'true'); document.body.appendChild(l); }
  return l;
}
// One effect element, animated with the Web Animations API and removed when done.
// Particles (part=true) count toward the cap so a busy moment never floods the page.
function spawn(cls, keyframes, opts, { part = true, html = '', style = {} } = {}) {
  if (part && live >= MAX_PARTS) return null;
  const sp = pace(); if (sp !== 1) opts = { ...opts, duration: (opts.duration || 800) * sp, delay: (opts.delay || 0) * sp };
  if (fxLight() && (part ? tick++ % 3 : /^fxbFlash/.test(cls))) return null; // Light: keep one particle in three, no flashes
  const el = document.createElement('div'); el.className = 'fxb ' + cls;
  if (html) el.innerHTML = html;
  for (const k in style) { if (k.startsWith('--')) el.style.setProperty(k, style[k]); else el.style[k] = style[k]; }
  layer().appendChild(el); if (part) live++;
  let done = false;
  const end = () => { if (done) return; done = true; el.remove(); if (part) live = Math.max(0, live - 1); };
  try { el.animate(keyframes, { fill: 'both', easing: 'ease-out', ...opts }).finished.then(end, end); } catch { end(); }
  setTimeout(end, (opts.duration || 800) + (opts.delay || 0) + 400); // safety net
  return el;
}
const at = (x, y, extra = '') => `translate(${x}px,${y}px) translate(-50%,-50%) ${extra}`;
const centre = r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

/* ------------------------------------------------------------ Finding cards on the board */
function fields() { const f = $$('.pocketBoard > .pocketField'); return f.length >= 2 ? f : $$('.pocketField'); }
function fieldFor(i, side) { const f = fields(); return f[i === side ? 0 : 1] || null; }
function activeHost(i, side) { return $('.pocketActive', fieldFor(i, side) || document.createElement('div')); }
function activeBody(i, side) { const h = activeHost(i, side); return h && ($('.pocketCreature', h) || $('.mythCard', h) || h.firstElementChild); }
function rectOf(el) { if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 ? r : null; }
function snapshot(match) {
  return match.sides.map(s => {
    const c = s.cards.find(c => c.id === s.active);
    return { active: s.active, hp: c?.hp, maxhp: c?.maxhp, el: c?.element, under: c?.under || [], points: s.points, bench: [...(s.bench || [])],
      benchUnder: (s.bench || []).map(id => s.cards.find(c => c.id === id)?.under || []), benchEl: (s.bench || []).map(id => s.cards.find(c => c.id === id)?.element) };
  });
}
const attackKey = la => la ? [la.side, la.move, la.damage, la.at].join(':') : '';

/* ------------------------------------------------------------ Main hook */
function onBattle({ match, side }) {
  const sig = match.sides.map(s => s.name).join('|');
  if (sig !== lastSig) { lastSig = sig; prev = null; }
  const snap = snapshot(match), key = attackKey(match.lastAttack), before = prev;
  prev = { snap, key };
  document.body.classList.toggle('fxbOn', !calm());
  if (!before) return;
  // Wait one frame so the painted desktop/tablet layouts have placed the board.
  requestAnimationFrame(() => play(match, side, before, snap, key));
}

function play(match, side, before, snap, key) {
  if (B.view !== 'cardBattle' && B.view !== 'spectate') return; // spectate: a friend's duel being watched (spectate.js)
  const attacked = new Set();
  const la = match.lastAttack;
  if (key && key !== before.key && la && (la.side === 0 || la.side === 1)) {
    const a = la.side, d = 1 - a, was = before.snap[d], atk = before.snap[a];
    if (was.active) {
      attacked.add(d);
      const weak = !!atk.el && ADVANTAGE[atk.el] === was.el;
      const ko = snap[d].active !== was.active || snap[d].hp <= 0;
      const huge = !ko && la.damage > 0 && la.damage >= (was.maxhp || 999) * .5;
      attack({ a, d, side, el: atk.el || 'Fire', dmg: la.damage, weak, huge, ko });
    }
  }
  for (let i = 0; i < 2; i++) {
    const was = before.snap[i], now = snap[i];
    // Other HP changes on the Active spot (healing, poison, burn, confusion)
    if (!attacked.has(i) && was.active && was.active === now.active && Number.isFinite(was.hp) && now.hp !== was.hp) {
      const r = rectOf(activeHost(i, side)); if (r) number(r, now.hp - was.hp, {});
    }
    // Evolution (Active or Bench) and a new Mythling in the Active spot
    if (now.active && now.active !== was.active) {
      const evolved = now.under.includes(was.active);
      later(() => entrance(activeHost(i, side), now.el, evolved), attacked.has(i) ? 450 : 0);
    }
    now.bench.forEach((id, k) => {
      if (was.bench[k] && was.bench[k] !== id && now.benchUnder[k].includes(was.bench[k])) {
        const slot = $$('.pocketBench > *', fieldFor(i, side))[k];
        entrance(slot, now.benchEl[k], true);
      }
    });
  }
}

/* ------------------------------------------------------------ Attack sequence */
function attack({ a, d, side, el, dmg, weak, huge, ko }) {
  const from = rectOf(activeHost(a, side)), to = rectOf(activeHost(d, side));
  if (!to) return;
  if (calm()) { number(to, -dmg, { weak, huge }); return; }
  const color = ELEMENT_COLORS[el] || '#ffd36c', k = clamp(to.width / 220, .55, 1.25);
  const src = from ? centre(from) : { x: centre(to).x, y: to.top - 120 }, dst = centre(to);
  lunge(activeBody(a, side), src, dst);
  const travel = from ? 240 : 0;
  (FX[el] || FX.Fire)(src, dst, to, k, color, travel);
  later(() => {
    if (!ko) hitShake(activeBody(d, side), weak || huge);
    impactRing(dst, k, color, weak || huge || ko);
    number(to, -dmg, { weak, huge, color });
  }, travel);
}

function lunge(el, src, dst) {
  if (!el) return;
  const dx = dst.x - src.x, dy = dst.y - src.y, len = Math.hypot(dx, dy) || 1, reach = Math.min(70, len * .22);
  const x = dx / len * reach, y = dy / len * reach, tilt = clamp(dx / len * 5, -5, 5);
  try {
    el.animate([{ transform: 'none' }, { transform: `translate(${-x * .15}px,${-y * .15}px) scale(.97)`, offset: .25 },
      { transform: `translate(${x}px,${y}px) rotate(${tilt}deg) scale(1.06)`, offset: .55 }, { transform: 'none' }],
    { duration: 480 * pace(), easing: 'cubic-bezier(.3,.7,.4,1)', composite: 'add' });
  } catch { /* older browsers: no lunge */ }
}
function hitShake(el, big) {
  if (!el) return;
  if (fxLight()) { try { el.animate([{ filter: 'none' }, { filter: 'brightness(1.6)', offset: .25 }, { filter: 'none' }], { duration: 360 * pace(), easing: 'ease-out' }); } catch { /* ignore */ } return; }
  const m = big ? 10 : 6;
  try {
    el.animate([{ transform: 'none', filter: 'none' }, { transform: `translateX(${-m}px) rotate(-1.5deg)`, filter: 'brightness(2.2) saturate(.4)', offset: .15 },
      { transform: `translateX(${m}px) rotate(1.2deg)`, offset: .35 }, { transform: `translateX(${-m * .6}px)`, filter: 'brightness(1.3)', offset: .55 },
      { transform: `translateX(${m * .3}px)`, offset: .75 }, { transform: 'none', filter: 'none' }], { duration: (big ? 520 : 420) * pace(), easing: 'ease-out' });
  } catch { /* ignore */ }
}
function impactRing(p, k, color, big) {
  spawn('fxbRing', [{ transform: at(p.x, p.y, 'scale(.2)'), opacity: .95 }, { transform: at(p.x, p.y, `scale(${big ? 1.6 : 1.15})`), opacity: 0 }],
    { duration: 520 }, { part: false, style: { '--c': color, width: 150 * k + 'px', height: 150 * k + 'px' } });
  spawn('fxbFlash', [{ transform: at(p.x, p.y, 'scale(.4)'), opacity: .9 }, { transform: at(p.x, p.y, 'scale(1.3)'), opacity: 0 }],
    { duration: 300 }, { part: false, style: { '--c': color, width: 120 * k + 'px', height: 120 * k + 'px' } });
}

/* Damage / heal numbers. Weakness and huge hits are bigger and carry a short label. */
function number(rect, delta, { weak = false, huge = false, color } = {}) {
  if (!delta) return;
  const heal = delta > 0, p = { x: rect.left + rect.width / 2, y: rect.top + rect.height * .38 };
  const big = weak || huge, size = clamp(rect.width / 220, .7, 1.15) * (big ? 54 : heal ? 30 : 38);
  const label = weak ? 'Super effective!' : huge ? 'Huge hit!' : '';
  const html = `${label ? `<small>${label}</small>` : ''}<b>${heal ? '+' : '−'}${Math.abs(delta)}</b>`;
  const cls = 'fxbNum' + (heal ? ' heal' : '') + (big ? ' big' : '') + (weak ? ' weak' : '');
  const style = { fontSize: size + 'px', '--c': heal ? '#7be7b3' : weak ? '#ffd568' : color || '#ff6b5a' };
  const frames = calm()
    ? [{ transform: at(p.x, p.y), opacity: 0 }, { transform: at(p.x, p.y), opacity: 1, offset: .15 }, { transform: at(p.x, p.y), opacity: 1, offset: .75 }, { transform: at(p.x, p.y), opacity: 0 }]
    : [{ transform: at(p.x, p.y, 'scale(.3)'), opacity: 0 }, { transform: at(p.x, p.y - 18, `scale(${big ? 1.35 : 1.15})`), opacity: 1, offset: .18 },
      { transform: at(p.x, p.y - 34, 'scale(1)'), opacity: 1, offset: .6 }, { transform: at(p.x, p.y - 80, 'scale(.9)'), opacity: 0 }];
  spawn(cls, frames, { duration: big ? 1400 : 1150, easing: 'cubic-bezier(.2,.8,.3,1)' }, { part: false, html, style });
}

/* Projectile helper: an orb (or any element) flying from the attacker to the target */
function projectile(cls, src, dst, k, travel, style = {}, html = '') {
  if (!travel) return;
  const ang = Math.atan2(dst.y - src.y, dst.x - src.x) * 180 / Math.PI;
  spawn(cls, [{ transform: at(src.x, src.y, `rotate(${ang}deg) scale(.5)`), opacity: 0 }, { transform: at(src.x, src.y, `rotate(${ang}deg) scale(1)`), opacity: 1, offset: .15 },
    { transform: at(dst.x, dst.y, `rotate(${ang}deg) scale(1.15)`), opacity: 1 }], { duration: travel, easing: 'cubic-bezier(.5,0,.9,.6)' }, { part: false, style, html });
}
// Burst of particles radiating from a point.
function burst(p, n, k, { cls, dist = [40, 110], up = 0, dur = [500, 900], delay = 0, spin = 0, size = [6, 12], style = () => ({}), gravity = 0 }) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(dist[0], dist[1]) * k, s = rnd(size[0], size[1]) * k, rot = rnd(-spin, spin);
    const ex = p.x + Math.cos(a) * r, ey = p.y + Math.sin(a) * r - up * k;
    const frames = gravity
      ? [{ transform: at(p.x, p.y, 'scale(.4)'), opacity: 1 }, { transform: at(p.x + Math.cos(a) * r * .6, p.y - Math.abs(Math.sin(a)) * r * .9 - up * k, `rotate(${rot / 2}deg)`), opacity: 1, offset: .45 },
        { transform: at(ex, p.y + gravity * k, `rotate(${rot}deg) scale(.6)`), opacity: 0 }]
      : [{ transform: at(p.x, p.y, 'scale(.4) rotate(0deg)'), opacity: 1 }, { transform: at(ex, ey, `scale(1) rotate(${rot}deg)`), opacity: 1, offset: .5 },
        { transform: at(ex + (ex - p.x) * .25, ey + (ey - p.y) * .25 - 10, `scale(.3) rotate(${rot * 1.4}deg)`), opacity: 0 }];
    spawn(cls, frames, { duration: rnd(dur[0], dur[1]), delay, easing: 'cubic-bezier(.2,.7,.4,1)' }, { style: { width: s + 'px', height: s + 'px', ...style(i) } });
  }
}
function svg(w, h, inner) { return `<svg xmlns="${SVG}" viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="none">${inner}</svg>`; }

/* ------------------------------------------------------------ Element effects */
const FX = {
  Fire(src, dst, r, k, c, travel) {
    projectile('fxbOrb fire', src, dst, k, travel, { width: 46 * k + 'px', height: 30 * k + 'px' });
    later(() => {
      burst(dst, 16, k, { cls: 'fxbEmber', dist: [30, 120], up: 50, dur: [600, 1000], size: [5, 11] });
      spawn('fxbBlast fire', [{ transform: at(dst.x, dst.y, 'scale(.3)'), opacity: 1 }, { transform: at(dst.x, dst.y - 10 * k, 'scale(1.25)'), opacity: 0 }], { duration: 560 }, { part: false, style: { width: 170 * k + 'px', height: 170 * k + 'px' } });
    }, travel);
  },
  Lightning(src, dst, r, k, c, travel) {
    // A jagged bolt from the attacker (or the sky) into the target, flickering, then crackling sparks.
    const x1 = src.x, y1 = src.y, x2 = dst.x, y2 = dst.y, left = Math.min(x1, x2) - 30, top = Math.min(y1, y2) - 30;
    const w = Math.abs(x2 - x1) + 60, h = Math.abs(y2 - y1) + 60, steps = 9;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, jx = i && i < steps ? rnd(-18, 18) : 0, jy = i && i < steps ? rnd(-18, 18) : 0;
      pts.push(`${(x1 + (x2 - x1) * t - left + jx).toFixed(1)},${(y1 + (y2 - y1) * t - top + jy).toFixed(1)}`);
    }
    const path = pts.join(' ');
    spawn('fxbBolt', [{ opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: .3, offset: .3 }, { opacity: 1, offset: .45 }, { opacity: .5, offset: .7 }, { opacity: 0 }],
      { duration: 420 + travel * .5, easing: 'linear' }, { part: false, style: { left: left + 'px', top: top + 'px', width: w + 'px', height: h + 'px' },
        html: svg(w, h, `<polyline points="${path}" class="glow"/><polyline points="${path}" class="core"/>`) });
    later(() => {
      burst(dst, 12, k, { cls: 'fxbSpark', dist: [25, 95], dur: [260, 520], size: [3, 5], spin: 0, style: () => ({ '--r': rnd(0, 360) + 'deg' }) });
      spawn('fxbFlash white', [{ transform: at(dst.x, dst.y, 'scale(.6)'), opacity: .95 }, { transform: at(dst.x, dst.y, 'scale(1.6)'), opacity: 0 }], { duration: 260 }, { part: false, style: { width: 160 * k + 'px', height: 160 * k + 'px' } });
    }, Math.min(travel, 120));
  },
  Water(src, dst, r, k, c, travel) {
    projectile('fxbOrb water', src, dst, k, travel, { width: 40 * k + 'px', height: 32 * k + 'px' });
    later(() => {
      burst(dst, 16, k, { cls: 'fxbDrop', dist: [40, 110], up: 30, dur: [650, 950], size: [6, 11], gravity: 90 });
      spawn('fxbRipple', [{ transform: at(dst.x, dst.y + r.height * .2, 'scale(.2,.08)'), opacity: 1 }, { transform: at(dst.x, dst.y + r.height * .2, 'scale(1.4,.45)'), opacity: 0 }], { duration: 700 }, { part: false, style: { width: 180 * k + 'px', height: 180 * k + 'px' } });
    }, travel);
  },
  Nature(src, dst, r, k, c, travel) {
    // Leaves swirl across, then vines curl around the target.
    for (let i = 0; i < 8; i++) {
      const s = rnd(14, 22) * k, sway = rnd(-50, 50) * k, rot = rnd(-260, 260);
      spawn('fxbLeaf', [{ transform: at(src.x, src.y, 'rotate(0deg) scale(.5)'), opacity: 0 },
        { transform: at((src.x + dst.x) / 2 + sway, (src.y + dst.y) / 2 - 30 * k + sway * .4, `rotate(${rot / 2}deg)`), opacity: 1, offset: .45 },
        { transform: at(dst.x + rnd(-60, 60) * k, dst.y + rnd(-60, 60) * k, `rotate(${rot}deg) scale(.8)`), opacity: 0 }],
      { duration: travel + 560, delay: i * 30, easing: 'cubic-bezier(.4,.1,.5,1)' }, { style: { width: s + 'px', height: s * .6 + 'px', '--h': rnd(-15, 20) + 'deg' } });
    }
    later(() => {
      const w = r.width * 1.1, h = r.height * .9;
      spawn('fxbVines', [{ opacity: 0, transform: at(dst.x, dst.y) }, { opacity: 1, offset: .15, transform: at(dst.x, dst.y) }, { opacity: 1, offset: .7, transform: at(dst.x, dst.y) }, { opacity: 0, transform: at(dst.x, dst.y, 'scale(1.05)') }],
        { duration: 900 }, { part: false, style: { width: w + 'px', height: h + 'px' },
          html: svg(100, 100, '<path d="M4 96 C 20 70, 0 50, 22 36 S 40 6, 60 14"/><path d="M96 92 C 78 72, 100 54, 76 40 S 58 10, 40 18"/><path d="M50 100 C 44 80, 60 70, 50 52"/>') });
    }, travel);
  },
  Ice(src, dst, r, k, c, travel) {
    for (let i = 0; i < 6; i++) {
      const ox = rnd(-30, 30) * k, oy = rnd(-30, 30) * k, ang = Math.atan2(dst.y - src.y, dst.x - src.x) * 180 / Math.PI;
      spawn('fxbShard ice', [{ transform: at(src.x, src.y, `rotate(${ang}deg) scale(.4)`), opacity: 0 }, { transform: at(src.x, src.y, `rotate(${ang}deg)`), opacity: 1, offset: .1 },
        { transform: at(dst.x + ox, dst.y + oy, `rotate(${ang}deg)`), opacity: 1, offset: .55 }, { transform: at(dst.x + ox, dst.y + oy, `rotate(${ang}deg) scale(.9)`), opacity: 0 }],
      { duration: travel / .55 + 380, delay: i * 25, easing: 'cubic-bezier(.5,0,.7,1)' }, { style: { width: 34 * k + 'px', height: 9 * k + 'px' } });
    }
    later(() => {
      spawn('fxbFrost', [{ transform: at(dst.x, dst.y, 'scale(.7)'), opacity: 0 }, { transform: at(dst.x, dst.y, 'scale(1)'), opacity: 1, offset: .2 }, { transform: at(dst.x, dst.y, 'scale(1.05)'), opacity: 0 }],
        { duration: 1000 }, { part: false, style: { width: r.width * 1.05 + 'px', height: r.height * .95 + 'px' } });
      burst(dst, 8, k, { cls: 'fxbGlint', dist: [20, 80], dur: [500, 800], size: [8, 14], spin: 90 });
    }, travel);
  },
  Shadow(src, dst, r, k, c, travel) { smoke(src, dst, r, k, travel, false); },
  Moon(src, dst, r, k, c, travel) { smoke(src, dst, r, k, travel, true); },
  Crystal(src, dst, r, k, c, travel) {
    projectile('fxbOrb crystal', src, dst, k, travel, { width: 30 * k + 'px', height: 30 * k + 'px' });
    later(() => {
      const hues = ['#cba0d8', '#9fd8ff', '#ffd1f0', '#b6a8ff', '#ffffff'];
      burst(dst, 14, k, { cls: 'fxbFacet', dist: [40, 120], dur: [600, 950], size: [9, 18], spin: 220, style: i => ({ '--c': hues[i % hues.length] }) });
      burst(dst, 5, k, { cls: 'fxbGlint', dist: [10, 60], dur: [500, 800], size: [10, 16], spin: 90, delay: 80 });
    }, travel);
  },
  Wind(src, dst, r, k, c, travel) {
    const dir = dst.x >= src.x ? 1 : -1, w = r.width * 1.6, h = r.height * .8;
    for (let i = 0; i < 3; i++) {
      const y = dst.y + (i - 1) * r.height * .22, x0 = dst.x - dir * w * .7, x1 = dst.x + dir * w * .25;
      spawn('fxbGust', [{ transform: at(x0, y, `scaleX(${dir})`), opacity: 0 }, { transform: at((x0 + x1) / 2, y, `scaleX(${dir})`), opacity: 1, offset: .5 },
        { transform: at(x1, y - 8 * k, `scaleX(${dir})`), opacity: 0 }],
      { duration: travel + 520, delay: i * 70, easing: 'cubic-bezier(.3,.2,.4,1)' }, { part: false, style: { width: w * .7 + 'px', height: h * .35 + 'px' },
        html: svg(100, 30, '<path pathLength="100" d="M2 20 C 30 20, 50 4, 72 8 S 96 22, 84 26 S 70 18, 76 14"/>') });
    }
    later(() => burst(dst, 10, k, { cls: 'fxbMote', dist: [40, 120], dur: [500, 800], size: [4, 7], style: () => ({}) }), travel);
  }
};
function smoke(src, dst, r, k, travel, moon) {
  if (moon) {
    // Two crescent slashes sweep across the target.
    for (let i = 0; i < 2; i++) {
      const s = 110 * k, sx = dst.x + (i ? 1 : -1) * 70 * k;
      spawn('fxbCrescent', [{ transform: at(src.x, src.y, `rotate(${i ? 40 : -40}deg) scale(.3)`), opacity: 0 }, { transform: at((src.x + dst.x) / 2, (src.y + dst.y) / 2 - 30 * k, `rotate(${i ? 120 : 60}deg) scale(.8)`), opacity: 1, offset: .5 },
        { transform: at(sx, dst.y, `rotate(${i ? 260 : 200}deg) scale(1.15)`), opacity: 0 }], { duration: travel + 520, delay: i * 90, easing: 'cubic-bezier(.4,.1,.4,1)' },
      { part: false, style: { width: s + 'px', height: s + 'px' }, html: svg(100, 100, '<path d="M70 8 A 46 46 0 1 0 70 92 A 36 36 0 1 1 70 8 Z"/>') });
    }
  } else projectile('fxbOrb shadow', src, dst, k, travel, { width: 40 * k + 'px', height: 40 * k + 'px' });
  later(() => {
    for (let i = 0; i < 9; i++) {
      const a = rnd(0, Math.PI * 2), d = rnd(10, 70) * k, s = rnd(50, 90) * k;
      spawn('fxbSmoke' + (moon ? ' moon' : ''), [{ transform: at(dst.x + Math.cos(a) * d * .3, dst.y + Math.sin(a) * d * .3, 'scale(.3)'), opacity: 0 },
        { transform: at(dst.x + Math.cos(a) * d, dst.y + Math.sin(a) * d, 'scale(1)'), opacity: .85, offset: .3 },
        { transform: at(dst.x + Math.cos(a) * d * 1.4, dst.y + Math.sin(a) * d * 1.4 - 30 * k, 'scale(1.5)'), opacity: 0 }],
      { duration: rnd(800, 1100), delay: i * 25 }, { style: { width: s + 'px', height: s + 'px' } });
    }
  }, travel);
}

/* Evolution and stepping into the Active spot */
function entrance(host, el, evolved) {
  const r = rectOf(host); if (!r || calm()) return;
  const color = ELEMENT_COLORS[el] || '#ffd36c', p = centre(r), k = clamp(r.width / 220, .5, 1.25);
  const body = $('.pocketCreature', host) || $('.mythCard', host) || host.firstElementChild;
  if (evolved) {
    spawn('fxbPillar', [{ transform: at(p.x, p.y, 'scaleX(.2)'), opacity: 0 }, { transform: at(p.x, p.y, 'scaleX(1)'), opacity: 1, offset: .25 }, { transform: at(p.x, p.y, 'scaleX(1.3)'), opacity: 0 }],
      { duration: 900 }, { part: false, style: { '--c': color, width: r.width * .9 + 'px', height: r.height * 1.5 + 'px' } });
    burst(p, 12, k, { cls: 'fxbGlint', dist: [40, 120], up: 40, dur: [700, 1000], size: [10, 16], spin: 120, delay: 150 });
    spawn('fxbTag', [{ transform: at(p.x, r.top + 8, 'scale(.6)'), opacity: 0 }, { transform: at(p.x, r.top - 4, 'scale(1.05)'), opacity: 1, offset: .2 }, { transform: at(p.x, r.top - 4, 'scale(1)'), opacity: 1, offset: .8 }, { transform: at(p.x, r.top - 16, 'scale(.95)'), opacity: 0 }],
      { duration: 1500 }, { part: false, html: 'Evolved!', style: { '--c': color, fontSize: clamp(20 * k, 13, 22) + 'px' } });
    try { body?.animate([{ filter: 'brightness(2.4) saturate(.3)' }, { filter: 'brightness(1)' }], { duration: 700 * pace(), easing: 'ease-out' }); } catch { /* ignore */ }
  } else {
    impactRing(p, k, color, false);
    try { body?.animate([{ transform: 'translateY(14px) scale(.9)', opacity: .4 }, { transform: 'translateY(-4px) scale(1.03)', opacity: 1, offset: .6 }, { transform: 'none', opacity: 1 }], { duration: 420 * pace(), easing: 'cubic-bezier(.3,1.3,.5,1)', composite: 'add' }); } catch { /* ignore */ }
  }
}

/* ------------------------------------------------------------ Styles (injected here; theme.css untouched) */
const CSS = `
#fxbLayer{position:fixed;inset:0;pointer-events:none;z-index:9350;overflow:hidden;contain:strict}
#fxbLayer .fxb{position:fixed;left:0;top:0;pointer-events:none;will-change:transform,opacity}
#fxbLayer svg{display:block;overflow:visible}
.fxbRing{border-radius:50%;border:3px solid var(--c);box-shadow:0 0 18px var(--c),inset 0 0 14px var(--c)}
.fxbFlash{border-radius:50%;background:radial-gradient(circle,#fff 0,var(--c) 30%,transparent 68%);mix-blend-mode:screen}
.fxbFlash.white{background:radial-gradient(circle,#fff 0,#fff6c0 30%,transparent 66%)}
.fxbNum{display:flex;flex-direction:column;align-items:center;line-height:1;white-space:nowrap;font-family:system-ui,sans-serif;color:#fff}
.fxbNum b{font-weight:900;color:#fff;-webkit-text-stroke:.06em #1a0d16;paint-order:stroke fill;text-shadow:0 .05em 0 #000,0 0 .3em var(--c),0 0 .6em var(--c)}
.fxbNum small{font-size:.36em;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:var(--c);-webkit-text-stroke:.12em #1a0d16;paint-order:stroke fill;margin-bottom:.12em}
.fxbNum.weak b{color:#fff3c0}.fxbNum.heal b{color:#d9ffe9}
.fxbOrb{border-radius:50%}
.fxbOrb.fire{border-radius:50% 40% 40% 50%/50%;background:radial-gradient(circle at 70% 50%,#fff8d0 0,#ffc24a 25%,#ff6a1a 55%,transparent 72%);box-shadow:-18px 0 22px -6px #ff7a1a;filter:drop-shadow(0 0 8px #ff8a2a)}
.fxbOrb.water{background:radial-gradient(circle at 65% 40%,#fff 0,#bfeaff 20%,#4fb3e0 55%,transparent 72%);box-shadow:-14px 0 18px -6px #64b5d6}
.fxbOrb.crystal{border-radius:3px;background:linear-gradient(135deg,#fff,#cba0d8 45%,#8fd3ff);clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);filter:drop-shadow(0 0 6px #cba0d8)}
.fxbOrb.shadow{background:radial-gradient(circle,#2a1640 0,#5c3b86 40%,transparent 70%);box-shadow:0 0 22px 6px rgba(146,118,181,.6)}
.fxbBlast.fire{border-radius:50%;background:radial-gradient(circle,#fff6c4 0,#ffb340 22%,#ff5a1a 48%,rgba(160,30,10,.0) 70%);mix-blend-mode:screen}
.fxbEmber{border-radius:50%;background:radial-gradient(circle,#fff3b0,#ff9a2a 55%,transparent 72%);box-shadow:0 0 8px #ff7a1a}
.fxbBolt polyline{fill:none;stroke-linejoin:round;stroke-linecap:round}
.fxbBolt .glow{stroke:#e3c857;stroke-width:10;opacity:.55;filter:blur(3px)}
.fxbBolt .core{stroke:#fffbe0;stroke-width:3}
.fxbSpark{width:3px!important;height:16px!important;border-radius:2px;background:linear-gradient(#fff,#e3c857);box-shadow:0 0 6px #ffe36a;rotate:var(--r)}
.fxbDrop{border-radius:50% 50% 50% 0;rotate:-45deg;background:radial-gradient(circle at 35% 35%,#fff,#9fdcf5 35%,#3f9fd0);box-shadow:0 0 6px rgba(100,181,214,.7)}
.fxbRipple{border-radius:50%;border:3px solid #9fdcf5;box-shadow:0 0 12px #64b5d6}
.fxbLeaf{border-radius:0 100% 0 100%;rotate:var(--h);background:linear-gradient(135deg,#b8f0a0,#4f9f5f);box-shadow:inset 0 0 0 1px rgba(30,70,30,.35)}
.fxbVines path{fill:none;stroke:#4f9f5f;stroke-width:3.2;stroke-linecap:round;stroke-dasharray:140;stroke-dashoffset:140;animation:fxbDraw .55s ease-out forwards;filter:drop-shadow(0 0 3px #72b987)}
.fxbVines path:nth-child(2){animation-delay:.08s}.fxbVines path:nth-child(3){animation-delay:.16s;stroke:#72b987}
@keyframes fxbDraw{to{stroke-dashoffset:0}}
.fxbShard.ice{clip-path:polygon(0 50%,30% 0,100% 50%,30% 100%);background:linear-gradient(90deg,#e8fbff,#9bd5dd 60%,#fff);filter:drop-shadow(0 0 4px #bff0ff)}
.fxbFrost{border-radius:14px;background:radial-gradient(ellipse at center,rgba(230,250,255,.0) 35%,rgba(190,235,245,.55) 75%,rgba(255,255,255,.75));box-shadow:inset 0 0 26px rgba(255,255,255,.8),0 0 18px rgba(155,213,221,.7);mix-blend-mode:screen}
.fxbGlint{clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%);background:#fff;filter:drop-shadow(0 0 4px #cfefff)}
.fxbFacet{clip-path:polygon(50% 0,100% 38%,80% 100%,20% 100%,0 38%);background:linear-gradient(160deg,#fff,var(--c));opacity:.95}
.fxbSmoke{border-radius:50%;background:radial-gradient(circle,rgba(70,40,110,.85),rgba(40,20,70,.5) 45%,transparent 70%);filter:blur(2px)}
.fxbSmoke.moon{background:radial-gradient(circle,rgba(167,150,220,.75),rgba(80,60,140,.45) 45%,transparent 70%)}
.fxbCrescent path{fill:#e6deff;filter:drop-shadow(0 0 6px #a796dc) drop-shadow(0 0 14px #a796dc)}
.fxbGust path{fill:none;stroke:#e9fff8;stroke-width:3;stroke-linecap:round;stroke-dasharray:60 40;stroke-dashoffset:100;animation:fxbGust .8s ease-out forwards;filter:drop-shadow(0 0 4px #86cbb6)}
@keyframes fxbGust{to{stroke-dashoffset:-40}}
.fxbMote{border-radius:50%;background:#e9fff8;box-shadow:0 0 6px #86cbb6}
.fxbPillar{border-radius:40%;background:linear-gradient(90deg,transparent,var(--c) 30%,#fff 50%,var(--c) 70%,transparent);filter:blur(1px);mix-blend-mode:screen;opacity:.8}
.fxbTag{font:900 20px system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#fff;-webkit-text-stroke:.12em #1a0d16;paint-order:stroke fill;text-shadow:0 0 10px var(--c),0 0 20px var(--c);white-space:nowrap}
/* This module replaces the older generic attack line, side lunge and damage number while it is active. */
body.fxbOn .bxLunge,body.fxbOn .bxLungeL{animation:none!important}
body.fxbOn #fxLayer .fxFloat,body.fxbOn #fxLayer .fxStreak{display:none!important}
`;
function injectCSS() {
  if ($('#fx-battle-css')) return;
  const s = document.createElement('style'); s.id = 'fx-battle-css'; s.textContent = CSS; document.head.appendChild(s);
}

if (B) {
  injectCSS();
  addEventListener('ember:cardBattle', e => { try { onBattle(e.detail); } catch (err) { console.warn('fx-battle', err); } });
  addEventListener('ember:spectateBattle', e => { try { onBattle(e.detail); } catch (err) { console.warn('fx-battle', err); } });
  addEventListener('ember:frame', e => { if (e.detail?.view !== 'cardBattle') { document.body.classList.remove('fxbOn'); $('#fxbLayer')?.replaceChildren(); live = 0; } });
  addEventListener('ember:cardResult', () => { prev = null; lastSig = ''; });
}
