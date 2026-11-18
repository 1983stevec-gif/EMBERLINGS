// EMBERLINGS duel emotes: eight preset reactions (no typing, ever) for online friend duels. Players get a small
// 😊 button on the battle board; friends watching a duel see the same bubbles. The server keeps the one true list
// (lib/card-api.mjs DUEL_EMOTES), accepts preset ids only, rate-limits them and returns the last few with every
// battle view; lib/spectate-api.mjs passes the same short list to watchers. Watchers can never send one.
// A "Hide emotes" switch mutes incoming bubbles only; sending stays available. Saved additively as
// state.ember.duelEmotes = { muted: false } and nothing else in the save is touched. Talks to the game only
// through window.EmberBridge, ember:* events and the page. No sound is ever played here.
export const CLIENT_EMOTES = Object.freeze([
  { id: 'hello', label: '👋 Hello!' },
  { id: 'gl', label: '🍀 Good luck!' },
  { id: 'nice', label: '🔥 Nice!' },
  { id: 'wow', label: '😮 Wow!' },
  { id: 'oof', label: '😅 Oof' },
  { id: 'gg', label: '🤝 Good game!' },
  { id: 'thanks', label: '🙏 Thanks!' },
  { id: 'hooray', label: '🎉 Hooray!' }
]);

const hasWindow = typeof window !== 'undefined';
const B = hasWindow ? window.EmberBridge : null;
const $ = (s, r = document) => r.querySelector(s);
const POLL_MS = 4000;      // a quiet check for the other player's reactions
const BUBBLE_MS = 3500;    // how long one bubble stays on the board

let names = [];            // the two battle sides, from ember:cardBattle / ember:spectateBattle
let seen = [], seenSet = new Set(), lastAt = 0, primed = false;
let pollTimer = 0, pollKey = '', pollBusy = false;
let pop = null, openBtn = null;

/* ---------------------------------------------------------------- Save choice */
const muted = () => !!(B?.state?.ember?.duelEmotes?.muted);
function setMuted(next) {
  try {
    const st = B.state;
    if (!st.ember || typeof st.ember !== 'object') st.ember = {};
    const cur = st.ember.duelEmotes && typeof st.ember.duelEmotes === 'object' && !Array.isArray(st.ember.duelEmotes) ? st.ember.duelEmotes : {};
    st.ember.duelEmotes = { ...cur, muted: !!next };
    B.save();
    return !!next;
  } catch (err) { console.warn('duel-emotes', err); return muted(); }
}

/* ---------------------------------------------------------------- Which duel */
function onlineId() {
  const id = B?.state?.cardOnlineId;
  return typeof id === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(id) ? id : '';
}
function watchingId() {
  try { const w = window.EmberSpectate?.watching?.(); return typeof w?.id === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(w.id) ? w.id : ''; }
  catch { return ''; }
}
const onlineView = () => !!onlineId() && B?.view === 'cardBattle';

/* ---------------------------------------------------------------- Bubbles */
function layer() {
  let el = $('#deLayer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'deLayer'; el.className = 'deLayer';
    el.setAttribute('aria-live', 'polite'); el.setAttribute('aria-atomic', 'false');
    document.body.append(el);
  }
  return el;
}
function labelOf(id) { try { return CLIENT_EMOTES.find(e => e.id === id)?.label || ''; } catch { return ''; } }
function clearBubbles() { try { $('#deLayer')?.remove(); } catch (err) { console.warn('duel-emotes', err); } }
function showBubbles(list) {
  if (!list.length || muted()) return; // muted hides incoming bubbles only
  const host = layer();
  for (const e of list) {
    const label = labelOf(e.id);
    if (!label) continue;
    const who = names[e.side] || '';
    const p = document.createElement('p');
    p.className = 'deBubble';
    p.textContent = who ? who + ' ' + label : label;
    host.append(p);
    setTimeout(() => { try { p.remove(); } catch (err) { console.warn('duel-emotes', err); } }, BUBBLE_MS);
  }
}
function noteMatch(match) {
  try {
    const list = (match?.sides || []).map(s => String(s?.name || ''));
    if (list.length === 2 && list.some(Boolean)) names = list;
  } catch (err) { console.warn('duel-emotes', err); }
}
function reset() {
  names = []; seen = []; seenSet = new Set(); lastAt = 0; primed = false;
}
// New entries only: the first reply of a duel just notes where we are, so opening a battle never replays old emotes.
function fresh(list) {
  const out = [];
  if (!Array.isArray(list)) return out;
  let newest = lastAt;
  for (const e of list) {
    if (!e || typeof e.at !== 'number' || typeof e.id !== 'string') continue;
    const key = e.at + '|' + e.side + '|' + e.id;
    if (seenSet.has(key)) continue;
    seenSet.add(key); seen.push(key);
    if (e.at > newest) newest = e.at;
    if (!primed || e.at <= lastAt) continue;
    out.push(e);
  }
  while (seen.length > 60) seenSet.delete(seen.shift());
  if (!primed) { primed = true; lastAt = newest; } else if (newest > lastAt) lastAt = newest;
  return out;
}

/* ---------------------------------------------------------------- Polling (never while the tab is hidden) */
function stopPoll() { clearTimeout(pollTimer); pollTimer = 0; pollKey = ''; pollBusy = false; }
function target() {
  try {
    if (!B) return null;
    const id = onlineId();
    if (B.view === 'cardBattle' && id) return { key: 'duel:' + id, path: '/cards/' + id };
    const watch = watchingId();
    if (B.view === 'spectate' && watch) return { key: 'watch:' + watch, path: '/spectate/' + watch };
  } catch (err) { console.warn('duel-emotes', err); }
  return null;
}
function schedule(t, delay) { clearTimeout(pollTimer); pollTimer = setTimeout(() => poll(t), delay); }
async function poll(t) {
  pollTimer = 0;
  if (t.key !== pollKey || pollBusy) return;
  if (document.hidden) { schedule(t, POLL_MS); return; }
  pollBusy = true;
  try {
    const reply = await B.online(t.path);
    if (t.key !== pollKey) return;
    noteMatch(reply?.state);
    const list = fresh(reply?.emotes); // the game's own poll reports connection trouble; stay quiet here
    if (list.length) showBubbles(list);
  } catch { /* ignore: the battle screen already shows its own reconnecting note */ }
  finally {
    pollBusy = false;
    if (t.key === pollKey) schedule(t, POLL_MS);
  }
}
function sync() {
  const t = target();
  if (!t) { if (pollKey) { stopPoll(); reset(); clearBubbles(); } return; }
  if (t.key === pollKey) return;
  stopPoll(); reset(); pollKey = t.key; schedule(t, 1200);
}

/* ---------------------------------------------------------------- Sending */
async function send(id) {
  const matchId = onlineId();
  if (!matchId || !CLIENT_EMOTES.some(e => e.id === id)) return;
  closePop();
  try {
    const reply = await B.online('/cards/' + matchId + '/emote', { id });
    // The reply carries the newest emotes, so your own bubble shows right away instead of waiting for the poll.
    if (reply) { noteMatch(reply.state); const list = fresh(reply.emotes); if (list.length) showBubbles(list); }
  } catch (err) {
    const msg = String(err?.message || '');
    if (/emote/i.test(msg)) return; // running out or going too fast: quiet, the picker shows the presets anyway
    try { B.toast(msg || 'That emote did not send.'); } catch { /* ignore */ }
  }
}

/* ---------------------------------------------------------------- Picker */
function place() {
  if (!pop || !openBtn || !openBtn.isConnected) return;
  const r = openBtn.getBoundingClientRect();
  const w = pop.offsetWidth || 280, h = pop.offsetHeight || 320;
  const left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8));
  let top = r.bottom + 8;
  if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 8);
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}
function closePop() {
  const btn = openBtn;
  if (pop) { pop.remove(); pop = null; }
  if (btn) { try { btn.setAttribute('aria-expanded', 'false'); btn.focus({ preventScroll: true }); } catch { /* ignore */ } }
}
function openPop(btn) {
  closePop();
  openBtn = btn;
  pop = document.createElement('div');
  pop.id = 'dePop'; pop.className = 'dePop';
  pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Emotes');
  pop.innerHTML = `<button type="button" class="deClose" title="Close (Esc)" aria-label="Close (Esc)">×</button>
    <h2>Emotes</h2>
    <div class="deGrid">${CLIENT_EMOTES.map(e => `<button type="button" class="deEmote" data-de-emote="${e.id}">${e.label}</button>`).join('')}</div>
    <div class="deMute"><span id="deMuteLbl">Hide emotes</span>
      <button type="button" class="deSwitch" role="switch" aria-checked="${muted()}" aria-labelledby="deMuteLbl"><span>${muted() ? 'On' : 'Off'}</span></button>
    </div>
    <p class="deNote">Preset emotes only. Nobody can type a message here.</p>`;
  document.body.append(pop);
  btn.setAttribute('aria-expanded', 'true');
  $('.deClose', pop).onclick = closePop;
  pop.querySelectorAll('[data-de-emote]').forEach(b => { b.onclick = () => send(b.dataset.deEmote); });
  $('.deSwitch', pop).onclick = () => {
    const next = setMuted(!muted());
    if (next) clearBubbles();
    const sw = $('.deSwitch', pop);
    if (sw) { sw.setAttribute('aria-checked', String(next)); $('span', sw).textContent = next ? 'On' : 'Off'; }
  };
  place();
  $('.deEmote', pop)?.focus({ preventScroll: true });
}
function toggle(btn) { if (pop) closePop(); else openPop(btn); }

function ensureButton() {
  if (!onlineView()) { if (pop) closePop(); return; }
  const rules = $('#showPocketRules');
  if (!rules || !rules.parentElement) return;
  let btn = $('#deOpen');
  if (!btn) {
    btn = document.createElement('button');
    btn.type = 'button'; btn.id = 'deOpen'; btn.className = 'button alt deOpen';
    btn.setAttribute('aria-label', 'Emotes'); btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', String(!!pop));
    btn.innerHTML = '<span aria-hidden="true">😊</span>';
    btn.onclick = () => toggle(btn);
    rules.after(btn);
  }
  openBtn = btn;
  if (pop) { btn.setAttribute('aria-expanded', 'true'); place(); }
}

/* ---------------------------------------------------------------- Styles */
function injectCSS() {
  if ($('#deCSS')) return;
  const st = document.createElement('style'); st.id = 'deCSS';
  st.textContent = `
.deOpen{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:0 10px;font-size:20px;line-height:1}
@media (pointer:fine){.deOpen{min-height:36px}}
.dePop{position:fixed;z-index:70;width:min(300px,calc(100vw - 16px));padding:14px 14px 12px;border-radius:14px;background:#1a2742;border:1px solid #e9b75a;box-shadow:0 14px 34px #000a;color:#f2e8d6;box-sizing:border-box}
.dePop *{box-sizing:border-box}
.dePop h2{margin:0 34px 10px 0;font-size:16px;color:#ffd9a0}
.deClose{position:absolute;top:2px;right:2px;width:44px;height:44px;border:0;border-radius:10px;background:none;color:#f2e8d6;font-size:22px;line-height:1;cursor:pointer}
.deClose:hover,.deClose:focus-visible{background:#ffffff1f}
.deGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.deEmote{min-height:44px;padding:6px 8px;border-radius:10px;border:1px solid #ffffff3d;background:#24344f;color:#fff;font-family:inherit;font-size:13px;font-weight:700;line-height:1.25;text-align:left;cursor:pointer}
.deEmote:hover,.deEmote:focus-visible{background:#2e4266;border-color:#e9b75a}
.deMute{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;padding-top:10px;border-top:1px solid #ffffff26;font-size:13px;font-weight:700}
.deSwitch{position:relative;min-width:76px;min-height:44px;padding:0 12px 0 36px;border-radius:99px;border:1px solid #e9b75a88;background:#3a2c18;color:#f2e8d6;font-family:inherit;font-size:13px;font-weight:800;text-align:left;cursor:pointer}
.deSwitch::before{content:"";position:absolute;left:7px;top:50%;width:22px;height:22px;margin-top:-11px;border-radius:50%;background:#8a7a64;transition:background .2s}
.deSwitch[aria-checked="true"]{background:linear-gradient(#5fbf6a,#2f8a3d);border-color:#9fe3a8}
.deSwitch[aria-checked="true"]::before{background:#fff}
.deNote{margin:10px 0 0;font-size:12px;color:#c8d1ec}
.deLayer{position:fixed;z-index:65;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 64px);display:flex;flex-direction:column;align-items:center;gap:6px;max-width:min(320px,82vw);pointer-events:none}
.deBubble{margin:0;padding:8px 14px;border-radius:99px;background:#141d33f2;border:1px solid #e9b75a99;color:#fff;font-size:13px;font-weight:700;text-align:center;box-shadow:0 6px 18px #0006;animation:deIn .24s ease-out}
@keyframes deIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
html[data-fx="light"] .deBubble{animation-duration:.12s}
html[data-fx="off"] .deBubble{animation:none}
@media (prefers-reduced-motion:reduce){.deBubble{animation:none}}
@media (max-width:560px){.deLayer{top:calc(env(safe-area-inset-top,0px) + 56px);max-width:86vw}.dePop{width:calc(100vw - 12px)}.deEmote{font-size:12px}}`;
  document.head.append(st);
}

/* ---------------------------------------------------------------- Wiring */
if (hasWindow && B) {
  injectCSS();
  window.EmberDuelEmotes = Object.freeze({ emotes: CLIENT_EMOTES, muted, mute: setMuted });
  addEventListener('ember:frame', e => {
    try {
      const v = e.detail?.view || B.view;
      if (v !== 'cardBattle' && v !== 'spectate') { if (pop) closePop(); clearBubbles(); }
      ensureButton();
      sync();
    } catch (err) { console.warn('duel-emotes', err); }
  });
  addEventListener('ember:cardBattle', e => { try { noteMatch(e.detail?.match); } catch (err) { console.warn('duel-emotes', err); } });
  addEventListener('ember:spectateBattle', e => { try { noteMatch(e.detail?.match); } catch (err) { console.warn('duel-emotes', err); } });
  addEventListener('resize', () => { try { place(); } catch (err) { console.warn('duel-emotes', err); } });
  addEventListener('scroll', () => { try { place(); } catch (err) { console.warn('duel-emotes', err); } }, true);
  addEventListener('keydown', e => { if (e.key === 'Escape' && pop) { e.preventDefault(); closePop(); } });
  addEventListener('pointerdown', e => {
    if (!pop) return;
    const t = e.target;
    if (pop.contains(t) || (openBtn && openBtn.contains(t))) return;
    closePop();
  }, true);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  ensureButton();
  sync();
}
