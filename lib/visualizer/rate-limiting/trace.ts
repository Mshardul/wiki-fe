import { mulberry32 } from "../core/rng";
import { axisOf, MAX_REQUESTS, type Params, type Workload } from "./types";

const repeat = (tick: number, n: number): number[] => Array.from({ length: n }, () => tick);

// Independent of the algorithm, so one seed gives one stream under every algorithm; each workload is a whole motif sized to the axis.
export function generateTicks(workload: Workload, p: Params, seed: number): number[] {
  const rand = mulberry32(seed);
  const axis = axisOf(p, []);
  const last = axis - 1;
  let ticks: number[];
  if (workload === "steady") {
    ticks = [];
    for (let t = Math.floor(rand() * p.pace); t <= last; t += p.pace) ticks.push(t);
  } else if (workload === "burst") {
    const b = Math.floor(rand() * Math.floor(axis / 2));
    ticks = [...repeat(b, p.limit + 2), Math.min(last, b + p.window)];
  } else if (workload === "straddle") {
    const windows = Math.floor(axis / p.window);
    const b = (1 + Math.floor(rand() * (windows - 1))) * p.window;
    const after = p.limit + 1;
    ticks = [
      b - 2,
      ...repeat(b - 1, p.limit - 1),
      ...repeat(b, Math.ceil(after / 2)),
      ...repeat(b + 1, Math.floor(after / 2)),
      Math.min(last, b + p.window - 1),
    ];
  } else {
    const g = p.window + Math.floor(rand() * (axis - p.window));
    ticks = [...repeat(0, p.limit), ...repeat(g, p.limit + 1)];
  }
  return ticks.slice(0, MAX_REQUESTS);
}
