// Deck share codes: roundtrip, bad codes, deck rules on import, missing cards, ready-made decks.
import assert from 'node:assert/strict';
import {encodeDeck,decodeDeck,planImport,isCodeError,DECK_IDEAS,keysToCounts,CODE_PREFIX,pictureLayout,PICTURE_W,GRID_TOP,CODE_BLOCK} from '../public/deck-share.js';
import {buildBattleDeck,equipBestDeck,cardNameKey,ELEMENTS} from '../public/card-engine.js';
const names=['Flaminyx','Lunamo','Verdelle','Voltix','Aquabub','Crystella','Frostbit','Umbryx','Emberoo','Zephyra','Mosshell','Tidelotl','Sparquill','Cindermane','Glacipaw','Noctalon'];

// Roundtrip from a real Equip Best deck.
const pool=Array.from({length:40},(_,i)=>({id:'p'+i,kind:i%16,level:1+i,rarity:i%3?'Common':'Celestial'}));
const best=equipBestDeck(pool),code=encodeDeck(best.keys,best.energyTypes);
assert(code.startsWith(CODE_PREFIX));assert(code.length<60,'code is short: '+code);assert(/^EMB1-[A-Za-z0-9_-]+$/.test(code));
const dec=decodeDeck(code);assert.equal(dec.total,20);assert.deepEqual(dec.energyTypes.sort(),[...best.energyTypes].sort());
const want=keysToCounts(best.keys);for(const c of dec.cards)assert.equal(c.count,want.get(c.id));
assert.deepEqual(decodeDeck('Try my deck! '+code+' have fun'),dec,'code inside pasted text');
const plan=planImport(pool,dec,names);assert(plan.canBuild);assert.equal(plan.missing,0);assert.equal(plan.total,20);
assert.deepEqual(buildBattleDeck(pool,plan.keys).map(cardNameKey).sort(),buildBattleDeck(pool,best.keys).map(cardNameKey).sort());
assert(!JSON.stringify(dec).includes('p1'),'no personal ids in the code');
console.log('PASS share code roundtrip ('+code.length+' chars), pasted text, same deck rebuilt');

// Bad and old codes give friendly errors, never crashes.
const tamper=code.slice(0,-2)+(code.at(-2)==='A'?'B':'A')+code.at(-1);
for(const bad of ['','   ','hello','EMB1-','EMB1-!!!!','EMB2-AAAA','EMB1-AAAA',tamper,code.slice(0,9),'EMB1-'+'A'.repeat(80),null,undefined,42,'EMB1-____']){
 let err;try{decodeDeck(bad)}catch(e){err=e}assert(err&&isCodeError(err),'friendly error for '+bad);assert(err.message.length>10)}
assert.match((()=>{try{decodeDeck('EMB9-abc')}catch(e){return e.message}})(),/different version/);
const raw=b=>{let h=0x5a;for(const x of b)h=((h*31)^x)&255;return 'EMB1-'+Buffer.from([...b,h]).toString('base64url')};
assert.throws(()=>decodeDeck(raw([0,0,5,5])),/twice/);
assert.throws(()=>decodeDeck(raw([0,0,110])),/doesn’t know/);
assert.throws(()=>decodeDeck(raw([15,0,0])),/three Merfling/);
assert.throws(()=>decodeDeck(raw([0,2,0])),/unknown Merfling/);
assert.throws(()=>decodeDeck(raw([0,0,...Array.from({length:11},(_,i)=>128|i*6)])),/1–20/);
assert.throws(()=>encodeDeck([]),/empty/);
console.log('PASS bad, tampered, old-version and over-size codes are refused with plain messages');

// Missing cards are reported and nothing is invented; rules still hold.
const small=[{id:'a',kind:0,level:5,rarity:'Common'},{id:'b',kind:4,level:3,rarity:'Common'},{id:'c',kind:4,level:9,rarity:'Common'}];
const before=JSON.stringify(small);
for(const idea of DECK_IDEAS){
 const d=decodeDeck(idea.code);assert(d.total>=1&&d.total<=20);assert(buildBattleDeck(Array.from({length:32},(_,i)=>({id:'x'+i,kind:i%16,rarity:'Common'})),idea.keys).length===d.total,idea.name+' is legal with a full collection');
 const p=planImport(small,d,names);
 for(const l of p.lines)assert(l.have<=l.want&&l.have<=2);
 if(p.canBuild){const deck=buildBattleDeck(small,p.keys);const counts=new Map();for(const c of deck){const k=cardNameKey(c);counts.set(k,(counts.get(k)||0)+1);assert(counts.get(k)<=2);if(c.cardType==='mythling'){assert(small.some(o=>o.id===c.ownedId),'only owned copies');if(c.stage)assert(deck.some(b=>b.kind===c.kind&&b.stage===c.stage-1))}}assert(deck.some(c=>c.cardType==='mythling'&&!c.stage));assert(p.energyTypes.length<=3);for(const e of p.energyTypes)assert(deck.some(c=>c.cardType==='mythling'&&ELEMENTS[c.kind]===e))}
 else assert(p.error.length>0)
}
assert.equal(JSON.stringify(small),before,'collection untouched');
const fire=planImport(small,decodeDeck(DECK_IDEAS[0].code),names);
assert(fire.canBuild);assert(fire.missing>0);assert(fire.lines.some(l=>l.name==='Emberoo'&&l.have===0));assert(fire.reasons.some(r=>/Emberoo/.test(r)));
assert.equal(fire.lines.find(l=>l.name==='Flaminyx').have,1);assert(fire.reasons.some(r=>/own 1 Flaminyx/.test(r)));
const water=planImport(small,decodeDeck(DECK_IDEAS[1].code),names);assert.equal(water.lines.find(l=>l.name==='Aquabub').have,2);
const shadow=planImport(small,decodeDeck(DECK_IDEAS[4].code),names);assert(!shadow.canBuild);assert.match(shadow.error,/Basic/);
// Evolution without its Basic is left out with a reason.
const evoOnly=decodeDeck(raw([0,0,1,2]));const evoPlan=planImport(small,evoOnly,names);assert(!evoPlan.canBuild);
const chain=decodeDeck(raw([0,0,128|24,26]));const chainPlan=planImport(small,chain,names);assert(chainPlan.canBuild);assert(!chainPlan.keys.some(k=>k.endsWith('-2')));assert(chainPlan.reasons.some(r=>/needs its Ascended form/.test(r)));
console.log('PASS imports use only owned copies, report missing cards and keep 1–20, Basic, two-copy, evolution and Merfling rules');
assert(DECK_IDEAS.length>=4&&DECK_IDEAS.length<=6);console.log('PASS '+DECK_IDEAS.length+' deck ideas are legal share codes');
// A Radiant card in the code falls back to the player's normal copy of that species.
const radiant=planImport(small,decodeDeck(encodeDeck(['m-0-true-0','m-0-true-1'])),names);assert(radiant.canBuild);assert.deepEqual(radiant.keys,['m-0-false-0','m-0-false-1']);
console.log('PASS Radiant cards fall back to owned normal copies');

// Deck pictures: small decks are square, bigger ones 1080×1350; every tile fits between the header and the code block.
for(let n=1;n<=20;n++){
 const L=pictureLayout(n);assert.equal(L.w,PICTURE_W);assert.equal(L.h,n<=5?1080:1350);assert.equal(L.tiles.length,n);
 for(const t of L.tiles){assert(t.x>=60&&t.x+t.w<=PICTURE_W-60,'tile inside sides '+n);assert(t.y>=GRID_TOP&&t.y+t.h<=L.h-CODE_BLOCK,'tile between header and code '+n);assert(t.w>=110,'tiles stay readable '+n)}
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const a=L.tiles[i],b=L.tiles[j];assert(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'no overlap '+n)}
}
for(const idea of DECK_IDEAS){const n=decodeDeck(idea.code).cards.length;assert(pictureLayout(n).tiles[0].w>=150,idea.name+' tiles are big')}
console.log('PASS deck pictures lay out 1–20 different cards without overlap, square for small decks');
