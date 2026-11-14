import { fill } from "../core/rich";
import { neighboursOf, normalise } from "./graphs";
import { type GraphData, Recorder, type TraceEvent } from "./trace";

export function topoRun(input: GraphData, seed: number): TraceEvent[] {
  const g = normalise(input);
  const r = new Recorder(g);
  const total = g.nodes.length;
  const indeg = new Map<string, number>(g.nodes.map((n) => [n, 0]));
  for (const n of g.nodes) {
    for (const nb of neighboursOf(g, n, 0)) indeg.set(nb.node, (indeg.get(nb.node) ?? 0) + 1);
  }
  const ready: string[] = [];
  r.metric = `0/${total}`;
  r.emit("Start", fill("Take a node only when nothing it depends on is left.", {}));
  for (const n of g.nodes) r.node(n).value = String(indeg.get(n));
  r.emit("Count", fill("Count the arrows pointing into each node.", {}));
  for (const n of g.nodes) {
    if (indeg.get(n) !== 0) continue;
    ready.push(n);
    r.node(n).state = "frontier";
    r.work = [...ready];
    r.emit("Ready", fill("{n} has no arrows pointing in, so it is ready.", { n }), n);
  }
  while (ready.length > 0) {
    const x = ready.shift() as string;
    r.order.push(x);
    r.node(x).state = "current";
    r.node(x).order = r.order.length;
    r.work = [...ready];
    r.metric = `${r.order.length}/${total}`;
    r.emit("Take", fill("Take {x} from the ready list and add it to the output.", { x }), x);
    for (const { node: y } of neighboursOf(g, x, seed)) {
      const left = (indeg.get(y) ?? 0) - 1;
      indeg.set(y, left);
      r.node(y).value = String(left);
      r.edges[r.key(x, y)] = "consumed";
      r.emit(
        "Reduce",
        fill("Remove the arrow {x} to {y}: {y} now has {n} left.", { x, y, n: String(left) }),
        x,
        y,
      );
      if (left === 0) {
        ready.push(y);
        r.node(y).state = "frontier";
        r.work = [...ready];
        r.emit("Ready", fill("{y} has none left, so it is ready.", { y }), x, y);
      }
    }
    r.node(x).state = "done";
    r.emit("Finish", fill("{x} is placed.", { x }), x);
  }
  const left = g.nodes.filter((n) => !r.order.includes(n));
  if (left.length > 0) {
    // The nodes left over are all waiting on each other.
    for (const n of left) r.node(n).state = "frontier";
    r.note = left.join(" ");
    r.emit(
      "Stuck",
      fill("Nothing is ready, but {n} still wait on each other: there is a cycle.", {
        n: left.join(", "),
      }),
    );
    r.note = null;
    r.emit("Done", fill("No valid order exists.", {}));
  } else {
    r.emit("Done", fill("Order: {o}.", { o: r.order.join(", ") }));
  }
  return r.finish(left);
}
