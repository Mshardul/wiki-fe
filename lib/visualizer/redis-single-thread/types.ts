import type { LaneTrace } from "@/lib/visualizer/mechanism/lane-schedule";

export interface RedisFrame {
  t: number;
  h: string;
  b: string;
  trace?: string;
  info?: string;
  bad?: boolean;
}

export interface RedisScenario {
  id: string;
  tab: string;
  short: string;
  q: string;
  take: string;
  gen: string;
  traces: Record<string, LaneTrace>;
  frames: RedisFrame[];
}
