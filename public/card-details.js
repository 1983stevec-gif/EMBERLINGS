// EMBERLINGS card details: a big card you can turn in 3D, with every stat, where it came from and how many you own.
// Opens on top of the old inspect panel (which still runs, so its actions keep working) from My Binder,
// from the Card Vault deck builder (tap a Mythling card) and from the Mythling Index ("Your cards" strip).
// All numbers come from the shared rules in card-engine.js / combat-rules.js, the same ones that print the card.
// Origin records are additive: state.ember.cardOrigins[cardId] = { at, how, ... }. Cards owned before this
// module existed have no record and show "Found before records began". Card granting is never changed.
import { battleCard, cardStats, attacks, abilities, levelPerks, levelRewardsAt, ADVANTAGE, MAX_LEVEL, ownedCardStrength } from '/card-engine.js';
import { mutationTrait, mutationCoins, rarityLabel, rarityRank } from '/combat-rules.js';

const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const STAGES = ['Basic', 'Ascended', 'Apex'];
const calm = () => !!(B?.state?.reducedMotion || document.documentElement.dataset.fx === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches);
const xpNeeded = level => level * 60; // Same rule the game uses in grantXP (level * 60 XP per level).
const weaknessOf = el => Object.keys(ADVANTAGE).find(e => ADVANTAGE[e] === el) || null;
const packName = id => (B.packCatalog?.() || []).find(p => p.id === id)?.name || null;
const speciesName = kind => B.species[kind]?.name || 'Mythling';

/* ------------------------------------------------------------ Origin records (additive save data) */
function originStore(create) {
  const st = B.state; if (!st) return null;
  if (!st.ember || typeof st.ember !== 'object') { if (!create) return null; st.ember = {}; }
  if (!st.ember.cardOrigins || typeof st.ember.cardOrigins !== 'object') { if (!create) return null; st.ember.cardOrigins = {}; }
  return st.ember.cardOrigins;
}
// What the card itself already tells us (works for old cards too, just without a date).
function inferOrigin(c) {
  if (!c) return null;
  if (c.tradeAssetId) return { how: 'trade' };
  if (c.fused) return { how: 'fusion' };
  if (c.sourcePack === 'tutorial') return { how: 'tutorial' };
  if (c.sourcePack) return { how: 'pack', pack: c.sourcePack };
  if (c.starterGift) return { how: 'starter' };
  if (c.rarity === 'Wild') return { how: 'wild' };
  return null;
}
let known = null, knownState = null, rewardCount = 0;
function baseline() {
  const st = B.state; knownState = st; known = new Map((st?.owned || []).map(c => [c.id, c.kind]));
  rewardCount = (st?.rewardPacks || []).length;
}
function record(cards, extra) {
  if (!cards.length) return;
  const store = originStore(true), now = Date.now();
  for (const c of cards) {
    if (!store[c.id]) {
      const o = { at: now, ...(inferOrigin(c) || { how: 'other' }), ...extra };
      if (o.how === 'fusion' && Array.isArray(c.fusionParents)) { const kinds = c.fusionParents.map(id => known.get(id)).filter(k => Number.isInteger(k)); if (kinds.length) o.parents = kinds; }
      store[c.id] = o;
    }
    known.set(c.id, c.kind);
  }
  try { B.save(); } catch (e) { /* the next screen draw saves anyway */ }
}
// Runs after every screen draw: any card id not seen before was just gained in this session.
function sweep() {
  const st = B.state; if (!st?.owned) return;
  if (!known || st !== knownState) { baseline(); return; } // new save loaded (cloud, backup, trade reload): don't guess dates
  const fresh = st.owned.filter(c => c?.id && !known.has(c.id)), now = (st.rewardPacks || []).length;
  if (fresh.length) record(fresh, now < rewardCount ? { reward: true } : {});
  rewardCount = now;
}
function onTradeComplete(e) {
  const st = B.state; if (!st?.owned) return;
  if (!known) baseline();
  const fresh = st.owned.filter(c => c?.id && c.tradeAssetId && !known.has(c.id) && !originStore(false)?.[c.id]);
  const partner = typeof e.detail?.partner === 'string' ? e.detail.partner.slice(0, 40) : (e.detail?.partner?.username || null);
  record(fresh, partner ? { from: String(partner).slice(0, 40) } : {});
  baseline();
}
function originText(c) {
  const rec = originStore(false)?.[c.id] || null, o = rec || inferOrigin(c);
  let how;
  if (!o) how = 'Found before records began';
  else switch (o.how) {
    case 'pack': how = `Pulled from a ${packName(o.pack) || 'card pack'}${o.reward ? ' (a reward pack you earned)' : ''}`; break;
    case 'tutorial': how = 'From your first pack in the tutorial'; break;
    case 'starter': how = 'A starter card gift'; break;
    case 'fusion': how = 'Made in the Fusion Lab' + (o.parents?.length ? ' from ' + o.parents.map(speciesName).join(' + ') : ''); break;
    case 'trade': how = o.from ? `Traded from ${o.from}` : 'Traded from a friend'; break;
    case 'wild': how = 'Caught in the wild in Hidden Hollow'; break;
    default: how = 'Joined your collection';
  }
  const when = rec?.at ? new Date(rec.at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  return { how, when: when || 'Found before records began' };
}

/* ------------------------------------------------------------ Card back (original EMBERLINGS crest) */
const BACK = `<svg class="cdCrest" viewBox="0 0 630 960" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
<defs><radialGradient id="cdBg" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#3a2340"/><stop offset=".55" stop-color="#1c1430"/><stop offset="1" stop-color="#0b0a16"/></radialGradient>
<linearGradient id="cdGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a6"/><stop offset=".5" stop-color="#e2a748"/><stop offset="1" stop-color="#9a6322"/></linearGradient>
<linearGradient id="cdFlame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff5a2a"/><stop offset=".55" stop-color="#ffa53d"/><stop offset="1" stop-color="#fff0b0"/></linearGradient>
<pattern id="cdDots" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M18 6l3 12-3 12-3-12z" fill="#e9b75a" opacity=".09"/></pattern></defs>
<rect width="630" height="960" fill="url(#cdBg)"/><rect width="630" height="960" fill="url(#cdDots)"/>
<rect x="22" y="22" width="586" height="916" rx="26" fill="none" stroke="url(#cdGold)" stroke-width="8"/>
<rect x="40" y="40" width="550" height="880" rx="18" fill="none" stroke="#e9b75a" stroke-opacity=".45" stroke-width="2"/>
<g fill="url(#cdGold)"><path d="M40 92 92 40H40z"/><path d="M590 92 538 40h52z"/><path d="M40 868l52 52H40z"/><path d="M590 868l-52 52h52z"/></g>
<g transform="translate(315 430)">
<circle r="190" fill="none" stroke="url(#cdGold)" stroke-width="6"/><circle r="172" fill="#140f22" stroke="#e9b75a" stroke-opacity=".5" stroke-width="2"/>
<g stroke="#e9b75a" stroke-opacity=".55" stroke-width="3">${Array.from({ length: 16 }, (_, i) => `<line x1="0" y1="-176" x2="0" y2="-188" transform="rotate(${i * 22.5})"/>`).join('')}</g>
<path d="M0-150c34 44 92 86 92 152 0 62-42 106-92 106s-92-44-92-106c0-40 22-62 40-86 4 30 16 44 30 50-8-44 4-80 22-116z" fill="url(#cdFlame)" stroke="#ffd98a" stroke-width="4"/>
<path d="M0-40c18 26 42 48 42 80 0 30-20 52-42 52s-42-22-42-52c0-22 12-34 20-46 4 16 10 22 18 24-4-22 0-40 4-58z" fill="#fff4cf" opacity=".9"/>
<path d="M-150 120c40 30 100 42 150 42s110-12 150-42" fill="none" stroke="url(#cdGold)" stroke-width="5"/>
</g>
<text x="315" y="760" text-anchor="middle" font-family="Cinzel,Georgia,serif" font-weight="800" font-size="62" letter-spacing="6" fill="url(#cdGold)">EMBERLINGS</text>
<text x="315" y="810" text-anchor="middle" font-family="Cinzel,Georgia,serif" font-weight="600" font-size="22" letter-spacing="8" fill="#e9b75a" opacity=".8">MYTHLING CARD</text>
</svg>`;

/* ------------------------------------------------------------ Details content */
function deckUse(c) {
  const st = B.state, elite = rarityRank(c) >= 4, prefix = 'm-' + c.kind + '-' + elite + '-';
  const describe = keys => {
    const parts = [0, 1, 2].map(s => [s, (keys || []).filter(k => k === prefix + s).length]).filter(([, n]) => n);
    return parts.length ? parts.map(([s, n]) => `${STAGES[s]} ×${n}`).join(', ') : null;
  };
  const out = [];
  for (const p of Array.isArray(st.deckPresets) ? st.deckPresets : []) { const d = describe(p.keys); if (d) out.push({ name: p.name || 'Saved deck', d, active: p.id === st.activeDeckPreset }); }
  const cur = describe(st.pocketDeck?.keys);
  if (cur && !out.some(x => x.active)) out.unshift({ name: 'Current battle deck', d: cur, active: true });
  return out;
}
function nextUnlock(c, level) {
  for (let l = level + 1; l <= MAX_LEVEL; l++) { const r = levelRewardsAt(c, l).filter(x => x.kind !== 'hp'); if (r.length) return { level: l, text: r.map(x => x.text).join(' · ') }; }
  return null;
}
function statusPills(c) {
  const st = B.state, out = [];
  if (st.team === c.id) out.push('<span class="cdPill cdGoldPill">★ Active partner</span>');
  if (B.vaulted?.(c)) out.push('<span class="cdPill">In the Vault</span>');
  if (st.tradeLocks?.[c.id]) out.push('<span class="cdPill cdWarn">Locked in a trade or battle</span>');
  return out.join('');
}
function detailsHTML(c) {
  const st = B.state, card = battleCard({ ...c, elite: rarityRank(c) >= 4 }), s = cardStats(card), perks = levelPerks(c);
  const name = speciesName(c.kind), mut = mutationTrait(c), rarity = rarityLabel(c), level = perks.level;
  const weak = weaknessOf(s.element), strong = ADVANTAGE[s.element];
  const need = xpNeeded(level), xp = Math.max(0, Number(c.xp) || 0), pct = level >= MAX_LEVEL ? 100 : Math.min(100, Math.round(xp / need * 100));
  const nxt = nextUnlock(c, level), origin = originText(c);
  const owned = st.owned || [], same = owned.filter(x => x.kind === c.kind);
  const exact = same.filter(x => rarityLabel(x) === rarity && (x.mutation || null) === (c.mutation || null));
  const shinies = same.filter(x => x.shiny).length, decks = deckUse(c);
  const moves = attacks(card).map(m => `<li class="cdMove"><div class="cdMoveHead"><span class="cdCost" title="${m.cost} Merfling">${'●'.repeat(m.cost)}</span><b>${esc(m.name)}</b><strong>${m.damage}</strong></div><p>${/^Requires/.test(m.effect) ? '' : `Needs ${m.cost} Merfling${m.typed ? `, including ${esc(m.typed)}` : ' of any type'}. `}${esc(m.effect)}</p></li>`).join('');
  const bonus = [mut ? `${mut.name} mutation +${Math.round(mut.damage * 100)}%` : '', perks.power ? `abilities +${perks.power}` : ''].filter(Boolean).join(' · ');
  const abil = [...perks.abilities.map(a => ({ n: a.name, t: a.text, tag: 'Level ' + a.level })), ...(perks.special ? [{ n: perks.special.name, t: perks.special.text, tag: (perks.special.tier === 'veryRare' ? 'Very rare special' : 'Rare special') + ' · Lv ' + perks.specialLevel, sp: true }] : [])];
  const evo = [0, 1, 2].map(stage => { const e = battleCard({ ...c, stage, elite: rarityRank(c) >= 4 }); return `<li class="${stage === (c.stage || 0) ? 'on' : ''}"><b>${STAGES[stage]}</b><span>${e.maxhp} HP · ${e.damage} base damage</span>${abilities(e).map(a => `<small>${esc(a.name)}: ${esc(a.text)}</small>`).join('')}</li>`; }).join('<li class="cdArrow" aria-hidden="true">→</li>');
  return `
  <header class="cdHead"><p class="cdKick">${STAGES[c.stage || 0]} Mythling · ${esc(s.role)}</p><h2 id="cdTitle">${esc(name)}</h2>
   <div class="cdPills"><span class="cdPill" style="--c:${esc(B.revealColor?.(c) || '#e9b75a')}">${esc(rarity)}</span><span class="cdPill">${esc(s.element)}</span>${c.shiny ? '<span class="cdPill cdShiny">✦ Shiny</span>' : ''}${mut ? `<span class="cdPill" style="--c:${esc(mut.color)}">${mut.icon} ${esc(mut.name)}</span>` : ''}${statusPills(c)}</div></header>
  <section class="cdBox"><h3>Stats</h3><dl class="cdStats">
   <div><dt>HP</dt><dd>${s.maxhp}</dd></div><div><dt>Base damage</dt><dd>${s.damage}</dd></div>
   <div><dt>Retreat</dt><dd>${s.retreatCost} Merfling</dd></div><div><dt>Knockout points</dt><dd>${s.points}</dd></div>
   <div><dt>Weak to</dt><dd>${weak ? esc(weak) + ' (+20)' : 'Nothing'}</dd></div><div><dt>Strong against</dt><dd>${strong ? esc(strong) + ' (+20)' : 'Nothing'}</dd></div>
   </dl>
   <div class="cdLevel"><div><b>Level ${level}</b><span>${level >= MAX_LEVEL ? 'Max level reached' : `${xp} / ${need} XP to level ${level + 1}`}</span></div><i style="--p:${pct}%"></i></div>
   ${nxt ? `<p class="cdNote">Next unlock at level ${nxt.level}: ${esc(nxt.text)}</p>` : ''}</section>
  <section class="cdBox"><h3>Attacks</h3><ul class="cdMoves">${moves}</ul>${bonus ? `<p class="cdNote">Damage already includes ${esc(bonus)}, plus this card's level and rarity.</p>` : '<p class="cdNote">Damage already includes this card\'s level and rarity.</p>'}</section>
  <section class="cdBox"><h3>Abilities</h3>${abil.length ? `<ul class="cdAbil">${abil.map(a => `<li class="${a.sp ? 'sp' : ''}"><b>${esc(a.n)}</b><small>${esc(a.tag)}</small><p>${esc(a.t)}</p></li>`).join('')}</ul>` : '<p class="cdNote">No abilities yet. The first one unlocks at level 10.</p>'}</section>
  <section class="cdBox"><h3>Mutation</h3>${mut ? `<p><b style="color:${esc(mut.color)}">${mut.icon} ${esc(mut.name)}</b>: attacks do ${Math.round(mut.damage * 100)}% more damage, and it earns ${mutationCoins(c)}× coins in the Vault.${mut.packOnly ? ' This mutation only comes from packs.' : ''}</p>` : '<p class="cdNote">No mutation.</p>'}
   <p>${c.shiny ? '✦ <b>Shiny:</b> a rare glittering copy that earns a little more in the Vault.' : 'Not shiny.'}</p></section>
  <section class="cdBox"><h3>Evolution line</h3><ol class="cdEvo">${evo}</ol><p class="cdNote">Ascended and Apex are battle forms you can add in the Card Vault. Using them never uses up this card.</p></section>
  <section class="cdBox"><h3>Where it came from</h3><p class="cdOrigin">${esc(origin.how)}</p><p class="cdNote">${origin.when === 'Found before records began' ? 'Date: found before records began' : 'Joined your binder on ' + esc(origin.when)}</p></section>
  <section class="cdBox"><h3>How many you own</h3><dl class="cdStats">
   <div><dt>${esc(name)} cards</dt><dd>${same.length}</dd></div><div><dt>Same rarity and mutation</dt><dd>${exact.length}</dd></div>
   <div><dt>Shiny copies</dt><dd>${shinies}</dd></div><div><dt>Total cards</dt><dd>${owned.length}</dd></div></dl>
   <p class="cdSub">${decks.length ? 'In your decks:' : 'Not in any saved deck yet.'}</p>${decks.length ? `<ul class="cdDecks">${decks.map(d => `<li><b>${esc(d.name)}</b>${d.active ? ' <small>(in use)</small>' : ''}<span>${esc(d.d)}</span></li>`).join('')}</ul>` : ''}</section>`;
}

/* ------------------------------------------------------------ Overlay + 3D card */
let ui = null;
function close() {
  if (!ui) return;
  const { root, prevFocus, stop, fromView } = ui; stop(); ui = null;
  root.remove(); document.documentElement.classList.remove('cdOpen');
  if (fromView === 'inventory') $('#closeInspect')?.click(); // the old panel was a duplicate while ours was open
  try { prevFocus?.focus?.({ preventScroll: true }); } catch (e) { /* element gone */ }
}
function actionsHTML(c, fromView) {
  const st = B.state, locked = !!(st.tradeLocks?.[c.id] || B.vaulted?.(c)), active = st.team === c.id;
  return `<button type="button" class="cdBtn cdGold" data-cd-act="partner" ${active || locked ? 'disabled' : ''}>${active ? '★ Active partner' : 'Set active partner'}</button>
   <button type="button" class="cdBtn" data-cd-act="decks">Card Vault</button><button type="button" class="cdBtn" data-cd-act="fusion">Fusion Lab</button>
   <button type="button" class="cdBtn" data-cd-act="vault">Vault</button>${fromView !== 'index' ? '<button type="button" class="cdBtn" data-cd-act="index">Mythling Index</button>' : ''}`;
}
function open(id, fromView = B.view) {
  const c = (B.state.owned || []).find(x => x.id === id); if (!c) return false;
  close(); injectCSS();
  const root = document.createElement('div'); root.id = 'cardDetails'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'cdTitle');
  const touch = matchMedia('(pointer:coarse)').matches;
  root.innerHTML = `<div class="cdBar"><button type="button" class="cdBack" data-cd-close>‹ Back</button><strong>Card details</strong><button type="button" class="cdFlip" data-cd-flip>Flip card ⟲</button></div>
   <div class="cdBody"><div class="cdLeft"><div class="cdStage" tabindex="0" aria-label="${esc(speciesName(c.kind))} card. Drag or use the arrow keys to turn it."><div class="cdShadow"></div><div class="cdCard"><div class="cdFace cdFront"><div class="cdZoom">${B.cardHTML(c)}</div><span class="cdGlare"></span></div><div class="cdFace cdBackFace">${BACK}</div></div></div>
   <p class="cdHint">${touch ? 'Swipe sideways on the card to turn it. Flick to spin. Scroll down for details.' : 'Drag the card to turn it. Flick to spin it.'}</p></div>
   <div class="cdInfo">${detailsHTML(c)}<div class="cdActions">${actionsHTML(c, fromView)}</div><p class="cdMsg" role="status"></p></div></div>`;
  document.body.appendChild(root); document.documentElement.classList.add('cdOpen');
  const stage = $('.cdStage', root), cardEl = $('.cdCard', root), zoom = $('.cdZoom', root), shadow = $('.cdShadow', root);
  // Fit the printed card into the stage at a large, crisp size (CSS zoom keeps the text sharp).
  const fit = () => {
    zoom.style.zoom = 1; const pc = $('.printCard', zoom); if (!pc) return;
    const w = pc.offsetWidth || 290, h = pc.offsetHeight || 440, box = stage.getBoundingClientRect();
    const k = Math.max(.5, Math.min((box.width - 8) / w, (box.height - 8) / h));
    zoom.style.zoom = k; cardEl.style.width = w * k + 'px'; cardEl.style.height = h * k + 'px';
  };
  // Rotation with drag, flick inertia and keyboard. Reduced motion: no inertia or intro spin, but dragging still turns it.
  let rx = 0, ry = calm() ? 0 : -32, vy = 0, raf = 0, drag = null, tween = null;
  const paint = () => {
    cardEl.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    const r = ((ry % 360) + 360) % 360;
    root.style.setProperty('--cd-glare', (50 + Math.sin(ry * Math.PI / 180) * 60).toFixed(1) + '%');
    shadow.style.transform = `scaleX(${(.35 + .65 * Math.abs(Math.cos(ry * Math.PI / 180))).toFixed(3)})`;
    stage.classList.toggle('cdShowingBack', r > 90 && r < 270);
  };
  const loop = t0 => {
    let last = t0;
    const step = t => {
      const dt = Math.min(48, t - last); last = t;
      if (tween) { const p = Math.min(1, (t - tween.t0) / tween.ms), e = 1 - Math.pow(1 - p, 3); ry = tween.from + (tween.to - tween.from) * e; rx = tween.rx0 * (1 - e); if (p >= 1) tween = null; }
      else if (!drag) { ry += vy * dt; vy *= Math.pow(.94, dt / 16); if (!calm()) { rx *= Math.pow(.9, dt / 16); if (Math.abs(rx) < .05) rx = 0; } }
      paint();
      if (tween || drag || Math.abs(vy) > .01 || (rx && !calm())) raf = requestAnimationFrame(step); else { vy = 0; raf = 0; }
    };
    raf = requestAnimationFrame(step);
  };
  const kick = () => { if (!raf) loop(performance.now()); };
  const turnTo = to => { vy = 0; if (calm()) { ry = to; rx = 0; tween = null; paint(); return; } tween = { from: ry, to, rx0: rx, t0: performance.now(), ms: 650 }; kick(); };
  stage.addEventListener('pointerdown', e => {
    if (e.button > 0) return; tween = null; vy = 0;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), v: 0, touch: e.pointerType === 'touch' };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
    stage.classList.add('cdDragging'); kick();
  });
  stage.addEventListener('pointermove', e => {
    e.stopPropagation(); // keep other card-tilt effects off this card
    if (!drag || e.pointerId !== drag.id) return;
    const now = performance.now(), dx = e.clientX - drag.x, dy = e.clientY - drag.y, dt = Math.max(1, now - drag.t);
    ry += dx * .55; if (!drag.touch) rx = Math.max(-50, Math.min(50, rx - dy * .4));
    drag.v = drag.v * .6 + (dx * .55 / dt) * .4; drag.x = e.clientX; drag.y = e.clientY; drag.t = now; paint();
  });
  const end = e => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const idle = performance.now() - drag.t > 90; vy = calm() || idle ? 0 : Math.max(-2.4, Math.min(2.4, drag.v)); drag = null;
    stage.classList.remove('cdDragging'); kick();
  };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end); stage.addEventListener('lostpointercapture', end);
  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); turnTo(ry + (e.key === 'ArrowLeft' ? -30 : 30)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); turnTo(Math.round((ry + 180) / 180) * 180); }
  });
  const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
  document.addEventListener('keydown', onKey);
  const onResize = () => fit(); addEventListener('resize', onResize);
  root.addEventListener('click', e => {
    if (e.target.closest('[data-cd-close]')) return close();
    if (e.target.closest('[data-cd-flip]')) return turnTo(Math.round((ry + 180) / 180) * 180);
    const act = e.target.closest('[data-cd-act]')?.dataset.cdAct; if (!act) return;
    if (act === 'partner') return setPartner(c, root);
    close(); B.go(act);
  });
  const stop = () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); removeEventListener('resize', onResize); };
  ui = { root, prevFocus: document.activeElement, stop, fromView, id };
  fit(); paint();
  if (!calm()) turnTo(0); // short welcome turn
  requestAnimationFrame(fit); document.fonts?.ready?.then(() => ui?.root === root && fit());
  $('.cdBack', root).focus({ preventScroll: true });
  return true;
}
// Same action as the old panel's "Set Active Partner": click it when present (keeps the binder in sync), otherwise apply the same rule.
function setPartner(c, root) {
  const st = B.state; if (st.tradeLocks?.[c.id] || B.vaulted?.(c)) return;
  const old = $('#equipPartner');
  if (old && !old.disabled && ui?.fromView === 'inventory') old.click();
  else B.transact(() => { B.state.team = c.id; });
  const msg = $('.cdMsg', root), ok = B.state.team === c.id;
  if (msg) msg.textContent = ok ? `${speciesName(c.kind)} is now your active partner.` : 'That did not work. Please try again.';
  const btn = $('[data-cd-act="partner"]', root); if (btn && ok) { btn.textContent = '★ Active partner'; btn.disabled = true; }
  const pills = $('.cdPills', root); if (ok && pills && !$('.cdGoldPill', pills)) pills.insertAdjacentHTML('beforeend', '<span class="cdPill cdGoldPill">★ Active partner</span>');
}

/* ------------------------------------------------------------ Where it opens from */
function bestCopy(kind, elite) {
  const pool = (B.state.owned || []).filter(c => c.kind === kind && (rarityRank(c) >= 4) === elite);
  const free = pool.filter(c => !B.vaulted?.(c) && !B.state.tradeLocks?.[c.id]);
  return (free.length ? free : pool).sort((a, b) => ownedCardStrength(b) - ownedCardStrength(a))[0] || null;
}
document.addEventListener('click', e => {
  if (!B || e.target.closest?.('#cardDetails')) return;
  // My Binder: the old inspect still runs (its own handler on the pocket); our view opens on top straight after.
  const pocket = e.target.closest?.('[data-inspect-card]');
  if (pocket && B.view === 'inventory') { const id = pocket.dataset.inspectCard; setTimeout(() => open(id, 'inventory'), 0); return; }
  // Card Vault: tap a Mythling card (not the + / − buttons) to see the strongest copy you own.
  if (B.view === 'decks') {
    const sec = e.target.closest?.('.deckChoice'); if (!sec || !e.target.closest('.printCard') || e.target.closest('button')) return;
    const key = $('[data-deck-add]', sec)?.dataset.deckAdd || $('[data-deck-remove]', sec)?.dataset.deckRemove || '';
    const m = /^m-(\d+)-(true|false)-\d$/.exec(key); if (!m) return;
    const c = bestCopy(+m[1], m[2] === 'true'); if (c) open(c.id, 'decks');
  }
}, true);
// Mythling Index: a "Your cards" strip under the species page, one button per owned copy.
function indexStrip() {
  if (B.view !== 'index') return;
  const page = $('.fgRight'); if (!page || page.dataset.cd || page.classList.contains('unknown')) return;
  page.dataset.cd = '1';
  const kind = parseInt(($('.fgNoBig', page)?.textContent || '').replace(/\D/g, ''), 10) - 1; if (!(kind >= 0)) return;
  const mine = (B.state.owned || []).filter(c => c.kind === kind).sort((a, b) => ownedCardStrength(b) - ownedCardStrength(a));
  if (!mine.length) return;
  const show = mine.slice(0, 8);
  const el = document.createElement('div'); el.className = 'cdStrip';
  el.innerHTML = `<p>Your cards (tap one to see it up close)</p><div>${show.map(c => { const m = mutationTrait(c); return `<button type="button" data-cd-open="${esc(c.id)}">Lv ${c.level || 1} · ${esc(rarityLabel(c))}${c.shiny ? ' · ✦' : ''}${m ? ' · ' + m.icon + ' ' + esc(m.name) : ''}</button>`; }).join('')}${mine.length > show.length ? `<span>+${mine.length - show.length} more in My Binder</span>` : ''}</div>`;
  ($('.fgLinks', page) || page).insertAdjacentElement('beforebegin', el);
  $$('[data-cd-open]', el).forEach(b => b.onclick = () => open(b.dataset.cdOpen, 'index'));
}
let stripQueued = false;
const queueStrip = () => { if (stripQueued) return; stripQueued = true; requestAnimationFrame(() => { stripQueued = false; indexStrip(); }); };

/* ------------------------------------------------------------ Styles */
function injectCSS() {
  if (document.getElementById('card-details-css')) return;
  const css = `
html.cdOpen,html.cdOpen body{overflow:hidden!important}
#cardDetails{position:fixed;inset:0;z-index:9800;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;background:radial-gradient(ellipse at 30% 20%,#2a2236,#0b0e14 70%);color:#efe6d2;font-family:'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif;-webkit-overflow-scrolling:touch}
#cardDetails *{box-sizing:border-box}
#cardDetails .cdBar{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:10px;padding:10px 16px;background:linear-gradient(180deg,#0e131bf2,#0e131bd9);border-bottom:1px solid #7a5a2a;backdrop-filter:blur(6px)}
#cardDetails .cdBar strong{flex:1;text-align:center;font-family:Cinzel,Georgia,serif;color:#f3dfb0;letter-spacing:.06em;font-size:17px}
#cardDetails button{font:inherit;cursor:pointer}
#cardDetails .cdBack,#cardDetails .cdFlip,#cardDetails .cdBtn{min-height:48px;padding:10px 18px;border-radius:10px;border:1px solid #7a5a2a;background:linear-gradient(180deg,#1d2533,#121822);color:#f3dfb0;font-weight:700;font-size:16px}
#cardDetails .cdBack{min-width:96px;border-color:#e9b75a}
#cardDetails button:focus-visible,#cardDetails .cdStage:focus-visible{outline:3px solid #ffdd7e;outline-offset:3px}
#cardDetails .cdBody{display:grid;grid-template-columns:1fr;gap:18px;max-width:1240px;margin:0 auto;padding:16px}
#cardDetails .cdLeft{display:flex;flex-direction:column;align-items:center;min-width:0}
#cardDetails .cdStage{position:relative;width:100%;height:min(70vh,calc((100vw - 32px) * 1.55));min-height:300px;display:flex;align-items:center;justify-content:center;perspective:1400px;touch-action:pan-y;user-select:none;-webkit-user-select:none;cursor:grab;border-radius:16px}
#cardDetails .cdStage.cdDragging{cursor:grabbing}
#cardDetails .cdCard{position:relative;transform-style:preserve-3d;will-change:transform}
#cardDetails .cdFace{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:14px;overflow:hidden}
#cardDetails .cdFront{transform:translateZ(1px)}
#cardDetails .cdZoom{width:max-content;pointer-events:none}
#cardDetails .cdZoom .printCard{width:290px;max-width:none;margin:0;animation:none!important;transform:none!important}
#cardDetails .cdGlare{position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent calc(var(--cd-glare,50%) - 22%),#ffffff2e var(--cd-glare,50%),transparent calc(var(--cd-glare,50%) + 22%));mix-blend-mode:screen}
#cardDetails .cdBackFace{transform:rotateY(180deg) translateZ(1px);background:#140f22;border:2px solid #9a6322}
#cardDetails .cdCrest{display:block;width:100%;height:100%}
#cardDetails .cdShadow{position:absolute;left:18%;right:18%;bottom:2%;height:22px;border-radius:50%;background:radial-gradient(#000a,transparent 70%);filter:blur(4px)}
#cardDetails .cdHint{margin:10px 0 0;color:#b9ae98;font-size:15px;text-align:center}
#cardDetails .cdInfo{min-width:0;display:flex;flex-direction:column;gap:12px}
#cardDetails .cdHead h2{margin:2px 0 8px;font-family:Cinzel,Georgia,serif;font-size:clamp(26px,4vw,36px);color:#f3dfb0;line-height:1.1}
#cardDetails .cdKick{margin:0;color:#e9b75a;font-size:14px;letter-spacing:.08em;text-transform:uppercase}
#cardDetails .cdPills{display:flex;flex-wrap:wrap;gap:6px}
#cardDetails .cdPill{--c:#7a5a2a;display:inline-block;padding:5px 11px;border-radius:999px;border:1px solid var(--c);background:color-mix(in srgb,var(--c) 22%,#121822);font-size:14px;font-weight:700;color:#fff3d6}
#cardDetails .cdGoldPill{--c:#e9b75a}#cardDetails .cdShiny{--c:#f6e27a}#cardDetails .cdWarn{--c:#d26a4a}
#cardDetails .cdBox{background:linear-gradient(180deg,#151c27,#0e131b);border:1px solid #7a5a2a;border-radius:12px;padding:14px 16px}
#cardDetails .cdBox h3{margin:0 0 10px;font-family:Cinzel,Georgia,serif;font-size:17px;color:#f3dfb0;letter-spacing:.04em}
#cardDetails .cdBox p{margin:6px 0 0;font-size:16px;line-height:1.45}
#cardDetails .cdStats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0}
#cardDetails .cdStats div{background:#0b0f16;border:1px solid #2c3446;border-radius:8px;padding:8px 10px;min-width:0}
#cardDetails .cdStats dt{font-size:13px;color:#b9ae98}
#cardDetails .cdStats dd{margin:2px 0 0;font-size:19px;font-weight:700;color:#fff3d6;overflow-wrap:anywhere}
#cardDetails .cdLevel{margin-top:10px}
#cardDetails .cdLevel div{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:16px}
#cardDetails .cdLevel span{color:#b9ae98}
#cardDetails .cdLevel i{display:block;height:10px;margin-top:6px;border-radius:6px;background:linear-gradient(90deg,#e9b75a var(--p),#0b0f16 var(--p));border:1px solid #2c3446}
#cardDetails .cdNote{color:#b9ae98;font-size:15px!important}
#cardDetails .cdSub{font-weight:700}
#cardDetails ul,#cardDetails ol{list-style:none;margin:0;padding:0}
#cardDetails .cdMoves{display:grid;gap:8px}
#cardDetails .cdMove{background:#0b0f16;border:1px solid #2c3446;border-radius:8px;padding:9px 11px}
#cardDetails .cdMoveHead{display:flex;align-items:center;gap:8px}
#cardDetails .cdMoveHead b{flex:1;font-size:17px;color:#fff3d6}
#cardDetails .cdMoveHead strong{font-family:Cinzel,Georgia,serif;font-size:22px;color:#ffcf7a}
#cardDetails .cdCost{color:#e9b75a;letter-spacing:2px;font-size:14px}
#cardDetails .cdMove p{margin:4px 0 0;font-size:15px;color:#d9cfb9}
#cardDetails .cdAbil{display:grid;gap:8px}
#cardDetails .cdAbil li{background:#0b0f16;border:1px solid #2c3446;border-radius:8px;padding:8px 11px}
#cardDetails .cdAbil li.sp{border-color:#c9a2ff}
#cardDetails .cdAbil small{margin-left:8px;color:#b9ae98}
#cardDetails .cdAbil p{margin:3px 0 0;font-size:15px}
#cardDetails .cdEvo{display:flex;flex-wrap:wrap;align-items:stretch;gap:6px}
#cardDetails .cdEvo li{flex:1 1 120px;background:#0b0f16;border:1px solid #2c3446;border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:2px;font-size:14px}
#cardDetails .cdEvo li.on{border-color:#e9b75a;box-shadow:inset 0 0 0 1px #e9b75a55}
#cardDetails .cdEvo li b{font-size:16px;color:#fff3d6}
#cardDetails .cdEvo li small{color:#b9ae98}
#cardDetails .cdEvo .cdArrow{flex:0 0 auto;background:none;border:0;align-self:center;color:#e9b75a;padding:0}
#cardDetails .cdOrigin{font-size:18px!important;font-weight:700;color:#fff3d6}
#cardDetails .cdDecks{display:grid;gap:6px;margin-top:6px}
#cardDetails .cdDecks li{display:flex;flex-wrap:wrap;gap:4px 10px;background:#0b0f16;border:1px solid #2c3446;border-radius:8px;padding:8px 10px;font-size:15px}
#cardDetails .cdDecks span{color:#d9cfb9;margin-left:auto}
#cardDetails .cdActions{display:flex;flex-wrap:wrap;gap:8px}
#cardDetails .cdBtn{flex:1 1 140px}
#cardDetails .cdGold{background:linear-gradient(180deg,#f3c66b,#c98a2c);color:#20150a;border-color:#ffe2a0}
#cardDetails .cdBtn:disabled{opacity:.65;cursor:default}
#cardDetails .cdMsg{min-height:1.2em;margin:0;color:#ffdd7e;font-size:16px}
@media (min-width:1000px){#cardDetails .cdBody{grid-template-columns:minmax(0,1fr) minmax(360px,470px);align-items:start;gap:28px}
 #cardDetails .cdLeft{position:sticky;top:84px}
 #cardDetails .cdStage{height:calc(100vh - 150px);max-height:820px}}
@media (max-width:600px){#cardDetails .cdEvo{flex-direction:column}#cardDetails .cdEvo li{flex:0 0 auto}#cardDetails .cdEvo .cdArrow{transform:rotate(90deg)}}
@media (max-width:420px){#cardDetails .cdBar{padding:8px 10px}#cardDetails .cdBar strong{font-size:15px}#cardDetails .cdBack,#cardDetails .cdFlip{padding:10px 12px}#cardDetails .cdBody{padding:12px 16px}}
.binderPocket[data-inspect-card]:not(:disabled),.deckChoice .printCard{cursor:zoom-in}
.cdStrip{margin:12px 0}.cdStrip p{margin:0 0 6px;font-weight:700}
.cdStrip div{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.cdStrip button{min-height:44px;padding:8px 12px;border-radius:999px;border:1px solid #9a6322;background:#2a1d10;color:#ffe7b0;font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.cdStrip span{font-size:14px;opacity:.8}
`;
  const style = document.createElement('style'); style.id = 'card-details-css'; style.textContent = css; document.head.appendChild(style);
}

/* ------------------------------------------------------------ Start */
if (B) {
  injectCSS(); baseline();
  addEventListener('ember:frame', e => {
    sweep(); queueStrip();
    if (ui && e.detail?.view !== ui.fromView) close(); // left the screen it was opened from
  });
  addEventListener('ember:tradeComplete', onTradeComplete);
  new MutationObserver(() => { if (B.view === 'index') queueStrip(); }).observe(document.body, { childList: true, subtree: true });
  window.EmberCardDetails = Object.freeze({ open: id => open(id), close: () => close() });
}
