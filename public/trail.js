// EMBERLINGS Trail look pack: Adventure HQ as a trail. Look only: quests, rewards, cards and saves do not change.
//  - Phones: a strip under the map shows the chosen quest's island as a trail of stops in front of its scenery.
//    Thunder Valley and Shadow Realm show the same scenery on the painted map (wide screens and tablets).
//  - Bosses are shown as Guardians: their painted portrait on the map, on the trail and in the quest panel.
//  - A gate stands by each Guardian. It opens after the first win there.
//  - "Now entering…" shows once, on the first visit to Adventure HQ after a Guardian's first defeat.
// Nothing is saved: everything follows state.cleared, and the banner is remembered only until it is shown.
// Effects Off (or reduced motion): nothing moves. A picture that can't load leaves the usual look in place.
// The pure helpers are exported for tests. The pictures come from scripts/art/trail.py.
import { ISLANDS, islandFor } from './look-b.js';

const ART = '/art/trail/';
// Same painted bosses as public/boss-intro.js.
export const GUARDIANS = { 10: 'magmarok', 25: 'thorn-guardian', 45: 'frostfang', 70: 'voltitan', 100: 'voidra' };
export const artFor = level => { const i = islandFor(level); return i ? `${ART}${i.id}.webp` : ''; };
export const guardianArt = level => GUARDIANS[level] ? `/art/bosses/${GUARDIANS[level]}.webp` : '';
export const gateOpen = (cleared, level) => Array.isArray(cleared) && cleared.includes(level);
export const stopState = (level, cleared, limit) => gateOpen(cleared, level) ? 'done' : level > limit ? 'locked' : 'ready';
// Every stop on the trail of the island this level is on.
export function stopsFor(level, cleared, limit) {
  const i = islandFor(level);
  return i ? Array.from({ length: i.to - i.from + 1 }, (_, k) => ({ level: i.from + k, state: stopState(i.from + k, cleared, limit), guardian: !!GUARDIANS[i.from + k] })) : [];
}
// `fight` is what was true when the quest battle was on screen: its id, its level and whether it was cleared before.
// The answer is what to show once after a Guardian's first defeat, or null.
export function newIsland(fight, result) {
  if (!fight || !result || result.id !== fight.id || !result.victory || fight.before || !GUARDIANS[fight.level]) return null;
  const island = islandFor(fight.level), next = islandFor(island.to + 1);
  return { gate: fight.level, island: next || island, done: !next };
}

const B = typeof window === 'undefined' ? null : window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const cleared = () => B.state.cleared || [];
const calm = () => document.documentElement.dataset.fx === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches;
const GATE = open => `<i class="trGate${open ? ' open' : ''}" aria-hidden="true"><svg viewBox="0 0 40 44"><path d="M3 43V19a17 17 0 0 1 34 0v24z" fill="#0a0f18" stroke="#d9b77a" stroke-width="3"/><path class="trGlow" d="M8 42V20a12 12 0 0 1 24 0v22z" fill="#ffe9a8"/><g class="trDoorL"><path d="M8 42V20A12 12 0 0 1 20 8v34z" fill="#6b4a2a" stroke="#2a1a0c"/><path d="M8 24h12M8 34h12" stroke="#d9b77a" stroke-width="2"/></g><g class="trDoorR"><path d="M32 42V20A12 12 0 0 0 20 8v34z" fill="#6b4a2a" stroke="#2a1a0c"/><path d="M32 24H20M32 34H20" stroke="#d9b77a" stroke-width="2"/></g></svg></i>`;

/* ---------- Guardians and gates */
function face(level) {
  const img = new Image();
  img.className = 'trFace'; img.alt = ''; img.draggable = false; img.decoding = 'async';
  img.onerror = () => { img.closest('.trGuardian')?.classList.remove('trGuardian'); img.remove(); };
  img.src = guardianArt(level);
  return img;
}
function dressNodes() {
  for (const n of $$('#app .node.boss[data-level]')) {
    const level = +n.dataset.level;
    if (!GUARDIANS[level] || $('.trGate', n)) continue;
    n.classList.add('trGuardian');
    n.prepend(face(level));
    n.insertAdjacentHTML('beforeend', GATE(gateOpen(cleared(), level)));
  }
}
const selectedLevel = () => +($('#app .node.uiSel')?.dataset.level || 0);
function dressPanel() {
  const box = $('#uiQuest .uiWorldBoss'), src = guardianArt(selectedLevel());
  if (!box || !src || $('.trBoss', box)) return;
  const img = new Image();
  img.className = 'trBoss'; img.alt = ''; img.decoding = 'async';
  img.onerror = () => { img.remove(); box.classList.remove('trPainted'); };
  img.src = src;
  box.classList.add('trPainted');
  box.prepend(img);
  const tag = $('.uiWorldTag', box);
  if (tag) tag.textContent = tag.textContent.replace('Boss', 'Guardian');
}

/* ---------- The trail strip (phones) */
let shown = 0;
function strip() {
  const panel = $('#app .uiHQ .uiMapPanel'), level = selectedLevel(), isle = islandFor(level);
  if (!panel || !isle) return;
  let el = $('.trStrip', panel);
  if (el?.dataset.isle !== isle.id) {
    el?.remove();
    const stops = stopsFor(level, cleared(), B.limit()), wins = stops.filter(s => s.state === 'done').length;
    el = document.createElement('section');
    el.className = 'trStrip'; el.dataset.isle = isle.id;
    el.setAttribute('aria-label', `${isle.name} trail`);
    el.style.setProperty('--tr-art', `url("${ART}${isle.id}.webp")`);
    el.innerHTML = `<header><strong>${esc(isle.name)}</strong><span>${wins} / ${stops.length} complete</span></header>
     <div class="trPath" tabindex="-1"><svg aria-hidden="true"><polyline/></svg>${stops.map((s, k) => `<button type="button" class="trStop ${s.state}${s.guardian ? ' trGuardian' : ''}" data-stop="${s.level}" style="--k:${k}" aria-label="Quest ${s.level}: ${esc(s.guardian ? 'Guardian ' + (B.bosses[s.level] || '') : window.EmberUI.questName?.(s.level) || '')}${s.state === 'done' ? ', completed, replay' : s.state === 'locked' ? ', locked' : ', ready'}"><span>${s.level}</span></button>`).join('')}${GATE(gateOpen(cleared(), isle.to))}</div>`;
    panel.append(el);
    const path = $('.trPath', el), btns = $$('.trStop', path), last = btns.at(-1);
    if (last.classList.contains('trGuardian')) last.prepend(face(isle.to));
    btns.forEach((b, k) => b.style.top = 40 + Math.sin(k * 1.15) * 26 + 'px');
    const line = btns.map((b, k) => `${44 + k * 68},${62 + Math.sin(k * 1.15) * 26}`).join(' ');
    const width = 44 + btns.length * 68 + 46;
    const svg = $('svg', path); svg.setAttribute('width', width); svg.setAttribute('height', 140);
    $('polyline', svg).setAttribute('points', `${line} ${width - 34},78`);
    $('.trGate', path).style.left = width - 62 + 'px';
    path.addEventListener('scroll', () => { const max = path.scrollWidth - path.clientWidth; el.style.setProperty('--tr-x', (max > 0 ? path.scrollLeft / max * 100 : 50).toFixed(1) + '%'); }, { passive: true });
    path.addEventListener('click', e => { const b = e.target.closest('.trStop'); if (b) window.EmberUI.selectLevel(+b.dataset.stop); });
    shown = 0;
  }
  for (const b of $$('.trStop', el)) { const on = +b.dataset.stop === level; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); }
  if (shown !== level) {
    const path = $('.trPath', el), first = !shown; shown = level;
    path.scrollTo({ left: 44 + (level - isle.from) * 68 - path.clientWidth / 2, behavior: first || calm() ? 'auto' : 'smooth' });
    path.dispatchEvent(new Event('scroll'));
  }
}

/* ---------- "Now entering…" */
let fight = null, pending = null, timer = 0, banner = null;
// The same pop-ups public/tips.js waits for.
const BUSY = '#guidedTour, #dailyPanel, #whatsNewPanel, .tradeDone, #tradeAlert, #rareFind, #msBanner, .biIntro, .uiLvUp, .lvlUp, .levelUpModal, #fxMusicHint, .fxStage, .psStage, #pfPicker, .dsOverlay, .uiFAbility:not(.uiLvUp)';
function closeBanner() {
  if (!banner) return;
  const b = banner; banner = null;
  clearTimeout(b.timer); removeEventListener('keydown', b.keys);
  if (b.still) return b.el.remove();
  b.el.classList.add('out'); setTimeout(() => b.el.remove(), 350);
}
function openBanner({ gate, island, done }) {
  closeBanner();
  const still = calm(), el = document.createElement('div');
  el.className = 'trBanner' + (still ? ' still' : '');
  el.style.setProperty('--tr-art', `url("${ART}${island.id}.webp")`);
  el.setAttribute('role', 'status');
  el.innerHTML = `<small>${done ? 'Trail complete' : 'Now entering'}</small><strong>${esc(island.name)}</strong><span>${done ? 'You defeated every Guardian.' : `Quests ${island.from} to ${island.to}`}</span>`;
  el.addEventListener('click', closeBanner);
  document.body.append(el);
  const keys = e => { if (e.key === 'Escape') closeBanner(); };
  addEventListener('keydown', keys);
  banner = { el, keys, still, timer: setTimeout(closeBanner, still ? 3500 : 4800) };
  if (!still) for (const g of $$(`#app .node[data-level="${gate}"] .trGate, #app .trStop[data-stop="${gate}"] ~ .trGate`)) g.classList.add('opening');
}
function tryBanner() {
  clearTimeout(timer);
  if (!pending) return;
  if (B.view !== 'map' || document.hidden || $$(BUSY).some(x => x.getClientRects().length)) { if (B.view === 'map') timer = setTimeout(tryBanner, 800); return; }
  const p = pending; pending = null;
  // Only for the progress on screen: another save may have been loaded since.
  if (gateOpen(cleared(), p.gate)) openBanner(p);
}
function watchBattle(match) {
  const own = B.state.cardBattle;
  if (!own || own.match !== match || fight?.id === own.id) return;
  fight = { id: own.id, level: own.level, before: gateOpen(cleared(), own.level) };
}

/* ---------- Styles */
const CSS = `
/* Trail look pack (public/trail.js) */
.uiXSheet[data-isle="3"]{background:linear-gradient(180deg,#0b1626d9,#0b162670 22%,#0b162699),url("/art/trail/thunder.webp") 50%/cover}
.uiXSheet[data-isle="4"]{background:linear-gradient(180deg,#0b1626d9,#0b162670 22%,#0b162699),url("/art/trail/shadow.webp") 50%/cover}
.uiXSheet[data-isle] h2{text-shadow:0 2px 6px #000}
.node.trGuardian{overflow:visible;border-radius:50%}
.trFace{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;pointer-events:none}
.uiNode.node.trGuardian{width:60px;height:60px}
.trGuardian>span{position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);padding:0 6px;border-radius:9px;background:#5a130e;box-shadow:0 0 0 1px #e9c27a;color:#fff;line-height:1.35}
.trGate{position:absolute;left:calc(100% + 4px);bottom:-4px;width:30px;pointer-events:none;filter:drop-shadow(0 2px 3px #000a)}
.node .trGate{width:58%;left:calc(100% + 3px)}
.trGate svg{display:block;width:100%;height:auto}
.trGate .trGlow{opacity:0}
.trGate.open .trGlow{opacity:1}
.trDoorL{transform-origin:8px 0}.trDoorR{transform-origin:32px 0}
.trGate.open .trDoorL,.trGate.open .trDoorR{transform:scaleX(.22)}
.trGate.opening .trDoorL,.trGate.opening .trDoorR{animation:trDoor 1.5s ease-in-out .5s backwards}
.trGate.opening .trGlow{animation:trGlow 1.5s ease-in-out .5s backwards}
@keyframes trDoor{from{transform:none}}
@keyframes trGlow{from{opacity:0}}
.trPainted>.mythlingArt{visibility:hidden}
.trBoss{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 30%}
.trStrip{position:relative;border-top:1px solid #c9a35a66;background:linear-gradient(180deg,#0b1626cc,#0b162640 45%,#0b162680),var(--tr-art) var(--tr-x,0%) 45%/max(130%,500px) auto no-repeat,#0b1626}
.trStrip header{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:8px 12px 0;color:#fbecc8;text-shadow:0 1px 4px #000;font-family:var(--ui-serif)}
.trStrip header strong{font-size:17px}.trStrip header span{font-size:14px}
.trPath{position:relative;height:140px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;overscroll-behavior-x:contain}
.trPath::-webkit-scrollbar{display:none}
.trPath>svg{display:block}
.trPath polyline{fill:none;stroke:#f3d58a;stroke-width:3;stroke-dasharray:4 8;stroke-linecap:round;filter:drop-shadow(0 1px 2px #000)}
.trStop{position:absolute;left:calc(22px + var(--k)*68px);width:44px;height:44px;min-width:0;padding:0;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 40% 35%,#2b3442,#121822);border:3px solid #4aa3ff;box-shadow:0 0 0 2px #0008,0 0 14px #4aa3ffaa;color:#fff;font-family:var(--ui-serif);font-weight:700;font-size:16px;cursor:pointer;touch-action:manipulation}
.trStop.done{border-color:#6fbf5a;box-shadow:0 0 0 2px #0008,0 0 10px #6fbf5a88}
.trStop.locked{border-color:#5a606a;box-shadow:0 0 0 2px #0008;color:#c8ccd2}
.trStop.locked .trFace{filter:grayscale(.7) brightness(.6)}
.trStop.on{outline:3px solid #ffd27a;outline-offset:3px}
.trStop.trGuardian{width:60px;height:60px;margin:-8px 0 0 -8px;border-color:#e9b75a}
.trStop.trGuardian>span{font-size:13px}
.trPath>.trGate{top:52px;bottom:auto;width:46px}
.trBanner{position:fixed;left:0;right:0;top:24vh;z-index:300;display:grid;justify-items:center;gap:2px;padding:30px 20px;text-align:center;cursor:pointer;color:#fff;text-shadow:0 2px 10px #000,0 0 3px #000;font-family:var(--ui-serif);border-block:2px solid #d9b77a;background:linear-gradient(90deg,#0b1626e6,#0b162666 30%,#0b162666 70%,#0b1626e6),var(--tr-art) 50%/cover,#0b1626;box-shadow:0 14px 40px #000a;animation:trIn .6s ease-out,trPan 5s linear}
.trBanner small{font-size:16px;letter-spacing:.14em;text-transform:uppercase;color:#ffe1a0}
.trBanner strong{font-family:var(--ui-display);font-size:clamp(28px,6vw,52px);line-height:1.15;color:#fff3d2}
.trBanner span{font-size:17px}
.trBanner.out{opacity:0;transition:opacity .35s;pointer-events:none}
.trBanner.still{animation:none}
@keyframes trIn{from{opacity:0;clip-path:inset(0 50%)}to{opacity:1;clip-path:inset(0 0)}}
@keyframes trPan{from{background-position:50%,20% 50%}to{background-position:50%,60% 50%}}
@media(prefers-reduced-motion:reduce){.trBanner,.trGate *{animation:none!important}}
`;

/* ---------- Start */
if (B && !window.EmberTrail) {
  const st = document.createElement('style');
  st.id = 'trStyles'; st.textContent = CSS; document.head.append(st);
  const safe = f => e => { try { f(e); } catch (err) { console.warn('trail', err); } };
  const dress = safe(() => { if (B.view !== 'map') return; dressNodes(); dressPanel(); strip(); });
  let seen = null;
  const watch = new MutationObserver(dress);
  const onMap = safe(() => {
    const q = $('#uiQuest');
    if (q && q !== seen) { seen = q; watch.disconnect(); watch.observe(q, { childList: true }); shown = 0; }
    dress(); tryBanner();
  });
  addEventListener('ember:cardBattle', safe(e => watchBattle(e.detail?.match)));
  addEventListener('ember:frame', safe(e => {
    if (e.detail?.view !== 'map') closeBanner();
    const found = newIsland(fight, B.state.lastCardResult);
    if (found) { pending = found; fight = null; }
    if (e.detail?.view === 'map') queueMicrotask(onMap);
  }));
  new MutationObserver(() => { if (B.view === 'map' && $('#uiQuest') !== seen) onMap(); }).observe($('#app'), { childList: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tryBanner(); });
  window.EmberTrail = Object.freeze({ islands: ISLANDS, banner: level => { const i = islandFor(level); if (i) openBanner({ gate: i.from - 1, island: i, done: false }); } });
  onMap();
}
