// Friend activity and cheers. Signed-in players with friends share a few highlights automatically (rare pack
// pulls, boss quest wins, Mythling level 25/50/75/100) and friends can cheer them once. No chat and no free text.
// The Friends page gets an "Activity" panel (friends' highlights and your own, with who cheered) and a
// "Share my highlights with friends" switch; Friends gets a small dot when something new arrived.
// Save data (additive): state.ember.activity = { share: true, seen: <newest friend event time seen>, told: { eventId: cheers } }.
// Nothing here changes gameplay, rewards or cards. Server: lib/activity-api.mjs (needs migration 0009).
import { RARITIES, MUTATIONS, rarityRank } from '/combat-rules.js';

const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const BOSS_LEVELS = [10, 25, 45, 70, 100], MILESTONES = [25, 50, 75, 100];
const BOSS_ART = { 10: 'magmarok', 25: 'thorn-guardian', 45: 'frostfang', 70: 'voltitan', 100: 'voidra' };

function ext() {
  const s = B.state; if (!s.ember || typeof s.ember !== 'object') s.ember = {};
  const a = s.ember.activity;
  if (!a || typeof a !== 'object') s.ember.activity = { share: true, seen: 0, told: {} };
  const out = s.ember.activity;
  if (typeof out.share !== 'boolean') out.share = true;
  if (!Number.isFinite(out.seen)) out.seen = 0;
  if (!out.told || typeof out.told !== 'object') out.told = {};
  return out;
}
const signedIn = () => !!B.state?.playerUsername;
const rank = c => { try { return rarityRank(c); } catch { return 0; } };
const rarity = c => RARITIES[rank(c)] || 'Common';
const mutOf = c => MUTATIONS.find(m => m.id === c?.mutation) || null;
const nameOf = c => B.species?.[c?.kind]?.name || 'Mythling';
const lvl = v => Math.max(1, Math.min(100, Math.floor(Number(v) || 1)));
// Same rule as rare-finds.js: pack-only mutation, Legendary or better, or shiny Mythic or better.
const worthy = c => !!(c && (mutOf(c)?.packOnly || rank(c) >= 4 || (c.shiny && rank(c) >= 3)));
function snap(c) {
  const m = mutOf(c), out = { kind: c.kind | 0, rarity: rarity(c), level: lvl(c.level), shiny: !!c.shiny, secret: rank(c) === 6 && !!c.secret, mutation: m ? m.id : null };
  const stage = c.stage | 0, aa = c.academyAttack | 0;
  if (stage >= 1 && stage <= 2) out.stage = stage; if (aa >= 1 && aa <= 5) out.academyAttack = aa; if (c.fused) out.fused = true;
  return out;
}
const keyOf = v => String(v ?? '').replace(/[^A-Za-z0-9_:.-]/g, '').slice(0, 60);

/* ---------------------------------------------------------------- Reading the feed */
let feed = null, lastFetch = 0, loading = null, tab = 'friends', note = '';
const hasFriends = () => (feed?.friends || 0) > 0;
async function refresh(force) {
  if (!signedIn()) return null;
  if (loading) return loading;
  if (!force && Date.now() - lastFetch < 20000) return feed;
  loading = (async () => {
    try { feed = await B.online('/activity'); }
    catch { if (!feed) feed = { error: true, events: [], mine: [] }; }
    finally { lastFetch = Date.now(); loading = null; }
    afterFetch(); return feed;
  })();
  return loading;
}
function afterFetch() {
  paintDot(); tellCheers();
  try { dispatchEvent(new CustomEvent('ember:activity')); } catch {} // inbox.js listens
  if (B.view === 'friends') paintPanel();
}

/* ---------------------------------------------------------------- Posting highlights */
const sent = new Set();
async function post(ev) {
  if (!signedIn() || !ext().share) return;
  const id = ev.type + ':' + ev.key; if (!ev.key || sent.has(id)) return; sent.add(id);
  if (!feed || Date.now() - lastFetch > 600000) await refresh(true);
  if (!feed || feed.error || feed.available === false || !hasFriends() || !ext().share) { if (!feed || feed.error) sent.delete(id); return; }
  try { await B.online('/activity', ev); setTimeout(() => refresh(true), 1500); }
  catch (err) { if (/isn't available/i.test(err?.message || '')) feed.available = false; }
}
// One pack can hold several rare cards: wait until the player leaves the pack screens, then share only the best one.
const PACK_VIEWS = ['packOpening', 'reveal', 'packSummary', 'packReview'];
let packPick = [], packTimer = 0;
const score = c => { try { return window.EmberRare?.rareScore?.(c) ?? rank(c); } catch { return rank(c); } };
function flushPack() {
  clearTimeout(packTimer);
  const best = packPick.sort((a, b) => score(b) - score(a))[0]; packPick = [];
  if (best) post({ type: 'rare_pull', key: keyOf(best.id), card: snap(best) });
}
function onPack(list) {
  for (const c of list || []) if (worthy(c) && c.id && !packPick.some(x => x.id === c.id)) packPick.push(c);
  if (!packPick.length) return;
  clearTimeout(packTimer); packTimer = setTimeout(flushPack, 90000);
}
function onResult(r) {
  if (!r || !r.victory || r.online || !BOSS_LEVELS.includes(r.level) || !r.id || !B.bosses?.[r.level]) return;
  let lead = null; try { lead = B.active?.() || null; } catch {}
  post({ type: 'boss_win', key: keyOf(r.id), level: r.level, card: lead ? snap(lead) : null });
}
function onLevel(d) {
  const c = d?.creature; if (!c?.id) return;
  const m = MILESTONES.filter(x => (d.from || 1) < x && (d.to || 1) >= x).pop(); if (!m) return;
  post({ type: 'level_up', key: keyOf(c.id) + '-' + m, level: m, card: snap(c) });
}

/* ---------------------------------------------------------------- Words */
const an = w => (/^[AEIOU]/i.test(w) ? 'an ' : 'a ') + w;
function cardWords(c) { return `${c.shiny ? 'shiny ' : ''}${rarity(c)} ${nameOf(c)}`; }
function line(e, who) {
  const c = e.card;
  if (e.type === 'rare_pull' && c) return `${who} pulled ${an(cardWords(c))}!`;
  if (e.type === 'boss_win') return `${who} beat the boss ${esc(B.bosses?.[e.level] || 'of the island')}!`;
  if (e.type === 'level_up' && c) return `${who} raised ${esc(nameOf(c))} to Level ${e.level}!`;
  return `${who} had a great moment!`;
}
function detail(e) {
  const c = e.card;
  if (e.type === 'rare_pull' && c) { const r = window.EmberRare?.rareReasons?.(c)?.[0]; return r ? esc(r.text) : 'Rare find from a pack'; }
  if (e.type === 'boss_win') return `Boss quest · Level ${e.level}${c ? ' · led by ' + esc(nameOf(c)) : ''}`;
  if (e.type === 'level_up') return `Level ${e.level} milestone`;
  return '';
}
function mineWhat(e) {
  const c = e.card;
  if (e.type === 'rare_pull' && c) return cardWords(c);
  if (e.type === 'boss_win') return `win over ${B.bosses?.[e.level] || 'the boss'}`;
  if (e.type === 'level_up' && c) return `Level ${e.level} ${nameOf(c)}`;
  return 'highlight';
}
function cheerText(e) {
  const names = e.cheerers || [], n = e.cheers || 0; if (!n) return '';
  const first = names[0] || 'A friend', more = n - 1;
  return `${first}${more > 0 ? ` and ${more} other${more > 1 ? 's' : ''}` : ''} cheered your ${mineWhat(e)}!`;
}
function ago(t) {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s / 60)} min ago`; if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400); return d === 1 ? 'yesterday' : `${d} days ago`;
}
function art(e) {
  if (e.card) { try { return B.art(e.card); } catch {} }
  if (e.type === 'boss_win' && BOSS_ART[e.level]) return `<img src="/art/bosses/${BOSS_ART[e.level]}.webp" alt="" width="64" height="64" loading="lazy" decoding="async">`;
  return '<span aria-hidden="true">✨</span>';
}
const ICON = { rare_pull: '✨', boss_win: '👑', level_up: '⭐' };

/* ---------------------------------------------------------------- Cheers for me: toast once */
function tellCheers() {
  if (!feed?.mine?.length) return;
  const told = ext().told, fresh = feed.mine.filter(e => e.cheers > (told[e.id] || 0));
  if (!fresh.length) return;
  for (const e of feed.mine) if (e.cheers) told[e.id] = e.cheers;
  for (const id of Object.keys(told)) if (!feed.mine.some(e => e.id === id && e.cheers)) delete told[id];
  B.save();
  const top = fresh.sort((a, b) => b.cheers - a.cheers)[0];
  try { B.toast('🎉 ' + cheerText(top)); } catch {}
}

/* ---------------------------------------------------------------- Unread dot on Friends */
function unread() { return (feed?.events || []).filter(e => e.at > ext().seen).length; }
function paintDot() {
  const n = signedIn() && ext() ? unread() : 0;
  for (const tab of $$('.uiPTab[data-go="friends"], .uiTabTile[data-go="friends"], .nav [data-go="friends"], .bottomNav [data-go="friends"], nav [data-go="friends"]')) {
    let d = $('.actDot', tab);
    if (!d) { if (!n) continue; d = document.createElement('i'); d.className = 'actDot'; d.setAttribute('aria-hidden', 'true'); tab.append(d); if (getComputedStyle(tab).position === 'static') tab.classList.add('actDotHost'); }
    d.hidden = !n; tab.toggleAttribute('data-activity-new', !!n);
  }
}
function markSeen() {
  const top = Math.max(0, ...(feed?.events || []).map(e => e.at));
  if (top > ext().seen) { ext().seen = top; B.save(); paintDot(); }
}

/* ---------------------------------------------------------------- Friends page panel */
function ensurePanel() {
  if (B.view !== 'friends' || !$('#friendLists')) return null;
  let p = $('#actPanel');
  if (!p) {
    p = document.createElement('section'); p.id = 'actPanel'; p.className = 'panel actPanel'; p.setAttribute('aria-labelledby', 'actTitle');
    $('#app').append(p);
  }
  return p;
}
function itemHTML(e, mine) {
  const who = mine ? 'You' : `<b>${esc(e.username)}</b>`;
  const cheer = mine
    ? (e.cheers ? `<p class="actCheers">🎉 ${esc(cheerText(e))}</p>` : '<p class="actCheers none">No cheers yet</p>')
    : `<button type="button" class="actCheer${e.cheered ? ' on' : ''}" data-act-cheer="${esc(e.id)}" ${e.cheered ? 'disabled' : ''} aria-label="${e.cheered ? 'You cheered this' : `Cheer ${esc(e.username)}`}"><span aria-hidden="true">🎉</span> ${e.cheered ? 'Cheered' : 'Cheer'}${e.cheers ? ` <small>${e.cheers}</small>` : ''}</button>`;
  return `<li class="actItem actT-${esc(e.type)}${!mine && e.at > ext().seen ? ' new' : ''}"><span class="actArt">${art(e)}<i aria-hidden="true">${ICON[e.type] || '✨'}</i></span>
    <div class="actText"><p class="actLine">${line(e, who)}</p><p class="actSub">${detail(e)} · <time datetime="${new Date(e.at).toISOString()}">${ago(e.at)}</time></p>${mine ? cheer : ''}</div>${mine ? '' : cheer}</li>`;
}
function paintPanel() {
  const p = ensurePanel(); if (!p) return;
  const a = ext(), list = tab === 'mine' ? feed?.mine || [] : feed?.events || [], n = unread();
  let body;
  if (!feed || loading && !feed) body = '<p class="actEmpty">Loading friend activity…</p>';
  else if (feed.error) body = '<p class="actEmpty">Friend activity could not load right now. It will try again soon.</p>';
  else if (feed.available === false) body = `<p class="actEmpty">Activity isn't available yet.</p>`;
  else if (tab === 'friends' && !hasFriends()) body = '<p class="actEmpty">Add friends to see their rare finds, boss wins and level milestones here.</p>';
  else if (!list.length) body = `<p class="actEmpty">${tab === 'mine' ? (a.share ? 'Your rare pack pulls, boss wins and level 25/50/75/100 Mythlings will show here for your friends to cheer.' : 'Sharing is off, so nothing new is shared.') : 'No highlights from your friends yet. Check back soon!'}</p>`;
  else body = `<ul class="actList">${list.map(e => itemHTML(e, tab === 'mine')).join('')}</ul>`;
  const focus = document.activeElement && p.contains(document.activeElement) ? document.activeElement.dataset.actFocus || document.activeElement.dataset.actCheer : null;
  p.innerHTML = `<header class="actHead"><h2 id="actTitle"><span aria-hidden="true">🎉</span> Activity</h2>
    <div class="actTabs" role="tablist" aria-label="Activity">
      <button type="button" role="tab" data-act-focus="friends" data-act-tab="friends" aria-selected="${tab === 'friends'}">Friends${n && tab !== 'friends' ? ' <i class="actNew" aria-label="new">●</i>' : ''}</button>
      <button type="button" role="tab" data-act-focus="mine" data-act-tab="mine" aria-selected="${tab === 'mine'}">Mine</button></div></header>
    <div class="actBody" role="tabpanel">${body}</div>
    <div class="actShare"><span id="actShareLbl">Share my highlights with friends</span>
      <button type="button" class="actSwitch" role="switch" data-act-focus="share" aria-checked="${a.share}" aria-labelledby="actShareLbl"><span>${a.share ? 'On' : 'Off'}</span></button>
      <small class="actNote" role="status">${esc(note || (a.share ? 'Only accepted friends can see them. No chat, just cheers.' : 'Off: nothing new is shared.'))}</small></div>`;
  $$('[data-act-tab]', p).forEach(b => b.onclick = () => { tab = b.dataset.actTab; note = ''; paintPanel(); if (tab === 'friends') markSeen(); });
  $$('[data-act-cheer]', p).forEach(b => b.onclick = () => cheer(b));
  $('.actSwitch', p).onclick = toggleShare;
  if (focus) $(`[data-act-focus="${CSS.escape(focus)}"], [data-act-cheer="${CSS.escape(focus)}"]`, p)?.focus({ preventScroll: true });
  if (tab === 'friends' && feed?.events?.length) markSeen();
}
async function cheer(b) {
  const id = b.dataset.actCheer, e = feed?.events?.find(x => x.id === id); if (!e || e.cheered) return;
  b.disabled = true;
  try {
    const r = await B.online(`/activity/${encodeURIComponent(id)}/cheer`, {});
    e.cheered = true; e.cheers = r.cheers; b.classList.add('pop');
    setTimeout(paintPanel, 450);
  } catch (err) { b.disabled = false; try { B.toast(err?.message || 'Could not cheer right now.'); } catch {} }
}
async function toggleShare() {
  const a = ext(); a.share = !a.share; B.save();
  note = a.share ? 'On: your next highlights will be shared with friends.' : 'Off: nothing new is shared, and your shared highlights are hidden.';
  paintPanel();
  if (!a.share && feed?.available !== false) { try { await B.online('/activity/clear', {}); await refresh(true); } catch {} }
}

/* ---------------------------------------------------------------- Wiring */
if (B) {
  ext();
  addEventListener('ember:packReveal', e => onPack([e.detail?.creature]));
  addEventListener('ember:packSummary', e => onPack(e.detail?.creatures));
  addEventListener('ember:cardResult', e => onResult(e.detail));
  addEventListener('ember:levelUp', e => onLevel(e.detail));
  addEventListener('ember:friends', () => { if (B.view !== 'friends') return; if (!$('#actPanel')) { note = ''; paintPanel(); refresh(true); } else refresh(); });
  addEventListener('ember:frame', e => { if (packPick.length && !PACK_VIEWS.includes(e.detail?.view)) flushPack(); requestAnimationFrame(paintDot); });
  addEventListener('pagehide', () => { if (packPick.length) flushPack(); });
  setTimeout(() => refresh(true), 5000);
  setInterval(() => { if (!document.hidden) refresh(); }, 90000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.EmberActivity = { refresh: () => refresh(true), post, feed: () => feed, cheerText, share: () => ext().share, setShare: on => { if (!!on !== ext().share) return toggleShare(); } };
  injectCSS();
}

/* ---------------------------------------------------------------- Styles */
function injectCSS() {
  if ($('#actStyles')) return;
  const css = document.createElement('style'); css.id = 'actStyles';
  css.textContent = `
.actPanel{max-width:1180px;margin:18px auto 28px;box-sizing:border-box;min-width:0;width:calc(100% - 24px);color:var(--ui-text,#efe6d2)}
.actPanel *{box-sizing:border-box}
.actHead{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
.actHead h2{margin:0;font-family:var(--ui-display,Georgia,serif);color:#ffe6b0;font-size:clamp(20px,2.4vw,26px)}
.actTabs{display:flex;gap:6px;padding:4px;border-radius:99px;background:#0006;border:1px solid #e9b75a55}
.actTabs button{min-height:40px;padding:6px 16px;border-radius:99px;border:0;background:transparent;color:#f2e8d6;font:700 15px system-ui,sans-serif;cursor:pointer}
.actTabs button[aria-selected="true"]{background:linear-gradient(#f3c55d,#c98a2b);color:#2a1a06}
.actNew{color:#ff5a4a;font-style:normal;font-size:12px;vertical-align:top}
.actList{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr));gap:10px}
.actItem{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;background:linear-gradient(135deg,#2a1d33cc,#1b1424cc);border:1px solid #e9b75a44;min-width:0}
.actItem.new{border-color:#ffd36a;box-shadow:0 0 0 1px #ffd36a55,0 0 14px #ffb84a33}
.actArt{position:relative;flex:0 0 64px;width:64px;height:64px;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 50% 40%,#5b3f74,#1a1222);border:2px solid #e9b75a99;display:grid;place-items:center}
.actArt > :not(i){width:100%;height:100%;object-fit:contain;max-width:100%;max-height:100%}
.actArt img,.actArt svg,.actArt canvas{width:100%!important;height:100%!important;object-fit:contain}
.actArt i{position:absolute;right:-2px;bottom:-2px;width:24px;height:24px;border-radius:50%;background:#1b1424;border:1px solid #e9b75a;display:grid;place-items:center;font-style:normal;font-size:13px}
.actText{flex:1 1 auto;min-width:0}
.actLine{margin:0;font-size:15.5px;line-height:1.3;overflow-wrap:anywhere}
.actLine b{color:#ffd98a}
.actSub{margin:3px 0 0;font-size:13px;color:#cbbfa8;overflow-wrap:anywhere}
.actCheers{margin:5px 0 0;font-size:13.5px;color:#ffe08a;font-weight:700}
.actCheers.none{color:#a99f8c;font-weight:400}
.actCheer{flex:0 0 auto;min-height:44px;min-width:88px;padding:6px 12px;border-radius:12px;border:1px solid #f3c55d;background:linear-gradient(#ffcf6a,#d58f2a);color:#2a1a06;font:800 14.5px system-ui,sans-serif;cursor:pointer;white-space:nowrap}
.actCheer small{display:inline-block;margin-left:2px;padding:0 6px;border-radius:99px;background:#0003;font-size:12px}
.actCheer.on{background:#3a2c18;color:#ffe08a;border-color:#a77b35;cursor:default}
.actCheer.pop{animation:actPop .45s ease-out}
@keyframes actPop{0%{transform:scale(1)}40%{transform:scale(1.18) rotate(-4deg)}100%{transform:scale(1)}}
.actEmpty{margin:4px 0;color:#d8ccb4}
.actShare{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-top:14px;padding-top:12px;border-top:1px solid #e9b75a33;font-size:15px}
.actSwitch{position:relative;min-width:76px;min-height:40px;padding:0 12px 0 36px;border-radius:99px;border:1px solid #e9b75a88;background:#3a2c18;color:#f2e8d6;font:800 14px system-ui,sans-serif;cursor:pointer;text-align:left}
.actSwitch::before{content:"";position:absolute;left:6px;top:50%;width:24px;height:24px;margin-top:-12px;border-radius:50%;background:#8a7a64;transition:background .2s}
.actSwitch[aria-checked="true"]{background:linear-gradient(#5fbf6a,#2f8a3d);border-color:#9fe3a8}
.actSwitch[aria-checked="true"]::before{background:#fff}
.actNote{flex:1 1 100%;color:#b9ad96;font-size:13px}
.actDot{position:absolute;top:4px;left:6px;z-index:5;width:14px;height:14px;border-radius:50%;background:#43d17a;border:2px solid #fff3c8;box-shadow:0 0 10px #43d17aaa;pointer-events:none}
.actDot[hidden]{display:none}
.actDotHost{position:relative}
body.uiExact .actPanel{margin-top:18px}
@media (max-width:560px){.actPanel{width:100%;margin:14px 0 20px;padding:14px 12px}.actItem{flex-wrap:wrap}.actText{flex-basis:calc(100% - 80px)}.actItem > .actCheer{margin-left:76px}.actArt{flex-basis:56px;width:56px;height:56px}.actTabs button{padding:6px 12px}}
@media (prefers-reduced-motion:reduce){.actCheer.pop{animation:none}}
`;
  document.head.append(css);
}
