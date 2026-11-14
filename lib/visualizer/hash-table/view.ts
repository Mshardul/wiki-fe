import type { ArrayTone, TableHop, TableList, TableModel, TableSlot } from "../core/shapes";
import type { VarRow } from "../core/types";
import { mathsOf, offsetOf, runsOf, secondLine } from "./hash";
import type { Cell, ChainEvent, OpenEvent, Scheme } from "./trace";

export interface ViewCtx {
  // The probing scheme, or "chain" for chaining.
  scheme: Scheme | "chain";
  // Longest chain over the whole run, so the layout never moves.
  maxChain: number;
  // The load the meter marks, for Resize only.
  threshold: number | null;
  // Meter scale: 1 for open addressing, the run's peak load rounded up for chaining.
  meterMax: number;
}

const ratio = (x: number): string => String(Math.round(x * 100) / 100);

const slotOf = (cell: Cell, i: number, tone: ArrayTone): TableSlot => ({
  index: String(i),
  state: cell.state === "full" ? "filled" : cell.state === "marker" ? "marked" : "empty",
  ...(cell.state === "full" ? { label: String(cell.key) } : {}),
  tone,
  nodes: [],
});

// One tone function for the live table: probing now rings, probed and taken waits, placed is done.
function toneOf(ev: OpenEvent, i: number): ArrayTone {
  const probed = ev.tried.slice(0, ev.probes);
  const last = probed[probed.length - 1];
  switch (ev.badge) {
    case "Hash":
    case "Move":
      return i === ev.home ? "accent" : "plain";
    case "Probe":
      return i === last ? "focus" : probed.includes(i) ? "warn" : "plain";
    case "Hop":
    case "Not found":
    case "Stuck":
      return probed.includes(i) ? "warn" : "plain";
    case "Place":
    case "Found":
    case "Mark":
      return i === (ev.placed ?? ev.slot) ? "good" : probed.includes(i) ? "warn" : "plain";
    default:
      return "plain";
  }
}

const inWalk = (b: OpenEvent["badge"]): boolean =>
  b === "Probe" ||
  b === "Hop" ||
  b === "Place" ||
  b === "Found" ||
  b === "Mark" ||
  b === "Not found" ||
  b === "Stuck";

export function openModelOf(ev: OpenEvent, ctx: ViewCtx): TableModel {
  const scheme = ctx.scheme === "chain" ? "linear" : ctx.scheme;
  const size = ev.cells.length;
  const hops: TableHop[] = [];
  if (ev.key !== null && ev.home !== null && inWalk(ev.badge)) {
    for (let i = 1; i < ev.tried.length; i++) {
      hops.push({
        from: ev.home,
        to: ev.tried[i] ?? 0,
        label: `+${offsetOf(scheme, ev.key, i)}`,
        current: i === ev.tried.length - 1,
      });
    }
  }
  const lines = ev.key === null ? [] : [mathsOf(ev.key, size)];
  if (ev.key !== null && scheme === "double") lines.push(secondLine(ev.key));
  const live: TableList = {
    slots: ev.cells.map((c, i) =>
      slotOf(c, i, ev.badge === "Switch" ? (c.state === "full" ? "good" : "plain") : toneOf(ev, i)),
    ),
    hops,
    runs: runsOf(ev.cells),
    room: 0,
    lane: true,
    chip: ev.key === null ? null : { label: String(ev.key), lines, to: ev.home },
  };
  const lists: TableList[] = [];
  if (ev.old) {
    lists.push({
      slots: ev.old.map((c, i) => slotOf(c, i, i === ev.oldAt ? "accent" : "plain")),
      hops: [],
      runs: [],
      room: 0,
      lane: true,
      faded: true,
      chip: null,
    });
  }
  lists.push(live);
  return {
    kind: "table",
    lists,
    meter: {
      label: "load",
      value: ev.used / size,
      max: ctx.meterMax,
      mark: ctx.threshold,
      ...(ctx.threshold === null ? {} : { markLabel: ratio(ctx.threshold) }),
    },
  };
}

export function chainModelOf(ev: ChainEvent, ctx: ViewCtx): TableModel {
  const size = ev.chains.length;
  const live = ev.key !== null && ev.home !== null;
  const slots: TableSlot[] = ev.chains.map((chain, i) => {
    const home = live && i === ev.home;
    const tone: ArrayTone = !home
      ? "plain"
      : ev.badge === "Hash"
        ? "accent"
        : ev.badge === "Not found"
          ? "warn"
          : "accent";
    const nodes = chain.map((key, k) => {
      let nodeTone: ArrayTone = "plain";
      let outlined = false;
      if (home) {
        const seen = ev.badge === "Unlink" ? ev.walked - 1 : ev.walked;
        outlined = k < seen;
        if (ev.badge === "Walk" && k === ev.walking) nodeTone = "focus";
        if (ev.badge === "Found" && k === ev.walking) nodeTone = "good";
        if (ev.badge === "Place" && k === ev.placed) nodeTone = "good";
      }
      return { label: String(key), tone: nodeTone, ...(outlined ? { outlined } : {}) };
    });
    return {
      index: String(i),
      state: chain.length === 0 ? "empty" : "filled",
      tone,
      nodes,
    };
  });
  const items = ev.chains.reduce((n, c) => n + c.length, 0);
  return {
    kind: "table",
    lists: [
      {
        slots,
        hops: [],
        runs: [],
        room: ctx.maxChain,
        lane: false,
        chip:
          ev.key === null
            ? null
            : { label: String(ev.key), lines: [mathsOf(ev.key, size)], to: ev.home },
      },
    ],
    meter: { label: "load", value: items / size, max: ctx.meterMax, mark: null },
  };
}

// Run-wide numbers the chaining picture needs so nothing rescales between frames.
export function chainCtx(events: ChainEvent[]): ViewCtx {
  let maxChain = 1;
  let peak = 0;
  for (const e of events) {
    const items = e.chains.reduce((n, c) => n + c.length, 0);
    peak = Math.max(peak, items / e.chains.length);
    for (const c of e.chains) maxChain = Math.max(maxChain, c.length);
  }
  return { scheme: "chain", maxChain, threshold: null, meterMax: Math.max(1, Math.ceil(peak)) };
}

export function openVarsOf(ev: OpenEvent, ctx: ViewCtx): VarRow[] {
  const size = ev.cells.length;
  const rows: VarRow[] = [
    { name: "probe", value: String(ev.probes) },
    { name: "slot", value: ev.slot === null ? "—" : String(ev.slot) },
  ];
  if (ctx.scheme === "double") {
    rows.push({ name: "step", value: ev.second === null ? "—" : String(ev.second) });
  }
  rows.push({ name: "load", value: `${ev.used} / ${size} = ${ratio(ev.used / size)}` });
  return rows;
}

export function chainVarsOf(ev: ChainEvent): VarRow[] {
  const size = ev.chains.length;
  const items = ev.chains.reduce((n, c) => n + c.length, 0);
  const home = ev.home;
  return [
    { name: "slot", value: home === null ? "—" : String(home) },
    { name: "walked", value: String(ev.walked) },
    { name: "chain length", value: home === null ? "—" : String(ev.chains[home]?.length ?? 0) },
    { name: "load", value: `${items} / ${size} = ${ratio(items / size)}` },
  ];
}

export const openMetricOf = (ev: OpenEvent): string => String(ev.probes);
export const chainMetricOf = (ev: ChainEvent): string => String(ev.walked);
