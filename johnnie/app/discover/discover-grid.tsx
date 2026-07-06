"use client";

import { useEffect } from "react";

// Draggable, infinitely-wrapping 2D gallery for the Discover page. This is a
// from-scratch reimplementation of the original site's grid (the markup is
// server-rendered in page.tsx as `.hero-item` children of `.hero-list`; we
// clone those into a torus-wrapped grid and move it under pointer/scroll).
//
// Pairs with a native light/dark toggle (the original used a visual builder's
// runtime for this; here it's a class on <body> + CSS) and keeps the iOS
// status-bar theme-color in sync.

type Cell = {
  el: HTMLElement;
  baseX: number;
  baseY: number;
  lastX: number;
  lastY: number;
  lastWrapX: number | null;
  lastWrapY: number | null;
};

class InfiniteGrid {
  wrapper: HTMLElement;
  list: HTMLElement;
  originalItems: HTMLElement[];

  baseWidth: number;
  baseHeight: number;
  aspectRatio: number;
  gap: number;
  mobileBreakpoint: number;
  mobileWidthPercent: number;

  itemWidth = 0;
  itemHeight = 0;
  cellWidth = 0;
  cellHeight = 0;

  currentX = 0;
  currentY = 0;

  isDragging = false;
  startX = 0;
  startY = 0;
  lastX = 0;
  lastY = 0;

  velocityX = 0;
  velocityY = 0;
  friction = 0.94;
  wheelMultiplier = 1.5;

  items: Cell[] = [];
  gridWidth = 0;
  gridHeight = 0;
  cols = 0;
  rows = 0;

  contentPool: HTMLElement[] = [];
  poolIndex = 0;

  rafId = 0;
  resizeTimeout = 0;

  // Idle auto-focus: after IDLE_MS of no interaction (and no motion), glide the
  // tile nearest the viewport centre into the middle with a smooth ease-in-out.
  lastInteraction = 0;
  snapping = false;
  hasSnapped = false;
  snapStartX = 0;
  snapStartY = 0;
  snapTargetX = 0;
  snapTargetY = 0;
  snapStartTime = 0;

  // Mobile tap-to-stage: a quick tap (not a drag/fling-stop) brings the tapped
  // tile front-and-center, enlarged, with its meta at the bottom over a dimmed
  // backdrop. Tapping the stage dismisses it.
  pointerStartX = 0;
  pointerStartY = 0;
  pointerStartTime = 0;
  tapCancelled = false;
  stage: HTMLElement | null = null;
  stageInner: HTMLElement | null = null;
  // The grid cell whose image is on stage — hidden while staged so the tile
  // reads as having travelled to the centre, restored on close.
  stagedCell: Cell | null = null;

  // Staged-image zoom: double-tap toggles ~2.5x at the tap point, pinch zooms
  // freeform, one-finger drag pans while zoomed. A tap on the backdrop closes.
  zImg: HTMLElement | null = null;
  zScale = 1;
  zTx = 0;
  zTy = 0;
  zBaseW = 0;
  zBaseH = 0;
  // The image's resting on-screen centre (captured at stage-open). The pan
  // clamp measures from here — assuming the viewport centre instead locked
  // vertical panning whenever the two differed.
  zCx0 = 0;
  zCy0 = 0;
  zPointers = new Map<number, { x: number; y: number }>();
  zDownX = 0;
  zDownY = 0;
  zStartTx = 0;
  zStartTy = 0;
  zStartDist = 0;
  zStartScale = 1;
  zStartMidX = 0;
  zStartMidY = 0;
  zDownOnImg = false;
  zMoved = false;
  zLastTapTime = 0;
  zLastTapX = 0;
  zLastTapY = 0;

  constructor(
    wrapper: HTMLElement,
    list: HTMLElement,
    options: {
      itemWidth?: number;
      itemHeight?: number;
      gap?: number;
      mobileBreakpoint?: number;
      mobileWidthPercent?: number;
    } = {},
  ) {
    this.wrapper = wrapper;
    this.list = list;
    this.originalItems = Array.from(list.children) as HTMLElement[];

    this.baseWidth = options.itemWidth || 996;
    this.baseHeight = options.itemHeight || 560;
    this.aspectRatio = this.baseHeight / this.baseWidth;
    this.gap = options.gap || 100;
    this.mobileBreakpoint = options.mobileBreakpoint || 768;
    this.mobileWidthPercent = options.mobileWidthPercent || 0.8;

    this.animate = this.animate.bind(this);
    this.onDragStart = this.onDragStart.bind(this);
    this.onDragMove = this.onDragMove.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onResize = this.onResize.bind(this);
    this.closeStage = this.closeStage.bind(this);
    this.onStagePointerDown = this.onStagePointerDown.bind(this);
    this.onStagePointerMove = this.onStagePointerMove.bind(this);
    this.onStagePointerUp = this.onStagePointerUp.bind(this);

    this.init();
  }

  init() {
    this.calculateDimensions();
    this.createGrid();
    this.createStage();
    this.setupEventListeners();
    this.lastInteraction = Date.now();
    this.rafId = requestAnimationFrame(this.animate);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.wrapper.classList.add("ready"));
    });
  }

  calculateDimensions() {
    const vw = window.innerWidth;
    if (vw < this.mobileBreakpoint) {
      this.itemWidth = Math.round(vw * this.mobileWidthPercent);
      this.itemHeight = Math.round(this.itemWidth * this.aspectRatio);
      this.gap = 32;
    } else {
      this.itemWidth = this.baseWidth;
      this.itemHeight = this.baseHeight;
      this.gap = 100;
    }
    this.cellWidth = this.itemWidth + this.gap;
    this.cellHeight = this.itemHeight + this.gap;
  }

  shuffleArray(array: HTMLElement[]): HTMLElement[] {
    const shuffled = array.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
    return shuffled;
  }

  getNextContent(): HTMLElement {
    if (this.poolIndex >= this.contentPool.length) {
      this.contentPool = this.shuffleArray(this.originalItems);
      this.poolIndex = 0;
    }
    return this.contentPool[this.poolIndex++];
  }

  swapContent(item: Cell) {
    const source = this.getNextContent();
    const newContent = source.cloneNode(true) as HTMLElement;
    item.el.innerHTML = newContent.innerHTML;
    this.markLoaded(item.el);
  }

  createGrid() {
    this.contentPool = this.shuffleArray(this.originalItems);
    this.poolIndex = 0;

    // Size to the actual canvas (the fixed wrapper spans 100lvh, into the iOS
    // safe areas) rather than window.innerHeight (the smaller visual viewport) —
    // otherwise the bottom safe-area strip lacks tiles and they pop in/out there.
    const viewW = this.wrapper.clientWidth || window.innerWidth;
    const viewH = this.wrapper.clientHeight || window.innerHeight;
    this.cols = Math.ceil(viewW / this.cellWidth) + 4;
    this.rows = Math.ceil(viewH / this.cellHeight) + 4;
    this.gridWidth = this.cols * this.cellWidth;
    this.gridHeight = this.rows * this.cellHeight;

    const totalNeeded = this.cols * this.rows;
    this.list.innerHTML = "";
    this.items = new Array(totalNeeded);

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < totalNeeded; i++) {
      const sourceItem = this.getNextContent();
      const clone = sourceItem.cloneNode(true) as HTMLElement;
      clone.classList.add("hero-item");
      clone.style.width = this.itemWidth + "px";
      clone.style.height = this.itemHeight + "px";

      const col = i % this.cols;
      const row = (i / this.cols) | 0;

      this.items[i] = {
        el: clone,
        baseX: col * this.cellWidth,
        baseY: row * this.cellHeight,
        lastX: -99999,
        lastY: -99999,
        lastWrapX: null,
        lastWrapY: null,
      };
      fragment.appendChild(clone);
    }
    this.list.appendChild(fragment);
    // Cached images are already complete and won't fire load — mark them now.
    for (const it of this.items) this.markLoaded(it.el);

    this.currentX = this.gridWidth / 2;
    this.currentY = this.gridHeight / 2;
  }

  setupEventListeners() {
    const wrapper = this.wrapper;
    wrapper.addEventListener("mousedown", this.onDragStart, { passive: false });
    window.addEventListener("mousemove", this.onDragMove, { passive: true });
    window.addEventListener("mouseup", this.onDragEnd, { passive: true });

    wrapper.addEventListener("touchstart", this.onDragStart, { passive: false });
    window.addEventListener("touchmove", this.onDragMove, { passive: true });
    window.addEventListener("touchend", this.onDragEnd, { passive: true });

    wrapper.addEventListener("wheel", this.onWheel, { passive: false });
    wrapper.addEventListener("contextmenu", this.onContextMenu);
    this.list.addEventListener("load", this.onImgLoad, true);

    window.addEventListener("resize", this.onResize, { passive: true });
  }

  onContextMenu = (e: Event) => e.preventDefault();

  // Blur-up fade-in: mark each tile image loaded so CSS can transition it from a
  // blurred/transparent state to sharp once it decodes (load doesn't bubble, so
  // the listener is registered in the capture phase).
  onImgLoad = (e: Event) => {
    const t = e.target as HTMLElement | null;
    if (t && t.tagName === "IMG") t.classList.add("is-loaded");
  };

  markLoaded(el: HTMLElement) {
    const img = el.querySelector("img");
    if (img && (img as HTMLImageElement).complete) img.classList.add("is-loaded");
  }

  onResize() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = window.setTimeout(() => {
      this.calculateDimensions();
      this.createGrid();
    }, 300);
  }

  onDragStart(e: MouseEvent | TouchEvent) {
    this.isDragging = true;
    this.wrapper.classList.add("dragging");
    this.snapping = false;
    this.hasSnapped = false;
    this.lastInteraction = Date.now();
    // A press that lands while the grid is still gliding is a "stop", not a tap.
    this.tapCancelled = Math.hypot(this.velocityX, this.velocityY) > 1;
    this.velocityX = 0;
    this.velocityY = 0;
    const point = "touches" in e ? e.touches[0] : e;
    this.startX = point.clientX - this.currentX;
    this.startY = point.clientY - this.currentY;
    this.lastX = point.clientX;
    this.lastY = point.clientY;
    this.pointerStartX = point.clientX;
    this.pointerStartY = point.clientY;
    this.pointerStartTime = Date.now();
    e.preventDefault();
  }

  onDragMove(e: MouseEvent | TouchEvent) {
    if (!this.isDragging) return;
    this.lastInteraction = Date.now();
    const point = "touches" in e ? e.touches[0] : e;
    const clientX = point.clientX;
    const clientY = point.clientY;
    // Low-pass the pointer velocity (EMA) instead of taking a single raw frame
    // delta: raw deltas are noisy and arrive unevenly, which made flings feel
    // jerky and inconsistent depending on direction. Smoothing gives an even,
    // predictable glide every way you throw it.
    const dx = clientX - this.lastX;
    const dy = clientY - this.lastY;
    this.velocityX = this.velocityX * 0.7 + dx * 0.3;
    this.velocityY = this.velocityY * 0.7 + dy * 0.3;
    this.lastX = clientX;
    this.lastY = clientY;
    this.currentX = clientX - this.startX;
    this.currentY = clientY - this.startY;
  }

  onDragEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.wrapper.classList.remove("dragging");
    this.lastInteraction = Date.now();
    this.hasSnapped = false;

    // Mobile tap → stage the tile under the finger (only a still, brief, tap).
    if (this.tapCancelled) return;
    const moved = Math.hypot(
      this.lastX - this.pointerStartX,
      this.lastY - this.pointerStartY,
    );
    const elapsed = Date.now() - this.pointerStartTime;
    if (moved < 8 && elapsed < 350 && window.innerWidth < this.mobileBreakpoint) {
      this.openStageAt(this.pointerStartX, this.pointerStartY);
    }
  }

  createStage() {
    if (this.stage) return;
    const stage = document.createElement("div");
    stage.className = "discover-stage";
    stage.setAttribute("aria-hidden", "true");
    const inner = document.createElement("div");
    inner.className = "discover-stage_inner";
    stage.appendChild(inner);
    document.body.appendChild(stage);
    // Pointer-driven: gestures on the image zoom/pan; a tap on the backdrop
    // (anywhere but the image) closes. (Replaces the old click-to-close so a
    // double-tap on the image isn't swallowed as a close.)
    stage.addEventListener("pointerdown", this.onStagePointerDown);
    stage.addEventListener("pointermove", this.onStagePointerMove);
    stage.addEventListener("pointerup", this.onStagePointerUp);
    stage.addEventListener("pointercancel", this.onStagePointerUp);
    this.stage = stage;
    this.stageInner = inner;
  }

  // ---- Staged-image zoom (double-tap / pinch / pan) ----------------------
  applyZoom(animate: boolean) {
    const img = this.zImg;
    if (!img) return;
    // Smoothly ease settled zoom in/out (double-tap, pinch/pan release) unless
    // the user prefers reduced motion, in which case it snaps instantly.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    img.style.transformOrigin = "center center";
    // Set with `important` so it beats the page's `.hero-image { transition:
    // … !important }` theme rule (otherwise transform never eases and the zoom
    // just snaps).
    img.style.setProperty(
      "transition",
      animate && !reduce ? "transform .34s cubic-bezier(.22, 1, .36, 1)" : "none",
      "important",
    );
    img.style.transform = `translate(${this.zTx}px, ${this.zTy}px) scale(${this.zScale})`;
    img.style.cursor = this.zScale > 1 ? "grab" : "";
  }

  clampZoom() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx0 = this.zCx0 || vw / 2;
    const cy0 = this.zCy0 || vh / 2;
    const halfW = (this.zBaseW * this.zScale) / 2;
    const halfH = (this.zBaseH * this.zScale) / 2;
    // Per axis: while the scaled image fits on screen it stays centred IN THE
    // VIEWPORT (not at its resting spot); once it overflows, it can pan until
    // each edge meets the opposite viewport edge, plus breathing room. Both
    // measure from the true resting centre, so vertical panning works even
    // though the image doesn't rest exactly mid-screen.
    if (halfW * 2 <= vw) {
      this.zTx = vw / 2 - cx0;
    } else {
      this.zTx = Math.max(
        vw - halfW - ZOOM_PAD - cx0,
        Math.min(halfW + ZOOM_PAD - cx0, this.zTx),
      );
    }
    if (halfH * 2 <= vh) {
      this.zTy = vh / 2 - cy0;
    } else {
      this.zTy = Math.max(
        vh - halfH - ZOOM_PAD - cy0,
        Math.min(halfH + ZOOM_PAD - cy0, this.zTy),
      );
    }
  }

  resetZoom() {
    this.zScale = 1;
    this.zTx = 0;
    this.zTy = 0;
    this.zPointers.clear();
    this.zMoved = false;
    this.zLastTapTime = 0;
    if (this.zImg) {
      this.zImg.style.transition = "none";
      this.zImg.style.transform = "";
      this.zImg.style.cursor = "";
    }
  }

  toggleZoomAt(x: number, y: number) {
    if (!this.zImg) return;
    if (this.zScale > 1) {
      this.zScale = 1;
      this.zTx = 0;
      this.zTy = 0;
    } else {
      const s = 2.5;
      const rect = this.zImg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      this.zScale = s;
      this.zTx = -(x - cx) * (s - 1);
      this.zTy = -(y - cy) * (s - 1);
      this.clampZoom();
    }
    this.applyZoom(true);
  }

  onStagePointerDown(e: PointerEvent) {
    const img = this.zImg;
    this.zPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.zPointers.size === 1) {
      this.zDownOnImg = !!img && img.contains(e.target as Node);
      this.zMoved = false;
      this.zDownX = e.clientX;
      this.zDownY = e.clientY;
      this.zStartTx = this.zTx;
      this.zStartTy = this.zTy;
    } else if (this.zPointers.size === 2) {
      const pts = Array.from(this.zPointers.values());
      this.zStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      this.zStartScale = this.zScale;
      this.zStartMidX = (pts[0].x + pts[1].x) / 2;
      this.zStartMidY = (pts[0].y + pts[1].y) / 2;
      this.zStartTx = this.zTx;
      this.zStartTy = this.zTy;
      this.zMoved = true;
    }
  }

  onStagePointerMove(e: PointerEvent) {
    if (!this.zImg || !this.zPointers.has(e.pointerId)) return;
    this.zPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.zPointers.size >= 2) {
      const pts = Array.from(this.zPointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      this.zScale = Math.max(1, Math.min(4, this.zStartScale * (dist / this.zStartDist)));
      this.zTx = this.zStartTx + (midX - this.zStartMidX);
      this.zTy = this.zStartTy + (midY - this.zStartMidY);
      this.zMoved = true;
      this.clampZoom();
      this.applyZoom(false);
    } else if (this.zPointers.size === 1) {
      // Generous tap slop: quick thumb taps drift well past 6px, which used
      // to read as a pan and silently swallow backdrop-taps meant to close
      // (most noticeable in the standalone home-screen app).
      if (Math.hypot(e.clientX - this.zDownX, e.clientY - this.zDownY) > 12) {
        this.zMoved = true;
      }
      if (this.zScale > 1 && this.zDownOnImg) {
        this.zTx = this.zStartTx + (e.clientX - this.zDownX);
        this.zTy = this.zStartTy + (e.clientY - this.zDownY);
        this.clampZoom();
        this.applyZoom(false);
      }
    }
  }

  onStagePointerUp(e: PointerEvent) {
    this.zPointers.delete(e.pointerId);

    // A finger lifted mid-pinch: keep the remaining one as the new pan anchor.
    if (this.zPointers.size > 0) {
      const rem = Array.from(this.zPointers.values())[0];
      this.zDownX = rem.x;
      this.zDownY = rem.y;
      this.zStartTx = this.zTx;
      this.zStartTy = this.zTy;
      return;
    }

    if (this.zMoved) {
      // End of a pinch/pan: settle to 1x (recentred) if barely zoomed.
      if (this.zScale <= 1.02) {
        this.zScale = 1;
        this.zTx = 0;
        this.zTy = 0;
      } else {
        this.clampZoom();
      }
      this.applyZoom(true);
      return;
    }

    // A clean tap: on the backdrop → close; on the image → maybe double-tap.
    if (!this.zDownOnImg) {
      this.closeStage();
      return;
    }
    const now = Date.now();
    const near =
      Math.hypot(e.clientX - this.zLastTapX, e.clientY - this.zLastTapY) < 40;
    if (now - this.zLastTapTime < 300 && near) {
      this.zLastTapTime = 0;
      this.toggleZoomAt(e.clientX, e.clientY);
    } else {
      this.zLastTapTime = now;
      this.zLastTapX = e.clientX;
      this.zLastTapY = e.clientY;
    }
  }

  // Find the tile whose on-screen rect contains the point and bring it on stage.
  openStageAt(clientX: number, clientY: number) {
    if (!this.stage || !this.stageInner) return;
    const itemW = this.itemWidth;
    const itemH = this.itemHeight;
    for (const it of this.items) {
      if (
        clientX >= it.lastX &&
        clientX <= it.lastX + itemW &&
        clientY >= it.lastY &&
        clientY <= it.lastY + itemH
      ) {
        this.stageInner.innerHTML = it.el.innerHTML;
        // Pin the caption to the stage itself (bottom-centred, fixed on
        // screen) instead of flowing under the image — inside the column it
        // both wasted vertical room and pulled the image's rest position off
        // the viewport centre. The stage is untransformed, so absolute
        // positioning inside it sticks while the image zooms and pans.
        this.stage.querySelector(":scope > .hero-meta_data")?.remove();
        const meta = this.stageInner.querySelector(".hero-meta_data");
        if (meta) this.stage.appendChild(meta);
        this.zImg = this.stageInner.querySelector<HTMLElement>(".hero-image");
        this.resetZoom();
        if (this.zImg) {
          this.zBaseW = this.zImg.offsetWidth;
          this.zBaseH = this.zImg.offsetHeight;
          // Resting centre for the pan clamp. The inner wrapper's open/close
          // scale is centre-origin, so the centre point is already final here
          // even while that transition runs.
          const r = this.zImg.getBoundingClientRect();
          this.zCx0 = r.left + r.width / 2;
          this.zCy0 = r.top + r.height / 2;
        }
        this.stage.setAttribute("aria-hidden", "false");
        // Shared-element open: the staged image starts at the tapped tile's
        // exact rect (translate + non-uniform scale from its final resting
        // rect) and flies to place while the backdrop fades in under it. The
        // caption's own delayed fade is in CSS. Reduced motion skips the
        // flight and keeps the plain fade.
        if (
          this.zImg &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          const img = this.zImg;
          const dx = it.lastX + itemW / 2 - this.zCx0;
          const dy = it.lastY + itemH / 2 - this.zCy0;
          // `important` beats the page's `.hero-image { transition …
          // !important }` theme rule, same trick as applyZoom.
          img.style.setProperty("transition", "none", "important");
          img.style.transformOrigin = "center center";
          img.style.transform = `translate(${dx}px, ${dy}px) scale(${itemW / this.zBaseW}, ${itemH / this.zBaseH})`;
          void img.offsetWidth; // commit the start frame before easing out
          img.style.setProperty(
            "transition",
            "transform .5s cubic-bezier(.22, 1, .36, 1)",
            "important",
          );
          img.style.transform = "translate(0px, 0px) scale(1)";
        }
        // Next frame so the open transition runs from the collapsed state.
        // The source tile hides in the SAME frame the staged copy becomes
        // visible (is-open), so exactly one instance of the image is ever on
        // screen — the tile itself appears to travel.
        requestAnimationFrame(() => {
          this.stage?.classList.add("is-open");
          // The grid scene recedes with the stage: vignette + control bar
          // fade out (CSS on this class) so the flying image never pops in
          // front of the layers the tile was sitting behind. bar-defrost
          // kills the rows' backdrop blur for the whole trip (JS-timed on
          // close — see closeStage).
          document.documentElement.classList.add("stage-open");
          document.documentElement.classList.add("bar-defrost");
          it.el.style.visibility = "hidden";
          this.stagedCell = it;
        });
        // The grid is now static behind a backdrop-blur — stop the rAF so the
        // blur isn't recompositing a moving layer every frame (GPU finesse).
        cancelAnimationFrame(this.rafId);
        this.rafId = 0;
        return;
      }
    }
  }

  closeStage() {
    if (!this.stage) return;
    this.stage.classList.remove("is-open");
    this.stage.setAttribute("aria-hidden", "true");
    // Vignette + control bar fade back in (.3s) under the .45s return flight,
    // so the tile lands already dimmed by the restored gradient.
    document.documentElement.classList.remove("stage-open");
    // Re-frost the bar while it is still parked below the screen edge (its
    // rise starts at .45s) — an instant, invisible flip. A timer instead of a
    // transition delay because iOS mis-times delayed backdrop-filter
    // transitions and frosted the bar mid-rise.
    window.setTimeout(() => {
      document.documentElement.classList.remove("bar-defrost");
    }, 400);
    const img = this.zImg;
    const cell = this.stagedCell;
    this.zImg = null;
    this.stagedCell = null;
    // Reset gesture state now (gestures are dead with zImg null)…
    this.zScale = 1;
    this.zTx = 0;
    this.zTy = 0;
    this.zPointers.clear();
    this.zMoved = false;
    this.zLastTapTime = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (img && cell && !reduce) {
      // Reverse flight: from the current (possibly zoomed) transform back to
      // the tile's rect while the scrim fades out underneath. The image holds
      // full opacity for the whole trip; the real tile un-hides exactly when
      // the copy lands on it, and the stage's delayed visibility flip then
      // removes the copy — a seamless swap, pixel-identical at handover.
      const dx = cell.lastX + this.itemWidth / 2 - this.zCx0;
      const dy = cell.lastY + this.itemHeight / 2 - this.zCy0;
      img.style.opacity = "1";
      img.style.setProperty(
        "transition",
        "transform .45s cubic-bezier(.22, 1, .36, 1)",
        "important",
      );
      img.style.transform = `translate(${dx}px, ${dy}px) scale(${this.itemWidth / this.zBaseW}, ${this.itemHeight / this.zBaseH})`;
      window.setTimeout(() => {
        // Unless this same tile got re-staged during the flight.
        if (this.stagedCell !== cell) cell.el.style.visibility = "";
        img.style.opacity = "";
        img.style.transform = "";
        img.style.setProperty("transition", "none", "important");
      }, 460);
    } else {
      // Reduced motion: restore the tile and let the copy fade out in place
      // (dropping the inline transition hands control to the stylesheet's
      // opacity fade — the inline one only lists transform).
      if (cell) cell.el.style.visibility = "";
      if (img) {
        img.style.removeProperty("transition");
        window.setTimeout(() => {
          img.style.transform = "";
          img.style.cursor = "";
        }, 320);
      }
    }
    this.lastInteraction = Date.now();
    this.hasSnapped = false;
    // Resume the gallery loop (velocity is ~0 after a tap, so it stays put).
    if (!this.rafId) this.rafId = requestAnimationFrame(this.animate);
  }

  onWheel(e: WheelEvent) {
    e.preventDefault();
    this.snapping = false;
    this.hasSnapped = false;
    this.lastInteraction = Date.now();
    const deltaX = e.deltaX * this.wheelMultiplier;
    const deltaY = e.deltaY * this.wheelMultiplier;
    this.currentX -= deltaX;
    this.currentY -= deltaY;
    this.velocityX = -deltaX * 0.3;
    this.velocityY = -deltaY * 0.3;
  }

  // Pick the tile whose centre is nearest the viewport centre and set up a
  // smooth glide (in currentX/Y space) that brings it to the middle.
  startFocusSnap() {
    const viewW = this.wrapper.clientWidth || window.innerWidth;
    const viewH = this.wrapper.clientHeight || window.innerHeight;
    const cx = viewW / 2;
    const cy = viewH / 2;
    const halfW = this.itemWidth / 2;
    const halfH = this.itemHeight / 2;
    let best: Cell | null = null;
    let bestD = Infinity;
    for (const it of this.items) {
      const dx = it.lastX + halfW - cx;
      const dy = it.lastY + halfH - cy;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    if (!best) return;
    const dx = cx - (best.lastX + halfW);
    const dy = cy - (best.lastY + halfH);
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
      this.hasSnapped = true; // already centred — nothing to do
      return;
    }
    this.snapStartX = this.currentX;
    this.snapStartY = this.currentY;
    this.snapTargetX = this.currentX + dx;
    this.snapTargetY = this.currentY + dy;
    this.snapStartTime = Date.now();
    this.snapping = true;
  }

  animate() {
    if (!this.isDragging) {
      const vx = this.velocityX;
      const vy = this.velocityY;
      if (vx !== 0 || vy !== 0) {
        this.velocityX = Math.abs(vx) < 0.1 ? 0 : vx * this.friction;
        this.velocityY = Math.abs(vy) < 0.1 ? 0 : vy * this.friction;
        this.currentX += this.velocityX;
        this.currentY += this.velocityY;
      }
    }

    // Idle auto-focus. While gliding a tile to centre, ease it with a fixed
    // ease-in-out; otherwise, once still + past IDLE_MS of inactivity, kick it off.
    if (this.snapping) {
      const t = Math.min(1, (Date.now() - this.snapStartTime) / SNAP_MS);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.currentX = this.snapStartX + (this.snapTargetX - this.snapStartX) * e;
      this.currentY = this.snapStartY + (this.snapTargetY - this.snapStartY) * e;
      if (t >= 1) {
        this.snapping = false;
        this.hasSnapped = true;
      }
    } else if (
      !this.isDragging &&
      !this.hasSnapped &&
      Math.abs(this.velocityX) < 0.1 &&
      Math.abs(this.velocityY) < 0.1 &&
      Date.now() - this.lastInteraction > IDLE_MS
    ) {
      this.startFocusSnap();
    }

    const items = this.items;
    const len = items.length;
    const gridW = this.gridWidth;
    const gridH = this.gridHeight;
    const curX = this.currentX;
    const curY = this.currentY;
    const viewW = this.wrapper.clientWidth || window.innerWidth;
    const viewH = this.wrapper.clientHeight || window.innerHeight;
    const itemW = this.itemWidth;
    const itemH = this.itemHeight;

    for (let i = 0; i < len; i++) {
      const item = items[i];
      let x = ((((item.baseX + curX) % gridW) + gridW) % gridW);
      let y = ((((item.baseY + curY) % gridH) + gridH) % gridH);
      x = x - gridW / 2 + viewW / 2 - itemW / 2;
      y = y - gridH / 2 + viewH / 2 - itemH / 2;

      const wrapX = Math.floor((item.baseX + curX) / gridW);
      const wrapY = Math.floor((item.baseY + curY) / gridH);
      if (
        item.lastWrapX !== null &&
        (wrapX !== item.lastWrapX || wrapY !== item.lastWrapY)
      ) {
        this.swapContent(item);
      }
      item.lastWrapX = wrapX;
      item.lastWrapY = wrapY;

      x = x | 0;
      y = y | 0;
      if (x !== item.lastX || y !== item.lastY) {
        item.el.style.transform = `translate3d(${x}px,${y}px,0)`;
        item.lastX = x;
        item.lastY = y;
      }
    }

    this.rafId = requestAnimationFrame(this.animate);
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    clearTimeout(this.resizeTimeout);
    window.removeEventListener("mousemove", this.onDragMove);
    window.removeEventListener("mouseup", this.onDragEnd);
    window.removeEventListener("touchmove", this.onDragMove);
    window.removeEventListener("touchend", this.onDragEnd);
    window.removeEventListener("resize", this.onResize);
    this.wrapper.removeEventListener("mousedown", this.onDragStart);
    this.wrapper.removeEventListener("touchstart", this.onDragStart);
    this.wrapper.removeEventListener("wheel", this.onWheel);
    this.wrapper.removeEventListener("contextmenu", this.onContextMenu);
    this.list.removeEventListener("load", this.onImgLoad, true);
    if (this.stage) {
      this.stage.removeEventListener("click", this.closeStage);
      this.stage.remove();
      this.stage = null;
      this.stageInner = null;
    }
  }
}

const LIGHT = "#ffffff";
const DARK = "#080808";
// Extra pan room past the image edges when zoomed, so you can drag a touch
// beyond the side and still see a little breathing space.
const ZOOM_PAD = 44;

// Idle auto-focus timing.
const IDLE_MS = 3000; // inactivity before the camera glides to the nearest tile
const SNAP_MS = 750; // duration of that glide

function setThemeColor(color: string) {
  let metas = Array.from(
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  );
  if (metas.length === 0) {
    const m = document.createElement("meta");
    m.name = "theme-color";
    document.head.appendChild(m);
    metas = [m];
  }
  // Update every theme-color tag (and strip any media-scoped ones that could let
  // the system appearance win) so iOS Safari tints its chrome to match.
  for (const m of metas) {
    m.removeAttribute("media");
    m.setAttribute("content", color);
  }
}

export default function DiscoverGrid() {
  useEffect(() => {
    const wrapper = document.querySelector<HTMLElement>(".hero-list-wrapper");
    const list = document.querySelector<HTMLElement>(".hero-list");
    if (!wrapper || !list) return;

    const grid = new InfiniteGrid(wrapper, list, {
      itemWidth: 996,
      itemHeight: 560,
      gap: 80,
      mobileBreakpoint: 768,
      mobileWidthPercent: 0.8,
    });

    // Light/dark: follow the OS preference by default; a manual toggle overrides
    // it and persists in localStorage (so a refresh keeps the chosen mode). The
    // pre-paint head script already applied the same initial state to <html>.
    const THEME_KEY = "discover-theme";
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const readSaved = (): string | null => {
      try {
        return localStorage.getItem(THEME_KEY);
      } catch {
        return null;
      }
    };
    const applyTheme = (dark: boolean) => {
      root.classList.toggle("is-dark", dark);
      // color-scheme tells the browser the page itself is dark/light, which (with
      // theme-color) is what some browsers use to tint their surrounding chrome.
      root.style.colorScheme = dark ? "dark" : "light";
      // Keep --bg in sync: the page <body> carries the global `.body { background:
      // var(--bg) !important }` rule, and the pre-paint seed script sets --bg to
      // the initial theme colour. Without updating it here, toggling to light after
      // a dark load leaves the background stuck dark (everything else flips but the
      // gaps behind the tiles stay #080808). Setting it also eases in unison.
      root.style.setProperty("--bg", dark ? DARK : LIGHT);
      setThemeColor(dark ? DARK : LIGHT);
    };
    const saved = readSaved();
    applyTheme(saved ? saved === "dark" : mq.matches);

    const toggle = document.querySelector<HTMLElement>("[data-theme-toggle]");
    const onToggle = (e: Event) => {
      e.preventDefault();
      const next = !root.classList.contains("is-dark");
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      } catch {
        /* private mode / storage disabled — just don't persist */
      }
    };
    toggle?.addEventListener("click", onToggle);

    // Live-follow the OS preference only while the user hasn't set an override.
    const onSystem = (e: MediaQueryListEvent) => {
      if (!readSaved()) applyTheme(e.matches);
    };
    mq.addEventListener("change", onSystem);

    return () => {
      grid.destroy();
      toggle?.removeEventListener("click", onToggle);
      mq.removeEventListener("change", onSystem);
      root.classList.remove("is-dark");
      root.style.colorScheme = "";
    };
  }, []);

  return null;
}
