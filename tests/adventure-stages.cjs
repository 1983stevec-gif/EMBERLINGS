const {game,fixture,assert}=require('./batch3-harness.cjs');
const seed=fixture();seed.cleared=Array.from({length:8},(_,i)=>i+1);
const g=game(seed),B=g.sandbox.window.EmberBridge;
for(const [id,label]of [[1,'1.1'],[8,'1.8'],[9,'1.9'],[10,'2.1'],[18,'2.9'],[99,'11.9'],[100,'12.1']])assert.equal(B.adventureLabel(id),label);
assert.equal(B.bossLevels.length,11);
for(let id=1;id<=100;id++){
 assert.equal(!!B.bosses[id],id%9===0);
 assert.equal(B.encounter(id).boss,id%9===0);
 assert.equal(!!g.t.questPrize(id).pack,id%9===0&&!seed.cleared.includes(id));
}
assert.equal(B.limit(),9);g.t.startBattle(10);assert(!g.t.state.cardBattle);
g.t.startBattle(9);assert.equal(g.t.state.cardBattle.level,9);assert.equal(g.t.session.match.sides[1].name,'Magmarok');
assert.match(g.element('#app').innerHTML,/BOSS 1\.9/);
const reward=g.t.state.cardBattle.rewards,coins=g.t.state.coins;assert(reward.coins>g.t.questPrize(10).coins);assert.equal(reward.item,'trainingPass');
g.t.session.match.result={winner:0,reason:'Boss defeated'};g.t.completeCardBattle();
assert.equal(B.limit(),10);assert.equal(g.t.state.coins,coins+reward.coins);assert(g.t.state.cleared.includes(9));assert.match(g.element('#app').innerHTML,/Level 1\.9/);assert.match(g.element('#app').innerHTML,/Level 2 unlocked/);
const count=g.t.state.rewardPacks.length;g.t.completeCardBattle();assert.equal(g.t.state.rewardPacks.length,count);assert.equal(g.t.state.coins,coins+reward.coins);
assert.equal(g.t.questPrize(9).pack,null);assert.equal(g.t.questPrize(9).item,null);assert(g.t.questPrize(9).coins<reward.coins);
g.t.startBattle(10);assert.equal(g.t.state.cardBattle.level,10);assert.match(g.element('#app').innerHTML,/QUEST 2\.1/);assert.equal(g.t.state.cardBattle.rewards.pack,null);
const saved=g.saved(),reload=game(saved);assert.equal(JSON.stringify(reload.t.state.cleared),JSON.stringify(saved.cleared));assert.equal(reload.t.state.coins,saved.coins);assert.equal(JSON.stringify(reload.t.state.owned),JSON.stringify(saved.owned));assert.equal(reload.t.state.cardBattle.level,10);
const legacy=fixture();legacy.cleared=Array.from({length:69},(_,i)=>i+1);const old=game(legacy);assert.equal(old.sandbox.window.EmberBridge.adventureLabel(old.sandbox.window.EmberBridge.limit()),'8.7');assert.equal(old.saved().cleared.length,69);
console.log('PASS decimal labels, all .9 bosses, actual boss battle/rewards, sequential unlock, one-time prizes, reload and legacy progress');
(async()=>{const {ACHIEVEMENTS}=await import('../public/achievements.js');const first=ACHIEVEMENTS.find(a=>a.id==='boss-1'),all=ACHIEVEMENTS.find(a=>a.id==='boss-all');assert.equal(first.value({cleared:[9]}),1);assert.equal(first.value({cleared:[10]}),1);assert.equal(all.value({cleared:[9,18]}),2);assert.equal(all.value({cleared:[10,25,45,70,100]}),all.goal);assert.equal(all.value({cleared:Array.from({length:11},(_,i)=>(i+1)*9)}),all.goal);console.log('PASS decimal boss achievements and earned legacy boss titles')})().catch(e=>{console.error(e);process.exitCode=1});
