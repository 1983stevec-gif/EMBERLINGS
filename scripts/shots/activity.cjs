// Friend activity: two live players befriend; A pulls a rare card from a Legend Pack (lucky rolls), wins a boss quest
// (sent as the same ember:cardResult the Victory screen emits) and reaches Level 25; B sees the feed and cheers; A sees
// the cheer; sharing off posts nothing. Screenshots act-*.png at desktop, tablet and phone. Needs `npm run db:local`.
const { chromium } = require('playwright');
const quiet = require('./quiet.cjs');
const OUT = process.env.OUT || './';
const BASE = process.env.BASE || 'http://127.0.0.1:8848';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const watch = (p, name) => { p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(name + ' console: ' + m.text()); }); p.on('dialog', d => d.accept()); p.on('response', r => { if (r.status() >= 400) errs.push(name + ' HTTP ' + r.status() + ' ' + r.url()); }); };
  const mk = async (name) => { const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } }); const p = await ctx.newPage(); watch(p, name); await p.goto(BASE + '/'); await p.waitForTimeout(2500); const i = await p.$('input[type=text], input:not([type])'); if (i && await i.isVisible()) { await i.fill(name); await p.keyboard.press('Enter'); await p.waitForTimeout(2500); } await quiet(p); return p; };
  const s = Date.now() % 1e5, A = 'Mira' + s, Bn = 'Bo' + s;
  const pa = await mk(A), pb = await mk(Bn);
  await pa.evaluate(() => EmberBridge.go('friends')); await pa.waitForTimeout(2500);
  await pa.fill('.uiXFInput', Bn); await pa.click('.uiXFFind'); await pa.waitForTimeout(1500); const yes = await pa.$('#yesFriend'); if (yes) await yes.click(); await pa.waitForTimeout(1500);
  await pb.evaluate(() => EmberBridge.go('friends')); await pb.waitForTimeout(3000); await pb.click('[data-friend-accept]'); await pb.waitForTimeout(2000);
  await pb.evaluate(() => EmberBridge.go('home'));
  // A: rare pack pull (lucky rolls, like rare.cjs)
  await pa.evaluate(() => { const B = EmberBridge; B.state.coins = 100000; B.save(); EmberActivity.refresh(); });
  await pa.evaluate(() => EmberBridge.go('packs')); await pa.waitForTimeout(1500);
  await pa.evaluate(() => { const r = Math.random; let n = 0; Math.random = () => (n++ < 400 ? 0.004 : r()); });
  const btn = await pa.$('[data-buy="legend"], [data-pack="legend"], [data-open="legend"]'); if (btn) await btn.click(); await pa.waitForTimeout(1500);
  const buy = await pa.$('#confirmPack, [data-confirm-pack], #buyPack'); if (buy) await buy.click(); await pa.waitForTimeout(4000);
  for (let k = 0; k < 8; k++) { const nb = await pa.$('#revealNext, [data-reveal-next], #nextReveal, #packNext'); if (!nb) break; await nb.click(); await pa.waitForTimeout(3800); if (await pa.$('#rareFind')) break; }
  await pa.waitForTimeout(3000); await pa.evaluate(() => document.querySelector('#rareFind .rfOk')?.click());
  await pa.evaluate(() => EmberBridge.go('home')); await pa.waitForTimeout(1500);
  // A: boss quest win (the core emits ember:cardResult on the Victory screen; sent the same way here) and a level 25 milestone via grantXP
  await pa.evaluate(() => { dispatchEvent(new CustomEvent('ember:cardResult', { detail: { id: 'boss-test-' + Date.now(), victory: true, draw: false, level: 25, reason: 'test' } })); });
  await pa.evaluate(() => { const B = EmberBridge, c = B.state.owned[0]; c.level = 24; c.xp = 0; B.grantXP(c, 24 * 60 + 5); B.save(); });
  await pa.waitForTimeout(4000);
  const aMine = await pa.evaluate(async () => { await EmberActivity.refresh(); return EmberActivity.feed().mine.map(e => e.type + ':' + (e.level || e.card?.rarity)); });
  console.log('A posted:', aMine);
  // B: unread dot, then feed
  await pb.evaluate(() => EmberActivity.refresh()); await pb.waitForTimeout(1500);
  console.log('B dot visible:', await pb.evaluate(() => [...document.querySelectorAll('.actDot')].filter(d => !d.hidden).length));
  await pb.screenshot({ path: OUT + 'act-dot-desktop.png' });
  await pb.evaluate(() => EmberBridge.go('friends')); await pb.waitForTimeout(4000);
  await pb.evaluate(() => document.querySelector('#actPanel')?.scrollIntoView());
  console.log('B feed:', await pb.evaluate(() => [...document.querySelectorAll('#actPanel .actItem .actLine')].map(x => x.textContent)));
  await pb.screenshot({ path: OUT + 'act-feed-desktop.png' });
  await pb.click('#actPanel [data-act-cheer]'); await pb.waitForTimeout(1500);
  console.log('B after cheer:', await pb.evaluate(() => document.querySelector('#actPanel .actCheer')?.textContent.trim()), 'dot now:', await pb.evaluate(() => [...document.querySelectorAll('.actDot')].filter(d => !d.hidden).length));
  const second = await pb.evaluate(async () => { const id = EmberActivity.feed().events[0].id; try { return await EmberBridge.online('/activity/' + id + '/cheer', {}); } catch (e) { return e.message; } });
  console.log('B cheer again:', JSON.stringify(second));
  // A sees the cheer: toast + own list
  await pa.evaluate(() => EmberBridge.go('home')); await pa.waitForTimeout(800);
  await pa.evaluate(() => EmberActivity.refresh()); await pa.waitForTimeout(700);
  console.log('A toast:', await pa.evaluate(() => document.querySelector('#toast')?.textContent));
  await pa.screenshot({ path: OUT + 'act-cheer-toast-desktop.png' });
  await pa.evaluate(() => EmberBridge.go('friends')); await pa.waitForTimeout(4000);
  await pa.evaluate(() => document.querySelectorAll('.uiLvUp,[aria-label="Level up"],#rareFind').forEach(e => e.remove())); await pa.click('[data-act-tab="mine"]'); await pa.waitForTimeout(500);
  await pa.evaluate(() => document.querySelector('#actPanel')?.scrollIntoView());
  console.log('A mine:', await pa.evaluate(() => [...document.querySelectorAll('#actPanel .actItem')].map(x => x.innerText.replace(/\s+/g, ' '))));
  await pa.screenshot({ path: OUT + 'act-mine-desktop.png' });
  // Sharing off: nothing new posted
  await pa.click('.actSwitch'); await pa.waitForTimeout(2000);
  console.log('A switch:', await pa.evaluate(() => document.querySelector('.actSwitch').getAttribute('aria-checked')), 'save:', await pa.evaluate(() => JSON.stringify(EmberBridge.state.ember.activity)));
  await pa.evaluate(() => { const B = EmberBridge, c = B.state.owned[0]; c.level = 49; c.xp = 0; B.grantXP(c, 49 * 60 + 5); B.save(); });
  await pa.waitForTimeout(3000);
  console.log('B feed after A turned sharing off:', await pb.evaluate(async () => { await EmberActivity.refresh(); return EmberActivity.feed().events.length; }));
  await pa.evaluate(() => document.querySelectorAll('.uiLvUp,[aria-label="Level up"],#rareFind').forEach(e => e.remove()));
  console.log('save key present:', await pa.evaluate(() => !!localStorage.getItem('mythlings-playable-v1')));
  await pa.evaluate(() => document.querySelector('#actPanel')?.scrollIntoView());
  await pa.screenshot({ path: OUT + 'act-share-off-desktop.png' });
  // Sharing back on, post more for the other sizes
  await pa.evaluate(() => document.querySelectorAll('.uiLvUp,[aria-label="Level up"],#rareFind').forEach(e => e.remove())); await pa.click('.actSwitch'); await pa.waitForTimeout(600);
  await pa.evaluate(() => { dispatchEvent(new CustomEvent('ember:cardResult', { detail: { id: 'boss-test2-' + Date.now(), victory: true, level: 45 } })); });
  await pa.evaluate(() => { const B = EmberBridge, c = B.state.owned[1] || B.state.owned[0]; c.level = 74; c.xp = 0; B.grantXP(c, 74 * 60 + 5); B.save(); });
  await pa.waitForTimeout(3000);
  const state = await pb.context().storageState();
  for (const [w, h, tag] of [[768, 1024, 'tablet'], [390, 844, 'phone'], [1366, 900, 'desktop2']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1000, isMobile: w < 500, storageState: state });
    const p = await ctx.newPage(); watch(p, 'B-' + tag); await p.goto(BASE + '/'); await p.waitForTimeout(3000); await quiet(p);
    const keep = p.getByText("Keep this device"); if (await keep.count()) { await keep.first().click(); await p.waitForTimeout(1500); }
    await p.evaluate(() => EmberActivity.refresh()); await p.waitForTimeout(1200);
    await p.screenshot({ path: OUT + 'act-dot-' + tag + '.png' });
    console.log(tag, 'dot:', await p.evaluate(() => [...document.querySelectorAll('.actDot')].filter(d => !d.hidden && d.offsetParent).length));
    await p.evaluate(() => EmberBridge.go('friends')); await p.waitForTimeout(4500);
    await p.evaluate(() => document.querySelector('#actPanel')?.scrollIntoView());
    await p.waitForTimeout(400);
    console.log(tag, 'panel:', await p.evaluate(() => { const r = document.querySelector('#actPanel')?.getBoundingClientRect(); return r && [Math.round(r.left), Math.round(r.width)]; }), 'overflow:', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth));
    await p.screenshot({ path: OUT + 'act-feed-' + tag + '.png' });
    await p.close(); await ctx.close();
  }
  const stA = await pa.context().storageState();
  for (const [w, h, tag] of [[390, 844, 'phone'], [768, 1024, 'tablet']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 500, storageState: stA });
    const p = await ctx.newPage(); watch(p, 'A-' + tag); await p.goto(BASE + '/'); await p.waitForTimeout(3000); await quiet(p);
    const keep = p.getByText("Keep this device"); if (await keep.count()) { await keep.first().click(); await p.waitForTimeout(1500); }
    await p.evaluate(() => EmberBridge.go('friends')); await p.waitForTimeout(4500);
    await p.evaluate(() => document.querySelectorAll('.uiLvUp,[aria-label="Level up"]').forEach(e => e.remove()));
    await p.click('[data-act-tab="mine"]'); await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelector('#actPanel')?.scrollIntoView());
    console.log('A', tag, 'overflow:', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth));
    await p.screenshot({ path: OUT + 'act-mine-' + tag + '.png' });
    await p.close(); await ctx.close();
  }
  console.log('errors:', errs);
  await b.close();
})();
