import { hashKey, ringOwner, ringPoints } from "../hash";
import type { KeyItem, Scheme, SchemeState } from "../types";
import { nodesAfter, withNodes } from "./membership";

const ownerOf = (state: SchemeState, item: KeyItem): string =>
  ringOwner(ringPoints(state.nodes, state.vnodes), hashKey(item.key));

export const ring: Scheme = {
  init: (nodes, vnodes) => ({ nodes, vnodes, ranges: [] }),
  place: (state, items, index) => ownerOf(state, items[index] as KeyItem),
  apply(state, event, items) {
    const next = withNodes(state, nodesAfter(state.nodes, event));
    return { state: next, owners: items.map((it) => ownerOf(next, it)) };
  },
};
