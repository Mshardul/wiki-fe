import { describe, expect, it } from "vitest";
import { allFields, SEED_MAX } from "../core/fields";
import { encodeState, parseState } from "../core/url-state";
import { CACHING_ARTICLE, evictionModule, POLICIES, toEvictionInput } from "./module";

describe("eviction module", () => {
  it("defaults are valid and seed is random within range", () => {
    const d = evictionModule.defaults();
    expect(d).toMatchObject({
      policy: "lru",
      capacity: 4,
      pattern: "hot",
      length: 12,
      sequence: null,
    });
    expect(typeof d.seed).toBe("number");
    expect(d.seed as number).toBeLessThanOrEqual(SEED_MAX);
  });

  it("every field key maps onto EvictionInput", () => {
    const keys = allFields(evictionModule.sections)
      .map((f) => f.key)
      .sort();
    expect(keys).toEqual(["capacity", "length", "pattern", "policy", "seed", "sequence"]);
  });

  it("runs the selected policy on a custom sequence", () => {
    const r = evictionModule.run({
      ...evictionModule.defaults(),
      policy: "fifo",
      sequence: "ABCADEAFBAGC".split(""),
    });
    expect(r.frames).toHaveLength(12);
    expect(r.sequence.join("")).toBe("ABCADEAFBAGC");
    expect(r.info).toMatchObject({ heading: "Policy", name: "FIFO", chip: "Queue" });
    expect(r.info.articleHref).toBe(`${CACHING_ARTICLE}#fifo--segmented-variants`);
    expect(r.metricLabel).toBe("Hit rate");
  });

  it("generates the trace from pattern, length and seed when no sequence is set", () => {
    const v = { ...evictionModule.defaults(), seed: 0x7f3a, length: 20 };
    expect(evictionModule.run(v).sequence).toEqual(evictionModule.run(v).sequence);
    expect(evictionModule.run(v).frames).toHaveLength(20);
  });

  it("toEvictionInput falls back on bad values", () => {
    expect(
      toEvictionInput({
        policy: "opt",
        capacity: "x",
        pattern: 5,
        length: null,
        seed: Number.NaN,
        sequence: [],
      }),
    ).toEqual({ policy: "lru", capacity: 4, pattern: "hot", length: 12, seed: 0, sequence: null });
  });

  it("toEvictionInput clamps slider and seed ranges", () => {
    expect(
      toEvictionInput({
        policy: "lru",
        capacity: 100,
        pattern: "hot",
        length: 1,
        seed: 0x1_0000,
        sequence: null,
      }),
    ).toEqual({
      policy: "lru",
      capacity: 8,
      pattern: "hot",
      length: 10,
      seed: SEED_MAX,
      sequence: null,
    });
  });

  it("a junk URL still produces a valid run", () => {
    const { values } = parseState(
      "?p=xyz&c=-5&s=zz&q=123&n=999",
      evictionModule.sections,
      evictionModule.defaults(),
    );
    const r = evictionModule.run(values);
    expect(r.frames).toHaveLength(24);
    expect(r.info.name).toBe("LRU");
  });

  it("URL round-trips through the module's own fields", () => {
    const values = {
      policy: "clock",
      capacity: 5,
      pattern: "loop",
      length: 12,
      seed: 42,
      sequence: null,
    };
    const search = encodeState(evictionModule.sections, values, { frame: 2, rotated: false });
    expect(parseState(search, evictionModule.sections, evictionModule.defaults()).values).toEqual(
      values,
    );
  });

  it("exposes all four v1 policies in display order", () => {
    expect(Object.keys(POLICIES)).toEqual(["lru", "fifo", "lfu", "clock"]);
  });
});
