import type { VizFrame } from "../core/types";
import { COPY } from "./copy";
import { runBalancer } from "./engine";
import type { LbInput, LbStep, Phase } from "./types";
import { captionOf, labelOf, makeCtx, metricOf, modelOf, varsOf } from "./view";

const PATHS: Record<Phase, number[]> = {
  decide: [0, 1],
  land: [2],
  finish: [3],
  fail: [4],
};

export function balancerFrames(input: LbInput): VizFrame[] {
  const steps = runBalancer(input);
  const ctx = makeCtx(input, steps);
  const lines = COPY[input.policy].lines;
  return steps.map((s: LbStep, index) => {
    const caption = captionOf(ctx, s);
    return {
      index,
      label: labelOf(s),
      outcome: s.outcome,
      badge: s.badge,
      caption,
      lines: lines.map((l) => [l]),
      path: PATHS[s.phase],
      vars: varsOf(ctx, s),
      logNote: caption,
      metric: metricOf(ctx, s),
      model: modelOf(ctx, s),
    };
  });
}
