import { describe, expect, it } from "vitest";
import { richText } from "../core/rich";
import type { LinearModel } from "../core/shapes";
import { fifo } from "./policies/fifo";
import { lru } from "./policies/lru";
import { simulate } from "./simulate";

const TRACE = "ABCADEAFBAGC".split("");
const hitsOf = (frames: { outcome: string }[]) =>
  frames.flatMap((f, i) => (f.outcome === "good" ? [i] : []));
const evictionsOf = (frames: { model: { kind: string } }[]) =>
  frames.map((f) => (f.model as LinearModel).removed);
const varOf = (frame: { vars: { name: string; value: string }[] }, name: string) =>
  frame.vars.find((v) => v.name === name)?.value;

describe("simulate — LRU", () => {
  const frames = simulate(lru, 4, TRACE);

  it("hits and evictions match the reference", () => {
    expect(hitsOf(frames)).toEqual([3, 6, 9]);
    expect(evictionsOf(frames)).toEqual([
      null,
      null,
      null,
      null,
      null,
      "B",
      null,
      "C",
      "D",
      null,
      "E",
      "F",
    ]);
  });

  it("request 8 (get F): stack, next-out, path, lines, caption, metric", () => {
    const f = frames[7];
    if (!f) throw new Error("missing frame");
    const m = f.model as LinearModel;
    expect(m.items).toEqual(["F", "A", "E", "D"]);
    expect(m.next).toBe("D");
    expect(m.active).toBe("F");
    expect(m.tone).toBe("new");
    expect(f.path).toEqual([0, 2, 3]);
    expect(richText(f.lines[2] ?? [])).toBe("No → miss. Full → remove C from the bottom.");
    expect(richText(f.caption)).toBe("F miss — added · C out");
    expect(f.metric).toBe("25%");
    expect(varOf(f, "removed")).toBe("C");
    expect(varOf(f, "cache")).toBe("[F A E D]");
    expect(varOf(f, "hits")).toBe("2");
    expect(varOf(f, "misses")).toBe("6");
    expect(richText(f.logNote)).toBe("removed C");
  });

  it("a hit moves the key to the top and takes the hit path", () => {
    const f = frames[3];
    if (!f) throw new Error("missing frame");
    expect((f.model as LinearModel).items).toEqual(["A", "C", "B"]);
    expect(f.path).toEqual([0, 1]);
    expect(f.badge).toBe("HIT");
    expect(richText(f.caption)).toBe("A hit — moves to the newest end");
    expect(richText(f.logNote)).toBe("—");
  });

  it("before the cache fills there is no next-out and the room line is used", () => {
    const f = frames[2];
    if (!f) throw new Error("missing frame");
    expect((f.model as LinearModel).next).toBeNull();
    expect(richText(f.lines[2] ?? [])).toBe("No → miss. Space left, nothing removed.");
  });
});

describe("simulate — FIFO", () => {
  const frames = simulate(fifo, 4, TRACE);

  it("hits and evictions match the reference", () => {
    expect(hitsOf(frames)).toEqual([3, 9]);
    expect(evictionsOf(frames)).toEqual([
      null,
      null,
      null,
      null,
      null,
      "A",
      "B",
      "C",
      "D",
      null,
      "E",
      "A",
    ]);
  });

  it("a hit does not reorder the queue", () => {
    const f = frames[3];
    if (!f) throw new Error("missing frame");
    expect((f.model as LinearModel).items).toEqual(["C", "B", "A"]);
    expect(richText(f.caption)).toBe("A hit — queue doesn't move");
    expect((f.model as LinearModel).defaultAxis).toBe("horizontal");
  });
});

describe("simulate — degenerate sequences", () => {
  it("one repeated key never fills the cache", () => {
    for (const def of [lru, fifo]) {
      const frames = simulate(def, 4, ["A", "A", "A", "A"]);
      expect(hitsOf(frames)).toEqual([1, 2, 3]);
      for (const f of frames) {
        expect((f.model as LinearModel).next).toBeNull();
        expect((f.model as LinearModel).removed).toBeNull();
      }
      expect(frames[3]?.metric).toBe("75%");
    }
  });

  it("an empty trace yields no frames", () => {
    expect(simulate(lru, 4, [])).toEqual([]);
  });
});
