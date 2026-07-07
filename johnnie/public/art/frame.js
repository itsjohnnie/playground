/* frame.js — the constant, third edition (from Johnnie's mocks).
   The atelier: a near-black room. On desktop, a white data panel sits on the
   LEFT — header, the day's subject as a headline, wall-label prose, a spec
   card, ← → navigation — and the ARTWORK hangs on the RIGHT, spotlit on the
   dark ground at its own aspect ratio. On phones the artwork IS the screen,
   full bleed, and the panel opens as a smooth sheet-modal from a small pill.
   Set in Geist Sans, sentence case. The artwork is the only thing that
   changes; the room and the panel never do.
   Requires art.js (seed/rng/reseed + isThumb). */
(function () {
  const FRAME = {};

  // mount({ num, edition, subject, title, date, stack, time, desc,
  //         ratio, bleed, open, dark, noCanvas, onResize })
  //  → { stage, canvas, W, H, DPR, setTone }
  // stage is the artwork surface. ratio = width/height of the artwork on
  // desktop (0.75 default; 1.6 landscape; bleed fills the whole art region).
  // open: the artwork sits directly on the room — no box: the surface is
  // transparent and fills the region; the piece grounds itself in the room's
  // #0d0a07 (or draws with alpha). On ≤820px the artwork is always
  // full-screen. onResize(W, H, DPR) fires deferred once at mount, then on
  // every resize.
  FRAME.mount = function (o) {
    const thumb = window.ART && ART.isThumb;
    const num = "#" + String(o.num || 0).padStart(3, "0");
    document.title = num + " · " + (o.title || "") + " — johnnie’s atelier";
    const fav = document.createElement("link");
    fav.rel = "icon";
    fav.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
      "<circle cx='38' cy='44' r='30' fill='%236cabd6' opacity='.88'/>" +
      "<circle cx='62' cy='56' r='30' fill='%23d5493c' opacity='.72'/></svg>";
    document.head.appendChild(fav);

    const ratio = o.ratio || 0.75;
    const artBg = o.open ? "transparent" : (o.dark ? "#0a0a0c" : "#e9e3d5");
    const dot = " · ";
    const date = (o.date || "").split("·").join(dot); // 06·07·2026 → spaced dots

    const css = document.createElement("style");
    css.textContent = `
@font-face{font-family:'Geist';src:url('../lib/fonts/Geist-Variable.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:swap}
@font-face{font-family:'Geist Mono';src:url('../lib/fonts/GeistMono-Variable.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:swap}
@font-face{font-family:'Geist Pixel';src:url('../lib/fonts/GeistPixel-Square.woff2') format('woff2');font-weight:400;font-style:normal;font-display:swap}
html,body{margin:0;background:#0d0a07;height:100%}
body{height:100dvh;overflow:hidden;box-sizing:border-box;
font-family:'Geist',ui-sans-serif,system-ui,sans-serif;font-weight:430;
padding:clamp(14px,2.4vw,34px);display:grid;column-gap:clamp(14px,2.4vw,34px);
grid-template-columns:clamp(380px,42vw,600px) 1fr}
.panel{position:relative;background:#f2f1ee;color:#16130f;overflow:auto;
border-radius:clamp(22px,2.8vw,40px);container-type:inline-size;
padding:clamp(26px,5.5cqi,44px) clamp(26px,6cqi,48px);
display:flex;flex-direction:column;scrollbar-width:thin}
.top{display:grid;grid-template-columns:1.15fr 1fr auto;gap:12px;
font-size:clamp(11.5px,2.7cqi,13.5px);line-height:1.8;letter-spacing:.01em}
.top .lab{font-weight:560;letter-spacing:.045em;text-transform:uppercase}
.top a{color:inherit;text-decoration:none}
@media (hover:hover) and (pointer:fine){.top a:hover{text-decoration:underline}}
.mid{margin:auto 0;padding:clamp(26px,7cqi,56px) 0}
h1{font-size:clamp(32px,9cqi,58px);font-weight:460;letter-spacing:-0.022em;
line-height:1.1;margin:0;text-wrap:balance}
.desc{font-size:clamp(13.5px,3.1cqi,16px);line-height:1.75;font-weight:430;
color:rgba(22,19,15,.88);max-width:60ch;margin:clamp(14px,3.5cqi,24px) 0 0}
.desc a{color:inherit}
.specs{margin:clamp(24px,6cqi,44px) 0 0;font-size:clamp(12px,2.9cqi,14px);
background:#fff;border-radius:clamp(10px,2.6cqi,16px);
padding:clamp(4px,1.4cqi,8px) clamp(16px,4.4cqi,26px);
box-shadow:0 1px 2px rgba(22,19,15,.04)}
.specs .row{display:flex;justify-content:space-between;align-items:baseline;
gap:16px;padding:clamp(11px,2.8cqi,15px) 0;border-bottom:1px solid rgba(22,19,15,.08)}
.specs .row:last-child{border-bottom:0}
.specs .k{font-weight:520;font-size:clamp(10.5px,2.5cqi,12px);letter-spacing:.06em;
text-transform:uppercase;color:rgba(22,19,15,.62)}
.specs .v{text-align:right}
.cap{margin:clamp(12px,3cqi,18px) 0 0;font-size:clamp(10.5px,2.5cqi,12px);
color:rgba(22,19,15,.5)}
.go{margin-top:clamp(22px,6cqi,40px);display:flex;justify-content:space-between;align-items:center}
.go a{color:inherit;text-decoration:none;font-size:clamp(26px,7cqi,38px);
line-height:1;padding:6px 2px;transition:transform 180ms cubic-bezier(0.23,1,0.32,1)}
@media (hover:hover) and (pointer:fine){
.go a.next:hover{transform:translateX(5px)}
.go a.prev:hover{transform:translateX(-5px)}}
.room{position:relative;display:flex;align-items:center;justify-content:center;min-width:0}
.art{position:relative;background:${artBg};overflow:hidden}
.art canvas.art-c{position:absolute;inset:0;width:100%;height:100%;display:block}
.scrim,.pill,.x{display:none}
.panel{animation:panel-in 420ms cubic-bezier(0.23,1,0.32,1)}
@keyframes panel-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.panel{animation:panel-fade 200ms ease}
@keyframes panel-fade{from{opacity:0}to{opacity:1}}}

@media (max-width:820px){
body{display:block;padding:0}
.room{position:fixed;inset:0}
.art{position:absolute;inset:0}
.pill{display:flex;align-items:center;gap:8px;position:fixed;z-index:12;
left:50%;transform:translateX(-50%);
bottom:calc(14px + env(safe-area-inset-bottom));
background:rgba(13,10,7,.55);color:#f2ece1;border:1px solid rgba(242,236,225,.16);
backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
border-radius:999px;padding:10px 18px;font:inherit;font-size:13px;cursor:pointer;
transition:transform 200ms cubic-bezier(0.23,1,0.32,1),opacity 200ms}
.pill:active{transform:translateX(-50%) scale(0.96)}
.scrim{display:block;position:fixed;inset:0;z-index:14;background:rgba(5,3,2,.45);
opacity:0;pointer-events:none;transition:opacity 320ms ease}
.panel{position:fixed;z-index:15;left:10px;right:10px;
top:max(10px,env(safe-area-inset-top));
bottom:max(10px,env(safe-area-inset-bottom));
margin:0;border-radius:26px;animation:none;padding-top:64px;
box-shadow:0 30px 80px rgba(0,0,0,.6);
transform:translateY(103%);opacity:0;pointer-events:none;
transition:transform 460ms cubic-bezier(0.32,0.72,0,1),opacity 320ms ease}
body.open .panel{transform:none;opacity:1;pointer-events:auto}
body.open .scrim{opacity:1;pointer-events:auto}
body.open .pill{opacity:0;pointer-events:none}
.x{display:flex;align-items:center;justify-content:center;position:absolute;
top:14px;right:14px;width:36px;height:36px;border-radius:999px;cursor:pointer;
background:rgba(22,19,15,.06);border:0;color:#16130f;font:inherit;font-size:16px}
@media (prefers-reduced-motion:reduce){.panel{transition:opacity 200ms ease}}
}
${thumb ? `body{display:block;padding:0}
.panel,.pill,.scrim{display:none!important}
.room{position:fixed;inset:0}
.art{position:absolute;inset:0;margin:0}` : ""}`;
    document.head.appendChild(css);

    const esc = (s) => String(s == null ? "" : s);
    const panel = document.createElement("aside");
    panel.className = "panel";
    panel.setAttribute("aria-label", "about this piece");
    panel.innerHTML =
      '<header class="top">' +
        '<div><span class="lab">Johnnie’s atelier</span><br><a href="../">← Art</a></div>' +
        '<div><span class="m">Daily Practice</span><br>' + date + "</div>" +
        '<div><a href="https://johnnies.life/art" tabindex="-1">johnnies.life/art</a><br>' + num + "</div>" +
      "</header>" +
      '<div class="mid">' +
        "<h1>" + esc(o.subject || o.title) + "</h1>" +
        (o.desc ? '<p class="desc">' + o.desc + "</p>" : "") +
        '<div class="specs">' +
          '<div class="row"><span class="k">Title</span><span class="v" lang="es">' + esc(o.title) + "</span></div>" +
          '<div class="row"><span class="k">Edition</span><span class="v">' + esc(o.edition) + "</span></div>" +
          '<div class="row"><span class="k">Stack</span><span class="v">' + esc(o.stack) + "</span></div>" +
          '<div class="row"><span class="k">Time spent</span><span class="v">' + esc(o.time) + "</span></div>" +
        "</div>" +
        '<p class="cap">seeded by its date</p>' +
      "</div>" +
      '<nav class="go" aria-label="pieces"></nav>' +
      '<button class="x" aria-label="close">✕</button>';

    const room = document.createElement("div");
    room.className = "room";
    const stage = document.createElement("div");
    stage.className = "art";
    room.appendChild(stage);

    const scrim = document.createElement("div");
    scrim.className = "scrim";
    const pill = document.createElement("button");
    pill.className = "pill";
    pill.innerHTML = num + dot + esc(o.title);
    pill.setAttribute("aria-label", "about this piece");

    document.body.appendChild(panel);
    document.body.appendChild(room);
    if (!thumb) { document.body.appendChild(scrim); document.body.appendChild(pill); }

    let canvas = null;
    if (!o.noCanvas) {
      canvas = document.createElement("canvas");
      canvas.className = "art-c";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "generative artwork: " + esc(o.title));
      stage.appendChild(canvas);
    }

    // the sheet-modal (phones)
    const setOpen = (v) => document.body.classList.toggle("open", v);
    pill.addEventListener("click", () => setOpen(true));
    panel.querySelector(".x").addEventListener("click", () => setOpen(false));
    scrim.addEventListener("click", () => setOpen(false));
    addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });

    if (!thumb) {
      // clicks never restart the piece; reseed is the r key only
      addEventListener("keydown", (e) => { if (e.key === "r") ART.reseed(); });

      // ← → navigation: arrows at the panel's foot, swipe on the artwork,
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
            room.style.transition = "transform 180ms ease, opacity 180ms ease";
            room.style.transform = "translateX(" + dir * -30 + "px)";
            room.style.opacity = "0.4";
            setTimeout(() => { location.href = file; }, 160);
          };
          const nav = panel.querySelector(".go");
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
    // kept for pieces that change register mid-life; the panel no longer
    // needs re-inking (the facts live on white, not over the art)
    F.setTone = function () {};
    function fit() {
      // desktop: fit the artwork into the room at its ratio (contain);
      // phones/thumbs: the .art element is absolutely full-screen already
      const fixed = getComputedStyle(room).position === "fixed";
      if (fixed || thumb) {
        stage.style.width = ""; stage.style.height = "";
        return;
      }
      const rw = room.clientWidth, rh = room.clientHeight;
      if (o.bleed || o.open) { stage.style.width = rw + "px"; stage.style.height = rh + "px"; return; }
      let w = rw, h = w / ratio;
      if (h > rh) { h = rh; w = h * ratio; }
      stage.style.width = Math.round(w) + "px";
      stage.style.height = Math.round(h) + "px";
    }
    function resize(defer) {
      fit();
      F.DPR = Math.min(devicePixelRatio || 1, 2);
      F.W = Math.round(stage.offsetWidth * F.DPR) || Math.round(innerWidth * F.DPR);
      F.H = Math.round(stage.offsetHeight * F.DPR) || Math.round(innerHeight * F.DPR);
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
