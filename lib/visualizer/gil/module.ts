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
import { GIL_SCENARIOS } from "./scenarios";
import { traceModel } from "./schedule";
import type { GilScenario } from "./types";

export const GIL_KICKER = "CPython 3.12+ · default build · switch interval 5 ms";
export const GIL_FOOTNOTE = "Timings are illustrative of the mechanism, not measured.";

export const GIL_LEGEND: { label: string; swatch: ScheduleSwatch }[] = [
  { label: "Running Python (holds GIL)", swatch: "solid" },
  { label: "Waiting for GIL", swatch: "hatch" },
  { label: "In a blocking call (GIL released)", swatch: "outline" },
  { label: "5 ms switch timer", swatch: "meter" },
  { label: "Drop request", swatch: "arrow" },
  { label: "Checkpoint where the GIL was dropped", swatch: "pin" },
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

function scenarioOf(values: InputValues): GilScenario {
  const id = String(values.scenario ?? "happy");
  const found = GIL_SCENARIOS.find((s) => s.id === id) ?? GIL_SCENARIOS[0];
  if (!found) throw new Error("GIL scenarios missing");
  return found;
}

function infoFor(sc: GilScenario): InfoContent {
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

export function gilFrames(sc: GilScenario): VizFrame[] {
  return sc.frames.map((frame, index) => {
    const key = frame.trace ?? "main";
    const trace = sc.traces[key] ?? Object.values(sc.traces)[0];
    if (!trace) throw new Error(`No trace for ${sc.id}`);
    const lastBad = sc.id === "race" && index === sc.frames.length - 1;
    const grouped = Object.keys(sc.traces).length > 1;
    return {
      index,
      label: frame.h,
      ...(grouped && trace.label ? { group: trace.label } : {}),
      outcome: lastBad ? "bad" : "good",
      badge: "",
      caption: [frame.h],
      lines: [richFromHtml(frame.b)],
      path: [],
      vars: [],
      logNote: [],
      metric: "",
      model: traceModel(trace, frame.t, `${sc.id}:${key}`),
    };
  });
}

export function runGil(values: InputValues): RunResult {
  const sc = scenarioOf(values);
  return {
    frames: gilFrames(sc),
    info: infoFor(sc),
    metricLabel: "",
    sequence: [],
  };
}

export const gilModule: VisualizerModule = {
  slug: "inside-the-python-gil",
  title: "Inside the Python GIL",
  subtitle:
    "One timeline, four situations. Each thread is a lane; the GIL row on top shows who holds the lock. Step through a scenario to see exactly when the lock changes hands, and why.",
  unit: "step",
  subject: "Threads",
  kicker: GIL_KICKER,
  legend: GIL_LEGEND,
  footnote: GIL_FOOTNOTE,
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
          options: GIL_SCENARIOS.map((s) => ({ value: s.id, label: s.tab, detail: s.short })),
        },
      ],
    },
  ],
  defaults: () => ({ scenario: "happy" }),
  run: runGil,
};
