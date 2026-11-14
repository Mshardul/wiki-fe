import { describe, expect, it } from "vitest";
import { applyChange } from "../core/fields";
import { DEFS } from "./defs";
import { HASH_SECTIONS, hashTableModule } from "./module";
import { HASH_IDS } from "./types";

const COUNTS = { chaining: 18, linear: 29, quadratic: 25, double: 27, resize: 70 } as const;

describe("hash table module", () => {
  it("defaults are valid and the field keys are fixed", () => {
    const d = hashTableModule.defaults();
    expect(d.algo).toBe("chaining");
    expect(HASH_SECTIONS.flatMap((s) => s.fields.map((f) => f.key))).toEqual([
      "algo",
      "keys",
      "size",
      "threshold",
      "sequence",
      "seed",
    ]);
    expect(hashTableModule.variants).toEqual({ key: "algo", restartOnSwitch: true });
  });

  for (const algo of HASH_IDS) {
    it(`${algo}: default run goes Start to Done with the hand-checked length`, () => {
      const { frames, metricLabel } = hashTableModule.run({
        ...hashTableModule.defaults(),
        algo,
        sequence: null,
      });
      expect(frames).toHaveLength(COUNTS[algo]);
      expect(frames[0]?.badge).toBe("Start");
      expect(frames[frames.length - 1]?.badge).toBe("Done");
      expect(frames.every((f) => f.vars.length > 0)).toBe(true);
      expect(metricLabel).toBe(DEFS[algo].metricLabel);
    });
  }

  it("the corner metric of the last insert is the probe count or nodes walked", () => {
    const last = (algo: string) => {
      const { frames } = hashTableModule.run({
        ...hashTableModule.defaults(),
        algo,
        sequence: null,
      });
      return frames.filter((f) => f.badge === "Place").pop()?.metric;
    };
    expect(last("chaining")).toBe("3");
    expect(last("linear")).toBe("4");
    expect(last("double")).toBe("4");
  });

  it("the run hands back the effective keys for the field", () => {
    const { sequence } = hashTableModule.run({
      ...hashTableModule.defaults(),
      algo: "quadratic",
      sequence: null,
    });
    expect(sequence).toEqual(["16", "8", "24", "5", "13"]);
  });

  it("switching variant resets the keys so the next variant brings its own", () => {
    const next = applyChange(HASH_SECTIONS, hashTableModule.defaults(), "algo", "quadratic");
    expect(next.sequence).toBeNull();
  });

  it("availability disables the limit outside Resize and the seed while keys are picked", () => {
    const a = hashTableModule.availability?.({ algo: "linear", keys: "picked" });
    expect(a?.threshold?.disabled).toBe(true);
    expect(a?.seed?.disabled).toBe(true);
    const b = hashTableModule.availability?.({ algo: "resize", keys: "random" });
    expect(b?.threshold?.disabled).toBeUndefined();
    expect(b?.seed?.disabled).toBeUndefined();
  });

  it("every variant links the same article", () => {
    const hrefs = new Set(HASH_IDS.map((id) => DEFS[id].articleHref));
    expect(hrefs.size).toBe(1);
  });
});
