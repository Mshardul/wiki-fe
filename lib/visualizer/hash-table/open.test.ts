import { describe, expect, it } from "vitest";
import { openRun } from "./open";
import { cellsOf, FIXTURE, ins, keysOf, op, trail } from "./test-helpers";

const last = <T>(a: T[]): T => a[a.length - 1] as T;
const finalOf = (events: ReturnType<typeof openRun>) => keysOf(last(events).cells);

describe("open addressing", () => {
  it("linear insert 32 on the fixture table", () => {
    const ev = openRun(ins(32), "linear", 8, cellsOf(FIXTURE));
    expect(trail(ev)).toEqual([
      "Start",
      "Hash",
      "Probe@0",
      "Hop",
      "Probe@1",
      "Hop",
      "Probe@2",
      "Hop",
      "Probe@3",
      "Place@3",
      "Done",
    ]);
    const place = ev[9];
    expect(place?.tried).toEqual([0, 1, 2, 3]);
    expect(place?.probes).toBe(4);
    expect(place?.placed).toBe(3);
    expect(finalOf(ev)).toEqual([16, 8, 24, 32, null, 5, null, null]);
  });

  it("hop carries the next slot but not yet a probe", () => {
    const ev = openRun(ins(32), "linear", 8, cellsOf(FIXTURE));
    const hop = ev[3];
    expect(hop?.badge).toBe("Hop");
    expect(hop?.slot).toBe(1);
    expect(hop?.tried).toEqual([0, 1]);
    expect(hop?.probes).toBe(1);
  });

  it("quadratic insert 32 on the fixture table skips slot 2", () => {
    const ev = openRun(ins(32), "quadratic", 8, cellsOf(FIXTURE));
    expect(trail(ev)).toEqual([
      "Start",
      "Hash",
      "Probe@0",
      "Hop",
      "Probe@1",
      "Hop",
      "Probe@4",
      "Place@4",
      "Done",
    ]);
    expect(ev[7]?.tried).toEqual([0, 1, 4]);
  });

  it("quadratic 16 8 24 32 from empty is stuck after eight probes", () => {
    const ev = openRun(ins(16, 8, 24, 32), "quadratic", 8);
    expect(ev).toHaveLength(34);
    const stuck = ev[ev.length - 2];
    expect(stuck?.badge).toBe("Stuck");
    expect(stuck?.tried).toEqual([0, 1, 4, 1, 0, 1, 4, 1]);
    expect(stuck?.probes).toBe(8);
    expect(stuck?.used).toBe(3);
    expect(finalOf(ev)).toEqual([16, 8, null, null, 24, null, null, null]);
  });

  it("double hashing insert 32 on the fixture table", () => {
    const ev = openRun(ins(32), "double", 8, cellsOf(FIXTURE));
    expect(trail(ev)).toEqual([
      "Start",
      "Hash",
      "Probe@0",
      "Hop",
      "Probe@5",
      "Hop",
      "Probe@2",
      "Hop",
      "Probe@7",
      "Place@7",
      "Done",
    ]);
    expect(ev[1]?.second).toBe(5);
    expect(ev[9]?.placed).toBe(7);
  });

  it("double hashing built from empty gives the same walk", () => {
    const ev = openRun(ins(16, 8, 24, 5, 32), "double", 8);
    expect(ev).toHaveLength(27);
    expect(finalOf(ev)).toEqual([16, null, 8, null, 24, 5, null, 32]);
  });

  it("double hashing with a step equal to the size never leaves the home slot", () => {
    const ev = openRun(ins(6, 13), "double", 7);
    const stuck = ev.find((e) => e.badge === "Stuck");
    expect(stuck?.tried).toEqual([6, 6, 6, 6, 6, 6, 6]);
    expect(finalOf(ev)).toEqual([null, null, null, null, null, null, 6]);
  });

  it("delete leaves a marker and lookup steps over it", () => {
    const ev = openRun([op("delete", 8), op("lookup", 24)], "linear", 8, cellsOf(FIXTURE));
    expect(trail(ev)).toEqual([
      "Start",
      "Hash",
      "Probe@0",
      "Hop",
      "Probe@1",
      "Found",
      "Mark",
      "Hash",
      "Probe@0",
      "Hop",
      "Probe@1",
      "Hop",
      "Probe@2",
      "Found",
      "Done",
    ]);
    expect(ev).toHaveLength(15);
    expect(keysOf(ev[6]?.cells ?? [])).toEqual([16, "x8", 24, null, null, 5, null, null]);
    expect(ev[12]?.probes).toBe(3);
  });

  it("insert after a delete reuses the marker only after the walk ends", () => {
    const ev = openRun([op("delete", 8), ...ins(32)], "linear", 8, cellsOf(FIXTURE));
    expect(ev).toHaveLength(17);
    expect(trail(ev).slice(7, 16)).toEqual([
      "Hash",
      "Probe@0",
      "Hop",
      "Probe@1",
      "Hop",
      "Probe@2",
      "Hop",
      "Probe@3",
      "Place@1",
    ]);
    expect(ev[15]?.probes).toBe(4);
    expect(finalOf(ev)).toEqual([16, 32, 24, null, null, 5, null, null]);
  });

  it("duplicate insert is found and stores nothing", () => {
    const ev = openRun(ins(8), "linear", 8, cellsOf(FIXTURE));
    expect(trail(ev)).toEqual(["Start", "Hash", "Probe@0", "Hop", "Probe@1", "Found", "Done"]);
    expect(finalOf(ev)).toEqual(FIXTURE);
  });

  it("key 0 is stored and the next key 8 probes past it", () => {
    const ev = openRun(ins(0, 8), "linear", 8);
    expect(trail(ev)).toEqual([
      "Start",
      "Hash",
      "Probe@0",
      "Place@0",
      "Hash",
      "Probe@0",
      "Hop",
      "Probe@1",
      "Place@1",
      "Done",
    ]);
    expect(finalOf(ev).slice(0, 2)).toEqual([0, 8]);
  });

  it("size 1 places once then is stuck", () => {
    const ev = openRun(ins(5, 6), "linear", 1);
    expect(trail(ev)).toEqual([
      "Start",
      "Hash",
      "Probe@0",
      "Place@0",
      "Hash",
      "Probe@0",
      "Stuck",
      "Done",
    ]);
  });

  it("a full table ends stuck after size probes", () => {
    const ev = openRun(ins(0, 1, 2, 3, 4), "linear", 4);
    expect(ev).toHaveLength(23);
    const stuck = ev.find((e) => e.badge === "Stuck");
    expect(stuck?.tried).toEqual([0, 1, 2, 3]);
    expect(finalOf(ev)).toEqual([0, 1, 2, 3]);
  });

  it("delete and lookup of a missing key end on an empty slot", () => {
    const ev = openRun([op("delete", 99)], "linear", 8, cellsOf(FIXTURE));
    expect(trail(ev)).toEqual(["Start", "Hash", "Probe@3", "Not found", "Done"]);
    expect(finalOf(ev)).toEqual(FIXTURE);
  });

  it("defaults", () => {
    const lin = openRun(ins(16, 8, 24, 5, 32), "linear", 8);
    expect(lin).toHaveLength(29);
    const quad = openRun(ins(16, 8, 24, 5, 13), "quadratic", 8);
    expect(quad).toHaveLength(25);
    expect(finalOf(quad)).toEqual([16, 8, null, null, 24, 5, 13, null]);
  });

  it("never repeats the same state in a row and keeps probes within the size", () => {
    const runs = [
      openRun(ins(16, 8, 24, 32), "quadratic", 8),
      openRun(ins(6, 13, 20), "double", 7),
      openRun(ins(0, 1, 2, 3, 4), "linear", 4),
    ];
    for (const ev of runs) {
      ev.forEach((e, i) => {
        expect(e.probes).toBeLessThanOrEqual(e.cells.length);
        for (const s of e.tried) expect(s).toBeLessThan(e.cells.length);
        const prev = ev[i - 1];
        if (prev) {
          const same = (x: typeof e) =>
            JSON.stringify([x.badge, x.cells, x.slot, x.tried, x.key, x.probes]);
          expect(same(e)).not.toBe(same(prev));
        }
      });
    }
  });
});
