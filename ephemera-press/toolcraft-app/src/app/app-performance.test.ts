import { describe, expect, it } from "vitest";

import {
  assessToolcraftRenderPlan,
  deriveToolcraftPerformancePaths,
} from "@/toolcraft/runtime";

import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

const derivedPaths = deriveToolcraftPerformancePaths(appSchema, appPerformance);

function scenarioForInteraction(interaction: string) {
  const scenario = appPerformance.scenarios.find(
    (candidate) => candidate.interaction === interaction,
  );
  if (!scenario) {
    throw new Error(`Missing scenario for interaction "${interaction}".`);
  }
  return scenario;
}

function expectScenarioCoversDerivedPath(interaction: string) {
  const scenario = scenarioForInteraction(interaction);
  const path = derivedPaths.find(
    (candidate) => candidate.id === scenario.pathId,
  );
  expect(path, `scenario ${scenario.id} must reference a derived path`).toBeDefined();
  expect(path?.interaction).toBe(interaction);
  expect([...scenario.coversTargets].sort()).toEqual(
    [...(path?.targets ?? [])].sort(),
  );
}

describe("ephemera performance model", () => {
  it("assesses the render plan without structural errors", () => {
    const assessment = assessToolcraftRenderPlan(appSchema, appPerformance);
    expect(assessment.errors).toEqual([]);
  });

  it("declares exactly one scenario per canonical derived path", () => {
    expect(appPerformance.scenarios).toHaveLength(derivedPaths.length);
    const pathIds = new Set(derivedPaths.map((path) => path.id));
    for (const scenario of appPerformance.scenarios) {
      expect(pathIds.has(scenario.pathId)).toBe(true);
    }
  });

  it("perf scenario initial-render: covers its canonical derived path", () => {
    expectScenarioCoversDerivedPath("initial-render");
  });

  it("perf scenario control-change: covers its canonical derived path", () => {
    expectScenarioCoversDerivedPath("control-change");
  });

  it("perf scenario control-drag: covers its canonical derived path", () => {
    expectScenarioCoversDerivedPath("control-drag");
  });

  it("perf scenario viewport-drag: covers its canonical derived path", () => {
    expectScenarioCoversDerivedPath("viewport-drag");
  });

  it("perf scenario viewport-zoom: covers its canonical derived path", () => {
    expectScenarioCoversDerivedPath("viewport-zoom");
  });

  it("perf scenario export: covers its canonical derived path", () => {
    expectScenarioCoversDerivedPath("export");
  });
});
