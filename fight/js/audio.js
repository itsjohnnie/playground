// Everything you hear is synthesized with Web Audio: thwacks, clay squishes,
// rope boings, clangs, the bell, a crowd bed that swells, and a rock loop.
import { rand } from './util.js';

export class Audio {
  constructor() {
    this.ctx = null;
    this.vol = 0.8;
    this.musicVol = 0.5;
    this.crowdLevel = 0.25;
  }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.vol;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    this.music = ctx.createGain(); this.music.gain.value = this.musicVol * 0.5; this.music.connect(this.master);
    // White noise buffer shared by everything.
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startCrowd();
  }

  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }

  noiseSrc() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.loopStart = rand(0, 1);
    return s;
  }

  env(g, t, a, peak, dec, sustain = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(sustain, t + a + dec);
  }

  tone(type, f0, f1, dur, vol, t0 = 0, dest = this.sfx) {
    const ctx = this.ctx, t = ctx.currentTime + t0;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this.env(g, t, 0.005, vol, dur);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  burst(freq, q, dur, vol, type = 'lowpass', t0 = 0, sweep) {
    const ctx = this.ctx, t = ctx.currentTime + t0;
    const s = this.noiseSrc(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    this.env(g, t, 0.003, vol, dur);
    s.connect(f).connect(g).connect(this.sfx);
    s.start(t, rand(0, 1)); s.stop(t + dur + 0.05);
  }

  play(name, k = 1) {
    if (!this.ctx) return;
    const v = k;
    switch (name) {
      case 'punch':
        this.burst(900, 1, 0.09, 0.9 * v, 'lowpass', 0, 200);
        this.tone('sine', 140, 60, 0.12, 0.7 * v);
        break;
      case 'kick':
        this.burst(700, 1, 0.12, 0.9 * v, 'lowpass', 0, 150);
        this.tone('sine', 110, 45, 0.16, 0.8 * v);
        break;
      case 'heavy':
        this.burst(1200, 0.8, 0.16, 1 * v, 'lowpass', 0, 120);
        this.tone('sine', 120, 35, 0.25, 1 * v);
        this.tone('triangle', 70, 30, 0.3, 0.4 * v);
        break;
      case 'slap':
        this.burst(3500, 0.8, 0.07, 0.7 * v, 'highpass');
        this.burst(1800, 2, 0.05, 0.5 * v, 'bandpass');
        break;
      case 'squish':
        // Wet clay: band-passed noise swept down plus a little pitch blob.
        this.burst(1400, 4, 0.18, 0.5 * v, 'bandpass', 0, 260);
        this.tone('sine', 380, 120, 0.12, 0.25 * v);
        break;
      case 'block':
        this.burst(500, 1, 0.08, 0.5 * v, 'lowpass');
        this.tone('square', 90, 60, 0.06, 0.15 * v);
        break;
      case 'whoosh':
        this.burst(600, 1.5, 0.22, 0.25 * v, 'bandpass', 0, 2400);
        break;
      case 'slam':
        this.burst(400, 0.7, 0.35, 1 * v, 'lowpass', 0, 60);
        this.tone('sine', 90, 30, 0.4, 1 * v);
        this.burst(2000, 1, 0.12, 0.3 * v, 'bandpass', 0.02, 400);
        break;
      case 'rope': {
        // Boing: vibrato pitch drop.
        const ctx = this.ctx, t = ctx.currentTime;
        const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(220, t);
        o.frequency.exponentialRampToValueAtTime(90, t + 0.5);
        lfo.frequency.value = 18; lg.gain.value = 18;
        lfo.connect(lg).connect(o.frequency);
        this.env(g, t, 0.01, 0.35 * v, 0.5);
        o.connect(g).connect(this.sfx);
        o.start(t); lfo.start(t); o.stop(t + 0.6); lfo.stop(t + 0.6);
        break;
      }
      case 'clang':
        for (const [f, a] of [[520, 0.4], [1240, 0.3], [1890, 0.22], [2730, 0.15]]) this.tone('sine', f, f * 0.98, 0.7, a * v);
        this.burst(3000, 1, 0.05, 0.5 * v, 'highpass');
        break;
      case 'bell':
        for (const [f, a] of [[880, 0.5], [880 * 2.76, 0.25], [880 * 5.4, 0.12], [880 * 0.5, 0.2]]) this.tone('sine', f, f, 1.6, a * v);
        break;
      case 'bat':
        this.burst(1600, 3, 0.08, 0.8 * v, 'bandpass');
        this.tone('triangle', 330, 200, 0.12, 0.5 * v);
        break;
      case 'feedback':
        this.tone('sawtooth', 2200, 2600, 0.5, 0.15 * v);
        this.tone('square', 1100, 1300, 0.5, 0.08 * v);
        this.burst(900, 1, 0.08, 0.6 * v);
        break;
      case 'grab':
        this.burst(1200, 2, 0.08, 0.4 * v, 'bandpass', 0, 500);
        break;
      case 'pickup':
        this.tone('square', 440, 880, 0.08, 0.12 * v);
        break;
      case 'pop':
        this.tone('sine', 300, 1400, 0.12, 0.6 * v);
        this.burst(2000, 3, 0.06, 0.5 * v, 'bandpass');
        break;
      case 'special':
        this.tone('sawtooth', 220, 880, 0.3, 0.12 * v);
        this.tone('square', 330, 1320, 0.3, 0.08 * v);
        break;
      case 'scream': {
        const ctx = this.ctx, t = ctx.currentTime;
        const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(1100, t);
        o.frequency.linearRampToValueAtTime(1500, t + 0.6);
        lfo.frequency.value = 7; lg.gain.value = 40;
        lfo.connect(lg).connect(o.frequency);
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 3;
        this.env(g, t, 0.05, 0.35 * v, 0.7);
        o.connect(f).connect(g).connect(this.sfx);
        o.start(t); lfo.start(t); o.stop(t + 0.8); lfo.stop(t + 0.8);
        break;
      }
      case 'count':
        this.tone('square', 660, 660, 0.08, 0.1 * v);
        break;
      case 'ui':
        this.tone('square', 660, 990, 0.05, 0.08 * v);
        break;
      case 'select':
        this.tone('square', 523, 523, 0.06, 0.1 * v);
        this.tone('square', 784, 784, 0.1, 0.1 * v, 0.06);
        break;
      case 'ko':
        this.play('bell'); setTimeout(() => this.play('bell', 0.8), 250); setTimeout(() => this.play('bell', 0.6), 500);
        this.cheer(1);
        break;
      case 'gong':
        for (const [f, a] of [[110, 0.5], [163, 0.3], [227, 0.25], [341, 0.12]]) this.tone('sine', f, f * 0.97, 2.5, a * v);
        break;
      default:
        break;
    }
  }

  // Crowd bed: filtered noise with slow random "waves" of voices.
  startCrowd() {
    const ctx = this.ctx;
    const s = this.noiseSrc();
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 700; f1.Q.value = 0.6;
    const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 2200;
    this.crowdGain = ctx.createGain();
    this.crowdGain.gain.value = 0.05;
    s.connect(f1).connect(f2).connect(this.crowdGain).connect(this.master);
    s.start();
    this.crowdFilter = f1;
  }

  setCrowd(level) {
    if (!this.ctx) return;
    this.crowdLevel = level;
    const t = this.ctx.currentTime;
    this.crowdGain.gain.setTargetAtTime(0.03 + level * 0.22, t, 0.3);
    this.crowdFilter.frequency.setTargetAtTime(600 + level * 900, t, 0.3);
  }

  cheer(k = 1) {
    if (!this.ctx) return;
    // A swell of "woo" formants on top of the bed.
    for (let i = 0; i < 6; i++) {
      const t0 = rand(0, 0.3);
      const ctx = this.ctx, t = ctx.currentTime + t0;
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sawtooth';
      const base = rand(260, 520);
      o.frequency.setValueAtTime(base, t);
      o.frequency.linearRampToValueAtTime(base * rand(1.2, 1.6), t + 0.4);
      o.frequency.linearRampToValueAtTime(base * 0.9, t + 1.2);
      f.type = 'bandpass'; f.frequency.value = rand(700, 1100); f.Q.value = 5;
      this.env(g, t, 0.2, 0.05 * k, 1.1);
      o.connect(f).connect(g).connect(this.sfx);
      o.start(t); o.stop(t + 1.5);
    }
    this.burst(1500, 0.5, 1.2, 0.25 * k, 'bandpass', 0, 900);
  }

  // A simple distorted power-chord rock loop for menus.
  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    const ctx = this.ctx;
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 512) - 1; curve[i] = Math.tanh(x * 6); }
    shaper.curve = curve;
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2600;
    this.guitarBus = ctx.createGain(); this.guitarBus.gain.value = 0.18;
    shaper.connect(tone).connect(this.guitarBus).connect(this.music);
    this.shaper = shaper;
    const bpm = 132, beat = 60 / bpm;
    const riff = [40, 40, 43, 40, 45, 40, 43, 38];  // MIDI roots, E-ish
    let step = 0;
    let next = ctx.currentTime + 0.1;
    const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const sched = () => {
      if (!this.musicOn) return;
      while (next < ctx.currentTime + 0.3) {
        const t = next;
        const root = riff[Math.floor(step / 2) % riff.length];
        // Power chord: root + fifth + octave, palm-muted eighths.
        for (const iv of [0, 7, 12]) {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sawtooth';
          o.frequency.value = midi(root + iv);
          const len = step % 4 === 3 ? beat * 0.9 : beat * 0.38;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t + len);
          o.connect(g).connect(shaper);
          o.start(t); o.stop(t + len + 0.05);
        }
        // Drums.
        if (step % 4 === 0) this.drum('kick', t);
        if (step % 4 === 2) this.drum('snare', t);
        this.drum('hat', t);
        next += beat / 2;
        step++;
      }
      this.musicTimer = setTimeout(sched, 60);
    };
    sched();
  }

  drum(kind, t) {
    const ctx = this.ctx;
    if (kind === 'kick') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g).connect(this.music); o.start(t); o.stop(t + 0.25);
    } else {
      const s = this.noiseSrc(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = kind === 'hat' ? 'highpass' : 'bandpass';
      f.frequency.value = kind === 'hat' ? 7000 : 1800;
      const dur = kind === 'hat' ? 0.04 : 0.15;
      g.gain.setValueAtTime(kind === 'hat' ? 0.08 : 0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g).connect(this.music); s.start(t, rand(0, 1)); s.stop(t + dur + 0.02);
    }
  }

  stopMusic() {
    this.musicOn = false;
    clearTimeout(this.musicTimer);
  }

  setMusicVolume(v) { this.musicVol = v; if (this.music) this.music.gain.value = v * 0.5; }
}
