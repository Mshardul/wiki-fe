import { formatEstimate } from "../format";
import type { LimiterFactory } from "../types";

export const createSlidingCounter: LimiterFactory = (p) => {
  const counts: number[] = [];
  let lastWin = 0;
  let rolled = false;
  // Share of the previous window's ticks still inside the bracket (t - window, t].
  const read = (t: number) => {
    const win = Math.floor(t / p.window);
    const previous = win > 0 ? (counts[win - 1] ?? 0) : 0;
    const current = counts[win] ?? 0;
    const weight = win > 0 ? p.window - 1 - (t % p.window) : 0;
    return { win, previous, current, weight, scaled: previous * weight + current * p.window };
  };
  return {
    begin(t) {
      const win = Math.floor(t / p.window);
      rolled = win !== lastWin;
      lastWin = win;
      return rolled ? "new window" : "";
    },
    request(t) {
      const r = read(t);
      const sum = `estimate ${r.previous} × ${r.weight}/${p.window} + ${r.current} = ${formatEstimate(r.scaled, p.window)}`;
      if (r.scaled < p.limit * p.window) {
        counts[r.win] = r.current + 1;
        return { ok: true, detail: `${sum} < ${p.limit}` };
      }
      return { ok: false, detail: `${sum} ≥ ${p.limit}` };
    },
    snapshot(t) {
      const r = read(t);
      return {
        kind: "counter",
        window: r.win,
        counts: Array.from({ length: r.win + 1 }, (_, i) => counts[i] ?? 0),
        previous: r.previous,
        weight: r.weight,
        current: r.current,
        scaled: r.scaled,
      };
    },
  };
};
