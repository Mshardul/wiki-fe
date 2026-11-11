import type { InputValues } from "@/lib/visualizer/core/fields";
import type { ScheduleSwatch } from "@/lib/visualizer/core/shapes";
import type { InfoContent, RunResult, VisualizerModule } from "@/lib/visualizer/core/types";
import { mechanismInfo } from "../mechanism/info";
import { MECHANISM_GLOSSARY_TERM } from "../mechanism/links";
import { richFromHtml } from "../mechanism/rich";
import { frameModel } from "./model";
import { POSTGRES_WAL_SCENARIOS } from "./scenarios";
import type { WalScenario } from "./types";

export const WAL_KICKER = "PostgreSQL 16+ · default settings unless a scenario changes one";
export const WAL_FOOTNOTE = "LSNs and values are illustrative.";

export const WAL_LEGEND: { label: string; swatch: ScheduleSwatch }[] = [
  { label: "WAL record (LSN = position)", swatch: "wal-rec" },
  { label: "Commit record", swatch: "wal-commit" },
  { label: "Full-page image", swatch: "wal-fpi" },
  { label: "Checkpoint", swatch: "wal-ckpt" },
  { label: "Dirty page (newer than disk)", swatch: "wal-dirty" },
  { label: "Changed in this step", swatch: "wal-step" },
];

function scenarioOf(values: InputValues): WalScenario {
  const id = String(values.scenario ?? "happy");
  const found = POSTGRES_WAL_SCENARIOS.find((s) => s.id === id) ?? POSTGRES_WAL_SCENARIOS[0];
  if (!found) throw new Error("postgres wal scenarios missing");
  return found;
}

function infoFor(sc: WalScenario): InfoContent {
  return mechanismInfo(sc, "wal");
}

export function postgresWalFrames(sc: WalScenario) {
  return sc.frames.map((frame, index) => ({
    index,
    label: frame.h,
    outcome: frame.bad ? ("bad" as const) : ("good" as const),
    badge: frame.badge,
    caption: [frame.h],
    lines: [richFromHtml(frame.b)],
    path: [],
    vars: [],
    logNote: [],
    metric: "",
    model: frameModel(frame),
  }));
}

export function runPostgresWal(values: InputValues): RunResult {
  const sc = scenarioOf(values);
  return {
    frames: postgresWalFrames(sc),
    info: infoFor(sc),
    metricLabel: "",
    sequence: [],
  };
}

export const postgresWalModule: VisualizerModule = {
  slug: "inside-the-postgres-wal",
  title: "Inside the Postgres WAL",
  subtitle:
    "A commit is durable when WAL is on disk, not when the table is. Step through flush and ack, async commit, crash replay, and what synchronous replication actually promises.",
  unit: "step",
  subject: "Postgres",
  kicker: WAL_KICKER,
  glossaryTerm: MECHANISM_GLOSSARY_TERM.wal,
  legend: WAL_LEGEND,
  footnote: WAL_FOOTNOTE,
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
          options: POSTGRES_WAL_SCENARIOS.map((s) => ({
            value: s.id,
            label: s.tab,
            detail: s.short,
          })),
        },
      ],
    },
  ],
  defaults: () => ({ scenario: "happy" }),
  run: runPostgresWal,
};
