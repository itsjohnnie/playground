// Game flow: title, menus, select, intros, rounds, KOs, Clay Time,
// instant replays and results. Owns the scene and every subsystem.
import * as THREE from 'three';
import { Arena } from './arena.js';
import { CameraRig } from './camera.js';
import { Fighter, RING_H } from './fighter.js';
import { Crew } from './crew.js';
import { Particles } from './particles.js';
import { Weapons } from './weapons.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { Commentary } from './commentary.js';
import { AIController } from './ai.js';
import { makeControllers, menuInput, endFrame } from './input.js';
import { ROSTER, BOSS, charById } from './characters.js';
import { FinisherRunner } from './finishers.js';
import { buildFighterModel, applyRigPose } from './model.js';
import { POSES, JOINTS } from './poses.js';
import { rand, pick, chance, DEG, clamp } from './util.js';
import { clayMat } from './clay.js';
import { modelSource, MODELS_KEY } from './ai_models.js';

const TICK = 1 / 12;           // stop-motion frame rate
const ROUND_TIME = 90;
const DIFFS = ['easy', 'normal', 'hard'];

const SETTINGS_KEY = 'claymatch.settings.v1';
function loadSettings() {
  const phone = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const d = { vol: 0.8, music: 0.5, shake: true, voice: false, grain: !phone, difficulty: 'normal', ...(phone ? { bloom: false } : {}) };
  try { return { ...d, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return d; }
}

export class Game {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.cam = new CameraRig(innerWidth / innerHeight);
    this.arena = new Arena(this.scene, renderer);
    this.particles = new Particles(this.scene);
    this.weapons = new Weapons(this);
    this.audio = new Audio();
    this.ui = new UI();
    this.crew = null; // built in init(), once the character assets are loaded
    this.commentary = new Commentary(this.ui, null);
    this.fighters = [];
    this.controllers = [null, null];
    this.timeScale = 1;
    this.animAcc = 0;
    this.mode = 'boot';
    this.match = null;
    this.paused = false;
    this.settings = loadSettings();
    this.applySettings();
    this.portraits = {};
    this.rec = [];
    this.events = this.makeEvents();
    this.ui.handlers.action = (a, el) => this.onAction(a, el);
    this.ui.handlers.hoverSlot = (i) => { if (this.mode === 'select' && !this.sel.ready[0]) { this.sel.cursor[0] = i; this.paintSelect(); } };
    this.ui.handlers.clickSlot = (i) => { if (this.mode === 'select') { this.sel.cursor[0] = i; this.pickSlot(0); } };
    this.bindOptions();
    // Browsers only allow audio after a gesture.
    const unlock = () => { this.audio.init(); this.audio.setVolume(this.settings.vol); this.audio.setMusicVolume(this.settings.music); if (this.mode !== 'fight') this.audio.startMusic(); };
    addEventListener('pointerdown', unlock, { once: true });
    addEventListener('keydown', unlock, { once: true });
  }

  init() {
    this.crew = new Crew(this);
    this.commentary.crew = this.crew;
  }

  // ------------------------------------------------------------- settings
  applySettings() {
    const s = this.settings;
    this.cam.shakeOn = s.shake;
    document.getElementById('grain').classList.toggle('off', !s.grain);
    this.audio.setVolume(s.vol);
    this.audio.setMusicVolume(s.music);
    this.commentary.setVoice(s.voice);
    document.getElementById('diff-label').textContent = `◀ ${s.difficulty[0].toUpperCase() + s.difficulty.slice(1)} ▶`;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
  }
  bindOptions() {
    const s = this.settings;
    const vol = document.getElementById('opt-vol'), mus = document.getElementById('opt-music');
    const shake = document.getElementById('opt-shake'), voice = document.getElementById('opt-voice'), grain = document.getElementById('opt-grain'), bloom = document.getElementById('opt-bloom');
    bloom.checked = s.bloom !== false;
    bloom.onchange = () => { s.bloom = bloom.checked; this.applySettings(); };
    vol.value = s.vol; mus.value = s.music; shake.checked = s.shake; voice.checked = s.voice; grain.checked = s.grain;
    vol.oninput = () => { s.vol = +vol.value; this.applySettings(); };
    mus.oninput = () => { s.music = +mus.value; this.applySettings(); };
    shake.onchange = () => { s.shake = shake.checked; this.applySettings(); };
    voice.onchange = () => { s.voice = voice.checked; this.applySettings(); };
    grain.onchange = () => { s.grain = grain.checked; this.applySettings(); };
    // Switching puppet sets reloads, since models load once at boot.
    const models = document.getElementById('opt-models');
    models.value = modelSource();
    models.onchange = () => {
      try { localStorage.setItem(MODELS_KEY, models.value); } catch {}
      const u = new URL(location.href); u.searchParams.delete('models'); location.href = u.toString();
    };
  }

  // ------------------------------------------------------------- portraits
  // Portraits are rendered a few at a time after the title is up, so boot
  // doesn't wait on sculpting the whole roster.
  renderPortraits(defs = [...ROSTER, BOSS]) {
    const size = 256;
    // One small offscreen renderer, kept until the whole roster is done.
    const r = this.portraitRenderer || (this.portraitRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }));
    r.setSize(size, size);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight('#c8d4ff', '#302040', 1.4));
    const key = new THREE.DirectionalLight('#ffe8d0', 2.6); key.position.set(2, 3, 4); sc.add(key);
    const rim = new THREE.DirectionalLight('#8ab0ff', 2.4); rim.position.set(-3, 2, -3); sc.add(rim);
    const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
    const out = document.createElement('canvas'); out.width = out.height = size;
    const ctx = out.getContext('2d');
    for (const def of defs) {
      if (this.portraits[def.id]) continue;
      const m = buildFighterModel(def);
      const J = m.joints;
      applyRigPose(m, POSES.guard);
      m.group.rotation.y = -0.35;
      sc.add(m.group);
      m.group.updateMatrixWorld(true);
      const hp = new THREE.Vector3();
      J.head.getWorldPosition(hp);
      const hr = J.head.userData.r * m.build.scale;
      hp.y += hr * 0.95;
      cam.position.set(hp.x + 0.25, hp.y + 0.05, hp.z + 2.3 * (def.boss ? 1.25 : 1));
      cam.lookAt(hp.x, hp.y - 0.12, hp.z);
      r.render(sc, cam);
      const g = ctx.createRadialGradient(size / 2, size * 0.4, 10, size / 2, size / 2, size * 0.75);
      g.addColorStop(0, '#3a5ad8'); g.addColorStop(1, '#0a1240');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
      ctx.drawImage(r.domElement, 0, 0);
      this.portraits[def.id] = out.toDataURL('image/png');
      sc.remove(m.group);
    }
    if (Object.keys(this.portraits).length >= ROSTER.length + 1) {
      r.dispose();
      r.forceContextLoss?.();
      this.portraitRenderer = null;
    }
  }

  // ------------------------------------------------------------- flow
  boot() {
    this.toTitle();
    const queue = [...ROSTER, BOSS];
    const next = () => {
      if (!queue.length) { this.portraitsReady = true; this.ui.buildRoster(ROSTER, this.portraits); return; }
      this.renderPortraits([queue.shift()]);
      setTimeout(next, 40);
    };
    setTimeout(next, 400);
  }

  ensurePortraits() {
    if (this.portraitsReady) return;
    this.renderPortraits();
    this.portraitsReady = true;
    this.ui.buildRoster(ROSTER, this.portraits);
  }

  toTitle() {
    this.mode = 'title';
    this.paused = false;
    this.ui.only('title');
    this.audio.startMusic();
    this.startAttract();
  }

  toMenu() {
    this.mode = 'menu';
    this.paused = false;
    this.ui.only('menu');
    this.audio.startMusic();
    if (!this.match || this.match.kind !== 'attract') this.startAttract();
  }

  startAttract() {
    const defs = [pick(ROSTER), null];
    defs[1] = pick(ROSTER.filter((c) => c !== defs[0]));
    this.setupMatch(defs, 'attract');
    this.beginRound(true);
  }

  onAction(a, el) {
    this.audio.play('ui');
    switch (a) {
      case 'start': if (this.mode === 'title') this.toMenu(); break;
      case 'pvc': case 'pvp': case 'cvc': case 'tourney': this.openSelect(a); break;
      case 'difficulty': this.cycleDifficulty(1); break;
      case 'howto': this.ui.show('howto'); this.ui.refocus(); break;
      case 'close-howto': this.ui.show('howto', false); this.ui.refocus(); break;
      case 'options': this.ui.setPauseMode('options'); this.ui.show('pause'); this.ui.refocus(); break;
      case 'close-options': this.ui.show('pause', false); this.ui.refocus(); break;
      case 'resume': this.setPaused(false); break;
      case 'quit': this.setPaused(false); this.endMatchCleanup(); this.toMenu(); break;
      case 'ladder-go': this.startLadderFight(); break;
      case 'rematch': this.startMatch(this.lastDefs, this.lastKind); break;
      case 'select': this.openSelect(this.lastKind === 'tourney' ? 'tourney' : this.lastKind); break;
      case 'menu': this.endMatchCleanup(); this.toMenu(); break;
      case 'next': this.ladder.idx++; this.showLadder(); break;
      case 'retry': this.startLadderFight(); break;
    }
  }

  cycleDifficulty(d) {
    const i = (DIFFS.indexOf(this.settings.difficulty) + d + 3) % 3;
    this.settings.difficulty = DIFFS[i];
    this.applySettings();
  }

  setPaused(p) {
    if (this.mode !== 'fight') return;
    this.paused = p;
    this.ui.setPauseMode('pause');
    this.ui.show('pause', p);
    if (p) { this.ui.refocus(); if ('speechSynthesis' in window) speechSynthesis.pause(); }
    else if ('speechSynthesis' in window) speechSynthesis.resume();
  }

  // ------------------------------------------------------------- select
  openSelect(kind) {
    this.selKind = kind;
    this.ensurePortraits();
    if (kind === 'cvc') {
      const a = pick(ROSTER), b = pick(ROSTER.filter((c) => c !== a));
      this.startMatch([a, b], 'cvc');
      return;
    }
    this.mode = 'select';
    this.ui.only('select');
    const two = kind === 'pvp';
    this.sel = { cursor: [0, two ? 1 : -1], ready: [false, !two], two };
    document.getElementById('select-hint').textContent = two
      ? 'P1: WASD + J · P2: Arrows + Enter · Esc to go back'
      : 'Arrows/WASD to move · Enter/J to pick · Esc to go back';
    this.paintSelect();
  }
  paintSelect() {
    const s = this.sel;
    const labels = ['PLAYER 1', s.two ? 'PLAYER 2' : 'CPU'];
    const cursors = [s.cursor[0], s.two ? s.cursor[1] : (s.cpuPick ?? -1)];
    this.ui.paintSelect(cursors, ROSTER, this.portraits, labels, s.ready);
  }
  moveCursor(p, dx, dy) {
    const s = this.sel;
    if (s.ready[p]) return;
    let i = s.cursor[p];
    const cols = 6, rows = Math.ceil(ROSTER.length / cols);
    const r = Math.floor(i / cols), c = i % cols;
    const nc = (c + dx + cols) % cols, nr = (r + dy + rows) % rows;
    s.cursor[p] = nr * cols + nc;
    this.audio.play('ui');
    this.paintSelect();
  }
  pickSlot(p) {
    const s = this.sel;
    if (s.ready[p]) return;
    s.ready[p] = true;
    this.audio.play('select');
    if (!s.two) {
      s.cpuPick = ROSTER.indexOf(pick(ROSTER.filter((_, i) => i !== s.cursor[0])));
    }
    this.paintSelect();
    if (s.ready[0] && s.ready[1]) {
      const a = ROSTER[s.cursor[0]];
      setTimeout(() => {
        if (this.mode !== 'select') return;
        if (this.selKind === 'tourney') this.startTourney(a);
        else this.startMatch([a, ROSTER[s.two ? s.cursor[1] : s.cpuPick]], this.selKind);
      }, 600);
    }
  }

  // ------------------------------------------------------------- tournament
  startTourney(player) {
    const others = ROSTER.filter((c) => c !== player).sort(() => Math.random() - 0.5).slice(0, 6);
    this.ladder = { player, list: [...others, BOSS], idx: 0 };
    this.showLadder();
  }
  showLadder() {
    const l = this.ladder;
    if (l.idx >= l.list.length) return;
    this.mode = 'ladder';
    this.ui.buildLadder(l.list, l.idx, this.portraits);
    this.ui.only('ladder');
    this.audio.startMusic();
  }
  startLadderFight() {
    const l = this.ladder;
    this.startMatch([l.player, l.list[l.idx]], 'tourney');
  }
  ladderLevel() {
    const base = DIFFS.indexOf(this.settings.difficulty);
    const step = [-1, -1, 0, 0, 0, 1, 1][this.ladder.idx] ?? 1;
    return DIFFS[clamp(base + step, 0, 2)];
  }

  // ------------------------------------------------------------- match setup
  setupMatch(defs, kind) {
    this.endMatchCleanup();
    for (const f of this.fighters) this.scene.remove(f.group);
    this.fighters = defs.map((d, i) => new Fighter(d, this, i));
    const [a, b] = this.fighters;
    a.opp = b; b.opp = a;
    for (const f of this.fighters) this.scene.add(f.group);
    const level = kind === 'tourney' ? this.ladderLevel() : this.settings.difficulty;
    if (kind === 'pvp') this.controllers = makeControllers('pvp');
    else if (kind === 'attract' || kind === 'cvc') this.controllers = [new AIController(kind === 'attract' ? 'normal' : level), new AIController(level)];
    else this.controllers = [makeControllers('pvc')[0], new AIController(level)];
    this.controllers.forEach((c, i) => { if (c instanceof AIController) c.f = this.fighters[i]; });
    this.match = { kind, round: 1, wins: [0, 0], need: 2, time: ROUND_TIME, phase: 'intro', pt: 0, over: false, lowWarned: [false, false] };
    this.weapons.reset();
    this.particles.clear();
    this.crew.reset();
    this.rec = [];
    this.ui.setNames(defs[0].name, defs[1].name);
    this.lastDefs = defs;
    this.lastKind = kind;
  }

  startMatch(defs, kind) {
    this.setupMatch(defs, kind);
    this.mode = 'fight';
    this.paused = false;
    this.ui.only('versus');
    this.audio.stopMusic();
    this.commentary.clear();
    this.versusIntro();
  }

  endMatchCleanup() {
    this.finisher?.cleanup();
    this.finisher = null;
    this.commentary.clear();
    this.timeScale = 1;
    this.cam.clearShot();
    this.cam.mode = 'iso';
    this.arena.setIntro(false);
    this.ui.replayBug(false);
    this.ui.hideBanner();
    this.ui.clearVersus();
    this.replay = null;
  }

  placeFighters(full = true) {
    const [a, b] = this.fighters;
    a.reset(full); b.reset(full);
    // Side by side on screen: P1 left, P2 right.
    a.placeAt(-1.25, 1.25, Math.PI * 0.75);
    b.placeAt(1.25, -1.25, -Math.PI * 0.25);
    a.yaw = a.dirTo(b); b.yaw = b.dirTo(a);
  }

  versusIntro() {
    const m = this.match;
    const [a, b] = this.fighters;
    this.placeFighters();
    m.phase = 'versus';
    m.pt = 0;
    this.arena.setIntro(true);
    this.arena.excite(0.8);
    this.commentary.say('intro', { p1: a.def.name, p2: b.def.name }, { all: true, force: true });
    const shotOn = (f) => {
      const fw = new THREE.Vector3(Math.sin(f.yaw), 0, Math.cos(f.yaw));
      const look = f.pos.clone().setY(RING_H + 1.5 * f.scale);
      const pos = look.clone().addScaledVector(fw, 4.6).add(new THREE.Vector3(fw.z * 1.2, 0.2, -fw.x * 1.2));
      this.cam.shot(pos, look, 2.6, { fov: 26, orbit: 0.12 });
    };
    m.script = [
      [0.0, () => { shotOn(a); this.ui.versus(0, a.def, 'IN THIS CORNER'); a.startMove('taunt', tauntMoveFor(a)); this.audio.play('special'); }],
      [2.5, () => { shotOn(b); this.ui.versus(1, b.def, 'AND HIS OPPONENT'.replace('HIS ', '')); b.startMove('taunt', tauntMoveFor(b)); this.audio.play('special'); }],
      [5.0, () => { this.cam.clearShot(); this.ui.versusMid(true); this.audio.play('slam'); this.cam.shake(0.6); this.arena.excite(1); this.audio.cheer(1); this.pyro(true); }],
      [6.3, () => { this.ui.clearVersus(); this.arena.setIntro(false); this.beginRound(); }],
    ];
  }

  beginRound(attract = false) {
    const m = this.match;
    this.placeFighters(m.round === 1);
    this.crew.reset();
    this.crew.hold = null;
    this.particles.clear();
    m.time = ROUND_TIME;
    m.phase = 'ready';
    m.pt = 0;
    m.script = null;
    m.waitReplay = false;
    m.timeout = false;
    m.koVictim = null;
    m.lowWarned = [false, false];
    this.timeScale = 1;
    this.cam.clearShot();
    this.cam.mode = 'iso';
    this.fighters.forEach((f, i) => { f.input = null; });
    if (attract || m.kind === 'attract') {
      m.phase = 'fight';
      this.bindInputs();
      return;
    }
    this.ui.only('hud');
    this.ui.setRound(m.round, m.wins, m.need);
    this.ui.updateBars(this.fighters);
    this.ui.setTimer(m.time);
    this.crew.refState = 'wave';
    this.crew.refPos.set(-1.0, 0, -1.0);
    m.script = [
      [0.2, () => { this.ui.banner(m.round === 3 ? 'FINAL ROUND' : `ROUND ${m.round}`, '', 1.1); this.commentary.say('round', { n: m.round }, { force: true }); }],
      [1.5, () => { this.ui.banner("LET'S GET IT ON!", '', 0.9); this.audio.play('bell'); this.audio.cheer(0.8); this.arena.excite(0.6); this.pyro(false); }],
      [2.3, () => { m.phase = 'fight'; this.crew.refState = 'idle'; this.bindInputs(); }],
    ];
  }

  bindInputs() {
    this.fighters.forEach((f, i) => { f.input = this.controllers[i]; });
  }

  // ------------------------------------------------------------- KO logic
  onZeroHealth(victim, att) {
    const m = this.match;
    if (!m || m.over || m.phase !== 'fight') return;
    const ai = this.fighters.indexOf(att ?? victim.opp);
    const deciding = m.wins[ai] + 1 >= m.need;
    const attacker = this.fighters[ai];
    if (deciding && attacker.meter >= 50 && m.kind !== 'attract') {
      victim.flags.clayTime = true;
      m.phase = 'claytime';
      m.pt = 0;
      m.clayAtt = attacker;
      attacker.meter = 100;
      this.ui.banner('CLAY TIME!', `${attacker.input instanceof AIController ? '' : 'Press SPECIAL next to them!'}`, 2.2, 'clay');
      this.commentary.say('clayTime', { d: victim.def.name, a: attacker.def.name }, { force: true, chain: true });
      this.audio.play('gong');
      this.arena.excite(1);
      this.timeScale = 0.4;
      return;
    }
    this.koWinner = ai;
    m.phase = 'ko';
    m.pt = 0;
    m.over = deciding;
    m.koVictim = victim;
    this.timeScale = 0.3;
    this.audio.play('ko');
    this.arena.excite(1);
    this.crew.cheer();
    if (m.kind !== 'attract') {
      if (deciding) this.pyro(true);
      this.ui.banner('K.O.!', '', 1.8);
      this.commentary.say('ko', { a: attacker.def.name, d: victim.def.name }, { force: true });
    }
  }

  onPinCount(victim, n) {
    const m = this.match;
    const pinner = victim.opp;
    if (n < 3) {
      const hpK = victim.hp / victim.maxHp;
      const p = clamp(hpK * 1.35 + victim.mash * 0.05 - n * 0.22, 0.03, 0.97);
      if (chance(p)) {
        pinner.endPin(true);
        this.crew.count = null;
        this.commentary.say('kickout', { d: victim.def.name }, { force: true });
        this.audio.cheer(0.7);
        this.arena.excite(0.6);
      }
      return;
    }
    // Three count.
    this.crew.count = null;
    pinner.endPin(false);
    victim.setState('ko');
    this.audio.play('ko');
    this.koWinner = this.fighters.indexOf(pinner);
    m.phase = 'ko';
    m.pt = 0;
    m.koVictim = victim;
    m.over = m.wins[this.koWinner] + 1 >= m.need;
    this.ui.banner('PINNED!', '1 · 2 · 3', 1.8);
    this.commentary.say('pinwin', { a: pinner.def.name }, { force: true });
    this.crew.cheer();
  }

  onCountOut(victim) {
    const m = this.match;
    if (m.phase !== 'fight') return;
    victim.hp = 0;
    victim.setState('ko');
    this.koWinner = this.fighters.indexOf(victim.opp);
    m.phase = 'ko'; m.pt = 0; m.koVictim = victim;
    m.over = m.wins[this.koWinner] + 1 >= m.need;
    this.ui.banner('10! K.O.!', '', 1.8);
    this.audio.play('ko');
  }

  timeUp() {
    const m = this.match;
    const [a, b] = this.fighters;
    const ka = a.hp / a.maxHp, kb = b.hp / b.maxHp;
    this.koWinner = ka >= kb ? 0 : 1;
    m.phase = 'ko'; m.pt = 0; m.koVictim = this.fighters[1 - this.koWinner];
    m.over = m.wins[this.koWinner] + 1 >= m.need;
    m.timeout = true;
    this.ui.banner('TIME!', '', 1.6);
    this.audio.play('bell');
    this.commentary.say('timeout', {}, { force: true });
    for (const f of this.fighters) { f.input = null; if (f.state !== 'down') f.setState('idle'); }
  }

  startFinisher() {
    const m = this.match;
    const att = m.clayAtt, vic = att.opp;
    m.phase = 'finisher';
    m.pt = 0;
    this.timeScale = 1;
    // The referee wisely steps back to a corner.
    this.crew.count = null;
    this.crew.refState = 'idle';
    this.crew.hold = new THREE.Vector3(vic.pos.x > 0 ? -2.6 : 2.6, 0, vic.pos.z > 0 ? -2.6 : 2.6);
    m.over = true;
    this.fighters.forEach((f) => (f.input = null));
    this.weapons.projectiles.forEach((p) => this.scene.remove(p.mesh));
    this.weapons.projectiles = [];
    this.finisher = new FinisherRunner(this, att, vic);
    this.koWinner = this.fighters.indexOf(att);
    this.commentary.say('finisher', { s: att.def.finisher.name, d: vic.def.name }, { force: true, chain: true });
    this.crew.cheer();
    this.audio.cheer(1);
  }

  // ------------------------------------------------------------- replay
  record() {
    const m = this.match;
    if (!m || m.kind === 'attract') return;
    if (m.phase !== 'fight' && m.phase !== 'ko' && m.phase !== 'claytime') return;
    if (m.phase === 'ko' && m.pt > 1.6) return;
    this.rec.push({ f: this.fighters.map((f) => f.snapshot()), ref: this.crew.snapshot(), hits: [] });
    if (this.rec.length > 60) this.rec.shift();
  }

  startReplay() {
    const m = this.match;
    const frames = this.rec.slice(-44);
    if (frames.length < 12) return false;
    this.replay = { frames, i: 0, acc: 0 };
    m.phase = 'replay';
    m.pt = 0;
    this.ui.replayBug(true);
    this.ui.hideBanner();
    const v = m.koVictim;
    const focus = v.pos.clone().setY(v.groundY + 0.9);
    this.cam.shot(focus.clone().add(new THREE.Vector3(-4.2, 0.9, 3.6)), focus, 6, { fov: 32, orbit: 0.18 });
    return true;
  }

  updateReplay(dt) {
    const r = this.replay;
    const slow = r.i > r.frames.length - 14;
    r.acc += dt * (slow ? 0.45 : 1);
    while (r.acc >= TICK && r.i < r.frames.length) {
      r.acc -= TICK;
      const fr = r.frames[r.i++];
      fr.f.forEach((s, k) => this.fighters[k].applySnapshot(s));
      this.crew.applySnapshot(fr.ref);
      for (const h of fr.hits) this.particles.chunks(new THREE.Vector3().fromArray(h.p), h.c, 6, 2.5);
      if (fr.hits.length) this.audio.play('punch');
    }
    if (r.i >= r.frames.length) {
      this.replay = null;
      this.ui.replayBug(false);
      this.cam.clearShot();
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------- end of round
  endRound() {
    const m = this.match;
    m.wins[this.koWinner]++;
    if (m.kind === 'attract') { this.startAttract(); return; }
    if (m.wins[this.koWinner] >= m.need) { this.matchWon(); return; }
    m.round++;
    // Keep the meters (and the bruises) into the next round.
    const meters = this.fighters.map((f) => f.meter);
    const bruises = this.fighters.map((f) => f.bruises);
    this.beginRound();
    this.fighters.forEach((f, i) => { f.meter = Math.min(100, meters[i] + 15); });
    void bruises;
  }

  matchWon() {
    const m = this.match;
    m.phase = 'won';
    m.pt = 0;
    m.over = true;
    const w = this.fighters[this.koWinner], l = w.opp;
    this.timeScale = 1;
    if (!this.finisher) {
      w.setState('victory');
      w.scripted = null;
      if (w.inRing) {
        this.crew.refState = 'raise';
        this.crew.refPos.set(w.pos.x + 0.8, 0, w.pos.z - 0.6);
      }
    }
    this.commentary.say('winner', { a: w.def.name }, { force: true, chain: true });
    this.audio.cheer(1);
    this.arena.excite(1);
    this.confetti();
    this.pyro(true);
    this.cam.shot(w.pos.clone().setY(w.groundY + 1.2).add(new THREE.Vector3(3.2, 0.8, 3.2)), w.pos.clone().setY(w.groundY + 1.2), 99, { fov: 30, orbit: 0.15, cut: false });

  }

  // Spark fountains on all four posts plus flame bursts on the apron.
  pyro(big = true) {
    if (this.match?.kind === 'attract' && this.mode !== 'title' && !big) return;
    for (const sx of [1, -1]) for (const sz of [1, -1]) {
      const p = new THREE.Vector3(sx * 3.55, RING_H + 1.75, sz * 3.55);
      this.particles.fountain(p, sx * sz > 0 ? '#ffd27a' : '#9ae8ff', big ? 34 : 18);
      // Flames on the far corners only, so they never blind the camera.
      if (big && !(sx > 0 && sz > 0)) this.particles.flame(new THREE.Vector3(sx * 4.6, 0.1, sz * 4.6), 10);
    }
    this.audio.play('slam', 0.4);
    this.audio.play('whoosh', 0.8);
  }

  confetti() {
    const colors = ['#ffd94a', '#ff4a8a', '#4ad0ff', '#7aff6a', '#ffffff', '#ff8a3a'];
    const geo = new THREE.BoxGeometry(0.08, 0.01, 0.05);
    for (let i = 0; i < 120; i++) {
      this.particles.spawn(geo, clayMat(pick(colors), { smooth: true, rim: 0 }), new THREE.Vector3(rand(-4, 4), rand(7, 10), rand(-4, 4)), new THREE.Vector3(rand(-0.5, 0.5), rand(-1, 0), rand(-0.5, 0.5)), { life: rand(4, 6), grav: 0.9, bounce: 0 });
    }
  }

  showResults() {
    const m = this.match;
    if (!m || this.mode !== 'fight') return;
    this.mode = 'results';
    const w = this.fighters[this.koWinner], l = w.opp;
    const human = this.controllers[this.koWinner] && !(this.controllers[this.koWinner] instanceof AIController);
    const stats = [['Hits landed', w.stats.hits], ['Best combo', w.stats.maxCombo], ['Weapon shots', w.stats.weaponHits], ['Damage', Math.round(w.stats.dmg)]];
    let kicker = 'WINNER', sub = this.finisher ? `${w.def.finisher.name}! ${l.def.name} needs a new mold.` : `${l.def.name} has been flattened.`;
    let actions = [['rematch', 'Rematch'], ['select', 'Character select'], ['menu', 'Main menu']];
    if (m.kind === 'tourney') {
      const l2 = this.ladder;
      if (human) {
        if (l2.idx >= l2.list.length - 1) { kicker = 'CHAMPION!'; sub = `${w.def.name} is the undisputed Singularity Deathmatch champion.`; actions = [['menu', 'Main menu']]; }
        else { kicker = `FIGHT ${l2.idx + 1} OF ${l2.list.length} WON`; actions = [['next', 'Next fight'], ['menu', 'Quit']]; }
      } else {
        kicker = 'DEFEATED'; sub = `${w.def.name} beat you. Continue?`;
        actions = [['retry', 'Continue'], ['menu', 'Quit']];
      }
    }
    this.ui.results(kicker, w.def.name, sub, stats, actions);
    this.ui.only('results');
    this.audio.startMusic();
  }

  // ------------------------------------------------------------- events
  makeEvents() {
    const say = (e, c, o) => { if (this.match?.kind !== 'attract') this.commentary.say(e, c, o); };
    return {
      onHit: (att, def, h, dmg) => {
        const i = this.fighters.indexOf(att);
        if (this.match?.kind !== 'attract') this.ui.showCombo(i, att.combo);
        if (this.rec.length) this.rec[this.rec.length - 1].hits.push({ p: def.headWorld().toArray(), c: def.def.skin });
        if (att.combo >= 4) say('combo', { n: att.combo, a: att.def.name });
        else if (att.hp < att.maxHp * 0.3 && att.combo >= 3) say('comeback', { a: att.def.name });
        else if (h.big && att.def.quips && chance(0.45) && this.match?.kind !== 'attract') this.commentary.sayText(pick(att.def.quips), Math.random() < 0.5 ? 0 : 1);
        else if (h.big || chance(0.25)) say('hit', { a: att.def.name, d: def.def.name });
        const m = this.match;
        const di = this.fighters.indexOf(def);
        if (m && !m.lowWarned[di] && def.hp < def.maxHp * 0.25 && def.hp > 0) { m.lowWarned[di] = true; say('lowHp', { d: def.def.name }, { force: true }); }
        if (h.big) this.audio.cheer(0.5);
      },
      onTaunt: (f) => { say('taunt', { a: f.def.name }); this.audio.cheer(0.5); },
      onWeapon: (f, w) => say('weapon', { a: f.def.name, w: w.name }, { force: true }),
      onWeaponBreak: (w) => say('weaponBreak', { w: w.name, d: w.owner?.opp?.def.name || 'that guy' }),
      onSlam: (a, v, spin) => { say(spin ? 'spinslam' : 'slam', { a: a.def.name, d: v.def.name }, { force: true }); this.audio.cheer(0.8); },
      onOverTop: (a, v) => { say('overTop', { d: v.def.name }, { force: true }); this.audio.cheer(1); this.arena.excite(1); },
      onSpecial: (f, name) => say('special', { a: f.def.name, s: name }, { force: true }),
      onHeadPop: (f) => { say('headPop', { d: f.def.name }, { force: true, chain: true }); this.audio.cheer(1); },
      onRefHit: (a) => { say('refHit', { a: a.def.name }, { force: true }); this.audio.cheer(0.8); },
      onRefDown: () => say('refDown', {}, { force: true }),
      onPin: (a, v) => say('pin', { a: a.def.name }, { force: true }),
      onPerch: (f) => { say('dive', { a: f.def.name }); this.arena.excite(0.8); },
      onCrash: (f) => say('crash', { a: f.def.name }, { force: true }),
      onEscape: (f) => say('escape', { d: f.def.name }),
      onRail: (f) => say('rail', { d: f.def.name }),
      onLand: (f) => {
        const m = this.match;
        if (m && m.phase === 'fight' && f.inRing && f.hp > 0 && m.kind !== 'attract') this.crew.startCount(f, 'down');
      },
    };
  }

  // ------------------------------------------------------------- main update
  frame(dt) {
    this.handleMenus();
    if (this.paused) { endFrame(); return; }
    const m = this.match;
    const sdt = dt * this.timeScale;
    if (m) this.updateMatch(dt, sdt);
    this.arena.update(sdt);
    this.particles.update(sdt, this.fighters);
    this.commentary.update(dt);
    this.cam.update(dt, this.cam.mode === 'iso' ? this.fighters : []);
    // Stop-motion ticks.
    this.animAcc += sdt;
    let ticks = 0;
    while (this.animAcc >= TICK && ticks < 3) {
      this.animAcc -= TICK;
      ticks++;
      this.animTick();
    }
    if (m && m.phase !== 'replay') this.ui.updateBars(this.fighters);
    this.audio.setCrowd(this.arena.excitement);
    endFrame();
  }

  animTick() {
    if (!this.replay) {
      for (const f of this.fighters) f.animTick(TICK);
      this.crew.animTick(TICK);
      this.record();
    } else {
      this.crew.announcers.length && this.crew.animTick(TICK);
    }
    this.arena.animTick();
    this.weapons.animTick();
    this.finisher?.animTick();
    // The video wall updates at stop-motion rate too.
    if (this.fighters.length === 2) {
      const [a, b] = this.fighters;
      this.arena.renderTV(this.renderer, this.scene, new THREE.Vector3((a.pos.x + b.pos.x) / 2, 0, (a.pos.z + b.pos.z) / 2));
    }
  }

  updateMatch(dt, sdt) {
    const m = this.match;
    m.pt += dt;
    // Timed script steps.
    if (m.script) {
      for (const step of m.script) if (!step.done && m.pt >= step[0]) { step.done = true; step[1](); }
    }
    if (m.phase === 'replay') {
      if (this.updateReplay(dt) || this.skipPressed()) {
        if (this.replay) { this.replay = null; this.ui.replayBug(false); this.cam.clearShot(); }
        this.endRound();
      }
      return;
    }
    // Controllers.
    for (const c of this.controllers) c?.poll(dt);
    if (m.phase === 'fight' && m.kind !== 'attract') {
      m.time -= dt;
      this.ui.setTimer(m.time);
      if (m.time <= 0) this.timeUp();
    }
    if (m.phase === 'claytime') {
      if (m.pt > 0.6) this.timeScale = 1;
      const att = m.clayAtt, vic = att.opp;
      const fr = att.input?.frame;
      if (fr?.pressed.special && att.distTo(vic) < 1.8 && ['idle', 'walk'].includes(att.state)) { this.startFinisher(); }
      else if (m.pt > 7) {
        // Missed the window: they just topple over.
        vic.flags.clayTime = false;
        vic.setState('knock'); vic.vy = 2; vic.y = 0.01;
        this.koWinner = this.fighters.indexOf(att);
        m.phase = 'ko'; m.pt = 0; m.koVictim = vic; m.over = true;
        this.ui.banner('K.O.!', '', 1.6);
        this.audio.play('ko');
      }
    }
    if (m.phase === 'finisher') {
      this.finisher.update(sdt);
      if (this.finisher.done && m.pt > this.finisher.dur + 0.6 && !m.finEnd) {
        m.finEnd = true;
        m.finEndT = m.pt;
        this.ui.banner(this.finisher.name.toUpperCase(), 'FINISHER', 2.2, 'clay');
      }
      if (m.finEnd && m.pt > m.finEndT + 1.4) this.matchWon();
    }
    for (const f of this.fighters) {
      f.update(sdt);
      f.updateHead(sdt);
    }
    this.separate();
    this.crew.update(sdt);
    this.weapons.update(sdt);
    if (m.phase === 'ko') {
      const v = m.koVictim;
      if (v.state === 'down' && v.hp <= 0) v.setState('ko');
      if (m.pt > 1.2) this.timeScale = 1;
      // Everyone stops fighting.
      if (m.pt > 0.2) this.fighters.forEach((f) => (f.input = null));
      if (m.pt > 2.6 && !m.waitReplay) {
        m.waitReplay = true;
        if (m.kind === 'attract' || m.timeout || !this.startReplay()) this.endRound();
      }
    }
    if (m.phase === 'won') {
      if (m.pt > 2.6 && this.mode === 'fight') this.showResults();
      const w = this.fighters[this.koWinner];
      if (w.state !== 'victory' && !w.scripted) w.setState('victory');
    }
  }

  // Bodies don't overlap.
  separate() {
    const [a, b] = this.fighters;
    if (!a || !b || !a.sameArea(b)) return;
    const skip = ['grabbed', 'thrown', 'pinned', 'pin', 'ko', 'down', 'knock', 'dive', 'climb', 'perch'];
    if (skip.includes(a.state) || skip.includes(b.state) || a.scripted || b.scripted) return;
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
    const d = Math.hypot(dx, dz), min = a.radius + b.radius;
    if (d < min && d > 1e-4) {
      const push = (min - d) / 2;
      a.pos.x -= (dx / d) * push; a.pos.z -= (dz / d) * push;
      b.pos.x += (dx / d) * push; b.pos.z += (dz / d) * push;
    }
  }

  skipPressed() {
    return this.lastMenu?.confirm || this.lastMenu?.back;
  }

  // ------------------------------------------------------------- menu input
  handleMenus() {
    const mi = menuInput();
    this.lastMenu = mi;
    const ui = this.ui;
    if (this.mode === 'fight') {
      if (mi.pause && !this.paused && this.match?.phase !== 'won') { this.setPaused(true); return; }
      if (this.paused) {
        if (ui.isShown('howto')) { if (mi.back || mi.confirm) { ui.show('howto', false); ui.refocus(); } return; }
        if (mi.back) { this.setPaused(false); return; }
        this.navigate(mi);
        return;
      }
      if (this.match?.phase === 'versus' && mi.confirm) {
        // Skip the entrances.
        this.match.script.forEach((s) => (s.done = true));
        this.cam.clearShot();
        this.ui.clearVersus();
        this.arena.setIntro(false);
        this.fighters.forEach((f) => f.setState('idle'));
        this.beginRound();
      }
      return;
    }
    if (this.mode === 'title') {
      if (mi.any && (mi.confirm || mi.any)) { this.audio.play('select'); this.toMenu(); }
      return;
    }
    if (ui.isShown('howto')) { if (mi.back || mi.confirm) { ui.show('howto', false); ui.refocus(); } return; }
    if (this.mode === 'select') {
      const s = this.sel;
      if (mi.back) {
        if (s.ready[0] && (!s.two || !s.ready[1])) { s.ready[0] = false; if (!s.two) s.ready[1] = true; s.cpuPick = undefined; this.paintSelect(); }
        else this.toMenu();
        return;
      }
      const p1 = s.two ? mi.p1 : mi;
      if (p1.left) this.moveCursor(0, -1, 0);
      if (p1.right) this.moveCursor(0, 1, 0);
      if (p1.up) this.moveCursor(0, 0, -1);
      if (p1.down) this.moveCursor(0, 0, 1);
      if (p1.confirm) this.pickSlot(0);
      if (s.two) {
        const p2 = mi.p2;
        if (p2.left) this.moveCursor(1, -1, 0);
        if (p2.right) this.moveCursor(1, 1, 0);
        if (p2.up) this.moveCursor(1, 0, -1);
        if (p2.down) this.moveCursor(1, 0, 1);
        if (p2.confirm) this.pickSlot(1);
      }
      return;
    }
    if (this.mode === 'ladder') {
      if (mi.confirm) this.startLadderFight();
      if (mi.back) this.toMenu();
      return;
    }
    if (this.mode === 'menu' || this.mode === 'results') {
      if (mi.back && ui.isShown('pause')) { ui.show('pause', false); ui.refocus(); return; }
      if (mi.back && this.mode === 'menu') { this.toTitle(); return; }
      this.navigate(mi);
    }
  }

  navigate(mi) {
    const ui = this.ui;
    if (mi.up) { ui.moveFocus(-1); this.audio.play('ui'); }
    if (mi.down) { ui.moveFocus(1); this.audio.play('ui'); }
    const f = ui.focused();
    if (!f) return;
    if (f.dataset.action === 'difficulty' && (mi.left || mi.right)) { this.cycleDifficulty(mi.left ? -1 : 1); this.audio.play('ui'); }
    const range = f.querySelector?.('input[type=range]');
    if (range && (mi.left || mi.right)) { range.value = +range.value + (mi.left ? -0.1 : 0.1); range.oninput(); }
    if (this.mode === 'results' && (mi.left || mi.right)) { ui.moveFocus(mi.left ? -1 : 1); }
    if (mi.confirm) {
      const cb = f.querySelector?.('input[type=checkbox]');
      if (cb) { cb.checked = !cb.checked; cb.onchange(); }
      else if (f.tagName === 'BUTTON') f.click();
    }
  }

  resize(w, h) {
    this.cam.setAspect(w / h);
  }
}

function tauntMoveFor(f) {
  const style = f.def.taunt;
  const T = { flex: ['flex', 'flex2'], point: ['point', 'guard'], raise: ['raise', 'raise2'], hips: ['hips1', 'hips2'], horns: ['horns', 'horns2'], bow: ['stand', 'bow'], hair: ['hair', 'stand'], phone: ['phone', 'phone'], pound: ['pound1', 'pound2'] }[style] || ['raise', 'raise2'];
  return { dur: 2.4, keys: [[0, T[0]], [0.35, T[1]], [0.7, T[0]], [1.05, T[1]], [1.4, T[0]], [1.75, T[1]], [2.1, T[0]], [2.4, 'guard']] };
}
