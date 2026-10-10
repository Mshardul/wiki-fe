import { describe, expect, it } from "vitest";
import { initialSnapshot, passTicks, peakIn, runSteps } from "./engine";
import { DEFAULT_TICKS, outcomes, stepsOf } from "./test-helpers";
import { generateTicks } from "./trace";
import { ALGORITHM_IDS, axisOf, type Pace, paramsOf } from "./types";

describe("runSteps", () => {
  it("returns one step per request for every algorithm", () => {
    for (const id of ALGORITHM_IDS) {
      expect(stepsOf(id, DEFAULT_TICKS), id).toHaveLength(8);
    }
  });

  it("each step carries its before and after snapshot of the same kind", () => {
    for (const id of ALGORITHM_IDS) {
      const s = stepsOf(id, DEFAULT_TICKS)[2];
      expect(s?.before.kind, id).toBe(s?.after.kind);
    }
  });

  it("the first step's before-state is the initial state", () => {
    for (const id of ALGORITHM_IDS) {
      expect(stepsOf(id, DEFAULT_TICKS)[0]?.before, id).toEqual(
        initialSnapshot(id, paramsOf(3, 2)),
      );
    }
  });

  it("the default stream gives the pinned outcomes under every algorithm", () => {
    expect(ALGORITHM_IDS.map((id) => outcomes(id, DEFAULT_TICKS))).toEqual([
      "AAAAAARR",
      "AAARRRRA",
      "AAAARRRA",
      "AAAARRRA",
      "AAAARRRA",
    ]);
  });

  it("accepts a tick past the default axis without clipping or throwing", () => {
    const p = paramsOf(3, 2);
    expect(axisOf(p, [0, 19])).toBe(20);
    for (const id of ALGORITHM_IDS) {
      const steps = runSteps(id, p, [0, 19]);
      expect(steps, id).toHaveLength(2);
      expect(steps[1]?.tick).toBe(19);
    }
  });
});

describe("peakIn and passTicks", () => {
  it("the default stream peaks at 6 under the fixed window, in a four-tick span", () => {
    const steps = stepsOf("fixed-window", DEFAULT_TICKS);
    expect(peakIn(passTicks("fixed-window", steps, 7), 6)).toEqual({ best: 6, from: 4, to: 7 });
  });

  it("the peak per algorithm on the default stream", () => {
    const peaks = ALGORITHM_IDS.map(
      (id) => peakIn(passTicks(id, stepsOf(id, DEFAULT_TICKS), 7), 6).best,
    );
    expect(peaks).toEqual([6, 3, 4, 4, 3]);
  });

  it("only counts requests up to the step asked for", () => {
    const steps = stepsOf("fixed-window", DEFAULT_TICKS);
    expect(peakIn(passTicks("fixed-window", steps, 2), 6).best).toBe(3);
  });

  it("the leaky bucket counts scheduled leave ticks, including ones still to come", () => {
    const steps = stepsOf("leaky-bucket", DEFAULT_TICKS);
    expect(passTicks("leaky-bucket", steps, 3)).toEqual([6, 8, 10, 12]);
    expect(passTicks("leaky-bucket", steps, 7)).toEqual([6, 8, 10, 12, 14]);
  });

  it("an empty stream has a zero peak", () => {
    expect(peakIn([], 6)).toEqual({ best: 0, from: 0, to: 0 });
  });
});

describe("the shared average rate", () => {
  it("Steady is never rejected by any algorithm at any Limit, Pace or start tick", () => {
    for (const limit of [2, 3, 4, 5]) {
      for (const pace of [1, 2] as Pace[]) {
        const p = paramsOf(limit, pace);
        for (const seed of Array.from({ length: 12 }, (_, i) => i)) {
          const ticks = generateTicks("steady", p, seed);
          for (const id of ALGORITHM_IDS) {
            const result = runSteps(id, p, ticks)
              .map((s) => (s.ok ? "A" : "R"))
              .join("");
            expect(result, `${id} L${limit} K${pace} seed ${seed}`).toBe("A".repeat(ticks.length));
          }
        }
      }
    }
  });
});
