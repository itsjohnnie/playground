"use client";

import { useEffect, useRef } from "react";
import { asset } from "@/lib/asset";
import type { DiscoverItem } from "@/lib/content";

// View 3 — "cascade": independent columns of tiles drifting upward at
// different speeds, overlapping and lightly rotated so the underlying grid
// barely reads as one. Each column is a 1D version of the endless grid's
// torus wrap (discover-grid.tsx): tiles cycle past the top and reappear at
// the bottom with fresh content, forever. Driven by wheel/drag (matching the
// other two views' full-bleed, no-native-scroll canvas) plus a slow constant
// autoplay drift so it's always gently alive, even untouched.

type Tile = {
  el: HTMLElement;
  baseY: number;
  lastY: number;
  lastWrap: number | null;
  rot: number;
  scale: number;
};

type Column = {
  tiles: Tile[];
  cellH: number;
  length: number;
  speed: number;
  phase: number;
  pool: HTMLElement[];
  poolIndex: number;
};

class CascadeGrid {
  wrapper: HTMLElement;
  columnsEl: HTMLElement;
  sourceItems: HTMLElement[];
  columns: Column[] = [];

  itemWidth = 0;
  itemHeight = 0;
  gap = 0;
  mobileBreakpoint = 640;

  scrollPos = 0;
  velocity = 0;
  friction = 0.92;
  wheelMultiplier = 1.1;
  autoplaySpeed = 0.4; // px/frame at speed 1 — the constant idle drift

  isDragging = false;
  lastY = 0;
  tapCancelled = false;

  rafId = 0;
  resizeTimeout = 0;

  constructor(wrapper: HTMLElement, columnsEl: HTMLElement, sourcePool: HTMLElement) {
    this.wrapper = wrapper;
    this.columnsEl = columnsEl;
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

  calcLayout() {
    const vw = this.wrapper.clientWidth || window.innerWidth;
    const mobile = vw < this.mobileBreakpoint;
    const targetColWidth = mobile ? 108 : 190;
    const colCount = Math.max(3, Math.min(8, Math.round(vw / targetColWidth)));
    this.itemWidth = vw / colCount - (mobile ? 10 : 18);
    this.itemHeight = this.itemWidth * (560 / 996);
    this.gap = -Math.round(this.itemHeight * 0.08); // slight built-in overlap
    return colCount;
  }

  init() {
    const colCount = this.calcLayout();
    const viewH = this.wrapper.clientHeight || window.innerHeight;
    const cellH = this.itemHeight + this.gap;
    const tilesPerCol = Math.ceil(viewH / cellH) + 6;

    this.columnsEl.innerHTML = "";
    this.columns = [];

    for (let c = 0; c < colCount; c++) {
      const colEl = document.createElement("div");
      colEl.className = "cascade-column";
      colEl.style.width = `${this.itemWidth}px`;

      const pool = this.shuffle(this.sourceItems);
      const column: Column = {
        tiles: [],
        cellH,
        length: cellH * tilesPerCol,
        // Pseudo-random spread across ~0.7x–1.9x, deterministic per column so
        // layout is stable across a resize-triggered rebuild.
        speed: 0.7 + ((c * 47) % 100) / 100 * 1.2,
        phase: ((c * 0.37) % 1) * cellH * tilesPerCol,
        pool,
        poolIndex: 0,
      };

      for (let i = 0; i < tilesPerCol; i++) {
        const source = this.nextFrom(column);
        const clone = source.cloneNode(true) as HTMLElement;
        clone.classList.remove("cascade-source");
        clone.classList.add("cascade-tile");
        clone.style.width = `${this.itemWidth}px`;
        clone.style.height = `${this.itemHeight}px`;
        this.markLoaded(clone);
        colEl.appendChild(clone);

        const rot = (((i * 53 + c * 17) % 7) - 3) * 1.1;
        const scale = 1 + (((i * 31 + c * 13) % 10) - 5) / 100;
        column.tiles.push({ el: clone, baseY: i * cellH, lastY: -99999, lastWrap: null, rot, scale });
      }

      this.columnsEl.appendChild(colEl);
      this.columns.push(column);
    }
  }

  nextFrom(column: Column): HTMLElement {
    if (column.poolIndex >= column.pool.length) {
      column.pool = this.shuffle(this.sourceItems);
      column.poolIndex = 0;
    }
    return column.pool[column.poolIndex++];
  }

  swapContent(column: Column, tile: Tile) {
    const source = this.nextFrom(column);
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
    const itemH = this.itemHeight;

    for (const col of this.columns) {
      const colScroll = this.scrollPos * col.speed + col.phase;
      for (const tile of col.tiles) {
        let y = (((tile.baseY - colScroll) % col.length) + col.length) % col.length;
        y = y - col.length / 2 + viewH / 2 - itemH / 2;

        const wrapIndex = Math.floor((tile.baseY - colScroll) / col.length);
        if (tile.lastWrap !== null && wrapIndex !== tile.lastWrap) {
          this.swapContent(col, tile);
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
  const columnsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const pool = poolRef.current;
    const columns = columnsRef.current;
    if (!wrapper || !pool || !columns) return;
    const grid = new CascadeGrid(wrapper, columns, pool);
    grid.start();
    return () => grid.destroy();
  }, []);

  return (
    <div className="cascade-viewport" ref={wrapperRef}>
      {/* Hidden source pool: cloned into each column by the engine above. */}
      <div className="cascade-pool" ref={poolRef} aria-hidden="true">
        {items.map((it) => (
          <div className="cascade-source" key={it.image}>
            <img src={asset(it.image)} loading="eager" alt="" className="cascade-image" />
          </div>
        ))}
      </div>
      <div className="cascade-columns" ref={columnsRef} role="list" aria-label="Discover cascade" />
    </div>
  );
}
