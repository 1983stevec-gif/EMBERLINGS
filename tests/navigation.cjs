const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('public/ui.js', 'utf8');
const start = source.indexOf('function onFrame()');
const end = source.indexOf('/* ---------------------------------------------------------------- Vault:', start);
const makeButton = destination => ({dataset:{go:destination}, childNodes:[], icon:{outerHTML:''}, classList:{toggle(){}},setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]}});
for (const view of ['home','inventory','friends']) {
  const buttons = ['home','packs','inventory','map','friends'].map(makeButton);
  const anchor = {};
  const nav = {setAttribute(){}};
  let opened = 0, decorated = 0;
  const context = {
    B:{view}, trackHistory(){}, document:{body:{classList:{add(){},toggle(){}}}},
    SLIM_VIEWS:[], FULL_VIEWS:[], NAV_ART:Object.fromEntries(buttons.map(b=>[b.dataset.go,true])),
    navIcon(g){decorated++;return g}, afterHome(){}, vaultLayout(){},
    toggleSound(){},paintSoundControls(){},userMenu(button){assert.equal(button,anchor);opened++},
    $(selector, parent){
      if(selector.includes('aria-current')) return {dataset:{go:view}};
      if(selector==='#app > .nav') return nav;
      if(selector==='#uiUser') return anchor;
      if(selector==='.ico') return parent.icon;
      if(selector==='button[data-go]') return buttons[0];
      return null;
    },
    $$(selector,parent){assert.equal(parent,nav);return buttons}
  };
  vm.runInNewContext(source.slice(start,end)+';onFrame();', context);
  assert.equal(decorated,5);
  assert.equal(typeof anchor.onclick,'function');
  anchor.onclick();
  assert.equal(opened,1);
  assert.equal(buttons.find(b=>b.dataset.go===view)['aria-current'],'page');
}
console.log('PASS navigation setup decorates all five buttons and binds the dropdown on Home, Binder and Friends');
