// Binder tools: favourites clean-up (cards leaving through trades or fusion), saved views clean-up, and the CSV export.
import assert from 'node:assert/strict';
import { cleanFavourites, cleanPresets, collectionRows, toCSV, sheetTiles, CSV_HEAD, FAV_CAP, PRESET_CAP } from '../public/binder-tools.js';

// ---------- Favourites ----------
const owned = [{ id: 'a', kind: 0 }, { id: 'b', kind: 1 }, { id: 'c', kind: 2 }];
let ember = { favourites: ['a', 'b', 'gone-by-trade', 'b', 7, 'c'] };
assert.equal(cleanFavourites(ember, owned), true);
assert.deepEqual(ember.favourites, ['a', 'b', 'c']);
assert.equal(cleanFavourites(ember, owned), false, 'already clean: nothing changes');
// Fusion consumed 'a' and 'b'.
assert.equal(cleanFavourites(ember, [{ id: 'c', kind: 2 }, { id: 'new', kind: 5 }]), true);
assert.deepEqual(ember.favourites, ['c']);
// Missing list: nothing created (additive only when the player stars something).
const none = {}; assert.equal(cleanFavourites(none, owned), false); assert.equal('favourites' in none, false);
// A half-loaded save with no cards never wipes favourites.
ember = { favourites: ['a'] }; assert.equal(cleanFavourites(ember, []), false); assert.deepEqual(ember.favourites, ['a']);
// Cap keeps the newest stars.
const many = Array.from({ length: FAV_CAP + 20 }, (_, i) => ({ id: 'x' + i, kind: 0 }));
ember = { favourites: many.map(c => c.id) }; cleanFavourites(ember, many);
assert.equal(ember.favourites.length, FAV_CAP); assert.equal(ember.favourites.at(-1), 'x' + (FAV_CAP + 19));

// ---------- Saved views ----------
const pe = { binderPresets: [{ name: '  Fire rares ', f: { element: 'Fire', rarity: 'Rare', bogus: 'x' }, sort: 'level', fav: 1 }, { name: '' }, null,
  ...Array.from({ length: 8 }, (_, i) => ({ name: 'View ' + i + ' with a very long name', f: {}, sort: 'weird' }))] };
assert.equal(cleanPresets(pe), true);
assert.equal(pe.binderPresets.length, PRESET_CAP);
assert.deepEqual(pe.binderPresets[0], { name: 'Fire rares', f: { element: 'Fire', rarity: 'Rare' }, sort: 'level', fav: true });
assert.equal(pe.binderPresets[1].sort, 'recent'); assert.ok(pe.binderPresets[1].name.length <= 16);
assert.equal(cleanPresets(pe), false);
assert.equal(cleanPresets({}), false);

// ---------- CSV export ----------
const RANK = { Common: 0, Uncommon: 1, Rare: 2, Mythic: 3, Legendary: 4 };
const h = {
  name: k => ['Flaminyx', 'Lunamo', 'Verdelle, "the green"'][k] || 'S' + k, element: k => ['Fire', 'Moon', 'Nature'][k],
  rarity: c => c.rarity || 'Common', rank: c => RANK[c.rarity || 'Common'], mutation: id => ({ spark: 'Spark' })[id],
  origins: { a1: { at: Date.UTC(2026, 9, 3, 12) }, a2: { at: Date.UTC(2026, 8, 1, 12) } }, favourites: new Set(['a2'])
};
const cards = [
  { id: 'a1', kind: 0, level: 5, rarity: 'Rare' }, { id: 'a2', kind: 0, level: 5, rarity: 'Rare' }, { id: 'a3', kind: 0, level: 1 },
  { id: 'b1', kind: 1, level: 12, rarity: 'Legendary', shiny: true, mutation: 'spark' }, { id: 'c1', kind: 2, level: 3 }, { bad: true }
];
const rows = collectionRows(cards, h);
assert.equal(rows.length, 4, 'two identical Rare Flaminyx copies share one row');
assert.equal(rows[0].species, 'Flaminyx'); assert.equal(rows[0].rarity, 'Rare'); assert.equal(rows[0].copies, 2);
assert.equal(rows[0].at, Date.UTC(2026, 8, 1, 12), 'earliest date found'); assert.equal(rows[0].favourite, true);
assert.equal(rows[2].form, 'Radiant Basic'); assert.equal(rows[2].mutation, 'Spark'); assert.equal(rows[2].shiny, true);
const csv = toCSV(rows), lines = csv.trim().split('\r\n');
assert.equal(lines[0], CSV_HEAD.join(','));
assert.equal(lines.length, 5);
assert.match(lines[1], /^Flaminyx,001,Fire,Basic,Rare,None,No,5,2,2026-09-0[12],Yes$/);
assert.equal(lines[2], 'Flaminyx,001,Fire,Basic,Common,None,No,1,1,,');
assert.equal(lines[3], 'Lunamo,002,Moon,Radiant Basic,Legendary,Spark,Yes,12,1,,');
assert.equal(lines[4], '"Verdelle, ""the green""",003,Nature,Basic,Common,None,No,3,1,,', 'commas and quotes are escaped');
assert.equal(toCSV([{ ...rows[1], species: '=HYPERLINK("x")' }]).split('\r\n')[1].startsWith('"\'=HYPERLINK'), true, 'no spreadsheet formulas');
// Picture sheet merges levels of the same species / rarity / mutation / shiny.
const tiles = sheetTiles(collectionRows([...cards, { id: 'a4', kind: 0, level: 9, rarity: 'Rare' }], h));
assert.equal(tiles.find(t => t.kind === 0 && t.rarity === 'Rare').copies, 3);
assert.equal(tiles.find(t => t.kind === 0 && t.rarity === 'Rare').level, 9);

console.log('binder-tools: ok');
