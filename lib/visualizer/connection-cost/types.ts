import type {
  ConnCostView,
  ConnLadderMsg,
  ConnLane,
  ConnMark,
  ConnPhase,
} from "@/lib/visualizer/core/shapes";

export interface ConnCostFrame {
  h: string;
  b: string;
  clock: string;
  badge?: string;
  bad?: boolean;
  term?: string;
  view?: ConnCostView;
  lanes?: ConnLane[];
  msgs?: ConnLadderMsg[];
  phases?: ConnPhase[];
  tmax?: number;
  now?: number;
  rtt?: number | null;
  marks?: ConnMark[];
  t?: number;
  fix?: boolean;
  why?: boolean;
}

export interface ConnCostScenario {
  id: string;
  tab: string;
  short: string;
  q: string;
  take: string;
  gen: string;
  view: ConnCostView;
  frames: ConnCostFrame[];
}
