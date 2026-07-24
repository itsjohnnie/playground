/* gomis · un negatiu, una graella
   one photograph fills the page; cells carry displaced crops of the SAME
   image, resolved by a hidden grid. the negatives are real: public-domain
   photographs by Eugène Atget (CC0 scans, National Gallery of Art) and
   Josep Brangulí (pre-1930 Barcelona, public domain), self-hosted in
   negatives/ (see SOURCES.md) and credited on the sheet. */

(() => {
  "use strict";

  const stage = document.getElementById("stage");
  const grid = document.getElementById("grid");
  const underlay = document.getElementById("underlay");
  const bgA = document.getElementById("bg-a");
  const bgB = document.getElementById("bg-b");
  const settingsBtn = document.getElementById("settings");
  const panel = document.getElementById("panel");
  const panelClose = document.getElementById("panel-close");
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
  const NOTES = ["NO DOBLAR", "PROVA · NO IMPRIMIR", "SENSE ORDENAR", "MANTENIR PLA", "SEGONA PASSADA", "ESCANEJAT DOS COPS", "POLS AL NEGATIU", "FUGA DE LLUM, GUARDADA", "VORA CREMADA", "FIXAR VORA ESQUERRA"];
  const MONTHS = ["GEN", "FEB", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OCT", "NOV", "DES"];

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
      case "film": return m ? `${m.film}\n${m.iso}` : `${pick(rng, FILM)}\nROTLLE ${String(irange(rng, 1, 24)).padStart(2, "0")}`;
      case "gps": return m ? m.gps : fmtGps(rng);
      case "note": return pick(rng, NOTES);
      case "index": return `FT ${String(irange(rng, 1, 412)).padStart(3, "0")} →`;
      case "contact": return `RETALL ${String(irange(rng, 1, ctx.frags)).padStart(2, "0")}/${ctx.frags}`;
      case "date": return m ? m.date : `${fmtDate(rng)}\n${fmtTime(rng)}`;
      case "meter": return fmtEv(rng);
      default: return pick(rng, NOTES);
    }
  }
  const COPY_KINDS = ["place", "spec", "film", "gps", "note", "index", "contact", "date", "meter"];

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

  // ————— the negatives: real photographs, public domain, credited —————

  const COMMONS = "https://commons.wikimedia.org/wiki/File:";
  const NEGATIVES = [
    { author: "EUGÈNE ATGET", title: "AU PETIT DUNKERQUE", year: 1900, lic: "CC0",
      src: "negatives/atget-dunkerque-1900.jpg",
      page: COMMONS + "Eug%C3%A8ne_Atget,_Au_Petit_Dunkerque,_3_quai_Conti,_1900,_NGA_124962.jpg" },
    { author: "EUGÈNE ATGET", title: "MAGASIN, AV. DES GOBELINS", year: 1925, lic: "CC0",
      src: "negatives/atget-gobelins-1925.jpg",
      page: COMMONS + "Eug%C3%A8ne_Atget,_Magasin,_Avenue_des_Gobelins,_1925,_NGA_92719.jpg" },
    { author: "EUGÈNE ATGET", title: "NOTRE-DAME", year: 1922, lic: "CC0",
      src: "negatives/atget-notredame-1922.jpg",
      page: COMMONS + "Eug%C3%A8ne_Atget,_Notre-Dame,_1922,_NGA_124979.jpg" },
    { author: "EUGÈNE ATGET", title: "PARC DE SCEAUX", year: 1925, lic: "CC0",
      src: "negatives/atget-sceaux-1925.jpg",
      page: COMMONS + "Eug%C3%A8ne_Atget,_Parc_de_Sceaux,_1925,_NGA_124991.jpg" },
    { author: "EUGÈNE ATGET", title: "PONT MARIE", year: 1926, lic: "CC0",
      src: "negatives/atget-pontmarie-1926.jpg",
      page: COMMONS + "Eug%C3%A8ne_Atget,_Pont_Marie,_1926,_NGA_124989.jpg" },
    { author: "EUGÈNE ATGET", title: "SAINT-CLOUD", year: 1922, lic: "CC0",
      src: "negatives/atget-saintcloud-1922.jpg",
      page: COMMONS + "Eug%C3%A8ne_Atget,_Saint-Cloud,_1922,_NGA_124980.jpg" },
    { author: "EUGÈNE ATGET", title: "STEPS AT SAINT-CLOUD", year: 1906, lic: "CC0",
      src: "negatives/atget-steps-1906.jpg",
      page: COMMONS + "Eug%C3%A8ne_Atget,_The_Steps_at_Saint-Cloud,_1906,_NGA_106293.jpg" },
    { author: "JOSEP BRANGULÍ", title: "SANT PERE MÉS ALT, BCN", year: 1913, lic: "DOMINI PÚBLIC",
      src: "negatives/branguli-santpere-1913.jpg",
      page: COMMONS + "Sant_Pere_m%C3%A9s_alt-Via_Laietana.jpg" },
    { author: "JOSEP BRANGULÍ", title: "AIGUAT DEL MASNOU", year: 1909, lic: "DOMINI PÚBLIC",
      src: "negatives/branguli-masnou-1909.jpg",
      page: COMMONS + "Aiguat_del_Masnou_1909_-_Carrer.jpg" },
    { author: "JOSEP BRANGULÍ", title: "CARRER PINTOR FORTUNY, BCN", year: 1930, lic: "DOMINI PÚBLIC",
      src: "negatives/branguli-fortuny-1930.jpg",
      page: COMMONS + "Carrer_Pintor_Fortuny.jpg" },
    // johnnie's own frames: real EXIF drives the micro-copy for these
    { author: "JOHNNIE", title: "TOSSA DE MAR", year: 2026, lic: "ARXIU PROPI",
      src: "negatives/johnnie-tossa-2026.jpg", page: "https://johnnies.life",
      meta: { place: "TOSSA DE MAR", time: "12:07", date: "JUL 18\n12:07",
              gps: "41.7512° N\n2.9657° E", spec: "F 1.8 · 1/6400", lens: "24MM",
              film: "IPHONE 17 PRO", iso: "ISO 80" } },
    { author: "JOHNNIE", title: "CALA FUTADERA", year: 2026, lic: "ARXIU PROPI",
      src: "negatives/johnnie-futadera-2026.jpg", page: "https://johnnies.life",
      meta: { place: "CALA FUTADERA", time: "12:25", date: "JUL 18\n12:25",
              gps: "41.7614° N\n2.9784° E", spec: "F 1.8 · 1/3200", lens: "48MM",
              film: "IPHONE 17 PRO", iso: "ISO 100" } },
    { author: "JOHNNIE", title: "CALA GIVEROLA I", year: 2026, lic: "ARXIU PROPI",
      src: "negatives/johnnie-giverola-1-2026.jpg", page: "https://johnnies.life",
      meta: { place: "CALA GIVEROLA", time: "12:29", date: "JUL 18\n12:29",
              gps: "41.7597° N\n2.9819° E", spec: "F 1.8 · 1/8000", lens: "48MM",
              film: "IPHONE 17 PRO", iso: "ISO 64" } },
    { author: "JOHNNIE", title: "CALA GIVEROLA II", year: 2026, lic: "ARXIU PROPI",
      src: "negatives/johnnie-giverola-2-2026.jpg", page: "https://johnnies.life",
      meta: { place: "CALA GIVEROLA", time: "17:08", date: "JUL 18\n17:08",
              gps: "41.7598° N\n2.9812° E", spec: "F 1.8 · 1/6400", lens: "48MM",
              film: "IPHONE 17 PRO", iso: "ISO 64" } },
    { author: "JOHNNIE", title: "EIXAMPLE, BCN", year: 2026, lic: "ARXIU PROPI",
      src: "negatives/johnnie-eixample-2026.jpg", page: "https://johnnies.life",
      meta: { place: "EIXAMPLE", time: "12:18", date: "JUL 23\n12:18",
              gps: "41.3917° N\n2.1649° E", spec: "F 2.8 · 1/800", lens: "100MM",
              film: "IPHONE 17 PRO", iso: "ISO 20" } },
  ];

  function loadNegative(url, timeout = 9000) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => (img.decode ? img.decode().then(() => resolve(img), () => resolve(img)) : resolve(img));
      img.onerror = () => resolve(null);
      img.src = url;
      setTimeout(() => resolve(null), timeout);
    });
  }

  // cover-fit: the negative keeps its own aspect and crops to the viewport;
  // --dw/--dh/--ox/--oy drive the body layers AND every clipping's crop math
  let negDims = null;
  function applyCover() {
    if (!negDims) return;
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

    layout.copies.forEach((c) => {
      const el = document.createElement("div");
      el.className = "cp";
      if (c.strong || layout.rng() < 0.3) el.classList.add("cp--strong");
      if (c.vert) el.classList.add("cp--vert");
      el.style.gridColumn = `${c.x + 1} / span ${c.w}`;
      el.style.gridRow = `${c.y + 1} / span ${c.h}`;
      el.style.setProperty("--d", `${enterDelay(c.x, c.y)}ms`);
      el.textContent = copyText(layout.rng, c.kind, { frags: layout.frags.length, meta: layout.negative.meta });
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

  // ————— settings —————

  const settings = { grid: false, marks: true, grain: true, dither: false, singleLine: false };

  // ordered 4x4 Bayer dithering in the sheet's own tones; cached per source
  const ditherCache = new Map();
  function ditherize(img) {
    const key = img.src;
    if (ditherCache.has(key)) return ditherCache.get(key);
    try {
      const maxW = 1400;
      const s = Math.min(1, maxW / img.naturalWidth);
      const w = Math.round(img.naturalWidth * s);
      const h = Math.round(img.naturalHeight * s);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h);
      const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const lum = 0.2126 * d.data[i] + 0.7152 * d.data[i + 1] + 0.0722 * d.data[i + 2];
          const v = lum > ((B[y & 3][x & 3] + 0.5) / 16) * 255 ? 236 : 18;
          d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
        }
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
    frontBg.style.backgroundImage = `url("${src}")`;
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
    if (busy) return;
    setBusy(true);

    const layout = generate(currentSeed);
    if (keepNegative && current.neg) layout.negative = current.neg;
    const { cols, rows } = layout.cfg;
    root.style.setProperty("--cols", cols);
    root.style.setProperty("--rows", rows);

    let neg = layout.negative;

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
    const sameImage = keepNegative && frontBg.style.backgroundImage.includes(src.slice(0, 80));
    if (!sameImage) {
      const back = frontBg === bgA ? bgB : bgA;
      back.style.backgroundImage = `url("${src}")`;
      if (firstRun) back.classList.add("is-first");
      await nextFrame();
      back.classList.add("is-on");
      frontBg.classList.remove("is-on");
      frontBg = back;
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
    cells.forEach((el) => el.classList.add("is-in"));
    [...marksLayer.children].forEach((el) => el.classList.add("is-in"));

    layoutCount += 1;
    seedEl.textContent = layout.seed;
    layoutNoEl.textContent = `№ ${String(layoutCount).padStart(3, "0")}`;
    gridSpecEl.textContent = `${cols} × ${rows}`;
    frameCountEl.textContent = layout.frags.length;
    negInfoEl.textContent = `${neg.author} — ${neg.title}, ${neg.year}`;
    negInfoEl.href = neg.page;
    negLicEl.textContent = neg.lic;

    const settleMs = reducedMotion ? 0 : cols * 22 + rows * 30 + 900;
    await wait(settleMs);
    grid.classList.add("is-settled");

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
    if (busy || !current.layout) return;
    setBusy(true);
    let next = current.neg;
    while (next === current.neg && NEGATIVES.length > 1)
      next = NEGATIVES[(Math.random() * NEGATIVES.length) | 0];
    const img = await loadNegative(next.src);
    if (img) {
      current.neg = next;
      current.img = img;
      current.layout.negative = next;
      negDims = { iw: img.naturalWidth, ih: img.naturalHeight };
      applyCover();
      const src = displaySrc();
      const back = frontBg === bgA ? bgB : bgA;
      back.style.backgroundImage = `url("${src}")`;
      await nextFrame();
      back.classList.add("is-on");
      frontBg.classList.remove("is-on");
      frontBg = back;
      for (const el of grid.querySelectorAll(".frag"))
        el.style.setProperty("--img", `url("${src}")`);
      negInfoEl.textContent = `${next.author} — ${next.title}, ${next.year}`;
      negInfoEl.href = next.page;
      negLicEl.textContent = next.lic;
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
    ctx.drawImage(source, sx0, sy0, sw, sh, 0, 0, W, H);

    const veil = "rgba(10, 9, 8, 0.32)";
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, W, H);

    // clippings: same crop math as the CSS, veil included
    const fragEls = [...grid.querySelectorAll(".frag")];
    const stageBox = stage.getBoundingClientRect();
    const { cols, rows } = current.layout.cfg;
    current.layout.frags.forEach((f, i) => {
      const el = fragEls[i];
      if (!el) return;
      const r = el.getBoundingClientRect();
      const srcVpX = stageBox.left + (stageBox.width * f.sx) / cols;
      const srcVpY = stageBox.top + (stageBox.height * f.sy) / rows;
      ctx.drawImage(
        source,
        sx0 + srcVpX / cover, sy0 + srcVpY / cover, r.width / cover, r.height / cover,
        r.left * S, r.top * S, r.width * S, r.height * S
      );
      ctx.fillStyle = veil;
      ctx.fillRect(r.left * S, r.top * S, r.width * S, r.height * S);
    });

    // grid lines, if revealed
    if (settings.grid) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
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
    if (settings.marks) {
      ctx.fillStyle = "#ffffff";
      ctx.font = `400 ${10 * S}px "Geist Mono", monospace`;
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

    // every piece of type, straight from the DOM
    const fs = 10 * S;
    ctx.textBaseline = "top";
    const drawText = (el, vertical = false) => {
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") return;
      const r = el.getBoundingClientRect();
      ctx.fillStyle = "#ffffff";
      ctx.font = `${cs.fontWeight} ${fs}px "Geist Mono", monospace`;
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${0.06 * fs}px`;
      const lines = el.textContent.split("\n").map((l) => l.trim()).filter(Boolean);
      const lh = fs * 1.55;
      if (vertical) {
        ctx.save();
        ctx.translate(r.right * S - 6 * S, r.top * S + 6 * S);
        ctx.rotate(Math.PI / 2);
        lines.forEach((l, k) => ctx.fillText(l.toUpperCase(), 0, k * lh));
        ctx.restore();
      } else {
        lines.forEach((l, k) => ctx.fillText(l.toUpperCase(), r.left * S + 7 * S, r.top * S + 6 * S + k * lh));
      }
    };
    grid.querySelectorAll(".cp").forEach((el) => drawText(el, el.classList.contains("cp--vert")));
    grid.querySelectorAll(".frag__no").forEach((el) => {
      const r = el.getBoundingClientRect();
      ctx.fillStyle = "#ffffff";
      ctx.font = `500 ${fs}px "Geist Mono", monospace`;
      ctx.fillText(el.textContent, r.left * S, r.top * S);
    });
    document.querySelectorAll(".chrome--tl span, .chrome--tr span, .chrome--bl span, .chrome--bl a").forEach((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      ctx.fillStyle = "#ffffff";
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

    const a = document.createElement("a");
    a.download = `gomis-${seedEl.textContent}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  }

  // ————— the panel —————

  function openPanel() {
    panel.classList.add("is-open");
    settingsBtn.setAttribute("aria-expanded", "true");
    panelClose.focus({ preventScroll: true });
  }
  function closePanel() {
    panel.classList.remove("is-open");
    settingsBtn.setAttribute("aria-expanded", "false");
    settingsBtn.focus({ preventScroll: true });
  }
  settingsBtn.addEventListener("click", openPanel);
  panelClose.addEventListener("click", closePanel);

  function applySetting(key, on) {
    settings[key] = on;
    if (key === "grid") document.body.classList.toggle("grid-on", on);
    if (key === "marks") document.body.classList.toggle("marks-off", !on);
    if (key === "grain") document.body.classList.toggle("grain-off", !on);
    if (key === "singleLine") document.body.classList.toggle("single-line", on);
    if (key === "dither" && current.img) applyNegativeSrc();
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
      tx = e.clientX - box.left;
      ty = e.clientY - box.top;
      const { cols, rows } = config();
      const c = Math.min(cols, Math.max(1, Math.ceil((tx / box.width) * cols)));
      const r = Math.min(rows, Math.max(1, Math.ceil((ty / box.height) * rows)));
      readoutEl.textContent = `C·${String(c).padStart(2, "0")} R·${String(r).padStart(2, "0")}`;
      crosshair.classList.add("is-on");
      if (!raf) raf = requestAnimationFrame(tick);
    });
    stage.addEventListener("pointerleave", () => {
      crosshair.classList.remove("is-on");
      readoutEl.textContent = "C·— R·—";
    });
  }

  // ————— resize: cover-fit follows the viewport live —————

  addEventListener("resize", () => {
    setViewportVars();
    applyCover();
  });

  smallScreen.addEventListener("change", () => { if (!busy) render(); });

  render(true);
})();
