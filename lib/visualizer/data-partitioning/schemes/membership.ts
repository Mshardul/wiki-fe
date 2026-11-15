import { type Applied, type KeyItem, NODE_LETTERS, type SchemeState, weightOf } from "../types";

export const byLetter = (a: string, b: string): number =>
  NODE_LETTERS.indexOf(a) - NODE_LETTERS.indexOf(b);

// The alive nodes after an event, in letter order.
export function nodesAfter(nodes: string[], event: Applied): string[] {
  const next =
    event.kind === "add" ? [...nodes, event.letter] : nodes.filter((n) => n !== event.letter);
  return next.sort(byLetter);
}

export function withNodes(state: SchemeState, nodes: string[]): SchemeState {
  return { ...state, nodes };
}

// Summed key weight per node over the keys placed so far.
export function loadsOf(
  nodes: string[],
  items: KeyItem[],
  owners: (string | null)[],
): Map<string, number> {
  const loads = new Map(nodes.map((n) => [n, 0]));
  owners.forEach((o, i) => {
    if (o !== null) loads.set(o, (loads.get(o) ?? 0) + weightOf(items[i] as KeyItem));
  });
  return loads;
}

// Lowest load wins; ties go to the earlier letter because nodes are in letter order.
export function leastLoaded(nodes: string[], loads: Map<string, number>): string {
  let best = nodes[0] as string;
  for (const n of nodes) if ((loads.get(n) ?? 0) < (loads.get(best) ?? 0)) best = n;
  return best;
}
