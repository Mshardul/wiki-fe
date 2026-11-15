import { rendezvousScore } from "../hash";
import type { KeyItem, Scheme, SchemeState } from "../types";
import { nodesAfter, withNodes } from "./membership";

// Highest score wins; nodes are in letter order so a tie keeps the earlier letter.
export function winnerOf(nodes: string[], key: number): string {
  let best = nodes[0] as string;
  for (const n of nodes) if (rendezvousScore(key, n) > rendezvousScore(key, best)) best = n;
  return best;
}

const ownerOf = (state: SchemeState, item: KeyItem): string => winnerOf(state.nodes, item.key);

export const rendezvous: Scheme = {
  init: (nodes, vnodes) => ({ nodes, vnodes, ranges: [] }),
  place: (state, items, index) => ownerOf(state, items[index] as KeyItem),
  apply(state, event, items) {
    const next = withNodes(state, nodesAfter(state.nodes, event));
    return { state: next, owners: items.map((it) => ownerOf(next, it)) };
  },
};
