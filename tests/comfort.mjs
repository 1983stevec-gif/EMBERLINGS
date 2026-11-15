// Comfort settings (public/comfort.js): quiet-hours time maths (incl. ranges over midnight), defaults for old saves,
// the spend-confirm threshold and the visual-only animation speed.
import assert from 'node:assert/strict';
import { parseTime, inQuietHours, minutesToChange, comfortOf, needsConfirm, animScaleOf, DEFAULTS, CONFIRM_STEPS, SPEEDS } from '../public/comfort.js';

const at = (h, m = 0) => h * 60 + m;
// Times
assert.equal(parseTime('00:00'), 0); assert.equal(parseTime('07:30'), 450); assert.equal(parseTime('7:05'), 425); assert.equal(parseTime('23:59'), 1439);
for (const bad of ['24:00', '12:60', '', null, undefined, 'noon', '1230', '12:5']) assert.equal(parseTime(bad), null, String(bad));

// A daytime range: start included, end not included
assert.equal(inQuietHours(at(12), '13:00', '15:00'), false);
assert.equal(inQuietHours(at(13), '13:00', '15:00'), true);
assert.equal(inQuietHours(at(14, 59), '13:00', '15:00'), true);
assert.equal(inQuietHours(at(15), '13:00', '15:00'), false);

// Over midnight: 22:00 to 07:00
for (const [h, m, want] of [[21, 59, false], [22, 0, true], [23, 30, true], [0, 0, true], [3, 15, true], [6, 59, true], [7, 0, false], [12, 0, false]])
  assert.equal(inQuietHours(at(h, m), '22:00', '07:00'), want, `${h}:${m}`);
// Ends exactly at midnight, starts at midnight
assert.equal(inQuietHours(at(23, 59), '21:00', '00:00'), true); assert.equal(inQuietHours(at(0, 0), '21:00', '00:00'), false);
assert.equal(inQuietHours(at(0, 0), '00:00', '06:00'), true); assert.equal(inQuietHours(at(6, 0), '00:00', '06:00'), false);
// The same time twice or a bad time means no quiet hours
assert.equal(inQuietHours(at(10), '10:00', '10:00'), false); assert.equal(inQuietHours(at(10), 'x', '11:00'), false);
// Works with a Date too, and odd minute counts wrap
assert.equal(inQuietHours(new Date(2026, 10, 5, 23, 15), '22:00', '07:00'), true);
assert.equal(inQuietHours(new Date(2026, 10, 5, 9, 0), '22:00', '07:00'), false);
assert.equal(inQuietHours(at(23) + 1440, '22:00', '07:00'), true); assert.equal(inQuietHours(-60, '22:00', '07:00'), true);

// Minutes until the next change
assert.equal(minutesToChange(at(21), '22:00', '07:00'), 60);
assert.equal(minutesToChange(at(23), '22:00', '07:00'), 480);
assert.equal(minutesToChange(at(7), '22:00', '07:00'), 900);
assert.equal(minutesToChange(at(13), '13:00', '15:00'), 120);
assert.equal(minutesToChange(at(13), '13:00', '13:00'), null);

// Old saves: no comfort field means the defaults, and reading never writes
const old = { coins: 500, ember: { muted: false } }, before = JSON.stringify(old);
assert.deepEqual(comfortOf(old), { haptics: false, speed: 'normal', confirm: 0, quiet: { on: false, from: '22:00', to: '07:00' }, lefty: false });
assert.deepEqual(comfortOf(undefined), comfortOf({})); assert.equal(JSON.stringify(old), before);
assert.equal(DEFAULTS.haptics, false, 'haptics are off by default');
// Saved values are read back; nonsense falls back to the default
assert.deepEqual(comfortOf({ ember: { comfort: { haptics: true, speed: 'vfast', confirm: 5000, quiet: { on: true, from: '21:30', to: '06:45' }, lefty: true } } }),
  { haptics: true, speed: 'vfast', confirm: 5000, quiet: { on: true, from: '21:30', to: '06:45' }, lefty: true });
assert.deepEqual(comfortOf({ ember: { comfort: { haptics: 'yes', speed: 'warp', confirm: 123, quiet: { on: 1, from: '25:00' }, lefty: 1 } } }), comfortOf({}));

// Spend confirm: Off never asks; otherwise asks at the amount or more
assert.deepEqual(CONFIRM_STEPS, [0, 1000, 5000, 20000]);
assert.equal(needsConfirm(600000, 0), false);
assert.equal(needsConfirm(999, 1000), false); assert.equal(needsConfirm(1000, 1000), true); assert.equal(needsConfirm(1500, 1000), true);
assert.equal(needsConfirm(3000, 5000), false); assert.equal(needsConfirm(35000, 20000), true);

// Animation speed is a scale between 0 and 1 (quicker, never slower); unknown means normal
assert.equal(animScaleOf('normal'), 1); assert.ok(animScaleOf('fast') < 1 && animScaleOf('vfast') < animScaleOf('fast') && animScaleOf('vfast') > 0);
assert.equal(animScaleOf('nope'), 1); assert.deepEqual(Object.keys(SPEEDS), ['normal', 'fast', 'vfast']);

console.log('PASS comfort settings: quiet hours (incl. over midnight), old saves load with defaults, spend confirm threshold, visual speed scale');
