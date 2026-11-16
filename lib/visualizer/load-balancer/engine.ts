import { decide, initialState } from "./policies";
import {
  FAIL_BEFORE,
  type Flight,
  GAP,
  type LbInput,
  type LbStep,
  type PolicyState,
} from "./types";

const countsOf = (flights: Flight[], servers: number): number[] =>
  Array.from({ length: servers }, (_, s) => flights.filter((f) => f.server === s).length);

export function runBalancer(input: LbInput): LbStep[] {
  const n = input.servers;
  const steps: LbStep[] = [];
  let flights: Flight[] = [];
  let up = Array.from({ length: n }, () => true);
  let state: PolicyState = initialState(n);
  let routed = 0;

  const push = (s: Omit<LbStep, "up" | "flights" | "state" | "routed">): void => {
    steps.push({ ...s, up: [...up], flights: [...flights], state, routed });
  };

  const place = (
    request: number,
    tick: number,
    total: number,
    left: number,
    from: number | null,
  ): void => {
    const d = decide(input.policy, { request, up, counts: countsOf(flights, n), state });
    state = d.state;
    const arriving: Flight = { request, server: d.pick.server, end: tick + left, total };
    push({
      phase: "decide",
      badge: from === null ? "Route" : "Re-route",
      tick,
      request,
      server: d.pick.server,
      from,
      arriving,
      pick: d.pick,
      outcome: "neutral",
    });
    flights = [...flights, arriving];
    routed += 1;
    push({
      phase: "land",
      badge: "Lands",
      tick,
      request,
      server: d.pick.server,
      from,
      arriving: null,
      pick: d.pick,
      outcome: "neutral",
    });
  };

  const finishUpTo = (tick: number): void => {
    for (;;) {
      const due = flights
        .filter((f) => f.end <= tick)
        .sort((a, b) => a.end - b.end || a.request - b.request)[0];
      if (!due) return;
      flights = flights.filter((f) => f !== due);
      push({
        phase: "finish",
        badge: "Done",
        tick: due.end,
        request: due.request,
        server: due.server,
        from: null,
        arriving: null,
        pick: null,
        outcome: "good",
      });
    }
  };

  const failAt = Math.min(FAIL_BEFORE, input.durations.length);
  input.durations.forEach((total, i) => {
    const request = i + 1;
    const tick = i * GAP;
    finishUpTo(tick);
    if (input.failure !== null && request === failAt) {
      up = up.map((u, s) => u && s !== input.failure);
      push({
        phase: "fail",
        badge: "Down",
        tick,
        request: null,
        server: input.failure,
        from: null,
        arriving: null,
        pick: null,
        outcome: "bad",
      });
      const stranded = flights
        .filter((f) => f.server === input.failure)
        .sort((a, b) => a.request - b.request);
      for (const f of stranded) {
        flights = flights.filter((x) => x !== f);
        place(f.request, tick, f.total, f.end - tick, input.failure);
      }
    }
    place(request, tick, total, total, null);
  });
  finishUpTo(Number.POSITIVE_INFINITY);
  return steps;
}
