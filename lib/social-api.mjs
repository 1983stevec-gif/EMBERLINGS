import {cardRequest,CardError} from './card-api.mjs';
import {tradeSummary,tradeRequest,TradeError} from './trade-api.mjs';
import { createMatch, submitInput, leaveMatch, pet } from './match-engine.mjs';
class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
const fail=(status,message)=>{throw new HttpError(status,message)};
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
const pair=(a,b)=>[a,b].sort();
const first=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const rows=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const uuid=()=>crypto.randomUUID();
async function profile(db,id){return first(db,'SELECT * FROM players WHERE user_id=?',id)}
async function expireStale(db,id){await db.prepare("UPDATE matches SET status='expired',version=version+1 WHERE status='active' AND updated_at<? AND (host_id=? OR guest_id=?)").bind(Date.now()-45000,id,id).run()}
async function connected(db,a,b){const [low,high]=pair(a,b);return !!await first(db,'SELECT id FROM friendships WHERE low_id=? AND high_id=?',low,high)}
function publicPlayer(p){return p?{id:p.user_id,username:p.username,pet:{kind:p.pet_kind,shiny:!!p.pet_shiny,rarity:p.pet_rarity||'Common',secret:!!p.pet_secret,mutation:p.pet_mutation||null,level:12},online:Date.now()-p.seen_at<60000}:null}
async function bootstrap(db,id){
 const me=await profile(db,id);if(!me)return {signedIn:true,me:null,friends:[],incoming:[],outgoing:[],invites:[]};const now=Date.now();await expireStale(db,id);
 await db.prepare('UPDATE players SET seen_at=? WHERE user_id=? AND seen_at<?').bind(now,id,now-30000).run();
 const friends=await rows(db,'SELECT p.* FROM friendships f JOIN players p ON p.user_id=CASE WHEN f.low_id=? THEN f.high_id ELSE f.low_id END WHERE f.low_id=? OR f.high_id=? ORDER BY p.username_key',id,id,id);
 const incoming=await rows(db,"SELECT r.id,p.username FROM friend_requests r JOIN players p ON p.user_id=r.from_id WHERE r.to_id=? AND r.status='pending' ORDER BY r.created_at DESC",id);
 const outgoing=await rows(db,"SELECT r.id,p.username FROM friend_requests r JOIN players p ON p.user_id=r.to_id WHERE r.from_id=? AND r.status='pending' ORDER BY r.created_at DESC",id);
 const invites=await rows(db,"SELECT m.id,m.mode,m.status,m.host_id,m.guest_id,h.username AS host_name,g.username AS guest_name FROM matches m JOIN players h ON h.user_id=m.host_id JOIN players g ON g.user_id=m.guest_id WHERE (m.host_id=? OR m.guest_id=?) AND (m.status='active' OR (m.status='invited' AND m.created_at>?)) ORDER BY m.created_at DESC LIMIT 10",id,id,now-180000);
 return {...await tradeSummary(db,id),signedIn:true,me:publicPlayer(me),friends:friends.map(publicPlayer),incoming,outgoing,invites:invites.map(m=>({id:m.id,mode:m.mode,status:m.status,incoming:m.guest_id===id,username:m.host_id===id?m.guest_name:m.host_name}))};
}
function matchView(row,id){const data=JSON.parse(row.data);return {id:row.id,mode:row.mode,status:row.status==='invited'&&Date.now()-row.created_at>180000?'expired':row.status,selfId:id,version:row.version,state:row.status==='invited'?null:data}}
async function getMatch(db,id,user){const row=await first(db,'SELECT * FROM matches WHERE id=?',id);if(!row)fail(404,'Match not found.');if(row.host_id!==user&&row.guest_id!==user)fail(403,'This match belongs to its two participants.');return row}
async function mutateMatch(db,id,user,mutate){
 for(let attempt=0;attempt<7;attempt++){
  const row=await getMatch(db,id,user);if(row.status!=='active')return matchView(row,user);
  const state=JSON.parse(row.data);mutate(state);const status=state.result?'finished':'active',now=Date.now();
  const result=await db.prepare('UPDATE matches SET data=?,version=version+1,status=?,updated_at=? WHERE id=? AND version=?').bind(JSON.stringify(state),status,now,id,row.version).run();
  if(result.meta.changes)return {id,mode:row.mode,status,selfId:user,version:row.version+1,state};
 }
 fail(409,'The match is busy. Reconnecting…');
}
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');
const secret=()=>crypto.randomUUID()+crypto.randomUUID();
async function issueSession(db,id,url){const token=secret(),now=Date.now();await db.prepare('INSERT INTO game_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(await digest(token),id,now+31536000000,now).run();return {'Set-Cookie':'mythlings_session='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000'+(url.protocol==='https:'?'; Secure':'')}}
async function deviceUser(request,db){const token=request.headers.get('cookie')?.match(/(?:^|;\s*)mythlings_session=([^;]+)/)?.[1];if(!token||token.length>100)return null;const session=await first(db,'SELECT user_id FROM game_sessions WHERE token_hash=? AND expires_at>?',await digest(token),Date.now());return session?{userId:session.user_id}:null}
export async function handleSocial(request,db,user){
 try{
  const url=new URL(request.url),path=url.pathname.replace(/^\/api\/social/,'')||'/me';
  if(path==='/clock'&&request.method==='GET')return json({now:Date.now()});
  if(!db)fail(503,'Online play is temporarily unavailable. Your solo game still works.');
  user=await deviceUser(request,db)||user;
  if(!user?.userId&&request.method==='GET'&&path==='/me')return json({signedIn:false});
  if(!user?.userId&&!['/profile','/recover'].includes(path))fail(401,'Choose your username inside the game first.');
  const id=user?.userId||'guest-'+uuid();
  if(request.method==='GET'){
   if(path.startsWith('/cards/'))return json(await cardRequest(db,id,'GET',path));if(path==='/me')return json(await bootstrap(db,id));if(path.startsWith('/trades'))return json(await tradeRequest(db,id,'GET',path));
   const m=path.match(/^\/matches\/([^/]+)$/);if(m)return json(matchView(await getMatch(db,m[1],id),id));
   fail(404,'Not found.');
  }
  if(request.method!=='POST')fail(405,'Method not allowed.');
  if(request.headers.get('origin')!==url.origin)fail(403,'Open this action from EMBERLINGS.');
  const raw=await request.text();if(raw.length>(path==='/trades/sync'||path.startsWith('/cards/')?524288:4096))fail(413,'Request too large.');let body;try{body=JSON.parse(raw||'{}')}catch{fail(400,'Invalid request.')}if(!body||typeof body!=='object'||Array.isArray(body))fail(400,'Invalid request.');
  if(path==='/recover'){
   const name=String(body.username||'').trim().toLowerCase(),code=String(body.code||'').trim();const found=await first(db,'SELECT * FROM players WHERE username_key=?',name);
   if(!found?.recovery_hash||!code||await digest(code)!==found.recovery_hash)fail(403,'Username or recovery code did not match.');
   return json(await bootstrap(db,found.user_id),200,await issueSession(db,found.user_id,url));
  }
  if(path==='/profile'){
   const name=typeof body.username==='string'?body.username.trim():'';if(!/^[A-Za-z0-9_]{3,20}$/.test(name))fail(400,'Use 3–20 letters, numbers or underscores.');
   const existing=await profile(db,id);if(existing){if(existing.username_key!==name.toLowerCase())fail(409,'You already have a username.');return json(await bootstrap(db,id))}
   const loadout=pet(body.kind??0,body.shiny,body.rarity||'Common',body.secret,body.mutation??null),now=Date.now();
   try{await db.prepare('INSERT INTO players(user_id,username,username_key,pet_kind,pet_shiny,pet_rarity,pet_secret,pet_mutation,seen_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,name,name.toLowerCase(),loadout.kind,loadout.shiny?1:0,loadout.rarity,loadout.secret?1:0,loadout.mutation,now,now).run()}catch(error){if(String(error).includes('UNIQUE'))fail(409,'That username is already taken. Try another.');throw error}
   const code=secret();await db.prepare('UPDATE players SET recovery_hash=? WHERE user_id=?').bind(await digest(code),id).run();
   return json({...await bootstrap(db,id),recoveryCode:code},200,await issueSession(db,id,url));
  }
  const me=await profile(db,id);if(!me)fail(409,'Choose your username in Friends first.');if(Date.now()-me.seen_at>30000)await db.prepare('UPDATE players SET seen_at=? WHERE user_id=?').bind(Date.now(),id).run();
  if(path.startsWith('/cards/'))return json(await cardRequest(db,id,'POST',path,body));if(path.startsWith('/trades'))return json(await tradeRequest(db,id,'POST',path,body));
  if(path==='/recovery'){const code=secret();await db.prepare('UPDATE players SET recovery_hash=? WHERE user_id=?').bind(await digest(code),id).run();return json({recoveryCode:code})}
  if(path==='/players/find'){const other=await first(db,'SELECT * FROM players WHERE username_key=?',String(body.username||'').trim().toLowerCase());if(!other)fail(404,'Player not found. Ask them to choose a username first.');if(other.user_id===id)fail(400,'That is your username.');return json({player:publicPlayer(other)})}
  if(path==='/loadout'){
   const loadout=pet(body.kind,body.shiny,body.rarity||'Common',body.secret,body.mutation??null);await db.prepare('UPDATE players SET pet_kind=?,pet_shiny=?,pet_rarity=?,pet_secret=?,pet_mutation=?,seen_at=? WHERE user_id=?').bind(loadout.kind,loadout.shiny?1:0,loadout.rarity,loadout.secret?1:0,loadout.mutation,Date.now(),id).run();return json({ok:true});
  }
  if(path==='/friends/request'){
   const key=typeof body.username==='string'?body.username.trim().toLowerCase():'';if(!/^[a-z0-9_]{3,20}$/.test(key))fail(400,'Enter a valid username.');
   const other=await first(db,'SELECT * FROM players WHERE username_key=?',key);if(!other)fail(404,'Player not found. Ask them to create their username in Friends first.');if(other.user_id===id)fail(400,'That is your own username.');if(await connected(db,id,other.user_id))fail(409,'You are already friends.');
   const reciprocal=await first(db,"SELECT id FROM friend_requests WHERE from_id=? AND to_id=? AND status='pending'",other.user_id,id);if(reciprocal)fail(409,'This player sent you a request. Accept it below.');
   const old=await first(db,'SELECT * FROM friend_requests WHERE from_id=? AND to_id=?',id,other.user_id);if(old?.status==='pending')return json({ok:true,message:'Friend request already sent.'});
   if(old&&Date.now()-old.updated_at<60000)fail(429,'Please wait a minute before sending another request.');
   const pending=await first(db,"SELECT COUNT(*) AS count FROM friend_requests WHERE from_id=? AND status='pending'",id);if(pending.count>=10)fail(429,'You already have ten pending requests.');
   const now=Date.now();await db.prepare("INSERT INTO friend_requests(id,from_id,to_id,status,created_at,updated_at) VALUES(?,?,?,'pending',?,?) ON CONFLICT(from_id,to_id) DO UPDATE SET status='pending',updated_at=excluded.updated_at").bind(uuid(),id,other.user_id,now,now).run();return json({ok:true,message:'Friend request sent. They need to accept.'});
  }
  if(path==='/friends/respond'){
   const r=await first(db,'SELECT * FROM friend_requests WHERE id=? AND to_id=?',body.id,id);if(!r)fail(404,'Friend request not found.');if(r.status!=='pending')return json(await bootstrap(db,id));
   const now=Date.now();if(body.accept===true){const [low,high]=pair(r.from_id,r.to_id);await db.batch([
    db.prepare("INSERT OR IGNORE INTO friendships(id,low_id,high_id,created_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM friend_requests WHERE id=? AND to_id=? AND status='pending')").bind(uuid(),low,high,now,r.id,id),
    db.prepare("UPDATE friend_requests SET status='accepted',updated_at=? WHERE id=? AND to_id=? AND status='pending'").bind(now,r.id,id)
   ])}else await db.prepare("UPDATE friend_requests SET status='declined',updated_at=? WHERE id=? AND to_id=? AND status='pending'").bind(now,r.id,id).run();
   return json(await bootstrap(db,id));
  }
  if(path==='/matches'){
   if(!['duel','coop'].includes(body.mode))fail(400,'Choose a duel or a team battle.');const other=await first(db,'SELECT * FROM players WHERE username_key=?',String(body.username||'').toLowerCase());if(!other||!await connected(db,id,other.user_id))fail(403,'Only accepted friends can invite each other.');
   await expireStale(db,id);await expireStale(db,other.user_id);const active=await first(db,"SELECT id FROM matches WHERE status='active' AND (host_id IN (?,?) OR guest_id IN (?,?))",id,other.user_id,id,other.user_id);if(active)fail(409,'One of you already has an active match. Resume or leave it first.');
   const old=await first(db,"SELECT * FROM matches WHERE host_id=? AND guest_id=? AND mode=? AND status='invited' AND created_at>?",id,other.user_id,body.mode,Date.now()-180000);if(old)return json(matchView(old,id));
   const count=await first(db,"SELECT COUNT(*) AS count FROM matches WHERE host_id=? AND status='invited' AND created_at>?",id,Date.now()-180000);if(count.count>=3)fail(429,'You already have three pending battle invitations.');
   const matchId=uuid(),now=Date.now();await db.prepare("INSERT INTO matches(id,host_id,guest_id,mode,status,data,version,created_at,updated_at) VALUES(?,?,?,?,'invited','{}',0,?,?)").bind(matchId,id,other.user_id,body.mode,now,now).run();return json({id:matchId,mode:body.mode,status:'invited',selfId:id,state:null,version:0});
  }
  const endpoint=path.match(/^\/matches\/([^/]+)\/(join|input|leave)$/);if(endpoint){const matchId=endpoint[1],operation=endpoint[2];
   // mutateMatch performs the participant check and reads the current version itself.
   if(operation==='input'){if(!Number.isSafeInteger(body.seq)||body.seq<1)fail(400,'Invalid input sequence.');return json(await mutateMatch(db,matchId,id,state=>submitInput(state,id,body,Date.now())))}
   const row=await getMatch(db,matchId,id);
   if(operation==='join'){
    if(row.guest_id!==id)fail(403,'Only the invited friend can accept.');if(row.status==='active')return json(matchView(row,id));if(row.status!=='invited'||Date.now()-row.created_at>180000)fail(409,'This invitation has expired or ended.');
    if(!await connected(db,row.host_id,row.guest_id))fail(403,'Accept the friend request first.');
    const active=await first(db,"SELECT id FROM matches WHERE status='active' AND id<>? AND (host_id IN (?,?) OR guest_id IN (?,?))",row.id,row.host_id,id,row.host_id,id);if(active)fail(409,'One of you is already in a match.');
    const [host,guest]=await Promise.all([profile(db,row.host_id),profile(db,row.guest_id)]),now=Date.now(),state=createMatch(row.mode,host,guest,now);
    const result=await db.prepare("UPDATE matches SET data=?,status='active',version=version+1,updated_at=? WHERE id=? AND version=? AND status='invited' AND NOT EXISTS(SELECT 1 FROM matches other WHERE other.id<>? AND other.status='active' AND (other.host_id IN (?,?) OR other.guest_id IN (?,?)))").bind(JSON.stringify(state),now,row.id,row.version,row.id,row.host_id,id,row.host_id,id).run();if(!result.meta.changes){const latest=await getMatch(db,matchId,id);if(latest.status==='active')return json(matchView(latest,id));fail(409,'One of you is already in another match.')}return json({id:matchId,mode:row.mode,status:'active',selfId:id,version:row.version+1,state});
   }
   if(row.status==='invited'){await db.prepare("UPDATE matches SET status=?,version=version+1,updated_at=? WHERE id=? AND version=? AND status='invited'").bind(row.host_id===id?'cancelled':'declined',Date.now(),row.id,row.version).run();return json(matchView(await getMatch(db,matchId,id),id))}
   return json(await mutateMatch(db,matchId,id,state=>leaveMatch(state,id)));
  }
  fail(404,'Not found.');
 }catch(error){if(error instanceof HttpError||error instanceof TradeError||error instanceof CardError)return json({error:error.message},error.status);if(error.message==='Invalid movement frames')return json({error:'Invalid movement frames.'},400);if(error.message==='Invalid mutation')return json({error:'Choose a valid Mythling mutation.'},400);if(error.message==='Invalid rarity')return json({error:'Choose a valid Mythling rarity.'},400);if(error.message==='Invalid Mythling')return json({error:'Choose a valid Mythling.'},400);console.error('EMBERLINGS online API error',error);return json({error:'Online play had a problem. Please try again.'},500)}
}
