// Exact Home, Adventure HQ and Mythling Vault screens built from the supplied mockups (public/art/ui/*.webp).
// The cleaned mockup is the background; live values, our cards and our art are placed at the mockup's pixel positions.
// Below EXACT_MIN_WIDTH the stacked layouts in ui.js are used instead.
const B = window.EmberBridge, UI = window.EmberUI;
const EXACT_MIN_WIDTH = 760;   // tablets (iPad portrait is 768 wide) get the same painted layouts as desktop
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fmt = n => Math.floor(Number(n) || 0).toLocaleString();
// Every tablet keeps the painted artwork. Friends and battle have dedicated portrait art.
const phoneLayout = () => innerWidth < 700 || (innerWidth < 1000 && innerHeight < 500);
const wide = () => !phoneLayout() && innerWidth >= EXACT_MIN_WIDTH && !(innerWidth < 1200 && innerHeight > innerWidth && ['friends', 'cardBattle'].includes(B.view));
const ext = () => { const st = B.state; if (!st.ember || typeof st.ember !== 'object') st.ember = {}; return st.ember; };

// Canvas helpers: positions are given in mockup pixels and converted to percentages / container units.
function canvas(W, H, bg, cls, inner) {
  // The painted header (and the Vault's painted bottom bar) is cropped off; the shared live header sits above every page.
  const [top, bottom] = CROP[cls] || [0, H];
  return `<div class="uiXCrop" style="--ratio:${W / (bottom - top)};aspect-ratio:${W}/${bottom - top}"><div class="uiX ${cls}" style="--W:${W};aspect-ratio:${W}/${H};margin-top:${(-top / W * 100).toFixed(4)}%;background-image:url(${bg})">${inner}</div></div>`;
}
// A rectangle of a mockup [x0, y0, x1, y1] shown on its own; content keeps full-canvas positions.
function piece(W, H, bg, cls, [x0, y0, x1, y1], inner, extra = '') {
  const w = x1 - x0;
  return `<div class="uiXPiece" style="aspect-ratio:${w}/${y1 - y0};${extra}"><div class="uiX ${cls}" style="--W:${W};width:${(W / w * 100).toFixed(4)}%;aspect-ratio:${W}/${H};margin-left:${(-x0 / w * 100).toFixed(4)}%;margin-top:${(-y0 / w * 100).toFixed(4)}%;background-image:url(${bg})">${inner}</div></div>`;
}
// Reflow rectangles of the same painting; move live nodes so handlers and IDs stay intact.
function portraitPainting(wrap, cls, W, H, bg, rows) {
  if (!(innerWidth >= EXACT_MIN_WIDTH && innerWidth < 1200 && innerHeight > innerWidth)) return;
  const old = $('.' + cls, wrap); if (!old) return;
  const nodes = [...old.children], bounds = rows.flat(), hosts = [];
  const stage = document.createElement('div'); stage.className = 'uiPortraitPainting';
  stage.style.setProperty('--portrait-art', 'url(' + bg + ')');
  stage.style.setProperty('--portrait-ratio', String(W / H));
  for (const rects of rows) {
    const row = document.createElement('div'); row.className = 'uiPortraitArtRow';
    row.style.gridTemplateColumns = 'repeat(' + rects.length + ', minmax(0,1fr))';
    for (const rect of rects) {
      const t = document.createElement('template'); t.innerHTML = piece(W, H, bg, cls, rect, '');
      const crop = t.content.firstElementChild; hosts.push($('.uiX', crop)); row.append(crop);
    }
    stage.append(row);
  }
  for (const node of nodes) {
    if (node.classList.contains('uiSr')) { stage.prepend(node); continue; }
    const x = (parseFloat(node.style.left) + parseFloat(node.style.width) / 2) / 100 * W;
    const y = (parseFloat(node.style.top) + parseFloat(node.style.height) / 2) / 100 * H;
    const i = bounds.findIndex(([x0,y0,x1,y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
    hosts[i < 0 ? 0 : i].append(node);
  }
  wrap.replaceChildren(stage);
}
// Portrait tablets: the painted map fills the width and the quest panel sits beneath it in two halves.
const mapSplit = () => innerWidth < 1200 && innerHeight > innerWidth;
const CROP = { uiXHome: [78, 552], uiXMap: [66, 992], uiXVault: [80, 942], uiXWelcome: [87, 941], uiXPacks: [69, 1024], uiXMutation: [55, 991], uiXFusion: [52, 992], uiXFriends: [66, 992], uiXBattle: [62, 941], uiXFriendsTab: [130, 1320], uiXBattleTab: [140, 1505] };
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
// A printed card that scales to the width of its box (used by the Fusion Lab).
const cardFitRO = new ResizeObserver(es => {
  for (const e of es) {
    const f = e.target, k = f.clientWidth / 230, inner = f.firstElementChild; f.style.setProperty('--s', k.toFixed(4));
    // Boxes sized by width take the printed card's real height; slot boxes are sized by height instead.
    if (inner && !f.closest('.uiXFSlotCard')) { const h = Math.round(inner.offsetHeight * k); if (h && f.style.height !== h + 'px') f.style.height = h + 'px'; }
  }
});
const cardFit = c => `<span class="uiCardFit"><span class="uiCardFitIn">${B.cardHTML(c)}</span></span>`;
function observeCardFits(root = document) { for (const f of $$('.uiCardFit', root)) if (!f.dataset.fit) { f.dataset.fit = '1'; cardFitRO.observe(f); } }

function deckTop(n = 3) {
  const seen = new Set(), out = [];
  for (const c of B.deck()) { if (c.cardType === 'trainer' || c.kind === undefined || seen.has(c.kind)) continue; seen.add(c.kind); out.push(c); }
  return out.length ? out.slice(0, n) : (B.state.owned || []).slice(0, n);
}

/* ---------------------------------------------------------------- Home (mockup 1586 × 992) */
function home() {
  if (!wide()) return UI.baseHome();
  const W = 1586, H = 992, p = box(W, H), st = B.state, deck = deckTop(3);
  const fan = [[1152, 197, 1268, 375, -8, deck[1]], [1420, 197, 1536, 375, 8, deck[2]], [1268, 166, 1420, 398, 0, deck[0]]].filter(f => f[5]);
  return `<section class="uiHome uiExactPage">${canvas(W, H, '/art/ui/home.webp', 'uiXHome', `
   <h1 class="uiSr">Awaken the ember.</h1>
   ${hot(p(48, 430, 422, 500), 'data-go="map"', 'Explore islands')}
   ${st.cardBattle ? `<button class="uiXResume" id="uiResume" style="${p(48, 508, 422, 540)};${fs(W, 17)}">Resume card battle ›</button>` : ''}
   <div class="uiXFan">${fan.map(([x0, y0, x1, y1, r, c]) => fitCard(p(x0, y0, x1, y1), c, r)).join('')}</div>
   ${hot(p(1170, 413, 1515, 470), 'data-go="decks"', 'Edit deck')}${hot(p(1170, 483, 1515, 527), 'data-go="training"', 'Training field')}
`)}
   ${UI.homeCards()}<div id="uiDrawer" class="uiXDrawer"></div></section>`;
}

/* ---------------------------------------------------------------- Adventure HQ (mockup 1586 × 992) */
// Level positions in mockup pixels: Ember Meadows uses the painted node spots; the other islands follow their painted terrain.
const MEADOW = [[150, 480], [214, 497], [273, 531], [341, 549], [410, 580], [471, 541], [474, 482], [530, 451], [570, 365]];
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
let selected = null, shownRegion = null, lastRenderedView = null;
const regionOf = l => B.regions.findIndex(r => l >= r[1] && l <= r[2]);
const REGION_ART = [0, 5, 14, 3, 7];
const REGION_TEXT = ['Your journey begins in the meadows.', 'Crystal light hides clever rivals.', 'Icy winds test every deck.', 'Storms crackle over the valley.', 'Only the bravest enter the dark.'];
function questName(l) { return window.EmberUI.questName ? window.EmberUI.questName(l) : `Quest ${B.adventureLabel(l)}`; }
// All five regions share one continuous, horizontally scrollable world.
const WORLD_W = 2354, WORLD_H = 760;
const EASTERN_TRAILS = [
 [[80,610],[165,630],[250,600],[335,635],[425,600],[500,550],[470,470],[390,450],[310,485],[225,450],[140,480],[75,420],[105,340],[190,310],[275,345],[360,310],[450,335],[510,265],[455,200],[370,180],[285,225],[205,185],[110,245],[140,145],[280,120]],
 [[650,600],[735,640],[825,605],[915,640],[1005,605],[1080,560],[1100,475],[1015,440],[930,480],[845,440],[760,475],[675,425],[655,340],[735,300],[820,340],[905,305],[990,340],[1085,295],[1120,190],[1030,220],[940,185],[850,220],[760,185],[680,225],[660,140],[730,70],[840,70],[960,85],[1020,140],[850,140]]
];
function worldLevelPos(l) {
  const r=regionOf(l);
  if(r<3){const [x,y]=levelPos(l);return [x,y-66]}
  const [x,y]=EASTERN_TRAILS[r-3][l-B.regions[r][1]];
  return [1177+x,y];
}
// A smooth trail passes through every quest marker, with gentle bends between them.
function worldTrailPath(points) {
  return points.map((p,i)=>{
    if(!i)return 'M '+p.join(' ');
    const a=points[i-1],before=points[Math.max(0,i-2)],after=points[Math.min(points.length-1,i+1)];
    return `C ${a[0]+(p[0]-before[0])/6} ${a[1]+(p[1]-before[1])/6}, ${p[0]-(after[0]-a[0])/6} ${p[1]-(after[1]-a[1])/6}, ${p[0]} ${p[1]}`;
  }).join(' ');
}
function map() {
  const W=1586,H=992,bg='/art/ui/map.webp',max=B.limit(),cleared=B.state.cleared||[];
  if (!selected || lastRenderedView!=='map') selected=Math.min(45,max);
  shownRegion=regionOf(selected);
  const nodes=Array.from({length:100},(_,i)=>{
    const l=i+1,[x,y]=worldLevelPos(l),done=cleared.includes(l),locked=l>max&&!done,boss=!!B.bosses[l];
    return `<button class="node uiXNode ${done?'done':''} ${locked?'locked':''} ${boss?'boss':''} ${l===selected?'uiSel':''}" data-level="${l}" style="left:${x/WORLD_W*100}%;top:${y/WORLD_H*100}%" aria-label="Quest ${B.adventureLabel(l)}${boss?', boss':''}${done?', completed':locked?', locked':', ready'}" aria-pressed="${l===selected}">${B.adventureLabel(l)}</button>`;
  }).join('');
  const routes=B.regions.map(r=>`<path class="uiWorldPath" d="${worldTrailPath(Array.from({length:r[2]-r[1]+1},(_,k)=>worldLevelPos(r[1]+k)))}"/>`).join('');
  const connectors=B.regions.slice(0,-1).map((r,i)=>{
    const a=worldLevelPos(r[2]),b=worldLevelPos(B.regions[i+1][1]),mid=(a[0]+b[0])/2;
    return `<path class="uiWorldSeaPath" d="M ${a.join(' ')} C ${mid} ${a[1]}, ${mid} ${b[1]}, ${b.join(' ')}"/>`;
  }).join('');
  const quest=phoneLayout()?phoneQuest(selected):mapSplit()?`<div class="uiXPanelRow">${piece(W,H,bg,'uiXMap',[1186,66,1586,540],`<div id="uiQuest">${questTop(selected)}</div>`,'flex:340')}${piece(W,H,bg,'uiXMap',[1186,540,1586,880],`<div id="uiQuest2">${questBottom(selected)}</div>`,'flex:474')}</div>`:piece(W,H,bg,'uiXMap',[1186,66,1586,880],`<div id="uiQuest">${questPanel(selected)}</div>`);
  return `<section class="uiExactPage uiWorldHQ"><h1 class="uiSr">Adventure HQ</h1><div class="uiWorldMapArea"><div class="uiWorldIntro"><span>100 stages · Boss at every .9</span><strong>Swipe left or right to explore ↔</strong></div><div class="uiWorldViewport" tabindex="0" role="region" aria-label="Adventure islands, scroll left or right"><div class="uiWorldCanvas"><div class="uiWorldOriginal" aria-hidden="true"></div><div class="uiWorldNewIslands" aria-hidden="true"></div><span class="uiWorldRange uiWorldForestRange">${B.adventureLabel(11)} – ${B.adventureLabel(25)}</span><span class="uiWorldRange uiWorldPeaksRange">${B.adventureLabel(26)} – ${B.adventureLabel(45)}</span><div class="uiWorldIslandTitle uiWorldThunder">Thunder Valley <small>${B.adventureLabel(46)} – ${B.adventureLabel(70)}</small></div><div class="uiWorldIslandTitle uiWorldShadow">Shadow Realm <small>${B.adventureLabel(71)} – ${B.adventureLabel(100)}</small></div><svg viewBox="0 0 ${WORLD_W} ${WORLD_H}" preserveAspectRatio="none" aria-hidden="true">${connectors}${routes}</svg>${nodes}</div></div><div class="uiWorldToolbar"><div class="uiWorldLegend"><span><i class="lgDone"></i>Completed</span><span><i class="lgReady"></i>Ready</span><span><i class="lgLocked"></i>Locked</span><span><i class="lgBoss"></i>Boss</span></div><div class="uiWorldRegions">${B.regions.map((r,i)=>`<button data-region="${i}" class="${i===shownRegion?'on':''}">${esc(r[0])}<small>${B.adventureLabel(r[1])}–${B.adventureLabel(r[2])}</small></button>`).join('')}</div><div class="uiWorldControls"><button data-world-pan="-1" aria-label="Scroll map left">‹</button><button id="uiXPrev" aria-label="Previous quest">−</button><button id="uiXCurrent">Current level (${B.adventureLabel(max)})</button><button id="uiXNext" aria-label="Next quest">+</button><button data-world-pan="1" aria-label="Scroll map right">›</button></div></div></div><aside class="uiWorldQuest">${quest}</aside><div class="uiWorldJourney"><strong>Your journey</strong><span>${cleared.length} / 100 stages complete</span><progress value="${cleared.length}" max="100" aria-label="Journey progress"></progress><small>Boss at every .9 stage</small></div></section>`;
}
function focusWorldLevel(l, smooth=true) {
  const viewport=$('.uiWorldViewport'),node=$(`.uiWorldCanvas [data-level="${l}"]`);
  if (!viewport||!node) return;
  if (regionOf(l)<3 && viewport.scrollWidth/2<=viewport.clientWidth+2) { viewport.scrollTo({left:0,behavior:smooth&&!B.state.reducedMotion?'smooth':'instant'}); return; }
  if (node.offsetLeft>=viewport.scrollLeft+24 && node.offsetLeft<=viewport.scrollLeft+viewport.clientWidth-24) return;
  viewport.scrollTo({left:node.offsetLeft-viewport.clientWidth/2,behavior:smooth&&!B.state.reducedMotion?'smooth':'instant'});
}
function phoneQuestContents(l){const info=questInfo(l);return `<div class="uiPhoneQuestArt">${UI.questArt(l)}</div><h2>${esc(B.regions[info.r][0])}</h2><h3>${esc(questName(l))} · Level ${B.adventureLabel(l)}</h3><p>${info.locked?'Complete earlier quests to unlock':info.cleared?'Completed · replay':'Ready to play'}${info.prize?' · 🪙 '+fmt(info.prize.coins):''}</p><button class="button alt" data-go="decks">Edit deck</button><div class="uiPhoneQuestDeck">${deckTop(3).map(c=>B.cardHTML(c)).join('')}</div><button id="uiBegin" class="button gold ${info.locked?'locked':''}" ${info.locked?'disabled':''}>${info.locked?'Complete earlier quests':info.cleared?'Replay battle':'Begin battle'}</button>`}
function phoneQuest(l){return `<div id="uiQuest" class="uiPhoneQuest">${phoneQuestContents(l)}</div>`}
function questInfo(l) {
  const r = regionOf(l), boss = B.bosses[l], cleared = (B.state.cleared || []).includes(l), locked = l > B.limit() && !cleared;
  let prize = null; try { prize = B.questPrize(l); } catch { }
  return { r, boss, cleared, locked, prize };
}
function questTop(l) {
  const W = 1586, H = 992, p = box(W, H), { r, boss, cleared, locked, prize } = questInfo(l);
  return `${text(p(1203, 98, 1560, 142), W, 33, 'uiXRegion', esc(B.regions[r][0]))}
   ${text(p(1205, 140, 1500, 166), W, 19, 'uiXLevel', `${boss ? 'Boss · ' : ''}Level ${B.adventureLabel(l)}`)}
   <div class="uiXArt" style="${p(1196, 179, 1561, 399)};${fs(W, 17)}">${UI.questArt(l)}</div>
   ${text(p(1208, 408, 1560, 458), W, 36, 'uiXQuest', esc(questName(l)))}
   ${text(p(1210, 456, 1560, 486), W, 21, 'uiXStatus ' + (locked ? 'locked' : cleared ? 'done' : ''), locked ? 'Locked' : cleared ? 'Completed · replay' : 'Ready to play')}
   ${text(p(1211, 490, 1565, 522), W, 17, 'uiXDesc', `${boss ? `Defeat ${esc(boss)} to reach level ${B.adventureLabel(l+1).split('.')[0]}.` : esc(REGION_TEXT[r])}${prize ? ` <span>🪙 ${fmt(prize.coins)}</span>` : ''}`)}`;
}
function questBottom(l) {
  const W = 1586, H = 992, p = box(W, H), { locked } = questInfo(l), deck = deckTop(3);
  return `${hot(p(1478, 556, 1562, 582), 'data-go="decks"', 'Edit deck')}
   ${deck.map((c, i) => fitCard(p(1201 + i * 123, 593, 1311 + i * 123, 755), c)).join('')}
   <button class="uiHot uiXBegin ${locked ? 'locked' : ''}" id="uiBegin" style="${p(1200, 788, 1556, 860)}" ${locked ? 'aria-disabled="true"' : ''} aria-label="${locked ? 'Locked' : 'Begin battle'}">${locked ? `<span style="${fs(W, 22)}">🔒 Complete earlier quests</span>` : ''}</button>`;
}
const questPanel = l => questTop(l) + questBottom(l);
function selectLevel(l) {
  if (!Number.isInteger(l)||l<1||l>100) return;
  selected=l;shownRegion=regionOf(l);
  const q=$('#uiQuest'),q2=$('#uiQuest2');if(!q)return;
  if(phoneLayout())q.innerHTML=phoneQuestContents(l);else if(q2){q.innerHTML=questTop(l);q2.innerHTML=questBottom(l)}else q.innerHTML=questPanel(l);
  $$('.uiWorldCanvas .uiXNode').forEach(n=>{const active=+n.dataset.level===l;n.classList.toggle('uiSel',active);n.setAttribute('aria-pressed',String(active))});
  $$('[data-region]').forEach(b=>b.classList.toggle('on',+b.dataset.region===shownRegion));
  afterMap(false);
}
function afterMap(initial=true) {
  B.bind();
  const begin=$('#uiBegin');if(begin)begin.onclick=()=>{if(!begin.classList.contains('locked'))B.beginBattle(selected)};
  $$('.uiWorldCanvas .uiXNode').forEach(n=>n.onclick=()=>selectLevel(+n.dataset.level));
  const choose=l=>{selectLevel(l);focusWorldLevel(l)};
  if($('#uiXPrev'))$('#uiXPrev').onclick=()=>choose(Math.max(1,selected-1));
  if($('#uiXNext'))$('#uiXNext').onclick=()=>choose(Math.min(100,selected+1));
  if($('#uiXCurrent'))$('#uiXCurrent').onclick=()=>choose(B.limit());
  $$('[data-region]').forEach(b=>b.onclick=()=>{const r=B.regions[+b.dataset.region],cleared=B.state.cleared||[];let l=r[1];while(l<r[2]&&cleared.includes(l))l++;choose(l)});
  $$('[data-world-pan]').forEach(b=>b.onclick=()=>{const viewport=$('.uiWorldViewport');viewport.scrollBy({left:+b.dataset.worldPan*viewport.clientWidth*.8,behavior:B.state.reducedMotion?'instant':'smooth'})});
  const viewport=$('.uiWorldViewport');if(viewport)viewport.onkeydown=e=>{if(e.target!==viewport)return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();viewport.scrollBy({left:(e.key==='ArrowLeft'?-1:1)*viewport.clientWidth*.7,behavior:B.state.reducedMotion?'instant':'smooth'})}};
  fitCards();if(initial)requestAnimationFrame(()=>focusWorldLevel(selected,false));
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
  portraitPainting(wrap, 'uiXVault', W, H, '/art/ui/vault.webp', [[[0,80,W,210]], [[35,210,532,595],[535,210,1007,595]], [[1007,210,1502,595],[35,595,532,970]], [[535,595,1007,970],[1007,595,1502,970]]]);
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
  portraitPainting(wrap, 'uiXPacks', W, H, '/art/ui/packs.webp', [[[0,69,W,158]], [[110,158,542,476],[548,158,990,476]], [[995,158,1428,476],[110,479,542,796]], [[548,479,990,796],[995,479,1428,796]], [[110,800,1428,940]], [[0,940,W,H]]]);
}
// Phones: the painted pack wrapper replaces the emoji on each pack card.
const PACK_IDS = ['pack', 'star', 'crystal', 'mythic', 'legend', 'celestial', 'hacker'];
function packsNarrow() {
  $$('.packTier').forEach((t, i) => { const icon = t.firstElementChild; if (icon && !t.querySelector('.uiPackArt') && PACK_IDS[i]) icon.outerHTML = `<img class="uiPackArt" src="/art/ui/pack-${PACK_IDS[i]}.webp" alt="" width="160" height="285">`; });
}


/* ---------------------------------------------------------------- Mutation Vault (mockup 1587 × 991) */
// Rearranges the game's own Mutation Vault (same buttons, purchase and confirmation) onto the mockup.
// Page 2 of the mutation cards: the newer mutations, drawn live in the same six painted card frames.
const MUT_NEW = ['bloom', 'tide', 'crystal', 'solar', 'void', 'prism'];
let mutCardPage = 0, mutCardSel = null;
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
   ${text(p(512, 561, 622, 581), W, 14.5, 'uiXMHead', c.mutation ? 'New copy' : `With ${esc(m.name)}`)}
   ${text(p(385, 594, 445, 624), W, 22, 'uiXMVal', esc(cmp[0] || ''))}${text(p(535, 594, 600, 624), W, 22, 'uiXMVal gold', esc(cmp[1] || ''))}
   ${text(p(385, 639, 445, 669), W, 22, 'uiXMVal', esc(cmp[2] || ''))}${text(p(535, 639, 600, 669), W, 22, 'uiXMVal gold', esc(cmp[3] || ''))}
   ${m.packOnly ? text(p(330, 680, 560, 718), W, 22, 'uiXMPrice uiXMPacks', '🎁 Found in packs') : text(p(378, 684, 520, 716), W, 24, 'uiXMPrice', `${fmt(m.cost)} <small>coins</small>`)}
   <div class="uiXMBuy" style="${p(250, 722, 596, 765)};${fs(W, 19)}"></div>
   <div class="uiTxt uiXMNeed" style="${p(250, 768, 596, 792)};${fs(W, 15)}"></div>
   <div class="uiXMConfirm" style="${p(196, 556, 650, 806)};${fs(W, 15)}"></div>
   ${(() => { if (m.id !== mutCardSel) { mutCardSel = m.id; mutCardPage = MUT_NEW.includes(m.id) ? 1 : 0; } const slots = Object.values(MUT_CARDS);
     return [Object.keys(MUT_CARDS), MUT_NEW].map((ids, pg) => ids.map((id, i) => { const x = B.MUTATIONS.find(q => q.id === id); return `<div class="uiXMCard uiXMP${pg} ${pg ? 'uiXMLive' : ''} ${id === m.id ? 'sel' : ''} ${c.mutation === id ? 'active' : ''}" data-mcard="${id}" style="${p(...slots[i])};${fs(W, 14.5)};--mut:${x?.color}">${pg && x ? `<span class="uiXMLArt">${B.art({ ...c, mutation: id })}</span><span class="uiXMLName"><i>${x.icon}</i>${esc(x.name)}</span><span class="uiXMLPrice packs">🎁 Packs only</span>` : ''}</div>`; }).join('')).join(''); })()}
   <div class="uiXMCardPager" style="${p(1268, 170, 1410, 204)};${fs(W, 15)}"><button type="button" data-mcp="0" aria-label="Original mutations">‹</button><span></span><button type="button" data-mcp="1" aria-label="More mutations">›</button></div>
   <div class="uiTxt uiXMNote" style="${p(745, 742, 1382, 802)};${fs(W, 13.5)}">First purchase: mutate this card. Later purchases: new copies in Inventory.<small>Bloom, Tide, Crystal, Solar, Void and Prism come only from packs.</small></div>
   ${text(p(204, 872, 420, 896), W, 15.5, 'uiXMCount', `${fmt(st.owned.length)} Mythlings`)}
   <div class="uiXMPager" style="${p(204, 905, 430, 940)};${fs(W, 15)}"></div>
   ${MUT_TILES.map((b, i) => `<div class="uiXMTile" data-mtile="${i}" style="${p(...b)};${fs(W, 17)}"></div>`).join('')}`);
  app.insertBefore(wrap, app.firstChild.nextSibling);
  const showCards = () => { wrap.classList.toggle('uiXMPage1', mutCardPage === 1); $('.uiXMCardPager span', wrap).textContent = `${mutCardPage + 1} / 2`; $$('[data-mcp]', wrap).forEach(b => b.disabled = +b.dataset.mcp === mutCardPage); };
  $$('[data-mcp]', wrap).forEach(b => b.onclick = () => { mutCardPage = +b.dataset.mcp; showCards(); }); showCards();
  // Mutation cards: the game's option buttons become the card hotspots; the live damage/vault line is drawn in place.
  for (const b of opts) {
    const host = $(`[data-mcard="${b.dataset.mutation}"]`, wrap); if (!host) continue;
    const line = b.querySelectorAll(':scope > span')[1]?.textContent || '';
    b.className = 'uiXMOpt'; b.setAttribute('aria-label', `${b.dataset.mutation} mutation. ${line}`); b.innerHTML = '';
    host.append(b);
    host.insertAdjacentHTML('beforeend', `<span class="uiXMLine" style="top:75.4%">${esc(line)}</span>${host.classList.contains('sel') ? '<span class="uiXMBadge">SELECTED</span>' : ''}${host.classList.contains('active') ? '<span class="uiXMBadge act">ACTIVE</span>' : ''}`);
  }
  // Buy button, status line and replacement confirmation.
  const buy = $('#mutate'), status = $('#mutationStatus'), confirmBox = $('#mutationConfirm');
  if (buy) { buy.className = 'uiXMBtn'; buy.textContent = m.packOnly ? 'FOUND IN PACKS ONLY' : c.mutation ? `CREATE ${m.name.toUpperCase()} COPY` : `APPLY ${m.name.toUpperCase()}`; $('.uiXMBuy', wrap).append(buy); }
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
  portraitPainting(wrap, 'uiXMutation', W, H, '/art/ui/mutation.webp', [[[0,55,W,160]], [[175,160,665,552],[175,552,665,826]], [[670,160,1425,826]], [[175,832,1425,H]]]);
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
  const slot = (c, b) => `<div class="uiXFSlot uiXFSlotCard" style="${p(...b)}">${cardFit(c)}</div>`;
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
    b.setAttribute('aria-label', `${b.disabled ? 'Protected' : picked ? 'Deselect' : 'Select'} ${sp.name || ''}, level ${c?.level || 1}`);
    b.innerHTML = `${c ? cardFit(c) : ''}${b.disabled ? `<span class="uiXFProt">🛡 ${esc(reason.replace(/ · .*$/, ''))} · ${esc(/Vault/.test(reason) ? 'Take out first' : /Trade/.test(reason) ? 'In trade' : 'Protected')}</span>` : `<span class="uiXFChoose">${picked ? '✓ Selected' : 'Choose for Fusion'}</span>`}`;
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
  observeCardFits(wrap);
}
// Narrow screens: the game's own Fusion page, with printed cards in place of the portraits.
function fusionNarrow() {
  const st = B.state;
  for (const b of $$('[data-fusion-id]')) {
    const c = st.owned.find(x => x.id === b.dataset.fusionId), pic = $('.creature', b); if (!c || !pic) continue;
    $$(':scope > strong, :scope > p', b).forEach(e => e.remove()); pic.outerHTML = cardFit(c); b.classList.add('uiFCardPick');
  }
  const pair = $('.fusionPair'), chosen = $$('[data-fusion-id].picked').map(b => st.owned.find(c => c.id === b.dataset.fusionId));
  if (pair) $$(':scope > div', pair).forEach(d => { const pic = $('.creature', d); if (!pic) return; const name = $('strong', d)?.textContent, c = chosen.find(x => B.species[x.kind]?.name === name) || chosen.shift(); if (!c) return; d.classList.add('uiFPairCard'); d.innerHTML = cardFit(c); });
  observeCardFits();
}

/* Fusion result: the printed card; special results first show their special ability and stat boosts. */
const isSpecial = c => !!(c && (c.shiny || c.secret || B.rarityRank(c) >= 4));
function cardStats(c) {
  const t = document.createElement('div'); t.innerHTML = B.cardHTML(c);
  return { hp: parseInt($('.cardTop span', t)?.textContent, 10) || 0, moves: $$('.printedMove', t).map(m => ({ name: $('.printedMoveName', m)?.textContent || '', dmg: parseInt($('strong', m)?.textContent, 10) || 0, cost: $('.energyCost', m)?.innerHTML || '' })) };
}
function fusionResult(c) {
  const hero = $('#app .hero.center'), pic = hero && $('.creature', hero); if (!c || !pic) return;
  const holder = document.createElement('div'); holder.className = 'uiFResult'; holder.innerHTML = cardFit(c);
  pic.replaceWith(holder); $$('h2, h2 + p', hero).forEach(e => e.remove()); observeCardFits(holder);
  if (!isSpecial(c)) { holder.classList.add('uiFReveal'); return; }
  holder.classList.add('uiFHidden');
  const now = cardStats(c), base = cardStats({ ...c, shiny: false, secret: false, rarity: 'Common', bonus: 0 });
  const plus = (a, b) => a > b ? ` <em>+${a - b}</em>` : '';
  const sp = now.moves.reduce((m, x) => x.dmg > m.dmg ? x : m, now.moves[0] || { name: '', dmg: 0, cost: '' }), spBase = base.moves.find(m => m.name === sp.name)?.dmg || sp.dmg;
  const tags = [c.secret && 'Secret', B.rarityRank(c) >= 4 && B.rarityLabel(c), c.shiny && '✦ Shiny'].filter(Boolean);
  const show = () => {
    const o = document.createElement('div'); o.className = 'uiFAbility'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Special ability');
    o.style.setProperty('--glow', B.revealColor(c));
    o.innerHTML = `<div class="uiFAbBox"><p class="uiFAbKick">Special fusion!</p><p class="uiFAbTags">${tags.map(x => `<span>${esc(x)}</span>`).join('')}</p>
     <h2>${esc(B.species[c.kind]?.name || '')}</h2><p class="uiFAbLabel">Special ability</p>
     <div class="uiFAbMove"><span class="energyCost">${sp.cost}</span><strong>${esc(sp.name)}</strong><b>${sp.dmg}${plus(sp.dmg, spBase)}</b></div>
     <dl class="uiFAbStats"><div><dt>HP</dt><dd>${now.hp}${plus(now.hp, base.hp)}</dd></div>${now.moves.map((m, i) => `<div><dt>${esc(m.name)}</dt><dd>${m.dmg}${plus(m.dmg, base.moves[i]?.dmg || m.dmg)}</dd></div>`).join('')}</dl>
     <button class="button gold" type="button">See your card ›</button></div>`;
    document.body.appendChild(o);
    let gone = false;
    const done = () => { if (gone) return; gone = true; o.classList.add('out'); setTimeout(() => o.remove(), 350); holder.classList.remove('uiFHidden'); holder.classList.add('uiFReveal'); };
    $('button', o).onclick = done; o.addEventListener('click', e => { if (e.target === o) done(); });
    addEventListener('keydown', function k(e) { if (e.key === 'Escape' || e.key === 'Enter') { removeEventListener('keydown', k); done(); } });
    $('button', o).focus();
  };
  // Wait for the fusion animation to finish first.
  const t0 = Date.now(), wait = () => { if (!document.body.contains(holder)) return; if ($('.fxStage') && Date.now() - t0 < 8000) return setTimeout(wait, 120); show(); };
  setTimeout(wait, 150);
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


/* ---------------------------------------------------------------- Friends, portrait tablet (mockup 1045 × 1506) */
const tabPortrait = () => !phoneLayout() && innerWidth >= 700 && innerWidth < 1200 && innerHeight > innerWidth;
function friendsTab(data) {
  const app = $('#app'), form = $('#addFriendForm'), lists = $('#friendLists'); if (!lists || !data?.me || (!form && !$('.uiXFTPage'))) return;
  const W = 1045, H = 1506, p = box(W, H), st = B.state, me = (B.active?.() || st.owned?.[0]);
  let wrap = $('.uiXFTPage');
  if (!wrap) {
    wrap = document.createElement('section'); wrap.className = 'uiExactPage uiXFTPage';
    wrap.innerHTML = canvas(W, H, '/art/ui/friends-tab.webp', 'uiXFriendsTab', `
     <h1 class="uiSr">Friends</h1>
     <div class="uiXFTAva" style="${p(70, 302, 232, 442)}">${me ? B.art(me) : ''}</div>
     ${text(p(265, 340, 700, 394), W, 36, 'uiXFTName', esc(data.me.username))}
     <button class="uiHot" data-copy-name style="${p(262, 310, 700, 394)}" aria-label="Copy username"></button>
     <button class="uiHot" id="uiXFTAddBtn" style="${p(720, 333, 985, 412)}" aria-expanded="false" aria-controls="uiXFTAdd" aria-label="Add Player"></button>
     <button class="uiHot" id="uiXRecToggle" style="${p(36, 478, 1010, 548)}" aria-expanded="false" aria-controls="uiXRecovery" aria-label="Player recovery code"></button>
     <div class="uiTxt uiXFTCount" style="${p(338, 598, 400, 644)};${fs(W, 36)}"></div>
     <div class="uiXFTList" style="${p(52, 652, 996, 945)}"></div>
     <div class="uiXFTAdd" id="uiXFTAdd" hidden style="left:${36 / W * 100}%;top:${(420 / H * 100).toFixed(3)}%;width:${974 / W * 100}%;${fs(W, 20)}"><h2>Add a player</h2><form class="uiXFTForm"></form><div class="uiXFTStatus"></div></div>`);
    app.insertBefore(wrap, app.firstChild.nextSibling);
    const input = $('#friendName'), send = $('#sendFriend'), f = $('.uiXFTForm', wrap), add = $('#uiXFTAdd', wrap), addBtn = $('#uiXFTAddBtn', wrap);
    input.className = 'uiXFTInput'; input.placeholder = "Friend's username"; input.setAttribute('aria-label', "Player's username");
    send.className = 'uiXFTFind'; send.textContent = 'Find Player';
    f.append(input, send); f.onsubmit = form.onsubmit; form.remove();
    const err = $('#friendsError'); $('.uiXFTStatus', wrap).append(err);
    const open = v => { add.hidden = !v; addBtn.setAttribute('aria-expanded', String(v)); if (v) input.focus(); };
    addBtn.onclick = () => open(add.hidden);
    new MutationObserver(() => { if (err.textContent.trim()) open(true); }).observe(err, { childList: true, characterData: true, subtree: true });
    $$('[data-copy-name]', wrap).forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(data.me.username); B.toast('Username copied: ' + data.me.username); } catch { B.toast('Your username is ' + data.me.username); } });
    const rec = $$('#app > details.panel').find(d => /recovery code/i.test(d.textContent));
    if (rec) { rec.id = 'uiXRecovery'; rec.classList.add('uiXRecovery'); $('summary', rec)?.remove(); wrap.after(rec); const t = $('#uiXRecToggle', wrap); t.onclick = () => { rec.open = !rec.open; t.setAttribute('aria-expanded', String(rec.open)); if (rec.open) rec.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }; }
    $('.uiXFTList', wrap).append(lists);
    for (const el of [...app.children]) if (el !== wrap && el !== rec && !el.matches('.uiTop, .nav, #fxLayer, #toast')) el.remove();
  }
  // Every refresh: the count, and each friend as a row like the design (the game's own buttons keep working).
  $('.uiXFTCount', wrap).textContent = data.friends.length;
  for (const h of $$('h2', lists)) if (/^Your Friends/.test(h.textContent)) { h.classList.add('uiSr'); h.closest('section')?.classList.add('uiXFTFriends'); }
  for (const row of $$('.uiXFTFriends .friendRow', lists)) {
    if (row.classList.contains('uiXFTRow')) continue;
    const name = $('strong', row)?.textContent || '', fr = data.friends.find(x => x.username === name); if (!fr) continue;
    const trade = $('[data-trade-invite]', row), duel = $('[data-mode="duel"]', row), coop = $('[data-mode="coop"]', row);
    const btns = document.createElement('div'); btns.className = 'uiXFTBtns';
    for (const [b, k, label] of [[trade, 'trade', 'Trade'], [duel, 'duel', 'Battle Against'], [coop, 'coop', 'Battle Together']]) if (b) { b.className = 'uiXFTBtn uiXFTBtn-' + k; b.textContent = ''; b.setAttribute('aria-label', `${label} with ${name}`); btns.append(b); }
    row.className = 'friendRow uiXFTRow';
    row.replaceChildren();
    row.insertAdjacentHTML('afterbegin', `<span class="uiXFTRowAva">${B.art(fr.pet)}</span><span class="uiXFTRowWho"><strong>${esc(name)}</strong><small class="${fr.online ? 'on' : ''}"><i></i>${fr.online ? 'Online' : 'Offline'}</small></span><span class="uiXFTRowLine" aria-hidden="true"></span>`);
    row.append(btns);
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

/* ---------------------------------------------------------------- Card battle, portrait tablet (mockup 1045 × 1505) */
function battleTab() {
  const arena = $('.cardArena'); if (!arena || $('.uiXBattleTab', arena)) return;
  const W = 1045, H = 1505;
  const wrap = document.createElement('section'); wrap.className = 'uiExactPage uiXBTPage';
  wrap.innerHTML = canvas(W, H, '/art/ui/battle-tab.webp', 'uiXBattleTab', `<button class="uiHot uiXBTArrow" data-dir="-1" style="${box(W, H)(12, 1342, 50, 1404)}" aria-label="Scroll hand left"></button><button class="uiHot uiXBTArrow" data-dir="1" style="${box(W, H)(998, 1342, 1036, 1404)}" aria-label="Scroll hand right"></button>`);
  const host = $('.uiXBattleTab', wrap), stage = document.createElement('div'); stage.className = 'uiXBLayer'; host.append(stage);
  for (const el of [...arena.children]) stage.append(el);
  $$(':scope > details', stage).forEach((d, i) => d.classList.add(i ? 'uiXBLog' : 'uiXBDiscard'));
  const retreat = $('.retreatPanel', stage), panel = $('.attackPanel', stage); if (retreat && panel) panel.append(retreat);
  // Score only (the names are already above each side): "0 : 0" with the first-to / turn line under it.
  const score = $('.battleBar > strong', stage); if (score) { const [a, b] = $$(':scope > b', score), small = $('small', score); if (a && b) score.replaceChildren(a, ' : ', b, ...(small ? [small] : [])); }
  arena.append(wrap);
  const z = () => host.style.setProperty('--z', (host.clientWidth / W).toFixed(4)); z(); battleTabRO.observe(host);
  $$('.uiXBTArrow', wrap).forEach(b => b.onclick = () => { const row = $('.handRow', wrap); if (row) row.scrollBy({ left: +b.dataset.dir * row.clientWidth * .8, behavior: 'smooth' }); });
}
const battleTabRO = new ResizeObserver(entries => { for (const e of entries) e.target.style.setProperty('--z', (e.target.clientWidth / 1045).toFixed(4)); });

/* ---------------------------------------------------------------- Wiring */
function onFrame() {
  lastRenderedView = B.view;
  const exact = wide() && ['home', 'map', 'vault', 'username', 'packs', 'mutation', 'fusion', 'fuse', 'friends', 'cardBattle'].includes(B.view) && (B.view !== 'cardBattle' || !!document.querySelector('.cardArena')) && (B.view !== 'friends' || !!document.querySelector('#friendLists')) && (!['fusion', 'fuse'].includes(B.view) || !!document.querySelector('.fusionPreview'));
  document.body.classList.toggle('uiExact', exact);
  if (exact && B.view === 'vault') vaultExact();
  if (exact && B.view === 'username') welcomeExact();
  if (['fusion', 'fuse'].includes(B.view) && exact) fusionExact();
  if (['fusion', 'fuse'].includes(B.view) && !exact && $('.fusionPreview')) fusionNarrow();
  if (B.view === 'cardBattle' && exact) battleExact();
  if (B.view === 'cardBattle' && !exact && tabPortrait() && $('.cardArena')) { document.body.classList.add('uiExact'); battleTab(); }
  if (B.view === 'mutation' && exact) queueMicrotask(() => { if (B.view === 'mutation') mutationExact(); });
  // packs() binds its buttons and adds reward packs after drawing, so rearrange once it has finished.
  if (B.view === 'packs') queueMicrotask(() => { if (B.view !== 'packs') return; if (exact) packsExact(); else packsNarrow(); });
  if (!exact && B.view === 'username') welcomeNarrow();
  if (exact) { const c = $('.uiX'); if (c) ro.observe(c); fitCards(); const u = $('#uiUser'); if (u && !u.dataset.bound) { u.dataset.bound = '1'; } }
}
if (B && UI) {
  document.addEventListener('click', event => {
    if (event.target.closest('[data-go="map"]')) lastRenderedView = null;
  }, true);
  Object.assign(UI, { baseHome: UI.home, baseMap: UI.map, baseAfterMap: UI.afterMap, baseSelect: UI.selectLevel, exactWide: wide });
  Object.assign(UI, { home, map, afterMap, selectLevel });
  window.addEventListener('ember:frame', onFrame);
  window.addEventListener('ember:friends', e => { if (B.view !== 'friends') return; if (wide()) { document.body.classList.add('uiExact'); friendsExact(e.detail); } else if (tabPortrait()) { document.body.classList.add('uiExact'); friendsTab(e.detail); } });
  window.addEventListener('ember:fusion', e => fusionResult(e.detail.creature));
  let wasPhone = phoneLayout();
  let wasWide = wide();
  let wasSplit = mapSplit();
  addEventListener('resize', () => { const now = wide(), split = mapSplit(); const nowPhone=phoneLayout();if(nowPhone!==wasPhone){wasPhone=nowPhone;wasWide=now;wasSplit=split;if(['home','map','vault','packs','mutation','fusion','friends','inventory','index','decks'].includes(B.view))return B.go(B.view);} if (split !== wasSplit && ['mutation','vault','packs'].includes(B.view)) { wasSplit = split; wasWide = now; return B.go(B.view); } if (B.view === 'map' && split !== wasSplit) { wasSplit = split; wasWide = now; return B.go('map'); } if (B.view === 'friends' && (now !== wasWide || split !== wasSplit)) { wasSplit = split; wasWide = now; return B.go('friends'); } wasSplit = split; if (now !== wasWide) { wasWide = now; if (['home', 'map', 'vault', 'packs', 'mutation', 'fusion'].includes(B.view)) B.go(B.view); } });
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
