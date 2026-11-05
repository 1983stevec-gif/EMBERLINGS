// EMBERLINGS share a card: makes a picture of one of your cards (Card details page), of a rare pull
// (the "Rare find!" banner) or of a whole pack (the pack summary), then shares it with the Web Share API
// or saves it as a PNG. Nothing is uploaded, and only same-origin images are drawn, so the canvas stays clean.
// The printed card is drawn from the game's own card markup (B.cardHTML): it is laid out off-screen and each
// box, gradient, border, text run, icon and art image is painted onto the canvas at a large size, so the
// picture matches the card exactly and stays sharp. It only adds buttons; it never changes the game or the save.
import { MUTATIONS, rarityRank, rarityLabel } from '/combat-rules.js';

const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nameOf = c => B.species[c?.kind]?.name || 'Mythling';
const mutOf = c => MUTATIONS.find(m => m.id === c?.mutation) || null;
const accentOf = c => B.revealColor?.(c) || '#f2c45f';
const packNameOf = c => (B.packCatalog?.() || []).find(p => p.id === c?.sourcePack)?.name || null;
const owner = () => { const n = String(B.state?.playerUsername || '').trim().slice(0, 24); return n ? `${n}'s` : 'my'; };
const score = c => window.EmberRare?.rareScore ? window.EmberRare.rareScore(c) : rarityRank(c) * 3 + (c.shiny ? 4 : 0) + (c.mutation ? 3 : 0) + (c.level || 1) / 50;
const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'card';
const today = () => new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

/* ------------------------------------------------------------ Canvas helpers (same look as highlights.js) */
const W = 1080, H = 1350;
const SERIF = "'Cormorant Garamond', 'EB Garamond', Georgia, serif", TITLE = 'Cinzel, Georgia, serif';
const imgCache = new Map();
function loadImg(src) {
  if (!imgCache.has(src)) imgCache.set(src, new Promise(res => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));
  return imgCache.get(src);
}
function rounded(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function fit(ctx, text, max, font, size, min = 18) { let s = size; do { ctx.font = font.replace('$', s); s -= 2; } while (ctx.measureText(text).width > max && s > min); return text; }
function wrap(ctx, text, max, lines = 2) {
  const words = String(text).split(' '), out = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  if (out.length > lines) { out.length = lines; let l = out[lines - 1]; while (ctx.measureText(l + '…').width > max && l.length) l = l.slice(0, -1); out[lines - 1] = l.trimEnd() + '…'; }
  return out;
}
const hexA = (hex, a) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return `rgba(242,196,95,${a})`; const n = parseInt(m[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

async function fonts() { try { await Promise.all(['800 100px Cinzel', '700 40px Cinzel', '700 40px "Cormorant Garamond"', '600 40px "EB Garamond"'].map(f => document.fonts?.load(f))); } catch { /* system fonts are fine */ } }

// Night sky with a glow and soft rays in the card's rarity colour, embers and a frame.
function backdrop(ctx, color, glowY) {
  let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d1830'); g.addColorStop(.5, '#141a36'); g.addColorStop(1, '#090d22');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, glowY); ctx.globalAlpha = .08; ctx.fillStyle = color;
  for (let i = 0; i < 20; i++) { ctx.rotate(Math.PI * 2 / 20); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-70, -1300); ctx.lineTo(70, -1300); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  g = ctx.createRadialGradient(W / 2, glowY, 30, W / 2, glowY, 700); g.addColorStop(0, hexA(color, .55)); g.addColorStop(.55, hexA(color, .14)); g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 64; i++) { const x = (i * 197) % W, y = 60 + (i * 331) % (H - 120), r = 1.5 + (i % 4); ctx.fillStyle = i % 3 ? hexA(color, .12 + (i % 5) * .06) : `rgba(255,${160 + (i * 7) % 80},90,${.14 + (i % 5) * .05})`; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  rounded(ctx, 22, 22, W - 44, H - 44, 34); ctx.lineWidth = 5; ctx.strokeStyle = color; ctx.stroke();
  rounded(ctx, 36, 36, W - 72, H - 72, 26); ctx.lineWidth = 1.5; ctx.strokeStyle = hexA(color, .45); ctx.stroke();
}
async function logo(ctx, lw, y) {
  const img = await loadImg('/branding/emberlings-logo-transparent.webp') || await loadImg('/branding/emberlings-logo-transparent.png');
  if (!img) return y;
  const lh = lw * img.naturalHeight / img.naturalWidth;
  ctx.save(); ctx.shadowColor = 'rgba(6,4,18,.8)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 6; ctx.drawImage(img, (W - lw) / 2, y, lw, lh); ctx.restore();
  return y + lh;
}
function title(ctx, text, y, size = 76) {
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  fit(ctx, text, W - 160, `800 $px ${TITLE}`, size, 40);
  const g = ctx.createLinearGradient(0, y - size, 0, y); g.addColorStop(0, '#fff2c2'); g.addColorStop(.55, '#f2c45f'); g.addColorStop(1, '#c47a1f');
  ctx.shadowColor = '#f2a53a99'; ctx.shadowBlur = 26; ctx.fillStyle = g; ctx.fillText(text, W / 2, y); ctx.restore();
}
function line(ctx, text, y, { size = 40, color = '#f3e6c4', weight = 700, font = SERIF, max = W - 180 } = {}) {
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
  fit(ctx, text, max, `${weight} $px ${font}`, size, 20); ctx.fillText(text, W / 2, y); ctx.restore();
}
function footer(ctx) { line(ctx, `${today()}  ·  Play EMBERLINGS`, H - 60, { size: 28, color: '#c8d1ec', weight: 600 }); }
// A centred row of pills (rarity, level, mutation, shiny, fused).
function badges(ctx, list, y) {
  const hgt = 56, gap = 14; let size = 28, widths;
  const measure = () => { ctx.font = `700 ${size}px ${TITLE}`; widths = list.map(b => ctx.measureText(b.text).width + 44); return widths.reduce((a, b) => a + b, 0) + gap * (list.length - 1); };
  while (measure() > W - 140 && size > 16) size -= 2;
  let x = (W - measure()) / 2;
  ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  list.forEach((b, i) => {
    rounded(ctx, x, y, widths[i], hgt, hgt / 2);
    ctx.fillStyle = hexA(b.color, .22); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = b.color; ctx.stroke();
    ctx.fillStyle = '#fff6dc'; ctx.font = `700 ${size}px ${TITLE}`; ctx.fillText(b.text, x + widths[i] / 2, y + hgt / 2 + 1);
    x += widths[i] + gap;
  });
  ctx.restore();
}
function badgeList(c) {
  const out = [{ text: c.secret ? 'Secret' : rarityLabel(c), color: accentOf(c) }, { text: `Lv ${c.level || 1}`, color: '#f2c45f' }];
  const m = mutOf(c); if (m) out.push({ text: `${m.icon} ${m.name}`, color: m.color });
  if (c.shiny) out.push({ text: '✦ Shiny', color: '#f6e27a' });
  if (c.fused) out.push({ text: '◈ Fused', color: '#9fd9ff' });
  return out;
}

/* ------------------------------------------------------------ Printed card: lay out off-screen, then paint */
// Split a comma list, ignoring commas inside brackets.
function splitTop(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; }
// Colour stops; positions may be % or px (px needs the gradient's length, so they are resolved when painting).
function parseStops(parts) {
  const stops = [];
  for (const p of parts) {
    const m = /^((?:rgba?|hsla?|color|lab|lch|oklab|oklch)\([^)]*\)|#[0-9a-f]+|[a-z]+)\s*(.*)$/i.exec(p); if (!m) continue;
    const pos = m[2].match(/-?[\d.]+(%|px)/g) || [];
    if (!pos.length) stops.push({ color: m[1], pos: null }); else pos.forEach(v => stops.push({ color: m[1], pos: v }));
  }
  return stops;
}
const addStops = (gr, raw, len) => resolveStops(raw, len).forEach(s => { try { gr.addColorStop(s.at, s.color); } catch { /* unknown colour */ } });
function resolveStops(raw, len) {
  const stops = raw.map(s => ({ color: s.color, at: s.pos == null ? null : s.pos.endsWith('%') ? parseFloat(s.pos) / 100 : parseFloat(s.pos) / (len || 1) }));
  if (!stops.length) return stops;
  if (stops[0].at == null) stops[0].at = 0;
  if (stops[stops.length - 1].at == null) stops[stops.length - 1].at = 1;
  for (let i = 1; i < stops.length; i++) if (stops[i].at == null) { let j = i; while (stops[j].at == null) j++; const a = stops[i - 1].at, b = stops[j].at; for (let k = i; k < j; k++) stops[k].at = a + (b - a) * (k - i + 1) / (j - i + 1); }
  let last = 0; for (const s of stops) { s.at = Math.max(last, Math.min(1, s.at)); last = s.at; }
  return stops;
}
function parseLayers(bi) {
  if (!bi || bi === 'none') return [];
  return splitTop(bi).map(layer => {
    const m = /^(repeating-)?(linear|radial|conic)-gradient\((.*)\)$/s.exec(layer); if (!m || m[1]) return null;
    const args = splitTop(m[3]); let first = args[0] || '', type = m[2], g = { type };
    if (type === 'linear') {
      const sides = { top: 0, right: 90, bottom: 180, left: 270 };
      if (/^-?[\d.]+(deg|turn|rad)$/.test(first)) { g.angle = first.endsWith('turn') ? parseFloat(first) * 360 : first.endsWith('rad') ? parseFloat(first) * 180 / Math.PI : parseFloat(first); args.shift(); }
      else if (/^to /.test(first)) { const w = first.slice(3).split(/\s+/); g.angle = w.length === 1 ? sides[w[0]] : ({ 'top right': 45, 'right top': 45, 'bottom right': 135, 'right bottom': 135, 'bottom left': 225, 'left bottom': 225, 'top left': 315, 'left top': 315 })[w.join(' ')] ?? 180; args.shift(); }
      else g.angle = 180;
    } else if (type === 'radial') {
      if (!/^(rgba?|hsla?|#|transparent)/i.test(first)) { const at = /at\s+(-?[\d.]+%?)\s+(-?[\d.]+%?)/.exec(first); g.at = at ? [at[1], at[2]] : ['50%', '50%']; g.circle = /circle/.test(first); args.shift(); } else g.at = ['50%', '50%'];
    } else {
      if (!/^(rgba?|hsla?|#|transparent)/i.test(first)) { const f = /from\s+(-?[\d.]+)deg/.exec(first); g.from = f ? +f[1] : 0; args.shift(); } else g.from = 0;
    }
    g.stops = parseStops(args);
    return g.stops.length ? g : null;
  }).filter(Boolean).reverse(); // CSS lists the top layer first; paint the bottom one first
}
const radiusOf = (cs, w, h) => { const v = String(cs.borderTopLeftRadius || '0').split(' ')[0]; const n = parseFloat(v) || 0; return Math.min(v.endsWith('%') ? n / 100 * Math.min(w, h) : n, w / 2, h / 2); };
const visible = col => col && col !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(col);

// Build a display list of the card from its live layout (synchronous, then the host is removed).
function snapshot(c) {
  const host = document.createElement('div'); host.className = 'shrHost'; host.setAttribute('aria-hidden', 'true');
  host.innerHTML = B.cardHTML(c);
  document.body.append(host);
  try {
    const card = host.firstElementChild, r0 = card.getBoundingClientRect();
    const textRuns = (node, cs) => {
      const runs = [], data = node.data, tt = cs.textTransform, re = /\S+/g; let m, cur = null;
      while ((m = re.exec(data))) {
        const rg = document.createRange(); rg.setStart(node, m.index); rg.setEnd(node, m.index + m[0].length);
        const r = rg.getClientRects()[0]; if (!r || !r.width) continue;
        if (cur && Math.abs(r.top - cur.top) < 2) { cur.end = m.index + m[0].length; cur.right = r.right; }
        else { if (cur) runs.push(cur); cur = { start: m.index, end: m.index + m[0].length, left: r.left, top: r.top, right: r.right, h: r.height }; }
      }
      if (cur) runs.push(cur);
      return runs.map(u => { let s = data.slice(u.start, u.end).replace(/\s+/g, ' '); if (tt === 'uppercase') s = s.toUpperCase(); else if (tt === 'lowercase') s = s.toLowerCase(); return { s, x: u.left - r0.left, y: u.top - r0.top, w: u.right - u.left, h: u.h }; });
    };
    const walk = el => {
      const cs = getComputedStyle(el); if (cs.display === 'none') return null;
      const r = el.getBoundingClientRect(), tag = el.tagName.toLowerCase();
      const n = { x: r.left - r0.left, y: r.top - r0.top, w: r.width, h: r.height, kids: [], text: [] };
      n.show = cs.visibility !== 'hidden';
      n.opacity = parseFloat(cs.opacity); n.filter = cs.filter !== 'none' ? cs.filter : ''; n.blend = cs.mixBlendMode !== 'normal' ? cs.mixBlendMode : '';
      n.radius = radiusOf(cs, r.width, r.height);
      n.bg = visible(cs.backgroundColor) ? cs.backgroundColor : null; n.layers = parseLayers(cs.backgroundImage);
      n.border = ['Top', 'Right', 'Bottom', 'Left'].map(s => ({ w: cs['border' + s + 'Style'] === 'none' ? 0 : parseFloat(cs['border' + s + 'Width']) || 0, c: cs['border' + s + 'Color'] }));
      n.clip = tag !== 'svg' && cs.overflow !== 'visible';
      if (tag === 'img') {
        const src = el.currentSrc || el.src;
        try { if (new URL(src, location.href).origin === location.origin) n.img = { src, fit: cs.objectFit, pos: cs.objectPosition }; } catch { /* skip */ }
        return n;
      }
      if (tag === 'svg') {
        const vb = el.viewBox?.baseVal; n.svg = { vb: vb && vb.width ? [vb.x, vb.y, vb.width, vb.height] : [0, 0, r.width, r.height], shapes: [] };
        el.querySelectorAll('path,circle,rect,polygon,ellipse').forEach(s => {
          const sc = getComputedStyle(s), t = s.tagName.toLowerCase(), a = k => parseFloat(s.getAttribute(k)) || 0;
          let d = '';
          if (t === 'path') d = s.getAttribute('d') || '';
          else if (t === 'circle' || t === 'ellipse') { const cx = a('cx'), cy = a('cy'), rx = t === 'circle' ? a('r') : a('rx'), ry = t === 'circle' ? a('r') : a('ry'); d = `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0z`; }
          else if (t === 'rect') d = `M${a('x')} ${a('y')}h${a('width')}v${a('height')}h${-a('width')}z`;
          else d = 'M' + (s.getAttribute('points') || '').trim() + 'z';
          n.svg.shapes.push({ d, fill: sc.fill, stroke: sc.stroke, sw: parseFloat(sc.strokeWidth) || 1, fo: parseFloat(sc.fillOpacity), so: parseFloat(sc.strokeOpacity), rule: sc.fillRule });
        });
        return n;
      }
      for (const k of el.childNodes) {
        if (k.nodeType === 3 && k.data.trim()) { const f = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, col = cs.webkitTextFillColor && visible(cs.webkitTextFillColor) ? cs.webkitTextFillColor : cs.color; textRuns(k, cs).forEach(t => n.text.push({ ...t, font: f, color: col, ls: cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing })); }
        else if (k.nodeType === 1 && !/^(title|script|style)$/i.test(k.tagName)) { const kid = walk(k); if (kid) n.kids.push(kid); }
      }
      return n;
    };
    return { w: r0.width, h: r0.height, root: walk(card), radius: radiusOf(getComputedStyle(card), r0.width, r0.height) };
  } finally { host.remove(); }
}
function srcs(n, out = new Set()) { if (n.img) out.add(n.img.src); n.kids.forEach(k => srcs(k, out)); return out; }
function gradient(ctx, g, x, y, w, h) {
  let gr, len = Math.hypot(w, h) / 2;
  if (g.type === 'linear') {
    const a = g.angle * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), L = Math.abs(w * dx) + Math.abs(h * dy), cx = x + w / 2, cy = y + h / 2;
    gr = ctx.createLinearGradient(cx - dx * L / 2, cy - dy * L / 2, cx + dx * L / 2, cy + dy * L / 2); len = L;
  } else if (g.type === 'radial') {
    const px = v => v.endsWith('%') ? parseFloat(v) / 100 : null;
    const cx = x + (px(g.at[0]) ?? 0) * w + (px(g.at[0]) == null ? parseFloat(g.at[0]) : 0), cy = y + (px(g.at[1]) ?? 0) * h + (px(g.at[1]) == null ? parseFloat(g.at[1]) : 0);
    const sy = !g.circle && w && h ? h / w : 1; // an ellipse is a circle squashed to the box's shape
    const R = Math.max(...[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([qx, qy]) => Math.hypot(qx - cx, (qy - cy) / sy))) || 1;
    gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    addStops(gr, g.stops, R);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, sy); ctx.translate(-cx, -cy);
    ctx.fillStyle = gr; ctx.fillRect(cx - R - 1, cy - R - 1, 2 * R + 2, 2 * R + 2); ctx.restore();
    return null;
  } else if (ctx.createConicGradient) gr = ctx.createConicGradient((g.from - 90) * Math.PI / 180, x + w / 2, y + h / 2);
  else return g.stops[0].color;
  addStops(gr, g.stops, len);
  return gr;
}
function paintNode(ctx, n, imgs) {
  if (!n || (n.w <= 0 && n.h <= 0 && !n.kids.length)) return;
  ctx.save();
  if (n.opacity < 1) ctx.globalAlpha *= n.opacity;
  if (n.filter) ctx.filter = ((ctx.filter && ctx.filter !== 'none') ? ctx.filter + ' ' : '') + n.filter;
  if (n.blend) ctx.globalCompositeOperation = n.blend;
  const { x, y, w, h, radius: r } = n;
  if (n.show) {
    if (n.bg || n.layers.length) {
      rounded(ctx, x, y, w, h, r); ctx.save(); ctx.clip();
      if (n.bg) { ctx.fillStyle = n.bg; ctx.fillRect(x, y, w, h); }
      for (const g of n.layers) { const f = gradient(ctx, g, x, y, w, h); if (f) { ctx.fillStyle = f; ctx.fillRect(x, y, w, h); } }
      ctx.restore();
    }
    if (n.img) {
      const im = imgs.get(n.img.src);
      if (im) {
        const iw = im.naturalWidth, ih = im.naturalHeight;
        if (n.img.fit === 'cover' || n.img.fit === 'contain') {
          const k = n.img.fit === 'cover' ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih), dw = iw * k, dh = ih * k;
          const [px, py] = String(n.img.pos || '50% 50%').split(' ').map(v => v.endsWith('%') ? parseFloat(v) / 100 : .5);
          ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(im, x + (w - dw) * px, y + (h - dh) * (py ?? .5), dw, dh); ctx.restore();
        } else ctx.drawImage(im, x, y, w, h);
      }
    }
    if (n.svg) {
      const [vx, vy, vw, vh] = n.svg.vb, k = Math.min(w / vw, h / vh);
      ctx.save(); ctx.translate(x + (w - vw * k) / 2, y + (h - vh * k) / 2); ctx.scale(k, k); ctx.translate(-vx, -vy);
      for (const s of n.svg.shapes) {
        let p; try { p = new Path2D(s.d); } catch { continue; }
        if (visible(s.fill) && s.fill !== 'none') { ctx.globalAlpha *= isNaN(s.fo) ? 1 : s.fo; ctx.fillStyle = s.fill; ctx.fill(p, s.rule === 'evenodd' ? 'evenodd' : 'nonzero'); }
        if (visible(s.stroke) && s.stroke !== 'none') { ctx.lineWidth = s.sw; ctx.strokeStyle = s.stroke; ctx.stroke(p); }
      }
      ctx.restore();
    }
    const b = n.border;
    if (b.every(s => s.w === b[0].w && s.c === b[0].c) && b[0].w > 0 && visible(b[0].c)) { rounded(ctx, x + b[0].w / 2, y + b[0].w / 2, w - b[0].w, h - b[0].w, Math.max(0, r - b[0].w / 2)); ctx.lineWidth = b[0].w; ctx.strokeStyle = b[0].c; ctx.stroke(); }
    else b.forEach((s, i) => { if (!s.w || !visible(s.c)) return; ctx.fillStyle = s.c; if (i === 0) ctx.fillRect(x, y, w, s.w); else if (i === 1) ctx.fillRect(x + w - s.w, y, s.w, h); else if (i === 2) ctx.fillRect(x, y + h - s.w, w, s.w); else ctx.fillRect(x, y, s.w, h); });
  }
  if (n.clip) { const bw = n.border; rounded(ctx, x + bw[3].w, y + bw[0].w, w - bw[1].w - bw[3].w, h - bw[0].w - bw[2].w, Math.max(0, r - bw[0].w)); ctx.clip(); }
  if (n.show) for (const t of n.text) {
    ctx.font = t.font; ctx.fillStyle = t.color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = t.ls;
    const m = ctx.measureText(t.s), asc = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent, desc = m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent;
    ctx.fillText(t.s, t.x, t.y + (t.h - asc - desc) / 2 + asc);
  }
  n.kids.forEach(k => paintNode(ctx, k, imgs));
  ctx.restore();
}
// Draw card c with its top-left at (x, y), scaled by k, with a rarity glow behind it.
async function drawCard(ctx, c, x, y, k, snap = snapshot(c)) {
  const imgs = new Map(await Promise.all([...srcs(snap.root)].map(async s => [s, await loadImg(s)])));
  const color = accentOf(c);
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.save(); rounded(ctx, 0, 0, snap.w, snap.h, snap.radius); ctx.shadowColor = hexA(color, .85); ctx.shadowBlur = 34 * k; ctx.fillStyle = color; ctx.fill(); ctx.restore();
  ctx.save(); rounded(ctx, 0, 0, snap.w, snap.h, snap.radius); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 14 * k; ctx.shadowOffsetY = 6 * k; ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  paintNode(ctx, snap.root, imgs);
  ctx.restore();
  return snap;
}

/* ------------------------------------------------------------ The three pictures */
function canvas() { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; return cv; }

async function cardPicture(c) {
  await fonts();
  const cv = canvas(), ctx = cv.getContext('2d'), snap = snapshot(c), color = accentOf(c);
  const top = 196, k = Math.min(620 / snap.w, 850 / snap.h), cw = snap.w * k, ch = snap.h * k;
  backdrop(ctx, color, top + ch / 2);
  await logo(ctx, 380, 44);
  await drawCard(ctx, c, (W - cw) / 2, top, k, snap);
  const y = top + ch;
  line(ctx, `From ${owner()} collection`, y + 66, { size: 42 });
  badges(ctx, badgeList(c), y + 96);
  footer(ctx);
  return cv;
}

async function pullPicture(c, very) {
  await fonts();
  const cv = canvas(), ctx = cv.getContext('2d'), snap = snapshot(c), color = accentOf(c);
  const top = 330, k = Math.min(560 / snap.w, 740 / snap.h), cw = snap.w * k, ch = snap.h * k;
  backdrop(ctx, color, top + ch / 2);
  await logo(ctx, 300, 40);
  title(ctx, very ? 'VERY RARE FIND!' : 'RARE FIND!', 240);
  const pack = packNameOf(c);
  line(ctx, pack ? `Pulled from a ${pack}` : 'A special pull', 296, { size: 38, color: '#f3d48a' });
  await drawCard(ctx, c, (W - cw) / 2, top, k, snap);
  const y = top + ch, reasons = (window.EmberRare?.rareReasons?.(c) || []).slice(0, 3).map(r => r.text);
  ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#ffe3a0'; ctx.font = `700 34px ${SERIF}`;
  const rl = reasons.length ? wrap(ctx, reasons.join('  ·  '), W - 180, 2) : [];
  rl.forEach((l, i) => ctx.fillText(l, W / 2, y + 56 + i * 40)); ctx.restore();
  line(ctx, `Found by ${owner() === 'my' ? 'me' : owner().slice(0, -2)}`, y + 56 + rl.length * 40 + 16, { size: 34, color: '#f3e6c4', weight: 600 });
  footer(ctx);
  return cv;
}

async function packPicture(cards) {
  await fonts();
  const ranked = [...cards].sort((a, b) => score(b) - score(a)).slice(0, 5), best = ranked[0], color = accentOf(best);
  const cv = canvas(), ctx = cv.getContext('2d');
  backdrop(ctx, color, 600);
  await logo(ctx, 300, 40);
  const pack = packNameOf(best) || 'Card Pack';
  title(ctx, pack.toUpperCase(), 236, 72);
  line(ctx, `${owner() === 'my' ? 'I' : owner().slice(0, -2)} opened ${ranked.length} Mythling${ranked.length > 1 ? 's' : ''}!`, 290, { size: 38, color: '#f3d48a' });
  // Fan: best card in the middle and on top, the next ones either side.
  const slots = [2, 1, 3, 0, 4].slice(0, ranked.length), mid = (ranked.length - 1) / 2, spread = ranked.length > 1 ? 14 / Math.max(1, mid) : 0;
  const snaps = ranked.map(c => snapshot(c)), k = Math.min(1.18, 520 / Math.max(...snaps.map(s => s.h)));
  const pivotY = 330 + 260 + 1050, order = ranked.map((c, i) => ({ c, snap: snaps[i], slot: ranked.length === 5 ? slots[i] : i })).sort((a, b) => Math.abs(b.slot - mid) - Math.abs(a.slot - mid));
  for (const o of order) {
    const ang = (o.slot - mid) * spread * Math.PI / 180, cw = o.snap.w * k, ch = o.snap.h * k;
    ctx.save(); ctx.translate(W / 2, pivotY); ctx.rotate(ang); ctx.translate(-W / 2, -pivotY);
    await drawCard(ctx, o.c, (W - cw) / 2, 330, k, o.snap);
    ctx.restore();
  }
  // List of what was pulled.
  let y = 330 + Math.max(...snaps.map(s => s.h)) * k + 92;
  ctx.save(); ctx.textAlign = 'center';
  for (const c of ranked) {
    const m = mutOf(c), t = `${nameOf(c)} · ${c.secret ? 'Secret' : rarityLabel(c)} · Lv ${c.level || 1}${c.shiny ? ' · ✦ Shiny' : ''}${m ? ` · ${m.icon} ${m.name}` : ''}`;
    ctx.fillStyle = c === best ? '#ffe3a0' : '#e6dcc4'; fit(ctx, t, W - 200, `${c === best ? 700 : 600} $px ${SERIF}`, 34, 20); ctx.fillText(t, W / 2, y); y += 42;
  }
  ctx.restore();
  footer(ctx);
  return cv;
}

/* ------------------------------------------------------------ Share or save */
async function deliver(cv, fileName, text) {
  const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
  if (!blob) throw Error('no image');
  const file = new File([blob], fileName, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try { await navigator.share({ files: [file], title: 'EMBERLINGS', text }); return 'Shared!'; }
    catch (err) { if (err?.name === 'AbortError') return ''; }
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = file.name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'Picture saved to your downloads.';
}
const jobs = {
  card: c => cardPicture(c).then(cv => deliver(cv, `emberlings-${slug(nameOf(c))}.png`, `My ${nameOf(c)} in EMBERLINGS!`)),
  pull: (c, very) => pullPicture(c, very).then(cv => deliver(cv, `emberlings-${slug(nameOf(c))}-find.png`, `${very ? 'Very rare' : 'Rare'} find in EMBERLINGS: ${nameOf(c)}!`)),
  pack: cards => packPicture(cards).then(cv => deliver(cv, `emberlings-${slug(packNameOf(cards[0]) || 'pack')}.png`, `What I pulled in EMBERLINGS!`)),
};
// The same drawing and share helpers, for other share pictures (milestones.js).
export const ShareKit = Object.freeze({ W, H, SERIF, TITLE, canvas, fonts, backdrop, logo, title, line, footer, badges, wrap, fit, rounded, hexA, drawCard, snapshot, deliver, slug, owner, today, accentOf, score });
// Wire a button: busy state, then a short friendly message in the note next to it.
function wire(btn, note, run) {
  btn.addEventListener('click', async e => {
    e.stopPropagation();
    if (btn.disabled) return;
    btn.disabled = true; btn.setAttribute('aria-busy', 'true'); if (note) note.textContent = 'Making your picture…';
    let msg;
    try { msg = await run(); } catch (err) { console.warn('share-card', err); msg = 'Sorry, the picture could not be made.'; }
    btn.disabled = false; btn.removeAttribute('aria-busy');
    if (note?.isConnected) note.textContent = msg; else if (msg) B.toast?.(msg);
  });
}
const button = (label, extra = '') => { const b = document.createElement('button'); b.type = 'button'; b.className = 'shrBtn ' + extra; b.innerHTML = `<span aria-hidden="true">📤</span> ${label}`; return b; };
const noteEl = () => { const p = document.createElement('p'); p.className = 'shrNote'; p.setAttribute('role', 'status'); return p; };

/* ------------------------------------------------------------ Where the buttons go */
// Card details: find which owned card is showing by comparing its printed text with each copy's card.
const cardText = el => { const k = el.cloneNode(true); k.querySelectorAll('[class^="fc"],[class*=" fc"]').forEach(x => x.remove()); return k.textContent.replace(/\s+/g, ' ').trim(); };
function detailsCard(root) {
  const byId = root.dataset.cardId && (B.state.owned || []).find(c => c.id === root.dataset.cardId); if (byId) return byId;
  const pc = $('.cdZoom .printCard', root); if (!pc) return null;
  const want = cardText(pc), name = $('#cdTitle', root)?.textContent.trim(), t = document.createElement('template');
  for (const c of B.state.owned || []) {
    if (name && nameOf(c) !== name) continue;
    t.innerHTML = B.cardHTML(c); const el = t.content.firstElementChild;
    if (el && cardText(el) === want) return c;
  }
  return null;
}
// The button sits in the page's top bar (always in view); its message floats just under the bar.
function addDetails() {
  const root = $('#cardDetails'); if (!root || $('.shrBtn', root)) return;
  const flip = $('.cdBar .cdFlip', root); if (!flip) return;
  const btn = button('<span class="shrLabel">Share card</span>', 'shrBar'), note = noteEl();
  btn.setAttribute('aria-label', 'Share card as a picture');
  note.classList.add('shrFloat'); flip.before(btn); $('.cdBar', root).append(note);
  let hide = 0;
  new MutationObserver(() => { clearTimeout(hide); note.classList.toggle('on', !!note.textContent); if (note.textContent && !btn.disabled) hide = setTimeout(() => { note.textContent = ''; note.classList.remove('on'); }, 4000); }).observe(note, { childList: true, characterData: true, subtree: true });
  wire(btn, note, () => { const c = detailsCard(root); if (!c) throw Error('card not found'); return jobs.card(c); });
}
// Rare-find banner: match the banner to a card from the pack that was just opened.
let recent = [];
const remember = list => { recent = [...list.filter(Boolean), ...recent].slice(0, 20); };
function bannerCard(el) {
  const id = el.dataset.cardId; if (id) { const c = (B.state.owned || []).find(o => o.id === id) || recent.find(o => o?.id === id); if (c) return c; }
  const name = $('h2', el)?.textContent.trim(), why = $('.rfWhy', el)?.textContent.trim();
  const pool = recent.map(c => (B.state.owned || []).find(o => o.id === c.id) || c);
  const top = c => (window.EmberRare?.rareReasons?.(c) || [])[0]?.text || '';
  return pool.find(c => nameOf(c) === name && top(c) === why) || pool.find(c => nameOf(c) === name) || null;
}
function addBanner() {
  const el = $('#rareFind'); if (!el || $('.shrBtn', el)) return;
  const ok = $('.rfOk', el), c = bannerCard(el); if (!ok || !c) return;
  const very = el.classList.contains('very'), row = document.createElement('div'); row.className = 'shrRow';
  const btn = button('Share', 'shrGhost'), note = noteEl();
  ok.replaceWith(row); row.append(ok, btn); row.after(note);
  wire(btn, note, () => jobs.pull(c, very));
}
// Pack summary: a share button next to "View Inventory".
function addSummary() {
  if (B.view !== 'packSummary') return;
  const app = $('#app'), list = $('.packResults', app); if (!list || $('.shrPack', app)) return;
  const ids = $$('[data-result-id]', list).map(e => e.dataset.resultId);
  const cards = ids.map(id => (B.state.owned || []).find(c => c.id === id)).filter(Boolean); if (!cards.length) return;
  const anchor = $('[data-go="inventory"]', app)?.closest('p') || list;
  const wrapEl = document.createElement('div'); wrapEl.className = 'shrPack';
  const btn = button(cards.length > 1 ? 'Share this pack' : 'Share this card', 'button gold'), note = noteEl();
  wrapEl.append(btn, note); anchor.after(wrapEl);
  wire(btn, note, () => jobs.pack(cards));
}

/* ------------------------------------------------------------ Styles */
function injectCSS() {
  if ($('#share-card-css')) return;
  const st = document.createElement('style'); st.id = 'share-card-css';
  st.textContent = `
.shrHost{position:fixed!important;left:-4000px!important;top:0!important;width:290px!important;pointer-events:none!important;contain:layout style}
.shrHost .printCard{width:290px!important;max-width:none!important;margin:0!important;animation:none!important;transform:none!important;transition:none!important}
.shrHost .cardSpecial{line-height:1.4!important}
.shrBtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:10px 20px;border-radius:12px;font:700 17px 'Cormorant Garamond',Georgia,serif;cursor:pointer;touch-action:manipulation;transition:transform .15s ease,filter .15s ease}
.shrBtn:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.08)}.shrBtn:active:not(:disabled){transform:translateY(1px)}
.shrBtn:disabled{opacity:.7;cursor:progress}
.shrBtn:focus-visible{outline:3px solid #ffdd7e;outline-offset:3px}
.shrNote{min-height:1.2em;margin:6px 0 0;font-size:15px;color:#c8d1ec;text-align:center}
#cardDetails .cdBar strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#cardDetails .shrBar{flex:none;min-height:48px;padding:10px 16px;border:1px solid #ffe2a0;border-radius:10px;background:linear-gradient(180deg,#f3c66b,#c98a2c);color:#20150a;font-family:inherit;font-weight:700;font-size:16px}
#cardDetails .shrFloat{position:absolute;left:50%;top:calc(100% + 8px);transform:translateX(-50%);max-width:calc(100% - 32px);margin:0;padding:8px 16px;border-radius:999px;border:1px solid #e9b75a;background:#0e131bf2;color:#ffdd7e;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0;pointer-events:none;transition:opacity .2s}
#cardDetails .shrFloat.on{opacity:1}
@media (max-width:560px){#cardDetails .shrBar{min-width:48px;padding:10px 12px}#cardDetails .shrBar .shrLabel{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}}
.rareFind .shrRow{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:18px}
.rareFind .shrRow .rfOk{margin-top:0}
.rareFind .shrGhost{min-height:52px;padding:0 24px;border:1.5px solid #fff1c2;background:#ffffff14;color:#fff1c2;font-size:21px}
.rareFind .shrNote{margin-top:8px}
.shrPack{display:flex;flex-direction:column;align-items:center;margin:4px auto 18px}
.shrPack .shrBtn{min-width:220px}
@media (prefers-reduced-motion:reduce){.shrBtn,#cardDetails .shrFloat{transition:none}.shrBtn:hover:not(:disabled),.shrBtn:active:not(:disabled){transform:none}}
html[data-fx="off"] .shrBtn{transition:none}html[data-fx="off"] .shrBtn:hover:not(:disabled),html[data-fx="off"] .shrBtn:active:not(:disabled){transform:none}`;
  document.head.append(st);
}

/* ------------------------------------------------------------ Hooks */
if (B) {
  injectCSS();
  addEventListener('ember:packReveal', e => remember([e.detail?.creature]));
  addEventListener('ember:packSummary', e => { remember(e.detail?.creatures || []); requestAnimationFrame(addSummary); });
  addEventListener('ember:frame', () => requestAnimationFrame(addSummary));
  let queued = false;
  new MutationObserver(() => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => { queued = false; try { addDetails(); addBanner(); } catch (err) { console.warn('share-card', err); } });
  }).observe(document.body, { childList: true });
  window.EmberShare = Object.freeze({ card: id => { const c = (B.state.owned || []).find(x => x.id === id); return c ? jobs.card(c) : Promise.resolve(''); }, pictures: { card: cardPicture, pull: pullPicture, pack: packPicture } });
}
