// Pack opening: our own card designs shuffle in the centre, flipping fast then slowing, with cards sliding in
// from both sides, and land on the Mythling you pulled with a burst in its rarity colour.
// Presentation only: the game's own roll (and its timing, Stop & Reveal and Reveal All) still decides everything.
const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const calm = () => !!B.state.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
let result = null, run = 0;
const RAR = ['#aebce2', '#7be7b3', '#72b5ff', '#c18aff', '#ffd568', '#73f0f1', '#ff88d4'];

function pool() {
  // Possible Mythlings for this pack, from the game's own "Possible Mythlings" list.
  const names = $$('.rollPool span').map(s => s.textContent.trim());
  const kinds = names.map(n => B.species.findIndex(sp => n.endsWith(sp.name))).filter(k => k >= 0);
  return kinds.length ? kinds : B.species.map((_, i) => i);
}
function face(c) { return `<div class="psFace">${B.cardHTML(c)}</div>`; }

function build() {
  const win = $('.rollWindow'); if (!win || !result || calm() || $('.psStage')) return;
  const id = ++run, kinds = pool(), rarity = B.rarityLabel(result), color = RAR[B.rarityRank(result)] || '#ffd568';
  const rand = () => ({ kind: kinds[Math.floor(Math.random() * kinds.length)], rarity, level: result.level || 1, shiny: Math.random() < .12 });
  const stage = document.createElement('div'); stage.className = 'psStage'; stage.setAttribute('aria-hidden', 'true'); stage.style.setProperty('--rar', color);
  stage.innerHTML = `<div class="psSide psL"></div><div class="psCenter"><div class="psCard">${face(rand())}</div><div class="psGlow"></div></div><div class="psSide psR"></div>`;
  win.after(stage); win.classList.add('psHidden');
  const card = $('.psCard', stage), sideL = $('.psL', stage), sideR = $('.psR', stage);
  const slide = (side, dir) => { const g = document.createElement('div'); g.className = 'psMini'; g.innerHTML = face(rand()); side.appendChild(g); g.animate([{ transform: `translateX(${dir * 140}%) rotate(${dir * 14}deg)`, opacity: 0 }, { transform: `translateX(0) rotate(${dir * -4}deg)`, opacity: .9, offset: .55 }, { transform: `translateX(${dir * -60}%) rotate(${dir * -10}deg) scale(.85)`, opacity: 0 }], { duration: 520, easing: 'ease-out' }).finished.then(() => g.remove(), () => g.remove()); };
  const t0 = performance.now(), DUR = 2450; let landed = false, timer = 0;
  const land = () => {
    if (landed || id !== run) return; landed = true; clearTimeout(timer);
    card.innerHTML = face(result); card.classList.remove('psFlip'); void card.offsetWidth; card.classList.add('psLand');
    stage.classList.add('psDone', 'r' + B.rarityRank(result));
    for (let i = 0; i < 18; i++) { const s = document.createElement('i'); s.className = 'psSpark'; s.style.setProperty('--a', (i / 18 * 360) + 'deg'); s.style.setProperty('--d', (60 + Math.random() * 70) + 'px'); $('.psCenter', stage).appendChild(s); setTimeout(() => s.remove(), 1100); }
  };
  const tick = () => {
    if (id !== run || !stage.isConnected) return;
    const k = Math.min(1, (performance.now() - t0) / DUR);
    if (k >= 1 || $('.rollWinner')) return land();
    card.classList.remove('psFlip'); void card.offsetWidth; card.classList.add('psFlip');
    setTimeout(() => { if (!landed && id === run) card.innerHTML = face(k > .82 && Math.random() < .5 ? { ...rand(), rarity } : rand()); }, 70);
    if (k < .8) { slide(sideL, -1); slide(sideR, 1); }
    stage.classList.toggle('psTense', k > .7);
    timer = setTimeout(tick, 60 + Math.pow(k, 2.2) * 420);
  };
  tick();
  // "Stop & Reveal" lands immediately.
  new MutationObserver((_, o) => { if ($('.rollWinner')) { land(); o.disconnect(); } }).observe($('#rollTrack') || win, { attributes: true, subtree: true, attributeFilter: ['class'] });
}

if (B) {
  addEventListener('ember:packRoll', e => { result = e.detail.creature; });
  addEventListener('ember:frame', e => { if (e.detail.view === 'packOpening') build(); else run++; });
}
