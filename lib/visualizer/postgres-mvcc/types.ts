import type { MvccIndex, MvccPageCells, MvccTuple, MvccTxn } from "@/lib/visualizer/core/shapes";

export interface MvccFrame {
  view: "page" | "pages" | "xid";
  h: string;
  b: string;
  txns?: MvccTxn[];
  tuples?: MvccTuple[];
  indexes?: MvccIndex[];
  idx?: boolean;
  full?: boolean;
  log?: string;
  badge?: string;
  good?: boolean;
  table?: string;
  cells?: MvccPageCells;
  pages?: number;
  now?: number;
  frozen?: boolean;
  trigger?: boolean;
  danger?: boolean;
  lost?: boolean;
}

export interface MvccScenario {
  id: string;
  tab: string;
  short: string;
  q: string;
  take: string;
  gen: string;
  frames: MvccFrame[];
}
