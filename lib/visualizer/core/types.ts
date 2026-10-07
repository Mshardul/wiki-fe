import type { FieldSection, InputValues } from "./fields";
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

export interface VisualizerModule {
  slug: string;
  title: string;
  subtitle: string;
  unit: string;
  // Names the thing the stage draws, e.g. "Cache"; prefixes the shape's screen-reader label.
  subject: string;
  sections: FieldSection[];
  defaults: () => InputValues;
  run: (values: InputValues) => RunResult;
}
