// Character meshes modelled in Blender (tools/build_characters.py): one
// skinned body and one sculpted head per character. Loaded once, then shared
// by every puppet of that character.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map();   // id -> { body, head } once loaded
const pending = new Map(); // id -> Promise

// Cylindrical UVs so the clay fingerprint normal map lands on the surface.
function addUVs(g) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (Math.atan2(p.getX(i), p.getZ(i)) / (Math.PI * 2) + 0.5) * 3;
    uv[i * 2 + 1] = p.getY(i) * 3;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export function loadCharacter(id) {
  if (cache.has(id)) return Promise.resolve(cache.get(id));
  if (pending.has(id)) return pending.get(id);
  const p = new Promise((resolve) => {
    loader.load(`assets/chars/${id}.glb`, (gltf) => {
      const out = {};
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o) => {
        if (o.isSkinnedMesh && !out.body) {
          const g = o.geometry.clone();
          g.applyMatrix4(o.matrixWorld);
          addUVs(g);
          out.body = { geometry: g, bones: o.skeleton.bones.map((b) => b.name) };
        } else if (o.isMesh && !o.isSkinnedMesh && !out.head) {
          const g = o.geometry.clone();
          g.applyMatrix4(o.matrixWorld);
          addUVs(g);
          out.head = g;
        }
      });
      cache.set(id, out);
      resolve(out);
    }, undefined, () => { cache.set(id, null); resolve(null); });
  });
  pending.set(id, p);
  return p;
}

export function getCharacter(id) { return cache.get(id) || null; }

export function loadAll(ids) { return Promise.all(ids.map(loadCharacter)); }
