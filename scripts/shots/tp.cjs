const { chromium } = require('playwright');
const quiet = require('./quiet.cjs');
(async () => {
  const [w,h,view,out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:+w,height:+h}, hasTouch:true, isMobile:true });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto((process.env.BASE || 'http://127.0.0.1:8848') + '/'); await p.waitForTimeout(2500);
  const inp = await p.$('input[type=text], input:not([type])');
  if (inp && await inp.isVisible()) { await inp.fill('Tester'+Math.floor(Math.random()*1e5)); await p.keyboard.press('Enter'); await p.waitForTimeout(2000); }
  await quiet(p);
  if (view==='rules-full'||view==='rules-cond'){ await p.evaluate(()=>EmberBridge.go('rules')); await p.waitForTimeout(1200); await p.click(`[data-rtab="${view==='rules-full'?'full':'cond'}"]`); await p.waitForTimeout(500);} 
  else { await p.evaluate(v => window.EmberBridge.go(v), view); await p.waitForTimeout(1800); }
  if (view==='training'){ const b2=await p.$$('.tpPick'); if(b2[1]){await b2[1].click(); await p.waitForTimeout(600);} }
  await p.screenshot({ path: out, fullPage: process.env.FULL==='1' });
  console.log(view, await p.evaluate(() => JSON.stringify({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, tp: !!document.querySelector('.tpPage'), sel: document.querySelector('.tpPick.sel')?.dataset.acad })), errs);
  await b.close();
})();
