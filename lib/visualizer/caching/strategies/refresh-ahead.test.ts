import { describe, expect, it } from "vitest";
import { richText } from "../../core/rich";
import { at, badges, labels, lanes, metrics, run, section } from "../test-helpers";
import type { Params } from "../types";
import { refreshAhead } from "./refresh-ahead";

const six: Params = { lifetime: 6, flushEvery: 3 };

describe("refresh-ahead", () => {
  it("refreshes a hot key in the last third of its lifetime and never misses again", () => {
    const f = run(refreshAhead, "RA RA RA RA RA RA RA RA RA RA", six);
    expect(f.map((x) => lanes(x).hops.length)).toEqual([4, 2, 2, 2, 4, 2, 2, 2, 4, 2]);
    expect(badges(f)).toEqual(["MISS", ...Array.from({ length: 9 }, () => "HIT")]);
    expect(labels(at(f, 4))).toEqual(["get A", "v1 · hit", "refresh A", "v1"]);
    expect(lanes(at(f, 4)).hops.map((h) => h.thread)).toEqual([0, 0, 1, 1]);
    expect(at(f, 4).path).toEqual([0, 1, 4]);
  });

  it("a refresh brings in the DB's newer value after a write", () => {
    const f = run(refreshAhead, "RA WA RA RA RA RA", six);
    expect(badges(f)).toEqual(["MISS", "WRITE", "STALE HIT", "STALE HIT", "STALE HIT", "HIT"]);
    expect(metrics(f)).toEqual(["0", "0", "1", "2", "3", "3"]);
    expect(labels(at(f, 4))).toEqual(["get A", "v1 · stale", "refresh A", "v2"]);
    expect(section(at(f, 4), "cache", "Entries")).toEqual([
      { text: "A = v2", tone: "changed", bar: { value: 6, max: 6 } },
    ]);
  });

  it("at the minimum lifetime every hit refreshes and the entry never expires while hot", () => {
    const f = run(refreshAhead, "RA RA RA", { lifetime: 2, flushEvery: 3 });
    expect(f.map((x) => lanes(x).hops.length)).toEqual([4, 4, 4]);
    expect(badges(f)).toEqual(["MISS", "HIT", "HIT"]);
  });

  it("an entry nobody reads still expires", () => {
    const f = run(refreshAhead, "RA RB RB RB RB RB RB RA", six);
    expect(richText(at(f, 6).caption)).toContain("A expired");
    expect(at(f, 7).badge).toBe("MISS");
  });
});
