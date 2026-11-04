// EMBERLINGS menu and reward effects: quick screen transitions, coin showers into the coin counter,
// a counter that counts up or down, a livelier level-up moment and an opening chest for daily rewards.
// Visual only. Talks to the game through window.EmberBridge, ember:* events and the DOM. Never changes the save.
import { fxCalm, fxCount } from '/fx-level.js';
const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = n => Math.floor(Number(n) || 0).toLocaleString();
// Effects setting: Off = no animation (numbers and pop-ups still show); Light = plain fade between screens, a third of the coins and stars.
const calm = fxCalm;
const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const rand = (a, b) => a + Math.random() * (b - a);
const MAX_PARTICLES = 70;
let live = 0;

/* ---------------------------------------------------------------- Layer and particles */
function layer() {
  let l = $('#fxmLayer');
  if (!l) { l = document.createElement('div'); l.id = 'fxmLayer'; l.setAttribute('aria-hidden', 'true'); document.body.appendChild(l); }
  return l;
}
// Adds a short-lived element to the effects layer; returns null when the particle budget is used up.
function spawn(cls, html = '', budget = true) {
  if (budget && live >= MAX_PARTICLES) return null;
  const el = document.createElement('div'); el.className = cls; if (html) el.innerHTML = html;
  layer().appendChild(el); if (budget) live++;
  let gone = false; el.done = () => { if (gone) return; gone = true; el.remove(); if (budget) live--; };
  return el;
}
const play = (el, frames, opts) => { const a = el.animate(frames, { fill: 'both', ...opts }); a.finished.then(el.done, el.done); setTimeout(el.done, (opts.duration || 0) + (opts.delay || 0) + 500); return a; };
const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const center = r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
function counterBox() { return $$('.top .coins').find(visible) || null; }
function counterRect() {
  const c = counterBox(); if (c) { const r = c.getBoundingClientRect(); if (r.width && r.bottom > 0) return r; }
  return { left: innerWidth - 90, top: 12, width: 70, height: 30 };
}

/* ---------------------------------------------------------------- Coin counter count-up */
let last = null, anim = null, extUntil = 0;
function writeCoins(n) {
  for (const box of $$('.top .coins')) { const b = $('b', box); if (b) b.textContent = fmt(n); else box.textContent = '🪙 ' + fmt(n); }
}
function pulse(on) { for (const box of $$('.top .coins')) box.classList.toggle('fxmCoinPulse', on); }
function bump() { const box = counterBox(); if (!box || calm()) return; box.classList.remove('fxmCoinBump'); void box.offsetWidth; box.classList.add('fxmCoinBump'); setTimeout(() => box.classList.remove('fxmCoinBump'), 260); }
// Counts the header coin total from one value to another. Always finishes on the real, saved total.
function countTo(from, to, { delay = 0, dur = 800 } = {}) {
  if (anim) cancelAnimationFrame(anim.raf);
  const a = anim = { from, to, t0: performance.now() + delay, dur, raf: 0 };
  const step = now => {
    if (anim !== a) return;
    const k = (now - a.t0) / a.dur;
    if (k >= 1) { writeCoins(B.state.coins); pulse(false); anim = null; last = Math.floor(B.state.coins); return; }
    writeCoins(k <= 0 ? a.from : Math.round(a.from + (a.to - a.from) * ease(k))); if (k > 0) pulse(true);
    a.raf = requestAnimationFrame(step);
  };
  writeCoins(from); a.raf = requestAnimationFrame(step);
}
function watchCoins() {
  if (!B?.state) return;
  const cur = Math.floor(Number(B.state.coins) || 0);
  if (last === null || calm() || performance.now() < extUntil) { last = cur; return; }
  if (cur === last) return;
  if (anim) { anim.to = cur; last = cur; return; }
  const diff = Math.abs(cur - last);
  countTo(last, cur, { dur: Math.min(1000, 450 + Math.log10(diff + 1) * 140) }); last = cur;
}

/* ---------------------------------------------------------------- Coin shower */
// Coins burst from a source rectangle and fly into the coin counter. Returns the time (ms) the first coins land.
function shower(src, amount, { delay = 0, count } = {}) {
  if (calm() || !(amount > 0)) return 0;
  const s = center(src), d = center(counterRect());
  const n = fxCount(count || Math.max(6, Math.min(26, Math.round(Math.log10(amount + 1) * 6))));
  let firstLand = Infinity;
  for (let i = 0; i < n; i++) {
    const el = spawn('fxmCoin'); if (!el) break;
    const mx = s.x + rand(-170, 170), my = s.y - rand(50, 170), dur = rand(820, 1100), dl = delay + i * 28;
    firstLand = Math.min(firstLand, dl + dur);
    play(el, [
      { transform: `translate(${s.x}px,${s.y}px) scale(.3) rotateY(0deg)`, opacity: 0 },
      { transform: `translate(${mx}px,${my}px) scale(1.05) rotateY(360deg)`, opacity: 1, offset: .38 },
      { transform: `translate(${d.x}px,${d.y}px) scale(.45) rotateY(900deg)`, opacity: .95 }
    ], { duration: dur, delay: dl, easing: 'cubic-bezier(.33,.55,.4,1)' });
  }
  for (let i = 0; i < 3; i++) setTimeout(() => { landing(); bump(); }, delay + 880 + i * 200);
  return firstLand;
}
function sourceBurst(src, delay = 0) {
  if (calm()) return;
  const c = center(src), el = spawn('fxmRing'); if (!el) return;
  play(el, [{ transform: `translate(${c.x}px,${c.y}px) scale(.2)`, opacity: .9 }, { transform: `translate(${c.x}px,${c.y}px) scale(2.4)`, opacity: 0 }], { duration: 520, delay, easing: 'ease-out' });
}
// Little sparkles where the coins land on the counter.
function landing() {
  const d = center(counterRect());
  for (let i = 0, n = fxCount(5); i < n; i++) {
    const el = spawn('fxmSpark'); if (!el) return;
    const a = rand(0, Math.PI * 2), r = rand(18, 40);
    play(el, [{ transform: `translate(${d.x}px,${d.y}px) scale(1)`, opacity: 1 }, { transform: `translate(${d.x + Math.cos(a) * r}px,${d.y + Math.sin(a) * r}px) scale(.2)`, opacity: 0 }], { duration: 420, easing: 'ease-out' });
  }
}
function floatLabel(text, rect, delay = 0) {
  if (calm()) return;
  const el = spawn('fxmPlus', '', false); el.textContent = text;
  const d = center(rect), y = Math.max(d.y + 26, 40);
  play(el, [{ transform: `translate(${d.x}px,${y}px) translate(-50%,0) scale(.6)`, opacity: 0 }, { transform: `translate(${d.x}px,${y + 6}px) translate(-50%,0) scale(1.05)`, opacity: 1, offset: .25 }, { transform: `translate(${d.x}px,${y + 26}px) translate(-50%,0) scale(1)`, opacity: 0 }], { duration: 1300, delay, easing: 'ease-out' });
}

let lastPress = null;
addEventListener('pointerdown', e => { const el = e.target.closest?.('button'); if (el) lastPress = { el, at: performance.now() }; }, { capture: true, passive: true });
/* Vault collect: enhancements.js already rains coins and ticks the counter; add the burst, the landing and a "+N". */
function onVaultCoins({ amount, to } = {}) {
  extUntil = performance.now() + 1700; last = Math.floor(Number(to ?? B.state.coins) || 0);
  if (!(amount > 0) || calm()) return;
  const btn = lastPress && performance.now() - lastPress.at < 1500 && lastPress.el.isConnected && visible(lastPress.el) ? lastPress.el : [$('#vaultCollectAll')].find(visible);
  const src = btn?.getBoundingClientRect() || { left: innerWidth / 2 - 40, top: innerHeight / 2, width: 80, height: 20 };
  sourceBurst(src);
  for (let i = 0; i < 3; i++) setTimeout(() => { landing(); bump(); }, 950 + i * 220);
  floatLabel('+' + fmt(amount), counterRect(), 900);
}

/* Victory: coins fly from the "coins" prize tile into the counter, which then counts up. */
function onCardResult(r) {
  const coins = Number(r?.rewards?.coins) || 0;
  if (!r?.victory || coins <= 0) return;
  const to = Math.floor(B.state.coins); last = to;
  if (calm()) return;
  const from = Math.max(0, to - coins);
  extUntil = performance.now() + 400;
  countTo(from, to, { delay: 2400, dur: 900 });
  // Wait for the Victory screen (results.js draws it two frames later) and the confetti.
  setTimeout(() => {
    if (B.view !== 'cardResult' || anim?.to !== to) return;
    const tile = $('#app .uiVLoot li.coin'); if (!tile || !visible(tile)) { countTo(from, to, { dur: 700 }); return; }
    const src = tile.getBoundingClientRect(); sourceBurst(src);
    tile.classList.add('fxmTileGlow');
    const land = shower(src, coins);
    floatLabel('+' + fmt(coins), counterRect(), land);
    countTo(from, to, { delay: Math.max(0, land - 60), dur: 900 });
  }, 650);
}

/* ---------------------------------------------------------------- Screen transitions */
const NO_FADE = new Set(['cardBattle', 'battle', 'cardResult', 'reveal', 'packOpening', 'packSummary', 'packReview', 'fusion-result', 'online', 'online-result', 'lobby', 'trade', 'tutorial']);
let prevView = null, fadeTimer = 0;
function onFrame(view) {
  const was = prevView; prevView = view;
  setTimeout(watchCoins, 0);
  if (!was || was === view || NO_FADE.has(view) || NO_FADE.has(was) || String(view).startsWith('train-') || String(was).startsWith('train-') || calm()) return;
  const app = $('#app'); if (!app) return;
  // A class (not inline styles) so pages that other modules repaint right after the draw fade in too.
  app.classList.remove('fxmEnter'); void app.offsetWidth; app.classList.add('fxmEnter');
  clearTimeout(fadeTimer); fadeTimer = setTimeout(() => app.classList.remove('fxmEnter'), 260);
}

/* ---------------------------------------------------------------- Level up */
function decorateLevelUp(o) {
  if (o.dataset.fxm || calm()) return; o.dataset.fxm = '1';
  const box = $('.uiFAbBox', o); if (!box) return;
  const rays = document.createElement('div'); rays.className = 'fxmLvRays'; rays.setAttribute('aria-hidden', 'true'); o.insertBefore(rays, box);
  box.classList.add('fxmLvBox');
  $('.uiLvNum', box)?.classList.add('fxmLvNum');
  const card = $('.uiLvCard', box); if (card) { card.classList.add('fxmLvCard'); const sh = document.createElement('i'); sh.className = 'fxmShine'; sh.setAttribute('aria-hidden', 'true'); card.appendChild(sh); }
  $$('.uiLvList li', box).forEach((li, i) => { li.classList.add('fxmLvItem'); li.style.animationDelay = (380 + i * 110) + 'ms'; });
  requestAnimationFrame(() => starBurst(($('.fxmLvNum', box) || box).getBoundingClientRect(), getComputedStyle(o).getPropertyValue('--glow').trim() || '#ffcf6a', 22, 120));
}
function starBurst(rect, color = '#ffd568', n = 14, delay = 0) {
  if (calm()) return;
  const c = center(rect); n = fxCount(n);
  for (let i = 0; i < n; i++) {
    const el = spawn('fxmStar'); if (!el) return; el.style.color = i % 3 ? color : '#fff6d8';
    const a = (i / n) * Math.PI * 2 + rand(-.2, .2), r = rand(60, 150);
    play(el, [{ transform: `translate(${c.x}px,${c.y}px) scale(.2) rotate(0deg)`, opacity: 0 }, { transform: `translate(${c.x + Math.cos(a) * r * .5}px,${c.y + Math.sin(a) * r * .5}px) scale(1.1) rotate(90deg)`, opacity: 1, offset: .3 }, { transform: `translate(${c.x + Math.cos(a) * r}px,${c.y + Math.sin(a) * r + 30}px) scale(.3) rotate(200deg)`, opacity: 0 }], { duration: rand(800, 1100), delay: delay + i * 12, easing: 'cubic-bezier(.2,.7,.4,1)' });
  }
}
// Plain level-ups only get a toast from levels.js; give that toast a small sparkle.
function onLevelUp() {
  if (calm()) return;
  requestAnimationFrame(() => { const t = $('#toast'); if (t && /^⬆/.test(t.textContent) && visible(t)) { const r = t.getBoundingClientRect(); if (r.width) { starBurst(r, '#ffd568', 10); t.classList.remove('fxmToastPop'); void t.offsetWidth; t.classList.add('fxmToastPop'); } } });
}

/* ---------------------------------------------------------------- Daily reward chest */
const CLAIM = '#dClaimLogin, #dClaimBonus, #dClaimWeek, [data-claim-quest]';
function snapshot() { const st = B.state; return { coins: Math.floor(st.coins || 0), passes: st.items?.trainingPasses || 0, packs: (st.rewardPacks || []).length }; }
function onClaimClick(e) {
  const btn = e.target.closest?.(CLAIM); if (!btn || btn.disabled || !btn.closest('#dailyPanel')) return;
  const before = snapshot(), rect = btn.getBoundingClientRect(), big = btn.id === 'dClaimLogin' || btn.id === 'dClaimWeek';
  const boxRect = $('#dailyPanel .dBox')?.getBoundingClientRect();
  setTimeout(() => {
    const after = snapshot(), coins = after.coins - before.coins, pass = after.passes - before.passes, pack = after.packs - before.packs;
    if (coins <= 0 && pass <= 0 && pack <= 0) return; // claim did not go through
    last = after.coins;
    if (calm()) return;
    if (coins > 0) { extUntil = performance.now() + 200; countTo(before.coins, after.coins, { delay: big ? 1450 : 1050, dur: 800 }); }
    chest({ big, at: big && boxRect ? { left: boxRect.left, top: boxRect.top + boxRect.height * .28, width: boxRect.width, height: 1 } : rect, coins, pass, pack });
  }, 0);
}
function chest({ big, at, coins, pass, pack }) {
  const c = center(at);
  const prize = coins > 0 ? `<span class="fxmPrizeIco">🪙</span>+${fmt(coins)}` : pass > 0 ? '<span class="fxmPrizeIco">🎟️</span>Academy Pass' : '<span class="fxmPrizeIco">🎁</span>Free pack';
  const el = spawn('fxmChest' + (big ? ' big' : ''), `<div class="fxmChRays"></div><div class="fxmChBody"><div class="fxmChBase"><i></i></div><div class="fxmChLid"><i></i></div></div><div class="fxmChPrize">${prize}</div>`, false);
  const size = big ? 150 : 96, x = Math.min(innerWidth - size / 2 - 8, Math.max(size / 2 + 8, c.x)), y = Math.min(innerHeight - size / 2 - 8, Math.max(size / 2 + 40, c.y));
  el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.setProperty('--s', size + 'px');
  const open = big ? 620 : 420;
  setTimeout(() => {
    const r = { left: x - 20, top: y - 30, width: 40, height: 20 };
    starBurst(r, coins > 0 ? '#ffd568' : pass > 0 ? '#7fd8ff' : '#ff8af0', big ? 18 : 10);
    if (coins > 0) shower(r, coins, { delay: 260, count: big ? 20 : 12 });
  }, open);
  setTimeout(el.done, big ? 2300 : 1800);
}

/* ---------------------------------------------------------------- Styles */
function styles() {
  if ($('#fx-menus-css')) return;
  const s = document.createElement('style'); s.id = 'fx-menus-css';
  s.textContent = `
#fxmLayer{position:fixed;inset:0;pointer-events:none;z-index:9450;overflow:hidden;contain:strict}
#fxmLayer>*{position:absolute;left:0;top:0;pointer-events:none;will-change:transform,opacity}
#app.fxmEnter>:not(.top):not(.nav):not(header):not(nav){animation:fxmEnter .2s cubic-bezier(.2,.7,.3,1) both}
@keyframes fxmEnter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.fxmCoin{width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff6c8 0 14%,#ffd864 30%,#e2a22c 68%,#9a6514 100%);box-shadow:inset 0 0 0 2px #b57c1c,0 0 8px #ffcf5a99}
.fxmRing{width:60px;height:60px;margin:-30px 0 0 -30px;border-radius:50%;border:3px solid #ffd568;box-shadow:0 0 18px #ffd568aa,inset 0 0 12px #ffd56888}
.fxmSpark{width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:50%;background:#fff3c0;box-shadow:0 0 8px 2px #ffd568}
.fxmStar{width:14px;height:14px;margin:-7px 0 0 -7px;background:currentColor;clip-path:polygon(50% 0,61% 38%,100% 50%,61% 62%,50% 100%,39% 62%,0 50%,39% 38%);filter:drop-shadow(0 0 4px currentColor)}
.fxmPlus{font:700 22px/1 'Cormorant Garamond',Georgia,serif;color:#ffe08a;text-shadow:0 2px 0 #4a2a06,0 0 12px #ffcf5a;white-space:nowrap}
.top .coins.fxmCoinPulse{text-shadow:0 0 12px #ffd568;color:#ffe9b0}
.top .coins.fxmCoinBump{animation:fxmBump .24s ease-out}
@keyframes fxmBump{40%{transform:scale(1.12)}}
.fxmTileGlow{animation:fxmTile 1.2s ease-out}
@keyframes fxmTile{20%{box-shadow:0 0 0 2px #ffd568,0 0 28px #ffd568aa}}
.fxmLvRays{position:absolute;left:50%;top:45%;width:min(140vmin,1100px);aspect-ratio:1;translate:-50% -50%;pointer-events:none;border-radius:50%;
 background:repeating-conic-gradient(from 0deg,color-mix(in srgb,var(--glow) 34%,transparent) 0 7deg,transparent 7deg 22deg);
 -webkit-mask:radial-gradient(circle,#000 8%,transparent 62%);mask:radial-gradient(circle,#000 8%,transparent 62%);animation:fxmRays 9s linear infinite,fxmFade .6s ease-out both}
@keyframes fxmRays{to{rotate:360deg}}
@keyframes fxmFade{from{opacity:0;scale:.6}}
.fxmLvBox{position:relative}
.fxmLvNum{display:inline-block;animation:fxmNum .7s .25s cubic-bezier(.2,.9,.3,1.5) both;text-shadow:0 0 14px var(--glow)}
@keyframes fxmNum{from{transform:scale(2.2);opacity:0}60%{transform:scale(.92);opacity:1}to{transform:none}}
.fxmLvItem{animation:fxmItem .4s cubic-bezier(.2,.8,.3,1.2) both}
@keyframes fxmItem{from{opacity:0;transform:translateY(10px) scale(.96)}}
.fxmLvCard{position:relative;overflow:hidden}
.fxmShine{position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 35%,#ffffff70 50%,transparent 65%);transform:translateX(-120%);animation:fxmShine 1.1s .55s ease-in-out both}
@keyframes fxmShine{to{transform:translateX(120%)}}
#toast.fxmToastPop{animation:fxmToast .45s cubic-bezier(.2,.9,.3,1.4)}
@keyframes fxmToast{from{transform:translateX(-50%) scale(.85)}}
.fxmChest{--s:96px;width:var(--s);height:var(--s);translate:-50% -50%;animation:fxmChIn .32s cubic-bezier(.2,.9,.3,1.4) both,fxmChOut .35s ease-in forwards;animation-delay:0s,calc(var(--t,1450ms))}
.fxmChest.big{--t:1950ms}
.fxmChRays{position:absolute;inset:-60%;border-radius:50%;background:repeating-conic-gradient(#ffe39a66 0 8deg,transparent 8deg 24deg);-webkit-mask:radial-gradient(circle,#000 10%,transparent 65%);mask:radial-gradient(circle,#000 10%,transparent 65%);opacity:0;animation:fxmChRays 1.4s .42s ease-out both}
.big .fxmChRays{animation-delay:.62s}
@keyframes fxmChRays{0%{opacity:0;transform:scale(.3) rotate(0)}30%{opacity:1}100%{opacity:0;transform:scale(1.15) rotate(70deg)}}
.fxmChBody{position:absolute;left:12%;right:12%;top:30%;bottom:10%;animation:fxmChShake .36s .06s ease-in-out 1 both}
.big .fxmChBody{animation:fxmChShake .4s .2s ease-in-out both}
@keyframes fxmChShake{25%{transform:rotate(-7deg)}50%{transform:rotate(6deg)}75%{transform:rotate(-3deg)}}
.fxmChBase{position:absolute;left:0;right:0;top:34%;bottom:0;border-radius:4px 4px 10px 10px;background:linear-gradient(180deg,#a5602a,#6c3613);border:2px solid #f2c45a;box-shadow:0 6px 14px #0009,inset 0 -6px 0 #0003}
.fxmChLid{position:absolute;left:-4%;right:-4%;top:0;height:38%;border-radius:40% 40% 4px 4px/70% 70% 4px 4px;background:linear-gradient(180deg,#c3793a,#8a461b);border:2px solid #f2c45a;transform-origin:15% 100%;animation:fxmLid .38s .4s cubic-bezier(.3,1.4,.5,1) both}
.big .fxmChLid{animation-delay:.6s}
@keyframes fxmLid{to{transform:translateY(-14%) rotate(-32deg)}}
.fxmChBase i,.fxmChLid i{position:absolute;left:50%;width:16%;translate:-50% 0;background:linear-gradient(180deg,#ffe9a6,#d9a23a);border-radius:2px}
.fxmChBase i{top:0;height:42%}.fxmChLid i{bottom:-2px;height:40%}
.fxmChPrize{position:absolute;left:50%;top:22%;translate:-50% 0;white-space:nowrap;font:700 calc(var(--s)*.2)/1 'Cormorant Garamond',Georgia,serif;color:#fff1c2;text-shadow:0 2px 0 #3a1d05,0 0 14px #ffcf5a;opacity:0;animation:fxmPrize .9s .5s cubic-bezier(.2,.9,.3,1.2) both}
.big .fxmChPrize{animation-delay:.72s}
.fxmPrizeIco{margin-right:4px}
@keyframes fxmPrize{0%{opacity:0;transform:translateY(20px) scale(.5)}45%{opacity:1;transform:translateY(-40%) scale(1.08)}100%{opacity:1;transform:translateY(-55%) scale(1)}}
@keyframes fxmChIn{from{opacity:0;transform:scale(.3) translateY(30px)}}
@keyframes fxmChOut{to{opacity:0;transform:scale(.9) translateY(-10px)}}
.reduceMotion #fxmLayer{display:none}
html[data-fx=light] #app.fxmEnter>:not(.top):not(.nav):not(header):not(nav){animation-name:fxmFade}
@keyframes fxmFade{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){#fxmLayer{display:none}#app.fxmEnter>*{animation:none!important}.fxmLvRays,.fxmLvNum,.fxmLvItem,.fxmShine{animation:none!important}}`;
  document.head.appendChild(s);
}

/* ---------------------------------------------------------------- Start */
if (B) {
  styles();
  prevView = B.view;
  addEventListener('ember:frame', e => onFrame(e.detail?.view));
  addEventListener('ember:coins', e => onVaultCoins(e.detail));
  addEventListener('ember:cardResult', e => onCardResult(e.detail));
  addEventListener('ember:levelUp', onLevelUp);
  document.addEventListener('click', onClaimClick, true);
  new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList.contains('uiLvUp')) decorateLevelUp(n); }).observe(document.body, { childList: true });
  setInterval(watchCoins, 400);
  last = Math.floor(Number(B.state?.coins) || 0);
}
