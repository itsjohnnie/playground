"use client";

import * as React from "react";

import { shouldIncludeToolcraftPreviewBackground } from "@/toolcraft/runtime";
import {
  useToolcraftProductSceneFrame,
  useToolcraftSelector,
} from "@/toolcraft/runtime/react";

import { computePiece } from "./engine";
import { paintEphemera } from "./ops";
import {
  readEphemeraBackground,
  readEphemeraMode,
  readEphemeraParams,
} from "./params";

/**
 * The Ephemera Press preview: one static Canvas 2D raster of the
 * committed piece. There is no animation loop — the composition redraws
 * only when committed state or the scene frame changes, at exact
 * CSS x devicePixelRatio x selected render-scale backing.
 */
export function EphemeraCanvas(): React.JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const frame = useToolcraftProductSceneFrame();
  const values = useToolcraftSelector((state) => state.values);
  const includeBackground = useToolcraftSelector((state) =>
    shouldIncludeToolcraftPreviewBackground({ state }),
  );
  const renderScale = useToolcraftSelector((state) => {
    const selected = state.values["canvas.renderScale"];
    return typeof selected === "number" && Number.isFinite(selected)
      ? selected
      : state.schema.canvas.renderScale.defaultValue;
  });

  const rect = frame.rect;
  const rectWidth = rect?.width ?? 0;
  const rectHeight = rect?.height ?? 0;

  const draw = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || rectWidth <= 0 || rectHeight <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const backingScale = dpr * renderScale;
    const width = Math.max(1, Math.round(rectWidth * backingScale));
    const height = Math.max(1, Math.round(rectHeight * backingScale));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const params = readEphemeraParams(values, rectWidth, rectHeight);
    const model = computePiece(params);

    ctx.setTransform(backingScale, 0, 0, backingScale, 0, 0);
    ctx.clearRect(0, 0, rectWidth, rectHeight);
    if (includeBackground) {
      ctx.fillStyle = readEphemeraBackground(values);
      ctx.fillRect(0, 0, rectWidth, rectHeight);
    }
    paintEphemera(ctx, model);

    // Deterministic product metadata used by test diagnostics.
    canvas.dataset.pieceMode = readEphemeraMode(values);
    canvas.dataset.pieceTexts = String(model.texts);
    canvas.dataset.pieceMarks = String(model.marks);
  }, [includeBackground, rectHeight, rectWidth, renderScale, values]);

  React.useEffect(() => {
    draw();
  }, [draw]);

  if (frame.kind === "empty" || frame.kind === "unavailable") {
    return <React.Fragment />;
  }

  return (
    <canvas
      data-toolcraft-product-output
      ref={canvasRef}
      style={{
        display: "block",
        height: `${rectHeight}px`,
        pointerEvents: "none",
        width: `${rectWidth}px`,
      }}
    />
  );
}
