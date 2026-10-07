import { describe, expect, it } from "vitest";
import { richText } from "../../core/rich";
import type { RingModel } from "../../core/shapes";
import { simulate } from "../simulate";
import { clock } from "./clock";

const TRACE = "ABCADEAFBAGC".split("");
const frames = simulate(clock, 4, TRACE);
const ring = (i: number) => frames[i]?.model as RingModel;

describe("CLOCK", () => {
  it("hits and evictions match the reference", () => {
    expect(frames.flatMap((f, i) => (f.outcome === "good" ? [i] : []))).toEqual([3, 9]);
    const evicted = frames.map((f) => {
      const v = f.vars.find((r) => r.name === "removed")?.value;
      return v === "—" ? null : v;
    });
    expect(evicted).toEqual([null, null, null, null, null, "A", "B", "C", "D", null, "E", "A"]);
  });

  it("request 6: full sweep clears every bit, then evicts at the hand", () => {
    expect(ring(5).cleared).toEqual([0, 1, 2, 3]);
    expect(ring(5).active).toBe(0);
    expect(ring(5).hand).toBe(1);
    expect(ring(5).turns).toBe(5);
    expect(richText(frames[5]?.lines[2] ?? [])).toBe(
      "No → miss. Hand cleared A, B, C, D; removed A.",
    );
  });

  it("request 8: bits and hand position", () => {
    expect(ring(7).slots).toEqual([
      { key: "E", bit: 1 },
      { key: "A", bit: 1 },
      { key: "F", bit: 1 },
      { key: "D", bit: 0 },
    ]);
    expect(ring(7).hand).toBe(3);
    expect(ring(7).turns).toBe(7);
    expect(richText(frames[7]?.lines[2] ?? [])).toBe("No → miss. Hand cleared no bits; removed C.");
  });

  it("a hit sets the bit and marks the slot active without moving the hand", () => {
    expect(ring(9).active).toBe(1);
    expect(ring(9).tone).toBe("hit");
    expect(ring(9).cleared).toEqual([]);
    expect(ring(9).hand).toBe(ring(8).hand);
  });

  it("turns keep counting across full sweeps", () => {
    expect(ring(10).turns).toBe(13);
    expect(ring(10).hand).toBe(1);
  });

  it("fills empty slots first and never sweeps a non-full ring", () => {
    const f = simulate(clock, 4, ["A", "B", "A"]);
    expect((f[2]?.model as RingModel).slots).toEqual([
      { key: "A", bit: 1 },
      { key: "B", bit: 1 },
      null,
      null,
    ]);
    expect((f[2]?.model as RingModel).turns).toBe(0);
  });
});
