// A fighter: clay puppet + combat state machine. Logic runs every frame;
// the puppet only updates on 12fps "stop-motion" ticks.
import * as THREE from 'three';
import { buildFighterModel, setExpression, addBruise } from './model.js';
import { boil } from './clay.js';
import { POSES, MOVES, JOINTS, tauntMove, loopKeys } from './poses.js';
import { clamp, lerp, rand, chance, DEG, approachAngle, wrapAngle, easeInOut } from './util.js';

export const RING = 3.0;        // max |x|/|z| of a body inside the ropes
export const APRON = 3.9;       // min |x|/|z| when outside the ring
export const FLOOR = 6.2;       // guard rail limit
export const RING_H = 0.62;     // mat height
export const POST = 3.55;

const GRAVITY = 18;
const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();

function samplePose(keys, t) {
  if (!keys || !keys.length) return POSES.guard;
  if (t <= keys[0][0]) return resolve(keys[0][1]);
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, a] = keys[i], [t1, b] = keys[i + 1];
    if (t >= t0 && t <= t1) {
      const k = t1 - t0 < 1e-4 ? 1 : easeInOut((t - t0) / (t1 - t0));
      return blend(resolve(a), resolve(b), k);
    }
  }
  return resolve(keys[keys.length - 1][1]);
}
const resolve = (p) => (typeof p === 'string' ? POSES[p] || POSES.guard : p);
function blend(a, b, k) {
  const o = { rootY: lerp(a.rootY, b.rootY, k), rootFwd: lerp(a.rootFwd, b.rootFwd, k), rootSide: lerp(a.rootSide, b.rootSide, k) };
  o.root = [0, 1, 2].map((i) => lerp(a.root[i], b.root[i], k));
  for (const j of JOINTS) o[j] = [0, 1, 2].map((i) => lerp(a[j][i], b[j][i], k));
  return o;
}

export class Fighter {
  constructor(def, game, idx) {
    this.def = def;
    this.game = game;
    this.idx = idx;
    const m = buildFighterModel(def);
    this.model = m;
    this.group = new THREE.Group();
    this.group.add(m.group);
    this.J = m.joints;
    this.face = m.face;
    this.scale = m.build.scale;
    const s = def.stats;
    this.maxHp = def.boss ? 150 : 100;
    this.dmgMul = 0.8 + s.power * 0.09;
    this.defMul = 1.18 - s.tough * 0.07;
    this.speed = 2.3 + s.speed * 0.28;
    this.radius = 0.38 * this.scale;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.y = 0; this.vy = 0;
    this.yaw = 0;
    this.inRing = true;
    this.input = null;
    this.opp = null;
    this.animClock = 0;
    this.reset();
  }

  reset(full = true) {
    if (this.headOff) {
      const head = this.headOff.mesh;
      this.J.neck.attach(head);
      head.position.set(0, 0.09, 0);
      head.rotation.set(0, 0, 0);
      this.headOff = null;
    }
    this.flat = false;
    this.liftRot = 0;
    this.spinYaw = 0;
    this.hp = this.maxHp;
    this.meter = 0;
    this.state = 'idle';
    this.st = 0;
    this.move = null; this.moveName = ''; this.mt = 0;
    this.hitDone = false; this.multiNext = 0;
    this.comboQueued = false;
    this.hitstop = 0;
    this.invuln = 0;
    this.downTime = 0;
    this.mash = 0;
    this.edgeT = 0; this.edgeAxis = null;
    this.grapple = null;
    this.thrownBy = null;
    this.weapon?.drop?.(this);
    this.weapon = null;
    this.flags = {};
    this.squish = 0; this.squishKind = 'head';
    this.headOff = null;
    if (full || !this.bruises) {
      this.bruises?.forEach((b) => b.parent?.remove(b));
      this.bruises = [];
      this.J.head.scale.set(1, 1, 1);
    }
    this.damageSinceBruise = 0;
    this.stats = { hits: 0, maxCombo: 0, weaponHits: 0, dmg: 0 };
    this.combo = 0; this.comboT = 0;
    this.expr = 'grit';
    this.exprT = 0;
    this.pose = POSES.guard;
    this.y = 0; this.vy = 0; this.vel.set(0, 0, 0);
    this.scripted = null;
    this.scriptPose = null;
    this.model.group.scale.setScalar(this.scale);
    this.model.group.rotation.set(0, 0, 0);
    this.model.group.position.set(0, 0, 0);
    this.model.group.visible = true;
    setExpression(this.face, 'grit');
  }

  get groundY() { return this.inRing ? RING_H : 0; }
  get forward() { return tmpV.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  get alive() { return this.hp > 0; }
  get isDown() { return ['down', 'getup', 'ko', 'pinned', 'knock'].includes(this.state); }
  get busy() { return !['idle', 'walk'].includes(this.state); }

  placeAt(x, z, yaw, inRing = true) {
    this.pos.set(x, 0, z);
    this.yaw = yaw;
    this.inRing = inRing;
    this.y = 0;
    this.syncVisual();
  }

  setState(s, extra) {
    this.state = s;
    this.st = 0;
    if (s !== 'attack') { this.move = null; this.moveName = ''; }
    if (extra) Object.assign(this.flags, extra);
  }

  startMove(name, moveDef) {
    const mv = moveDef || MOVES[name];
    this.state = 'attack';
    this.st = 0;
    this.move = mv;
    this.moveName = name;
    this.mt = 0;
    this.hitDone = false;
    this.moveSerial = (this.moveSerial || 0) + 1;
    this.multiNext = mv.multi ? mv.multi.from : 0;
    this.comboQueued = false;
    if (mv.hop) { this.vy = mv.hop; }
    if (mv.expr) this.setExpr(mv.expr, mv.dur);
    this.game.events.onMove?.(this, name);
  }

  setExpr(e, t = 0.5) { this.expr = e; this.exprT = t; }

  dirTo(other) {
    return Math.atan2(other.pos.x - this.pos.x, other.pos.z - this.pos.z);
  }
  distTo(other) { return Math.hypot(other.pos.x - this.pos.x, other.pos.z - this.pos.z); }
  sameArea(o) { return this.inRing === o.inRing; }

  // ---------------------------------------------------------------- update
  update(dt) {
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    this.st += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.exprT > 0) { this.exprT -= dt; if (this.exprT <= 0) this.expr = this.hp < this.maxHp * 0.3 ? 'angry' : 'grit'; }
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (this.squish > 0) this.squish = Math.max(0, this.squish - dt * 2.4);
    const inp = this.input?.frame || EMPTY;
    if (this.scripted) { this.scripted(dt); this.physics(dt, true); return; }

    switch (this.state) {
      case 'idle': case 'walk': this.updateFree(dt, inp); break;
      case 'run': this.updateRun(dt, inp); break;
      case 'block':
        this.faceOpp(dt, 10);
        if (!inp.held.block) this.setState('idle');
        break;
      case 'attack': this.updateMove(dt, inp); break;
      case 'hitstun':
        if (this.st > this.flags.stun) this.setState('idle');
        break;
      case 'knock':
        if (this.y <= 0.001 && this.vy <= 0 && this.st > 0.1) this.land();
        break;
      case 'down': {
        if (inp.anyPressed) this.mash += 1;
        const need = this.downTime - this.mash * 0.12;
        if (this.hp > 0 && this.st > need && !this.flags.noGetup) this.startGetup();
        break;
      }
      case 'getup':
        this.mt += dt;
        if (this.mt >= MOVES.getup.dur) { this.setState('idle'); this.invuln = 0.35; }
        break;
      case 'grappling': this.updateGrapple(dt, inp); break;
      case 'grabbed':
        if (inp.anyPressed) this.mash += 1;
        break;
      case 'thrown': break; // driven by the thrower
      case 'whipped': this.updateWhipped(dt); break;
      case 'dizzy':
        if (this.st > this.flags.dizzy && !this.flags.forever) this.setState('idle');
        break;
      case 'climb': this.updateClimb(dt); break;
      case 'perch': this.updatePerch(dt, inp); break;
      case 'dive': this.updateDive(dt); break;
      case 'pin': break;
      case 'pinned':
        if (inp.anyPressed) this.mash += 1;
        break;
      case 'ko': case 'victory': case 'frozen': break;
    }
    this.physics(dt);
  }

  faceOpp(dt, rate = 8) {
    if (!this.opp) return;
    this.yaw = approachAngle(this.yaw, this.dirTo(this.opp), rate * dt);
  }

  updateFree(dt, inp) {
    const o = this.opp;
    const d = inp.dir;
    const moving = d.lengthSq() > 0.04;
    this.faceOpp(dt, 9);
    if (inp.pressed.block && !this.weapon) {
      const w = this.game.weapons.nearest(this, 0.95);
      if (w) { this.startMove('pickup'); this.flags.pickupTarget = w; return; }
    }
    if (inp.held.block) { this.setState('block'); return; }
    if (inp.pressed.grab && this.weapon) { this.dropWeapon(); return; }
    if (inp.pressed.special) {
      if (this.meter >= 50) { this.doSpecial(); return; }
      this.startMove('taunt', tauntMove(this.def.taunt));
      this.game.events.onTaunt?.(this);
      return;
    }
    const oppDown = o && o.isDown && o.state !== 'knock' && this.sameArea(o) && this.distTo(o) < 1.35;
    if (inp.pressed.punch) {
      if (this.weapon) this.startMove('wswing');
      else if (oppDown) this.startMove('stomp');
      else this.startMove('jab');
      return;
    }
    if (inp.pressed.kick) {
      if (this.weapon) { this.startMove('wthrow'); return; }
      if (oppDown) this.startMove('stomp');
      else this.startMove('kick');
      return;
    }
    if (inp.pressed.grab) {
      if (oppDown && ['down'].includes(o.state) && this.inRing && o.inRing) { this.startPin(); return; }
      if (this.canGrab(o)) { this.startGrapple(o); return; }
      this.startMove('whiff');
      return;
    }
    if (moving) {
      if (inp.held.run || inp.doubleTap) { this.setState('run'); this.flags.runDir = Math.atan2(d.x, d.y); return; }
      this.state = 'walk';
      const sp = this.speed * (this.weapon ? 0.85 : 1);
      this.pos.x += d.x * sp * dt;
      this.pos.z += d.y * sp * dt;
      this.walkPhase = (this.walkPhase || 0) + dt * sp * 1.6;
      this.checkEdge(dt, d);
    } else {
      this.state = 'idle';
      this.edgeT = 0;
    }
  }

  canGrab(o) {
    if (!o || !this.sameArea(o) || o.invuln > 0) return false;
    if (!['idle', 'walk', 'block', 'hitstun', 'dizzy', 'run', 'attack'].includes(o.state)) return false;
    if (o.state === 'attack' && o.move && o.move.hop) return false;
    if (Math.abs(o.y - this.y) > 0.5) return false;
    return this.distTo(o) < 1.05 * Math.max(this.scale, o.scale);
  }

  // Pushing into the ropes long enough climbs through them, or up a corner.
  checkEdge(dt, d) {
    const p = this.pos;
    let axis = null, sign = 0;
    if (this.inRing) {
      const nearX = Math.abs(p.x) > RING - 0.05 && Math.sign(d.x) === Math.sign(p.x) && Math.abs(d.x) > 0.3;
      const nearZ = Math.abs(p.z) > RING - 0.05 && Math.sign(d.y) === Math.sign(p.z) && Math.abs(d.y) > 0.3;
      const corner = Math.abs(p.x) > RING - 0.6 && Math.abs(p.z) > RING - 0.6;
      if (corner && (nearX || nearZ) && Math.abs(d.x) > 0.25 && Math.abs(d.y) > 0.25 && Math.sign(d.x) === Math.sign(p.x) && Math.sign(d.y) === Math.sign(p.z)) {
        axis = 'corner';
      } else if (nearX && !corner) { axis = 'x'; sign = Math.sign(p.x); }
      else if (nearZ && !corner) { axis = 'z'; sign = Math.sign(p.z); }
    } else {
      const ax = Math.abs(p.x), az = Math.abs(p.z);
      if (ax < APRON + 0.15 && az < POST - 0.3 && Math.sign(d.x) === -Math.sign(p.x) && Math.abs(d.x) > 0.3) { axis = 'x'; sign = Math.sign(p.x); }
      else if (az < APRON + 0.15 && ax < POST - 0.3 && Math.sign(d.y) === -Math.sign(p.z) && Math.abs(d.y) > 0.3) { axis = 'z'; sign = Math.sign(p.z); }
    }
    if (axis && axis === this.edgeAxis) {
      this.edgeT += dt;
      const need = axis === 'corner' ? 0.32 : 0.45;
      if (this.edgeT > need) {
        this.edgeT = 0;
        if (axis === 'corner') this.startClimbTB();
        else this.startClimbRopes(axis, sign);
      }
    } else {
      this.edgeAxis = axis;
      this.edgeT = 0;
    }
  }

  startClimbRopes(axis, sign) {
    const from = this.pos.clone();
    const to = from.clone();
    const out = this.inRing;
    if (axis === 'x') to.x = sign * (out ? APRON + 0.25 : RING - 0.2);
    else to.z = sign * (out ? APRON + 0.25 : RING - 0.2);
    this.setState('climb', { climb: { from, to, out, dur: MOVES.climbOut.dur, keys: MOVES.climbOut.keys } });
    this.yaw = Math.atan2(to.x - from.x, to.z - from.z);
    this.game.audio.play('rope');
    this.game.arena.bumpRope(axis, sign, 0.12);
  }

  startClimbTB() {
    const sx = Math.sign(this.pos.x), sz = Math.sign(this.pos.z);
    const from = this.pos.clone();
    const to = new THREE.Vector3(sx * (RING + 0.05), 0, sz * (RING + 0.05));
    this.setState('climb', { climb: { from, to, tb: true, dur: MOVES.climbTB.dur, keys: MOVES.climbTB.keys } });
    this.yaw = Math.atan2(-sx, -sz);
    this.game.audio.play('rope');
  }

  updateClimb(dt) {
    const c = this.flags.climb;
    const k = clamp(this.st / c.dur, 0, 1);
    this.pos.lerpVectors(c.from, c.to, easeInOut(k));
    if (c.tb) {
      this.y = Math.sin(k * Math.PI * 0.5) * 1.1;
      if (k >= 1) { this.setState('perch'); this.y = 1.1; this.game.events.onPerch?.(this); }
    } else if (c.down) {
      this.y = lerp(1.1, 0, k);
      if (k >= 1) { this.y = 0; this.setState('idle'); }
    } else {
      // Ring height changes halfway through the ropes.
      const h0 = c.out ? RING_H : 0, h1 = c.out ? 0 : RING_H;
      const hy = lerp(h0, h1, k) + Math.sin(k * Math.PI) * 0.15;
      this.inRing = k < 0.5 ? c.out : !c.out;
      this.y = hy - this.groundY;
      if (k >= 1) { this.inRing = !c.out; this.y = 0; this.setState('idle'); }
    }
  }

  updatePerch(dt, inp) {
    this.y = 1.1;
    this.faceOpp(dt, 6);
    if (inp.pressed.punch || inp.pressed.kick || inp.pressed.special || this.st > 4) {
      const o = this.opp;
      const target = o.pos.clone();
      const d = Math.min(this.distTo(o), 4.2);
      const dir = Math.atan2(target.x - this.pos.x, target.z - this.pos.z);
      this.yaw = dir;
      target.set(this.pos.x + Math.sin(dir) * d, 0, this.pos.z + Math.cos(dir) * d);
      target.x = clamp(target.x, -RING, RING);
      target.z = clamp(target.z, -RING, RING);
      const T = 0.7;
      this.vel.set((target.x - this.pos.x) / T, 0, (target.z - this.pos.z) / T);
      this.vy = 6;
      this.setState('dive');
      this.game.events.onDive?.(this);
      return;
    }
    if (inp.pressed.block || inp.pressed.grab) {
      this.setState('climb', { climb: { from: this.pos.clone(), to: new THREE.Vector3(this.pos.x * 0.85, 0, this.pos.z * 0.85), tb: false, out: false, dur: 0.4, keys: [[0, 'perch'], [0.4, 'guard']], down: true } });
      this.flags.climb.out = false;
      this.flags.climb.down = true;
    }
  }

  updateDive(dt) {
    if (this.y <= 0.0001 && this.st > 0.15) {
      const o = this.opp;
      this.vel.set(0, 0, 0);
      const hit = o.sameArea(this) && this.distTo(o) < 1.25 && !o.invuln && !['thrown', 'grabbed'].includes(o.state);
      if (hit) {
        o.takeHit(this, { dmg: 18, kd: true, launch: 1.5, push: 1.5, sfx: 'heavy', part: 'body', big: true, unblockable: true, flat: true });
        this.setState('down');
        this.downTime = 0.5;
      } else {
        this.applyDamage(5, null);
        this.setState('down');
        this.downTime = 1.0;
        this.game.audio.play('squish');
        this.game.events.onCrash?.(this);
      }
      this.squish = 1; this.squishKind = 'body';
      this.game.cam.shake(0.5);
      this.game.particles.chunks(this.pos.clone().setY(this.groundY + 0.2), this.def.top.color, 10, 3);
    }
  }

  updateRun(dt, inp) {
    const d = inp.dir;
    if (d.lengthSq() < 0.04) { this.setState('idle'); return; }
    if (inp.pressed.punch) { this.startMove('clothesline'); this.flags.runYaw = this.yaw; return; }
    if (inp.pressed.kick) { this.startMove('dropkick'); this.flags.runYaw = this.yaw; return; }
    if (inp.pressed.grab && this.canGrab(this.opp)) { this.startGrapple(this.opp); return; }
    const want = Math.atan2(d.x, d.y);
    this.yaw = approachAngle(this.yaw, want, 7 * dt);
    const sp = this.speed * 2.05;
    this.pos.x += Math.sin(this.yaw) * sp * dt;
    this.pos.z += Math.cos(this.yaw) * sp * dt;
    this.walkPhase = (this.walkPhase || 0) + dt * sp * 1.4;
    this.ropeBounce();
  }

  // Inside the ring, running into the ropes springs you back.
  ropeBounce() {
    if (!this.inRing) return false;
    const p = this.pos;
    let b = false;
    if (Math.abs(p.x) > RING - 0.02 && Math.sign(Math.sin(this.yaw)) === Math.sign(p.x)) {
      this.yaw = Math.atan2(-Math.sin(this.yaw), Math.cos(this.yaw));
      this.game.arena.bumpRope('x', Math.sign(p.x), 0.35);
      b = true;
    }
    if (Math.abs(p.z) > RING - 0.02 && Math.sign(Math.cos(this.yaw)) === Math.sign(p.z)) {
      this.yaw = Math.atan2(Math.sin(this.yaw), -Math.cos(this.yaw));
      this.game.arena.bumpRope('z', Math.sign(p.z), 0.35);
      b = true;
    }
    if (b) this.game.audio.play('rope');
    return b;
  }

  updateMove(dt, inp) {
    const mv = this.move;
    this.mt += dt;
    const t = this.mt;
    // Forward drive for running / charging moves.
    if (mv.drive) {
      const [a, b] = mv.driveT || [0, mv.dur * 0.7];
      if (t >= a && t <= b) {
        const yaw = this.flags.runYaw ?? this.yaw;
        this.pos.x += Math.sin(yaw) * mv.drive * dt;
        this.pos.z += Math.cos(yaw) * mv.drive * dt;
        if (this.moveName === 'charge' && this.ropeBounce()) this.mt = Math.max(this.mt, b);
      }
    } else if (this.moveName !== 'spin' && t < 0.15) {
      this.faceOpp(dt, 14);
    }
    if (mv.spin) this.spinYaw = (t / mv.dur) * Math.PI * 2 * mv.spin;
    // Combo chaining.
    if (mv.combo && inp.pressed.punch && t >= mv.combo.from) this.comboQueued = true;
    if (mv.combo && this.comboQueued && t >= (mv.cancel ?? mv.dur * 0.7) && this.hitDone) {
      this.startMove(mv.combo.next);
      return;
    }
    // Single hit window.
    if (mv.hit && !this.hitDone && t >= mv.hit.t[0] && t <= mv.hit.t[1]) {
      if (this.tryHit(mv.hit, mv.hit.reach, mv.hit.r)) this.hitDone = true;
      else this.game.crew.tryHitRef(this, mv.hit);
    }
    // Multi hit specials.
    if (mv.multi && t >= this.multiNext && t <= mv.multi.to) {
      const isLast = this.multiNext + mv.multi.every > mv.multi.to;
      const h = { dmg: mv.multi.dmg, r: mv.multi.r, stun: 0.3, push: 0.4, sfx: this.moveName === 'slaps' ? 'slap' : 'punch', part: 'head', special: true, ...(isLast ? mv.multi.last : {}) };
      this.tryHit(h, this.moveName === 'spin' ? 0 : 0.7, h.r, this.moveName === 'spin');
      this.multiNext += mv.multi.every;
    }
    // Moves with custom moments.
    this.moveEvents(t, dt);
    if (this.mt >= mv.dur) this.endMove();
  }

  moveEvents(t, dt) {
    const name = this.moveName, f = this.flags;
    const once = (key, at) => { if (t >= at && !f[key + this.moveSerial]) { f[key + this.moveSerial] = true; return true; } return false; };
    if (name === 'pickup' && once('pk', 0.22)) {
      const w = f.pickupTarget;
      if (w && w.state === 'ground' && w.pos.distanceTo(this.pos) < 1.3) this.takeWeapon(w);
    }
    if (name === 'wthrow' && once('wt', 0.3) && this.weapon) {
      const w = this.weapon;
      this.weapon = null;
      this.game.weapons.throwWeapon(w, this);
    }
    if (name === 'projectile' && once('pj', 0.32)) this.game.weapons.projectile(this, this.def.special);
    if (name === 'scream' && once('sc', 0.3)) {
      this.game.particles.screamWaves(this, this.def.special.color);
      this.game.audio.play('scream');
      const o = this.opp;
      const ang = Math.abs(wrapAngle(this.dirTo(o) - this.yaw));
      if (this.distTo(o) < 3.4 && ang < 0.8 && o.sameArea(this) && !o.isDown && !['thrown', 'grabbed'].includes(o.state)) {
        o.takeHit(this, { dmg: 15, dizzy: 1.6, sfx: 'none', part: 'head', special: true, push: 1.2, unblockable: false });
      }
    }
    if (name === 'pound' && once('pd', 0.55)) {
      this.game.cam.shake(0.9);
      this.game.audio.play('slam');
      this.game.particles.shockwave(this.pos.clone().setY(this.groundY + 0.05), this.def.special.color);
      this.game.arena.excite(0.6);
      const o = this.opp;
      if (this.distTo(o) < 2.6 && o.sameArea(this) && o.y < 0.3 && !['thrown', 'grabbed', 'dive'].includes(o.state)) {
        o.takeHit(this, { dmg: 16, kd: true, launch: 4, push: 1.6, sfx: 'heavy', part: 'body', special: true, unblockable: true, big: true });
      }
    }
    if (name === 'wswing' && once('ws', 0.3)) this.game.audio.play('whoosh');
    if ((name === 'kick' || name === 'cross' || name === 'upper') && once('wh', 0.12)) this.game.audio.play('whoosh', 0.5);
  }

  endMove() {
    const name = this.moveName;
    if (name === 'dropkick') { this.setState('idle'); return; }
    this.setState(this.weapon ? 'idle' : 'idle');
    this.spinYaw = 0;
    if (name === 'taunt') {
      this.meter = Math.min(100, this.meter + 12);
      this.game.arena.excite(0.5);
    }
  }

  // Returns true when contact happened (hit or blocked).
  tryHit(h, reach, r, around = false) {
    const o = this.opp;
    if (!o || !o.sameArea(this) || o.invuln > 0) return false;
    if (['thrown', 'grabbed', 'climb', 'ko', 'pinned', 'pin', 'frozen'].includes(o.state) && !h.low) return false;
    if (o.isDown && !h.low && o.state !== 'knock') return false;
    if (!o.isDown && h.low && o.state !== 'perch') return false;
    if (o.state === 'perch' && !h.low && reach < 0.9) { /* can knock them off */ }
    const f = this.forward;
    const cx = this.pos.x + f.x * reach * this.scale, cz = this.pos.z + f.z * reach * this.scale;
    const d = Math.hypot(o.pos.x - cx, o.pos.z - cz);
    if (d > r * this.scale + o.radius) return false;
    if (Math.abs(o.y - this.y) > 1.1 && !around) return false;
    const res = o.takeHit(this, h);
    return res !== 'miss';
  }

  // ------------------------------------------------------------- damage
  takeHit(att, h) {
    if (this.state === 'ko' && !h.low) return 'miss';
    if (this.flags.clayTime || this.game.match?.over) return 'miss';
    const ang = Math.abs(wrapAngle(this.dirTo(att) - this.yaw));
    const blocking = this.state === 'block' && ang < 1.6 && !h.unblockable;
    const mul = att.dmgMul * this.defMul * (h.weapon ? 1 : 1);
    let dmg = (h.weapon && att.weapon ? att.weapon.dmg : h.dmg) * mul;
    if (this.state === 'whipped') dmg *= 1.6;
    const g = this.game;
    att.hitstop = this.hitstop = h.big ? 0.12 : 0.06;
    const dirYaw = att.dirTo(this);
    if (blocking) {
      dmg *= 0.15;
      this.applyDamage(dmg, att);
      this.vel.x += Math.sin(dirYaw) * (h.push || 0.5) * 1.6;
      this.vel.z += Math.cos(dirYaw) * (h.push || 0.5) * 1.6;
      g.audio.play('block');
      g.particles.chunks(this.headWorld(), this.def.skin, 2, 1.2);
      this.meter = Math.min(100, this.meter + 3);
      return 'block';
    }
    this.applyDamage(dmg, att);
    att.meter = Math.min(100, att.meter + dmg * 1.15);
    this.meter = Math.min(100, this.meter + dmg * 0.7);
    att.combo += 1; att.comboT = 1.1;
    att.stats.hits++; att.stats.dmg += dmg;
    att.stats.maxCombo = Math.max(att.stats.maxCombo, att.combo);
    if (h.weapon) att.stats.weaponHits++;
    // Feedback.
    const hp = this.headWorld();
    const hitPos = h.part === 'head' ? hp : this.pos.clone().setY(this.groundY + this.y + 1.0 * this.scale);
    if (h.sfx !== 'none') g.audio.play(h.weapon && att.weapon ? att.weapon.sfx : h.sfx || 'punch');
    g.audio.play('squish', h.big ? 0.9 : 0.4);
    if (h.weapon && att.weapon) att.weapon.use();
    g.particles.chunks(hitPos, h.part === 'head' ? this.def.skin : this.def.top.color, h.big ? 9 : 4, h.big ? 3.5 : 2);
    if (h.big && h.part === 'head' && chance(0.35)) g.particles.tooth(hitPos, this.def.acc.includes('goldteeth') ? '#e8c040' : '#f8f6ee');
    if (h.big) g.particles.sweat(hp, 6);
    this.squish = h.big ? 1 : 0.6;
    this.squishKind = h.flat ? 'body' : h.part === 'head' ? 'head' : 'body';
    this.setExpr('hurt', 0.5);
    g.cam.shake(h.big ? 0.55 : 0.18);
    g.arena.excite(h.big ? 0.5 : 0.15);
    // Persistent clay damage: dents and bruises.
    this.damageSinceBruise += dmg;
    if (this.damageSinceBruise > 11 && this.bruises.length < 9) {
      this.damageSinceBruise = 0;
      this.bruises.push(addBruise(this.J.head, chance(0.5) ? '#8a5a8a' : '#a85a5a'));
    }
    if (h.part === 'head' && h.big) {
      const hs = this.J.head.scale;
      hs.set(clamp(hs.x * rand(0.97, 1.04), 0.88, 1.12), clamp(hs.y * rand(0.95, 1.02), 0.85, 1.08), clamp(hs.z * rand(0.96, 1.03), 0.9, 1.1));
    }
    if (this.weapon && (h.kd || chance(0.3))) this.dropWeapon();
    g.events.onHit?.(att, this, h, dmg);
    if (this.grapple) this.releaseGrapple();
    if (this.state === 'grappling' || this.state === 'perch') this.setState('idle');
    // Reaction.
    const pushK = h.push ?? 0.5;
    if (this.state === 'perch') {
      this.vel.set(Math.sin(dirYaw) * 1.5, 0, Math.cos(dirYaw) * 1.5);
      this.knockdown(2, att);
      this.game.events.onFallOff?.(this);
    } else if (h.dizzy && this.hp > 0) {
      this.vel.x += Math.sin(dirYaw) * pushK;
      this.vel.z += Math.cos(dirYaw) * pushK;
      this.setState('dizzy', { dizzy: h.dizzy, forever: false });
    } else if (h.kd || this.hp <= 0 || this.state === 'whipped') {
      this.vel.set(Math.sin(dirYaw) * pushK * 1.4, 0, Math.cos(dirYaw) * pushK * 1.4);
      this.yaw = dirYaw + Math.PI;
      this.knockdown(h.launch ?? 3, att, h);
      if (h.big && h.part === 'head' && chance(0.14) && this.hp > 0) this.popHead(att);
    } else if (this.isDown) {
      // Stomps on a downed fighter.
      this.squish = 1; this.squishKind = 'body';
    } else {
      this.vel.x += Math.sin(dirYaw) * pushK * 1.8;
      this.vel.z += Math.cos(dirYaw) * pushK * 1.8;
      this.setState('hitstun', { stun: h.stun ?? 0.35, hitPose: chance(0.5) ? 'hit1' : (h.part === 'body' ? 'gut' : 'hit2') });
    }
    return 'hit';
  }

  applyDamage(dmg, att) {
    if (this.game.match?.noDamage) return;
    const before = this.hp;
    this.hp = Math.max(0, this.hp - dmg);
    // Finisher window: the last hit of the match leaves them dizzy instead.
    if (this.hp <= 0 && before > 0) this.game.onZeroHealth(this, att);
  }

  knockdown(launch, att, h) {
    if (this.flags.clayTime) { this.clayDizzy(); return; }
    this.setState('knock');
    this.vy = launch;
    if (this.y <= 0) this.y = 0.01;
    this.setExpr('hurt', 1.5);
    this.mash = 0;
    // Big hits by the ropes can send them over the top.
    const p = this.pos, sp = Math.hypot(this.vel.x, this.vel.z);
    if (this.inRing && sp > 3 && (Math.abs(p.x) > RING - 0.5 || Math.abs(p.z) > RING - 0.5) && chance(0.6)) {
      this.flags.overTop = true;
      this.vy = Math.max(this.vy, 5.5);
    }
  }

  clayDizzy() {
    this.vel.set(0, 0, 0);
    this.y = 0; this.vy = 0;
    this.liftRot = 0;
    this.flags.overTop = false;
    this.setState('dizzy', { dizzy: 99, forever: true });
  }

  land() {
    if (this.flags.overTop) { this.flags.overTop = false; this.enforceBounds(); }
    if (this.flags.clayTime) { this.clayDizzy(); return; }
    this.vel.multiplyScalar(0.3);
    this.setState('down');
    this.downTime = this.hp <= 0 ? 999 : 0.9 + (1 - this.hp / this.maxHp) * 1.3;
    this.mash = 0;
    this.squish = 1; this.squishKind = 'body';
    this.game.audio.play('slam');
    this.game.cam.shake(0.45);
    this.game.particles.dust(this.pos.clone().setY(this.groundY + 0.05));
    this.game.events.onLand?.(this);
  }

  startGetup() {
    this.setState('getup');
    this.mt = 0;
    this.invuln = MOVES.getup.dur + 0.1;
    if (this.headOff) this.reattachHead();
  }

  // ------------------------------------------------------------- grapples
  startGrapple(o) {
    this.setState('grappling');
    o.setState('grabbed');
    o.vel.set(0, 0, 0);
    this.vel.set(0, 0, 0);
    o.mash = 0;
    this.grapple = { victim: o, t: 0, step: 'hold', bt: 0, butts: 0 };
    o.thrownBy = this;
    o.weapon && o.dropWeapon();
    this.weapon && this.dropWeapon();
    this.yaw = this.dirTo(o);
    o.yaw = this.yaw + Math.PI;
    this.game.audio.play('grab');
    this.game.events.onGrab?.(this, o);
  }

  releaseGrapple(push = 0.8) {
    const g = this.grapple;
    if (!g) return;
    const v = g.victim;
    this.grapple = null;
    this.spinYaw = 0;
    if (v.state === 'thrown') {
      v.liftRot = 0;
      v.knockdown(0.5, this);
    } else if (v.state === 'grabbed') {
      v.setState('idle');
      const yaw = this.yaw;
      v.vel.x += Math.sin(yaw) * push * 2;
      v.vel.z += Math.cos(yaw) * push * 2;
      v.invuln = 0.3;
    }
    v.thrownBy = null;
    if (this.state === 'grappling') this.setState('idle');
  }

  updateGrapple(dt, inp) {
    const g = this.grapple;
    if (!g) { this.setState('idle'); return; }
    const v = g.victim;
    g.t += dt;
    const f = this.forward;
    const holdPos = () => {
      v.pos.set(this.pos.x + f.x * 0.62 * this.scale, 0, this.pos.z + f.z * 0.62 * this.scale);
      v.yaw = this.yaw + Math.PI;
      v.y = 0;
    };
    if (g.step === 'hold') {
      holdPos();
      // Victim breaks free by mashing.
      if (v.mash > 7 + this.def.stats.power * 1.2) {
        this.releaseGrapple(1.2);
        this.vel.x -= f.x * 2; this.vel.z -= f.z * 2;
        this.game.events.onEscape?.(v);
        return;
      }
      if (g.t > 2.2) { this.releaseGrapple(); return; }
      if (inp.pressed.punch && g.butts < 3) { g.step = 'butt'; g.bt = 0; return; }
      if (inp.pressed.kick) { g.step = 'lift'; g.bt = 0; v.setState('thrown'); this.game.events.onLift?.(this, v); return; }
      if (inp.pressed.special && this.meter >= 50) {
        this.meter -= 50;
        g.step = 'spinlift'; g.bt = 0; v.setState('thrown');
        this.game.events.onSpecial?.(this, 'Airplane Spin');
        return;
      }
      if (inp.pressed.grab) {
        // Irish whip toward the stick direction, or straight ahead.
        let dir = inp.dir.lengthSq() > 0.1 ? Math.atan2(inp.dir.x, inp.dir.y) : this.yaw;
        g.step = 'whip'; g.bt = 0; g.whipDir = dir;
        return;
      }
    } else if (g.step === 'butt') {
      g.bt += dt;
      holdPos();
      if (g.bt > 0.16 && !g.hit) {
        g.hit = true;
        g.butts++;
        const before = v.state;
        v.setState('grabbed');
        v.applyDamage(5 * this.dmgMul * v.defMul, this);
        this.meter = Math.min(100, this.meter + 5);
        this.stats.hits++;
        this.game.audio.play('heavy', 0.7);
        this.game.audio.play('squish', 0.6);
        this.game.particles.chunks(v.headWorld(), v.def.skin, 5, 2);
        v.squish = 1; v.squishKind = 'head'; v.setExpr('hurt', 0.4);
        this.game.cam.shake(0.25);
        this.game.events.onHit?.(this, v, { dmg: 5, part: 'head' }, 5);
        if (v.hp <= 0) { this.grapple = null; v.state = before; v.knockdown(2, this); this.setState('idle'); return; }
      }
      if (g.bt > 0.4) { g.step = 'hold'; g.hit = false; g.t = Math.min(g.t, 1.2); }
    } else if (g.step === 'lift' || g.step === 'spinlift') {
      g.bt += dt;
      const spin = g.step === 'spinlift';
      const liftT = 0.45, holdT = spin ? 1.6 : 0.6, slamT = holdT + 0.22;
      if (spin && g.bt > liftT && g.bt < holdT) this.spinYaw = ((g.bt - liftT) / (holdT - liftT)) * Math.PI * 6;
      const k = clamp(g.bt / liftT, 0, 1);
      const headTop = 2.0 * this.scale;
      if (g.bt < holdT) {
        // Victim hoisted overhead, horizontal.
        const yaw = this.yaw + (this.spinYaw || 0);
        v.pos.set(this.pos.x + Math.sin(yaw) * 0.62 * (1 - k), 0, this.pos.z + Math.cos(yaw) * 0.62 * (1 - k));
        v.y = k * headTop;
        v.liftRot = k;
        v.yaw = yaw + Math.PI / 2;
      } else if (g.bt < slamT) {
        const s = (g.bt - holdT) / (slamT - holdT);
        const yaw = this.yaw + (this.spinYaw || 0);
        const dist = spin ? 2.2 : 1.1;
        let lx = this.pos.x + Math.sin(yaw) * dist * s, lz = this.pos.z + Math.cos(yaw) * dist * s;
        v.pos.set(lx, 0, lz);
        v.y = headTop * (1 - s) + Math.sin(s * Math.PI) * 0.6;
        v.liftRot = 1;
      } else {
        // Impact.
        this.spinYaw = 0;
        const yaw = this.yaw;
        v.liftRot = 0;
        v.y = 0;
        let over = false;
        if (v.inRing && (Math.abs(v.pos.x) > RING - 0.15 || Math.abs(v.pos.z) > RING - 0.15)) over = true;
        this.grapple = null;
        v.thrownBy = null;
        const dmg = (spin ? 20 : 15);
        v.yaw = yaw + Math.PI;
        if (over) {
          // Over the top rope and onto the floor.
          v.state = 'grabbed';
          v.applyDamage(dmg * this.dmgMul * v.defMul * 0.8, this);
          v.setState('knock');
          v.flags.overTop = true;
          v.vy = 4.5; v.y = 0.3;
          v.vel.set(Math.sin(yaw) * 3, 0, Math.cos(yaw) * 3);
          this.game.events.onOverTop?.(this, v);
        } else {
          v.state = 'grabbed';
          v.takeHit(this, { dmg, kd: true, launch: 1.2, push: 0.3, sfx: 'slam', part: 'body', big: true, unblockable: true, flat: true });
        }
        this.setState('idle');
        this.game.arena.excite(1);
        this.game.events.onSlam?.(this, v, spin);
        return;
      }
    } else if (g.step === 'whip') {
      g.bt += dt;
      holdPos();
      if (g.bt > 0.22) {
        this.grapple = null;
        v.thrownBy = null;
        v.setState('whipped', { whipYaw: g.whipDir, bounces: 0 });
        v.yaw = g.whipDir;
        this.setState('idle');
        this.game.events.onWhip?.(this, v);
      }
    }
  }

  updateWhipped(dt) {
    const sp = 6.4;
    this.pos.x += Math.sin(this.yaw) * sp * dt;
    this.pos.z += Math.cos(this.yaw) * sp * dt;
    this.walkPhase = (this.walkPhase || 0) + dt * sp * 1.4;
    if (this.inRing) {
      if (this.ropeBounce()) {
        this.flags.bounces++;
        if (this.flags.bounces > 1) this.setState('idle');
      }
    } else {
      // Into the guard rail.
      if (Math.abs(this.pos.x) > FLOOR - 0.1 || Math.abs(this.pos.z) > FLOOR - 0.1) {
        this.applyDamage(8 * this.defMul, this.opp);
        this.knockdown(1.5, this.opp);
        this.game.audio.play('clang');
        this.game.cam.shake(0.5);
        this.game.events.onRail?.(this);
        return;
      }
    }
    if (this.st > 2.2) this.setState('idle');
    // Running back into a waiting opponent without being hit: bump.
  }

  // ------------------------------------------------------------- pins
  startPin() {
    const o = this.opp;
    this.setState('pin');
    o.setState('pinned');
    o.mash = 0;
    this.pos.set(o.pos.x + 0.1, 0, o.pos.z + 0.1);
    this.yaw = o.yaw + Math.PI / 2;
    this.game.crew.startCount(o, 'pin');
    this.game.events.onPin?.(this, o);
  }
  endPin(kickout) {
    const o = this.opp;
    this.setState('idle');
    this.pos.x -= Math.sin(this.yaw) * 0.6;
    this.pos.z -= Math.cos(this.yaw) * 0.6;
    if (kickout) {
      o.setState('down');
      o.downTime = 0.25;
      o.st = 0;
      this.vel.set(-Math.sin(this.yaw) * 2, 0, -Math.cos(this.yaw) * 2);
    }
  }

  // ------------------------------------------------------------- specials
  doSpecial() {
    const sp = this.def.special;
    this.meter -= 50;
    this.game.events.onSpecial?.(this, sp.name);
    this.game.arena.excite(0.7);
    const map = { scream: 'scream', charge: 'charge', spin: 'spin', projectile: 'projectile', slaps: 'slaps', pound: 'pound' };
    this.flags.runYaw = this.yaw;
    this.startMove(map[sp.type] || 'charge');
    this.game.particles.sparkle(this.headWorld(), sp.color);
    this.game.audio.play('special');
  }

  // ------------------------------------------------------------- weapons
  takeWeapon(w) {
    this.weapon = w;
    w.pickUp(this);
    this.game.audio.play('pickup');
    this.game.events.onWeapon?.(this, w);
  }
  dropWeapon() {
    if (!this.weapon) return;
    this.weapon.drop(this);
    this.weapon = null;
  }

  // ------------------------------------------------------------- head pop gag
  popHead(att) {
    if (this.headOff) return;
    const head = this.J.head;
    const wp = new THREE.Vector3();
    head.getWorldPosition(wp);
    const wq = new THREE.Quaternion();
    head.getWorldQuaternion(wq);
    this.game.scene.attach(head);
    const dir = att.dirTo(this);
    this.headOff = { mesh: head, vel: new THREE.Vector3(Math.sin(dir) * 2.5, 6, Math.cos(dir) * 2.5), spin: rand(-8, 8), t: 0 };
    this.game.audio.play('pop');
    this.game.events.onHeadPop?.(this);
  }
  updateHead(dt) {
    const h = this.headOff;
    if (!h) return;
    h.t += dt;
    const m = h.mesh;
    if (h.returning) {
      h.rt += dt * 2.2;
      const target = new THREE.Vector3();
      this.J.neck.localToWorld(target.set(0, 0.09, 0));
      m.position.lerp(target, clamp(h.rt, 0, 1));
      if (h.rt >= 1) {
        this.J.neck.attach(m);
        m.position.set(0, 0.09, 0);
        m.rotation.set(0, 0, 0);
        this.headOff = null;
        this.game.audio.play('squish');
      }
      return;
    }
    h.vel.y -= GRAVITY * dt;
    m.position.addScaledVector(h.vel, dt);
    m.rotation.x += h.spin * dt;
    const floor = (Math.abs(m.position.x) < APRON && Math.abs(m.position.z) < APRON ? RING_H : 0) + 0.25 * this.scale;
    if (m.position.y < floor) {
      m.position.y = floor;
      h.vel.y *= -0.45;
      h.vel.x *= 0.7; h.vel.z *= 0.7;
      h.spin *= 0.6;
      if (Math.abs(h.vel.y) > 1) this.game.audio.play('squish', 0.5);
    }
  }
  reattachHead() {
    if (!this.headOff || this.headOff.returning) return;
    this.headOff.returning = true;
    this.headOff.rt = 0;
  }

  headWorld() {
    const v = new THREE.Vector3();
    this.J.head.getWorldPosition(v);
    v.y += 0.3 * this.scale;
    return v;
  }

  // ------------------------------------------------------------- physics
  physics(dt, scripted = false) {
    // Knockback slide.
    if (this.state !== 'dive') {
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
      const fr = this.y > 0.01 ? 0.6 : 7;
      this.vel.multiplyScalar(Math.max(0, 1 - fr * dt));
    } else {
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
    }
    const airborne = ['knock', 'dive', 'attack'].includes(this.state) && (this.y > 0 || this.vy > 0);
    if (airborne) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.flags.overTop && this.inRing) {
        // Sailing over the ropes: fly outward, drop to the floor.
        const p = this.pos;
        if (Math.abs(p.x) > RING || Math.abs(p.z) > RING) {
          const ax = Math.abs(p.x) > Math.abs(p.z) ? 'x' : 'z';
          this.game.arena.bumpRope(ax, Math.sign(ax === 'x' ? p.x : p.z), 0.5);
          if (Math.abs(p.x) > APRON - 0.3 || Math.abs(p.z) > APRON - 0.3) {
            this.inRing = false;
            this.y += RING_H;
            this.flags.overTop = false;
            this.game.events.onOverTop?.(null, this);
          }
        }
      }
      if (this.y <= 0) { this.y = 0; if (this.vy < 0) this.vy = 0; }
    } else if (!['climb', 'perch', 'thrown'].includes(this.state) && !scripted) {
      this.y = Math.max(0, this.y - dt * 6);
    }
    if (!scripted && this.state !== 'thrown' && this.state !== 'climb') this.enforceBounds();
  }

  enforceBounds() {
    const p = this.pos;
    if (this.inRing) {
      const lim = this.flags.overTop ? APRON + 0.2 : RING;
      p.x = clamp(p.x, -lim, lim);
      p.z = clamp(p.z, -lim, lim);
    } else {
      p.x = clamp(p.x, -FLOOR, FLOOR);
      p.z = clamp(p.z, -FLOOR, FLOOR);
      const ax = Math.abs(p.x), az = Math.abs(p.z);
      if (ax < APRON && az < APRON) {
        if (APRON - ax < APRON - az) p.x = Math.sign(p.x || 1) * APRON;
        else p.z = Math.sign(p.z || 1) * APRON;
      }
    }
  }

  // ------------------------------------------------------------- animation
  currentPose() {
    const s = this.state;
    const walkKeys = (pre, step) => {
      const ph = (this.walkPhase || 0) % 4;
      const i = Math.floor(ph);
      const names = [pre + 1, pre + 2, pre + 3, pre + 4];
      return blend(POSES[names[i]], POSES[names[(i + 1) % 4]], ph - i);
    };
    switch (s) {
      case 'idle': return this.weapon ? POSES.holdWeapon : ((this.animClock % 1.0) < 0.5 ? POSES.guard : POSES.guard2);
      case 'walk': return this.weaponPose(walkKeys('walk'));
      case 'run': case 'whipped': return walkKeys('run');
      case 'block': return POSES.block;
      case 'attack': {
        const mv = this.move;
        if (this.moveName === 'taunt' || !mv.keys) return samplePose(mv.keys || [[0, 'raise']], this.mt);
        return samplePose(mv.keys, this.mt);
      }
      case 'hitstun': return POSES[this.flags.hitPose] || POSES.hit1;
      case 'knock': return this.vy > 0 ? POSES.fly : blend(POSES.fly, POSES.down, clamp(1 - this.y / 1.2, 0, 1));
      case 'down': case 'ko': return (this.animClock % 1.2) < 0.6 || s === 'ko' ? POSES.down : POSES.down2;
      case 'pinned': return POSES.down;
      case 'getup': return samplePose(MOVES.getup.keys, this.mt);
      case 'grappling': {
        const g = this.grapple;
        if (!g) return POSES.hold;
        if (g.step === 'butt') return g.bt < 0.14 ? POSES.headbuttWind : POSES.headbutt;
        if (g.step === 'lift' || g.step === 'spinlift') {
          const holdT = g.step === 'spinlift' ? 1.6 : 0.6;
          if (g.bt < 0.45) return blend(POSES.crouch, POSES.lift, g.bt / 0.45);
          return g.bt < holdT ? POSES.lift : POSES.slam;
        }
        if (g.step === 'whip') return POSES.whip;
        return POSES.hold;
      }
      case 'grabbed': return POSES.held;
      case 'thrown': return POSES.carried;
      case 'dizzy': return (this.animClock % 1.0) < 0.5 ? POSES.dizzy1 : POSES.dizzy2;
      case 'climb': return samplePose(this.flags.climb.keys, this.st);
      case 'perch': return (this.animClock % 0.8) < 0.4 ? POSES.perch : POSES.perch2;
      case 'dive': return POSES.dive;
      case 'pin': return POSES.pin;
      case 'victory': return (this.animClock % 0.8) < 0.4 ? POSES.raise : POSES.raise2;
      case 'frozen': return this.frozenPose || POSES.guard;
      default: return POSES.guard;
    }
  }

  weaponPose(p) {
    if (!this.weapon) return p;
    const o = { ...p };
    o.shR = POSES.holdWeapon.shR; o.elR = POSES.holdWeapon.elR;
    return o;
  }

  // Called at 12fps: pick the pose, apply it, jitter the clay.
  animTick(dt) {
    this.animClock = (this.animClock || 0) + dt;
    const p = this.scripted && this.scriptPose ? resolve(this.scriptPose) : this.currentPose();
    this.applyPose(p);
    this.syncVisual();
    boil(this.model.group, this.state === 'ko' ? 0.4 : 1);
    if (this.headOff?.mesh) boil(this.headOff.mesh, 1);
    let expr = this.expr;
    if (this.state === 'ko') expr = 'ko';
    else if (this.state === 'dizzy') expr = 'ko';
    else if (this.state === 'attack' && this.move?.hit && this.exprT <= 0) expr = 'angry';
    else if (this.state === 'victory') expr = this.def.mouth === 'smile' ? 'smile' : 'open';
    if (expr !== this.lastExpr) { setExpression(this.face, expr); this.lastExpr = expr; }
  }

  applyPose(p) {
    const J = this.J;
    for (const j of JOINTS) {
      const r = p[j];
      J[j].rotation.set(r[0] * DEG, r[1] * DEG, r[2] * DEG);
    }
    J.root.rotation.set(p.root[0] * DEG, p.root[1] * DEG, p.root[2] * DEG);
    J.root.position.set(p.rootSide, this.model.hipY + p.rootY, p.rootFwd);
    // Squash & stretch.
    const s = this.squish;
    if (s > 0) {
      if (this.squishKind === 'head' && !this.headOff) {
        const k = Math.sin(s * Math.PI * 2.5) * s * 0.35;
        J.head.scale.set(1 + k, 1 - k * 1.1, 1 + k);
        this.headSquishing = true;
      } else {
        const k = s * 0.3;
        this.model.group.scale.set(this.scale * (1 + k), this.scale * (1 - k), this.scale * (1 + k));
      }
    } else {
      if (this.headSquishing) { J.head.scale.set(1, 1, 1); this.headSquishing = false; }
      if (!this.flat) this.model.group.scale.setScalar(this.scale);
    }
  }

  syncVisual() {
    const g = this.group;
    const lift = this.liftRot || 0;
    g.position.set(this.pos.x, this.groundY + this.y, this.pos.z);
    g.rotation.set(0, this.yaw + (this.state === 'grappling' || this.state === 'attack' ? this.spinYaw || 0 : 0), 0);
    // While carried overhead the victim lies horizontally.
    this.model.group.rotation.x = -lift * Math.PI / 2;
    this.model.group.position.y = lift * 0.5;
    // Stop-motion wobble on the whole puppet.
    g.rotation.y += (Math.random() - 0.5) * 0.012;
  }

  // Replay snapshots: everything the puppet shows on a frame.
  snapshot() {
    const J = this.J;
    const rots = JOINTS.map((j) => [J[j].rotation.x, J[j].rotation.y, J[j].rotation.z]);
    return {
      gp: this.group.position.toArray(), gr: this.group.rotation.y,
      mg: [this.model.group.rotation.x, this.model.group.position.y, this.model.group.scale.x, this.model.group.scale.y, this.model.group.scale.z],
      root: [J.root.position.toArray(), J.root.rotation.x, J.root.rotation.y, J.root.rotation.z],
      rots, head: J.head.scale.toArray(), expr: this.lastExpr,
    };
  }
  applySnapshot(s) {
    const J = this.J;
    this.group.position.fromArray(s.gp);
    this.group.rotation.set(0, s.gr, 0);
    const mg = this.model.group;
    mg.rotation.x = s.mg[0]; mg.position.y = s.mg[1]; mg.scale.set(s.mg[2], s.mg[3], s.mg[4]);
    J.root.position.fromArray(s.root[0]);
    J.root.rotation.set(s.root[1], s.root[2], s.root[3]);
    JOINTS.forEach((j, i) => J[j].rotation.set(...s.rots[i]));
    J.head.scale.fromArray(s.head);
    if (s.expr && s.expr !== this.lastExpr) { setExpression(this.face, s.expr); this.lastExpr = s.expr; }
    boil(this.model.group, 1);
  }
}

const EMPTY = { dir: new THREE.Vector2(), held: {}, pressed: {}, anyPressed: false, doubleTap: false };
export { samplePose, blend, resolve };
