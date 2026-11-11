import { describe, expect, it } from "vitest";
import { runDnsCaching } from "../dns-caching/module";
import { runKubectlApply } from "../kubectl-apply/module";
import { swatchesInFrame } from "./presentation-swatches";

describe("swatchesInFrame", () => {
  it("kubectl happy first step exposes ready swatch only among pod states", () => {
    const f = runKubectlApply({ scenario: "happy" }).frames.at(-1)!;
    const drawn = swatchesInFrame(f);
    expect(drawn.has("k8s-ready")).toBe(true);
    expect(drawn.has("k8s-creating")).toBe(false);
  });

  it("dns happy first step includes dns-ok when authoritative answers", () => {
    const f = runDnsCaching({ scenario: "happy" }).frames[0]!;
    expect(swatchesInFrame(f).has("dns-ok")).toBe(true);
  });
});
