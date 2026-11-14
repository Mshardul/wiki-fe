import { fill } from "../core/rich";
import { neighboursOf, normalise } from "./graphs";
import { type GraphData, Recorder, type TraceEvent } from "./trace";

export function bipartiteRun(input: GraphData, start: string, seed: number): TraceEvent[] {
  const g = normalise({ ...input, directed: input.directed });
  // Direction is ignored: an arrow still joins two nodes.
  const view: GraphData = { ...g, edges: g.edges, directed: false };
  const r = new Recorder(g);
  const total = g.nodes.length;
  const queue: string[] = [];
  let coloured = 0;
  const colour = (n: string, side: "a" | "b") => {
    r.node(n).side = side;
    r.node(n).state = "frontier";
    queue.push(n);
    r.work = [...queue];
    coloured++;
    r.metric = `${coloured}/${total}`;
  };
  const sideName = (s: "a" | "b" | undefined) => (s === "a" ? "colour 1" : "colour 2");
  r.metric = `0/${total}`;
  r.emit(
    "Start",
    fill("Give the start node a colour, then give every neighbour the other one.", {}),
  );
  colour(start, "a");
  r.emit("Colour", fill("Colour {s} with colour 1.", { s: start }), start);
  for (;;) {
    while (queue.length > 0) {
      const x = queue.shift() as string;
      r.work = [...queue];
      r.node(x).state = "current";
      r.emit("Dequeue", fill("Take {x} from the queue.", { x }), x);
      const mine = r.node(x).side;
      for (const { node: n } of neighboursOf(view, x, seed)) {
        const k = r.key(x, n);
        const before = r.edges[k];
        r.edges[k] = "checking";
        r.emit("Check", fill("Look at {n}, a neighbour of {x}.", { n, x }), x, n);
        const theirs = r.node(n).side;
        if (theirs === undefined) {
          colour(n, mine === "a" ? "b" : "a");
          r.edges[k] = "tree";
          r.emit(
            "Colour",
            fill("{n} is new: give it {c}, the opposite of {x}.", {
              n,
              x,
              c: sideName(r.node(n).side),
            }),
            x,
            n,
          );
        } else if (theirs !== mine) {
          r.edges[k] = before === "tree" ? "tree" : "skipped";
          r.emit("Fine", fill("{n} already has the opposite colour. That is fine.", { n }), x, n);
        } else {
          r.edges[k] = "conflict";
          r.emit(
            "Conflict",
            fill("{x} and {n} are neighbours with the same colour: an odd cycle.", { x, n }),
            x,
            n,
          );
          r.note = "not bipartite";
          r.emit("Done", fill("Not bipartite: no way to split the nodes into two colours.", {}));
          return r.finish(r.unseen());
        }
      }
      r.node(x).state = "done";
      r.emit("Finish", fill("{x} is done.", { x }), x);
    }
    const next = g.nodes.find((n) => r.node(n).side === undefined);
    if (next === undefined) break;
    colour(next, "a");
    r.emit(
      "Next component",
      fill("{n} is not connected to the nodes so far: start again from it.", { n: next }),
      next,
    );
  }
  r.note = "bipartite";
  r.emit("Done", fill("Bipartite: every edge joins the two colours.", {}));
  return r.finish([]);
}
