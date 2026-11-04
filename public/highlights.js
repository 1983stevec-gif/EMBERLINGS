// EMBERLINGS battle highlights: quietly notes the big moments of a card battle
// (biggest hit, super-effective hits, knockouts, evolutions, comebacks, final blow, MVP)
// and shows them on the Victory screen, with a "Share" button that makes a recap picture.
// It only watches the battle (ember:cardBattle / ember:cardResult and the DOM). It never changes it.
import { ADVANTAGE } from './card-engine.js';

const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

/* ------------------------------------------------------------ Recording */
let rec = null;      // what has happened in the current battle
let held = null;     // the saved quest battle object, so the final blow can be read after the game clears it

function fresh(match, side) {
  return { sig: match.sides.map(s => s.name).join('|'), side, names: match.sides.map(s => s.name), prev: null, rev: -1,
    attacks: [], evos: [], behindBy: 0, turns: 0, points: [0, 0], cards: [new Map(), new Map()] };
}
function snapshot(match) {
  return match.sides.map(s => {
    const c = s.cards.find(c => c.id === s.active);
    return { active: s.active, hp: c?.hp, maxhp: c?.maxhp, el: c?.element, under: [...(c?.under || [])], points: s.points || 0,
      bench: [...(s.bench || [])], benchUnder: (s.bench || []).map(id => [...(s.cards.find(c => c.id === id)?.under || [])]) };
  });
}
const attackKey = la => la ? [la.side, la.move, la.damage, la.at].join(':') : '';

function observe(match, side) {
  if (!match?.sides || match.sides.length < 2) return;
  const sig = match.sides.map(s => s.name).join('|');
  if (!rec || rec.sig !== sig || (match.revision ?? 0) < rec.rev) rec = fresh(match, side);
  rec.side = side;
  rec.rev = match.revision ?? rec.rev;
  match.sides.forEach((s, i) => s.cards.forEach(c => { if (c.cardType !== 'trainer' && Number.isInteger(c.kind)) rec.cards[i].set(c.id, c); }));
  const snap = snapshot(match), key = attackKey(match.lastAttack), before = rec.prev;
  rec.prev = { snap, key };
  rec.turns = Math.max(rec.turns, match.turnNumber || 0);
  rec.points = snap.map(s => s.points);
  rec.behindBy = Math.max(rec.behindBy, snap[1 - side].points - snap[side].points);
  if (!before) return;
  const la = match.lastAttack;
  if (key && key !== before.key && la && (la.side === 0 || la.side === 1)) {
    const a = la.side, d = 1 - a, was = before.snap[d], atk = before.snap[a];
    if (was.active && atk.active) {
      const weak = !!atk.el && ADVANTAGE[atk.el] === was.el;
      const ko = snap[d].active !== was.active || snap[d].hp <= 0;
      rec.attacks.push({ side: a, by: atk.active, on: was.active, dmg: Number(la.damage) || 0, weak, ko, move: la.move, n: rec.attacks.length });
    }
  }
  for (let i = 0; i < 2; i++) {
    const was = before.snap[i], now = snap[i];
    if (now.active && now.active !== was.active && now.under.includes(was.active)) rec.evos.push({ side: i, from: was.active, to: now.active });
    now.bench.forEach((id, k) => { if (was.bench[k] && was.bench[k] !== id && now.benchUnder[k].includes(was.bench[k])) rec.evos.push({ side: i, from: was.bench[k], to: id }); });
  }
}

/* ------------------------------------------------------------ Turning records into highlights */
const VERB = { Fire: 'scorched', Water: 'drenched', Nature: 'lashed', Lightning: 'zapped', Wind: 'buffeted', Moon: 'eclipsed', Shadow: 'ambushed', Crystal: 'shattered', Ice: 'froze' };
const STAGE = ['', 'Ascended', 'Apex'];
const nameOf = c => (c && B.species[c.kind]?.name) || 'A Mythling';

function build(r) {
  if (!rec) return null;
  const me = rec.side, foe = 1 - me, card = (s, id) => rec.cards[s].get(id);
  const mine = rec.attacks.filter(a => a.side === me);
  const points = [...rec.points];
  if (r.victory && /point/i.test(r.reason || '') && points[me] < 3) points[me] = 3;
  const dmgBy = new Map(), koBy = new Map();
  mine.forEach(a => { dmgBy.set(a.by, (dmgBy.get(a.by) || 0) + a.dmg); if (a.ko) koBy.set(a.by, (koBy.get(a.by) || 0) + 1); });
  let mvp = null;
  for (const [id, dmg] of dmgBy) if (!mvp || dmg > mvp.dmg || (dmg === mvp.dmg && (koBy.get(id) || 0) > mvp.kos)) mvp = { id, dmg, kos: koBy.get(id) || 0 };
  if (mvp) mvp.card = card(me, mvp.id);
  if (mvp && !mvp.card) mvp = null;

  const list = [], used = new Set(), shown = [];
  const add = (h, a) => { if (a) { used.add(a.n); shown.push(a); } list.push(h); };
  // Skip a moment that reads the same as one already shown (same attacker hitting the same foe).
  const novel = a => !used.has(a.n) && !shown.some(u => u.by === a.by && u.on === a.on);
  const line = a => `${nameOf(card(me, a.by))} ${a.weak ? VERB[card(me, a.by)?.element] || 'blasted' : 'hit'} ${nameOf(card(foe, a.on))} for ${a.dmg}`;
  if (r.victory && rec.behindBy > 0) add({ icon: '🔄', tag: 'Comeback', text: `Comeback! You were ${rec.behindBy} point${rec.behindBy > 1 ? 's' : ''} behind and still won ${points[me]}–${points[foe]}.`, card: mvp?.card });
  const last = rec.final ? rec.attacks[rec.attacks.length - 1] : null;
  if (r.victory && last?.ko && last.side === me) add({ icon: '🏁', tag: 'Final blow', text: `${line(last)}${last.weak ? ' — super effective!' : '.'}`, card: card(me, last.by) }, last);
  const big = [...mine].sort((x, y) => y.dmg - x.dmg)[0];
  if (big && big.dmg > 0 && novel(big)) add({ icon: '💥', tag: 'Biggest hit', text: `${line(big)}${big.weak ? ' — super effective!' : '!'}`, card: card(me, big.by) }, big);
  // A different super-effective moment than the biggest hit (not just the same attacker hitting the same foe again).
  const weakAll = mine.filter(a => a.weak).length;
  const weak = mine.filter(a => a.weak && novel(a)).sort((x, y) => y.dmg - x.dmg);
  if (weak[0]) add({ icon: '🔥', tag: 'Super effective', text: `${line(weak[0])} — super effective!${weakAll > 1 ? ` (${weakAll} super-effective hits)` : ''}`, card: card(me, weak[0].by) }, weak[0]);
  else if (weakAll > 1) add({ icon: '🔥', tag: 'Super effective', text: `${weakAll} super-effective hits! You used element advantage well.`, card: card(me, mine.find(a => a.weak).by) });
  const evo = rec.evos.find(e => e.side === me);
  if (evo) { const c = card(me, evo.to); add({ icon: '✨', tag: 'Evolution', text: `${nameOf(c)} evolved${STAGE[c?.stage] ? ` to ${STAGE[c.stage]}` : ''} mid-battle!`, card: c }); }
  const kos = mine.filter(a => a.ko);
  if (kos.length >= 2) add({ icon: '⚔', tag: 'Knockouts', text: `${kos.length} knockouts: ${[...new Set(kos.map(a => nameOf(card(foe, a.on))))].join(', ')} went down.`, card: card(me, kos[kos.length - 1].by) });
  if (r.victory && points[foe] === 0 && points[me] > 0) add({ icon: '🛡', tag: 'Flawless', text: `Flawless! ${rec.names[foe] || 'Your opponent'} didn't score a single point.`, card: mvp?.card });
  if (list.length < 3 && kos.length === 1 && novel(kos[0])) add({ icon: '⚔', tag: 'Knockout', text: `Knockout! ${line(kos[0])}.`, card: card(me, kos[0].by) }, kos[0]);
  if (list.length < 3 && r.victory && rec.turns) add({ icon: '⏱', tag: 'Turns', text: `Won in ${rec.turns} turn${rec.turns > 1 ? 's' : ''}.`, card: mvp?.card });
  if (list.length < 3 && mine.length) add({ icon: '✦', tag: 'Attacks', text: `${mine.length} attack${mine.length > 1 ? 's' : ''} landed for ${mine.reduce((t, a) => t + a.dmg, 0)} total damage.`, card: mvp?.card });
  return { list: list.slice(0, 5), mvp, points, me, foe, names: rec.names, turns: rec.turns, quest: r.level, online: !!r.online, mine };
}

/* ------------------------------------------------------------ On screen */
function pic(c) { return c ? `<span class="hlPic">${B.art(c)}</span>` : '<span class="hlPic hlPicEmpty" aria-hidden="true">✦</span>'; }

function showVictory(h, hero) {
  const sec = document.createElement('section');
  sec.className = 'hlWrap'; sec.setAttribute('aria-label', 'Battle highlights');
  sec.innerHTML = `<h2 class="uiVHead">Battle highlights</h2>
   <p class="hlScore"><b>${esc(h.names[h.me])}</b> <span>${h.points[h.me]} – ${h.points[h.foe]}</span> <b>${esc(h.names[h.foe])}</b>${h.turns ? `<small>${h.turns} turns</small>` : ''}</p>
   ${h.mvp ? `<div class="hlMvp">${pic(h.mvp.card)}<div><em>MVP</em><b>${esc(nameOf(h.mvp.card))}</b><small>${h.mvp.dmg} damage${h.mvp.kos ? ` · ${h.mvp.kos} knockout${h.mvp.kos > 1 ? 's' : ''}` : ''}</small></div></div>` : ''}
   <ul class="hlList">${h.list.map(x => `<li>${pic(x.card)}<span class="hlIco" aria-hidden="true">${x.icon}</span><p><small>${esc(x.tag)}</small>${esc(x.text)}</p></li>`).join('')}</ul>
   <button class="button gold hlShare" type="button">📤 Share highlights</button><p class="hlNote" role="status"></p>`;
  const actions = $('.uiDefActions', hero);
  actions ? actions.after(sec) : hero.append(sec);
  $('.hlShare', sec).onclick = async e => {
    const btn = e.currentTarget, note = $('.hlNote', sec);
    btn.disabled = true; note.textContent = 'Making your picture…';
    try { note.textContent = await share(h); } catch (err) { console.warn('highlights', err); note.textContent = 'Sorry, the picture could not be made.'; }
    btn.disabled = false;
  };
}
function showDefeat(h, hero) {
  // Only an encouraging note, and only when there is something good to say.
  const good = h.list.filter(x => ['Biggest hit', 'Super effective', 'Evolution', 'Knockout', 'Knockouts'].includes(x.tag)).slice(0, 2);
  if (!good.length) return;
  const sec = document.createElement('section');
  sec.className = 'hlWrap hlDefeat'; sec.setAttribute('aria-label', 'Your best moments');
  sec.innerHTML = `<h2 class="uiDefTipsHead">Your best moments</h2><ul class="hlList">${good.map(x => `<li>${pic(x.card)}<span class="hlIco" aria-hidden="true">${x.icon}</span><p><small>${esc(x.tag)}</small>${esc(x.text)}</p></li>`).join('')}</ul>`;
  const actions = $('.uiDefActions', hero);
  actions ? actions.after(sec) : hero.append(sec);
}
function place(h, r, tries = 0) {
  if (B.view !== 'cardResult') return;
  const hero = $('#app .uiVictory, #app .uiDefeat');
  if (!hero || $('.hlWrap', hero)) { if (!hero && tries < 30) setTimeout(() => place(h, r, tries + 1), 50); return; }
  try { r.victory ? showVictory(h, hero) : showDefeat(h, hero); } catch (err) { console.warn('highlights', err); }
}

/* ------------------------------------------------------------ Share picture */
const W = 1080, H = 1350;
const imgCache = new Map();
function loadImg(src) {
  if (!imgCache.has(src)) imgCache.set(src, new Promise(res => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));
  return imgCache.get(src);
}
// Read where the art comes from out of the game's own art markup (same-origin files only).
function artSource(c) {
  const html = B.art(c) || '', src = (html.match(/src="([^"]+)"/) || [])[1];
  if (!src || !src.startsWith('/')) return null;
  const col = +(html.match(/--art-col:(\d+)/) || [])[1] || 0, row = +(html.match(/--art-row:(\d+)/) || [])[1] || 0;
  return { src, sheet: !/mythlingSingle/.test(html), col, row };
}
async function drawArt(ctx, c, x, y, size, ring = '#f2c45f') {
  ctx.save();
  ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.closePath();
  ctx.fillStyle = '#18213f'; ctx.fill(); ctx.clip();
  const a = c && artSource(c), img = a && await loadImg(a.src);
  if (img) {
    if (a.sheet) { const cw = img.naturalWidth / 5, ch = img.naturalHeight / 2; ctx.drawImage(img, a.col * cw, a.row * ch, cw, ch, x, y, size, size); }
    else ctx.drawImage(img, x, y, size, size);
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(3, size / 40); ctx.strokeStyle = ring; ctx.stroke();
}
function rounded(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function fit(ctx, text, max, font, size, min = 20) { let s = size; do { ctx.font = font.replace('$', s); s -= 2; } while (ctx.measureText(text).width > max && s > min); return text; }
function wrap(ctx, text, max, lines = 2) {
  const words = String(text).split(' '), out = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  if (out.length > lines) { out.length = lines; let l = out[lines - 1]; while (ctx.measureText(l + '…').width > max && l.length) l = l.slice(0, -1); out[lines - 1] = l.trimEnd() + '…'; }
  return out;
}
const SERIF = "'Cormorant Garamond', 'EB Garamond', Georgia, serif", TITLE = "Cinzel, Georgia, serif";

async function picture(h) {
  try { await Promise.all(['800 100px Cinzel', '700 40px Cinzel', '700 40px "Cormorant Garamond"', '600 40px "EB Garamond"'].map(f => document.fonts?.load(f))); } catch {}
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  // Background: night sky with a golden glow and soft rays
  let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3a2a10'); g.addColorStop(.35, '#1f1a36'); g.addColorStop(1, '#0b1028');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, 300); ctx.globalAlpha = .07; ctx.fillStyle = '#ffd77a';
  for (let i = 0; i < 18; i++) { ctx.rotate(Math.PI * 2 / 18); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-60, -1100); ctx.lineTo(60, -1100); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  g = ctx.createRadialGradient(W / 2, 260, 20, W / 2, 260, 620); g.addColorStop(0, '#f2b44a66'); g.addColorStop(1, '#f2b44a00');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // Embers
  for (let i = 0; i < 60; i++) { const x = (i * 197) % W, y = 80 + (i * 331) % (H - 160), r = 1.5 + (i % 4); ctx.fillStyle = `rgba(255,${150 + (i * 7) % 90},80,${.15 + (i % 5) * .06})`; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  // Frame
  rounded(ctx, 22, 22, W - 44, H - 44, 34); ctx.lineWidth = 5; ctx.strokeStyle = '#f2c45f'; ctx.stroke();
  rounded(ctx, 36, 36, W - 72, H - 72, 26); ctx.lineWidth = 1.5; ctx.strokeStyle = '#f2c45f66'; ctx.stroke();
  // Logo
  const logo = await loadImg('/branding/emberlings-logo-transparent.webp') || await loadImg('/branding/emberlings-logo-transparent.png');
  if (logo) { const lw = 470, lh = lw * logo.naturalHeight / logo.naturalWidth; ctx.save(); ctx.shadowColor = 'rgba(6,4,18,.8)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 6; ctx.drawImage(logo, (W - lw) / 2, 58, lw, lh); ctx.restore(); }
  // Title
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `800 112px ${TITLE}`;
  g = ctx.createLinearGradient(0, 260, 0, 370); g.addColorStop(0, '#fff2c2'); g.addColorStop(.55, '#f2c45f'); g.addColorStop(1, '#c47a1f');
  ctx.shadowColor = '#f2a53a99'; ctx.shadowBlur = 30; ctx.fillStyle = g; ctx.fillText('VICTORY!', W / 2, 352); ctx.shadowBlur = 0;
  const sub = h.quest ? `Quest ${h.quest}${B.bosses?.[h.quest] ? ' · Boss defeated' : ''}${window.EmberUI?.questName ? ' · ' + window.EmberUI.questName(h.quest) : ''}` : 'Friendly battle';
  ctx.fillStyle = '#f3d48a'; fit(ctx, sub, 900, `700 $px ${SERIF}`, 40); ctx.fillText(sub, W / 2, 408);
  // Score
  rounded(ctx, 80, 440, W - 160, 132, 22); ctx.fillStyle = '#0d1430cc'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#f2c45f88'; ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.font = `800 84px ${TITLE}`; ctx.fillText(`${h.points[h.me]} – ${h.points[h.foe]}`, W / 2, 536);
  ctx.textAlign = 'right'; ctx.fillStyle = '#f2e9d6'; fit(ctx, h.names[h.me], 280, `700 $px ${SERIF}`, 40); ctx.fillText(h.names[h.me], W / 2 - 130, 500);
  ctx.fillStyle = '#7dffb0'; ctx.font = `600 22px ${TITLE}`; ctx.fillText('WINNER', W / 2 - 130, 540);
  ctx.textAlign = 'left'; ctx.fillStyle = '#c8d1ec'; fit(ctx, h.names[h.foe], 280, `700 $px ${SERIF}`, 40); ctx.fillText(h.names[h.foe], W / 2 + 130, 500);
  if (h.turns) { ctx.fillStyle = '#c8d1ec'; ctx.font = `600 22px ${TITLE}`; ctx.fillText(`${h.turns} TURNS`, W / 2 + 130, 540); }
  // MVP
  let y = 610;
  if (h.mvp) {
    rounded(ctx, 80, y, W - 160, 262, 26);
    g = ctx.createLinearGradient(80, y, W - 80, y + 262); g.addColorStop(0, '#5a4214ee'); g.addColorStop(1, '#1f1a36ee');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#f2c45f'; ctx.stroke();
    await drawArt(ctx, h.mvp.card, 112, y + 26, 210);
    ctx.textAlign = 'left';
    rounded(ctx, 366, y + 38, 132, 48, 24); ctx.fillStyle = '#f2c45f'; ctx.fill();
    ctx.fillStyle = '#2a1d0c'; ctx.font = `800 30px ${TITLE}`; ctx.fillText('MVP', 392, y + 74);
    ctx.fillStyle = '#ffffff'; fit(ctx, nameOf(h.mvp.card), 590, `800 $px ${TITLE}`, 64); ctx.fillText(nameOf(h.mvp.card), 366, y + 152);
    ctx.fillStyle = '#f3d48a'; ctx.font = `700 40px ${SERIF}`;
    ctx.fillText(`${h.mvp.dmg} damage${h.mvp.kos ? ` · ${h.mvp.kos} knockout${h.mvp.kos > 1 ? 's' : ''}` : ''}`, 366, y + 212);
    y += 296;
  }
  // Highlights
  ctx.textAlign = 'center'; ctx.fillStyle = '#f3d48a'; ctx.font = `700 34px ${TITLE}`; ctx.fillText('BATTLE HIGHLIGHTS', W / 2, y + 12);
  y += 34;
  const rows = h.list.slice(0, h.mvp ? 3 : 5), rowH = 100;
  for (const x of rows) {
    if (y + rowH > H - 90) break;
    rounded(ctx, 80, y, W - 160, rowH - 14, 18); ctx.fillStyle = '#0d1430bb'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#f2c45f55'; ctx.stroke();
    await drawArt(ctx, x.card, 96, y + 8, rowH - 30, '#f2c45faa');
    ctx.textAlign = 'left'; ctx.fillStyle = '#f2c45f'; ctx.font = `700 20px ${TITLE}`; ctx.fillText(x.tag.toUpperCase(), 200, y + 32);
    ctx.fillStyle = '#f2e9d6'; ctx.font = `600 29px ${SERIF}`;
    wrap(ctx, x.text, W - 300, 2).forEach((l, i) => ctx.fillText(l, 200, y + 62 + i * 26));
    y += rowH;
  }
  // Footer
  ctx.textAlign = 'center'; ctx.fillStyle = '#c8d1ec'; ctx.font = `600 26px ${SERIF}`;
  const date = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillText(`${date}  ·  Play EMBERLINGS`, W / 2, H - 62);
  return cv;
}

async function share(h) {
  const cv = await picture(h);
  const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
  if (!blob) throw Error('no image');
  const file = new File([blob], `emberlings-victory-${new Date().toISOString().slice(0, 10)}.png`, { type: 'image/png' });
  const text = `Victory in EMBERLINGS! ${h.names[h.me]} beat ${h.names[h.foe]} ${h.points[h.me]}–${h.points[h.foe]}.`;
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try { await navigator.share({ files: [file], title: 'EMBERLINGS Victory', text }); return 'Shared!'; }
    catch (err) { if (err?.name === 'AbortError') return ''; }
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = file.name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'Picture saved to your downloads.';
}

/* ------------------------------------------------------------ Styles */
function injectCSS() {
  if ($('#hlStyles')) return;
  const st = document.createElement('style'); st.id = 'hlStyles';
  st.textContent = `
.hlWrap{margin:22px auto 0;max-width:820px;text-align:center}
.hlScore{display:flex;align-items:baseline;justify-content:center;flex-wrap:wrap;gap:4px 12px;margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-size:19px;color:#f2e9d6}
.hlScore span{font-family:Cinzel,Georgia,serif;font-weight:800;font-size:26px;color:#fff}.hlScore small{flex-basis:100%;font-size:14px;color:#c8d1ec}
.hlMvp{display:flex;align-items:center;gap:14px;margin:0 auto 12px;max-width:420px;padding:10px 16px;border:2px solid #f2c45f;border-radius:14px;background:linear-gradient(120deg,#5a4214cc,#1f1a36cc);text-align:left;box-shadow:0 0 18px #f2b44a44}
.hlMvp em{display:inline-block;font-style:normal;font-family:Cinzel,Georgia,serif;font-weight:800;font-size:13px;background:#f2c45f;color:#2a1d0c;border-radius:10px;padding:1px 9px}
.hlMvp b{display:block;font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;color:#fff;line-height:1.1}.hlMvp small{font-size:14px;color:#f3d48a}
.hlMvp .hlPic{width:72px;height:72px}
.hlList{list-style:none;margin:0 0 14px;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;text-align:left}
.hlList li{position:relative;display:flex;align-items:center;gap:12px;min-width:0;padding:10px 12px;border:1px solid #f2c45f55;border-radius:12px;background:#0d1430b3}
.hlList p{margin:0;min-width:0;font-size:15px;line-height:1.3;color:#f2e9d6;overflow-wrap:anywhere}
.hlList p small{display:block;font-family:Cinzel,Georgia,serif;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#f2c45f}
.hlPic{position:relative;flex:none;display:grid;place-items:center;width:52px;height:52px;border-radius:50%;overflow:hidden;border:2px solid #c9a35a;background:#18213f;color:#f2c45f}
.hlPic .mythlingArt{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important}.hlPic .mythlingArt img{object-fit:cover!important}
.hlIco{position:absolute;left:46px;top:6px;font-size:16px;line-height:1;filter:drop-shadow(0 1px 2px #000)}
.hlShare{font-size:18px;padding:12px 22px}.hlNote{min-height:1.2em;margin:6px 0 0;font-size:14px;color:#c8d1ec}
.hlDefeat{margin-top:18px}.hlDefeat .hlList{max-width:640px;margin:0 auto}
@media(max-width:520px){.hlList{grid-template-columns:1fr}.hlMvp b{font-size:21px}.uiVictory .hlWrap{margin-top:16px}}`;
  document.head.append(st);
}

/* ------------------------------------------------------------ Hooks */
if (B) {
  injectCSS();
  addEventListener('ember:cardBattle', e => {
    try {
      const { match, side } = e.detail || {};
      observe(match, side ?? 0);
      if (B.state.cardBattle?.match === match) held = B.state.cardBattle;
      else if (!B.state.cardBattle) held = null;
    } catch (err) { console.warn('highlights', err); }
  });
  addEventListener('ember:cardResult', e => {
    const r = e.detail || {};
    let h = null;
    try {
      // Quest battles end without a final redraw, so read the finished match from the saved battle we kept hold of.
      const fin = held?.match;
      if (rec && fin?.result && fin.sides?.map(s => s.name).join('|') === rec.sig) { observe(fin, rec.side); rec.final = true; }
      if (!r.draw) h = build(r);
    } catch (err) { console.warn('highlights', err); }
    rec = null; held = null;
    if (h) requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => place(h, r))));
  });
}
