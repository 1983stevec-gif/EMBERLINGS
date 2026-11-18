import fs from 'node:fs';import assert from 'node:assert/strict';import {Miniflare} from '../node_modules/miniflare/dist/src/index.js';import {handleSocial} from '../lib/social-api.mjs';import {cleanProfile} from '../lib/profile-api.mjs';import {TITLES} from '../public/achievements.js';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-15'}),db=await mf.getD1Database('DB');for(const f of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())for(const sql of fs.readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
const checks=[];async function test(n,f){await f();checks.push(n)}
async function api(user,path,body,origin='http://localhost'){const r=await handleSocial(new Request('http://localhost/api/social'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),db,user?{userId:user}:null);return {status:r.status,data:await r.json()}}
const card=(kind,extra={})=>({id:'link-'+kind,kind,rarity:'Rare',level:9,shiny:false,secret:false,mutation:null,...extra});
const look={cards:[card(2),card(5,{shiny:true})],frame:'ember',background:'campfire',badges:['pack-1'],stats:{cards:40,species:6,wins:3,achievements:2}};
const title=TITLES.find(Boolean);
const stored=async u=>JSON.parse((await db.prepare('SELECT profile FROM players WHERE user_id=?').bind(u).first()).profile);
try{
 for(const [u,username] of [['a','SharePat'],['b','PrivatePip'],['c','FriendFay']])assert.equal((await api(u,'/profile',{username,kind:4})).status,200);
 assert.equal((await api('a','/title',{title})).status,200);
 await api('a','/friends/request',{username:'FriendFay'});const req=(await api('c','/me')).data.incoming[0];await api('c','/friends/respond',{id:req.id,accept:true});assert.equal((await api('c','/me')).data.friends.length,1);
 assert.equal((await api('a','/showcase',{...look,share:true})).status,200,'The owner turns the public link on');
 assert.equal((await api('b','/showcase',look)).status,200,'This player never turned it on');

 await test('A signed-out visitor can read an opted-in profile link, and only the showcase comes back',async()=>{
  const r=await api(null,'/p/SharePat');assert.equal(r.status,200,JSON.stringify(r.data));
  assert.deepEqual(Object.keys(r.data).sort(),['pet','profile','title','username'],'Exactly four things come back');
  assert.equal(r.data.username,'SharePat');assert.equal(r.data.title,title);
  assert.deepEqual(r.data.pet,{kind:4,shiny:false,rarity:'Common',secret:false,mutation:null,level:12});
  assert.deepEqual(r.data.profile.cards.map(c=>c.kind),[2,5]);assert.equal(r.data.profile.frame,'ember');assert.equal(r.data.profile.share,true);
  for(const gone of ['online','lastSeen','inDuel','self'])assert(!(gone in r.data),'A shared link never carries '+gone);
  assert(!JSON.stringify(r.data).includes('lastSeen')&&!JSON.stringify(r.data).includes('online'),'No presence in the payload');
  assert.equal((await api(null,'/p/sharepat')).status,200,'The link name is not case sensitive');
 });

 await test('A profile that was never shared stays private, and a bad or unknown name is refused',async()=>{
  const p=await api(null,'/p/PrivatePip');assert.equal(p.status,403,JSON.stringify(p.data));assert.equal(p.data.error,'This player keeps their profile private.');
  const n=await api(null,'/p/NobodyHere');assert.equal(n.status,404);assert.equal(n.data.error,'Player not found.');
  assert.equal((await api(null,'/p/ab')).data.error,'Enter a valid username.');
  assert.equal((await api(null,'/p/no pe')).data.error,'Enter a valid username.');
  assert.equal((await api(null,'/p/%E0%A4%A')).status,400,'Broken percent escapes are refused');
 });

 await test('Saving with share:true stores the flag, saving without it stays private, and friends still see the profile',async()=>{
  assert.equal((await stored('a')).share,true,'The flag lives in the profile JSON');
  const f=await api('c','/players/SharePat/profile');assert.equal(f.status,200,JSON.stringify(f.data));
  assert.equal(f.data.self,false);assert.equal(f.data.username,'SharePat');assert.equal(f.data.profile.cards.length,2);assert.ok('online' in f.data&&'lastSeen' in f.data,'The friends view still carries presence');
  assert.equal((await api('b','/players/SharePat/profile')).status,403,'A stranger is still refused by the friends view');
  assert.equal((await stored('b')).share,undefined,'A profile saved without the flag is private');
  assert.equal(cleanProfile(look).share,undefined);assert.equal(cleanProfile({...look,share:false}).share,undefined);assert.equal(cleanProfile({...look,share:'yes'}).share,undefined);assert.equal(cleanProfile({...look,share:true}).share,true,'Only a real true turns it on');
 });

 await test('Re-saving the showcase as the game does keeps the public link on',async()=>{
  assert.equal((await api('a','/showcase',{...look,cards:[card(7,{level:12})],frame:'gilded',share:true})).status,200);
  assert.equal((await stored('a')).share,true);
  const r=await api(null,'/p/SharePat');assert.equal(r.status,200,JSON.stringify(r.data));
  assert.deepEqual(r.data.profile.cards.map(c=>c.kind),[7]);assert.equal(r.data.profile.frame,'gilded');
  assert.deepEqual(Object.keys(r.data).sort(),['pet','profile','title','username']);
 });
 console.log(checks.map(n=>'PASS '+n).join('\n'));
 console.log(checks.length+' profile link checks passed.');
}finally{await mf.dispose()}
