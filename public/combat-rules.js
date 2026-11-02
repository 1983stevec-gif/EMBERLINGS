export const BOSS_CARDS=Object.freeze([
 {name:'Magmarok',kind:16,emoji:'🌋',element:'Fire',animal:'Volcanic Bear',power:45,rarity:'Legendary',island:0,boss:true,artCol:0,artRow:0},
 {name:'Thorn Guardian',kind:17,emoji:'🌳',element:'Nature',animal:'Ancient Stag',power:45,rarity:'Legendary',island:1,boss:true,artCol:1,artRow:0},
 {name:'Frostfang',kind:18,emoji:'🐺',element:'Ice',animal:'Ice Wolf',power:45,rarity:'Legendary',island:2,boss:true,artCol:2,artRow:0},
 {name:'Voltitan',kind:19,emoji:'🐉',element:'Lightning',animal:'Thunder Dragon',power:45,rarity:'Legendary',island:3,boss:true,artCol:0,artRow:1},
 {name:'Voidra',kind:20,emoji:'🌑',element:'Shadow',animal:'Void Wyvern',power:45,rarity:'Legendary',island:4,boss:true,artCol:1,artRow:1}
].map((c,i)=>Object.freeze({...c,baseKind:[13,2,6,3,7][i],atlas:'bosses-atlas',artCols:3,artRows:2})));
export const HORIZONS_CARDS=Object.freeze([
 {"name":"Pyrelisk","kind":21,"element":"Fire","animal":"Ember Salamander","baseKind":0,"basic":"Ember Flick","skill":"Molten Dash","ultimate":"Volcanic Wake","power":19,"rarity":"Common","island":0,"emoji":"🔥","expansion":true,"atlas":"wild-horizons-atlas","artCol":0,"artRow":0,"artCols":5,"artRows":5},
 {"name":"Lunamoth","kind":22,"element":"Moon","animal":"Lunar Moth","baseKind":1,"basic":"Moon Dust","skill":"Crescent Veil","ultimate":"Moonlit Dream","power":20,"rarity":"Uncommon","island":0,"emoji":"🌙","expansion":true,"atlas":"wild-horizons-atlas","artCol":1,"artRow":0,"artCols":5,"artRows":5},
 {"name":"Fernox","kind":23,"element":"Nature","animal":"Meadow Bison","baseKind":10,"basic":"Moss Charge","skill":"Meadow Bastion","ultimate":"Verdant Stampede","power":21,"rarity":"Rare","island":0,"emoji":"🌿","expansion":true,"atlas":"wild-horizons-atlas","artCol":2,"artRow":0,"artCols":5,"artRows":5},
 {"name":"Stormfin","kind":24,"element":"Lightning","animal":"Storm Manta","baseKind":3,"basic":"Static Glide","skill":"Thunder Current","ultimate":"Tempest Dive","power":22,"rarity":"Mythic","island":0,"emoji":"⚡","expansion":true,"atlas":"wild-horizons-atlas","artCol":3,"artRow":0,"artCols":5,"artRows":5},
 {"name":"Corallume","kind":25,"element":"Water","animal":"Coral Seahorse","baseKind":11,"basic":"Coral Tap","skill":"Reef Remedy","ultimate":"Coral Bloom","power":23,"rarity":"Legendary","island":0,"emoji":"💧","expansion":true,"atlas":"wild-horizons-atlas","artCol":4,"artRow":0,"artCols":5,"artRows":5},
 {"name":"Prismole","kind":26,"element":"Crystal","animal":"Crystal Mole","baseKind":5,"basic":"Shard Dig","skill":"Geode Break","ultimate":"Prism Burrow","power":19,"rarity":"Common","island":1,"emoji":"💎","expansion":true,"atlas":"wild-horizons-atlas","artCol":0,"artRow":1,"artCols":5,"artRows":5},
 {"name":"Snowcap","kind":27,"element":"Ice","animal":"Alpine Goat","baseKind":6,"basic":"Ice Horn","skill":"Summit Frost","ultimate":"Avalanche Rush","power":20,"rarity":"Uncommon","island":1,"emoji":"❄️","expansion":true,"atlas":"wild-horizons-atlas","artCol":1,"artRow":1,"artCols":5,"artRows":5},
 {"name":"Gloamwing","kind":28,"element":"Shadow","animal":"Star Bat","baseKind":7,"basic":"Dusk Bite","skill":"Night Veil","ultimate":"Midnight Flight","power":21,"rarity":"Rare","island":1,"emoji":"🌑","expansion":true,"atlas":"wild-horizons-atlas","artCol":2,"artRow":1,"artCols":5,"artRows":5},
 {"name":"Cindrake","kind":29,"element":"Fire","animal":"Ember Rooster","baseKind":13,"basic":"Cinder Peck","skill":"Dawn Inferno","ultimate":"Sunrise Crown","power":22,"rarity":"Mythic","island":1,"emoji":"🔥","expansion":true,"atlas":"wild-horizons-atlas","artCol":3,"artRow":1,"artCols":5,"artRows":5},
 {"name":"Whisprill","kind":30,"element":"Wind","animal":"Gale Hummingbird","baseKind":9,"basic":"Breeze Needle","skill":"Whisper Gust","ultimate":"Whirlwind Dance","power":23,"rarity":"Legendary","island":1,"emoji":"🌪️","expansion":true,"atlas":"wild-horizons-atlas","artCol":4,"artRow":1,"artCols":5,"artRows":5},
 {"name":"Brambleboar","kind":31,"element":"Nature","animal":"Bramble Boar","baseKind":10,"basic":"Briar Tusk","skill":"Root Bastion","ultimate":"Wildwood Rush","power":19,"rarity":"Common","island":2,"emoji":"🌿","expansion":true,"atlas":"wild-horizons-atlas","artCol":0,"artRow":2,"artCols":5,"artRows":5},
 {"name":"Dewdrop","kind":32,"element":"Water","animal":"River Otter","baseKind":11,"basic":"Ripple Paw","skill":"Stream Remedy","ultimate":"River Festival","power":20,"rarity":"Uncommon","island":2,"emoji":"💧","expansion":true,"atlas":"wild-horizons-atlas","artCol":1,"artRow":2,"artCols":5,"artRows":5},
 {"name":"Sparkit","kind":33,"element":"Lightning","animal":"Spark Red Panda","baseKind":12,"basic":"Static Paw","skill":"Ringtail Barrage","ultimate":"Sparkfall","power":21,"rarity":"Rare","island":2,"emoji":"⚡","expansion":true,"atlas":"wild-horizons-atlas","artCol":2,"artRow":2,"artCols":5,"artRows":5},
 {"name":"Sunspine","kind":34,"element":"Fire","animal":"Sun Pangolin","baseKind":13,"basic":"Heated Scale","skill":"Solar Roll","ultimate":"Sunlit Armor","power":22,"rarity":"Mythic","island":2,"emoji":"🔥","expansion":true,"atlas":"wild-horizons-atlas","artCol":3,"artRow":2,"artCols":5,"artRows":5},
 {"name":"Frosthorn","kind":35,"element":"Ice","animal":"Ice Narwhal","baseKind":6,"basic":"Frost Lance","skill":"Polar Current","ultimate":"Glacial Depths","power":23,"rarity":"Legendary","island":2,"emoji":"❄️","expansion":true,"atlas":"wild-horizons-atlas","artCol":4,"artRow":2,"artCols":5,"artRows":5},
 {"name":"Starlume","kind":36,"element":"Moon","animal":"Moon Lynx","baseKind":1,"basic":"Star Pounce","skill":"Lunar Hush","ultimate":"Aurora Hunt","power":19,"rarity":"Common","island":3,"emoji":"🌙","expansion":true,"atlas":"wild-horizons-atlas","artCol":0,"artRow":3,"artCols":5,"artRows":5},
 {"name":"Rootlyn","kind":37,"element":"Nature","animal":"Grove Badger","baseKind":10,"basic":"Root Claw","skill":"Moss Shelter","ultimate":"Grove Guardian","power":20,"rarity":"Uncommon","island":3,"emoji":"🌿","expansion":true,"atlas":"wild-horizons-atlas","artCol":1,"artRow":3,"artCols":5,"artRows":5},
 {"name":"Glasswing","kind":38,"element":"Crystal","animal":"Crystal Dragonfly","baseKind":5,"basic":"Facet Wing","skill":"Prism Pierce","ultimate":"Diamond Flight","power":21,"rarity":"Rare","island":3,"emoji":"💎","expansion":true,"atlas":"wild-horizons-atlas","artCol":2,"artRow":3,"artCols":5,"artRows":5},
 {"name":"Duskcoil","kind":39,"element":"Shadow","animal":"Crescent Cobra","baseKind":7,"basic":"Umbral Fang","skill":"Eclipse Venom","ultimate":"Twilight Coil","power":22,"rarity":"Mythic","island":3,"emoji":"🌑","expansion":true,"atlas":"wild-horizons-atlas","artCol":3,"artRow":3,"artCols":5,"artRows":5},
 {"name":"Galecrest","kind":40,"element":"Wind","animal":"Cloud Crane","baseKind":9,"basic":"Gale Spear","skill":"Mist Step","ultimate":"Skyward Dance","power":23,"rarity":"Legendary","island":3,"emoji":"🌪️","expansion":true,"atlas":"wild-horizons-atlas","artCol":4,"artRow":3,"artCols":5,"artRows":5},
 {"name":"Lavax","kind":41,"element":"Fire","animal":"Basalt Tortoise","baseKind":13,"basic":"Basalt Bash","skill":"Lava Shell","ultimate":"Caldera Shield","power":19,"rarity":"Common","island":4,"emoji":"🔥","expansion":true,"atlas":"wild-horizons-atlas","artCol":0,"artRow":4,"artCols":5,"artRows":5},
 {"name":"Tideclaw","kind":42,"element":"Water","animal":"Coral Crab","baseKind":4,"basic":"Coral Clamp","skill":"Tidal Guard","ultimate":"Reef Fortress","power":20,"rarity":"Uncommon","island":4,"emoji":"💧","expansion":true,"atlas":"wild-horizons-atlas","artCol":1,"artRow":4,"artCols":5,"artRows":5},
 {"name":"Thunderhoof","kind":43,"element":"Lightning","animal":"Thunder Ram","baseKind":3,"basic":"Volt Horn","skill":"Storm Charge","ultimate":"Thunder Stampede","power":21,"rarity":"Rare","island":4,"emoji":"⚡","expansion":true,"atlas":"wild-horizons-atlas","artCol":2,"artRow":4,"artCols":5,"artRows":5},
 {"name":"Bloomtail","kind":44,"element":"Nature","animal":"Garden Peacock","baseKind":2,"basic":"Petal Fan","skill":"Blossom Bloom","ultimate":"Garden Crown","power":22,"rarity":"Mythic","island":4,"emoji":"🌿","expansion":true,"atlas":"wild-horizons-atlas","artCol":3,"artRow":4,"artCols":5,"artRows":5},
 {"name":"Umbrafang","kind":45,"element":"Shadow","animal":"Star Panther","baseKind":7,"basic":"Night Claw","skill":"Starlit Venom","ultimate":"Shadow Hunt","power":23,"rarity":"Legendary","island":4,"emoji":"🌑","expansion":true,"atlas":"wild-horizons-atlas","artCol":4,"artRow":4,"artCols":5,"artRows":5}
].map(Object.freeze));
export const EXTRA_SPECIES=Object.freeze([...BOSS_CARDS,...HORIZONS_CARDS]);
export const CREATURE_COUNT=16+EXTRA_SPECIES.length;
export const combatKind=kind=>EXTRA_SPECIES[kind-16]?.baseKind??kind;
export const RARITIES=['Common','Uncommon','Rare','Mythic','Legendary','Celestial','Secret'];
export const RARITY_DAMAGE=[0,10,24,42,64,92,130];
export const VAULT_RATES=[5,12,25,50,100,200,400];
export function rarityRank(c){if(c?.secret===true)return 6;const i=RARITIES.findIndex(r=>r.toLowerCase()===String(c?.rarity||'').toLowerCase());return Math.max(0,i)}
export function rarityLabel(c){return RARITIES[rarityRank(c)]}
export function rarityPowerBonus(c){return RARITY_DAMAGE[rarityRank(c)]+(c?.shiny?4:0)}
export const MOVE_PROFILES=[
 {basic:'Flame Claw',skill:'Ember Pounce',ultimate:'Phoenix Burst',mode:'lunge',power:1.65,range:145,cool:1.1,color:'#ff974b'},
 {basic:'Moon Talon',skill:'Lunar Volley',ultimate:'Moonfall',mode:'fan',power:.68,count:3,spread:.22,speed:400,radius:8,cool:1.45,color:'#cab0ff'},
 {basic:'Vine Lash',skill:'Briar Bloom',ultimate:'Verdant Crown',mode:'bloom',power:1.45,range:190,cool:1.8,color:'#7ef09b'},
 {basic:'Spark Bite',skill:'Chain Spark',ultimate:'Thunderstorm',mode:'chain',power:1.75,range:300,cool:1.4,color:'#ffe978'},
 {basic:'Fin Slap',skill:'Tidal Wave',ultimate:'Ocean Surge',mode:'wave',power:1.8,count:1,spread:0,speed:320,radius:22,cool:1.3,color:'#71dfff'},
 {basic:'Crystal Hoof',skill:'Crystal Lance',ultimate:'Prism Nova',mode:'pierce',power:2,count:1,spread:0,speed:650,radius:8,cool:1.4,color:'#f4b2ff'},
 {basic:'Ice Fang',skill:'Twin Frost',ultimate:'Glacial Roar',mode:'twin',power:.95,count:2,spread:.08,speed:460,radius:9,cool:1.25,color:'#c3f5ff'},
 {basic:'Shadow Claw',skill:'Shadow Siphon',ultimate:'Midnight Eclipse',mode:'siphon',power:1.7,range:230,cool:1.4,color:'#c392ff'},
 {basic:'Cinder Kick',skill:'Ricochet Ember',ultimate:'Blazing Comet',mode:'bounce',power:1.6,count:1,spread:0,speed:510,radius:10,cool:1.1,color:'#ffbc79'},
 {basic:'Wing Slice',skill:'Spiral Gust',ultimate:'Sky Tempest',mode:'gust',power:1.6,range:195,cool:1.35,color:'#9dffe0'},
 {basic:'Pebble Bash',skill:'Rooted Bastion',ultimate:'Ancient Grove',mode:'bloom',power:1.4,range:180,cool:1.8,color:'#8bbd69'},
 {basic:'Bubble Bounce',skill:'River Remedy',ultimate:'Healing Tide',mode:'wave',power:1.5,count:1,speed:330,radius:18,cool:1.4,color:'#75cddd'},
 {basic:'Needle Spark',skill:'Static Barrage',ultimate:'Quillstorm',mode:'fan',power:.65,count:3,spread:.2,speed:430,radius:7,cool:1.4,color:'#efce67'},
 {basic:'Blazing Paw',skill:'Royal Inferno',ultimate:'Solar Roar',mode:'lunge',power:1.7,range:150,cool:1.25,color:'#f4a052'},
 {basic:'Snow Pounce',skill:'Glacier Ambush',ultimate:'Winter Hunt',mode:'twin',power:.95,count:2,spread:.08,speed:470,radius:9,cool:1.3,color:'#b1e7f1'},
 {basic:'Dusk Peck',skill:'Nightfall Siphon',ultimate:'Raven Eclipse',mode:'siphon',power:1.7,range:230,cool:1.4,color:'#ae8adb'}
];
MOVE_PROFILES.push(
 {...MOVE_PROFILES[13],basic:'Obsidian Claw',skill:'Volcanic Slam',ultimate:'Caldera Roar'},
 {...MOVE_PROFILES[2],basic:'Bark Antler',skill:'Thornquake',ultimate:'Ancient Canopy'},
 {...MOVE_PROFILES[6],basic:'Glacier Bite',skill:'Glacial Fang',ultimate:'Whiteout Roar'},
 {...MOVE_PROFILES[3],basic:'Thunder Talon',skill:'Stormbreaker',ultimate:'Tempest Crown'},
 {...MOVE_PROFILES[7],basic:'Umbral Claw',skill:'Void Collapse',ultimate:'Endless Eclipse'}
);
for(const c of HORIZONS_CARDS)MOVE_PROFILES.push({...MOVE_PROFILES[c.baseKind],basic:c.basic,skill:c.skill,ultimate:c.ultimate});
export function moveProfile(kind){return MOVE_PROFILES[kind]||MOVE_PROFILES[0]}
export function skillShots(p,kind,base,dx,dy){const m=moveProfile(kind);if(!m.count)return [];const angle=Math.atan2(dy,dx);return Array.from({length:m.count},(_,i)=>{const a=angle+(i-(m.count-1)/2)*m.spread;return {x:p.x+dx*22,y:p.y+dy*22,vx:Math.cos(a)*m.speed,vy:Math.sin(a)*m.speed,r:m.radius,life:1.8,damage:Math.round(base*m.power),color:m.color,pierce:m.mode==='pierce'?2:0,bounces:m.mode==='bounce'?1:0,hitIds:[]}})}

export const MUTATIONS=[
 {id:'bloom',name:'Bloom',damage:.05,coins:.5,cost:1000,color:'#9be38a',icon:'❀',packOnly:true},
 {id:'spark',name:'Spark',damage:.10,coins:1,cost:2500,color:'#ffe47e',icon:'✧'},
 {id:'tide',name:'Tide',damage:.15,coins:2,cost:5000,color:'#6fc7ff',icon:'≈',packOnly:true},
 {id:'flame',name:'Flame',damage:.20,coins:4,cost:10000,color:'#ff9a63',icon:'🔥'},
 {id:'frost',name:'Frost',damage:.25,coins:9,cost:25000,color:'#9cecff',icon:'❄'},
 {id:'crystal',name:'Crystal',damage:.30,coins:15,cost:45000,color:'#b9f5e6',icon:'◆',packOnly:true},
 {id:'storm',name:'Storm',damage:.35,coins:24,cost:75000,color:'#b3a2ff',icon:'ϟ'},
 {id:'solar',name:'Solar',damage:.42,coins:45,cost:120000,color:'#ffd34d',icon:'☀',packOnly:true},
 {id:'shadow',name:'Shadow',damage:.50,coins:99,cost:200000,color:'#e3a1fb',icon:'☾'},
 {id:'void',name:'Void',damage:.60,coins:99,cost:300000,color:'#8f84ff',icon:'◉',packOnly:true},
 {id:'cosmic',name:'Cosmic',damage:.75,coins:99,cost:500000,color:'#ffadd8',icon:'✦'},
 {id:'prism',name:'Prism',damage:.90,coins:99,cost:1000000,color:'#b6ffea',icon:'✺',packOnly:true}
];
// packOnly mutations cannot be bought in the Mutation Vault; they only come from packs.
export const canBuyMutation=m=>!!m&&!m.packOnly;
// Packs can roll a mutation. Better packs roll more often and can reach stronger mutations; weaker ones are likelier.
export const PACK_MUTATION=[{chance:.03,top:3},{chance:.05,top:4},{chance:.07,top:5},{chance:.10,top:6},{chance:.14,top:8},{chance:.20,top:10},{chance:.30,top:11}];
export function rollPackMutation(tier,rng=Math.random){const t=PACK_MUTATION[Math.max(0,Math.min(PACK_MUTATION.length-1,tier|0))];if(rng()>=t.chance)return null;const w=MUTATIONS.slice(0,t.top+1).map((m,i)=>1/Math.pow(i+1,1.3)),total=w.reduce((a,b)=>a+b,0);let r=rng()*total;for(let i=0;i<w.length;i++){r-=w[i];if(r<0)return MUTATIONS[i].id}return MUTATIONS[0].id}
export function mutationTrait(c){return MUTATIONS.find(m=>m.id===c?.mutation)||null}
export function mutationDamage(c,base){return Math.round(base*(1+(mutationTrait(c)?.damage||0)))}
export function mutationCoins(c){return 1+(mutationTrait(c)?.coins||0)}
