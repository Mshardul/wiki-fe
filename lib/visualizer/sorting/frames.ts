import type { ShapeModel } from "../core/shapes";
import type { VizFrame } from "../core/types";
import type { SortDef, SortStep } from "./types";

// A Revision card draws the same picture as the stage: the heap sort tree already carries its array.
export function cardModelOf(s: SortStep): ShapeModel {
  return s.picture ?? s.array;
}

export function toFrames(def: SortDef, steps: SortStep[]): VizFrame[] {
  return steps.map((s, index) => ({
    index,
    label: s.badge,
    outcome: s.outcome,
    badge: s.badge,
    caption: s.caption,
    lines: def.lines.map((l) => [l]),
    path: s.path,
    vars: [...s.vars, ...s.counters.map((c) => ({ name: c.label, value: c.value }))],
    logNote: s.caption,
    metric: s.counters[0]?.value ?? "",
    model: s.picture ?? s.array,
  }));
}
