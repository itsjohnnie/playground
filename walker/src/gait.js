// Procedural walk: a foot-locked, biomechanically-timed gait solver.
//
// What makes a walk read as human, and what this file is built around:
//
//  1. Planted feet never slide. Each foot is pinned to a world-space plant
//     during stance; the leg reaches it with two-bone IK. The swing foot
//     travels from where it really left the floor to where it will really
//     land, so the stride is earned, not painted on.
//  2. The foot rolls. Heel strike (toe up), a controlled lowering to flat,
//     heel rise about the metatarsal heads with the toes staying down, then
//     toe-off. That roll is what carries the body forward smoothly.
//  3. The pelvis does five things at once: bobs (lowest just after heel
//     strike, highest at midstance), sways over the stance foot, rotates
//     the swing hip forward, drops on the swing side, and surges (slowest at
//     midstance). These are Saunders' determinants of gait, small but never
//     absent; without them a walk looks mechanical.
//  4. The thorax counter-rotates against the pelvis, arms swing opposite to
//     the legs with the elbow lagging the shoulder, and the head stays level
//     and looks where it is going.
//  5. Timing comes from the body: step length follows the human walk ratio
//     (step length ∝ √speed·leg), stance shortens as speed rises, and each
//     step carries a little natural variation.
//
// Phase φ ∈ [0,1) is one full gait cycle starting at right heel strike;
// the left foot runs half a cycle behind. All angles below are degrees
// unless a name says otherwise.

import * as THREE from 'three';
import { boneLayout } from './proportions.js';
import { bodyShape } from './body.js';

export const DEFAULT_GAIT = {
  speed: 1.3,        // m/s; 1.3 is an ordinary adult pace
  armSwing: 1.0,     // multiplier on natural arm swing
  bounce: 1.0,       // multiplier on vertical bob
  sway: 1.0,         // multiplier on pelvic sway, rotation and drop
  stepWidth: 1.0,    // multiplier on base of support
  toeOut: 7,         // foot progression angle
  posture: 0,        // −1 slumped … 0 neutral … +1 upright/proud
  variation: 1.0,    // step-to-step irregularity
};

const D = THREE.MathUtils.DEG2RAD;
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const smooth = (t) => t * t * (3 - 2 * t);
const fract = (x) => x - Math.floor(x);
const wrap01 = (x) => fract(x);
const softMin = (a, b, k) => {
  const m = Math.min(a, b);
  return m - k * Math.log(Math.exp(-(a - m) / k) + Math.exp(-(b - m) / k));
};

// deterministic per-step noise in [-1, 1]
function hash(n, k) {
  const s = Math.sin(n * 127.1 + k * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

function qFromEuler(yaw, roll, pitch, out = new THREE.Quaternion()) {
  // world yaw about Y, then roll about the body's forward axis, then pitch
  // about its lateral axis (positive pitch tips the top forward)
  out.setFromAxisAngle(Y, yaw);
  _q2.setFromAxisAngle(Z, roll);
  out.multiply(_q2);
  _q2.setFromAxisAngle(X, pitch);
  return out.multiply(_q2);
}

// orientation whose local −Y points along `down` and local +Z leans to `front`
function qFromDownFront(down, front, out = new THREE.Quaternion()) {
  const y = _v.copy(down).negate().normalize();
  const z = new THREE.Vector3().copy(front).addScaledVector(y, -front.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  _m.makeBasis(x, y, z);
  return out.setFromRotationMatrix(_m);
}

// derived gait timing from body + speed
export function gaitTiming(spec, g) {
  const v = Math.max(0.05, g.speed);
  // walk ratio (step length / cadence in steps·min⁻¹) is close to constant
  // across speeds for a given person, ≈ 0.0066 m·min for average legs
  const W = 0.0066 * (spec.legLen / 0.8597) * (1 - 0.04 * (spec.c.sex ?? 0)); // women: slightly higher cadence
  const step = Math.sqrt(v * 60 * W);
  const cadence = (v * 60) / step; // steps per minute
  const T = 120 / cadence; // one cycle = two steps
  const duty = clamp(0.62 - 0.07 * (v - 1.3), 0.56, 0.68); // stance fraction
  return { v, step, stride: step * 2, cadence, T, duty };
}

// Stance foot pose for foot-phase p ∈ [0, duty] given the plant.
// Returns ankle position, foot pitch (+ = toe up) and toe pitch relative to
// the foot. The plant is the heel's ground contact with the foot flat.
function stancePose(spec, plant, yaw, p, k, out) {
  const { duty, pFF, pHO, pTP, hs, to, toeMax } = k;
  let pitch, gamma = 0; // gamma: toe segment pitch in the world (≤ 0)
  if (p < pFF) {
    const u = p / pFF;
    pitch = hs * (1 - u) * (1 - u * u); // lands with some speed, settles softly
  } else if (p < pHO) {
    pitch = 0;
  } else {
    const u = Math.min(1, (p - pHO) / (duty - pHO));
    pitch = -to * u * u; // heel peels up, accelerating into push-off
    if (p > pTP) gamma = -toeMax * Math.pow(Math.min(1, (p - pTP) / (duty - pTP)), 1.5);
  }
  const q = qFromEuler(yaw, 0, -pitch * D, out.q);
  const ank = out.ankle;
  if (pitch >= 0) {
    // heel rocker: pivot about the heel
    _v.set(0, -spec.ankleY, spec.heelZ).applyQuaternion(q); // ankle → heel
    ank.copy(plant).sub(_v);
  } else {
    // forefoot rocker: the toe tip stays put; first the foot hinges at the
    // ball with the toes flat, then the toes bend up and the ball lifts
    const lt = spec.toeZ - spec.ballZ;
    const tip = _v.set(0, 0, spec.toeZ - spec.heelZ).applyAxisAngle(Y, yaw).add(plant);
    const ball = new THREE.Vector3(0, -Math.sin(gamma * D), -Math.cos(gamma * D))
      .multiplyScalar(lt).applyAxisAngle(Y, yaw).add(tip);
    const off = new THREE.Vector3(0, -spec.ankleY, spec.ballZ).applyQuaternion(q);
    ank.copy(ball).sub(off);
  }
  out.pitch = pitch;
  out.yaw = yaw;
  out.toe = pitch < 0 ? gamma - pitch : 0; // toe extension relative to the foot
  return out;
}

function hermite(p0, m0, p1, m1, t) {
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1;
}

// two-bone IK; writes knee position, returns { reach } (1 = fully extended)
function solveTwoBone(hip, target, a, b, pole, knee, outN) {
  const dir = _v.copy(target).sub(hip);
  let d = dir.length();
  dir.divideScalar(d || 1);
  const reach = d / (a + b);
  d = clamp(d, Math.abs(a - b) + 1e-4, (a + b) * 0.99995);
  const n = outN.copy(pole).addScaledVector(dir, -pole.dot(dir)).normalize();
  const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  knee.copy(hip).addScaledVector(dir, a * cosA).addScaledVector(n, a * sinA);
  return reach;
}

const SIDES = [
  { name: 'right', sign: -1, offset: 0 },
  { name: 'left', sign: 1, offset: 0.5 },
];

export class Walker {
  constructor(spec, gait = DEFAULT_GAIT) {
    this.spec = spec;
    this.g = { ...gait }; // smoothed parameters
    this.target = { ...gait };
    this.phase = 0;
    this.dist = 0;
    this.time = 0;
    this.feet = SIDES.map((s) => ({
      ...s,
      plant: new THREE.Vector3(),
      yaw: 0,
      cycle: 0,
      stance: true,
      contact: 0, // 0 swing … 1 fully loaded, for overlays
      justPlanted: false,
    }));
    this.pose = makePose();
    this.clear = { left: 0, right: 0 }; // extra shoulder abduction that keeps the arm off the body
    this.dt = 1 / 60;
    this.initBody();
    this.reset();
  }

  setSpec(spec) {
    this.spec = spec;
    this.initBody();
    this.reset(true);
  }

  // rest positions and body cross-sections for collision clearance
  initBody() {
    this.rest = {};
    this.parent = {};
    for (const b of boneLayout(this.spec)) {
      this.rest[b.name] = new THREE.Vector3(...b.pos);
      this.parent[b.name] = b.parent;
    }
    this.shape = bodyShape(this.spec);
  }

  // world position of a bone from the pose's world rotations
  fk(P, name, cache) {
    if (cache[name]) return cache[name];
    const par = this.parent[name];
    if (!par) return (cache[name] = P.pos.hips.clone());
    const pp = this.fk(P, par, cache).clone();
    const off = new THREE.Vector3().subVectors(this.rest[name], this.rest[par]).applyQuaternion(P.q[par]);
    return (cache[name] = pp.add(off));
  }

  // how far a sphere (centre p, radius r) sinks into the torso or a thigh;
  // positive = penetrating. Points are taken into each bone's rest frame and
  // compared with the same cross-sections the mesh is lofted from.
  penetration(P, cache, p, r) {
    const s = this.spec, sh = this.shape;
    let worst = -Infinity;
    const toRest = (bone) => {
      const q = _q2.copy(P.q[bone]).invert();
      return new THREE.Vector3().subVectors(p, this.fk(P, bone, cache)).applyQuaternion(q).add(this.rest[bone]);
    };
    const outside = (x, z, hw, hd, e) => {
      const rho = Math.pow(Math.pow(Math.abs(x / hw), e) + Math.pow(Math.abs(z / hd), e), 1 / e);
      return Math.hypot(x, z) * (1 - 1 / Math.max(rho, 1e-6)); // signed: + outside
    };
    // torso: pick the spine segment whose rest span holds the point
    const keys = sh.torsoKeys, yLo = keys[0][0], yHi = keys[keys.length - 1][0];
    for (const [bone, lo, hi] of [['hips', -1, s.spineY], ['spine', s.spineY, s.spine1Y], ['spine1', s.spine1Y, 9]]) {
      const pr = toRest(bone);
      if (pr.y < lo - 0.03 || pr.y > hi + 0.03 || pr.y < yLo || pr.y > yHi) continue;
      const [hw, hd, zc, e] = sh.torso(pr.y);
      worst = Math.max(worst, r - outside(pr.x, pr.z - zc, hw, hd, e));
    }
    // thighs
    for (const side of ['left', 'right']) {
      const bone = `${side}UpLeg`;
      const pr = toRest(bone);
      const t = (s.hipJointY - pr.y) / s.legLen;
      if (t < -0.07 || t > sh.kneeT + 0.06) continue;
      const [rx, rz, zc] = sh.leg(t);
      worst = Math.max(worst, r - outside(pr.x - this.rest[bone].x, pr.z - zc, rx, rz, 2.1));
    }
    return worst;
  }

  // sphere vs one leg (thigh and shank), same convention as penetration()
  legPenetration(P, cache, p, r, side) {
    const s = this.spec, sh = this.shape;
    let worst = -Infinity;
    for (const bone of [`${side}UpLeg`, `${side}Leg`]) {
      const q = _q2.copy(P.q[bone]).invert();
      const pr = new THREE.Vector3().subVectors(p, this.fk(P, bone, cache)).applyQuaternion(q).add(this.rest[bone]);
      const t = (s.hipJointY - pr.y) / s.legLen;
      const upper = bone.endsWith('UpLeg');
      if (upper ? t < 0 || t > sh.kneeT + 0.03 : t < sh.kneeT - 0.03 || t > 1) continue;
      const [rx, rz, zc] = sh.leg(t);
      const x = pr.x - this.rest[bone].x, z = pr.z - zc;
      const rho = Math.hypot(x / rx, z / rz);
      worst = Math.max(worst, r - Math.hypot(x, z) * (1 - 1 / Math.max(rho, 1e-6)));
    }
    return worst;
  }

  setGait(g) { Object.assign(this.target, g); }

  // shift the world back along the walk so an endless walk keeps precision
  rebase(dz) {
    this.dist -= dz;
    for (const f of this.feet) f.plant.z -= dz;
  }

  // put both feet on plausible plants for the current phase
  reset(keepPhase = false) {
    if (!keepPhase) { this.phase = 0; this.dist = 0; }
    const k = this.timing();
    for (const f of this.feet) {
      const p = wrap01(this.phase + f.offset);
      // the plant this foot has (stance) or had (swing) this cycle
      const sinceHS = p * k.T;
      f.plant.copy(this.predictPlant(f, k, -sinceHS, f.cycle));
      f.yaw = this.footYaw(f);
      f.stance = p < k.duty;
    }
  }

  timing() {
    const t = gaitTiming(this.spec, this.g);
    const v = t.v;
    t.pFF = 0.11;                                 // foot flat
    t.pHO = clamp(0.35 - 0.06 * (v - 1.3), 0.26, 0.44); // heel off
    t.hs = 16 + 9 * (t.step / 0.70 - 1) * 1.6;    // heel-strike toe-up angle
    t.hs = clamp(t.hs, 6, 26);
    t.to = clamp(64 + 25 * (v - 1.3), 34, 75);    // foot angle at toe-off
    t.pTP = t.duty - 0.075;                       // toes start to bend: pivot moves to the tip
    t.toeMax = 28;                                // toe segment angle at toe-off
    t.reach = 0.225;                              // heel lands this fraction of a stride ahead of the pelvis
    return t;
  }

  footYaw(f) { return f.sign * this.g.toeOut * D; } // toes point outward

  // heel plant for a heel strike `dt` seconds from now (negative = past)
  predictPlant(f, k, dt, cycle) {
    const s = this.spec;
    const n = this.g.variation;
    const strideJit = 1 + 0.012 * n * hash(cycle * 2 + (f.sign > 0 ? 1 : 0), 1);
    const z = this.dist + k.v * dt + k.reach * k.stride * strideJit + s.heelZ;
    const w = (0.085 * s.u * this.g.stepWidth * (1 - 0.18 * (s.c.sex ?? 0)) + 0.01 * n * hash(cycle, f.sign + 3)) * 0.5;
    return new THREE.Vector3(f.sign * w, 0, z);
  }

  update(dt) {
    // ease parameters so a slider never pops the body
    const a = 1 - Math.exp(-dt / 0.6);
    for (const key in this.target) {
      if (typeof this.target[key] === 'number') this.g[key] += (this.target[key] - this.g[key]) * a;
    }
    const k = this.timing();
    this.time += dt;
    this.dt = dt;
    // blinking: every 2–6 s, now and then a double blink; ~170 ms each
    if (this.nextBlink === undefined) { this.nextBlink = 1.5; this.blinkAge = 9; }
    this.nextBlink -= dt; this.blinkAge += dt;
    if (this.nextBlink <= 0) {
      this.blinkAge = 0;
      this.nextBlink = Math.random() < 0.15 ? 0.32 : 2 + Math.random() * 4;
    }
    const ba = this.blinkAge;
    this.pose.blink = ba < 0.06 ? smooth(ba / 0.06) : ba < 0.17 ? 1 - smooth((ba - 0.06) / 0.11) : 0;
    this.dist += k.v * dt;
    const prev = this.phase;
    this.phase = wrap01(this.phase + dt / k.T);

    for (const f of this.feet) {
      const p0 = wrap01(prev + f.offset);
      const p = wrap01(this.phase + f.offset);
      f.justPlanted = false;
      if (p < p0) {
        // heel strike: commit the predicted plant
        f.cycle += 1;
        f.plant.copy(this.predictPlant(f, k, -p * k.T, f.cycle));
        f.yaw = this.footYaw(f);
        f.justPlanted = true;
      }
      f.stance = p < k.duty;
    }
    this.solve(k);
    return this.pose;
  }

  // ──────────────────────────────────────────────────────────────────────
  solve(k) {
    const s = this.spec, g = this.g, P = this.pose;
    const φ = this.phase;
    const TAU = Math.PI * 2;
    const spd = clamp(k.v / 1.3, 0.3, 1.8);

    // ── pelvis orientation ──────────────────────────────────────────────
    // women show more pelvic rotation and drop for the same speed
    const fem = s.c.sex ?? 0;
    const yawA = 4.5 * g.sway * Math.sqrt(spd) * (1 + 0.3 * fem);
    const rollA = 3.2 * g.sway * spd * (1 + 0.35 * fem);
    const pelvisYaw = yawA * Math.cos(TAU * φ) * D;             // right hip forward at right HS
    const pelvisRoll = -rollA * Math.cos(TAU * (φ - 0.17)) * D;  // swing side drops
    const pelvisTilt = (1.2 * Math.cos(2 * TAU * (φ - 0.45)) * spd + 2 + 2 * (spd - 1)) * D;
    qFromEuler(pelvisYaw, pelvisRoll, pelvisTilt, P.q.hips);

    // ── pelvis position ─────────────────────────────────────────────────
    const latA = (0.02 + 0.006 * (g.stepWidth - 1)) * g.sway * s.u / Math.sqrt(spd);
    const lat = -latA * Math.cos(TAU * (φ - 0.29));             // over the stance foot
    const surge = -0.006 * spd * s.u * Math.sin(2 * TAU * (φ - 0.29));

    // feet first: the pelvis height depends on where they are
    const feetOut = [];
    for (const f of this.feet) {
      const p = wrap01(φ + f.offset);
      const fo = P.feet[f.name];
      if (p < k.duty) {
        stancePose(s, f.plant, f.yaw, p, k, fo);
        fo.contact = p < k.pFF ? smooth(p / k.pFF) : p > k.duty - 0.08 ? smooth((k.duty - p) / 0.08) : 1;
      } else {
        this.swingPose(f, p, k, fo);
        fo.contact = 0;
      }
      fo.p = p;
      fo.plant.copy(f.plant);
      feetOut.push(fo);
    }

    // height: designed inverted-pendulum bob, never higher than the
    // stance legs can actually reach
    const hipOff = new THREE.Vector3();
    const standHip = s.hipJointY;
    // The bob's shape is the inverted pendulum (rounded peaks at midstance,
    // sharper troughs at double support); its depth is not a guess but is
    // measured from the coming landing: how low must the hips be for the
    // swing heel to reach its plant with the knee nearly straight?
    // asymmetric, like a real centre of mass: a long rise from just after
    // heel strike to late midstance, then a quicker fall into double support
    const TR = 0.02, PK = 0.31, RISE = (PK - TR) * 2;
    const shape = (x) => {
      const q = fract((x - TR) * 2);
      return q < RISE ? (1 + Math.cos(Math.PI * q / RISE)) / 2 : (1 - Math.cos(Math.PI * (q - RISE) / (1 - RISE))) / 2;
    };
    const midH = standHip - 0.006 * s.u * spd - 0.012 * s.u * Math.max(0, -g.posture);
    for (const f of this.feet) {
      const fo = P.feet[f.name];
      if (fo.p < k.duty) continue;
      const φhs = f.offset; // this foot lands at φ = 0 (right) or 0.5 (left)
      const qhs = qFromEuler(yawA * Math.cos(TAU * φhs) * D, -rollA * Math.cos(TAU * (φhs - 0.17)) * D, pelvisTilt, _q);
      hipOff.set(f.sign * s.hipSep * 0.5, s.hipJointY - s.hipsY, 0).applyQuaternion(qhs);
      const hx = -latA * Math.cos(TAU * (φhs - 0.29)) + hipOff.x - fo.hsAnkle.x;
      const hz = this.dist + (1 - fo.p) * k.v * k.T + hipOff.z - fo.hsAnkle.z;
      const r2 = Math.pow(0.9994 * s.legLen, 2) - hx * hx - hz * hz;
      if (r2 > 0) {
        const land = fo.hsAnkle.y + Math.sqrt(r2) - hipOff.y + (s.hipJointY - s.hipsY); // as hip-joint height
        this.landY = this.landY === undefined ? land : this.landY + (land - this.landY) * 0.25;
      }
    }
    const shapeHS = shape(0);
    const depth = clamp(((midH - (this.landY ?? midH - 0.03)) / shapeHS), 0.004 * s.u, 0.08 * s.u);
    const peak = (this.landY ?? midH - 0.03) + depth * g.bounce * shapeHS;
    let hipY = peak - depth * g.bounce * shape(φ);
    P.bob = { depth, peak };

    const base = new THREE.Vector3(lat, 0, this.dist + surge);
    let limitY = Infinity;
    for (const f of this.feet) {
      const fo = P.feet[f.name];
      // late in swing the coming landing already constrains the pelvis: it
      // settles in time for the heel to reach the floor without a jolt
      const late = fo.p >= k.duty ? smooth(clamp((fo.p - 0.84) / 0.16, 0, 1)) : 1;
      if (late <= 0) continue;
      const ank = fo.p >= k.duty ? fo.hsAnkle : fo.ankle;
      hipOff.set(f.sign * s.hipSep * 0.5, s.hipJointY - s.hipsY, 0).applyQuaternion(P.q.hips);
      const hx = base.x + hipOff.x - ank.x;
      const hz = base.z + hipOff.z - ank.z + (fo.p >= k.duty ? (1 - fo.p) * k.v * k.T : 0);
      // loading response: the knee gives ~15–20° to absorb the landing
      const load = fo.p < k.duty ? Math.exp(-Math.pow((fo.p - 0.14) / 0.075, 2)) : 0;
      const kExt = 0.9996 - 0.0035 * load * Math.min(1.3, spd);
      const r2 = Math.pow(kExt * s.legLen, 2) - hx * hx - hz * hz;
      const y = ank.y + Math.sqrt(Math.max(r2, 0)) - hipOff.y + (1 - late) * 0.08 * s.u;
      // soft min so hand-overs between support legs never kink
      limitY = limitY === Infinity ? y : softMin(limitY, y, 0.006);
    }
    // hipY is the hip-joint height; convert to the pelvis bone, then let the
    // reach limit take over smoothly wherever the design asks for too much
    let pelvisY = hipY + (s.hipsY - s.hipJointY);
    if (limitY !== Infinity) pelvisY = softMin(pelvisY, limitY, 0.004);
    P.pos.hips.set(base.x, pelvisY, base.z);

    // ── legs ────────────────────────────────────────────────────────────
    // stance legs first; the swing leg then makes room around the stance leg
    const order = [...this.feet].sort((a, b) => (P.feet[a.name].p >= k.duty) - (P.feet[b.name].p >= k.duty));
    for (const f of order) {
      const fo = P.feet[f.name];
      const L = P.legs[f.name];
      hipOff.set(f.sign * s.hipSep * 0.5, s.hipJointY - s.hipsY, 0).applyQuaternion(P.q.hips);
      L.hip.copy(P.pos.hips).add(hipOff);
      // knee points between the foot and the pelvis heading, a touch outward
      const footFwd = new THREE.Vector3(Math.sin(fo.yaw), 0, Math.cos(fo.yaw));
      const pelFwd = new THREE.Vector3(0, 0, 1).applyQuaternion(P.q.hips);
      const pole = footFwd.add(pelFwd).normalize();
      pole.x += f.sign * 0.06;
      const target = new THREE.Vector3();
      const solveLeg = (dx) => {
        target.copy(fo.ankle); target.x += f.sign * dx;
        L.reach = solveTwoBone(L.hip, target, s.thigh, s.shin, pole, L.knee, L.n);
        // if the target was out of reach the ankle ends short; recompute it
        const shinDir = _v.copy(target).sub(L.knee).normalize();
        L.ankle.copy(L.knee).addScaledVector(shinDir, s.shin);
        qFromDownFront(new THREE.Vector3().subVectors(L.knee, L.hip), L.n, P.q[`${f.name}UpLeg`]);
        qFromDownFront(new THREE.Vector3().subVectors(L.ankle, L.knee), L.n, P.q[`${f.name}Leg`]);
      };
      solveLeg(0);
      if (fo.p >= k.duty) {
        // the passing leg swings just wide enough to clear the standing one
        const other = f.name === 'left' ? 'right' : 'left';
        const cache = {};
        const sh = this.shape, kt = sh.kneeT;
        const probes = [kt, kt + (1 - kt) * 0.3, kt + (1 - kt) * 0.6, 0.97].map((t) => {
          const [rx, rz] = sh.leg(t);
          return [t, (rx + rz) / 2 + 0.01 * s.u]; // trousers brush, never pass through
        });
        const pen = (dx) => {
          solveLeg(dx);
          let worst = -Infinity;
          for (const [t, r] of probes) {
            const p = t <= kt + 1e-6 ? L.knee.clone()
              : L.knee.clone().lerp(L.ankle, (t - kt) / (1 - kt));
            worst = Math.max(worst, this.legPenetration(P, cache, p, r, other));
          }
          return worst;
        };
        let need = 0;
        if (pen(0) > 0) {
          let lo = 0, hi = 0.09 * s.u;
          for (let it = 0; it < 9; it++) { const mid = (lo + hi) / 2; if (pen(mid) > 0) lo = mid; else hi = mid; }
          need = hi;
        }
        const u = (fo.p - k.duty) / (1 - k.duty);
        const win = smooth(clamp(u / 0.12, 0, 1)) * smooth(clamp((1 - u) / 0.12, 0, 1));
        solveLeg(need * win);
        P.diag[f.name].legClear = need * win;
      } else P.diag[f.name].legClear = 0;
      qFromEuler(fo.yaw, 0, -fo.pitch * D, P.q[`${f.name}Foot`]);
      _q.setFromAxisAngle(X, -fo.toe * D);
      P.q[`${f.name}ToeBase`].copy(P.q[`${f.name}Foot`]).multiply(_q);
      this.diagLeg(f.name, P);
    }

    // ── spine, head ─────────────────────────────────────────────────────
    const lean = (3.5 + 3 * (spd - 1) - 5 * g.posture) * D;
    const thYaw = -0.9 * yawA * Math.cos(TAU * (φ - 0.03)) * D; // shoulders oppose hips
    const thRoll = -0.45 * pelvisRoll;
    const breath = Math.sin(this.time * TAU / 4.2);
    qFromEuler(thYaw, thRoll, lean + 0.6 * D * breath - 1.5 * D * g.posture, P.q.spine2);
    P.q.spine.copy(P.q.hips).slerp(P.q.spine2, 0.36);
    P.q.spine1.copy(P.q.hips).slerp(P.q.spine2, 0.68);
    const n = g.variation;
    const look = 0.9 * n * Math.sin(this.time * 0.37) + 0.6 * n * Math.sin(this.time * 0.91 + 1.3);
    const headPitch = (3 - 9 * g.posture + 1.0 * Math.cos(2 * TAU * (φ - 0.30)) * g.bounce) * D - lean * 0.75;
    qFromEuler((0.12 * thYaw / D + look) * D, -0.2 * thRoll, headPitch + lean, P.q.head);
    P.q.neck.copy(P.q.spine2).slerp(P.q.head, 0.5);

    // ── arms ────────────────────────────────────────────────────────────
    for (const f of this.feet) {
      const side = f.name, sg = f.sign;
      const armPhase = φ + f.offset - 0.5; // arm forward at contralateral heel strike
      const step = Math.floor(this.time / k.T);
      const ampJ = 1 + 0.08 * n * hash(step, sg + 7);
      const swingA = 15 * g.armSwing * spd * ampJ;
      const flex = -4 + swingA * Math.cos(TAU * (armPhase - 0.03)) + 1.8 * Math.cos(2 * TAU * (armPhase - 0.1));
      const elbow = 17 + 5 * fem + 10 * spd * g.armSwing * (0.5 + 0.5 * Math.cos(TAU * (armPhase - 0.09))) - 4 * g.posture;
      const abd = 4 + 1.5 * Math.cos(TAU * (armPhase - 0.5));
      // clavicle: tiny protraction as the arm comes forward
      _q.setFromAxisAngle(Y, sg * 0.025 * flex * D);
      P.q[`${side}Shoulder`].copy(P.q.spine2).multiply(_q);
      // the forearm angles away from the body at the elbow (carrying angle)
      const carry = 11 + 4 * fem;
      const pose = (extra) => {
        const ua = P.q[`${side}Arm`].copy(P.q.spine2);
        _q.setFromAxisAngle(Z, sg * (abd + extra) * D); ua.multiply(_q);
        _q.setFromAxisAngle(X, -flex * D); ua.multiply(_q);
        _q.setFromAxisAngle(Y, -sg * 8 * D); ua.multiply(_q); // slight internal rotation
        const fa = P.q[`${side}ForeArm`].copy(ua);
        _q.setFromAxisAngle(Z, sg * carry * D * (1 - elbow / 140)); fa.multiply(_q);
        _q.setFromAxisAngle(X, -elbow * D); fa.multiply(_q);
        const hd = P.q[`${side}Hand`].copy(fa);
        _q.setFromAxisAngle(X, (6 + 4 * Math.cos(TAU * (armPhase - 0.2))) * D); hd.multiply(_q);
      };
      // keep elbow, forearm and hand off the torso and thighs: find the least
      // extra abduction that clears, the way a real arm swings around the hip
      const cache = {};
      for (const b of ['hips', 'spine', 'spine1', 'spine2', `${side}Shoulder`, 'leftUpLeg', 'rightUpLeg']) this.fk(P, b, cache);
      const S = cache[`${side}Arm`] || this.fk(P, `${side}Arm`, cache);
      const gu = s.u * s.c.build * (1 - 0.1 * fem); // same girth scaling as the arm mesh
      // [t along segment, 0 elbow · 1 forearm · 2 hand, radius at 1.75 m]: incl. the forearm's widest point
      const pts = [[0, 0, 0.039], [0.2, 1, 0.042], [0.5, 1, 0.036], [1, 1, 0.028], [0.45, 2, 0.021], [0.9, 2, 0.017]];
      const margin = 0.006 * s.u;
      const pen = (extra) => {
        pose(extra);
        const qa = P.q[`${side}Arm`], qf = P.q[`${side}ForeArm`], qh = P.q[`${side}Hand`];
        const E = _v.set(0, -s.upperArm, 0).applyQuaternion(qa).add(S).clone();
        const W = new THREE.Vector3(0, -s.foreArm, 0).applyQuaternion(qf).add(E);
        let worst = -Infinity;
        for (const [t, seg, r] of pts) {
          const p = seg === 0 ? E : seg === 1 ? new THREE.Vector3(0, -s.foreArm * t, 0).applyQuaternion(qf).add(E)
            : new THREE.Vector3(0, -s.hand * t, 0).applyQuaternion(qh).add(W);
          worst = Math.max(worst, this.penetration(P, cache, p, r * gu + margin));
        }
        return worst;
      };
      let need = 0;
      if (pen(0) > 0) {
        let lo = 0, hi = 35;
        for (let it = 0; it < 9; it++) { const mid = (lo + hi) / 2; if (pen(mid) > 0) lo = mid; else hi = mid; }
        need = hi;
      }
      // rise at once, relax gently: clearance never pops
      this.clear[side] = Math.max(need, this.clear[side] * Math.exp(-this.dt / 0.15));
      pose(this.clear[side]);
      P.diag[side].clear = this.clear[side];
      P.diag[side].elbow = elbow;
      P.diag[side].shoulder = flex;
    }
    P.phase = φ;
    P.timing = k;
    return P;
  }

  swingPose(f, p, k, out) {
    const s = this.spec;
    const u = (p - k.duty) / (1 - k.duty);
    const h = 1e-3;
    // leave from the real toe-off pose of the old plant…
    const a0 = stancePose(s, f.plant, f.yaw, k.duty, k, tmpFoot(0));
    const a0b = stancePose(s, f.plant, f.yaw, k.duty - h, k, tmpFoot(1));
    // …arrive at the heel strike on the predicted next plant
    const dtHS = (1 - p) * k.T;
    const next = this.predictPlant(f, k, dtHS, f.cycle + 1);
    const nYaw = this.footYaw(f);
    const a1 = stancePose(s, next, nYaw, 0, k, tmpFoot(2));
    const a1b = stancePose(s, next, nYaw, h, k, tmpFoot(3));
    const sw = 1 - k.duty;
    // Shape the swing from data, place it from physics: the profiles below
    // are the ankle path of a reference walker (forward kinematics of the
    // normative hip/knee curves), expressed relative to the pelvis's steady
    // progression. They are stretched between this foot's real lift-off
    // and landing, and corrected so velocity is continuous at both ends.
    const prog = k.v * k.T; // pelvis travel per unit phase
    const z0 = this.dist - (p - k.duty) * prog;
    const z1 = this.dist + (1 - p) * prog;
    const lift = Math.pow(k.step / 0.72, 0.8) * s.u;
    const Y0 = SWING_Y[0], Y8 = SWING_Y[8];
    for (const c of ['x', 'y', 'z']) {
      const vp = c === 'z' ? prog : 0;
      const r0 = a0.ankle[c] - (c === 'z' ? z0 : 0);
      const r1 = a1.ankle[c] - (c === 'z' ? z1 : 0);
      const m0 = ((a0.ankle[c] - a0b.ankle[c]) / h - vp) * sw;
      const m1 = ((a1b.ankle[c] - a1.ankle[c]) / h - vp) * sw;
      let val, d0, d1;
      if (c === 'z') {
        val = r0 + (r1 - r0) * curve(SWING_Z, u);
        d0 = (r1 - r0) * dcurve(SWING_Z, 0);
        d1 = (r1 - r0) * dcurve(SWING_Z, 1);
      } else if (c === 'y') {
        val = r0 + (r1 - r0) * u + (curve(SWING_Y, u) - (Y0 + (Y8 - Y0) * u)) * lift;
        d0 = (r1 - r0) + (dcurve(SWING_Y, 0) - (Y8 - Y0)) * lift;
        d1 = (r1 - r0) + (dcurve(SWING_Y, 1) - (Y8 - Y0)) * lift;
      } else {
        val = r0 + (r1 - r0) * smooth(u);
        d0 = 0; d1 = 0;
      }
      // Hermite velocity corrections: zero at the ends, fix the slopes. Lift-
      // off is matched exactly; the landing only partly, because a real heel
      // arrives still moving and the contact itself absorbs the rest.
      const u2 = u * u;
      val += (m0 - d0) * (u2 * u - 2 * u2 + u) + (m1 - d1) * 0.3 * (u2 * u - u2);
      out.ankle[c] = val + (c === 'z' ? this.dist : 0);
    }
    out.hsAnkle.copy(a1.ankle);
    // pitch: keeps peeling briefly, then the ankle dorsiflexes for landing
    const PE = 1.15; // pitch settles a touch before contact
    const w0 = ((a0.pitch - a0b.pitch) / h) * sw / PE;
    out.pitch = hermite(a0.pitch, w0, a1.pitch, 0, Math.min(1, u * PE));
    // toes relax from push-off extension back to neutral
    out.toe = a0.toe * (1 - smooth(Math.min(1, u * 2.5)));
    out.yaw = f.yaw + (nYaw - f.yaw) * smooth(u);
    out.q.copy(qFromEuler(out.yaw, 0, -out.pitch * D));
    return out;
  }

  diagLeg(name, P) {
    const L = P.legs[name];
    const dg = P.diag[name];
    const pelFwd = _v.set(0, 0, 1).applyQuaternion(P.q.hips);
    const fwd = new THREE.Vector3(pelFwd.x, 0, pelFwd.z).normalize();
    const sag = (v) => Math.atan2(v.dot(fwd), -v.y) / D; // angle from straight down, + = forward
    const thigh = new THREE.Vector3().subVectors(L.knee, L.hip);
    const shank = new THREE.Vector3().subVectors(L.ankle, L.knee);
    dg.hip = sag(thigh);
    dg.knee = sag(thigh) - sag(shank);
    const fo = P.feet[name];
    dg.ankle = fo.pitch - sag(shank); // foot pitch relative to the shank's perpendicular
    dg.reach = L.reach;
  }
}

// Swing profiles, 9 knots over the swing (u = 0 … 1).
// SWING_Z: forward progress of the ankle relative to the pelvis, 0 → 1.
// SWING_Y: ankle height (m, for a 1.75 m walker): a quick lift as the knee
// folds, then a long low skim with the toes clearing by a couple of cm.
const SWING_Z = [0, 0.035, 0.13, 0.27, 0.46, 0.68, 0.88, 0.975, 1.0];
const SWING_Y = [0.177, 0.236, 0.24, 0.207, 0.162, 0.132, 0.116, 0.104, 0.09];
function curve(t, u) {
  const n = t.length - 1, x = clamp(u, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(x)), f = x - i;
  const p0 = t[Math.max(0, i - 1)], p1 = t[i], p2 = t[i + 1], p3 = t[Math.min(n, i + 2)];
  const m1 = i === 0 ? p2 - p1 : (p2 - p0) / 2;
  const m2 = i + 1 === n ? p2 - p1 : (p3 - p1) / 2;
  return hermite(p1, m1, p2, m2, f);
}
function dcurve(t, u) {
  const e = 1e-4;
  return u < 0.5 ? (curve(t, u + e) - curve(t, u)) / e : (curve(t, u) - curve(t, u - e)) / e;
}

const _tf = [0, 1, 2, 3].map(() => ({ ankle: new THREE.Vector3(), q: new THREE.Quaternion(), pitch: 0, toe: 0 }));
function tmpFoot(i) { return _tf[i]; }

function makePose() {
  const q = {};
  for (const n of ['hips', 'spine', 'spine1', 'spine2', 'neck', 'head']) q[n] = new THREE.Quaternion();
  for (const side of ['left', 'right']) {
    for (const n of ['Shoulder', 'Arm', 'ForeArm', 'Hand', 'UpLeg', 'Leg', 'Foot', 'ToeBase']) q[side + n] = new THREE.Quaternion();
  }
  const foot = () => ({ hsAnkle: new THREE.Vector3(), ankle: new THREE.Vector3(), q: new THREE.Quaternion(), pitch: 0, toe: 0, yaw: 0, p: 0, contact: 0, plant: new THREE.Vector3() });
  const leg = () => ({ hip: new THREE.Vector3(), knee: new THREE.Vector3(), ankle: new THREE.Vector3(), n: new THREE.Vector3(), reach: 0 });
  return {
    q,
    pos: { hips: new THREE.Vector3() },
    feet: { left: foot(), right: foot() },
    legs: { left: leg(), right: leg() },
    diag: { left: {}, right: {} },
    phase: 0,
  };
}

// Write a solved pose into a THREE.Skeleton built from boneLayout(): world
// rotations → locals (rest rotations are identity, so local = parent⁻¹·world).
export function applyPose(pose, bones) {
  const world = pose.q;
  for (const name in bones) {
    const b = bones[name];
    const wq = world[name];
    if (!wq) continue;
    const parent = b.parent && b.parent.isBone ? b.parent.name : null;
    if (parent && world[parent]) b.quaternion.copy(world[parent]).invert().multiply(wq);
    else b.quaternion.copy(wq);
  }
  bones.hips.position.copy(pose.pos.hips);
}
