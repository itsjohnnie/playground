"use client";

import { useEffect, useRef } from "react";
import { asset } from "@/lib/asset";
import type { DiscoverItem } from "@/lib/content";

// View 3 — "cascade": a handful of lanes drifting upward at different speeds
// — one dominant centred lane (what you see first), one overlapping in FRONT
// of it, and one off to the right — rather than a dense wall of small
// columns. Each lane is a 1D version of the endless grid's torus wrap
// (discover-grid.tsx): tiles cycle past the top and reappear at the bottom
// with fresh content, forever. Driven by wheel/drag (matching the other two
// views' full-bleed, no-native-scroll canvas) plus a slow constant autoplay
// drift so it's always gently alive, even untouched. Tiles are sized so only
// a handful are ever on screen at once — big and legible, not a wallpaper.

type LaneConfig = {
  centerFrac: number; // horizontal centre, as a fraction of viewport width
  widthFrac: number; // tile width, as a fraction of viewport width
  heightFrac: number; // tile height, as a fraction of viewport height
  speed: number;
  z: number; // stacking order — higher reads as "in front"
};

// Desktop: one dominant centred lane, with a smaller lane overlapping its
// left edge from IN FRONT and another smaller one to the right — accents
// around a clear centre, not three equal columns filling the screen.
const DESKTOP_LANES: LaneConfig[] = [
  { centerFrac: 0.38, widthFrac: 0.16, heightFrac: 0.36, speed: 0.7, z: 3 },
  { centerFrac: 0.5, widthFrac: 0.3, heightFrac: 0.48, speed: 1, z: 2 },
  { centerFrac: 0.64, widthFrac: 0.17, heightFrac: 0.34, speed: 1.3, z: 1 },
];
// Mobile: just the centre lane (prominent) and a peek of the right lane —
// three side-by-side lanes don't fit legibly on a narrow phone.
const MOBILE_LANES: LaneConfig[] = [
  { centerFrac: 0.44, widthFrac: 0.5, heightFrac: 0.38, speed: 1, z: 2 },
  { centerFrac: 0.9, widthFrac: 0.28, heightFrac: 0.32, speed: 1.3, z: 1 },
];
const MOBILE_BREAKPOINT = 720;

type Tile = {
  el: HTMLElement;
  baseY: number;
  lastY: number;
  lastWrap: number | null;
  rot: number;
  scale: number;
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
  pool: HTMLElement[];
  poolIndex: number;
};

class CascadeGrid {
  wrapper: HTMLElement;
  lanesEl: HTMLElement;
  sourceItems: HTMLElement[];
  lanes: Lane[] = [];

  mobileBreakpoint = MOBILE_BREAKPOINT;

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
    const configs = vw < this.mobileBreakpoint ? MOBILE_LANES : DESKTOP_LANES;

    this.lanesEl.innerHTML = "";
    this.lanes = [];

    configs.forEach((cfg, laneIndex) => {
      const itemW = cfg.widthFrac * vw;
      const itemH = cfg.heightFrac * vh;
      const gap = -Math.round(itemH * 0.08); // slight built-in overlap
      const cellH = itemH + gap;
      const tilesPerLane = Math.ceil(vh / cellH) + 4;

      const laneEl = document.createElement("div");
      laneEl.className = "cascade-lane";
      laneEl.style.width = `${itemW}px`;
      laneEl.style.left = `${cfg.centerFrac * vw - itemW / 2}px`;
      laneEl.style.zIndex = String(cfg.z);

      const pool = this.shuffle(this.sourceItems);
      const lane: Lane = {
        el: laneEl,
        tiles: [],
        itemW,
        itemH,
        cellH,
        length: cellH * tilesPerLane,
        speed: cfg.speed,
        phase: ((laneIndex * 0.37) % 1) * cellH * tilesPerLane,
        pool,
        poolIndex: 0,
      };

      for (let i = 0; i < tilesPerLane; i++) {
        const source = this.nextFrom(lane);
        const clone = source.cloneNode(true) as HTMLElement;
        clone.classList.remove("cascade-source");
        clone.classList.add("cascade-tile");
        clone.style.width = `${itemW}px`;
        clone.style.height = `${itemH}px`;
        this.markLoaded(clone);
        laneEl.appendChild(clone);

        const rot = (((i * 53 + laneIndex * 17) % 7) - 3) * 0.8;
        const scale = 1 + (((i * 31 + laneIndex * 13) % 10) - 5) / 140;
        lane.tiles.push({ el: clone, baseY: i * cellH, lastY: -99999, lastWrap: null, rot, scale });
      }

      this.lanesEl.appendChild(laneEl);
      this.lanes.push(lane);
    });
  }

  nextFrom(lane: Lane): HTMLElement {
    if (lane.poolIndex >= lane.pool.length) {
      lane.pool = this.shuffle(this.sourceItems);
      lane.poolIndex = 0;
    }
    return lane.pool[lane.poolIndex++];
  }

  swapContent(lane: Lane, tile: Tile) {
    const source = this.nextFrom(lane);
    tile.el.innerHTML = source.innerHTML;
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
          this.swapContent(lane, tile);
        }
        tile.lastWrap = wrapIndex;

        const yi = y | 0;
        if (yi !== tile.lastY) {
          tile.el.style.transform = `translate3d(0, ${yi}px, 0) rotate(${tile.rot}deg) scale(${tile.scale})`;
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
