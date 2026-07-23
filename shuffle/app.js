/* shuffle · archivo barcelona
   a seeded layout randomizer: photos + micro-copy on a strict grid.
   photos are free-to-use placeholders from picsum.photos (Lorem Picsum). */

(() => {
  "use strict";

  const stage = document.getElementById("stage");
  const grid = document.getElementById("grid");
  const underlay = document.getElementById("underlay");
  const regenBtn = document.getElementById("regen");
  const seedEl = document.getElementById("seed");
  const layoutNoEl = document.getElementById("layout-no");
  const gridSpecEl = document.getElementById("grid-spec");
  const frameCountEl = document.getElementById("frame-count");
  const readoutEl = document.getElementById("cursor-readout");
  const crosshair = document.getElementById("crosshair");

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smallScreen = matchMedia("(max-width: 720px)");

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
      ? { cols: 6, rows: 10, photos: 8, spans: [[3, 3], [2, 2], [3, 2], [2, 3], [4, 3], [2, 4], [3, 4]], hero: [[4, 4], [3, 4], [4, 3]] }
      : { cols: 12, rows: 6, photos: 10, spans: [[3, 2], [2, 2], [2, 3], [4, 2], [3, 3], [2, 4], [3, 4], [4, 3]], hero: [[5, 3], [4, 3], [4, 4], [3, 4]] };

  // ————— micro-copy pools —————

  const PLACES = ["EL RAVAL", "GRÀCIA", "BARCELONETA", "POBLENOU", "EIXAMPLE", "EL BORN", "SANTS", "GÒTIC", "MONTJUÏC", "SANT ANTONI", "HORTA", "CLOT"];
  const SPECS = ["F 2.8 · 1/250", "F 8 · 1/60", "F 1.8 · 1/1000", "F 11 · 1/125", "F 4 · 1/500", "F 5.6 · 1/250"];
  const FILM = ["PORTRA 400", "HP5+ PUSH +1", "TRI-X 400", "EKTAR 100", "GOLD 200", "DELTA 3200"];
  const LENSES = ["50MM", "35MM", "28MM", "85MM", "24MM"];
  const NOTES = ["DO NOT BEND", "PROOF · NOT FOR PRINT", "UNSORTED", "KEEP FLAT", "SECOND PASS", "SCANNED TWICE", "DUST ON NEG", "LIGHT LEAK, KEPT", "OVEREXPOSED, KEPT", "ASK BEFORE USE", "FADED CORNER", "PIN LEFT EDGE"];
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  const fmtTime = (rng) => `${String(irange(rng, 6, 22)).padStart(2, "0")}:${String(irange(rng, 0, 59)).padStart(2, "0")}`;
  const fmtDate = (rng) => `${pick(rng, MONTHS)} ${String(irange(rng, 1, 28)).padStart(2, "0")}`;
  const fmtGps = (rng) => `41.${irange(rng, 3500, 4200)}° N\n2.${irange(rng, 1200, 2100)}° E`;
  const fmtMeter = (rng) => { const n = irange(rng, 1, 4); return "▮".repeat(n) + "▯".repeat(5 - n); };

  function copyText(rng, kind, ctx) {
    switch (kind) {
      case "place": return `${pick(rng, PLACES)}\n${fmtTime(rng)}`;
      case "spec": return `${pick(rng, SPECS)}\n${pick(rng, LENSES)}`;
      case "film": return `${pick(rng, FILM)}\nROLL ${String(irange(rng, 1, 24)).padStart(2, "0")}`;
      case "gps": return fmtGps(rng);
      case "note": return pick(rng, NOTES);
      case "index": return `FR ${String(irange(rng, 1, 412)).padStart(3, "0")} →`;
      case "contact": return `CONTACT ${String(irange(rng, 1, ctx.photos)).padStart(2, "0")}/${ctx.photos}`;
      case "date": return `${fmtDate(rng)}\n${fmtTime(rng)}`;
      case "meter": return `${fmtMeter(rng)} EV`;
      case "seed": return `SEED ${ctx.seed}`;
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

    const anchorCols = pickAnchors(rng, 3, cols, 2);
    const anchorRows = pickAnchors(rng, 2, rows, 2);
    const biased = (rng2, anchors, max) => {
      if (rng2() < 0.68) {
        const fit = anchors.filter((a) => a <= max);
        if (fit.length) return pick(rng2, fit);
      }
      return irange(rng2, 0, max);
    };

    const openSlots = (w, h) => {
      const out = [];
      for (let y = 0; y <= rows - h; y++)
        for (let x = 0; x <= cols - w; x++)
          if (free(x, y, w, h)) out.push([x, y]);
      return out;
    };

    const photos = [];
    for (let i = 0; i < cfg.photos; i++) {
      let placed = false;
      for (let t = 0; t < 60 && !placed; t++) {
        const [w, h] = i === 0 && t < 30 ? pick(rng, cfg.hero) : pick(rng, cfg.spans);
        const x = biased(rng, anchorCols, cols - w);
        const y = biased(rng, anchorRows, rows - h);
        if (free(x, y, w, h)) {
          claim(x, y, w, h);
          photos.push({ x, y, w, h, place: pick(rng, PLACES), time: fmtTime(rng) });
          placed = true;
        }
      }
      if (!placed) {
        // random tries missed: take any remaining slot, largest span first
        for (const [w, h] of [[3, 2], [2, 2], [2, 3], [2, 1], [1, 2], [1, 1]]) {
          const slots = openSlots(w, h);
          if (slots.length) {
            const [x, y] = pick(rng, slots);
            claim(x, y, w, h);
            photos.push({ x, y, w, h, place: pick(rng, PLACES), time: fmtTime(rng) });
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

    const stackCol = [...anchorCols].sort((a, b) => freeCellsInCol(b).length - freeCellsInCol(a).length)[0];
    const stackRows = freeCellsInCol(stackCol).slice(0, 4);
    for (const r of stackRows) {
      copies.push({ x: stackCol, y: r, w: 1, h: 1, kind: pick(rng, COPY_KINDS) });
      occ[r * cols + stackCol] = 1;
    }

    const runRow = [...anchorRows].sort((a, b) => freeCellsInRow(b).length - freeCellsInRow(a).length)[0];
    const runCols = freeCellsInRow(runRow).slice(0, 3);
    for (const c of runCols) {
      copies.push({ x: c, y: runRow, w: 1, h: 1, kind: pick(rng, COPY_KINDS), rule: rng() < 0.5 });
      occ[runRow * cols + c] = 1;
    }

    const scatterTarget = irange(rng, 3, 5);
    for (let t = 0; t < 90 && copies.filter((c) => c.scatter).length < scatterTarget; t++) {
      const x = irange(rng, 0, cols - 1);
      const y = irange(rng, 0, rows - 1);
      if (occ[y * cols + x]) continue;
      const vert = rng() < 0.22 && y + 1 < rows && !occ[(y + 1) * cols + x];
      copies.push({ x, y, w: 1, h: vert ? 2 : 1, kind: pick(rng, COPY_KINDS), vert, scatter: true });
      occ[y * cols + x] = 1;
      if (vert) occ[(y + 1) * cols + x] = 1;
    }

    // exactly one accent moment per layout
    if (copies.length) copies[(rng() * copies.length) | 0].accent = true;

    // registration marks on the underlay
    const marks = new Set();
    for (let t = 0; t < 10; t++) marks.add(irange(rng, cols + 1, cols * rows - 1));

    return { cfg, rng, photos, copies, marks, seed: seedHex(seed) };
  }

  // ————— rendering —————

  function cellPx() {
    const box = stage.getBoundingClientRect();
    const { cols, rows } = config();
    return {
      w: (box.width - (cols - 1)) / cols,
      h: (box.height - (rows - 1)) / rows,
    };
  }

  function photoUrl(layout, i, p) {
    const px = cellPx();
    const w = Math.min(1600, Math.round(px.w * p.w * 1.5));
    const h = Math.min(1600, Math.round(px.h * p.h * 1.5));
    return `https://picsum.photos/seed/bcn-${layout.seed}-${i}/${Math.max(w, 120)}/${Math.max(h, 120)}`;
  }

  function buildCells(layout) {
    const { cfg } = layout;
    const frag = document.createDocumentFragment();
    const cells = [];
    const enterDelay = (x, y) => (reducedMotion ? 0 : x * 22 + y * 34 + ((Math.random() * 40) | 0));

    layout.photos.forEach((p, i) => {
      const el = document.createElement("figure");
      el.className = "ph";
      el.style.gridColumn = `${p.x + 1} / span ${p.w}`;
      el.style.gridRow = `${p.y + 1} / span ${p.h}`;
      el.style.setProperty("--d", `${enterDelay(p.x, p.y)}ms`);

      const img = document.createElement("img");
      img.className = "ph__img";
      img.alt = `Placeholder photograph ${i + 1} of ${layout.photos.length}`;
      img.src = photoUrl(layout, i, p);
      el.appendChild(img);

      const no = document.createElement("span");
      no.className = "ph__no";
      no.textContent = String(i + 1).padStart(2, "0");
      el.appendChild(no);

      const cap = document.createElement("figcaption");
      cap.className = "ph__cap";
      cap.innerHTML = `<span>${String(i + 1).padStart(2, "0")}/${layout.photos.length} ${p.place}</span><em>${p.time}</em>`;
      el.appendChild(cap);

      frag.appendChild(el);
      cells.push(el);
    });

    layout.copies.forEach((c) => {
      const el = document.createElement("div");
      el.className = "cp";
      if (c.accent) el.classList.add("cp--accent");
      else if (layout.rng() < 0.3) el.classList.add("cp--strong");
      else if (layout.rng() < 0.3) el.classList.add("cp--faint");
      if (c.vert) el.classList.add("cp--vert");
      if (c.rule) el.classList.add("cp--rule");
      if (layout.rng() < 0.25) el.classList.add("cp--end");
      if (!c.vert && layout.rng() < 0.2) el.classList.add("cp--right");
      el.style.gridColumn = `${c.x + 1} / span ${c.w}`;
      el.style.gridRow = `${c.y + 1} / span ${c.h}`;
      el.style.setProperty("--d", `${enterDelay(c.x, c.y)}ms`);
      el.textContent = copyText(layout.rng, c.kind, { photos: layout.photos.length, seed: layout.seed });
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
      if (layout.marks.has(i) && i % cols !== 0 && i >= cols) u.classList.add("ucell--mark");
      underlay.appendChild(u);
    }
  }

  function preload(cells, timeout = 3200) {
    const imgs = cells.flatMap((c) => [...c.querySelectorAll("img")]);
    const settle = imgs.map((img) =>
      img.decode ? img.decode().catch(() => {}) : Promise.resolve()
    );
    return Promise.race([Promise.all(settle), new Promise((r) => setTimeout(r, timeout))]);
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  // ————— the regeneration choreography —————

  let busy = false;
  let layoutCount = 0;
  let currentSeed = newSeed();

  async function render(firstRun = false) {
    if (busy) return;
    busy = true;
    regenBtn.classList.add("is-busy");

    const layout = generate(currentSeed);
    const { cols, rows } = layout.cfg;
    document.documentElement.style.setProperty("--cols", cols);
    document.documentElement.style.setProperty("--rows", rows);

    const { frag, cells } = buildCells(layout);
    const loading = preload(cells);

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

    buildUnderlay(layout);
    grid.classList.remove("is-settled");
    grid.replaceChildren(frag);
    await nextFrame();
    cells.forEach((el) => el.classList.add("is-in"));

    // chrome updates land as the new sheet arrives
    layoutCount += 1;
    seedEl.textContent = layout.seed;
    layoutNoEl.textContent = `№ ${String(layoutCount).padStart(3, "0")}`;
    gridSpecEl.textContent = `${cols} × ${rows}`;
    frameCountEl.textContent = layout.photos.length;

    const settleMs = reducedMotion ? 0 : cols * 22 + rows * 34 + 900;
    await wait(settleMs);
    grid.classList.add("is-settled");

    regenBtn.classList.remove("is-busy");
    busy = false;
    if (firstRun) stage.classList.add("is-ready");
  }

  function regenerate() {
    if (busy) return;
    currentSeed = newSeed();
    render();
  }

  regenBtn.addEventListener("click", regenerate);
  addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey && !e.altKey) regenerate();
  });

  // ————— light-table cursor —————

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

  // ————— responsive: re-deal when the grid itself changes shape —————

  smallScreen.addEventListener("change", () => {
    if (!busy) render();
  });

  render(true);
})();
