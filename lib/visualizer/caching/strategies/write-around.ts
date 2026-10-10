import { STRATEGY_META } from "../copy";
import type { StrategyDef } from "../types";
import { type Behaviour, dbOnlyWrite, readVia, runOp } from "./shared";

const behaviour: Behaviour = {
  read: readVia("app"),
  write: (w, key, _p, thread) =>
    dbOnlyWrite(w, key, thread, "written straight to the DB, bypassing the cache."),
};

export const writeAround: StrategyDef = {
  ...STRATEGY_META["write-around"],
  step: (w, op, p) => runOp(behaviour, w, op, p),
};
