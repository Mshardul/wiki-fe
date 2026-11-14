import { fill } from "../core/rich";
import { neighboursOf, normalise } from "./graphs";
import { pqPop, pqPush } from "./pq";
import { type GraphData, Recorder, type TraceEvent } from "./trace";

const INF = "∞";

export function dijkstraRun(input: GraphData, start: string, seed: number): TraceEvent[] {
  const g = normalise(input);
  const r = new Recorder(g);
  const dist = new Map<string, number>([[start, 0]]);
  const via = new Map<string, string>();
  const done = new Set<string>();
  let seq = 0;
  let relaxations = 0;
  for (const n of g.nodes) r.node(n).value = INF;
  r.metric = "0";
  r.emit("Start", fill("Start at {s}. Every other distance is unknown (∞).", { s: start }));
  r.node(start).value = "0";
  r.node(start).state = "frontier";
  r.pq = pqPush(r.pq, { dist: 0, node: start, seq: seq++ }).items;
  r.emit("Push", fill("{s} is at distance 0: push it on the priority queue.", { s: start }), start);
  while (r.pq.length > 0) {
    const out = pqPop(r.pq);
    const top = out.top;
    r.pq = out.items;
    r.popped = top;
    if (done.has(top.node)) {
      r.emit(
        "Stale",
        fill("{n} at {d} is out of date: {n} is already finished. Discard it.", {
          n: top.node,
          d: String(top.dist),
        }),
        top.node,
      );
      r.popped = null;
      continue;
    }
    r.order.push(top.node);
    r.node(top.node).state = "current";
    r.node(top.node).order = r.order.length;
    r.emit(
      "Pop",
      fill("Pop {n}, the closest unfinished node, at distance {d}.", {
        n: top.node,
        d: String(top.dist),
      }),
      top.node,
    );
    r.popped = null;
    for (const { node: n, weight } of neighboursOf(g, top.node, seed)) {
      const total = top.dist + weight;
      const old = dist.get(n);
      const k = r.key(top.node, n);
      const before = r.edges[k];
      r.edges[k] = "checking";
      r.emit(
        "Check",
        fill("Route to {n} through {x}: {d} + {w} = {t}, against {o}.", {
          n,
          x: top.node,
          d: String(top.dist),
          w: String(weight),
          t: String(total),
          o: old === undefined ? INF : String(old),
        }),
        top.node,
        n,
      );
      if (!done.has(n) && (old === undefined || total < old)) {
        const previous = via.get(n);
        if (previous !== undefined) r.edges[r.key(previous, n)] = "skipped";
        dist.set(n, total);
        via.set(n, top.node);
        relaxations++;
        r.metric = String(relaxations);
        r.node(n).value = String(total);
        if (r.node(n).state === "unseen") r.node(n).state = "frontier";
        r.edges[k] = "tree";
        r.pq = pqPush(r.pq, { dist: total, node: n, seq: seq++ }).items;
        r.emit(
          "Relax",
          fill("{t} is shorter: {n} is now {t} via {x}. Push it.", {
            t: String(total),
            n,
            x: top.node,
          }),
          top.node,
          n,
        );
      } else {
        r.edges[k] = before === "tree" ? "tree" : "skipped";
        r.emit("Keep", fill("Not shorter: {n} keeps its distance.", { n }), top.node, n);
      }
    }
    done.add(top.node);
    r.node(top.node).state = "done";
    r.emit(
      "Finish",
      fill("{n} is finished at distance {d}.", { n: top.node, d: String(top.dist) }),
      top.node,
    );
  }
  r.emit("Done", fill("The queue is empty: every reachable node has its shortest distance.", {}));
  return r.finish(g.nodes.filter((n) => !dist.has(n)));
}
