// EMBERLINGS Look pack A: three purely cosmetic touches.
//  1. Adventure HQ map life: slow cloud shadows drifting over the islands, a gentle shimmer on the sea and a soft glow
//     on the island you are on now. In winter (window.EmberSeasons) light snow falls over the map instead of clouds.
//     A decorative layer only: pointer-events:none, drawn under the quest buttons, at most 7 animated elements,
//     and only while the map is on screen and the tab is visible.
//  2. Victory pose: on the Victory screen the MVP Mythling (highlights.js) does one short celebration (a hop, a burst
//     of sparkles and a little glow, about 1.3 s) when it comes into view.
//  3. Reading mode: "Parchment light" for Battle Rules and the Mythling Index: a light parchment page with dark,
//     high-contrast text. A switch on those pages and in Settings. Saved additively as
//     state.ember.look = { reading: 'dark' | 'parchment' } (missing = 'dark').
// Effects setting: Full = everything; Light = fewer clouds, no shimmer, fewer sparkles; Off or reduced motion = no
// movement (the island glow and reading mode stay, still). Never changes gameplay, rewards or the save key.
// Talks to the game only through window.EmberBridge, ember:* events and the page.
// Exposes window.EmberLook = { reading(), setReading(v), mapLayer(), pose() } for checks.
import { fxLevel, fxCount } from '/fx-level.js';

const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ext = () => { const st = B.state; if (!st.ember || typeof st.ember !== 'object') st.ember = {}; return st.ember; };
const calm = () => fxLevel() === 'off';

/* ---------------------------------------------------------------- Reading mode */
const READ_MODES = ['dark', 'parchment'];
const reading = () => ext().look?.reading === 'parchment' ? 'parchment' : 'dark';
function applyReading() {
  const v = reading(), root = document.documentElement;
  if ((root.dataset.reading || 'dark') !== v) { if (v === 'parchment') root.dataset.reading = v; else delete root.dataset.reading; }
  for (const b of $$('.lookReadBtn, #setLookRead')) { const on = v === 'parchment'; b.setAttribute('aria-checked', String(on)); const s = $('.lookReadState, span', b); if (s) s.textContent = on ? 'On' : 'Off'; }
}
function setReading(v) {
  if (!B?.state) return 'dark';
  const e = ext(), val = READ_MODES.includes(v) ? v : 'dark';
  e.look = { ...(e.look && typeof e.look === 'object' ? e.look : {}), reading: val };
  try { B.save(); } catch { /* ignore */ }
  applyReading();
  dispatchEvent(new CustomEvent('ember:look', { detail: { reading: val } }));
  return val;
}
const toggleReading = () => setReading(reading() === 'parchment' ? 'dark' : 'parchment');
const readBtn = extra => `<button type="button" class="lookReadBtn ${extra || ''}" role="switch" aria-checked="${reading() === 'parchment'}" title="Light parchment page with dark text"><span aria-hidden="true">📜</span> Parchment light <b class="lookReadState">${reading() === 'parchment' ? 'On' : 'Off'}</b></button>`;
function bindRead(root) { for (const b of $$('.lookReadBtn', root)) if (!b.dataset.bound) { b.dataset.bound = '1'; b.addEventListener('click', toggleReading); } }

// Put the switch on Battle Rules (painted desktop page, tablet/phone page or the plain page) and on the Index.
function readingButtons() {
  const v = B.view;
  document.body.classList.toggle('lookRulesView', v === 'rules');
  if (v === 'rules') {
    const ex = $('.uiXRulesPage .uiX.uiXRules');
    if (ex && !$('.lookReadBtn', ex)) {
      // Canvas 1536 × 1024: top-right corner of the Full rules / Special conditions panel.
      const W = 1536, H = 1024, pc = (a, b) => (a / b * 100).toFixed(3) + '%';
      ex.insertAdjacentHTML('beforeend', readBtn('lookReadEx'));
      const b = $('.lookReadBtn', ex); Object.assign(b.style, { left: pc(1262, W), top: pc(256, H), width: pc(236, W), height: pc(40, H), fontSize: `calc(15 / ${W} * 100cqw)` });
    }
    const tp = $('.tpPage.tpRules');
    if (tp && !$('.lookReadRow', tp)) { const tabs = $('.tpTabs', tp); tabs?.insertAdjacentHTML('beforebegin', `<div class="lookReadRow">${readBtn()}</div>`); }
    const plain = !ex && !tp && $('#app > section.panel');
    if (plain && !$('#app .lookReadRow')) { const h = $('#app > h1'); (h || plain).insertAdjacentHTML(h ? 'afterend' : 'beforebegin', `<div class="lookReadRow">${readBtn()}</div>`); }
  }
  if (v === 'index') {
    const head = $('.fgBook .fgHead > div:first-child');
    if (head && !$('.lookReadBtn', head)) head.insertAdjacentHTML('beforeend', readBtn('lookReadFg'));
  }
  bindRead(document);
}

/* ---------------------------------------------------------------- Map life */
// Painted map (1586 × 992): islands as ellipses [cx, cy, rx, ry]; the layer covers the sea area left of the quest panel.
const PAINT = { W: 1586, H: 992, area: [0, 66, 1186, 890], isles: [[406, 500, 360, 250], [817, 222, 300, 150], [970, 586, 200, 180]] };
const regionOf = l => B.regions.findIndex(r => l >= r[1] && l <= r[2]);
function mapMode() {
  const lv = fxLevel(), s = window.EmberSeasons?.current?.();
  const snow = !!(s && s.active && s.season === 'winter');
  return { lv, snow };
}
function layerHTML(lv, snow) {
  const moving = lv !== 'off';
  const clouds = !moving || snow ? 0 : lv === 'light' ? 2 : 3;
  const shimmer = moving && lv === 'full' ? 2 : 0;
  const flakes = moving && snow ? (lv === 'light' ? 1 : 2) : 0;
  let h = '';
  for (let i = 0; i < shimmer; i++) h += `<i class="lkShim lkShim${i}"></i>`;
  for (let i = 0; i < clouds; i++) h += `<i class="lkCloud lkCloud${i}"><b></b></i>`;
  for (let i = 0; i < flakes; i++) h += `<i class="lkSnow lkSnow${i}"></i>`;
  return h;
}
function glowFor(r, inPainted) {
  // Returns [left, top, width, height] in % of the layer box.
  if (inPainted) {
    const isle = PAINT.isles[r]; if (!isle) return null;
    const [x0, y0, x1, y1] = PAINT.area, w = x1 - x0, hh = y1 - y0, [cx, cy, rx, ry] = isle;
    return [(cx - rx - x0) / w * 100, (cy - ry - y0) / hh * 100, rx * 2 / w * 100, ry * 2 / hh * 100];
  }
  const reg = B.regions[r]; if (!reg) return null;
  const pts = []; for (let l = reg[1]; l <= reg[2]; l++) { const p = B.positionLevel?.(l); if (p) pts.push([p.x + 24, p.y + 24]); }
  if (!pts.length) return null;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs) - 130, x1 = Math.max(...xs) + 130, y0 = Math.min(...ys) - 110, y1 = Math.max(...ys) + 110;
  return [x0 / 1800 * 100, y0 / 1080 * 100, (x1 - x0) / 1800 * 100, (y1 - y0) / 1080 * 100];
}
function mountMap() {
  const old = $$('.lookMap');
  if (B.view !== 'map') { old.forEach(e => e.remove()); return; }
  const { lv, snow } = mapMode(), r = Math.max(0, regionOf(Math.min(100, B.limit()))), sig = `${lv}|${snow}|${r}`;
  // The painted map (desktop and tablets) or the drawn world map (phones).
  const painted = $$('.uiX.uiXMap').find(x => $('.uiXNode', x));
  const world = !painted && $('#mapWrap #world');
  const host = painted || world; if (!host) return;
  const cur = $('.lookMap', host);
  if (cur && cur.dataset.sig === sig) return;
  old.forEach(e => e.remove());
  const el = document.createElement('div');
  el.className = `lookMap ${painted ? 'lookMapPaint' : 'lookMapWorld'} lk-${lv}${snow ? ' lkWinter' : ''}`;
  el.dataset.sig = sig; el.setAttribute('aria-hidden', 'true');
  if (painted) { const [x0, y0, x1, y1] = PAINT.area; Object.assign(el.style, { left: x0 / PAINT.W * 100 + '%', top: y0 / PAINT.H * 100 + '%', width: (x1 - x0) / PAINT.W * 100 + '%', height: (y1 - y0) / PAINT.H * 100 + '%' }); }
  const g = glowFor(r, !!painted);
  el.innerHTML = (g ? `<i class="lkGlow" style="left:${g[0].toFixed(2)}%;top:${g[1].toFixed(2)}%;width:${g[2].toFixed(2)}%;height:${g[3].toFixed(2)}%"></i>` : '') + layerHTML(lv, snow);
  // Under every button and label: first in the painted canvas, straight after the sea/island drawing on phones.
  if (painted) painted.prepend(el); else { const svg = $('svg.uiMapSvg', world); svg ? svg.after(el) : world.prepend(el); }
}

/* ---------------------------------------------------------------- Victory pose */
let poseIO = null;
function pose(force) {
  const box = $('#app .uiVictory .hlMvp'); if (!box || box.dataset.posed) return false;
  const pic = $('.hlPic', box); if (!pic) return false;
  const run = () => {
    if (box.dataset.posed) return; box.dataset.posed = '1';
    if (calm()) return;
    const n = fxCount(10), burst = document.createElement('span'); burst.className = 'lkBurst'; burst.setAttribute('aria-hidden', 'true');
    const pr = pic.getBoundingClientRect(), br = box.getBoundingClientRect();
    burst.style.left = (pr.left - br.left + pr.width / 2) + 'px'; burst.style.top = (pr.top - br.top + pr.height / 2) + 'px';
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + Math.random() * .4, d = 46 + Math.random() * 22; burst.insertAdjacentHTML('beforeend', `<i style="--x:${(Math.cos(a) * d).toFixed(1)}px;--y:${(Math.sin(a) * d).toFixed(1)}px;--d:${(Math.random() * .15).toFixed(2)}s"></i>`); }
    box.append(burst); box.classList.add('lkPose');
    setTimeout(() => { box.classList.remove('lkPose'); burst.remove(); }, 1500);
  };
  if (force || typeof IntersectionObserver !== 'function') { run(); return true; }
  poseIO?.disconnect();
  poseIO = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { poseIO.disconnect(); poseIO = null; setTimeout(run, 150); } }, { threshold: .6 });
  poseIO.observe(pic);
  return true;
}
function waitPose(tries = 0) {
  if (B.view !== 'cardResult') return;
  if (pose()) return;
  if (tries < 40) setTimeout(() => waitPose(tries + 1), 100);
}

/* ---------------------------------------------------------------- Settings */
let settingsHub = false;
function hookSettings() {
  if (settingsHub || !window.EmberSettings?.addSection) return settingsHub;
  settingsHub = window.EmberSettings.addSection({
    id: 'reading', icon: '📜', title: 'Reading mode',
    html: () => { const on = reading() === 'parchment'; return `<div class="setRow"><div class="setRowText"><span class="setLabel" id="setLookReadLbl">Parchment light</span><small class="setSub" id="setLookReadSub">A light parchment page with dark text for Battle Rules and the Mythling Index. Easier to read in bright light.</small></div>
      <button type="button" class="setSwitch" id="setLookRead" role="switch" aria-checked="${on}" aria-labelledby="setLookReadLbl" aria-describedby="setLookReadSub"><span>${on ? 'On' : 'Off'}</span></button></div>`; },
    bind: el => { $('#setLookRead', el)?.addEventListener('click', toggleReading); }
  }) !== false;
  return settingsHub;
}

/* ---------------------------------------------------------------- Styles */
const CSS = `
/* ---- Look pack A: map life ---- */
.lookMap{position:absolute;inset:0;overflow:hidden;pointer-events:none!important;contain:strict;z-index:0}
.lookMap *{pointer-events:none!important}
.lookMapWorld{left:0;top:0;width:1800px;height:1080px}
.lookMap i{position:absolute;display:block}
.lkGlow{border-radius:50%;background:radial-gradient(closest-side,#ffd77a55,#ffc25a2e 45%,#ffb04a10 75%,transparent);animation:lkGlow 5.5s ease-in-out infinite alternate;will-change:opacity,transform}
.lookMapWorld .lkGlow{background:radial-gradient(closest-side,#ffe39a66,#ffc25a33 50%,transparent)}
@keyframes lkGlow{from{opacity:.55;transform:scale(.97)}to{opacity:1;transform:scale(1.03)}}
.lkCloud{left:0;width:100%;height:32%;animation:lkDrift linear infinite;will-change:transform}
.lkCloud b{position:absolute;left:0;top:0;width:34%;height:100%;border-radius:50%;background:radial-gradient(closest-side,#06182a40,#06182a26 45%,#06182a0c 75%,transparent)}
.lkCloud0{top:4%;animation-duration:78s;animation-delay:-22s}
.lkCloud1{top:40%;animation-duration:96s;animation-delay:-64s}.lkCloud1 b{width:42%}
.lkCloud2{top:66%;animation-duration:88s;animation-delay:-8s}.lkCloud2 b{width:28%;height:80%}
@keyframes lkDrift{from{transform:translateX(-40%)}to{transform:translateX(104%)}}
.lkShim{inset:-4%;background-image:radial-gradient(circle 1.6px at 12% 18%,#fff 60%,transparent),radial-gradient(circle 1.2px at 47% 71%,#fff 60%,transparent),radial-gradient(circle 1.4px at 78% 33%,#fff 60%,transparent),radial-gradient(circle 1.1px at 31% 52%,#fff 60%,transparent);background-size:170px 130px;opacity:0;animation:lkShim 4.6s ease-in-out infinite;will-change:opacity,transform}
.lkShim1{background-size:230px 150px;background-position:60px 40px;animation-delay:-2.3s;animation-duration:5.4s}
@keyframes lkShim{0%,100%{opacity:0;transform:translate(0,0)}50%{opacity:.4;transform:translate(6px,2px)}}
.lkSnow{left:0;top:-100%;width:100%;height:200%;background-image:radial-gradient(circle 2px at 10% 8%,#fff 70%,transparent),radial-gradient(circle 1.5px at 38% 30%,#fffc 70%,transparent),radial-gradient(circle 2.4px at 66% 14%,#fff 70%,transparent),radial-gradient(circle 1.6px at 84% 44%,#fffd 70%,transparent),radial-gradient(circle 1.8px at 22% 62%,#fff 70%,transparent),radial-gradient(circle 1.3px at 55% 80%,#fffc 70%,transparent);background-size:25% 25%;opacity:.75;animation:lkSnow 24s linear infinite;will-change:transform}
.lkSnow1{background-size:20% 12.5%;background-position:7% 3%;opacity:.5;animation-duration:36s}
@keyframes lkSnow{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,50%,0)}}
.lookMap.lk-off *{animation:none!important}
.lookMap.lk-off .lkGlow{opacity:.8}
html.lookHidden .lookMap *{animation-play-state:paused!important}
@media(prefers-reduced-motion:reduce){.lookMap *{animation:none!important}.lkCloud,.lkShim,.lkSnow{display:none}}

/* ---- Look pack A: victory pose ---- */
.hlMvp{position:relative}
.hlMvp.lkPose .hlPic{animation:lkHop 1.25s cubic-bezier(.3,.7,.4,1) both}
.hlMvp.lkPose{animation:lkMvpGlow 1.3s ease-out both}
@keyframes lkHop{0%{transform:none}18%{transform:translateY(-14px) scale(1.08) rotate(-4deg)}34%{transform:translateY(0) scale(.96,1.04)}52%{transform:translateY(-8px) scale(1.05) rotate(3deg)}68%{transform:none}100%{transform:none}}
@keyframes lkMvpGlow{0%{box-shadow:0 0 18px #f2b44a44}35%{box-shadow:0 0 34px 6px #ffd56dbb}100%{box-shadow:0 0 18px #f2b44a44}}
.lkBurst{position:absolute;width:0;height:0;pointer-events:none;z-index:2}
.lkBurst i{position:absolute;left:-5px;top:-5px;width:10px;height:10px;background:radial-gradient(circle,#fff 0 25%,#ffe08a 40%,transparent 70%);clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);opacity:0;animation:lkSpark .95s ease-out var(--d) forwards}
@keyframes lkSpark{0%{opacity:0;transform:translate(0,0) scale(.4)}20%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y)) scale(1.1) rotate(90deg)}}
html[data-fx=light] .hlMvp.lkPose .hlPic{animation-duration:1s}
html[data-fx=off] .hlMvp.lkPose,html[data-fx=off] .hlMvp.lkPose .hlPic{animation:none}
@media(prefers-reduced-motion:reduce){.hlMvp.lkPose,.hlMvp.lkPose .hlPic,.lkBurst{animation:none!important;display:none}}

/* ---- Look pack A: reading mode switch ---- */
.lookReadBtn{display:inline-flex;align-items:center;justify-content:center;gap:.45em;min-height:44px;padding:0 14px;border:1.5px solid #c9a35a;border-radius:999px;background:#0b1230e6;color:#f6efe0;font:600 16px 'EB Garamond',Georgia,serif;cursor:pointer;white-space:nowrap}
.lookReadBtn b{font:700 .8em Cinzel,Georgia,serif;padding:2px 8px;border-radius:999px;background:#33467e;color:#dfe5f6}
.lookReadBtn[aria-checked=true] b{background:linear-gradient(180deg,#ffe29a,#e8ae45);color:#2a1606}
.lookReadBtn:focus-visible{outline:3px solid #ffd77a;outline-offset:2px}
.lookReadRow{display:flex;justify-content:flex-end;margin:0 0 12px}
.lookReadEx{position:absolute;z-index:6;min-height:0;padding:0 .6em}
.uiXRulesPage[data-tab=quick] .lookReadEx{display:none}
.lookReadFg{margin:10px 0 0 8px;background:#f7edd2;color:#3b2a16;border-color:#8a6534}
.lookReadFg b{background:#d9c39a;color:#3b2a16}
.fgHead .lookReadFg{vertical-align:top}

/* ---- Look pack A: Parchment light ---- */
html[data-reading=parchment] .uiXRPanel{background:linear-gradient(180deg,#fbf4e2,#f2e5c4)!important;border-color:#8a6534;color:#1d150b;box-shadow:inset 0 0 40px #b08a5030,0 10px 30px #000a;scrollbar-color:#8a6534aa transparent}
html[data-reading=parchment] .uiXRPanel h2{color:#6b2f0a}
html[data-reading=parchment] .uiXRPanel .muted,html[data-reading=parchment] .uiXRPanel .uiXRNote{color:#3d2f1d}
html[data-reading=parchment] .uiXRPanel li{background:#fffaf0;border-color:#b89766;color:#1d150b}
html[data-reading=parchment] .uiXRPanel li b{color:#4a1f05}
html[data-reading=parchment] .uiXRPanel p,html[data-reading=parchment] .uiXRPanel li p{color:#1d150b}
html[data-reading=parchment] .tpRules .tpPane{padding:14px;border-radius:16px;background:linear-gradient(180deg,#fbf4e2,#f1e3c0);border:2px solid #8a6534;box-shadow:inset 0 0 40px #b08a5030}
html[data-reading=parchment] .tpRules .tpSteps li,html[data-reading=parchment] .tpRules .tpConds li{background:#fffaf0;border-color:#b89766}
html[data-reading=parchment] .tpRules .tpSteps li>div>b,html[data-reading=parchment] .tpRules .tpConds li>div>b{color:#3b1a04}
html[data-reading=parchment] .tpRules .tpSteps p,html[data-reading=parchment] .tpRules .tpConds p,html[data-reading=parchment] .tpRules .tpLead{color:#1d150b}
html[data-reading=parchment] .tpRules .tpSteps p b{color:#8a3a08}
html[data-reading=parchment] .tpRules .tpNote{background:#f6ead0;color:#2a1f12;border-left-color:#8a6534}
html[data-reading=parchment] .tpRules .tpFull{background:transparent;border:0;padding:0 4px;color:#1d150b}
html[data-reading=parchment] .tpRules .tpFull h2,html[data-reading=parchment] .tpRules .tpH2{color:#6b2f0a}
html[data-reading=parchment] .tpRules .tpFull .muted{color:#3d2f1d}
html[data-reading=parchment] .tpRules .tpActions .tpBtn:not(.gold){background:#3b2a16;color:#fff4e0}
html[data-reading=parchment] body.lookRulesView #app>section.panel{background:linear-gradient(180deg,#fbf4e2,#f1e3c0);border-color:#8a6534;color:#1d150b}
html[data-reading=parchment] body.lookRulesView #app>section.panel h2{color:#6b2f0a}
html[data-reading=parchment] body.lookRulesView #app>section.panel .muted{color:#3d2f1d}
html[data-reading=parchment] .fgBook{background:linear-gradient(180deg,#fffcf3,#fbf3df);color:#140d05;border-color:#5e3f1a}
html[data-reading=parchment] .fgBook .fgHead{border-bottom-color:#5e3f1a}
html[data-reading=parchment] .fgBook .fgSub,html[data-reading=parchment] .fgBook .fgKick,html[data-reading=parchment] .fgBook .fgNote,html[data-reading=parchment] .fgBook .fgMeta,html[data-reading=parchment] .fgBook .fgAnimal,html[data-reading=parchment] .fgBook .fgNo,html[data-reading=parchment] .fgBook .fgNoBig,html[data-reading=parchment] .fgBook dt,html[data-reading=parchment] .fgBook dd,html[data-reading=parchment] .fgBook .fgMoves li{color:#1d150b}
html[data-reading=parchment] .fgBook .fgEntry{background:#fffdf7;border-color:#7a5426;color:#140d05}
html[data-reading=parchment] .fgBook .fgEntry.on{background:#fff3cf;border-color:#8a3a08}
html[data-reading=parchment] .fgBook .fgEntry.unseen .fgName{color:#4a3a22}
html[data-reading=parchment] .fgBook .fgRight{background:#fffdf6;border-color:#5e3f1a}
html[data-reading=parchment] .fgBook .fgFacts>div{background:#f8efd9}
html[data-reading=parchment] .fgBook .fgEntry.seen .fgPic{filter:none}
html[data-reading=parchment] .lookReadFg{background:#3b2a16;color:#fff4e0;border-color:#3b2a16}
`;

/* ---------------------------------------------------------------- Wiring */
if (B && !window.EmberLook) {
  const st = document.createElement('style'); st.id = 'lookAStyle'; st.textContent = CSS; document.head.appendChild(st);
  applyReading();
  let queued = false;
  const refresh = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; try { mountMap(); readingButtons(); } catch (e) { console.warn('look-a', e); } }); };
  addEventListener('ember:frame', refresh);
  addEventListener('ember:fxLevel', refresh);
  addEventListener('ember:cardResult', e => { if (e.detail?.victory) setTimeout(() => waitPose(), 300); });
  // Pages rebuilt without a new frame (Index entries, painted pages swapped in): watch #app's own children only.
  const app = $('#app'); if (app) new MutationObserver(() => { if (['map', 'rules', 'index'].includes(B.view)) refresh(); }).observe(app, { childList: true });
  new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-fx', 'data-season'] });
  document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('lookHidden', document.hidden));
  try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', refresh); } catch { /* ignore */ }
  if (!hookSettings()) { let tries = 0; const t = setInterval(() => { if (hookSettings() || ++tries > 20) clearInterval(t); }, 500); }
  window.EmberLook = Object.freeze({ reading, setReading, mapLayer: () => { const el = $('.lookMap'); return el ? { sig: el.dataset.sig, animated: $$('*', el).filter(x => getComputedStyle(x).animationName !== 'none').length, elements: el.querySelectorAll('*').length } : null; }, pose: () => pose(true) });
  refresh();
}
