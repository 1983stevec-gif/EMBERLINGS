// Presentation only: these helpers never change battle state or damage.
export function attackTheme(name='',element=''){
 const n=String(name).toLowerCase();
 for(const [theme,pattern] of [
  ['wave',/wave|tidal|tide|surge|river/],['bubble',/bubble/],
  ['fire',/flame|ember|cinder|blaz|inferno|fire|phoenix|solar/],
  ['lightning',/spark|lightning|thunder|static|quillstorm/],
  ['ice',/ice|frost|glaci|snow|winter/],['crystal',/crystal|prism|lance/],
  ['nature',/vine|briar|verdant|root|grove|pebble/],['moon',/moon|lunar/],
  ['shadow',/shadow|dusk|night|eclipse/],['wind',/wind|gust|wing|sky|spiral/]
 ])if(pattern.test(n))return theme;
 return {Water:'wave',Fire:'fire',Lightning:'lightning',Ice:'ice',Crystal:'crystal',Nature:'nature',Moon:'moon',Shadow:'shadow',Wind:'wind'}[element]||'strike';
}
export function unseenAttackEffects(match,seen){
 const effects=(match?.attackEffects||[]).filter(e=>e&&typeof e.id==='string'&&[0,1].includes(e.side)&&Number.isFinite(e.damage)&&e.damage>0&&!seen.has(e.id));
 for(const e of effects)seen.add(e.id);
 // Only a short recent trail is retained by the server; keep memory bounded too.
 if(seen.size>64){const recent=[...seen].slice(-32);seen.clear();for(const id of recent)seen.add(id)}
 return effects;
}
export const ATTACK_EFFECT_ART={
 wave:{color:'#68e1ff',svg:'<path d="M8 94Q35 24 71 40Q115 54 95 15Q160 18 175 73L193 105H8Z" fill="currentColor" opacity=".85"/><path d="M14 89Q45 38 78 51Q119 68 109 32Q151 40 166 78" fill="none" stroke="#e3fcff" stroke-width="9" stroke-linecap="round"/><path d="M31 103Q70 83 109 101T182 97" fill="none" stroke="#b4f5ff" stroke-width="6"/>'},
 bubble:{color:'#83e8ff',svg:'<g fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="4"><circle cx="100" cy="62" r="39"/><circle cx="37" cy="89" r="18"/><circle cx="160" cy="34" r="22"/><circle cx="158" cy="103" r="12"/></g><g fill="none" stroke="#efffff" stroke-width="5" stroke-linecap="round"><path d="M77 48Q85 32 103 34"/><path d="M148 22l7-3"/></g>'},
 fire:{color:'#ff9b42',svg:'<path d="M17 87Q57 91 72 36L94 57Q115 38 118 7Q163 39 174 70Q191 110 132 113Q79 119 17 87Z" fill="#ff623b"/><path d="M59 90Q96 77 101 46L119 69 132 36Q155 67 155 86Q151 116 113 111Z" fill="currentColor"/><path d="M99 99Q120 91 128 70Q147 104 123 110Z" fill="#fff1ac"/><path d="M25 39l22 5M36 112l20-5" stroke="#ffd57d" stroke-width="5" stroke-linecap="round"/>'},
 lightning:{color:'#ffe774',svg:'<path d="M139 4 61 57 100 65 58 119 161 57 118 47Z" fill="currentColor" stroke="#fff9d9" stroke-width="4"/><path d="m29 25 22 15-15 12 22 14M168 78l17 8-13 17" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>'},
 ice:{color:'#b2f2ff',svg:'<g fill="currentColor" fill-opacity=".7" stroke="#f0feff" stroke-width="3"><path d="m28 94 43-76 10 67-28 27Z"/><path d="m80 108 38-103 29 88-33 23Z"/><path d="m145 102 25-65 18 56-20 19Z"/></g><path d="M111 23v74m-25-47 47 26m-44 7 43-34" stroke="#edffff" stroke-width="3"/>'},
 crystal:{color:'#e0aaff',svg:'<g stroke="#fff1ff" stroke-width="3"><path d="m6 72 145-50 39 28-36 29Z" fill="currentColor"/><path d="m6 72 144-25 46 3-41 8Z" fill="#fff1ff"/><path d="m145 22-1 25 10 32" fill="none"/></g><g fill="currentColor"><path d="m38 20 5 9 9 5-9 4-5 10-5-10-9-4 9-5Z"/><path d="m109 89 5 9 10 5-10 4-5 10-4-10-10-4 10-5Z"/></g>'},
 nature:{color:'#8be6a3',svg:'<path d="M10 97Q45 28 92 64T189 28" fill="none" stroke="#438d67" stroke-width="13" stroke-linecap="round"/><g fill="currentColor" stroke="#dbffbd" stroke-width="2"><path d="M48 64Q22 17 71 20Q88 51 48 64Z"/><path d="M96 68Q104 105 143 98Q145 62 96 68Z"/><path d="M145 54Q123 11 167 9Q187 35 145 54Z"/></g>'},
 moon:{color:'#d5bdff',svg:'<path d="M125 10Q65 32 92 89Q112 117 148 98Q86 143 54 94Q25 32 89 9Z" fill="currentColor" stroke="#fff0ff" stroke-width="3"/><g fill="#fff8d8"><path d="m152 19 6 15 17 5-17 6-6 16-5-16-16-6 16-5Z"/><path d="m30 86 4 9 10 4-10 4-4 10-3-10-10-4 10-4Z"/></g>'},
 shadow:{color:'#ba92ff',svg:'<path d="M9 88Q42 13 102 33T190 60Q162 111 102 101T9 88Z" fill="#472377" opacity=".8"/><path d="M19 82Q68 25 122 51T185 60M29 101Q80 62 126 81T178 78" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="m120 36-12 24 26-5-18 31 42-37-26 3 11-16Z" fill="#ead7ff"/>'},
 wind:{color:'#a2ffe2',svg:'<g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M9 43h119q41 0 26-23-12-16-24 0"/><path d="M20 64h150q29 0 12 22-15 15-26 0"/><path d="M12 86h89q31 0 16 22"/></g><path d="M36 20h39M48 105h22" stroke="#effff8" stroke-width="4" stroke-linecap="round"/>'},
 strike:{color:'#ffe0a0',svg:'<path d="m111 7 8 32 40-20-19 33 51 9-43 16 26 33-44-13-16 24-15-30-55 10 32-29-63-21 67-3Z" fill="currentColor" stroke="#fff6df" stroke-width="3"/>'}
};
