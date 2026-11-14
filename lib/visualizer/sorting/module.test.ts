import { describe, expect, it } from "vitest";
import { allFields, type InputValues, SEED_MAX } from "../core/fields";
import { encodeState, parseState } from "../core/url-state";
import { sortingModule } from "./module";
import { SORT_IDS } from "./types";

describe("sorting module", () => {
  it("defaults are valid", () => {
    const d = sortingModule.defaults();
    expect(d).toMatchObject({ algo: "insertion", preset: "random", size: 6, stable: "off" });
    expect(d.sequence).toEqual(["5", "2", "4", "6", "1", "3"]);
    expect(d.seed as number).toBeLessThanOrEqual(SEED_MAX);
  });

  it("field keys map onto SortInput", () => {
    const keys = allFields(sortingModule.sections).map((f) => f.key);
    expect(keys).toEqual(["algo", "preset", "size", "stable", "sequence", "seed"]);
  });

  it("restarts on a variant switch", () => {
    expect(sortingModule.variants).toEqual({ key: "algo", restartOnSwitch: true });
  });

  it("runs every algorithm to Start … Done with counters in vars", () => {
    for (const algo of SORT_IDS) {
      const r = sortingModule.run({ ...sortingModule.defaults(), algo });
      expect(r.frames[0]?.badge).toBe("Start");
      expect(r.frames[r.frames.length - 1]?.badge).toBe("Done");
      for (const f of r.frames) {
        expect(f.vars.map((v) => v.name)).toContain("comparisons");
        expect(f.metric).not.toBe("");
      }
    }
  });

  it("falls back to the preset when the sequence is junk", () => {
    const r = sortingModule.run({ ...sortingModule.defaults(), sequence: ["x"], size: 5, seed: 3 });
    expect(r.sequence).toHaveLength(5);
  });

  it("points Read article at the matching article", () => {
    const hrefs = Object.fromEntries(
      SORT_IDS.map((algo) => [
        algo,
        sortingModule.run({ ...sortingModule.defaults(), algo }).info.articleHref,
      ]),
    );
    expect(hrefs.quick).toBe("/dsa/algorithms/quicksort/");
    expect(hrefs.merge).toBe("/dsa/algorithms/merge-sort/");
    expect(hrefs.radix).toBe("/dsa/algorithms/radix-sort/");
    expect(hrefs.heap).toBe("/dsa/algorithms/heapsort/");
  });

  it("round-trips through the URL", () => {
    const d: InputValues = { ...sortingModule.defaults(), algo: "merge", stable: "on", seed: 7 };
    const search = encodeState(sortingModule.sections, d, { frame: 3, rotated: false });
    const back = parseState(search, sortingModule.sections, sortingModule.defaults());
    expect(back.values).toMatchObject({ algo: "merge", stable: "on", seed: 7 });
    expect(back.values.sequence).toEqual(d.sequence);
    expect(back.view.frame).toBe(3);
  });
});
