// Builds the EMBERLINGS app icons (manifest + Apple touch icon) from the flame
// emblem in the transparent logo: the left half is mirrored into a symmetric
// crest and set on the game's navy with a gold ring.
// Run: node scripts/art/app-icons.cjs [outDir]  (default public/branding)
const sharp = require('sharp');
const path = require('path');
const R = path.resolve(__dirname, '../..');
const OUT = process.argv[2] || R + '/public/branding';
const SRC = R + '/public/branding/emberlings-logo-transparent.png';

const MID = 289; // flame diamond centre in the source logo
async function emblemSym() {
  const half = await sharp(SRC).extract({ left: 40, top: 40, width: MID - 40, height: 600 }).png().toBuffer();
  const flip = await sharp(half).flop().png().toBuffer();
  return sharp({ create: { width: (MID - 40) * 2, height: 600, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: half, left: 0, top: 0 }, { input: flip, left: MID - 40, top: 0 }]).png().toBuffer();
}
async function emblem(h) {
  const src = await emblemSym();
  const m = await sharp(src).metadata();
  const w = Math.round(h * m.width / m.height);
  return sharp(src).resize(w, h).png().toBuffer();
}

function bg(size, ring) {
  const r = size / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
<defs><radialGradient id="g" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#3a3482"/><stop offset=".55" stop-color="#141c48"/><stop offset="1" stop-color="#0a1029"/></radialGradient>
<radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff9a3c" stop-opacity=".35"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient></defs>
<rect width="${size}" height="${size}" fill="url(#g)"/>
<circle cx="${r}" cy="${r}" r="${r * .62}" fill="url(#glow)"/>
${ring ? `<circle cx="${r}" cy="${r}" r="${r * ring}" fill="none" stroke="#ffdd7a" stroke-opacity=".75" stroke-width="${size * .014}"/><circle cx="${r}" cy="${r}" r="${r * ring - size * .022}" fill="none" stroke="#b89a5a" stroke-opacity=".45" stroke-width="${size * .006}"/>` : ''}
</svg>`);
}

async function icon(size, file, { scale, ring }) {
  const h = Math.round(size * scale);
  const em = await emblem(h);
  const meta = await sharp(em).metadata();
  await sharp(bg(size, ring))
    .composite([{ input: em, left: Math.round((size - meta.width) / 2 ), top: Math.round((size - h) / 2) }])
    .flatten({ background: '#0a1029' })
    .png({ compressionLevel: 9 })
    .toFile(OUT + '/' + file);
}

(async () => {
  await icon(512, 'emberlings-app-512.png', { scale: .80, ring: .92 });
  await icon(192, 'emberlings-app-192.png', { scale: .80, ring: .92 });
  await icon(180, 'emberlings-app-180.png', { scale: .80, ring: .92 });
  // Maskable: keep the emblem inside the 80% safe circle.
  await icon(512, 'emberlings-app-maskable-512.png', { scale: .60, ring: .74 });
  console.log('icons written to', OUT);
})();
