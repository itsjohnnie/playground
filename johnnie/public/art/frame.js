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
    // ?og=1: a static social-share capture — the panel's header and
    // headline only, no arrows/description/spec-table, artwork alongside
    // as on desktop. Captured offline at a fixed 1200×630 viewport.
    const og = new URLSearchParams(location.search).get("og") === "1";
    const num = "#" + (o.num || 0);   // one digit — five matches, not a hundred
    const edition = String(o.edition || "").replace(/^0+/, "");
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
/* seamless navigation: the white sheet morphs between the index and the
   panel, artworks cross-blend — no reload flash. Browsers without
   cross-document view transitions simply navigate. */
@view-transition{navigation:auto}
@media (min-width:821px){.panel{view-transition-name:sheet}.top{view-transition-name:topbar}}
.room{view-transition-name:artwork}
::view-transition-group(sheet),::view-transition-group(artwork){
animation-duration:380ms;animation-timing-function:cubic-bezier(0.23,1,0.32,1)}
::view-transition-old(artwork),::view-transition-new(artwork){
animation-duration:300ms}
@media (prefers-reduced-motion:reduce){
::view-transition-group(*),::view-transition-image-pair(*),
::view-transition-old(*),::view-transition-new(*){animation:none!important}}
a{text-underline-offset:3px}
html,body{margin:0;background:#0d0a07;height:100%}
body{height:100dvh;overflow:hidden;box-sizing:border-box;
font-family:'Geist',ui-sans-serif,system-ui,sans-serif;font-weight:430;
padding:clamp(0px,2.4vw,34px);display:grid;column-gap:clamp(14px,2.4vw,34px);
grid-template-columns:clamp(380px,42vw,600px) 1fr}
.panel{position:relative;background:#f2f1ee;color:#16130f;overflow:auto;
border-radius:clamp(0px,3vw,40px);container-type:inline-size;
padding:clamp(24px,4vw,52px) clamp(22px,4.5vw,60px) clamp(28px,4.5vw,56px);
box-shadow:0 30px 90px rgba(0,0,0,.38);
display:flex;flex-direction:column;scrollbar-width:thin}
.top{display:grid;grid-template-columns:1.15fr 1fr auto;gap:12px;
font-size:clamp(11.5px,1.4vw,13.5px);line-height:1.8;letter-spacing:.01em}
.top .lab{font-weight:560;letter-spacing:.045em;text-transform:uppercase}
.top a{color:inherit;text-decoration:none}
@media (hover:hover) and (pointer:fine){.top a:hover{text-decoration:underline}}
.mid{margin:auto 0 0;padding:clamp(26px,7cqi,56px) 0}
h1{font-size:clamp(32px,9cqi,58px);font-weight:460;letter-spacing:-0.022em;
line-height:1.1;margin:0;text-wrap:balance}
.desc{font-size:clamp(13.5px,3.1cqi,16px);line-height:1.75;font-weight:430;
color:rgba(22,19,15,.88);max-width:60ch;margin:clamp(14px,3.5cqi,24px) 0 0}
.desc a{color:inherit}
.specs{margin:clamp(24px,6cqi,44px) 0 0;font-size:clamp(12px,2.9cqi,14px);
background:#fff;border-radius:clamp(10px,2.6cqi,16px);
padding:clamp(4px,1.4cqi,8px) clamp(16px,4.4cqi,26px);
border:1px solid rgba(22,19,15,.07);
box-shadow:0 1px 2px rgba(22,19,15,.05), 0 4px 14px rgba(22,19,15,.04)}
.specs .row{display:flex;justify-content:space-between;align-items:baseline;
gap:16px;padding:clamp(11px,2.8cqi,15px) 0;border-bottom:1px solid rgba(22,19,15,.08)}
.specs .row:last-child{border-bottom:0}
.specs .k{font-weight:520;font-size:clamp(10.5px,2.5cqi,12px);letter-spacing:.06em;
text-transform:uppercase;color:rgba(22,19,15,.62)}
.specs .v{text-align:right}
.specs .m-date{display:none}
.go{margin-top:0;display:flex;justify-content:space-between;align-items:center}
.go a,.go .off{color:inherit;text-decoration:none;font-size:clamp(26px,7cqi,38px);
line-height:1;padding:6px 2px;transition:transform 160ms cubic-bezier(0.23,1,0.32,1)}
.go .off{opacity:.22;pointer-events:none;user-select:none}
.go a:active{transform:scale(0.94)}
@media (hover:hover) and (pointer:fine){
.go a.next:hover{transform:translateX(5px)}
.go a.prev:hover{transform:translateX(-5px)}
.go a.next:active{transform:translateX(5px) scale(0.94)}
.go a.prev:active{transform:translateX(-5px) scale(0.94)}}
html{-webkit-tap-highlight-color:transparent}
.room{position:relative;display:flex;align-items:center;justify-content:center;min-width:0}
/* the artwork is a surface, not a document: no text selection, no
   long-press callout — gestures belong to the piece */
.room,.room *,.pill{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.art{position:relative;background:${artBg};overflow:hidden}
.art canvas.art-c{position:absolute;inset:0;width:100%;height:100%;display:block}
.scrim,.pill,.x{display:none}
.panel{animation:panel-in 420ms cubic-bezier(0.23,1,0.32,1)}
@keyframes panel-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.panel{animation:panel-fade 200ms ease}
@keyframes panel-fade{from{opacity:0}to{opacity:1}}}

@media (max-width:820px){
body{display:block;padding:0}
/* phones: the header holds two columns — the practice/date column shifted
   the grid; the date lives in the spec card instead */
.top{grid-template-columns:1.2fr auto}
.top .m-col{display:none}
.specs .m-date{display:flex}
.mid{padding-bottom:0}
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
/* asymmetric: the scrim (and sheet) leave faster than they arrive —
   slow where the user is settling in, fast where the system answers */
.scrim{display:block;position:fixed;inset:0;z-index:14;background:rgba(5,3,2,.45);
opacity:0;pointer-events:none;transition:opacity 200ms ease}
body.open .scrim{transition-duration:320ms}
.panel{position:fixed;z-index:15;left:10px;right:10px;
top:max(10px,env(safe-area-inset-top));
bottom:max(10px,env(safe-area-inset-bottom));
margin:0;border-radius:20px;animation:none;
box-shadow:0 30px 80px rgba(0,0,0,.6);
transform:translateY(103%);pointer-events:none;
transition:transform 360ms cubic-bezier(0.32,0.72,0,1)}
body.open .panel{transform:none;pointer-events:auto;transition-duration:460ms}
body.open .scrim{opacity:1;pointer-events:auto}
body.open .pill{opacity:0;pointer-events:none}
/* the pill IS the sheet: same view-transition-name on whichever of the
   two is live, so opening morphs the button into the card (and closing
   collapses the card back into it). The slide transition is disabled
   for the flip itself (body.vt) — the browser animates the snapshots.
   Text NEVER scales: the pill's label and the card's three sections
   carry their own names, which lifts them out of the surface snapshot —
   they fade in place at natural size while only the flat surface morphs. */
.pill{view-transition-name:pill-sheet}
.pill .plbl{view-transition-name:pill-label;display:inline-block}
body.open .pill,body.open .pill .plbl{view-transition-name:none}
body.open .panel{view-transition-name:pill-sheet}
body.open .panel .top{view-transition-name:sheet-top}
body.open .panel .mid{view-transition-name:sheet-mid}
body.open .panel .go{view-transition-name:sheet-go}
body.vt .panel,body.vt .pill,body.vt .scrim{transition:none}
::view-transition-group(pill-sheet){animation-duration:440ms;
animation-timing-function:cubic-bezier(0.32,0.72,0,1)}
::view-transition-old(pill-sheet),::view-transition-new(pill-sheet){
height:100%;width:100%;object-fit:fill;animation-duration:440ms}
/* content: pure fades, staged after the surface has mostly landed */
::view-transition-old(pill-label),::view-transition-old(sheet-top),
::view-transition-old(sheet-mid),::view-transition-old(sheet-go){
animation-duration:140ms;animation-fill-mode:both}
::view-transition-new(sheet-top),::view-transition-new(sheet-mid),
::view-transition-new(sheet-go){animation-duration:240ms;
animation-delay:150ms;animation-fill-mode:both}
::view-transition-new(pill-label){animation-duration:200ms;
animation-delay:120ms;animation-fill-mode:both}
.go{margin-top:24px}   /* the sheet keeps its air above the arrows */
.x{display:flex;align-items:center;justify-content:center;margin:0 auto;
cursor:pointer;background:none;border:0;color:inherit;font:inherit;
/* the ✕ glyph draws smaller than the arrows at equal size — set it a
   step up so the three read as one family */
font-size:clamp(30px,8.2cqi,44px);line-height:1;padding:6px 2px;
transition:transform 160ms cubic-bezier(0.23,1,0.32,1)}
.x:active{transform:scale(0.94)}
@media (prefers-reduced-motion:reduce){.panel{transition:none}}
}
${thumb ? `body{display:block;padding:0}
.panel,.pill,.scrim{display:none!important}
.room{position:fixed;inset:0}
.art{position:absolute;inset:0;margin:0}` : ""}
${og ? `.go,.desc,.specs,.cap{display:none!important}
.panel{animation:none}` : ""}`;
    document.head.appendChild(css);

    const esc = (s) => String(s == null ? "" : s);
    const panel = document.createElement("aside");
    panel.className = "panel";
    panel.setAttribute("aria-label", "about this piece");
    panel.innerHTML =
      '<header class="top">' +
        '<div><span class="lab">Johnnie’s atelier</span><br><a href="../">← Art</a></div>' +
        '<div class="m-col"><span class="m">Daily Practice</span><br>' + date + "</div>" +
        '<div><a href="https://johnnies.life/art" tabindex="-1">johnnies.life/art</a><br>' + num + "</div>" +
      "</header>" +
      '<div class="mid">' +
        "<h1>" + esc(o.subject || o.title) + "</h1>" +
        (o.desc ? '<p class="desc">' + o.desc + "</p>" : "") +
        '<div class="specs">' +
          '<div class="row"><span class="k">Title</span><span class="v" lang="es">' + esc(o.title) + "</span></div>" +
          '<div class="row"><span class="k">Edition</span><span class="v">' + esc(edition) + "</span></div>" +
          '<div class="row m-date"><span class="k">Date</span><span class="v">' + date + "</span></div>" +
          '<div class="row"><span class="k">Stack</span><span class="v">' + esc(o.stack) + "</span></div>" +
          '<div class="row"><span class="k">Time spent</span><span class="v">' + esc(o.time) + "</span></div>" +
        "</div>" +
      "</div>" +
      '<nav class="go" aria-label="pieces"></nav>';
    // the close button lives at the foot, centered between the arrows
    const xBtn = document.createElement("button");
    xBtn.className = "x";
    xBtn.setAttribute("aria-label", "close");
    xBtn.textContent = "✕";
    panel.querySelector(".go").appendChild(xBtn);

    const room = document.createElement("div");
    room.className = "room";
    const stage = document.createElement("div");
    stage.className = "art";
    room.appendChild(stage);

    const scrim = document.createElement("div");
    scrim.className = "scrim";
    const pill = document.createElement("button");
    pill.className = "pill";
    pill.innerHTML = '<span class="plbl">' + num + dot + esc(o.title) + "</span>";
    pill.setAttribute("aria-label", "about this piece");

    document.body.appendChild(panel);
    document.body.appendChild(room);
    if (!thumb) { document.body.appendChild(scrim); document.body.appendChild(pill); }

    // the index has no "artwork" element to morph into — leaving the name
    // on lets the browser animate it as an orphaned floating group (it once
    // shipped that way and the return trip read as broken). Neutralize it
    // right before that specific navigation starts, so going back to the
    // index falls back to a clean, unnamed cross-fade instead.
    const crumb = panel.querySelector('.top a[href="../"]');
    if (crumb) crumb.addEventListener("click", () => { room.style.viewTransitionName = "none"; });

    let canvas = null;
    if (!o.noCanvas) {
      canvas = document.createElement("canvas");
      canvas.className = "art-c";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "generative artwork: " + esc(o.title));
      stage.appendChild(canvas);
    }

    // when a view transition is running, the panel group already morphs —
    // skip the entrance animation so the two don't fight
    addEventListener("pagereveal", (e) => {
      if (e.viewTransition) panel.style.animation = "none";
    });

    // the sheet-modal (phones): where the browser can, the pill MORPHS
    // into the card (same-document view transition) instead of the card
    // sliding up; elsewhere — and under reduced motion — the slide stays
    const setOpen = (v) => {
      if (v === document.body.classList.contains("open")) return;
      const flip = () => document.body.classList.toggle("open", v);
      if (!document.startViewTransition ||
          !matchMedia("(max-width: 820px)").matches ||
          matchMedia("(prefers-reduced-motion: reduce)").matches) { flip(); return; }
      document.body.classList.add("vt");
      document.startViewTransition(flip).finished
        .finally(() => document.body.classList.remove("vt"));
    };
    pill.addEventListener("click", () => setOpen(true));
    panel.querySelector(".x").addEventListener("click", () => setOpen(false));
    scrim.addEventListener("click", () => setOpen(false));
    addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });

    if (!thumb) {
      // clicks never restart the piece; reseed is the r key only
      addEventListener("keydown", (e) => { if (e.key === "r") ART.reseed(); });

      // ← → navigation: arrows at the panel's foot,
      // arrow keys anywhere. Production serves extensionless URLs, so match
      // basenames with the extension stripped.
      const base = (p) => p.split("/").pop().replace(/\.html$/, "");
      fetch("../sketches.json")
        .then((r) => r.text())
        .then((raw) => {
          // seed the index's manifest cache so ← Art renders the day list
          // synchronously, with no fetch gap inside the view transition
          try { sessionStorage.setItem("atelier-manifest", raw); } catch (_) {}
          return JSON.parse(raw);
        })
        .then((d) => {
          // the walk runs in match order: ← toward #1, → toward the latest.
          // No wrap — at either end the arrow dims and goes inert.
          // upcoming matches carry no file yet — they're not a stop on the walk
          const list = d.sketches.slice()
            .filter((s) => s.file)
            .sort((a, b) => a.date.localeCompare(b.date) || a.n.localeCompare(b.n))
            .map((s) => s.file.split("/").pop());
          const i = list.map(base).indexOf(base(location.pathname));
          if (i < 0 || list.length < 2) return;
          const prev = i > 0 ? list[i - 1] : null;
          const next = i < list.length - 1 ? list[i + 1] : null;

          // production serves extensionless URLs — link them directly so the
          // view transition isn't broken by a redirect (and swipes skip a
          // round-trip); local dev keeps .html
          const href = (f) =>
            location.pathname.endsWith(".html") ? f : f.replace(/\.html$/, "");
          // navigation is a cross-document view transition (the artwork
          // cross-blends, the panel morphs) — no manual slide needed
          const go = (file) => { if (file) location.href = href(file); };
          const nav = panel.querySelector(".go");
          const mk = (cls, file, glyph) => {
            const a = document.createElement(file ? "a" : "span");
            a.className = file ? cls : cls + " off";
            if (file) a.href = href(file);
            else a.setAttribute("aria-disabled", "true");
            a.textContent = glyph;
            a.setAttribute("aria-label", cls === "prev" ? "previous piece" : "next piece");
            nav.appendChild(a);
          };
          mk("prev", prev, "←");
          nav.appendChild(xBtn);   // ✕ sits centered between the arrows
          mk("next", next, "→");

          // the neighbors and the index are prerendered in the background —
          // navigating activates a fully-drawn page: no load, no flicker.
          // Browsers without speculation rules simply ignore this.
          const spec = document.createElement("script");
          spec.type = "speculationrules";
          spec.textContent = JSON.stringify({
            prerender: [{ urls: [prev, next].filter(Boolean).map(href).concat("../"),
                          eagerness: "immediate" }],
          });
          document.head.appendChild(spec);

          // no swipe navigation — every composition owns its own touch;
          // moving between matches is the arrows and arrow keys
          addEventListener("keydown", (e) => {
            if (e.key === "ArrowRight") go(next);
            if (e.key === "ArrowLeft") go(prev);
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
