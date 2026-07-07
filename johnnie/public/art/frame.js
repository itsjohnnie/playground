/* frame.js — the constant.
   Every piece lives behind the same fixed layer: a 3:4 portrait stage with a
   6-column × 8-row Swiss grid, set in Geist Mono — mostly uppercase, one
   small size, two weights (regular + a bolder lead). The frame holds the
   facts — number, date, data, tech, author — and never changes. Everything
   creative happens on the canvas behind it. The whole Geist family (Sans,
   Mono, Pixel) is @font-face'd here for pieces to use.
   Requires art.js (seed/rng/reseed + isThumb). */
(function () {
  const FRAME = {};

  // mount({ n, v, of, date, info, data, tech, dark, noCanvas, onResize })
  //  → { stage, canvas, W, H, DPR }
  // onResize(W, H, DPR) fires deferred once at mount, then on every resize.
  FRAME.mount = function (o) {
    const thumb = window.ART && ART.isThumb;
    // ?bare=1 (thumbs only): the artwork alone, no frame overlay —
    // the gallery card's meta row acts as the wall label instead
    const bare = thumb && new URLSearchParams(location.search).get("bare") === "1";
    document.title = o.n + (o.v ? o.v : "") + " · " + (o.title || "") + " — art";
    const fav = document.createElement("link");
    fav.rel = "icon";
    fav.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
      "<circle cx='38' cy='44' r='30' fill='%236cabd6' opacity='.88'/>" +
      "<circle cx='62' cy='56' r='30' fill='%23d5493c' opacity='.72'/></svg>";
    document.head.appendChild(fav);

    const ink = o.dark ? "244,240,229" : "23,21,17";
    const ground = o.dark ? "#0a0a0c" : "#e9e3d5";

    const css = document.createElement("style");
    css.textContent = `
@font-face{font-family:'Geist';src:url('../lib/fonts/Geist-Variable.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:swap}
@font-face{font-family:'Geist Mono';src:url('../lib/fonts/GeistMono-Variable.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:swap}
@font-face{font-family:'Geist Pixel';src:url('../lib/fonts/GeistPixel-Square.woff2') format('woff2');font-weight:400;font-style:normal;font-display:swap}
html,body{margin:0;background:${ground}}
body{min-height:100dvh;display:flex;align-items:center;justify-content:center;
padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
.stage{position:relative;aspect-ratio:3/4;container-type:inline-size;overflow:hidden;
width:${thumb ? "min(100vw, 75vh)" : "min(92dvw, 66dvh, 620px)"};
background:${ground};box-shadow:${o.dark ? "0 0 0 1px rgba(244,240,229,.09)" : "0 1px 2px rgba(23,21,17,.10), 0 14px 44px rgba(23,21,17,.16)"}}
${thumb ? "" : `@media (max-width: 700px){
body{padding:0}
.stage{width:100dvw;height:100dvh;aspect-ratio:auto;box-shadow:none;animation:none}
}`}
.stage canvas.art{position:absolute;inset:0;width:100%;height:100%;display:block}
.frame{--fink:${ink};position:absolute;inset:0;z-index:5;pointer-events:none;transition:--fink .6s ease;
display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(8,1fr);
padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
font-family:'Geist Mono',ui-monospace,Menlo,monospace;font-weight:400;
font-size:clamp(6.5px,1.95cqw,12px);line-height:1.5;letter-spacing:.075em;
color:rgba(var(--fink),.9);text-transform:uppercase}
.frame b{font-weight:640;color:rgba(var(--fink),.97)}
.frame .lc{text-transform:lowercase}
.frame .crumb{pointer-events:auto;color:rgba(var(--fink),.62);text-decoration:none;
font-weight:640;transition:color 150ms ease}
@media (hover:hover) and (pointer:fine){.frame .crumb:hover{color:rgba(var(--fink),.97)}}
.frame .nav{position:absolute;top:50%;transform:translateY(-50%);z-index:6;pointer-events:auto;
padding:18px 12px;color:rgba(var(--fink),.52);text-decoration:none;
font-size:max(16px,3.4cqw);line-height:1;transition:color 150ms ease}
.frame .nav.prev{left:0}
.frame .nav.next{right:0}
@media (hover:hover) and (pointer:fine){.frame .nav:hover{color:rgba(var(--fink),.95)}}
.frame .hair{position:absolute;inset:0;
background:
 repeating-linear-gradient(to right, rgba(var(--fink),.07) 0 1px, transparent 1px calc(100%/6)),
 repeating-linear-gradient(to bottom, rgba(var(--fink),.07) 0 1px, transparent 1px calc(100%/8));
background-position:-1px -1px}
.frame .cell{padding:.65em .8em;position:relative}
.frame .dim{color:rgba(var(--fink),.66)}
.vh{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
clip:rect(0 0 0 0);white-space:nowrap;border:0}
.frame .tl{grid-area:1/1/2/4}
.frame .tr{grid-area:1/5/2/7;text-align:right}
.frame .ml{grid-area:2/1/3/3}
.frame .bl{grid-area:8/1/9/5;align-self:end}
.frame .br{grid-area:8/5/9/7;text-align:right;align-self:end}
.stage{animation:stage-in 400ms cubic-bezier(0.23,1,0.32,1)}
@keyframes stage-in{from{opacity:0;transform:scale(0.985)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.stage{animation:stage-fade 200ms ease}@keyframes stage-fade{from{opacity:0}to{opacity:1}}}`;
    document.head.appendChild(css);

    const stage = document.createElement("div");
    stage.className = "stage";
    document.body.appendChild(stage);

    const plain = (s) => (s || "").replace(/<br\s*\/?>/gi, ", ").replace(/<[^>]+>/g, "");
    const h1 = document.createElement("h1");
    h1.className = "vh";
    h1.textContent = o.n + (o.v ? o.v : "") + " · " + (o.title || "");
    stage.appendChild(h1);

    let canvas = null;
    if (!o.noCanvas) {
      canvas = document.createElement("canvas");
      canvas.className = "art";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label",
        "generative artwork: " + (o.title || o.n) +
        (o.data ? ". " + plain(o.data).toLowerCase() : ""));
      stage.appendChild(canvas);
    }

    // two weights: the lead line of a cell is bolder, the rest regular
    const lead = (s) => {
      if (!s) return "";
      const i = s.indexOf("<br>");
      return i < 0 ? "<b>" + s + "</b>" : "<b>" + s.slice(0, i) + "</b>" + s.slice(i);
    };
    const frame = document.createElement("div");
    frame.className = "frame";
    frame.innerHTML =
      '<div class="hair"></div>' +
      '<div class="cell tl"><b>' + o.n + (o.v ? " — " + o.v : "") + "</b>" +
        (o.title ? '<br><span class="dim" lang="es">' + o.title + "</span>" : "") + "</div>" +
      '<div class="cell tr">' +
        (thumb ? "" : '<a class="crumb" href="../">← art</a><br>') +
        (o.date || "") + "</div>" +
      '<div class="cell ml dim">' +
        (o.info || 'johnnie · daily practice<br><span class="lc">johnnies.life/art</span>') + "</div>" +
      '<div class="cell bl">' + lead(o.data || "") + "</div>" +
      '<div class="cell br dim">' + (o.tech || "") +
        (thumb ? "" : "<br>tap — reseed") + "</div>";
    if (!bare) stage.appendChild(frame);

    if (!thumb) {
      let lastSwipe = 0;
      addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        if (Date.now() - lastSwipe < 500) return;   // a swipe is not a tap
        // reseed only from the interior — the outer ring of grid cells holds
        // the frame's facts and the nav edges; a stray tap there shouldn't
        // discard the day's canonical render
        const r = stage.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        if (x < 1 / 6 || x > 5 / 6 || y < 1 / 8 || y > 7 / 8) return;
        ART.reseed();
      });
      addEventListener("keydown", (e) => { if (e.key === "r") ART.reseed(); });

      // one-by-one navigation: swipe on touch, arrows on keyboards,
      // ‹ › affordances at the frame's edges. Production serves these pages
      // at extensionless URLs, so match basenames with the extension stripped.
      const base = (p) => p.split("/").pop().replace(/\.html$/, "");
      fetch("../sketches.json")
        .then((r) => r.json())
        .then((d) => {
          // display order: newest date first, reading order (a→j) within a date
          const list = d.sketches.slice()
            .sort((a, b) => b.date.localeCompare(a.date) || a.n.localeCompare(b.n))
            .map((s) => s.file.split("/").pop());
          const i = list.map(base).indexOf(base(location.pathname));
          if (i < 0 || list.length < 2) return;
          const prev = list[(i - 1 + list.length) % list.length];
          const next = list[(i + 1) % list.length];

          const go = (file, dir) => {
            stage.style.transition = "transform 180ms ease, opacity 180ms ease";
            stage.style.transform = "translateX(" + dir * -26 + "px)";
            stage.style.opacity = "0.5";
            setTimeout(() => { location.href = file; }, 160);
          };
          const mk = (cls, file, glyph, dir) => {
            const a = document.createElement("a");
            a.className = "nav " + cls;
            a.href = file;
            a.textContent = glyph;
            a.setAttribute("aria-label", cls === "prev" ? "previous piece" : "next piece");
            a.addEventListener("click", (e) => { e.preventDefault(); go(file, dir); });
            frame.appendChild(a);
          };
          mk("prev", prev, "‹", -1);
          mk("next", next, "›", 1);

          let sx = 0, sy = 0;
          addEventListener("touchstart", (e) => {
            sx = e.touches[0].clientX; sy = e.touches[0].clientY;
          }, { passive: true });
          addEventListener("touchend", (e) => {
            const t = e.changedTouches[0];
            const dx = t.clientX - sx, dy = t.clientY - sy;
            if (Math.abs(dx) > 60 && Math.abs(dx) > 1.8 * Math.abs(dy)) {
              lastSwipe = Date.now();
              dx < 0 ? go(next, 1) : go(prev, -1);
            }
          }, { passive: true });
          addEventListener("keydown", (e) => {
            if (e.key === "ArrowRight") go(next, 1);
            if (e.key === "ArrowLeft") go(prev, -1);
          });
        })
        // loud on purpose: a silent catch here once shipped a dead nav
        .catch((e) => console.warn("frame: piece navigation unavailable —", e));
    }

    const F = { stage, canvas, W: 0, H: 0, DPR: 1 };
    // for pieces that change register mid-life (e.g. night falls at the end):
    // re-inks the frame so the constant stays legible over the new ground
    F.setTone = (dark) =>
      frame.style.setProperty("--fink", dark ? "244,240,229" : "23,21,17");
    function resize(defer) {
      // offsetWidth: layout size, immune to the entrance-scale transform
      F.DPR = Math.min(devicePixelRatio || 1, 2);
      F.W = Math.round(stage.offsetWidth * F.DPR);
      F.H = Math.round(stage.offsetHeight * F.DPR);
      if (canvas) { canvas.width = F.W; canvas.height = F.H; }
      if (!o.onResize) return;
      const run = () => o.onResize(F.W, F.H, F.DPR);
      defer ? queueMicrotask(run) : run();
    }
    addEventListener("resize", () => resize(false));
    resize(true);
    return F;
  };

  window.FRAME = FRAME;
})();
