import { runSteps, type Step } from "./engine";
import { type AlgorithmId, type Pace, paramsOf } from "./types";

export function stepsOf(id: AlgorithmId, ticks: number[], limit = 3, pace: Pace = 2): Step[] {
  return runSteps(id, paramsOf(limit, pace), ticks);
}

// "A" for good, "R" for bad, one letter per request.
export function outcomes(id: AlgorithmId, ticks: number[], limit = 3, pace: Pace = 2): string {
  return stepsOf(id, ticks, limit, pace)
    .map((s) => (s.ok ? "A" : "R"))
    .join("");
}

export const DEFAULT_TICKS = [4, 5, 5, 6, 6, 7, 7, 11];
