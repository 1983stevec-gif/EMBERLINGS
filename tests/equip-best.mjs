import assert from 'node:assert/strict';
import {equipBestDeck,buildBattleDeck,ownedCardStrength,cardNameKey} from '../public/card-engine.js';
const pool=Array.from({length:48},(_,i)=>({id:'p'+i,kind:i%16,level:1+i,rarity:i%2?'Celestial':'Common',mutation:i===47?'cosmic':null}));
pool.push({id:'weak-high-level',kind:15,level:20,rarity:'Celestial'},{id:'strong-low-level',kind:15,level:1,rarity:'Celestial',mutation:'cosmic'});
const before=JSON.stringify(pool),start=performance.now(),best=equipBestDeck(pool),deck=buildBattleDeck(pool,best.keys);
assert.equal(deck.length,20);assert(best.energyTypes.length<=3);assert(deck.some(c=>c.cardType==='mythling'&&!c.stage));const counts=new Map();for(const c of deck){const key=cardNameKey(c);counts.set(key,(counts.get(key)||0)+1);assert(counts.get(key)<=2);if(c.cardType==='mythling'&&c.stage)assert(deck.some(b=>b.kind===c.kind&&b.elite===c.elite&&b.stage===c.stage-1))}
const crow=deck.filter(c=>c.kind===15);assert(crow.some(c=>c.ownedId==='strong-low-level'));assert(!crow.some(c=>c.ownedId==='weak-high-level'));assert.equal(JSON.stringify(pool),before);
for(const small of [[pool[0]],[pool[47],pool[48],pool[49]]]){const result=equipBestDeck(small);assert.equal(buildBattleDeck(small,result.keys).length,20)}
console.log('PASS legal strongest-copy selection, evolution lines, three Merfling types, small collections, no inventory changes ('+Math.round(performance.now()-start)+'ms)');
// Level path: a new move every 25 levels, capped at level 100; specials are fixed per card.
import {attacks,battleCard,levelPerks,MAX_LEVEL} from '../public/card-engine.js';
for(const [lv,n] of [[1,2],[24,2],[25,3],[50,4],[75,5],[100,6],[250,6]])assert.equal(attacks(battleCard({id:'lv-'+lv,kind:0,level:lv})).length,n);
assert.equal(MAX_LEVEL,100);assert.deepEqual(levelPerks({id:'same',kind:3,level:100}),levelPerks({id:'same',kind:3,level:100}));
assert(battleCard({id:'x',kind:0,level:100}).maxhp>battleCard({id:'x',kind:0,level:1}).maxhp);
console.log('PASS level path moves at 25/50/75/100, max level 100, fixed special abilities');
