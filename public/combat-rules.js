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
 {basic:'Wing Slice',skill:'Spiral Gust',ultimate:'Sky Tempest',mode:'gust',power:1.6,range:195,cool:1.35,color:'#9dffe0'}
];
export function moveProfile(kind){return MOVE_PROFILES[kind]||MOVE_PROFILES[0]}
export function skillShots(p,kind,base,dx,dy){const m=moveProfile(kind);if(!m.count)return [];const angle=Math.atan2(dy,dx);return Array.from({length:m.count},(_,i)=>{const a=angle+(i-(m.count-1)/2)*m.spread;return {x:p.x+dx*22,y:p.y+dy*22,vx:Math.cos(a)*m.speed,vy:Math.sin(a)*m.speed,r:m.radius,life:1.8,damage:Math.round(base*m.power),color:m.color,pierce:m.mode==='pierce'?2:0,bounces:m.mode==='bounce'?1:0,hitIds:[]}})}

export const MUTATIONS=[
 {id:'spark',name:'Spark',damage:.10,coins:.10,cost:2500,color:'#ffe47e',icon:'✧'},
 {id:'flame',name:'Flame',damage:.20,coins:.20,cost:10000,color:'#ff9a63',icon:'🔥'},
 {id:'frost',name:'Frost',damage:.25,coins:.15,cost:25000,color:'#9cecff',icon:'❄'},
 {id:'storm',name:'Storm',damage:.35,coins:.30,cost:75000,color:'#b3a2ff',icon:'ϟ'},
 {id:'shadow',name:'Shadow',damage:.50,coins:.40,cost:200000,color:'#e3a1fb',icon:'☾'},
 {id:'cosmic',name:'Cosmic',damage:.75,coins:.60,cost:500000,color:'#ffadd8',icon:'✦'}
];
export function mutationTrait(c){return MUTATIONS.find(m=>m.id===c?.mutation)||null}
export function mutationDamage(c,base){return Math.round(base*(1+(mutationTrait(c)?.damage||0)))}
export function mutationCoins(c){return 1+(mutationTrait(c)?.coins||0)}
