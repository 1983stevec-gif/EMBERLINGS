const {game,fixture,assert}=require('./batch3-harness.cjs');
for(const [width,height]of[[360,800],[390,844],[430,932],[844,390]]){
 const g=game(fixture());g.sandbox.innerWidth=width;g.sandbox.innerHeight=height;g.t.go('inventory');
 const ids=()=>[...g.element('#app').innerHTML.matchAll(/data-inspect-card="([^"]+)"/g)].map(m=>m[1]);
 const first=ids();assert.equal(first.length,4);g.element('#binderNext').onclick();const second=ids();assert.equal(second.length,4);assert.equal(new Set([...first,...second]).size,8);assert.equal(g.t.state.owned.length,8);
}
console.log('PASS phone Binder uses four-card pages without skipping, repeating or consuming owned copies');
