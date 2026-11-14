import { describe, expect, it } from "vitest";
import { resizeRun } from "./resize";
import { ins, keysOf, op } from "./test-helpers";

const last = <T>(a: T[]): T => a[a.length - 1] as T;
const movedKeys = (ev: ReturnType<typeof resizeRun>) =>
  ev.filter((e) => e.badge === "Move").map((e) => e.key);

describe("resize", () => {
  const ev = resizeRun(ins(16, 8, 24, 5, 32, 13, 21), 8, 0.75);

  it("is 70 events and grows right after the 7th insert", () => {
    expect(ev).toHaveLength(70);
    const grow = ev.findIndex((e) => e.badge === "Grow");
    expect(ev[grow - 1]?.badge).toBe("Place");
    expect(ev[grow - 1]?.key).toBe(21);
    expect(ev[grow - 1]?.used).toBe(7);
  });

  it("does not grow at exactly the threshold", () => {
    const at13 = ev.findIndex((e) => e.badge === "Place" && e.key === 13);
    expect(ev[at13]?.used).toBe(6);
    expect(ev.slice(0, at13 + 1).some((e) => e.badge === "Grow")).toBe(false);
  });

  it("rehashes in old slot order into a table of 16", () => {
    expect(movedKeys(ev)).toEqual([16, 8, 24, 32, 5, 13, 21]);
    const grow = ev.find((e) => e.badge === "Grow");
    expect(grow?.cells).toHaveLength(16);
    expect(grow?.old).toHaveLength(8);
    expect(keysOf(ev[ev.length - 3]?.cells ?? [])).toEqual([
      16,
      32,
      null,
      null,
      null,
      5,
      21,
      null,
      8,
      24,
      null,
      null,
      null,
      13,
      null,
      null,
    ]);
    expect(ev[ev.length - 2]?.badge).toBe("Switch");
    expect(ev[ev.length - 2]?.old).toBeNull();
    expect(last(ev).badge).toBe("Done");
  });

  it("mini run: size 4 grows on the 4th insert", () => {
    const mini = resizeRun(ins(5, 9, 2, 6), 4, 0.75);
    expect(mini).toHaveLength(36);
    expect(movedKeys(mini)).toEqual([6, 5, 9, 2]);
    expect(keysOf(last(mini).cells)).toEqual([null, 9, 2, null, null, 5, 6, null]);
  });

  it("threshold 0.9 grows on the 8th insert, not the 7th", () => {
    const run = resizeRun(ins(0, 1, 2, 3, 4, 5, 6, 7), 8, 0.9);
    const grows = run.filter((e) => e.badge === "Grow");
    expect(grows).toHaveLength(1);
    expect(run.findIndex((e) => e.badge === "Grow")).toBeGreaterThan(
      run.findIndex((e) => e.badge === "Place" && e.key === 7),
    );
  });

  it("a duplicate or stuck insert never grows", () => {
    const run = resizeRun(ins(1, 1, 1), 8, 0.1);
    expect(run.filter((e) => e.badge === "Grow")).toHaveLength(1);
  });

  it("a marker counts toward the load and is dropped on rehash", () => {
    const run = resizeRun([...ins(1, 2, 3), op("delete", 3), ...ins(4)], 4, 0.75);
    expect(movedKeys(run)).toEqual([4, 1, 2]);
    expect(keysOf(last(run).cells)).toEqual([null, 1, 2, null, 4, null, null, null]);
  });

  it("no two adjacent events are identical", () => {
    ev.forEach((e, i) => {
      const prev = ev[i - 1];
      if (prev) {
        const same = (x: typeof e) =>
          JSON.stringify([x.badge, x.cells, x.old, x.oldAt, x.slot, x.key, x.tried]);
        expect(same(e)).not.toBe(same(prev));
      }
    });
  });
});
