import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Miniflare} from '../node_modules/miniflare/dist/src/index.js';
import {handleSocial} from '../lib/social-api.mjs';
import {BOSS_CARDS} from '../public/combat-rules.js';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-15'}),db=await mf.getD1Database('DB');
async function api(user,path,body){const response=await handleSocial(new Request('http://localhost/api/social'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{origin:'http://localhost','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),db,{userId:user});return {status:response.status,data:await response.json()}}
try{
 for(const file of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())for(const sql of fs.readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
 for(const [user,username] of [['a','BossAlice'],['b','BossBob']])assert.equal((await api(user,'/profile',{username,kind:20,rarity:'Legendary'})).status,200);
 assert.equal((await api('a','/loadout',{kind:21})).status,400);
 await api('a','/friends/request',{username:'BossBob'});const request=(await api('b','/me')).data.incoming[0];await api('b','/friends/respond',{id:request.id,accept:true});
 const cards=BOSS_CARDS.map(c=>({id:'boss-'+c.kind,kind:c.kind,level:25,rarity:'Legendary'}));
 const body={username:'BossBob',mode:'duel',cards};
 assert.equal((await api('a','/cards/invite',{...body,cards:[{id:'invalid',kind:21}]})).status,400);
 const invite=await api('a','/cards/invite',body);assert.equal(invite.status,200,JSON.stringify(invite.data));
 const joined=await api('b','/cards/'+invite.data.id+'/join',{cards:cards.map(c=>({...c,id:'guest-'+c.id}))});assert.equal(joined.status,200,JSON.stringify(joined.data));
 const battle=(await api('a','/cards/'+invite.data.id)).data.state;for(const boss of BOSS_CARDS)assert(battle.sides[0].cards.some(c=>c.kind===boss.kind&&Number.isFinite(c.damage)&&Number.isFinite(c.maxhp)));
 const synced=await api('a','/trades/sync',{creatures:cards.map(creature=>({creature,eligible:true}))});assert.equal(synced.status,200,JSON.stringify(synced.data));for(let i=0;i<cards.length;i++){const stored=await db.prepare('SELECT data FROM trade_assets WHERE id=?').bind(synced.data.assets[i].assetId).first();assert.equal(JSON.parse(stored.data).kind,cards[i].kind)}
 assert.equal((await api('a','/trades/sync',{creatures:[{creature:{id:'invalid',kind:21},eligible:true}]})).status,400);
 console.log('PASS all boss species in profiles, online battle decks and persisted trade assets; unknown species rejected');
}finally{await mf.dispose()}
