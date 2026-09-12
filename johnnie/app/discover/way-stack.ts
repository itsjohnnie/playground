// Vertical-accordion variant of the Discover gallery, enabled by putting #way
// on the URL (/discover#way). Every item becomes a full-width horizontal strip;
// all of them fit the viewport at once, with no page scroll, and whichever one
// has focus expands to fill roughly half the screen while the rest compress to
// slivers. Focus moves by click, drag, wheel/trackpad, or arrow keys.
//
// Pairs with discover-grid.tsx, which owns the hash and mounts exactly one of
// the two views (this or the infinite grid) — never both, because the grid
// destroys the server-rendered source list that this reads from.

type Row = {
  el: HTMLElement;
  img: HTMLImageElement | null;
  // Last height written, so layout() can skip rows that haven't moved. See the
  // note in layout() — this is what keeps a fast scroll cheap.
  h: number;
};

// A collapsed strip never gets thinner than this. It only binds on very short
// viewports; normally ACTIVE_FRAC governs and this just stops the stack
// collapsing into a smear.
const MIN_STRIP = 2;
// Target share of the viewport for the open row, before that clamp.
const ACTIVE_FRAC = 0.5;
// Drag distance / wheel delta that advances the focus by one row.
const DRAG_STEP = 38;
const WHEEL_STEP = 42;

export class WayStack {
  root: HTMLElement;
  rows: Row[] = [];
  active = 0;

  private wheelAcc = 0;
  private dragAcc = 0;
  private dragging = false;
  private pointerId = -1;
  private lastY = 0;
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
      // not inside its markup — carry it over so a strip shows the incoming
      // photo's colours while the image decodes.
      if (src.style.backgroundImage) el.style.backgroundImage = src.style.backgroundImage;

      const srcImg = src.querySelector("img");
      const img = srcImg ? (srcImg.cloneNode(true) as HTMLImageElement) : null;
      if (img) {
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
      this.rows.push({ el, img, h: -1 });
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

    // Open somewhere in the middle rather than at the very top — the first row
    // expanded against the top edge reads as a banner, not as a stack.
    this.active = Math.floor(this.rows.length / 2);
    // Entrance: lay the stack out evenly, force that state to be computed, then
    // open the focused row so the transition has a real start value to run from.
    // The forced reflow is what makes this synchronous and reliable — doing it
    // across two rAFs left the stack sitting in the even split for SECONDS,
    // because those callbacks queue behind decoding 150 images on first load.
    this.layout(true);
    void this.root.offsetHeight;
    this.root.classList.add("is-ready");
    this.layout();
  }

  // Write every row's height. Two things matter for this to stay smooth with
  // 150 rows:
  //
  // 1. Heights come from ROUNDED CUMULATIVE EDGES, not from rounding each row
  //    on its own — 150 independently rounded rows drift by a pixel or two and
  //    leave a gap at the bottom of the stack.
  // 2. A row is only touched when its height actually CHANGES. Because the
  //    collapsed size is the same number wherever the focus sits, moving the
  //    focus one step only resizes the two rows it moved between; every row
  //    outside that span has an identical cumulative edge either way. Writing
  //    all 150 anyway restarted 150 height transitions per step, which is what
  //    made a fast scroll stutter (measured: 60fps for a single expand, but a
  //    ten-step wheel burst fell apart).
  layout(initial = false) {
    const h = this.root.clientHeight || window.innerHeight;
    const n = this.rows.length;
    if (!n) return;

    // Before the entrance frame everything is even — there is no open row yet.
    const activeH = initial
      ? h / n
      : Math.min(h * ACTIVE_FRAC, Math.max(h / n, h - (n - 1) * MIN_STRIP));
    const rest = n > 1 ? (h - activeH) / (n - 1) : h;

    let acc = 0;
    let prevEdge = 0;
    for (let i = 0; i < n; i++) {
      acc += !initial && i === this.active ? activeH : rest;
      const edge = Math.round(acc);
      const row = this.rows[i];
      const next = edge - prevEdge;
      prevEdge = edge;
      if (next !== row.h) {
        row.el.style.height = next + "px";
        row.h = next;
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
    // Clamp rather than wrap: a stack has ends, and wrapping from the last row
    // back to the first on a drag reads as the whole column jumping.
    const next = Math.max(0, Math.min(n - 1, i));
    if (next === this.active) return;
    this.active = next;
    this.schedule();
  }

  private step(d: number) {
    this.setActive(this.active + d);
  }

  private rowIndexAt(clientY: number): number {
    for (let i = 0; i < this.rows.length; i++) {
      const r = this.rows[i].el.getBoundingClientRect();
      if (clientY >= r.top && clientY <= r.bottom) return i;
    }
    return -1;
  }

  private onPointerDown(e: PointerEvent) {
    if (this.pointerId !== -1) return;
    this.pointerId = e.pointerId;
    this.dragging = true;
    this.lastY = e.clientY;
    this.moved = 0;
    this.dragAcc = 0;
    this.root.setPointerCapture?.(e.pointerId);
    this.root.classList.add("is-dragging");
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    const dy = e.clientY - this.lastY;
    this.lastY = e.clientY;
    this.moved += Math.abs(dy);
    // Dragging DOWN should bring earlier rows into focus — the content follows
    // the finger, the same direction convention as the grid's drag.
    this.dragAcc -= dy;
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
      const i = this.rowIndexAt(e.clientY);
      if (i >= 0) this.setActive(i);
    }
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    this.wheelAcc += e.deltaY;
    while (Math.abs(this.wheelAcc) >= WHEEL_STEP) {
      const dir = this.wheelAcc > 0 ? 1 : -1;
      this.wheelAcc -= dir * WHEEL_STEP;
      this.step(dir);
    }
  }

  private onKey(e: KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown": case "PageDown": e.preventDefault(); this.step(1); break;
      case "ArrowUp": case "PageUp": e.preventDefault(); this.step(-1); break;
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
