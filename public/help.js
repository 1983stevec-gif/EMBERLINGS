// EMBERLINGS Help centre: a searchable "How do I…?" page and a Glossary (view "help").
// Content lives in help-data.js. Each answer has a "Take me there" button that opens the screen or panel it is about.
// Opened from the player menu ("❓ Help"), from Settings (Help block) and with window.EmberHelp.open(search).
// Presentation only: no save data, no gameplay changes.
import { CATEGORIES, ANSWERS, GLOSSARY } from './help-data.js';

/* ------------------------------------------------------------ Pure helpers (also used by tests/help-data.mjs) */
export const words = s => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
// Every word of the search must appear in the item; matches in the question (or term) count most.
export function score(fields, query) {
  const q = words(query); if (!q.length) return 1;
  const title = words(fields.title).join(' '), body = words(fields.body).join(' '), keys = words(fields.keys).join(' ');
  let s = 0;
  for (const w of q) {
    const t = title.includes(w), k = keys.includes(w), b = body.includes(w);
    if (!t && !k && !b) return 0;
    s += t ? 5 : k ? 3 : 1;
    if (new RegExp('(^| )' + w).test(title)) s += 2; // a whole word at the start of a title word
  }
  return s;
}
export function searchAnswers(query, cat = 'all', list = ANSWERS) {
  return list.map((a, i) => ({ a, i, s: (cat === 'all' || a.cat === cat) ? score({ title: a.q, body: a.a, keys: a.k }, query) : 0 }))
    .filter(x => x.s > 0).sort((x, y) => words(query).length ? y.s - x.s || x.i - y.i : x.i - y.i).map(x => x.a);
}
export function searchGlossary(query, list = GLOSSARY) {
  return list.map(g => ({ g, s: score({ title: g.term, body: g.def, keys: g.k }, query) })).filter(x => x.s > 0)
    .sort((x, y) => words(query).length ? y.s - x.s || x.g.term.localeCompare(y.g.term) : x.g.term.localeCompare(y.g.term)).map(x => x.g);
}
// What a "to" target does: { kind: 'view' | 'settings' | 'panel', id }.
export const PANELS = ['daily', 'whatsnew', 'inbox', 'keys'];
export function target(to) {
  if (!to) return null;
  if (to.startsWith('settings:')) return { kind: 'settings', id: to.slice(9) };
  if (PANELS.includes(to)) return { kind: 'panel', id: to };
  return { kind: 'view', id: to };
}

/* ------------------------------------------------------------ In the game */
const B = globalThis.window?.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
let query = '', cat = 'all', openId = null;

function go(to) {
  const t = target(to); if (!t) return;
  if (t.kind === 'settings') return window.EmberSettings?.open ? window.EmberSettings.open(t.id) : B.go('settings');
  if (t.kind === 'panel') {
    const open = { daily: () => window.EmberDaily?.open?.(), whatsnew: () => window.EmberWhatsNew?.open?.(), inbox: () => window.EmberInbox?.open?.(), keys: () => window.EmberA11y?.open?.() }[t.id];
    B.go('home'); setTimeout(() => open?.(), 250); return;
  }
  B.go(t.id);
}

const answerHTML = a => `<li class="hpItem"><details data-hp-id="${esc(a.id)}"${a.id === openId ? ' open' : ''}><summary><span class="hpCat" aria-hidden="true">${CAT[a.cat]?.icon || '❓'}</span><span class="hpQ">${esc(a.q)}</span></summary>
  <div class="hpA"><p>${esc(a.a)}</p>${a.to ? `<button type="button" class="hpGo" data-hp-go="${esc(a.to)}">Take me there ›</button>` : ''}</div></details></li>`;
const termHTML = g => `<div class="hpTerm"><dt>${esc(g.term)}</dt><dd><p>${esc(g.def)}</p>${g.to ? `<button type="button" class="hpGo small" data-hp-go="${esc(g.to)}">Take me there ›</button>` : ''}</dd></div>`;

function results() {
  const ans = searchAnswers(query, cat), terms = cat === 'all' ? searchGlossary(query) : [];
  const grouped = query ? [{ cat: null, list: ans }] : CATEGORIES.filter(c => cat === 'all' || c.id === cat).map(c => ({ cat: c, list: ans.filter(a => a.cat === c.id) })).filter(g => g.list.length);
  const n = ans.length + terms.length;
  return `<p class="hpCount" role="status" aria-live="polite">${query ? (n ? `${n} result${n === 1 ? '' : 's'} for “${esc(query)}”` : `No answers for “${esc(query)}”.`) : cat === 'all' ? `${ANSWERS.length} answers and ${GLOSSARY.length} glossary words` : `${ans.length} answers about ${esc(CAT[cat]?.name || '')}`}</p>
   ${n ? '' : `<div class="hpEmpty"><p>Try a shorter or different word, like <button type="button" class="hpTry" data-hp-try="coins">coins</button>, <button type="button" class="hpTry" data-hp-try="trade">trade</button> or <button type="button" class="hpTry" data-hp-try="vault">vault</button>.</p><p>The full rules are in <button type="button" class="hpGo small" data-hp-go="rules">Battle Rules ›</button></p></div>`}
   ${grouped.map(g => `<section class="hpGroup">${g.cat ? `<h2><span aria-hidden="true">${g.cat.icon}</span> ${esc(g.cat.name)}</h2>` : (ans.length ? '<h2>Answers</h2>' : '')}<ul class="hpList">${g.list.map(answerHTML).join('')}</ul></section>`).join('')}
   ${terms.length ? `<section class="hpGroup" id="hpGlossary"><h2><span aria-hidden="true">📖</span> Glossary</h2><dl class="hpGloss">${terms.map(termHTML).join('')}</dl></section>` : ''}`;
}

function paintResults() { const box = $('#hpResults'); if (box) box.innerHTML = results(); }
function render() {
  B.render(`<button class="back" data-go="home">‹ Home</button>
  <section class="hpPage" aria-labelledby="hpTitle">
   <header class="hpHead"><h1 id="hpTitle"><span aria-hidden="true">❓</span> Help centre</h1><p>Search for what you want to do, or browse by topic. Every answer can take you straight there.</p></header>
   <form class="hpSearch" role="search" onsubmit="return false"><label for="hpQ" class="hpSr">Search help</label><span aria-hidden="true">🔍</span><input id="hpQ" type="search" placeholder="How do I…? e.g. open a pack, trade, Vault" autocomplete="off" spellcheck="false" value="${esc(query)}">${query ? '<button type="button" class="hpClear" aria-label="Clear search">×</button>' : ''}</form>
   <div class="hpChips" role="group" aria-label="Topics"><button type="button" class="hpChip" data-hp-cat="all" aria-pressed="${cat === 'all'}">All</button>${CATEGORIES.map(c => `<button type="button" class="hpChip" data-hp-cat="${c.id}" aria-pressed="${cat === c.id}"><span aria-hidden="true">${c.icon}</span> ${esc(c.name)}</button>`).join('')}</div>
   <div id="hpResults">${results()}</div>
   <p class="hpFoot">Still stuck? The full rules are in <button type="button" class="hpGo small" data-hp-go="rules">Battle Rules ›</button> and you can replay the beginner guide from <button type="button" class="hpGo small" data-hp-go="settings:app">Settings ›</button></p>
  </section>`);
  bind();
}
function bind() {
  const page = $('.hpPage'); if (!page) return;
  const input = $('#hpQ', page);
  input.addEventListener('input', () => {
    query = input.value; const clear = $('.hpClear', page);
    if (query && !clear) { input.insertAdjacentHTML('afterend', '<button type="button" class="hpClear" aria-label="Clear search">×</button>'); }
    if (!query && clear) clear.remove();
    paintResults();
  });
  page.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('hpClear')) { query = ''; input.value = ''; b.remove(); paintResults(); input.focus(); return; }
    if (b.dataset.hpCat) { cat = b.dataset.hpCat; $$('.hpChip', page).forEach(c => c.setAttribute('aria-pressed', String(c === b))); paintResults(); return; }
    if (b.dataset.hpTry) { query = b.dataset.hpTry; input.value = query; input.dispatchEvent(new Event('input')); input.focus(); return; }
    if (b.dataset.hpGo) { go(b.dataset.hpGo); }
  });
  page.addEventListener('toggle', e => { const d = e.target; if (d.matches?.('details[data-hp-id]') && d.open) openId = d.dataset.hpId; }, true);
  B.bind?.();
}

export function open(search = '', id = null) {
  query = String(search || ''); cat = 'all'; openId = id;
  $('.uiMenu')?.remove();
  B.go('help');
  if (id) requestAnimationFrame(() => $(`details[data-hp-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'center' }));
}

/* Entry points: player menu item and a Help block in Settings. */
function addMenuItem() {
  const menu = $('.uiMenu'); if (!menu || $('#hpMenuGo', menu)) return;
  const b = document.createElement('button');
  b.id = 'hpMenuGo'; b.type = 'button'; b.setAttribute('role', 'menuitem'); b.tabIndex = -1;
  b.innerHTML = '<span aria-hidden="true">❓</span> Help';
  b.addEventListener('click', ev => { ev.stopPropagation(); open(); });
  const anchor = $('#uiSettingsGo', menu);
  if (anchor) anchor.after(b); else menu.appendChild(b);
}
let hooked = false;
function hookSettings() {
  if (hooked || !window.EmberSettings?.addSection) return;
  const popular = ['start-first', 'packs-open', 'start-coins'].map(id => ANSWERS.find(a => a.id === id)).filter(Boolean);
  hooked = window.EmberSettings.addSection({
    id: 'help', icon: '❓', title: 'Help', order: 1,
    html: () => `<p class="setHelp">Answers to common questions, and a glossary of game words.</p>
      <ul class="hpPopular">${popular.map(a => `<li><button type="button" class="hpLink" data-hp-open="${esc(a.id)}">${esc(a.q)}</button></li>`).join('')}</ul>
      <p class="setBtns"><button type="button" class="setBtn gold" data-hp-open="">❓ Open the Help centre</button></p>`,
    bind: el => el.addEventListener('click', e => { const b = e.target.closest('[data-hp-open]'); if (b) open('', b.dataset.hpOpen || null); })
  }) !== false;
}

const CSS = `
/* Help centre (help.js) */
.hpPage{max-width:980px;margin:0 auto;padding:4px 16px 40px;color:#eef1fb}
.hpHead h1{margin:6px 0 4px;font:700 clamp(30px,5vw,42px)/1.1 'Cormorant Garamond',Georgia,serif;color:#ffe3a0}
.hpHead p{margin:0 0 14px;font-size:17px;color:#dfe5f6}
.hpSearch{position:relative;display:flex;align-items:center;gap:10px;padding:0 12px;border:2px solid #c9a35a;border-radius:14px;background:#0b1230;box-shadow:0 6px 18px #0007}
.hpSearch>span{font-size:20px}
.hpSearch input{flex:1;min-width:0;min-height:54px;border:0;background:none;color:#fff;font:18px system-ui,'Segoe UI',sans-serif;outline:none}
.hpSearch:focus-within{box-shadow:0 0 0 3px #ffdd7e88,0 6px 18px #0007}
.hpSearch input::-webkit-search-cancel-button{display:none}
.hpClear{flex:none;width:44px;height:44px;border-radius:50%;border:0;background:#ffffff14;color:#dfe5f6;font-size:24px;cursor:pointer}
.hpSr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.hpChips{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 6px}
.hpChip{min-height:44px;padding:0 14px;border-radius:99px;border:1.5px solid #33467e;background:#0d1534;color:#dfe5f6;font:600 15px system-ui,'Segoe UI',sans-serif;cursor:pointer}
.hpChip[aria-pressed="true"]{background:linear-gradient(180deg,#ffe29a,#e8ae45);color:#2a1606;border-color:#fff1c2}
.hpCount{margin:10px 0;font-size:15px;color:#9aa6c8}
.hpGroup{margin:18px 0 0}
.hpGroup h2{margin:0 0 8px;font:700 24px 'Cormorant Garamond',Georgia,serif;color:#f6dfa4}
.hpList{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.hpItem details{border:1px solid #33467e;border-radius:12px;background:linear-gradient(180deg,#121b3e,#0b1230)}
.hpItem details[open]{border-color:#c9a35a}
.hpItem summary{display:flex;align-items:center;gap:12px;min-height:52px;padding:8px 14px;cursor:pointer;list-style:none;font:600 17px/1.3 system-ui,'Segoe UI',sans-serif;color:#fff4e0}
.hpItem summary::-webkit-details-marker{display:none}
.hpItem summary::after{content:'›';margin-left:auto;font-size:24px;color:#c9a35a;transition:transform .2s}
.hpItem details[open] summary::after{transform:rotate(90deg)}
.hpItem summary:focus-visible,.hpGo:focus-visible,.hpChip:focus-visible,.hpTry:focus-visible,.hpLink:focus-visible,.hpClear:focus-visible{outline:3px solid #ffdd7e;outline-offset:2px}
.hpCat{flex:none;font-size:20px}
.hpA{padding:0 14px 14px 46px}
.hpA p{margin:0 0 10px;font:17px/1.5 system-ui,'Segoe UI',sans-serif;color:#dfe5f6}
.hpGo{min-height:44px;padding:0 18px;border-radius:10px;border:1.5px solid #fff1c2;background:linear-gradient(180deg,#ffe29a,#e8ae45);color:#2a1606;font:700 17px 'Cormorant Garamond',Georgia,serif;cursor:pointer}
.hpGo.small{min-height:40px;padding:0 12px;font-size:16px;background:#ffffff10;color:#ffe2a0;border-color:#c9a35a}
.hpGloss{margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}
.hpTerm{padding:12px 14px;border:1px solid #33467e;border-radius:12px;background:#0d1534}
.hpTerm dt{font:700 20px 'Cormorant Garamond',Georgia,serif;color:#ffe3a0}
.hpTerm dd{margin:4px 0 0}.hpTerm dd p{margin:0 0 8px;font:15px/1.45 system-ui,'Segoe UI',sans-serif;color:#dfe5f6}
.hpEmpty{padding:14px;border:1px dashed #33467e;border-radius:12px;font-size:16px;color:#dfe5f6}.hpEmpty p{margin:4px 0}
.hpTry,.hpLink{min-height:40px;padding:0 6px;border:0;background:none;color:#ffd77a;font:inherit;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.hpFoot{margin:26px 0 0;font-size:15px;color:#9aa6c8}
.hpPopular{margin:6px 0;padding-left:18px}
@media(max-width:600px){.hpA{padding-left:14px}.hpChips{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.hpChip{flex:none}}
`;

if (B && !window.EmberHelp) {
  const st = document.createElement('style'); st.id = 'hpStyles'; st.textContent = CSS; document.head.append(st);
  B.registerView('help', render);
  let q = false;
  new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; try { addMenuItem(); } catch (err) { console.warn('help', err); } }); }).observe(document.body, { childList: true });
  addEventListener('ember:frame', hookSettings); hookSettings(); setTimeout(hookSettings, 0);
  window.EmberHelp = Object.freeze({ open, search: q2 => searchAnswers(q2) });
}
