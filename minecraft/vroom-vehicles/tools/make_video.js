// Render the fleet showcase video: a title card, every vehicle turning in its
// scene with its name, and a closing card.
//
//   node tools/make_video.js [--size 1920x1080] [--fps 30] [--jobs 4] [--out dist/vroom-vehicles.mp4]
//
// Drives garage/index.html in video mode (it steps time frame by frame, so
// the clip is smooth however slow rendering is), saves each frame, then
// encodes with ffmpeg along with tools/music.py's soundtrack.
// Offline helpers: THREE_JS, ORBIT_JS (local copies of the two scripts) and
// FONTS_CSS (a stylesheet with local font files) replace the network loads.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const ROOT = path.resolve(__dirname, "..");
const arg = (name, def) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : def);
const [W, H] = arg("--size", "1920x1080").split("x").map(Number);
const FPS = Number(arg("--fps", 30));
const OUT = path.resolve(arg("--out", path.join(ROOT, "dist/vroom-vehicles.mp4")));
const FRAMES = path.join(require("os").tmpdir(), "vroom-frames");

// timing, in seconds; at 150 bpm each vehicle gets exactly two bars
const BEAT = 0.4, INTRO = 16 * BEAT, PER = 8 * BEAT, OUTRO = 12 * BEAT;

const OVERLAY = `
<style>
  .hud, .fleet, .dock, .notice { display: none !important; }
  #v { position: fixed; inset: 0; pointer-events: none; font-family: "Figtree", sans-serif; color: #fff; }
  #v .vig { position: absolute; inset: 0; background:
    radial-gradient(ellipse at center, transparent 55%, rgba(4, 10, 20, 0.55) 100%); }
  #v .card { position: absolute; inset: 0; display: grid; place-content: center; text-align: center;
    background: radial-gradient(ellipse at center, rgba(6, 16, 30, 0.35), rgba(6, 16, 30, 0.8)); }
  #v .eyebrow { font: 600 ${H * 0.022}px/1 "JetBrains Mono", monospace; letter-spacing: 0.3em;
    text-transform: uppercase; color: #bfe3ff; }
  #v .names { font: 800 ${H * 0.2}px/0.9 "Big Shoulders Display", Impact, sans-serif;
    letter-spacing: 0.01em; margin: ${H * 0.025}px 0 ${H * 0.01}px; text-shadow: 0 ${H * 0.008}px ${H * 0.04}px rgba(0,0,0,0.45); }
  #v .names .amp { color: #ff6b3d; }
  #v .brand { font: 800 ${H * 0.075}px/1 "Big Shoulders Display", Impact, sans-serif; letter-spacing: 0.06em;
    color: #ffd23f; text-transform: uppercase; }
  #v .sub { margin-top: ${H * 0.025}px; font: 500 ${H * 0.03}px/1.3 "Figtree", sans-serif; color: #dbe9f5; }
  #v .lower { position: absolute; left: ${W * 0.045}px; bottom: ${H * 0.07}px; display: grid; gap: ${H * 0.008}px; }
  #v .count { font: 600 ${H * 0.022}px/1 "JetBrains Mono", monospace; letter-spacing: 0.2em; color: #bfe3ff; }
  #v .vname { font: 800 ${H * 0.11}px/0.9 "Big Shoulders Display", Impact, sans-serif; text-transform: uppercase;
    text-shadow: 0 ${H * 0.006}px ${H * 0.03}px rgba(0,0,0,0.5); }
  #v .kind { font: 500 ${H * 0.028}px/1.2 "Figtree", sans-serif; color: #e7f1f9;
    text-shadow: 0 1px 8px rgba(0,0,0,0.6); }
  #v .chip { justify-self: start; margin-top: ${H * 0.01}px; padding: ${H * 0.008}px ${H * 0.016}px;
    border-radius: 999px; font: 700 ${H * 0.024}px/1 "JetBrains Mono", monospace; letter-spacing: 0.12em; }
  #v .chip.LUNA { background: #ffd23f; color: #1b1300; }
  #v .chip.INDI { background: #5fe0ff; color: #001a22; }
  #v .wipe { position: absolute; top: 0; bottom: 0; width: 140%; left: -20%;
    background: linear-gradient(100deg, transparent 0%, #ff6b3d 12%, #ffd23f 50%, #5fe0ff 88%, transparent 100%); }
</style>
<div id="v">
  <div class="vig"></div>
  <div class="lower" id="v-lower">
    <div class="count" id="v-count"></div>
    <div class="vname" id="v-name"></div>
    <div class="kind" id="v-kind"></div>
    <div class="chip" id="v-chip"></div>
  </div>
  <div class="card" id="v-intro">
    <div class="eyebrow">A Minecraft mod made for</div>
    <div class="names">INDI <span class="amp">&amp;</span> LUNA</div>
    <div class="brand">Vroom! Vehicles</div>
    <div class="sub">20 rides · boats, bikes, cars, trucks and aircraft</div>
  </div>
  <div class="card" id="v-outro">
    <div class="brand">Vroom! Vehicles</div>
    <div class="names" style="font-size:${H * 0.14}px">INDI <span class="amp">&amp;</span> LUNA</div>
    <div class="sub">Coming to your Minecraft world. Find your name on every ride!</div>
  </div>
  <div class="wipe" id="v-wipe"></div>
</div>`;

// Runs inside the page: set up the scene and overlay for time t (seconds).
function director() {
  const g = window.garage;
  const ids = g.ids;
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  const $ = id => document.getElementById(id);
  let current = null;

  function show(id, sky, throttle) {
    if (current === id) return;
    current = id;
    g.setSky(sky);
    g.select(id);
    g.setLook("mc");      // vehicles exactly as Minecraft lights them
    const info = g.info(id);
    g.setThrottle(throttle(info));
    if (info.mode === "air") g.settle(24 + throttle(info) * 110);
    if (info.mode === "seaplane") g.settle((throttle(info) - 0.5) * 260);
    for (let i = 0; i < 24; i++) g.step(1 / 30);   // let the wake and rotors get going
  }

  window.renderAt = ({ t, dt, INTRO, PER, OUTRO }) => {
    const n = ids.length, end = INTRO + n * PER;
    let id, local, span, sky = "day";
    const throttle = info => info.mode === "seaplane" ? 0.8 : info.mode === "air" ? 0.5 : 0.55;
    if (t < INTRO) { id = "speedboat"; local = t; span = INTRO; sky = "sunset"; }
    else if (t < end) {
      const i = Math.floor((t - INTRO) / PER);
      id = ids[i]; local = (t - INTRO) - i * PER; span = PER;
    } else { id = "superyacht"; local = t - end; span = OUTRO; sky = "sunset"; }
    show(id, sky, throttle);

    // camera: a smooth half-orbit from the front quarter, scaled to the vehicle
    const f = g.frame();
    const c = [f.center[0], f.center[1] + f.lift, f.center[2]];
    const wide = t < INTRO || t >= end ? 1.35 : 1;
    const R = (f.reach * 1.6 + 12) * wide;
    const a = Math.atan2(0.75, -0.66) - 0.5 + ease(local / span) * 1.25;
    const eye = [c[0] + R * Math.sin(a), c[1] + f.reach * 0.5 + 8, c[2] + R * Math.cos(a)];
    g.look(eye, c);
    g.step(dt);   // move the world on and render this frame

    // overlay
    const fadeIn = (x, d = 0.5) => ease(x / d);
    $("v-intro").style.opacity = t < INTRO ? Math.min(fadeIn(t - 0.3, 0.8), 1 - ease((t - INTRO + 0.7) / 0.6)) : 0;
    $("v-outro").style.opacity = t >= end ? fadeIn(local - 0.4, 0.8) : 0;
    const inShow = t >= INTRO && t < end;
    const lower = $("v-lower");
    lower.style.opacity = inShow ? Math.min(fadeIn(local - 0.35, 0.35), 1 - ease((local - span + 0.45) / 0.3)) : 0;
    lower.style.transform = `translateX(${(1 - fadeIn(local - 0.35, 0.45)) * -40}px)`;
    if (inShow) {
      const info = g.info(id), i = ids.indexOf(id);
      $("v-count").textContent = `${String(i + 1).padStart(2, "0")} / ${n}`;
      $("v-name").textContent = info.name;
      $("v-kind").textContent = info.kind;
      const who = /LUNA/.test(info.eggs) ? "LUNA" : "INDI";
      $("v-chip").className = `chip ${who}`;
      $("v-chip").textContent = `${who}'S RIDE`;
    }
    // a colour wipe sweeps across at every cut
    const cuts = [INTRO, ...ids.map((_, i) => INTRO + (i + 1) * PER)];
    const near = cuts.map(cut => t - cut).find(d => d > -0.22 && d < 0.22);
    const wipe = $("v-wipe");
    if (near === undefined) wipe.style.opacity = 0;
    else {
      const p = (near + 0.22) / 0.44;
      wipe.style.opacity = 1;
      wipe.style.transform = `translateX(${(p * 2 - 1) * 120}%) skewX(-12deg)`;
    }
    return { id };
  };
}

const JOBS = Number(arg("--jobs", 1));
const PART = arg("--part", null);   // "k/N": this process renders every Nth shot, starting at k

async function render(part) {
  const [k, N] = part ? part.split("/").map(Number) : [0, 1];
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on("pageerror", e => console.error("page error:", e.message));
  await page.addInitScript(() => { window.VIDEO_MODE = true; });
  if (process.env.THREE_JS) await page.route("**/three.min.js", r => r.fulfill({ path: process.env.THREE_JS, contentType: "text/javascript" }));
  if (process.env.ORBIT_JS) await page.route("**/OrbitControls.js", r => r.fulfill({ path: process.env.ORBIT_JS, contentType: "text/javascript" }));
  if (process.env.FONTS_CSS) await page.route("https://fonts.googleapis.com/**", r => r.fulfill({ path: process.env.FONTS_CSS, contentType: "text/css" }));
  await page.goto("file://" + path.join(ROOT, "garage/index.html"));
  await page.waitForFunction(() => window.garage);
  await page.evaluate(html => document.body.insertAdjacentHTML("beforeend", html), OVERLAY);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(`(${director})()`);

  const n = await page.evaluate(() => window.garage.ids.length);
  const total = INTRO + n * PER + OUTRO;
  const count = Math.round(total * FPS);
  // shot 0 is the title, 1..n the vehicles, n+1 the ending
  const shot = t => t < INTRO ? 0 : Math.min(1 + Math.floor((t - INTRO) / PER), n + 1);
  const mine = [...Array(count).keys()].filter(f => shot(f / FPS) % N === k);
  const t0 = Date.now();
  for (const [done, f] of mine.entries()) {
    await page.evaluate(o => window.renderAt(o), { t: f / FPS, dt: 1 / FPS, INTRO, PER, OUTRO });
    await page.screenshot({ path: path.join(FRAMES, `f${String(f).padStart(5, "0")}.jpg`), type: "jpeg", quality: 92 });
    if (done % (FPS * 5) === 0) {
      const per = (Date.now() - t0) / (done + 1);
      console.log(`[${k + 1}/${N}] frame ${done}/${mine.length}  ~${Math.round(per * (mine.length - done) / 1000)}s left`);
    }
  }
  await browser.close();
  return { total, count };
}

function encode(total, count) {
  const music = path.join(require("os").tmpdir(), "vroom-music.wav");
  execFileSync("python3", [path.join(__dirname, "music.py"), music, String(total), String(BEAT)], { stdio: "inherit" });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS),
    "-i", path.join(FRAMES, "f%05d.jpg"), "-i", music,
    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", OUT], { stdio: "inherit" });
  console.log(`wrote ${OUT} (${total.toFixed(1)}s, ${count} frames)`);
}

(async () => {
  if (PART) { await render(PART); return; }
  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });
  if (JOBS <= 1) {
    const { total, count } = await render(null);
    encode(total, count);
    return;
  }
  // render the shots in parallel processes, then encode once
  const { spawn } = require("child_process");
  const self = [__filename, "--size", `${W}x${H}`, "--fps", String(FPS)];
  await Promise.all([...Array(JOBS).keys()].map(k => new Promise((ok, fail) => {
    const p = spawn(process.execPath, [...self, "--part", `${k}/${JOBS}`], { stdio: "inherit" });
    p.on("exit", code => (code === 0 ? ok() : fail(new Error(`part ${k} failed`))));
  })));
  const n = fs.readdirSync(FRAMES).length;
  encode(n / FPS, n);
})();
