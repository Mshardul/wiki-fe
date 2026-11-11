import type { MvccModel } from "@/lib/visualizer/core/shapes";
import type { MvccFrame } from "./types";

export function frameModel(frame: MvccFrame): MvccModel {
  return {
    kind: "mvcc",
    view: frame.view,
    txns: frame.txns ?? [],
    ...(frame.tuples ? { tuples: frame.tuples } : {}),
    ...(frame.indexes ? { indexes: frame.indexes } : {}),
    ...(frame.idx ? { idx: frame.idx } : {}),
    ...(frame.full ? { full: frame.full } : {}),
    ...(frame.log ? { log: frame.log } : {}),
    ...(frame.badge ? { badge: frame.badge } : {}),
    ...(frame.good ? { good: frame.good } : {}),
    ...(frame.table ? { table: frame.table } : {}),
    ...(frame.cells ? { cells: frame.cells } : {}),
    ...(frame.pages !== undefined ? { pages: frame.pages } : {}),
    ...(frame.now !== undefined ? { now: frame.now } : {}),
    ...(frame.frozen !== undefined ? { frozen: frame.frozen } : {}),
    ...(frame.trigger ? { trigger: frame.trigger } : {}),
    ...(frame.danger ? { danger: frame.danger } : {}),
    ...(frame.lost ? { lost: frame.lost } : {}),
  };
}
