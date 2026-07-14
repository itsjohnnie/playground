"use client";

import { useEffect, useRef } from "react";
import { asset } from "@/lib/asset";
import type { DiscoverItem } from "@/lib/content";

// View 3 — "cascade": a handful of lanes drifting upward at different speeds
// — one dominant centred lane (what you see first), one overlapping in FRONT
// of it, and one off to the right — rather than a dense wall of small
// columns. Each lane's tiles alternate into two offset sub-columns (a
// shifted, brick-like stack) rather than one straight column, and stay
// axis-aligned — no rotation. Each lane is a 1D version of the endless grid's
// torus wrap (discover-grid.tsx): tiles cycle past the top and reappear at
// the bottom with fresh content, forever. Driven by wheel/drag (matching the
// other two views' full-bleed, no-native-scroll canvas) plus a slow constant
// autoplay drift so it's always gently alive, even untouched. Tiles are sized
// so only a handful are ever on screen at once — big and legible, not a
// wallpaper.

// Every image is the same 996x560 shape as the grid/globe views — tile
// height is always DERIVED from width via this ratio, never picked
// independently, so a tile is never a different shape than its photo and
// object-fit: cover never has to crop anything off to make it fit.
const IMAGE_RATIO = 560 / 996;

type LaneConfig = {
  centerFrac: number; // horizontal centre, as a fraction of viewport width
  speed: number;
  z: number; // stacking order — higher reads as "in front"
};

// Every lane uses the SAME tile width (height follows from IMAGE_RATIO) —
// lanes differ in position, speed and stacking order, never in size, so no
// tile is ever bigger or smaller than any other. Big enough that the lanes
// positioned toward an edge bleed past the viewport there, rather than
// every tile being confined within a safe margin.
const DESKTOP_TILE_WIDTH_FRAC = 0.42;
const MOBILE_TILE_WIDTH_FRAC = 0.56;

// Desktop: one centred lane, with a lane overlapping its left edge from IN
// FRONT and another to the right — accents around a clear centre, not three
// identical columns marching in a row. A fold shows a couple tiles in full
// plus edges/corners of a few more as they scroll past or slide behind a
// neighbouring lane, not a neat non-overlapping set of exactly six.
const DESKTOP_LANES: LaneConfig[] = [
  { centerFrac: 0.2, speed: 0.7, z: 3 },
  { centerFrac: 0.52, speed: 1, z: 2 },
  { centerFrac: 0.86, speed: 1.3, z: 1 },
];
// Mobile: just the centre lane (prominent) and a peek of the right lane
// (bleeding past the right edge) — three side-by-side lanes don't fit
// legibly on a narrow phone.
const MOBILE_LANES: LaneConfig[] = [
  { centerFrac: 0.42, speed: 1, z: 2 },
  { centerFrac: 0.88, speed: 1.3, z: 1 },
];
const MOBILE_BREAKPOINT = 720;

type Tile = {
  el: HTMLElement;
  baseY: number;
  lastY: number;
  lastWrap: number | null;
  xShift: number;
};

type Lane = {
  el: HTMLElement;
  tiles: Tile[];
  itemW: number;
  itemH: number;
  cellH: number;
  length: number;
  speed: number;
  phase: number;
};

class CascadeGrid {
  wrapper: HTMLElement;
  lanesEl: HTMLElement;
  sourceItems: HTMLElement[];
  lanes: Lane[] = [];

  mobileBreakpoint = MOBILE_BREAKPOINT;

  // ONE shared pool across every lane (not per-lane) — content-swaps for the
  // front, centre, and right lanes all draw from the same sequence, so the
  // same photo is never handed to two lanes at once.
  pool: HTMLElement[] = [];
  poolIndex = 0;
  // Which images are currently on screen (src -> how many tiles show it, in
  // ANY lane) — consulted so the same photo never shows twice in one fold.
  usedImages = new Map<string, number>();

  scrollPos = 0;
  velocity = 0;
  friction = 0.92;
  wheelMultiplier = 1.1;
  autoplaySpeed = 0.4; // px/frame at speed 1 — the constant idle drift

  isDragging = false;
  lastY = 0;

  rafId = 0;
  resizeTimeout = 0;

  constructor(wrapper: HTMLElement, lanesEl: HTMLElement, sourcePool: HTMLElement) {
    this.wrapper = wrapper;
    this.lanesEl = lanesEl;
    this.sourceItems = Array.from(sourcePool.children) as HTMLElement[];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Keep wheel/drag scrolling, but drop the constant idle drift.
      this.autoplaySpeed = 0;
    }

    this.animate = this.animate.bind(this);
    this.onDown = this.onDown.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onResize = this.onResize.bind(this);

    this.init();
  }

  shuffle(arr: HTMLElement[]): HTMLElement[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  markLoaded(el: HTMLElement) {
    const img = el.querySelector("img");
    if (img && (img as HTMLImageElement).complete) img.classList.add("is-loaded");
  }

  init() {
    const vw = this.wrapper.clientWidth || window.innerWidth;
    const vh = this.wrapper.clientHeight || window.innerHeight;
    const isMobile = vw < this.mobileBreakpoint;
    const configs = isMobile ? MOBILE_LANES : DESKTOP_LANES;
    // ONE width for every lane — the only thing that ever varies is position,
    // speed and stacking order, never size.
    const itemW = (isMobile ? MOBILE_TILE_WIDTH_FRAC : DESKTOP_TILE_WIDTH_FRAC) * vw;
    const itemH = itemW * IMAGE_RATIO;

    this.lanesEl.innerHTML = "";
    this.lanes = [];
    this.pool = this.shuffle(this.sourceItems);
    this.poolIndex = 0;
    this.usedImages.clear();

    configs.forEach((cfg, laneIndex) => {
      const gap = Math.round(itemH * 0.32); // real breathing room between stacked tiles
      const cellH = itemH + gap;
      const tilesPerLane = Math.ceil(vh / cellH) + 4;

      const laneEl = document.createElement("div");
      laneEl.className = "cascade-lane";
      laneEl.style.width = `${itemW}px`;
      laneEl.style.left = `${cfg.centerFrac * vw - itemW / 2}px`;
      laneEl.style.zIndex = String(cfg.z);
      // Drives the tile shadow's weight in CSS — the lane closest to the
      // "camera" (highest z) casts the most present shadow, tapering off
      // toward the back lane, instead of every tile casting an identical
      // shadow regardless of its depth in the stack.
      laneEl.dataset.depth = String(cfg.z);

      const lane: Lane = {
        el: laneEl,
        tiles: [],
        itemW,
        itemH,
        cellH,
        length: cellH * tilesPerLane,
        speed: cfg.speed,
        phase: ((laneIndex * 0.37) % 1) * cellH * tilesPerLane,
      };

      for (let i = 0; i < tilesPerLane; i++) {
        const source = this.nextFrom();
        const clone = source.cloneNode(true) as HTMLElement;
        clone.classList.remove("cascade-source");
        clone.classList.add("cascade-tile");
        clone.style.width = `${itemW}px`;
        clone.style.height = `${itemH}px`;
        this.markLoaded(clone);
        this.markUsed(this.imageKeyOf(clone));
        laneEl.appendChild(clone);

        // Alternate left/right so tiles fall into two offset sub-columns
        // within the lane (a shifted, brick-like stack) instead of one
        // straight column — no rotation and no size variation, so every
        // tile in a lane stays the same shape and size as every other.
        const xShift = (i % 2 === 0 ? -1 : 1) * itemW * 0.16;
        lane.tiles.push({ el: clone, baseY: i * cellH, lastY: -99999, lastWrap: null, xShift });
      }

      this.lanesEl.appendChild(laneEl);
      this.lanes.push(lane);
    });
  }

  imageKeyOf(el: HTMLElement): string | null {
    return el.querySelector("img")?.getAttribute("src") ?? null;
  }

  markUsed(key: string | null) {
    if (!key) return;
    this.usedImages.set(key, (this.usedImages.get(key) || 0) + 1);
  }

  unmarkUsed(key: string | null) {
    if (!key) return;
    const n = (this.usedImages.get(key) || 0) - 1;
    if (n <= 0) this.usedImages.delete(key);
    else this.usedImages.set(key, n);
  }

  // Draws the next tile's source from the ONE shared pool, skipping any
  // image already on screen in any lane — the pool (~100 images) is always
  // far bigger than the handful of tiles ever visible at once, so this
  // reliably finds a free one well within a single lap.
  nextFrom(): HTMLElement {
    const attempts = this.sourceItems.length;
    for (let n = 0; n < attempts; n++) {
      if (this.poolIndex >= this.pool.length) {
        this.pool = this.shuffle(this.sourceItems);
        this.poolIndex = 0;
      }
      const candidate = this.pool[this.poolIndex++];
      const key = this.imageKeyOf(candidate);
      if (!key || !this.usedImages.has(key)) return candidate;
    }
    // Every image is already in view (shouldn't happen) — fall back rather
    // than loop forever.
    if (this.poolIndex >= this.pool.length) {
      this.pool = this.shuffle(this.sourceItems);
      this.poolIndex = 0;
    }
    return this.pool[this.poolIndex++];
  }

  swapContent(tile: Tile) {
    // Keep the tile's current image marked "in use" while drawing the next
    // one, so it can't be swapped right back to what it already shows — only
    // free it once a genuinely different image has been found.
    const oldKey = this.imageKeyOf(tile.el);
    const source = this.nextFrom();
    this.unmarkUsed(oldKey);
    tile.el.innerHTML = source.innerHTML;
    this.markUsed(this.imageKeyOf(tile.el));
    this.markLoaded(tile.el);
  }

  setupEventListeners() {
    const wrapper = this.wrapper;
    wrapper.addEventListener("mousedown", this.onDown, { passive: false });
    window.addEventListener("mousemove", this.onMove, { passive: true });
    window.addEventListener("mouseup", this.onUp, { passive: true });
    wrapper.addEventListener("touchstart", this.onDown, { passive: false });
    window.addEventListener("touchmove", this.onMove, { passive: true });
    window.addEventListener("touchend", this.onUp, { passive: true });
    wrapper.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("resize", this.onResize, { passive: true });
  }

  onResize() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = window.setTimeout(() => this.init(), 250);
  }

  onDown(e: MouseEvent | TouchEvent) {
    this.isDragging = true;
    this.wrapper.classList.add("dragging");
    this.velocity = 0;
    const point = "touches" in e ? e.touches[0] : e;
    this.lastY = point.clientY;
    e.preventDefault();
  }

  onMove(e: MouseEvent | TouchEvent) {
    if (!this.isDragging) return;
    const point = "touches" in e ? e.touches[0] : e;
    const dy = point.clientY - this.lastY;
    this.lastY = point.clientY;
    // Content follows the finger: dragging up (dy < 0) advances scroll (down-scroll feel).
    this.scrollPos -= dy;
    this.velocity = this.velocity * 0.7 - dy * 0.3;
  }

  onUp() {
    this.isDragging = false;
    this.wrapper.classList.remove("dragging");
  }

  onWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY * this.wheelMultiplier;
    this.scrollPos += delta;
    this.velocity = delta * 0.3;
  }

  animate() {
    if (!this.isDragging) {
      this.scrollPos += this.velocity + this.autoplaySpeed;
      this.velocity = Math.abs(this.velocity) < 0.05 ? 0 : this.velocity * this.friction;
    }

    const viewH = this.wrapper.clientHeight || window.innerHeight;

    for (const lane of this.lanes) {
      const laneScroll = this.scrollPos * lane.speed + lane.phase;
      for (const tile of lane.tiles) {
        let y = (((tile.baseY - laneScroll) % lane.length) + lane.length) % lane.length;
        y = y - lane.length / 2 + viewH / 2 - lane.itemH / 2;

        const wrapIndex = Math.floor((tile.baseY - laneScroll) / lane.length);
        if (tile.lastWrap !== null && wrapIndex !== tile.lastWrap) {
          this.swapContent(tile);
        }
        tile.lastWrap = wrapIndex;

        const yi = y | 0;
        if (yi !== tile.lastY) {
          tile.el.style.transform = `translate3d(${tile.xShift}px, ${yi}px, 0)`;
          tile.lastY = yi;
        }
      }
    }

    this.rafId = requestAnimationFrame(this.animate);
  }

  start() {
    this.setupEventListeners();
    this.rafId = requestAnimationFrame(this.animate);
    requestAnimationFrame(() => requestAnimationFrame(() => this.wrapper.classList.add("ready")));
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    clearTimeout(this.resizeTimeout);
    window.removeEventListener("mousemove", this.onMove);
    window.removeEventListener("mouseup", this.onUp);
    window.removeEventListener("touchmove", this.onMove);
    window.removeEventListener("touchend", this.onUp);
    window.removeEventListener("resize", this.onResize);
    this.wrapper.removeEventListener("mousedown", this.onDown);
    this.wrapper.removeEventListener("touchstart", this.onDown);
    this.wrapper.removeEventListener("wheel", this.onWheel);
  }
}

export default function CascadeView({ items }: { items: DiscoverItem[] }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const pool = poolRef.current;
    const lanes = lanesRef.current;
    if (!wrapper || !pool || !lanes) return;
    const grid = new CascadeGrid(wrapper, lanes, pool);
    grid.start();
    return () => grid.destroy();
  }, []);

  return (
    <div className="cascade-viewport" ref={wrapperRef}>
      {/* Hidden source pool: cloned into each lane by the engine above. */}
      <div className="cascade-pool" ref={poolRef} aria-hidden="true">
        {items.map((it) => (
          <div className="cascade-source" key={it.image}>
            <img src={asset(it.image)} loading="eager" alt="" className="cascade-image" />
          </div>
        ))}
      </div>
      <div className="cascade-columns" ref={lanesRef} role="list" aria-label="Discover cascade" />
    </div>
  );
}
