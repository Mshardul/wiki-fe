import { CACHING_ARTICLE } from "../eviction/module";

export const DATABASES_ARTICLE = "/system-design/components/databases/";
export const PROXIES_ARTICLE = "/system-design/components/proxies/";
export const LOAD_BALANCER_ARTICLE = "/system-design/components/load-balancer/";
export const ACID_ARTICLE = "/system-design/algorithms/acid-vs-base/";
export const TRACING_ARTICLE = "/system-design/components/tracing/";

export const MECHANISM_VISUALIZER = {
  gil: "/visualizer/inside-the-python-gil/",
  asyncio: "/visualizer/inside-the-asyncio-event-loop/",
  redis: "/visualizer/inside-redis-single-thread/",
  go: "/visualizer/inside-the-go-scheduler/",
  mvcc: "/visualizer/inside-postgres-mvcc/",
  btree: "/visualizer/inside-a-b-tree-index/",
  wal: "/visualizer/inside-the-postgres-wal/",
  http: "/visualizer/inside-an-http-request/",
} as const;

export type MechanismSlug = keyof typeof MECHANISM_VISUALIZER;

const ARTICLE_HREF: Record<MechanismSlug, string> = {
  gil: `${DATABASES_ARTICLE}#transactions--isolation-levels`,
  asyncio: `${TRACING_ARTICLE}#context-propagation-across-boundaries`,
  redis: `${CACHING_ARTICLE}#security--hardening`,
  go: `${TRACING_ARTICLE}#context-propagation-across-boundaries`,
  mvcc: `${DATABASES_ARTICLE}#production-failure-modes--gotchas`,
  btree: `${DATABASES_ARTICLE}#indexing`,
  wal: `${DATABASES_ARTICLE}#resilience--failure-handling`,
  http: `${PROXIES_ARTICLE}#forward-proxy-vs-reverse-proxy`,
};

const RELATED: Record<MechanismSlug, { href: string; label: string }[]> = {
  gil: [{ href: MECHANISM_VISUALIZER.asyncio, label: "Inside the asyncio Event Loop" }],
  asyncio: [
    { href: MECHANISM_VISUALIZER.gil, label: "Inside the Python GIL" },
    { href: MECHANISM_VISUALIZER.redis, label: "Inside Redis's Single Thread" },
  ],
  redis: [
    { href: MECHANISM_VISUALIZER.asyncio, label: "Inside the asyncio Event Loop" },
    { href: MECHANISM_VISUALIZER.gil, label: "Inside the Python GIL" },
  ],
  go: [{ href: MECHANISM_VISUALIZER.asyncio, label: "Inside the asyncio Event Loop" }],
  mvcc: [
    { href: MECHANISM_VISUALIZER.btree, label: "Inside a B-tree Index" },
    { href: MECHANISM_VISUALIZER.wal, label: "Inside the Postgres WAL" },
  ],
  btree: [{ href: MECHANISM_VISUALIZER.mvcc, label: "Inside Postgres MVCC" }],
  wal: [{ href: MECHANISM_VISUALIZER.mvcc, label: "Inside Postgres MVCC" }],
  http: [{ href: LOAD_BALANCER_ARTICLE, label: "Load balancer (article)" }],
};

export const MECHANISM_GLOSSARY_TERM: Record<MechanismSlug, string> = {
  gil: "global interpreter lock",
  asyncio: "asyncio event loop",
  redis: "redis command loop",
  go: "go scheduler",
  mvcc: "multi-version concurrency control",
  btree: "b-tree index",
  wal: "write-ahead log",
  http: "reverse proxy",
};

export function mechanismArticleHref(slug: MechanismSlug): string {
  return ARTICLE_HREF[slug];
}

export function mechanismRelated(slug: MechanismSlug): { href: string; label: string }[] {
  return RELATED[slug];
}
