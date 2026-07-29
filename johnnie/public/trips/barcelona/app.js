/* one negative, one grid
   one photograph fills the page; cells carry displaced crops of the SAME
   image, resolved by a hidden grid. the negatives are johnnie's own
   frames, self-hosted in negatives/ (see SOURCES.md); their real EXIF
   drives the factual micro-copy and each sheet credits its negative. */

(() => {
  "use strict";

  const stage = document.getElementById("stage");
  const grid = document.getElementById("grid");
  const underlay = document.getElementById("underlay");
  const bgA = document.getElementById("bg-a");
  const bgB = document.getElementById("bg-b");
  const settingsBtn = document.getElementById("settings");
  const panel = document.getElementById("panel");
  const seedEl = document.getElementById("seed");
  const layoutNoEl = document.getElementById("layout-no");
  const gridSpecEl = document.getElementById("grid-spec");
  const frameCountEl = document.getElementById("frame-count");
  const marksLayer = document.getElementById("marks");
  const negInfoEl = document.getElementById("neg-credit");
  const negLicEl = document.getElementById("neg-lic");
  const readoutEl = document.getElementById("cursor-readout");
  const crosshair = document.getElementById("crosshair");

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smallScreen = matchMedia("(max-width: 720px)");
  const root = document.documentElement;

  // ————— viewport pixels as custom props (dvh-safe everywhere) —————

  function setViewportVars() {
    root.style.setProperty("--vpw", `${innerWidth}px`);
    root.style.setProperty("--vph", `${innerHeight}px`);
  }
  setViewportVars();

  // ————— seeded randomness —————

  function mulberry32(a) {
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const newSeed = () => (Math.random() * 0xffffff) >>> 0;
  const seedHex = (s) => s.toString(16).padStart(6, "0").toUpperCase();
  const pick = (rng, arr) => arr[(rng() * arr.length) | 0];
  const irange = (rng, lo, hi) => lo + ((rng() * (hi - lo + 1)) | 0);

  // ————— configuration —————

  const config = () =>
    smallScreen.matches
      ? { cols: 6, rows: 10, frags: [2, 3], spans: [[2, 2], [2, 3], [3, 2], [2, 4], [3, 3], [1, 2], [2, 1]] }
      : { cols: 12, rows: 6, frags: [3, 4], spans: [[2, 2], [3, 2], [2, 3], [4, 2], [3, 3], [2, 1], [1, 2]] };

  // ————— micro-copy pools (català) —————

  const PLACES = ["EL RAVAL", "GRÀCIA", "BARCELONETA", "POBLENOU", "EIXAMPLE", "EL BORN", "SANTS", "GÒTIC", "MONTJUÏC", "SANT ANTONI", "HORTA", "CLOT"];
  const SPECS = ["F 2.8 · 1/250", "F 8 · 1/60", "F 1.8 · 1/1000", "F 11 · 1/125", "F 4 · 1/500", "F 5.6 · 1/250"];
  const FILM = ["PORTRA 400", "HP5+ PUSH +1", "TRI-X 400", "EKTAR 100", "GOLD 200", "DELTA 3200"];
  const LENSES = ["50MM", "35MM", "28MM", "85MM", "24MM"];
  const NOTES = ["DO NOT BEND", "PROOF · DO NOT PRINT", "UNSORTED", "KEEP FLAT", "SECOND PASS", "SCANNED TWICE", "DUST ON NEG", "LIGHT LEAK, KEPT", "BURNED EDGE", "PIN LEFT EDGE"];
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  const fmtTime = (rng) => `${String(irange(rng, 6, 22)).padStart(2, "0")}:${String(irange(rng, 0, 59)).padStart(2, "0")}`;
  const fmtDate = (rng) => `${pick(rng, MONTHS)} ${String(irange(rng, 1, 28)).padStart(2, "0")}`;
  const fmtGps = (rng) => `41.${irange(rng, 3500, 4200)}° N\n2.${irange(rng, 1200, 2100)}° E`;
  const fmtEv = (rng) => {
    const v = pick(rng, ["−2", "−1 1/3", "−2/3", "+2/3", "+1 1/3", "+2"]);
    return `EV ${v}`;
  };

  // when the negative carries real EXIF (johnnie's own frames), the
  // factual copy kinds print the truth; the archive fictions stay generative
  function copyText(rng, kind, ctx) {
    const m = ctx.meta;
    switch (kind) {
      case "place": return m ? `${m.place}\n${m.time}` : `${pick(rng, PLACES)}\n${fmtTime(rng)}`;
      case "spec": return m ? `${m.spec}\n${m.lens}` : `${pick(rng, SPECS)}\n${pick(rng, LENSES)}`;
      case "film": return m ? `${m.film}\n${m.iso}` : `${pick(rng, FILM)}\nROLL ${String(irange(rng, 1, 24)).padStart(2, "0")}`;
      case "gps": return m ? m.gps : fmtGps(rng);
      case "note": return pick(rng, NOTES);
      case "index": return `FR ${String(irange(rng, 1, 412)).padStart(3, "0")} →`;
      case "contact": return `CLIP ${String(irange(rng, 1, ctx.frags)).padStart(2, "0")}/${ctx.frags}`;
      case "date": return m ? m.date : `${fmtDate(rng)}\n${fmtTime(rng)}`;
      case "meter": return m && m.ev ? m.ev : fmtEv(rng);
      case "alt": return m && m.alt ? m.alt : pick(rng, NOTES);
      case "dir": return m && m.dir ? m.dir : pick(rng, NOTES);
      default: return pick(rng, NOTES);
    }
  }
  const COPY_KINDS = ["place", "spec", "film", "gps", "note", "index", "contact", "date", "meter", "alt", "dir"];

  // hairline iconography: 1px strokes beside the factual single-line
  // kinds — a sun for the meter, a peak for altitude, an arrow that
  // actually points along the recorded compass bearing
  const ICONS = { meter: "sun", alt: "peak", dir: "arrow" };
  function iconSvg(name, rot) {
    const open = '<svg class="cp__ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
    if (name === "sun")
      return open +
        '<circle cx="6" cy="6" r="2.4"/>' +
        '<path d="M6 0.6v1.6M6 9.8v1.6M0.6 6h1.6M9.8 6h1.6M2.2 2.2l1.13 1.13M8.67 8.67l1.13 1.13M9.8 2.2 8.67 3.33M3.33 8.67 2.2 9.8"/></svg>';
    if (name === "peak")
      return open + '<path d="M1.2 9.5 4.8 3.6 6.9 6.9 8.3 5 10.8 9.5"/></svg>';
    return open + `<g transform="rotate(${rot || 0} 6 6)"><path d="M6 10.4V1.9M3.4 4.5 6 1.9l2.6 2.6"/></g></svg>`;
  }

  // ————— layout generation —————

  function pickAnchors(rng, count, max, minGap) {
    const out = [];
    let guard = 200;
    while (out.length < count && guard--) {
      const v = irange(rng, 0, max - 1);
      if (out.every((o) => Math.abs(o - v) >= minGap)) out.push(v);
    }
    return out.sort((a, b) => a - b);
  }

  function generate(seed) {
    const rng = mulberry32(seed);
    const cfg = config();
    const { cols, rows } = cfg;
    const occ = new Uint8Array(cols * rows);
    const free = (x, y, w, h) => {
      if (x < 0 || y < 0 || x + w > cols || y + h > rows) return false;
      for (let j = y; j < y + h; j++)
        for (let i = x; i < x + w; i++)
          if (occ[j * cols + i]) return false;
      return true;
    };
    const claim = (x, y, w, h) => {
      for (let j = y; j < y + h; j++)
        for (let i = x; i < x + w; i++) occ[j * cols + i] = 1;
    };
    const openSlots = (w, h) => {
      const out = [];
      for (let y = 0; y <= rows - h; y++)
        for (let x = 0; x <= cols - w; x++)
          if (free(x, y, w, h)) out.push([x, y]);
      return out;
    };

    const anchorCols = pickAnchors(rng, 3, cols, 2);
    const anchorRows = pickAnchors(rng, 2, rows, 2);
    const biased = (rng2, anchors, max) => {
      if (rng2() < 0.68) {
        const fit = anchors.filter((a) => a <= max);
        if (fit.length) return pick(rng2, fit);
      }
      return irange(rng2, 0, max);
    };

    // clippings: each shows ANOTHER cell-aligned region of the negative
    const frags = [];
    const sourceFor = (x, y, w, h) => {
      for (let t = 0; t < 40; t++) {
        const sx = irange(rng, 0, cols - w);
        const sy = irange(rng, 0, rows - h);
        if (Math.abs(sx - x) + Math.abs(sy - y) >= 3) return [sx, sy];
      }
      return [(x + 2) % (cols - w + 1), (y + 2) % (rows - h + 1)];
    };
    const fragCount = irange(rng, cfg.frags[0], cfg.frags[1]);
    // clippings should spread across the sheet, not huddle
    const farFromOthers = (x, y) =>
      frags.every((f) => Math.abs(f.x - x) + Math.abs(f.y - y) >= 3);
    for (let i = 0; i < fragCount; i++) {
      let placed = false;
      for (let t = 0; t < 60 && !placed; t++) {
        const [w, h] = pick(rng, cfg.spans);
        const x = biased(rng, anchorCols, cols - w);
        const y = biased(rng, anchorRows, rows - h);
        if (t < 40 && !farFromOthers(x, y)) continue;
        if (free(x, y, w, h)) {
          claim(x, y, w, h);
          const [sx, sy] = sourceFor(x, y, w, h);
          frags.push({ x, y, w, h, sx, sy });
          placed = true;
        }
      }
      if (!placed) {
        for (const [w, h] of [[2, 2], [2, 1], [1, 2], [1, 1]]) {
          const slots = openSlots(w, h);
          if (slots.length) {
            const [x, y] = pick(rng, slots);
            claim(x, y, w, h);
            const [sx, sy] = sourceFor(x, y, w, h);
            frags.push({ x, y, w, h, sx, sy });
            break;
          }
        }
      }
    }
    // micro-copy: sparser than before, and no kind repeats until the
    // whole pool has been dealt (duplicate lines read as a glitch)
    const copies = [];
    let kindBag = [];
    const nextKind = () => {
      if (!kindBag.length) {
        kindBag = [...COPY_KINDS];
        for (let i = kindBag.length - 1; i > 0; i--) {
          const j = (rng() * (i + 1)) | 0;
          [kindBag[i], kindBag[j]] = [kindBag[j], kindBag[i]];
        }
      }
      return kindBag.pop();
    };

    const freeCellsInCol = (c) => {
      const out = [];
      for (let r = 0; r < rows; r++) if (!occ[r * cols + c]) out.push(r);
      return out;
    };
    const freeCellsInRow = (r) => {
      const out = [];
      for (let c = 0; c < cols; c++) if (!occ[r * cols + c]) out.push(c);
      return out;
    };

    // one cell is too tight for a clean line on phones: copy there must
    // own two cells (vertical blocks excepted) or it is not placed at all
    const tryCopy = (x, y, opts = {}) => {
      // the top row belongs to the corner chrome: the name and the
      // sheet number must never share a line with dealt copy
      if (y === 0) return false;
      if (occ[y * cols + x]) return false;
      if (opts.vert) {
        if (y + 1 >= rows || occ[(y + 1) * cols + x]) return false;
        occ[y * cols + x] = 1;
        occ[(y + 1) * cols + x] = 1;
        copies.push({ x, y, w: 1, h: 2, kind: nextKind(), ...opts });
        return true;
      }
      const canWiden = x + 1 < cols && !occ[y * cols + x + 1];
      if (smallScreen.matches && !canWiden) return false;
      occ[y * cols + x] = 1;
      const c = { x, y, w: 1, h: 1, kind: nextKind(), ...opts };
      if (canWiden && (smallScreen.matches || rng() < 0.35)) {
        c.w = 2;
        occ[y * cols + x + 1] = 1;
      }
      copies.push(c);
      return true;
    };

    // two anchor columns get a short stack, one anchor row a short run,
    // then a scatter balanced across the four quadrants of the sheet
    for (const stackCol of anchorCols.slice(0, 2)) {
      let placedInCol = 0;
      for (const r of freeCellsInCol(stackCol)) {
        if (placedInCol >= irange(rng, 2, 3)) break;
        if (tryCopy(stackCol, r)) placedInCol++;
      }
    }
    let placedInRow = 0;
    for (const cx of freeCellsInRow(anchorRows[0])) {
      if (placedInRow >= 3) break;
      if (tryCopy(cx, anchorRows[0])) placedInRow++;
    }

    const quads = [[0, 0], [1, 0], [0, 1], [1, 1]];
    for (let i = quads.length - 1; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      [quads[i], quads[j]] = [quads[j], quads[i]];
    }
    const halfC = cols >> 1, halfR = rows >> 1;
    const scatterTarget = irange(rng, 4, 5);
    let scattered = 0;
    for (let t = 0; t < 140 && scattered < scatterTarget; t++) {
      const [qx, qy] = quads[scattered % 4];
      const x = qx * halfC + irange(rng, 0, halfC - 1);
      const y = qy * halfR + irange(rng, 0, halfR - 1);
      const vert = rng() < 0.18;
      if (tryCopy(x, y, vert ? { vert } : {})) scattered++;
    }

    // one emphasized copy block per layout (full shade, heavier weight)
    if (copies.length) copies[(rng() * copies.length) | 0].strong = true;

    return {
      cfg, rng, frags, copies, anchorCols, anchorRows,
      seed: seedHex(seed),
      negative: pick(rng, NEGATIVES),
    };
  }

  // ————— the negatives: johnnie's own frames, loaded from the manifest —————
  // this engine serves EVERY trip: the slug in the URL picks the
  // manifest (/trips/manifests/<slug>.json), the single source of
  // truth edited in the CMS at /admin (Trips collection). each entry
  // carries the real EXIF transcribed for the factual micro-copy
  const TRIP = (location.pathname.match(/\/trips\/([^/]+)/) || [, "barcelona"])[1];
  let NEGATIVES = [];
  async function loadManifest() {
    const res = await fetch(`/trips/manifests/${TRIP}.json`, { cache: "no-cache" });
    const data = await res.json();
    if (!Array.isArray(data.negatives) || !data.negatives.length)
      throw new Error("empty manifest");
    NEGATIVES = data.negatives;
    const label = `${data.title || TRIP} ${data.year || ""}`.trim();
    document.getElementById("trip-label").textContent = label;
    // the sheet's chrome is lowercase by style; the browser tab is not
    const proper = label.replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
    document.title = `${proper} | Johnnie’s Life`;
  }

  // the deck: negatives deal like a shuffled stack of prints — every
  // frame comes up once, in random order, before any frame repeats.
  // when the stack runs out it reshuffles, and the fresh shuffle never
  // opens with the print already on the sheet
  let deck = [];
  function nextNegative() {
    if (!deck.length) {
      deck = [...NEGATIVES];
      for (let i = deck.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      const top = deck.length - 1;
      if (deck.length > 1 && current.neg && deck[top] === current.neg) {
        const j = (Math.random() * top) | 0;
        [deck[top], deck[j]] = [deck[j], deck[top]];
      }
    }
    return deck.pop();
  }

  function loadNegative(url, timeout = 9000) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => (img.decode ? img.decode().then(() => resolve(img), () => resolve(img)) : resolve(img));
      img.onerror = () => resolve(null);
      img.src = url;
      setTimeout(() => resolve(null), timeout);
    });
  }

  // phones cover-crop the negative to the viewport; desktop shows the
  // WHOLE frame, repeated side by side on the night ground — 160px of
  // air between repeats AND above/below. --dw/--dh/--ox/--oy drive the body
  // layers on phones AND every clipping's crop math — in strip mode
  // they describe the centre tile, so clippings crop from it
  const stripMode = () => !smallScreen.matches;
  const STRIP_GAP = 160, STRIP_PAD = 160;
  // the cursor drift: target and current offset live here so that a
  // geometry change (new photo, resize) can clamp a stale pan — the
  // limit differs per photo, and an offset beyond the new strip's end
  // would strand it off to one side
  let panLimit = 0, panT = 0, panC = 0, panRaf = null;
  const panTick = () => {
    panC += (panT - panC) * 0.07;
    root.style.setProperty("--pan", `${panC.toFixed(2)}px`);
    if (Math.abs(panT - panC) > 0.2) panRaf = requestAnimationFrame(panTick);
    else panRaf = null;
  };
  const kickPan = () => { if (!panRaf && Math.abs(panT - panC) > 0.2) panRaf = requestAnimationFrame(panTick); };

  function stripGeom(iw, ih) {
    const tileH = Math.max(64, innerHeight - STRIP_PAD * 2);
    const tileW = tileH * (iw / ih);
    // the strip runs past both edges — near-infinite, but finite: the
    // cursor can pan far enough to fully reveal the end prints, and
    // at the extremes the strip's edge meets the viewport's edge
    const n = Math.max(1, Math.ceil((innerWidth + STRIP_GAP) / (tileW + STRIP_GAP)) + 2);
    const stripW = n * tileW + (n - 1) * STRIP_GAP;
    const startX = (innerWidth - stripW) / 2;
    const center = startX + Math.floor(n / 2) * (tileW + STRIP_GAP);
    return { tileW, tileH, n, startX, center };
  }

  function setLayerImage(layer, src) {
    layer.dataset.src = src;
    if (!stripMode() || !negDims) {
      layer.replaceChildren();
      layer.style.backgroundImage = `url("${src}")`;
      return;
    }
    layer.style.backgroundImage = "";
    const g = stripGeom(negDims.iw, negDims.ih);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < g.n; i++) {
      const t = document.createElement("div");
      t.className = "tile tile--rise";
      t.style.animationDelay = `${reducedMotion ? 0 : i * 90}ms`;
      t.style.width = `${g.tileW}px`;
      t.style.height = `${g.tileH}px`;
      t.style.backgroundImage = `url("${src}")`;
      frag.appendChild(t);
    }
    layer.replaceChildren(frag);
    buildTileClips(layer);
  }

  // desktop shuffles morph the strip in place: the SAME tiles resize
  // to the next frame's aspect while the new image fades in on their
  // faces; extra tiles grow in from nothing, surplus ones collapse
  function morphStrip(src) {
    const g = stripGeom(negDims.iw, negDims.ih);
    frontBg.dataset.src = src;
    frontBg.querySelectorAll(".clip").forEach((c) => c.remove());
    if (settings.clips) setTimeout(() => buildTileClips(frontBg), 700);
    const tiles = [...frontBg.querySelectorAll(".tile")];
    while (tiles.length < g.n) {
      const t = document.createElement("div");
      t.className = "tile";
      t.style.width = "0px";
      t.style.height = `${g.tileH}px`;
      t.style.marginLeft = "0px";
      t.style.backgroundImage = `url("${src}")`;
      frontBg.appendChild(t);
      tiles.push(t);
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      tiles.forEach((t, i) => {
        if (i >= g.n) {
          t.classList.add("tile--gone");
          t.style.width = "0px";
          setTimeout(() => t.remove(), 620);
          return;
        }
        t.style.marginLeft = "";
        t.style.width = `${g.tileW}px`;
        t.style.height = `${g.tileH}px`;
        if (t.style.backgroundImage.includes(src)) return;
        const face = document.createElement("div");
        face.className = "tile__next";
        const delay = reducedMotion ? 0 : i * 70;
        face.style.transitionDelay = `${delay}ms`;
        face.style.backgroundImage = `url("${src}")`;
        t.appendChild(face);
        requestAnimationFrame(() => requestAnimationFrame(() => face.classList.add("is-on")));
        setTimeout(() => {
          t.style.backgroundImage = `url("${src}")`;
          face.remove();
        }, 560 + delay);
      });
    }));
  }

  // strip clippings: each print carries its own displaced crops — a
  // hidden 3x4 grid inside the tile, every tile dealt differently
  const CLIP_C = 3, CLIP_R = 4;
  function buildTileClips(layer) {
    const gone = [...layer.querySelectorAll(".clip")];
    if (!settings.clips || !stripMode() || !layer.dataset.src || !negDims) {
      gone.forEach((c) => { c.classList.remove("is-in"); setTimeout(() => c.remove(), 550); });
      return;
    }
    gone.forEach((c) => c.remove());
    const src = layer.dataset.src;
    const g = stripGeom(negDims.iw, negDims.ih);
    const cellW = g.tileW / CLIP_C, cellH = g.tileH / CLIP_R;
    layer.querySelectorAll(".tile").forEach((tile, ti) => {
      const count = 1 + ((Math.random() * 2) | 0);
      const used = [];
      for (let k = 0; k < count; k++) {
        const w = 1 + ((Math.random() * 2) | 0);
        const h = 1 + ((Math.random() * 2) | 0);
        const x = (Math.random() * (CLIP_C - w + 1)) | 0;
        const y = (Math.random() * (CLIP_R - h + 1)) | 0;
        if (used.some(([ux, uy]) => Math.abs(ux - x) + Math.abs(uy - y) < 2)) continue;
        used.push([x, y]);
        // the crop shows ANOTHER region of the same print
        let sx = x, sy = y, guard = 24;
        while (guard-- && Math.abs(sx - x) + Math.abs(sy - y) < 2) {
          sx = (Math.random() * (CLIP_C - w + 1)) | 0;
          sy = (Math.random() * (CLIP_R - h + 1)) | 0;
        }
        const c = document.createElement("div");
        c.className = "clip";
        c.dataset.tile = ti;
        c.dataset.cx = x; c.dataset.cy = y;
        c.dataset.cw = w; c.dataset.ch = h;
        c.dataset.sx = sx; c.dataset.sy = sy;
        c.style.left = `${x * cellW}px`;
        c.style.top = `${y * cellH}px`;
        c.style.width = `${w * cellW}px`;
        c.style.height = `${h * cellH}px`;
        c.style.backgroundImage = `url("${src}")`;
        c.style.backgroundSize = `${g.tileW}px ${g.tileH}px`;
        c.style.backgroundPosition = `${-sx * cellW}px ${-sy * cellH}px`;
        c.style.setProperty("--d", `${reducedMotion ? 0 : ti * 80 + k * 140}ms`);
        tile.appendChild(c);
      }
    });
    requestAnimationFrame(() => requestAnimationFrame(() =>
      layer.querySelectorAll(".clip").forEach((c) => c.classList.add("is-in"))));
  }

  let negDims = null;
  function applyCover() {
    if (!negDims) return;
    if (stripMode()) {
      const g = stripGeom(negDims.iw, negDims.ih);
      // full travel: at the extreme the outermost print is entirely
      // in view, its edge flush with the viewport's
      panLimit = Math.max(0, -g.startX);
      panT = Math.max(-panLimit, Math.min(panLimit, panT));
      kickPan();
      root.style.setProperty("--dw", `${g.tileW}px`);
      root.style.setProperty("--dh", `${g.tileH}px`);
      root.style.setProperty("--ox", `${-g.center}px`);
      root.style.setProperty("--oy", `${-STRIP_PAD}px`);
      return;
    }
    const scale = Math.max(innerWidth / negDims.iw, innerHeight / negDims.ih);
    const dw = negDims.iw * scale, dh = negDims.ih * scale;
    root.style.setProperty("--dw", `${dw}px`);
    root.style.setProperty("--dh", `${dh}px`);
    root.style.setProperty("--ox", `${(dw - innerWidth) / 2}px`);
    root.style.setProperty("--oy", `${(dh - innerHeight) / 2}px`);
  }

  // ————— rendering —————

  function buildCells(layout, url) {
    const frag = document.createDocumentFragment();
    const cells = [];
    const enterDelay = (x, y) => (reducedMotion ? 0 : x * 22 + y * 30 + ((Math.random() * 40) | 0));

    layout.frags.forEach((f, i) => {
      const el = document.createElement("div");
      el.className = "frag";
      if (f.mono) el.classList.add("frag--mono");
      el.style.gridColumn = `${f.x + 1} / span ${f.w}`;
      el.style.gridRow = `${f.y + 1} / span ${f.h}`;
      el.style.setProperty("--img", `url("${url}")`);
      el.style.setProperty("--cx", f.x);
      el.style.setProperty("--cy", f.y);
      el.style.setProperty("--sx", f.sx);
      el.style.setProperty("--sy", f.sy);
      el.style.setProperty("--d", `${enterDelay(f.x, f.y)}ms`);

      const no = document.createElement("span");
      no.className = "frag__no";
      no.textContent = String(i + 1).padStart(2, "0");
      el.appendChild(no);

      // tap: slide home into the negative, then drift back
      let homeTimer;
      el.addEventListener("click", () => {
        clearTimeout(homeTimer);
        el.classList.toggle("is-home");
        if (el.classList.contains("is-home"))
          homeTimer = setTimeout(() => el.classList.remove("is-home"), 1800);
      });

      frag.appendChild(el);
      cells.push(el);
    });

    let pillCount = 0;
    const pillsAt = [];
    layout.copies.forEach((c) => {
      const el = document.createElement("div");
      el.className = "cp";
      if (c.strong || layout.rng() < 0.3) el.classList.add("cp--strong");
      if (c.vert) el.classList.add("cp--vert");
      el.style.gridColumn = `${c.x + 1} / span ${c.w}`;
      el.style.gridRow = `${c.y + 1} / span ${c.h}`;
      el.style.setProperty("--d", `${enterDelay(c.x, c.y)}ms`);
      const text = copyText(layout.rng, c.kind, { frags: layout.frags.length, meta: layout.negative.meta });
      const icon = ICONS[c.kind] && layout.negative.meta && !c.vert ? ICONS[c.kind] : null;
      const rot = icon === "arrow" ? parseInt(layout.negative.meta.dir, 10) || 0 : 0;
      if (icon) {
        el.dataset.icon = icon;
        el.dataset.rot = rot;
      }
      // short tokens sometimes sit inside a hairline pill — never more
      // than two per sheet, or the device turns into decoration, and
      // never two neighbouring each other: pills must keep their
      // distance (4 cells, walking) so each reads alone
      const pillable = !c.vert && !text.includes("\n") && text.length <= 12 &&
        ["index", "contact", "meter", "alt", "dir", "note"].includes(c.kind);
      const nearPill = pillsAt.some((p) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) < 4);
      if (pillable && pillCount < 2 && !nearPill && layout.rng() < 0.45) {
        pillCount++;
        pillsAt.push({ x: c.x, y: c.y });
        el.classList.add("cp--pill");
        el.dataset.pill = "1";
        el.innerHTML = `<span class="cp__pill">${icon ? iconSvg(icon, rot) : ""}<span>${text}</span></span>`;
      } else if (icon) {
        el.classList.add("cp--ic");
        el.innerHTML = iconSvg(icon, rot) + `<span>${text}</span>`;
      } else {
        el.textContent = text;
      }
      frag.appendChild(el);
      cells.push(el);
    });

    return { frag, cells };
  }

  function buildUnderlay(layout) {
    const { cols, rows } = layout.cfg;
    underlay.innerHTML = "";
    for (let i = 0; i < cols * rows; i++) {
      const u = document.createElement("div");
      u.className = "ucell";
      if (i % cols === cols - 1) u.classList.add("ucell--edge-r");
      if (i >= cols * (rows - 1)) u.classList.add("ucell--edge-b");
      underlay.appendChild(u);
    }
  }

  // registration crosses at the intersections of the deal's anchor lines
  function buildMarks(layout) {
    const { cols, rows } = layout.cfg;
    marksLayer.innerHTML = "";
    for (const ax of layout.anchorCols) {
      if (ax === 0) continue;
      for (const ay of layout.anchorRows) {
        if (ay === 0) continue;
        const s = document.createElement("span");
        s.className = "mark";
        s.textContent = "+";
        s.style.left = `${(ax / cols) * 100}%`;
        s.style.top = `${(ay / rows) * 100}%`;
        s.style.setProperty("--d", `${reducedMotion ? 0 : ax * 22 + ay * 30 + 260}ms`);
        marksLayer.appendChild(s);
      }
    }
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  // chrome values that persist in place never hard-swap: the old
  // reading decrypts into the new one — every character boils through
  // stray glyphs and locks into place, so the line blends rather than
  // visibly shortening and retyping
  const CIPHER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·—°×";
  function retype(el, next) {
    next = String(next);
    const prev = el.textContent;
    if (prev === next) return;
    if (reducedMotion) { el.textContent = next; return; }
    clearInterval(el._retype);
    // each position locks on its own frame: a loose left-to-right
    // sweep with enough jitter that the resolve feels organic
    const lock = [];
    for (let i = 0; i < next.length; i++)
      lock[i] = 2 + ((Math.random() * 6) | 0) + i * 0.35;
    let frame = 0;
    el._retype = setInterval(() => {
      frame++;
      let out = "";
      let done = true;
      for (let i = 0; i < next.length; i++) {
        if (frame >= lock[i]) { out += next[i]; continue; }
        done = false;
        const ch = next[i];
        if (ch === " " || ch === "\u00a0") { out += ch; continue; }
        // the first beats keep the old glyph where one exists, so the
        // previous reading is what dissolves
        out += frame < 2 && prev[i] ? prev[i] : CIPHER[(Math.random() * CIPHER.length) | 0];
      }
      el.textContent = out;
      if (done) { clearInterval(el._retype); el._retype = null; }
    }, 40);
  }

  // ————— settings —————

  const settings = { grid: false, marks: true, clips: false, grain: true, dither: false, singleLine: false, jitter: true, color: true };

  // the boil: the type steps through turbulence frames at ~8fps, like
  // lettering redrawn on every frame of a stop-motion film
  const boilTurb = document.getElementById("boil-turb");
  let boilTimer = null;
  function setBoil(on) {
    clearInterval(boilTimer);
    boilTimer = null;
    if (on && !reducedMotion) {
      let frame = 1;
      boilTimer = setInterval(() => {
        frame = (frame % 12) + 1;
        boilTurb.setAttribute("seed", frame);
      }, 125);
    }
  }

  // ordered Bayer dithering in the sheet's own tones; cached per source.
  // the working canvas is small on purpose (each cell lands on roughly
  // 2 CSS pixels once cover-stretched), and the tones are prepared
  // before thresholding: a percentile stretch so every negative spans
  // the full range, and an S-curve pushing midtones apart — without
  // this, midtone-heavy frames collapse into one uniform checkerboard
  // and nothing reads. the 8x8 matrix gives 64 tone steps, so what
  // survives is structure rather than noise
  const BAYER8 = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21],
  ];
  const ditherCache = new Map();
  function ditherize(img) {
    const maxW = Math.max(96, Math.round(innerWidth / 2));
    const key = `${img.src}@${maxW}`;
    if (ditherCache.has(key)) return ditherCache.get(key);
    try {
      const s = Math.min(1, maxW / img.naturalWidth);
      const w = Math.round(img.naturalWidth * s);
      const h = Math.round(img.naturalHeight * s);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h);
      // pass 1: luminance and its histogram
      const lum = new Float32Array(w * h);
      const hist = new Uint32Array(256);
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        const l = 0.2126 * d.data[i] + 0.7152 * d.data[i + 1] + 0.0722 * d.data[i + 2];
        lum[p] = l;
        hist[l | 0]++;
      }
      // 2nd/98th percentile stretch: the plate earns its full range
      const total = w * h;
      let lo = 0, hi = 255, acc = 0;
      for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= total * 0.02) { lo = i; break; } }
      acc = 0;
      for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= total * 0.02) { hi = i; break; } }
      const range = Math.max(1, hi - lo);
      // pass 2: stretch, S-curve, threshold
      for (let p = 0; p < w * h; p++) {
        let v = (lum[p] - lo) / range;
        v = v < 0 ? 0 : v > 1 ? 1 : v;
        v = v * v * (3 - 2 * v); // smoothstep: midtones part ways
        const x = p % w, y = (p / w) | 0;
        const out = v > (BAYER8[y & 7][x & 7] + 0.5) / 64 ? 236 : 18;
        const i = p * 4;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = out;
      }
      ctx.putImageData(d, 0, 0);
      const url = c.toDataURL("image/png");
      ditherCache.set(key, url);
      return url;
    } catch { return img.src; }
  }

  // what the page should actually paint for the current negative
  const displaySrc = () =>
    settings.dither && current.img ? ditherize(current.img) : current.neg.src;

  function applyNegativeSrc() {
    const src = displaySrc();
    if (stripMode() && frontBg.querySelector(".tile")) morphStrip(src);
    else setLayerImage(frontBg, src);
    for (const el of grid.querySelectorAll(".frag"))
      el.style.setProperty("--img", `url("${src}")`);
  }

  // ————— the regeneration choreography —————

  let busy = false;
  let layoutCount = 0;
  let currentSeed = newSeed();
  let frontBg = bgA;
  let current = { layout: null, neg: null, img: null };

  function setBusy(on) {
    busy = on;
    panel.classList.toggle("is-busy", on);
  }

  async function render(firstRun = false, keepNegative = false) {
    if (busy || !NEGATIVES.length) return;
    setBusy(true);

    const layout = generate(currentSeed);
    if (keepNegative && current.neg) layout.negative = current.neg;
    const { cols, rows } = layout.cfg;
    root.style.setProperty("--cols", cols);
    root.style.setProperty("--rows", rows);

    let neg = layout.negative;
    // negatives deal from the shuffled deck: no repeats until the
    // whole archive has been seen
    if (!keepNegative) {
      neg = nextNegative();
      layout.negative = neg;
    }

    // the old sheet holds until the next negative is ready; the panel
    // spinner is the only sign that a new deal is coming
    let img = keepNegative && current.img ? current.img : await loadNegative(neg.src);
    // a negative that will not load leaves the sheet black; fall through
    // the manifest until one arrives
    if (!img) {
      const start = NEGATIVES.indexOf(neg);
      for (let k = 1; k < NEGATIVES.length && !img; k++) {
        neg = NEGATIVES[(start + k) % NEGATIVES.length];
        img = await loadNegative(neg.src, 6000);
      }
    }
    // the outgoing sheet must keep ITS geometry while it fades: freeze
    // the front layer and the exiting clippings to their computed
    // values before the new negative's cover math lands on the vars
    const freeze = (el) => {
      const cs = getComputedStyle(el);
      el.style.backgroundSize = cs.backgroundSize;
      el.style.backgroundPosition = cs.backgroundPosition;
    };
    freeze(frontBg);
    grid.querySelectorAll(".frag").forEach(freeze);

    negDims = img
      ? { iw: img.naturalWidth, ih: img.naturalHeight }
      : { iw: innerWidth, ih: innerHeight };
    applyCover();
    current = { layout, neg, img };

    const src = displaySrc();
    const { frag, cells } = buildCells(layout, src);

    // one continuous dissolve: the next negative fades in WHILE the old
    // sheet clears above it, and the new sheet lands on the tail of the
    // crossfade rather than after a blank beat
    const sameImage = keepNegative && frontBg.dataset.src === src;
    if (!sameImage) {
      if (stripMode() && !firstRun && frontBg.querySelector(".tile")) {
        morphStrip(src);
      } else {
        const back = frontBg === bgA ? bgB : bgA;
        // the incoming layer follows the live cover vars again
        back.style.backgroundSize = "";
        back.style.backgroundPosition = "";
        setLayerImage(back, src);
        if (firstRun) back.classList.add("is-first");
        await nextFrame();
        back.classList.add("is-on");
        frontBg.classList.remove("is-on");
        frontBg = back;
      }
    }

    const old = [...grid.children];
    if (old.length && !reducedMotion) {
      old.forEach((el, i) => {
        el.style.setProperty("--d", `${i * 10}ms`);
        el.classList.remove("is-in");
        el.classList.add("is-out");
      });
      [...marksLayer.children].forEach((el) => {
        el.style.setProperty("--d", "0ms");
        el.classList.remove("is-in");
      });
      await wait(old.length * 10 + 480);
    }

    buildUnderlay(layout);
    buildMarks(layout);
    grid.classList.remove("is-settled");
    grid.replaceChildren(frag);
    await nextFrame();
    cells.forEach((el) => {
      if ((settings.clips && !stripMode()) || !el.classList.contains("frag")) el.classList.add("is-in");
    });
    [...marksLayer.children].forEach((el) => el.classList.add("is-in"));

    layoutCount += 1;
    retype(seedEl, layout.seed);
    retype(layoutNoEl, `№ ${String(layoutCount).padStart(3, "0")}`);
    retype(gridSpecEl, `${cols} × ${rows}`);
    retype(frameCountEl, layout.frags.length);
    retype(negInfoEl, `${neg.author} — ${neg.title}, ${neg.year}`);
    negInfoEl.href = neg.page;
    retype(negLicEl, neg.lic);

    const settleMs = reducedMotion ? 0 : cols * 22 + rows * 30 + 900;
    await wait(settleMs);
    grid.classList.add("is-settled");
    bgA.classList.remove("is-first");
    bgB.classList.remove("is-first");

    setBusy(false);
  }

  function regenerate() {
    if (busy) return;
    currentSeed = newSeed();
    render();
  }

  function regenerateCopy() {
    if (busy) return;
    currentSeed = newSeed();
    render(false, true);
  }

  // a new negative under the SAME layout: crossfade only, cells stay
  async function replacePhoto() {
    if (busy || !current.layout || !NEGATIVES.length) return;
    setBusy(true);
    const next = nextNegative();
    const img = await loadNegative(next.src);
    if (img) {
      const cs = getComputedStyle(frontBg);
      frontBg.style.backgroundSize = cs.backgroundSize;
      frontBg.style.backgroundPosition = cs.backgroundPosition;
      current.neg = next;
      current.img = img;
      current.layout.negative = next;
      negDims = { iw: img.naturalWidth, ih: img.naturalHeight };
      applyCover();
      const src = displaySrc();
      if (stripMode() && frontBg.querySelector(".tile")) {
        morphStrip(src);
      } else {
        const back = frontBg === bgA ? bgB : bgA;
        back.style.backgroundSize = "";
        back.style.backgroundPosition = "";
        setLayerImage(back, src);
        await nextFrame();
        back.classList.add("is-on");
        frontBg.classList.remove("is-on");
        frontBg = back;
      }
      for (const el of grid.querySelectorAll(".frag"))
        el.style.setProperty("--img", `url("${src}")`);
      retype(negInfoEl, `${next.author} — ${next.title}, ${next.year}`);
      negInfoEl.href = next.page;
      retype(negLicEl, next.lic);
      await wait(reducedMotion ? 0 : 1300);
    }
    setBusy(false);
  }

  // ————— export: redraw the sheet onto a canvas, pixel for pixel —————

  async function exportPng() {
    if (!current.img || !current.layout) return;
    await document.fonts.load(`500 ${parseFloat(getComputedStyle(root).getPropertyValue("--fs"))}px "Geist Mono"`).catch(() => {});
    const S = Math.min(2, devicePixelRatio || 1) * 1.5;
    const W = Math.round(innerWidth * S), H = Math.round(innerHeight * S);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");

    // source: the negative (or its dithered form), cover-cropped
    let source = current.img;
    if (settings.dither) {
      const dimg = new Image();
      dimg.src = ditherize(current.img);
      await new Promise((r) => { dimg.onload = r; dimg.onerror = r; });
      if (dimg.naturalWidth) source = dimg;
    }
    const iw = source.naturalWidth, ih = source.naturalHeight;
    const cover = Math.max(innerWidth / iw, innerHeight / ih);
    const sw = innerWidth / cover, sh = innerHeight / cover;
    const sx0 = (iw - sw) / 2, sy0 = (ih - sh) / 2;
    ctx.imageSmoothingQuality = "high";
    // the dithered plate must upscale with hard pixel edges
    ctx.imageSmoothingEnabled = !settings.dither;
    // the export prints in the viewer's appearance: night or paper
    const LIGHT = matchMedia("(prefers-color-scheme: light)").matches;
    const INK = LIGHT ? "#0c0b0a" : "#ffffff";
    const monoFilter = settings.color ? "none" : "grayscale(1) contrast(1.15)";
    const isStrip = stripMode();
    const sg = isStrip ? stripGeom(iw, ih) : null;
    if (isStrip) {
      // desktop: the whole frame repeated on the night ground
      ctx.fillStyle = LIGHT ? "#f4f2ef" : "#0c0b0a";
      ctx.fillRect(0, 0, W, H);
      ctx.filter = monoFilter;
      for (let i = 0; i < sg.n; i++) {
        const x = sg.startX + i * (sg.tileW + STRIP_GAP);
        ctx.drawImage(source, 0, 0, iw, ih, x * S, STRIP_PAD * S, sg.tileW * S, sg.tileH * S);
      }
      ctx.filter = "none";
    } else {
      ctx.filter = monoFilter;
      ctx.drawImage(source, sx0, sy0, sw, sh, 0, 0, W, H);
      ctx.filter = "none";
    }

    const veil = LIGHT ? "rgba(244, 242, 239, 0.26)" : "rgba(10, 9, 8, 0.26)";
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, W, H);

    // clippings: same crop math as the CSS, veil included
    const fragEls = [...grid.querySelectorAll(".frag")];
    const stageBox = stage.getBoundingClientRect();
    const { cols, rows } = current.layout.cfg;
    if (settings.clips && isStrip) {
      // per-tile clips, from the same datasets that placed them
      frontBg.querySelectorAll(".clip").forEach((c) => {
        const ti = +c.dataset.tile;
        const cellW = sg.tileW / CLIP_C, cellH = sg.tileH / CLIP_R;
        const tileX = sg.startX + ti * (sg.tileW + STRIP_GAP);
        const dx = (tileX + c.dataset.cx * cellW) * S;
        const dy = (STRIP_PAD + c.dataset.cy * cellH) * S;
        const dw = c.dataset.cw * cellW * S, dh = c.dataset.ch * cellH * S;
        ctx.filter = monoFilter;
        ctx.drawImage(
          source,
          (c.dataset.sx * iw) / CLIP_C, (c.dataset.sy * ih) / CLIP_R,
          (c.dataset.cw * iw) / CLIP_C, (c.dataset.ch * ih) / CLIP_R,
          dx, dy, dw, dh
        );
        ctx.filter = "none";
        ctx.fillStyle = veil;
        ctx.fillRect(dx, dy, dw, dh);
      });
    } else if (settings.clips) current.layout.frags.forEach((f, i) => {
      const el = fragEls[i];
      if (!el) return;
      const r = el.getBoundingClientRect();
      const srcVpX = stageBox.left + (stageBox.width * f.sx) / cols;
      const srcVpY = stageBox.top + (stageBox.height * f.sy) / rows;
      ctx.filter = monoFilter;
      ctx.drawImage(
        source,
        sx0 + srcVpX / cover, sy0 + srcVpY / cover, r.width / cover, r.height / cover,
        r.left * S, r.top * S, r.width * S, r.height * S
      );
      ctx.filter = "none";
      ctx.fillStyle = veil;
      ctx.fillRect(r.left * S, r.top * S, r.width * S, r.height * S);
    });

    // grid lines, if revealed
    if (settings.grid) {
      ctx.strokeStyle = LIGHT ? "rgba(12, 11, 10, 0.16)" : "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = S;
      for (let i = 0; i <= cols; i++) {
        const x = (stageBox.left + (stageBox.width * i) / cols) * S;
        ctx.beginPath(); ctx.moveTo(x, stageBox.top * S); ctx.lineTo(x, stageBox.bottom * S); ctx.stroke();
      }
      for (let j = 0; j <= rows; j++) {
        const y = (stageBox.top + (stageBox.height * j) / rows) * S;
        ctx.beginPath(); ctx.moveTo(stageBox.left * S, y); ctx.lineTo(stageBox.right * S, y); ctx.stroke();
      }
    }

    // registration crosses at the anchor intersections
    const FS = parseFloat(getComputedStyle(root).getPropertyValue("--fs")) || 10;
    if (settings.marks) {
      ctx.fillStyle = INK;
      ctx.font = `400 ${FS * S}px "Geist Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const ax of current.layout.anchorCols) {
        if (ax === 0) continue;
        for (const ay of current.layout.anchorRows) {
          if (ay === 0) continue;
          ctx.fillText(
            "+",
            (stageBox.left + (stageBox.width * ax) / cols) * S,
            (stageBox.top + (stageBox.height * ay) / rows) * S
          );
        }
      }
      ctx.textAlign = "start";
    }

    // every piece of type, straight from the DOM — at the live --fs
    const fs = FS * S;
    ctx.textBaseline = "top";
    // canvas twins of the hairline copy icons
    const drawIcon = (name, x, y, size, rot) => {
      const u = size / 12;
      ctx.save();
      ctx.translate(x + size / 2, y + size / 2);
      ctx.strokeStyle = INK;
      ctx.lineWidth = u;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      if (name === "sun") {
        ctx.arc(0, 0, 2.4 * u, 0, Math.PI * 2);
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          ctx.moveTo(Math.cos(a) * 3.8 * u, Math.sin(a) * 3.8 * u);
          ctx.lineTo(Math.cos(a) * 5.4 * u, Math.sin(a) * 5.4 * u);
        }
      } else if (name === "peak") {
        ctx.moveTo(-4.8 * u, 3.5 * u);
        ctx.lineTo(-1.2 * u, -2.4 * u);
        ctx.lineTo(0.9 * u, 0.9 * u);
        ctx.lineTo(2.3 * u, -1 * u);
        ctx.lineTo(4.8 * u, 3.5 * u);
      } else {
        ctx.rotate(((rot || 0) * Math.PI) / 180);
        ctx.moveTo(0, 4.4 * u);
        ctx.lineTo(0, -4.1 * u);
        ctx.moveTo(-2.6 * u, -1.5 * u);
        ctx.lineTo(0, -4.1 * u);
        ctx.lineTo(2.6 * u, -1.5 * u);
      }
      ctx.stroke();
      ctx.restore();
    };
    const drawText = (el, vertical = false) => {
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") return;
      const r = el.getBoundingClientRect();
      ctx.fillStyle = INK;
      ctx.font = `${cs.fontWeight} ${fs}px "Geist Mono", monospace`;
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${0.06 * fs}px`;
      const lines = el.textContent.split("\n").map((l) => l.trim()).filter(Boolean);
      const lh = fs * 1.55;
      if (vertical) {
        ctx.save();
        ctx.translate(r.right * S - 8 * S, r.top * S + 8 * S);
        ctx.rotate(Math.PI / 2);
        lines.forEach((l, k) => ctx.fillText(l.toUpperCase(), 0, k * lh));
        ctx.restore();
      } else if (el.dataset.pill) {
        // the ring's border sits on the column line where bare type
        // starts; the token indents 8px inside it on both ends
        const text = (lines[0] || "").toUpperCase();
        const iconW = el.dataset.icon ? (12 + 6) * S : 0;
        const w = ctx.measureText(text).width + iconW + 16 * S;
        const h = (FS + 10) * S; // 1px line + ~4px breath around the type
        const x0 = r.left * S + 8 * S, y0 = r.top * S + 3 * S;
        ctx.strokeStyle = INK;
        ctx.lineWidth = S;
        ctx.beginPath();
        ctx.roundRect(x0 + S / 2, y0 + S / 2, w - S, h - S, h / 2);
        ctx.stroke();
        let x = r.left * S + 16 * S;
        if (el.dataset.icon) {
          drawIcon(el.dataset.icon, x, y0 + (h - 12 * S) / 2, 12 * S, +el.dataset.rot || 0);
          x += iconW;
        }
        ctx.fillText(text, x, r.top * S + 8 * S);
      } else {
        let x = r.left * S + 8 * S;
        if (el.dataset.icon) {
          const size = 12 * S;
          drawIcon(el.dataset.icon, x, r.top * S + 8 * S + (lh - size) / 2, size, +el.dataset.rot || 0);
          x += size + 6 * S;
        }
        lines.forEach((l, k) => ctx.fillText(l.toUpperCase(), x, r.top * S + 8 * S + k * lh));
      }
    };
    grid.querySelectorAll(".cp").forEach((el) => drawText(el, el.classList.contains("cp--vert")));
    grid.querySelectorAll(".frag__no").forEach((el) => {
      const r = el.getBoundingClientRect();
      ctx.fillStyle = INK;
      ctx.font = `500 ${fs}px "Geist Mono", monospace`;
      ctx.fillText(el.textContent, r.left * S, r.top * S);
    });
    document.querySelectorAll(".chrome--tl span, .chrome--tr span, .chrome--bl span, .chrome--bl a").forEach((el) => {
      // nested spans (№, seed, grid spec) already ride inside their
      // parent line's textContent; drawing them again doubles the type
      if (!el.parentElement.classList.contains("chrome")) return;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      ctx.fillStyle = INK;
      ctx.font = `${cs.fontWeight} ${fs}px "Geist Mono", monospace`;
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${0.05 * fs}px`;
      ctx.fillText(el.textContent.toUpperCase(), r.left * S, r.top * S + 1 * S);
    });

    // grain, if on
    if (settings.grain) {
      const n = document.createElement("canvas");
      n.width = 128; n.height = 128;
      const nctx = n.getContext("2d");
      const nd = nctx.createImageData(128, 128);
      for (let i = 0; i < nd.data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        nd.data[i] = nd.data[i + 1] = nd.data[i + 2] = v;
        nd.data[i + 3] = 255;
      }
      nctx.putImageData(nd, 0, 0);
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = ctx.createPattern(n, "repeat");
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // iOS Safari silently drops data-URL downloads; hand over a real
    // blob — via the share sheet on touch (Save Image → Photos), via a
    // blob-URL download everywhere else
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    if (!blob) return;
    const name = `${TRIP}-${seedEl.textContent}.png`;
    const file = new File([blob], name, { type: "image/png" });
    if (matchMedia("(pointer: coarse)").matches && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (e) {
        if (e.name === "AbortError") return; // user closed the sheet
        // activation expired or share refused: fall through to download
      }
    }
    const a = document.createElement("a");
    a.download = name;
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // ————— the panel —————

  // the foot of the panel blurs while content remains below the fold;
  // the hint dissolves in the last 48px of scroll
  const panelBody = panel.querySelector(".panel__body");
  function updateScrollHint() {
    const remaining = panelBody.scrollHeight - panelBody.scrollTop - panelBody.clientHeight;
    panel.style.setProperty("--scroll-hint", Math.max(0, Math.min(1, remaining / 48)).toFixed(3));
  }
  panelBody.addEventListener("scroll", updateScrollHint, { passive: true });
  addEventListener("resize", updateScrollHint);

  // ————— the chip hides until summoned: press and hold anywhere —————

  const holdRing = document.getElementById("holdring");
  const ringProg = holdRing.querySelector(".holdring__progress");
  const RING_LEN = 97.39;
  const HOLD_MS = 3000;
  let hold = null;
  let chipTimer = null;
  let suppressClick = false;

  function showChip() {
    clearTimeout(chipTimer);
    document.body.classList.add("chip-on");
  }
  function scheduleChipHide(ms) {
    clearTimeout(chipTimer);
    chipTimer = setTimeout(() => {
      if (!panel.classList.contains("is-open"))
        document.body.classList.remove("chip-on");
    }, ms);
  }

  function cancelHold() {
    if (!hold) return;
    clearTimeout(hold.timer);
    hold = null;
    holdRing.classList.remove("is-on");
    ringProg.style.transition = "none";
    ringProg.style.strokeDashoffset = RING_LEN;
  }

  stage.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary || panel.classList.contains("is-open")) return;
    if (document.body.classList.contains("chip-on")) return;
    ringProg.style.transition = "none";
    ringProg.style.strokeDashoffset = RING_LEN;
    holdRing.classList.add("is-on");
    // the fill must start from empty: flush the reset, then ease to full
    requestAnimationFrame(() => {
      if (!hold) return;
      ringProg.style.transition = `stroke-dashoffset ${HOLD_MS}ms linear`;
      ringProg.style.strokeDashoffset = "0";
    });
    hold = {
      x: e.clientX, y: e.clientY,
      timer: setTimeout(() => {
        hold = null;
        showChip();
        scheduleChipHide(8000);
        suppressClick = true; // the release must not poke a clipping
        // the filled ring IS the chip's outline: the chip fades in on
        // top of it, and only then does the ring retire, unseen
        setTimeout(() => {
          holdRing.classList.remove("is-on");
          setTimeout(() => {
            ringProg.style.transition = "none";
            ringProg.style.strokeDashoffset = RING_LEN;
          }, 240);
        }, 360);
      }, HOLD_MS),
    };
  });
  stage.addEventListener("pointermove", (e) => {
    if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > 12) cancelHold();
  });
  stage.addEventListener("pointerup", cancelHold);
  stage.addEventListener("pointercancel", cancelHold);
  // android's long-press menu would break the hold mid-fill
  stage.addEventListener("contextmenu", (e) => { if (hold) e.preventDefault(); });
  stage.addEventListener("click", (e) => {
    if (suppressClick) {
      suppressClick = false;
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  function openPanel() {
    showChip();
    panel.classList.add("is-open");
    settingsBtn.setAttribute("aria-expanded", "true");
    panel.focus({ preventScroll: true });
    requestAnimationFrame(updateScrollHint);
  }
  function closePanel() {
    panel.classList.remove("is-open");
    settingsBtn.setAttribute("aria-expanded", "false");
    settingsBtn.focus({ preventScroll: true });
    scheduleChipHide(2500);
  }
  // the same spot opens and closes
  settingsBtn.addEventListener("click", () =>
    panel.classList.contains("is-open") ? closePanel() : openPanel()
  );

  function applySetting(key, on) {
    settings[key] = on;
    if (key === "grid") document.body.classList.toggle("grid-on", on);
    if (key === "clips") {
      document.body.classList.toggle("clips-on", on);
      if (stripMode()) buildTileClips(frontBg);
      else [...grid.querySelectorAll(".frag")].forEach((el, i) => {
        el.style.setProperty("--d", `${reducedMotion ? 0 : i * 70}ms`);
        el.classList.remove("is-out");
        if (on) {
          el.classList.add("is-in");
        } else {
          el.classList.remove("is-in");
          el.classList.add("is-out");
          setTimeout(() => el.classList.remove("is-out"), 720);
        }
      });
    }
    if (key === "marks") document.body.classList.toggle("marks-off", !on);
    if (key === "grain") document.body.classList.toggle("grain-off", !on);
    if (key === "singleLine") document.body.classList.toggle("single-line", on);
    if (key === "jitter") {
      document.body.classList.toggle("jitter-on", on);
      setBoil(on);
    }
    if (key === "color") document.body.classList.toggle("color-on", on);
    if (key === "dither") {
      document.body.classList.toggle("dither-on", on);
      if (current.img) applyNegativeSrc();
    }
    const tgl = panel.querySelector(`[data-setting="${key}"]`);
    if (tgl) tgl.setAttribute("aria-checked", String(on));
  }
  panel.querySelectorAll(".tgl").forEach((tgl) => {
    tgl.addEventListener("click", () => {
      const key = tgl.dataset.setting;
      applySetting(key, tgl.getAttribute("aria-checked") !== "true");
    });
  });

  document.getElementById("act-photo").addEventListener("click", replacePhoto);
  document.getElementById("act-copy").addEventListener("click", regenerateCopy);
  document.getElementById("act-all").addEventListener("click", regenerate);
  document.getElementById("act-export").addEventListener("click", exportPng);

  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "escape") return closePanel();
    if (k === "r") regenerate();
    if (k === "g") applySetting("grid", !settings.grid);
    if (k === "s") panel.classList.contains("is-open") ? closePanel() : openPanel();
  });

  // ————— gestures: swipe shuffles on touch, double-click on desktop —————

  let swipe = null;
  stage.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch" || !e.isPrimary || panel.classList.contains("is-open")) return;
    swipe = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  stage.addEventListener("pointerup", (e) => {
    if (!swipe || e.pointerType !== "touch") return;
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    const dt = performance.now() - swipe.t;
    swipe = null;
    // a deliberate horizontal flick, not a stray tap or vertical drag
    if (Math.abs(dx) > 72 && Math.abs(dx) > 1.6 * Math.abs(dy) && dt < 700) regenerate();
  });
  stage.addEventListener("pointercancel", () => { swipe = null; });

  stage.addEventListener("dblclick", () => {
    if (matchMedia("(pointer: fine)").matches) regenerate();
  });

  // ————— light-table cursor (fine pointers) —————

  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const vLine = crosshair.querySelector(".crosshair__v");
    const hLine = crosshair.querySelector(".crosshair__h");
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

    const tick = () => {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      vLine.style.transform = `translateX(${cx}px)`;
      hLine.style.transform = `translateY(${cy}px)`;
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.3) raf = requestAnimationFrame(tick);
      else raf = null;
    };

    stage.addEventListener("pointermove", (e) => {
      const box = stage.getBoundingClientRect();
      tx = e.clientX;
      ty = e.clientY;
      const { cols, rows } = config();
      const c = Math.min(cols, Math.max(1, Math.ceil(((e.clientX - box.left) / box.width) * cols)));
      const r = Math.min(rows, Math.max(1, Math.ceil(((e.clientY - box.top) / box.height) * rows)));
      readoutEl.textContent = `C·${String(c).padStart(2, "0")} R·${String(r).padStart(2, "0")}`;
      crosshair.classList.add("is-on");
      if (!raf) raf = requestAnimationFrame(tick);
    });
    stage.addEventListener("pointerleave", () => {
      crosshair.classList.remove("is-on");
      readoutEl.textContent = "C·— R·—";
    });
  }

  // ————— the strip drifts toward the cursor (desktop only) —————

  if (matchMedia("(hover: hover) and (pointer: fine)").matches && !reducedMotion) {
    addEventListener("pointermove", (e) => {
      if (!stripMode()) return;
      panT = -(e.clientX / innerWidth - 0.5) * 2 * panLimit; // edge to edge across the whole strip
      kickPan();
    });
  }

  // ————— resize: cover-fit follows the viewport live —————

  addEventListener("resize", () => {
    setViewportVars();
    applyCover();
    // the strip's tile count and size follow the viewport
    if (stripMode() && frontBg.dataset.src) setLayerImage(frontBg, frontBg.dataset.src);
  });

  smallScreen.addEventListener("change", () => { if (!busy) render(); });

  // the boil is part of the sheet's voice: on from the first frame
  applySetting("jitter", true);

  loadManifest().then(
    () => render(true),
    (e) => console.error("barcelona: manifest failed to load", e)
  );
})();
