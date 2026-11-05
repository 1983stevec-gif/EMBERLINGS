const { chromium } = require('playwright');
const quiet = require('../quiet.cjs');
const DATA = process.env.DATA || require('path').join(require('os').tmpdir(), 'ember-sweep'); require('fs').mkdirSync(DATA, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8848';
async function open(W, H, touch, opts = {}) {
  const b = opts.browser || await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: touch, isMobile: touch && W < 1000, storageState: opts.storageState });
  const p = await ctx.newPage();
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(BASE + '/'); await p.waitForTimeout(2500);
  if (!opts.storageState) {
    const inp = await p.$('input[type=text], input:not([type])');
    if (inp && await inp.isVisible()) { await inp.fill(opts.name || ('Fit' + Math.floor(Math.random() * 1e5))); await p.keyboard.press('Enter'); await p.waitForTimeout(2500); }
  }
  // Same test account in many browsers: keep this device's save when the cloud asks.
  for (let k = 0; k < 6; k++) { const d = await p.$('.uiCloudDlg [data-pick="local"]'); if (d) { await d.click(); await p.waitForTimeout(800); break; } await p.waitForTimeout(300); }
  await quiet(p);
  return { b, ctx, p };
}
module.exports = { open, BASE, quiet, DATA };
