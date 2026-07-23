/* gomis · un negatiu, una graella
   one photograph fills the page; cells carry displaced crops of the SAME
   image, resolved by a hidden grid. photos are free-to-use placeholders
   from picsum.photos (Lorem Picsum). */

(() => {
  "use strict";

  const stage = document.getElementById("stage");
  const grid = document.getElementById("grid");
  const underlay = document.getElementById("underlay");
  const bgA = document.getElementById("bg-a");
  const bgB = document.getElementById("bg-b");
  const regenBtn = document.getElementById("regen");
  const gridBtn = document.getElementById("grid-toggle");
  const seedEl = document.getElementById("seed");
  const layoutNoEl = document.getElementById("layout-no");
  const gridSpecEl = document.getElementById("grid-spec");
  const frameCountEl = document.getElementById("frame-count");
  const negInfoEl = document.getElementById("neg-info");
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
  const fmtMeter = (rng) => { const n = irange(rng, 1, 4); return "▮".repeat(n) + "▯".repeat(5 - n); };

  function copyText(rng, kind, ctx) {
    switch (kind) {
      case "place": return `${pick(rng, PLACES)}\n${fmtTime(rng)}`;
      case "spec": return `${pick(rng, SPECS)}\n${pick(rng, LENSES)}`;
      case "film": return `${pick(rng, FILM)}\nROTLLE ${String(irange(rng, 1, 24)).padStart(2, "0")}`;
      case "gps": return fmtGps(rng);
      case "note": return pick(rng, NOTES);
      case "index": return `FT ${String(irange(rng, 1, 412)).padStart(3, "0")} →`;
      case "contact": return `RETALL ${String(irange(rng, 1, ctx.frags)).padStart(2, "0")}/${ctx.frags}`;
      case "date": return `${fmtDate(rng)}\n${fmtTime(rng)}`;
      case "meter": return `${fmtMeter(rng)} EV`;
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
    for (let i = 0; i < fragCount; i++) {
      let placed = false;
      for (let t = 0; t < 60 && !placed; t++) {
        const [w, h] = pick(rng, cfg.spans);
        const x = biased(rng, anchorCols, cols - w);
        const y = biased(rng, anchorRows, rows - h);
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
    // micro-copy: a column stack on an anchor, a row run, then scatter
    const copies = [];
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

    // on narrow grids a single cell is too tight for a line of copy;
    // widen into the right neighbor when it is free
    const widen = (c) => {
      if (!smallScreen.matches || c.vert) return;
      if (c.x + 1 < cols && !occ[c.y * cols + c.x + 1]) {
        c.w = 2;
        occ[c.y * cols + c.x + 1] = 1;
      }
    };

    // the sheet is mostly text now: stack copy down every anchor column,
    // run it along the anchor rows, then scatter generously
    for (const stackCol of anchorCols) {
      for (const r of freeCellsInCol(stackCol).slice(0, irange(rng, 3, 5))) {
        if (occ[r * cols + stackCol]) continue;
        const c = { x: stackCol, y: r, w: 1, h: 1, kind: pick(rng, COPY_KINDS) };
        occ[r * cols + stackCol] = 1;
        widen(c);
        copies.push(c);
      }
    }
    for (const runRow of anchorRows) {
      for (const cx of freeCellsInRow(runRow).slice(0, irange(rng, 3, 4))) {
        if (occ[runRow * cols + cx]) continue; // a widened neighbor may have claimed it
        const c = { x: cx, y: runRow, w: 1, h: 1, kind: pick(rng, COPY_KINDS), rule: rng() < 0.5 };
        occ[runRow * cols + cx] = 1;
        widen(c);
        copies.push(c);
      }
    }
    const scatterTarget = irange(rng, 6, 9);
    for (let t = 0; t < 90 && copies.filter((c) => c.scatter).length < scatterTarget; t++) {
      const x = irange(rng, 0, cols - 1);
      const y = irange(rng, 0, rows - 1);
      if (occ[y * cols + x]) continue;
      const vert = rng() < 0.22 && y + 1 < rows && !occ[(y + 1) * cols + x];
      const c = { x, y, w: 1, h: vert ? 2 : 1, kind: pick(rng, COPY_KINDS), vert, scatter: true };
      occ[y * cols + x] = 1;
      if (vert) occ[(y + 1) * cols + x] = 1;
      widen(c);
      copies.push(c);
    }
    // one emphasized copy block per layout (full shade, heavier weight)
    if (copies.length) copies[(rng() * copies.length) | 0].strong = true;

    const marks = new Set();
    for (let t = 0; t < 10; t++) marks.add(irange(rng, cols + 1, cols * rows - 1));

    return {
      cfg, rng, frags, copies, marks,
      seed: seedHex(seed),
      neg: { no: String(irange(rng, 1, 412)).padStart(3, "0"), place: pick(rng, PLACES), time: fmtTime(rng) },
    };
  }

  // ————— the negative (one image per deal) —————

  function negativeUrl(layout) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.min(1800, Math.round(innerWidth * dpr));
    const h = Math.min(1800, Math.round(innerHeight * dpr));
    return `https://picsum.photos/seed/gomis-${layout.seed}/${w}/${h}`;
  }

  function loadImage(url, timeout = 6000) {
    return new Promise((resolve) => {
      const img = new Image();
      const done = () => resolve(url);
      img.onload = () => (img.decode ? img.decode().then(done, done) : done());
      img.onerror = done;
      img.src = url;
      setTimeout(done, timeout);
    });
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
      if (c.rule) el.classList.add("cp--rule");
      if (layout.rng() < 0.25) el.classList.add("cp--end");
      if (!c.vert && layout.rng() < 0.2) el.classList.add("cp--right");
      el.style.gridColumn = `${c.x + 1} / span ${c.w}`;
      el.style.gridRow = `${c.y + 1} / span ${c.h}`;
      el.style.setProperty("--d", `${enterDelay(c.x, c.y)}ms`);
      el.textContent = copyText(layout.rng, c.kind, { frags: layout.frags.length });
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
      if (layout.marks.has(i) && i % cols !== 0 && i >= cols) u.classList.add("ucell--mark");
      underlay.appendChild(u);
    }
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  // ————— the regeneration choreography —————

  let busy = false;
  let layoutCount = 0;
  let currentSeed = newSeed();
  let frontBg = bgA;

  async function render(firstRun = false) {
    if (busy) return;
    busy = true;
    regenBtn.classList.add("is-busy");

    const layout = generate(currentSeed);
    const { cols, rows } = layout.cfg;
    root.style.setProperty("--cols", cols);
    root.style.setProperty("--rows", rows);

    const url = negativeUrl(layout);
    const loading = loadImage(url);
    const { frag, cells } = buildCells(layout, url);

    // exit the old sheet, back-to-front
    const old = [...grid.children];
    if (old.length && !reducedMotion) {
      old.forEach((el, i) => {
        el.style.setProperty("--d", `${(old.length - i) * 12}ms`);
        el.classList.remove("is-in");
        el.classList.add("is-out");
      });
      await wait(old.length * 12 + 260);
    }

    await loading;

    // crossfade the negative
    const back = frontBg === bgA ? bgB : bgA;
    back.style.backgroundImage = `url("${url}")`;
    if (firstRun) back.classList.add("is-first");
    await nextFrame();
    back.classList.add("is-on");
    frontBg.classList.remove("is-on");
    frontBg = back;

    buildUnderlay(layout);
    grid.classList.remove("is-settled");
    grid.replaceChildren(frag);
    await nextFrame();
    cells.forEach((el) => el.classList.add("is-in"));

    layoutCount += 1;
    seedEl.textContent = layout.seed;
    layoutNoEl.textContent = `№ ${String(layoutCount).padStart(3, "0")}`;
    gridSpecEl.textContent = `${cols} × ${rows}`;
    frameCountEl.textContent = layout.frags.length;
    negInfoEl.textContent = `NEG ${layout.neg.no} · ${layout.neg.place} ${layout.neg.time}`;

    const settleMs = reducedMotion ? 0 : cols * 22 + rows * 30 + 900;
    await wait(settleMs);
    grid.classList.add("is-settled");

    regenBtn.classList.remove("is-busy");
    busy = false;
  }

  function regenerate() {
    if (busy) return;
    currentSeed = newSeed();
    render();
  }

  regenBtn.addEventListener("click", regenerate);

  // ————— the secret grid —————

  function toggleGrid() {
    const on = gridBtn.getAttribute("aria-pressed") !== "true";
    gridBtn.setAttribute("aria-pressed", String(on));
    document.body.classList.toggle("grid-on", on);
  }
  gridBtn.addEventListener("click", toggleGrid);

  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "r") regenerate();
    if (k === "g") toggleGrid();
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

  // ————— resize: keep the crop math honest —————

  let resizeTimer;
  addEventListener("resize", () => {
    setViewportVars();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // the negative is requested at viewport aspect; a big change (rotation,
      // window reshape) would stretch it, so quietly deal a fresh sheet
      const img = frontBg.style.backgroundImage;
      if (!img || busy) return;
      const m = img.match(/\/(\d+)\/(\d+)"?\)$/);
      if (!m) return;
      const imgAspect = Number(m[1]) / Number(m[2]);
      const vpAspect = innerWidth / innerHeight;
      if (Math.abs(imgAspect - vpAspect) / vpAspect > 0.18) render();
    }, 400);
  });

  smallScreen.addEventListener("change", () => { if (!busy) render(); });

  render(true);
})();
