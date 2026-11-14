import { fill } from "../core/rich";
import { neighboursOf, normalise } from "./graphs";
import { type GraphData, Recorder, type TraceEvent } from "./trace";

export function bfsRun(input: GraphData, start: string, seed: number): TraceEvent[] {
  const g = normalise(input);
  const r = new Recorder(g);
  const total = g.nodes.length;
  const seen = new Set([start]);
  const queue = [start];
  r.metric = `0/${total}`;
  r.emit(
    "Start",
    fill("Start at {s}. The queue holds the nodes waiting to be visited.", { s: start }),
  );
  r.node(start).state = "frontier";
  r.work = [...queue];
  r.emit("Enqueue", fill("Put {s} in the queue.", { s: start }), start);
  while (queue.length > 0) {
    const x = queue.shift() as string;
    r.order.push(x);
    r.node(x).state = "current";
    r.node(x).order = r.order.length;
    r.work = [...queue];
    r.metric = `${r.order.length}/${total}`;
    r.emit("Dequeue", fill("Take {x} from the front of the queue and visit it.", { x }), x);
    for (const { node: n } of neighboursOf(g, x, seed)) {
      const k = r.key(x, n);
      const before = r.edges[k];
      r.edges[k] = "checking";
      r.emit("Check", fill("Look at {n}, a neighbour of {x}.", { n, x }), x, n);
      if (!seen.has(n)) {
        seen.add(n);
        r.node(n).state = "frontier";
        queue.push(n);
        r.work = [...queue];
        r.edges[k] = "tree";
        r.emit("Discover", fill("{n} is new, so put it in the queue.", { n }), x, n);
      } else {
        r.edges[k] = before === "tree" ? "tree" : "skipped";
        r.emit("Skip", fill("{n} was already seen, so skip it.", { n }), x, n);
      }
    }
    r.node(x).state = "done";
    r.emit("Finish", fill("{x} has no more neighbours to look at.", { x }), x);
  }
  r.emit(
    "Done",
    fill("The queue is empty: every node reachable from {s} is visited.", { s: start }),
  );
  return r.finish(r.unseen());
}
