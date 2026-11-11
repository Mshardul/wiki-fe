import type { WalClient, WalMachine, WalReplica } from "@/lib/visualizer/core/shapes";

export interface WalFrame {
  h: string;
  b: string;
  badge: string;
  bad?: boolean;
  crash?: boolean;
  clients?: WalClient[];
  m?: WalMachine;
  repl?: WalReplica;
}

export interface WalScenario {
  id: string;
  tab: string;
  short: string;
  q: string;
  take: string;
  gen: string;
  frames: WalFrame[];
}
