import type { K8sHubActorRow, K8sHubModel } from "@/lib/visualizer/core/shapes";
import { KUBECTL_ACTORS } from "./scenarios";
import type { KubectlFrame } from "./types";

export function frameModel(frame: KubectlFrame): K8sHubModel {
  const on = frame.on ?? {};
  const actors: K8sHubActorRow[] = KUBECTL_ACTORS.map((a) => ({
    ...a,
    ...(on[a.id] ? { on: on[a.id] } : {}),
  }));
  return {
    kind: "k8s-hub",
    actors,
    apiOn: Boolean(frame.api),
    objects: frame.objs ?? [],
    nodes: frame.nodes ?? [],
    kubelets: frame.kub ?? {},
    term: frame.term,
    badge: frame.badge ?? "",
    badgeBad: frame.bad,
  };
}
