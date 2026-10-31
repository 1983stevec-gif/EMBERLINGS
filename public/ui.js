// EMBERLINGS interface: header, Home and Adventure HQ in the dark-and-gold card-game style.
// Talks to the game only through window.EmberBridge. Painted artwork placed in /art/ui/ replaces the built-in compositions automatically.
const B = window.EmberBridge;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fmt = n => Math.floor(Number(n) || 0).toLocaleString();
const ELEMENT_ICONS = { Fire: '🔥', Water: '💧', Nature: '🍃', Lightning: '⚡', Moon: '🌙', Crystal: '💎', Ice: '❄️', Shadow: '🌑', Wind: '🌪️' };
const ELEMENT_COLORS = { Fire: '#e67e4e', Moon: '#a796dc', Nature: '#72b987', Lightning: '#e3c857', Water: '#64b5d6', Crystal: '#cba0d8', Ice: '#9bd5dd', Shadow: '#9276b5', Wind: '#86cbb6' };
const NAV = [['home', 'Home'], ['packs', 'Packs'], ['inventory', 'My Binder'], ['map', 'Adventure HQ'], ['friends', 'Friends']];
const SLIM_VIEWS = ['vault'];
const FULL_VIEWS = ['home', 'map', 'inventory', 'index', 'decks'];
const ext = () => { const st = B.state; if (!st.ember || typeof st.ember !== 'object') st.ember = {}; return st.ember; };

/* Optional painted artwork: put files in public/art/ui/ and list their keys in public/art/ui/manifest.json (for example ["hero","map"]). */
const ART = { hero: '/art/ui/home-hero.webp', collection: '/art/ui/home-tile0.webp', packs: '/art/ui/home-tile1.webp', fusion: '/art/ui/home-tile2.webp', trading: '/art/ui/home-tile3.webp', journey: '/art/ui/home-journey.webp' };
const artFound = {};
fetch('/art/ui/manifest.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : []).then(list => { for (const k of Array.isArray(list) ? list : []) if (ART[k]) artFound[k] = ART[k]; applyArt(); }).catch(() => {});
function applyArt() { for (const el of $$('[data-ui-art]')) { const src = artFound[el.dataset.uiArt]; if (src && !el.classList.contains('uiHasArt')) { el.style.backgroundImage = `url(${src})`; el.classList.add('uiHasArt'); } } }


/* Animated EMBERLINGS logo: flame (flicker, glow, embers) + lettering. Height is set with --logo-h. */
function logoHTML(cls = '') {
  return `<span class="uiLogo ${cls}" role="img" aria-label="EMBERLINGS"><span class="uiFlameBox" aria-hidden="true"><i class="uiFlameGlow"></i><img class="uiFlame" src="/branding/logo-flame.png" alt="" width="76" height="96"><img class="uiFlame uiFlameHot" src="/branding/logo-flame.png" alt="" width="76" height="96"><i class="uiEmber"></i><i class="uiEmber"></i><i class="uiEmber"></i><i class="uiEmber"></i></span><img class="uiWord" src="/branding/logo-word.png" alt="" width="317" height="44"></span>`;
}
/* ---------------------------------------------------------------- Header */
function head() {
  const st = B.state, v = B.view, active = B.active?.() || st.owned?.[0];
  const navView = ['index', 'decks'].includes(v) ? 'inventory' : ['rules', 'cardBattle', 'cardResult'].includes(v) ? 'map' : ['trading'].includes(v) ? 'friends' : ['reveal', 'packSummary', 'packOpening', 'packReview'].includes(v) ? 'packs' : v;
  if (SLIM_VIEWS.includes(v)) return `<header class="top uiTop uiTopSlim"><button class="uiBrand" data-go="home" aria-label="EMBERLINGS home"><span class="uiBrandText">${logoHTML()}<small>Magical adventure</small></span></button><div class="uiRight"><div class="coins" aria-label="Coins"><i class="uiCoin" aria-hidden="true"></i><b>${fmt(st.coins)}</b></div></div></header>`;
  return `<header class="top uiTop"><button class="uiBrand" data-go="home" aria-label="EMBERLINGS home">${logoHTML()}</button>
  <nav class="uiNav" aria-label="Main">${NAV.map(([g, t]) => [g, g === 'inventory' && v === 'decks' ? 'Card Vault' : t]).map(([g, t]) => `<button data-go="${g}" class="${navView === g ? 'active' : ''}" ${navView === g ? 'aria-current="page"' : ''}>${t}</button>`).join('')}</nav>
  <div class="uiRight"><div class="coins" aria-label="Coins"><i class="uiCoin" aria-hidden="true"></i><b>${fmt(st.coins)}</b></div>
  ${v === 'home' && !window.EmberUI?.exactWide?.() ? '' : '<!--'}<button class="uiUser" id="uiUser" aria-haspopup="menu" aria-expanded="false"><span class="uiAvatar">${active ? B.art(active) : ''}</span><span class="uiUserName">${esc(st.playerUsername || 'Explorer')}</span><span aria-hidden="true">▾</span></button>${v === 'home' && !window.EmberUI?.exactWide?.() ? '' : '-->'}</div></header>`;
}
function userMenu(anchor) {
  const old = $('.uiMenu'); if (old) { old.remove(); anchor.setAttribute('aria-expanded', 'false'); return; }
  const e = ext(), r = anchor.getBoundingClientRect();
  const m = document.createElement('div'); m.className = 'uiMenu'; m.setAttribute('role', 'menu');
  m.style.top = r.bottom + 8 + 'px'; m.style.right = Math.max(8, innerWidth - r.right) + 'px';
  m.innerHTML = `${e.title ? `<p class="uiMenuTitle">🏷 ${esc(e.title)}</p>` : ''}
   <button role="menuitem" data-go="friends">👥 Friends</button><button role="menuitem" data-go="achievements">🏆 Achievements & titles</button><button role="menuitem" data-go="album">📖 Collection Album</button><button role="menuitem" data-go="decks">🎴 Battle Deck</button>
   <hr><button role="menuitem" id="uiSound">${e.muted ? '🔇 Sound off' : '🔊 Sound on'}</button><button role="menuitem" id="uiMotion">${B.state.reducedMotion ? '✓ Reduce motion' : '◻ Reduce motion'}</button>`;
  document.body.appendChild(m); anchor.setAttribute('aria-expanded', 'true');
  m.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.id === 'uiSound') { e.muted = !e.muted; B.save(); b.textContent = e.muted ? '🔇 Sound off' : '🔊 Sound on'; return; }
    if (b.id === 'uiMotion') { B.state.reducedMotion = !B.state.reducedMotion; B.save(); m.remove(); B.go(B.view === 'home' ? 'home' : B.view); return; }
    m.remove(); B.go(b.dataset.go);
  });
  setTimeout(() => document.addEventListener('pointerdown', function close(ev) { if (!m.contains(ev.target) && ev.target !== anchor) { m.remove(); anchor.setAttribute('aria-expanded', 'false'); } document.removeEventListener('pointerdown', close); }), 0);
}

/* ---------------------------------------------------------------- Home */
const card = (c, cls = '') => `<div class="uiMiniCard ${cls}" style="--el:${ELEMENT_COLORS[B.species[c.kind]?.element] || '#c9a35a'}">${B.art(c)}<span class="uiEl">${ELEMENT_ICONS[B.species[c.kind]?.element] || '✦'}</span></div>`;
function deckTop(n = 3) {
  const seen = new Set(), cards = [];
  for (const c of B.deck()) { if (c.cardType === 'trainer' || c.kind === undefined || seen.has(c.kind)) continue; seen.add(c.kind); cards.push(c); }
  const pool = cards.length ? cards : (B.state.owned || []);
  return pool.slice(0, n);
}
function home() {
  const st = B.state, cleared = (st.cleared || []).length, species = (st.discovered || []).length, fan = deckTop(3);
  const order = fan.length === 3 ? [fan[1], fan[0], fan[2]] : fan;
  const tile = (go, art, icon, title, sub, inner) => `<button class="uiTile" data-go="${go}"><span class="uiTileArt" data-ui-art="${art}">${inner}</span><span class="uiTileBar"><span class="uiTileIcon" aria-hidden="true">${icon}</span><span><strong>${title}</strong><small>${sub}</small></span><span class="uiChevron" aria-hidden="true">›</span></span></button>`;
  return `<section class="uiHome">
  <div class="uiHero" data-ui-art="hero"><div class="uiHeroScene" aria-hidden="true">${heroScene()}</div>
    <div class="uiHeroText"><p class="uiKicker">Your next adventure</p><h1>Awaken the ember.</h1><p>Collect Mythlings. Master your deck. Explore the islands.</p>
    ${st.cardBattle ? '<button class="uiCta" id="uiResume">Resume card battle <span>›</span></button>' : '<button class="uiCta" data-go="map">Explore islands <span>›</span></button>'}</div></div>
  <aside class="uiDeckPanel uiFrame"><h2><span aria-hidden="true">🂠</span> Your battle deck</h2><div class="uiFan">${order.map((c, i) => card(c, order.length === 3 && i === 1 ? 'uiFanMain' : '')).join('')}</div>
    <button class="uiBtnGold" data-go="decks">🂠 Edit deck</button><button class="uiBtnLine" data-go="training">⚔ Training field</button></aside>
  <div class="uiTiles features">
    ${tile('inventory', 'collection', '📖', 'Mythling Collection', `${fmt(st.owned.length)} cards • ${species} / ${B.species.length} species`, `<span class="uiTrio">${[0, 4, 2, 7].map(k => `<span>${B.art({ kind: k })}</span>`).join('')}</span>`)}
    ${tile('packs', 'packs', '🂡', 'Open Packs', 'Five Mythlings in every pack', '<span class="uiPack"><img src="/branding/emberlings-icon-192.png" alt=""></span>')}
    ${tile('fusion', 'fusion', '🔮', 'Fusion Lab', 'Combine spare Mythlings', '<span class="uiFuse"><i></i><i></i></span>')}
    ${tile('trading', 'trading', '🤝', 'Friend Trading', 'Trade with your friends', `<span class="uiTrade"><span>${B.art({ kind: 1 })}</span><b>⇄</b><span>${B.art({ kind: 7 })}</span></span>`)}
  </div>
  <button class="uiJourney uiFrame" data-go="map"><span class="uiCompass" aria-hidden="true">✦</span><span class="uiJourneyText"><strong>Your adventure</strong><span>${cleared} / 100 quests</span></span>
    <span class="uiTrack" data-ui-art="journey" aria-hidden="true">${islandsStrip()}<i class="uiTrackFill" style="width:${cleared}%"></i>${[0, 20, 40, 60, 80, 100].map(p => `<b style="left:${p}%" class="${cleared >= p ? 'on' : ''}"></b>`).join('')}</span>
    <span class="uiJourneyEnd"><span aria-hidden="true">⛰</span> All islands available <span class="uiChevron">›</span></span></button>
  <nav class="uiUtility" aria-label="More"><button data-go="index">📖 Index</button><button data-go="rules">⚔ Battle Rules</button><button data-go="vault">🏛 Vault</button><button data-go="mutation">✧ Mutation Vault</button><span class="uiSpacer"></span><button id="uiBackupBtn">💾 Save Backup</button><button id="uiGear" aria-label="Settings">⚙</button></nav>
  <div id="uiDrawer"></div></section>`;
}
function heroScene() {
  return `<svg viewBox="0 0 1100 470" preserveAspectRatio="xMidYMid slice"><defs>
   <linearGradient id="uiSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d9a4"/><stop offset=".45" stop-color="#b8a27a"/><stop offset="1" stop-color="#2d3a2c"/></linearGradient>
   <radialGradient id="uiSun" cx=".55" cy=".25" r=".5"><stop offset="0" stop-color="#fff3c9" stop-opacity=".95"/><stop offset="1" stop-color="#fff3c9" stop-opacity="0"/></radialGradient>
   <linearGradient id="uiFall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf6ff" stop-opacity=".9"/><stop offset="1" stop-color="#bfe3f2" stop-opacity=".25"/></linearGradient></defs>
   <rect width="1100" height="470" fill="url(#uiSky)"/><rect width="1100" height="470" fill="url(#uiSun)"/>
   <path d="M330 300 L370 120 L395 110 L420 60 L445 110 L470 115 L500 70 L520 120 L560 300Z" fill="#8b8f86" opacity=".55"/>
   <path d="M440 300 V150 a28 28 0 0 1 56 0 V300Z" fill="#fff6d6" opacity=".55"/>
   <path d="M0 470 V180 C60 160 90 200 140 170 C190 140 230 190 260 230 L300 470Z" fill="#33432f"/>
   <path d="M210 470 L260 250 C320 220 360 260 380 300 L420 470Z" fill="#4a5a3f" opacity=".85"/>
   <path d="M560 470 L590 230 C640 200 700 230 720 260 L760 470Z" fill="#45573e" opacity=".8"/>
   ${[150, 300, 470, 640].map((x, i) => `<rect x="${x}" y="${180 + i * 12}" width="${10 + i * 2}" height="${180 - i * 10}" fill="url(#uiFall)"><animate attributeName="opacity" values=".7;1;.7" dur="${3 + i}s" repeatCount="indefinite"/></rect>`).join('')}
   <ellipse cx="520" cy="420" rx="420" ry="60" fill="#d8ecf2" opacity=".28"/>
   <path d="M600 470 C640 360 720 330 800 330 C900 330 960 360 1000 470Z" fill="#2c3626"/>
   <path d="M0 0 H1100 V70 C900 40 700 90 520 60 C330 30 160 80 0 50Z" fill="#1f2b1c" opacity=".7"/></svg>
   <span class="uiHeroFox">${B.art({ kind: 0 })}</span>`;
}
function islandsStrip() {
  return `<svg viewBox="0 0 800 60" preserveAspectRatio="none" class="uiIslands">${[[40, 26], [170, 34], [300, 24], [430, 30], [560, 22], [690, 30]].map(([x, h], i) => `<path d="M${x} 50 Q${x + 20} ${50 - h} ${x + 45} ${50 - h - 4} Q${x + 70} ${50 - h} ${x + 95} 50Z" fill="${['#3b5a3a', '#2f5a5a', '#52606e', '#5a5530', '#4a3a5e', '#3a5a40'][i]}"/>`).join('')}</svg>`;
}
function afterHome() {
  $('#uiResume')?.addEventListener('click', () => B.resumeBattle());
  $('#uiBackupBtn')?.addEventListener('click', () => drawer('backup'));
  $('#uiGear')?.addEventListener('click', () => drawer('settings'));
  applyArt();
}
function drawer(kind) {
  const d = $('#uiDrawer'); if (!d) return;
  if (d.dataset.kind === kind) { d.innerHTML = ''; d.dataset.kind = ''; return; }
  d.dataset.kind = kind;
  if (kind === 'backup') {
    // The backup panel is provided by enhancements.js on the home view; open and move it here.
    const panel = $('.fxBackup'); if (panel) { d.innerHTML = ''; d.appendChild(panel); panel.hidden = false; panel.open = true; panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    return;
  }
  const st = B.state, reset = localStorage.getItem(B.key + '-batch3-reset-done') || st.testResetVersion === 3;
  d.innerHTML = `<section class="panel uiSettings"><h2>Settings</h2>
   <p><label><input type="checkbox" id="reducedMotion" ${st.reducedMotion ? 'checked' : ''}> Reduce motion (turns off 3D reveals and effects)</label></p>
   <p><label><input type="checkbox" id="uiMute" ${ext().muted ? 'checked' : ''}> Mute sound</label></p>
   ${(st.cosmetics?.owned || []).includes('collectible-founder') ? '<p class="collectibleEmblem">☀ First Light · Collection Emblem</p>' : ''}
   <p><button class="button alt" data-go="tutorial">Replay Tutorial</button> <button class="button alt" data-go="achievements">Achievements</button> <button class="button alt" data-go="album">Collection Album</button></p>
   <details><summary>Test save tools</summary><p class="small">One-time reset for this browser only. Your current save is backed up first.</p><button class="button alt" id="resetTest" ${reset ? 'disabled' : ''}>Reset My Test Progress Once</button></details></section>`;
  B.bind();
  $('#reducedMotion').onchange = e => { st.reducedMotion = e.target.checked; B.save(); B.go('home'); };
  $('#uiMute').onchange = e => { ext().muted = e.target.checked; B.save(); };
  $('#resetTest').onclick = () => B.resetTest();
}

/* ---------------------------------------------------------------- Adventure HQ */
const REGION_ART = [0, 5, 14, 3, 7];
const REGION_TEXT = ['Your journey begins in the meadows.', 'Crystal light hides clever rivals.', 'Icy winds test every deck.', 'Storms crackle over the valley.', 'Only the bravest enter the dark.'];
const QUEST_NAMES = [
  ['The First Spark', 'Cinder Path', 'Meadow Ambush', 'Windmill Watch', 'Sunlit Trail', 'Hearthstone Bridge', 'Ember Grove', 'Fox Hollow', 'Last Light Ridge'],
  ['Glimmering Gate', 'Shard Path', 'Prism Pool', 'Whispering Pines', 'Lantern Roots', 'Geode Hollow', 'Mirror Lake', 'Crystal Choir', 'Moonlit Glade', 'Facet Falls', 'Silver Thicket', 'Gem Warden', 'Starlight Canopy', 'Shimmer Pass'],
  ['Frostbite Trail', 'Snowdrift Camp', 'Glacier Steps', 'Hailstone Ridge', 'Icefall Cave', 'Rime Bridge', 'Frozen Lake', 'Avalanche Run', 'Pale Summit', 'Blizzard Gate', 'Crystal Ice Hall', 'Northwind Path', 'Aurora Peak', 'Silent Snow', 'Icicle Keep', 'Polar Watch', 'Frosted Spire', 'Winter Crown', 'Coldheart Pass'],
  ['Thunder Road', 'Static Fields', 'Spark Canyon', 'Stormwatch', 'Bolt Bridge', 'Rumble Ridge', 'Charged Plains', 'Lightning Grove', 'Copper Cliffs', 'Volt Hollow', 'Cloudburst', 'Arc Tower', 'Tempest Trail', 'Dynamo Dunes', 'Crackle Creek', 'Thunderhead', 'Surge Summit', 'Flash Flats', 'Ion Gate', 'Sky Anvil', 'Storm Circle', 'Galvanic Path', 'Roaring Skies', 'Final Flash'],
  ['Shadow Gate', 'Dusk Path', 'Umbral Wood', 'Night Market', 'Gloom Marsh', 'Raven Spire', 'Eclipse Bridge', 'Hollow Moon', 'Veil Crossing', 'Starless Lake', 'Whisper Crypt', 'Void Steps', 'Twilight Maze', 'Obsidian Hall', 'Phantom Ridge', 'Mourning Bell', 'Dark Orchard', 'Silent Stars', 'Abyss Edge', 'Nether Road', 'Last Lantern', 'Shade Throne', 'Rift Edge', 'Midnight Spire', 'Edge of Night', 'Final Shadow', 'Grim Gate', 'Dreadwood', 'Void Gate']
];
const ISLE = [
  { top: '#7fae4a', mid: '#5c8b36', cliff: '#6b5a44', deco: 'tree' },
  { top: '#2f7a62', mid: '#235e4c', cliff: '#4d5560', deco: 'crystal' },
  { top: '#eef4fa', mid: '#c5d6e6', cliff: '#7a8a9c', deco: 'peak' },
  { top: '#b7a352', mid: '#8a7a3a', cliff: '#6a5a3a', deco: 'bolt' },
  { top: '#5a4a7a', mid: '#3f325a', cliff: '#2c2440', deco: 'spire' }
];
let selected = null;
const regionOf = l => B.regions.findIndex(r => l >= r[1] && l <= r[2]);
function questName(l) { if (B.bosses[l]) return B.bosses[l]; const r = regionOf(l), list = QUEST_NAMES[r] || [], i = l - B.regions[r][1]; return list[i % list.length] || `Quest ${l}`; }
function nodeCenter(l) { const p = B.positionLevel(l); return [p.x + 22, p.y + 21]; }
function seeded(n) { const x = Math.sin(n * 91.7) * 43758.5453; return x - Math.floor(x); }
function islandPath(cx, cy, rx, ry, seed) {
  const pts = []; const n = 22;
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = .82 + seeded(seed + i) * .3; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  let d = `M${pts[0][0].toFixed(0)} ${pts[0][1].toFixed(0)}`;
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; d += ` Q${p[0].toFixed(0)} ${p[1].toFixed(0)} ${mx.toFixed(0)} ${my.toFixed(0)}`; }
  return d + 'Z';
}
function decoration(kind, x, y, s) {
  if (kind === 'tree') return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-2" y="0" width="4" height="9" fill="#5a3f2a"/><circle cy="-4" r="9" fill="#3f7a2e"/><circle cx="-4" cy="-7" r="5" fill="#5c9a3c"/></g>`;
  if (kind === 'crystal') return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -16 L6 0 L0 6 L-6 0Z" fill="#7fd6ff" opacity=".9"/><circle cx="10" cy="2" r="8" fill="#1f5a44"/></g>`;
  if (kind === 'peak') return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-16 8 L0 -20 L16 8Z" fill="#9fb4c8"/><path d="M-6 -8 L0 -20 L6 -8 L2 -6 L-2 -9Z" fill="#fff"/></g>`;
  if (kind === 'bolt') return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-12 8 L-4 -10 L4 -2 L12 -14 L14 8Z" fill="#7a6a3a"/><path d="M2 -24 L-4 -12 L1 -12 L-3 -2 L6 -15 L1 -15Z" fill="#ffe36a"/></g>`;
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-3 8 L0 -18 L3 8Z" fill="#2a1f3a"/><path d="M-12 8 L-9 -6 L-6 8Z" fill="#3a2c50"/><circle cx="0" cy="-19" r="2.5" fill="#d79bff"/></g>`;
}
function mapSVG() {
  const isles = B.regions.map((r, i) => {
    const pts = []; for (let l = r[1]; l <= r[2]; l++) pts.push(nodeCenter(l));
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const rx = (Math.max(...xs) - Math.min(...xs)) / 2 + 120, ry = (Math.max(...ys) - Math.min(...ys)) / 2 + 100, st = ISLE[i];
    const path = islandPath(cx, cy, rx, ry, i * 40);
    let deco = '';
    for (let k = 0; k < 26; k++) { const a = seeded(i * 100 + k) * Math.PI * 2, d = .45 + seeded(i * 77 + k) * .45; const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d; if (pts.some(p => Math.hypot(p[0] - x, p[1] - y) < 34)) continue; deco += decoration(st.deco, x.toFixed(0), y.toFixed(0), (.9 + seeded(k + i) * .7).toFixed(2)); }
    return `<g><path d="${path}" transform="translate(0 18)" fill="${st.cliff}"/><path d="${path}" fill="${st.mid}" stroke="#e8dcb055" stroke-width="3"/><path d="${islandPath(cx, cy - 8, rx * .86, ry * .8, i * 40 + 7)}" fill="${st.top}" opacity=".85"/>${deco}</g>`;
  }).join('');
  const all = []; for (let l = 1; l <= 100; l++) all.push(nodeCenter(l));
  const route = all.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
  return `<svg class="uiMapSvg" width="1800" height="1080" viewBox="0 0 1800 1080" aria-hidden="true">
   <defs><radialGradient id="uiSea" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#1f6f86"/><stop offset=".7" stop-color="#124a63"/><stop offset="1" stop-color="#0a2a3c"/></radialGradient>
   <pattern id="uiWaves" width="60" height="30" patternUnits="userSpaceOnUse"><path d="M0 15 Q15 8 30 15 T60 15" fill="none" stroke="#ffffff10" stroke-width="2"/></pattern></defs>
   <rect x="-400" y="-400" width="2600" height="1880" fill="url(#uiSea)"/><rect x="-400" y="-400" width="2600" height="1880" fill="url(#uiWaves)"/>
   ${isles}<path d="${route}" class="uiRoute"/></svg>`;
}
function mapNodes() {
  const max = B.limit(), cleared = B.state.cleared || [];
  let out = '';
  for (let l = 1; l <= 100; l++) {
    const p = B.positionLevel(l), done = cleared.includes(l), locked = l > max && !done, boss = !!B.bosses[l];
    out += `<button class="node uiNode ${done ? 'done' : ''} ${locked ? 'locked' : ''} ${boss ? 'boss' : ''} ${l === selected ? 'uiSel' : ''}" data-level="${l}" style="left:${p.x}px;top:${p.y}px" aria-label="Quest ${l}: ${esc(questName(l))}${boss ? ', boss' : ''}${done ? ', completed, replay' : locked ? ', locked' : ', ready'}"><span>${l}</span></button>`;
  }
  return out;
}
function map() {
  const max = B.limit(), cleared = (B.state.cleared || []).length;
  if (!selected || selected > 100) selected = Math.min(100, max);
  if (!map.fitted) { map.fitted = true; const w = innerWidth >= 900 ? Math.min(innerWidth, 1560) - 440 : innerWidth - 24; B.state.map = { x: 0, y: 0, ...(B.state.map || {}), z: Math.max(.4, Math.min(1, w / 1800)) }; }
  const labels = B.regions.map(r => { const pts = []; for (let l = r[1]; l <= r[2]; l++) pts.push(nodeCenter(l)); const cx = (Math.min(...pts.map(p => p[0])) + Math.max(...pts.map(p => p[0]))) / 2, by = Math.max(...pts.map(p => p[1])); return `<div class="uiRegion" style="left:${cx - 150}px;top:${by + 48}px"><strong>${esc(r[0])}</strong><span>${r[1]} – ${r[2]}</span></div>`; }).join('');
  return `<section class="uiHQ"><div class="uiMapPanel uiFrame"><div class="mapWrap uiMap" id="mapWrap" data-ui-art="map"><div class="world" id="world">${mapSVG()}${labels}${mapNodes()}</div>
   <div class="uiMapTitle"><h1>Adventure HQ</h1><p>Choose your next adventure.</p></div>
   <div class="uiCompassRose" aria-hidden="true"><span>N</span><b>✦</b></div>
   <div class="uiLegend"><span><i class="lgDone"></i>Completed</span><span><i class="lgReady"></i>Ready</span><span><i class="lgLocked"></i>Locked</span><span><i class="lgBoss"></i>Boss</span></div>
   <div class="uiZoom mapControls"><button data-map="out" aria-label="Zoom out">−</button><button data-map="in" aria-label="Zoom in">+</button><button data-map="current">Current level (${max})</button></div></div></div>
   <aside class="uiQuest uiFrame" id="uiQuest">${questPanel(selected)}</aside>
   <div class="uiJourneyBar uiFrame"><strong>Your journey</strong><span>${cleared} / 100 levels complete</span><span class="uiTrack"><i class="uiTrackFill" style="width:${cleared}%"></i>${[10, 25, 45, 70, 100].map(p => `<b style="left:${p}%" class="${(B.state.cleared || []).includes(p) ? 'on' : ''}"></b>`).join('')}</span><span class="uiMilestones">Boss milestones <em>10 · 25 · 45 · 70 · 100</em></span></div></section>`;
}

/* Quest picture: a Mythling native to the level's world, changing level by level, framed in that world's colours. */
const WORLDS = [
  { pool: [0, 8, 2, 10, 13], boss: 13, color: '#e9873a', icon: '🔥', tag: 'Meadow' },
  { pool: [5, 2, 9, 10, 1], boss: 5, color: '#7fd0c8', icon: '💎', tag: 'Forest' },
  { pool: [6, 14, 4, 11], boss: 6, color: '#9fd8f2', icon: '❄️', tag: 'Peaks' },
  { pool: [3, 12, 9], boss: 3, color: '#f2d35a', icon: '⚡', tag: 'Valley' },
  { pool: [7, 15, 1], boss: 7, color: '#b98ef0', icon: '🌑', tag: 'Realm' }
];
function questArt(l) {
  const r = B.regions.findIndex(x => l >= x[1] && l <= x[2]), w = WORLDS[r] || WORLDS[0], boss = !!B.bosses[l];
  const kind = boss ? w.boss : w.pool[(l - B.regions[r][1]) % w.pool.length];
  return `<span class="uiWorldArt ${boss ? 'uiWorldBoss' : ''}" style="--world:${w.color}">${B.art({ kind, rarity: boss ? 'Legendary' : 'Common' })}<span class="uiWorldTint" aria-hidden="true"></span><span class="uiWorldTag">${w.icon} ${esc(B.regions[r][0])}${boss ? ' · Boss' : ''}</span></span>`;
}
function questPanel(l) {
  const r = regionOf(l), region = B.regions[r], boss = B.bosses[l], cleared = (B.state.cleared || []).includes(l), locked = l > B.limit() && !cleared;
  let prize = null; try { prize = B.questPrize(l); } catch { }
  const deck = deckTop(3), artKind = boss ? [0, 5, 6, 3, 7][r] : REGION_ART[r];
  return `<h2>${esc(region[0])}</h2><p class="uiLevel">${boss ? 'Boss · ' : ''}Level ${l}</p>
   <div class="uiQuestArt ${boss ? 'uiBossArt' : ''}">${questArt(l)}</div>
   <h3>${esc(questName(l))}</h3><p class="uiStatus ${locked ? 'locked' : cleared ? 'done' : ''}">${locked ? 'Locked' : cleared ? 'Completed · replay' : 'Ready to play'}</p>
   <p class="uiDesc">${boss ? `Defeat ${esc(boss)} to open the next island.` : esc(REGION_TEXT[r])}${prize ? ` <span class="uiPrize">🪙 ${fmt(prize.coins)}</span>` : ''}</p>
   <div class="uiDivider" aria-hidden="true">◆</div>
   <div class="uiDeckHead"><strong>Your deck</strong><button class="uiLink" data-go="decks">Edit deck ›</button></div>
   <div class="uiDeckRow">${deck.map(c => card(c)).join('') || '<p class="small">Build a deck in Battle Deck.</p>'}</div>
   <button class="uiBegin" id="uiBegin" ${locked ? 'disabled' : ''}>✦ ${locked ? 'Locked' : cleared ? 'Replay battle' : 'Begin battle'} ✦</button>`;
}
function selectLevel(l) {
  if (!Number.isInteger(l)) return;
  selected = l;
  const panel = $('#uiQuest'); if (!panel) return;
  panel.innerHTML = questPanel(l); B.bind(); bindQuest();
  $$('.uiNode').forEach(n => n.classList.toggle('uiSel', +n.dataset.level === l));
  if (innerWidth < 900) panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
}
function bindQuest() { $('#uiBegin')?.addEventListener('click', () => B.beginBattle(selected)); }
function afterMap() {
  bindQuest(); applyArt();
}


/* ---------------------------------------------------------------- My Card Binder (inventory / index) */
const TAB_ELEMENTS = [['Fire', '🔥'], ['Water', '💧'], ['Nature', '🍃'], ['Moon', '🌙'], ['', '✦']];
function binderLayout({ index, page }) {
  const heading = $('.binderHeading'), filters = $('.binderFilters'), book = $('.magicalBinder'); if (!heading || !filters || !book || $('.uiBinderHead')) return;
  const st = B.state, f = B.binderState(), count = index ? `${(st.discovered || []).length} / ${B.species.length} species` : `${st.owned.length} cards`;
  const swap = $('button[data-go]', heading);
  const head = document.createElement('div'); head.className = 'uiBinderHead';
  head.innerHTML = `<div><h1>${index ? 'Mythling Index' : 'My Card Binder'}</h1><span>${count} · ${index ? 'Discover every species' : 'Every copy has its own place'}</span></div>`;
  if (swap) { swap.className = 'uiPillBtn'; swap.innerHTML = index ? '📚 My Binder' : '📖 Species Index'; head.appendChild(swap); }
  heading.replaceWith(head); $('.back')?.remove();
  // Toolbar: search, element, rarity, more filters (mutation, level), sort.
  const bar = document.createElement('div'); bar.className = 'uiBinderBar';
  bar.innerHTML = `<label class="uiSearch"><span aria-hidden="true">🔍</span><input id="uiBinderSearch" type="search" placeholder="Search cards…" value="${esc(f.q || '')}" aria-label="Search cards"></label>`;
  const labels = $$('label', filters), sel = id => $('#' + id);
  const add = (id, cls) => { const s = sel(id); if (s) { s.classList.add('uiSelect'); if (cls) s.classList.add(cls); bar.appendChild(s); } };
  add('filterElement'); add('filterRarity');
  const more = document.createElement('details'); more.className = 'uiMore'; more.innerHTML = '<summary>⚲ More filters</summary><div></div>';
  for (const id of ['filterMutation', 'filterLevel']) { const lab = sel(id)?.closest('label'); if (lab) $('div', more).appendChild(lab); }
  if (f.mutation || f.level || f.island) more.open = true;
  bar.appendChild(more); add('binderSort');
  const sortSel = sel('binderSort'); if (sortSel) for (const o of sortSel.options) if (/newest/i.test(o.text)) o.text = 'Newest first';
  filters.replaceWith(bar);
  let t = 0; $('#uiBinderSearch').addEventListener('input', e => { clearTimeout(t); const v = e.target.value.trim().toLowerCase(); t = setTimeout(() => { B.binderFilter('q', v); $('#uiBinderSearch')?.focus(); const i = $('#uiBinderSearch'); if (i) i.setSelectionRange(i.value.length, i.value.length); }, 250); });
  // Book: numbered pockets, side tabs and the logo cover.
  $$('.binderPocket', book).forEach((p, i) => p.insertAdjacentHTML('afterbegin', `<span class="uiPocketNo">${String(page * 12 + i + 1).padStart(2, '0')}</span>`));
  // Standard binder: always a full 12-pocket page; empty sleeves fill the rest.
  const pagesEl = $('.binderPages', book), filled = $$('.binderPocket', book).length;
  if (pagesEl && filled < 12) pagesEl.insertAdjacentHTML('beforeend', Array.from({ length: 12 - filled }, (_, i) => `<div class="binderPocket uiEmptyPocket" aria-hidden="true"><span class="uiPocketNo">${String(page * 12 + filled + i + 1).padStart(2, '0')}</span><span class="uiSleeve"></span></div>`).join(''));
  if (pagesEl && !filled) $('p.panel', pagesEl)?.classList.add('uiNoMatch');
  book.insertAdjacentHTML('beforeend', `<nav class="uiBinderTabs" aria-label="Filter by element">${TAB_ELEMENTS.map(([el, ic]) => `<button data-tab-el="${el}" class="${(f.element || '') === el ? 'on' : ''}" aria-label="${el || 'All elements'}" style="--tab:${ELEMENT_COLORS[el] || '#e9b75a'}">${ic}</button>`).join('')}</nav>`);
  $$('[data-tab-el]', book).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); B.binderFilter('element', b.dataset.tabEl); }));
  const cover = $('.binderCover', book);
  if (cover) cover.innerHTML = '<span class="uiCoverFrame"><img src="/branding/emberlings-logo.png" alt="EMBERLINGS" width="1448" height="1086"></span>';
  const pager = $('.binderPager');
  if (pager) {
    const [prev, label, next] = [$('#binderPrev'), $('span', pager), $('#binderNext')];
    if (prev) prev.innerHTML = '‹ Previous'; if (next) next.innerHTML = 'Next ›';
    if (label) label.textContent = label.textContent.replace(/Page (\d+) \/ (\d+)/, 'Page $1 of $2');
    pager.insertAdjacentHTML('afterend', '<p class="uiPagerHint">Select a card to inspect · Use arrow keys to turn pages</p>');
  }
}
addEventListener('keydown', e => {
  if (!['inventory', 'index'].includes(B.view) || /INPUT|SELECT|TEXTAREA/.test(e.target?.tagName)) return;
  if (e.key === 'ArrowRight') $('#binderNext:not(:disabled)')?.click(); else if (e.key === 'ArrowLeft') $('#binderPrev:not(:disabled)')?.click();
});

/* ---------------------------------------------------------------- Card Vault (deck builder) */
const deckView = { q: '', el: '', sort: 'name', page: 0 };
function deckLayout() {
  const hero = $('#app .hero'), library = $('.deckLibrary'); if (!hero || !library || $('.uiDeckBuilder')) return;
  const summary = B.deckSummary(), inDeck = summary.filter(x => x.count), total = inDeck.reduce((n, x) => n + x.count, 0);
  const basic = inDeck.filter(x => !x.trainer && !x.stage).reduce((n, x) => n + x.count, 0), evo = inDeck.filter(x => !x.trainer && x.stage).reduce((n, x) => n + x.count, 0), tr = total - basic - evo;
  const actionBtns = ['equipBestDeck', 'autoDeck', 'savePocketDeck'].map(id => document.getElementById(id));
  const tabs = $('.shopCategories'), energy = $('.energyChoices'), saves = $('.deckSaves'), err = $('#deckError'), nameInput = $('#deckPresetName');
  const wrap = document.createElement('section'); wrap.className = 'uiDeckBuilder';
  wrap.innerHTML = `<div class="uiVaultCol"><div class="uiCVHead"><div><h1>Card Vault</h1><p>Your collection. Your next winning deck.</p></div>
     <div class="uiCVTools"><label class="uiSearch"><span aria-hidden="true">🔍</span><input id="uiDeckSearch" type="search" placeholder="Search your cards…" value="${esc(deckView.q)}" aria-label="Search your cards"></label>
     <select id="uiDeckEl" class="uiSelect" aria-label="Element"><option value="">All elements</option>${Object.keys(ELEMENT_COLORS).map(e => `<option ${deckView.el === e ? 'selected' : ''}>${e}</option>`).join('')}</select>
     <select id="uiDeckSort" class="uiSelect" aria-label="Sort"><option value="name">Sort: Name</option><option value="deck" ${deckView.sort === 'deck' ? 'selected' : ''}>Sort: In deck</option><option value="owned" ${deckView.sort === 'owned' ? 'selected' : ''}>Sort: Owned</option></select></div></div>
     <div class="uiCVTabs"></div><div class="uiCVGrid uiFrame"></div><div class="uiCVPager"><button id="uiCVPrev" aria-label="Previous page">‹</button><span id="uiCVPage"></span><button id="uiCVNext" aria-label="Next page">›</button></div></div>
   <aside class="uiDeckSide uiFrame"><div class="uiDSHead"><h2>Your battle deck</h2><button class="uiPillBtn" id="uiSavedBtn">🗂 Saved Decks</button></div><div class="uiSavedDrawer" hidden></div>
     <div class="uiDSMeta"><span class="uiDeckName"></span><b>${total} / 20</b> cards <span class="uiLegal"></span></div>
     <div class="uiComp"><i style="flex:${basic || .01};--c:#f08a4a"></i><i style="flex:${evo || .01};--c:#4aa3ff"></i><i style="flex:${tr || .01};--c:#a98aff"></i></div>
     <div class="uiCompLbl"><span><b>${basic}</b> Basic</span><span><b>${evo}</b> Evolution</span><span><b>${tr}</b> Trainer</span></div>
     <div class="uiDeckList">${inDeck.map(x => `<div class="uiDeckLine"><span class="uiThumb">${x.trainer ? '📜' : B.art({ kind: x.kind })}</span><span class="uiDot" style="--c:${ELEMENT_COLORS[x.element] || '#9bb6a0'}">${x.trainer ? '✚' : ELEMENT_ICONS[x.element] || '✦'}</span><strong>${esc(x.trainer ? x.name : B.species[x.kind]?.name || x.name)}</strong><small>${x.trainer ? 'Trainer' : x.stage ? 'Stage ' + x.stage : 'Basic'}</small><b>×${x.count}</b></div>`).join('') || '<p class="small">Your deck is empty. Add cards with ＋.</p>'}</div>
     <div class="uiMerfling"><div class="uiMerHead"><h3>Merfling Zone</h3><small>Choose up to 3 types · Auto when empty</small></div><div class="uiMerGrid"></div></div>
     <div class="uiDSActions"></div><button class="uiLink uiRulesLink" data-go="rules">📖 Battle Rules</button></aside>`;
  hero.replaceWith(wrap); $('.back')?.remove();
  $('.uiCVHead', wrap).appendChild($('.uiCVTabs', wrap));
  if (tabs) { $('.uiCVTabs', wrap).appendChild(tabs); $$('button', tabs).forEach(b => { b.className = 'uiTab' + (b.classList.contains('gold') || /gold/.test(b.className) ? ' on' : ''); }); }
  $$('[data-deck-filter]').forEach(b => { if (b.getAttribute('data-deck-filter') === (window.__fxDeckFilter || '')) b.classList.add('on'); });
  if (energy) { const g = $('.uiMerGrid', wrap); $$('label', energy).forEach(l => { const el = $('input', l)?.dataset.deckEnergy; l.classList.add('uiMer'); l.style.setProperty('--c', ELEMENT_COLORS[el] || '#aaa'); l.insertAdjacentHTML('afterbegin', `<span class="uiDot" style="--c:${ELEMENT_COLORS[el] || '#aaa'}">${ELEMENT_ICONS[el] || '✦'}</span>`); g.appendChild(l); }); energy.closest('.panel')?.remove(); }
  if (err) { const ok = /legal/i.test(err.textContent); $('.uiLegal', wrap).innerHTML = `<span class="${ok ? 'ok' : 'bad'}">${ok ? '✓ Legal deck · Ready to save' : esc(err.textContent)}</span>`; err.hidden = true; wrap.appendChild(err); }
  if (nameInput) { nameInput.closest('label')?.classList.add('uiSr'); const holder = $('.uiDeckName', wrap); holder.appendChild(nameInput); nameInput.insertAdjacentHTML('afterend', '<span aria-hidden="true">✎</span>'); }
  const acts = $('.uiDSActions', wrap);
  for (const b of actionBtns) { if (b) { const id = b.id; b.className = id === 'savePocketDeck' ? 'uiBtnGold uiSave' : 'uiBtnLine'; acts.appendChild(b); } }
  $('#equipBestDeck') && ($('#equipBestDeck').textContent = 'Equip Best'); $('#savePocketDeck') && ($('#savePocketDeck').textContent = 'Save Deck');
  $$('.deckActions').forEach(d => d.remove());
  if (saves) { $('.uiSavedDrawer', wrap).appendChild(saves); }
  $('#uiSavedBtn').onclick = () => { const d = $('.uiSavedDrawer', wrap); d.hidden = !d.hidden; };
  if ($('#deckPresetMenu')?.children.length) $('.uiSavedDrawer', wrap).hidden = false;
  // Library cards: owned count, -/+ "N in deck", tick when in deck.
  const cards = $$('.deckChoice', library).map(sec => {
    const counter = $('.deckCounter', sec), strong = $('strong', counter), small = $('small', counter), n = parseInt(strong?.textContent, 10) || 0;
    const art = $('.mythlingArt', sec), name = (art?.getAttribute('aria-label') || $('.cardTop strong', sec)?.textContent || '').split(' · ')[0];
    if (strong) strong.textContent = `${n} in deck`;
    if (small) { small.className = 'uiOwned'; small.textContent = 'Owned: ' + small.textContent.replace(/\D/g, ''); sec.insertBefore(small, counter); }
    if (n) sec.insertAdjacentHTML('afterbegin', '<span class="uiTick" aria-label="In deck">✓</span>');
    const owned = parseInt(small?.textContent.replace(/\D/g, ''), 10) || 0;
    return { sec, n, owned, name: name.toLowerCase(), el: B.species.find(s => s.name === name)?.element || '' };
  });
  const grid = $('.uiCVGrid', wrap); library.remove();
  const paint = () => {
    let list = cards.filter(c => (!deckView.q || c.name.includes(deckView.q)) && (!deckView.el || c.el === deckView.el));
    if (deckView.sort === 'deck') list.sort((a, b) => b.n - a.n); else if (deckView.sort === 'owned') list.sort((a, b) => b.owned - a.owned); else list.sort((a, b) => a.name.localeCompare(b.name));
    const per = innerWidth < 700 ? 4 : 8, pages = Math.max(1, Math.ceil(list.length / per)); deckView.page = Math.min(deckView.page, pages - 1);
    grid.replaceChildren(...list.slice(deckView.page * per, deckView.page * per + per).map(c => c.sec));
    if (!list.length) grid.innerHTML = '<p class="uiEmpty">No cards match.</p>';
    $('#uiCVPage').textContent = `${deckView.page + 1} / ${pages}`; $('#uiCVPrev').disabled = deckView.page === 0; $('#uiCVNext').disabled = deckView.page >= pages - 1;
  };
  paint();
  $('#uiCVPrev').onclick = () => { deckView.page--; paint(); }; $('#uiCVNext').onclick = () => { deckView.page++; paint(); };
  $('#uiDeckSearch').oninput = e => { deckView.q = e.target.value.trim().toLowerCase(); deckView.page = 0; paint(); };
  $('#uiDeckEl').onchange = e => { deckView.el = e.target.value; deckView.page = 0; paint(); };
  $('#uiDeckSort').onchange = e => { deckView.sort = e.target.value; paint(); };
  B.bind();
}

/* ---------------------------------------------------------------- Wiring */
function onFrame() {
  document.body.classList.add('uiTheme');
  document.body.classList.toggle('uiWide', !SLIM_VIEWS.includes(B.view));
  document.body.classList.toggle('uiDark', ['home', 'map'].includes(B.view));
  document.body.classList.toggle('uiFull', FULL_VIEWS.includes(B.view));
  const u = $('#uiUser'); if (u) u.onclick = () => userMenu(u);
  if (B.view === 'home') afterHome();
  if (B.view === 'vault') vaultLayout();
}

/* ---------------------------------------------------------------- Vault: rearranges the game's own Vault markup (same buttons and ids) */
const VAULT_COSTS = [0, 2500, 10000, 35000, 100000];
function vaultLayout() {
  if (window.EmberUI?.exactWide?.()) return;
  const app = $('#app'), h1 = $('h1', app), intro = h1?.nextElementSibling, toolbar = $('.vaultToolbar'), slots = $('.vaultSlots');
  if (!h1 || !toolbar || !slots || $('.uiVaultHead')) return;
  const v = B.state.vault || {}, unlocked = v.unlocked || 1, mult = (intro?.textContent.match(/·\s*([\d.]+×)/) || [])[1] || '1×';
  const head = document.createElement('div'); head.className = 'uiVaultHead';
  head.innerHTML = `<div class="uiVaultTitle"><span class="uiVaultIcon" aria-hidden="true">🏛</span><div><h1>Mythling Vault</h1><p>Give your fused Mythlings a place to earn.</p></div></div>
   <div class="uiVaultStats"><strong>${unlocked} / 5 slots unlocked</strong><span>${mult} permanent earnings</span></div>
   <div class="uiVaultSaved"><div><span>Saved earnings</span><strong class="uiSavedCoins"></strong></div><div class="uiCollect"></div></div>`;
  h1.replaceWith(head); intro?.remove();
  const total = $('#vaultTotal'), collect = $('#vaultCollectAll'), status = $('#vaultClaimStatus');
  $('.uiSavedCoins', head).append(total, ' coins');
  collect.textContent = 'Collect all'; $('.uiCollect', head).append(collect, status); toolbar.remove();
  const note = () => { const n = parseInt(total.textContent.replace(/\D/g, ''), 10) || 0; collect.disabled = n <= 0; if (!status.textContent || status.dataset.ui) { status.textContent = n > 0 ? '' : 'No coins to collect.'; status.dataset.ui = '1'; } };
  note(); new MutationObserver(note).observe(total, { childList: true, characterData: true, subtree: true });
  $$('.vaultSlot', slots).forEach((slot, i) => {
    slot.insertAdjacentHTML('afterbegin', '<span class="uiVine uiVineL" aria-hidden="true"></span><span class="uiVine uiVineR" aria-hidden="true"></span>');
    const art = $('.vaultArt.empty', slot);
    if (slot.classList.contains('lockedSlot')) {
      if (art) art.outerHTML = '<div class="uiSeal" aria-hidden="true"><span>🔒</span></div>';
      const h2 = $('h2', slot); if (h2) h2.textContent = `Unlock Slot ${i + 1}`;
      const cost = $('strong', slot); if (cost) cost.innerHTML = `<i class="uiCoin"></i> ${VAULT_COSTS[i].toLocaleString()} coins`;
      const p = $('p.muted', slot), btn = $('[data-unlock]', slot), next = i === unlocked;
      if (p) p.textContent = 'Permanent unlock.';
      if (btn) { btn.textContent = 'Unlock slot'; btn.insertAdjacentHTML('afterend', `<p class="uiHint">${!next ? 'Unlock earlier slots first.' : B.state.coins < VAULT_COSTS[i] ? `Need ${(VAULT_COSTS[i] - B.state.coins).toLocaleString()} more coins.` : 'Ready to unlock.'}</p>`); }
    } else if (art) {
      slot.classList.add('uiAvailable'); slot.insertAdjacentHTML('afterbegin', '<span class="uiBadge">Available</span>');
      art.outerHTML = '<div class="uiSlotCard" aria-hidden="true"><span>🔥</span><b>+</b></div>';
      const p = $$('p', slot); if (p[0]) p[0].textContent = 'Earn coins every second.';
      if (p[1]) p[1].innerHTML = p[1].innerHTML.replace('Saved earnings:', 'Saved:').replace(' 🪙', ' coins');
      const label = $('label', slot); if (label) label.classList.add('uiSr');
      const btn = $('[data-deposit-slot]', slot), sel = $('select', slot);
      if (btn) { btn.textContent = 'Assign to slot'; btn.insertAdjacentHTML('afterend', `<p class="uiHint">${sel?.options.length > 1 ? 'Select a Mythling first.' : 'Fuse two Mythlings to get one.'}</p>`); }
      if (btn && sel) { const sync = () => { btn.disabled = !sel.value; }; sync(); sel.addEventListener('change', sync); }
    }
  });
  const rates = $('.vaultRates');
  const how = document.createElement('section'); how.className = 'vaultSlot panel uiHow';
  how.innerHTML = `<h2>How the vault works</h2>
   <div class="uiHowRow"><span>🂠</span><div><strong>Assign a fused Mythling</strong><small>Choose one of your fused Mythlings to start earning coins.</small></div></div>
   <div class="uiHowRow"><span>🪙</span><div><strong>Earn coins every second</strong><small>Each fused Mythling earns coins automatically, even while you're away.</small></div></div>
   <div class="uiHowRow"><span>💰</span><div><strong>Collect your saved earnings</strong><small>Claim your coins whenever you're ready.</small></div></div>
   <div class="uiRateTable"><p>Earnings by rarity</p></div>`;
  if (rates) { $$('div', rates).forEach(row => { const [name, val] = [$('span', row)?.textContent, $('strong', row)?.textContent]; $('.uiRateTable', how).insertAdjacentHTML('beforeend', `<div><span>${esc(name)}</span><b>${esc(val)} / sec</b></div>`); }); rates.closest('.panel')?.classList.add('uiVaultRules'); rates.remove(); }
  slots.appendChild(how);
  const rules = $('.uiVaultRules'); if (rules) { const h = $('h2', rules); if (h) h.textContent = 'Vault rules'; }
}
if (B) {
  window.EmberUI = { head, home, map, afterMap, selectLevel, questName, logoHTML, questArt };
  window.addEventListener('ember:frame', onFrame);
  window.addEventListener('ember:binderReady', e => binderLayout(e.detail));
  window.addEventListener('ember:decksReady', () => deckLayout());
  // Repaint the screen that was drawn before this module loaded.
  if (['home', 'map'].includes(B.view)) B.go(B.view);
  else { const top = $('.top'); if (top) { top.outerHTML = head(); B.bind(); } onFrame(); }
}
