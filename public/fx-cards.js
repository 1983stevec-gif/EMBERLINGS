// EMBERLINGS card effects: holographic foil with 3D tilt, a shine sweep on rare and mutated cards,
// and smoother binder pages. Visual only: it talks to the game through window.EmberBridge, ember:* events
// and the DOM, and never changes cards, collection, decks or saves.
const B = window.EmberBridge;
const RARITY_COLORS = ['#aebce2', '#7be7b3', '#72b5ff', '#c18aff', '#ffd568', '#73f0f1', '#ff88d4'];
// Per rarity rank: resting foil strength, shine strength and seconds between shine sweeps.
const FOIL = [0, 0, .14, .18, .22, .26, .3];
const SHINE = [0, 0, .32, .42, .55, .65, .75];
const PERIOD = [0, 0, 9, 8, 6.5, 5.5, 4.5];
const BATTLE_VIEWS = new Set(['cardBattle', 'battle', 'packOpening']);
const SKIP = '.pocketBoard, .handRow, .handCard, .battleScene, #bxLayer, .rollTrack';
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
const motionQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const calm = () => !!B.state?.reducedMotion || !!motionQuery?.matches;

/* ---------------------------------------------------------------- Decorating printed cards */
let mutationNames = null;
const isMutated = card => {
  mutationNames ||= (B.MUTATIONS || []).map(m => m.name).filter(Boolean);
  const text = card.querySelector('.cardMeta > span')?.textContent || '';
  return mutationNames.some(n => text.includes(n));
};
const seen = new IntersectionObserver(entries => {
  for (const e of entries) e.target.classList.toggle('fcVis', e.isIntersecting);
}, { rootMargin: '80px' });
const watched = new Set();

let decoratePending = false;
function scheduleDecorate() { if (decoratePending) return; decoratePending = true; requestAnimationFrame(() => { decoratePending = false; decorate(); }); }
function decorate() {
  for (const el of watched) if (!el.isConnected) { seen.unobserve(el); watched.delete(el); }
  const inBattle = BATTLE_VIEWS.has(B.view);
  for (const card of $$('.printCard:not([data-fc])')) {
    if (inBattle || card.closest(SKIP)) { card.dataset.fc = '0'; continue; }
    card.dataset.fc = '1';
    const rank = +(card.className.match(/rarity-(\d)/)?.[1] || 0);
    const hidden = card.classList.contains('silhouetteCard') || card.classList.contains('discardedCard');
    const boss = card.classList.contains('bossPrintCard');
    const shiny = card.classList.contains('shinyCard'), mutated = !hidden && isMutated(card);
    // Boss cards keep their own gold art foil; hidden cards stay plain.
    const foil = hidden || boss ? 0 : Math.max(FOIL[rank], mutated ? .16 : 0, shiny ? .2 : 0) + (shiny && rank >= 2 ? .06 : 0);
    const shine = hidden || boss ? 0 : Math.max(SHINE[rank], mutated ? .4 : 0, shiny ? .45 : 0);
    const period = rank >= 2 ? PERIOD[rank] : 8.5;
    const s = card.style;
    s.setProperty('--fc-foil', foil.toFixed(2));
    s.setProperty('--fc-rc', RARITY_COLORS[Math.min(rank, 6)]);
    card.dataset.fcFoil = foil ? '1' : '0';
    let html = '<span class="fcFoil" aria-hidden="true"><i></i></span><span class="fcGlare" aria-hidden="true"></span>';
    if (shine) {
      s.setProperty('--fc-shine', shine.toFixed(2));
      s.setProperty('--fc-period', period + 's');
      s.setProperty('--fc-delay', (-Math.random() * period).toFixed(2) + 's');
      html += `<span class="fcShine${rank >= 6 ? ' fcShine2' : ''}" aria-hidden="true"></span>`;
    }
    card.insertAdjacentHTML('beforeend', html);
    seen.observe(card); watched.add(card);
  }
}
// Card Vault grid (deck builder): cards ease in when its page, search or filter changes.
function onMutations(records) {
  scheduleDecorate();
  if (calm()) return;
  for (const r of records) {
    if (!r.addedNodes.length || !r.target.classList?.contains('uiCVGrid')) continue;
    [...r.addedNodes].filter(n => n.nodeType === 1).forEach((el, i) => popIn(el, i));
  }
}
function popIn(el, i) {
  el.style.setProperty('--fc-i', Math.min(i, 14));
  el.classList.remove('fcPop'); void el.offsetWidth; el.classList.add('fcPop');
  setTimeout(() => el.classList.remove('fcPop'), 900);
}

/* ---------------------------------------------------------------- Pointer tilt (one delegated listener, rAF throttled) */
const tilt = { card: null, rect: null, x: .5, y: .5, rx: 0, ry: 0, px: .5, py: .5, amp: 1, raf: 0, touch: false };
const eligible = t => { const c = t?.closest?.('.printCard[data-fc="1"]'); return c && !c.closest(SKIP) ? c : null; };
function aim(card, e, touch) {
  if (tilt.card !== card) { release(); tilt.card = card; tilt.rect = card.getBoundingClientRect(); tilt.touch = touch; card.classList.remove('fcRelease'); card.classList.add('fcTilt'); }
  const r = tilt.rect;
  tilt.x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  tilt.y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
  tilt.amp = touch ? .4 : 1;
  if (!tilt.raf) tilt.raf = requestAnimationFrame(step);
}
function step() {
  tilt.raf = 0; const card = tilt.card; if (!card) return;
  const k = .22, trx = (.5 - tilt.y) * 18 * tilt.amp, try_ = (tilt.x - .5) * 20 * tilt.amp;
  tilt.rx += (trx - tilt.rx) * k; tilt.ry += (try_ - tilt.ry) * k;
  tilt.px += (tilt.x - tilt.px) * k; tilt.py += (tilt.y - tilt.py) * k;
  const s = card.style;
  s.setProperty('--fc-rx', tilt.rx.toFixed(2)); s.setProperty('--fc-ry', tilt.ry.toFixed(2));
  s.setProperty('--fc-px', tilt.px.toFixed(3)); s.setProperty('--fc-py', tilt.py.toFixed(3));
  if (Math.abs(trx - tilt.rx) + Math.abs(try_ - tilt.ry) + Math.abs(tilt.x - tilt.px) * 20 + Math.abs(tilt.y - tilt.py) * 20 > .05) tilt.raf = requestAnimationFrame(step);
}
function release() {
  const card = tilt.card; if (!card) return;
  cancelAnimationFrame(tilt.raf); tilt.raf = 0; tilt.card = null;
  // Hand the return to CSS: the card eases back flat, then the variables are cleared.
  card.classList.add('fcRelease'); card.classList.remove('fcTilt');
  for (const v of ['--fc-rx', '--fc-ry']) card.style.removeProperty(v);
  setTimeout(() => { if (tilt.card !== card) { card.classList.remove('fcRelease'); card.style.removeProperty('--fc-px'); card.style.removeProperty('--fc-py'); } }, 500);
  tilt.rx = tilt.ry = 0; tilt.px = tilt.py = .5;
}
function setupTilt() {
  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    if (calm()) return release();
    const card = eligible(e.target);
    if (!card) return release();
    aim(card, e, false);
  }, { passive: true });
  // Touch: a gentle press tilt that lets go as soon as the finger lifts or the page starts scrolling.
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch' || calm()) return;
    const card = eligible(e.target); if (card) aim(card, e, true);
  }, { passive: true });
  for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, e => { if (e.pointerType === 'touch') release(); }, { passive: true });
  document.addEventListener('pointerleave', e => { if (e.target === document.documentElement || e.target === document) release(); }, true);
  addEventListener('blur', release);
  document.addEventListener('scroll', () => { if (tilt.card) { if (tilt.touch) release(); else tilt.rect = tilt.card.getBoundingClientRect(); } }, { passive: true, capture: true });
  // Device tilt moves the foil on phones and tablets (where the browser provides it).
  let gx = 0, gy = 0, gRaf = 0;
  addEventListener('deviceorientation', e => {
    if (e.gamma == null || calm()) return;
    const nx = Math.max(-1, Math.min(1, e.gamma / 35)) * .5, ny = Math.max(-1, Math.min(1, ((e.beta || 0) - 45) / 35)) * .5;
    if (Math.abs(nx - gx) + Math.abs(ny - gy) < .02) return;
    gx = nx; gy = ny; root.classList.add('fcGyro');
    if (!gRaf) gRaf = requestAnimationFrame(() => { gRaf = 0; root.style.setProperty('--fc-gx', gx.toFixed(3)); root.style.setProperty('--fc-gy', gy.toFixed(3)); });
  }, { passive: true });
}

/* ---------------------------------------------------------------- Binder: cards slide in on page change, rise in on filter change */
let lastBinder = null;
function onBinder(detail = {}) {
  const book = document.querySelector('.magicalBinder'); if (!book) return;
  const key = JSON.stringify(B.binderState?.() || {}), now = { index: !!detail.index, page: detail.page | 0, key };
  const prev = lastBinder; lastBinder = now;
  if (!prev || prev.index !== now.index || calm() || book.classList.contains('binderOpening')) return;
  const filtered = prev.key !== now.key, dir = filtered ? 0 : Math.sign(now.page - prev.page);
  if (!dir && !filtered) return;
  const pages = book.querySelector('.binderPages'); if (!pages) return;
  pages.classList.add('fcPaging');
  pages.style.setProperty('--fc-dx', dir);
  pages.classList.toggle('fcFilter', !dir);
  $$('.binderPocket:not(.uiEmptyPocket)', pages).forEach((p, i) => p.style.setProperty('--fc-i', i));
  setTimeout(() => pages.classList.remove('fcPaging', 'fcFilter'), 1100);
}

/* ---------------------------------------------------------------- Styles */
function injectStyles() {
  if (document.getElementById('fx-cards-css')) return;
  const css = `
html.fcOn .printCard[data-fc="1"]>.fxGlare,html.fcOn .printCard[data-fc="1"]>.fxHolo{display:none}
html.fcOn .printCard.fxTilting[data-fc]{transform:none}
html.fcOn .printCard[data-fc="1"]{isolation:isolate}
html.fcOn .printCard.fcTilt[data-fc="1"]{transform:perspective(900px) rotateX(calc(var(--fc-rx,0) * 1deg)) rotateY(calc(var(--fc-ry,0) * 1deg)) scale(1.04);transition:none;z-index:3;will-change:transform;filter:drop-shadow(0 12px 14px #0006)}
html.fcOn .printCard.fcRelease[data-fc="1"]{transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.fcFoil,.fcGlare,.fcShine{position:absolute;inset:0;border-radius:inherit;pointer-events:none;overflow:hidden;z-index:5}
.fcFoil{opacity:var(--fc-foil,0);mix-blend-mode:hard-light;transition:opacity .3s ease}
.printCard[data-fc-foil="0"] .fcFoil{display:none}
.printCard[data-fc-foil="0"].fcTilt .fcFoil{display:block;opacity:.1}
.fcTilt .fcFoil{opacity:calc(var(--fc-foil,0) * 1.6 + .1)}
.fcFoil>i{position:absolute;inset:-50%;background:
 repeating-linear-gradient(62deg,#ffffff1f 0 1px,transparent 1px 6px),
 linear-gradient(115deg,transparent 22%,#ff88d4 30%,#ffd568 36%,#7be7b3 42%,#76e8ff 48%,#bd87ff 54%,#ff88d4 60%,transparent 68%);
 transform:translate3d(calc((var(--fc-px,.5) - .5 + var(--fc-gx,0)) * -50%),calc((var(--fc-py,.5) - .5 + var(--fc-gy,0)) * -30%),0)}
.rarity-6 .fcFoil>i{background:
 radial-gradient(circle at 20% 30%,#fff8 0 1px,transparent 2px) 0 0/23px 19px,
 radial-gradient(circle at 70% 60%,#fff6 0 1px,transparent 2px) 0 0/31px 27px,
 linear-gradient(115deg,transparent 18%,#ff88d4 27%,#ffd568 34%,#7be7b3 41%,#76e8ff 48%,#bd87ff 55%,#ff88d4 62%,transparent 72%)}
.fcGlare{opacity:0;background:radial-gradient(circle at calc(var(--fc-px,.5) * 100%) calc(var(--fc-py,.5) * 100%),#ffffff73,#ffffff1a 30%,transparent 58%);mix-blend-mode:overlay;transition:opacity .25s ease}
.fcTilt .fcGlare{opacity:1}
.fcShine{display:none}
.printCard.fcVis .fcShine{display:block}
.fcShine::before,.fcShine2::after{content:"";position:absolute;top:-20%;bottom:-20%;left:0;width:38%;opacity:var(--fc-shine,.4);background:linear-gradient(100deg,transparent,color-mix(in srgb,var(--fc-rc,#fff) 45%,#fff0) 30%,#fffffff2 50%,color-mix(in srgb,var(--fc-rc,#fff) 45%,#fff0) 70%,transparent);mix-blend-mode:soft-light;transform:translateX(-140%) skewX(-16deg);animation:fcSweep var(--fc-period,8s) var(--fc-delay,0s) ease-in-out infinite;will-change:transform}
.fcShine2::after{width:16%;animation-delay:calc(var(--fc-delay,0s) + .22s);opacity:calc(var(--fc-shine,.4) * .8)}
.rarity-4 .fcShine::before,.rarity-5 .fcShine::before,.rarity-6 .fcShine::before{mix-blend-mode:overlay}
@keyframes fcSweep{0%{transform:translateX(-140%) skewX(-16deg)}16%,100%{transform:translateX(330%) skewX(-16deg)}}
@media (hover:none){
 html:not(.fcGyro) .printCard.fcVis[data-fc-foil="1"] .fcFoil>i{animation:fcIdle 9s ease-in-out infinite alternate;animation-delay:var(--fc-delay,0s)}
}
@keyframes fcIdle{from{transform:translate3d(22%,8%,0)}to{transform:translate3d(-22%,-8%,0)}}
.binderPages.fcPaging{animation:none!important}
.binderPages.fcPaging>.binderPocket:not(.uiEmptyPocket){animation:fcPocketIn .46s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--fc-i,0) * 32ms)}
.binderPages.fcPaging.fcFilter>.binderPocket:not(.uiEmptyPocket){animation-name:fcPocketRise}
@keyframes fcPocketIn{from{opacity:0;transform:translateX(calc(var(--fc-dx,1) * 34px)) rotateY(calc(var(--fc-dx,1) * -10deg)) scale(.97)}}
@keyframes fcPocketRise{from{opacity:0;transform:translateY(14px) scale(.96)}}
.fcPop{animation:fcPop .38s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--fc-i,0) * 26ms)}
@keyframes fcPop{from{opacity:0;translate:0 10px}}
html.fcCalm .fcShine{display:none!important}
html.fcCalm .fcPop{animation:none}
html.fcCalm .fcFoil>i{animation:none!important}
html.fcCalm .binderPages.fcPaging>.binderPocket{animation:none!important}
@media (prefers-reduced-motion:reduce){.fcShine{display:none!important}.fcFoil>i,.fcPop,.binderPages.fcPaging>.binderPocket{animation:none!important}}`;
  const style = document.createElement('style'); style.id = 'fx-cards-css'; style.textContent = css; document.head.appendChild(style);
}

function syncCalm() { root.classList.toggle('fcCalm', calm()); if (calm()) release(); }

function start() {
  injectStyles();
  root.classList.add('fcOn');
  syncCalm();
  motionQuery?.addEventListener?.('change', syncCalm);
  setupTilt();
  addEventListener('ember:frame', () => { syncCalm(); release(); scheduleDecorate(); });
  addEventListener('ember:binderReady', e => { scheduleDecorate(); onBinder(e.detail); });
  new MutationObserver(onMutations).observe(document.body, { childList: true, subtree: true });
  scheduleDecorate();
}

if (B) start();
