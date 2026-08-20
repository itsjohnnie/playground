/* Orchestration: scroll drives the descent through the loupe, the pointer
   slides the page under the glass (the loupe itself never moves), time adds
   hand tremor and focus breathing. */

(() => {
  const html = document.documentElement;
  const intro = document.getElementById("intro");
  const track = document.getElementById("intro-track");
  const canvas = document.getElementById("lens-canvas");
  const skipBtn = document.getElementById("intro-skip");

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- helpers ----------
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  // ---------- specimen section (always) ----------
  const specimen = document.querySelector(".specimen");
  const buildMeadow = () => window.Meadow.build(specimen);

  // hidden/prerendered tabs can report a 0x0 viewport; wait for a real one
  function whenViewportReady(fn) {
    if (window.innerWidth > 0 && window.innerHeight > 0) { fn(); return; }
    const iv = setInterval(() => {
      if (window.innerWidth > 0 && window.innerHeight > 0) { clearInterval(iv); fn(); }
    }, 150);
  }

  whenViewportReady(buildMeadow);

  // ---------- intro feasibility ----------
  function disableIntro() {
    html.classList.add("no-intro");
    if (!location.hash) window.scrollTo(0, 0);
  }

  const flat = location.search.indexOf("flat") !== -1;
  if (flat || reduced || !window.WebGLRenderingContext) {
    disableIntro();
    wireResize(false);
    return;
  }

  let glOk = false;
  try {
    glOk = window.Lens.init(canvas);
  } catch (e) {
    glOk = false;
  }
  if (!glOk) {
    disableIntro();
    wireResize(false);
    return;
  }

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  // ---------- state ----------
  let vw = 0, vh = 0, dpr = 1;
  let lensCX = 0, lensCY = 0, r0 = 0, coverR = 0;
  let texReady = false;
  let texW = 0, texH = 0;
  let headline = { x: 0, y: 0 };
  let enterT0 = 0;

  let pointerX = 0.0, pointerY = 0.0;       // normalized -1..1 target
  let panX = 0, panY = 0;                   // smoothed
  let touchPanX = 0, touchPanY = 0;         // accumulated touch drag, css px
  let lastInteract = -10;
  let released = false;
  let tweening = null;

  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    lensCX = vw / 2;
    lensCY = vh * 0.47;
    r0 = clamp(Math.min(vw, vh) * 0.34, 148, 360);
    const dx = Math.max(lensCX, vw - lensCX);
    const dy = Math.max(lensCY, vh - lensCY);
    coverR = Math.hypot(dx, dy) + 60;
    window.Lens.resize(dpr);

    const cap = document.getElementById("hero-capture");
    const head = document.getElementById("hero-headline");
    const cr = cap.getBoundingClientRect();
    const hr = head.getBoundingClientRect();
    headline.x = hr.left + hr.width / 2 - cr.left;
    headline.y = hr.top + hr.height * 0.62 - cr.top;
  }

  let capTries = 0;
  async function captureTexture() {
    try {
      const snap = await window.Snapshot.capture();
      if (!snap.canvas.width || !snap.canvas.height) throw new Error("empty snapshot");
      texW = snap.cssWidth;
      texH = snap.cssHeight;
      window.Lens.setTexture(snap.canvas, texW, texH);
      capTries = 0;
      if (!texReady) {
        texReady = true;
        enterT0 = performance.now() / 1000;
      }
    } catch (e) {
      // a tainted canvas (e.g. Safari's foreignObject quirks) will never recover
      if (e && e.name === "SecurityError") {
        disableIntro();
        return;
      }
      if (++capTries < 40) {
        setTimeout(captureTexture, 400);
      } else {
        console.error("snapshot failed", e);
        disableIntro();
      }
    }
  }

  whenViewportReady(() => {
    measure();
    captureTexture();
  });

  // ---------- input ----------
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    pointerX = clamp(((e.clientX - lensCX) / vw) * 2, -1, 1);
    pointerY = clamp(((e.clientY - lensCY) / vh) * 2, -1, 1);
    lastInteract = performance.now() / 1000;
  }, { passive: true });

  let lastTouch = null;
  window.addEventListener("touchstart", (e) => {
    lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (!lastTouch) return;
    const t = e.touches[0];
    touchPanX = clamp(touchPanX - (t.clientX - lastTouch.x) * 1.2, -700, 700);
    touchPanY = clamp(touchPanY - (t.clientY - lastTouch.y) * 1.2, -700, 700);
    lastTouch = { x: t.clientX, y: t.clientY };
    lastInteract = performance.now() / 1000;
  }, { passive: true });

  skipBtn.addEventListener("click", () => {
    const start = window.scrollY;
    const end = track.offsetHeight - vh;
    const t0 = performance.now();
    const dur = 1100;
    tweening = (now) => {
      const t = clamp((now - t0) / dur, 0, 1);
      window.scrollTo(0, lerp(start, end, easeInOutCubic(t)));
      if (t >= 1) tweening = null;
    };
  });
  window.addEventListener("wheel", () => { tweening = null; }, { passive: true });

  // ---------- resize ----------
  function wireResize(withIntro) {
    let raf = null;
    let snapTimer = null;
    window.addEventListener("resize", () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        if (!window.innerWidth || !window.innerHeight) return;
        buildMeadow();
        if (withIntro) {
          measure();
          clearTimeout(snapTimer);
          snapTimer = setTimeout(captureTexture, 350);
        }
      });
    });
  }
  wireResize(true);

  // ---------- frame loop ----------
  function frame(nowMs) {
    requestAnimationFrame(frame);
    if (tweening) tweening(nowMs);
    step(nowMs, null);
  }

  function step(nowMs, over) {
    const t = over && over.t != null ? over.t : nowMs / 1000;
    const denom = Math.max(1, track.offsetHeight - vh);
    let p = clamp(window.scrollY / denom, 0, 1);
    if (over && over.p != null) p = over.p;

    // release / re-arm the overlay
    if (p > 0.995 && !released) { released = true; intro.classList.add("released"); }
    if (p < 0.99 && released) { released = false; intro.classList.remove("released"); }

    const setVar = (n, v) => intro.style.setProperty(n, v);

    // HUD + fades are cheap, keep them updated even when released
    let enter = texReady ? easeOutCubic(clamp((t - enterT0) / 1.5, 0, 1)) : 0;
    if (over && over.enter != null) enter = over.enter;
    const revP = easeInOutCubic(smooth(0.60, 0.97, p));
    const preP = easeInOutCubic(clamp(p / 0.60, 0, 1));

    setVar("--hud-op", texReady && p < 0.04 ? 1 : 0);
    setVar("--intro-op", (1 - smooth(0.975, 1.0, p)).toFixed(4));
    setVar("--glass-op", ((1 - smooth(0.68, 0.88, p)) * enter).toFixed(4));

    if (released || !texReady) return;

    // geometry
    const radiusCss = lerp(r0 * (1 + 0.16 * preP), coverR, revP);
    setVar("--lx", lensCX.toFixed(1));
    setVar("--ly", lensCY.toFixed(1));
    setVar("--lr", radiusCss.toFixed(1));

    // pointer pan, idle drift, hand tremor (all in css px of the page)
    const idle = smooth(2.5, 5.5, t - lastInteract);
    const driftX = (Math.sin(t * 0.11) * 0.55 + Math.sin(t * 0.043 + 2.0) * 0.45) * 0.38;
    const driftY = (Math.cos(t * 0.09 + 1.0) * 0.6 + Math.sin(t * 0.061) * 0.4) * 0.38;
    const targetNX = lerp(pointerX, driftX, idle);
    const targetNY = lerp(pointerY, driftY, idle);
    panX = lerp(panX, targetNX, 0.055);
    panY = lerp(panY, targetNY, 0.055);
    if (over && over.panX != null) { panX = over.panX; panY = over.panY || 0; }

    const panRangeX = Math.min(texW * 0.30, 480);
    const panRangeY = Math.min(texH * 0.32, 460);

    const tremorOn = 1 - revP;
    const tremX = (Math.sin(t * 1.7) * 0.6 + Math.sin(t * 3.1 + 1.3) * 0.3 + Math.sin(t * 13.7) * 0.1) * 1.5 * tremorOn;
    const tremY = (Math.cos(t * 1.4) * 0.6 + Math.sin(t * 2.7 + 0.5) * 0.3 + Math.cos(t * 11.9) * 0.1) * 1.5 * tremorOn;

    let offX = headline.x - lensCX + panX * panRangeX + touchPanX + tremX;
    let offY = headline.y - lensCY + panY * panRangeY + touchPanY + tremY;
    // keep the glass interior on the paper — seeing past its edge reads as a crop
    const reach = radiusCss * 0.8;
    const minX = -lensCX + reach - 20, maxX = texW - lensCX - reach + 20;
    const minY = -lensCY + reach - 20, maxY = texH - lensCY - reach + 20;
    offX = minX < maxX ? clamp(offX, minX, maxX) : (minX + maxX) / 2;
    offY = minY < maxY ? clamp(offY, minY, maxY) : (minY + maxY) / 2;
    // the paper glides home during the reveal so the page lands 1:1
    offX *= 1 - revP;
    offY *= 1 - revP;

    // optics
    const breathe = Math.sin(t * 0.8) * (1 - revP);
    const magHi = vw < 640 ? 1.3 : 1.72;
    const magLo = vw < 640 ? 1.22 : 1.56;
    const mag = lerp(lerp(magHi, magLo, preP), 1.0, revP) * (1 + 0.004 * breathe) * lerp(1.14, 1, enter);
    const k1 = 0.22 * (1 - revP);
    const k2 = 0.45 * (1 - revP);
    const ca = 0.02 * (1 - revP);
    const blur = (2.7 + 0.5 * Math.sin(t * 0.53)) * (1 - revP) + (1 - enter) * 9;
    const edge = 1 - revP;
    const fall = 1 - revP;
    const grain = 0.032 * (1 - revP) + 0.006;
    const flat = smooth(0.9, 0.985, p);

    // specular drifts a touch with the pointer (reflection, not content)
    setVar("--specx", (panX * 7).toFixed(2));
    setVar("--specy", (panY * 5).toFixed(2));

    window.Lens.render({
      cx: lensCX * dpr,
      cy: lensCY * dpr,
      radius: radiusCss * dpr,
      mag, k1, k2, ca,
      blur: blur * dpr,
      edge, fall, grain,
      time: t,
      dpr,
      offsetX: offX * (1),
      offsetY: offY * (1),
      flat,
      fade: enter,
    });
  }

  requestAnimationFrame(frame);

  // manual state driver for headless verification (?debug)
  if (location.search.indexOf("debug") !== -1) {
    window.__lensDebug = async (over) => {
      if (!texReady && window.innerWidth > 0) {
        measure();
        const snap = await window.Snapshot.capture();
        window.Lens.setTexture(snap.canvas, snap.cssWidth, snap.cssHeight);
        texW = snap.cssWidth;
        texH = snap.cssHeight;
        texReady = true;
        enterT0 = performance.now() / 1000 - 10;
        buildMeadow();
      }
      released = false;
      intro.classList.remove("released");
      step(performance.now(), over || {});
      return { texReady, vw, vh, texW, texH };
    };
  }
})();
