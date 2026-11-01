// EMBERLINGS cloud accounts: password login and automatic cloud save for signed-in players.
// The save is gzip-compressed (EMBER2 format, same as Save Backup) and stored with a revision number;
// a newer revision from another device is offered before anything is overwritten.
const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fmt = n => Math.floor(Number(n) || 0).toLocaleString();
const META_KEY = 'mythlings-cloud-v1';
const DEVICE_ONLY = ['recoveryCode'];
const SYNC_EVERY = 15000;

const meta = () => { try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch { return {}; } };
const setMeta = m => { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { } };
function device() {
  const ua = navigator.userAgent, os = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Device';
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${os} · ${br}`;
}
function checksum(t) { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }
const toB64 = b => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
function snapshot() { const s = JSON.parse(JSON.stringify(B.state)); for (const k of DEVICE_ONLY) delete s[k]; return JSON.stringify(s); }
async function encode(json) {
  const bytes = new TextEncoder().encode(JSON.stringify({ game: 'EMBERLINGS', v: 1, at: Date.now(), save: JSON.parse(json) }));
  const zipped = typeof CompressionStream === 'function', body = toB64(zipped ? await pipe(bytes, new CompressionStream('gzip')) : bytes);
  return `${zipped ? 'EMBER2' : 'EMBER1'}.${body}.${checksum(body)}`;
}
async function decode(code) {
  const [kind, body, sum] = code.split('.');
  if (checksum(body) !== sum) throw Error('The cloud save is damaged.');
  let bytes = fromB64(body); if (kind === 'EMBER2') bytes = await pipe(bytes, new DecompressionStream('gzip'));
  const p = JSON.parse(new TextDecoder().decode(bytes)), s = p?.save;
  if (p?.game !== 'EMBERLINGS' || !s || !Array.isArray(s.owned) || !Number.isFinite(s.coins)) throw Error('The cloud save is not valid.');
  return p;
}

/* ---------------------------------------------------------------- Sync */
let busy = false, lastTry = 0, prompted = false;
const signedIn = () => !!B.state.playerUsername && meta().user === B.state.playerUsername && meta().enabled;
async function upload(force = false, always = false) {
  if (busy || !signedIn() || B.busy()) return;
  const json = snapshot(), hash = checksum(json), m = meta();
  if (!force && !always && hash === m.hash) return;
  busy = true; lastTry = Date.now();
  try {
    const r = await fetch('/api/social/save', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: await encode(json), baseRevision: m.revision ?? 0, device: device(), force }) });
    const res = await r.json().catch(() => ({}));
    if (r.status === 409 && res.conflict) { await conflict(res); return; }
    if (!r.ok) throw Error(res.error || 'Cloud save failed.');
    setMeta({ ...meta(), revision: res.revision, hash, savedAt: res.updatedAt });
    paintStatus();
  } catch (e) { console.warn('EMBERLINGS cloud save', e.message); }
  finally { busy = false; }
}
async function fetchCloud() { const r = await fetch('/api/social/save', { credentials: 'same-origin', cache: 'no-store' }); if (!r.ok) throw Error('Could not reach your cloud save.'); return r.json(); }
async function loadCloud(row) {
  const p = await decode(row.data), next = p.save;
  for (const k of DEVICE_ONLY) if (B.state[k] !== undefined) next[k] = B.state[k];
  localStorage.setItem(B.key + '-backup-before-cloud', localStorage.getItem(B.key) || '');
  B.adopt(next);
  setMeta({ ...meta(), user: next.playerUsername || B.state.playerUsername, enabled: true, revision: row.revision, hash: checksum(snapshot()), savedAt: row.updatedAt });
  B.toast('Cloud save loaded.'); setTimeout(() => location.reload(), 400);
}
const summary = s => `${fmt(s.owned?.length)} cards · 🪙 ${fmt(s.coins)} · ${fmt((s.cleared || []).length)} quests`;
async function conflict(info) {
  if (prompted) return; prompted = true;
  let row, cloud; try { row = await fetchCloud(); cloud = (await decode(row.data)).save; } catch (e) { prompted = false; return; }
  const when = new Date(row.updatedAt).toLocaleString();
  const dlg = document.createElement('div'); dlg.className = 'uiCloudDlg'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-labelledby', 'uiCloudDlgT');
  dlg.innerHTML = `<div class="uiCloudBox"><h2 id="uiCloudDlgT">Your account was played on another device</h2>
   <p>Choose which progress to keep. The other one is replaced.</p>
   <button class="uiCloudPick" data-pick="cloud"><b>☁ Load the cloud save</b><span>${esc(row.device || 'Another device')} · ${esc(when)}</span><span>${esc(summary(cloud))}</span></button>
   <button class="uiCloudPick" data-pick="local"><b>💻 Keep this device's save</b><span>${esc(device())} · now</span><span>${esc(summary(B.state))}</span></button>
   <p class="uiCloudNote">The save you don't keep is copied in this browser first, so it can be recovered.</p></div>`;
  document.body.appendChild(dlg); $('[data-pick="cloud"]', dlg).focus();
  dlg.addEventListener('click', async e => {
    const b = e.target.closest('[data-pick]'); if (!b) return;
    dlg.querySelectorAll('button').forEach(x => x.disabled = true);
    if (b.dataset.pick === 'cloud') await loadCloud(row);
    else { localStorage.setItem(B.key + '-backup-cloud-replaced', row.data); setMeta({ ...meta(), revision: row.revision }); dlg.remove(); prompted = false; await upload(true); B.toast('This device\'s save is now in the cloud.'); }
  });
}
const freshSave = s => (s.owned?.length || 0) <= 6 && !(s.packCount > 0) && !(s.cleared || []).length;
async function reconcile(data) {
  // Runs when we know who is signed in: decides between loading the cloud copy and uploading this one.
  if (!data?.me) return;
  const m = meta(), user = data.me.username;
  if (m.user !== user) setMeta({ user, enabled: true, revision: 0, hash: '' });
  const cloudRev = data.cloud?.revision || 0, mine = meta();
  if (!cloudRev) return upload(true);
  if (cloudRev === mine.revision) return upload();
  const dirty = checksum(snapshot()) !== mine.hash;
  if (!mine.revision && freshSave(B.state)) { try { return loadCloud(await fetchCloud()); } catch { return; } }
  if (!dirty && mine.revision) { try { return loadCloud(await fetchCloud()); } catch { return; } }
  return conflict(data.cloud);
}

/* ---------------------------------------------------------------- Account screen */
let account = null;
async function me() { try { const r = await fetch('/api/social/me', { credentials: 'same-origin', cache: 'no-store' }); return r.ok ? r.json() : null; } catch { return null; } }
async function post(path, body) { const r = await fetch('/api/social' + path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const res = await r.json().catch(() => ({})); if (!r.ok) throw Error(res.error || 'That did not work. Try again.'); return res; }
function paintStatus() {
  const el = $('#uiCloudStatus'); if (!el) return; const m = meta();
  el.textContent = signedIn() ? (m.savedAt ? `Saved to the cloud ${new Date(m.savedAt).toLocaleString()}.` : 'Cloud save is on. Your progress uploads automatically.') : 'Cloud save is off on this device.';
}
async function renderAccount() {
  B.render(`<section class="uiAccount"><h1>Account &amp; cloud save</h1><p class="uiAccSub">Log in with your username and password on any computer or phone, and your collection follows you.</p><div class="uiAccBody panel"><p>Loading…</p></div></section>`);
  account = await me(); if (B.view !== 'account') return;
  const body = $('.uiAccBody'); const signed = !!account?.me;
  if (!signed) {
    body.innerHTML = `<h2>Log in</h2><form id="uiLogin" class="uiAccForm"><label>Username<input id="uiLoginName" autocomplete="username" required maxlength="20"></label><label>Password<input id="uiLoginPass" type="password" autocomplete="current-password" required minlength="6" maxlength="128"></label><button class="button gold">Log in</button><p id="uiAccMsg" role="status"></p></form>
     <p class="small muted">New here? <button class="uiLinkBtn" data-go="friends">Choose a username</button>, then set a password on this page. Lost your password? Use your recovery code from “Already have a username?” on the welcome screen.</p>`;
    $('#uiLogin').onsubmit = async e => {
      e.preventDefault(); const btn = $('button', e.target), msg = $('#uiAccMsg'); btn.disabled = true; msg.textContent = 'Logging in…';
      try { const data = await post('/login', { username: $('#uiLoginName').value.trim(), password: $('#uiLoginPass').value }); B.state.playerUsername = data.me.username; B.save(); msg.textContent = 'Logged in.'; await reconcile(data); if (!data.cloud) renderAccount(); }
      catch (err) { msg.textContent = err.message; } finally { btn.disabled = false; }
    };
  } else {
    const m = meta(), c = account.cloud;
    body.innerHTML = `<div class="uiAccRow"><div><span class="uiAccLabel">Username</span><strong>${esc(account.me.username)}</strong></div><button class="button alt" id="uiLogout">Log out on this device</button></div>
     <h2>Password</h2><form id="uiPass" class="uiAccForm">${account.hasPassword ? '<label>Current password<input id="uiPassCur" type="password" autocomplete="current-password" required></label>' : '<p>Set a password so you can log in on other devices.</p>'}
      <label>${account.hasPassword ? 'New password' : 'Password'}<input id="uiPassNew" type="password" autocomplete="new-password" required minlength="6" maxlength="128"></label><label>Repeat password<input id="uiPassRep" type="password" autocomplete="new-password" required minlength="6" maxlength="128"></label>
      <button class="button gold">${account.hasPassword ? 'Change password' : 'Set password'}</button><p id="uiPassMsg" role="status"></p></form>
     <h2>Cloud save</h2><p id="uiCloudStatus"></p><p class="small muted">${c ? `Cloud copy: ${esc(c.device || '')} · ${new Date(c.updatedAt).toLocaleString()}` : 'No cloud copy yet.'}</p><button class="button" id="uiSaveNow">Save to cloud now</button>`;
    paintStatus();
    $('#uiPass').onsubmit = async e => {
      e.preventDefault(); const msg = $('#uiPassMsg'), a = $('#uiPassNew').value, b = $('#uiPassRep').value;
      if (a !== b) { msg.textContent = 'The passwords do not match.'; return; }
      try { await post('/password', { password: a, current: $('#uiPassCur')?.value || '' }); msg.textContent = 'Password saved. You can now log in on other devices.'; e.target.reset(); account.hasPassword = true; }
      catch (err) { msg.textContent = err.message; }
    };
    $('#uiSaveNow').onclick = async () => { if (!signedIn()) setMeta({ user: account.me.username, enabled: true, revision: m.revision || 0, hash: '' }); await upload(false, true); paintStatus(); if (!document.querySelector('.uiCloudDlg')) B.toast('Saved to the cloud.'); };
    $('#uiLogout').onclick = logout;
  }
  B.bind();
}

async function logout() {
  if (!confirm('Log out on this device? Your progress stays in the cloud and on this device.')) return;
  await upload(); try { await post('/logout', {}); } catch { }
  setMeta({}); delete B.state.playerUsername; B.save(); location.reload();
}
window.EmberCloud = { logout };

/* ---------------------------------------------------------------- Wiring */
function linkFromWelcome() {
  for (const host of [$('#uiXRecover'), $('#app details')]) {
    if (!host || host.querySelector('.uiPassLogin')) continue;
    host.insertAdjacentHTML('beforeend', '<p class="uiPassLogin"><button type="button" class="uiLinkBtn" data-go="account">Have a password? Log in here</button></p>');
    B.bind();
  }
}
if (B) {
  B.registerView('account', renderAccount);
  addEventListener('ember:frame', e => { if (e.detail.view === 'username') linkFromWelcome(); });
  addEventListener('ember:friends', e => { if (!prompted) reconcileOnce(e.detail); });
  let reconciled = false;
  function reconcileOnce(data) { if (reconciled || !data?.me) return; reconciled = true; reconcile(data); }
  setTimeout(async () => { if (B.state.playerUsername) reconcileOnce(await me()); }, 2500);
  setInterval(() => { if (Date.now() - lastTry > SYNC_EVERY) upload(); }, 5000);
  addEventListener('visibilitychange', () => { if (document.hidden) upload(); });
  if (B.view === 'username') linkFromWelcome();
}
