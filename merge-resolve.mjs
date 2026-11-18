import { execSync } from 'node:child_process';
// Take the exact proven resolutions from the integration branch's merge commit.
const show = (rev, file) => execSync(`git show ${rev}:${file}`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const files = [
  ['fcb6150', 'tests/run-card-edition.mjs'],
  ['fcb6150', 'game/index.html'],
  ['fcb6150', 'public/whats-new.js'],
];
import { writeFileSync } from 'node:fs';
for (const [rev, file] of files) {
  writeFileSync(file, show(rev, file));
  console.log('resolved ' + file + ' from ' + rev);
}
