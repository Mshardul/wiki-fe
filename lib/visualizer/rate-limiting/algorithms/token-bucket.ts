import { plural } from "../format";
import type { LimiterFactory } from "../types";

export const createTokenBucket: LimiterFactory = (p) => {
  // Token ids, oldest first; a request spends the oldest.
  const tokens: number[] = Array.from({ length: p.limit }, (_, i) => i + 1);
  let nextId = p.limit + 1;
  let last = 0;
  let refilled: number[] = [];
  let spent: number | null = null;
  return {
    begin(t) {
      refilled = [];
      spent = null;
      const due = Math.floor(t / p.pace) - Math.floor(last / p.pace);
      last = t;
      for (let i = 0; i < due && tokens.length < p.limit; i += 1) {
        tokens.push(nextId);
        refilled.push(nextId);
        nextId += 1;
      }
      return refilled.length ? `+${plural(refilled.length, "token")} refilled` : "";
    },
    request() {
      const id = tokens.shift();
      if (id === undefined) return { ok: false, detail: "bucket empty" };
      spent = id;
      return { ok: true, detail: `${plural(tokens.length, "token")} left` };
    },
    snapshot(t) {
      const nextIn = tokens.length >= p.limit ? null : (Math.floor(t / p.pace) + 1) * p.pace - t;
      return { kind: "token", tokens: [...tokens], refilled: [...refilled], spent, nextIn };
    },
  };
};
