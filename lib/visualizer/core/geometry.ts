import type { Axis } from "./shapes";

export interface Size {
  w: number;
  h: number;
}
export interface Point {
  x: number;
  y: number;
}
export interface Rect extends Point, Size {}

export interface LinearLayout {
  block: Size;
  frame: Rect;
  slot: (i: number) => Point;
  exit: Point;
  entryLabel: Point;
  exitLabel: Point;
}

const GAP = 8;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function linearLayout(size: Size, capacity: number, axis: Axis): LinearLayout {
  const n = Math.max(1, capacity);
  if (axis === "vertical") {
    const bh = clamp((size.h - 140) / n - GAP, 28, 62);
    const bw = clamp(size.w * 0.18, 90, 150);
    const len = n * (bh + GAP);
    const x = (size.w - bw) / 2;
    const y = Math.max(50, (size.h - len) / 2 - 14);
    return {
      block: { w: bw, h: bh },
      frame: { x: x - 10, y: y - 8, w: bw + 20, h: len + 10 },
      slot: (i) => ({ x, y: y + i * (bh + GAP) }),
      exit: { x, y: size.h + 30 },
      entryLabel: { x: x + bw + 22, y: y + 8 },
      exitLabel: { x: x + bw + 22, y: y + (n - 1) * (bh + GAP) + bh / 2 - 6 },
    };
  }
  const pitch = clamp((size.w - 60) / n, 30, 96);
  const bw = pitch - 12;
  const bh = Math.min(76, bw);
  const len = pitch * n;
  const x = (size.w - len) / 2;
  const y = size.h / 2 - bh / 2 - 16;
  return {
    block: { w: bw, h: bh },
    frame: { x: x - 8, y: y - 10, w: len + 10, h: bh + 20 },
    slot: (i) => ({ x: x + i * pitch + 6, y }),
    exit: { x: size.w + 30, y },
    entryLabel: { x, y: y - 32 },
    exitLabel: { x: x + len - 70, y: y - 32 },
  };
}
