import { describe, expect, it } from "vitest";
import { ALGORITHM_META, RATE_LIMITING_ARTICLE } from "./copy";
import { runSteps } from "./engine";
import { ALGORITHM_IDS, paramsOf } from "./types";

describe("algorithm copy", () => {
  it("has an entry for every algorithm, keyed by its own id", () => {
    for (const id of ALGORITHM_IDS) expect(ALGORITHM_META[id].id).toBe(id);
  });

  it("links each algorithm to its heading in the rate-limiting article", () => {
    expect(RATE_LIMITING_ARTICLE).toBe("/system-design/algorithms/rate-limiting-algorithms/");
    expect(ALGORITHM_IDS.map((id) => ALGORITHM_META[id].anchor)).toEqual([
      "fixed-window-counter",
      "sliding-window-log",
      "sliding-window-counter",
      "token-bucket",
      "leaky-bucket",
    ]);
  });

  it("every step line index in a path exists, and both paths start with the tick move", () => {
    for (const id of ALGORITHM_IDS) {
      const m = ALGORITHM_META[id];
      for (const path of [m.paths.ok, m.paths.bad]) {
        expect(path[0], id).toBe(0);
        expect(
          path.every((n) => n >= 0 && n < m.lines.length),
          id,
        ).toBe(true);
      }
    }
  });

  it("each algorithm has two Try presets that patch the sequence, Limit and Pace together", () => {
    for (const id of ALGORITHM_IDS) {
      const tries = ALGORITHM_META[id].tries;
      expect(tries, id).toHaveLength(2);
      for (const t of tries) {
        expect(Array.isArray(t.patch.sequence), `${id} ${t.title}`).toBe(true);
        expect(typeof t.patch.limit, `${id} ${t.title}`).toBe("number");
        expect(["1", "2"], `${id} ${t.title}`).toContain(t.patch.pace);
      }
    }
  });

  it("every Try preset shows its point from any slider position, with the pinned outcome", () => {
    const pinned: Record<string, string> = {
      "fixed-window:Straddle the boundary": "AAAAAARR",
      "fixed-window:Move the burst off the boundary": "AAARRRR",
      "sliding-log:Same stream, no spike": "AAARRRRA",
      "sliding-log:Memory grows with Limit": "AAAAAR",
      "sliding-counter:Estimate too generous": "AAAARR",
      "sliding-counter:Estimate too strict": "AAAARR",
      "token-bucket:Idle buys a burst": "AAAR",
      "token-bucket:Refill is the real limit": "AAARAR",
      "leaky-bucket:Smooth output": "AAAARRRA",
      "leaky-bucket:A full queue drops the tail": "AAARRRA",
    };
    for (const id of ALGORITHM_IDS) {
      for (const t of ALGORITHM_META[id].tries) {
        const patch = t.patch;
        const ticks = (patch.sequence as string[]).map(Number);
        const params = paramsOf(patch.limit as number, patch.pace === "1" ? 1 : 2);
        const got = runSteps(id, params, ticks)
          .map((s) => (s.ok ? "A" : "R"))
          .join("");
        expect(got, `${id}:${t.title}`).toBe(pinned[`${id}:${t.title}`]);
      }
    }
  });

  it("the sliding-counter presets contrast with the log as their blurbs say", () => {
    const generous = runSteps("sliding-log", paramsOf(3, 2), [5, 5, 5, 6, 7, 7]);
    expect(generous.map((s) => (s.ok ? "A" : "R")).join("")).toBe("AAARRR");
    const strict = runSteps("sliding-log", paramsOf(3, 2), [0, 0, 0, 6, 6, 6]);
    expect(strict.map((s) => (s.ok ? "A" : "R")).join("")).toBe("AAAAAA");
  });

  it("revision copy is set for every algorithm, with its glossary term", () => {
    for (const id of ALGORITHM_IDS) {
      const m = ALGORITHM_META[id];
      expect(m.summary.length, id).toBeGreaterThan(10);
      expect(m.differs.length, id).toBeGreaterThan(10);
    }
    expect(ALGORITHM_IDS.map((id) => ALGORITHM_META[id].glossaryTerm)).toEqual([
      "fixed window counter",
      "sliding window log",
      "sliding window counter",
      "token bucket",
      "leaky bucket",
    ]);
  });
});
