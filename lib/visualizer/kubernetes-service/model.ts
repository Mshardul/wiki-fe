import type { K8sServiceModel } from "@/lib/visualizer/core/shapes";
import type { K8sServiceFrame } from "./types";

const ON = (ids: string[] | undefined) => new Set(ids ?? []);

export function frameModel(frame: K8sServiceFrame): K8sServiceModel {
  const active = ON(frame.on);
  const clients = (frame.clients ?? []).map((c) => ({
    ...c,
    on: active.has(c.n.split(" ").pop() ?? c.n),
  }));
  const backends = (frame.pods ?? []).map((p) => ({
    ...p,
    on: active.has(p.n),
  }));
  const rules = Object.fromEntries(
    Object.entries(frame.rules ?? {}).map(([node, r]) => [node, { ...r, on: active.has(node) }]),
  );
  return {
    kind: "k8s-service",
    badge: frame.badge ?? "",
    badgeBad: frame.bad,
    endpointsOn: active.has("eps"),
    endpoints: frame.eps ?? [],
    clients,
    rules,
    backends,
  };
}
