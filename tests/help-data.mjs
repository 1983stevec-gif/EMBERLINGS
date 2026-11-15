// Help centre: content shape, every "Take me there" target exists in the game, and search finds the right answers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CATEGORIES, ANSWERS, GLOSSARY } from '../public/help-data.js';
import { searchAnswers, searchGlossary, target, words, PANELS } from '../public/help.js';

const html = fs.readFileSync('game/index.html', 'utf8');
const mods = fs.readdirSync('public').filter(f => f.endsWith('.js')).map(f => fs.readFileSync('public/' + f, 'utf8')).join('\n');
const all = html + '\n' + mods;

// Screens the game can show: views set in the core, data-go buttons and modules' registerView calls.
const views = new Set();
for (const re of [/view='([A-Za-z]+)'/g, /go\('([A-Za-z]+)'\)/g, /data-go="([A-Za-z]+)"/g, /registerView\('([A-Za-z]+)'/g]) for (const m of all.matchAll(re)) views.add(m[1]);
// Settings blocks: the built-in list and every addSection({ id: '…' }) in the modules.
const settings = new Set();
const builtIn = /const SECTIONS = \[(.*?)\];/s.exec(fs.readFileSync('public/settings.js', 'utf8'))[1];
for (const m of builtIn.matchAll(/\['([a-z0-9-]+)'/g)) settings.add(m[1]);
for (const m of mods.matchAll(/addSection\(\{\s*id:\s*'([a-z0-9-]+)'/g)) settings.add(m[1]);
// Panels and the module that opens each one.
const panelApi = { daily: 'window.EmberDaily', whatsnew: 'window.EmberWhatsNew', inbox: 'window.EmberInbox', keys: 'window.EmberA11y' };

// ---------- Content shape
const ids = new Set(), cats = new Set(CATEGORIES.map(c => c.id));
for (const a of ANSWERS) {
  assert(a.id && !ids.has(a.id), 'unique answer id ' + a.id); ids.add(a.id);
  assert(cats.has(a.cat), 'known category for ' + a.id);
  assert(typeof a.q === 'string' && a.q.endsWith('?'), 'question ends with ? : ' + a.id);
  assert(typeof a.a === 'string' && a.a.length >= 20 && a.a.length <= 420, 'answer length ' + a.id);
  assert(!/[<>]/.test(a.q + a.a), 'plain text only ' + a.id);
}
for (const c of CATEGORIES) assert(ANSWERS.some(a => a.cat === c.id), 'category has answers: ' + c.id);
const terms = new Set();
for (const g of GLOSSARY) { assert(g.term && !terms.has(g.term.toLowerCase()), 'unique term ' + g.term); terms.add(g.term.toLowerCase()); assert(g.def && g.def.length <= 300, 'definition length ' + g.term); }
console.log(`PASS help content: ${ANSWERS.length} answers in ${CATEGORIES.length} topics, ${GLOSSARY.length} glossary words, unique ids, plain text`);

// ---------- Every target exists
for (const item of [...ANSWERS, ...GLOSSARY]) {
  if (!item.to) continue;
  const t = target(item.to), name = item.id || item.term;
  if (t.kind === 'view') assert(views.has(t.id), `"${name}" goes to a screen that exists: ${t.id}`);
  else if (t.kind === 'settings') assert(settings.has(t.id), `"${name}" goes to a Settings block that exists: ${t.id}`);
  else { assert(PANELS.includes(t.id)); assert(mods.includes(panelApi[t.id] + ' =') || mods.includes(panelApi[t.id] + '='), `"${name}" opens a panel that exists: ${t.id}`); }
}
console.log('PASS every "Take me there" points at a real screen, Settings block or panel');

// ---------- Search
assert.deepEqual(words('  How do I OPEN a Pack?! '), ['how', 'do', 'i', 'open', 'a', 'pack']);
assert.equal(searchAnswers('').length, ANSWERS.length, 'empty search lists everything');
assert.equal(searchAnswers('open pack')[0].id, 'packs-open', 'best match first');
assert(searchAnswers('coins').length >= 3, 'common word finds several answers');
assert.equal(searchAnswers('zzqqxx').length, 0, 'nonsense finds nothing');
assert(searchAnswers('', 'vault').every(a => a.cat === 'vault') && searchAnswers('', 'vault').length > 0, 'topic filter');
assert(searchAnswers('PACK').length === searchAnswers('pack').length, 'case does not matter');
assert(searchGlossary('merfling').some(g => /merfling/i.test(g.term)), 'glossary search');
assert.equal(searchGlossary('').length, GLOSSARY.length, 'empty search lists every word');
console.log('PASS help search: best match first, topics, case, glossary, no results for nonsense');
