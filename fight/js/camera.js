// Isometric-style broadcast camera: long lens at 35° elevation, 45° yaw,
// tracking the fighters' midpoint and zooming with their distance.
// Also handles shake, cinematic close-ups and orbit shots.
import * as THREE from 'three';
import { RING_H } from './fighter.js';
import { clamp, lerp, rand } from './util.js';

export const ISO_YAW = Math.PI / 4;      // camera sits on the +x/+z diagonal
export const ISO_ELEV = 35 * Math.PI / 180;

// Screen-relative movement basis on the ground plane.
export const SCREEN_UP = new THREE.Vector2(-Math.SQRT1_2, -Math.SQRT1_2);   // (x, z)
export const SCREEN_RIGHT = new THREE.Vector2(Math.SQRT1_2, -Math.SQRT1_2);

export class CameraRig {
  constructor(aspect) {
    this.cam = new THREE.PerspectiveCamera(20, aspect, 1, 200);
    this.target = new THREE.Vector3(0, RING_H + 1, 0);
    this.dist = 26;
    this.mode = 'iso';
    this.shakeAmt = 0;
    this.shakeOn = true;
    this.cine = null;
    this.orbitA = 0;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.place(true);
  }

  setAspect(a) {
    this.cam.aspect = a;
    // Portrait screens need a wider lens to keep the ring readable.
    this.baseFov = a < 1 ? 20 / Math.max(a, 0.5) * 0.8 : 20;
    this.cam.fov = this.baseFov;
    this.cam.updateProjectionMatrix();
  }

  shake(a) { if (this.shakeOn) this.shakeAmt = Math.min(1.2, this.shakeAmt + a); }

  // Cinematic shot: fixed position looking at a point, for `dur` seconds.
  shot(pos, look, dur = 1, opts = {}) {
    this.cine = { pos: pos.clone(), look: look.clone(), dur, t: 0, fov: opts.fov ?? 28, follow: opts.follow, offset: opts.offset, cut: opts.cut ?? true, orbit: opts.orbit || 0 };
    if (this.cine.cut) { this.pos.copy(pos); this.look.copy(look); }
  }
  clearShot() { this.cine = null; }

  isoPose(center, dist, out) {
    const h = Math.sin(ISO_ELEV) * dist, g = Math.cos(ISO_ELEV) * dist;
    out.set(center.x + Math.sin(ISO_YAW) * g, center.y + h, center.z + Math.cos(ISO_YAW) * g);
    return out;
  }

  place(snap) {
    this.isoPose(this.target, this.dist, this.pos);
    this.look.copy(this.target);
    if (snap) this.apply();
  }

  update(dt, fighters) {
    const c = this.cam;
    let fov = this.baseFov ?? 20;
    if (this.cine) {
      const s = this.cine;
      s.t += dt;
      let wantPos = s.pos, wantLook = s.look;
      if (s.follow) {
        wantLook = s.follow.headWorld ? s.follow.headWorld().add(new THREE.Vector3(0, -0.3, 0)) : s.follow;
        if (s.offset) wantPos = wantLook.clone().add(s.offset);
      }
      if (s.orbit) {
        const rel = wantPos.clone().sub(wantLook);
        rel.applyAxisAngle(new THREE.Vector3(0, 1, 0), s.orbit * s.t);
        wantPos = wantLook.clone().add(rel);
      }
      this.pos.lerp(wantPos, 1 - Math.exp(-dt * 8));
      this.look.lerp(wantLook, 1 - Math.exp(-dt * 10));
      fov = s.fov;
      if (s.t > s.dur) this.cine = null;
    } else if (this.mode === 'orbit') {
      this.orbitA += dt * 0.12;
      const d = 22;
      this.pos.lerp(new THREE.Vector3(Math.sin(this.orbitA) * d, 9, Math.cos(this.orbitA) * d), 1 - Math.exp(-dt * 2));
      this.look.lerp(new THREE.Vector3(0, RING_H + 1, 0), 1 - Math.exp(-dt * 3));
      fov = Math.max(26, this.baseFov ?? 20);
    } else if (fighters.length) {
      // Track midpoint, zoom with spread.
      const [a, b] = fighters;
      const mid = new THREE.Vector3((a.pos.x + b.pos.x) / 2, 0, (a.pos.z + b.pos.z) / 2);
      const spread = Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
      mid.multiplyScalar(0.75);
      const anyOut = !a.inRing || !b.inRing;
      mid.y = RING_H * (anyOut ? 0.5 : 1) + 0.9 + Math.max(a.y, b.y) * 0.3;
      this.target.lerp(mid, 1 - Math.exp(-dt * 4));
      const want = clamp(13.5 + spread * 1.6, 15, 27) * (this.cam.aspect < 1 ? 1.1 : 1);
      this.dist = lerp(this.dist, want, 1 - Math.exp(-dt * 2.5));
      const p = new THREE.Vector3();
      this.isoPose(this.target, this.dist, p);
      this.pos.lerp(p, 1 - Math.exp(-dt * 10));
      this.look.lerp(this.target, 1 - Math.exp(-dt * 10));
    }
    if (Math.abs(c.fov - fov) > 0.01) { c.fov = lerp(c.fov, fov, 1 - Math.exp(-dt * 8)); c.updateProjectionMatrix(); }
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 3);
    this.apply();
  }

  apply() {
    const c = this.cam;
    c.position.copy(this.pos);
    const s = this.shakeAmt * this.shakeAmt * 0.25;
    if (s > 0) c.position.add(new THREE.Vector3(rand(-s, s), rand(-s, s), rand(-s, s)));
    c.lookAt(this.look);
  }
}
