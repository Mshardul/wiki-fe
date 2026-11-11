export type VisualizerKind = "compare" | "mechanism";

export interface VisualizerEntry {
  slug: string;
  title: string;
  description: string;
  icon: string;
  kind: VisualizerKind;
}

export const VISUALIZERS: VisualizerEntry[] = [
  {
    slug: "eviction-policies",
    title: "Eviction policies",
    description: "LRU, FIFO, LFU and CLOCK — watch what a full cache throws out, step by step.",
    icon: "🗃️",
    kind: "compare",
  },
  {
    slug: "caching-strategies",
    title: "Caching strategies",
    description:
      "Cache-aside, read-through, write-through, write-behind, write-around and refresh-ahead — watch each move data and see where it breaks.",
    icon: "⚡",
    kind: "compare",
  },
  {
    slug: "inside-an-http-request",
    title: "Inside an HTTP Request",
    description:
      "Step through the ALB → nginx → gunicorn → Django stack on the way in and back out — plus 401 short-circuits, 502 vs 504 timeouts, and a 50 MB upload.",
    icon: "🌐",
    kind: "mechanism",
  },
  {
    slug: "rate-limiting",
    title: "Rate limiting",
    description:
      "Fixed window, sliding log, sliding counter, token bucket and leaky bucket — one request stream, five ways to say no.",
    icon: "🚦",
    kind: "compare",
  },
  {
    slug: "inside-the-python-gil",
    title: "Inside the Python GIL",
    description:
      "Step through who holds the lock, then the cases where a CPU thread, a convoy, or a checkpoint breaks it.",
    icon: "🔒",
    kind: "mechanism",
  },
  {
    slug: "inside-the-asyncio-event-loop",
    title: "Inside the asyncio Event Loop",
    description:
      "Step through cooperative concurrency, then blocking I/O, CPU hogs, and why def endpoints differ from async def.",
    icon: "🔄",
    kind: "mechanism",
  },
  {
    slug: "inside-redis-single-thread",
    title: "Inside Redis's Single Thread",
    description:
      "Step through microsecond commands, then KEYS, I/O threads, and what fork does to latency and memory.",
    icon: "🔴",
    kind: "mechanism",
  },
  {
    slug: "inside-the-go-scheduler",
    title: "Inside the Go Scheduler",
    description:
      "Step through G-M-P, work stealing, blocking syscalls, netpoll, and async preemption since Go 1.14.",
    icon: "🐹",
    kind: "mechanism",
  },
  {
    slug: "inside-postgres-mvcc",
    title: "Inside Postgres MVCC",
    description:
      "Step through tuple versions, vacuum, xmin horizon bloat, HOT updates, and anti-wraparound freezing.",
    icon: "🐘",
    kind: "mechanism",
  },
  {
    slug: "inside-a-b-tree-index",
    title: "Inside a B-tree Index",
    description:
      "Step through index descent, leftmost prefix, skip scan, expression indexes, and index-only scans vs vacuum.",
    icon: "🌳",
    kind: "mechanism",
  },
  {
    slug: "inside-the-postgres-wal",
    title: "Inside the Postgres WAL",
    description:
      "Step through commit durability, synchronous_commit, crash replay, full-page images, and replication ack levels.",
    icon: "📜",
    kind: "mechanism",
  },
];

export function getVisualizer(slug: string): VisualizerEntry | undefined {
  return VISUALIZERS.find((v) => v.slug === slug);
}
