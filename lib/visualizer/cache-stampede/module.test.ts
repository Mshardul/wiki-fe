import { describe, expect, it } from "vitest";
import { cacheStampedeModule, runCacheStampede } from "./module";

describe("cache stampede module", () => {
  it("has three scenarios with pinned frame counts", () => {
    expect(
      ["happy", "hot-key", "sync-expiry"].map(
        (id) => runCacheStampede({ scenario: id }).frames.length,
      ),
    ).toEqual([3, 7, 5]);
  });

  it("uses cache-stampede models on every frame", () => {
    const run = runCacheStampede({ scenario: "happy" });
    expect(run.frames.every((f) => f.model.kind === "cache-stampede")).toBe(true);
  });

  it("marks bad steps in hot-key and sync-expiry", () => {
    expect(
      runCacheStampede({ scenario: "hot-key" }).frames.filter((f) => f.outcome === "bad").length,
    ).toBeGreaterThan(0);
    expect(
      runCacheStampede({ scenario: "sync-expiry" }).frames.filter((f) => f.outcome === "bad")
        .length,
    ).toBeGreaterThan(0);
  });

  it("registers module metadata", () => {
    expect(cacheStampedeModule.slug).toBe("inside-a-cache-stampede");
    expect(cacheStampedeModule.defaults()).toEqual({ scenario: "happy" });
  });
});
