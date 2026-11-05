// Runs sweep.cjs for every size, 3 at a time, then prints a combined summary. Usage: TAG=before node runall.cjs
const { spawn } = require('child_process');
const fs = require('fs');
const D = require('./lib.cjs').DATA, TAG = process.env.TAG || 'run';
const SIZES = (process.env.ALLSIZES || '1366x900,1536x1024,768x1024,1024x768,390x844,360x740').split(',');
const run = sz => new Promise(res => {
  const log = fs.createWriteStream(`${D}/${TAG}-${sz}.log`);
  const c = spawn(process.execPath, [__dirname + '/sweep.cjs'], { env: { ...process.env, SIZES: sz, TAG } });
  c.stdout.pipe(log); c.stderr.pipe(log); c.on('close', res);
});
(async () => {
  const q = [...SIZES]; const workers = Array.from({ length: +(process.env.PAR || 3) }, async () => { while (q.length) await run(q.shift()); });
  await Promise.all(workers);
  const total = {}, per = {};
  for (const sz of SIZES) {
    const f = `${D}/report-${TAG}-${sz}.json`; if (!fs.existsSync(f)) { console.log('missing', sz); continue; }
    const r = JSON.parse(fs.readFileSync(f, 'utf8'))[sz] || {};
    per[sz] = {};
    for (const s in r) for (const [k, v] of r[s]) { total[k] = (total[k] || 0) + 1; per[sz][k] = (per[sz][k] || 0) + 1; }
  }
  console.log('TOTAL', TAG, JSON.stringify(total)); for (const sz in per) console.log(' ', sz, JSON.stringify(per[sz]));
})();
