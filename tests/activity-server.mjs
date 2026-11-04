import fs from 'node:fs';import assert from 'node:assert/strict';import {Miniflare} from '../node_modules/miniflare/dist/src/index.js';import {handleSocial} from '../lib/social-api.mjs';
const migrations=fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort();
async function makeDb(mf,name,files){const db=await mf.getD1Database(name);for(const f of files)for(const sql of fs.readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();return db}
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB','OLD'],compatibilityDate:'2026-05-15'});
const db=await makeDb(mf,'DB',migrations),old=await makeDb(mf,'OLD',migrations.filter(f=>!f.startsWith('0009')));
const checks=[];async function test(n,f){await f();checks.push(n)}
async function api(user,path,body,{origin='http://localhost',base=db}={}){const r=await handleSocial(new Request('http://localhost/api/social'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),base,user?{userId:user}:null);return {status:r.status,data:await r.json()}}
const card=(extra={})=>({kind:3,rarity:'Legendary',level:12,shiny:false,secret:false,mutation:null,...extra});
const rare=(key,extra)=>({type:'rare_pull',key,card:card(extra)});
async function befriend(a,b,bName,base=db){await api(a,'/friends/request',{username:bName},{base});const req=(await api(b,'/me',undefined,{base})).data.incoming[0];await api(b,'/friends/respond',{id:req.id,accept:true},{base})}
try{
 for(const [u,username] of [['a','ActAlice'],['b','ActBob'],['c','ActCarol']])assert.equal((await api(u,'/profile',{username,kind:0})).status,200);
 await befriend('a','b','ActBob');
 let firstId;
 await test('Posting a highlight needs a username, the game origin and a known type',async()=>{
  assert.equal((await api(null,'/activity',rare('p1'))).status,401);
  assert.equal((await api('a','/activity',rare('p1'),{origin:'https://evil.invalid'})).status,403);
  assert.equal((await api('nobody','/activity',rare('p1'))).status,409);
  const r=await api('a','/activity',rare('p1'));assert.equal(r.status,200,JSON.stringify(r.data));firstId=r.data.id;
 });
 await test('Highlights are validated: fixed types, rare cards only, real bosses and milestones, snapshot fields only',async()=>{
  const bad=async b=>(await api('a','/activity',b)).status;
  assert.equal(await bad({type:'chat',key:'x',text:'hello'}),400);
  assert.equal(await bad({type:'rare_pull',key:'bad key!',card:card()}),400);
  assert.equal(await bad(rare('common',{rarity:'Common'})),400);
  assert.equal(await bad(rare('kind',{kind:16})),400);
  assert.equal(await bad(rare('mut',{mutation:'golden'})),400);
  assert.equal(await bad({type:'boss_win',key:'b1',level:11}),400);
  assert.equal(await bad({type:'level_up',key:'l1',level:30,card:card({level:30})}),400);
  assert.equal(await bad({type:'level_up',key:'l1',level:50,card:card({level:49})}),400);
  assert.equal(await bad(rare('pack-only',{rarity:'Common',mutation:'void'})),200);
  assert.equal(await bad({type:'boss_win',key:'b1',level:25,card:card({rarity:'Common'})}),200);
  assert.equal(await bad({type:'level_up',key:'l1',level:50,card:card({level:50,rarity:'Common',xp:999,nickname:'<b>x</b>'})}),200);
  const stored=JSON.parse((await db.prepare("SELECT data FROM activity_events WHERE dedupe='level_up:l1'").first()).data);
  assert.deepEqual(Object.keys(stored.card).sort(),['kind','level','mutation','rarity','secret','shiny'],'Only snapshot fields are kept');
 });
 await test('The same highlight is only stored once',async()=>{
  const r=await api('a','/activity',rare('p1'));assert.equal(r.status,200);assert.equal(r.data.duplicate,true);assert.equal(r.data.id,firstId);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM activity_events WHERE player_id='a' AND dedupe='rare_pull:p1'").first()).n,1);
 });
 await test('Friends see the feed newest first; strangers see nothing and cannot cheer',async()=>{
  const r=await api('b','/activity');assert.equal(r.status,200);assert.equal(r.data.available,true);
  assert.equal(r.data.events.length,4);assert.ok(r.data.events.every(e=>e.username==='ActAlice'));assert.equal(r.data.events[0].type,'level_up');
  assert.equal(r.data.events.at(-1).id,firstId);assert.equal(r.data.events.at(-1).card.rarity,'Legendary');
  const c=await api('c','/activity');assert.equal(c.status,200);assert.equal(c.data.events.length,0);
  assert.equal((await api('c','/activity/'+firstId+'/cheer',{})).status,403);
  assert.equal((await api(null,'/activity')).status,401);
 });
 await test('A friend can cheer once; the owner sees who cheered',async()=>{
  assert.equal((await api('b','/activity/'+firstId+'/cheer',{},{origin:'https://evil.invalid'})).status,403);
  const one=await api('b','/activity/'+firstId+'/cheer',{});assert.equal(one.status,200);assert.equal(one.data.cheers,1);assert.equal(one.data.already,false);
  const two=await api('b','/activity/'+firstId+'/cheer',{});assert.equal(two.data.cheers,1);assert.equal(two.data.already,true);
  assert.equal((await api('a','/activity/'+firstId+'/cheer',{})).status,400);
  assert.equal((await api('b','/activity/00000000-0000-0000-0000-000000000000/cheer',{})).status,404);
  assert.equal((await api('b','/activity/not-an-id/cheer',{})).status,404);
  const feed=await api('b','/activity');assert.equal(feed.data.events.find(e=>e.id===firstId).cheered,true);
  const mine=(await api('a','/activity')).data.mine.find(e=>e.id===firstId);assert.equal(mine.cheers,1);assert.deepEqual(mine.cheerers,['ActBob']);
 });
 await test('At most 20 highlights a day per player',async()=>{
  const have=(await db.prepare("SELECT COUNT(*) n FROM activity_events WHERE player_id='a'").first()).n;
  for(let i=have;i<20;i++)assert.equal((await api('a','/activity',rare('r'+i))).status,200);
  assert.equal((await api('a','/activity',rare('too-many'))).status,429);
  assert.equal((await api('a','/activity',rare('r19'))).status,200,'a repeat is still fine');
 });
 await test('Old highlights are pruned and turning sharing off removes mine',async()=>{
  await db.prepare("UPDATE activity_events SET created_at=? WHERE player_id='a'").bind(Date.now()-31*86400000).run();
  assert.equal((await api('a','/activity',rare('fresh'))).status,200);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM activity_events WHERE player_id='a'").first()).n,1);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM activity_cheers').first()).n,0,'cheers on pruned events go too');
  assert.equal((await api('a','/activity/clear',{})).status,200);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM activity_events WHERE player_id='a'").first()).n,0);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM trade_assets').first()).n,0,'activity never touches cards or trades');
 });
 await test('Without migration 0009 reads say "not available" and writes fail politely',async()=>{
  assert.equal((await api('a','/profile',{username:'OldAlice',kind:0},{base:old})).status,200);
  const r=await api('a','/activity',undefined,{base:old});assert.equal(r.status,200);assert.equal(r.data.available,false);assert.match(r.data.message,/isn't available yet/);
  const w=await api('a','/activity',rare('p1'),{base:old});assert.equal(w.status,503);assert.match(w.data.error,/isn't available yet/);
  assert.equal((await api('a','/activity/clear',{},{base:old})).status,503);
 });
 console.log(checks.map(n=>'PASS '+n).join('\n'));
}finally{await mf.dispose()}
