// EMBERLINGS player profile: your stats, a Collection Showcase of up to 5 cards, and a frame, background and
// badges unlocked by achievements you have earned. Friends can open it read-only from the Friends list.
// Local data lives in state.ember.profile (added only when you first change something). Showcasing a card is
// just a picture of it: the card is never moved, locked or changed.
import { ACHIEVEMENTS, SPECIES_COUNT } from '/achievements.js';
import { FRAMES, BACKGROUNDS, BADGES, CARD_BACKS, AVATAR_RINGS, SHOWCASE_MAX, BADGES_MAX, achievementFor } from '/profile-items.js';
import { backHTML, avatarCard, apply as applyCosmetics } from '/cosmetics.js';

const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fmt = n => Math.floor(Number(n) || 0).toLocaleString();
const ext = () => { const st = B.state; if (!st.ember || typeof st.ember !== 'object') st.ember = {}; return st.ember; };
const DEFAULTS = { showcase: [], frame: 'simple', background: 'dusk', badges: [] };
// Read-only view of the saved profile with defaults filled in; nothing is written until the player changes something.
const prof = () => { const p = ext().profile; return p && typeof p === 'object' ? { ...DEFAULTS, ...p } : { ...DEFAULTS }; };
function edit(fn) { const e = ext(); const p = { ...DEFAULTS, ...(e.profile && typeof e.profile === 'object' ? e.profile : {}) }; fn(p); e.profile = p; B.save(); applyCosmetics(); schedulePublish(); }

/* ---------------------------------------------------------------- What the player has earned */
const earned = id => !id || !!(ext().achievements || {})[id];
const unlocked = item => earned(item.need);
const howTo = item => { const a = achievementFor(item.need); return a ? `Earn “${a.name}”: ${a.desc}` : ''; };
const owned = () => (Array.isArray(B.state.owned) ? B.state.owned : []).filter(c => c && Number.isInteger(c.kind));
const spName = c => B.species?.[c.kind]?.name || 'Mythling';
const mutOf = c => (B.MUTATIONS || []).find(m => m.id === c?.mutation) || null;
const rarity = c => { try { return B.rarityLabel(c); } catch { return c.secret ? 'Secret' : c.rarity || 'Common'; } };
const rank = c => { try { return B.rarityRank(c); } catch { return 0; } };
// Best-first score: rarity, then mutation strength, shiny and level (uses the rare-finds score when it is loaded).
const score = c => window.EmberRare?.rareScore ? window.EmberRare.rareScore(c) : rank(c) * 30 + (mutOf(c) ? 10 + (B.MUTATIONS || []).indexOf(mutOf(c)) : 0) + (c.shiny ? 8 : 0) + Math.min(100, c.level || 1) / 10;
function showcaseCards() { const byId = new Map(owned().map(c => [c.id, c])); return (prof().showcase || []).map(id => byId.get(id)).filter(Boolean).slice(0, SHOWCASE_MAX); }
function autoPick() {
  // Best five, preferring five different species so the showcase has variety.
  const list = owned().slice().sort((a, b) => score(b) - score(a)), out = [], kinds = new Set();
  for (const c of list) { if (out.length >= SHOWCASE_MAX) break; if (!kinds.has(c.kind)) { out.push(c); kinds.add(c.kind); } }
  for (const c of list) { if (out.length >= SHOWCASE_MAX) break; if (!out.includes(c)) out.push(c); }
  return out.map(c => c.id);
}
function myStats() {
  const st = B.state, e = ext(), list = owned(), got = e.achievements || {};
  const kinds = new Set([...(Array.isArray(st.discovered) ? st.discovered : []), ...list.map(c => c.kind)]);
  const quests = Array.isArray(st.cleared) ? st.cleared.length : 0, friendWins = e.onlineWins || 0;
  return {
    cards: list.length, species: Math.min(SPECIES_COUNT, kinds.size), wins: quests + friendWins, quests, friendWins,
    achievements: ACHIEVEMENTS.filter(a => got[a.id]).length, top: list.reduce((n, c) => Math.max(n, c.level || 1), 0),
    passes: st.items?.trainingPasses || 0, explorer: (() => { try { return B.limit(); } catch { return null; } })(), packs: st.packCount || 0
  };
}
// The online copy: card snapshots (no ids of anything else, no xp or coins) plus ids and a few numbers.
const lvl = v => Math.min(100, Math.max(1, Math.floor(Number(v) || 1)));
function snap(c) {
  const m = mutOf(c), out = { kind: c.kind, rarity: rarity(c), level: lvl(c.level), shiny: !!c.shiny, secret: rank(c) === 6 && !!c.secret, mutation: m ? m.id : null };
  if (typeof c.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(c.id)) out.id = c.id;
  const stage = Math.min(2, Math.max(0, Math.floor(c.stage || 0))), aa = Math.min(5, Math.max(0, Math.floor(c.academyAttack || 0)));
  if (stage) out.stage = stage; if (aa) out.academyAttack = aa; if (c.fused) out.fused = true;
  return out;
}
function currentLook() {
  const p = prof(), frame = FRAMES.find(f => f.id === p.frame && unlocked(f)) ? p.frame : 'simple', background = BACKGROUNDS.find(b => b.id === p.background && unlocked(b)) ? p.background : 'dusk';
  const badges = (Array.isArray(p.badges) ? p.badges : []).filter((id, i, a) => a.indexOf(id) === i && BADGES.some(b => b.id === id) && earned(id)).slice(0, BADGES_MAX);
  // Card back and avatar ring (cosmetics.js applies them); a missing choice means the usual look.
  const cardBack = CARD_BACKS.find(x => x.id === p.cardBack && unlocked(x)) ? p.cardBack : 'ember', ring = AVATAR_RINGS.find(x => x.id === p.ring && unlocked(x)) ? p.ring : 'gold';
  return { frame, background, badges, cardBack, ring };
}
function payload() { const s = myStats(), ava = avatarCard(); return { cards: showcaseCards().map(snap), ...currentLook(), ...(ava ? { avatar: snap(ava) } : {}), stats: { cards: Math.min(1e6, s.cards), species: s.species, wins: Math.min(1e7, s.wins), achievements: s.achievements } }; }

/* ---------------------------------------------------------------- Sharing with friends */
const hash = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
let pubTimer = 0, publishing = false, lastTry = 0, shareMsg = '';
function schedulePublish() { clearTimeout(pubTimer); pubTimer = setTimeout(() => publish(true), 700); }
async function publish(now = false) {
  if (!B.state.playerUsername || !ext().profile || publishing) return;
  if (!now && Date.now() - lastTry < 60000) return;
  const body = payload(), key = hash(JSON.stringify(body));
  if (ext().profile.published === key) { setShare('Friends can see your profile.'); return; }
  publishing = true; lastTry = Date.now(); setShare('Sharing with your friends…');
  try { await B.online('/showcase', body); ext().profile.published = key; B.save(); setShare('Saved. Friends can see your profile.'); }
  catch (err) { setShare('Saved on this device. Friends will see it next time you are online.'); }
  finally { publishing = false; }
}
function setShare(t) { shareMsg = t; const el = $('#pfShare'); if (el) el.textContent = t; }

/* ---------------------------------------------------------------- Pieces */
const BADGE_COLORS = { pack: ['#ffb05c', '#a8521c'], quest: ['#8fdc8c', '#2f6e3a'], boss: ['#ffd46b', '#8a5a12'], species: ['#7fd2ff', '#1f5d86'], cards: ['#e0c38a', '#6b5124'], shiny: ['#fff3a8', '#a08a26'], secret: ['#c6a6ff', '#4b2f8a'], legendary: ['#ffd27a', '#9a5b10'], mutant: ['#9ff0c8', '#2d7458'], cosmic: ['#ffb3df', '#8a2f68'], fusion: ['#d5a6ff', '#5b2f8a'], vault: ['#ffe08a', '#7a5a14'], coins: ['#ffe48a', '#8a6a10'], album: ['#9fd8ff', '#2b4f86'], friend: ['#a8f0ff', '#1f6a7a'], duel: ['#ff9f8a', '#8a2f24'] };
function badgeSVG(id, locked) {
  const a = achievementFor(id); if (!a) return '';
  const [hi, lo] = locked ? ['#5d6475', '#2a2f3b'] : BADGE_COLORS[id.split('-')[0]] || ['#e9b75a', '#7a5a2a'], g = 'pfg' + id.replace(/\W/g, '');
  return `<svg class="pfBadgeSvg" viewBox="0 0 64 70" aria-hidden="true"><defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset="1" stop-color="${lo}"/></linearGradient></defs>
    <path d="M32 2 60 18v34L32 68 4 52V18z" fill="url(#${g})" stroke="#0008" stroke-width="2"/><path d="M32 9 54 22v26L32 61 10 48V22z" fill="#0003" stroke="#fff5" stroke-width="1.5"/>
    <text x="32" y="44" text-anchor="middle" font-size="24">${locked ? '🔒' : a.icon}</text></svg>`;
}
const badgeHTML = id => { const a = achievementFor(id); return a ? `<span class="pfBadge" title="${esc(a.name)}: ${esc(a.desc)}">${badgeSVG(id)}<small>${esc(a.name)}</small></span>` : ''; };
function bannerHTML({ name, title, sub, avatar, frame, background, badges, ring = 'gold' }) {
  return `<div class="pfBanner pf-b-${esc(background)}"><i class="pfBannerArt" aria-hidden="true"></i>
    <div class="pfFrame pf-f-${esc(frame)}"><div class="pfAva cosRing-${esc(ring)}">${avatar || ''}</div>${frame === 'royal' || frame === 'voidbane' ? `<svg class="pfCrown" viewBox="0 0 60 30" aria-hidden="true"><path d="M4 28 8 6l12 12L30 2l10 16L52 6l4 22z" fill="${frame === 'royal' ? '#ffd46b' : '#b18bff'}" stroke="#0009" stroke-width="2"/></svg>` : ''}</div>
    <div class="pfWho"><h1>${esc(name)}</h1>${title ? `<p class="pfTitle">🏷 ${esc(title)}</p>` : ''}${sub ? `<p class="pfSub">${sub}</p>` : ''}</div>
    ${badges.length ? `<div class="pfBadges" aria-label="Badges">${badges.map(badgeHTML).join('')}</div>` : ''}</div>`;
}
const statTile = (icon, label, value, extra = '') => `<div class="pfStat ${extra}"><span aria-hidden="true">${icon}</span><b>${value}</b><small>${label}</small></div>`;
const cardFor = c => `<div class="pfCard">${B.cardHTML(c)}</div>`;
const backTile = id => `<div class="pfStat pfBackStat">${backHTML(id, 'pfBackMini')}<div><small>Card back</small><b>${esc((CARD_BACKS.find(x => x.id === id) || CARD_BACKS[0]).name)}</b></div></div>`;

/* ---------------------------------------------------------------- My profile page */
let tab = 'frames', picker = false;
function renderMine() {
  const st = B.state, e = ext(), s = myStats(), look = currentLook(), cards = showcaseCards(), active = avatarCard() || B.active?.() || owned()[0];
  const best = window.EmberRare?.rarest ? window.EmberRare.rarest(owned()) : owned().slice().sort((a, b) => score(b) - score(a))[0];
  const signedIn = !!st.playerUsername;
  if (!shareMsg) shareMsg = signedIn ? (e.profile ? 'Friends can see your profile.' : 'Pick your cards and look. Friends will see it in their Friends list.') : 'Choose a username in Friends to share your profile with friends.';
  const slots = Array.from({ length: SHOWCASE_MAX }, (_, i) => cards[i] ? cardFor(cards[i]) : `<button type="button" class="pfEmpty" data-pf="pick"><span aria-hidden="true">＋</span>Add a card</button>`).join('');
  B.render(`<button class="back" data-go="home">‹ Home</button><section class="pfPage" aria-labelledby="pfName">
   ${bannerHTML({ name: st.playerUsername || 'Explorer', title: e.title, sub: `${s.explorer ? `Explorer level ${s.explorer} · ` : ''}${s.achievements}/${ACHIEVEMENTS.length} achievements`, avatar: active ? B.art(active) : '', ...look }).replace('<h1>', '<h1 id="pfName">')}
   <div class="pfStats">
    ${statTile('🃏', 'Cards owned', fmt(s.cards))}${statTile('🔎', 'Species found', `${s.species}/${SPECIES_COUNT}`)}${statTile('⚔️', 'Battles won', fmt(s.wins), 'pfStatWins')}
    ${statTile('🗺️', 'Quests won', `${fmt(s.quests)}/100`)}${statTile('👥', 'Friend wins', fmt(s.friendWins))}${statTile('⬆️', 'Top level', s.top || '–')}${statTile('🎟️', 'Academy Passes', fmt(s.passes))}${statTile('🎁', 'Packs opened', fmt(s.packs))}
    ${best ? `<div class="pfStat pfRarest"><span class="pfRarestArt" aria-hidden="true">${B.art(best)}</span><div><small>Rarest find</small><b>${esc(spName(best))}</b><small>${esc(rarity(best))}${mutOf(best) ? ' · ' + esc(mutOf(best).name) : ''}${best.shiny ? ' · Shiny' : ''} · Lv ${best.level || 1}</small></div></div>` : ''}
    ${backTile(look.cardBack)}
   </div>
   <section class="pfSection"><div class="pfHead"><h2>Collection Showcase</h2><p>Show off up to ${SHOWCASE_MAX} of your cards. They stay in your collection as normal.</p>
    <div class="pfBtns"><button type="button" class="pfBtn gold" data-pf="auto">★ Auto-pick my best ${SHOWCASE_MAX}</button><button type="button" class="pfBtn" data-pf="pick">Choose cards</button>${cards.length ? '<button type="button" class="pfBtn ghost" data-pf="clear">Clear</button>' : ''}</div></div>
    <div class="pfShow">${owned().length ? slots : '<p class="pfNote">Open a pack to get cards you can show off.</p>'}</div></section>
   <section class="pfSection pfCustom"><div class="pfHead"><h2>Customise</h2><p>Earn achievements to unlock new frames, backgrounds, card backs, avatar rings and badges. They only change how things look.</p></div>
    <div class="pfTabs" role="tablist">${[['frames', 'Frames'], ['backgrounds', 'Backgrounds'], ['backs', 'Card backs'], ['avatar', 'Avatar'], ['badges', `Badges (${look.badges.length}/${BADGES_MAX})`]].map(([k, t]) => `<button type="button" role="tab" class="pfTab ${tab === k ? 'on' : ''}" aria-selected="${tab === k}" data-pf-tab="${k}">${t}</button>`).join('')}</div>
    <div class="pfOptions">${optionsHTML(look)}</div></section>
   <p id="pfShare" class="pfShare" role="status">${esc(shareMsg)}</p>
   <p class="pfLinks"><button type="button" class="pfBtn ghost" data-go="achievements">🏆 Achievements &amp; titles</button>${signedIn ? '<button type="button" class="pfBtn ghost" data-go="friends">👥 Friends</button>' : '<button type="button" class="pfBtn ghost" data-go="friends">👥 Choose a username</button>'}</p>
  </section>`);
  wireMine();
  if (picker) openPicker();
  publish();
}
// Your avatar can be any Mythling you own: one button per look (species, mutation, shiny, secret), best first.
function avatarChoices() {
  const seen = new Set(), out = [];
  for (const c of owned().slice().sort((a, b) => score(b) - score(a))) { const k = `${c.kind}|${c.mutation || ''}|${!!c.shiny}|${!!c.secret}`; if (!seen.has(k)) { seen.add(k); out.push(c); } if (out.length >= 48) break; }
  return out;
}
const lockText = (x, on) => on ? '✓ In use' : unlocked(x) ? 'Tap to use' : '🔒 ' + esc(howTo(x));
function cosmeticOptions(look) {
  if (tab === 'backs') return `<p class="pfNote pfCosNote">Your card back shows on the back of face-down cards: the card details flip side, pack reveals and your battle deck.</p>
   <div class="pfGrid pfBackGrid">${CARD_BACKS.map(x => { const ok = unlocked(x), on = x.id === look.cardBack;
    return `<button type="button" class="pfOpt pfBackOpt ${ok ? '' : 'locked'} ${on ? 'on' : ''}" data-pf-back="${x.id}" aria-pressed="${on}" ${ok ? '' : 'aria-disabled="true"'}>${backHTML(x.id, 'pfBackPrev')}<b>${esc(x.name)}</b><small>${lockText(x, on)}</small></button>`; }).join('')}</div>`;
  const cur = avatarCard(), def = B.active?.() || owned()[0];
  const ava = (c, id, label, sub) => `<button type="button" class="pfOpt pfAvaOpt ${(cur ? cur.id === id : !id) ? 'on' : ''}" data-pf-ava="${esc(id)}" aria-pressed="${cur ? cur.id === id : !id}"><span class="cosRingSwatch cosRing-${esc(look.ring)}">${c ? B.art(c) : ''}</span><b>${esc(label)}</b><small>${sub}</small></button>`;
  return `<h3 class="pfSubHead">Avatar Mythling</h3><p class="pfNote pfCosNote">Shown in the top bar and on your profile. Pick from Mythlings you own.</p>
   <div class="pfGrid pfAvaGrid">${ava(def, '', 'Active Mythling', 'Follows your Active')}${avatarChoices().map(c => { const m = mutOf(c); return ava(c, c.id, spName(c), `${esc(rarity(c))}${m ? ' · ' + m.icon + ' ' + esc(m.name) : ''}${c.shiny ? ' · ✦ Shiny' : ''}`); }).join('')}</div>
   <h3 class="pfSubHead">Avatar rings</h3>
   <div class="pfGrid">${AVATAR_RINGS.map(x => { const ok = unlocked(x), on = x.id === look.ring;
    return `<button type="button" class="pfOpt ${ok ? '' : 'locked'} ${on ? 'on' : ''}" data-pf-ring="${x.id}" aria-pressed="${on}" ${ok ? '' : 'aria-disabled="true"'}><span class="cosRingSwatch cosRing-${x.id}">${cur || def ? B.art(cur || def) : ''}</span><b>${esc(x.name)}</b><small>${lockText(x, on)}</small></button>`; }).join('')}</div>`;
}
function optionsHTML(look) {
  if (tab === 'backs' || tab === 'avatar') return cosmeticOptions(look);
  if (tab === 'badges') return `<div class="pfGrid pfBadgeGrid">${BADGES.map(b => { const ok = earned(b.id), on = look.badges.includes(b.id), a = achievementFor(b.id);
    return `<button type="button" class="pfOpt pfBadgeOpt ${ok ? '' : 'locked'} ${on ? 'on' : ''}" data-pf-badge="${b.id}" aria-pressed="${on}" ${ok ? '' : 'aria-disabled="true"'}>${badgeSVG(b.id, !ok)}<b>${esc(a.name)}</b><small>${ok ? (on ? '✓ Pinned' : 'Tap to pin') : '🔒 ' + esc(a.desc)}</small></button>`; }).join('')}</div>`;
  const list = tab === 'frames' ? FRAMES : BACKGROUNDS, cur = tab === 'frames' ? look.frame : look.background;
  return `<div class="pfGrid">${list.map(x => { const ok = unlocked(x), on = x.id === cur;
    const crown = x.id === 'royal' || x.id === 'voidbane' ? `<svg class="pfCrown" viewBox="0 0 60 30" aria-hidden="true"><path d="M4 28 8 6l12 12L30 2l10 16L52 6l4 22z" fill="${x.id === 'royal' ? '#ffd46b' : '#b18bff'}" stroke="#0009" stroke-width="2"/></svg>` : '';
    const swatch = tab === 'frames' ? `<span class="pfFrame pf-f-${x.id} pfMini"><span class="pfAva"></span>${crown}</span>` : `<span class="pfSwatch pf-b-${x.id}"><i class="pfBannerArt"></i></span>`;
    return `<button type="button" class="pfOpt ${ok ? '' : 'locked'} ${on ? 'on' : ''}" data-pf-${tab === 'frames' ? 'frame' : 'bg'}="${x.id}" aria-pressed="${on}" ${ok ? '' : 'aria-disabled="true"'}>${swatch}<b>${esc(x.name)}</b><small>${on ? '✓ In use' : ok ? 'Tap to use' : '🔒 ' + esc(howTo(x))}</small></button>`; }).join('')}</div>`;
}
function wireMine() {
  const page = $('.pfPage'); if (!page) return;
  page.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b || !page.contains(b)) return;
    const act = b.dataset.pf;
    if (act === 'auto') { const ids = autoPick(); if (!ids.length) return B.toast('Open a pack first to get cards to show.'); edit(p => { p.showcase = ids; }); B.toast('Showcase filled with your best cards.'); return renderMine(); }
    if (act === 'clear') { edit(p => { p.showcase = []; }); return renderMine(); }
    if (act === 'pick') { picker = true; pickPage = 1; return openPicker(); }
    if (b.dataset.pfTab) { tab = b.dataset.pfTab; return renderMine(); }
    const item = b.dataset.pfFrame ? FRAMES.find(f => f.id === b.dataset.pfFrame) : b.dataset.pfBg ? BACKGROUNDS.find(f => f.id === b.dataset.pfBg) : null;
    if (item) { if (!unlocked(item)) return B.toast('🔒 ' + howTo(item)); edit(p => { p[b.dataset.pfFrame ? 'frame' : 'background'] = item.id; }); return renderMine(); }
    const cos = b.dataset.pfBack ? ['cardBack', CARD_BACKS.find(x => x.id === b.dataset.pfBack)] : b.dataset.pfRing ? ['ring', AVATAR_RINGS.find(x => x.id === b.dataset.pfRing)] : null;
    if (cos?.[1]) { if (!unlocked(cos[1])) return B.toast('🔒 ' + howTo(cos[1])); edit(p => { p[cos[0]] = cos[1].id; }); return renderMine(); }
    if (b.dataset.pfAva !== undefined) { const id = b.dataset.pfAva; if (id && !owned().some(c => c.id === id)) return; edit(p => { if (id) p.avatar = id; else delete p.avatar; }); return renderMine(); }
    const badge = b.dataset.pfBadge;
    if (badge) {
      const a = achievementFor(badge); if (!earned(badge)) return B.toast(`🔒 Earn “${a.name}”: ${a.desc}`);
      const cur = currentLook().badges;
      if (!cur.includes(badge) && cur.length >= BADGES_MAX) return B.toast(`You can pin up to ${BADGES_MAX} badges. Unpin one first.`);
      edit(p => { p.badges = cur.includes(badge) ? cur.filter(x => x !== badge) : [...cur, badge]; }); return renderMine();
    }
  });
}

/* ---------------------------------------------------------------- Card picker */
let pickPage = 1, pickFilter = '';
function openPicker() {
  $('#pfPicker')?.remove();
  const chosen = new Set(prof().showcase || []), list = owned().slice().sort((a, b) => score(b) - score(a));
  const q = pickFilter.trim().toLowerCase(), shown = (q ? list.filter(c => `${spName(c)} ${rarity(c)} ${mutOf(c)?.name || ''} ${c.shiny ? 'shiny' : ''}`.toLowerCase().includes(q)) : list);
  const page = shown.slice(0, pickPage * 60);
  const el = document.createElement('div'); el.id = 'pfPicker'; el.className = 'pfPicker'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'pfPickTitle');
  el.innerHTML = `<div class="pfPickBox"><div class="pfPickHead"><h2 id="pfPickTitle">Choose up to ${SHOWCASE_MAX} cards</h2><span class="pfPickCount">${chosen.size}/${SHOWCASE_MAX} picked</span><button type="button" class="pfBtn gold pfPickDone">Done</button></div>
    <input type="search" class="pfPickSearch" placeholder="Search: name, rarity, mutation, shiny" aria-label="Search your cards" value="${esc(pickFilter)}">
    <div class="pfPickList">${page.map(c => { const on = chosen.has(c.id), m = mutOf(c);
      return `<button type="button" class="pfPick ${on ? 'on' : ''} rar-${rank(c)}" data-id="${esc(c.id)}" aria-pressed="${on}"><span class="pfPickArt">${B.art(c)}</span><span class="pfPickTxt"><b>${esc(spName(c))}</b><small>Lv ${c.level || 1} · ${esc(rarity(c))}${m ? ' · ' + m.icon + ' ' + esc(m.name) : ''}${c.shiny ? ' · ✦ Shiny' : ''}</small></span><span class="pfTick" aria-hidden="true">${on ? '✓' : ''}</span></button>`; }).join('') || '<p class="pfNote">No cards match.</p>'}</div>
    ${shown.length > page.length ? `<button type="button" class="pfBtn pfPickMore">Show more (${shown.length - page.length} left)</button>` : ''}</div>`;
  document.body.append(el);
  const close = () => { picker = false; el.remove(); renderMine(); };
  $('.pfPickDone', el).onclick = close;
  el.addEventListener('click', ev => { if (ev.target === el) close(); });
  el.addEventListener('keydown', ev => { if (ev.key === 'Escape') close(); });
  const search = $('.pfPickSearch', el); let t = 0;
  search.oninput = () => { clearTimeout(t); t = setTimeout(() => { pickFilter = search.value; pickPage = 1; const pos = search.selectionStart; openPicker(); const s = $('#pfPicker .pfPickSearch'); s?.focus(); try { s?.setSelectionRange(pos, pos); } catch {} }, 250); };
  const more = $('.pfPickMore', el); if (more) more.onclick = () => { const y = $('.pfPickList', el).scrollTop; pickPage++; openPicker(); $('#pfPicker .pfPickList').scrollTop = y; };
  $('.pfPickList', el).addEventListener('click', ev => {
    const b = ev.target.closest('.pfPick'); if (!b) return; const id = b.dataset.id, cur = (prof().showcase || []).filter(x => owned().some(c => c.id === x));
    if (cur.includes(id)) edit(p => { p.showcase = cur.filter(x => x !== id); });
    else { if (cur.length >= SHOWCASE_MAX) return B.toast(`Your showcase holds ${SHOWCASE_MAX} cards. Tap one to remove it first.`); edit(p => { p.showcase = [...cur, id]; }); }
    const on = (prof().showcase || []).includes(id); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); $('.pfTick', b).textContent = on ? '✓' : '';
    $('.pfPickCount', el).textContent = `${(prof().showcase || []).length}/${SHOWCASE_MAX} picked`;
  });
  (q ? search : $('.pfPickDone', el)).focus({ preventScroll: true });
}

/* ---------------------------------------------------------------- A friend's profile (read-only) */
let friendName = null, friendData = null, friendError = '';
export function openFriendProfile(name) {
  if (!/^[A-Za-z0-9_]{3,20}$/.test(String(name || ''))) return;
  if (name.toLowerCase() === String(B.state.playerUsername || '').toLowerCase()) return B.go('profile');
  friendName = name; friendData = null; friendError = ''; B.go('friendProfile');
  B.online('/players/' + encodeURIComponent(name) + '/profile').then(d => { friendData = d; }).catch(err => { friendError = err.message || 'Could not load this profile.'; })
    .finally(() => { if (B.view === 'friendProfile' && friendName === name) renderFriend(); });
}
function renderFriend() {
  const back = '<button class="back" data-go="friends">‹ Friends</button>';
  if (!friendData) return B.render(`${back}<section class="pfPage"><div class="pfBanner pf-b-dusk"><i class="pfBannerArt"></i><div class="pfWho"><h1>${esc(friendName || 'Friend')}</h1><p class="pfSub" role="status">${friendError ? esc(friendError) : 'Loading profile…'}</p></div></div></section>`);
  const d = friendData, p = d.profile || {}, s = p.stats || {}, cards = (Array.isArray(p.cards) ? p.cards : []).filter(c => Number.isInteger(c?.kind) && c.kind >= 0 && c.kind < 16).slice(0, SHOWCASE_MAX);
  const frame = FRAMES.some(f => f.id === p.frame) ? p.frame : 'simple', background = BACKGROUNDS.some(b => b.id === p.background) ? p.background : 'dusk';
  const badges = (Array.isArray(p.badges) ? p.badges : []).filter(id => BADGES.some(b => b.id === id)).slice(0, BADGES_MAX);
  const cardBack = CARD_BACKS.some(x => x.id === p.cardBack) ? p.cardBack : 'ember', ring = AVATAR_RINGS.some(x => x.id === p.ring) ? p.ring : 'gold';
  const pa = p.avatar && Number.isInteger(p.avatar.kind) && p.avatar.kind >= 0 && p.avatar.kind < 16 ? p.avatar : null;
  let avatar = ''; try { avatar = B.art(pa || d.pet); } catch {}
  let shown = ''; try { shown = cards.map(cardFor).join(''); } catch { shown = ''; }
  B.render(`${back}<section class="pfPage pfFriend" aria-labelledby="pfName">
   ${bannerHTML({ name: d.username, title: d.title, sub: window.EmberPresence ? window.EmberPresence.label(d) : (d.online ? '🟢 Online now' : '⚪ Offline'), avatar, frame, background, badges, ring }).replace('<h1>', '<h1 id="pfName">')}
   ${d.profile ? `<div class="pfStats">${statTile('🃏', 'Cards owned', fmt(s.cards))}${statTile('🔎', 'Species found', `${s.species || 0}/${SPECIES_COUNT}`)}${statTile('⚔️', 'Battles won', fmt(s.wins))}${statTile('🏆', 'Achievements', `${s.achievements || 0}/${ACHIEVEMENTS.length}`)}${backTile(cardBack)}</div>` : ''}
   <section class="pfSection"><div class="pfHead"><h2>${esc(d.username)}'s Showcase</h2></div>
    <div class="pfShow">${shown || `<p class="pfNote">${esc(d.username)} hasn't picked any cards to show yet.</p>`}</div></section>
   <p class="pfLinks"><button type="button" class="pfBtn" data-pf-trade="${esc(d.username)}">🤝 Trade with ${esc(d.username)}</button><button type="button" class="pfBtn ghost" data-go="friends">‹ Back to Friends</button></p>
  </section>`);
  const t = $('[data-pf-trade]'); if (t) t.onclick = () => { const name = t.dataset.pfTrade; B.go('friends'); waitThen(() => $(`[data-trade-invite="${CSS.escape(name)}"]`), b => b.click()); };
}
function waitThen(find, then, tries = 40) { const el = find(); if (el) return then(el); if (tries > 0) setTimeout(() => waitThen(find, then, tries - 1), 150); }

/* ---------------------------------------------------------------- Entry points */
function friendsButtons(data) {
  for (const f of data?.friends || []) {
    if (!/^[A-Za-z0-9_]{3,20}$/.test(f.username)) continue;
    const row = $(`[data-trade-invite="${f.username}"]`)?.closest('.friendRow'); if (!row || $('.pfFriendBtn', row)) continue;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'pfFriendBtn'; btn.dataset.profile = f.username;
    btn.innerHTML = '<span aria-hidden="true">👤</span> Profile'; btn.setAttribute('aria-label', `Open ${f.username}'s profile`);
    btn.onclick = () => openFriendProfile(f.username);
    const tabletWho = $('.uiXFTRowWho', row), actions = $('.friendActions', row);
    if (tabletWho) tabletWho.append(btn); else if (actions) actions.prepend(btn); else row.append(btn);
  }
}
function onFrame() {
  if (B.view === 'achievements' && !$('.pfAchLink')) {
    const hero = $('#app .hero'); if (hero) hero.insertAdjacentHTML('beforeend', '<p class="pfAchLink"><button type="button" class="pfBtn gold" data-go="profile">👤 My Profile</button><small>Show off your cards and pick a frame, background and badges.</small></p>');
    B.bind();
  }
  if (B.view !== 'profile' && B.view !== 'friendProfile') $('#pfPicker')?.remove();
}

if (B) {
  B.registerView('profile', () => { shareMsg = ''; renderMine(); });
  B.registerView('friendProfile', renderFriend);
  addEventListener('ember:frame', () => requestAnimationFrame(onFrame));
  addEventListener('ember:friends', e => { friendsButtons(e.detail); publish(); });
  window.EmberProfile = { open: () => B.go('profile'), openFriend: openFriendProfile, autoPick, payload };
  injectCSS();
}

/* ---------------------------------------------------------------- Styles (original CSS/SVG art) */
function injectCSS() {
  if ($('#pfStyles')) return;
  const css = document.createElement('style'); css.id = 'pfStyles';
  css.textContent = `
.pfPage{max-width:1180px;margin:0 auto 32px;display:flex;flex-direction:column;gap:18px;color:var(--ui-text,#efe6d2);min-width:0}
.pfPage *{box-sizing:border-box}
.pfPage h1,.pfPage h2{font-family:var(--ui-display,Georgia,serif);margin:0;color:#ffe6b0;letter-spacing:.02em}
.pfBanner{position:relative;overflow:hidden;display:grid;grid-template-columns:auto 1fr;grid-template-areas:"ava who" "ava badges";align-items:center;gap:6px 22px;padding:24px 28px;border-radius:18px;border:2px solid var(--pf-edge,#7a5a2a);box-shadow:0 10px 30px #0009,inset 0 0 0 1px #fff1;min-height:180px;isolation:isolate}
.pfBannerArt{position:absolute;inset:0;z-index:-1;pointer-events:none}
.pfWho{grid-area:who;min-width:0;align-self:end;text-shadow:0 2px 6px #000c}
.pfWho h1{font-size:clamp(26px,4vw,42px);line-height:1.05;overflow-wrap:anywhere}
.pfTitle{display:inline-block;margin:8px 0 0;padding:4px 12px;border-radius:99px;background:#0008;border:1px solid #e9b75a88;color:#ffd98a;font-weight:700;font-size:15px}
.pfSub{margin:8px 0 0;color:#f2e8d6;font-size:15px}
.pfBadges{grid-area:badges;display:flex;flex-wrap:wrap;gap:8px;align-self:start}
.pfBadge{display:flex;flex-direction:column;align-items:center;width:64px;text-align:center}
.pfBadge small{font-size:10.5px;line-height:1.15;color:#f6ecd8;text-shadow:0 1px 3px #000;margin-top:2px}
.pfBadgeSvg{width:46px;height:50px;filter:drop-shadow(0 2px 4px #000a)}
.pfFrame{grid-area:ava;position:relative;width:132px;height:132px;border-radius:50%;padding:7px;background:var(--pf-ring,linear-gradient(#c9a35a,#7a5a2a));box-shadow:0 6px 18px #000a}
.pfAva{width:100%;height:100%;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 50% 35%,#2d3550,#0c0f18);display:grid;place-items:center}
.pfAva .mythlingArt{width:100%!important;height:100%!important;display:block}
.pfAva img{max-width:100%}
.pfCrown{position:absolute;left:50%;top:-20px;width:62px;transform:translateX(-50%);filter:drop-shadow(0 2px 3px #000a)}
.pf-f-simple{--pf-ring:linear-gradient(160deg,#e3c98f,#8a6a34)}
.pf-f-ember{--pf-ring:conic-gradient(from 0deg,#ff6a2a,#ffcf5c,#ff3d1f,#ffb347,#ff6a2a);box-shadow:0 0 22px #ff7a2a99,0 6px 18px #000a}
.pf-f-verdant{--pf-ring:repeating-conic-gradient(#3f9b4f 0 12deg,#9be37a 12deg 24deg);box-shadow:0 0 16px #6fd06f66,0 6px 18px #000a}
.pf-f-tide{--pf-ring:radial-gradient(circle,#0000 58%,#bff1ff 59% 62%,#0000 63%),linear-gradient(180deg,#5fd0ff,#1b5d9a)}
.pf-f-gilded{padding:10px;--pf-ring:conic-gradient(#fff3c0,#d79a2b,#fff1b0,#b9781c,#ffe9a0,#d79a2b,#fff3c0);box-shadow:0 0 0 2px #5a3a12,0 0 20px #ffd06b66,0 6px 18px #000a}
.pf-f-starlit{--pf-ring:radial-gradient(circle at 20% 20%,#fff 0 2px,#0000 3px),radial-gradient(circle at 80% 30%,#fff 0 2px,#0000 3px),radial-gradient(circle at 60% 85%,#fff 0 1.5px,#0000 2.5px),linear-gradient(160deg,#e9edff,#8d96c8 50%,#f6f1c8);box-shadow:0 0 20px #dfe6ff88,0 6px 18px #000a}
.pf-f-alchemy{--pf-ring:conic-gradient(#8e5cff,#36d6c3,#8e5cff,#36d6c3,#8e5cff);box-shadow:0 0 18px #8e5cff77,0 6px 18px #000a}
.pf-f-royal{padding:9px;--pf-ring:linear-gradient(160deg,#ffe58a,#c8871f 45%,#7a1f2a 46%,#b33a3a);box-shadow:0 0 0 2px #3a0d12,0 0 18px #ffcc5577,0 6px 18px #000a}
.pf-f-cosmic{--pf-ring:conic-gradient(#ff8fd0,#8a7dff,#62e3ff,#ffe17a,#ff8fd0);box-shadow:0 0 24px #ff8fd077,0 6px 18px #000a}
.pf-f-cosmic::before,.pf-f-ember::before{content:"";position:absolute;inset:-3px;border-radius:50%;background:inherit;filter:blur(6px);opacity:.55;z-index:-1;animation:pfSpin 9s linear infinite}
.pf-f-voidbane{padding:9px;--pf-ring:conic-gradient(#1a0b2e,#7b3dff,#1a0b2e,#c08bff,#1a0b2e);box-shadow:0 0 0 2px #000,0 0 26px #8b4dffaa,0 6px 18px #000a}
@keyframes pfSpin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.pfFrame::before{animation:none}}
body.reducedMotion .pfFrame::before{animation:none}
.pfFrame.pfMini{width:64px;height:64px;padding:5px;margin:6px auto 0}
.pfMini .pfCrown{width:34px;top:-12px}
.pfMini .pfAva{background:radial-gradient(circle at 50% 35%,#3a4566,#121624)}
/* Backgrounds: layered gradients, no images */
.pf-b-dusk{--pf-edge:#7a5a2a}.pf-b-dusk .pfBannerArt{background:radial-gradient(120% 70% at 70% 120%,#ff9a4d99,#0000 60%),linear-gradient(180deg,#1b1f3d,#3a2a55 55%,#7a3f45)}
.pf-b-campfire{--pf-edge:#b5642a}.pf-b-campfire .pfBannerArt{background:radial-gradient(40% 60% at 50% 115%,#ffcf6b,#ff7a2a88 40%,#0000 70%),radial-gradient(circle at 20% 30%,#ffd27a 0 1.5px,#0000 2px) 0 0/60px 50px,linear-gradient(180deg,#0d0f1c,#2a1810)}
.pf-b-meadow{--pf-edge:#4f8a3e}.pf-b-meadow .pfBannerArt{background:radial-gradient(70% 40% at 20% 110%,#3f8f45,#0000 70%),radial-gradient(80% 45% at 85% 115%,#5aaa4f,#0000 70%),linear-gradient(180deg,#5fa6d6,#a8d8e8 55%,#2f6b35 56%,#1f4a26)}
.pf-b-meadow .pfWho{text-shadow:0 2px 8px #000}
.pf-b-ocean{--pf-edge:#2f7fb5}.pf-b-ocean .pfBannerArt{background:repeating-radial-gradient(ellipse at 50% 140%,#0000 0 18px,#7fd8ff33 19px 21px),linear-gradient(180deg,#0b2a4f,#14608f 60%,#1b8fb5)}
.pf-b-embers{--pf-edge:#c2412a}.pf-b-embers .pfBannerArt{background:radial-gradient(circle at 30% 40%,#ffb347 0 1.6px,#0000 2.4px) 0 0/48px 40px,radial-gradient(circle at 70% 70%,#ff6a2a 0 1.4px,#0000 2.2px) 10px 6px/36px 44px,radial-gradient(90% 60% at 50% 120%,#ff4d1f99,#0000 70%),linear-gradient(180deg,#1a0705,#4a120b)}
.pf-b-aurora{--pf-edge:#4fd1a5}.pf-b-aurora .pfBannerArt{background:linear-gradient(170deg,#0000 20%,#3cf0a855 35%,#0000 50%),linear-gradient(190deg,#0000 35%,#8a6bff55 50%,#0000 65%),radial-gradient(circle at 15% 20%,#fff 0 1px,#0000 1.5px) 0 0/40px 34px,linear-gradient(180deg,#06121f,#0f2a3a)}
.pf-b-treasure{--pf-edge:#e9b75a}.pf-b-treasure .pfBannerArt{background:radial-gradient(circle at 50% 50%,#ffe28a 0 5px,#c98a2c 6px 7px,#0000 8px) 0 0/58px 46px,radial-gradient(80% 90% at 50% 100%,#ffcf5c88,#0000 70%),linear-gradient(180deg,#2a1c08,#5a3d10)}
.pf-b-starfield{--pf-edge:#8d96c8}.pf-b-starfield .pfBannerArt{background:radial-gradient(circle at 10% 20%,#fff 0 1.2px,#0000 1.8px) 0 0/37px 31px,radial-gradient(circle at 60% 70%,#cfe0ff 0 1px,#0000 1.6px) 5px 9px/53px 41px,radial-gradient(circle at 40% 40%,#ffe9b0 0 1.6px,#0000 2.2px) 0 0/97px 83px,linear-gradient(180deg,#03050d,#101836)}
.pf-b-nebula{--pf-edge:#c86bd8}.pf-b-nebula .pfBannerArt{background:radial-gradient(50% 70% at 25% 40%,#ff6bc688,#0000 70%),radial-gradient(55% 80% at 75% 60%,#6b7dff88,#0000 70%),radial-gradient(circle at 50% 50%,#fff 0 1px,#0000 1.6px) 0 0/44px 38px,linear-gradient(180deg,#0b0518,#22103a)}
.pfSwatch{position:relative;display:block;width:100%;height:58px;border-radius:10px;overflow:hidden;isolation:isolate;border:1px solid #fff2}
/* Stats */
.pfStats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.pfStat{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:10px;align-items:center;padding:12px 14px;border-radius:12px;background:linear-gradient(180deg,#171e2b,#0f141d);border:1px solid #e9b75a33;min-width:0}
.pfStat>span{grid-row:1/3;font-size:24px}
.pfStat b{font-size:22px;color:#ffe2a0;line-height:1.1;overflow-wrap:anywhere}
.pfStat small{font-size:13px;color:#cbbfa8}
.pfRarest{grid-column:span 2;grid-template-rows:auto}
.pfRarest>div{display:flex;flex-direction:column;min-width:0}
.pfRarest b{font-size:18px}
.pfRarestArt{grid-row:auto!important;width:58px;height:58px;border-radius:10px;overflow:hidden;background:#0b0e16;display:block}
.pfRarestArt .mythlingArt{width:100%!important;height:100%!important;display:block}
/* Sections */
.pfSection{padding:18px 20px 20px;border-radius:16px;background:linear-gradient(180deg,#131a26ee,#0d1219ee);border:1px solid #e9b75a40;min-width:0}
.pfHead{display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px;margin-bottom:14px}
.pfHead h2{font-size:24px}
.pfHead p{margin:0;color:#cbbfa8;font-size:15px;flex:1 1 260px}
.pfBtns{display:flex;flex-wrap:wrap;gap:8px}
.pfBtn{min-height:44px;padding:8px 16px;border-radius:10px;border:1px solid #e9b75a88;background:#1d2534;color:#ffe6b0;font:700 15px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;cursor:pointer}
.pfBtn:hover{background:#273145}
.pfBtn.gold{background:linear-gradient(180deg,#ffd27a,#e9a23a 55%,#c27a1c);color:#2a1606;border-color:#ffe2a0}
.pfBtn.ghost{background:#111722}
.pfBtn:focus-visible,.pfOpt:focus-visible,.pfPick:focus-visible,.pfFriendBtn:focus-visible,.pfEmpty:focus-visible{outline:3px solid #ffd27a;outline-offset:2px}
.pfShow{display:flex;flex-wrap:wrap;justify-content:center;gap:16px}
.pfCard{width:206px;flex:none}
.pfCard .mythCard{width:206px!important;max-width:none!important;margin:0!important}
.pfEmpty{width:206px;min-height:290px;border-radius:14px;border:2px dashed #e9b75a66;background:#0b0f17aa;color:#d9c9a5;font:600 16px system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer}
.pfEmpty span{font-size:34px;color:#e9b75a}
.pfNote{color:#cbbfa8;margin:6px 0;text-align:center;width:100%}
.pfTabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.pfTab{min-height:44px;padding:8px 16px;border-radius:99px;border:1px solid #e9b75a66;background:#0f141d;color:#e9dcc0;font:700 15px system-ui,sans-serif;cursor:pointer}
.pfTab.on{background:#e9b75a;color:#24160a}
.pfGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.pfOpt{display:flex;flex-direction:column;align-items:stretch;gap:6px;padding:10px;border-radius:12px;border:2px solid #ffffff1a;background:#0f141d;color:#f1e6cf;text-align:center;cursor:pointer;min-height:44px;font-family:system-ui,sans-serif}
.pfOpt b{font-size:15px}
.pfOpt small{font-size:12.5px;color:#cbbfa8;line-height:1.3}
.pfOpt.on{border-color:#ffd27a;box-shadow:0 0 0 2px #ffd27a55}
.pfOpt.on small{color:#ffd98a;font-weight:700}
.pfOpt.locked{opacity:.75;cursor:help}
.pfOpt.locked .pfMini,.pfOpt.locked .pfSwatch{filter:grayscale(.85) brightness(.6)}
.pfBadgeOpt .pfBadgeSvg{margin:0 auto}
.pfBackStat{grid-template-columns:auto 1fr;grid-template-rows:auto}
.pfBackStat>div{display:flex;flex-direction:column;min-width:0}
.pfBackStat b{font-size:18px}
.pfBackMini{width:40px;grid-row:auto}
.pfBackGrid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr))}
.pfBackPrev{width:min(100%,104px);margin:0 auto}
.pfOpt.locked .pfBackPrev,.pfOpt.locked .cosRingSwatch{filter:grayscale(.85) brightness(.6)}
.pfSubHead{margin:6px 0 4px;font:700 18px var(--ui-display,Georgia,serif);color:#ffe6b0}
.pfCosNote{text-align:left;margin:0 0 10px}
.pfAvaGrid{margin-bottom:14px}
.pfAvaOpt small{overflow-wrap:anywhere}
.pfBadgeOpt.locked .pfBadgeSvg{opacity:.8}
.pfShare{margin:0 auto;padding:6px 14px;border-radius:99px;background:#0d121bcc;text-align:center;color:#e6dbc0;font-size:15px}
.pfLinks{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:0}
.pfAchLink{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 12px}
.pfAchLink small{color:#cbbfa8}
.pfFriendBtn{min-height:44px;padding:6px 14px;border-radius:10px;border:1px solid #e9b75a99;background:#1d2534;color:#ffe6b0;font:700 14px system-ui,sans-serif;cursor:pointer;white-space:nowrap}
.friendActions .pfFriendBtn{min-height:32px;padding:4px 14px;font-size:14px}
@media (pointer:coarse){.friendActions .pfFriendBtn{min-height:44px}}
.uiXFTRowWho .pfFriendBtn{min-height:40px;margin-top:4px;padding:4px 12px;align-self:flex-start;pointer-events:auto;position:relative;z-index:2}
/* Picker */
.pfPicker{position:fixed;inset:0;z-index:9000;background:#000b;display:flex;align-items:center;justify-content:center;padding:16px}
.pfPickBox{width:min(760px,100%);max-height:min(88dvh,900px);display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:16px;background:#121822;border:1px solid #e9b75a77;box-shadow:0 20px 50px #000c;color:#efe6d2}
.pfPickHead{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}
.pfPickHead h2{flex:1 1 220px;margin:0;font:700 20px var(--ui-display,Georgia,serif);color:#ffe6b0}
.pfPickCount{color:#ffd98a;font-weight:700}
.pfPickSearch{min-height:44px;padding:8px 12px;border-radius:10px;border:1px solid #e9b75a66;background:#0b0f17;color:#efe6d2;font-size:16px;width:100%}
.pfPickList{overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;padding:2px;min-height:0;overscroll-behavior:contain}
.pfPick{display:grid;grid-template-columns:56px 1fr 26px;align-items:center;gap:10px;min-height:64px;padding:6px 10px 6px 6px;border-radius:12px;border:2px solid #ffffff14;background:#0f141d;color:#efe6d2;text-align:left;cursor:pointer;font-family:system-ui,sans-serif}
.pfPick.on{border-color:#ffd27a;background:#2a2312}
.pfPickArt{width:56px;height:56px;border-radius:10px;overflow:hidden;background:#0a0d14;display:block}
.pfPickArt .mythlingArt{width:100%!important;height:100%!important;display:block}
.pfPickTxt{display:flex;flex-direction:column;min-width:0}
.pfPickTxt b{font-size:15px}
.pfPickTxt small{font-size:12.5px;color:#cbbfa8}
.pfPick.rar-4 .pfPickTxt b,.pfPick.rar-5 .pfPickTxt b,.pfPick.rar-6 .pfPickTxt b{color:#ffd98a}
.pfTick{width:26px;height:26px;border-radius:50%;border:2px solid #e9b75a88;display:grid;place-items:center;color:#24160a;font-weight:900}
.pfPick.on .pfTick{background:#ffd27a;border-color:#ffd27a}
.pfPickMore{align-self:center}
@media (max-width:760px){
 .pfBanner{grid-template-columns:auto 1fr;grid-template-areas:"ava who" "badges badges";padding:18px 16px;gap:10px 14px;min-height:0}
 .pfFrame{width:96px;height:96px;padding:6px}
 .pfCrown{width:48px;top:-16px}
 .pfSection{padding:14px 12px 16px}
 .pfHead h2{font-size:21px}
 .pfRarest{grid-column:1/-1}
}
@media (max-width:560px){
 .pfStats{grid-template-columns:1fr 1fr;gap:8px}
 .pfStat{padding:10px}
 .pfStat b{font-size:19px}
 .pfStat>span{font-size:20px}
 .pfShow{flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px 12px;margin:0 -4px;overscroll-behavior-x:contain}
 .pfCard,.pfEmpty{scroll-snap-align:center}
 .pfGrid{grid-template-columns:1fr 1fr}
 .pfBadge{width:56px}
 .pfBadgeSvg{width:40px;height:44px}
 .pfBtns{width:100%}
 .pfBtns .pfBtn{flex:1 1 auto}
 .pfPickList{grid-template-columns:1fr}
 .pfPicker{padding:8px}
}`;
  document.head.append(css);
}
