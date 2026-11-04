// First-time tips (tips.js): a new player gets none until the beginner guide is done; an existing player sees each
// tip once, one per screen visit, pointing at the right control, never in battle and never on top of Daily rewards.
// "Don't show tips" turns them all off and EmberTips.reset() brings them back. Two live players (for the Friends
// Activity tips) and screenshots tip-<id>-<size>.png at desktop 1366x900, tablet 768x1024 and phone 390x844 (touch).
// Needs `npm run db:local`. Example: BASE=http://127.0.0.1:8903 OUT=/tmp/tips/ node scripts/shots/tips.cjs
const { chromium } = require('playwright');
const quiet = require('./quiet.cjs');
const OUT = process.env.OUT || './';
const BASE = process.env.BASE || 'http://127.0.0.1:8848';
const SIZES = [[1366, 900, 'desktop'], [768, 1024, 'tablet'], [390, 844, 'phone']];
(async () => {
  const b = await chromium.launch(); const errs = [], fails = [];
  const ok = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fails.push(msg); };
  const watch = (p, name) => { p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('dialog', d => d.accept()); };
  const mk = async (name) => { const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } }); const p = await ctx.newPage(); watch(p, name); await p.goto(BASE + '/'); await p.waitForTimeout(2500); const i = await p.$('input[type=text], input:not([type])'); if (i && await i.isVisible()) { await i.fill(name); await p.keyboard.press('Enter'); await p.waitForTimeout(2500); } await quiet(p); return p; };
  const tipId = p => p.evaluate(() => document.querySelector('#emberTip')?.dataset.tip || null);
  const waitTip = async (p, ms = 9000) => { const end = Date.now() + ms; while (Date.now() < end) { const id = await tipId(p); if (id) { await p.waitForTimeout(450); return id; } await p.waitForTimeout(250); } return null; };
  const go = (p, v) => p.evaluate(v => EmberBridge.go(v), v);

  const s = Date.now() % 1e5, A = 'Tip' + s, Bn = 'Pal' + s;
  const pa = await mk(A), pb = await mk(Bn);
  // A brand-new player (beginner guide not finished) gets no tips.
  await go(pa, 'collection'); await pa.waitForTimeout(3000);
  ok(!(await tipId(pa)), 'new player: no tip before the beginner guide is done');
  // Friends, and a highlight from B so A has something to cheer.
  await go(pa, 'friends'); await pa.waitForTimeout(2500);
  await pa.fill('.uiXFInput', Bn); await pa.click('.uiXFFind'); await pa.waitForTimeout(1500); const yes = await pa.$('#yesFriend'); if (yes) await yes.click(); await pa.waitForTimeout(1500);
  await go(pb, 'friends'); await pb.waitForTimeout(3000); await pb.click('[data-friend-accept]'); await pb.waitForTimeout(2000); await go(pb, 'home');
  await pb.evaluate(() => EmberActivity.refresh()); await pb.waitForTimeout(1500);
  await pb.evaluate(() => dispatchEvent(new CustomEvent('ember:cardResult', { detail: { id: 'boss-tip-' + Date.now(), victory: true, draw: false, level: 25, reason: 'test' } })));
  await pb.waitForTimeout(3000);
  // A becomes an "existing player" and opens one pack (for the luck meter).
  await pa.evaluate(() => { const B = EmberBridge; B.state.tutorialComplete = true; B.state.coins = 5000; B.save(); });
  await go(pa, 'packs'); await pa.waitForTimeout(1500);
  const btn = await pa.$('[data-buy="ember"], [data-pack="ember"], [data-buy], [data-pack]'); if (btn) await btn.click(); await pa.waitForTimeout(1500);
  const buy = await pa.$('#confirmPack, [data-confirm-pack], #buyPack'); if (buy) await buy.click(); await pa.waitForTimeout(4000);
  ok(!(await tipId(pa)), 'no tip during pack opening');
  for (let k = 0; k < 8; k++) { const nb = await pa.$('#revealNext, [data-reveal-next], #nextReveal, #packNext'); if (!nb) break; await nb.click(); await pa.waitForTimeout(2500); }
  await pa.evaluate(() => document.querySelector('#rareFind .rfOk')?.click());
  await go(pa, 'home'); await pa.waitForTimeout(1200);
  console.log('packs recorded:', await pa.evaluate(() => window.EmberStats?.stats?.().packs.length));
  console.log('friend events to cheer:', await pa.evaluate(async () => { await EmberActivity.refresh(); return EmberActivity.feed()?.events?.length; }));
  const state = await pa.context().storageState();

  const visit = async (p, tag, label, open, expect) => {
    await go(p, 'home'); await p.waitForTimeout(600);
    await open(); const id = await waitTip(p);
    ok(id === expect, `${tag}: ${label} shows "${expect}" (got ${id})`);
    if (!id) return;
    const r = await p.evaluate(() => { const t = document.querySelector('#emberTip').getBoundingClientRect(), ring = document.querySelector('.etRing').getBoundingClientRect(); return { t: [t.left, t.top, t.right, t.bottom].map(Math.round), ring: [ring.left, ring.top, ring.right, ring.bottom].map(Math.round), w: innerWidth, h: innerHeight, sx: document.documentElement.scrollWidth, blockers: !!document.querySelector('#dailyPanel, #whatsNewPanel, #guidedTour'), focus: document.activeElement?.className }; });
    ok(r.t[0] >= 0 && r.t[1] >= 0 && r.t[2] <= r.w && r.t[3] <= r.h, `${tag}: ${expect} fits on screen ${JSON.stringify(r.t)} in ${r.w}x${r.h}`);
    ok(r.ring[3] > 0 && r.ring[1] < r.h, `${tag}: ${expect} target ring is on screen ${JSON.stringify(r.ring)}`);
    ok(r.sx <= r.w + 1, `${tag}: no sideways scroll (${r.sx})`);
    ok(!r.blockers, `${tag}: not stacked with Daily/What's New/guide`);
    await p.screenshot({ path: `${OUT}tip-${expect}-${tag}.png` });
    if (expect === 'menuEffects') await p.click('#emberTip .etOk'); else await p.keyboard.press('Escape'); // Escape closes too
    await p.waitForTimeout(300);
    ok(!(await tipId(p)), `${tag}: ${expect} closes`);
  };

  for (const [w, h, tag] of SIZES) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1000, isMobile: w < 500, storageState: state });
    const p = await ctx.newPage(); watch(p, tag); await p.goto(BASE + '/'); await p.waitForTimeout(3000); await quiet(p);
    const keep = p.getByText('Keep this device'); if (await keep.count()) { await keep.first().click(); await p.waitForTimeout(1500); }
    // Close What's New and the one-time music hint (tips wait for them; checked separately below).
    await p.evaluate(() => { const e = EmberBridge.state.ember; e.music = { ...(e.music || {}), hinted: true }; document.querySelectorAll('#whatsNewPanel, #fxMusicHint').forEach(x => x.remove()); window.EmberTips.reset(); });
    if (tag === 'desktop') {
      // Waits for Daily rewards to close.
      await p.evaluate(() => window.EmberDaily?.open?.()); await go(p, 'collection'); await p.waitForTimeout(3000);
      ok(!(await tipId(p)), `${tag}: no tip while Daily rewards is open`);
      await p.evaluate(() => document.querySelector('#dailyPanel')?.remove()); const id = await waitTip(p);
      ok(id === 'collectionGoals', `${tag}: tip shows after Daily rewards closes (${id})`);
      await p.evaluate(() => window.EmberTips.reset());
    }
    const card = () => p.evaluate(() => { EmberBridge.go('inventory'); setTimeout(() => window.EmberCardDetails.open(EmberBridge.state.owned[0].id), 500); });
    await visit(p, tag, 'My Profile', () => go(p, 'profile'), 'profileShowcase');
    await visit(p, tag, 'My Profile again', () => go(p, 'profile'), 'profileCustomise');
    await visit(p, tag, 'Card details', card, 'cardTurn');
    await p.evaluate(() => window.EmberCardDetails.close());
    await visit(p, tag, 'Card details again', card, 'cardShare');
    await p.evaluate(() => window.EmberCardDetails.close());
    await visit(p, tag, 'Collection', () => go(p, 'collection'), 'collectionGoals');
    await visit(p, tag, 'Collection again', () => go(p, 'collection'), 'collectionFilters');
    await visit(p, tag, 'My Stats', () => go(p, 'stats'), 'statsLuck');
    await visit(p, tag, 'Battle Deck', () => go(p, 'decks'), 'deckCodes');
    await visit(p, tag, 'Friends', () => go(p, 'friends'), 'friendsSharing');
    await visit(p, tag, 'Friends again', () => go(p, 'friends'), 'friendsCheer');
    await visit(p, tag, 'Fusion Lab', () => go(p, 'fusion'), 'fusionPick');
    await visit(p, tag, 'Mutation Collection', () => go(p, 'mutationBook'), 'mutationBookPages');
    await visit(p, tag, 'user menu', () => p.evaluate(() => [...document.querySelectorAll('.uiUserBtn')].find(x => x.getBoundingClientRect().width)?.click()), 'menuEffects');
    await p.evaluate(() => document.querySelector('.uiMenu')?.remove());
    // Battle: nothing during the battle, then the Share tip on the Victory screen.
    await p.evaluate(() => EmberBridge.beginBattle(1)); await p.waitForTimeout(3500);
    ok(!(await tipId(p)), `${tag}: no tip during a battle`);
    await p.evaluate(() => { document.querySelector('.biIntro')?.click(); }); await p.waitForTimeout(800);
    await p.evaluate(() => { EmberBridge.state.cardBattle.match.result = { winner: 0, reason: 'Test win' }; EmberBridge.resumeBattle(); });
    const bid = await waitTip(p);
    ok(bid === 'battleShare', `${tag}: Victory screen shows battleShare (${bid})`);
    if (bid) { await p.screenshot({ path: `${OUT}tip-battleShare-${tag}.png` }); await p.click('#emberTip .etOk'); }
    // Each tip once: nothing on a second round.
    for (const v of ['profile', 'collection', 'friends', 'stats']) { await go(p, 'home'); await p.waitForTimeout(400); await go(p, v); await p.waitForTimeout(2500); ok(!(await tipId(p)), `${tag}: no repeat on ${v}`); }
    // "Don't show tips" turns them all off; reset brings them back.
    await p.evaluate(() => window.EmberTips.reset()); await go(p, 'home'); await p.waitForTimeout(400);
    await go(p, 'profile'); ok(await waitTip(p) === 'profileShowcase', `${tag}: reset brings tips back`);
    await p.click('#emberTip .etOff'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => EmberBridge.state.ember.tips.off === true), `${tag}: Don't show tips saves off`);
    await go(p, 'collection'); await p.waitForTimeout(3500); ok(!(await tipId(p)), `${tag}: no tips after turning them off`);
    await p.evaluate(() => window.EmberTips.off(false)); await go(p, 'home'); await p.waitForTimeout(400); await go(p, 'collection');
    ok(await waitTip(p) === 'collectionGoals', `${tag}: off(false) turns tips back on`);
    ok(await p.evaluate(() => !!localStorage.getItem('mythlings-playable-v1')), `${tag}: save key present`);
    await ctx.close();
  }
  console.log('page errors:', errs.length ? errs : 'none');
  console.log(fails.length ? `${fails.length} FAILED` : 'ALL OK');
  await b.close();
})();
