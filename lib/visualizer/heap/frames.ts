import type { VizFrame } from "../core/types";
import type { HeapDef, HeapStep } from "./types";

export function toFrames(def: HeapDef, steps: HeapStep[]): VizFrame[] {
  return steps.map((s, index) => {
    return {
      index,
      label: s.badge,
      outcome: s.outcome,
      badge: s.badge,
      caption: s.caption,
      lines: def.lines.map((l) => [l]),
      path: s.path,
      vars: s.vars,
      logNote: s.caption,
      metric: s.metric,
      model: s.model,
    };
  });
}
