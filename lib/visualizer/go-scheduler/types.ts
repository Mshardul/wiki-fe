export type GoSegType = "run" | "syscall" | "park" | "poll" | "queued";

export interface GoSeg {
  s: number;
  e: number;
  type: GoSegType;
  label?: string;
  p?: string | null;
}

export interface GoLane {
  id: string;
  name?: string;
  segs: GoSeg[];
}

export interface GoMark {
  t: number;
  lane: string;
  label: string;
  info?: boolean;
}

export interface GoTrace {
  max: number;
  ps: string[];
  label?: string;
  lanes: GoLane[];
  marks?: GoMark[];
}

export type RunQueues = Record<string, string[]>;

export interface GoFrame {
  t: number;
  h: string;
  b: string;
  trace?: string;
  q?: RunQueues;
}

export interface GoScenario {
  id: string;
  tab: string;
  short: string;
  q: string;
  take: string;
  gen: string;
  traces: Record<string, GoTrace>;
  frames: GoFrame[];
}
