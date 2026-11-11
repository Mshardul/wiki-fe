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
import { POSTGRES_BTREE_SCENARIOS } from "./scenarios";
import type { BtreeScenario } from "./types";

export const BTREE_KICKER = "PostgreSQL 17 · PostgreSQL 18 where skip scan changes the answer";
export const BTREE_FOOTNOTE =
  "A real index on 1 million rows has hundreds of leaf pages and a few levels; this tree shows six leaves. Page counts are illustrative.";

export const BTREE_LEGEND: { label: string; swatch: ScheduleSwatch }[] = [
  { label: "Page read by the query", swatch: "btree-read" },
  { label: "Read, but wasted or forced", swatch: "btree-waste" },
  { label: "Can't route the search", swatch: "btree-nope" },
  { label: "Visibility map: all-visible", swatch: "btree-vm-on" },
  { label: "Not all-visible", swatch: "btree-vm-off" },
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

function scenarioOf(values: InputValues): BtreeScenario {
  const id = String(values.scenario ?? "happy");
  const found = POSTGRES_BTREE_SCENARIOS.find((s) => s.id === id) ?? POSTGRES_BTREE_SCENARIOS[0];
  if (!found) throw new Error("postgres btree scenarios missing");
  return found;
}

function infoFor(sc: BtreeScenario): InfoContent {
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

export function postgresBtreeFrames(sc: BtreeScenario): VizFrame[] {
  return sc.frames.map((frame, index) => ({
    index,
    label: frame.h,
    outcome: frame.bad ? "bad" : "good",
    badge: frame.plan,
    caption: [frame.h],
    lines: [richFromHtml(frame.b)],
    path: [],
    vars: [],
    logNote: [],
    metric: frame.count,
    model: frameModel(frame),
  }));
}

export function runPostgresBtree(values: InputValues): RunResult {
  const sc = scenarioOf(values);
  return {
    frames: postgresBtreeFrames(sc),
    info: infoFor(sc),
    metricLabel: "",
    sequence: [],
  };
}

export const postgresBtreeModule: VisualizerModule = {
  slug: "inside-a-b-tree-index",
  title: "Inside a B-tree Index",
  subtitle:
    "An index is a sorted tree above heap pages. Step through descent, leftmost-prefix traps, expression indexes, and when index-only scans still touch the table.",
  unit: "step",
  subject: "Postgres",
  kicker: BTREE_KICKER,
  legend: BTREE_LEGEND,
  footnote: BTREE_FOOTNOTE,
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
          options: POSTGRES_BTREE_SCENARIOS.map((s) => ({
            value: s.id,
            label: s.tab,
            detail: s.short,
          })),
        },
      ],
    },
  ],
  defaults: () => ({ scenario: "happy" }),
  run: runPostgresBtree,
};
