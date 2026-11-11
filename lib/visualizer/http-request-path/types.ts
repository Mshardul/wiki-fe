import type { HttpToken } from "@/lib/visualizer/core/shapes";

export interface HttpPipelineFrame {
  h: string;
  b: string;
  down?: string[];
  up?: string[];
  active?: string;
  token: HttpToken;
  notes?: Record<string, string>;
  skip?: string[];
  fail?: string[];
  workers?: number[];
  limits?: Record<string, number>;
  clock?: number;
  fired?: string[];
  status?: string;
  statusErr?: boolean;
  order?: string[];
  banner?: string;
  buffer?: string;
  nginxMaxBody?: string;
}

export interface HttpPipelineScenario {
  id: string;
  tab: string;
  short: string;
  q: string;
  take: string;
  gen: string;
  frames: HttpPipelineFrame[];
}
