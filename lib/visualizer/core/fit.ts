// Mirrors --viz-fit-scale-max in css/tokens.css (a test keeps them equal).
export const FIT_SCALE_MAX = 2;

export interface Extent {
  width: number;
  height: number;
}

// One uniform scale that fits the natural drawing into the stage, capped at max.
export function fitScale(natural: Extent, stage: Extent, max: number = FIT_SCALE_MAX): number {
  if (natural.width <= 0 || natural.height <= 0 || stage.width <= 0 || stage.height <= 0) return 1;
  return Math.min(stage.width / natural.width, stage.height / natural.height, max);
}
