import { badText, fill, goodText, keyText, type Rich } from "../core/rich";
import type { ShapeModel } from "../core/shapes";
import type { VarRow, VizFrame } from "../core/types";
import { ALGORITHM_META } from "./copy";
import { passTicks, peakIn, runSteps, type Step } from "./engine";
import { formatEstimate } from "./format";
import type { AlgorithmId, Params } from "./types";
import { makeContext, viewOf } from "./view";

export interface BuiltRun {
  frames: VizFrame[];
  // The empty start state, for Revision's reset frame.
  empty: ShapeModel;
}

function varsOf(p: Params, s: Step, prevTick: number | null): VarRow[] {
  const common: VarRow[] = [
    { name: "request #", value: String(s.index + 1) },
    { name: "tick", value: String(s.tick) },
    { name: "ticks since last", value: prevTick === null ? "—" : String(s.tick - prevTick) },
  ];
  const a = s.after;
  if (a.kind === "fixed") {
    return [
      ...common,
      { name: "window", value: String(a.window) },
      { name: "count in window", value: String(a.counts[a.window] ?? 0) },
      { name: "limit", value: String(p.limit) },
    ];
  }
  if (a.kind === "counter") {
    return [
      ...common,
      { name: "previous count", value: String(a.previous) },
      { name: "weight", value: `${a.weight}/${p.window}` },
      { name: "current count", value: String(a.current) },
      { name: "estimate", value: formatEstimate(a.scaled, p.window) },
    ];
  }
  if (a.kind === "log") {
    return [
      ...common,
      { name: "timestamps kept", value: String(a.kept.length) },
      { name: "oldest kept", value: a.kept.length ? String(a.kept[0]) : "—" },
    ];
  }
  if (a.kind === "token") {
    return [
      ...common,
      { name: "tokens", value: String(a.tokens.length) },
      { name: "next refill in", value: a.nextIn === null ? "—" : String(a.nextIn) },
    ];
  }
  return [
    ...common,
    { name: "queued", value: String(a.queue.length) },
    { name: "processed", value: String(a.processed) },
    { name: "dropped", value: String(a.dropped) },
    { name: "waits (ticks)", value: s.wait ? `${s.wait.ticks} (leaves ${s.wait.leave})` : "—" },
  ];
}

export function buildFrames(
  id: AlgorithmId,
  params: Params,
  ticks: number[],
  opts: { compact?: boolean } = {},
): BuiltRun {
  const meta = ALGORITHM_META[id];
  const steps = runSteps(id, params, ticks);
  const ctx = makeContext(id, params, ticks, steps, opts.compact === true);
  const frames = steps.map((s): VizFrame => {
    const prev = s.index > 0 ? (steps[s.index - 1]?.tick ?? null) : null;
    const lead: Rich = s.gap ? [keyText(s.gap), " · "] : [];
    return {
      index: s.index,
      label: `t${s.tick}`,
      outcome: s.ok ? "good" : "bad",
      badge: (s.ok ? meta.okWord : meta.failWord).toUpperCase(),
      caption: [
        ...lead,
        keyText(`tick ${s.tick}`),
        " ",
        s.ok ? goodText(meta.okWord) : badText(meta.failWord),
        ` — ${s.detail}`,
      ],
      lines: meta.lines.map((l) => fill(l, { tick: String(s.tick) })),
      path: s.ok ? meta.paths.ok : meta.paths.bad,
      vars: varsOf(params, s, prev),
      logNote: [s.ok ? goodText(meta.okWord) : badText(meta.failWord)],
      metric: String(peakIn(passTicks(id, steps, s.index), params.window).best),
      model: viewOf(ctx, s.index),
    };
  });
  return { frames, empty: viewOf(ctx, -1) };
}
