// Render the Vroom Harbor teaser: a title card, a tour of the village's
// landmarks, and a closing aerial shot at sunset.
//
//   node tools/make_village_video.js [--size 1920x1080] [--fps 30] [--jobs 4] [--out dist/vroom-harbor.mp4]
//
// Drives village/index.html in video mode (time and camera are stepped
// frame by frame, so the clip is smooth however slow rendering is), saves
// each frame, then encodes with ffmpeg and tools/music.py's soundtrack.
// Offline helpers: THREE_JS, ORBIT_JS and FONTS_CSS, as for make_video.js.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawn } = require("child_process");
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const ROOT = path.resolve(__dirname, "..");
const arg = (name, def) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : def);
const [W, H] = arg("--size", "1920x1080").split("x").map(Number);
const FPS = Number(arg("--fps", 30));
const OUT = path.resolve(arg("--out", path.join(ROOT, "dist/vroom-harbor.mp4")));
const JOBS = Number(arg("--jobs", 1));
const PART = arg("--part", null);
const FRAMES = path.join(os.tmpdir(), "vroom-village-frames");

// 120 bpm: the title gets 16 beats, each landmark 8 (two bars), the ending 12
const BEAT = 0.5;
// [name, line, eye from, eye to, look from, look to, sky]  (positions in blocks)
const SHOTS = [
  ["", "", [64, 56, 152], [64, 40, 124], [64, 6, 48], [64, 8, 44], "day"],
  ["The Harbor", "Piers, a marina and a lighthouse", [34, 13, 104], [52, 11, 99], [70, 8, 88], [96, 6, 84], "day"],
  ["Vroom Motors", "Every ride from the mod, on show", [17, 5.6, 38], [17, 5.6, 45.5], [14, 5, 58], [12, 4.8, 58], "day"],
  ["The Gem Gallery", "Diamonds, emeralds, gold and more", [45.5, 6.4, 49.5], [40.5, 6.6, 55], [45.5, 5, 62], [50, 5.2, 58], "day"],
  ["Town Hall", "A clock tower, and a helipad on the roof", [63.5, 5.8, 46], [63.5, 7, 37], [63.5, 13, 20], [63.5, 17, 14], "day"],
  ["Police Station", "Keeping Vroom Harbor safe", [72, 9, 49], [78, 9, 47], [92, 8, 34], [94, 8, 34], "day"],
  ["Grocery & Café", "Fresh food on Main Street", [6, 6, 47], [42, 6, 47], [12, 6.5, 35], [40, 6.5, 35], "day"],
  ["Luna & Indi Park", "A fountain, trees and flowers", [66, 14, 44], [70, 13, 46], [85, 5, 52], [86, 6, 54], "day"],
  ["A tribute to Luna & Indi", "Their names in gold, and two golden statues", [85.5, 19, 30], [85.5, 18, 36], [85.5, 15, 61], [85.5, 15.5, 61], "day"],
  ["", "", [104, 24, 108], [64, 62, 150], [80, 10, 58], [64, 6, 46], "sunset"],
];
const DUR = SHOTS.map((_, i) => (i === 0 ? 16 : i === SHOTS.length - 1 ? 12 : 8) * BEAT);
const START = DUR.map((_, i) => DUR.slice(0, i).reduce((a, b) => a + b, 0));
const TOTAL = DUR.reduce((a, b) => a + b, 0);

const OVERLAY = `
<style>
  #v { position: fixed; inset: 0; pointer-events: none; font-family: "Figtree", sans-serif; color: #fff; }
  #v .vig { position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 58%, rgba(4, 10, 20, 0.5) 100%); }
  #v .v-card { position: absolute; inset: 0; display: grid; place-content: center; text-align: center;
    background: radial-gradient(ellipse at center, rgba(6, 16, 30, 0.3), rgba(6, 16, 30, 0.72)); }
  #v .eyebrow { font: 600 ${H * 0.022}px/1 "JetBrains Mono", monospace; letter-spacing: 0.3em; text-transform: uppercase; color: #bfe3ff; }
  #v .names { font: 800 ${H * 0.07}px/1 "Big Shoulders Display", Impact, sans-serif; letter-spacing: 0.04em; color: #ffd23f; margin-top: ${H * 0.02}px; }
  #v .big { font: 800 ${H * 0.19}px/0.9 "Big Shoulders Display", Impact, sans-serif; text-transform: uppercase;
    text-shadow: 0 ${H * 0.008}px ${H * 0.04}px rgba(0,0,0,0.45); margin-top: ${H * 0.01}px; }
  #v .big .amp, #v .names .amp { color: #ff6b3d; }
  #v .sub { margin-top: ${H * 0.025}px; font: 500 ${H * 0.03}px/1.3 "Figtree", sans-serif; color: #dbe9f5; }
  #v .lower { position: absolute; left: ${W * 0.045}px; bottom: ${H * 0.07}px; display: grid; gap: ${H * 0.008}px; }
  #v .count { font: 600 ${H * 0.022}px/1 "JetBrains Mono", monospace; letter-spacing: 0.2em; color: #bfe3ff; }
  #v .pname { font: 800 ${H * 0.1}px/0.95 "Big Shoulders Display", Impact, sans-serif; text-transform: uppercase;
    text-shadow: 0 ${H * 0.006}px ${H * 0.03}px rgba(0,0,0,0.5); }
  #v .line { font: 500 ${H * 0.03}px/1.2 "Figtree", sans-serif; color: #eef5fb; text-shadow: 0 1px 8px rgba(0,0,0,0.7); }
  #v .wipe { position: absolute; top: 0; bottom: 0; width: 140%; left: -20%;
    background: linear-gradient(100deg, transparent 0%, #ff6b3d 12%, #ffd23f 50%, #5fe0ff 88%, transparent 100%); }
</style>
<div id="v">
  <div class="vig"></div>
  <div class="lower" id="v-lower"><div class="count" id="v-count"></div><div class="pname" id="v-name"></div><div class="line" id="v-line"></div></div>
  <div class="v-card" id="v-intro">
    <div class="eyebrow">A Minecraft village for</div>
    <div class="names">INDI <span class="amp">&amp;</span> LUNA</div>
    <div class="big">Vroom Harbor</div>
    <div class="sub">A town by the water, with a park, shops, gems and a tribute</div>
  </div>
  <div class="v-card" id="v-outro">
    <div class="big" style="font-size:${H * 0.15}px">Vroom Harbor</div>
    <div class="names">Made for INDI <span class="amp">&amp;</span> LUNA</div>
    <div class="sub">Coming to your Minecraft world</div>
  </div>
  <div class="wipe" id="v-wipe"></div>
</div>`;

// Runs inside the page: camera, sky and overlay for time t.
function director(SHOTS, START, DUR) {
  const ease = x => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
  const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const $ = id => document.getElementById(id);
  let sky = null;
  window.renderAt = ({ t, dt }) => {
    let i = START.findIndex((s, k) => t >= s && t < s + DUR[k]);
    if (i < 0) i = SHOTS.length - 1;
    const [name, line, e0, e1, a0, a1, s] = SHOTS[i];
    const local = t - START[i], span = DUR[i], p = ease(local / span);
    if (s !== sky) { village.applySky(s); sky = s; }
    village.look(lerp(e0, e1, p), lerp(a0, a1, p));
    village.step(dt);
    const fade = (x, d) => ease(x / d);
    const last = SHOTS.length - 1;
    $("v-intro").style.opacity = i === 0 ? Math.min(fade(local - 0.4, 0.8), 1 - ease((local - span + 0.9) / 0.6)) : 0;
    $("v-outro").style.opacity = i === last ? fade(local - 0.8, 1) : 0;
    const showing = i > 0 && i < last;
    $("v-lower").style.opacity = showing ? Math.min(fade(local - 0.35, 0.35), 1 - ease((local - span + 0.45) / 0.3)) : 0;
    $("v-lower").style.transform = `translateX(${(1 - fade(local - 0.35, 0.45)) * -40}px)`;
    if (showing) {
      $("v-count").textContent = `${String(i).padStart(2, "0")} / ${last - 1}`;
      $("v-name").textContent = name;
      $("v-line").textContent = line;
    }
    const near = START.slice(1).map(c => t - c).find(d => d > -0.22 && d < 0.22);
    const wipe = $("v-wipe");
    if (near === undefined) wipe.style.opacity = 0;
    else {
      wipe.style.opacity = 1;
      wipe.style.transform = `translateX(${(((near + 0.22) / 0.44) * 2 - 1) * 120}%) skewX(-12deg)`;
    }
  };
}

async function render(part) {
  const [k, N] = part ? part.split("/").map(Number) : [0, 1];
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on("pageerror", e => console.error("page error:", e.message));
  await page.addInitScript(() => { window.VIDEO_MODE = true; });
  if (process.env.THREE_JS) await page.route("**/three.min.js", r => r.fulfill({ path: process.env.THREE_JS, contentType: "text/javascript" }));
  if (process.env.ORBIT_JS) await page.route("**/OrbitControls.js", r => r.fulfill({ path: process.env.ORBIT_JS, contentType: "text/javascript" }));
  if (process.env.FONTS_CSS) await page.route("https://fonts.googleapis.com/**", r => r.fulfill({ path: process.env.FONTS_CSS, contentType: "text/css" }));
  await page.goto("file://" + path.join(ROOT, "village/index.html"));
  await page.waitForFunction(() => window.village, null, { timeout: 180000 });
  await page.evaluate(html => document.body.insertAdjacentHTML("beforeend", html), OVERLAY);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(`(${director})(${JSON.stringify(SHOTS)}, ${JSON.stringify(START)}, ${JSON.stringify(DUR)})`);
  const count = Math.round(TOTAL * FPS);
  const shot = t => Math.max(0, START.findIndex((s, i) => t >= s && t < s + DUR[i]));
  const mine = [...Array(count).keys()].filter(f => shot(f / FPS) % N === k);
  const t0 = Date.now();
  for (const [done, f] of mine.entries()) {
    await page.evaluate(o => window.renderAt(o), { t: f / FPS, dt: 1 / FPS });
    await page.screenshot({ path: path.join(FRAMES, `f${String(f).padStart(5, "0")}.jpg`), type: "jpeg", quality: 92 });
    if (done % (FPS * 5) === 0) {
      const per = (Date.now() - t0) / (done + 1);
      console.log(`[${k + 1}/${N}] frame ${done}/${mine.length}  ~${Math.round(per * (mine.length - done) / 1000)}s left`);
    }
  }
  await browser.close();
}

function encode() {
  const count = fs.readdirSync(FRAMES).length;
  const music = path.join(os.tmpdir(), "vroom-village-music.wav");
  execFileSync("python3", [path.join(__dirname, "music.py"), music, String(TOTAL), String(BEAT)], { stdio: "inherit" });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS),
    "-i", path.join(FRAMES, "f%05d.jpg"), "-i", music,
    "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-tune", "animation", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", OUT], { stdio: "inherit" });
  console.log(`wrote ${OUT} (${TOTAL.toFixed(1)}s, ${count} frames)`);
}

(async () => {
  if (PART) { await render(PART); return; }
  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });
  if (JOBS <= 1) await render(null);
  else {
    const self = [__filename, "--size", `${W}x${H}`, "--fps", String(FPS)];
    await Promise.all([...Array(JOBS).keys()].map(k => new Promise((ok, fail) => {
      const p = spawn(process.execPath, [...self, "--part", `${k}/${JOBS}`], { stdio: "inherit" });
      p.on("exit", code => (code === 0 ? ok() : fail(new Error(`part ${k} failed`))));
    })));
  }
  encode();
})();
