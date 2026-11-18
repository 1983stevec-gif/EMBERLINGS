// The page include list in game/index.html: every add-on module loads exactly once, the document
// closes exactly once, and every included module file exists in public/. A second copy of the whole
// list (the page once carried eight) wastes load time and can shadow future edits; a missing module
// silently drops a feature, as almost happened to the Help centre.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

let n = 0;
const test = (name, f) => { f(); n++; console.log('PASS ' + name); };

const html = readFileSync('game/index.html', 'utf8');

test('every module script is included exactly once', () => {
  const per = new Map();
  for (const m of html.matchAll(/<script[^>]*src="(\/[a-z0-9-]+\.js)"/g)) per.set(m[1], (per.get(m[1]) || 0) + 1);
  assert.ok(per.size >= 45, 'expected the full module list, found ' + per.size);
  const dups = [...per].filter(([, c]) => c > 1);
  assert.deepEqual(dups, [], 'modules included more than once: ' + JSON.stringify(dups));
});

test('every included module file exists in public/', () => {
  for (const m of html.matchAll(/<script[^>]*src="(\/[a-z0-9-]+\.js)"/g)) {
    assert.ok(existsSync('public' + m[1]), 'missing public' + m[1]);
  }
});

test('the document closes exactly once, after the includes', () => {
  assert.equal((html.match(/<\/body><\/html>/g) || []).length, 1);
  const last = html.trimEnd();
  assert.ok(last.endsWith('</body></html>'), 'the file should end with one </body></html>');
});

test('the core script stays closed before the first module include', () => {
  const i = html.indexOf('<script type="module" src="/enhancements.js"></script>');
  assert.ok(i > 0);
  const before = html.slice(0, i);
  const opens = (before.match(/<script/g) || []).length;
  const closes = (before.match(/<\/script>/g) || []).length;
  assert.equal(opens, closes, 'the inline core script must be closed before module includes begin');
});

test('script tags open and close in balance across the file', () => {
  const opens = (html.match(/<script/g) || []).length;
  const closes = (html.match(/<\/script>/g) || []).length;
  assert.equal(opens, closes);
});

console.log('html-includes: ok (' + n + ' checks)');
