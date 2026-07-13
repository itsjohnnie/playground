/* art.js — tiny shared kit for the daily sketches.
   Keeps every sketch focused on the art: canvas fitting, seeded randomness,
   noise, WebGL boilerplate, and the caption chrome all live here. */
(function () {
  const ART = {};

  /* ---------------- seeded randomness ---------------- */

  // xmur3 string hash → 32-bit seed
  function hashString(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }

  // mulberry32 PRNG
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  ART.hashString = hashString;
  ART.rng = (seed) => mulberry32(typeof seed === "string" ? hashString(seed) : seed >>> 0);

  // Seed comes from ?seed=...; falls back to the given default (usually the
  // sketch date) so the default view of each piece is deterministic.
  ART.seed = function (fallback) {
    const q = new URLSearchParams(location.search).get("seed");
    return q || fallback || "0";
  };

  ART.reseed = function () {
    const s = Math.random().toString(36).slice(2, 8);
    const url = new URL(location.href);
    url.searchParams.set("seed", s);
    location.href = url.toString();
  };

  /* ---------------- value noise + fbm (2D/3D) ---------------- */

  ART.makeNoise = function (seed) {
    const r = ART.rng(seed || 1);
    const P = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (r() * (i + 1)) | 0;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (let i = 0; i < 512; i++) P[i] = p[i & 255];
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);
    const grad = (h, x, y, z) => {
      const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    };
    // classic Perlin 3D, returns roughly [-1, 1]
    function noise3(x, y, z) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
      x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
      const u = fade(x), v = fade(y), w = fade(z);
      const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z;
      const B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
      return lerp(
        lerp(
          lerp(grad(P[AA] & 15, x, y, z), grad(P[BA] & 15, x - 1, y, z), u),
          lerp(grad(P[AB] & 15, x, y - 1, z), grad(P[BB] & 15, x - 1, y - 1, z), u), v),
        lerp(
          lerp(grad(P[AA + 1] & 15, x, y, z - 1), grad(P[BA + 1] & 15, x - 1, y, z - 1), u),
          lerp(grad(P[AB + 1] & 15, x, y - 1, z - 1), grad(P[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
    }
    function fbm3(x, y, z, oct) {
      let a = 0.5, f = 1, s = 0;
      for (let i = 0; i < (oct || 4); i++) { s += a * noise3(x * f, y * f, z * f); a *= 0.5; f *= 2; }
      return s;
    }
    return { noise3, fbm3, noise2: (x, y) => noise3(x, y, 0), fbm2: (x, y, o) => fbm3(x, y, 0, o) };
  };

  /* ---------------- canvas fitting ---------------- */

  // The composition always sits in the middle: a square stage, sized
  // mobile-first (nearly full width on a phone, capped and centered on
  // desktop). With ?thumb=1 the stage fills the whole viewport — used by
  // the gallery's preview iframes.
  ART.isThumb = new URLSearchParams(location.search).has("thumb");

  // a prerendered page (speculation rules) runs its script fully while
  // hidden — an arrival clock started at script-load time can finish
  // before the page is ever shown, so a piece lands "already settled."
  // Defer any one-shot arrival trigger through this until the page is
  // genuinely visible. Browsers without prerendering just call fn() now.
  ART.whenVisible = function (fn) {
    if (!document.prerendering) { fn(); return; }
    document.addEventListener("prerenderingchange", fn, { once: true });
  };

  ART.fit = function (canvas, onResize) {
    function resize(defer) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const frac = ART.isThumb ? 1 : 0.92;
      const cap = ART.isThumb ? 1e9 : 720;
      const css = Math.round(Math.min(Math.min(innerWidth, innerHeight) * frac, cap));
      canvas.width = canvas.height = Math.round(css * dpr);
      canvas.style.width = canvas.style.height = css + "px";
      if (!onResize) return;
      const run = () => onResize(canvas.width, canvas.height, dpr);
      // The first call happens while the sketch's own consts are still being
      // declared — defer it a microtask (still lands before the first rAF).
      defer ? queueMicrotask(run) : run();
    }
    addEventListener("resize", () => resize(false));
    resize(true);
    return canvas;
  };

  /* ---------------- WebGL boilerplate ---------------- */

  // Fullscreen-quad fragment shader runner. Provides u_res, u_time, u_seed.
  ART.shader = function (canvas, fragSrc, extraUniforms) {
    const gl = canvas.getContext("webgl", { antialias: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error("webgl unavailable");
    const vs = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {
      res: gl.getUniformLocation(prog, "u_res"),
      time: gl.getUniformLocation(prog, "u_time"),
      seed: gl.getUniformLocation(prog, "u_seed"),
    };
    const extra = {};
    (extraUniforms || []).forEach((n) => (extra[n] = gl.getUniformLocation(prog, n)));
    return {
      gl, prog, extra,
      draw(time, seedFloat) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(U.res, canvas.width, canvas.height);
        gl.uniform1f(U.time, time);
        gl.uniform1f(U.seed, seedFloat);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
    };
  };

  /* ---------------- caption chrome ---------------- */

  // Injects the standard chrome: the centered stage layout, number/title/date
  // caption under the piece, back link, tap-to-reseed. Pass {n, title, date,
  // dark} — dark flips the ground and text for pieces that live on black.
  // In ?thumb=1 mode only the layout is applied (no caption, no links).
  ART.chrome = function (opts) {
    document.title = opts.n + " · " + opts.title + " — art";
    const fav = document.createElement("link");
    fav.rel = "icon";
    fav.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
      "<circle cx='38' cy='44' r='30' fill='%23f5578c' opacity='.85'/>" +
      "<circle cx='62' cy='56' r='30' fill='%232a49b9' opacity='.75'/></svg>";
    document.head.appendChild(fav);
    const ground = opts.dark ? "#0b0b0e" : "#eae4d6";
    const c = opts.dark ? "rgba(255,255,255,.5)" : "rgba(20,18,14,.5)";
    const ch = opts.dark ? "rgba(255,255,255,.9)" : "rgba(20,18,14,.9)";
    const frame = opts.dark
      ? "0 0 0 1px rgba(255,255,255,.08)"
      : "0 1px 2px rgba(23,21,18,.10), 0 12px 40px rgba(23,21,18,.14), 0 0 0 1px rgba(23,21,18,.05)";
    const css = document.createElement("style");
    css.textContent =
      "html,body{margin:0;background:" + ground + "}" +
      "body{min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}" +
      "canvas{display:block;box-shadow:" + (ART.isThumb ? "none" : frame) + "}" +
      ".art-chrome{margin-top:16px;text-align:center;font:11px/1.7 ui-monospace,'SF Mono',Menlo,monospace;" +
      "letter-spacing:.08em;color:" + c + ";user-select:none;-webkit-user-select:none;text-transform:lowercase}" +
      ".art-chrome b{font-weight:400;color:" + ch + "}" +
      ".art-back{position:fixed;left:max(20px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));z-index:9;" +
      "font:12px/1 ui-monospace,'SF Mono',Menlo,monospace;letter-spacing:.08em;color:" + c + ";" +
      "text-decoration:none;padding:8px;margin:-8px;transition:color .2s}" +
      ".art-back:hover{color:" + ch + "}";
    document.head.appendChild(css);
    if (ART.isThumb) return;
    const cap = document.createElement("div");
    cap.className = "art-chrome";
    cap.innerHTML = "<b>" + opts.n + " · " + opts.title + "</b><br>" + opts.date + " · tap to reseed";
    document.body.appendChild(cap);
    const back = document.createElement("a");
    back.className = "art-back";
    back.href = "./";
    back.textContent = "← art";
    document.body.appendChild(back);
    addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      ART.reseed();
    });
    addEventListener("keydown", (e) => { if (e.key === "r") ART.reseed(); });
  };

  window.ART = ART;
})();
