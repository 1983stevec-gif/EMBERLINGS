// EMBERLINGS "Battle replays": watch your last battles again, turn by turn. Presentation only.
// While the player's own card battle board draws (ember:cardBattle), this module records one small
// frame per revision: points, phase, turn, both Actives, both Benches, the last log lines and the
// last attack. Frames are built from publicBattleView(match, side), so hands, deck order and every
// other hidden card stay out. Nothing here changes gameplay, rewards or the match.
// The compact store lives under state.ember.replays (additive; missing means empty):
//   { list: [ { id, at, level, boss, result, frames, names } ] }   newest first
// names is a shared list of visible display names, so 60 frames stay inside the 12 KB test budget.
// Each frame is a fixed, whitelisted array (FRAME_SLOTS):
//   [revision, turnNumber, phase, turn, pointsYou, pointsThem, you, them, log, lastAttack]
//   you/them: [nameIndex, active, bench]   active: [nameIndex, kind, hp, maxhp, energyCount]
//   bench: [ [nameIndex, hp], ... ]        lastAttack: [side, move, damage] or null
// At most 10 battles, at most 60 frames each, and the store is trimmed under 100 KB by dropping
// whole oldest battles first, then frames from the front of the last remaining battle.
// Talks to the game only through window.EmberBridge, ember:* events and the page.
import { publicBattleView } from './card-engine.js';

export const MAX_BATTLES = 10, MAX_FRAMES = 60, STORE_BUDGET = 100 * 1024, FRAME_BUDGET = 12 * 1024;
export const PHASES = ['setup', 'turn', 'replace', 'finished'];
export const FRAME_SLOTS = ['revision', 'turnNumber', 'phase', 'turn', 'pointsYou', 'pointsThem', 'you', 'them', 'log', 'lastAttack'];
export const SIDE_SLOTS = ['name', 'active', 'bench'];
export const ACTIVE_SLOTS = ['name', 'kind', 'hp', 'maxhp', 'energy'];
export const BENCH_SLOTS = ['name', 'hp'];
const NAME_MAX = 32, LOG_LINES = 2, LOG_MAX = 64;

const int = (n, fallback = 0) => Number.isFinite(Number(n)) ? Math.round(Number(n)) : fallback;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// ---------------------------------------------------------------- Pure frame builder (tests use this)
function intern(names, value) {
  const text = String(value ?? '').slice(0, NAME_MAX).trim() || 'Mythling';
  let i = names.indexOf(text);
  if (i < 0) { names.push(text); i = names.length - 1; }
  return i;
}
const defaultName = kind => 'Mythling ' + (int(kind) + 1);

// view: the result of publicBattleView(match, side). side: the player's own side.
export function buildFrame(view, side, names = [], nameOf = defaultName) {
  if (!view || !Array.isArray(view.sides) || view.sides.length < 2 || (side !== 0 && side !== 1)) throw Error('A replay frame needs a public battle view and a side.');
  const nameIndex = c => intern(names, c?.name || nameOf(c?.kind));
  const makeSide = index => {
    const p = view.sides[index] || {}, cards = Array.isArray(p.cards) ? p.cards : [];
    const card = id => cards.find(c => c && c.id === id) || null;
    const active = p.active ? card(p.active) : null;
    const bench = (Array.isArray(p.bench) ? p.bench : []).map(card).filter(Boolean).map(c => [nameIndex(c), Math.max(0, int(c.hp))]);
    return [
      intern(names, p.name || (index === 0 ? 'You' : 'Opponent')),
      active ? [nameIndex(active), Math.max(0, int(active.kind)), Math.max(0, int(active.hp)), Math.max(1, int(active.maxhp, 1)), Array.isArray(active.energies) ? active.energies.length : 0] : null,
      bench
    ];
  };
  const points = [clamp(int(view.sides[side]?.points), 0, 9), clamp(int(view.sides[1 - side]?.points), 0, 9)];
  const turn = view.turn === side ? 0 : view.turn === 1 - side ? 1 : -1;
  const phase = Math.max(0, PHASES.indexOf(view.phase));
  const log = (Array.isArray(view.log) ? view.log : []).slice(-LOG_LINES).map(t => String(t ?? '').slice(0, LOG_MAX)).filter(Boolean);
  const la = view.lastAttack;
  const lastAttack = la && (la.side === 0 || la.side === 1) ? [la.side === side ? 0 : 1, String(la.move || 'attack').slice(0, 16), Math.max(0, int(la.damage))] : null;
  return [int(view.revision), Math.max(0, int(view.turnNumber)), phase, turn, points[0], points[1], makeSide(side), makeSide(1 - side), log, lastAttack];
}
export function frameForMatch(match, side, names = [], nameOf = defaultName) {
  return buildFrame(publicBattleView(match, side), side, names, nameOf);
}

// The short line shown in the list and on the result screen.
export function outcomeLine(result, side) {
  if (!result) return '';
  const outcome = result.winner === null || result.winner === undefined ? 'Draw' : result.winner === side ? 'Victory' : 'Defeat';
  return outcome + ' · ' + String(result.reason || 'Battle ended');
}

// Small reader for the page (and for the hidden-data test).
export function readFrame(frame, names = []) {
  if (!Array.isArray(frame) || frame.length < FRAME_SLOTS.length) throw Error('Bad replay frame');
  const name = i => String(names[i] ?? 'Mythling');
  const side = raw => {
    const s = Array.isArray(raw) ? raw : [0, null, []];
    const active = Array.isArray(s[1]) ? { name: name(s[1][0]), kind: int(s[1][1]), hp: int(s[1][2]), maxhp: Math.max(1, int(s[1][3], 1)), energy: int(s[1][4]) } : null;
    const bench = (Array.isArray(s[2]) ? s[2] : []).map(b => ({ name: name(b?.[0]), hp: int(b?.[1]) }));
    return { name: name(s[0]), active, bench };
  };
  return {
    revision: int(frame[0]), turnNumber: int(frame[1]), phase: PHASES[int(frame[2])] || 'setup', turn: int(frame[3], -1),
    points: [int(frame[4]), int(frame[5])], you: side(frame[6]), them: side(frame[7]),
    log: (Array.isArray(frame[8]) ? frame[8] : []).map(String), lastAttack: Array.isArray(frame[9]) ? { side: int(frame[9][0]), move: String(frame[9][1]), damage: int(frame[9][2]) } : null
  };
}

// ---------------------------------------------------------------- Pure store (tests use this)
export function ensureReplays(state) {
  if (!state || typeof state !== 'object') throw Error('The save is missing.');
  if (!state.ember || typeof state.ember !== 'object') state.ember = {};
  let r = state.ember.replays;
  if (!r || typeof r !== 'object') r = state.ember.replays = { list: [] };
  if (!Array.isArray(r.list)) r.list = [];
  return r;
}
export const storeBytes = replays => JSON.stringify(replays || { list: [] }).length;

// Keep whole records small, then the whole store under budget.
export function pruneReplays(replays, { budget = STORE_BUDGET, maxBattles = MAX_BATTLES, maxFrames = MAX_FRAMES } = {}) {
  const list = replays.list || (replays.list = []);
  for (const b of list) if (b && typeof b === 'object' && Array.isArray(b.frames) && b.frames.length > maxFrames) b.frames = b.frames.slice(-maxFrames);
  if (list.length > maxBattles) list.length = maxBattles;
  while (storeBytes(replays) > budget) {
    if (list.length > 1) { list.pop(); continue; } // whole oldest battles go first
    if (list[0]?.frames?.length > 1) { list[0].frames.shift(); continue; } // then trim the front
    break;
  }
  return replays;
}
// Insert or update one battle (same id replaces it) and keep the newest first.
export function insertReplay(replays, battle, opts = {}) {
  if (!replays || typeof replays !== 'object') throw Error('A replay store is required.');
  if (!battle || typeof battle !== 'object' || !battle.id) return replays;
  if (!Array.isArray(replays.list)) replays.list = [];
  if (!Array.isArray(battle.frames)) battle.frames = [];
  if (!Array.isArray(battle.names)) battle.names = [];
  const list = replays.list, at = list.findIndex(b => b && b.id === battle.id);
  if (at >= 0) list.splice(at, 1);
  list.unshift(battle);
  return pruneReplays(replays, opts);
}

// ---------------------------------------------------------------- Pure player (tests use this)
export const createPlayer = total => ({ total: Math.max(1, int(total, 1)), index: 0, playing: false });
const at = (p, index, playing = p.playing) => ({ ...p, index: clamp(index, 0, Math.max(0, p.total - 1)), playing });
export function playerStep(p, delta = 1) { return at({ ...p, playing: false }, p.index + int(delta)); }
export function playerRestart(p) { return { ...p, index: 0, playing: false }; }
export function playerToggle(p) {
  if (p.playing) return { ...p, playing: false };
  return at({ ...p, playing: true }, p.index >= p.total - 1 ? 0 : p.index);
}
export function playerTick(p) {
  if (!p.playing) return p;
  if (p.index >= p.total - 1) return { ...p, playing: false };
  return at(p, p.index + 1);
}

// ---------------------------------------------------------------- Browser side
const hasWindow = typeof window !== 'undefined';
const B = hasWindow ? window.EmberBridge : null;

if (B) {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const speciesName = kind => { try { return B.species?.[kind]?.name || defaultName(kind); } catch { return defaultName(kind); } };
  const labelLevel = b => b.boss ? `Boss · ${b.boss} · Level ${b.level}` : b.level ? `Quest · Level ${b.level}` : 'Friend duel';
  const dateOf = at => { const d = new Date(int(at)); return Number.isFinite(d.getTime()) ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'Unknown date'; };

  let session = null, lastDoneId = null, idSeq = 0, openId = null, origin = 'home', player = null, timer = 0, saveTimer = 0;

  /* ---------------------------------------------------------------- Recording */
  const saveNow = () => { try { B.save(); } catch (err) { console.warn('battle-replays', err); } };
  const saveSoon = () => {
    if (saveTimer) return;
    saveTimer = setTimeout(() => { saveTimer = 0; saveNow(); }, 500);
  };
  const keyOf = match => {
    if (match?.id) return String(match.id).slice(0, 64);
    try { return ((match?.sides || []).map(s => String(s?.name || '')).join('|') + '|' + String(match?.setupDeadline ?? match?.startedAt ?? '')).slice(0, 120); } catch { return 'battle'; }
  };
  const newBattle = () => {
    const level = int(B.state?.cardBattle?.level);
    return { id: 'r' + Date.now().toString(36) + '-' + (++idSeq), at: Date.now(), level, boss: B.bosses?.[level] || null, result: '', frames: [], names: [] };
  };
  function record(match, side) {
    const rev = Math.max(0, int(match?.revision));
    const key = keyOf(match);
    const finishedSame = !!session?.done && !!match?.result;
    if (!session || session.key !== key || rev < session.rev || (session.done && !finishedSame)) session = { key, side, rev: -1, done: false, battle: null };
    if (rev <= session.rev) return;
    if (!session.battle) session.battle = newBattle();
    session.side = side; session.rev = rev;
    const battle = session.battle;
    battle.frames.push(frameForMatch(match, side, battle.names, speciesName));
    if (battle.frames.length > MAX_FRAMES) battle.frames.shift();
    if (match.result) { battle.result = outcomeLine(match.result, side); session.done = true; lastDoneId = battle.id; }
    insertReplay(ensureReplays(B.state), battle);
    if (session.done) { if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; } saveNow(); } else saveSoon();
  }
  function finish(detail) {
    const battle = session?.battle;
    if (!battle || session.done) return;
    const line = (detail.draw ? 'Draw' : detail.victory ? 'Victory' : 'Defeat') + ' · ' + String(detail.reason || 'Battle ended');
    battle.result = line;
    if (!battle.level && detail.level) { battle.level = int(detail.level); battle.boss = B.bosses?.[battle.level] || null; }
    session.done = true; lastDoneId = battle.id;
    insertReplay(ensureReplays(B.state), battle);
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; }
    saveNow();
  }

  /* ---------------------------------------------------------------- The replay screen */
  const stopTimer = () => { if (timer) { clearInterval(timer); timer = 0; } };
  const findBattle = id => ensureReplays(B.state).list.find(b => b && b.id === id) || null;

  function stageHTML(battle, frame) {
    const f = readFrame(frame, battle.names);
    const stars = n => [0, 1, 2].map(k => `<i class="${k < n ? 'on' : ''}" aria-hidden="true">★</i>`).join('');
    const side = (s, label) => {
      const a = s.active;
      return `<section class="brSide" aria-label="${esc(label)}" data-side="${esc(label)}">
        <h3><span>${esc(s.name)}</span> <b class="brPts" role="img" aria-label="${s === f.you ? f.points[0] : f.points[1]} of 3 points">${stars(s === f.you ? f.points[0] : f.points[1])}</b></h3>
        ${a ? `<div class="brActive"><b>${esc(a.name)}</b><span>${a.hp}/${a.maxhp} HP</span><small>${a.energy} Merfling</small>
          <div class="brHP" role="img" aria-label="Health ${a.hp} of ${a.maxhp}"><i style="width:${clamp(a.maxhp ? a.hp / a.maxhp * 100 : 0, 0, 100)}%"></i></div></div>`
        : `<div class="brActive brEmpty"><b>No Active</b><span>Waiting</span></div>`}
        <ul class="brBench">${s.bench.length ? s.bench.map(b => `<li><span>${esc(b.name)}</span><b>${b.hp} HP</b></li>`).join('') : '<li class="brNone">No Benched Mythlings</li>'}</ul>
      </section>`;
    };
    const turnText = f.phase === 'setup' ? 'Choosing starting Mythlings' : f.phase === 'replace' ? 'Choosing a new Active' : f.phase === 'finished' ? 'Battle over'
      : f.turn === 0 ? 'Your turn' : f.turn === 1 ? 'Their turn' : 'Battle in progress';
    const last = f.lastAttack ? `${f.lastAttack.move} · ${f.lastAttack.damage} damage` : 'No attacks yet';
    return `<div class="brBar"><b>You ${f.points[0]} : ${f.points[1]} ${esc(f.them.name)}</b><small>${esc(turnText)}</small></div>
      <div class="brCols">${side(f.you, 'You')}${side(f.them, 'Opponent')}</div>
      <div class="brFoot"><p><b>Last attack:</b> ${esc(last)}</p>
        <ol class="brLog">${f.log.length ? f.log.map(t => `<li>${esc(t)}</li>`).join('') : '<li>No log lines for this step.</li>'}</ol></div>`;
  }

  function paint() {
    const battle = findBattle(openId), stage = $('#brStage');
    if (!battle || !stage || !player) return;
    const frames = battle.frames.filter(Array.isArray);
    if (!frames.length) return;
    const totalTurns = Math.max(1, ...frames.map(f => int(f[1])));
    const f = readFrame(frames[player.index], battle.names);
    stage.innerHTML = `<div class="brFade">${stageHTML(battle, frames[player.index])}</div>`;
    const progress = $('#brProgress');
    if (progress) progress.textContent = `Turn ${Math.max(1, f.turnNumber)} of ${totalTurns} · Step ${player.index + 1} of ${frames.length}`;
    const play = $('#brPlay');
    if (play) play.textContent = player.playing ? '⏸ Pause' : player.index >= player.total - 1 ? '↺ Play again' : '▶ Play';
    const prev = $('#brPrev'), next = $('#brNext');
    if (prev) { prev.disabled = player.index <= 0; prev.title = prev.disabled ? 'Already at the first step' : 'One step back'; prev.setAttribute('aria-label', prev.disabled ? 'Step back — already at the first step' : 'Step back one frame'); }
    if (next) { next.disabled = player.index >= player.total - 1; next.title = next.disabled ? 'Already at the last step' : 'One step forward'; next.setAttribute('aria-label', next.disabled ? 'Step forward — already at the last step' : 'Step forward one frame'); }
  }
  function playFrom() {
    stopTimer();
    if (!player) return;
    if (player.index >= player.total - 1) player = playerRestart(player);
    player = playerToggle(player);
    paint();
    if (player.playing) timer = setInterval(() => {
      if (B.view !== 'replays' || !player) return stopTimer();
      const before = player.index;
      player = playerTick(player);
      if (player.index !== before || !player.playing) paint();
      if (!player.playing) stopTimer();
    }, 900);
  }
  function controls() {
    const b = $('#brPlay'); if (b) b.onclick = playFrom;
    const prev = $('#brPrev'); if (prev) prev.onclick = () => { stopTimer(); player = playerStep({ ...player, playing: false }, -1); paint(); };
    const next = $('#brNext'); if (next) next.onclick = () => { stopTimer(); player = playerStep({ ...player, playing: false }, 1); paint(); };
    const restart = $('#brRestart'); if (restart) restart.onclick = () => { stopTimer(); player = playerRestart(player); paint(); };
    const share = $('#brShare');
    if (share) share.onclick = async () => {
      const battle = findBattle(openId), note = $('#brShareNote');
      if (!battle) return;
      share.disabled = true; share.setAttribute('aria-busy', 'true'); if (note) note.textContent = 'Making your picture…';
      let msg = '';
      try { msg = await sharePicture(battle); } catch (err) { console.warn('battle-replays', err); msg = 'Sorry, the picture could not be made.'; }
      share.disabled = false; share.removeAttribute('aria-busy');
      if (note?.isConnected) note.textContent = msg; else if (msg) B.toast?.(msg);
    };
  }

  function renderBattle(battle) {
    const frames = battle.frames.filter(Array.isArray);
    if (!frames.length) { openId = null; return renderList('That replay has no saved steps yet.'); }
    player = createPlayer(frames.length);
    const f = readFrame(frames[frames.length - 1], battle.names);
    B.render(`<div class="brPage">
      <div class="brTop"><button type="button" class="back" id="brBack">‹ Replays</button><button type="button" class="button alt brShare" id="brShare">📤 Share picture</button></div>
      <header class="brHead"><p class="brKick">Battle replay</p><h1 id="brTitle">You vs ${esc(f.them.name)}</h1>
        <p class="brSub">${esc(labelLevel(battle))} · ${esc(dateOf(battle.at))}${battle.result ? ' · ' + esc(battle.result) : ''}</p></header>
      <section class="brCard" aria-labelledby="brTitle">
        <div id="brStage" class="brStage"></div>
        <p id="brProgress" class="brProg" role="status">Turn 1 of 1</p>
        <div class="brControls">
          <button type="button" class="button" id="brRestart">↺ Restart</button>
          <button type="button" class="button" id="brPrev">‹ Step</button>
          <button type="button" class="button gold" id="brPlay">▶ Play</button>
          <button type="button" class="button" id="brNext">Step ›</button>
        </div>
        <p class="brNote">Replays are a picture of the battle. They never give rewards and cannot change a match.</p>
        <p class="brShareNote" id="brShareNote" role="status"></p>
      </section></div>`);
    $('#brBack').onclick = () => { stopTimer(); openId = null; renderList(); };
    controls();
    paint();
  }

  function renderList(notice = '') {
    stopTimer(); player = null;
    const list = ensureReplays(B.state).list.filter(b => b && b.id);
    const rows = list.map(b => {
      const frames = Array.isArray(b.frames) ? b.frames.filter(Array.isArray) : [];
      let opponent = 'Opponent';
      try { if (frames[0] && b.names) opponent = readFrame(frames[0], b.names).them.name || 'Opponent'; } catch { /* keep default */ }
      const result = b.result || (Date.now() - int(b.at) > 10 * 60 * 1000 ? 'Unfinished' : 'In progress');
      return `<li class="brRow"><div class="brRowText"><b>${esc(opponent)}</b><small>${esc(labelLevel(b))} · ${esc(dateOf(b.at))}</small><span class="${/^Victory/.test(result) ? 'brWin' : /^Defeat/.test(result) ? 'brLoss' : 'brDraw'}">${esc(result)}</span></div>
        <button type="button" class="button gold brWatch" data-br-watch="${esc(b.id)}">▶ Watch</button></li>`;
    }).join('');
    const backTo = origin === 'stats' ? 'stats' : 'home';
    B.render(`<div class="brPage"><button type="button" class="back" id="brBack">‹ ${backTo === 'stats' ? 'My Stats' : 'Home'}</button>
      <header class="brHead"><p class="brKick">Your last ${MAX_BATTLES} battles</p><h1 id="brTitle">▶ Battle replays</h1>
        <p class="brSub">Watch any battle again, step by step. Saved battles never give rewards.</p></header>
      ${notice ? `<p class="brNotice" role="status">${esc(notice)}</p>` : ''}
      ${rows ? `<ul class="brList">${rows}</ul>` : `<section class="brEmptyBox"><p>No battles saved yet. Finish a quest or a friend duel and it will appear here.</p><button type="button" class="button gold" data-br-go="${backTo}">${backTo === 'stats' ? 'Back to My Stats' : 'Back to Home'}</button></section>`}
      <p class="brNote"><b>Keeping it small:</b> up to ${MAX_BATTLES} battles, ${MAX_FRAMES} steps each. Older battles make way first.</p></div>`);
    $('#brBack').onclick = () => B.go(backTo);
    $$('[data-br-go]').forEach(btn => btn.onclick = () => B.go(btn.dataset.brGo));
    $$('[data-br-watch]').forEach(btn => btn.onclick = () => { openId = btn.dataset.brWatch; B.go('replays'); });
  }

  function render() {
    stopTimer();
    try {
      if (openId) { const battle = findBattle(openId); if (battle) return renderBattle(battle); openId = null; }
      renderList();
    } catch (err) {
      console.warn('battle-replays', err);
      try { B.render(`<div class="brPage"><button type="button" class="back" data-go="home">‹ Home</button><section class="brEmptyBox"><h1>Battle replays</h1><p>The replays could not open just now. Your battles are still saved.</p></section></div>`); } catch { /* ignore */ }
    }
  }

  /* ---------------------------------------------------------------- Share picture (share-card.js helpers) */
  async function sharePicture(battle) {
    const K = (await import('./share-card.js')).ShareKit;
    const frames = battle.frames.filter(Array.isArray), last = frames[frames.length - 1];
    if (!last) throw Error('no frames');
    const f = readFrame(last, battle.names), cv = K.canvas(), ctx = cv.getContext('2d');
    await K.fonts();
    K.backdrop(ctx, '#f2c45f', 500);
    await K.logo(ctx, 300, 40);
    K.title(ctx, 'BATTLE REPLAY', 245);
    K.line(ctx, `You ${f.points[0]} – ${f.points[1]} ${f.them.name}`, 320, { size: 50, color: '#f3d48a' });
    K.line(ctx, battle.result || 'Battle replay', 395, { size: 38, color: '#ffe3a0' });
    K.badges(ctx, [{ text: labelLevel(battle), color: '#f2c45f' }, { text: dateOf(battle.at), color: '#c9a35a' }], 445);
    K.footer(ctx);
    return K.deliver(cv, 'emberlings-battle-replay.png', 'A battle replay in EMBERLINGS!');
  }

  /* ---------------------------------------------------------------- Entries: result screen and My Stats */
  function addResultButton() {
    if (B.view !== 'cardResult' || !lastDoneId) return;
    const root = $('#app .victoryCard') || $('.victoryCard');
    if (!root || root.querySelector('[data-br-watch-now]')) return;
    const battle = findBattle(lastDoneId);
    if (!battle) return;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'button brResultWatch'; btn.dataset.brWatchNow = battle.id;
    btn.innerHTML = '<span aria-hidden="true">▶</span> Watch the replay';
    btn.onclick = () => { origin = 'cardResult'; openId = battle.id; B.go('replays'); };
    const gold = root.querySelector('.button.gold');
    if (gold) gold.before(btn); else root.append(btn);
  }
  function addStatsRow() {
    if (B.view !== 'stats') return;
    const head = $('#app .stHead');
    if (!head || head.parentElement.querySelector('.brStats')) return;
    const count = ensureReplays(B.state).list.length;
    const box = document.createElement('section');
    box.className = 'brStats'; box.setAttribute('aria-label', 'Battle replays');
    box.innerHTML = `<p><span aria-hidden="true">🎬</span> <b>Battle replays</b> <small>${count ? `Watch your last ${count === 1 ? 'battle' : count + ' battles'} again, step by step.` : 'Finish a battle and watch it again, step by step.'}</small></p>
      <button type="button" class="button gold" id="brStatsOpen">Open replays</button>`;
    head.after(box);
    $('#brStatsOpen', box).onclick = () => { origin = 'stats'; openId = null; B.go('replays'); };
  }

  /* ---------------------------------------------------------------- Styles */
  function injectCSS() {
    if ($('#brCSS')) return;
    const st = document.createElement('style'); st.id = 'brCSS';
    st.textContent = `
/* Battle replays (public/battle-replays.js) */
.brPage{max-width:1080px;margin:0 auto 28px;padding:0 2px;box-sizing:border-box;color:var(--ui-text,#efe6d2);overflow-wrap:anywhere}
.brPage *{box-sizing:border-box}
.brTop{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:6px 0 10px}
.brPage .back{display:inline-flex;align-items:center;min-height:44px}
.brShare{min-height:44px}
.brHead{padding:16px 20px;margin-bottom:12px;border:1px solid var(--ui-goldline,#7a5a2a);border-radius:10px;background:radial-gradient(ellipse at 80% 0,#2a2a3c,transparent 60%),linear-gradient(180deg,#151c27,#0e131b)}
.brKick{margin:0;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--ui-gold,#e9b75a)}
.brHead h1{margin:2px 0 6px;font-size:clamp(24px,4vw,38px)}
.brSub{margin:0;font-size:14px;line-height:1.4;color:var(--ui-muted,#b9ae98)}
.brCard{padding:12px;border:1px solid var(--ui-goldline,#7a5a2a);border-radius:12px;background:linear-gradient(180deg,#151c27,#0e131b)}
.brStage{min-height:180px}
.brFade{animation:brFade .28s ease-out}
@keyframes brFade{from{opacity:.35;transform:translateY(2px)}to{opacity:1;transform:none}}
html[data-fx="off"] .brFade,.reduceMotion .brFade{animation:none}
@media(prefers-reduced-motion:reduce){.brFade{animation:none}}
.brBar{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 10px;align-items:center;padding:8px 10px;margin-bottom:8px;border-radius:8px;background:#0d1219;border:1px solid #3c3220;font-size:13px}
.brBar b{color:#ffe2a0}.brBar small{color:var(--ui-muted,#b9ae98);font-size:12px}
.brCols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}
.brSide{min-width:0;padding:8px;border-radius:9px;background:#111927;border:1px solid #34405a}
.brSide h3{display:flex;justify-content:space-between;gap:6px;align-items:center;margin:0 0 6px;font-size:13px;min-width:0}
.brSide h3 span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.brPts{font-style:normal;letter-spacing:1px;color:#7c8aab;white-space:nowrap}
.brPts i{font-style:normal;font-size:13px}.brPts i.on{color:#ffd27a}
.brActive{position:relative;min-height:64px;padding:8px;border-radius:8px;background:#1b2740;border:1px solid #46577a}
.brActive b{display:block;font-size:14px;color:#fff1c2;line-height:1.2}
.brActive span,.brActive small{display:block;font-size:11px;color:#d6cbb4;line-height:1.4}
.brActive small{color:#a9c7e8}
.brEmpty{opacity:.75}
.brHP{height:7px;margin-top:5px;border-radius:6px;background:#0a1225;overflow:hidden}
.brHP i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#4f9e74,#84d2ab)}
.brBench{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:3px}
.brBench li{display:flex;justify-content:space-between;gap:5px;padding:4px 6px;border-radius:6px;background:#0d1219;font-size:11px;line-height:1.3}
.brBench li span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e8dcc2}
.brBench li b{flex:none;color:#ffe2a0;font-weight:600}
.brBench .brNone{color:#9aa6c8;justify-content:center}
.brFoot{margin-top:8px;display:grid;gap:4px}
.brFoot p{margin:0;font-size:12px;color:#d6cbb4}.brFoot p b{color:#ffe2a0}
.brLog{list-style:none;margin:0;padding:6px 8px;display:grid;gap:2px;border-radius:7px;background:#0d1219;border:1px solid #2c2618}
.brLog li{margin:0;padding:2px 0;font-size:12px;line-height:1.35;color:#c9d5e5}
.brProg{margin:8px 0 0;text-align:center;font-size:12px;color:#d6cbb4;font-variant-numeric:tabular-nums}
.brControls{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:8px}
.brControls .button{min-height:44px;min-width:92px}
.brControls .button:disabled{opacity:.55;cursor:default}
.brNote{margin:10px 0 0;font-size:12px;line-height:1.4;color:var(--ui-muted,#b9ae98)}
.brShareNote{margin:4px 0 0;min-height:1.2em;font-size:12px;color:#c8d1ec}
.brNotice{padding:10px 14px;border-radius:8px;background:#1b2740;border:1px solid #46577a;font-size:13px}
.brList{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.brRow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid #3c3220;border-radius:10px;background:#111927}
.brRowText{display:grid;gap:2px;min-width:0}.brRowText b{font-size:16px;color:#f3dfb0}
.brRowText small{font-size:12px;color:var(--ui-muted,#b9ae98)}
.brRowText span{font-size:12px;color:#d6cbb4}.brRowText .brWin{color:#8fe3a4}.brRowText .brLoss{color:#f0a196}.brRowText .brDraw{color:#c9d5e5}
.brWatch{flex:none;min-height:44px}
.brEmptyBox{padding:22px;border:1px dashed var(--ui-goldline,#7a5a2a);border-radius:10px;text-align:center;background:#0d1219}
.brEmptyBox p{margin:0 auto 12px;max-width:620px;font-size:14px;line-height:1.45;color:#d6cbb4}
.brStats{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:space-between;margin:12px 0 0;padding:12px 16px;border:1px solid var(--ui-goldline,#7a5a2a);border-radius:10px;background:linear-gradient(180deg,#151c27,#0e131b)}
.brStats p{margin:0;min-width:0;font-size:15px}.brStats b{color:#ffe2a0}.brStats small{display:block;color:var(--ui-muted,#b9ae98);font-size:12px}
.brStats .button{min-height:44px}
.brResultWatch{min-height:44px;margin:6px}
@media(max-width:600px){.brHead{padding:14px}.brRow{flex-direction:column;align-items:stretch}.brWatch{width:100%}.brStats{padding:12px}.brStats .button{width:100%}}
`;
    document.head.append(st);
  }

  /* ---------------------------------------------------------------- Wiring */
  injectCSS();
  B.registerView('replays', render);
  addEventListener('ember:cardBattle', e => {
    try { const { match, side } = e.detail || {}; if (!match?.sides || (side !== 0 && side !== 1)) return; record(match, side); }
    catch (err) { console.warn('battle-replays', err); }
  });
  addEventListener('ember:cardResult', e => {
    try {
      if (!session?.battle) lastDoneId = null; else finish(e.detail || {});
      requestAnimationFrame(addResultButton);
    }
    catch (err) { console.warn('battle-replays', err); }
  });
  addEventListener('ember:frame', () => requestAnimationFrame(() => {
    try {
      if (B.view !== 'replays') { stopTimer(); player = null; openId = null; }
      addResultButton(); addStatsRow();
    } catch (err) { console.warn('battle-replays', err); }
  }));
  addEventListener('pagehide', () => { try { if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; saveNow(); } } catch { /* ignore */ } });
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden && player?.playing) { stopTimer(); player = { ...player, playing: false }; paint(); } });
  window.EmberReplays = Object.freeze({ open: id => { openId = typeof id === 'string' ? id : null; origin = B.view === 'stats' ? 'stats' : 'home'; B.go('replays'); }, list: () => ensureReplays(B.state).list, bytes: () => storeBytes(ensureReplays(B.state)) });
}
