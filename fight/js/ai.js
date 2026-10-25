// CPU opponent: a small state machine that fills the same input frame a
// human controller would (approach, attack, block, grapple, retreat,
// grab a weapon, taunt).
import * as THREE from 'three';
import { RING, APRON } from './fighter.js';
import { rand, chance, clamp, wrapAngle } from './util.js';

const LEVELS = {
  easy:   { react: 0.55, block: 0.15, combo: 0.25, aggro: 0.45, mash: 0.08, special: 0.3, weapon: 0.25, grab: 0.18 },
  normal: { react: 0.32, block: 0.4, combo: 0.55, aggro: 0.6, mash: 0.18, special: 0.6, weapon: 0.4, grab: 0.28 },
  hard:   { react: 0.16, block: 0.68, combo: 0.85, aggro: 0.75, mash: 0.32, special: 0.85, weapon: 0.45, grab: 0.34 },
};

export class AIController {
  constructor(level = 'normal') {
    this.setLevel(level);
    this.frame = { dir: new THREE.Vector2(), held: {}, pressed: {}, anyPressed: false, doubleTap: false };
    this.think = 0;
    this.mode = 'approach';
    this.modeT = 0;
    this.lastOppSerial = -1;
    this.f = null;
  }
  setLevel(l) { this.level = l; this.p = LEVELS[l] || LEVELS.normal; }

  press(b) { this.frame.pressed[b] = true; this.frame.anyPressed = true; }
  moveTo(x, z, f) {
    const dx = x - f.pos.x, dz = z - f.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.05) this.frame.dir.set(0, 0);
    else this.frame.dir.set(dx / d, dz / d);
    return d;
  }

  poll(dt) {
    const fr = this.frame;
    fr.pressed = {};
    fr.anyPressed = false;
    fr.doubleTap = false;
    const f = this.f, o = f?.opp;
    if (!f || !o) { fr.dir.set(0, 0); fr.held = {}; return fr; }
    const p = this.p;
    this.think -= dt;
    this.modeT += dt;
    const dist = f.distTo(o);
    const same = f.sameArea(o);

    // Struggle states: mash.
    if (['grabbed', 'pinned', 'down'].includes(f.state)) {
      if (chance(p.mash)) this.press(['punch', 'kick', 'grab'][Math.floor(rand(0, 3))]);
      fr.dir.set(0, 0); fr.held = {};
      return fr;
    }
    if (f.state === 'grappling') {
      if (!this.grapT) this.grapT = rand(0.15, 0.6) * (this.level === 'hard' ? 0.6 : 1);
      this.grapT -= dt;
      if (this.grapT <= 0) {
        this.grapT = 0;
        const g = f.grapple;
        const r = Math.random();
        if (f.meter >= 50 && chance(p.special * 0.6)) this.press('special');
        else if (g && g.butts < 2 && r < 0.35) this.press('punch');
        else if (r < 0.7) this.press('kick');
        else {
          // Whip toward the far ropes.
          const ang = Math.atan2(-f.pos.x, -f.pos.z) + rand(-0.6, 0.6);
          fr.dir.set(Math.sin(ang), Math.cos(ang));
          this.press('grab');
        }
      }
      return fr;
    }
    this.grapT = 0;
    if (f.state === 'perch') {
      if (dist < 4 && same && !o.isDown && chance(0.08)) this.press('kick');
      else if (o.isDown && dist < 4 && chance(0.05)) this.press('kick');
      return fr;
    }

    // Clay Time: walk up and finish them.
    if (o.flags.clayTime) {
      const d = this.moveTo(o.pos.x, o.pos.z, f);
      fr.held = {};
      if (d < 1.4 && chance(0.06)) this.press('special');
      if (d < 1.1) fr.dir.set(0, 0);
      return fr;
    }

    // React to incoming attacks.
    if (o.state === 'attack' && o.moveSerial !== this.lastOppSerial && dist < 1.8 && same) {
      this.lastOppSerial = o.moveSerial;
      if (chance(p.block) && !o.move?.hit?.low) { this.blockT = 0.45; }
    }
    if (this.blockT > 0) {
      this.blockT -= dt;
      fr.held = { block: true };
      fr.dir.set(0, 0);
      return fr;
    }
    // Clothesline an opponent bouncing off the ropes.
    if (o.state === 'whipped' && dist < 1.7 && same) {
      const toMe = Math.abs(wrapAngle(o.dirTo(f) - o.yaw));
      if (toMe < 0.6) { this.press(chance(0.5) ? 'punch' : 'kick'); fr.dir.set(0, 0); return fr; }
    }

    if (this.think <= 0) {
      this.think = p.react * rand(0.7, 1.3);
      this.decide(f, o, dist, same);
    }
    fr.held = {};
    fr.dir.set(0, 0);
    this.act(f, o, dist, same, dt);
    return fr;
  }

  decide(f, o, dist, same) {
    // Committed modes run their course before re-thinking.
    const hold = { circle: 1.2, retreat: 1.0, corner: 2.5, weapon: 4, hover: 0.8 }[this.mode];
    if (hold && this.modeT < hold) return;
    const prev = this.mode;
    this.decideInner(f, o, dist, same);
    if (this.mode !== prev) this.modeT = 0;
  }

  decideInner(f, o, dist, same) {
    const p = this.p;
    if (o.isDown && o.state !== 'knock') {
      if (!same) { this.mode = 'approach'; return; }
      const r = Math.random();
      if (o.hp < o.maxHp * 0.35 && f.inRing && o.inRing && r < 0.4) this.mode = 'pin';
      else if (r < 0.55) this.mode = 'stomp';
      else if (r < 0.65 && this.level !== 'easy' && f.inRing) this.mode = 'corner';
      else if (r < 0.75) this.mode = 'taunt';
      else this.mode = 'hover';
      return;
    }
    if (!f.weapon && chance(p.weapon * 0.35)) {
      const w = f.game.weapons.nearestAny(f);
      if (w && w.d < 5.5) { this.mode = 'weapon'; this.weaponTarget = w.w; return; }
    }
    if (f.meter >= 50 && chance(p.special * 0.5)) {
      const t = f.def.special.type;
      const ranged = t === 'projectile' || t === 'scream' || t === 'charge';
      if ((ranged && dist > 1.5 && dist < 5) || (!ranged && dist < 1.6)) { this.mode = 'special'; return; }
    }
    if (f.hp < f.maxHp * 0.25 && chance(0.25)) { this.mode = 'retreat'; this.modeT = 0; return; }
    if (dist > 1.15 || !same) { this.mode = dist > 4 && chance(0.4) ? 'run' : 'approach'; return; }
    this.mode = chance(p.aggro) ? 'attack' : chance(0.5) ? 'circle' : 'attack';
  }

  act(f, o, dist, same, dt) {
    const fr = this.frame, p = this.p;
    switch (this.mode) {
      case 'approach': case 'run': {
        let tx = o.pos.x, tz = o.pos.z;
        if (!f.inRing && o.inRing) {
          // Walk to the middle of the nearest side and climb in.
          const ax = Math.abs(f.pos.x) > Math.abs(f.pos.z) ? 'x' : 'z';
          if (ax === 'x') { tx = Math.sign(f.pos.x) * (APRON - 0.6); tz = clamp(f.pos.z, -2.2, 2.2); }
          else { tz = Math.sign(f.pos.z) * (APRON - 0.6); tx = clamp(f.pos.x, -2.2, 2.2); }
        } else if (f.inRing && !o.inRing) {
          const ax = Math.abs(o.pos.x) > Math.abs(o.pos.z) ? 'x' : 'z';
          if (ax === 'x') { tx = Math.sign(o.pos.x) * (RING + 1); tz = clamp(f.pos.z, -2.2, 2.2); }
          else { tz = Math.sign(o.pos.z) * (RING + 1); tx = clamp(f.pos.x, -2.2, 2.2); }
        }
        const d = this.moveTo(tx, tz, f);
        if (this.mode === 'run' && same && dist > 2.5) fr.held.run = true;
        if (this.mode === 'run' && same && dist < 1.6 && f.state === 'run') this.press(chance(0.5) ? 'punch' : 'kick');
        if (same && dist < 1.0) { fr.dir.set(0, 0); this.mode = 'attack'; }
        break;
      }
      case 'attack': {
        if (!same) { this.mode = 'approach'; break; }
        if (dist > 1.2) { this.moveTo(o.pos.x, o.pos.z, f); break; }
        if (f.state === 'attack') {
          // Continue the punch combo.
          if (f.move?.combo && chance(p.combo * 0.25)) this.press('punch');
          break;
        }
        if (f.state !== 'idle' && f.state !== 'walk') break;
        if (chance(0.25)) {
          const r = Math.random();
          if (f.weapon) this.press(dist < 1.3 ? 'punch' : 'kick');
          else if (r < p.grab) this.press('grab');
          else if (r < 0.65) this.press('punch');
          else this.press('kick');
        }
        break;
      }
      case 'circle': {
        const a = Math.atan2(f.pos.x - o.pos.x, f.pos.z - o.pos.z) + 0.9;
        this.moveTo(o.pos.x + Math.sin(a) * 1.6, o.pos.z + Math.cos(a) * 1.6, f);
        if (this.modeT > 1.2) { this.mode = 'approach'; this.modeT = 0; }
        break;
      }
      case 'retreat': {
        const a = Math.atan2(f.pos.x - o.pos.x, f.pos.z - o.pos.z);
        this.moveTo(f.pos.x + Math.sin(a) * 2, f.pos.z + Math.cos(a) * 2, f);
        if (this.modeT > 1.0) this.mode = chance(0.4) ? 'taunt' : 'approach';
        break;
      }
      case 'weapon': {
        const w = this.weaponTarget;
        if (!w || w.state !== 'ground' || f.weapon) { this.mode = 'approach'; break; }
        if (w.inRing !== f.inRing) {
          // Head toward the ropes on the weapon's side.
          const ax = Math.abs(w.pos.x) > Math.abs(w.pos.z) ? 'x' : 'z';
          if (f.inRing) this.moveTo(ax === 'x' ? Math.sign(w.pos.x) * 4 : clamp(f.pos.x, -2.2, 2.2), ax === 'z' ? Math.sign(w.pos.z) * 4 : clamp(f.pos.z, -2.2, 2.2), f);
          else this.moveTo(ax === 'x' ? Math.sign(f.pos.x) * 2 : w.pos.x, ax === 'z' ? Math.sign(f.pos.z) * 2 : w.pos.z, f);
          break;
        }
        const d = this.moveTo(w.pos.x, w.pos.z, f);
        if (d < 0.8) { fr.dir.set(0, 0); this.press('block'); this.mode = 'approach'; }
        break;
      }
      case 'special': {
        if (f.state === 'idle' || f.state === 'walk') this.press('special');
        this.mode = 'approach';
        break;
      }
      case 'stomp': case 'pin': {
        if (!o.isDown) { this.mode = 'approach'; break; }
        const d = this.moveTo(o.pos.x, o.pos.z, f);
        if (d < 1.0) {
          fr.dir.set(0, 0);
          if (f.state === 'idle' || f.state === 'walk') this.press(this.mode === 'pin' && o.state === 'down' ? 'grab' : 'punch');
        }
        break;
      }
      case 'corner': {
        const sx = f.pos.x >= 0 ? 1 : -1, sz = f.pos.z >= 0 ? 1 : -1;
        this.moveTo(sx * 4, sz * 4, f);
        if (this.modeT > 2.5 || !o.isDown) this.mode = 'approach';
        break;
      }
      case 'taunt': {
        if (f.state === 'idle' || f.state === 'walk') this.press('special');
        this.mode = 'hover';
        this.modeT = 0;
        break;
      }
      case 'hover': {
        if (this.modeT > 0.8) this.mode = 'approach';
        break;
      }
    }
  }
}
