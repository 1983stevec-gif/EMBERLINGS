// Fit sweep: every size x screen. Reports sideways scroll, off-screen elements, covered content, small tap targets, pop-ups off screen.
// Data (test player states, names.json, reports) go to $DATA (default: <tmp>/ember-sweep); screenshots to $OUT (default $DATA), named $PREFIX (default fit-)<tag>-<size>-<screen>.png.
// Usage: TAG=before node sweep.cjs   (SIZES=390x844,... SCREENS=home,packs ... SHOTS=0 to skip screenshots)
const { chromium } = require('playwright');
const fs = require('fs');
const { open } = require('./lib.cjs');
const check = require('./check.cjs');
const { DATA: D } = require('./lib.cjs'), OUT = process.env.OUT || D, PFX = process.env.PREFIX || 'fit-';
const TAG = process.env.TAG || 'run';
const names = JSON.parse(fs.readFileSync(D + '/names.json', 'utf8'));
const ALL = [[1366, 900, false], [1536, 1024, false], [768, 1024, true], [1024, 768, true], [390, 844, true], [360, 740, true]];
const SIZES = process.env.SIZES ? ALL.filter(([w, h]) => process.env.SIZES.split(',').includes(w + 'x' + h)) : ALL;
const go = async (p, v, t = 1500) => { await p.evaluate(v => EmberBridge.go(v), v); await p.waitForTimeout(t); };
const clean = p => p.evaluate(() => { document.querySelector('.uiCloudDlg [data-pick="local"]')?.click(); window.EmberCardDetails?.close(); for (let k = 0; k < 12; k++) { const ok = document.querySelector('#rareFind .rfOk'); if (!ok) break; ok.click(); } window.EmberWhatsNew?.close(); document.querySelectorAll('#dailyPanel,#whatsNewPanel,.tradeDone,.uiMenu,#a11yPanel,#rareFind,.guideCard,.explorerGuide,#guidedTour').forEach(e => e.remove()); });
const menu = async p => { await p.evaluate(() => [...document.querySelectorAll('.uiUserBtn')].find(b => b.getClientRects().length)?.click()); await p.waitForTimeout(500); };
const menuItem = async (p, re) => { await menu(p); await p.evaluate(re => [...document.querySelectorAll('.uiMenu button, [role=menuitem]')].find(b => new RegExp(re, 'i').test(b.textContent))?.click(), re); await p.waitForTimeout(900); };
async function setupBattle(p, level = 1) {
  await p.evaluate(l => EmberBridge.beginBattle(l), level); await p.waitForTimeout(3500);
  await p.evaluate(() => document.querySelector('.biIntro, #bossIntro')?.click()); await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('[data-active]')?.click()); await p.waitForTimeout(700);
  await p.evaluate(() => [...document.querySelectorAll('#app button')].find(b => /Ready/.test(b.textContent))?.click()); await p.waitForTimeout(3500);
}
async function concede(p) {
  if (await p.evaluate(() => EmberBridge.view) !== 'cardBattle') return;
  await p.evaluate(() => document.querySelector('.biIntro, #bossIntro')?.click()); await p.waitForTimeout(300);
  await p.evaluate(() => [...document.querySelectorAll('#app button')].find(b => /Concede/.test(b.textContent))?.click()); await p.waitForTimeout(800);
  await p.evaluate(() => [...document.querySelectorAll('button')].find(b => /^(Concede|Yes|Leave)/.test(b.textContent.trim()) && b.closest('[role=dialog],[role=alertdialog],.modal,.confirm'))?.click()); await p.waitForTimeout(2500);
}
async function playTurns(p, n) {
  for (let i = 0; i < n; i++) {
    if (await p.evaluate(() => EmberBridge.view) !== 'cardBattle') return;
    await p.keyboard.press('e'); await p.waitForTimeout(400);
    const hit = await p.evaluate(() => { const b = [...document.querySelectorAll('[data-card-move]')].find(b => !b.disabled); b?.click(); return !!b; });
    await p.waitForTimeout(hit ? 2200 : 300);
    await p.evaluate(() => [...document.querySelectorAll('#app button')].find(b => /End Turn/.test(b.textContent) && !b.disabled)?.click());
    await p.waitForTimeout(3500);
  }
}
const SCREENS = {
  home: async p => { await go(p, 'home', 2500); },
  packs: async p => { await go(p, 'packs'); },
  packOpen: async p => { await go(p, 'packs'); await p.click('[data-buy="pack"]').catch(() => p.click('[data-buy]')); await p.waitForTimeout(1200); await p.click('#confirmPack').catch(() => { }); await p.waitForTimeout(4200); },
  packNext: async p => { await p.click('#revealNext').catch(() => { }); await p.waitForTimeout(3500); },
  packAll: async p => { await p.click('#revealAll').catch(() => { }); await p.waitForTimeout(5000); },
  rareFind: async p => {
    await p.evaluate(() => { EmberBridge.state.coins = 1e6; EmberBridge.go('packs'); }); await p.waitForTimeout(1500);
    await p.evaluate(() => { if (!window.__r) window.__r = Math.random; const r = window.__r; let n = 0; Math.random = () => (n++ < 400 ? 0.004 : r()); });
    await p.click('[data-buy="legend"]'); await p.waitForTimeout(1200); await p.click('#confirmPack').catch(() => { }); await p.waitForTimeout(4200);
    await p.click('#revealAll').catch(() => { }); for (let k = 0; k < 20 && !(await p.$('#rareFind')); k++) await p.waitForTimeout(500); await p.waitForTimeout(800);
    await p.evaluate(() => { Math.random = window.__r; });
  },
  binder: async p => { await clean(p); await go(p, 'inventory'); },
  details: async p => { await go(p, 'inventory'); await p.evaluate(() => { const c = EmberBridge.state.owned.find(c => c.shiny) || EmberBridge.state.owned[0]; window.EmberCardDetails.open(c.id); }); await p.waitForTimeout(1500); },
  decks: async p => { await clean(p); await go(p, 'decks', 2000); },
  vault: async p => { await go(p, 'vault'); },
  collection: async p => { await go(p, 'album', 2000); },
  index: async p => { await go(p, 'index'); },
  map: async p => { await go(p, 'map', 2000); await p.evaluate(() => window.EmberUI?.selectLevel?.(1)); await p.waitForTimeout(600); },
  bossIntro: async p => { await p.evaluate(() => { EmberBridge.state.cleared = Array.from({ length: 9 }, (_, i) => i + 1); EmberBridge.beginBattle(10); }); await p.waitForTimeout(900); },
  bossLeave: async p => { await concede(p); },
  battle: async p => { await clean(p); await setupBattle(p, 1); await playTurns(p, 2); },
  victory: async p => {
    if (await p.evaluate(() => EmberBridge.view) !== 'cardBattle') { await setupBattle(p, 1); await playTurns(p, 1); }
    await p.evaluate(() => { const m = EmberBridge.state.cardBattle?.match; if (m) { m.sides[0].points = 3; m.result = { winner: 0, reason: 'Fit scored 3 points.' }; } });
    for (let k = 0; k < 20 && await p.evaluate(() => EmberBridge.view) !== 'cardResult'; k++) await p.waitForTimeout(300);
    await p.waitForTimeout(2500);
  },
  defeated: async p => { await setupBattle(p, 1); await concede(p); },
  friends: async p => { await go(p, 'friends', 3000); },
  friendProfile: async p => { await p.evaluate(n => window.EmberProfile.openFriend(n), names.B); await p.waitForTimeout(3000); },
  profile: async p => { await go(p, 'profile', 2000); },
  daily: async p => { await go(p, 'home', 1200); await clean(p); await p.evaluate(() => window.EmberDaily.open()); await p.waitForTimeout(1500); },
  whatsNew: async p => { await clean(p); await p.evaluate(() => window.EmberWhatsNew.open()); await p.waitForTimeout(1000); },
  achievements: async p => { await clean(p); await go(p, 'achievements'); },
  userMenu: async p => { await go(p, 'home', 1200); await menu(p); },
  a11yNormal: async p => { await clean(p); await menuItem(p, 'Accessib'); await p.evaluate(() => document.querySelector('#a11yPanel input[value=normal]')?.click()); await p.waitForTimeout(400); },
  a11yLarge: async p => { await p.evaluate(() => document.querySelector('#a11yPanel input[value=large]')?.click()); await p.waitForTimeout(500); },
  a11yXl: async p => { await p.evaluate(() => document.querySelector('#a11yPanel input[value=xl]')?.click()); await p.waitForTimeout(500); },
  homeXl: async p => { await clean(p); await go(p, 'home', 1500); },
  binderXl: async p => { await go(p, 'inventory'); },
  a11yReset: async p => { await menuItem(p, 'Accessib'); await p.evaluate(() => document.querySelector('#a11yPanel input[value=normal]')?.click()); await p.waitForTimeout(300); await clean(p); },
  settings: async p => { await clean(p); await menuItem(p, 'Settings'); await p.waitForTimeout(800); },
  account: async p => { await clean(p); await go(p, 'account'); },
  // Pages added in the second pass.
  binderSwing: async p => { // sideways scroll while the binder cover swings open (checked every 80 ms)
    await go(p, 'home', 800); await p.evaluate(() => EmberBridge.go('inventory'));
    let worst = 0; for (let i = 0; i < 25; i++) { worst = Math.max(worst, await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)); await p.waitForTimeout(80); }
    p.swing = worst;
  },
  training: async p => { await go(p, 'training', 1800); const t = await p.$$('.tpPick'); if (t[1]) { await t[1].click(); await p.waitForTimeout(600); } },
  trainingRun: async p => { await p.evaluate(() => document.querySelector('[data-practice-pet]')?.click()); await p.waitForTimeout(1800); },
  rules: async p => { await go(p, 'rules', 1500); },
  rulesFull: async p => { await p.click('[data-rtab="full"]').catch(() => { }); await p.waitForTimeout(500); },
  fusion: async p => { await go(p, 'fusion', 1500); },
  mutation: async p => { await go(p, 'mutation', 1500); },
  mutationBook: async p => { await go(p, 'mutationBook', 1500); },
  trading: async p => { await go(p, 'trading', 2500); },
  stats: async p => { await go(p, 'stats', 1800); },
  profileBacks: async p => { await go(p, 'profile', 1500); await p.click('[data-pf-tab="backs"]').catch(() => { }); await p.waitForTimeout(600); },
  profileAvatar: async p => { await p.click('[data-pf-tab="avatar"]').catch(() => { }); await p.waitForTimeout(600); },
  activity: async p => { await go(p, 'friends', 3000); await p.evaluate(() => { const a = document.querySelector('.actPanel, #actPanel, [class*="actPanel"], [aria-label*="ctivity"]'); a?.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(500); },
  musicHint: async p => { await clean(p); await p.evaluate(() => { const m = EmberBridge.state.ember.music; if (m) { m.hinted = false; m.on = false; } EmberBridge.go('home'); }); await p.waitForTimeout(3600); },
  musicMenu: async p => { await p.evaluate(() => document.querySelector('#fxMusicHint')?.remove()); await menu(p); },
  shareDetails: async p => { await go(p, 'inventory'); await p.evaluate(() => { const c = EmberBridge.state.owned.find(c => c.shiny) || EmberBridge.state.owned[0]; window.EmberCardDetails.open(c.id); }); await p.waitForTimeout(1500); await p.evaluate(() => document.querySelector('#cardDetails .shrBtn')?.click()); await p.waitForTimeout(2500); },
};
const KEEP = new Set(['rulesFull', 'trainingRun', 'profileAvatar', 'musicMenu', 'packNext', 'packAll', 'a11yLarge', 'a11yXl', 'bossLeave', 'victory', 'homeXl', 'binderXl']);
const NOSHOT = new Set(['a11yReset', 'bossLeave']);
const NOCHECK = new Set(['a11yReset', 'bossLeave']);
const LIST = process.env.SCREENS ? process.env.SCREENS.split(',') : Object.keys(SCREENS);
(async () => {
  const b = await chromium.launch();
  const report = {};
  for (const [W, H, touch] of SIZES) {
    const sz = W + 'x' + H;
    const { ctx, p } = await open(W, H, touch, { browser: b, storageState: `${D}/state-${sz}.json` });
    p.on('dialog', d => d.accept());
    await p.waitForTimeout(800);
    for (const s of LIST) {
      if (!KEEP.has(s)) await clean(p).catch(() => { });
      try { await SCREENS[s](p); } catch (e) { (report[sz] ||= {})[s] = [['script-error', e.message.split('\n')[0]]]; continue; }
      if (NOCHECK.has(s)) continue;
      const res = await check(p, touch).catch(e => [['check-error', e.message.split('\n')[0]]]);
      if (p.swing > 1) res.push(['hscroll', `binder cover swing: ${p.swing}px sideways`]); p.swing = 0;
      (report[sz] ||= {})[s] = res;
      if (process.env.SHOTS !== '0' && !NOSHOT.has(s)) await p.screenshot({ path: `${OUT}/${PFX}${TAG}-${sz}-${s}.png` }).catch(() => { });
      if (process.env.SHOTS !== '0' && !NOSHOT.has(s) && await p.evaluate(() => { const m = document.documentElement.scrollHeight - innerHeight; if (m > 40) { scrollTo(0, m); return true; } return false; })) { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/${PFX}${TAG}-${sz}-${s}-end.png` }).catch(() => { }); await p.evaluate(() => scrollTo(0, 0)); }
      console.log(sz, s, res.length ? res.map(r => r[0] + ': ' + r[1]).join('\n      ') : 'ok');
    }
    if (p.errs.length) console.log(sz, 'page errors', p.errs.slice(0, 5));
    await ctx.close();
  }
  fs.writeFileSync(`${D}/report-${TAG}-${process.env.SIZES || 'all'}.json`, JSON.stringify(report, null, 1));
  const kinds = {}; for (const sz in report) for (const s in report[sz]) for (const [k] of report[sz][s]) kinds[k] = (kinds[k] || 0) + 1;
  console.log('SUMMARY', TAG, JSON.stringify(kinds));
  await b.close();
})();
