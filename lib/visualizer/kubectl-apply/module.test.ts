import { describe, expect, it } from "vitest";
import { kubectlApplyModule, kubectlFrames, runKubectlApply } from "./module";
import { KUBECTL_SCENARIOS } from "./scenarios";

describe("kubectl apply module", () => {
  it("has four scenarios with pinned frame counts", () => {
    expect(
      ["happy", "pending", "heal", "rollout"].map(
        (id) => runKubectlApply({ scenario: id }).frames.length,
      ),
    ).toEqual([6, 5, 5, 5]);
  });

  it("marks bad frames in pending scheduling", () => {
    const frames = runKubectlApply({ scenario: "pending" }).frames;
    expect(frames.some((f) => f.outcome === "bad")).toBe(true);
  });

  it("uses k8s-hub models on every frame", () => {
    const run = runKubectlApply({ scenario: "happy" });
    expect(run.frames.every((f) => f.model.kind === "k8s-hub")).toBe(true);
    expect(kubectlFrames(KUBECTL_SCENARIOS[0]!).length).toBe(6);
  });

  it("registers module metadata", () => {
    expect(kubectlApplyModule.slug).toBe("inside-kubectl-apply");
    expect(kubectlApplyModule.defaults()).toEqual({ scenario: "happy" });
  });
});
