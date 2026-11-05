// EMBERLINGS lore: short, friendly stories for every Mythling species and a one-line note for each boss.
// Plain data only (no game rules). Species are listed in the game's order (No. 001 = kind 0).
// The island is the one the game already shows for each species in the Index (regions in game/index.html).
export const SPECIES_LORE = [
  { kind: 0, name: 'Flaminyx', island: 'Ember Meadows',
    summary: 'A bold flame fox who is always first to greet a new explorer.',
    lore: 'Flaminyx darts through the warm grass of Ember Meadows, leaving little sparks that fade before they can catch. It is bold, curious and always the first to greet a new explorer. Fun fact: the tip of its tail glows brighter whenever it is happy.' },
  { kind: 1, name: 'Lunamo', island: 'Ember Meadows',
    summary: 'A calm moon owl who keeps watch from the tallest trees.',
    lore: 'Lunamo keeps watch over Ember Meadows from the tallest trees and wakes up when the moon rises. It is calm and wise, and seems to know what you will do before you do it. Fun fact: its soft hoot can lull even a grumpy Mythling to sleep.' },
  { kind: 2, name: 'Verdelle', island: 'Crystalwood Forest',
    summary: 'A gentle leaf deer who makes flowers bloom where it steps.',
    lore: 'Verdelle wanders the quiet paths of Crystalwood Forest, and flowers bloom wherever it steps. It is gentle and kind, and always stops to help a tired friend. Fun fact: its antlers sprout fresh new leaves every spring.' },
  { kind: 3, name: 'Voltix', island: 'Crystalwood Forest',
    summary: 'An energetic storm dragon who loves to race the clouds.',
    lore: 'Voltix nests high above Crystalwood Forest and soaks up energy from the crystals during storms. It is full of zip and loves to race the clouds. Fun fact: you can hear a faint crackle in the air when Voltix is excited.' },
  { kind: 4, name: 'Aquabub', island: 'Frozen Peaks',
    summary: 'A steady bubble whale who looks after smaller Mythlings.',
    lore: 'Aquabub swims in the warm springs hidden between the Frozen Peaks, blowing bubbles that sparkle in the cold air. It is slow, steady and very protective of smaller Mythlings. Fun fact: its bubbles are strong enough to bounce a snowball right back.' },
  { kind: 5, name: 'Crystella', island: 'Frozen Peaks',
    summary: 'A graceful crystal unicorn who never backs down from a challenge.',
    lore: 'Crystella gallops along the icy ridges of the Frozen Peaks, its horn catching the sunlight like a prism. It is proud and graceful, and never backs down from a challenge. Fun fact: when it runs, it leaves tiny rainbows on the snow.' },
  { kind: 6, name: 'Frostbit', island: 'Thunder Valley',
    summary: 'A loyal frost wolf whose breath turns rain into snow.',
    lore: 'Frostbit roams the snowy pine woods above Thunder Valley, where its icy breath turns raindrops into snowflakes. It is loyal and brave, and always travels with its friends. Fun fact: one long howl from Frostbit can freeze a puddle solid.' },
  { kind: 7, name: 'Umbryx', island: 'Thunder Valley',
    summary: 'A sly, playful shadow cat who hides between the storm clouds.',
    lore: 'Umbryx slips across the rooftops of the old village in Thunder Valley, hiding in the shadows whenever the lightning flashes. It is sly and playful, and loves to sneak up on its friends. Fun fact: when it hides, only its bright eyes give it away.' },
  { kind: 8, name: 'Emberoo', island: 'Shadow Realm',
    summary: 'A cheerful cinder rabbit whose fiery tail lights the way.',
    lore: 'Emberoo hops through the autumn woods at the edge of the Shadow Realm, and its fiery tail lights the way for lost travellers. It is quick and cheerful, and never sits still for long. Fun fact: it can leap over three Mythlings in a single bound.' },
  { kind: 9, name: 'Zephyra', island: 'Shadow Realm',
    summary: 'A peaceful wind butterfly who guides others to safety.',
    lore: 'Zephyra lives in a hidden waterfall garden, one of the few bright places in the Shadow Realm. It is peaceful and kind, and likes to guide others to safety on gentle breezes. Fun fact: one flap of its wings can blow away a whole cloud of fog.' },
  { kind: 10, name: 'Mosshell', island: 'Ember Meadows',
    summary: 'A patient moss tortoise who is never in a hurry.',
    lore: 'Mosshell naps in the shady woods of Ember Meadows, its shell covered in soft moss, tiny flowers and even a little tree. It is patient and wise, and nothing ever seems to rush it. Fun fact: little birds and beetles sometimes make their homes on its back.' },
  { kind: 11, name: 'Tidelotl', island: 'Ember Meadows',
    summary: 'A friendly river axolotl whose splashes cheer everyone up.',
    lore: 'Tidelotl splashes about in the cool streams that wind through Ember Meadows. It is friendly and always smiling, and its gentle splashes help other Mythlings feel better. Fun fact: its feathery frills change colour with its mood.' },
  { kind: 12, name: 'Sparquill', island: 'Crystalwood Forest',
    summary: 'A shy lightning porcupine with buzzing, static-filled quills.',
    lore: 'Sparquill trundles through the stormy meadows of Crystalwood Forest, its quills buzzing with static. It is a little shy at first, but bursts with energy once it makes a friend. Fun fact: pat its quills the wrong way and you get a tiny, tickly zap!' },
  { kind: 13, name: 'Cindermane', island: 'Frozen Peaks',
    summary: 'A noble flame lion whose blazing mane keeps the cold away.',
    lore: 'Cindermane basks on the sunny rocks below the Frozen Peaks, and its blazing mane keeps climbers cosy on the way up. It is noble and fearless, and looks after every Mythling in its pride. Fun fact: the snow melts into little puddles wherever it lies down to rest.' },
  { kind: 14, name: 'Glacipaw', island: 'Thunder Valley',
    summary: 'A quiet, clever snow leopard that is very rarely seen.',
    lore: 'Glacipaw prowls the high, frosty ledges above Thunder Valley, moving so softly it barely leaves a pawprint. It is calm and clever, and very rarely seen. Fun fact: its fur sparkles like fresh snow whenever lightning lights up the sky.' },
  { kind: 15, name: 'Noctalon', island: 'Shadow Realm',
    summary: 'A mysterious shadow raven said to know a secret path through every island.',
    lore: 'Noctalon perches on the old ruins of the Shadow Realm, its starry feathers as dark as midnight. It is mysterious and clever, and collects shiny treasures it finds on its travels. Fun fact: old stories say it knows a secret path through every island.' }
];

// One line for each boss, keyed by quest level (same keys as the game's bosses list).
export const BOSS_LORE = {
  10: { name: 'Magmarok', island: 'Ember Meadows', lore: 'A rumbling rock giant with a glowing, molten heart who guards the far edge of Ember Meadows.' },
  25: { name: 'Thorn Guardian', island: 'Crystalwood Forest', lore: 'An ancient tree keeper of Crystalwood Forest, wrapped in thorny vines and very hard to sneak past.' },
  45: { name: 'Frostfang', island: 'Frozen Peaks', lore: 'The icy wolf ruler of the Frozen Peaks, whose mighty howl sends snow tumbling down the mountains.' },
  70: { name: 'Voltitan', island: 'Thunder Valley', lore: 'A towering storm dragon who gathers lightning over Thunder Valley and only respects the bravest teams.' },
  100: { name: 'Voidra', island: 'Shadow Realm', lore: 'The great watching eye of the Shadow Realm, and the final challenge for every Mythling explorer.' }
};

export const loreFor = kind => SPECIES_LORE.find(x => x.kind === kind) || null;
export const bossLoreFor = level => BOSS_LORE[level] || null;
