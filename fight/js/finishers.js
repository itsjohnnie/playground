// Cinematic "Clay Time" finishers. Each one takes over both puppets with a
// scripted timeline and a camera move, and leaves something silly behind.
import * as THREE from 'three';
import { sphere, box, clayMat, prepareBoil, boil } from './clay.js';
import { POSES } from './poses.js';
import { blend } from './fighter.js';
import { RING_H } from './fighter.js';
import { clamp, rand, easeOut, easeInOut } from './util.js';

// A blob of the victim's clay with two eyes stuck in it.
function lump(victim, kind = 'lump') {
  const d = victim.def;
  const g = new THREE.Group();
  const r = 0.45 * victim.scale;
  const flat = kind === 'puddle';
  const colors = [d.skin, d.top.color, d.bottom.color, d.hair.color === 'none' ? d.skin : d.hair.color];
  g.add(sphere(r, d.skin, { scale: flat ? [2.2, 0.16, 1.8] : [1.1, 0.75, 1] }));
  colors.forEach((c, i) => {
    const a = (i / colors.length) * Math.PI * 2;
    g.add(sphere(r * 0.45, c, { pos: [Math.cos(a) * r * (flat ? 1.2 : 0.5), flat ? r * 0.02 : r * 0.35, Math.sin(a) * r * (flat ? 1 : 0.5)], scale: flat ? [1.6, 0.25, 1.4] : [1, 0.8, 1] }));
  });
  for (const sx of [1, -1]) {
    const eye = sphere(r * 0.2, '#f6f4ee', { pos: [sx * r * 0.25, flat ? r * 0.12 : r * 0.62, r * 0.45], roughness: 0.3, rim: 0.05 });
    eye.add(sphere(r * 0.1, '#0a0808', { pos: [0, 0, r * 0.15], roughness: 0.2, boil: 0.3 }));
    g.add(eye);
  }
  g.position.copy(victim.pos).setY(victim.groundY + (flat ? 0.02 : r * 0.7));
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  prepareBoil(g);
  return g;
}

function clayBall(victim) {
  const d = victim.def;
  const r = 0.55 * victim.scale;
  const g = new THREE.Group();
  g.add(sphere(r, d.top.color, {}));
  // Smears of each body color pressed into the ball.
  [d.skin, d.bottom.color, d.hair.color === 'none' ? d.skin : d.hair.color, d.skin, d.shoes].forEach((c, i) => {
    const a = i * 2.4, b = i * 1.3;
    g.add(sphere(r * 0.5, c, { pos: [Math.cos(a) * Math.sin(b) * r * 0.62, Math.cos(b) * r * 0.62, Math.sin(a) * Math.sin(b) * r * 0.62], scale: [1, 0.6, 1] }));
  });
  for (const sx of [1, -1]) {
    const eye = sphere(r * 0.18, '#f6f4ee', { pos: [sx * r * 0.28, r * 0.25, r * 0.86] });
    eye.add(sphere(r * 0.09, '#0a0808', { pos: [0, 0, r * 0.14] }));
    g.add(eye);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  prepareBoil(g);
  return g;
}

export class FinisherRunner {
  constructor(game, att, vic) {
    this.game = game;
    this.a = att;
    this.v = vic;
    this.t = 0;
    this.type = att.def.finisher.type;
    this.name = att.def.finisher.name;
    this.props = [];
    this.done = false;
    this.events = new Set();
    this.dur = { box: 5.2, explode: 4.6, pancake: 4.2, pretzel: 4.6, headpop: 5.2, launch: 5.4, stretch: 4.6, ball: 5.2, melt: 5.0 }[this.type] || 4.5;
    this.setup();
  }

  once(key, at) {
    if (this.t >= at && !this.events.has(key)) { this.events.add(key); return true; }
    return false;
  }

  setup() {
    const { a, v, game } = this;
    // Line them up: attacker faces the victim at arm's length.
    const yaw = Math.atan2(v.pos.x - a.pos.x, v.pos.z - a.pos.z) || 0;
    a.pos.set(v.pos.x - Math.sin(yaw) * 1.0, 0, v.pos.z - Math.cos(yaw) * 1.0);
    a.inRing = v.inRing;
    a.y = 0; v.y = 0;
    a.yaw = yaw;
    v.yaw = yaw + Math.PI;
    a.vel.set(0, 0, 0); v.vel.set(0, 0, 0);
    a.dropWeapon();
    a.scripted = () => {};
    v.scripted = () => {};
    a.scriptPose = 'guard';
    v.scriptPose = 'dizzy1';
    // Side-on low camera like the TV show.
    const mid = a.pos.clone().add(v.pos).multiplyScalar(0.5).setY(v.groundY + 1.3);
    const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    if (side.x + side.z < 0) side.negate();
    this.mid = mid;
    this.side = side;
    game.cam.shot(mid.clone().addScaledVector(side, 6.2).add(new THREE.Vector3(0, 1.6, 0)), mid.clone().add(new THREE.Vector3(0, -0.2, 0)), this.dur + 2, { fov: 32, orbit: 0.05 });
    game.ui.banner(this.name, 'FINISHER', 2.2, 'clay');
    game.audio.play('gong');
    game.arena.excite(1);
  }

  hide(f) { f.model.group.visible = false; }

  update(dt) {
    this.t += dt;
    const { a, v, game, t } = this;
    const fn = this[this.type];
    fn?.call(this, t, dt);
    for (const p of this.props) if (p.userData.spin) p.rotation.y += dt * p.userData.spin;
    if (t > this.dur && !this.done) {
      this.done = true;
      a.scripted = null;
      a.setState('victory');
    }
  }

  // Inflates and bursts into clay chunks.
  explode(t) {
    const { a, v, game } = this;
    a.scriptPose = t < 0.4 ? 'screamWind' : t < 1.8 ? 'scream' : 'hips1';
    if (this.once('scr', 0.4)) { game.audio.play('scream'); game.particles.screamWaves(a, a.def.special.color); }
    if (t > 0.5 && t < 1.9) {
      const k = (t - 0.5) / 1.4;
      const s = v.scale * (1 + k * 0.8 + Math.sin(t * 40) * 0.05 * k);
      v.model.group.scale.set(s, s * (1 + k * 0.2), s);
      v.flat = true;
      v.setExpr('shock', 2);
      v.scriptPose = 'tpose';
    }
    if (this.once('boom', 1.9)) {
      this.hide(v);
      const p = v.pos.clone().setY(v.groundY + 1.2);
      for (const c of [v.def.skin, v.def.top.color, v.def.bottom.color, v.def.hair.color, v.def.skin]) game.particles.chunks(p, c === 'none' ? v.def.skin : c, 18, 7);
      game.audio.play('slam'); game.audio.play('squish'); game.audio.play('pop');
      game.cam.shake(1.2);
      game.ui.flash();
      const l = lump(v);
      game.scene.add(l);
      this.props.push(l);
    }
    if (t > 2.4) a.scriptPose = Math.floor(t * 3) % 2 ? 'hips1' : 'hips2';
  }

  // Leaps high and lands on them.
  pancake(t) {
    const { a, v, game } = this;
    if (t < 0.4) a.scriptPose = 'crouch';
    else if (t < 1.4) {
      const k = (t - 0.4) / 1.0;
      a.scriptPose = 'perch';
      a.y = Math.sin(k * Math.PI) * 4.5;
      const lerpK = easeInOut(k);
      const start = this.startA || (this.startA = a.pos.clone());
      a.pos.lerpVectors(start, v.pos, lerpK);
      a.groupBoost = true;
    }
    if (this.once('land', 1.4)) {
      a.y = 0.15;
      a.pos.copy(v.pos);
      v.flat = true;
      v.model.group.scale.set(v.scale * 1.7, v.scale * 0.07, v.scale * 1.7);
      v.scriptPose = 'tpose';
      game.audio.play('slam'); game.audio.play('squish', 1.2);
      game.cam.shake(1.2);
      game.particles.dust(v.pos.clone().setY(v.groundY + 0.05));
      game.particles.chunks(v.pos.clone().setY(v.groundY + 0.2), v.def.skin, 10, 4);
      game.ui.flash();
    }
    if (t > 1.4 && t < 2.4) a.scriptPose = 'stomp';
    if (this.once('off', 2.4)) { a.pos.x -= Math.sin(a.yaw) * 1.1; a.pos.z -= Math.cos(a.yaw) * 1.1; a.y = 0; }
    if (t > 2.4) a.scriptPose = Math.floor(t * 2.5) % 2 ? 'flex' : 'flex2';
    if (t > 1.4) v.model.group.scale.set(v.scale * 1.7, v.scale * (0.07 + Math.max(0, Math.sin((t - 1.4) * 9)) * 0.02 * Math.max(0, 2.5 - t)), v.scale * 1.7);
  }

  // Ties them in a knot.
  pretzel(t) {
    const { a, v, game } = this;
    const cx = v.pos.x, cz = v.pos.z;
    if (t > 0.3 && t < 2.6) {
      const ang = (t - 0.3) * 6;
      a.pos.set(cx + Math.sin(ang) * 0.9, 0, cz + Math.cos(ang) * 0.9);
      a.yaw = ang + Math.PI;
      a.scriptPose = 'hold';
      const k = clamp((t - 0.3) / 2.2, 0, 1);
      v.scriptPose = blend(POSES.dizzy1, POSES.pretzel, k);
      v.yaw += 0.2;
      if (Math.floor(t * 6) !== this.lastTick) { this.lastTick = Math.floor(t * 6); game.audio.play('squish', 0.6); }
    }
    if (this.once('tie', 2.6)) { game.audio.play('rope'); game.audio.play('slam'); game.cam.shake(0.6); v.scriptPose = 'pretzel'; }
    if (t > 2.6) a.scriptPose = Math.floor(t * 3) % 2 ? 'point' : 'guard';
  }

  // Headbutts until the head comes off, then shows it to the crowd.
  headpop(t) {
    const { a, v, game } = this;
    const beats = [0.4, 0.9, 1.4];
    beats.forEach((b, i) => {
      if (t > b - 0.2 && t < b + 0.15) a.scriptPose = t < b ? 'headbuttWind' : 'headbutt';
      if (this.once('hb' + i, b)) {
        game.audio.play('heavy'); game.audio.play('squish');
        game.particles.chunks(v.headWorld(), v.def.skin, 5, 2.5);
        v.squish = 1; v.squishKind = 'head';
        game.cam.shake(0.4);
      }
    });
    if (this.once('pop', 1.45)) {
      const head = v.J.head;
      game.scene.attach(head);
      this.head = head;
      this.headVel = new THREE.Vector3(Math.sin(a.yaw) * 0.6, 7, Math.cos(a.yaw) * 0.6);
      game.audio.play('pop');
      game.ui.flash();
    }
    if (this.head && !this.caught) {
      this.headVel.y -= 16 * (1 / 60);
      this.head.position.addScaledVector(this.headVel, 1 / 60);
      this.head.rotation.x += 0.3;
      const hand = new THREE.Vector3();
      a.J.handR.getWorldPosition(hand);
      if (t > 2.3 && this.headVel.y < 0 && this.head.position.y < hand.y + 0.5) {
        this.caught = true;
        a.J.handR.attach(this.head);
        this.head.position.set(0, 0.25, 0.1);
        this.head.rotation.set(0, 0, 0);
        game.audio.play('squish');
      }
    }
    if (t > 1.5 && t < 2.3) a.scriptPose = 'raise';
    if (t > 2.3) a.scriptPose = Math.floor(t * 3) % 2 ? 'horns' : 'horns2';
    // Headless body wanders around, arms out.
    if (t > 1.6) {
      const ph = (t * 4) % 4;
      v.scriptPose = { ...blend(POSES.walk1, POSES.walk3, ph < 2 ? ph / 2 : (4 - ph) / 2), shL: [-90, 0, 10], shR: [-90, 0, -10], elL: [0, 0, 0], elR: [0, 0, 0] };
      v.yaw += Math.sin(t * 2) * 0.03;
      v.pos.x += Math.sin(v.yaw) * 0.006;
      v.pos.z += Math.cos(v.yaw) * 0.006;
    }
  }

  // Uppercut into orbit; comes back down folded like an accordion.
  launch(t) {
    const { a, v, game } = this;
    a.scriptPose = t < 0.6 ? 'upperWind' : t < 1.4 ? 'upper' : 'bow';
    if (this.once('up', 0.65)) {
      game.audio.play('heavy'); game.audio.play('whoosh');
      game.cam.shake(0.8);
      game.ui.flash();
      this.vy = 26;
      v.scriptPose = 'fly';
      game.cam.shot(v.pos.clone().setY(v.groundY + 1).addScaledVector(this.side, 9).add(new THREE.Vector3(0, -0.5, 0)), v.pos.clone().setY(v.groundY + 4), 1.6, { fov: 40, follow: null });
    }
    if (t > 0.65 && t < 3.6) {
      if (t < 2.4) { v.y += this.vy / 60; v.flat = true; }
      else {
        if (!this.falling) { this.falling = true; v.y = 22; game.audio.play('whoosh'); }
        v.y = Math.max(0, v.y - 30 / 60);
      }
    }
    if (this.once('cam2', 2.4)) game.cam.shot(this.mid.clone().addScaledVector(this.side, 6).add(new THREE.Vector3(0, 1, 0)), this.mid.clone().setY(v.groundY + 1.2), 3, { fov: 30 });
    if (this.falling && v.y <= 0 && this.once('land', 2.5)) {
      v.model.group.scale.set(v.scale * 1.25, v.scale * 0.32, v.scale * 1.25);
      v.scriptPose = 'stand';
      game.audio.play('slam'); game.audio.play('rope');
      game.cam.shake(1.1);
      game.particles.dust(v.pos.clone().setY(v.groundY + 0.05));
    }
    if (this.events.has('land')) {
      const w = Math.sin(t * 16) * 0.06 * Math.max(0, 4.5 - t);
      v.model.group.scale.set(v.scale * (1.25 - w), v.scale * (0.32 + w), v.scale * (1.25 - w));
    }
  }

  // Stretches their neck like taffy, then lets go.
  stretch(t) {
    const { a, v, game } = this;
    const J = v.J;
    if (!this.neckMesh) {
      this.neckMesh = J.neck.children.find((c) => c.isMesh);
      this.neck0 = this.neckMesh.position.y;
    }
    const start = this.startA || (this.startA = a.pos.clone());
    if (t < 0.5) a.scriptPose = 'reach';
    let L = 0.07;
    if (t >= 0.5 && t < 2.6) {
      const k = easeOut(clamp((t - 0.5) / 1.8, 0, 1));
      a.scriptPose = 'hold';
      const back = 2.6 * k;
      a.pos.set(start.x - Math.sin(a.yaw) * back, 0, start.z - Math.cos(a.yaw) * back);
      L = 0.07 + 1.0 + back;
      v.scriptPose = { ...POSES.dizzy1, neck: [-80, 0, 0], spine: [20, 0, 0] };
      if (Math.floor(t * 5) !== this.lastTick) { this.lastTick = Math.floor(t * 5); game.audio.play('squish', 0.4); }
    }
    if (this.once('snap', 2.6)) { game.audio.play('rope'); game.audio.play('pop'); game.cam.shake(0.7); a.scriptPose = 'fly'; this.snapT = 0; }
    if (t >= 2.6) {
      const k = clamp((t - 2.6) / 0.35, 0, 1);
      L = 0.07 + (1.0 + 2.6) * (1 - k) + Math.sin(k * Math.PI * 3) * 0.1 * (1 - k);
      v.scriptPose = t < 3.1 ? { ...POSES.hit2, neck: [-60, 0, 0] } : 'down';
      a.scriptPose = t < 3.2 ? 'sit' : 'raise';
      if (t > 3.1 && !this.fell) { this.fell = true; game.audio.play('slam'); }
    }
    J.head.position.y = L;
    this.neckMesh.scale.y = Math.max(1, L / 0.12);
    this.neckMesh.position.y = L / 2;
    if (this.neckMesh.userData.basePos) { this.neckMesh.userData.basePos.y = L / 2; this.neckMesh.userData.baseScale.y = this.neckMesh.scale.y; }
  }

  // Kneads them into a ball and bowls them out of the ring.
  ball(t) {
    const { a, v, game } = this;
    if (t < 1.6) {
      a.scriptPose = Math.floor(t * 6) % 2 ? 'pound1' : 'pound2';
      const k = clamp((t - 0.2) / 1.3, 0, 1);
      v.flat = true;
      const s = v.scale * (1 - k * 0.98);
      v.model.group.scale.set(s * (1 + k * 0.5), s, s * (1 + k * 0.5));
      if (Math.floor(t * 6) !== this.lastTick) { this.lastTick = Math.floor(t * 6); game.audio.play('squish', 0.7); }
    }
    if (this.once('ball', 1.5)) {
      this.hide(v);
      this.ballMesh = clayBall(v);
      this.ballMesh.position.copy(v.pos).setY(v.groundY + 0.55 * v.scale);
      game.scene.add(this.ballMesh);
      this.props.push(this.ballMesh);
      game.audio.play('pop');
    }
    if (t > 1.6 && t < 2.3) a.scriptPose = t < 2.0 ? 'kickChamber' : 'kick';
    if (this.once('kick', 2.05)) {
      game.audio.play('kick'); game.audio.play('heavy');
      this.ballVel = new THREE.Vector3(Math.sin(a.yaw) * 7, 0, Math.cos(a.yaw) * 7);
      game.cam.shake(0.5);
    }
    if (this.ballVel && this.ballMesh) {
      const b = this.ballMesh, dt = 1 / 60;
      b.position.addScaledVector(this.ballVel, dt);
      const axis = new THREE.Vector3(this.ballVel.z, 0, -this.ballVel.x).normalize();
      b.rotateOnWorldAxis(axis, this.ballVel.length() * dt / 0.55);
      const lim = 6.2;
      if (Math.abs(b.position.x) > lim) { this.ballVel.x *= -0.5; b.position.x = Math.sign(b.position.x) * lim; game.audio.play('clang'); }
      if (Math.abs(b.position.z) > lim) { this.ballVel.z *= -0.5; b.position.z = Math.sign(b.position.z) * lim; game.audio.play('clang'); }
      const inRingZone = Math.abs(b.position.x) < 3.75 && Math.abs(b.position.z) < 3.75;
      const floor = (inRingZone ? RING_H : 0) + 0.55 * v.scale;
      b.position.y += (floor - b.position.y) * 0.25;
      this.ballVel.multiplyScalar(0.992);
    }
    if (t > 2.4) a.scriptPose = Math.floor(t * 2.5) % 2 ? 'raise' : 'raise2';
  }

  // A delivery box drops on them, taped shut, then kicked across the arena.
  box(t) {
    const { a, v, game } = this;
    a.scriptPose = t < 0.9 ? 'point' : t < 2.0 ? 'flex2' : t < 2.6 ? (t < 2.3 ? 'kickChamber' : 'kick') : 'raise';
    const S = 1.25 * v.scale, H = 1.9 * v.scale, card = '#c89a62', dark = '#a87a46';
    if (this.once('make', 0.5)) {
      const g = new THREE.Group();
      const walls = [[0, H / 2, S / 2, 0], [0, H / 2, -S / 2, 0], [S / 2, H / 2, 0, Math.PI / 2], [-S / 2, H / 2, 0, Math.PI / 2]];
      for (const [x, y, z, ry] of walls) g.add(box(S, H, 0.05, card, { pos: [x, y, z], rot: [0, ry, 0], round: 0.1, bumps: 0.8 }));
      this.flaps = [];
      for (let i = 0; i < 4; i++) {
        const piv = new THREE.Group();
        const ang = (i * Math.PI) / 2;
        piv.position.set(Math.sin(ang) * S / 2, H, Math.cos(ang) * S / 2);
        piv.rotation.y = ang;
        const f = box(S, S / 2, 0.04, i % 2 ? card : dark, { pos: [0, S / 4, 0], round: 0.1 });
        piv.add(f);
        piv.rotation.x = 0;
        g.add(piv);
        this.flaps.push(piv);
      }
      // Shipping label.
      const c = document.createElement('canvas'); c.width = 256; c.height = 160;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#f4f0e6'; ctx.fillRect(0, 0, 256, 160);
      ctx.fillStyle = '#1a1a1a'; ctx.font = '900 40px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('SAME-DAY', 128, 64); ctx.font = '700 22px sans-serif'; ctx.fillText('FRAGILE · CLAY', 128, 110);
      for (let i = 0; i < 30; i++) ctx.fillRect(30 + i * 6.5, 126, i % 3 ? 2 : 4, 22);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const label = new THREE.Mesh(new THREE.PlaneGeometry(S * 0.6, S * 0.38), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
      label.position.set(0, H * 0.55, S / 2 + 0.03);
      g.add(label);
      g.position.copy(v.pos).setY(v.groundY + 9);
      g.rotation.y = a.yaw + Math.PI;
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      prepareBoil(g);
      game.scene.add(g);
      this.props.push(g);
      this.crate = g;
      game.audio.play('whoosh');
    }
    if (this.crate && t < 1.1) this.crate.position.y = v.groundY + Math.max(0, 9 * (1 - (t - 0.5) / 0.6));
    if (this.once('land', 1.1)) {
      this.crate.position.y = v.groundY;
      this.hide(v);
      game.audio.play('slam'); game.audio.play('clang', 0.4);
      game.cam.shake(1);
      game.particles.dust(v.pos.clone().setY(v.groundY + 0.05));
    }
    if (this.flaps && t > 1.2 && t < 1.8) {
      const k = Math.min(1, (t - 1.2) / 0.5);
      this.flaps.forEach((f, i) => { f.rotation.x = -Math.max(0, Math.min(k * 4 - i * 0.6, 1)) * (Math.PI / 2); });
      if (Math.floor(t * 8) !== this.lastTick) { this.lastTick = Math.floor(t * 8); game.audio.play('block', 0.5); }
    }
    if (this.once('tape', 1.85)) {
      this.crate.add(box(0.18, 0.02, S * 1.06, '#d8c08a', { pos: [0, H + 0.04, 0], roughness: 0.4 }));
      game.audio.play('slap');
    }
    if (this.once('kick', 2.35)) {
      game.audio.play('kick'); game.audio.play('heavy');
      game.cam.shake(0.6);
      this.crateVel = new THREE.Vector3(Math.sin(a.yaw) * 6.5, 0, Math.cos(a.yaw) * 6.5);
    }
    if (this.crateVel) {
      const c = this.crate, dt = 1 / 60;
      c.position.addScaledVector(this.crateVel, dt);
      c.rotation.y += dt * 2.5;
      const lim = 6.0;
      if (Math.abs(c.position.x) > lim) { this.crateVel.x *= -0.4; c.position.x = Math.sign(c.position.x) * lim; game.audio.play('clang'); }
      if (Math.abs(c.position.z) > lim) { this.crateVel.z *= -0.4; c.position.z = Math.sign(c.position.z) * lim; game.audio.play('clang'); }
      const inRing = Math.abs(c.position.x) < 3.75 && Math.abs(c.position.z) < 3.75;
      c.position.y += ((inRing ? RING_H : 0) - c.position.y) * 0.2;
      this.crateVel.multiplyScalar(0.985);
    }
  }

  // Melts them into a puddle.
  melt(t) {
    const { a, v, game } = this;
    a.scriptPose = t < 0.6 ? 'point' : t < 3.4 ? 'flex2' : 'raise';
    if (t > 0.6 && t < 3.2) {
      const k = clamp((t - 0.6) / 2.4, 0, 1);
      v.flat = true;
      v.scriptPose = blend(POSES.dizzy1, POSES.crouch, k);
      v.model.group.scale.set(v.scale * (1 + k * 0.9), v.scale * (1 - k * 0.85), v.scale * (1 + k * 0.9));
      v.setExpr('hurt', 1);
      if (!this.drip) {
        this.drip = lump(v, 'puddle');
        this.drip.scale.setScalar(0.01);
        game.scene.add(this.drip);
        this.props.push(this.drip);
        if (game.audio.ctx) game.audio.tone('sine', 600, 80, 2.4, 0.3);
      }
      this.drip.scale.setScalar(0.01 + k * 1.1);
      if (Math.random() < 0.3) game.particles.sweat(v.headWorld(), 1);
    }
    if (this.once('gone', 3.2)) { this.hide(v); game.audio.play('squish', 1.2); }
  }

  animTick() {
    for (const p of this.props) boil(p, 1);
  }

  cleanup() {
    for (const p of this.props) p.parent?.remove(p);
    if (this.head) { this.v.J.neck.attach(this.head); this.head.position.set(0, 0.07, 0); this.head.rotation.set(0, 0, 0); }
    if (this.neckMesh) {
      this.v.J.head.position.y = 0.07;
      this.neckMesh.scale.y = 1;
      this.neckMesh.position.y = 0.04;
      if (this.neckMesh.userData.basePos) { this.neckMesh.userData.basePos.y = 0.04; this.neckMesh.userData.baseScale.y = 1; }
    }
    this.v.flat = false;
    this.v.model.group.visible = true;
  }
}
