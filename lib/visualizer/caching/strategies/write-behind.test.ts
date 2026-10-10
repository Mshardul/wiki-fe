import { describe, expect, it } from "vitest";
import { richText } from "../../core/rich";
import { at, badges, labels, lanes, metrics, P, run, section, varOf } from "../test-helpers";
import type { Params } from "../types";
import { writeBehind } from "./write-behind";

const wb = (tokens: string, p: Params = P) => run(writeBehind, tokens, p);

describe("write-behind", () => {
  it("acknowledges from the cache and holds the write in the buffer", () => {
    const f = wb("WA");
    expect(labels(at(f, 0))).toEqual(["set A = v2", "ok"]);
    expect(varOf(at(f, 0), "latency (ticks)")).toBe("1");
    expect(section(at(f, 0), "cache", "Write buffer")).toEqual([
      { text: "A = v2", tone: "changed" },
    ]);
    expect(section(at(f, 0), "db", "Rows")[0]).toEqual({ text: "A = v1" });
    expect(varOf(at(f, 0), "waiting to flush")).toBe("1");
  });

  it("flushes on every Nth request as a second thread", () => {
    const f = wb("WA WB WA WC !");
    expect(labels(at(f, 2))).toEqual(["set A = v3", "ok", "flush A = v3, B = v2", "ok"]);
    expect(lanes(at(f, 2)).hops.map((h) => h.thread)).toEqual([0, 0, 1, 1]);
    expect(at(f, 2).path).toEqual([3, 4]);
    expect(varOf(at(f, 2), "DB writes")).toBe("2");
    expect(varOf(at(f, 2), "waiting to flush")).toBe("0");
  });

  it("coalesces repeated writes to one key into one DB write", () => {
    const f = wb("WA WA WA");
    expect(labels(at(f, 2))[2]).toBe("flush A = v4");
    expect(varOf(at(f, 2), "DB writes")).toBe("1");
  });

  it("a crash before the next flush loses the buffered write", () => {
    const f = wb("WA WB WA WC !");
    const crash = at(f, 4);
    expect(badges(f)).toEqual(["WRITE", "WRITE", "WRITE", "WRITE", "CRASH"]);
    expect(metrics(f)).toEqual(["0", "0", "0", "0", "1"]);
    expect(crash.outcome).toBe("bad");
    expect(lanes(crash).lanes[1]?.dead).toBe(true);
    expect(lanes(crash).note).toBe("node down — C lost");
    expect(section(crash, "cache", "Entries")).toEqual([{ text: "— wiped —", tone: "muted" }]);
    expect(section(crash, "cache", "Write buffer")).toEqual([{ text: "C = v2", tone: "lost" }]);
    expect(section(crash, "db", "Rows").map((i) => i.text)).toEqual(["A = v3", "B = v2", "C = v1"]);
  });

  it("after a crash the cache is alive but empty, and the lost write stays lost", () => {
    const f = wb("WA WB WA WC ! RC");
    expect(lanes(at(f, 5)).lanes[1]?.dead).toBe(false);
    expect(labels(at(f, 5))).toEqual(["get C", "load C", "v1", "v1"]);
    expect(metrics(f)[5]).toBe("1");
  });

  it("does nothing special when flush-every is longer than the run", () => {
    const f = wb("WA WB WA", { lifetime: 5, flushEvery: 6 });
    expect(f.map((x) => varOf(x, "DB writes"))).toEqual(["0", "0", "0"]);
    expect(varOf(at(f, 2), "waiting to flush")).toBe("2");
    expect(labels(at(f, 2))).toEqual(["set A = v3", "ok"]);
  });

  it("a crash with nothing buffered loses nothing: first request, repeated, or right after a flush", () => {
    const first = wb("! WA");
    expect(at(first, 0).outcome).toBe("good");
    expect(richText(at(first, 0).caption)).toContain("nothing is lost");
    expect(labels(at(first, 1))).toEqual(["set A = v2", "ok"]);
    expect(metrics(first)).toEqual(["0", "0"]);

    const twice = wb("WA ! !");
    expect(metrics(twice)).toEqual(["0", "1", "1"]);
    expect(at(twice, 2).outcome).toBe("good");

    const flushed = wb("WA WA WA !");
    expect(at(flushed, 3).outcome).toBe("good");
    expect(metrics(flushed)).toEqual(["0", "0", "0", "0"]);
  });
});
