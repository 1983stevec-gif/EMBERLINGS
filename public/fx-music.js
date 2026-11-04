// EMBERLINGS background music. Original, generated live with Web Audio: no audio files are downloaded.
// Presentation only: it never changes cards, rewards or progress.
//
// Three calm looping themes that follow the screen, with 1.6 s crossfades between them:
//   cozy    - Home, Adventure HQ, Friends and menus: warm pad, soft kalimba-like plucks, a gentle flute tune.
//   curious - Packs, Binder, Index, Collection, Fusion, Vault: lighter, a little playful, with music-box bells.
//   battle  - card battles: a bit faster with a pulsing bass and light percussion (still quiet).
// After a battle ends the music rests for a few seconds so the win/lose sound plays on its own.
//
// Setting: state.ember.music = { on, vol: 'low' | 'med' | 'high' }, added only when the player changes it.
// Off by default. Music follows the existing Sound On/Off switch (state.ember.muted): muted means silent.
// Audio starts only after a tap or key press (browser autoplay rules), pauses while the tab is hidden, and the
// music dips under sound effects. Notes are scheduled ahead on the audio clock by a light timer (4 times a
// second), so there is no per-frame work; long pad voices are reused for every chord.
// The controls (Music: On/Off and Low / Medium / High) are added next to Sound in the user menu and in Settings.

/* ================================================================ Music engine (no DOM, works offline too) */
const hz = m => 440 * 2 ** ((m - 69) / 12);
const MODES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10] };
const deg = (sc, d) => Math.floor(d / 7) * 12 + sc[((d % 7) + 7) % 7];
const pick = a => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
const fold = (p, lo) => { while (p < lo) p += 12; while (p >= lo + 12) p -= 12; return p; };

// Melody rhythms: [step, length] in 16th notes across two bars (32 steps).
const RHY_SLOW = [
  [[0, 6], [6, 2], [8, 8], [16, 4], [20, 4], [24, 8]],
  [[0, 4], [4, 4], [8, 6], [14, 2], [16, 12]],
  [[2, 2], [4, 4], [8, 4], [12, 4], [16, 10], [28, 4]],
  [[0, 8], [8, 4], [12, 4], [16, 6], [22, 2], [24, 8]],
  [[0, 3], [3, 3], [6, 2], [8, 8], [20, 4], [24, 8]]
];
const RHY_BUSY = [
  [[0, 2], [2, 2], [4, 4], [8, 2], [10, 2], [12, 4], [16, 6], [24, 4], [28, 4]],
  [[0, 4], [4, 2], [6, 2], [8, 4], [12, 4], [16, 2], [18, 2], [20, 4], [24, 8]],
  [[0, 3], [3, 3], [6, 2], [8, 4], [14, 2], [16, 3], [19, 3], [22, 2], [24, 8]],
  [[0, 2], [4, 2], [6, 2], [8, 6], [16, 2], [18, 2], [20, 2], [22, 2], [24, 8]]
];
const ARPS = { up: [0, 1, 2, 3, 4, 5], updown: [0, 1, 2, 3, 4, 3, 2, 1], broken: [0, 2, 1, 3, 2, 4, 3, 5], pedal: [0, 2, 0, 3, 0, 4, 0, 3], wave: [1, 2, 3, 2, 1, 0, 1, 3] };

export const THEMES = {
  cozy: {
    bpm: 72, root: 53, mode: 'major', swing: 0, sev: true, keys: [0, 0, 5, -2, 3, 0],
    progs: [[0, 5, 3, 4], [0, 2, 3, 0], [5, 3, 0, 4], [0, 3, 5, 4], [3, 4, 2, 5], [0, 4, 5, 3], [3, 0, 4, 0]],
    pad: { waves: ['triangle', 'sawtooth'], cut: 820, lvl: .028, center: 62, lfo: .07 },
    bass: { wave: 'sine', lo: 36, lvl: .045, pat: { 0: [0, 13], 8: [4, 6, .45], 12: [0, 3, .3] } },
    arp: { lo: 62, rate: 2, lvl: .13, inst: 'kalimba', keep: .72, pats: ['up', 'broken', 'pedal', 'wave'] },
    mel: { lo: 69, inst: 'flute', lvl: .12, rhy: RHY_SLOW },
    bell: { lo: 81, lvl: .05, prob: .05 },
    reverb: .32, echo: .16,
    sections: [
      { name: 'still', w: 1, pad: 1, bass: 1, arp: 0, mel: 0, bell: 1 },
      { name: 'flow', w: 3, pad: .85, bass: 1, arp: 1, mel: 0, bell: 1 },
      { name: 'song', w: 3, pad: .75, bass: 1, arp: 1, mel: 1, bell: 0 },
      { name: 'hum', w: 2, pad: .9, bass: 1, arp: 0, mel: 1, bell: 0 }
    ]
  },
  curious: {
    bpm: 92, root: 50, mode: 'lydian', swing: .14, sev: false, keys: [0, 0, 2, -3, 5, 0],
    progs: [[0, 1, 0, 1], [0, 1, 4, 3], [5, 1, 0, 4], [0, 4, 1, 3], [3, 1, 0, 0], [0, 2, 1, 4]],
    pad: { waves: ['sine', 'triangle'], cut: 1300, lvl: .018, center: 64, lfo: .11 },
    bass: { wave: 'triangle', lo: 38, lvl: .2, pluck: .5, pat: { 0: [0, 4], 6: [4, 2, .35], 8: [0, 3, .8], 14: [7, 2, .4] } },
    arp: { lo: 67, rate: 2, lvl: .17, inst: 'pizz', keep: .8, pats: ['up', 'updown', 'broken', 'wave'] },
    mel: { lo: 74, inst: 'bell', lvl: .1, rhy: RHY_BUSY },
    bell: { lo: 86, lvl: .045, prob: .09 },
    reverb: .28, echo: .2,
    sections: [
      { name: 'peek', w: 1, pad: 1, bass: 0, arp: 1, mel: 0, bell: 1 },
      { name: 'skip', w: 3, pad: .8, bass: 1, arp: 1, mel: 0, bell: 1 },
      { name: 'tune', w: 3, pad: .7, bass: 1, arp: 1, mel: 1, bell: 0 },
      { name: 'float', w: 1, pad: 1, bass: 1, arp: 0, mel: 1, bell: 1 }
    ]
  },
  battle: {
    bpm: 112, root: 45, mode: 'minor', swing: 0, sev: false, keys: [0, 0, 3, -2, 5, 0],
    progs: [[0, 5, 2, 6], [0, 3, 5, 4], [0, 6, 5, 6], [0, 5, 3, 4], [5, 6, 0, 0], [0, 2, 3, 4]],
    pad: { waves: ['sawtooth', 'triangle'], cut: 1100, lvl: .022, center: 60, lfo: .16 },
    bass: { wave: 'sawtooth', lo: 33, lvl: .13, pluck: .22, eighths: true },
    arp: { lo: 64, rate: 1, lvl: .075, inst: 'pluck', keep: .9, pats: ['up', 'updown', 'broken', 'pedal'] },
    mel: { lo: 69, inst: 'lead', lvl: .085, rhy: RHY_BUSY },
    bell: { lo: 84, lvl: .02, prob: .03 },
    drums: { lvl: .45 }, reverb: .18, echo: .12,
    sections: [
      { name: 'stalk', w: 1, pad: 1, bass: 1, arp: 0, mel: 0, bell: 0, drums: 1 },
      { name: 'drive', w: 3, pad: .8, bass: 1, arp: 1, mel: 0, bell: 0, drums: 2 },
      { name: 'charge', w: 3, pad: .7, bass: 1, arp: 1, mel: 1, bell: 0, drums: 2 },
      { name: 'breath', w: 1, pad: 1, bass: 0, arp: 1, mel: 0, bell: 1, drums: 0 }
    ]
  }
};

function makeNoise(ctx) {
  const len = ctx.sampleRate, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
// A soft generated room: noise with a smooth decay that darkens over time.
function makeImpulse(ctx, secs = 1.8, chans = 1) {
  const len = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(chans, len, ctx.sampleRate);
  for (let ch = 0; ch < chans; ch++) {
    const d = b.getChannelData(ch); let lp = 0;
    for (let i = 0; i < len; i++) {
      const x = i / len, k = .25 + .7 * x; // more smoothing (darker) as it decays
      lp = lp * k + (Math.random() * 2 - 1) * (1 - k);
      d[i] = lp * (1 - x) ** 2.4 * (i < 200 ? i / 200 : 1) * 2.2;
    }
  }
  return b;
}

// One theme playing on one bus. Long pad voices are created once and reused for every chord.
function Player(eng, name) {
  const { ctx } = eng, def = THEMES[name], sc = MODES[def.mode];
  const bus = ctx.createGain(); bus.gain.value = 0; bus.connect(eng.mix);
  const rv = ctx.createGain(); rv.gain.value = def.reverb; bus.connect(rv); rv.connect(eng.reverb);
  const echo = ctx.createGain(); echo.gain.value = def.echo; echo.connect(eng.delay);
  const inst = ctx.createGain(); inst.connect(bus); inst.connect(echo); // plucked parts also feed the echo

  // Pad: 4 voices x 2 slightly detuned oscillators through one slowly breathing low-pass filter.
  const padF = ctx.createBiquadFilter(); padF.type = 'lowpass'; padF.frequency.value = def.pad.cut; padF.Q.value = .4;
  const padG = ctx.createGain(); padG.gain.value = 0; padF.connect(padG); padG.connect(bus);
  const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = def.pad.lfo; lfoG.gain.value = def.pad.cut * .3;
  lfo.connect(lfoG); lfoG.connect(padF.frequency);
  const vib = ctx.createOscillator(), vibG = ctx.createGain(); vib.frequency.value = 4.6; vibG.gain.value = 7; vib.connect(vibG); // cents
  const lead = ctx.createBiquadFilter(); lead.type = 'lowpass'; lead.frequency.value = 1700; lead.Q.value = .7; lead.connect(bus); lead.connect(echo);
  const voices = [];
  for (let i = 0; i < 4; i++) {
    const g = ctx.createGain(); g.gain.value = 0; g.connect(padF);
    const os = def.pad.waves.map((w, k) => { const o = ctx.createOscillator(); o.type = w; o.detune.value = k ? 7 + i : -4 - i; o.frequency.value = 220; const og = ctx.createGain(); og.gain.value = k ? .45 : 1; o.connect(og); og.connect(g); return o; });
    voices.push({ g, os });
  }
  let drumBus = null, hatF = null, snF = null;
  if (def.drums) {
    drumBus = ctx.createGain(); drumBus.gain.value = 1; drumBus.connect(bus);
    hatF = ctx.createBiquadFilter(); hatF.type = 'highpass'; hatF.frequency.value = 7200; hatF.connect(drumBus);
    snF = ctx.createBiquadFilter(); snF.type = 'bandpass'; snF.frequency.value = 1900; snF.Q.value = .7; snF.connect(drumBus);
  }

  const P = { name, bus, endAt: Infinity, startAt: 0, started: false };
  const stepDur = 60 / def.bpm / 4;
  let next = 0, step = 0, phrase = -1, prog = pick(def.progs), key = 0, sec = def.sections[1], lastSec = null;
  let arpPat = ARPS[pick(def.arp.pats)], arpI = 0, motif = null, motifs = null, chord = 0, chordDeg = 0;

  /* ---- notes */
  // Envelope gains start at 0, so a source that begins a sample before its envelope can never click.
  const gain0 = () => { const g = ctx.createGain(); g.gain.value = 0; return g; };
  function env(g, t, v, a, d) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
  function osc(type, f, t, end, dest) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.connect(dest); o.start(t); o.stop(end); return o; }
  function note(kind, t, m, v, len) {
    if (!(v > .0005)) return; // a silent note would only cost nodes
    const f = hz(m), g = gain0();
    if (kind === 'kalimba') { env(g, t, v, .004, .9); osc('sine', f, t, t + 1, g); const g2 = ctx.createGain(); g2.gain.value = .22; g2.connect(g); osc('triangle', f * 2, t, t + .35, g2); g.connect(inst); }
    else if (kind === 'pizz') { env(g, t, v, .003, .32); osc('triangle', f, t, t + .4, g); g.connect(inst); }
    else if (kind === 'pluck') { env(g, t, v, .003, .18); osc('triangle', f, t, t + .24, g); g.connect(lead); }
    else if (kind === 'bell') {
      // Soft FM bell: a sine whose tone is coloured by a second, decaying sine.
      env(g, t, v, .003, 1.3); const c = osc('sine', f, t, t + 1.4, g);
      const mg = ctx.createGain(); mg.gain.setValueAtTime(f * 1.2, t); mg.gain.exponentialRampToValueAtTime(f * .02, t + .6);
      osc('sine', f * 3.5, t, t + 1.4, mg); mg.connect(c.frequency); g.connect(inst);
    } else if (kind === 'flute' || kind === 'lead') {
      const a = kind === 'flute' ? .06 : .02, rel = kind === 'flute' ? .35 : .18, hold = Math.max(a + .02, len);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.setValueAtTime(v * .8, t + hold * .6);
      g.gain.linearRampToValueAtTime(v * .7, t + hold); g.gain.setTargetAtTime(0, t + hold, rel / 4);
      const o = osc(kind === 'flute' ? 'triangle' : 'sawtooth', f, t, t + hold + rel + .05, g);
      vibG.connect(o.detune); o.onended = () => { try { vibG.disconnect(o.detune); } catch { /* ignore */ } };
      if (kind === 'flute') { const g2 = ctx.createGain(); g2.gain.value = .12; g2.connect(g); osc('sine', f * 2, t, t + hold + rel + .05, g2); }
      g.connect(kind === 'flute' ? bus : lead); if (kind === 'flute') g.connect(echo);
    } else if (kind === 'bass') {
      const b = def.bass, d = b.pluck ? Math.min(b.pluck, len) : len;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .012);
      if (b.pluck) g.gain.exponentialRampToValueAtTime(.0001, t + d + .1);
      else { g.gain.setTargetAtTime(v * .7, t + .05, .4); g.gain.setTargetAtTime(0, t + d, .12); }
      const end = t + d + (b.pluck ? .12 : .7);
      if (b.wave === 'sawtooth') { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(260, t + .16); osc('sawtooth', f, t, end, lp); lp.connect(g); }
      else osc(b.wave, f, t, end, g);
      g.connect(bus);
    }
  }
  function kick(t, v) { if (!(v > .0005)) return; const g = gain0(); env(g, t, v, .003, .28); const o = osc('sine', 115, t, t + .32, g); o.frequency.exponentialRampToValueAtTime(42, t + .12); g.connect(drumBus); }
  function hiss(t, v, d, dest) { if (!(v > .0005)) return; const s = ctx.createBufferSource(), g = gain0(); s.buffer = eng.noise; env(g, t, v, .002, d); s.connect(g); g.connect(dest); s.start(t, Math.random() * .8, d + .05); }
  function snare(t, v) { if (!(v > .0005)) return; hiss(t, v, .16, snF); const g = gain0(); env(g, t, v * .5, .002, .08); osc('triangle', 196, t, t + .12, g); g.connect(drumBus); }

  /* ---- harmony helpers */
  const R = () => def.root + key;
  const tones = d => { const t = [deg(sc, d), deg(sc, d + 2), deg(sc, d + 4)]; if (def.sev) t.push(deg(sc, d + 6)); return t; };
  function padChord(t, d) {
    const c = def.pad.center, ps = tones(d).map(x => { let p = R() + x; while (p < c - 6) p += 12; while (p >= c + 6) p -= 12; return p; });
    if (ps.length < 4) ps.push(ps[0] + 12);
    ps.sort((a, b) => a - b);
    voices.forEach((vc, i) => {
      vc.os.forEach(o => o.frequency.setTargetAtTime(hz(ps[i]), t, .05));
      vc.g.gain.setTargetAtTime(rnd(.75, 1), t, .5);
    });
  }
  function genMotif() {
    const rhy = pick(def.mel.rhy); let md = pick([0, 2, 4]);
    const n = rhy.map(([s, len], i) => {
      if (i) md += pick([-2, -1, -1, 1, 1, 2, 0, -3, 3]);
      md = Math.max(-2, Math.min(8, md));
      let x = md; if (s % 8 === 0) x = [0, 2, 4, 7].reduce((a, b) => Math.abs(b - md) < Math.abs(a - md) ? b : a);
      return { s, len, md: x };
    });
    return n;
  }
  function vary(m) {
    const n = m.map(x => ({ ...x }));
    const last = n[n.length - 1]; last.md = Math.max(-2, last.md + pick([-2, -1, 1, 2]));
    if (n.length > 4 && Math.random() < .5) n.splice(1 + Math.floor(Math.random() * (n.length - 2)), 1);
    return n;
  }
  function cadence(m) {
    const n = m.filter(x => x.s < 16).map(x => ({ ...x }));
    n.push({ s: 16, len: 14, md: pick([0, 0, 2, 4]) });
    return n;
  }
  function newPhrase() {
    phrase++;
    let s; do { s = weighted(def.sections); } while ((s === sec && Math.random() < .6) || s === lastSec && s.name === def.sections[0].name);
    if (phrase === 0) s = def.sections[1];
    lastSec = sec; sec = s;
    if (phrase && (phrase % 2 === 0 || Math.random() < .25)) { let p; do p = pick(def.progs); while (p === prog); prog = p; }
    if (phrase && phrase % 4 === 0) key = def.keys[(phrase / 4) % def.keys.length];
    if (Math.random() < .5) arpPat = ARPS[pick(def.arp.pats)];
    if (!motif || Math.random() < .55) motif = genMotif();
    motifs = [motif, vary(motif), Math.random() < .5 ? motif : vary(motif), cadence(motif)];
  }
  function weighted(list) { let r = Math.random() * list.reduce((a, b) => a + b.w, 0); for (const s of list) if ((r -= s.w) < 0) return s; return list[0]; }

  /* ---- one 16th step */
  function doStep(t, s) {
    const sb = s % 16, bar = Math.floor(s / 16), pb = bar % 8;
    if (sb === 0) {
      if (pb === 0) newPhrase();
      const nd = prog[pb % prog.length];
      if (nd !== chordDeg || pb === 0 || s === 0) { chordDeg = nd; padChord(t, nd); }
      padG.gain.setTargetAtTime(def.pad.lvl * sec.pad, t, .8);
      chord = nd;
    }
    const sw = (sb % 4 === 2) ? def.swing * stepDur * 2 : 0, tt = t + sw + rnd(0, .006);
    const last = pb === 7, tns = tones(chord);
    // Bass
    if (sec.bass) {
      const b = def.bass, root = fold(R() + deg(sc, chord), b.lo);
      if (b.eighths) {
        if (sb % 2 === 0 && !(last && sb >= 12)) note('bass', tt, root + (sb === 6 || sb === 14 ? (Math.random() < .3 ? 7 : 12) : 0), b.lvl * (sb % 4 ? .75 : 1), stepDur * 1.6);
      } else if (b.pat[sb] && Math.random() < (b.pat[sb][2] ?? 1)) {
        const [iv, len] = b.pat[sb];
        note('bass', tt, root + (iv === 4 ? deg(sc, chord + 4) - deg(sc, chord) : iv === 7 ? 12 : 0), b.lvl, len * stepDur);
      }
    }
    // Arpeggio
    if (sec.arp && sb % def.arp.rate === 0 && !(last && sb >= 8 && def.arp.rate === 2)) {
      const lo = def.arp.lo, ladder = tns.map(x => fold(R() + x, lo)).sort((a, b) => a - b);
      const full = [...ladder, ...ladder.map(x => x + 12)];
      const i = arpPat[arpI++ % arpPat.length] % full.length;
      const keep = sb % 4 === 0 ? 1 : def.arp.keep;
      if (Math.random() < keep) note(def.arp.inst, tt, full[i], def.arp.lvl * (sb % 8 === 0 ? 1 : .78) * rnd(.85, 1), stepDur * 2);
    }
    // Melody
    if (sec.mel && motifs) {
      const m = motifs[pb >> 1], loc = (pb & 1) * 16 + sb;
      for (const n of m) if (n.s === loc) {
        const base = R() + deg(sc, chord), shift = fold(base, def.mel.lo) - base;
        note(def.mel.inst, tt, base + shift + deg(sc, chord + n.md) - deg(sc, chord), def.mel.lvl * rnd(.85, 1), n.len * stepDur * .92);
      }
    }
    // Sparkles
    if (sec.bell && sb % 2 === 0 && Math.random() < def.bell.prob) note('bell', tt + rnd(0, .03), fold(R() + pick(tns), def.bell.lo), def.bell.lvl * rnd(.6, 1));
    // Drums (battle only), always soft
    if (def.drums && sec.drums) {
      const d = sec.drums, v = (d === 2 ? 1 : .7) * def.drums.lvl;
      if (sb === 0 || sb === 8 || (d === 2 && sb === 10 && bar % 2) || (sb === 6 && bar % 4 === 3)) kick(t, .32 * v);
      if (d === 2 && (sb === 4 || sb === 12)) snare(t, .1 * v);
      if (sb % 2 === 0) hiss(tt, (sb % 4 ? .05 : .03) * v, .04, hatF);
      else if (d === 2 && Math.random() < .3) hiss(tt, .02 * v, .03, hatF);
      if (last && d === 2 && sb >= 12) snare(t, (.035 + (sb - 12) * .015) * v);
    }
  }

  P.start = (t, fade) => {
    P.startAt = t; next = t + .05; P.started = true;
    lfo.start(t); vib.start(t); voices.forEach(v => v.os.forEach(o => o.start(t)));
    bus.gain.setValueAtTime(0, t); bus.gain.linearRampToValueAtTime(1, t + fade);
  };
  P.stop = (t, fade) => {
    P.endAt = t + fade;
    const g = bus.gain;
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t); else { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); }
    g.linearRampToValueAtTime(0, t + fade);
    const end = t + fade + .1;
    lfo.stop(end); vib.stop(end); voices.forEach(v => v.os.forEach(o => o.stop(end)));
    if (typeof OfflineAudioContext === 'undefined' || !(ctx instanceof OfflineAudioContext))
      setTimeout(() => { try { bus.disconnect(); echo.disconnect(); } catch { /* already gone */ } }, (end - ctx.currentTime + 2) * 1000);
  };
  P.schedule = until => {
    const lim = Math.min(until, P.endAt);
    while (next < lim) { doStep(next, step); next += stepDur; step++; }
  };
  P.debug = () => ({ phrase, section: sec.name, key, prog: prog.join('-') });
  return P;
}

// The whole music system on one audio context: themes -> mix -> volume -> duck -> safety limiter -> speakers.
export function createMusic(ctx, dest = ctx.destination, opts = {}) {
  const eng = { ctx, noise: makeNoise(ctx) };
  const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 8; lim.attack.value = .004; lim.release.value = .25; lim.connect(dest);
  const duck = ctx.createGain(); duck.connect(lim);
  const vol = ctx.createGain(); vol.gain.value = 1; vol.connect(duck);
  eng.mix = ctx.createGain(); eng.mix.connect(vol);
  // A mono 1.8 s room keeps the reverb cheap (about half the CPU of a long stereo one).
  eng.reverb = ctx.createConvolver(); eng.reverb.buffer = makeImpulse(ctx, opts.reverbSecs || 1.8, 1);
  const wet = ctx.createGain(); wet.gain.value = .9; eng.reverb.connect(wet); wet.connect(vol);
  // One shared echo for the plucked parts: about a dotted eighth, soft and darkening.
  eng.delay = ctx.createDelay(1); eng.delay.delayTime.value = .42;
  const fb = ctx.createGain(); fb.gain.value = .3; const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2200;
  eng.delay.connect(dl); dl.connect(fb); fb.connect(eng.delay); dl.connect(vol);

  let players = [], current = null;
  const api = {
    ctx, get theme() { return current?.name || null; }, get players() { return players; },
    setTheme(name, at = ctx.currentTime + .05, fade = 1.6) {
      if ((current?.name || null) === (name || null)) return;
      if (current) current.stop(at, fade);
      current = null;
      if (name && THEMES[name]) { current = Player(eng, name); current.start(at, fade); players.push(current); }
      players = players.filter(p => p === current || p.endAt > at);
    },
    schedule(until) {
      for (const p of players) p.schedule(until);
      players = players.filter(p => p === current || p.endAt > ctx.currentTime);
    },
    volume(v, ramp = .6) {
      const g = vol.gain, t = ctx.currentTime;
      if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t); else { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); }
      g.linearRampToValueAtTime(v, t + ramp);
    },
    // Dip the music under a sound effect. depth 0..1, hold in seconds.
    duck(depth, hold = .4) {
      const g = duck.gain, t = ctx.currentTime, to = 1 - .62 * Math.min(1, depth);
      if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t); else { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); }
      g.setTargetAtTime(Math.min(to, g.value), t, .03); g.setTargetAtTime(1, t + hold, .35);
    },
    get duckLevel() { return duck.gain.value; },
    get volumeLevel() { return vol.gain.value; },
    debug: () => ({ theme: current?.name || null, players: players.length, ...(current?.debug() || {}) })
  };
  return api;
}

/* ================================================================ In the game */
const B = typeof window !== 'undefined' ? window.EmberBridge : null;
export const MUSIC_VOL = { low: .38, med: .65, high: 1 };
export const VOL_LABELS = { low: 'Low', med: 'Medium', high: 'High' };
const CURIOUS = new Set(['packs', 'packOpening', 'reveal', 'packSummary', 'packReview', 'inventory', 'index', 'album', 'mutationBook', 'collection', 'fusion', 'fusion-result', 'mutation', 'vault', 'cardDetails']);
const BATTLE = new Set(['cardBattle', 'battle']);
const REST = new Set(['cardResult', 'online-result']);
export const themeFor = v => BATTLE.has(v) ? 'battle' : CURIOUS.has(v) ? 'curious' : 'cozy';

if (B && !window.EmberMusic) {
  const $ = (s, r = document) => r.querySelector(s);
  const ext = () => { const st = B.state; if (!st.ember || typeof st.ember !== 'object') st.ember = {}; return st.ember; };
  const settings = () => { const m = ext().music; return { on: !!m?.on, vol: MUSIC_VOL[m?.vol] ? m.vol : 'med' }; };
  const muted = () => !!ext().muted;
  let ctx = null, music = null, timer = 0, suspendT = 0, restT = 0, gestured = false, playing = false, lastView = null, lastMuted = muted();

  const want = () => settings().on && !muted() && !document.hidden && gestured;
  function tick() { timer = 0; if (!playing || !music) return; music.schedule(ctx.currentTime + .8); timer = setTimeout(tick, 250); }
  function setView(v, now = false) {
    if (!music) { lastView = v; return; }
    if (v === lastView && !now) return;
    lastView = v; clearTimeout(restT);
    if (REST.has(v)) { music.setTheme(null, ctx.currentTime + .05, .8); restT = setTimeout(() => { if (music && playing) music.setTheme(REST.has(B.view) ? 'cozy' : themeFor(B.view)); }, 4500); }
    else music.setTheme(themeFor(v));
  }
  function init() {
    if (ctx) return true;
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return false;
      ctx = new C({ latencyHint: 'playback' });
      music = createMusic(ctx); music.volume(0, .01);
      hookSfx();
      return true;
    } catch { ctx = null; music = null; return false; }
  }
  function apply() {
    clearTimeout(suspendT);
    if (want()) {
      if (!init()) return;
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      if (!playing) { playing = true; setView(B.view, true); if (!timer) tick(); }
      else setView(B.view);
      music.volume(MUSIC_VOL[settings().vol], .9);
    } else if (ctx && playing) {
      music.volume(0, .35);
      suspendT = setTimeout(() => { if (!want()) { playing = false; clearTimeout(timer); timer = 0; ctx.suspend().catch(() => {}); } }, 450);
    }
  }

  // Duck under sound effects: enhancements.js and fx-sound.js use their own audio contexts, so watch for any sound
  // that starts outside the music's context. Many notes at once (an attack, a fanfare) dip deeper than a single click.
  let burst = 0, hold = 0, pend = false;
  function hookSfx() {
    const protos = [window.AudioScheduledSourceNode?.prototype].filter(Boolean);
    if (!protos.length) protos.push(window.OscillatorNode?.prototype, window.AudioBufferSourceNode?.prototype);
    for (const p of protos) {
      if (!p || p.__emberMusic) continue;
      const orig = p.start; p.__emberMusic = true;
      p.start = function (when = 0, ...rest) {
        try {
          if (playing && this.context !== ctx) {
            burst++; hold = Math.max(hold, (when || 0) - this.context.currentTime);
            if (!pend) { pend = true; setTimeout(() => { pend = false; if (music && playing) music.duck(Math.min(1, burst / 5), Math.min(2.2, Math.max(0, hold) + .35)); burst = 0; hold = 0; }, 0); }
          }
        } catch { /* never block a sound effect */ }
        return orig.call(this, when, ...rest);
      };
    }
  }

  /* ---- controls */
  function setMusic(patch) {
    const e = ext(), cur = e.music && typeof e.music === 'object' ? e.music : {};
    e.music = { ...cur, on: !!cur.on, vol: MUSIC_VOL[cur.vol] ? cur.vol : 'med', ...patch };
    try { B.save(); } catch { /* ignore */ }
    gestured = true; // every way to change this is a tap or key press
    apply(); paint(); hideHint();
    dispatchEvent(new CustomEvent('ember:music', { detail: { ...settings() } }));
  }
  function boxHTML() {
    return `<div class="fxMusicBox" role="group" aria-label="Music">
     <button type="button" class="fxMusicToggle" role="switch" aria-checked="false"><span aria-hidden="true">🎵</span> <b>Music: Off</b></button>
     <div class="uiFxRow fxMusicVol" role="radiogroup" aria-label="Music volume">${Object.keys(MUSIC_VOL).map(v => `<button type="button" role="radio" data-music-vol="${v}">${VOL_LABELS[v]}</button>`).join('')}</div>
     <p class="fxMusicNote" hidden>Sound is off, so music stays quiet. Turn Sound on to hear it.</p></div>`;
  }
  function paint() {
    const s = settings(), m = muted();
    for (const box of document.querySelectorAll('.fxMusicBox')) {
      const t = $('.fxMusicToggle', box); t.setAttribute('aria-checked', String(s.on)); t.classList.toggle('on', s.on); $('b', t).textContent = `Music: ${s.on ? 'On' : 'Off'}`;
      for (const b of box.querySelectorAll('[data-music-vol]')) { const on = b.dataset.musicVol === s.vol; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }
      box.classList.toggle('off', !s.on);
      $('.fxMusicNote', box).hidden = !(s.on && m);
    }
  }
  function mount(anchor, where) {
    if (!anchor || anchor.parentElement?.querySelector(':scope > .fxMusicBox')) return;
    const w = document.createElement('div'); w.innerHTML = boxHTML(); const box = w.firstElementChild;
    if (where === 'settings') box.classList.add('fxMusicSettings');
    anchor.after(box);
    box.addEventListener('click', ev => {
      const b = ev.target.closest('button'); if (!b) return;
      ev.stopPropagation(); // keep the user menu open (its own handler would navigate)
      if (b.classList.contains('fxMusicToggle')) setMusic({ on: !settings().on });
      else if (b.dataset.musicVol) setMusic({ vol: b.dataset.musicVol, on: true });
    });
    paint();
  }
  function inject() {
    const menu = $('.uiMenu'); if (menu) mount($('#uiSound', menu) || menu.lastElementChild, 'menu');
    const set = $('.uiSettings #uiMute'); if (set) mount(set.closest('p') || set, 'settings');
  }

  /* ---- one-time hint */
  let hintT = 0;
  function hideHint() { $('#fxMusicHint')?.remove(); }
  function maybeHint() {
    const e = ext();
    if (hintT || e.music?.hinted || e.music?.on || B.view !== 'home' || B.state.guidedTour?.active) return;
    hintT = setTimeout(() => {
      hintT = 0;
      if (ext().music?.hinted || B.view !== 'home' || $('#dailyPanel, #guidedTour, .uiMenu, #fxMusicHint') || B.state.guidedTour?.active) return;
      const cur = ext().music || {}; ext().music = { on: !!cur.on, vol: MUSIC_VOL[cur.vol] ? cur.vol : 'med', ...cur, hinted: true };
      try { B.save(); } catch { /* ignore */ }
      const h = document.createElement('div'); h.id = 'fxMusicHint'; h.setAttribute('role', 'status');
      h.innerHTML = '<span><span aria-hidden="true">🎵</span> New: music! Turn it on in the menu.</span><button type="button" class="fxMusicTry">Turn on</button><button type="button" class="fxMusicX" aria-label="Close">×</button>';
      h.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; if (b.classList.contains('fxMusicTry')) setMusic({ on: true }); hideHint(); });
      // Sit above the bottom tab bar on touch screens so it never covers navigation.
      const tabs = [...document.querySelectorAll('.uiTabMenu, #app > nav.nav')].find(e => { const r = e.getBoundingClientRect(); return r.height > 0 && getComputedStyle(e).position === 'fixed'; });
      if (tabs) { const r = tabs.getBoundingClientRect(); if (r.top > innerHeight / 2) h.style.bottom = Math.round(innerHeight - r.top + 10) + 'px'; }
      document.body.appendChild(h);
      // Never cover the Daily button: if they would overlap, lift the hint above it.
      const daily = $('#dailyBtn');
      if (daily) { const d = daily.getBoundingClientRect(), r = h.getBoundingClientRect(); if (d.width && r.right > d.left && r.left < d.right && r.bottom > d.top && r.top < d.bottom) h.style.bottom = Math.round(innerHeight - d.top + 10) + 'px'; }
      setTimeout(hideHint, 14000);
    }, 2500);
  }

  const css = `
.fxMusicBox{margin:4px 6px 6px;padding:6px 8px 8px;border:1px solid #e9b75a33;border-radius:8px;background:#0c1119}
.uiMenu .fxMusicBox .fxMusicToggle,.fxMusicToggle{display:flex;align-items:center;gap:6px;width:100%;min-height:40px;margin:0 0 6px;padding:8px 10px;text-align:left;background:#161d29;border:1px solid #e9b75a55;border-radius:6px;color:var(--ui-text,#f3e6c8);font-family:var(--ui-serif,serif);font-size:15px;cursor:pointer}
.uiMenu .fxMusicBox .fxMusicToggle.on,.fxMusicToggle.on{border-color:#ffe2a0;background:#2a2312;color:#ffd27a}
.fxMusicToggle span{width:1.4em;text-align:center}
.fxMusicToggle:focus-visible,.fxMusicVol button:focus-visible,#fxMusicHint button:focus-visible{outline:2px solid #ffd27a;outline-offset:2px}
.fxMusicBox.off .fxMusicVol{opacity:.6}
.fxMusicNote{margin:6px 4px 0;font-size:12.5px;line-height:1.35;color:#c9bfa8;max-width:250px}
.fxMusicSettings{max-width:340px;margin:8px 0 12px}
#fxMusicHint{position:fixed;left:16px;bottom:16px;z-index:9500;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 8px 8px 14px;border:1px solid var(--ui-gold,#e9b75a);border-radius:999px;background:#121822ee;color:var(--ui-text,#f3e6c8);font:14px/1.3 var(--ui-serif,serif);box-shadow:0 10px 26px #0009;animation:fxMusicIn .35s ease-out}
#fxMusicHint button{flex:none;min-height:34px;border-radius:999px;border:1px solid #e9b75a88;background:#161d29;color:inherit;font:inherit;padding:4px 12px;cursor:pointer}
#fxMusicHint .fxMusicTry{background:linear-gradient(180deg,#f3c76a,#c68f32);color:#1b1206;font-weight:700;border-color:#ffe2a0}
#fxMusicHint .fxMusicX{width:34px;padding:0;font-size:18px}
@keyframes fxMusicIn{from{opacity:0;transform:translateY(10px)}}
html[data-fx=off] #fxMusicHint{animation:none}
@media (max-width:520px){#fxMusicHint{font-size:13px;left:12px;right:12px;bottom:12px;max-width:none}}`;
  const st = document.createElement('style'); st.id = 'fx-music-css'; st.textContent = css; document.head.appendChild(st);

  /* ---- wiring */
  const onGesture = () => { const first = !gestured; gestured = true; if (first || (ctx && ctx.state !== 'running' && want())) apply(); };
  for (const type of ['pointerdown', 'keydown']) document.addEventListener(type, onGesture, { capture: true, passive: true });
  // Sound On/Off lives in ui.js / enhancements.js: notice it after any click or change, and react.
  const checkMute = () => setTimeout(() => { inject(); const m = muted(); if (m !== lastMuted) { lastMuted = m; apply(); paint(); } }, 0);
  document.addEventListener('click', () => { checkMute(); for (const ms of [150, 450, 1000]) setTimeout(inject, ms); }, true);
  document.addEventListener('change', checkMute, true);
  document.addEventListener('visibilitychange', apply);
  addEventListener('pagehide', () => { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); });
  addEventListener('pageshow', apply);
  addEventListener('ember:frame', e => {
    const v = e.detail?.view ?? B.view;
    if (playing) setView(v); else lastView = v;
    const m = muted(); if (m !== lastMuted) { lastMuted = m; apply(); }
    inject(); maybeHint();
  });

  window.EmberMusic = Object.freeze({
    settings, set: setMusic, themeFor,
    status: () => ({ ...settings(), muted: muted(), gestured, playing, ctx: ctx?.state || 'none', volume: music?.volumeLevel ?? 0, duck: music?.duckLevel ?? 1, ...(music?.debug() || {}) })
  });
  inject(); maybeHint();
}
