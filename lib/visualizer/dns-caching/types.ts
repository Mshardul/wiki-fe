import type { DnsBoxRow, DnsExtraPanel, DnsTrafficTimeline } from "@/lib/visualizer/core/shapes";

export interface DnsFrame {
  h: string;
  b: string;
  clock: string;
  badge?: string;
  bad?: boolean;
  term?: string;
  boxes: DnsBoxRow[];
  req?: [number, number, string, string?][];
  answerArrows?: [number, number, string, string?][];
  extra?: DnsExtraPanel;
  tl: DnsTrafficTimeline;
}

export interface DnsScenario {
  id: string;
  tab: string;
  short: string;
  q: string;
  take: string;
  gen: string;
  frames: DnsFrame[];
}
