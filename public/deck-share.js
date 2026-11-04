// Deck share codes and ready-made decks.
// A share code lists only cards and counts (species + stage, Trainers) and the chosen Merfling types.
// It holds no player data. Importing never grants cards: it builds a saved deck from cards the player already owns.
import { ELEMENTS, TRAINERS, deckTemplates, buildBattleDeck, ownedCardStrength } from './card-engine.js';

/* ---------------------------------------------------------------- Code format
   "EMB1-" + base64url(bytes)
   bytes[0..1]  Merfling types as a 9-bit mask (TYPES order), little-endian
   bytes[2..n]  one byte per different card: bit 7 = second copy, bits 0-6 = card id
                card id 0-95 = Mythling (species * 6 + Radiant * 3 + stage), 96-105 = Trainer (TRAINERS order)
   bytes[last]  check byte over everything before it                                        */
export const CODE_PREFIX = 'EMB1-';
export const TYPES = [...new Set(ELEMENTS)];
export const STAGE_NAMES = ['Basic', 'Ascended', 'Apex'];
const SPECIES_COUNT = 16, TRAINER_BASE = SPECIES_COUNT * 6;

const check = bytes => { let h = 0x5a; for (const b of bytes) h = ((h * 31) ^ b) & 255; return h; };
const toB64url = bytes => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64url = text => { const s = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4)); return Uint8Array.from(s, ch => ch.charCodeAt(0)); };

class CodeError extends Error {}
const fail = msg => { throw new CodeError(msg); };

// Turns deck keys ('m-<kind>-<elite>-<stage>' / 't-<trainer>') into {id: count}.
export function keysToCounts(keys) {
  const counts = new Map();
  for (const key of keys || []) {
    let id = null;
    const m = /^m-(\d+)-(true|false)-([0-2])$/.exec(String(key));
    if (m && +m[1] < SPECIES_COUNT) id = +m[1] * 6 + (m[2] === 'true' ? 3 : 0) + +m[3];
    else if (String(key).startsWith('t-')) { const i = TRAINERS.findIndex(t => 't-' + t.id === key); if (i >= 0) id = TRAINER_BASE + i; }
    if (id !== null) counts.set(id, Math.min(2, (counts.get(id) || 0) + 1));
  }
  return counts;
}

export function encodeDeck(keys, energyTypes = []) {
  const counts = keysToCounts(keys), total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (total < 1) fail('This deck is empty. Add some cards first.');
  if (total > 20) fail('A deck can hold at most 20 cards.');
  let mask = 0; for (const t of new Set(energyTypes || [])) { const i = TYPES.indexOf(t); if (i >= 0) mask |= 1 << i; }
  const bytes = [mask & 255, mask >> 8];
  for (const id of [...counts.keys()].sort((a, b) => a - b)) bytes.push(id | (counts.get(id) === 2 ? 128 : 0));
  bytes.push(check(bytes));
  return CODE_PREFIX + toB64url(bytes);
}

const describe = id => id >= TRAINER_BASE
  ? { id, trainer: TRAINERS[id - TRAINER_BASE].id, name: TRAINERS[id - TRAINER_BASE].name, cardType: 'trainer' }
  : { id, kind: Math.floor(id / 6), elite: id % 6 >= 3, stage: id % 3, cardType: 'mythling' };

// Reads a code (it may sit inside other pasted text). Throws CodeError with a friendly message.
export function decodeDeck(input) {
  const text = String(input ?? '').trim();
  if (!text) fail('Paste a deck code first. It starts with EMB1-.');
  const found = /EMB(\d+)-([A-Za-z0-9_-]*)/i.exec(text);
  if (!found) fail('That doesn’t look like a deck code. Deck codes start with EMB1-.');
  if (found[1] !== '1') fail('This deck code is from a different version of the game, so it can’t be read here.');
  let bytes;
  try { bytes = fromB64url(found[2]); } catch { fail('This deck code looks mistyped. Try copying it again.'); }
  if (bytes.length < 4 || bytes.length > 23) fail('This deck code looks incomplete. Try copying the whole code again.');
  const body = [...bytes.slice(0, -1)];
  if (check(body) !== bytes[bytes.length - 1]) fail('This deck code looks incomplete or mistyped. Try copying it again.');
  const mask = body[0] | body[1] << 8;
  if (mask >> TYPES.length) fail('This deck code has an unknown Merfling type.');
  const energyTypes = TYPES.filter((_, i) => mask & 1 << i);
  if (energyTypes.length > 3) fail('This deck code picks more than three Merfling types.');
  const cards = [], seen = new Set();
  for (const b of body.slice(2)) {
    const id = b & 127, count = b & 128 ? 2 : 1;
    if (id >= TRAINER_BASE + TRAINERS.length) fail('This deck code has a card this game doesn’t know.');
    if (seen.has(id)) fail('This deck code lists the same card twice.');
    seen.add(id); cards.push({ ...describe(id), count });
  }
  const total = cards.reduce((n, c) => n + c.count, 0);
  if (total < 1 || total > 20) fail('A deck must have 1–20 cards.');
  return { cards, energyTypes, total };
}

export function isCodeError(e) { return e instanceof CodeError; }

/* ---------------------------------------------------------------- Import plan
   Works out the best legal deck from the player's own cards.
   speciesNames: list of names by species number (for messages).                          */
export function planImport(pool, decoded, speciesNames = []) {
  const templates = deckTemplates(pool || []), lines = [], reasons = [], keys = [];
  const spName = kind => speciesNames[kind] || 'this Mythling';
  const nameOf = (kind, stage, elite) => (speciesNames[kind] || 'Mythling') + (stage ? ' · ' + STAGE_NAMES[stage] : '') + (elite ? ' Radiant' : '');
  const owned = (kind, elite) => templates.find(t => t.cardType === 'mythling' && t.kind === kind && t.elite === elite && t.stage === 0);
  // Requested lines (species + normal/Radiant), each with copies wanted per stage.
  const groups = [];
  for (const c of decoded.cards) if (c.cardType === 'mythling') {
    let g = groups.find(g => g.kind === c.kind && g.elite === c.elite);
    if (!g) groups.push(g = { kind: c.kind, elite: c.elite, want: [0, 0, 0] });
    g.want[c.stage] = c.count;
  }
  // Exact matches first; otherwise use the other line (normal for Radiant or the reverse) of the same species.
  groups.sort((a, b) => !!owned(b.kind, b.elite) - !!owned(a.kind, a.elite));
  const room = new Map(), used = new Map(), told = new Set();
  for (const g of groups) {
    const line = owned(g.kind, g.elite) || owned(g.kind, !g.elite);
    if (line && !room.has(line.key)) { room.set(line.key, [line.available, line.available, line.available]); used.set(line.key, [0, 0, 0]); }
    for (let stage = 0; stage < 3; stage++) {
      if (!g.want[stage]) continue;
      const entry = { cardType: 'mythling', kind: g.kind, elite: g.elite, stage, name: nameOf(g.kind, stage, g.elite), want: g.want[stage], have: 0 };
      if (!line) {
        if (!told.has(g.kind)) { told.add(g.kind); reasons.push(`You don’t own ${spName(g.kind)} yet.`); }
      } else if (stage && !used.get(line.key)[stage - 1]) {
        reasons.push(`${entry.name} was left out: it needs its ${STAGE_NAMES[stage - 1]} form in the deck too.`);
      } else {
        const free = room.get(line.key);
        entry.have = Math.min(entry.want, free[stage]); free[stage] -= entry.have; used.get(line.key)[stage] += entry.have;
        if (entry.have < entry.want) reasons.push(`You own ${line.available} ${spName(g.kind)}, so ${entry.name} gets ${entry.have} of ${entry.want} ${entry.want === 1 ? 'copy' : 'copies'}.`);
        for (let i = 0; i < entry.have; i++) keys.push(line.key.slice(0, -1) + stage);
      }
      lines.push(entry);
    }
  }
  lines.sort((a, b) => a.kind - b.kind || a.elite - b.elite || a.stage - b.stage);
  for (const c of decoded.cards.filter(c => c.cardType === 'trainer')) {
    const have = Math.min(2, c.count);
    lines.push({ cardType: 'trainer', trainer: c.trainer, name: c.name, want: c.count, have, owned: 2 });
    for (let i = 0; i < have; i++) keys.push('t-' + c.trainer);
  }
  let canBuild = keys.length > 0, error = '';
  if (!keys.some(k => k.startsWith('m-') && k.endsWith('-0'))) { canBuild = false; error = 'You need at least one of this deck’s Basic Mythlings to build it. Open packs to find them!'; }
  let deck = [];
  if (canBuild) {
    try { deck = buildBattleDeck(pool, keys); } catch (e) { canBuild = false; error = e.message || 'This deck can’t be built right now.'; }
  }
  const inDeck = new Set(deck.filter(c => c.cardType === 'mythling').map(c => ELEMENTS[c.kind]));
  const energyTypes = decoded.energyTypes.filter(t => inDeck.has(t)).slice(0, 3);
  const missing = lines.reduce((n, l) => n + l.want - l.have, 0);
  return { lines, keys, energyTypes, canBuild, error, reasons, missing, total: keys.length, wanted: decoded.total };
}

/* ---------------------------------------------------------------- Deck ideas (real species only) */
const k = (kind, stage = 0) => 'm-' + kind + '-false-' + stage;
const t = id => 't-' + id;
const twice = key => [key, key];
export const DECK_IDEAS = [
  { name: 'Fire rush', icon: '🔥', text: 'Hit hard and early with Flaminyx, Emberoo and Cindermane.', energy: ['Fire'],
    keys: [...twice(k(0)), k(0, 1), k(0, 2), ...twice(k(8)), k(8, 1), ...twice(k(13)), k(13, 1), ...twice(t('scholar')), ...twice(t('beacon')), t('boots'), t('mantle'), t('tonic')] },
  { name: 'Water control', icon: '🌊', text: 'Sturdy Aquabub and Tidelotl that outlast the other side.', energy: ['Water'],
    keys: [...twice(k(4)), ...twice(k(4, 1)), k(4, 2), ...twice(k(11)), k(11, 1), ...twice(t('mantle')), ...twice(t('medic')), t('cleanse'), t('guide'), t('scholar')] },
  { name: 'Nature heal', icon: '🌿', text: 'Verdelle and Mosshell keep healing while you wear them down.', energy: ['Nature'],
    keys: [...twice(k(2)), ...twice(k(2, 1)), k(2, 2), ...twice(k(10)), k(10, 1), ...twice(t('tonic')), ...twice(t('medic')), t('sanctuary'), t('mantle'), t('beacon')] },
  { name: 'Lightning burst', icon: '⚡', text: 'Charge up Voltix and Sparquill for big, fast hits.', energy: ['Lightning'],
    keys: [...twice(k(3)), k(3, 1), k(3, 2), ...twice(k(12)), ...twice(k(12, 1)), ...twice(t('scholar')), ...twice(t('boots')), t('beacon'), t('mantle')] },
  { name: 'Shadow tricks', icon: '🌙', text: 'Umbryx and Noctalon swap your rival’s Active and drain them.', energy: ['Shadow'],
    keys: [...twice(k(7)), k(7, 1), ...twice(k(15)), k(15, 1), k(15, 2), ...twice(t('guide')), ...twice(t('boots')), t('recall'), t('cleanse'), t('scholar')] },
  { name: 'Mixed starter', icon: '🌟', text: 'A friendly first deck: Flaminyx, Aquabub and Verdelle together.', energy: ['Fire', 'Water', 'Nature'],
    keys: [...twice(k(0)), k(0, 1), ...twice(k(4)), k(4, 1), ...twice(k(2)), k(2, 1), ...twice(t('scholar')), ...twice(t('beacon')), ...twice(t('tonic')), t('mantle'), t('boots')] }
].map(d => ({ ...d, code: encodeDeck(d.keys, d.energy) }));

/* ---------------------------------------------------------------- Browser UI */
if (typeof window !== 'undefined' && typeof document !== 'undefined') setupUI();

function setupUI() {
  const B = () => window.EmberBridge;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const names = () => (B()?.species || []).map(s => s.name);
  const pool = () => { const b = B(), st = b.state; return (st.owned || []).filter(c => !b.vaulted?.(c) && !st.tradeLocks?.[c.id]).map(c => ({ ...c })); };
  let modal = null, lastFocus = null;

  injectCSS();

  function addButtons() {
    if (B()?.view !== 'decks' || $('.dsBar')) return;
    const side = $('.uiDeckSide'), anchor = $('.uiRulesLink', side || document) || $('.deckSaves');
    const host = side || $('.deckSaves');
    if (!host) return;
    const bar = document.createElement('div'); bar.className = 'dsBar';
    bar.innerHTML = `<button type="button" class="dsBtn" data-ds="share">📤 Share deck</button><button type="button" class="dsBtn" data-ds="import">📥 Import deck</button><button type="button" class="dsBtn gold" data-ds="ideas">💡 Deck ideas</button>`;
    if (side && anchor) anchor.before(bar); else host.appendChild(bar);
    $$('[data-ds]', bar).forEach(b => b.onclick = () => open(b.dataset.ds));
  }
  const later = () => requestAnimationFrame(() => setTimeout(addButtons, 0));
  window.addEventListener('ember:decksReady', later);
  window.addEventListener('ember:frame', () => { if (B()?.view === 'decks') later(); else close(); });

  /* ---------- Modal */
  function open(tab) {
    if (!modal) {
      lastFocus = document.activeElement;
      modal = document.createElement('div'); modal.className = 'dsOverlay'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'dsTitle');
      modal.innerHTML = `<div class="dsBox"><div class="dsHead"><h2 id="dsTitle">Deck codes</h2><button type="button" class="dsClose" aria-label="Close">✕</button></div>
        <div class="dsTabs" role="tablist"><button type="button" role="tab" data-tab="share">Share</button><button type="button" role="tab" data-tab="import">Import</button><button type="button" role="tab" data-tab="ideas">Deck ideas</button></div><div class="dsBody"></div></div>`;
      document.body.appendChild(modal);
      $('.dsClose', modal).onclick = close;
      modal.addEventListener('click', e => { if (e.target === modal) close(); });
      modal.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
      $$('[data-tab]', modal).forEach(b => b.onclick = () => show(b.dataset.tab));
    }
    show(tab);
  }
  function close() { if (!modal) return; modal.remove(); modal = null; try { lastFocus?.focus?.(); } catch {} }
  function show(tab, arg) {
    $$('[data-tab]', modal).forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    const body = $('.dsBody', modal);
    if (tab === 'share') shareTab(body); else if (tab === 'ideas') ideasTab(body); else importTab(body, arg);
    $('button, input, textarea, select', body)?.focus?.({ preventScroll: true });
  }

  /* ---------- Share */
  function editingDeck() {
    const keys = []; for (const x of B().deckSummary?.() || []) for (let i = 0; i < x.count; i++) keys.push(x.key);
    const boxes = $$('[data-deck-energy]');
    const energy = boxes.length ? boxes.filter(b => b.checked).map(b => b.dataset.deckEnergy) : [...(B().state.pocketDeck?.energyTypes || [])];
    return { keys, energy };
  }
  function shareTab(body) {
    const presets = (B().state.deckPresets || []).filter(p => Array.isArray(p.keys));
    body.innerHTML = `<p class="dsLead">Share a deck with a friend. The code only lists cards, not your collection or name.</p>
      <label class="dsField">Deck to share<select id="dsPick"><option value="">The deck you’re building</option>${presets.map((p, i) => `<option value="${i}">${esc(p.name)}</option>`).join('')}</select></label>
      <label class="dsField">Your deck code<input id="dsCode" readonly spellcheck="false" autocomplete="off"></label>
      <p class="dsMsg" id="dsShareMsg" role="status"></p>
      <div class="dsActions"><button type="button" class="dsBtn gold" id="dsCopy">📋 Copy</button>${navigator.share ? '<button type="button" class="dsBtn" id="dsSend">↗ Share</button>' : ''}</div>`;
    const paint = () => {
      const pick = $('#dsPick').value, p = pick === '' ? null : presets[+pick];
      const src = p ? { keys: p.keys, energy: p.energyTypes || [] } : editingDeck();
      try { $('#dsCode').value = encodeDeck(src.keys, src.energy); msg(''); $('#dsCopy').disabled = false; if ($('#dsSend')) $('#dsSend').disabled = false; }
      catch (e) { $('#dsCode').value = ''; msg(e.message, 'bad'); $('#dsCopy').disabled = true; if ($('#dsSend')) $('#dsSend').disabled = true; }
    };
    const msg = (text, cls = '') => { const m = $('#dsShareMsg'); m.textContent = text; m.className = 'dsMsg ' + cls; };
    $('#dsPick').onchange = paint; paint();
    $('#dsCode').onfocus = e => e.target.select();
    $('#dsCopy').onclick = async () => { msg(await copy($('#dsCode')) ? 'Copied! Paste it to a friend.' : 'Select the code above and copy it.', 'ok'); };
    if ($('#dsSend')) $('#dsSend').onclick = async () => {
      try { await navigator.share({ title: 'My EMBERLINGS deck', text: `Try my EMBERLINGS deck! In Battle Deck, tap Import deck and paste: ${$('#dsCode').value}` }); }
      catch (e) { if (e?.name !== 'AbortError') msg('Sharing isn’t available here. Use Copy instead.', 'bad'); }
    };
  }
  async function copy(input) {
    try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(input.value); return true; } } catch {}
    try { input.focus(); input.select(); input.setSelectionRange?.(0, input.value.length); return document.execCommand('copy'); } catch { return false; }
  }

  /* ---------- Import */
  function importTab(body, preset) {
    body.innerHTML = `<p class="dsLead">Paste a deck code to see which cards you have. Importing never gives you cards; it builds the deck from your own collection.</p>
      <label class="dsField">Deck code<textarea id="dsPaste" rows="2" spellcheck="false" autocomplete="off" placeholder="EMB1-…"></textarea></label>
      <div class="dsActions"><button type="button" class="dsBtn gold" id="dsCheck">Check code</button></div><div id="dsPreview" aria-live="polite"></div>`;
    $('#dsCheck').onclick = () => preview($('#dsPaste').value);
    $('#dsPaste').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); preview($('#dsPaste').value); } };
    if (preset) { $('#dsPaste').value = preset.code; preview(preset.code, preset.name); }
  }
  function preview(code, suggested) {
    const out = $('#dsPreview');
    let decoded;
    try { decoded = decodeDeck(code); } catch (e) { out.innerHTML = `<p class="dsMsg bad">${esc(isCodeError(e) ? e.message : 'That deck code can’t be read. Try copying it again.')}</p>`; return; }
    const plan = planImport(pool(), decoded, names());
    const tile = l => {
      const state = l.have === 0 ? 'missing' : l.have < l.want ? 'part' : 'own';
      const art = l.cardType === 'trainer' ? '<span class="dsTrainer" aria-hidden="true">📜</span>' : (B().art?.({ kind: l.kind, stage: l.stage }) || '');
      return `<li class="dsCard ${state}"><span class="dsArt">${art}</span><span class="dsName">${esc(l.cardType === 'trainer' ? l.name : l.name.split(' · ')[0].replace(/ Radiant$/, '') + (l.elite ? ' Radiant' : ''))}</span><small>${l.cardType === 'trainer' ? 'Trainer' : STAGE_NAMES[l.stage]} · ×${l.want}</small>${state === 'missing' ? '<em>missing</em>' : state === 'part' ? `<em>${l.have} of ${l.want}</em>` : '<em class="ok">✓ owned</em>'}</li>`;
    };
    const defName = (suggested || 'Imported deck').slice(0, 30);
    out.innerHTML = `<div class="dsSum"><b>${decoded.total} card${decoded.total === 1 ? '' : 's'}</b> · <span class="ok">${plan.total} you can use</span>${plan.missing ? ` · <span class="bad">${plan.missing} missing</span>` : ''}${decoded.energyTypes.length ? ` · Merfling: ${decoded.energyTypes.map(esc).join(', ')}` : ''}</div>
      <ul class="dsGrid">${plan.lines.map(tile).join('')}</ul>
      ${plan.reasons.length ? `<ul class="dsReasons">${plan.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
      ${plan.canBuild ? `<label class="dsField">Deck name<input id="dsName" maxlength="30" value="${esc(defName)}"></label>
        <div class="dsActions"><button type="button" class="dsBtn gold" id="dsBuild">🛠 Build with my cards (${plan.total})</button></div>` : `<p class="dsMsg bad">${esc(plan.error)}</p>`}`;
    if (plan.canBuild) $('#dsBuild').onclick = () => build(plan, $('#dsName').value);
  }
  function build(plan, name) {
    const b = B();
    if (b.busy?.() && b.state.cardBattle) { b.toast('Finish your battle before changing decks.'); return; }
    // Check again against the latest collection right before saving.
    try { buildBattleDeck(pool(), plan.keys); } catch (e) { b.toast(e.message); return; }
    let preset;
    const ok = b.transact(() => {
      const st = b.state;
      if (!Array.isArray(st.deckPresets)) st.deckPresets = [];
      const base = String(name || '').trim().slice(0, 30) || 'Imported deck';
      let n = base, i = 2; while (st.deckPresets.some(p => p.name === n)) n = (base.slice(0, 26) + ' ' + i++);
      preset = { id: crypto.randomUUID(), name: n, keys: [...plan.keys], energyTypes: [...plan.energyTypes] };
      st.deckPresets.push(preset);
      st.pocketDeck = { keys: [...plan.keys], energyTypes: [...plan.energyTypes] };
      st.activeDeckPreset = preset.id;
    });
    if (!ok) return;
    close(); b.go('decks');
    b.toast(`${preset.name} saved and equipped.`);
  }

  /* ---------- Deck ideas */
  function ideasTab(body) {
    const p = pool(), sn = names();
    body.innerHTML = `<p class="dsLead">Ready-made decks to try. Import one to see which cards you already have.</p><ul class="dsIdeas">${DECK_IDEAS.map((d, i) => {
      const plan = planImport(p, decodeDeck(d.code), sn);
      return `<li class="dsIdea"><span class="dsIcon" aria-hidden="true">${d.icon}</span><div><strong>${esc(d.name)}</strong><p>${esc(d.text)}</p><small>${plan.total} of ${plan.wanted} cards in your collection</small></div><button type="button" class="dsBtn" data-idea="${i}">Import</button></li>`;
    }).join('')}</ul>`;
    $$('[data-idea]', body).forEach(btn => btn.onclick = () => show('import', DECK_IDEAS[+btn.dataset.idea]));
  }

  function injectCSS() {
    if (document.getElementById('dsStyle')) return;
    const s = document.createElement('style'); s.id = 'dsStyle';
    s.textContent = `
.dsBar{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 4px}
.dsBar .dsBtn{flex:1 1 0;min-width:0}
.dsBtn{font:600 15px/1.2 var(--ui-serif,Georgia,serif);color:#efe2c4;background:#0b1230;border:1px solid #b89a5a;border-radius:6px;padding:10px 12px;min-height:44px;cursor:pointer;white-space:nowrap}
.dsBtn.gold{color:#2a1405;background:linear-gradient(180deg,#ffd982,#eaa03a 55%,#c8741a);border-color:#ffe2a0}
.dsBtn:hover{filter:brightness(1.12)}.dsBtn:disabled{opacity:.5;cursor:default;filter:none}
.dsBtn:focus-visible,.dsTabs button:focus-visible,.dsClose:focus-visible{outline:2px solid #ffe2a0;outline-offset:2px}
.dsOverlay{position:fixed;inset:0;z-index:9000;background:#0009;display:grid;place-items:center;padding:16px;overscroll-behavior:contain}
.dsBox{width:min(720px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:linear-gradient(180deg,#151c27,#0e131b);border:1px solid var(--ui-goldline,#7a5a2a);border-radius:10px;box-shadow:inset 0 0 0 3px #e9b75a14,0 20px 50px #000c;color:var(--ui-text,#efe6d2);padding:18px 20px 20px;box-sizing:border-box}
.dsHead{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dsHead h2{margin:0;font:700 24px/1.2 var(--ui-display,Georgia,serif);color:var(--ui-gold,#e9b75a)}
.dsClose{background:none;border:1px solid #7a5a2a;color:#efe2c4;border-radius:50%;width:40px;height:40px;font-size:18px;cursor:pointer;flex:none}
.dsTabs{display:flex;gap:6px;margin:14px 0 10px;border-bottom:1px solid #7a5a2a66}
.dsTabs button{flex:1;background:none;border:0;border-bottom:3px solid transparent;color:var(--ui-muted,#b9ae98);font:600 16px/1.2 var(--ui-serif,Georgia,serif);padding:10px 4px;min-height:44px;cursor:pointer}
.dsTabs button.on{color:#ffd982;border-bottom-color:#e9b75a}
.dsLead{margin:6px 0 12px;color:var(--ui-muted,#b9ae98);font-size:15px;line-height:1.45}
.dsField{display:grid;gap:6px;margin:10px 0;font-size:14px;color:var(--ui-muted,#b9ae98)}
.dsField input,.dsField select,.dsField textarea{font:16px/1.3 ui-monospace,Menlo,Consolas,monospace;color:#fff4dc;background:#0a0f17;border:1px solid #7a5a2a;border-radius:6px;padding:10px 12px;min-height:44px;width:100%;box-sizing:border-box;resize:vertical}
.dsField select,#dsName{font-family:var(--ui-serif,Georgia,serif)}
.dsActions{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
.dsMsg{margin:6px 0;min-height:1.2em;font-size:15px}.ok{color:#8fe08a}.bad{color:#ff9a8a}
.dsSum{margin:14px 0 8px;font-size:15px}
.dsGrid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px}
.dsCard{position:relative;display:grid;gap:2px;padding:6px 6px 8px;border-radius:8px;border:2px solid #4fbf64;background:#10261a;text-align:center;font-size:13px;min-width:0}
.dsCard.part{border-color:#d9b04a;background:#2a2412}
.dsCard.missing{border-color:#5d6066;background:#1a1c20;filter:grayscale(1);opacity:.75}
.dsArt{position:relative;display:block;aspect-ratio:1;border-radius:6px;overflow:hidden;background:#0a0f17}
.dsTrainer{display:grid;place-items:center;height:100%;font-size:34px}
.dsName{font-weight:700;line-height:1.2;overflow-wrap:anywhere}.dsCard small{color:var(--ui-muted,#b9ae98)}
.dsCard em{font-style:normal;font-size:12px;font-weight:700;color:#cfd2d8;text-transform:uppercase;letter-spacing:.04em}.dsCard em.ok{color:#8fe08a}.dsCard.part em{color:#ffd982}
.dsReasons{margin:12px 0 4px;padding-left:20px;font-size:14px;color:#ffd9a0;line-height:1.45}
.dsIdeas{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.dsIdea{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:12px;border:1px solid #7a5a2a88;border-radius:8px;background:#0a0f17}
.dsIdea strong{font-size:17px;color:#ffd982}.dsIdea p{margin:2px 0;font-size:14px;line-height:1.4}.dsIdea small{color:var(--ui-muted,#b9ae98)}
.dsIcon{font-size:30px}
@media (max-width:520px){.dsBox{padding:14px}.dsHead h2{font-size:21px}.dsGrid{grid-template-columns:repeat(3,minmax(0,1fr))}.dsCard{font-size:12px}
 .dsIdea{grid-template-columns:auto 1fr}.dsIdea .dsBtn{grid-column:1/-1}.dsActions .dsBtn{flex:1 1 100%}.dsBar .dsBtn{font-size:14px;padding:10px 6px}}`;
    document.head.appendChild(s);
  }
}
