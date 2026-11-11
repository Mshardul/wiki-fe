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
import { GO_SCHEDULER_SCENARIOS } from "./scenarios";
import { traceModel } from "./schedule";
import type { GoScenario } from "./types";

export const GO_KICKER = "Go 1.22+ · G-M-P scheduler · scenario 3 compares Go 1.13";
export const GO_FOOTNOTE =
  "Timings illustrate the mechanism and are not measured; sysmon wakes every 20 µs to 10 ms, so real hand-offs vary.";

export const GO_LEGEND: { label: string; swatch: ScheduleSwatch }[] = [
  { label: "Running Go code on a processor (P)", swatch: "solid" },
  { label: "Runnable, waiting in a queue", swatch: "hatch" },
  { label: "Blocked in a syscall or parked on netpoller", swatch: "outline" },
  { label: "Thread parked / idle", swatch: "thread" },
  { label: "sysmon or runtime event", swatch: "pin" },
];

function scenarioOf(values: InputValues): GoScenario {
  const id = String(values.scenario ?? "happy");
  const found = GO_SCHEDULER_SCENARIOS.find((s) => s.id === id) ?? GO_SCHEDULER_SCENARIOS[0];
  if (!found) throw new Error("go scheduler scenarios missing");
  return found;
}

function infoFor(sc: GoScenario): InfoContent {
  return mechanismInfo(sc, "go");
}

export function goSchedulerFrames(sc: GoScenario): VizFrame[] {
  return sc.frames.map((frame, index) => {
    const key = frame.trace ?? "main";
    const trace = sc.traces[key] ?? Object.values(sc.traces)[0];
    if (!trace) throw new Error(`No trace for ${sc.id}`);
    const grouped = Object.keys(sc.traces).length > 1;
    return {
      index,
      label: frame.h,
      ...(grouped && trace.label ? { group: trace.label } : {}),
      outcome: "good",
      badge: "",
      caption: [frame.h],
      lines: [richFromHtml(frame.b)],
      path: [],
      vars: [],
      logNote: [],
      metric: "",
      model: traceModel(trace, frame.t, `${sc.id}:${key}`, frame.q ?? null),
    };
  });
}

export function runGoScheduler(values: InputValues): RunResult {
  const sc = scenarioOf(values);
  return {
    frames: goSchedulerFrames(sc),
    info: infoFor(sc),
    metricLabel: "",
    sequence: [],
  };
}

export const goSchedulerModule: VisualizerModule = {
  slug: "inside-the-go-scheduler",
  title: "Inside the Go Scheduler",
  subtitle:
    "Goroutines (G) run on OS threads (M), but only while a thread holds a processor (P). P rows show what each P runs; lanes below show the threads. Step through work stealing, blocking syscalls, netpoll, and preemption.",
  unit: "step",
  subject: "Go runtime",
  kicker: GO_KICKER,
  glossaryTerm: MECHANISM_GLOSSARY_TERM.go,
  legend: GO_LEGEND,
  footnote: GO_FOOTNOTE,
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
          options: GO_SCHEDULER_SCENARIOS.map((s) => ({
            value: s.id,
            label: s.tab,
            detail: s.short,
          })),
        },
      ],
    },
  ],
  defaults: () => ({ scenario: "happy" }),
  run: runGoScheduler,
};
