// Render a vehicle to PNGs without opening Minecraft.
//
//   node tools/preview.js speedboat              # from the resource pack
//   node tools/preview.js jet_ski --from /tmp/x  # from a gen_art.py --out folder
//
// Writes previews/<id>-1..5.png (front, back, side, top, easter eggs) and the
// inventory icon textures/items/<id>.png (into the resource pack, or into
// --from when given). The speedboat also refreshes both pack icons.
// Needs Playwright (npm i -D playwright) and three.js (fetched from cdnjs,
// or set THREE_JS=/path/to/three.min.js). Models are read the way Blockbench
// reads them (tools/bedrock-model.js), with Minecraft's flat face shading.

const fs = require("fs");
const path = require("path");
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const ROOT = path.resolve(__dirname, "..");
const RP = path.join(ROOT, "packs/VroomVehicles_RP");
const args = process.argv.slice(2);
const id = args.find(a => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--from") || "speedboat";
const from = args.includes("--from") ? path.resolve(args[args.indexOf("--from") + 1]) : RP;
const previewDir = args.includes("--from") ? path.join(from, "previews") : path.join(ROOT, "previews");

const geo = fs.readFileSync(path.join(from, `models/entity/${id}.geo.json`), "utf8");
const tex = fs.readFileSync(path.join(from, "textures/entity/vroom_atlas.png")).toString("base64");
const info = JSON.parse(fs.readFileSync(path.join(from, "fleet.json"), "utf8"))[id] || {};

const page = `<!doctype html><html><body style="margin:0"><script>
window.render = (w, h, views, transparent) => new Promise(done => {
  const img = new Image();
  img.onload = () => {
    const t = new THREE.Texture(img);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipMapLinearFilter;
    t.needsUpdate = true;
    const materials = {
      solid: new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.5, vertexColors: true }),
      glass: new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, vertexColors: true }),
    };
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(w, h);
    document.body.appendChild(r.domElement);
    const out = [];
    for (const v of views) {
      const s = new THREE.Scene();
      const model = buildBedrockModel(${geo}, materials, { mcShade: true }).model;
      s.add(model);
      const bb = new THREE.Box3().setFromObject(model);
      const c = bb.getCenter(new THREE.Vector3()), size = bb.getSize(new THREE.Vector3());
      const reach = Math.max(size.x, size.y, size.z);
      if (v.ground) {
        const g = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000),
          new THREE.MeshBasicMaterial({ color: v.ground, transparent: true, opacity: 0.55 }));
        g.rotation.x = -Math.PI / 2; g.position.y = v.groundY; s.add(g);
      }
      r.setClearColor(v.bg || 0, transparent ? 0 : 1);
      const cam = new THREE.PerspectiveCamera(v.fov || 32, w / h, 0.5, 5000);
      if (v.eye) { cam.position.set(...v.eye); cam.lookAt(...v.at); }
      else {
        const d = new THREE.Vector3(...v.dir).normalize();
        cam.position.copy(c).addScaledVector(d, reach * (v.dist || 1.9) + 6);
        cam.lookAt(c);
      }
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
  await tab.addScriptTag(process.env.THREE_JS ? { path: process.env.THREE_JS }
    : { url: "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" });
  await tab.addScriptTag({ path: path.join(__dirname, "bedrock-model.js") });
  const save = (url, file) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(url.split(",")[1], "base64"));
  };
  const mode = info.mode || "water";
  const sky = 0xbfe6ff;
  const ground = mode === "land" ? { ground: 0x5f8f3e, groundY: 0 }
    : mode === "air" ? {} : { ground: 0x2f7fd1, groundY: 3.5 };
  const views = [
    { dir: [0.67, 0.42, -0.6], bg: sky, ...ground },
    { dir: [-0.6, 0.5, 0.62], bg: sky, ...ground },
    { dir: [1, 0.08, 0], bg: sky, dist: 1.5 },
    { dir: [0.001, 1, 0.08], bg: sky, dist: 1.5 },
  ];
  if (info.egg_cam) views.push({ eye: info.egg_cam.eye, at: info.egg_cam.at, bg: sky, ...ground, fov: 30 });
  const shots = await tab.evaluate(([v]) => render(900, 520, v), [views]);
  shots.forEach((s, i) => save(s, path.join(previewDir, `${id}-${i + 1}.png`)));
  const [icon] = await tab.evaluate(() => render(64, 64, [{ dir: [0.75, 0.45, -0.5], fov: 28, dist: 1.6 }], true));
  save(icon, path.join(from, `textures/items/${id}.png`));
  if (id === "speedboat" && from === RP) {
    const [p] = await tab.evaluate(([g]) => render(256, 256, [{ dir: [0.67, 0.5, -0.6], bg: 0x9edbff, fov: 40, ...g }]), [ground]);
    save(p, path.join(ROOT, "packs/VroomVehicles_BP/pack_icon.png"));
    save(p, path.join(RP, "pack_icon.png"));
  }
  await browser.close();
  console.log(`rendered ${path.relative(ROOT, previewDir) || previewDir}/${id}-1..${shots.length}.png and its icon`);
})();
