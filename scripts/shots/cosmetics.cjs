// Card backs and avatars (cosmetics.js): a gallery of every back, then a test player who has earned a few
// achievements picks a back, avatar and ring, and we look at My Profile, card details (flipped), the pack
// reveal, a battle, and a friend's view of the profile. Only touches the test players' own browser saves.
// Usage: BASE=http://127.0.0.1:8848 OUT=/some/folder node scripts/shots/cosmetics.cjs
const { chromium } = require('playwright');
const quiet = require('./quiet.cjs');
const BASE = process.env.BASE || 'http://127.0.0.1:8848', OUT = process.env.OUT || '.';
const shot = (p, name) => p.screenshot({ path: `${OUT}/cos-${name}.png` });
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async (name, vp = { width: 1366, height: 900 }, touch = false) => {
    const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch && vp.width < 500 }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('dialog', d => d.accept());
    await p.goto(BASE + '/'); await p.waitForTimeout(2500);
    const i = await p.$('input[type=text], input:not([type])'); if (i && await i.isVisible()) { await i.fill(name); await p.keyboard.press('Enter'); await p.waitForTimeout(2500); }
    await quiet(p); return p;
  };
  const sideScroll = p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const s = Date.now() % 1e5, A = 'Cos' + s, Bn = 'Fr' + s;
  const pa = await mk(A);
  // Gallery of every back (and every ring).
  await pa.evaluate(() => {
    const C = window.EmberCosmetics, d = document.createElement('div'); d.id = 'cosGallery';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0b0e14;display:flex;flex-wrap:wrap;gap:18px;padding:20px;align-content:flex-start;overflow:auto';
    d.innerHTML = C.backs.map(x => `<figure style="margin:0;width:150px;text-align:center;color:#ffe6b0;font:700 14px Georgia">${C.backHTML(x.id)}<figcaption style="margin-top:6px">${x.name}</figcaption></figure>`).join('')
      + '<div style="width:100%;height:0"></div>' + C.rings.map(x => `<figure style="margin:0;width:90px;text-align:center;color:#ffe6b0;font:700 13px Georgia"><span class="cosRingSwatch cosRing-${x.id}" style="width:72px;height:72px">${EmberBridge.art({ kind: 3, rarity: 'Rare', level: 5 })}</span><figcaption>${x.name}</figcaption></figure>`).join('');
    document.body.append(d);
  });
  await pa.waitForTimeout(1200); await shot(pa, 'gallery');
  await pa.evaluate(() => document.querySelector('#cosGallery').remove());
  // A test player with a few cards and a few achievements (this browser only).
  await pa.evaluate(() => {
    const B = EmberBridge, st = B.state; st.coins = Math.max(st.coins, 200000);
    st.ember = st.ember || {}; st.ember.achievements = { ...(st.ember.achievements || {}) };
    for (const id of ['pack-1', 'quest-1', 'species-8', 'shiny-1', 'legendary-1', 'mutant-1', 'fusion-1']) st.ember.achievements[id] = Date.now();
    B.save(); B.go('profile');
  });
  await pa.waitForTimeout(1200);
  await pa.click('[data-pf-tab="backs"]'); await pa.waitForTimeout(400);
  await pa.evaluate(() => document.querySelector('[data-pf-back="void"]').click()); await pa.waitForTimeout(400); // locked: shows how to unlock
  await pa.click('[data-pf-back="starfield"]'); await pa.waitForTimeout(600);
  await pa.evaluate(() => document.querySelector('.pfCustom').scrollIntoView()); await shot(pa, 'profile-backs');
  await pa.click('[data-pf-tab="avatar"]'); await pa.waitForTimeout(400);
  const avaBtns = await pa.$$('[data-pf-ava]'); if (avaBtns[3]) await avaBtns[3].click(); await pa.waitForTimeout(400);
  await pa.click('[data-pf-ring="prism"]'); await pa.waitForTimeout(600);
  await pa.evaluate(() => document.querySelector('.pfCustom').scrollIntoView()); await shot(pa, 'profile-avatar');
  await pa.evaluate(() => scrollTo(0, 0)); await pa.waitForTimeout(300); await shot(pa, 'profile-top');
  console.log('saved:', JSON.stringify(await pa.evaluate(() => { const p = EmberBridge.state.ember.profile; return { cardBack: p.cardBack, ring: p.ring, avatar: !!p.avatar }; })), 'html:', await pa.evaluate(() => [document.documentElement.dataset.cardback, document.documentElement.dataset.avring].join('/')));
  console.log('header avatar uses choice:', await pa.evaluate(() => [...document.querySelectorAll('.uiAvatar,.uiPAva')].map(e => e.dataset.cosAva === EmberBridge.state.ember.profile.avatar).join(',')));
  // Card details, flipped.
  await pa.evaluate(() => EmberCardDetails.open(EmberBridge.state.owned[0].id)); await pa.waitForTimeout(900);
  await pa.click('[data-cd-flip]'); await pa.waitForTimeout(1300); await shot(pa, 'details-flip');
  await pa.evaluate(() => EmberCardDetails.close()); await pa.waitForTimeout(400);
  // Pack opening: the 3D reveal starts face down, and the reveal screen shows cards still to turn over.
  await pa.evaluate(() => EmberBridge.go('packs')); await pa.waitForTimeout(1000);
  await pa.evaluate(() => { const p = EmberBridge.packCatalog()[0]; document.querySelector(`[data-buy="${p.id}"]`)?.click(); });
  await pa.waitForTimeout(800);
  if (await pa.$('#confirmPack')) { await pa.click('#confirmPack'); }
  await pa.waitForTimeout(600); const skip = await pa.$('#skipOpening'); if (skip) await skip.click();
  await pa.waitForTimeout(700); await shot(pa, 'pack-3d');
  await pa.waitForTimeout(3200); await pa.evaluate(() => document.querySelector('.fxStage')?.click()); await pa.waitForTimeout(800); await shot(pa, 'pack-reveal');
  console.log('view:', await pa.evaluate(() => EmberBridge.view), 'to reveal:', await pa.evaluate(() => document.querySelector('.cosToReveal')?.getAttribute('aria-label')));
  await pa.evaluate(() => document.querySelector('#revealAll')?.click()); await pa.waitForTimeout(800);
  // A battle: the deck pile shows the back.
  await pa.evaluate(() => EmberBridge.go('map')); await pa.waitForTimeout(1200);
  await pa.evaluate(() => EmberBridge.beginBattle(1)); await pa.waitForTimeout(2500);
  await pa.evaluate(() => document.querySelector('.bossIntro, #bossIntro')?.click()); await pa.waitForTimeout(600);
  console.log('battle view:', await pa.evaluate(() => EmberBridge.view), 'deck backs:', await pa.evaluate(() => document.querySelectorAll('.cosDeck').length));
  await shot(pa, 'battle');
  await pa.evaluate(() => document.querySelector('.cosDeck')?.closest('.battleIconStats')?.scrollIntoView({ block: 'center' })); await pa.waitForTimeout(300); await shot(pa, 'battle-deck');
  // A friend sees the back, ring and avatar.
  const pb = await mk(Bn);
  await pa.evaluate(() => EmberBridge.go('friends')); await pa.waitForTimeout(2500);
  await pa.fill('.uiXFInput', Bn); await pa.click('.uiXFFind'); await pa.waitForTimeout(1500); const yes = await pa.$('#yesFriend'); if (yes) await yes.click(); await pa.waitForTimeout(1500);
  await pb.evaluate(() => EmberBridge.go('friends')); await pb.waitForTimeout(3000); await pb.click('[data-friend-accept]'); await pb.waitForTimeout(2000);
  await pa.evaluate(() => EmberBridge.go('profile')); await pa.waitForTimeout(2500);
  console.log('share:', await pa.evaluate(() => document.querySelector('#pfShare')?.textContent));
  await pb.evaluate(name => window.EmberProfile.openFriend(name), A); await pb.waitForTimeout(2500); await shot(pb, 'friend-view');
  console.log('friend sees:', await pb.evaluate(() => [document.querySelector('.pfBackStat b')?.textContent, document.querySelector('.pfAva')?.className].join(' | ')));
  // Fit on tablet and phone (touch).
  const state = await pa.evaluate(() => localStorage.getItem(EmberBridge.key));
  for (const [nm, vp] of [['tablet', { width: 768, height: 1024 }], ['phone', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: vp.width < 500 }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(nm + ': ' + e.message));
    await ctx.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [await pa.evaluate(() => EmberBridge.key), state]);
    await p.goto(BASE + '/'); await p.waitForTimeout(3000); await quiet(p);
    await p.evaluate(() => EmberBridge.go('profile')); await p.waitForTimeout(1200); await shot(p, nm + '-profile');
    await p.click('[data-pf-tab="backs"]'); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('.pfCustom').scrollIntoView()); await shot(p, nm + '-backs');
    console.log(nm, 'side scroll:', await sideScroll(p));
    await p.click('[data-pf-tab="avatar"]'); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('.pfCustom').scrollIntoView()); await shot(p, nm + '-avatar');
    console.log(nm, 'side scroll avatar:', await sideScroll(p));
    await p.evaluate(() => EmberBridge.go('home')); await p.waitForTimeout(800); await shot(p, nm + '-home');
    await p.evaluate(() => EmberCardDetails.open(EmberBridge.state.owned[0].id)); await p.waitForTimeout(900); await p.click('[data-cd-flip]'); await p.waitForTimeout(1300); await shot(p, nm + '-details-flip');
    await ctx.close();
  }
  console.log('errors:', errs.slice(0, 6));
  await b.close();
})();
