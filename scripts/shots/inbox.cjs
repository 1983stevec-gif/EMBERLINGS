// Notification inbox: two live players. B gets a friend request, A's level-25 highlight, a trade invitation and a finished
// trade; A gets a cheer. Each shows in the bell's panel with the right count and action. Daily rewards and an unseen What's new
// show too; "Mark all read" persists after a reload. Panel screenshots inb-*.png at desktop, tablet and phone.
// Needs `npm run db:local`. Usage: BASE=http://127.0.0.1:8848 OUT=./ node scripts/shots/inbox.cjs
const { chromium } = require('playwright');
const quiet = require('./quiet.cjs');
const OUT = process.env.OUT || './';
const BASE = process.env.BASE || 'http://127.0.0.1:8848';
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const watch = (p, name) => { p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('dialog', d => d.accept()); };
  const mk = async (name) => { const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } }); const p = await ctx.newPage(); watch(p, name); await p.goto(BASE + '/'); await p.waitForTimeout(2500); const i = await p.$('input[type=text], input:not([type])'); if (i && await i.isVisible()) { await i.fill(name); await p.keyboard.press('Enter'); await p.waitForTimeout(2500); } await quiet(p); return p; };
  const items = p => p.evaluate(() => EmberInbox.items().map(i => `${i.unread ? '*' : ' '}${i.id.split(':')[0]} ${i.act}: ${i.text.replace(/<[^>]+>/g, '')}`));
  const bell = p => p.evaluate(() => [...document.querySelectorAll('.inbBell')].find(b => b.getClientRects().length)?.getAttribute('aria-label'));
  const openPanel = async p => { await p.evaluate(() => { EmberInbox.close(false); document.querySelector('#tradeAlert')?.remove(); }); await p.evaluate(() => [...document.querySelectorAll('.inbBell')].find(b => b.getClientRects().length).click()); await p.waitForTimeout(1800); };
  const s = Date.now() % 1e5, A = 'Ivy' + s, Bn = 'Rex' + s;
  const pa = await mk(A), pb = await mk(Bn);

  // 1. Friend request: A asks, B sees it in the inbox (from the same /me data the Friends page loads).
  await pa.evaluate(() => EmberBridge.go('friends')); await pa.waitForTimeout(2500);
  await pa.fill('.uiXFInput', Bn); await pa.click('.uiXFFind'); await pa.waitForTimeout(1500); const yes = await pa.$('#yesFriend'); if (yes) await yes.click(); await pa.waitForTimeout(1500);
  await pa.evaluate(() => EmberBridge.go('home'));
  await openPanel(pb);
  log('B bell:', await bell(pb)); log('B items:', await items(pb));
  await pb.screenshot({ path: OUT + 'inb-friendreq-1366.png' });
  const frBtn = await pb.$('.inbItem[data-inb^="fr:"] .inbAct'); log('friend request action:', frBtn && await frBtn.textContent());
  await frBtn.click(); await pb.waitForTimeout(3000); log('B view after View:', await pb.evaluate(() => EmberBridge.view));
  await pb.click('[data-friend-accept]'); await pb.waitForTimeout(2000);
  await pb.evaluate(() => EmberBridge.go('home')); await pb.waitForTimeout(800);

  // 2. Friend activity: A reaches Level 25 (shared highlight); B sees it; B cheers; A sees the cheer.
  await pa.evaluate(async () => { await EmberActivity.refresh(); const B = EmberBridge, c = B.state.owned[0]; c.level = 24; c.xp = 0; B.grantXP(c, 24 * 60 + 5); B.save(); });
  await pa.waitForTimeout(4500);
  await pb.evaluate(() => EmberActivity.refresh()); await pb.waitForTimeout(1500);
  log('B items after A highlight:', await items(pb));
  const evId = await pb.evaluate(() => EmberActivity.feed().events[0]?.id);
  log('B cheer:', JSON.stringify(await pb.evaluate(async id => { try { return await EmberBridge.online('/activity/' + id + '/cheer', {}); } catch (e) { return e.message; } }, evId)));
  await pa.evaluate(() => document.querySelectorAll('.uiLvUp,.lvlUp,.levelUpModal').forEach(e => e.remove()));
  await pa.evaluate(() => EmberActivity.refresh()); await pa.waitForTimeout(1500);
  log('A toast (unchanged pop-up):', await pa.evaluate(() => document.querySelector('#toast')?.textContent));
  await openPanel(pa); log('A bell:', await bell(pa)); log('A items:', await items(pa));
  await pa.screenshot({ path: OUT + 'inb-cheer-1366.png' });
  await pa.evaluate(() => EmberInbox.close());

  // 3. Trade invitation: A invites B; B gets the usual pop-up and the inbox item.
  await pa.evaluate(() => EmberBridge.go('trading')); await pa.waitForTimeout(3000);
  await pa.click('#uiXTSend'); await pa.waitForTimeout(1500);
  await pb.evaluate(() => EmberInbox.close(false));
  await pb.waitForSelector('#tradeAlert .tradeAlertOpen', { timeout: 25000 }); await pb.waitForTimeout(600);
  log('B pop-up still shows:', await pb.evaluate(() => document.querySelector('#tradeAlert')?.textContent.trim()));
  await pb.screenshot({ path: OUT + 'inb-bell-with-popup-1366.png' });
  await openPanel(pb); log('B bell:', await bell(pb)); log('B items:', await items(pb));
  await pb.screenshot({ path: OUT + 'inb-trade-1366.png' });
  await pb.click('.inbItem[data-inb^="ti:"] .inbAct'); await pb.waitForTimeout(3500);
  log('B view after Open trade:', await pb.evaluate(() => EmberBridge.view));

  // 4. Finish the trade (as in alerts.cjs) so "Trade complete" shows.
  await pb.click('[data-trade-open]'); await pb.waitForTimeout(3500); await pa.waitForTimeout(3000);
  for (const p of [pa, pb]) { await p.click('#uiXTRAdd'); await p.waitForTimeout(900); const cards = await p.$$('[data-trade-creature]'); await cards[0].click(); await p.waitForTimeout(1800); const close = await p.$('#tradePicker button.gold, #tradePicker [data-close]'); if (close && await close.isVisible()) { await close.click(); await p.waitForTimeout(500); } }
  await pa.waitForTimeout(3500); await pb.waitForTimeout(1500);
  for (const p of [pa, pb]) { await p.click('#tradeAccept'); await p.waitForTimeout(3500); }
  await pa.waitForTimeout(4000);
  for (const p of [pa, pb]) { await p.evaluate(() => document.querySelector('#tradeDone .tdClose')?.click()); await p.evaluate(() => EmberBridge.go('home')); await p.waitForTimeout(800); }
  log('A items after trade:', await items(pa));
  await openPanel(pb); log('B items after trade:', await items(pb));
  const tc = await pb.$('.inbItem[data-inb^="tc:"] .inbAct'); if (tc) { await tc.click(); await pb.waitForTimeout(800); log('B Past trades open:', !!await pb.$('#tradeHist')); await pb.evaluate(() => document.querySelector('#tradeHist .tdClose')?.click()); }

  // 5. What's new unseen (as for a returning player after an update) and Daily rewards ready.
  await pb.evaluate(() => { EmberBridge.state.ember.seenRelease = 'older-release'; EmberBridge.save(); EmberInbox.refresh(); });
  await openPanel(pb); log('B bell:', await bell(pb)); log('B items:', await items(pb));
  await pb.screenshot({ path: OUT + 'inb-daily-whatsnew-1366.png' });
  const wn = await pb.$('.inbItem[data-inb^="wn:"] .inbAct'); log("What's new action:", wn && await wn.textContent()); await wn.click(); await pb.waitForTimeout(800);
  log("What's new panel open:", !!await pb.$('#whatsNewPanel')); await pb.evaluate(() => window.EmberWhatsNew.close());
  await openPanel(pb); const dl = await pb.$('.inbItem[data-inb^="daily:"] .inbAct'); log('Daily action:', dl && await dl.textContent()); await dl.click(); await pb.waitForTimeout(800);
  log('Daily panel open:', !!await pb.$('#dailyPanel')); await pb.evaluate(() => document.querySelector('#dailyPanel .dX')?.click());

  // 6. Keyboard: Enter on the bell opens, focus moves inside, Escape closes and returns focus. Per-item mark read.
  await pb.evaluate(() => EmberBridge.state.ember.seenRelease = 'older-release');
  await pb.evaluate(() => { EmberInbox.refresh(); [...document.querySelectorAll('.inbBell')].find(b => b.getClientRects().length).focus(); });
  await pb.keyboard.press('Enter'); await pb.waitForTimeout(600);
  log('keyboard open:', await pb.evaluate(() => !!document.querySelector('#inbPanel[role=dialog][aria-modal=true]') && document.querySelector('#inbPanel').contains(document.activeElement)));
  const before = await pb.evaluate(() => EmberInbox.items().filter(i => i.unread).length);
  const rd = await pb.$('.inbRead'); if (rd) await rd.click(); await pb.waitForTimeout(300);
  log('per-item mark read: unread', before, '->', await pb.evaluate(() => EmberInbox.items().filter(i => i.unread).length));
  await pb.keyboard.press('Escape'); await pb.waitForTimeout(300);
  log('Escape closed, focus on bell:', await pb.evaluate(() => !document.querySelector('#inbPanel') && document.activeElement?.classList.contains('inbBell')));

  // 7. Mark all read persists after reload.
  await pb.evaluate(() => { EmberBridge.state.ember.inbox.items = {}; EmberBridge.state.ember.inbox.since = 0; EmberBridge.save(); EmberInbox.refresh(); });
  log('before Mark all read:', await bell(pb));
  await openPanel(pb); await pb.click('.inbAll'); await pb.waitForTimeout(400); log('after Mark all read:', await bell(pb));
  await pb.evaluate(() => EmberInbox.close());
  await pb.reload(); await pb.waitForTimeout(4000); await quiet(pb); await pb.evaluate(() => { window.EmberWhatsNew?.close?.(); EmberInbox.refresh(); }); await pb.waitForTimeout(1500);
  log('after reload:', await bell(pb), 'unread:', await pb.evaluate(() => EmberInbox.items().filter(i => i.unread).map(i => i.id)));

  // 8. Other sizes (fresh browsers with B's sign-in and save), panel open; no sideways scroll, tap targets >= 44 px.
  await pb.evaluate(() => { EmberBridge.state.ember.inbox.items = {}; EmberBridge.state.ember.inbox.since = 0; EmberBridge.save(); });
  const storage = await pb.context().storageState();
  for (const [W, H, touch] of [[1366, 900, 0], [1536, 1024, 0], [768, 1024, 1], [1024, 768, 1], [390, 844, 1]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: !!touch, isMobile: W < 500, storageState: storage });
    const p = await ctx.newPage(); watch(p, 'B' + W); await p.goto(BASE + '/'); await p.waitForTimeout(3500);
    const keep = await p.$('[data-pick="local"]'); if (keep) { await keep.click(); await p.waitForTimeout(1500); } // same save copied into a new browser
    await quiet(p);
    await p.evaluate(() => { window.EmberWhatsNew?.close?.(); document.querySelector('#tradeAlert')?.remove(); }); await p.waitForTimeout(400);
    await p.screenshot({ path: OUT + `inb-bell-${W}x${H}.png`, clip: { x: 0, y: 0, width: W, height: Math.min(H, 200) } });
    await openPanel(p);
    const m = await p.evaluate(() => {
      const box = document.querySelector('.inbBox').getBoundingClientRect(), bell = [...document.querySelectorAll('.inbBell')].find(b => b.getClientRects().length).getBoundingClientRect();
      const small = [...document.querySelectorAll('#inbPanel button')].filter(x => { const r = x.getBoundingClientRect(); return r.width && (r.width < 44 || r.height < 44); }).length;
      const hits = ['.uiPSound', '.uiPCoins', '.uiPUser', '.uiTopIn .coins', '#uiUser'].flatMap(s => [...document.querySelectorAll(s)]).filter(e => e.getClientRects().length).filter(e => { const r = e.getBoundingClientRect(); return !(r.right <= bell.left || r.left >= bell.right || r.bottom <= bell.top || r.top >= bell.bottom); }).map(e => e.className);
      return { scroll: document.documentElement.scrollWidth - innerWidth, box: [box.left, box.top, box.right, box.bottom].map(Math.round), inView: box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight, bell: [bell.left, bell.top, bell.width, bell.height].map(Math.round), overlaps: hits, smallButtons: small, n: document.querySelectorAll('.inbItem').length };
    });
    log(W + 'x' + H, JSON.stringify(m));
    await p.screenshot({ path: OUT + `inb-panel-${W}x${H}.png` });
    await ctx.close();
  }
  log('errors:', errs.slice(0, 6));
  await b.close();
})();
