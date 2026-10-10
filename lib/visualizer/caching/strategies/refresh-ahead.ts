import { STRATEGY_META } from "../copy";
import type { StrategyDef } from "../types";
import {
  type Behaviour,
  cacheLoadMiss,
  dbOnlyWrite,
  dbVersion,
  hop,
  readHit,
  runOp,
  ver,
} from "./shared";

// An entry in the last third of its lifetime (at least one tick) is refreshed on a hit.
const refreshWindow = (lifetime: number): number => Math.max(1, Math.ceil(lifetime / 3));

const behaviour: Behaviour = {
  read(w, key, p) {
    const entry = w.cache[key];
    if (!entry) return cacheLoadMiss(w, key);
    const step = readHit(w, key);
    const remaining = p.lifetime - (w.tick - entry.born);
    if (remaining > refreshWindow(p.lifetime)) return step;
    const v = dbVersion(w, key);
    w.cache[key] = { version: v, born: w.tick };
    return {
      ...step,
      hops: [
        ...step.hops,
        hop("cache", "db", `refresh ${key}`, { thread: 1 }),
        hop("db", "cache", ver(v), { reply: true, thread: 1 }),
      ],
      caption: [...step.caption, " Refreshed in the background."],
      path: [...step.path, 4],
    };
  },
  write: (w, key, _p, thread) => dbOnlyWrite(w, key, thread, "written to the DB only."),
};

export const refreshAhead: StrategyDef = {
  ...STRATEGY_META["refresh-ahead"],
  step: (w, op, p) => runOp(behaviour, w, op, p),
};
