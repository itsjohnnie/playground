// Render a vehicle model to PNGs without opening Minecraft.
//
//   node tools/preview.js [speedboat]
//
// Writes previews/<name>-N.png (four angles) and refreshes both pack icons.
// Needs Playwright (npm i -D playwright) and three.js (fetched from cdnjs,
// or set THREE_JS=/path/to/three.min.js).
// The renderer follows Blockbench's reading of Bedrock models: x is
// mirrored, and x/z rotations are flipped.

const fs = require("fs");
const path = require("path");
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const ROOT = path.resolve(__dirname, "..");
const RP = path.join(ROOT, "packs/VroomVehicles_RP");
const name = process.argv[2] || "speedboat";

const geo = JSON.parse(fs.readFileSync(path.join(RP, `models/entity/${name}.geo.json`)));
const tex = fs.readFileSync(path.join(RP, `textures/entity/${name}.png`)).toString("base64");

const page = `<!doctype html><html><body style="margin:0">
<script>
const GEO = ${JSON.stringify(geo)}["minecraft:geometry"][0];
const TW = GEO.description.texture_width, TH = GEO.description.texture_height;
const FACES = ["east", "west", "up", "down", "south", "north"];   // three's box order
const rad = d => d * Math.PI / 180;

function cubeMesh(c, material) {
  const [w, h, d] = c.size, [x, y, z] = c.origin;
  const g = new THREE.BoxGeometry(Math.max(w, .001), Math.max(h, .001), Math.max(d, .001));
  const uv = g.attributes.uv;
  FACES.forEach((f, i) => {
    const { uv: [u, v], uv_size: [su, sv] } = c.uv[f];
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([du, dv], k) =>
      uv.setXY(i * 4 + k, (u + du * su) / TW, 1 - (v + dv * sv) / TH));
  });
  // Minecraft shades faces by direction: top 100%, front/back 80%, sides 60%
  const shade = [0.6, 0.6, 1.0, 0.5, 0.8, 0.8], col = [];
  for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) col.push(shade[i], shade[i], shade[i]);
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(g, material);
  const pivot = c.pivot || [x + w / 2, y + h / 2, z + d / 2];
  const holder = new THREE.Group();
  holder.position.set(...pivot);
  if (c.rotation) holder.rotation.set(-rad(c.rotation[0]), rad(c.rotation[1]), -rad(c.rotation[2]), "ZYX");
  mesh.position.set(x + w / 2 - pivot[0], y + h / 2 - pivot[1], z + d / 2 - pivot[2]);
  holder.add(mesh);
  return holder;
}

function build(textureImg) {
  const t = new THREE.Texture(textureImg);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipMapLinearFilter;
  t.needsUpdate = true;
  const solid = new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.5, vertexColors: true });
  const glass = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, vertexColors: true });
  const groups = {}, model = new THREE.Group();
  for (const b of GEO.bones) {
    const outer = new THREE.Group(), inner = new THREE.Group();
    outer.position.set(...b.pivot);
    if (b.rotation) outer.rotation.set(-rad(b.rotation[0]), rad(b.rotation[1]), -rad(b.rotation[2]), "ZYX");
    inner.position.set(-b.pivot[0], -b.pivot[1], -b.pivot[2]);
    outer.add(inner);
    const mat = b.name.startsWith("glass") ? glass : solid;
    (b.cubes || []).forEach(c => inner.add(cubeMesh(c, mat)));
    groups[b.name] = { outer, inner, bone: b };
  }
  for (const { outer, bone } of Object.values(groups)) {
    // a child bone's pivot is in model space, so undo the parent's offset
    (bone.parent ? groups[bone.parent].inner : model).add(outer);
  }
  model.scale.x = -1;
  return model;
}

window.render = (w, h, views) => new Promise(done => {
  const img = new Image();
  img.onload = () => {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(w, h);
    document.body.appendChild(r.domElement);
    const out = [];
    for (const v of views) {
      const s = new THREE.Scene();
      s.add(build(img));
      if (v.water) {
        const water = new THREE.Mesh(new THREE.PlaneGeometry(400, 400),
          new THREE.MeshBasicMaterial({ color: 0x2f7fd1, transparent: true, opacity: 0.55 }));
        water.rotation.x = -Math.PI / 2; water.position.y = 3.5; s.add(water);
      }
      r.setClearColor(v.bg, v.bg === null ? 0 : 1);
      const cam = new THREE.PerspectiveCamera(v.fov || 32, w / h, 1, 1000);
      cam.position.set(...v.eye); cam.lookAt(0, 6, 0);
      r.render(s, cam);
      out.push(r.domElement.toDataURL("image/png"));
    }
    done(out);
  };
  img.src = "data:image/png;base64,${tex}";
});
</script></body></html>`;

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
  const tab = await browser.newPage();
  await tab.setContent(page);
  // THREE_JS=/path/to/three.min.js to work offline; otherwise fetch r128
  await tab.addScriptTag(process.env.THREE_JS ? { path: process.env.THREE_JS }
    : { url: "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" });
  const save = (url, file) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(url.split(",")[1], "base64"));
  };
  const shots = await tab.evaluate(() => render(900, 520, [
    { eye: [70, 42, -62], bg: 0xbfe6ff, water: true },
    { eye: [-58, 50, 66], bg: 0xbfe6ff, water: true },
    { eye: [95, 10, 0], bg: 0xbfe6ff, water: false, fov: 30 },
    { eye: [0.1, 110, 8], bg: 0xbfe6ff, water: false, fov: 30 },
  ]));
  shots.forEach((s, i) => save(s, path.join(ROOT, `previews/${name}-${i + 1}.png`)));
  const [icon] = await tab.evaluate(() => render(256, 256, [
    { eye: [62, 46, -56], bg: 0x9edbff, water: true, fov: 40 },
  ]));
  save(icon, path.join(ROOT, "packs/VroomVehicles_BP/pack_icon.png"));
  save(icon, path.join(RP, "pack_icon.png"));
  await browser.close();
  console.log(`rendered previews/${name}-1..4.png and pack icons`);
})();
