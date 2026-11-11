import { describe, expect, it } from "vitest";
import { dnsCachingModule, runDnsCaching } from "./module";

describe("dns caching module", () => {
  it("has four scenarios with pinned frame counts", () => {
    expect(
      ["happy", "old-ip", "ttl-too-late", "negative"].map(
        (id) => runDnsCaching({ scenario: id }).frames.length,
      ),
    ).toEqual([5, 5, 4, 5]);
  });

  it("uses dns-caching models on every frame", () => {
    const run = runDnsCaching({ scenario: "happy" });
    expect(run.frames.every((f) => f.model.kind === "dns-caching")).toBe(true);
  });

  it("marks bad steps where the draft does", () => {
    const old = runDnsCaching({ scenario: "old-ip" }).frames;
    expect(old.filter((f) => f.outcome === "bad").length).toBeGreaterThan(0);
  });

  it("registers module metadata", () => {
    expect(dnsCachingModule.slug).toBe("inside-dns-caching");
    expect(dnsCachingModule.defaults()).toEqual({ scenario: "happy" });
  });
});
