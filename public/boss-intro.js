// EMBERLINGS boss introductions (presentation only; battle rules, rewards and the save are untouched).
// A short entrance plays once when a new boss quest battle opens: the arena dims, the boss crest
// appears with its name and a challenge, then the battle controls are ready. Tap, click or press a key
// to skip. Reduced motion shows a still card instead. It never replays on a redraw, a resumed battle,
// a page refresh or a reconnect.
const B = window.EmberBridge;
const SEEN_KEY = 'emberlings-boss-intros-seen'; // separate from the player save; losing it only means an intro may show again
const PLAY_MS = 3400, CALM_MS = 2600;

const BOSSES = {
  10: { art: 'magmarok', region: 'Ember Meadows', line: 'The meadow burns where I walk. Can your Mythlings stand the heat?' },
  25: { art: 'thorn-guardian', region: 'Crystalwood Forest', line: 'No one passes through my forest. Turn back, or be tangled in thorns!' },
  45: { art: 'frostfang', region: 'Frozen Peaks', line: 'These peaks belong to me. Let’s see how your team handles the cold.' },
  70: { art: 'voltitan', region: 'Thunder Valley', line: 'Thunder answers only to me. Show me your spark!' },
  100: { art: 'voidra', region: 'Shadow Realm', line: 'You came all this way… only to fade into the dark.' }
};
const GLOW = { Fire: '#ff8a3a', Nature: '#7fe08a', Ice: '#8fe6ff', Lightning: '#ffe25a', Shadow: '#c48bff' };

const calm = () => !!B?.state?.reducedMotion || document.body.classList.contains('reduceMotion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const session = new Set();
function seen() { try { const v = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }
function wasSeen(id) { return session.has(id) || seen().includes(id); }
function markSeen(id) { session.add(id); try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen().filter(x => x !== id), id].slice(-30))); } catch {} }

let open = null;

// Only a brand-new local boss quest battle qualifies: still in setup, nothing played yet.
export function shouldIntro(saved, match) {
  if (!saved || !match || !saved.id || !BOSSES[saved.level]) return false;
  if (match.phase !== 'setup' || match.revision !== 0 || match.result) return false;
  if (match.sides?.some(s => s.ready || s.choice !== null && s.choice !== undefined)) return false;
  return !wasSeen(saved.id);
}

function close(fast) {
  if (!open) return;
  const { el, timer, keys } = open; open = null;
  clearTimeout(timer); removeEventListener('keydown', keys, true);
  const done = () => { el.remove(); const first = document.querySelector('.cardArena button:not(:disabled)'); first?.focus?.({ preventScroll: true }); };
  if (fast || calm()) return done();
  el.classList.add('biOut'); setTimeout(done, 240);
}

function show(saved) {
  markSeen(saved.id); // mark first so a redraw during the intro can never start a second one
  const level = saved.level, info = BOSSES[level], name = B.bosses[level];
  let e = {}; try { e = B.encounter(level) || {}; } catch {}
  const still = calm(), glow = GLOW[e.element] || '#ffd36a';
  const el = document.createElement('div');
  el.className = 'biIntro' + (still ? ' biStill' : '');
  el.style.setProperty('--bi-glow', glow);
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', `Boss battle: ${name}`);
  el.innerHTML = `<div class="biDim" aria-hidden="true"></div><div class="biStage">
    <div class="biCrest" aria-hidden="true"><img src="/art/bosses/${info.art}.webp" alt="" width="512" height="512" decoding="async"><span hidden>${esc(e.emoji || '👑')}</span></div>
    <p class="biKicker">Boss battle · Level ${level} · ${esc(info.region)}</p>
    <h1 class="biName">${esc(name)}</h1>
    <p class="biLine">“${esc(info.line)}”</p>
    <p class="biMeta">${e.element ? esc(e.element) + ' boss · ' : ''}First to 3 points wins</p>
    <button type="button" class="biSkip">${still ? 'Start battle' : 'Tap to skip'}</button></div>`;
  el.addEventListener('click', ev => { ev.preventDefault(); close(); });
  const keys = ev => { if (['Escape', 'Enter', ' ', 'Spacebar'].includes(ev.key)) { ev.preventDefault(); ev.stopPropagation(); close(); } };
  addEventListener('keydown', keys, true);
  const img = el.querySelector('.biCrest img'); img.onerror = () => { img.remove(); el.querySelector('.biCrest span').hidden = false; };
  document.body.appendChild(el);
  el.querySelector('.biSkip').focus({ preventScroll: true });
  open = { el, keys, id: saved.id, timer: setTimeout(() => close(), still ? CALM_MS : PLAY_MS) };
}

if (B) {
  addEventListener('ember:cardBattle', ev => {
    if (open) return; // redraws while the intro is up never restart it
    const saved = B.state.cardBattle, match = ev.detail?.match;
    if (ev.detail?.side !== 0 || !saved || saved.match !== match) return; // local quest battles only
    if (shouldIntro(saved, match)) show(saved);
  });
  // Leaving the battle screen removes the intro straight away.
  addEventListener('ember:frame', ev => { if (open && ev.detail?.view !== 'cardBattle') close(true); });
  addEventListener('ember:cardResult', () => close(true));
  addEventListener('pagehide', () => close(true));
}
