// EMBERLINGS anonymous crash reports: when something goes wrong in the game, a short note is sent so the problem
// can be fixed. Nothing is ever shown to the player. A note is the error message, the first line of the stack, the
// name of the screen and the browser name. The save, usernames, ids, cookies and localStorage are never read.
// Reports are grouped on the server by message and deleted after 30 days.
// Saved additively as state.ember.crash = { on: true }. The "Anonymous crash reports" switch in Settings turns it off;
// while it is off nothing is collected and the waiting queue is cleared.
// At most 10 different errors per session. Records go out when 3 are waiting, or 60 seconds after the first one
// (the timer pauses while the tab is hidden), and anything left is sent when the page is left. A failed send is
// never retried in a loop: the queue waits for the next error or the next visit.
const B = window.EmberBridge;
const LIMIT = 10, SEND_AT = 3, WAIT_MS = 60000, SESSION_MAX = 20;
let queue = [], seen = new Set(), added = 0, timer = 0, firstAt = 0, sending = false, failed = false;

/* ------------------------------------------------------------ The setting */
function crash() { const st = B.state; if (!st.ember || typeof st.ember !== 'object') st.ember = {}; const c = st.ember.crash; return c && typeof c === 'object' ? c : {}; }
const on = () => crash().on !== false;
function setOn(next) {
  const st = B.state; if (!st.ember || typeof st.ember !== 'object') st.ember = {};
  st.ember.crash = { ...crash(), on: next === true };
  if (!next) { queue = []; firstAt = 0; clearTimeout(timer); timer = 0; }
  try { B.save(); } catch (err) { console.warn('error-report', err); }
}

/* ------------------------------------------------------------ Collect (nothing personal) */
const viewName = () => { try { return String(B.view || '').slice(0, 40); } catch { return ''; } };
const browser = () => { try { return String(navigator.userAgent || '').slice(0, 200); } catch { return ''; } };
const head = stack => String(stack || '').split('\n')[0].trim().slice(0, 400);
const plain = reason => reason instanceof Error ? String(reason.message || reason.name || 'Error') : typeof reason === 'string' ? reason : 'Something went wrong';
function record(message, stack) {
  try {
    if (!on()) return;
    const msg = String(message || '').trim().slice(0, 200);
    if (!msg) return;
    const top = head(stack), key = msg + '\n' + top;
    if (seen.has(key) || seen.size >= LIMIT || added >= SESSION_MAX) return;
    seen.add(key); added++;
    queue.push(top ? { message: msg, stack: top, view: viewName(), ua: browser() } : { message: msg, view: viewName(), ua: browser() });
    failed = false; // a new error may try once more after a network failure
    if (queue.length >= SEND_AT) flush();
    schedule();
  } catch (err) { console.warn('error-report', err); }
}

/* ------------------------------------------------------------ Send */
async function post(batch, keepAlive) {
  const body = JSON.stringify({ errors: batch });
  try {
    const res = await fetch('/api/social/errors', { method: 'POST', credentials: 'same-origin', cache: 'no-store', keepalive: !!keepAlive, headers: { 'Content-Type': 'application/json' }, body });
    return !!res && res.ok !== false;
  } catch (err) { console.warn('error-report', err); return false; }
}
async function flush() {
  if (sending || failed || !queue.length || !on()) return;
  sending = true;
  try {
    const batch = queue.slice(0, 10);
    if (await post(batch, false)) { queue = queue.filter(r => !batch.includes(r)); if (!queue.length) firstAt = 0; }
    else failed = true;
  } catch (err) { failed = true; console.warn('error-report', err); }
  finally { sending = false; schedule(); }
}
// Send what is waiting when the page is left: sendBeacon when the browser has it, else a keepalive fetch.
function unload() {
  if (!queue.length || !on()) return;
  const batch = queue.slice(0, 10), body = JSON.stringify({ errors: batch });
  try {
    if (navigator.sendBeacon?.('/api/social/errors', new Blob([body], { type: 'application/json' }))) { queue = []; return; }
  } catch (err) { console.warn('error-report', err); }
  try { fetch('/api/social/errors', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, keepalive: true, body }); queue = []; }
  catch (err) { console.warn('error-report', err); }
}
// One timer for the whole queue, stopped while the tab is hidden.
function schedule() {
  clearTimeout(timer); timer = 0;
  if (!queue.length || !on() || failed || document.hidden) return;
  if (!firstAt) firstAt = Date.now();
  timer = setTimeout(() => { timer = 0; if (!document.hidden) flush(); }, Math.max(1000, WAIT_MS - (Date.now() - firstAt)));
}

/* ------------------------------------------------------------ Settings section */
const sw = (id, label, checked, sub) => `<div class="setRow"><div class="setRowText"><span class="setLabel" id="${id}Lbl">${label}</span><small class="setSub" id="${id}Sub">${sub}</small></div>
  <button type="button" class="setSwitch" id="${id}" role="switch" aria-checked="${checked}" aria-labelledby="${id}Lbl" aria-describedby="${id}Sub"><span>${checked ? 'On' : 'Off'}</span></button></div>`;
const SUB = 'The game quietly reports problems so they can be fixed. No account, save or personal details are sent.';
function sectionHTML() {
  return `${sw('crashOn', 'Anonymous crash reports', on(), SUB)}<p class="crashFoot">Reports are grouped and deleted after 30 days. Nothing is ever shown on screen.</p>`;
}
function bind(el) {
  el.addEventListener('click', e => {
    try {
      const b = e.target.closest('#crashOn'); if (!b) return;
      setOn(!on());
      const now = on();
      b.setAttribute('aria-checked', String(now));
      const label = b.querySelector('span'); if (label) label.textContent = now ? 'On' : 'Off';
    } catch (err) { console.warn('error-report', err); }
  });
}
let hub = false;
function hookSettings() {
  if (hub || !window.EmberSettings?.addSection) return;
  hub = window.EmberSettings.addSection({ id: 'crash', icon: '🛠', title: 'Crash reports', order: 5, html: sectionHTML, bind }) !== false;
}

/* ------------------------------------------------------------ Styles */
const CSS = `
/* Crash reports (public/error-report.js) */
#set-crash .crashFoot{margin:10px 0 0;font-size:13px;line-height:1.4;color:#b9ae98}
`;

/* ------------------------------------------------------------ Start */
if (B && !window.EmberCrashReports) {
  const st = document.createElement('style'); st.id = 'crash-css'; st.textContent = CSS; document.head.append(st);
  // Script and image load failures arrive without a message or an error object: they are not game crashes.
  addEventListener('error', e => { try { if (!e.message && !e.error) return; record(e.error?.message || e.message, e.error?.stack); } catch (err) { console.warn('error-report', err); } });
  addEventListener('unhandledrejection', e => { try { record(plain(e.reason), e.reason instanceof Error ? e.reason.stack : ''); } catch (err) { console.warn('error-report', err); } });
  addEventListener('pagehide', () => { try { unload(); } catch (err) { console.warn('error-report', err); } });
  document.addEventListener('visibilitychange', () => { try { schedule(); } catch (err) { console.warn('error-report', err); } });
  addEventListener('ember:frame', hookSettings);
  hookSettings(); setTimeout(hookSettings, 0);
  window.EmberCrashReports = Object.freeze({ on, waiting: () => queue.length, send: () => flush() });
}
