// EMBERLINGS battle enhancements (presentation only; the rules are untouched):
// 1 turn signal · 2 drag cards to play · 3 attack damage preview · 4 attack lunge · 5 knockout embers and
// point to the score · 6 opponent move callouts · 7 hand fan (CSS) · 8 victory / defeat scene.
const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const calm = () => !!B.state.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
let prev = null, seenEvents = new Set(), lastSig = '';

function fields(side) { const f = $$('.pocketBoard > .pocketField'); return { mine: f[0], theirs: f[1] }; }
function layer() { let l = $('#bxLayer'); if (!l) { l = document.createElement('div'); l.id = 'bxLayer'; l.setAttribute('aria-hidden', 'true'); document.body.appendChild(l); } return l; }

/* 1. Turn signal */
function turnSignal(match, side) {
  const arena = $('.cardArena'); if (!arena) return;
  const mine = match.phase === 'turn' && match.turn === side;
  arena.classList.toggle('bxMyTurn', mine);
  const key = match.turnNumber + ':' + match.turn;
  if (mine && prev && prev.turnKey !== key) {
    const b = document.createElement('div'); b.className = 'bxBanner'; b.innerHTML = '<span>Your turn</span>'; b.setAttribute('role', 'status');
    layer().appendChild(b); setTimeout(() => b.remove(), calm() ? 1200 : 1900);
  }
  return key;
}

/* 2. Drag a hand card onto the Active slot or the Bench */
function enableDrag() {
  const { mine } = fields(); if (!mine) return;
  const active = $('.pocketActive', mine), bench = $('.pocketBench', mine);
  for (const card of $$('.handCard')) {
    const toActive = card.querySelector('[data-active]:not(:disabled), [data-hand-select]:not(:disabled)'), toBench = card.querySelector('[data-bench]:not(:disabled)');
    if (!toActive && !toBench) continue;
    card.classList.add('bxDraggable'); card.querySelectorAll('img').forEach(i => i.draggable = false); card.ondragstart = ev => ev.preventDefault(); card.title = 'Drag onto your Active slot' + (toBench ? ' or Bench' : '');
    card.onpointerdown = e => {
      if (e.button !== 0 || e.target.closest('button')) return;
      // Touch: the hand scrolls sideways natively (touch-action: pan-x); only an upward drag lifts the card.
      if (e.pointerType !== 'touch') e.preventDefault();
      const art = card.querySelector('.mythCard'); if (!art) return;
      const r = art.getBoundingClientRect(), ghost = art.cloneNode(true);
      ghost.className += ' bxGhost'; Object.assign(ghost.style, { width: '230px', zoom: String(r.width / 230), left: r.left / (r.width / 230) + 'px', top: r.top / (r.width / 230) + 'px' });
      const dx = e.clientX - r.left, dy = e.clientY - r.top; let moved = false, over = null;
      const zones = [[active, toActive], [bench, toBench]].filter(z => z[0] && z[1]);
      const move = ev => {
        if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 8) return;
        if (!moved) { moved = true; document.body.appendChild(ghost); card.classList.add('bxLifted'); zones.forEach(z => z[0].classList.add('bxDrop')); }
        const k = r.width / 230; ghost.style.left = (ev.clientX - dx) / k + 'px'; ghost.style.top = (ev.clientY - dy) / k + 'px';
        over = zones.find(([el]) => { const b = el.getBoundingClientRect(); return ev.clientX > b.left && ev.clientX < b.right && ev.clientY > b.top && ev.clientY < b.bottom; });
        zones.forEach(z => z[0].classList.toggle('bxDropOver', z === over));
      };
      const up = () => {
        removeEventListener('pointermove', move); removeEventListener('pointerup', up);
        ghost.remove(); card.classList.remove('bxLifted'); zones.forEach(z => z[0].classList.remove('bxDrop', 'bxDropOver'));
        if (moved && over) over[1].click();
      };
      addEventListener('pointermove', move); addEventListener('pointerup', up);
    };
  }
}

/* 3. Attack preview: hover or focus an attack to see its damage on the opponent's card */
function attackPreview(match, side) {
  const { theirs } = fields(); const host = theirs && $('.pocketActive', theirs); if (!host) return;
  const q = match.sides[1 - side], foe = q.cards.find(c => c.id === q.active); if (!foe) return;
  for (const btn of $$('.attackRune')) {
    const dmg = parseInt($('.movePower', btn)?.textContent, 10); if (!Number.isFinite(dmg)) continue;
    const show = () => {
      hide(); const left = Math.max(0, foe.hp - dmg), ko = left === 0;
      host.insertAdjacentHTML('beforeend', `<div class="bxPreview ${ko ? 'ko' : ''}"><b>−${dmg}</b><span>${ko ? 'Knockout!' : `${left} / ${foe.maxhp} HP left`}</span><i style="--hp:${foe.hp / foe.maxhp * 100}%;--left:${left / foe.maxhp * 100}%"></i></div>`);
    };
    const hide = () => $$('.bxPreview').forEach(x => x.remove());
    btn.addEventListener('pointerenter', show); btn.addEventListener('focus', show);
    btn.addEventListener('pointerleave', hide); btn.addEventListener('blur', hide);
  }
}

/* 4 + 5. Lunge on attack; knockout embers and a point flying to the score */
function combatFx(match, side) {
  const snap = match.sides.map(s => { const c = s.cards.find(c => c.id === s.active); return { id: s.active, hp: c?.hp, points: s.points, card: c ? { ...c } : null, name: s.name }; });
  if (prev && prev.snap) {
    const { mine, theirs } = fields(), field = i => i === side ? mine : theirs;
    for (let i = 0; i < 2; i++) {
      const was = prev.snap[i], now = snap[i], attacker = 1 - i;
      const hit = was.id && (was.id === now.id ? now.hp < was.hp : snap[attacker].points > prev.snap[attacker].points);
      if (hit && !calm()) {
        const card = $('.pocketActive .mythCard', field(attacker));
        if (card) { card.classList.remove('bxLunge', 'bxLungeL'); void card.offsetWidth; card.classList.add(attacker === side ? 'bxLunge' : 'bxLungeL'); }
      }
      if (snap[attacker].points > prev.snap[attacker].points) {
        const from = $('.pocketActive', field(i))?.getBoundingClientRect(), to = $('.battleBar strong')?.getBoundingClientRect();
        if (from && !calm()) embers(from, to, attacker === side);
        knockoutBanner(prev.snap[i].card, i === side, snap[attacker].points - prev.snap[attacker].points, snap[side].points, snap[1 - side].points, snap[attacker].name);
      }
    }
  }
  return snap;
}
function embers(rect, to, ours) {
  const L = layer(), cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  for (let i = 0; i < 26; i++) {
    const e = document.createElement('i'); e.className = 'bxEmber'; L.appendChild(e);
    const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 110;
    e.animate([{ transform: `translate(${cx}px,${cy}px) scale(1)`, opacity: 1 }, { transform: `translate(${cx + Math.cos(a) * d}px,${cy + Math.sin(a) * d - 60}px) scale(.2)`, opacity: 0 }], { duration: 900 + Math.random() * 600, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }).finished.then(() => e.remove(), () => e.remove());
  }
  if (!to) return;
  const p = document.createElement('div'); p.className = 'bxPoint' + (ours ? '' : ' theirs'); p.textContent = '+1'; L.appendChild(p);
  p.animate([{ transform: `translate(${cx}px,${cy}px) scale(.6)`, opacity: 0 }, { transform: `translate(${cx}px,${cy - 40}px) scale(1.3)`, opacity: 1, offset: .3 }, { transform: `translate(${to.left + to.width / 2}px,${to.top + to.height / 2}px) scale(.7)`, opacity: .9 }], { duration: 1300, delay: 300, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' }).finished.then(() => { p.remove(); const s = $('.battleBar strong'); if (s) { s.classList.remove('bxScorePop'); void s.offsetWidth; s.classList.add('bxScorePop'); } }, () => p.remove());
}

/* 5b. Knockout moment: the fallen card stays visible in the centre with who scored */
function knockoutBanner(card, mine, pts, myPts, theirPts, scorer) {
  if (!card) return;
  $('.bxKO')?.remove();
  const name = B.species[card.kind]?.name || 'Mythling', o = document.createElement('div');
  o.className = 'bxKO ' + (mine ? 'mine' : 'theirs'); o.setAttribute('role', 'status');
  o.innerHTML = `<div class="bxKOBox"><p class="bxKOKick">${mine ? 'Your Mythling was' : 'You'}</p><h2>${mine ? 'Knocked out!' : 'Knocked it out!'}</h2>
    <div class="bxKOCard"><div class="bxKOIn">${B.cardHTML({ ...card, hp: 0 })}</div><span class="bxKOX" aria-hidden="true">✕</span></div>
    <p class="bxKOName">${esc(name)} ${mine ? 'is out of the battle' : 'is defeated'}</p>
    <p class="bxKOPts">+${pts} point${pts > 1 ? 's' : ''} to ${esc(scorer)}</p>
    <p class="bxKOScore"><span>You <b>${myPts}</b></span><i>:</i><span><b>${theirPts}</b> Opponent</span><small>First to 3 wins</small></p>
    ${mine ? '<p class="bxKOHint">Choose a Benched Mythling to take its place.</p>' : ''}<button type="button" class="bxKOOk">OK</button></div>`;
  document.body.appendChild(o);
  const close = () => { o.classList.add('out'); setTimeout(() => o.remove(), 300); };
  o.onclick = close; setTimeout(close, calm() ? 2600 : 3200);
}

/* 6. Opponent moves as short callouts */
function callouts(match, side) {
  for (const ev of match.events || []) {
    if (seenEvents.has(ev.id)) continue; seenEvents.add(ev.id);
    if (!prev || ev.side === side || ev.side === null && !/opponent|challenger|knock/i.test(ev.text)) continue;
    const c = document.createElement('div'); c.className = 'bxCallout'; c.setAttribute('role', 'status'); c.textContent = ev.text;
    const L = layer(); L.appendChild(c); const n = $$('.bxCallout', L).length; c.style.setProperty('--n', n - 1);
    setTimeout(() => c.classList.add('out'), 2600); setTimeout(() => c.remove(), 3100);
  }
}

/* 7. Hand fan: tilt by position (CSS does the rest) */
function fan() {
  const cards = $$('.handRow > .handCard'), n = cards.length, mid = (n - 1) / 2;
  cards.forEach((c, i) => { c.style.setProperty('--fan', ((i - mid) * 2.2).toFixed(2) + 'deg'); c.style.setProperty('--lift', (Math.abs(i - mid) * 3).toFixed(1) + 'px'); });
}

/* 7a. Centre panel fits without scrolling: hide empty sections, move Retreat inside as compact buttons */
function tidyPanel() {
  const panel = $('.attackPanel'); if (!panel) return;
  for (const h of $$(':scope > h2', panel)) {
    const next = h.nextElementSibling;
    if (/abilit/i.test(h.textContent) && next?.matches('p') && /no activated/i.test(next.textContent)) { h.classList.add('bxHide'); next.classList.add('bxHide'); }
    if (/merfling zone/i.test(h.textContent) && next?.matches('p')) next.classList.add('bxMerfLine');
  }
  const turn = !!$('#endPocketTurn', panel);
  $$('.battleTips, #showPocketRules', panel).forEach(e => e.classList.toggle('bxHide', turn));
  const retreat = $('.retreatPanel'); if (retreat) { retreat.classList.add('bxRetreat'); if (retreat.parentElement !== panel) panel.append(retreat); $$('[data-retreat]', retreat).forEach(b => { if (!b.dataset.bx) { b.dataset.bx = 1; b.innerHTML = '↔ ' + b.innerHTML; } }); }
  const end = $('#endPocketTurn', panel); if (end) end.innerHTML = end.innerHTML.replace(/\s*\[Space\]/, '');
}

/* 7b. Large arrows to scroll the hand (plus swipe on touch screens) */
function handArrows() {
  const row = $('.handRow'), host = row?.parentElement; if (!row || !host) return;
  $$('.bxHandNav', host).forEach(b => b.remove());
  const mk = (dir, label) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'bxHandNav ' + (dir < 0 ? 'prev' : 'next'); b.setAttribute('aria-label', label); b.textContent = dir < 0 ? '‹' : '›'; b.onclick = () => row.scrollBy({ left: dir * row.clientWidth * .8, behavior: calm() ? 'auto' : 'smooth' }); host.append(b); return b; };
  const prev = mk(-1, 'Show earlier cards in your hand'), next = mk(1, 'Show more cards in your hand');
  const place = () => { const r = row.getBoundingClientRect(), h = host.getBoundingClientRect(); for (const b of [prev, next]) b.style.top = (r.top - h.top + r.height / 2) + 'px'; prev.style.left = (r.left - h.left + 4) + 'px'; next.style.left = (r.right - h.left - 4) + 'px'; const more = row.scrollWidth > row.clientWidth + 4; prev.hidden = !more || row.scrollLeft < 4; next.hidden = !more || row.scrollLeft > row.scrollWidth - row.clientWidth - 4; };
  row.onscroll = place; requestAnimationFrame(place); setTimeout(place, 300);
}

/* 8. Victory / defeat scene */
function resultScene(r) {
  const hero = $('.victoryCard'); if (!hero || hero.classList.contains('bxScene')) return;
  hero.classList.add('bxScene', r.victory ? 'bxWin' : r.draw ? 'bxDraw' : 'bxLose');
  hero.insertAdjacentHTML('afterbegin', `<div class="bxRays" aria-hidden="true"></div><p class="bxKicker">${r.victory ? 'Quest complete' : r.draw ? 'Evenly matched' : 'Keep training'}</p>`);
}

if (B) {
  addEventListener('ember:frame', e => { if (e.detail.view !== 'cardBattle') { $('#bxLayer')?.replaceChildren(); } });
  addEventListener('ember:cardBattle', e => {
    const { match, side } = e.detail, sig = match.sides.map(s => s.name).join('|');
    if (sig !== lastSig) { lastSig = sig; prev = null; seenEvents = new Set((match.events || []).map(x => x.id)); }
    const turnKey = turnSignal(match, side);
    const snap = combatFx(match, side);
    callouts(match, side); enableDrag(); attackPreview(match, side); fan(); handArrows(); tidyPanel();
    prev = { turnKey, snap };
  });
  addEventListener('ember:cardResult', e => { prev = null; lastSig = ''; $('#bxLayer')?.replaceChildren(); requestAnimationFrame(() => resultScene(e.detail)); });
}
