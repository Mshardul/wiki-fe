import { describe, expect, it } from "vitest";
import type { CompositeModel, LinearModel, TimelineModel } from "../core/shapes";
import { runSteps } from "./engine";
import { type AlgorithmId, paramsOf } from "./types";
import { makeContext, viewOf } from "./view";

const DEFAULT = [4, 5, 5, 6, 6, 7, 7, 11];

function at(
  id: AlgorithmId,
  i: number,
  ticks = DEFAULT,
  limit = 3,
  pace: 1 | 2 = 2,
  compact = false,
) {
  const p = paramsOf(limit, pace);
  const ctx = makeContext(id, p, ticks, runSteps(id, p, ticks), compact);
  return viewOf(ctx, i);
}
const asTimeline = (m: unknown): TimelineModel => {
  if ((m as TimelineModel).kind !== "timeline") throw new Error("not a timeline");
  return m as TimelineModel;
};
const asComposite = (m: unknown): CompositeModel => {
  if ((m as CompositeModel).kind !== "composite") throw new Error("not a composite");
  return m as CompositeModel;
};
const part = <T>(m: CompositeModel, i: number): T => m.parts[i] as T;

describe("fixed window view", () => {
  it("shows both full windows, the boundary and the double-limit spike at step 6", () => {
    const m = asTimeline(at("fixed-window", 5));
    expect(m.bands.map((b) => b.label)).toEqual(["window 0 · 3/3 full", "window 1 · 3/3 full"]);
    expect(m.bands.map((b) => b.short)).toEqual(["3/3", "3/3"]);
    expect(m.boundaries).toEqual([6]);
    expect(m.spans).toEqual([
      { from: 4, to: 7, label: "6 allowed in 4 ticks", short: "6 in 4", style: "alert" },
    ]);
    expect(m.now).toBe(7);
    expect(m.ticks).toBe(12);
  });

  it("marks the current request and tones allowed and rejected ones", () => {
    const m = asTimeline(at("fixed-window", 6));
    const marks = m.rows[0]?.marks ?? [];
    expect(marks).toHaveLength(7);
    expect(marks[6]).toMatchObject({ at: 7, tone: "bad", current: true, title: "rejected" });
    expect(marks[0]).toMatchObject({ at: 4, tone: "good", title: "allowed" });
    expect(marks.filter((k) => k.current)).toHaveLength(1);
  });

  it("has no alert while the peak is within the limit", () => {
    expect(asTimeline(at("fixed-window", 2)).spans).toEqual([]);
  });

  it("the empty start state has no marks and no spans", () => {
    const m = asTimeline(at("fixed-window", -1));
    expect(m.rows[0]?.marks).toEqual([]);
    expect(m.spans).toEqual([]);
    expect(m.bands.map((b) => b.label)).toEqual(["window 0 · 0/3", "window 1 · 0/3"]);
  });

  it("reserves one lane for the alert and the run-wide stack height", () => {
    const m = asTimeline(at("fixed-window", 0));
    expect(m.lanes).toBe(1);
    expect(m.stack).toBe(2);
  });
});

describe("sliding counter view", () => {
  it("brackets the last window, hatches the overlapped previous-window ticks and shows the estimate", () => {
    const m = asTimeline(at("sliding-counter", 4));
    expect(m.spans[0]).toMatchObject({
      from: 1,
      to: 6,
      style: "outline",
      label: "last 6 ticks · estimate 3.5",
    });
    expect(m.spans[1]).toMatchObject({ from: 1, to: 5, style: "hatch", label: "" });
    expect(m.bands[0]?.label).toBe("window 0 · 3 × 5/6");
    expect(m.bands[0]?.short).toBe("3×5/6");
    expect(m.bands[1]?.label).toBe("window 1 · 1");
  });

  it("has no hatch once the bracket no longer overlaps the previous window", () => {
    const m = asTimeline(at("sliding-counter", 7));
    expect(m.spans.filter((s) => s.style === "hatch")).toEqual([]);
    expect(m.spans[0]?.label).toBe("last 6 ticks · estimate 2");
  });

  it("reserves two label lanes", () => {
    expect(asTimeline(at("sliding-counter", 0)).lanes).toBe(2);
  });
});

describe("sliding log view", () => {
  it("is a timeline over the log's own list", () => {
    const m = asComposite(at("sliding-log", 7));
    const t = part<TimelineModel>(m, 0);
    const list = part<LinearModel>(m, 1);
    expect(t.spans[0]).toMatchObject({ from: 6, to: 11, label: "last 6 ticks · kept 1/3" });
    expect(t.rows[0]?.marks.map((k) => `${k.at}:${k.tone}`)).toEqual([
      "4:faded",
      "5:faded",
      "5:faded",
      "6:bad",
      "6:bad",
      "7:bad",
      "7:bad",
      "11:good",
    ]);
    expect(list.items).toEqual(["t11"]);
    expect(list.capacity).toBe(3);
    expect(list.active).toBe("t11");
    expect(list.labels).toEqual({ entry: "newest", exit: "oldest ages out" });
  });

  it("lists the newest timestamp first and keeps duplicate ticks distinct", () => {
    const list = part<LinearModel>(asComposite(at("sliding-log", 2)), 1);
    expect(list.items).toEqual(["t5·2", "t5", "t4"]);
    expect(list.next).toBe("t4");
  });

  it("highlights nothing new when the request was rejected", () => {
    const list = part<LinearModel>(asComposite(at("sliding-log", 4)), 1);
    expect(list.active).toBeNull();
    expect(list.tone).toBeNull();
  });
});

describe("token bucket view", () => {
  it("shows the pile over a request strip, spending the oldest token", () => {
    const m = asComposite(at("token-bucket", 0));
    const pile = part<LinearModel>(m, 0);
    expect(pile.items).toEqual(["T3", "T2"]);
    expect(pile.removed).toBe("T1");
    expect(pile.labels).toEqual({ entry: "next token in 2 ticks", exit: "spent" });
    expect(asTimeline(part<TimelineModel>(m, 1)).rows[0]?.marks).toHaveLength(1);
  });

  it("names the next refill and highlights a refilled token that is still held", () => {
    const m = asComposite(at("token-bucket", 7));
    const pile = part<LinearModel>(m, 0);
    expect(pile.items).toEqual(["T6"]);
    expect(pile.active).toBe("T6");
    expect(pile.tone).toBe("new");
    expect(pile.labels.entry).toBe("next token in 1 tick");
  });

  it("a refilled token that is spent at once is only shown leaving", () => {
    const pile = part<LinearModel>(asComposite(at("token-bucket", 3)), 0);
    expect(pile.items).toEqual([]);
    expect(pile.active).toBeNull();
    expect(pile.removed).toBe("T4");
  });

  it("alerts when more got through in a window than the limit", () => {
    const strip = part<TimelineModel>(asComposite(at("token-bucket", 7)), 1);
    expect(strip.spans[0]).toMatchObject({ style: "alert", label: "4 allowed in 3 ticks" });
  });
});

describe("leaky bucket view", () => {
  it("shows the queue over arrive and leave rows with future leaves faded", () => {
    const m = asComposite(at("leaky-bucket", 3));
    const queue = part<LinearModel>(m, 0);
    const t = part<TimelineModel>(m, 1);
    expect(queue.items).toEqual(["#4", "#3", "#2"]);
    expect(queue.next).toBe("#2");
    expect(queue.removed).toBe("#1");
    expect(queue.labels).toEqual({ entry: "arrive", exit: "leave every 2 ticks" });
    expect(t.rows.map((r) => r.label)).toEqual(["arrive", "leave"]);
    expect(t.rows[1]?.marks.map((k) => `${k.at}:${k.tone}`)).toEqual([
      "6:good",
      "8:faded",
      "10:faded",
    ]);
  });

  it("clips leave ticks that fall beyond the axis", () => {
    const t = part<TimelineModel>(asComposite(at("leaky-bucket", 7)), 1);
    expect(t.rows[1]?.marks.map((k) => k.at)).toEqual([6, 8, 10]);
  });

  it("the compact form keeps only the timeline", () => {
    const m = asComposite(at("leaky-bucket", 3, DEFAULT, 3, 2, true));
    expect(m.parts).toHaveLength(1);
    expect(m.parts[0]?.kind).toBe("timeline");
  });

  it("never reserves a label lane", () => {
    expect(asTimeline(part<TimelineModel>(asComposite(at("leaky-bucket", 0)), 1)).lanes).toBe(0);
  });
});

describe("run-wide sizing", () => {
  it("caps the tallest pile of simultaneous marks at 4 so a Limit 5 burst stays on the stage", () => {
    const burst = [3, 3, 3, 3, 3, 3, 3, 9];
    const m = asTimeline(at("fixed-window", 7, burst, 5, 2));
    expect(m.stack).toBe(4);
    expect(m.rows[0]?.marks.filter((k) => k.at === 3)).toHaveLength(7);
  });

  it("stretches the axis to a tick past the default 12", () => {
    const m = asTimeline(at("fixed-window", 1, [0, 19]));
    expect(m.ticks).toBe(20);
    expect(m.bands.at(-1)?.to).toBe(19);
  });

  it("every step of every algorithm yields a model with the same ticks, stack and lanes", () => {
    for (const id of ["fixed-window", "sliding-counter"] as const) {
      const first = asTimeline(at(id, 0));
      const last = asTimeline(at(id, 7));
      expect([first.ticks, first.stack, first.lanes]).toEqual([last.ticks, last.stack, last.lanes]);
    }
  });
});
