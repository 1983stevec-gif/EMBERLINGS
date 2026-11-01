import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Miniflare} from '../node_modules/miniflare/dist/src/index.js';
import {handleSocial} from '../lib/social-api.mjs';
import {levelPerks} from '../public/card-engine.js';
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-15'});
const db=await mf.getD1Database('DB');
async function api(user,path,body){const response=await handleSocial(new Request('http://localhost/api/social'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{origin:'http://localhost','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),db,{userId:user});return {status:response.status,data:await response.json()}}
try{
 for(const file of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())for(const sql of fs.readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
 for(const [user,username] of [['a','CopyAlice'],['b','CopyBob']])assert.equal((await api(user,'/profile',{username,kind:0})).status,200);
 await api('a','/friends/request',{username:'CopyBob'});const request=(await api('b','/me')).data.incoming[0];await api('b','/friends/respond',{id:request.id,accept:true});
 const original={id:'original-upgraded-card',kind:0,level:100,rarity:'Rare',shiny:true,mutation:'spark'},copy={...original,id:'new-mutation-copy',mutation:'flame',perkSeed:original.id};
 const body={username:'CopyBob',mode:'duel',cards:[copy],deck:['m-0-false-0']};
 for(const perkSeed of [{forged:true},'bad seed'])assert.equal((await api('a','/cards/invite',{...body,cards:[{...copy,perkSeed}]})).status,400);
 const invitation=await api('a','/cards/invite',body);assert.equal(invitation.status,200,JSON.stringify(invitation.data));
 const saved=JSON.parse((await db.prepare('SELECT data FROM matches WHERE id=?').bind(invitation.data.id).first()).data);assert.equal(saved.hostDeck[0].perkSeed,original.id);
 const joined=await api('b','/cards/'+invitation.data.id+'/join',{cards:[{...original,id:'guest-card'}],deck:['m-0-false-0']});assert.equal(joined.status,200,JSON.stringify(joined.data));
 const mine=(await api('a','/cards/'+invitation.data.id)).data.state.sides[0].cards.find(c=>c.sourceId===copy.id);assert(mine);assert.equal(mine.perkSeed,original.id);assert.deepEqual(levelPerks(mine),levelPerks(original));
 const synced=await api('a','/trades/sync',{creatures:[{creature:original,eligible:true},{creature:copy,eligible:true}]});assert.equal(synced.status,200,JSON.stringify(synced.data));assert.notEqual(synced.data.assets[0].assetId,synced.data.assets[1].assetId);
 const asset=await db.prepare('SELECT data FROM trade_assets WHERE id=?').bind(synced.data.assets[1].assetId).first();assert.equal(JSON.parse(asset.data).perkSeed,original.id);
 assert.equal((await api('a','/trades/sync',{creatures:[{creature:{...copy,perkSeed:{}},eligible:true}]})).status,400);
 console.log('PASS mutation copies keep special upgrades in online decks and separate trade assets; invalid upgrade seeds are rejected');
}finally{await mf.dispose()}
