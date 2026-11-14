import { describe, expect, it } from "vitest";
import { PICKED, parseKeys, randomKeys, toHashInput, tokensToOps } from "./input";

describe("hash table input", () => {
  it("parses insert, delete and lookup tokens", () => {
    expect(parseKeys("16 8 -8 ?24")).toEqual({ ok: true, tokens: ["16", "8", "-8", "?24"] });
    expect(parseKeys("0")).toEqual({ ok: true, tokens: ["0"] });
  });

  it("rejects junk, three digits, a lone sign and nothing", () => {
    for (const bad of ["x", "100", "-", "1 x", ""]) expect(parseKeys(bad).ok).toBe(false);
  });

  it("cuts to 12 tokens", () => {
    const r = parseKeys("1 2 3 4 5 6 7 8 9 10 11 12 13 14");
    expect(r.ok && r.tokens).toHaveLength(12);
  });

  it("maps tokens to ops", () => {
    expect(tokensToOps(["16", "-8", "?24", "0"])).toEqual([
      { kind: "insert", key: 16 },
      { kind: "delete", key: 8 },
      { kind: "lookup", key: 24 },
      { kind: "insert", key: 0 },
    ]);
  });

  it("falls back on junk fields", () => {
    const i = toHashInput({ algo: "nope", size: 1, threshold: "7", sequence: ["x"] });
    expect(i.algo).toBe("chaining");
    expect(i.size).toBe(4);
    expect(i.threshold).toBe(0.75);
    expect(i.tokens).toEqual(PICKED.chaining);
    expect(toHashInput({ size: 99 }).size).toBe(12);
    expect(toHashInput({ size: "x" }).size).toBe(8);
  });

  it("keeps a valid sequence and drops bad tokens", () => {
    const i = toHashInput({ algo: "linear", sequence: ["0", "x", "-3", "100"] });
    expect(i.tokens).toEqual(["0", "-3"]);
    expect(i.ops).toEqual([
      { kind: "insert", key: 0 },
      { kind: "delete", key: 3 },
    ]);
  });

  it("uses the variant's own picked keys, or random keys from the seed", () => {
    expect(toHashInput({ algo: "quadratic" }).tokens).toEqual(PICKED.quadratic);
    const a = toHashInput({ algo: "resize", keys: "random", seed: 7 }).tokens;
    expect(a).toEqual(toHashInput({ algo: "resize", keys: "random", seed: 7 }).tokens);
    expect(a).toHaveLength(PICKED.resize.length);
    expect(new Set(a).size).toBe(a.length);
    expect(a.every((k) => Number(k) >= 1 && Number(k) <= 99)).toBe(true);
    expect(randomKeys(1, 5)).not.toEqual(randomKeys(2, 5));
  });

  it("reads the load limit from the three chips", () => {
    expect(toHashInput({ threshold: "0.9" }).threshold).toBe(0.9);
    expect(toHashInput({ threshold: "0.5" }).threshold).toBe(0.5);
  });
});
