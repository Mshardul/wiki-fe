import { describe, expect, it } from "vitest";
import { postgresBtreeModule, runPostgresBtree } from "./module";

describe("postgres btree module", () => {
  it("has four scenarios", () => {
    expect(
      ["happy", "prefix", "expr", "ios"].map(
        (id) => runPostgresBtree({ scenario: id }).frames.length,
      ),
    ).toEqual([4, 5, 5, 5]);
  });

  it("renders btree models with plan badge on the shape", () => {
    const run = runPostgresBtree({ scenario: "happy" });
    const m = run.frames[3]?.model;
    expect(m?.kind).toBe("btree");
    if (m?.kind === "btree") {
      expect(m.plan).toBe("Index Scan");
      expect(m.links?.length).toBe(3);
    }
  });

  it("registers module metadata", () => {
    expect(postgresBtreeModule.slug).toBe("inside-a-b-tree-index");
    expect(postgresBtreeModule.defaults()).toEqual({ scenario: "happy" });
  });
});
