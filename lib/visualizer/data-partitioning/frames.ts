import type { VizFrame } from "../core/types";
import { COPY } from "./copy";
import { runPartition } from "./engine";
import type { PartEvent, PartitionInput } from "./types";
import { captionOf, labelOf, makeCtx, metricOf, modelOf, varsOf } from "./view";

// Which step lines light up for each kind of step, per scheme.
const PATHS: Record<PartitionInput["scheme"], Record<PartEvent["phase"], number[]>> = {
  "mod-n": { place: [0, 1], recheck: [0, 1], event: [2] },
  range: { place: [0, 1], recheck: [0, 1], event: [2] },
  ring: { place: [0, 1, 2], recheck: [0, 1, 2], event: [3] },
  directory: { place: [1], recheck: [0], event: [2] },
  rendezvous: { place: [0, 1], recheck: [0, 1], event: [2] },
};

const badgeOf = (s: PartEvent): string => s.badge;

export function partitionFrames(input: PartitionInput): VizFrame[] {
  const steps = runPartition(input);
  const ctx = makeCtx(input, steps, input.keys);
  const lines = COPY[input.scheme].lines;
  return steps.map((s, index) => {
    const caption = captionOf(ctx, s);
    return {
      index,
      label: labelOf(ctx, s),
      outcome: s.outcome,
      badge: badgeOf(s),
      caption,
      lines: lines.map((l) => [l]),
      path: PATHS[input.scheme][s.phase],
      vars: varsOf(ctx, s),
      logNote: caption,
      metric: metricOf(ctx, s),
      model: modelOf(ctx, s),
    };
  });
}
