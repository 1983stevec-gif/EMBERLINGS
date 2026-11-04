/* EMBERLINGS service worker: makes the second visit fast and keeps working offline.
 *
 *  - Pictures, fonts and 3D models: served from the cache first (they rarely change).
 *    After a new release they are re-checked quietly in the background.
 *  - Game code (/*.js, /theme.css, JSON): served from the cache, and re-checked in the
 *    background every visit. If the game page itself changed (a new release), the
 *    cached code is thrown away first so the new page always gets the new code.
 *  - The game page (/): always fetched from the network first. The cache is only used
 *    when there is no connection, and if nothing is cached a friendly offline page shows.
 *  - /api/ (accounts, saves, friends, trades, battles) and anything that isn't a plain
 *    GET is never touched: the browser sends it straight to the server.
 *
 * Bump VERSION when this file's caching rules change; old caches are removed on activate.
 */
const VERSION = 'v1';
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

const ASSET_RE = /\.(?:webp|png|jpe?g|gif|svg|ico|avif|woff2?|ttf|otf|glb|gltf|mp3|ogg|wav)$/i;
const CODE_RE = /\.(?:m?js|css|json|webmanifest)$/i;

function kindOf(url) {
  if (url.origin !== self.location.origin) return null;
  const p = url.pathname;
  if (p.startsWith('/api/') || p === '/api') return null; // never cache online features
  if (p === '/sw.js') return null;
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
  const copy = new Response(text, { status: 200, headers });
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
  event.waitUntil(pageFromNetwork(new Request(PAGE_KEY, { cache: 'no-store' })).catch(() => { }));
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
