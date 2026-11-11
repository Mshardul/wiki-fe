export type StampedeView = "happy" | "hot" | "sync";

export type HotMode = "none" | "lock" | "swr" | "xfetch";

export interface StampedeFrame {
  h: string;
  b: string;
  clock: string;
  badge?: string;
  bad?: boolean;
  term?: string;
  to: number;
  arrows?: string[];
  mode?: HotMode | "fixed" | "jit";
  d?: number;
}

export interface StampedeScenario {
  id: string;
  tab: string;
  short: string;
  view: StampedeView;
  q: string;
  take: string;
  gen: string;
  frames: StampedeFrame[];
}
