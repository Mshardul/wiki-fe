import { fill, keyText, type Rich } from "../core/rich";
import type { VarRow, VizFrame } from "../core/types";
import { buildModel } from "./lanes";
import { expireEntries, ver } from "./strategies/shared";
import { KEYS, type Op, type Params, type Step, type StrategyDef, type World } from "./types";

export function initWorld(keyNames: string[]): World {
  return {
    tick: 0,
    db: Object.fromEntries(keyNames.map((k) => [k, 1])),
    cache: {},
    buffer: {},
    stale: 0,
    lost: 0,
    dbWrites: 0,
  };
}

const cloneWorld = (w: World): World => JSON.parse(JSON.stringify(w)) as World;

interface Row {
  op: Op;
  i: number;
  before: World;
  after: World;
  step: Step;
  expired: string[];
}

const metricValue = (def: StrategyDef, w: World): number => (def.usesFlush ? w.lost : w.stale);

function toFrame(def: StrategyDef, r: Row, p: Params, slots: number, distinct: number): VizFrame {
  const { op, i, before, after, step, expired } = r;
  const entry = after.cache[op.key];
  const label = op.kind === "!" ? "!" : `${op.kind} ${op.key}`;
  const vars: VarRow[] = [
    { name: "request #", value: String(i + 1) },
    { name: "request", value: label },
    { name: op.key ? `cache ${op.key}` : "cache", value: entry ? ver(entry.version) : "—" },
    { name: op.key ? `DB ${op.key}` : "DB", value: op.key ? ver(after.db[op.key] ?? 1) : "—" },
    { name: "latency (ticks)", value: String(step.cost) },
    { name: "DB writes", value: String(after.dbWrites) },
    ...(def.usesFlush
      ? [{ name: "waiting to flush", value: String(Object.keys(after.buffer).length) }]
      : []),
    { name: def.metricLabel.toLowerCase(), value: String(metricValue(def, after)) },
  ];
  const lead: Rich = expired.length ? [keyText(expired.join(", ")), " expired · "] : [];
  return {
    index: i,
    label,
    outcome: step.outcome,
    badge: step.badge,
    caption: [...lead, ...step.caption],
    lines: def.lines.map((l) => fill(l, { key: op.key })),
    path: step.path,
    vars,
    logNote: step.note,
    metric: String(metricValue(def, after)),
    model: buildModel(def, before, after, step, p, slots, distinct, i),
  };
}

export function simulate(def: StrategyDef, ops: Op[], p: Params, keyCount: number): VizFrame[] {
  const names = KEYS.slice(0, Math.max(1, keyCount)).split("");
  const used = Array.from(new Set(ops.filter((o) => o.key !== "").map((o) => o.key)));
  let world = initWorld(Array.from(new Set([...names, ...used])));
  const rows = ops.map((op, i): Row => {
    const before = world;
    const w = cloneWorld(before);
    w.tick = i + 1;
    const expired = def.usesLifetime ? expireEntries(w, p) : [];
    const step = def.step(w, op, p);
    world = w;
    return { op, i, before, after: w, step, expired };
  });
  const distinct = new Set([...names, ...ops.filter((o) => o.key !== "").map((o) => o.key)]).size;
  const slots = Math.max(1, ...rows.map((r) => r.step.hops.length));
  return rows.map((r) => toFrame(def, r, p, slots, distinct));
}
