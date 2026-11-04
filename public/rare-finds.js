// Rare finds: a celebration banner when a pack gives something special, and a "Your rarest find" spot on the
// Achievements (profile) page. Rarity is worked out from what the card already has; nothing new is stored.
import { levelPerks } from '/card-engine.js';
import { MUTATIONS, rarityRank, RARITIES } from '/combat-rules.js';

const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const mut = c => MUTATIONS.find(m => m.id === c?.mutation) || null;
const special = c => { try { return levelPerks(c).special || null; } catch { return null; } };

// What makes a card special, most impressive first. Each reason has a weight used to rank cards.
export function rareReasons(c) {
  const out = [], rank = rarityRank(c), m = mut(c), sp = special(c);
  if (sp?.tier === 'veryRare') out.push({ w: 14, tier: 'veryRare', text: `Very rare special: ${sp.name}` });
  if (m?.packOnly) out.push({ w: 9 + MUTATIONS.indexOf(m) * .3, tier: 'veryRare', text: `${m.name} mutation (pack-only)` });
  if (rank >= 4) out.push({ w: rank * 2, tier: rank >= 5 ? 'veryRare' : 'rare', text: `${c.secret ? 'Secret' : RARITIES[rank]} rarity` });
  if (sp?.tier === 'rare') out.push({ w: 6, tier: 'rare', text: `Rare special: ${sp.name}` });
  if (c.shiny) out.push({ w: 4, tier: 'rare', text: 'Shiny' });
  if (m && !m.packOnly) out.push({ w: 1 + MUTATIONS.indexOf(m) * .4, tier: 'rare', text: `${m.name} mutation` });
  return out.sort((a, b) => b.w - a.w);
}
export function rareScore(c) { return rarityRank(c) * 3 + rareReasons(c).reduce((n, r) => n + r.w, 0) + Math.min(100, c.level || 1) / 50; }
export function rarest(list) { let best = null, score = -1; for (const c of list || []) { const s = rareScore(c); if (s > score) { best = c; score = s; } } return best; }
// A pack card is worth celebrating when it is pack-only, Legendary or better, or shiny at Mythic or better.
const worthy = c => !!(mut(c)?.packOnly || rarityRank(c) >= 4 || (c.shiny && rarityRank(c) >= 3));

/* ---------- Banner */
let queue = [], showing = false;
function celebrate(c, delay) {
  queue.push(c);
  if (!showing) { showing = true; setTimeout(next, delay); }
}
function next() {
  const c = queue.shift(); if (!c) { showing = false; return; }
  const reasons = rareReasons(c), top = reasons[0], very = reasons.some(r => r.tier === 'veryRare');
  const others = (B.state.owned || []).filter(o => o.id !== c.id), best = !others.length || rareScore(c) > rareScore(rarest(others));
  $('#rareFind')?.remove();
  const el = document.createElement('div'); el.id = 'rareFind'; el.className = 'rareFind' + (very ? ' very' : ''); el.setAttribute('role', 'status'); el.dataset.cardId = c.id;
  el.innerHTML = `<div class="rfBox"><span class="rfChip">${very ? 'Very rare find!' : 'Rare find!'}</span><div class="rfArt">${B.art(c)}</div>
    <h2>${esc(B.species[c.kind]?.name || 'Mythling')}</h2><p class="rfWhy">${esc(top?.text || '')}</p>
    ${reasons.length > 1 ? `<p class="rfMore">${reasons.slice(1, 3).map(r => esc(r.text)).join(' · ')}</p>` : ''}
    ${best ? '<p class="rfBest">★ Your new rarest card!</p>' : ''}<button type="button" class="rfOk">Awesome!</button></div>`;
  document.body.append(el);
  const done = () => { if (!el.isConnected) return; el.remove(); setTimeout(next, 250); };
  $('.rfOk', el).onclick = done; el.onclick = e => { if (e.target === el) done(); };
  $('.rfOk', el).focus({ preventScroll: true });
  setTimeout(done, 7000);
}

/* ---------- Profile spot */
function profileSpot() {
  if (B.view !== 'achievements' || $('.rfProfile')) return;
  const c = rarest(B.state.owned); const hero = $('#app .hero'); if (!c || !hero) return;
  const reasons = rareReasons(c);
  const sec = document.createElement('section'); sec.className = 'panel rfProfile';
  sec.innerHTML = `<div class="rfCard">${B.cardHTML(c)}</div><div><h2>Your rarest find</h2><h3>${esc(B.species[c.kind]?.name || '')} · Level ${c.level || 1}</h3>
    ${reasons.length ? `<ul>${reasons.map(r => `<li class="${r.tier}">${esc(r.text)}</li>`).join('')}</ul>` : '<p>Open packs and level up your Mythlings to find rare mutations and special abilities.</p>'}</div>`;
  hero.after(sec);
}

if (B) {
  addEventListener('ember:packReveal', e => { const c = e.detail?.creature; if (c && worthy(c)) celebrate(c, 3400); });
  addEventListener('ember:packSummary', e => { const list = (e.detail?.creatures || []).filter(worthy).sort((a, b) => rareScore(b) - rareScore(a)); list.slice(0, 3).forEach(c => celebrate(c, 900)); });
  addEventListener('ember:frame', () => requestAnimationFrame(profileSpot));
  window.EmberRare = { rareReasons, rareScore, rarest };
}
