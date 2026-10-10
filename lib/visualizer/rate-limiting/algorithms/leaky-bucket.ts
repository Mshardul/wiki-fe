import type { LimiterFactory, QueuedRequest } from "../types";

// A queued request's leave tick is fixed when it joins: the drain never pauses while the queue is non-empty.
export const createLeakyBucket: LimiterFactory = (p) => {
  const joined: QueuedRequest[] = [];
  let dropped = 0;
  let lastT = 0;
  let left: number[] = [];
  const nextDrain = (t: number): number => (Math.floor(t / p.pace) + 1) * p.pace;
  const waiting = (t: number): QueuedRequest[] => joined.filter((j) => j.leave > t);
  return {
    begin(t) {
      left = joined.filter((j) => j.leave > lastT && j.leave <= t).map((j) => j.id);
      lastT = t;
      return left.length ? `${left.length} processed while waiting` : "";
    },
    request(t, index) {
      const queued = waiting(t);
      if (queued.length >= p.limit) {
        dropped += 1;
        return { ok: false, detail: `queue full (${p.limit}/${p.limit}), dropped` };
      }
      const leave = nextDrain(t) + queued.length * p.pace;
      joined.push({ id: index + 1, leave });
      return {
        ok: true,
        detail: `joins the queue at position ${queued.length + 1}, leaves at tick ${leave}`,
        wait: { ticks: leave - t, leave },
      };
    },
    snapshot(t) {
      return {
        kind: "leaky",
        queue: waiting(t).map((j) => ({ ...j })),
        processed: joined.filter((j) => j.leave <= t).length,
        dropped,
        left: [...left],
        leaves: joined.map((j) => j.leave),
      };
    },
  };
};
