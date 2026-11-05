/* EMBERLINGS screenshot mode: hides the buttons and menus for a clean picture of the screen.
 * Open it from the player menu ("📷 Screenshot mode"), the 📷 button on Card details, or Shift+S.
 * While it is on, a see-through layer covers the page: taps never reach the game underneath,
 * and any tap, Escape, Enter or Space (or Shift+S again) brings everything back exactly as it was.
 * It also switches itself off when the screen changes. Presentation only: no save data. */
const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s);
const ON = 'shotMode';
const root = document.documentElement;

let layer = null, enteredView = '', withDetails = false, lastFocus = null, hintTimer = 0;
const active = () => root.classList.contains(ON);

function enter() {
  if (!B || active()) return false;
  $('.uiMenu')?.remove();
  for (const b of document.querySelectorAll('.uiUserBtn[aria-expanded="true"]')) b.setAttribute('aria-expanded', 'false');
  enteredView = B.view; withDetails = !!$('#cardDetails');
  lastFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
  layer = document.createElement('div'); layer.id = 'shotLayer'; layer.tabIndex = -1;
  layer.setAttribute('role', 'button');
  layer.setAttribute('aria-label', 'Screenshot mode is on. Tap anywhere or press Escape to bring the buttons back.');
  layer.innerHTML = '<p class="shotHint" aria-hidden="true">Tap anywhere to exit</p>';
  document.body.appendChild(layer);
  root.classList.add(ON);
  try { lastFocus?.blur(); layer.focus({ preventScroll: true }); } catch { /* ignore */ }
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => layer?.classList.add('shotHintGone'), 2000);
  dispatchEvent(new CustomEvent('ember:screenshotMode', { detail: { on: true } }));
  return true;
}

function exit() {
  if (!active() && !layer) return false;
  clearTimeout(hintTimer);
  root.classList.remove(ON);
  layer?.remove(); layer = null;
  const f = lastFocus; lastFocus = null;
  if (f?.isConnected) { try { f.focus({ preventScroll: true }); } catch { /* ignore */ } }
  dispatchEvent(new CustomEvent('ember:screenshotMode', { detail: { on: false } }));
  return true;
}
const toggle = () => (active() ? exit() : enter());

/* While on: swallow every tap so nothing underneath is pressed; the click ends the mode. */
const SWALLOW = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchend', 'click', 'dblclick', 'auxclick', 'contextmenu'];
function swallow(e) {
  if (!active()) return;
  e.stopPropagation(); e.stopImmediatePropagation();
  if (e.type !== 'pointerdown' && e.type !== 'mousedown' && e.cancelable) e.preventDefault();
  if (e.type === 'click' || e.type === 'contextmenu') exit();
}
for (const t of SWALLOW) addEventListener(t, swallow, { capture: true });

const typing = el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
addEventListener('keydown', e => {
  const shiftS = e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'S' || e.key === 's' || e.code === 'KeyS');
  if (active()) {
    // No game shortcuts while the picture is being taken; these keys bring the buttons back.
    e.stopPropagation(); e.stopImmediatePropagation();
    if (['Escape', 'Enter', ' ', 'Spacebar'].includes(e.key) || shiftS) { e.preventDefault(); exit(); }
    else if (!['Shift', 'Control', 'Alt', 'Meta', 'PrintScreen'].includes(e.key) && !e.metaKey && !e.ctrlKey) e.preventDefault();
    return;
  }
  if (!shiftS || e.repeat || typing(e.target) || !B) return;
  // Not over a pop-up or while the beginner guide is talking.
  if ($('.uiMenu, #dailyPanel, #whatsNewPanel, #guidedTour, .tradeDone, #rareFind, .uiCloudDlg, #bossIntro, .biIntro, [role=dialog]:not(#cardDetails), [role=alertdialog]')) return;
  e.preventDefault(); e.stopPropagation(); enter();
}, { capture: true });

/* Never stuck: leave when the screen changes, Card details closes, or the layer goes away. */
addEventListener('ember:frame', () => { if (active() && B.view !== enteredView) exit(); });
addEventListener('popstate', () => { if (active()) exit(); });
new MutationObserver(() => {
  if (!active()) return;
  if ((withDetails && !$('#cardDetails')) || !layer?.isConnected) exit();
}).observe(document.body, { childList: true });

/* Entry points: player menu item and a small 📷 button on Card details. */
function addMenuItem() {
  const menu = $('.uiMenu'); if (!menu || $('#shotMenuGo', menu)) return;
  const b = document.createElement('button');
  b.id = 'shotMenuGo'; b.type = 'button'; b.setAttribute('role', 'menuitem');
  b.innerHTML = '<span aria-hidden="true">📷</span> Screenshot mode';
  b.title = 'Hide the buttons for a clean picture (Shift+S)';
  b.addEventListener('click', ev => { ev.stopPropagation(); enter(); });
  const anchor = $('#uiSettingsGo', menu);
  if (anchor) anchor.before(b); else menu.appendChild(b);
  b.tabIndex = -1; // a11y.js roves focus through the menu items
}
function addDetailsButton() {
  const bar = $('#cardDetails .cdBar'); if (!bar || $('.shotCdBtn', bar)) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'shotCdBtn';
  b.setAttribute('aria-label', 'Screenshot mode: hide the buttons (Shift+S)'); b.title = 'Screenshot mode (Shift+S)';
  b.innerHTML = '<span aria-hidden="true">📷</span>';
  b.addEventListener('click', ev => { ev.stopPropagation(); enter(); });
  const flip = $('.cdFlip', bar);
  if (flip) flip.before(b); else bar.appendChild(b);
}
let queued = false;
new MutationObserver(() => {
  if (queued) return; queued = true;
  requestAnimationFrame(() => { queued = false; try { addMenuItem(); addDetailsButton(); } catch (err) { console.warn('screenshot-mode', err); } });
}).observe(document.body, { childList: true });

/* ------------------------------------------------------------ Styles */
const HIDE = [
  // Anything sitting straight on the page except the game screen, Card details and effect layers:
  // Daily button, toasts, first-time tips, install and music hints, pop-ups, the tablet picture menu.
  'body > :not(#app):not(#cardDetails):not(#shotLayer):not(#bxLayer):not(#fxbLayer):not(#fxmLayer):not(script):not(style):not(link)',
  // Header, bell and the bottom tab bar.
  '#app > header', '#app .uiTop', '#app > nav.nav', '.inbBell', '.uiTabMenu', '.toast', '.etTip', '.etRing', '#dailyBtn',
  // Home: buttons over the hero and the deck panel.
  '.uiHero .uiCta', '.uiDeckPanel button', '.seaToggle',
  // Adventure HQ map controls.
  '.uiXChip', '#uiXCurrent', '.mapControls',
  // My Binder: search, filters, tools and the pager.
  '.uiBinderHead .colHeadBtns', '.uiBinderBar', '#btBar', '.uiBinderFoot .binderPager', '.uiPagerHint', '.uiBrowse',
  // Card details: top bar, hint and the info column (the big card stays).
  '#cardDetails .cdBar', '#cardDetails .cdHint', '#cardDetails .cdInfo',
  // Battle: Concede, End Turn, the hand, discard pile, log, hand arrows, retreat and the little call-outs.
  '#leaveCards', '#endPocketTurn', '.pocketHand', '.cardArena > details', '.bxHandNav', '.retreatPanel', '#cardError', '.bxCallout', '.bxBanner', '.bxPreview'
].map(s => `html.${ON} ${s}`).join(',\n');

const CSS = `
${HIDE}{visibility:hidden!important;pointer-events:none!important}
html.${ON} *:focus,html.${ON} *:focus-visible{outline:none!important}
#shotLayer{position:fixed;inset:0;z-index:2147483646;background:transparent;cursor:pointer;-webkit-tap-highlight-color:transparent;outline:none;user-select:none;-webkit-user-select:none}
#shotLayer .shotHint{position:absolute;left:50%;bottom:max(18px,calc(env(safe-area-inset-bottom) + 12px));transform:translateX(-50%);margin:0;max-width:calc(100% - 32px);padding:8px 16px;border-radius:999px;background:#0b0f18a6;border:1px solid #ffffff33;color:#fff6e0;font:600 14px/1.3 system-ui,-apple-system,'Segoe UI',sans-serif;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;opacity:1;transition:opacity .6s ease}
#shotLayer.shotHintGone .shotHint{opacity:0}
#cardDetails .shotCdBtn{flex:none;min-width:48px;min-height:48px;padding:8px 10px;border-radius:10px;border:1px solid #7a5a2a;background:linear-gradient(180deg,#1d2533,#121822);color:#f3dfb0;font-size:20px;line-height:1}
#cardDetails .shotCdBtn:focus-visible{outline:3px solid #ffdd7e;outline-offset:3px}
@media (prefers-reduced-motion:reduce){#shotLayer .shotHint{transition:none}}
html[data-fx="off"] #shotLayer .shotHint{transition:none}`;

if (B && !window.EmberScreenshot) {
  const st = document.createElement('style'); st.id = 'screenshot-mode-css'; st.textContent = CSS; document.head.appendChild(st);
  window.EmberScreenshot = Object.freeze({ enter, exit, toggle, active });
}
