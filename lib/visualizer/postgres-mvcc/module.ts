import type { InputValues } from "@/lib/visualizer/core/fields";
import type { Rich } from "@/lib/visualizer/core/rich";
import { keyText } from "@/lib/visualizer/core/rich";
import type { ScheduleSwatch } from "@/lib/visualizer/core/shapes";
import type {
  InfoContent,
  RunResult,
  VisualizerModule,
  VizFrame,
} from "@/lib/visualizer/core/types";
import { frameModel } from "./model";
import { POSTGRES_MVCC_SCENARIOS } from "./scenarios";
import type { MvccScenario } from "./types";

export const MVCC_KICKER = "PostgreSQL 16+ · default autovacuum settings";
export const MVCC_FOOTNOTE = "Transaction IDs, row counts and page counts are illustrative.";

export const MVCC_LEGEND: { label: string; swatch: ScheduleSwatch }[] = [
  { label: "Live version", swatch: "mvcc-live" },
  { label: "Written, not yet committed", swatch: "mvcc-new" },
  { label: "Dead (struck through)", swatch: "mvcc-dead" },
  { label: "Dead but pinned by an open transaction", swatch: "mvcc-pinned" },
  { label: "Free space", swatch: "mvcc-free" },
];

function richFromHtml(html: string): Rich {
  const out: Rich = [];
  const re = /<code>(.*?)<\/code>/g;
  let last = 0;
  for (const match of html.matchAll(re)) {
    const at = match.index ?? 0;
    if (at > last) out.push(html.slice(last, at));
    out.push(keyText(match[1] ?? ""));
    last = at + match[0].length;
  }
  if (last < html.length) out.push(html.slice(last));
  return out.length > 0 ? out : [html];
}

function scenarioOf(values: InputValues): MvccScenario {
  const id = String(values.scenario ?? "happy");
  const found = POSTGRES_MVCC_SCENARIOS.find((s) => s.id === id) ?? POSTGRES_MVCC_SCENARIOS[0];
  if (!found) throw new Error("postgres mvcc scenarios missing");
  return found;
}

function infoFor(sc: MvccScenario): InfoContent {
  return {
    heading: sc.q,
    name: sc.short,
    chip: sc.tab,
    rule: sc.q,
    about: [
      ["Takeaway", sc.take],
      ["Generalizes to", sc.gen],
    ],
    tries: [],
    articleHref: "",
  };
}

export function postgresMvccFrames(sc: MvccScenario): VizFrame[] {
  return sc.frames.map((frame, index) => ({
    index,
    label: frame.h,
    outcome: "good",
    badge: frame.badge ?? "",
    caption: [frame.h],
    lines: [richFromHtml(frame.b)],
    path: [],
    vars: [],
    logNote: [],
    metric: "",
    model: frameModel(frame),
  }));
}

export function runPostgresMvcc(values: InputValues): RunResult {
  const sc = scenarioOf(values);
  return {
    frames: postgresMvccFrames(sc),
    info: infoFor(sc),
    metricLabel: "",
    sequence: [],
  };
}

export const postgresMvccModule: VisualizerModule = {
  slug: "inside-postgres-mvcc",
  title: "Inside Postgres MVCC",
  subtitle:
    "Every UPDATE writes a new tuple version; vacuum reclaims dead ones when no snapshot needs them. Step through a normal update, xmin horizon bloat, HOT updates, and XID freezing.",
  unit: "step",
  subject: "Postgres",
  kicker: MVCC_KICKER,
  legend: MVCC_LEGEND,
  footnote: MVCC_FOOTNOTE,
  variants: { key: "scenario", restartOnSwitch: true },
  sections: [
    {
      title: "Scenario",
      fields: [
        {
          key: "scenario",
          label: "Scenario",
          param: "s",
          hideLabel: true,
          kind: "chips",
          options: POSTGRES_MVCC_SCENARIOS.map((s) => ({
            value: s.id,
            label: s.tab,
            detail: s.short,
          })),
        },
      ],
    },
  ],
  defaults: () => ({ scenario: "happy" }),
  run: runPostgresMvcc,
};
