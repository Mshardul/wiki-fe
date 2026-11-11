import type {
  K8sServiceBackendRow,
  K8sServiceClientRow,
  K8sServiceEndpointRow,
  K8sServiceRuleRow,
} from "@/lib/visualizer/core/shapes";

export interface K8sServiceFrame {
  h: string;
  b: string;
  badge?: string;
  bad?: boolean;
  on?: string[];
  eps?: K8sServiceEndpointRow[];
  clients?: K8sServiceClientRow[];
  rules?: Record<string, K8sServiceRuleRow>;
  pods?: K8sServiceBackendRow[];
}

export interface K8sServiceScenario {
  id: string;
  tab: string;
  short: string;
  q: string;
  take: string;
  gen: string;
  frames: K8sServiceFrame[];
}
