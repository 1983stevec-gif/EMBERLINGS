// EMBERLINGS first-time tips: a short, friendly pointer the first time a player opens a newer screen or feature.
// One tip at a time and at most one per screen visit. "Got it" closes it; "Don't show tips" turns them all off.
// Never shown before the beginner guide is finished or skipped, during battles or pack openings, or on top of the
// Daily rewards panel, What's New or any other pop-up (it waits until they close). If a tip's target can't be
// found (the layout changed), that tip is skipped silently.
// Presentation only. Save data (additive): state.ember.tips = { seen: { tipId: 1 }, off: false }.
// window.EmberTips = { reset(), off(bool) } (the Settings page can offer "Reset first-time tips").
const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const touch = () => matchMedia('(pointer:coarse)').matches;

/* ---------- The tips. `on` is the screen: a view name, 'cardDetails' (the card details page) or 'menu' (user menu).
   They show in this order, one per visit, so a screen with two tips shows the second one next time. */
const TIPS = [
  { id: 'profileShowcase', on: 'profile', target: '[data-pf="auto"]', title: 'Your showcase', text: 'Show off up to 5 cards on your profile. Auto-pick fills it with your best cards in one tap.' },
  { id: 'profileCustomise', on: 'profile', target: '.pfCustom .pfTabs', title: 'Make it yours', text: 'Use these tabs to change your frame, background, card back, avatar and badges. Achievements unlock more.' },
  { id: 'cardTurn', on: 'cardDetails', target: '#cardDetails .cdStage', title: 'Turn the card', text: () => touch() ? 'Swipe sideways on the card to turn it and see the back. Flick it to spin.' : 'Drag the card to turn it and see the back. Flick it to spin.' },
  { id: 'cardShare', on: 'cardDetails', target: '#cardDetails .shrBtn', title: 'Share a card', text: 'Share card makes a picture of this card that you can save or send to friends.' },
  { id: 'collectionGoals', on: 'collection', target: '.colGoals > h2', title: 'Your closest goals', text: 'These are the sets you are closest to finishing, with hints on where each missing piece comes from.' },
  { id: 'collectionFilters', on: 'collection', target: '.colBar', title: 'Filters', text: 'Narrow the list by element or rarity, or tick "Show missing only" to see what you still need.' },
  { id: 'statsLuck', on: 'stats', target: '.stLuck .stLuckTop', title: 'Luck meter', text: 'This compares your special pulls (shiny, secret, mutation) with the packs\' real odds. Further right means luckier.' },
  { id: 'deckCodes', on: 'decks', target: '.dsBar', title: 'Deck codes', text: 'Share your deck as a code, import a friend\'s code, or try a ready-made deck from Deck ideas.' },
  { id: 'friendsSharing', on: 'friends', target: '#actPanel .actSwitch', title: 'Sharing switch', text: 'When this is on, friends see your big moments, like rare pulls and boss wins. Turn it off any time.' },
  { id: 'friendsCheer', on: 'friends', target: '#actPanel [data-act-cheer]:not([disabled])', title: 'Cheer your friends', text: 'Tap Cheer to celebrate a friend\'s big moment. You can cheer each one once.' },
  { id: 'battleShare', on: 'cardResult', target: '.hlWrap:not(.hlDefeat) .hlShare', title: 'Share your win', text: 'Share highlights makes a picture of the best moments from this battle.' },
  { id: 'fusionPick', on: 'fusion', target: '[data-fusion-id]:not(.picked)', title: 'How fusion works', text: 'Pick two Mythlings, then press Fuse. Both are used up to make a surprise new one. Your Active Mythling is kept safe.' },
  { id: 'mutationBookPages', on: 'mutationBook', target: '.uiMBPager', title: 'Mutation pages', text: 'Each page shows one Mythling and its 12 mutations. Pick a name here to turn to its page.' },
  { id: 'menuEffects', on: 'menu', target: '.uiMenu #uiFxMenu', title: 'Effects and music', text: 'Choose Full, Light or Off for animations here. You can switch the music on or off in this menu too.' },
];
TIPS.forEach(t => { if (t.on === 'fusion') t.views = ['fusion', 'fuse']; });

// Never shown on these screens (battles, pack openings, first-time setup).
const BUSY_VIEW = v => !v || ['cardBattle', 'battle', 'boss', 'tutorial', 'username', 'packs', 'hollow', 'arena'].includes(v) || /^train/.test(v);
// Pop-ups a tip must never stack with; the tip waits until they close.
const BLOCKERS = '#guidedTour, #dailyPanel, #whatsNewPanel, .tradeDone, #tradeAlert, #rareFind, .biIntro, .uiLvUp, .lvlUp, .levelUpModal, #fxMusicHint, .fxStage, .psStage, #pfPicker, .dsOverlay, .uiFAbility:not(.uiLvUp)';

/* ---------- Save data */
function data() {
  const st = B.state; if (!st.ember || typeof st.ember !== 'object') st.ember = {};
  const t = st.ember.tips;
  if (!t || typeof t !== 'object') st.ember.tips = { seen: {}, off: false };
  else { if (!t.seen || typeof t.seen !== 'object') t.seen = {}; if (typeof t.off !== 'boolean') t.off = false; }
  return st.ember.tips;
}
const peek = () => B.state?.ember?.tips;
const isOff = () => !!peek()?.off;
const isSeen = id => !!peek()?.seen?.[id];
const save = () => { try { B.save(); } catch { /* the game shows its own save error */ } };
const ready = () => { const st = B.state; return !!st?.tutorialComplete && !st.guidedTour?.active && !$('#guidedTour'); };
const calm = () => { const lv = window.EmberFx?.level?.(); return lv ? lv === 'off' : (B.state?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches); };

/* ---------- Where we are: an open card details page or user menu counts as its own screen visit. */
const ids = new WeakMap(); let nextId = 1;
const idOf = el => { if (!ids.has(el)) ids.set(el, nextId++); return ids.get(el); };
function context() {
  const v = B.view;
  const cd = $('#cardDetails'); if (cd) return { on: 'cardDetails', key: 'cd' + idOf(cd), busy: BUSY_VIEW(v) && v !== 'packs' };
  const menu = $('.uiMenu'); if (menu) return { on: 'menu', key: 'menu' + idOf(menu), busy: BUSY_VIEW(v) };
  return { on: v, key: 'view:' + v + ':' + viewVisit, busy: BUSY_VIEW(v) };
}
let lastView = null, viewVisit = 0;
const noteView = () => { if (B.view !== lastView) { lastView = B.view; viewVisit++; } };
const used = new Set(); // screen visits that already showed a tip

/* ---------- Finding a target that is really on screen */
function visible(el) {
  if (!el || !el.isConnected) return false;
  const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false;
  const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0;
}
const findTarget = t => $$(t.target).find(visible) || null;
const textOf = t => typeof t.text === 'function' ? t.text() : t.text;

/* ---------- Showing one tip */
let cur = null; // { tip, el, ring, target, key, prevFocus, shownAt }
function onScreen(r) { return r.top >= 8 && r.bottom <= innerHeight - 8 && r.left >= 0 && r.right <= innerWidth; }

function show(tip, target, ctx) {
  injectCSS();
  used.add(ctx.key);
  data().seen[tip.id] = 1; save();
  const el = document.createElement('div');
  el.id = 'emberTip'; el.className = 'etTip'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'false');
  el.setAttribute('aria-labelledby', 'etTitle'); el.setAttribute('aria-describedby', 'etText'); el.dataset.tip = tip.id;
  el.innerHTML = `<span class="etArrow" aria-hidden="true"></span><p class="etKick"><span aria-hidden="true">💡</span> Tip</p><h2 id="etTitle"></h2><p id="etText"></p>
   <div class="etBtns"><button type="button" class="etOk">Got it</button><button type="button" class="etOff">Don't show tips</button></div>`;
  $('#etTitle', el).textContent = tip.title; $('#etText', el).textContent = textOf(tip);
  // Keep the user menu (and other "close when tapping outside" panels) open while using the tip.
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('mousedown', e => e.stopPropagation());
  $('.etOk', el).onclick = () => close(true);
  $('.etOff', el).onclick = () => { data().off = true; save(); close(true); B.toast?.('Tips are off. You can turn them back on in Settings.'); };
  const ring = document.createElement('div'); ring.className = 'etRing'; ring.setAttribute('aria-hidden', 'true');
  if (calm()) { el.classList.add('etCalm'); ring.classList.add('etCalm'); }
  document.body.append(ring, el);
  const prevFocus = document.activeElement;
  cur = { tip, el, ring, target, key: ctx.key, prevFocus, shownAt: Date.now() };
  place();
  requestAnimationFrame(() => el.classList.add('on'));
  // Move focus to "Got it" unless the player is typing somewhere.
  const typing = prevFocus && /^(INPUT|TEXTAREA|SELECT)$/.test(prevFocus.tagName);
  if (!typing) $('.etOk', el).focus({ preventScroll: true });
}

function close(byPlayer) {
  if (!cur) return;
  const { el, ring, prevFocus } = cur; cur = null;
  const hadFocus = el.contains(document.activeElement);
  el.remove(); ring.remove();
  if (hadFocus && prevFocus && prevFocus.isConnected && prevFocus !== document.body) { try { prevFocus.focus({ preventScroll: true }); } catch { /* ignore */ } }
}

// Callout next to the target with an arrow (desktop and tablet); a bottom sheet on phones.
function place() {
  if (!cur) return;
  const { el, ring, target } = cur;
  const r = target.getBoundingClientRect(), pad = 6;
  ring.style.left = r.left - pad + 'px'; ring.style.top = r.top - pad + 'px';
  ring.style.width = r.width + pad * 2 + 'px'; ring.style.height = r.height + pad * 2 + 'px';
  ring.style.display = r.bottom < 0 || r.top > innerHeight ? 'none' : '';
  const phone = innerWidth < 600;
  el.classList.toggle('etSheet', phone);
  el.style.left = el.style.top = el.style.bottom = el.style.right = '';
  el.classList.remove('etBelow', 'etAbove', 'etTop');
  if (phone) {
    // Sit above a fixed bottom tab bar; move to the top if the sheet would cover the target.
    const bar = $$('.uiTabMenu, #app > nav.nav').find(n => { const b = n.getBoundingClientRect(); return b.height > 0 && b.top > innerHeight / 2 && getComputedStyle(n).position === 'fixed'; });
    const bottom = bar ? Math.max(8, Math.round(innerHeight - bar.getBoundingClientRect().top + 8)) : 8;
    el.style.bottom = bottom + 'px';
    const h = el.offsetHeight;
    if (r.bottom + pad > innerHeight - bottom - h - 6 && r.top - pad > h + 20) { el.style.bottom = ''; el.style.top = '8px'; el.classList.add('etTop'); }
    return;
  }
  const w = el.offsetWidth, h = el.offsetHeight, gap = 14, m = 12;
  const below = innerHeight - r.bottom - pad - gap, above = r.top - pad - gap;
  let top, side;
  if (below >= h + m || below >= above) { top = r.bottom + pad + gap; side = 'etBelow'; } else { top = r.top - pad - gap - h; side = 'etAbove'; }
  top = Math.max(m, Math.min(innerHeight - h - m, top));
  const cx = r.left + r.width / 2;
  const left = Math.max(m, Math.min(innerWidth - w - m, cx - w / 2));
  el.style.left = left + 'px'; el.style.top = top + 'px'; el.classList.add(side);
  el.style.setProperty('--ax', Math.max(18, Math.min(w - 18, cx - left)) + 'px');
}

/* ---------- Deciding when to show */
let timer = 0, polls = [];
function blocked(ctx) { return ctx.busy || !!$(BLOCKERS); }

function check() {
  timer = 0;
  if (!B?.state) return;
  noteView();
  const ctx = context();
  if (cur) {
    // Close quietly when the player leaves, the target goes away, or another pop-up appears.
    const gone = !visible(cur.target) || ctx.key !== cur.key;
    if (gone || blocked(ctx)) {
      // Hidden straight away by another pop-up: let it show again another time.
      if (!gone && Date.now() - cur.shownAt < 1500) { const id = cur.tip.id; delete data().seen[id]; used.delete(cur.key); save(); }
      close(false);
    } else place();
    return;
  }
  if (isOff() || !ready() || blocked(ctx) || used.has(ctx.key)) return;
  for (const t of TIPS) {
    if (isSeen(t.id) || !(t.views || [t.on]).includes(ctx.on)) continue;
    const target = findTarget(t); if (!target) continue;
    if (!onScreen(target.getBoundingClientRect())) {
      // Bring the control into view first, then show the tip once scrolling has settled.
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: calm() ? 'auto' : 'smooth' });
      setTimeout(() => { const c = context(); if (!cur && c.key === ctx.key && !blocked(c) && !isOff() && !isSeen(t.id) && visible(target)) show(t, target, c); }, calm() ? 60 : 650);
      used.add(ctx.key);
    } else show(t, target, ctx);
    return;
  }
}
// Wait for the screen to settle, then look a few more times (some controls appear a moment later).
function soon(delay = 900) {
  clearTimeout(timer); timer = setTimeout(check, delay);
  polls.forEach(clearTimeout); polls = [2200, 4200, 7500].map(d => setTimeout(() => { if (!timer) check(); }, d));
}

/* ---------- Styles (injected once) */
function injectCSS() {
  if ($('#emberTipsCss')) return;
  const s = document.createElement('style'); s.id = 'emberTipsCss';
  s.textContent = `
.etTip{position:fixed;z-index:9900;box-sizing:border-box;width:min(320px,calc(100vw - 24px));padding:12px 14px 12px;border:2px solid #e5c27e;border-radius:14px;background:linear-gradient(135deg,#253854,#15243e);color:#eef1ff;box-shadow:0 14px 40px #000a;font:14px/1.4 var(--ui-serif,Georgia,serif);opacity:0;transform:translateY(4px);transition:opacity .18s ease,transform .18s ease}
.etTip.on{opacity:1;transform:none}
.etTip.etCalm{transition:none;transform:none}
.etTip *{box-sizing:border-box}
.etKick{margin:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#ddc68d}
.etTip h2{margin:2px 0 4px;font-size:17px;line-height:1.2;color:#ffe2a0}
.etTip p#etText{margin:0 0 10px;font-size:14px;line-height:1.45}
.etBtns{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.etBtns button{min-height:40px;padding:8px 14px;border-radius:9px;font:inherit;font-size:14px;cursor:pointer}
.etOk{border:1px solid #ffe2a0;background:linear-gradient(#f4cd61,#c99632);color:#231705;font-weight:700}
.etOff{border:1px solid #e5c27e66;background:transparent;color:#d9dcef}
.etBtns button:focus-visible{outline:3px solid #fff;outline-offset:2px}
.etArrow{position:absolute;left:var(--ax,50%);width:16px;height:16px;margin-left:-8px;background:#1f3150;border:2px solid #e5c27e;transform:rotate(45deg);display:none}
.etBelow .etArrow{display:block;top:-9px;border-right:0;border-bottom:0;background:#253854}
.etAbove .etArrow{display:block;bottom:-9px;border-left:0;border-top:0;background:#16253f}
.etSheet{left:8px!important;right:8px;width:auto;max-width:560px;margin:0 auto;border-radius:16px;padding:12px 14px calc(12px + env(safe-area-inset-bottom,0px))}
.etSheet .etBtns button{flex:1 1 auto}
.etRing{position:fixed;z-index:9899;pointer-events:none;box-sizing:border-box;border:3px solid #ffdd7e;border-radius:12px;box-shadow:0 0 0 4px #f4cd6133;animation:etPulse 1.3s ease-in-out 4}
.etRing.etCalm{animation:none}
html[data-fx=light] .etRing{animation-iteration-count:2}
html[data-fx=off] .etRing{animation:none}
@keyframes etPulse{0%,100%{box-shadow:0 0 0 4px #f4cd6133}50%{box-shadow:0 0 0 11px #f4cd6100,0 0 18px 2px #ffdd7e88}}
@media(prefers-reduced-motion:reduce){.etRing{animation:none}.etTip{transition:none;transform:none}}
@media(max-width:380px){.etTip h2{font-size:16px}.etTip p#etText{font-size:13px}}
`;
  document.head.append(s);
}

/* ---------- Wiring */
if (B) {
  // Escape closes the tip first (before the page underneath sees the key).
  addEventListener('keydown', e => { if (e.key === 'Escape' && cur) { e.preventDefault(); e.stopImmediatePropagation(); close(true); } }, true);
  addEventListener('ember:frame', () => { noteView(); soon(); });
  addEventListener('resize', () => { if (cur) place(); });
  addEventListener('scroll', () => { if (cur) requestAnimationFrame(place); }, true);
  // Card details, the user menu and pop-ups are added straight to <body>.
  new MutationObserver(muts => {
    if (muts.some(m => [...m.addedNodes, ...m.removedNodes].some(n => n.nodeType === 1 && !n.classList.contains('etTip') && !n.classList.contains('etRing')))) soon(cur ? 0 : 700);
  }).observe(document.body, { childList: true });
  // Tabs and buttons can redraw a part of the page without a new screen.
  addEventListener('click', () => { if (cur) setTimeout(check, 50); }, true);
  window.EmberTips = Object.freeze({
    reset() { const t = data(); t.seen = {}; t.off = false; save(); used.clear(); close(false); soon(); },
    off(v = true) { const t = data(); t.off = !!v; save(); if (t.off) close(false); else soon(); },
    isOff, ids: TIPS.map(t => t.id),
  });
  soon(1500);
}
