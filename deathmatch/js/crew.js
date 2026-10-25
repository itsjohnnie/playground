// The referee and the two commentators: clay puppets that aren't fighters.
import * as THREE from 'three';
import { buildFighterModel, setExpression } from './model.js';
import { boil } from './clay.js';
import { POSES, JOINTS } from './poses.js';
import { blend } from './fighter.js';
import { RING, RING_H } from './fighter.js';
import { clamp, DEG, approachAngle, rand } from './util.js';

const REF_DEF = {
  id: 'ref', name: 'Referee', skin: '#f2cdb4', lips: '#c08070', iris: '#4a4a52', brows: '#d8d8dc',
  hair: { style: 'balding', color: '#d8d8dc' },
  top: { style: 'suit', color: '#f6f6f2', trim: '#f6f6f2' },
  bottom: { style: 'pants', color: '#16161a' }, shoes: '#0e0e10',
  acc: ['bowtie'], build: 'slim', stats: { power: 1, speed: 3, tough: 1 },
};
export const ANNOUNCER_DEFS = [
  {
    id: 'vinnie', skin: '#f0c8a6', lips: '#c07868', iris: '#4a3a2a', brows: '#1a1410',
    hair: { style: 'slick', color: '#1c1612' },
    top: { style: 'suit', color: '#2a2c36', trim: '#c23838' },
    bottom: { style: 'pants', color: '#2a2c36' }, shoes: '#111', acc: ['tie'], build: 'slim', stats: { power: 1, speed: 1, tough: 1 },
  },
  {
    id: 'marty', skin: '#e8b898', lips: '#b07060', iris: '#3a2a1a', brows: '#3a2a20',
    hair: { style: 'balding', color: '#3a2a20' },
    top: { style: 'suit', color: '#4a3a2e', trim: '#d8b040' },
    bottom: { style: 'pants', color: '#4a3a2e' }, shoes: '#111', acc: ['tie', 'mustache', 'glasses'], build: 'heavy', stats: { power: 1, speed: 1, tough: 1 },
  },
];

function applyPose(m, p) {
  const J = m.joints;
  for (const j of JOINTS) { const r = p[j]; J[j].rotation.set(r[0] * DEG, r[1] * DEG, r[2] * DEG); }
  J.root.rotation.set(p.root[0] * DEG, p.root[1] * DEG, p.root[2] * DEG);
  J.root.position.set(p.rootSide, m.hipY + p.rootY, p.rootFwd);
}

function micMesh() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.22, 10), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4 }));
  handle.position.y = -0.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), new THREE.MeshStandardMaterial({ color: '#888', metalness: 0.6, roughness: 0.35 }));
  head.position.y = 0.08;
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.09), new THREE.MeshStandardMaterial({ color: '#1a3aa0', roughness: 0.6 }));
  flag.position.y = 0.0;
  g.add(handle, head, flag);
  return g;
}

export class Crew {
  constructor(game) {
    this.game = game;
    // Referee.
    this.ref = buildFighterModel(REF_DEF);
    this.refGroup = new THREE.Group();
    this.refGroup.add(this.ref.group);
    game.scene.add(this.refGroup);
    this.refPos = new THREE.Vector3(0, 0, -2.4);
    this.refYaw = 0;
    this.refState = 'idle';
    this.refT = 0;
    this.walkPhase = 0;
    this.count = null;
    // Commentators at the desk.
    this.announcers = ANNOUNCER_DEFS.map((def, i) => {
      const m = buildFighterModel(def);
      const g = new THREE.Group();
      g.add(m.group);
      const seat = game.arena.deskSeats[i];
      g.position.copy(seat);
      g.rotation.y = 0.15 * (i ? -1 : 1);
      game.scene.add(g);
      const mic = micMesh();
      mic.position.set(0, -0.05, 0.05);
      mic.rotation.x = -0.4;
      m.joints.handR.add(mic);
      return { m, g, talking: 0, cheer: 0 };
    });
  }

  reset() {
    this.refPos.set(0, 0, -2.4);
    this.refState = 'idle';
    this.count = null;
    this.ref.group.rotation.set(0, 0, 0);
    this.hold = null;
  }

  talk(i, dur) { this.announcers[i].talking = dur; }
  cheer() { this.announcers.forEach((a) => (a.cheer = 1.4)); }

  get refDown() { return this.refState === 'down'; }

  startCount(fighter, kind) {
    if (this.refDown) { this.game.events.onRefDown?.(); return; }
    this.count = { fighter, kind, n: 0, t: kind === 'pin' ? -0.25 : 0.4, arrived: false };
  }

  tryHitRef(att, h) {
    if (this.refDown || !att.inRing || this.count) return;
    const f = att.forward;
    const cx = att.pos.x + f.x * h.reach * att.scale, cz = att.pos.z + f.z * h.reach * att.scale;
    if (Math.hypot(this.refPos.x - cx, this.refPos.z - cz) < h.r + 0.3) this.knockRef(att);
  }

  knockRef(att) {
    if (this.refDown) return;
    this.refState = 'down';
    this.refT = 0;
    this.refYaw = Math.atan2(att.pos.x - this.refPos.x, att.pos.z - this.refPos.z);
    this.game.audio.play('heavy');
    this.game.audio.play('squish');
    this.game.particles.chunks(this.refPos.clone().setY(RING_H + 1.6), REF_DEF.skin, 5, 2);
    this.count = null;
    this.game.events.onRefHit?.(att);
  }

  update(dt) {
    const g = this.game;
    const [a, b] = g.fighters;
    this.refT += dt;
    // Projectiles and flying bodies can flatten the ref too.
    if (!this.refDown && g.match && !g.match.over) {
      for (const f of g.fighters) {
        if ((f.state === 'knock' || f.state === 'dive') && f.inRing && Math.hypot(f.pos.x - this.refPos.x, f.pos.z - this.refPos.z) < 0.6) this.knockRef(f.opp);
      }
    }
    if (this.refState === 'down') {
      if (this.refT > 2.6) { this.refState = 'idle'; this.refT = 0; }
      return;
    }
    const c = this.count;
    if (c) {
      const f = c.fighter;
      const stillDown = c.kind === 'pin' ? f.state === 'pinned' : (f.state === 'down' && f.inRing);
      if (!stillDown) { this.count = null; return; }
      // Get beside the downed fighter first.
      const target = new THREE.Vector3(f.pos.x + 0.9, 0, f.pos.z + 0.5);
      target.x = clamp(target.x, -RING, RING); target.z = clamp(target.z, -RING, RING);
      const d = target.distanceTo(this.refPos);
      if (!c.arrived) {
        if (d > 0.15) {
          this.refPos.addScaledVector(target.sub(this.refPos).normalize(), Math.min(d, 6 * dt));
          this.refYaw = Math.atan2(f.pos.x - this.refPos.x, f.pos.z - this.refPos.z);
          this.walkPhase += dt * 9;
          this.refState = 'walk';
          return;
        }
        c.arrived = true;
      }
      this.refState = 'count';
      this.refYaw = approachAngle(this.refYaw, Math.atan2(f.pos.x - this.refPos.x, f.pos.z - this.refPos.z), dt * 8);
      c.t += dt;
      const interval = c.kind === 'pin' ? 0.85 : 0.9;
      if (c.t >= interval) {
        c.t = 0;
        c.n++;
        this.slap = 0.18;
        g.audio.play('slap', 0.7);
        g.ui.bigCount(c.n);
        if (c.kind === 'pin') g.onPinCount(f, c.n);
        else if (c.n >= 10) g.onCountOut(f);
      }
      return;
    }
    if (this.hold) {
      const d = this.hold.distanceTo(this.refPos);
      if (d > 0.1) { this.refPos.addScaledVector(this.hold.clone().sub(this.refPos).normalize(), Math.min(d, 4 * dt)); this.walkPhase += dt * 8; this.refState = 'walk'; }
      else this.refState = 'idle';
      return;
    }
    // Shadow the action from the far side of the fighters.
    if (!a || !b) return;
    const m = new THREE.Vector3((a.pos.x + b.pos.x) / 2, 0, (a.pos.z + b.pos.z) / 2);
    let dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    let px = -dz, pz = dx;
    if (px + pz > 0) { px = -px; pz = -pz; }
    const target = new THREE.Vector3(m.x + px * 2.1, 0, m.z + pz * 2.1);
    target.x = clamp(target.x, -RING + 0.2, RING - 0.2);
    target.z = clamp(target.z, -RING + 0.2, RING - 0.2);
    // Don't stand inside a fighter.
    for (const f of [a, b]) {
      const ddx = target.x - f.pos.x, ddz = target.z - f.pos.z, dd = Math.hypot(ddx, ddz);
      if (dd < 1) { target.x += (ddx / (dd || 1)) * (1 - dd); target.z += (ddz / (dd || 1)) * (1 - dd); }
    }
    const d = target.distanceTo(this.refPos);
    if (d > 0.4 && this.refState !== 'wave' && this.refState !== 'raise') {
      this.refPos.addScaledVector(target.sub(this.refPos).normalize(), Math.min(d, 2.4 * dt));
      this.walkPhase += dt * 6;
      this.refState = 'walk';
    } else if (this.refState === 'walk') this.refState = 'idle';
    this.refYaw = approachAngle(this.refYaw, Math.atan2(m.x - this.refPos.x, m.z - this.refPos.z), dt * 5);
  }

  animTick(dt) {
    this.clock = (this.clock || 0) + dt;
    let p;
    const s = this.refState;
    if (s === 'walk') {
      const ph = this.walkPhase % 4, i = Math.floor(ph);
      const names = ['walk1', 'walk2', 'walk3', 'walk4'];
      p = blend(POSES[names[i]], POSES[names[(i + 1) % 4]], ph - i);
      p = { ...p, shL: POSES.stand.shL, shR: POSES.stand.shR, elL: POSES.stand.elL, elR: POSES.stand.elR, spine: [4, 0, 0] };
    } else if (s === 'down') p = POSES.down;
    else if (s === 'count') { this.slap = (this.slap || 0) - dt; p = this.slap > 0 ? POSES.count2 : POSES.count1; }
    else if (s === 'wave') p = this.clock % 0.5 < 0.25 ? POSES.refWave : POSES.refWave2;
    else if (s === 'raise') p = POSES.refPoint;
    else p = POSES.stand;
    applyPose(this.ref, p);
    this.refGroup.position.set(this.refPos.x, RING_H, this.refPos.z);
    this.refGroup.rotation.y = this.refYaw;
    boil(this.ref.group, 1);
    setExpression(this.ref.face, s === 'down' ? 'ko' : s === 'wave' ? 'open' : 'angry');
    // Commentators.
    this.announcers.forEach((a, i) => {
      a.talking -= dt; a.cheer -= dt;
      let pp;
      if (a.cheer > 0) pp = POSES.cheer;
      else if (a.talking > 0) pp = (this.clock + i * 0.3) % 0.5 < 0.25 ? POSES.talk1 : POSES.talk2;
      else pp = POSES.talk1;
      applyPose(a.m, pp);
      a.m.joints.shR.rotation.set(-1.4, 0, -0.3);
      a.m.joints.elR.rotation.set(-1.6, 0, 0);
      setExpression(a.m.face, a.cheer > 0 ? 'shock' : a.talking > 0 ? (Math.random() < 0.5 ? 'open' : 'smile') : 'smile');
      boil(a.m.group, 1);
    });
  }

  snapshot() {
    return { p: this.refGroup.position.toArray(), y: this.refGroup.rotation.y, rots: JOINTS.map((j) => this.ref.joints[j].rotation.toArray().slice(0, 3)), root: [this.ref.joints.root.position.toArray(), this.ref.joints.root.rotation.toArray().slice(0, 3)] };
  }
  applySnapshot(s) {
    this.refGroup.position.fromArray(s.p);
    this.refGroup.rotation.y = s.y;
    JOINTS.forEach((j, i) => this.ref.joints[j].rotation.set(...s.rots[i]));
    this.ref.joints.root.position.fromArray(s.root[0]);
    this.ref.joints.root.rotation.set(...s.root[1]);
  }
}
