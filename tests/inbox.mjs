// Notification inbox: read markers are stored additively under state.ember.inbox, history from before the inbox starts read,
// versions (more cheers, more Daily rewards) make an item new again, and the store stays capped.
import assert from 'node:assert/strict';
import {inboxStore,noteItems,isUnread,markRead,prune,ago,CAP} from '../public/inbox.js';
const old={coins:50,owned:[{id:'a',kind:1}],ember:{muted:true,seenRelease:'x'}};
const s=inboxStore(old,1000);
assert.equal(old.coins,50);assert.equal(old.ember.muted,true);assert.equal(old.ember.seenRelease,'x');assert.equal(s.since,1000);assert.deepEqual(s.items,{});
assert.equal(inboxStore(old,9999).since,1000); // kept on later loads
const hist={id:'tc:1',at:500},live={id:'ti:9',live:true},cheer={id:'ch:e',v:1};
noteItems(s,[hist,live,cheer],2000);
assert.equal(isUnread(s,hist),false); // a trade finished before the inbox existed starts as read
assert.equal(isUnread(s,live),true);assert.equal(isUnread(s,cheer),true);
markRead(s,[live,cheer]);assert.equal(isUnread(s,live),false);assert.equal(isUnread(s,cheer),false);
const more={id:'ch:e',v:3};noteItems(s,[more],3000);assert.equal(isUnread(s,more),true);assert.equal(s.items['ch:e'].t,3000);
markRead(s,[more]);assert.equal(isUnread(s,more),false);
assert.equal(isUnread(s,{id:'wn:1',live:true,read:true}),false);
const round=JSON.parse(JSON.stringify(old));assert.equal(isUnread(inboxStore(round),more),false); // survives a save/load
for(let i=0;i<CAP+40;i++)s.items['x'+i]={t:5000+i,v:1,r:0};
assert.equal(prune(s),true);assert.equal(Object.keys(s.items).length,CAP);assert.ok(s.items['x'+(CAP+39)]);assert.ok(!s.items['tc:1']);
assert.equal(ago(10000,10000),'just now');assert.equal(ago(0,3*86400000),'3 days ago');
console.log('PASS inbox: additive read markers, old history starts read, new versions show again, capped store');
