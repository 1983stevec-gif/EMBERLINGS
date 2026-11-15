// Friend nicknames and favourites: sorting, escaping, nickname cleaning and the 200-friend cap. Local only.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanNick, cleanNotes, setNote, sortFriends, nameHTML, nameText, nickOf, isFav, validName, esc, NICK_MAX, NOTES_CAP } from '../public/friend-notes.js';

// ---------- Nicknames ----------
assert.equal(cleanNick('  Best   pal \n'), 'Best pal');
assert.equal(cleanNick('x'.repeat(40)).length, NICK_MAX);
assert.equal([...cleanNick('🔥'.repeat(30))].length, NICK_MAX, 'emoji count as one character each');
assert.equal(cleanNick('a\u0000b‮c'), 'a b c', 'control and direction characters become spaces');
assert.equal(cleanNick(null), '');

// ---------- Escaping ----------
const evil = { Ann: { nick: '<img src=x>"\'&' } };
const html = nameHTML(evil, 'Ann');
assert.ok(!html.includes('<img'), 'no raw tags'); assert.ok(html.includes('&lt;img') && html.includes('&quot;') && html.includes('&#39;') && html.includes('&amp;'));
assert.equal(nameHTML({}, 'Ann'), 'Ann');
assert.equal(nameHTML({ '<b>': { nick: 'x' } }, '<b>'), '&lt;b&gt;', 'invalid usernames are escaped and get no nickname');
assert.equal(nameText({ Ann: { nick: 'Sis' } }, 'Ann'), 'Sis (Ann)');
assert.equal(esc('<&>'), '&lt;&amp;&gt;');

// ---------- Unsafe keys ----------
assert.equal(validName('__proto__'), false);
assert.equal(nickOf({}, 'constructor'), '', 'inherited properties are never read as notes');
assert.equal(isFav({}, 'toString'), false);
const p = {}; assert.equal(setNote(p, '__proto__', { nick: 'x' }), null); assert.equal('friendNotes' in p, false);
assert.deepEqual(cleanNotes(JSON.parse('{"__proto__":{"nick":"x"},"ok_1":{"nick":"Pal"}}')), { ok_1: { nick: 'Pal', at: 0 } });

// ---------- setNote ----------
const ember = {};
assert.equal(setNote(ember, 'Ann', { nick: '', fav: false }), null); assert.equal('friendNotes' in ember, false, 'nothing created for an empty note');
setNote(ember, 'Ann', { nick: '  Sis ' }, 1);
assert.deepEqual(ember.friendNotes, { Ann: { nick: 'Sis', at: 1 } });
setNote(ember, 'Ann', { fav: true }, 2);
assert.deepEqual(ember.friendNotes.Ann, { nick: 'Sis', fav: true, at: 2 }, 'a partial change keeps the rest');
setNote(ember, 'Ann', { nick: '' }, 3); assert.deepEqual(ember.friendNotes.Ann, { fav: true, at: 3 });
setNote(ember, 'Ann', { fav: false }, 4); assert.deepEqual(ember.friendNotes, {}, 'an empty note is removed');

// ---------- Cap ----------
const big = {};
for (let i = 0; i < NOTES_CAP; i++) setNote(big, 'f' + i, { nick: 'N' + i, fav: i === 0 }, 10 + i);
assert.equal(Object.keys(big.friendNotes).length, NOTES_CAP);
setNote(big, 'newest', { nick: 'New' }, 9999);
assert.equal(Object.keys(big.friendNotes).length, NOTES_CAP, 'never more than the cap');
assert.ok(big.friendNotes.newest && big.friendNotes.f0, 'the new note and the favourite stay');
assert.equal(big.friendNotes.f1, undefined, 'the oldest non-favourite goes');
const raw = {}; for (let i = 0; i < NOTES_CAP + 50; i++) raw['u' + i] = { nick: 'x', at: i, fav: i === 3 };
raw.bad = 'nope'; raw['bad name'] = { nick: 'x' }; raw.empty = { nick: '   ' };
const clean = cleanNotes(raw);
assert.equal(Object.keys(clean).length, NOTES_CAP); assert.ok(clean.u3 && clean['u' + (NOTES_CAP + 49)] && !clean.u4 && !clean.bad && !clean.empty && !clean['bad name']);
assert.deepEqual(cleanNotes(null), {}); assert.deepEqual(cleanNotes([1, 2]), {});

// ---------- Sorting: favourites, then online, then the original order ----------
const items = [{ name: 'a', online: false }, { name: 'b', online: true }, { name: 'c', online: false }, { name: 'd', online: true }, { name: 'e', online: false }];
assert.deepEqual(sortFriends(items, {}).map(x => x.name), ['b', 'd', 'a', 'c', 'e']);
const favs = { e: { fav: true }, c: { nick: 'only a nickname' }, a: { fav: true } };
assert.deepEqual(sortFriends(items, favs).map(x => x.name), ['a', 'e', 'b', 'd', 'c']);
assert.deepEqual(sortFriends(items, { d: { fav: true } }).map(x => x.name), ['d', 'b', 'a', 'c', 'e'], 'an online favourite comes before other online friends');
assert.deepEqual(sortFriends([], favs), []);

// ---------- Wiring: script tag only, nothing sent online, save key untouched ----------
const src = readFileSync(new URL('../public/friend-notes.js', import.meta.url), 'utf8');
assert.ok(!/\.online\s*\(|fetch\s*\(|sendBeacon|XMLHttpRequest|WebSocket/.test(src), 'friend notes never talk to the server');
assert.ok(!/localStorage|mythlings-playable-v1/.test(src), 'saved only through the game save');
const game = readFileSync(new URL('../game/index.html', import.meta.url), 'utf8');
assert.ok(game.includes('<script type="module" src="/friend-notes.js"></script>'));
console.log('friend-notes: ok');
