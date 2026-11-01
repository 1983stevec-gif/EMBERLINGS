// EMBERLINGS Mythling Index as a field guide: a parchment encyclopedia of every species (not the card binder).
// Left page: all species as numbered entries (undiscovered ones are ink silhouettes). Right page: the chosen entry.
import { ROLES, ELEMENTS } from '/card-engine.js';
const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
let pick = null;
const ROLE_TEXT = { Striker: 'Hits hard and fast.', Seer: 'Puts foes to sleep and plans ahead.', Healer: 'Restores health to keep fighting.', Charger: 'Builds up Merfling quickly.', Guardian: 'Shields itself from big hits.', Breaker: 'Breaks through shields.', Frostguard: 'Freezes foes in place.', Siphoner: 'Drains and poisons opponents.', Skirmisher: 'Strikes the Bench too.', Warden: 'Protects and switches out safely.' };

function info(kind) {
  const t = document.createElement('div'); t.innerHTML = B.cardHTML({ id: 'fg-' + kind, kind, level: 1, rarity: 'Common' });
  const animal = ($('.cardSpecies', t)?.textContent || '').split('·')[1]?.trim() || '';
  return { animal, hp: parseInt($('.cardTop span', t)?.textContent, 10) || 0, moves: $$('.printedMove', t).map(m => [$('.printedMoveName', m)?.textContent, $('strong', m)?.textContent]), icon: $('.cardTop .elementIcon', t)?.outerHTML || '' };
}
function render() {
  const app = $('#app'); if (!app || B.view !== 'index') return;
  const st = B.state, seen = new Set(st.discovered || []), owned = st.owned || [], n = B.species.length;
  if (pick === null || pick >= n) pick = [...seen][0] ?? 0;
  const packs = (B.packCatalog?.() || []);
  const entry = k => { const s = B.species[k], got = seen.has(k); return `<button type="button" class="fgEntry ${got ? 'seen' : 'unseen'} ${k === pick ? 'on' : ''}" data-fg="${k}" aria-pressed="${k === pick}" aria-label="No. ${k + 1} ${got ? esc(s.name) : 'undiscovered'}"><span class="fgNo">No. ${String(k + 1).padStart(3, '0')}</span><span class="fgPic">${B.art({ kind: k })}</span><span class="fgName">${got ? esc(s.name) : '? ? ?'}</span></button>`; };
  const s = B.species[pick], got = seen.has(pick), d = info(pick), mine = owned.filter(c => c.kind === pick), role = ROLES[pick];
  const best = mine.reduce((a, c) => Math.max(a, c.level || 1), 0), muts = new Set(mine.map(c => c.mutation).filter(Boolean)).size;
  const where = packs.filter(p => p.kinds.includes(pick)).map(p => esc(p.name));
  const wrap = document.createElement('section'); wrap.className = 'fgBook';
  wrap.innerHTML = `<header class="fgHead"><div><p class="fgKick">Field Guide</p><h1>Mythling Index</h1><p class="fgSub">Every Mythling species in the world. Your binder holds the cards you own; this guide records every species you have discovered.</p></div><div class="fgCount"><b>${seen.size}</b><span>of ${n}<br>discovered</span><i style="--p:${seen.size / n * 100}%"></i></div></header>
   <div class="fgPages">
    <div class="fgLeft"><div class="fgGrid">${B.species.map((_, k) => entry(k)).join('')}</div></div>
    <article class="fgRight ${got ? '' : 'unknown'}" aria-live="polite">
     <p class="fgNoBig">No. ${String(pick + 1).padStart(3, '0')}</p>
     <h2>${got ? esc(s.name) : 'Undiscovered'}</h2>
     <p class="fgAnimal">${got ? esc(d.animal) : 'Not yet discovered'}</p>
     <div class="fgPlate">${B.art({ kind: pick })}</div>
     ${got ? `<dl class="fgFacts"><div><dt>Element</dt><dd>${d.icon} ${esc(ELEMENTS[pick])}</dd></div><div><dt>Role</dt><dd>${esc(role)}</dd></div><div><dt>Base HP</dt><dd>${d.hp}</dd></div><div><dt>You own</dt><dd>${mine.length}${best ? ` · best Lv ${best}` : ''}</dd></div></dl>
     <p class="fgNote">${esc(ROLE_TEXT[role] || '')}</p>
     <h3>Starting attacks</h3><ul class="fgMoves">${d.moves.map(([m, dmg]) => `<li><span>${esc(m)}</span><b>${esc(dmg)}</b></li>`).join('')}</ul>
     <p class="fgMeta">Mutations found: <b>${muts} / ${B.MUTATIONS.length}</b></p>` : `<p class="fgNote">Open packs or win battles to discover this Mythling. Its page fills in when you do.</p>`}
     <p class="fgMeta">Found in: ${where.length ? where.join(', ') : 'battle rewards'}</p>
     <div class="fgLinks">${mine.length ? '<button class="button gold" data-go="inventory">See my cards</button>' : '<button class="button gold" data-go="packs">Open packs</button>'}<button class="button alt" data-go="mutationBook">Mutations</button></div>
    </article>
   </div>`;
  for (const el of [...app.children]) if (!el.matches('.uiTop, .nav, #fxLayer, #toast')) el.remove();
  app.append(wrap); document.body.classList.add('fgOpen');
  $$('[data-fg]', wrap).forEach(b => b.onclick = () => { pick = +b.dataset.fg; render(); $('.fgRight')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
  B.bind();
}
if (B) {
  addEventListener('ember:binderReady', e => { if (e.detail?.index) render(); });
  addEventListener('ember:frame', e => { if (e.detail.view !== 'index') document.body.classList.remove('fgOpen'); else queueMicrotask(() => { if (!$('.fgBook')) render(); }); });
}
