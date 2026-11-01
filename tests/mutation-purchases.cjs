const {game, fixture, assert}=require('./batch3-harness.cjs');
function setup(){const seed=fixture();seed.coins=2000000;return game(seed)}
{
 const g=setup(),c=g.t.state.owned[1],before={...c},money=g.t.state.coins,count=g.t.state.owned.length;
 assert(g.t.purchaseMutation(c.id,'spark'));
 assert.equal(g.t.state.coins,money-2500);
 assert.equal(g.t.state.owned.length,count);
 assert.deepEqual({...g.t.state.owned.find(x=>x.id===c.id),mutation:undefined},{...before,mutation:undefined});
 assert.equal(g.saved().owned.find(x=>x.id===c.id).mutation,'spark');
}
for(const reason of ['coins','trade','pack-only','invalid']){
 const g=setup(),c=g.t.state.owned[1];
 if(reason==='coins')g.t.state.coins=2499;
 if(reason==='trade')g.t.state.tradeLocks={[c.id]:{tradeId:'locked'}};
 const before=JSON.stringify(g.t.state);
 assert(!g.t.purchaseMutation(c.id,reason==='pack-only'?'bloom':reason==='invalid'?'missing':'spark'));
 assert.equal(JSON.stringify(g.t.state),before);
}
{
 const g=setup(),before=JSON.stringify(g.t.state);
 g.sandbox.localStorage.setItem=()=>{throw Error('Storage full')};
 assert(!g.t.purchaseMutation(g.t.state.owned[1].id,'spark'));
 assert.equal(JSON.stringify(g.t.state),before);
}
console.log('PASS first mutations charge once and preserve upgrades; invalid, locked, unaffordable and failed-save purchases make no changes');
{
 const g=setup(),source=g.t.state.owned[1];
 Object.assign(source,{level:100,xp:123,rarity:'Secret',shiny:true,bonus:32,academyAttack:4,fused:true,fusionParents:['parent-a','parent-b'],tradeAssetId:'registered-original'});
 assert(g.t.purchaseMutation(source.id,'spark'));
 const original=JSON.stringify(source),before=g.t.state.coins,count=g.t.state.owned.length;
 assert(!g.t.purchaseMutation(source.id,'flame','spark',false));
 assert(!g.t.purchaseMutation(source.id,'flame',null,true));
 const id=g.t.purchaseMutation(source.id,'flame','spark',true),copy=g.t.state.owned.find(c=>c.id===id);
 assert(id&&id!==source.id);assert.equal(g.t.state.owned.length,count+1);assert.equal(g.t.state.coins,before-10000);
 assert.equal(JSON.stringify(source),original);assert.equal(copy.mutation,'flame');assert.equal(copy.perkSeed,source.id);assert(!copy.tradeAssetId);
 for(const key of ['kind','level','xp','rarity','shiny','bonus','academyAttack','fused'])assert.equal(copy[key],source[key]);
 assert.equal(JSON.stringify(copy.fusionParents),JSON.stringify(source.fusionParents));assert.notEqual(copy.fusionParents,source.fusionParents);
 const reloaded=game(g.saved());assert.equal(reloaded.t.state.owned.find(c=>c.id===id).mutation,'flame');assert.equal(reloaded.t.state.owned.find(c=>c.id===source.id).mutation,'spark');
 const same=g.t.purchaseMutation(source.id,'spark','spark',true);assert(same!==source.id&&same!==id);assert.equal(g.t.state.owned.find(c=>c.id===same).mutation,'spark');
}
for(const reason of ['quota','collision','coins','trade','pack-only','stale']){
 const g=setup(),c=g.t.state.owned[1];assert(g.t.purchaseMutation(c.id,'spark'));
 if(reason==='coins')g.t.state.coins=0;
 if(reason==='trade')g.t.state.tradeLocks={[c.id]:{tradeId:'locked'}};
 if(reason==='quota')g.sandbox.localStorage.setItem=()=>{throw Error('Storage full')};
 if(reason==='collision')g.sandbox.crypto={randomUUID:()=>c.id};
 const before=JSON.stringify(g.t.state);
 assert(!g.t.purchaseMutation(c.id,reason==='pack-only'?'bloom':'flame',reason==='stale'?'shadow':'spark',true));
 assert.equal(JSON.stringify(g.t.state),before);
}
{
 const g=setup(),c=g.t.state.owned[1];g.t.mutationVault(c.id,'spark');const first=g.element('#mutate').onclick;first();first();assert.equal(g.t.state.coins,1997500);
 g.t.mutationVault(c.id,'flame');g.element('#mutate').onclick();const confirm=g.element('#confirmMutation').onclick,count=g.t.state.owned.length;confirm();confirm();assert.equal(g.t.state.owned.length,count+1);assert.equal(g.t.state.coins,1987500);
}
console.log('PASS later purchases create unique Inventory copies, preserve originals/upgrades, survive reload, charge once per UI purchase, and roll back all failures');
(async()=>{const {levelPerks,battleCard}=await import('../public/card-engine.js');const source={id:'rare-upgrade-original',kind:0,level:100};const clone={...source,id:'new-copy-id',perkSeed:source.id};assert.deepEqual(levelPerks(clone),levelPerks(source));assert.deepEqual(levelPerks(battleCard(clone)),levelPerks(source));console.log('PASS copied cards retain earned special abilities with a new inventory ID')})().catch(e=>{console.error(e);process.exitCode=1});
{
 const g=setup(),c=g.t.state.owned[1];assert(g.t.purchaseMutation(c.id,'spark'));
 assert(g.t.depositVault(c.id));const original=JSON.stringify(c),before=g.t.state.coins;
 const id=g.t.purchaseMutation(c.id,'flame','spark',true);
 assert(id);assert.equal(JSON.stringify(c),original);assert.equal(g.t.state.vault.slots[0].creatureId,c.id);assert(!g.t.state.vault.slots.some(s=>s.creatureId===id));assert.equal(g.t.state.coins,before-10000);
 const next=g.t.purchaseMutation(id,'frost','flame',true);assert(next&&next!==id);assert.equal(g.t.state.owned.find(c=>c.id===next).perkSeed,c.id);
}
console.log('PASS copying a Vault card keeps its slot assigned to the original, and copying a copy retains the upgrade seed');
