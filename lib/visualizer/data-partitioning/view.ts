import { tallestStack } from "../core/bins-layout";
import { badText, goodText, keyText, type Rich } from "../core/rich";
import type {
  Bin,
  BinItem,
  CircleAnchor,
  CirclePoint,
  RunBrace,
  RunCell,
  ShapeModel,
  TableSlot,
} from "../core/shapes";
import type { VarRow } from "../core/types";
import {
  clockwiseIndex,
  hashKey,
  rendezvousScore,
  ringPoints,
  ringShares,
  VNODE_TABLE,
} from "./hash";
import { tokenOf } from "./keys";
import {
  HOT_WEIGHT,
  KEY_SPACE,
  type KeyItem,
  NODE_LETTERS,
  type PartEvent,
  type PartitionInput,
  type RangeSeg,
  weightOf,
} from "./types";

export interface Ctx {
  input: PartitionInput;
  steps: PartEvent[];
  keys: KeyItem[];
  // Cells in the tallest bin over the run, so Bins keeps one height.
  slots: number;
  // The largest node load over the run: the full length of the Circle's load bar.
  loadMax: number;
  // The most node rows any step shows, so the score table keeps one height.
  rows: number;
  // Owners before each node event, and where every key ends up after it.
  before: (string | null)[][];
  after: string[][];
}

export const hueOf = (letter: string): number => NODE_LETTERS.indexOf(letter);
const keyLabel = (item: KeyItem): string => `${item.key}`;
const heavyLabel = (item: KeyItem): string =>
  item.hot ? `${item.key} ×${HOT_WEIGHT}` : `${item.key}`;

function loadsOf(ctx: Ctx, s: PartEvent): Map<string, number> {
  const out = new Map<string, number>();
  s.owners.forEach((o, j) => {
    if (o !== null) out.set(o, (out.get(o) ?? 0) + weightOf(ctx.keys[j] as KeyItem));
  });
  return out;
}

export function makeCtx(input: PartitionInput, steps: PartEvent[], keys: KeyItem[]): Ctx {
  const before: (string | null)[][] = [];
  const after: string[][] = [];
  steps.forEach((s) => {
    if (s.phase === "event" && s.eventIndex !== null) before[s.eventIndex] = s.owners;
    if (s.phase === "recheck" && s.eventIndex !== null) {
      after[s.eventIndex] = after[s.eventIndex] ?? [];
      (after[s.eventIndex] as string[])[s.keyIndex as number] = s.owners[
        s.keyIndex as number
      ] as string;
    }
  });
  let slots = 1;
  let loadMax = 1;
  let rows = 1;
  const ctx: Ctx = { input, steps, keys, slots, loadMax, rows, before, after };
  for (const s of steps) {
    const nodes = shownNodes(s);
    rows = Math.max(rows, nodes.length);
    const loads = loadsOf(ctx, s);
    for (const n of nodes) {
      const mine = s.owners.flatMap((o, j) => (o === n ? [keys[j] as KeyItem] : []));
      slots = Math.max(slots, tallestStack([{ items: mine.map((k) => ({ heavy: k.hot })) }]));
      loadMax = Math.max(loadMax, loads.get(n) ?? 0);
    }
  }
  return { ...ctx, slots, loadMax, rows };
}

// Alive nodes plus the one leaving, in letter order.
export function shownNodes(s: PartEvent): string[] {
  const all = s.leaving && !s.nodes.includes(s.leaving) ? [...s.nodes, s.leaving] : [...s.nodes];
  return all.sort((a, b) => NODE_LETTERS.indexOf(a) - NODE_LETTERS.indexOf(b));
}

// Which keys have moved so far in the latest event.
function movedNow(ctx: Ctx, s: PartEvent): boolean[] {
  const base = s.eventIndex === null ? null : ctx.before[s.eventIndex];
  return s.owners.map(
    (o, j) =>
      base !== null &&
      base !== undefined &&
      s.phase === "recheck" &&
      !s.pending[j] &&
      o !== base[j],
  );
}

const stateOf = (s: PartEvent, node: string): Bin["state"] =>
  s.phase === "event" && s.joining === node ? "new" : s.leaving === node ? "removed" : undefined;

function itemsOf(ctx: Ctx, s: PartEvent, node: string, moved: boolean[]): BinItem[] {
  const mine = s.owners.flatMap((o, j) => (o === node ? [j] : []));
  const ordered = [...mine.filter((j) => !s.pending[j]), ...mine.filter((j) => s.pending[j])];
  return ordered.map((j) => {
    const k = ctx.keys[j] as KeyItem;
    return {
      id: `k${j}`,
      label: heavyLabel(k),
      ...(moved[j] ? { changed: true } : {}),
      ...(s.pending[j] ? { pending: true } : {}),
      ...(k.hot ? { heavy: true } : {}),
    };
  });
}

const activeId = (s: PartEvent): string | null => (s.keyIndex === null ? null : `k${s.keyIndex}`);

export function binsModel(ctx: Ctx, s: PartEvent): ShapeModel {
  const moved = movedNow(ctx, s);
  const loads = loadsOf(ctx, s);
  const bins: Bin[] = shownNodes(s).map((node) => {
    const state = stateOf(s, node);
    return {
      id: node,
      label: node,
      hue: hueOf(node),
      count: String(loads.get(node) ?? 0),
      ...(state ? { state } : {}),
      items: itemsOf(ctx, s, node, moved),
    };
  });
  return { kind: "bins", bins, slots: ctx.slots, active: activeId(s) };
}

const rangeText = (r: RangeSeg): string => `${r.lo}–${r.hi}`;
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

export function runsModel(ctx: Ctx, s: PartEvent): ShapeModel {
  const moved = movedNow(ctx, s);
  const placed = s.owners.flatMap((o, j) => (o === null ? [] : [j]));
  placed.sort((a, b) => (ctx.keys[a] as KeyItem).key - (ctx.keys[b] as KeyItem).key);
  const cells: RunCell[] = placed.map((j) => {
    const k = ctx.keys[j] as KeyItem;
    return {
      id: `k${j}`,
      label: keyLabel(k),
      hue: hueOf(s.owners[j] as string),
      ...(moved[j] ? { changed: true } : {}),
      ...(s.pending[j] ? { pending: true } : {}),
      ...(k.hot ? { heavy: true } : {}),
      ...(s.keyIndex === j ? { active: true } : {}),
    };
  });
  const keyAt = (cell: number): number => (ctx.keys[placed[cell] as number] as KeyItem).key;
  const braces: RunBrace[] = s.state.ranges.map((r) => {
    const inside = placed.flatMap((_, c) => (keyAt(c) >= r.lo && keyAt(c) <= r.hi ? [c] : []));
    const first = inside[0];
    const from = first ?? placed.filter((_, c) => keyAt(c) < r.lo).length;
    const to = inside.length > 0 ? (inside[inside.length - 1] as number) : from - 1;
    const state = s.phase === "event" && s.joining === r.node ? "new" : undefined;
    return {
      from,
      to,
      hue: hueOf(r.node),
      label: r.node,
      detail: rangeText(r),
      note: plural(inside.length, "key", "keys"),
      ...(state ? { state } : {}),
    };
  });
  return { kind: "runs", cells, braces };
}

export function circleModel(ctx: Ctx, s: PartEvent): ShapeModel {
  const size = KEY_SPACE;
  const v = ctx.input.vnodes;
  const points = ringPoints(s.nodes, v);
  const moved = movedNow(ctx, s);
  const loads = loadsOf(ctx, s);
  const placed = s.owners.filter((o) => o !== null).length;
  const total = [...loads.values()].reduce((a, b) => a + b, 0);
  const alive = Math.max(1, s.nodes.length);
  const top = Math.max(0, ...shownNodes(s).map((n) => loads.get(n) ?? 0));
  const ideal = total / alive;
  const arcs = points.map((p, i) => ({
    from: (points[(i - 1 + points.length) % points.length] as { pos: number }).pos,
    to: p.pos,
    hue: hueOf(p.node),
  }));
  const anchors: CircleAnchor[] = shownNodes(s).map((node) => {
    const row = VNODE_TABLE[node] ?? [];
    const load = loads.get(node) ?? 0;
    const state = stateOf(s, node);
    return {
      id: node,
      at: row[0] as number,
      label: node,
      hue: hueOf(node),
      count: String(load),
      load,
      extra: row.slice(1, v),
      ...(placed > 0 && s.nodes.length > 1 && load === top && load > ideal ? { hot: true } : {}),
      ...(state ? { state } : {}),
    };
  });
  const cps: CirclePoint[] = s.owners.flatMap((o, j) => {
    if (o === null) return [];
    const k = ctx.keys[j] as KeyItem;
    return [
      {
        id: `k${j}`,
        at: hashKey(k.key),
        label: keyLabel(k),
        hue: hueOf(o),
        ...(moved[j] ? { changed: true } : {}),
        ...(s.pending[j] ? { pending: true } : {}),
        ...(k.hot ? { heavy: true } : {}),
      },
    ];
  });
  let walk: { from: number; to: number } | null = null;
  if (s.keyIndex !== null && points.length > 0) {
    const from = hashKey((ctx.keys[s.keyIndex] as KeyItem).key);
    const to = (points[clockwiseIndex(points, from)] as { pos: number }).pos;
    if (to !== from) walk = { from, to };
  }
  return {
    kind: "circle",
    size,
    arcs,
    anchors,
    points: cps,
    active: activeId(s),
    walk,
    ideal,
    loadMax: ctx.loadMax,
  };
}

const emptySlot = (): TableSlot => ({ index: "", state: "empty", tone: "plain", nodes: [] });
const tableList = (slots: TableSlot[], title: string) => ({
  title,
  slots,
  hops: [],
  runs: [],
  room: 0,
  lane: false,
  compact: true,
  chip: null,
});

export function directoryModel(ctx: Ctx, s: PartEvent): ShapeModel {
  const moved = movedNow(ctx, s);
  const loads = loadsOf(ctx, s);
  const final = s.eventIndex === null ? undefined : ctx.after[s.eventIndex];
  const base = s.eventIndex === null ? undefined : ctx.before[s.eventIndex];
  const slots: TableSlot[] = ctx.keys.map((k, j) => {
    const owner = s.owners[j];
    if (owner === null || owner === undefined) return emptySlot();
    const goes = final !== undefined && base !== undefined && final[j] !== base[j];
    const queued = goes && s.pending[j] === true && s.keyIndex !== j;
    return {
      index: tokenOf(k),
      state: "filled",
      label: owner,
      ...(queued ? { note: `→ ${final?.[j]}` } : {}),
      tone: s.keyIndex === j ? "focus" : queued ? "warn" : "plain",
      nodes: [],
      hue: hueOf(owner),
      ...(moved[j] ? { changed: true } : {}),
    };
  });
  return {
    kind: "table",
    lists: [tableList(slots, "Directory")],
    meter: null,
    badges: shownNodes(s).map((n) => ({
      label: n,
      value: String(loads.get(n) ?? 0),
      hue: hueOf(n),
    })),
  };
}

export function scoresOf(s: PartEvent, key: number): { node: string; score: number }[] {
  return s.nodes.map((node) => ({ node, score: rendezvousScore(key, node) }));
}

export function rendezvousModel(ctx: Ctx, s: PartEvent): ShapeModel {
  const key = s.keyIndex === null ? null : (ctx.keys[s.keyIndex] as KeyItem).key;
  const winner = s.keyIndex === null ? null : s.owners[s.keyIndex];
  const slots: TableSlot[] = shownNodes(s).map((node) => {
    const gone = s.leaving === node && !s.nodes.includes(node);
    if (gone) return { index: node, state: "marked", tone: "plain", nodes: [], hue: hueOf(node) };
    const score = key === null ? null : rendezvousScore(key, node);
    const won = winner === node;
    return {
      index: node,
      state: "filled",
      label: score === null ? "–" : String(score),
      tone: won ? "focus" : "plain",
      nodes: [],
      hue: hueOf(node),
      ...(won
        ? { note: "wins" }
        : s.joining === node && s.phase === "event"
          ? { note: "new" }
          : {}),
    };
  });
  while (slots.length < ctx.rows) slots.push(emptySlot());
  return {
    kind: "table",
    lists: [tableList(slots, key === null ? "Scores" : `Scores for ${key}`)],
    meter: null,
  };
}

export function modelOf(ctx: Ctx, s: PartEvent): ShapeModel {
  switch (ctx.input.scheme) {
    case "mod-n":
      return binsModel(ctx, s);
    case "range":
      return runsModel(ctx, s);
    case "ring":
      return circleModel(ctx, s);
    case "directory":
      return directoryModel(ctx, s);
    case "rendezvous":
      return rendezvousModel(ctx, s);
  }
}

// ---- text ----------------------------------------------------------------

const join = (parts: [string, string][]): string => parts.map(([a, b]) => `${a} ${b}`).join(" · ");

const tail = (s: PartEvent): Rich =>
  s.phase !== "recheck"
    ? []
    : s.outcome === "bad"
      ? [" · ", badText(`was ${s.fromOwner}`)]
      : [" · ", goodText("stays")];

function ringHit(ctx: Ctx, s: PartEvent, hash: number): { node: string; text: string } {
  const points = ringPoints(s.nodes, ctx.input.vnodes);
  const p = points[clockwiseIndex(points, hash)] as { node: string; pos: number; r: number };
  return { node: p.node, text: ctx.input.vnodes > 1 ? `${p.node}·${p.r} at ${p.pos}` : p.node };
}

const eventName = (s: PartEvent): string => (s.joining ? `+${s.joining}` : `-${s.leaving}`);

function eventCaption(ctx: Ctx, s: PartEvent): Rich {
  const e = s.eventIndex as number;
  const adding = s.joining !== null;
  const node = (adding ? s.joining : s.leaving) as string;
  const head: Rich = [adding ? "Add " : "Remove ", keyText(node), ": "];
  const n = s.nodes.length;
  const ks = ctx.keys;
  switch (ctx.input.scheme) {
    case "mod-n":
      return [
        ...head,
        `N goes from ${adding ? n - 1 : n + 1} to `,
        keyText(String(n)),
        ". Every key is checked again.",
      ];
    case "range": {
      const prev = ctx.steps.filter((x) => x.phase === "event" && x.eventIndex === e - 1).at(0);
      const old = (prev?.state ?? ctx.steps[0]?.state)?.ranges ?? [];
      if (adding) {
        const r = s.state.ranges.find((x) => x.node === node);
        return [
          ...head,
          "the fullest range splits at its middle key; ",
          keyText(node),
          ` takes ${r ? rangeText(r) : ""}.`,
        ];
      }
      const gone = old.find((x) => x.node === node);
      const heir = s.state.ranges.find((x) => gone && gone.lo >= x.lo && gone.hi <= x.hi);
      return [
        ...head,
        "its range merges into ",
        keyText(heir?.node ?? "a neighbour"),
        heir ? `, which now covers ${rangeText(heir)}.` : ".",
      ];
    }
    case "ring":
      return adding
        ? [...head, "it takes the arcs just before its positions; only keys on those arcs move."]
        : [...head, "its arcs pass to the next positions clockwise."];
    case "directory": {
      const final = ctx.after[e] ?? [];
      const base = ctx.before[e] ?? [];
      const moving = ks.flatMap((k, j) => (final[j] !== base[j] ? [String(k.key)] : []));
      if (!adding) return [...head, "its keys go to the least-loaded survivors."];
      return moving.length === 0
        ? [...head, "the balancer finds nothing worth moving."]
        : [...head, "the balancer moves ", keyText(moving.join(", ")), " so loads even out."];
    }
    case "rendezvous":
      return adding
        ? [...head, "it scores every key; only keys it beats the old winner on move."]
        : [...head, "its keys go to their runner-up."];
  }
}

export function captionOf(ctx: Ctx, s: PartEvent): Rich {
  if (s.phase === "event") return eventCaption(ctx, s);
  const k = ctx.keys[s.keyIndex as number] as KeyItem;
  const owner = s.owners[s.keyIndex as number] as string;
  const h = hashKey(k.key);
  const kt = keyText(String(k.key));
  switch (ctx.input.scheme) {
    case "mod-n": {
      const n = s.nodes.length;
      return [`h(`, kt, `) = ${h} → ${h} mod ${n} = ${h % n} → `, keyText(owner), ...tail(s)];
    }
    case "range": {
      const r = s.state.ranges.find((x) => x.node === owner);
      return [
        kt,
        ` falls in ${owner}`,
        r ? ` [${rangeText(r)}]` : "",
        " → ",
        keyText(owner),
        ...tail(s),
      ];
    }
    case "ring": {
      const hit = ringHit(ctx, s, h);
      return [`h(`, kt, `) = ${h} → clockwise to `, keyText(hit.text), ...tail(s)];
    }
    case "directory": {
      if (s.phase === "place") {
        const loads = loadsOf(ctx, {
          ...s,
          owners: s.owners.map((o, j) => (j === s.keyIndex ? null : o)),
        });
        return [
          kt,
          " → ",
          keyText(owner),
          `, the least-loaded node (load ${loads.get(owner) ?? 0})`,
        ];
      }
      return [kt, s.outcome === "bad" ? ` moves ${s.fromOwner} → ` : " stays on ", keyText(owner)];
    }
    case "rendezvous": {
      const scores = scoresOf(s, k.key);
      return [
        `Scores for `,
        kt,
        `: ${join(scores.map((x) => [x.node, String(x.score)]))} → `,
        keyText(owner),
        " wins",
        ...tail(s),
      ];
    }
  }
}

// ---- variables -----------------------------------------------------------

const dash = "—";

function sharesText(ctx: Ctx, s: PartEvent): string {
  const shares = ringShares(ringPoints(s.nodes, ctx.input.vnodes));
  return s.nodes.map((n) => `${n} ${shares[n] ?? 0}%`).join(" · ");
}

function rangeOfKey(s: PartEvent, key: number): string {
  const r = s.state.ranges.find((x) => key >= x.lo && key <= x.hi);
  return r ? `${r.node} [${rangeText(r)}]` : dash;
}

function schemeRows(ctx: Ctx, s: PartEvent): VarRow[] {
  const k = s.keyIndex === null ? null : (ctx.keys[s.keyIndex] as KeyItem);
  const h = k ? hashKey(k.key) : null;
  switch (ctx.input.scheme) {
    case "mod-n":
      return [
        { name: "h(k)", value: h === null ? dash : String(h) },
        { name: "N", value: String(s.nodes.length) },
        { name: "h(k) mod N", value: h === null ? dash : String(h % s.nodes.length) },
      ];
    case "range":
      return [{ name: "Owning range", value: k ? rangeOfKey(s, k.key) : dash }];
    case "ring":
      return [
        { name: "h(k)", value: h === null ? dash : String(h) },
        { name: "First node clockwise", value: h === null ? dash : ringHit(ctx, s, h).text },
        { name: "Shares", value: sharesText(ctx, s) },
      ];
    case "directory": {
      const loads = loadsOf(ctx, s);
      return [
        {
          name: "Directory entry",
          value: k && s.keyIndex !== null ? `${k.key} → ${s.owners[s.keyIndex]}` : dash,
        },
        { name: "Loads", value: s.nodes.map((n) => `${n} ${loads.get(n) ?? 0}`).join(" · ") },
      ];
    }
    case "rendezvous": {
      if (!k)
        return [
          { name: "Scores", value: dash },
          { name: "Winner", value: dash },
          { name: "Runner-up", value: dash },
        ];
      const ranked = [...scoresOf(s, k.key)].sort(
        (a, b) => b.score - a.score || NODE_LETTERS.indexOf(a.node) - NODE_LETTERS.indexOf(b.node),
      );
      const [win, second] = ranked;
      return [
        { name: "Scores", value: join(scoresOf(s, k.key).map((x) => [x.node, String(x.score)])) },
        { name: "Winner", value: win ? `${win.node} ${win.score}` : dash },
        { name: "Runner-up", value: second ? `${second.node} ${second.score}` : dash },
      ];
    }
  }
}

export function varsOf(ctx: Ctx, s: PartEvent): VarRow[] {
  const k = s.keyIndex === null ? null : (ctx.keys[s.keyIndex] as KeyItem);
  const phase = s.phase === "place" ? "Place" : s.phase === "event" ? "Event" : "Re‑check";
  return [
    { name: "Phase", value: phase },
    { name: "Key", value: k ? heavyLabel(k) : dash },
    ...schemeRows(ctx, s),
    { name: "Node now", value: s.keyIndex === null ? dash : (s.owners[s.keyIndex] ?? dash) },
    { name: "Node before", value: s.phase === "recheck" ? (s.fromOwner ?? dash) : dash },
    { name: "Nodes", value: s.nodes.join(" ") },
    {
      name: "Moved this event",
      value: s.eventIndex === null ? dash : `${s.moved}/${ctx.keys.length}`,
    },
    { name: "Fewest possible", value: s.fewest === null ? dash : String(s.fewest) },
  ];
}

export const metricOf = (ctx: Ctx, s: PartEvent): string =>
  s.eventIndex === null ? dash : `${s.moved}/${ctx.keys.length}`;

export const labelOf = (ctx: Ctx, s: PartEvent): string =>
  s.keyIndex === null ? eventName(s) : keyLabel(ctx.keys[s.keyIndex] as KeyItem);
