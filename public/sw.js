/* EMBERLINGS service worker: makes the second visit fast and keeps working offline.
 *
 *  - Pictures, fonts and 3D models: served from the cache first (they rarely change).
 *    After a new release they are re-checked quietly in the background.
 *  - Game code (/*.js, /theme.css, JSON): served from the cache, and re-checked in the
 *    background every visit. If the game page itself changed (a new release), the
 *    cached code is thrown away first so the new page always gets the new code.
 *  - The game page (/): always fetched from the network first. The cache is only used
 *    when there is no connection, and if nothing is cached a friendly offline page shows.
 *  - Solo play offline: on install every module the page loads, the page itself, its styles,
 *    the creature art, the fonts and the branding are saved up front (see CORE_MODULES and
 *    CORE_MEDIA below), so a saved game opens and plays with no connection at all. Any other
 *    same-origin address falls back to the saved game page when the network fails.
 *  - /api/ (accounts, saves, friends, trades, battles) and anything that isn't a plain
 *    GET is never touched: the browser sends it straight to the server.
 *
 * Bump VERSION when this file's caching rules change; old caches are removed on activate.
 */
const VERSION = 'v3';
const PREFIX = 'emberlings-';
const CACHES = {
  page: `${PREFIX}page-${VERSION}`,
  code: `${PREFIX}code-${VERSION}`,
  assets: `${PREFIX}assets-${VERSION}`,
  meta: `${PREFIX}meta-${VERSION}`,
};
const LIMITS = { code: 80, assets: 300 };
const RELEASE_KEY = '/__emberlings-release';
const GEN_HEADER = 'x-emberlings-release';
const PAGE_KEY = '/';
const PAGE_TIMEOUT_MS = 8000;
const NOTE_SCRIPT = '<script type="module" src="/offline-note.js"></script>';

/* Solo play offline. The install step saves this whole list, so the page and every module it
 * needs are already in the cache when the player has no connection.
 *
 * CORE_MODULES is the page's own module list (the includes at the end of game/index.html) plus
 * the modules those imports pull in, the vendor 3D files, the stylesheet and the manifest.
 * Keep it in step with the page: tests/offline-solo.mjs reads this block and fails if a module
 * script in game/index.html is missing here, so the two can never drift apart silently. */
const CORE_MODULES = [
  // Included by game/index.html, in the page's own order.
  '/enhancements.js',
  '/ui.js',
  '/ui-exact.js',
  '/cloud.js',
  '/error-report.js',
  '/offline-note.js',
  '/battle-fx.js',
  '/battle-hints.js',
  '/pack-shuffle.js',
  '/levels.js',
  '/mutation-book.js',
  '/field-guide.js',
  '/results.js',
  '/rules-demo.js',
  '/battle-replays.js',
  '/pack-replays.js',
  '/boss-intro.js',
  '/daily.js',
  '/rare-finds.js',
  '/trade-alerts.js',
  '/fx-packs.js',
  '/fx-cards.js',
  '/fx-battle.js',
  '/fx-menus.js',
  '/deck-share.js',
  '/whats-new.js',
  '/collection.js',
  '/a11y.js',
  '/home-life.js',
  '/card-details.js',
  '/highlights.js',
  '/pwa.js',
  '/profile.js',
  '/leaderboards.js',
  '/fx-sound.js',
  '/activity.js',
  '/fx-music.js',
  '/stats.js',
  '/share-card.js',
  '/cosmetics.js',
  '/seasons.js',
  '/tips.js',
  '/binder-tools.js',
  '/gallery.js',
  '/inbox.js',
  '/spectate.js',
  '/duel-emotes.js',
  '/settings.js',
  '/presence.js',
  '/friend-notes.js',
  '/screenshot-mode.js',
  '/save-safety.js',
  '/look-a.js',
  '/comfort.js',
  '/help.js',
  '/weekly-recap.js',
  '/milestones.js',
  // Imported by the modules above (modulepreload links in the page) and by the page's own script.
  '/card-engine.js',
  '/card-progression.js',
  '/combat-rules.js',
  '/fx-level.js',
  '/profile-items.js',
  '/achievements.js',
  '/lore.js',
  '/vendor/three.module.min.js',
  '/vendor/GLTFLoader.js',
  '/vendor/utils/SkeletonUtils.js',
  // Stylesheet, app manifest, and the offline note this worker adds to the page it serves.
  '/theme.css',
  '/manifest.webmanifest',
  '/offline-note.js',
];

/* Art, fonts and branding that solo play draws with: the creature atlas and single art, the
 * interface art manifest, every font face, and the icons the page and the manifest point at. */
const CORE_MEDIA = [
  '/art/mythlings-atlas-v2.webp',
  '/art/mythlings/cindermane.webp',
  '/art/mythlings/glacipaw.webp',
  '/art/mythlings/mosshell.webp',
  '/art/mythlings/noctalon.webp',
  '/art/mythlings/sparquill.webp',
  '/art/mythlings/tidelotl.webp',
  '/art/bosses/frostfang.webp',
  '/art/bosses/magmarok.webp',
  '/art/bosses/thorn-guardian.webp',
  '/art/bosses/voidra.webp',
  '/art/bosses/voltitan.webp',
  '/art/ui/manifest.json',
  '/models/flaminyx.glb',
  '/fonts/cinzel-latin-600-normal.woff2',
  '/fonts/cinzel-latin-700-normal.woff2',
  '/fonts/cinzel-latin-800-normal.woff2',
  '/fonts/cormorant-garamond-latin-600-normal.woff2',
  '/fonts/cormorant-garamond-latin-700-normal.woff2',
  '/fonts/eb-garamond-latin-400-normal.woff2',
  '/fonts/eb-garamond-latin-500-normal.woff2',
  '/fonts/eb-garamond-latin-600-normal.woff2',
  '/fonts/eb-garamond-latin-700-normal.woff2',
  '/branding/emberlings-icon-32.png',
  '/branding/emberlings-icon-192.png',
  '/branding/emberlings-app-180.png',
  '/branding/emberlings-app-192.png',
  '/branding/emberlings-app-512.png',
  '/branding/emberlings-app-maskable-512.png',
  '/branding/emberlings-logo-transparent.webp',
  '/branding/emberlings-logo.webp',
  '/favicon.svg',
];
const PRECACHE = [...CORE_MODULES, ...CORE_MEDIA];

const ASSET_RE = /\.(?:webp|png|jpe?g|gif|svg|ico|avif|woff2?|ttf|otf|glb|gltf|mp3|ogg|wav)$/i;
const CODE_RE = /\.(?:m?js|css|json|webmanifest)$/i;

function kindOf(url) {
  if (url.origin !== self.location.origin) return null;
  const p = url.pathname;
  if (p.startsWith('/api/') || p === '/api') return null; // never cache online features
  if (p === '/sw.js') return null;
  // Art files carry their version in the file name, so a future picture is safe to keep even
  // when a query string asks for it fresh. Images only: /art/ui/manifest.json stays code.
  if (p.startsWith('/art/') && ASSET_RE.test(p)) return 'assets';
  if (url.search && !p.startsWith('/_next/static/')) {
    // Query strings usually mean "give me something fresh"; don't cache those (except hashed build files).
    return null;
  }
  if (ASSET_RE.test(p)) return 'assets';
  if (CODE_RE.test(p)) return 'code';
  return null;
}

let releaseMemo = null;
async function currentRelease() {
  if (releaseMemo !== null) return releaseMemo;
  try {
    const res = await (await caches.open(CACHES.meta)).match(RELEASE_KEY);
    releaseMemo = res ? await res.text() : '';
  } catch { releaseMemo = ''; }
  return releaseMemo;
}
async function setRelease(id) {
  releaseMemo = id;
  await (await caches.open(CACHES.meta)).put(RELEASE_KEY, new Response(id));
}

function cacheable(res) {
  return res && res.ok && res.status === 200 && res.type === 'basic' && !res.redirected
    && !/no-store/i.test(res.headers.get('Cache-Control') || '') && !res.headers.get('Vary')?.includes('*');
}

/* The saved body is already decoded, so drop length/encoding headers that described the wire copy. */
function cleanHeaders(source) {
  const headers = new Headers(source);
  headers.delete('Content-Length'); headers.delete('Content-Encoding');
  return headers;
}

async function stamp(res, release) {
  const headers = cleanHeaders(res.headers);
  headers.set(GEN_HEADER, release);
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers });
}

async function trim(name) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  const extra = keys.length - LIMITS[name === CACHES.code ? 'code' : 'assets'];
  for (let i = 0; i < extra; i++) await cache.delete(keys[i]); // oldest first
}

async function store(name, request, res) {
  if (!cacheable(res)) return;
  const cache = await caches.open(name);
  await cache.put(request, await stamp(res, await currentRelease()));
  trim(name).catch(() => { });
}

/* Fetch from the network and save a copy. `wait` keeps the worker alive until the copy is saved. */
async function fetchAndStore(name, request, wait) {
  const res = await fetch(request);
  if (cacheable(res)) wait(store(name, request, res.clone()).catch(() => { }));
  return res;
}

const refreshing = new Set();
function refreshLater(event, name, request) {
  if (refreshing.has(request.url)) return;
  refreshing.add(request.url);
  event.waitUntil(fetch(request).then(res => cacheable(res) ? store(name, request, res) : undefined)
    .catch(() => { }).finally(() => refreshing.delete(request.url)));
}

/* Save the solo-play list once, when the worker installs. A file that can't be fetched is simply
 * left for the next visit to fill in: one missing picture never stops the install, and a slow
 * connection can't hold the new worker back for long (the page caches what it loads anyway). */
const PRECACHE_PARALLEL = 6;
const PRECACHE_DEADLINE_MS = 20000;

async function precacheCore() {
  const queue = PRECACHE.slice();
  const deadline = Date.now() + PRECACHE_DEADLINE_MS;
  let at = 0;
  async function worker() {
    while (at < queue.length && Date.now() < deadline) {
      const path = queue[at++];
      let url; try { url = new URL(path, self.location.origin); } catch { continue; }
      const kind = kindOf(url); if (!kind) continue;
      try {
        const cache = await caches.open(CACHES[kind]);
        const request = new Request(url.href, { credentials: 'same-origin' });
        if (await cache.match(request)) continue;
        const res = await fetch(request);
        if (cacheable(res)) await cache.put(request, await stamp(res, await currentRelease()));
      } catch { /* offline or not there yet: the page will cache it on its next visit */ }
    }
  }
  await Promise.all(Array.from({ length: PRECACHE_PARALLEL }, worker));
}

async function staticResponse(event, kind) {
  const name = CACHES[kind];
  const request = event.request;
  const hit = await (await caches.open(name)).match(request);
  if (hit) {
    const stale = hit.headers.get(GEN_HEADER) !== await currentRelease();
    // Code is always re-checked quietly (cheap: the server answers "not changed");
    // pictures only after a new release.
    if (kind === 'code' || stale) refreshLater(event, name, request);
    return hit;
  }
  return fetchAndStore(name, request, p => event.waitUntil(p));
}

async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* game/index.html belongs to the core game, so the worker adds the offline note module to the copy
 * it hands the browser. The saved page and the live page get the same copy, and a page that already
 * carries the module is left alone. */
function withOfflineNote(html) {
  return html.includes('/offline-note.js') ? html : html.replace('</body>', NOTE_SCRIPT + '</body>');
}

async function pageFromNetwork(request) {
  const res = await fetch(request);
  if (!res.ok || res.type !== 'basic' || res.redirected || !/text\/html/i.test(res.headers.get('Content-Type') || '')) return res;
  const text = await res.text();
  const id = await sha(text);
  if (id !== await currentRelease()) {
    // New release: drop cached code before the page asks for its scripts.
    await caches.delete(CACHES.code);
    await setRelease(id);
  }
  const headers = cleanHeaders(res.headers);
  const copy = new Response(withOfflineNote(text), { status: 200, headers });
  (await caches.open(CACHES.page)).put(PAGE_KEY, copy.clone()).catch(() => { });
  return copy;
}

async function pageResponse(event) {
  const network = pageFromNetwork(event.request);
  const cached = await (await caches.open(CACHES.page)).match(PAGE_KEY);
  if (!cached) {
    try { return await network; } catch { return offlinePage(); }
  }
  // A cached copy exists: wait for the network (so new releases show up), but don't hang forever on a bad connection.
  let timer;
  const timeout = new Promise(resolve => { timer = setTimeout(() => resolve(null), PAGE_TIMEOUT_MS); });
  try {
    const res = await Promise.race([network, timeout]);
    if (res) return res;
    event.waitUntil(network.catch(() => { }));
    return cached;
  } catch {
    return markOffline(cached); // no connection: the saved copy, flagged so the page can say so
  } finally { clearTimeout(timer); }
}

async function markOffline(res) {
  const html = (await res.text()).replace('</head>', '<meta name="emberlings-served-offline" content="1"></head>');
  return new Response(html, { status: 200, headers: res.headers });
}

/* Any other same-origin address (an old link, a saved shortcut) opens the network copy while there
 * is one; with no connection it opens the saved game page, which is the whole game anyway. */
async function navigationResponse(event) {
  try {
    return await fetch(event.request);
  } catch {
    const cached = await (await caches.open(CACHES.page)).match(PAGE_KEY);
    return cached ? markOffline(cached) : offlinePage();
  }
}

function offlinePage() {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0a1029"><title>EMBERLINGS — Offline</title>
<style>html,body{margin:0;height:100%;background:radial-gradient(circle at 50% -5%,#35317a,#0a1029 58%) #0a1029;color:#eff8ff;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
main{min-height:100%;display:grid;place-items:center;padding:max(24px,env(safe-area-inset-top)) 20px max(24px,env(safe-area-inset-bottom));box-sizing:border-box;text-align:center}
.card{max-width:420px;padding:28px 24px;border:1px solid #b89a5a;border-radius:18px;background:#121b40e6;box-shadow:0 18px 40px #000a}
h1{margin:0 0 8px;font-size:26px;letter-spacing:2px;color:#ffdd7a}p{margin:8px 0;color:#bdc8e8;line-height:1.45}
button{margin-top:14px;font:inherit;font-weight:800;color:#2a1405;background:linear-gradient(180deg,#ffe9a8,#e0a948);border:0;border-radius:24px;padding:12px 26px;cursor:pointer}</style></head>
<body><main><div class="card"><div style="font-size:44px" aria-hidden="true">🔥</div><h1>You're offline</h1><p>EMBERLINGS needs a connection to start up the first time.</p><p>Reconnect to play online features like friends, trades, battles and cloud saves.</p><button onclick="location.reload()">Try again</button></div></main>
<script>addEventListener('online',()=>location.reload())</script></body></html>`;
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    // The page first (it also sets the release the saved files are stamped with), then solo play.
    await pageFromNetwork(new Request(PAGE_KEY, { cache: 'no-store' })).catch(() => { });
    await precacheCore();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set(Object.values(CACHES));
    for (const name of await caches.keys()) if (name.startsWith(PREFIX) && !keep.has(name)) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return; // straight to the network
  if (request.mode === 'navigate') {
    if (url.pathname === '/' || url.pathname === '/index.html') event.respondWith(pageResponse(event));
    else event.respondWith(navigationResponse(event)); // any other address still opens the game offline
    return;
  }
  const kind = kindOf(url);
  if (kind) event.respondWith(staticResponse(event, kind).catch(() => fetch(request)));
});

/* The page sends the files it already loaded on the first visit so they're ready next time. */
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type !== 'warm' || !Array.isArray(data.urls)) return;
  event.waitUntil((async () => {
    for (const raw of data.urls.slice(0, 200)) {
      let url; try { url = new URL(raw, self.location.origin); } catch { continue; }
      const kind = kindOf(url); if (!kind) continue;
      const req = new Request(url.href, { credentials: 'same-origin' });
      if (await (await caches.open(CACHES[kind])).match(req)) continue;
      try { const jobs = []; await fetchAndStore(CACHES[kind], req, p => jobs.push(p)); await Promise.all(jobs); } catch { }
    }
  })());
});
