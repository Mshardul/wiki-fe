import { STRATEGY_META } from "../copy";
import type { StrategyDef } from "../types";
import { type Behaviour, dbOnlyWrite, readVia, runOp } from "./shared";

const behaviour: Behaviour = {
  read: readVia("cache"),
  write: (w, key, _p, thread) =>
    dbOnlyWrite(
      w,
      key,
      thread,
      "written to the DB only; a cached copy keeps its old value until it expires.",
    ),
};

export const readThrough: StrategyDef = {
  ...STRATEGY_META["read-through"],
  step: (w, op, p) => runOp(behaviour, w, op, p),
};
