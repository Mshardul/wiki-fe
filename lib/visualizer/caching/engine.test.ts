import { describe, expect, it } from "vitest";
import { cacheAside } from "./strategies/cache-aside";
import { at, lanes, P, run, section, varOf } from "./test-helpers";

describe("simulate", () => {
  it("emits one frame per request with its token as the label", () => {
    const f = run(cacheAside, "RA WB XC");
    expect(f.map((x) => x.index)).toEqual([0, 1, 2]);
    expect(f.map((x) => x.label)).toEqual(["R A", "W B", "X C"]);
  });

  it("stamps each frame's model with its step number so identical-looking steps still replay", () => {
    const f = run(cacheAside, "RA RA RA");
    expect(f.map((x) => lanes(x).epoch)).toEqual([0, 1, 2]);
  });

  it("reserves the run-wide number of hop rows on every frame", () => {
    const f = run(cacheAside, "RA XA");
    expect(f.map((x) => lanes(x).slots)).toEqual([7, 7]);
  });

  it("reports the variables the Step tab shows", () => {
    const f = run(cacheAside, "RA WA");
    expect(f[1]?.vars.map((v) => v.name)).toEqual([
      "request #",
      "request",
      "cache A",
      "DB A",
      "latency (ticks)",
      "DB writes",
      "stale reads",
    ]);
    expect(varOf(at(f, 1), "DB A")).toBe("v2");
    expect(varOf(at(f, 1), "cache A")).toBe("—");
    expect(varOf(at(f, 1), "DB writes")).toBe("1");
  });

  it("adds a key past the Keys slider to the DB and the reserved card height", () => {
    const f = run(cacheAside, "RE", P, 3);
    expect(section(at(f, 0), "db", "Rows").map((i) => i.text)).toEqual([
      "A = v1",
      "B = v1",
      "C = v1",
      "E = v1",
    ]);
    expect(lanes(at(f, 0)).cardRows).toBe(5);
  });

  it("does not highlight a typed key past the slider as changed on a plain read", () => {
    const f = run(cacheAside, "RE", P, 3);
    expect(section(at(f, 0), "db", "Rows")[3]).toEqual({ text: "E = v1" });
  });

  it("names the key in the cache and DB rows so before and now compare the same key", () => {
    const f = run(cacheAside, "RA RB");
    expect(f[0]?.vars.map((v) => v.name)).toContain("cache A");
    expect(f[1]?.vars.map((v) => v.name)).toContain("cache B");
    expect(f[1]?.vars.map((v) => v.name)).not.toContain("cache A");
  });

  it("a crash frame has no key, so its rows are plain", () => {
    const f = run(cacheAside, "RA !");
    expect(varOf(at(f, 1), "cache")).toBe("—");
    expect(varOf(at(f, 1), "DB")).toBe("—");
  });

  it("is deterministic", () => {
    expect(run(cacheAside, "RA XA RA WA")).toEqual(run(cacheAside, "RA XA RA WA"));
  });
});
