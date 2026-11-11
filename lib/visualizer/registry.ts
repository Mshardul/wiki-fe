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
  {
    slug: "inside-kubectl-apply",
    title: "Inside kubectl apply",
    description:
      "Step through declarative apply: the API server stores intent, then controllers and kubelets reconcile without talking to each other.",
    icon: "☸️",
    kind: "mechanism",
  },
  {
    slug: "inside-a-kubernetes-service",
    title: "Inside a Kubernetes Service",
    description:
      "Step through ClusterIP DNS, kube-proxy rules on every node, EndpointSlices, readiness, rollout races, and gRPC connection stickiness.",
    icon: "🔀",
    kind: "mechanism",
  },
  {
    slug: "inside-pod-resource-limits",
    title: "Inside Pod Resource Limits",
    description:
      "Step through scheduler requests vs cgroup limits: bursting, OOMKilled at the container cap, CPU CFS throttling, and kubelet eviction.",
    icon: "📊",
    kind: "mechanism",
  },
  {
    slug: "inside-dns-caching",
    title: "Inside DNS Caching",
    description:
      "Step through resolver chains, TTL countdowns per cache layer, stale IPs, late TTL cuts, and negative NXDOMAIN caching.",
    icon: "🔍",
    kind: "mechanism",
  },
  {
    slug: "cost-of-a-new-connection",
    title: "The Cost of a New Connection",
    description:
      "Step through TCP and TLS round trips, slow start, TIME_WAIT port exhaustion, session resumption, and 0-RTT replay risk.",
    icon: "🔌",
    kind: "mechanism",
  },
  {
    slug: "inside-a-connection-pool",
    title: "Inside a Connection Pool",
    description:
      "Step through keep-alive reuse, NLB silent drops, ALB vs uvicorn idle races, and client-side pool exhaustion.",
    icon: "🏊",
    kind: "mechanism",
  },
  {
    slug: "inside-a-cache-stampede",
    title: "Inside a Cache Stampede",
    description:
      "Step through cache-aside hits, a hot-key expiry under load, synchronized TTL avalanches, and single-flight vs jitter fixes.",
    icon: "🐂",
    kind: "mechanism",
  },
  {
    slug: "inside-celery-prefetch",
    title: "Inside Celery Prefetch",
    description:
      "Step through publish and reserve, head-of-line blocking, early vs late acks, and Redis visibility timeouts.",
    icon: "📬",
    kind: "mechanism",
  },
];

export function getVisualizer(slug: string): VisualizerEntry | undefined {
  return VISUALIZERS.find((v) => v.slug === slug);
}
