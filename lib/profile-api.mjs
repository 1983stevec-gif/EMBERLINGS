// Public player profiles: a small showcase (up to 5 card snapshots), frame, background, pinned badges and a
// few headline numbers. Stored as one JSON text in players.profile. Only the player and their accepted friends
// can read it. Nothing here touches cards, coins or trades: the snapshots are pictures, not the cards themselves.
import { RARITIES, MUTATIONS } from '../public/combat-rules.js';
import { TITLES } from '../public/achievements.js';
import { SHOWCASE_MAX, BADGES_MAX, FRAME_IDS, BACKGROUND_IDS, BADGE_IDS, CARD_BACK_IDS, AVATAR_RING_IDS } from '../public/profile-items.js';

export class ProfileError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new ProfileError(status, message); };
const isInt = (v, lo, hi) => Number.isSafeInteger(v) && v >= lo && v <= hi;
const PROFILE_LIMIT = 2800;

function cleanCard(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) fail(400, 'Each showcase card must be a card.');
  if (!isInt(c.kind, 0, 15)) fail(400, 'Unknown Mythling in the showcase.');
  if (!RARITIES.includes(c.rarity)) fail(400, 'Unknown rarity in the showcase.');
  const mutation = c.mutation ?? null;
  if (mutation !== null && !MUTATIONS.some(m => m.id === mutation)) fail(400, 'Unknown mutation in the showcase.');
  const level = c.level ?? 1, stage = c.stage ?? 0, academyAttack = c.academyAttack ?? 0;
  if (!isInt(level, 1, 100) || !isInt(stage, 0, 2) || !isInt(academyAttack, 0, 5)) fail(400, 'Showcase card level is not valid.');
  for (const k of ['shiny', 'secret', 'fused']) if (c[k] !== undefined && typeof c[k] !== 'boolean') fail(400, 'Showcase card is not valid.');
  if (c.id !== undefined && (typeof c.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(c.id))) fail(400, 'Showcase card is not valid.');
  // Only these fields are kept, so nothing else from the save ever reaches the server copy.
  const out = { kind: c.kind, rarity: c.rarity, level, shiny: !!c.shiny, secret: !!c.secret, mutation };
  if (stage) out.stage = stage; if (academyAttack) out.academyAttack = academyAttack; if (c.fused) out.fused = true; if (c.id) out.id = c.id;
  return out;
}
export function cleanProfile(body) {
  const cards = body.cards ?? [], badges = body.badges ?? [], stats = body.stats ?? {};
  if (!Array.isArray(cards) || cards.length > SHOWCASE_MAX) fail(400, `Pick up to ${SHOWCASE_MAX} cards to show.`);
  if (!Array.isArray(badges) || badges.length > BADGES_MAX) fail(400, `Pin up to ${BADGES_MAX} badges.`);
  if (badges.some(b => !BADGE_IDS.includes(b)) || new Set(badges).size !== badges.length) fail(400, 'Unknown badge.');
  const frame = body.frame ?? 'simple', background = body.background ?? 'dusk';
  if (!FRAME_IDS.includes(frame)) fail(400, 'Unknown frame.');
  if (!BACKGROUND_IDS.includes(background)) fail(400, 'Unknown background.');
  // Cosmetic extras (optional; older games don't send them): a card back, an avatar ring and an avatar card picture.
  const cardBack = body.cardBack ?? 'ember', ring = body.ring ?? 'gold';
  if (!CARD_BACK_IDS.includes(cardBack)) fail(400, 'Unknown card back.');
  if (!AVATAR_RING_IDS.includes(ring)) fail(400, 'Unknown avatar ring.');
  const avatar = body.avatar == null ? null : cleanCard(body.avatar);
  if (!stats || typeof stats !== 'object' || Array.isArray(stats)) fail(400, 'Profile numbers are not valid.');
  const nums = {};
  for (const [k, hi] of [['cards', 1e6], ['species', 16], ['wins', 1e7], ['achievements', BADGE_IDS.length]]) {
    const v = stats[k] ?? 0; if (!isInt(v, 0, hi)) fail(400, 'Profile numbers are not valid.'); nums[k] = v;
  }
  const out = { v: 1, cards: cards.map(cleanCard), frame, background, badges, stats: nums, cardBack, ring };
  if (avatar) { delete avatar.id; out.avatar = avatar; }
  if (JSON.stringify(out).length > PROFILE_LIMIT) fail(413, 'Profile is too large.');
  return out;
}
// players.profile can also hold the private watchOff flag from lib/spectate-api.mjs; it is never shown, and a row that
// only holds that flag has no showcase yet.
function readProfile(text) { try { const p = JSON.parse(text || 'null'); if (!p || typeof p !== 'object') return null; delete p.watchOff; return p.v ? p : null; } catch { return null; } }

export async function saveProfile(db, id, body) {
  const profile = { ...cleanProfile(body), updatedAt: Date.now() };
  try { const text = JSON.stringify(profile); await db.prepare("UPDATE players SET profile=CASE WHEN json_extract(profile,'$.watchOff')=1 THEN json_set(?,'$.watchOff',1) ELSE ? END WHERE user_id=?").bind(text, text, id).run(); /* keeps the watch setting from spectate-api */ }
  catch (error) { console.error('EMBERLINGS profile update unavailable', error); fail(503, 'Profiles are not available online yet.'); }
  return { ok: true, profile };
}

export async function readFriendProfile(db, id, username) {
  const key = String(username || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(key)) fail(400, 'Enter a valid username.');
  let row;
  try { row = await db.prepare('SELECT user_id,username,title,pet_kind,pet_shiny,pet_rarity,pet_secret,pet_mutation,seen_at,profile FROM players WHERE username_key=?').bind(key).first(); }
  catch (error) { console.error('EMBERLINGS profile read unavailable', error); fail(503, 'Profiles are not available online yet.'); }
  if (!row) fail(404, 'Player not found.');
  if (row.user_id !== id) {
    const [low, high] = [id, row.user_id].sort();
    const friends = await db.prepare('SELECT id FROM friendships WHERE low_id=? AND high_id=?').bind(low, high).first();
    if (!friends) fail(403, 'Only friends can see this profile.');
  }
  return {
    username: row.username, self: row.user_id === id, title: TITLES.includes(row.title) ? row.title : null, online: Date.now() - row.seen_at < 60000,
    pet: { kind: row.pet_kind, shiny: !!row.pet_shiny, rarity: row.pet_rarity || 'Common', secret: !!row.pet_secret, mutation: row.pet_mutation || null, level: 12 },
    profile: readProfile(row.profile)
  };
}
