// Creates one sweep test player per screen size (each with friend B, lots of coins, shiny / rare cards) and saves each browser state.
const { chromium } = require('playwright');
const { open } = require('./lib.cjs');
const D = require('./lib.cjs').DATA;
const SIZES = ['1366x900', '1536x1024', '768x1024', '1024x768', '390x844', '360x740'];
(async () => {
  const b = await chromium.launch();
  const s = Date.now() % 1e5, Bn = 'FitB' + s;
  const bb = await open(1366, 900, false, { browser: b, name: Bn });
  const names = { B: Bn };
  await Promise.all(SIZES.map(async (sz, i) => {
    const A = 'FitA' + s + '_' + i;
    const a = await open(1366, 900, false, { browser: b, name: A });
    const p = a.p; p.on('dialog', d => d.accept());
    await p.evaluate(() => EmberBridge.go('friends')); await p.waitForTimeout(2500);
    await p.fill('.uiXFInput', Bn); await p.click('.uiXFFind'); await p.waitForTimeout(1500); const yes = await p.$('#yesFriend'); if (yes) await yes.click(); await p.waitForTimeout(1500);
    await p.evaluate(() => { const B = EmberBridge; B.state.coins = 1e6; B.save(); });
    await p.evaluate(() => EmberBridge.go('packs')); await p.waitForTimeout(1500);
    await p.evaluate(() => { if (!window.__r) window.__r = Math.random; const r = window.__r; let n = 0; Math.random = () => (n++ < 400 ? 0.004 : r()); });
    await p.click('[data-buy="legend"]'); await p.waitForTimeout(1200);
    const c = await p.$('#confirmPack'); if (c) await c.click(); await p.waitForTimeout(4000);
    const ra = await p.$('#revealAll'); if (ra) { await ra.click(); await p.waitForTimeout(5000); }
    await p.evaluate(() => { Math.random = window.__r; for (let k = 0; k < 12; k++) { const ok = document.querySelector('#rareFind .rfOk'); if (!ok) break; ok.click(); } });
    await p.evaluate(() => { EmberBridge.state.coins = 1e6; EmberBridge.save(); EmberBridge.go('home'); }); await p.waitForTimeout(2500);
    await a.ctx.storageState({ path: `${D}/state-${sz}.json` });
    names[sz] = A; console.log(sz, A, p.errs);
  }));
  await bb.p.evaluate(() => EmberBridge.go('friends')); await bb.p.waitForTimeout(3000);
  for (let k = 0; k < 8; k++) { const acc = await bb.p.$('[data-friend-accept]'); if (!acc) break; await acc.click(); await bb.p.waitForTimeout(2000); }
  require('fs').writeFileSync(D + '/names.json', JSON.stringify(names));
  console.log('ok', names);
  await b.close();
})();
