export interface AsyncioSeg {
  s: number;
  e: number;
  type: "run" | "wait" | "io" | "thr";
  label?: string;
}

export interface AsyncioLane {
  id: string;
  name?: string;
  segs: AsyncioSeg[];
}

export interface AsyncioTrace {
  max: number;
  unit: string;
  label?: string;
  lanes: AsyncioLane[];
}

export interface AsyncioFrame {
  t: number;
  h: string;
  b: string;
  trace?: string;
  bad?: boolean;
}

export interface AsyncioScenario {
  id: string;
  tab: string;
  short: string;
  q: string;
  take: string;
  gen: string;
  traces: Record<string, AsyncioTrace>;
  frames: AsyncioFrame[];
}
