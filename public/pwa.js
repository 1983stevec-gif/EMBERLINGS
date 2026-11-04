/* EMBERLINGS as an app: registers the service worker (fast second visits, offline page),
 * offers "Install EMBERLINGS" once, shows an offline notice, and keeps the game clear of
 * the notch and home bar when it's opened from the home screen.
 * Uses its own localStorage key, never the game save. */
const TIP_KEY = 'emberlings-install-tip';
const $ = s => document.querySelector(s);
const store = {
  get() { try { return localStorage.getItem(TIP_KEY) || ''; } catch { return 'unavailable'; } },
  set(v) { try { localStorage.setItem(TIP_KEY, v); } catch { } },
};
const standalone = () => matchMedia('(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)').matches || navigator.standalone === true;
const ios = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let deferred = null;
const canInstall = () => !standalone() && (deferred || ios());

/* ---------- Styles (safe areas, tip, offline notice) ---------- */
const css = document.createElement('style');
css.id = 'pwaStyles';
css.textContent = `
body{padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)}
@media (display-mode: standalone), (display-mode: fullscreen){
 html{background:#0a1029}
 body{padding-top:env(safe-area-inset-top)}
 body .uiTop{top:env(safe-area-inset-top)!important}
 .toast{top:calc(15px + env(safe-area-inset-top))!important}
 #pwaStatusBar{display:block}
}
html.pwaStandalone{background:#0a1029}
html.pwaStandalone body{padding-top:env(safe-area-inset-top)}
html.pwaStandalone body .uiTop{top:env(safe-area-inset-top)!important}
html.pwaStandalone .toast{top:calc(15px + env(safe-area-inset-top))!important}
html.pwaStandalone #pwaStatusBar{display:block}
#pwaStatusBar{display:none;position:fixed;z-index:9650;left:0;right:0;top:0;height:env(safe-area-inset-top);background:#0a1029;pointer-events:none}
.pwaTip{position:fixed;z-index:9550;left:50%;bottom:calc(96px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(380px,calc(100vw - 24px));display:flex;align-items:center;gap:12px;padding:12px 12px 12px 14px;border-radius:16px;border:1px solid #b89a5a;background:linear-gradient(180deg,#18234b,#0d1533);box-shadow:0 14px 34px #000b;color:#eff8ff;font:14px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;animation:pwaIn .35s ease-out both}
.pwaTip img{width:44px;height:44px;border-radius:11px;flex:none}
.pwaTip b{display:block;color:#ffdd7a;font-size:15px;margin-bottom:2px}
.pwaTip .pwaTxt{flex:1;min-width:0}
.pwaTip button{font:inherit;cursor:pointer}
.pwaTip .pwaGo{flex:none;font-weight:800;color:#2a1405;background:linear-gradient(180deg,#ffe9a8,#e0a948);border:0;border-radius:20px;padding:9px 14px}
.pwaTip .pwaX{flex:none;width:32px;height:32px;border-radius:50%;border:1px solid #5e6baa;background:#0a1029;color:#bdc8e8;font-size:16px;line-height:1}
.pwaShare{display:inline-block;width:14px;height:16px;vertical-align:-2px;margin:0 1px}
.pwaOffline{position:fixed;z-index:9560;left:50%;top:calc(10px + env(safe-area-inset-top));transform:translateX(-50%);width:max-content;max-width:calc(100vw - 24px);padding:9px 16px;border-radius:20px;border:1px solid #b89a5a;background:#121b40f2;color:#ffdd7a;font:600 14px/1.3 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 8px 24px #000a;text-align:center;pointer-events:none;animation:pwaIn .3s ease-out both}
@keyframes pwaIn{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
@media (prefers-reduced-motion: reduce){.pwaTip,.pwaOffline{animation:none}}
@media (min-width:1000px){.pwaTip{left:auto;right:24px;bottom:96px;transform:none;animation:none}}
`;
document.head.appendChild(css);
const bar = document.createElement('div'); bar.id = 'pwaStatusBar'; document.body.appendChild(bar);
if (navigator.standalone === true) document.documentElement.classList.add('pwaStandalone');

/* ---------- Service worker ---------- */
function register() {
  if (!('serviceWorker' in navigator) || !isSecureContext) return;
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(async () => {
    const reg = await navigator.serviceWorker.ready;
    // Hand over what this visit already downloaded so the next visit can skip it.
    const urls = [location.origin + '/', ...performance.getEntriesByType('resource').map(e => e.name)];
    reg.active?.postMessage({ type: 'warm', urls });
  }).catch(() => { });
}
if (document.readyState === 'complete') setTimeout(register, 1500);
else addEventListener('load', () => setTimeout(register, 1500), { once: true });

/* ---------- Offline notice ---------- */
// Shown when the browser says it's offline, or when the page itself came from the saved copy
// because the network failed. Online features keep going to the server and will simply fail until then.
let offline = navigator.onLine === false || !!document.querySelector('meta[name="emberlings-served-offline"]');
let probe = 0;
function offlineNotice() {
  let el = $('.pwaOffline');
  if (offline && !el) {
    el = document.createElement('div'); el.className = 'pwaOffline'; el.setAttribute('role', 'status');
    el.textContent = "You're offline — reconnect to play online features.";
    document.body.appendChild(el);
  } else if (!offline && el) el.remove();
  clearInterval(probe);
  if (offline) probe = setInterval(() => fetch('/manifest.webmanifest?online-check=' + Date.now(), { cache: 'no-store' })
    .then(r => { if (r.ok) { offline = false; offlineNotice(); } }).catch(() => { }), 20000);
}
addEventListener('offline', () => { offline = true; offlineNotice(); });
addEventListener('online', () => { offline = false; offlineNotice(); });
offlineNotice();

/* ---------- Install ---------- */
const SHARE_ICON = '<svg class="pwaShare" viewBox="0 0 14 16" aria-hidden="true"><path d="M7 1v9M3.5 4.5 7 1l3.5 3.5M2 7.5H1v7.5h12V7.5h-1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const iosSteps = `Tap Share ${SHARE_ICON} then <b style="display:inline;color:inherit;font-size:inherit">Add to Home Screen</b>.`;

async function install() {
  if (deferred) {
    const prompt = deferred; deferred = null;
    try { prompt.prompt(); const choice = await prompt.userChoice; if (choice?.outcome === 'accepted') store.set('installed'); } catch { }
    closeTip(); return;
  }
  if (ios()) showTip(true);
}

function closeTip(remember = true) {
  $('.pwaTip')?.remove();
  if (remember && store.get() !== 'installed') store.set('dismissed');
}

function showTip(force = false) {
  if ($('.pwaTip') || !canInstall()) return;
  if (!force && store.get()) return; // shown before (or storage blocked): don't nag
  if (!force) store.set('shown');
  const el = document.createElement('div'); el.className = 'pwaTip'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Install EMBERLINGS');
  const iosOnly = !deferred;
  el.innerHTML = `<img src="/branding/emberlings-app-192.png" alt="" width="44" height="44"><div class="pwaTxt"><b>Install EMBERLINGS</b>${iosOnly ? iosSteps : 'Play full screen from your home screen, and it opens faster.'}</div>${iosOnly ? '' : '<button class="pwaGo" type="button">Install</button>'}<button class="pwaX" type="button" aria-label="Close">✕</button>`;
  el.querySelector('.pwaGo')?.addEventListener('click', install);
  el.querySelector('.pwaX').addEventListener('click', () => closeTip());
  document.body.appendChild(el);
}

let tipTimer = 0;
function maybeTip(view) {
  clearTimeout(tipTimer);
  if (view !== 'home') { if ($('.pwaTip') && store.get() === 'shown') $('.pwaTip').remove(); return; }
  if (store.get() || !canInstall()) return;
  tipTimer = setTimeout(() => {
    const busy = [...document.querySelectorAll('.tourBubble, .uiCloudDlg, .biIntro, .rareFind, .tradeDone, .uiMenu')].some(el => el.getClientRects().length);
    if (window.EmberBridge?.view !== 'home' || busy) return; // never on top of the tour or a pop-up; try again on the next Home visit
    showTip();
  }, 7000);
}
addEventListener('ember:frame', e => maybeTip(e.detail?.view));

addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferred = e;
  maybeTip(window.EmberBridge?.view);
});
addEventListener('appinstalled', () => { store.set('installed'); deferred = null; closeTip(false); });

// For the Settings page (settings.js): same install flow as the tip and the menu item.
window.EmberPwa = { canInstall: () => !!canInstall(), install, installed: standalone };

/* "Install EMBERLINGS" in the user menu, whenever installing is possible (not a nag: only shows when the menu is opened). */
new MutationObserver(() => {
  const menu = $('.uiMenu');
  if (!menu || menu.querySelector('#pwaInstallGo') || !canInstall()) return;
  const b = document.createElement('button');
  b.id = 'pwaInstallGo'; b.setAttribute('role', 'menuitem'); b.type = 'button';
  b.innerHTML = '<span aria-hidden="true">📲</span> Install EMBERLINGS';
  b.addEventListener('click', ev => { ev.stopPropagation(); menu.remove(); install(); });
  menu.appendChild(b);
}).observe(document.body, { childList: true });
