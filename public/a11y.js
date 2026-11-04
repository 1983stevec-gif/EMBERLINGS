// EMBERLINGS accessibility: larger text, element symbols, keyboard and screen reader help.
// Presentation only: no rules, rewards or saves change. Options live under state.ember.a11y (missing → defaults);
// the save key is unchanged. Works at runtime through window.EmberBridge, ember:* events and a MutationObserver,
// so the core game and the other modules are not edited.
const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const root = document.documentElement;

/* ------------------------------------------------------------ Options */
const DEFAULTS = { text: 'normal', symbols: false };
const SIZES = [['normal', 'Normal'], ['large', 'Large'], ['xl', 'Extra large']];
const ext = () => { const st = B.state; if (!st.ember || typeof st.ember !== 'object') st.ember = {}; return st.ember; };
function opts() {
  const a = B?.state?.ember?.a11y;
  const o = { ...DEFAULTS, ...(a && typeof a === 'object' ? a : {}) };
  if (!SIZES.some(([k]) => k === o.text)) o.text = 'normal';
  o.symbols = !!o.symbols; return o;
}
function setOpt(k, v) { const e = ext(); e.a11y = { ...opts(), [k]: v }; try { B.save(); } catch { } apply(); }
function apply() {
  const o = opts();
  if (root.dataset.textSize !== o.text) root.dataset.textSize = o.text;
  const s = o.symbols ? 'on' : 'off'; if (root.dataset.elSymbols !== s) root.dataset.elSymbols = s;
  scalePainted();
}

/* ------------------------------------------------------------ Elements (same colours and glyphs as the printed cards) */
const ELEMENTS = {
  Fire: ['#e67e4e', 'M12 2c3 6-3 6 0 10 2-1 3-3 3-4 7 8 1 15-4 14C3 21 2 13 7 8c0 3 1 4 2 4C8 7 11 6 12 2Z'],
  Lightning: ['#e3c857', 'M14 2 4 14h7l-1 8L21 9h-8Z'],
  Water: ['#64b5d6', 'M12 2C9 7 4 11 4 16a8 8 0 0 0 16 0c0-5-5-9-8-14Z'],
  Nature: ['#72b987', 'M21 3C7 2 1 8 5 16c7 6 15-1 16-13ZM4 21 17 8'],
  Ice: ['#9bd5dd', 'M12 2v20M3 7l18 10M3 17 21 7M8 4l4 3 4-3M8 20l4-3 4 3'],
  Shadow: ['#9276b5', 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-4v8'],
  Moon: ['#a796dc', 'M17 3A9 9 0 1 0 21 17 8 8 0 0 1 17 3Z'],
  Crystal: ['#cba0d8', 'm12 2 9 7-9 13L3 9ZM3 9h18M8 9l4 13 4-13-4-7Z'],
  Wind: ['#86cbb6', 'M3 7h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 17h7a3 3 0 1 1-3 3']
};
const SHAPES = { Fire: 'shield', Lightning: 'diamond', Water: 'circle', Nature: 'leaf', Ice: 'hexagon', Shadow: 'square', Moon: 'arch', Crystal: 'gem', Wind: 'teardrop' };
const elIcon = name => `<span class="elementIcon" style="--glyph-color:${ELEMENTS[name][0]}" title="${name} Merfling" aria-hidden="true"><svg class="uiGlyph" viewBox="0 0 24 24"><path d="${ELEMENTS[name][1]}"/></svg></span>`;
const RARITIES = () => B.RARITIES || ['Common', 'Uncommon', 'Rare', 'Mythic', 'Legendary', 'Celestial', 'Secret'];

/* ------------------------------------------------------------ Styles */
function css() {
  if ($('#a11yCss')) return;
  const sh = { shield: 'polygon(50% 0,100% 18%,100% 62%,50% 100%,0 62%,0 18%)', diamond: 'polygon(50% 0,100% 50%,50% 100%,0 50%)', hexagon: 'polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%)', gem: 'polygon(22% 4%,78% 4%,100% 36%,50% 100%,0 36%)' };
  const shapeCss = Object.entries(SHAPES).map(([el, s]) => {
    const sel = `[data-el-symbols=on] .elementIcon[title^="${el}"]`;
    if (sh[s]) return `${sel}{border-radius:0;clip-path:${sh[s]};border:0}`;
    return `${sel}{border-radius:${{ circle: '50%', leaf: '0 70% 0 70%', square: '12%', arch: '50% 50% 8% 8%', teardrop: '50% 8% 50% 50%' }[s]}}`;
  }).join('\n');
  const rarityCss = RARITIES().map((r, i) => `[data-el-symbols=on] .mythCard.rarity-${i} .cardArt::after{content:"${r}"}`).join('\n');
  const st = document.createElement('style'); st.id = 'a11yCss';
  st.textContent = `
/* Screen-reader-only text, skip link and live region */
.a11ySr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important;border:0!important}
.a11ySkip{position:fixed;left:12px;top:-80px;z-index:10000;padding:10px 18px;border-radius:12px;background:linear-gradient(110deg,#ad6e24,#e4b443);color:#1d1530;font:700 15px/1.2 system-ui,sans-serif;text-decoration:none;border:2px solid #ffe7a3;box-shadow:0 8px 24px #000a;transition:top .15s}
.a11ySkip:focus{top:12px;outline:3px solid #fff;outline-offset:2px}
/* One focus ring for the whole game: warm gold with a dark edge so it shows on painted art and on light cards */
:focus-visible{outline:3px solid #ffd27a!important;outline-offset:2px}
input:focus-visible,select:focus-visible,textarea:focus-visible{outline-offset:1px}
:is([data-a11y-main],#app,h1,h2,h3,[role=dialog],[role=region],.tradeDone)[tabindex="-1"]:focus{outline:none!important}
/* Larger text. Text boxes in the normal layouts grow with zoom; printed cards, painted art pages and picture buttons keep their art
   (painted pages grow their live text a little instead, see scalePainted). */
:root{--a11yZ:1;--a11yP:1}
:root[data-text-size=large]{--a11yZ:1.15;--a11yP:1.08}
:root[data-text-size=xl]{--a11yZ:1.3;--a11yP:1.15}
:root:is([data-text-size=large],[data-text-size=xl]) :is(p,li,dt,dd,label,small,summary,legend,figcaption,td,th,blockquote,button,select,input,textarea,.muted,.small,.pill,.toast,.tag):not(:is(p,li,dt,dd,label,small,summary,legend,figcaption,td,th,blockquote,button,select,textarea,.muted,.small,.pill,.toast,.tag) *):not(:is(.uiX,.uiXPiece,.mythCard,.printCard,.uiPBar,.uiTabMenu,.uiTopIn,.fxStage,.biIntro,.uiFit,.uiCardFit,.pocketBoard,.bxHand,.a11yKeep) *):not(.uiHomeCard,.uiTabTile,.uiPHot,.uiHot,.binderPocket,.bxHandNav,.a11ySkip,.a11yKeep,.dailyBtn,:has(.mythCard,.mythlingArt,canvas)){zoom:var(--a11yZ)}
:root:is([data-text-size=large],[data-text-size=xl]) .dailyBtn{zoom:calc((var(--a11yZ) + 1) / 2)}
:root:is([data-text-size=large],[data-text-size=xl]) :is(h1,h2,h3):not(:is(.uiX,.uiXPiece,.mythCard,.uiPBar,.fxStage,.biIntro,.a11yKeep) *){overflow-wrap:anywhere}
:root:is([data-text-size=large],[data-text-size=xl]) body{overflow-x:hidden}
/* Deck builder header on phones: let "Saved Decks" wrap under the title instead of pushing the page sideways (any text size). */
.uiDSHead{flex-wrap:wrap;gap:8px}
/* Element symbols: each element gets its own badge shape as well as its glyph; glyphs get a heavier stroke. */
[data-el-symbols=on] .elementIcon{box-shadow:none;filter:drop-shadow(0 0 .6px #000) drop-shadow(0 0 .6px #000)}
[data-el-symbols=on] .elementIcon .uiGlyph{stroke-width:2.8;color:#0b1224}
${shapeCss}
[data-el-symbols=on] .elementIcon[title^="Any"]{border-radius:30%;background:repeating-linear-gradient(45deg,#c3c6cf 0 2px,#8d919c 2px 4px)}
/* Rarity in words on printed cards, so it is not shown by frame colour alone */
[data-el-symbols=on] .mythCard[class*=rarity-] .cardArt{position:relative}
[data-el-symbols=on] .mythCard[class*=rarity-] .cardArt::after{position:absolute;left:4%;bottom:4%;z-index:3;padding:1px 5px;border-radius:6px;background:#0d1530e6;color:#ffe9b0;font:800 7px/1.3 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;border:1px solid #ffe9b066;pointer-events:none}
${rarityCss}
/* Accessibility panel */
.a11yDlg{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;padding:16px;background:#050816b8;overflow:auto}
.a11yBox{position:relative;width:min(520px,100%);max-height:calc(100dvh - 32px);overflow:auto;border:2px solid #e5c27e;border-radius:20px;padding:22px 22px 18px;background:linear-gradient(150deg,#22305a,#121b3c);color:#eef1ff;box-shadow:0 20px 60px #000b;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
.a11yBox h2{margin:0 40px 10px 0;font:700 26px/1.2 'Cormorant Garamond',Georgia,serif;color:#ffe2a0}
.a11yBox fieldset{border:1px solid #53639d;border-radius:14px;margin:12px 0;padding:10px 14px 12px}
.a11yBox legend{padding:0 6px;font-weight:800;color:#ffe2a0}
.a11yOpts{display:flex;flex-wrap:wrap;gap:8px}
.a11yOpts label{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:8px 14px;border:1px solid #6d7bb6;border-radius:12px;background:#1a2550;cursor:pointer}
.a11yOpts label:has(input:checked){border-color:#ffd27a;background:#3a3460;box-shadow:inset 0 0 0 1px #ffd27a}
.a11yOpts input{accent-color:#e4b443;width:18px;height:18px;margin:0}
.a11yHint{margin:8px 0 0;color:#c4cdea;font-size:14px;line-height:1.45}
.a11yEls{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px;margin:10px 0 0;padding:0;list-style:none}
.a11yEls li{display:flex;align-items:center;gap:6px;font-size:13px}
.a11yEls .elementIcon{font-size:14px}
.a11yX{position:absolute;right:12px;top:12px;width:44px;height:44px;border-radius:50%;border:1px solid #8b97c9;background:#1a2550;color:#fff;font-size:22px;line-height:1;cursor:pointer}
.a11yKeys{margin:12px 0 0;font-size:14px;line-height:1.5;color:#c4cdea}
.a11yKeys kbd{display:inline-block;min-width:1.6em;padding:0 5px;border:1px solid #8b97c9;border-bottom-width:2px;border-radius:5px;background:#0e1636;font:700 12px/1.6 system-ui,sans-serif;text-align:center;color:#fff}
.a11yDone{display:block;width:100%;margin-top:14px;min-height:46px}
`;
  document.head.appendChild(st);
}

/* ------------------------------------------------------------ Painted pages: grow live text a little, in place */
// Painted text sizes are written as calc(px / W * 100cqw); multiplying by --a11yP keeps them tied to the painting.
function scalePainted() {
  for (const el of $$('.uiX [style*="cqw"]')) {
    if (el.dataset.a11yFs) continue;
    const fs = el.style.fontSize; if (!fs || !fs.includes('cqw')) continue;
    el.dataset.a11yFs = '1'; el.style.fontSize = `calc(${fs} * var(--a11yP, 1))`;
  }
}

/* ------------------------------------------------------------ Live announcements */
let live, liveT = 0, queue = [];
function announce(msg, urgent = false) {
  if (!msg) return; if (!live) return;
  queue.push(String(msg)); clearTimeout(liveT);
  liveT = setTimeout(() => {
    const target = urgent ? $('#a11yAlert') : live; const text = queue.join(' '); queue = [];
    target.textContent = ''; setTimeout(() => { target.textContent = text; }, 40);
  }, 120);
}
const nameOf = c => { try { return B.meta?.(c)?.name || B.species?.[c?.kind]?.name || c?.name || 'Mythling'; } catch { return c?.name || 'Mythling'; } };
const fmt = n => Math.floor(Number(n) || 0).toLocaleString();
let battleSeen = new Set(), battleSig = '';
function onBattle({ match }) {
  if (!match) return;
  const sig = (match.sides || []).map(s => s.name).join('|') + '#' + (match.id || '');
  const evs = Array.isArray(match.events) ? match.events : [];
  if (sig !== battleSig) { battleSig = sig; battleSeen = new Set(evs.map(e => e.id)); const last = (match.log || []).slice(-1)[0]; if (last) announce(last); return; }
  const fresh = evs.filter(e => e && e.id && !battleSeen.has(e.id)); fresh.forEach(e => battleSeen.add(e.id));
  if (!fresh.length) return;
  const urgent = fresh.some(e => e.type === 'knockout' || e.type === 'finish');
  announce(fresh.slice(-4).map(e => String(e.text || '').replace(/ · /g, ', ').replace(/[.!]\s*$/, '')).join('. ') + '.', urgent);
}

/* ------------------------------------------------------------ Keyboard: remember focus across redraws */
let lastInput = 'pointer', lastFocus = null;
addEventListener('keydown', () => { lastInput = 'key'; }, true);
addEventListener('pointerdown', () => { lastInput = 'pointer'; }, true);
function describe(el) {
  if (!el || el === document.body || !el.tagName) return null;
  const d = { tag: el.tagName, id: el.id, attrs: [], label: el.getAttribute('aria-label') || '', text: (el.textContent || '').trim().slice(0, 60) };
  for (const a of el.attributes) if (a.name.startsWith('data-') && !a.name.startsWith('data-a11y') && !/^data-(fx|fc|bound)/.test(a.name)) d.attrs.push([a.name, a.value]);
  return d;
}
function findLike(d) {
  if (!d) return null;
  const ok = el => el && el.isConnected && el.getClientRects().length && !el.disabled && !el.closest('[hidden],[inert],[aria-hidden="true"]');
  if (d.id) { const el = document.getElementById(d.id); if (ok(el)) return el; }
  if (d.attrs.length) { const sel = d.tag.toLowerCase() + d.attrs.map(([k, v]) => `[${k}="${CSS.escape(v)}"]`).join(''); const el = $$(sel).find(ok); if (el) return el; }
  if (d.label) { const el = $$(`${d.tag.toLowerCase()}[aria-label="${CSS.escape(d.label)}"]`).find(ok); if (el) return el; }
  if (d.text) return $$(d.tag.toLowerCase()).find(el => ok(el) && (el.textContent || '').trim().slice(0, 60) === d.text) || null;
  return null;
}
addEventListener('focusin', e => { if (e.target !== document.body && !e.target.closest?.('.a11ySkip')) lastFocus = describe(e.target); });
function mainEl() { return $('[data-a11y-main]') || $('#app'); }
function focusMain() { const m = mainEl(); if (!m) return; if (!m.hasAttribute('tabindex')) m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); }
function restoreFocus(viewChanged) {
  if (lastInput !== 'key') return;
  const a = document.activeElement; if (a && a !== document.body && a.isConnected) return;
  const d = topDialog(); if (d) { const f = focusables(d)[0]; if (f) f.focus({ preventScroll: true }); return; }
  const el = !viewChanged && findLike(lastFocus);
  if (el) el.focus({ preventScroll: true }); else focusMain();
}

/* ------------------------------------------------------------ Landmarks, labels and clickable things (after each draw) */
const GLYPH_NAMES = { '×': 'Close', '✕': 'Close', '✖': 'Close', '‹': 'Previous', '›': 'Next', '←': 'Back', '→': 'Next', '＋': 'Add', '+': 'Add', '−': 'Remove', '-': 'Remove', '✎': 'Edit', '⋯': 'More options', '…': 'More options', '☰': 'Menu', '▶': 'Play', '⏸': 'Pause', '🔊': 'Sound on', '🔇': 'Sound off', '⚙': 'Settings', '⚙️': 'Settings', '?': 'Help', 'ⓘ': 'Information' };
const hasWords = s => /[\p{L}\p{N}]/u.test(s || '');
function visibleName(el) {
  if (hasWords(el.getAttribute('aria-label'))) return el.getAttribute('aria-label');
  const lb = el.getAttribute('aria-labelledby'); if (lb && hasWords(lb.split(/\s+/).map(i => document.getElementById(i)?.textContent || '').join(' '))) return 'x';
  if (el.labels?.length && hasWords([...el.labels].map(l => l.textContent).join(''))) return 'x';
  let t = ''; for (const n of el.childNodes) { if (n.nodeType === 3) t += n.textContent; else if (n.nodeType === 1 && n.getAttribute('aria-hidden') !== 'true') t += n.matches('img') ? (n.alt || '') : n.matches('[role=img]') ? (n.getAttribute('aria-label') || '') : (n.textContent || ''); }
  return t.trim() || el.title || el.placeholder || '';
}
function cardSummary(card) {
  const name = $('.cardTop strong', card)?.textContent.trim(); if (!name) return '';
  const el = ($('.cardTop .elementIcon', card)?.getAttribute('title') || '').replace(/ Merfling$/, '');
  const hp = ($('.cardTop > span', card)?.childNodes[0]?.textContent || '').trim();
  const r = /rarity-(\d)/.exec(card.className); const rar = r ? RARITIES()[+r[1]] : '';
  const lv = /Lv\.?\s*(\d+)/.exec($('.cardSpecies', card)?.textContent || ''); const stage = ($('.cardStage', card)?.childNodes[0]?.textContent || '').trim();
  return [name, el && el + ' element', rar, lv && 'level ' + lv[1], hp && hp + ' HP', stage && stage.toLowerCase()].filter(Boolean).join(', ');
}
function cardNear(el) { let p = el.parentElement; for (let i = 0; p && i < 5; i++, p = p.parentElement) { const cs = p.querySelectorAll('.mythCard'); if (cs.length === 1) return cs[0]; if (cs.length > 1) return null; } return null; }
let inspectOpener = null;
const DIALOGS = '[role=dialog],[role=alertdialog],.tradeDone,.uiCloudDlg,.uiFAbility,.fxStage,.biIntro';
function patch() {
  const app = $('#app'); if (!app) return;
  // Main landmark: the first block of page content after the header.
  const kids = [...app.children].filter(k => !k.matches('header,nav,.top,.tabs,.uiTabMenu,script,style,#toast'));
  const main = kids[0];
  for (const old of $$('[data-a11y-main]')) if (old !== main) { delete old.dataset.a11yMain; if (old.getAttribute('role') === 'main') old.removeAttribute('role'); }
  if (main && !main.dataset.a11yMain) {
    main.dataset.a11yMain = '1'; if (!main.getAttribute('role') && main.tagName !== 'MAIN') main.setAttribute('role', 'main');
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
  }
  // Buttons: glyph-only names get words; decorative SVG glyphs next to words are hidden from screen readers.
  for (const b of $$('button,[role=button],a[href]')) {
    if (b.dataset.a11yDone === '1' && b.isConnected) continue;
    // Words shown on the button, without the <title> text inside its SVG glyphs.
    let words = ''; const walk = n => { for (const c of n.childNodes) { if (c.nodeType === 3) words += c.textContent; else if (c.nodeType === 1 && c.tagName.toLowerCase() !== 'svg') walk(c); } }; walk(b);
    words = words.replace(/\s+/g, ' ').trim();
    if (hasWords(words)) for (const g of $$(':scope > svg.uiGlyph[role=img], :scope > .uiGlyph', b)) { g.setAttribute('aria-hidden', 'true'); g.removeAttribute('role'); }
    const vn = visibleName(b);
    if (!hasWords(vn)) {
      const g = GLYPH_NAMES[words] || GLYPH_NAMES[words.replace(/️/g, '')] || (b.closest(DIALOGS) && /^[×✕✖]$/.test(words) ? 'Close' : '');
      const t = b.title || g; if (t) b.setAttribute('aria-label', t);
    }
    // Card buttons (binder pockets, trade picks): a short name instead of every word printed on the card.
    const cards = b.querySelectorAll('.mythCard');
    if (cards.length === 1 && !b.hasAttribute('aria-label')) { const s = cardSummary(cards[0]); const pocket = $('.uiPocketNo', b)?.textContent.trim(); if (s) b.setAttribute('aria-label', (pocket ? 'Pocket ' + pocket + ': ' : '') + s); }
    // Battle hand buttons ("Active", "Bench", "Evolve"...) say which card they act on.
    if (!cards.length && !b.hasAttribute('aria-label') && /^(Active|Bench|Evolve|Attach|Play|Retreat|Use|Add|Remove|Choose|Select)\b/i.test(words) && words.length < 24) {
      const c = cardNear(b); const n = c && $('.cardTop strong', c)?.textContent.trim(); if (n) b.setAttribute('aria-label', `${words}: ${n}`);
    }
    b.dataset.a11yDone = '1';
  }
  // Clickable non-buttons (set with onclick) become keyboard buttons.
  for (const el of $$('#app div, #app span, #app li, #app article, #app img, #app section, body > div:not(#app) div, body > div:not(#app) span')) {
    if (typeof el.onclick !== 'function' || el.hasAttribute('role') || el.closest('button,a,label,summary,[role=button]') || el.matches(DIALOGS) || el.matches('.a11yDlg')) continue;
    if (el.querySelector('button,a[href],input,select,textarea')) continue; // backdrop or wrapper: its children are the controls
    el.setAttribute('role', 'button'); if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    if (!hasWords(visibleName(el))) { const c = el.querySelector('.mythCard'); const s = c ? cardSummary(c) : el.title; if (s) el.setAttribute('aria-label', s); }
  }
  // Images: anything without alt is decorative; Mythling art is already labelled by the game.
  for (const i of $$('img:not([alt])')) i.alt = '';
  // Toast messages are read out through the live region.
  const t = $('#toast'); if (t && !t.dataset.a11y) { t.dataset.a11y = '1'; new MutationObserver(() => { if (!t.classList.contains('hide')) announce(t.textContent); }).observe(t, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] }); if (!t.classList.contains('hide')) announce(t.textContent); }
  // The binder inspection panel: move focus to it so its details are read, Escape closes it.
  const insp = $('#inspectCard .cardInspection');
  if (!insp && inspectOpener) {
    // Closed: return focus to the card that opened it.
    const a = document.activeElement; if (!a || a === document.body || !a.isConnected) findLike(inspectOpener)?.focus({ preventScroll: true });
    inspectOpener = null;
  }
  if (insp && !insp.dataset.a11y) {
    insp.dataset.a11y = '1'; inspectOpener = lastFocus; insp.setAttribute('role', 'region'); const h = $('h2', insp);
    if (h) { h.id = h.id || 'a11yInspectTitle'; insp.setAttribute('aria-labelledby', h.id); h.tabIndex = -1; if (lastInput === 'key') h.focus({ preventScroll: false }); }
  }
  scalePainted();
}
// Runs right after each screen draw, and at most every 200 ms while other things change the page (effects, pop-ups).
let patchQueued = false, patchAt = 0;
const runPatch = () => { patchQueued = false; patchAt = performance.now(); try { patch(); dialogs(); } catch (e) { console.warn('a11y', e); } };
const queuePatch = (now = false) => { if (patchQueued && !now) return; patchQueued = true; const wait = now ? 0 : Math.max(0, 200 - (performance.now() - patchAt)); setTimeout(() => requestAnimationFrame(runPatch), wait); };

/* ------------------------------------------------------------ Dialogs: focus in, Tab stays inside, Escape closes, focus returns */
const openers = new WeakMap(); let tracked = [];
const focusables = r => $$('button,[href],input,select,textarea,summary,[tabindex]:not([tabindex="-1"])', r).filter(el => !el.disabled && el.getClientRects().length && !el.closest('[hidden],[inert]') && getComputedStyle(el).visibility !== 'hidden');
function isModal(d) { return d.isConnected && d.getClientRects().length && d.getAttribute('aria-modal') !== 'false' && !d.classList.contains('tourBubble'); }
function topDialog() { const ds = $$(DIALOGS).filter(isModal); return ds[ds.length - 1] || null; }
function dialogs() {
  for (const d of $$(DIALOGS)) {
    if (d.dataset.a11yDlg) continue;
    d.dataset.a11yDlg = '1';
    if (!d.getAttribute('role')) d.setAttribute('role', 'dialog');
    const fixed = getComputedStyle(d).position === 'fixed';
    if (fixed && !d.hasAttribute('aria-modal')) d.setAttribute('aria-modal', 'true');
    if (!d.hasAttribute('aria-label') && !d.hasAttribute('aria-labelledby')) { const h = $('h1,h2,h3,strong', d); if (h && hasWords(h.textContent)) { h.id = h.id || 'a11yDlg' + Math.random().toString(36).slice(2, 7); d.setAttribute('aria-labelledby', h.id); } }
    const a = document.activeElement; openers.set(d, a && a !== document.body && !d.contains(a) ? describe(a) : lastFocus);
    tracked.push(d);
    if (!d.contains(document.activeElement) && isModal(d)) { const f = focusables(d)[0]; if (f) f.focus({ preventScroll: true }); else { d.tabIndex = -1; d.focus({ preventScroll: true }); } }
  }
  // Closed dialogs: put focus back where it was.
  const gone = tracked.filter(d => !d.isConnected); if (!gone.length) return;
  tracked = tracked.filter(d => d.isConnected);
  const a = document.activeElement; if (a && a !== document.body && a.isConnected) return;
  if (topDialog()) { const f = focusables(topDialog())[0]; f?.focus({ preventScroll: true }); return; }
  const back = findLike(openers.get(gone[gone.length - 1])); if (back) back.focus({ preventScroll: true }); else if (lastInput === 'key') focusMain();
}
function closeButton(d) {
  return $('.dX,.tdClose,.a11yX,#closeInspect,[aria-label^="Close" i],[aria-label^="Skip" i],[data-close]', d) || $$('button', d).find(b => /^(×|✕|✖|close|cancel|not now|maybe later|skip)$/i.test((b.textContent || '').trim()));
}
addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    const d = topDialog(); if (!d) return; const f = focusables(d); if (!f.length) return;
    const first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (!d.contains(a)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    return;
  }
  if (e.key !== 'Escape') return;
  // The user menu
  const m = $('.uiMenu'); if (m) { e.preventDefault(); closeMenu(m, true); return; }
  // Let the dialog's own Escape handler run first; close it ourselves only if it is still open.
  const d = topDialog() || (document.activeElement?.closest?.('.tourBubble,#inspectCard') || null);
  if (!d) return;
  setTimeout(() => { if (!d.isConnected || !d.getClientRects().length) return; const c = closeButton(d); if (c) c.click(); }, 0);
});

/* ------------------------------------------------------------ Battle: Space on a focused button presses it (instead of ending the turn) */
addEventListener('keydown', e => {
  if (e.key !== ' ' || B.view !== 'cardBattle') return;
  const t = e.target; if (t && t.closest?.('button,[role=button],a[href],summary,input,select,textarea,label,[role=menuitem],[role=radio],[role=checkbox]')) e.stopPropagation();
}, true);
// Enter / Space on role=button elements we created.
addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const t = e.target; if (!t?.matches?.('[role=button]:not(button):not(a)')) return;
  e.preventDefault(); t.click();
});

/* ------------------------------------------------------------ User menu: keyboard support and the Accessibility item */
let menuAnchor = null;
function closeMenu(m, refocus) {
  m.remove(); const a = menuAnchor || $$('.uiUserBtn').find(b => b.getAttribute('aria-expanded') === 'true');
  $$('.uiUserBtn').forEach(b => b.setAttribute('aria-expanded', 'false'));
  if (refocus && a?.isConnected) a.focus();
}
function enhanceMenu(m) {
  if (m.dataset.a11y) return; m.dataset.a11y = '1';
  menuAnchor = $$('.uiUserBtn').find(b => b.getAttribute('aria-expanded') === 'true') || (document.activeElement?.closest?.('.uiUserBtn')) || null;
  m.setAttribute('aria-label', 'Player menu');
  if (!$('#a11yMenuGo', m)) {
    const b = document.createElement('button'); b.id = 'a11yMenuGo'; b.setAttribute('role', 'menuitem'); b.type = 'button';
    b.innerHTML = '<span aria-hidden="true">♿</span> Accessibility';
    b.addEventListener('click', ev => { ev.stopPropagation(); closeMenu(m, false); openPanel(menuAnchor); });
    m.appendChild(b);
  }
  const items = () => $$('[role=menuitem]', m).filter(i => i.getClientRects().length);
  items().forEach(i => { i.tabIndex = -1; });
  m.addEventListener('keydown', e => {
    const list = items(), i = list.indexOf(document.activeElement);
    const go = n => { e.preventDefault(); list[(n + list.length) % list.length]?.focus(); };
    if (e.key === 'ArrowDown') go(i + 1); else if (e.key === 'ArrowUp') go(i - 1); else if (e.key === 'Home') go(0); else if (e.key === 'End') go(list.length - 1);
    else if (e.key === 'Tab') { closeMenu(m, true); }
  });
  if (lastInput === 'key') items()[0]?.focus();
}

/* ------------------------------------------------------------ Accessibility panel */
function openPanel(opener) {
  $('#a11yPanel')?.remove();
  const o = opts();
  const d = document.createElement('div'); d.id = 'a11yPanel'; d.className = 'a11yDlg'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'a11yTitle');
  d.innerHTML = `<div class="a11yBox">
   <button type="button" class="a11yX" aria-label="Close accessibility options">×</button>
   <h2 id="a11yTitle">Accessibility</h2>
   <fieldset><legend>Text size</legend><div class="a11yOpts">${SIZES.map(([k, t]) => `<label><input type="radio" name="a11yText" value="${k}" ${o.text === k ? 'checked' : ''}> ${t}</label>`).join('')}</div>
    <p class="a11yHint">Makes the words in menus, lists, pop-ups and buttons bigger. Painted pages grow their text a little; printed cards keep their size (open a card to read its details).</p></fieldset>
   <fieldset><legend>Element symbols</legend><div class="a11yOpts">${[['off', 'Off'], ['on', 'On']].map(([k, t]) => `<label><input type="radio" name="a11ySym" value="${k}" ${(o.symbols ? 'on' : 'off') === k ? 'checked' : ''}> ${t}</label>`).join('')}</div>
    <p class="a11yHint">Gives every element its own badge shape as well as its colour and picture, and prints the rarity in words on each card. Helpful if some colours look alike to you.</p>
    <ul class="a11yEls" aria-label="Element badges">${Object.keys(ELEMENTS).map(n => `<li>${elIcon(n)} ${n}</li>`).join('')}</ul></fieldset>
   <p class="a11yKeys"><b>Keyboard:</b> <kbd>Tab</kbd> moves, <kbd>Enter</kbd> or <kbd>Space</kbd> chooses, <kbd>Esc</kbd> closes pop-ups. In battle: <kbd>1</kbd> / <kbd>2</kbd> attack, <kbd>E</kbd> adds Merfling, <kbd>Space</kbd> ends your turn (when no button is selected). In the binder, <kbd>←</kbd> <kbd>→</kbd> turn pages.</p>
   <button type="button" class="button gold a11yDone">Done</button></div>`;
  document.body.appendChild(d);
  const back = describe(opener && opener.isConnected ? opener : document.activeElement);
  const close = () => { d.remove(); const el = findLike(back) || $$('.uiUserBtn').find(b => b.getClientRects().length); el?.focus({ preventScroll: true }); };
  d.addEventListener('change', e => {
    if (e.target.name === 'a11yText') { setOpt('text', e.target.value); announce('Text size: ' + SIZES.find(s => s[0] === e.target.value)[1]); }
    if (e.target.name === 'a11ySym') { setOpt('symbols', e.target.value === 'on'); announce('Element symbols ' + e.target.value); }
  });
  $('.a11yX', d).onclick = close; $('.a11yDone', d).onclick = close;
  d.addEventListener('click', e => { if (e.target === d) close(); });
  d.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } });
  d.dataset.a11yDlg = '1'; tracked.push(d); openers.set(d, back);
  $('input:checked', d)?.focus({ preventScroll: true });
}

/* ------------------------------------------------------------ Start */
function init() {
  css(); apply();
  if (!$('.a11ySkip')) {
    const a = document.createElement('a'); a.className = 'a11ySkip'; a.href = '#app'; a.textContent = 'Skip to main content';
    a.onclick = e => { e.preventDefault(); const m = mainEl(); m?.scrollIntoView({ block: 'start' }); focusMain(); };
    document.body.prepend(a);
  }
  if (!$('#a11yLive')) {
    document.body.insertAdjacentHTML('beforeend', '<div id="a11yLive" class="a11ySr" role="status" aria-live="polite" aria-atomic="true"></div><div id="a11yAlert" class="a11ySr" role="alert" aria-live="assertive" aria-atomic="true"></div>');
  }
  live = $('#a11yLive');
  let lastView = B.view;
  addEventListener('ember:frame', e => {
    apply();
    const v = e.detail?.view || B.view, changed = v !== lastView; lastView = v;
    queuePatch(true);
    requestAnimationFrame(() => setTimeout(() => {
      restoreFocus(changed);
      if (changed) { const h = $('[data-a11y-main] h1, #app h1, [data-a11y-main] h2, #app h2'); const t = (h?.textContent || h?.querySelector('img')?.alt || '').trim(); if (t && v !== 'cardBattle') announce(t.replace(/^[^\p{L}\p{N}]+/u, '').slice(0, 80)); }
    }, 60));
  });
  addEventListener('ember:packReveal', e => { const c = e.detail?.creature; if (!c) return; const r = RARITIES()[e.detail.rank ?? 0] || ''; const el = B.species?.[c.kind]?.element; announce(`Card revealed: ${nameOf(c)}${r ? ', ' + r : ''}${el ? ', ' + el : ''}${c.shiny ? ', shiny' : ''}${c.mutation ? ', ' + c.mutation + ' mutation' : ''}.`); });
  addEventListener('ember:packSummary', e => { const cs = e.detail?.creatures || []; if (cs.length) announce(`Pack opened: ${cs.map(nameOf).join(', ')}.`); });
  addEventListener('ember:coins', e => { const d = e.detail || {}; if (d.amount > 0) announce(`Collected ${fmt(d.amount)} coins. You now have ${fmt(d.to)} coins.`); });
  addEventListener('ember:levelUp', e => { const d = e.detail || {}; if (d.creature) announce(`${nameOf(d.creature)} reached level ${d.to}!`); });
  addEventListener('ember:fusion', e => { const c = e.detail?.creature; if (c) announce(`Fusion complete: ${nameOf(c)}.`); });
  addEventListener('ember:cardBattle', e => { try { onBattle(e.detail || {}); } catch (err) { console.warn('a11y battle', err); } });
  addEventListener('ember:cardResult', e => { const r = e.detail || {}; announce(r.victory ? 'Victory! You won the battle.' : 'Battle over. Your opponent won.', true); });
  addEventListener('ember:tradeComplete', () => announce('Trade complete.'));
  new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1 && n.matches('.uiMenu')) enhanceMenu(n);
    queuePatch();
  }).observe(document.body, { childList: true, subtree: true });
  queuePatch();
  window.EmberA11y = { open: () => openPanel(document.activeElement), options: opts, set: setOpt, announce };
}
if (B) init();
