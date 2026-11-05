// Pack opening effects: a pack that tears open, rarity-coloured glow and turning light rays behind every
// revealed card, a stronger build-up before special cards land, and a sparkle / flash / confetti fanfare for the
// rarest pulls and mutated cards. Presentation only: it never changes what a pack gives, coins or the save.
// Talks to the game only through window.EmberBridge, ember:* events and the page.
import { MUTATIONS } from '/combat-rules.js';
import { fxCalm, fxLight, fxCount } from '/fx-level.js';

const B = window.EmberBridge;
const RARITY_COLORS = ['#aebce2', '#7be7b3', '#72b5ff', '#c18aff', '#ffd568', '#73f0f1', '#ff88d4'];
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
// Effects setting: Off = no decorative animation; Light = no flashes or confetti, a third of the sparkles, shorter fanfares.
const calm = fxCalm;
const rand = (a, b) => a + Math.random() * (b - a);
const mutOf = c => MUTATIONS.find(m => m.id === c?.mutation) || null;
const packOf = c => { try { return B.packCatalog().find(p => p.id === (c?.sourcePack || B.state.pendingPack?.packId)) || null; } catch { return null; } };
const rankOf = c => { try { return B.rarityRank(c); } catch { return 0; } };
const colorOf = c => RARITY_COLORS[rankOf(c)] || '#ffd568';

// How special a pull is, judged against the pack it came from (a shiny from a pack where every card is shiny
// is not a surprise). 2 = big fanfare, 1 = fanfare, 0 = none.
function hype(c) {
  if (!c) return 0;
  const m = mutOf(c), p = packOf(c), idx = m ? MUTATIONS.indexOf(m) : -1;
  if (c.secret || m?.packOnly || idx >= 8) return 2;
  if (m || (c.shiny && (p ? p.shiny < .5 : rankOf(c) < 4))) return 1;
  return 0;
}
// Colours for sparkles and confetti: rarity colour, mutation colour, gold and white.
function palette(c) {
  const out = [colorOf(c)], m = mutOf(c);
  if (m?.color) out.push(m.color);
  out.push('#ffe9a8', '#ffffff');
  return out;
}

/* ---------------------------------------------------------------- Layer and small helpers */
function layer() {
  let l = $('#fxpLayer');
  if (!l) { l = document.createElement('div'); l.id = 'fxpLayer'; l.setAttribute('aria-hidden', 'true'); document.body.appendChild(l); }
  return l;
}
const live = new Set(); // elements we added that should go when the player leaves the pack screens
function add(el, parent = layer(), ttl = 0) {
  parent.appendChild(el); live.add(el);
  if (ttl) setTimeout(() => drop(el), ttl);
  return el;
}
function drop(el) { live.delete(el); el.remove(); }
function el(cls, html = '') { const d = document.createElement('div'); d.className = cls; if (html) d.innerHTML = html; return d; }
const anim = (node, frames, opts) => { try { const a = node.animate(frames, opts); a.finished.then(() => drop(node), () => drop(node)); return a; } catch { drop(node); return null; } };
const centerOf = node => { const r = node?.getBoundingClientRect?.(); return r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width } : { x: innerWidth / 2, y: innerHeight * .45, w: 240 }; };
const small = () => innerWidth < 700;

function flash(color, strength = .45) {
  if (fxLight()) return;
  const f = add(el('fxpFlash')); f.style.background = `radial-gradient(circle at 50% 45%,#fff,${color} 45%,transparent 80%)`;
  anim(f, [{ opacity: 0 }, { opacity: strength, offset: .18 }, { opacity: 0 }], { duration: 520, easing: 'ease-out' });
}
function ring({ x, y }, color, size = 160, dur = 700) {
  const r = add(el('fxpRing')); Object.assign(r.style, { left: x + 'px', top: y + 'px', width: size + 'px', height: size + 'px', '--c': color });
  anim(r, [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(3.2)', opacity: 0 }], { duration: dur, easing: 'cubic-bezier(.15,.7,.3,1)' });
}
function sparkles({ x, y }, colors, n, reach = 180) {
  n = fxCount(Math.min(n, small() ? 22 : 40));
  for (let i = 0; i < n; i++) {
    const s = add(el('fxpSpark')), a = (i / n) * Math.PI * 2 + rand(-.2, .2), d = reach * rand(.55, 1.15), c = colors[i % colors.length];
    Object.assign(s.style, { left: x + 'px', top: y + 'px', '--c': c });
    anim(s, [{ transform: 'translate(-50%,-50%) scale(.4) rotate(0)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d * .75}px),calc(-50% + ${Math.sin(a) * d * .75}px)) scale(1.2) rotate(90deg)`, opacity: 1, offset: .55 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px),calc(-50% + ${Math.sin(a) * d + 30}px)) scale(.2) rotate(180deg)`, opacity: 0 }],
    { duration: rand(700, 1100), easing: 'cubic-bezier(.1,.8,.3,1)' });
  }
}
function confetti({ x, y }, colors, n) {
  if (fxLight()) return;
  n = Math.min(n, small() ? 34 : 64);
  colors = window.EmberSeasons?.confetti?.(colors) || colors; // seasonal colours mixed in (seasons.js)
  for (let i = 0; i < n; i++) {
    const c = add(el('fxpConfetti')), w = rand(6, 11), dx = rand(-1, 1) * Math.min(innerWidth * .55, 520), up = rand(140, 320);
    Object.assign(c.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: w * rand(1.3, 1.9) + 'px', background: colors[i % colors.length], borderRadius: i % 3 ? '2px' : '50%' });
    anim(c, [{ transform: 'translate(-50%,-50%) rotate(0) scale(.6)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * .6}px),calc(-50% - ${up}px)) rotate(${rand(180, 540)}deg) scale(1)`, opacity: 1, offset: .35 },
      { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${innerHeight * rand(.35, .6)}px)) rotate(${rand(700, 1300)}deg) scale(.9)`, opacity: 0 }],
    { duration: rand(1600, 2400), delay: rand(0, 160), easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'backwards' });
  }
}
// The whole celebration for a special card, centred on a point.
function fanfare(c, at, level = hype(c)) {
  if (!level || calm()) return;
  const cols = palette(c), color = cols[0];
  flash(color, level >= 2 ? .6 : .38);
  ring(at, color, 170, 800);
  if (fxLight()) { sparkles(at, cols, level >= 2 ? 40 : 24, level >= 2 ? 200 : 150); return; } // Light: one ring and one small sparkle burst
  if (level >= 2) setTimeout(() => ring(at, cols[1] || '#fff', 140, 900), 140);
  sparkles(at, cols, level >= 2 ? 40 : 24, level >= 2 ? 230 : 170);
  confetti(at, cols, level >= 2 ? 64 : 34);
  if (level >= 2) setTimeout(() => sparkles(at, cols.slice().reverse(), 22, 300), 260);
}

/* ---------------------------------------------------------------- Light rays behind a card */
// A slowly turning ray wheel plus a soft glow, in the card's rarity colour (and its mutation colour when it has one).
function aura(c, extra = '') {
  const rank = rankOf(c), m = mutOf(c), color = colorOf(c), level = hype(c);
  const a = el('fxpAura' + (level ? ' fxpHot' + level : '') + (rank >= 6 || m?.id === 'cosmic' || m?.id === 'prism' ? ' fxpPrism' : '') + extra,
    '<i class="fxpRays"></i><i class="fxpRays fxpRays2"></i><i class="fxpGlow"></i>');
  a.style.setProperty('--c', color); a.style.setProperty('--c2', m?.color || color);
  a.style.setProperty('--n', String(8 + rank * 2)); // more rays for rarer cards
  a.style.setProperty('--o', String(Math.min(1, .45 + rank * .09 + level * .12)));
  a.style.setProperty('--spin', (26 - rank * 2.2 - level * 3) + 's');
  a.setAttribute('aria-hidden', 'true');
  return a;
}

/* ---------------------------------------------------------------- 1. Pack tears open */
let tearAt = 0;
function tear(c) {
  if (calm() || Date.now() - tearAt < 1500) return;
  tearAt = Date.now();
  const p = packOf(c), color = RARITY_COLORS[Math.max(0, B.RARITIES.indexOf(p?.rarity))] || '#ffd568';
  const face = `<div class="fxpFace"><span class="fxpCrimp"></span><span class="fxpIcon">${p?.icon || '🎁'}</span><b>EMBERLINGS</b><small>${(p?.name || 'Pack').replace(/[<>&]/g, '')}</small><em>5 MYTHLINGS</em><span class="fxpCrimp fxpCrimpB"></span></div>`;
  const wrap = add(el('fxpTear', `<div class="fxpBack"></div><div class="fxpPack"><div class="fxpHalf fxpTop">${face}</div><div class="fxpHalf fxpBot">${face}</div><div class="fxpSeam"></div></div>`), layer(), 1800);
  wrap.style.setProperty('--c', color);
  const back = $('.fxpBack', wrap), pack = $('.fxpPack', wrap), top = $('.fxpTop', wrap), bot = $('.fxpBot', wrap), seam = $('.fxpSeam', wrap);
  const A = (n, f, o) => { try { return n.animate(f, { fill: 'forwards', ...o }); } catch { return null; } };
  A(back, [{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .55 }, { opacity: 0 }], { duration: 1500 });
  A(pack, [{ transform: 'translateY(40px) scale(.55) rotate(-6deg)', opacity: 0 }, { transform: 'translateY(0) scale(1) rotate(0)', opacity: 1, offset: .25 },
    { transform: 'translate(-3px,1px) rotate(-1.5deg) scale(1.01)', offset: .4 }, { transform: 'translate(4px,-1px) rotate(2deg) scale(1.03)', offset: .5 },
    { transform: 'translate(-5px,2px) rotate(-2.5deg) scale(1.05)', offset: .6 }, { transform: 'translate(6px,-2px) rotate(3deg) scale(1.07)', offset: .7 },
    { transform: 'translate(0,0) rotate(0) scale(1.1)' }], { duration: 640, easing: 'ease-out' });
  A(seam, [{ opacity: 0, transform: 'scaleX(.1)' }, { opacity: 0, offset: .4 }, { opacity: 1, transform: 'scaleX(1)' }], { duration: 640 });
  setTimeout(() => {
    if (!wrap.isConnected) return;
    A(seam, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
    A(top, [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(-70px,-${small() ? 220 : 300}px) rotate(-38deg)`, opacity: 0 }], { duration: 620, easing: 'cubic-bezier(.2,.7,.3,1)' });
    A(bot, [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(50px,${small() ? 240 : 320}px) rotate(16deg)`, opacity: 0 }], { duration: 680, easing: 'cubic-bezier(.4,0,.8,.6)' });
    const at = centerOf(pack);
    flash(color, .4); ring(at, color, 200, 750); sparkles(at, [color, '#ffe9a8', '#fff'], 28, 210);
    const burst = add(el('fxpBurst'), wrap); burst.style.setProperty('--c', color);
    anim(burst, [{ transform: 'translate(-50%,-50%) scale(.2) rotate(0)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1) rotate(25deg)', opacity: 1, offset: .25 }, { transform: 'translate(-50%,-50%) scale(1.5) rotate(60deg)', opacity: 0 }], { duration: 850, easing: 'ease-out' });
  }, 640);
}

/* ---------------------------------------------------------------- 2. Build-up during the shuffle */
let rolled = null, rollRun = 0;
function buildUp(c) {
  const st = $('.psStage'); if (!st || st.dataset.fxp || !c) return; st.dataset.fxp = '1';
  const center = $('.psCenter', st); if (!center) return;
  const level = Math.max(hype(c), rankOf(c) >= 4 ? 1 : 0), color = colorOf(c), run = ++rollRun, t0 = performance.now();
  const rays = aura(c, ' fxpCharge'); center.prepend(rays);
  st.classList.add('fxpRoll'); if (level) st.classList.add('fxpHype' + level);
  // Little sparks pulled towards the card, more and faster for special pulls.
  let motes = 0;
  const mote = () => {
    if (run !== rollRun || !st.isConnected || st.classList.contains('psDone')) return;
    const k = Math.min(1, (performance.now() - t0) / 2400), gap = level ? (level >= 2 ? 70 : 110) - k * 40 : 220;
    if (motes < fxCount(small() ? 10 : 18)) {
      const m = el('fxpMote'), a = rand(0, Math.PI * 2), d = rand(150, 260) * (small() ? .75 : 1);
      m.style.setProperty('--c', Math.random() < .25 ? '#fff' : color); motes++;
      add(m, center);
      const a2 = anim(m, [{ transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(.5)`, opacity: 0 }, { opacity: 1, offset: .3 }, { transform: 'translate(0,0) scale(1.4)', opacity: 0 }],
        { duration: 650 - k * 200, easing: 'cubic-bezier(.5,0,.9,.6)' });
      a2?.finished.finally?.(() => motes--); if (!a2) motes--;
    }
    setTimeout(mote, Math.max(35, gap));
  };
  if (level || rankOf(c) >= 2) mote();
  // Heartbeat: rings that pull in towards the card, quicker as the roll slows down.
  const beat = () => {
    if (run !== rollRun || !st.isConnected || st.classList.contains('psDone')) return;
    const k = Math.min(1, (performance.now() - t0) / 2400);
    if (k > .35) {
      const r = add(el('fxpPull'), center); r.style.setProperty('--c', color);
      anim(r, [{ transform: 'translate(-50%,-50%) scale(2.6)', opacity: 0 }, { opacity: level >= 2 ? .9 : .6, offset: .5 }, { transform: 'translate(-50%,-50%) scale(.55)', opacity: 0 }], { duration: 520, easing: 'ease-in' });
    }
    setTimeout(beat, Math.max(170, 520 - k * 360));
  };
  if (level) beat();
  let vig = null;
  if (level >= 2 && !fxLight()) { vig = add(el('fxpVignette')); vig.style.setProperty('--c', color); }
  const land = () => {
    if (run !== rollRun) return;
    rays.classList.remove('fxpCharge'); rays.classList.add('fxpLanded');
    if (vig) { anim(vig, [{ opacity: getComputedStyle(vig).opacity }, { opacity: 0 }], { duration: 400 }); vig = null; }
    if (level && !calm()) {
      const at = centerOf($('.psCard', st));
      ring(at, color, 180, 750); sparkles(at, palette(c), level >= 2 ? 30 : 16, 200);
      if (level >= 2) flash(color, .35);
    }
  };
  if (st.classList.contains('psDone')) land();
  else new MutationObserver((_, o) => { if (st.classList.contains('psDone') || !st.isConnected) { o.disconnect(); if (st.isConnected) land(); } }).observe(st, { attributes: true, attributeFilter: ['class'] });
}

/* ---------------------------------------------------------------- 3. Single reveal (one by one) */
let revealRun = 0;
function decorateReveal(c) {
  const host = $('#packCreature'); if (!host || host.querySelector('.fxpAura')) return;
  c = c || B.state.owned?.find(o => o.id === host.dataset.resultId); if (!c) return;
  host.classList.add('fxpHost'); host.prepend(aura(c));
  const sec = host.closest('.rarityReveal'); if (sec) sec.classList.add('fxpReveal');
}
function onReveal(c) {
  if (!c) return;
  const run = ++revealRun, level = hype(c);
  requestAnimationFrame(() => decorateReveal(c));
  if (!level || calm()) return;
  const host = $('#packCreature');
  // Without the 3D scene the card itself charges up, shakes and then pops.
  host?.classList.add('fxpCharging');
  let seen = false, fired = false, t0 = performance.now();
  const fire = () => {
    if (fired || run !== revealRun || B.view !== 'reveal') return; fired = true;
    host?.classList.remove('fxpCharging'); host?.classList.add('fxpPop');
    const stage = $('.fxStage');
    fanfare(c, stage && !stage.classList.contains('fxOut') ? { x: innerWidth / 2, y: innerHeight * .5 } : centerOf(host), level);
  };
  // The 3D pack reveal (when it runs) bursts about 1 s after it appears; celebrate on that burst,
  // or straight away if the player taps to skip it.
  let charge = null;
  const watch = () => {
    if (fired || run !== revealRun) { charge && drop(charge); return; }
    const stage = $('.fxStage'), now = performance.now();
    if (stage && !seen) {
      seen = true; t0 = now;
      charge = add(el('fxpCharge3d')); charge.style.setProperty('--c', colorOf(c));
      if (level >= 2) charge.classList.add('fxpBig');
    }
    if (seen && (!stage || stage.classList.contains('fxOut') || now - t0 >= 1050)) { charge && drop(charge); charge = null; return fire(); }
    if (!seen && now - t0 > 520) return fire(); // no 3D scene: the card's own charge-up has run
    requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
}

/* ---------------------------------------------------------------- 4. Reveal all (summary) */
function decorateSummary(list) {
  const cards = $$('.packResults .revealResult'); if (!cards.length) return;
  const byId = new Map((list || B.state.owned || []).map(c => [c.id, c]));
  let best = null, bestLevel = 0, bestEl = null;
  cards.forEach((sec, i) => {
    const c = byId.get(sec.dataset.resultId) || B.state.owned?.find(o => o.id === sec.dataset.resultId); if (!c || sec.querySelector('.fxpAura')) return;
    // The rays sit on the card panel (the portrait clips its own corners), centred on the portrait.
    const art = $('.creature', sec) || sec, a = aura(c, ' fxpMini');
    sec.classList.add('fxpHost'); sec.prepend(a);
    if (art !== sec) a.style.top = (art.offsetTop + art.offsetHeight / 2) + 'px';
    sec.classList.add('fxpResult'); const lv = hype(c);
    if (lv) { sec.classList.add('fxpSpecial'); sec.style.setProperty('--c', colorOf(c)); }
    if (lv > bestLevel) { best = c; bestLevel = lv; bestEl = art; }
    if (lv && !calm()) setTimeout(() => { if (B.view === 'packSummary' && art.isConnected) sparkles(centerOf(art), palette(c), lv >= 2 ? 18 : 12, 120); }, 250 + i * 70);
  });
  if (best && !calm()) setTimeout(() => { if (B.view === 'packSummary' && bestEl.isConnected) fanfare(best, centerOf(bestEl), bestLevel); }, 450);
}

/* ---------------------------------------------------------------- Wiring */
// Leaving a pack screen: stop build-ups and charge-ups, but let falling confetti and sparkles finish.
const KEEP = ['fxpConfetti', 'fxpSpark', 'fxpRing', 'fxpFlash'];
function cleanup() { rollRun++; revealRun++; for (const n of [...live]) if (!KEEP.some(k => n.classList.contains(k))) drop(n); }
function injectCSS() {
  if ($('#fx-packs-css')) return;
  const s = document.createElement('style'); s.id = 'fx-packs-css';
  s.textContent = `
#fxpLayer{position:fixed;inset:0;z-index:9600;pointer-events:none;overflow:hidden;contain:strict}
#fxpLayer *,.fxpAura,.fxpAura *,.fxpMote,.fxpPull{pointer-events:none}
.fxpFlash{position:absolute;inset:0;opacity:0;mix-blend-mode:screen}
.fxpRing{position:absolute;border-radius:50%;border:4px solid var(--c);box-shadow:0 0 24px var(--c),inset 0 0 18px var(--c);opacity:0;will-change:transform,opacity}
.fxpSpark{position:absolute;width:12px;height:12px;background:var(--c);clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);filter:drop-shadow(0 0 6px var(--c));will-change:transform,opacity}
.fxpConfetti{position:absolute;will-change:transform,opacity}
.fxpVignette{position:absolute;inset:0;--c:#ffd568;box-shadow:inset 0 0 150px 30px color-mix(in srgb,var(--c) 75%,transparent);opacity:0;animation:fxpVig 2.4s ease-in forwards}
@keyframes fxpVig{0%{opacity:0}60%{opacity:.55}70%{opacity:.35}80%{opacity:.8}90%{opacity:.5}100%{opacity:1}}
.fxpCharge3d{position:absolute;inset:0;opacity:0;background:radial-gradient(circle at 50% 50%,transparent 30%,color-mix(in srgb,var(--c) 40%,transparent) 75%,transparent);animation:fxpCharge3d 1.05s ease-in forwards}
.fxpCharge3d.fxpBig{background:radial-gradient(circle at 50% 50%,transparent 25%,color-mix(in srgb,var(--c) 60%,transparent) 70%,#0000)}
@keyframes fxpCharge3d{0%{opacity:0;transform:scale(1.3)}70%{opacity:.6}85%{opacity:.35}100%{opacity:1;transform:scale(1)}}

/* Pack tear */
.fxpTear{position:absolute;inset:0;display:grid;place-items:center}
.fxpBack{position:absolute;inset:0;opacity:0;background:radial-gradient(circle at 50% 50%,color-mix(in srgb,var(--c) 30%,#0000),#05081acc 70%)}
.fxpPack{position:relative;width:min(220px,46vw);aspect-ratio:.68;opacity:0;filter:drop-shadow(0 18px 30px #000a) drop-shadow(0 0 22px color-mix(in srgb,var(--c) 60%,#0000))}
.fxpHalf{position:absolute;inset:0;will-change:transform,opacity}
.fxpTop{clip-path:polygon(0 0,100% 0,100% 27%,92% 30%,84% 25%,76% 31%,67% 26%,58% 32%,50% 26%,41% 31%,33% 25%,24% 30%,16% 26%,8% 31%,0 27%)}
.fxpBot{clip-path:polygon(0 27%,8% 31%,16% 26%,24% 30%,33% 25%,41% 31%,50% 26%,58% 32%,67% 26%,76% 31%,84% 25%,92% 30%,100% 27%,100% 100%,0 100%)}
.fxpFace{position:absolute;inset:0;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:#fff;text-align:center;
 background:linear-gradient(115deg,#ffffff00 30%,#ffffff55 45%,#ffffff00 60%),radial-gradient(circle at 50% 38%,color-mix(in srgb,var(--c) 85%,#fff),color-mix(in srgb,var(--c) 55%,#1a1030) 55%,#1a1030);border:3px solid #e8bd64;box-sizing:border-box}
.fxpFace b{font:900 clamp(15px,4.4vw,21px)/1 system-ui,sans-serif;letter-spacing:.08em;color:#ffe9a8;text-shadow:0 2px 0 #6a3410,0 0 12px #000}
.fxpFace small{font:800 12px/1.1 system-ui,sans-serif;text-shadow:0 1px 3px #000}
.fxpFace em{font:800 10px/1 system-ui,sans-serif;font-style:normal;letter-spacing:.12em;padding:3px 8px;border-radius:99px;background:#0006}
.fxpIcon{font-size:clamp(42px,12vw,64px);line-height:1;filter:drop-shadow(0 4px 8px #0008)}
.fxpCrimp{position:absolute;left:0;right:0;top:0;height:16px;background:repeating-linear-gradient(90deg,#e8bd64 0 6px,#a8742e 6px 12px)}
.fxpCrimpB{top:auto;bottom:0}
.fxpSeam{position:absolute;left:-6%;right:-6%;top:27%;height:6px;margin-top:-3px;border-radius:6px;background:#fff;box-shadow:0 0 14px #fff,0 0 30px var(--c),0 0 60px var(--c);opacity:0}
.fxpBurst{position:absolute;left:50%;top:50%;width:min(720px,140vw);aspect-ratio:1;border-radius:50%;opacity:0;
 background:repeating-conic-gradient(from 0deg,color-mix(in srgb,var(--c) 70%,#fff0) 0 6deg,#fff0 6deg 22deg);-webkit-mask:radial-gradient(circle,#000 8%,#0000 68%);mask:radial-gradient(circle,#000 8%,#0000 68%)}

/* Light rays and glow behind cards */
.fxpHost{position:relative;isolation:isolate}
.fxpAura{position:absolute;left:50%;top:50%;width:190%;aspect-ratio:1;transform:translate(-50%,-50%);z-index:-1;--c:#ffd568;--c2:#ffd568;--n:10;--o:.6;--spin:22s;opacity:var(--o)}
.fxpAura>i{position:absolute;inset:0;border-radius:50%}
.fxpRays{background:repeating-conic-gradient(from 0deg,color-mix(in srgb,var(--c) 75%,#fff0) 0 calc(180deg / var(--n) * .35),#fff0 calc(180deg / var(--n) * .35) calc(360deg / var(--n)));
 -webkit-mask:radial-gradient(circle,#000 14%,#0008 38%,#0000 68%);mask:radial-gradient(circle,#000 14%,#0008 38%,#0000 68%);animation:fxpSpin var(--spin) linear infinite;will-change:transform}
.fxpRays2{background:repeating-conic-gradient(from 9deg,color-mix(in srgb,var(--c2) 55%,#fff0) 0 calc(180deg / var(--n) * .2),#fff0 calc(180deg / var(--n) * .2) calc(360deg / var(--n) * 1.5));animation-duration:calc(var(--spin) * 1.6);animation-direction:reverse;opacity:.8}
.fxpGlow{inset:22%!important;background:radial-gradient(circle,color-mix(in srgb,var(--c) 75%,#fff0),#fff0 70%);animation:fxpBreathe 2.6s ease-in-out infinite}
.fxpHot2 .fxpGlow{animation-duration:1.6s}
.fxpPrism .fxpRays,.fxpPrism .fxpRays2{animation:fxpSpin var(--spin) linear infinite,fxpHue 6s linear infinite}
.fxpPrism .fxpRays2{animation-direction:reverse,normal}
@keyframes fxpSpin{to{transform:rotate(360deg)}}
@keyframes fxpHue{to{filter:hue-rotate(360deg)}}
@keyframes fxpBreathe{50%{transform:scale(1.12);opacity:.75}}
.fxpReveal .fxpAura{animation:fxpAuraIn .9s cubic-bezier(.2,1.4,.4,1) both}
@keyframes fxpAuraIn{from{opacity:0;transform:translate(-50%,-50%) scale(.3)}to{opacity:var(--o);transform:translate(-50%,-50%) scale(1)}}
.fxpMini{width:min(150%,340px)}
.fxpResult.fxpHost{overflow:hidden}
.fxpResult .fxpAura{animation:fxpAuraIn .7s ease-out both}
.fxpSpecial{box-shadow:0 0 0 2px var(--c),0 0 26px color-mix(in srgb,var(--c) 70%,#0000)!important}
.fxpSpecial .pill{background:color-mix(in srgb,var(--c) 30%,#1a1030);box-shadow:0 0 12px color-mix(in srgb,var(--c) 70%,#0000)}

/* Shuffle build-up */
.fxpRoll .fxpAura{width:min(560px,150vw);z-index:0;opacity:.18;transition:opacity .4s}
.fxpRoll .fxpAura.fxpCharge{animation:fxpRamp 2.4s ease-in forwards}
.fxpHype1 .fxpAura.fxpCharge .fxpRays{animation-duration:9s}
.fxpHype2 .fxpAura.fxpCharge .fxpRays{animation-duration:5s}
.fxpRoll .fxpAura.fxpLanded{opacity:var(--o);animation:fxpAuraIn .8s cubic-bezier(.2,1.4,.4,1) both}
@keyframes fxpRamp{from{opacity:.12}to{opacity:calc(var(--o) * .85)}}
.fxpHype2.psTense .psCard{animation-duration:.08s}
.fxpHype2.psTense .psGlow{animation-duration:.3s}
.fxpPull{position:absolute;left:50%;top:50%;z-index:1;width:min(240px,60vw);aspect-ratio:1;border-radius:50%;border:3px solid var(--c);box-shadow:0 0 18px var(--c),inset 0 0 18px var(--c);opacity:0;will-change:transform,opacity}
.fxpMote{position:absolute;left:50%;top:50%;z-index:3;width:9px;height:9px;margin:-4.5px;border-radius:50%;background:var(--c);box-shadow:0 0 8px var(--c),0 0 2px #fff;will-change:transform,opacity}

/* Card charge-up when there is no 3D scene */
.fxpCharging{animation:fxpCharging .52s ease-in both!important}
@keyframes fxpCharging{0%{filter:brightness(.2) saturate(0)}40%{transform:translate(-2px,1px) scale(.96)}60%{transform:translate(3px,-1px) scale(.97)}80%{transform:translate(-3px,1px) scale(.98)}100%{filter:brightness(1.6);transform:scale(.98)}}
.fxpPop{animation:fxpPop .55s cubic-bezier(.2,1.6,.4,1) both!important}
@keyframes fxpPop{0%{transform:scale(.85);filter:brightness(1.8)}60%{transform:scale(1.08)}100%{transform:scale(1);filter:none}}

@media(max-width:700px){.fxpAura{width:165%}.fxpRoll .fxpAura{width:min(420px,120vw)}.psStage.fxpRoll{overflow-x:clip}}
.reduceMotion #fxpLayer{display:none}
.reduceMotion .fxpAura *{animation:none!important}
@media(prefers-reduced-motion:reduce){#fxpLayer{display:none}.fxpAura *{animation:none!important}}
html[data-fx=light] .fxpFlash,html[data-fx=light] .fxpConfetti,html[data-fx=light] .fxpVignette{display:none}
html[data-fx=light] .fxpCharging{animation-name:fxpChargeLight!important}
@keyframes fxpChargeLight{0%{filter:brightness(.4) saturate(.2)}100%{filter:brightness(1.3)}}
`;
  document.head.appendChild(s);
}

if (B) {
  injectCSS();
  addEventListener('ember:packRoll', e => {
    const c = e.detail?.creature; rolled = c;
    if (c && (B.state.pendingPack?.revealed || 0) === 0) tear(c);
  });
  addEventListener('ember:packReveal', e => onReveal(e.detail?.creature));
  addEventListener('ember:packSummary', e => requestAnimationFrame(() => decorateSummary(e.detail?.creatures)));
  addEventListener('ember:frame', e => {
    const v = e.detail?.view;
    if (v === 'packOpening') { if (!calm()) buildUp(rolled); return; }
    cleanup();
    if (v === 'reveal') requestAnimationFrame(() => decorateReveal());
  });
}
