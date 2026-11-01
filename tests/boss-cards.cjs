const {game,fixture,assert}=require('./batch3-harness.cjs');
for(const level of [9,18,27,36,45,54,63,72,81,90,99]){
 const seed=fixture();seed.cleared=Array.from({length:level-1},(_,i)=>i+1);const g=game(seed),B=g.sandbox.window.EmberBridge;
 const before=JSON.stringify(g.t.state.owned),count=g.t.state.owned.length;
 assert.equal(B.species.length,21);assert.equal(g.t.questPrize(level).bossQuest,level);
 g.t.startBattle(level);assert(g.t.session.match.sides[1].hand.some(id=>{const c=g.t.session.match.sides[1].cards.find(c=>c.id===id);return c.kind>=16&&!c.stage}));assert(g.t.session.match.sides[1].cards.some(c=>c.kind>=16&&B.species[c.kind].name===B.bosses[level]));
 g.t.session.match.result={winner:0,reason:'Boss defeated'};g.t.completeCardBattle();
 const card=g.t.state.owned.at(-1);assert.equal(B.species[card.kind].name,B.bosses[level]);assert.equal(card.sourceBoss,level);assert.equal(card.rarity,'Legendary');assert.equal(g.t.state.owned.length,count+1);
 assert.match(B.cardHTML(card),/bosses-atlas\.png/);assert.match(B.cardHTML(card),/ISLAND GUARDIANS/);assert(!B.cardHTML(card).includes('undefined'));
 assert.equal(g.t.questPrize(level).bossQuest,null);g.t.completeCardBattle();assert.equal(g.t.state.owned.length,count+1);
 g.t.startBattle(level);g.t.session.match.result={winner:0,reason:'Replay'};g.t.completeCardBattle();assert.equal(g.t.state.owned.length,count+1);
 const reloaded=game(g.saved());assert.equal(reloaded.t.state.owned.at(-1).kind,card.kind);assert.equal(reloaded.t.questPrize(level).bossQuest,null);
}
for(const outcome of ['legacy','loss','storage']){
 const seed=fixture();seed.cleared=Array.from({length:9},(_,i)=>i+1);const g=game(seed),count=g.t.state.owned.length;
 assert.equal(g.t.questPrize(9).pack,null);assert.equal(g.t.questPrize(9).bossQuest,9);g.t.startBattle(9);
 if(outcome==='storage')g.sandbox.localStorage.setItem=()=>{throw Error('Storage full')};
 g.t.session.match.result={winner:outcome==='loss'?1:0,reason:outcome};g.t.completeCardBattle();
 assert.equal(g.t.state.owned.length,count+(outcome==='legacy'?1:0));assert.equal(g.t.state.bossCardClaims?.length||0,outcome==='legacy'?1:0);
}
(async()=>{const {BOSS_CARDS,CREATURE_COUNT}=await import('../public/combat-rules.js');const {cardStats,battleCard,attacks,buildBattleDeck,ELEMENTS,createCardMatch,chooseAI,cardAction}=await import('../public/card-engine.js');assert.equal(CREATURE_COUNT,21);
 for(const boss of BOSS_CARDS){const c={id:'owned-boss-'+boss.kind,kind:boss.kind,level:25,rarity:'Legendary'},bc=battleCard(c);assert(Number.isFinite(bc.damage)&&Number.isFinite(bc.maxhp));assert.equal(bc.element,boss.element);assert.equal(ELEMENTS[boss.kind],boss.element);assert(attacks(bc).every(m=>m.name&&m.effect&&Number.isFinite(m.damage)));const deck=buildBattleDeck([c]);assert(deck.some(x=>x.kind===boss.kind));}
 for(const boss of BOSS_CARDS){
 const match=createCardMatch([[{id:'boss',kind:boss.kind,level:1,rarity:'Legendary'}],[{id:'target',kind:4,level:1}]],{now:0,rng:()=>.1});
 for(let n=0;n<30&&match.phase==='setup';n++)for(let side=0;side<2;side++){const a=chooseAI(match,side);if(a)cardAction(match,side,a,1,()=>0)}
 match.turn=0;const mine=match.sides[0],other=match.sides[1],c=mine.cards.find(c=>c.id===mine.active),target=other.cards.find(c=>c.id===other.active);target.hp=target.maxhp=500;c.energies=[boss.element,boss.element];c.hp-=20;
 let flips=0;cardAction(match,0,{type:'attack',move:'skill'},2,()=>flips++?.9:0);
 if(boss.kind===16)assert(target.conditions.includes('Burned'));
 if(boss.kind===17)assert.equal(c.hp,c.maxhp);
 if(boss.kind===18)assert(target.conditions.includes('Paralyzed'));
 if(boss.kind===19)assert.equal(c.energies.length,3);
 if(boss.kind===20)assert(target.conditions.includes('Poisoned'));
 }
 assert.throws(()=>battleCard({id:'invalid',kind:21}),/Invalid/);console.log('PASS five new species/art/cards/decks, 11 boss drops, once-only claims, old-save replay rewards, loss/save-failure preservation and reload');
})().catch(e=>{console.error(e);process.exitCode=1});
