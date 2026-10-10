import { describe, expect, it } from "vitest";
import { richText } from "../../core/rich";
import { at, badges, labels, lanes, metrics, run, section, varOf } from "../test-helpers";
import { readThrough } from "./read-through";

describe("read-through", () => {
  it("loads through the cache on a miss and serves the next read from it", () => {
    const f = run(readThrough, "RA RA");
    expect(labels(at(f, 0))).toEqual(["get A", "load A", "v1", "v1"]);
    expect(lanes(at(f, 0)).hops.map((h) => `${h.from}>${h.to}`)).toEqual([
      "app>cache",
      "cache>db",
      "db>cache",
      "cache>app",
    ]);
    expect(labels(at(f, 1))).toEqual(["get A", "v1 · hit"]);
    expect(f.map((x) => varOf(x, "latency (ticks)"))).toEqual(["4", "1"]);
  });

  it("writes go to the DB only, so a cached copy stays stale until it expires", () => {
    const f = run(readThrough, "RA WA RA");
    expect(labels(at(f, 1))).toEqual(["write A = v2"]);
    expect(badges(f)).toEqual(["MISS", "WRITE", "STALE HIT"]);
    expect(metrics(f)).toEqual(["0", "0", "1"]);
  });

  it("drops an entry when its lifetime ends and says so", () => {
    const f = run(readThrough, "RA WA RA RA", { lifetime: 2, flushEvery: 3 });
    expect(badges(f)).toEqual(["MISS", "WRITE", "MISS", "HIT"]);
    expect(richText(at(f, 2).caption)).toContain("A expired");
    expect(labels(at(f, 2))).toEqual(["get A", "load A", "v2", "v2"]);
    expect(metrics(f)).toEqual(["0", "0", "0", "0"]);
  });

  it("shows an expiry bar that counts down", () => {
    const f = run(readThrough, "RA RB RA");
    expect(section(at(f, 0), "cache", "Entries")[0]?.bar).toEqual({ value: 5, max: 5 });
    expect(section(at(f, 2), "cache", "Entries").map((i) => i.bar?.value)).toEqual([3, 4]);
  });

  it("runs an overlapped read and write as two threads in one frame", () => {
    const f = run(readThrough, "XA");
    const frame = at(f, 0);
    expect(labels(frame)).toEqual(["get A", "load A", "v1", "v1", "write A = v2"]);
    expect(lanes(frame).hops.map((h) => h.thread)).toEqual([0, 0, 0, 0, 1]);
    expect(frame.badge).toBe("R ∥ W");
    expect(frame.path).toEqual([0, 2, 3]);
  });
});
