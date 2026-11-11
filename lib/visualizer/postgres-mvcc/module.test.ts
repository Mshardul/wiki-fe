import { describe, expect, it } from "vitest";
import { postgresMvccModule, runPostgresMvcc } from "./module";

describe("postgres mvcc module", () => {
  it("has four scenarios with expected step counts", () => {
    expect(
      ["happy", "horizon", "hot", "wrap"].map(
        (id) => runPostgresMvcc({ scenario: id }).frames.length,
      ),
    ).toEqual([4, 5, 5, 5]);
  });

  it("uses mvcc models on every frame", () => {
    const run = runPostgresMvcc({ scenario: "happy" });
    expect(run.frames.every((f) => f.model.kind === "mvcc")).toBe(true);
    const first = run.frames[0]?.model;
    if (first?.kind === "mvcc") {
      expect(first.view).toBe("page");
      expect(first.tuples?.[0]?.state).toBe("live");
    }
  });

  it("registers module metadata", () => {
    expect(postgresMvccModule.slug).toBe("inside-postgres-mvcc");
    expect(postgresMvccModule.defaults()).toEqual({ scenario: "happy" });
  });
});
