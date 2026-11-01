// EMBERLINGS battle results: a clear "Victory!" listing everything won, and a clear "Defeated!" with tips.
const B = window.EmberBridge;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

// The game's reasons, in plain words for new players.
function why(t = '') {
  if (/conced/i.test(t)) return 'You left the battle, so your opponent wins.';
  if (/no Mythlings|in play/i.test(t)) return 'You ran out of Mythlings in play, so your opponent wins.';
  if (/point/i.test(t)) return 'Your opponent knocked out enough of your Mythlings to score 3 points.';
  if (/time|clock/i.test(t)) return 'Your battle clock ran out.';
  return t || 'Your opponent won this battle.';
}
const recentUps = [];
addEventListener('ember:levelUp', e => recentUps.push({ at: Date.now(), id: e.detail.creature?.id, to: e.detail.to }));
const PACK_NAMES = { pack: 'Wonder Pack', star: 'Star Pack', crystal: 'Crystal Pack', mythic: 'Mythic Pack', legend: 'Legend Pack', celestial: 'Celestial Pack', hacker: 'Hacker Pack' };
function victory(r) {
  const hero = $('#app .victoryCard'); if (!hero) return;
  const q = r.level, w = r.rewards || {}, UI = window.EmberUI, boss = q && !!B.bosses[q];
  const ups = new Map(recentUps.filter(u => Date.now() - u.at < 8000).map(u => [u.id, u.to]));
  const seen = new Set(), team = (B.deck() || []).filter(c => c.cardType !== 'trainer' && c.kind !== undefined).map(c => (B.state.owned || []).find(o => o.id === (c.sourceId || c.ownedId || c.id)) || c).filter(c => !seen.has(c.id) && seen.add(c.id)).slice(0, 5);
  const each = w.xp ? Math.ceil(w.xp / 5) : 0;
  const tiles = [
    w.coins ? `<li class="coin"><span class="uiVIco">🪙</span><b>+${Number(w.coins).toLocaleString()}</b><small>coins · you now have ${Math.floor(B.state.coins).toLocaleString()}</small></li>` : '',
    each ? `<li class="xp"><span class="uiVIco">✦</span><b>+${each} EXP</b><small>for each card that battled</small></li>` : '',
    w.pack ? `<li class="pack"><span class="uiVIco">🎁</span><b>${esc(PACK_NAMES[w.pack] || 'Quest Pack')}</b><small>free pack · open it on the Packs screen</small></li>` : '',
    w.item ? `<li class="pass"><span class="uiVIco">🎟</span><b>Academy Pass</b><small>one extra rewarded training session</small></li>` : '',
    w.collectible ? `<li class="trophy"><span class="uiVIco">🏆</span><b>${esc(w.collectible)}</b><small>collectible trophy</small></li>` : '',
    w.island ? `<li class="island"><span class="uiVIco">🗺</span><b>New island unlocked!</b><small>${esc(w.island)}</small></li>` : ''].join('');
  hero.className = 'hero center uiVictory';
  hero.innerHTML = `<div class="uiVRays" aria-hidden="true"></div><p class="uiDefKick">${q ? `Quest ${q}${boss ? ' · Boss defeated' : ''}` : 'Friendly battle'}</p>
   <h1 class="uiVTitle">Victory!</h1>${q && UI?.questName ? `<p class="uiVQuest">${esc(UI.questName(q))} complete</p>` : ''}
   ${tiles ? `<h2 class="uiVHead">You won</h2><ul class="uiVLoot">${tiles}</ul>` : '<p class="uiVQuest">Well played!</p>'}
   ${each && team.length ? `<h2 class="uiVHead">Your Mythlings</h2><ul class="uiVTeam">${team.map(c => `<li class="${ups.has(c.id) ? 'up' : ''}"><span class="uiVPic">${B.art(c)}</span><b>${esc(B.species[c.kind]?.name || '')}</b><small>${ups.has(c.id) ? `Level up! Lv ${ups.get(c.id)}` : `Lv ${c.level || 1} · +${each} EXP`}</small></li>`).join('')}</ul>` : ''}
   <div class="uiDefActions">${q && q < 100 && !r.online ? `<button class="button gold" data-res="${q + 1}">Next quest ›</button>` : ''}${w.pack ? '<button class="button gold" data-go="packs">Open my pack</button>' : ''}${q && !r.online ? `<button class="button" data-res="${q}">↺ Replay</button>` : ''}<button class="button" data-go="${r.online ? 'friends' : 'map'}">${r.online ? 'Friends' : 'World Map'}</button></div>`;
  hero.querySelectorAll('[data-res]').forEach(b => b.onclick = () => B.beginBattle(+b.dataset.res));
  B.bind();
}
function render(r) {
  if (B.view !== 'cardResult') return;
  if (r.victory) return victory(r);
  if (r.draw) return;
  const hero = $('#app .victoryCard'); if (!hero) return;
  const quest = r.level, boss = quest && !!B.bosses[quest];
  const foeLv = quest ? Math.max(1, Math.floor(quest / (boss ? 4 : 7)) + 1) : null;
  const deck = (B.deck() || []).filter(c => c.cardType !== 'trainer' && c.kind !== undefined);
  const avg = deck.length ? Math.round(deck.reduce((a, c) => a + (c.level || 1), 0) / deck.length) : 1;
  const behind = foeLv && avg < foeLv;
  const tips = [];
  tips.push({ icon: '⬆', title: 'Level up your cards', text: behind ? `Your deck's Mythlings average <b>Lv ${avg}</b>. This quest's Mythlings are <b>Lv ${foeLv}</b>. Higher levels mean more HP and stronger attacks, and new moves at Lv 25, 50, 75 and 100.` : `Every level adds HP and attack power, and new moves unlock at Lv 25, 50, 75 and 100. Earn EXP by winning quests and at the Training Field.`, btn: ['training', 'Train my cards'] });
  if (quest > 1) tips.push({ icon: '↺', title: 'Replay an easier quest', text: `Win quest ${quest - 1} again to earn coins and EXP, then come back stronger.`, btn: ['replay:' + (quest - 1), `Play quest ${quest - 1}`] });
  tips.push({ icon: '🂠', title: 'Use your strongest deck', text: 'Open Battle Deck and tap <b>Equip Best</b> to pick your highest-level, strongest cards automatically.', btn: ['decks', 'Battle Deck'] });
  tips.push({ icon: '💧', title: 'Attach Merfling every turn', text: 'Your second attack is stronger but needs 2 Merfling. Attach one each turn to your Active Mythling before you attack.' });
  tips.push({ icon: '🎁', title: 'Get stronger cards', text: `Spend coins on packs. Better packs give higher-level, rarer Mythlings. You have <b>${Math.floor(B.state.coins || 0).toLocaleString()}</b> coins.`, btn: ['packs', 'Open packs'] });
  hero.className = 'hero center uiDefeat';
  hero.innerHTML = `<p class="uiDefKick">${quest ? `Quest ${quest}${boss ? ' · Boss' : ''}` : 'Friendly battle'}</p>
   <h1 class="uiDefTitle">Defeated!</h1>
   <p class="uiDefWhy">${esc(why(r.reason))}</p>
   <p class="uiDefSafe">Don't worry: you keep all your cards. Nothing is lost when you lose.</p>
   <div class="uiDefActions">${quest ? `<button class="button gold" data-def="replay:${quest}">↺ Try again</button>` : ''}<button class="button" data-go="${r.online ? 'friends' : 'map'}">${r.online ? 'Friends' : 'World Map'}</button></div>
   ${r.online ? '' : `<h2 class="uiDefTipsHead">How to win next time</h2>
   <ol class="uiDefTips">${tips.slice(0, 4).map(t => `<li><span class="uiDefIco" aria-hidden="true">${t.icon}</span><div><b>${t.title}</b><p>${t.text}</p></div>${t.btn ? `<button class="button alt" ${t.btn[0].startsWith('replay:') ? `data-def="${t.btn[0]}"` : `data-go="${t.btn[0]}"`}>${esc(t.btn[1])}</button>` : ''}</li>`).join('')}</ol>`}`;
  hero.querySelectorAll('[data-def]').forEach(b => b.onclick = () => B.beginBattle(+b.dataset.def.split(':')[1]));
  B.bind();
}
if (B) addEventListener('ember:cardResult', e => { const r = e.detail; requestAnimationFrame(() => requestAnimationFrame(() => render(r))); });
