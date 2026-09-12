// Accordion carousel variant of the Discover gallery, enabled by putting #way
// on the URL (/discover#way). Every item is a sliver; the focused one opens to
// show its screenshot whole, and the strip runs off both edges of the screen and
// loops forever. Focus moves by click, drag, wheel/trackpad, or arrow keys.
//
// The strip runs along the viewport's LONG edge: slivers side by side on
// desktop, stacked top-to-bottom on phones. CSS owns that breakpoint (the
// flex-direction on .way) and this reads it back, so there is no duplicate
// breakpoint constant to keep in sync.
//
// Geometry, and why the loop is seamless: exactly one unit of "openness" is
// ever distributed across the strip, so its total length is CONSTANT no matter
// where the focus sits — n slivers plus one expansion. A constant length is what
// lets positions wrap on a fixed modulus; if the strip grew and shrank as items
// opened, the wrap point would drift and the seam would visibly jump.
//
// Everything is driven from one rAF loop rather than CSS transitions: items wrap
// by jumping a whole strip-length, and a transition would smear that jump across
// the screen instead of hiding it.
//
// Pairs with discover-grid.tsx, which owns the hash and mounts exactly one of
// the two views (this or the infinite grid) — never both, because the grid
// destroys the server-rendered source list that this reads from.

type Axis = "x" | "y";

type Row = {
  el: HTMLElement;
  size: number;   // last main-axis size written
  offset: number; // last main-axis translate written
  on: boolean;    // last is-active state written
};

// Aspect of the source screenshots (they are 16:9 almost without exception).
// It sets the shape of the open panel and therefore the depth of the band; the
// handful of odd sizes letterbox inside their slot via object-fit:contain
// rather than being cropped.
const ASPECT = 16 / 9;
// Band depth as a share of the SHORT edge, and the open panel's cap as a share
// of the LONG edge. The band is as deep as one whole screenshot, so these two
// are the same knob seen from either side — whichever binds first wins, and the
// open panel always fits on screen so the image is never clipped. On the
// vertical layout the band is the full width: a phone has no width to spare,
// and insetting it there just shrinks the picture for nothing.
//
// These two numbers trade against each other and OPEN_FRAC is the one that
// governs on desktop. The sources are 16:9 landscape, so showing one WHOLE ties
// the panel's width to the band's height times 1.78 — a deeper band is a wider
// panel, and the panel eats the room the slivers live in. At 0.86 the band was
// 697px but only ~202px of slivers were left (about 10 a side); at 0.70 it is
// 567px with ~432px of slivers (about 43 a side at the thickness below).
const BAND_FRAC_X = 0.82;
const BAND_FRAC_Y = 1;
const OPEN_FRAC = 0.7;
// Floor on collapsed thickness. The real thickness is derived per viewport in
// measure() — see PAINT_BUDGET.
const SLIVER_MIN_X = 6;
const SLIVER_MIN_Y = 7;
// Rasteriser budget, in painted pixels, and the knob that keeps this at 60fps.
// Each painted sliver holds a photo drawn at the OPEN panel's size and clipped
// down — that overhang is what the window slides open to reveal — so the work
// is (number of slivers on screen) x (area of the open panel), NOT the area
// actually visible. A fixed thickness therefore can't hold across viewports:
// measured on the production build during a continuous wheel, 1440x900 ran 54
// slivers of a 1008x567 panel at 60fps, while 1920x1080 ran 72 of a 1344x756
// panel at 30. A phone survives 90 slivers only because its panel is 390x219.
// Deriving thickness from this budget spends the frame on fewer, thicker
// slivers as the display grows, instead of dropping frames.
const PAINT_BUDGET = 32e6;
// Input distance that advances the focus by one item.
const DRAG_UNITS = 86;
const WHEEL_UNITS = 96;
// Exponential approach per frame, and the point at which we call it arrived.
const SMOOTH = 0.16;
const EPSILON = 0.0004;
// Quiet time after the last wheel tick before the focus snaps to one item.
const SETTLE_MS = 130;

export class WayStack {
  root: HTMLElement;
  rows: Row[] = [];

  // Focus lives in unwrapped item-space and can drift outside [0, n) — the
  // renderer wraps it. Keeping it unwrapped means a drag across the seam is
  // just a number going up, with nothing to special-case.
  private focus = 0;
  private target = 0;

  private axis: Axis = "x";
  private sliver = SLIVER_MIN_X;
  private openSize = 0;
  private band = 0;
  private view = 0;

  private raf = 0;
  private running = false;
  private reduced = false;
  private settleTimer = 0;

  private dragging = false;
  private pointerId = -1;
  private lastPos = 0;
  private moved = 0;
  private ro: ResizeObserver | null = null;

  constructor(sources: HTMLElement[], mount: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "way";
    this.root.setAttribute("role", "list");

    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      const el = document.createElement("div");
      el.className = "way-row";
      el.setAttribute("role", "listitem");
      el.dataset.i = String(i);
      // The LQIP gradient rides on the source ITEM (page.tsx sets it inline),
      // not inside its markup — carry it over so a sliver shows the incoming
      // photo's colours while the image decodes.
      if (src.style.backgroundImage) el.style.backgroundImage = src.style.backgroundImage;

      const srcImg = src.querySelector("img");
      if (srcImg) {
        const img = srcImg.cloneNode(true) as HTMLImageElement;
        img.className = "way-img";
        img.removeAttribute("style");
        el.appendChild(img);
      }

      const meta = src.querySelector(".hero-meta_data");
      if (meta) {
        const m = document.createElement("div");
        m.className = "way-meta";
        m.innerHTML = meta.innerHTML;
        el.appendChild(m);
      }
      this.rows.push({ el, size: -1, offset: NaN, on: false });
      this.root.appendChild(el);
    }

    mount.appendChild(this.root);

    this.tick = this.tick.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onKey = this.onKey.bind(this);
    this.onResize = this.onResize.bind(this);

    this.root.addEventListener("pointerdown", this.onPointerDown);
    this.root.addEventListener("pointermove", this.onPointerMove);
    this.root.addEventListener("pointerup", this.onPointerUp);
    this.root.addEventListener("pointercancel", this.onPointerUp);
    this.root.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKey);

    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(this.onResize);
      this.ro.observe(this.root);
    } else {
      window.addEventListener("resize", this.onResize);
    }

    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Start part-way in rather than on item 0 — the strip should already read as
    // a strip, running off both edges, the moment it appears.
    this.focus = this.target = Math.floor(this.rows.length / 2);
    this.measure();
    this.render();
  }

  // CSS is the single source of truth for the breakpoint: .way is a row on wide
  // viewports and a column on narrow ones, and the strip runs along that axis.
  private measure() {
    const horizontal = getComputedStyle(this.root).flexDirection !== "column";
    this.axis = horizontal ? "x" : "y";


    const w = this.root.clientWidth || window.innerWidth;
    const h = this.root.clientHeight || window.innerHeight;
    const long = horizontal ? w : h;
    const short = horizontal ? h : w;
    this.view = long;

    // The open panel is one whole screenshot, so its two sides are locked
    // together by ASPECT. Take whichever limit binds first — depth against the
    // short edge, length against the long one — so the image always fits on
    // screen uncropped.
    let band = short * (horizontal ? BAND_FRAC_X : BAND_FRAC_Y);
    let open = horizontal ? band * ASPECT : band / ASPECT;
    const openCap = long * OPEN_FRAC;
    if (open > openCap) {
      open = openCap;
      band = horizontal ? open / ASPECT : open * ASPECT;
    }
    this.openSize = open;
    this.band = band;
    // Thickness that keeps the on-screen sliver count inside the paint budget.
    const panelArea = (horizontal ? open * band : band * open) || 1;
    const affordable = Math.max(12, Math.floor(PAINT_BUDGET / panelArea));
    const leftover = Math.max(0, long - open);
    this.sliver = Math.max(
      horizontal ? SLIVER_MIN_X : SLIVER_MIN_Y,
      leftover / affordable,
    );
    this.root.style.setProperty("--way-open", open.toFixed(2) + "px");
    this.root.style.setProperty("--way-band", band.toFixed(2) + "px");
  }

  // One frame. Sizes and positions are recomputed from scratch each time, which
  // is both simpler than diffing and cheap: the whole pass is a couple of
  // hundred microseconds for 150 items, and only changed values reach the DOM.
  private render() {
    const n = this.rows.length;
    if (!n) return;
    const horizontal = this.axis === "x";
    const sl = this.sliver;
    const extra = this.openSize - sl;

    // Focus wrapped into [0, n) for the openness falloff.
    const fm = ((this.focus % n) + n) % n;

    // Openness is a triangular falloff one item wide, measured on the CIRCLE so
    // the last item and the first are neighbours. The bumps always sum to
    // exactly 1, which is what pins the strip's total length.
    const size = new Array<number>(n);
    const pos = new Array<number>(n + 1);
    let acc = 0;
    for (let i = 0; i < n; i++) {
      let d = Math.abs(i - fm);
      if (d > n - d) d = n - d;
      size[i] = sl + extra * (d < 1 ? 1 - d : 0);
      pos[i] = acc;
      acc += size[i];
    }
    pos[n] = acc;
    const L = acc;

    // Camera: put the middle of the opening item at the middle of the screen,
    // interpolating across the pair while the focus sits between two.
    const i0 = Math.floor(fm) % n;
    const frac = fm - Math.floor(fm);
    const c0 = pos[i0] + size[i0] / 2;
    const i1 = i0 + 1;
    const c1 = i1 < n ? pos[i1] + size[i1] / 2 : pos[n] + size[0] / 2;
    const cam = c0 + (c1 - c0) * frac - this.view / 2;

    // Which item owns the label. Only the one actually open gets it.
    const nearest = Math.round(fm) % n;

    for (let i = 0; i < n; i++) {
      const row = this.rows[i];
      let x = pos[i] - cam;
      // Wrap onto the fixed modulus, choosing the copy nearest the viewport so
      // items leave one edge and arrive at the other without a visible jump.
      x = ((x % L) + L) % L;
      if (x > (L + this.view) / 2) x -= L;

      const s = Math.round(size[i] * 100) / 100;
      const o = Math.round(x * 100) / 100;
      if (s !== row.size) {
        row.el.style.setProperty(horizontal ? "width" : "height", s + "px");
        row.size = s;
      }
      if (o !== row.offset) {
        row.el.style.transform = horizontal
          ? `translate3d(${o}px,0,0)`
          : `translate3d(0,${o}px,0)`;
        row.offset = o;
      }
      const on = i === nearest && Math.abs(frac - Math.round(frac)) < 0.5;
      if (on !== row.on) {
        row.el.classList.toggle("is-active", on);
        row.el.setAttribute("aria-current", on ? "true" : "false");
        row.on = on;
      }
    }
  }

  private tick() {
    const d = this.target - this.focus;
    if (Math.abs(d) < EPSILON) {
      this.focus = this.target;
      this.render();
      this.running = false;
      this.raf = 0;
      return;
    }
    this.focus += d * (this.reduced ? 1 : SMOOTH);
    this.render();
    this.raf = requestAnimationFrame(this.tick);
  }

  private start() {
    if (this.running) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.tick);
  }

  // Snap to a single open item once input stops.
  private settle() {
    clearTimeout(this.settleTimer);
    this.settleTimer = window.setTimeout(() => {
      this.target = Math.round(this.target);
      this.start();
    }, SETTLE_MS);
  }

  private nudge(by: number) {
    this.target += by;
    this.start();
  }

  /** Open a specific item, taking the short way round the loop. */
  setActive(i: number) {
    const n = this.rows.length;
    const fm = ((this.focus % n) + n) % n;
    let d = (((i - fm) % n) + n) % n;
    if (d > n / 2) d -= n;
    this.target = this.focus + d;
    this.start();
  }

  private pos(e: PointerEvent) {
    return this.axis === "x" ? e.clientX : e.clientY;
  }

  private rowIndexAt(e: PointerEvent) {
    const horizontal = this.axis === "x";
    const v = this.pos(e);
    for (let i = 0; i < this.rows.length; i++) {
      const r = this.rows[i].el.getBoundingClientRect();
      const lo = horizontal ? r.left : r.top;
      const hi = horizontal ? r.right : r.bottom;
      if (v >= lo && v <= hi) return i;
    }
    return -1;
  }

  private onPointerDown(e: PointerEvent) {
    if (this.pointerId !== -1) return;
    this.pointerId = e.pointerId;
    this.dragging = true;
    this.lastPos = this.pos(e);
    this.moved = 0;
    clearTimeout(this.settleTimer);
    this.root.setPointerCapture?.(e.pointerId);
    this.root.classList.add("is-dragging");
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    const p = this.pos(e);
    const d = p - this.lastPos;
    this.lastPos = p;
    this.moved += Math.abs(d);
    // The strip follows the finger: dragging right/down walks backwards.
    this.target -= d / DRAG_UNITS;
    this.start();
  }

  private onPointerUp(e: PointerEvent) {
    if (e.pointerId !== this.pointerId) return;
    this.root.releasePointerCapture?.(e.pointerId);
    this.pointerId = -1;
    this.dragging = false;
    this.root.classList.remove("is-dragging");
    // A press that never really moved is a click: open whatever is under it.
    if (this.moved < 6) {
      const i = this.rowIndexAt(e);
      if (i >= 0) { this.setActive(i); return; }
    }
    this.target = Math.round(this.target);
    this.start();
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    // Take the dominant axis rather than the strip's own: a mouse wheel only
    // ever reports deltaY, so on the horizontal layout that is the only signal
    // there is, while a trackpad swipe reports deltaX.
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    this.target += d / WHEEL_UNITS;
    this.start();
    this.settle();
  }

  private onKey(e: KeyboardEvent) {
    // Both axes are accepted whichever way the strip runs — forgiving, and the
    // arrow that matches the layout is always among them.
    switch (e.key) {
      case "ArrowDown": case "ArrowRight": case "PageDown":
        e.preventDefault(); this.target = Math.round(this.target) + 1; this.start(); break;
      case "ArrowUp": case "ArrowLeft": case "PageUp":
        e.preventDefault(); this.target = Math.round(this.target) - 1; this.start(); break;
    }
  }

  private onResize() {
    this.measure();
    // Sizes and offsets are all stale after a resize; force them to be rewritten.
    for (const r of this.rows) { r.size = -1; r.offset = NaN; }
    this.render();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.settleTimer);
    this.root.removeEventListener("pointerdown", this.onPointerDown);
    this.root.removeEventListener("pointermove", this.onPointerMove);
    this.root.removeEventListener("pointerup", this.onPointerUp);
    this.root.removeEventListener("pointercancel", this.onPointerUp);
    this.root.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("resize", this.onResize);
    this.ro?.disconnect();
    this.root.remove();
  }
}
