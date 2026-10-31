// Exact Home, Adventure HQ and Mythling Vault screens built from the supplied mockups (public/art/ui/*.webp).
// The cleaned mockup is the background; live values, our cards and our art are placed at the mockup's pixel positions.
// Below EXACT_MIN_WIDTH the stacked layouts in ui.js are used instead.
const B = window.EmberBridge, UI = window.EmberUI;
const EXACT_MIN_WIDTH = 1000;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fmt = n => Math.floor(Number(n) || 0).toLocaleString();
const wide = () => innerWidth >= EXACT_MIN_WIDTH;
const ext = () => { const st = B.state; if (!st.ember || typeof st.ember !== 'object') st.ember = {}; return st.ember; };

// Canvas helpers: positions are given in mockup pixels and converted to percentages / container units.
function canvas(W, H, bg, cls, inner) {
  // The painted header (and the Vault's painted bottom bar) is cropped off; the shared live header sits above every page.
  const [top, bottom] = CROP[cls] || [0, H];
  return `<div class="uiXCrop" style="--ratio:${W / (bottom - top)};aspect-ratio:${W}/${bottom - top}"><div class="uiX ${cls}" style="--W:${W};aspect-ratio:${W}/${H};margin-top:${(-top / W * 100).toFixed(4)}%;background-image:url(${bg})">${inner}</div></div>`;
}
const CROP = { uiXHome: [78, 992], uiXMap: [66, 992], uiXVault: [80, 942], uiXWelcome: [87, 941], uiXPacks: [69, 1024], uiXMutation: [55, 991], uiXFusion: [52, 992], uiXFriends: [66, 992], uiXBattle: [62, 941] };
const box = (W, H) => (x0, y0, x1, y1) => `left:${(x0 / W * 100).toFixed(3)}%;top:${(y0 / H * 100).toFixed(3)}%;width:${((x1 - x0) / W * 100).toFixed(3)}%;height:${((y1 - y0) / H * 100).toFixed(3)}%`;
const fs = (W, px) => `font-size:calc(${px} / ${W} * 100cqw)`;
// Coin totals shrink to stay inside the painted coin pill.
const coinPx = (n, px, room = 4) => { const len = fmt(n).length; return len <= room ? px : px * room / len * 1.1; };
const logoAt = (W, H, x, y, h) => `<button class="uiXLogo" type="button" data-go="home" aria-label="EMBERLINGS home" style="left:${x / W * 100}%;top:${y / H * 100}%;--logo-h:calc(${h} / ${W} * 100cqw)">${UI.logoHTML()}</button>`;
const hot = (pos, attrs, label) => `<button class="uiHot" style="${pos}" ${attrs} aria-label="${esc(label)}"></button>`;
const text = (pos, W, px, cls, html, extra = '') => `<div class="uiTxt ${cls}" style="${pos};${fs(W, px)};${extra}">${html}</div>`;
// Our printed cards, scaled to fill a slot.
const fitCard = (pos, c, rot = 0) => `<div class="uiFit" style="${pos};transform:rotate(${rot}deg)"><div class="uiFitInner">${B.cardHTML(c)}</div></div>`;
function fitCards() { for (const f of $$('.uiFit')) { const inner = f.firstElementChild; if (!inner) continue; const s = f.clientWidth / 230; inner.style.transform = `scale(${s})`; f.style.height = f.style.height || ''; } }
const ro = new ResizeObserver(() => fitCards());

function deckTop(n = 3) {
  const seen = new Set(), out = [];
  for (const c of B.deck()) { if (c.cardType === 'trainer' || c.kind === undefined || seen.has(c.kind)) continue; seen.add(c.kind); out.push(c); }
  return out.length ? out.slice(0, n) : (B.state.owned || []).slice(0, n);
}

/* ---------------------------------------------------------------- Home (mockup 1586 × 992) */
function home() {
  if (!wide()) return UI.baseHome();
  const W = 1586, H = 992, p = box(W, H), st = B.state, cleared = (st.cleared || []).length, deck = deckTop(3), active = B.active?.() || st.owned?.[0];
  const fan = [[1152, 197, 1268, 375, -8, deck[1]], [1420, 197, 1536, 375, 8, deck[2]], [1268, 166, 1420, 398, 0, deck[0]]].filter(f => f[5]);
  return `<section class="uiHome uiExactPage">${canvas(W, H, '/art/ui/home.webp', 'uiXHome', `






   <h1 class="uiSr">Awaken the ember.</h1>
   ${hot(p(48, 430, 422, 500), 'data-go="map"', 'Explore islands')}
   ${st.cardBattle ? `<button class="uiXResume" id="uiResume" style="${p(48, 508, 422, 540)};${fs(W, 17)}">Resume card battle ›</button>` : ''}
   <div class="uiXFan">${fan.map(([x0, y0, x1, y1, r, c]) => fitCard(p(x0, y0, x1, y1), c, r)).join('')}</div>
   ${hot(p(1170, 413, 1515, 470), 'data-go="decks"', 'Edit deck')}${hot(p(1170, 483, 1515, 527), 'data-go="training"', 'Training field')}
   <div class="features uiXLayer">${hot(p(33, 560, 413, 800), 'data-go="inventory"', 'Mythling Collection')}${hot(p(423, 560, 787, 800), 'data-go="packs"', 'Open Packs')}${hot(p(798, 560, 1162, 800), 'data-go="fusion"', 'Fusion Lab')}${hot(p(1172, 560, 1553, 800), 'data-go="trading"', 'Friend Trading')}</div>
   ${text(p(113, 768, 330, 796), W, 19, 'uiXSub', `${fmt(st.owned.length)} cards &nbsp;•&nbsp; ${(st.discovered || []).length} / ${B.species.length} species`)}
   ${hot(p(32, 813, 1556, 913), 'data-go="map"', 'Your adventure')}
   ${text(p(150, 862, 400, 899), W, 27, 'uiXQuests', `${cleared} / 100 <small>quests</small>`)}
   <i class="uiXFill" style="${p(425, 885.5, 425 + 813 * cleared / 100, 888.5)}"></i>
   ${hot(p(60, 925, 185, 970), 'data-go="index"', 'Index')}${hot(p(215, 925, 380, 970), 'data-go="rules"', 'Battle Rules')}${hot(p(415, 925, 530, 970), 'data-go="vault"', 'Vault')}${hot(p(560, 925, 745, 970), 'data-go="mutation"', 'Mutation Vault')}
   <button class="uiHot" id="uiBackupBtn" style="${p(1290, 925, 1450, 970)}" aria-label="Save Backup"></button><button class="uiHot" id="uiGear" style="${p(1480, 925, 1545, 970)}" aria-label="Settings"></button>`)}
   ${UI.homeCards()}<div id="uiDrawer" class="uiXDrawer"></div></section>`;
}

/* ---------------------------------------------------------------- Adventure HQ (mockup 1586 × 992) */
// Level positions in mockup pixels: Ember Meadows uses the painted node spots; the other islands follow their painted terrain.
const MEADOW = [[150, 480], [214, 497], [273, 531], [341, 549], [410, 580], [471, 541], [474, 482], [530, 451], [625, 447]];
function along(points, n) {
  const seg = []; let total = 0;
  for (let i = 1; i < points.length; i++) { const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]); seg.push(d); total += d; }
  return Array.from({ length: n }, (_, k) => { let t = total * k / Math.max(1, n - 1), i = 0; while (i < seg.length - 1 && t > seg[i]) { t -= seg[i]; i++; } const a = points[i], b = points[i + 1], f = seg[i] ? t / seg[i] : 0; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; });
}
const ISLAND_PATHS = [null,
  [[615, 262], [700, 276], [790, 282], [880, 266], [960, 250], [1045, 225], [1075, 175], [1000, 150], [915, 172], [835, 192], [760, 196], [690, 182], [650, 140], [735, 118], [830, 108]],
  [[812, 690], [900, 694], [985, 700], [1070, 690], [1135, 650], [1095, 605], [1015, 618], [935, 628], [860, 615], [825, 568], [885, 530], [965, 545], [1045, 558], [1120, 540], [1085, 488], [1005, 474], [930, 482], [870, 470], [950, 442], [1035, 448]],
  [[250, 230], [340, 215], [430, 230], [520, 215], [610, 230], [700, 215], [790, 230], [880, 215], [970, 230], [1060, 215], [1060, 330], [970, 345], [880, 330], [790, 345], [700, 330], [610, 345], [520, 330], [430, 345], [340, 330], [250, 345], [250, 460], [340, 475], [430, 460], [520, 475], [610, 460]],
  [[250, 230], [330, 215], [410, 230], [490, 215], [570, 230], [650, 215], [730, 230], [810, 215], [890, 230], [970, 215], [1050, 230], [1050, 330], [970, 345], [890, 330], [810, 345], [730, 330], [650, 345], [570, 330], [490, 345], [410, 330], [330, 345], [250, 330], [250, 440], [330, 455], [410, 440], [490, 455], [570, 440], [650, 455], [730, 440], [810, 455]]];
function levelPos(l) {
  const r = B.regions.findIndex(x => l >= x[1] && l <= x[2]), reg = B.regions[r], i = l - reg[1];
  if (r === 0) return l === 10 ? [625, 447] : MEADOW[i];
  const pts = ISLAND_PATHS[r]; const n = reg[2] - reg[1] + 1;
  return r >= 3 ? pts[i % pts.length] : along(pts, n)[i];
}
let selected = null, shownRegion = null;
const regionOf = l => B.regions.findIndex(r => l >= r[1] && l <= r[2]);
const REGION_ART = [0, 5, 14, 3, 7];
const REGION_TEXT = ['Your journey begins in the meadows.', 'Crystal light hides clever rivals.', 'Icy winds test every deck.', 'Storms crackle over the valley.', 'Only the bravest enter the dark.'];
function questName(l) { return window.EmberUI.questName ? window.EmberUI.questName(l) : `Quest ${l}`; }
function map() {
  if (!wide()) return UI.baseMap();
  const W = 1586, H = 992, p = box(W, H), max = B.limit(), cleared = B.state.cleared || [];
  if (!selected) selected = Math.min(100, max);
  if (shownRegion === null) shownRegion = regionOf(selected);
  const node = l => {
    const [x, y] = levelPos(l), done = cleared.includes(l), locked = l > max && !done, boss = !!B.bosses[l], s = boss ? 44 : 38;
    return `<button class="node uiXNode ${done ? 'done' : ''} ${locked ? 'locked' : ''} ${boss ? 'boss' : ''} ${l === selected ? 'uiSel' : ''}" data-level="${l}" style="${p(x - s / 2, y - (boss ? 26 : s / 2), x + s / 2, y + (boss ? 26 : s / 2))};${fs(W, boss ? 19 : 17)}" aria-label="Quest ${l}${boss ? ', boss' : ''}${done ? ', completed' : locked ? ', locked' : ', ready'}"><span>${l}</span></button>`;
  };
  const levels = r => { const reg = B.regions[r], out = []; for (let l = reg[1]; l <= reg[2]; l++) out.push(l); return out; };
  const route = r => { const pts = levels(r).map(levelPos); return `<polyline points="${pts.map(q => q.join(',')).join(' ')}" />`; };
  const far = shownRegion >= 3;
  return `<section class="uiExactPage">${canvas(W, H, '/art/ui/map.webp', 'uiXMap', `



   ${far ? `<div class="uiXSheet" style="${p(180, 160, 1150, 810)}"><h2 style="${fs(W, 34)}">${esc(B.regions[shownRegion][0])} <small>${B.regions[shownRegion][1]} – ${B.regions[shownRegion][2]}</small></h2></div>` : ''}
   <svg class="uiXRoute" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${shownRegion > 0 ? route(shownRegion) : ''}</svg>
   ${levels(0).map(node).join('')}${shownRegion > 0 ? levels(shownRegion).map(node).join('') : ''}
   ${hot(p(170, 712, 410, 750), 'data-region="0"', 'Ember Meadows, levels 1 to 10')}${hot(p(745, 318, 1022, 384), 'data-region="1"', 'Crystalwood Forest, levels 11 to 25')}${hot(p(860, 725, 1032, 790), 'data-region="2"', 'Frozen Peaks, levels 26 to 45')}
   <button class="uiXChip ${shownRegion === 3 ? 'on' : ''}" data-region="3" style="${p(490, 846, 688, 886)};${fs(W, 15)}">Thunder Valley <b>46 – 70</b></button>
   <button class="uiXChip ${shownRegion === 4 ? 'on' : ''}" data-region="4" style="${p(696, 846, 892, 886)};${fs(W, 15)}">Shadow Realm <b>71 – 100</b></button>
   ${hot(p(914, 842, 950, 878), 'id="uiXPrev"', 'Previous level')}${hot(p(959, 842, 995, 878), 'id="uiXNext"', 'Next level')}
   <button class="uiXCurrent" id="uiXCurrent" style="${p(1013, 844, 1146, 878)};${fs(W, 16)}">Current level (${max})</button>
   <div id="uiQuest">${questPanel(selected)}</div>
   ${text(p(246, 930, 600, 962), W, 19, 'uiXJourney', `${cleared.length} / 100 levels complete`)}
   <i class="uiXFill" style="${p(456, 944.5, 456 + 720 * cleared.length / 100, 947.5)}"></i>`)}</section>`;
}
function questPanel(l) {
  const W = 1586, H = 992, p = box(W, H), r = regionOf(l), boss = B.bosses[l], cleared = (B.state.cleared || []).includes(l), locked = l > B.limit() && !cleared, deck = deckTop(3);
  let prize = null; try { prize = B.questPrize(l); } catch { }
  return `${text(p(1203, 98, 1560, 142), W, 33, 'uiXRegion', esc(B.regions[r][0]))}
   ${text(p(1205, 140, 1500, 166), W, 19, 'uiXLevel', `${boss ? 'Boss · ' : ''}Level ${l}`)}
   <div class="uiXArt" style="${p(1196, 179, 1561, 399)};${fs(W, 17)}">${UI.questArt(l)}</div>
   ${text(p(1208, 408, 1560, 458), W, 36, 'uiXQuest', esc(questName(l)))}
   ${text(p(1210, 456, 1560, 486), W, 21, 'uiXStatus ' + (locked ? 'locked' : cleared ? 'done' : ''), locked ? 'Locked' : cleared ? 'Completed · replay' : 'Ready to play')}
   ${text(p(1211, 490, 1565, 522), W, 17, 'uiXDesc', `${boss ? `Defeat ${esc(boss)} to open the next island.` : esc(REGION_TEXT[r])}${prize ? ` <span>🪙 ${fmt(prize.coins)}</span>` : ''}`)}
   ${hot(p(1478, 556, 1562, 582), 'data-go="decks"', 'Edit deck')}
   ${deck.map((c, i) => fitCard(p(1201 + i * 123, 593, 1311 + i * 123, 755), c)).join('')}
   <button class="uiHot uiXBegin ${locked ? 'locked' : ''}" id="uiBegin" style="${p(1200, 788, 1556, 860)}" ${locked ? 'aria-disabled="true"' : ''} aria-label="${locked ? 'Locked' : 'Begin battle'}">${locked ? `<span style="${fs(W, 22)}">🔒 Complete earlier quests</span>` : ''}</button>`;
}
function selectLevel(l) {
  if (!wide()) return UI.baseSelect(l);
  if (!Number.isInteger(l)) return;
  selected = l; const r = regionOf(l);
  if (r !== shownRegion) { shownRegion = r; return B.go('map'); }
  const q = $('#uiQuest'); if (!q) return;
  q.innerHTML = questPanel(l); $$('.uiXNode').forEach(n => n.classList.toggle('uiSel', +n.dataset.level === l)); afterMap();
}
function afterMap() {
  if (!wide()) return UI.baseAfterMap();
  B.bind();
  $('#uiBegin')?.addEventListener('click', () => { if (!$('#uiBegin').classList.contains('locked')) B.beginBattle(selected); });
  $$('.uiXNode').forEach(n => n.onclick = () => selectLevel(+n.dataset.level));
  $('#uiXPrev')?.addEventListener('click', () => selectLevel(Math.max(1, selected - 1)));
  $('#uiXNext')?.addEventListener('click', () => selectLevel(Math.min(100, selected + 1)));
  $('#uiXCurrent')?.addEventListener('click', () => selectLevel(B.limit()));
  $$('[data-region]').forEach(b => b.onclick = () => { const r = +b.dataset.region, reg = B.regions[r], cl = B.state.cleared || []; let l = reg[1]; while (l < reg[2] && cl.includes(l)) l++; selected = Math.min(l, Math.max(reg[1], B.limit())); shownRegion = r; B.go('map'); });
  fitCards();
}

/* ---------------------------------------------------------------- Mythling Vault (mockup 1536 × 1024) */
const SLOT_BOXES = [[47, 217, 522, 587], [540, 217, 997, 587], [1017, 217, 1489, 587], [47, 603, 522, 957], [540, 603, 997, 957]];
const VAULT_COSTS = [0, 2500, 10000, 35000, 100000];
function vaultExact() {
  const app = $('#app'), slots = $$('.vaultSlot'), total = $('#vaultTotal'); if (!slots.length || !total || $('.uiXVault')) return;
  const W = 1536, H = 1024, p = box(W, H), st = B.state, v = st.vault || {}, unlocked = v.unlocked || 1;
  const mult = ($('#app p.muted')?.textContent.match(/·\s*([\d.]+×)/) || [])[1] || '1×';
  const wrap = document.createElement('section'); wrap.className = 'uiExactPage';
  wrap.innerHTML = canvas(W, H, '/art/ui/vault.webp', 'uiXVault', `
   ${hot(p(46, 84, 130, 112), 'data-go="home"', 'Back to Home')}

   ${text(p(706, 128, 980, 162), W, 24, 'uiXStat', `${unlocked} / 5 slots unlocked`)}
   ${text(p(706, 162, 980, 190), W, 18, 'uiXStat2', `${mult} permanent earnings`)}
   <div class="uiTxt uiXSaved" style="${p(1024, 150, 1250, 192)};${fs(W, 32)}"></div>
   <div class="uiXCollect" style="${p(1255, 126, 1475, 173)};${fs(W, 21)}"></div><div class="uiTxt uiXHint" style="${p(1255, 174, 1475, 198)};${fs(W, 15)}"></div>
   ${SLOT_BOXES.map((b, i) => `<div class="uiXSlot" data-x-slot="${i}" style="${p(...b)}"></div>`).join('')}
   `);
  const collect = $('#vaultCollectAll'), status = $('#vaultClaimStatus');
  $('.uiXSaved', wrap).append(total, ' coins');
  collect.textContent = 'Collect all'; collect.className = 'uiXBtn'; $('.uiXCollect', wrap).append(collect); $('.uiXHint', wrap).append(status);
  const note = () => { const n = parseInt(total.textContent.replace(/\D/g, ''), 10) || 0; collect.disabled = n <= 0; if (!status.textContent || status.dataset.ui) { status.textContent = n > 0 ? '' : 'No coins to collect.'; status.dataset.ui = '1'; } };
  note(); new MutationObserver(note).observe(total, { childList: true, characterData: true, subtree: true });
  slots.forEach((slot, i) => {
    const host = $(`[data-x-slot="${i}"]`, wrap); if (!host) return;
    const [x0, y0, x1, y1] = SLOT_BOXES[i], w = x1 - x0, h = y1 - y0, q = (a, b, c, d) => `left:${a / w * 100}%;top:${b / h * 100}%;width:${(c - a) / w * 100}%;height:${(d - b) / h * 100}%`;
    const T = (a, b, c, d, px, cls, html) => `<div class="uiTxt ${cls}" style="${q(a, b, c, d)};${fs(W, px)}">${html}</div>`;
    const locked = slot.classList.contains('lockedSlot'), sel = $('select', slot), deposit = $('[data-deposit-slot]', slot), unlock = $('[data-unlock]', slot), claim = $('[data-claim-slot]', slot), withdraw = $('[data-withdraw]', slot), balance = $('[data-vault-balance]', slot);
    const label = T(28, 16, 200, 52, 19, 'uiXLabel', `SLOT ${i + 1}`);
    if (locked) {
      const next = i === unlocked, need = VAULT_COSTS[i] - st.coins;
      host.classList.add('navy');
      host.innerHTML = `${label}<img class="uiXIcon" src="/art/ui/slot-icon-lock.webp" alt="" style="${q(w / 2 - 98, 13, w / 2 + 98, 175)}">
       ${T(20, 164, w - 20, 198, 28, 'uiXTitle', `Unlock Slot ${i + 1}`)}${T(20, 197, w - 20, 226, 21, 'uiXCost', `<i class="uiXCoin"></i> ${fmt(VAULT_COSTS[i])} coins`)}${T(20, 226, w - 20, 252, 19, 'uiXText', 'Permanent unlock.')}
       <div class="uiXBtnHost" style="${q(w / 2 - 159, 258, w / 2 + 159, 303)};${fs(W, 20)}"></div>${T(20, 310, w - 20, 338, 16, 'uiXText', !next ? 'Unlock earlier slots first.' : need > 0 ? `Need ${fmt(need)} more coins.` : 'Ready to unlock.')}`;
      if (unlock) { unlock.textContent = 'Unlock slot'; unlock.className = 'uiXBtn'; $('.uiXBtnHost', host).append(unlock); }
    } else if (sel) {
      host.classList.add('gold');
      const saved = balance ? balance.textContent : '0';
      host.innerHTML = `${label}<img class="uiXBadge" src="/art/ui/badge-available.png" alt="Available" style="${q(329, 9, 451, 43)}">
       ${T(20, 162, w - 20, 202, 28, 'uiXTitle', 'Choose a fused Mythling')}${T(20, 202, w - 20, 228, 19, 'uiXText', 'Earn coins every second.')}${T(20, 228, w - 20, 252, 19, 'uiXText', 'Saved: <b class="uiXGold"></b> <b class="uiXGold">coins</b>')}
       <div class="uiXSelHost" style="${q(41, 251, w - 38, 291)};${fs(W, 17)}"></div><div class="uiXBtnHost" style="${q(41, 300, w - 38, 337)};${fs(W, 20)}"></div>${T(20, 340, w - 20, 364, 16, 'uiXText', sel.options.length > 1 ? 'Select a Mythling first.' : 'Fuse two Mythlings to get one.')}`;
      if (balance) $('.uiXGold', host).append(balance); else $('.uiXGold', host).textContent = saved;
      sel.className = 'uiXSelect'; $('.uiXSelHost', host).append(sel);
      if (deposit) { deposit.textContent = 'Assign to slot'; deposit.className = 'uiXBtn'; $('.uiXBtnHost', host).append(deposit); const sync = () => { deposit.disabled = !sel.value; }; sync(); sel.addEventListener('change', sync); }
    } else {
      host.classList.add('navy');
      const portrait = $('[data-creature-portrait]', slot), name = $('h2', slot)?.textContent || '', rarity = $('.vaultRarity', slot)?.textContent || '', rate = $('.vaultRate', slot)?.textContent || '';
      host.innerHTML = `${label}${T(w / 2 - 120, 16, w - 24, 46, 15, 'uiXRarity', esc(rarity))}<div class="uiXPortrait" style="${q(w / 2 - 75, 30, w / 2 + 75, 168)}"></div>
       ${T(20, 168, w - 20, 202, 28, 'uiXTitle', esc(name))}${T(20, 202, w - 20, 228, 20, 'uiXCost', esc(rate))}${T(20, 228, w - 20, 254, 19, 'uiXText', 'Saved: <b class="uiXGold"></b> <b class="uiXGold">coins</b>')}
       <div class="uiXBtnRow" style="${q(40, 262, w - 40, 304)};${fs(W, 18)}"></div>`;
      if (portrait) $('.uiXPortrait', host).append(portrait);
      if (balance) $('.uiXGold', host).append(balance);
      for (const b of [claim, withdraw]) if (b) { b.className = 'uiXBtn'; b.textContent = b === claim ? 'Collect' : 'Take out'; $('.uiXBtnRow', host).append(b); }
    }
  });
  const old = $('.vaultToolbar'), grid = $('.vaultSlots'), title = $('#app h1'), intro = title?.nextElementSibling;
  app.insertBefore(wrap, $('.back') || app.firstChild.nextSibling);
  [$('.back'), title, intro, old, grid].forEach(el => el?.remove());
  for (const panel of $$('#app > .panel, #app > details, #app > p')) panel.classList.add('uiXBelow');
}


/* ---------------------------------------------------------------- Welcome / username (mockup 1672 × 941) */
// Re-uses the game's own form elements (same ids and handlers) and places them on the mockup.
function welcomeExact() {
  const form = $('#usernameForm'), recover = $('#recoverForm'); if (!form || $('.uiXWelcome')) return;
  const W = 1672, H = 941, p = box(W, H), input = $('#newUsername'), submit = $('button', form), err = $('#usernameError'), solo = $('button[data-go="tutorial"]'), details = recover.closest('details');
  const wrap = document.createElement('section'); wrap.className = 'uiExactPage uiXWelcomePage';
  wrap.innerHTML = canvas(W, H, '/art/ui/welcome.webp', 'uiXWelcome', `



   <h1 class="uiSr">Your adventure starts here.</h1><label class="uiSr" for="newUsername">Your username</label>
   <form class="uiXForm" style="${p(1009, 457, 1548, 634)}"></form>
   <div class="uiTxt uiXErr" role="status" style="${p(1009, 636, 1548, 660)};${fs(W, 16)}"></div>
   <div class="uiXSolo" style="${p(1150, 656, 1405, 694)}"></div>
   <button class="uiHot" id="uiXRecoverOpen" style="${p(1009, 744, 1548, 806)}" aria-expanded="false" aria-controls="uiXRecover" aria-label="Already have a username?"></button>
   <div class="uiXRecover" id="uiXRecover" hidden style="${p(1000, 548, 1556, 862)};${fs(W, 18)}"><div class="uiXRecHead"><strong>Restore your username</strong><button type="button" class="uiXClose" aria-label="Close">✕</button></div></div>`);
  $('#app').insertBefore(wrap, $('#app section.hero'));
  // Username form: transparent input over the painted box; the painted button is the visual for submit.
  const f = $('.uiXForm', wrap);
  input.classList.add('uiXInput'); input.placeholder = ''; f.append(input);
  submit.className = 'uiXSubmit'; submit.setAttribute('aria-label', 'Start Adventure'); submit.textContent = ''; f.append(submit);
  form.removeAttribute('id'); f.id = 'usernameForm'; f.onsubmit = form.onsubmit;
  $('.uiXErr', wrap).append(err);
  if (solo) { solo.className = 'uiHot'; solo.setAttribute('aria-label', 'Play solo for now'); solo.textContent = ''; $('.uiXSolo', wrap).append(solo); }
  const rec = $('#uiXRecover', wrap), open = $('#uiXRecoverOpen', wrap);
  for (const i of $$('input', recover)) i.className = 'uiXRecInput';
  $('button', recover).className = 'uiXBtn';
  rec.append(recover, Object.assign(document.createElement('p'), { className: 'uiXRecNote', textContent: 'Restores your online username and friends. Creature collections stay on their original device.' }));
  const toggle = show => { rec.hidden = !show; open.setAttribute('aria-expanded', String(show)); if (show) $('#recoverName')?.focus(); else input.focus(); };
  open.onclick = () => toggle(true); $('.uiXClose', rec).onclick = () => toggle(false);
  rec.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
  $('#app section.hero')?.remove(); details?.remove();
  setTimeout(() => input.focus(), 50);
}


/* ---------------------------------------------------------------- Mythling Packs (mockup 1536 × 1024) */
// The painted stats match packCatalog. The game's own [data-buy] buttons are moved onto the painted button spots.
const PACK_BTNS = { pack: [322, 390, 521, 437], star: [757, 390, 968, 437], crystal: [1204, 390, 1405, 442], mythic: [321, 711, 523, 766], legend: [757, 711, 967, 767], celestial: [1204, 711, 1405, 767], hacker: [1194, 843, 1389, 899] };
const PACK_COST = { pack: 150, star: 350, crystal: 750, mythic: 1500, legend: 3000, celestial: 6000, hacker: 600000 };
function packsExact() {
  const app = $('#app'); if (!$('[data-buy]') || $('.uiXPacks')) return;
  const W = 1536, H = 1024, p = box(W, H), st = B.state;
  const wrap = document.createElement('section'); wrap.className = 'uiExactPage uiXPacksPage';
  wrap.innerHTML = canvas(W, H, '/art/ui/packs.webp', 'uiXPacks', `



   <h1 class="uiSr">Mythling Packs</h1>
   ${Object.keys(PACK_BTNS).map(id => `<div class="uiXPackSlot" data-pack-slot="${id}" style="${p(...PACK_BTNS[id])};${fs(W, id === 'hacker' ? 17 : 16)}"></div>`).join('')}
   <div class="uiXPackNotice" style="${p(300, 944, 1240, 994)};${fs(W, 15)}"></div>`);
  app.insertBefore(wrap, app.firstChild.nextSibling);
  for (const b of $$('[data-buy]')) {
    const id = b.dataset.buy, slot = $(`[data-pack-slot="${id}"]`, wrap); if (!slot) continue;
    const name = b.textContent.trim(), need = PACK_COST[id] - st.coins;
    b.className = 'uiXPackBtn'; b.innerHTML = need > 0 ? `${esc(name)}<small>Need ${fmt(need)} more coins</small>` : esc(name);
    if (need > 0) b.setAttribute('aria-label', `${name}. Need ${fmt(need)} more coins`);
    slot.append(b);
  }
  // Free quest-reward packs and an unfinished reveal sit in the footer line.
  const notice = $('.uiXPackNotice', wrap), resume = $('#resumePack'), rewards = $$('[data-quest-pack]');
  if (resume || rewards.length) {
    notice.classList.add('on');
    if (resume) { resume.className = 'uiXPackBtn'; resume.textContent = 'Resume pack reveal'; notice.append(resume); }
    for (const r of rewards) { r.className = 'uiXPackBtn'; r.textContent = r.textContent.replace(' · 5 Mythlings', ''); notice.append(r); }
  }
  for (const el of [...app.children]) if (el !== wrap && !el.matches('.uiTop, .nav, #fxLayer, #toast')) el.remove();
}
// Phones: the painted pack wrapper replaces the emoji on each pack card.
const PACK_IDS = ['pack', 'star', 'crystal', 'mythic', 'legend', 'celestial', 'hacker'];
function packsNarrow() {
  $$('.packTier').forEach((t, i) => { const icon = t.firstElementChild; if (icon && !t.querySelector('.uiPackArt') && PACK_IDS[i]) icon.outerHTML = `<img class="uiPackArt" src="/art/ui/pack-${PACK_IDS[i]}.webp" alt="" width="160" height="285">`; });
}


/* ---------------------------------------------------------------- Mutation Vault (mockup 1587 × 991) */
// Rearranges the game's own Mutation Vault (same buttons, purchase and confirmation) onto the mockup.
const MUT_CARDS = { spark: [687, 214, 920, 457], flame: [932, 214, 1165, 457], frost: [1177, 214, 1407, 457], storm: [687, 473, 920, 721], shadow: [933, 473, 1165, 721], cosmic: [1178, 473, 1407, 721] };
const MUT_TILES = [[460, 840, 642, 960], [655, 840, 836, 960], [849, 840, 1030, 960], [1043, 840, 1225, 960], [1238, 840, 1420, 960]];
let mutPage = 0, mutLastSel = null;
function mutationExact() {
  const app = $('#app'), opts = $$('[data-mutation]'), pets = $$('[data-mutate-pet]'); if (!opts.length || $('.uiXMutation')) return;
  const W = 1587, H = 991, p = box(W, H), st = B.state;
  const selBtn = pets.find(b => b.classList.contains('mutationSelected')), cid = selBtn?.dataset.mutatePet;
  const c = st.owned.find(x => x.id === cid) || B.active(), mBtn = opts.find(b => b.classList.contains('selected')) || opts[0], m = B.MUTATIONS.find(x => x.id === mBtn.dataset.mutation);
  const cmp = $$('.mutationComparison strong').map(e => e.textContent.trim()), cur = c.mutation ? B.MUTATIONS.find(x => x.id === c.mutation) : null;
  const sp = B.species[c.kind] || {}, painted = c.kind === 0 && ['spark', 'flame'].includes(m.id);
  const wrap = document.createElement('section'); wrap.className = 'uiExactPage';
  wrap.innerHTML = canvas(W, H, '/art/ui/mutation.webp', 'uiXMutation', `
   <h1 class="uiSr">Mutation Vault</h1>
   ${painted ? '' : `<div class="uiXMutArt" style="${p(232, 168, 640, 500)};--mut:${m.color}">${B.art({ ...c, mutation: m.id })}</div>`}
   ${text(p(200, 170, 640, 206), W, 33, 'uiXMName', esc(sp.name || ''))}
   ${text(p(201, 208, 640, 232), W, 19, 'uiXMLevel', `Level ${c.level || 1} · ${esc(B.rarityLabel(c))}`)}
   <div class="uiTxt uiXMPill ${cur ? 'on' : ''}" style="${p(200, 240, 200 + (cur ? 160 : 135), 265)};${fs(W, 13.5)};--mut:${cur?.color || '#6f8ad8'}">${cur ? `${cur.icon} ${esc(cur.name)} active` : 'No active mutation'}</div>
   ${text(p(374, 506, 520, 528), W, 13.5, 'uiXMPrev', `${esc(m.name).toUpperCase()} PREVIEW`)}
   ${text(p(512, 561, 622, 581), W, 14.5, 'uiXMHead', `With ${esc(m.name)}`)}
   ${text(p(385, 594, 445, 624), W, 22, 'uiXMVal', esc(cmp[0] || ''))}${text(p(535, 594, 600, 624), W, 22, 'uiXMVal gold', esc(cmp[1] || ''))}
   ${text(p(385, 639, 445, 669), W, 22, 'uiXMVal', esc(cmp[2] || ''))}${text(p(535, 639, 600, 669), W, 22, 'uiXMVal gold', esc(cmp[3] || ''))}
   ${text(p(378, 684, 520, 716), W, 24, 'uiXMPrice', `${fmt(m.cost)} <small>coins</small>`)}
   <div class="uiXMBuy" style="${p(250, 722, 596, 765)};${fs(W, 19)}"></div>
   <div class="uiTxt uiXMNeed" style="${p(250, 768, 596, 792)};${fs(W, 15)}"></div>
   <div class="uiXMConfirm" style="${p(196, 556, 650, 806)};${fs(W, 15)}"></div>
   ${Object.entries(MUT_CARDS).map(([id, b]) => `<div class="uiXMCard ${id === m.id ? 'sel' : ''} ${c.mutation === id ? 'active' : ''}" data-mcard="${id}" style="${p(...b)};${fs(W, 14.5)}"></div>`).join('')}
   ${text(p(204, 872, 420, 896), W, 15.5, 'uiXMCount', `${fmt(st.owned.length)} Mythlings`)}
   <div class="uiXMPager" style="${p(204, 905, 430, 940)};${fs(W, 15)}"></div>
   ${MUT_TILES.map((b, i) => `<div class="uiXMTile" data-mtile="${i}" style="${p(...b)};${fs(W, 17)}"></div>`).join('')}`);
  app.insertBefore(wrap, app.firstChild.nextSibling);
  // Mutation cards: the game's option buttons become the card hotspots; the live damage/vault line is drawn in place.
  for (const b of opts) {
    const host = $(`[data-mcard="${b.dataset.mutation}"]`, wrap); if (!host) continue;
    const line = b.querySelectorAll(':scope > span')[1]?.textContent || '', row1 = MUT_CARDS[b.dataset.mutation][1] < 400;
    b.className = 'uiXMOpt'; b.setAttribute('aria-label', `${b.dataset.mutation} mutation. ${line}`); b.innerHTML = '';
    host.append(b);
    host.insertAdjacentHTML('beforeend', `<span class="uiXMLine" style="top:${row1 ? 75.4 : 75.4}%">${esc(line)}</span>${host.classList.contains('sel') ? '<span class="uiXMBadge">SELECTED</span>' : ''}${host.classList.contains('active') ? '<span class="uiXMBadge act">ACTIVE</span>' : ''}`);
  }
  // Buy button, status line and replacement confirmation.
  const buy = $('#mutate'), status = $('#mutationStatus'), confirmBox = $('#mutationConfirm');
  if (buy) { buy.className = 'uiXMBtn'; buy.textContent = c.mutation === m.id ? 'ALREADY ACTIVE' : `APPLY ${m.name.toUpperCase()}`; $('.uiXMBuy', wrap).append(buy); }
  if (status) { $('.uiXMNeed', wrap).append(status); status.textContent = status.textContent.replace(/^([\d,]+) more coins needed$/, 'Need $1 more coins'); }
  if (confirmBox) { $('.uiXMConfirm', wrap).append(confirmBox); new MutationObserver(() => wrap.querySelector('.uiXMConfirm').classList.toggle('on', !!confirmBox.children.length)).observe(confirmBox, { childList: true }); }
  // Chooser: five tiles per page from the game's creature buttons (the game itself pages by 24).
  if (cid !== mutLastSel) { const i = pets.findIndex(b => b.dataset.mutatePet === cid); if (i >= 0) mutPage = Math.floor(i / 5); mutLastSel = cid; }
  const pages = Math.max(1, Math.ceil(pets.length / 5)); mutPage = Math.min(mutPage, pages - 1);
  pets.forEach(b => {
    const pet = st.owned.find(x => x.id === b.dataset.mutatePet), ps = B.species[pet?.kind] || {}, mut = pet?.mutation ? B.MUTATIONS.find(x => x.id === pet.mutation) : null;
    b.className = 'uiXMPet' + (b.dataset.mutatePet === cid ? ' sel' : '');
    b.innerHTML = `<span class="uiXMPetArt">${pet ? B.art(pet) : ''}</span><span class="uiXMPetName"><i>${mut ? mut.icon : ELEMENT_ICON[ps.element] || '✦'}</i>${esc(ps.name || '')}</span>`;
    b.setAttribute('aria-label', `${ps.name}, level ${pet?.level || 1}${mut ? ', ' + mut.name + ' mutation' : ''}`);
  });
  const paint = () => { $$('[data-mtile]', wrap).forEach((t, i) => { t.replaceChildren(); const b = pets[mutPage * 5 + i]; if (b) t.append(b); }); const pg = $('.uiXMPager', wrap); pg.innerHTML = pages > 1 ? `<button aria-label="Previous Mythlings" ${mutPage ? '' : 'disabled'}>‹</button><span>${mutPage * 5 + 1}–${Math.min(pets.length, mutPage * 5 + 5)} of ${pets.length}</span><button aria-label="Next Mythlings" ${mutPage < pages - 1 ? '' : 'disabled'}>›</button>` : ''; const [prev, next] = $$('button', pg); if (prev) prev.onclick = () => { mutPage--; paint(); }; if (next) next.onclick = () => { mutPage++; paint(); }; };
  paint();
  const more = [$('#mutationPrev'), $('#mutationNext')].filter(Boolean);
  if (more.length) { const pg = $('.uiXMPager', wrap); more.forEach(b => { b.className = 'uiXMMore'; b.textContent = b.id === 'mutationPrev' ? '« earlier' : 'later »'; pg.append(b); }); }
  for (const el of [...app.children]) if (el !== wrap && !el.matches('.uiTop, .nav, #fxLayer, #toast')) el.remove();
}
const ELEMENT_ICON = { Fire: '🔥', Water: '💧', Nature: '🍃', Lightning: '⚡', Moon: '🌙', Crystal: '💎', Ice: '❄️', Shadow: '🌑', Wind: '🌪️' };


/* ---------------------------------------------------------------- Fusion Lab (mockup 1586 × 992) */
// Rearranges the game's own Fusion Lab (same selection buttons and Fuse button) onto the mockup.
const FUSE_TILES = [[177, 573, 418, 905], [432, 573, 668, 905], [682, 573, 918, 905], [932, 573, 1168, 905], [1183, 573, 1419, 905]];
let fusePage = 0;
function fusionExact() {
  const app = $('#app'), preview = $('.fusionPreview'), picks = $$('[data-fusion-id]'), fuse = $('#fuse'); if (!preview || !fuse || $('.uiXFusion')) return;
  const W = 1586, H = 992, p = box(W, H), st = B.state;
  const chosen = picks.filter(b => b.classList.contains('picked')).map(b => st.owned.find(c => c.id === b.dataset.fusionId)).filter(Boolean);
  const avail = picks.filter(b => !b.disabled).length;
  const slot = (c, b) => `<div class="uiXFSlot" style="${p(...b)};${fs(W, 15)}">${B.art(c)}<span>${esc(B.species[c.kind]?.name || '')}<small>Level ${c.level || 1}${c.shiny ? ' · ★ Shiny' : ''}</small></span></div>`;
  const ready = !fuse.disabled, hint = chosen.length === 2 ? (ready ? 'Ready to fuse.' : st.coins < 200 ? `Need ${fmt(200 - st.coins)} more coins.` : 'Collect at least three Mythlings to fuse.') : chosen.length === 1 ? 'Choose one more Mythling.' : 'Select two Mythlings to continue.';
  const wrap = document.createElement('section'); wrap.className = 'uiExactPage';
  wrap.innerHTML = canvas(W, H, '/art/ui/fusion.webp', 'uiXFusion', `
   ${hot(p(168, 58, 232, 78), 'data-go="home"', 'Back to Home')}<h1 class="uiSr">Fusion Lab</h1>
   ${text(p(305, 199, 470, 227), W, 22, 'uiXFCount', `${chosen.length} / 2 selected`)}
   ${chosen[0] ? slot(chosen[0], [305, 243, 498, 422]) : ''}${chosen[1] ? slot(chosen[1], [577, 243, 768, 422]) : ''}
   <div class="uiXFBtn" style="${p(1144, 347, 1418, 401)};${fs(W, 19)}"></div>
   ${text(p(1146, 410, 1420, 432), W, 14.5, 'uiXFHint', esc(hint))}
   ${text(p(548, 538, 900, 562), W, 16, 'uiXFAvail', `${fmt(st.owned.length)} Mythlings &nbsp;·&nbsp; ${fmt(avail)} available`)}
   <div class="uiXFPager" style="${p(1180, 534, 1420, 564)};${fs(W, 15)}"></div>
   ${FUSE_TILES.map((b, i) => `<div class="uiXFTile" data-ftile="${i}" style="${p(...b)};${fs(W, 16)}"></div>`).join('')}
   ${text(p(400, 941, 1186, 965), W, 15, 'uiXFFoot', chosen.length === 2 ? 'Both selected Mythlings will be consumed for a surprise result.' : 'Choose two eligible Mythlings from your inventory to begin.')}`);
  app.insertBefore(wrap, app.firstChild.nextSibling);
  fuse.className = 'uiXFFuse'; fuse.textContent = 'Fuse Selected Mythlings'; $('.uiXFBtn', wrap).append(fuse);
  picks.forEach(b => {
    const c = st.owned.find(x => x.id === b.dataset.fusionId), sp = B.species[c?.kind] || {}, picked = b.classList.contains('picked');
    const reason = (b.querySelector('.pill')?.textContent || '').replace(/^[^A-Za-z✓]+/, '');
    b.className = 'uiXFCard' + (picked ? ' sel' : '') + (b.disabled ? ' off' : '');
    b.innerHTML = `<span class="uiXFArt">${c ? B.art(c) : ''}</span><strong>${esc(sp.name || '')}</strong><small>Level ${c?.level || 1} · ${esc(sp.element || '')}${c?.shiny ? ' · <b>★</b> Shiny' : ''}${c?.secret ? ' · Secret' : ''}</small>${b.disabled ? `<span class="uiXFProt">🛡 ${esc(reason.replace(/ · .*$/, ''))} · ${esc(/Vault/.test(reason) ? 'Take out first' : /Trade/.test(reason) ? 'In trade' : 'Protected')}</span><em>Cannot be fused</em>` : `<span class="uiXFChoose">${picked ? '✓ Selected' : 'Choose for Fusion'}</span>`}`;
  });
  const pages = Math.max(1, Math.ceil(picks.length / 5));
  const firstPicked = picks.findIndex(b => b.classList.contains('sel')); if (fusePage >= pages) fusePage = pages - 1;
  const paint = () => {
    $$('[data-ftile]', wrap).forEach((t, i) => { t.replaceChildren(); const b = picks[fusePage * 5 + i]; if (b) t.append(b); });
    const pg = $('.uiXFPager', wrap);
    pg.innerHTML = pages > 1 ? `<button aria-label="Previous Mythlings" ${fusePage ? '' : 'disabled'}>‹</button><span>${fusePage * 5 + 1}–${Math.min(picks.length, fusePage * 5 + 5)} of ${picks.length}</span><button aria-label="Next Mythlings" ${fusePage < pages - 1 ? '' : 'disabled'}>›</button>` : '';
    const [prev, next] = $$('button', pg); if (prev) prev.onclick = () => { fusePage--; paint(); }; if (next) next.onclick = () => { fusePage++; paint(); };
  };
  paint();
  for (const el of [...app.children]) if (el !== wrap && !el.matches('.uiTop, .nav, #fxLayer, #toast')) el.remove();
}


/* ---------------------------------------------------------------- Friends (mockup 1586 × 992) */
// Rearranges the game's own Friends screen (same form, requests, invites and lists, refreshed every few seconds).
function friendsExact(data) {
  const app = $('#app'), form = $('#addFriendForm'), lists = $('#friendLists'); if (!lists || !data?.me || (!form && !$('.uiXFriendsPage'))) return;
  const W = 1586, H = 992, p = box(W, H);
  let wrap = $('.uiXFriendsPage');
  if (!wrap) {
    wrap = document.createElement('section'); wrap.className = 'uiExactPage uiXFriendsPage';
    wrap.innerHTML = canvas(W, H, '/art/ui/friends.webp', 'uiXFriends', `
     <h1 class="uiSr">Friends</h1>
     ${text(p(243, 232, 445, 274), W, 34, 'uiXFName', esc(data.me.username))}
     <button class="uiHot" data-copy-name style="${p(453, 222, 659, 268)}" aria-label="Copy username"></button>
     <form class="uiXFForm" style="${p(124, 448, 708, 570)}"></form>
     <div class="uiXFStatus" style="${p(124, 589, 708, 676)};${fs(W, 17)}"></div>
     <div class="uiTxt uiXFCountN" style="${p(1031, 344, 1058, 372)};${fs(W, 18)}"></div>
     <div class="uiXFList" style="${p(772, 383, 1486, 836)};${fs(W, 16)}"></div>
     <button class="uiHot uiXFEmptyBtn" data-copy-name style="${p(993, 776, 1235, 822)}" aria-label="Copy my username"></button>
     <button class="uiHot" id="uiXRecToggle" style="${p(90, 862, 1497, 913)}" aria-expanded="false" aria-controls="uiXRecovery" aria-label="Your player recovery code"></button>
     ${hot(p(1218, 940, 1318, 966), 'data-go="rules"', 'Battle Rules')}`);
    app.insertBefore(wrap, app.firstChild.nextSibling);
    // Find Player form: transparent input over the painted box; the painted button submits.
    const input = $('#friendName'), send = $('#sendFriend'), f = $('.uiXFForm', wrap);
    input.className = 'uiXFInput'; input.placeholder = ''; input.setAttribute('aria-label', "Player's username");
    send.className = 'uiXFFind'; send.textContent = ''; send.setAttribute('aria-label', 'Find Player');
    f.append(input, send); f.onsubmit = form.onsubmit; form.remove();
    const err = $('#friendsError'), status = $('.uiXFStatus', wrap); status.append(err);
    const style = () => { const t = err.textContent.trim(), found = !!err.querySelector('#yesFriend'); status.classList.toggle('on', !!t); status.classList.toggle('ok', found || /sent|already sent/i.test(t)); status.classList.toggle('bad', !!t && !found && !/sent/i.test(t)); if (t && !found && !err.querySelector('.uiXFMsg')) { const [head, ...rest] = t.split(/(?<=\.)\s+/); err.innerHTML = `<span class="uiXFIco">i</span><span class="uiXFMsg"><b>${esc(head.replace(/\.$/, ''))}</b>${rest.length ? `<span>${esc(rest.join(' '))}</span>` : ''}</span>`; } };
    new MutationObserver(style).observe(err, { childList: true, characterData: true, subtree: true }); style();
    $$('[data-copy-name]', wrap).forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(data.me.username); B.toast('Username copied: ' + data.me.username); } catch { B.toast('Your username is ' + data.me.username); } });
    // Recovery code drops down below the page.
    const rec = $$('#app > details.panel').find(d => /recovery code/i.test(d.textContent));
    if (rec) { rec.id = 'uiXRecovery'; rec.classList.add('uiXRecovery'); $('summary', rec)?.remove(); wrap.after(rec); const t = $('#uiXRecToggle', wrap); t.onclick = () => { rec.open = !rec.open; t.setAttribute('aria-expanded', String(rec.open)); if (rec.open) rec.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }; }
    $('.uiXFList', wrap).append(lists);
    for (const el of [...app.children]) if (el !== wrap && el !== rec && !el.matches('.uiTop, .nav, #fxLayer, #toast')) el.remove();
  }
  // Every refresh: friend count, and the list replaces the empty-state picture when there is anything to show.
  const busy = data.friends.length || data.incoming.length || data.outgoing.length || data.invites.length || (data.trades || []).length;
  $('.uiXFCountN', wrap).textContent = data.friends.length;
  wrap.classList.toggle('uiXFHasList', !!busy);
  for (const h of $$('h2', lists)) if (/^Your Friends/.test(h.textContent)) h.classList.add('uiSr');
  for (const row of $$('.friendRow', lists)) {
    const name = $('strong', row)?.textContent || '', f = data.friends.find(x => x.username === name);
    if (f && !row.querySelector('.uiXFAva')) row.insertAdjacentHTML('afterbegin', `<span class="uiXFAva">${B.art(f.pet)}</span>`);
  }
}


/* ---------------------------------------------------------------- Card battle (mockup 1672 × 941) */
// The painted arena and frames are the background; the game's own battle elements (fields, centre panel,
// hand, piles, log, buttons) are moved into the painted spots. Runs on every battle render.
function battleExact() {
  const arena = $('.cardArena'); if (!arena || $('.uiXBattle', arena)) return;
  const W = 1672, H = 941;
  const wrap = document.createElement('section'); wrap.className = 'uiExactPage';
  wrap.innerHTML = canvas(W, H, '/art/ui/battle.webp', 'uiXBattle', '');
  const stage = document.createElement('div'); stage.className = 'uiXBLayer'; $('.uiXBattle', wrap).append(stage);
  for (const el of [...arena.children]) stage.append(el);
  const bar = $('.battleBar', stage); if (bar) bar.classList.add('uiXBBar');
  const details = $$(':scope > details', stage); details.forEach((d, i) => d.classList.add(i ? 'uiXBLog' : 'uiXBDiscard'));
  arena.append(wrap);
  const host = $('.uiXBattle', wrap), z = () => host.style.setProperty('--z', (host.clientWidth / W).toFixed(4));
  z(); battleRO.observe(host);
}
const battleRO = new ResizeObserver(entries => { for (const e of entries) e.target.style.setProperty('--z', (e.target.clientWidth / 1672).toFixed(4)); });

/* ---------------------------------------------------------------- Wiring */
function onFrame() {
  const exact = wide() && ['home', 'map', 'vault', 'username', 'packs', 'mutation', 'fusion', 'fuse', 'friends', 'cardBattle'].includes(B.view) && (B.view !== 'cardBattle' || !!document.querySelector('.cardArena')) && (B.view !== 'friends' || !!document.querySelector('#friendLists')) && (!['fusion', 'fuse'].includes(B.view) || !!document.querySelector('.fusionPreview'));
  document.body.classList.toggle('uiExact', exact);
  if (exact && B.view === 'vault') vaultExact();
  if (exact && B.view === 'username') welcomeExact();
  if (['fusion', 'fuse'].includes(B.view) && exact) fusionExact();
  if (B.view === 'cardBattle' && exact) battleExact();
  if (B.view === 'mutation' && exact) queueMicrotask(() => { if (B.view === 'mutation') mutationExact(); });
  // packs() binds its buttons and adds reward packs after drawing, so rearrange once it has finished.
  if (B.view === 'packs') queueMicrotask(() => { if (B.view !== 'packs') return; if (exact) packsExact(); else packsNarrow(); });
  if (!exact && B.view === 'username') welcomeNarrow();
  if (exact) { const c = $('.uiX'); if (c) ro.observe(c); fitCards(); const u = $('#uiUser'); if (u && !u.dataset.bound) { u.dataset.bound = '1'; } }
}
if (B && UI) {
  Object.assign(UI, { baseHome: UI.home, baseMap: UI.map, baseAfterMap: UI.afterMap, baseSelect: UI.selectLevel, exactWide: wide });
  Object.assign(UI, { home, map, afterMap, selectLevel });
  window.addEventListener('ember:frame', onFrame);
  window.addEventListener('ember:friends', e => { if (wide() && B.view === 'friends') { document.body.classList.add('uiExact'); friendsExact(e.detail); } });
  let wasWide = wide();
  addEventListener('resize', () => { const now = wide(); if (now !== wasWide) { wasWide = now; if (['home', 'map', 'vault', 'packs', 'mutation', 'fusion'].includes(B.view)) B.go(B.view); } });
  if (B.view === 'username') onFrame();
  if (['home', 'map', 'vault'].includes(B.view)) B.go(B.view);
}

// Phones: the painted scene sits above the game's form, styled like the mockup panel.
function welcomeNarrow() {
  const hero = $('#app section.hero'); if (!hero || $('.uiXWelcomeArt')) return;
  hero.classList.add('uiXWelcomeCard');
  hero.insertAdjacentHTML('beforebegin', '<div class="uiXWelcomeArt" role="img" aria-label="Mythlings in a forest by a waterfall"></div>');
  const h1 = $('h1', hero); if (h1) h1.textContent = 'Your adventure starts here.';
  const pill = $('.pill', hero); if (pill) pill.className = 'uiXKicker';
  const btn = $('#usernameForm button', hero); if (btn) btn.innerHTML = 'Start Adventure <span aria-hidden="true">→</span>';
}
