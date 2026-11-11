import type {
  ConnPoolEvent,
  ConnPoolLane,
  ConnPoolParty,
  ConnPoolView,
} from "@/lib/visualizer/core/shapes";

export interface ConnPoolFrame {
  h: string;
  b: string;
  clock: string;
  badge?: string;
  bad?: boolean;
  term?: string;
  view?: ConnPoolView;
  axis?: [number, number, number[]];
  now?: number;
  parties?: ConnPoolParty[];
  lane?: ConnPoolLane;
  ev?: ConnPoolEvent[];
  slots?: number;
  busy?: number;
  need?: string;
  queue?: number;
  fix?: boolean;
}

export interface ConnPoolScenario {
  id: string;
  tab: string;
  short: string;
  q: string;
  take: string;
  gen: string;
  view: ConnPoolView;
  frames: ConnPoolFrame[];
}
