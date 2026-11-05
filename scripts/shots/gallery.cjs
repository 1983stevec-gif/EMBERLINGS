// Art gallery (gallery.js) and lore (lore.js): a new player (mostly silhouettes) and a full collection
// at desktop 1366×900, tablet 768×1024 (touch) and phone 390×844 (touch). Checks browsing (keys, swipe,
// arrows, dots), zoom (wheel, pinch, double-tap), art-only mode, the Index and card-details buttons,
// square art (no stretching) and no sideways scroll. Only touches the test players' own browser saves.
// Usage: BASE=http://127.0.0.1:8848 OUT=/some/folder node scripts/shots/gallery.cjs
const { chromium } = require('playwright');
const quiet = require('./quiet.cjs');
const BASE = process.env.BASE || 'http://127.0.0.1:8848', OUT = process.env.OUT || '.';
const SIZES = [['desktop', 1366, 900, false], ['tablet', 768, 1024, true], ['phone', 390, 844, true]];
(async () => {
  const b = await chromium.launch(); const errs = [], fails = [];
  const ok = (cond, msg) => { if (!cond) fails.push(msg); console.log((cond ? 'ok   ' : 'FAIL ') + msg); };
  for (const [tag, W, H, touch] of SIZES) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: touch, isMobile: touch && W < 500 });
    const p = await ctx.newPage(); const shot = name => p.screenshot({ path: `${OUT}/gal-${tag}-${name}.png` });
    p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('dialog', d => d.accept());
    await p.goto(BASE + '/'); await p.waitForTimeout(2500);
    const i = await p.$('input[type=text], input:not([type])'); if (i && await i.isVisible()) { await i.fill('Gal' + tag + (Date.now() % 1e5)); await p.keyboard.press('Enter'); await p.waitForTimeout(2500); }
    await quiet(p);
    const geo = () => p.evaluate(() => {
      const f = document.querySelector('.galFrame').getBoundingClientRect(), a = document.querySelector('.galPan .mythlingArt').getBoundingClientRect();
      return { side: document.documentElement.scrollWidth - innerWidth, fw: f.width, fh: f.height, aw: a.width, ah: a.height, inView: f.left >= 0 && f.right <= innerWidth + 1 && f.top >= 0 && f.bottom <= innerHeight + 1, k: getComputedStyle(document.querySelector('.galPan')).transform };
    });
    const state = () => p.evaluate(() => ({ title: document.querySelector('.galInfo h2')?.textContent, count: document.querySelector('.galCount')?.textContent, unknown: document.querySelector('.galFrame').classList.contains('galUnknown'), label: document.querySelector('.galPan .mythlingArt')?.getAttribute('aria-label'), artOnly: document.querySelector('#galView').classList.contains('galArtOnly') }));
    const cdp = touch ? await ctx.newCDPSession(p) : null;
    const touchMove = async (pts0, pts1, steps = 8) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts0.map(([x, y], id) => ({ x, y, id })) });
      for (let s = 1; s <= steps; s++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts0.map(([x, y], id) => ({ x: x + (pts1[id][0] - x) * s / steps, y: y + (pts1[id][1] - y) * s / steps, id })) });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(350);
    };
    const center = async () => { const r = await p.evaluate(() => { const f = document.querySelector('.galFrame').getBoundingClientRect(); return [f.left + f.width / 2, f.top + f.height / 2, f.width]; }); return r; };

    // 1. New player: the Index has a Gallery button; most species are silhouettes.
    await p.evaluate(() => EmberBridge.go('index')); await p.waitForTimeout(1200);
    ok(!!await p.$('.galIdxBtn'), `${tag}: Index shows the Gallery button`);
    await p.evaluate(() => document.querySelector('.galIdxBtn').scrollIntoView({ block: 'center' })); await shot('new-index');
    await p.click('.galIdxBtn'); await p.waitForTimeout(700);
    let s = await state(); ok(!s.unknown && /Flaminyx/.test(s.title || ''), `${tag}: opens on the starter (${s.title})`);
    let g = await geo(); ok(g.side <= 0 && Math.abs(g.fw - g.fh) < 1 && Math.abs(g.aw - g.ah) < 1 && g.inView, `${tag}: square art ${Math.round(g.fw)}px in view, no sideways scroll`);
    await shot('new-starter');
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);
    s = await state(); ok(/Lunamo|\?/.test(s.title || ''), `${tag}: right arrow key browses (${s.title})`);
    await p.evaluate(() => document.querySelector('.galDot:not(.seen)').click()); await p.waitForTimeout(500);
    s = await state(); ok(s.unknown && /silhouette/.test(s.label || ''), `${tag}: next species is a silhouette with a label`);
    await shot('new-silhouette');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    ok(!await p.$('#galView'), `${tag}: Escape closes`);

    // 2. Full collection (this browser only): one card of every species, plus a Legendary (Radiant) Cindermane.
    await p.evaluate(() => {
      const B = EmberBridge, st = B.state;
      for (let k = 0; k < B.species.length; k++) if (!st.owned.some(c => c.kind === k)) st.owned.push({ id: 'gal-test-' + k, kind: k, level: 5, xp: 0, rarity: B.species[k].rarity || 'Common' });
      st.owned.push({ id: 'gal-test-rad', kind: 13, level: 12, xp: 0, rarity: 'Legendary' });
      B.save(); B.go('index');
    });
    await p.waitForTimeout(1000);
    await p.evaluate(() => document.querySelector('[data-fg="13"]').click()); await p.waitForTimeout(300);
    await p.click('.galIdxBtn'); await p.waitForTimeout(700);
    s = await state(); ok(/Cindermane/.test(s.title || '') && /16 discovered/.test(s.count), `${tag}: opens on the chosen species (${s.title}; ${s.count})`);
    ok(await p.$$eval('.galForm', x => x.map(e => e.textContent.replace('✧ ', '')).join(',')) === 'Basic,Ascended,Apex,Radiant', `${tag}: forms Basic → Ascended → Apex → Radiant`);
    await shot('full-basic');
    await p.click('[data-gal-form="2"]'); await p.waitForTimeout(300); await shot('full-apex');
    await p.click('[data-gal-form="3"]'); await p.waitForTimeout(300); await shot('full-radiant');
    ok(await p.evaluate(() => document.querySelector('.galFrame').classList.contains('galF3')), `${tag}: Radiant form shown`);

    // Browse: next arrow / swipe.
    if (touch) {
      const [cx, cy, w] = await center();
      await touchMove([[cx + w * .3, cy]], [[cx - w * .3, cy]]);
      s = await state(); ok(/Glacipaw/.test(s.title || ''), `${tag}: swipe left goes to the next species (${s.title})`);
      await touchMove([[cx - w * .3, cy]], [[cx + w * .3, cy]]);
      s = await state(); ok(/Cindermane/.test(s.title || ''), `${tag}: swipe right goes back (${s.title})`);
    } else {
      await p.click('.galNext'); await p.waitForTimeout(400); s = await state(); ok(/Glacipaw/.test(s.title || ''), `${tag}: next button (${s.title})`);
      await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(400); s = await state(); ok(/Cindermane/.test(s.title || ''), `${tag}: left arrow key (${s.title})`);
    }
    await p.click('[data-gal-dot="1"]'); await p.waitForTimeout(400); s = await state(); ok(/Lunamo/.test(s.title || ''), `${tag}: dot picks a species (${s.title})`);
    await shot('full-lunamo');

    // Zoom: wheel (desktop) or pinch (touch), then double-tap / double-click back out.
    const [cx, cy, w] = await center();
    if (touch) await touchMove([[cx - 30, cy], [cx + 30, cy]], [[cx - w * .35, cy], [cx + w * .35, cy]], 10);
    else { await p.mouse.move(cx + w * .15, cy - w * .1); for (let n = 0; n < 6; n++) { await p.mouse.wheel(0, -120); await p.waitForTimeout(40); } }
    g = await geo(); ok(g.k !== 'none' && g.side <= 0, `${tag}: zoomed in (${g.k})`);
    if (touch) await touchMove([[cx, cy]], [[cx + 80, cy + 60]]); else { await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx + 80, cy + 60, { steps: 6 }); await p.mouse.up(); }
    s = await state(); ok(/Lunamo/.test(s.title || ''), `${tag}: dragging while zoomed pans (stays on ${s.title})`);
    await shot('full-zoom');
    if (touch) { await p.touchscreen.tap(cx, cy); await p.waitForTimeout(120); await p.touchscreen.tap(cx, cy); }
    else await p.mouse.dblclick(cx, cy);
    await p.waitForTimeout(300); g = await geo(); ok(g.k === 'none', `${tag}: double-${touch ? 'tap' : 'click'} zooms back out`);
    if (touch) { await p.touchscreen.tap(cx, cy); await p.waitForTimeout(120); await p.touchscreen.tap(cx, cy); await p.waitForTimeout(300); g = await geo(); ok(g.k !== 'none', `${tag}: double-tap zooms in`); await p.keyboard.press('0'); }
    await p.keyboard.press('+'); await p.keyboard.press('+'); await p.waitForTimeout(100); g = await geo(); ok(g.k !== 'none', `${tag}: + key zooms`);
    await p.keyboard.press('0'); await p.waitForTimeout(100);

    // Art only.
    await p.click('.galArtBtn'); await p.waitForTimeout(400);
    s = await state(); g = await geo(); ok(s.artOnly && g.side <= 0 && Math.abs(g.fw - Math.min(W, H)) < 2 && g.inView, `${tag}: art only fills the screen (${Math.round(g.fw)}px)`);
    await shot('artonly');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    s = await state(); ok(!s.artOnly && !!await p.$('#galView'), `${tag}: Escape leaves art only first`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);

    // Card details → View art.
    await p.evaluate(() => { EmberBridge.go('inventory'); }); await p.waitForTimeout(800);
    await p.evaluate(() => EmberCardDetails.open('gal-test-rad')); await p.waitForTimeout(900);
    ok(!!await p.$('.galCdBtn'), `${tag}: card details shows View art`);
    await p.evaluate(() => document.querySelector('.galCdBtn').scrollIntoView({ block: 'center' })); await shot('details-button');
    await p.click('.galCdBtn'); await p.waitForTimeout(600);
    s = await state(); ok(/Cindermane/.test(s.title || ''), `${tag}: View art opens that species (${s.title})`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    ok(!await p.$('#galView') && !!await p.$('#cardDetails'), `${tag}: Escape returns to card details`);
    await ctx.close();
  }
  console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'No page errors');
  console.log(fails.length ? fails.length + ' check(s) failed' : 'All checks passed');
  await b.close(); process.exit(fails.length || errs.length ? 1 : 0);
})();
