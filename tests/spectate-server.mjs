import fs from 'node:fs';import assert from 'node:assert/strict';import {Miniflare} from '../node_modules/miniflare/dist/src/index.js';import {handleSocial} from '../lib/social-api.mjs';import {chooseAI} from '../public/card-engine.js';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-15'}),db=await mf.getD1Database('DB');for(const f of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())for(const sql of fs.readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
const checks=[];async function test(n,f){await f();checks.push(n)}
async function raw(user,path,body,{origin='http://localhost',headers={}}={}){return handleSocial(new Request('http://localhost/api/social'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?headers:{origin,'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)}),db,user?{userId:user}:null)}
async function api(user,path,body,opts){const r=await raw(user,path,body,opts);return {status:r.status,etag:r.headers.get('etag'),data:r.status===304?null:await r.json()}}
const cards=prefix=>Array.from({length:10},(_,i)=>({id:prefix+'-owned-'+i,kind:i,level:3,rarity:'Common'}));
async function act(t,user,body){const r=await api(user,'/cards/'+t.id+'/action',{...body,revision:t.state.revision});assert.equal(r.status,200,JSON.stringify(r.data));return r.data}
// a and b duel; c is a's friend; d is b's friend; e is nobody's friend.
try{
 for(const [id,username] of [['a','WatchMira'],['b','WatchBo'],['c','WatchCleo'],['d','WatchDex'],['e','WatchEve']])assert.equal((await api(id,'/profile',{username,kind:0})).status,200);
 for(const [from,to,toName] of [['a','b','WatchBo'],['c','a','WatchMira'],['d','b','WatchBo']]){await api(from,'/friends/request',{username:toName});const req=(await api(to,'/me')).data.incoming[0];assert.equal((await api(to,'/friends/respond',{id:req.id,accept:true})).status,200)}
 let t=(await api('a','/cards/invite',{username:'WatchBo',mode:'duel',cards:cards('a')})).data;
 await test('Nothing is listed or watchable before the duel starts',async()=>{
  assert.deepEqual((await api('c','/spectate')).data.live,[]);
  assert.equal((await api('c','/spectate/'+t.id)).status,410);
 });
 t=(await api('b','/cards/'+t.id+'/join',{cards:cards('b')})).data;assert.equal(t.status,'active');
 await test('During setup watchers see counts only, never the face-down starting choices',async()=>{
  // Mira picks her Active and Bench face down first.
  t=(await api('a','/cards/'+t.id)).data;
  for(let i=0;i<6&&!t.state.sides[0].ready;i++){const a=chooseAI(t.state,0,3);if(!a)break;t=await act(t,'a',a)}
  const r=await api('c','/spectate/'+t.id);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.state.phase,'setup');
  for(const s of r.data.state.sides){assert.equal(s.active,null);assert.deepEqual(s.bench,[]);assert.deepEqual(s.cards,[]);assert.equal(s.hand,undefined);assert.equal(s.drawPile,undefined)}
  assert.equal(r.data.state.sides[0].ready,true);
 });
 for(let i=0;i<30&&t.state.phase==='setup';i++){const user=i%2?'a':'b';t=(await api(user,'/cards/'+t.id)).data;const a=chooseAI(t.state,t.side,3);if(a)t=await act(t,user,a)}
 assert.equal(t.state.phase,'turn');
 await test('Friends of either player see the live duel in their list; players and strangers do not',async()=>{
  const c=(await api('c','/spectate')).data;assert.equal(c.allowWatch,true);assert.equal(c.live.length,1);assert.equal(c.live[0].id,t.id);assert.deepEqual(c.live[0].players,['WatchMira','WatchBo']);assert.deepEqual(c.live[0].friends,['WatchMira']);
  assert.deepEqual((await api('d','/spectate')).data.live[0].friends,['WatchBo']);
  assert.deepEqual((await api('e','/spectate')).data.live,[]);
  assert.deepEqual((await api('a','/spectate')).data.live,[],'Players do not see their own duel as watchable');
 });
 await test('Only friends of a player can watch; strangers get 403, signed-out 401, players 409, unknown 404',async()=>{
  assert.equal((await api('c','/spectate/'+t.id)).status,200);
  assert.equal((await api('d','/spectate/'+t.id)).status,200);
  assert.equal((await api('e','/spectate/'+t.id)).status,403);
  assert.equal((await api(null,'/spectate/'+t.id)).status,401);
  assert.equal((await api('a','/spectate/'+t.id)).status,409);
  assert.equal((await api('b','/spectate/'+t.id)).status,409);
  assert.equal((await api('c','/spectate/00000000-0000-0000-0000-000000000000')).status,404);
  assert.equal((await api('c','/spectate/bad%20id!')).status,404);
 });
 await test('The snapshot has the board, HP, points and turn but no hand, deck order or owned-card ids',async()=>{
  const r=await api('c','/spectate/'+t.id),s=r.data.state,full=JSON.parse((await db.prepare('SELECT data FROM matches WHERE id=?').bind(t.id).first()).data).battle;
  assert.equal(s.turn,full.turn);assert.equal(s.turnNumber,full.turnNumber);
  for(const i of [0,1]){const v=s.sides[i],p=full.sides[i];
   assert.equal(v.active,p.active);assert.deepEqual(v.bench,p.bench);assert.equal(v.points,p.points);assert.equal(v.handCount,p.hand.length);assert.equal(v.deckCount,p.drawPile.length);
   assert.deepEqual(v.cards.map(c=>c.id).sort(),[p.active,...p.bench].filter(Boolean).sort(),'Only face-up cards on the board');
   assert.equal(v.cards.find(c=>c.id===p.active).hp,p.cards.find(c=>c.id===p.active).hp);
   for(const k of ['hand','drawPile','discard','choice','nextEnergy'])assert.equal(v[k],undefined,k+' must not be sent');
  }
  const text=JSON.stringify(r.data);
  assert(!/-owned-/.test(text),'Owned-card ids never reach watchers');assert(!/"(ownerId|ownedId|sourceId)"/.test(text));
  const hidden=full.sides.flatMap(p=>[...p.hand,...p.drawPile]).filter(id=>!full.sides.some(q=>[q.active,...q.bench].includes(id)));
  for(const id of hidden)assert(!text.includes('"'+id+'"'),'Hidden card '+id+' leaked');
  assert(text.length<20000,'Small payload: '+text.length);
 });
 await test('Polling: same version gives 304 with If-None-Match or a tiny "unchanged" reply with ?v=',async()=>{
  const r=await api('c','/spectate/'+t.id);assert(r.etag);
  assert.equal((await api('c','/spectate/'+t.id,undefined,{headers:{'if-none-match':r.etag}})).status,304);
  const u=await api('c','/spectate/'+t.id+'?v='+r.data.version);assert.equal(u.status,200);assert.equal(u.data.unchanged,true);assert.equal(u.data.state,undefined);
  // A real move bumps the version, so watchers get the new board.
  const side=t.state.turn,user=side===0?'a':'b';t=(await api(user,'/cards/'+t.id)).data;const before=t.state.revision;
  for(let i=0;i<40&&t.state.revision===before;i++){const a=chooseAI(t.state,t.side,3);if(!a)break;t=await act(t,user,a)}
  const n=await api('c','/spectate/'+t.id+'?v='+r.data.version);assert.equal(n.status,200);assert(n.data.state,'New board after a move');assert(n.data.version>r.data.version);
 });
 await test('Watchers cannot act: battle actions, joining, leaving and settings posts never touch the match',async()=>{
  const before=(await db.prepare('SELECT version,data FROM matches WHERE id=?').bind(t.id).first());
  for(const user of ['c','e']){
   assert.equal((await api(user,'/cards/'+t.id+'/action',{type:'endTurn',revision:t.state.revision})).status,403);
   assert.equal((await api(user,'/cards/'+t.id+'/action',{type:'forfeit'})).status,403);
   assert.equal((await api(user,'/cards/'+t.id+'/leave',{})).status,403);
   assert.equal((await api(user,'/cards/'+t.id+'/join',{cards:cards(user)})).status,403);
   assert.equal((await api(user,'/cards/'+t.id)).status,403,'The players\' own view stays private');
   assert.equal((await api(user,'/matches/'+t.id+'/leave',{})).status,403);
   assert.equal((await api(user,'/spectate/'+t.id,{type:'forfeit'})).status,405);
   assert.equal((await api(user,'/spectate/'+t.id+'/action',{type:'endTurn'})).status,405);
  }
  const after=(await db.prepare('SELECT version,data FROM matches WHERE id=?').bind(t.id).first());
  assert.equal(after.version,before.version);assert.equal(after.data,before.data);
 });
 await test('Opting out (either player) hides the duel; the setting keeps the profile showcase and needs the game origin',async()=>{
  assert.equal((await api('b','/spectate/settings',{allowWatch:false},{origin:'https://evil.invalid'})).status,403);
  assert.equal((await api('b','/spectate/settings',{allowWatch:'no'})).status,400);
  assert.equal((await api('b','/showcase',{cards:[],frame:'ember',background:'campfire',badges:[],stats:{}})).status,200);
  const off=await api('b','/spectate/settings',{allowWatch:false});assert.equal(off.status,200);assert.equal(off.data.allowWatch,false);
  assert.equal((await api('b','/spectate')).data.allowWatch,false);
  assert.equal((await api('d','/spectate/'+t.id)).status,403,'Bo\'s friend cannot watch');
  assert.equal((await api('c','/spectate/'+t.id)).status,403,'Mira\'s friend cannot watch either');
  assert.deepEqual((await api('c','/spectate')).data.live,[]);
  // Saving the showcase again keeps the choice, and friends never see the flag.
  assert.equal((await api('b','/showcase',{cards:[],frame:'simple',background:'dusk',badges:[],stats:{}})).status,200);
  assert.equal((await api('b','/spectate')).data.allowWatch,false);
  const prof=(await api('a','/players/WatchBo/profile')).data.profile;assert.equal(prof.frame,'simple');assert.equal(prof.watchOff,undefined);
  // A player with no showcase who opts out still shows an empty profile.
  assert.equal((await api('c','/spectate/settings',{allowWatch:false})).status,200);assert.equal((await api('a','/players/WatchCleo/profile')).data.profile,null);
  assert.equal((await api('c','/spectate/settings',{allowWatch:true})).status,200);
  assert.equal((await api('b','/spectate/settings',{allowWatch:true})).status,200);
  assert.equal((await api('c','/spectate/'+t.id)).status,200);
 });
 await test('A finished duel shows its result to watchers, then is no longer listed',async()=>{
  const r=await api('b','/cards/'+t.id+'/leave',{});assert.equal(r.status,200);assert.equal(r.data.status,'finished');
  const w=await api('c','/spectate/'+t.id);assert.equal(w.status,200);assert.equal(w.data.status,'finished');assert(w.data.state.result);assert.equal(w.data.state.result.winner,0);
  assert.deepEqual((await api('c','/spectate')).data.live,[]);
  await db.prepare('UPDATE matches SET updated_at=? WHERE id=?').bind(Date.now()-3600000,t.id).run();
  assert.equal((await api('c','/spectate/'+t.id)).status,410);
 });
 console.log(checks.map(n=>'PASS '+n).join('\n'));
}finally{await mf.dispose()}
