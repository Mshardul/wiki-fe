import { keyText } from "../../core/rich";
import { STRATEGY_META } from "../copy";
import type { StrategyDef } from "../types";
import { type Behaviour, CACHE_RT, DB_RT, dbVersion, hop, readVia, runOp, ver } from "./shared";

const behaviour: Behaviour = {
  read: readVia("cache"),
  write(w, key, _p, thread) {
    const n = dbVersion(w, key) + 1;
    w.db[key] = n;
    w.dbWrites++;
    w.cache[key] = { version: n, born: w.tick };
    return {
      hops: [
        hop("app", "cache", `set ${key} = ${ver(n)}`, { thread }),
        hop("cache", "db", `write ${key} = ${ver(n)}`, { thread }),
        hop("db", "cache", "ok", { reply: true, thread }),
        hop("cache", "app", "ok", { reply: true, thread }),
      ],
      outcome: "good",
      badge: "WRITE",
      caption: [keyText(key), " written to the cache and the DB together."],
      path: [3],
      cost: CACHE_RT + DB_RT,
      note: [keyText(`${key} = ${ver(n)}`)],
    };
  },
};

export const writeThrough: StrategyDef = {
  ...STRATEGY_META["write-through"],
  step: (w, op, p) => runOp(behaviour, w, op, p),
};
