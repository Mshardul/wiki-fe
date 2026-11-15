import { type KeyItem, type Scheme, weightOf } from "../types";
import { byLetter, leastLoaded, loadsOf, nodesAfter, withNodes } from "./membership";

// A key walks to the least-loaded node, so the directory records where it went.
function balance(oldNodes: string[], fresh: string, items: KeyItem[], owners: string[]): string[] {
  const out = [...owners];
  const nodes = [...oldNodes, fresh];
  for (let guard = 0; guard < items.length * items.length + 1; guard++) {
    const loads = loadsOf(nodes, items, out);
    const scan = [...oldNodes].sort(
      (a, b) => (loads.get(b) ?? 0) - (loads.get(a) ?? 0) || byLetter(a, b),
    );
    let moved = false;
    for (const node of scan) {
      // Most recently assigned first; keys that fail the test are passed over.
      for (let i = items.length - 1; i >= 0; i--) {
        if (out[i] !== node) continue;
        const w = weightOf(items[i] as KeyItem);
        if ((loads.get(node) ?? 0) - (loads.get(fresh) ?? 0) >= 2 * w) {
          out[i] = fresh;
          moved = true;
          break;
        }
      }
      if (moved) break;
    }
    if (!moved) break;
  }
  return out;
}

// The leaving node's keys, in assignment order, each go to the least-loaded survivor.
function hand(survivors: string[], gone: string, items: KeyItem[], owners: string[]): string[] {
  const out = [...owners];
  owners.forEach((o, i) => {
    if (o !== gone) return;
    const loads = loadsOf(
      survivors,
      items,
      out.map((x) => (x === gone ? null : x)),
    );
    out[i] = leastLoaded(survivors, loads);
  });
  return out;
}

export const directory: Scheme = {
  init: (nodes, vnodes) => ({ nodes, vnodes, ranges: [] }),
  place(state, items, index, owners) {
    return leastLoaded(state.nodes, loadsOf(state.nodes, items, owners));
  },
  apply(state, event, items, owners) {
    const nodes = nodesAfter(state.nodes, event);
    const next =
      event.kind === "add"
        ? balance(state.nodes, event.letter, items, owners)
        : hand(nodes, event.letter, items, owners);
    return { state: withNodes(state, nodes), owners: next };
  },
};
