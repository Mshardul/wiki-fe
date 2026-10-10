export const LOOP = { stepMs: 900, holdMs: 2000, resetMs: 600 } as const;

export type LoopPhase = "play" | "hold" | "reset";
export interface LoopState {
  phase: LoopPhase;
  // How many steps are lit: 1..maxSteps while playing, maxSteps while holding, 0 on reset.
  lit: number;
}

export function loopState(elapsed: number, maxSteps: number): LoopState {
  const steps = Number.isFinite(maxSteps) && maxSteps >= 1 ? Math.floor(maxSteps) : 1;
  const playMs = steps * LOOP.stepMs;
  const cycle = playMs + LOOP.holdMs + LOOP.resetMs;
  const t = Number.isFinite(elapsed) && elapsed > 0 ? elapsed % cycle : 0;
  if (t < playMs) return { phase: "play", lit: Math.floor(t / LOOP.stepMs) + 1 };
  if (t < playMs + LOOP.holdMs) return { phase: "hold", lit: steps };
  return { phase: "reset", lit: 0 };
}
