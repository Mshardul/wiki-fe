import type { InputValues } from "@/lib/visualizer/core/fields";
import type { ScheduleSwatch } from "@/lib/visualizer/core/shapes";
import type {
  InfoContent,
  RunResult,
  VisualizerModule,
  VizFrame,
} from "@/lib/visualizer/core/types";
import { mechanismInfo } from "../mechanism/info";
import { MECHANISM_GLOSSARY_TERM } from "../mechanism/links";
import { richFromHtml } from "../mechanism/rich";
import { ASYNCIO_SCENARIOS } from "./scenarios";
import { traceModel } from "./schedule";
import type { AsyncioScenario } from "./types";

export const ASYNCIO_KICKER = "CPython 3.12+ · asyncio · FastAPI on uvicorn, one process";
export const ASYNCIO_FOOTNOTE =
  "Timings illustrate the mechanism and are not measured; exact interleaving depends on the loop's ready-queue order.";

export const ASYNCIO_LEGEND: { label: string; swatch: ScheduleSwatch }[] = [
  { label: "Running on the loop", swatch: "solid" },
  { label: "Ready, but stuck waiting", swatch: "hatch" },
  { label: "Suspended at an await (loop free)", swatch: "outline" },
  { label: "In a worker thread", swatch: "thread" },
];

function scenarioOf(values: InputValues): AsyncioScenario {
  const id = String(values.scenario ?? "happy");
  const found = ASYNCIO_SCENARIOS.find((s) => s.id === id) ?? ASYNCIO_SCENARIOS[0];
  if (!found) throw new Error("asyncio scenarios missing");
  return found;
}

function infoFor(sc: AsyncioScenario): InfoContent {
  return mechanismInfo(sc, "asyncio");
}

export function asyncioFrames(sc: AsyncioScenario): VizFrame[] {
  return sc.frames.map((frame, index) => {
    const key = frame.trace ?? "main";
    const trace = sc.traces[key] ?? Object.values(sc.traces)[0];
    if (!trace) throw new Error(`No trace for ${sc.id}`);
    const grouped = Object.keys(sc.traces).length > 1;
    return {
      index,
      label: frame.h,
      ...(grouped && trace.label ? { group: trace.label } : {}),
      outcome: frame.bad ? "bad" : "good",
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

export function runAsyncio(values: InputValues): RunResult {
  const sc = scenarioOf(values);
  return {
    frames: asyncioFrames(sc),
    info: infoFor(sc),
    metricLabel: "",
    sequence: [],
  };
}

export const asyncioModule: VisualizerModule = {
  slug: "inside-the-asyncio-event-loop",
  title: "Inside the asyncio Event Loop",
  subtitle:
    "One thread serves every request. Each request is a lane; the Loop row shows which coroutine is running. Step through the happy path, then blocking I/O, CPU hogs, and FastAPI's def vs async def.",
  unit: "step",
  subject: "Concurrency",
  kicker: ASYNCIO_KICKER,
  glossaryTerm: MECHANISM_GLOSSARY_TERM.asyncio,
  legend: ASYNCIO_LEGEND,
  footnote: ASYNCIO_FOOTNOTE,
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
          options: ASYNCIO_SCENARIOS.map((s) => ({ value: s.id, label: s.tab, detail: s.short })),
        },
      ],
    },
  ],
  defaults: () => ({ scenario: "happy" }),
  run: runAsyncio,
};
