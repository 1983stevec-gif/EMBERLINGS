const { chromium } = require('playwright');
(async () => {
  const W = +(process.env.W || 768), H = +(process.env.H || 1024);
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: W < 1000 }); const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p); await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 70, downloadThroughput: 9 * 1024 * 1024 / 8, uploadThroughput: 3 * 1024 * 1024 / 8 });
  const reqs = new Map(); cdp.on('Network.responseReceived', e => reqs.set(e.requestId, { url: e.response.url, type: e.type })); cdp.on('Network.loadingFinished', e => { const r = reqs.get(e.requestId); if (r) r.bytes = e.encodedDataLength; });
  const t0 = Date.now(); await p.goto((process.env.BASE || 'http://127.0.0.1:8848') + '/' + (process.env.PATHQ || ''), { waitUntil: 'load' }); const tLoad = Date.now() - t0;
  await p.waitForTimeout(4000);
  const lcp = await p.evaluate(() => new Promise(r => { new PerformanceObserver(l => { const e = l.getEntries(); r(Math.round(e[e.length - 1].startTime)); }).observe({ type: 'largest-contentful-paint', buffered: true }); setTimeout(() => r(-1), 1000); }));
  const fcp = await p.evaluate(() => Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || -1));
  const list = [...reqs.values()].filter(r => r.bytes); const total = list.reduce((n, r) => n + r.bytes, 0);
  const byType = {}; for (const r of list) byType[r.type] = (byType[r.type] || 0) + r.bytes;
  console.log(JSON.stringify({ W, loadMs: tLoad, fcp, lcp, requests: list.length, totalKB: Math.round(total / 1024), byTypeKB: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v / 1024)])) }));
  console.log(list.sort((a, b) => b.bytes - a.bytes).slice(0, 25).map(r => Math.round(r.bytes / 1024) + 'KB ' + r.url.replace(process.env.BASE || 'http://127.0.0.1:8848', '')).join('\n'));
  await b.close();
})();
