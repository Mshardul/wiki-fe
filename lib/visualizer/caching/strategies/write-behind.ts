import { keyText } from "../../core/rich";
import { STRATEGY_META } from "../copy";
import type { StrategyDef, World } from "../types";
import { type Behaviour, CACHE_RT, dbVersion, hop, keysOf, readVia, runOp, ver } from "./shared";

// The newest version of a key anywhere: DB, buffer or cache.
const latest = (w: World, key: string): number =>
  Math.max(dbVersion(w, key), w.buffer[key] ?? 0, w.cache[key]?.version ?? 0);

const behaviour: Behaviour = {
  read: readVia("cache"),
  write(w, key, _p, thread) {
    const n = latest(w, key) + 1;
    w.cache[key] = { version: n, born: w.tick };
    w.buffer[key] = n;
    return {
      hops: [
        hop("app", "cache", `set ${key} = ${ver(n)}`, { thread }),
        hop("cache", "app", "ok", { reply: true, thread }),
      ],
      outcome: "good",
      badge: "WRITE",
      caption: [keyText(key), " acknowledged from the cache; the DB write is queued."],
      path: [3],
      cost: CACHE_RT,
      note: [keyText(`${key} = ${ver(n)}`)],
    };
  },
  after(w, p, step) {
    const pending = keysOf(w.buffer);
    if (pending.length === 0 || w.tick % p.flushEvery !== 0) return;
    const label = pending.map((k) => `${k} = ${ver(w.buffer[k] ?? 0)}`).join(", ");
    for (const k of pending) w.db[k] = w.buffer[k] ?? dbVersion(w, k);
    w.dbWrites += pending.length;
    w.buffer = {};
    step.hops.push(
      hop("cache", "db", `flush ${label}`, { thread: 1 }),
      hop("db", "cache", "ok", { reply: true, thread: 1 }),
    );
    step.path = [...step.path, 4];
    step.caption = [...step.caption, " Flushed ", keyText(pending.join(", ")), " to the DB."];
  },
};

export const writeBehind: StrategyDef = {
  ...STRATEGY_META["write-behind"],
  step: (w, op, p) => runOp(behaviour, w, op, p),
};
