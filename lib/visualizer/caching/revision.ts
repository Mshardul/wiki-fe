import type { FlowEdge, FlowNode, FlowStyle } from "../core/flow";
import type { RevisionCard } from "../core/types";
import { STRATEGY_META } from "./copy";
import { STRATEGY_IDS, type StrategyId } from "./types";

const NODES: FlowNode[] = [
  { id: "app", kind: "client", label: "App" },
  { id: "cache", kind: "buffer", label: "Cache" },
  { id: "db", kind: "store", label: "DB" },
];
const NAME: Record<string, string> = { app: "App", cache: "Cache", db: "DB" };

type Hop = [from: string, to: string, style: FlowStyle, label: string];

interface FlowDef {
  hops: Hop[];
  summary: string;
  differs: string;
}

const FLOWS: Record<StrategyId, FlowDef> = {
  "cache-aside": {
    hops: [
      ["app", "cache", "solid", "get"],
      ["cache", "app", "dotted", "miss"],
      ["app", "db", "solid", "read"],
      ["db", "app", "solid", "value"],
      ["app", "cache", "solid", "set"],
    ],
    summary:
      "The app checks the cache first; on a miss it reads the database itself and then fills the cache.",
    differs:
      "The app owns the caching code and the cache never talks to the database. Simple, but a read racing a write can cache an old value.",
  },
  "read-through": {
    hops: [
      ["app", "cache", "solid", "get"],
      ["cache", "db", "dotted", "miss: load"],
      ["db", "cache", "solid", "value"],
      ["cache", "app", "solid", "value"],
    ],
    summary:
      "The app only ever talks to the cache; on a miss the cache loads from the database itself.",
    differs:
      "The same read path as cache-aside, but the cache owns the load, so the app code is simpler and misses are loaded in one place.",
  },
  "write-through": {
    hops: [
      ["app", "cache", "solid", "write"],
      ["cache", "db", "solid", "write"],
      ["db", "cache", "solid", "ack"],
      ["cache", "app", "solid", "ack"],
    ],
    summary: "Every write goes through the cache to the database before it is acknowledged.",
    differs:
      "Writes are slower than cache-aside's, but the cache is never stale after a write and nothing is lost if the cache crashes.",
  },
  "write-behind": {
    hops: [
      ["app", "cache", "solid", "write"],
      ["cache", "app", "solid", "ack"],
      ["cache", "db", "dashed", "flush later"],
    ],
    summary:
      "A write is acknowledged once it reaches the cache; the database is updated later in a batch.",
    differs:
      "The fastest writes, but anything still buffered in the cache is lost if it crashes before the flush.",
  },
  "write-around": {
    hops: [
      ["app", "db", "solid", "write"],
      ["db", "app", "solid", "ack"],
      ["app", "cache", "dotted", "read: miss"],
      ["app", "db", "solid", "read"],
    ],
    summary:
      "Writes go straight to the database and skip the cache; the cache only fills on reads.",
    differs:
      "Keeps rarely re-read data out of the cache, but the first read after a write is always a miss.",
  },
  "refresh-ahead": {
    hops: [
      ["app", "cache", "solid", "get"],
      ["cache", "app", "solid", "value"],
      ["cache", "db", "dashed", "refresh"],
      ["db", "cache", "dashed", "fresh value"],
    ],
    summary: "The cache reloads a hot entry in the background before it expires.",
    differs:
      "Readers rarely see a miss on hot keys, at the cost of extra database reads for entries that may not be read again.",
  },
};

const edgesOf = (hops: Hop[]): FlowEdge[] =>
  hops.map(([from, to, style, label], i) => ({ from, to, style, label, step: i + 1 }));

export function cachingRevision(): RevisionCard[] {
  return STRATEGY_IDS.map((id) => {
    const def = FLOWS[id];
    const edges = edgesOf(def.hops);
    const name = STRATEGY_META[id].name;
    return {
      id,
      name,
      steps: edges.length,
      render: (lit) => ({
        kind: "flow",
        flow: { nodes: NODES, edges, lit: Math.max(0, Math.min(lit, edges.length)) },
      }),
      stepsText: edges.map(
        (e) =>
          `${e.step}. ${NAME[e.from]} to ${NAME[e.to]}: ${e.label}${e.style === "solid" ? "" : e.style === "dashed" ? " (asynchronous)" : " (conditional)"}`,
      ),
      summary: def.summary,
      differs: def.differs,
    };
  });
}
