import type { LimiterFactory } from "../types";

export const createFixedWindow: LimiterFactory = (p) => {
  const counts: number[] = [];
  const rejected: number[] = [];
  let win = 0;
  let lastWin = 0;
  return {
    begin(t) {
      win = Math.floor(t / p.window);
      const rolled = win !== lastWin;
      lastWin = win;
      return rolled ? "new window, counter reset" : "";
    },
    request() {
      const used = counts[win] ?? 0;
      if (used < p.limit) {
        counts[win] = used + 1;
        return { ok: true, detail: `window ${win} now ${used + 1}/${p.limit}` };
      }
      rejected[win] = (rejected[win] ?? 0) + 1;
      return { ok: false, detail: `window ${win} already full (${p.limit}/${p.limit})` };
    },
    snapshot(t) {
      const w = Math.floor(t / p.window);
      const dense = (a: number[]): number[] => Array.from({ length: w + 1 }, (_, i) => a[i] ?? 0);
      return { kind: "fixed", window: w, counts: dense(counts), rejected: dense(rejected) };
    },
  };
};
