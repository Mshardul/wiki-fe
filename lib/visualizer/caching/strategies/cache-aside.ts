import { badText, keyText, type Rich } from "../../core/rich";
import { STRATEGY_META } from "../copy";
import type { StrategyDef } from "../types";
import { type Behaviour, CACHE_RT, DB_RT, dbVersion, hop, readVia, runOp, ver } from "./shared";

const behaviour: Behaviour = {
  read: readVia("app"),
  write(w, key, _p, thread) {
    const n = dbVersion(w, key) + 1;
    w.db[key] = n;
    w.dbWrites++;
    delete w.cache[key];
    return {
      hops: [
        hop("app", "db", `write ${key} = ${ver(n)}`, { thread }),
        hop("app", "cache", `delete ${key}`, { thread }),
      ],
      outcome: "good",
      badge: "WRITE",
      caption: [keyText(key), " written to the DB, then its cache key deleted."],
      path: [3],
      cost: DB_RT + CACHE_RT,
      note: [keyText(`${key} = ${ver(n)}`)],
    };
  },
  // The cache-aside race: the read's old DB answer is cached after the write has already deleted the key.
  race(w, key) {
    const dropped = w.cache[key] !== undefined;
    delete w.cache[key];
    const old = dbVersion(w, key);
    const next = old + 1;
    w.db[key] = next;
    w.dbWrites++;
    w.cache[key] = { version: old, born: w.tick };
    const lead: Rich = dropped
      ? [keyText(key), " dropped from the cache as if it had just expired · "]
      : [];
    return {
      hops: [
        hop("app", "cache", `get ${key}`),
        hop("cache", "app", "miss", { reply: true }),
        hop("app", "db", `read ${key}`),
        hop("app", "db", `write ${key} = ${ver(next)}`, { thread: 1 }),
        hop("app", "cache", `delete ${key}`, { thread: 1 }),
        hop("db", "app", ver(old), { reply: true }),
        hop("app", "cache", `set ${key} = ${ver(old)}`, { flag: true }),
      ],
      outcome: "bad",
      badge: "RACE",
      caption: [
        ...lead,
        "The read's old answer ",
        keyText(ver(old)),
        " is cached after the write's delete; the DB holds ",
        keyText(ver(next)),
        ".",
      ],
      path: [0, 2, 3],
      cost: CACHE_RT + DB_RT + CACHE_RT,
      note: [badText("stale entry cached")],
    };
  },
};

export const cacheAside: StrategyDef = {
  ...STRATEGY_META["cache-aside"],
  step: (w, op, p) => runOp(behaviour, w, op, p),
};
