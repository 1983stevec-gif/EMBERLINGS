// EMBERLINGS friend nicknames and favourites (local only).
// - Every friend gets a small ⋯ button (Friends list on phone, desktop and portrait tablet, the trade friend
//   pickers) and a ✎ button on their profile page. It opens a little panel: a private nickname (up to 20
//   characters, shown as "Nickname (username)") and "★ Favourite", which pins the friend to the top of Friends
//   and the trade picker with a star.
// - Order: favourites first, then friends who are online (or in a duel), then everyone else, otherwise as before.
// - Nicknames and favourites stay in this save only: state.ember.friendNotes = { username: { nick, fav, at } },
//   at most 200 friends. They are never sent to the server. Missing means no nickname and not a favourite.
// - All text is escaped before it is shown. The online labels from presence.js are left exactly as they are.
// Presentation only: no gameplay or reward changes.

export const NICK_MAX = 20, NOTES_CAP = 200;
export const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
// Usernames are letters, digits and _ (the server allows 3\u201320). "__proto__" would be unsafe as an object key.
export const validName = n => typeof n === 'string' && /^[A-Za-z0-9_]{1,32}$/.test(n) && n !== '__proto__';
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* ------------------------------------------------------------ Pure helpers (also used by tests/friend-notes.mjs) */
// One line, no control characters, single spaces, at most NICK_MAX characters (emoji count as one).
export function cleanNick(s) {
  const t = String(s ?? '').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g, ' ').replace(/\s+/g, ' ').trim();
  return [...t].slice(0, NICK_MAX).join('').trim();
}
// A tidy copy of the saved notes: valid usernames only, cleaned nicknames, empty notes dropped, newest NOTES_CAP kept.
export function cleanNotes(raw) {
  const out = {}; if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const list = [];
  for (const k of Object.keys(raw)) {
    const v = raw[k]; if (!validName(k) || !v || typeof v !== 'object') continue;
    const nick = cleanNick(v.nick), fav = v.fav === true;
    if (!nick && !fav) continue;
    list.push([k, { ...(nick ? { nick } : {}), ...(fav ? { fav } : {}), at: Number.isFinite(v.at) ? v.at : 0 }]);
  }
  // Over the cap: keep favourites first, then the most recently changed.
  list.sort((a, b) => (b[1].fav ? 1 : 0) - (a[1].fav ? 1 : 0) || b[1].at - a[1].at);
  for (const [k, v] of list.slice(0, NOTES_CAP)) out[k] = v;
  return out;
}
export function getNote(notes, name) { return validName(name) && own(notes, name) && notes[name] && typeof notes[name] === 'object' ? notes[name] : null; }
export const nickOf = (notes, name) => cleanNick(getNote(notes, name)?.nick);
export const isFav = (notes, name) => getNote(notes, name)?.fav === true;
// Changes one friend's note on ember.friendNotes (created only when something is set). Returns the new note or null.
export function setNote(ember, name, patch, now = Date.now()) {
  if (!ember || typeof ember !== 'object' || !validName(name)) return null;
  const notes = ember.friendNotes && typeof ember.friendNotes === 'object' && !Array.isArray(ember.friendNotes) ? ember.friendNotes : {};
  const old = getNote(notes, name) || {};
  const nick = cleanNick('nick' in patch ? patch.nick : old.nick), fav = 'fav' in patch ? patch.fav === true : old.fav === true;
  if (!nick && !fav) { if (own(notes, name)) delete notes[name]; if (!Object.keys(notes).length && !ember.friendNotes) return null; ember.friendNotes = notes; return null; }
  notes[name] = { ...(nick ? { nick } : {}), ...(fav ? { fav } : {}), at: now };
  const keys = Object.keys(notes);
  if (keys.length > NOTES_CAP) {
    // Make room by forgetting the oldest notes, non-favourites first, never the one just set.
    const drop = keys.filter(k => k !== name).sort((a, b) => (notes[a]?.fav ? 1 : 0) - (notes[b]?.fav ? 1 : 0) || (notes[a]?.at || 0) - (notes[b]?.at || 0));
    for (const k of drop.slice(0, keys.length - NOTES_CAP)) delete notes[k];
  }
  ember.friendNotes = notes;
  return notes[name];
}
// Stable order: favourites, then online, then the order they came in. items: [{ name, online }].
export function sortFriends(items, notes) {
  return items.map((it, i) => ({ it, i, f: isFav(notes, it.name) ? 1 : 0, o: it.online ? 1 : 0 }))
    .sort((a, b) => b.f - a.f || b.o - a.o || a.i - b.i).map(x => x.it);
}
// "Nickname (username)" as safe HTML, or just the username.
export function nameHTML(notes, name) {
  const nick = nickOf(notes, name);
  return nick ? `<span class="fnNick">${esc(nick)}</span> <span class="fnUser">(${esc(name)})</span>` : esc(name);
}
export function nameText(notes, name) { const nick = nickOf(notes, name); return nick ? `${nick} (${name})` : String(name); }

/* ------------------------------------------------------------ In the game */
const B = globalThis.window?.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const notes = () => { const e = B?.state?.ember; return e && e.friendNotes && typeof e.friendNotes === 'object' ? e.friendNotes : {}; };
const STAR = '<span class="fnStar" aria-hidden="true">★</span>';
const isOn = f => window.EmberPresence ? window.EmberPresence.isOn(f) : !!(f && (f.online || f.inDuel));
let lastFriends = [];

function moreBtn(name, cls = '') {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'fnMore ' + cls; b.dataset.fnUser = name;
  b.innerHTML = '<span aria-hidden="true">⋯</span>';
  b.setAttribute('aria-label', `Nickname and favourite for ${nameText(notes(), name)}`); b.title = 'Nickname and favourite';
  b.onclick = e => { e.preventDefault(); e.stopPropagation(); openPanel(name, b); };
  return b;
}
// Sets markup only when it changed. Compared with what we last wrote (innerHTML reads back quotes unescaped,
// which would never match and keep the list observers busy).
function setHTML(el, html) { if (el.dataset.fnHtml === html) return; el.dataset.fnHtml = html; el.innerHTML = html; }
// Re-orders sibling elements in place, only moving anything when the order is different (no repaint loops).
function reorder(els) {
  const parent = els[0]?.parentElement; if (!parent || els.some(el => el.parentElement !== parent)) return false;
  const now = [...parent.children].filter(el => els.includes(el));
  if (now.every((el, i) => el === els[i])) return false;
  const anchor = now[0].previousSibling;
  let at = anchor; for (const el of els) { parent.insertBefore(el, at ? at.nextSibling : parent.firstChild); at = el; }
  return true;
}

/* ---- Friends list (phone .friendRow, desktop painted page, portrait tablet .uiXFTRow) */
function paintFriends(data) {
  if (B.view !== 'friends') return;
  const list = Array.isArray(data?.friends) ? data.friends : lastFriends; if (data?.friends) lastFriends = data.friends;
  const n = notes(), rows = [];
  for (const f of list) {
    const name = f?.username; if (!validName(name)) continue;
    const row = $(`#friendLists [data-trade-invite="${CSS.escape(name)}"]`)?.closest('.friendRow'); if (!row) continue;
    rows.push({ name, online: isOn(f), row });
    const strong = $('strong', row); if (!strong) continue;
    const nick = nickOf(n, name), fav = isFav(n, name);
    row.classList.toggle('fnFav', fav);
    // The username stays in <strong> (other parts of the game look it up); the nickname goes just before it.
    let tag = $('.fnTag', row);
    if (!tag) { tag = document.createElement('span'); tag.className = 'fnTag'; strong.before(tag); }
    const html = (fav ? STAR : '') + (nick ? `<span class="fnNick">${esc(nick)}</span>` : '');
    setHTML(tag, html);
    tag.hidden = !html; strong.classList.toggle('fnParen', !!nick);
    if (!$('.fnMore', row)) strong.after(moreBtn(name, 'fnRowMore'));
    else $('.fnMore', row).setAttribute('aria-label', `Nickname and favourite for ${nameText(n, name)}`);
  }
  const sorted = sortFriends(rows, n).map(r => r.row);
  if (sorted.length > 1) reorder(sorted);
}

/* ---- Trade friend pickers: the game's own list (phone), and the painted desktop / tablet pickers */
function paintTradeList(list) {
  const n = notes(), items = [];
  for (const btn of $$('.tradeFriends [data-trade-invite]', list)) {
    const name = btn.dataset.tradeInvite; if (!validName(name)) continue;
    let wrap = btn.parentElement;
    if (!wrap.classList.contains('fnPick')) {
      wrap = document.createElement('div'); wrap.className = 'fnPick fnPickPhone'; wrap.dataset.fnI = String(items.length);
      btn.before(wrap); wrap.append(btn, moreBtn(name));
      // Wrap the bare username so a nickname can sit in front of it.
      const tn = [...btn.childNodes].find(x => x.nodeType === 3 && x.textContent.trim());
      if (tn) { const u = document.createElement('span'); u.className = 'fnName'; u.textContent = tn.textContent.trim(); tn.replaceWith(u, ' '); }
    }
    const nm = $('.fnName', btn), html = (isFav(n, name) ? STAR : '') + nameHTML(n, name);
    if (nm) setHTML(nm, html);
    wrap.classList.toggle('fnFav', isFav(n, name));
    items.push({ name, online: /online/i.test($('small', btn)?.textContent || ''), el: wrap, i: +wrap.dataset.fnI || 0 });
  }
  items.sort((a, b) => a.i - b.i);
  const sorted = sortFriends(items, n).map(x => x.el);
  if (sorted.length > 1) reorder(sorted);
}
function paintPicker(box) {
  const n = notes();
  for (const btn of $$('[data-tpick]', box)) {
    const name = btn.dataset.tpick; if (!validName(name)) continue;
    let wrap = btn.parentElement;
    if (!wrap.classList.contains('fnPick')) { wrap = document.createElement('div'); wrap.className = 'fnPick'; btn.before(wrap); wrap.append(btn, moreBtn(name)); }
    const b = $('.uiXTWho b, .tpFWho b', btn), html = (isFav(n, name) ? STAR : '') + nameHTML(n, name);
    if (b) setHTML(b, html);
    wrap.classList.toggle('fnFav', isFav(n, name)); wrap.classList.toggle('on', btn.classList.contains('on'));
  }
}
const watched = new WeakSet();
function watch(el, fn) { if (!el || watched.has(el)) return; watched.add(el); new MutationObserver(() => fn(el)).observe(el, { childList: true, subtree: true }); fn(el); }
function paintTrading() {
  if (B.view !== 'trading') return;
  watch($('#tradeFriendList'), paintTradeList);
  for (const box of $$('.uiXTList, .tpFriends')) watch(box, paintPicker);
}

/* ---- Friend profile page */
function paintProfile() {
  if (B.view !== 'friendProfile') return;
  const h1 = $('#pfName'), name = $('[data-pf-trade]')?.dataset.pfTrade; if (!h1 || !validName(name)) return;
  const n = notes(), html = (isFav(n, name) ? STAR : '') + nameHTML(n, name);
  setHTML(h1, html);
  const who = h1.parentElement;
  if (!$('.fnPfEdit', who)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'fnPfEdit'; b.dataset.fnUser = name;
    b.innerHTML = '<span aria-hidden="true">✎</span> Nickname · ★ Favourite'; b.onclick = () => openPanel(name, b);
    h1.after(b);
  }
}

function repaintAll() {
  if (B.view === 'friends') paintFriends(null);
  if (B.view === 'trading') { const l = $('#tradeFriendList'); if (l) paintTradeList(l); for (const box of $$('.uiXTList, .tpFriends')) paintPicker(box); }
  if (B.view === 'friendProfile') paintProfile();
}

/* ---- The nickname / favourite panel */
let opener = null;
function openPanel(name, from) {
  closePanel(false); opener = from || null;
  const n = notes(), nick = nickOf(n, name), fav = isFav(n, name);
  const d = document.createElement('div'); d.id = 'fnDlg'; d.className = 'fnShade';
  d.innerHTML = `<div class="fnBox" role="dialog" aria-modal="true" aria-labelledby="fnTitle" aria-describedby="fnPrivate">
   <h2 id="fnTitle">${esc(name)}</h2>
   <form class="fnForm" autocomplete="off">
    <label for="fnNickIn">Nickname</label>
    <div class="fnRowIn"><input id="fnNickIn" type="text" maxlength="${NICK_MAX}" placeholder="Set nickname" spellcheck="false"><span class="fnLeft" aria-hidden="true"></span></div>
    <p class="fnHint">Shown as “Nickname (${esc(name)})”. Up to ${NICK_MAX} characters.</p>
    <button type="button" class="fnFavBtn" aria-pressed="${fav}"></button>
    <p class="fnPrivate" id="fnPrivate">🔒 Only you can see this. Nicknames and favourites stay on this device and are never sent to the server.</p>
    <div class="fnBtns"><button type="submit" class="fnSave">Save</button>${nick ? '<button type="button" class="fnClear">Remove nickname</button>' : ''}<button type="button" class="fnCancel">Cancel</button></div>
   </form></div>`;
  document.body.append(d);
  const input = $('#fnNickIn', d), favBtn = $('.fnFavBtn', d), left = $('.fnLeft', d);
  input.value = nick; let favNow = fav;
  const showFav = () => { favBtn.setAttribute('aria-pressed', String(favNow)); favBtn.innerHTML = favNow ? '<span aria-hidden="true">★</span> Favourite · pinned to the top' : '<span aria-hidden="true">☆</span> Favourite'; };
  const count = () => { left.textContent = `${[...input.value].length}/${NICK_MAX}`; };
  showFav(); count();
  input.oninput = () => { if ([...input.value].length > NICK_MAX) input.value = [...input.value].slice(0, NICK_MAX).join(''); count(); };
  favBtn.onclick = () => { favNow = !favNow; showFav(); };
  const commit = patch => {
    const e = B.state.ember && typeof B.state.ember === 'object' ? B.state.ember : (B.state.ember = {});
    setNote(e, name, patch); try { B.save(); } catch { }
    closePanel(true); repaintAll();
    const nn = nickOf(notes(), name);
    B.toast?.(nn || isFav(notes(), name) ? `Saved for ${nameText(notes(), name)} · only on this device` : `${name}: nickname and favourite removed`);
  };
  $('.fnForm', d).onsubmit = ev => { ev.preventDefault(); commit({ nick: input.value, fav: favNow }); };
  $('.fnClear', d)?.addEventListener('click', () => commit({ nick: '', fav: favNow }));
  $('.fnCancel', d).onclick = () => closePanel(true);
  d.addEventListener('mousedown', ev => { if (ev.target === d) closePanel(true); });
  d.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { ev.preventDefault(); closePanel(true); return; }
    if (ev.key !== 'Tab') return;
    const f = $$('button, input', d).filter(x => !x.disabled && x.offsetParent !== null); if (!f.length) return;
    if (ev.shiftKey && document.activeElement === f[0]) { ev.preventDefault(); f.at(-1).focus(); }
    else if (!ev.shiftKey && document.activeElement === f.at(-1)) { ev.preventDefault(); f[0].focus(); }
  });
  d.dataset.fnUser = name;
  setTimeout(() => input.focus(), 30);
}
function closePanel(refocus) {
  const d = $('#fnDlg'); if (!d) return; const name = d.dataset.fnUser; d.remove();
  if (!refocus) return;
  // The row may have been redrawn while the panel was open: find its ⋯ button again.
  const target = opener?.isConnected ? opener : $(`.fnMore[data-fn-user="${CSS.escape(name || '')}"], .fnPfEdit[data-fn-user="${CSS.escape(name || '')}"]`);
  opener = null; try { target?.focus({ preventScroll: true }); } catch { }
}

const CSS_TEXT = `
/* friend-notes.js: nicknames and favourites */
.fnTag{margin-right:.3em}.fnTag[hidden]{display:none}
.fnStar{color:#ffd46b;text-shadow:0 0 6px #f2b44a88;margin-right:.25em;font-style:normal}
.fnNick{font-weight:700;color:inherit}
.fnUser,.fnParen{font-weight:400;opacity:.78;font-size:.82em}
.fnParen::before{content:'('}.fnParen::after{content:')'}
.fnMore{display:inline-grid;place-items:center;min-width:40px;min-height:40px;margin:0 0 0 .35em;padding:0 8px;border:1px solid #c9a35a88;border-radius:10px;background:#0d1534cc;color:#f3dcae;font:700 20px/1 system-ui,sans-serif;cursor:pointer;vertical-align:middle;pointer-events:auto;position:relative;z-index:2}
.fnMore:hover{background:#1d2a5c;border-color:#f2c45f}
.fnMore:focus-visible,.fnPfEdit:focus-visible,.fnBox button:focus-visible,.fnBox input:focus-visible{outline:3px solid #ffd46b;outline-offset:2px}
.friendRow.fnFav{box-shadow:inset 3px 0 0 #f2c45f}
/* Portrait tablet rows: nickname on the name line, ⋯ at the end of it */
.uiXFTRowWho .fnTag{display:block;margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;font-size:calc(26*var(--u));color:#fff4e0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.1}
.uiXFTRowWho .fnTag[hidden]{display:none}
.uiXFTRowWho .fnTag:not([hidden])+strong{font-size:calc(20*var(--u))}
.uiXFTRowWho:has(.fnTag:not([hidden])){gap:calc(6*var(--u))!important;top:calc(14*var(--u))!important}
.uiXFTRowWho .fnRowMore{position:absolute;left:calc(-40*var(--u));top:calc(-18*var(--u));margin:0;min-width:44px;min-height:44px;font-size:18px}
/* Trade pickers: the friend button and its ⋯ side by side */
.fnPick{display:flex;align-items:stretch;gap:6px;min-width:0}
.fnPick>[data-tpick],.fnPick>[data-trade-invite]{flex:1;min-width:0}
.fnPick>.fnMore{flex:none;margin:0;align-self:center}
.uiXTList>.fnPick{gap:0;border-bottom:1px solid #2d3a5f}.uiXTList>.fnPick:only-child{min-height:100%}
.uiXTList>.fnPick>.uiXTFriend{border-bottom:0}
.uiXTList>.fnPick>.fnMore{margin-right:.6em}
.uiXTList:has(.fnPick+.fnPick) .uiXTFriend{min-height:0;padding:.5em 1em}
.uiXTList:has(.fnPick+.fnPick) .uiXTAva{width:3.6em;height:3.6em}
.uiXTList>.fnPick.on{background:linear-gradient(90deg,#2a2410,#121b3e)}
.tpFriends>.fnPick>.fnMore{min-width:48px;min-height:48px}
.fnPickPhone .tradeFriendButton{overflow:hidden}.fnPickPhone .fnName{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}
/* Friend profile */
.fnPfEdit{display:inline-flex;align-items:center;gap:.4em;min-height:44px;margin:.3em 0;padding:4px 14px;border:1px solid #c9a35a;border-radius:999px;background:#0d1534cc;color:#f3dcae;font:600 15px/1.2 system-ui,sans-serif;cursor:pointer}
#pfName .fnUser{font-size:.6em}
/* The panel */
.fnShade{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:16px;background:#050816b3;animation:fnIn .18s ease-out}
.fnBox{width:min(420px,100%);max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;padding:18px 18px 16px;border:2px solid #c9a35a;border-radius:16px;background:linear-gradient(180deg,#17224f,#0b1230);color:#eef1fb;box-shadow:0 18px 50px #000a;font:16px/1.4 system-ui,'Segoe UI',sans-serif}
.fnBox h2{margin:0 0 10px;font:700 26px/1.1 'Cormorant Garamond',Georgia,serif;color:#f3dcae;overflow-wrap:anywhere}
.fnBox label{display:block;font-weight:700;margin-bottom:4px}
.fnRowIn{position:relative}
.fnBox input{box-sizing:border-box;width:100%;min-height:46px;padding:8px 62px 8px 12px;border:1.5px solid #4a5a8a;border-radius:10px;background:#0a1028;color:#fff;font:inherit;font-size:17px}
.fnLeft{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:13px;color:#9aa6c8}
.fnHint{margin:4px 0 12px;font-size:13px;color:#aab4d4;overflow-wrap:anywhere}
.fnFavBtn{display:flex;align-items:center;gap:.5em;width:100%;min-height:46px;padding:8px 12px;border:1.5px solid #4a5a8a;border-radius:10px;background:#0d1534;color:#eef1fb;font:inherit;font-weight:700;cursor:pointer;text-align:left}
.fnFavBtn[aria-pressed="true"]{border-color:#f2c45f;background:linear-gradient(180deg,#3a2e10,#1d1708);color:#ffe7a8}
.fnFavBtn span{color:#ffd46b;font-size:1.2em}
.fnPrivate{margin:12px 0;padding:8px 10px;border-radius:10px;background:#ffffff0d;font-size:14px;color:#d6dcf0}
.fnBtns{display:flex;flex-wrap:wrap;gap:8px}
.fnBtns button{flex:1 1 auto;min-height:46px;padding:8px 14px;border-radius:10px;border:1.5px solid #c9a35a;background:transparent;color:#f3dcae;font:inherit;font-weight:700;cursor:pointer}
.fnBtns .fnSave{background:linear-gradient(180deg,#f7cc6a,#dc9a33);color:#2a1405;border-color:#f7cc6a}
@keyframes fnIn{from{opacity:0}to{opacity:1}}
html[data-fx="off"] .fnShade{animation:none}
@media (prefers-reduced-motion:reduce){.fnShade{animation:none}}
@media (pointer:coarse){.fnMore{min-width:44px;min-height:44px}}
`;

if (B) {
  const st = document.createElement('style'); st.id = 'fnStyle'; st.textContent = CSS_TEXT; document.head.append(st);
  // Tidy a stored copy once (drops anything malformed); only written back when it was already there.
  try { const e = B.state?.ember; if (e && e.friendNotes !== undefined) { const c = cleanNotes(e.friendNotes); if (JSON.stringify(c) !== JSON.stringify(e.friendNotes)) { e.friendNotes = c; B.save(); } } } catch { }
  addEventListener('ember:friends', e => { try { paintFriends(e.detail); } catch (err) { console.warn('friend-notes', err); } });
  addEventListener('ember:frame', () => {
    if (B.view !== 'friends' && B.view !== 'friendProfile' && B.view !== 'trading') closePanel(false);
    try { paintTrading(); paintProfile(); } catch (err) { console.warn('friend-notes', err); }
  });
  window.EmberFriendNotes = Object.freeze({ nick: name => nickOf(notes(), name), fav: name => isFav(notes(), name), label: name => nameText(notes(), name), open: openPanel });
}
