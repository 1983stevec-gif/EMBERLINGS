const { chromium } = require('playwright');
const quiet = require('./quiet.cjs');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const W = +(process.env.W || 1366), H = +(process.env.H || 900), touch = !!process.env.TOUCH;
  const mk = async (name) => { const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, hasTouch: touch }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('dialog', d => d.accept()); await p.goto((process.env.BASE || 'http://127.0.0.1:8848') + '/'); await p.waitForTimeout(2500); const i = await p.$('input[type=text], input:not([type])'); if (i && await i.isVisible()) { await i.fill(name); await p.keyboard.press('Enter'); await p.waitForTimeout(2500); } await quiet(p); return p; };
  const s = Date.now() % 1e5, A = 'Ava' + s, Bn = 'Bo' + s;
  const pa = await mk(A), pb = await mk(Bn);
  await pa.evaluate(() => EmberBridge.go('friends')); await pa.waitForTimeout(2500);
  await pa.fill('.uiXFInput', Bn); await pa.click('.uiXFFind'); await pa.waitForTimeout(1500); const yes = await pa.$('#yesFriend'); if (yes) await yes.click(); await pa.waitForTimeout(1500);
  await pb.evaluate(() => EmberBridge.go('friends')); await pb.waitForTimeout(3000); await pb.click('[data-friend-accept]'); await pb.waitForTimeout(2000);
  if (W !== 1366) for (const q of [pa, pb]) await q.setViewportSize({ width: W, height: H });
  await pb.evaluate(() => EmberBridge.go('home')); await pb.waitForTimeout(500);
  await pa.evaluate(() => EmberBridge.go('home')); await pa.waitForTimeout(400); await pa.evaluate(() => EmberBridge.go('trading')); await pa.waitForTimeout(3000);
  await pa.click(W >= 1000 ? '#uiXTSend' : '#tpTSend'); await pa.waitForTimeout(1500);
  // The pop-up disappears after 12 s, so wait for it instead of a fixed delay.
  await pb.waitForSelector('#tradeAlert .tradeAlertOpen', { timeout: 25000 }); await pb.waitForTimeout(500);
  console.log('B badge:', await pb.evaluate(() => [...document.querySelectorAll('.uiTradeBadge')].map(x => x.hidden ? 'hidden' : x.textContent).join(',')), 'alert:', await pb.evaluate(() => document.querySelector('#tradeAlert')?.textContent.trim()));
  await pb.screenshot({ path: 'alert-' + W + '.png' });
  await pb.click('.tradeAlertOpen'); await pb.waitForTimeout(3500);
  console.log('B view after Open:', await pb.evaluate(() => EmberBridge.view));
  await pb.click('[data-trade-open]'); await pb.waitForTimeout(3500);
  await pa.waitForTimeout(3000); console.log('A view:', await pa.evaluate(() => EmberBridge.view));
  for (const [p, n] of [[pa, 2], [pb, 1]]) { for (let k = 0; k < n; k++) { await p.click(W >= 1000 ? '#uiXTRAdd' : '#tpRAdd'); await p.waitForTimeout(900); const cards = await p.$$('[data-trade-creature]'); await cards[k].click(); await p.waitForTimeout(1800); const close = await p.$('#tradePicker button.gold, #tradePicker [data-close]'); if (close && await close.isVisible()) { await close.click(); await p.waitForTimeout(500); } } }
  await pa.waitForTimeout(3500); await pb.waitForTimeout(1500);
  for (const p of [pa, pb]) { await p.click('#tradeAccept'); await p.waitForTimeout(3500); }
  await pa.waitForTimeout(4000); await pb.waitForTimeout(1000);
  console.log('A done popup:', await pa.evaluate(() => document.querySelector('#tradeDone')?.innerText.replace(/\s+/g, ' ').slice(0, 160)));
  console.log('B done popup:', await pb.evaluate(() => document.querySelector('#tradeDone')?.innerText.replace(/\s+/g, ' ').slice(0, 160)));
  await pa.screenshot({ path: 'done-' + W + '.png' });
  await pa.evaluate(() => document.querySelector('#tradeDone .tdClose')?.click()); await pa.evaluate(() => EmberBridge.go('home')); await pa.waitForTimeout(400); await pa.evaluate(() => EmberBridge.go('trading')); await pa.waitForTimeout(2500);
  await pa.screenshot({ path: 'trading-hist-btn-' + W + '.png' });
  await pa.click('.thOpen'); await pa.waitForTimeout(800); await pa.screenshot({ path: 'hist-' + W + '.png' });
  console.log('history items:', await pa.evaluate(() => EmberBridge.state.tradeHistory.length), 'owned:', await pa.evaluate(() => EmberBridge.state.owned.length), await pb.evaluate(() => EmberBridge.state.owned.length));
  console.log('errors:', errs.slice(0, 4));
  await b.close();
})();
