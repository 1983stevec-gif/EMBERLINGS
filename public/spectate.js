// Watch a friend's duel (read-only). When two players are in an online card duel, their friends see a "Watch"
// button next to them on the Friends list, in a small "Live duels" panel there, and on the friend's profile.
// Watching opens a board that shows both Actives and Benches, HP, points, whose turn it is and the last attack,
// with the usual attack effects. It never shows hands, deck order or face-down cards: the server only sends the
// face-up board (lib/spectate-api.mjs). Watchers have no buttons that touch the match, and the server ignores them.
// "Let friends watch my duels" (On by default) is stored on the server with the player, not in the save.
// Talks to the game only through window.EmberBridge, ember:* events and the page. Nothing here changes the save.
const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const ELEMENT_COLORS = { Fire: '#e67e4e', Moon: '#a796dc', Nature: '#72b987', Lightning: '#e3c857', Water: '#64b5d6', Crystal: '#cba0d8', Ice: '#9bd5dd', Shadow: '#9276b5', Wind: '#86cbb6' };
const COND = { Asleep: '💤', Burned: '🔥', Poisoned: '☠️', Paralyzed: '⚡', Confused: '💫' };
const POLL_MS = 1500, LIST_MS = 5000;

let live = [], allowWatch = true, listAt = 0, listBusy = false, listError = false, note = '';
let watch = null, pollTimer = 0, clockTimer = 0;

/* ---------------------------------------------------------------- Server */
async function getJSON(path, headers = {}) {
  const r = await fetch('/api/social' + path, { credentials: 'same-origin', cache: 'no-store', headers });
  if (r.status === 304) return { status: 304 };
  let data = null; try { data = await r.json(); } catch { /* ignore */ }
  return { status: r.status, data, etag: r.headers.get('etag') };
}
async function refreshLive(force = false) {
  if (!B.state?.playerUsername || listBusy || (!force && Date.now() - listAt < LIST_MS)) return;
  listBusy = true;
  try {
    const r = await getJSON('/spectate');
    if (r.status === 200 && r.data) { live = Array.isArray(r.data.live) ? r.data.live : []; allowWatch = r.data.allowWatch !== false; listError = false; }
    else listError = true;
  } catch { listError = true; }
  listAt = Date.now(); listBusy = false;
  paintFriends(); paintProfileButton();
}
const duelFor = name => live.find(d => d.players.some(p => p.toLowerCase() === String(name).toLowerCase()));
const vsText = d => d.players.map(esc).join(' vs ');

/* ---------------------------------------------------------------- Friends page */
function watchButton(d, cls = 'spcWatchBtn') {
  return `<button type="button" class="${cls}" data-spc-watch="${esc(d.id)}" aria-label="Watch ${esc(d.players.join(' vs '))}"><span aria-hidden="true">👁</span> Watch</button>`;
}
function bindWatch(root) { $$('[data-spc-watch]', root).forEach(b => b.onclick = () => open(b.dataset.spcWatch)); }
function paintFriends() {
  if (B.view !== 'friends' || !$('#friendLists')) return;
  // A Watch button next to each friend who is in a live duel.
  $$('.spcRowBtn').forEach(b => { const d = live.find(x => x.id === b.dataset.spcWatch); if (!d) b.remove(); });
  for (const d of live) for (const name of d.friends || []) {
    if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) continue;
    const row = $(`[data-trade-invite="${CSS.escape(name)}"]`)?.closest('.friendRow'); if (!row || $(`.spcRowBtn[data-spc-watch="${CSS.escape(d.id)}"]`, row)) continue;
    const wrap = document.createElement('span'); wrap.innerHTML = watchButton(d, 'spcWatchBtn spcRowBtn'); const btn = wrap.firstElementChild;
    btn.title = `${name} is in a duel: ${d.players.join(' vs ')}`; btn.onclick = () => open(d.id);
    const tabletWho = $('.uiXFTRowWho', row), actions = $('.friendActions', row);
    if (tabletWho) tabletWho.append(btn); else if (actions) actions.prepend(btn); else row.append(btn);
  }
  // The "Live duels" panel with the watch setting.
  let p = $('#spcPanel');
  if (!p) {
    p = document.createElement('section'); p.id = 'spcPanel'; p.className = 'panel spcPanel'; p.setAttribute('aria-labelledby', 'spcTitle');
    const act = $('#actPanel'); if (act) act.before(p); else $('#app').append(p);
  }
  const focus = document.activeElement && p.contains(document.activeElement) ? (document.activeElement.dataset.spcWatch || 'switch') : null;
  const list = live.length
    ? `<ul class="spcList">${live.map(d => `<li><span class="spcLive" aria-hidden="true">LIVE</span><span class="spcWho"><b>${vsText(d)}</b><small>Turn ${Number(d.turnNumber) || 1} · ${(d.points || [0, 0]).map(n => Number(n) || 0).join(' : ')}</small></span>${watchButton(d)}</li>`).join('')}</ul>`
    : `<p class="spcEmpty">${listError ? 'Live duels could not load right now. Trying again soon.' : 'No friends are in a duel right now. When they are, you can watch here.'}</p>`;
  p.innerHTML = `<header class="spcHead"><h2 id="spcTitle"><span aria-hidden="true">👁</span> Live duels</h2></header>${list}
    <div class="spcSetting"><span id="spcAllowLbl">Let friends watch my duels</span>
      <button type="button" class="spcSwitch" role="switch" aria-checked="${allowWatch}" aria-labelledby="spcAllowLbl"><span>${allowWatch ? 'On' : 'Off'}</span></button>
      <small class="spcNote" role="status">${esc(note || (allowWatch ? 'Friends see your board, never your hand or deck.' : 'Off: nobody can watch your duels.'))}</small></div>`;
  bindWatch(p);
  $('.spcSwitch', p).onclick = toggleAllow;
  if (focus) (focus === 'switch' ? $('.spcSwitch', p) : $(`[data-spc-watch="${CSS.escape(focus)}"]`, p))?.focus({ preventScroll: true });
}
async function toggleAllow() {
  const next = !allowWatch; allowWatch = next; note = 'Saving…'; paintFriends();
  try { const r = await B.online('/spectate/settings', { allowWatch: next }); allowWatch = r.allowWatch !== false; note = allowWatch ? 'On: friends can watch your duels.' : 'Off: nobody can watch your duels.'; }
  catch (err) { allowWatch = !next; note = err?.message || 'Could not save that right now.'; }
  paintFriends();
}

/* ---------------------------------------------------------------- Friend profile */
function paintProfileButton() {
  if (B.view !== 'friendProfile') return;
  const links = $('.pfFriend .pfLinks'), name = $('[data-pf-trade]')?.dataset.pfTrade; if (!links || !name) return;
  const d = duelFor(name), old = $('.spcProfileBtn', links);
  if (old && (!d || old.dataset.spcWatch !== d.id)) old.remove();
  if (!d || $('.spcProfileBtn', links)) return;
  links.insertAdjacentHTML('afterbegin', watchButton(d, 'pfBtn gold spcProfileBtn').replace('Watch</button>', `Watch ${vsText(d)}</button>`));
  bindWatch(links);
}

/* ---------------------------------------------------------------- Watching */
function open(id) {
  if (!/^[A-Za-z0-9-]{1,64}$/.test(String(id || ''))) return;
  const d = live.find(x => x.id === id);
  watch = { id, names: d ? d.players : null, friend: d?.friends?.[0] || null, etag: null, version: -1, state: null, status: 'loading', error: '', skew: 0, ended: false };
  B.go('spectate');
  poll(true);
}
function stop() { clearTimeout(pollTimer); clearInterval(clockTimer); pollTimer = 0; clockTimer = 0; }
function leave() { stop(); watch = null; B.go('friends'); }
async function poll(now = false) {
  clearTimeout(pollTimer);
  if (!watch || B.view !== 'spectate') return stop();
  const w = watch;
  if (!now && document.hidden) { pollTimer = setTimeout(poll, POLL_MS); return; }
  try {
    const r = await getJSON('/spectate/' + encodeURIComponent(w.id), w.etag ? { 'If-None-Match': w.etag } : {});
    if (watch !== w || B.view !== 'spectate') return;
    if (r.status === 200 && r.data?.state) {
      w.etag = r.etag; w.version = r.data.version; w.state = r.data.state; w.status = r.data.status; w.error = '';
      w.skew = (Number(r.data.serverNow) || Date.now()) - Date.now(); w.ended = !!w.state.result || r.data.status !== 'active';
      w.names = w.state.sides.map(s => s.name);
      render();
    } else if (r.status !== 304) {
      w.error = r.data?.error || 'This duel can’t be watched right now.'; w.ended = [403, 404, 409, 410].includes(r.status); w.status = 'error'; render();
    }
  } catch { if (watch === w) { w.error = 'Connection lost. Trying again…'; render(); } }
  if (watch === w && !w.ended && B.view === 'spectate') pollTimer = setTimeout(poll, POLL_MS);
}

function energies(c) {
  const list = Array.isArray(c.energies) ? c.energies : [];
  return `<div class="attachedEnergy" aria-label="Attached Merfling: ${list.length}">${list.map(e => `<i class="spcEnergy" style="--el:${ELEMENT_COLORS[e] || '#a5a9b6'}" title="${esc(e)} Merfling"></i>`).join('')}</div>`;
}
function cardBlock(c, opts = {}) {
  let html = ''; try { html = B.cardHTML(c, opts); } catch { html = `<article class="mythCard"><strong>${esc(B.meta?.(c)?.name || 'Mythling')}</strong></article>`; }
  const cond = (c.conditions || []).map(v => `<span class="spcCond" title="${esc(v)}">${COND[v] || '•'} ${esc(v)}</span>`).join('');
  return `<div class="pocketCreature">${html}${energies(c)}${cond ? `<div class="spcConds">${cond}</div>` : ''}${c.tool ? '<span class="spcCond">🛡 +20 HP</span>' : ''}</div>`;
}
function fieldHTML(s, i) {
  const p = s.sides[i], c = p.cards.find(x => x.id === p.active), setup = s.phase === 'setup';
  const turn = s.phase === 'turn' && s.turn === i, picking = s.phase === 'replace' && s.replacement === i;
  const bench = Array.from({ length: 3 }, (_, k) => {
    const b = p.cards.find(x => x.id === p.bench[k]);
    if (b) return `<div class="benchCard">${cardBlock(b, { label: 'BENCH' })}</div>`;
    if (setup && k < p.benchCount) return '<div class="benchEmpty spcFaceDown"><span>Face down</span></div>';
    return `<div class="benchEmpty"><span>${k + 1}</span></div>`;
  }).join('');
  return `<section class="pocketField spcField${turn ? ' spcTurn' : ''}" aria-label="${esc(p.name)}'s side">
    <h2><span class="spcName">${esc(p.name)}</span> <b class="spcPts" role="img" aria-label="${p.points} of 3 points">${[0, 1, 2].map(k => `<i class="${k < p.points ? 'on' : ''}" aria-hidden="true">★</i>`).join('')}</b></h2>
    <p class="spcTag">${turn ? '⚔️ Their turn' : picking ? 'Choosing a new Active…' : setup ? (p.ready ? '✓ Ready' : 'Choosing…') : '&nbsp;'}</p>
    <div class="pocketActive">${c ? cardBlock(c, { active: true }) : `<div class="emptyCard spcFaceDown"><span>${setup ? (p.ready ? 'Face down' : 'Choosing…') : 'No Active'}</span></div>`}</div>
    ${c ? `<div class="cardHP" role="img" aria-label="Health ${c.hp} of ${c.maxhp}"><i style="width:${Math.max(0, Math.min(100, c.hp / c.maxhp * 100))}%"></i></div><p class="spcHP">❤ ${c.hp}/${c.maxhp}</p>` : ''}
    <div class="pocketBench">${bench}</div>
    <p class="spcCounts"><span title="Cards in deck">🂠 Deck <b>${p.deckCount}</b></span><span title="Cards in hand (hidden)">✋ Hand <b>${p.handCount}</b></span><span title="Discard pile">🗑 Discard <b>${p.discardCount}</b></span></p>
  </section>`;
}
function headline(s) {
  if (s.result) return s.result.winner === null || s.result.winner === undefined ? 'It’s a draw!' : `${esc(s.sides[s.result.winner].name)} wins!`;
  if (s.phase === 'setup') return 'Players are choosing their starting Mythlings';
  if (s.phase === 'replace') return `${esc(s.sides[s.replacement]?.name)} is choosing a new Active`;
  return `${esc(s.sides[s.turn]?.name)}’s turn`;
}
function lastAttack(s) {
  const ev = [...(s.events || [])].reverse().find(e => e.type === 'attack') || null;
  const text = ev?.text || [...(s.log || [])].reverse().find(t => / damage$/.test(t));
  return text ? esc(text) : 'No attacks yet';
}
function clock(ms) { const secs = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0'); }
function tickClock() {
  const el = $('#spcTimer'); if (!el || !watch?.state) return;
  const s = watch.state, now = Date.now() + watch.skew;
  el.textContent = s.result ? '–' : clock((s.phase === 'setup' ? s.setupDeadline : s.turnDeadline) - now);
}
function render() {
  if (B.view !== 'spectate') return;
  const w = watch;
  if (!w) return B.go('friends');
  const title = w.names ? w.names.map(esc).join(' vs ') : 'a friend’s duel';
  const banner = `<div class="spcBanner" role="region" aria-label="Spectator mode"><span class="spcEye${w.ended ? ' off' : ''}" aria-hidden="true">${w.status === 'error' ? 'CLOSED' : w.ended ? 'ENDED' : '● LIVE'}</span><h1>Watching ${title}</h1><button type="button" class="button alt spcLeave" id="spcLeave">Leave</button></div>`;
  let body;
  if (!w.state) body = `<section class="panel spcMsg"><p role="status">${esc(w.error || 'Joining as a watcher…')}</p>${w.ended ? '<button type="button" class="button" data-go="friends">Back to Friends</button>' : ''}</section>`;
  else {
    const s = w.state, left = Math.max(0, s.sides.findIndex(p => p.name === w.friend)), right = 1 - left;
    body = `${w.error ? `<p class="spcWarn" role="status">${esc(w.error)}</p>` : ''}
    <div class="spcBar"><strong>${s.sides.map(p => `${esc(p.name)} <b>${p.points}</b>`).join(' : ')}</strong><small>First to 3 · Turn ${s.turnNumber || 0}/30</small><span class="spcClock">Turn timer <time id="spcTimer">–</time></span></div>
    <p class="spcHeadline${s.result ? ' done' : ''}" role="status" aria-live="polite">${headline(s)}${s.result?.reason ? `<small>${esc(s.result.reason)}</small>` : ''}</p><p class="spcLastLine"><b>Last attack:</b> ${lastAttack(s)}</p>
    <div class="pocketBoard spcBoard">${fieldHTML(s, left)}<aside class="spcMid"><h2>Last attack</h2><p class="spcLast">${lastAttack(s)}</p><h2>Battle log</h2><ol class="spcLog">${(s.log || []).slice(-5).reverse().map(t => `<li>${esc(t)}</li>`).join('')}</ol><p class="spcHint">You’re watching. Hands and decks stay hidden.</p></aside>${fieldHTML(s, right)}</div>`;
  }
  B.render(`<section class="spcArena" data-spc-left="${w.state ? Math.max(0, w.state.sides.findIndex(p => p.name === w.friend)) : 0}">${banner}${body}</section>`);
  $('#spcLeave').onclick = leave;
  clearInterval(clockTimer); if (w.state && !w.ended) { tickClock(); clockTimer = setInterval(() => { if (B.view !== 'spectate') return stop(); tickClock(); }, 500); } else tickClock();
  // Same shape as ember:cardBattle (match + the side drawn on the left), on its own event so stats, highlights
  // and quest-only modules never mistake a watched duel for one of the player's own battles.
  if (w.state) { const left = Number($('.spcArena').dataset.spcLeft) || 0; try { dispatchEvent(new CustomEvent('ember:spectateBattle', { detail: { match: w.state, side: left, spectate: true } })); } catch { /* ignore */ } }
}

/* ---------------------------------------------------------------- Styles */
function injectCSS() {
  if ($('#spcCSS')) return;
  const st = document.createElement('style'); st.id = 'spcCSS';
  st.textContent = `
.spcArena{max-width:1180px;margin:0 auto;padding:0 0 24px;box-sizing:border-box;min-width:0;color:#efe6d2}
.spcArena *{box-sizing:border-box}
.spcBanner{position:sticky;top:0;z-index:12;display:flex;align-items:center;gap:12px;padding:10px 14px;margin:6px 0 10px;border-radius:14px;background:linear-gradient(90deg,#2a1d3f,#1a2742);border:1px solid #b99cff66;box-shadow:0 6px 18px #0005}
.spcBanner h1{flex:1;min-width:0;margin:0;font-size:22px;line-height:1.2;overflow-wrap:anywhere}
.spcEye{flex:none;padding:4px 10px;border-radius:99px;background:#d8394a;color:#fff;font:800 12px system-ui,sans-serif;letter-spacing:.06em;animation:spcPulse 1.6s ease-in-out infinite}
.spcEye.off{background:#6b6478;animation:none}
@keyframes spcPulse{50%{opacity:.6}}
.spcLeave{flex:none;min-height:40px}
.spcBar{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 18px;padding:8px 12px;border-radius:10px;background:#152039;text-align:center}
.spcBar strong{font-size:18px}.spcBar b{color:#ffd36c}.spcBar small,.spcClock{font-size:13px;color:#c8d1ec}
.spcClock time{font-weight:800;color:#fff}
.spcHeadline{margin:12px 0;text-align:center;font-size:20px;font-weight:800}
.spcHeadline small{display:block;font-size:13px;font-weight:600;color:#c8d1ec}
.spcHeadline.done{font-size:26px;color:#ffd36c}
.spcBoard{display:grid;grid-template-columns:minmax(0,1fr) minmax(170px,.7fr) minmax(0,1fr);gap:16px;align-items:start}
.spcField{padding:10px;border-radius:14px;background:#0f182b99;border:1px solid #33445f;transition:box-shadow .3s,border-color .3s}
.spcField.spcTurn{border-color:#ffc35a;box-shadow:0 0 0 2px #ffc35a55,0 0 22px #ffb04a33}
.spcField h2{display:flex;align-items:center;justify-content:center;gap:8px;margin:0;font-size:17px;min-width:0}
.spcName{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.spcPts{display:inline-flex;gap:2px;flex:none;font-size:16px}.spcPts i{font-style:normal;color:#ffffff30}.spcPts i.on{color:#ffd36c;text-shadow:0 0 8px #ffb04a99}
.spcTag{margin:2px 0 8px;font-size:12px;color:#ffd9a0;min-height:1.2em}
.spcField .pocketActive .mythCard{max-width:200px;margin:0 auto}
.spcField .cardHP{max-width:200px;margin:6px auto 0}
.spcField .benchCard .mythCard{max-width:112px;margin:0 auto}
.spcField .pocketBench{align-items:start}
.spcField .benchEmpty{min-height:120px}
.spcLastLine{display:none;margin:-4px 0 10px;text-align:center;font-size:14px}
.spcHP{margin:3px 0 0;font-size:13px;font-weight:700}
.spcFaceDown{display:grid;place-items:center;min-height:120px;border-radius:10px;border:1px dashed #6d7ea0;background:repeating-linear-gradient(45deg,#1c2945,#1c2945 8px,#22325a 8px,#22325a 16px);color:#c8d1ec;font-size:12px}
.spcField .emptyCard.spcFaceDown{min-height:240px;max-width:220px;margin:0 auto}
.spcCounts{display:flex;justify-content:center;flex-wrap:wrap;gap:4px 12px;margin:10px 0 0;font-size:12px;color:#c8d1ec}
.spcCounts b{color:#fff}
.spcEnergy{display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--el);border:1px solid #fff8;box-shadow:0 0 6px var(--el)}
.spcConds{display:flex;flex-wrap:wrap;justify-content:center;gap:3px}
.spcCond{display:inline-block;font-size:11px;padding:1px 6px;border-radius:9px;background:#2b2140;border:1px solid #8c74c8}
.spcMid{padding:12px;border-radius:14px;background:#141d33;border:1px solid #33445f;min-width:0}
.spcMid h2{margin:0 0 6px;font-size:14px;color:#ffd9a0}
.spcLast{margin:0 0 14px;font-size:15px;font-weight:700;overflow-wrap:anywhere}
.spcLog{margin:0;padding-left:18px;font-size:12px;color:#d6dcf0;display:grid;gap:4px;overflow-wrap:anywhere}
.spcHint{margin:14px 0 0;font-size:12px;color:#9aa9c4}
.spcWarn{margin:8px 0;text-align:center;color:#ffb3a8}
.spcMsg{text-align:center;padding:24px}
.spcPanel{max-width:1180px;margin:18px auto;width:calc(100% - 24px);box-sizing:border-box;min-width:0;color:var(--ui-text,#efe6d2)}
.spcPanel *{box-sizing:border-box}
.spcHead h2{margin:0 0 10px;font-size:24px}
.spcList{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.spcList li{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:#0002;border:1px solid #ffffff1a;min-width:0}
.spcLive{flex:none;padding:2px 8px;border-radius:99px;background:#d8394a;color:#fff;font:800 11px system-ui,sans-serif;letter-spacing:.06em}
.spcWho{flex:1;min-width:0;display:flex;flex-direction:column}
.spcWho b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.spcWho small{font-size:12px;opacity:.8}
.spcEmpty{margin:4px 0;opacity:.85}
.spcWatchBtn{flex:none;min-height:36px;padding:4px 14px;border-radius:99px;border:1px solid #b99cff;background:linear-gradient(#6f4fc4,#47308c);color:#fff;font:800 14px system-ui,sans-serif;cursor:pointer}
.spcWatchBtn:hover,.spcWatchBtn:focus-visible{filter:brightness(1.15)}
.friendActions .spcRowBtn,.uiXFTRowWho .spcRowBtn{min-height:32px;margin:2px 4px}
.spcSetting{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-top:12px;padding-top:10px;border-top:1px solid #ffffff1a}
.spcSetting>span{font-weight:700}
.spcSwitch{position:relative;min-width:76px;min-height:40px;padding:0 12px 0 36px;border-radius:99px;border:1px solid #e9b75a88;background:#3a2c18;color:#f2e8d6;font:800 14px system-ui,sans-serif;cursor:pointer;text-align:left}
.spcSwitch::before{content:"";position:absolute;left:6px;top:50%;width:24px;height:24px;margin-top:-12px;border-radius:50%;background:#8a7a64;transition:background .2s}
.spcSwitch[aria-checked="true"]{background:linear-gradient(#5fbf6a,#2f8a3d);border-color:#9fe3a8}
.spcSwitch[aria-checked="true"]::before{background:#fff}
.spcNote{flex-basis:100%;font-size:12px;opacity:.8}
@media (pointer:coarse){.spcWatchBtn,.friendActions .spcRowBtn,.uiXFTRowWho .spcRowBtn{min-height:44px}.spcSwitch{min-height:44px}}
@media (max-width:800px){
 .spcBoard{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}
 .spcBoard>.spcMid{grid-column:1/-1;grid-row:2}
 .spcLastLine{display:block}
 .spcMid .spcLast,.spcMid h2:first-child{display:none}
 .spcField .benchEmpty{min-height:90px}
 .spcField{padding:6px}
 .spcField .pocketActive .mythCard,.spcField .cardHP{max-width:180px}
 .spcField .emptyCard.spcFaceDown{min-height:190px}
 .spcBanner h1{font-size:17px}
}
@media (max-width:560px){
 .spcArena{padding-bottom:16px}
 .spcBanner{gap:8px;padding:8px 10px}.spcBanner h1{font-size:15px}
 .spcBar strong{font-size:15px}
 .spcHeadline{font-size:16px}.spcHeadline.done{font-size:20px}
 .spcField h2{font-size:13px;gap:4px}
 .spcField .emptyCard.spcFaceDown{min-height:150px}
 .spcFaceDown{min-height:70px}
 .spcField .benchEmpty{min-height:64px}
 .spcPts{font-size:12px}
 .spcCounts{gap:2px 8px;font-size:11px}
 .spcPanel{width:100%;margin:14px 0 20px;padding:14px 12px}
 .spcList li{flex-wrap:wrap}.spcWho{flex-basis:calc(100% - 70px)}
}
@media (prefers-reduced-motion:reduce){.spcEye{animation:none}}`;
  document.head.append(st);
}

/* ---------------------------------------------------------------- Wiring */
if (B) {
  injectCSS();
  B.registerView('spectate', render);
  addEventListener('ember:friends', () => { if (B.view !== 'friends') return; paintFriends(); refreshLive(); });
  addEventListener('ember:frame', e => {
    const v = e.detail?.view;
    if (v !== 'spectate') stop();
    if (v === 'friendProfile') { requestAnimationFrame(paintProfileButton); refreshLive(); }
  });
  window.EmberSpectate = { open, leave, refresh: () => refreshLive(true), live: () => live.slice(), allowWatch: () => allowWatch, watching: () => watch && { id: watch.id, version: watch.version, state: watch.state } };
}
