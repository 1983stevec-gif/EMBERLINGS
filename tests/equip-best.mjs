import assert from 'node:assert/strict';
import {equipBestDeck,buildBattleDeck,ownedCardStrength,cardNameKey} from '../public/card-engine.js';
const pool=Array.from({length:48},(_,i)=>({id:'p'+i,kind:i%16,level:1+i,rarity:i%2?'Celestial':'Common',mutation:i===47?'cosmic':null}));
pool.push({id:'weak-high-level',kind:15,level:100,rarity:'Celestial'},{id:'strong-low-level',kind:15,level:1,rarity:'Celestial',mutation:'cosmic'});
const before=JSON.stringify(pool),start=performance.now(),best=equipBestDeck(pool),deck=buildBattleDeck(pool,best.keys);
assert.equal(deck.length,20);assert(best.energyTypes.length<=3);assert(deck.some(c=>c.cardType==='mythling'&&!c.stage));const counts=new Map();for(const c of deck){const key=cardNameKey(c);counts.set(key,(counts.get(key)||0)+1);assert(counts.get(key)<=2);if(c.cardType==='mythling'&&c.stage)assert(deck.some(b=>b.kind===c.kind&&b.elite===c.elite&&b.stage===c.stage-1))}
const crow=deck.filter(c=>c.kind===15);assert(crow.some(c=>c.ownedId==='strong-low-level'));assert(!crow.some(c=>c.ownedId==='weak-high-level'));assert.equal(JSON.stringify(pool),before);
for(const small of [[pool[0]],[pool[47],pool[48],pool[49]]]){const result=equipBestDeck(small);assert.equal(buildBattleDeck(small,result.keys).length,20)}
console.log('PASS legal strongest-copy selection, evolution lines, three Merfling types, small collections, no inventory changes ('+Math.round(performance.now()-start)+'ms)');
