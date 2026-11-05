// Watch a friend's duel (spectate.js): three live players. Mira and Bo are friends and start an online duel;
// Cleo is Mira's friend only. Cleo sees "Watch" on the Friends list, in the Live duels panel and on Mira's profile,
// watches the board update as the duel goes on (moves are made through the normal battle API with the game's own AI
// picks), checks no hand/deck info reaches her page, tries the opt-out, then leaves. Screenshots spc-*.png at
// desktop, tablet and phone. Needs `npm run db:local`. OUT=dir BASE=http://127.0.0.1:8906
const { chromium } = require('playwright');
const quiet = require('./quiet.cjs');
const OUT = process.env.OUT || './';
const BASE = process.env.BASE || 'http://127.0.0.1:8848';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const watch = (p, name) => { p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/status of 40[3459]|status of 410/.test(m.text())) errs.push(name + ' console: ' + m.text()); }); p.on('dialog', d => d.accept()); };
  const mk = async (name) => { const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } }); const p = await ctx.newPage(); watch(p, name); await p.goto(BASE + '/'); await p.waitForTimeout(2500); const i = await p.$('input[type=text], input:not([type])'); if (i && await i.isVisible()) { await i.fill(name); await p.keyboard.press('Enter'); await p.waitForTimeout(2500); } await quiet(p); return p; };
  const befriend = async (from, to, toName) => {
    await from.evaluate(n => EmberBridge.online('/friends/request', { username: n }), toName);
    await to.evaluate(async () => { const me = await EmberBridge.online('/me'); for (const r of me.incoming) await EmberBridge.online('/friends/respond', { id: r.id, accept: true }); });
  };
  const s = Date.now() % 1e5, A = 'Mira' + s, Bn = 'Bo' + s, C = 'Cleo' + s;
  const pa = await mk(A), pb = await mk(Bn), pc = await mk(C);
  await befriend(pa, pb, Bn); await befriend(pc, pa, A);
  // Mira invites Bo to a duel from Friends, Bo accepts from Friends.
  await pa.evaluate(() => EmberBridge.go('friends')); await pa.waitForSelector('[data-invite][data-mode="duel"]', { state: 'attached' });
  await pa.evaluate(n => document.querySelector(`[data-invite="${n}"][data-mode="duel"]`).click(), Bn); await pa.waitForTimeout(2000);
  await pb.evaluate(() => EmberBridge.go('friends')); await pb.waitForSelector('[data-match-open][data-join="yes"]', { state: 'attached', timeout: 15000 });
  await pb.evaluate(() => document.querySelector('[data-match-open][data-join="yes"]').click()); await pb.waitForTimeout(3000);
  await pa.waitForTimeout(2000);
  const id = await pa.evaluate(() => EmberBridge.state.cardOnlineId);
  console.log('duel', id, 'A view', await pa.evaluate(() => EmberBridge.view), 'B view', await pb.evaluate(() => EmberBridge.view));
  // A player's move, made through the normal battle API with the game's AI choice.
  const move = (p) => p.evaluate(async id => {
    const { chooseAI } = await import('/card-engine.js');
    const g = await fetch('/api/social/cards/' + id, { cache: 'no-store' }).then(r => r.json());
    const a = chooseAI(g.state, g.side, 3); if (!a) return null;
    const r = await fetch('/api/social/cards/' + id + '/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...a, revision: g.state.revision }) });
    return a.type + ':' + r.status;
  }, id);
  // Mira picks her starting Mythlings (face down) before Cleo starts watching.
  for (let k = 0; k < 5; k++) { const r = await move(pa); if (!r || r.startsWith('ready')) break; }
  // Cleo: Friends shows Watch next to Mira and the Live duels panel.
  await pc.evaluate(() => EmberBridge.go('friends')); await pc.waitForSelector('#spcPanel .spcWatchBtn', { timeout: 15000 }); await pc.waitForTimeout(1500);
  console.log('C row Watch buttons:', await pc.evaluate(() => [...document.querySelectorAll('.spcRowBtn')].map(x => x.closest('.friendRow')?.querySelector('strong')?.textContent + ' -> ' + x.getAttribute('aria-label'))));
  console.log('C panel:', await pc.evaluate(() => document.querySelector('#spcPanel').innerText.replace(/\s+/g, ' ')));
  await pc.screenshot({ path: OUT + 'spc-friends-desktop.png' });
  await pc.evaluate(() => document.querySelector('#spcPanel').scrollIntoView({ block: 'center' })); await pc.waitForTimeout(300);
  await pc.screenshot({ path: OUT + 'spc-panel-desktop.png' });
  // Watch from the friend profile button.
  await pc.evaluate(n => EmberProfile.openFriend(n), A); await pc.waitForSelector('.spcProfileBtn', { timeout: 10000 }); await pc.waitForTimeout(400);
  console.log('C profile button:', await pc.evaluate(() => document.querySelector('.spcProfileBtn').textContent.trim()));
  await pc.screenshot({ path: OUT + 'spc-profile-desktop.png' });
  await pc.click('.spcProfileBtn'); await pc.waitForSelector('.spcArena .pocketBoard', { timeout: 10000 }); await pc.waitForTimeout(600);
  console.log('C setup view:', await pc.evaluate(() => document.querySelector('.spcHeadline').textContent), '| face-down slots:', await pc.evaluate(() => document.querySelectorAll('.spcFaceDown').length), '| cards shown:', await pc.evaluate(() => document.querySelectorAll('.spcArena .mythCard').length));
  await pc.screenshot({ path: OUT + 'spc-setup-desktop.png' });
  // Bo gets ready; the duel starts.
  for (let k = 0; k < 6; k++) { const r = await move(pb); if (!r || r.startsWith('ready')) break; }
  await pc.waitForTimeout(2500);
  console.log('C after setup:', await pc.evaluate(() => document.querySelector('.spcHeadline').textContent), '| cards shown:', await pc.evaluate(() => document.querySelectorAll('.spcArena .mythCard').length));
  // Play until two attacks land, checking Cleo's board after each one.
  let attacks = 0, fxSeen = 0;
  const leak = () => pc.evaluate(() => {
    const w = EmberSpectate.watching(), st = w?.state; if (!st) return 'no state';
    const bad = [];
    for (const p of st.sides) { if ('hand' in p || 'drawPile' in p || 'discard' in p) bad.push('pile arrays'); for (const c of p.cards) { if (![p.active, ...p.bench].includes(c.id)) bad.push('off-board card ' + c.id); if (c.sourceId || c.ownedId || c.ownerId) bad.push('owned id'); } }
    if (document.querySelector('.spcArena .handRow, .spcArena .pocketHand, .spcArena [data-card-move], .spcArena [data-active], .spcArena #endPocketTurn')) bad.push('player controls');
    const buttons = [...document.querySelectorAll('.spcArena button')].map(b => b.id || b.textContent.trim());
    if (buttons.some(x => x !== 'spcLeave' && x !== 'Back to Friends')) bad.push('buttons: ' + buttons.join(','));
    return bad.length ? bad.join('; ') : 'ok';
  });
  for (let k = 0; k < 120 && attacks < 2; k++) {
    let r = await move(pa); if (!r) r = await move(pb);
    if (r && r.startsWith('attack')) {
      attacks++;
      await pc.waitForFunction(() => document.querySelectorAll('#fxbLayer > *').length > 0, null, { timeout: 4000 }).then(() => fxSeen++).catch(() => {});
      await pc.waitForTimeout(250);
      await pc.screenshot({ path: OUT + 'spc-attack' + attacks + '-desktop.png' });
      await pc.waitForTimeout(1200);
      console.log('attack', attacks, '| C sees:', await pc.evaluate(() => document.querySelector('.spcLast').textContent), '| bar:', await pc.evaluate(() => document.querySelector('.spcBar strong').textContent), '| leak check:', await leak());
    }
  }
  console.log('attacks', attacks, 'fx played on watcher:', fxSeen);
  await pc.screenshot({ path: OUT + 'spc-live-desktop.png', fullPage: true });
  // Watcher requests to act are refused by the server.
  console.log('C tries to act:', await pc.evaluate(async id => { const out = []; for (const [path, body] of [['/action', { type: 'forfeit' }], ['/leave', {}]]) { const r = await fetch('/api/social/cards/' + id + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); out.push(path + ' ' + r.status); } const r = await fetch('/api/social/spectate/' + id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); out.push('spectate POST ' + r.status); return out.join(', '); }, id));
  // Other sizes: fresh browsers signed in as Cleo.
  const state = await pc.context().storageState();
  for (const [w, h, tag] of [[768, 1024, 'tablet'], [390, 844, 'phone']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 500, storageState: state });
    const p = await ctx.newPage(); watch(p, 'C-' + tag); await p.goto(BASE + '/'); await p.waitForTimeout(3000); await quiet(p);
    const keep = p.getByText('Keep this device'); if (await keep.count()) { await keep.first().click(); await p.waitForTimeout(1500); }
    await p.evaluate(() => EmberBridge.go('friends')); await p.waitForSelector('#spcPanel .spcWatchBtn', { timeout: 15000 }); await p.waitForTimeout(1200);
    console.log(tag, 'row buttons:', await p.evaluate(() => document.querySelectorAll('.spcRowBtn').length), 'sideways scroll:', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
    await p.screenshot({ path: OUT + 'spc-friends-' + tag + '.png' });
    await p.evaluate(() => document.querySelector('#spcPanel').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
    await p.screenshot({ path: OUT + 'spc-panel-' + tag + '.png' });
    await p.tap('#spcPanel .spcWatchBtn'); await p.waitForSelector('.spcArena .pocketBoard', { timeout: 10000 }); await p.waitForTimeout(1200);
    console.log(tag, 'watch view sideways scroll:', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'banner:', await p.evaluate(() => document.querySelector('.spcBanner h1').textContent));
    await p.screenshot({ path: OUT + 'spc-watch-' + tag + '.png' });
    await p.screenshot({ path: OUT + 'spc-watch-' + tag + '-full.png', fullPage: true });
    await p.tap('#spcLeave'); await p.waitForTimeout(1500);
    console.log(tag, 'after Leave view:', await p.evaluate(() => EmberBridge.view));
    await ctx.close();
  }
  // Opt-out: Bo switches watching off from his Friends page; Cleo's watch view says it's private.
  await pb.evaluate(() => EmberBridge.go('friends')); await pb.waitForSelector('#spcPanel .spcSwitch', { timeout: 15000 });
  await pb.click('#spcPanel .spcSwitch'); await pb.waitForTimeout(1500);
  console.log('B switch:', await pb.evaluate(() => document.querySelector('.spcSwitch').getAttribute('aria-checked')), await pb.evaluate(() => document.querySelector('.spcNote').textContent));
  await pb.evaluate(() => document.querySelector('#spcPanel').scrollIntoView({ block: 'center' })); await pb.waitForTimeout(300);
  await pb.screenshot({ path: OUT + 'spc-optout-desktop.png' });
  await pc.evaluate(id => { EmberSpectate.open(id); }, id); await pc.waitForTimeout(2500);
  console.log('C after opt-out:', await pc.evaluate(() => document.querySelector('.spcArena').innerText.replace(/\s+/g, ' ').slice(0, 160)));
  await pc.screenshot({ path: OUT + 'spc-private-desktop.png' });
  await pb.click('#spcPanel .spcSwitch'); await pb.waitForTimeout(1500);
  console.log('B switch back:', await pb.evaluate(() => document.querySelector('.spcSwitch').getAttribute('aria-checked')));
  // Leave from desktop, then the duel finishes and the watcher sees the result.
  await pc.evaluate(id => EmberSpectate.open(id), id); await pc.waitForSelector('.spcArena .pocketBoard', { timeout: 10000 });
  await pb.evaluate(id => fetch('/api/social/cards/' + id + '/leave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }), id);
  await pc.waitForTimeout(2500);
  console.log('C result:', await pc.evaluate(() => document.querySelector('.spcHeadline').textContent), '| eye:', await pc.evaluate(() => document.querySelector('.spcEye').textContent));
  await pc.screenshot({ path: OUT + 'spc-ended-desktop.png' });
  await pc.evaluate(() => document.querySelector('#spcLeave').click()); await pc.waitForTimeout(1500);
  console.log('C after Leave:', await pc.evaluate(() => EmberBridge.view), '| save key present:', await pc.evaluate(() => !!localStorage.getItem('mythlings-playable-v1')));
  console.log('errors:', errs.length ? errs.slice(0, 10) : 'none');
  await b.close();
})();
