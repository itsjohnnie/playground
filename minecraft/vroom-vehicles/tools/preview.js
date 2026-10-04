// Render a vehicle model to PNGs without opening Minecraft.
//
//   node tools/preview.js [speedboat]
//
// Writes previews/<name>-N.png (five angles) and refreshes both pack icons.
// Needs Playwright (npm i -D playwright) and three.js (fetched from cdnjs,
// or set THREE_JS=/path/to/three.min.js). The model is read the way
// Blockbench reads it (see tools/bedrock-model.js), with Minecraft's flat
// per-face shading.

const fs = require("fs");
const path = require("path");
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const ROOT = path.resolve(__dirname, "..");
const RP = path.join(ROOT, "packs/VroomVehicles_RP");
const name = process.argv[2] || "speedboat";

const geo = fs.readFileSync(path.join(RP, `models/entity/${name}.geo.json`), "utf8");
const tex = fs.readFileSync(path.join(RP, `textures/entity/${name}.png`)).toString("base64");

const page = `<!doctype html><html><body style="margin:0"><script>
window.render = (w, h, views) => new Promise(done => {
  const img = new Image();
  img.onload = () => {
    const t = new THREE.Texture(img);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipMapLinearFilter;
    t.needsUpdate = true;
    const materials = {
      solid: new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.5, vertexColors: true }),
      glass: new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, vertexColors: true }),
    };
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(w, h);
    document.body.appendChild(r.domElement);
    const out = [];
    for (const v of views) {
      const s = new THREE.Scene();
      s.add(buildBedrockModel(${geo}, materials, { mcShade: true }).model);
      if (v.water) {
        const water = new THREE.Mesh(new THREE.PlaneGeometry(400, 400),
          new THREE.MeshBasicMaterial({ color: 0x2f7fd1, transparent: true, opacity: 0.55 }));
        water.rotation.x = -Math.PI / 2; water.position.y = 3.5; s.add(water);
      }
      r.setClearColor(v.bg, 1);
      const cam = new THREE.PerspectiveCamera(v.fov || 32, w / h, 1, 1000);
      cam.position.set(...v.eye); cam.lookAt(...(v.at || [0, 6, 0]));
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
  await tab.addScriptTag({ path: path.join(__dirname, "bedrock-model.js") });
  const save = (url, file) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(url.split(",")[1], "base64"));
  };
  const sky = 0xbfe6ff;
  const shots = await tab.evaluate(sky => render(900, 520, [
    { eye: [70, 42, -62], bg: sky, water: true },
    { eye: [-58, 50, 66], bg: sky, water: true },
    { eye: [95, 10, 0], bg: sky, fov: 30 },
    { eye: [0.1, 110, 8], bg: sky, fov: 30 },
    { eye: [10, 16, 62], at: [0, 10, 26], bg: sky, water: true, fov: 30 },   // the stern
  ]), sky);
  shots.forEach((s, i) => save(s, path.join(ROOT, `previews/${name}-${i + 1}.png`)));
  const [icon] = await tab.evaluate(() => render(256, 256, [
    { eye: [62, 46, -56], bg: 0x9edbff, water: true, fov: 40 },
  ]));
  save(icon, path.join(ROOT, "packs/VroomVehicles_BP/pack_icon.png"));
  save(icon, path.join(RP, "pack_icon.png"));
  await browser.close();
  console.log(`rendered previews/${name}-1..${shots.length}.png and pack icons`);
})();
