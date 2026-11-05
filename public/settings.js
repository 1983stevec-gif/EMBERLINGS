// EMBERLINGS Settings hub: one page (view "settings") that gathers every option in one place.
// Presentation only: no rules, rewards or cards change. Each control calls the feature's own API, so a change made
// here is the same change the old controls make, saved in the same place:
//   Sound            state.ember.muted            (same field as the menu / header Sound buttons)
//   Music            window.EmberMusic.set         (state.ember.music)
//   Effects          window.EmberFx.set            (state.ember.fx / state.reducedMotion)
//   Text size, symbols window.EmberA11y.set        (state.ember.a11y)
//   Share highlights window.EmberActivity.setShare (state.ember.activity.share)
//   Install          window.EmberPwa.install, What's new window.EmberWhatsNew.open, Backup window.EmberBackup
// No new save fields. Other modules can add their own block with window.EmberSettings.addSection({...}).
// While this module is loaded, the player menu stays short: the options that moved here are hidden from it.
const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const ext = () => { const st = B.state; if (!st.ember || typeof st.ember !== 'object') st.ember = {}; return st.ember; };

const SECTIONS = [['sound', '🔊', 'Sound & music'], ['effects', '✨', 'Effects'], ['access', '♿', 'Accessibility'], ['privacy', '🔔', 'Notifications & privacy'], ['app', '📲', 'App'], ['account', '🔑', 'Account & cloud save'], ['backup', '💾', 'Backup']];
const FX_HELP = { full: 'All animations and celebrations.', light: 'Calmer: no flashes, shaking or confetti, fewer sparkles.', off: 'No animations. Numbers and pop-ups still show.' };
const SIZES = [['normal', 'Normal'], ['large', 'Large'], ['xl', 'Extra large']];
const VOLS = [['low', 'Low'], ['med', 'Medium'], ['high', 'High']];
const extra = []; // sections added by other modules

/* ------------------------------------------------------------ Small building blocks */
const sw = (id, label, on, sub = '') => `<div class="setRow"><div class="setRowText"><span class="setLabel" id="${id}Lbl">${label}</span>${sub ? `<small class="setSub" id="${id}Sub">${sub}</small>` : ''}</div>
  <button type="button" class="setSwitch" id="${id}" role="switch" aria-checked="${on}" aria-labelledby="${id}Lbl"${sub ? ` aria-describedby="${id}Sub"` : ''}><span>${on ? 'On' : 'Off'}</span></button></div>`;
const radios = (name, legend, list, cur, help = '') => `<fieldset class="setRadios"><legend>${legend}</legend><div class="setSeg">${list.map(([v, t]) => `<label><input type="radio" name="${name}" value="${v}" ${v === cur ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>${help ? `<p class="setHelp" id="${name}Help">${help}</p>` : ''}</fieldset>`;
const section = (id, icon, title, body) => `<section class="setCard" id="set-${id}" aria-labelledby="set-${id}-h"><h2 id="set-${id}-h" tabindex="-1"><span aria-hidden="true">${icon}</span> ${esc(title)}</h2>${body}</section>`;

/* ------------------------------------------------------------ Current values (read from each feature) */
const muted = () => !!ext().muted;
const music = () => window.EmberMusic?.settings?.() || { on: !!ext().music?.on, vol: ext().music?.vol || 'med' };
const fxChoice = () => window.EmberFx?.choice?.() || (B.state.reducedMotion ? 'off' : ext().fx === 'light' ? 'light' : 'full');
const fxDevice = () => window.EmberFx && window.EmberFx.level() === 'off' && fxChoice() !== 'off';
const a11y = () => window.EmberA11y?.options?.() || { text: 'normal', symbols: false };
const sharing = () => window.EmberActivity?.share ? window.EmberActivity.share() : ext().activity?.share !== false;
const unseenNews = () => !!window.EmberWhatsNew?.LATEST && ext().seenRelease !== window.EmberWhatsNew.LATEST;

/* ------------------------------------------------------------ Page */
function body() {
  const st = B.state, m = music(), fx = fxChoice(), a = a11y(), user = st.playerUsername;
  const pwa = window.EmberPwa, canInstall = !!pwa?.canInstall?.(), installed = !!pwa?.installed?.();
  const reset = localStorage.getItem(B.key + '-batch3-reset-done') || st.testResetVersion === 3;
  const out = [];
  out.push(section('sound', '🔊', 'Sound & music', `
    ${sw('setSound', 'Sound', !muted(), 'Sound effects for taps, packs and battles.')}
    ${sw('setMusic', 'Music', m.on, 'Calm background music that changes with each screen.')}
    ${radios('setVol', 'Music volume', VOLS, m.vol)}
    <p class="setNote" id="setMusicNote" ${m.on && muted() ? '' : 'hidden'}>Sound is off, so music stays quiet. Turn Sound on to hear it.</p>`));
  out.push(section('effects', '✨', 'Effects', radios('setFx', 'Animations and celebrations', (window.EmberFx?.levels || ['full', 'light', 'off']).map(v => [v, window.EmberFx?.labels?.[v] || v]), fx,
    fxDevice() ? 'Your device asks for reduced motion, so effects stay off.' : FX_HELP[fx])));
  out.push(section('access', '♿', 'Accessibility', `
    ${radios('setText', 'Text size', SIZES, a.text, 'Makes the words in menus, lists, pop-ups and buttons bigger.')}
    ${sw('setSym', 'Element symbols', !!a.symbols, 'Each element gets its own badge shape, and cards show their rarity in words. Helpful if some colours look alike.')}
    ${window.EmberA11y?.open ? '<p class="setBtns"><button type="button" class="setBtn" id="setKeys">⌨ Keyboard help and element badges</button></p>' : ''}`));
  out.push(section('privacy', '🔔', 'Notifications & privacy', `
    ${sw('setShare', 'Share my highlights with friends', sharing(), user ? 'Rare pack pulls, boss wins and level milestones show on your friends\' Activity, so they can cheer. Off hides what you shared.' : 'Works once you have a username and friends. Only accepted friends can see them.')}
    <div id="setExtraPrivacy"></div>`));
  out.push(section('app', '📲', 'App', `
    <div class="setRow"><div class="setRowText"><span class="setLabel">Install EMBERLINGS</span><small class="setSub">${installed ? 'You are playing the installed app.' : canInstall ? 'Play full screen from your home screen, and it opens faster.' : 'This browser cannot install the game. Try Chrome, Edge or Safari on a phone or tablet.'}</small></div>
      ${canInstall ? '<button type="button" class="setBtn gold" id="setInstall">📲 Install</button>' : ''}</div>
    <div class="setRow"><div class="setRowText"><span class="setLabel">What's new</span><small class="setSub">The latest changes to the game.</small></div>
      <button type="button" class="setBtn" id="setNews">📰 Show${unseenNews() ? '<i class="setDot" aria-label="new"></i>' : ''}</button></div>
    <div class="setRow"><div class="setRowText"><span class="setLabel">Tutorial</span><small class="setSub">Play the beginner guide again.</small></div>
      <button type="button" class="setBtn" data-go="tutorial">🧭 Replay</button></div>
    ${window.EmberTips?.reset ? `<div class="setRow"><div class="setRowText"><span class="setLabel">First-time tips</span><small class="setSub" id="setTipsSub">Show the little tips for each page again.</small></div>
      <button type="button" class="setBtn" id="setTips">💡 Reset tips</button></div>` : ''}`));
  out.push(section('account', '🔑', 'Account & cloud save', `
    <p class="setStatus">${user ? `Logged in as <b>${esc(user)}</b>.` : 'Not logged in on this device.'} ${user ? 'Set a password and save to the cloud so your collection follows you.' : 'Log in with a username and password to keep your collection on any device.'}</p>
    <p class="setBtns"><button type="button" class="setBtn gold" data-go="account">🔑 ${user ? 'Account, password &amp; cloud save' : 'Log in'}</button>${user && window.EmberCloud?.logout ? '<button type="button" class="setBtn" id="setLogout">🚪 Log out</button>' : ''}</p>`));
  out.push(section('backup', '💾', 'Backup', `
    <div id="setBackupHost"></div>
    <details class="setTest"><summary>Test save tools</summary><p class="setHelp">One-time reset for this browser only. Your current save is backed up first.</p><button type="button" class="setBtn" id="setResetTest" ${reset ? 'disabled' : ''}>Reset my test progress once</button></details>`));
  for (const x of extra) {
    const html = (() => { try { return x.html(); } catch (e) { console.warn('settings', e); return ''; } })();
    if (html) out.splice(Math.min(out.length, x.order ?? out.length - 2), 0, section(x.id, x.icon || '⚙', x.title, html));
  }
  return out.join('');
}
function sectionList() {
  const ids = new Set($$('#app .setCard').map(s => s.id.slice(4)));
  return [...SECTIONS, ...extra.map(x => [x.id, x.icon || '⚙', x.title])].filter(([id]) => ids.has(id));
}
function render() {
  B.render(`<button class="back" data-go="home">‹ Home</button><section class="setPage" aria-labelledby="setTitle">
   <header class="setHead"><p class="setKick">Make the game yours</p><h1 id="setTitle"><span aria-hidden="true">⚙</span> Settings</h1>
    <nav class="setJump" aria-label="Settings sections"></nav></header>
   <div class="setGrid">${body()}</div></section>`);
  $('.setJump').innerHTML = sectionList().map(([id, i, t]) => `<button type="button" data-set-jump="${id}"><span aria-hidden="true">${i}</span> ${esc(t)}</button>`).join('');
  wire();
  if (pending) { const id = pending; pending = null; requestAnimationFrame(() => jump(id, false)); }
}
function jump(id, focus = true) {
  const s = $('#set-' + CSS.escape(id)); if (!s) return;
  const calm = window.EmberFx?.level?.() === 'off';
  s.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
  if (focus) $('h2', s)?.focus({ preventScroll: true });
  s.classList.remove('setFlash'); void s.offsetWidth; s.classList.add('setFlash');
}

/* ------------------------------------------------------------ Controls */
function wire() {
  const page = $('.setPage'); if (!page) return;
  page.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.setJump) return jump(b.dataset.setJump);
    switch (b.id) {
      case 'setSound': { const e = ext(); e.muted = !e.muted; B.save(); announce('Sound ' + (e.muted ? 'off' : 'on')); break; }
      case 'setMusic': window.EmberMusic?.set({ on: !music().on }); announce('Music ' + (music().on ? 'on' : 'off')); break;
      case 'setSym': window.EmberA11y?.set('symbols', !a11y().symbols); announce('Element symbols ' + (a11y().symbols ? 'on' : 'off')); break;
      case 'setShare': window.EmberActivity?.setShare?.(!sharing()); announce('Sharing ' + (sharing() ? 'on' : 'off')); break;
      case 'setKeys': window.EmberA11y?.open(); return;
      case 'setInstall': window.EmberPwa?.install(); return;
      case 'setNews': window.EmberWhatsNew?.open(); setTimeout(paint, 0); return;
      case 'setTips': { try { window.EmberTips.reset(); $('#setTipsSub').textContent = 'Done! Tips will show again as you visit each page.'; announce('First-time tips reset.'); } catch (e) { console.warn('settings', e); } return; }
      case 'setLogout': window.EmberCloud?.logout(); return;
      case 'setResetTest': B.resetTest(); return;
      default: return;
    }
    paint();
  });
  page.addEventListener('change', ev => {
    const t = ev.target; if (t.type !== 'radio') return;
    if (t.name === 'setVol') window.EmberMusic?.set({ vol: t.value, on: true });
    if (t.name === 'setFx') window.EmberFx?.set(t.value);
    if (t.name === 'setText') window.EmberA11y?.set('text', t.value);
    paint();
  });
  // The save backup panel belongs to enhancements.js; show its own panel here, open.
  const host = $('#setBackupHost');
  if (host && window.EmberBackup) {
    // Same panel and buttons, shown open here (no fold-out heading: the section heading says what it is).
    const tmp = document.createElement('div'); tmp.innerHTML = window.EmberBackup.html();
    const d = tmp.firstElementChild, box = document.createElement('div'); box.className = 'fxBackup';
    for (const n of [...d.childNodes]) if (n.nodeName !== 'SUMMARY') box.append(n);
    host.append(box);
    try { window.EmberBackup.bind(); } catch (e) { console.warn('settings backup', e); }
  }
  else if (host) host.innerHTML = '<p class="setHelp">Backup is not available right now. Reload the page and try again.</p>';
  for (const x of extra) { const el = $('#set-' + CSS.escape(x.id)); if (el && x.bind) { try { x.bind(el); } catch (e) { console.warn('settings', e); } } }
}
const announce = t => window.EmberA11y?.announce?.(t);
function setSwitch(id, on) { const b = $('#' + id); if (!b) return; b.setAttribute('aria-checked', String(on)); $('span', b).textContent = on ? 'On' : 'Off'; }
function setRadio(name, v) { for (const r of $$(`input[name="${name}"]`)) r.checked = r.value === v; }
// The painted header's Sound button (ui.js) shows the same words it would after its own tap.
function paintHeaderSound() {
  const m = muted(), snd = $('#uiPSound'); if (!snd) return;
  snd.setAttribute('aria-pressed', String(!m)); snd.setAttribute('aria-label', 'Sound ' + (m ? 'off' : 'on'));
  const t = $('span', snd); if (t) t.textContent = 'Sound: ' + (m ? 'Off' : 'On');
}
// Keeps the page in step with the saved values, whichever control changed them.
function paint() {
  if (B.view !== 'settings' || !$('.setPage')) return;
  const m = music(), a = a11y(), fx = fxChoice();
  setSwitch('setSound', !muted()); paintHeaderSound();
setSwitch('setMusic', m.on); setRadio('setVol', m.vol);
  $('#setMusicNote').hidden = !(m.on && muted());
  $('#set-sound .setRadios')?.classList.toggle('setDim', !m.on);
  setRadio('setFx', fx); const h = $('#setFxHelp'); if (h) h.textContent = fxDevice() ? 'Your device asks for reduced motion, so effects stay off.' : FX_HELP[fx];
  setRadio('setText', a.text); setSwitch('setSym', !!a.symbols);
  setSwitch('setShare', sharing());
  const news = $('#setNews .setDot'); if (news && !unseenNews()) news.remove();
}

/* ------------------------------------------------------------ The player menu: shorter, with Settings as the way in */
function tidyMenu(menu) {
  const go = $('#uiSettingsGo', menu); if (!go || go.dataset.set) return;
  go.dataset.set = '1';
  if (unseenNews()) go.insertAdjacentHTML('beforeend', '<i class="setDot" aria-hidden="true"></i>');
  go.setAttribute('aria-label', 'Settings: sound, music, effects, accessibility, app, account and backup');
}

/* ------------------------------------------------------------ Styles */
function css() {
  if ($('#setStyles')) return;
  const s = document.createElement('style'); s.id = 'setStyles';
  s.textContent = `
/* Settings hub: options that live here are hidden from the player menu (they stay reachable in Settings). */
.uiMenu :is(.wnMenuItem,#pwaInstallGo,#a11yMenuGo,.fxMusicBox,.uiFx){display:none!important}
.uiMenu #uiSettingsGo{position:relative}
.setDot{display:inline-block;width:9px;height:9px;margin-left:6px;border-radius:50%;background:#e8323c;vertical-align:middle;font-style:normal}
.setPage{max-width:1040px;margin:0 auto 40px;padding:0 4px;box-sizing:border-box;color:var(--ui-text,#efe6d2);overflow-wrap:anywhere}
.setPage *{box-sizing:border-box}
.setHead{padding:18px 22px;border:1px solid var(--ui-goldline,#7a5a2a);border-radius:12px;background:radial-gradient(ellipse at 80% 0,#2a2a3c,transparent 60%),linear-gradient(180deg,#151c27,#0e131b);box-shadow:inset 0 0 0 1px #0009,0 12px 30px #0008}
.setKick{margin:0;font:700 12px system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--ui-gold,#e9b75a)}
.setHead h1{margin:2px 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-size:clamp(30px,4.4vw,44px);color:#f6ead2}
.setJump{display:flex;flex-wrap:wrap;gap:8px}
.setJump button{min-height:44px;padding:6px 14px;border-radius:99px;border:1px solid #e9b75a66;background:#0e1420;color:#f3e6c8;font:600 15px system-ui,sans-serif;cursor:pointer}
.setJump button:hover{border-color:#ffd27a;color:#ffd27a}
.setGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px;align-items:start}
.setCard{min-width:0;padding:16px 18px 18px;border:1px solid #e9b75a44;border-radius:12px;background:linear-gradient(180deg,#151b26,#0f141c);box-shadow:0 8px 22px #0007;scroll-margin-top:90px}
.setCard h2{margin:0 0 10px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#f3dcae}
.setCard h2:focus{outline:none}
#set-backup{grid-column:1/-1}
.setFlash{animation:setFlash 1.2s ease-out}
@keyframes setFlash{0%{border-color:#ffd27a;box-shadow:0 0 0 3px #ffd27a66,0 8px 22px #0007}100%{border-color:#e9b75a44}}
html[data-fx=off] .setFlash{animation:none}
.setRow{display:flex;align-items:center;justify-content:space-between;gap:10px 14px;padding:10px 0;border-top:1px solid #e9b75a22;flex-wrap:wrap}
.setCard h2+.setRow{border-top:0;padding-top:2px}
.setRowText{flex:1 1 200px;min-width:0}
.setLabel{display:block;font:700 17px system-ui,sans-serif;color:#f6ead2}
.setSub{display:block;margin-top:2px;font-size:14px;line-height:1.35;color:#c9bfa8}
.setSwitch{position:relative;flex:none;min-width:84px;min-height:44px;padding:0 14px 0 42px;border-radius:99px;border:1px solid #e9b75a88;background:#3a2c18;color:#f2e8d6;font:800 15px system-ui,sans-serif;cursor:pointer;text-align:left}
.setSwitch::before{content:"";position:absolute;left:8px;top:50%;width:26px;height:26px;margin-top:-13px;border-radius:50%;background:#8a7a64;transition:background .2s}
.setSwitch[aria-checked="true"]{background:linear-gradient(#5fbf6a,#2f8a3d);border-color:#9fe3a8;color:#fff}
.setSwitch[aria-checked="true"]::before{background:#fff}
.setRadios{margin:6px 0 4px;padding:0;border:0;min-width:0}
.setRadios legend{padding:0;margin-bottom:6px;font:700 15px system-ui,sans-serif;color:#e9dcc0}
.setSeg{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:6px}
.setSeg label{position:relative;display:block;min-width:0}
.setSeg input{position:absolute;opacity:0;inset:0;width:100%;height:100%;margin:0;cursor:pointer}
.setSeg span{display:flex;align-items:center;justify-content:center;min-height:44px;padding:6px 8px;border:1px solid #e9b75a55;border-radius:8px;background:#161d29;color:var(--ui-text,#f3e6c8);font:600 15px system-ui,sans-serif;text-align:center;line-height:1.2}
.setSeg input:checked+span{background:linear-gradient(180deg,#f3c76a,#c68f32);border-color:#ffe2a0;color:#1b1206;font-weight:800}
.setSeg input:focus-visible+span{outline:3px solid #ffd27a;outline-offset:2px}
.setDim .setSeg{opacity:.65}
.setHelp,.setNote,.setStatus{margin:8px 0 0;font-size:14px;line-height:1.4;color:#c9bfa8}
.setNote{color:#ffd27a}
.setStatus{font-size:15.5px;color:#e6dcc6}.setStatus b{color:#ffd98a}
.setBtns{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0}
.setBtn{min-height:44px;padding:8px 16px;border-radius:10px;border:1px solid #c9a35a;background:#1b2234;color:#ffe29a;font:700 15px system-ui,sans-serif;cursor:pointer;white-space:normal}
.setBtn:hover{background:#26304a;border-color:#ffe29a}
.setBtn.gold{background:linear-gradient(180deg,#ffe29a,#e8ae45);color:#2a1606;border-color:#fff1c2}
.setBtn:disabled{opacity:.5;cursor:default}
.setTest{margin-top:14px;border-top:1px solid #e9b75a22;padding-top:8px}
#app .setPage .setTest summary{min-height:44px;display:flex;align-items:center;cursor:pointer;color:#c9bfa8;font-size:15px}
#setBackupHost .fxBackup{margin:0;padding:0;border:0;background:none;box-shadow:none}
#setBackupHost .fxBackup p{overflow-wrap:anywhere;color:#e6dcc6}
#setBackupHost .fxBackup p:first-child{margin-top:0}
#setBackupHost .fxBackup .button,#setBackupHost .fxBackup label.button{min-height:44px;display:inline-flex;align-items:center;margin:3px 0}
#setBackupHost textarea{max-width:100%}
@media(max-width:820px){.setGrid{grid-template-columns:minmax(0,1fr)}}
@media(max-width:520px){.setPage{padding:0}.setHead{padding:14px}.setCard{padding:14px}.setJump{gap:6px}.setJump button{padding:6px 12px;font-size:14px}.setSeg{grid-auto-flow:row;grid-template-columns:repeat(3,minmax(0,1fr))}.setSeg span{font-size:14px;padding:6px 4px}}
`;
  document.head.append(s);
}

/* ------------------------------------------------------------ Start */
let pending = null;
function open(id) { pending = id || null; $('.uiMenu')?.remove(); if (B.view === 'settings' && id) { pending = null; jump(id); } else B.go('settings'); }
function addSection(x) {
  if (!x?.id || !x.title || typeof x.html !== 'function' || extra.some(e => e.id === x.id)) return false;
  extra.push(x); if (B.view === 'settings') render(); return true;
}
if (B && !window.EmberSettings) {
  css();
  B.registerView('settings', render);
  addEventListener('ember:fxLevel', paint);
  addEventListener('ember:music', paint);
  // Sound can also change from the painted header or the menu: catch it after any click.
  document.addEventListener('click', () => setTimeout(paint, 0));
  new MutationObserver(muts => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList?.contains('uiMenu')) tidyMenu(n); }).observe(document.body, { childList: true });
  window.EmberSettings = Object.freeze({ open, addSection, sections: () => sectionList().map(s => s[0]) });
}
