// Friends leaderboard server checks: identity, friends only, old profiles, bounds and the full round trip.
// Same harness style as tests/trades-server.mjs (Miniflare + drizzle migrations + direct handleSocial calls).
import fs from 'node:fs';import assert from 'node:assert/strict';import {Miniflare} from '../node_modules/miniflare/dist/src/index.js';import {handleSocial} from '../lib/social-api.mjs';import {cleanProfile} from '../lib/profile-api.mjs';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-15'}),db=await mf.getD1Database('DB');for(const f of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())for(const sql of fs.readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
const checks=[];async function test(n,f){await f();checks.push(n)}async function api(user,path,body,origin='http://localhost'){const r=await handleSocial(new Request('http://localhost/api/social'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),db,user?{userId:user}:null);return {status:r.status,data:await r.json()}}
const STATS={cards:24,species:9,wins:31,achievements:4};
const save=(extra={})=>({cards:[],frame:'simple',background:'dusk',badges:[],stats:{...STATS,...extra}});
async function signUp(id,name){const r=await api(id,'/profile',{username:name,kind:0});assert.equal(r.status,200,JSON.stringify(r.data))}
async function befriend(mine,myName,theirs,theirName){assert.equal((await api(mine,'/friends/request',{username:theirName})).status,200);const req=(await api(theirs,'/me')).data.incoming.find(x=>x.username===myName);assert.ok(req,`${theirName} received the friend request`);assert.equal((await api(theirs,'/friends/respond',{id:req.id,accept:true})).status,200)}
async function share(id,extra={}){const r=await api(id,'/showcase',save(extra));assert.equal(r.status,200,JSON.stringify(r.data));return r.data.profile.stats}
const board=async id=>{const r=await api(id,'/leaderboard');assert.equal(r.status,200,JSON.stringify(r.data));return r.data};
const names=rows=>rows.map(x=>x.username);
try{
await test('The friends leaderboard needs a signed-in player',async()=>{const r=await api(null,'/leaderboard');assert.equal(r.status,401);assert.equal(typeof r.data.error,'string')});

await signUp('a','BoardAlice');await signUp('b','BoardBob');await signUp('c','BoardCharlie');await signUp('h','BoardHana');await signUp('i','BoardIvo');
await share('a',{winStreak:3,bestStreak:9,bossClears:2,biggestHit:210});
await share('b',{wins:61,winStreak:5,bestStreak:14,bossClears:4,biggestHit:640});
await share('c',{wins:99,winStreak:7,bestStreak:20,bossClears:6,biggestHit:900});
await share('h',{wins:8,winStreak:1,bestStreak:2,bossClears:0,biggestHit:70});
await share('i',{wins:120,winStreak:9,bestStreak:31,bossClears:8,biggestHit:999});
await befriend('a','BoardAlice','b','BoardBob');await befriend('a','BoardAlice','h','BoardHana');await befriend('a','BoardAlice','i','BoardIvo');

await test('Accepted friends see each other’s battle numbers, sorted by wins, and a stranger never appears',async()=>{
  const alice=await board('a'),bob=await board('b'),charlie=await board('c');
  assert.equal(alice.me.username,'BoardAlice');
  assert.deepEqual(alice.me.stats,{wins:31,winStreak:3,bestStreak:9,bossClears:2,biggestHit:210});
  assert.deepEqual(names(alice.friends),['BoardIvo','BoardBob','BoardHana']);
  assert.deepEqual(alice.friends.find(f=>f.username==='BoardBob').stats,{wins:61,winStreak:5,bestStreak:14,bossClears:4,biggestHit:640});
  assert.equal(bob.me.username,'BoardBob');assert.deepEqual(names(bob.friends),['BoardAlice']);
  assert.deepEqual(bob.friends[0].stats,{wins:31,winStreak:3,bestStreak:9,bossClears:2,biggestHit:210});
  assert(!names(alice.friends).includes('BoardCharlie')&&!names(bob.friends).includes('BoardCharlie'),'the stranger appears in nobody’s list');
  assert.deepEqual(names(charlie.friends),[]);assert.equal(charlie.me.username,'BoardCharlie');
  for(const r of [alice,bob,charlie])assert.deepEqual(Object.keys(r.me).sort(),['stats','username']);
});

await signUp('d','BoardDora');await signUp('e','BoardEli');await befriend('d','BoardDora','e','BoardEli');
await db.prepare('UPDATE players SET profile=? WHERE user_id=?').bind(JSON.stringify({v:1,cards:[],frame:'simple',background:'dusk',badges:[],stats:{cards:5,species:3,wins:12,achievements:1},cardBack:'ember',ring:'gold'}),'d').run();

await test('Profiles saved before this feature show zeros, not errors',async()=>{
  const old=await board('d'),none=await board('e');
  assert.deepEqual(old.me.stats,{wins:12,winStreak:0,bestStreak:0,bossClears:0,biggestHit:0});
  assert.deepEqual(old.friends.find(f=>f.username==='BoardEli').stats,{wins:0,winStreak:0,bestStreak:0,bossClears:0,biggestHit:0},'a player with no saved profile counts as zero');
  assert.deepEqual(none.me.stats,{wins:0,winStreak:0,bestStreak:0,bossClears:0,biggestHit:0});
});

await test('Profiles accept the new numbers within range and reject anything outside it',async()=>{
  assert.deepEqual(cleanProfile(save({winStreak:4,bestStreak:11,bossClears:3,biggestHit:456})).stats,{cards:24,species:9,wins:31,achievements:4,winStreak:4,bestStreak:11,bossClears:3,biggestHit:456});
  assert.deepEqual(cleanProfile(save()).stats,{...STATS,winStreak:0,bestStreak:0,bossClears:0,biggestHit:0},'missing numbers count as zero');
  for(const bad of [{winStreak:-1},{winStreak:1e7+1},{bestStreak:2.5},{bossClears:1e6+1},{biggestHit:10000},{biggestHit:-1},{biggestHit:'12'}])assert.throws(()=>cleanProfile(save(bad)),/Profile numbers are not valid/,JSON.stringify(bad));
  assert.equal(cleanProfile(save({winStreak:null})).stats.winStreak,0,'a null number counts as zero');
  assert.equal((await api('a','/showcase',save({winStreak:1e7+1}))).status,400,'the route rejects out-of-range numbers too');
});

await signUp('f','BoardFern');await signUp('g','BoardGus');await befriend('f','BoardFern','g','BoardGus');

await test('A saved profile comes back from the leaderboard and my row is always there',async()=>{
  const saved=await share('f',{winStreak:6,bestStreak:17,bossClears:5,biggestHit:789});
  await share('g',{wins:44,winStreak:2,bestStreak:12,bossClears:3,biggestHit:333});
  const fern=await board('f'),gus=await board('g');
  assert.deepEqual(fern.me.stats,{wins:31,winStreak:6,bestStreak:17,bossClears:5,biggestHit:789});
  assert.deepEqual(fern.me.stats,{wins:saved.wins,winStreak:saved.winStreak,bestStreak:saved.bestStreak,bossClears:saved.bossClears,biggestHit:saved.biggestHit},'the round trip keeps the numbers');
  assert.deepEqual(fern.friends.map(f=>({username:f.username,stats:f.stats})),[{username:'BoardGus',stats:{wins:44,winStreak:2,bestStreak:12,bossClears:3,biggestHit:333}}]);
  assert.equal(gus.friends[0].username,'BoardFern');
  const solo=await board('c');
  assert.equal(solo.me.username,'BoardCharlie','my row is present with no friends');
  assert.deepEqual(names(solo.friends),[]);
});
console.log(checks.map(n=>'PASS '+n).join('\n'));
console.log(checks.length+' leaderboard checks passed');
}finally{await mf.dispose()}
