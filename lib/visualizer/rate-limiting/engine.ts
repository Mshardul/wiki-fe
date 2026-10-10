import { LIMITERS } from "./algorithms";
import type { AlgorithmId, Decision, Params, Snapshot } from "./types";

export interface Step {
  index: number;
  tick: number;
  ok: boolean;
  detail: string;
  gap: string;
  wait?: Decision["wait"];
  before: Snapshot;
  after: Snapshot;
}

export function initialSnapshot(id: AlgorithmId, p: Params): Snapshot {
  return LIMITERS[id](p).snapshot(0);
}

export function runSteps(id: AlgorithmId, p: Params, ticks: number[]): Step[] {
  const limiter = LIMITERS[id](p);
  let prev = 0;
  return ticks.map((tick, index): Step => {
    const before = limiter.snapshot(prev);
    const gap = limiter.begin(tick);
    const d = limiter.request(tick, index);
    const after = limiter.snapshot(tick);
    prev = tick;
    return {
      index,
      tick,
      ok: d.ok,
      detail: d.detail,
      gap,
      ...(d.wait ? { wait: d.wait } : {}),
      before,
      after,
    };
  });
}

// Allowed ticks up to step upTo; the leaky bucket counts every queued request's leave tick, scheduled or done.
export function passTicks(id: AlgorithmId, steps: Step[], upTo: number): number[] {
  if (id === "leaky-bucket") {
    const after = steps[upTo]?.after;
    return after?.kind === "leaky" ? after.leaves : [];
  }
  return steps
    .slice(0, upTo + 1)
    .filter((s) => s.ok)
    .map((s) => s.tick);
}

export interface Peak {
  best: number;
  from: number;
  to: number;
}

// The most ticks inside any span of `window` consecutive ticks, and the tightest span holding them.
export function peakIn(ticks: number[], window: number): Peak {
  let best = 0;
  let from = 0;
  let to = 0;
  const last = ticks.length ? Math.max(...ticks) : 0;
  for (let a = 0; a <= last; a += 1) {
    const inside = ticks.filter((t) => t >= a && t < a + window);
    if (inside.length > best) {
      best = inside.length;
      from = Math.min(...inside);
      to = Math.max(...inside);
    }
  }
  return { best, from, to };
}
