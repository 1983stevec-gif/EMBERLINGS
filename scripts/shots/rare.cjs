const { chromium } = require('playwright');
(async () => {
  const W = +(process.env.W || 1366), H = +(process.env.H || 900);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: H }, hasTouch: W < 1000 }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto((process.env.BASE || 'http://127.0.0.1:8848') + '/'); await p.waitForTimeout(2500);
  const i = await p.$('input[type=text], input:not([type])'); if (i && await i.isVisible()) { await i.fill('Rare' + Date.now() % 1e5); await p.keyboard.press('Enter'); await p.waitForTimeout(2000); }
  await p.evaluate(() => { const B = EmberBridge; B.state.guidedTour = { active: false }; document.querySelectorAll('#guidedTour').forEach(e => e.remove()); B.state.coins = 100000; B.save(); });
  await p.evaluate(() => EmberBridge.go('packs')); await p.waitForTimeout(1500);
  await p.evaluate(() => { const r = Math.random; let n = 0; Math.random = () => (n++ < 400 ? 0.004 : r()); });
  const btn = await p.$('[data-buy="legend"], [data-pack="legend"], [data-open="legend"]'); console.log('legend btn', !!btn);
  if (btn) await btn.click(); await p.waitForTimeout(1500);
  const buy = await p.$('#confirmPack, [data-confirm-pack], #buyPack'); console.log('confirm', !!buy, await p.evaluate(() => EmberBridge.view));
  if (buy) await buy.click(); await p.waitForTimeout(4000);
  console.log('view', await p.evaluate(() => EmberBridge.view), 'owned tail', await p.evaluate(() => JSON.stringify(EmberBridge.state.owned.slice(-5).map(c => [c.kind, c.rarity, c.mutation, c.shiny]))));
  console.log('reveal buttons:', await p.evaluate(() => [...document.querySelectorAll('#app button, #app [data-reveal], #app .packCardBack')].map(e => (e.id || '') + '|' + (e.className || '') + '|' + Object.keys(e.dataset).join(',') + '|' + e.textContent.trim().slice(0, 20)).slice(0, 15).join('\n')));
  for (let k = 0; k < 8; k++) { const nb = await p.$('#revealNext, [data-reveal-next], #nextReveal, #packNext'); if (!nb) break; await nb.click(); await p.waitForTimeout(3800); if (await p.$('#rareFind')) break; }
  for (let k = 0; k < 12 && !(await p.$('#rareFind')); k++) await p.waitForTimeout(500); await p.waitForTimeout(700);
  console.log('banner:', await p.evaluate(() => document.querySelector('#rareFind')?.innerText.replace(/\s+/g, ' ')));
  await p.screenshot({ path: 'rare-' + W + '.png' });
  await p.evaluate(() => document.querySelector('#rareFind .rfOk')?.click());
  await p.evaluate(() => EmberBridge.go('achievements')); await p.waitForTimeout(1500);
  await p.screenshot({ path: 'rare-profile-' + W + '.png' });
  console.log('profile:', await p.evaluate(() => document.querySelector('.rfProfile')?.innerText.replace(/\s+/g, ' ')), errs);
  await b.close();
})();
