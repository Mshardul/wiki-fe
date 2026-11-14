import type { Rich } from "../core/rich";
import { fill } from "../core/rich";
import { homeOf, mathsOf } from "./hash";
import type { ChainBadge, ChainEvent, Op } from "./trace";

export function chainRun(ops: Op[], size: number, start?: number[][]): ChainEvent[] {
  const chains: number[][] = start
    ? start.map((c) => [...c])
    : Array.from({ length: size }, () => []);
  const events: ChainEvent[] = [];
  const emit = (
    badge: ChainBadge,
    caption: Rich,
    f: Partial<Pick<ChainEvent, "key" | "home" | "walking" | "walked" | "placed">> = {},
  ) =>
    events.push({
      badge,
      caption,
      chains: chains.map((c) => [...c]),
      key: null,
      home: null,
      walking: null,
      walked: 0,
      placed: null,
      ...f,
    });
  emit("Start", fill(`An empty table of {n} slots.`, { n: String(size) }));
  for (const op of ops) {
    const key = op.key;
    const k = String(key);
    const home = homeOf(key, size);
    const chain = chains[home] ?? [];
    const verb = { insert: "Insert", lookup: "Look up", delete: "Delete" }[op.kind];
    emit("Hash", fill(`{verb} {k}: {m}.`, { verb, k, m: mathsOf(key, size) }), { key, home });
    let walked = 0;
    let found = false;
    for (let i = 0; i < chain.length; i++) {
      walked++;
      const item = chain[i] ?? 0;
      const at = { key, home, walking: i, walked };
      emit(
        "Walk",
        fill(item === key ? `Item {o} matches {k}.` : `Item {o} is not {k}: next.`, {
          o: String(item),
          k,
        }),
        at,
      );
      if (item === key) {
        found = true;
        if (op.kind === "insert") {
          emit("Found", fill(`{k} is already stored, so nothing is added.`, { k }), at);
        } else {
          emit("Found", fill(`Found {k} in this list.`, { k }), at);
          if (op.kind === "delete") {
            chain.splice(i, 1);
            emit("Unlink", fill(`Unlink {k} and join its neighbours.`, { k }), {
              key,
              home,
              walking: null,
              walked,
            });
          }
        }
        break;
      }
    }
    if (found) continue;
    if (op.kind === "insert") {
      chain.push(key);
      emit("Place", fill(`Add {k} at the end of the list.`, { k }), {
        key,
        home,
        walked,
        placed: chain.length - 1,
      });
    } else {
      emit("Not found", fill(`The list ends: {k} is not stored.`, { k }), { key, home, walked });
    }
  }
  emit("Done", fill(`Done.`, {}));
  return events;
}
