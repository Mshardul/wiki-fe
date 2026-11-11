import type { CpuTimelineModel, ResourceCardRow } from "@/lib/visualizer/core/shapes";

export interface PodLimitsFrame {
  h: string;
  b: string;
  badge?: string;
  bad?: boolean;
  on?: string[];
  nodesTitle?: string;
  nodes?: ResourceCardRow[];
  ctrs: ResourceCardRow[];
  tl?: CpuTimelineModel;
  sum?: string[];
  term?: string;
}

export interface PodLimitsScenario {
  id: string;
  tab: string;
  short: string;
  q: string;
  take: string;
  gen: string;
  frames: PodLimitsFrame[];
}
