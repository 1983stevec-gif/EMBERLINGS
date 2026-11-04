const { chromium } = require('playwright');
(async () => {
  const W = +(process.env.W || 1366), H = +(process.env.H || 900);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: H }, hasTouch: W < 1000 }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto((process.env.BASE || 'http://127.0.0.1:8848') + '/'); await p.waitForTimeout(2500);
  const i = await p.$('input[type=text], input:not([type])'); if (i && await i.isVisible()) { await i.fill('Day' + Date.now() % 1e5); await p.keyboard.press('Enter'); await p.waitForTimeout(2000); }
  await p.evaluate(() => { const B = EmberBridge; B.state.guidedTour = { active: false }; document.querySelectorAll('#guidedTour').forEach(e => e.remove()); B.save(); B.go('packs'); }); await p.waitForTimeout(800);
  await p.evaluate(() => EmberBridge.go('home')); await p.waitForTimeout(2000);
  console.log('auto panel:', !!(await p.$('#dailyPanel')), 'btn:', !!(await p.$('#dailyBtn')));
  await p.screenshot({ path: 'daily-' + W + '.png' });
  const c0 = await p.evaluate(() => EmberBridge.state.coins); await p.click('#dClaimLogin'); await p.waitForTimeout(800);
  console.log('login claim coins', c0, '->', await p.evaluate(() => EmberBridge.state.coins), 'claim again disabled:', await p.$eval('#dClaimLogin', b => b.disabled));
  // Real action: buy a Wonder Pack and confirm the "Open a pack" quest counts it
  await p.evaluate(() => { const d = EmberBridge.state.daily; d.quests = [{ id: 'pack', progress: 0, claimed: false }, { id: 'win2', progress: 0, claimed: false }, { id: 'level', progress: 0, claimed: false }]; EmberBridge.state.coins += 1000; EmberBridge.save(); document.querySelector('#dailyPanel')?.remove(); EmberBridge.go('packs'); });
  await p.waitForTimeout(1200); await p.click('[data-buy="pack"]'); await p.waitForTimeout(1200); await p.click('#confirmPack'); await p.waitForTimeout(4000);
  await p.evaluate(() => EmberBridge.go('home')); await p.waitForTimeout(1500);
  console.log('pack quest progress:', await p.evaluate(() => JSON.stringify(EmberBridge.state.daily.quests)));
  await p.evaluate(() => { EmberDaily.bump('win'); EmberDaily.bump('win'); EmberDaily.bump('level'); }); 
  await p.click('#dailyBtn'); await p.waitForTimeout(600);
  await p.screenshot({ path: 'daily-quests-' + W + '.png' });
  const c1 = await p.evaluate(() => EmberBridge.state.coins);
  for (const id of ['pack', 'win2', 'level']) { await p.click(`[data-claim-quest="${id}"]`); await p.waitForTimeout(500); }
  const passes0 = await p.evaluate(() => EmberBridge.state.items?.trainingPasses || 0); await p.click('#dClaimBonus'); await p.waitForTimeout(500);
  console.log('quests coins', c1, '->', await p.evaluate(() => EmberBridge.state.coins), 'passes', passes0, '->', await p.evaluate(() => EmberBridge.state.items.trainingPasses));
  console.log('weekly after 2 wins:', await p.evaluate(() => EmberBridge.state.daily.weekly.progress));
  await p.evaluate(() => { EmberBridge.state.daily.weekly.progress = 10; EmberBridge.save(); EmberDaily.open(); }); await p.waitForTimeout(400);
  const rp0 = await p.evaluate(() => (EmberBridge.state.rewardPacks || []).length); await p.click('#dClaimWeek'); await p.waitForTimeout(500);
  console.log('weekly pack:', rp0, '->', await p.evaluate(() => JSON.stringify((EmberBridge.state.rewardPacks || []).map(r => r.packId))));
  // Day 7 of a streak
  await p.evaluate(() => { const d = EmberBridge.state.daily, y = new Date(); y.setDate(y.getDate() - 1); d.lastClaim = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`; d.streak = 6; EmberBridge.save(); EmberDaily.open(); }); await p.waitForTimeout(400);
  console.log('day7 label:', await p.$eval('#dClaimLogin', b => b.textContent)); await p.click('#dClaimLogin'); await p.waitForTimeout(500);
  console.log('after day7:', await p.evaluate(() => JSON.stringify({ streak: EmberBridge.state.daily.streak, packs: EmberBridge.state.rewardPacks.map(r => r.packId) })));
  await p.screenshot({ path: 'daily-done-' + W + '.png' });
  // reload keeps state; no second auto popup
  await p.reload(); await p.waitForTimeout(3000); await p.evaluate(() => EmberBridge.go('home')); await p.waitForTimeout(1500);
  console.log('after reload panel auto:', !!(await p.$('#dailyPanel')), 'claimed today:', await p.evaluate(() => EmberBridge.state.daily.lastClaim));
  console.log('errors:', errs);
  await b.close();
})();
