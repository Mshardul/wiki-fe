import type { BtreeModel } from "@/lib/visualizer/core/shapes";
import { BTREE_TREES } from "./trees";
import type { BtreeFrame } from "./types";

export function frameModel(frame: BtreeFrame): BtreeModel {
  const tree = BTREE_TREES[frame.tree];
  if (!tree) throw new Error(`unknown btree layout: ${frame.tree}`);
  return {
    kind: "btree",
    tree,
    st: frame.st ?? {},
    plan: frame.plan,
    count: frame.count,
    ...(frame.hl ? { hl: frame.hl } : {}),
    ...(frame.hlBad ? { hlBad: frame.hlBad } : {}),
    ...(frame.dim ? { dim: frame.dim } : {}),
    ...(frame.probes ? { probes: frame.probes } : {}),
    ...(frame.probeLabel ? { probeLabel: frame.probeLabel } : {}),
    ...(frame.links ? { links: frame.links } : {}),
    ...(frame.linkBad ? { linkBad: frame.linkBad } : {}),
    ...(frame.vm ? { vm: frame.vm } : {}),
    ...(frame.heapAll ? { heapAll: frame.heapAll } : {}),
    ...(frame.bad ? { bad: frame.bad } : {}),
  };
}
