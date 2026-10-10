import { badText, goodText, keyText, mutedText, type Rich } from "../../core/rich";
import type { Hop } from "../../core/shapes";
import type { LaneId, Op, Params, Step, World } from "../types";

export const CACHE_RT = 1;
export const DB_RT = 3;

export const ver = (n: number): string => `v${n}`;

interface HopOpts {
  reply?: boolean;
  flag?: boolean;
  thread?: 0 | 1;
}

export function hop(from: LaneId, to: LaneId, label: string, o: HopOpts = {}): Hop {
  return {
    from,
    to,
    label,
    thread: o.thread ?? 0,
    reply: o.reply ?? false,
    flag: o.flag ?? false,
  };
}

export const dbVersion = (w: World, key: string): number => w.db[key] ?? 1;

export const keysOf = (rec: Record<string, unknown>): string[] => Object.keys(rec).sort();

export function expireEntries(w: World, p: Params): string[] {
  const gone = keysOf(w.cache).filter((k) => w.tick - (w.cache[k]?.born ?? w.tick) >= p.lifetime);
  for (const k of gone) delete w.cache[k];
  return gone;
}

// Precondition: the cache holds an entry for key.
export function readHit(w: World, key: string, thread: 0 | 1 = 0): Step {
  const have = w.cache[key]?.version ?? 0;
  const db = dbVersion(w, key);
  const stale = have < db;
  if (stale) w.stale++;
  return {
    hops: [
      hop("app", "cache", `get ${key}`, { thread }),
      hop("cache", "app", `${ver(have)} · ${stale ? "stale" : "hit"}`, {
        reply: true,
        flag: stale,
        thread,
      }),
    ],
    outcome: stale ? "bad" : "good",
    badge: stale ? "STALE HIT" : "HIT",
    caption: stale
      ? [
          keyText(key),
          " ",
          badText("stale hit"),
          " — the cache holds ",
          keyText(ver(have)),
          ", the DB has ",
          keyText(ver(db)),
          ".",
        ]
      : [keyText(key), " ", goodText("hit"), " — answered from the cache."],
    path: [0, 1],
    cost: CACHE_RT,
    note: stale ? [badText("stale")] : [mutedText("—")],
  };
}

// The app reads the DB itself and fills the cache (cache-aside, write-around).
export function appFillMiss(w: World, key: string, thread: 0 | 1 = 0): Step {
  const v = dbVersion(w, key);
  w.cache[key] = { version: v, born: w.tick };
  return {
    hops: [
      hop("app", "cache", `get ${key}`, { thread }),
      hop("cache", "app", "miss", { reply: true, thread }),
      hop("app", "db", `read ${key}`, { thread }),
      hop("db", "app", ver(v), { reply: true, thread }),
      hop("app", "cache", `set ${key} = ${ver(v)}`, { thread }),
    ],
    outcome: "bad",
    badge: "MISS",
    caption: [keyText(key), " ", badText("miss"), " — the app read the DB and filled the cache."],
    path: [0, 2],
    cost: CACHE_RT + DB_RT + CACHE_RT,
    note: ["filled ", keyText(`${key} = ${ver(v)}`)],
  };
}

// The cache loads from the DB itself (read-through and the strategies that pair with it).
export function cacheLoadMiss(w: World, key: string, thread: 0 | 1 = 0): Step {
  const v = dbVersion(w, key);
  w.cache[key] = { version: v, born: w.tick };
  return {
    hops: [
      hop("app", "cache", `get ${key}`, { thread }),
      hop("cache", "db", `load ${key}`, { thread }),
      hop("db", "cache", ver(v), { reply: true, thread }),
      hop("cache", "app", ver(v), { reply: true, thread }),
    ],
    outcome: "bad",
    badge: "MISS",
    caption: [keyText(key), " ", badText("miss"), " — the cache loaded it from the DB."],
    path: [0, 2],
    cost: CACHE_RT + DB_RT,
    note: ["loaded ", keyText(`${key} = ${ver(v)}`)],
  };
}

export const readVia =
  (load: "app" | "cache") =>
  (w: World, key: string): Step =>
    w.cache[key] ? readHit(w, key) : load === "app" ? appFillMiss(w, key) : cacheLoadMiss(w, key);

export function dbOnlyWrite(w: World, key: string, thread: 0 | 1, how: string): Step {
  const n = dbVersion(w, key) + 1;
  w.db[key] = n;
  w.dbWrites++;
  return {
    hops: [hop("app", "db", `write ${key} = ${ver(n)}`, { thread })],
    outcome: "good",
    badge: "WRITE",
    caption: [keyText(key), ` ${how}`],
    path: [3],
    cost: DB_RT,
    note: [keyText(`${key} = ${ver(n)}`)],
  };
}

export interface Behaviour {
  read(w: World, key: string, p: Params): Step;
  write(w: World, key: string, p: Params, thread: 0 | 1): Step;
  race?(w: World, key: string, p: Params): Step;
  after?(w: World, p: Params, step: Step): void;
}

const union = (a: number[], b: number[]): number[] =>
  Array.from(new Set([...a, ...b])).sort((x, y) => x - y);

// A read and a write on one key in one frame, the write drawn as the second thread.
function overlap(b: Behaviour, w: World, key: string, p: Params): Step {
  const r = b.read(w, key, p);
  const wr = b.write(w, key, p, 1);
  return {
    hops: [...r.hops, ...wr.hops],
    outcome: r.outcome,
    badge: "R ∥ W",
    caption: [...r.caption, " A write to the same key overlaps it."],
    path: union(r.path, wr.path),
    cost: r.cost,
    note: wr.note,
  };
}

function crash(w: World): Step {
  const lost = keysOf(w.buffer);
  w.lost += lost.length;
  w.cache = {};
  w.buffer = {};
  const caption: Rich = lost.length
    ? [
        "Cache node dies. ",
        badText(`${lost.join(", ")} acknowledged but never flushed`),
        " — lost.",
      ]
    : [
        "Cache node dies and restarts empty. Nothing lived only in the cache, so ",
        goodText("nothing is lost"),
        ".",
      ];
  return {
    hops: [],
    outcome: lost.length ? "bad" : "good",
    badge: "CRASH",
    caption,
    path: [],
    cost: 0,
    note: lost.length ? ["lost ", keyText(lost.join(", "))] : [mutedText("—")],
    crashed: true,
    lostKeys: lost,
  };
}

export function runOp(b: Behaviour, w: World, op: Op, p: Params): Step {
  if (op.kind === "!") return crash(w);
  if (w.db[op.key] === undefined) w.db[op.key] = 1;
  let step: Step;
  if (op.kind === "R") step = b.read(w, op.key, p);
  else if (op.kind === "W") step = b.write(w, op.key, p, 0);
  else step = b.race ? b.race(w, op.key, p) : overlap(b, w, op.key, p);
  b.after?.(w, p, step);
  return step;
}
