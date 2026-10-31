import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {versionGameAssets} from '../lib/version-game-assets.mjs';
const html=readFileSync('game/index.html','utf8'),assets=['theme.css','ui.js','ui-exact.js','enhancements.js'].map(f=>readFileSync('public/'+f,'utf8'));
const a=versionGameAssets(html,assets),b=versionGameAssets(html,assets);
assert.equal(a.version,b.version);
for(const file of ['theme.css','ui.js','ui-exact.js','enhancements.js'])assert(a.html.includes('/'+file+'?v='+a.version));
assert(a.html.includes('./card-engine.js?v='+a.version));
assert(a.html.includes('./combat-rules.js?v='+a.version));
assert(a.html.includes('mythlings-playable-v1'));
for(let i=0;i<assets.length;i++){const changed=[...assets];changed[i]+='\n/* updated */';assert.notEqual(versionGameAssets(html,changed).version,a.version)}
assert.notEqual(versionGameAssets(html+' ',assets).version,a.version);
assert(a.html.includes('/branding/emberlings-logo.png'));
console.log('PASS Every release versions matching CSS, UI scripts and inline engine imports without changing save keys or artwork URLs');
