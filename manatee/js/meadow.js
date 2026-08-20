/* Procedural stand-in for the specimen section's photograph: an out-of-focus
   goldenrod meadow painted from seeded blobs, plus the ASCII digit overlay
   that traces the bright flower masses. Fully self-contained (no assets). */

window.Meadow = (() => {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function paintMeadow(w, h, rnd) {
    const c = document.createElement("canvas");
    // paint small, display big: cheap gigantic blur
    const s = 0.22;
    c.width = Math.max(2, Math.round(w * s));
    c.height = Math.max(2, Math.round(h * s));
    const x = c.getContext("2d");
    const W = c.width, H = c.height;

    const base = x.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, "#161a10");
    base.addColorStop(0.5, "#202614");
    base.addColorStop(1, "#0f120b");
    x.fillStyle = base;
    x.fillRect(0, 0, W, H);

    // broad olive / teal washes
    for (let i = 0; i < 10; i++) {
      const g = x.createRadialGradient(
        rnd() * W, rnd() * H, 0,
        rnd() * W, rnd() * H, (0.25 + rnd() * 0.4) * W
      );
      const cols = ["#37481f", "#2b3a2e", "#485526", "#243019", "#3d4a2c"];
      g.addColorStop(0, cols[i % cols.length]);
      g.addColorStop(1, "rgba(0,0,0,0)");
      x.globalAlpha = 0.4 + rnd() * 0.32;
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
    }
    x.globalAlpha = 1;

    // goldenrod sprays: arcs of clustered dots
    const sprays = 13;
    for (let sIdx = 0; sIdx < sprays; sIdx++) {
      const ax = (0.05 + rnd() * 0.9) * W;
      const ay = (0.28 + rnd() * 0.75) * H;
      const dir = -Math.PI / 2 + (rnd() - 0.5) * 1.4;
      const arcLen = (0.22 + rnd() * 0.45) * H;
      const curl = (rnd() - 0.5) * 2.2;
      const dots = 70 + Math.floor(rnd() * 90);
      const palette = ["#cfa931", "#e5c247", "#b39023", "#997f24", "#e0ca5e"];
      for (let i = 0; i < dots; i++) {
        const t = rnd();
        const wobble = (rnd() - 0.5) * 0.24 * W * t;
        const px = ax + Math.cos(dir + curl * t) * arcLen * t + wobble * 0.3;
        const py = ay + Math.sin(dir + curl * t) * arcLen * t + (rnd() - 0.5) * 16;
        const rr = (1.6 + rnd() * 4.2) * (0.6 + t);
        x.globalAlpha = 0.3 + rnd() * 0.5;
        x.fillStyle = palette[Math.floor(rnd() * palette.length)];
        x.beginPath();
        x.arc(px, py, rr, 0, Math.PI * 2);
        x.fill();
      }
    }
    x.globalAlpha = 1;

    // dark stems
    for (let i = 0; i < 26; i++) {
      x.strokeStyle = "rgba(16,22,10,0.35)";
      x.lineWidth = 1 + rnd() * 2;
      x.beginPath();
      const sx = rnd() * W;
      const sy = H * (0.55 + rnd() * 0.45);
      x.moveTo(sx, sy);
      x.quadraticCurveTo(sx + (rnd() - 0.5) * 30, sy - H * 0.3, sx + (rnd() - 0.5) * 60, sy - H * (0.4 + rnd() * 0.3));
      x.stroke();
    }

    return c;
  }

  function build(section) {
    const meadowCanvas = section.querySelector(".meadow");
    const asciiCanvas = section.querySelector(".ascii");
    const w = section.offsetWidth;
    const h = section.offsetHeight;
    if (!w || !h) return;

    const rnd = mulberry32(20260812);
    const src = paintMeadow(w, h, rnd);

    // -- blurred photo layer --
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    meadowCanvas.width = Math.round(w * dpr * 0.5);
    meadowCanvas.height = Math.round(h * dpr * 0.5);
    const mx = meadowCanvas.getContext("2d");
    mx.filter = "blur(9px)";
    mx.drawImage(src, 0, 0, meadowCanvas.width, meadowCanvas.height);
    mx.filter = "none";
    // vignette + top shade
    const vg = mx.createLinearGradient(0, 0, 0, meadowCanvas.height);
    vg.addColorStop(0, "rgba(5,6,4,0.55)");
    vg.addColorStop(0.25, "rgba(5,6,4,0.08)");
    vg.addColorStop(0.85, "rgba(5,6,4,0.10)");
    vg.addColorStop(1, "rgba(5,6,4,0.5)");
    mx.fillStyle = vg;
    mx.fillRect(0, 0, meadowCanvas.width, meadowCanvas.height);

    // -- ascii layer --
    const cellW = 11, cellH = 14;
    asciiCanvas.width = Math.round(w * dpr);
    asciiCanvas.height = Math.round(h * dpr);
    const ax = asciiCanvas.getContext("2d");
    ax.scale(dpr, dpr);
    ax.font = "11px ui-monospace, 'SF Mono', Menlo, monospace";
    ax.textBaseline = "middle";
    ax.textAlign = "center";

    const sample = src.getContext("2d").getImageData(0, 0, src.width, src.height);
    const sw = src.width, sh = src.height;
    const cols = Math.ceil(w / cellW);
    const rows = Math.ceil(h / cellH);
    const rnd2 = mulberry32(77);

    // low-frequency coverage mask so whole regions stay "un-digitized"
    const maskFreqX = 0.9 + rnd2() * 0.4;
    const maskFreqY = 1.3 + rnd2() * 0.5;
    const maskPhase = rnd2() * 10;

    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const nx = cx / cols, ny = cy / rows;
        const coverage =
          0.5 +
          0.28 * Math.sin(nx * Math.PI * 2 * maskFreqX + maskPhase) *
                 Math.cos(ny * Math.PI * 2 * maskFreqY - maskPhase * 0.7) +
          0.22 * Math.sin((nx + ny) * 9.1 + maskPhase * 2.3);
        if (coverage < 0.42) continue;

        // vertical airiness: some columns thin out
        const colThin = (cx % 3 === 1 && rnd2() < 0.45) || (cx % 5 === 3 && rnd2() < 0.3);
        if (colThin) continue;

        const sx = Math.min(sw - 1, Math.round(nx * sw));
        const sy = Math.min(sh - 1, Math.round(ny * sh));
        const idx = (sy * sw + sx) * 4;
        const b = (sample.data[idx] * 0.32 + sample.data[idx + 1] * 0.5 + sample.data[idx + 2] * 0.18) / 255;

        let ch = null;
        let alpha = 0;
        const jitter = rnd2();
        if (b < 0.1) {
          if (jitter < 0.06) { ch = "."; alpha = 0.22; }
        } else if (b < 0.22) {
          if (jitter < 0.55) { ch = jitter < 0.2 ? ":" : "."; alpha = 0.3; }
        } else if (b < 0.38) {
          ch = jitter < 0.4 ? "o" : (jitter < 0.75 ? "0" : ":");
          alpha = 0.42;
        } else {
          ch = jitter < 0.82 ? "0" : "o";
          alpha = 0.55 + Math.min(0.3, (b - 0.38));
        }
        if (!ch) continue;

        ax.fillStyle = `rgba(240,238,228,${alpha.toFixed(3)})`;
        ax.fillText(ch, cx * cellW + cellW / 2, cy * cellH + cellH / 2);
      }
    }
  }

  return { build };
})();
