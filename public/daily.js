// Daily play: a 7-day login reward streak, three daily quests and a weekly challenge.
// Everything is kept in the save under state.daily; rewards are granted inside one saved transaction.
const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fmt = n => Math.floor(Number(n) || 0).toLocaleString();

/* ---------- Calendar helpers (player's local time) */
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
const weekKey = (d = new Date()) => { const m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return 'W' + dayKey(m); };
const untilMidnight = () => { const d = new Date(), n = new Date(d); n.setHours(24, 0, 0, 0); const m = Math.round((n - d) / 60000); return `${Math.floor(m / 60)}h ${m % 60}m`; };
const hash = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/* ---------- Rewards */
export const STREAK = [{ coins: 100 }, { coins: 150 }, { pass: 1 }, { coins: 250 }, { coins: 300 }, { coins: 400 }, { pack: 'star' }];
export const QUESTS = [
  { id: 'win2', text: 'Win 2 battles', goal: 2, coins: 200, icon: '⚔️' },
  { id: 'win3', text: 'Win 3 battles', goal: 3, coins: 300, icon: '🏆' },
  { id: 'pack', text: 'Open a pack', goal: 1, coins: 150, icon: '🎁' },
  { id: 'train', text: 'Finish a rewarded training session', goal: 1, coins: 150, icon: '🎯' },
  { id: 'level', text: 'Level up any Mythling', goal: 1, coins: 200, icon: '⬆️' },
  { id: 'vault', text: 'Collect coins from the Vault', goal: 1, coins: 150, icon: '🏦' },
  { id: 'fuse', text: 'Fuse two Mythlings', goal: 1, coins: 250, icon: '🧪' },
  { id: 'trade', text: 'Trade with a friend', goal: 1, coins: 300, icon: '🤝', online: true }
];
export const WEEKLY = { id: 'wins10', text: 'Win 10 battles this week', goal: 10, pack: 'crystal' };
const rewardText = r => r.coins ? `${fmt(r.coins)} coins` : r.pass ? 'Academy Pass' : r.pack ? `Free ${packName(r.pack)}` : '';
const rewardIcon = r => r.coins ? '🪙' : r.pass ? '🎟️' : '🎁';
const packName = id => (B.packCatalog?.() || []).find(p => p.id === id)?.name || 'Pack';

function grant(st, r) {
  if (r.coins) st.coins = (st.coins || 0) + r.coins;
  if (r.pass) { st.items = st.items || {}; st.items.trainingPasses = (st.items.trainingPasses || 0) + r.pass; }
  if (r.pack) { st.rewardPacks = st.rewardPacks || []; st.rewardPacks.push({ id: crypto.randomUUID(), packId: r.pack }); }
}

/* ---------- State */
export function pickQuests(day, online, seed = '') {
  const pool = QUESTS.filter(q => online || !q.online), out = [];
  let h = hash(day + '|' + seed);
  while (out.length < 3 && out.length < pool.length) { const q = pool[h % pool.length]; if (!out.includes(q) && !(q.id.startsWith('win') && out.some(o => o.id.startsWith('win')))) out.push(q); h = hash(String(h)); }
  return out.map(q => ({ id: q.id, progress: 0, claimed: false }));
}
export function daily(st = B.state) {
  const today = dayKey(), week = weekKey();
  const d = st.daily = st.daily || {};
  if (d.day !== today) {
    d.day = today; d.quests = pickQuests(today, !!st.playerUsername, st.playerUsername || ''); d.bonusClaimed = false;
    d.trainSeen = st.practiceBudget?.used || 0; d.packSeen = st.packCount || 0;
  }
  if (d.week !== week) { d.week = week; d.weekly = { progress: 0, claimed: false }; }
  d.streak = d.streak || 0;
  return d;
}
const loginReady = d => d.lastClaim !== dayKey();
const nextStreakDay = d => (d.lastClaim === yesterday() ? d.streak % 7 : 0); // index into STREAK for today's claim
const anyReady = d => loginReady(d) || d.quests.some(q => !q.claimed && q.progress >= QUESTS.find(x => x.id === q.id).goal) || (!d.bonusClaimed && d.quests.every(q => q.claimed)) || (!d.weekly.claimed && d.weekly.progress >= WEEKLY.goal);

export function bump(id, n = 1) {
  const st = B.state, d = daily(st); let changed = false;
  for (const q of d.quests) if (q.id === id || (id === 'win' && q.id.startsWith('win'))) { const goal = QUESTS.find(x => x.id === q.id).goal; if (q.progress < goal) { q.progress = Math.min(goal, q.progress + n); changed = true; } }
  if (id === 'win' && d.weekly.progress < WEEKLY.goal) { d.weekly.progress = Math.min(WEEKLY.goal, d.weekly.progress + n); changed = true; }
  if (changed) { B.save(); paintButton(); }
  return changed;
}

function claim(kind, id) {
  let reward = null, ok = false;
  ok = B.transact(() => {
    const st = B.state, d = daily(st);
    if (kind === 'login') { if (!loginReady(d)) throw Error('Already claimed'); const i = nextStreakDay(d); reward = STREAK[i]; d.streak = i + 1; d.lastClaim = dayKey(); }
    else if (kind === 'quest') { const q = d.quests.find(x => x.id === id), def = QUESTS.find(x => x.id === id); if (!q || q.claimed || q.progress < def.goal) throw Error('Not ready'); q.claimed = true; reward = { coins: def.coins }; }
    else if (kind === 'bonus') { if (d.bonusClaimed || !d.quests.every(q => q.claimed)) throw Error('Not ready'); d.bonusClaimed = true; reward = { pass: 1 }; }
    else if (kind === 'weekly') { if (d.weekly.claimed || d.weekly.progress < WEEKLY.goal) throw Error('Not ready'); d.weekly.claimed = true; reward = { pack: WEEKLY.pack }; }
    grant(st, reward);
  });
  if (ok && reward) { B.toast(`${rewardIcon(reward)} ${rewardText(reward)} collected!`); paint(); paintButton(); if (B.view === 'home') B.go('home'); }
  return ok;
}

/* ---------- Panel */
function html() {
  const d = daily(), streakIdx = loginReady(d) ? nextStreakDay(d) : (d.streak - 1);
  const days = STREAK.map((r, i) => { const done = i < streakIdx || (!loginReady(d) && i === streakIdx), today = i === streakIdx; return `<li class="${done ? 'done' : ''} ${today ? 'today' : ''}"><small>Day ${i + 1}</small><span>${done ? '✓' : rewardIcon(r)}</span><b>${esc(rewardText(r))}</b></li>`; }).join('');
  const quests = d.quests.map(q => { const def = QUESTS.find(x => x.id === q.id), ready = !q.claimed && q.progress >= def.goal; return `<li class="${q.claimed ? 'claimed' : ''}"><span class="dqIcon">${def.icon}</span><div><b>${esc(def.text)}</b><div class="dqBar"><i style="width:${(q.progress / def.goal) * 100}%"></i></div><small>${q.progress} / ${def.goal} · ${fmt(def.coins)} coins</small></div>${q.claimed ? '<span class="dqDone">✓ Done</span>' : `<button type="button" class="dqClaim" data-claim-quest="${q.id}" ${ready ? '' : 'disabled'}>Claim</button>`}</li>`; }).join('');
  const allDone = d.quests.every(q => q.claimed), wk = d.weekly, wkReady = !wk.claimed && wk.progress >= WEEKLY.goal;
  return `<div class="tdBox dBox"><button type="button" class="dX" aria-label="Close">×</button><h2 id="dailyTitle">Daily rewards</h2>
   <section><h3>Login streak <small>Come back every day: day 7 gives a free ${esc(packName('star'))}.</small></h3><ol class="dStreak">${days}</ol>
    <button type="button" class="dBig" id="dClaimLogin" ${loginReady(d) ? '' : 'disabled'}>${loginReady(d) ? `Claim day ${streakIdx + 1}: ${esc(rewardText(STREAK[streakIdx]))}` : '✓ Claimed today. See you tomorrow!'}</button></section>
   <section><h3>Today's quests <small>New quests in ${untilMidnight()}</small></h3><ul class="dQuests">${quests}</ul>
    <div class="dBonus ${d.bonusClaimed ? 'claimed' : ''}"><span>🎟️ Finish all three for a bonus <b>Academy Pass</b></span>${d.bonusClaimed ? '<span class="dqDone">✓ Done</span>' : `<button type="button" class="dqClaim" id="dClaimBonus" ${allDone ? '' : 'disabled'}>Claim</button>`}</div></section>
   <section><h3>Weekly challenge <small>Resets on Monday</small></h3><div class="dWeek ${wk.claimed ? 'claimed' : ''}"><span class="dqIcon">🗓️</span><div><b>${esc(WEEKLY.text)}</b><div class="dqBar"><i style="width:${(wk.progress / WEEKLY.goal) * 100}%"></i></div><small>${wk.progress} / ${WEEKLY.goal} · Reward: free ${esc(packName(WEEKLY.pack))}</small></div>${wk.claimed ? '<span class="dqDone">✓ Done</span>' : `<button type="button" class="dqClaim" id="dClaimWeek" ${wkReady ? '' : 'disabled'}>Claim</button>`}</div></section></div>`;
}
function bindPanel(el) {
  $('.dX', el).onclick = close;
  $('#dClaimLogin', el)?.addEventListener('click', () => claim('login'));
  $('#dClaimBonus', el)?.addEventListener('click', () => claim('bonus'));
  $('#dClaimWeek', el)?.addEventListener('click', () => claim('weekly'));
  $$('[data-claim-quest]', el).forEach(b => b.onclick = () => claim('quest', b.dataset.claimQuest));
}
function paint() { const el = $('#dailyPanel'); if (!el) return; el.innerHTML = html(); bindPanel(el); }
function close() { $('#dailyPanel')?.remove(); }
export function open() {
  close(); daily(); B.save();
  const el = document.createElement('div'); el.id = 'dailyPanel'; el.className = 'tradeDone'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'dailyTitle');
  el.innerHTML = html(); document.body.append(el); bindPanel(el);
  el.onclick = e => { if (e.target === el) close(); };
  ($('#dClaimLogin:not(:disabled)', el) || $('.dX', el)).focus({ preventScroll: true });
}

/* ---------- Home button */
const SHOW_ON = ['home', 'map', 'packs', 'inventory', 'friends', 'trading', 'training'];
function paintButton() {
  let b = $('#dailyBtn');
  if (!SHOW_ON.includes(B.view) || $('#guidedTour')) { b?.remove(); return; }
  if (!b) { b = document.createElement('button'); b.id = 'dailyBtn'; b.type = 'button'; b.className = 'dailyBtn'; b.onclick = open; document.body.append(b); }
  const ready = anyReady(daily());
  b.innerHTML = `<span aria-hidden="true">🎁</span> Daily${ready ? '<i class="dailyDot" aria-hidden="true"></i>' : ''}`;
  b.setAttribute('aria-label', ready ? 'Daily rewards, a reward is ready' : 'Daily rewards');
  // The painted Training page fills the screen and has buttons in the bottom-right corner, so dock the
  // button over the page's top-right banner picture instead (nothing to tap there).
  const acad = B.view === 'training' && $('.uiXAcademy');
  if (acad) { const r = acad.getBoundingClientRect(); b.classList.add('dailyDock'); b.style.top = Math.max(8, Math.round(r.top + 14)) + 'px'; b.style.right = Math.max(8, Math.round(innerWidth - r.right + 14)) + 'px'; }
  else if (b.classList.contains('dailyDock')) { b.classList.remove('dailyDock'); b.style.top = b.style.right = ''; }
}

/* ---------- Tracking */
function watchCounters() {
  const st = B.state, d = daily(st);
  const used = st.practiceBudget?.used || 0; if (used > (d.trainSeen || 0)) { const n = used - (d.trainSeen || 0); d.trainSeen = used; bump('train', n); } else if (used < (d.trainSeen || 0)) d.trainSeen = used;
  const packs = st.packCount || 0; if (packs > (d.packSeen || 0)) { const n = packs - (d.packSeen || 0); d.packSeen = packs; bump('pack', n); }
}

if (B) {
  addEventListener('ember:cardResult', e => { if (e.detail?.victory) bump('win'); });
  addEventListener('ember:levelUp', () => bump('level'));
  addEventListener('ember:fusion', () => bump('fuse'));
  addEventListener('ember:coins', e => { if ((e.detail?.amount || 0) > 0) bump('vault'); });
  addEventListener('ember:tradeComplete', () => bump('trade'));
  let autoShown = false;
  addEventListener('ember:frame', () => requestAnimationFrame(() => {
    if (!B.state.playerUsername && B.view === 'username') return;
    watchCounters(); paintButton(); if (B.view === 'training') setTimeout(paintButton, 250);
    // Once a day, the first time Home opens, show the panel so the login reward is not missed (not during the beginner guide).
    const d = daily();
    if (!autoShown && B.view === 'home' && !window.EmberComfort?.quiet?.() && loginReady(d) && d.autoDay !== dayKey() && !$('#guidedTour') && !B.state.guidedTour?.active) { autoShown = true; d.autoDay = dayKey(); B.save(); setTimeout(open, 600); }
  }));
  addEventListener('resize', () => { if ($('#dailyBtn.dailyDock')) paintButton(); });
  window.EmberDaily = { open, daily, bump, claim, pickQuests };
}
