import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CompositeModel, LinearModel, TimelineModel } from "@/lib/visualizer/core/shapes";
import { Shape } from "./Shape";

const linear: LinearModel = {
  kind: "linear",
  items: ["T2", "T1"],
  capacity: 3,
  next: "T1",
  active: null,
  tone: null,
  removed: null,
  labels: { entry: "refill", exit: "spent" },
  defaultAxis: "horizontal",
};
const timeline: TimelineModel = {
  kind: "timeline",
  ticks: 12,
  now: 3,
  stack: 1,
  lanes: 0,
  rows: [{ label: "", marks: [{ at: 3, tone: "good" }] }],
  bands: [],
  spans: [],
  boundaries: [],
};

describe("Composite", () => {
  it("draws its parts in order through Shape", () => {
    const model: CompositeModel = { kind: "composite", parts: [linear, timeline] };
    const { container } = render(
      <Shape model={model} rotated={false} size={{ w: 800, h: 560 }} subject="Limiter" />,
    );
    const parts = [...container.querySelectorAll(".viz-composite__part")];
    expect(parts).toHaveLength(2);
    expect(parts[0]?.querySelector(".viz-linear")).toBeTruthy();
    expect(parts[1]?.querySelector(".viz-tl")).toBeTruthy();
  });

  it("gives every part a fixed height that fits the stage", () => {
    const model: CompositeModel = { kind: "composite", parts: [timeline, linear] };
    const { container } = render(
      <Shape model={model} rotated={false} size={{ w: 800, h: 560 }} subject="Limiter" />,
    );
    const heights = [...container.querySelectorAll<HTMLElement>(".viz-composite__part")].map((p) =>
      Number.parseFloat(p.style.height),
    );
    expect(heights.every((h) => h > 0)).toBe(true);
    expect(heights.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(560);
  });

  it("a single-part composite fills a short card", () => {
    const model: CompositeModel = { kind: "composite", parts: [timeline] };
    const { container } = render(
      <Shape model={model} rotated={false} size={{ w: 250, h: 200 }} subject="Limiter" />,
    );
    expect(container.querySelectorAll(".viz-composite__part")).toHaveLength(1);
  });
});
