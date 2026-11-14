import { describe, expect, it } from "vitest";
import type { InputValues } from "../core/fields";
import { heapModule } from "./module";
import { HEAP_IDS } from "./types";

const INPUTS: Record<string, string[]> = {
  default: ["5", "3", "8", "1", "4", "7"],
  "all-equal": ["4", "4", "4", "4", "4"],
  "two values": ["3", "9"],
  twelve: ["9", "8", "7", "6", "5", "4", "3", "2", "1", "10", "11", "12"],
};

describe("heap steps", () => {
  for (const op of HEAP_IDS) {
    for (const [name, sequence] of Object.entries(INPUTS)) {
      for (const order of ["min", "max"]) {
        it(`${op} on ${name} (${order}): no repeats, paths valid`, () => {
          const values: InputValues = { ...heapModule.defaults(), op, order, sequence };
          const { frames } = heapModule.run(values);
          expect(frames[0]?.badge).toBe("Start");
          expect(frames[frames.length - 1]?.badge).toBe("Done");
          frames.forEach((f, i) => {
            if (i > 0) {
              expect(JSON.stringify(f.model)).not.toBe(JSON.stringify(frames[i - 1]?.model));
            }
            expect(f.lines.length).toBeGreaterThanOrEqual(2);
            expect(f.lines.length).toBeLessThanOrEqual(4);
            for (const p of f.path) expect(p).toBeLessThan(f.lines.length);
          });
        });
      }
    }
  }

  it("insert ends on a valid min-heap", () => {
    const { frames } = heapModule.run({ ...heapModule.defaults(), op: "insert" });
    const model = frames[frames.length - 1]?.model;
    if (model?.kind !== "heap") throw new Error("expected heap");
    const v = model.nodes.map((n) => n?.value ?? 0);
    v.forEach((x, i) => {
      if (i > 0) expect(v[Math.floor((i - 1) / 2)] ?? 0).toBeLessThanOrEqual(x);
    });
  });

  it("heap sort ends with the whole array sorted", () => {
    const { frames } = heapModule.run({ ...heapModule.defaults(), op: "heapsort", order: "max" });
    const model = frames[frames.length - 1]?.model;
    if (model?.kind !== "heap") throw new Error("expected heap");
    const out = (model.array?.rows[0]?.bars ?? []).map((b) => b?.value ?? 0);
    expect(out).toEqual([...out].sort((a, b) => a - b));
  });

  it("the Top-K picture is a stream strip over the heap", () => {
    const { frames } = heapModule.run({ ...heapModule.defaults(), op: "topk" });
    const model = frames[1]?.model;
    if (model?.kind !== "composite") throw new Error("expected composite");
    expect(model.parts.map((p) => p.kind)).toEqual(["linear", "heap"]);
  });
});
