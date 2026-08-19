import { describe, expect, it } from "vitest";

import {
  appAcceptance,
  validateProductAcceptanceCoverage,
} from "./app-acceptance";
import { appSchema } from "./app-schema";
import { EPHEMERA_TARGETS } from "./ephemera/params";

function findControl(target: string) {
  for (const section of appSchema.panels.controls?.sections ?? []) {
    for (const control of Object.values(section.controls)) {
      if (control.target === target) return control;
    }
  }
  return undefined;
}

describe("appSchema", () => {
  it("publishes the ephemera product schema through runtime setup", () => {
    expect(appSchema.canvas.enabled).toBe(true);
    expect(appSchema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(appSchema.panels.controls?.sections[0]?.title).toBe("Setup");
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline).toBeUndefined();
    expect(appSchema.assembly.capabilities).not.toContain("timeline.playback");
  });

  it("default canvas size is the 1080x1350 sheet", () => {
    expect(appSchema.canvas.size).toEqual({
      height: 1350,
      unit: "px",
      width: 1080,
    });
    expect(appSchema.canvas.sizeSource).toBe("app");
  });

  it("render scale schema resolves to the canonical 1..2 slider", () => {
    expect(appSchema.canvas.renderScale).toEqual({
      defaultValue: 2,
      enabled: true,
      max: 2,
      min: 1,
      step: 0.25,
    });
  });

  it("image format options map to png and jpg artifacts", () => {
    const format = findControl(EPHEMERA_TARGETS.imageFormat);
    expect(format?.type).toBe("select");
    expect(format?.defaultValue).toBe("png");
    expect(format?.options?.map((option) => option.value)).toEqual([
      "png",
      "jpg",
    ]);
  });

  it("image resolution options map to 2k 4k and 8k long edges", () => {
    const resolution = findControl(EPHEMERA_TARGETS.imageResolution);
    expect(resolution?.type).toBe("select");
    expect(resolution?.defaultValue).toBe("4k");
    expect(resolution?.options?.map((option) => option.value)).toEqual([
      "2k",
      "4k",
      "8k",
    ]);
  });

  it("declares production reload coverage for the product schema", () => {
    expect(appSchema.persistence.storage).toBe("localStorage");
    if (appSchema.persistence.storage !== "localStorage") {
      throw new Error("The product must persist user settings in localStorage.");
    }
    expect(appSchema.persistence.include).toContain("canvas");
    expect(
      appAcceptance.find((entry) => entry.id === "persistence.reload"),
    ).toMatchObject({
      automated: true,
      browser: true,
      evidence: "persistence-state",
      kind: "runtime",
      persistenceCoverage: "reload",
      persistenceSlices: appSchema.persistence.include,
      target: "canvas.size.width",
    });
  });

  it("keeps product acceptance coverage valid", () => {
    expect(validateProductAcceptanceCoverage()).toEqual([]);
  });
});
