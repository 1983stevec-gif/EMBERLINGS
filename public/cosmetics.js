// EMBERLINGS cosmetics: card backs and avatar rings unlocked by achievements, and an avatar Mythling of your
// choice. Purely visual: nothing here changes battles, rewards, cards or coins, and nothing can be bought.
// Choices live in state.ember.profile (cardBack, ring, avatar), written by the My Profile page (profile.js).
// When nothing has been chosen, every screen looks exactly as before.
// How a back reaches the screen: <html data-cardback="id"> sets the CSS variable --cos-card-back, which the
// card details flip side and any `.cosBack` element use; the 3D pack reveal asks window.EmberCosmetics.backCanvas().
import { CARD_BACKS, AVATAR_RINGS } from '/profile-items.js';
import '/fx-level.js'; // keeps <html data-fx> current, which gates the animated backs and rings

const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------------------------------------------------------------- Card back designs (original SVG, 630×960) */
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const n1 = v => Math.round(v * 10) / 10;
const svg = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 630 960" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;
const metal = (id, a, b, c) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
const GOLD = metal('gd', '#ffe7a6', '#e2a748', '#9a6322');
// Border, inner line and corner pieces shared by every back (the same shape as the Ember Crest).
const frame = (edge, line) => `<rect x="22" y="22" width="586" height="916" rx="26" fill="none" stroke="${edge}" stroke-width="8"/>
<rect x="40" y="40" width="550" height="880" rx="18" fill="none" stroke="${line}" stroke-opacity=".45" stroke-width="2"/>
<g fill="${edge}"><path d="M40 92 92 40H40z"/><path d="M590 92 538 40h52z"/><path d="M40 868l52 52H40z"/><path d="M590 868l-52 52h52z"/></g>`;
const word = (fill, sub, subFill = fill) => `<text x="315" y="760" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="800" font-size="60" letter-spacing="6" fill="${fill}">EMBERLINGS</text>
<text x="315" y="808" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="600" font-size="22" letter-spacing="8" fill="${subFill}" opacity=".8">${sub}</text>`;
const ticks = (n, r1, r2, stroke, w = 3, op = .55) => `<g stroke="${stroke}" stroke-opacity="${op}" stroke-width="${w}">${Array.from({ length: n }, (_, i) => `<line x1="0" y1="${-r1}" x2="0" y2="${-r2}" transform="rotate(${n1(i * 360 / n)})"/>`).join('')}</g>`;
const dots = (seed, count, box, rMin, rMax, fills) => { const r = rng(seed); return Array.from({ length: count }, () => `<circle cx="${n1(box[0] + r() * box[2])}" cy="${n1(box[1] + r() * box[3])}" r="${n1(rMin + r() * (rMax - rMin))}" fill="${fills[Math.floor(r() * fills.length)]}" opacity="${n1(.35 + r() * .65)}"/>`).join(''); };

const DESIGNS = {
  // Today's EMBERLINGS crest (the same drawing as the card details flip side).
  ember: () => svg(`<radialGradient id="bg" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#3a2340"/><stop offset=".55" stop-color="#1c1430"/><stop offset="1" stop-color="#0b0a16"/></radialGradient>${GOLD}
<linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff5a2a"/><stop offset=".55" stop-color="#ffa53d"/><stop offset="1" stop-color="#fff0b0"/></linearGradient>
<pattern id="dt" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M18 6l3 12-3 12-3-12z" fill="#e9b75a" opacity=".09"/></pattern>`,
    `<rect width="630" height="960" fill="url(#bg)"/><rect width="630" height="960" fill="url(#dt)"/>${frame('url(#gd)', '#e9b75a')}
<g transform="translate(315 430)"><circle r="190" fill="none" stroke="url(#gd)" stroke-width="6"/><circle r="172" fill="#140f22" stroke="#e9b75a" stroke-opacity=".5" stroke-width="2"/>${ticks(16, 176, 188, '#e9b75a')}
<path d="M0-150c34 44 92 86 92 152 0 62-42 106-92 106s-92-44-92-106c0-40 22-62 40-86 4 30 16 44 30 50-8-44 4-80 22-116z" fill="url(#fl)" stroke="#ffd98a" stroke-width="4"/>
<path d="M0-40c18 26 42 48 42 80 0 30-20 52-42 52s-42-22-42-52c0-22 12-34 20-46 4 16 10 22 18 24-4-22 0-40 4-58z" fill="#fff4cf" opacity=".9"/>
<path d="M-150 120c40 30 100 42 150 42s110-12 150-42" fill="none" stroke="url(#gd)" stroke-width="5"/></g>${word('url(#gd)', 'MYTHLING CARD', '#e9b75a')}`),

  // A treasure map of the islands: parchment isles on a blue sea, a dotted route and a compass rose.
  island: () => svg(`<radialGradient id="sea" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#4fa3c4"/><stop offset=".6" stop-color="#2a6f93"/><stop offset="1" stop-color="#143c58"/></radialGradient>
<linearGradient id="isl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e2b0"/><stop offset="1" stop-color="#d4b678"/></linearGradient>${metal('br', '#f2d9a0', '#c08a45', '#6b4520')}
<pattern id="wv" width="70" height="44" patternUnits="userSpaceOnUse"><path d="M8 30c6-6 12-6 18 0s12 6 18 0" fill="none" stroke="#d9f2ff" stroke-opacity=".22" stroke-width="2.5" stroke-linecap="round"/></pattern>`,
    `<rect width="630" height="960" fill="url(#sea)"/><rect width="630" height="960" fill="url(#wv)"/>
<g stroke="#6b4520" stroke-width="4" fill="url(#isl)"><path d="M110 330c30-70 130-90 180-50 34 26 86 14 104 64 18 52-30 92-86 104-64 14-96 66-160 44-56-20-70-102-38-162z"/><path d="M400 520c28-38 100-34 124 8 22 38-4 82-52 88-48 6-104-48-72-96z"/><path d="M120 610c20-30 80-36 104-8 22 26 4 66-36 70-40 4-88-30-68-62z"/></g>
<g fill="#5e9a4a" stroke="#2f5a26" stroke-width="2"><circle cx="190" cy="350" r="16"/><circle cx="214" cy="364" r="13"/><circle cx="174" cy="372" r="12"/><circle cx="300" cy="380" r="14"/><circle cx="470" cy="548" r="12"/></g>
<path d="M178 410l26-40 26 40z" fill="#9a7a50" stroke="#5a3e1e" stroke-width="3"/>
<path d="M250 420C330 440 360 500 420 540s40 70 40 70" fill="none" stroke="#8a2a1a" stroke-width="5" stroke-dasharray="14 11" stroke-linecap="round"/>
<g stroke="#a3271a" stroke-width="9" stroke-linecap="round"><path d="M446 592l28 28M474 592l-28 28"/></g>
<g transform="translate(470 210)"><circle r="78" fill="#f3e2b0" fill-opacity=".85" stroke="url(#br)" stroke-width="5"/><circle r="62" fill="none" stroke="#6b4520" stroke-opacity=".5" stroke-width="2"/>
<path d="M0-70 12-12 70 0 12 12 0 70-12 12-70 0-12-12z" fill="#6b4520"/><path d="M0-70 12-12 0 0zM70 0 12 12 0 0zM0 70-12 12 0 0zM-70 0-12-12 0 0z" fill="#c08a45"/>
<text y="-80" text-anchor="middle" font-family="Georgia,serif" font-weight="800" font-size="26" fill="#f3e2b0">N</text></g>
<g transform="translate(150 190)" fill="none" stroke="#d9f2ff" stroke-opacity=".35" stroke-width="3"><path d="M-40 0c20-18 40-18 60 0s40 18 60 0"/></g>
${frame('url(#br)', '#f2d9a0')}${word('url(#br)', 'ISLAND MAP', '#f2d9a0')}`),

  // Rolling ocean waves around a curling crest.
  tide: () => svg(`<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d4a7a"/><stop offset="1" stop-color="#051a33"/></linearGradient>${metal('aq', '#e8fbff', '#6fd6f0', '#1f7fa8')}
<linearGradient id="wa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bff4ff"/><stop offset="1" stop-color="#2a9fd0"/></linearGradient>
<pattern id="sc" width="60" height="34" patternUnits="userSpaceOnUse"><path d="M0 30c10-18 20-24 30-24s20 6 30 24" fill="none" stroke="#7fe0ff" stroke-opacity=".14" stroke-width="3"/></pattern>`,
    `<rect width="630" height="960" fill="url(#bg)"/><rect width="630" height="960" fill="url(#sc)"/>${frame('url(#aq)', '#bff4ff')}
<g transform="translate(315 430)"><circle r="190" fill="#06223f" stroke="url(#aq)" stroke-width="6"/>${ticks(24, 176, 186, '#9eeaff', 3, .5)}
<path d="M-150 70c10-110 100-190 200-170 80 16 110 110 60 150-36 30-90 10-90-34 0-30 30-48 52-36-30-36-110-6-120 70-6 46 10 70 30 90h-120c-10-20-14-40-12-70z" fill="url(#wa)" stroke="#e8fbff" stroke-width="4"/>
<path d="M-170 110c40-24 80-24 120 0s80 24 120 0 80-24 100-6" fill="none" stroke="#bff4ff" stroke-width="8" stroke-linecap="round"/>
<path d="M-160 150c40-20 80-20 120 0s80 20 120 0 70-18 90-6" fill="none" stroke="#6fd6f0" stroke-opacity=".7" stroke-width="6" stroke-linecap="round"/>
${dots(7, 14, [-60, -150, 170, 80], 3, 7, ['#e8fbff', '#bff4ff'])}</g>${word('url(#aq)', 'TIDE', '#bff4ff')}`),

  // An old tree with glowing fireflies, on a leafy green.
  grove: () => svg(`<radialGradient id="bg" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#2f6334"/><stop offset=".6" stop-color="#173a1d"/><stop offset="1" stop-color="#0a1a0d"/></radialGradient>${metal('bz', '#f0e2a2', '#a7b85a', '#4f6a2a')}
<pattern id="lf" width="54" height="54" patternUnits="userSpaceOnUse"><path d="M27 8c12 9 12 27 0 38-12-11-12-29 0-38z" fill="#9be37a" opacity=".08"/><path d="M27 10v34" stroke="#9be37a" stroke-opacity=".08" stroke-width="1.5"/></pattern>`,
    `<rect width="630" height="960" fill="url(#bg)"/><rect width="630" height="960" fill="url(#lf)"/>${frame('url(#bz)', '#d6e8a0')}
<g transform="translate(315 430)"><circle r="190" fill="#102a15" stroke="url(#bz)" stroke-width="6"/>${ticks(12, 172, 188, '#d6e8a0', 4, .5)}
<path d="M-18 150c6-50 4-90-6-130h48c-10 40-12 80-6 130z" fill="#6b4a2a" stroke="#3a2614" stroke-width="3"/>
<path d="M-12 150c-30 4-60 14-80 26M12 150c30 4 60 14 80 26M0 150v28" fill="none" stroke="#6b4a2a" stroke-width="8" stroke-linecap="round"/>
<g stroke="#1f4a22" stroke-width="3"><circle cx="0" cy="-60" r="86" fill="#3f8f45"/><circle cx="-70" cy="-20" r="56" fill="#4fa04f"/><circle cx="72" cy="-24" r="58" fill="#4fa04f"/><circle cx="-36" cy="-110" r="50" fill="#5ab85a"/><circle cx="40" cy="-112" r="48" fill="#6cc865"/><circle cx="0" cy="-30" r="44" fill="#5ab85a"/></g>
${dots(11, 16, [-150, -170, 300, 300], 2.5, 5, ['#fff2a0', '#e8ff9a'])}</g>${word('url(#bz)', 'GROVE', '#d6e8a0')}`),

  // A six-armed snowflake on clear ice.
  frost: () => svg(`<radialGradient id="bg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#cfefff"/><stop offset=".45" stop-color="#6fb4e0"/><stop offset="1" stop-color="#143866"/></radialGradient>${metal('sv', '#ffffff', '#cfe9ff', '#7fa8d0')}
<pattern id="sp" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M32 22v20M22 32h20" stroke="#fff" stroke-opacity=".22" stroke-width="2" stroke-linecap="round"/></pattern>`,
    `<rect width="630" height="960" fill="url(#bg)"/><rect width="630" height="960" fill="url(#sp)"/>${frame('url(#sv)', '#ffffff')}
<g transform="translate(315 430)"><circle r="190" fill="#1d4f86" fill-opacity=".55" stroke="url(#sv)" stroke-width="6"/><circle r="172" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="2"/>
<g stroke="#f4fbff" stroke-width="12" stroke-linecap="round" fill="none">${Array.from({ length: 6 }, (_, i) => `<g transform="rotate(${i * 60})"><path d="M0 0V-150M0-62-34-96M0-62 34-96M0-110-24-134M0-110 24-134"/></g>`).join('')}</g>
<path d="M0-34 29-17v34L0 34-29 17v-34z" fill="#e8f8ff" stroke="#7fc8ff" stroke-width="4"/></g>${word('url(#sv)', 'FROST', '#ffffff')}`),

  // Storm clouds, falling rain and a bright lightning bolt.
  storm: () => svg(`<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3350"/><stop offset="1" stop-color="#0c0f1c"/></linearGradient>${metal('st', '#f2f4ff', '#a7b0cc', '#4f5a7a')}
<linearGradient id="bt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe0"/><stop offset=".5" stop-color="#ffe066"/><stop offset="1" stop-color="#ffb020"/></linearGradient>
<pattern id="rn" width="40" height="60" patternUnits="userSpaceOnUse"><path d="M30 6 22 26M12 34 4 54" stroke="#bcd4ff" stroke-opacity=".16" stroke-width="2" stroke-linecap="round"/></pattern>
<filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>`,
    `<rect width="630" height="960" fill="url(#bg)"/><rect width="630" height="960" fill="url(#rn)"/>${frame('url(#st)', '#dfe6ff')}
<g transform="translate(315 430)"><circle r="190" fill="#141a2e" stroke="url(#st)" stroke-width="6"/>${ticks(8, 168, 190, '#ffe066', 5, .55)}
<g fill="#4a5578"><circle cx="-80" cy="-80" r="56"/><circle cx="-10" cy="-110" r="70"/><circle cx="70" cy="-84" r="58"/><rect x="-130" y="-90" width="250" height="60" rx="30"/></g>
<g fill="#66729a"><circle cx="-60" cy="-96" r="40"/><circle cx="10" cy="-124" r="48"/><circle cx="66" cy="-100" r="36"/></g>
<path d="M18-40-58 70h52l-34 100 104-136h-56l40-74z" fill="#ffe066" filter="url(#gl)" opacity=".8"/>
<path d="M18-40-58 70h52l-34 100 104-136h-56l40-74z" fill="url(#bt)" stroke="#fff6c0" stroke-width="4" stroke-linejoin="round"/></g>${word('url(#st)', 'STORM', '#dfe6ff')}`),

  // A glowing circle of runes around a six-pointed star.
  arcane: () => svg(`<radialGradient id="bg" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#3d2066"/><stop offset=".6" stop-color="#1b0e33"/><stop offset="1" stop-color="#0a0616"/></radialGradient>${metal('ar', '#e6fffb', '#5ef0d8', '#7b4dd6')}
<filter id="gl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>`,
    `<rect width="630" height="960" fill="url(#bg)"/>${dots(23, 60, [30, 30, 570, 900], .8, 2, ['#c6a6ff', '#5ef0d8', '#fff'])}${frame('url(#ar)', '#bfa6ff')}
<g transform="translate(315 430)" fill="none"><circle r="190" stroke="url(#ar)" stroke-width="6"/><circle r="150" stroke="#5ef0d8" stroke-opacity=".6" stroke-width="2"/><circle r="128" stroke="#c6a6ff" stroke-opacity=".5" stroke-width="2"/>
<g stroke="#5ef0d8" stroke-width="4" stroke-linecap="round">${Array.from({ length: 12 }, (_, i) => `<path transform="rotate(${i * 30}) translate(0 -170)" d="${['M-7 7 0-8 7 7', 'M-7-7v14M7-7v14M-7 0h14', 'M0-8v16M-7-2 0 6 7-2', 'M-7 0a7 7 0 1 0 14 0'][i % 4]}"/>`).join('')}</g>
<g stroke="#5ef0d8" stroke-width="10" filter="url(#gl)" opacity=".6"><path d="M0-128 111 64H-111z"/><path d="M0 128-111-64h222z"/></g>
<g stroke="#e6fffb" stroke-width="4"><path d="M0-128 111 64H-111z"/><path d="M0 128-111-64h222z"/></g>
<circle r="40" fill="#1b0e33" stroke="#c6a6ff" stroke-width="4"/><path d="M-26 0c12-16 40-16 52 0-12 16-40 16-52 0z" fill="#5ef0d8"/><circle r="9" fill="#1b0e33"/></g>${word('url(#ar)', 'ARCANE CIRCLE', '#c6a6ff')}`),

  // A volcano erupting over glowing lava cracks.
  magma: () => {
    const r = rng(41); let cracks = '';
    for (let i = 0; i < 9; i++) { let x = 40 + r() * 550, y = 40 + r() * 880, d = `M${n1(x)} ${n1(y)}`; for (let k = 0; k < 5; k++) { x += (r() - .5) * 120; y += (r() - .3) * 90; d += `L${n1(x)} ${n1(y)}`; } cracks += `<path d="${d}"/>`; }
    return svg(`<radialGradient id="bg" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#4a1209"/><stop offset=".6" stop-color="#220605"/><stop offset="1" stop-color="#0c0202"/></radialGradient>${metal('mg', '#ffe0a0', '#ff8a2a', '#8a2a0a')}
<linearGradient id="lv" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff3d0f"/><stop offset=".6" stop-color="#ff9a2a"/><stop offset="1" stop-color="#ffe9a0"/></linearGradient>
<filter id="gl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>`,
      `<rect width="630" height="960" fill="url(#bg)"/><g fill="none" stroke="#ff6a1f" stroke-width="7" stroke-linejoin="round" opacity=".5" filter="url(#gl)">${cracks}</g><g fill="none" stroke="#ffb347" stroke-width="2.5" stroke-linejoin="round" opacity=".7">${cracks}</g>${frame('url(#mg)', '#ffb347')}
<g transform="translate(315 430)"><circle r="190" fill="#1a0504" stroke="url(#mg)" stroke-width="6"/>${ticks(16, 176, 188, '#ff8a2a')}
<path d="M-60-120c10-40 40-50 60-20 14-40 52-44 60 0 30-10 40 30 10 50H-50c-30-6-30-36-10-30z" fill="url(#lv)" opacity=".95"/>
<path d="M-170 140-44-60h88l126 200z" fill="#2e0e0a" stroke="#6a1f12" stroke-width="4"/>
<path d="M-44-60h88l-14 30c-10 20-14 50 4 80 14 26 6 60-20 90-6-40-30-50-34-80-4-30 14-50 0-70z" fill="url(#lv)"/>
<path d="M-44-60h88" stroke="#ffe9a0" stroke-width="6" stroke-linecap="round"/>
${dots(5, 12, [-80, -190, 160, 90], 2.5, 6, ['#ffb347', '#ffe9a0', '#ff6a1f'])}</g>${word('url(#mg)', 'MAGMA', '#ffb347')}`);
  },

  // A crescent moon among stars and a constellation.
  starfield: () => {
    const pts = [[120, 170], [190, 120], [260, 160], [300, 110], [470, 140], [520, 230]];
    const sparkle = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0-14 3-3 14 0 3 3 0 14-3 3-14 0-3-3z" fill="#fff"/>`;
    return svg(`<radialGradient id="bg" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#1c2a5c"/><stop offset=".6" stop-color="#0b1230"/><stop offset="1" stop-color="#03050d"/></radialGradient>${metal('sl', '#ffffff', '#b8c6f0', '#5a6aa8')}
<linearGradient id="mn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6d6"/><stop offset="1" stop-color="#ffd27a"/></linearGradient>
<mask id="cr"><circle r="110" fill="#fff"/><circle cx="46" cy="-30" r="96" fill="#000"/></mask>`,
      `<rect width="630" height="960" fill="url(#bg)"/>${dots(3, 150, [30, 30, 570, 900], .7, 2.4, ['#ffffff', '#cfe0ff', '#ffe9b0'])}
<path d="${pts.slice(0, 4).map((p, i) => (i ? 'L' : 'M') + p.join(' ')).join('')}M${pts[4].join(' ')}L${pts[5].join(' ')}" fill="none" stroke="#cfe0ff" stroke-opacity=".45" stroke-width="2"/>
${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#fff"/>`).join('')}${sparkle(150, 640, 1.4)}${sparkle(500, 600, 1.1)}${sparkle(470, 300, .9)}${sparkle(110, 420, .8)}
${frame('url(#sl)', '#dfe6ff')}<g transform="translate(315 430)"><circle r="190" fill="none" stroke="url(#sl)" stroke-width="6"/>${ticks(32, 178, 186, '#dfe6ff', 2, .5)}
<circle r="110" fill="url(#mn)" mask="url(#cr)"/>${sparkle(60, 40, 1.6)}${sparkle(-10, 90, .8)}</g>${word('url(#sl)', 'STARFIELD', '#dfe6ff')}`);
  },

  // Gold filigree lattice with a cut gem and sunburst.
  gilded: () => svg(`<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a260c"/><stop offset="1" stop-color="#120b04"/></linearGradient>${GOLD}
<pattern id="lt" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M30 2 58 30 30 58 2 30z" fill="none" stroke="#e9b75a" stroke-opacity=".22" stroke-width="2"/><circle cx="30" cy="30" r="3" fill="#e9b75a" opacity=".25"/></pattern>`,
    `<rect width="630" height="960" fill="url(#bg)"/><rect width="630" height="960" fill="url(#lt)"/>${frame('url(#gd)', '#ffe7a6')}
<rect x="54" y="54" width="522" height="852" rx="14" fill="none" stroke="url(#gd)" stroke-width="3"/>
<g transform="translate(315 430)"><g fill="#ffd27a" opacity=".3">${Array.from({ length: 24 }, (_, i) => `<path transform="rotate(${i * 15})" d="M-7-60 0-200 7-60z"/>`).join('')}</g>
<circle r="150" fill="none" stroke="url(#gd)" stroke-width="6"/><circle r="136" fill="#1e1408" stroke="#ffe7a6" stroke-opacity=".5" stroke-width="2"/>
<path d="M0-96 70-30 0 100-70-30z" fill="#e2a748"/><path d="M0-96 70-30H-70z" fill="#ffe7a6"/><path d="M0-96 30-30H-30z" fill="#fff6d6"/><path d="M-70-30 0 100-30-30z" fill="#c98a2c"/><path d="M70-30 0 100 30-30z" fill="#9a6322"/>
<path d="M0-96 70-30 0 100-70-30z" fill="none" stroke="#5a3a12" stroke-width="3" stroke-linejoin="round"/></g>${word('url(#gd)', 'GILDED', '#ffe7a6')}`),

  // A swirling void with a dark heart.
  void: () => svg(`<radialGradient id="bg" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#2a0f4a"/><stop offset=".6" stop-color="#12061f"/><stop offset="1" stop-color="#05020a"/></radialGradient>${metal('vd', '#efe0ff', '#b18bff', '#4b2a8a')}
<radialGradient id="hl" cx="50%" cy="50%" r="50%"><stop offset=".55" stop-color="#000"/><stop offset=".75" stop-color="#7b3dff"/><stop offset="1" stop-color="#7b3dff" stop-opacity="0"/></radialGradient>`,
    `<rect width="630" height="960" fill="url(#bg)"/>${dots(17, 70, [30, 30, 570, 900], .7, 2, ['#c6a6ff', '#ffffff', '#8a6bff'])}${frame('url(#vd)', '#c6a6ff')}
<g transform="translate(315 430)"><circle r="190" fill="none" stroke="url(#vd)" stroke-width="6"/>
<g fill="none" stroke-linecap="round">${Array.from({ length: 6 }, (_, i) => `<path transform="rotate(${i * 60})" d="M0-40C60-40 110 0 120 60S90 160 20 176" stroke="${i % 2 ? '#b18bff' : '#7b3dff'}" stroke-width="${10 - i}" stroke-opacity=".75"/>`).join('')}</g>
<circle r="80" fill="url(#hl)"/><circle r="44" fill="#000" stroke="#c6a6ff" stroke-width="3"/></g>${word('url(#vd)', 'VOID', '#c6a6ff')}`)
};
// Backs that shimmer (only with Effects on Full and the device not asking for reduced motion).
const SHIMMER = ['gilded', 'starfield', 'arcane', 'void'];
export const BACK_IDS = CARD_BACKS.map(b => b.id).filter(id => DESIGNS[id]);
const cache = {};
export const backSVG = id => cache[id] || (cache[id] = (DESIGNS[id] || DESIGNS.ember)());
export const backURL = id => `url("data:image/svg+xml,${encodeURIComponent(backSVG(id)).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29')}")`;
// A face-down card. Without an id it shows the player's chosen back.
export const backHTML = (id, cls = '') => `<i class="cosBack ${cls}" ${id ? `data-back="${DESIGNS[id] ? id : 'ember'}"` : ''} aria-hidden="true"></i>`;

/* ---------------------------------------------------------------- The player's choices */
const ext = () => (B?.state?.ember && typeof B.state.ember === 'object' ? B.state.ember : {});
const prof = () => { const p = ext().profile; return p && typeof p === 'object' ? p : {}; };
const earned = need => !need || !!(ext().achievements || {})[need];
const pick = (list, id) => { const it = list.find(x => x.id === id); return it && earned(it.need) ? it.id : null; };
// null when the player never chose one (or it is not unlocked), which keeps today's look.
export const chosenBack = () => pick(CARD_BACKS, prof().cardBack);
export const chosenRing = () => pick(AVATAR_RINGS, prof().ring);
export function avatarCard() {
  const id = prof().avatar; if (!id) return null;
  const list = Array.isArray(B?.state?.owned) ? B.state.owned : [];
  return list.find(c => c && c.id === id && Number.isInteger(c.kind)) || null;
}

/* ---------------------------------------------------------------- 3D pack reveal back (enhancements.js) */
const images = {};
function image(id) {
  if (images[id]) return images[id];
  const img = new Image(); img.decoding = 'async';
  img.src = 'data:image/svg+xml,' + encodeURIComponent(backSVG(id));
  return images[id] = img;
}
// Returns a canvas with the chosen back, or null for the default (the reveal then draws its own back).
// onReady is only ever called later (never during this call), when the picture finishes loading.
function backCanvas(onReady) {
  const id = chosenBack(); if (!id || id === 'ember') return null;
  const w = 512, h = 727, cv = document.createElement('canvas'), g = cv.getContext('2d'); cv.width = w; cv.height = h;
  const clip = c => { c.beginPath(); c.roundRect ? c.roundRect(4, 4, w - 8, h - 8, 34) : c.rect(4, 4, w - 8, h - 8); };
  clip(g); g.fillStyle = '#1a1030'; g.fill(); g.lineWidth = 14; g.strokeStyle = '#e8bd64'; g.stroke();
  const draw = img => {
    // Draw on a scratch canvas first and check it can be read back, so the 3D texture never gets a blocked canvas.
    const t = document.createElement('canvas'); t.width = w; t.height = h; const c = t.getContext('2d');
    clip(c); c.save(); c.clip(); c.drawImage(img, 0, 0, w, h); /* a slight stretch keeps the whole border on the 3D card */ c.restore();
    try { c.getImageData(0, 0, 1, 1); } catch { return false; }
    g.clearRect(0, 0, w, h); g.drawImage(t, 0, 0); return true;
  };
  const img = image(id);
  if (img.complete && img.naturalWidth) draw(img);
  else img.addEventListener('load', () => { if (draw(img)) onReady?.(); }, { once: true });
  return cv;
}

/* ---------------------------------------------------------------- Applying it to the page */
export function apply() {
  const root = document.documentElement, back = chosenBack(), ring = chosenRing();
  if (back) { if (root.dataset.cardback !== back) root.dataset.cardback = back; } else if (root.dataset.cardback) delete root.dataset.cardback;
  if (ring) { if (root.dataset.avring !== ring) root.dataset.avring = ring; } else if (root.dataset.avring) delete root.dataset.avring;
  if (back && back !== 'ember') image(back); // warm up for the 3D reveal
  // Header avatar: your chosen Mythling instead of the Active one.
  const ava = avatarCard();
  if (ava) for (const el of $$('.uiAvatar,.uiPAva')) if (el.dataset.cosAva !== ava.id) { try { el.innerHTML = B.art(ava); el.dataset.cosAva = ava.id; } catch { /* keep the old picture */ } }
  if (!back) return;
  // Battle: your deck pile shows your card back.
  if (B.view === 'cardBattle') for (const g of $$('.pocketField h2 .uiGlyph[aria-label="You"]')) {
    const deck = $('.battleIconStats span[title="Deck"]', g.closest('.pocketField'));
    if (deck && !$('.cosDeck', deck)) { deck.insertAdjacentHTML('afterbegin', backHTML('', 'cosDeck')); deck.classList.add('cosDeckOn'); }
  }
  // Pack reveal: the cards still to turn over, face down.
  if (B.view === 'reveal' && !$('.cosToReveal')) {
    const p = B.state.pendingPack, left = p && Array.isArray(p.ids) ? p.ids.length - (p.revealed || 0) : 0, pill = $('.rarityReveal > .pill');
    if (left > 0 && pill) pill.insertAdjacentHTML('afterend', `<div class="cosToReveal" role="img" aria-label="${left} more ${left === 1 ? 'card' : 'cards'} to reveal"><span class="cosFan">${Array.from({ length: Math.min(left, 4) }, (_, i) => backHTML('', 'cosFanCard') .replace('<i ', `<i style="--i:${i}" `)).join('')}</span><small>${left} more to reveal</small></div>`);
  }
}

/* ---------------------------------------------------------------- Styles */
const RINGS = {
  ember: 'conic-gradient(#ff6a2a,#ffcf5c,#ff3d1f,#ffb347,#ff6a2a)',
  leaf: 'repeating-conic-gradient(#3f9b4f 0 15deg,#9be37a 15deg 30deg)',
  frost: 'conic-gradient(#ffffff,#8fd8ff,#e8f8ff,#5fb6ff,#ffffff)',
  storm: 'repeating-conic-gradient(#ffe066 0 12deg,#3d4a70 12deg 45deg)',
  prism: 'conic-gradient(#ff5f6d,#ffc371,#fff36b,#6bff9a,#5fd6ff,#8a7dff,#ff7ad9,#ff5f6d)',
  void: 'conic-gradient(#1a0b2e,#7b3dff,#1a0b2e,#c08bff,#1a0b2e)',
  champion: 'conic-gradient(#fff3c0,#d79a2b,#b33a3a,#ffe58a,#d79a2b,#7a1f2a,#fff3c0)'
};
const GLOW = { ember: '#ff7a2a', prism: '#d6b0ff', void: '#8b4dff', champion: '#ffcc55', storm: '#ffe066', frost: '#bfe8ff' };
const SPIN = ['ember', 'prism', 'void'];
function injectCSS() {
  if ($('#cosStyles')) return;
  const css = document.createElement('style'); css.id = 'cosStyles';
  css.textContent = `
:root{${BACK_IDS.map(id => `--cosb-${id}:${backURL(id)}`).join(';')};--cos-card-back:var(--cosb-ember)}
${BACK_IDS.map(id => `html[data-cardback="${id}"]{--cos-card-back:var(--cosb-${id})}.cosBack[data-back="${id}"]{--cos-b:var(--cosb-${id})}`).join('\n')}
.cosBack{display:block;position:relative;aspect-ratio:630/960;border-radius:7%/4.6%;overflow:hidden;background:var(--cos-b,var(--cos-card-back)) center/cover no-repeat #140f22;box-shadow:0 2px 6px #0008}
/* Card details flip side */
html[data-cardback]:not([data-cardback="ember"]) #cardDetails .cdBackFace{background:var(--cos-card-back) center/cover no-repeat #140f22}
html[data-cardback]:not([data-cardback="ember"]) #cardDetails .cdBackFace .cdCrest{visibility:hidden}
/* Shimmer on a few backs */
@keyframes cosSheen{0%,55%{transform:translateX(-120%) skewX(-18deg)}100%{transform:translateX(220%) skewX(-18deg)}}
${SHIMMER.map(id => `html[data-fx="full"] .cosBack[data-back="${id}"]::after,html[data-fx="full"][data-cardback="${id}"] .cosBack:not([data-back])::after,html[data-fx="full"][data-cardback="${id}"] #cardDetails .cdBackFace::after`).join(',')}{content:"";position:absolute;inset:0;width:45%;background:linear-gradient(90deg,#fff0,#fff3,#fff0);pointer-events:none;animation:cosSheen 4.5s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.cosBack::after,#cardDetails .cdBackFace::after{animation:none!important;display:none}}
/* Battle deck pile */
.battleIconStats .cosDeckOn .uiGlyph{display:none}
.cosDeck{width:1.05em;height:1.6em;margin:-.3em .05em -.3em 0;border-radius:2px;box-shadow:.12em .1em 0 #0007,.22em .2em 0 #fff2;flex:none}
/* Cards still to reveal */
.cosToReveal{display:flex;align-items:center;justify-content:center;gap:10px;margin:8px auto 2px}
.cosToReveal small{color:#e6dbc0;font-weight:700;font-size:14px}
.cosFan{display:flex;padding-left:14px}
.cosFanCard{width:34px;margin-left:-14px;transform:rotate(calc((var(--i) - 1.5) * 7deg));border:1px solid #fff3}
/* Avatar rings: header avatar (html[data-avring]) and profile pictures (.cosRing-id) */
.pfAva{position:relative}
.cosRingSwatch{display:block;position:relative;width:64px;height:64px;margin:6px auto 0;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 50% 35%,#3a4566,#121624)}
.cosRingSwatch .mythlingArt{position:absolute!important;inset:0;width:100%!important;height:100%!important}
.cosRingSwatch.cosRing-gold::after{content:"";position:absolute;inset:0;border-radius:50%;pointer-events:none;z-index:2;box-shadow:inset 0 0 0 3px #e9b75a}
${Object.entries(RINGS).map(([id, bg]) => `html[data-avring="${id}"] :is(.uiAvatar,.uiPAva)::after,.cosRing-${id}::after{content:"";position:absolute;inset:0;border-radius:50%;pointer-events:none;z-index:2;background:${bg};-webkit-mask:radial-gradient(farthest-side,#0000 calc(100% - var(--cos-rw,3px)),#000 calc(100% - var(--cos-rw,3px) + .5px));mask:radial-gradient(farthest-side,#0000 calc(100% - var(--cos-rw,3px)),#000 calc(100% - var(--cos-rw,3px) + .5px))}${GLOW[id] ? `html[data-avring="${id}"] .uiAvatar{box-shadow:0 0 8px ${GLOW[id]}}` : ''}`).join('\n')}
html[data-avring]:not([data-avring="gold"]) .uiAvatar{border-color:transparent}
.uiPAva{--cos-rw:4px}.pfAva{--cos-rw:6px}.pfMini .pfAva,.cosRingSwatch{--cos-rw:5px}
@keyframes cosSpin{to{transform:rotate(360deg)}}
${SPIN.map(id => `html[data-fx="full"][data-avring="${id}"] :is(.uiAvatar,.uiPAva)::after,html[data-fx="full"] .cosRing-${id}::after`).join(',')}{animation:cosSpin 8s linear infinite}
@media (prefers-reduced-motion:reduce){:is(.uiAvatar,.uiPAva,.pfAva,.cosRingSwatch)::after{animation:none!important}}
`;
  document.head.append(css);
}

if (B && !window.EmberCosmetics) {
  injectCSS();
  window.EmberCosmetics = Object.freeze({ backs: CARD_BACKS, rings: AVATAR_RINGS, backSVG, backURL, backHTML, backCanvas, chosenBack, chosenRing, avatarCard, apply, shimmer: SHIMMER });
  apply();
  addEventListener('ember:frame', apply);
  addEventListener('ember:cardBattle', () => requestAnimationFrame(apply));
}
