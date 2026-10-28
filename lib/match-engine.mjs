import {RARITIES,MUTATIONS,mutationTrait,mutationDamage,rarityPowerBonus,moveProfile,skillShots} from '../public/combat-rules.js';
// Server-authoritative simulation. Clients submit intentions, never health or damage.
export const SPECIES_POWER=[19,17,16,20,17,22,20,23,15,18];
export const COVER=[{x:340,y:85,w:55,h:65},{x:365,y:300,w:55,h:65}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const finite=v=>typeof v==='number'&&Number.isFinite(v);
export function pet(kind,shiny=false,rarity='Common',secret=false,mutation=null){if(mutation!==null&&!MUTATIONS.some(m=>m.id===mutation))throw Error('Invalid mutation');if(!Number.isInteger(kind)||kind<0||kind>9)throw Error('Invalid Mythling');if(!RARITIES.includes(rarity))throw Error('Invalid rarity');return {kind,shiny:!!shiny,level:12,rarity,secret:secret===true,mutation}}
function player(profile,x,now){return {id:profile.user_id,username:profile.username,kind:profile.pet_kind,shiny:!!profile.pet_shiny,rarity:RARITIES.includes(profile.pet_rarity)?profile.pet_rarity:'Common',secret:!!profile.pet_secret,mutation:mutationTrait({mutation:profile.pet_mutation})?.id||null,level:12,x,y:220,hp:160,maxhp:160,energy:0,faceX:x<400?1:-1,faceY:0,cool:{basic:0,skill:0,dodge:0,ultimate:0},input:{x:0,y:0,target:null,expires:now},seq:0,lastSeen:now,invul:0,dash:0,attackSerial:0,hitSerial:0}}
export function createMatch(mode,host,guest,now=Date.now()){
 if(!['duel','coop'].includes(mode))throw Error('Invalid match mode');
 return {mode,clockMs:now,startAt:now+3500,elapsed:0,players:[player(host,mode==='coop'?140:150,now),player(guest,mode==='coop'?235:650,now)],foe:mode==='coop'?{id:'boss',x:630,y:220,hp:480,maxhp:480,kind:3,boss:true,level:25,clock:2.2,turn:0,hitSerial:0,attackSerial:0}:null,hazards:[],shots:[],serial:0,result:null};
}
function blocked(x,y,r=16){return COVER.some(o=>x+r>o.x&&x-r<o.x+o.w&&y+r>o.y&&y-r<o.y+o.h)}
function move(p,dx,dy){const x=clamp(p.x+dx,22,778),y=clamp(p.y+dy,24,416);if(!blocked(x,p.y))p.x=x;if(!blocked(p.x,y))p.y=y}
function lineDistance(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(px-ax-t*dx,py-ay-t*dy)}
function visible(a,b){const steps=Math.ceil(distance(a,b)/10);for(let i=1;i<steps;i++){const t=i/steps;if(COVER.some(o=>a.x+(b.x-a.x)*t>o.x&&a.x+(b.x-a.x)*t<o.x+o.w&&a.y+(b.y-a.y)*t>o.y&&a.y+(b.y-a.y)*t<o.y+o.h))return false}return true}
function hurt(s,target,amount){if(target.hp<=0||target.invul>0)return false;target.hp=Math.max(0,target.hp-Math.round(amount));target.hitSerial=++s.serial;target.invul=target.id==='boss'?0:.25;return true}
function targets(s,p){return s.mode==='duel'?s.players.filter(q=>q.id!==p.id&&q.hp>0):s.foe?.hp>0?[s.foe]:[]}
function action(s,p,name){
 if(!['basic','skill','dodge','ultimate'].includes(name)||p.hp<=0||p.cool[name]>0)return;
 if(name==='skill'&&p.energy<25||name==='ultimate'&&p.energy<100)return;
 if(name==='dodge'){p.cool.dodge=1.3;p.dash=.19;p.invul=.34;return}
 const enemies=targets(s,p),target=enemies.sort((a,b)=>distance(p,a)-distance(p,b))[0],base=mutationDamage(p,SPECIES_POWER[p.kind]+10+rarityPowerBonus(p));
 let dx=p.faceX,dy=p.faceY;if(target){const d=distance(p,target)||1;dx=(target.x-p.x)/d;dy=(target.y-p.y)/d}
 p.attackSerial=++s.serial;
 if(name==='basic'){p.cool.basic=.48;if(target&&distance(p,target)<94&&visible(p,target)&&hurt(s,target,base))p.energy=clamp(p.energy+20,0,100)}
 if(name==='skill')castSkill(s,p,base,dx,dy);
 if(name==='ultimate'){p.cool.ultimate=2;p.energy=0;for(const q of enemies)if(distance(p,q)<240)hurt(s,q,Math.min(Math.round(base*1.8+12),Math.floor(q.maxhp*.4)))}
}
function finish(s,reason,winners=[]){s.result={reason,winners,finishedAt:s.clockMs};s.shots=[];s.hazards=[]}
function checkResult(s){if(s.result)return;if(s.mode==='duel'){const alive=s.players.filter(p=>p.hp>0);if(alive.length<2)finish(s,alive.length?'victory':'draw',alive.map(p=>p.id))}else if(s.foe.hp<=0)finish(s,'victory',s.players.map(p=>p.id));else if(s.players.every(p=>p.hp<=0))finish(s,'defeat');if(!s.result&&s.elapsed>=300)finish(s,'time_limit')}
function step(s,dt,now){
 for(const p of s.players){for(const k in p.cool)p.cool[k]=Math.max(0,p.cool[k]-dt);p.invul=Math.max(0,p.invul-dt);p.dash=Math.max(0,p.dash-dt);if(p.hp<=0)continue;
  let x=0,y=0;if(p.input.expires>=now){x=p.input.x;y=p.input.y;if(!x&&!y&&p.input.target){const d=distance(p,p.input.target);if(d>5){x=(p.input.target.x-p.x)/d;y=(p.input.target.y-p.y)/d}else p.input.target=null}}
  if(!p.motionAnchor){const len=Math.hypot(x,y);if(len>.05){p.faceX=x/len;p.faceY=y/len}if(p.dash>0){x=p.faceX;y=p.faceY}move(p,x*dt*(p.dash>0?590:175),y*dt*(p.dash>0?590:175));}
 }
 if(s.foe?.hp>0){const f=s.foe,alive=s.players.filter(p=>p.hp>0),target=alive.sort((a,b)=>distance(f,a)-distance(f,b))[0];if(target){const d=distance(f,target);if(d>135)move(f,(target.x-f.x)/d*60*dt,(target.y-f.y)/d*60*dt)}f.clock-=dt;if(f.clock<=0){f.clock=2.4;f.turn++;f.attackSerial=++s.serial;for(const p of alive)s.hazards.push({id:++s.serial,x:p.x,y:p.y,r:f.turn%3===0?90:62,left:1.05,max:1.05,damage:f.turn%3===0?22:14})}}
 for(const h of s.hazards){h.left-=dt;if(h.left<=0)for(const p of s.players)if(p.hp>0&&distance(p,h)<h.r+16)hurt(s,p,h.damage)}s.hazards=s.hazards.filter(h=>h.left>0);
 advanceShots(s,dt);s.elapsed+=dt;checkResult(s);
}
export function advanceMatch(s,now=Date.now()){
 if(s.result)return s;const absent=s.players.filter(p=>now-p.lastSeen>25000);if(absent.length){finish(s,absent.length===2?'abandoned':s.mode==='duel'?'forfeit':'partner_disconnected',s.mode==='duel'&&absent.length===1?s.players.filter(p=>p.id!==absent[0].id).map(p=>p.id):[]);return s}
 const start=Math.max(s.clockMs,s.startAt),elapsed=Math.min(.65,Math.max(0,(now-start)/1000));let remaining=elapsed;while(remaining>0&&!s.result){const dt=Math.min(.05,remaining);step(s,dt,now);remaining-=dt}s.clockMs=now;return s;
}
export function submitInput(s,userId,input,now=Date.now()){
 const p=s.players.find(p=>p.id===userId);if(!p)throw Error('Not a participant');
 if(!Number.isSafeInteger(input.seq)||input.seq<1)throw Error('Invalid input sequence');if(input.seq<=p.seq)return s;
 if(input.frames!==undefined&&(!Array.isArray(input.frames)||input.frames.length>60||input.frames.some(f=>!Array.isArray(f)||f.length!==6||!Number.isSafeInteger(f[0])||f[0]<1||!finite(f[1])||f[1]<=0||f[1]>50||!finite(f[2])||!finite(f[3])||!(f[4]===null&&f[5]===null||finite(f[4])&&finite(f[5])))||input.resetMovement&&input.frames.length))throw Error('Invalid movement frames');
 advanceMatch(s,now);if(s.result)return s;p.seq=input.seq;p.lastSeen=now;
 if(input.frames){
  const last=p.motionAt??Math.max(s.startAt,now),elapsed=Math.max(0,now-Math.max(last,s.startAt));p.motionCredit=Math.min(650,(p.motionCredit??250)+elapsed);p.motionAt=now;
  if(!p.motionAnchor||input.resetMovement)p.motionAnchor={x:p.x,y:p.y,faceX:p.faceX,faceY:p.faceY,dash:p.dash};
  Object.assign(p,p.motionAnchor);
  for(const frame of input.frames){const [id,ms,rawX,rawY,tx,ty]=frame;if(id<=(p.motionFrameId||0))continue;p.motionFrameId=id;let duration=Math.min(ms,p.motionCredit)/1000;p.motionCredit=Math.max(0,p.motionCredit-ms);if(now<s.startAt||p.hp<=0)continue;let x=clamp(rawX,-1,1),y=clamp(rawY,-1,1);const length=Math.hypot(x,y);if(length>1){x/=length;y/=length}const target=finite(tx)&&finite(ty)?{x:clamp(tx,22,778),y:clamp(ty,24,416)}:null;
   while(duration>0){const dt=Math.min(.02,duration);let dx=x,dy=y,travel=175*dt;if(!dx&&!dy&&target){const d=distance(p,target);if(d>5){dx=(target.x-p.x)/d;dy=(target.y-p.y)/d;travel=Math.min(travel,d-4)}}if(Math.hypot(dx,dy)>.05){p.faceX=dx;p.faceY=dy}if(p.dash>0){dx=p.faceX;dy=p.faceY;travel=590*dt}move(p,dx*travel,dy*travel);p.dash=Math.max(0,p.dash-dt);duration-=dt;}
  }
 }
 let x=finite(input.x)?clamp(input.x,-1,1):0,y=finite(input.y)?clamp(input.y,-1,1):0;const len=Math.hypot(x,y);if(len>1){x/=len;y/=len}
 const target=input.target&&finite(input.target.x)&&finite(input.target.y)?{x:clamp(input.target.x,22,778),y:clamp(input.target.y,24,416)}:null;
 p.input={x,y,target,expires:now+750};if(Math.hypot(x,y)>.05){p.faceX=x;p.faceY=y}if(now>=s.startAt&&input.action)action(s,p,input.action);if(p.motionAnchor)p.motionAnchor={x:p.x,y:p.y,faceX:p.faceX,faceY:p.faceY,dash:p.dash};checkResult(s);return s;
}
export function leaveMatch(s,userId){if(s.result)return s;const p=s.players.find(p=>p.id===userId);if(!p)throw Error('Not a participant');finish(s,s.mode==='duel'?'forfeit':'partner_left',s.mode==='duel'?s.players.filter(p=>p.id!==userId).map(p=>p.id):[]);return s}

function castSkill(s,p,base,dx,dy){const m=moveProfile(p.kind),enemies=targets(s,p),nearest=enemies.sort((a,b)=>distance(p,a)-distance(p,b))[0];p.energy-=25;p.cool.skill=m.cool;s.effects=s.effects||[];s.effects.push({x:p.x,y:p.y,r:m.range||60,life:.35,color:m.color});s.effects=s.effects.slice(-12);
 if(m.count){for(const shot of skillShots(p,p.kind,base,dx,dy))s.shots.push({...shot,id:++s.serial,ownerId:p.id});return}
 if(m.mode==='lunge'){for(let i=0;i<8;i++)move(p,dx*6,dy*6);if(nearest&&distance(p,nearest)<m.range)hurt(s,nearest,base*m.power);return}
 if(m.mode==='bloom'){for(const q of enemies)if(distance(p,q)<m.range)hurt(s,q,base*m.power);p.hp=Math.min(p.maxhp,p.hp+Math.round(p.maxhp*.1));return}
 if(m.mode==='chain'){if(nearest&&distance(p,nearest)<m.range){hurt(s,nearest,base*m.power);for(const q of enemies)if(q!==nearest&&distance(q,nearest)<140)hurt(s,q,base*m.power*.7)}return}
 if(m.mode==='siphon'){if(nearest&&distance(p,nearest)<m.range&&hurt(s,nearest,base*m.power)){p.hp=Math.min(p.maxhp,p.hp+Math.round(p.maxhp*.08));p.energy=Math.min(100,p.energy+10);if(nearest.energy!==undefined)nearest.energy=Math.max(0,nearest.energy-10)}return}
 if(m.mode==='gust'){for(const q of enemies)if(distance(p,q)<m.range){hurt(s,q,base*m.power);const d=distance(p,q)||1;for(let i=0;i<5;i++)move(q,(q.x-p.x)/d*6,(q.y-p.y)/d*6);if(q.motionAnchor){q.motionAnchor.x=q.x;q.motionAnchor.y=q.y}}}
}
function advanceShots(s,dt){for(const shot of s.shots){const old={x:shot.x,y:shot.y};shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt;const wall=blocked(shot.x,shot.y,shot.r)||shot.x<shot.r||shot.x>800-shot.r||shot.y<shot.r||shot.y>440-shot.r;if(wall){if(shot.bounces>0){const horizontal=blocked(shot.x,old.y,shot.r)||shot.x<shot.r||shot.x>800-shot.r,vertical=blocked(old.x,shot.y,shot.r)||shot.y<shot.r||shot.y>440-shot.r;if(horizontal)shot.vx*=-1;if(vertical)shot.vy*=-1;if(!horizontal&&!vertical){shot.vx*=-1;shot.vy*=-1}shot.x=old.x;shot.y=old.y;shot.bounces--}else shot.life=0}if(shot.life<=0)continue;const owner=s.players.find(p=>p.id===shot.ownerId);shot.hitIds=shot.hitIds||[];for(const target of targets(s,owner))if(!shot.hitIds.includes(target.id)&&lineDistance(target.x,target.y,old.x,old.y,shot.x,shot.y)<shot.r+(target.id==='boss'?27:18)){hurt(s,target,shot.damage);shot.hitIds.push(target.id);if(shot.pierce>0)shot.pierce--;else{shot.life=0;break}}}s.shots=s.shots.filter(p=>p.life>0);s.effects=(s.effects||[]).map(e=>({...e,life:e.life-dt})).filter(e=>e.life>0)}
