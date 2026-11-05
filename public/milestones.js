// EMBERLINGS collection milestones: a celebration banner (with a Share button) the moment you complete a species
// (every slot on the Collection page: forms, rarities, mutations and Shiny), a rarity set (a card of that rarity for
// every species) or a mutation set (that mutation on every species), plus a "Milestones" list on the Collection page
// with the ones you have earned and the next 3 closest. Counting uses the Collection page's own maths (collection.js).
// Checked after pack reveals, fusions, trades, on load and whenever a screen is drawn. The first time it runs, every
// milestone you already have is marked as earned quietly, so old completions are never celebrated.
// Purely informational: no rewards. Save data (additive): state.ember.milestones = { earned: { id: timestamp } }.
import { RARITIES, MUTATIONS, rarityRank } from './combat-rules.js';
import { collectionStats } from './collection.js';

// ---------- Milestone maths (pure, also used by tests/milestones.mjs) ----------
export const RARITY_COLORS = ['#bdb5a3', '#7fd28a', '#6fb4ff', '#c58cff', '#ffb84d', '#8ff0ff', '#ff7ad9'];
const no = k => 'No. ' + String(k + 1).padStart(3, '0');

// Every milestone with its progress. stats comes from collectionStats(); names[k] is the species name (or null).
export function milestoneList(stats, names = []) {
  const sp = stats.species, n = sp.length, out = [];
  for (const s of sp) out.push({ id: 'species-' + s.kind, type: 'species', kind: s.kind, name: `${names[s.kind] || no(s.kind)} complete`, desc: 'Every form, rarity, mutation and Shiny', have: s.filled, total: s.total, unit: 'slots' });
  RARITIES.forEach((r, i) => out.push({ id: 'rarity-' + r.toLowerCase(), type: 'rarity', i, name: `${r} set`, desc: `A ${r} card of every species`, have: sp.filter(s => s.rarities[i] > 0).length, total: n, unit: 'species' }));
  MUTATIONS.forEach((m, i) => out.push({ id: 'mutation-' + m.id, type: 'mutation', i, mutation: m.id, name: `${m.name} set`, desc: `A ${m.name} mutation on every species`, have: sp.filter(s => s.mutations[i] > 0).length, total: n, unit: 'species' }));
  for (const m of out) m.done = m.total > 0 && m.have >= m.total;
  return out;
}

const validData = d => !!d && typeof d === 'object' && !!d.earned && typeof d.earned === 'object' && !Array.isArray(d.earned);

// Compares what is complete now with what was saved. With no saved data (first run), everything already complete
// is recorded quietly (seeded: true, fresh: []). Otherwise fresh lists the milestones completed since last time.
// Earned milestones stay earned even if the cards are later traded or fused away.
export function detect(saved, list, now = Date.now()) {
  if (!validData(saved)) {
    const earned = {};
    for (const m of list) if (m.done) earned[m.id] = now;
    return { data: { ...(saved && typeof saved === 'object' ? saved : {}), earned }, fresh: [], seeded: true, changed: true };
  }
  const fresh = list.filter(m => m.done && !saved.earned[m.id]);
  if (!fresh.length) return { data: saved, fresh, seeded: false, changed: false };
  const earned = { ...saved.earned };
  for (const m of fresh) earned[m.id] = now;
  return { data: { ...saved, earned }, fresh, seeded: false, changed: true };
}

// The unearned milestones you are closest to: highest share done first, then fewest pieces left, then smaller sets.
export function nextClosest(list, earned = {}, count = 3) {
  const order = { rarity: 0, mutation: 1, species: 2 };
  return list.filter(m => !m.done && !earned[m.id])
    .sort((a, b) => b.have / b.total - a.have / a.total || (a.total - a.have) - (b.total - b.have) || a.total - b.total || order[a.type] - order[b.type])
    .slice(0, count);
}

// Earned milestones with their dates, newest first (unknown ids from a future version are skipped).
export function earnedList(list, earned = {}) {
  return list.filter(m => earned[m.id]).map(m => ({ ...m, at: earned[m.id] })).sort((a, b) => b.at - a.at || list.indexOf(a) - list.indexOf(b));
}

// ---------- In the game ----------
const B = globalThis.window?.EmberBridge;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const dateOf = t => { try { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
const BUSY = v => !v || ['reveal', 'packOpening', 'packReview', 'cardBattle', 'battle', 'boss', 'tutorial', 'username', 'online', 'arena', 'hollow'].includes(v) || /^train/.test(v);
const BLOCKERS = '#guidedTour, #dailyPanel, #whatsNewPanel, .tradeDone, #tradeAlert, #rareFind, .biIntro, .uiLvUp, .lvlUp, .levelUpModal, .fxStage, .psStage, #pfPicker, .dsOverlay, #cardDetails, #emberTip';

function current() {
  const st = B.state, stats = collectionStats(st.owned, st.discovered, B.species.length);
  const names = stats.species.map(s => s.seen ? B.species[s.kind]?.name : null);
  return milestoneList(stats, names);
}
const earnedNow = () => (validData(B.state?.ember?.milestones) ? B.state.ember.milestones.earned : {});

let queue = [], waitUntil = 0, timer = 0;
// Look for new milestones; celebrate any (after a short pause so the pack, fusion or trade screen shows first).
function check(pause = 0) {
  const st = B.state; if (!st || !Array.isArray(st.owned)) return [];
  let list; try { list = current(); } catch (err) { console.warn('milestones', err); return []; }
  const r = detect(st.ember?.milestones, list);
  if (r.changed) {
    if (!st.ember || typeof st.ember !== 'object') st.ember = {};
    st.ember.milestones = r.data;
    try { B.save(); } catch { /* the game shows its own save error */ }
  }
  if (r.fresh.length) {
    queue.push(...r.fresh.filter(m => !queue.some(q => q.id === m.id)));
    waitUntil = Math.max(waitUntil, Date.now() + pause);
    schedule();
  }
  return r.fresh;
}
function schedule() { if (!timer) timer = setInterval(tryShow, 600); }
function tryShow() {
  if (!queue.length) { clearInterval(timer); timer = 0; return; }
  if (Date.now() < waitUntil || $('#msBanner') || BUSY(B.view) || !B.state?.tutorialComplete || $(BLOCKERS)) return;
  // Biggest first: species, then rarity sets, then mutation sets; the rest are named under it.
  const rank = { species: 0, rarity: 1, mutation: 2 }, list = queue.splice(0).sort((a, b) => rank[a.type] - rank[b.type]);
  clearInterval(timer); timer = 0;
  banner(list[0], list.slice(1));
}

function iconHTML(m, big) {
  if (m.type === 'species') return `<span class="msPic">${B.art({ kind: m.kind })}</span>`;
  if (m.type === 'rarity') return `<span class="msGem" style="--c:${RARITY_COLORS[m.i]}">◆</span>`;
  const mu = MUTATIONS[m.i];
  return `<span class="msGem msMut${big ? ' big' : ''}" style="--c:${mu.color}">${mu.icon}</span>`;
}

function banner(m, more) {
  $('#msBanner')?.remove();
  const el = document.createElement('div'); el.id = 'msBanner'; el.className = 'msBanner msType-' + m.type;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-labelledby', 'msTitle'); el.dataset.id = m.id;
  el.innerHTML = `<div class="msBox"><span class="msRays" aria-hidden="true"></span><span class="msChip">Collection milestone!</span>
    <div class="msIcon">${iconHTML(m, true)}</div><h2 id="msTitle">${esc(m.name)}</h2><p class="msDesc">${esc(m.desc)}</p>
    ${more.length ? `<p class="msMore">And ${more.length} more: ${esc(more.slice(0, 3).map(x => x.name).join(', '))}${more.length > 3 ? ' …' : ''}</p>` : ''}
    <div class="msRow"><button type="button" class="msOk">Awesome!</button><button type="button" class="msShare"><span aria-hidden="true">📤</span> Share</button></div>
    <p class="msNote" role="status"></p>${B.view !== 'collection' ? '<button type="button" class="msSee">See your milestones ›</button>' : ''}</div>`;
  document.body.append(el);
  let auto = setTimeout(() => done(), 12000);
  const stop = () => { clearTimeout(auto); auto = 0; };
  const done = () => { stop(); if (!el.isConnected) return; el.remove(); if (queue.length) { waitUntil = Date.now() + 400; schedule(); } };
  $('.msOk', el).onclick = done;
  el.addEventListener('pointerdown', stop); el.addEventListener('keydown', e => { stop(); if (e.key === 'Escape') done(); });
  el.onclick = e => { if (e.target === el) done(); };
  wireShare($('.msShare', el), $('.msNote', el), m);
  const see = $('.msSee', el); if (see) see.onclick = () => { done(); B.go('collection'); };
  $('.msOk', el).focus({ preventScroll: true });
}

// ---------- Share picture (drawn with the share-card.js helpers) ----------
function bestCard(m, score) {
  const test = m.type === 'species' ? c => c.kind === m.kind : m.type === 'rarity' ? c => rarityRank(c) === m.i : c => c.mutation === m.mutation;
  let best = null, top = -Infinity;
  for (const c of B.state.owned || []) if (c && test(c)) { const s = score(c); if (s > top) { best = c; top = s; } }
  return best;
}
async function picture(m) {
  const K = (await import('/share-card.js')).ShareKit;
  await K.fonts();
  const cv = K.canvas(), ctx = cv.getContext('2d'), card = bestCard(m, K.score);
  const color = m.type === 'rarity' ? RARITY_COLORS[m.i] : m.type === 'mutation' ? MUTATIONS[m.i].color : card ? K.accentOf(card) : '#f2c45f';
  const top = 340, snap = card ? K.snapshot(card) : null, k = snap ? Math.min(540 / snap.w, 700 / snap.h) : 1;
  const cw = snap ? snap.w * k : 0, ch = snap ? snap.h * k : 520;
  K.backdrop(ctx, color, top + ch / 2);
  await K.logo(ctx, 300, 40);
  K.title(ctx, 'MILESTONE!', 240);
  K.line(ctx, m.name, 300, { size: 46, color: '#f3d48a' });
  if (snap) await K.drawCard(ctx, card, (K.W - cw) / 2, top, k, snap);
  else { ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '260px serif'; ctx.fillStyle = color; ctx.fillText(m.type === 'mutation' ? MUTATIONS[m.i].icon : '◆', K.W / 2, top + ch / 2); ctx.restore(); }
  const y = top + ch, at = earnedNow()[m.id];
  K.line(ctx, m.desc, y + 62, { size: 38, color: '#ffe3a0' });
  K.badges(ctx, [{ text: `${m.total} / ${m.total} ${m.unit}`, color }, ...(at ? [{ text: `Earned ${dateOf(at)}`, color: '#f2c45f' }] : [])], y + 92);
  K.footer(ctx);
  return K.deliver(cv, `emberlings-${K.slug(m.name)}.png`, `${m.name} in EMBERLINGS!`);
}
function wireShare(btn, note, m) {
  btn.addEventListener('click', async e => {
    e.stopPropagation(); if (btn.disabled) return;
    btn.disabled = true; btn.setAttribute('aria-busy', 'true'); if (note) note.textContent = 'Making your picture…';
    let msg; try { msg = await picture(m); } catch (err) { console.warn('milestones', err); msg = 'Sorry, the picture could not be made.'; }
    btn.disabled = false; btn.removeAttribute('aria-busy');
    if (note?.isConnected) note.textContent = msg; else if (msg) B.toast?.(msg);
  });
}

// ---------- Milestones list on the Collection page ----------
let showAll = false;
function panel() {
  if (B.view !== 'collection') return;
  const anchor = $('.colPage .colTop'); if (!anchor) return;
  const list = current(), earned = earnedNow(), got = earnedList(list, earned), next = nextClosest(list, earned, 3);
  const shown = showAll ? got : got.slice(0, 6);
  const sec = $('#msPanel') || document.createElement('section');
  sec.id = 'msPanel'; sec.className = 'msPanel'; sec.setAttribute('aria-labelledby', 'msHead');
  sec.innerHTML = `<div class="msHeadRow"><h2 id="msHead">🏅 Milestones</h2><span class="msCount">${got.length} of ${list.length} earned</span></div>
   <p class="msSub">Complete a species, a rarity set or a mutation set. Just for bragging rights: milestones give no rewards.</p>
   <div class="msCols"><div><h3>Earned</h3>${got.length ? `<ul class="msEarned">${shown.map(m => `<li>${iconHTML(m)}<div><strong>${esc(m.name)}</strong><small>${esc(dateOf(m.at))}</small></div><button type="button" class="msMini" data-ms-share="${esc(m.id)}" aria-label="Share ${esc(m.name)} as a picture" title="Share as a picture">📤</button></li>`).join('')}</ul>
     ${got.length > 6 ? `<button type="button" class="msAll">${showAll ? 'Show fewer' : `Show all ${got.length}`}</button>` : ''}` : '<p class="msEmpty">None yet. Your first one will be celebrated here.</p>'}<p class="msNote" role="status"></p></div>
    <div><h3>Next closest</h3>${next.length ? `<ol class="msNext">${next.map(m => `<li>${iconHTML(m)}<div><strong>${esc(m.name)}</strong><small>${esc(m.desc)}</small><span class="msBar" style="--p:${(m.have / m.total * 100).toFixed(1)}%"><i></i></span><small>${m.have} / ${m.total} ${m.unit}</small></div></li>`).join('')}</ol>` : '<p class="msEmpty">Every milestone earned. Amazing!</p>'}</div></div>`;
  if (!sec.isConnected) anchor.after(sec);
  const note = $('.msNote', sec);
  sec.querySelectorAll('[data-ms-share]').forEach(b => { const m = list.find(x => x.id === b.dataset.msShare); if (m) wireShare(b, note, m); });
  const all = $('.msAll', sec); if (all) all.onclick = () => { showAll = !showAll; panel(); };
}

const CSS = `
/* Collection milestones (public/milestones.js) */
.msBanner{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;padding:16px;background:#05070cb8;backdrop-filter:blur(2px)}
.msBox{position:relative;overflow:hidden;width:min(440px,100%);max-height:calc(100dvh - 32px);overflow-y:auto;padding:24px 22px 18px;border-radius:18px;text-align:center;color:#f6e7c4;background:radial-gradient(ellipse at 50% 0,#3a2c18,transparent 65%),linear-gradient(180deg,#1b2030,#0d111a);border:2px solid #e9b75a;box-shadow:0 0 0 1px #000,0 0 40px #e9a23a55,0 20px 50px #000c;animation:msIn .45s cubic-bezier(.2,1.4,.4,1) both}
.msRays{position:absolute;left:50%;top:120px;width:720px;height:720px;margin:-360px 0 0 -360px;pointer-events:none;background:repeating-conic-gradient(#ffd27a1f 0 8deg,transparent 8deg 22deg);border-radius:50%;mask:radial-gradient(circle,#000 20%,transparent 65%);-webkit-mask:radial-gradient(circle,#000 20%,transparent 65%);animation:msSpin 24s linear infinite}
.msBox>*:not(.msRays){position:relative}
.msChip{display:inline-block;padding:5px 14px;border-radius:99px;background:linear-gradient(180deg,#f3c66b,#c98a2c);color:#20150a;font:700 14px/1.2 Cinzel,Georgia,serif;letter-spacing:.06em;text-transform:uppercase}
.msIcon{display:grid;place-items:center;margin:14px auto 6px}
.msBanner .msPic{width:120px;height:120px;border-radius:50%;box-shadow:0 0 0 3px #e9b75a,0 0 30px #ffd27a88}
.msBanner .msPic .mythlingArt{width:120px;height:120px}
.msBanner .msGem{width:110px;height:110px;font-size:64px;box-shadow:0 0 0 3px var(--c),0 0 34px var(--c)}
.msBox h2{margin:6px 0 4px;font:700 clamp(26px,6vw,32px)/1.15 Cinzel,Georgia,serif;color:#ffe2a0;text-shadow:0 2px 12px #e9a23a77}
.msDesc{margin:0;font-size:17px;color:#e6dcc4}.msMore{margin:8px 0 0;font-size:14px;color:#c8bfa8}
.msRow{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:18px}
.msOk,.msShare{min-height:48px;padding:0 24px;border-radius:12px;font:700 19px 'Cormorant Garamond',Georgia,serif;cursor:pointer;touch-action:manipulation}
.msOk{border:1px solid #ffe2a0;background:linear-gradient(180deg,#f3c66b,#c98a2c);color:#20150a}
.msShare{border:1.5px solid #fff1c2;background:#ffffff14;color:#fff1c2}
.msShare:disabled,.msMini:disabled{opacity:.7;cursor:progress}
.msOk:focus-visible,.msShare:focus-visible,.msSee:focus-visible,.msMini:focus-visible,.msAll:focus-visible{outline:3px solid #ffdd7e;outline-offset:3px}
.msNote{min-height:1.2em;margin:8px 0 0;font-size:15px;color:#c8d1ec}
.msSee{min-height:44px;margin-top:2px;padding:6px 10px;background:none;border:0;color:#e9b75a;font:inherit;font-size:15px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.msPic{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:8px;overflow:hidden;background:radial-gradient(circle,#26324a,#121822)}
.msPic .mythlingArt{width:44px;height:44px}
.msGem{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;font-size:24px;line-height:1;color:var(--c);background:radial-gradient(circle,color-mix(in srgb,var(--c) 30%,#0d1219),#0d1219);box-shadow:0 0 0 1.5px var(--c)}
.msPanel{margin:14px 0 0;padding:14px 16px;border:1px solid var(--ui-goldline,#7a5a2a);border-radius:10px;background:linear-gradient(180deg,#151c27,#0e131b);color:var(--ui-text,#efe6d2)}
.msHeadRow{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 12px}
.msPanel h2{margin:0;font-size:19px}.msCount{font-size:14px;color:#ffe2a0;font-weight:700}
.msSub{margin:4px 0 10px;font-size:13px;color:var(--ui-muted,#b9ae98)}
.msCols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}
.msPanel h3{margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--ui-muted,#b9ae98)}
.msEarned,.msNext{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.msEarned{grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}
.msEarned li,.msNext li{display:flex;gap:10px;align-items:center;min-width:0;padding:8px 10px;border-radius:8px;background:#0d1219;border:1px solid #2c2618}
.msEarned li{border-color:#6b5226}
.msEarned li>div,.msNext li>div{min-width:0;flex:1}
.msEarned strong,.msNext strong{display:block;font-size:15px;line-height:1.25;color:#f6e7c4}
.msEarned small,.msNext small{display:block;font-size:12px;color:var(--ui-muted,#b9ae98)}
.msMini{flex:none;width:44px;height:44px;border-radius:10px;border:1px solid #6b5226;background:#1a1f2b;color:#ffe2a0;font-size:18px;cursor:pointer}
.msAll{min-height:44px;margin-top:6px;padding:6px 0;background:none;border:0;color:var(--ui-gold,#e9b75a);font:inherit;font-size:14px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.msBar{--p:0%;display:block;height:6px;margin:5px 0 2px;border-radius:9px;background:#262b35;overflow:hidden}.msBar i{display:block;height:100%;width:var(--p);background:linear-gradient(90deg,#c98a2c,#ffd27a)}
.msEmpty{margin:0;font-size:14px;color:var(--ui-muted,#b9ae98)}
.msPanel .msNote{text-align:left;font-size:14px}
@media(max-width:760px){.msCols{grid-template-columns:minmax(0,1fr)}}
@keyframes msIn{from{opacity:0;transform:scale(.82) translateY(14px)}to{opacity:1;transform:none}}
@keyframes msSpin{to{transform:rotate(360deg)}}
html[data-fx="light"] .msRays{animation:none}html[data-fx="light"] .msBox{animation-duration:.25s;animation-timing-function:ease-out}
html[data-fx="off"] .msBox,html[data-fx="off"] .msRays{animation:none}
@media(prefers-reduced-motion:reduce){.msBox,.msRays{animation:none}}
`;

if (B) {
  const style = document.createElement('style'); style.id = 'msStyles'; style.textContent = CSS; document.head.appendChild(style);
  addEventListener('ember:packReveal', () => check(2600));
  addEventListener('ember:packSummary', () => check(1800));
  addEventListener('ember:fusion', () => check(1800));
  addEventListener('ember:tradeComplete', () => check(1500));
  let q = false;
  addEventListener('ember:frame', e => {
    if (q) return; q = true;
    queueMicrotask(() => { q = false; check(800); if (e.detail?.view === 'collection') panel(); else showAll = false; });
  });
  // On load (also records old completions quietly the first time).
  setTimeout(() => check(1500), 0);
  window.EmberMilestones = Object.freeze({ list: () => current(), earned: () => ({ ...earnedNow() }), check: () => check(0).map(m => m.id) });
}
