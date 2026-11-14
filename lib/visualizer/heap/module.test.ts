import { describe, expect, it } from "vitest";
import { allFields, type InputValues } from "../core/fields";
import { encodeState, parseState } from "../core/url-state";
import { heapModule } from "./module";
import { HEAP_IDS } from "./types";

describe("heap module", () => {
  it("defaults are valid", () => {
    const d = heapModule.defaults();
    expect(d).toMatchObject({ op: "insert", order: "min", k: 3 });
    expect(d.sequence).toEqual(["5", "3", "8", "1", "4", "7"]);
  });

  it("field keys", () => {
    expect(allFields(heapModule.sections).map((f) => f.key)).toEqual([
      "op",
      "order",
      "k",
      "sequence",
    ]);
  });

  it("restarts on a variant switch", () => {
    expect(heapModule.variants).toEqual({ key: "op", restartOnSwitch: true });
  });

  it("runs every variant from Start to Done with the counters in vars and the main one as the corner metric", () => {
    for (const op of HEAP_IDS) {
      const r = heapModule.run({ ...heapModule.defaults(), op });
      expect(r.frames[0]?.badge).toBe("Start");
      expect(r.frames[r.frames.length - 1]?.badge).toBe("Done");
      for (const f of r.frames) {
        expect(f.vars.map((v) => v.name)).toContain(op === "topk" ? "evictions" : "swaps");
        expect(f.vars.map((v) => v.name)).toContain("comparisons");
        expect(f.metric).not.toBe("");
      }
    }
  });

  it("build frames carry the one-by-one counters on every frame", () => {
    const r = heapModule.run({ ...heapModule.defaults(), op: "build" });
    for (const f of r.frames) {
      const names = f.vars.map((v) => v.name);
      expect(names).toContain("one by one: comparisons");
      expect(names).toContain("one by one: swaps");
    }
  });

  it("points Read article at the matching article", () => {
    const href = (op: string) => heapModule.run({ ...heapModule.defaults(), op }).info.articleHref;
    expect(href("insert")).toBe("/dsa/data-structures/heap/");
    expect(href("heapsort")).toBe("/dsa/algorithms/heapsort/");
  });

  it("round-trips through the URL", () => {
    const d: InputValues = { ...heapModule.defaults(), op: "topk", order: "max", k: 4 };
    const search = encodeState(heapModule.sections, d, { frame: 3, rotated: false });
    const back = parseState(search, heapModule.sections, heapModule.defaults());
    expect(back.values).toMatchObject({ op: "topk", order: "max", k: 4 });
    expect(back.values.sequence).toEqual(d.sequence);
    expect(back.view.frame).toBe(3);
  });
});
