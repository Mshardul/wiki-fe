import { describe, expect, it } from "vitest";
import { connectionCostModule, runConnectionCost } from "./module";

describe("connection cost module", () => {
  it("has four scenarios with pinned frame counts", () => {
    expect(
      ["happy", "round-trips", "time-wait", "resumption"].map(
        (id) => runConnectionCost({ scenario: id }).frames.length,
      ),
    ).toEqual([5, 5, 5, 5]);
  });

  it("uses conn-ladder models on every frame", () => {
    const run = runConnectionCost({ scenario: "happy" });
    expect(run.frames.every((f) => f.model.kind === "conn-ladder")).toBe(true);
  });

  it("switches to ports view for time-wait", () => {
    const frames = runConnectionCost({ scenario: "time-wait" }).frames;
    expect(frames.every((f) => f.model.kind === "conn-ladder" && f.model.view === "ports")).toBe(
      true,
    );
  });

  it("registers module metadata", () => {
    expect(connectionCostModule.slug).toBe("cost-of-a-new-connection");
    expect(connectionCostModule.defaults()).toEqual({ scenario: "happy" });
  });
});
