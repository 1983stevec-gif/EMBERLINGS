// Helper used while drawing the boss art: prints faceted, painted-rock / ice-crystal
// shapes as SVG paths, shaded for a light from the upper right.
//   node scripts/art/bosses/facets.cjs magmarok --write   (rewrites the GENERATED block in magmarok.svg)
// The result is saved into the SVG, so the SVG files stay self-contained.
const mix = (a, b, t) => { t = Math.max(0, Math.min(1, t)); const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const L = [0.62, -0.78]; // light direction (screen space, y down)
const f = n => n.toFixed(1);

// A boulder: jittered polygon outline, a lit top plane pushed toward the light, and side
// planes between them shaded by which way they face. pal = [shadow, mid, lit, bounce].
function boulder({ cx, cy, rx, ry, n = 9, rot = 0, jit = 0.14, inner = 0.58, pal, s = 1, bounce = 0.5, ink = '#140a0a', inkW = 3.2 }) {
  seed = s * 7919 + 13;
  const out = [], inn = [];
  const ocx = cx + rx * 0.14, ocy = cy - ry * 0.16;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.35;
    const r = 1 + (rnd() - 0.5) * jit * 2;
    out.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
    const r2 = inner * (1 + (rnd() - 0.5) * jit * 2);
    inn.push([ocx + Math.cos(a) * rx * r2, ocy + Math.sin(a) * ry * r2]);
  }
  const [sh, mid, lit, bo] = pal; let svg = '';
  svg += `<path d="M${out.map(p => p.map(f).join(' ')).join(' L')} Z" fill="${sh}"/>`;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, mx = (out[i][0] + out[j][0]) / 2 - cx, my = (out[i][1] + out[j][1]) / 2 - cy, len = Math.hypot(mx, my) || 1;
    const nx = mx / len, ny = my / len, d = nx * L[0] + ny * L[1];
    let c = d > 0 ? mix(mid, lit, d) : mix(mid, sh, -d * 1.1);
    if (ny > 0.3) c = mix(c, bo, (ny - 0.3) * bounce * 1.4);
    svg += `<path d="M${f(out[i][0])} ${f(out[i][1])} L${f(out[j][0])} ${f(out[j][1])} L${f(inn[j][0])} ${f(inn[j][1])} L${f(inn[i][0])} ${f(inn[i][1])} Z" fill="${c}" stroke="${c}" stroke-width=".8"/>`;
  }
  svg += `<path d="M${inn.map(p => p.map(f).join(' ')).join(' L')} Z" fill="${mix(mid, lit, 0.62)}" stroke="${ink}" stroke-opacity=".45" stroke-width="1.2"/>`;
  svg += `<path d="M${out.map(p => p.map(f).join(' ')).join(' L')} Z" fill="none" stroke="${ink}" stroke-width="${inkW}" stroke-linejoin="round"/>`;
  return `<g filter="url(#vol-fire)"><g filter="url(#tex-rock)">${svg}</g></g>`;
}


// A crystal shard from (x, y) pointing along angle a: two long facets (one lit, one in shade)
// with a bright ridge. pal = [shade, mid, lit, edge].
function shard({ x, y, a, len, w, pal, ink = '#0b2140', s = 1 }) {
  seed = s * 104729 + 7;
  const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux, k = 0.35 + rnd() * 0.2;
  const tip = [x + ux * len, y + uy * len], mid = (t, side) => [x + ux * len * t + px * w * side, y + uy * len * t + py * w * side];
  const l1 = mid(k, 1), r1 = mid(k, -1), base1 = [x + px * w * 0.55, y + py * w * 0.55], base2 = [x - px * w * 0.55, y - py * w * 0.55];
  const ridgeB = [x + ux * len * 0.05, y + uy * len * 0.05];
  const dl = px * L[0] + py * L[1];
  const [sh, md, lt, edge] = pal, cA = dl > 0 ? mix(md, lt, dl) : mix(md, sh, -dl), cB = dl > 0 ? mix(md, sh, dl) : mix(md, lt, -dl);
  const P = p => p.map(f).join(' ');
  return `<g><path d="M${P(base1)} L${P(l1)} L${P(tip)} L${P(r1)} L${P(base2)} Z" fill="${md}" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>` +
    `<path d="M${P(ridgeB)} L${P(base1)} L${P(l1)} L${P(tip)} Z" fill="${cA}"/>` +
    `<path d="M${P(ridgeB)} L${P(base2)} L${P(r1)} L${P(tip)} Z" fill="${cB}"/>` +
    `<path d="M${P(ridgeB)} L${P(tip)}" stroke="${edge}" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>` +
    `<path d="M${P(base1)} L${P(l1)} L${P(tip)} L${P(r1)} L${P(base2)}" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/></g>`;
}
// Symmetric path about x = 256 from the left-half points (top centre round to bottom centre).
const sym = (pts, cx = 256) => 'M' + pts.concat(pts.slice().reverse().map(([x, y]) => [2 * cx - x, y])).map(p => p.map(f).join(' ')).join(' L') + ' Z';
// Short painted fur strokes scattered in an ellipse, all flowing roughly along angle a.
function fur({ cx, cy, rx, ry, n, a, len, color, width = 1.6, op = 0.6, s = 1, mirror = true }) {
  seed = s * 3301 + 5; let d = '';
  for (let i = 0; i < n; i++) {
    const t = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
    const x = cx + Math.cos(t) * rx * r, y = cy + Math.sin(t) * ry * r, aa = a + (rnd() - 0.5) * 0.5, l = len * (0.6 + rnd() * 0.6);
    const seg = (x, y, aa) => `M${f(x)} ${f(y)} q${f(Math.cos(aa) * l * 0.5 + 2)} ${f(Math.sin(aa) * l * 0.5)} ${f(Math.cos(aa) * l)} ${f(Math.sin(aa) * l)}`;
    d += seg(x, y, aa);
    if (mirror) d += seg(512 - x, y, Math.PI - aa);
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" opacity="${op}"/>`;
}

const sets = {
  voidra() {
    const ink = '#0c0414';
    const bez = (p, t) => { const m = 1 - t; return [0, 1].map(k => m ** 3 * p[0][k] + 3 * m * m * t * p[1][k] + 3 * m * t * t * p[2][k] + t ** 3 * p[3][k]); };
    // tapered tentacle along a cubic, with suckers on its under side
    const tentacle = (p, w0, s, back) => {
      const N = 28, left = [], right = [], mid = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, a = bez(p, Math.max(0, t - 0.01)), b = bez(p, Math.min(1, t + 0.01)), c = bez(p, t);
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w = w0 * (1 - t) ** 0.8 + 0.8;
        left.push([c[0] + nx * w, c[1] + ny * w]); right.push([c[0] - nx * w, c[1] - ny * w]); mid.push([c, nx, ny, w]);
      }
      const d = 'M' + left.concat(right.reverse()).map(q => q.map(f).join(' ')).join(' L') + ' Z';
      const litSide = mid[6][1] * L[0] + mid[6][2] * L[1] > 0 ? 1 : -1;
      const hl = 'M' + mid.slice(1, N - 2).map(([c, nx, ny, w]) => [c[0] + nx * w * 0.55 * litSide, c[1] + ny * w * 0.55 * litSide].map(f).join(' ')).join(' L');
      const sh = 'M' + mid.slice(0, N).map(([c, nx, ny, w]) => [c[0] - nx * w * 0.45 * litSide, c[1] - ny * w * 0.45 * litSide].map(f).join(' ')).join(' L');
      let su = '';
      for (let i = 3; i < N - 3; i += 2) { const [c, nx, ny, w] = mid[i]; su += `<ellipse cx="${f(c[0] - nx * w * 0.62 * litSide)}" cy="${f(c[1] - ny * w * 0.62 * litSide)}" rx="${f(w * 0.3)}" ry="${f(w * 0.24)}" fill="#c87ad8" stroke="#2a0a3a" stroke-width="1"/>`; }
      const body = back ? '#2a1040' : '#3e1a5a';
      return `<g filter="url(#vol-violet)"><g filter="url(#tex-skin)"><path d="${d}" fill="${body}" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>` +
        `<path d="${sh}" fill="none" stroke="#14061e" stroke-width="${f(w0 * 0.6)}" stroke-linecap="round" opacity=".45"/>` +
        `<path d="${hl}" fill="none" stroke="#a46ad0" stroke-width="${f(Math.max(2, w0 * 0.22))}" stroke-linecap="round" opacity=".7"/>${su}</g></g>`;
    };
    // spiral arms of the void swirl (behind everything)
    let g = '';
    const arm = (a0, cols) => {
      const pts = [];
      for (let i = 0; i <= 60; i++) { const th = i / 60 * Math.PI * 2.1, r = 70 * Math.exp(0.21 * th); pts.push([256 + Math.cos(th + a0) * r, 228 + Math.sin(th + a0) * r * 0.82]); }
      const d = 'M' + pts.map(p => p.map(f).join(' ')).join(' L');
      return `<path d="${d}" fill="none" stroke="${cols[0]}" stroke-width="40" stroke-linecap="round" opacity=".5" filter="url(#blur14)"/>` +
        `<path d="${d}" fill="none" stroke="${cols[1]}" stroke-width="14" stroke-linecap="round" opacity=".6" filter="url(#blur6)"/>` +
        `<path d="${d}" fill="none" stroke="${cols[2]}" stroke-width="2" stroke-linecap="round" opacity=".55"/>`;
    };
    g += arm(0, ['#9a3aff', '#d070ff', '#ffd8ff']) + arm(Math.PI * 2 / 3, ['#ff4ac8', '#ff8ae0', '#ffe0f4']) + arm(Math.PI * 4 / 3, ['#6a5aff', '#a69aff', '#e8e0ff']);
    g += `<g id="vd-void">`;
    // tentacles behind
    const back = [
      [[190, 300], [120, 330], [60, 280], [40, 200]], [[322, 300], [392, 330], [452, 280], [472, 200]],
      [[220, 330], [180, 420], [100, 430], [70, 380]], [[292, 330], [332, 420], [412, 430], [442, 380]],
    ];
    back.forEach((p, i) => { g += tentacle(p, 18, i, true); });
    // the orb
    g += `<g filter="url(#vol-violet)"><g filter="url(#tex-skin)"><circle cx="256" cy="228" r="128" fill="url(#vd-orb)" stroke="${ink}" stroke-width="3.5"/></g></g>`;
    // veins on the orb
    seed = 4; let veins = '';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + rnd() * 0.3, r0 = 74, r1 = 112 + rnd() * 12;
      const x0 = 256 + Math.cos(a) * r0, y0 = 228 + Math.sin(a) * r0 * 0.9, x1 = 256 + Math.cos(a + 0.25) * r1, y1 = 228 + Math.sin(a + 0.25) * r1;
      veins += `M${f(x0)} ${f(y0)} Q${f(256 + Math.cos(a + 0.05) * (r0 + 20) + (rnd() - 0.5) * 16)} ${f(228 + Math.sin(a + 0.05) * (r0 + 20))} ${f(x1)} ${f(y1)}`;
    }
    g += `<path d="${veins}" fill="none" stroke="#c84aff" stroke-width="2" stroke-linecap="round" opacity=".55" filter="url(#glow)"/>`;
    // crown spikes on top
    const spike = (x, y, a, len, w) => { const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux; return `M${f(x + px * w)} ${f(y + py * w)} Q${f(x + ux * len * 0.6 + px * w * 0.5)} ${f(y + uy * len * 0.6 + py * w * 0.5)} ${f(x + ux * len)} ${f(y + uy * len)} Q${f(x + ux * len * 0.5 - px * w * 0.3)} ${f(y + uy * len * 0.5 - py * w * 0.3)} ${f(x - px * w)} ${f(y - py * w)} Z`; };
    let sp = '';
    [[-1.57, 62, 14], [-1.95, 50, 12], [-1.19, 50, 12], [-2.3, 36, 10], [-0.84, 36, 10]].forEach(([a, len, w]) => { sp += spike(256 + Math.cos(a) * 118, 228 + Math.sin(a) * 118, a, len, w) + ' '; });
    g += `<g filter="url(#vol-violet)"><path d="${sp}" fill="#2e1244" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/></g>`;
    // front tentacles
    const front = [
      [[226, 340], [210, 410], [150, 470], [118, 440]], [[286, 340], [302, 410], [362, 470], [394, 440]],
      [[250, 350], [244, 420], [270, 470], [240, 520]],
    ];
    front.forEach((p, i) => { g += tentacle(p, 20, i + 10, false); });
    g += `</g>`;
    // iris striations, kept in defs and placed over the eye with <use> in voidra.svg
    seed = 9; let st = '';
    for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2 + rnd() * 0.05, r0 = 18 + rnd() * 6, r1 = 42 + rnd() * 6; st += `M${f(256 + Math.cos(a) * r0)} ${f(228 + Math.sin(a) * r0)} L${f(256 + Math.cos(a) * r1)} ${f(228 + Math.sin(a) * r1)}`; }
    g += `<defs><path id="vd-iris-lines" d="${st}" stroke="#ffe0ff" stroke-width="1" opacity=".35"/></defs>`;
    return g;
  },
  voltitan() {
    const ink = '#241204', P = pts => 'M' + pts.map(p => p.map(f).join(' ')).join(' L') + ' Z', mir = pts => pts.map(([x, y]) => [512 - x, y]);
    let g = `<g id="vt-dragon">`;
    // wings (left drawn, right mirrored) — bones and membranes
    const wingM = [[176, 360], [120, 250], [60, 150], [14, 96], [30, 190], [0, 250], [40, 280], [10, 350], [70, 360], [60, 420], [130, 410]];
    const bones = 'M176 360 Q120 250 60 150 L14 96 M60 150 Q34 200 0 250 M100 220 Q60 290 10 350 M130 290 Q100 360 60 420';
    const wing = (tr) => `<g ${tr}><path d="${P(wingM)}" fill="#3a2c6e" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M130 410 Q90 380 60 420 M70 360 Q40 330 10 350 M40 280 Q20 260 0 250 M30 190 Q30 160 60 150" fill="none" stroke="#8a7ad8" stroke-width="2" opacity=".55"/>` +
      `<path d="${bones}" fill="none" stroke="${ink}" stroke-width="9" stroke-linecap="round"/><path d="${bones}" fill="none" stroke="#d8a038" stroke-width="5" stroke-linecap="round"/><path d="${bones}" fill="none" stroke="#fff0a0" stroke-width="1.4" stroke-linecap="round" transform="translate(1 -1.5)"/></g>`;
    g += `<g filter="url(#vol-gold)"><g filter="url(#tex-skin)">${wing('')}${wing('transform="translate(512 0) scale(-1 1)"')}</g></g>`;
    // horns sweeping up and back
    const horn = [[204, 186], [168, 134], [146, 84], [124, 28], [168, 74], [198, 120], [238, 166]];
    const horn2 = [[188, 226], [146, 214], [104, 214], [140, 234], [184, 244]];
    g += `<g filter="url(#vol-gold)"><g filter="url(#tex-rock)">`;
    for (const h of [horn, mir(horn), horn2, mir(horn2)]) g += `<path d="${P(h)}" fill="#4a3a2a" stroke="#160c04" stroke-width="2.8" stroke-linejoin="round"/>`;
    g += `<path d="M190 150 L176 130 M172 120 L158 98 M154 86 L140 60 M322 150 L336 130 M340 120 L354 98 M358 86 L372 60" stroke="#d8b878" stroke-width="2.2" opacity=".75"/>`;
    g += `</g></g>`;
    // neck + chest
    const neck = [[256, 300], [212, 312], [184, 350], [170, 400], [160, 460], [150, 530], [256, 530]];
    g += `<g filter="url(#vol-gold)"><g filter="url(#tex-scale)"><path d="${sym(neck)}" fill="#e8a422" stroke="${ink}" stroke-width="3.2" stroke-linejoin="round"/>`;
    const belly = [[256, 340], [226, 350], [214, 400], [210, 460], [206, 530], [256, 530]];
    g += `<path d="${sym(belly)}" fill="#fbe2a0" stroke="${ink}" stroke-width="2.4"/>`;
    let plates = '';
    for (let i = 0; i < 7; i++) { const y = 366 + i * 24, hw = 42 + i * 2.2; plates += `M${f(256 - hw)} ${f(y)} Q256 ${f(y + 10)} ${f(256 + hw)} ${f(y)}`; }
    g += `<path d="${plates}" fill="none" stroke="#8a5a1a" stroke-width="2.4"/>`;
    g += `</g></g>`;
    // spiky neck frill
    seed = 3; let frill = '';
    for (let i = 0; i < 5; i++) { const y = 300 + i * 34, x = 196 - i * 8; frill += `M${f(x)} ${f(y)} L${f(x - 34 - rnd() * 10)} ${f(y + 6)} L${f(x - 4)} ${f(y + 26)} Z `; }
    g += `<g filter="url(#vol-gold)"><path d="${frill}" fill="#d89a2a" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/><path d="${frill}" transform="translate(512 0) scale(-1 1)" fill="#d89a2a" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/></g>`;
    // head
    const head = [[256, 150], [236, 152], [214, 162], [198, 178], [186, 198], [146, 192], [180, 216], [174, 236], [130, 250], [178, 260], [186, 286], [196, 312], [206, 336], [222, 354], [240, 360], [256, 362]];
    const jaw = [[256, 340], [206, 340], [196, 368], [208, 398], [232, 418], [256, 424]];
    const snout = [[256, 222], [244, 226], [236, 252], [232, 290], [234, 322], [242, 342], [256, 348]];
    g += `<g filter="url(#vol-gold)"><g filter="url(#tex-scale)">`;
    g += `<path d="${sym(jaw)}" fill="#b88020" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
    g += `<path d="${sym(head)}" fill="#f4b428" stroke="${ink}" stroke-width="3.2" stroke-linejoin="round"/>`;
    g += `<path d="${sym(snout)}" fill="#ffd458" stroke="${ink}" stroke-width="1.8" stroke-opacity=".6"/>`;
    const brow = [[250, 234], [230, 214], [206, 200], [180, 196], [192, 212], [222, 222], [246, 240]];
    g += `<path d="${P(brow)}" fill="#b07a1a" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/><path d="${P(mir(brow))}" fill="#b07a1a" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>`;
    g += `<path d="M208 174 Q228 164 246 170 M266 170 Q284 164 304 174 M244 236 Q240 270 242 316 M268 236 Q272 270 270 316" fill="none" stroke="#7a4a10" stroke-width="2" opacity=".7"/>`;
    g += `</g></g>`;
    g += `</g>`;
    return g;
  },
  'thorn-guardian'() {
    const ink = '#1a1008', P = pts => 'M' + pts.map(p => p.map(f).join(' ')).join(' L') + ' Z';
    const bark = ['#24160c', '#4e3624', '#a07a50'];
    // tapered, slightly bent branch as one polygon; returns its tip
    const limb = (x, y, a, len, w0, w1, bend) => {
      const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
      const mx = x + ux * len * 0.5 + px * bend, my = y + uy * len * 0.5 + py * bend, ex = x + ux * len, ey = y + uy * len;
      const d = `M${f(x + px * w0)} ${f(y + py * w0)} Q${f(mx + px * (w0 + w1) / 2)} ${f(my + py * (w0 + w1) / 2)} ${f(ex + px * w1)} ${f(ey + py * w1)} L${f(ex - px * w1)} ${f(ey - py * w1)} Q${f(mx - px * (w0 + w1) / 2)} ${f(my - py * (w0 + w1) / 2)} ${f(x - px * w0)} ${f(y - py * w0)} Z`;
      const lit = px * L[0] + py * L[1] > 0 ? 1 : -1;
      const hl = `M${f(x + px * w0 * 0.5 * lit)} ${f(y + py * w0 * 0.5 * lit)} Q${f(mx + px * w1 * 0.7 * lit)} ${f(my + py * w1 * 0.7 * lit)} ${f(ex + px * w1 * 0.4 * lit)} ${f(ey + py * w1 * 0.4 * lit)}`;
      return { d, hl, tip: [ex, ey], a };
    };
    const leaf = (x, y, a, sz, k) => {
      const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux, ex = x + ux * sz, ey = y + uy * sz;
      const cols = [['#2f5a1c', '#5f9a2c', '#a8d44a'], ['#3a6a20', '#78b236', '#c8e86a'], ['#2a4c18', '#4e8a28', '#94c840']][k % 3];
      return `<path d="M${f(x)} ${f(y)} Q${f(x + ux * sz * 0.5 + px * sz * 0.42)} ${f(y + uy * sz * 0.5 + py * sz * 0.42)} ${f(ex)} ${f(ey)} Q${f(x + ux * sz * 0.5 - px * sz * 0.42)} ${f(y + uy * sz * 0.5 - py * sz * 0.42)} ${f(x)} ${f(y)} Z" fill="${cols[1]}" stroke="#16260a" stroke-width="1.4"/>` +
        `<path d="M${f(x)} ${f(y)} Q${f(x + ux * sz * 0.5 + px * sz * 0.3)} ${f(y + uy * sz * 0.5 + py * sz * 0.3)} ${f(ex)} ${f(ey)} Z" fill="${(px * L[0] + py * L[1]) > 0 ? cols[2] : cols[0]}" opacity=".85"/>` +
        `<path d="M${f(x)} ${f(y)} L${f(ex - ux * 2)} ${f(ey - uy * 2)}" stroke="#1e3a10" stroke-width=".9" opacity=".7"/>`;
    };
    let branches = '', hls = '', leaves = '';
    seed = 77;
    const grow = (x, y, a, len, w, depth, side) => {
      const b = limb(x, y, a, len, w, w * 0.62, (rnd() - 0.5) * 18);
      branches += `<path d="${b.d}" fill="${bark[1]}" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>`;
      hls += `<path d="${b.hl}" fill="none" stroke="${bark[2]}" stroke-width="${f(Math.max(1.2, w * 0.35))}" stroke-linecap="round" opacity=".8"/>`;
      if (depth === 0) {
        for (let i = 0; i < 5; i++) leaves += leaf(b.tip[0], b.tip[1], a + (i - 2) * 0.62 + (rnd() - 0.5) * 0.3, 20 + rnd() * 10, i + depth);
        return;
      }
      grow(b.tip[0], b.tip[1], a - side * (0.25 + rnd() * 0.15), len * 0.72, w * 0.62, depth - 1, side);
      grow(b.tip[0], b.tip[1], a + side * (0.55 + rnd() * 0.2), len * 0.6, w * 0.55, depth - 1, side);
      if (depth <= 2) { leaves += leaf(b.tip[0], b.tip[1], a + side * 1.4, 20, depth); leaves += leaf(b.tip[0], b.tip[1], a - side * 1.2, 17, depth + 1); }
    };
    grow(214, 140, -2.05, 62, 13, 3, -1);
    grow(298, 140, -1.09, 62, 13, 3, 1);
    grow(234, 126, -1.75, 40, 8, 1, -1);
    grow(278, 126, -1.39, 40, 8, 1, 1);
    const crown = `<g filter="url(#vol-green)"><g filter="url(#tex-bark)">${branches}${hls}</g></g><g filter="url(#vol-green)">${leaves}</g>`;

    // body, head and bark details
    const body = [[256, 286], [200, 292], [150, 292], [104, 306], [62, 338], [34, 392], [16, 460], [0, 530], [256, 530]];
    const head = [[256, 116], [236, 118], [216, 128], [202, 148], [194, 178], [190, 212], [192, 246], [200, 276], [212, 300], [230, 318], [256, 326]];
    const brow = [[256, 192], [236, 184], [212, 184], [194, 194], [200, 208], [224, 200], [244, 204], [256, 212]];
    let g = `<g id="tg-giant">`;
    g += `<g filter="url(#vol-green)"><g filter="url(#tex-bark)"><path d="${sym(body)}" fill="#3c2818" stroke="${ink}" stroke-width="3.2" stroke-linejoin="round"/>`;
    seed = 5; let grooves = '';
    for (let i = 0; i < 16; i++) { const x = 40 + i * 28 + (rnd() - 0.5) * 10, y = 330 + rnd() * 40; grooves += `M${f(x)} ${f(y)} q${f((rnd() - 0.5) * 16)} 60 ${f((rnd() - 0.5) * 20 + (x - 256) * 0.12)} ${f(140 + rnd() * 60)}`; }
    g += `<path d="${grooves}" fill="none" stroke="#1e130a" stroke-width="3" stroke-linecap="round" opacity=".75"/>`;
    g += `<path d="${grooves}" fill="none" stroke="#a07a52" stroke-width="1.4" stroke-linecap="round" opacity=".45" transform="translate(4 0)"/>`;
    g += `</g></g>`;
    // shoulder burls
    const sh = 'M40 356 Q70 296 144 290 Q200 294 214 332 Q190 372 124 376 Q66 376 40 356 Z';
    g += `<g filter="url(#vol-green)"><g filter="url(#tex-bark)"><path d="${sh}" fill="#5e4430" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="${sh}" transform="translate(512 0) scale(-1 1)" fill="#5e4430" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
    g += `<path d="M70 344 Q120 316 190 330 M88 358 Q130 340 180 350 M442 344 Q392 316 322 330 M424 358 Q382 340 332 350" fill="none" stroke="#1e130a" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>`;
    g += `</g></g>`;
    // chest heart-knot
    g += `<g filter="url(#vol-green)"><g filter="url(#tex-bark)"><ellipse cx="256" cy="420" rx="34" ry="40" fill="#5a3e28" stroke="${ink}" stroke-width="3"/><ellipse cx="256" cy="420" rx="22" ry="27" fill="#2a1a0e" stroke="${ink}" stroke-width="2"/></g></g>`;
    g += crown;
    g += `<g filter="url(#vol-green)"><g filter="url(#tex-bark)"><path d="${sym(head)}" fill="#54392a" stroke="${ink}" stroke-width="3.2" stroke-linejoin="round"/>`;
    seed = 9; let hg = '';
    for (let i = 0; i < 9; i++) { const x = 206 + i * 12.5 + (rnd() - 0.5) * 5; hg += `M${f(x)} ${f(132 + rnd() * 20)} q${f((rnd() - 0.5) * 8)} 40 ${f((x - 256) * 0.08 + (rnd() - 0.5) * 6)} ${f(50 + rnd() * 30)}`; }
    g += `<path d="${hg}" fill="none" stroke="#24160c" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>`;
    g += `<path d="M256 214 Q246 236 248 258 Q256 266 264 258 Q266 236 256 214 Z" fill="#7a5a3c" stroke="${ink}" stroke-width="1.8"/>`;
    g += `<path d="${sym(brow)}" fill="#6e5038" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>`;
    g += `</g></g>`;
    // root beard
    seed = 31; let roots = '';
    for (let i = 0; i < 9; i++) {
      const x = 218 + i * 9.5, len = 50 + rnd() * 60 - Math.abs(x - 256) * 0.6, w = 5 - Math.abs(x - 256) * 0.04;
      const b = limb(x, 296 + Math.abs(x - 256) * 0.35, Math.PI / 2 + (x - 256) * 0.006, len, w * 1.3, 1.6, (rnd() - 0.5) * 16);
      roots += `<path d="${b.d}" fill="${i % 3 ? '#7a5a3c' : '#5e8a2a'}" stroke="${ink}" stroke-width="1.8"/><path d="${b.hl}" stroke="${i % 3 ? '#a07a50' : '#9ac848'}" stroke-width="1.2" fill="none" opacity=".8"/>`;
    }
    g += `<g filter="url(#vol-green)">${roots}</g>`;
    // moss
    const moss = (cx, cy, rx, ry, n, s) => {
      seed = s; let d = '';
      for (let i = 0; i < n; i++) { const t = rnd() * Math.PI * 2, r = Math.sqrt(rnd()); const x = cx + Math.cos(t) * rx * r, y = cy + Math.sin(t) * ry * r, rr = 5 + rnd() * 7; d += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${['#2e4a14', '#3e6018', '#4e7420', '#263e10'][i % 4]}" stroke="#122008" stroke-width="1"/><circle cx="${f(x + rr * 0.3)}" cy="${f(y - rr * 0.35)}" r="${f(rr * 0.45)}" fill="#7ea83a" opacity=".7"/>`; }
      return `<g filter="url(#tex-skin)">${d}</g>`;
    };
    g += moss(120, 312, 60, 16, 26, 3) + moss(392, 312, 60, 16, 26, 4) + moss(256, 122, 34, 8, 12, 5) + moss(228, 188, 24, 5, 8, 6) + moss(286, 188, 24, 5, 8, 7);
    // thorny vines across the shoulders and chest
    const vine = (pts, s) => {
      seed = s; const d = 'M' + pts[0].join(' ') + ' C' + pts.slice(1).map(p => p.join(' ')).join(' ');
      let out = `<path d="${d}" fill="none" stroke="#132008" stroke-width="11" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#3e6a1e" stroke-width="7" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#8ab83a" stroke-width="2" stroke-linecap="round" transform="translate(1.5 -2)"/>`;
      // thorns: sample the cubic
      const [p0, p1, p2, p3] = pts; let th = '';
      for (let i = 1; i < 14; i++) {
        const t = i / 14, mt = 1 - t;
        const x = mt ** 3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t ** 3 * p3[0];
        const y = mt ** 3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t ** 3 * p3[1];
        const dx = 3 * mt * mt * (p1[0] - p0[0]) + 6 * mt * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
        const dy = 3 * mt * mt * (p1[1] - p0[1]) + 6 * mt * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
        const l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, side = i % 2 ? 1 : -1, nx = -uy * side, ny = ux * side, h = 13 + rnd() * 7;
        th += `<path d="M${f(x - ux * 4 + nx * 3)} ${f(y - uy * 4 + ny * 3)} L${f(x + nx * h + ux * 4)} ${f(y + ny * h + uy * 4)} L${f(x + ux * 4 + nx * 3)} ${f(y + uy * 4 + ny * 3)} Z" fill="#8a3a22" stroke="#1a0806" stroke-width="1.4" stroke-linejoin="round"/><path d="M${f(x + nx * 3)} ${f(y + ny * 3)} L${f(x + nx * h + ux * 4)} ${f(y + ny * h + uy * 4)}" stroke="#d88a5a" stroke-width="1.2" opacity=".8"/>`;
        if (i % 5 === 2) th += `<g transform="translate(${f(x - nx * 6)} ${f(y - ny * 6)})"><circle cx="-5" cy="-3" r="5.5" fill="#e04a7a" stroke="#3a0a1a" stroke-width="1.2"/><circle cx="5" cy="-3" r="5.5" fill="#e85a8a" stroke="#3a0a1a" stroke-width="1.2"/><circle cx="-3" cy="5" r="5.5" fill="#d84070" stroke="#3a0a1a" stroke-width="1.2"/><circle cx="4" cy="5" r="5.5" fill="#f070a0" stroke="#3a0a1a" stroke-width="1.2"/><circle r="3.2" fill="#ffd25a"/></g>`;
      }
      return out + th;
    };
    g += `<g>` + vine([[20, 420], [80, 330], [170, 300], [230, 380]], 41) + vine([[492, 440], [440, 340], [340, 300], [282, 390]], 42) + vine([[150, 530], [200, 430], [320, 470], [380, 530]], 43) + `</g>`;
    g += `</g>`;
    return g;
  },
  frostfang() {
    const ice = ['#2f6aa8', '#86c2ec', '#effcff', '#ffffff'], iceB = ['#1f4a86', '#5f9cd2', '#cdeeff', '#f4fdff'];
    let back = '', front = '', shoulder = '';
    const backSpec = [[-2.75, 120, 20], [-2.45, 150, 22], [-2.12, 128, 18], [-1.88, 112, 16], [-1.26, 112, 16], [-1.02, 128, 18], [-0.69, 150, 22], [-0.39, 120, 20], [-3.0, 92, 18], [-0.14, 92, 18]];
    backSpec.forEach(([a, len, w], i) => { back += shard({ x: 256 + Math.cos(a) * 64, y: 244 + Math.sin(a) * 70, a, len, w, pal: iceB, s: i + 1 }); });
    const frontSpec = [[-2.9, 70, 14], [-2.6, 86, 15], [-2.3, 70, 13], [-0.84, 70, 13], [-0.54, 86, 15], [-0.24, 70, 14], [2.9, 60, 13], [0.24, 60, 13]];
    frontSpec.forEach(([a, len, w], i) => { front += shard({ x: 256 + Math.cos(a) * 92, y: 250 + Math.sin(a) * 84, a, len, w, pal: ice, s: i + 40 }); });
    [[156, 372, -2.3, 64, 14], [356, 372, -0.84, 64, 14], [130, 420, -2.7, 52, 12], [382, 420, -0.44, 52, 12]]
      .forEach(([x, y, a, len, w], i) => { shoulder += shard({ x, y, a, len, w, pal: ice, s: 80 + i }); });
    const mir = pts => pts.map(([x, y]) => [512 - x, y]);
    const P = pts => 'M' + pts.map(p => p.map(f).join(' ')).join(' L') + ' Z';
    const head = [[256, 146], [236, 148], [216, 158], [200, 176], [192, 198], [176, 206], [184, 216], [160, 230], [176, 240], [150, 258], [174, 266], [158, 286], [184, 290], [176, 308], [202, 312], [208, 330], [222, 344], [238, 356], [256, 362]];
    const ruff = [[256, 296], [212, 306], [190, 296], [172, 318], [152, 310], [154, 340], [124, 350], [142, 370], [110, 390], [132, 406], [100, 432], [126, 446], [96, 476], [120, 488], [100, 530], [256, 530]];
    const ruffSh = [[256, 300], [220, 318], [200, 344], [176, 376], [168, 420], [180, 470], [176, 530], [256, 530]];
    const ear = [[206, 178], [188, 120], [184, 52], [222, 96], [246, 152]], earIn = [[208, 162], [196, 116], [194, 76], [218, 106], [236, 150]];
    const muzzle = [[256, 234], [244, 238], [236, 260], [228, 288], [222, 312], [232, 334], [256, 344]];
    const mask = [[246, 196], [226, 204], [204, 214], [192, 232], [204, 250], [226, 252], [238, 270], [228, 300], [218, 322], [210, 300], [196, 280], [184, 252], [186, 220], [210, 200]];
    const blaze = [[256, 146], [242, 152], [236, 178], [246, 214], [256, 230]];
    const cheekSh = [[204, 250], [186, 262], [176, 290], [196, 310], [214, 324], [222, 300], [222, 270]];
    const ink = '#18264a';
    let w = `<g id="ff-wolf">`;
    // chest ruff: rows of fur tufts, each row casting a soft shadow on the row below it
    w += `<g filter="url(#vol-cool)"><g filter="url(#tex-fur)">`;
    w += `<path d="${sym([[256, 300], [200, 300], [150, 318], [110, 350], [70, 392], [40, 440], [20, 530], [256, 530]])}" fill="#b9c8e4" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
    w += fur({ cx: 256, cy: 420, rx: 220, ry: 90, n: 60, a: 1.9, len: 18, color: '#6f86b8', width: 1.8, op: 0.5, s: 41 });
    for (let r = 4; r >= 0; r--) {
      const hw = [128, 168, 196, 214, 228][r], top = 300 + r * 42, fy = top + 58, n = [5, 6, 7, 7, 8][r]; seed = 900 + r * 31;
      let d = `M${f(256 - hw * 0.8)} ${f(top - 10)} Q256 ${f(top - 30)} ${f(256 + hw * 0.8)} ${f(top - 10)} Q${f(256 + hw * 0.98)} ${f(top)} ${f(256 + hw)} ${f(fy - 26)}`;
      for (let i = 0; i < n; i++) {
        const x0 = 256 + hw - (2 * hw) * (i / n), x1 = 256 + hw - (2 * hw) * ((i + 1) / n), xm = (x0 + x1) / 2;
        const tip = fy + 6 + rnd() * 22 - Math.abs(xm - 256) / hw * 26;
        const lean = (xm - 256) / hw * 10; d += ` Q${f(x0 - 2)} ${f(tip - 14)} ${f(xm + lean)} ${f(tip)} Q${f(xm - 6)} ${f(tip - 22)} ${f(x1)} ${f(fy - 10 - Math.abs(x1 - 256) / hw * 26)}`;
      }
      d += ' Z';
      const shadow = r < 4 ? `<path d="${d}" fill="#4f64a0" opacity=".55" transform="translate(0 10)" filter="url(#blur6)"/>` : '';
      w += shadow + `<path d="${d}" fill="${['#f4f8ff', '#ebf1fb', '#e2eaf8', '#d8e2f4', '#ccd8ee'][r]}" stroke="${ink}" stroke-opacity="${r === 4 ? 1 : 0.45}" stroke-width="${r === 4 ? 3 : 1.6}" stroke-linejoin="round"/>`;
      w += fur({ cx: 256, cy: top + 30, rx: hw * 0.85, ry: 22, n: 10 + r * 5, a: 1.75, len: 16, color: '#8ea2cc', width: 1.6, op: 0.5, s: 20 + r });
      w += fur({ cx: 256, cy: top + 10, rx: hw * 0.6, ry: 12, n: 6 + r * 3, a: 1.65, len: 12, color: '#ffffff', width: 1.5, op: 0.75, s: 30 + r });
    }
    w += `</g></g>`;
    w += `<g filter="url(#vol-cool)"><g filter="url(#tex-fur)">`;
    w += `<path d="${P(ear)}" fill="#dce8f6" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="${P(earIn)}" fill="#7c86b4"/>`;
    w += `<path d="${P(mir(ear))}" fill="#dce8f6" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="${P(mir(earIn))}" fill="#7c86b4"/>`;
    w += fur({ cx: 206, cy: 120, rx: 10, ry: 26, n: 10, a: -1.9, len: 10, color: '#eef4ff', width: 1.4, op: 0.8, s: 9 });
    w += `</g></g>`;
    w += `<g filter="url(#vol-cool)"><g filter="url(#tex-fur)"><path d="${sym(head)}" fill="#e6eef9" stroke="${ink}" stroke-width="3.2" stroke-linejoin="round"/>`;
    w += `<path d="${P(cheekSh)}" fill="#9db2d6" opacity=".6"/><path d="${P(mir(cheekSh))}" fill="#9db2d6" opacity=".6"/>`;
    w += `<path d="${P(mask)}" fill="#9fb2d8" opacity=".55"/><path d="${P(mir(mask))}" fill="#9fb2d8" opacity=".55"/>`;
    w += `<path d="${sym(muzzle)}" fill="#f6faff"/><path d="${sym(blaze)}" fill="#ffffff" opacity=".8"/>`;
    w += fur({ cx: 200, cy: 270, rx: 34, ry: 40, n: 26, a: 2.2, len: 14, color: '#7f98c4', width: 1.5, op: 0.6, s: 3 });
    w += fur({ cx: 230, cy: 180, rx: 30, ry: 26, n: 18, a: -2.0, len: 12, color: '#8aa0c8', width: 1.3, op: 0.5, s: 4 });
    w += fur({ cx: 236, cy: 300, rx: 16, ry: 30, n: 14, a: 1.75, len: 10, color: '#b8c8e4', width: 1.2, op: 0.6, s: 5 });
    w += `</g></g></g>`;
    return back + '\n' + front + '\n' + w + '\n' + shoulder;
  },
  magmarok() {
    const pal = ['#170e10', '#3d2c2b', '#9a7a6a', '#d0581e'];
    const pal2 = ['#140c0e', '#352625', '#86685a', '#d0581e'];
    const parts = [
      { cx: 214, cy: 442, rx: 40, ry: 46, n: 7, s: 1, pal: pal2 },
      { cx: 298, cy: 442, rx: 40, ry: 46, n: 7, s: 2, pal },
      { cx: 256, cy: 296, rx: 108, ry: 118, n: 11, s: 3, pal: pal2, inner: 0.5 },
      { cx: 256, cy: 368, rx: 64, ry: 42, n: 8, s: 4, pal: pal2 },
      { cx: 210, cy: 244, rx: 48, ry: 36, n: 8, s: 5, pal, rot: 0.3 },
      { cx: 302, cy: 244, rx: 48, ry: 36, n: 8, s: 6, pal, rot: 0.1 },
      { cx: 116, cy: 312, rx: 34, ry: 52, n: 7, s: 7, pal: pal2 },
      { cx: 396, cy: 312, rx: 34, ry: 52, n: 7, s: 8, pal },
      { cx: 112, cy: 412, rx: 56, ry: 56, n: 9, s: 9, pal: pal2 },
      { cx: 400, cy: 412, rx: 56, ry: 56, n: 9, s: 10, pal },
      { cx: 140, cy: 222, rx: 66, ry: 56, n: 9, s: 11, pal: pal2, rot: 0.2 },
      { cx: 372, cy: 222, rx: 66, ry: 56, n: 9, s: 12, pal, rot: 0.5 },
      { cx: 256, cy: 168, rx: 50, ry: 46, n: 8, s: 13, pal, rot: 0.4 },
    ];
    return parts.map(boulder).join('\n');
  },
};
const which = process.argv[2] || 'magmarok';
if (process.argv.includes('--write')) { // swap the shapes between the GENERATED markers in <which>.svg
  const fs = require('fs'), file = require('path').join(__dirname, which + '.svg'), src = fs.readFileSync(file, 'utf8');
  const a = src.indexOf('<!-- GENERATED:start -->'), b = src.indexOf('<!-- GENERATED:end -->');
  fs.writeFileSync(file, src.slice(0, a) + '<!-- GENERATED:start -->\n' + sets[which]() + '\n' + src.slice(b));
} else process.stdout.write(sets[which]() + '\n');
module.exports = { boulder, mix };
