// Friend activity: a small feed of highlights (rare pack pulls, boss quest wins, Mythling level milestones) and
// cheers. Only accepted friends can read a player's highlights or cheer them. There is no free text anywhere:
// events are a fixed type, a card snapshot (a picture, not the card) and a number or two. Nothing here touches
// cards, coins or trades. Needs migration drizzle/0009_activity.sql; until it is applied, reads say "not available".
import { RARITIES, MUTATIONS, rarityRank } from '../public/combat-rules.js';

export class ActivityError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new ActivityError(status, message); };
const isInt = (v, lo, hi) => Number.isSafeInteger(v) && v >= lo && v <= hi;
const DAY = 86400000;
export const ACTIVITY_TYPES = ['rare_pull', 'boss_win', 'level_up'];
export const BOSS_LEVELS = [10, 25, 45, 70, 100];
export const LEVEL_MILESTONES = [25, 50, 75, 100];
export const ACTIVITY_LIMITS = { perDay: 20, keepDays: 30, keepPerPlayer: 100, feed: 30, mine: 20 };
const UNAVAILABLE = "Activity isn't available yet.";

function cleanCard(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) fail(400, 'A highlight needs a card.');
  if (!isInt(c.kind, 0, 15)) fail(400, 'Unknown Mythling.');
  if (!RARITIES.includes(c.rarity)) fail(400, 'Unknown rarity.');
  const mutation = c.mutation ?? null;
  if (mutation !== null && !MUTATIONS.some(m => m.id === mutation)) fail(400, 'Unknown mutation.');
  const level = c.level ?? 1, stage = c.stage ?? 0, academyAttack = c.academyAttack ?? 0;
  if (!isInt(level, 1, 100) || !isInt(stage, 0, 2) || !isInt(academyAttack, 0, 5)) fail(400, 'Card level is not valid.');
  for (const k of ['shiny', 'secret', 'fused']) if (c[k] !== undefined && typeof c[k] !== 'boolean') fail(400, 'Card is not valid.');
  // Only these fields are kept, so nothing else from the save ever reaches the server.
  const out = { kind: c.kind, rarity: c.rarity, level, shiny: !!c.shiny, secret: !!c.secret, mutation };
  if (stage) out.stage = stage; if (academyAttack) out.academyAttack = academyAttack; if (c.fused) out.fused = true;
  return out;
}
// Same idea as public/rare-finds.js: pack-only mutation, Legendary or better, or shiny Mythic or better.
const worthy = c => !!(MUTATIONS.find(m => m.id === c.mutation)?.packOnly || rarityRank(c) >= 4 || (c.shiny && rarityRank(c) >= 3));

export function cleanEvent(body) {
  const type = body.type;
  if (!ACTIVITY_TYPES.includes(type)) fail(400, 'Unknown highlight.');
  const key = body.key;
  if (typeof key !== 'string' || !/^[A-Za-z0-9_:.-]{1,80}$/.test(key)) fail(400, 'Highlight is not valid.');
  const card = body.card === undefined || body.card === null ? null : cleanCard(body.card);
  const data = { card };
  if (type === 'rare_pull') { if (!card || !worthy(card)) fail(400, 'Only rare finds are shared.'); }
  else if (type === 'boss_win') { if (!BOSS_LEVELS.includes(body.level)) fail(400, 'Unknown boss.'); data.level = body.level; }
  else if (type === 'level_up') { if (!card || !LEVEL_MILESTONES.includes(body.level) || card.level < body.level) fail(400, 'Unknown milestone.'); data.level = body.level; }
  return { type, dedupe: type + ':' + key, data };
}

const missing = error => /no such table/i.test(String(error?.message || error));
async function guarded(work, write) {
  try { return await work(); }
  catch (error) {
    if (error instanceof ActivityError) throw error;
    if (missing(error)) { if (write) fail(503, UNAVAILABLE); return { available: false, message: UNAVAILABLE, events: [], mine: [] }; }
    throw error;
  }
}
const friendIds = async (db, id) => (await db.prepare('SELECT CASE WHEN low_id=? THEN high_id ELSE low_id END AS fid FROM friendships WHERE low_id=? OR high_id=?').bind(id, id, id).all()).results.map(r => r.fid);
const parse = text => { try { const v = JSON.parse(text); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };

export async function readActivity(db, id) {
  return guarded(async () => {
    const since = Date.now() - ACTIVITY_LIMITS.keepDays * DAY, friends = await friendIds(db, id);
    let events = [];
    if (friends.length) {
      const marks = friends.map(() => '?').join(',');
      events = (await db.prepare(`SELECT e.id,e.type,e.data,e.created_at,p.username,
        (SELECT COUNT(*) FROM activity_cheers c WHERE c.event_id=e.id) AS cheers,
        EXISTS(SELECT 1 FROM activity_cheers c WHERE c.event_id=e.id AND c.player_id=?) AS cheered
        FROM activity_events e JOIN players p ON p.user_id=e.player_id
        WHERE e.player_id IN (${marks}) AND e.created_at>? ORDER BY e.created_at DESC,e.rowid DESC LIMIT ?`).bind(id, ...friends, since, ACTIVITY_LIMITS.feed).all()).results;
    }
    const mine = (await db.prepare(`SELECT e.id,e.type,e.data,e.created_at,(SELECT COUNT(*) FROM activity_cheers c WHERE c.event_id=e.id) AS cheers
      FROM activity_events e WHERE e.player_id=? AND e.created_at>? ORDER BY e.created_at DESC,e.rowid DESC LIMIT ?`).bind(id, since, ACTIVITY_LIMITS.mine).all()).results;
    const names = {};
    if (mine.some(e => e.cheers)) {
      const rows = (await db.prepare(`SELECT c.event_id,p.username FROM activity_cheers c JOIN activity_events e ON e.id=c.event_id JOIN players p ON p.user_id=c.player_id
        WHERE e.player_id=? AND e.created_at>? ORDER BY c.created_at DESC LIMIT 200`).bind(id, since).all()).results;
      for (const r of rows) { const list = (names[r.event_id] ||= []); if (list.length < 3) list.push(r.username); }
    }
    const view = e => { const d = parse(e.data); return { id: e.id, type: e.type, at: e.created_at, card: d.card || null, level: d.level ?? null, cheers: e.cheers }; };
    return {
      available: true, friends: friends.length,
      events: events.map(e => ({ ...view(e), username: e.username, cheered: !!e.cheered })),
      mine: mine.map(e => ({ ...view(e), cheerers: names[e.id] || [] }))
    };
  });
}

export async function postActivity(db, id, body) {
  const ev = cleanEvent(body);
  return guarded(async () => {
    const now = Date.now();
    const dupe = await db.prepare('SELECT id FROM activity_events WHERE player_id=? AND dedupe=?').bind(id, ev.dedupe).first();
    if (dupe) return { ok: true, id: dupe.id, duplicate: true };
    const today = await db.prepare('SELECT COUNT(*) AS n FROM activity_events WHERE player_id=? AND created_at>?').bind(id, now - DAY).first();
    if (today.n >= ACTIVITY_LIMITS.perDay) fail(429, 'That is plenty of highlights for today.');
    const eventId = crypto.randomUUID();
    await db.prepare('INSERT OR IGNORE INTO activity_events(id,player_id,type,dedupe,data,created_at) VALUES(?,?,?,?,?,?)').bind(eventId, id, ev.type, ev.dedupe, JSON.stringify(ev.data), now).run();
    // Keep rows small: drop this player's events older than 30 days or beyond the newest 100, with their cheers.
    const old = `SELECT id FROM activity_events WHERE player_id=?1 AND (created_at<?2 OR id NOT IN (SELECT id FROM activity_events WHERE player_id=?1 ORDER BY created_at DESC LIMIT ?3))`;
    await db.batch([
      db.prepare(`DELETE FROM activity_cheers WHERE event_id IN (${old})`).bind(id, now - ACTIVITY_LIMITS.keepDays * DAY, ACTIVITY_LIMITS.keepPerPlayer),
      db.prepare(`DELETE FROM activity_events WHERE id IN (${old})`).bind(id, now - ACTIVITY_LIMITS.keepDays * DAY, ACTIVITY_LIMITS.keepPerPlayer)
    ]);
    return { ok: true, id: eventId };
  }, true);
}

export async function cheerActivity(db, id, eventId) {
  if (!/^[0-9a-f-]{36}$/.test(eventId)) fail(404, 'Highlight not found.');
  return guarded(async () => {
    const ev = await db.prepare('SELECT id,player_id FROM activity_events WHERE id=?').bind(eventId).first();
    if (!ev) fail(404, 'Highlight not found.');
    if (ev.player_id === id) fail(400, 'You cannot cheer your own highlight.');
    const [low, high] = [id, ev.player_id].sort();
    if (!await db.prepare('SELECT id FROM friendships WHERE low_id=? AND high_id=?').bind(low, high).first()) fail(403, 'Only friends can cheer.');
    const r = await db.prepare('INSERT OR IGNORE INTO activity_cheers(event_id,player_id,created_at) VALUES(?,?,?)').bind(eventId, id, Date.now()).run();
    const count = await db.prepare('SELECT COUNT(*) AS n FROM activity_cheers WHERE event_id=?').bind(eventId).first();
    return { ok: true, already: !r.meta.changes, cheers: count.n };
  }, true);
}

// Turning sharing off removes the highlights already shared (and their cheers).
export async function clearActivity(db, id) {
  return guarded(async () => {
    await db.batch([
      db.prepare('DELETE FROM activity_cheers WHERE event_id IN (SELECT id FROM activity_events WHERE player_id=?)').bind(id),
      db.prepare('DELETE FROM activity_events WHERE player_id=?').bind(id)
    ]);
    return { ok: true };
  }, true);
}

export async function activityRequest(db, id, path, body) {
  if (path === '/activity') return postActivity(db, id, body);
  if (path === '/activity/clear') return clearActivity(db, id);
  const m = path.match(/^\/activity\/([^/]{1,64})\/cheer$/); if (m) return cheerActivity(db, id, m[1]);
  fail(404, 'Not found.');
}
