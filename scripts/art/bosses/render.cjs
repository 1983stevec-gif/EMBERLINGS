// Renders the boss SVGs to 512px WebP for the game: node scripts/art/bosses/render.cjs
// (needs Playwright + Chromium, and Python Pillow for the WebP step)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const src = __dirname, out = path.join(__dirname, '../../../public/art/bosses');
(async () => {
  fs.mkdirSync(out, { recursive: true }); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 512, height: 512 } });
  for (const f of fs.readdirSync(src).filter(f => f.endsWith('.svg'))) {
    const png = path.join(require('os').tmpdir(), f.replace('.svg', '.png'));
    await p.setContent(`<style>html,body{margin:0;background:#000}</style>${fs.readFileSync(path.join(src, f), 'utf8')}`);
    await p.screenshot({ path: png, clip: { x: 0, y: 0, width: 512, height: 512 } });
    execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2],"WEBP",quality=90,method=6)', png, path.join(out, f.replace('.svg', '.webp'))]);
    console.log('rendered', f);
  }
  await b.close();
})();
