const { chromium } = require('playwright');
const quiet = require('./quiet.cjs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); const bad = [], errs = [];
  p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); }); p.on('pageerror', e => errs.push(e.message));
  await p.goto((process.env.BASE || 'http://127.0.0.1:8848') + '/'); await p.waitForTimeout(2500);
  await p.screenshot({ path: 'art-welcome.png' });
  const i = await p.$('input[type=text], input:not([type])'); if (i && await i.isVisible()) { await i.fill('Art' + Date.now() % 1e5); await p.keyboard.press('Enter'); await p.waitForTimeout(2000); }
  await quiet(p); await p.evaluate(() => EmberBridge.go('inventory')); await p.waitForTimeout(2500);
  const broken = await p.evaluate(() => [...document.images].filter(im => im.complete && im.naturalWidth === 0).map(im => im.src));
  await p.screenshot({ path: 'art-binder.png' });
  console.log('http errors:', bad, 'broken imgs:', broken, 'errors:', errs);
  await b.close();
})();
