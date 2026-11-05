// Trade Room fit check: two new players befriend at desktop size, then player A (reopened at each screen size)
// invites B, B opens the invitation, and the Trade Room, the card picker and an offer are checked and photographed.
// Usage: OUT=/tmp/shots node traderoom.cjs   (SIZES=390x844,... to limit; PREFIX for file names)
const { chromium } = require('playwright');
const { open } = require('./lib.cjs');
const check = require('./check.cjs');
const OUT = process.env.OUT || require('./lib.cjs').DATA, PFX = process.env.PREFIX || 'fit-', TAG = process.env.TAG || 'run';
const ALL = [[1366, 900, false], [1536, 1024, false], [768, 1024, true], [1024, 768, true], [390, 844, true], [360, 740, true]];
const SIZES = process.env.SIZES ? ALL.filter(([w, h]) => process.env.SIZES.split(',').includes(w + 'x' + h)) : ALL;
(async () => {
  const b = await chromium.launch(); const sum = {};
  for (const [W, H, touch] of SIZES) {
    const sz = W + 'x' + H, s = Date.now() % 1e5, An = 'TrA' + s, Bn = 'TrB' + s;
    const a0 = await open(1366, 900, false, { browser: b, name: An }), bb = await open(1366, 900, false, { browser: b, name: Bn });
    for (const q of [a0.p, bb.p]) q.on('dialog', d => d.accept());
    await a0.p.evaluate(() => EmberBridge.go('friends')); await a0.p.waitForTimeout(2500);
    await a0.p.fill('.uiXFInput', Bn); await a0.p.click('.uiXFFind'); await a0.p.waitForTimeout(1500); await a0.p.click('#yesFriend').catch(() => { }); await a0.p.waitForTimeout(1500);
    await bb.p.evaluate(() => EmberBridge.go('friends')); await bb.p.waitForTimeout(3000); await bb.p.click('[data-friend-accept]'); await bb.p.waitForTimeout(2000);
    const st = await a0.ctx.storageState(); await a0.ctx.close();
    const { ctx, p } = await open(W, H, touch, { browser: b, storageState: st }); p.on('dialog', d => d.accept());
    await bb.p.evaluate(() => EmberBridge.go('home'));
    await p.evaluate(() => EmberBridge.go('trading')); await p.waitForTimeout(3000);
    await p.evaluate(() => document.querySelector('[data-trade-invite]')?.click()); await p.waitForTimeout(1500);
    await bb.p.waitForSelector('#tradeAlert .tradeAlertOpen', { timeout: 25000 }); await bb.p.click('#tradeAlert .tradeAlertOpen'); await bb.p.waitForTimeout(3000);
    await bb.p.click('[data-trade-open]'); await bb.p.waitForTimeout(3000);
    for (let k = 0; k < 20 && await p.evaluate(() => EmberBridge.view) !== 'trade'; k++) await p.waitForTimeout(500);
    await p.waitForTimeout(1500);
    const res = {};
    res.room = await check(p, touch); await p.screenshot({ path: `${OUT}/${PFX}${TAG}-${sz}-tradeRoom.png` });
    await p.evaluate(() => (document.querySelector('#uiXTRAdd:not([disabled]),#tpRAdd') || document.querySelector('#tradeAdd'))?.click()); await p.waitForTimeout(1000);
    res.picker = await check(p, touch); await p.screenshot({ path: `${OUT}/${PFX}${TAG}-${sz}-tradePicker.png` });
    await p.evaluate(() => document.querySelector('[data-trade-creature]')?.click()); await p.waitForTimeout(2000);
    await p.evaluate(() => [...document.querySelectorAll('#tradePicker button')].find(x => /close|done/i.test(x.textContent))?.click()); await p.waitForTimeout(800);
    await bb.p.evaluate(() => document.querySelector('#tradeAdd')?.click()); await bb.p.waitForTimeout(900); await bb.p.evaluate(() => document.querySelector('[data-trade-creature]')?.click()); await bb.p.waitForTimeout(2500);
    res.offer = await check(p, touch); await p.screenshot({ path: `${OUT}/${PFX}${TAG}-${sz}-tradeOffer.png` });
    for (const k in res) { console.log(sz, k, res[k].length ? res[k].map(r => r[0] + ': ' + r[1]).join('\n      ') : 'ok'); for (const [t] of res[k]) sum[t] = (sum[t] || 0) + 1; }
    if (p.errs.length) console.log(sz, 'page errors', p.errs.slice(0, 4));
    await ctx.close(); await bb.ctx.close();
  }
  console.log('SUMMARY trade', TAG, JSON.stringify(sum));
  await b.close();
})();
