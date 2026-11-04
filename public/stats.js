// EMBERLINGS "My Stats": personal statistics and history (packs, battles, coins). Purely informational.
// From now on it records, additively and size-capped, under state.ember.stats:
//   packs:   [[packId, timeSec, free(0/1), cardCode x5], ...]   last PACK_CAP packs
//   battles: [[mode, result, timeSec, level, "kind.kind", biggestHit, hitKind], ...]   last BATTLE_CAP battles
//   agg:     lifetime running totals, so the caps never lose a count
// Older history (before recording began) comes from what the save already has: packCount, cards' sourcePack,
// cleared quests, online wins, fusions and applied trades. Rewards, odds and battles are never changed.
import { RARITIES, MUTATIONS, PACK_MUTATION, rarityRank } from './combat-rules.js';

export const PACK_CAP = 500, BATTLE_CAP = 300, KEY_CAP = 40;
export const MYTHIC_RANK = 3, LEGEND_RANK = 4;
export const MODES = { q: 'Quests', b: 'Bosses', f: 'Friend duels' };
const r3 = x => Math.round(x * 1000) / 1000;
const sec = ms => Math.floor(ms / 1000);

/* ------------------------------------------------------------ Pure maths (also used by tests/stats.mjs) */
// One pulled card as a small number: kind (5 bits) | rarity rank (3) | mutation index + 1 (4) | shiny (1).
export function encodeCard(c) {
  const kind = Math.max(0, Math.min(31, c?.kind | 0)), rank = rarityRank(c);
  const mut = MUTATIONS.findIndex(m => m.id === c?.mutation) + 1;
  return kind | rank << 5 | mut << 8 | (c?.shiny ? 1 : 0) << 12;
}
export function decodeCard(n) { return { kind: n & 31, rank: (n >> 5) & 7, mut: ((n >> 8) & 15) - 1, shiny: !!((n >> 12) & 1) }; }
export const pullScore = d => d.rank * 100 + (d.mut + 1) * 6 + (d.shiny ? 3 : 0);

const freshAgg = () => ({
  packs: {}, cards: 0, rar: [0, 0, 0, 0, 0, 0, 0], exp: [0, 0, 0, 0, 0, 0, 0],
  shiny: 0, eShiny: 0, secret: 0, eSecret: 0, mut: 0, eMut: 0, leg: 0, eLeg: 0, dry: 0, dryBest: 0, best: null,
  battles: { q: [0, 0, 0], b: [0, 0, 0], f: [0, 0, 0] }, streak: 0, bestStreak: 0, use: {}, hit: null,
  vault: 0, battleCoins: 0, dailyCoins: 0
});

// Creates the stats block when missing and repairs any missing field. Never clears existing data.
export function ensureStats(st, now = Date.now()) {
  if (!st.ember || typeof st.ember !== 'object') st.ember = {};
  let s = st.ember.stats;
  if (!s || typeof s !== 'object') s = st.ember.stats = { v: 1, since: now, base: { packCount: st.packCount || 0 } };
  if (!Number.isFinite(s.since)) s.since = now;
  if (!s.base || typeof s.base !== 'object') s.base = { packCount: st.packCount || 0 };
  for (const k of ['packs', 'battles', 'keys']) if (!Array.isArray(s[k])) s[k] = [];
  const fresh = freshAgg();
  if (!s.agg || typeof s.agg !== 'object') s.agg = fresh;
  for (const [k, v] of Object.entries(fresh)) if (s.agg[k] === undefined || (Array.isArray(v) && !Array.isArray(s.agg[k]))) s.agg[k] = v;
  for (const m of Object.keys(MODES)) if (!Array.isArray(s.agg.battles[m])) s.agg.battles[m] = [0, 0, 0];
  return s;
}
function useKey(s, key) { if (s.keys.includes(key)) return false; s.keys.push(key); if (s.keys.length > KEY_CAP) s.keys.splice(0, s.keys.length - KEY_CAP); return true; }

// pack: a packCatalog entry; tier: its index in the catalog (for the mutation odds). Free (reward) packs cost nothing and roll no mutation.
export function recordPack(s, pack, tier, cards, { free = false, now = Date.now(), key } = {}) {
  if (!pack || !Array.isArray(cards) || !cards.length) return false;
  if (key && !useKey(s, key)) return false;
  const a = s.agg, t = sec(now), codes = cards.map(encodeCard), pr = Math.max(0, RARITIES.indexOf(pack.rarity));
  s.packs.push([pack.id, t, free ? 1 : 0, ...codes]);
  if (s.packs.length > PACK_CAP) s.packs.splice(0, s.packs.length - PACK_CAP);
  const row = a.packs[pack.id] = Array.isArray(a.packs[pack.id]) ? a.packs[pack.id] : [0, 0, 0];
  row[0]++; if (free) row[1]++; else row[2] += pack.cost || 0;
  const mutChance = free ? 0 : (PACK_MUTATION[tier]?.chance || 0), secret = pack.secret || 0;
  for (const code of codes) {
    const d = decodeCard(code);
    a.cards++; a.rar[d.rank]++;
    a.exp[pr] = r3(a.exp[pr] + 1 - secret); a.exp[6] = r3(a.exp[6] + secret);
    a.shiny += d.shiny ? 1 : 0; a.eShiny = r3(a.eShiny + (pack.shiny || 0));
    a.secret += d.rank === 6 ? 1 : 0; a.eSecret = r3(a.eSecret + secret);
    a.mut += d.mut >= 0 ? 1 : 0; a.eMut = r3(a.eMut + mutChance);
    a.leg += d.rank >= LEGEND_RANK ? 1 : 0; a.eLeg = r3(a.eLeg + (pr >= LEGEND_RANK ? 1 : secret));
    if (d.rank >= MYTHIC_RANK) a.dry = 0; else { a.dry++; a.dryBest = Math.max(a.dryBest, a.dry); }
    if (!a.best || pullScore(d) > pullScore(decodeCard(a.best[0]))) a.best = [code, pack.id, t];
  }
  return true;
}

// b = { mode:'q'|'b'|'f', result:'W'|'L'|'D', level, kinds:[species], hit:{dmg,kind}|null, coins, key, now }
export function recordBattle(s, b) {
  if (!b || !MODES[b.mode] || !['W', 'L', 'D'].includes(b.result)) return false;
  if (b.key && !useKey(s, b.key)) return false;
  const a = s.agg, t = sec(b.now || Date.now()), kinds = [...new Set((b.kinds || []).filter(Number.isInteger))].slice(0, 20);
  const dmg = Math.max(0, Math.round(Number(b.hit?.dmg) || 0)), hk = Number.isInteger(b.hit?.kind) ? b.hit.kind : -1;
  s.battles.push([b.mode, b.result, t, b.level | 0, kinds.join('.'), dmg, hk]);
  if (s.battles.length > BATTLE_CAP) s.battles.splice(0, s.battles.length - BATTLE_CAP);
  a.battles[b.mode]['WLD'.indexOf(b.result)]++;
  if (b.result === 'W') { a.streak++; a.bestStreak = Math.max(a.bestStreak, a.streak); } else if (b.result === 'L') a.streak = 0;
  for (const k of kinds) a.use[k] = (a.use[k] || 0) + 1;
  if (dmg > 0 && (!a.hit || dmg > a.hit[0])) a.hit = [dmg, hk, t, b.mode, b.level | 0];
  a.battleCoins += Math.max(0, Math.round(Number(b.coins) || 0));
  return true;
}

export function luckVerdict(ratio, expected) {
  if (!(expected >= 0.5)) return { id: 'early', text: 'Too early to tell' };
  if (ratio >= 1.25) return { id: 'vlucky', text: 'Very lucky!' };
  if (ratio >= 1.05) return { id: 'lucky', text: 'Lucky' };
  if (ratio > 0.95) return { id: 'even', text: 'Right on the odds' };
  if (ratio >= 0.75) return { id: 'unlucky', text: 'A little unlucky' };
  return { id: 'vunlucky', text: 'Unlucky so far' };
}
// The luck meter: specials you pulled (shiny, secret, mutation) against what the packs' real odds expect.
export function luck(a) {
  const rows = [
    { id: 'leg', label: 'Legendary or better', got: a.leg, exp: a.eLeg },
    { id: 'shiny', label: 'Shiny', got: a.shiny, exp: a.eShiny },
    { id: 'secret', label: 'Secret', got: a.secret, exp: a.eSecret },
    { id: 'mut', label: 'Mutation', got: a.mut, exp: a.eMut }
  ];
  const got = a.secret + a.mut + a.shiny, exp = a.eSecret + a.eMut + a.eShiny;
  const ratio = exp > 0 ? got / exp : 0;
  return { rows, got, exp, ratio, verdict: luckVerdict(ratio, exp) };
}
export function battleTotals(a) {
  const t = [0, 0, 0]; for (const m of Object.keys(MODES)) a.battles[m].forEach((v, i) => t[i] += v);
  const played = t[0] + t[1] + t[2];
  return { wins: t[0], losses: t[1], draws: t[2], played, rate: played ? t[0] / played : 0 };
}
export function mostUsed(a, n = 5) { return Object.entries(a.use).map(([k, v]) => ({ kind: +k, n: v })).sort((x, y) => y.n - x.n || x.kind - y.kind).slice(0, n); }
export function favouriteElement(a, elementOf) {
  const by = {}; for (const [k, v] of Object.entries(a.use)) { const e = elementOf(+k); if (e) by[e] = (by[e] || 0) + v; }
  const best = Object.entries(by).sort((x, y) => y[1] - x[1])[0];
  return best ? { element: best[0], n: best[1] } : null;
}
export const statsSize = s => JSON.stringify(s).length;

/* ------------------------------------------------------------ Browser side */
const B = globalThis.window?.EmberBridge;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');
const pct = (v, d = 0) => (Number.isFinite(v) ? (v * 100).toFixed(d) : '0') + '%';
const day = t => new Date(t * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const RARITY_COLORS = ['#bdb5a3', '#7fd28a', '#6fb4ff', '#c58cff', '#ffb84d', '#8ff0ff', '#ff7ad9'];
const RES = { W: 'Win', L: 'Loss', D: 'Draw' };
const catalog = () => { try { return B.packCatalog() || []; } catch { return []; } };
const spName = k => B.species[k]?.name || 'Mythling';
const elementOf = k => B.species[k]?.element || null;

function stats() { return ensureStats(B.state); }
function persist() { try { B.save(); } catch { /* ignore */ } }

// --- Packs: record the pending pack the first time it is seen (frame, reveal or summary).
let snap = null; // { st, tokens, coins } from the last frame, to tell a free reward pack from a bought one
function takeSnap() { const st = B.state; snap = { st, tokens: (st.rewardPacks || []).length, coins: st.coins || 0 }; }
function capturePack(list) {
  const st = B.state, pend = st.pendingPack;
  let cards = null, packId = null, key = null;
  if (pend && Array.isArray(pend.ids) && pend.ids.length) {
    cards = pend.ids.map(id => (st.owned || []).find(c => c.id === id)).filter(Boolean); packId = pend.packId; key = 'p:' + String(pend.ids[0]).slice(0, 12);
  } else if (Array.isArray(list) && list.length) { cards = list; packId = list[0]?.sourcePack; key = 'p:' + String(list[0]?.id).slice(0, 12); }
  if (!cards?.length) return;
  const cat = catalog(), tier = cat.findIndex(p => p.id === packId); if (tier < 0) return;
  const s = stats(); if (s.keys.includes(key)) return;
  const p = cat[tier];
  const free = !!(snap && snap.st === st && (st.rewardPacks || []).length < snap.tokens && (snap.coins - (st.coins || 0)) < p.cost);
  if (recordPack(s, p, tier, cards, { free, key })) persist();
}

// --- Battles: watch the match (read-only, like highlights.js) for the Mythlings you fielded and your biggest hit.
let cur = null, held = null, lastOnline = 0;
function observe(match, side) {
  if (!match?.sides || match.sides.length < 2) return;
  const sig = match.sides.map(s => s.name).join('|');
  if (!cur || cur.sig !== sig || (match.revision ?? 0) < cur.rev) cur = { sig, side, rev: -1, kinds: new Set(), deck: new Set(), hit: null, prevKey: null, prevActive: null, started: false };
  cur.side = side; cur.rev = match.revision ?? cur.rev;
  const me = match.sides[side]; if (!me) return;
  const card = id => me.cards?.find(c => c.id === id);
  for (const c of me.cards || []) if (c.cardType !== 'trainer' && Number.isInteger(c.kind)) cur.deck.add(c.kind);
  for (const id of [me.active, ...(me.bench || [])]) { const c = card(id); if (c && Number.isInteger(c.kind)) cur.kinds.add(c.kind); }
  const la = match.lastAttack, key = la ? [la.side, la.move, la.damage, la.at].join(':') : '';
  if (cur.started && key && key !== cur.prevKey && la.side === side) {
    const by = card(cur.prevActive) || card(me.active), dmg = Number(la.damage) || 0;
    if (dmg > 0 && (!cur.hit || dmg > cur.hit.dmg)) cur.hit = { dmg, kind: by?.kind };
  }
  cur.started = true; cur.prevKey = key; cur.prevActive = me.active;
}
function onResult(r) {
  try {
    const fin = held?.match;
    if (cur && fin?.result && fin.sides?.map(s => s.name).join('|') === cur.sig) observe(fin, cur.side);
    const mode = r.online ? 'f' : (B.bosses?.[r.level] ? 'b' : 'q');
    if (!r.online && !r.level) return;
    const now = Date.now();
    if (r.online) { if (now - lastOnline < 5000) return; lastOnline = now; }
    const kinds = cur ? [...(cur.kinds.size ? cur.kinds : cur.deck)] : [];
    const ok = recordBattle(stats(), { mode, result: r.draw ? 'D' : r.victory ? 'W' : 'L', level: r.level || 0, kinds, hit: cur?.hit || null,
      coins: r.victory ? r.rewards?.coins || 0 : 0, key: r.id ? 'b:' + String(r.id).slice(0, 12) : null, now });
    if (ok) persist();
  } catch (err) { console.warn('stats', err); }
  finally { cur = null; held = null; }
}

// --- Daily rewards coins: spot new claims in state.daily (daily.js grants them; we only count them).
let dsnap = null;
async function dailyDefs() { try { const m = await import('./daily.js'); return { STREAK: m.STREAK, QUESTS: m.QUESTS }; } catch { return null; } }
let defs = null;
function readDaily(st) { const d = st.daily || {}; return { st, day: d.day, lastClaim: d.lastClaim, streak: d.streak || 0, claimed: (d.quests || []).filter(q => q.claimed).map(q => q.id) }; }
function checkDaily() {
  if (!defs) return;
  const st = B.state, now = readDaily(st);
  if (!dsnap || dsnap.st !== st) { dsnap = now; return; }
  let coins = 0;
  if (now.lastClaim && now.lastClaim !== dsnap.lastClaim) coins += defs.STREAK[now.streak - 1]?.coins || 0;
  if (now.day === dsnap.day) for (const id of now.claimed) if (!dsnap.claimed.includes(id)) coins += defs.QUESTS.find(q => q.id === id)?.coins || 0;
  dsnap = now;
  if (coins > 0) { stats().agg.dailyCoins += coins; persist(); }
}

/* ------------------------------------------------------------ Charts (inline SVG / CSS, always with text) */
function barRow(label, value, max, text, color = 'var(--st-bar)', extra = '') {
  const w = max > 0 ? Math.max(value > 0 ? 2 : 0, Math.round(value / max * 100)) : 0;
  return `<li class="stBarRow"${extra}><span class="stBarLbl">${label}</span><span class="stBarTrack" aria-hidden="true"><i style="width:${w}%;background:${color}"></i></span><b class="stBarVal">${text}</b></li>`;
}
function gauge(ratio, verdict) {
  const v = Math.max(0, Math.min(2, ratio)), cx = 110, cy = 104, R = 86;
  const pt = (x, r = R) => { const a = Math.PI * (1 - x / 2); return [cx + r * Math.cos(a), cy - r * Math.sin(a)].map(n => n.toFixed(1)); };
  const arc = (x0, x1, col) => { const [a, b] = pt(x0), [c, d] = pt(x1); return `<path d="M${a} ${b} A${R} ${R} 0 0 1 ${c} ${d}" stroke="${col}" stroke-width="16" fill="none"/>`; };
  const [nx, ny] = pt(v, R - 22);
  return `<svg class="stGauge" viewBox="0 0 220 128" role="img" aria-label="Luck meter: ${verdict.text}, ${pct(ratio)} of the expected special pulls">
   ${arc(0, 0.94, '#b0574e')}${arc(0.96, 1.04, '#e9b75a')}${arc(1.06, 2, '#4fae6c')}
   <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="#f6e7c4" stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="8" fill="#f6e7c4"/>
   <text x="18" y="124" class="stGT">Unlucky</text><text x="202" y="124" text-anchor="end" class="stGT">Lucky</text></svg>`;
}
function donut(t) {
  const r = 46, C = 2 * Math.PI * r, parts = [[t.wins, '#58b874', 'Wins'], [t.losses, '#d0675c', 'Losses'], [t.draws, '#9a917e', 'Draws']];
  let off = 0;
  const segs = parts.map(([n, col, name]) => { if (!n) return ''; const len = n / t.played * C, gap = t.played > n ? 2 : 0; const s = `<circle r="${r}" cx="60" cy="60" fill="none" stroke="${col}" stroke-width="16" stroke-dasharray="${Math.max(0, len - gap).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 60 60)"><title>${name}: ${n}</title></circle>`; off += len; return s; }).join('');
  return `<svg class="stDonut" viewBox="0 0 120 120" role="img" aria-label="${t.wins} wins, ${t.losses} losses, ${t.draws} draws. Win rate ${pct(t.rate)}"><circle r="${r}" cx="60" cy="60" fill="none" stroke="#262b35" stroke-width="16"/>${segs}<text x="60" y="60" text-anchor="middle" class="stDT">${pct(t.rate)}</text><text x="60" y="78" text-anchor="middle" class="stDS">win rate</text></svg>`;
}
function form(list) {
  if (!list.length) return '';
  const w = 12, gap = 4, H = 44, mid = 22;
  const bars = list.map((b, i) => { const x = i * (w + gap), res = b[1]; const y = res === 'W' ? 4 : res === 'L' ? mid + 2 : mid - 3, h = res === 'D' ? 6 : mid - 6; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${res === 'W' ? '#58b874' : res === 'L' ? '#d0675c' : '#9a917e'}"><title>${RES[res]} · ${MODES[b[0]]}${b[3] ? ' ' + b[3] : ''} · ${day(b[2])}</title></rect>`; }).join('');
  const W = list.length * (w + gap) - gap, wins = list.filter(b => b[1] === 'W').length, losses = list.filter(b => b[1] === 'L').length;
  return `<figure class="stForm"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Last ${list.length} battles: ${wins} wins, ${losses} losses"><line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="#3c3220"/>${bars}</svg><figcaption>Last ${list.length}: <b>${wins} W</b> · <b>${losses} L</b>${list.length - wins - losses ? ` · ${list.length - wins - losses} D` : ''} <small>(oldest → newest, wins up, losses down)</small></figcaption></figure>`;
}
const pic = (kind, extra = {}) => `<span class="stPic" aria-hidden="true">${B.art({ kind, level: 1, rarity: 'Common', ...extra })}</span>`;
function chip(code) {
  const d = decodeCard(code), m = MUTATIONS[d.mut];
  const label = `${spName(d.kind)}, ${RARITIES[d.rank]}${m ? ', ' + m.name + ' mutation' : ''}${d.shiny ? ', shiny' : ''}`;
  return `<li class="stChip" style="--rc:${RARITY_COLORS[d.rank]}" title="${esc(label)}"><span class="stChipR" aria-hidden="true">${RARITIES[d.rank].slice(0, d.rank === 5 ? 2 : 1)}</span><span class="stChipN" aria-hidden="true">${esc(spName(d.kind))}</span>${m ? `<span class="stChipM" aria-hidden="true" style="color:${m.color}">${m.icon}</span>` : ''}${d.shiny ? '<span aria-hidden="true">✨</span>' : ''}<span class="stSr">${esc(label)}</span></li>`;
}
const empty = (text, go, btn) => `<div class="stEmpty"><p>${text}</p>${go ? `<button type="button" class="button gold" data-go="${go}">${btn}</button>` : ''}</div>`;

/* ------------------------------------------------------------ Page */
function render() {
  const t0 = performance.now(), st = B.state, s = stats(), a = s.agg, cat = catalog(), e = st.ember || {};
  const since = day(sec(s.since));
  const packTotal = Object.values(a.packs).reduce((n, r) => n + r[0], 0), spent = Object.values(a.packs).reduce((n, r) => n + r[2], 0);
  const before = Math.max(0, (st.packCount || 0) - packTotal);
  const bt = battleTotals(a), lk = luck(a);
  const fusions = e.fusions || 0, trades = Math.max((st.appliedTrades || []).length, (st.tradeHistory || []).length);
  const tile = (icon, label, value, note = '') => `<div class="stTile"><span aria-hidden="true">${icon}</span><b>${value}</b><small>${label}</small>${note ? `<em>${note}</em>` : ''}</div>`;

  // Packs
  let packsHTML;
  if (!packTotal) packsHTML = empty(`Open a pack and your pack history starts here: what you pulled, how lucky you were and your best pull ever.${before ? ` (You opened ${fmt(before)} pack${before > 1 ? 's' : ''} before records began.)` : ''}`, 'packs', '🎁 Open a pack');
  else {
    const rows = cat.filter(p => a.packs[p.id]), maxN = Math.max(...rows.map(p => a.packs[p.id][0]));
    const byType = rows.map(p => { const r = a.packs[p.id]; return barRow(`${p.icon} ${esc(p.name)}`, r[0], maxN, `${fmt(r[0])}${r[1] ? ` <small>(${r[1]} free)</small>` : ''}`, 'linear-gradient(90deg,#c98a2c,#ffd27a)'); }).join('');
    const maxPct = Math.max(...a.rar.map(v => v / a.cards), ...a.exp.map(v => v / a.cards), 0.01);
    const rar = RARITIES.map((name, i) => {
      const you = a.rar[i] / a.cards, odds = a.exp[i] / a.cards; if (!a.rar[i] && odds < 0.0005) return '';
      return `<li class="stPair"><span class="stBarLbl" style="--rc:${RARITY_COLORS[i]}"><i class="stDot" aria-hidden="true"></i>${name}</span>
        <span class="stPairBars" aria-hidden="true"><span class="stBarTrack"><i style="width:${Math.round(you / maxPct * 100)}%;background:${RARITY_COLORS[i]}"></i></span><span class="stBarTrack stOdds"><i style="width:${Math.round(odds / maxPct * 100)}%"></i></span></span>
        <b class="stBarVal">${pct(you, 1)} <small>odds ${pct(odds, 1)}</small></b></li>`;
    }).join('');
    const lrows = lk.rows.map(r => { const max = Math.max(r.got, r.exp, 1); return `<li class="stLuckRow"><span class="stBarLbl">${r.label}</span><span class="stBarTrack" aria-hidden="true"><i style="width:${r.got / max * 100}%"></i><u style="left:${r.exp / max * 100}%"></u></span><b class="stBarVal">${fmt(r.got)} <small>expected ${r.exp < 10 ? r.exp.toFixed(1) : fmt(r.exp)}</small></b></li>`; }).join('');
    const best = a.best ? decodeCard(a.best[0]) : null, bp = best && cat.find(p => p.id === a.best[1]), bm = best && MUTATIONS[best.mut];
    const recent = s.packs.slice(-12).reverse().map(r => { const p = cat.find(x => x.id === r[0]); return `<li class="stPack"><div class="stPackHead"><b>${p ? p.icon + ' ' + esc(p.name) : esc(r[0])}</b><small>${day(r[1])}${r[2] ? ' · free' : p ? ` · 🪙 ${fmt(p.cost)}` : ''}</small></div><ul class="stChips">${r.slice(3).map(chip).join('')}</ul></li>`; }).join('');
    packsHTML = `<div class="stGrid">
     <section class="stCard"><h3>Packs opened by type</h3><ul class="stBars">${byType}</ul><p class="stNote">🪙 ${fmt(spent)} coins spent on packs since ${since}.${before ? ` ${fmt(before)} more pack${before > 1 ? 's' : ''} opened before records began.` : ''}</p></section>
     <section class="stCard stLuck"><h3>Luck meter</h3><div class="stLuckTop">${gauge(lk.ratio, lk.verdict)}<div><b class="stVerdict stV-${lk.verdict.id}">${lk.verdict.text}</b><p>${lk.exp >= 0.5 ? `You pulled <b>${fmt(lk.got)}</b> specials (shiny, secret, mutation). The packs' real odds expect about <b>${lk.exp.toFixed(1)}</b>: that's <b>${pct(lk.ratio)}</b>.` : 'Open a few more packs to see how your luck compares with the real odds.'}</p></div></div>
      <ul class="stBars">${lrows}</ul><p class="stNote"><span class="stKey stKeyBar" aria-hidden="true"></span> you <span class="stKey stKeyTick" aria-hidden="true"></span> expected from the pack odds</p></section>
     <section class="stCard"><h3>Your pulls by rarity vs the odds</h3><ul class="stBars">${rar}</ul><p class="stNote"><span class="stKey stKeyYou" aria-hidden="true"></span> your pulls <span class="stKey stKeyOdds" aria-hidden="true"></span> pack odds · ${fmt(a.cards)} cards pulled</p></section>
     <section class="stCard stBest"><h3>Best pull ever</h3>${best ? `<div class="stBestRow">${pic(best.kind, { shiny: best.shiny })}<div><b>${esc(spName(best.kind))}</b><span class="stRar" style="--rc:${RARITY_COLORS[best.rank]}">${RARITIES[best.rank]}</span>${bm ? ` <span class="stRar" style="--rc:${bm.color}">${bm.icon} ${bm.name}</span>` : ''}${best.shiny ? ' <span class="stRar" style="--rc:#ffe47e">✨ Shiny</span>' : ''}<small>${bp ? esc(bp.icon + ' ' + bp.name) + ' · ' : ''}${day(a.best[2])}</small></div></div>` : ''}
      <div class="stDry"><div><b>${fmt(a.dryBest)}</b><small>longest dry streak<br>(pulls without Mythic or better)</small></div><div><b>${fmt(a.dry)}</b><small>pulls since your<br>last Mythic or better</small></div></div></section>
     <section class="stCard stWide"><h3>Recent packs</h3><ol class="stPacks">${recent}</ol>${s.packs.length > 12 ? `<p class="stNote">Showing the latest 12 of ${fmt(s.packs.length)} saved packs.</p>` : ''}</section></div>`;
  }

  // Battles
  let battlesHTML;
  const oldQuests = (st.cleared || []).length, oldDuels = e.onlineWins || 0;
  if (!bt.played) battlesHTML = empty(`Win or lose a battle and your record starts here: wins by mode, streaks, your favourite Mythlings and your biggest hit.${oldQuests || oldDuels ? ` So far you've cleared ${fmt(oldQuests)} quest${oldQuests === 1 ? '' : 's'}${oldDuels ? ` and won ${fmt(oldDuels)} friend duel${oldDuels === 1 ? '' : 's'}` : ''}.` : ''}`, 'map', '🗺️ Go to the World Map');
  else {
    const modes = Object.entries(MODES).map(([m, name]) => { const [w, l, d] = a.battles[m], n = w + l + d; return `<tr><th scope="row">${name}</th><td>${fmt(w)}</td><td>${fmt(l)}</td><td>${fmt(d)}</td><td><span class="stMini" aria-hidden="true"><i style="width:${n ? w / n * 100 : 0}%"></i></span>${n ? pct(w / n) : '–'}</td></tr>`; }).join('');
    const used = mostUsed(a), maxU = used[0]?.n || 1, fav = favouriteElement(a, elementOf), hit = a.hit;
    battlesHTML = `<div class="stGrid">
     <section class="stCard"><h3>Battle record</h3><div class="stRecord">${donut(bt)}<ul class="stLegend"><li><i style="background:#58b874"></i>${fmt(bt.wins)} win${bt.wins === 1 ? '' : 's'}</li><li><i style="background:#d0675c"></i>${fmt(bt.losses)} loss${bt.losses === 1 ? '' : 'es'}</li>${bt.draws ? `<li><i style="background:#9a917e"></i>${fmt(bt.draws)} draw${bt.draws === 1 ? '' : 's'}</li>` : ''}</ul></div>
      <table class="stTable"><caption class="stSr">Wins, losses and draws by mode</caption><thead><tr><th scope="col">Mode</th><th scope="col">W</th><th scope="col">L</th><th scope="col">D</th><th scope="col">Win rate</th></tr></thead><tbody>${modes}</tbody></table></section>
     <section class="stCard"><h3>Streaks &amp; form</h3><div class="stDry"><div><b>${fmt(a.streak)}</b><small>current win streak</small></div><div><b>${fmt(a.bestStreak)}</b><small>best win streak</small></div></div>${form(s.battles.slice(-20))}</section>
     <section class="stCard"><h3>Most-used Mythlings</h3>${used.length ? `<ul class="stBars stUsed">${used.map(u => barRow(`${pic(u.kind)}<span>${esc(spName(u.kind))}</span>`, u.n, maxU, `${fmt(u.n)} <small>battle${u.n === 1 ? '' : 's'}</small>`, 'linear-gradient(90deg,#6c5bd4,#b3a2ff)')).join('')}</ul>` : '<p class="stNote">Fielded Mythlings show here after a battle.</p>'}
      ${fav ? `<p class="stFav">Favourite element: <b>${esc(fav.element)}</b> <small>(${fmt(fav.n)} appearance${fav.n === 1 ? '' : 's'})</small></p>` : ''}</section>
     <section class="stCard stBest"><h3>Biggest single hit</h3>${hit ? `<div class="stBestRow">${hit[1] >= 0 ? pic(hit[1]) : ''}<div><b class="stBig">${fmt(hit[0])} damage</b><span>${hit[1] >= 0 ? esc(spName(hit[1])) : 'Your Mythling'}</span><small>${MODES[hit[3]] || ''}${hit[4] ? ' · level ' + hit[4] : ''} · ${day(hit[2])}</small></div></div>` : '<p class="stNote">Land an attack in battle to set your record.</p>'}</section></div>`;
  }

  // Economy
  const econ = `<div class="stTiles">
    ${tile('🏦', 'Vault coins collected', fmt(a.vault), 'since ' + since)}${tile('⚔️', 'Coins won in battles', fmt(a.battleCoins), 'since ' + since)}${tile('🎁', 'Daily reward coins', fmt(a.dailyCoins), 'since ' + since)}
    ${tile('🪙', 'Coins spent on packs', fmt(spent), 'since ' + since)}${tile('🔮', 'Fusions made', fmt(fusions), 'all time')}${tile('🤝', 'Trades completed', fmt(trades), 'all time')}</div>`;

  // Older history from the save
  const fromPack = {}; for (const c of st.owned || []) if (c?.sourcePack) fromPack[c.sourcePack] = (fromPack[c.sourcePack] || 0) + 1;
  const binder = cat.filter(p => fromPack[p.id]).map(p => `<li>${p.icon} ${esc(p.name)}: <b>${fmt(fromPack[p.id])}</b> card${fromPack[p.id] === 1 ? '' : 's'}</li>`).join('');

  B.render(`<button class="back" data-go="home">‹ Home</button><section class="stPage" aria-labelledby="stTitle">
   <header class="stHead"><div><p class="stKick">Your journey in numbers</p><h1 id="stTitle">📈 My Stats</h1><p class="stSub">Records started on <b>${since}</b>. Numbers marked "all time" come from your whole save.</p></div>
    <div class="stTiles stTop">${tile('🎁', 'Packs opened', fmt(st.packCount || 0), 'all time')}${tile('⚔️', 'Battles won', fmt(bt.wins), bt.played ? `${pct(bt.rate)} of ${fmt(bt.played)}` : 'since ' + since)}${tile('🔥', 'Best win streak', fmt(a.bestStreak))}${tile('🗺️', 'Quests cleared', `${fmt(oldQuests)}/100`, 'all time')}</div></header>
   <h2 class="stH2">🎁 Packs</h2>${packsHTML}
   <h2 class="stH2">⚔️ Battles</h2>${battlesHTML}
   <h2 class="stH2">🪙 Coins &amp; trading</h2>${econ}
   ${binder ? `<details class="stOld"><summary>Older history: cards in your binder from each pack (all time)</summary><ul>${binder}</ul><p class="stNote">Counts cards you still own, so fused or traded cards aren't included.</p></details>` : ''}
   <p class="stLinks"><button type="button" class="button" data-go="achievements">🏆 Achievements</button> <button type="button" class="button" data-go="profile">👤 My Profile</button></p>
  </section>`);
  window.EmberStatsTiming = { renderMs: +(performance.now() - t0).toFixed(2), packs: s.packs.length, battles: s.battles.length, bytes: statsSize(s) };
}

/* ------------------------------------------------------------ Entry points */
function addMenuItem(menu) {
  if (!menu || menu.querySelector('[data-go="stats"]')) return;
  const b = document.createElement('button'); b.setAttribute('role', 'menuitem'); b.dataset.go = 'stats'; b.className = 'stMenuItem';
  b.innerHTML = '<span aria-hidden="true">📈</span> My Stats';
  const after = menu.querySelector('[data-go="achievements"]') || menu.querySelector('[data-go="profile"]');
  after ? after.after(b) : menu.querySelector('hr') ? menu.insertBefore(b, menu.querySelector('hr')) : menu.append(b);
}
function addLinks() {
  if (B.view === 'achievements') {
    const hero = $('#app .hero');
    if (hero && !$('.stLink', hero)) { const p = document.createElement('p'); p.className = 'stLink'; p.innerHTML = '<button type="button" class="button" data-go="stats">📈 My Stats</button>'; hero.append(p); $('button', p).onclick = () => B.go('stats'); }
  }
  if (B.view === 'profile') {
    const links = $('#app .pfLinks');
    if (links && !$('.stLink', links)) { const b = document.createElement('button'); b.type = 'button'; b.className = 'pfBtn ghost stLink'; b.textContent = '📈 My Stats'; b.onclick = () => B.go('stats'); links.prepend(b); }
  }
}

const CSS = `
/* My Stats (public/stats.js) */
.stPage{--st-bar:linear-gradient(90deg,#c98a2c,#ffd27a);max-width:1240px;margin:0 auto 28px;color:var(--ui-text,#efe6d2);overflow-wrap:anywhere}
.stHead{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px 22px;align-items:center;padding:18px 22px;border:1px solid var(--ui-goldline,#7a5a2a);border-radius:10px;background:radial-gradient(ellipse at 80% 0,#2a2a3c,transparent 60%),linear-gradient(180deg,#151c27,#0e131b);box-shadow:inset 0 0 0 1px #0009,0 12px 30px #0008}
.stKick{margin:0;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--ui-gold,#e9b75a)}
.stHead h1{margin:2px 0 6px;font-size:clamp(28px,4vw,42px)}
.stSub{margin:0;color:var(--ui-muted,#b9ae98);font-size:15px;line-height:1.4}.stSub b{color:#f3dfb0}
.stH2{margin:22px 2px 10px;font-size:22px}
.stTiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.stTop{grid-template-columns:repeat(4,minmax(96px,1fr))}
.stTile{display:grid;justify-items:center;text-align:center;gap:2px;padding:10px 8px;border-radius:10px;background:#0d1219;border:1px solid #3c3220;min-width:0}
.stTile>span{font-size:20px;line-height:1}.stTile b{font-family:var(--ui-display,Georgia,serif);font-size:22px;color:#ffe2a0;line-height:1.15}
.stTile small{font-size:13px;color:#d6cbb4;line-height:1.2}.stTile em{font-style:normal;font-size:11px;color:var(--ui-muted,#b9ae98)}
.stGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.stCard{min-width:0;padding:14px 16px;border:1px solid var(--ui-goldline,#7a5a2a);border-radius:10px;background:linear-gradient(180deg,#151c27,#0e131b)}
.stCard h3{margin:0 0 10px;font-size:18px}.stWide{grid-column:1/-1}
.stBars{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.stBarRow,.stPair,.stLuckRow{display:grid;grid-template-columns:minmax(90px,150px) minmax(40px,1fr) auto;gap:10px;align-items:center;font-size:14px}
.stBarLbl{display:flex;align-items:center;gap:6px;min-width:0;color:#e8dcc2}
.stBarTrack{position:relative;display:block;height:12px;border-radius:6px;background:#262b35;overflow:visible}
.stBarTrack i{display:block;height:100%;border-radius:6px;background:var(--st-bar)}
.stBarTrack u{position:absolute;top:-4px;bottom:-4px;width:3px;margin-left:-1.5px;border-radius:2px;background:#f6e7c4;box-shadow:0 0 0 1px #0b0e14}
.stLuckRow .stBarTrack i{background:linear-gradient(90deg,#3f8f5a,#7fd28a)}
.stBarVal{font-size:14px;color:#ffe2a0;white-space:nowrap;text-align:right}.stBarVal small{font-weight:400;color:var(--ui-muted,#b9ae98)}
.stPairBars{display:grid;gap:3px}.stPairBars .stBarTrack{height:9px}
.stOdds i{background:repeating-linear-gradient(135deg,#8a8170 0 3px,#5d564a 3px 6px)!important}
.stDot{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--rc);flex:none}
.stPair .stBarVal{display:grid;justify-items:end;line-height:1.15}
.stNote{margin:10px 0 0;font-size:13px;color:var(--ui-muted,#b9ae98);line-height:1.4}
.stKey{display:inline-block;width:18px;height:9px;border-radius:4px;vertical-align:middle;margin:0 2px 0 6px}
.stKeyBar{background:#7fd28a}.stKeyTick{width:3px;height:14px;background:#f6e7c4}.stKeyYou{background:#ffd27a}.stKeyOdds{background:repeating-linear-gradient(135deg,#8a8170 0 3px,#5d564a 3px 6px)}
.stLuckTop{display:grid;grid-template-columns:200px minmax(0,1fr);gap:14px;align-items:center;margin-bottom:12px}
.stLuckTop p{margin:6px 0 0;font-size:14px;line-height:1.4;color:#d6cbb4}.stLuckTop p b{color:#ffe2a0}
.stGauge{width:100%;max-width:220px;height:auto}.stGT{font-size:12px;fill:#b9ae98}
.stVerdict{font-family:var(--ui-display,Georgia,serif);font-size:22px;color:#ffe2a0}.stV-vlucky,.stV-lucky{color:#8fe3a4}.stV-unlucky,.stV-vunlucky{color:#f0a196}
.stBestRow{display:flex;gap:14px;align-items:center}.stBestRow>div{display:grid;gap:4px;justify-items:start;min-width:0}
.stBestRow b{font-family:var(--ui-display,Georgia,serif);font-size:21px;color:#f6e7c4}.stBestRow small{font-size:13px;color:var(--ui-muted,#b9ae98)}
.stBig{color:#ffd27a!important;font-size:26px!important}
.stPic{position:relative;flex:none;display:block;width:44px;height:44px;border-radius:50%;overflow:hidden;border:2px solid #c9a35a;background:#18213f}
.stBestRow .stPic{width:84px;height:84px}
.stPic .mythlingArt{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important}.stPic .mythlingArt img{object-fit:cover!important}
.stRar{display:inline-block;padding:1px 8px;border-radius:99px;font-size:12px;border:1px solid var(--rc);color:var(--rc);background:color-mix(in srgb,var(--rc) 14%,#0d1219)}
.stDry{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
.stDry>div{padding:10px;border-radius:8px;background:#0d1219;border:1px solid #2c2618;text-align:center}
.stDry b{display:block;font-family:var(--ui-display,Georgia,serif);font-size:26px;color:#ffe2a0}.stDry small{font-size:12px;color:var(--ui-muted,#b9ae98);line-height:1.3}
.stPacks{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.stPack{min-width:0;padding:8px 10px;border-radius:8px;background:#0d1219;border:1px solid #2c2618}
.stPackHead{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:14px}.stPackHead small{color:var(--ui-muted,#b9ae98)}
.stChips{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:4px}
.stChip{display:inline-flex;align-items:center;gap:4px;max-width:100%;padding:2px 7px 2px 3px;border-radius:99px;font-size:12px;border:1px solid color-mix(in srgb,var(--rc) 60%,#000);background:color-mix(in srgb,var(--rc) 10%,#0b0f15)}
.stChipR{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 3px;border-radius:9px;background:var(--rc);color:#10131a;font-weight:800;font-size:11px}
.stChipN{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stSr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.stRecord{display:flex;align-items:center;gap:16px;margin-bottom:10px}.stDonut{width:130px;height:130px;flex:none}
.stDT{font:700 22px var(--ui-display,Georgia,serif);fill:#ffe2a0}.stDS{font-size:11px;fill:#b9ae98}
.stLegend{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-size:15px}.stLegend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:8px;vertical-align:-1px}
.stTable{width:100%;border-collapse:collapse;font-size:14px}.stTable th,.stTable td{padding:6px 4px;border-bottom:1px dashed #3c3220;text-align:right}
.stTable th:first-child{text-align:left}.stTable thead th{font-size:12px;color:var(--ui-muted,#b9ae98);font-weight:400}.stTable tbody th{font-weight:400;color:#e8dcc2}
.stMini{display:inline-block;width:46px;height:7px;margin-right:6px;border-radius:4px;background:#262b35;overflow:hidden;vertical-align:middle}.stMini i{display:block;height:100%;background:#58b874}
.stForm{margin:12px 0 0;overflow:hidden}.stForm svg{max-width:100%;height:auto;display:block}.stForm figcaption{margin-top:6px;font-size:13px;color:#d6cbb4}.stForm small{color:var(--ui-muted,#b9ae98)}
.stUsed .stBarRow{grid-template-columns:minmax(120px,170px) minmax(40px,1fr) auto}.stUsed .stBarLbl span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.stUsed .stPic{width:32px;height:32px}
.stFav{margin:12px 0 0;font-size:15px}.stFav b{color:#ffe2a0}.stFav small{color:var(--ui-muted,#b9ae98)}
.stEmpty{padding:22px;border:1px dashed var(--ui-goldline,#7a5a2a);border-radius:10px;text-align:center;background:#0d1219}
.stEmpty p{margin:0 auto 12px;max-width:620px;font-size:15px;line-height:1.45;color:#d6cbb4}
.stOld{margin:16px 0 0;padding:10px 14px;border:1px solid #3c3220;border-radius:10px;background:#0d1219;font-size:14px}.stOld summary{cursor:pointer;color:#f3dfb0;min-height:28px}
.stOld ul{margin:8px 0 0;padding-left:18px;columns:2}.stOld b{color:#ffe2a0}
.stLinks{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:18px 0 0}
.stLink{margin:12px 0 0}
@media(max-width:1000px){.stHead{grid-template-columns:minmax(0,1fr)}.stTop{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:860px){.stGrid{grid-template-columns:minmax(0,1fr)}.stPacks{grid-template-columns:minmax(0,1fr)}}
@media(max-width:560px){.stHead{padding:14px}.stTop,.stTiles{grid-template-columns:repeat(2,minmax(0,1fr))}.stLuckTop{grid-template-columns:minmax(0,1fr);justify-items:center;text-align:center}
 .stBarRow,.stPair,.stLuckRow,.stUsed .stBarRow{grid-template-columns:minmax(0,1fr) auto;gap:4px 10px}.stBarRow .stBarTrack,.stPair .stPairBars,.stLuckRow .stBarTrack{grid-column:1/-1;grid-row:2}
 .stCard{padding:12px}.stRecord{flex-direction:column}.stOld ul{columns:1}.stTable{font-size:13px}.stMini{display:none}}
`;

if (B) {
  const style = document.createElement('style'); style.id = 'stStyles'; style.textContent = CSS; document.head.append(style);
  B.registerView('stats', render);
  try { ensureStats(B.state); } catch { /* ignore */ }
  takeSnap(); dailyDefs().then(d => { defs = d; });
  addEventListener('ember:frame', () => {
    try { capturePack(); } catch (err) { console.warn('stats', err); }
    takeSnap(); checkDaily(); requestAnimationFrame(addLinks);
  });
  addEventListener('ember:packReveal', () => { try { capturePack(); } catch (err) { console.warn('stats', err); } });
  addEventListener('ember:packSummary', e => { try { capturePack(e.detail?.creatures); } catch (err) { console.warn('stats', err); } });
  addEventListener('ember:cardBattle', e => {
    try { const { match, side } = e.detail || {}; observe(match, side ?? 0); if (B.state.cardBattle?.match === match) held = B.state.cardBattle; else if (!B.state.cardBattle) held = null; } catch (err) { console.warn('stats', err); }
  });
  addEventListener('ember:cardResult', e => onResult(e.detail || {}));
  addEventListener('ember:coins', e => { const n = Number(e.detail?.amount) || 0; if (n > 0) { stats().agg.vault += Math.round(n); persist(); } });
  document.addEventListener('click', () => setTimeout(() => { checkDaily(); takeSnap(); }, 0));
  new MutationObserver(muts => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList?.contains('uiMenu')) addMenuItem(n); }).observe(document.body, { childList: true });
  window.EmberStats = { render, stats, luck: () => luck(stats().agg) };
}
