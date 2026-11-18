// EMBERLINGS pack replays: watch your last 10 pack openings again, card by card.
// A replay is only a picture of what the pack screen already showed. It NEVER gives cards, never changes coins
// and never touches a pending pack. This file does not call revealPack, revealAllPack, startPackRoll,
// purchasePack, openRewardPack or economyTransaction, and it does not dispatch ember:packReveal or
// ember:packSummary. It listens to the game's own packSummary event and draws its own staged reveal.
// Save data (additive; missing means empty): state.ember.packReplays = { list: [...] }
//   entry = { at, packId, cards: [{ kind, rarity, level, shiny, secret, mutation } x5] }
//   Newest first, at most REPLAY_CAP entries. Compact on purpose, so the whole store stays under SIZE_BUDGET.
import { RARITIES, MUTATIONS } from './combat-rules.js';

export const REPLAY_CAP = 10;
export const CARDS_PER_PACK = 5;
export const SIZE_BUDGET = 8192;

/* ------------------------------------------------------------ Recording (pure, also used by tests/pack-replays.mjs) */
// The six things the pack screen showed about a card. No ids, no source, no xp, no battle fields.
export function compactCard(c) {
  if (!c || !Number.isInteger(c.kind) || c.kind < 0 || c.kind > 15) return null;
  const rarity = RARITIES.find(r => r.toLowerCase() === String(c.rarity || '').toLowerCase()) || 'Common';
  const level = Math.max(1, Math.min(100, Math.round(Number(c.level) || 1)));
  const mutation = c.mutation && MUTATIONS.some(m => m.id === c.mutation) ? c.mutation : null;
  return { kind: c.kind, rarity, level, shiny: !!c.shiny, secret: !!c.secret, mutation };
}

// One recorded opening from the game's packSummary detail ({ creatures: [...] }), or null when it is not a pack.
export function openingEntry(detail, now = Date.now()) {
  const list = Array.isArray(detail?.creatures) ? detail.creatures : Array.isArray(detail) ? detail : null;
  if (!list || list.length < CARDS_PER_PACK) return null;
  const cards = list.slice(0, CARDS_PER_PACK).map(compactCard);
  if (cards.length !== CARDS_PER_PACK || cards.some(c => !c)) return null;
  const packId = String(list[0]?.sourcePack || detail?.packId || '').slice(0, 24) || 'pack';
  return { at: Math.max(0, Math.round(Number(now) || 0)), packId, cards };
}

// Creates the save block when missing and repairs a broken list. Never clears existing entries.
export function ensureReplays(st) {
  if (!st || typeof st !== 'object') return { list: [] };
  if (!st.ember || typeof st.ember !== 'object') st.ember = {};
  let r = st.ember.packReplays;
  if (!r || typeof r !== 'object') r = st.ember.packReplays = {};
  if (!Array.isArray(r.list)) r.list = [];
  return r;
}

// Adds one opening at the top and drops the oldest beyond the cap. Only st.ember.packReplays is written.
export function recordOpening(st, detail, now = Date.now()) {
  const entry = openingEntry(detail, now);
  if (!entry) return null;
  const r = ensureReplays(st);
  r.list = [entry, ...r.list].slice(0, REPLAY_CAP);
  return entry;
}

// A stored entry is usable when it still has five compact snapshots.
export const validEntry = e => !!e && Array.isArray(e.cards) && e.cards.length === CARDS_PER_PACK && e.cards.every(c => c && Number.isInteger(c.kind));
export const replaysSize = st => JSON.stringify(st?.ember?.packReplays || {}).length;

/* ------------------------------------------------------------ Player (pure state machine, also used by the tests) */
export const playerStart = n => ({ n: Math.max(0, Math.floor(Number(n) || 0)), step: 0 });
const at = (p, step) => ({ n: p.n, step: Math.max(0, Math.min(p.n, step)) });
export const playerNext = p => at(p, p.step + 1);   // turn over exactly the next card
export const playerAll = p => at(p, p.n);           // reveal the rest: the summary state
export const playerBack = p => playerStart(p.n);    // leaving keeps nothing, so a replay starts face down again
export const playerView = p => ({ step: p.step, total: p.n, revealed: p.step, remaining: p.n - p.step, atSummary: p.step >= p.n });

/* ------------------------------------------------------------ Browser side */
const B = globalThis.window?.EmberBridge;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const calm = () => !!B?.state?.reducedMotion || document.documentElement.dataset.fx === 'off'
  || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
const persist = () => { try { B.save(); } catch { /* the game shows its own save error */ } };
// Read-only view of the store: opening the page never writes an empty block into the save.
const readList = () => { const r = B?.state?.ember?.packReplays; return r && Array.isArray(r.list) ? r.list : []; };
const catalog = () => { try { return B.packCatalog() || []; } catch { return []; } };
const dateText = ms => { try { return new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };
const packOf = id => catalog().find(p => p.id === id) || null;

let pick = -1;       // which stored opening is open (-1 = the list)
let player = null;   // player state for the opening being watched

/* ------------------------------------------------------------ List */
function listHTML(list) {
  if (!list.length) return `<div class="prEmpty"><p>Open a pack and its opening is saved here to watch again.</p>
    <button type="button" class="button gold" data-pr-packs>🎁 Open a pack</button></div>`;
  const rows = list.map((e, i) => {
    const p = packOf(e.packId);
    return `<li class="prItem"><div class="prItemText"><b>${esc(p ? p.icon + ' ' + p.name : 'Mythling pack')}</b>
      <small>${esc(dateText(e.at))} · ${e.cards.length} cards</small></div>
      <button type="button" class="button gold" data-pr-watch="${i}" aria-label="${esc('Watch the ' + (p ? p.name : 'pack') + ' opening from ' + dateText(e.at))}">Watch</button></li>`;
  }).join('');
  return `<ol class="prList">${rows}</ol><p class="prNote">Saved on this device. The newest opening is first.</p>`;
}

function paintList() {
  const list = readList().filter(validEntry);
  B.render(`<button class="back prBackBtn" data-go="home">‹ Home</button>
   <section class="prPage${calm() ? ' prCalm' : ''}" aria-labelledby="prTitle">
    <header class="prHead"><h1 id="prTitle">🎬 Pack replays</h1>
     <p>Watch your last ${REPLAY_CAP} pack openings again, card by card. A replay only shows what the pack screen already showed: it never gives cards, coins or packs.</p></header>
    ${listHTML(list)}
    <p class="prFoot"><button type="button" class="button" data-pr-stats>📈 My Stats</button></p>
   </section>`);
  const page = $('#app .prPage'); if (!page) return;
  page.addEventListener('click', e => {
    try {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.prPacks != null) return B.go('packs');
      if (b.dataset.prStats != null) return B.go('stats');
      if (b.dataset.prWatch != null) return openIndex(Number(b.dataset.prWatch));
    } catch (err) { console.warn('pack-replays', err); }
  });
  B.bind?.();
}

/* ------------------------------------------------------------ Staged reveal (our own markup, never the game's) */
function cardFace(snap) {
  try { return B.cardHTML(snap); } catch (err) { console.warn('pack-replays', err); }
  try { return `<span class="mythlingPortrait">${B.art(snap)}</span>`; } catch { return ''; }
}

function pileHTML(remaining) {
  if (!remaining) return `<div class="prPileDone" aria-hidden="true">✦</div><p class="prHint">Every card is showing.</p>`;
  const backs = Array.from({ length: Math.min(3, remaining) }, () => '<i class="prBack" aria-hidden="true"></i>').join('');
  return `<button type="button" class="prPile" id="prPile" aria-label="${esc('Turn over the next card, ' + remaining + ' left')}">${backs}</button>
    <p class="prHint">Tap the pack to turn over the next card.</p>`;
}

function paintPlayer(entry, focusSel) {
  const cards = entry.cards, p = player || playerStart(cards.length), v = playerView(p);
  const pInfo = packOf(entry.packId);
  const revealed = cards.slice(0, v.step).map((c, i) => `<li class="prSlot${i === v.step - 1 ? ' prFlipNew' : ''}">${cardFace(c)}</li>`).join('');
  const status = v.atSummary ? `That's the whole pack: ${v.total} cards, exactly as you pulled them.`
    : v.step ? `Card ${v.step} of ${v.total} showing.` : 'Five cards, face down. Turn over the first one.';
  const controls = v.atSummary
    ? `<button type="button" class="button gold" data-pr-again>Watch again</button><button type="button" class="button alt" data-pr-back>Back</button>`
    : `<button type="button" class="button gold" data-pr-next>Next card</button><button type="button" class="button" data-pr-all>Reveal all</button><button type="button" class="button alt" data-pr-back>Back</button>`;
  B.render(`<button type="button" class="back prBackBtn" id="prListBack">‹ Pack replays</button>
   <section class="prPage prPlayer${calm() ? ' prCalm' : ''}" aria-labelledby="prTitle">
    <header class="prHead"><p class="prKick">Replay</p><h1 id="prTitle">${esc((pInfo?.icon ? pInfo.icon + ' ' : '🎁 ') + (pInfo?.name || 'Mythling pack'))}</h1>
     <p>${esc(dateText(entry.at))} · ${cards.length} cards · Watching changes nothing: no cards, coins or packs are given.</p></header>
    <div class="prStage">
     <div class="prPileCol">${pileHTML(v.remaining)}</div>
     <ul class="prRow" aria-label="Cards revealed so far">${revealed || '<li class="prSlot prSlotEmpty">Nothing turned over yet.</li>'}</ul>
    </div>
    <p class="prStatus" role="status" aria-live="polite">${esc(status)}</p>
    <div class="prControls">${controls}</div>
   </section>`);
  bindPlayer(entry);
  $('#prListBack')?.addEventListener('click', () => { try { pick = -1; player = null; paintList(); } catch (err) { console.warn('pack-replays', err); } });
  if (focusSel) { try { $(focusSel)?.focus({ preventScroll: true }); } catch { /* focus is a nicety */ } }
}

function bindPlayer(entry) {
  const page = $('#app .prPage'); if (!page) return;
  const show = (next, focusSel) => { try { player = next; paintPlayer(entry, focusSel); } catch (err) { console.warn('pack-replays', err); } };
  const stepOnce = () => {
    const p = player || playerStart(entry.cards.length);
    if (p.step >= p.n) return;
    const next = playerNext(p);
    show(next, next.step >= next.n ? '[data-pr-again]' : '[data-pr-next]');
  };
  page.addEventListener('click', e => {
    try {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'prPile' || b.dataset.prNext != null) return stepOnce();
      if (b.dataset.prAll != null) return show(playerAll(player || playerStart(entry.cards.length)), '[data-pr-again]');
      if (b.dataset.prAgain != null) return show(playerStart(entry.cards.length), '[data-pr-next]');
      if (b.dataset.prBack != null) { pick = -1; player = null; return paintList(); }
    } catch (err) { console.warn('pack-replays', err); }
  });
  B.bind?.();
}

/* ------------------------------------------------------------ View */
export function render() {
  try {
    const list = readList().filter(validEntry);
    if (pick >= 0 && list[pick]) { player = player || playerStart(list[pick].cards.length); paintPlayer(list[pick]); }
    else { pick = -1; player = null; paintList(); }
  } catch (err) { console.warn('pack-replays', err); }
}

function openIndex(i) {
  const list = readList().filter(validEntry);
  if (!(i >= 0 && i < list.length)) return false;
  pick = i; player = playerStart(list[i].cards.length);
  try { B.go('packReplays'); } catch (err) { console.warn('pack-replays', err); }
  return true;
}
function openList() { pick = -1; player = null; try { B.go('packReplays'); } catch (err) { console.warn('pack-replays', err); } }
function openNewest() {
  const opened = openIndex(0);
  if (!opened) { try { B.toast('This opening was not saved.'); } catch { /* a toast is a nicety */ } }
  return opened;
}

/* ------------------------------------------------------------ Entry points */
// "Watch this opening again" on the pack summary. Only in the finished summary (all five cards shown),
// never on the one-by-one reveal screen, so it can't interfere with the game's own reveal.
function summaryReady() {
  if (B.view !== 'packSummary') return false;
  const res = $('#app .packResults'); if (!res) return false;
  return res.querySelectorAll('.revealResult').length === CARDS_PER_PACK;
}
function injectSummary() {
  if (!summaryReady()) return;
  const res = $('#app .packResults'); if (!res) return;
  let wrap = $('#app .prWatch');
  if (!wrap) {
    wrap = document.createElement('p'); wrap.className = 'prWatch center';
    wrap.innerHTML = '<button type="button" class="button" id="prWatchBtn">🎬 Watch this opening again</button>';
    res.after(wrap);
    $('#prWatchBtn')?.addEventListener('click', () => { try { openNewest(); } catch (err) { console.warn('pack-replays', err); } });
  }
}
function addStatsRow() {
  if (B.view !== 'stats') return;
  const head = $('#app .stHead'); if (!head || $('#app .prStats')) return;
  const box = document.createElement('section'); box.className = 'prStats'; box.setAttribute('aria-label', 'Pack replays');
  box.innerHTML = `<p><span aria-hidden="true">🎬</span> <b>Pack replays</b> <small>Watch your last ${REPLAY_CAP} pack openings again, card by card.</small></p>
   <div><button type="button" class="button">Open pack replays</button></div>`;
  head.after(box);
  box.querySelector('button')?.addEventListener('click', () => { try { openList(); } catch (err) { console.warn('pack-replays', err); } });
}

function onSummary(e) {
  try {
    const entry = recordOpening(B.state, e.detail || {});
    if (!entry) { $('#app .prWatch')?.remove(); return; }
    persist();
    injectSummary();
  } catch (err) { console.warn('pack-replays', err); }
}

/* ------------------------------------------------------------ Styles */
function styles() {
  if ($('#prStyle')) return;
  const s = document.createElement('style'); s.id = 'prStyle';
  s.textContent = `
/* Pack replays (public/pack-replays.js) */
.prPage{max-width:1120px;margin:0 auto 28px;color:var(--ui-text,#efe6d2);overflow-wrap:anywhere}
.prBackBtn{min-height:44px;display:inline-flex;align-items:center}
.prHead{padding:18px 22px;border:1px solid var(--ui-goldline,#7a5a2a);border-radius:10px;background:radial-gradient(ellipse at 80% 0,#2a2a3c,transparent 60%),linear-gradient(180deg,#151c27,#0e131b);box-shadow:inset 0 0 0 1px #0009,0 12px 30px #0008}
.prHead h1{margin:2px 0 6px;font-size:clamp(26px,4vw,38px)}
.prHead p{margin:0;font-size:15px;line-height:1.45;color:var(--ui-muted,#b9ae98)}
.prKick{margin:0 0 2px!important;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--ui-gold,#e9b75a)}
.prList{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:10px}
.prItem{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:space-between;padding:12px 16px;border:1px solid #3c3220;border-radius:10px;background:linear-gradient(180deg,#151c27,#0e131b)}
.prItemText{display:grid;gap:2px;min-width:0}
.prItemText b{font-size:17px;line-height:1.25;color:#ffe2a0}
.prItemText small{font-size:13px;line-height:1.3;color:var(--ui-muted,#b9ae98)}
.prItem .button{min-height:44px;min-width:104px}
.prEmpty{padding:24px 20px;border:1px dashed var(--ui-goldline,#7a5a2a);border-radius:10px;background:#0d1219;text-align:center}
.prEmpty p{margin:0 auto 14px;max-width:560px;font-size:15px;line-height:1.45;color:#d6cbb4}
.prEmpty .button{min-height:44px}
.prNote{margin:12px 2px 0;font-size:13px;color:var(--ui-muted,#b9ae98)}
.prFoot{display:flex;justify-content:center;margin:18px 0 0}
.prFoot .button{min-height:44px}
.prStage{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px 22px;align-items:start;margin-top:14px;padding:16px;border:1px solid var(--ui-goldline,#7a5a2a);border-radius:10px;background:linear-gradient(180deg,#131a25,#0c1118)}
.prPileCol{display:grid;justify-items:center;gap:8px;min-width:140px}
.prPile{position:relative;width:140px;height:196px;padding:0;border:0;background:none;cursor:pointer;touch-action:manipulation}
.prPile:focus-visible{outline:3px solid #ffd77a;outline-offset:4px;border-radius:10px}
.prBack{position:absolute;left:50%;top:0;display:block;width:126px;aspect-ratio:63/88;margin-left:-63px;border-radius:9px;border:3px solid #c9aa68;background:linear-gradient(150deg,#3b2d64,#171a3a 55%,#2b2350);box-shadow:0 6px 16px #0009}
.prBack::before{content:"✦";position:absolute;inset:0;display:grid;place-items:center;font-size:38px;color:#ffe2a0cc}
.prBack:nth-child(2){transform:translate(4px,5px) rotate(1.2deg)}
.prBack:nth-child(3){transform:translate(-4px,10px) rotate(-1deg)}
.prPile:hover .prBack,.prPile:focus-visible .prBack{border-color:#ffe29a}
.prPileDone{display:grid;place-items:center;width:140px;height:196px;border-radius:9px;border:3px dashed #7a5a2a;color:#ffe2a0;font-size:44px}
.prHint{margin:0;max-width:180px;text-align:center;font-size:13px;line-height:1.35;color:var(--ui-muted,#b9ae98)}
.prRow{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;min-width:0;perspective:1200px}
.prSlot{min-width:0;display:grid;place-items:start center}
.prSlot .mythCard{width:100%;max-width:210px;margin:0}
.prSlotEmpty{place-items:center;min-height:120px;border:1px dashed #3c3220;border-radius:10px;font-size:14px;color:var(--ui-muted,#b9ae98);text-align:center;padding:12px}
.prFlipNew{animation:prFlip .55s cubic-bezier(.2,.8,.3,1) both;transform-origin:left center}
@keyframes prFlip{from{opacity:0;transform:rotateY(-88deg) scale(.96)}to{opacity:1;transform:none}}
html[data-fx=light] .prFlipNew{animation:prFade .3s ease-out both}
@keyframes prFade{from{opacity:0}}
html[data-fx=off] .prFlipNew{animation:none!important}
.prPlayer.prCalm .prFlipNew{animation:none!important}
.prStatus{margin:14px 0 0;font-size:15px;line-height:1.4;text-align:center;color:#dfe5f6}
.prControls{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:14px}
.prControls .button{min-height:44px;min-width:132px}
.prWatch{margin:14px auto 0}
.prWatch .button{min-height:44px}
.prStats{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:space-between;margin:12px 0 0;padding:12px 16px;border:1px solid var(--ui-goldline,#7a5a2a);border-radius:10px;background:linear-gradient(180deg,#151c27,#0e131b)}
.prStats p{margin:0;min-width:0;font-size:16px}
.prStats b{color:#ffe2a0}
.prStats small{display:block;color:var(--ui-muted,#b9ae98);font-size:13px}
.prStats .button{min-height:44px}
@media(prefers-reduced-motion:reduce){.prFlipNew{animation:none!important}}
@media(max-width:720px){.prStage{grid-template-columns:minmax(0,1fr)}.prPileCol{justify-items:center}
 .prRow{grid-template-columns:repeat(auto-fit,minmax(128px,1fr))}.prHead{padding:14px 16px}
 .prItem{padding:12px}.prItem .button{flex:1}.prStats{padding:12px}.prStats div{width:100%}.prStats .button{width:100%}}
`;
  document.head.append(s);
}

if (B) {
  try { styles(); } catch (err) { console.warn('pack-replays', err); }
  try { B.registerView('packReplays', render); } catch (err) { console.warn('pack-replays', err); }
  addEventListener('ember:packSummary', onSummary);
  addEventListener('ember:frame', () => {
    try { injectSummary(); addStatsRow(); } catch (err) { console.warn('pack-replays', err); }
  });
  window.EmberPackReplays = Object.freeze({ open: openList, openNewest, list: () => readList().slice() });
}
