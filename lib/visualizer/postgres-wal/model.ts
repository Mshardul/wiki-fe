import type { WalModel } from "@/lib/visualizer/core/shapes";
import type { WalFrame } from "./types";

export function frameModel(frame: WalFrame): WalModel {
  return {
    kind: "wal",
    badge: frame.badge,
    clients: frame.clients ?? [],
    ...(frame.bad ? { bad: true } : {}),
    ...(frame.crash ? { crash: true } : {}),
    ...(frame.m ? { machine: frame.m } : {}),
    ...(frame.repl ? { repl: frame.repl } : {}),
  };
}
