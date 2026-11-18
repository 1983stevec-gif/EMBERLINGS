// EMBERLINGS friends leaderboard: battle numbers only (wins, current win streak, best win streak, bosses
// cleared and biggest single hit), and only for you and your accepted friends. It sits at the top of the
// Friends list as a small table; tap a column heading to sort by it (tap again to reverse).
// The numbers are read once each time the Friends page opens: no polling, and nothing is saved, so the
// chosen sort goes back to Wins on your next visit. Server: GET /api/social/leaderboard (lib/profile-api.mjs).
// Presentation only: no gameplay, reward or card changes.
const B = globalThis.window?.EmberBridge;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const FRIEND_MAX = 100; // the server sends at most this many friends

export const COLS = [
  { key: 'wins', label: 'Wins' },
  { key: 'winStreak', label: 'Streak' },
  { key: 'bestStreak', label: 'Best streak' },
  { key: 'bossClears', label: 'Bosses' },
  { key: 'biggestHit', label: 'Biggest hit' }
];
const COL = key => COLS.find(c => c.key === key) || COLS[0];
const num = v => Math.max(0, Math.floor(Number(v) || 0));
const fmt = n => num(n).toLocaleString('en-US');
const statsOf = s => ({ wins: num(s?.wins), winStreak: num(s?.winStreak), bestStreak: num(s?.bestStreak), bossClears: num(s?.bossClears), biggestHit: num(s?.biggestHit) });
const byName = (a, b) => (String(a.username).toLowerCase() < String(b.username).toLowerCase() ? -1 : String(a.username).toLowerCase() > String(b.username).toLowerCase() ? 1 : 0);

/* ------------------------------------------------------------ Pure helpers (also used by tests) */
// My row first, then friends by the chosen column (ties by username). Never includes a stranger.
export function orderRows(me, friends, key = 'wins', dir = 'desc') {
  const k = COL(key).key, sign = dir === 'asc' ? 1 : -1;
  const mine = { username: String(me?.username || ''), stats: statsOf(me?.stats), me: true };
  const list = (Array.isArray(friends) ? friends : []).slice(0, FRIEND_MAX).map(f => ({ username: String(f?.username || ''), stats: statsOf(f?.stats), me: false }));
  list.sort((a, b) => sign * (a.stats[k] - b.stats[k]) || byName(a, b));
  return [mine, ...list];
}
// The table markup. aria-sort marks the chosen column and its direction.
export function boardHTML(me, friends, key = 'wins', dir = 'desc') {
  const k = COL(key).key, rows = orderRows(me, friends, k, dir);
  const head = COLS.map(c => `<th scope="col" aria-sort="${c.key === k ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}"><button type="button" role="button" class="lbSort${c.key === k ? ' on' : ''}" data-lb-key="${c.key}" aria-label="Sort by ${c.label}">${c.label}<i aria-hidden="true">${c.key === k ? (dir === 'asc' ? '▲' : '▼') : ''}</i></button></th>`).join('');
  return `<div class="lbWrap"><table class="lbTable"><caption class="lbSr">Your battle numbers and your friends' battle numbers, sorted by ${COL(k).label}.</caption>
   <thead><tr><th scope="col"><span class="lbSr">Player</span></th>${head}</tr></thead>
   <tbody>${rows.map(r => `<tr${r.me ? ' class="lbMe"' : ''}><th scope="row">${r.me ? '<span class="lbYou">You</span>' : ''}${esc(r.username)}</th>${COLS.map(c => `<td>${fmt(r.stats[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/* ------------------------------------------------------------ In the game */
const signedIn = () => { try { return !!B?.state?.playerUsername; } catch { return false; } };
let data = null, failed = false, asked = false, wasHere = false, sortKey = 'wins', sortDir = 'desc';

function reset() { data = null; failed = false; asked = false; sortKey = 'wins'; sortDir = 'desc'; }

// The panel sits right above the friends list, in whichever container this layout puts the list in.
function ensurePanel() {
  if (B.view !== 'friends') return null;
  const lists = document.getElementById('friendLists');
  if (!lists) return null;
  let p = document.getElementById('lbPanel');
  if (!p) {
    p = document.createElement('section'); p.id = 'lbPanel'; p.className = 'panel lbPanel';
    p.setAttribute('aria-labelledby', 'lbTitle'); p._lbHtml = '';
    p.addEventListener('click', ev => { const b = ev.target.closest('[data-lb-key]'); if (b) sortBy(b.dataset.lbKey); });
  }
  if (p.parentElement !== lists.parentElement || p.nextElementSibling !== lists) lists.parentElement.insertBefore(p, lists);
  return p;
}

function paint() {
  const p = ensurePanel(); if (!p) return;
  let body;
  if (!signedIn()) body = '';
  else if (failed) body = '<p class="lbEmpty" role="status">Leaderboards are not available right now.</p>';
  else if (!data) body = '<p class="lbEmpty" role="status">Loading battle numbers…</p>';
  else if (!(data.friends || []).length) body = '<p class="lbEmpty">Add friends to compare battle numbers.</p>';
  else body = boardHTML(data.me, data.friends, sortKey, sortDir);
  const html = `<h2 id="lbTitle"><span aria-hidden="true">🏆</span> Friends leaderboard</h2>${body}`;
  if (p._lbHtml === html) return;
  p._lbHtml = html;
  const focus = document.activeElement?.dataset?.lbKey || '';
  p.innerHTML = html;
  if (focus) p.querySelector(`[data-lb-key="${CSS.escape(focus)}"]`)?.focus({ preventScroll: true });
}

function sortBy(key) {
  const k = COL(key).key; if (!COLS.some(c => c.key === k)) return;
  if (k === sortKey) sortDir = sortDir === 'desc' ? 'asc' : 'desc'; else { sortKey = k; sortDir = 'desc'; }
  paint();
}

async function load() {
  if (asked || !signedIn()) return;
  asked = true; paint();
  try {
    const d = await B.online('/leaderboard');
    data = d && typeof d === 'object' && !Array.isArray(d) ? d : null; failed = !data;
  } catch (err) { console.warn('leaderboards', err); failed = true; data = null; }
  finally { paint(); }
}

function onFrame() {
  try {
    const here = B.view === 'friends';
    if (here && !wasHere) reset();
    wasHere = here;
    if (!here || !signedIn()) { document.getElementById('lbPanel')?.remove(); return; }
    if (!ensurePanel()) return;
    if (!asked) load(); else paint();
  } catch (err) { console.warn('leaderboards', err); }
}

if (B) {
  injectCSS();
  addEventListener('ember:frame', onFrame);
  addEventListener('ember:friends', () => { try { onFrame(); } catch (err) { console.warn('leaderboards', err); } });
  window.EmberLeaderboards = { refresh: () => { reset(); if (B.view === 'friends') load(); }, orderRows, boardHTML };
}

/* ------------------------------------------------------------ Styles */
function injectCSS() {
  if ($('#lbStyles')) return;
  const css = document.createElement('style'); css.id = 'lbStyles';
  css.textContent = `
/* Friends leaderboard (public/leaderboards.js) */
.lbPanel{max-width:1180px;margin:0 0 16px;box-sizing:border-box;min-width:0;padding:14px 16px;border:1px solid #e9b75a55;border-radius:14px;background:linear-gradient(180deg,#141b28e6,#0d1219e6);color:var(--ui-text,#efe6d2);animation:lbIn .24s ease-out}
.lbPanel *{box-sizing:border-box}
.lbPanel h2{margin:0 0 10px;font-family:var(--ui-display,Georgia,serif);font-size:20px;line-height:1.2;color:#ffe6b0}
.lbWrap{overflow-x:auto;overscroll-behavior-x:contain}
.lbTable{width:100%;min-width:520px;border-collapse:collapse;font-size:14px}
.lbTable th,.lbTable td{padding:6px 10px;text-align:right;border-bottom:1px solid #3c3220;white-space:nowrap}
.lbTable tbody th{text-align:left;font-weight:600;max-width:220px;overflow:hidden;text-overflow:ellipsis;color:#e8dcc2}
.lbTable tbody tr:last-child th,.lbTable tbody tr:last-child td{border-bottom:0}
.lbSort{display:inline-flex;align-items:center;justify-content:flex-end;gap:4px;min-height:44px;min-width:44px;padding:4px 8px;border:0;border-radius:8px;background:transparent;color:#d8ccb4;font:600 13px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;cursor:pointer}
.lbSort:hover{background:#ffffff12}
.lbSort.on{color:#ffe2a0;background:#ffffff14}
.lbSort i{font-style:normal;font-size:11px;min-width:10px}
.lbSort:focus-visible{outline:3px solid #ffd27a;outline-offset:2px}
.lbMe{background:linear-gradient(90deg,#3a2c10cc,#1a1408cc);box-shadow:inset 3px 0 0 #f2c45f}
.lbMe th{color:#ffe08a;font-weight:800}
.lbYou{display:inline-block;margin-right:6px;padding:1px 8px;border-radius:99px;background:#f2c45f;color:#2a1a06;font-size:11px;font-weight:800;line-height:1.5;vertical-align:1px}
.lbEmpty{margin:2px 0;font-size:14px;line-height:1.4;color:#d8ccb4}
.lbSr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@keyframes lbIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
html[data-fx="off"] .lbPanel{animation:none}
body.reducedMotion .lbPanel{animation:none}
@media (prefers-reduced-motion:reduce){.lbPanel{animation:none}}
@media (max-width:560px){.lbPanel{padding:12px}.lbPanel h2{font-size:18px}.lbTable{font-size:13px}.lbTable th,.lbTable td{padding:6px 8px}}
`;
  document.head.append(css);
}
