import type { FieldAvailability, FieldSection, InputValues } from "./fields";
import type { FlowModel } from "./flow";
import type { Rich } from "./rich";
import type { ShapeModel } from "./shapes";

export type Outcome = "good" | "bad";

export interface VarRow {
  name: string;
  value: string;
}

export interface VizFrame {
  index: number;
  label: string;
  outcome: Outcome;
  badge: string;
  caption: Rich;
  lines: Rich[];
  path: number[];
  vars: VarRow[];
  logNote: Rich;
  metric: string;
  model: ShapeModel;
}

export interface Experiment {
  title: string;
  blurb: string;
  patch: InputValues;
}

export interface InfoContent {
  heading: string;
  name: string;
  chip: string;
  rule: string;
  about: [string, string][];
  tries: Experiment[];
  articleHref: string;
}

export interface RunResult {
  frames: VizFrame[];
  info: InfoContent;
  metricLabel: string;
  sequence: string[];
}

export interface VariantsSpec {
  // The chips field whose options are the variants; option order is the default order.
  key: string;
  // Switching variant restarts the run from step 1 instead of keeping the current step.
  restartOnSwitch?: boolean;
}

export type RevisionVisual =
  | { kind: "shape"; model: ShapeModel }
  | { kind: "flow"; flow: FlowModel };

export interface RevisionCard {
  id: string;
  name: string;
  // How many steps one loop plays; render receives 0 (reset) to steps (finished).
  steps: number;
  render: (lit: number) => RevisionVisual;
  // Screen-reader list of what the animation shows, one entry per step.
  stepsText: string[];
  summary: string;
  glossaryTerm?: string;
  differs: string;
}

export type RevisionSpec = RevisionCard[];

export interface VisualizerModule {
  slug: string;
  title: string;
  subtitle: string;
  unit: string;
  // Names the thing the stage draws, e.g. "Cache"; prefixes the shape's screen-reader label.
  subject: string;
  variants?: VariantsSpec;
  revision?: RevisionSpec;
  sections: FieldSection[];
  defaults: () => InputValues;
  // Per field key, which inputs matter for the current choice.
  availability?: (values: InputValues) => Record<string, FieldAvailability>;
  run: (values: InputValues) => RunResult;
}
