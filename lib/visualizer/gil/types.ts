export interface GilSeg {
  s: number;
  e: number;
  type: "run" | "wait" | "io";
  label?: string;
}

export interface GilLane {
  id: string;
  name?: string;
  segs: GilSeg[];
}

export interface GilMark {
  t: number;
  from?: string;
  to?: string;
  lane?: string;
  label?: string;
}

export interface GilTimer {
  lane: string;
  s: number;
  e: number;
}

export interface GilTick {
  lane: string;
  t: number;
  label?: string;
}

export interface GilTrace {
  max: number;
  unit: string | null;
  tickEvery?: number;
  label?: string;
  lanes: GilLane[];
  timers: GilTimer[];
  reqs: GilMark[];
  ticks: GilTick[];
  counter?: GilCount[];
}

export interface GilCount {
  t: number;
  v: string;
  note?: string;
  bad?: boolean;
}

export interface GilFrame {
  t: number;
  h: string;
  b: string;
  trace?: string;
}

export interface GilScenario {
  id: string;
  tab: string;
  short: string;
  q: string;
  take: string;
  gen: string;
  traces: Record<string, GilTrace>;
  frames: GilFrame[];
}
