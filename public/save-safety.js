// EMBERLINGS save safety: automatic rolling backups of this browser's save, a "Restore a backup" screen in Settings,
// and a gentle monthly "Download a backup" reminder.
//
// Where backups live: IndexedDB database "emberlings-backups" (store "snaps"), NOT localStorage, so they don't eat
// into the save's own space. At most 5 are kept (newest first); identical copies are never stored twice.
// When one is taken (never blocks the game; any failure is silent and changes nothing):
//   - automatically, at most once an hour while you play (only if the save changed, never mid-trade/battle/pack reveal);
//   - before risky moments: whenever the game or another module makes its own one-off safety copy of the save
//     ("...-backup-before-cloud" before a cloud save is loaded, "...-backup-before-batch3" before the test reset,
//     "...-backup-before-import" before a backup code is imported), the same save is also put here;
//   - after a big pack opening (a Mythic or better, shiny or mutated pull, or every 3rd pack);
//   - when the player presses "Back up now", and always right before a restore.
// Each backup stores: time, reason, coins, card count, app version, a checksum and the save text.
//
// Restore safety rules:
//   - Refused while a trade is open, a traded card is locked, a trade receipt is waiting to be applied, an online
//     battle is running, a battle is in progress or a pack is being revealed (B.busy() plus the trade/battle fields).
//   - Refused if a trade finished after the backup was taken (restoring would bring back cards you traded away, or
//     drop cards you received), so traded cards can never be duplicated or lost.
//   - Refused if the backup is damaged (checksum mismatch, not JSON, or not a valid EMBERLINGS save).
//   - Before anything changes, the current save is backed up (here, and as "...-backup-before-restore" in
//     localStorage like the existing import does); if neither copy can be made, nothing is restored.
//   - The restore goes through the game's own save path (EmberBridge.adopt, the same one backup import and cloud
//     load use), keeping this device's online fields (username, recovery code, trade records) exactly like import,
//     and the Vault clock continues from now so no Vault time is paid twice. Then the game reloads normally.
// The save key mythlings-playable-v1 is never renamed, cleared or written directly.
// Save data (additive): state.ember.saveSafety = { downloadedAt, remindedAt } for the monthly reminder only.
// No gameplay or reward changes.

/* ---------------------------------------------------------------- Pure helpers (also used by tests/save-safety.mjs) */
export const MAX = 5;
export const HOUR = 3600e3, MONTH = 30 * 86400e3;
// Fields that belong to this device / the online account, never taken from a backup (same list as backup import).
export const ONLINE_FIELDS = ['playerUsername', 'recoveryCode', 'usernamePromptSeen', 'appliedTrades', 'cardOnlineId', 'onlineCardLocks', 'pendingTradeId', 'tradeLocks'];
export function checksum(text) { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }

// A valid EMBERLINGS save (same checks the backup import makes).
export function validSave(s, speciesCount = 16) {
  return !!(s && typeof s === 'object' && !Array.isArray(s) && Array.isArray(s.owned) && s.owned.length > 0 && Number.isFinite(s.coins) && s.coins >= 0 &&
    s.owned.every(c => c && typeof c.id === 'string' && Number.isInteger(c.kind) && c.kind >= 0 && c.kind < speciesCount));
}
// Builds a backup record from the saved text. Returns null if the text isn't a valid save.
export function makeRecord(json, reason, { now = Date.now(), version = '', speciesCount = 16 } = {}) {
  if (typeof json !== 'string' || !json) return null;
  let s; try { s = JSON.parse(json); } catch { return null; }
  if (!validSave(s, speciesCount)) return null;
  return { id: `${now}-${Math.random().toString(36).slice(2, 8)}`, at: now, reason: String(reason || 'auto'), coins: Math.floor(s.coins), cards: s.owned.length, version: String(version || ''), hash: checksum(json), size: json.length, data: json };
}
// Adds a record to the list (newest first), skipping an exact copy of the newest one, and keeps at most `max`.
// Returns { list, added, dropped } without changing the input.
export function rotate(list, rec, max = MAX) {
  const sorted = [...(list || [])].filter(r => r && Number.isFinite(r.at)).sort((a, b) => b.at - a.at);
  if (!rec) return { list: sorted, added: false, dropped: [] };
  if (sorted[0] && sorted[0].hash === rec.hash) return { list: sorted, added: false, dropped: [] };
  const next = [rec, ...sorted];
  return { list: next.slice(0, max), added: true, dropped: next.slice(max) };
}
// Opens a stored record. Returns { ok:true, save } or { ok:false, reason } for a damaged one.
export function openRecord(rec, speciesCount = 16) {
  const bad = { ok: false, reason: 'damaged', message: 'This backup is damaged and can\'t be used. Your current save was not changed.' };
  if (!rec || typeof rec.data !== 'string' || !rec.data) return bad;
  if (rec.hash && checksum(rec.data) !== rec.hash) return bad;
  let s; try { s = JSON.parse(rec.data); } catch { return bad; }
  if (!validSave(s, speciesCount)) return bad;
  return { ok: true, save: s };
}
const lockCount = o => (o && typeof o === 'object') ? Object.keys(o).length : 0;
// Why a restore can't happen right now (null if it can). `busy` is EmberBridge.busy() when available.
export function restoreBlock(cur, { busy = false } = {}) {
  if (!cur || typeof cur !== 'object') return { reason: 'nosave', message: 'Your save could not be read, so nothing was changed.' };
  if (cur.pendingTradeId || lockCount(cur.tradeLocks)) return { reason: 'trade', message: 'You have a trade open or a trade that is still finishing. Finish or cancel it first (Friends → Trading), then try again. This keeps traded cards from being lost or copied.' };
  if (cur.cardOnlineId || lockCount(cur.onlineCardLocks)) return { reason: 'online', message: 'An online battle is still running. Finish it first, then try again.' };
  if (cur.cardBattle) return { reason: 'battle', message: 'A battle is in progress. Finish it first, then try again.' };
  if (busy) return { reason: 'busy', message: 'Something is still in progress (a trade, battle or pack reveal). Finish it first, then try again.' };
  return null;
}
// True if a trade finished after the backup was taken (the backup doesn't know about a trade this save has applied).
export function tradedSince(cur, snap) {
  const had = new Set([...(Array.isArray(snap?.appliedTrades) ? snap.appliedTrades : []), ...(Array.isArray(snap?.tradeHistory) ? snap.tradeHistory.map(t => t?.id) : [])]);
  const now = [...(Array.isArray(cur?.appliedTrades) ? cur.appliedTrades : []), ...(Array.isArray(cur?.tradeHistory) ? cur.tradeHistory.map(t => t?.id) : [])];
  return now.some(id => id != null && !had.has(id));
}
// The save that would be adopted: the backup, with this device's online fields kept (exactly like backup import),
// and the Vault clock continuing from the current save's so no Vault time is paid twice.
export function buildRestore(cur, snap) {
  const next = JSON.parse(JSON.stringify(snap));
  for (const k of ONLINE_FIELDS) { if (cur[k] !== undefined) next[k] = JSON.parse(JSON.stringify(cur[k])); else delete next[k]; }
  next.tradeLocks = JSON.parse(JSON.stringify(cur.tradeLocks || {}));
  const curAt = Math.max(0, ...((cur.vault?.slots) || []).map(s => Number(s?.lastAt) || 0));
  if (curAt && next.vault && Array.isArray(next.vault.slots)) for (const s of next.vault.slots) if (s && typeof s === 'object') s.lastAt = Math.max(Number(s.lastAt) || 0, curAt);
  return next;
}
// The whole restore, with every safety rule. `store` = { add(rec) → Promise<bool> }, `adopt(next)` writes through the
// game's own save path, `keep(json)` makes the extra localStorage safety copy (may throw). Returns { ok, reason, message }.
export async function restore({ cur, curJson, rec, store, adopt, keep, busy = false, version = '', speciesCount = 16, now = Date.now() }) {
  const block = restoreBlock(cur, { busy }); if (block) return { ok: false, ...block };
  const opened = openRecord(rec, speciesCount); if (!opened.ok) return opened;
  if (tradedSince(cur, opened.save)) return { ok: false, reason: 'traded', message: 'You traded cards after this backup was made. Restoring it would bring back cards you traded away (or remove ones you received), so it can\'t be used. Pick a newer backup.' };
  const json = typeof curJson === 'string' && curJson ? curJson : JSON.stringify(cur);
  let saved = false;
  try { const pre = makeRecord(json, 'before-restore', { now, version, speciesCount }); if (pre) saved = (await store.add(pre, { force: true })) !== false; } catch { saved = false; }
  try { if (keep) { keep(json); saved = true; } } catch { /* storage full: the IndexedDB copy is enough */ }
  if (!saved) return { ok: false, reason: 'nobackup', message: 'Your current save could not be backed up first, so nothing was changed. Free some browser storage and try again.' };
  const next = buildRestore(cur, opened.save);
  try { adopt(next); } catch { return { ok: false, reason: 'save', message: 'The backup could not be saved. Nothing was changed.' }; }
  return { ok: true, save: next };
}
// Monthly reminder: due when the player has real progress and hasn't downloaded a backup (or been reminded) for 30 days.
export function reminderDue(st, now = Date.now()) {
  if (!st || !Array.isArray(st.owned)) return false;
  const progress = (st.packCount || 0) > 0 || st.owned.length > 6 || (st.cleared || []).length > 0;
  const m = st.ember?.saveSafety || {}, last = Math.max(Number(m.downloadedAt) || 0, Number(m.remindedAt) || 0);
  if (!progress) return false;
  if (!last) { if (!Number.isFinite(m.firstSeen)) return false; return now - m.firstSeen >= MONTH; }
  return now - last >= MONTH;
}
// In-memory store with the same interface as the IndexedDB one (used by tests).
export function memoryStore() {
  let list = [];
  return {
    async add(rec, { force = false } = {}) { const r = force ? { list: [rec, ...list].sort((a, b) => b.at - a.at).slice(0, MAX), added: true } : rotate(list, rec); if (force) list = r.list; else if (r.added) list = r.list; return r.added; },
    async list() { return [...list].sort((a, b) => b.at - a.at); },
    async get(id) { return list.find(r => r.id === id) || null; },
    _raw: () => list, _set: l => { list = l; }
  };
}

/* ---------------------------------------------------------------- Browser side */
const B = typeof window !== 'undefined' ? window.EmberBridge : null;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fmt = n => Math.floor(Number(n) || 0).toLocaleString();
const version = () => { try { return window.EmberWhatsNew?.LATEST || ''; } catch { return ''; } };
const nSpecies = () => B?.species?.length || 16;
const savedJson = () => { try { return localStorage.getItem(B.key); } catch { return null; } };
const REASONS = { auto: 'Automatic', manual: 'Backed up by you', 'before-restore': 'Before a restore', 'before-cloud': 'Before loading a cloud save', 'before-batch3': 'Before the test reset', 'before-import': 'Before importing a backup code', pack: 'After a big pack opening' };

// IndexedDB store. Every call resolves (never rejects): failures give false / [] / null.
const DB = 'emberlings-backups', OS = 'snaps';
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise(res => {
    try {
      if (!('indexedDB' in window)) return res(null);
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => { try { if (!rq.result.objectStoreNames.contains(OS)) rq.result.createObjectStore(OS, { keyPath: 'id' }); } catch { } };
      rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); rq.onblocked = () => res(null);
    } catch { res(null); }
  }).then(d => { if (!d) dbp = null; return d; });
  return dbp;
}
const idb = {
  async list() {
    const d = await db(); if (!d) return [];
    return new Promise(res => { try { const rq = d.transaction(OS, 'readonly').objectStore(OS).getAll(); rq.onsuccess = () => res((rq.result || []).sort((a, b) => b.at - a.at)); rq.onerror = () => res([]); } catch { res([]); } });
  },
  async get(id) { return (await idb.list()).find(r => r.id === id) || null; },
  // Adds and rotates in one transaction. With force, an identical newest copy is still added (pre-restore copy).
  async add(rec, { force = false } = {}) {
    const d = await db(); if (!d || !rec) return false;
    return new Promise(res => {
      try {
        const tx = d.transaction(OS, 'readwrite'), os = tx.objectStore(OS); let added = false;
        const rq = os.getAll();
        rq.onsuccess = () => {
          const cur = rq.result || [];
          const r = force ? (() => { const next = [rec, ...cur].sort((a, b) => b.at - a.at); return { added: true, dropped: next.slice(MAX) }; })() : rotate(cur, rec);
          if (!r.added) return;
          added = true; os.put(rec); for (const x of r.dropped) os.delete(x.id);
        };
        tx.oncomplete = () => res(added); tx.onerror = () => res(false); tx.onabort = () => res(false);
      } catch { res(false); }
    });
  }
};

let lastSnapAt = 0, packsSince = 0, snapping = false;
async function snapshot(reason = 'auto', json = savedJson()) {
  if (!B) return false;
  try {
    const rec = makeRecord(json, reason, { version: version(), speciesCount: nSpecies() });
    if (!rec) return false;
    const ok = await idb.add(rec);
    if (ok) { lastSnapAt = rec.at; packsSince = 0; }
    if (B.view === 'settings') paintList();
    return ok;
  } catch { return false; }
}
// Hourly check while playing (the page is visible), never during a trade, battle or pack reveal.
async function hourly() {
  if (snapping || document.visibilityState !== 'visible') return;
  try { if (B.busy()) return; } catch { return; }
  snapping = true;
  try {
    if (!lastSnapAt) lastSnapAt = (await idb.list())[0]?.at || 0;
    if (Date.now() - lastSnapAt >= HOUR) await snapshot('auto');
  } finally { snapping = false; }
}
// Risky moments: the game (test reset), cloud.js (cloud load) and enhancements.js (import) each write a one-off
// "<save key>-backup-before-…" copy right before they replace the save. Watch for those writes and keep the same
// save here too. The original write always happens exactly as before.
function watchSafetyCopies() {
  try {
    const P = Storage.prototype, orig = P.setItem;
    if (orig.__emberSafety) return;
    const prefix = B.key + '-backup-before-';
    const wrapped = function (k, v) {
      const out = orig.apply(this, arguments);
      try {
        if (this === window.localStorage && typeof k === 'string' && k.startsWith(prefix) && k !== B.key + '-backup-before-restore') {
          const why = 'before-' + k.slice(prefix.length);
          snapshot(REASONS[why] ? why : 'before-cloud', String(v || '') || savedJson());
        }
      } catch { }
      return out;
    };
    wrapped.__emberSafety = true;
    P.setItem = wrapped;
  } catch { }
}
function onPack(cards) {
  try {
    packsSince++;
    const big = (cards || []).some(c => (B.rarityRank?.(c) || 0) >= 3 || c?.shiny || c?.mutation) || packsSince >= 3;
    if (big) setTimeout(() => { try { if (!B.busy()) snapshot('pack'); else setTimeout(() => snapshot('pack'), 8000); } catch { } }, 1500);
  } catch { }
}

/* ---------------------------------------------------------------- Restore screen (Settings) */
const ss = () => { const st = B.state; if (!st.ember || typeof st.ember !== 'object') st.ember = {}; if (!st.ember.saveSafety || typeof st.ember.saveSafety !== 'object') st.ember.saveSafety = {}; return st.ember.saveSafety; };
const when = t => { try { return new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch { return new Date(t).toLocaleString(); } };
function sectionHTML() {
  const due = reminderDue(B.state);
  return `<p class="setHelp ssIntro">EMBERLINGS keeps the last ${MAX} copies of your save in this browser: about once an hour while you play, after big pack openings, and before cloud loads, imports and resets.</p>
  <div class="ssRemind" id="ssRemind" ${due ? '' : 'hidden'}><p><b>💾 It's been a while since you downloaded a backup.</b> A backup file keeps your collection safe even if this browser's data is cleared.</p>
   <p class="setBtns"><button type="button" class="setBtn gold" id="ssDownload">⬇ Download a backup</button><button type="button" class="setBtn" id="ssLater">Not now</button></p></div>
  <ol class="ssList" id="ssList" aria-label="Saved backups"><li class="ssEmpty">Looking for backups…</li></ol>
  <p class="setBtns"><button type="button" class="setBtn" id="ssNow">💾 Back up now</button></p>
  <p class="setHelp ssStatus" id="ssStatus" role="status" aria-live="polite"></p>`;
}
async function paintList() {
  const ol = $('#ssList'); if (!ol) return;
  const list = await idb.list();
  if (!$('#ssList')) return;
  if (!list.length) { ol.innerHTML = '<li class="ssEmpty">No automatic backups yet. One is made soon after you start playing, or press Back up now.</li>'; return; }
  ol.innerHTML = list.map(r => `<li class="ssItem" data-ss-id="${esc(r.id)}"><div class="ssInfo"><b>${esc(when(r.at))}</b><span>${fmt(r.cards)} cards · 🪙 ${fmt(r.coins)}</span><small>${esc(REASONS[r.reason] || 'Automatic')}${r.version ? ` · ${esc(r.version)}` : ''}</small></div>
   <button type="button" class="setBtn ssRestore" data-ss-restore="${esc(r.id)}" aria-label="Restore the backup from ${esc(when(r.at))}">↺ Restore</button><div class="ssAsk" hidden></div></li>`).join('');
}
const status = (m, bad) => { const el = $('#ssStatus'); if (el) { el.textContent = m; el.classList.toggle('ssBad', !!bad); } };
function currentBlock() { let busy = false; try { busy = !!B.busy(); } catch { busy = true; } return restoreBlock(B.state, { busy }); }
async function ask(id, li) {
  $$('.ssAsk').forEach(a => { a.hidden = true; a.innerHTML = ''; });
  const block = currentBlock(); if (block) return status(block.message, true);
  const rec = await idb.get(id); const opened = openRecord(rec, nSpecies());
  if (!opened.ok) return status(opened.message, true);
  if (tradedSince(B.state, opened.save)) return status('You traded cards after this backup was made. Restoring it would bring back cards you traded away (or remove ones you received), so it can\'t be used. Pick a newer backup.', true);
  const cur = B.state, box = $('.ssAsk', li); if (!box) return;
  box.innerHTML = `<p><b>Replace your current save with this backup?</b></p><p>Now: ${fmt(cur.owned.length)} cards · 🪙 ${fmt(cur.coins)}<br>Backup: ${fmt(opened.save.owned.length)} cards · 🪙 ${fmt(opened.save.coins)}</p>
   <p class="setHelp">Your current save is backed up first, so you can change your mind.</p>
   <p class="setBtns"><button type="button" class="setBtn gold" data-ss-yes="${esc(id)}">Yes, restore</button><button type="button" class="setBtn" data-ss-no>Cancel</button></p>`;
  box.hidden = false; status(''); $('[data-ss-yes]', box)?.focus();
}
async function doRestore(id, btn) {
  if (btn) btn.disabled = true;
  status('Restoring…');
  let busy = false; try { busy = !!B.busy(); } catch { busy = true; }
  const res = await restore({
    cur: B.state, curJson: savedJson(), rec: await idb.get(id), store: idb, busy, version: version(), speciesCount: nSpecies(),
    keep: json => localStorage.setItem(B.key + '-backup-before-restore', json),
    adopt: next => B.adopt(next)
  });
  if (!res.ok) { if (btn) btn.disabled = false; status(res.message, true); return; }
  status('Restored. Reloading…');
  setTimeout(() => location.reload(), 300);
}
function bindSection(el) {
  paintList();
  el.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.ssRestore) return void ask(b.dataset.ssRestore, b.closest('.ssItem'));
    if (b.dataset.ssYes) return void doRestore(b.dataset.ssYes, b);
    if (b.hasAttribute('data-ss-no')) { const a = b.closest('.ssAsk'); a.hidden = true; a.innerHTML = ''; status(''); return; }
    if (b.id === 'ssNow') { b.disabled = true; snapshot('manual').then(ok => { b.disabled = false; status(ok ? 'Backup saved.' : 'Your save is the same as the newest backup, so nothing new was needed.'); }); return; }
    if (b.id === 'ssDownload') { const d = $('#fxDownload'); if (d) d.click(); else window.EmberSettings?.open?.('backup'); return; }
    if (b.id === 'ssLater') { ss().remindedAt = Date.now(); B.save(); $('#ssRemind').hidden = true; return; }
  });
}
let hooked = false;
function hookSettings() {
  if (hooked || !window.EmberSettings?.addSection) return;
  hooked = window.EmberSettings.addSection({ id: 'restore', icon: '↺', title: 'Restore a backup', order: 99, html: sectionHTML, bind: bindSection }) !== false;
}
// Link from the existing backup panel (Home and Settings) to the restore list.
function linkPanels() {
  for (const p of $$('.fxBackup:not([data-ss])')) {
    p.dataset.ss = '1';
    const host = $('#fxBackupStatus', p)?.parentNode || p;
    const a = document.createElement('p'); a.className = 'ssLink';
    a.innerHTML = '<button type="button" class="button alt" data-ss-open>↺ Restore an automatic backup</button>';
    host.insertBefore(a, $('#fxBackupStatus', p) || null);
  }
}

function onClick(ev) {
  const b = ev.target.closest?.('[data-ss-open]'); if (b) { ev.preventDefault(); window.EmberSettings?.open?.('restore'); return; }
  // Downloading a backup file (the existing export) counts for the monthly reminder.
  if (ev.target.closest?.('#fxDownload')) { try { ss().downloadedAt = Date.now(); B.save(); const r = $('#ssRemind'); if (r) r.hidden = true; } catch { } }
}
// One gentle toast a month on Home, pointing to Settings.
function remind() {
  try {
    const m = ss(); if (!Number.isFinite(m.firstSeen)) { m.firstSeen = Date.now(); B.save(); return; }
    if (B.view !== 'home' || !reminderDue(B.state) || B.busy()) return;
    m.remindedAt = Date.now(); B.save();
    B.toast('💾 Tip: download a backup of your collection in Settings → Restore a backup.');
  } catch { }
}

function css() {
  if ($('#ssStyles')) return;
  const s = document.createElement('style'); s.id = 'ssStyles';
  s.textContent = `
/* Save safety (save-safety.js): restore list in Settings */
#set-restore{grid-column:1/-1}
.ssList{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}
.ssItem{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 12px;border:1px solid #e9b75a33;border-radius:10px;background:#111824;min-width:0}
.ssInfo{flex:1 1 220px;min-width:0;display:flex;flex-direction:column;gap:2px}
.ssInfo b{font:700 16px system-ui,sans-serif;color:#f6ead2}.ssInfo span{font-size:15px;color:#e6dcc6}.ssInfo small{font-size:13px;color:#a99f8a}
.ssEmpty{padding:10px 0;color:#c9bfa8;font-size:14px}
.ssAsk{flex:1 1 100%;padding:10px 12px;border-radius:8px;background:#1e1a10;border:1px solid #e9b75a77;color:#f3e6c8;font-size:15px;overflow-wrap:anywhere}
.ssAsk p{margin:4px 0}
.ssRemind{margin:10px 0 0;padding:10px 12px;border-radius:10px;border:1px solid #ffd27a88;background:#2a2212;color:#f6ead2;font-size:15px}
.ssRemind p{margin:4px 0}
.ssStatus.ssBad{color:#ffb4a0;font-weight:700}
.ssLink{margin:6px 0}.ssLink .button{min-height:44px}
@media(max-width:520px){.ssItem .setBtn{flex:1 1 100%}}
`;
  document.head.append(s);
}

if (B && !window.EmberSaveSafety) {
  css();
  watchSafetyCopies();
  document.addEventListener('click', onClick, true);
  hookSettings();
  addEventListener('ember:packSummary', e => onPack(e.detail?.creatures));
  addEventListener('ember:frame', () => { hookSettings(); requestAnimationFrame(linkPanels); if (B.view === 'home') setTimeout(remind, 4000); });
  setTimeout(hourly, 20000);
  setInterval(hourly, 5 * 60e3);
  setTimeout(linkPanels, 500);
  window.EmberSaveSafety = Object.freeze({ snapshot: reason => snapshot(reason || 'manual'), list: () => idb.list(), open: () => window.EmberSettings?.open?.('restore') });
}
