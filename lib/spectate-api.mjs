// Watching a friend's duel (read-only). Accepted friends of either player can see a live online card duel:
// both Active spots and Benches, HP, points, turn and the battle log. Hidden information never leaves the server:
// no hand contents, no deck order, no face-down setup choices, no owned-card ids. Watchers can't send anything to
// a match; the battle endpoints still accept actions only from its two players.
// The "Let friends watch my duels" choice is one flag (watchOff: 1) inside the existing players.profile JSON column
// from 0008, so no new migration is needed. Either player switching it off makes the duel private.
import { RULESET } from '../public/card-engine.js';

export class SpectateError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new SpectateError(status, message); };
const first = (db, sql, ...args) => db.prepare(sql).bind(...args).first();
const LIVE_MS = 120000;       // a duel nobody has touched for 2 minutes is not listed as live
const ENDED_MS = 600000;      // a finished duel stays watchable for 10 minutes so watchers see the result
const HIDDEN_CARD_KEYS = ['ownerId', 'ownedId', 'sourceId'];
const json = (data, status = 200, headers = {}) => new Response(status === 304 ? null : JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

const watchOff = profileText => { try { return JSON.parse(profileText || 'null')?.watchOff === 1; } catch { return false; } };
async function friendOf(db, a, b) { const [low, high] = [a, b].sort(); return !!await first(db, 'SELECT id FROM friendships WHERE low_id=? AND high_id=?', low, high); }

function cleanCard(c) {
  const out = { ...c };
  for (const k of HIDDEN_CARD_KEYS) delete out[k];
  return out;
}
// The watcher's copy of one side: only cards that are face up on the board, plus counts for everything else.
function sideView(p, setup) {
  const inPlay = setup ? [] : [p.active, ...p.bench].filter(Boolean);
  const cards = inPlay.map(id => p.cards.find(c => c.id === id)).filter(Boolean).map(cleanCard);
  return {
    name: p.name, points: p.points, turns: p.turns, ready: !!p.ready,
    active: setup ? null : p.active || null, bench: setup ? [] : [...p.bench], cards,
    benchCount: p.bench.length, handCount: p.hand.length, deckCount: p.drawPile.length, discardCount: p.discard.length,
    energyTypes: p.energyTypes || [], energyZone: p.energyZone || null
  };
}
export function spectatorView(s) {
  const setup = s.phase === 'setup';
  return {
    type: s.type, phase: s.phase, turn: s.turn, turnNumber: s.turnNumber, first: s.first, coin: s.coin, revision: s.revision,
    replacement: s.phase === 'replace' ? s.replacement : null, stadium: s.stadium ? true : null,
    clocks: s.clocks, lastTick: s.lastTick, turnDeadline: s.turnDeadline, setupDeadline: s.setupDeadline,
    lastAttack: s.lastAttack || null, result: s.result || null,
    // The log and events only ever describe public moves (attacks, Trainers played, knockouts), never hand contents.
    log: (s.log || []).slice(-8).map(String), events: (s.events || []).slice(-6).map(e => ({ id: e.id, type: e.type, text: String(e.text || ''), side: e.side ?? null })),
    sides: s.sides.map(p => sideView(p, setup))
  };
}

async function allowsWatching(db, ...ids) {
  for (const id of ids) {
    let row; try { row = await first(db, 'SELECT profile FROM players WHERE user_id=?', id); } catch { row = null; }
    if (row && watchOff(row.profile)) return false;
  }
  return true;
}

// GET /spectate: my own setting plus the live duels my friends are playing that I may watch.
async function liveDuels(db, me) {
  let mine = null; try { mine = await first(db, 'SELECT profile FROM players WHERE user_id=?', me); } catch { mine = null; }
  const friends = (await db.prepare('SELECT CASE WHEN low_id=? THEN high_id ELSE low_id END AS id FROM friendships WHERE low_id=? OR high_id=?').bind(me, me, me).all()).results.map(r => r.id);
  if (!friends.length) return { allowWatch: !watchOff(mine?.profile), live: [] };
  const marks = friends.map(() => '?').join(',');
  const rows = (await db.prepare(`SELECT m.id,m.host_id,m.guest_id,m.version,h.username AS host_name,g.username AS guest_name,h.profile AS host_profile,g.profile AS guest_profile,
    json_extract(m.data,'$.battle.turnNumber') AS turn_number,json_extract(m.data,'$.battle.sides[0].points') AS p0,json_extract(m.data,'$.battle.sides[1].points') AS p1
    FROM matches m JOIN players h ON h.user_id=m.host_id JOIN players g ON g.user_id=m.guest_id
    WHERE m.status='active' AND m.mode='duel' AND m.updated_at>? AND m.host_id<>? AND m.guest_id<>?
    AND json_extract(m.data,'$.battle.type')=? AND (m.host_id IN (${marks}) OR m.guest_id IN (${marks}))
    ORDER BY m.updated_at DESC LIMIT 20`).bind(Date.now() - LIVE_MS, me, me, RULESET, ...friends, ...friends).all()).results;
  const live = rows.filter(r => !watchOff(r.host_profile) && !watchOff(r.guest_profile)).map(r => ({
    id: r.id, players: [r.host_name, r.guest_name], points: [r.p0 || 0, r.p1 || 0], turnNumber: r.turn_number || 0,
    friends: [friends.includes(r.host_id) ? r.host_name : null, friends.includes(r.guest_id) ? r.guest_name : null].filter(Boolean)
  }));
  return { allowWatch: !watchOff(mine?.profile), live };
}

// GET /spectate/<matchId>: a redacted snapshot. Polling-friendly: send If-None-Match (or ?v=<version>) to get a
// 304 / tiny "unchanged" reply when nothing moved.
async function watchMatch(request, db, me, matchId) {
  if (!/^[A-Za-z0-9-]{1,64}$/.test(matchId)) fail(404, 'Battle not found.');
  const head = await first(db, 'SELECT id,host_id,guest_id,mode,status,version,updated_at FROM matches WHERE id=?', matchId);
  if (!head) fail(404, 'Battle not found.');
  if (head.host_id === me || head.guest_id === me) fail(409, 'You are playing in this battle. Open it from Friends to play.');
  if (!await friendOf(db, me, head.host_id) && !await friendOf(db, me, head.guest_id)) fail(403, 'Only friends of the players can watch this duel.');
  if (head.mode !== 'duel') fail(404, 'There is no duel to watch here.');
  if (!await allowsWatching(db, head.host_id, head.guest_id)) fail(403, 'This duel is private.');
  const now = Date.now();
  if (head.status === 'finished' ? now - head.updated_at > ENDED_MS : head.status !== 'active') fail(410, 'This duel has ended.');
  const etag = `W/"spc-${head.version}"`, since = Number(new URL(request.url).searchParams.get('v'));
  if (request.headers.get('if-none-match') === etag) return json(null, 304, { ETag: etag });
  if (Number.isSafeInteger(since) && since === head.version) return json({ id: head.id, version: head.version, unchanged: true, serverNow: now }, 200, { ETag: etag });
  const row = await first(db, 'SELECT data FROM matches WHERE id=?', matchId);
  let data; try { data = JSON.parse(row.data); } catch { data = null; }
  const s = data?.cardBattle ? data.battle : null;
  if (!s || s.type !== RULESET) fail(404, 'There is no duel to watch here.');
  return json({ id: head.id, version: head.version, status: head.status, live: head.status === 'active' && now - head.updated_at < LIVE_MS, serverNow: now, state: spectatorView(s) }, 200, { ETag: etag });
}

export async function spectateGet(request, db, me, path) {
  if (path === '/spectate') return json(await liveDuels(db, me));
  const m = path.match(/^\/spectate\/([^/]+)$/);
  if (m && m[1] !== 'settings') return watchMatch(request, db, me, m[1]);
  fail(404, 'Not found.');
}

// POST /spectate/settings {allowWatch}: the only thing a watcher can send, and it only changes their own flag.
export async function spectatePost(db, me, path, body) {
  if (path !== '/spectate/settings') fail(405, 'Watching is read-only.');
  if (typeof body.allowWatch !== 'boolean') fail(400, 'Choose On or Off.');
  try {
    await db.prepare(body.allowWatch
      ? "UPDATE players SET profile=json_remove(COALESCE(profile,'{}'),'$.watchOff') WHERE user_id=?"
      : "UPDATE players SET profile=json_set(COALESCE(profile,'{}'),'$.watchOff',1) WHERE user_id=?").bind(me).run();
  } catch (error) { console.error('EMBERLINGS watch setting unavailable', error); fail(503, 'This setting is not available online yet.'); }
  return { ok: true, allowWatch: body.allowWatch };
}
