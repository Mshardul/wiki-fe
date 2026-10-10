import type { StrategyDef, StrategyId } from "../types";
import { cacheAside } from "./cache-aside";
import { readThrough } from "./read-through";
import { refreshAhead } from "./refresh-ahead";
import { writeAround } from "./write-around";
import { writeBehind } from "./write-behind";
import { writeThrough } from "./write-through";

export const STRATEGIES: Record<StrategyId, StrategyDef> = {
  "cache-aside": cacheAside,
  "read-through": readThrough,
  "write-through": writeThrough,
  "write-behind": writeBehind,
  "write-around": writeAround,
  "refresh-ahead": refreshAhead,
};
