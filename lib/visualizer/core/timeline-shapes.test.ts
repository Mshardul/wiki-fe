import { describe, expect, it } from "vitest";
import {
  type CompositeModel,
  defaultAxis,
  type LinearModel,
  modelKeys,
  type TimelineModel,
  timelineLabel,
} from "./shapes";

const timeline: TimelineModel = {
  kind: "timeline",
  ticks: 12,
  now: 5,
  stack: 2,
  lanes: 1,
  rows: [
    {
      label: "",
      marks: [
        { at: 4, tone: "good", title: "allowed" },
        { at: 5, tone: "bad", title: "rejected" },
        { at: 5, tone: "faded" },
      ],
    },
  ],
  bands: [],
  spans: [],
  boundaries: [],
};

const linear: LinearModel = {
  kind: "linear",
  items: ["T3", "T2"],
  capacity: 3,
  next: "T2",
  active: null,
  tone: null,
  removed: null,
  labels: { entry: "refill", exit: "spent" },
  defaultAxis: "horizontal",
};

describe("timeline and composite models", () => {
  it("have no axis, so Rotate stays hidden", () => {
    const composite: CompositeModel = { kind: "composite", parts: [linear, timeline] };
    expect(defaultAxis(timeline)).toBeNull();
    expect(defaultAxis(composite)).toBeNull();
    expect(defaultAxis(linear)).toBe("horizontal");
  });

  it("a composite lists its parts' keys in order", () => {
    expect(modelKeys({ kind: "composite", parts: [linear, timeline] })).toEqual(["T3", "T2"]);
    expect(modelKeys(timeline)).toEqual([]);
  });

  it("the screen-reader label lists every mark with its title or tone", () => {
    expect(timelineLabel(timeline, "Limiter")).toBe(
      "Limiter: tick 4 allowed, tick 5 rejected, tick 5 faded",
    );
  });

  it("labels each row and says so when a row is empty", () => {
    const two: TimelineModel = {
      ...timeline,
      rows: [
        { label: "arrive", marks: [{ at: 1, tone: "good" }] },
        { label: "leave", marks: [] },
      ],
    };
    expect(timelineLabel(two, "Limiter")).toBe("Limiter: arrive: tick 1 good; leave: no marks");
  });
});
