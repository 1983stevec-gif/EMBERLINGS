// Effects setting (Full / Light / Off): old saves load as Full, the choice is stored additively, device reduce-motion wins.
import assert from 'node:assert/strict';
import {FX_LEVELS,fxChoice,fxLevelOf,applyFxChoice,nextFx} from '../public/fx-level.js';
assert.deepEqual(FX_LEVELS,['full','light','off']);
const old={coins:120,owned:[{id:'a',kind:1}],ember:{muted:true}},before=JSON.stringify(old);
assert.equal(fxChoice(old),'full');assert.equal(fxChoice({}),'full');assert.equal(fxChoice(undefined),'full');assert.equal(JSON.stringify(old),before);
assert.equal(fxChoice({reducedMotion:true}),'off'); // the existing Reduce motion flag means Off
assert.equal(fxLevelOf({ember:{fx:'light'}},true),'off');assert.equal(fxLevelOf({ember:{fx:'light'}},false),'light');
const s=JSON.parse(before);applyFxChoice(s,'light');assert.equal(s.ember.fx,'light');assert.equal(s.ember.muted,true);assert.equal(s.reducedMotion,false);assert.equal(s.coins,120);assert.equal(fxChoice(JSON.parse(JSON.stringify(s))),'light');
applyFxChoice(s,'off');assert.equal(fxChoice(s),'off');assert.equal(s.reducedMotion,true);
applyFxChoice(s,'full');assert.equal(fxChoice(s),'full');assert.equal(s.reducedMotion,false);
applyFxChoice(s,'bogus');assert.equal(fxChoice(s),'full');
assert.equal(nextFx('full'),'light');assert.equal(nextFx('off'),'full');
console.log('PASS effects setting: old saves load as Full, Light/Off stored under ember.fx, device reduced motion wins');
