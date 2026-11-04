import fs from 'node:fs';import assert from 'node:assert/strict';import {Miniflare} from '../node_modules/miniflare/dist/src/index.js';import {handleSocial} from '../lib/social-api.mjs';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-15'}),db=await mf.getD1Database('DB');for(const f of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())for(const sql of fs.readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
const checks=[];async function test(n,f){await f();checks.push(n)}
async function api(user,path,body,origin='http://localhost'){const r=await handleSocial(new Request('http://localhost/api/social'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),db,user?{userId:user}:null);return {status:r.status,data:await r.json()}}
const card=(kind,extra={})=>({id:'card-'+kind,kind,rarity:'Legendary',level:42,shiny:true,secret:false,mutation:'cosmic',...extra});
const good={cards:[card(1),card(2,{mutation:null,shiny:false,rarity:'Common',level:1}),card(3,{stage:1,academyAttack:3,fused:true})],frame:'ember',background:'campfire',badges:['pack-1','friend-1'],stats:{cards:120,species:9,wins:14,achievements:6}};
try{
 for(const [u,username] of [['a','ShowAlice'],['b','ShowBob'],['c','ShowCarol']])assert.equal((await api(u,'/profile',{username,kind:0})).status,200);
 await api('a','/friends/request',{username:'ShowBob'});const req=(await api('b','/me')).data.incoming[0];await api('b','/friends/respond',{id:req.id,accept:true});
 await test('Saving a profile needs a username, the game origin and stays within limits',async()=>{
  assert.equal((await api(null,'/showcase',good)).status,401);
  assert.equal((await api('a','/showcase',good,'https://evil.invalid')).status,403);
  const r=await api('a','/showcase',good);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.profile.cards.length,3);
 });
 await test('Showcase rejects more than 5 cards, unknown frames, backgrounds, badges and bad card data',async()=>{
  const bad=async patch=>(await api('a','/showcase',{...good,...patch})).status;
  assert.equal(await bad({cards:[1,2,3,4,5,6].map(k=>card(k))}),400);
  assert.equal(await bad({frame:'diamond-hack'}),400);
  assert.equal(await bad({background:'<script>'}),400);
  assert.equal(await bad({badges:['not-real']}),400);
  assert.equal(await bad({badges:['pack-1','pack-1']}),400);
  assert.equal(await bad({badges:['pack-1','pack-25','pack-100','quest-1','quest-25','quest-100','boss-1']}),400);
  assert.equal(await bad({cards:[card(16)]}),400);
  assert.equal(await bad({cards:[card(1,{rarity:'Ultra'})]}),400);
  assert.equal(await bad({cards:[card(1,{mutation:'golden'})]}),400);
  assert.equal(await bad({cards:[card(1,{level:101})]}),400);
  assert.equal(await bad({cards:[card(1,{id:'x'.repeat(65)})]}),400);
  assert.equal(await bad({stats:{cards:-1}}),400);
  assert.equal(await bad({stats:{species:17}}),400);
  assert.equal(await api('a','/showcase',{...good,cards:[{...card(1),xp:999,coins:5,nickname:'<b>hi</b>'}]}).then(r=>r.status),200);
  const stored=JSON.parse((await db.prepare("SELECT profile FROM players WHERE user_id='a'").first()).profile);
  assert.deepEqual(Object.keys(stored.cards[0]).sort(),['id','kind','level','mutation','rarity','secret','shiny'],'Only snapshot fields are kept');
  assert.equal((await api('a','/showcase',good)).status,200);
 });
 await test('Friends can read the profile; strangers and signed-out visitors cannot',async()=>{
  const r=await api('b','/players/showalice/profile');assert.equal(r.status,200,JSON.stringify(r.data));
  assert.equal(r.data.username,'ShowAlice');assert.equal(r.data.self,false);assert.equal(r.data.profile.frame,'ember');assert.equal(r.data.profile.background,'campfire');
  assert.deepEqual(r.data.profile.badges,['pack-1','friend-1']);assert.equal(r.data.profile.cards[2].stage,1);assert.equal(r.data.profile.cards[2].fused,true);assert.equal(r.data.profile.stats.wins,14);
  assert.equal((await api('c','/players/ShowAlice/profile')).status,403);
  assert.equal((await api(null,'/players/ShowAlice/profile')).status,401);
  assert.equal((await api('a','/players/ShowAlice/profile')).data.self,true);
  assert.equal((await api('b','/players/nobody_here/profile')).status,404);
  assert.equal((await api('b','/players/bad name!/profile')).status,400);
 });
 await test('Card backs, avatar rings and the avatar picture are optional, validated and shown to friends',async()=>{
  const bad=async patch=>(await api('a','/showcase',{...good,...patch})).status;
  assert.equal(await bad({cardBack:'hacked-back'}),400);
  assert.equal(await bad({cardBack:'<img>'}),400);
  assert.equal(await bad({ring:'diamond'}),400);
  assert.equal(await bad({avatar:card(16)}),400);
  assert.equal(await bad({avatar:card(1,{rarity:'Ultra'})}),400);
  assert.equal(await bad({avatar:'not a card'}),400);
  const old=await api('a','/showcase',good);assert.equal(old.status,200);assert.equal(old.data.profile.cardBack,'ember','Older games get the default back');assert.equal(old.data.profile.ring,'gold');assert.equal(old.data.profile.avatar,undefined);
  const r=await api('a','/showcase',{...good,cardBack:'starfield',ring:'prism',avatar:{...card(5),xp:9,coins:99}});assert.equal(r.status,200,JSON.stringify(r.data));
  const seen=(await api('b','/players/ShowAlice/profile')).data.profile;
  assert.equal(seen.cardBack,'starfield');assert.equal(seen.ring,'prism');
  assert.deepEqual(Object.keys(seen.avatar).sort(),['kind','level','mutation','rarity','secret','shiny'],'Avatar keeps only picture fields');assert.equal(seen.avatar.kind,5);
  assert.equal((await api('a','/showcase',{...good,cards:[1,2,3,4,5].map(k=>card(k,{id:'x'.repeat(64)})),badges:['pack-1','pack-25','pack-100','quest-1','quest-25','quest-100'],cardBack:'void',ring:'champion',avatar:card(7,{stage:2,academyAttack:5,fused:true})})).status,200,'A full profile still fits');
 });
 await test('A friend without a saved showcase shows an empty profile, and showcasing never touches cards or trades',async()=>{
  const r=await api('a','/players/ShowBob/profile');assert.equal(r.status,200);assert.equal(r.data.profile,null);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM trade_assets').first()).n,0);
 });
 console.log(checks.map(n=>'PASS '+n).join('\n'));
}finally{await mf.dispose()}
