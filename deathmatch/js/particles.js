// Flying clay: chunks, teeth, sweat, dust, shockwaves and dizzy stars.
import * as THREE from 'three';
import { clayMat, lumpy } from './clay.js';
import { RING_H, APRON } from './fighter.js';
import { rand } from './util.js';

const chunkGeo = lumpy(new THREE.IcosahedronGeometry(0.06, 1), 0.02, 18, 3);
const toothGeo = new THREE.BoxGeometry(0.05, 0.065, 0.035);
const dropGeo = new THREE.SphereGeometry(0.035, 8, 6);
const starShape = (() => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.045 : 0.1, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 });
})();

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.waves = [];
    this.stars = new Map();
  }

  floorAt(p) { return Math.abs(p.x) < APRON - 0.1 && Math.abs(p.z) < APRON - 0.1 ? RING_H : 0; }

  spawn(geo, mat, pos, vel, opts = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    m.castShadow = true;
    m.scale.setScalar(opts.scale ?? 1);
    m.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
    this.scene.add(m);
    this.list.push({ m, vel, life: opts.life ?? rand(1.6, 3), spin: new THREE.Vector3(rand(-9, 9), rand(-9, 9), rand(-9, 9)), bounce: opts.bounce ?? 0.35, grav: opts.grav ?? 16, s0: m.scale.x, stick: opts.stick });
  }

  chunks(pos, color, n = 6, speed = 2.5) {
    const mat = clayMat(color);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(rand(-1, 1), rand(0.3, 1.4), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.5, 1.2));
      this.spawn(chunkGeo, mat, pos.clone().add(new THREE.Vector3(rand(-0.1, 0.1), rand(-0.1, 0.1), rand(-0.1, 0.1))), v, { scale: rand(0.6, 1.6), stick: true });
    }
  }

  tooth(pos, color) {
    const mat = clayMat(color, { roughness: 0.3, rim: 0.05 });
    this.spawn(toothGeo, mat, pos.clone(), new THREE.Vector3(rand(-2, 2), rand(3, 5), rand(-2, 2)), { life: 6, bounce: 0.5, stick: true });
  }

  sweat(pos, n = 5) {
    const mat = clayMat('#bfe4ff', { roughness: 0.15, rim: 0.1, transparent: true, opacity: 0.85 });
    for (let i = 0; i < n; i++) this.spawn(dropGeo, mat, pos.clone(), new THREE.Vector3(rand(-2, 2), rand(1.5, 3.5), rand(-2, 2)), { life: 0.8, scale: rand(0.6, 1.2) });
  }

  dust(pos) {
    const mat = clayMat('#d8d4cc', { transparent: true, opacity: 0.8 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.spawn(chunkGeo, mat, pos.clone(), new THREE.Vector3(Math.cos(a) * 2.2, rand(0.3, 0.8), Math.sin(a) * 2.2), { life: 0.6, scale: rand(1.2, 2), grav: 4 });
    }
  }

  sparkle(pos, color) {
    const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    for (let i = 0; i < 12; i++) this.spawn(starShape, mat, pos.clone(), new THREE.Vector3(rand(-3, 3), rand(1, 4), rand(-3, 3)), { life: 0.7, scale: rand(0.6, 1.1), grav: 4 });
  }

  ring(pos, color, { r0 = 0.3, r1 = 3, life = 0.6, y = 0, tilt = -Math.PI / 2, yaw = 0, tube = 0.06 } = {}) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, tube, 8, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false }));
    m.position.copy(pos);
    m.position.y += y;
    m.rotation.set(tilt, yaw, 0, 'YXZ');
    m.scale.setScalar(r0);
    this.scene.add(m);
    this.waves.push({ m, t: 0, life, r0, r1 });
  }

  shockwave(pos, color) {
    this.ring(pos, color, { r0: 0.3, r1: 3.2, life: 0.5, tube: 0.08 });
    this.ring(pos, '#ffffff', { r0: 0.2, r1: 2.2, life: 0.4, tube: 0.05 });
    this.dust(pos);
  }

  screamWaves(f, color) {
    const fw = f.forward;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const p = f.headWorld().addScaledVector(fw, 0.4 + i * 0.1);
        this.ring(p, color, { r0: 0.15, r1: 1.4, life: 0.6, tilt: 0, yaw: f.yaw, tube: 0.05 });
        const w = this.waves[this.waves.length - 1];
        w.drift = fw.clone().multiplyScalar(5);
      }, i * 90);
    }
  }

  // Orbiting stars over a dizzy head.
  setStars(f, on) {
    let s = this.stars.get(f);
    if (on && !s) {
      s = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: '#ffe14a', toneMapped: false });
      for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(starShape, mat); m.userData.a = (i / 4) * Math.PI * 2; s.add(m); }
      this.scene.add(s);
      this.stars.set(f, s);
    } else if (!on && s) {
      this.scene.remove(s);
      this.stars.delete(f);
    }
  }

  clear() {
    for (const p of this.list) this.scene.remove(p.m);
    for (const w of this.waves) { this.scene.remove(w.m); w.m.geometry.dispose(); }
    this.list = []; this.waves = [];
    for (const f of [...this.stars.keys()]) this.setStars(f, false);
  }

  update(dt, fighters) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      const m = p.m;
      if (!p.rest) {
        p.vel.y -= p.grav * dt;
        m.position.addScaledVector(p.vel, dt);
        m.rotation.x += p.spin.x * dt; m.rotation.y += p.spin.y * dt;
        const fy = this.floorAt(m.position) + 0.03;
        if (m.position.y < fy) {
          m.position.y = fy;
          if (p.stick && Math.abs(p.vel.y) < 2.5) { p.rest = true; m.scale.y *= 0.5; }
          p.vel.y *= -p.bounce; p.vel.x *= 0.6; p.vel.z *= 0.6;
          p.spin.multiplyScalar(0.5);
        }
      }
      if (p.life < 0.4) m.scale.setScalar(Math.max(0.001, p.s0 * (p.life / 0.4)));
      if (p.life <= 0) { this.scene.remove(m); this.list.splice(i, 1); }
    }
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.t += dt;
      const k = w.t / w.life;
      w.m.scale.setScalar(w.r0 + (w.r1 - w.r0) * k);
      w.m.material.opacity = 0.85 * (1 - k);
      if (w.drift) w.m.position.addScaledVector(w.drift, dt);
      if (k >= 1) { this.scene.remove(w.m); w.m.geometry.dispose(); w.m.material.dispose(); this.waves.splice(i, 1); }
    }
    // Stars follow heads.
    for (const f of fighters) this.setStars(f, f.state === 'dizzy' && !f.scripted);
    this.stars.forEach((s, f) => {
      const hp = f.headWorld();
      s.position.copy(hp).add(new THREE.Vector3(0, 0.25, 0));
      s.rotation.y += dt * 4;
      s.children.forEach((m) => { const a = m.userData.a; m.position.set(Math.cos(a) * 0.35, Math.sin(a * 2 + s.rotation.y * 2) * 0.05, Math.sin(a) * 0.35); m.rotation.y = -s.rotation.y; });
    });
  }
}
