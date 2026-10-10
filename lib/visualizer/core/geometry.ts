import type { Axis, CardSection, LeafModel } from "./shapes";

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
  const bh = Math.min(76, bw, Math.max(24, size.h - 96));
  const len = pitch * n;
  const x = (size.w - len) / 2;
  const y = Math.max(34, size.h / 2 - bh / 2 - 16);
  return {
    block: { w: bw, h: bh },
    frame: { x: x - 8, y: y - 10, w: len + 10, h: bh + 20 },
    slot: (i) => ({ x: x + i * pitch + 6, y }),
    exit: { x: size.w + 30, y },
    entryLabel: { x, y: y - 32 },
    exitLabel: { x: x + len - 70, y: y - 32 },
  };
}

export const LANES_W = 640;
export const CHIPS_PER_ROW = 3;
export const CARD_ROW_H = 15;
const CARD_PAD = 8;
const CARD_Y = 48;
const CARD_MAX_W = 190;
const HOP_PITCH = 36;
const HOP_GAP = 30;
const LANES_FOOT = 30;

export function sectionRows(s: CardSection): number {
  return 1 + (s.layout === "rows" ? s.items.length : Math.ceil(s.items.length / CHIPS_PER_ROW));
}

export interface LanesLayout {
  width: number;
  height: number;
  laneX: (i: number) => number;
  cardW: number;
  cardY: number;
  cardH: number;
  lifeTop: number;
  hopY: (i: number) => number;
  lifeBottom: number;
}

export function lanesLayout(laneCount: number, slots: number, cardRows: number): LanesLayout {
  const n = Math.max(1, laneCount);
  const cardH = cardRows > 0 ? CARD_PAD * 2 + cardRows * CARD_ROW_H : 0;
  const lifeTop = CARD_Y + cardH + 8;
  const firstHop = lifeTop + HOP_GAP;
  const lifeBottom = firstHop + Math.max(1, slots) * HOP_PITCH;
  return {
    width: LANES_W,
    height: lifeBottom + LANES_FOOT,
    laneX: (i) => (LANES_W * (i + 0.5)) / n,
    cardW: Math.min(CARD_MAX_W, LANES_W / n - 20),
    cardY: CARD_Y,
    cardH,
    lifeTop,
    hopY: (i) => firstHop + i * HOP_PITCH,
    lifeBottom,
  };
}

export interface TimelineSizing {
  ticks: number;
  rows: number;
  stack: number;
  lanes: number;
  labeled: boolean;
}
export type TimelineRung = "full" | "thin" | "scroll";
export interface TimelineLayout {
  rung: TimelineRung;
  width: number;
  height: number;
  pitch: number;
  labelEvery: number;
  markR: number;
  stackPitch: number;
  bandTop: number;
  axisY: number;
  spanTop: number;
  laneH: number;
  labelH: number;
  x: (tick: number) => number;
  cx: (tick: number) => number;
  rowTop: (row: number) => number;
  rowBase: (row: number) => number;
}

const TL_PAD = 14;
const TL_FULL = 36;
const TL_THIN = 14;
const TL_PITCH_MAX = 56;
const TL_LABEL_H = 13;
// Below this stage height (a Revision card) the timeline packs tighter so a composite fits.
const DENSE_BELOW_H = 260;

export const isDense = (size: Size): boolean => size.h < DENSE_BELOW_H;

// full labels at 36px per tick, thinned labels and smaller marks down to 14px, then horizontal scroll.
export function timelineLayout(
  size: Size,
  s: TimelineSizing,
  dense: boolean = isDense(size),
): TimelineLayout {
  const ticks = Math.max(1, s.ticks);
  const room = Math.max(0, size.w - TL_PAD * 2);
  const raw = room / ticks;
  const rung: TimelineRung = raw >= TL_FULL ? "full" : raw >= TL_THIN ? "thin" : "scroll";
  const pitch = rung === "scroll" ? TL_THIN : Math.min(raw, TL_PITCH_MAX);
  const left = rung === "scroll" ? TL_PAD : TL_PAD + Math.max(0, (room - ticks * pitch) / 2);
  const baseR = pitch >= 36 ? 8 : pitch >= 22 ? 6 : 5;
  const markR = dense ? Math.min(baseR, 6) : baseR;
  const stackPitch = markR * 2 + (dense ? 2 : 4);
  const rowH = Math.max(1, s.stack) * stackPitch + (dense ? 4 : 8) + (s.labeled ? TL_LABEL_H : 0);
  const bandTop = 4;
  const rowsTop = bandTop + (dense ? 16 : 22) + (dense ? 2 : 4);
  const axisY = rowsTop + Math.max(1, s.rows) * rowH + 2;
  // Clear of the tick numbers, which sit just under the axis, so an alert bracket never crosses them.
  const spanTop = axisY + (dense ? 28 : 32);
  const laneH = dense ? 16 : 20;
  return {
    rung,
    width: rung === "scroll" ? TL_PAD * 2 + ticks * pitch : size.w,
    height: spanTop + s.lanes * laneH + (dense ? 6 : 8),
    pitch,
    labelEvery: pitch >= 28 ? 1 : 2,
    markR,
    stackPitch,
    bandTop,
    axisY,
    spanTop,
    laneH,
    labelH: TL_LABEL_H,
    x: (t) => left + t * pitch,
    cx: (t) => left + t * pitch + pitch / 2,
    rowTop: (r) => rowsTop + r * rowH,
    rowBase: (r) => rowsTop + (r + 1) * rowH - markR - 3,
  };
}

const CHROME = 80;
const CHROME_MIN_H = 320;
const FLEX_MIN_H = 96;
const FLEX_MIN_H_DENSE = 90;
// Capped so a tall stage keeps the parts together instead of stranding one in a large gap.
const FLEX_MAX_H = 180;

// A timeline keeps its natural height; the other parts share what is left.
// A tall single-view stage reserves room for the metric and caption; a 200px revision card does not.
export function compositeHeights(size: Size, parts: LeafModel[]): number[] {
  const budget = size.h >= CHROME_MIN_H ? size.h - CHROME : size.h;
  const natural = parts.map((p) =>
    p.kind === "timeline"
      ? timelineLayout(size, {
          ticks: p.ticks,
          rows: p.rows.length,
          stack: p.stack,
          lanes: p.lanes,
          labeled: p.rows.some((r) => r.label !== ""),
        }).height
      : 0,
  );
  const flex = parts.filter((p) => p.kind !== "timeline").length;
  const rest = Math.max(0, budget - natural.reduce((a, b) => a + b, 0));
  return parts.map((p, i) =>
    p.kind === "timeline"
      ? (natural[i] ?? 0)
      : Math.min(
          isDense(size) ? Number.POSITIVE_INFINITY : FLEX_MAX_H,
          Math.max(
            isDense(size) ? FLEX_MIN_H_DENSE : FLEX_MIN_H,
            Math.floor(rest / Math.max(1, flex)),
          ),
        ),
  );
}
