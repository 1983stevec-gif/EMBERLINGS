// EMBERLINGS interactive rules demo (view "rulesDemo"): a short guided turn on a small practice battle.
// It uses the real battle engine (createCardMatch / cardAction / chooseAI), so every control follows the
// real rules and every refusal is the engine's own message. The demo keeps its own match in memory:
// no rewards, no save data, and the player's cards and battles are never touched.
// Opened from the Battle Rules page ("Try a guided turn") and from the Help centre.
import { createCardMatch, cardAction, chooseAI, buildBattleDeck, ELEMENTS, TRAINERS, attacks } from './card-engine.js';

/* ------------------------------------------------------------ Pure demo data and steps (tests/rules-demo.mjs) */
const owned = (prefix, kinds) => kinds.map((kind, i) => ({ id: prefix + i, kind, level: 1, rarity: 'Common' }));

// Two small fixed pools of owned cards. The demo decks use the first four kinds, so both pools
// lean on Fire, Moon, Nature and Lightning; the extra copies are never dealt.
export const DEMO_POOLS = [
  owned('me', [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]),
  owned('fo', [2, 2, 1, 1, 3, 3, 0, 0, 1, 1]),
];
// The same eight-card practice deck for both sides: two copies each of four Basics, no Trainers,
// so the guided steps never run into a Trainer or an evolution.
export const DEMO_SELECTION = ['m-0-false-0', 'm-0-false-0', 'm-1-false-0', 'm-1-false-0', 'm-2-false-0', 'm-2-false-0', 'm-3-false-0', 'm-3-false-0'];

// One rule at a time. `action` is an exact cardAction payload for the practice match built by buildDemoMatch().
export const DEMO_STEPS = [
  { title: 'Choose your Active',
    rule: 'Your Active Mythling is the one that attacks and takes hits. Pick a Basic from your opening hand. The highlighted card is your Flaminyx.',
    action: { type: 'active', cardId: 'c-0' } },
  { title: 'Add a Basic to your Bench',
    rule: 'Benched Mythlings wait behind your Active and can step in later. You may have up to three on the Bench.',
    action: { type: 'bench', cardId: 'c-5' } },
  { title: 'Get ready',
    rule: 'Ready locks in your starting choices. A fair coin decides who goes first — this time the challenger does, so watch their first turn.',
    action: { type: 'ready' } },
  { title: 'End your turn to earn a Merfling',
    rule: 'Nobody starts with Merfling. Ending your turn earns one for your next turn, and the challenger takes their turn while you wait.',
    action: { type: 'end' } },
  { title: 'Attach your Merfling',
    rule: 'The challenger attacked while you had no Merfling. Now attach the Merfling you earned to your Active. You attach once per turn, and unused Merfling does not pile up.',
    action: { type: 'attach', targetId: 'c-0' } },
  { title: 'Attack',
    rule: 'Your Active attacks with the Merfling attached to it. Attacking ends your turn and earns your next Merfling; the Merfling stays attached afterwards.',
    action: { type: 'attack', move: 'basic' } },
];

// A deterministic practice match. Same rng (and same now) gives the same match every time.
export function buildDemoMatch(rng = () => 0.5, now = 0) {
  return createCardMatch(DEMO_POOLS, { selections: [DEMO_SELECTION, DEMO_SELECTION], rng, now });
}

// The challenger plays its own turns with the engine's own chooser. Stops as soon as it is not the
// challenger's setup, turn or replacement choice. Returns the actions it took.
export function playChallenger(match, now = 1, rng = () => 0.5) {
  const played = [];
  for (let i = 0; i < 40; i++) {
    const side = match.phase === 'setup' ? 1
      : match.phase === 'replace' ? match.replacement
        : match.phase === 'turn' ? match.turn : null;
    if (side !== 1) break;
    const action = chooseAI(match, 1, 3, rng);
    if (!action) break;
    cardAction(match, 1, action, now, rng);
    played.push(action);
    if (match.result) break;
  }
  return played;
}

// Play one guided step. The engine's own Error is left to bubble so a test can prove each step is legal.
export function applyStep(match, i, side = 0, now = 1, rng = () => 0.5) {
  const step = DEMO_STEPS[i];
  if (!step) throw Error('There is no step ' + i + ' in the guided turn.');
  return cardAction(match, side, step.action, now, rng);
}

/* ------------------------------------------------------------ In the game */
const NAMES = ['Flaminyx', 'Lunamo', 'Verdelle', 'Voltix', 'Aquabub', 'Crystella', 'Frostbit', 'Umbryx', 'Emberoo', 'Zephyra'];
const RNG = () => 0.5;
const B = globalThis.window?.EmberBridge;
const $ = (s, r) => (r || document).querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

let match = null, step = 0, busy = false, done = false, note = '', timer = 0;

const calmNow = () => {
  try {
    const lv = window.EmberFx?.level?.();
    if (lv) return lv === 'off';
    return !!(B?.state?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch { return false; }
};
const byId = (p, id) => p.cards.find(c => c.id === id);
const cardName = c => c.cardType === 'trainer'
  ? (TRAINERS.find(t => t.id === c.trainer)?.name || 'Trainer')
  : (NAMES[c.kind] || ELEMENTS[c.kind] || 'Mythling') + (c.stage === 1 ? ' · Ascended' : c.stage === 2 ? ' · Apex' : '');
const activeOf = p => (p.active ? byId(p, p.active) : null);

function pointsHTML(n) {
  return `<span class="rdDots" aria-label="${n} of 3 points">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
}

function sideHTML(p, isYou) {
  const active = activeOf(p);
  const hot = DEMO_STEPS[step]?.action.targetId === p.active;
  return `<div class="rdSide ${isYou ? 'rdYou' : 'rdFoe'}">
    <div class="rdSideTop"><strong>${isYou ? 'You' : 'Challenger'}</strong>${pointsHTML(p.points)}</div>
    ${active ? `<div class="rdMini${hot ? ' rdHot' : ''}">
      <span class="rdMiniName">${esc(cardName(active))}</span>
      <span class="rdMiniMeta">${esc(active.element)} · ${active.hp}/${active.maxhp} HP</span>
      <span class="rdMiniMeta">${active.energies.length ? active.energies.length + ' Merfling attached' : 'No Merfling attached'}</span>
    </div>` : '<div class="rdMini empty">No Active Mythling</div>'}
    <div class="rdBench">${p.bench.length
      ? p.bench.map(id => { const c = byId(p, id); return `<span class="rdChip">${esc(cardName(c))} · ${c.hp}/${c.maxhp}</span>`; }).join('')
      : '<span class="rdMuted">Bench empty</span>'}</div>
    ${isYou && p.energyZone ? '<div class="rdEnergy">1 Merfling ready to attach</div>' : ''}
  </div>`;
}

function handHTML(p) {
  const a = DEMO_STEPS[step]?.action || {};
  return `<section class="rdHandBox" aria-label="Your hand"><h3>Your hand · ${p.hand.length}</h3>
    <div class="rdHandRow">${p.hand.map(id => {
      const c = byId(p, id);
      const basic = c.cardType === 'mythling' && !c.stage;
      const hotActive = a.type === 'active' && a.cardId === c.id;
      const hotBench = a.type === 'bench' && a.cardId === c.id;
      const act = a.type === 'active' && basic;
      const bench = a.type === 'bench' && basic;
      return `<div class="rdHandCard${hotActive || hotBench ? ' rdHot' : ''}">
        <span class="rdMiniName">${esc(cardName(c))}</span>
        <span class="rdMiniMeta">${esc(c.cardType === 'mythling' ? c.element : 'Trainer')}</span>
        ${act ? `<button type="button" class="rdBtn small" data-rd-act="active" data-rd-card="${c.id}" ${hotActive ? '' : 'disabled'} title="${hotActive ? 'Make this your Active' : 'Play the highlighted step first'}">Make Active</button>` : ''}
        ${bench ? `<button type="button" class="rdBtn small" data-rd-act="bench" data-rd-card="${c.id}" ${hotBench ? '' : 'disabled'} title="${hotBench ? 'Put this Basic on your Bench' : 'Play the highlighted step first'}">Bench</button>` : ''}
      </div>`;
    }).join('') || '<span class="rdMuted">Your hand is empty.</span>'}</div>
  </section>`;
}

function controlsHTML() {
  if (done) return '';
  const a = DEMO_STEPS[step]?.action || {};
  const you = match.sides[0];
  const active = activeOf(you);
  const move = active ? attacks(active)[0] : null;
  const off = busy ? 'disabled' : '';
  return `<div class="rdControls">
    <button type="button" class="rdBtn${a.type === 'attach' ? ' rdHot' : ''}" id="rdAttach" ${a.type === 'attach' ? off : 'disabled'} title="${a.type === 'attach' ? 'Attach the Merfling you earned' : 'Play the highlighted step first'}">Attach Merfling</button>
    <button type="button" class="rdBtn${a.type === 'attack' ? ' rdHot' : ''}" id="rdAttack" ${(a.type === 'attack' || a.type === 'attach') && !busy ? '' : 'disabled'} title="${a.type === 'attack' ? 'Attack with your Active Mythling' : a.type === 'attach' ? 'Try it and see what the rules say' : 'Play the highlighted step first'}">Attack${move ? ' · ' + esc(move.name) : ''}</button>
    <button type="button" class="rdBtn${a.type === 'end' ? ' rdHot' : ''}" id="rdEnd" ${a.type === 'end' ? off : 'disabled'} title="${a.type === 'end' ? 'End your turn and earn a Merfling' : 'Play the highlighted step first'}">End Turn</button>
    ${a.type === 'ready' ? `<button type="button" class="rdBtn gold rdHot" id="rdReady" ${off}>Ready</button>` : ''}
  </div>`;
}

function stepHTML() {
  if (step >= DEMO_STEPS.length) return '';
  const s = DEMO_STEPS[step];
  return `<section class="rdStepCard" aria-live="polite">
    <p class="rdStepNo">Step ${step + 1} of ${DEMO_STEPS.length}</p>
    <h2>${esc(s.title)}</h2>
    <p>${esc(s.rule)}</p>
  </section>`;
}

function doneHTML() {
  return `<section class="rdDone" aria-live="polite">
    <h2>That's a full turn!</h2>
    <p>Everything else — Trainers, evolutions, retreats — is on the Battle Rules page.</p>
    <p class="rdSmall">This was practice only: nothing was saved, no rewards were given and your own cards were never at stake.</p>
  </section>`;
}

function footHTML() {
  return `<p class="rdFoot">
    ${done ? '<button type="button" class="rdBtn gold" id="rdBack">Back to Battle Rules</button>' : ''}
    <button type="button" class="rdBtn alt" id="rdRestart">Restart</button>
    <button type="button" class="rdBtn alt" id="rdExit">Exit</button>
  </p>`;
}

const noteHTML = () => {
  const waiting = match && match.phase === 'turn' && match.turn === 1 ? 'The challenger is taking their turn…'
    : match && match.phase === 'setup' ? 'The challenger is getting ready…'
      : 'One moment…';
  return `<p class="rdNote" role="status" aria-live="polite">${busy ? waiting : esc(note)}</p>`;
};

function introHTML() {
  return `<section class="rdIntro">
    <h2>A short practice battle</h2>
    <p>One turn, one rule at a time. You will choose an Active, fill your Bench, earn a Merfling and attack.</p>
    <p class="rdSmall">Nothing here is saved and nothing is at stake. Your own cards, decks and battles are not touched.</p>
    <p><button type="button" class="rdBtn gold" id="rdStart">Start the guided turn</button></p>
    <p><button type="button" class="rdBtn alt" id="rdExit">Back to Battle Rules</button></p>
  </section>`;
}

function paint() {
  const body = $('#rdBody'); if (!body) return;
  if (!match) { body.innerHTML = introHTML(); bind(); return; }
  body.innerHTML = (done ? doneHTML() : stepHTML())
    + `<div class="rdBoard">${sideHTML(match.sides[1], false)}${sideHTML(match.sides[0], true)}</div>`
    + handHTML(match.sides[0])
    + noteHTML()
    + controlsHTML()
    + footHTML();
  bind();
}

function restart() {
  clearTimeout(timer);
  match = buildDemoMatch(RNG, Date.now());
  step = 0; busy = false; done = false; note = '';
  paint();
}

function attempt(payload, advance = true) {
  if (busy || !match) return;
  note = '';
  try {
    cardAction(match, 0, payload, Date.now(), RNG);
  } catch (err) {
    console.warn('rules-demo', err);
    note = String(err?.message || err || 'That is not allowed yet.');
    paint();
    return;
  }
  if (advance) step += 1;
  busy = true;
  paint();
  clearTimeout(timer);
  if (calmNow()) afterReply();
  else timer = setTimeout(afterReply, 500);
}

function afterReply() {
  try {
    playChallenger(match, Date.now(), RNG);
  } catch (err) {
    console.warn('rules-demo', err);
    note = 'The challenger stopped. Restart the guided turn to try again.';
  }
  if (match.phase === 'replace' && match.replacement === 0) {
    note = 'Your Active was knocked out. Restart the guided turn to try again.';
    done = true;
  }
  if (step >= DEMO_STEPS.length) done = true;
  busy = false;
  paint();
}

function bind() {
  const body = $('#rdBody'); if (!body) return;
  body.querySelectorAll('[data-rd-act]').forEach(el => {
    el.addEventListener('click', () => attempt({ type: el.dataset.rdAct, cardId: el.dataset.rdCard }));
  });
  $('#rdStart')?.addEventListener('click', restart);
  $('#rdReady')?.addEventListener('click', () => attempt(DEMO_STEPS[step].action));
  $('#rdEnd')?.addEventListener('click', () => attempt(DEMO_STEPS[step].action));
  $('#rdAttach')?.addEventListener('click', () => attempt(DEMO_STEPS[step].action));
  $('#rdAttack')?.addEventListener('click', () => {
    // During the attach step this is the gentle lesson: the engine says to attach first.
    const a = DEMO_STEPS[step]?.action;
    attempt(a?.type === 'attack' ? a : { type: 'attack', move: 'basic' }, a?.type === 'attack');
  });
  $('#rdRestart')?.addEventListener('click', restart);
  $('#rdBack')?.addEventListener('click', () => { try { B.go('rules'); } catch (err) { console.warn('rules-demo', err); } });
  $('#rdExit')?.addEventListener('click', () => { try { B.go('rules'); } catch (err) { console.warn('rules-demo', err); } });
}

function render() {
  clearTimeout(timer);
  match = null; step = 0; busy = false; done = false; note = '';
  B.render(`<button class="back" data-go="rules">‹ Battle Rules</button>
  <section class="rdPage" aria-labelledby="rdTitle">
    <header class="rdHead"><h1 id="rdTitle">Try a guided turn</h1>
    <p>A short practice battle against a friendly challenger. No rewards — just the rules.</p></header>
    <div id="rdBody"></div>
  </section>`);
  paint();
}

/* ------------------------------------------------------------ Entry link on the Battle Rules page */
function addEntry() {
  if (B.view !== 'rules') return;
  const h1 = [...document.querySelectorAll('#app h1')].find(h => h.textContent.trim() === 'Battle Rules');
  if (!h1 || document.getElementById('rdEnter')) return;
  const bar = document.createElement('p');
  bar.className = 'rdEnterBar';
  const btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'rdEnter'; btn.className = 'rdBtn gold';
  btn.textContent = 'Try a guided turn ›';
  btn.addEventListener('click', () => { try { B.go('rulesDemo'); } catch (err) { console.warn('rules-demo', err); } });
  const noteEl = document.createElement('span');
  noteEl.className = 'rdEnterNote';
  noteEl.textContent = 'A short practice battle. No rewards, nothing saved.';
  bar.append(btn, noteEl);
  h1.after(bar);
}

/* ------------------------------------------------------------ Styles */
const CSS = `
/* Interactive rules demo (rules-demo.js) */
.rdPage{max-width:980px;margin:0 auto;padding:4px 16px 40px;color:#f6ead2}
.rdHead h1{margin:6px 0 4px;font:700 clamp(30px,5vw,42px)/1.1 'Cormorant Garamond',Georgia,serif;color:#ffe3a0}
.rdHead p{margin:0 0 14px;font-size:17px;color:#e8dcc2}
.rdEnterBar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:10px 0 14px}
.rdEnterNote{font-size:13px;color:#c7bda6}
.rdStepCard{margin:0 0 12px;padding:12px 16px;border:2px solid #e9b75a;border-radius:14px;background:linear-gradient(180deg,#1a2334,#0e1420);box-shadow:0 6px 18px #0007}
.rdStepCard h2{margin:2px 0 6px;font:700 24px/1.2 'Cormorant Garamond',Georgia,serif;color:#ffe3a0}
.rdStepCard p{margin:0 0 6px;font:16px/1.45 system-ui,'Segoe UI',sans-serif;color:#f6ead2}
.rdStepNo{margin:0;font:600 13px system-ui,'Segoe UI',sans-serif;color:#e9b75a;text-transform:uppercase;letter-spacing:.04em}
.rdBoard{display:grid;gap:10px;padding:12px;border:2px solid #c9a35a55;border-radius:16px;background:#0e1420;box-shadow:0 10px 26px #0008}
.rdSide{padding:10px 12px;border:1px solid #2c3b58;border-radius:12px;background:#111a2a}
.rdSide.rdFoe{background:#121a29}
.rdSide.rdYou{background:#131c2d}
.rdSideTop{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 8px;font:700 15px system-ui,'Segoe UI',sans-serif;color:#f6ead2}
.rdDots{display:inline-flex;gap:5px}
.rdDots i{width:12px;height:12px;border-radius:50%;border:1.5px solid #e9b75a;background:transparent}
.rdDots i.on{background:#e9b75a;box-shadow:0 0 8px #e9b75a88}
.rdMini{display:flex;flex-direction:column;gap:2px;padding:8px 10px;border:1px solid #3a4a6b;border-radius:12px;background:#1a2334;font:13px/1.35 system-ui,'Segoe UI',sans-serif;color:#f6ead2}
.rdMini.empty{color:#9aa6c8;font-style:italic}
.rdMiniName{font-weight:700;font-size:15px;color:#fff1cf}
.rdMiniMeta{font-size:13px;color:#cdd6ea}
.rdBench{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.rdChip{padding:6px 10px;border:1px solid #33467e;border-radius:99px;background:#0b1230;font-size:12px;color:#dfe5f6}
.rdEnergy{margin-top:8px;font:600 13px/1.3 system-ui,'Segoe UI',sans-serif;color:#e9b75a}
.rdMuted{font-size:13px;color:#9aa6c8}
.rdHandBox{margin:12px 0 0;padding:10px 12px;border:1px solid #2c3b58;border-radius:14px;background:#0e1420}
.rdHandBox h3{margin:0 0 8px;font:700 18px/1.2 'Cormorant Garamond',Georgia,serif;color:#ffe3a0}
.rdHandRow{display:flex;flex-wrap:wrap;gap:8px}
.rdHandCard{display:flex;flex-direction:column;gap:4px;min-width:132px;padding:8px 10px;border:1px solid #3a4a6b;border-radius:12px;background:#1a2334}
.rdControls{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
.rdBtn{min-height:44px;padding:0 16px;border-radius:10px;border:1.5px solid #e9b75a;background:#1a2334;color:#ffe2a0;font:600 15px system-ui,'Segoe UI',sans-serif;cursor:pointer}
.rdBtn.gold{background:linear-gradient(180deg,#ffe29a,#e8ae45);color:#2a1606;border-color:#fff1c2}
.rdBtn.alt{background:#151e2f;color:#f6ead2;border-color:#43547a}
.rdBtn.small{min-height:44px;padding:0 12px;font-size:14px}
.rdBtn:disabled{opacity:.55;cursor:not-allowed}
.rdBtn:focus-visible{outline:3px solid #ffdd7e;outline-offset:2px}
.rdHot{outline:3px solid #e9b75a;outline-offset:3px;box-shadow:0 0 0 6px #e9b75a2e,0 0 18px #e9b75a55;animation:rdPulse 1.6s ease-in-out infinite}
.rdBtn.small.rdHot,.rdMini.rdHot{animation:rdPulse 1.6s ease-in-out infinite}
@keyframes rdPulse{0%,100%{box-shadow:0 0 0 4px #e9b75a22,0 0 10px #e9b75a44}50%{box-shadow:0 0 0 7px #e9b75a38,0 0 20px #e9b75a66}}
html[data-fx="off"] .rdHot{animation:none;box-shadow:0 0 0 4px #e9b75a33}
html[data-fx="light"] .rdHot{animation-duration:2.4s}
@media(prefers-reduced-motion:reduce){.rdHot{animation:none;box-shadow:0 0 0 4px #e9b75a33}}
.rdNote{min-height:24px;margin:12px 0 0;font:14px/1.4 system-ui,'Segoe UI',sans-serif;color:#ffd77a}
.rdFoot{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 0}
.rdDone{margin:0 0 12px;padding:14px 16px;border:2px solid #e9b75a;border-radius:14px;background:linear-gradient(180deg,#1d2839,#0e1420)}
.rdDone h2{margin:0 0 6px;font:700 26px/1.2 'Cormorant Garamond',Georgia,serif;color:#ffe3a0}
.rdDone p{margin:0 0 8px;font:16px/1.45 system-ui,'Segoe UI',sans-serif;color:#f6ead2}
.rdIntro{padding:16px;border:2px solid #c9a35a66;border-radius:16px;background:#0e1420}
.rdIntro h2{margin:0 0 6px;font:700 26px/1.2 'Cormorant Garamond',Georgia,serif;color:#ffe3a0}
.rdIntro p{margin:0 0 10px;font:16px/1.45 system-ui,'Segoe UI',sans-serif;color:#f6ead2}
.rdSmall{font-size:13px!important;color:#c7bda6!important}
@media(max-width:600px){.rdHandCard{min-width:0;flex:1 1 132px}.rdBtn{flex:1 1 140px}}
`;

if (B && !window.EmberRulesDemo) {
  const st = document.createElement('style');
  st.id = 'rdStyles'; st.textContent = CSS; document.head.append(st);
  B.registerView('rulesDemo', render);
  window.EmberRulesDemo = Object.freeze({ open: () => B.go('rulesDemo'), steps: DEMO_STEPS });
  addEventListener('ember:frame', () => { try { addEntry(); } catch (err) { console.warn('rules-demo', err); } });
  try { addEntry(); } catch (err) { console.warn('rules-demo', err); }
}
