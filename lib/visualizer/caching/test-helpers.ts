import type { CardItem, LanesModel } from "../core/shapes";
import type { VizFrame } from "../core/types";
import { simulate } from "./engine";
import { opsOf } from "./tokens";
import type { Params, StrategyDef } from "./types";

export const P: Params = { lifetime: 5, flushEvery: 3 };

export function run(def: StrategyDef, tokens: string, params: Params = P, keys = 3): VizFrame[] {
  return simulate(def, opsOf(tokens.split(" ").filter(Boolean)), params, keys);
}

export function at(frames: VizFrame[], i: number): VizFrame {
  const f = frames[i];
  if (!f) throw new Error(`no frame ${i}`);
  return f;
}

export function lanes(f: VizFrame): LanesModel {
  if (f.model.kind !== "lanes") throw new Error("not a lanes model");
  return f.model;
}

export const labels = (f: VizFrame): string[] => lanes(f).hops.map((h) => h.label);
export const badges = (frames: VizFrame[]): string[] => frames.map((f) => f.badge);
export const metrics = (frames: VizFrame[]): string[] => frames.map((f) => f.metric);
export const varOf = (f: VizFrame, name: string): string | undefined =>
  f.vars.find((v) => v.name === name)?.value;

export function section(f: VizFrame, laneId: string, title: string): CardItem[] {
  const lane = lanes(f).lanes.find((l) => l.id === laneId);
  return lane?.sections.find((s) => s.title === title)?.items ?? [];
}
