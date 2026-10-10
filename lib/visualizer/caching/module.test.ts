import { describe, expect, it } from "vitest";
import { allFields, SEED_MAX } from "../core/fields";
import { encodeState, parseState } from "../core/url-state";
import { CACHING_ARTICLE } from "../eviction/module";
import { CACHING_SECTIONS, cachingModule, toCachingInput } from "./module";
import { STRATEGY_IDS, type StrategyId, WORKLOADS } from "./types";

const defaults = (): ReturnType<typeof cachingModule.defaults> => cachingModule.defaults();

describe("caching module", () => {
  it("defaults are valid and the seed is random within range", () => {
    const d = defaults();
    expect(d).toMatchObject({
      strategy: "cache-aside",
      keys: 1,
      length: 6,
      lifetime: 5,
      flushEvery: 3,
      workload: "mixed",
      sequence: ["RA", "RA", "WA", "WA", "RA", "!"],
    });
    expect(typeof d.seed).toBe("number");
    expect(d.seed as number).toBeLessThanOrEqual(SEED_MAX);
  });

  it("every field key maps onto CachingInput and every strategy and workload has a chip", () => {
    const fields = allFields(CACHING_SECTIONS);
    expect(fields.map((f) => f.key).sort()).toEqual([
      "flushEvery",
      "keys",
      "length",
      "lifetime",
      "seed",
      "sequence",
      "strategy",
      "workload",
    ]);
    const chips = (key: string): string[] => {
      const f = fields.find((x) => x.key === key);
      return f?.kind === "chips" ? f.options.map((o) => o.value) : [];
    };
    expect(chips("strategy")).toEqual([...STRATEGY_IDS]);
    expect(chips("workload")).toEqual([...WORKLOADS]);
  });

  it("runs the selected strategy on a custom sequence", () => {
    const r = cachingModule.run({
      ...defaults(),
      strategy: "write-behind",
      sequence: ["WA", "WA", "WA", "!"],
      flushEvery: 3,
    });
    expect(r.frames).toHaveLength(4);
    expect(r.sequence).toEqual(["WA", "WA", "WA", "!"]);
    expect(r.metricLabel).toBe("Lost writes");
    expect(r.info).toMatchObject({ heading: "Strategy", name: "Write-behind", chip: "Lanes" });
    expect(r.info.articleHref).toBe(`${CACHING_ARTICLE}#write-behind-write-back`);
    expect(r.frames[2]?.vars.find((v) => v.name === "DB writes")?.value).toBe("1");
  });

  it("write-around links to its own article heading", () => {
    const r = cachingModule.run({ ...defaults(), strategy: "write-around", sequence: ["RA"] });
    expect(r.info.articleHref).toBe(`${CACHING_ARTICLE}#write-around`);
    expect(r.metricLabel).toBe("Stale reads");
  });

  it("generates the sequence from workload, length, keys and seed when none is set", () => {
    const v = { ...defaults(), seed: 0x7f3a, length: 10, sequence: null };
    expect(cachingModule.run(v).sequence).toEqual(cachingModule.run(v).sequence);
    expect(cachingModule.run(v).frames).toHaveLength(10);
  });

  it("falls back to a generated sequence when the given one is empty or invalid", () => {
    expect(cachingModule.run({ ...defaults(), sequence: [] }).frames).toHaveLength(6);
    expect(cachingModule.run({ ...defaults(), sequence: ["ZZ"] }).frames).toHaveLength(6);
  });

  it("toCachingInput falls back on bad values", () => {
    expect(
      toCachingInput({
        strategy: "opt",
        keys: 99,
        length: 0,
        lifetime: "x",
        flushEvery: null,
        workload: "nope",
        seed: -5,
        sequence: ["ZZ"],
      }),
    ).toEqual({
      strategy: "cache-aside",
      keys: 3,
      length: 4,
      lifetime: 5,
      flushEvery: 3,
      workload: "mixed",
      seed: 0,
      sequence: null,
    });
  });

  it("one sequence runs through every strategy with the same frame count and sequence", () => {
    const sequence = ["RA", "WB", "XC", "!", "RA", "XA"];
    const runs = STRATEGY_IDS.map((strategy) =>
      cachingModule.run({ ...defaults(), strategy, sequence }),
    );
    for (const r of runs) {
      expect(r.frames).toHaveLength(6);
      expect(r.sequence).toEqual(sequence);
    }
  });
});

describe("default sequence", () => {
  const expected: Record<StrategyId, { badges: string[]; metrics: string[] }> = {
    "cache-aside": {
      badges: ["MISS", "HIT", "WRITE", "WRITE", "MISS", "CRASH"],
      metrics: ["0", "0", "0", "0", "0", "0"],
    },
    "read-through": {
      badges: ["MISS", "HIT", "WRITE", "WRITE", "STALE HIT", "CRASH"],
      metrics: ["0", "0", "0", "0", "1", "1"],
    },
    "write-through": {
      badges: ["MISS", "HIT", "WRITE", "WRITE", "HIT", "CRASH"],
      metrics: ["0", "0", "0", "0", "0", "0"],
    },
    "write-behind": {
      badges: ["MISS", "HIT", "WRITE", "WRITE", "HIT", "CRASH"],
      metrics: ["0", "0", "0", "0", "0", "1"],
    },
    "write-around": {
      badges: ["MISS", "HIT", "WRITE", "WRITE", "STALE HIT", "CRASH"],
      metrics: ["0", "0", "0", "0", "1", "1"],
    },
    "refresh-ahead": {
      badges: ["MISS", "HIT", "WRITE", "WRITE", "STALE HIT", "CRASH"],
      metrics: ["0", "0", "0", "0", "1", "1"],
    },
  };

  it("shows each strategy's defining behaviour in six requests", () => {
    for (const strategy of STRATEGY_IDS) {
      const r = cachingModule.run({ ...defaults(), strategy });
      expect(
        r.frames.map((f) => f.badge),
        strategy,
      ).toEqual(expected[strategy].badges);
      expect(
        r.frames.map((f) => f.metric),
        strategy,
      ).toEqual(expected[strategy].metrics);
    }
  });

  it("only write-behind loses data to the crash; the others survive it", () => {
    for (const strategy of STRATEGY_IDS) {
      const crash = cachingModule.run({ ...defaults(), strategy }).frames[5];
      expect(crash?.outcome, strategy).toBe(strategy === "write-behind" ? "bad" : "good");
    }
  });

  it("refresh-ahead refreshes on the late read, and write-behind flushes on the first write", () => {
    const refresh = cachingModule.run({ ...defaults(), strategy: "refresh-ahead" }).frames[4];
    expect(refresh?.model.kind === "lanes" && refresh.model.hops.length).toBe(4);
    const behind = cachingModule.run({ ...defaults(), strategy: "write-behind" }).frames[2];
    expect(behind?.model.kind === "lanes" && behind.model.hops.length).toBe(4);
  });
});

describe("availability", () => {
  const availability = (strategy: string) =>
    cachingModule.availability?.({ ...defaults(), strategy }) ?? {};

  it("dims both time sliders for cache-aside and write-through", () => {
    for (const s of ["cache-aside", "write-through"]) {
      expect(availability(s).lifetime?.disabled).toBe(true);
      expect(availability(s).flushEvery?.disabled).toBe(true);
    }
  });

  it("enables lifetime for read-through, write-around and refresh-ahead only", () => {
    for (const s of ["read-through", "write-around", "refresh-ahead"]) {
      expect(availability(s).lifetime?.disabled).toBeFalsy();
      expect(availability(s).flushEvery?.disabled).toBe(true);
    }
    expect(availability("write-behind").flushEvery?.disabled).toBeFalsy();
    expect(availability("write-behind").lifetime?.disabled).toBe(true);
  });

  it("explains why a slider is dimmed", () => {
    expect(availability("cache-aside").flushEvery?.hint).toBe("Used by write-behind.");
  });
});

describe("url state", () => {
  it("round-trips a token sequence", () => {
    const values = { ...defaults(), seed: 0x1234, sequence: ["RA", "WB", "XC", "!"] };
    const search = encodeState(CACHING_SECTIONS, values, { frame: 2, rotated: false });
    const back = parseState(search, CACHING_SECTIONS, defaults());
    expect(back.values.sequence).toEqual(["RA", "WB", "XC", "!"]);
    expect(back.values.seed).toBe(0x1234);
    expect(back.view.frame).toBe(2);
  });

  it("a junk sequence in the URL falls back to the default instead of throwing", () => {
    const back = parseState("?q=RA!!XZ", CACHING_SECTIONS, defaults());
    expect(back.values.sequence).toBeNull();
  });
});

describe("variants", () => {
  it("declares strategy as the variants field", () => {
    expect(cachingModule.variants).toEqual({ key: "strategy" });
  });
});
