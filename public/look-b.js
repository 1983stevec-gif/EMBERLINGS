// EMBERLINGS look pack B: battle scenery. Each island's quests are fought in front of that island's own scene.
// Presentation only: one still picture behind the board, no rules, rewards or timers change. Friend battles,
// spectating and replays keep the usual board, and if a picture can't load the usual board simply stays.
//  - Wide screens and portrait tablets: a cut-out picture sits between the painted board and the cards.
//  - Phones: the scene is a dimmed strip at the top of the battle page.
// Save data (additive): state.ember.battleScenes = { on } only once the player changes the switch.
// The pure helpers are exported for tests. The pictures come from scripts/art/look-b.py.
const ART = '/art/battle-bg/';
// Same levels as `regions` in game/index.html (tests/look-b.mjs compares them).
export const ISLANDS = [
  { id: 'meadows', name: 'Ember Meadows', from: 1, to: 10 },
  { id: 'crystalwood', name: 'Crystalwood Forest', from: 11, to: 25 },
  { id: 'peaks', name: 'Frozen Peaks', from: 26, to: 45 },
  { id: 'thunder', name: 'Thunder Valley', from: 46, to: 70 },
  { id: 'shadow', name: 'Shadow Realm', from: 71, to: 100 }
];
export const islandFor = level => Number.isInteger(level) ? ISLANDS.find(i => level >= i.from && level <= i.to) || null : null;
export const scenesOn = state => state?.ember?.battleScenes?.on !== false;
// The scene for the battle on screen: only the player's own quest battle has one.
export function sceneFor(state, match) {
  const own = state?.cardBattle;
  if (!match || !own || own.match !== match || !scenesOn(state)) return null;
  return islandFor(own.level)?.id || null;
}
// Where the cut-out sits on each painted board, in board pixels: board size, then x, y, width, height.
export const SPOTS = { wide: [1672, 941, 170, 100, 1320, 510], tab: [1045, 1505, 60, 150, 925, 805] };
export const spotStyle = ([W, H, x, y, w, h]) => {
  const p = (a, b) => (a / b * 100).toFixed(3) + '%';
  return `left:${p(x, W)};top:${p(y, H)};width:${p(w, W)};height:${p(h, H)}`;
};

const B = typeof window === 'undefined' ? null : window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s);

/* ---------- The board */
const layers = {}; // kept and moved back in after every redraw, so the picture never blinks
function layer(scene, kind) {
  const key = scene + '-' + kind;
  if (layers[key]) return layers[key];
  const img = new Image();
  img.className = 'lbScene'; img.alt = ''; img.setAttribute('aria-hidden', 'true'); img.draggable = false;
  img.style.cssText = spotStyle(SPOTS[kind]);
  img.onerror = () => { img.remove(); delete layers[key]; };
  img.src = ART + key + '.webp';
  return layers[key] = img;
}
let match = null;
function paint() {
  const arena = $('.cardArena');
  if (!arena) return;
  const scene = sceneFor(B.state, match);
  const wide = $('.uiXBattle', arena), host = wide || $('.uiXBattleTab', arena);
  const want = scene && host ? layer(scene, wide ? 'wide' : 'tab') : null;
  for (const el of arena.querySelectorAll('.lbScene')) if (el !== want) el.remove();
  if (want && want.parentElement !== host) host.prepend(want);
  arena.classList.toggle('lbArena', !!scene && !host);
  if (scene && !host) arena.style.setProperty('--lb-scene', `url("${ART}${scene}.webp")`);
  else arena.style.removeProperty('--lb-scene');
}

/* ---------- Settings */
function setOn(on) {
  const st = B.state;
  if (!st.ember || typeof st.ember !== 'object') st.ember = {};
  st.ember.battleScenes = { on: !!on };
  try { B.save(); } catch (err) { console.warn('look-b', err); }
  paint();
}
const sectionHTML = () => {
  const on = scenesOn(B.state);
  return `<div class="setRow"><div class="setRowText"><span class="setLabel" id="lbSceneLbl">Island scenes in battles</span><small class="setSub" id="lbSceneSub">Quest battles show the island you are on behind the cards. Off brings back the usual board.</small></div>
  <button type="button" class="setSwitch" id="lbScene" role="switch" aria-checked="${on}" aria-labelledby="lbSceneLbl" aria-describedby="lbSceneSub"><span>${on ? 'On' : 'Off'}</span></button></div>`;
};
function bind(el) {
  el.addEventListener('click', e => {
    const b = e.target.closest('#lbScene');
    if (!b) return;
    const on = !scenesOn(B.state);
    setOn(on);
    b.setAttribute('aria-checked', String(on));
    $('span', b).textContent = on ? 'On' : 'Off';
  });
}
let hub = false;
function hookSettings() {
  if (hub || !window.EmberSettings?.addSection) return;
  hub = window.EmberSettings.addSection({ id: 'scenery', icon: '🏞️', title: 'Battle scenery', order: 4.5, html: sectionHTML, bind }) !== false;
}

/* ---------- Styles */
const CSS = `
/* Battle scenery (public/look-b.js) */
.lbScene{position:absolute;pointer-events:none;user-select:none}
:is(.uiXBattle,.uiXBattleTab) .lbScene~.uiXBLayer{text-shadow:0 1px 3px #000c}
.uiTheme .cardArena.lbArena{background:linear-gradient(180deg,#0b0e1480,#0b0e14a0 220px,#0b0e14 380px),var(--lb-scene) 50% 0/max(100%,676px) auto no-repeat,#0b0e14}
`;

/* ---------- Start */
if (B && !window.EmberScenes) {
  const st = document.createElement('style');
  st.id = 'lbStyles'; st.textContent = CSS; document.head.append(st);
  window.EmberScenes = Object.freeze({ on: () => scenesOn(B.state), set: setOn, islands: ISLANDS });
  const safe = f => e => { try { f(e); } catch (err) { console.warn('look-b', err); } };
  addEventListener('ember:cardBattle', safe(e => { match = e.detail?.match || null; paint(); }));
  addEventListener('ember:frame', safe(hookSettings));
  hookSettings();
  setTimeout(hookSettings, 0);
}
