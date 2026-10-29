// Character spec: a handful of creator sliders → every length the rig and
// the body need. Ratios are anthropometric (Drillis & Contini, segment
// lengths as fractions of stature), so any height stays a believable human.
//
// Coordinates: metres, Y up, the character faces +Z, its left is +X.

export const DEFAULT_CHARACTER = {
  height: 1.75,     // stature, m
  legs: 1.0,        // leg length relative to the average for that height
  shoulders: 1.0,   // shoulder breadth
  hips: 1.0,        // pelvis breadth
  build: 1.0,       // girth: 0.8 slender … 1.3 heavy
  muscle: 0.5,      // 0 soft … 1 athletic: shapes calves, deltoids, chest
  head: 1.0,        // head size
  sex: 0,           // 0 male … 1 female: frame, fat distribution, face, gait
  hairLength: 0,    // 0 short … 1 past the shoulders
  face: 0.5,        // walks smoothly through facial variations
  style: 0.7,       // 0 realistic … 1 stylised: bigger eyes, softer features
  eyes: '#5b4030',  // iris
  skin: '#c99678',
  hair: '#2a1d16',
  shirt: '#3d5a73',
  pants: '#33425c',
  shoeStyle: 'boot',   // 'boot': suede desert boot; 'sneaker'
  pantsStyle: 'jeans', // 'jeans': a straight-leg cut that hangs; 'leggings': follows the leg
  shoes: '#9a6a42',
};

export function makeSpec(c = DEFAULT_CHARACTER) {
  const H = c.height;
  const u = H / 1.75; // uniform scale for absolute sizes

  // ── vertical landmarks ────────────────────────────────────────────────
  const ankleY = 0.039 * H;
  const legLen = (0.530 * H - ankleY) * c.legs; // hip joint → ankle
  const thigh = legLen * 0.505;
  const shin = legLen - thigh;
  const hipJointY = ankleY + legLen;
  const hipsY = hipJointY + 0.045 * u; // pelvis bone sits above the femoral heads
  const shoulderY = 0.818 * H;
  const neckY = shoulderY + 0.022 * u;
  const headY = 0.872 * H; // atlas: where the skull pivots
  const crownY = H;

  // torso span compensates for leg length so stature stays exact
  const torso = neckY - hipsY;
  const spineY = hipsY + torso * 0.22;
  const spine1Y = hipsY + torso * 0.46;
  const spine2Y = hipsY + torso * 0.70;

  // ── breadths ──────────────────────────────────────────────────────────
  // sexual dimorphism: relative to stature, women average ~9% narrower
  // shoulders and ~7% broader hips
  const f = c.sex ?? 0;
  const shoulderW = 0.232 * H * c.shoulders * (1 - 0.09 * f); // outer, bideltoid-ish
  const hipW = 0.191 * H * c.hips * (1 + 0.07 * f);
  const hipSep = hipW * 0.50; // femoral head centres
  const armX = shoulderW * 0.5 - 0.026 * u + 0.035 * u * (c.build - 1); // glenohumeral centre; bigger frames carry the arms wider

  // ── arm lengths ───────────────────────────────────────────────────────
  const upperArm = 0.186 * H;
  const foreArm = 0.146 * H;
  const hand = 0.108 * H;

  // ── foot ──────────────────────────────────────────────────────────────
  const footLen = 0.152 * H;
  const heelZ = -0.21 * footLen;  // heel behind the ankle
  const ballZ = 0.52 * footLen;   // metatarsal heads
  const toeZ = 0.79 * footLen;    // toe tip
  const footW = 0.058 * H;

  return {
    c, H, u,
    ankleY, legLen, thigh, shin, hipJointY, hipsY,
    spineY, spine1Y, spine2Y, neckY, headY, crownY, shoulderY,
    shoulderW, hipW, hipSep, armX,
    upperArm, foreArm, hand,
    footLen, heelZ, ballZ, toeZ, footW,
    headSize: 0.13 * H * c.head,
  };
}

// The bone list, parent first. Positions are rest-pose world positions; all
// rest rotations are identity, so a bone's "down the limb" is −Y and its
// "front" is +Z. Names follow the common humanoid convention, which keeps
// retargeting onto imported rigs straightforward later.
export function boneLayout(s) {
  const L = [];
  const add = (name, parent, x, y, z) => L.push({ name, parent, pos: [x, y, z] });
  add('hips', null, 0, s.hipsY, 0);
  add('spine', 'hips', 0, s.spineY, -0.012 * s.u);
  add('spine1', 'spine', 0, s.spine1Y, -0.022 * s.u);
  add('spine2', 'spine1', 0, s.spine2Y, -0.018 * s.u);
  add('neck', 'spine2', 0, s.neckY, -0.012 * s.u);
  add('head', 'neck', 0, s.headY, 0.005 * s.u);
  for (const [side, k] of [['left', 1], ['right', -1]]) {
    add(`${side}Shoulder`, 'spine2', k * 0.022 * s.u, s.shoulderY - 0.004 * s.u, 0.012 * s.u);
    add(`${side}Arm`, `${side}Shoulder`, k * s.armX, s.shoulderY - 0.012 * s.u, -0.008 * s.u);
    add(`${side}ForeArm`, `${side}Arm`, k * s.armX, s.shoulderY - 0.012 * s.u - s.upperArm, -0.008 * s.u);
    add(`${side}Hand`, `${side}ForeArm`, k * s.armX, s.shoulderY - 0.012 * s.u - s.upperArm - s.foreArm, -0.008 * s.u);
    add(`${side}UpLeg`, 'hips', k * s.hipSep * 0.5, s.hipJointY, 0);
    add(`${side}Leg`, `${side}UpLeg`, k * s.hipSep * 0.5, s.hipJointY - s.thigh, 0);
    add(`${side}Foot`, `${side}Leg`, k * s.hipSep * 0.5, s.ankleY, 0);
    add(`${side}ToeBase`, `${side}Foot`, k * s.hipSep * 0.5, 0.022 * s.u, s.ballZ);
  }
  return L;
}
