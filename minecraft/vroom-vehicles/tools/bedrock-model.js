// Turn a Bedrock .geo.json into a three.js object, the way Blockbench (and so
// Minecraft) shows it: x is mirrored, x/y rotations are flipped, and each
// face's texture reads left-to-right when you look at it from outside.
// Shared by tools/preview.js and the garage previewer. Expects global THREE.

(function (root) {
  const FACES = ["east", "west", "up", "down", "south", "north"];  // three's box order
  const rad = d => d * Math.PI / 180;
  // Minecraft shades faces by direction: top 100%, front/back 80%, sides 60%
  const MC_SHADE = [0.6, 0.6, 1.0, 0.5, 0.8, 0.8];

  const toBB = p => [-p[0], p[1], p[2]];
  const rotBB = r => [-rad(r[0]), -rad(r[1]), rad(r[2])];

  function cubeMesh(c, material, tw, th, mcShade) {
    const [w, h, d] = c.size;
    const g = new THREE.BoxGeometry(Math.max(w, .001), Math.max(h, .001), Math.max(d, .001));
    const uv = g.attributes.uv;
    FACES.forEach((f, i) => {
      const { uv: [u, v], uv_size: [su, sv] } = c.uv[f];
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([du, dv], k) =>
        uv.setXY(i * 4 + k, (u + du * su) / tw, 1 - (v + dv * sv) / th));
    });
    if (mcShade) {
      const col = [];
      for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) col.push(MC_SHADE[i], MC_SHADE[i], MC_SHADE[i]);
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    }
    const center = toBB([c.origin[0] + w / 2, c.origin[1] + h / 2, c.origin[2] + d / 2]);
    const pivot = c.pivot ? toBB(c.pivot) : center;
    const holder = new THREE.Group();
    holder.position.set(...pivot);
    if (c.rotation) holder.rotation.set(...rotBB(c.rotation), "ZYX");
    const mesh = new THREE.Mesh(g, material);
    mesh.position.set(center[0] - pivot[0], center[1] - pivot[1], center[2] - pivot[2]);
    holder.add(mesh);
    return holder;
  }

  // Returns { model, bones } where bones[name] is the group to animate.
  // materials: { solid, glass } — bones named glass* use the glass one.
  function buildBedrockModel(geoJson, materials, { mcShade = false } = {}) {
    const geo = geoJson["minecraft:geometry"][0];
    const { texture_width: tw, texture_height: th } = geo.description;
    const groups = {}, model = new THREE.Group();
    for (const b of geo.bones) {
      const pivot = toBB(b.pivot || [0, 0, 0]);
      const outer = new THREE.Group(), animated = new THREE.Group(), inner = new THREE.Group();
      outer.position.set(...pivot);
      if (b.rotation) outer.rotation.set(...rotBB(b.rotation), "ZYX");
      inner.position.set(-pivot[0], -pivot[1], -pivot[2]);
      outer.add(animated); animated.add(inner);
      const mat = b.name.startsWith("glass") ? materials.glass : materials.solid;
      (b.cubes || []).forEach(c => inner.add(cubeMesh(c, mat, tw, th, mcShade)));
      groups[b.name] = { outer, animated, inner, bone: b };
    }
    for (const { outer, bone } of Object.values(groups)) {
      (bone.parent ? groups[bone.parent].inner : model).add(outer);
    }
    const bones = {};
    for (const [name, g] of Object.entries(groups)) bones[name] = g.animated;
    return { model, bones };
  }

  // Apply a Bedrock rotation (degrees, as written in animation files).
  function setBoneRotation(bone, r) {
    bone.rotation.set(...rotBB(r), "ZYX");
  }

  root.buildBedrockModel = buildBedrockModel;
  root.setBoneRotation = setBoneRotation;
})(typeof window !== "undefined" ? window : globalThis);
