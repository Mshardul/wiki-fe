import { describe, expect, it } from "vitest";
import { richText } from "../../core/rich";
import { at, badges, labels, lanes, metrics, run, section, varOf } from "../test-helpers";
import { cacheAside } from "./cache-aside";

describe("cache-aside", () => {
  it("fills on a cold miss, hits next, and invalidates on write", () => {
    const f = run(cacheAside, "RA RA WA RA");
    expect(badges(f)).toEqual(["MISS", "HIT", "WRITE", "MISS"]);
    expect(labels(at(f, 0))).toEqual(["get A", "miss", "read A", "v1", "set A = v1"]);
    expect(labels(at(f, 1))).toEqual(["get A", "v1 · hit"]);
    expect(labels(at(f, 2))).toEqual(["write A = v2", "delete A"]);
    expect(labels(at(f, 3))).toEqual(["get A", "miss", "read A", "v2", "set A = v2"]);
    expect(f.map((x) => x.path)).toEqual([[0, 2], [0, 1], [3], [0, 2]]);
    expect(f.map((x) => varOf(x, "latency (ticks)"))).toEqual(["5", "1", "4", "5"]);
    expect(metrics(f)).toEqual(["0", "0", "0", "0"]);
  });

  it("draws the stale-read race as two threads and counts the stale read that follows", () => {
    const f = run(cacheAside, "XA RA");
    const race = at(f, 0);
    expect(labels(race)).toEqual([
      "get A",
      "miss",
      "read A",
      "write A = v2",
      "delete A",
      "v1",
      "set A = v1",
    ]);
    const hops = lanes(race).hops;
    expect(hops.map((h) => h.thread)).toEqual([0, 0, 0, 1, 1, 0, 0]);
    expect(hops[6]?.flag).toBe(true);
    expect(race.outcome).toBe("bad");
    expect(race.path).toEqual([0, 2, 3]);
    expect(section(race, "cache", "Entries")).toEqual([{ text: "A = v1", tone: "stale" }]);
    expect(section(race, "db", "Rows")).toContainEqual({ text: "A = v2", tone: "changed" });
    expect(badges(f)).toEqual(["RACE", "STALE HIT"]);
    expect(metrics(f)).toEqual(["0", "1"]);
  });

  it("a later write clears the stale entry", () => {
    const f = run(cacheAside, "XA RA WA RA");
    expect(badges(f)).toEqual(["RACE", "STALE HIT", "WRITE", "MISS"]);
    expect(metrics(f)).toEqual(["0", "1", "1", "1"]);
  });

  it("an X on a key that is already cached says the entry was dropped first", () => {
    const f = run(cacheAside, "RA XA");
    const caption = richText(at(f, 1).caption);
    expect(caption).toContain("A dropped from the cache as if it had just expired");
    expect(caption).not.toContain("was not in the cache");
    expect(at(f, 1).badge).toBe("RACE");
  });

  it("an X on an uncached key starts with the read's old answer, capitalised", () => {
    const f = run(cacheAside, "XA");
    expect(richText(at(f, 0).caption).startsWith("The read's old answer v1")).toBe(true);
  });

  it("explains the loop in plain English", () => {
    const f = run(cacheAside, "RA");
    expect(at(f, 0).lines.map(richText)).toEqual([
      "Ask the cache for A.",
      "Hit → return it.",
      "Miss → read the DB, then put it in the cache.",
      "Write → update the DB, then delete the cache key.",
    ]);
  });
});
