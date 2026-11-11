import type { ScheduleSwatch } from "@/lib/visualizer/core/shapes";
import type { VizFrame } from "@/lib/visualizer/core/types";
import { swatchesInFrame } from "./presentation-swatches";

/** Footer legend for the step on screen (schedule and mechanism presentation shapes). */
export function legendForFrame(
  legend: { label: string; swatch: ScheduleSwatch }[],
  frame: VizFrame,
): { label: string; swatch: ScheduleSwatch }[] {
  const drawn = swatchesInFrame(frame);
  if (drawn.size === 0) return [];
  return legend.filter((item) => drawn.has(item.swatch));
}

/** @deprecated Use legendForFrame; retained for tests that pass multi-frame slices. */
export function legendForFrames(
  legend: { label: string; swatch: ScheduleSwatch }[],
  frames: VizFrame[],
): { label: string; swatch: ScheduleSwatch }[] {
  if (frames.length === 0) return [];
  const drawn = new Set<ScheduleSwatch>();
  for (const f of frames) swatchesInFrame(f).forEach((s) => drawn.add(s));
  if (drawn.size === 0) return [];
  return legend.filter((item) => drawn.has(item.swatch));
}
