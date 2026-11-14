import { fill } from "../core/rich";
import { neighboursOf, normalise } from "./graphs";
import { type GraphData, Recorder, type TraceEvent } from "./trace";

interface Frame {
  node: string;
  next: number;
  neighbours: string[];
}

export function dfsRun(input: GraphData, start: string, seed: number): TraceEvent[] {
  const g = normalise(input);
  const r = new Recorder(g);
  const total = g.nodes.length;
  const seen = new Set<string>();
  const frames: Frame[] = [];
  const top = (): Frame | undefined => frames[frames.length - 1];
  const stack = () => frames.map((f) => f.node).reverse();
  const visit = (n: string) => {
    seen.add(n);
    frames.push({ node: n, next: 0, neighbours: neighboursOf(g, n, seed).map((x) => x.node) });
    r.order.push(n);
    r.node(n).state = "current";
    r.node(n).order = r.order.length;
    r.work = stack();
    r.metric = `${r.order.length}/${total}`;
  };
  r.metric = `0/${total}`;
  r.emit("Start", fill("Start at {s}. The stack holds the path from the start.", { s: start }));
  visit(start);
  r.emit("Push", fill("Visit {s} and push it on the stack.", { s: start }), start);
  for (let f = top(); f; f = top()) {
    const n = f.neighbours[f.next];
    if (n !== undefined) {
      f.next++;
      const k = r.key(f.node, n);
      const before = r.edges[k];
      r.edges[k] = "checking";
      r.emit("Check", fill("Look at {n}, a neighbour of {x}.", { n, x: f.node }), f.node, n);
      if (!seen.has(n)) {
        r.node(f.node).state = "frontier";
        r.edges[k] = "tree";
        visit(n);
        r.emit("Push", fill("{n} is new: go there and push it.", { n }), n, f.node);
      } else {
        r.edges[k] = before === "tree" ? "tree" : "skipped";
        r.emit("Skip", fill("{n} was already seen, so skip it.", { n }), f.node, n);
      }
      continue;
    }
    frames.pop();
    r.node(f.node).state = "done";
    const back = top();
    if (back) r.node(back.node).state = "current";
    r.work = stack();
    r.emit(
      "Pop",
      back
        ? fill("{x} has no neighbours left: pop it and go back to {b}.", {
            x: f.node,
            b: back.node,
          })
        : fill("{x} has no neighbours left: pop it.", { x: f.node }),
      f.node,
    );
  }
  r.emit(
    "Done",
    fill("The stack is empty: every node reachable from {s} is visited.", { s: start }),
  );
  return r.finish(r.unseen());
}
