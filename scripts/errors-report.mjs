// Top errors for the review before a release. Nothing here runs by itself: the queries are printed so they can be
// run against the production database at publish time, after migration 0010_client_errors.sql has been applied:
//   npx wrangler d1 execute <database-name> --remote --command "<SQL>"
// The SQL comes from lib/errors-api.mjs (the same text the server uses on every report), so the two cannot drift.
// No dependencies.
//   node scripts/errors-report.mjs          the plan, the top 30 errors and the 30-day prune
//   node scripts/errors-report.mjs --sql    only the SQL, ready to copy and paste
import { TOP_SQL, PRUNE_SQL, ERROR_LIMITS } from '../lib/errors-api.mjs';

const DAY = 86400000;
const since = Date.now() - ERROR_LIMITS.keepDays * DAY;
const top = TOP_SQL.replace('?', String(since));
const prune = PRUNE_SQL.replace('?', String(since));
const sqlOnly = process.argv.includes('--sql');

if (sqlOnly) {
  console.log(top + ';\n\n' + prune + ';');
} else {
  const day = new Date(since).toISOString().slice(0, 10);
  console.log(`Anonymous crash reports: the 30 most frequent errors since ${day} (last ${ERROR_LIMITS.keepDays} days).`);
  console.log('Reports hold no account, username, device or save data. Rows are grouped by message and stack head.\n');
  console.log('Run these against the production database at publish time, with migration 0010 applied:');
  console.log('  npx wrangler d1 execute <database-name> --remote --command "<SQL>"\n');
  console.log('Top errors (count, last seen, screen, message):');
  console.log(top + ';\n');
  console.log('Prune rows older than the keep window (the server already does this after every report):');
  console.log(prune + ';\n');
  console.log('For the SQL alone: node scripts/errors-report.mjs --sql');
}
