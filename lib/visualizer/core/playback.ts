export const STEP_MS = 2600;
export const SETTLE_MS = 300;
export const TICK_MS = 100;
export const SPEEDS = [0.5, 1, 2] as const;
export type Speed = (typeof SPEEDS)[number];

export const REPEAT_MODES = ["off", "once", "infinite"] as const;
export type RepeatMode = (typeof REPEAT_MODES)[number];

export const nextRepeat = (mode: RepeatMode): RepeatMode =>
  REPEAT_MODES[(REPEAT_MODES.indexOf(mode) + 1) % REPEAT_MODES.length] ?? "off";

export const frameDuration = (speed: Speed): number => STEP_MS / speed;

export function subStepAt(elapsed: number, pathLen: number, speed: Speed): number {
  if (pathLen <= 1) return 0;
  const per = frameDuration(speed) / pathLen;
  return Math.min(pathLen - 1, Math.max(0, Math.floor(elapsed / per)));
}

export const isFrameDone = (elapsed: number, speed: Speed): boolean =>
  elapsed >= frameDuration(speed) + SETTLE_MS;

export const clampFrame = (i: number, total: number): number =>
  Math.min(Math.max(0, total - 1), Math.max(0, Math.floor(i)));

// Resuming mid-frame restarts the clock at the start of the current sub-step.
export const elapsedForSub = (sub: number, pathLen: number, speed: Speed): number =>
  pathLen > 0 ? (sub * frameDuration(speed)) / pathLen : 0;
