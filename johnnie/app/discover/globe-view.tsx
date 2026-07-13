"use client";

import { useEffect, useMemo, useRef } from "react";
import { asset } from "@/lib/asset";
import type { DiscoverItem } from "@/lib/content";

// View 2 — a rotating globe of tiles. This is a classic "3D tag cloud"
// projection (orthographic: rotate unit-sphere points in JS, use depth only
// for scale/opacity/z-index) rather than real CSS 3D transforms — it stays
// crisp on raster photos at any angle and needs no perspective/backface
// wrangling, at the cost of the images never actually turning to face edge-on.
// That trade reads as "photos floating on a globe" which is exactly the brief.
const TILE_COUNT = 72;

function sampleItems(items: DiscoverItem[], count: number): DiscoverItem[] {
  if (items.length === 0) return [];
  // Stride through the pool (not a plain slice) so the sphere isn't just
  // whichever items happen to sort first.
  const stride = Math.max(1, Math.floor(items.length / count) || 1);
  const out: DiscoverItem[] = [];
  for (let i = 0; i < count; i++) out.push(items[(i * stride) % items.length]);
  return out;
}

type Point = { x: number; y: number; z: number };

// Golden-angle spiral: distributes `count` points evenly over a unit sphere
// without the pinching a naive latitude/longitude grid gets at the poles.
function fibonacciSphere(count: number): Point[] {
  const pts: Point[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = count > 1 ? 1 - (i / (count - 1)) * 2 : 0;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
  }
  return pts;
}

class Globe {
  el: HTMLElement;
  tiles: HTMLElement[];
  points: Point[];

  yaw = 0.5;
  pitch = -0.18;
  velYaw = 0;
  velPitch = 0;
  friction = 0.94;
  autoSpin = 0.0022; // idle drift, radians/frame — keeps it alive at rest

  isDragging = false;
  lastX = 0;
  lastY = 0;

  radius = 0;
  targetRadius = 0;
  startTime = 0;
  introMs = 1300;

  rafId = 0;
  resizeTimeout = 0;

  constructor(el: HTMLElement, tiles: HTMLElement[]) {
    this.el = el;
    this.tiles = tiles;
    this.points = fibonacciSphere(tiles.length);

    this.animate = this.animate.bind(this);
    this.onDown = this.onDown.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);
    this.onResize = this.onResize.bind(this);

    this.calcRadius();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Keep the drag-to-rotate interaction, but drop the automatic idle
      // spin and the intro zoom (start already at rest, full size).
      this.autoSpin = 0;
      this.introMs = 1;
    }
    this.startTime = performance.now();
    this.setup();
  }

  calcRadius() {
    const w = this.el.clientWidth || window.innerWidth;
    const h = this.el.clientHeight || window.innerHeight;
    // Bounded by the smaller axis so portrait phones get a fully centred
    // globe (never clipped) while wide screens still get a generous sphere.
    this.targetRadius = Math.min(w, h) * 0.36;
  }

  setup() {
    const el = this.el;
    el.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointermove", this.onMove, { passive: true });
    window.addEventListener("pointerup", this.onUp, { passive: true });
    window.addEventListener("pointercancel", this.onUp, { passive: true });
    window.addEventListener("resize", this.onResize, { passive: true });
    this.rafId = requestAnimationFrame(this.animate);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("ready")));
  }

  onResize() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = window.setTimeout(() => this.calcRadius(), 200);
  }

  onDown(e: PointerEvent) {
    this.isDragging = true;
    this.el.setPointerCapture(e.pointerId);
    this.el.classList.add("dragging");
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.velYaw = 0;
    this.velPitch = 0;
  }

  onMove(e: PointerEvent) {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    const k = 0.0044;
    this.velYaw = dx * k;
    this.velPitch = dy * k;
    this.yaw += this.velYaw;
    this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch + this.velPitch));
  }

  onUp(e: PointerEvent) {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.el.classList.remove("dragging");
    if (this.el.hasPointerCapture(e.pointerId)) this.el.releasePointerCapture(e.pointerId);
  }

  animate() {
    if (!this.isDragging) {
      this.yaw += this.velYaw + this.autoSpin;
      this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch + this.velPitch));
      this.velYaw *= this.friction;
      this.velPitch *= this.friction;
      if (Math.abs(this.velYaw) < 0.00005) this.velYaw = 0;
      if (Math.abs(this.velPitch) < 0.00005) this.velPitch = 0;
    }

    const elapsed = performance.now() - this.startTime;
    const t = Math.min(1, elapsed / this.introMs);
    const eased = 1 - Math.pow(1 - t, 3);
    this.radius = 22 + (this.targetRadius - 22) * eased;

    const cosYaw = Math.cos(this.yaw);
    const sinYaw = Math.sin(this.yaw);
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);

    for (let i = 0; i < this.tiles.length; i++) {
      const p = this.points[i];
      // Rotate the base sphere point by yaw (around Y), then pitch (around X).
      const x1 = p.x * cosYaw - p.z * sinYaw;
      const z1 = p.x * sinYaw + p.z * cosYaw;
      const y1 = p.y * cosPitch - z1 * sinPitch;
      const z2 = p.y * sinPitch + z1 * cosPitch;

      const depth = (z2 + 1) / 2; // 0 far .. 1 near
      const scale = 0.55 + depth * 0.55;
      const x = x1 * this.radius;
      const y = y1 * this.radius;

      const tile = this.tiles[i];
      tile.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      tile.style.opacity = String((0.35 + depth * 0.65) * Math.min(1, t * 1.6));
      tile.style.zIndex = String(Math.round((z2 + 1) * 500));
    }

    this.rafId = requestAnimationFrame(this.animate);
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    clearTimeout(this.resizeTimeout);
    this.el.removeEventListener("pointerdown", this.onDown);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("pointercancel", this.onUp);
    window.removeEventListener("resize", this.onResize);
  }
}

export default function GlobeView({ items }: { items: DiscoverItem[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const tiles = useMemo(() => sampleItems(items, TILE_COUNT), [items]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const tileEls = Array.from(el.querySelectorAll<HTMLElement>(".globe-tile"));
    if (tileEls.length === 0) return;
    // Cached images are already complete and won't fire onLoad — mark now.
    for (const t of tileEls) {
      const img = t.querySelector("img");
      if (img && (img as HTMLImageElement).complete) img.classList.add("is-loaded");
    }
    const globe = new Globe(el, tileEls);
    return () => globe.destroy();
  }, [tiles]);

  return (
    <div className="globe-viewport" ref={viewportRef}>
      <div className="globe-stage" role="list" aria-label="Discover globe">
        {tiles.map((it, i) => (
          <div role="listitem" className="globe-tile" key={`${it.image}-${i}`}>
            <img
              src={asset(it.image)}
              loading="eager"
              alt=""
              className="globe-image"
              onLoad={(e) => e.currentTarget.classList.add("is-loaded")}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
