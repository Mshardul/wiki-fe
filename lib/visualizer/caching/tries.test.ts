import { describe, expect, it } from "vitest";
import type { RunResult } from "../core/types";
import { cachingModule } from "./module";
import { STRATEGIES } from "./strategies";
import { at, badges, lanes, metrics, section, varOf } from "./test-helpers";
import { parseCachingSequence } from "./tokens";
import { STRATEGY_IDS, type StrategyId } from "./types";

function preset(strategy: StrategyId, title: string): RunResult {
  const t = STRATEGIES[strategy].tries.find((x) => x.title === title);
  if (!t) throw new Error(`no preset "${title}" for ${strategy}`);
  return cachingModule.run({ ...cachingModule.defaults(), strategy, ...t.patch });
}

describe("every Try preset ships its own sequence", () => {
  it("has a valid hand-picked sequence, so it shows the same thing on every click", () => {
    for (const id of STRATEGY_IDS) {
      expect(STRATEGIES[id].tries.length, id).toBeGreaterThanOrEqual(2);
      for (const t of STRATEGIES[id].tries) {
        const seq = t.patch.sequence;
        expect(Array.isArray(seq), `${id}: ${t.title}`).toBe(true);
        const parsed = parseCachingSequence((seq as string[]).join(""));
        expect(parsed.ok && parsed.tokens, `${id}: ${t.title}`).toEqual(seq);
      }
    }
  });
});

describe("Try presets demonstrate what they promise", () => {
  it("cache-aside: force the stale-read race", () => {
    const r = preset("cache-aside", "Force the stale-read race");
    expect(badges(r.frames)).toEqual(["RACE", "STALE HIT", "WRITE", "MISS"]);
    expect(metrics(r.frames)).toEqual(["0", "1", "1", "1"]);
  });

  it("cache-aside: a quiet, read-heavy day is mostly hits", () => {
    const r = preset("cache-aside", "A quiet, read-heavy day");
    expect(badges(r.frames)).toEqual(["MISS", "HIT", "MISS", "HIT", "HIT", "HIT"]);
    expect(metrics(r.frames)).toEqual(["0", "0", "0", "0", "0", "0"]);
  });

  it("read-through: stale until it expires, then fresh again", () => {
    const r = preset("read-through", "Stale until it expires");
    expect(badges(r.frames)).toEqual(["MISS", "WRITE", "STALE HIT", "MISS", "HIT", "HIT"]);
    expect(metrics(r.frames)).toEqual(["0", "0", "1", "1", "1", "1"]);
  });

  it("read-through: a 2-tick lifetime means a DB read every other request", () => {
    const r = preset("read-through", "Short lifetime");
    expect(badges(r.frames)).toEqual(["MISS", "HIT", "MISS", "HIT", "MISS", "HIT"]);
  });

  it("write-through: every write pays for the cache and the DB", () => {
    const r = preset("write-through", "Every write pays twice");
    expect(badges(r.frames)).toEqual(["WRITE", "WRITE", "WRITE"]);
    expect(r.frames.map((f) => varOf(f, "latency (ticks)"))).toEqual(["4", "4", "4"]);
  });

  it("write-through: a crash costs nothing and the next read reloads current data", () => {
    const r = preset("write-through", "A crash costs nothing");
    expect(badges(r.frames)).toEqual(["WRITE", "WRITE", "CRASH", "MISS"]);
    expect(at(r.frames, 2).outcome).toBe("good");
    expect(metrics(r.frames)).toEqual(["0", "0", "0", "0"]);
  });

  it("write-behind: lose a write", () => {
    const r = preset("write-behind", "Lose a write");
    expect(badges(r.frames)).toEqual(["WRITE", "WRITE", "CRASH", "MISS"]);
    expect(at(r.frames, 2).outcome).toBe("bad");
    expect(metrics(r.frames)).toEqual(["0", "0", "2", "2"]);
  });

  it("write-behind: four writes become one DB write at one cache round trip each", () => {
    const r = preset("write-behind", "Fast, batched writes");
    expect(badges(r.frames)).toEqual(["WRITE", "WRITE", "WRITE", "WRITE"]);
    expect(r.frames.map((f) => varOf(f, "latency (ticks)"))).toEqual(["1", "1", "1", "1"]);
    expect(varOf(at(r.frames, 3), "DB writes")).toBe("1");
    expect(varOf(at(r.frames, 3), "waiting to flush")).toBe("0");
  });

  it("write-around: a write leaves a stale cached copy", () => {
    const r = preset("write-around", "Writes skip the cache");
    expect(badges(r.frames)).toEqual(["MISS", "WRITE", "STALE HIT", "WRITE", "WRITE"]);
    expect(metrics(r.frames)).toEqual(["0", "0", "1", "1", "1"]);
  });

  it("write-around: write-heavy traffic never fills the cache", () => {
    const r = preset("write-around", "Write-heavy traffic");
    expect(badges(r.frames)).toEqual(["WRITE", "WRITE", "WRITE", "WRITE", "WRITE"]);
    expect(section(at(r.frames, 4), "cache", "Entries")).toEqual([]);
    expect(varOf(at(r.frames, 4), "DB writes")).toBe("5");
  });

  it("refresh-ahead: a hot key misses once, and a refresh happens near expiry", () => {
    const r = preset("refresh-ahead", "Hot keys never miss");
    expect(badges(r.frames)).toEqual(["MISS", "HIT", "HIT", "HIT", "HIT", "HIT"]);
    expect(lanes(at(r.frames, 4)).hops.map((h) => h.label)).toEqual([
      "get A",
      "v1 · hit",
      "refresh A",
      "v1",
    ]);
  });

  it("refresh-ahead: a 2-tick lifetime refreshes on every hit", () => {
    const r = preset("refresh-ahead", "Short lifetime, constant refresh");
    expect(badges(r.frames)).toEqual(["MISS", "HIT", "HIT", "HIT"]);
    expect(r.frames.map((f) => lanes(f).hops.length)).toEqual([4, 4, 4, 4]);
  });
});
