// Achievements, titles and collection-album rules. Shared by the game (progress) and the server (title validation).
// Progress is computed from the save itself, so earlier progress counts retroactively.

const owned = st => Array.isArray(st?.owned) ? st.owned : [];
const ext = st => st?.ember || {};
const count = (st, test) => owned(st).filter(test).length;
const cleared = st => Array.isArray(st?.cleared) ? st.cleared : [];
const BOSS_LEVELS = [10, 25, 45, 70, 100];
export const SPECIES_COUNT = 16;

// Collection album: three stamps per species, each claimed once.
export const ALBUM_STAMPS = [
  { id: 'base', name: 'Collected', icon: '◆', reward: 1000, test: c => true },
  { id: 'shiny', name: 'Shiny', icon: '✨', reward: 5000, test: c => !!c.shiny },
  { id: 'mutated', name: 'Mutated', icon: '✦', reward: 10000, test: c => !!c.mutation }
];
export const ALBUM_PAGE_BONUS = 25000;
export const ALBUM_MASTER_BONUS = 250000;

export function albumStatus(st, kind) {
  const copies = owned(st).filter(c => c && c.kind === kind);
  const claimed = ext(st).album?.[kind] || [];
  return ALBUM_STAMPS.map(s => ({ ...s, earned: copies.some(s.test), claimed: claimed.includes(s.id) }));
}
export function albumPageComplete(st, kind) {
  return ALBUM_STAMPS.every(s => (ext(st).album?.[kind] || []).includes(s.id));
}
export function albumPagesComplete(st) {
  let n = 0;
  for (let k = 0; k < SPECIES_COUNT; k++) if (albumPageComplete(st, k)) n++;
  return n;
}

const a = (id, icon, name, desc, title, goal, value) => ({ id, icon, name, desc, title, goal, value });
export const ACHIEVEMENTS = [
  a('pack-1', '🎁', 'First Pack', 'Open your first pack.', 'Pack Opener', 1, st => st.packCount || 0),
  a('pack-25', '🎁', 'Pack Hoarder', 'Open 25 packs.', 'Pack Hoarder', 25, st => st.packCount || 0),
  a('pack-100', '🎁', 'Pack Legend', 'Open 100 packs.', 'Pack Legend', 100, st => st.packCount || 0),
  a('quest-1', '🗺️', 'First Quest', 'Win your first quest.', 'Rookie Tamer', 1, st => cleared(st).length),
  a('quest-25', '🗺️', 'Island Hopper', 'Complete 25 quests.', 'Island Hopper', 25, st => cleared(st).length),
  a('quest-100', '🗺️', 'World Conqueror', 'Complete all 100 quests.', 'World Conqueror', 100, st => cleared(st).length),
  a('boss-1', '👑', 'Magma Breaker', 'Defeat Magmarok, the level 10 boss.', 'Magma Breaker', 1, st => cleared(st).includes(10) ? 1 : 0),
  a('boss-all', '👑', "Voidra's Bane", 'Defeat all five island bosses.', "Voidra's Bane", 5, st => BOSS_LEVELS.filter(l => cleared(st).includes(l)).length),
  a('species-8', '🔎', 'Explorer', 'Discover 8 Mythling species.', 'Explorer', 8, st => (st.discovered || []).length),
  a('species-all', '🔎', 'Mythling Scholar', 'Discover every Mythling species.', 'Mythling Scholar', SPECIES_COUNT, st => (st.discovered || []).length),
  a('cards-100', '📚', 'Collector', 'Own 100 Mythling cards.', 'Collector', 100, st => owned(st).length),
  a('cards-500', '📚', 'Grand Collector', 'Own 500 Mythling cards.', 'Grand Collector', 500, st => owned(st).length),
  a('shiny-1', '✨', 'Shiny Seeker', 'Own a Shiny Mythling.', 'Shiny Seeker', 1, st => count(st, c => c.shiny)),
  a('shiny-10', '✨', 'Starlit', 'Own 10 Shiny Mythlings.', 'Starlit', 10, st => count(st, c => c.shiny)),
  a('secret-1', '🌌', 'Secret Keeper', 'Own a Secret Mythling.', 'Secret Keeper', 1, st => count(st, c => c.secret)),
  a('legendary-1', '💎', 'Legend Finder', 'Own a Legendary or rarer Mythling.', 'Legend Finder', 1, st => count(st, c => c.secret || ['legendary', 'celestial', 'secret'].includes(String(c.rarity || '').toLowerCase()))),
  a('mutant-1', '🧪', 'Mutant Maker', 'Give a Mythling a mutation.', 'Mutant Maker', 1, st => count(st, c => c.mutation)),
  a('cosmic-1', '🌠', 'Cosmic', 'Own a Cosmic mutated Mythling.', 'Cosmic', 1, st => count(st, c => c.mutation === 'cosmic')),
  a('fusion-1', '🔮', 'Alchemist', 'Fuse two Mythlings.', 'Alchemist', 1, st => Math.max(ext(st).fusions || 0, count(st, c => c.fused) ? 1 : 0)),
  a('fusion-10', '🔮', 'Grand Alchemist', 'Fuse Mythlings 10 times.', 'Grand Alchemist', 10, st => ext(st).fusions || 0),
  a('vault-5', '🏦', 'Vault Tycoon', 'Unlock all five Vault slots.', 'Vault Tycoon', 5, st => st.vault?.unlocked || 1),
  a('coins-1m', '🪙', 'Millionaire', 'Hold 1,000,000 coins at once.', 'Millionaire', 1e6, st => Math.max(st.coins || 0, ext(st).peakCoins || 0)),
  a('coins-100m', '🪙', 'Coin Dragon', 'Hold 100,000,000 coins at once.', 'Coin Dragon', 1e8, st => Math.max(st.coins || 0, ext(st).peakCoins || 0)),
  a('album-1', '📖', 'Page Turner', 'Complete one Collection Album page.', 'Page Turner', 1, st => albumPagesComplete(st)),
  a('album-all', '📖', 'Album Master', 'Complete every Collection Album page.', 'Album Master', SPECIES_COUNT, st => albumPagesComplete(st)),
  a('friend-1', '👥', 'Good Friend', 'Make a friend online.', 'Good Friend', 1, st => ext(st).friends || 0),
  a('duel-1', '⚔️', 'Duelist', 'Win a battle against a friend.', 'Duelist', 1, st => ext(st).onlineWins || 0),
  a('duel-10', '⚔️', 'Champion Duelist', 'Win 10 battles against friends.', 'Champion Duelist', 10, st => ext(st).onlineWins || 0)
];

export const TITLES = ACHIEVEMENTS.map(x => x.title);
