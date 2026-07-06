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
    document.title = o.n + (o.v ? o.v : "") + " · " + (o.title || "") + " — art";
    const fav = document.createElement("link");
    fav.rel = "icon";
    fav.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
      "<circle cx='38' cy='44' r='30' fill='%23f5578c' opacity='.85'/>" +
      "<circle cx='62' cy='56' r='30' fill='%232a49b9' opacity='.75'/></svg>";
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
.stage canvas.art{position:absolute;inset:0;width:100%;height:100%;display:block}
.frame{position:absolute;inset:0;z-index:5;pointer-events:none;
display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(8,1fr);
font-family:'Geist Mono',ui-monospace,Menlo,monospace;font-weight:400;
font-size:clamp(6.5px,1.95cqw,12px);line-height:1.5;letter-spacing:.075em;
color:rgba(${ink},.9);text-transform:uppercase}
.frame b{font-weight:640;color:rgba(${ink},.97)}
.frame .lc{text-transform:lowercase}
.frame .hair{position:absolute;inset:0;
background:
 repeating-linear-gradient(to right, rgba(${ink},.07) 0 1px, transparent 1px calc(100%/6)),
 repeating-linear-gradient(to bottom, rgba(${ink},.07) 0 1px, transparent 1px calc(100%/8));
background-position:-1px -1px}
.frame .cell{padding:.65em .8em;position:relative}
.frame .dim{color:rgba(${ink},.48)}
.frame .tl{grid-area:1/1/2/4}
.frame .tr{grid-area:1/5/2/7;text-align:right}
.frame .ml{grid-area:2/1/3/3}
.frame .bl{grid-area:8/1/9/5;align-self:end}
.frame .br{grid-area:8/5/9/7;text-align:right;align-self:end}
.art-back{position:fixed;left:max(16px,env(safe-area-inset-left));top:max(14px,env(safe-area-inset-top));z-index:9;
font-family:'Geist Mono',ui-monospace,Menlo,monospace;font-size:12px;letter-spacing:.05em;
color:rgba(${o.dark ? "244,240,229" : "23,21,17"},.5);text-decoration:none;padding:8px;margin:-8px;display:inline-block;
transition:color 150ms ease,transform 160ms cubic-bezier(0.23,1,0.32,1)}
@media (hover:hover) and (pointer:fine){.art-back:hover{color:rgba(${ink},.95)}}
.art-back:active{transform:scale(0.96)}
.stage{animation:stage-in 400ms cubic-bezier(0.23,1,0.32,1)}
@keyframes stage-in{from{opacity:0;transform:scale(0.985)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.stage{animation:stage-fade 200ms ease}@keyframes stage-fade{from{opacity:0}to{opacity:1}}.art-back:active{transform:none}}`;
    document.head.appendChild(css);

    const stage = document.createElement("div");
    stage.className = "stage";
    document.body.appendChild(stage);

    let canvas = null;
    if (!o.noCanvas) {
      canvas = document.createElement("canvas");
      canvas.className = "art";
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
        (o.title ? '<br><span class="dim">' + o.title + "</span>" : "") + "</div>" +
      '<div class="cell tr">' + (o.date || "") + "</div>" +
      '<div class="cell ml dim">' +
        (o.info || 'johnnie · daily practice<br><span class="lc">johnnies.life/art</span>') + "</div>" +
      '<div class="cell bl">' + lead(o.data || "") + "</div>" +
      '<div class="cell br dim">' + (o.tech || "") + "</div>";
    stage.appendChild(frame);

    if (!thumb) {
      const back = document.createElement("a");
      back.className = "art-back";
      back.href = "../";
      back.textContent = "← art";
      document.body.appendChild(back);
      addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        ART.reseed();
      });
      addEventListener("keydown", (e) => { if (e.key === "r") ART.reseed(); });
    }

    const F = { stage, canvas, W: 0, H: 0, DPR: 1 };
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
