import { describe, expect, it } from "vitest";
import { kubernetesServiceModule, runKubernetesService } from "./module";

describe("kubernetes service module", () => {
  it("has four scenarios with pinned frame counts", () => {
    expect(
      ["happy", "ready", "shutdown", "grpc"].map(
        (id) => runKubernetesService({ scenario: id }).frames.length,
      ),
    ).toEqual([5, 5, 5, 5]);
  });

  it("uses k8s-service models on every frame", () => {
    const run = runKubernetesService({ scenario: "happy" });
    expect(run.frames.every((f) => f.model.kind === "k8s-service")).toBe(true);
  });

  it("marks bad steps in shutdown race", () => {
    const frames = runKubernetesService({ scenario: "shutdown" }).frames;
    expect(frames.filter((f) => f.outcome === "bad").length).toBeGreaterThan(0);
  });

  it("registers module metadata", () => {
    expect(kubernetesServiceModule.slug).toBe("inside-a-kubernetes-service");
    expect(kubernetesServiceModule.defaults()).toEqual({ scenario: "happy" });
  });
});
