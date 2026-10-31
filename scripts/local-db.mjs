// Creates or updates the local database used by `npm start` (online username, friends, trades).
// Applies each drizzle/*.sql migration once and records it, so running it again is safe.
import { readdirSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const wrangler = join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const config = join(root, 'dist', 'server', 'wrangler.json');
const tmp = mkdtempSync(join(tmpdir(), 'emberlings-db-'));

function d1(sql) {
  const file = join(tmp, 'q.sql');
  writeFileSync(file, sql);
  const r = spawnSync(process.execPath, [wrangler, 'd1', 'execute', 'DB', '--local', '--config', config, '--persist-to', join(root, '.wrangler', 'state'), '--file', file, '--json'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || '').trim().split('\n').slice(-5).join('\n'));
  try { return JSON.parse(r.stdout); } catch { return []; }
}

d1('CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL);');
const done = new Set((d1('SELECT name FROM _local_migrations;')[0]?.results || []).map(r => r.name));
const files = readdirSync(join(root, 'drizzle')).filter(f => /^\d+.*\.sql$/.test(f)).sort();
let applied = 0;
for (const f of files) {
  if (done.has(f)) continue;
  const sql = readFileSync(join(root, 'drizzle', f), 'utf8').replaceAll('--> statement-breakpoint', '');
  d1(`${sql}\nINSERT INTO _local_migrations(name, applied_at) VALUES('${f}', ${Date.now()});`);
  console.log('Applied', f); applied++;
}
console.log(applied ? `Local database ready (${applied} update${applied > 1 ? 's' : ''} applied).` : 'Local database already up to date.');
