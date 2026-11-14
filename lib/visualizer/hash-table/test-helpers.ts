import type { Cell, ChainEvent, Op, OpenEvent } from "./trace";

export const cellsOf = (slots: (number | null | string)[]): Cell[] =>
  slots.map((s): Cell => {
    if (s === null) return { state: "empty" };
    if (typeof s === "string") return { state: "marker", key: Number(s.slice(1)) };
    return { state: "full", key: s };
  });

// Cells as keys, null for empty and "x8" for a marker that held 8.
export const keysOf = (cells: Cell[]): (number | null | string)[] =>
  cells.map((c) => (c.state === "empty" ? null : c.state === "full" ? c.key : `x${c.key}`));

export const ins = (...keys: number[]): Op[] => keys.map((key) => ({ kind: "insert", key }));

export const op = (kind: Op["kind"], key: number): Op => ({ kind, key });

// Badge with the slot where a slot matters, e.g. "Probe@3".
export const trail = (events: OpenEvent[]): string[] =>
  events.map((e) =>
    e.badge === "Probe" || e.badge === "Place" ? `${e.badge}@${e.slot}` : e.badge,
  );

export const chainBadges = (events: ChainEvent[]): string[] => events.map((e) => e.badge);

export const FIXTURE = [16, 8, 24, null, null, 5, null, null];
