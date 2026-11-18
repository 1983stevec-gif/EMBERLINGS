// Duel emotes (lib/card-api.mjs, lib/spectate-api.mjs and public/duel-emotes.js): preset ids only, players only,
// an active match only, one every two seconds and thirty per player per duel, readable by both players and by
// friends watching, and never a change to the battle itself.
import fs from 'node:fs';import assert from 'node:assert/strict';import {Miniflare} from '../node_modules/miniflare/dist/src/index.js';import {handleSocial} from '../lib/social-api.mjs';import {DUEL_EMOTES} from '../lib/card-api.mjs';import {CLIENT_EMOTES} from '../public/duel-emotes.js';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-15'}),db=await mf.getD1Database('DB');for(const f of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())for(const sql of fs.readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
const checks=[];async function test(name,f){await f();checks.push(name);console.log('PASS '+name)}
async function raw(user,path,body){return handleSocial(new Request('http://localhost/api/social'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{origin:'http://localhost','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),db,user?{userId:user}:null)}
async function api(user,path,body){const r=await raw(user,path,body);return {status:r.status,data:r.status===304?null:await r.json()}}
const cards=prefix=>Array.from({length:10},(_,i)=>({id:prefix+'-owned-'+i,kind:i,level:3,rarity:'Common'}));
const rowData=async id=>JSON.parse((await db.prepare('SELECT data FROM matches WHERE id=?').bind(id).first()).data);
const rowOf=id=>db.prepare('SELECT version,data FROM matches WHERE id=?').bind(id).first();
try{
 // a and b duel; c is a friend of both and watches; d is a stranger.
 for(const [id,username] of [['a','EmoteMira'],['b','EmoteBo'],['c','EmoteCleo'],['d','EmoteDex']])assert.equal((await api(id,'/profile',{username,kind:0})).status,200);
 for(const [from,to,toName] of [['a','b','EmoteBo'],['c','a','EmoteMira'],['c','b','EmoteBo']]){await api(from,'/friends/request',{username:toName});const req=(await api(to,'/me')).data.incoming[0];assert.equal((await api(to,'/friends/respond',{id:req.id,accept:true})).status,200)}
 let t=(await api('a','/cards/invite',{username:'EmoteBo',mode:'duel',cards:cards('a')})).data;

 await test('Emotes wait for the duel to start, accept only the preset ids, and turn away anyone not playing',async()=>{
  assert.equal((await api('a','/cards/'+t.id+'/emote',{id:'hello'})).status,409,'An invitation is not a running duel');
  t=(await api('b','/cards/'+t.id+'/join',{cards:cards('b')})).data;assert.equal(t.status,'active');
  for(const bad of ['hi there','HELLO','hello ','',null,42,{},['hello'],'hello\n'])
   assert.equal((await api('a','/cards/'+t.id+'/emote',{id:bad})).status,400,String(bad));
  assert.equal((await api('d','/cards/'+t.id+'/emote',{id:'hello'})).status,403,'A stranger is not a participant');
  assert.equal((await api('c','/cards/'+t.id+'/emote',{id:'hello'})).status,403,'A friend is not a participant either');
  assert.equal((await api('a','/cards/00000000-0000-0000-0000-000000000000/emote',{id:'hello'})).status,404);
  const ok=await api('a','/cards/'+t.id+'/emote',{id:'hello'});assert.equal(ok.status,200,JSON.stringify(ok.data));
  assert.equal(ok.data.emotes.length,1);
  assert.equal(ok.data.emotes[0].id,'hello');assert.equal(ok.data.emotes[0].side,0);assert.equal(typeof ok.data.emotes[0].at,'number');
  const read=await api('a','/cards/'+t.id+'/emote');assert.equal(read.data.emotes.length,1,'Reading never adds one');
 });

 await test('A rapid second emote is limited, and each player gets thirty per duel',async()=>{
  const d=await rowData(t.id);d.emotes.last={host:Date.now()};d.battle.setupDeadline=Date.now()+600000;await db.prepare('UPDATE matches SET data=? WHERE id=?').bind(JSON.stringify(d),t.id).run();
  const rapid=await api('a','/cards/'+t.id+'/emote',{id:'nice'});
  assert.equal(rapid.status,429);assert.equal(rapid.data.error,'Easy on the emotes.');
  const clearThrottle=async()=>{const data=await rowData(t.id);data.emotes.last={};await db.prepare('UPDATE matches SET data=? WHERE id=?').bind(JSON.stringify(data),t.id).run()};
  let sent=1, capped=false; // the one from the case above
  for(let i=0;i<40;i++){
   await clearThrottle();
   const r=await api('a','/cards/'+t.id+'/emote',{id:'nice'});
   if(r.status===200){sent++;continue}
   assert.equal(r.status,429);assert.equal(r.data.error,'You have used all your emotes for this duel.');capped=true;break;
  }
  assert(capped,'The cap is reached');assert.equal(sent,30);
  const stored=await rowData(t.id);
  assert.equal(stored.emotes.log.length,10,'Only the newest ten are kept');
  assert.equal(stored.emotes.used.host,30);
  assert.equal((await api('a','/cards/'+t.id)).data.emotes.length,5,'The battle view carries the newest five');
  // The other player has their own allowance and their own two-second gap.
  const guest=await api('b','/cards/'+t.id+'/emote',{id:'gg'});assert.equal(guest.status,200,JSON.stringify(guest.data));
  const last=guest.data.emotes[guest.data.emotes.length-1];assert.equal(last.id,'gg');assert.equal(last.side,1);
 });

 await test('Players and watchers receive the emote, the battle never changes and the match version advances',async()=>{
  t=(await api('a','/cards/'+t.id+'/leave',{})).data;assert.equal(t.status,'finished');
  assert.equal((await api('a','/cards/'+t.id+'/emote',{id:'gg'})).status,409,'A finished duel takes no emotes');
  let m=(await api('a','/cards/invite',{username:'EmoteBo',mode:'duel',cards:cards('a')})).data;
  m=(await api('b','/cards/'+m.id+'/join',{cards:cards('b')})).data;assert.equal(m.status,'active');
  const before=await rowOf(m.id),battleBefore=JSON.parse(before.data).battle;
  const sent=await api('a','/cards/'+m.id+'/emote',{id:'hooray'});assert.equal(sent.status,200,JSON.stringify(sent.data));
  assert(sent.data.version>before.version,'An emote bumps the version so the next poll carries it');
  const mine=(await api('a','/cards/'+m.id)).data, theirs=(await api('b','/cards/'+m.id)).data;
  for(const v of [mine,theirs]){const last=v.emotes[v.emotes.length-1];assert.equal(last.id,'hooray');assert.equal(last.side,0)}
  const watched=await api('c','/spectate/'+m.id);assert.equal(watched.status,200,JSON.stringify(watched.data));
  const seen=watched.data.emotes[watched.data.emotes.length-1];assert.equal(seen.id,'hooray');assert.equal(seen.side,0);
  // Watching stays read-only.
  assert.equal((await api('c','/cards/'+m.id+'/emote',{id:'gg'})).status,403,'Watchers cannot send an emote');
  assert.equal((await api('c','/spectate/'+m.id,{id:'gg'})).status,405);
  const after=await rowOf(m.id),battleAfter=JSON.parse(after.data).battle;
  assert.deepEqual(battleAfter,battleBefore,'An emote never touches the battle');
  assert(after.version>before.version);
  const text=JSON.stringify(after.data);assert(!/hi there|HELLO/.test(text),'No free text ever reaches storage');
 });

 await test('The client preset list matches the server list exactly',async()=>{
  assert.equal(DUEL_EMOTES.length,8,'Eight presets');assert.equal(CLIENT_EMOTES.length,DUEL_EMOTES.length);
  assert.deepEqual(CLIENT_EMOTES,DUEL_EMOTES);
  assert.equal(new Set(DUEL_EMOTES.map(e=>e.id)).size,8,'Unique ids');
  assert(DUEL_EMOTES.every(e=>e.id&&e.label&&e.label.length>=2));
 });

 console.log(checks.length+' duel emote cases passed');
}finally{await mf.dispose()}
