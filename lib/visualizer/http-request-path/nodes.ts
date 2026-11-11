import type { HttpPipelineNode } from "@/lib/visualizer/core/shapes";

export const HTTP_PIPELINE_NODES: Record<string, HttpPipelineNode> = {
  client: { name: "Client", sub: "browser / app" },
  alb: { name: "ALB", sub: "TLS, picks target" },
  nginx: { name: "nginx", sub: "reverse proxy" },
  gunicorn: { name: "gunicorn", sub: "4 sync workers" },
  metrics: { name: "Metrics", sub: "middleware", mw: true },
  auth: { name: "Auth", sub: "middleware", mw: true },
  ratelimit: { name: "Rate limit", sub: "middleware", mw: true },
  view: { name: "View", sub: "business logic", mw: true },
};

export const HTTP_PIPELINE_ORDER = [
  "client",
  "alb",
  "nginx",
  "gunicorn",
  "metrics",
  "auth",
  "ratelimit",
  "view",
] as const;

export const HTTP_ALL_IN = [...HTTP_PIPELINE_ORDER];
export const HTTP_OUT_ALL = [...HTTP_PIPELINE_ORDER].reverse();
