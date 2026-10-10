import { CHIPS_PER_ROW } from "../core/geometry";
import type { CardItem, Lane, LanesModel } from "../core/shapes";
import { keysOf, ver } from "./strategies/shared";
import type { Params, Step, StrategyDef, World } from "./types";

const text = (key: string, version: number): string => `${key} = ${ver(version)}`;

// A title row plus one row per key, plus the buffer section for strategies that flush.
export function cardRowsFor(distinctKeys: number, usesFlush: boolean): number {
  return 1 + distinctKeys + (usesFlush ? 1 + Math.ceil(distinctKeys / CHIPS_PER_ROW) : 0);
}

function entryItems(
  def: StrategyDef,
  before: World,
  after: World,
  p: Params,
  dead: boolean,
): CardItem[] {
  if (dead) return [{ text: "— wiped —", tone: "muted" }];
  const items: CardItem[] = [];
  for (const k of keysOf(after.cache)) {
    const e = after.cache[k];
    if (!e) continue;
    const item: CardItem = { text: text(k, e.version) };
    if (e.version < (after.db[k] ?? 1)) item.tone = "stale";
    else if (before.cache[k]?.version !== e.version) item.tone = "changed";
    if (def.usesLifetime) item.bar = { value: p.lifetime - (after.tick - e.born), max: p.lifetime };
    items.push(item);
  }
  return items;
}

function bufferItems(before: World, after: World, step: Step): CardItem[] {
  if (step.crashed) {
    return (step.lostKeys ?? []).map(
      (k): CardItem => ({ text: text(k, before.buffer[k] ?? 0), tone: "lost" }),
    );
  }
  return keysOf(after.buffer).map((k) => {
    const item: CardItem = { text: text(k, after.buffer[k] ?? 0) };
    if (before.buffer[k] !== after.buffer[k]) item.tone = "changed";
    return item;
  });
}

function dbItems(before: World, after: World): CardItem[] {
  return keysOf(after.db).map((k) => {
    const item: CardItem = { text: text(k, after.db[k] ?? 1) };
    if (before.db[k] !== after.db[k]) item.tone = "changed";
    return item;
  });
}

export function buildModel(
  def: StrategyDef,
  before: World,
  after: World,
  step: Step,
  p: Params,
  slots: number,
  distinctKeys: number,
  epoch: number,
): LanesModel {
  const dead = step.crashed === true;
  const cache: Lane = {
    id: "cache",
    name: "Cache",
    dead,
    sections: [
      { title: "Entries", layout: "rows", items: entryItems(def, before, after, p, dead) },
    ],
  };
  if (def.usesFlush) {
    cache.sections.push({
      title: "Write buffer",
      layout: "chips",
      items: bufferItems(before, after, step),
    });
  }
  const lost = step.lostKeys ?? [];
  return {
    kind: "lanes",
    lanes: [
      { id: "app", name: "App", sections: [] },
      cache,
      {
        id: "db",
        name: "DB",
        sections: [{ title: "Rows", layout: "rows", items: dbItems(before, after) }],
      },
    ],
    hops: step.hops,
    slots,
    cardRows: cardRowsFor(distinctKeys, def.usesFlush),
    epoch,
    ...(dead
      ? { note: lost.length ? `node down — ${lost.join(", ")} lost` : "node down — restarts empty" }
      : {}),
  };
}
