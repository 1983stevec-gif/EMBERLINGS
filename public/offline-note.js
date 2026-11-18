// EMBERLINGS offline note: a small banner at the bottom of the screen while the connection is
// missing, so the player knows that solo play, the binder and saved quest packs still work, and
// that friends and trading will wait. It clears itself when the connection returns, with one
// "Back online" toast (no toast during quiet hours).
//
// It shows when the browser says it is offline, and also when an online request fails while the
// browser still claims to be online (a weak signal often says that). While the banner is up, one
// gentle check asks the server for a tiny file; it does not poll. Nothing is stored, and no save
// data is read or written.
//
// This file is a module (public/offline-note.js). The pure step function below is exported for
// tests/offline-solo.mjs, which runs it without a browser.

export const OFFLINE_TEXT = Object.freeze({
  title: "You're offline",
  line: "Solo battles, your binder and saved quest packs keep working. Friends and trading wait until you're back.",
  back: 'Back online'
});

/* The banner state machine: { shown, dismissed } in, one event at a time, and a small plan out.
 * Events: 'offline' or 'failed' (the connection is gone / a request could not reach the server),
 *         'online' or 'saved' (the connection is back / a gentle check got through),
 *         'dismiss' (Close or Escape).
 * `quiet` keeps the "Back online" toast away during quiet hours.
 * Returns { shown, dismissed, toast, check, changed }. `check` asks the caller to run one gentle
 * check, `changed` says the banner needs repainting. It never shows twice for the same outage. */
export function noteStep(state, event, { quiet = false } = {}) {
  const shown = state?.shown === true, dismissed = state?.dismissed === true;
  if (event === 'offline' || event === 'failed') {
    if (shown) return { shown: true, dismissed, toast: '', check: false, changed: false };
    if (dismissed) return { shown: false, dismissed: true, toast: '', check: false, changed: false };
    return { shown: true, dismissed: false, toast: '', check: true, changed: true };
  }
  if (event === 'online' || event === 'saved') {
    if (!shown && !dismissed) return { shown: false, dismissed: false, toast: '', check: false, changed: false };
    return { shown: false, dismissed: false, toast: shown && !quiet ? OFFLINE_TEXT.back : '', check: false, changed: true };
  }
  if (event === 'dismiss') {
    if (!shown) return { shown: false, dismissed, toast: '', check: false, changed: false };
    return { shown: false, dismissed: true, toast: '', check: false, changed: true };
  }
  return { shown, dismissed, toast: '', check: false, changed: false };
}

/* ================================================================== In the game */
const BANNER_ID = 'offlineNote';
const PROBE_GAP_MS = 20000;   // at most one gentle check per 20 s, and only while the banner is up
let state = { shown: false, dismissed: false };
let banner = null, probing = false, lastProbe = 0, started = false;

const quietNow = () => { try { return window.EmberComfort?.quiet?.() === true; } catch (err) { console.warn('offline-solo', err); return false; } };
function toast(text) {
  try {
    if (!text || quietNow()) return; // quiet hours: no pop-ups that open by themselves
    window.EmberBridge?.toast?.(text);
  } catch (err) { console.warn('offline-solo', err); }
}

/* ------------------------------------------------------------ Banner */
function draw() {
  try {
    banner = banner && banner.isConnected ? banner : document.getElementById(BANNER_ID);
    if (banner) { banner.classList.add('offNoteIn'); return; }
    const el = document.createElement('div');
    el.id = BANNER_ID;
    el.className = 'offNote';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    const text = document.createElement('div');
    text.className = 'offNoteText';
    const title = document.createElement('b');
    title.textContent = OFFLINE_TEXT.title;
    const line = document.createElement('span');
    line.textContent = OFFLINE_TEXT.line;
    text.append(title, line);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'offNoteX';
    close.title = 'Close (Esc)';
    close.setAttribute('aria-label', 'Close (Esc)');
    close.textContent = '×';
    close.addEventListener('click', () => apply('dismiss'));
    el.append(text, close);
    document.body.append(el);
    banner = el;
    requestAnimationFrame(() => { try { el.classList.add('offNoteIn'); } catch (err) { console.warn('offline-solo', err); } });
  } catch (err) { console.warn('offline-solo', err); }
}
function erase() {
  try {
    const el = banner && banner.isConnected ? banner : document.getElementById(BANNER_ID);
    banner = null;
    if (!el) return;
    el.classList.remove('offNoteIn');
    setTimeout(() => { try { el.remove(); } catch (err) { console.warn('offline-solo', err); } }, 240);
  } catch (err) { console.warn('offline-solo', err); }
}

/* ------------------------------------------------------------ One gentle check */
function probe() {
  try {
    if (probing) return;
    const now = Date.now();
    if (now - lastProbe < PROBE_GAP_MS) return;
    lastProbe = now; probing = true;
    // A tiny file, asked for fresh, so this never comes from the cache. Not an /api/ request.
    fetch('/manifest.webmanifest?offline-check=' + now, { cache: 'no-store', credentials: 'same-origin' })
      .then(res => { if (res && res.ok) apply('saved'); })
      .catch(err => console.warn('offline-solo', err))
      .finally(() => { probing = false; });
  } catch (err) { console.warn('offline-solo', err); }
}
const maybeProbe = () => { if (state.shown && !state.dismissed) probe(); };

/* ------------------------------------------------------------ Apply one event */
function apply(event) {
  try {
    const next = noteStep(state, event, { quiet: quietNow() });
    state = { shown: next.shown, dismissed: next.dismissed };
    if (next.changed) { if (next.shown) draw(); else erase(); }
    if (next.toast) toast(next.toast);
    if (next.check) probe();
  } catch (err) { console.warn('offline-solo', err); }
}

/* An online request that never reached the server while the browser still says it is online.
 * The game's own toasts already explain the failure; this only raises the banner. */
function isOnlineRequest(input) {
  const raw = typeof input === 'string' ? input : (input && input.url) || '';
  try {
    const url = new URL(raw, location.href);
    return url.origin === location.origin && (url.pathname === '/api' || url.pathname.startsWith('/api/'));
  } catch { return false; }
}
function watchFetch() {
  const original = window.fetch;
  if (typeof original !== 'function' || original.__emberOfflineWatched) return;
  function watched(input) {
    const result = original.apply(this, arguments);
    if (!result || typeof result.then !== 'function') return result;
    return result.then(res => res, err => {
      try { if (err?.name !== 'AbortError' && isOnlineRequest(input)) apply('failed'); } catch (shot) { console.warn('offline-solo', shot); }
      throw err;
    });
  }
  watched.__emberOfflineWatched = true;
  try { window.fetch = watched; } catch (err) { console.warn('offline-solo', err); }
}

/* ------------------------------------------------------------ Styles */
const CSS = `
/* Offline note (public/offline-note.js) */
#offlineNote{position:fixed;z-index:9460;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom,0px));width:min(440px,calc(100vw - 24px));box-sizing:border-box;display:flex;align-items:flex-start;gap:10px;padding:10px 10px 10px 14px;border:1px solid #b89a5a;border-radius:14px;background:#121b40f2;color:#eff8ff;box-shadow:0 12px 30px #000b;font:600 13px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;pointer-events:none;opacity:0;transition:opacity .22s ease-out}
#offlineNote.offNoteIn{opacity:1}
#offlineNote .offNoteText{min-width:0}
#offlineNote b{display:block;font-size:15px;color:#ffdd7a;margin-bottom:2px}
#offlineNote span{display:block;color:#dfe7fb}
#offlineNote .offNoteX{flex:none;width:30px;height:30px;margin:-2px -2px 0 0;border-radius:50%;border:1px solid #5e6baa;background:#0a1029;color:#cdd7f2;font:700 17px/1 system-ui,sans-serif;cursor:pointer;pointer-events:auto;display:grid;place-items:center}
#offlineNote .offNoteX:hover{color:#fff;border-color:#b89a5a}
#offlineNote .offNoteX:focus-visible{outline:3px solid #ffd27a;outline-offset:2px}
@media(pointer:coarse){#offlineNote .offNoteX{width:44px;height:44px;margin:-6px -6px -6px 0;font-size:19px}}
/* Clear of the bottom navigation on phones, and of the tab bar on touch tablets (the same places
   the achievement banner uses). With the floating Daily button showing, stop before it. */
@media(max-width:699px){
  #offlineNote{bottom:calc(96px + env(safe-area-inset-bottom,0px))}
  body:has(#dailyBtn) #offlineNote{left:12px;right:130px;width:auto;transform:none}
}
@media(min-width:700px) and (max-width:1199px) and (pointer:coarse){
  #offlineNote{bottom:calc(var(--tabH,0px) + 14px + env(safe-area-inset-bottom,0px))}
  body:has(#dailyBtn) #offlineNote{left:12px;right:170px;width:auto;transform:none}
}
/* One notice is enough: the older small offline pill steps aside while this banner is up. */
body:has(#offlineNote) .pwaOffline{display:none!important}
/* A fade in every case, including Effects Off and reduced motion: opacity only, never movement. */
html[data-fx=off] #offlineNote,.reduceMotion #offlineNote{transition-duration:.12s}
@media(prefers-reduced-motion:reduce){#offlineNote{transition-duration:.12s}}
`;

/* ------------------------------------------------------------ Start */
function onKey(e) {
  try {
    if (e.key !== 'Escape' || !state.shown) return;
    // Another dialog gets Escape first; this note is never in the way of a real choice.
    if (document.querySelector('#cmfDlg,[role="dialog"],[role="alertdialog"],.uiMenu')) return;
    apply('dismiss');
  } catch (err) { console.warn('offline-solo', err); }
}

function start() {
  try {
    if (started || window.EmberOfflineNote) { started = true; return; }
    started = true;
    const css = document.createElement('style');
    css.id = 'offlineNoteCss';
    css.textContent = CSS;
    document.head.append(css);
    watchFetch();
    addEventListener('offline', () => apply('offline'));
    addEventListener('online', () => apply('online'));
    // Coming back to the tab, a tap or a key press is a good moment for the one gentle check.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) maybeProbe(); });
    addEventListener('pointerdown', maybeProbe, { passive: true });
    addEventListener('keydown', onKey);
    window.EmberOfflineNote = Object.freeze({ step: noteStep, text: OFFLINE_TEXT, state: () => ({ ...state }) });
    if (navigator.onLine === false) apply('offline');
    // The worker marks a page it had to take from the saved copy; that means the network failed.
    else if (document.querySelector('meta[name="emberlings-served-offline"]')) apply('offline');
  } catch (err) { console.warn('offline-solo', err); }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') start();
