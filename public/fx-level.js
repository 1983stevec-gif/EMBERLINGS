// EMBERLINGS "Effects" setting: Full / Light / Off. Presentation only.
// The player's choice is saved additively as state.ember.fx ('full' | 'light'); a missing value means 'full'.
// 'Off' is the existing state.reducedMotion flag, so older effect modules that already check it follow along.
// The device "reduce motion" setting always wins and counts as Off.
// The current level is mirrored on <html data-fx="full|light|off"> so CSS can hook into it.
export const FX_LEVELS = ['full', 'light', 'off'];
export const FX_LABELS = { full: 'Full', light: 'Light', off: 'Off' };

// What the player picked (ignores the device setting).
export function fxChoice(state) {
  if (state?.reducedMotion) return 'off';
  return state?.ember?.fx === 'light' ? 'light' : 'full';
}
// What actually plays.
export function fxLevelOf(state, deviceReduced = false) { return deviceReduced ? 'off' : fxChoice(state); }
// Stores a choice on a state object without touching anything else.
export function applyFxChoice(state, level) {
  const v = FX_LEVELS.includes(level) ? level : 'full';
  if (!state.ember || typeof state.ember !== 'object') state.ember = {};
  state.ember.fx = v;
  state.reducedMotion = v === 'off';
  return v;
}
export const nextFx = level => FX_LEVELS[(FX_LEVELS.indexOf(level) + 1) % FX_LEVELS.length];

/* ---------------------------------------------------------------- Browser side */
const hasWindow = typeof window !== 'undefined';
const motionQuery = hasWindow && typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const B = hasWindow ? window.EmberBridge : null;
export const deviceReduced = () => !!motionQuery?.matches;
export const fxLevel = () => fxLevelOf(B?.state, deviceReduced());
export const fxCalm = () => fxLevel() === 'off';
export const fxLight = () => fxLevel() === 'light';
// Keep roughly one in three of a batch of decorative particles on Light.
export const fxCount = n => fxLight() ? Math.max(1, Math.round(n / 3)) : n;

export function fxApply() {
  if (typeof document === 'undefined') return;
  const lv = fxLevel(), root = document.documentElement;
  if (root.dataset.fx !== lv) root.dataset.fx = lv;
  document.body?.classList.toggle('reduceMotion', !!B?.state?.reducedMotion);
}
export function fxSet(level) {
  if (!B?.state) return 'full';
  const v = applyFxChoice(B.state, level);
  try { B.save(); } catch { /* ignore */ }
  fxApply();
  dispatchEvent(new CustomEvent('ember:fxLevel', { detail: { choice: v, level: fxLevel() } }));
  return v;
}

if (hasWindow && B && !window.EmberFx) {
  window.EmberFx = Object.freeze({ levels: FX_LEVELS, labels: FX_LABELS, level: fxLevel, choice: () => fxChoice(B.state), set: fxSet, apply: fxApply, next: nextFx });
  fxApply();
  motionQuery?.addEventListener?.('change', fxApply);
  addEventListener('ember:frame', fxApply);
}
