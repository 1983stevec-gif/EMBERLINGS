// EMBERLINGS enhancements: sound, Collection Album, achievements and titles, save backup, and visual effects.
// Talks to the game only through window.EmberBridge. New save data lives under state.ember; the save key is unchanged.
import { ACHIEVEMENTS, ALBUM_STAMPS, ALBUM_PAGE_BONUS, ALBUM_MASTER_BONUS, SPECIES_COUNT, albumStatus, albumPagesComplete } from './achievements.js';

const B = window.EmberBridge;
const ELEMENT_COLORS = { Fire: '#e67e4e', Moon: '#a796dc', Nature: '#72b987', Lightning: '#e3c857', Water: '#64b5d6', Crystal: '#cba0d8', Ice: '#9bd5dd', Shadow: '#9276b5', Wind: '#86cbb6' };
const RARITY_COLORS = ['#aebce2', '#7be7b3', '#72b5ff', '#c18aff', '#ffd568', '#73f0f1', '#ff88d4'];
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fmt = n => Math.floor(Number(n) || 0).toLocaleString();
const ext = () => { const st = B.state; if (!st.ember || typeof st.ember !== 'object') st.ember = {}; return st.ember; };
const calm = () => !!B.state.reducedMotion || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));



function start() {
  injectStyles();
  window.addEventListener('ember:frame', e => onFrame(e.detail.view));
  window.addEventListener('ember:packRoll', () => sfx.roll());
  window.addEventListener('ember:packReveal', e => packReveal3D(e.detail));
  window.addEventListener('ember:packSummary', () => sfx.reveal(2));
  window.addEventListener('ember:fusion', e => onFusion(e.detail.creature));
  window.addEventListener('ember:coins', e => coinRain(e.detail));
  window.addEventListener('ember:cardBattle', e => battleFx(e.detail));
  window.addEventListener('ember:cardResult', e => onCardResult(e.detail));
  window.addEventListener('ember:friends', e => onFriends(e.detail));
  const soundControl = e => e.target.closest?.('[data-sound-control],#uiSound,#uiSoundToggle,#uiMute,#uiTestSound,#uiTestSoundSettings');
  document.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch' && !soundControl(e)) sfx.unlock(); }, { capture: true, passive: true });
  document.addEventListener('touchend', e => { if (!soundControl(e)) sfx.unlock(); }, { capture: true, passive: true });
  document.addEventListener('click', e => { if (soundControl(e)) return; sfx.unlock(); if (e.target.closest?.('button,.tile,[data-go]')) sfx.click(); }, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => sfx.refresh());
  window.addEventListener('pageshow', () => sfx.refresh());
  B.registerView('album', renderAlbum);
  B.registerView('achievements', renderAchievements);
  setupTilt();
  const observer = new MutationObserver(() => scheduleDecorate());
  observer.observe(document.getElementById('app'), { childList: true, subtree: true });
  onFrame(B.view);
}

/* ---------------------------------------------------------------- Sound */
const sfx = (() => {
  let ctx = null, master = null, resuming = null, suspending = false, epoch = 0, lastStatus = '';
  const sources = new Set();
  const muted = () => !!ext().muted;
  const status = () => muted() ? 'off' : ctx?.state === 'running' ? 'on' : 'locked';
  function refresh() { const next = status(); if (next !== lastStatus) { lastStatus = next; window.dispatchEvent(new CustomEvent('ember:audio', { detail: { status: next } })); } }
  function ac(create = false) {
    if (muted()) return null;
    try {
      if (ctx?.state === 'closed') { ctx = null; master = null; resuming = null; }
      if (!ctx && create) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); master = ctx.createGain(); master.gain.value = .35; master.connect(ctx.destination); ctx.addEventListener('statechange', refresh); }
      return ctx;
    } catch { return null; }
  }
  function unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { }
    const c = ac(true); if (!c) { refresh(); return Promise.resolve(false); }
    if (c.state === 'running' && !suspending) { refresh(); return Promise.resolve(true); }
    if (resuming) return resuming;
    // iPad Safari needs creation, a silent buffer and resume in the trusted tap/click itself.
    try { const prime = c.createBufferSource(); prime.buffer = c.createBuffer(1, 1, c.sampleRate); prime.connect(c.destination); prime.onended = () => prime.disconnect(); prime.start(0); } catch { }
    try { resuming = Promise.resolve(c.resume()).then(() => { refresh(); return !muted() && c === ctx && c.state === 'running'; }, () => { refresh(); return false; }).finally(() => { resuming = null; }); }
    catch { refresh(); return Promise.resolve(false); }
    return resuming;
  }
  function ready(play) { const c = ac(), token = epoch; if (!c) return; const run = () => { if (!muted() && token === epoch && c === ctx && c.state === 'running') play(c); }; if (c.state === 'running') run(); else if (resuming) resuming.then(run); }
  function track(source, ...nodes) { sources.add(source); source.onended = () => { sources.delete(source); source.disconnect(); for (const node of nodes) node.disconnect(); }; }
  function setMuted(value) {
    ext().muted = !!value; B.save();
    if (value) { epoch++; if (master) master.gain.value = 0; for (const source of sources) { try { source.stop(); } catch { } } sources.clear(); if (ctx && ctx.state !== 'closed') { suspending = true; Promise.resolve(ctx.suspend()).catch(() => {}).finally(() => { suspending = false; }); } refresh(); return Promise.resolve(false); }
    if (master) master.gain.value = .35;
    const resumed = unlock(); resumed.then(ok => { if (ok && master) master.gain.value = .35; }); return resumed;
  }
  function tone({ f = 440, to = null, type = 'sine', at = 0, d = .15, v = .2, a = .005 }) {
    ready(c => { const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(master); track(o, g); o.start(t); o.stop(t + d + .05); });
  }
  function noise({ at = 0, d = .2, v = .2, f = 1200, q = .8, type = 'lowpass' }) {
    ready(c => { const t = c.currentTime + at, len = Math.ceil(c.sampleRate * d), buf = c.createBuffer(1, len, c.sampleRate), data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource(), filter = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf; filter.type = type; filter.frequency.value = f; filter.Q.value = q; g.gain.value = v;
      src.connect(filter); filter.connect(g); g.connect(master); track(src, filter, g); src.start(t); src.stop(t + d + .05); });
  }
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093];
  let lastClick = 0;
  return {
    unlock, status, refresh, setMuted,
    preview: () => { const resumed = setMuted(false); resumed.then(ok => { if (ok) [523.25, 659.25, 783.99].forEach((f, i) => tone({ f, at: i * .12, d: .2, v: .14 })); }); return resumed; },
    click: () => { const now = performance.now(); if (now - lastClick < 60) return; lastClick = now; tone({ f: 900, to: 700, type: 'triangle', d: .05, v: .05 }); },
    roll: () => { let at = 0, gap = .045; while (at < 2.5) { tone({ f: 1200, type: 'square', at, d: .03, v: .035 }); at += gap; gap *= 1.09; } },
    burst: rank => { noise({ d: .5 + rank * .08, v: .3, f: 900 + rank * 300 }); tone({ f: 90, to: 40, type: 'sine', d: .45, v: .35 }); },
    reveal: rank => { const n = 3 + Math.min(4, rank); for (let i = 0; i < n; i++) tone({ f: notes[i], type: 'triangle', at: i * .08, d: .35, v: .12 }); if (rank >= 4) tone({ f: notes[n - 1] * 2, type: 'sine', at: n * .08, d: .9, v: .08 }); },
    coins: n => { const k = clamp(Math.round(Math.log10(Math.max(10, n)) * 2.2), 3, 12); for (let i = 0; i < k; i++) tone({ f: 1600 + Math.random() * 900, type: 'square', at: i * .055, d: .07, v: .045 }); },
    hit: big => { noise({ d: big ? .3 : .16, v: big ? .45 : .3, f: big ? 700 : 1400 }); tone({ f: big ? 140 : 220, to: 60, type: 'sine', d: big ? .3 : .15, v: .3 }); },
    heal: () => { tone({ f: 660, to: 990, type: 'sine', d: .25, v: .1 }); },
    ko: () => { tone({ f: 300, to: 50, type: 'sawtooth', d: .7, v: .18 }); noise({ d: .7, v: .35, f: 500 }); },
    win: () => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ f, type: 'triangle', at: i * .12, d: i === 3 ? .8 : .2, v: .14 })); },
    lose: () => { [392, 349.2, 311.1].forEach((f, i) => tone({ f, type: 'sine', at: i * .2, d: .4, v: .1 })); },
    achievement: () => { [784, 988, 1175, 1568].forEach((f, i) => tone({ f, type: 'square', at: i * .07, d: .18, v: .06 })); tone({ f: 1568, type: 'triangle', at: .3, d: .7, v: .1 }); },
    fusion: () => { tone({ f: 150, to: 900, type: 'sawtooth', d: 1.4, v: .08 }); noise({ at: 1.4, d: .6, v: .35, f: 1500 }); tone({ f: 1046.5, type: 'triangle', at: 1.45, d: .8, v: .12 }); },
    toggle: () => setMuted(true)
  };
})();
window.EmberAudio = Object.freeze({ unlock: sfx.unlock, setMuted: sfx.setMuted, status: sfx.status, preview: sfx.preview });

function muteButton() {
  const top = $('.top'); if (!top || $('.fxMute', top) || top.classList.contains('uiTop')) return;
  const b = document.createElement('button');
  b.className = 'fxMute'; b.type = 'button';
  const paint = () => { const m = !!ext().muted; b.textContent = m ? '🔇' : '🔊'; b.setAttribute('aria-label', m ? 'Sound off. Turn sound on' : 'Sound on. Turn sound off'); b.setAttribute('aria-pressed', String(!m)); b.title = m ? 'Sound off' : 'Sound on'; };
  b.dataset.soundControl = 'true'; b.onclick = () => { const next = !ext().muted && sfx.status() === 'on'; sfx.setMuted(next).then(() => { paint(); if (!next) sfx.click(); }); paint(); };
  paint();
  const coins = $('.coins', top); coins ? top.insertBefore(b, coins) : top.appendChild(b);
}

/* ---------------------------------------------------------------- Frame hooks */
function onFrame(view) {
  muteButton();
  const e = ext(), st = B.state;
  if ((st.coins || 0) > (e.peakCoins || 0)) e.peakCoins = Math.floor(st.coins);
  if (view === 'home') decorateHome();
  if (view === 'friends') decorateFriendsHeader();
  if (view === 'map') decorateMap();
  if (view === 'packs') setTimeout(() => { if (!calm() && hasWebGL()) three(); }, 400);
  if (view === 'packSummary') burstConfetti(30);
  scheduleDecorate();
  setTimeout(checkAchievements, 0);
}

function homeTile(go, icon, title, sub) { return `<button class="tile fxTile" data-go="${go}"><span class="emoji">${icon}</span><strong>${title}</strong><span>${sub}</span></button>`; }
function decorateHome() {
  const uiHome = $('.uiHome');
  if (uiHome) { if (!$('.fxBackup')) { uiHome.insertAdjacentHTML('beforeend', backupHTML()); const b = $('.fxBackup'); b.hidden = true; bindBackup(); } return; }
  const features = $('.features');
  if (features && !$('[data-go="album"]', features)) {
    const pages = albumPagesComplete(B.state), unlocked = Object.keys(ext().achievements || {}).length;
    features.insertAdjacentHTML('beforeend', homeTile('album', '📖', 'Collection Album', `${pages}/${SPECIES_COUNT} pages complete · ${claimableStamps().length} rewards ready`) + homeTile('achievements', '🏆', 'Achievements', `${unlocked}/${ACHIEVEMENTS.length} unlocked · choose your title`));
    B.bind();
  }
  const pill = $('.hero .pill');
  if (pill && ext().title && !$('.fxTitlePill')) pill.insertAdjacentHTML('afterend', ` <span class="pill fxTitlePill">🏷 ${esc(ext().title)}</span>`);
  const motion = $('#reducedMotion')?.closest('section');
  if (motion && !$('.fxBackup')) { motion.insertAdjacentHTML('afterend', backupHTML()); bindBackup(); }
}

/* ---------------------------------------------------------------- Save backup */
const ONLINE_FIELDS = ['playerUsername', 'recoveryCode', 'usernamePromptSeen', 'appliedTrades', 'cardOnlineId', 'onlineCardLocks', 'pendingTradeId', 'tradeLocks'];
function backupHTML() {
  return `<details class="panel fxBackup"><summary>💾 Save backup · move your collection to another computer</summary>
  <p>Your Mythlings, coins and progress are saved in this browser only. Export a backup code here, then import it in EMBERLINGS on another computer or browser.</p>
  <p class="small muted">Your online username is not part of the code. On the other computer, sign in with your username and recovery code in Friends. Finish trades and battles before exporting or importing.</p>
  <p><button class="button gold" id="fxExport" type="button">Create backup code</button> <button class="button alt" id="fxDownload" type="button">Download backup file</button></p>
  <textarea id="fxCode" rows="4" spellcheck="false" autocomplete="off" placeholder="Your backup code appears here. To import, paste a backup code here." aria-label="Backup code"></textarea>
  <p><button class="button" id="fxCopy" type="button">Copy code</button> <label class="button alt fxFileLabel">Open backup file<input type="file" id="fxFile" accept=".txt,text/plain" hidden></label> <button class="button" id="fxImport" type="button">Import this code</button></p>
  <p id="fxBackupStatus" role="status" class="small"></p></details>`;
}
function bindBackup() {
  const status = m => { const el = $('#fxBackupStatus'); if (el) el.textContent = m; };
  $('#fxExport').onclick = async () => { try { $('#fxCode').value = await encodeSave(); status('Backup code created. Copy it or download it as a file.'); } catch (e) { status(e.message); } };
  $('#fxDownload').onclick = async () => {
    try {
      const code = $('#fxCode').value.trim().startsWith('EMBER') ? $('#fxCode').value.trim() : await encodeSave();
      $('#fxCode').value = code;
      const url = URL.createObjectURL(new Blob([code], { type: 'text/plain' })), a = document.createElement('a');
      a.href = url; a.download = `emberlings-backup-${new Date().toISOString().slice(0, 10)}.txt`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
      status('Backup file downloaded.');
    } catch (e) { status(e.message); }
  };
  $('#fxCopy').onclick = async () => { const code = $('#fxCode').value.trim(); if (!code) return status('Create a backup code first.'); try { await navigator.clipboard.writeText(code); status('Copied.'); } catch { $('#fxCode').select(); status('Select the code and copy it.'); } };
  $('#fxFile').onchange = async e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 20e6) return status('That file is too large to be a backup.'); $('#fxCode').value = (await file.text()).trim(); status('Backup loaded. Press Import this code.'); };
  $('#fxImport').onclick = async () => {
    try {
      const code = $('#fxCode').value.trim(); if (!code) return status('Paste a backup code first.');
      const payload = await decodeSave(code);
      if (B.busy()) return status('Finish your current trade, battle or pack reveal before importing.');
      const cur = B.state, next = payload.save;
      if (!confirm(`Replace this browser's save?\n\nThis browser: ${fmt(cur.owned.length)} cards · 🪙 ${fmt(cur.coins)}\nBackup from ${new Date(payload.at).toLocaleString()}: ${fmt(next.owned.length)} cards · 🪙 ${fmt(next.coins)}\n\nThis browser's current save is kept as a safety copy first.`)) return;
      localStorage.setItem(B.key + '-backup-before-import', localStorage.getItem(B.key) || JSON.stringify(cur));
      for (const k of ONLINE_FIELDS) { if (cur[k] !== undefined) next[k] = cur[k]; else delete next[k]; }
      next.tradeLocks = cur.tradeLocks || {};
      B.adopt(next);
      status('Imported. Reloading…');
      setTimeout(() => location.reload(), 300);
    } catch (e) { status(e.message || 'That backup code could not be read.'); }
  };
}
function checksum(text) { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }
const toB64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = b64 => Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
async function encodeSave() {
  const st = B.state;
  if (st.pendingTradeId || Object.keys(st.tradeLocks || {}).length) throw Error('Finish or cancel your active trade before exporting.');
  const save = JSON.parse(JSON.stringify(st));
  for (const k of ONLINE_FIELDS) delete save[k];
  const bytes = new TextEncoder().encode(JSON.stringify({ game: 'EMBERLINGS', v: 1, at: Date.now(), save }));
  const zipped = typeof CompressionStream === 'function';
  const body = toB64(zipped ? await pipe(bytes, new CompressionStream('gzip')) : bytes);
  return `${zipped ? 'EMBER2' : 'EMBER1'}.${body}.${checksum(body)}`;
}
async function decodeSave(code) {
  const parts = code.replace(/\s+/g, '').split('.');
  if (parts.length !== 3 || !/^EMBER[12]$/.test(parts[0])) throw Error('That is not an EMBERLINGS backup code.');
  if (checksum(parts[1]) !== parts[2]) throw Error('This backup code is incomplete or was changed. Copy the whole code again.');
  let bytes = fromB64(parts[1]);
  if (parts[0] === 'EMBER2') { if (typeof DecompressionStream !== 'function') throw Error('This browser cannot open compressed backups. Update your browser.'); bytes = await pipe(bytes, new DecompressionStream('gzip')); }
  const payload = JSON.parse(new TextDecoder().decode(bytes)), s = payload?.save;
  const valid = payload?.game === 'EMBERLINGS' && s && typeof s === 'object' && Array.isArray(s.owned) && s.owned.length > 0 && Number.isFinite(s.coins) && s.coins >= 0 &&
    s.owned.every(c => c && typeof c.id === 'string' && Number.isInteger(c.kind) && c.kind >= 0 && c.kind < B.species.length);
  if (!valid) throw Error('This backup does not contain a valid EMBERLINGS save.');
  return payload;
}

/* ---------------------------------------------------------------- Collection Album */
function claimableStamps() {
  const out = [];
  for (let k = 0; k < SPECIES_COUNT; k++) for (const s of albumStatus(B.state, k)) if (s.earned && !s.claimed) out.push([k, s.id]);
  return out;
}
function claimStamps(list) {
  const valid = list.filter(([k, id]) => albumStatus(B.state, k).some(s => s.id === id && s.earned && !s.claimed));
  if (!valid.length) return 0;
  let total = 0, pages = 0;
  const ok = B.transact(() => {
    const e = ext(); e.album = e.album || {};
    total = 0; pages = 0;
    for (const [k, id] of valid) {
      const page = e.album[k] = e.album[k] || [];
      if (page.includes(id)) continue;
      page.push(id); total += ALBUM_STAMPS.find(s => s.id === id).reward;
      if (ALBUM_STAMPS.every(s => page.includes(s.id))) { total += ALBUM_PAGE_BONUS; pages++; }
    }
    if (!e.albumMaster && albumPagesComplete(B.state) >= SPECIES_COUNT) { e.albumMaster = true; total += ALBUM_MASTER_BONUS; }
    B.state.coins += total;
  });
  if (!ok) return 0;
  return { total, pages };
}
function renderAlbum() {
  const st = B.state, e = ext(), discovered = st.discovered || [], ready = claimableStamps();
  const readyCoins = ready.reduce((n, [, id]) => n + ALBUM_STAMPS.find(s => s.id === id).reward, 0);
  const pagesDone = albumPagesComplete(st), stampsDone = Object.values(e.album || {}).reduce((n, l) => n + l.length, 0);
  const pages = B.species.map((sp, k) => {
    const status = albumStatus(st, k), done = status.every(s => s.claimed), seen = discovered.includes(k) || status[0].earned;
    return `<section class="panel fxPage ${done ? 'fxPageDone' : ''}" style="--fx-el:${ELEMENT_COLORS[sp.element] || '#a5a9b6'}">
      <div class="fxPageArt">${seen ? B.portrait({ kind: k, rarity: 'Common' }) : `<span class="fxUnknown">${sp.emoji}</span>`}</div>
      <h3>${seen ? esc(sp.name) : '???'}</h3><p class="small muted">No. ${String(k + 1).padStart(2, '0')} · ${esc(sp.element)}</p>
      <div class="fxStamps">${status.map(s => s.claimed ? `<span class="fxStamp fxClaimed" title="${s.name} · claimed">${s.icon}<small>${s.name}</small></span>`
        : s.earned ? `<button class="fxStamp fxReady" data-claim="${k}:${s.id}" title="Claim ${s.name}">${s.icon}<small>+${fmt(s.reward)}</small></button>`
        : `<span class="fxStamp" title="Own a ${s.id === 'base' ? '' : s.name + ' '}${seen ? esc(sp.name) : 'Mythling of this species'}">${s.icon}<small>${s.name}</small></span>`).join('')}</div>
      ${done ? '<p class="fxPageBadge">★ Page complete</p>' : ''}</section>`;
  }).join('');
  B.render(`<button class="back" data-go="home">‹ Home</button><section class="hero center fxAlbumHero"><h1>📖 Collection Album</h1>
    <p>Fill every page: own a copy, a <b>Shiny</b> and a <b>Mutated</b> Mythling of each species. Every stamp pays coins once.</p>
    <p><span class="pill">${pagesDone}/${SPECIES_COUNT} pages</span> <span class="pill">${stampsDone}/${SPECIES_COUNT * 3} stamps</span> <span class="pill">Page bonus 🪙 ${fmt(ALBUM_PAGE_BONUS)}</span> <span class="pill">Full album 🪙 ${fmt(ALBUM_MASTER_BONUS)}${e.albumMaster ? ' ✓' : ''}</span></p>
    ${ready.length ? `<button class="button gold" id="fxClaimAll">Claim all · 🪙 ${fmt(readyCoins)}+</button>` : '<p class="muted small">No rewards waiting. Open packs, find Shinies and mutate Mythlings to earn stamps.</p>'}
    </section><div class="fxAlbum">${pages}</div>`);
  const after = (r, el) => {
    if (!r) return;
    sfx.coins(r.total);
    const rect = (el || $('.fxAlbumHero'))?.getBoundingClientRect();
    renderAlbum();
    coinRain({ amount: r.total, from: B.state.coins - r.total, to: B.state.coins, rect });
    B.toast(`Album reward: 🪙 +${fmt(r.total)}${r.pages ? ` · ${r.pages} page${r.pages > 1 ? 's' : ''} complete!` : ''}`);
  };
  $('#fxClaimAll')?.addEventListener('click', e => after(claimStamps(claimableStamps()), e.currentTarget));
  $$('[data-claim]').forEach(b => b.addEventListener('click', () => { const [k, id] = b.dataset.claim.split(':'); after(claimStamps([[+k, id]]), b); }));
}

/* ---------------------------------------------------------------- Achievements and titles */
function checkAchievements() {
  const st = B.state, e = ext(); e.achievements = e.achievements || {};
  const fresh = ACHIEVEMENTS.filter(a => !e.achievements[a.id] && a.value(st) >= a.goal);
  if (!fresh.length) { if (!e.achievementsSeeded) { e.achievementsSeeded = true; B.save(); } return; }
  const now = Date.now(); for (const a of fresh) e.achievements[a.id] = now;
  const seeded = e.achievementsSeeded; e.achievementsSeeded = true; B.save();
  if (!seeded && fresh.length > 1) return banner('🏆', `${fresh.length} achievements unlocked`, 'Your progress so far counts. Open Achievements on Home to choose a title.');
  fresh.slice(0, 3).forEach((a, i) => setTimeout(() => banner(a.icon, `Achievement: ${a.name}`, `Title unlocked: “${a.title}”`), i * 1600));
}
function banner(icon, title, sub) {
  sfx.achievement();
  $$('.fxBanner').forEach(b => b.remove());
  const el = document.createElement('div');
  el.className = 'fxBanner'; el.setAttribute('role', 'status');
  el.innerHTML = `<span class="fxBannerIcon">${icon}</span><div><strong>${esc(title)}</strong><small>${esc(sub)}</small></div>`;
  el.onclick = () => { el.remove(); B.go('achievements'); };
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('fxOut'), 4200); setTimeout(() => el.remove(), 4700);
}
function unlockedTitles() { const got = ext().achievements || {}; return ACHIEVEMENTS.filter(a => got[a.id]).map(a => a.title); }
function renderAchievements() {
  const st = B.state, e = ext(), got = e.achievements || {}, titles = unlockedTitles();
  const rows = ACHIEVEMENTS.map(a => {
    const v = Math.min(a.goal, a.value(st)), done = !!got[a.id];
    return `<section class="panel fxAch ${done ? 'fxAchDone' : ''}"><span class="fxAchIcon">${a.icon}</span><div><h3>${esc(a.name)}</h3><p class="small">${esc(a.desc)}</p>
      <div class="bar"><i style="width:${(v / a.goal) * 100}%"></i></div><p class="small muted">${done ? `Unlocked ${new Date(got[a.id]).toLocaleDateString()}` : `${fmt(v)} / ${fmt(a.goal)}`} · Title: “${esc(a.title)}”</p></div></section>`;
  }).join('');
  B.render(`<button class="back" data-go="home">‹ Home</button><section class="hero center"><h1>🏆 Achievements</h1><p>${titles.length}/${ACHIEVEMENTS.length} unlocked. Each achievement unlocks a title for your profile. Friends see it in their friends list.</p>
    <p><label for="fxTitle">Your title</label><br><select id="fxTitle" class="fxSelect"><option value="">No title</option>${titles.map(t => `<option ${t === e.title ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select> <button class="button gold" id="fxSaveTitle">Save title</button></p><p id="fxTitleStatus" role="status" class="small"></p></section><div class="fxAchList">${rows}</div>`);
  $('#fxSaveTitle').onclick = async () => {
    const t = $('#fxTitle').value || null, status = $('#fxTitleStatus');
    if (t && !unlockedTitles().includes(t)) return;
    ext().title = t; B.save(); status.textContent = t ? `Title set: “${t}”.` : 'Title removed.';
    if (B.state.playerUsername) { try { await B.online('/title', { title: t }); ext().titleSynced = t; B.save(); status.textContent += ' Your friends will see it.'; } catch (err) { status.textContent += ' Online profile will update later.'; } }
  };
}
function decorateFriendsHeader() {
  const t = ext().title, h = $('.panel h2');
  if (t && h && !$('.fxTitle', h.parentElement)) h.insertAdjacentHTML('afterend', `<span class="pill fxTitle">🏷 ${esc(t)}</span>`);
}
function onFriends(data) {
  const e = ext();
  if (Array.isArray(data?.friends) && data.friends.length > (e.friends || 0)) { e.friends = data.friends.length; B.save(); setTimeout(checkAchievements, 0); }
  const want = e.title && unlockedTitles().includes(e.title) ? e.title : null;
  if (data?.me && (data.me.title ?? null) !== want && !onFriends.pending) {
    onFriends.pending = true;
    B.online('/title', { title: want }).catch(() => {}).finally(() => { onFriends.pending = false; });
  }
  for (const f of data?.friends || []) {
    if (!f.title || !/^[A-Za-z0-9_]{3,20}$/.test(f.username)) continue;
    const strong = $(`[data-trade-invite="${f.username}"]`)?.closest('.friendRow')?.querySelector('strong');
    if (strong && !$('.fxTitle', strong.parentElement)) strong.insertAdjacentHTML('afterend', ` <span class="pill fxTitle">🏷 ${esc(f.title)}</span>`);
  }
}

/* ---------------------------------------------------------------- Shared Three.js stage */
let threePromise = null;
function three() { return threePromise ||= import('/vendor/three.module.min.js').catch(() => null); }
const artCache = new Map();
function loadArt(kind) {
  const sp = B.species[kind], single = kind >= 10, src = single ? `/art/mythlings/${sp.art}.webp` : '/art/mythlings-atlas-v2.png';
  if (!artCache.has(src)) artCache.set(src, new Promise(res => { const img = new Image(); img.decoding = 'async'; img.onload = () => res(img); img.onerror = () => res(null); img.src = src; }));
  return artCache.get(src).then(img => img && (single ? { img, sx: 0, sy: 0, sw: img.width, sh: img.height } : { img, sx: (kind % 5) * img.width / 5, sy: (kind < 5 ? 0 : 1) * img.height / 2, sw: img.width / 5, sh: img.height / 2 }));
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// Draws a printed-card face. onReady fires again when the artwork arrives.
function cardCanvas(c, { w = 512, small = false } = {}, onReady) {
  const h = Math.round(w * 1.42), cv = document.createElement('canvas'), g = cv.getContext('2d'), sp = B.species[c.kind] || B.species[0];
  cv.width = w; cv.height = h;
  const color = B.revealColor(c), u = w / 512;
  const paint = art => {
    g.clearRect(0, 0, w, h);
    roundRect(g, 4 * u, 4 * u, w - 8 * u, h - 8 * u, 34 * u);
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#34405a'); bg.addColorStop(.6, '#172137'); bg.addColorStop(1, '#263249');
    g.fillStyle = bg; g.fill(); g.lineWidth = 14 * u; g.strokeStyle = c.shiny ? '#ffd568' : color; g.stroke();
    const ax = 36 * u, ay = (small ? 36 : 96) * u, as = w - 72 * u;
    g.save(); roundRect(g, ax, ay, as, as, 20 * u); g.clip();
    g.fillStyle = ELEMENT_COLORS[sp.element] || '#556'; g.fillRect(ax, ay, as, as);
    if (art) g.drawImage(art.img, art.sx, art.sy, art.sw, art.sh, ax, ay, as, as);
    g.restore();
    g.lineWidth = 4 * u; g.strokeStyle = '#ffffff55'; roundRect(g, ax, ay, as, as, 20 * u); g.stroke();
    if (!small) {
      g.fillStyle = '#eff8ff'; g.font = `900 ${44 * u}px system-ui,sans-serif`; g.textBaseline = 'middle'; g.fillText(sp.name, 40 * u, 56 * u);
      g.fillStyle = color; g.font = `800 ${30 * u}px system-ui,sans-serif`;
      g.fillText(`${B.rarityLabel(c)}${c.shiny ? ' · ✨ Shiny' : ''}`, 40 * u, ay + as + 50 * u);
      g.fillStyle = '#c9d5ee'; g.font = `600 ${26 * u}px system-ui,sans-serif`;
      g.fillText(`${sp.element} · Level ${c.level || 1}`, 40 * u, ay + as + 92 * u);
      g.fillStyle = '#ffffff66'; g.font = `700 ${20 * u}px system-ui,sans-serif`; g.fillText('EMBERLINGS · FIRST LIGHT', 40 * u, h - 40 * u);
    } else {
      g.fillStyle = '#eff8ff'; g.font = `900 ${34 * u}px system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sp.name, w / 2, ay + as + 52 * u);
    }
  };
  paint(null);
  loadArt(c.kind).then(art => { if (art) { paint(art); onReady?.(); } });
  return cv;
}
function cardBackCanvas() {
  const w = 512, h = 727, cv = document.createElement('canvas'), g = cv.getContext('2d');
  cv.width = w; cv.height = h; roundRect(g, 4, 4, w - 8, h - 8, 34);
  const bg = g.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, h * .7); bg.addColorStop(0, '#7a3b2a'); bg.addColorStop(1, '#1a1030');
  g.fillStyle = bg; g.fill(); g.lineWidth = 14; g.strokeStyle = '#e8bd64'; g.stroke();
  g.fillStyle = '#ffcf70'; g.font = '900 54px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EMBERLINGS', w / 2, h / 2);
  g.font = '120px system-ui'; g.fillText('✦', w / 2, h / 2 - 130);
  return cv;
}
function hasWebGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

async function stage(build, duration, label) {
  if (calm() || !hasWebGL()) return false;
  const T = await three(); if (!T) return false;
  const overlay = document.createElement('div');
  overlay.className = 'fxStage'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-label', label);
  overlay.innerHTML = '<canvas></canvas><button class="fxSkip" type="button">Tap to skip</button><div class="fxFlash"></div>';
  document.body.appendChild(overlay);
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: $('canvas', overlay), antialias: true, alpha: true }); } catch { overlay.remove(); return false; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(45, 1, .1, 100); camera.position.set(0, 0, 8);
  const resize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.position.z = camera.aspect < .8 ? 10.5 : 8; camera.updateProjectionMatrix(); };
  resize(); addEventListener('resize', resize);
  const flash = () => { const f = $('.fxFlash', overlay); f.classList.remove('fxFlashOn'); void f.offsetWidth; f.classList.add('fxFlashOn'); };
  const tick = build({ T, scene, camera, flash });
  let done = false, raf = 0, last = performance.now();
  const t0 = last;
  const finish = () => {
    if (done) return; done = true; cancelAnimationFrame(raf); removeEventListener('resize', resize); removeEventListener('keydown', onKey);
    overlay.classList.add('fxOut');
    setTimeout(() => {
      scene.traverse(o => { o.geometry?.dispose(); for (const m of [].concat(o.material || [])) { m.map?.dispose(); m.dispose(); } });
      renderer.dispose(); renderer.forceContextLoss?.(); overlay.remove();
    }, 380);
  };
  const onKey = e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish(); };
  overlay.addEventListener('click', finish); addEventListener('keydown', onKey);
  const loop = now => {
    if (done) return;
    const t = (now - t0) / 1000, dt = Math.min(.05, (now - last) / 1000); last = now;
    if (document.hidden) { finish(); return; }
    tick(t, dt); renderer.render(scene, camera);
    if (t >= duration) finish(); else raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return true;
}
const easeOutBack = x => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
const ease = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);

function cardMesh(T, c) {
  const group = new T.Group(), geo = new T.PlaneGeometry(2.2, 3.12);
  const frontTex = new T.CanvasTexture(cardCanvas(c, {}, () => { frontTex.needsUpdate = true; }));
  frontTex.colorSpace = T.SRGBColorSpace;
  const backTex = new T.CanvasTexture(cardBackCanvas()); backTex.colorSpace = T.SRGBColorSpace;
  const front = new T.Mesh(geo, new T.MeshBasicMaterial({ map: frontTex, transparent: true }));
  const back = new T.Mesh(geo.clone(), new T.MeshBasicMaterial({ map: backTex, transparent: true })); back.rotation.y = Math.PI;
  group.add(front, back);
  return group;
}
function particles(T, n, color, spread = 1) {
  const pos = new Float32Array(n * 3), vel = [];
  for (let i = 0; i < n; i++) { const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), s = (2 + Math.random() * 5) * spread; vel.push([Math.sin(ph) * Math.cos(th) * s, Math.sin(ph) * Math.sin(th) * s, Math.cos(ph) * s * .4]); }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  const mat = new T.PointsMaterial({ color, size: .14, map: dotTexture(T), transparent: true, opacity: 1, blending: T.AdditiveBlending, depthWrite: false });
  const pts = new T.Points(geo, mat); pts.visible = false;
  pts.userData.update = (t, dt) => {
    for (let i = 0; i < n; i++) { const v = vel[i]; pos[i * 3] += v[0] * dt; pos[i * 3 + 1] += v[1] * dt - .6 * dt * t; pos[i * 3 + 2] += v[2] * dt; v[0] *= .985; v[1] *= .985; v[2] *= .985; }
    geo.attributes.position.needsUpdate = true; mat.opacity = Math.max(0, 1 - t / 2.2);
  };
  return pts;
}
let dotTex = null;
function dotTexture(T) {
  if (dotTex) return dotTex.clone();
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, '#fff'); r.addColorStop(.35, '#ffffffcc'); r.addColorStop(1, '#fff0'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  dotTex = new T.CanvasTexture(c); return dotTex.clone();
}
function ring(T, color) { const m = new T.Mesh(new T.RingGeometry(.92, 1, 72), new T.MeshBasicMaterial({ color, transparent: true, blending: T.AdditiveBlending, side: T.DoubleSide, depthWrite: false })); m.visible = false; return m; }

/* 1. 3D pack opening */
function packReveal3D({ creature: c, rank, color }) {
  const duration = 2.9 + rank * .12, cosmic = c.mutation === 'cosmic' || rank >= 6;
  stage(({ T, scene, flash }) => {
    const col = new T.Color(color);
    scene.add(new T.AmbientLight(0xffffff, .7)); const light = new T.PointLight(col, 30, 20); light.position.set(0, 1, 4); scene.add(light);
    const pack = new T.Group();
    const box = new T.Mesh(new T.BoxGeometry(2, 2.8, .3), new T.MeshStandardMaterial({ color: col, metalness: .55, roughness: .3, emissive: col, emissiveIntensity: .15 }));
    const band = new T.Mesh(new T.BoxGeometry(2.04, .36, .34), new T.MeshStandardMaterial({ color: 0xffdd7a, metalness: .8, roughness: .25 }));
    const seal = new T.Mesh(new T.OctahedronGeometry(.38), new T.MeshStandardMaterial({ color: 0xffffff, emissive: col, emissiveIntensity: .8 })); seal.position.z = .3;
    pack.add(box, band, seal); pack.position.y = -.6; scene.add(pack);
    const pts = particles(T, 90 + rank * 70, col, 1 + rank * .12), shock = ring(T, col), card = cardMesh(T, c);
    card.scale.setScalar(.01); card.rotation.y = Math.PI; card.visible = false;
    const beams = new T.Group();
    for (let i = 0; i < (rank >= 3 ? rank * 2 + 2 : 0); i++) {
      const b = new T.Mesh(new T.PlaneGeometry(.08 + rank * .015, 12), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: .0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      b.rotation.z = (i / (rank * 2 + 2)) * Math.PI * 2; beams.add(b);
    }
    beams.position.z = -1; scene.add(pts, shock, card, beams);
    let burst = false;
    return (t, dt) => {
      if (t < 1.05) {
        const k = ease(t / 1.05);
        pack.position.y = -.6 + .6 * k; pack.rotation.y = Math.sin(t * 5) * .35 * k + t * 1.4;
        const shake = t > .55 ? (t - .55) * .22 : 0; pack.position.x = (Math.random() - .5) * shake; pack.rotation.z = (Math.random() - .5) * shake;
        box.material.emissiveIntensity = .15 + k * 1.2; seal.rotation.y += dt * 6; pack.scale.setScalar(1 + k * .08);
      } else if (!burst) {
        burst = true; pack.visible = false; pts.visible = true; shock.visible = true; card.visible = true; flash();
        sfx.burst(rank); setTimeout(() => sfx.reveal(rank), 250);
      }
      if (burst) {
        const b = t - 1.05;
        pts.userData.update(b, dt);
        shock.scale.setScalar(1 + b * 7); shock.material.opacity = Math.max(0, 1 - b * 1.4);
        const k = clamp(b / .8, 0, 1);
        card.scale.setScalar(Math.max(.01, easeOutBack(k))); card.rotation.y = Math.PI * (1 - ease(b / .9)) + Math.sin(b * 1.3) * .12 * k;
        card.position.y = Math.sin(b * 2) * .08;
        beams.rotation.z += dt * .4; beams.children.forEach(m => { m.material.opacity = Math.min(.22, b * .5) * (1 - clamp((b - 1.4) / 1, 0, 1)); });
        if (cosmic) { const h = (t * .35) % 1; pts.material.color.setHSL(h, .9, .65); shock.material.color.setHSL((h + .3) % 1, .9, .6); beams.children.forEach((m, i) => m.material.color.setHSL((h + i * .07) % 1, .9, .6)); }
        light.intensity = 30 + Math.max(0, 60 - b * 60);
      }
    };
  }, duration, 'Pack reveal animation');
}

/* 3. Fusion */
function onFusion(c) {
  const e = ext(); e.fusions = (e.fusions || 0) + 1; B.save(); setTimeout(checkAchievements, 0);
  if (!c) return;
  sfx.fusion();
  stage(({ T, scene, flash }) => {
    scene.add(new T.AmbientLight(0xffffff, .8));
    const col = new T.Color(B.revealColor(c));
    const orb = hex => { const g = new T.Group(), m = new T.Mesh(new T.SphereGeometry(.42, 24, 16), new T.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 1.4 })), l = new T.PointLight(hex, 18, 8); g.add(m, l); scene.add(g); return g; };
    const a = orb(0x76e8ff), b = orb(0xbd87ff);
    const trail = particles(T, 160, new T.Color(0xbfe9ff), .3); trail.visible = true; scene.add(trail);
    const pts = particles(T, 260, col, 1.2), shock = ring(T, col), shock2 = ring(T, 0xffffff), card = cardMesh(T, c);
    card.visible = false; card.scale.setScalar(.01); scene.add(pts, shock, shock2, card);
    let merged = false;
    return (t, dt) => {
      if (t < 1.45) {
        const k = t / 1.45, r = 2.4 * (1 - ease(k)), ang = t * (3 + 9 * k);
        a.position.set(Math.cos(ang) * r, Math.sin(ang) * r * .55, 0); b.position.set(-Math.cos(ang) * r, -Math.sin(ang) * r * .55, 0);
        a.scale.setScalar(1 + k * .5); b.scale.setScalar(1 + k * .5); trail.userData.update(t * .2, dt * .4);
      } else if (!merged) {
        merged = true; a.visible = b.visible = trail.visible = false; pts.visible = shock.visible = shock2.visible = card.visible = true; flash();
      }
      if (merged) {
        const m = t - 1.45;
        pts.userData.update(m, dt);
        shock.scale.setScalar(1 + m * 8); shock.material.opacity = Math.max(0, 1 - m * 1.3);
        shock2.scale.setScalar(1 + m * 4); shock2.material.opacity = Math.max(0, .8 - m);
        const k = clamp((m - .15) / .8, 0, 1);
        card.scale.setScalar(Math.max(.01, easeOutBack(k))); card.rotation.y = Math.PI * 2 * (1 - ease(k)); card.position.y = Math.sin(m * 2) * .08;
      }
    };
  }, 3.3, 'Fusion animation');
}

/* 6. Card battle feedback */
let battlePrev = null;
function battleFx({ match, side }) {
  const snap = match.sides.map(s => { const c = s.cards.find(c => c.id === s.active); return { id: c?.id, hp: c?.hp, el: c?.element, points: s.points }; });
  const sig = match.sides.map(s => s.name).join('|');
  const prev = battlePrev && battlePrev.sig === sig && (battlePrev.turn || 0) <= (match.turnNumber || 0) ? battlePrev : null;
  battlePrev = { sig, turn: match.turnNumber, snap };
  if (!prev) return;
  const fields = $$('.pocketBoard > .pocketField');
  const fieldFor = i => fields[i === side ? 0 : 1];
  for (let i = 0; i < 2; i++) {
    const a = prev.snap[i], b = snap[i], o = 1 - i, host = fieldFor(i)?.querySelector('.pocketActive') || fieldFor(i);
    if (!host) continue;
    const ko = snap[o].points > prev.snap[o].points && a.id && a.id !== b.id;
    if (a.id && a.id === b.id && b.hp < a.hp) {
      const d = a.hp - b.hp, big = d >= 40 || b.hp <= 0, color = ELEMENT_COLORS[prev.snap[o].el] || '#ffd36c';
      const from = fieldFor(o)?.querySelector('.pocketActive');
      if (from && !calm()) streak(from.getBoundingClientRect(), host.getBoundingClientRect(), color);
      floatText(host.getBoundingClientRect(), `−${d}`, color, big);
      sfx.hit(big); if (big) shake();
      host.classList.remove('fxHitFlash'); void host.offsetWidth; host.classList.add('fxHitFlash');
    } else if (a.id && a.id === b.id && b.hp > a.hp) {
      floatText(host.getBoundingClientRect(), `+${b.hp - a.hp}`, '#7be7b3', false); sfx.heal();
    }
    if (ko) knockout(host.getBoundingClientRect());
  }
}
function fxLayer() { let l = $('#fxLayer'); if (!l) { l = document.createElement('div'); l.id = 'fxLayer'; l.setAttribute('aria-hidden', 'true'); document.body.appendChild(l); } return l; }
function floatText(rect, text, color, big) {
  const el = document.createElement('div'); el.className = 'fxFloat' + (big ? ' fxBig' : ''); el.textContent = text; el.style.color = color;
  el.style.left = rect.left + rect.width / 2 + 'px'; el.style.top = rect.top + rect.height * .35 + 'px';
  fxLayer().appendChild(el); setTimeout(() => el.remove(), 1300);
}
function streak(a, b, color) {
  const x1 = a.left + a.width / 2, y1 = a.top + a.height / 2, x2 = b.left + b.width / 2, y2 = b.top + b.height / 2, len = Math.hypot(x2 - x1, y2 - y1);
  const el = document.createElement('div'); el.className = 'fxStreak';
  Object.assign(el.style, { left: x1 + 'px', top: y1 + 'px', width: len + 'px', transform: `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)`, '--fx-color': color });
  fxLayer().appendChild(el); setTimeout(() => el.remove(), 600);
}
function shake() { if (calm()) return; const arena = $('.cardArena') || $('#app'); arena.classList.remove('fxShake'); void arena.offsetWidth; arena.classList.add('fxShake'); }
function knockout(rect) {
  sfx.ko();
  const el = document.createElement('div'); el.className = 'fxKO'; el.textContent = 'KNOCKOUT!';
  el.style.left = rect.left + rect.width / 2 + 'px'; el.style.top = rect.top + rect.height / 2 + 'px';
  fxLayer().appendChild(el); setTimeout(() => el.remove(), 1600);
  if (!calm()) { const v = document.createElement('div'); v.className = 'fxVignette'; fxLayer().appendChild(v); setTimeout(() => v.remove(), 750); }
}
function onCardResult(r) {
  battlePrev = null;
  if (r.online && r.victory) { const e = ext(), now = Date.now(); if (now - (e.lastOnlineWinAt || 0) > 5000) { e.onlineWins = (e.onlineWins || 0) + 1; e.lastOnlineWinAt = now; B.save(); setTimeout(checkAchievements, 0); } }
  if (r.victory) { sfx.win(); burstConfetti(60); } else if (!r.draw) sfx.lose();
}

/* 7. Coin rain and ticking counter */
function coinRain({ amount, from, to, rect }) {
  if (!(amount > 0)) return;
  sfx.coins(amount);
  tickCounter(from, to);
  if (calm()) return;
  const src = rect || $('#vaultCollectAll')?.getBoundingClientRect() || { left: innerWidth / 2 - 40, top: innerHeight / 2, width: 80, height: 20 };
  const dest = $('.top .coins')?.getBoundingClientRect() || { left: innerWidth - 80, top: 10, width: 60, height: 30 };
  const n = clamp(Math.round(Math.log10(amount + 1) * 6), 6, 36), layer = fxLayer();
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div'); el.className = 'fxCoin'; el.textContent = '🪙';
    const sx = src.left + src.width / 2, sy = src.top + src.height / 2, mx = sx + (Math.random() - .5) * 260, my = sy - 60 - Math.random() * 140;
    const dx = dest.left + dest.width / 2, dy = dest.top + dest.height / 2;
    layer.appendChild(el);
    el.animate([{ transform: `translate(${sx}px,${sy}px) scale(.4)`, opacity: 0 }, { transform: `translate(${mx}px,${my}px) scale(1.1) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: .4 }, { transform: `translate(${dx}px,${dy}px) scale(.5) rotate(720deg)`, opacity: .9 }],
      { duration: 900 + Math.random() * 400, delay: i * 25, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'both' }).finished.then(() => el.remove(), () => el.remove());
  }
}
function tickCounter(from, to) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || calm()) return;
  const t0 = performance.now(), dur = 1100;
  const step = now => {
    const box = $('.top .coins'); if (!box) return;
    const el = $('b', box) || box, pre = el === box ? '🪙 ' : '';
    const k = ease((now - t0) / dur); el.textContent = pre + Math.round(from + (to - from) * k).toLocaleString();
    box.classList.add('fxCoinPulse');
    if (k < 1) requestAnimationFrame(step); else { el.textContent = pre + Math.floor(B.state.coins).toLocaleString(); el.classList.remove('fxCoinPulse'); box.classList.remove('fxCoinPulse'); }
  };
  requestAnimationFrame(step);
}
function burstConfetti(n) {
  if (calm()) return;
  const layer = fxLayer(), colors = ['#ffd568', '#76e8ff', '#bd87ff', '#ff88d4', '#7be7b3'];
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div'); el.className = 'fxConfetti'; el.style.background = colors[i % colors.length];
    const x = innerWidth * (.2 + Math.random() * .6), y = innerHeight * .3;
    layer.appendChild(el);
    el.animate([{ transform: `translate(${x}px,${y}px) rotate(0)`, opacity: 1 }, { transform: `translate(${x + (Math.random() - .5) * 500}px,${y + 250 + Math.random() * 400}px) rotate(${Math.random() * 900}deg)`, opacity: 0 }],
      { duration: 1400 + Math.random() * 900, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }).finished.then(() => el.remove(), () => el.remove());
  }
}

/* 2 + 8. Tilt, glare and holographic sheen on printed cards; 9. idle life in the binder */
let decoratePending = false;
function scheduleDecorate() { if (decoratePending) return; decoratePending = true; requestAnimationFrame(() => { decoratePending = false; decorateCards(); }); }
const elementOf = name => B.species.find(s => s.name === name)?.element;
function decorateCards() {
  for (const card of $$('.printCard:not([data-fx])')) {
    card.dataset.fx = '1';
    const rank = +(card.className.match(/rarity-(\d)/)?.[1] || 0), shiny = card.classList.contains('shinyCard'), hidden = card.classList.contains('silhouetteCard');
    card.insertAdjacentHTML('beforeend', `<span class="fxGlare" aria-hidden="true"></span>${!hidden && (rank >= 2 || shiny) ? `<span class="fxHolo fxHolo${Math.min(rank, 6)}" aria-hidden="true"></span>` : ''}`);
    const art = $('.cardArt > .mythlingArt', card);
    if (art && card.closest('.binderPocket, .packResults, .fxIdle') && !hidden) {
      const name = (art.getAttribute('aria-label') || '').split(' · ')[0];
      art.dataset.fxIdle = (elementOf(name) || 'any').toLowerCase();
      art.style.setProperty('--fx-delay', (-Math.random() * 6).toFixed(2) + 's');
    }
  }
}
function setupTilt() {
  let current = null;
  const reset = () => { if (!current) return; current.classList.remove('fxTilting'); current.style.removeProperty('--fx-rx'); current.style.removeProperty('--fx-ry'); current = null; };
  document.addEventListener('pointermove', e => {
    if (calm() || e.pointerType === 'touch' && e.buttons === 0) return;
    const card = e.target.closest?.('.printCard');
    if (card !== current) reset();
    if (!card || card.closest('.pocketBoard')) return;
    current = card;
    const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    card.classList.add('fxTilting');
    card.style.setProperty('--fx-rx', ((.5 - y) * 16).toFixed(2) + 'deg'); card.style.setProperty('--fx-ry', ((x - .5) * 18).toFixed(2) + 'deg');
    card.style.setProperty('--fx-gx', (x * 100).toFixed(1) + '%'); card.style.setProperty('--fx-gy', (y * 100).toFixed(1) + '%');
  }, { passive: true });
  document.addEventListener('pointerleave', reset, true);
  document.addEventListener('scroll', reset, { passive: true });
  // Phones: tilting the device moves the holographic sheen on every visible card.
  addEventListener('deviceorientation', e => {
    if (calm() || e.gamma == null) return;
    document.documentElement.style.setProperty('--fx-tilt-x', (50 + clamp(e.gamma, -45, 45)).toFixed(1) + '%');
    document.documentElement.style.setProperty('--fx-tilt-y', (50 + clamp((e.beta || 0) - 40, -45, 45)).toFixed(1) + '%');
  }, { passive: true });
}

/* 10. Living world map */
function decorateMap() {
  const wrap = $('#mapWrap'), world = $('#world'); if (!wrap || !world || $('.fxSky', wrap) || wrap.classList.contains('uiMap')) return;
  const hour = new Date().getHours(), phase = hour >= 5 && hour < 8 ? 'dawn' : hour >= 8 && hour < 17 ? 'day' : hour >= 17 && hour < 20 ? 'dusk' : 'night';
  wrap.insertAdjacentHTML('beforeend', `<div class="fxSky fxSky-${phase}" aria-hidden="true">${phase === 'night' ? Array.from({ length: 24 }, () => `<i style="left:${Math.random() * 100}%;top:${Math.random() * 60}%;animation-delay:${(Math.random() * 3).toFixed(2)}s"></i>`).join('') : ''}</div><div class="fxClouds" aria-hidden="true">${Array.from({ length: 5 }, (_, i) => `<span style="top:${8 + i * 17}%;animation-duration:${55 + i * 17}s;animation-delay:${-i * 13}s;transform:scale(${.7 + (i % 3) * .3})"></span>`).join('')}</div>`);
  const nodes = $$('[data-level]', world).sort((a, b) => a.dataset.level - b.dataset.level);
  const pts = nodes.map(n => [n.offsetLeft + n.offsetWidth / 2, n.offsetTop + n.offsetHeight / 2]);
  const cleared = B.state.cleared || [], next = nodes.find(n => !n.classList.contains('done') && !n.classList.contains('locked'));
  const reach = next ? +next.dataset.level : Math.max(1, ...cleared);
  if (pts.length < 2) return;
  const d = i => pts.slice(0, i).map((p, j) => (j ? 'L' : 'M') + p[0].toFixed(0) + ' ' + p[1].toFixed(0)).join(' ');
  const done = d(Math.max(1, reach - 1)), lead = reach >= 2 ? `M${pts[reach - 2][0]} ${pts[reach - 2][1]} L${pts[reach - 1][0]} ${pts[reach - 1][1]}` : '';
  world.insertAdjacentHTML('afterbegin', `<svg class="fxTrail" width="1800" height="1080" viewBox="0 0 1800 1080" aria-hidden="true"><path class="fxTrailAll" d="${d(pts.length)}"/><path class="fxTrailDone" d="${done}" pathLength="1"/>${lead ? `<path class="fxTrailNext" d="${lead}"/>` : ''}</svg>`);
  next?.classList.add('fxNext');
}

/* ---------------------------------------------------------------- Styles */
function injectStyles() {
  const css = `
.fxMute{background:#18234b;border:1px solid #7889b8;color:#fff;border-radius:99px;width:38px;height:38px;font-size:17px;cursor:pointer;margin-left:auto;margin-right:8px;flex-shrink:0}
.top{display:flex;align-items:center}
.fxTile .emoji{filter:drop-shadow(0 0 8px #ffd56888)}
.fxTitlePill,.fxTitle{background:linear-gradient(90deg,#5a3e12,#7b5a1b)!important;color:#ffe4a0!important;border:1px solid #e8bd64;font-size:11px}
.fxBackup textarea{width:100%;background:#0e1730;color:#cfe3ff;border:1px solid #7787a1;border-radius:8px;padding:8px;font:12px ui-monospace,monospace;word-break:break-all}
.fxBackup summary{cursor:pointer;font-weight:800}.fxFileLabel{cursor:pointer}
.fxAlbum{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px;margin:16px 0}
.fxPage{text-align:center;border:2px solid color-mix(in srgb,var(--fx-el) 55%,transparent);position:relative;overflow:hidden;margin:0}
.fxPageDone{border-color:#ffd568;box-shadow:0 0 22px #ffd56855;background:linear-gradient(160deg,#3b3552,#18234b)}
.fxPageArt{width:110px;height:110px;margin:4px auto}.fxPageArt .mythlingPortrait{width:110px;height:110px}.fxUnknown{font-size:64px;filter:brightness(0);opacity:.45;line-height:110px}
.fxPage h3{margin:6px 0 2px}.fxStamps{display:flex;gap:6px;justify-content:center;margin-top:8px}
.fxStamp{display:grid;place-items:center;align-content:center;gap:1px;width:56px;height:56px;border-radius:50%;border:2px dashed #6c7aa3;color:#8090b8;font-size:16px;background:#111a33;padding:0}
.fxStamp small{font-size:7.5px;line-height:1;letter-spacing:-.02em}.fxClaimed{border:2px solid #ffd568;color:#ffe4a0;background:radial-gradient(circle,#6a5320,#2c2412)}
.fxReady{border:2px solid #7be7b3;color:#d6ffe9;background:radial-gradient(circle,#1f6a4b,#123326);cursor:pointer;animation:fxPulse 1.4s ease-in-out infinite}
.fxPageBadge{color:#ffd568;font-weight:900;margin:8px 0 0}
.fxAchList{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px;margin:16px 0}
.fxAch{display:flex;gap:12px;align-items:flex-start;opacity:.72;margin:0}.fxAch h3{margin:0 0 4px}.fxAch p{margin:4px 0}.fxAchDone{opacity:1;border:1px solid #e8bd64;box-shadow:0 0 16px #e8bd6433}
.fxAchIcon{font-size:30px;filter:grayscale(1)}.fxAchDone .fxAchIcon{filter:none}
.fxSelect{background:#18243b;color:#e1e7f2;border:1px solid #7787a1;border-radius:7px;padding:10px;min-height:40px;min-width:200px}
.fxBanner{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:9000;display:flex;gap:12px;align-items:center;background:linear-gradient(135deg,#4a3410,#1d1630);border:2px solid #ffd568;border-radius:16px;padding:12px 18px;box-shadow:0 10px 40px #000a,0 0 30px #ffd56855;color:#fff;cursor:pointer;animation:fxDrop .5s cubic-bezier(.2,1.4,.4,1);max-width:calc(100vw - 24px)}
.fxBanner strong{display:block;color:#ffe4a0}.fxBanner small{color:#e8eefc}.fxBannerIcon{font-size:30px}.fxBanner.fxOut{opacity:0;transform:translate(-50%,-20px);transition:.4s}
.fxStage{position:fixed;inset:0;z-index:9500;background:radial-gradient(circle at 50% 45%,#2b2160ee,#070a1cf5 70%);cursor:pointer;animation:fxFade .25s}
.fxStage canvas{width:100%;height:100%;display:block}.fxStage.fxOut{opacity:0;transition:opacity .35s}
.fxSkip{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);background:#0009;color:#dfe9ff;border:1px solid #fff4;border-radius:99px;padding:8px 16px;font-size:12px}
.fxFlash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}.fxFlashOn{animation:fxFlash .55s ease-out}
#fxLayer{position:fixed;inset:0;pointer-events:none;z-index:9400;overflow:hidden}
.fxFloat{position:fixed;transform:translate(-50%,-50%);font:900 30px system-ui,sans-serif;text-shadow:0 2px 0 #000,0 0 14px currentColor;animation:fxRise 1.2s ease-out forwards}.fxBig{font-size:46px}
.fxStreak{position:fixed;height:8px;margin-top:-4px;transform-origin:0 50%;border-radius:8px;background:linear-gradient(90deg,transparent,var(--fx-color),#fff);box-shadow:0 0 18px var(--fx-color);animation:fxStreak .5s ease-out forwards}
.fxKO{position:fixed;transform:translate(-50%,-50%);font:900 44px system-ui,sans-serif;color:#ffd568;letter-spacing:.08em;text-shadow:0 3px 0 #6b2a00,0 0 30px #ff7a3c;animation:fxKO 1.5s ease-out forwards;white-space:nowrap}
.fxVignette{position:fixed;inset:0;background:radial-gradient(circle,transparent 35%,#ffb24a66 100%);animation:fxFade .7s ease-out reverse forwards}
.fxShake{animation:fxShake .45s cubic-bezier(.36,.07,.19,.97)}
.fxHitFlash .mythCard{animation:fxHit .4s ease-out}
.fxCoin{position:fixed;left:0;top:0;font-size:22px;will-change:transform}
.fxCoinPulse{color:#ffe4a0;text-shadow:0 0 12px #ffd568}
.fxConfetti{position:fixed;left:0;top:0;width:9px;height:14px;border-radius:2px}
.printCard{transition:transform .35s ease}
.printCard.fxTilting{transform:perspective(800px) rotateX(var(--fx-rx,0)) rotateY(var(--fx-ry,0)) scale(1.03);transition:transform .06s linear;z-index:2}
.fxGlare,.fxHolo{position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:4}
.fxGlare{opacity:0;background:radial-gradient(circle at var(--fx-gx,50%) var(--fx-gy,50%),#ffffff66,transparent 55%);transition:opacity .2s}
.fxTilting .fxGlare{opacity:1}
.fxHolo{mix-blend-mode:color-dodge;opacity:.22;background:linear-gradient(115deg,transparent 20%,#ff88d4 32%,#ffd568 40%,#7be7b3 48%,#76e8ff 56%,#bd87ff 64%,transparent 76%);background-size:250% 250%;background-position:var(--fx-gx,var(--fx-tilt-x,50%)) var(--fx-gy,var(--fx-tilt-y,50%))}
.fxTilting .fxHolo{opacity:.42}
.fxHolo4,.fxHolo5{opacity:.3}.fxHolo6{opacity:.38;background-image:conic-gradient(from 0deg,#ff88d4,#ffd568,#7be7b3,#76e8ff,#bd87ff,#ff88d4)}
.mythlingArt[data-fx-idle]{will-change:transform;animation:fxBreathe 5s ease-in-out infinite;animation-delay:var(--fx-delay,0s);transform-origin:50% 80%}
.mythlingArt[data-fx-idle=water]{animation-name:fxBob}
.mythlingArt[data-fx-idle=wind],.mythlingArt[data-fx-idle=nature]{animation-name:fxSway}
.mythlingArt[data-fx-idle=ice]{animation-name:fxBreathe,fxShiver;animation-duration:5s,7s}
.mapWrap{position:relative}
.fxSky,.fxClouds{position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:inherit}
.fxSky-dawn{background:linear-gradient(180deg,#ff9fb455,transparent 60%)}.fxSky-dusk{background:linear-gradient(180deg,#ff8a4a55,#6a2f6a33)}.fxSky-night{background:linear-gradient(180deg,#0a0f3a99,#0a0f3a55);mix-blend-mode:multiply}
.fxSky i{position:absolute;width:3px;height:3px;background:#fff;border-radius:50%;animation:fxStar 3s ease-in-out infinite;mix-blend-mode:normal}
.fxClouds span{position:absolute;left:-30%;width:260px;height:70px;background:radial-gradient(ellipse at 30% 60%,#ffffff40,transparent 60%),radial-gradient(ellipse at 65% 45%,#ffffff38,transparent 62%);animation:fxCloud linear infinite}
.fxTrail{position:absolute;left:0;top:0;pointer-events:none;overflow:visible}
.fxTrail path{fill:none;stroke-linecap:round;stroke-linejoin:round}
.fxTrailAll{stroke:#ffffff22;stroke-width:5;stroke-dasharray:2 12}
.fxTrailDone{stroke:#ffd568;stroke-width:6;stroke-dasharray:1;stroke-dashoffset:1;animation:fxDraw 2.4s ease-out .2s forwards}
.fxTrailNext{stroke:#76e8ff;stroke-width:5;stroke-dasharray:10 10;animation:fxMarch 1s linear infinite}
.node.fxNext{animation:fxNode 1.6s ease-in-out infinite;z-index:3}
@keyframes fxPulse{50%{box-shadow:0 0 0 6px #7be7b333}}
@keyframes fxDrop{from{transform:translate(-50%,-80px);opacity:0}}
@keyframes fxFade{from{opacity:0}}
@keyframes fxFlash{0%{opacity:.9}100%{opacity:0}}
@keyframes fxRise{0%{transform:translate(-50%,-50%) scale(.5);opacity:0}15%{transform:translate(-50%,-60%) scale(1.25);opacity:1}100%{transform:translate(-50%,-160%) scale(1);opacity:0}}
@keyframes fxStreak{0%{clip-path:inset(0 100% 0 0);opacity:1}50%{clip-path:inset(0 0 0 0);opacity:1}100%{clip-path:inset(0 0 0 100%);opacity:0}}
@keyframes fxKO{0%{transform:translate(-50%,-50%) scale(2.6);opacity:0}18%{transform:translate(-50%,-50%) scale(1);opacity:1}80%{opacity:1}100%{transform:translate(-50%,-70%) scale(1.05);opacity:0}}
@keyframes fxShake{10%,90%{transform:translate(-2px,1px)}20%,80%{transform:translate(4px,-2px)}30%,50%,70%{transform:translate(-7px,3px)}40%,60%{transform:translate(7px,-3px)}}
@keyframes fxHit{0%{filter:brightness(3) saturate(0)}100%{filter:none}}
@keyframes fxBreathe{0%,100%{transform:scale(1.02)}45%{transform:scale(1.05) translateY(-1%)}}
@keyframes fxBob{0%,100%{transform:scale(1.05) translateY(1%)}50%{transform:scale(1.05) translateY(-2%)}}
@keyframes fxSway{0%,100%{transform:scale(1.06) rotate(-1.2deg)}50%{transform:scale(1.06) rotate(1.2deg)}}
@keyframes fxShiver{0%,90%,100%{translate:0}92%{translate:-1px 0}94%{translate:1px 0}96%{translate:-1px 0}98%{translate:1px 0}}
@keyframes fxStar{50%{opacity:.2}}
@keyframes fxCloud{from{transform:translateX(0)}to{transform:translateX(160vw)}}
@keyframes fxDraw{to{stroke-dashoffset:0}}
@keyframes fxMarch{to{stroke-dashoffset:-20}}
@keyframes fxNode{0%,100%{box-shadow:0 0 18px #83d4ff}50%{box-shadow:0 0 0 10px #76e8ff33,0 0 34px #76e8ff;transform:scale(1.12)}}
.reduceMotion .fxStage,.reduceMotion .fxClouds,.reduceMotion #fxLayer{display:none}
@media(prefers-reduced-motion:reduce){.fxStage,.fxClouds,#fxLayer{display:none}}`;
  const style = document.createElement('style'); style.id = 'emberEnhancements'; style.textContent = css; document.head.appendChild(style);
}

// Start last so every module-level binding above is initialised.
if (B) start();
