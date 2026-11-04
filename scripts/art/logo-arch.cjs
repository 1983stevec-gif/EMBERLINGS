// Fills the empty arch of the transparent EMBERLINGS logo with painted art (the drop shadow is CSS: .uiLogoNew in public/theme.css).
// Usage: node scripts/art/logo-arch.cjs [source.png] [out-prefix]
// Defaults: source scripts/art/logo-transparent-src.png (the original cut-out with the empty arch),
//           art    public/art/ui/home-hero.webp (glowing gateway + castle, top centre),
//           out    public/branding/emberlings-logo-transparent.{png,webp}
const sharp = require('sharp');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const SRC = process.argv[2] || path.join(__dirname, 'logo-transparent-src.png');
const OUT = process.argv[3] || path.join(root, 'public/branding/emberlings-logo-transparent');
const ART = path.join(root, 'public/art/ui/home-hero.webp');
const ART_CROP = { left: 0.46, top: 0.06, width: 0.24, height: 0.34 }; // fractions of the art image: the glowing gate

(async () => {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const clear = i => data[i * 4 + 3] < 128;
  // Flood-fill clear pixels from the image border: whatever clear area is NOT reached is enclosed (the arch).
  const outside = new Uint8Array(N), stack = [];
  const push = i => { if (!outside[i] && clear(i)) { outside[i] = 1; stack.push(i); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (stack.length) { const i = stack.pop(), x = i % W, y = (i / W) | 0;
    if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (y > 0) push(i - W); if (y < H - 1) push(i + W); }
  // Keep only the biggest enclosed region in the top half (the arch); ignore tiny gaps between letters.
  const seen = new Uint8Array(N); let best = null;
  for (let i = 0; i < N; i++) {
    if (seen[i] || outside[i] || !clear(i)) continue;
    const pix = [i]; seen[i] = 1; let minX = W, minY = H, maxX = 0, maxY = 0;
    for (let k = 0; k < pix.length; k++) { const j = pix[k], x = j % W, y = (j / W) | 0;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      for (const n of [x > 0 && j - 1, x < W - 1 && j + 1, y > 0 && j - W, y < H - 1 && j + W])
        if (n !== false && !seen[n] && !outside[n] && clear(n)) { seen[n] = 1; pix.push(n); } }
    if ((!best || pix.length > best.pix.length) && minY < H / 2) best = { pix, minX, minY, maxX, maxY };
  }
  if (!best) throw new Error('No enclosed arch found');
  console.log('arch', best.maxX - best.minX + 1, 'x', best.maxY - best.minY + 1, 'px,', best.pix.length, 'pixels');
  // Arch mask, grown by 3 px so the art tucks under the stone edge.
  const mask = new Uint8Array(N); for (const j of best.pix) mask[j] = 255;
  const grow = 3, m2 = new Uint8Array(N);
  for (let y = best.minY - grow; y <= best.maxY + grow; y++) for (let x = best.minX - grow; x <= best.maxX + grow; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue; let on = 0;
    for (let dy = -grow; dy <= grow && !on; dy++) for (let dx = -grow; dx <= grow; dx++) { const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && mask[yy * W + xx]) { on = 1; break; } }
    if (on) m2[y * W + x] = 255; }
  const bw = best.maxX - best.minX + 1 + grow * 2, bh = best.maxY - best.minY + 1 + grow * 2;
  const bx = Math.max(0, best.minX - grow), by = Math.max(0, best.minY - grow);
  const am = await sharp(ART).metadata();
  const art = await sharp(ART).extract({ left: Math.round(am.width * ART_CROP.left), top: Math.round(am.height * ART_CROP.top),
    width: Math.round(am.width * ART_CROP.width), height: Math.round(am.height * ART_CROP.height) })
    .resize(bw, bh, { fit: 'cover', position: 'centre' }).modulate({ brightness: 0.92, saturation: 1.35 }).linear(1.18, -18).ensureAlpha().raw().toBuffer();
  // Paint the art into the arch (under the logo), with a soft inner shadow near the stone rim.
  const outBuf = Buffer.from(data);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const gx = bx + x, gy = by + y; if (gx >= W || gy >= H) continue; const gi = gy * W + gx; if (!m2[gi]) continue;
    let d = 99; for (let r = 1; r <= 14 && d === 99; r++) for (const [dx, dy] of [[r,0],[-r,0],[0,r],[0,-r]]) {
      const xx = gx + dx, yy = gy + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H || !m2[yy * W + xx]) { d = r; break; } }
    const shade = d >= 14 ? 1 : 0.55 + 0.45 * (d / 14);
    const ai = (y * bw + x) * 4, oi = gi * 4, a = data[oi + 3] / 255;
    for (let c = 0; c < 3; c++) outBuf[oi + c] = Math.round(data[oi + c] * a + art[ai + c] * shade * (1 - a));
    outBuf[oi + 3] = 255;
  }
  // No baked shadow (it would change the logo's size); the page adds a CSS drop shadow instead.
  const png = await sharp(outBuf, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
  await sharp(png).toFile(OUT + '.png');
  await sharp(png).resize({ width: 840 }).webp({ quality: 84, alphaQuality: 90 }).toFile(OUT + '.webp');
  const m = await sharp(OUT + '.webp').metadata();
  console.log('wrote', OUT + '.png and .webp', m.width, 'x', m.height);
})();
