// EMBERLINGS Home life: a few of the player's own Mythlings idle in the Home scene, the scene is lit by the
// player's local time of day (dawn, day, dusk, night) with occasional light weather, and the header logo
// gets a gentle ember shimmer, glow and rising sparks.
// Visual only. Talks to the game through window.EmberBridge, ember:* events and the DOM. Never changes the save.
// Effects level: <html data-fx="off|light|full"> (default full), plus the game's Reduced motion setting and
// the system prefers-reduced-motion setting.
const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const MAX_PARTICLES = 25; // everything that moves in the scene and the logo sparks, together
const LOGO = '/branding/emberlings-logo-transparent.webp';
const PHASE_LABEL = { dawn: 'Dawn', day: 'Day', dusk: 'Dusk', night: 'Night' };

let timers = [], live = 0, pals = [], force = {}, lastSize = '';

/* ---------------------------------------------------------------- Settings */
const sysCalm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// off: static lighting tint only. calm (reduced motion): tint, stars and still Mythlings, nothing moves.
// light: tint, Mythlings bob with fewer perks, fireflies and stars, no weather, logo glow without sparks. full: everything.
function level() {
  const fx = document.documentElement.dataset.fx;
  if (fx === 'off') return 'off';
  if (B?.state?.reducedMotion || sysCalm()) return 'calm';
  return fx === 'light' ? 'light' : 'full';
}
function phase(now = new Date()) {
  if (force.phase) return force.phase;
  const h = now.getHours() + now.getMinutes() / 60;
  return h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 17 ? 'day' : h >= 17 && h < 20.5 ? 'dusk' : 'night';
}
// Light weather comes and goes: the same pick for each two-hour spell of the day, chosen to suit the season.
function weather(now = new Date()) {
  if (force.weather !== undefined) return force.weather;
  const seasonal = window.EmberSeasons?.homeWeather?.(now); // seasons.js draws its own snow, leaves or petals
  if (seasonal) return seasonal;
  const spell = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${Math.floor(now.getHours() / 2)}`;
  let h = 2166136261; for (const ch of spell) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const r = (h >>> 0) % 100, m = now.getMonth();
  if (r < 45) return 'clear';
  const season = m === 11 || m <= 1 ? ['snow', 'snow', 'embers'] : m <= 4 ? ['rain', 'leaves', 'embers'] : m <= 7 ? ['embers', 'rain', 'embers'] : ['leaves', 'leaves', 'rain', 'embers'];
  return season[r % season.length];
}

/* ---------------------------------------------------------------- Timers */
const every = (fn, a, b) => { let id; const loop = () => { id = setTimeout(() => { fn(); loop(); }, rand(a, b)); timers.push(() => clearTimeout(id)); }; loop(); };
function stop() { for (const t of timers) t(); timers = []; }
const active = () => B?.view === 'home' && !document.hidden;

/* ---------------------------------------------------------------- Scene host */
// Desktop: the painted Home page (mockup 1586 × 992; the hero picture is x 0–1122, y 78–552, left of the deck panel).
// Tablets and phones: the Home hero panel.
function host() {
  const x = $('.uiHome .uiX.uiXHome');
  if (x) return { el: x, kind: 'exact', style: `left:0;top:${78 / 992 * 100}%;width:${1122 / 1586 * 100}%;height:${(552 - 78) / 992 * 100}%` };
  const h = $('.uiHome .uiHero');
  if (h) return { el: h, kind: 'hero', style: 'inset:0' };
  return null;
}
// Free spots for the Mythlings (percent of the scene), away from the text, buttons and the big fox.
function slots(kind, w) {
  if (kind === 'exact') return [[7, 19], [47, 15], [94, 70]];
  if (w < 500) return [[13, 13], [50, 11]];
  return [[8, 14], [45, 13], [91, 86]];
}
function choosePals(n) {
  const owned = (B.state.owned || []).filter(c => c && c.kind !== undefined && c.cardType !== 'trainer' && B.species?.[c.kind]);
  const ids = new Set(owned.map(c => c.id));
  pals = pals.filter(c => ids.has(c.id));
  const seen = new Set(pals.map(c => c.kind));
  const pool = owned.filter(c => !seen.has(c.kind)).sort(() => Math.random() - .5);
  for (const c of pool) { if (pals.length >= n) break; if (seen.has(c.kind)) continue; seen.add(c.kind); pals.push(c); }
  return pals.slice(0, n);
}
const nameOf = c => { try { return B.meta(c)?.name || 'Mythling'; } catch { return 'Mythling'; } };

/* ---------------------------------------------------------------- Build */
function particles(ph, wx, lv, small) {
  const out = [];
  const add = (cls, style) => out.push(`<i class="${cls}" style="${style}"></i>`);
  if (ph === 'night') {
    for (let i = 0; i < (small ? 6 : 8); i++) add('hlStar', `--x:${rand(3, 97).toFixed(1)}%;--y:${rand(3, 34).toFixed(1)}%;--s:${rand(1.5, 3).toFixed(1)}px;--d:${rand(2.5, 5).toFixed(2)}s;--dl:${rand(-5, 0).toFixed(2)}s`);
    if (lv === 'full' || lv === 'light') for (let i = 0; i < (lv === 'full' ? 5 : 3); i++) add('hlFly', `--x:${rand(30, 96).toFixed(1)}%;--y:${rand(45, 92).toFixed(1)}%;--d:${rand(7, 12).toFixed(2)}s;--dl:${rand(-12, 0).toFixed(2)}s;--dx:${rand(-60, 60).toFixed(0)}%;--dy:${rand(-90, -20).toFixed(0)}%`);
  }
  if (lv === 'full' && wx !== 'clear') {
    const room = MAX_PARTICLES - 4 - out.length; // keep a few for sparkles and logo sparks
    const n = Math.min(room, small ? 9 : wx === 'rain' ? 16 : 13);
    for (let i = 0; i < n; i++) {
      const x = rand(0, 100).toFixed(1), dl = rand(-14, 0).toFixed(2), sway = rand(-40, 40).toFixed(0);
      if (wx === 'rain') add('hlRain', `--x:${x}%;--d:${rand(.75, 1.2).toFixed(2)}s;--dl:${rand(-1.2, 0).toFixed(2)}s;--h:${rand(14, 24).toFixed(0)}px`);
      else if (wx === 'snow') add('hlSnow', `--x:${x}%;--d:${rand(9, 15).toFixed(2)}s;--dl:${dl}s;--s:${rand(3, 6).toFixed(1)}px;--sw:${sway}px`);
      else if (wx === 'leaves') add('hlLeaf', `--x:${x}%;--d:${rand(9, 14).toFixed(2)}s;--dl:${dl}s;--s:${rand(9, 14).toFixed(1)}px;--sw:${sway}px;--r:${rand(240, 600).toFixed(0)}deg;--c:${pick(['#d9822b', '#c4561f', '#e3b23c', '#9c6b2f'])}`);
      else add('hlEmber', `--x:${x}%;--d:${rand(6, 10).toFixed(2)}s;--dl:${dl}s;--s:${rand(2.5, 4.5).toFixed(1)}px;--sw:${sway}px`);
    }
  }
  return out.join('');
}
function mount() {
  stop();
  $$('.hlScene').forEach(e => e.remove());
  document.body.classList.toggle('hlHome', B?.view === 'home');
  if (B?.view !== 'home') return;
  const h = host(); if (!h) return;
  const lv = level(), ph = phase(), wx = weather(), w = h.el.getBoundingClientRect().width, small = w < 500;
  document.body.dataset.hlFx = lv;
  lastSize = h.kind + (small ? 's' : 'l');
  const scene = document.createElement('div');
  scene.className = 'hlScene'; scene.dataset.phase = ph; scene.dataset.weather = lv === 'full' ? wx : 'clear'; scene.dataset.fx = lv;
  scene.setAttribute('style', h.style);
  let palsHTML = '';
  if (lv !== 'off') {
    const sl = slots(h.kind, w).slice(0, lv === 'light' ? 2 : 3), chosen = choosePals(sl.length);
    palsHTML = chosen.map((c, i) => `<span class="hlPal" data-i="${i}" title="${nameOf(c).replace(/"/g, '&quot;')}" style="--x:${sl[i][0]}%;--y:${sl[i][1]}%;--d:${rand(5.5, 8).toFixed(2)}s;--dl:${rand(-8, 0).toFixed(2)}s;--dx:${rand(-9, 9).toFixed(0)}%"><span class="hlPalBody"><span class="hlPalOrb">${B.art(c)}</span></span></span>`).join('');
  }
  scene.innerHTML = `<div class="hlTint" aria-hidden="true"></div><div class="hlGlow" aria-hidden="true"></div>
   <div class="hlFx" aria-hidden="true">${lv === 'off' ? '' : particles(ph, wx, lv, small)}</div><div class="hlPals" aria-hidden="true">${palsHTML}</div>`;
  h.el.appendChild(scene);
  scene.querySelectorAll('.hlPal').forEach((el, i) => { el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); hop(el, pals[i]); }); });
  live = 0;
  decorateLogo(lv);
  if (lv === 'full' || lv === 'light') every(perk, lv === 'full' ? 2600 : 6000, lv === 'full' ? 5200 : 11000);
  if (lv === 'full') every(logoSparks, 2600, 5200);
  every(() => { if (phase() !== scene.dataset.phase) mount(); }, 60000, 60000);
}

/* ---------------------------------------------------------------- Mythling moments */
const anim = (el, frames, opts) => el.animate(frames, { easing: 'ease-in-out', ...opts });
function perk() {
  if (!active()) return;
  const all = $$('.hlScene .hlPal:not(.hlBusy)'); if (!all.length) return;
  const el = pick(all), body = $('.hlPalBody', el), kind = pick(['blink', 'blink', 'glance', 'perk', 'sparkle']);
  if (kind === 'blink') anim(body, [{ transform: 'scale(1,1)' }, { transform: 'scale(1.06,.86)', offset: .35 }, { transform: 'scale(.97,1.05)', offset: .7 }, { transform: 'scale(1,1)' }], { duration: 420 });
  else if (kind === 'glance') { const d = pick([-1, 1]); anim(body, [{ transform: 'rotate(0) translateX(0)' }, { transform: `rotate(${d * 9}deg) translateX(${d * 5}%)`, offset: .25 }, { transform: `rotate(${d * 9}deg) translateX(${d * 5}%)`, offset: .75 }, { transform: 'rotate(0) translateX(0)' }], { duration: 1500 }); }
  else if (kind === 'perk') anim(body, [{ transform: 'translateY(0) scale(1,1)' }, { transform: 'translateY(-12%) scale(.93,1.09)', offset: .4 }, { transform: 'translateY(0) scale(1.05,.95)', offset: .75 }, { transform: 'translateY(0) scale(1,1)' }], { duration: 650 });
  if (kind === 'sparkle' || kind === 'perk') sparkle(el);
}
function sparkle(el) {
  if (live >= 3) return; live++;
  const s = document.createElement('i'); s.className = 'hlSparkle'; s.textContent = '✦';
  s.style.cssText = `left:${rand(60, 95).toFixed(0)}%;top:${rand(-5, 25).toFixed(0)}%`;
  el.appendChild(s);
  const a = s.animate([{ transform: 'scale(0) rotate(0)', opacity: 0 }, { transform: 'scale(1.1) rotate(60deg)', opacity: 1, offset: .35 }, { transform: 'scale(.4) rotate(140deg)', opacity: 0 }], { duration: 900, easing: 'ease-out' });
  const done = () => { if (s.isConnected) { s.remove(); live--; } };
  a.onfinish = done; setTimeout(done, 1400);
}
function hop(el, c) {
  if (!el.isConnected) return;
  const lv = level(), body = $('.hlPalBody', el);
  $('.hlName', el)?.remove();
  const tag = document.createElement('span'); tag.className = 'hlName'; tag.textContent = `${nameOf(c)} ♥`;
  if (parseFloat(el.style.getPropertyValue('--y')) < 40) tag.classList.add('hlBelow');
  el.appendChild(tag);
  // Keep the name tag inside the scene.
  requestAnimationFrame(() => { const sr = el.closest('.hlScene')?.getBoundingClientRect(), tr = tag.getBoundingClientRect(); if (!sr) return; const shift = tr.left < sr.left + 4 ? sr.left + 4 - tr.left : tr.right > sr.right - 4 ? sr.right - 4 - tr.right : 0; if (shift) tag.style.marginLeft = shift + 'px'; });
  setTimeout(() => tag.remove(), 1900);
  if (lv === 'calm' || lv === 'off') return;
  el.classList.add('hlBusy');
  anim(body, [
    { transform: 'translateY(0) scale(1,1)' }, { transform: 'translateY(4%) scale(1.12,.86)', offset: .14 },
    { transform: 'translateY(-55%) scale(.9,1.12)', offset: .45 }, { transform: 'translateY(0) scale(1.14,.84)', offset: .78 },
    { transform: 'translateY(0) scale(1,1)' }], { duration: 720 }).onfinish = () => el.classList.remove('hlBusy');
  sparkle(el); setTimeout(() => sparkle(el), 260);
}

/* ---------------------------------------------------------------- Logo */
// The compact header shows the logo as an <img>; the painted header shows the same image as the logo button's background.
function decorateLogo(lv) {
  if (lv === 'off' || lv === 'calm') return;
  for (const img of $$('.uiTop .uiBrand .uiLogoNew')) {
    if (img.parentElement.classList.contains('hlLogoWrap')) continue;
    const wrap = document.createElement('span'); wrap.className = 'hlLogoWrap';
    img.replaceWith(wrap); wrap.append(img);
    wrap.insertAdjacentHTML('afterbegin', '<i class="hlLogoGlow" aria-hidden="true"></i>');
    wrap.insertAdjacentHTML('beforeend', '<i class="hlLogoShine" aria-hidden="true"><b></b></i>');
  }
  for (const b of $$('.uiTop .uiPLogo')) {
    if ($('.hlLogoShine', b)) continue;
    b.classList.add('hlPLogo');
    b.insertAdjacentHTML('beforeend', '<i class="hlLogoGlow" aria-hidden="true"></i><i class="hlLogoShine" aria-hidden="true"><b></b></i>');
  }
}
function logoSparks() {
  if (!active()) return;
  const box = [...$$('.uiTop .hlLogoWrap'), ...$$('.uiTop .hlPLogo')].find(e => e.getClientRects().length && e.offsetWidth > 0);
  if (!box) return;
  const n = Math.random() < .4 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    if (live >= 4) return; live++;
    const s = document.createElement('i'); s.className = 'hlSpark'; s.setAttribute('aria-hidden', 'true');
    s.style.cssText = `left:${rand(14, 88).toFixed(0)}%;top:${rand(45, 70).toFixed(0)}%;--sx:${rand(-14, 14).toFixed(0)}px;--d:${rand(1.4, 2.2).toFixed(2)}s;animation-delay:${(i * .35).toFixed(2)}s`;
    box.appendChild(s);
    const done = () => { if (s.isConnected) { s.remove(); live--; } };
    s.addEventListener('animationend', done); setTimeout(done, 3200);
  }
}

/* ---------------------------------------------------------------- Styles */
const CSS = `
/* Home life (public/home-life.js): Home scene lighting, weather, idle Mythlings and the animated logo */
.hlScene{position:absolute;pointer-events:none;overflow:hidden;border-radius:inherit}
.hlScene>div{position:absolute;inset:0;pointer-events:none;z-index:1}
.hlFx,.hlPals{container-type:size}
/* Time-of-day tint: softer over the headline side so the words stay easy to read */
.hlTint,.hlGlow{-webkit-mask:linear-gradient(90deg,#0009 0,#0009 22%,#000 55%);mask:linear-gradient(90deg,#0009 0,#0009 22%,#000 55%)}
.hlTint{mix-blend-mode:soft-light}
.hlGlow{mix-blend-mode:screen}
.hlScene[data-phase=dawn] .hlTint{mix-blend-mode:multiply;background:linear-gradient(180deg,#ffd2b4,#ffe6d2 50%,#dccbe6)}
.hlScene[data-phase=dawn] .hlGlow{background:radial-gradient(ellipse 60% 55% at 58% 16%,#ffc48a4d,transparent 70%),linear-gradient(180deg,#ffb48a1f,transparent 60%)}
.hlScene[data-phase=day] .hlTint{background:linear-gradient(180deg,#fffbe833,transparent 60%)}
.hlScene[data-phase=day] .hlGlow{background:radial-gradient(ellipse 55% 50% at 55% 12%,#fff6d826,transparent 70%)}
.hlScene[data-phase=dusk] .hlTint{mix-blend-mode:multiply;background:linear-gradient(180deg,#ffa49a,#ffc08c 48%,#a985b8)}
.hlScene[data-phase=dusk] .hlGlow{background:radial-gradient(ellipse 70% 50% at 52% 28%,#ff8a5a40,transparent 72%)}
.hlScene[data-phase=night] .hlTint{mix-blend-mode:multiply;background:linear-gradient(180deg,#3c4fa0,#5468b4 55%,#40508f)}
.hlScene[data-phase=night] .hlGlow{background:radial-gradient(circle at 54% 14%,#cfe0ff30,transparent 30%),linear-gradient(180deg,#1a2a6a26,transparent)}
.hlScene[data-phase=night] .hlFx{z-index:1}
/* Stars and fireflies */
.hlFx i{position:absolute;left:var(--x);top:var(--y,0);will-change:transform,opacity}
.hlStar{width:var(--s);height:var(--s);border-radius:50%;background:#fffbe8;box-shadow:0 0 4px #cfe0ff;animation:hlTwinkle var(--d) ease-in-out var(--dl) infinite}
.hlFly{width:5px;height:5px;border-radius:50%;background:#fff6a8;box-shadow:0 0 6px 2px #e8ff7a88;animation:hlWander var(--d) ease-in-out var(--dl) infinite alternate,hlPulse 2.4s ease-in-out var(--dl) infinite}
@keyframes hlTwinkle{0%,100%{opacity:.25;transform:scale(.7)}50%{opacity:1;transform:scale(1.1)}}
@keyframes hlWander{0%{transform:translate(0,0)}50%{transform:translate(var(--dx),calc(var(--dy) * .4))}100%{transform:translate(calc(var(--dx) * -.6),var(--dy))}}
@keyframes hlPulse{0%,100%{opacity:.15}50%{opacity:1}}
/* Light weather */
.hlRain{top:-12%!important;width:2px;height:var(--h);border-radius:2px;background:linear-gradient(#e6f2ff00,#e6f2ffd9);rotate:12deg;opacity:.6;animation:hlFall var(--d) linear var(--dl) infinite}
.hlSnow{top:-4%!important;width:var(--s);height:var(--s);border-radius:50%;background:#fff;box-shadow:0 0 4px #fff8;opacity:.85;animation:hlDrift var(--d) linear var(--dl) infinite}
.hlLeaf{top:-6%!important;width:var(--s);height:calc(var(--s) * .62);border-radius:0 80% 0 80%;background:var(--c);opacity:.9;animation:hlLeafFall var(--d) linear var(--dl) infinite}
.hlEmber{top:auto!important;bottom:-4%;width:var(--s);height:var(--s);border-radius:50%;background:#ffd27a;box-shadow:0 0 6px 1px #ff8a2acc;animation:hlRise var(--d) ease-in var(--dl) infinite}
@keyframes hlFall{from{transform:translate(0,0)}to{transform:translate(-22cqh,118cqh)}}
@keyframes hlDrift{0%{transform:translate(0,0)}25%{transform:translate(var(--sw),28cqh)}50%{transform:translate(0,55cqh)}75%{transform:translate(calc(var(--sw) * -1),82cqh)}100%{transform:translate(0,110cqh)}}
@keyframes hlLeafFall{0%{transform:translate(0,0) rotate(0)}30%{transform:translate(var(--sw),33cqh) rotate(calc(var(--r) * .3))}65%{transform:translate(calc(var(--sw) * -1),72cqh) rotate(calc(var(--r) * .65))}100%{transform:translate(var(--sw),112cqh) rotate(var(--r))}}
@keyframes hlRise{0%{transform:translate(0,0);opacity:0}12%{opacity:.95}60%{transform:translate(var(--sw),-60cqh);opacity:.7}100%{transform:translate(calc(var(--sw) * -.5),-105cqh);opacity:0}}
/* Idle Mythlings: small glowing spirit orbs that drift, blink and perk up; tap one for a happy hop */
.hlPal{position:absolute;left:var(--x);top:var(--y);width:clamp(42px,7cqw,82px);aspect-ratio:1;translate:-50% -50%;pointer-events:auto;cursor:pointer;-webkit-tap-highlight-color:transparent;animation:hlBob var(--d) ease-in-out var(--dl) infinite alternate;will-change:transform}
.hlPalBody{position:absolute;inset:0;transform-origin:50% 90%}
.hlPalOrb{position:absolute;inset:0;border-radius:50%;overflow:hidden;box-shadow:0 0 0 1.5px #f3c56acc,0 0 14px 3px #ffb04a55,0 6px 12px #0007;background:#1a2340}
.hlPalOrb .mythlingArt{position:absolute!important;inset:0;width:100%!important;height:100%!important}
.hlPalOrb::after{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 32% 26%,#ffffff55,transparent 34%),radial-gradient(circle,transparent 58%,#0b0e1a66);pointer-events:none}
@keyframes hlBob{0%{transform:translate(0,0) rotate(-2deg)}50%{transform:translate(var(--dx),-9%) rotate(1.5deg)}100%{transform:translate(calc(var(--dx) * -.6),5%) rotate(-1deg)}}
.hlSparkle{position:absolute;font-style:normal;font-size:clamp(11px,1.6cqw,16px);line-height:1;color:#fff3c4;text-shadow:0 0 6px #ffcf6a;pointer-events:none;opacity:0}
.hlName{position:absolute;left:50%;bottom:calc(100% + 6px);translate:-50% 0;white-space:nowrap;padding:3px 10px;border-radius:999px;background:#0d1328e6;border:1px solid #e9b75a;color:#ffe6ae;font:700 13px/1.3 'Cormorant Garamond',Georgia,serif;letter-spacing:.02em;box-shadow:0 4px 12px #0008;pointer-events:none;animation:hlTag 1.9s ease-out both}
.hlName.hlBelow{bottom:auto;top:calc(100% + 6px)}
@keyframes hlTag{0%{opacity:0;transform:translateY(4px) scale(.9)}12%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0;transform:translateY(-4px)}}
.hlScene[data-fx=calm] .hlPal,.hlScene[data-fx=calm] .hlFx i{animation:none}
.hlScene[data-fx=calm] .hlStar{opacity:.7}
.hlScene[data-fx=calm] .hlName{animation:none}
/* Animated logo: a soft ember glow, a shimmer sweeping across the letters and the odd rising spark (Home only) */
.hlLogoWrap{position:relative;display:block}
.hlLogoWrap>img{position:relative}
.hlLogoGlow,.hlLogoShine{position:absolute;pointer-events:none;display:none}
body.hlHome:not([data-hl-fx=off]):not([data-hl-fx=calm]) .hlLogoGlow,body.hlHome:not([data-hl-fx=off]):not([data-hl-fx=calm]) .hlLogoShine{display:block}
.hlLogoGlow{inset:-14% -6%;background:radial-gradient(ellipse 50% 50% at 50% 55%,#ff9a3a55,#ff6a1a22 55%,transparent 75%);animation:hlLogoPulse 3.8s ease-in-out infinite}
.hlLogoShine{inset:0;overflow:hidden;-webkit-mask:url(${LOGO}) center/contain no-repeat;mask:url(${LOGO}) center/contain no-repeat}
.hlLogoShine b{position:absolute;top:-10%;bottom:-10%;left:0;width:34%;background:linear-gradient(100deg,transparent,#fff4d066 40%,#ffffffcc 50%,#fff4d066 60%,transparent);transform:translateX(-120%);animation:hlShine 6.5s ease-in-out 1.2s infinite;will-change:transform}
.hlPLogo .hlLogoGlow{inset:-4% 0;mix-blend-mode:screen;background:radial-gradient(ellipse 48% 46% at 52% 52%,#ff9a3a40,#ff6a1a14 60%,transparent 78%)}
.hlPLogo .hlLogoShine b{background:linear-gradient(100deg,transparent,#fff4d055 40%,#ffffffb3 50%,#fff4d055 60%,transparent)}
@keyframes hlLogoPulse{0%,100%{opacity:.5}50%{opacity:1}}
@keyframes hlShine{0%{transform:translateX(-120%)}28%,100%{transform:translateX(330%)}}
.hlSpark{position:absolute;width:3px;height:3px;border-radius:50%;background:#ffe2a0;box-shadow:0 0 5px 1px #ff9a3acc;pointer-events:none;opacity:0;z-index:2;animation:hlSparkUp var(--d) ease-out both}
@keyframes hlSparkUp{0%{opacity:0;transform:translate(0,0) scale(1)}15%{opacity:1}100%{opacity:0;transform:translate(var(--sx),-46px) scale(.4)}}
body.hlPaused .hlScene *,body.hlPaused .hlLogoGlow,body.hlPaused .hlLogoShine b{animation-play-state:paused!important}
@media(prefers-reduced-motion:reduce){.hlScene *,.hlLogoGlow,.hlLogoShine b{animation:none!important}.hlLogoShine,.hlSpark{display:none!important}}
.reduceMotion .hlLogoShine,.reduceMotion .hlSpark{display:none!important}
`;

/* ---------------------------------------------------------------- Wiring */
if (B) {
  const st = document.createElement('style'); st.id = 'hlStyle'; st.textContent = CSS; document.head.appendChild(st);
  let queued = false;
  const remount = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; mount(); }); };
  addEventListener('ember:frame', remount);
  document.addEventListener('visibilitychange', () => { document.body.classList.toggle('hlPaused', document.hidden); if (document.hidden) stop(); else if (B.view === 'home') remount(); });
  new MutationObserver(remount).observe(document.documentElement, { attributes: true, attributeFilter: ['data-fx'] });
  try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', remount); } catch {}
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { const h = host(); if (!h || B.view !== 'home') return; const size = h.kind + (h.el.getBoundingClientRect().width < 500 ? 's' : 'l'); if (size !== lastSize || !$('.hlScene', h.el)) mount(); }, 250); });
  // A small hook for checks and previews: EmberHomeLife.set({ phase: 'night', weather: 'snow' }).
  window.EmberHomeLife = Object.freeze({ phase: () => phase(), weather: () => weather(), level: () => level(), set: o => { force = { ...(o || {}) }; mount(); }, refresh: () => mount(), label: () => PHASE_LABEL[phase()] });
  if (B.view === 'home') remount();
}
