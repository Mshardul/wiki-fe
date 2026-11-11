import type {
  K8sHubKubeletRow,
  K8sHubNodeRow,
  K8sHubObjectRow,
} from "@/lib/visualizer/core/shapes";

export interface KubectlFrame {
  h: string;
  b: string;
  badge?: string;
  bad?: boolean;
  api?: boolean;
  term?: string;
  objs?: K8sHubObjectRow[];
  nodes?: K8sHubNodeRow[];
  on?: Record<string, K8sHubKubeletRow>;
  kub?: Record<string, K8sHubKubeletRow | undefined>;
}

export interface KubectlScenario {
  id: string;
  tab: string;
  short: string;
  q: string;
  take: string;
  gen: string;
  frames: KubectlFrame[];
}
