import { describe, expect, it } from "vitest";
import { celeryPrefetchModule, runCeleryPrefetch } from "./module";

describe("celery prefetch module", () => {
  it("has four scenarios with pinned frame counts", () => {
    expect(
      ["happy", "prefetch", "acks", "visibility"].map(
        (id) => runCeleryPrefetch({ scenario: id }).frames.length,
      ),
    ).toEqual([4, 5, 5, 5]);
  });

  it("uses celery-board models on every frame", () => {
    const run = runCeleryPrefetch({ scenario: "happy" });
    expect(run.frames.every((f) => f.model.kind === "celery-board")).toBe(true);
  });

  it("marks bad steps in failure scenarios", () => {
    expect(
      runCeleryPrefetch({ scenario: "prefetch" }).frames.filter((f) => f.outcome === "bad").length,
    ).toBeGreaterThan(0);
    expect(
      runCeleryPrefetch({ scenario: "acks" }).frames.filter((f) => f.outcome === "bad").length,
    ).toBeGreaterThan(0);
  });

  it("registers module metadata", () => {
    expect(celeryPrefetchModule.slug).toBe("inside-celery-prefetch");
    expect(celeryPrefetchModule.defaults()).toEqual({ scenario: "happy" });
  });
});
