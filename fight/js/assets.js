// Character meshes built from the MakeHuman base mesh (tools/build_mh.py).
// Loaded once, then shared by every puppet of that character.
import * as THREE from 'three';

const cache = new Map();   // id -> { mh: { geometry, rig } } once loaded
const pending = new Map(); // id -> Promise

// One skinned mesh with vertex colours, the rig it was bound in, and
// facial expression morphs.
const TYPES = { f32: Float32Array, u8: Uint8Array, u16: Uint16Array, u32: Uint32Array, i16: Int16Array };
async function loadMHC(id) {
  const r = await fetch(`assets/chars/${id}.mhc`);
  if (!r.ok) return null;
  // Gzipped on disk; inflate in the browser.
  const buf = await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  if (new TextDecoder().decode(new Uint8Array(buf, 0, 4)) !== 'MHC2') return null;
  const hl = new DataView(buf).getUint32(4, true);
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl)));
  const get = (name) => { const m = head.buffers[name]; return new TYPES[m.type](buf, 8 + hl + m.offset, m.count); };
  const n = head.vertices;
  const g = new THREE.BufferGeometry();
  const pm = head.buffers.position, q = get('position'), pos = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) { const k = i % 3; pos[i] = pm.lo[k] + (q[i] / 65535) * (pm.hi[k] - pm.lo[k]); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  // Colours are stored as sRGB bytes; the shader wants linear.
  const c8 = get('color'), col = new Float32Array(n * 3);
  const lin = Float32Array.from({ length: 256 }, (_, i) => { const c = i / 255; return c < 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  for (let i = 0; i < n * 3; i++) col[i] = lin[c8[i]];
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(Uint16Array.from(get('skinIndex')), 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(Float32Array.from(get('skinWeight'), (v) => v / 255), 4));
  g.setIndex(new THREE.BufferAttribute(get('index').slice(), 1));
  g.morphAttributes.position = head.rig.morphs.map((name) => {
    const idx = get(`morph:${name}:idx`), d = get(`morph:${name}:d`), sc = head.buffers[`morph:${name}:d`].scale, dense = new Float32Array(n * 3);
    for (let k = 0; k < idx.length; k++) for (let c = 0; c < 3; c++) dense[idx[k] * 3 + c] = d[k * 3 + c] * sc;
    return new THREE.BufferAttribute(dense, 3);
  });
  g.morphTargetsRelative = true;
  g.computeVertexNormals();
  return { mh: { geometry: g, rig: head.rig } };
}

export function loadCharacter(id) {
  if (cache.has(id)) return Promise.resolve(cache.get(id));
  if (pending.has(id)) return pending.get(id);
  const p = loadMHC(id).catch(() => null).then((mh) => { cache.set(id, mh); return mh; });
  pending.set(id, p);
  return p;
}

export function getCharacter(id) { return cache.get(id) || null; }

export function loadAll(ids) { return Promise.all(ids.map(loadCharacter)); }
