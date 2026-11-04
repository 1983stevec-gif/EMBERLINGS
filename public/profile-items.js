// Profile customisation catalogue: frames, backgrounds, card backs, avatar rings and badges. Shared by the game (what is unlocked)
// and the server (which ids a public profile may use). Every item is unlocked by an achievement the player
// has already earned; `need: null` means everyone has it from the start. Nothing here changes gameplay.
import { ACHIEVEMENTS } from './achievements.js';

export const SHOWCASE_MAX = 5;
export const BADGES_MAX = 6;

const f = (id, name, need) => ({ id, name, need });
export const FRAMES = [
  f('simple', 'Simple', null),
  f('ember', 'Ember', 'pack-1'),
  f('verdant', 'Verdant', 'quest-1'),
  f('tide', 'Tidal', 'species-8'),
  f('gilded', 'Gilded', 'cards-100'),
  f('starlit', 'Starlit', 'shiny-1'),
  f('alchemy', 'Alchemist', 'fusion-1'),
  f('royal', 'Royal', 'boss-1'),
  f('cosmic', 'Cosmic', 'cosmic-1'),
  f('voidbane', "Voidra's Bane", 'boss-all')
];
export const BACKGROUNDS = [
  f('dusk', 'Dusk', null),
  f('campfire', 'Campfire', 'friend-1'),
  f('meadow', 'Meadow', 'quest-25'),
  f('ocean', 'Ocean', 'album-1'),
  f('embers', 'Ember Storm', 'pack-25'),
  f('aurora', 'Aurora', 'shiny-10'),
  f('treasure', 'Treasure', 'coins-1m'),
  f('starfield', 'Starfield', 'legendary-1'),
  f('nebula', 'Nebula', 'album-all')
];
// Card backs: the picture on the back of every face-down card (card details flip side, 3D pack reveal, the
// cards still to reveal in a pack, your battle deck). Purely cosmetic. 'ember' is today's crest.
export const CARD_BACKS = [
  f('ember', 'Ember Crest', null),
  f('island', 'Island Map', 'quest-1'),
  f('tide', 'Tide', 'species-8'),
  f('grove', 'Grove', 'quest-25'),
  f('frost', 'Frost', 'shiny-1'),
  f('storm', 'Storm', 'friend-1'),
  f('arcane', 'Arcane Circle', 'fusion-1'),
  f('magma', 'Magma', 'boss-1'),
  f('starfield', 'Starfield', 'legendary-1'),
  f('gilded', 'Gilded', 'cards-100'),
  f('void', 'Void', 'boss-all')
];
// Avatar rings: the thin ring around your avatar in the header and on your profile picture. 'gold' is today's ring.
export const AVATAR_RINGS = [
  f('gold', 'Gold', null),
  f('ember', 'Ember Glow', 'pack-1'),
  f('leaf', 'Leafy', 'quest-1'),
  f('frost', 'Frost', 'shiny-1'),
  f('storm', 'Storm', 'duel-1'),
  f('prism', 'Prism', 'mutant-1'),
  f('void', 'Void', 'secret-1'),
  f('champion', 'Champion', 'duel-10')
];
// Badges are the achievements themselves: each earned achievement can be pinned to the profile.
export const BADGES = ACHIEVEMENTS.map(a => ({ id: a.id, name: a.name, icon: a.icon, need: a.id }));

export const FRAME_IDS = FRAMES.map(x => x.id);
export const BACKGROUND_IDS = BACKGROUNDS.map(x => x.id);
export const CARD_BACK_IDS = CARD_BACKS.map(x => x.id);
export const AVATAR_RING_IDS = AVATAR_RINGS.map(x => x.id);
export const BADGE_IDS = BADGES.map(x => x.id);
export const achievementFor = id => ACHIEVEMENTS.find(a => a.id === id) || null;
