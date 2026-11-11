import { CACHING_ARTICLE } from "../eviction/module";

export const DATABASES_ARTICLE = "/system-design/components/databases/";
export const PROXIES_ARTICLE = "/system-design/components/proxies/";
export const LOAD_BALANCER_ARTICLE = "/system-design/components/load-balancer/";
export const DNS_ARTICLE = "/system-design/components/dns/";
export const MESSAGE_QUEUES_ARTICLE = "/system-design/components/message-queues/";

export const MECHANISM_VISUALIZER = {
  gil: "/visualizer/inside-the-python-gil/",
  asyncio: "/visualizer/inside-the-asyncio-event-loop/",
  redis: "/visualizer/inside-redis-single-thread/",
  go: "/visualizer/inside-the-go-scheduler/",
  mvcc: "/visualizer/inside-postgres-mvcc/",
  btree: "/visualizer/inside-a-b-tree-index/",
  wal: "/visualizer/inside-the-postgres-wal/",
  http: "/visualizer/inside-an-http-request/",
  kubectl: "/visualizer/inside-kubectl-apply/",
  k8sSvc: "/visualizer/inside-a-kubernetes-service/",
  podLimits: "/visualizer/inside-pod-resource-limits/",
  dns: "/visualizer/inside-dns-caching/",
  connCost: "/visualizer/cost-of-a-new-connection/",
  connPool: "/visualizer/inside-a-connection-pool/",
  stampede: "/visualizer/inside-a-cache-stampede/",
  celery: "/visualizer/inside-celery-prefetch/",
} as const;

export type MechanismSlug = keyof typeof MECHANISM_VISUALIZER;

/** Empty string: hide Read article until a dedicated corpus section exists (see manifest `expectReadArticle`). */
export const MECHANISM_ARTICLE_HREF: Record<MechanismSlug, string> = {
  gil: "",
  asyncio: "",
  redis: "",
  go: "",
  mvcc: `${DATABASES_ARTICLE}#production-failure-modes--gotchas`,
  btree: `${DATABASES_ARTICLE}#indexing`,
  wal: `${DATABASES_ARTICLE}#resilience--failure-handling`,
  http: `${PROXIES_ARTICLE}#forward-proxy-vs-reverse-proxy`,
  kubectl: "",
  k8sSvc: "",
  podLimits: "",
  dns: `${DNS_ARTICLE}#ttl-and-propagation-failures`,
  connCost: `${LOAD_BALANCER_ARTICLE}#connection-pooling--keep-alive-management`,
  connPool: `${LOAD_BALANCER_ARTICLE}#connection-pooling--keep-alive-management`,
  stampede: `${CACHING_ARTICLE}#cache-stampede--thundering-herd`,
  celery: `${MESSAGE_QUEUES_ARTICLE}#consumer-side-lag-mitigation`,
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
    { href: MECHANISM_VISUALIZER.stampede, label: "Inside a Cache Stampede" },
  ],
  go: [{ href: MECHANISM_VISUALIZER.asyncio, label: "Inside the asyncio Event Loop" }],
  mvcc: [
    { href: MECHANISM_VISUALIZER.btree, label: "Inside a B-tree Index" },
    { href: MECHANISM_VISUALIZER.wal, label: "Inside the Postgres WAL" },
  ],
  btree: [{ href: MECHANISM_VISUALIZER.mvcc, label: "Inside Postgres MVCC" }],
  wal: [{ href: MECHANISM_VISUALIZER.mvcc, label: "Inside Postgres MVCC" }],
  http: [
    { href: LOAD_BALANCER_ARTICLE, label: "Load balancer (article)" },
    { href: MECHANISM_VISUALIZER.connPool, label: "Inside a Connection Pool" },
  ],
  kubectl: [{ href: MECHANISM_VISUALIZER.k8sSvc, label: "Inside a Kubernetes Service" }],
  k8sSvc: [
    { href: MECHANISM_VISUALIZER.kubectl, label: "Inside kubectl apply" },
    { href: MECHANISM_VISUALIZER.dns, label: "Inside DNS Caching" },
  ],
  podLimits: [
    { href: MECHANISM_VISUALIZER.kubectl, label: "Inside kubectl apply" },
    { href: MECHANISM_VISUALIZER.k8sSvc, label: "Inside a Kubernetes Service" },
  ],
  dns: [
    { href: MECHANISM_VISUALIZER.connCost, label: "The Cost of a New Connection" },
    { href: MECHANISM_VISUALIZER.connPool, label: "Inside a Connection Pool" },
  ],
  connCost: [
    { href: MECHANISM_VISUALIZER.dns, label: "Inside DNS Caching" },
    { href: MECHANISM_VISUALIZER.connPool, label: "Inside a Connection Pool" },
  ],
  connPool: [
    { href: MECHANISM_VISUALIZER.connCost, label: "The Cost of a New Connection" },
    { href: MECHANISM_VISUALIZER.dns, label: "Inside DNS Caching" },
    { href: MECHANISM_VISUALIZER.http, label: "Inside an HTTP Request" },
  ],
  stampede: [{ href: MECHANISM_VISUALIZER.redis, label: "Inside Redis's Single Thread" }],
  celery: [{ href: MECHANISM_VISUALIZER.redis, label: "Inside Redis's Single Thread" }],
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
  kubectl: "kubectl apply",
  k8sSvc: "kubernetes service",
  podLimits: "pod resource limits",
  dns: "dns time to live",
  connCost: "tcp time wait",
  connPool: "keep-alive pool",
  stampede: "cache stampede",
  celery: "celery prefetch",
};

export function mechanismArticleHref(slug: MechanismSlug): string {
  return MECHANISM_ARTICLE_HREF[slug];
}

export function mechanismRelated(slug: MechanismSlug): { href: string; label: string }[] {
  return RELATED[slug];
}
