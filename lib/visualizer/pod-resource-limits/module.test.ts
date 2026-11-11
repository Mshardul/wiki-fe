import { describe, expect, it } from "vitest";
import { podLimitsFrames, podResourceLimitsModule, runPodResourceLimits } from "./module";
import { POD_LIMITS_SCENARIOS } from "./scenarios";

describe("pod resource limits module", () => {
  it("has four scenarios with pinned frame counts", () => {
    expect(
      ["happy", "oom", "cpu", "evict"].map(
        (id) => runPodResourceLimits({ scenario: id }).frames.length,
      ),
    ).toEqual([4, 4, 4, 5]);
  });

  it("uses resource-gauges models on every frame", () => {
    const run = runPodResourceLimits({ scenario: "happy" });
    expect(run.frames.every((f) => f.model.kind === "resource-gauges")).toBe(true);
  });

  it("embeds CPU timeline only in the cpu scenario", () => {
    const cpu = podLimitsFrames(POD_LIMITS_SCENARIOS.find((s) => s.id === "cpu")!);
    expect(cpu.every((f) => f.model.kind === "resource-gauges" && f.model.timeline)).toBe(true);
    const happy = podLimitsFrames(POD_LIMITS_SCENARIOS.find((s) => s.id === "happy")!);
    expect(happy.every((f) => f.model.kind === "resource-gauges" && !f.model.timeline)).toBe(true);
  });

  it("marks bad steps in oom and evict", () => {
    const oom = runPodResourceLimits({ scenario: "oom" }).frames;
    expect(oom.filter((f) => f.outcome === "bad").length).toBeGreaterThan(0);
    const evict = runPodResourceLimits({ scenario: "evict" }).frames;
    expect(evict.filter((f) => f.outcome === "bad").length).toBeGreaterThan(0);
  });

  it("registers module metadata", () => {
    expect(podResourceLimitsModule.slug).toBe("inside-pod-resource-limits");
    expect(podResourceLimitsModule.defaults()).toEqual({ scenario: "happy" });
  });
});
