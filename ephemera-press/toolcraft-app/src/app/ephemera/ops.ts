/**
 * The ephemera display list: every piece family compiles to the same
 * small set of print primitives (set type, dots, rules, circles, arcs,
 * and free polylines). One painter rasterizes the list into Canvas 2D
 * for preview and export; one serializer writes the identical list as
 * SVG for the Copy SVG action. Keeping layout in pure data makes every
 * composition deterministic and unit-testable without a DOM.
 */

export type EphemeraFont = "grotesk" | "mono" | "serif";

export const EPHEMERA_FONT_STACKS: Readonly<Record<EphemeraFont, string>> = {
  grotesk: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: '"Courier New", Courier, monospace',
  serif: '"Times New Roman", Times, serif',
};

/**
 * Approximate advance width per character as a fraction of font size.
 * The engine only uses this for scatter collision and margin clamping,
 * so composition stays independent of live glyph metrics.
 */
export const EPHEMERA_CHAR_WIDTH: Readonly<Record<EphemeraFont, number>> = {
  grotesk: 0.54,
  mono: 0.601,
  serif: 0.5,
};

export type EphemeraTextOp = Readonly<{
  align: "center" | "left" | "right";
  /** Rotation around (x, y) in radians; omitted means upright. */
  angle?: number;
  color: string;
  font: EphemeraFont;
  italic?: boolean;
  kind: "text";
  size: number;
  text: string;
  /** Extra letter spacing in px. */
  tracking?: number;
  weight: 400 | 700;
  x: number;
  y: number;
}>;

export type EphemeraDotOp = Readonly<{
  color: string;
  kind: "dot";
  r: number;
  x: number;
  y: number;
}>;

export type EphemeraCircleOp = Readonly<{
  color: string;
  kind: "circle";
  r: number;
  width: number;
  x: number;
  y: number;
}>;

export type EphemeraArcOp = Readonly<{
  color: string;
  end: number;
  kind: "arc";
  r: number;
  start: number;
  width: number;
  x: number;
  y: number;
}>;

export type EphemeraLineOp = Readonly<{
  color: string;
  kind: "line";
  width: number;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}>;

export type EphemeraPolyOp = Readonly<{
  color: string;
  kind: "poly";
  points: readonly (readonly [number, number])[];
  width: number;
}>;

export type EphemeraOp =
  | EphemeraArcOp
  | EphemeraCircleOp
  | EphemeraDotOp
  | EphemeraLineOp
  | EphemeraPolyOp
  | EphemeraTextOp;

export type EphemeraModel = Readonly<{
  /** Non-text primitives (dots, rules, circles, arcs, polylines). */
  marks: number;
  ops: readonly EphemeraOp[];
  /** Set text runs. */
  texts: number;
}>;

export function buildEphemeraModel(ops: readonly EphemeraOp[]): EphemeraModel {
  let texts = 0;
  for (const op of ops) {
    if (op.kind === "text") texts += 1;
  }
  return { marks: ops.length - texts, ops, texts };
}

function textFontShorthand(op: EphemeraTextOp): string {
  const style = op.italic ? "italic " : "";
  return `${style}${op.weight} ${op.size}px ${EPHEMERA_FONT_STACKS[op.font]}`;
}

type CanvasWithLetterSpacing = CanvasRenderingContext2D & {
  letterSpacing?: string;
};

/** Rasterizes the display list; the caller owns transform and background. */
export function paintEphemera(
  ctx: CanvasRenderingContext2D,
  model: EphemeraModel,
): void {
  for (const op of model.ops) {
    switch (op.kind) {
      case "text": {
        ctx.save();
        ctx.translate(op.x, op.y);
        if (op.angle) ctx.rotate(op.angle);
        ctx.font = textFontShorthand(op);
        ctx.fillStyle = op.color;
        ctx.textAlign = op.align;
        ctx.textBaseline = "middle";
        const extended = ctx as CanvasWithLetterSpacing;
        if ("letterSpacing" in extended) {
          extended.letterSpacing = `${op.tracking ?? 0}px`;
        }
        ctx.fillText(op.text, 0, 0);
        ctx.restore();
        break;
      }
      case "dot": {
        ctx.beginPath();
        ctx.fillStyle = op.color;
        ctx.arc(op.x, op.y, op.r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "circle": {
        ctx.beginPath();
        ctx.strokeStyle = op.color;
        ctx.lineWidth = op.width;
        ctx.arc(op.x, op.y, op.r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "arc": {
        ctx.beginPath();
        ctx.strokeStyle = op.color;
        ctx.lineWidth = op.width;
        ctx.arc(op.x, op.y, op.r, op.start, op.end);
        ctx.stroke();
        break;
      }
      case "line": {
        ctx.beginPath();
        ctx.strokeStyle = op.color;
        ctx.lineWidth = op.width;
        ctx.moveTo(op.x1, op.y1);
        ctx.lineTo(op.x2, op.y2);
        ctx.stroke();
        break;
      }
      case "poly": {
        if (op.points.length < 2) break;
        ctx.beginPath();
        ctx.strokeStyle = op.color;
        ctx.lineWidth = op.width;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        const [first, ...rest] = op.points;
        ctx.moveTo(first![0], first![1]);
        for (const [x, y] of rest) ctx.lineTo(x, y);
        ctx.stroke();
        break;
      }
    }
  }
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

const SVG_ANCHOR: Readonly<Record<EphemeraTextOp["align"], string>> = {
  center: "middle",
  left: "start",
  right: "end",
};

/**
 * Serializes the identical display list as standalone SVG. Text uses an
 * alphabetic baseline shifted by 0.34em so anchors match the canvas
 * middle baseline closely across renderers.
 */
export function ephemeraOpsToSvg(
  model: EphemeraModel,
  width: number,
  height: number,
  background: string | null,
): string {
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${round2(width)}" height="${round2(height)}" viewBox="0 0 ${round2(width)} ${round2(height)}">`,
  ];
  if (background) {
    parts.push(
      `<rect width="${round2(width)}" height="${round2(height)}" fill="${background}"/>`,
    );
  }
  for (const op of model.ops) {
    switch (op.kind) {
      case "text": {
        const attrs = [
          `x="0"`,
          `y="${round2(op.size * 0.34)}"`,
          `font-family='${EPHEMERA_FONT_STACKS[op.font].replaceAll('"', "&quot;")}'`,
          `font-size="${round2(op.size)}"`,
          `font-weight="${op.weight}"`,
          `fill="${op.color}"`,
          `text-anchor="${SVG_ANCHOR[op.align]}"`,
        ];
        if (op.italic) attrs.push(`font-style="italic"`);
        if (op.tracking) attrs.push(`letter-spacing="${round2(op.tracking)}"`);
        const rotate = op.angle ? ` rotate(${round2((op.angle * 180) / Math.PI)})` : "";
        parts.push(
          `<text transform="translate(${round2(op.x)} ${round2(op.y)})${rotate}" ${attrs.join(" ")}>${escapeXml(op.text)}</text>`,
        );
        break;
      }
      case "dot":
        parts.push(
          `<circle cx="${round2(op.x)}" cy="${round2(op.y)}" r="${round2(op.r)}" fill="${op.color}"/>`,
        );
        break;
      case "circle":
        parts.push(
          `<circle cx="${round2(op.x)}" cy="${round2(op.y)}" r="${round2(op.r)}" fill="none" stroke="${op.color}" stroke-width="${round2(op.width)}"/>`,
        );
        break;
      case "arc": {
        const large = Math.abs(op.end - op.start) > Math.PI ? 1 : 0;
        const x1 = op.x + Math.cos(op.start) * op.r;
        const y1 = op.y + Math.sin(op.start) * op.r;
        const x2 = op.x + Math.cos(op.end) * op.r;
        const y2 = op.y + Math.sin(op.end) * op.r;
        parts.push(
          `<path d="M ${round2(x1)} ${round2(y1)} A ${round2(op.r)} ${round2(op.r)} 0 ${large} 1 ${round2(x2)} ${round2(y2)}" fill="none" stroke="${op.color}" stroke-width="${round2(op.width)}"/>`,
        );
        break;
      }
      case "line":
        parts.push(
          `<line x1="${round2(op.x1)}" y1="${round2(op.y1)}" x2="${round2(op.x2)}" y2="${round2(op.y2)}" stroke="${op.color}" stroke-width="${round2(op.width)}"/>`,
        );
        break;
      case "poly": {
        const points = op.points
          .map(([x, y]) => `${round2(x)},${round2(y)}`)
          .join(" ");
        parts.push(
          `<polyline points="${points}" fill="none" stroke="${op.color}" stroke-width="${round2(op.width)}" stroke-linejoin="round" stroke-linecap="round"/>`,
        );
        break;
      }
    }
  }
  parts.push("</svg>");
  return parts.join("");
}
