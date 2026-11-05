// EMBERLINGS binder tools: favourites, saved views and collection export for My Binder.
// - Favourites: star a card on its Card details page, or hold / right-click a binder pocket. A "★ Favourites" chip
//   shows only starred cards, and starred pockets wear a small star. Stored in state.ember.favourites = [cardId…]
//   (capped, and cleaned when a card leaves the collection through a trade or fusion).
// - Saved views: "Save view" keeps the binder's search, filters, sort and the Favourites chip under a short name,
//   up to 6, as chips above the binder. Tap to apply, hold (or right-click) to delete. state.ember.binderPresets.
// - Export: a spreadsheet (CSV) of every card you own, and a picture sheet (PNG) of your collection, made on this
//   device and shared with the Web Share API where available, otherwise downloaded. Nothing is uploaded.
// Favourites are only a label: they never protect, lock or change a card. Before a favourite is offered in a trade
// or used in the Fusion Lab, a gentle "trade/fuse it anyway?" question is asked; saying yes carries on as normal.
// All save data is additive (only created when missing). No gameplay or reward changes.

export const FAV_CAP = 300, PRESET_CAP = 6, NAME_MAX = 16;
export const FILTER_KEYS = ['q', 'element', 'rarity', 'mutation', 'level'];
export const SORTS = ['recent', 'name', 'level', 'rarity', 'element'];
const STAGES = ['Basic', 'Ascended', 'Apex'];

/* ------------------------------------------------------------ Pure helpers (also used by tests/binder-tools.mjs) */
// Keeps only ids of cards still owned, without duplicates, newest stars last, at most FAV_CAP. Returns true if changed.
export function cleanFavourites(ember, owned) {
  if (!ember || !Array.isArray(ember.favourites) || !Array.isArray(owned) || !owned.length) return false; // never wipe on a half-loaded save
  const have = new Set((owned || []).map(c => c?.id).filter(Boolean)), seen = new Set(), out = [];
  for (const id of ember.favourites) if (typeof id === 'string' && have.has(id) && !seen.has(id)) { seen.add(id); out.push(id); }
  const next = out.slice(-FAV_CAP), changed = next.length !== ember.favourites.length || next.some((id, i) => id !== ember.favourites[i]);
  if (changed) ember.favourites = next;
  return changed;
}
// Cleans saved views: valid names and known filter keys only, at most PRESET_CAP. Returns true if changed.
export function cleanPresets(ember) {
  if (!ember || ember.binderPresets === undefined) return false;
  const before = JSON.stringify(ember.binderPresets);
  const list = Array.isArray(ember.binderPresets) ? ember.binderPresets : [];
  ember.binderPresets = list.filter(p => p && typeof p.name === 'string' && p.name.trim()).slice(0, PRESET_CAP).map(p => {
    const f = {}; for (const k of FILTER_KEYS) if (typeof p.f?.[k] === 'string' && p.f[k]) f[k] = p.f[k].slice(0, 40);
    return { name: p.name.trim().slice(0, NAME_MAX), f, sort: SORTS.includes(p.sort) ? p.sort : 'recent', fav: !!p.fav };
  });
  return JSON.stringify(ember.binderPresets) !== before;
}
const day = t => { const d = new Date(t); return isNaN(d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
// One row per distinct card (same species, form, rarity, mutation, shiny and level), with how many copies you own
// and the earliest date one of them was found (if card-details.js recorded it).
// h = { name(kind), element(kind), rarity(card), rank(card), mutation(id) -> name, origins, favourites:Set }
export function collectionRows(owned, h) {
  const groups = new Map();
  for (const c of owned || []) {
    if (!c || !Number.isInteger(c.kind)) continue;
    const rank = h.rank(c), form = (rank >= 4 ? 'Radiant ' : '') + (STAGES[c.stage || 0] || 'Basic');
    const row = { kind: c.kind, species: h.name(c.kind), number: String(c.kind + 1).padStart(3, '0'), element: h.element(c.kind) || '', form, rarity: h.rarity(c), rank,
      mutation: c.mutation ? (h.mutation(c.mutation) || c.mutation) : '', shiny: !!c.shiny, level: c.level || 1 };
    const key = [row.kind, row.form, row.rarity, row.mutation, row.shiny, row.level].join('|');
    const at = Number(h.origins?.[c.id]?.at) || 0, g = groups.get(key);
    if (g) { g.copies++; if (at && (!g.at || at < g.at)) g.at = at; if (h.favourites?.has(c.id)) g.favourite = true; }
    else groups.set(key, { ...row, copies: 1, at, favourite: !!h.favourites?.has(c.id) });
  }
  return [...groups.values()].sort((a, b) => a.kind - b.kind || b.rank - a.rank || a.mutation.localeCompare(b.mutation) || Number(b.shiny) - Number(a.shiny) || b.level - a.level);
}
// Spreadsheet-safe text: quotes where needed and no formula injection.
const cell = v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export const CSV_HEAD = ['Species', 'Number', 'Element', 'Form', 'Rarity', 'Mutation', 'Shiny', 'Level', 'Copies', 'Date found', 'Favourite'];
export function toCSV(rows) {
  const lines = [CSV_HEAD.join(',')];
  for (const r of rows) lines.push([r.species, r.number, r.element, r.form, r.rarity, r.mutation || 'None', r.shiny ? 'Yes' : 'No', r.level, r.copies, r.at ? day(r.at) : '', r.favourite ? 'Yes' : ''].map(cell).join(','));
  return lines.join('\r\n') + '\r\n';
}
// Picture sheet tiles: one per species + rarity + mutation + shiny (levels merged), with a count.
export function sheetTiles(rows) {
  const m = new Map();
  for (const r of rows) {
    const key = [r.kind, r.rarity, r.mutation, r.shiny].join('|'), t = m.get(key);
    if (t) { t.copies += r.copies; t.level = Math.max(t.level, r.level); } else m.set(key, { ...r });
  }
  return [...m.values()];
}

/* ------------------------------------------------------------ Browser side */
const B = globalThis.window?.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const HOLD_MS = 550;

function ember(create) {
  const st = B.state; if (!st) return null;
  if (!st.ember || typeof st.ember !== 'object') { if (!create) return null; st.ember = {}; }
  return st.ember;
}
const favList = () => { const e = ember(false); return Array.isArray(e?.favourites) ? e.favourites : []; };
const isFav = id => favList().includes(id);
const presets = () => { const e = ember(false); return Array.isArray(e?.binderPresets) ? e.binderPresets : []; };
const nameOf = kind => B.species[kind]?.name || 'Mythling';
function persist() { try { B.save(); } catch (e) { /* the next screen draw saves anyway */ } }

function toggleFav(id) {
  const c = (B.state.owned || []).find(x => x.id === id); if (!c) return null;
  const e = ember(true); if (!Array.isArray(e.favourites)) e.favourites = [];
  const i = e.favourites.indexOf(id);
  if (i >= 0) e.favourites.splice(i, 1);
  else { if (e.favourites.length >= FAV_CAP) { B.toast?.(`You can star up to ${FAV_CAP} cards. Unstar one first.`); return null; } e.favourites.push(id); }
  persist();
  const on = i < 0; B.toast?.(on ? `★ ${nameOf(c.kind)} added to your favourites` : `${nameOf(c.kind)} removed from your favourites`);
  try { dispatchEvent(new CustomEvent('ember:favourites', { detail: { id, on } })); } catch (e2) { /* old browsers */ }
  return on;
}

/* ------------------------------------------------------------ Small dialog (ask / confirm / choose) */
let dialogOpen = null;
function dialog({ title, text = '', input = null, buttons }) {
  dialogOpen?.(null);
  return new Promise(resolve => {
    const prev = document.activeElement, wrap = document.createElement('div');
    wrap.id = 'btDialog'; wrap.innerHTML = `<div class="btDlg" role="dialog" aria-modal="true" aria-labelledby="btDlgTitle"><h2 id="btDlgTitle">${esc(title)}</h2>${text ? `<p>${text}</p>` : ''}
      ${input ? `<label class="btDlgField"><span>${esc(input.label)}</span><input id="btDlgInput" type="text" maxlength="${input.max || NAME_MAX}" value="${esc(input.value || '')}" autocomplete="off" enterkeyhint="done"></label>` : ''}
      <div class="btDlgBtns">${buttons.map((b, i) => `<button type="button" class="btBtn ${b.cls || ''}" data-bt-dlg="${i}">${b.label}</button>`).join('')}</div></div>`;
    document.body.append(wrap);
    const done = v => { if (!wrap.isConnected) return; wrap.remove(); removeEventListener('keydown', key, true); dialogOpen = null; try { prev?.focus?.({ preventScroll: true }); } catch (e) { /* gone */ } resolve(v); };
    dialogOpen = done;
    const field = $('#btDlgInput', wrap);
    const pick = i => { const b = buttons[i]; if (b.value === undefined) return done(null); if (input && b.value === true) { const v = field.value.trim(); if (!v) { field.focus(); return; } return done(v); } done(b.value); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(null); } else if (e.key === 'Enter' && field && document.activeElement === field) { e.preventDefault(); pick(buttons.findIndex(b => b.value === true)); } };
    addEventListener('keydown', key, true);
    wrap.addEventListener('click', e => { const b = e.target.closest('[data-bt-dlg]'); if (b) pick(+b.dataset.btDlg); else if (e.target === wrap) done(null); });
    (field || $('.btBtn.btGold', wrap) || $('.btBtn', wrap))?.focus();
    if (field) field.select();
  });
}

/* ------------------------------------------------------------ Favourites in the binder */
let favOnly = false, favPage = 0, lastView = null;
function matches(c, f) {
  const m = B.meta(c);
  return (!f.rarity || B.rarityLabel(c) === f.rarity) && (!f.element || m.element === f.element)
    && (!f.mutation || (f.mutation === 'none' ? !c.mutation : c.mutation === f.mutation))
    && (!f.level || (c.level || 1) >= +f.level) && (!f.q || m.name.toLowerCase().includes(f.q));
}
function sorted(list, sort) {
  const m = c => B.meta(c);
  if (sort === 'name') list.sort((a, b) => m(a).name.localeCompare(m(b).name));
  else if (sort === 'level') list.sort((a, b) => (b.level || 1) - (a.level || 1));
  else if (sort === 'rarity') list.sort((a, b) => B.rarityRank(b) - B.rarityRank(a));
  else if (sort === 'element') list.sort((a, b) => m(a).element.localeCompare(m(b).element));
  else list.reverse();
  return list;
}
const pocketLabel = c => { const st = B.state; return st.tradeLocks?.[c.id] ? 'LOCKED · IN TRADE / BATTLE' : B.vaulted?.(c) ? 'IN VAULT' : c.id === st.team ? 'ACTIVE PARTNER' : 'FAVOURITE'; };
// Favourites view: the binder's own filters and sort still apply, on top of "starred only". Same pockets and pager.
function renderFavPages() {
  const book = $('.magicalBinder'), pagesEl = book && $('.binderPages', book); if (!pagesEl) return;
  const st = B.state, f = B.binderState(), fav = new Set(favList());
  const list = sorted(st.owned.filter(c => fav.has(c.id) && matches(c, f)), f.sort);
  const pages = Math.max(1, Math.ceil(list.length / 12)); favPage = Math.max(0, Math.min(favPage, pages - 1));
  const slice = list.slice(favPage * 12, favPage * 12 + 12), no = i => String(favPage * 12 + i + 1).padStart(2, '0');
  const empties = Array.from({ length: 12 - slice.length }, (_, i) => `<div class="binderPocket uiEmptyPocket" aria-hidden="true"><span class="uiPocketNo">${no(slice.length + i)}</span><span class="uiSleeve"></span></div>`).join('');
  const none = !slice.length ? `<p class="panel uiNoMatch btNoFav">${fav.size ? 'No favourites match these filters.' : 'No favourites yet. Hold a card (or right-click it) to star it, or use ☆ on its Card details page.'}</p>` : '';
  pagesEl.innerHTML = none + slice.map((c, i) => `<button class="binderPocket" data-inspect-card="${esc(c.id)}"><span class="uiPocketNo">${no(i)}</span>${B.cardHTML(c, { label: pocketLabel(c) })}</button>`).join('') + empties;
  const prev = $('#binderPrev'), next = $('#binderNext'), label = $('.binderPager span'), filled = $('.uiFilled');
  if (prev) { prev.disabled = favPage === 0; prev.onclick = () => { favPage--; renderFavPages(); }; }
  if (next) { next.disabled = favPage + 1 >= pages; next.onclick = () => { favPage++; renderFavPages(); }; }
  if (label) label.textContent = `Page ${favPage + 1} of ${pages}`;
  if (filled) filled.textContent = `${slice.length} of 12 pockets filled`;
  let sx = null; book.onpointerdown = e => { sx = e.clientX; };
  book.onpointerup = e => { if (sx !== null && Math.abs(e.clientX - sx) > 65) { favPage = Math.max(0, Math.min(pages - 1, favPage + (e.clientX < sx ? 1 : -1))); renderFavPages(); } sx = null; };
  badges();
}
function badges() {
  const fav = new Set(favList());
  for (const p of $$('.binderPocket[data-inspect-card]')) {
    const on = fav.has(p.dataset.inspectCard), b = $('.btStar', p);
    if (on && !b) p.insertAdjacentHTML('beforeend', '<span class="btStar" aria-hidden="true">★</span>');
    else if (!on && b) b.remove();
    p.classList.toggle('btIsFav', on);
    const name = p.getAttribute('aria-label');
    if (on && !name) p.setAttribute('aria-label', `${nameOf((B.state.owned.find(c => c.id === p.dataset.inspectCard) || {}).kind)}, favourite`);
  }
}

/* ------------------------------------------------------------ Toolbar: Favourites chip, saved views, export */
function currentView() {
  const f = B.binderState(), out = { f: {}, sort: SORTS.includes(f.sort) ? f.sort : 'recent', fav: favOnly };
  for (const k of FILTER_KEYS) if (f[k]) out.f[k] = String(f[k]);
  return out;
}
const sameView = (a, b) => a.sort === b.sort && !!a.fav === !!b.fav && FILTER_KEYS.every(k => (a.f?.[k] || '') === (b.f?.[k] || ''));
function suggestName(v) {
  const mut = v.f.mutation === 'none' ? 'No mutation' : B.MUTATIONS.find(m => m.id === v.f.mutation)?.name;
  const parts = [v.fav && '★', v.f.q && `"${v.f.q}"`, v.f.element, v.f.rarity, mut, v.f.level && `Lv ${v.f.level}+`].filter(Boolean);
  return (parts.join(' ') || 'My view').slice(0, NAME_MAX);
}
function toolbar() {
  const anchor = $('.uiBinderBar') || $('.binderFilters'); if (!anchor || $('#btBar')) return;
  const bar = document.createElement('div'); bar.id = 'btBar'; bar.className = 'btBar';
  const cur = currentView(), list = presets();
  bar.innerHTML = `<button type="button" class="btChip btFavChip ${favOnly ? 'on' : ''}" data-bt="fav" aria-pressed="${favOnly}"><span aria-hidden="true">★</span> Favourites <small>${favList().length}</small></button>
    <div class="btPresets" role="group" aria-label="Saved views (hold to delete)">${list.map((p, i) => `<button type="button" class="btChip btPreset ${sameView(p, cur) ? 'on' : ''}" data-bt-preset="${i}" title="Tap to show this view · hold to delete">${esc(p.name)}</button>`).join('')}</div>
    <span class="btTools"><button type="button" class="btChip btSave" data-bt="save" title="Save the current search, filters and sort"><span aria-hidden="true">＋</span> Save view</button><button type="button" class="btChip btExport" data-bt="export"><span aria-hidden="true">⇩</span> Export</button></span>`;
  anchor.after(bar);
  bar.addEventListener('click', e => {
    if (Date.now() < suppressUntil) return;
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.bt === 'fav') { favOnly = !favOnly; favPage = 0; redraw(); }
    else if (b.dataset.bt === 'save') savePreset();
    else if (b.dataset.bt === 'export') exportMenu();
    else if (b.dataset.btPreset) applyPreset(presets()[+b.dataset.btPreset]);
  });
}
// Draw the binder again through the game (keeps every other module's binder decorations).
function redraw() { const q = B.binderState().q || ''; B.binderFilter('q', q); }
async function savePreset() {
  const list = presets();
  if (list.length >= PRESET_CAP) return dialog({ title: 'Saved views are full', text: `You can keep ${PRESET_CAP} saved views. Hold one (or right-click it) to delete it, then save again.`, buttons: [{ label: 'OK', cls: 'btGold', value: false }] });
  const v = currentView();
  const name = await dialog({ title: 'Save this view', text: 'Keeps your search, filters, sort and the Favourites chip so you can come back in one tap.', input: { label: 'Name', value: suggestName(v), max: NAME_MAX }, buttons: [{ label: 'Cancel' }, { label: 'Save', cls: 'btGold', value: true }] });
  if (!name) return;
  const e = ember(true); if (!Array.isArray(e.binderPresets)) e.binderPresets = [];
  if (e.binderPresets.length >= PRESET_CAP) return;
  e.binderPresets.push({ name: name.slice(0, NAME_MAX), ...v }); persist();
  B.toast?.(`Saved view "${name.slice(0, NAME_MAX)}"`); refreshBar();
}
async function deletePreset(i) {
  const p = presets()[i]; if (!p) return;
  const ok = await dialog({ title: 'Delete saved view?', text: `"${esc(p.name)}" will be removed. Your cards are not affected.`, buttons: [{ label: 'Keep it' }, { label: 'Delete', cls: 'btDanger', value: true }] });
  if (!ok) return;
  const e = ember(false), at = e?.binderPresets?.indexOf(p); if (at >= 0) { e.binderPresets.splice(at, 1); persist(); B.toast?.('Saved view deleted'); }
  refreshBar();
}
function applyPreset(p) {
  if (!p) return;
  favOnly = !!p.fav; favPage = 0;
  const cur = B.binderState();
  for (const k of ['element', 'rarity', 'mutation', 'level']) if ((cur[k] || '') !== (p.f?.[k] || '')) B.binderFilter(k, p.f?.[k] || '');
  const s = $('#binderSort'), sort = p.sort || 'recent';
  if (s && s.value !== sort) { s.value = sort; s.dispatchEvent(new Event('change')); }
  B.binderFilter('q', p.f?.q || ''); // always redraws once with everything applied
}
function refreshBar() { $('#btBar')?.remove(); if (B.view === 'inventory') toolbar(); }

/* ------------------------------------------------------------ Hold / right-click: pockets star, preset chips delete */
let hold = null, suppressUntil = 0;
const holdTarget = t => t?.closest?.('.binderPocket[data-inspect-card]:not(:disabled)') || t?.closest?.('[data-bt-preset]');
function act(el) {
  suppressUntil = Date.now() + 700;
  try { navigator.vibrate?.(15); } catch (e) { /* not supported */ }
  if (el.dataset.btPreset !== undefined) return deletePreset(+el.dataset.btPreset);
  toggleFav(el.dataset.inspectCard); afterFavChange();
}
function afterFavChange() {
  if (B.view !== 'inventory') return;
  if (favOnly) renderFavPages(); else badges();
  const n = $('.btFavChip small'); if (n) n.textContent = favList().length;
}
function setupHold() {
  document.addEventListener('pointerdown', e => {
    if (B.view !== 'inventory' || e.button > 0) return;
    const el = holdTarget(e.target); if (!el) return;
    clearTimeout(hold?.t); hold = { el, x: e.clientX, y: e.clientY, id: e.pointerId, t: setTimeout(() => { if (hold?.el === el) { hold = null; act(el); } }, HOLD_MS) };
    el.classList.add('btHolding');
  }, true);
  const stop = () => { if (!hold) return; clearTimeout(hold.t); hold.el.classList.remove('btHolding'); hold = null; };
  document.addEventListener('pointermove', e => { if (hold && e.pointerId === hold.id && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > 10) stop(); }, true);
  for (const t of ['pointerup', 'pointercancel', 'scroll']) document.addEventListener(t, stop, true);
  // A long press must not also open the card or apply the view.
  addEventListener('click', e => { if (Date.now() < suppressUntil && holdTarget(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); } $$('.btHolding').forEach(x => x.classList.remove('btHolding')); }, true);
  addEventListener('contextmenu', e => {
    if (B.view !== 'inventory') return;
    const el = holdTarget(e.target); if (!el) return;
    e.preventDefault(); if (Date.now() < suppressUntil) return; // touch: the hold already did it
    stop(); act(el);
  }, true);
}

/* ------------------------------------------------------------ Card details: ☆ / ★ next to the title */
function detailsStar() {
  const root = $('#cardDetails'); if (!root) return;
  const id = root.dataset.cardId, head = $('.cdHead', root); if (!id || !head || $('.btCdStar', head)) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btCdStar';
  const paint = () => { const on = isFav(id); b.classList.toggle('on', on); b.textContent = on ? '★' : '☆'; b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Favourite. Tap to unstar' : 'Add to favourites'); b.title = on ? 'Remove from favourites' : 'Add to favourites'; };
  paint(); head.prepend(b);
  b.addEventListener('click', e => { e.stopPropagation(); toggleFav(id); paint(); afterFavChange(); });
}

/* ------------------------------------------------------------ Gentle check before trading or fusing a favourite */
let bypass = false;
// The Fusion Lab's picks are repainted (and paged) by ui-exact.js, so mirror the game's own pick rule here:
// a tap toggles, at most two. Reset whenever the Fusion Lab is opened afresh.
let fuseSel = [];
const FUSE_VIEWS = ['fusion', 'fuse'];
function trackFusePick(e) {
  const b = e.target?.closest?.('[data-fusion-id]'); if (!b || b.disabled || !FUSE_VIEWS.includes(B.view)) return;
  const id = b.dataset.fusionId;
  if (fuseSel.includes(id)) fuseSel = fuseSel.filter(x => x !== id); else if (fuseSel.length < 2) fuseSel.push(id);
}
function guard() {
  addEventListener('click', async e => {
    trackFusePick(e);
    if (bypass || !favList().length) return;
    const t = e.target;
    let el = null, ids = [], verb = '';
    const tc = t?.closest?.('[data-trade-creature]');
    if (tc && tc.getAttribute('aria-pressed') !== 'true' && !tc.classList.contains('chosen') && isFav(tc.dataset.tradeCreature)) { el = tc; ids = [tc.dataset.tradeCreature]; verb = 'trade'; }
    const fz = !el && t?.closest?.('#fuse');
    if (fz && !fz.disabled) { ids = [...new Set([...fuseSel, ...$$('[data-fusion-id].picked').map(b => b.dataset.fusionId)])].filter(isFav); if (ids.length) { el = fz; verb = 'fuse'; } }
    if (!el) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const names = [...new Set(ids.map(id => nameOf(B.state.owned.find(c => c.id === id)?.kind)))].join(' and ');
    const ok = await dialog({ title: ids.length > 1 ? 'These are favourites' : 'This is a favourite', text: `${esc(names)} ${ids.length > 1 ? 'are' : 'is'} starred in your binder. ${verb === 'trade' ? 'Trade' : 'Fuse'} ${ids.length > 1 ? 'them' : 'it'} anyway?`, buttons: [{ label: 'Keep it' }, { label: verb === 'trade' ? 'Trade anyway' : 'Fuse anyway', cls: 'btGold', value: true }] });
    if (!ok || !el.isConnected) return;
    bypass = true; try { el.click(); } finally { bypass = false; }
  }, true);
}

/* ------------------------------------------------------------ Export */
function rows() {
  const st = B.state, e = ember(false);
  return collectionRows(st.owned || [], {
    name: nameOf, element: k => B.species[k]?.element, rarity: c => B.rarityLabel(c), rank: c => B.rarityRank(c),
    mutation: id => B.MUTATIONS.find(m => m.id === id)?.name, origins: e?.cardOrigins || {}, favourites: new Set(favList())
  });
}
const stamp = () => day(Date.now());
async function deliver(blob, fileName, text) {
  const file = new File([blob], fileName, { type: blob.type });
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try { await navigator.share({ files: [file], title: 'EMBERLINGS', text }); return 'Shared!'; }
    catch (err) { if (err?.name === 'AbortError') return ''; }
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = fileName; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'Saved to your downloads.';
}
async function exportCSV() {
  const blob = new Blob(['﻿' + toCSV(rows())], { type: 'text/csv' });
  return deliver(blob, `emberlings-collection-${stamp()}.csv`, 'My EMBERLINGS collection');
}
const imgCache = new Map();
function loadImg(src) {
  if (!imgCache.has(src)) imgCache.set(src, new Promise(res => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));
  return imgCache.get(src);
}
function rounded(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function fitText(ctx, text, max) { let s = String(text); if (ctx.measureText(s).width <= max) return s; while (s.length > 1 && ctx.measureText(s + '…').width > max) s = s.slice(0, -1); return s + '…'; }
// Same artwork the printed cards use: the first ten species share one sheet (5 x 2), the rest have their own picture.
async function drawArt(ctx, kind, x, y, size) {
  const own = kind >= 10, src = own ? `/art/mythlings/${B.species[kind]?.art}.webp` : '/art/mythlings-atlas-v2.webp', img = await loadImg(src);
  if (!img) { ctx.fillStyle = '#26314f'; ctx.fillRect(x, y, size, size); return; }
  if (own) ctx.drawImage(img, x, y, size, size);
  else { const w = img.naturalWidth / 5, h = img.naturalHeight / 2; ctx.drawImage(img, (kind % 5) * w, (kind < 5 ? 0 : 1) * h, w, h, x, y, size, size); }
}
export const SHEET_MAX = 180;
async function exportPNG() {
  const all = sheetTiles(rows()), tiles = all.slice(0, SHEET_MAX), more = all.length - tiles.length;
  const total = (B.state.owned || []).length, species = new Set((B.state.owned || []).map(c => c.kind)).size;
  const COLS = tiles.length <= 4 ? Math.max(2, tiles.length) : tiles.length <= 12 ? 4 : 6, TW = 230, TH = 312, GAP = 18, PAD = 44, TOP = 170, FOOT = more > 0 ? 110 : 76;
  const W = PAD * 2 + COLS * TW + (COLS - 1) * GAP, R = Math.max(1, Math.ceil(tiles.length / COLS)), H = TOP + R * TH + (R - 1) * GAP + FOOT;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  try { await document.fonts?.load?.('700 40px Cinzel'); } catch (e) { /* system font is fine */ }
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b2440'); g.addColorStop(1, '#0d1222'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#c9a052'; ctx.lineWidth = 4; rounded(ctx, 12, 12, W - 24, H - 24, 22); ctx.stroke();
  const logo = await loadImg('/branding/emberlings-logo-transparent.webp');
  if (logo) { const lh = 92, lw = logo.naturalWidth / logo.naturalHeight * lh; ctx.drawImage(logo, PAD, 34, lw, lh); }
  ctx.textAlign = 'right'; ctx.fillStyle = '#f3e6c4'; ctx.font = '700 40px Cinzel, Georgia, serif';
  ctx.fillText(fitText(ctx, B.state.username ? `${B.state.username}'s binder` : 'My binder', W - PAD - 260), W - PAD, 78);
  ctx.font = '600 24px Georgia, serif'; ctx.fillStyle = '#c8d1ec'; ctx.fillText(`${total} cards · ${species} of ${B.species.length} species`, W - PAD, 116);
  ctx.textAlign = 'left';
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i], x = PAD + (i % COLS) * (TW + GAP), y = TOP + Math.floor(i / COLS) * (TH + GAP);
    const col = B.revealColor?.({ kind: t.kind, rarity: t.rarity, mutation: (B.MUTATIONS.find(m => m.name === t.mutation) || {}).id, shiny: t.shiny, level: t.level }) || '#e9b75a';
    ctx.fillStyle = '#f1e4c4'; rounded(ctx, x, y, TW, TH, 16); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = col; ctx.stroke();
    const AS = TW - 24; ctx.save(); rounded(ctx, x + 12, y + 12, AS, AS, 10); ctx.clip(); await drawArt(ctx, t.kind, x + 12, y + 12, AS); ctx.restore();
    const mark = (ch, cx) => { ctx.fillStyle = 'rgba(14,18,34,.85)'; ctx.beginPath(); ctx.arc(cx, y + 38, 19, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#e9b75a'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#ffd34d'; ctx.font = '700 24px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(ch, cx, y + 46); ctx.textAlign = 'left'; };
    if (t.shiny) mark('✦', x + 38);
    if (t.favourite) mark('★', x + TW - 38);
    // Count bubble.
    ctx.fillStyle = 'rgba(14,18,34,.88)'; rounded(ctx, x + TW - 82, y + AS - 32, 64, 36, 18); ctx.fill();
    ctx.fillStyle = '#fff3d4'; ctx.font = '700 22px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('×' + t.copies, x + TW - 50, y + AS - 7); ctx.textAlign = 'left';
    ctx.fillStyle = '#2b2116'; ctx.font = '700 23px Cinzel, Georgia, serif'; ctx.fillText(fitText(ctx, t.species, TW - 24), x + 12, y + AS + 42);
    const mut = t.mutation ? B.MUTATIONS.find(m => m.name === t.mutation) : null;
    ctx.font = '600 17px Georgia, serif'; ctx.fillStyle = '#5a4630';
    ctx.fillText(fitText(ctx, [t.rarity, mut ? `${mut.icon} ${mut.name}` : '', t.shiny ? 'Shiny' : ''].filter(Boolean).join(' · '), TW - 24), x + 12, y + AS + 70);
  }
  ctx.font = '600 22px Georgia, serif'; ctx.fillStyle = '#c8d1ec'; ctx.textAlign = 'center';
  if (more > 0) ctx.fillText(`…and ${more} more kinds of card`, W / 2, H - 78);
  ctx.fillText(`${stamp()}  ·  Play EMBERLINGS`, W / 2, H - 38);
  const blob = await new Promise(res => cv.toBlob(res, 'image/png')); if (!blob) throw Error('no image');
  return deliver(blob, `emberlings-binder-${stamp()}.png`, 'My EMBERLINGS binder!');
}
async function exportMenu() {
  const n = (B.state.owned || []).length;
  const pick = await dialog({ title: 'Export your collection', text: `All ${n} cards you own. Made on this device. Nothing is uploaded.`, buttons: [{ label: '📄 Spreadsheet (CSV)', cls: 'btGold', value: 'csv' }, { label: '🖼 Picture sheet (PNG)', cls: 'btGold', value: 'png' }, { label: 'Cancel' }] });
  if (!pick) return;
  B.toast?.(pick === 'csv' ? 'Making your spreadsheet…' : 'Making your picture…');
  let msg; try { msg = await (pick === 'csv' ? exportCSV() : exportPNG()); } catch (err) { console.warn('binder-tools', err); msg = 'Sorry, the export could not be made.'; }
  if (msg) B.toast?.(msg);
}

/* ------------------------------------------------------------ Styles */
function injectCSS() {
  if ($('#binder-tools-css')) return;
  const st = document.createElement('style'); st.id = 'binder-tools-css';
  st.textContent = `
.btBar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:10px 0 12px;max-width:100%;box-sizing:border-box}
.btPresets{display:contents}
.btTools{display:flex;gap:8px;margin-left:auto;flex-wrap:wrap}
.btChip{min-height:44px;min-width:44px;padding:8px 16px;border-radius:999px;border:1px solid #6f7fa2;background:#16203a;color:var(--ui-text,#efe6d2);font:600 16px/1.1 var(--ui-serif,Georgia,serif);cursor:pointer;display:inline-flex;align-items:center;gap:6px;max-width:100%;white-space:nowrap;-webkit-touch-callout:none;user-select:none;touch-action:manipulation}
.btChip:hover{border-color:var(--ui-gold,#e9b75a)}
.btChip:focus-visible{outline:3px solid var(--ui-gold,#e9b75a);outline-offset:2px}
.btChip.on{background:linear-gradient(#3e3216,#2a210f);border-color:var(--ui-gold,#e9b75a);color:#ffe6a6;box-shadow:0 0 0 1px rgba(233,183,90,.35) inset}
.btFavChip span{color:#ffcc33}.btFavChip small{font-size:13px;opacity:.75}
.btPreset{max-width:170px;overflow:hidden;text-overflow:ellipsis;display:inline-block;line-height:26px}
.btSave,.btExport{background:#1e2a47}
.btHolding{transition:transform .5s ease,filter .5s ease;transform:scale(.96);filter:brightness(1.15)}
.binderPocket{-webkit-touch-callout:none}
.binderPocket .btStar{position:absolute;top:6px;right:8px;z-index:8;width:30px;height:30px;display:grid;place-items:center;border-radius:50%;background:rgba(18,22,40,.86);color:#ffcc33;font-size:19px;line-height:1;border:1px solid #e9b75a;box-shadow:0 2px 6px rgba(0,0,0,.45);pointer-events:none}
.binderPocket:has(.btStar){position:relative}
.btNoFav{grid-column:1/-1}
#cardDetails .cdHead{position:relative;padding-right:56px}
#cardDetails .btCdStar{position:absolute;top:0;right:0;width:48px;height:48px;border-radius:50%;border:1px solid #e9b75a;background:rgba(20,24,42,.8);color:#ffcc33;font-size:26px;line-height:1;cursor:pointer;display:grid;place-items:center}
#cardDetails .btCdStar.on{background:linear-gradient(#5a4515,#33270c)}
#cardDetails .btCdStar:focus-visible{outline:3px solid #e9b75a;outline-offset:2px}
#btDialog{position:fixed;inset:0;z-index:10050;background:rgba(5,8,16,.66);display:grid;place-items:center;padding:16px;box-sizing:border-box}
.btDlg{width:min(440px,100%);box-sizing:border-box;background:linear-gradient(#202b49,#141b31);border:1px solid #c9a052;border-radius:18px;padding:20px 20px 16px;color:#efe6d2;box-shadow:0 20px 50px rgba(0,0,0,.55);font-family:var(--ui-serif,Georgia,serif)}
.btDlg h2{margin:0 0 8px;font-size:22px;color:#ffe6a6}
.btDlg p{margin:0 0 14px;font-size:16px;line-height:1.4;color:#d9dfef}
.btDlgField{display:grid;gap:6px;margin-bottom:14px;font-size:15px}
.btDlgField input{min-height:44px;box-sizing:border-box;width:100%;padding:8px 12px;border-radius:10px;border:1px solid #7787a1;background:#0f1628;color:#fff;font:600 17px var(--ui-serif,Georgia,serif)}
.btDlgBtns{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
.btBtn{min-height:44px;padding:8px 18px;border-radius:12px;border:1px solid #6f7fa2;background:#1b2542;color:#efe6d2;font:600 16px var(--ui-serif,Georgia,serif);cursor:pointer}
.btBtn.btGold{background:linear-gradient(#f0c96b,#c9952f);border-color:#f3d48a;color:#2a1c06}
.btBtn.btDanger{background:#7c2a26;border-color:#d06a5f;color:#fff}
.btBtn:focus-visible{outline:3px solid #ffe6a6;outline-offset:2px}
@media (max-width:600px){.btTools{margin-left:0}.btChip{font-size:15px;padding:8px 13px}.btPreset{max-width:46vw}.btDlgBtns .btBtn{flex:1 1 auto}}
`;
  document.head.append(st);
}

/* ------------------------------------------------------------ Start */
function onBinder(detail) {
  if (detail?.index || B.view !== 'inventory') return;
  toolbar();
  if (favOnly) renderFavPages(); else badges();
}
if (B) {
  injectCSS(); setupHold(); guard();
  addEventListener('ember:binderReady', e => onBinder(e.detail));
  addEventListener('ember:frame', e => {
    const v = e.detail?.view;
    if (v !== lastView) { if (lastView === 'inventory' && v !== 'inventory') { favOnly = false; favPage = 0; } if (!FUSE_VIEWS.includes(lastView) || !FUSE_VIEWS.includes(v)) fuseSel = []; lastView = v; }
    const em = ember(false);
    if (em && (cleanFavourites(em, B.state.owned) | cleanPresets(em))) persist();
    detailsStar();
  });
  new MutationObserver(() => detailsStar()).observe(document.body, { childList: true });
  window.EmberBinderTools = Object.freeze({ toggleFavourite: id => toggleFav(id), favourites: () => [...favList()], presets: () => presets().map(p => ({ ...p })), csv: () => toCSV(rows()), exportCSV, exportPNG });
}
