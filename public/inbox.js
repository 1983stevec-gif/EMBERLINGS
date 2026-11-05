// Notification inbox: a bell in the header with an unread count, opening one panel that gathers what is new:
// trade invitations, finished trades, friend requests, friends' highlights, cheers on your highlights,
// Daily rewards ready to claim and an unseen What's new.
// Everything is worked out from data the game already has (no new server endpoints). The existing pop-ups
// (trade invitation, cheer toast) stay as they are; the inbox is the history.
// Save data (additive, capped): state.ember.inbox = { since: <first use time>, items: { id: { t: first seen, v: version, r: version read } } }.
// Nothing here changes gameplay, rewards or cards. The save key is unchanged.

/* ---------------------------------------------------------------- Pure helpers (also used by tests/inbox.mjs) */
export const CAP = 150;
export function inboxStore(state, now = Date.now()) {
  if (!state.ember || typeof state.ember !== 'object') state.ember = {};
  let s = state.ember.inbox;
  if (!s || typeof s !== 'object') s = state.ember.inbox = {};
  if (!Number.isFinite(s.since)) s.since = now;
  if (!s.items || typeof s.items !== 'object' || Array.isArray(s.items)) s.items = {};
  return s;
}
// Records when each item was first noticed (or noticed again with a newer version). Returns true if anything changed.
export function noteItems(store, list, now = Date.now()) {
  let changed = false;
  for (const it of list) {
    const v = it.v || 1, rec = store.items[it.id];
    if (!rec) { store.items[it.id] = { t: Number.isFinite(it.at) ? it.at : now, v, r: 0 }; changed = true; }
    else if (v > (rec.v || 1)) { rec.v = v; rec.t = now; changed = true; }
  }
  return changed;
}
// Unread: not read at this version yet, and not older than the inbox itself (so existing history starts as read).
export function isUnread(store, it) {
  const rec = store.items[it.id], v = it.v || 1, t = rec?.t ?? it.at ?? 0;
  if (it.read) return false;
  if ((rec?.r || 0) >= v) return false;
  return it.live || t >= store.since;
}
export function markRead(store, list, now = Date.now()) {
  for (const it of list) { const rec = store.items[it.id] || (store.items[it.id] = { t: it.at || now, v: it.v || 1, r: 0 }); rec.r = Math.max(rec.r || 0, it.v || 1); }
}
export function prune(store, cap = CAP) {
  const ids = Object.keys(store.items); if (ids.length <= cap) return false;
  ids.sort((a, b) => (store.items[b].t || 0) - (store.items[a].t || 0)).slice(cap).forEach(id => delete store.items[id]);
  return true;
}
export function ago(t, now = Date.now()) {
  const s = Math.max(0, (now - t) / 1000);
  if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s / 60)} min ago`; if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400); return d === 1 ? 'yesterday' : `${d} days ago`;
}

/* ---------------------------------------------------------------- Browser side */
const B = typeof window !== 'undefined' ? window.EmberBridge : null;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const signedIn = () => !!B?.state?.playerUsername;
const store = () => inboxStore(B.state);
const nameOf = c => B.species?.[c?.kind]?.name || 'Mythling';
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Live data gathered from the game and the other modules.
let invites = [], requests = [], dailyDefs = null, meTimer = 0, meLoading = false, lastMe = 0;

async function loadDailyDefs() {
  if (dailyDefs) return dailyDefs;
  try { const m = await import('/daily.js'); dailyDefs = { QUESTS: m.QUESTS, WEEKLY: m.WEEKLY }; } catch { dailyDefs = { QUESTS: [], WEEKLY: null }; }
  return dailyDefs;
}
function dailyReady() {
  const D = window.EmberDaily; if (!D?.daily || !dailyDefs) return null;
  let d; try { d = D.daily(); } catch { return null; }
  if (!d || !Array.isArray(d.quests)) return null;
  const goal = id => dailyDefs.QUESTS.find(q => q.id === id)?.goal ?? Infinity;
  const login = d.lastClaim !== dayKey() ? 1 : 0;
  const quests = d.quests.filter(q => !q.claimed && q.progress >= goal(q.id)).length;
  const bonus = !d.bonusClaimed && d.quests.length && d.quests.every(q => q.claimed) ? 1 : 0;
  const weekly = dailyDefs.WEEKLY && d.weekly && !d.weekly.claimed && d.weekly.progress >= dailyDefs.WEEKLY.goal ? 1 : 0;
  return { login, total: login + quests + bonus + weekly };
}
function activityWords(e) {
  const who = `<b>${esc(e.username || 'A friend')}</b>`, c = e.card;
  if (e.type === 'rare_pull' && c) { const w = `${c.shiny ? 'shiny ' : ''}${c.rarity || 'rare'} ${nameOf(c)}`; return `${who} pulled ${/^[aeiou]/i.test(w) ? 'an' : 'a'} ${esc(w)}!`; }
  if (e.type === 'boss_win') return `${who} beat ${esc(B.bosses?.[e.level] || 'a boss')}!`;
  if (e.type === 'level_up' && c) return `${who} raised ${esc(nameOf(c))} to Level ${e.level}!`;
  return `${who} had a great moment!`;
}
const goFriends = () => B.go('friends');

// Builds the full list of inbox items from what the game knows right now.
function gather() {
  const out = [];
  for (const t of invites) out.push({ id: 'ti:' + t.id, live: true, icon: '🤝', text: `<b>${esc(t.username)}</b> invited you to trade`, act: 'Open trade', run: () => B.go('trading') });
  for (const r of requests) out.push({ id: 'fr:' + r.id, live: true, icon: '👋', text: `<b>${esc(r.username)}</b> wants to be your friend`, act: 'View', run: goFriends });
  for (const h of (B.state.tradeHistory || []).slice(0, 10)) {
    const got = (h.got || []).map(nameOf), what = got.length ? (got.length > 1 ? `${esc(got[0])} and ${got.length - 1} more` : esc(got[0])) : 'new cards';
    out.push({ id: 'tc:' + h.id, at: h.at, icon: '✅', text: `Trade complete${h.partner ? ` with <b>${esc(h.partner)}</b>` : ''}: you got ${what}`, act: 'View', run: () => window.EmberTrades?.openHistory ? window.EmberTrades.openHistory() : B.go('trading') });
  }
  const feed = window.EmberActivity?.feed?.();
  if (feed && !feed.error && signedIn()) {
    for (const e of (feed.events || []).slice(0, 20)) out.push({ id: 'act:' + e.id, at: e.at, icon: { rare_pull: '✨', boss_win: '👑', level_up: '⭐' }[e.type] || '✨', text: activityWords(e), act: 'View', run: goFriends });
    for (const e of feed.mine || []) if (e.cheers > 0) {
      let text = ''; try { text = window.EmberActivity.cheerText(e); } catch {}
      out.push({ id: 'ch:' + e.id, v: e.cheers, icon: '🎉', text: esc(text || 'A friend cheered your highlight!'), act: 'View', run: goFriends });
    }
  }
  const dr = dailyReady();
  if (dr?.total) out.push({ id: 'daily:' + dayKey(), v: dr.total, live: true, icon: '🎁', text: dr.total === 1 && dr.login ? 'Your daily login reward is ready' : `${dr.total} Daily rewards are ready to claim`, act: 'Claim', run: () => window.EmberDaily?.open?.() });
  const WN = window.EmberWhatsNew;
  if (WN?.LATEST) {
    // Once read in its own panel it counts as read here too.
    const rel = WN.RELEASES?.[0], unseen = B.state.ember?.seenRelease !== WN.LATEST;
    out.push({ id: 'wn:' + WN.LATEST, live: unseen, read: !unseen, icon: '📰', text: `What's new: ${esc(rel?.title || 'the latest update')}`, act: 'Read', run: () => WN.open?.() });
  }
  const s = store();
  if (noteItems(s, out) | prune(s)) B.save();
  for (const it of out) it.t = s.items[it.id]?.t ?? it.at ?? Date.now();
  return out.sort((a, b) => b.t - a.t);
}

/* ---------------------------------------------------------------- Bell */
let lastCount = -1, items = [];
const calm = () => document.documentElement.dataset.fx === 'off' || document.documentElement.dataset.fx === 'light' || !!B.state?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
function bellHTML(n) {
  return `<span class="inbIco" aria-hidden="true">🔔</span><b class="inbCount" aria-hidden="true"${n ? '' : ' hidden'}>${n > 9 ? '9+' : n}</b>`;
}
function label(n) { return n ? `Notifications, ${n} unread` : 'Notifications, nothing new'; }
function makeBell(where) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'inbBell ' + where;
  b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'inbPanel');
  b.onclick = e => { e.stopPropagation(); $('#inbPanel') ? close() : open(b); };
  return b;
}
// Painted desktop header: the bell sits in the painted scenery just under the coins, clear of Sound, coins and the user button.
function placePainted(bar, bell) {
  const c = $('.uiPCoins', bar); if (!c) return;
  const L = parseFloat(c.style.left), W = parseFloat(c.style.width), T = parseFloat(c.style.top), H = parseFloat(c.style.height);
  if (![L, W, T, H].every(Number.isFinite)) return;
  bell.style.left = `calc(${L + W / 2}% - 22px)`; bell.style.top = `calc(${T + H}% + 3px)`;
}
function ensureBells() {
  if (!B) return;
  const bar = $('.uiTop .uiPBarIn'), right = $('.uiTop .uiTopIn .uiRight');
  if (bar && !$('.inbBell', bar)) { const b = makeBell('inbPainted'); bar.append(b); placePainted(bar, b); }
  if (right && !$('.inbBell', right)) right.prepend(makeBell('inbCompact'));
  paintBells();
}
function paintBells() {
  const n = items.filter(it => isUnread(store(), it)).length;
  for (const b of $$('.inbBell')) {
    if (b.dataset.n !== String(n)) { b.innerHTML = bellHTML(n); b.dataset.n = n; }
    b.setAttribute('aria-label', label(n)); b.toggleAttribute('data-unread', !!n);
    b.setAttribute('aria-expanded', String(!!$('#inbPanel')));
  }
  if (lastCount >= 0 && n > lastCount && !calm()) for (const b of $$('.inbBell')) { b.classList.remove('inbWiggle'); void b.offsetWidth; b.classList.add('inbWiggle'); setTimeout(() => b.classList.remove('inbWiggle'), 1200); }
  lastCount = n;
}
function refresh() {
  if (!B?.state) return;
  items = gather(); ensureBells(); paintBells();
  if ($('#inbPanel')) paintPanel();
}

/* ---------------------------------------------------------------- Panel */
let opener = null;
function visibleBell() { return $$('.inbBell').find(b => b.getClientRects().length && b.getBoundingClientRect().width > 0) || null; }
function position(el) {
  const bell = (opener && opener.isConnected && opener.getClientRects().length ? opener : visibleBell());
  const box = $('.inbBox', el); if (!box) return;
  if (innerWidth < 560 || !bell) { box.style.left = '12px'; box.style.right = '12px'; box.style.top = `${bell ? Math.round(bell.getBoundingClientRect().bottom + 8) : 64}px`; box.style.width = 'auto'; return; }
  const r = bell.getBoundingClientRect(), w = Math.min(420, innerWidth - 24);
  box.style.width = w + 'px'; box.style.right = 'auto';
  box.style.left = Math.round(Math.max(12, Math.min(innerWidth - w - 12, r.right - w + 22))) + 'px';
  box.style.top = Math.round(r.bottom + 8) + 'px';
}
function itemHTML(it) {
  const unread = isUnread(store(), it), t = it.t;
  return `<li class="inbItem${unread ? ' unread' : ''}" data-inb="${esc(it.id)}">
    <span class="inbIcon" aria-hidden="true">${it.icon}</span>
    <div class="inbText"><p>${unread ? '<span class="inbSr">New: </span>' : ''}${it.text}</p><time datetime="${new Date(t).toISOString()}">${ago(t)}</time></div>
    <div class="inbBtns"><button type="button" class="inbAct" data-inb-act="${esc(it.id)}">${esc(it.act)}</button>${unread ? `<button type="button" class="inbRead" data-inb-read="${esc(it.id)}" aria-label="Mark as read"><span aria-hidden="true">✓</span></button>` : ''}</div></li>`;
}
function paintPanel() {
  const el = $('#inbPanel'); if (!el) return;
  const s = store(), n = items.filter(it => isUnread(s, it)).length, list = items.slice(0, 40);
  const focusId = el.contains(document.activeElement) ? (document.activeElement.dataset.inbAct ? 'a:' + document.activeElement.dataset.inbAct : document.activeElement.dataset.inbRead ? 'r:' + document.activeElement.dataset.inbRead : document.activeElement.dataset.inbFocus) : null;
  const sub = signedIn() ? '' : '<p class="inbHint">Sign in from Friends to see trades, friend requests and cheers here too.</p>';
  el.innerHTML = `<div class="inbBox" role="document">
    <header class="inbHead"><h2 id="inbTitle"><span aria-hidden="true">🔔</span> Notifications</h2>
      <button type="button" class="inbAll" data-inb-focus="all" ${n ? '' : 'disabled'}>Mark all read</button>
      <button type="button" class="inbX" data-inb-focus="x" aria-label="Close notifications">×</button></header>
    <p class="inbSum" role="status">${n ? `${n} new` : 'You are all caught up.'}</p>${sub}
    ${list.length ? `<ul class="inbList">${list.map(itemHTML).join('')}</ul>` : '<p class="inbEmpty">Nothing here yet. Trade invitations, friend requests, cheers and Daily rewards will show up here.</p>'}</div>`;
  position(el);
  $('.inbX', el).onclick = () => close();
  $('.inbAll', el).onclick = () => { markRead(s, items.filter(it => isUnread(s, it))); B.save(); paintBells(); paintPanel(); };
  $$('[data-inb-read]', el).forEach(b => b.onclick = () => {
    const it = items.find(x => x.id === b.dataset.inbRead); if (!it) return;
    const li = b.closest('li'), next = li?.nextElementSibling?.querySelector('.inbAct') || li?.previousElementSibling?.querySelector('.inbAct');
    markRead(s, [it]); B.save(); paintBells(); paintPanel();
    ($(`[data-inb-act="${CSS.escape(it.id)}"]`, el) || (next && $(`[data-inb-act="${CSS.escape(next.dataset.inbAct)}"]`, el)) || $('.inbX', el))?.focus({ preventScroll: true });
  });
  $$('[data-inb-act]', el).forEach(b => b.onclick = () => {
    const it = items.find(x => x.id === b.dataset.inbAct); if (!it) return;
    markRead(s, [it]); B.save(); close(false); paintBells();
    try { it.run(); } catch {}
  });
  if (focusId) {
    const [k, id] = focusId.includes(':') ? [focusId[0], focusId.slice(2)] : [null, focusId];
    const f = k === 'a' ? $(`[data-inb-act="${CSS.escape(id)}"]`, el) : k === 'r' ? ($(`[data-inb-read="${CSS.escape(id)}"]`, el) || $(`[data-inb-act="${CSS.escape(id)}"]`, el)) : $(`[data-inb-focus="${CSS.escape(id)}"]`, el);
    (f && !f.disabled ? f : $('.inbX', el)).focus({ preventScroll: true });
  }
}
function onKey(e) {
  const el = $('#inbPanel'); if (!el) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
  if (e.key === 'Tab') {
    const f = $$('button:not([disabled])', el); if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
  }
}
function onOutside(e) { const el = $('#inbPanel'); if (el && !$('.inbBox', el)?.contains(e.target) && !e.target.closest?.('.inbBell')) close(); }
function open(bell) {
  close(false);
  opener = bell || visibleBell();
  items = gather();
  const el = document.createElement('div'); el.id = 'inbPanel'; el.className = 'inbPanel';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'inbTitle');
  document.body.append(el); paintPanel(); paintBells();
  ($('.inbList .inbAct', el) || $('.inbX', el)).focus({ preventScroll: true });
  addEventListener('keydown', onKey, true);
  setTimeout(() => addEventListener('pointerdown', onOutside, true), 0);
  addEventListener('resize', reposition);
  if (signedIn()) { loadMe(true); window.EmberActivity?.refresh?.(); }
}
function reposition() { const el = $('#inbPanel'); if (el) position(el); }
function close(refocus = true) {
  const el = $('#inbPanel'); if (!el) return;
  el.remove(); removeEventListener('keydown', onKey, true); removeEventListener('pointerdown', onOutside, true); removeEventListener('resize', reposition);
  paintBells();
  if (refocus) { const b = opener?.isConnected && opener.getClientRects().length ? opener : visibleBell(); b?.focus({ preventScroll: true }); }
}

/* ---------------------------------------------------------------- Friend requests (the same /me data the Friends page loads) */
async function loadMe(force) {
  if (!signedIn() || meLoading || Date.now() - lastMe < (force ? 1500 : 8000)) return;
  meLoading = true;
  try { const d = await B.online('/me'); if (d?.me) { requests = Array.isArray(d.incoming) ? d.incoming : []; } }
  catch {} finally { meLoading = false; lastMe = Date.now(); refresh(); }
}
function pollMe() {
  clearTimeout(meTimer);
  meTimer = setTimeout(async () => { if (!document.hidden && !['cardBattle', 'online'].includes(B.view)) await loadMe(); pollMe(); }, 60000);
}

/* ---------------------------------------------------------------- Wiring */
if (B) {
  inboxStore(B.state);
  injectCSS();
  addEventListener('ember:tradeInvites', e => { invites = (e.detail?.from || []).filter(t => t?.id); refresh(); });
  addEventListener('ember:tradeComplete', () => setTimeout(refresh, 50));
  addEventListener('ember:friends', e => { if (Array.isArray(e.detail?.incoming)) { requests = e.detail.incoming; lastMe = Date.now(); } refresh(); });
  addEventListener('ember:activity', refresh);
  addEventListener('ember:frame', () => requestAnimationFrame(() => { refresh(); setTimeout(ensureBells, 300); }));
  addEventListener('storage', () => setTimeout(refresh, 50));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { refresh(); loadMe(); } });
  // The header can be redrawn without a new frame (for example after the Sound toggle): keep the bell in place.
  setInterval(() => { if ($('.uiTop') && !$('.uiTop .inbBell')) ensureBells(); }, 1500);
  // Daily rewards progress is saved by daily.js without an event, so look again now and then.
  setInterval(() => { if (!document.hidden) refresh(); }, 30000);
  loadDailyDefs().then(refresh);
  setTimeout(() => { loadMe(); pollMe(); }, 4000);
  requestAnimationFrame(refresh);
  window.EmberInbox = { open: () => open(), close, refresh, items: () => items.map(({ run, ...it }) => ({ ...it, unread: isUnread(store(), it) })) };
}

/* ---------------------------------------------------------------- Styles */
function injectCSS() {
  if ($('#inbStyles')) return;
  const css = document.createElement('style'); css.id = 'inbStyles';
  css.textContent = `
.inbBell{position:relative;display:inline-grid;place-items:center;flex:0 0 auto;width:44px;height:44px;min-width:44px;padding:0;margin:0;border-radius:50%;border:1px solid #9a7638;background:radial-gradient(circle at 50% 35%,#24305e,#0b1230);color:#ffe6b0;cursor:pointer;box-shadow:inset 0 0 0 1px #000a,0 2px 8px #0008;font:inherit;line-height:1}
.inbBell:hover{border-color:#f1c76a}
.inbBell:focus-visible{outline:3px solid #ffd27a;outline-offset:2px}
.inbBell .inbIco{font-size:21px;filter:drop-shadow(0 1px 1px #000a)}
.inbBell .inbCount{position:absolute;top:-5px;right:-6px;min-width:20px;height:20px;padding:0 5px;border-radius:99px;background:#e2412f;border:2px solid #fff3c8;color:#fff;font:800 11.5px/16px system-ui,sans-serif;text-align:center;box-sizing:border-box;pointer-events:none}
.inbBell .inbCount[hidden]{display:none}
.uiPBarIn>.inbBell.inbPainted{position:absolute;z-index:3;width:44px;height:44px;background:radial-gradient(circle at 50% 35%,#2a376acc,#0b1230e6)}
.inbBell.inbPainted .inbCount{top:auto;bottom:-2px;right:-12px}
.uiTopIn .uiRight{display:flex;align-items:center;gap:8px}
@media(max-width:420px){.uiTopIn .uiRight{gap:5px}.uiTopIn .inbBell{width:44px;height:44px}}
.inbBell.inbWiggle .inbIco{display:inline-block;animation:inbWiggle .9s ease-in-out;transform-origin:50% 8%}
@keyframes inbWiggle{0%,100%{transform:rotate(0)}15%{transform:rotate(16deg)}30%{transform:rotate(-14deg)}45%{transform:rotate(10deg)}60%{transform:rotate(-7deg)}75%{transform:rotate(3deg)}}
@media (prefers-reduced-motion:reduce){.inbBell.inbWiggle .inbIco{animation:none}}
html[data-fx="off"] .inbBell.inbWiggle .inbIco{animation:none}
body:has(.cardArena) .inbBell{display:none}
.inbPanel{position:fixed;inset:0;z-index:155;background:#05081a66}
.inbBox{position:absolute;box-sizing:border-box;display:flex;flex-direction:column;max-height:calc(100dvh - 90px);padding:14px 14px 12px;border-radius:16px;border:1px solid #c99a4a;background:linear-gradient(180deg,#1a2148,#0d1330);color:#efe6d2;box-shadow:0 18px 50px #000c;font-family:system-ui,'Segoe UI',sans-serif}
.inbBox *{box-sizing:border-box}
.inbHead{display:flex;align-items:center;gap:8px}
.inbHead h2{flex:1 1 auto;margin:0;font:600 22px 'EB Garamond',Georgia,serif;color:#ffe6b0}
.inbAll{min-height:44px;padding:0 12px;border-radius:12px;border:1px solid #9a7638;background:#0b1230;color:#ffe6b0;font:700 14px system-ui,sans-serif;cursor:pointer;white-space:nowrap}
.inbAll:disabled{opacity:.5;cursor:default}
.inbX{width:44px;height:44px;flex:0 0 44px;border-radius:50%;border:1px solid #9a7638;background:#0b1230;color:#ffe6b0;font-size:24px;line-height:1;cursor:pointer}
.inbAll:focus-visible,.inbX:focus-visible,.inbAct:focus-visible,.inbRead:focus-visible{outline:3px solid #ffd27a;outline-offset:2px}
.inbSum{margin:6px 2px 8px;font-size:14px;color:#cbbfa8}
.inbHint{margin:0 2px 8px;font-size:13.5px;color:#b9ad96}
.inbList{list-style:none;margin:0;padding:2px;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:8px}
.inbItem{display:flex;align-items:center;gap:10px;padding:8px 8px 8px 10px;border-radius:12px;background:#ffffff0d;border:1px solid #e9b75a2e;min-width:0}
.inbItem.unread{background:linear-gradient(135deg,#3a2f1a,#2a2342);border-color:#ffd36a99;box-shadow:inset 3px 0 0 #ffcf6a}
.inbIcon{flex:0 0 36px;width:36px;height:36px;display:grid;place-items:center;border-radius:50%;background:#0b1230;border:1px solid #9a763899;font-size:19px}
.inbText{flex:1 1 auto;min-width:0}
.inbText p{margin:0;font-size:14.5px;line-height:1.3;overflow-wrap:anywhere}
.inbText b{color:#ffd98a}
.inbText time{display:block;margin-top:2px;font-size:12.5px;color:#b9ad96}
.inbItem:not(.unread) .inbText p{color:#d8ccb4}
.inbBtns{flex:0 0 auto;display:flex;align-items:center;gap:6px}
.inbAct{min-height:44px;min-width:64px;padding:0 12px;border-radius:12px;border:1px solid #f3c55d;background:linear-gradient(#ffcf6a,#d58f2a);color:#2a1a06;font:800 14px system-ui,sans-serif;cursor:pointer;white-space:nowrap}
.inbRead{width:44px;height:44px;border-radius:12px;border:1px solid #9a7638;background:#0b1230;color:#ffe6b0;font-size:18px;cursor:pointer}
.inbEmpty{margin:8px 2px;color:#d8ccb4;font-size:14.5px}
.inbSr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media(max-width:559px){.inbBox{max-height:calc(100dvh - 84px)}.inbItem{flex-wrap:wrap}.inbText{flex-basis:calc(100% - 50px)}.inbBtns{margin-left:46px}}
`;
  document.head.append(css);
}
