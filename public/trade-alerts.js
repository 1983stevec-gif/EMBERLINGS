// Trade alerts: invitation badge on Friends (desktop header and tablet menu), a pop-up when a friend invites you,
// a "Trade complete!" screen showing what you gave and got, and a Past trades list on the trading pages.
const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const name = c => B.species[c.kind]?.name || 'Mythling';
const when = t => { const d = new Date(t), days = Math.floor((Date.now() - t) / 86400000); return days < 1 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? `${days} days ago` : d.toLocaleDateString(); };

/* ---------- Badge on Friends */
function paintBadges() {
  const n = B.tradeNotices || 0;
  for (const tab of $$('.uiPTab[data-go="friends"], .uiTabTile[data-go="friends"]')) {
    let b = $('.uiTradeBadge', tab);
    if (!b) { b = document.createElement('b'); b.className = 'uiTradeBadge'; b.setAttribute('aria-hidden', 'true'); tab.append(b); }
    b.textContent = n > 9 ? '9+' : String(n); b.hidden = !n;
    const base = tab.dataset.baseLabel || (tab.dataset.baseLabel = tab.getAttribute('aria-label') || tab.textContent.trim() || 'Friends');
    tab.setAttribute('aria-label', n ? `${base}, ${n} trade invitation${n > 1 ? 's' : ''}` : base);
  }
}

/* ---------- "You've been invited" pop-up */
const seen = new Set();
function onInvites({ from }) {
  paintBadges();
  const fresh = (from || []).filter(t => !seen.has(t.id)); from?.forEach(t => seen.add(t.id));
  if (!fresh.length || ['trading', 'trade', 'friends', 'cardBattle'].includes(B.view)) return;
  const who = fresh.length === 1 ? `<b>${esc(fresh[0].username)}</b> invited you to trade` : `<b>${fresh.length} friends</b> invited you to trade`;
  $('#tradeAlert')?.remove();
  const el = document.createElement('div'); el.id = 'tradeAlert'; el.className = 'tradeAlert'; el.setAttribute('role', 'status');
  el.innerHTML = `<span class="tradeAlertIcon" aria-hidden="true">🔔</span><p>${who}.</p><button type="button" class="tradeAlertOpen">Open</button><button type="button" class="tradeAlertX" aria-label="Dismiss">×</button>`;
  document.body.append(el);
  $('.tradeAlertOpen', el).onclick = () => { el.remove(); B.go('trading'); };
  $('.tradeAlertX', el).onclick = () => el.remove();
  setTimeout(() => el.remove(), 12000);
}

/* ---------- Trade complete */
const mini = c => `<figure class="tcCard"><div class="tcArt">${B.art(c)}</div><figcaption><b>${esc(name(c))}</b><small>Lv ${c.level || 1}${c.mutation ? ' · ' + esc((B.MUTATIONS || []).find(m => m.id === c.mutation)?.name || c.mutation) : ''}</small></figcaption></figure>`;
function onComplete(h) {
  if (!h) return;
  $('#tradeDone')?.remove();
  const el = document.createElement('div'); el.id = 'tradeDone'; el.className = 'tradeDone'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'tradeDoneTitle');
  el.innerHTML = `<div class="tdBox"><h2 id="tradeDoneTitle">Trade complete!</h2>${h.partner ? `<p class="tdSub">You traded with <b>${esc(h.partner)}</b>.</p>` : ''}
    <div class="tdSides"><section><h3>You gave</h3><div class="tdCards">${h.gave.map(mini).join('') || '<p class="tdNone">—</p>'}</div></section><div class="tdArrow" aria-hidden="true">⇄</div>
    <section class="got"><h3>You got</h3><div class="tdCards">${h.got.map(mini).join('')}</div></section></div>
    <div class="tdBtns"><button type="button" class="tdBinder">See them in My Binder</button><button type="button" class="tdClose">Close</button></div></div>`;
  document.body.append(el);
  const close = () => el.remove();
  $('.tdClose', el).onclick = close; el.onclick = e => { if (e.target === el) close(); };
  $('.tdBinder', el).onclick = () => { close(); B.go('inventory'); };
  addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); removeEventListener('keydown', k); } });
  $('.tdClose', el).focus();
}

/* ---------- Past trades */
function historyHTML() {
  const list = B.state.tradeHistory || [];
  if (!list.length) return '<p class="thEmpty">No trades yet. Your finished trades will be listed here.</p>';
  const row = arr => arr.map(c => `<span class="thMon" title="${esc(name(c))} · Lv ${c.level || 1}"><span class="thArt">${B.art(c)}</span>${esc(name(c))}</span>`).join('<i>+</i>');
  return `<ul class="thList">${list.map(h => `<li><header><b>${h.partner ? esc(h.partner) : 'A friend'}</b><small>${when(h.at)}</small></header><div class="thSwap"><div><em>Gave</em>${row(h.gave) || '—'}</div><span aria-hidden="true">⇄</span><div><em>Got</em>${row(h.got)}</div></div></li>`).join('')}</ul>`;
}
function openHistory() {
  $('#tradeHist')?.remove();
  const el = document.createElement('div'); el.id = 'tradeHist'; el.className = 'tradeDone'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'tradeHistTitle');
  el.innerHTML = `<div class="tdBox thBox"><h2 id="tradeHistTitle">Past trades</h2>${historyHTML()}<div class="tdBtns"><button type="button" class="tdClose">Close</button></div></div>`;
  document.body.append(el);
  const close = () => el.remove();
  $('.tdClose', el).onclick = close; el.onclick = e => { if (e.target === el) close(); };
  $('.tdClose', el).focus();
}
function addHistoryButton() {
  if (B.view !== 'trading' || $('.thOpen')) return;
  const n = (B.state.tradeHistory || []).length;
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'thOpen'; btn.textContent = `🕘 Past trades${n ? ` (${n})` : ''}`; btn.onclick = openHistory;
  const tablet = $('.tpTrading .tpTable'), desk = $('.uiXTrading');
  if (tablet) tablet.after(btn); else if (desk) { btn.classList.add('onCanvas'); desk.append(btn); } else $('#app')?.append(btn);
}

if (B) {
  addEventListener('ember:tradeInvites', e => onInvites(e.detail || {}));
  addEventListener('ember:tradeComplete', e => onComplete(e.detail));
  addEventListener('ember:frame', () => requestAnimationFrame(() => { paintBadges(); addHistoryButton(); setTimeout(addHistoryButton, 300); }));
  requestAnimationFrame(paintBadges);
  window.EmberTrades = { openHistory, historyHTML };
}
