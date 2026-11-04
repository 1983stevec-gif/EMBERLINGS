// Renders the boss SVGs to 512px WebP for the game:
//   node scripts/art/bosses/render.cjs            (all bosses)
//   node scripts/art/bosses/render.cjs voidra     (just one; NOPAINT=1 skips the final brush/grain pass for debugging)
// Needs Playwright + Chromium, and Python Pillow for the WebP step.
//
// The painterly look comes from shared SVG filters in paint-defs.svg (brush-edge
// displacement, surface-relief textures, canvas grain). They are put on the page
// once, next to each boss SVG, so every boss can use url(#tex-rock), url(#paint)...
// Opening a boss SVG on its own still works, just without those textures.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const src = __dirname, out = path.join(__dirname, '../../../public/art/bosses');
const only = process.argv.slice(2);
const shared = fs.readFileSync(path.join(src, 'paint-defs.svg'), 'utf8');
(async () => {
  fs.mkdirSync(out, { recursive: true }); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 512, height: 512 } });
  const files = fs.readdirSync(src).filter(f => f.endsWith('.svg') && f !== 'paint-defs.svg' && (!only.length || only.includes(f.replace('.svg', ''))));
  for (const f of files) {
    const png = path.join(require('os').tmpdir(), f.replace('.svg', '.png'));
    await p.setContent(`<style>html,body{margin:0;background:#000}svg{display:block}</style>${shared}${(process.env.NOPAINT ? fs.readFileSync(path.join(src, f), 'utf8').replace('filter="url(#paint)"', '') : fs.readFileSync(path.join(src, f), 'utf8'))}`);
    await p.screenshot({ path: png, clip: { x: 0, y: 0, width: 512, height: 512 } });
    execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2],"WEBP",quality=78,method=6)', png, path.join(out, f.replace('.svg', '.webp'))]);
    console.log('rendered', f, fs.statSync(path.join(out, f.replace('.svg', '.webp'))).size, 'bytes');
  }
  await b.close();
})();
