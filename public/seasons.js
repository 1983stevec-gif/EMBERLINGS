// EMBERLINGS seasonal themes: gentle decorations that follow the player's local date.
//   Autumn  22 Sep – 20 Nov  drifting leaves, warm amber header; harvest lanterns along the header 24 Oct – 1 Nov
//   Winter   1 Dec – 28/29 Feb  soft snow on Home and the header, frosty logo and pack buttons;
//                               string lights along the header 15 Dec – 6 Jan, a New Year sparkle 31 Dec – 2 Jan
//   Spring   1 Mar – 31 May  blossom petals, fresh green accents
//   Summer   1 Jun – 21 Sep  warm glow, fireflies at dusk, a bright beach tint
// Purely cosmetic: never changes gameplay, rewards or anything in the save except the player's on/off choice
// (state.ember.seasons, false = off; missing = on). Original CSS/SVG art only.
// Effects setting: Full = everything; Light = a third of the particles, no twinkling; Off or reduced motion = static
// accents only (tints, frost, badge, unlit garland). Particles only run on Home and pause when the tab is hidden.
// Talks to the game only through window.EmberBridge, ember:* events and the page. Home life (home-life.js) asks
// window.EmberSeasons.homeWeather() so its own weather stays clear while the season draws its own.
// Exposes window.EmberSeasons = { set(on), current(), on(), preview(date|null), homeWeather(), confetti(colors) }.
import { fxCount } from '/fx-level.js';

const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const f = (n, d = 1) => n.toFixed(d);

/* ---------------------------------------------------------------- Calendar */
// md = month * 100 + day, so 22 Sep = 922. Nov 21–30 sits between autumn and winter and has no theme.
export function seasonOf(d = new Date()) {
  const md = (d.getMonth() + 1) * 100 + d.getDate();
  const season = md >= 922 && md <= 1120 ? 'autumn' : md >= 1201 || md <= 229 ? 'winter' : md >= 301 && md <= 531 ? 'spring' : md >= 601 && md <= 921 ? 'summer' : null;
  const events = [];
  if (md >= 1024 && md <= 1101) events.push('harvest');
  if (md >= 1215 || md <= 106) events.push('lights');
  if (md >= 1231 || md <= 102) events.push('newyear');
  return { season, events };
}
const LABEL = {
  autumn: ['Autumn on the islands', '🍂'], winter: ['Winter on the islands', '❄'],
  spring: ['Spring on the islands', '🌸'], summer: ['Summer on the islands', '☀'],
  harvest: ['Harvest lanterns on the islands', '🍂'], newyear: ['Happy New Year from the islands', '✨']
};
const SHORT = { autumn: 'Autumn', winter: 'Winter', spring: 'Spring', summer: 'Summer', harvest: 'Harvest', newyear: 'New Year' };
const CONFETTI = {
  autumn: ['#e3862f', '#c4561f', '#e8b84a', '#9c4a1f'], winter: ['#e8f6ff', '#9fd4ff', '#c9e9ff', '#ffffff'],
  spring: ['#ffb7d5', '#ffd6e8', '#9be59a', '#fff3a8'], summer: ['#ffd23f', '#3fd0e0', '#ff8a5c', '#7be7b3'],
  newyear: ['#ffd568', '#f5f0ff', '#9fd4ff', '#ffe9a8']
};
const LEAF_C = ['#d9822b', '#c4561f', '#e3b23c', '#b5472a', '#9c6b2f'];
const LIGHT_C = ['#ff6b6b', '#ffd36b', '#7be7b3', '#72b5ff', '#ff9ad5'];

/* ---------------------------------------------------------------- State */
let previewDate = null;
const isOn = () => B?.state?.ember?.seasons !== false;
const now = () => previewDate ? new Date(previewDate) : new Date();
const sysCalm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// full | light | static (Effects Off or reduced motion) | none (setting off, or no season today)
function level(s = seasonOf(now())) {
  if (!isOn() || !s.season) return 'none';
  const fx = document.documentElement.dataset.fx;
  if (fx === 'off' || B?.state?.reducedMotion || sysCalm()) return 'static';
  return fx === 'light' ? 'light' : 'full';
}
function current() {
  const s = seasonOf(now()), lv = level(s), key = s.events.includes('newyear') ? 'newyear' : s.events.includes('harvest') ? 'harvest' : s.season;
  return { season: s.season, events: s.events.slice(), on: isOn(), active: lv !== 'none', level: lv, label: key ? `${LABEL[key][0]} ${LABEL[key][1]}` : '' };
}
const onHome = () => B?.view === 'home';

/* ---------------------------------------------------------------- Shapes (original SVG, used as masks) */
const shape = (body, fill) => `<svg viewBox="0 0 20 20" fill="${fill}">${body}</svg>`;
const MAPLE = '<path d="M10 0l2 5 4-2-1 5 5 1-4 3 2 4-6-2-1 6h-2l-1-6-6 2 2-4-4-3 5-1-1-5 4 2z"/>';
const OVAL = '<path d="M10 1c5 4 8 8 7 12-1 4-4 6-7 6s-6-2-7-6c-1-4 2-8 7-12z"/><path d="M10 4v14" stroke="#0003" stroke-width="1"/>';
const FLAKE = '<g stroke="#f4fbff" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M10 1v18M2.2 5.5l15.6 9M2.2 14.5l15.6-9"/><path d="M7.5 2.5L10 4.5 12.5 2.5M7.5 17.5L10 15.5 12.5 17.5"/></g>';
const LOGO = '/branding/emberlings-logo-transparent.webp';

/* ---------------------------------------------------------------- Home scene */
// Same spots home-life.js uses: the painted desktop Home hero, or the Home hero panel on tablets and phones.
function sceneHost() {
  const x = $('.uiHome .uiX.uiXHome');
  if (x) return { el: x, kind: 'exact', style: `left:0;top:${78 / 992 * 100}%;width:${1122 / 1586 * 100}%;height:${(552 - 78) / 992 * 100}%` };
  const h = $('.uiHome .uiHero');
  if (h) return { el: h, kind: 'hero', style: 'inset:0' };
  return null;
}
function particles(season, lv, small, sub) {
  if (lv !== 'full' && lv !== 'light') return '';
  const out = [], add = (cls, st, inner = '') => out.push(`<i class="${cls}" style="${st}">${inner}</i>`);
  let n = fxCount(small ? 6 : 8);
  if (season === 'summer') {
    // Fireflies at dusk (home-life already has them at night); slow sun motes by day.
    if (sub === 'night') return '';
    const dusk = sub === 'dusk';
    n = fxCount(dusk ? (small ? 5 : 6) : (small ? 3 : 4));
    for (let i = 0; i < n; i++) add(dusk ? 'seaFly' : 'seaMote', `--x:${f(rand(25, 96))}%;--y:${f(rand(dusk ? 45 : 20, 90))}%;--d:${f(rand(7, 12), 2)}s;--dl:${f(rand(-12, 0), 2)}s;--dx:${f(rand(-60, 60), 0)}%;--dy:${f(rand(-80, -20), 0)}%`);
    return out.join('');
  }
  for (let i = 0; i < n; i++) {
    const x = f(rand(2, 98)), d = f(rand(10, 16), 2), dl = f(rand(-16, 0), 2), sw = f(rand(-40, 40), 0);
    if (season === 'winter') {
      const crystal = i % 3 === 0;
      add(crystal ? 'seaSnow seaCrystal' : 'seaSnow', `--x:${x}%;--d:${d}s;--dl:${dl}s;--s:${f(crystal ? rand(9, 13) : rand(3, 6))}px;--sw:${sw}px`, crystal ? shape(FLAKE, 'none') : '');
    } else if (season === 'autumn') {
      add('seaLeaf', `--x:${x}%;--d:${d}s;--dl:${dl}s;--s:${f(rand(11, 16))}px;--sw:${sw}px;--r:${f(rand(260, 620), 0)}deg`, shape(i % 2 ? MAPLE : OVAL, pick(LEAF_C)));
    } else if (season === 'spring') {
      add('seaPetal', `--x:${x}%;--d:${d}s;--dl:${dl}s;--s:${f(rand(8, 12))}px;--sw:${sw}px;--r:${f(rand(200, 520), 0)}deg`);
    }
  }
  return out.join('');
}
// A blossom branch for the spring corner (original SVG).
const BRANCH = `<svg viewBox="0 0 160 90" aria-hidden="true"><path d="M160 6C120 14 96 22 70 40S30 70 6 86" fill="none" stroke="#6b4a33" stroke-width="4" stroke-linecap="round"/>
<path d="M104 24c-6 10-8 18-6 28M70 40c8 4 18 4 28 0" fill="none" stroke="#6b4a33" stroke-width="2.5" stroke-linecap="round"/>
${[[140, 10], [118, 18], [96, 28], [100, 50], [74, 38], [52, 56], [86, 42], [30, 72], [128, 4]].map(([x, y], i) => `<g transform="translate(${x} ${y}) rotate(${i * 37})"><g fill="${i % 3 ? '#ffc6dc' : '#ffe3ee'}">${[0, 72, 144, 216, 288].map(a => `<ellipse rx="3.4" ry="5.4" cy="-5" transform="rotate(${a})"/>`).join('')}</g><circle r="2" fill="#ffd36b"/></g>`).join('')}
<g fill="#8fd17a">${[[62, 46, -30], [112, 14, 20], [40, 62, -50]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="3" transform="rotate(${r} ${x} ${y})"/>`).join('')}</g></svg>`;

function mountScene(cur, lv) {
  const h = sceneHost();
  if (!h || lv === 'none') { $$('.seaScene').forEach(e => e.remove()); return; }
  const w = h.el.getBoundingClientRect().width, small = w < 500;
  const sub = window.EmberHomeLife?.phase?.() || 'day';
  const key = `${cur.season}|${cur.events.join(',')}|${lv}|${h.kind}|${small}|${cur.season === 'summer' ? sub : ''}`;
  const under = $('.seaUnder', h.el), over = $('.seaOver', h.el);
  if (under && over && under.dataset.key === key && over.dataset.key === key) { place(under, over, h.el); return; }
  $$('.seaScene').forEach(e => e.remove());
  const mk = cls => { const d = document.createElement('div'); d.className = 'seaScene ' + cls; d.dataset.key = key; d.dataset.kind = h.kind; d.setAttribute('aria-hidden', 'true'); d.setAttribute('style', h.style); return d; };
  const lab = cur.events.includes('newyear') ? 'newyear' : cur.events.includes('harvest') ? 'harvest' : cur.season;
  const badge = small ? `<span>${LABEL[lab][1]}</span> ${SHORT[lab]}` : `${LABEL[lab][0]} <span>${LABEL[lab][1]}</span>`;
  // Two layers: tints and edges under home-life's scene (its Mythlings stay on top), and the particles and badge
  // above it, so nothing that moves sits under home-life's blended lighting (which would repaint every frame).
  const u = mk('seaUnder'), o = mk('seaOver');
  u.innerHTML = `<div class="seaTint"></div><div class="seaEdge"></div>${cur.season === 'spring' ? `<div class="seaBranch">${BRANCH}</div>` : ''}`;
  o.innerHTML = `<div class="seaFx">${particles(cur.season, lv, small, sub)}</div><div class="seaBadge" title="${LABEL[lab][0]}">${badge}</div>`;
  place(u, o, h.el);
}
function place(under, over, host) {
  const life = $('.hlScene', host);
  if (life) {
    if (under.nextElementSibling !== life) host.insertBefore(under, life);
    if (life.nextElementSibling !== over) life.after(over);
  } else {
    if (under.parentElement !== host) host.appendChild(under);
    if (under.nextElementSibling !== over) under.after(over);
  }
}

/* ---------------------------------------------------------------- Header */
function topHosts() {
  const top = $('.uiTop'); if (!top || !top.getClientRects().length) return null;
  const bar = $('.uiPBar .uiPBarIn', top);
  const painted = bar && bar.getClientRects().length && bar.offsetWidth > 0;
  return { top, fx: painted ? bar : top, painted };
}
function garlandSVG(width, kind) {
  const harvest = kind === 'harvest', step = harvest ? 170 : 74, n = Math.max(2, Math.ceil(width / step)), sag = harvest ? 9 : 7;
  // The glows sit in three groups that take turns to brighten, so only three things animate.
  let wire = 'M0 2', items = '';
  const glows = ['', '', ''];
  for (let i = 0; i < n; i++) {
    const x0 = i * step, mid = x0 + step / 2;
    wire += ` Q${mid} ${2 + sag * 2} ${x0 + step} 2`;
    if (harvest) {
      // A round, ribbed harvest lantern with a little stem and leaf, hanging on a short cord (no faces).
      const y = 2 + sag;
      glows[i % 3] += `<circle cx="${mid}" cy="${y + 17}" r="17"/>`;
      items += `<g transform="translate(${mid} ${y})"><path d="M0 0v6" stroke="#3b2a18" stroke-width="1.4"/><rect x="-3.5" y="5" width="7" height="3" rx="1" fill="#5a3d22"/>
       <path d="M1 6q3-5 7-4" stroke="#5c8a3a" stroke-width="1.6" fill="none"/><ellipse cx="0" cy="17" rx="12" ry="9.5" fill="#d96f1e"/><ellipse cx="0" cy="17" rx="7.5" ry="9.5" fill="#ea8a30"/>
       <ellipse cx="0" cy="17" rx="2.6" ry="9.5" fill="#f8b552"/><ellipse cx="0" cy="17" rx="12" ry="9.5" fill="none" stroke="#8f4210" stroke-width=".9"/>
       <ellipse cx="-4" cy="13" rx="2.2" ry="3.2" fill="#ffe3a0" opacity=".45"/><rect x="-3" y="26" width="6" height="2.4" rx="1" fill="#5a3d22"/></g>`;
    } else {
      for (const t of [.3, .7]) {
        const bx = x0 + step * t, by = 2 + 4 * sag * t * (1 - t), k = i * 2 + (t > .5 ? 1 : 0), c = LIGHT_C[k % LIGHT_C.length];
        glows[k % 3] += `<circle cx="${f(bx)}" cy="${f(by + 5.5)}" r="7" fill="${c}"/>`;
        items += `<g transform="translate(${f(bx)} ${f(by)})"><rect x="-1.6" y="-1" width="3.2" height="3" rx=".6" fill="#2e3b2a"/>
         <ellipse cy="5.5" rx="2.6" ry="3.6" fill="${c}"/><ellipse cx="-.8" cy="4.4" rx=".8" ry="1.3" fill="#fff" opacity=".7"/></g>`;
      }
    }
  }
  const h = harvest ? 44 : 26;
  return `<svg class="seaGarlandSvg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" aria-hidden="true"><defs><radialGradient id="seaLanGlow"><stop offset="0" stop-color="#ffb347" stop-opacity=".8"/><stop offset="1" stop-color="#ff8a2a" stop-opacity="0"/></radialGradient></defs>
   ${glows.map((g, i) => `<g class="seaGlow seaB${i}"${harvest ? ' fill="url(#seaLanGlow)"' : ''}>${g}</g>`).join('')}
   <path d="${wire}" fill="none" stroke="${harvest ? '#4a3420' : '#24331f'}" stroke-width="1.4"/>${items}</svg>`;
}
function mountHeader(cur, lv) {
  const hosts = topHosts();
  if (!hosts || lv === 'none') { $$('.seaTopFx,.seaGarland').forEach(e => e.remove()); return; }
  const { top, fx, painted } = hosts, small = innerWidth < 700, home = onHome();
  // Tint, header snow and New Year sparkles.
  const fxKey = `${cur.season}|${cur.events.join(',')}|${lv}|${painted}|${home}|${small}`;
  let layer = $('.seaTopFx', top);
  if (!layer || layer.dataset.key !== fxKey || layer.parentElement !== fx) {
    $$('.seaTopFx').forEach(e => e.remove());
    layer = document.createElement('div'); layer.className = 'seaTopFx' + (painted ? ' seaPainted' : ''); layer.dataset.key = fxKey; layer.setAttribute('aria-hidden', 'true');
    let bits = '';
    if (home && (lv === 'full' || lv === 'light')) {
      if (cur.season === 'winter') for (let i = 0, n = fxCount(small ? 3 : 4); i < n; i++) bits += `<i class="seaTopSnow" style="--x:${f(rand(3, 97))}%;--d:${f(rand(6, 9), 2)}s;--dl:${f(rand(-9, 0), 2)}s;--s:${f(rand(2, 3.5))}px;--sw:${f(rand(-14, 14), 0)}px"></i>`;
      if (cur.events.includes('newyear')) for (let i = 0, n = fxCount(small ? 2 : 3); i < n; i++) bits += `<i class="seaStar" style="--x:${f(rand(30, 96))}%;--y:${f(rand(15, 75))}%;--d:${f(rand(2.2, 3.6), 2)}s;--dl:${f(rand(-3.6, 0), 2)}s;--c:${pick(CONFETTI.newyear)}">✦</i>`;
    }
    layer.innerHTML = `<div class="seaTopTint"></div>${bits}`;
    fx.prepend(layer);
  }
  // String lights (winter) or harvest lanterns (late October) along the bottom edge.
  const g = cur.events.includes('harvest') ? 'harvest' : cur.events.includes('lights') ? 'lights' : '';
  const width = Math.round(top.getBoundingClientRect().width);
  const gKey = `${g}|${width}|${lv}`;
  let gar = $('.seaGarland', top);
  if (!g) { gar?.remove(); return; }
  if (!gar || gar.dataset.key !== gKey || gar.parentElement !== top) {
    $$('.seaGarland').forEach(e => e.remove());
    gar = document.createElement('div'); gar.className = `seaGarland sea-${g}` + (painted ? ' seaPainted' : ''); gar.dataset.key = gKey; gar.setAttribute('aria-hidden', 'true');
    gar.innerHTML = garlandSVG(width, g);
    top.prepend(gar);
  }
}

/* ---------------------------------------------------------------- Logo frost and icy pack buttons (winter) */
function decorate(cur, lv) {
  const winter = lv !== 'none' && cur.season === 'winter';
  if (!winter) { $$('.seaCap,.seaIce').forEach(e => e.remove()); return; }
  for (const box of [...$$('.uiTop .uiBrand .uiLogo'), ...$$('.uiTop .uiPLogo')]) if (!$(':scope > .seaCap', box)) box.insertAdjacentHTML('beforeend', '<i class="seaCap" aria-hidden="true"></i>');
  for (const b of $$('.uiHomeCard[data-go=packs], .uiTabTile[data-go=packs], .uiTop .uiPHot[data-go=packs], .uiTabMenu [data-go=packs]')) if (!$(':scope > .seaIce', b)) b.insertAdjacentHTML('beforeend', '<i class="seaIce" aria-hidden="true"></i>');
}

/* ---------------------------------------------------------------- Effects-area toggle */
function toggleHTML() {
  const cur = current(), icon = cur.season ? LABEL[cur.season][1] : '🍃';
  return `<label class="seaToggle"><input type="checkbox" data-sea-toggle ${cur.on ? 'checked' : ''}> <span><span aria-hidden="true">${icon}</span> Seasonal decorations</span><b>${cur.on ? 'On' : 'Off'}</b></label>`;
}
function addToggles() {
  if (settingsHub) return; // the Settings page has its own Seasonal decorations block
  for (const fx of $$('.uiFx')) {
    if (fx.nextElementSibling?.classList.contains('seaToggle')) continue;
    fx.insertAdjacentHTML('afterend', toggleHTML());
  }
}
function paintToggles() {
  for (const t of $$('.seaToggle')) { const i = $('input', t); i.checked = isOn(); $('b', t).textContent = isOn() ? 'On' : 'Off'; }
}

/* ---------------------------------------------------------------- Settings page (settings.js, when present) */
let settingsHub = false;
function settingsHTML() {
  const cur = current(), on = cur.on;
  const today = cur.season ? `Right now: ${SHORT[cur.season].toLowerCase()} ${LABEL[cur.season][1]}.` : 'No seasonal theme today.';
  return `<div class="setRow"><div class="setRowText"><span class="setLabel" id="setSeaLbl">Seasonal decorations</span><small class="setSub" id="setSeaSub">Snow, leaves, petals and lights that follow the date. Looks only. ${today}</small></div>
  <button type="button" class="setSwitch" id="setSea" role="switch" aria-checked="${on}" aria-labelledby="setSeaLbl" aria-describedby="setSeaSub"><span>${on ? 'On' : 'Off'}</span></button></div>`;
}
function hookSettings() {
  if (settingsHub || !window.EmberSettings?.addSection) return settingsHub;
  settingsHub = window.EmberSettings.addSection({
    id: 'seasons', icon: '🍂', title: 'Seasonal decorations', order: 2, html: settingsHTML,
    bind: el => { const b = $('#setSea', el); b?.addEventListener('click', () => { const on = set(!isOn()); b.setAttribute('aria-checked', String(on)); $('span', b).textContent = on ? 'On' : 'Off'; }); }
  }) !== false;
  if (settingsHub) for (const t of $$('.seaToggle')) t.remove();
  return settingsHub;
}

/* ---------------------------------------------------------------- Apply */
function apply() {
  const cur = current(), lv = cur.level, root = document.documentElement;
  const want = lv === 'none' ? null : cur.season;
  if ((root.dataset.season || null) !== want) { if (want) root.dataset.season = want; else delete root.dataset.season; }
  const ev = lv === 'none' ? '' : cur.events.join(' ');
  if ((root.dataset.seasonEv || '') !== ev) { if (ev) root.dataset.seasonEv = ev; else delete root.dataset.seasonEv; }
  if (root.dataset.seasonFx !== lv) root.dataset.seasonFx = lv;
  document.body?.classList.toggle('seaHome', onHome());
  if (onHome()) mountScene(cur, lv); else $$('.seaScene').forEach(e => e.remove());
  mountHeader(cur, lv);
  decorate(cur, lv);
  addToggles();
}
let queued = false;
const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; try { apply(); } catch (e) { console.warn('seasons', e); } }); };

function set(on) {
  if (!B?.state) return isOn();
  if (!B.state.ember || typeof B.state.ember !== 'object') B.state.ember = {};
  B.state.ember.seasons = !!on;
  try { B.save(); } catch { /* ignore */ }
  paintToggles(); apply();
  window.EmberHomeLife?.refresh?.();
  dispatchEvent(new CustomEvent('ember:seasons', { detail: current() }));
  return !!on;
}

/* ---------------------------------------------------------------- Styles */
const CSS = `
/* Seasonal themes (public/seasons.js): decorative only, never catch clicks */
.seaScene,.seaScene *,.seaTopFx,.seaTopFx *,.seaGarland,.seaGarland *,.seaCap,.seaIce{pointer-events:none}
.seaScene{position:absolute;overflow:hidden;border-radius:inherit}
.seaScene>div{position:absolute;inset:0}
/* Its own stacking layer, level with home-life's: the moving bits then stay on the compositor (about 2x the frame rate) */
.seaOver{z-index:1;isolation:isolate}
.seaFx{container-type:size}
.seaFx i{position:absolute;left:var(--x);top:var(--y,0);will-change:transform,opacity}
html[data-season=winter] .seaTint{background:linear-gradient(180deg,#e6f4ff2e,#cfe6ff0d 55%,#ffffff1a)}
html[data-season=autumn] .seaTint{background:linear-gradient(180deg,#ffb3471c,#ff8a2a0d 60%,#c4561f26)}
html[data-season=spring] .seaTint{background:linear-gradient(180deg,#d8ffd01c,#fff0f60d 55%,#b8f0a21c)}
html[data-season=summer] .seaTint{background:linear-gradient(180deg,#fff2b82e,#ffe08a12 55%,#8ff0ff14)}
/* Edges: frost in winter, a warm vignette in autumn, a fresh green rim in spring, sun glow in summer */
html[data-season=winter] .seaEdge{box-shadow:inset 0 0 22px 3px #e6f6ff66,inset 0 0 3px 1px #f4fbffaa;background:linear-gradient(180deg,#f2faff38,transparent 9%),linear-gradient(0deg,#f2faff2a,transparent 7%)}
html[data-season=autumn] .seaEdge{box-shadow:inset 0 -40px 60px -30px #c4561f55}
html[data-season=spring] .seaEdge{box-shadow:inset 0 0 18px 2px #9be59a33}
html[data-season=summer] .seaEdge{background:radial-gradient(ellipse 45% 55% at 88% 6%,#fff1b866,#ffd36b1c 45%,transparent 70%)}
.seaUnder>.seaBranch{inset:auto;top:-4px;right:-6px;width:clamp(110px,18cqw,170px)}
.seaUnder[data-kind=hero]>.seaBranch{right:auto;left:-6px;transform:scaleX(-1)}
.seaBranch svg{display:block;width:100%;height:auto;filter:drop-shadow(0 2px 3px #0005)}
/* Badge */
.seaOver>.seaBadge{inset:auto;top:12px;right:12px;padding:4px 12px;border-radius:999px;background:#0d1328d9;border:1px solid #e9b75a99;color:#ffe6ae;
 font:700 13px/1.3 'Cormorant Garamond',Georgia,serif;letter-spacing:.03em;white-space:nowrap;box-shadow:0 4px 12px #0007;max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis}
.seaOver[data-kind=exact]>.seaBadge{top:auto;bottom:12px;font-size:15px}
html[data-season=winter] .seaBadge{border-color:#cfe9ffaa;color:#eef8ff}
html[data-season=spring] .seaBadge{border-color:#ffc6dcaa;color:#fff0f6}
/* Particles */
.seaSnow{top:-4%!important;width:var(--s);height:var(--s);border-radius:50%;background:#fff;box-shadow:0 0 5px #fff9;opacity:.85;animation:seaDrift var(--d) linear var(--dl) infinite}
.seaSnow.seaCrystal{border-radius:0;box-shadow:none;background:none;opacity:.85}
.seaFx svg{display:block;width:100%;height:100%;overflow:visible}
.seaLeaf{top:-6%!important;width:var(--s);height:var(--s);opacity:.9;animation:seaFlutter var(--d) linear var(--dl) infinite}
.seaPetal{top:-5%!important;width:var(--s);height:calc(var(--s) * .72);border-radius:80% 0 80% 0;background:linear-gradient(135deg,#fff0f6,#ffb7d5);opacity:.9;animation:seaFlutter var(--d) linear var(--dl) infinite}
.seaFly{width:5px;height:5px;border-radius:50%;background:#fff6a8;box-shadow:0 0 7px 2px #ffe36a99;animation:seaWander var(--d) ease-in-out var(--dl) infinite alternate,seaPulse 2.6s ease-in-out var(--dl) infinite}
.seaMote{width:4px;height:4px;border-radius:50%;background:#fff8d8;box-shadow:0 0 8px 2px #ffe9a866;opacity:.7;animation:seaWander var(--d) ease-in-out var(--dl) infinite alternate}
@keyframes seaDrift{0%{transform:translate(0,0)}25%{transform:translate(var(--sw),28cqh)}50%{transform:translate(0,55cqh)}75%{transform:translate(calc(var(--sw) * -1),82cqh)}100%{transform:translate(0,110cqh)}}
@keyframes seaFlutter{0%{transform:translate(0,0) rotate(0)}30%{transform:translate(var(--sw),33cqh) rotate(calc(var(--r) * .3))}65%{transform:translate(calc(var(--sw) * -1),72cqh) rotate(calc(var(--r) * .65))}100%{transform:translate(var(--sw),112cqh) rotate(var(--r))}}
@keyframes seaWander{0%{transform:translate(0,0)}50%{transform:translate(var(--dx),calc(var(--dy) * .4))}100%{transform:translate(calc(var(--dx) * -.6),var(--dy))}}
@keyframes seaPulse{0%,100%{opacity:.15}50%{opacity:1}}
/* Header: tint, snow and sparkles behind the header's buttons and text */
.seaTopFx{position:absolute;inset:0;overflow:hidden;z-index:-1;container-type:size}
.seaTopFx.seaPainted{z-index:auto}
.seaTopFx>i{position:absolute;left:var(--x);top:var(--y,0);font-style:normal;will-change:transform,opacity}
.seaTopTint{position:absolute;inset:0}
html[data-season=autumn] .seaTopTint{background:linear-gradient(180deg,#ffa0401a,#c4561f24)}
html[data-season=autumn] .seaPainted .seaTopTint{background:linear-gradient(180deg,#ffa04024,#ff8a2a1c)}
html[data-season=winter] .seaTopTint{background:linear-gradient(180deg,#e6f4ff1f,transparent 70%),linear-gradient(0deg,#e6f4ff26,transparent 35%)}
html[data-season=spring] .seaTopTint{background:linear-gradient(180deg,#b8f0a214,transparent 80%)}
html[data-season=summer] .seaTopTint{background:linear-gradient(180deg,#ffe08a14,#8ff0ff0a)}
.seaTopSnow{top:-10%!important;width:var(--s);height:var(--s);border-radius:50%;background:#fff;opacity:.75;box-shadow:0 0 4px #fff8;animation:seaDrift var(--d) linear var(--dl) infinite}
.seaStar{color:var(--c);font-size:12px;line-height:1;text-shadow:0 0 6px var(--c);opacity:0;animation:seaTwinkle var(--d) ease-in-out var(--dl) infinite}
@keyframes seaTwinkle{0%,100%{opacity:0;transform:scale(.4) rotate(0)}50%{opacity:1;transform:scale(1.1) rotate(45deg)}}
/* String lights and harvest lanterns hang from the header's bottom edge */
.seaGarland{position:absolute;left:0;right:0;top:calc(100% - 3px);height:26px;overflow:visible;z-index:-1}
.seaGarland.sea-harvest{height:44px;top:calc(100% - 4px)}
.seaGarland.seaPainted{z-index:auto;top:calc(100% - 7px)}
.seaGarlandSvg{display:block}
html[data-season-fx=full] body.seaHome .seaGarland .seaGlow{animation:seaBulb 2.4s ease-in-out infinite}
html[data-season-fx=full] body.seaHome .seaGarland .seaGlow.seaB1{animation-delay:-.8s}
html[data-season-fx=full] body.seaHome .seaGarland .seaGlow.seaB2{animation-delay:-1.6s}
html[data-season-fx=static] .seaGarland .seaGlow{opacity:.2}
.seaGarland .seaGlow{opacity:.45}
@keyframes seaBulb{0%,100%{opacity:.15}50%{opacity:.75}}
/* Frosty logo: snow caps on the letters and a cool glow */
.uiTop .uiLogo:has(.seaCap){position:relative}
.seaCap{position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,#ffffffe6 0,#eaf6ffb3 18%,transparent 34%);-webkit-mask:url(${LOGO}) center/contain no-repeat;mask:url(${LOGO}) center/contain no-repeat;opacity:.75}
html[data-season=winter] .uiTop .uiLogoNew{filter:drop-shadow(0 0 2px #eaf6ff) drop-shadow(0 0 7px #9fd4ff88) drop-shadow(0 3px 4px rgba(6,4,18,.75))}
html[data-season=winter] .uiTop .uiPLogo{filter:drop-shadow(0 0 6px #bfe6ff66)}
/* Icy pack buttons */
html[data-season=winter] .uiHomeCard[data-go=packs],html[data-season=winter] .uiTop .uiPHot[data-go=packs]{position:relative}
.seaIce{position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 14px 2px #dff3ff88,inset 0 0 0 1.5px #eaf7ffaa;
 background:linear-gradient(180deg,#f4fbff40,transparent 16%),radial-gradient(circle at 6% 8%,#ffffff55,transparent 14%),radial-gradient(circle at 94% 92%,#ffffff40,transparent 14%)}
.uiTop .uiPHot .seaIce{inset:6% 4%;border-radius:12px;box-shadow:inset 0 0 10px 1px #dff3ff77}
/* Effects-area toggle */
.seaToggle{display:flex;align-items:center;gap:8px;margin:2px 6px 6px;padding:8px 10px;border:1px solid #e9b75a33;border-radius:8px;background:#0c1119;color:var(--ui-text,#f6ead0);font-size:14px;cursor:pointer;min-height:40px;box-sizing:border-box}
.seaToggle input{width:18px;height:18px;margin:0;accent-color:#e9b75a}
.seaToggle span{flex:1}
.seaToggle b{font-size:12.5px;color:#c9bfa8;font-weight:700}
.uiSettings .seaToggle{max-width:340px;margin:0 0 8px}
/* Light: no twinkling lights; Off / reduced motion: static accents only */
html[data-season-fx=static] .seaFx,html[data-season-fx=static] .seaTopFx>i{display:none}
body.seaPaused .seaScene *,body.seaPaused .seaTopFx *,body.seaPaused .seaGarland *{animation-play-state:paused!important}
@media(prefers-reduced-motion:reduce){.seaScene *,.seaTopFx *,.seaGarland *{animation:none!important}.seaFx,.seaTopFx>i{display:none}}
`;

/* ---------------------------------------------------------------- Wiring */
if (B && !window.EmberSeasons) {
  const st = document.createElement('style'); st.id = 'seaStyle'; st.textContent = CSS; document.head.appendChild(st);
  addEventListener('ember:frame', later);
  addEventListener('ember:fxLevel', later);
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('seaPaused', document.hidden));
  new MutationObserver(later).observe(document.documentElement, { attributes: true, attributeFilter: ['data-fx'] });
  try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', later); } catch { /* old browsers */ }
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(later, 250); });
  // The user menu and the Settings drawer are drawn outside the frame event: add the toggle when they appear.
  let tq = false;
  new MutationObserver(() => { if (tq) return; tq = true; requestAnimationFrame(() => { tq = false; if ($('.uiFx') && $$('.uiFx').some(x => !x.nextElementSibling?.classList.contains('seaToggle'))) addToggles(); }); })
    .observe(document.body, { childList: true, subtree: true });
  document.addEventListener('change', e => { if (e.target?.matches?.('[data-sea-toggle]')) set(e.target.checked); });
  // Re-check the date now and then (a session left open over midnight moves into the next window).
  setInterval(() => { if (!document.hidden) later(); }, 10 * 60 * 1000);
  window.EmberSeasons = Object.freeze({
    set, current, on: isOn, seasonOf,
    // For checks and previews: EmberSeasons.preview('2026-12-31') shows that date's theme; preview(null) goes back to today.
    preview: d => { previewDate = d ? new Date(d).getTime() : null; apply(); window.EmberHomeLife?.refresh?.(); return current(); },
    // home-life.js asks this before picking its own weather: the season draws its own, so keep Home life clear.
    homeWeather: () => (level() === 'none' ? null : 'clear'),
    // fx-packs.js passes its confetti colours through this: rarity colours stay first, seasonal colours mixed in.
    confetti: colors => {
      const cur = current(); if (!cur.active) return colors;
      const extra = CONFETTI[cur.events.includes('newyear') ? 'newyear' : cur.season] || [];
      const out = []; for (let i = 0; i < Math.max(colors.length, extra.length); i++) { if (colors[i]) out.push(colors[i]); if (extra[i]) out.push(extra[i]); }
      return out;
    }
  });
  // settings.js may load after this file: register its block once it appears.
  if (!hookSettings()) { let tries = 0; const t = setInterval(() => { if (hookSettings() || ++tries > 20) clearInterval(t); }, 500); }
  later();
}
