// Save safety: rolling backups keep at most 5 (no duplicate copies), restore refuses during a trade, an online battle,
// a battle or with a trade receipt still waiting, refuses after a trade newer than the backup, always backs up the
// current save first, and rejects a damaged backup without touching the save.
import assert from 'node:assert/strict';
import {MAX,rotate,makeRecord,openRecord,restoreBlock,tradedSince,buildRestore,restore,reminderDue,memoryStore,checksum,validSave,MONTH} from '../public/save-safety.js';

const save=(coins,n=3,extra={})=>({coins,level:1,cleared:[],owned:Array.from({length:n},(_,i)=>({id:'c'+i,kind:i%16,level:1})),team:'c0',ember:{},...extra});
const rec=(s,at,reason='auto')=>makeRecord(JSON.stringify(s),reason,{now:at,version:'v-test'});

// Record fields
const r0=rec(save(120,4),1000);
assert.equal(r0.coins,120);assert.equal(r0.cards,4);assert.equal(r0.version,'v-test');assert.equal(r0.at,1000);assert.equal(r0.hash,checksum(r0.data));
assert.equal(makeRecord('{bad json',''),null);assert.equal(makeRecord(JSON.stringify({coins:5,owned:[]}),'x'),null);assert.equal(makeRecord('', 'x'),null);

// Rotation: max 5, newest first, oldest dropped, identical newest copy skipped
let list=[];
for(let i=1;i<=8;i++){const r=rotate(list,rec(save(i*10),i*1000));assert.equal(r.added,true);list=r.list;}
assert.equal(MAX,5);assert.equal(list.length,5);assert.deepEqual(list.map(r=>r.coins),[80,70,60,50,40]);
const dup=rotate(list,rec(save(80),9999));assert.equal(dup.added,false);assert.equal(dup.list.length,5);
const more=rotate(list,rec(save(90),10000));assert.deepEqual(more.dropped.map(r=>r.coins),[40]);assert.equal(more.list.length,5);
const store=memoryStore();for(let i=1;i<=7;i++)await store.add(rec(save(i),i));assert.equal((await store.list()).length,5);assert.equal((await store.list())[0].coins,7);

// Refusals while something is in progress
const cur=save(500,6,{appliedTrades:['t1'],tradeHistory:[{id:'t1',at:5}],playerUsername:'Mira',recoveryCode:'RC',vault:{version:2,unlocked:1,slots:[{creatureId:null,pending:10,lastAt:90000}]}});
assert.equal(restoreBlock(cur),null);
assert.equal(restoreBlock({...cur,pendingTradeId:'tr9'}).reason,'trade'); // open trade, or receipt not applied yet
assert.equal(restoreBlock({...cur,tradeLocks:{c1:{tradeId:'tr9'}}}).reason,'trade');
assert.equal(restoreBlock({...cur,cardOnlineId:'m1'}).reason,'online');
assert.equal(restoreBlock({...cur,onlineCardLocks:{c2:1}}).reason,'online');
assert.equal(restoreBlock({...cur,cardBattle:{turn:1}}).reason,'battle');
assert.equal(restoreBlock(cur,{busy:true}).reason,'busy'); // pack reveal etc.
for(const [k,v] of [['pendingTradeId','tr9'],['tradeLocks',{c1:{tradeId:'tr9'}}],['cardOnlineId','m1'],['cardBattle',{turn:1}]]){
  const st=memoryStore(),c={...cur,[k]:v};let adopted=null;
  const res=await restore({cur:c,rec:rec(save(50,3,{appliedTrades:['t1']}),100),store:st,adopt:n=>{adopted=n},keep:()=>{}});
  assert.equal(res.ok,false,k);assert.equal(adopted,null,k);assert.equal((await st.list()).length,0,k+' (nothing written)');assert.ok(res.message.length>20);
}

// A trade finished after the backup: refused (would duplicate or lose traded cards)
const oldSnap=save(50,3,{appliedTrades:[],tradeHistory:[]});
assert.equal(tradedSince(cur,oldSnap),true);assert.equal(tradedSince(cur,save(1,3,{appliedTrades:['t1']})),false);
{const st=memoryStore();let adopted=null;const res=await restore({cur,rec:rec(oldSnap,100),store:st,adopt:n=>{adopted=n},keep:()=>{}});assert.equal(res.reason,'traded');assert.equal(adopted,null);}

// Successful restore: current save backed up first (store and the localStorage-style copy), online fields kept, vault clock continues
{
  const st=memoryStore(),order=[];const snap=save(77,4,{appliedTrades:['t1'],playerUsername:'Old',vault:{version:2,unlocked:1,slots:[{creatureId:null,pending:3,lastAt:100}]}});
  const target=rec(snap,100);let kept=null,adopted=null;
  const origAdd=st.add;st.add=async(r,o)=>{order.push('backup:'+r.reason);return origAdd(r,o)};
  const res=await restore({cur,curJson:JSON.stringify(cur),rec:target,store:st,keep:j=>{kept=j;order.push('keep')},adopt:n=>{adopted=n;order.push('adopt')},now:200000});
  assert.equal(res.ok,true);assert.deepEqual(order,['backup:before-restore','keep','adopt']);
  const pre=(await st.list())[0];assert.equal(pre.reason,'before-restore');assert.equal(pre.coins,500);assert.equal(pre.cards,6);assert.equal(pre.data,JSON.stringify(cur));assert.equal(kept,JSON.stringify(cur));
  assert.equal(adopted.coins,77);assert.equal(adopted.owned.length,4);assert.equal(adopted.playerUsername,'Mira');assert.equal(adopted.recoveryCode,'RC');assert.deepEqual(adopted.appliedTrades,['t1']);
  assert.equal(adopted.vault.slots[0].lastAt,90000);assert.equal(adopted.vault.slots[0].pending,3);
  assert.equal(cur.coins,500); // the input is not changed
  // Pre-restore copy is added even when identical to the newest backup, and rotation still caps at 5
  for(let i=0;i<6;i++)await st.add(rec(save(i+1),300000+i));
  await restore({cur,rec:target,store:st,keep:()=>{},adopt:()=>{},now:400000});
  const l=await st.list();assert.equal(l.length,5);assert.equal(l[0].reason,'before-restore');
}
// No backup of the current save possible: nothing restored
{const st={async add(){throw Error('quota')}};let adopted=null;const res=await restore({cur,rec:rec(save(1,3,{appliedTrades:['t1']}),5),store:st,keep:()=>{throw Error('quota')},adopt:n=>{adopted=n}});assert.equal(res.reason,'nobackup');assert.equal(adopted,null);}
// Only the IndexedDB copy works (localStorage full): restore still allowed
{const st=memoryStore();const res=await restore({cur,rec:rec(save(9,3,{appliedTrades:['t1']}),5),store:st,keep:()=>{throw Error('quota')},adopt:()=>{}});assert.equal(res.ok,true);}

// Damaged backups are rejected safely
const good=rec(save(10,3,{appliedTrades:['t1']}),5);
for(const bad of [null,{},{...good,data:good.data.slice(0,-5)},{...good,data:'not json',hash:checksum('not json')},{...good,data:JSON.stringify({coins:-1,owned:[{id:'a',kind:0}]}),hash:undefined},{...good,data:JSON.stringify({coins:5,owned:[{id:'a',kind:99}]}),hash:undefined},{...good,hash:'zzz'}]){
  assert.equal(openRecord(bad).ok,false);const st=memoryStore();let adopted=null;
  const res=await restore({cur,rec:bad,store:st,adopt:n=>{adopted=n},keep:()=>{}});
  assert.equal(res.ok,false);assert.equal(res.reason,'damaged');assert.equal(adopted,null);assert.equal((await st.list()).length,0);
}
assert.equal(openRecord(good).ok,true);assert.equal(validSave(save(0,1)),true);

// buildRestore keeps device fields and drops a backup's own trade locks
const b=buildRestore({...cur,tradeLocks:undefined},{...save(3),pendingTradeId:'x',tradeLocks:{a:1},cardOnlineId:'m'});
assert.equal(b.pendingTradeId,undefined);assert.deepEqual(b.tradeLocks,{});assert.equal(b.cardOnlineId,undefined);

// Monthly download reminder
const now=Date.UTC(2026,10,5);
assert.equal(reminderDue(save(1,3,{ember:{saveSafety:{firstSeen:now-MONTH-1}}}),now),false); // fresh save, no progress
const prog=x=>save(1,3,{packCount:2,ember:{saveSafety:x}});
assert.equal(reminderDue(prog({}),now),false);
assert.equal(reminderDue(prog({firstSeen:now-1000}),now),false);
assert.equal(reminderDue(prog({firstSeen:now-MONTH-1}),now),true);
assert.equal(reminderDue(prog({firstSeen:1,downloadedAt:now-86400e3}),now),false);
assert.equal(reminderDue(prog({firstSeen:1,remindedAt:now-MONTH-5}),now),true);
console.log('PASS save-safety: rotation keeps 5, restore refuses during trade/battle/receipt/after newer trade, pre-restore backup, damaged backups rejected, monthly reminder');
