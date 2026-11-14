import { describe, expect, it } from "vitest";
import { pqPop, pqPush } from "./pq";
import type { PqEntry } from "./trace";

const e = (dist: number, node: string, seq: number): PqEntry => ({ dist, node, seq });
const label = (h: PqEntry[]) => h.map((x) => `${x.dist}${x.node}`);

describe("pq", () => {
  it("pushes into heap order", () => {
    let h: PqEntry[] = [];
    h = pqPush(h, e(4, "B", 0)).items;
    h = pqPush(h, e(2, "C", 1)).items;
    h = pqPush(h, e(3, "B", 2)).items;
    expect(label(h)).toEqual(["2C", "4B", "3B"]);
  });

  it("pops the smallest and repairs the heap", () => {
    const h = [e(3, "B", 2), e(4, "B", 1), e(10, "D", 3), e(12, "E", 4)];
    const out = pqPop(h);
    expect(out.top.node).toBe("B");
    expect(out.top.dist).toBe(3);
    expect(label(out.items)).toEqual(["4B", "12E", "10D"]);
  });

  it("pops equal distances in push order", () => {
    let h: PqEntry[] = [];
    h = pqPush(h, e(5, "X", 0)).items;
    h = pqPush(h, e(5, "Y", 1)).items;
    h = pqPush(h, e(5, "Z", 2)).items;
    const order: string[] = [];
    while (h.length) {
      const out = pqPop(h);
      order.push(out.top.node);
      h = out.items;
    }
    expect(order).toEqual(["X", "Y", "Z"]);
  });

  it("reports the swapped index pairs", () => {
    const out = pqPush([e(4, "B", 0), e(9, "C", 1)], e(1, "D", 2));
    expect(out.swaps).toEqual([[2, 0]]);
  });
});
