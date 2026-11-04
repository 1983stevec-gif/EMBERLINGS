// EMBERLINGS Collection tracker: turns the binder into clear goals.
// Shows overall completion, a slot grid per species (battle forms, rarities, mutations, shiny), the goals you are
// closest to finishing with real hints on where each missing piece comes from, and a link to the Collection Album.
// Purely informational: it reads the save, never writes to it, and gives no rewards.
import { RARITIES, MUTATIONS, PACK_MUTATION, rarityRank } from './combat-rules.js';
import { ELEMENTS } from './card-engine.js';
import { albumStatus, albumPagesComplete, ALBUM_STAMPS, SPECIES_COUNT } from './achievements.js';

// ---------- Collection maths (pure, also used by tests/collection.mjs) ----------
// Battle forms come from the deck builder: owning any copy unlocks the Basic, Ascended and Apex forms;
// a Legendary or rarer copy also unlocks the Radiant (elite) forms.
export const FORMS = [
  { id: 'basic', name: 'Basic', short: 'Basic' },
  { id: 'ascended', name: 'Ascended', short: 'Asc.' },
  { id: 'apex', name: 'Apex', short: 'Apex' },
  { id: 'radiant', name: 'Radiant', short: 'Radiant' }
];
export const RADIANT_RANK = 4;
export const RARITY_SHORT = ['C', 'U', 'R', 'M', 'L', 'Ce', 'S'];
export const SLOTS_PER_SPECIES = FORMS.length + RARITIES.length + MUTATIONS.length + 1;
// Species the Fusion Lab can produce (it never makes No. 004).
export const FUSION_KINDS = [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

// One pass over the owned cards. Returns per-species counts and filled slots.
export function collectionStats(owned, discovered, n = SPECIES_COUNT) {
  const sp = Array.from({ length: n }, () => ({ copies: 0, rar: new Array(RARITIES.length).fill(0), mut: Object.create(null), shiny: 0 }));
  for (const c of Array.isArray(owned) ? owned : []) {
    if (!c || !Number.isInteger(c.kind) || c.kind < 0 || c.kind >= n) continue;
    const s = sp[c.kind]; s.copies++; s.rar[rarityRank(c)]++;
    if (c.mutation) s.mut[c.mutation] = (s.mut[c.mutation] || 0) + 1;
    if (c.shiny) s.shiny++;
  }
  const seen = new Set(Array.isArray(discovered) ? discovered : []);
  const species = sp.map((s, k) => {
    const radiant = s.rar.slice(RADIANT_RANK).reduce((a, b) => a + b, 0);
    const forms = [s.copies, s.copies, s.copies, radiant];
    const rarities = s.rar;
    const mutations = MUTATIONS.map(m => s.mut[m.id] || 0);
    const filled = forms.filter(Boolean).length + rarities.filter(Boolean).length + mutations.filter(Boolean).length + (s.shiny ? 1 : 0);
    return { kind: k, seen: seen.has(k) || s.copies > 0, copies: s.copies, forms, rarities, mutations, shiny: s.shiny, filled, total: SLOTS_PER_SPECIES };
  });
  const sum = f => species.reduce((t, s) => t + f(s), 0);
  const parts = {
    species: { have: sum(s => s.seen ? 1 : 0), total: n },
    forms: { have: sum(s => s.forms.filter(Boolean).length), total: n * FORMS.length },
    rarities: { have: sum(s => s.rarities.filter(Boolean).length), total: n * RARITIES.length },
    mutations: { have: sum(s => s.mutations.filter(Boolean).length), total: n * MUTATIONS.length },
    shiny: { have: sum(s => s.shiny ? 1 : 0), total: n }
  };
  const filled = sum(s => s.filled), total = n * SLOTS_PER_SPECIES;
  return { species, parts, filled, total, percent: total ? Math.floor(filled / total * 1000) / 10 : 0 };
}

// Where a missing slot can come from, using the real pack list. slot = {type:'rarity'|'mutation'|'shiny'|'form', i}
// Returns [] when nothing in the game offers it right now (for example a pack-only mutation no pack can roll for that species).
export function whereFrom(slot, kind, packs) {
  const has = packs.map((p, j) => ({ p, j })).filter(x => x.p.kinds.includes(kind));
  const pct = v => Math.round(v * 100) + '%', fuse = FUSION_KINDS.includes(kind);
  if (slot.type === 'rarity') {
    const secret = slot.i === RARITIES.length - 1;
    const l = secret ? has.filter(x => x.p.secret > 0).sort((a, b) => b.p.secret - a.p.secret).map(x => `${x.p.name} (${pct(x.p.secret)})`)
      : has.filter(x => RARITIES.indexOf(x.p.rarity) === slot.i).map(x => x.p.name);
    if (!l.length && fuse) l.push(`Fusion Lab with a ${RARITIES[slot.i]} card (random species)`);
    return l;
  }
  if (slot.type === 'shiny') {
    const l = has.filter(x => x.p.shiny > 0).sort((a, b) => b.p.shiny - a.p.shiny).map(x => `${x.p.name} (${pct(x.p.shiny)})`);
    if (fuse) l.push('Fusion Lab (15%, random species)');
    return l;
  }
  if (slot.type === 'mutation') {
    const m = MUTATIONS[slot.i], l = has.filter(x => (PACK_MUTATION[x.j]?.top ?? -1) >= slot.i).map(x => x.p.name);
    if (!m.packOnly) l.push(`Mutation Vault (🪙 ${m.cost.toLocaleString('en-US')})`);
    return l;
  }
  const radiant = slot.type === 'form' && slot.i === FORMS.length - 1;
  const l = has.filter(x => !radiant || RARITIES.indexOf(x.p.rarity) >= RADIANT_RANK || x.p.secret > 0).map(x => x.p.name);
  if (!l.length && fuse) l.push(radiant ? 'Fusion Lab with a Legendary or rarer card (random species)' : 'Fusion Lab (random species)');
  return l;
}
export const NOWHERE = 'not offered anywhere right now';

// Goals sorted by how close they are. names[k] is the species name to show (or null when undiscovered).
export function collectionGoals(stats, packs, names, limit = 6) {
  const label = k => names[k] || `No. ${String(k + 1).padStart(3, '0')} (not found yet)`;
  const nameOr = k => names[k] || `No. ${String(k + 1).padStart(3, '0')}`;
  const plural = (n, one, many) => n === 1 ? one : many;
  const goals = [], species = stats.species, n = species.length;
  const blocked = g => g.missing.some(m => !m.where.length) ? 1 : 0;
  for (const s of species) {
    if (!s.seen || !s.copies) continue;
    const k = s.kind, nm = nameOr(k), opts = [];
    const missR = s.rarities.map((v, i) => v ? null : i).filter(i => i !== null);
    const missM = s.mutations.map((v, i) => v ? null : i).filter(i => i !== null);
    opts.push({ id: 'rar-' + k, kind: k, have: RARITIES.length - missR.length, total: RARITIES.length,
      title: left => `${left} ${plural(left, 'rarity', 'rarities')} away from every ${nm} rarity`,
      missing: missR.map(i => ({ label: RARITIES[i], where: whereFrom({ type: 'rarity', i }, k, packs) })) });
    opts.push({ id: 'mut-' + k, kind: k, have: MUTATIONS.length - missM.length, total: MUTATIONS.length,
      title: left => `${left} ${plural(left, 'mutation', 'mutations')} away from every ${nm} mutation`,
      missing: missM.map(i => ({ label: MUTATIONS[i].name, packOnly: !!MUTATIONS[i].packOnly, where: whereFrom({ type: 'mutation', i }, k, packs) })) });
    const page = [];
    if (!s.forms[3]) page.push({ label: 'Radiant form', where: whereFrom({ type: 'form', i: 3 }, k, packs) });
    for (const i of missR) page.push({ label: RARITIES[i], where: whereFrom({ type: 'rarity', i }, k, packs) });
    for (const i of missM) page.push({ label: MUTATIONS[i].name + ' mutation', packOnly: !!MUTATIONS[i].packOnly, where: whereFrom({ type: 'mutation', i }, k, packs) });
    if (!s.shiny) page.push({ label: 'Shiny', where: whereFrom({ type: 'shiny' }, k, packs) });
    opts.push({ id: 'page-' + k, kind: k, have: s.filled, total: s.total,
      title: left => `${left} more ${plural(left, 'slot', 'slots')} to complete ${nm}`, missing: page });
    // One goal per species: one you can actually finish first, then the fewest pieces left (smaller sets win ties).
    const best = opts.filter(o => o.have < o.total).sort((a, b) => blocked(a) - blocked(b) || (a.total - a.have) - (b.total - b.have) || a.total - b.total)[0];
    if (best) goals.push(best);
  }
  const cross = (id, title, test, slot, extra = {}) => {
    const miss = species.filter(s => !test(s));
    if (!miss.length) return;
    goals.push({ id, kind: null, have: n - miss.length, total: n, title, cross: true, ...extra,
      missing: miss.map(s => ({ label: label(s.kind), where: slot ? whereFrom(slot, s.kind, packs) : whereFrom({ type: 'form', i: 0 }, s.kind, packs) })) });
  };
  cross('discover', left => `Discover ${left} more ${plural(left, 'species', 'species')}`, s => s.seen, null);
  cross('shiny', left => `${left} more ${plural(left, 'Shiny', 'Shinies')} for a Shiny set`, s => s.shiny > 0, { type: 'shiny' });
  cross('secret', left => `${left} more ${plural(left, 'Secret', 'Secrets')} for a Secret set`, s => s.rarities[RARITIES.length - 1] > 0, { type: 'rarity', i: RARITIES.length - 1 });
  MUTATIONS.forEach((m, i) => cross('set-' + m.id, left => `${left} more ${plural(left, 'mutation', 'mutations')} for a ${m.name} set`, s => s.mutations[i] > 0, { type: 'mutation', i }, { packOnly: !!m.packOnly, mutation: m.id }));
  for (const g of goals) { g.left = g.total - g.have; g.text = g.title(g.left); delete g.title; }
  const order = ['discover', 'shiny', 'secret'];
  const prio = g => g.cross ? (order.includes(g.id) ? order.indexOf(g.id) : 3) : 0;
  for (const g of goals) g.blocked = blocked(g) > 0;
  const cmp = (a, b) => a.blocked - b.blocked || (b.have > 0) - (a.have > 0) || a.left - b.left || b.have / b.total - a.have / a.total || prio(a) - prio(b);
  const sorted = goals.sort(cmp);
  // Keep the list varied: at most two goals of the same kind, unless there is nothing else to show.
  const group = g => g.id.replace(/-.*$/, ''), out = [], used = {};
  for (const g of sorted) if (out.length < limit && (used[group(g)] || 0) < 2) { out.push(g); used[group(g)] = (used[group(g)] || 0) + 1; }
  for (const g of sorted) if (out.length < limit && !out.includes(g)) out.push(g);
  return out.sort(cmp);
}

// ---------- Page ----------
const B = globalThis.window?.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const RARITY_COLORS = ['#bdb5a3', '#7fd28a', '#6fb4ff', '#c58cff', '#ffb84d', '#8ff0ff', '#ff7ad9'];
const filters = { species: '', element: '', pack: '', missing: false };
let cache = null; // computed once per open, never stored

function compute() {
  const t0 = performance.now(), st = B.state, packs = B.packCatalog?.() || [];
  const stats = collectionStats(st.owned, st.discovered, B.species.length);
  const names = stats.species.map(s => s.seen ? B.species[s.kind].name : null);
  const goals = collectionGoals(stats, packs, names, 6);
  const album = B.species.map((_, k) => albumStatus(st, k));
  cache = { stats, names, goals, packs, album, ms: 0 };
  cache.ms = performance.now() - t0;
  return cache;
}

const no = k => 'No. ' + String(k + 1).padStart(3, '0');
function slotInfo(s, type, i) {
  const k = s.kind, nm = cache.names[k] || 'this Mythling';
  let name, count;
  if (type === 'f') { name = FORMS[i].name + ' form'; count = s.forms[i]; }
  else if (type === 'r') { name = RARITIES[i]; count = s.rarities[i]; }
  else if (type === 'm') { name = MUTATIONS[i].name + ' mutation'; count = s.mutations[i]; }
  else { name = 'Shiny'; count = s.shiny; }
  if (count) {
    const what = type === 'f' ? (i === 3 ? `unlocked by your ${count} Legendary or rarer ${count === 1 ? 'copy' : 'copies'}` : 'unlocked in Battle Deck') : `you own ${count}`;
    return { got: true, short: `${name}: ${what}`, text: `<b>${esc(name)}</b> · ${esc(what)} ✓` };
  }
  const slot = type === 'f' ? { type: 'form', i } : type === 'r' ? { type: 'rarity', i } : type === 'm' ? { type: 'mutation', i } : { type: 'shiny' };
  const where = whereFrom(slot, k, cache.packs);
  const note = type === 'f' ? (i === 3 ? 'Needs a Legendary or rarer copy. ' : `Own any ${nm} to unlock. `) : type === 'm' && MUTATIONS[i].packOnly ? 'Pack only. ' : '';
  const from = where.length ? `Comes from: ${where.join(', ')}` : 'Not offered anywhere right now.';
  return { got: false, short: `${name}: not yet. ${note}${from}`, text: `<b>${esc(name)}</b> · not yet. ${esc(note + from)}` };
}

function slotHTML(s, type, i, label, extra = '') {
  const info = slotInfo(s, type, i);
  if (filters.missing && info.got) return '';
  return `<button type="button" class="colSlot colSlot-${type} ${info.got ? 'got' : 'miss'}" data-s="${type}${i}" title="${esc(info.short)}" aria-label="${esc(info.short)}" ${extra}>${label}</button>`;
}

function speciesHTML(s) {
  const k = s.kind, nm = cache.names[k], el = ELEMENTS[k] || B.species[k].element, done = s.filled === s.total;
  const row = (title, have, total, cells, cls = '') => `<div class="colRow ${cls}"><span class="colLbl">${title} <b>${have}/${total}</b></span><div class="colSlots">${cells || '<span class="colAll">All found ✓</span>'}</div></div>`;
  const forms = FORMS.map((f, i) => slotHTML(s, 'f', i, f.short)).join('');
  const rar = RARITIES.map((r, i) => slotHTML(s, 'r', i, RARITY_SHORT[i], `style="--rc:${RARITY_COLORS[i]}"`)).join('');
  const mut = MUTATIONS.map((m, i) => slotHTML(s, 'm', i, m.icon, `style="--mc:${m.color}"`)).join('');
  const shiny = slotHTML(s, 's', 0, '✨');
  const album = cache.album[k], stamps = album.filter(x => x.claimed).length;
  return `<article class="colSp ${s.seen ? 'seen' : 'unseen'} ${done ? 'done' : ''}" data-k="${k}">
   <div class="colSpTop"><span class="colPic">${B.art({ kind: k })}</span>
    <div class="colSpName"><small>${no(k)} · ${s.seen ? esc(el) : '???'}</small><h3>${s.seen ? esc(nm) : '? ? ?'}</h3>
     <span class="colSpBar" style="--p:${(s.filled / s.total * 100).toFixed(1)}%"><i></i></span><span class="colSpNum">${done ? '★ Complete' : `${s.filled} / ${s.total} slots`}</span></div></div>
   <div class="colTwin">${row('Forms', s.forms.filter(Boolean).length, FORMS.length, forms, 'colRowForms')}${row('Shiny', s.shiny ? 1 : 0, 1, shiny, 'colRowShiny')}</div>
   ${row('Rarities', s.rarities.filter(Boolean).length, RARITIES.length, rar, 'colRowRar')}
   ${row('Mutations', s.mutations.filter(Boolean).length, MUTATIONS.length, mut, 'colRowMut')}
   <p class="colTip" aria-live="polite">${s.seen ? 'Tap a slot to see what it is and where it comes from.' : 'Not discovered yet. Tap a slot to see where it comes from.'}</p>
   <div class="colSpFoot"><span class="colStamps" title="Collection Album stamps claimed">📖 ${stamps}/${ALBUM_STAMPS.length} stamps</span>${s.copies ? `<button type="button" class="colSee" data-see="${k}">See my ${s.copies.toLocaleString('en-US')} ${s.copies === 1 ? 'card' : 'cards'} ›</button>` : ''}</div>
  </article>`;
}

function visible() {
  const p = filters.pack ? cache.packs.find(x => x.id === filters.pack) : null;
  return cache.stats.species.filter(s => (filters.species === '' || s.kind === +filters.species)
    && (!filters.element || (ELEMENTS[s.kind] || B.species[s.kind].element) === filters.element)
    && (!p || p.kinds.includes(s.kind))
    && (!filters.missing || s.filled < s.total));
}

function gridHTML() {
  const list = visible();
  return list.length ? list.map(speciesHTML).join('') : `<p class="colEmpty">${filters.missing ? 'Nothing missing here. Every slot in this view is filled!' : 'No species match these filters.'}</p>`;
}

function goalHTML(g) {
  const pct = g.have / g.total * 100, shown = g.missing.slice(0, 3), more = g.missing.length - shown.length;
  const tag = g.packOnly ? '<span class="colTag">Pack only</span>' : '';
  return `<li class="colGoal"><div class="colGoalTop">${g.kind !== null ? `<span class="colGoalPic">${B.art({ kind: g.kind })}</span>` : `<span class="colGoalIcon">${g.mutation ? MUTATIONS.find(m => m.id === g.mutation).icon : g.id === 'shiny' ? '✨' : g.id === 'secret' ? '🌌' : '🔎'}</span>`}
    <div><strong>${esc(g.text)}</strong> ${tag}<span class="colGoalBar" style="--p:${pct.toFixed(1)}%"><i></i></span><small>${g.have} / ${g.total}</small></div></div>
    <ul class="colHints">${shown.map(m => `<li><b>${esc(m.label)}</b>${m.packOnly && !g.packOnly ? ' <span class="colTag">Pack only</span>' : ''}: ${m.where.length ? esc(m.where.slice(0, 3).join(', ')) + (m.where.length > 3 ? ' …' : '') : `<span class="colNowhere">${NOWHERE}</span>`}</li>`).join('')}${more > 0 ? `<li class="colMore">+ ${more} more</li>` : ''}</ul></li>`;
}

function render() {
  if (!B || B.view !== 'collection') return;
  compute();
  const t0 = performance.now(), { stats } = cache, st = B.state, P = stats.parts;
  const album = cache.album, pages = albumPagesComplete(st), claimed = album.reduce((t, a) => t + a.filter(x => x.claimed).length, 0), ready = album.reduce((t, a) => t + a.filter(x => x.earned && !x.claimed).length, 0);
  const elements = [...new Set(B.species.map((s, k) => ELEMENTS[k] || s.element))];
  const opt = (v, label, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(label)}</option>`;
  const chip = (icon, label, p) => `<span class="colChip"><i>${icon}</i>${label}<b>${p.have.toLocaleString('en-US')} / ${p.total.toLocaleString('en-US')}</b></span>`;
  B.render(`<section class="colPage">
   <button class="back" data-go="inventory">‹ My Binder</button>
   <header class="colHead"><div><p class="colKick">Collection tracker</p><h1>Collection</h1><p class="colSub">Every slot you can fill, species by species. This page only tracks progress; rewards stay in the Collection Album and Achievements.</p></div>
    <div class="colRing" style="--p:${stats.percent}%" role="img" aria-label="${stats.percent}% complete"><span><b>${stats.percent}%</b><small>complete</small></span></div></header>
   <div class="colChips">${chip('🔎', 'Species', P.species)}${chip('⚔', 'Forms', P.forms)}${chip('◆', 'Rarities', P.rarities)}${chip('🧬', 'Mutations', P.mutations)}${chip('✨', 'Shiny', P.shiny)}<span class="colChip colChipAll">${stats.filled.toLocaleString('en-US')} of ${stats.total.toLocaleString('en-US')} slots</span></div>
   <div class="colTop">
    <section class="colGoals"><h2>Closest to complete</h2>${cache.goals.length ? `<ol>${cache.goals.map(goalHTML).join('')}</ol>` : '<p class="colEmpty">Everything is complete. Amazing!</p>'}</section>
    <aside class="colAlbum"><h2>📖 Collection Album</h2><p>Stamps for owning a copy, a Shiny and a Mutated card of each species. Rewards are claimed in the album.</p>
     <dl><div><dt>Pages complete</dt><dd>${pages} / ${SPECIES_COUNT}</dd></div><div><dt>Stamps claimed</dt><dd>${claimed} / ${SPECIES_COUNT * ALBUM_STAMPS.length}</dd></div><div><dt>Ready to claim</dt><dd>${ready}</dd></div></dl>
     <button class="button ${ready ? 'gold' : 'alt'}" data-go="album">${ready ? `Open album · ${ready} ready` : 'Open album'}</button>
     <p class="colNote">Bloom, Tide, Crystal, Solar, Void and Prism mutations only come from packs.</p></aside>
   </div>
   <div class="colBar" role="group" aria-label="Filters">
    <label><span>Species</span><select id="colSpecies">${opt('', 'All species', filters.species)}${B.species.map((s, k) => opt(k, `${no(k)} ${cache.names[k] || '? ? ?'}`, filters.species)).join('')}</select></label>
    <label><span>Element</span><select id="colElement">${opt('', 'All elements', filters.element)}${elements.map(e => opt(e, e, filters.element)).join('')}</select></label>
    <label><span>Pack</span><select id="colPack">${opt('', 'Any pack', filters.pack)}${cache.packs.map(p => opt(p.id, p.name, filters.pack)).join('')}</select></label>
    <label class="colCheck"><input type="checkbox" id="colMissing" ${filters.missing ? 'checked' : ''}><span>Show missing only</span></label>
    <span class="colShowing" id="colShowing"></span>
   </div>
   <p class="colPackNote" id="colPackNote"></p>
   <div class="colGrid" id="colGrid">${gridHTML()}</div>
   <p class="colLegend"><span><i class="colSlot got">✓</i> found</span><span><i class="colSlot miss">·</i> missing</span><span>Rarities: ${RARITIES.map((r, i) => `<b style="color:${RARITY_COLORS[i]}">${RARITY_SHORT[i]}</b> ${r}`).join(' · ')}</span></p>
  </section>`);
  document.body.classList.add('colOpen');
  updateMeta(); wire();
  cache.renderMs = performance.now() - t0;
  window.EmberCollectionTiming = { computeMs: +cache.ms.toFixed(2), renderMs: +cache.renderMs.toFixed(2), cards: (st.owned || []).length };
}

function updateMeta() {
  const n = $$('#colGrid .colSp').length, sh = $('#colShowing'); if (sh) sh.textContent = `Showing ${n} of ${B.species.length} species`;
  const pn = $('#colPackNote'), p = filters.pack ? cache.packs.find(x => x.id === filters.pack) : null;
  if (pn) pn.textContent = p ? `${p.icon} ${p.name}: ${p.rarity} cards · ${Math.round(p.shiny * 100)}% shiny · ${Math.round(p.secret * 100)}% secret · ${Math.round((PACK_MUTATION[cache.packs.indexOf(p)]?.chance || 0) * 100)}% mutation · 🪙 ${p.cost.toLocaleString('en-US')}` : '';
}

function redrawGrid() { const g = $('#colGrid'); if (!g) return; g.innerHTML = gridHTML(); updateMeta(); }

function wire() {
  const set = (id, key, ev = 'change', val = e => e.target.value) => { const el = $('#' + id); if (el) el.addEventListener(ev, e => { filters[key] = val(e); redrawGrid(); }); };
  set('colSpecies', 'species'); set('colElement', 'element'); set('colPack', 'pack'); set('colMissing', 'missing', 'change', e => e.target.checked);
  $('#colGrid')?.addEventListener('click', e => {
    const see = e.target.closest('[data-see]');
    if (see) return seeCards(+see.dataset.see, see.dataset.rar, see.dataset.mut);
    const b = e.target.closest('.colSlot[data-s]'); if (!b) return;
    const card = b.closest('.colSp'), s = cache.stats.species[+card.dataset.k], type = b.dataset.s[0], i = +b.dataset.s.slice(1);
    const info = slotInfo(s, type, i), tip = $('.colTip', card);
    $$('.colSlot.sel', card).forEach(x => x.classList.remove('sel')); b.classList.add('sel');
    if (tip) tip.innerHTML = info.text + (info.got && s.seen && (type === 'r' || type === 'm') ? ` <button type="button" class="colSee" data-see="${s.kind}" data-${type === 'r' ? 'rar' : 'mut'}="${type === 'r' ? esc(RARITIES[i]) : esc(MUTATIONS[i].id)}">Show in binder ›</button>` : '');
  });
}

// Opens My Binder filtered to this species (and optionally a rarity or mutation).
function seeCards(k, rarity, mutation) {
  const name = B.species[k]?.name; if (!name) return;
  B.go('inventory');
  const cur = B.binderState();
  for (const key of ['element', 'rarity', 'mutation', 'level', 'island']) if (cur[key] !== undefined && cur[key] !== '' && !(key === 'rarity' && rarity) && !(key === 'mutation' && mutation)) B.binderFilter(key, '');
  if (rarity) B.binderFilter('rarity', rarity);
  if (mutation) B.binderFilter('mutation', mutation);
  B.binderFilter('q', name.toLowerCase());
}

// ---------- Entry buttons on My Binder and the Mythling Index ----------
function addEntries() {
  if (!B) return;
  if (B.view === 'inventory' || B.view === 'index') {
    const head = $('.uiBinderHead') || $('.binderHeading');
    if (head && !$('.colEntry', head)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'uiPillBtn colEntry'; b.textContent = '📊 Collection';
      b.title = 'See your collection progress and goals'; b.onclick = () => B.go('collection');
      // Sit next to the Species Index / My Binder switch so the two read as one group.
      const swap = [...head.children].find(el => el.matches('button[data-go], .uiPillBtn'));
      if (swap) { const g = document.createElement('div'); g.className = 'colHeadBtns'; swap.replaceWith(g); g.append(swap, b); } else head.appendChild(b);
    }
  }
  if (B.view === 'index') {
    const fg = $('.fgHead > div:first-child');
    if (fg && !$('.colEntry', fg)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'button alt colEntry colEntryFg'; b.textContent = '📊 Collection progress ›';
      b.onclick = () => B.go('collection'); fg.appendChild(b);
    }
  }
}

const CSS = `
/* Collection tracker (public/collection.js) */
.colPage{max-width:1240px;margin:0 auto 28px;color:var(--ui-text,#efe6d2);overflow-wrap:anywhere}
.colPage .back{margin:6px 0 4px}
.colHead{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:18px 22px;border:1px solid var(--ui-goldline,#7a5a2a);border-radius:10px;background:radial-gradient(ellipse at 80% 0,#2a2a3c,transparent 60%),linear-gradient(180deg,#151c27,#0e131b);box-shadow:inset 0 0 0 1px #0009,0 12px 30px #0008}
.colKick{margin:0;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--ui-gold,#e9b75a)}
.colHead h1{margin:2px 0 6px;font-size:clamp(28px,4vw,42px)}
.colSub{margin:0;max-width:640px;color:var(--ui-muted,#b9ae98);font-size:15px;line-height:1.4}
.colRing{--p:0%;flex:none;width:118px;height:118px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#ffd27a var(--p),#2a2f3a 0);box-shadow:0 0 0 2px #7a5a2a,0 0 24px #e9a23a33}
.colRing span{width:94px;height:94px;border-radius:50%;background:#0e131b;display:grid;place-content:center;text-align:center}
.colRing b{font-family:var(--ui-display,Georgia,serif);font-size:24px;color:#ffe2a0}.colRing small{font-size:12px;color:var(--ui-muted,#b9ae98)}
.colChips{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.colChip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:99px;background:#121822;border:1px solid #3c3220;font-size:14px}
.colChip i{font-style:normal}.colChip b{color:#ffe2a0;font-weight:700}.colChipAll{color:var(--ui-muted,#b9ae98)}
.colTop{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:14px;align-items:start}
.colGoals,.colAlbum{padding:14px 16px;border:1px solid var(--ui-goldline,#7a5a2a);border-radius:10px;background:linear-gradient(180deg,#151c27,#0e131b)}
.colGoals h2,.colAlbum h2{margin:0 0 10px;font-size:19px}
.colGoals ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.colGoal{padding:10px 12px;border-radius:8px;background:#0d1219;border:1px solid #2c2618}
.colGoalTop{display:flex;gap:10px;align-items:center}
.colGoalTop>div{min-width:0;flex:1}
.colGoalTop strong{font-size:15px;line-height:1.25;color:#f6e7c4}
.colGoalPic,.colGoalIcon{flex:none;width:44px;height:44px;border-radius:8px;overflow:hidden;background:#1a2130;display:grid;place-items:center;font-size:24px}
.colGoalPic .mythlingArt{width:44px;height:44px}
.colGoalBar,.colSpBar{--p:0%;display:block;height:6px;margin:6px 0 2px;border-radius:9px;background:#262b35;overflow:hidden}
.colGoalBar i,.colSpBar i{display:block;height:100%;width:var(--p);background:linear-gradient(90deg,#c98a2c,#ffd27a)}
.colGoalTop small{font-size:12px;color:var(--ui-muted,#b9ae98)}
.colHints{margin:8px 0 0;padding:0 0 0 16px;font-size:13px;line-height:1.35;color:#d6cbb4}
.colHints b{color:#f3dfb0}.colNowhere{color:var(--ui-muted,#b9ae98);font-style:italic}.colMore{list-style:none;margin-left:-16px;color:var(--ui-muted,#b9ae98)}
.colTag{display:inline-block;padding:0 6px;border-radius:4px;font-size:11px;letter-spacing:.04em;background:#3a1f4a;color:#f1c8ff;border:1px solid #7a4a9a;vertical-align:1px}
.colAlbum p{margin:0 0 10px;font-size:14px;line-height:1.4;color:#d6cbb4}
.colAlbum dl{display:grid;gap:6px;margin:0 0 12px}.colAlbum dl div{display:flex;justify-content:space-between;border-bottom:1px dashed #3c3220;padding-bottom:4px}
.colAlbum dt{color:var(--ui-muted,#b9ae98)}.colAlbum dd{margin:0;color:#ffe2a0;font-weight:700}
.colAlbum .button{width:100%}.colAlbum .colNote{margin:10px 0 0;font-size:12px;color:var(--ui-muted,#b9ae98)}
.colBar{display:flex;flex-wrap:wrap;align-items:end;gap:10px 14px;margin:16px 0 4px;padding:12px 14px;border:1px solid #3c3220;border-radius:10px;background:#0e131b}
.colBar label{display:grid;gap:3px;font-size:12px;color:var(--ui-muted,#b9ae98);min-width:0}
.colBar select{min-height:40px;padding:6px 8px;font-size:15px;max-width:100%}
.colBar .colCheck{display:flex;align-items:center;gap:8px;min-height:40px;font-size:15px;color:var(--ui-text,#efe6d2);cursor:pointer}
.colBar .colCheck input{width:20px;height:20px;accent-color:#e9a23a}
.colShowing{margin-left:auto;font-size:13px;color:var(--ui-muted,#b9ae98);align-self:center}
.colPackNote{margin:4px 2px 8px;min-height:1em;font-size:13px;color:#d6cbb4}
.colGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.colSp{padding:12px;border:1px solid #3c3220;border-radius:10px;background:linear-gradient(180deg,#141a24,#0d1219);content-visibility:auto;contain-intrinsic-size:auto 380px}
.colSp.done{border-color:#e9b75a;box-shadow:0 0 0 1px #e9b75a55,0 0 18px #e9a23a22}
.colSpTop{display:flex;gap:12px;align-items:center;margin-bottom:8px}
.colPic{flex:none;width:64px;height:64px;border-radius:10px;overflow:hidden;background:radial-gradient(circle,#26324a,#121822);display:grid;place-items:center}
.colPic .mythlingArt{width:64px;height:64px}
.colSp.unseen .colPic{position:relative;background:repeating-linear-gradient(45deg,#18202c 0 6px,#141a24 6px 12px);box-shadow:inset 0 0 0 1px #3c3220}
.colSp.unseen .colPic .mythlingArt{filter:brightness(0) opacity(.6)}
.colSp.unseen .colPic::after{content:"?";position:absolute;inset:0;display:grid;place-items:center;font:700 30px/1 'Cormorant Garamond',Georgia,serif;color:#c9a35a;text-shadow:0 1px 0 #000}
.colSpName{min-width:0;flex:1}.colSpName small{font-size:12px;color:var(--ui-muted,#b9ae98)}
.colSpName h3{margin:1px 0 0;font-size:19px}.colSp.unseen h3{letter-spacing:.2em;color:#8f846d}
.colSpNum{font-size:12px;color:#d6cbb4}.colSp.done .colSpNum{color:#ffd27a;font-weight:700}
.colRow{margin-top:7px}.colLbl{display:block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--ui-muted,#b9ae98);margin-bottom:3px}.colLbl b{color:#f3dfb0;letter-spacing:0}
.colSlots{display:grid;gap:4px}
.colRowForms .colSlots{grid-template-columns:repeat(4,minmax(0,1fr))}
.colRowRar .colSlots{grid-template-columns:repeat(7,minmax(0,1fr))}
.colRowMut .colSlots{grid-template-columns:repeat(12,minmax(0,1fr));gap:3px}
.colTwin{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:end}
.colTwin .colRowShiny .colSlots{grid-template-columns:minmax(44px,auto)}
.colSlot{display:grid;place-items:center;min-width:0;height:30px;padding:0 2px;border-radius:6px;font:700 12px/1 var(--ui-serif,Georgia,serif);cursor:pointer;border:1px dashed #4a4030;background:#0b0f15;color:#6f6656;font-style:normal;white-space:nowrap;overflow:hidden}
.colSlot.got{border:1px solid #b58a3c;background:linear-gradient(180deg,#2c2414,#1a150c);color:#ffe2a0}
.colSlot-r.got{border-color:var(--rc);color:var(--rc);background:color-mix(in srgb,var(--rc) 16%,#0d1219)}
.colSlot-m{font-size:14px}.colSlot-m.got{border-color:var(--mc);color:var(--mc);background:color-mix(in srgb,var(--mc) 18%,#0d1219)}
.colSlot-m.miss,.colSlot-s.miss{filter:grayscale(1);opacity:.55}
.colSlot:focus-visible,.colSlot.sel{outline:2px solid #ffd27a;outline-offset:1px}
.colAll{grid-column:1/-1;font-size:13px;color:#ffd27a}
.colTip{margin:9px 0 0;padding:7px 9px;min-height:2.6em;border-radius:6px;background:#0a0d13;border:1px solid #2a2418;font-size:13px;line-height:1.35;color:#d6cbb4}
.colTip b{color:#f3dfb0}
.colSpFoot{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;font-size:13px;color:var(--ui-muted,#b9ae98)}
.colSee{background:none;border:0;padding:6px 0;color:var(--ui-gold,#e9b75a);font:inherit;font-size:13px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.colTip .colSee{padding:0}
.colEmpty{grid-column:1/-1;padding:24px;text-align:center;color:var(--ui-muted,#b9ae98)}
.colLegend{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;margin:14px 2px 0;font-size:12px;color:var(--ui-muted,#b9ae98)}
.colLegend .colSlot{display:inline-grid;width:22px;height:20px;vertical-align:middle;cursor:default}
.colEntry{margin-left:8px}
.colHeadBtns{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.colHeadBtns .colEntry{margin:0}
@media(max-width:640px){.uiBinderHead .colHeadBtns .uiPillBtn{padding:9px 18px;font-size:16px}}
.colEntryFg.button.alt{margin:10px 0 0;background:#f5e8c6;color:#5a3a12;border:2px solid #8a6534;box-shadow:none;text-transform:none;letter-spacing:.02em;font-size:15px}
.colEntryFg.button.alt:hover{background:#fbf1d8}
@media(max-width:1100px){.colGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.colTop{grid-template-columns:minmax(0,1fr)}.colAlbum .button{width:auto}}
@media(max-width:760px){.colGoals ol{grid-template-columns:minmax(0,1fr)}.colHead{padding:14px}.colRing{width:96px;height:96px}.colRing span{width:76px;height:76px}.colRing b{font-size:20px}}
@media(max-width:700px){.colGrid{grid-template-columns:minmax(0,1fr)}.colBar label:not(.colCheck){flex:1 1 140px}.colBar select{width:100%}.colShowing{margin-left:0;width:100%}}
@media(max-width:420px){.colHead{flex-direction:column;align-items:flex-start}.colRing{align-self:center}.colSlot{height:32px}.colRowMut .colSlots{grid-template-columns:repeat(6,minmax(0,1fr))}.colChip{font-size:13px;padding:5px 10px}}
@media(pointer:coarse){.colSlot{height:34px}}
`;

if (B) {
  const style = document.createElement('style'); style.id = 'colStyles'; style.textContent = CSS; document.head.appendChild(style);
  B.registerView('collection', render);
  addEventListener('ember:binderReady', () => addEntries());
  addEventListener('ember:frame', e => { if (e.detail?.view !== 'collection') { document.body.classList.remove('colOpen'); cache = null; } queueMicrotask(addEntries); });
  // The Mythling Index redraws itself without a frame event; watch #app's direct children only.
  const app = document.getElementById('app');
  if (app) { let q = false; new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; addEntries(); }); }).observe(app, { childList: true }); }
}
