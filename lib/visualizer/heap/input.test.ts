import { describe, expect, it } from "vitest";
import { DEFAULT_SEQUENCE, toHeapInput } from "./input";

describe("toHeapInput", () => {
  it("falls back on junk fields", () => {
    expect(toHeapInput({ op: "zzz", order: "zzz", k: "x", sequence: null })).toEqual({
      op: "insert",
      order: "min",
      k: 3,
      values: DEFAULT_SEQUENCE.map(Number),
    });
  });

  it("clamps values into 1..99 and k into 2..5", () => {
    const r = toHeapInput({ op: "topk", order: "max", k: 99, sequence: ["0", "500", "7"] });
    expect(r).toMatchObject({ op: "topk", order: "max", k: 5, values: [1, 99, 7] });
    expect(toHeapInput({ k: 0 }).k).toBe(2);
  });

  it("falls back to the default sequence when fewer than two numbers remain", () => {
    expect(toHeapInput({ sequence: ["x"] }).values).toEqual([5, 3, 8, 1, 4, 7]);
    expect(toHeapInput({ sequence: ["4"] }).values).toEqual([5, 3, 8, 1, 4, 7]);
  });
});
