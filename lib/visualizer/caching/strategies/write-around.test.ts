import { describe, expect, it } from "vitest";
import { at, badges, labels, metrics, run, section } from "../test-helpers";
import { writeAround } from "./write-around";

describe("write-around", () => {
  it("fills on the app's own read and bypasses the cache on write", () => {
    const f = run(writeAround, "RA WA RA");
    expect(labels(at(f, 0))).toEqual(["get A", "miss", "read A", "v1", "set A = v1"]);
    expect(labels(at(f, 1))).toEqual(["write A = v2"]);
    expect(badges(f)).toEqual(["MISS", "WRITE", "STALE HIT"]);
    expect(metrics(f)).toEqual(["0", "0", "1"]);
    expect(section(at(f, 1), "cache", "Entries")[0]?.tone).toBe("stale");
  });
});
