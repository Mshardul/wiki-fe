import { describe, expect, it } from "vitest";
import { richText } from "../../core/rich";
import { at, badges, labels, lanes, metrics, run, section, varOf } from "../test-helpers";
import { writeThrough } from "./write-through";

describe("write-through", () => {
  it("writes the cache and the DB together before acknowledging", () => {
    const f = run(writeThrough, "WA RA");
    expect(labels(at(f, 0))).toEqual(["set A = v2", "write A = v2", "ok", "ok"]);
    expect(varOf(at(f, 0), "latency (ticks)")).toBe("4");
    expect(varOf(at(f, 0), "DB writes")).toBe("1");
    expect(badges(f)).toEqual(["WRITE", "HIT"]);
    expect(metrics(f)).toEqual(["0", "0"]);
    expect(section(at(f, 0), "cache", "Entries")).toEqual([{ text: "A = v2", tone: "changed" }]);
  });

  it("a crash loses nothing and the next read reloads current data", () => {
    const f = run(writeThrough, "WA WB ! RA");
    const crash = at(f, 2);
    expect(crash.badge).toBe("CRASH");
    expect(crash.outcome).toBe("good");
    expect(richText(crash.caption)).toContain("nothing is lost");
    expect(lanes(crash).lanes[1]?.dead).toBe(true);
    expect(labels(at(f, 3))).toEqual(["get A", "load A", "v2", "v2"]);
    expect(metrics(f)).toEqual(["0", "0", "0", "0"]);
  });
});
