import { describe, expect, it } from "vitest";
import { scheduleEvents, skippedEvents } from "./schedule";
import type { ScheduleModel } from "./shapes";
import type { VizFrame } from "./types";

const model = (now: number, track = "t"): ScheduleModel => ({
  kind: "schedule",
  track,
  end: 20,
  now,
  tickEvery: 2,
  marksEvery: null,
  unit: "u",
  axisLabel: "",
  summary: {
    label: "Owner",
    segments: [
      { from: 0, to: 2, style: "solid", label: "a" },
      { from: 2, to: 4, style: "solid", label: "a" },
    ],
  },
  rows: [
    {
      id: "a",
      label: "A",
      segments: [
        { from: 0, to: 2, style: "solid", label: "load" },
        { from: 2, to: 4, style: "solid", label: "store" },
        { from: 4, to: 20, style: "hatch" },
      ],
    },
  ],
  meters: [{ row: "a", from: 4, to: 9 }],
  arrows: [{ at: 9, from: "a", to: "a", label: "ask" }],
  pins: [],
  values: {
    label: "v",
    points: [
      { at: 0, text: "0" },
      { at: 12, text: "1" },
    ],
  },
  share: null,
  note: null,
});

const frames = (...steps: [number, string?][]): VizFrame[] =>
  steps.map(([now, track], index) => ({
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
    model: model(now, track),
  }));

describe("scheduleEvents", () => {
  it("lists style changes, hand-offs, meters, arrows and values but not relabels", () => {
    expect(scheduleEvents(model(0))).toEqual([4, 9, 12]);
  });
});

describe("skippedEvents", () => {
  it("is empty when every change gets a step", () => {
    expect(skippedEvents(frames([4], [9], [12], [20]))).toEqual([]);
  });

  it("reports the moments a step jumps over", () => {
    expect(skippedEvents(frames([4], [20]))).toEqual([{ step: 1, at: [9, 12] }]);
  });

  it("starts a new track from zero", () => {
    expect(skippedEvents(frames([4], [6, "other"]))).toEqual([{ step: 1, at: [4] }]);
  });
});
