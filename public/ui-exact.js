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
  return `<div class="uiX ${cls}" style="--W:${W};aspect-ratio:${W}/${H};background-image:url(${bg})">${inner}</div>`;
}
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
   ${logoAt(W, H, 56, 5, 66)}
   ${hot(p(515, 22, 610, 72), 'data-go="home" aria-current="page"', 'Home')}${hot(p(640, 22, 780, 72), 'data-go="inventory"', 'Mythlings')}${hot(p(815, 22, 920, 72), 'data-go="decks"', 'Battle')}${hot(p(955, 22, 1068, 72), 'data-go="map"', 'Explore')}
   ${text(p(1248, 25, 1306, 58), W, coinPx(st.coins, 21, 4), 'uiXCoins', fmt(st.coins))}
   <button class="uiHot uiXUser" id="uiUser" style="${p(1350, 20, 1557, 62)}" aria-haspopup="menu" aria-expanded="false" aria-label="Your profile menu"></button>
   <div class="uiXAvatar" style="${p(1357, 23, 1405, 61)}">${active ? B.art(active) : ''}</div>
   ${text(p(1416, 24, 1515, 59), W, 21, 'uiXName', esc(st.playerUsername || 'Explorer'))}
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
   <div id="uiDrawer" class="uiXDrawer"></div></section>`;
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
   ${logoAt(W, H, 36, 3, 58)}
   ${hot(p(470, 12, 560, 58), 'data-go="home"', 'Home')}${hot(p(585, 12, 670, 58), 'data-go="packs"', 'Packs')}${hot(p(690, 12, 800, 58), 'data-go="inventory"', 'Inventory')}${hot(p(825, 12, 1012, 58), 'data-go="map" aria-current="page"', 'Adventure HQ')}${hot(p(1030, 12, 1130, 58), 'data-go="friends"', 'Friends')}
   ${text(p(1484, 18, 1550, 52), W, coinPx(B.state.coins, 23, 4), 'uiXCoins', fmt(B.state.coins))}
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
   ${logoAt(W, H, 56, 1, 52)}${hot(p(12, 8, 340, 72), 'data-go="home"', 'EMBERLINGS home')}${hot(p(46, 84, 130, 112), 'data-go="home"', 'Back to Home')}
   ${text(p(1380, 20, 1462, 60), W, coinPx(st.coins, 30, 4), 'uiXCoins', fmt(st.coins))}
   ${text(p(706, 128, 980, 162), W, 24, 'uiXStat', `${unlocked} / 5 slots unlocked`)}
   ${text(p(706, 162, 980, 190), W, 18, 'uiXStat2', `${mult} permanent earnings`)}
   <div class="uiTxt uiXSaved" style="${p(1024, 150, 1250, 192)};${fs(W, 32)}"></div>
   <div class="uiXCollect" style="${p(1255, 126, 1475, 173)};${fs(W, 21)}"></div><div class="uiTxt uiXHint" style="${p(1255, 174, 1475, 198)};${fs(W, 15)}"></div>
   ${SLOT_BOXES.map((b, i) => `<div class="uiXSlot" data-x-slot="${i}" style="${p(...b)}"></div>`).join('')}
   ${hot(p(150, 958, 285, 1006), 'data-go="home"', 'Home')}${hot(p(415, 958, 535, 1006), 'data-go="packs"', 'Packs')}${hot(p(685, 958, 815, 1006), 'data-go="inventory"', 'Inventory')}${hot(p(945, 958, 1112, 1006), 'data-go="map"', 'Adventure HQ')}${hot(p(1255, 958, 1375, 1006), 'data-go="friends"', 'Friends')}`);
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
   ${logoAt(W, H, 80, 6, 68)}
   ${hot(p(535, 20, 620, 66), 'data-go="home"', 'Home')}${hot(p(662, 20, 750, 66), 'data-go="packs"', 'Packs')}${hot(p(790, 20, 925, 66), 'data-go="inventory"', 'My Binder')}${hot(p(958, 20, 1128, 66), 'data-go="map"', 'Adventure HQ')}${hot(p(1172, 20, 1275, 66), 'data-go="friends"', 'Friends')}
   ${text(p(1514, 26, 1572, 60), W, coinPx(B.state.coins, 25, 4), 'uiXCoins', fmt(B.state.coins))}
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
   ${logoAt(W, H, 200, 4, 58)}
   ${hot(p(530, 18, 610, 58), 'data-go="home"', 'Home')}${hot(p(618, 18, 712, 58), 'data-go="packs" aria-current="page"', 'Packs')}${hot(p(722, 18, 838, 58), 'data-go="inventory"', 'My Binder')}${hot(p(848, 18, 1000, 58), 'data-go="map"', 'Adventure HQ')}${hot(p(1010, 18, 1100, 58), 'data-go="friends"', 'Friends')}
   ${text(p(1237, 22, 1300, 52), W, coinPx(st.coins, 22, 4), 'uiXCoins', fmt(st.coins))}
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

/* ---------------------------------------------------------------- Wiring */
function onFrame() {
  const exact = wide() && ['home', 'map', 'vault', 'username', 'packs'].includes(B.view);
  document.body.classList.toggle('uiExact', exact);
  if (exact && B.view === 'vault') vaultExact();
  if (exact && B.view === 'username') welcomeExact();
  // packs() binds its buttons and adds reward packs after drawing, so rearrange once it has finished.
  if (B.view === 'packs') queueMicrotask(() => { if (B.view !== 'packs') return; if (exact) packsExact(); else packsNarrow(); });
  if (!exact && B.view === 'username') welcomeNarrow();
  if (exact) { const c = $('.uiX'); if (c) ro.observe(c); fitCards(); const u = $('#uiUser'); if (u && !u.dataset.bound) { u.dataset.bound = '1'; } }
}
if (B && UI) {
  Object.assign(UI, { baseHome: UI.home, baseMap: UI.map, baseAfterMap: UI.afterMap, baseSelect: UI.selectLevel, exactWide: wide });
  Object.assign(UI, { home, map, afterMap, selectLevel });
  window.addEventListener('ember:frame', onFrame);
  let wasWide = wide();
  addEventListener('resize', () => { const now = wide(); if (now !== wasWide) { wasWide = now; if (['home', 'map', 'vault', 'packs'].includes(B.view)) B.go(B.view); } });
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
