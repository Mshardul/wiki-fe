import { fill } from "../core/rich";
import { emit, emptyCells, type OpenCtx, openOp } from "./open";
import type { Op, OpenEvent } from "./trace";

const pct = (x: number): string => (Math.round(x * 100) / 100).toString();

// Open addressing with linear probing that doubles and rehashes once the load goes above the limit.
export function resizeRun(ops: Op[], size: number, threshold: number): OpenEvent[] {
  const ctx: OpenCtx = {
    scheme: "linear",
    size,
    cells: emptyCells(size),
    old: null,
    oldAt: null,
    events: [],
  };
  emit(ctx, "Start", fill(`An empty table of {n} slots.`, { n: String(size) }));
  for (const op of ops) {
    openOp(ctx, op);
    const placed = ctx.events[ctx.events.length - 1]?.badge === "Place";
    const used = ctx.cells.filter((c) => c.state !== "empty").length;
    if (op.kind !== "insert" || !placed || used / ctx.size <= threshold) continue;
    const next = ctx.size * 2;
    const note = fill(`{u} of {n} slots used is {l}, above {t}: build a table twice as big.`, {
      u: String(used),
      n: String(ctx.size),
      l: pct(used / ctx.size),
      t: pct(threshold),
    });
    const from = ctx.cells;
    ctx.old = from;
    ctx.cells = emptyCells(next);
    ctx.size = next;
    emit(ctx, "Grow", note);
    from.forEach((cell, s) => {
      if (cell.state !== "full") return;
      ctx.oldAt = s;
      openOp(ctx, { kind: "insert", key: cell.key }, "Move");
    });
    ctx.old = null;
    ctx.oldAt = null;
    emit(
      ctx,
      "Switch",
      fill(`The old table is dropped; the new one of {n} slots is live.`, { n: String(next) }),
    );
  }
  emit(ctx, "Done", fill(`Done.`, {}));
  return ctx.events;
}
