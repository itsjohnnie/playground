"use client";

import { useEffect, useMemo, useRef } from "react";
import { asset } from "@/lib/asset";
import type { DiscoverItem } from "@/lib/content";

// View 2 — a rotating globe of tiles, using REAL CSS 3D: each tile gets a
// fixed rotateY(lon) rotateX(lat) translateZ(radius) transform that plants it
// tangent to the sphere's surface at that point (like a decal), and the whole
// sphere spins as one rigid body via a single rotateX/rotateY on the parent
// stage. That lets the browser's own 3D engine handle perspective foreshortening,
// depth sorting, and hiding the far hemisphere (backface-visibility) — instead
// of the previous flat "billboard" hack (translate + manual scale + z-index),
// which never actually turned the images to face their point on the sphere.
// A wide, CLEAN, evenly-aligned grid — every row shares the SAME column
// count, so columns run as straight lines pole to pole, like meridians on a
// real globe — rather than an evenly-scattered cloud of points. ROWS/COLS/
// LAT_SPAN are tuned together so row-to-row spacing (always exactly equal —
// equal angle steps on a sphere always cover equal arc length) MATCHES
// column-to-column spacing at the equator (see the ratio note below); tiles
// are small so that natural, expected pole convergence (exactly like
// longitude lines on a schoolroom globe) stays subtle rather than pinching
// tiles together up top and down bottom.
const ROWS = 13;
const COLS = 28;
const LAT_SPAN = 150; // degrees between the top and bottom row, centred on the equator
// Row spacing = LAT_SPAN/(ROWS-1) = 12.5°; column spacing at the equator =
// 360/COLS = 12.857° — a 2.9% difference, close enough to read as one
// consistent grid rather than two different spacings stitched together.
const PERSPECTIVE_RATIO = 3.1; // camera distance as a multiple of the sphere radius
const TILE_COUNT = ROWS * COLS;

function sampleItems(items: DiscoverItem[], count: number): DiscoverItem[] {
  if (items.length === 0) return [];
  // Stride through the pool (not a plain slice) so the sphere isn't just
  // whichever items happen to sort first.
  const stride = Math.max(1, Math.floor(items.length / count) || 1);
  const out: DiscoverItem[] = [];
  for (let i = 0; i < count; i++) out.push(items[(i * stride) % items.length]);
  return out;
}

type SpherePoint = { x: number; y: number; z: number; latDeg: number; lonDeg: number };

// Latitude/longitude grid: `rows` evenly-spaced bands between the poles (left
// open rather than pinched to a single point at +/-90, which would bunch
// every column into one spot), each carrying the SAME `cols` evenly-spaced
// tiles around the full 360° — so columns line up into straight vertical
// lines across every row. x/y/z are the point CSS's rotateY(lon) rotateX(lat)
// translateZ(r) chain actually lands on (see the derivation note in
// animate()) — kept alongside the angles since the per-frame depth/opacity
// fade needs them.
function sphereGrid(rows: number, cols: number): SpherePoint[] {
  const pts: SpherePoint[] = [];
  for (let r = 0; r < rows; r++) {
    const latDeg = rows > 1 ? -LAT_SPAN / 2 + (r * LAT_SPAN) / (rows - 1) : 0;
    const lat = (latDeg * Math.PI) / 180;
    for (let c = 0; c < cols; c++) {
      const lonDeg = (c * 360) / cols;
      const lon = (lonDeg * Math.PI) / 180;
      pts.push({
        x: Math.cos(lat) * Math.sin(lon),
        y: -Math.sin(lat),
        z: Math.cos(lat) * Math.cos(lon),
        latDeg,
        lonDeg,
      });
    }
  }
  return pts;
}

// Computed once — both the sampled item count and the Globe engine need the
// exact same deterministic point set.
const GRID_POINTS = sphereGrid(ROWS, COLS);

class Globe {
  el: HTMLElement;
  stage: HTMLElement;
  tiles: HTMLElement[];
  points: SpherePoint[];

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

  constructor(el: HTMLElement, stage: HTMLElement, tiles: HTMLElement[]) {
    this.el = el;
    this.stage = stage;
    this.tiles = tiles;
    this.points = GRID_POINTS;

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
    const h = this.el.clientHeight || window.innerHeight;
    // Sized off height ALONE, not the smaller of width/height — the grid is
    // deliberately much wider than it is tall, so a narrow phone is meant to
    // crop its left/right edges (matching the brief: "you wouldn't be able to
    // see the whole globe on mobile, but much more on desktop"), rather than
    // shrinking the whole sphere down to avoid ever cropping it.
    this.targetRadius = h * 0.34;
    this.el.style.perspective = `${this.targetRadius * PERSPECTIVE_RATIO}px`;
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

    // Spin the whole sphere as one rigid body — every tile's fixed
    // rotateY(lon) rotateX(lat) translateZ(r) rides along with it, so this is
    // the ONLY place yaw/pitch touch the DOM.
    const pitchDeg = (this.pitch * 180) / Math.PI;
    const yawDeg = (this.yaw * 180) / Math.PI;
    this.stage.style.transform = `rotateX(${pitchDeg.toFixed(2)}deg) rotateY(${yawDeg.toFixed(2)}deg)`;

    // Per-tile: only translateZ (the intro zoom) and a soft opacity fade near
    // the terminator — real position/orientation now comes for free from the
    // stage's own rotation above, and backface-visibility hides the far side.
    const cosYaw = Math.cos(this.yaw);
    const sinYaw = Math.sin(this.yaw);
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const introFade = Math.min(1, t * 1.6);

    for (let i = 0; i < this.tiles.length; i++) {
      const p = this.points[i];
      const x1 = p.x * cosYaw - p.z * sinYaw;
      const z1 = p.x * sinYaw + p.z * cosYaw;
      const z2 = p.y * sinPitch + z1 * cosPitch;
      const depth = (z2 + 1) / 2; // 0 far .. 1 near

      const tile = this.tiles[i];
      tile.style.transform =
        `translate(-50%, -50%) rotateY(${p.lonDeg.toFixed(2)}deg) rotateX(${p.latDeg.toFixed(2)}deg) translateZ(${this.radius.toFixed(1)}px)`;
      tile.style.opacity = String((0.5 + depth * 0.5) * introFade);
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
  const stageRef = useRef<HTMLDivElement>(null);
  const tiles = useMemo(() => sampleItems(items, TILE_COUNT), [items]);

  useEffect(() => {
    const el = viewportRef.current;
    const stage = stageRef.current;
    if (!el || !stage) return;
    const tileEls = Array.from(el.querySelectorAll<HTMLElement>(".globe-tile"));
    if (tileEls.length === 0) return;
    // Cached images are already complete and won't fire onLoad — mark now.
    for (const t of tileEls) {
      const img = t.querySelector("img");
      if (img && (img as HTMLImageElement).complete) img.classList.add("is-loaded");
    }
    const globe = new Globe(el, stage, tileEls);
    return () => globe.destroy();
  }, [tiles]);

  return (
    <div className="globe-viewport" ref={viewportRef}>
      <div className="globe-stage" role="list" aria-label="Discover globe" ref={stageRef}>
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
