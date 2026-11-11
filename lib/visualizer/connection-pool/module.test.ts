import { describe, expect, it } from "vitest";
import { connectionPoolModule, runConnectionPool } from "./module";

describe("connection pool module", () => {
  it("has four scenarios with pinned frame counts", () => {
    expect(
      ["happy", "lb-forgets", "server-closes", "pool-exhausted"].map(
        (id) => runConnectionPool({ scenario: id }).frames.length,
      ),
    ).toEqual([4, 6, 5, 5]);
  });

  it("uses connection-pool models on every frame", () => {
    const run = runConnectionPool({ scenario: "happy" });
    expect(run.frames.every((f) => f.model.kind === "connection-pool")).toBe(true);
  });

  it("uses fleet view for server-closes light-traffic step", () => {
    const frames = runConnectionPool({ scenario: "server-closes" }).frames;
    const fleet = frames.find((f) => f.label === "Why light traffic");
    expect(fleet?.model.kind).toBe("connection-pool");
    if (fleet?.model.kind === "connection-pool") {
      expect(fleet.model.view).toBe("fleet");
    }
  });

  it("marks bad steps in lb-forgets and pool-exhausted", () => {
    expect(
      runConnectionPool({ scenario: "lb-forgets" }).frames.filter((f) => f.outcome === "bad")
        .length,
    ).toBeGreaterThan(0);
    expect(
      runConnectionPool({ scenario: "pool-exhausted" }).frames.filter((f) => f.outcome === "bad")
        .length,
    ).toBeGreaterThan(0);
  });

  it("registers module metadata", () => {
    expect(connectionPoolModule.slug).toBe("inside-a-connection-pool");
    expect(connectionPoolModule.defaults()).toEqual({ scenario: "happy" });
  });
});
