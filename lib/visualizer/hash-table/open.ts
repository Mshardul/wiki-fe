import { fill, type Rich } from "../core/rich";
import { homeOf, mathsOf, secondLine, secondOf, slotAt } from "./hash";
import type { Cell, Op, OpenBadge, OpenEvent, Scheme } from "./trace";

export interface OpenCtx {
  scheme: Scheme;
  size: number;
  cells: Cell[];
  old: Cell[] | null;
  oldAt: number | null;
  events: OpenEvent[];
}

const EMPTY: Cell = { state: "empty" };

export const emptyCells = (size: number): Cell[] => Array.from({ length: size }, () => EMPTY);

const copy = (cells: Cell[]): Cell[] => cells.map((c) => ({ ...c }));

type Fields = Partial<
  Pick<OpenEvent, "key" | "home" | "second" | "slot" | "tried" | "probes" | "placed">
>;

export function emit(ctx: OpenCtx, badge: OpenBadge, caption: Rich, f: Fields = {}): void {
  ctx.events.push({
    badge,
    caption,
    cells: copy(ctx.cells),
    old: ctx.old ? copy(ctx.old) : null,
    oldAt: ctx.oldAt,
    key: null,
    home: null,
    second: null,
    slot: null,
    tried: [],
    probes: 0,
    placed: null,
    used: ctx.cells.filter((c) => c.state !== "empty").length,
    ...f,
  });
}

// One op as events: hash (or move), then probes and hops until the walk ends.
export function openOp(ctx: OpenCtx, op: Op, first: "Hash" | "Move" = "Hash"): void {
  const { scheme, size } = ctx;
  const key = op.key;
  const home = homeOf(key, size);
  const second = scheme === "double" ? secondOf(key) : null;
  const ids = { key, home, second };
  const k = String(key);
  const maths = mathsOf(key, size);
  const extra = second === null ? "" : `, step ${secondLine(key)}`;
  const verb = { insert: "Insert", lookup: "Look up", delete: "Delete" }[op.kind];
  emit(
    ctx,
    first,
    first === "Move"
      ? fill(`Move {k} out of old slot {at}: {m}{x}.`, {
          k,
          at: String(ctx.oldAt ?? 0),
          m: maths,
          x: extra,
        })
      : fill(`{verb} {k}: {m}{x}.`, { verb, k, m: maths, x: extra }),
    ids,
  );
  const tried: number[] = [];
  let marker: number | null = null;
  for (let i = 0; i < size; i++) {
    const slot = slotAt(scheme, key, size, i);
    tried.push(slot);
    const cell = ctx.cells[slot] ?? EMPTY;
    const at = { ...ids, slot, tried: [...tried], probes: i + 1 };
    const s = String(slot);
    if (cell.state === "full") {
      emit(
        ctx,
        "Probe",
        fill(
          cell.key === key
            ? `Slot {s} holds {k}: a match.`
            : `Slot {s} holds {o}, not {k}: it is taken.`,
          { s, k, o: String(cell.key) },
        ),
        at,
      );
    } else if (cell.state === "marker") {
      emit(
        ctx,
        "Probe",
        fill(`Slot {s} is a marker for a deleted key: it never matches, so keep going.`, { s }),
        at,
      );
      if (marker === null) marker = slot;
    } else {
      emit(ctx, "Probe", fill(`Slot {s} is empty.`, { s }), at);
    }
    if (cell.state === "full" && cell.key === key) {
      if (op.kind === "insert") {
        emit(ctx, "Found", fill(`{k} is already stored, so nothing is added.`, { k }), at);
      } else {
        emit(ctx, "Found", fill(`Found {k} in slot {s}.`, { k, s }), at);
        if (op.kind === "delete") {
          ctx.cells[slot] = { state: "marker", key };
          emit(
            ctx,
            "Mark",
            fill(`Leave a marker in slot {s} so later walks do not stop early.`, { s }),
            at,
          );
        }
      }
      return;
    }
    if (cell.state === "empty") {
      if (op.kind === "insert") {
        const target = marker ?? slot;
        ctx.cells[target] = { state: "full", key };
        const t = String(target);
        emit(
          ctx,
          "Place",
          marker === null
            ? fill(`Put {k} in slot {t}.`, { k, t })
            : fill(`Put {k} in slot {t}, reusing the marker found earlier.`, { k, t }),
          { ...at, slot: target, placed: target },
        );
      } else {
        emit(ctx, "Not found", fill(`An empty slot ends the walk: {k} is not stored.`, { k }), at);
      }
      return;
    }
    if (i < size - 1) {
      const next = slotAt(scheme, key, size, i + 1);
      emit(ctx, "Hop", fill(`Move on to slot {n}.`, { n: String(next) }), {
        ...ids,
        slot: next,
        tried: [...tried, next],
        probes: i + 1,
      });
    }
  }
  const end = { ...ids, tried: [...tried], probes: size };
  if (op.kind === "insert") {
    if (marker !== null) {
      ctx.cells[marker] = { state: "full", key };
      emit(
        ctx,
        "Place",
        fill(`Put {k} in slot {t}, reusing the marker.`, { k, t: String(marker) }),
        { ...end, slot: marker, placed: marker },
      );
    } else {
      emit(
        ctx,
        "Stuck",
        fill(`After {n} probes no slot is free for {k}, even if some slots are empty.`, {
          n: String(size),
          k,
        }),
        end,
      );
    }
  } else {
    emit(
      ctx,
      "Not found",
      fill(`After {n} probes {k} is not stored.`, { n: String(size), k }),
      end,
    );
  }
}

export function openRun(ops: Op[], scheme: Scheme, size: number, start?: Cell[]): OpenEvent[] {
  const ctx: OpenCtx = {
    scheme,
    size,
    cells: start ? copy(start) : emptyCells(size),
    old: null,
    oldAt: null,
    events: [],
  };
  emit(ctx, "Start", fill(`An empty table of {n} slots.`, { n: String(size) }));
  for (const op of ops) openOp(ctx, op);
  emit(ctx, "Done", fill(`Done.`, {}));
  return ctx.events;
}
