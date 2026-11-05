// "What's new in EMBERLINGS": a friendly panel that shows once to returning players after an update,
// and can be opened any time from the user menu. Presentation only: no gameplay or rewards change.
// The only save data is state.ember.seenRelease (the id of the newest release the player has seen),
// added when missing. The save key is unchanged.
const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

/* ---------- Release notes (newest first)
 * HOW TO ADD A NEW RELEASE: copy the first entry below, paste it ABOVE it, and change:
 *   id     a new unique id (any text; the date works well). A new id is what makes the panel show once.
 *   date   shown to players, e.g. '18 November 2026'
 *   title  one short headline
 *   items  3 to 6 bullets: { icon: '🎁', text: 'Plain, friendly sentence.' }
 *          Optional "Show me" button on a bullet:
 *            go: 'packs'      opens that screen (any EmberBridge view: home, packs, inventory, map, friends,
 *                             trading, decks, rules, training, vault, fusion, mutation, achievements, index...)
 *            daily: true      opens the Daily rewards panel instead
 *            show: 'Open packs'  optional button text (defaults to "Show me")
 * Only the newest entry pops up by itself; older entries stay readable under "Earlier updates".
 */
export const RELEASES = [
  {
    id: '2026-11-big-update',
    date: 'November 2026',
    title: 'Profiles, card details, deck codes and a lot more sparkle',
    items: [
      { icon: '👤', text: 'Your own profile: show off your best 5 cards and pick frames, backgrounds and badges you have earned. Friends can open it from their Friends list.', go: 'profile', show: 'My Profile' },
      { icon: '🔍', text: 'Tap any card in My Binder for a big card you can spin, with every stat, where it came from and how many you own.', go: 'inventory', show: 'My Binder' },
      { icon: '📊', text: 'A new Collection page shows how complete your collection is and which goals are closest.', go: 'collection', show: 'Collection' },
      { icon: '🧩', text: 'Share a deck with a short code, import a friend\'s deck, or try one of the Deck ideas.', go: 'decks', show: 'Battle Deck' },
      { icon: '🏆', text: 'Battle highlights after every win, and share any card or lucky pack as a picture.' },
      { icon: '🎉', text: 'Friend activity: see your friends\' rare pulls, boss wins and big level-ups, and cheer them on.', go: 'friends', show: 'Friends' },
      { icon: '🃏', text: 'Earn card backs, avatar rings and avatars from your achievements, and check your luck and records on the new My Stats page.', go: 'stats', show: 'My Stats' },
      { icon: '🎁', text: 'Daily rewards, boss entrances with new boss art, trade alerts and rare-find banners.', daily: true, show: 'Open Daily' },
      { icon: '✨', text: 'New animations, sounds and optional background music (turn it on in the menu). Choose Effects: Full, Light or Off, and find text size and element symbols under Accessibility, both in the menu.' },
      { icon: '👀', text: 'See which friends are online, when they were last seen, and watch a friend\'s live duel.', go: 'friends', show: 'Friends' },
      { icon: '🔔', text: 'A new bell gathers trade invites, friend requests, cheers and daily rewards in one place, and a new Settings page keeps every option together.', go: 'settings', show: 'Settings' },
      { icon: '🖼', text: 'A full-screen art gallery with a short story for every Mythling, plus ★ favourite cards, saved binder views and collection export.', go: 'index', show: 'Mythling Index' },
      { icon: '🍂', text: 'Seasonal decorations change through the year, and short first-time tips explain each new screen.' },
      { icon: '📱', text: 'Install EMBERLINGS as an app, faster loading, and screens that fit phones and tablets better.' }
    ]
  }
];
export const LATEST = RELEASES[0]?.id;

/* ---------- Save helpers */
const ext = () => { const st = B.state; if (!st.ember || typeof st.ember !== 'object') st.ember = {}; return st.ember; };
const calm = () => !!B?.state?.reducedMotion || document.documentElement.dataset.fx === 'off' || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
function markSeen() { const e = ext(); if (e.seenRelease !== LATEST) { e.seenRelease = LATEST; B.save(); } }
// A brand-new player (no save in this browser before this visit, or still in the first-time tutorial) gets the
// beginner guide instead, so we quietly mark the latest release as seen for them.
function isReturning() {
  const st = B.state, hadSave = window.EmberBoot?.hadSave;
  return hadSave !== false && !!st.tutorialComplete && !st.guidedTour?.active;
}

/* ---------- Styles (injected once; kept here so theme.css is untouched) */
function styles() {
  if ($('#wnStyle')) return;
  const s = document.createElement('style'); s.id = 'wnStyle';
  s.textContent = `
#whatsNewPanel{z-index:160}
#whatsNewPanel .wnBox{position:relative;width:min(720px,100%);text-align:left;padding:26px 24px 20px}
#whatsNewPanel .wnKicker{margin:0 52px 4px 0;font:700 13px system-ui,'Segoe UI',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#ffd77a}
#whatsNewPanel h2{text-align:left;font-size:clamp(28px,6vw,38px);line-height:1.1;margin-right:44px}
#whatsNewPanel .wnDate{margin:6px 0 14px;font:16px 'EB Garamond',Georgia,serif;color:#9aa6c8}
#whatsNewPanel .wnList{list-style:none;margin:0;padding:0;display:grid;gap:10px}
#whatsNewPanel .wnList li{display:grid;grid-template-columns:42px 1fr auto;gap:4px 12px;align-items:center;padding:10px 14px;border-radius:12px;border:1.5px solid #33467e;background:#0d1534cc}
#whatsNewPanel .wnIcon{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:radial-gradient(circle at 50% 35%,#3b3f7a,#151d45);border:1px solid #c9a35a88;font-size:22px;line-height:1}
#whatsNewPanel .wnList p{margin:0;font:17px/1.4 system-ui,'Segoe UI',sans-serif;color:#eef1fb;overflow-wrap:anywhere}
#whatsNewPanel .wnGo{white-space:nowrap;min-height:44px;padding:0 14px;border-radius:10px;border:1.5px solid #c9a35a;background:#1b2552;color:#ffe29a;font:700 17px 'Cormorant Garamond',Georgia,serif;cursor:pointer}
#whatsNewPanel .wnGo:hover,#whatsNewPanel .wnGo:focus-visible{background:#26336b;border-color:#ffe29a}
#whatsNewPanel details{margin-top:14px;border-top:1px solid #33467e;padding-top:10px}
#whatsNewPanel summary{cursor:pointer;font:700 18px 'Cormorant Garamond',Georgia,serif;color:#f6dfa4;min-height:40px;display:flex;align-items:center}
#whatsNewPanel details h3{margin:12px 0 2px;font:700 22px 'Cormorant Garamond',Georgia,serif;color:#f6dfa4}
#whatsNewPanel .wnOk{display:block;width:100%;margin-top:16px;min-height:54px;border-radius:12px;border:1.5px solid #fff1c2;background:linear-gradient(180deg,#ffe29a,#e8ae45);color:#2a1606;font:700 21px 'Cormorant Garamond',Georgia,serif;cursor:pointer}
#whatsNewPanel .wnList li{animation:wnRise .45s ease-out both}
#whatsNewPanel .wnList li:nth-child(2){animation-delay:.06s}#whatsNewPanel .wnList li:nth-child(3){animation-delay:.12s}
#whatsNewPanel .wnList li:nth-child(4){animation-delay:.18s}#whatsNewPanel .wnList li:nth-child(5){animation-delay:.24s}#whatsNewPanel .wnList li:nth-child(6){animation-delay:.3s}
@keyframes wnRise{from{opacity:0;transform:translateY(8px)}}
#whatsNewPanel.wnCalm,#whatsNewPanel.wnCalm *{animation:none!important;transition:none!important}
@media(prefers-reduced-motion:reduce){#whatsNewPanel,#whatsNewPanel *{animation:none!important;transition:none!important}}
@media(max-width:600px){#whatsNewPanel .wnList li{grid-template-columns:42px 1fr;align-items:start}#whatsNewPanel .wnIcon{grid-row:span 2}#whatsNewPanel .wnGo{grid-column:2;justify-self:start;margin-top:4px}}
@media(max-width:520px){#whatsNewPanel{padding:10px}#whatsNewPanel .wnBox{padding:20px 14px 14px}#whatsNewPanel .wnList li{grid-template-columns:36px 1fr;padding:10px}#whatsNewPanel .wnIcon{width:36px;height:36px;font-size:19px}#whatsNewPanel .wnList p{font-size:16px}}
.uiMenu .wnMenuItem .wnDot{display:inline-block;width:9px;height:9px;margin-left:6px;border-radius:50%;background:#e8323c;vertical-align:middle}`;
  document.head.append(s);
}

/* ---------- Panel */
const item = (it, i, rel) => `<li><span class="wnIcon" aria-hidden="true">${it.icon || '✨'}</span><p>${esc(it.text)}</p>${it.go || it.daily ? `<button type="button" class="wnGo" data-wn="${esc(rel.id)}:${i}">${esc(it.show || 'Show me')} →</button>` : ''}</li>`;
function html() {
  const [now, ...older] = RELEASES;
  return `<div class="tdBox wnBox"><button type="button" class="dX" aria-label="Close">×</button>
   <p class="wnKicker">What's new in EMBERLINGS</p><h2 id="wnTitle">${esc(now.title)}</h2><p class="wnDate">${esc(now.date)}</p>
   <ul class="wnList">${now.items.map((it, i) => item(it, i, now)).join('')}</ul>
   ${older.length ? `<details><summary>Earlier updates</summary>${older.map(r => `<h3>${esc(r.title)}</h3><p class="wnDate">${esc(r.date)}</p><ul class="wnList">${r.items.map((it, i) => item(it, i, r)).join('')}</ul>`).join('')}</details>` : ''}
   <button type="button" class="wnOk">Got it, let's play!</button></div>`;
}
let lastFocus = null;
export function close() {
  const el = $('#whatsNewPanel'); if (!el) return;
  el.remove(); removeEventListener('keydown', onKey, true);
  if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true }); lastFocus = null;
}
function onKey(e) {
  const el = $('#whatsNewPanel'); if (!el) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
  if (e.key === 'Tab') { // keep focus inside the panel
    const f = [...el.querySelectorAll('button,summary')].filter(x => x.offsetParent); if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  }
}
export function open() {
  if (!B || !LATEST) return false;
  if ($('#dailyPanel')) return false; // never on top of Daily rewards
  close(); styles(); markSeen(); $('.uiMenu')?.remove();
  lastFocus = document.activeElement;
  const el = document.createElement('div'); el.id = 'whatsNewPanel'; el.className = 'tradeDone' + (calm() ? ' wnCalm' : '');
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'wnTitle');
  el.innerHTML = html(); document.body.append(el);
  el.addEventListener('click', e => {
    if (e.target === el || e.target.closest('.dX,.wnOk')) { close(); return; }
    const go = e.target.closest('[data-wn]'); if (!go) return;
    const [rid, i] = [go.dataset.wn.slice(0, go.dataset.wn.lastIndexOf(':')), +go.dataset.wn.split(':').pop()];
    const it = RELEASES.find(r => r.id === rid)?.items[i]; close();
    if (it?.daily) window.EmberDaily?.open?.(); else if (it?.go) B.go(it.go);
  });
  addEventListener('keydown', onKey, true);
  $('.wnOk', el).focus({ preventScroll: true });
  return true;
}

/* ---------- "What's new" in the user menu (added at runtime so ui.js stays untouched) */
function addMenuItem(menu) {
  if (!menu || menu.querySelector('.wnMenuItem')) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'wnMenuItem'; b.setAttribute('role', 'menuitem');
  b.innerHTML = `<span aria-hidden="true">📰</span> What's new${ext().seenRelease !== LATEST ? '<i class="wnDot" aria-hidden="true"></i>' : ''}`;
  // Stop the menu's own click handler (it would try to navigate to a view).
  b.addEventListener('click', e => { e.stopPropagation(); menu.remove(); document.querySelectorAll('.uiUserBtn[aria-expanded="true"]').forEach(u => u.setAttribute('aria-expanded', 'false')); open(); });
  const hr = menu.querySelector('hr'); hr ? menu.insertBefore(b, hr) : menu.append(b);
}

/* ---------- Showing it once after an update */
let waiting = false;
function blocked() {
  return B.view !== 'home' || $('#dailyPanel') || $('#guidedTour') || B.state.guidedTour?.active || $('.tradeDone:not(#whatsNewPanel)') || $('.biIntro') || $('.lvlUp,.levelUpModal');
}
function maybeShow() {
  if (waiting || !LATEST || $('#whatsNewPanel')) return;
  const e = ext(); if (e.seenRelease === LATEST) return;
  if (!e.seenRelease && !isReturning()) { markSeen(); return; } // brand-new players: the beginner guide comes first
  waiting = true;
  // Wait a moment so the Daily rewards panel (which opens ~0.6 s after Home on a new day) goes first.
  setTimeout(function check() {
    if (ext().seenRelease === LATEST) { waiting = false; return; }
    if (blocked()) {
      if ($('#dailyPanel') || $('.tradeDone:not(#whatsNewPanel)')) { setTimeout(check, 700); return; } // after it's closed
      waiting = false; return; // left Home: try again next time Home is shown
    }
    waiting = false; open();
  }, 1400);
}

if (B) {
  styles();
  addEventListener('ember:frame', () => requestAnimationFrame(maybeShow));
  // Never stacked with Daily rewards: if it opens (e.g. from its button), this panel steps aside.
  new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.classList?.contains('uiMenu')) addMenuItem(n);
      if (n.id === 'dailyPanel' && $('#whatsNewPanel')) close();
    }
  }).observe(document.body, { childList: true });
  window.EmberWhatsNew = { open, close, RELEASES, LATEST };
}
