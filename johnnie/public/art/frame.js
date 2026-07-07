/* frame.js — the constant, second edition.
   Every piece is presented as a catalog sheet from Johnnie's atelier: a white
   page on a near-black ground, set in Geist Sans, sentence case. The sheet
   carries the header (atelier · practice · date · number), the artwork in its
   slot, the day's subject as a headline, a short prose description, a spec
   table (title / edition / stack / time spent) and ← → navigation.
   The artwork is the only thing that changes; the sheet never does.
   Requires art.js (seed/rng/reseed + isThumb). */
(function () {
  const FRAME = {};

  // mount({ num, edition, subject, title, date, stack, time, desc,
  //         ratio, bleed, dark, noCanvas, onResize })
  //  → { stage, canvas, W, H, DPR, setTone }
  // stage is the artwork slot; onResize(W, H, DPR) fires deferred once at
  // mount, then on every resize. ratio is the slot's width/height (default
  // 3:4 portrait, e.g. 1.6 for landscape); bleed runs it to the sheet edges.
  FRAME.mount = function (o) {
    const thumb = window.ART && ART.isThumb;
    const num = "#" + String(o.num || 0).padStart(3, "0");
    document.title = num + " · " + (o.title || "") + " — johnnie's atelier";
    const fav = document.createElement("link");
    fav.rel = "icon";
    fav.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
      "<circle cx='38' cy='44' r='30' fill='%236cabd6' opacity='.88'/>" +
      "<circle cx='62' cy='56' r='30' fill='%23d5493c' opacity='.72'/></svg>";
    document.head.appendChild(fav);

    const ratio = o.ratio || 0.75;
    const artBg = o.dark ? "#0a0a0c" : "#e9e3d5";

    const css = document.createElement("style");
    css.textContent = `
@font-face{font-family:'Geist';src:url('../lib/fonts/Geist-Variable.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:swap}
@font-face{font-family:'Geist Mono';src:url('../lib/fonts/GeistMono-Variable.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:swap}
@font-face{font-family:'Geist Pixel';src:url('../lib/fonts/GeistPixel-Square.woff2') format('woff2');font-weight:400;font-style:normal;font-display:swap}
html,body{margin:0;background:#0d0a07}
body{min-height:100dvh;display:flex;align-items:flex-start;justify-content:center;
padding:${thumb ? "0" : "clamp(0px, 3.5vw, 52px)"}}
.sheet{position:relative;width:min(100%,960px);background:#f2f1ee;color:#16130f;
container-type:inline-size;border-radius:clamp(0px,3.2vw,36px);
font-family:'Geist',ui-sans-serif,system-ui,sans-serif;font-weight:430;
--pad:clamp(22px,7cqi,68px);padding:clamp(20px,5cqi,48px) var(--pad) clamp(26px,6cqi,56px);
box-shadow:0 30px 80px rgba(0,0,0,.5)}
@media (max-width:700px){body{padding:0}.sheet{border-radius:0;min-height:100dvh;box-shadow:none}}
.top{display:grid;grid-template-columns:1.2fr 1fr auto;gap:12px;
font-size:clamp(11px,1.55cqi,14px);line-height:1.8;letter-spacing:.01em}
.top .r{text-align:right}
.top .lab{font-weight:560;letter-spacing:.045em;text-transform:uppercase}
.top a{color:inherit;text-decoration:none;font-weight:430}
@media (hover:hover) and (pointer:fine){.top a:hover{text-decoration:underline}}
.art{position:relative;margin:clamp(24px,5.5cqi,52px) 0 0;aspect-ratio:${ratio};
background:${artBg};overflow:hidden;
${o.bleed ? "margin-left:calc(-1*var(--pad));margin-right:calc(-1*var(--pad));" : ""}}
.art canvas.art-c{position:absolute;inset:0;width:100%;height:100%;display:block}
.cap{margin:10px 0 0;font-size:clamp(10px,1.3cqi,12px);color:rgba(22,19,15,.55);text-align:right}
h1{font-size:clamp(34px,6.6cqi,64px);font-weight:460;letter-spacing:-0.022em;
line-height:1.08;margin:clamp(30px,7cqi,64px) 0 0;text-wrap:balance}
.desc{font-size:clamp(14px,1.75cqi,16.5px);line-height:1.8;font-weight:430;
color:rgba(22,19,15,.88);max-width:66ch;margin:clamp(16px,3cqi,26px) 0 0}
.desc a{color:inherit}
.specs{margin:clamp(30px,6.5cqi,56px) 0 0;font-size:clamp(12px,1.6cqi,14.5px);
background:#fff;border-radius:clamp(10px,1.8cqi,16px);
padding:clamp(4px,1cqi,8px) clamp(16px,3cqi,26px)}
.specs .row{display:flex;justify-content:space-between;align-items:baseline;
gap:16px;padding:clamp(11px,1.8cqi,15px) 0;
border-bottom:1px solid rgba(22,19,15,.08)}
.specs .row:last-child{border-bottom:0}
.specs .k{font-weight:520;font-size:clamp(10.5px,1.35cqi,12px);letter-spacing:.06em;
text-transform:uppercase;color:rgba(22,19,15,.62)}
.specs .v{text-align:right}
.go{margin:clamp(34px,8cqi,72px) 0 0;display:flex;justify-content:space-between;align-items:center}
.go a{color:inherit;text-decoration:none;font-size:clamp(28px,4.6cqi,42px);
line-height:1;padding:8px 2px;transition:transform 180ms cubic-bezier(0.23,1,0.32,1)}
@media (hover:hover) and (pointer:fine){
.go a.next:hover{transform:translateX(5px)}
.go a.prev:hover{transform:translateX(-5px)}}
.sheet{animation:sheet-in 420ms cubic-bezier(0.23,1,0.32,1)}
@keyframes sheet-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.sheet{animation:sheet-fade 200ms ease}
@keyframes sheet-fade{from{opacity:0}to{opacity:1}}}
${thumb ? `.sheet{padding:0;border-radius:0;min-height:100dvh;box-shadow:none;background:${artBg}}
.top,h1,.desc,.specs,.go,.cap{display:none}
.art{position:absolute;inset:0;margin:0;aspect-ratio:auto}` : ""}`;
    document.head.appendChild(css);

    const sheet = document.createElement("div");
    sheet.className = "sheet";
    const esc = (s) => String(s == null ? "" : s);
    sheet.innerHTML =
      '<header class="top">' +
        '<div><span class="lab">Johnnie’s atelier</span><br><a href="../">← Art</a></div>' +
        '<div><span class="m">Daily Practice</span><br><a href="https://johnnies.life/art" tabindex="-1">johnnies.life/art</a></div>' +
        '<div class="r"><span class="m">' + esc(o.date) + "</span><br>" + num + "</div>" +
      "</header>" +
      '<div class="art"></div>' +
      '<p class="cap">seeded by its date — tap the artwork to reseed</p>' +
      "<h1>" + esc(o.subject || o.title) + "</h1>" +
      (o.desc ? '<p class="desc">' + o.desc + "</p>" : "") +
      '<div class="specs">' +
        '<div class="row"><span class="k">Title</span><span class="v" lang="es">' + esc(o.title) + "</span></div>" +
        '<div class="row"><span class="k">Edition</span><span class="v">' + esc(o.edition) + "</span></div>" +
        '<div class="row"><span class="k">Stack</span><span class="v">' + esc(o.stack) + "</span></div>" +
        '<div class="row"><span class="k">Time spent</span><span class="v">' + esc(o.time) + "</span></div>" +
      "</div>" +
      '<nav class="go" aria-label="pieces"></nav>';
    document.body.appendChild(sheet);

    const stage = sheet.querySelector(".art");
    let canvas = null;
    if (!o.noCanvas) {
      canvas = document.createElement("canvas");
      canvas.className = "art-c";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "generative artwork: " + esc(o.title));
      stage.appendChild(canvas);
    }

    if (!thumb) {
      let lastSwipe = 0;
      stage.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        if (Date.now() - lastSwipe < 500) return;   // a swipe is not a tap
        ART.reseed();
      });
      addEventListener("keydown", (e) => { if (e.key === "r") ART.reseed(); });

      // ← → navigation: the arrows at the sheet's foot, swipe on the artwork,
      // arrow keys anywhere. Production serves extensionless URLs, so match
      // basenames with the extension stripped.
      const base = (p) => p.split("/").pop().replace(/\.html$/, "");
      fetch("../sketches.json")
        .then((r) => r.json())
        .then((d) => {
          // display order: newest date first, reading order within a date
          const list = d.sketches.slice()
            .sort((a, b) => b.date.localeCompare(a.date) || a.n.localeCompare(b.n))
            .map((s) => s.file.split("/").pop());
          const i = list.map(base).indexOf(base(location.pathname));
          if (i < 0 || list.length < 2) return;
          const prev = list[(i - 1 + list.length) % list.length];
          const next = list[(i + 1) % list.length];

          const go = (file, dir) => {
            sheet.style.transition = "transform 180ms ease, opacity 180ms ease";
            sheet.style.transform = "translateX(" + dir * -26 + "px)";
            sheet.style.opacity = "0.55";
            setTimeout(() => { location.href = file; }, 160);
          };
          const nav = sheet.querySelector(".go");
          const mk = (cls, file, glyph, dir) => {
            const a = document.createElement("a");
            a.className = cls;
            a.href = file;
            a.textContent = glyph;
            a.setAttribute("aria-label", cls === "prev" ? "previous piece" : "next piece");
            a.addEventListener("click", (e) => { e.preventDefault(); go(file, dir); });
            nav.appendChild(a);
          };
          mk("prev", prev, "←", -1);
          mk("next", next, "→", 1);

          let sx = 0, sy = 0;
          stage.addEventListener("touchstart", (e) => {
            sx = e.touches[0].clientX; sy = e.touches[0].clientY;
          }, { passive: true });
          stage.addEventListener("touchend", (e) => {
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
    // kept for pieces that change register mid-life; the sheet itself no
    // longer needs re-inking (the facts live on white, not over the art)
    F.setTone = function () {};
    function resize(defer) {
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
