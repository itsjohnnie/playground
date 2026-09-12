// Accordion variant of the Discover gallery, enabled by putting #way on the URL
// (/discover#way). Every item becomes a sliver; all of them fit the viewport at
// once with no page scroll, and whichever one has focus expands while the rest
// compress. Focus moves by click, drag, wheel/trackpad, or arrow keys.
//
// The stack runs along the viewport's LONG edge: slivers sit side by side on
// desktop and stack top-to-bottom on phones. CSS owns that breakpoint (the
// flex-direction on .way) and this reads it back, so there is no duplicate
// breakpoint constant to keep in sync.
//
// Pairs with discover-grid.tsx, which owns the hash and mounts exactly one of
// the two views (this or the infinite grid) — never both, because the grid
// destroys the server-rendered source list that this reads from.

type Axis = "x" | "y";

type Row = {
  el: HTMLElement;
  // Last main-axis size written, so layout() can skip rows that haven't moved.
  // See the note in layout() — this is what keeps a fast scroll cheap.
  size: number;
};

// A collapsed sliver never gets thinner than this. It only binds on very small
// viewports; normally ACTIVE_FRAC governs and this just stops the stack
// collapsing into a smear.
const MIN_SLIVER = 2;
// Target share of the long edge for the open sliver, before the clamps.
const ACTIVE_FRAC = 0.5;
// Aspect of the source screenshots (they are 16:9 almost without exception).
// It sets the shape of the open panel and therefore the depth of the band; the
// handful of odd sizes letterbox inside their slot via object-fit:contain
// rather than being cropped.
const ASPECT = 16 / 9;
// Drag distance / wheel delta that advances the focus by one.
const DRAG_STEP = 38;
const WHEEL_STEP = 42;

export class WayStack {
  root: HTMLElement;
  rows: Row[] = [];
  active = 0;

  private axis: Axis = "y";
  private openSize = -1;
  private wheelAcc = 0;
  private dragAcc = 0;
  private dragging = false;
  private pointerId = -1;
  private lastPos = 0;
  private moved = 0;
  private raf = 0;
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
      this.rows.push({ el, size: -1 });
      this.root.appendChild(el);
    }

    mount.appendChild(this.root);

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

    // Open somewhere in the middle rather than at the very start — the first
    // sliver expanded against the edge reads as a banner, not as a stack.
    this.axis = this.readAxis();
    this.active = Math.floor(this.rows.length / 2);
    // Entrance: lay the stack out evenly, force that state to be computed, then
    // open the focused sliver so the transition has a real start value to run
    // from. The forced reflow is what makes this synchronous and reliable —
    // doing it across two rAFs left the stack sitting in the even split for
    // SECONDS, because those callbacks queue behind decoding 150 images.
    this.layout(true);
    void this.root.offsetHeight;
    this.root.classList.add("is-ready");
    this.layout();
  }

  // CSS is the single source of truth for the breakpoint: .way is a row on wide
  // viewports and a column on narrow ones, and the stack runs along whichever
  // axis that picks.
  private readAxis(): Axis {
    return getComputedStyle(this.root).flexDirection === "column" ? "y" : "x";
  }

  // Write every sliver's main-axis size. Three things matter here:
  //
  // 1. Sizes come from ROUNDED CUMULATIVE EDGES, not from rounding each sliver
  //    on its own — 150 independently rounded values drift by a pixel or two
  //    and leave a gap at the end of the stack.
  // 2. A sliver is only touched when its size actually CHANGES. Because the
  //    collapsed size is the same number wherever the focus sits, moving the
  //    focus one step only resizes the two slivers it moved between; every one
  //    outside that span has an identical cumulative edge either way. Writing
  //    all 150 anyway restarted 150 transitions per step, which is what made a
  //    fast scroll stutter.
  // 3. On an axis flip both inline sizes are cleared and the cache is busted,
  //    so a stale width can't survive into the column layout (or vice versa).
  layout(initial = false) {
    const axis = this.readAxis();
    if (axis !== this.axis) {
      this.axis = axis;
      // Re-lay out instantly across the flip; easing a width into a height
      // reads as the whole stack detonating.
      this.root.classList.remove("is-ready");
      for (const r of this.rows) {
        r.el.style.width = "";
        r.el.style.height = "";
        r.size = -1;
      }
      void this.root.offsetHeight;
      this.root.classList.add("is-ready");
    }

    const horizontal = axis === "x";
    const total = horizontal
      ? this.root.clientWidth || window.innerWidth
      : this.root.clientHeight || window.innerHeight;
    const cross = horizontal
      ? this.root.clientHeight || window.innerHeight
      : this.root.clientWidth || window.innerWidth;
    const n = this.rows.length;
    if (!n) return;

    // Geometry of the OPEN sliver. It shows the image WHOLE — uncropped and
    // unclipped — so the open panel is the image's own box, and the stack is a
    // band exactly as deep as that box. Every image is then rendered at this one
    // size whatever its own sliver is doing (published as --way-open and
    // --way-band), and a sliver is a WINDOW sliding over a picture that never
    // moves or resizes: fully open reveals all of it, collapsed reveals a strip.
    //
    // That fixed size is what keeps the expand a true crop. Sizing images to
    // their own sliver instead let object-fit's binding constraint flip between
    // the two states on a narrow viewport — measured, the same photo rendered at
    // scale 0.2437 collapsed and 0.4689 open, so it visibly zoomed as it grew.
    let openSize = total * ACTIVE_FRAC;
    let band = horizontal ? openSize / ASPECT : openSize * ASPECT;
    // The band can't outgrow the short edge of the screen…
    if (band > cross) {
      band = cross;
      openSize = horizontal ? cross * ASPECT : cross / ASPECT;
    }
    // …nor eat the room the slivers need.
    const maxOpen = total - (n - 1) * MIN_SLIVER;
    if (openSize > maxOpen) {
      openSize = Math.max(total / n, maxOpen);
      band = horizontal ? openSize / ASPECT : openSize * ASPECT;
    }
    if (openSize !== this.openSize) {
      this.openSize = openSize;
      this.root.style.setProperty("--way-open", openSize + "px");
      this.root.style.setProperty("--way-band", band + "px");
    }

    // Before the entrance frame everything is even — there is no open sliver.
    const activeSize = initial ? total / n : openSize;
    const rest = n > 1 ? (total - activeSize) / (n - 1) : total;
    const prop = horizontal ? "width" : "height";
    const off = horizontal ? "height" : "width";

    let acc = 0;
    let prevEdge = 0;
    for (let i = 0; i < n; i++) {
      acc += !initial && i === this.active ? activeSize : rest;
      const edge = Math.round(acc);
      const row = this.rows[i];
      const next = edge - prevEdge;
      prevEdge = edge;
      if (next !== row.size) {
        row.el.style.setProperty(prop, next + "px");
        row.el.style.removeProperty(off);
        row.size = next;
      }
      const on = !initial && i === this.active;
      if (on !== row.el.classList.contains("is-active")) {
        row.el.classList.toggle("is-active", on);
        row.el.setAttribute("aria-current", on ? "true" : "false");
      }
    }
  }

  // Coalesce to one layout per frame: a trackpad can deliver several wheel
  // events between paints, and each one used to force its own synchronous
  // relayout of the whole stack.
  private schedule() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.layout();
    });
  }

  setActive(i: number) {
    const n = this.rows.length;
    // Clamp rather than wrap: a stack has ends, and wrapping from the last
    // sliver back to the first on a drag reads as the whole thing jumping.
    const next = Math.max(0, Math.min(n - 1, i));
    if (next === this.active) return;
    this.active = next;
    this.schedule();
  }

  private step(d: number) {
    this.setActive(this.active + d);
  }

  // Pointer coordinate along the stack's axis.
  private pos(e: PointerEvent | MouseEvent) {
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
    this.dragAcc = 0;
    this.root.setPointerCapture?.(e.pointerId);
    this.root.classList.add("is-dragging");
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    const p = this.pos(e);
    const d = p - this.lastPos;
    this.lastPos = p;
    this.moved += Math.abs(d);
    // The stack follows the finger: dragging right/down walks back toward the
    // start, the same convention as the grid's drag.
    this.dragAcc -= d;
    while (Math.abs(this.dragAcc) >= DRAG_STEP) {
      const dir = this.dragAcc > 0 ? 1 : -1;
      this.dragAcc -= dir * DRAG_STEP;
      this.step(dir);
    }
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
      if (i >= 0) this.setActive(i);
    }
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    // Take the dominant axis rather than the stack's own: a mouse wheel only
    // ever reports deltaY, so on the horizontal desktop layout that is the
    // only signal there is, while a trackpad swipe reports deltaX.
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    this.wheelAcc += d;
    while (Math.abs(this.wheelAcc) >= WHEEL_STEP) {
      const dir = this.wheelAcc > 0 ? 1 : -1;
      this.wheelAcc -= dir * WHEEL_STEP;
      this.step(dir);
    }
  }

  private onKey(e: KeyboardEvent) {
    // Both axes are accepted whichever way the stack runs — forgiving, and the
    // arrow that matches the layout is always among them.
    switch (e.key) {
      case "ArrowDown": case "ArrowRight": case "PageDown":
        e.preventDefault(); this.step(1); break;
      case "ArrowUp": case "ArrowLeft": case "PageUp":
        e.preventDefault(); this.step(-1); break;
      case "Home": e.preventDefault(); this.setActive(0); break;
      case "End": e.preventDefault(); this.setActive(this.rows.length - 1); break;
    }
  }

  private onResize() {
    this.schedule();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
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
