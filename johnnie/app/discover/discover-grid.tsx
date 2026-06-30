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
  friction = 0.92;
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

  // Mobile tap-to-stage: a quick tap (not a drag/fling-stop) brings the tapped
  // tile front-and-center, enlarged, with its meta at the bottom over a dimmed
  // backdrop. Tapping the stage dismisses it.
  pointerStartX = 0;
  pointerStartY = 0;
  pointerStartTime = 0;
  tapCancelled = false;
  stage: HTMLElement | null = null;
  stageInner: HTMLElement | null = null;

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

    this.init();
  }

  init() {
    this.calculateDimensions();
    this.createGrid();
    this.createStage();
    this.setupEventListeners();
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
  }

  createGrid() {
    this.contentPool = this.shuffleArray(this.originalItems);
    this.poolIndex = 0;

    this.cols = Math.ceil(window.innerWidth / this.cellWidth) + 4;
    this.rows = Math.ceil(window.innerHeight / this.cellHeight) + 4;
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

    window.addEventListener("resize", this.onResize, { passive: true });
  }

  onContextMenu = (e: Event) => e.preventDefault();

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
    const point = "touches" in e ? e.touches[0] : e;
    const clientX = point.clientX;
    const clientY = point.clientY;
    this.velocityX = clientX - this.lastX;
    this.velocityY = clientY - this.lastY;
    this.lastX = clientX;
    this.lastY = clientY;
    this.currentX = clientX - this.startX;
    this.currentY = clientY - this.startY;
  }

  onDragEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.wrapper.classList.remove("dragging");

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
    stage.addEventListener("click", this.closeStage);
    this.stage = stage;
    this.stageInner = inner;
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
        this.stage.setAttribute("aria-hidden", "false");
        // Next frame so the open transition runs from the collapsed state.
        requestAnimationFrame(() => this.stage?.classList.add("is-open"));
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
    // Resume the gallery loop (velocity is ~0 after a tap, so it stays put).
    if (!this.rafId) this.rafId = requestAnimationFrame(this.animate);
  }

  onWheel(e: WheelEvent) {
    e.preventDefault();
    const deltaX = e.deltaX * this.wheelMultiplier;
    const deltaY = e.deltaY * this.wheelMultiplier;
    this.currentX -= deltaX;
    this.currentY -= deltaY;
    this.velocityX = -deltaX * 0.3;
    this.velocityY = -deltaY * 0.3;
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

    const items = this.items;
    const len = items.length;
    const gridW = this.gridWidth;
    const gridH = this.gridHeight;
    const curX = this.currentX;
    const curY = this.currentY;
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
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

function setThemeColor(color: string) {
  let m = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!m) {
    m = document.createElement("meta");
    m.name = "theme-color";
    document.head.appendChild(m);
  }
  m.setAttribute("content", color);
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

    // Native light/dark toggle (no visual-builder runtime).
    const applyTheme = (dark: boolean) => {
      document.body.classList.toggle("is-dark", dark);
      setThemeColor(dark ? DARK : LIGHT);
    };
    applyTheme(false);

    const toggle = document.querySelector<HTMLElement>("[data-theme-toggle]");
    const onToggle = (e: Event) => {
      e.preventDefault();
      applyTheme(!document.body.classList.contains("is-dark"));
    };
    toggle?.addEventListener("click", onToggle);

    return () => {
      grid.destroy();
      toggle?.removeEventListener("click", onToggle);
      document.body.classList.remove("is-dark");
    };
  }, []);

  return null;
}
