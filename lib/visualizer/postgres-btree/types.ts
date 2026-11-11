import type { BtreeHighlight, BtreePageState } from "@/lib/visualizer/core/shapes";

export interface BtreeFrame {
  tree: string;
  h: string;
  b: string;
  plan: string;
  count: string;
  st?: Record<string, BtreePageState>;
  hl?: BtreeHighlight;
  hlBad?: boolean;
  dim?: boolean;
  probes?: number[];
  probeLabel?: string;
  links?: [number, number][];
  linkBad?: boolean;
  vm?: number[];
  heapAll?: BtreePageState;
  bad?: boolean;
}

export interface BtreeScenario {
  id: string;
  tab: string;
  short: string;
  q: string;
  take: string;
  gen: string;
  frames: BtreeFrame[];
}
