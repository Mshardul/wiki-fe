import { plural } from "../format";
import type { LimiterFactory } from "../types";

export const createSlidingLog: LimiterFactory = (p) => {
  let kept: number[] = [];
  return {
    begin(t) {
      const before = kept.length;
      kept = kept.filter((x) => x > t - p.window);
      const gone = before - kept.length;
      return gone > 0 ? `${plural(gone, "timestamp")} aged out` : "";
    },
    request(t) {
      if (kept.length < p.limit) {
        kept.push(t);
        return {
          ok: true,
          detail: `${kept.length} of ${p.limit} kept in the last ${p.window} ticks`,
        };
      }
      return { ok: false, detail: `${kept.length} of ${p.limit} kept, so the log is full` };
    },
    snapshot() {
      return { kind: "log", kept: [...kept] };
    },
  };
};
