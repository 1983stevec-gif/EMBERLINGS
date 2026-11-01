// EMBERLINGS level path: a popup when a Mythling reaches a level with a new move, ability or special ability.
// Plain level-ups (and +5 HP steps) get a short toast. The rules live in card-engine.js (levelPerks / levelRewardsAt).
import { levelRewardsAt, MAX_LEVEL } from '/card-engine.js';
const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const queue = []; let showing = false;

function onLevelUp({ creature: c, from, to }) {
  if (!c) return;
  const rewards = [];
  for (let l = from + 1; l <= to; l++) rewards.push(...levelRewardsAt(c, l));
  const big = rewards.filter(r => r.kind !== 'hp'), hp = rewards.filter(r => r.kind === 'hp').length * 5, name = B.species[c.kind]?.name || 'Your Mythling';
  if (!big.length) { B.toast(`⬆ ${name} reached level ${to}${hp ? ` · +${hp} HP` : ''}${to >= MAX_LEVEL ? ' · MAX' : ''}`); return; }
  queue.push({ c, to, hp, big }); next();
}
function next() {
  // Wait until no other overlay (3D reveal, fusion popup) is on screen.
  if (showing || !queue.length) return;
  if ($('.fxStage') || $('.uiFAbility')) { setTimeout(next, 300); return; }
  const { c, to, hp, big } = queue.shift(); showing = true;
  const special = big.find(r => r.kind === 'veryRare') || big.find(r => r.kind === 'rare');
  const o = document.createElement('div'); o.className = 'uiFAbility uiLvUp' + (special ? ' ' + special.kind : ''); o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Level up');
  o.style.setProperty('--glow', special?.kind === 'veryRare' ? '#ff8af0' : special ? '#7fd8ff' : '#ffcf6a');
  o.innerHTML = `<div class="uiFAbBox"><p class="uiFAbKick">Level up!</p><h2>${esc(B.species[c.kind]?.name || '')} <span class="uiLvNum">Lv ${to}${to >= MAX_LEVEL ? ' · MAX' : ''}</span></h2>
    <ul class="uiLvList">${big.map(r => `<li class="${r.kind}"><strong>${esc(r.text)}</strong>${r.kind === 'move' ? `<span>${r.replaces ? `Replaces ${esc(r.replaces)} · ` : ''}${r.cost} Merfling · base damage +${r.bonus}</span>` : r.detail ? `<span>${esc(r.detail)}</span>` : ''}</li>`).join('')}${hp ? `<li class="hp"><strong>+${hp} HP</strong></li>` : ''}</ul>
    <div class="uiLvCard"></div><button class="button gold" type="button">Continue</button></div>`;
  const card = $('.uiLvCard', o); card.innerHTML = `<div class="uiLvCardIn">${B.cardHTML(c)}</div>`;
  document.body.appendChild(o);
  const done = () => { o.classList.add('out'); setTimeout(() => { o.remove(); showing = false; next(); }, 350); };
  $('button', o).onclick = done; $('button', o).focus();
}
if (B) addEventListener('ember:levelUp', e => onLevelUp(e.detail));
