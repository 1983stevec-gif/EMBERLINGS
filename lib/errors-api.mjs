// Anonymous crash reports: when the game hits an error it sends a short note so the problem can be fixed. A note
// is the error message, the first line of its stack, the name of the screen and the browser name. Nothing else is
// kept: no account, username, device id, cookies or save contents. Identical reports share one row with a count,
// rows are pruned after 30 days, and the endpoint fails open so a server problem can never break the game.
// Needs migration drizzle/0010_client_errors.sql. Reads are for scripts/errors-report.mjs (topErrors).
export class ErrorsError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new ErrorsError(status, message); };
const DAY = 86400000;
export const ERROR_LIMITS = { batch: 10, message: 200, stack: 400, view: 40, ua: 200, keepDays: 30, top: 30, maxBytes: 16384 };
const UNAVAILABLE = 'Error reports are not available online yet.';
// One key per distinct error: the message plus the first stack line, as a short FNV-1a string (the same idea as
// public/cloud.js and public/profile.js), so a repeat updates the count instead of adding a row.
export function errorHash(message, stack) {
  const head = String(stack || '').split('\n')[0];
  let h = 0x811c9dc5;
  for (const ch of String(message) + '\n' + head) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}
const cut = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : null);
function cleanEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail(400, 'That error report is not valid.');
  if (typeof entry.message !== 'string' || !entry.message.trim()) fail(400, 'An error report needs a message.');
  const message = entry.message.trim();
  if (message.length > ERROR_LIMITS.message) fail(400, 'That error report is too long.');
  // Only these four fields are read, so nothing else from the page can reach the server.
  return { message, stack: cut(entry.stack, ERROR_LIMITS.stack), view: cut(entry.view, ERROR_LIMITS.view), ua: cut(entry.ua, ERROR_LIMITS.ua) };
}
// The two queries below are also printed by scripts/errors-report.mjs, so the script and the server can never drift.
export const TOP_SQL = 'SELECT hash,count,message,view,last_seen FROM client_errors WHERE last_seen>=? ORDER BY count DESC,last_seen DESC LIMIT 30';
export const PRUNE_SQL = 'DELETE FROM client_errors WHERE last_seen<?';
export async function reportErrors(db, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'That error report is not valid.');
  if (!Array.isArray(body.errors) || !body.errors.length) fail(400, 'That error report is not valid.');
  if (body.errors.length > ERROR_LIMITS.batch) fail(400, 'Send up to ten errors at a time.');
  const entries = body.errors.map(cleanEntry);
  // Fail open: a missing table (migration not applied yet) or any database problem still answers ok, so reporting
  // a crash can never break the game. It is logged quietly instead.
  try {
    const now = Date.now();
    for (const e of entries) {
      await db.prepare('INSERT INTO client_errors(hash,message,stack,view,ua,count,first_seen,last_seen) VALUES(?,?,?,?,?,1,?,?) ON CONFLICT(hash) DO UPDATE SET count=client_errors.count+1,last_seen=excluded.last_seen').bind(errorHash(e.message, e.stack), e.message, e.stack, e.view, e.ua, now, now).run();
    }
    await db.prepare(PRUNE_SQL).bind(now - ERROR_LIMITS.keepDays * DAY).run();
    return { ok: true };
  } catch (error) {
    console.warn('error-report', UNAVAILABLE, error);
    return { ok: true };
  }
}
// Top errors for scripts/errors-report.mjs: the most frequent first, newest first among equals.
export async function topErrors(db, days = ERROR_LIMITS.keepDays) {
  const since = Date.now() - days * DAY;
  return (await db.prepare(TOP_SQL).bind(since).all()).results;
}
