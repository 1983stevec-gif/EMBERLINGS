const { chromium } = require('playwright');
const quiet = require('./quiet.cjs');
(async () => {
  const [w,h,view,out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:+w,height:+h}, hasTouch:true });
  await p.goto((process.env.BASE || 'http://127.0.0.1:8848') + '/'); await p.waitForTimeout(2500);
  const inp = await p.$('input[type=text], input:not([type])');
  if (inp && await inp.isVisible()) { await inp.fill('Tester'+Math.floor(Math.random()*1e5)); await p.keyboard.press('Enter'); await p.waitForTimeout(2000); }
  await quiet(p);
  if (view !== 'home') { await p.evaluate(v => window.EmberBridge.go(v), view); await p.waitForTimeout(1500); }
  await p.evaluate(()=>document.querySelector('.guideCard,.explorerGuide')?.remove()); await p.screenshot({ path: out, fullPage: process.env.FULL==='1' });
  console.log(await p.evaluate(() => JSON.stringify({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, menu: document.querySelector('.uiTabMenu')?.getBoundingClientRect().height, view: window.EmberBridge.view })));
  await b.close();
})();
