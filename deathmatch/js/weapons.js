// Ringside weapons you can pick up, swing and throw, plus special projectiles.
import * as THREE from 'three';
import { box, cyl, sphere, cone, torus, clayMat, prepareBoil, boil } from './clay.js';
import { RING, RING_H, APRON, FLOOR } from './fighter.js';
import { rand, pick, clamp } from './util.js';

const TYPES = {
  chair: { name: 'folding chair', sfx: 'clang', dmg: 13 },
  bat: { name: 'baseball bat', sfx: 'bat', dmg: 12 },
  bell: { name: 'ring bell', sfx: 'bell', dmg: 11 },
  trash: { name: 'trash can', sfx: 'clang', dmg: 12 },
  mic: { name: 'microphone', sfx: 'feedback', dmg: 8 },
};

function buildWeapon(type) {
  const g = new THREE.Group();
  const metal = { metalness: 0.55, roughness: 0.4 };
  switch (type) {
    case 'chair': {
      g.add(box(0.46, 0.05, 0.42, '#8a909c', { pos: [0, 0.46, 0], ...metal }));
      g.add(box(0.46, 0.34, 0.04, '#8a909c', { pos: [0, 0.78, -0.2], ...metal }));
      for (const sx of [1, -1]) {
        g.add(cyl(0.018, 0.018, 0.95, '#5a606c', { pos: [sx * 0.21, 0.47, -0.2], ...metal }));
        g.add(cyl(0.018, 0.018, 0.5, '#5a606c', { pos: [sx * 0.21, 0.24, 0.18], rot: [0.2, 0, 0], ...metal }));
      }
      break;
    }
    case 'bat': {
      g.add(cyl(0.055, 0.025, 0.9, '#c8945a', { pos: [0, 0.45, 0] }));
      g.add(sphere(0.035, '#a0703a', { pos: [0, 0.0, 0] }));
      break;
    }
    case 'bell': {
      g.add(box(0.3, 0.06, 0.3, '#6a3a1a', { pos: [0, 0.03, 0] }));
      g.add(sphere(0.15, '#e8c048', { pos: [0, 0.12, 0], scale: [1, 0.8, 1], ...metal }));
      g.add(sphere(0.03, '#3a3a3a', { pos: [0, 0.26, 0] }));
      break;
    }
    case 'trash': {
      g.add(cyl(0.22, 0.19, 0.6, '#9aa0aa', { pos: [0, 0.3, 0], ...metal }));
      for (const y of [0.12, 0.3, 0.48]) g.add(torus(0.215, 0.012, '#7a808a', { pos: [0, y, 0], rot: [Math.PI / 2, 0, 0] }));
      g.add(cyl(0.24, 0.24, 0.04, '#8a909a', { pos: [0, 0.62, 0], ...metal }));
      break;
    }
    case 'mic': {
      g.add(cyl(0.03, 0.022, 0.28, '#151515', { pos: [0, 0.14, 0] }));
      g.add(sphere(0.06, '#9a9aa2', { pos: [0, 0.33, 0], ...metal }));
      g.add(box(0.11, 0.08, 0.11, '#1a3aa0', { pos: [0, 0.24, 0] }));
      break;
    }
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  prepareBoil(g);
  return g;
}

class Weapon {
  constructor(mgr, type, pos, inRing) {
    this.mgr = mgr;
    this.type = type;
    Object.assign(this, TYPES[type]);
    this.mesh = buildWeapon(type);
    this.pos = pos.clone();
    this.inRing = inRing;
    this.state = 'ground';
    this.uses = 3;
    this.vel = new THREE.Vector3();
    this.mesh.position.set(pos.x, inRing ? RING_H : 0, pos.z);
    this.mesh.rotation.y = rand(0, 6);
    if (type === 'chair' || type === 'bat') this.mesh.rotation.z = Math.PI / 2 * (type === 'bat' ? 1 : 0.95);
    if (type === 'bat') this.mesh.position.y += 0.05;
    mgr.scene.add(this.mesh);
  }
  pickUp(f) {
    this.state = 'held';
    this.owner = f;
    const hand = f.J.handR;
    hand.add(this.mesh);
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.set(0, 0, 0);
    // Grip offsets so the weapon sits in the fist.
    if (this.type === 'chair') { this.mesh.rotation.set(Math.PI, 0, 0); this.mesh.position.set(0, 0.2, -0.05); this.mesh.scale.setScalar(0.85); }
    if (this.type === 'bat') { this.mesh.rotation.set(Math.PI, 0, 0); this.mesh.position.set(0, 0.02, 0); }
    if (this.type === 'bell') this.mesh.position.set(0, -0.05, 0.1);
    if (this.type === 'trash') { this.mesh.rotation.set(Math.PI, 0, 0); this.mesh.position.set(0, 0.5, 0); this.mesh.scale.setScalar(0.85); }
    if (this.type === 'mic') this.mesh.rotation.set(Math.PI, 0, 0);
    prepareBoil(this.mesh);
  }
  drop(f) {
    if (this.state !== 'held') return;
    const p = new THREE.Vector3();
    this.mesh.getWorldPosition(p);
    this.mgr.scene.attach(this.mesh);
    this.state = 'flying';
    this.owner = null;
    this.thrower = null;
    this.vel.set(rand(-1, 1), 2, rand(-1, 1));
    this.mesh.scale.setScalar(1);
    this.inRing = f.inRing;
  }
  use() {
    this.uses--;
    if (this.uses <= 0 && this.owner) {
      // Breaks into clay bits.
      const p = new THREE.Vector3();
      this.mesh.getWorldPosition(p);
      this.mgr.game.particles.chunks(p, this.type === 'bat' ? '#c8945a' : '#9aa0aa', 14, 3);
      this.owner.weapon = null;
      this.mesh.parent?.remove(this.mesh);
      this.state = 'gone';
      this.mgr.game.events.onWeaponBreak?.(this);
    }
  }
}

export class Weapons {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.items = [];
    this.projectiles = [];
    this.spawnT = 0;
  }

  reset() {
    for (const w of this.items) w.mesh.parent?.remove(w.mesh);
    this.items = [];
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
    this.spawnT = 6;
    // Start with a couple of weapons on the floor and one in the ring.
    this.spawn('chair', false);
    this.spawn(pick(['bat', 'trash', 'bell']), false);
  }

  spawn(type, inRing) {
    let pos;
    if (inRing) pos = new THREE.Vector3(rand(-2.4, 2.4), 0, rand(-2.4, 2.4));
    else {
      const side = Math.floor(rand(0, 4));
      const t = rand(-FLOOR + 0.6, FLOOR - 0.6), d = rand(APRON + 0.6, FLOOR - 0.4);
      pos = side === 0 ? new THREE.Vector3(d, 0, t) : side === 1 ? new THREE.Vector3(-d, 0, t) : side === 2 ? new THREE.Vector3(t, 0, d) : new THREE.Vector3(t, 0, -d);
    }
    const w = new Weapon(this, type, pos, inRing);
    this.items.push(w);
    // Pops in like it was just placed on the set.
    w.mesh.scale.setScalar(0.01);
    w.popIn = 0;
    return w;
  }

  nearest(f, maxD) {
    let best = null, bd = maxD;
    for (const w of this.items) {
      if (w.state !== 'ground' || w.inRing !== f.inRing) continue;
      const d = Math.hypot(w.pos.x - f.pos.x, w.pos.z - f.pos.z);
      if (d < bd) { bd = d; best = w; }
    }
    return best;
  }

  nearestAny(f) {
    let best = null, bd = 99;
    for (const w of this.items) {
      if (w.state !== 'ground') continue;
      const d = Math.hypot(w.pos.x - f.pos.x, w.pos.z - f.pos.z) + (w.inRing !== f.inRing ? 4 : 0);
      if (d < bd) { bd = d; best = w; }
    }
    return best ? { w: best, d: bd } : null;
  }

  throwWeapon(w, f) {
    const p = new THREE.Vector3();
    w.mesh.getWorldPosition(p);
    this.scene.attach(w.mesh);
    w.mesh.scale.setScalar(1);
    w.state = 'flying';
    w.owner = null;
    w.thrower = f;
    w.inRing = f.inRing;
    const fw = f.forward;
    w.vel.set(fw.x * 9, 2.2, fw.z * 9);
    w.spin = 12;
    this.game.audio.play('whoosh');
  }

  // Special-move projectiles: guitars, cue cards, a boomerang medallion.
  projectile(f, sp) {
    const fw = f.forward.clone();
    const make = (yawOff, delay) => {
      const g = new THREE.Group();
      if (sp.prop === 'guitar') {
        g.add(sphere(0.2, '#b02a2a', { scale: [1, 1.2, 0.4], pos: [0, -0.15, 0] }));
        g.add(sphere(0.16, '#b02a2a', { scale: [1, 1, 0.4], pos: [0, 0.12, 0] }));
        g.add(box(0.06, 0.6, 0.04, '#3a2414', { pos: [0, 0.5, 0] }));
        g.add(box(0.1, 0.12, 0.04, '#1a1a1a', { pos: [0, 0.82, 0] }));
      } else if (sp.prop === 'cards') {
        g.add(box(0.36, 0.24, 0.015, '#f2f0e8', {}));
        g.add(box(0.22, 0.03, 0.016, '#c23838', { pos: [0, 0.04, 0.001] }));
      } else {
        g.add(cyl(0.18, 0.18, 0.05, '#ffd24a', { rot: [Math.PI / 2, 0, 0], metalness: 0.7, roughness: 0.25 }));
        g.add(torus(0.2, 0.02, '#ffd24a', { metalness: 0.7, roughness: 0.25 }));
      }
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      const yaw = f.yaw + yawOff;
      const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const pos = f.pos.clone().setY(f.groundY + 1.3 * f.scale).addScaledVector(dir, 0.5);
      g.position.copy(pos);
      g.visible = delay <= 0;
      this.scene.add(g);
      this.projectiles.push({ mesh: g, owner: f, dir, speed: sp.prop === 'cards' ? 10 : 8.5, t: -delay, life: 1.6, boomerang: sp.prop === 'medallion', dmg: sp.prop === 'cards' ? 7 : 15, kd: sp.prop !== 'cards', inRing: f.inRing, y: pos.y });
    };
    if (sp.prop === 'cards') { make(-0.18, 0); make(0, 0.08); make(0.18, 0.16); }
    else make(0, 0);
    this.game.audio.play('whoosh');
  }

  update(dt) {
    const g = this.game;
    // Respawn weapons over time, up to three lying around.
    this.spawnT -= dt;
    const lying = this.items.filter((w) => w.state === 'ground').length;
    if (this.spawnT <= 0 && lying < 3 && g.match && !g.match.over) {
      this.spawnT = rand(8, 14);
      this.spawn(pick(['chair', 'bat', 'bell', 'trash', 'mic']), Math.random() < 0.35);
      g.audio.play('pickup', 0.4);
    }
    for (const w of this.items) {
      if (w.popIn !== undefined && w.state === 'ground') {
        w.popIn += dt * 3;
        const k = Math.min(1, w.popIn);
        w.mesh.scale.setScalar(k < 1 ? k * 1.2 : 1);
        if (k >= 1) w.popIn = undefined;
      }
      if (w.state !== 'flying') continue;
      w.vel.y -= 16 * dt;
      w.pos.copy(w.mesh.position.addScaledVector(w.vel, dt));
      w.mesh.rotation.x += (w.spin || 4) * dt;
      // Thrown weapons hit the opponent.
      if (w.thrower) {
        const o = w.thrower.opp;
        if (o && Math.hypot(o.pos.x - w.pos.x, o.pos.z - w.pos.z) < 0.6 && Math.abs(w.pos.y - (o.groundY + o.y + 1.0)) < 1.0 && !o.isDown) {
          o.takeHit(w.thrower, { dmg: w.dmg, kd: true, launch: 2.5, push: 2, sfx: w.sfx, part: 'head', big: true, weapon: true });
          w.thrower = null;
          w.vel.multiplyScalar(-0.25);
        }
      }
      const floorY = Math.abs(w.pos.x) < APRON - 0.1 && Math.abs(w.pos.z) < APRON - 0.1 ? RING_H : 0;
      w.inRing = floorY > 0;
      if (Math.abs(w.pos.x) > FLOOR + 0.3) { w.vel.x *= -0.4; w.mesh.position.x = Math.sign(w.pos.x) * (FLOOR + 0.3); }
      if (Math.abs(w.pos.z) > FLOOR + 0.3) { w.vel.z *= -0.4; w.mesh.position.z = Math.sign(w.pos.z) * (FLOOR + 0.3); }
      if (w.mesh.position.y <= floorY && w.vel.y < 0) {
        w.mesh.position.y = floorY;
        if (Math.abs(w.vel.y) > 2) { w.vel.y *= -0.3; w.vel.x *= 0.5; w.vel.z *= 0.5; g.audio.play(w.sfx === 'bat' ? 'bat' : 'clang', 0.4); }
        else { w.state = 'ground'; w.thrower = null; w.mesh.rotation.set(0, rand(0, 6), w.type === 'chair' || w.type === 'bat' ? Math.PI / 2 : 0); w.pos.copy(w.mesh.position); prepareBoil(w.mesh); }
      }
    }
    this.items = this.items.filter((w) => w.state !== 'gone');
    // Projectiles.
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.t += dt;
      if (p.t < 0) continue;
      p.mesh.visible = true;
      if (p.boomerang && p.t > 0.7 && !p.back) { p.back = true; }
      if (p.back) {
        const to = p.owner.pos.clone().setY(p.owner.groundY + 1.3);
        p.dir.copy(to.sub(p.mesh.position).setY(0).normalize());
      }
      p.mesh.position.addScaledVector(p.dir, p.speed * dt);
      p.mesh.rotation.y += dt * 14;
      p.mesh.rotation.z += dt * 6;
      const o = p.owner.opp;
      const hitO = o && !p.done && Math.hypot(o.pos.x - p.mesh.position.x, o.pos.z - p.mesh.position.z) < 0.55 * o.scale && o.sameArea(p.owner) && !o.isDown && !['thrown', 'grabbed', 'climb'].includes(o.state);
      if (hitO) {
        p.done = true;
        o.takeHit(p.owner, { dmg: p.dmg, kd: p.kd, launch: 3, push: 1.8, sfx: p.kd ? 'heavy' : 'slap', part: 'head', big: p.kd, special: true, stun: 0.5 });
        g.particles.chunks(p.mesh.position.clone(), '#e8e0d0', 6, 2.5);
        if (!p.boomerang) p.t = 99;
      }
      const ret = p.back && p.mesh.position.distanceTo(p.owner.pos.clone().setY(p.owner.groundY + 1.3)) < 0.5;
      if (p.t > p.life || ret || Math.abs(p.mesh.position.x) > 9 || Math.abs(p.mesh.position.z) > 9) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  animTick() {
    for (const w of this.items) if (w.state === 'ground') boil(w.mesh, 0.5);
  }
}
