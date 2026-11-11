export interface CeleryChip {
  id: string;
  st: string;
  meta?: string;
}

export interface CeleryWorker {
  n: string;
  conc: number;
  limit: number;
  slots: (CeleryChip | null)[];
  buf: CeleryChip[];
  note?: string;
  bad?: boolean;
  st?: string;
}

export interface CeleryFrame {
  h: string;
  b: string;
  clock: string;
  badge?: string;
  bad?: boolean;
  term?: string;
  queue: CeleryChip[];
  unacked: CeleryChip[];
  workers: CeleryWorker[];
  done: CeleryChip[];
  on?: string[];
}

export interface CeleryScenario {
  id: string;
  tab: string;
  short: string;
  q: string;
  take: string;
  gen: string;
  frames: CeleryFrame[];
}
