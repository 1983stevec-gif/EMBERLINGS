// EMBERLINGS weekly recap: "Your week in EMBERLINGS". Once a week (the first visit to Home on or after Monday,
// local time, if the player was active the week before) a panel sums up last week: packs opened, best pull,
// battles won and lost, best win streak, MVP Mythling, coins earned, new species found and cheers received.
// A Share button makes a 1080x1350 picture (drawn in the browser from same-origin art; nothing is uploaded).
// It can be opened any time from My Stats ("This week" / "Last week") and from Settings.
// Everything is read from My Stats records (state.ember.stats, public/stats.js) and state.ember.cardOrigins.
// Save data (additive): state.ember.recap = { lastShown: 'YYYY-Www', auto: true, coins: [['YYYY-Www', total], ...] }
//   coins: the running coin total (Vault + battle + daily coins from My Stats) at the first visit of each week,
//   so a week's coins earned is the difference between two weeks. Rewards, odds and battles are never changed.
import { RARITIES, MUTATIONS } from './combat-rules.js';
import { ensureStats, decodeCard, pullScore } from './stats.js';

/* ------------------------------------------------------------ Week maths (also used by tests/weekly-recap.mjs) */
const DAY = 864e5;
// ISO 8601 week key of a local date, e.g. '2026-W45'. Weeks start on Monday; week 1 holds the year's first Thursday.
export function isoWeek(d = new Date()) {
  const t = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (new Date(t).getUTCDay() + 6) % 7;            // Monday 0 … Sunday 6
  const thu = t + (3 - dow) * DAY, ty = new Date(thu).getUTCFullYear();
  const w = 1 + Math.floor((thu - Date.UTC(ty, 0, 1)) / DAY / 7);
  return `${ty}-W${String(w).padStart(2, '0')}`;
}
// The local Monday 00:00 → next Monday 00:00 range holding d (safe across clock changes).
export function weekRange(d = new Date()) {
  const dow = (d.getDay() + 6) % 7;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  return { key: isoWeek(start), start: start.getTime(), end: end.getTime() };
}
export function prevWeekRange(d = new Date()) { return weekRange(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7)); }
export const inRange = (ms, r) => ms >= r.start && ms < r.end;

// Recap save block: created when missing, missing fields mean their defaults. Never clears anything.
export function ensureRecap(st) {
  if (!st.ember || typeof st.ember !== 'object') st.ember = {};
  let r = st.ember.recap;
  if (!r || typeof r !== 'object') r = st.ember.recap = {};
  if (!Array.isArray(r.coins)) r.coins = [];
  return r;
}
export const autoOn = r => r?.auto !== false;
export const coinTotal = a => Math.max(0, Math.round((+a?.vault || 0) + (+a?.battleCoins || 0) + (+a?.dailyCoins || 0)));
// Note the coin total the first time a week is seen. Keeps the last 4 weeks.
export function noteCoins(r, key, total) {
  const last = r.coins[r.coins.length - 1];
  if (last && last[0] === key) return false;
  if (r.coins.some(c => c[0] === key)) return false;
  r.coins.push([key, total]); if (r.coins.length > 4) r.coins.splice(0, r.coins.length - 4);
  return true;
}
// Coins earned in week `key`: next week's first-visit total (or now, for the current week) minus this week's.
export function coinsEarned(r, key, nextKey, nowTotal, current) {
  const a = r.coins.find(c => c[0] === key); if (!a) return null;
  const b = current ? [nextKey, nowTotal] : r.coins.find(c => c[0] === nextKey); if (!b) return null;
  return Math.max(0, b[1] - a[1]);
}

// Everything the panel shows, for one week range. st is the game state; extra = { coins, cheers }.
export function summarize(st, range, extra = {}) {
  const s = st.ember?.stats || {}, inR = t => inRange(t * 1000, range);
  const packs = (s.packs || []).filter(p => inR(p[1]));
  let best = null;
  for (const p of packs) for (const code of p.slice(3)) {
    const d = decodeCard(code);
    if (!best || pullScore(d) > pullScore(best.card)) best = { card: d, pack: p[0], at: p[1] };
  }
  const battles = (s.battles || []).filter(b => inR(b[2])).sort((x, y) => x[2] - y[2]);
  let wins = 0, losses = 0, draws = 0, run = 0, bestStreak = 0;
  const use = {}, dmg = {};
  for (const b of battles) {
    if (b[1] === 'W') { wins++; run++; bestStreak = Math.max(bestStreak, run); } else if (b[1] === 'L') { losses++; run = 0; } else draws++;
    for (const k of String(b[4] || '').split('.').filter(Boolean).map(Number).filter(Number.isInteger)) use[k] = (use[k] || 0) + 1;
    if (b[6] >= 0 && b[5] > 0) dmg[b[6]] = Math.max(dmg[b[6]] || 0, b[5]);
  }
  const kinds = new Set([...Object.keys(use), ...Object.keys(dmg)].map(Number));
  const mvp = [...kinds].map(k => ({ kind: k, battles: use[k] || 0, hit: dmg[k] || 0 }))
    .sort((x, y) => y.battles - x.battles || y.hit - x.hit || x.kind - y.kind)[0] || null;
  return { range, packs: packs.length, cards: packs.reduce((n, p) => n + p.length - 3, 0), best,
    battles: battles.length, wins, losses, draws, bestStreak, mvp,
    species: newSpecies(st, range), coins: extra.coins ?? null, cheers: extra.cheers ?? null };
}
// Species found for the first time in the range: from pack records and card origin records. Cards owned
// before records began (no origin) count as already found, so nothing is claimed as new by mistake.
export function newSpecies(st, range) {
  const before = new Set(), during = new Map();
  const note = (kind, ms) => {
    if (!Number.isInteger(kind)) return;
    if (ms < range.start) before.add(kind);
    else if (ms < range.end && (!during.has(kind) || ms < during.get(kind))) during.set(kind, ms);
  };
  for (const p of st.ember?.stats?.packs || []) for (const code of p.slice(3)) note(decodeCard(code).kind, p[1] * 1000);
  const origins = st.ember?.cardOrigins || {};
  for (const c of st.owned || []) {
    if (!c || !Number.isInteger(c.kind)) continue;
    const at = origins[c.id]?.at;
    note(c.kind, Number.isFinite(at) ? at : -Infinity);
  }
  return [...during].filter(([k]) => !before.has(k)).sort((x, y) => x[1] - y[1]).map(([k]) => k);
}
export const wasActive = sum => !!sum && (sum.packs > 0 || sum.battles > 0 || sum.coins > 0);
// Is the automatic pop-up due? Once per ISO week, only when on and last week had something to show.
export function isDue(r, now, lastWeekSum) { return autoOn(r) && r.lastShown !== isoWeek(now) && wasActive(lastWeekSum); }

/* ------------------------------------------------------------ Browser side */
const B = globalThis.window?.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');
const RARITY_COLORS = ['#bdb5a3', '#7fd28a', '#6fb4ff', '#c58cff', '#ffb84d', '#8ff0ff', '#ff7ad9'];
const spName = k => B.species[k]?.name || 'Mythling';
const calm = () => !!B?.state?.reducedMotion || document.documentElement.dataset.fx === 'off' || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
const persist = () => { try { B.save(); } catch { /* the game shows its own save error */ } };
const recap = () => ensureRecap(B.state);
const catalog = () => { try { return B.packCatalog() || []; } catch { return []; } };
const asCard = d => ({ kind: d.kind, level: 1, rarity: RARITIES[d.rank] || 'Common', secret: d.rank === 6, shiny: d.shiny, mutation: MUTATIONS[d.mut]?.id || null });
const dateText = (ms, opts) => new Date(ms).toLocaleDateString(undefined, opts);
const rangeText = r => `${dateText(r.start, { weekday: 'short', day: 'numeric', month: 'short' })} – ${dateText(r.end - DAY / 2, { weekday: 'short', day: 'numeric', month: 'short' })}`;

function cheersIn(range) {
  const feed = window.EmberActivity?.feed?.(); if (!feed || !Array.isArray(feed.mine)) return null;
  return feed.mine.filter(e => Number.isFinite(e.at) && inRange(e.at, range)).reduce((n, e) => n + (e.cheers || 0), 0);
}
function week(which) {
  const st = B.state, s = ensureStats(st), r = recap(), now = new Date();
  const cur = weekRange(now), range = which === 'this' ? cur : prevWeekRange(now);
  const coins = coinsEarned(r, range.key, cur.key, coinTotal(s.agg), which === 'this');
  return summarize(st, range, { coins, cheers: cheersIn(range) });
}
// First frame of each week: remember the coin total so next week's recap can tell the coins earned.
function snapshotCoins() { try { const s = ensureStats(B.state); if (noteCoins(recap(), weekRange().key, coinTotal(s.agg))) persist(); } catch (e) { console.warn('weekly-recap', e); } }

/* ------------------------------------------------------------ Panel */
let shownWhich = 'last', lastFocus = null, openedAt = 0, autoOpened = false;
const pic = (card, cls = '') => `<span class="wrPic ${cls}" aria-hidden="true">${B.art(card)}</span>`;
function tile(icon, label, value, note = '') { return `<li class="wrTile"><span aria-hidden="true">${icon}</span><b>${value}</b><small>${label}</small>${note ? `<em>${note}</em>` : ''}</li>`; }
function body(sum, which) {
  const any = sum.packs || sum.battles || sum.coins;
  const b = sum.best, bm = b && MUTATIONS[b.card.mut], bp = b && catalog().find(p => p.id === b.pack);
  const record = sum.battles ? `${fmt(sum.wins)} – ${fmt(sum.losses)}` : '0';
  const tiles = [
    tile('🎁', 'Packs opened', fmt(sum.packs), sum.cards ? `${fmt(sum.cards)} cards` : ''),
    tile('⚔️', 'Battles won – lost', record, sum.draws ? `${fmt(sum.draws)} draw${sum.draws > 1 ? 's' : ''}` : sum.battles ? `${fmt(sum.battles)} played` : ''),
    tile('🔥', 'Best win streak', fmt(sum.bestStreak)),
    tile('🪙', 'Coins earned', sum.coins == null ? '–' : fmt(sum.coins), sum.coins == null ? 'counted from next week' : 'Vault, battles, daily'),
    tile('📖', 'New species found', fmt(sum.species.length), sum.species.length ? esc(sum.species.slice(0, 3).map(spName).join(', ')) + (sum.species.length > 3 ? '…' : '') : ''),
    sum.cheers != null ? tile('🎉', 'Cheers received', fmt(sum.cheers)) : ''
  ].join('');
  const bestHTML = b ? `<section class="wrFeat" aria-label="Best pull">${pic(asCard(b.card), 'big')}<div><p class="wrTag">Best pull</p><b>${esc(spName(b.card.kind))}</b>
     <span class="wrRar" style="--rc:${RARITY_COLORS[b.card.rank]}">${RARITIES[b.card.rank]}</span>${bm ? ` <span class="wrRar" style="--rc:${bm.color}">${bm.icon} ${esc(bm.name)}</span>` : ''}${b.card.shiny ? ' <span class="wrRar" style="--rc:#ffe47e">✨ Shiny</span>' : ''}
     <small>${bp ? esc(bp.icon + ' ' + bp.name) + ' · ' : ''}${dateText(b.at * 1000, { weekday: 'long' })}</small></div></section>` : '';
  const m = sum.mvp;
  const mvpHTML = m ? `<section class="wrFeat" aria-label="MVP Mythling">${pic({ kind: m.kind, level: 1, rarity: 'Common' }, 'big')}<div><p class="wrTag">MVP Mythling</p><b>${esc(spName(m.kind))}</b>
     <small>${fmt(m.battles)} battle${m.battles === 1 ? '' : 's'}${m.hit ? ` · biggest hit ${fmt(m.hit)}` : ''}</small></div></section>` : '';
  const empty = which === 'this' ? 'Nothing yet this week. Open a pack or win a battle and it shows up here.' : 'Nothing recorded last week. This week is a fresh start!';
  return `<div class="wrSeg" role="group" aria-label="Which week"><button type="button" data-wr-week="last" aria-pressed="${which === 'last'}">Last week</button><button type="button" data-wr-week="this" aria-pressed="${which === 'this'}">This week</button></div>
   <p class="wrDates">${rangeText(sum.range)}</p>
   ${any || sum.species.length ? `<ul class="wrTiles">${tiles}</ul>${bestHTML || mvpHTML ? `<div class="wrFeats">${bestHTML}${mvpHTML}</div>` : ''}` : `<p class="wrEmpty">${empty}</p>`}
   <div class="wrBtns">${any ? '<button type="button" class="wrShare">📤 Share picture</button>' : ''}<button type="button" class="wrOk">${which === 'last' && any ? 'Nice! Let’s play' : 'Close'}</button></div>
   <p class="wrNote" role="status"></p>
   <p class="wrFoot">Numbers come from <button type="button" class="wrLink" data-wr-go="stats">My Stats</button>. Weekly pop-up: <button type="button" class="wrLink" data-wr-go="settings">Settings</button>.</p>`;
}
function paint(el, which) {
  shownWhich = which;
  const sum = week(which);
  $('.wrBody', el).innerHTML = body(sum, which);
  $('.wrShare', el)?.addEventListener('click', async ev => {
    const btn = ev.currentTarget, note = $('.wrNote', el); btn.disabled = true; note.textContent = 'Making your picture…';
    try { note.textContent = await share(sum); } catch (err) { console.warn('weekly-recap', err); note.textContent = 'Sorry, the picture could not be made.'; }
    btn.disabled = false;
  });
}
export function open(which = 'last') {
  if (!B) return false;
  if ($('#dailyPanel') || $('#whatsNewPanel')) return false; // never stacked with Daily rewards or What's New
  close(); styles(); $('.uiMenu')?.remove();
  lastFocus = document.activeElement; openedAt = Date.now();
  const el = document.createElement('div'); el.id = 'weeklyRecap'; el.className = 'tradeDone wrPanel' + (calm() ? ' wrCalm' : '');
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'wrTitle');
  el.innerHTML = `<div class="tdBox wrBox"><button type="button" class="dX" aria-label="Close">×</button>
    <p class="wrKick">Your weekly recap</p><h2 id="wrTitle">Your week in EMBERLINGS</h2><div class="wrBody"></div></div>`;
  document.body.append(el);
  paint(el, which);
  el.addEventListener('click', e => {
    if (e.target === el || e.target.closest('.dX,.wrOk')) { close(); return; }
    const w = e.target.closest('[data-wr-week]'); if (w) { paint(el, w.dataset.wrWeek); $(`[data-wr-week="${w.dataset.wrWeek}"]`, el)?.focus({ preventScroll: true }); return; }
    const go = e.target.closest('[data-wr-go]'); if (go) { const v = go.dataset.wrGo; close(); if (v === 'settings' && window.EmberSettings?.open) window.EmberSettings.open('weeklyRecap'); else B.go(v); }
  });
  addEventListener('keydown', onKey, true);
  $('.wrOk', el)?.focus({ preventScroll: true });
  return true;
}
export function close() {
  const el = $('#weeklyRecap'); if (!el) return;
  el.remove(); removeEventListener('keydown', onKey, true);
  if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true }); lastFocus = null;
}
function onKey(e) {
  const el = $('#weeklyRecap'); if (!el) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
  if (e.key === 'Tab') {
    const f = $$('button', el).filter(x => x.offsetParent && !x.disabled); if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  }
}

/* ------------------------------------------------------------ Showing it once a week */
// Never stacked with Daily rewards, What's New, tips, the beginner guide or any other pop-up; only on Home.
const BLOCKERS = '#dailyPanel, #whatsNewPanel, #emberTip, #guidedTour, .tradeDone, #tradeAlert, #rareFind, .biIntro, .uiLvUp, .lvlUp, .levelUpModal, #fxMusicHint, .fxStage, .psStage, #pfPicker, .dsOverlay, #cardDetails, .uiMenu, .uiCloudDlg, #a11yPanel';
const newsPending = () => { const wn = window.EmberWhatsNew; return !!wn?.LATEST && B.state.ember?.seenRelease !== wn.LATEST; };
function blocked() { const st = B.state; return B.view !== 'home' || !st.tutorialComplete || st.guidedTour?.active || !!$(BLOCKERS) || !!B.state.pendingPack; }
let waiting = false;
function maybeShow() {
  if (waiting || autoOpened || $('#weeklyRecap')) return;
  const r = recap(), now = new Date();
  if (!autoOn(r) || r.lastShown === isoWeek(now)) return;
  if (B.view !== 'home' || !B.state.tutorialComplete) return;
  if (!isDue(r, now, week('last'))) { r.lastShown = isoWeek(now); persist(); return; } // last week was quiet: nothing to show
  waiting = true;
  let clear = 0, tries = 0;
  // Let the Daily panel (0.6 s), What's New (1.4 s) and tips go first; then wait for a quiet moment.
  setTimeout(function check() {
    const rr = recap();
    if (!autoOn(rr) || rr.lastShown === isoWeek(new Date()) || $('#weeklyRecap')) { waiting = false; return; }
    if (B.view !== 'home') { waiting = false; return; } // try again next time Home is shown
    if (++tries > 120) { waiting = false; return; }
    if (blocked() || (newsPending() && tries < 20)) { clear = 0; setTimeout(check, 800); return; }
    if (++clear < 2) { setTimeout(check, 800); return; }
    waiting = false;
    if (open('last')) { autoOpened = true; rr.lastShown = isoWeek(new Date()); persist(); }
  }, 2600);
}

/* ------------------------------------------------------------ My Stats entry point */
function addStatsEntry() {
  if (B.view !== 'stats') return;
  const head = $('#app .stHead'); if (!head || $('.wrStats')) return;
  styles();
  const box = document.createElement('section'); box.className = 'wrStats'; box.setAttribute('aria-label', 'Weekly recap');
  box.innerHTML = `<p><span aria-hidden="true">📅</span> <b>Your week in EMBERLINGS</b> <small>Packs, battles, MVP and coins, week by week.</small></p>
   <div><button type="button" class="button" data-wr-open="this">This week</button><button type="button" class="button gold" data-wr-open="last">Last week</button></div>`;
  head.after(box);
  $$('[data-wr-open]', box).forEach(b => b.onclick = () => open(b.dataset.wrOpen));
}

/* ------------------------------------------------------------ Settings */
let hooked = false;
function settingsHTML() {
  const on = autoOn(B.state.ember?.recap);
  return `<div class="setRow"><div class="setRowText"><span class="setLabel" id="setRecapLbl">Weekly recap pop-up</span><small class="setSub" id="setRecapSub">On the first visit each week, show last week's packs, battles, MVP and coins.</small></div>
   <button type="button" class="setSwitch" id="setRecap" role="switch" aria-checked="${on}" aria-labelledby="setRecapLbl" aria-describedby="setRecapSub"><span>${on ? 'On' : 'Off'}</span></button></div>
   <p class="setBtns"><button type="button" class="setBtn" id="setRecapOpen">📅 Open my weekly recap</button></p>`;
}
function hookSettings() {
  if (hooked || !window.EmberSettings?.addSection) return hooked;
  hooked = window.EmberSettings.addSection({
    id: 'weeklyRecap', icon: '📅', title: 'Weekly recap', order: 3, html: settingsHTML,
    bind: el => {
      const b = $('#setRecap', el);
      b?.addEventListener('click', () => { const r = recap(); r.auto = !autoOn(r); persist(); b.setAttribute('aria-checked', String(r.auto)); $('span', b).textContent = r.auto ? 'On' : 'Off'; });
      $('#setRecapOpen', el)?.addEventListener('click', () => open('last'));
    }
  }) !== false;
  return hooked;
}

/* ------------------------------------------------------------ Share picture (same approach as highlights.js) */
const W = 1080, H = 1350;
const SERIF = "'Cormorant Garamond', 'EB Garamond', Georgia, serif", TITLE = 'Cinzel, Georgia, serif';
const imgCache = new Map();
function loadImg(src) {
  if (!imgCache.has(src)) imgCache.set(src, new Promise(res => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));
  return imgCache.get(src);
}
// Read where the art comes from out of the game's own art markup (same-origin files only).
function artSource(c) {
  const html = B.art(c) || '', src = (html.match(/src="([^"]+)"/) || [])[1];
  if (!src || !src.startsWith('/')) return null;
  const col = +(html.match(/--art-col:(\d+)/) || [])[1] || 0, row = +(html.match(/--art-row:(\d+)/) || [])[1] || 0;
  return { src, sheet: !/mythlingSingle/.test(html), col, row };
}
async function drawArt(ctx, c, x, y, size, ring = '#f2c45f') {
  ctx.save();
  ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.closePath();
  ctx.fillStyle = '#18213f'; ctx.fill(); ctx.clip();
  const a = c && artSource(c), img = a && await loadImg(a.src);
  if (img) {
    if (a.sheet) { const cw = img.naturalWidth / 5, ch = img.naturalHeight / 2; ctx.drawImage(img, a.col * cw, a.row * ch, cw, ch, x, y, size, size); }
    else ctx.drawImage(img, x, y, size, size);
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(3, size / 40); ctx.strokeStyle = ring; ctx.stroke();
}
function rounded(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function fit(ctx, text, max, font, size, min = 20) { let s = size; do { ctx.font = font.replace('$', s); s -= 2; } while (ctx.measureText(text).width > max && s > min); return text; }

async function picture(sum) {
  try { await Promise.all(['800 100px Cinzel', '700 40px Cinzel', '700 40px "Cormorant Garamond"', '600 40px "EB Garamond"'].map(f => document.fonts?.load(f))); } catch { /* system fonts are fine */ }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2c2150'); g.addColorStop(.45, '#16193a'); g.addColorStop(1, '#0a0f26');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W / 2, 250, 20, W / 2, 250, 640); g.addColorStop(0, '#f2b44a55'); g.addColorStop(1, '#f2b44a00');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { const x = (i * 197) % W, y = 80 + (i * 331) % (H - 160), r = 1.5 + (i % 4); ctx.fillStyle = `rgba(255,${150 + (i * 7) % 90},80,${.12 + (i % 5) * .05})`; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  rounded(ctx, 22, 22, W - 44, H - 44, 34); ctx.lineWidth = 5; ctx.strokeStyle = '#f2c45f'; ctx.stroke();
  rounded(ctx, 36, 36, W - 72, H - 72, 26); ctx.lineWidth = 1.5; ctx.strokeStyle = '#f2c45f66'; ctx.stroke();
  const logo = await loadImg('/branding/emberlings-logo-transparent.webp') || await loadImg('/branding/emberlings-logo-transparent.png');
  if (logo) { const lw = 400, lh = lw * logo.naturalHeight / logo.naturalWidth; ctx.save(); ctx.shadowColor = 'rgba(6,4,18,.8)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 6; ctx.drawImage(logo, (W - lw) / 2, 56, lw, lh); ctx.restore(); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `800 84px ${TITLE}`;
  g = ctx.createLinearGradient(0, 230, 0, 320); g.addColorStop(0, '#fff2c2'); g.addColorStop(.55, '#f2c45f'); g.addColorStop(1, '#c47a1f');
  ctx.shadowColor = '#f2a53a99'; ctx.shadowBlur = 26; ctx.fillStyle = g; ctx.fillText('MY WEEK', W / 2, 318); ctx.shadowBlur = 0;
  const who = String(B.state.playerUsername || '').trim().slice(0, 24);
  const sub = `${who ? who + ' · ' : ''}${rangeText(sum.range)}`;
  ctx.fillStyle = '#f3d48a'; fit(ctx, sub, 900, `700 $px ${SERIF}`, 40); ctx.fillText(sub, W / 2, 372);
  // Stat tiles: 3 x 2
  const tiles = [['PACKS', fmt(sum.packs)], ['WON – LOST', `${fmt(sum.wins)} – ${fmt(sum.losses)}`], ['BEST STREAK', fmt(sum.bestStreak)],
    ['COINS EARNED', sum.coins == null ? '–' : fmt(sum.coins)], ['NEW SPECIES', fmt(sum.species.length)], sum.cheers != null ? ['CHEERS', fmt(sum.cheers)] : ['CARDS PULLED', fmt(sum.cards)]];
  const tw = 290, th = 150, gx = 25, x0 = (W - (tw * 3 + gx * 2)) / 2;
  tiles.forEach(([label, value], i) => {
    const x = x0 + (i % 3) * (tw + gx), y = 410 + Math.floor(i / 3) * (th + 22);
    rounded(ctx, x, y, tw, th, 22); ctx.fillStyle = '#0d1430cc'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#f2c45f88'; ctx.stroke();
    ctx.fillStyle = '#ffffff'; fit(ctx, value, tw - 30, `800 $px ${TITLE}`, 64); ctx.fillText(value, x + tw / 2, y + 86);
    ctx.fillStyle = '#f2c45f'; ctx.font = `700 22px ${TITLE}`; ctx.fillText(label, x + tw / 2, y + 124);
  });
  // Best pull and MVP
  let y = 760;
  const feat = async (tag, card, name, line, ring) => {
    rounded(ctx, 80, y, W - 160, 220, 26);
    g = ctx.createLinearGradient(80, y, W - 80, y + 220); g.addColorStop(0, '#5a4214ee'); g.addColorStop(1, '#1f1a36ee');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#f2c45f'; ctx.stroke();
    await drawArt(ctx, card, 108, y + 22, 176, ring);
    ctx.textAlign = 'left';
    ctx.font = `800 26px ${TITLE}`; const tw2 = ctx.measureText(tag).width + 44;
    rounded(ctx, 316, y + 34, tw2, 46, 23); ctx.fillStyle = '#f2c45f'; ctx.fill();
    ctx.fillStyle = '#2a1d0c'; ctx.fillText(tag, 338, y + 67);
    ctx.fillStyle = '#ffffff'; fit(ctx, name, 640, `800 $px ${TITLE}`, 56); ctx.fillText(name, 316, y + 138);
    ctx.fillStyle = '#f3d48a'; fit(ctx, line, 640, `700 $px ${SERIF}`, 36); ctx.fillText(line, 316, y + 188);
    ctx.textAlign = 'center';
    y += 244;
  };
  const b = sum.best;
  if (b) { const m = MUTATIONS[b.card.mut]; await feat('BEST PULL', asCard(b.card), spName(b.card.kind), [RARITIES[b.card.rank], m?.name, b.card.shiny ? 'Shiny' : ''].filter(Boolean).join(' · '), RARITY_COLORS[b.card.rank]); }
  if (sum.mvp) await feat('MVP', { kind: sum.mvp.kind, level: 1, rarity: 'Common' }, spName(sum.mvp.kind), `${fmt(sum.mvp.battles)} battle${sum.mvp.battles === 1 ? '' : 's'}${sum.mvp.hit ? ` · biggest hit ${fmt(sum.mvp.hit)}` : ''}`);
  if (!b && !sum.mvp) { ctx.fillStyle = '#f2e9d6'; ctx.font = `600 40px ${SERIF}`; ctx.fillText('A whole week of adventures!', W / 2, 900); }
  ctx.textAlign = 'center'; ctx.fillStyle = '#c8d1ec'; ctx.font = `600 26px ${SERIF}`;
  ctx.fillText('Your week in EMBERLINGS  ·  Play EMBERLINGS', W / 2, H - 62);
  return cv;
}
async function share(sum) {
  const cv = await picture(sum);
  const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
  if (!blob) throw Error('no image');
  const file = new File([blob], `emberlings-week-${sum.range.key}.png`, { type: 'image/png' });
  const text = `My week in EMBERLINGS: ${sum.packs} pack${sum.packs === 1 ? '' : 's'}, ${sum.wins} win${sum.wins === 1 ? '' : 's'}${sum.mvp ? `, MVP ${spName(sum.mvp.kind)}` : ''}.`;
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try { await navigator.share({ files: [file], title: 'My week in EMBERLINGS', text }); return 'Shared!'; }
    catch (err) { if (err?.name === 'AbortError') return ''; }
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = file.name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'Picture saved to your downloads.';
}

/* ------------------------------------------------------------ Styles */
function styles() {
  if ($('#wrStyle')) return;
  const s = document.createElement('style'); s.id = 'wrStyle';
  s.textContent = `
/* Weekly recap (public/weekly-recap.js) */
#weeklyRecap{z-index:158}
#weeklyRecap .wrBox{position:relative;width:min(760px,100%);padding:24px 24px 18px;overflow-x:hidden;animation:wrPop .38s cubic-bezier(.2,.9,.3,1.2) both}
@keyframes wrPop{from{opacity:0;transform:translateY(14px) scale(.96)}}
html[data-fx=light] #weeklyRecap .wrBox{animation:wrFade .25s ease-out both}@keyframes wrFade{from{opacity:0}}
#weeklyRecap.wrCalm,#weeklyRecap.wrCalm .wrBox,html[data-fx=off] #weeklyRecap,html[data-fx=off] #weeklyRecap .wrBox{animation:none!important}
@media(prefers-reduced-motion:reduce){#weeklyRecap,#weeklyRecap .wrBox{animation:none!important}}
.wrKick{margin:0 52px 2px;font:700 13px system-ui,'Segoe UI',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#ffd77a}
#weeklyRecap h2{font-size:clamp(28px,6vw,40px);line-height:1.1;margin:0 40px}
.wrSeg{display:inline-flex;margin:14px auto 0;border:1.5px solid #c9a35a88;border-radius:99px;overflow:hidden;background:#0d1534}
.wrSeg button{min-height:44px;min-width:112px;padding:0 16px;border:0;background:transparent;color:#cdd5ea;font:700 16px system-ui,'Segoe UI',sans-serif;cursor:pointer}
.wrSeg button[aria-pressed=true]{background:linear-gradient(180deg,#ffe29a,#e8ae45);color:#2a1606}
.wrDates{margin:8px 0 12px;font:17px 'EB Garamond',Georgia,serif;color:#9aa6c8}
.wrTiles{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.wrTile{display:grid;justify-items:center;align-content:start;gap:2px;min-width:0;padding:10px 8px;border-radius:12px;border:1.5px solid #33467e;background:#0d1534cc}
.wrTile>span{font-size:22px;line-height:1}.wrTile b{font:700 26px 'Cormorant Garamond',Georgia,serif;color:#ffe2a0;line-height:1.15}
.wrTile small{font:14px/1.2 system-ui,'Segoe UI',sans-serif;color:#dfe5f6}.wrTile em{font:normal 12px/1.25 system-ui,'Segoe UI',sans-serif;color:#9aa6c8;overflow-wrap:anywhere}
.wrFeats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}
.wrFeat{display:flex;gap:12px;align-items:center;min-width:0;padding:12px;border-radius:14px;border:1.5px solid #c9a35a;background:linear-gradient(135deg,#5a4214cc,#1f1a36cc);text-align:left}
.wrFeat>div{display:grid;gap:3px;justify-items:start;min-width:0}
.wrFeat b{font:700 22px 'Cormorant Garamond',Georgia,serif;color:#fff;overflow-wrap:anywhere}.wrFeat small{font:13px system-ui,'Segoe UI',sans-serif;color:#dfe5f6}
.wrTag{margin:0;padding:2px 10px;border-radius:99px;background:#f2c45f;color:#2a1d0c;font:800 11px system-ui,'Segoe UI',sans-serif;letter-spacing:.12em;text-transform:uppercase}
.wrRar{display:inline-block;padding:1px 8px;border-radius:99px;font:12px system-ui,'Segoe UI',sans-serif;border:1px solid var(--rc);color:var(--rc);background:color-mix(in srgb,var(--rc) 14%,#0d1219)}
.wrPic{position:relative;flex:none;display:block;width:44px;height:44px;border-radius:50%;overflow:hidden;border:2px solid #c9a35a;background:#18213f}.wrPic.big{width:84px;height:84px}
.wrPic .mythlingArt{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important}.wrPic .mythlingArt img{object-fit:cover!important}
.wrEmpty{margin:8px auto 4px;max-width:520px;font:17px/1.45 system-ui,'Segoe UI',sans-serif;color:#dfe5f6}
.wrBtns{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:16px}
.wrBtns button{min-height:46px;padding:0 22px;border-radius:10px;font:700 18px 'Cormorant Garamond',Georgia,serif;cursor:pointer}
.wrShare{border:1.5px solid #c9a35a;background:#0d1534;color:#ffe2a0}.wrShare:disabled{opacity:.6;cursor:progress}
.wrOk{border:1.5px solid #fff1c2;background:linear-gradient(180deg,#ffe29a,#e8ae45);color:#2a1606}
.wrNote{min-height:1.2em;margin:6px 0 0;font:14px system-ui,'Segoe UI',sans-serif;color:#c8d1ec}
.wrFoot{margin:4px 0 0;font:13px system-ui,'Segoe UI',sans-serif;color:#9aa6c8}
.wrLink{min-height:40px;padding:0 4px;border:0;background:none;color:#ffd77a;font:inherit;text-decoration:underline;cursor:pointer}
.wrStats{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:space-between;margin:12px 0 0;padding:12px 16px;border:1px solid var(--ui-goldline,#7a5a2a);border-radius:10px;background:linear-gradient(180deg,#151c27,#0e131b)}
.wrStats p{margin:0;min-width:0;font-size:16px}.wrStats b{color:#ffe2a0}.wrStats small{display:block;color:var(--ui-muted,#b9ae98);font-size:13px}
.wrStats div{display:flex;gap:8px;flex-wrap:wrap}.wrStats .button{min-height:44px}
@media(max-width:600px){#weeklyRecap .wrBox{padding:20px 14px 14px}.wrTiles{grid-template-columns:repeat(2,minmax(0,1fr))}.wrFeats{grid-template-columns:minmax(0,1fr)}
 .wrTile b{font-size:23px}.wrSeg button{min-width:0;padding:0 14px}.wrPic.big{width:68px;height:68px}.wrStats{padding:12px}.wrStats div{width:100%}.wrStats .button{flex:1}}
`;
  document.head.append(s);
}

if (B) {
  styles();
  try { ensureStats(B.state); } catch { /* ignore */ }
  snapshotCoins();
  addEventListener('ember:frame', () => requestAnimationFrame(() => {
    try { snapshotCoins(); addStatsEntry(); maybeShow(); } catch (e) { console.warn('weekly-recap', e); }
  }));
  // Never stacked: if Daily rewards or What's New opens while the recap is up, the recap steps aside
  // (and, if it had only just opened by itself, it shows again later).
  new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (n.nodeType !== 1 || !$('#weeklyRecap')) continue;
      if (n.id === 'dailyPanel' || n.id === 'whatsNewPanel') {
        if (autoOpened && Date.now() - openedAt < 2000) { const r = recap(); delete r.lastShown; autoOpened = false; persist(); }
        close();
      }
    }
  }).observe(document.body, { childList: true });
  if (!hookSettings()) { let tries = 0; const t = setInterval(() => { if (hookSettings() || ++tries > 20) clearInterval(t); }, 500); }
  window.EmberRecap = Object.freeze({ open, close, week: which => week(which === 'this' ? 'this' : 'last') });
}
