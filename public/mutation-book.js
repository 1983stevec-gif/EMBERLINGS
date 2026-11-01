// EMBERLINGS Mutation Collection: one page per Mythling, one slot for each of the 12 mutations.
// Found mutations show your best copy of that card; missing ones are dark silhouettes.
const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
let kind = 0;
const fitRO = new ResizeObserver(es => { for (const e of es) e.target.style.setProperty('--s', (e.target.clientWidth / 230).toFixed(4)); });
const best = (k, id) => (B.state.owned || []).filter(c => c.kind === k && c.mutation === id).sort((a, b) => B.rarityRank(b) - B.rarityRank(a) || (b.level || 1) - (a.level || 1) || (b.shiny ? 1 : 0) - (a.shiny ? 1 : 0))[0];
const found = k => B.MUTATIONS.filter(m => best(k, m.id)).length;

function render() {
  const n = B.species.length, sp = B.species[kind] || {}, have = found(kind);
  const total = B.species.reduce((t, _, k) => t + found(k), 0);
  B.render(`<section class="uiMutBook"><button class="back" data-go="inventory">‹ My Binder</button>
   <header class="uiMBHead"><div><h1>Mutation Collection</h1><p>Every Mythling can carry ${B.MUTATIONS.length} mutations. Find them in packs or buy them in the Mutation Vault. <strong>${total} / ${n * B.MUTATIONS.length}</strong> collected.</p></div>
   <a class="button alt" data-go="mutation">Mutation Vault ›</a></header>
   <nav class="uiMBPager" aria-label="Choose a Mythling"><button id="uiMBPrev" aria-label="Previous Mythling">‹</button><label><span class="uiSr">Mythling</span><select id="uiMBPick">${B.species.map((s, k) => `<option value="${k}" ${k === kind ? 'selected' : ''}>${esc(s.name)} · ${found(k)}/${B.MUTATIONS.length}</option>`).join('')}</select></label><button id="uiMBNext" aria-label="Next Mythling">›</button></nav>
   <h2 class="uiMBTitle">${esc(sp.name || '')} <small>${have} / ${B.MUTATIONS.length} mutations found · page ${kind + 1} of ${n}</small></h2>
   <div class="uiMBGrid">${B.MUTATIONS.map(m => { const c = best(kind, m.id); return `<figure class="uiMBSlot ${c ? 'got' : 'miss'}" style="--mut:${m.color}"><span class="uiMBFit"><span class="uiMBFitIn">${B.cardHTML(c || { id: 'mb-' + kind + '-' + m.id, kind, level: 1, mutation: m.id, rarity: 'Common' })}</span></span>${c ? '' : '<span class="uiMBLock" aria-hidden="true">?</span>'}<figcaption><i>${m.icon}</i> ${esc(m.name)}<small>${c ? `Found · Lv ${c.level || 1}` : 'Not found yet'}</small></figcaption></figure>`; }).join('')}</div></section>`);
  for (const f of $$('.uiMBFit')) fitRO.observe(f);
  const go = k => { kind = (k + n) % n; render(); };
  $('#uiMBPrev').onclick = () => go(kind - 1); $('#uiMBNext').onclick = () => go(kind + 1); $('#uiMBPick').onchange = e => go(+e.target.value);
  B.bind();
}
if (B) B.registerView('mutationBook', render);
