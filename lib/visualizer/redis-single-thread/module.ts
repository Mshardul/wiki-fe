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
import { mechanismInfo } from "../mechanism/info";
import { MECHANISM_GLOSSARY_TERM } from "../mechanism/links";
import { REDIS_SINGLE_THREAD_SCENARIOS } from "./scenarios";
import { traceModel } from "./schedule";
import type { RedisScenario } from "./types";

export const REDIS_KICKER = "Redis 7.x / 8.x · Valkey 8 shares the model";
export const REDIS_FOOTNOTE =
  "Timings and memory figures are illustrative; fork times come from measurements in the Redis latency docs.";

export const REDIS_LEGEND: { label: string; swatch: ScheduleSwatch }[] = [
  { label: "Running on the main thread", swatch: "solid" },
  { label: "Command queued, main thread busy", swatch: "hatch" },
  { label: "On the network", swatch: "outline" },
  { label: "Another thread or process", swatch: "thread" },
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

function scenarioOf(values: InputValues): RedisScenario {
  const id = String(values.scenario ?? "happy");
  const found =
    REDIS_SINGLE_THREAD_SCENARIOS.find((s) => s.id === id) ?? REDIS_SINGLE_THREAD_SCENARIOS[0];
  if (!found) throw new Error("redis single-thread scenarios missing");
  return found;
}

function infoFor(sc: RedisScenario): InfoContent {
  return mechanismInfo(sc, "redis");
}

export function redisFrames(sc: RedisScenario): VizFrame[] {
  return sc.frames.map((frame, index) => {
    const key = frame.trace ?? "main";
    const trace = sc.traces[key] ?? Object.values(sc.traces)[0];
    if (!trace) throw new Error(`No trace for ${sc.id}`);
    const grouped = Object.keys(sc.traces).length > 1;
    const lines: Rich[] = [];
    if (frame.info) lines.push(richFromHtml(frame.info));
    lines.push(richFromHtml(frame.b));
    return {
      index,
      label: frame.h,
      ...(grouped && trace.label ? { group: trace.label } : {}),
      outcome: frame.bad ? "bad" : "good",
      badge: "",
      caption: [frame.h],
      lines,
      path: [],
      vars: [],
      logNote: [],
      metric: "",
      model: traceModel(trace, frame.t, `${sc.id}:${key}`, frame.info ?? null),
    };
  });
}

export function runRedisSingleThread(values: InputValues): RunResult {
  const sc = scenarioOf(values);
  return {
    frames: redisFrames(sc),
    info: infoFor(sc),
    metricLabel: "",
    sequence: [],
  };
}

export const redisSingleThreadModule: VisualizerModule = {
  slug: "inside-redis-single-thread",
  title: "Inside Redis's Single Thread",
  subtitle:
    "Every command runs on one main thread. Each client is a lane; the Main row shows which command is executing. Step through microsecond commands, then KEYS, I/O threads, and fork.",
  unit: "step",
  subject: "Redis",
  kicker: REDIS_KICKER,
  glossaryTerm: MECHANISM_GLOSSARY_TERM.redis,
  legend: REDIS_LEGEND,
  footnote: REDIS_FOOTNOTE,
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
          options: REDIS_SINGLE_THREAD_SCENARIOS.map((s) => ({
            value: s.id,
            label: s.tab,
            detail: s.short,
          })),
        },
      ],
    },
  ],
  defaults: () => ({ scenario: "happy" }),
  run: runRedisSingleThread,
};
