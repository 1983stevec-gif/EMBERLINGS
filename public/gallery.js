// EMBERLINGS art gallery: a full-screen viewer for every Mythling species (presentation only).
// Discovered species show their painted art, forms and lore; undiscovered ones stay silhouettes,
// the same rule the Mythling Index uses (state.discovered). Nothing here changes the save or the rules.
// Opens from the Mythling Index ("🖼 Gallery") and from the card details page ("🖼 View art").
// Browse: swipe, the ‹ › buttons, the dots or the arrow keys. Zoom: pinch, mouse wheel, double-tap or + / −.
// "Art only" hides everything except the picture. Escape leaves art-only mode, then closes.
import { ROLES, ELEMENTS } from '/card-engine.js';
import { rarityRank } from '/combat-rules.js';
import { loreFor } from '/lore.js';

const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fx = () => {
  if (B?.state?.reducedMotion || document.documentElement.dataset.fx === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches) return 'off';
  return document.documentElement.dataset.fx === 'light' ? 'light' : 'full';
};
const FORMS = ['Basic', 'Ascended', 'Apex', 'Radiant'];
const GLOW = { Fire: '#ff8a3a', Moon: '#b9a8ff', Nature: '#7fe08a', Lightning: '#ffe25a', Water: '#5ab8ff', Crystal: '#f2a6ff', Ice: '#8fe6ff', Shadow: '#c48bff', Wind: '#9ff0c8' };
const OLD_RARITY = ['Common', 'Uncommon', 'Rare', 'Rare', 'Common', 'Mythic', 'Rare', 'Legendary', 'Common', 'Uncommon']; // same fallback the Index uses
const MAX_ZOOM = 4;
const no = k => 'No. ' + String(k + 1).padStart(3, '0');

/* ------------------------------------------------------------ Species facts (read from the game, never stored) */
const facts = new Map();
function info(kind) {
  if (facts.has(kind)) return facts.get(kind);
  const t = document.createElement('div'); t.innerHTML = B.cardHTML({ id: 'gal-' + kind, kind, level: 1, rarity: 'Common' });
  const s = B.species[kind] || {}, regions = B.regions || [];
  const island = loreFor(kind)?.island || regions[s.island ?? Math.floor(kind / 2)]?.[0] || '';
  const f = {
    name: s.name || 'Mythling', element: ELEMENTS[kind] || s.element || '', role: ROLES[kind] || '',
    animal: ($('.cardSpecies', t)?.textContent || '').split('·')[1]?.trim() || '',
    icon: $('.cardTop .elementIcon', t)?.outerHTML || '', rarity: s.rarity || OLD_RARITY[kind] || 'Common', island
  };
  facts.set(kind, f); return f;
}
const discovered = () => { const st = B.state || {}; return new Set([...(st.discovered || []), ...(st.owned || []).map(c => c.kind)]); };
const ownsRadiant = kind => (B.state?.owned || []).some(c => c.kind === kind && rarityRank(c) >= 4);

/* ------------------------------------------------------------ Styles */
function injectCSS() {
  if (document.getElementById('gallery-css')) return;
  const css = `
html.galOpen,html.galOpen body{overflow:hidden!important}
#galView{position:fixed;inset:0;z-index:9900;display:flex;flex-direction:column;overflow:hidden;color:#f3e7cc;font-family:'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif;background:radial-gradient(ellipse at 35% 30%,color-mix(in srgb,var(--gal-glow,#ffd36a) 22%,#1a1626),#0a0c12 72%);transition:background .4s}
#galView *{box-sizing:border-box}
#galView button{font:inherit;cursor:pointer}
#galView :focus-visible{outline:3px solid #ffd36a;outline-offset:2px}
.galBar{display:flex;align-items:center;gap:10px;padding:10px 16px;padding-top:max(10px,env(safe-area-inset-top));flex:none}
.galBar h1{flex:1;min-width:0;margin:0;font-size:20px;font-weight:700;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.galBar h1 small{display:block;font-size:13px;font-weight:400;opacity:.75;letter-spacing:0}
.galBtn{min-height:44px;padding:8px 16px;border-radius:10px;border:1px solid #7a5a2a;background:linear-gradient(180deg,#1d2533,#121822);color:#f3dfb0;font-weight:700;font-size:15px;white-space:nowrap}
.galBtn[aria-pressed=true]{background:linear-gradient(180deg,#8a5a1c,#5a3810);color:#fff3d0}
.galMain{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,380px);grid-template-rows:minmax(0,1fr);gap:20px;padding:0 20px 20px}
.galStage{position:relative;min-width:0;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}
.galFrame{position:relative;flex:none;overflow:hidden;border-radius:18px;touch-action:none;user-select:none;-webkit-user-select:none;background:#0d1018;box-shadow:0 0 0 2px #6a4a1c,0 18px 50px #000a;cursor:zoom-in}
.galFrame.zoomed{cursor:grab}.galFrame.grabbing{cursor:grabbing}
.galPan{position:absolute;inset:0;transform-origin:0 0}
.galPan .mythlingArt{position:absolute!important;inset:-2%!important;width:104%!important;height:104%!important;min-height:0!important;max-width:none!important;max-height:none!important;border-radius:0!important;pointer-events:none}
.galPan img{-webkit-user-drag:none;user-select:none}
.galUnknown .galPan .mythlingArt{filter:brightness(0) opacity(.55)}
.galUnknown{background:radial-gradient(circle,#3a3040,#12101a)}
.galFrame.galUnknown::after{content:"?";display:grid;place-items:center;font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;font-size:clamp(80px,22vmin,220px);color:#e9b75a66;text-shadow:0 4px 30px #000}
.galFrame::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;transition:box-shadow .3s}
.galF1{box-shadow:0 0 0 2px var(--gal-glow),0 0 34px color-mix(in srgb,var(--gal-glow) 55%,transparent),0 18px 50px #000a}
.galF1::after{box-shadow:inset 0 0 40px color-mix(in srgb,var(--gal-glow) 45%,transparent)}
.galF2{box-shadow:0 0 0 3px #f2c75c,0 0 0 6px var(--gal-glow),0 0 60px color-mix(in srgb,var(--gal-glow) 70%,transparent),0 18px 50px #000a}
.galF2::after{box-shadow:inset 0 0 70px color-mix(in srgb,var(--gal-glow) 60%,transparent)}
.galF3{box-shadow:0 0 0 3px #fff2c0,0 0 46px #ffd36acc,0 0 90px #ff9ee088,0 18px 50px #000a}
.galF3::after{background:linear-gradient(115deg,transparent 30%,#ffffff40 45%,#ffe6a033 52%,transparent 66%);background-size:250% 100%;animation:galShine 3.2s ease-in-out infinite}
@keyframes galShine{from{background-position:120% 0}to{background-position:-120% 0}}
.galFormTag{position:absolute;left:10px;top:10px;padding:4px 10px;border-radius:999px;background:#0009;color:#ffe7b0;font-size:13px;font-weight:700;pointer-events:none}
.galNavBtn{position:absolute;top:50%;transform:translateY(-50%);z-index:2;width:48px;height:64px;border-radius:12px;border:1px solid #7a5a2a;background:#121822cc;color:#f3dfb0;font-size:30px;line-height:1;display:grid;place-items:center}
.galPrev{left:0}.galNext{right:0}
.galDots{display:flex;flex-wrap:wrap;justify-content:center;max-width:100%}
.galDot{width:22px;height:22px;padding:0;border:0;background:none;display:grid;place-items:center}
.galDot::before{content:"";width:9px;height:9px;border-radius:50%;background:#f3e7cc55;transition:transform .2s}
.galDot.seen::before{background:#f3e7ccaa}
.galDot[aria-current=true]::before{background:#ffd36a;transform:scale(1.45)}
.galInfo{min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:16px 18px;border-radius:16px;background:#0c0f17cc;border:1px solid #5a4220}
.galNo{margin:0;font-size:14px;letter-spacing:.12em;opacity:.75}
.galInfo h2{margin:2px 0 2px;font-size:clamp(26px,3vw,36px);line-height:1.1;color:#ffe7b0}
.galAnimal{margin:0 0 10px;font-style:italic;opacity:.85}
.galPills{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px;padding:0;list-style:none}
.galPills li{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;background:#ffffff14;border:1px solid #ffffff26;font-size:14px}
.galPills .elementIcon{width:16px;height:16px}
.galInfo h3{margin:12px 0 6px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#e9b75a}
.galForms{display:flex;flex-wrap:wrap;gap:6px}
.galForm{min-height:40px;padding:6px 12px;border-radius:999px;border:1px solid #7a5a2a;background:#151b26;color:#f3dfb0;font-weight:700;font-size:14px}
.galForm[aria-pressed=true]{background:linear-gradient(180deg,#f2c75c,#c08a2a);color:#2a1806;border-color:#f2c75c}
.galArrow{opacity:.5;margin:0 -2px;align-self:center}
.galRad{margin-left:10px}
.galLore{margin:0;font-size:17px;line-height:1.5}
.galHint{margin:12px 0 0;font-size:13px;opacity:.65}
.galExit{display:none;position:absolute;right:14px;top:max(14px,env(safe-area-inset-top));z-index:3;opacity:.75}
.galSr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
#galView.galArtOnly .galBar,#galView.galArtOnly .galInfo,#galView.galArtOnly .galDots,#galView.galArtOnly .galFormTag,#galView.galArtOnly .galNavBtn{display:none}
#galView.galArtOnly .galExit{display:block}
#galView.galArtOnly{background:#05060a}
#galView.galArtOnly .galMain{grid-template-columns:minmax(0,1fr);padding:0}
#galView.galArtOnly .galFrame{border-radius:0;box-shadow:none}
#galView.galArtOnly .galFrame::after{display:none}
.galIn{animation:galIn .32s ease-out}.galInL{animation:galInL .32s ease-out}.galFade{animation:galFade .2s ease-out}
@keyframes galIn{from{opacity:0;transform:translateX(48px)}to{opacity:1;transform:none}}
@keyframes galInL{from{opacity:0;transform:translateX(-48px)}to{opacity:1;transform:none}}
@keyframes galFade{from{opacity:0}to{opacity:1}}
[data-fx=off] #galView *,#galView.galCalm *{animation:none!important;transition:none!important}
@media (max-width:820px),(max-aspect-ratio:1/1){
 .galMain{display:flex;flex-direction:column;gap:10px;padding:0 16px 12px}
 .galStage{flex:none}
 .galInfo{flex:1;padding:12px 14px}
 .galLore{font-size:16px}
 .galNavBtn{width:40px;height:56px;font-size:26px}
 #galView.galArtOnly .galStage{flex:1}
}
@media (max-width:480px){.galBtn{padding:8px 11px;font-size:14px}.galBar h1{font-size:17px}.galBar{gap:6px;padding:8px 12px}}
.galIdxBtn{margin-top:8px}
`;
  const style = document.createElement('style'); style.id = 'gallery-css'; style.textContent = css; document.head.appendChild(style);
}

/* ------------------------------------------------------------ Viewer */
let ui = null;

function open(kind = 0, opts = {}) {
  if (!B) return false;
  close(true); injectCSS();
  const n = B.species.length;
  const root = document.createElement('div');
  root.id = 'galView'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Mythling art gallery');
  const touch = matchMedia('(pointer:coarse)').matches;
  root.innerHTML = `<div class="galBar"><button type="button" class="galBtn galClose" aria-label="Close gallery">‹ Back</button>
     <h1>Gallery<small class="galCount"></small></h1>
     <button type="button" class="galBtn galArtBtn" aria-pressed="false">Art only</button></div>
   <div class="galMain">
    <div class="galStage">
     <div class="galFrame" tabindex="0"><div class="galPan"></div><span class="galFormTag" aria-hidden="true"></span></div>
     <button type="button" class="galNavBtn galPrev" aria-label="Previous Mythling">‹</button><button type="button" class="galNavBtn galNext" aria-label="Next Mythling">›</button>
     <div class="galDots" role="group" aria-label="Choose a Mythling">${B.species.map((_, k) => `<button type="button" class="galDot" data-gal-dot="${k}"></button>`).join('')}</div>
     <button type="button" class="galBtn galExit" aria-label="Show details again">Show details</button>
    </div>
    <section class="galInfo" aria-live="off"></section>
   </div>
   <p class="galSr" aria-live="polite"></p>`;
  document.body.appendChild(root); document.documentElement.classList.add('galOpen');
  const frame = $('.galFrame', root), pan = $('.galPan', root), stage = $('.galStage', root);
  const S = { kind: Math.max(0, Math.min(n - 1, kind | 0)), form: 0, k: 1, tx: 0, ty: 0, size: 300, artOnly: false };
  const view = B.view;

  /* ---- Sizing: the frame is the biggest square that fits (images are square, so never distorted). */
  const fit = () => {
    const portrait = matchMedia('(max-width:820px),(max-aspect-ratio:1/1)').matches;
    let w = stage.clientWidth, h;
    if (S.artOnly) h = stage.clientHeight;
    else if (portrait) { // the arrows sit over the art's edges; leave the details panel at least ~190px
      const dots = $('.galDots', root).offsetHeight || 22;
      h = Math.max(180, Math.min(root.clientHeight * .58, root.clientHeight - $('.galBar', root).offsetHeight - dots - 12 - 10 - 12 - 190));
    } else { w -= 2 * ($('.galNavBtn', root).offsetWidth + 10); h = stage.clientHeight - $('.galDots', root).offsetHeight - 12; }
    const size = Math.max(160, Math.floor(Math.min(w, h)));
    const ratio = size / S.size; S.size = size;
    frame.style.width = frame.style.height = size + 'px';
    S.tx *= ratio; S.ty *= ratio; clamp(); paint();
  };
  const clamp = () => {
    S.k = Math.max(1, Math.min(MAX_ZOOM, S.k));
    const min = S.size - S.size * S.k;
    S.tx = Math.max(min, Math.min(0, S.tx)); S.ty = Math.max(min, Math.min(0, S.ty));
  };
  const paint = () => {
    pan.style.transform = S.k === 1 ? '' : `translate(${S.tx.toFixed(1)}px,${S.ty.toFixed(1)}px) scale(${S.k.toFixed(3)})`;
    frame.classList.toggle('zoomed', S.k > 1.01);
  };
  const zoomAt = (k2, px = S.size / 2, py = S.size / 2) => {
    k2 = Math.max(1, Math.min(MAX_ZOOM, k2));
    S.tx = px - (px - S.tx) * (k2 / S.k); S.ty = py - (py - S.ty) * (k2 / S.k); S.k = k2;
    if (k2 === 1) { S.tx = 0; S.ty = 0; }
    clamp(); paint();
  };
  const resetZoom = () => { S.k = 1; S.tx = S.ty = 0; paint(); };

  /* ---- Drawing one species */
  const draw = dir => {
    const k = S.kind, seen = discovered(), got = seen.has(k), f = info(k), lore = got ? loreFor(k) : null;
    const radiant = got && ownsRadiant(k);
    if (!got || (S.form === 3 && !radiant)) S.form = 0;
    root.style.setProperty('--gal-glow', got ? GLOW[f.element] || '#ffd36a' : '#8a7aa8');
    resetZoom();
    pan.innerHTML = B.art({ kind: k, stage: Math.min(2, S.form), elite: S.form === 3 });
    const art = $('.mythlingArt', pan);
    if (art) art.setAttribute('aria-label', got ? `${f.name}, the ${f.animal}. ${lore?.summary || ''}`.trim() : `Undiscovered Mythling ${no(k)}, shown as a silhouette`);
    frame.setAttribute('aria-label', (got ? `${f.name} art` : `Undiscovered Mythling ${no(k)}`) + '. Use plus and minus to zoom, left and right arrows to browse.');
    frame.className = 'galFrame' + (got ? '' : ' galUnknown') + (S.form ? ' galF' + S.form : '');
    $('.galFormTag', root).textContent = got && S.form ? FORMS[S.form] + ' form' : '';
    $('.galFormTag', root).hidden = !(got && S.form);
    const motion = fx();
    if (dir && motion !== 'off') { pan.classList.remove('galIn', 'galInL', 'galFade'); void pan.offsetWidth; pan.classList.add(motion === 'light' ? 'galFade' : dir > 0 ? 'galIn' : 'galInL'); }
    root.classList.toggle('galCalm', motion === 'off');
    $('.galCount', root).textContent = `${no(k)} · ${k + 1} of ${n} · ${seen.size} discovered`;
    $$('.galDot', root).forEach((d, i) => {
      const s = seen.has(i); d.classList.toggle('seen', s);
      d.setAttribute('aria-label', `${no(i)} ${s ? B.species[i].name : 'undiscovered'}`);
      if (i === k) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
    });
    const forms = got ? [0, 1, 2, ...(radiant ? [3] : [])].map(x => `${x === 1 || x === 2 ? '<span class="galArrow" aria-hidden="true">→</span>' : ''}<button type="button" class="galForm${x === 3 ? ' galRad' : ''}" data-gal-form="${x}" aria-pressed="${x === S.form}">${x === 3 ? '✧ ' : ''}${FORMS[x]}</button>`).join('') : '';
    // Radiant is the special two-point version you own, not a fourth evolution step, so it has no arrow.
    $('.galInfo', root).innerHTML = got ? `<p class="galNo">${no(k)}</p><h2>${esc(f.name)}</h2><p class="galAnimal">${esc(f.animal)}</p>
      <ul class="galPills" aria-label="Facts"><li>${f.icon}${esc(f.element)}</li><li>🏝 ${esc(f.island)}</li><li>${esc(f.rarity)}</li><li>${esc(f.role)}</li></ul>
      <h3 id="galFormsH">Forms</h3><div class="galForms" role="group" aria-labelledby="galFormsH">${forms}</div>
      <h3>Story</h3><p class="galLore">${esc(lore?.lore || '')}</p>
      <p class="galHint">${touch ? 'Swipe to browse. Pinch or double-tap the art to zoom, then drag to look around.' : 'Use ← → to browse. Scroll, double-click or press + / − to zoom, then drag to look around.'}</p>`
      : `<p class="galNo">${no(k)}</p><h2>? ? ?</h2><p class="galAnimal">Not yet discovered</p>
      <p class="galLore">Open packs or win battles to discover this Mythling. Its art, forms and story appear here when you do.</p>
      <p class="galHint">${touch ? 'Swipe to browse the other Mythlings.' : 'Use ← → to browse the other Mythlings.'}</p>`;
    $('.galSr', root).textContent = `${k + 1} of ${n}: ${got ? f.name + (S.form ? ', ' + FORMS[S.form] + ' form' : '') : 'undiscovered Mythling'}`;
  };
  const go = d => { S.kind = (S.kind + d + n) % n; S.form = 0; draw(d); };
  const setArtOnly = on => {
    S.artOnly = on; root.classList.toggle('galArtOnly', on);
    $('.galArtBtn', root).setAttribute('aria-pressed', String(on));
    fit(); (on ? frame : $('.galArtBtn', root)).focus({ preventScroll: true });
    $('.galSr', root).textContent = on ? 'Art only. Press Escape or Show details to see the details again.' : 'Details shown.';
  };

  /* ---- Pointer gestures: swipe to browse, pinch to zoom, drag to pan, double-tap to zoom */
  const pts = new Map(); let g = null, lastTap = null, lastType = 'mouse';
  const local = e => { const r = frame.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  frame.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    try { frame.setPointerCapture(e.pointerId); } catch { /* old browsers */ }
    pts.set(e.pointerId, local(e));
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      g = { pinch: true, d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, k: S.k, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2, tx: S.tx, ty: S.ty };
      pan.style.translate = '';
    } else if (pts.size === 1) {
      lastType = e.pointerType; const [x, y] = local(e); g = { x, y, x0: x, y0: y, t: performance.now(), tx: S.tx, ty: S.ty, moved: false, type: e.pointerType };
    }
  });
  frame.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId) || !g) return;
    e.stopPropagation(); pts.set(e.pointerId, local(e));
    if (g.pinch && pts.size >= 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const k2 = Math.max(1, Math.min(MAX_ZOOM, g.k * d / g.d));
      // keep the art point that was under the fingers' midpoint under it
      S.tx = mx - (g.mx - g.tx) * (k2 / g.k); S.ty = my - (g.my - g.ty) * (k2 / g.k); S.k = k2;
      if (k2 === 1) S.tx = S.ty = 0;
      clamp(); paint(); return;
    }
    if (g.pinch) return;
    const [x, y] = local(e), dx = x - g.x0, dy = y - g.y0;
    if (Math.hypot(dx, dy) > 8) g.moved = true;
    if (S.k > 1.01) { S.tx = g.tx + dx; S.ty = g.ty + dy; clamp(); paint(); frame.classList.add('grabbing'); }
    else if (fx() === 'full' && Math.abs(dx) > Math.abs(dy)) pan.style.translate = `${(dx * .6).toFixed(1)}px 0`;
  });
  const up = e => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId); frame.classList.remove('grabbing');
    if (!g) return;
    if (g.pinch) { if (pts.size === 0) g = null; else { const [p] = [...pts.values()]; g = { x0: p[0], y0: p[1], tx: S.tx, ty: S.ty, moved: true, t: performance.now() }; } return; }
    pan.style.translate = '';
    const [x, y] = local(e), dx = x - g.x0, dy = y - g.y0, dt = Math.max(1, performance.now() - g.t);
    if (e.type === 'pointerup' && S.k <= 1.01 && Math.abs(dx) > Math.abs(dy) * 1.2 && (Math.abs(dx) > 60 || (Math.abs(dx) > 30 && Math.abs(dx) / dt > .4))) { g = null; go(dx < 0 ? 1 : -1); return; }
    if (e.type === 'pointerup' && !g.moved && g.type !== 'mouse') { // double-tap (mouse uses dblclick)
      const now = performance.now();
      if (lastTap && now - lastTap.t < 320 && Math.hypot(x - lastTap.x, y - lastTap.y) < 40) { zoomAt(S.k > 1.01 ? 1 : 2.5, x, y); lastTap = null; }
      else lastTap = { t: now, x, y };
    }
    g = null;
  };
  frame.addEventListener('pointerup', up); frame.addEventListener('pointercancel', up); frame.addEventListener('lostpointercapture', up);
  frame.addEventListener('dblclick', e => { e.preventDefault(); if (lastType !== 'mouse') return; const [x, y] = local(e); zoomAt(S.k > 1.01 ? 1 : 2.5, x, y); });
  frame.addEventListener('wheel', e => {
    e.preventDefault();
    const [x, y] = local(e), step = e.ctrlKey ? .01 : .0018;
    zoomAt(S.k * Math.exp(-e.deltaY * step), x, y);
  }, { passive: false });
  frame.addEventListener('dragstart', e => e.preventDefault());

  /* ---- Buttons */
  root.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t || !root.contains(t)) return;
    if (t.classList.contains('galClose')) return close();
    if (t.classList.contains('galArtBtn')) return setArtOnly(!S.artOnly);
    if (t.classList.contains('galExit')) return setArtOnly(false);
    if (t.classList.contains('galPrev')) return go(-1);
    if (t.classList.contains('galNext')) return go(1);
    if (t.dataset.galDot !== undefined) { const k = +t.dataset.galDot; if (k !== S.kind) { const d = k > S.kind ? 1 : -1; S.kind = k; S.form = 0; draw(d); } return; }
    if (t.dataset.galForm !== undefined) { S.form = +t.dataset.galForm; draw(0); $(`[data-gal-form="${S.form}"]`, root)?.focus({ preventScroll: true }); }
  });

  /* ---- Keyboard (runs before other screens' key handlers while the gallery is open) */
  const keys = e => {
    if (!ui || ui.root !== root) return;
    const k = e.key, typing = e.target.closest?.('input,textarea,select');
    if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); if (S.artOnly) setArtOnly(false); else close(); return; }
    if (k === 'Tab') { // keep focus inside the gallery
      const f = $$('button,[tabindex="0"]', root).filter(x => x.offsetParent !== null && !x.disabled);
      if (!f.length) return; const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && (i === -1 || i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
      e.stopPropagation(); return;
    }
    if (typing) return;
    let used = true;
    if (k === 'ArrowRight') go(1); else if (k === 'ArrowLeft') go(-1);
    else if (k === 'Home') { S.kind = 0; S.form = 0; draw(-1); } else if (k === 'End') { S.kind = n - 1; S.form = 0; draw(1); }
    else if (k === '+' || k === '=') zoomAt(S.k * 1.4); else if (k === '-' || k === '_') zoomAt(S.k / 1.4); else if (k === '0') resetZoom();
    else if ((k === 'ArrowUp' || k === 'ArrowDown') && S.k > 1.01) { S.ty += k === 'ArrowUp' ? 40 : -40; clamp(); paint(); }
    else if (k === 'a' || k === 'A') setArtOnly(!S.artOnly);
    else used = false;
    if (used) { e.preventDefault(); e.stopPropagation(); }
    else if (k !== 'Enter' && k !== ' ') e.stopPropagation(); // nothing behind the gallery reacts to keys
  };
  addEventListener('keydown', keys, true);
  const onResize = () => fit(); addEventListener('resize', onResize);
  ui = { root, keys, onResize, prevFocus: opts.returnFocus || document.activeElement, view };
  draw(0); fit(); requestAnimationFrame(fit);
  $('.galClose', root).focus({ preventScroll: true });
  return true;
}

function close(fast) {
  if (!ui) return;
  const { root, keys, onResize, prevFocus } = ui; ui = null;
  removeEventListener('keydown', keys, true); removeEventListener('resize', onResize);
  root.remove(); document.documentElement.classList.remove('galOpen');
  if (!fast && prevFocus?.isConnected) prevFocus.focus?.({ preventScroll: true });
}

/* ------------------------------------------------------------ Entry points */
const firstSeen = () => { const s = [...discovered()].sort((a, b) => a - b); return s[0] ?? 0; };
// Mythling Index: a "🖼 Gallery" button under the heading; opens on the species shown on the right page.
function indexButton() {
  if (B.view !== 'index') return;
  const head = $('.fgHead > div:first-child'); if (!head || $('.galIdxBtn', head)) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'button gold galIdxBtn'; b.textContent = '🖼 Gallery';
  b.setAttribute('aria-label', 'Open the art gallery');
  b.onclick = () => { const on = $('.fgEntry.on')?.dataset.fg; open(on !== undefined ? +on : firstSeen(), { returnFocus: b }); };
  head.appendChild(b);
}
// Card details: a "🖼 View art" button with the other actions.
function detailsButton() {
  const cd = document.getElementById('cardDetails'); if (!cd) return;
  const acts = $('.cdActions', cd); if (!acts || $('.galCdBtn', acts)) return;
  const title = ($('#cdTitle', cd)?.textContent || '').trim();
  const kind = B.species.findIndex(s => title === s.name || title.startsWith(s.name + ' ')); if (kind < 0) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'cdBtn galCdBtn'; b.textContent = '🖼 View art';
  b.onclick = e => { e.stopPropagation(); open(kind, { returnFocus: b }); };
  acts.prepend(b);
}
let queued = false;
const queue = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; indexButton(); detailsButton(); }); };

if (B) {
  injectCSS();
  addEventListener('ember:frame', e => { if (ui && e.detail?.view !== ui.view) close(true); queue(); });
  addEventListener('ember:binderReady', queue);
  new MutationObserver(queue).observe(document.body, { childList: true, subtree: true });
  window.EmberGallery = Object.freeze({ open: (kind, opts) => open(kind, opts), close: () => close() });
}
