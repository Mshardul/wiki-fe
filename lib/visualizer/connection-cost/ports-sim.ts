const PORTS = 28232;
const TW = 60;
const RATE = 1000;

const dt = 0.1;
const steps = 1200;
let free = PORTS;
const rel = new Array(steps + 700).fill(0) as number[];
const ok: number[] = [];
const tw: number[] = [];

for (let i = 0; i < steps; i++) {
  free += rel[i]!;
  const want = RATE * dt;
  const got = Math.min(free, want);
  free -= got;
  rel[i + TW / dt]! += got;
  ok.push(got / dt);
  tw.push(PORTS - free);
}

export const CONN_PORTS_TOTAL = PORTS;
export const CONN_PORTS_RATE = RATE;

export function portUsageAt(t: number, fix?: boolean): { used: number; full: boolean } {
  if (fix) return { used: 2, full: false };
  if (t <= 0) return { used: 0, full: false };
  const idx = Math.min(tw.length - 1, Math.max(0, Math.round(t / dt) - 1));
  const used = tw[idx] ?? 0;
  return { used, full: used >= PORTS - 1 };
}

export function portRateSeries(limitSec: number, fix?: boolean): [number, number][] {
  const out: [number, number][] = [];
  const lim = Math.min(limitSec, 120);
  for (let i = 0; i * dt < lim; i++) {
    const v = fix ? RATE : (ok[i] ?? 0);
    out.push([i * dt, v]);
  }
  return out;
}
