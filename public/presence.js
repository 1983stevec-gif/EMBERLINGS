// EMBERLINGS friend presence: keeps "Online" accurate while you play anywhere in the game, and turns a friend's
// status into plain words: "Online now", "In a duel", or "Last seen 3 h ago". Talks to the server through
// EmberBridge.online; nothing is stored in the save. Only friends ever receive your last-seen time.

const B = window.EmberBridge;
const PING_MS = 50000;        // the server treats you as online for 60 s after your last ping
let pausedUntil = 0, timer = 0;

function ago(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 2) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + ' h ago';
  const d = Math.round(h / 24);
  if (d < 2) return 'yesterday';
  if (d < 7) return d + ' days ago';
  return 'over a week ago';
}

// plain=true gives text without the coloured dot emoji (for layouts that draw their own dot).
function label(f, plain = false) {
  if (!f) return plain ? 'Offline' : '⚪ Offline';
  if (f.inDuel) return plain ? 'In a duel' : '⚔️ In a duel';
  if (f.online) return plain ? 'Online now' : '🟢 Online now';
  if (f.lastSeen) return (plain ? '' : '⚪ ') + 'Last seen ' + ago(Date.now() - f.lastSeen);
  return plain ? 'Offline' : '⚪ Offline';
}
const isOn = f => !!(f && (f.online || f.inDuel));

async function ping() {
  if (document.hidden || Date.now() < pausedUntil || !B?.online) return;
  try { await B.online('/presence', {}); }
  catch { pausedUntil = Date.now() + 5 * 60000; } // not signed in or offline: try again later, quietly
}
function schedule() { clearInterval(timer); timer = setInterval(ping, PING_MS); }

window.EmberPresence = Object.freeze({ label, isOn, ago });

if (B) {
  // A sign-in or a friends refresh means online play is available again.
  window.addEventListener('ember:friends', e => { if (e.detail?.signedIn !== false) pausedUntil = 0; });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ping(); });
  setTimeout(ping, 4000);
  schedule();
}
