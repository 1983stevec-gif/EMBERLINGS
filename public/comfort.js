// EMBERLINGS Comfort settings (presentation only: rules, rewards, timers and the AI are untouched).
// One "Comfort" block on the Settings page with five options, saved additively as state.ember.comfort:
//   haptics  false | true            short vibrations on hits, knockouts, rare cards and rewards (phones that support it)
//   speed    'normal'|'fast'|'vfast' battle attack effects and lunges play quicker (window.EmberComfort.animScale)
//   confirm  0 | 1000 | 5000 | 20000 ask "Spend N coins?" before a pack, mutation, Vault slot or shop buy of that much or more
//   quiet    { on, from, to }        quiet hours: no sounds or music and no pop-ups that open by themselves (the bell still counts)
//   lefty    false | true            left-handed battle layout on phones and tablets (hand arrows on the left)
// A missing field means the default, so old saves load unchanged. Other modules ask window.EmberComfort:
//   quiet() (sounds, music, Daily / What's New / tips auto-open), animScale() (fx-battle.js, battle-fx.js).
// The pure helpers below are exported for tests/comfort.mjs.

export const SPEEDS = { normal: 1, fast: 0.6, vfast: 0.35 };
export const SPEED_LABELS = [['normal', 'Normal'], ['fast', 'Fast'], ['vfast', 'Very fast']];
export const CONFIRM_STEPS = [0, 1000, 5000, 20000];
export const DEFAULTS = Object.freeze({ haptics: false, speed: 'normal', confirm: 0, quiet: Object.freeze({ on: false, from: '22:00', to: '07:00' }), lefty: false });

// "HH:MM" (24-hour) -> minutes after midnight, or null when it isn't a time.
export function parseTime(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s ?? '').trim());
  if (!m) return null;
  const h = +m[1], min = +m[2];
  return h < 24 && min < 60 ? h * 60 + min : null;
}
const minutesOf = now => typeof now === 'number' ? ((Math.floor(now) % 1440) + 1440) % 1440 : now.getHours() * 60 + now.getMinutes();
// Is `now` (a Date, or minutes after midnight) inside from..to? `to` is not included. A range whose end is
// earlier than its start runs over midnight (22:00-07:00). The same time twice, or a bad time, means no quiet hours.
export function inQuietHours(now, from, to) {
  const f = parseTime(from), t = parseTime(to);
  if (f === null || t === null || f === t) return false;
  const m = minutesOf(now);
  return f < t ? m >= f && m < t : m >= f || m < t;
}
// Minutes until the quiet state next flips (so a timer can wake exactly then); null when it never flips.
export function minutesToChange(now, from, to) {
  const f = parseTime(from), t = parseTime(to);
  if (f === null || t === null || f === t) return null;
  const m = minutesOf(now), next = inQuietHours(m, from, to) ? t : f;
  return ((next - m) + 1440) % 1440 || 1440;
}
// The player's comfort options with defaults filled in (never changes the state it reads).
export function comfortOf(state) {
  const c = state?.ember?.comfort, q = c?.quiet;
  return {
    haptics: c?.haptics === true,
    speed: Object.hasOwn(SPEEDS, c?.speed) ? c.speed : 'normal',
    confirm: CONFIRM_STEPS.includes(c?.confirm) ? c.confirm : 0,
    quiet: { on: q?.on === true, from: parseTime(q?.from) === null ? DEFAULTS.quiet.from : q.from, to: parseTime(q?.to) === null ? DEFAULTS.quiet.to : q.to },
    lefty: c?.lefty === true
  };
}
export const needsConfirm = (cost, threshold) => threshold > 0 && Number(cost) >= threshold;
export const animScaleOf = speed => SPEEDS[speed] || 1;

/* ================================================================== In the game */
const B = typeof window !== 'undefined' ? window.EmberBridge : null;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = n => Math.floor(Number(n) || 0).toLocaleString('en-GB');
const opts = () => comfortOf(B.state);
function set(patch) {
  const st = B.state; if (!st.ember || typeof st.ember !== 'object') st.ember = {};
  const cur = opts();
  st.ember.comfort = { ...(st.ember.comfort && typeof st.ember.comfort === 'object' ? st.ember.comfort : {}), ...cur, ...patch, quiet: { ...cur.quiet, ...(patch.quiet || {}) } };
  try { B.save(); } catch (e) { console.warn('comfort', e); }
  apply();
}
const reducedMotion = () => !!B.state.reducedMotion || document.documentElement.dataset.fx === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches;
const quietNow = () => { const q = opts().quiet; return q.on && inQuietHours(new Date(), q.from, q.to); };
const touchy = () => matchMedia('(pointer: coarse)').matches || innerWidth < 1000;

/* ------------------------------------------------------------ Apply: speed, left hand, quiet state */
let wasQuiet = null, quietTimer = 0;
function apply() {
  const o = opts(), root = document.documentElement;
  if (o.speed === 'normal') { delete root.dataset.animSpeed; root.style.removeProperty('--cmf-anim'); }
  else { root.dataset.animSpeed = o.speed; root.style.setProperty('--cmf-anim', String(animScaleOf(o.speed))); }
  const lefty = o.lefty && touchy();
  if ((root.dataset.lefty === 'on') !== lefty) { if (lefty) root.dataset.lefty = 'on'; else delete root.dataset.lefty; $('.handRow')?.dispatchEvent(new Event('scroll')); }
  checkQuiet();
}
function checkQuiet() {
  clearTimeout(quietTimer);
  const q = opts().quiet, now = quietNow();
  if (now !== wasQuiet) {
    const first = wasQuiet === null; wasQuiet = now;
    document.documentElement.toggleAttribute('data-quiet', now);
    if (!first || now) dispatchEvent(new CustomEvent('ember:quiet', { detail: { quiet: now } }));
  }
  // Wake at the next change (and at least every 10 minutes, in case the clock moves).
  const d = q.on ? minutesToChange(new Date(), q.from, q.to) : null;
  if (d !== null) quietTimer = setTimeout(checkQuiet, Math.min(d * 60 - new Date().getSeconds() + 1, 600) * 1000);
}

/* ------------------------------------------------------------ Haptics */
let lastBuzz = 0;
function buzz(pattern, important = false) {
  if (!opts().haptics || typeof navigator.vibrate !== 'function' || reducedMotion() || quietNow() || document.hidden) return false;
  const t = performance.now(); if (!important && t - lastBuzz < 250) return false; lastBuzz = t;
  try { return navigator.vibrate(pattern); } catch { return false; }
}
const PULSE = { hit: 18, bigHit: [28, 40, 28], ko: [40, 60, 90], rare: [20, 50, 20, 50, 70], reward: [25, 45, 25] };
let battleSig = '', lastAtk = '', lastPts = null;
function onBattle(d) {
  const m = d?.match; if (!m?.sides) return;
  const sig = m.sides.map(s => s.name).join('|'), pts = m.sides.map(s => s.points || 0);
  const la = m.lastAttack, key = la ? [la.side, la.move, la.damage, la.at].join(':') : '';
  if (sig !== battleSig) { battleSig = sig; lastAtk = key; lastPts = pts; return; } // a new battle (or a reload): nothing has happened yet
  const ko = lastPts && pts.some((p, i) => p > lastPts[i]);
  if (ko) buzz(PULSE.ko, true);
  else if (key && key !== lastAtk && la.damage > 0) buzz(la.damage >= 60 ? PULSE.bigHit : PULSE.hit);
  lastAtk = key; lastPts = pts;
}
function onReveal(c) {
  if (!c) return;
  if ((B.rarityRank?.(c) ?? 0) >= 4 || c.shiny || c.secret || c.mutation) buzz(PULSE.rare, true);
}

/* ------------------------------------------------------------ Confirm before spending */
// Each coin spend the game offers, how to read its price, and whether this click really spends.
const SPENDS = [
  { sel: '#confirmPack', what: () => { const name = ($('#app .hero h1') || $('#app h1'))?.textContent.trim(); const p = (B.packCatalog?.() || []).find(x => x.name === name); return { cost: p ? p.cost : priceIn($('#app h2')), label: `open ${name || 'this pack'}` }; } },
  { sel: '#mutate', what: () => {
    // Replacing a trait already asks "Spend N coins?" in the game itself, so only a first mutation is checked here.
    const pet = $('[data-mutate-pet].mutationSelected, [data-mutate-pet].sel'), owned = id => id && B.state.owned.find(x => x.id === id);
    const c = owned(pet?.dataset.mutatePet) || owned(mutPet) || B.active?.();
    const opt = $('[data-mutation][aria-pressed="true"]'), m = B.MUTATIONS.find(x => x.id === opt?.dataset.mutation);
    if (!c || !m || c.mutation) return null;
    return { cost: m.cost, label: `give ${B.species[c.kind]?.name || 'this Mythling'} the ${m.name} mutation` };
  } },
  { sel: '[data-unlock]', what: b => ({ cost: priceIn(b.closest('.vaultSlot, .lockedSlot, section, article')) ?? [0, 2500, 10000, 35000, 100000][+b.dataset.unlock], label: `unlock Vault slot ${+b.dataset.unlock + 1}` }) },
  { sel: '[data-shop-item]', what: b => /purchase/i.test(b.textContent) ? { cost: priceIn(b.closest('section')?.querySelector('strong')) ?? priceIn(b.closest('section')), label: `buy ${b.closest('section')?.querySelector('h2')?.textContent.trim() || 'this item'}` } : null }
];
function priceIn(el) { const m = /([\d,.]+)\s*(?:<small>)?\s*coins/i.exec(el?.textContent || '') || /🪙\s*([\d,.]+)/.exec(el?.textContent || ''); return m ? +m[1].replace(/[,.]/g, '') : null; }
let passThrough = null, mutPet = null; // mutPet: the Mythling last picked on the Mutation Vault page (its button may be on another page of the chooser)
function onSpendClick(e) {
  const pick = e.target instanceof Element && e.target.closest('[data-mutate-pet]'); if (pick) mutPet = pick.dataset.mutatePet;
  const limit = opts().confirm; if (!limit) return;
  const t = e.target instanceof Element ? e.target : null; if (!t) return;
  for (const s of SPENDS) {
    const b = t.closest(s.sel); if (!b || b.disabled) continue;
    if (passThrough === b) { passThrough = null; return; } // the player said Buy: let the game's own handler run as usual
    let info = null; try { info = s.what(b); } catch (err) { console.warn('comfort', err); }
    if (!info || !needsConfirm(info.cost, limit)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    ask(info).then(ok => { if (ok && b.isConnected && !b.disabled) { passThrough = b; b.click(); passThrough = null; } });
    return;
  }
}
function ask({ cost, label }) {
  $('#cmfDlg')?.remove();
  return new Promise(resolve => {
    const prev = document.activeElement, wrap = document.createElement('div'); wrap.id = 'cmfDlg';
    const have = B.state.coins || 0;
    wrap.innerHTML = `<div class="cmfBox" role="alertdialog" aria-modal="true" aria-labelledby="cmfT" aria-describedby="cmfP">
      <h2 id="cmfT"><span aria-hidden="true">🪙</span> Spend ${fmt(cost)} coins?</h2>
      <p id="cmfP">This will ${label.replace(/[&<>"']/g, '')}. You have ${fmt(have)} coins; ${fmt(Math.max(0, have - cost))} will be left.</p>
      <div class="cmfBtns"><button type="button" class="cmfBtn" data-cmf="no">Cancel</button><button type="button" class="cmfBtn gold" data-cmf="yes">Buy</button></div>
      <p class="cmfNote">You asked to check spends of ${fmt(opts().confirm)} coins or more. Change it in Settings › Comfort.</p></div>`;
    document.body.append(wrap);
    const done = ok => { if (!wrap.isConnected) return; wrap.remove(); removeEventListener('keydown', key, true); try { prev?.focus?.({ preventScroll: true }); } catch { /* gone */ } resolve(ok); };
    const key = e => {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); done(false); }
      else if (e.key === 'Tab') { const bs = $$('.cmfBtn', wrap), i = bs.indexOf(document.activeElement); e.preventDefault(); bs[(i + (e.shiftKey ? bs.length - 1 : 1)) % bs.length].focus(); }
    };
    addEventListener('keydown', key, true);
    wrap.addEventListener('click', e => { const b = e.target.closest('[data-cmf]'); if (b) done(b.dataset.cmf === 'yes'); else if (e.target === wrap) done(false); });
    $('[data-cmf="yes"]', wrap).focus();
  });
}

/* ------------------------------------------------------------ Settings section */
const radios = (name, legend, list, cur, help) => `<fieldset class="setRadios"><legend>${legend}</legend><div class="setSeg">${list.map(([v, t]) => `<label><input type="radio" name="${name}" value="${v}" ${String(v) === String(cur) ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>${help ? `<p class="setHelp">${help}</p>` : ''}</fieldset>`;
const sw = (id, label, on, sub) => `<div class="setRow"><div class="setRowText"><span class="setLabel" id="${id}Lbl">${label}</span><small class="setSub" id="${id}Sub">${sub}</small></div>
  <button type="button" class="setSwitch" id="${id}" role="switch" aria-checked="${on}" aria-labelledby="${id}Lbl" aria-describedby="${id}Sub"><span>${on ? 'On' : 'Off'}</span></button></div>`;
function quietLine() {
  const q = opts().quiet;
  if (!q.on) return 'Off. No sounds, music or pop-ups that open by themselves during the hours you choose.';
  if (parseTime(q.from) === parseTime(q.to)) return 'Choose two different times.';
  return quietNow() ? `Quiet now, until ${q.to}. The bell still counts new things.` : `From ${q.from} to ${q.to} every day. The bell still counts new things.`;
}
function sectionHTML() {
  const o = opts(), canBuzz = typeof navigator.vibrate === 'function';
  return `${sw('cmfHaptics', 'Haptics', o.haptics, canBuzz ? 'Short buzzes on hits, knockouts, rare cards and rewards. Not with Effects Off or during quiet hours.' : 'Short buzzes on hits, knockouts, rare cards and rewards. This device or browser cannot vibrate.')}
  ${radios('cmfSpeed', 'Battle animation speed', SPEED_LABELS, o.speed, 'Attack effects and lunges only. Turn timers and the opponent\'s moves keep their usual pace.')}
  ${radios('cmfConfirm', 'Ask before spending', CONFIRM_STEPS.map(v => [v, v ? fmt(v) : 'Off']), o.confirm, o.confirm ? `Asks "Spend…?" before packs, mutations, Vault slots and shop items costing ${fmt(o.confirm)} coins or more.` : 'Pick an amount to be asked before bigger spends.')}
  ${sw('cmfQuiet', 'Quiet hours', o.quiet.on, quietLine())}
  <div class="cmfTimes" ${o.quiet.on ? '' : 'hidden'}><label><span>From</span><input type="time" id="cmfFrom" value="${o.quiet.from}" required></label><label><span>To</span><input type="time" id="cmfTo" value="${o.quiet.to}" required></label></div>
  ${sw('cmfLefty', 'Left-handed battle layout', o.lefty, 'Phones and tablets: both arrows that scroll your hand sit together on the left, near your thumb.')}`;
}
function bind(el) {
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const o = opts();
    if (b.id === 'cmfHaptics') { set({ haptics: !o.haptics }); if (!o.haptics) buzz(PULSE.reward, true); }
    else if (b.id === 'cmfQuiet') set({ quiet: { on: !o.quiet.on } });
    else if (b.id === 'cmfLefty') set({ lefty: !o.lefty });
    else return;
    repaint(el);
  });
  el.addEventListener('change', e => {
    const t = e.target;
    if (t.name === 'cmfSpeed') set({ speed: t.value });
    else if (t.name === 'cmfConfirm') set({ confirm: +t.value });
    else if (t.id === 'cmfFrom' || t.id === 'cmfTo') { if (parseTime(t.value) === null) return; set({ quiet: { [t.id === 'cmfFrom' ? 'from' : 'to']: t.value } }); }
    else return;
    repaint(el);
  });
}
function repaint(el) {
  const o = opts();
  for (const [id, on] of [['cmfHaptics', o.haptics], ['cmfQuiet', o.quiet.on], ['cmfLefty', o.lefty]]) { const b = $('#' + id, el); if (b) { b.setAttribute('aria-checked', String(on)); $('span', b).textContent = on ? 'On' : 'Off'; } }
  const sub = $('#cmfQuietSub', el); if (sub) sub.textContent = quietLine();
  const times = $('.cmfTimes', el); if (times) times.hidden = !o.quiet.on;
  const help = $('input[name="cmfConfirm"]', el)?.closest('fieldset')?.querySelector('.setHelp');
  if (help) help.textContent = o.confirm ? `Asks "Spend…?" before packs, mutations, Vault slots and shop items costing ${fmt(o.confirm)} coins or more.` : 'Pick an amount to be asked before bigger spends.';
}
let hub = false;
function hookSettings() {
  if (hub || !window.EmberSettings?.addSection) return;
  hub = window.EmberSettings.addSection({ id: 'comfort', icon: '🛋', title: 'Comfort', order: 3, html: sectionHTML, bind }) !== false;
}

/* ------------------------------------------------------------ Styles */
const CSS = `
/* Comfort settings (public/comfort.js) */
#set-comfort .cmfTimes{display:flex;flex-wrap:wrap;gap:10px 16px;padding:0 0 10px}
#set-comfort .cmfTimes[hidden]{display:none}
#set-comfort .cmfTimes label{display:flex;align-items:center;gap:8px;font:700 15px system-ui,sans-serif;color:#e9dcc0}
#set-comfort .cmfTimes input{min-height:44px;min-width:120px;padding:6px 10px;border-radius:8px;border:1px solid #e9b75a88;background:#161d29;color:#f6ead2;font:600 16px system-ui,sans-serif;color-scheme:dark}
#set-comfort .cmfTimes input:focus-visible{outline:3px solid #ffd27a;outline-offset:2px}
#cmfDlg{position:fixed;inset:0;z-index:10050;display:grid;place-items:center;padding:16px;background:#05070cb8}
#cmfDlg .cmfBox{width:min(440px,100%);max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;padding:20px 20px 16px;border:1px solid #e9b75a;border-radius:14px;background:linear-gradient(180deg,#1a2130,#0f141c);box-shadow:0 18px 50px #000c;color:#efe6d2;font:16px/1.45 system-ui,sans-serif}
#cmfDlg h2{margin:0 0 8px;font:700 26px 'Cormorant Garamond',Georgia,serif;color:#ffe2a0}
#cmfDlg p{margin:0 0 12px;overflow-wrap:anywhere}
#cmfDlg .cmfNote{margin:12px 0 0;font-size:13px;color:#b9ae98}
#cmfDlg .cmfBtns{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
#cmfDlg .cmfBtn{min-height:44px;min-width:110px;padding:8px 18px;border-radius:10px;border:1px solid #c9a35a;background:#1b2234;color:#ffe29a;font:700 16px system-ui,sans-serif;cursor:pointer}
#cmfDlg .cmfBtn.gold{background:linear-gradient(180deg,#ffe29a,#e8ae45);color:#2a1606;border-color:#fff1c2}
#cmfDlg .cmfBtn:focus-visible{outline:3px solid #ffd27a;outline-offset:2px}
html:not([data-fx=off]) #cmfDlg .cmfBox{animation:cmfIn .18s ease-out}
@keyframes cmfIn{from{opacity:0;transform:translateY(8px) scale(.98)}}
@media (prefers-reduced-motion: reduce){#cmfDlg .cmfBox{animation:none!important}}
/* Battle animation speed: the CSS-driven parts of the attack effects (fx-battle.js, battle-fx.js lunge) */
html[data-anim-speed] .bxLunge,html[data-anim-speed] .bxLungeL{animation-duration:calc(.55s * var(--cmf-anim,1))}
html[data-anim-speed] .fxbVines path{animation-duration:calc(.55s * var(--cmf-anim,1))}
html[data-anim-speed] .fxbVines path:nth-child(2){animation-delay:calc(.08s * var(--cmf-anim,1))}
html[data-anim-speed] .fxbVines path:nth-child(3){animation-delay:calc(.16s * var(--cmf-anim,1))}
html[data-anim-speed] .fxbGust path{animation-duration:calc(.8s * var(--cmf-anim,1))}
/* Left-handed battle layout (phones and tablets only; set on <html data-lefty>): hand arrows together on the left */
html[data-lefty=on] .bxHandNav.next{transform:translate(0,-50%)}
html[data-lefty=on] .pocketHand:has(.bxHandNav:not([hidden])) .handRow{-webkit-mask-image:linear-gradient(90deg,#0003,#000 22%);mask-image:linear-gradient(90deg,#0003,#000 22%)}
`;

/* ------------------------------------------------------------ Start */
if (B && !window.EmberComfort) {
  const st = document.createElement('style'); st.id = 'comfort-css'; st.textContent = CSS; document.head.append(st);
  window.EmberComfort = Object.freeze({
    options: opts, set, quiet: () => { try { return quietNow(); } catch { return false; } },
    animScale: () => { try { return animScaleOf(opts().speed); } catch { return 1; } },
    buzz: kind => buzz(PULSE[kind] || PULSE.hit, true)
  });
  apply();
  addEventListener('click', onSpendClick, true);
  addEventListener('ember:cardBattle', e => { try { onBattle(e.detail); } catch (err) { console.warn('comfort', err); } });
  addEventListener('ember:packReveal', e => { try { onReveal(e.detail?.creature); } catch (err) { console.warn('comfort', err); } });
  addEventListener('ember:coins', e => { if ((e.detail?.amount || 0) > 0) buzz(PULSE.reward, true); });
  addEventListener('ember:levelUp', () => buzz(PULSE.reward, true));
  addEventListener('ember:cardResult', e => { battleSig = ''; if (e.detail?.victory) buzz(PULSE.reward, true); });
  addEventListener('ember:frame', e => { if ((e.detail?.view ?? B.view) !== 'mutation') mutPet = null; hookSettings(); apply(); });
  addEventListener('resize', apply);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkQuiet(); });
  hookSettings(); setTimeout(hookSettings, 0);
}
