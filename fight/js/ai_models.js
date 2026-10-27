// AI-built characters: concept art turned into a textured, rigged 3D model
// by Meshy (via Higgsfield). They're streamed from Higgsfield's CDN and
// fitted onto the game's skeleton at load time, so they play exactly like
// the MakeHuman-built puppets. Add ?models=code to the URL to compare
// against the code-built versions.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3HC3FxFiUcm9iyfEXhR7cCc1scA/';
export const AI_MODELS = {
  sam: CDN + 'hf_20261027_030746_4d30c058-8a29-4e16-aa7e-4b91df86fa08.glb',
  jensen: CDN + 'hf_20261027_030748_c3203064-7e07-4a3c-b241-7c40af868ce6.glb',
};

export function useAI(id) {
  if (!AI_MODELS[id]) return false;
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('models') : null;
  return q !== 'code';
}

const HIP_Y = 0.41 + 0.4 + 0.085;

// The game's bones, in the order build_mh.py writes them.
export const GAME_BONES = ['root', 'spine', 'chest', 'neck', 'head'];
for (const s of 'LR') {
  GAME_BONES.push(`clav${s}`, `sh${s}`, `el${s}`, `hand${s}`, `hip${s}`, `kn${s}`, `ft${s}`);
  for (let i = 0; i < 4; i++) GAME_BONES.push(`f${s}${i}a`, `f${s}${i}b`, `f${s}${i}c`);
  GAME_BONES.push(`t${s}a`, `t${s}b`, `t${s}c`);
}
const PARENT = { root: null, spine: 'root', chest: 'spine', neck: 'chest', head: 'neck' };
const CHAIN = {};
for (const s of 'LR') {
  Object.assign(PARENT, { [`clav${s}`]: 'chest', [`sh${s}`]: `clav${s}`, [`el${s}`]: `sh${s}`, [`hand${s}`]: `el${s}`,
    [`hip${s}`]: 'root', [`kn${s}`]: `hip${s}`, [`ft${s}`]: `kn${s}`, [`t${s}a`]: `hand${s}`, [`t${s}b`]: `t${s}a`, [`t${s}c`]: `t${s}b` });
  Object.assign(CHAIN, { [`sh${s}`]: `el${s}`, [`el${s}`]: `hand${s}`, [`hip${s}`]: `kn${s}`, [`kn${s}`]: `ft${s}`,
    [`t${s}a`]: `t${s}b`, [`t${s}b`]: `t${s}c`, [`t${s}c`]: 'tip' });
  for (let i = 0; i < 4; i++) {
    Object.assign(PARENT, { [`f${s}${i}a`]: `hand${s}`, [`f${s}${i}b`]: `f${s}${i}a`, [`f${s}${i}c`]: `f${s}${i}b` });
    Object.assign(CHAIN, { [`f${s}${i}a`]: `f${s}${i}b`, [`f${s}${i}b`]: `f${s}${i}c`, [`f${s}${i}c`]: 'tip' });
  }
}
const CHAINED = new Set(Object.values(CHAIN).filter((v) => v !== 'tip'));

// Meshy's humanoid skeleton -> the game's bones.
const FOLD = {
  Hips: 'root', Spine02: 'spine', Spine01: 'chest', Spine: 'chest', neck: 'neck', Head: 'head', head_end: 'head', headfront: 'head',
  LeftShoulder: 'clavL', LeftArm: 'shL', LeftForeArm: 'elL', LeftHand: 'handL', LeftUpLeg: 'hipL', LeftLeg: 'knL', LeftFoot: 'ftL', LeftToeBase: 'ftL',
  RightShoulder: 'clavR', RightArm: 'shR', RightForeArm: 'elR', RightHand: 'handR', RightUpLeg: 'hipR', RightLeg: 'knR', RightFoot: 'ftR', RightToeBase: 'ftR',
};

const loader = new GLTFLoader();
const V = (a) => new THREE.Vector3().copy(a);

// Rest offsets in the game's convention (limbs hang along -Y) and the local
// rotations that pose that skeleton onto the mesh. Same maths as
// solve_bind() in tools/build_mh.py.
function solveBind(P, tips) {
  const Rw = {}, local = {}, bind = {};
  const down = new THREE.Vector3(0, -1, 0);
  for (const n of GAME_BONES) {
    const p = PARENT[n];
    const Rp = p ? Rw[p] : new THREE.Quaternion();
    const RpInv = Rp.clone().invert();
    const off = V(P[n]).sub(p ? P[p] : new THREE.Vector3());
    local[n] = CHAINED.has(n) ? [0, -off.length(), 0] : off.clone().applyQuaternion(RpInv).toArray();
    let W;
    if (n.startsWith('hand')) {
      // No finger bones: the hand continues the forearm, palm toward the body.
      const s = n.at(-1), sx = s === 'L' ? 1 : -1;
      const Y = V(P[`el${s}`]).sub(P[n]).normalize();
      const Z = new THREE.Vector3(0, 0, 1).addScaledVector(Y, -Y.z).normalize();
      const X = new THREE.Vector3().crossVectors(Y, Z);
      if (X.x * sx < 0) { X.negate(); Z.negate(); }
      W = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    } else if (CHAIN[n]) {
      const t = CHAIN[n];
      const d = V(t === 'tip' ? tips[n] : P[t]).sub(P[n]).normalize().applyQuaternion(RpInv);
      W = Rp.clone().multiply(new THREE.Quaternion().setFromUnitVectors(down, d));
    } else W = Rp.clone();
    Rw[n] = W;
    bind[n] = RpInv.clone().multiply(W).toArray();
  }
  return { local, bind };
}

export async function loadAI(id) {
  const gltf = await new Promise((res, rej) => loader.load(AI_MODELS[id], res, undefined, rej));
  let sm = null;
  gltf.scene.traverse((o) => { if (o.isSkinnedMesh && !sm) sm = o; });
  if (!sm) return null;
  gltf.scene.updateMatrixWorld(true);
  const bones = sm.skeleton.bones;
  const J = {};
  for (const b of bones) J[b.name] = b.getWorldPosition(new THREE.Vector3());

  // Bake the bind pose into world space.
  const src = sm.geometry, n = src.attributes.position.count;
  const pos = new Float32Array(n * 3), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(src.attributes.position, i);
    sm.applyBoneTransform(i, v);
    v.applyMatrix4(sm.matrixWorld);
    pos.set([v.x, v.y, v.z], i * 3);
  }

  // Face +z with the character's left on +x, feet on the ground, hips at
  // the game's hip height.
  const flip = J.headfront && J.headfront.z < J.Head.z;
  const fix = (p) => (flip ? p.set(-p.x, p.y, -p.z) : p);
  for (const k in J) fix(J[k]);
  let minY = Infinity;
  for (let i = 0; i < n; i++) {
    if (flip) { pos[i * 3] *= -1; pos[i * 3 + 2] *= -1; }
    minY = Math.min(minY, pos[i * 3 + 1]);
  }
  const swapLR = J.LeftArm.x < J.RightArm.x;
  const hipH = (J.LeftUpLeg.y + J.RightUpLeg.y) / 2 - minY;
  const scale = HIP_Y / hipH;
  const shift = new THREE.Vector3(-J.Hips.x, -minY, -(J.LeftUpLeg.z + J.RightUpLeg.z) / 2);
  const tf = (p) => p.add(shift).multiplyScalar(scale);
  for (const k in J) tf(J[k]);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (pos[i * 3] + shift.x) * scale;
    pos[i * 3 + 1] = (pos[i * 3 + 1] + shift.y) * scale;
    pos[i * 3 + 2] = (pos[i * 3 + 2] + shift.z) * scale;
  }
  const side = (name) => (swapLR ? name.replace(/^Left|^Right/, (m) => (m === 'Left' ? 'Right' : 'Left')) : name);

  // Joint positions for the game's bones.
  const P = {}, tips = {};
  P.root = V(J.Hips).setX(0); P.root.y = (J.LeftUpLeg.y + J.RightUpLeg.y) / 2 + 0.03;
  P.spine = V(J.Spine02).setX(0); P.chest = V(J.Spine01).setX(0); P.neck = V(J.neck).setX(0); P.head = V(J.Head).setX(0);
  for (const s of 'LR') {
    const M = (b) => J[side((s === 'L' ? 'Left' : 'Right') + b)];
    P[`clav${s}`] = V(M('Shoulder')); P[`sh${s}`] = V(M('Arm')); P[`el${s}`] = V(M('ForeArm')); P[`hand${s}`] = V(M('Hand'));
    P[`hip${s}`] = V(M('UpLeg')); P[`kn${s}`] = V(M('Leg')); P[`ft${s}`] = V(M('Foot'));
    // Fingers have no weights here, but the rig still needs them placed.
    const d = V(P[`hand${s}`]).sub(P[`el${s}`]).normalize();
    for (let i = 0; i < 4; i++) {
      const o = new THREE.Vector3(0, 0, (0.026 - i * 0.017));
      P[`f${s}${i}a`] = V(P[`hand${s}`]).addScaledVector(d, 0.07).add(o);
      P[`f${s}${i}b`] = V(P[`f${s}${i}a`]).addScaledVector(d, 0.035);
      P[`f${s}${i}c`] = V(P[`f${s}${i}b`]).addScaledVector(d, 0.025);
      tips[`f${s}${i}c`] = V(P[`f${s}${i}c`]).addScaledVector(d, 0.02);
    }
    P[`t${s}a`] = V(P[`hand${s}`]).addScaledVector(d, 0.02).add(new THREE.Vector3(0, 0, 0.035));
    P[`t${s}b`] = V(P[`t${s}a`]).addScaledVector(d, 0.03);
    P[`t${s}c`] = V(P[`t${s}b`]).addScaledVector(d, 0.025);
    tips[`t${s}c`] = V(P[`t${s}c`]).addScaledVector(d, 0.02);
  }
  const { local, bind } = solveBind(P, tips);

  // Skin weights onto the game's bones (indices into GAME_BONES).
  const gi = Object.fromEntries(GAME_BONES.map((b, i) => [b, i]));
  const map = bones.map((b) => gi[FOLD[side(b.name)] ?? 'root'] ?? 0);
  const si = src.attributes.skinIndex, sw = src.attributes.skinWeight;
  const idx = new Uint16Array(n * 4), wt = new Float32Array(n * 4);
  for (let i = 0; i < n * 4; i++) { idx[i] = map[si.array[i]]; wt[i] = sw.getComponent(Math.floor(i / 4), i % 4); }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (src.attributes.uv) g.setAttribute('uv', src.attributes.uv.clone());
  g.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(wt, 4));
  g.setIndex(src.index.clone());
  g.computeVertexNormals();

  // Head frame (bruises, camera framing): the head joint up to the crown.
  const hj = P.head;
  let top = hj.y, rx = 0, front = hj.z;
  for (let i = 0; i < n; i++) {
    if (idx[i * 4] !== gi.head || wt[i * 4] < 0.9) continue;
    top = Math.max(top, pos[i * 3 + 1]); rx = Math.max(rx, Math.abs(pos[i * 3])); front = Math.max(front, pos[i * 3 + 2]);
  }
  const hr = (top - hj.y) / 2;
  const head = { c: [0, hj.y + hr, hj.z], r: [Math.max(rx, hr * 0.8), hr, Math.max(front - hj.z, hr * 0.8)], eyes: { L: [0.04, hj.y + hr, front], R: [-0.04, hj.y + hr, front] }, eyeR: 0.02 };

  const map0 = sm.material.map || null;
  if (map0) map0.colorSpace = THREE.SRGBColorSpace;
  const rig = { bones: GAME_BONES, local, bind, hipY: P.root.y, head, chest: { front: 0.12, neck: P.neck.y - P.chest.y }, morphs: [], ai: true };
  return { mh: { geometry: g, rig, texture: map0 } };
}
