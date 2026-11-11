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

  it("does not reset the schedule cursor across non-schedule steps", () => {
    const lanes = {
      index: 1,
      label: "",
      outcome: "good" as const,
      badge: "",
      caption: [],
      lines: [],
      path: [],
      vars: [],
      logNote: [],
      metric: "",
      model: {
        kind: "lanes" as const,
        lanes: [],
        hops: [],
        slots: 1,
        cardRows: 1,
      },
    };
    const last = frames([4], [20])[1]!;
    expect(skippedEvents([frames([4])[0]!, lanes, last]).map((s) => s.step)).toEqual([2]);
    expect(skippedEvents([frames([4])[0]!, lanes, last])).toEqual([{ step: 2, at: [9, 12] }]);
  });

  it("keeps the same schedule track across lanes and other non-schedule steps", () => {
    const spacer = {
      index: 0,
      label: "",
      outcome: "good" as const,
      badge: "",
      caption: [],
      lines: [],
      path: [],
      vars: [],
      logNote: [],
      metric: "",
      model: {
        kind: "lanes" as const,
        lanes: [],
        hops: [],
        slots: 1,
        cardRows: 1,
      },
    };
    const withBreaks: VizFrame[] = [frames([4])[0]!, { ...spacer, index: 1 }, frames([20])[0]!];
    const contiguous = frames([4], [20])[1]!;
    expect(skippedEvents(withBreaks).map((s) => s.at)).toEqual(
      skippedEvents([frames([4])[0]!, contiguous]).map((s) => s.at),
    );
  });
});
