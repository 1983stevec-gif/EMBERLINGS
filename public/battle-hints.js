// EMBERLINGS battle hints: a "Suggested" line on the card battle board that points at a good next move.
// Presentation only. The hint is worked out with the game's own battle logic (chooseAI in card-engine.js) and
// shown as one short sentence plus a soft outline on the matching button. It never plays a move for the player:
// nothing here clicks, sends or changes the match. The game and the turn timers are untouched.
// Save data (additive): state.ember.battleHints = { on: true }. A missing entry means hints are on.
// The pure helper below is exported for tests; recommendedPlay() never changes the match it reads.
import { chooseAI, attacks, abilities, TRAINERS } from './card-engine.js';

const trainerName = c => TRAINERS.find(t => t.id === c?.trainer)?.name || 'Trainer';
const defaultName = c => c?.cardType === 'trainer' ? trainerName(c) : (c?.name || 'Mythling');

// The best next move for one player, as { kind, text, focus } (or null when there is nothing to suggest).
export function recommendedPlay(match, side, nameOf) {
  try {
    if (!match || !Array.isArray(match.sides) || match.sides.length < 2) return null;
    if (match.result) return null;
    if (side !== 0 && side !== 1) return null;
    const p = match.sides[side];
    if (!p || !Array.isArray(p.cards)) return null;
    const name = typeof nameOf === 'function' ? nameOf : defaultName;
    const card = id => id == null ? undefined : p.cards.find(c => c.id === id);
    const label = c => name(c) || 'Mythling';
    const hint = (kind, text, focus = null) => ({ kind, text, focus });
    const a = chooseAI(match, side, 2);
    if (!a || typeof a !== 'object' || !a.type) return null;
    const phase = match.phase;

    if (a.type === 'active' || a.type === 'setup') {
      const c = card(a.cardId); if (!c) return null;
      return hint('active', `Choose ${label(c)} as your Active Mythling`, `[data-active="${a.cardId}"]`);
    }
    if (a.type === 'bench') {
      const c = card(a.cardId); if (!c) return null;
      return phase === 'setup'
        ? hint('bench', `Add ${label(c)} to your Bench`, `[data-bench="${a.cardId}"]`)
        : hint('bench', `Play ${label(c)} to your Bench`, `[data-bench="${a.cardId}"]`);
    }
    if (a.type === 'ready') return hint('ready', 'Press Ready when you are set', '#readyPocket');
    if (a.type === 'select') {
      const c = card(a.cardId); if (!c) return null;
      return hint('select', `Promote ${label(c)}`, null);
    }
    if (a.type === 'evolve') {
      const base = card(a.targetId), evo = card(a.cardId);
      if (!base || !evo) return null;
      return hint('evolve', `Evolve ${label(base)} into ${label(evo)}`, `[data-hand-select="${a.cardId}"]`);
    }
    if (a.type === 'attach') {
      const c = card(a.targetId) || card(p.active); if (!c) return null;
      const type = p.energyZone ? `${p.energyZone} Merfling` : 'Merfling';
      return hint('attach', `Attach your ${type} to ${label(c)}`, '#attachPocketEnergy');
    }
    if (a.type === 'retreat') {
      const c = card(a.targetId); if (!c) return null;
      return hint('retreat', `Retreat and switch to ${label(c)}`, '.retreatPanel');
    }
    if (a.type === 'trainer') {
      const c = card(a.cardId); if (!c) return null;
      const target = card(a.targetId);
      return hint('trainer', `Play ${trainerName(c)}${target ? ` on ${label(target)}` : ''}`, `[data-hand-select="${a.cardId}"]`);
    }
    if (a.type === 'ability') {
      const source = card(a.sourceId); if (!source) return null;
      const ability = abilities(source).find(v => v.id === a.ability)?.name;
      return hint('ability', `Use ${ability || 'your ability'} with ${label(source)}`, null);
    }
    if (a.type === 'stadium') {
      const c = card(a.targetId) || card(p.active); if (!c) return null;
      return hint('stadium', `Use the Stadium to heal ${label(c)}`, '#usePocketStadium');
    }
    if (a.type === 'attack') {
      const active = card(p.active); if (!active) return null;
      const move = attacks(active).find(m => m.id === a.move); if (!move) return null;
      return hint('attack', `Attack with ${move.name}`, `.attackRune[data-card-move="${a.move}"]`);
    }
    if (a.type === 'end') return hint('end', 'End your turn to earn Merfling', '#endPocketTurn');
    return null;
  } catch (err) {
    console.warn('battle-hints', err);
    return null;
  }
}

/* ================================================================== In the game */
const B = typeof window !== 'undefined' ? window.EmberBridge : null;
const $ = (s, r = document) => r.querySelector(s);

// The player's own name for a card where the game knows one (owned cards carry no printed name).
function gameName(c) {
  if (c?.cardType === 'trainer') return trainerName(c);
  return c?.name || B?.species?.[c?.kind]?.name || 'Mythling';
}
const calm = () => {
  try {
    const lv = window.EmberFx?.level?.();
    if (lv) return lv === 'off';
  } catch { /* no effects module yet */ }
  return !!B?.state?.reducedMotion || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
};

/* ---------- Save data (additive; a missing entry means on) */
function ensure() {
  const st = B?.state; if (!st) return;
  if (!st.ember || typeof st.ember !== 'object') st.ember = {};
  const h = st.ember.battleHints;
  if (!h || typeof h !== 'object') st.ember.battleHints = { on: true };
  else if (typeof h.on !== 'boolean') h.on = true;
}
const enabled = () => {
  try { const h = B?.state?.ember?.battleHints; return h?.on !== false; } catch { return true; }
};
function setOn(on) {
  ensure();
  const st = B.state;
  st.ember.battleHints = { ...(st.ember.battleHints && typeof st.ember.battleHints === 'object' ? st.ember.battleHints : {}), on: !!on };
  try { B.save(); } catch (err) { console.warn('battle-hints', err); }
  paint();
}

/* ---------- The hint line on the board */
let match = null, side = 0, chip = null, glowEl = null, lastSig = '';
// The hint only appears at the player's own decision moment.
function decideable() {
  if (!match || match.result || !Array.isArray(match.sides)) return false;
  const p = match.sides[side]; if (!p) return false;
  return (match.phase === 'setup' && !p.ready) || (match.phase === 'replace' && match.replacement === side) || (match.phase === 'turn' && match.turn === side);
}
function clearHint() {
  try { if (glowEl && glowEl.isConnected) { glowEl.classList.remove('bhGlow'); glowEl.classList.remove('bhStill'); } } catch { /* gone */ }
  glowEl = null; chip = null; lastSig = '';
  $('#bhHint')?.remove();
}
function paint() {
  try {
    if (!decideable() || !enabled()) return clearHint();
    const hint = recommendedPlay(match, side, gameName);
    const panel = $('.attackPanel');
    if (!hint || !panel) return clearHint();
    const target = hint.focus ? $(hint.focus) : null;
    const sig = [match.revision, match.phase, hint.kind, hint.focus || ''].join('|');
    if (sig === lastSig && chip?.isConnected && (!target || target.classList.contains('bhGlow'))) return;
    lastSig = sig;
    if (!chip || !chip.isConnected || chip.parentElement !== panel) {
      chip = document.createElement('div');
      chip.id = 'bhHint'; chip.className = 'bhChip';
      chip.setAttribute('role', 'status'); chip.setAttribute('aria-live', 'polite');
      if (panel.firstChild) panel.insertBefore(chip, panel.firstChild); else panel.append(chip);
    }
    const text = `💡 Suggested: ${hint.text}`;
    if (chip.textContent !== text) chip.textContent = text;
    // A soft outline on the button the hint points at. Only one button wears it, and a disabled one gets none.
    if (glowEl && glowEl !== target) { glowEl.classList.remove('bhGlow'); glowEl.classList.remove('bhStill'); }
    glowEl = target && !target.disabled ? target : null;
    if (glowEl) {
      glowEl.classList.add('bhGlow');
      // Effects Off or reduced motion: a still outline instead of the gentle pulse.
      glowEl.classList.toggle('bhStill', calm());
    }
  } catch (err) { console.warn('battle-hints', err); }
}

/* ---------- Settings section (one switch) */
const sw = (id, label, on, sub) => `<div class="setRow"><div class="setRowText"><span class="setLabel" id="${id}Lbl">${label}</span><small class="setSub" id="${id}Sub">${sub}</small></div>
  <button type="button" class="setSwitch" id="${id}" role="switch" aria-checked="${on}" aria-labelledby="${id}Lbl" aria-describedby="${id}Sub"><span>${on ? 'On' : 'Off'}</span></button></div>`;
function sectionHTML() {
  return sw('bhHints', 'Suggested play in battles', enabled(), 'A friendly hint on the battle board that points at a good next move. It never plays for you.');
}
function bind(el) {
  el.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.id !== 'bhHints') return;
    setOn(!enabled());
    const btn = $('#bhHints', el);
    if (btn) { const on = enabled(); btn.setAttribute('aria-checked', String(on)); $('span', btn).textContent = on ? 'On' : 'Off'; }
  });
}
let hub = false;
function hookSettings() {
  if (hub || !window.EmberSettings?.addSection) return;
  hub = window.EmberSettings.addSection({ id: 'hints', icon: '💡', title: 'Battle hints', order: 4, html: sectionHTML, bind }) !== false;
}

/* ---------- Styles */
const CSS = `
/* Battle hints (public/battle-hints.js) */
.bhChip{display:block;box-sizing:border-box;margin:0 0 6px;padding:5px 8px;border:1px solid #e9b75a66;border-radius:8px;background:#0e1420;color:#f6ead2;font:600 12px/1.35 system-ui,'Segoe UI',sans-serif;text-align:left;overflow-wrap:anywhere}
.uiXBattle .attackPanel .bhChip,.uiXBattleTab .attackPanel .bhChip{margin:0 0 4px;padding:4px 6px;font-size:11px;line-height:1.3}
.bhGlow{outline:2px solid #e9b75a;outline-offset:2px;animation:bhGlow 1.7s ease-in-out infinite}
@keyframes bhGlow{50%{outline-color:#ffe9b0;box-shadow:0 0 0 3px #e9b75a55}}
html[data-fx=off] .bhGlow,.bhGlow.bhStill{animation:none;box-shadow:none;outline-color:#e9b75a}
@media (prefers-reduced-motion:reduce){.bhGlow{animation:none;box-shadow:none;outline-color:#e9b75a}}
`;

/* ---------- Start */
if (B && !window.EmberBattleHints) {
  try {
    const st = document.createElement('style'); st.id = 'bhStyles'; st.textContent = CSS; document.head.append(st);
    ensure();
    window.EmberBattleHints = Object.freeze({
      on: () => enabled(),
      set: on => { try { setOn(!!on); } catch (err) { console.warn('battle-hints', err); } },
      calm
    });
    addEventListener('ember:cardBattle', e => {
      try {
        const d = e.detail;
        if (!d?.match?.sides) return;
        match = d.match; side = d.side === 1 ? 1 : 0;
        paint();
      } catch (err) { console.warn('battle-hints', err); }
    });
    addEventListener('ember:frame', e => {
      try {
        const v = e.detail?.view ?? B.view;
        if (v === 'cardBattle') paint();
        else { match = null; side = 0; clearHint(); }
        hookSettings();
      } catch (err) { console.warn('battle-hints', err); }
    });
    hookSettings(); setTimeout(hookSettings, 0);
  } catch (err) { console.warn('battle-hints', err); }
}
