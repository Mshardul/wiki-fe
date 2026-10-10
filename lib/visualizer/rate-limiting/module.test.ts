import { describe, expect, it } from "vitest";
import { allFields, applyChange, type InputValues, SEED_MAX } from "../core/fields";
import { encodeState, parseState } from "../core/url-state";
import { ALGORITHM_META, RATE_LIMITING_ARTICLE } from "./copy";
import { RATE_LIMITING_SECTIONS, rateLimitingModule, toRateInput } from "./module";
import { ALGORITHM_IDS, WORKLOADS } from "./types";

const defaults = () => rateLimitingModule.defaults();

describe("rate-limiting module", () => {
  it("defaults are the hand-picked stream on the fixed window", () => {
    const d = defaults();
    expect(d).toMatchObject({
      algorithm: "fixed-window",
      limit: 3,
      pace: "2",
      workload: "straddle",
      sequence: ["4", "5", "5", "6", "6", "7", "7", "11"],
    });
    expect(typeof d.seed).toBe("number");
    expect(d.seed as number).toBeLessThanOrEqual(SEED_MAX);
  });

  it("declares algorithm as the variants field, in increasing difficulty", () => {
    expect(rateLimitingModule.variants).toEqual({ key: "algorithm", restartOnSwitch: true });
    const field = allFields(RATE_LIMITING_SECTIONS).find((f) => f.key === "algorithm");
    expect(field?.kind === "chips" && field.options.map((o) => o.value)).toEqual([
      ...ALGORITHM_IDS,
    ]);
    expect(field?.kind === "chips" && field.options.map((o) => o.label)).toEqual([
      "Fixed window",
      "Sliding log",
      "Sliding counter",
      "Token bucket",
      "Leaky bucket",
    ]);
  });

  it("has exactly the fields the spec lists", () => {
    expect(
      allFields(RATE_LIMITING_SECTIONS)
        .map((f) => f.key)
        .sort(),
    ).toEqual(["algorithm", "limit", "pace", "seed", "sequence", "workload"]);
    const pace = allFields(RATE_LIMITING_SECTIONS).find((f) => f.key === "pace");
    expect(pace?.kind === "chips" && pace.options).toEqual([
      { value: "1", label: "1 per tick" },
      { value: "2", label: "1 per 2 ticks" },
    ]);
    const workload = allFields(RATE_LIMITING_SECTIONS).find((f) => f.key === "workload");
    expect(workload?.kind === "chips" && workload.options.map((o) => o.value)).toEqual([
      ...WORKLOADS,
    ]);
  });

  it("has no Requests slider", () => {
    expect(allFields(RATE_LIMITING_SECTIONS).some((f) => f.key === "length")).toBe(false);
  });

  it("runs the default stream and labels the metric with the derived window", () => {
    const r = rateLimitingModule.run(defaults());
    expect(r.frames).toHaveLength(8);
    expect(r.sequence).toEqual(["4", "5", "5", "6", "6", "7", "7", "11"]);
    expect(r.metricLabel).toBe("Peak in any 6 ticks");
    expect(r.frames.at(-1)?.metric).toBe("6");
    expect(r.info).toMatchObject({ heading: "Algorithm", name: "Fixed window", chip: "Timeline" });
    expect(r.info.articleHref).toBe(`${RATE_LIMITING_ARTICLE}#fixed-window-counter`);
  });

  it("each algorithm links to its own heading and the leaky bucket labels its metric as output", () => {
    for (const id of ALGORITHM_IDS) {
      const r = rateLimitingModule.run({ ...defaults(), algorithm: id });
      expect(r.info.articleHref, id).toBe(`${RATE_LIMITING_ARTICLE}#${ALGORITHM_META[id].anchor}`);
      expect(r.metricLabel, id).toBe(
        id === "leaky-bucket" ? "Peak out in any 6 ticks" : "Peak in any 6 ticks",
      );
    }
  });

  it("the window follows Limit and Pace", () => {
    const r = rateLimitingModule.run({ ...defaults(), limit: 4, pace: "1" });
    expect(r.metricLabel).toBe("Peak in any 4 ticks");
  });

  it("one sequence runs through every algorithm with the same frame count", () => {
    const sequence = ["0", "3", "3", "9", "12"];
    for (const algorithm of ALGORITHM_IDS) {
      const r = rateLimitingModule.run({ ...defaults(), algorithm, sequence });
      expect(r.frames, algorithm).toHaveLength(5);
      expect(r.sequence).toEqual(sequence);
    }
  });

  it("generates a stream from the workload and seed when none is set", () => {
    const v = { ...defaults(), sequence: null, workload: "burst", seed: 0x7f3a };
    expect(rateLimitingModule.run(v).sequence).toEqual(rateLimitingModule.run(v).sequence);
    expect(rateLimitingModule.run(v).frames).toHaveLength(6);
  });

  it("falls back to a generated stream when the given one is invalid", () => {
    const r = rateLimitingModule.run({
      ...defaults(),
      sequence: ["x"],
      workload: "steady",
      seed: 1,
    });
    expect(r.frames).toHaveLength(6);
  });

  it("toRateInput falls back on bad values", () => {
    expect(
      toRateInput({
        algorithm: "nope",
        limit: 99,
        pace: "9",
        workload: "x",
        seed: -4,
        sequence: ["20"],
      }),
    ).toEqual({
      algorithm: "fixed-window",
      limit: 5,
      pace: 2,
      workload: "straddle",
      seed: 0,
      ticks: null,
    });
  });

  it("changing Limit, Pace, workload or seed regenerates the stream; changing the algorithm keeps it", () => {
    const v = defaults();
    for (const [key, value] of [
      ["limit", 4],
      ["pace", "1"],
      ["workload", "steady"],
      ["seed", 5],
    ] as const) {
      expect(applyChange(RATE_LIMITING_SECTIONS, v, key, value).sequence, key).toBeNull();
    }
    expect(applyChange(RATE_LIMITING_SECTIONS, v, "algorithm", "token-bucket").sequence).toEqual(
      v.sequence,
    );
  });

  it("a regenerated stream is valid for the new Limit and Pace", () => {
    for (const [limit, pace] of [
      [5, "2"],
      [2, "1"],
      [4, "2"],
    ] as const) {
      const v = applyChange(
        RATE_LIMITING_SECTIONS,
        applyChange(RATE_LIMITING_SECTIONS, defaults(), "limit", limit),
        "pace",
        pace,
      );
      const r = rateLimitingModule.run({ ...v, workload: "straddle" });
      expect(r.frames.length).toBeGreaterThan(0);
    }
  });
});

describe("availability", () => {
  const hints = (v: InputValues) =>
    rateLimitingModule.availability?.({ ...defaults(), ...v }) ?? {};

  it("says what Limit means", () => {
    expect(hints({}).limit?.hint).toBe("Max per window · bucket size for the buckets");
  });

  it("states the shared rate and window for the current Limit and Pace", () => {
    expect(hints({}).pace?.hint).toBe(
      "1 request per 2 ticks = 3 per 6 ticks, the same average rate for every algorithm",
    );
    expect(hints({ limit: 4, pace: "1" }).pace?.hint).toBe(
      "1 request per tick = 4 per 4 ticks, the same average rate for every algorithm",
    );
  });

  it("never dims a field: every input applies to every algorithm", () => {
    for (const f of Object.values(hints({}))) expect(f.disabled).toBeFalsy();
  });
});

describe("url state", () => {
  it("round-trips a multi-digit tick sequence with an underscore separator", () => {
    const values = { ...defaults(), seed: 0x1234, sequence: ["4", "5", "11", "19"] };
    const search = encodeState(RATE_LIMITING_SECTIONS, values, { frame: 2, rotated: false });
    expect(search).toContain("q=4_5_11_19");
    const back = parseState(search, RATE_LIMITING_SECTIONS, defaults());
    expect(back.values.sequence).toEqual(["4", "5", "11", "19"]);
    expect(back.values.seed).toBe(0x1234);
    expect(back.view.frame).toBe(2);
  });

  it("a junk sequence in the URL falls back to a generated one instead of throwing", () => {
    expect(parseState("?q=abc", RATE_LIMITING_SECTIONS, defaults()).values.sequence).toBeNull();
    expect(parseState("?q=2.5", RATE_LIMITING_SECTIONS, defaults()).values.sequence).toBeNull();
  });
});
