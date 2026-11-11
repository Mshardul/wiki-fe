import { describe, expect, it } from "vitest";
import type { K8sHubModel, ScheduleModel } from "../core/shapes";
import type { VizFrame } from "../core/types";
import { legendForFrame, legendForFrames } from "./legend";

const scheduleAt = (now: number): ScheduleModel => ({
  kind: "schedule",
  track: "t",
  end: 20,
  now,
  tickEvery: 2,
  marksEvery: null,
  unit: "u",
  axisLabel: "",
  summary: null,
  rows: [
    {
      id: "a",
      label: "A",
      segments: [
        { from: 0, to: 10, style: "solid", label: "run" },
        { from: 10, to: 20, style: "hatch" },
      ],
    },
  ],
  meters: [],
  arrows: [],
  pins: [],
  values: null,
  share: null,
  note: null,
});

const frame = (model: VizFrame["model"], index: number): VizFrame => ({
  index,
  label: "",
  outcome: "good",
  badge: "",
  caption: [],
  lines: [],
  path: [],
  vars: [],
  logNote: [],
  metric: "",
  model,
});

describe("legendForFrame", () => {
  const legend = [
    { label: "Running", swatch: "solid" as const },
    { label: "Request path", swatch: "http-req" as const },
    { label: "Ready pod", swatch: "k8s-ready" as const },
  ];

  it("filters schedule swatches to the current step only", () => {
    const f = frame(scheduleAt(5), 0);
    expect(legendForFrame(legend, f)).toEqual([{ label: "Running", swatch: "solid" }]);
  });

  it("does not show http legend entries on a schedule-only step", () => {
    const f = frame(scheduleAt(5), 0);
    expect(legendForFrame(legend, f).some((x) => x.swatch === "http-req")).toBe(false);
  });

  it("shows presentation swatches present on the current frame", () => {
    const hub: K8sHubModel = {
      kind: "k8s-hub",
      actors: [],
      apiOn: false,
      objects: [],
      nodes: [
        {
          n: "node-1",
          pods: [{ n: "p1", img: "app", st: "ready" }],
        },
      ],
      kubelets: {},
      badge: "",
    };
    expect(legendForFrame(legend, frame(hub, 0))).toEqual([
      { label: "Ready pod", swatch: "k8s-ready" },
    ]);
  });
});

describe("legendForFrames (union)", () => {
  it("unions swatches across frames", () => {
    const legend = [
      { label: "Running", swatch: "solid" as const },
      { label: "Waiting", swatch: "hatch" as const },
    ];
    const frames = [frame(scheduleAt(5), 0), frame(scheduleAt(15), 1)];
    expect(
      legendForFrames(legend, frames)
        .map((x) => x.swatch)
        .sort(),
    ).toEqual(["hatch", "solid"]);
  });
});
