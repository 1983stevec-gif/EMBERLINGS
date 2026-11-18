// Offline solo play (public/sw.js + public/offline-note.js): the worker saves the page, every module
// it loads, the creature art, the fonts and the branding, so a saved game plays with no connection;
// it still never caches /api/; and the offline banner shows once, clears itself when the connection
// returns, and keeps its toast quiet during quiet hours.
// The page's include list and the worker's saved list are compared here so they can't drift apart.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { noteStep, OFFLINE_TEXT } from '../public/offline-note.js';

let n = 0;
const test = (name, f) => { f(); n++; console.log('PASS ' + name); };

const html = readFileSync('game/index.html', 'utf8');
const sw = readFileSync('public/sw.js', 'utf8');

// One array of quoted paths from the worker. Only whole quoted lines count, so an apostrophe in a
// comment above the list never looks like an entry.
function sweep(name) {
  const block = new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\];').exec(sw);
  assert.ok(block, name + ' should be a plain array in public/sw.js');
  return block[1].split('\n').map(l => l.trim()).filter(l => /^'[^']+',?$/.test(l))
    .map(l => l.replace(/,$/, '').replace(/'/g, ''));
}
const modules = sweep('CORE_MODULES'), media = sweep('CORE_MEDIA');

test('the saved module list covers every module the page includes', () => {
  const page = new Set();
  for (const m of html.matchAll(/<script[^>]*src="(\/[a-z0-9-]+\.js)"/g)) page.add(m[1]);
  assert.ok(page.size >= 45, 'expected the full page module list, found ' + page.size);
  const missing = [...page].filter(p => !modules.includes(p));
  assert.deepEqual(missing, [], 'modules the page loads but the worker never saves: ' + JSON.stringify(missing));
  assert.ok(modules.length >= page.size, 'the saved list is the page list plus the files those modules import');
  // The worker adds the note module to the page copy, so that file must be saved too.
  assert.ok(/\/offline-note\.js/.test(sw) && modules.includes('/offline-note.js'), 'the offline note must be saved');
  assert.ok(media.includes('/art/mythlings-atlas-v2.webp'), 'the creature atlas must be saved');
  assert.ok(media.some(p => p.startsWith('/art/ui/')), 'the interface art manifest must be saved');
  assert.ok(media.some(p => p.startsWith('/fonts/') && p.endsWith('.woff2')), 'the fonts must be saved');
  assert.ok(media.some(p => p.startsWith('/branding/')), 'the branding must be saved');
});

test('every saved file exists in public/', () => {
  for (const p of [...modules, ...media]) assert.ok(existsSync('public' + p), 'missing public' + p);
});

test('the worker never caches an /api/ request', () => {
  // Every /api/ mention has to be a rule that sends the request straight to the network, or a
  // comment. Nothing may build a cache entry for one.
  for (const m of sw.matchAll(/\/api\//g)) {
    const start = sw.lastIndexOf('\n', m.index) + 1, end = sw.indexOf('\n', m.index);
    const line = sw.slice(start, end === -1 ? sw.length : end).trim();
    assert.ok(/startsWith\('\/api\/'\)/.test(line) || line.startsWith('*') || line.startsWith('//'),
      'unexpected /api/ mention: ' + line);
  }
  assert.ok(/if \(p\.startsWith\('\/api\/'\) \|\| p === '\/api'\) return null;/.test(sw), 'the cache rule must refuse /api/');
  assert.ok(/url\.pathname\.startsWith\('\/api\/'\)/.test(sw), 'the fetch handler must send /api/ to the network');
  for (const p of [...modules, ...media]) assert.ok(!p.includes('/api'), 'nothing online may be saved: ' + p);
});

test('the offline banner shows once, clears on return, and respects quiet hours', () => {
  const run = () => {
    let state = { shown: false, dismissed: false };
    return (event, opts) => { const r = noteStep(state, event, opts); state = { shown: r.shown, dismissed: r.dismissed }; return r; };
  };

  let step = run();
  const first = step('offline');
  assert.equal(first.shown, true, 'offline shows the banner');
  assert.equal(first.check, true, 'and asks for one gentle check');
  assert.equal(first.changed, true);

  // A second failure, or the browser repeating itself, must not add a second banner or a second check.
  for (const event of ['offline', 'failed']) {
    const again = step(event);
    assert.equal(again.shown, true);
    assert.equal(again.changed, false, 'never shows twice');
    assert.equal(again.check, false, 'only one gentle check per outage');
    assert.equal(again.toast, '');
  }

  const back = step('online');
  assert.equal(back.shown, false, 'online clears the banner');
  assert.equal(back.toast, 'Back online', 'and says so once');
  assert.equal(back.changed, true);
  assert.equal(back.check, false);
  assert.equal(step('online').toast, '', 'nothing to clear means no toast');

  // Quiet hours: the banner still clears, the toast does not fire.
  step = run();
  assert.equal(step('failed').shown, true);
  const quietBack = step('saved', { quiet: true });
  assert.equal(quietBack.shown, false);
  assert.equal(quietBack.toast, '', 'no toast during quiet hours');

  // Close: the banner stays away for this outage, and a later outage may show it again.
  step = run();
  step('offline');
  const closed = step('dismiss');
  assert.equal(closed.shown, false);
  assert.equal(closed.changed, true);
  assert.equal(step('failed').shown, false, 'a closed banner stays closed for this outage');
  assert.equal(step('offline').toast, '');
  assert.equal(step('online').changed, true, 'the return clears the closed state quietly');
  assert.equal(step('offline').shown, true, 'a later outage shows it again');

  // Nothing happens for an unknown event, and a hidden banner never fires a toast.
  step = run();
  assert.equal(step('online').toast, '');
  assert.equal(step('later').shown, false);
});

test('the note uses the agreed plain wording', () => {
  assert.equal(OFFLINE_TEXT.title, "You're offline");
  assert.equal(OFFLINE_TEXT.line, "Solo battles, your binder and saved quest packs keep working. Friends and trading wait until you're back.");
  assert.equal(OFFLINE_TEXT.back, 'Back online');
  for (const text of Object.values(OFFLINE_TEXT)) assert.ok(!/\bAI\b|model/i.test(text), 'plain wording: ' + text);
});

console.log('offline-solo: ok (' + n + ' checks)');
