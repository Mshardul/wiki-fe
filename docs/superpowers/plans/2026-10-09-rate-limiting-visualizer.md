# Rate Limiting Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `/visualizer/rate-limiting/` page: five rate-limiting algorithms (fixed window, sliding log, sliding counter, token bucket, leaky bucket), each with its own native Single view and a Revision card, built from two new generic shapes (Timeline, Composite) plus the existing Linear shape.

**Architecture:** A `VisualizerModule` under `lib/visualizer/rate-limiting/` runs one shared tick stream through a per-algorithm state machine (`Limiter`), turns each step into a `VizFrame` whose `model` is built by an adapter (`view.ts`) from vocabulary-neutral generic models, and supplies five Revision cards that replay the same mini-stream. Two small generic frame changes support it: availability hints render whenever present (and on chips), and sequence fields may declare a URL separator.

**Tech Stack:** Next.js App Router (static export), React, TypeScript (strict, `noUncheckedIndexedAccess`), Vitest + Testing Library, Biome + ESLint, pytest + Playwright for the one e2e check.

**Spec:** `docs/superpowers/specs/2026-10-09-rate-limiting-visualizer-design.md`. Read it first; this plan implements it and lists, in "Spec deltas" below, the few places where planning against the code changed a detail (Task 11 writes those deltas back into the spec).

## Global Constraints

- Never run `git add`, `git commit` or `git push`; the user owns version control. This plan has no git steps.
- Write tests alongside the code (fixture-first against hand-checked expectations for everything in `lib/visualizer/**`; a component test for every new component). Do **not** run any test, typecheck or lint command until Task 12; Task 12 is the single verification run.
- Comments are one line, sparse, and say why, never what. No ticket IDs (`WIKI-xxx`, `DSA-xxx`, `SD-xxx`) anywhere in code, CSS or tests. No `console.*`.
- Generic code (`components/visualizer/**`, `lib/visualizer/core/**`) uses structural vocabulary only (entry, exit, removed, level, span, mark, band, row, tone). Words like allow, reject, token, bucket, window, limit, queue, wait appear only under `lib/visualizer/rate-limiting/`.
- Colours only through `--viz-*` aliases in `css/tokens.css`; CSS classes are `viz-*`; breakpoints only in `css/responsive.css`; nothing may break at 320px; no hard-coded layout px that must adapt except where a layout function computes them.
- Frames are pure and deterministic: the same inputs and seed always give the same frames; `run` has no side effects.
- Step unit is one request. Window = Limit × Pace. Axis = `max(12, 2 × Window, lastTick + 1)`, at most 20 ticks. Sequence ticks are whole numbers 0–19, non-decreasing, 1–14 of them.
- Glossary keys are lowercase and singular; the five new keys are already in `data/glossary.json`.
- Markdown prose: one line per paragraph or list item, no hard wrapping outside code fences and tables.
- No new runtime dependencies.

## Review Focus

The spec implies these inputs but no ordinary task test would exercise them. Each has a test in the task that owns the code.

1. Seven or more simultaneous requests in one tick (Burst at Limit 5) must stay inside the stage: marks past the row cap collapse into a "+n" chip instead of growing the row. (Task 4 shape test, Task 7 view test.)
2. Typing `2.5`, `-3`, `4 5 x` or an empty field into the sequence must show a clear error, not be silently reinterpreted. (Task 5 ticks test.)
3. Changing Limit, Pace or the workload, or switching algorithm, mid-run must leave a valid sequence and a valid step. (Task 9 module test.)
4. A tick beyond the default 12-tick axis (for example 19) must stretch the axis, not clip marks or throw; leaky-bucket leave ticks beyond the axis are clipped without error. (Task 6 engine test, Task 7 view test.)
5. Steady must never be rejected by any algorithm at any Limit and Pace, and the Pace hint must state the shared rate. (Task 6 property test, Task 9 availability test.)

## Spec deltas found while planning

These are applied to the spec in Task 11. They are all consequences of the existing code.

- `TimelineModel` gains `stack` and `lanes` (run-wide maxima, so the stage keeps one height); `TimelineMark` gains `title`; `TimelineBand` and `TimelineSpan` gain `short`.
- The sequence URL codec joined tokens with `""`, which cannot round-trip multi-digit ticks. `SequenceField` gains an optional `join`; this module uses `"_"`. The parser also accepts spaces and commas, and rejects dots and minus signs so `2.5` and `-3` error instead of being reinterpreted.
- `parse` receives only the raw text, so it cannot know the current axis. Ticks are validated against the widest possible axis (0–19) and the axis stretches to fit a longer stream.
- Degrade ladder thresholds: full labels at 36px per tick or more, thinned labels and smaller marks at 14px or more, horizontal scroll below that (the 18px in the spec would scroll a 12-tick axis inside a 250px Revision card).
- Revision cards for the leaky bucket drop the queue part (the card stage is 200px tall) and show the two-row timeline only.
- `Linear`'s horizontal layout assumed a tall stage; a small height guard keeps its labels inside a short Composite part.

---

## File Structure

**Create**

- `lib/visualizer/rate-limiting/types.ts` — ids, constants, `Params`, `Decision`, `Snapshot`, `Limiter`, `AlgorithmMeta`.
- `lib/visualizer/rate-limiting/format.ts` — `formatEstimate`, `plural`.
- `lib/visualizer/rate-limiting/ticks.ts` — `parseTicks` (+ error strings).
- `lib/visualizer/rate-limiting/trace.ts` — `generateTicks` (workload motifs).
- `lib/visualizer/rate-limiting/algorithms/{fixed-window,sliding-log,sliding-counter,token-bucket,leaky-bucket,index}.ts` — five `Limiter` factories and the `LIMITERS` map.
- `lib/visualizer/rate-limiting/engine.ts` — `runSteps`, `initialSnapshot`, `passTicks`, `peakIn`.
- `lib/visualizer/rate-limiting/view.ts` — `makeContext`, `viewOf` (state → generic models).
- `lib/visualizer/rate-limiting/copy.ts` — `ALGORITHM_META`, `RATE_LIMITING_ARTICLE`.
- `lib/visualizer/rate-limiting/frames.ts` — `buildFrames`.
- `lib/visualizer/rate-limiting/revision.ts` — `rateLimitingRevision`.
- `lib/visualizer/rate-limiting/module.ts` — sections, defaults, availability, `rateLimitingModule`.
- `components/visualizer/shapes/TimelineShape.tsx`, `components/visualizer/shapes/CompositeShape.tsx`.
- `css/view-visualizer/timeline.css`.
- Tests next to each of the above (`*.test.ts` / `*.test.tsx`), plus `lib/visualizer/core/sequence-join.test.ts`, `lib/visualizer/core/timeline-shapes.test.ts`, `lib/visualizer/core/timeline-layout.test.ts`, `components/visualizer/frame/hints.test.tsx`.

**Modify**

- `lib/visualizer/core/shapes.ts`, `lib/visualizer/core/geometry.ts`, `lib/visualizer/core/fields.ts`, `lib/visualizer/core/url-state.ts`.
- `components/visualizer/frame/ConfigFields.tsx`, `components/visualizer/shapes/Shape.tsx`.
- `css/tokens.css`, `css/view-visualizer/{stage,ui,panels,playback}.css`, `css/wiki.css`.
- Neutral-rename sites: `components/visualizer/shapes/{LinearShape,RankingShape}.tsx`, `components/visualizer/shapes/shapes.test.tsx`, `lib/visualizer/core/shapes.test.ts`, `lib/visualizer/eviction/policies/{fifo,lfu,lru,clock}.ts` and `{lfu,clock}.test.ts`.
- `lib/visualizer/registry.ts`, `lib/visualizer/modules.ts`, `app/visualizer.test.tsx`, `tests/content/artifacts.test.ts`, `tests/e2e/test_visualizer.py`.
- Docs: the spec, `docs/_meta/visualizer/README.md`, `docs/_meta/visualizer/backlog.md`, `CLAUDE.md`.

---

### Task 1: Neutral renames of the remaining cache-flavoured generic terms

Mechanical rename, done first so every later file uses the final names. `hit` as a *display word* in eviction/caching captions (`goodText("hit")`) is correct domain copy and must stay.

**Files:**
- Modify: `lib/visualizer/core/shapes.ts` (type `ActiveTone`), `components/visualizer/shapes/LinearShape.tsx`, `components/visualizer/shapes/RankingShape.tsx`, `lib/visualizer/eviction/policies/{fifo,lfu,lru,clock}.ts`
- Modify (tests): `lib/visualizer/core/shapes.test.ts`, `components/visualizer/shapes/shapes.test.tsx`, `lib/visualizer/eviction/policies/lfu.test.ts`, `lib/visualizer/eviction/policies/clock.test.ts`
- Modify (CSS): `css/tokens.css`, `css/view-visualizer/{stage,ui,panels,playback}.css`

**Interfaces:**
- Produces: `ActiveTone = "new" | "existing"`; CSS aliases `--viz-good`, `--viz-bad`, `--viz-exit` (and `-bg` variants); CSS classes `viz-blk--existing`, `viz-hist__col--existing`, `viz-ring__slot--existing`, `viz-rank__row--existing`.

- [ ] **Step 1: Rename the tone value**

Run from `/Users/shardul/Documents/Github/wiki/wiki-fe`:

```bash
perl -pi -e 's/"hit"/"existing"/g' \
  lib/visualizer/core/shapes.ts lib/visualizer/core/shapes.test.ts \
  components/visualizer/shapes/LinearShape.tsx components/visualizer/shapes/RankingShape.tsx \
  components/visualizer/shapes/shapes.test.tsx \
  lib/visualizer/eviction/policies/fifo.ts lib/visualizer/eviction/policies/lfu.ts \
  lib/visualizer/eviction/policies/lru.ts lib/visualizer/eviction/policies/clock.ts \
  lib/visualizer/eviction/policies/lfu.test.ts lib/visualizer/eviction/policies/clock.test.ts
```

Only tone literals contain `"hit"` in these files (`goodText("hit")` lives in `eviction/simulate.ts` and `caching/strategies/shared.ts`, which are deliberately not in the list).

- [ ] **Step 2: Rename the colour aliases**

```bash
perl -pi -e 's/--viz-hit/--viz-good/g; s/--viz-miss/--viz-bad/g; s/--viz-evict/--viz-exit/g' \
  css/tokens.css css/view-visualizer/stage.css css/view-visualizer/ui.css \
  css/view-visualizer/panels.css css/view-visualizer/playback.css
```

This also renames `--viz-hit-bg`, `--viz-miss-bg` and `--viz-evict-bg` through their prefixes.

- [ ] **Step 3: Rename the tone-derived class names**

The shapes build `viz-<shape>--${tone}` dynamically, so the CSS selectors and the one explicit class in `LinearShape` and its test must follow:

```bash
perl -pi -e 's/(__col|__slot|__row|blk)--hit\b/$1--existing/g' \
  css/view-visualizer/stage.css components/visualizer/shapes/LinearShape.tsx \
  components/visualizer/shapes/shapes.test.tsx
```

- [ ] **Step 4: Confirm nothing generic still says hit**

```bash
grep -rnE 'viz-(hit|miss|evict)|--hit\b|"hit"' components/visualizer lib/visualizer/core css lib/visualizer/eviction/policies
```

Expected: no output. (The `goodText("hit")` strings in `eviction/simulate.ts` and `caching/strategies/shared.ts` are outside these paths and intentionally unchanged.)

---

### Task 2: Frame — sequence URL separator and visible availability hints

Two small generic frame changes the module needs. Existing modules are unaffected: their sequences use no separator, and they only set `hint` together with `disabled: true`.

**Files:**
- Modify: `lib/visualizer/core/fields.ts`, `lib/visualizer/core/url-state.ts`, `components/visualizer/frame/ConfigFields.tsx`
- Create: `lib/visualizer/core/sequence-join.test.ts`, `components/visualizer/frame/hints.test.tsx`

**Interfaces:**
- Produces: `SequenceField.join?: string`; `joinSequence(field: SequenceField, tokens: string[]): string`; `FieldAvailability.hint` now renders on sliders whether or not the field is disabled, and on chips.

- [ ] **Step 1: Write the sequence-join test**

`lib/visualizer/core/sequence-join.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { type FieldSection, joinSequence, type SequenceField } from "./fields";
import { encodeState, parseState } from "./url-state";

const numbers = (raw: string) => ({
  ok: true as const,
  tokens: raw.split(/[\s,_]+/).filter((s) => s !== ""),
});

const field = (join?: string): SequenceField => ({
  kind: "sequence",
  key: "sequence",
  label: "Sequence",
  param: "q",
  maxLen: 14,
  hint: "",
  resetBy: [],
  parse: numbers,
  ...(join === undefined ? {} : { join }),
});

describe("joinSequence", () => {
  it("concatenates tokens by default", () => {
    expect(joinSequence(field(), ["RA", "WB"])).toBe("RAWB");
  });

  it("uses the field's separator when it has one", () => {
    expect(joinSequence(field("_"), ["4", "11"])).toBe("4_11");
  });
});

describe("url round trip with a separator", () => {
  const sections: FieldSection[] = [{ title: "", fields: [field("_")] }];

  it("keeps multi-digit tokens apart", () => {
    const search = encodeState(sections, { sequence: ["4", "5", "11"] }, { frame: 0, rotated: false });
    expect(search).toBe("?q=4_5_11&i=1");
    expect(parseState(search, sections, { sequence: null }).values.sequence).toEqual(["4", "5", "11"]);
  });
});
```

- [ ] **Step 2: Add `join` to the field type and the helper**

In `lib/visualizer/core/fields.ts`, replace the `SequenceField` interface with:

```ts
export interface SequenceField extends FieldBase {
  kind: "sequence";
  maxLen: number;
  hint: string;
  resetBy: string[];
  // A module with its own token grammar supplies this; the default reads letters A–Z.
  parse?: (raw: string) => SequenceParse;
  // Separator between tokens in the URL; tokens that can run together (numbers) need one.
  join?: string;
}
```

and add, directly below `parseSequenceField`:

```ts
export function joinSequence(field: SequenceField, tokens: string[]): string {
  return tokens.join(field.join ?? "");
}
```

- [ ] **Step 3: Use it when encoding the URL**

In `lib/visualizer/core/url-state.ts`, change the import list to include `joinSequence`:

```ts
import {
  allFields,
  clampInt,
  type FieldSection,
  type InputValues,
  joinSequence,
  parseSequenceField,
  SEED_MAX,
} from "./fields";
```

and replace the sequence branch in `encodeState`:

```ts
    else if (f.kind === "sequence" && Array.isArray(v)) q.set(f.param, joinSequence(f, v));
```

- [ ] **Step 4: Write the hint component tests**

`components/visualizer/frame/hints.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FieldSection } from "@/lib/visualizer/core/fields";
import { ConfigPanel } from "./ConfigPanel";

const SECTIONS: FieldSection[] = [
  {
    title: "",
    fields: [
      {
        kind: "chips",
        key: "pace",
        label: "Pace",
        param: "pc",
        options: [
          { value: "1", label: "1 per tick" },
          { value: "2", label: "1 per 2 ticks" },
        ],
      },
      { kind: "slider", key: "limit", label: "Limit", param: "l", min: 2, max: 5 },
    ],
  },
];
const VALUES = { pace: "2", limit: 3 };
const noop = () => {};

describe("availability hints", () => {
  it("shows a hint on chips and on an enabled slider", () => {
    render(
      <ConfigPanel
        sections={SECTIONS}
        values={VALUES}
        sequence={[]}
        onChange={noop}
        availability={{ pace: { hint: "Window 6" }, limit: { hint: "Max per window" } }}
      />,
    );
    expect(screen.getByText("Window 6")).toBeTruthy();
    expect(screen.getByText("Max per window")).toBeTruthy();
  });

  it("still shows why a slider is dimmed", () => {
    render(
      <ConfigPanel
        sections={SECTIONS}
        values={VALUES}
        sequence={[]}
        onChange={noop}
        availability={{ limit: { disabled: true, hint: "Used by one policy." } }}
      />,
    );
    expect(screen.getByText("Used by one policy.")).toBeTruthy();
    expect(screen.getByLabelText("Limit").hasAttribute("disabled")).toBe(true);
  });

  it("shows no hint when none is given", () => {
    const { container } = render(
      <ConfigPanel sections={SECTIONS} values={VALUES} sequence={[]} onChange={noop} />,
    );
    expect(container.querySelector(".viz-field__hint")).toBeNull();
  });
});
```

- [ ] **Step 5: Render hints on chips and on enabled sliders**

In `components/visualizer/frame/ConfigFields.tsx`:

1. Replace the `ChipsInput` function with:

```tsx
function ChipsInput({
  field,
  value,
  onChange,
  nav,
  availability,
}: FieldProps<ChipsField> & {
  nav?: { onStep: (delta: number) => void };
  availability?: FieldAvailability;
}) {
  const noun = field.label.toLowerCase();
  return (
    <div className="viz-field">
      {!field.hideLabel && <div className="viz-field__label">{field.label}</div>}
      <div className="viz-field__chips-row">
        <ChoiceGroup
          label={field.label}
          options={field.options}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
        />
        {nav && (
          <span className="viz-variant-nav">
            <IconButton label={`Previous ${noun}`} onClick={() => nav.onStep(-1)}>
              ‹
            </IconButton>
            <IconButton label={`Next ${noun}`} onClick={() => nav.onStep(1)}>
              ›
            </IconButton>
          </span>
        )}
      </div>
      {availability?.hint && <p className="viz-field__hint">{availability.hint}</p>}
    </div>
  );
}
```

2. In `SliderInput`, replace the last line before the closing `</div>`:

```tsx
      {disabled && availability?.hint && <p className="viz-field__hint">{availability.hint}</p>}
```

with:

```tsx
      {availability?.hint && <p className="viz-field__hint">{availability.hint}</p>}
```

3. In `ConfigField`, replace the chips case:

```tsx
    case "chips":
      return (
        <ChipsInput
          field={field}
          value={value}
          onChange={onChange}
          nav={nav}
          availability={availability}
        />
      );
```

4. In `ConfigField`'s sequence case, replace `key={sequence.join("")}` with `key={sequence.join(" ")}` (tokens such as `["1", "1"]` and `["11"]` must not share a key).

---

### Task 3: Core shape models, geometry and layout

Adds the Timeline and Composite models, the Timeline layout function (with the degrade ladder), the Composite height split, and a small height guard on Linear's horizontal layout.

**Files:**
- Modify: `lib/visualizer/core/shapes.ts`, `lib/visualizer/core/geometry.ts`
- Create: `lib/visualizer/core/timeline-shapes.test.ts`, `lib/visualizer/core/timeline-layout.test.ts`

**Interfaces:**
- Produces (shapes.ts): `TimelineTone`, `TimelineMark`, `TimelineRow`, `TimelineBand`, `SpanStyle`, `TimelineSpan`, `TimelineModel`, `LeafModel`, `CompositeModel`, `ShapeModel` (now `LeafModel | CompositeModel`), `timelineLabel(model, subject): string`; `defaultAxis` returns `null` for every kind but linear and histogram; `modelKeys` handles the new kinds.
- Produces (geometry.ts): `TimelineSizing`, `TimelineRung`, `TimelineLayout`, `timelineLayout(size, sizing): TimelineLayout`, `compositeHeights(size, parts): number[]`.

- [ ] **Step 1: Write the model tests**

`lib/visualizer/core/timeline-shapes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  type CompositeModel,
  defaultAxis,
  type LinearModel,
  modelKeys,
  type TimelineModel,
  timelineLabel,
} from "./shapes";

const timeline: TimelineModel = {
  kind: "timeline",
  ticks: 12,
  now: 5,
  stack: 2,
  lanes: 1,
  rows: [
    {
      label: "",
      marks: [
        { at: 4, tone: "good", title: "allowed" },
        { at: 5, tone: "bad", title: "rejected" },
        { at: 5, tone: "faded" },
      ],
    },
  ],
  bands: [],
  spans: [],
  boundaries: [],
};

const linear: LinearModel = {
  kind: "linear",
  items: ["T3", "T2"],
  capacity: 3,
  next: "T2",
  active: null,
  tone: null,
  removed: null,
  labels: { entry: "refill", exit: "spent" },
  defaultAxis: "horizontal",
};

describe("timeline and composite models", () => {
  it("have no axis, so Rotate stays hidden", () => {
    const composite: CompositeModel = { kind: "composite", parts: [linear, timeline] };
    expect(defaultAxis(timeline)).toBeNull();
    expect(defaultAxis(composite)).toBeNull();
    expect(defaultAxis(linear)).toBe("horizontal");
  });

  it("a composite lists its parts' keys in order", () => {
    expect(modelKeys({ kind: "composite", parts: [linear, timeline] })).toEqual(["T3", "T2"]);
    expect(modelKeys(timeline)).toEqual([]);
  });

  it("the screen-reader label lists every mark with its title or tone", () => {
    expect(timelineLabel(timeline, "Limiter")).toBe(
      "Limiter: tick 4 allowed, tick 5 rejected, tick 5 faded",
    );
  });

  it("labels each row and says so when a row is empty", () => {
    const two: TimelineModel = {
      ...timeline,
      rows: [
        { label: "arrive", marks: [{ at: 1, tone: "good" }] },
        { label: "leave", marks: [] },
      ],
    };
    expect(timelineLabel(two, "Limiter")).toBe("Limiter: arrive: tick 1 good; leave: no marks");
  });
});
```

- [ ] **Step 2: Add the models to `core/shapes.ts`**

Replace the line `export type ShapeModel = LinearModel | HistogramModel | RankingModel | RingModel | LanesModel;` with:

```ts
export type TimelineTone = "good" | "bad" | "faded";
export interface TimelineMark {
  at: number;
  tone: TimelineTone;
  current?: boolean;
  // Spoken instead of the tone word, e.g. "allowed".
  title?: string;
}
export interface TimelineRow {
  label: string;
  marks: TimelineMark[];
}
export interface TimelineBand {
  from: number;
  to: number;
  label: string;
  // Shown instead of label on narrow stages.
  short?: string;
}
export type SpanStyle = "outline" | "fill" | "hatch" | "alert";
export interface TimelineSpan {
  from: number;
  to: number;
  label: string;
  short?: string;
  style: SpanStyle;
}
// stack and lanes are run-wide maxima (tallest pile of simultaneous marks, most labelled spans) so the stage keeps one height.
export interface TimelineModel {
  kind: "timeline";
  ticks: number;
  now: number;
  stack: number;
  lanes: number;
  rows: TimelineRow[];
  bands: TimelineBand[];
  spans: TimelineSpan[];
  boundaries: number[];
}

export type LeafModel =
  | LinearModel
  | HistogramModel
  | RankingModel
  | RingModel
  | LanesModel
  | TimelineModel;
export interface CompositeModel {
  kind: "composite";
  parts: LeafModel[];
}
export type ShapeModel = LeafModel | CompositeModel;
```

Replace the `defaultAxis` function with:

```ts
export function defaultAxis(model: ShapeModel): Axis | null {
  return model.kind === "linear" || model.kind === "histogram" ? model.defaultAxis : null;
}
```

Replace `modelKeys` with:

```ts
export function modelKeys(model: ShapeModel): string[] {
  if (model.kind === "linear") return model.items;
  if (model.kind === "ranking") return model.rows.map((r) => r.key);
  if (model.kind === "lanes" || model.kind === "timeline") return [];
  if (model.kind === "composite") return model.parts.flatMap(modelKeys);
  return model.slots.flatMap((s) => (s ? [s.key] : []));
}

export function timelineLabel(model: TimelineModel, subject: string): string {
  const rows = model.rows.map((r) => {
    const marks = r.marks.map((m) => `tick ${m.at} ${m.title ?? m.tone}`).join(", ");
    return `${r.label ? `${r.label}: ` : ""}${marks || "no marks"}`;
  });
  return `${subject}: ${rows.join("; ")}`;
}
```

- [ ] **Step 3: Write the layout tests**

`lib/visualizer/core/timeline-layout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { compositeHeights, linearLayout, timelineLayout } from "./geometry";
import type { LinearModel, TimelineModel } from "./shapes";

const sizing = (ticks: number) => ({ ticks, rows: 1, stack: 2, lanes: 1, labeled: false });

describe("timelineLayout rungs", () => {
  it("full labels on a roomy stage", () => {
    const L = timelineLayout({ w: 800, h: 500 }, sizing(12));
    expect(L.rung).toBe("full");
    expect(L.labelEvery).toBe(1);
    expect(L.pitch).toBeLessThanOrEqual(56);
    expect(L.width).toBe(800);
  });

  it("thins labels on a 320px stage with the default axis", () => {
    const L = timelineLayout({ w: 320, h: 380 }, sizing(12));
    expect(L.rung).toBe("thin");
    expect(L.labelEvery).toBe(2);
    expect(L.width).toBe(320);
  });

  it("stays thin inside a 250px revision card", () => {
    expect(timelineLayout({ w: 250, h: 200 }, sizing(12)).rung).toBe("thin");
  });

  it("scrolls only when even thin labels cannot fit", () => {
    expect(timelineLayout({ w: 320, h: 380 }, sizing(20)).rung).toBe("thin");
    const L = timelineLayout({ w: 250, h: 200 }, sizing(20));
    expect(L.rung).toBe("scroll");
    expect(L.width).toBeGreaterThan(250);
  });

  it("places ticks left to right inside the width", () => {
    const L = timelineLayout({ w: 800, h: 500 }, sizing(12));
    expect(L.x(1)).toBeGreaterThan(L.x(0));
    expect(L.cx(0)).toBeCloseTo(L.x(0) + L.pitch / 2);
    expect(L.x(12)).toBeLessThanOrEqual(800);
  });

  it("grows taller with more stacked marks, rows and span lanes, never shorter", () => {
    const base = timelineLayout({ w: 800, h: 500 }, sizing(12));
    expect(timelineLayout({ w: 800, h: 500 }, { ...sizing(12), stack: 4 }).height).toBeGreaterThan(base.height);
    expect(timelineLayout({ w: 800, h: 500 }, { ...sizing(12), rows: 2 }).height).toBeGreaterThan(base.height);
    expect(timelineLayout({ w: 800, h: 500 }, { ...sizing(12), lanes: 2 }).height).toBeGreaterThan(base.height);
  });
});

const timeline = (rows: number, stack: number): TimelineModel => ({
  kind: "timeline",
  ticks: 12,
  now: 0,
  stack,
  lanes: 1,
  rows: Array.from({ length: rows }, () => ({ label: "", marks: [] })),
  bands: [],
  spans: [],
  boundaries: [],
});
const linear: LinearModel = {
  kind: "linear",
  items: [],
  capacity: 3,
  next: null,
  active: null,
  tone: null,
  removed: null,
  labels: { entry: "in", exit: "out" },
  defaultAxis: "horizontal",
};

describe("compositeHeights", () => {
  it("gives a timeline its natural height and the rest to the other parts", () => {
    const size = { w: 800, h: 560 };
    const [a, b] = compositeHeights(size, [linear, timeline(1, 2)]);
    expect(b).toBe(timelineLayout(size, sizing(12)).height);
    expect(a).toBeGreaterThanOrEqual(96);
    expect((a ?? 0) + (b ?? 0)).toBeLessThanOrEqual(560);
  });

  it("reserves room for the metric and caption only on a tall single-view stage", () => {
    const tall = compositeHeights({ w: 800, h: 560 }, [linear])[0] ?? 0;
    const card = compositeHeights({ w: 250, h: 200 }, [linear])[0] ?? 0;
    expect(tall).toBe(560 - 80);
    expect(card).toBe(200);
  });
});

describe("linearLayout on a short stage", () => {
  it("keeps the horizontal labels inside the stage", () => {
    const L = linearLayout({ w: 600, h: 120 }, 3, "horizontal");
    expect(L.entryLabel.y).toBeGreaterThanOrEqual(0);
    expect(L.frame.y + L.frame.h).toBeLessThanOrEqual(120);
  });

  it("leaves a tall stage's layout unchanged", () => {
    const L = linearLayout({ w: 800, h: 400 }, 4, "horizontal");
    expect(L.block.h).toBe(76);
    expect(L.slot(0).y).toBeCloseTo(400 / 2 - 76 / 2 - 16);
  });
});
```

- [ ] **Step 4: Add the layout code to `core/geometry.ts`**

Change the first import line to:

```ts
import type { Axis, CardSection, LeafModel } from "./shapes";
```

Replace the horizontal branch's three lines inside `linearLayout` (`const pitch ...` through `const y = ...`) with:

```ts
  const pitch = clamp((size.w - 60) / n, 30, 96);
  const bw = pitch - 12;
  const bh = Math.min(76, bw, Math.max(24, size.h - 96));
  const len = pitch * n;
  const x = (size.w - len) / 2;
  const y = Math.max(34, size.h / 2 - bh / 2 - 16);
```

Append to the end of the file:

```ts
export interface TimelineSizing {
  ticks: number;
  rows: number;
  stack: number;
  lanes: number;
  labeled: boolean;
}
export type TimelineRung = "full" | "thin" | "scroll";
export interface TimelineLayout {
  rung: TimelineRung;
  width: number;
  height: number;
  pitch: number;
  labelEvery: number;
  markR: number;
  stackPitch: number;
  bandTop: number;
  axisY: number;
  spanTop: number;
  x: (tick: number) => number;
  cx: (tick: number) => number;
  rowTop: (row: number) => number;
  rowBase: (row: number) => number;
}

const TL_PAD = 14;
const TL_FULL = 36;
const TL_THIN = 14;
const TL_PITCH_MAX = 56;
const TL_HEAD = 22;
const TL_LANE_H = 16;
const TL_LABEL_H = 13;

// full labels at 36px per tick, thinned labels and smaller marks down to 14px, then horizontal scroll.
export function timelineLayout(size: Size, s: TimelineSizing): TimelineLayout {
  const ticks = Math.max(1, s.ticks);
  const room = Math.max(0, size.w - TL_PAD * 2);
  const raw = room / ticks;
  const rung: TimelineRung = raw >= TL_FULL ? "full" : raw >= TL_THIN ? "thin" : "scroll";
  const pitch = rung === "scroll" ? TL_THIN : Math.min(raw, TL_PITCH_MAX);
  const left = rung === "scroll" ? TL_PAD : TL_PAD + Math.max(0, (room - ticks * pitch) / 2);
  const markR = pitch >= 36 ? 8 : pitch >= 22 ? 6 : 5;
  const stackPitch = markR * 2 + 4;
  const rowH = Math.max(1, s.stack) * stackPitch + 8 + (s.labeled ? TL_LABEL_H : 0);
  const bandTop = 4;
  const rowsTop = bandTop + TL_HEAD + 4;
  const axisY = rowsTop + Math.max(1, s.rows) * rowH + 2;
  const spanTop = axisY + 22;
  return {
    rung,
    width: rung === "scroll" ? TL_PAD * 2 + ticks * pitch : size.w,
    height: spanTop + s.lanes * TL_LANE_H + 8,
    pitch,
    labelEvery: pitch >= 28 ? 1 : 2,
    markR,
    stackPitch,
    bandTop,
    axisY,
    spanTop,
    x: (t) => left + t * pitch,
    cx: (t) => left + t * pitch + pitch / 2,
    rowTop: (r) => rowsTop + r * rowH,
    rowBase: (r) => rowsTop + (r + 1) * rowH - markR - 3,
  };
}

export const TL_LANE_HEIGHT = TL_LANE_H;
export const TL_ROW_LABEL_HEIGHT = TL_LABEL_H;

const CHROME = 80;
const CHROME_MIN_H = 320;
const FLEX_MIN_H = 96;

// A timeline keeps its natural height; the other parts share what is left.
// A tall single-view stage reserves room for the metric and caption; a 200px revision card does not.
export function compositeHeights(size: Size, parts: LeafModel[]): number[] {
  const budget = size.h >= CHROME_MIN_H ? size.h - CHROME : size.h;
  const natural = parts.map((p) =>
    p.kind === "timeline"
      ? timelineLayout(size, {
          ticks: p.ticks,
          rows: p.rows.length,
          stack: p.stack,
          lanes: p.lanes,
          labeled: p.rows.some((r) => r.label !== ""),
        }).height
      : 0,
  );
  const flex = parts.filter((p) => p.kind !== "timeline").length;
  const rest = Math.max(0, budget - natural.reduce((a, b) => a + b, 0));
  return parts.map((p, i) =>
    p.kind === "timeline"
      ? (natural[i] ?? 0)
      : Math.max(FLEX_MIN_H, Math.floor(rest / Math.max(1, flex))),
  );
}
```

---

### Task 4: Timeline and Composite shape components

**Files:**
- Create: `components/visualizer/shapes/TimelineShape.tsx`, `components/visualizer/shapes/CompositeShape.tsx`, `components/visualizer/shapes/TimelineShape.test.tsx`, `components/visualizer/shapes/CompositeShape.test.tsx`, `css/view-visualizer/timeline.css`
- Modify: `components/visualizer/shapes/Shape.tsx`, `css/wiki.css`

**Interfaces:**
- Consumes: `TimelineModel`, `timelineLabel`, `timelineLayout`, `compositeHeights`, `useFollowScroll`.
- Produces: `<TimelineShape model size subject />`; `<CompositeShape model size subject renderPart />` where `renderPart: (part: LeafModel, size: Size) => ReactNode`; `Shape` now draws `timeline` and `composite` models.

- [ ] **Step 1: Write the Timeline tests**

`components/visualizer/shapes/TimelineShape.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TimelineModel } from "@/lib/visualizer/core/shapes";
import { TimelineShape } from "./TimelineShape";

const base: TimelineModel = {
  kind: "timeline",
  ticks: 12,
  now: 7,
  stack: 2,
  lanes: 2,
  rows: [
    {
      label: "",
      marks: [
        { at: 4, tone: "good", title: "allowed" },
        { at: 5, tone: "good", title: "allowed" },
        { at: 7, tone: "bad", title: "rejected", current: true },
        { at: 2, tone: "faded", title: "aged out" },
      ],
    },
  ],
  bands: [
    { from: 0, to: 5, label: "window 0 · 3/3 full", short: "3/3" },
    { from: 6, to: 11, label: "window 1 · 1/3", short: "1/3" },
  ],
  spans: [
    { from: 4, to: 7, label: "6 allowed in 4 ticks", short: "6 in 4", style: "alert" },
    { from: 2, to: 7, label: "last 6 ticks", short: "last 6", style: "outline" },
    { from: 2, to: 4, label: "", style: "hatch" },
  ],
  boundaries: [6],
};

const FULL = { w: 800, h: 500 };

describe("TimelineShape", () => {
  it("names the marks in order for screen readers", () => {
    render(<TimelineShape model={base} size={FULL} subject="Limiter" />);
    expect(
      screen.getByRole("img", {
        name: "Limiter: tick 4 allowed, tick 5 allowed, tick 7 rejected, tick 2 aged out",
      }),
    ).toBeTruthy();
  });

  it("draws rejected marks hollow with a cross and ring the current one", () => {
    const { container } = render(<TimelineShape model={base} size={FULL} subject="Limiter" />);
    expect(container.querySelectorAll(".viz-tl__mark--good")).toHaveLength(2);
    expect(container.querySelectorAll(".viz-tl__mark--bad .viz-tl__cross")).toHaveLength(1);
    expect(container.querySelectorAll(".viz-tl__mark--faded")).toHaveLength(1);
    expect(container.querySelectorAll(".viz-tl__ring")).toHaveLength(1);
  });

  it("shows full band and span labels on a roomy stage and short ones on a narrow one", () => {
    const { rerender } = render(<TimelineShape model={base} size={FULL} subject="Limiter" />);
    expect(screen.getByText("window 0 · 3/3 full")).toBeTruthy();
    expect(screen.getByText("6 allowed in 4 ticks")).toBeTruthy();
    rerender(<TimelineShape model={base} size={{ w: 250, h: 200 }} subject="Limiter" />);
    expect(screen.queryByText("window 0 · 3/3 full")).toBeNull();
    expect(screen.getByText("3/3")).toBeTruthy();
    expect(screen.getByText("6 in 4")).toBeTruthy();
  });

  it("draws one line per boundary and one pattern for hatched spans", () => {
    const { container } = render(<TimelineShape model={base} size={FULL} subject="Limiter" />);
    expect(container.querySelectorAll(".viz-tl__boundary")).toHaveLength(1);
    expect(container.querySelectorAll(".viz-tl__span--hatch")).toHaveLength(1);
  });

  it("collapses a tall pile of simultaneous marks into a +n chip", () => {
    const pile: TimelineModel = {
      ...base,
      stack: 4,
      spans: [],
      bands: [],
      boundaries: [],
      rows: [
        {
          label: "",
          marks: Array.from({ length: 7 }, (_, i) => ({
            at: 3,
            tone: i < 5 ? ("good" as const) : ("bad" as const),
            ...(i === 6 ? { current: true } : {}),
          })),
        },
      ],
    };
    const { container } = render(<TimelineShape model={pile} size={FULL} subject="Limiter" />);
    expect(container.querySelectorAll(".viz-tl__mark")).toHaveLength(3);
    const chip = container.querySelector(".viz-tl__more");
    expect(chip?.textContent).toBe("+4");
    expect(chip?.classList.contains("is-current")).toBe(true);
  });

  it("scrolls horizontally when even thin labels cannot fit", () => {
    const wide: TimelineModel = { ...base, ticks: 20 };
    const { container } = render(
      <TimelineShape model={wide} size={{ w: 250, h: 200 }} subject="Limiter" />,
    );
    const inner = container.querySelector<HTMLElement>(".viz-tl__inner");
    expect(Number.parseFloat(inner?.style.width ?? "0")).toBeGreaterThan(250);
  });

  it("labels each row when rows are named", () => {
    const two: TimelineModel = {
      ...base,
      spans: [],
      rows: [
        { label: "arrive", marks: [{ at: 1, tone: "good" }] },
        { label: "leave", marks: [{ at: 3, tone: "faded" }] },
      ],
    };
    render(<TimelineShape model={two} size={FULL} subject="Limiter" />);
    expect(screen.getByText("arrive")).toBeTruthy();
    expect(screen.getByText("leave")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Write `TimelineShape.tsx`**

```tsx
import { useId, useRef } from "react";
import {
  type Size,
  TL_LANE_HEIGHT,
  TL_ROW_LABEL_HEIGHT,
  timelineLayout,
} from "@/lib/visualizer/core/geometry";
import { type TimelineMark, type TimelineModel, timelineLabel } from "@/lib/visualizer/core/shapes";
import { useFollowScroll } from "../hooks/useFollowScroll";

interface TimelineShapeProps {
  model: TimelineModel;
  size: Size;
  subject: string;
}

function Mark({ mark, x, y, r }: { mark: TimelineMark; x: number; y: number; r: number }) {
  const a = r * 0.4;
  return (
    <g className={`viz-tl__mark viz-tl__mark--${mark.tone}`}>
      {mark.current && <circle className="viz-tl__ring" cx={x} cy={y} r={r + 4} />}
      <circle className="viz-tl__dot" cx={x} cy={y} r={r} />
      {mark.tone === "bad" && (
        <path
          className="viz-tl__cross"
          d={`M${x - a} ${y - a}l${2 * a} ${2 * a}m0 ${-2 * a}l${-2 * a} ${2 * a}`}
        />
      )}
    </g>
  );
}

function groupByTick(marks: TimelineMark[]): [number, TimelineMark[]][] {
  const groups = new Map<number, TimelineMark[]>();
  for (const m of marks) groups.set(m.at, [...(groups.get(m.at) ?? []), m]);
  return [...groups.entries()];
}

export function TimelineShape({ model, size, subject }: TimelineShapeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const patternId = useId();
  const L = timelineLayout(size, {
    ticks: model.ticks,
    rows: model.rows.length,
    stack: model.stack,
    lanes: model.lanes,
    labeled: model.rows.some((r) => r.label !== ""),
  });
  useFollowScroll(wrapRef, model.now);
  const full = L.rung === "full";
  const cap = Math.max(1, model.stack);
  const plotH = L.axisY - L.bandTop;
  let lane = 0;
  return (
    <div className="viz-tl" ref={wrapRef}>
      <div className="viz-tl__inner" style={{ width: L.width, height: L.height }}>
        <svg
          className="viz-tl__svg"
          width={L.width}
          height={L.height}
          role="img"
          aria-label={timelineLabel(model, subject)}
        >
          <defs>
            <pattern
              id={patternId}
              width={6}
              height={6}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect className="viz-tl__hatch" width={3} height={6} />
            </pattern>
          </defs>
          {model.bands.map((b, i) => (
            <g key={`band-${b.from}`}>
              <rect
                className={`viz-tl__band viz-tl__band--${i % 2}`}
                x={L.x(b.from)}
                y={L.bandTop}
                width={(b.to - b.from + 1) * L.pitch}
                height={plotH}
                rx={6}
              />
              <text className="viz-tl__bandlabel" x={L.x(b.from) + 8} y={L.bandTop + 14}>
                {full ? b.label : (b.short ?? b.label)}
              </text>
            </g>
          ))}
          {model.spans
            .filter((s) => s.style !== "alert")
            .map((s) => (
              <rect
                key={`span-${s.style}-${s.from}-${s.to}`}
                className={`viz-tl__span viz-tl__span--${s.style}`}
                x={L.x(s.from)}
                y={L.bandTop}
                width={(s.to - s.from + 1) * L.pitch}
                height={plotH}
                rx={6}
                fill={s.style === "hatch" ? `url(#${patternId})` : undefined}
              />
            ))}
          {model.boundaries.map((b) => (
            <line
              key={`boundary-${b}`}
              className="viz-tl__boundary"
              x1={L.x(b)}
              x2={L.x(b)}
              y1={L.bandTop}
              y2={L.axisY}
            />
          ))}
          {model.rows.map((row, r) => (
            <g key={`row-${row.label || r}`}>
              {row.label !== "" && (
                <text className="viz-tl__rowlabel" x={L.x(0)} y={L.rowTop(r) + TL_ROW_LABEL_HEIGHT - 3}>
                  {row.label}
                </text>
              )}
              {groupByTick(row.marks).map(([at, group]) => {
                const shown = group.length > cap ? group.slice(0, cap - 1) : group;
                const hidden = group.length - shown.length;
                const base = L.rowBase(r);
                return (
                  <g key={`tick-${at}`}>
                    {shown.map((m, k) => (
                      <Mark
                        key={`${at}-${k}`}
                        mark={m}
                        x={L.cx(at)}
                        y={base - k * L.stackPitch}
                        r={L.markR}
                      />
                    ))}
                    {hidden > 0 && (
                      <g
                        className={`viz-tl__more${group.some((m) => m.current) ? " is-current" : ""}`}
                      >
                        <rect
                          x={L.cx(at) - 12}
                          y={base - shown.length * L.stackPitch - 7}
                          width={24}
                          height={14}
                          rx={7}
                        />
                        <text x={L.cx(at)} y={base - shown.length * L.stackPitch + 4} textAnchor="middle">
                          +{hidden}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          ))}
          <line className="viz-tl__axis" x1={L.x(0)} x2={L.x(model.ticks)} y1={L.axisY} y2={L.axisY} />
          {Array.from({ length: model.ticks }, (_, t) => t)
            .filter((t) => t % L.labelEvery === 0)
            .map((t) => (
              <text key={`tick-${t}`} className="viz-tl__tick" x={L.cx(t)} y={L.axisY + 14} textAnchor="middle">
                {t}
              </text>
            ))}
          {model.spans
            .filter((s) => s.label !== "")
            .map((s) => {
              const y = L.spanTop + lane * TL_LANE_HEIGHT;
              lane += 1;
              const text = full ? s.label : (s.short ?? s.label);
              const x1 = L.x(s.from) + 4;
              const w = Math.max(0, (s.to - s.from + 1) * L.pitch - 8);
              return (
                <g key={`label-${s.style}-${s.from}-${s.to}`}>
                  {s.style === "alert" && (
                    <path className="viz-tl__bracket" d={`M${x1} ${y - 12}v5h${w}v-5`} />
                  )}
                  <text
                    className={`viz-tl__spanlabel viz-tl__spanlabel--${s.style}`}
                    x={s.style === "alert" ? x1 + w / 2 : x1}
                    y={y}
                    textAnchor={s.style === "alert" ? "middle" : "start"}
                  >
                    {text}
                  </text>
                </g>
              );
            })}
          <path className="viz-tl__now" d={`M${L.cx(model.now) - 5} ${L.bandTop - 2}h10l-5 7z`} />
        </svg>
        <span
          className="viz-tl__anchor"
          data-index={model.now}
          style={{ left: L.x(model.now), width: L.pitch }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write the Composite tests**

`components/visualizer/shapes/CompositeShape.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CompositeModel, LinearModel, TimelineModel } from "@/lib/visualizer/core/shapes";
import { Shape } from "./Shape";

const linear: LinearModel = {
  kind: "linear",
  items: ["T2", "T1"],
  capacity: 3,
  next: "T1",
  active: null,
  tone: null,
  removed: null,
  labels: { entry: "refill", exit: "spent" },
  defaultAxis: "horizontal",
};
const timeline: TimelineModel = {
  kind: "timeline",
  ticks: 12,
  now: 3,
  stack: 1,
  lanes: 0,
  rows: [{ label: "", marks: [{ at: 3, tone: "good" }] }],
  bands: [],
  spans: [],
  boundaries: [],
};

describe("Composite", () => {
  it("draws its parts in order through Shape", () => {
    const model: CompositeModel = { kind: "composite", parts: [linear, timeline] };
    const { container } = render(
      <Shape model={model} rotated={false} size={{ w: 800, h: 560 }} subject="Limiter" />,
    );
    const parts = [...container.querySelectorAll(".viz-composite__part")];
    expect(parts).toHaveLength(2);
    expect(parts[0]?.querySelector(".viz-linear")).toBeTruthy();
    expect(parts[1]?.querySelector(".viz-tl")).toBeTruthy();
  });

  it("gives every part a fixed height that fits the stage", () => {
    const model: CompositeModel = { kind: "composite", parts: [timeline, linear] };
    const { container } = render(
      <Shape model={model} rotated={false} size={{ w: 800, h: 560 }} subject="Limiter" />,
    );
    const heights = [...container.querySelectorAll<HTMLElement>(".viz-composite__part")].map((p) =>
      Number.parseFloat(p.style.height),
    );
    expect(heights.every((h) => h > 0)).toBe(true);
    expect(heights.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(560);
  });

  it("a single-part composite fills a short card", () => {
    const model: CompositeModel = { kind: "composite", parts: [timeline] };
    const { container } = render(
      <Shape model={model} rotated={false} size={{ w: 250, h: 200 }} subject="Limiter" />,
    );
    expect(container.querySelectorAll(".viz-composite__part")).toHaveLength(1);
  });
});
```

- [ ] **Step 4: Write `CompositeShape.tsx`**

```tsx
import type { ReactNode } from "react";
import { compositeHeights, type Size } from "@/lib/visualizer/core/geometry";
import type { CompositeModel, LeafModel } from "@/lib/visualizer/core/shapes";

interface CompositeShapeProps {
  model: CompositeModel;
  size: Size;
  subject: string;
  renderPart: (part: LeafModel, size: Size) => ReactNode;
}

export function CompositeShape({ model, size, subject, renderPart }: CompositeShapeProps) {
  const heights = compositeHeights(size, model.parts);
  return (
    <div className="viz-composite" role="group" aria-label={subject}>
      {model.parts.map((part, i) => {
        const h = heights[i] ?? 0;
        return (
          <div key={`${i}-${part.kind}`} className="viz-composite__part" style={{ height: h }}>
            {renderPart(part, { w: size.w, h })}
          </div>
        );
      })}
    </div>
  );
}
```

(The index in the key is deliberate: a composite's parts are positional and fixed per algorithm.)

- [ ] **Step 5: Wire both shapes into `Shape.tsx`**

Replace the whole file with:

```tsx
import type { Size } from "@/lib/visualizer/core/geometry";
import { resolveAxis, type ShapeModel } from "@/lib/visualizer/core/shapes";
import { CompositeShape } from "./CompositeShape";
import { HistogramShape } from "./HistogramShape";
import { LanesShape } from "./LanesShape";
import { LinearShape } from "./LinearShape";
import { RankingShape } from "./RankingShape";
import { RingShape } from "./RingShape";
import { TimelineShape } from "./TimelineShape";

interface ShapeProps {
  model: ShapeModel;
  rotated: boolean;
  size: Size;
  subject: string;
}

export function Shape({ model, rotated, size, subject }: ShapeProps) {
  if (model.kind === "ring") return <RingShape model={model} subject={subject} />;
  if (model.kind === "ranking") return <RankingShape model={model} subject={subject} />;
  if (model.kind === "lanes") return <LanesShape model={model} subject={subject} />;
  if (model.kind === "timeline") return <TimelineShape model={model} size={size} subject={subject} />;
  if (model.kind === "composite") {
    return (
      <CompositeShape
        model={model}
        size={size}
        subject={subject}
        renderPart={(part, partSize) => (
          <Shape model={part} rotated={false} size={partSize} subject={subject} />
        )}
      />
    );
  }
  const axis = resolveAxis(model, rotated) ?? model.defaultAxis;
  if (model.kind === "linear") {
    return <LinearShape model={model} axis={axis} size={size} subject={subject} />;
  }
  return <HistogramShape model={model} axis={axis} subject={subject} />;
}
```

- [ ] **Step 6: Write the stylesheet and import it**

`css/view-visualizer/timeline.css`:

```css
/* ═══════════════════════════════════════════════
   VISUALIZER — TIMELINE AND COMPOSITE SHAPES
   ═══════════════════════════════════════════════ */
.viz-tl {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  overflow-x: auto;
  overflow-y: hidden;
}
.viz-tl__inner {
  position: relative;
  flex: none;
}
.viz-tl__svg {
  display: block;
  overflow: visible;
}
.viz-tl__svg text {
  font-family: var(--font);
  font-size: var(--text-xs);
  fill: var(--text-muted);
}
.viz-tl__svg .viz-tl__bandlabel,
.viz-tl__svg .viz-tl__rowlabel {
  fill: var(--text-body);
}
.viz-tl__svg .viz-tl__bandlabel {
  font-weight: var(--fw-semibold);
}
.viz-tl__band {
  fill: var(--viz-slot-bg);
  opacity: 0.6;
}
.viz-tl__band--1 {
  fill: var(--surface-3);
  opacity: 0.5;
}
.viz-tl__boundary {
  stroke: var(--viz-exit);
  stroke-width: 1.5;
  stroke-dasharray: 4 3;
}
.viz-tl__axis {
  stroke: var(--viz-slot-border);
}
.viz-tl__span--outline {
  fill: var(--accent-dim);
  stroke: var(--viz-active);
  stroke-width: 1.5;
  opacity: 0.7;
}
.viz-tl__span--fill {
  fill: var(--accent-dim);
}
.viz-tl__hatch {
  fill: var(--viz-active);
  opacity: 0.35;
}
.viz-tl__bracket {
  fill: none;
  stroke: var(--viz-bad);
  stroke-width: 1.5;
}
.viz-tl__svg .viz-tl__spanlabel--alert {
  fill: var(--viz-bad);
  font-weight: var(--fw-semibold);
}
.viz-tl__svg .viz-tl__spanlabel--outline,
.viz-tl__svg .viz-tl__spanlabel--fill {
  fill: var(--text-body);
}
.viz-tl__mark--good .viz-tl__dot {
  fill: var(--viz-good);
}
.viz-tl__mark--bad .viz-tl__dot {
  fill: var(--viz-bad-bg);
  stroke: var(--viz-bad);
  stroke-width: 2;
}
.viz-tl__cross {
  fill: none;
  stroke: var(--viz-bad);
  stroke-width: 1.6;
  stroke-linecap: round;
}
.viz-tl__mark--faded .viz-tl__dot {
  fill: none;
  stroke: var(--text-muted);
  stroke-width: 1.5;
  stroke-dasharray: 2 2;
  opacity: 0.8;
}
.viz-tl__ring {
  fill: none;
  stroke: var(--viz-active);
  stroke-width: 2;
}
.viz-tl__more rect {
  fill: var(--viz-slot-bg);
  stroke: var(--viz-slot-border);
}
.viz-tl__more.is-current rect {
  stroke: var(--viz-active);
  stroke-width: 2;
}
.viz-tl__svg .viz-tl__more text {
  fill: var(--text-heading);
  font-weight: var(--fw-semibold);
}
.viz-tl__now {
  fill: var(--viz-active);
}
.viz-tl__anchor {
  position: absolute;
  top: 0;
  height: 1px;
  pointer-events: none;
}

.viz-composite {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.viz-composite__part {
  position: relative;
  flex: none;
}
```

In `css/wiki.css`, add directly after the `stage.css` import line:

```css
@import "./view-visualizer/timeline.css";
```

---

### Task 5: Rate-limiting types, tick parsing and the workload generator

**Files:**
- Create: `lib/visualizer/rate-limiting/types.ts`, `lib/visualizer/rate-limiting/format.ts`, `lib/visualizer/rate-limiting/ticks.ts`, `lib/visualizer/rate-limiting/trace.ts`
- Create (tests): `lib/visualizer/rate-limiting/ticks.test.ts`, `lib/visualizer/rate-limiting/trace.test.ts`

**Interfaces:**
- Produces (types.ts): `ALGORITHM_IDS`, `AlgorithmId`, `WORKLOADS`, `Workload`, `Pace`, `PACES`, `MIN_LIMIT`, `MAX_LIMIT`, `MAX_REQUESTS`, `MAX_TICK`, `MIN_AXIS`, `Params`, `paramsOf(limit, pace)`, `axisOf(params, ticks)`, `RateInput`, `Decision`, `QueuedRequest`, `Snapshot`, `Limiter`, `LimiterFactory`, `AlgorithmMeta`.
- Produces (format.ts): `formatEstimate(scaled, window): string`, `plural(n, word): string`.
- Produces (ticks.ts): `parseTicks(raw): SequenceParse`, `TICKS_ERROR_NUMBER`, `TICKS_ERROR_ORDER`, `TICKS_ERROR_COUNT`.
- Produces (trace.ts): `generateTicks(workload, params, seed): number[]`.

- [ ] **Step 1: Write `types.ts`**

```ts
import type { Experiment } from "../core/types";

export const ALGORITHM_IDS = [
  "fixed-window",
  "sliding-log",
  "sliding-counter",
  "token-bucket",
  "leaky-bucket",
] as const;
export type AlgorithmId = (typeof ALGORITHM_IDS)[number];

export const WORKLOADS = ["steady", "burst", "straddle", "idle-burst"] as const;
export type Workload = (typeof WORKLOADS)[number];

export type Pace = 1 | 2;
export const PACES: readonly Pace[] = [1, 2];

export const MIN_LIMIT = 2;
export const MAX_LIMIT = 5;
export const MAX_REQUESTS = 14;
// The widest axis (Limit 5, Pace 2) has 20 ticks.
export const MAX_TICK = 19;
export const MIN_AXIS = 12;

export interface Params {
  limit: number;
  pace: Pace;
  window: number;
}
export const paramsOf = (limit: number, pace: Pace): Params => ({
  limit,
  pace,
  window: limit * pace,
});
export const axisOf = (p: Params, ticks: number[]): number =>
  Math.max(MIN_AXIS, 2 * p.window, (ticks[ticks.length - 1] ?? 0) + 1);

export interface RateInput {
  algorithm: AlgorithmId;
  limit: number;
  pace: Pace;
  workload: Workload;
  seed: number;
  ticks: number[] | null;
}

export interface Decision {
  ok: boolean;
  detail: string;
  // Leaky bucket only: how long this request waits and the tick it leaves.
  wait?: { ticks: number; leave: number };
}

export interface QueuedRequest {
  id: number;
  leave: number;
}

export type Snapshot =
  | { kind: "fixed"; window: number; counts: number[]; rejected: number[] }
  | { kind: "log"; kept: number[] }
  | {
      kind: "counter";
      window: number;
      counts: number[];
      previous: number;
      weight: number;
      current: number;
      // previous × weight + current × window; the estimate is scaled / window.
      scaled: number;
    }
  | {
      kind: "token";
      tokens: number[];
      refilled: number[];
      spent: number | null;
      nextIn: number | null;
    }
  | {
      kind: "leaky";
      queue: QueuedRequest[];
      processed: number;
      dropped: number;
      left: number[];
      leaves: number[];
    };

// begin() catches the limiter up to tick t and clears per-step events; request() then decides one request.
export interface Limiter {
  begin(t: number): string;
  request(t: number, index: number): Decision;
  snapshot(t: number): Snapshot;
}
export type LimiterFactory = (p: Params) => Limiter;

export interface AlgorithmMeta {
  id: AlgorithmId;
  name: string;
  chip: string;
  rule: string;
  // Step-tab lines; {tick} is filled per request.
  lines: string[];
  paths: { ok: number[]; bad: number[] };
  okWord: string;
  failWord: string;
  about: [string, string][];
  tries: Experiment[];
  anchor: string;
  summary: string;
  glossaryTerm: string;
  differs: string;
}
```

- [ ] **Step 2: Write `format.ts`**

```ts
export function formatEstimate(scaled: number, window: number): string {
  const v = scaled / window;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;
```

- [ ] **Step 3: Write the tick parser tests**

`lib/visualizer/rate-limiting/ticks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseTicks, TICKS_ERROR_COUNT, TICKS_ERROR_NUMBER, TICKS_ERROR_ORDER } from "./ticks";

describe("parseTicks", () => {
  it("reads whole numbers separated by spaces, commas or underscores", () => {
    expect(parseTicks("4 5 5 6 6 7 7 11")).toEqual({
      ok: true,
      tokens: ["4", "5", "5", "6", "6", "7", "7", "11"],
    });
    expect(parseTicks("4,5_5  6")).toEqual({ ok: true, tokens: ["4", "5", "5", "6"] });
  });

  it("normalises leading zeros", () => {
    expect(parseTicks("04 05")).toEqual({ ok: true, tokens: ["4", "5"] });
  });

  it("accepts the widest axis and nothing past it", () => {
    expect(parseTicks("0 19").ok).toBe(true);
    expect(parseTicks("0 20")).toEqual({ ok: false, error: TICKS_ERROR_NUMBER });
  });

  it("rejects text, decimals and negatives instead of reinterpreting them", () => {
    for (const raw of ["4 5 x", "2.5", "-3", "1e1", "3.0 4"]) {
      expect(parseTicks(raw), raw).toEqual({ ok: false, error: TICKS_ERROR_NUMBER });
    }
  });

  it("rejects ticks that go backwards", () => {
    expect(parseTicks("5 4")).toEqual({ ok: false, error: TICKS_ERROR_ORDER });
  });

  it("rejects an empty field and more than 14 requests", () => {
    expect(parseTicks("")).toEqual({ ok: false, error: TICKS_ERROR_COUNT });
    expect(parseTicks("  , ")).toEqual({ ok: false, error: TICKS_ERROR_COUNT });
    expect(parseTicks(Array.from({ length: 15 }, () => "3").join(" "))).toEqual({
      ok: false,
      error: TICKS_ERROR_COUNT,
    });
    expect(parseTicks(Array.from({ length: 14 }, () => "3").join(" ")).ok).toBe(true);
  });

  it("explains each error in one line", () => {
    expect(TICKS_ERROR_NUMBER).toBe("Ticks must be whole numbers from 0 to 19");
    expect(TICKS_ERROR_ORDER).toBe("Ticks must not go backwards");
    expect(TICKS_ERROR_COUNT).toBe("Use 1 to 14 requests");
  });
});
```

- [ ] **Step 4: Write `ticks.ts`**

```ts
import type { SequenceParse } from "../core/fields";
import { MAX_REQUESTS, MAX_TICK } from "./types";

export const TICKS_ERROR_NUMBER = `Ticks must be whole numbers from 0 to ${MAX_TICK}`;
export const TICKS_ERROR_ORDER = "Ticks must not go backwards";
export const TICKS_ERROR_COUNT = `Use 1 to ${MAX_REQUESTS} requests`;

// Dots and minus signs are not separators, so "2.5" and "-3" fail loudly instead of becoming ticks.
export function parseTicks(raw: string): SequenceParse {
  const parts = raw.split(/[\s,_]+/).filter((p) => p !== "");
  if (parts.length === 0) return { ok: false, error: TICKS_ERROR_COUNT };
  const nums: number[] = [];
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return { ok: false, error: TICKS_ERROR_NUMBER };
    const n = Number(p);
    if (n > MAX_TICK) return { ok: false, error: TICKS_ERROR_NUMBER };
    nums.push(n);
  }
  if (nums.some((n, i) => i > 0 && n < (nums[i - 1] ?? 0))) {
    return { ok: false, error: TICKS_ERROR_ORDER };
  }
  if (nums.length > MAX_REQUESTS) return { ok: false, error: TICKS_ERROR_COUNT };
  return { ok: true, tokens: nums.map(String) };
}
```

- [ ] **Step 5: Write the generator tests**

`lib/visualizer/rate-limiting/trace.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generateTicks } from "./trace";
import { axisOf, MAX_REQUESTS, paramsOf, type Pace, WORKLOADS } from "./types";

const DEFAULT = paramsOf(3, 2);
const COMBOS: [number, Pace][] = [2, 3, 4, 5].flatMap((l) => [[l, 1] as [number, Pace], [l, 2] as [number, Pace]]);

describe("generateTicks", () => {
  it("is deterministic per seed", () => {
    for (const w of WORKLOADS) {
      expect(generateTicks(w, DEFAULT, 0x7f3a)).toEqual(generateTicks(w, DEFAULT, 0x7f3a));
    }
  });

  it("boundary straddle at the defaults is exactly the default stream", () => {
    for (const seed of [0, 1, 0x7f3a]) {
      expect(generateTicks("straddle", DEFAULT, seed)).toEqual([4, 5, 5, 6, 6, 7, 7, 11]);
    }
  });

  it("burst is Limit + 2 requests at one tick, then one a window later", () => {
    const ticks = generateTicks("burst", DEFAULT, 9);
    const b = ticks[0] ?? -1;
    expect(ticks.slice(0, 5)).toEqual([b, b, b, b, b]);
    expect(ticks).toHaveLength(6);
    expect(ticks[5]).toBe(Math.min(11, b + 6));
    expect(b).toBeLessThan(6);
  });

  it("idle then burst drains the bucket, waits a window, then bursts Limit + 1", () => {
    const ticks = generateTicks("idle-burst", DEFAULT, 4);
    expect(ticks.slice(0, 3)).toEqual([0, 0, 0]);
    const g = ticks[3] ?? -1;
    expect(g).toBeGreaterThanOrEqual(6);
    expect(g).toBeLessThanOrEqual(11);
    expect(ticks.slice(3)).toEqual([g, g, g, g]);
  });

  it("steady spaces requests by the pace across the whole axis", () => {
    for (const seed of Array.from({ length: 10 }, (_, i) => i)) {
      const ticks = generateTicks("steady", DEFAULT, seed);
      expect(ticks).toHaveLength(6);
      expect(ticks.every((t, i) => i === 0 || t - (ticks[i - 1] ?? 0) === 2)).toBe(true);
      expect(ticks[0]).toBeLessThan(2);
    }
    expect(generateTicks("steady", paramsOf(3, 1), 0)).toHaveLength(12);
  });

  it("every motif is sorted, fits the axis and fits the 14-request cap for every Limit and Pace", () => {
    for (const [limit, pace] of COMBOS) {
      const p = paramsOf(limit, pace);
      for (const w of WORKLOADS) {
        for (const seed of [0, 1, 2, 3, 4, 5, 6, 7]) {
          const ticks = generateTicks(w, p, seed);
          const label = `${w} L${limit} K${pace} seed ${seed}`;
          expect(ticks.length, label).toBeGreaterThan(0);
          expect(ticks.length, label).toBeLessThanOrEqual(MAX_REQUESTS);
          expect(ticks.every((t, i) => i === 0 || t >= (ticks[i - 1] ?? 0)), label).toBe(true);
          expect(Math.max(...ticks), label).toBeLessThan(axisOf(p, []));
          expect(Math.min(...ticks), label).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("the straddle motif sits across a window boundary at every Limit and Pace", () => {
    for (const [limit, pace] of COMBOS) {
      const p = paramsOf(limit, pace);
      const ticks = generateTicks("straddle", p, 3);
      const before = ticks.filter((t) => t < (ticks[limit] ?? 0));
      expect(before.length).toBe(limit);
      const b = ticks[limit] ?? 0;
      expect(b % p.window).toBe(0);
    }
  });
});
```

- [ ] **Step 6: Write `trace.ts`**

```ts
import { mulberry32 } from "../core/rng";
import { axisOf, MAX_REQUESTS, type Params, type Workload } from "./types";

const repeat = (tick: number, n: number): number[] => Array.from({ length: n }, () => tick);

// Independent of the algorithm, so one seed gives one stream under every algorithm; each workload is a whole motif sized to the axis.
export function generateTicks(workload: Workload, p: Params, seed: number): number[] {
  const rand = mulberry32(seed);
  const axis = axisOf(p, []);
  const last = axis - 1;
  let ticks: number[];
  if (workload === "steady") {
    ticks = [];
    for (let t = Math.floor(rand() * p.pace); t <= last; t += p.pace) ticks.push(t);
  } else if (workload === "burst") {
    const b = Math.floor(rand() * Math.floor(axis / 2));
    ticks = [...repeat(b, p.limit + 2), Math.min(last, b + p.window)];
  } else if (workload === "straddle") {
    const windows = Math.floor(axis / p.window);
    const b = (1 + Math.floor(rand() * (windows - 1))) * p.window;
    const after = p.limit + 1;
    ticks = [
      b - 2,
      ...repeat(b - 1, p.limit - 1),
      ...repeat(b, Math.ceil(after / 2)),
      ...repeat(b + 1, Math.floor(after / 2)),
      Math.min(last, b + p.window - 1),
    ];
  } else {
    const g = p.window + Math.floor(rand() * (axis - p.window));
    ticks = [...repeat(0, p.limit), ...repeat(g, p.limit + 1)];
  }
  return ticks.slice(0, MAX_REQUESTS);
}
```

---

### Task 6: The five limiters, the engine and the property tests

**Files:**
- Create: `lib/visualizer/rate-limiting/algorithms/{fixed-window,sliding-log,sliding-counter,token-bucket,leaky-bucket,index}.ts`, `lib/visualizer/rate-limiting/engine.ts`, `lib/visualizer/rate-limiting/test-helpers.ts`
- Create (tests): `lib/visualizer/rate-limiting/algorithms/{fixed-window,sliding-log,sliding-counter,token-bucket,leaky-bucket}.test.ts`, `lib/visualizer/rate-limiting/engine.test.ts`

**Interfaces:**
- Consumes: everything from Task 5's `types.ts` and `format.ts`.
- Produces: `createFixedWindow`, `createSlidingLog`, `createSlidingCounter`, `createTokenBucket`, `createLeakyBucket` (each a `LimiterFactory`); `LIMITERS: Record<AlgorithmId, LimiterFactory>`; engine exports `Step`, `runSteps(id, params, ticks): Step[]`, `initialSnapshot(id, params): Snapshot`, `passTicks(id, steps, upTo): number[]`, `Peak`, `peakIn(ticks, window): Peak`; test helper `outcomes(id, ticks, limit?, pace?): string` and `stepsOf(...)`.

- [ ] **Step 1: Write the test helper**

`lib/visualizer/rate-limiting/test-helpers.ts`:

```ts
import { runSteps, type Step } from "./engine";
import { type AlgorithmId, type Pace, paramsOf } from "./types";

export function stepsOf(id: AlgorithmId, ticks: number[], limit = 3, pace: Pace = 2): Step[] {
  return runSteps(id, paramsOf(limit, pace), ticks);
}

// "A" for good, "R" for bad, one letter per request.
export function outcomes(id: AlgorithmId, ticks: number[], limit = 3, pace: Pace = 2): string {
  return stepsOf(id, ticks, limit, pace)
    .map((s) => (s.ok ? "A" : "R"))
    .join("");
}

export const DEFAULT_TICKS = [4, 5, 5, 6, 6, 7, 7, 11];
```

- [ ] **Step 2: Write the five algorithm test files**

`algorithms/fixed-window.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_TICKS, outcomes, stepsOf } from "../test-helpers";

describe("fixed window counter", () => {
  it("lets a burst straddling the boundary through twice", () => {
    expect(outcomes("fixed-window", DEFAULT_TICKS)).toBe("AAAAAARR");
  });

  it("rejects once the window is full when the burst stays inside it", () => {
    expect(outcomes("fixed-window", [1, 2, 2, 3, 3, 4, 4])).toBe("AAARRRR");
  });

  it("counts per clock-aligned window and says when the counter resets", () => {
    const steps = stepsOf("fixed-window", DEFAULT_TICKS);
    expect(steps.map((s) => s.gap)).toEqual(["", "", "", "new window, counter reset", "", "", "", ""]);
    const end = steps[7]?.after;
    expect(end?.kind === "fixed" && end.counts).toEqual([3, 3]);
    expect(end?.kind === "fixed" && end.rejected).toEqual([0, 2]);
  });

  it("describes the decision", () => {
    const steps = stepsOf("fixed-window", DEFAULT_TICKS);
    expect(steps[3]?.detail).toBe("window 1 now 1/3");
    expect(steps[6]?.detail).toBe("window 1 already full (3/3)");
  });

  it("works with a window of two ticks", () => {
    expect(outcomes("fixed-window", [0, 0, 0, 2, 2, 2], 2, 1)).toBe("AARAAR");
  });
});
```

`algorithms/sliding-log.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_TICKS, outcomes, stepsOf } from "../test-helpers";

describe("sliding window log", () => {
  it("never exceeds the limit inside any window", () => {
    expect(outcomes("sliding-log", DEFAULT_TICKS)).toBe("AAARRRRA");
  });

  it("slides: a full log keeps rejecting until its oldest entry ages out", () => {
    expect(outcomes("sliding-log", [5, 5, 5, 6, 7, 7])).toBe("AAARRR");
  });

  it("forgets a burst once it is a full window old", () => {
    expect(outcomes("sliding-log", [0, 0, 0, 6, 6, 6])).toBe("AAAAAA");
  });

  it("reports aged-out timestamps as the gap effect and keeps only the live ones", () => {
    const steps = stepsOf("sliding-log", DEFAULT_TICKS);
    expect(steps[7]?.gap).toBe("3 timestamps aged out");
    const end = steps[7]?.after;
    expect(end?.kind === "log" && end.kept).toEqual([11]);
    expect(steps[2]?.after.kind === "log" && steps[2].after.kept).toEqual([4, 5, 5]);
  });

  it("does not log rejected requests", () => {
    const steps = stepsOf("sliding-log", DEFAULT_TICKS);
    expect(steps[3]?.after.kind === "log" && steps[3].after.kept).toEqual([4, 5, 5]);
  });

  it("fills to the limit and no further", () => {
    expect(outcomes("sliding-log", [2, 2, 2, 2, 2, 3], 5, 2)).toBe("AAAAAR");
  });
});
```

`algorithms/sliding-counter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_TICKS, outcomes, stepsOf } from "../test-helpers";

describe("sliding window counter", () => {
  it("weights the previous window and recovers once it no longer overlaps", () => {
    expect(outcomes("sliding-counter", DEFAULT_TICKS)).toBe("AAAARRRA");
  });

  it("shows the estimate arithmetic in each decision", () => {
    const steps = stepsOf("sliding-counter", DEFAULT_TICKS);
    expect(steps[3]?.detail).toBe("estimate 3 × 5/6 + 0 = 2.5 < 3");
    expect(steps[4]?.detail).toBe("estimate 3 × 5/6 + 1 = 3.5 ≥ 3");
    expect(steps[7]?.detail).toBe("estimate 3 × 0/6 + 1 = 1 < 3");
  });

  it("can be too generous: it admits a fourth request the log would reject", () => {
    expect(outcomes("sliding-counter", [5, 5, 5, 6, 7, 7])).toBe("AAAARR");
    expect(outcomes("sliding-log", [5, 5, 5, 6, 7, 7])).toBe("AAARRR");
  });

  it("can be too strict: it still counts part of a burst the log has forgotten", () => {
    expect(outcomes("sliding-counter", [0, 0, 0, 6, 6, 6])).toBe("AAAARR");
    expect(outcomes("sliding-log", [0, 0, 0, 6, 6, 6])).toBe("AAAAAA");
  });

  it("treats a skipped window as empty", () => {
    expect(outcomes("sliding-counter", [0, 0, 0, 12, 12, 12])).toBe("AAAAAA");
  });

  it("snapshots the previous, current, weight and scaled estimate", () => {
    const end = stepsOf("sliding-counter", DEFAULT_TICKS)[4]?.after;
    expect(end).toMatchObject({ kind: "counter", window: 1, previous: 3, current: 1, weight: 5, scaled: 21 });
  });

  it("announces the window roll", () => {
    const steps = stepsOf("sliding-counter", DEFAULT_TICKS);
    expect(steps.map((s) => s.gap)).toEqual(["", "", "", "new window", "", "", "", ""]);
  });
});
```

`algorithms/token-bucket.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_TICKS, outcomes, stepsOf } from "../test-helpers";

describe("token bucket", () => {
  it("spends the burst, then refills slowly", () => {
    expect(outcomes("token-bucket", DEFAULT_TICKS)).toBe("AAAARRRA");
  });

  it("a full bucket serves a burst of its size and then runs dry", () => {
    expect(outcomes("token-bucket", [10, 10, 10, 10])).toBe("AAAR");
  });

  it("after the burst, only the refill pace gets through", () => {
    expect(outcomes("token-bucket", [0, 0, 0, 1, 2, 3])).toBe("AAARAR");
  });

  it("reports refills as the gap effect, capped at the bucket size", () => {
    const steps = stepsOf("token-bucket", DEFAULT_TICKS);
    expect(steps.map((s) => s.gap)).toEqual(["", "", "", "+1 token refilled", "", "", "", "+2 tokens refilled"]);
    expect(steps[7]?.detail).toBe("1 token left");
    expect(steps[4]?.detail).toBe("bucket empty");
  });

  it("tracks token ids: spend the oldest, refill adds new ones", () => {
    const steps = stepsOf("token-bucket", DEFAULT_TICKS);
    expect(steps[0]?.after).toMatchObject({ kind: "token", tokens: [2, 3], spent: 1, refilled: [] });
    expect(steps[3]?.after).toMatchObject({ kind: "token", tokens: [], spent: 4, refilled: [4] });
  });

  it("says when the next token arrives, and nothing when the bucket is full", () => {
    const steps = stepsOf("token-bucket", DEFAULT_TICKS);
    expect(steps[3]?.after.kind === "token" && steps[3].after.nextIn).toBe(2);
    const full = stepsOf("token-bucket", [11]);
    expect(full[0]?.before.kind === "token" && full[0].before.nextIn).toBeNull();
  });

  it("never holds more than its capacity", () => {
    const steps = stepsOf("token-bucket", [0, 19]);
    expect(steps[1]?.after.kind === "token" && steps[1].after.tokens.length).toBeLessThanOrEqual(3);
  });
});
```

`algorithms/leaky-bucket.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_TICKS, outcomes, stepsOf } from "../test-helpers";

describe("leaky bucket", () => {
  it("queues the burst's head, drops its tail and drains at its own pace", () => {
    expect(outcomes("leaky-bucket", DEFAULT_TICKS)).toBe("AAAARRRA");
  });

  it("knows when each queued request leaves and how long it waits", () => {
    const steps = stepsOf("leaky-bucket", DEFAULT_TICKS);
    expect(steps.map((s) => s.wait)).toEqual([
      { ticks: 2, leave: 6 },
      { ticks: 3, leave: 8 },
      { ticks: 5, leave: 10 },
      { ticks: 6, leave: 12 },
      undefined,
      undefined,
      undefined,
      { ticks: 3, leave: 14 },
    ]);
    expect(steps[3]?.detail).toBe("joins the queue at position 3, leaves at tick 12");
  });

  it("every scheduled leave is one pace after the last, however bursty the arrivals", () => {
    const end = stepsOf("leaky-bucket", DEFAULT_TICKS)[7]?.after;
    expect(end?.kind === "leaky" && end.leaves).toEqual([6, 8, 10, 12, 14]);
  });

  it("counts processed requests only once their leave tick has passed", () => {
    const steps = stepsOf("leaky-bucket", DEFAULT_TICKS);
    expect(steps[3]?.after).toMatchObject({ kind: "leaky", processed: 1, dropped: 1 });
    expect(steps[7]?.after).toMatchObject({ kind: "leaky", processed: 3, dropped: 3 });
  });

  it("reports the requests that left during the gap", () => {
    const steps = stepsOf("leaky-bucket", DEFAULT_TICKS);
    expect(steps[3]?.gap).toBe("1 processed while waiting");
    expect(steps[7]?.gap).toBe("2 processed while waiting");
    expect(steps[7]?.after.kind === "leaky" && steps[7].after.left).toEqual([2, 3]);
  });

  it("a full queue drops the tail, then the drain empties it before the next request", () => {
    const steps = stepsOf("leaky-bucket", [0, 0, 0, 0, 0, 0, 11]);
    expect(steps.map((s) => (s.ok ? "A" : "R")).join("")).toBe("AAARRRA");
    expect(steps[6]?.wait).toEqual({ ticks: 1, leave: 12 });
    expect(steps[5]?.after.kind === "leaky" && steps[5].after.leaves).toEqual([2, 4, 6]);
    expect(steps[3]?.detail).toBe("queue full (3/3), dropped");
  });

  it("the queue holds the requests whose leave tick has not come yet", () => {
    const steps = stepsOf("leaky-bucket", DEFAULT_TICKS);
    const q = steps[3]?.after.kind === "leaky" ? steps[3].after.queue : [];
    expect(q.map((r) => r.id)).toEqual([2, 3, 4]);
  });
});
```

- [ ] **Step 3: Write the five limiters**

`algorithms/fixed-window.ts`:

```ts
import type { LimiterFactory } from "../types";

export const createFixedWindow: LimiterFactory = (p) => {
  const counts: number[] = [];
  const rejected: number[] = [];
  let win = 0;
  let lastWin = 0;
  return {
    begin(t) {
      win = Math.floor(t / p.window);
      const rolled = win !== lastWin;
      lastWin = win;
      return rolled ? "new window, counter reset" : "";
    },
    request() {
      const used = counts[win] ?? 0;
      if (used < p.limit) {
        counts[win] = used + 1;
        return { ok: true, detail: `window ${win} now ${used + 1}/${p.limit}` };
      }
      rejected[win] = (rejected[win] ?? 0) + 1;
      return { ok: false, detail: `window ${win} already full (${p.limit}/${p.limit})` };
    },
    snapshot(t) {
      const w = Math.floor(t / p.window);
      const dense = (a: number[]): number[] => Array.from({ length: w + 1 }, (_, i) => a[i] ?? 0);
      return { kind: "fixed", window: w, counts: dense(counts), rejected: dense(rejected) };
    },
  };
};
```

`algorithms/sliding-log.ts`:

```ts
import { plural } from "../format";
import type { LimiterFactory } from "../types";

export const createSlidingLog: LimiterFactory = (p) => {
  let kept: number[] = [];
  return {
    begin(t) {
      const before = kept.length;
      kept = kept.filter((x) => x > t - p.window);
      const gone = before - kept.length;
      return gone > 0 ? `${plural(gone, "timestamp")} aged out` : "";
    },
    request(t) {
      if (kept.length < p.limit) {
        kept.push(t);
        return { ok: true, detail: `${kept.length} of ${p.limit} kept in the last ${p.window} ticks` };
      }
      return { ok: false, detail: `${kept.length} of ${p.limit} kept, so the log is full` };
    },
    snapshot() {
      return { kind: "log", kept: [...kept] };
    },
  };
};
```

`algorithms/sliding-counter.ts`:

```ts
import { formatEstimate } from "../format";
import type { LimiterFactory } from "../types";

export const createSlidingCounter: LimiterFactory = (p) => {
  const counts: number[] = [];
  let lastWin = 0;
  let rolled = false;
  // Share of the previous window's ticks still inside the bracket (t - window, t].
  const read = (t: number) => {
    const win = Math.floor(t / p.window);
    const previous = win > 0 ? (counts[win - 1] ?? 0) : 0;
    const current = counts[win] ?? 0;
    const weight = win > 0 ? p.window - 1 - (t % p.window) : 0;
    return { win, previous, current, weight, scaled: previous * weight + current * p.window };
  };
  return {
    begin(t) {
      const win = Math.floor(t / p.window);
      rolled = win !== lastWin;
      lastWin = win;
      return rolled ? "new window" : "";
    },
    request(t) {
      const r = read(t);
      const sum = `estimate ${r.previous} × ${r.weight}/${p.window} + ${r.current} = ${formatEstimate(r.scaled, p.window)}`;
      if (r.scaled < p.limit * p.window) {
        counts[r.win] = r.current + 1;
        return { ok: true, detail: `${sum} < ${p.limit}` };
      }
      return { ok: false, detail: `${sum} ≥ ${p.limit}` };
    },
    snapshot(t) {
      const r = read(t);
      return {
        kind: "counter",
        window: r.win,
        counts: Array.from({ length: r.win + 1 }, (_, i) => counts[i] ?? 0),
        previous: r.previous,
        weight: r.weight,
        current: r.current,
        scaled: r.scaled,
      };
    },
  };
};
```

`algorithms/token-bucket.ts`:

```ts
import { plural } from "../format";
import type { LimiterFactory } from "../types";

export const createTokenBucket: LimiterFactory = (p) => {
  // Token ids, oldest first; a request spends the oldest.
  const tokens: number[] = Array.from({ length: p.limit }, (_, i) => i + 1);
  let nextId = p.limit + 1;
  let last = 0;
  let refilled: number[] = [];
  let spent: number | null = null;
  return {
    begin(t) {
      refilled = [];
      spent = null;
      const due = Math.floor(t / p.pace) - Math.floor(last / p.pace);
      last = t;
      for (let i = 0; i < due && tokens.length < p.limit; i += 1) {
        tokens.push(nextId);
        refilled.push(nextId);
        nextId += 1;
      }
      return refilled.length ? `+${plural(refilled.length, "token")} refilled` : "";
    },
    request() {
      const id = tokens.shift();
      if (id === undefined) return { ok: false, detail: "bucket empty" };
      spent = id;
      return { ok: true, detail: `${plural(tokens.length, "token")} left` };
    },
    snapshot(t) {
      const nextIn = tokens.length >= p.limit ? null : (Math.floor(t / p.pace) + 1) * p.pace - t;
      return { kind: "token", tokens: [...tokens], refilled: [...refilled], spent, nextIn };
    },
  };
};
```

`algorithms/leaky-bucket.ts`:

```ts
import type { LimiterFactory, QueuedRequest } from "../types";

// A queued request's leave tick is fixed when it joins: the drain never pauses while the queue is non-empty.
export const createLeakyBucket: LimiterFactory = (p) => {
  const joined: QueuedRequest[] = [];
  let dropped = 0;
  let lastT = 0;
  let left: number[] = [];
  const nextDrain = (t: number): number => (Math.floor(t / p.pace) + 1) * p.pace;
  const waiting = (t: number): QueuedRequest[] => joined.filter((j) => j.leave > t);
  return {
    begin(t) {
      left = joined.filter((j) => j.leave > lastT && j.leave <= t).map((j) => j.id);
      lastT = t;
      return left.length ? `${left.length} processed while waiting` : "";
    },
    request(t, index) {
      const queued = waiting(t);
      if (queued.length >= p.limit) {
        dropped += 1;
        return { ok: false, detail: `queue full (${p.limit}/${p.limit}), dropped` };
      }
      const leave = nextDrain(t) + queued.length * p.pace;
      joined.push({ id: index + 1, leave });
      return {
        ok: true,
        detail: `joins the queue at position ${queued.length + 1}, leaves at tick ${leave}`,
        wait: { ticks: leave - t, leave },
      };
    },
    snapshot(t) {
      return {
        kind: "leaky",
        queue: waiting(t).map((j) => ({ ...j })),
        processed: joined.filter((j) => j.leave <= t).length,
        dropped,
        left: [...left],
        leaves: joined.map((j) => j.leave),
      };
    },
  };
};
```

`algorithms/index.ts`:

```ts
import type { AlgorithmId, LimiterFactory } from "../types";
import { createFixedWindow } from "./fixed-window";
import { createLeakyBucket } from "./leaky-bucket";
import { createSlidingCounter } from "./sliding-counter";
import { createSlidingLog } from "./sliding-log";
import { createTokenBucket } from "./token-bucket";

export const LIMITERS: Record<AlgorithmId, LimiterFactory> = {
  "fixed-window": createFixedWindow,
  "sliding-log": createSlidingLog,
  "sliding-counter": createSlidingCounter,
  "token-bucket": createTokenBucket,
  "leaky-bucket": createLeakyBucket,
};
```

- [ ] **Step 4: Write the engine tests**

`engine.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { initialSnapshot, passTicks, peakIn, runSteps } from "./engine";
import { DEFAULT_TICKS, outcomes, stepsOf } from "./test-helpers";
import { generateTicks } from "./trace";
import { ALGORITHM_IDS, axisOf, paramsOf, type Pace } from "./types";

describe("runSteps", () => {
  it("returns one step per request for every algorithm", () => {
    for (const id of ALGORITHM_IDS) {
      expect(stepsOf(id, DEFAULT_TICKS), id).toHaveLength(8);
    }
  });

  it("each step carries its before and after snapshot of the same kind", () => {
    for (const id of ALGORITHM_IDS) {
      const s = stepsOf(id, DEFAULT_TICKS)[2];
      expect(s?.before.kind, id).toBe(s?.after.kind);
    }
  });

  it("the first step's before-state is the initial state", () => {
    for (const id of ALGORITHM_IDS) {
      expect(stepsOf(id, DEFAULT_TICKS)[0]?.before, id).toEqual(initialSnapshot(id, paramsOf(3, 2)));
    }
  });

  it("the default stream gives the pinned outcomes under every algorithm", () => {
    expect(ALGORITHM_IDS.map((id) => outcomes(id, DEFAULT_TICKS))).toEqual([
      "AAAAAARR",
      "AAARRRRA",
      "AAAARRRA",
      "AAAARRRA",
      "AAAARRRA",
    ]);
  });

  it("accepts a tick past the default axis without clipping or throwing", () => {
    const p = paramsOf(3, 2);
    expect(axisOf(p, [0, 19])).toBe(20);
    for (const id of ALGORITHM_IDS) {
      const steps = runSteps(id, p, [0, 19]);
      expect(steps, id).toHaveLength(2);
      expect(steps[1]?.tick).toBe(19);
    }
  });
});

describe("peakIn and passTicks", () => {
  it("the default stream peaks at 6 under the fixed window, in a four-tick span", () => {
    const steps = stepsOf("fixed-window", DEFAULT_TICKS);
    expect(peakIn(passTicks("fixed-window", steps, 7), 6)).toEqual({ best: 6, from: 4, to: 7 });
  });

  it("the peak per algorithm on the default stream", () => {
    const peaks = ALGORITHM_IDS.map((id) =>
      peakIn(passTicks(id, stepsOf(id, DEFAULT_TICKS), 7), 6).best,
    );
    expect(peaks).toEqual([6, 3, 4, 4, 3]);
  });

  it("only counts requests up to the step asked for", () => {
    const steps = stepsOf("fixed-window", DEFAULT_TICKS);
    expect(peakIn(passTicks("fixed-window", steps, 2), 6).best).toBe(3);
  });

  it("the leaky bucket counts scheduled leave ticks, including ones still to come", () => {
    const steps = stepsOf("leaky-bucket", DEFAULT_TICKS);
    expect(passTicks("leaky-bucket", steps, 3)).toEqual([6, 8, 10, 12]);
    expect(passTicks("leaky-bucket", steps, 7)).toEqual([6, 8, 10, 12, 14]);
  });

  it("an empty stream has a zero peak", () => {
    expect(peakIn([], 6)).toEqual({ best: 0, from: 0, to: 0 });
  });
});

describe("the shared average rate", () => {
  it("Steady is never rejected by any algorithm at any Limit, Pace or start tick", () => {
    for (const limit of [2, 3, 4, 5]) {
      for (const pace of [1, 2] as Pace[]) {
        const p = paramsOf(limit, pace);
        for (const seed of Array.from({ length: 12 }, (_, i) => i)) {
          const ticks = generateTicks("steady", p, seed);
          for (const id of ALGORITHM_IDS) {
            const result = runSteps(id, p, ticks)
              .map((s) => (s.ok ? "A" : "R"))
              .join("");
            expect(result, `${id} L${limit} K${pace} seed ${seed}`).toBe("A".repeat(ticks.length));
          }
        }
      }
    }
  });
});
```

- [ ] **Step 5: Write `engine.ts`**

```ts
import { LIMITERS } from "./algorithms";
import type { AlgorithmId, Decision, Params, Snapshot } from "./types";

export interface Step {
  index: number;
  tick: number;
  ok: boolean;
  detail: string;
  gap: string;
  wait?: Decision["wait"];
  before: Snapshot;
  after: Snapshot;
}

export function initialSnapshot(id: AlgorithmId, p: Params): Snapshot {
  return LIMITERS[id](p).snapshot(0);
}

export function runSteps(id: AlgorithmId, p: Params, ticks: number[]): Step[] {
  const limiter = LIMITERS[id](p);
  let prev = 0;
  return ticks.map((tick, index): Step => {
    const before = limiter.snapshot(prev);
    const gap = limiter.begin(tick);
    const d = limiter.request(tick, index);
    const after = limiter.snapshot(tick);
    prev = tick;
    return {
      index,
      tick,
      ok: d.ok,
      detail: d.detail,
      gap,
      ...(d.wait ? { wait: d.wait } : {}),
      before,
      after,
    };
  });
}

// Allowed ticks up to step upTo; the leaky bucket counts every queued request's leave tick, scheduled or done.
export function passTicks(id: AlgorithmId, steps: Step[], upTo: number): number[] {
  if (id === "leaky-bucket") {
    const after = steps[upTo]?.after;
    return after?.kind === "leaky" ? after.leaves : [];
  }
  return steps
    .slice(0, upTo + 1)
    .filter((s) => s.ok)
    .map((s) => s.tick);
}

export interface Peak {
  best: number;
  from: number;
  to: number;
}

// The most ticks inside any span of `window` consecutive ticks, and the tightest span holding them.
export function peakIn(ticks: number[], window: number): Peak {
  let best = 0;
  let from = 0;
  let to = 0;
  const last = ticks.length ? Math.max(...ticks) : 0;
  for (let a = 0; a <= last; a += 1) {
    const inside = ticks.filter((t) => t >= a && t < a + window);
    if (inside.length > best) {
      best = inside.length;
      from = Math.min(...inside);
      to = Math.max(...inside);
    }
  }
  return { best, from, to };
}
```

---

### Task 7: Per-algorithm views (state → generic models)

**Files:**
- Create: `lib/visualizer/rate-limiting/view.ts`, `lib/visualizer/rate-limiting/view.test.ts`
- Depends on `copy.ts` for `okWord`/`failWord`, written in Task 8; to keep this task self-contained the view reads the words from `ALGORITHM_META`. Write `copy.ts` (Task 8) before running anything; no command is run until Task 12, so the order of writing is free.

**Interfaces:**
- Consumes: `Step`, `initialSnapshot`, `passTicks`, `peakIn`, `axisOf`, `ALGORITHM_META`, `formatEstimate`.
- Produces: `ViewContext`, `makeContext(id, params, ticks, steps, compact): ViewContext`, `viewOf(ctx, i): ShapeModel` where `i = -1` is the empty start state.

- [ ] **Step 1: Write the view tests**

`view.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { CompositeModel, LinearModel, TimelineModel } from "../core/shapes";
import { runSteps } from "./engine";
import { makeContext, viewOf } from "./view";
import { type AlgorithmId, paramsOf } from "./types";

const DEFAULT = [4, 5, 5, 6, 6, 7, 7, 11];

function at(id: AlgorithmId, i: number, ticks = DEFAULT, limit = 3, pace: 1 | 2 = 2, compact = false) {
  const p = paramsOf(limit, pace);
  const ctx = makeContext(id, p, ticks, runSteps(id, p, ticks), compact);
  return viewOf(ctx, i);
}
const asTimeline = (m: unknown): TimelineModel => {
  if ((m as TimelineModel).kind !== "timeline") throw new Error("not a timeline");
  return m as TimelineModel;
};
const asComposite = (m: unknown): CompositeModel => {
  if ((m as CompositeModel).kind !== "composite") throw new Error("not a composite");
  return m as CompositeModel;
};
const part = <T>(m: CompositeModel, i: number): T => m.parts[i] as T;

describe("fixed window view", () => {
  it("shows both full windows, the boundary and the double-limit spike at step 6", () => {
    const m = asTimeline(at("fixed-window", 5));
    expect(m.bands.map((b) => b.label)).toEqual(["window 0 · 3/3 full", "window 1 · 3/3 full"]);
    expect(m.bands.map((b) => b.short)).toEqual(["3/3", "3/3"]);
    expect(m.boundaries).toEqual([6]);
    expect(m.spans).toEqual([
      { from: 4, to: 7, label: "6 allowed in 4 ticks", short: "6 in 4", style: "alert" },
    ]);
    expect(m.now).toBe(7);
    expect(m.ticks).toBe(12);
  });

  it("marks the current request and tones allowed and rejected ones", () => {
    const m = asTimeline(at("fixed-window", 6));
    const marks = m.rows[0]?.marks ?? [];
    expect(marks).toHaveLength(7);
    expect(marks[6]).toMatchObject({ at: 7, tone: "bad", current: true, title: "rejected" });
    expect(marks[0]).toMatchObject({ at: 4, tone: "good", title: "allowed" });
    expect(marks.filter((k) => k.current)).toHaveLength(1);
  });

  it("has no alert while the peak is within the limit", () => {
    expect(asTimeline(at("fixed-window", 2)).spans).toEqual([]);
  });

  it("the empty start state has no marks and no spans", () => {
    const m = asTimeline(at("fixed-window", -1));
    expect(m.rows[0]?.marks).toEqual([]);
    expect(m.spans).toEqual([]);
    expect(m.bands.map((b) => b.label)).toEqual(["window 0 · 0/3", "window 1 · 0/3"]);
  });

  it("reserves one lane for the alert and the run-wide stack height", () => {
    const m = asTimeline(at("fixed-window", 0));
    expect(m.lanes).toBe(1);
    expect(m.stack).toBe(2);
  });
});

describe("sliding counter view", () => {
  it("brackets the last window, hatches the overlapped previous-window ticks and shows the estimate", () => {
    const m = asTimeline(at("sliding-counter", 4));
    expect(m.spans[0]).toMatchObject({ from: 1, to: 6, style: "outline", label: "last 6 ticks · estimate 3.5" });
    expect(m.spans[1]).toMatchObject({ from: 1, to: 5, style: "hatch", label: "" });
    expect(m.bands[0]?.label).toBe("window 0 · 3 × 5/6");
    expect(m.bands[0]?.short).toBe("3×5/6");
    expect(m.bands[1]?.label).toBe("window 1 · 1");
  });

  it("has no hatch once the bracket no longer overlaps the previous window", () => {
    const m = asTimeline(at("sliding-counter", 7));
    expect(m.spans.filter((s) => s.style === "hatch")).toEqual([]);
    expect(m.spans[0]?.label).toBe("last 6 ticks · estimate 1");
  });

  it("reserves two label lanes", () => {
    expect(asTimeline(at("sliding-counter", 0)).lanes).toBe(2);
  });
});

describe("sliding log view", () => {
  it("is a timeline over the log's own list", () => {
    const m = asComposite(at("sliding-log", 7));
    const t = part<TimelineModel>(m, 0);
    const list = part<LinearModel>(m, 1);
    expect(t.spans[0]).toMatchObject({ from: 6, to: 11, label: "last 6 ticks · kept 1/3" });
    expect(t.rows[0]?.marks.map((k) => `${k.at}:${k.tone}`)).toEqual([
      "4:faded",
      "5:faded",
      "5:faded",
      "6:bad",
      "6:bad",
      "7:bad",
      "7:bad",
      "11:good",
    ]);
    expect(list.items).toEqual(["t11"]);
    expect(list.capacity).toBe(3);
    expect(list.active).toBe("t11");
    expect(list.labels).toEqual({ entry: "newest", exit: "oldest ages out" });
  });

  it("lists the newest timestamp first and keeps duplicate ticks distinct", () => {
    const list = part<LinearModel>(asComposite(at("sliding-log", 2)), 1);
    expect(list.items).toEqual(["t5·2", "t5", "t4"]);
    expect(list.next).toBe("t4");
  });

  it("highlights nothing new when the request was rejected", () => {
    const list = part<LinearModel>(asComposite(at("sliding-log", 4)), 1);
    expect(list.active).toBeNull();
    expect(list.tone).toBeNull();
  });
});

describe("token bucket view", () => {
  it("shows the pile over a request strip, spending the oldest token", () => {
    const m = asComposite(at("token-bucket", 0));
    const pile = part<LinearModel>(m, 0);
    expect(pile.items).toEqual(["T3", "T2"]);
    expect(pile.removed).toBe("T1");
    expect(pile.labels).toEqual({ entry: "bucket full", exit: "spent" });
    expect(asTimeline(part<TimelineModel>(m, 1)).rows[0]?.marks).toHaveLength(1);
  });

  it("names the next refill and highlights a refilled token that is still held", () => {
    const m = asComposite(at("token-bucket", 7));
    const pile = part<LinearModel>(m, 0);
    expect(pile.items).toEqual(["T6"]);
    expect(pile.active).toBe("T6");
    expect(pile.tone).toBe("new");
    expect(pile.labels.entry).toBe("next token in 1 tick");
  });

  it("a refilled token that is spent at once is only shown leaving", () => {
    const pile = part<LinearModel>(asComposite(at("token-bucket", 3)), 0);
    expect(pile.items).toEqual([]);
    expect(pile.active).toBeNull();
    expect(pile.removed).toBe("T4");
  });

  it("alerts when more got through in a window than the limit", () => {
    const strip = part<TimelineModel>(asComposite(at("token-bucket", 7)), 1);
    expect(strip.spans[0]).toMatchObject({ style: "alert", label: "4 allowed in 3 ticks" });
  });
});

describe("leaky bucket view", () => {
  it("shows the queue over arrive and leave rows with future leaves faded", () => {
    const m = asComposite(at("leaky-bucket", 3));
    const queue = part<LinearModel>(m, 0);
    const t = part<TimelineModel>(m, 1);
    expect(queue.items).toEqual(["#4", "#3", "#2"]);
    expect(queue.next).toBe("#2");
    expect(queue.removed).toBe("#1");
    expect(queue.labels).toEqual({ entry: "arrive", exit: "leave every 2 ticks" });
    expect(t.rows.map((r) => r.label)).toEqual(["arrive", "leave"]);
    expect(t.rows[1]?.marks.map((k) => `${k.at}:${k.tone}`)).toEqual(["6:good", "8:faded", "10:faded"]);
  });

  it("clips leave ticks that fall beyond the axis", () => {
    const t = part<TimelineModel>(asComposite(at("leaky-bucket", 7)), 1);
    expect(t.rows[1]?.marks.map((k) => k.at)).toEqual([6, 8, 10]);
  });

  it("the compact form keeps only the timeline", () => {
    const m = asComposite(at("leaky-bucket", 3, DEFAULT, 3, 2, true));
    expect(m.parts).toHaveLength(1);
    expect(m.parts[0]?.kind).toBe("timeline");
  });

  it("never reserves a label lane", () => {
    expect(asTimeline(part<TimelineModel>(asComposite(at("leaky-bucket", 0)), 1)).lanes).toBe(0);
  });
});

describe("run-wide sizing", () => {
  it("caps the tallest pile of simultaneous marks at 4 so a Limit 5 burst stays on the stage", () => {
    const burst = [3, 3, 3, 3, 3, 3, 3, 9];
    const m = asTimeline(at("fixed-window", 7, burst, 5, 2));
    expect(m.stack).toBe(4);
    expect(m.rows[0]?.marks.filter((k) => k.at === 3)).toHaveLength(7);
  });

  it("stretches the axis to a tick past the default 12", () => {
    const m = asTimeline(at("fixed-window", 1, [0, 19]));
    expect(m.ticks).toBe(20);
    expect(m.bands.at(-1)?.to).toBe(19);
  });

  it("every step of every algorithm yields a model with the same ticks, stack and lanes", () => {
    for (const id of ["fixed-window", "sliding-counter"] as const) {
      const first = asTimeline(at(id, 0));
      const last = asTimeline(at(id, 7));
      expect([first.ticks, first.stack, first.lanes]).toEqual([last.ticks, last.stack, last.lanes]);
    }
  });
});
```

- [ ] **Step 2: Write `view.ts`**

```ts
import type {
  LinearModel,
  ShapeModel,
  TimelineBand,
  TimelineMark,
  TimelineModel,
  TimelineRow,
  TimelineSpan,
} from "../core/shapes";
import { ALGORITHM_META } from "./copy";
import { initialSnapshot, passTicks, peakIn, type Step } from "./engine";
import { formatEstimate } from "./format";
import { type AlgorithmId, axisOf, type Params, type Snapshot } from "./types";

const MAX_STACK = 4;
const LANES: Record<AlgorithmId, number> = {
  "fixed-window": 1,
  "sliding-log": 1,
  "sliding-counter": 2,
  "token-bucket": 1,
  "leaky-bucket": 0,
};

export interface ViewContext {
  id: AlgorithmId;
  params: Params;
  axis: number;
  steps: Step[];
  initial: Snapshot;
  stack: number;
  compact: boolean;
}

export function makeContext(
  id: AlgorithmId,
  params: Params,
  ticks: number[],
  steps: Step[],
  compact: boolean,
): ViewContext {
  const pile = new Map<number, number>();
  for (const t of ticks) pile.set(t, (pile.get(t) ?? 0) + 1);
  return {
    id,
    params,
    axis: axisOf(params, ticks),
    steps,
    initial: initialSnapshot(id, params),
    stack: Math.min(MAX_STACK, Math.max(1, ...pile.values())),
    compact,
  };
}

function snapOf<K extends Snapshot["kind"]>(s: Snapshot, kind: K): Extract<Snapshot, { kind: K }> {
  if (s.kind !== kind) throw new Error(`expected a ${kind} snapshot, got ${s.kind}`);
  return s as Extract<Snapshot, { kind: K }>;
}

// i is the step index; -1 is the empty start state.
const snapAt = (c: ViewContext, i: number): Snapshot => c.steps[i]?.after ?? c.initial;
const nowAt = (c: ViewContext, i: number): number => c.steps[i]?.tick ?? 0;

function arrivalMarks(c: ViewContext, i: number, aged?: (s: Step) => boolean): TimelineMark[] {
  const meta = ALGORITHM_META[c.id];
  return c.steps.slice(0, i + 1).map((s): TimelineMark => {
    let mark: TimelineMark;
    if (!s.ok) mark = { at: s.tick, tone: "bad", title: meta.failWord };
    else if (aged?.(s)) mark = { at: s.tick, tone: "faded", title: "aged out" };
    else mark = { at: s.tick, tone: "good", title: meta.okWord };
    return s.index === i ? { ...mark, current: true } : mark;
  });
}

function timeline(
  c: ViewContext,
  i: number,
  parts: Pick<TimelineModel, "rows"> & Partial<Pick<TimelineModel, "bands" | "spans" | "boundaries">>,
): TimelineModel {
  return {
    kind: "timeline",
    ticks: c.axis,
    now: nowAt(c, i),
    stack: c.stack,
    lanes: LANES[c.id],
    bands: [],
    spans: [],
    boundaries: [],
    ...parts,
  };
}

function alertSpans(c: ViewContext, i: number): TimelineSpan[] {
  if (i < 0) return [];
  const p = peakIn(passTicks(c.id, c.steps, i), c.params.window);
  if (p.best <= c.params.limit) return [];
  const width = p.to - p.from + 1;
  return [
    {
      from: p.from,
      to: p.to,
      label: `${p.best} allowed in ${width} ticks`,
      short: `${p.best} in ${width}`,
      style: "alert",
    },
  ];
}

function windowBands(
  c: ViewContext,
  text: (k: number) => { label: string; short: string },
): TimelineBand[] {
  const w = c.params.window;
  return Array.from({ length: Math.ceil(c.axis / w) }, (_, k) => ({
    from: k * w,
    to: Math.min(c.axis - 1, (k + 1) * w - 1),
    ...text(k),
  }));
}

const windowBoundaries = (c: ViewContext): number[] =>
  Array.from({ length: Math.ceil(c.axis / c.params.window) - 1 }, (_, k) => (k + 1) * c.params.window);

function fixedView(c: ViewContext, i: number): TimelineModel {
  const snap = snapOf(snapAt(c, i), "fixed");
  const { limit } = c.params;
  return timeline(c, i, {
    rows: [{ label: "", marks: arrivalMarks(c, i) }],
    bands: windowBands(c, (k) => {
      const used = snap.counts[k] ?? 0;
      return {
        label: `window ${k} · ${used}/${limit}${used >= limit ? " full" : ""}`,
        short: `${used}/${limit}`,
      };
    }),
    boundaries: windowBoundaries(c),
    spans: alertSpans(c, i),
  });
}

function counterView(c: ViewContext, i: number): TimelineModel {
  const snap = snapOf(snapAt(c, i), "counter");
  const { window: w } = c.params;
  const now = nowAt(c, i);
  const spans: TimelineSpan[] = [];
  if (i >= 0) {
    const from = Math.max(0, now - w + 1);
    const est = formatEstimate(snap.scaled, w);
    spans.push({
      from,
      to: now,
      label: `last ${w} ticks · estimate ${est}`,
      short: `est ${est}`,
      style: "outline",
    });
    if (snap.window > 0) {
      const overlapFrom = Math.max(from, (snap.window - 1) * w);
      const overlapTo = snap.window * w - 1;
      if (overlapTo >= overlapFrom) {
        spans.push({ from: overlapFrom, to: overlapTo, label: "", style: "hatch" });
      }
    }
    spans.push(...alertSpans(c, i));
  }
  return timeline(c, i, {
    rows: [{ label: "", marks: arrivalMarks(c, i) }],
    bands: windowBands(c, (k) => {
      const count = snap.counts[k] ?? 0;
      return i >= 0 && snap.window > 0 && k === snap.window - 1
        ? { label: `window ${k} · ${count} × ${snap.weight}/${w}`, short: `${count}×${snap.weight}/${w}` }
        : { label: `window ${k} · ${count}`, short: String(count) };
    }),
    boundaries: windowBoundaries(c),
    spans,
  });
}

// Repeated ticks get a suffix so every entry in the list has a unique key.
function tickLabels(ticks: number[]): string[] {
  const seen = new Map<number, number>();
  return ticks.map((t) => {
    const n = (seen.get(t) ?? 0) + 1;
    seen.set(t, n);
    return n === 1 ? `t${t}` : `t${t}·${n}`;
  });
}

function logView(c: ViewContext, i: number): ShapeModel {
  const snap = snapOf(snapAt(c, i), "log");
  const { window: w, limit } = c.params;
  const now = nowAt(c, i);
  const spans: TimelineSpan[] =
    i < 0
      ? []
      : [
          {
            from: Math.max(0, now - w + 1),
            to: now,
            label: `last ${w} ticks · kept ${snap.kept.length}/${limit}`,
            short: `kept ${snap.kept.length}/${limit}`,
            style: "outline",
          },
        ];
  const time = timeline(c, i, {
    rows: [{ label: "", marks: arrivalMarks(c, i, (s) => s.tick <= now - w) }],
    spans,
  });
  const items = tickLabels(snap.kept).reverse();
  const added = c.steps[i]?.ok === true;
  const list: LinearModel = {
    kind: "linear",
    items,
    capacity: limit,
    next: items[items.length - 1] ?? null,
    active: added ? (items[0] ?? null) : null,
    tone: added ? "new" : null,
    removed: null,
    labels: { entry: "newest", exit: "oldest ages out" },
    defaultAxis: "horizontal",
  };
  return { kind: "composite", parts: [time, list] };
}

function tokenView(c: ViewContext, i: number): ShapeModel {
  const snap = snapOf(snapAt(c, i), "token");
  const items = [...snap.tokens].reverse().map((id) => `T${id}`);
  const newest = snap.refilled[snap.refilled.length - 1];
  const refilled = newest === undefined ? null : `T${newest}`;
  const active = refilled !== null && items.includes(refilled) ? refilled : null;
  const entry =
    snap.nextIn === null
      ? "bucket full"
      : `next token in ${snap.nextIn} tick${snap.nextIn === 1 ? "" : "s"}`;
  const pile: LinearModel = {
    kind: "linear",
    items,
    capacity: c.params.limit,
    next: items[items.length - 1] ?? null,
    active,
    tone: active ? "new" : null,
    removed: i >= 0 && snap.spent !== null ? `T${snap.spent}` : null,
    labels: { entry, exit: "spent" },
    defaultAxis: "horizontal",
  };
  const strip = timeline(c, i, {
    rows: [{ label: "", marks: arrivalMarks(c, i) }],
    spans: alertSpans(c, i),
  });
  return { kind: "composite", parts: [pile, strip] };
}

function leakyView(c: ViewContext, i: number): ShapeModel {
  const snap = snapOf(snapAt(c, i), "leaky");
  const now = nowAt(c, i);
  const { limit, pace } = c.params;
  const items = [...snap.queue].reverse().map((q) => `#${q.id}`);
  const step = c.steps[i];
  const joined = step?.ok === true ? `#${step.index + 1}` : null;
  const lastLeft = snap.left[snap.left.length - 1];
  const queue: LinearModel = {
    kind: "linear",
    items,
    capacity: limit,
    next: items[items.length - 1] ?? null,
    active: joined !== null && items.includes(joined) ? joined : null,
    tone: joined !== null ? "new" : null,
    removed: lastLeft === undefined ? null : `#${lastLeft}`,
    labels: { entry: "arrive", exit: `leave every ${pace} tick${pace === 1 ? "" : "s"}` },
    defaultAxis: "horizontal",
  };
  const leaves: TimelineMark[] = snap.leaves
    .filter((t) => t < c.axis)
    .map((t): TimelineMark =>
      t <= now ? { at: t, tone: "good", title: "left" } : { at: t, tone: "faded", title: "scheduled" },
    );
  const rows: TimelineRow[] = [
    { label: "arrive", marks: arrivalMarks(c, i) },
    { label: "leave", marks: leaves },
  ];
  const time = timeline(c, i, { rows });
  return { kind: "composite", parts: c.compact ? [time] : [queue, time] };
}

export function viewOf(c: ViewContext, i: number): ShapeModel {
  switch (c.id) {
    case "fixed-window":
      return fixedView(c, i);
    case "sliding-counter":
      return counterView(c, i);
    case "sliding-log":
      return logView(c, i);
    case "token-bucket":
      return tokenView(c, i);
    case "leaky-bucket":
      return leakyView(c, i);
  }
}
```

---

### Task 8: Copy and frame assembly

**Files:**
- Create: `lib/visualizer/rate-limiting/copy.ts`, `lib/visualizer/rate-limiting/frames.ts`, `lib/visualizer/rate-limiting/frames.test.ts`, `lib/visualizer/rate-limiting/copy.test.ts`

**Interfaces:**
- Consumes: `AlgorithmMeta`, `Step`, `runSteps`, `passTicks`, `peakIn`, `makeContext`, `viewOf`, `formatEstimate`.
- Produces: `RATE_LIMITING_ARTICLE: string`, `ALGORITHM_META: Record<AlgorithmId, AlgorithmMeta>`, `BuiltRun { frames: VizFrame[]; empty: ShapeModel }`, `buildFrames(id, params, ticks, opts?: { compact?: boolean }): BuiltRun`.

- [ ] **Step 1: Write the copy tests**

`copy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ALGORITHM_META, RATE_LIMITING_ARTICLE } from "./copy";
import { runSteps } from "./engine";
import { ALGORITHM_IDS, paramsOf } from "./types";

describe("algorithm copy", () => {
  it("has an entry for every algorithm, keyed by its own id", () => {
    for (const id of ALGORITHM_IDS) expect(ALGORITHM_META[id].id).toBe(id);
  });

  it("links each algorithm to its heading in the rate-limiting article", () => {
    expect(RATE_LIMITING_ARTICLE).toBe("/system-design/algorithms/rate-limiting-algorithms/");
    expect(ALGORITHM_IDS.map((id) => ALGORITHM_META[id].anchor)).toEqual([
      "fixed-window-counter",
      "sliding-window-log",
      "sliding-window-counter",
      "token-bucket",
      "leaky-bucket",
    ]);
  });

  it("every step line index in a path exists, and both paths start with the tick move", () => {
    for (const id of ALGORITHM_IDS) {
      const m = ALGORITHM_META[id];
      for (const path of [m.paths.ok, m.paths.bad]) {
        expect(path[0], id).toBe(0);
        expect(path.every((n) => n >= 0 && n < m.lines.length), id).toBe(true);
      }
    }
  });

  it("each algorithm has two Try presets that patch the sequence, Limit and Pace together", () => {
    for (const id of ALGORITHM_IDS) {
      const tries = ALGORITHM_META[id].tries;
      expect(tries, id).toHaveLength(2);
      for (const t of tries) {
        expect(Array.isArray(t.patch.sequence), `${id} ${t.title}`).toBe(true);
        expect(typeof t.patch.limit, `${id} ${t.title}`).toBe("number");
        expect(["1", "2"], `${id} ${t.title}`).toContain(t.patch.pace);
      }
    }
  });

  it("every Try preset shows its point from any slider position, with the pinned outcome", () => {
    const pinned: Record<string, string> = {
      "fixed-window:Straddle the boundary": "AAAAAARR",
      "fixed-window:Move the burst off the boundary": "AAARRRR",
      "sliding-log:Same stream, no spike": "AAARRRRA",
      "sliding-log:Memory grows with Limit": "AAAAAR",
      "sliding-counter:Estimate too generous": "AAAARR",
      "sliding-counter:Estimate too strict": "AAAARR",
      "token-bucket:Idle buys a burst": "AAAR",
      "token-bucket:Refill is the real limit": "AAARAR",
      "leaky-bucket:Smooth output": "AAAARRRA",
      "leaky-bucket:A full queue drops the tail": "AAARRRA",
    };
    for (const id of ALGORITHM_IDS) {
      for (const t of ALGORITHM_META[id].tries) {
        const patch = t.patch;
        const ticks = (patch.sequence as string[]).map(Number);
        const params = paramsOf(patch.limit as number, patch.pace === "1" ? 1 : 2);
        const got = runSteps(id, params, ticks)
          .map((s) => (s.ok ? "A" : "R"))
          .join("");
        expect(got, `${id}:${t.title}`).toBe(pinned[`${id}:${t.title}`]);
      }
    }
  });

  it("the sliding-counter presets contrast with the log as their blurbs say", () => {
    const generous = runSteps("sliding-log", paramsOf(3, 2), [5, 5, 5, 6, 7, 7]);
    expect(generous.map((s) => (s.ok ? "A" : "R")).join("")).toBe("AAARRR");
    const strict = runSteps("sliding-log", paramsOf(3, 2), [0, 0, 0, 6, 6, 6]);
    expect(strict.map((s) => (s.ok ? "A" : "R")).join("")).toBe("AAAAAA");
  });

  it("revision copy is set for every algorithm, with its glossary term", () => {
    for (const id of ALGORITHM_IDS) {
      const m = ALGORITHM_META[id];
      expect(m.summary.length, id).toBeGreaterThan(10);
      expect(m.differs.length, id).toBeGreaterThan(10);
    }
    expect(ALGORITHM_IDS.map((id) => ALGORITHM_META[id].glossaryTerm)).toEqual([
      "fixed window counter",
      "sliding window log",
      "sliding window counter",
      "token bucket",
      "leaky bucket",
    ]);
  });
});
```

- [ ] **Step 2: Write `copy.ts`**

```ts
import type { AlgorithmId, AlgorithmMeta } from "./types";

export const RATE_LIMITING_ARTICLE = "/system-design/algorithms/rate-limiting-algorithms/";

const DEFAULT_SEQ = ["4", "5", "5", "6", "6", "7", "7", "11"];

export const ALGORITHM_META: Record<AlgorithmId, AlgorithmMeta> = {
  "fixed-window": {
    id: "fixed-window",
    name: "Fixed window",
    chip: "Timeline",
    rule: "Count requests in clock-aligned windows and reset the count at each boundary.",
    lines: [
      "Move to tick {tick}; if a new window began, reset the count.",
      "Below the limit → allow and count it.",
      "At the limit → reject.",
    ],
    paths: { ok: [0, 1], bad: [0, 2] },
    okWord: "allowed",
    failWord: "rejected",
    about: [
      ["Cost", "O(1) memory and time per client: one counter"],
      ["Wins", "the cheapest of the five; easy to build on an atomic increment with an expiry"],
      ["Loses", "a burst split across a window boundary can pass twice the limit"],
      ["Seen in", "simple per-minute API quotas"],
      ["Rate", "Limit per window, the same average rate as the other four"],
    ],
    tries: [
      {
        title: "Straddle the boundary",
        blurb: "Six requests slip through in four ticks, twice the limit, because the window resets in the middle of the burst.",
        patch: { sequence: DEFAULT_SEQ, limit: 3, pace: "2" },
      },
      {
        title: "Move the burst off the boundary",
        blurb: "The same burst inside one window: only the limit gets through.",
        patch: { sequence: ["1", "2", "2", "3", "3", "4", "4"], limit: 3, pace: "2" },
      },
    ],
    anchor: "fixed-window-counter",
    summary: "Count requests in clock-aligned windows; reset at each boundary.",
    glossaryTerm: "fixed window counter",
    differs: "Cheapest, but a burst split across a boundary gets double the limit.",
  },
  "sliding-log": {
    id: "sliding-log",
    name: "Sliding log",
    chip: "Timeline + list",
    rule: "Keep a timestamp for every allowed request and count the ones in the last window.",
    lines: [
      "Move to tick {tick}; drop timestamps older than the window.",
      "Fewer than the limit kept → allow and keep this tick.",
      "At the limit → reject.",
    ],
    paths: { ok: [0, 1], bad: [0, 2] },
    okWord: "allowed",
    failWord: "rejected",
    about: [
      ["Cost", "O(limit) memory per client, plus pruning on each request"],
      ["Wins", "exact: no boundary spike is possible"],
      ["Loses", "memory grows with the limit, which hurts at high limits and many clients"],
      ["Seen in", "strict limits such as login attempts"],
      ["Rate", "Limit per window, the same average rate as the other four"],
    ],
    tries: [
      {
        title: "Same stream, no spike",
        blurb: "The window slides with now, so the burst can never exceed the limit.",
        patch: { sequence: DEFAULT_SEQ, limit: 3, pace: "2" },
      },
      {
        title: "Memory grows with Limit",
        blurb: "Five allowed requests means five timestamps to keep.",
        patch: { sequence: ["2", "2", "2", "2", "2", "3"], limit: 5, pace: "2" },
      },
    ],
    anchor: "sliding-window-log",
    summary: "Keep a timestamp for every allowed request; count those in the last window.",
    glossaryTerm: "sliding window log",
    differs: "Exact, no spike, but memory grows with the limit.",
  },
  "sliding-counter": {
    id: "sliding-counter",
    name: "Sliding counter",
    chip: "Timeline",
    rule: "Estimate the last window from two counters, weighting the previous window by its overlap.",
    lines: [
      "Move to tick {tick}; if a new window began, the old count becomes the previous one.",
      "Estimate = previous × share still inside the window + current.",
      "Estimate below the limit → allow and count it.",
      "Otherwise → reject.",
    ],
    paths: { ok: [0, 1, 2], bad: [0, 1, 3] },
    okWord: "allowed",
    failWord: "rejected",
    about: [
      ["Cost", "O(1): two counters per client"],
      ["Wins", "close to the log's accuracy for the price of a fixed window"],
      ["Loses", "only an estimate: it assumes the previous window was evenly spread"],
      ["Seen in", "high-volume API gateways"],
      ["Rate", "Limit per window, the same average rate as the other four"],
    ],
    tries: [
      {
        title: "Estimate too generous",
        blurb: "Three requests end one window and one more lands just after the boundary: the estimate lets a fourth through where the log would not.",
        patch: { sequence: ["5", "5", "5", "6", "7", "7"], limit: 3, pace: "2" },
      },
      {
        title: "Estimate too strict",
        blurb: "The burst was a whole window ago, but the estimate still counts part of it and rejects requests the log would allow.",
        patch: { sequence: ["0", "0", "0", "6", "6", "6"], limit: 3, pace: "2" },
      },
    ],
    anchor: "sliding-window-counter",
    summary: "Weight the previous window's count by how much of it the last window still covers.",
    glossaryTerm: "sliding window counter",
    differs: "Close to the log's accuracy in two counters, but only an estimate.",
  },
  "token-bucket": {
    id: "token-bucket",
    name: "Token bucket",
    chip: "Tokens + timeline",
    rule: "Spend a token per request; tokens refill at a steady pace up to the bucket size.",
    lines: [
      "Move to tick {tick}; add a token for every refill passed, up to the bucket size.",
      "A token is left → spend it and allow.",
      "Empty → reject.",
    ],
    paths: { ok: [0, 1], bad: [0, 2] },
    okWord: "allowed",
    failWord: "rejected",
    about: [
      ["Cost", "O(1): a token count and the time of the last refill"],
      ["Wins", "allows a burst up to the bucket size while holding the long-run rate"],
      ["Loses", "the protected service still sees the bursts"],
      ["Seen in", "API gateways and cloud API quotas"],
      ["Rate", "One token per Pace ticks, the same average rate as the other four"],
    ],
    tries: [
      {
        title: "Idle buys a burst",
        blurb: "A full bucket serves a burst of three at once, then the fourth finds it empty.",
        patch: { sequence: ["10", "10", "10", "10"], limit: 3, pace: "2" },
      },
      {
        title: "Refill is the real limit",
        blurb: "After the burst, one request gets through each time a token refills.",
        patch: { sequence: ["0", "0", "0", "1", "2", "3"], limit: 3, pace: "2" },
      },
    ],
    anchor: "token-bucket",
    summary: "Spend a token per request; tokens refill at a steady pace up to a cap.",
    glossaryTerm: "token bucket",
    differs: "Allows a burst up to the bucket size after idle time.",
  },
  "leaky-bucket": {
    id: "leaky-bucket",
    name: "Leaky bucket",
    chip: "Queue + timeline",
    rule: "Queue requests and release them at a constant pace; drop when the queue is full.",
    lines: [
      "Move to tick {tick}; the queue releases one request every pace.",
      "Room in the queue → join it and wait for your turn.",
      "Queue full → drop.",
    ],
    paths: { ok: [0, 1], bad: [0, 2] },
    okWord: "queued",
    failWord: "dropped",
    about: [
      ["Cost", "O(limit): the queue itself"],
      ["Wins", "a constant output rate that protects a fragile downstream"],
      ["Loses", "requests wait, and the tail of a burst is dropped"],
      ["Seen in", "traffic shaping and payment pipelines"],
      ["Rate", "One request leaves per Pace ticks, the same average rate as the other four"],
    ],
    tries: [
      {
        title: "Smooth output",
        blurb: "However bursty the arrivals, requests leave one every two ticks.",
        patch: { sequence: DEFAULT_SEQ, limit: 3, pace: "2" },
      },
      {
        title: "A full queue drops the tail",
        blurb: "Six at once: three queue and three are dropped; the queue then drains at its own pace.",
        patch: { sequence: ["0", "0", "0", "0", "0", "0", "11"], limit: 3, pace: "2" },
      },
    ],
    anchor: "leaky-bucket",
    summary: "Queue requests and release them at a constant pace; drop when the queue is full.",
    glossaryTerm: "leaky bucket",
    differs: "Output is always smooth, but requests wait and a burst's tail is dropped.",
  },
};
```

- [ ] **Step 3: Write the frame tests**

`frames.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { richText } from "../core/rich";
import { buildFrames } from "./frames";
import { ALGORITHM_IDS, paramsOf } from "./types";

const DEFAULT = [4, 5, 5, 6, 6, 7, 7, 11];
const P = paramsOf(3, 2);
const run = (id: (typeof ALGORITHM_IDS)[number], compact = false) =>
  buildFrames(id, P, DEFAULT, { compact });

describe("frames", () => {
  it("builds one frame per request, the same count under every algorithm", () => {
    for (const id of ALGORITHM_IDS) expect(run(id).frames, id).toHaveLength(8);
  });

  it("fixed window: badges, strip outcomes and the peak so far", () => {
    const { frames } = run("fixed-window");
    expect(frames.map((f) => f.badge)).toEqual([
      "ALLOWED", "ALLOWED", "ALLOWED", "ALLOWED", "ALLOWED", "ALLOWED", "REJECTED", "REJECTED",
    ]);
    expect(frames.map((f) => f.outcome)).toEqual([
      "good", "good", "good", "good", "good", "good", "bad", "bad",
    ]);
    expect(frames.map((f) => f.metric)).toEqual(["1", "2", "3", "4", "5", "6", "6", "6"]);
    expect(frames.map((f) => f.label)).toEqual(["t4", "t5", "t5", "t6", "t6", "t7", "t7", "t11"]);
  });

  it("peak so far under the sliding log and the leaky bucket", () => {
    expect(run("sliding-log").frames.map((f) => f.metric)).toEqual(["1", "2", "3", "3", "3", "3", "3", "3"]);
    expect(run("leaky-bucket").frames.map((f) => f.metric)).toEqual(["1", "2", "3", "3", "3", "3", "3", "3"]);
  });

  it("the leaky bucket says queued and dropped", () => {
    const { frames } = run("leaky-bucket");
    expect(frames.map((f) => f.badge)).toEqual([
      "QUEUED", "QUEUED", "QUEUED", "QUEUED", "DROPPED", "DROPPED", "DROPPED", "QUEUED",
    ]);
  });

  it("the caption leads with the gap effect, then tick, outcome and the decision", () => {
    const { frames } = run("fixed-window");
    expect(richText(frames[3]?.caption ?? [])).toBe(
      "new window, counter reset · tick 6 allowed — window 1 now 1/3",
    );
    expect(richText(frames[0]?.caption ?? [])).toBe("tick 4 allowed — window 0 now 1/3");
  });

  it("the leaky caption says how long a queued request waits", () => {
    expect(richText(run("leaky-bucket").frames[3]?.caption ?? [])).toBe(
      "1 processed while waiting · tick 6 queued — joins the queue at position 3, leaves at tick 12",
    );
  });

  it("step lines and the executed path follow the outcome", () => {
    const { frames } = run("fixed-window");
    expect(richText(frames[0]?.lines[0] ?? [])).toBe("Move to tick 4; if a new window began, reset the count.");
    expect(frames[0]?.path).toEqual([0, 1]);
    expect(frames[6]?.path).toEqual([0, 2]);
    expect(run("sliding-counter").frames[4]?.path).toEqual([0, 1, 3]);
  });

  it("variables keep the same names on every frame of a run", () => {
    for (const id of ALGORITHM_IDS) {
      const { frames } = run(id);
      const names = frames[0]?.vars.map((v) => v.name);
      for (const f of frames) expect(f.vars.map((v) => v.name), id).toEqual(names);
    }
  });

  it("variables show the numbers of the algorithm", () => {
    const val = (id: (typeof ALGORITHM_IDS)[number], i: number, name: string) =>
      run(id).frames[i]?.vars.find((v) => v.name === name)?.value;
    expect(val("fixed-window", 5, "count in window")).toBe("3");
    expect(val("sliding-counter", 4, "estimate")).toBe("3.5");
    expect(val("sliding-counter", 4, "weight")).toBe("5/6");
    expect(val("sliding-log", 7, "oldest kept")).toBe("11");
    expect(val("token-bucket", 3, "next refill in")).toBe("2");
    expect(val("leaky-bucket", 3, "waits (ticks)")).toBe("6 (leaves 12)");
    expect(val("leaky-bucket", 4, "waits (ticks)")).toBe("—");
    expect(val("fixed-window", 0, "ticks since last")).toBe("—");
    expect(val("fixed-window", 3, "ticks since last")).toBe("1");
  });

  it("each frame carries a model of the right kind for its algorithm", () => {
    const kinds = ALGORITHM_IDS.map((id) => run(id).frames[3]?.model.kind);
    expect(kinds).toEqual(["timeline", "composite", "timeline", "composite", "composite"]);
  });

  it("builds an empty start state for Revision", () => {
    for (const id of ALGORITHM_IDS) {
      const m = run(id).empty;
      const marks =
        m.kind === "timeline"
          ? m.rows.flatMap((r) => r.marks)
          : m.kind === "composite"
            ? m.parts.flatMap((p) => (p.kind === "timeline" ? p.rows.flatMap((r) => r.marks) : []))
            : [];
      expect(marks, id).toEqual([]);
    }
  });

  it("is deterministic", () => {
    expect(run("token-bucket").frames).toEqual(run("token-bucket").frames);
  });
});
```

- [ ] **Step 4: Write `frames.ts`**

```ts
import { badText, fill, goodText, keyText, type Rich } from "../core/rich";
import type { ShapeModel } from "../core/shapes";
import type { VarRow, VizFrame } from "../core/types";
import { ALGORITHM_META } from "./copy";
import { passTicks, peakIn, runSteps, type Step } from "./engine";
import { formatEstimate } from "./format";
import { type AlgorithmId, type Params } from "./types";
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
```

---

### Task 9: Revision cards, the module, registration and routes

**Files:**
- Create: `lib/visualizer/rate-limiting/revision.ts`, `lib/visualizer/rate-limiting/revision.test.ts`, `lib/visualizer/rate-limiting/module.ts`, `lib/visualizer/rate-limiting/module.test.ts`
- Modify: `lib/visualizer/registry.ts`, `lib/visualizer/modules.ts`, `app/visualizer.test.tsx`

**Interfaces:**
- Consumes: `buildFrames`, `ALGORITHM_META`, `parseTicks`, `generateTicks`, `paramsOf`, `axisOf`.
- Produces: `rateLimitingRevision(): RevisionCard[]`, `RATE_LIMITING_SECTIONS: FieldSection[]`, `toRateInput(values): RateInput`, `rateLimitingModule: VisualizerModule`.

- [ ] **Step 1: Write the revision tests**

`revision.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALGORITHM_META } from "./copy";
import { rateLimitingRevision } from "./revision";
import { ALGORITHM_IDS } from "./types";

describe("rate-limiting revision", () => {
  const cards = rateLimitingRevision();

  it("has one card per algorithm in variant order", () => {
    expect(cards.map((c) => c.id)).toEqual([...ALGORITHM_IDS]);
    expect(cards.map((c) => c.name)).toEqual(ALGORITHM_IDS.map((id) => ALGORITHM_META[id].name));
  });

  it("each card plays the eight steps of the mini stream and describes them for screen readers", () => {
    for (const c of cards) {
      expect(c.steps, c.id).toBe(8);
      expect(c.stepsText, c.id).toHaveLength(8);
      expect(c.stepsText[0], c.id).toMatch(/^Request t4: /);
    }
  });

  it("render(0) is the empty start state and render(8) is the finished state", () => {
    for (const c of cards) {
      const first = c.render(0);
      const last = c.render(8);
      expect(first.kind, c.id).toBe("shape");
      expect(last.kind, c.id).toBe("shape");
      if (first.kind === "shape") expect(JSON.stringify(first.model)).not.toContain('"current":true');
      if (last.kind === "shape") expect(JSON.stringify(last.model)).toContain('"current":true');
    }
  });

  it("the leaky bucket card drops the queue part to fit a 200px card", () => {
    const card = cards.find((c) => c.id === "leaky-bucket");
    const visual = card?.render(4);
    expect(visual?.kind === "shape" && visual.model.kind === "composite" && visual.model.parts).toHaveLength(1);
  });

  it("every card names a term that exists in the glossary", () => {
    const glossary = JSON.parse(readFileSync(join(process.cwd(), "data/glossary.json"), "utf8")) as Record<string, string>;
    for (const c of cards) {
      expect(c.glossaryTerm, c.id).toBeTruthy();
      expect(glossary[c.glossaryTerm ?? ""], c.id).toBeTruthy();
    }
  });

  it("summary and differs come from the copy", () => {
    for (const c of cards) {
      expect(c.summary).toBe(ALGORITHM_META[c.id as (typeof ALGORITHM_IDS)[number]].summary);
      expect(c.differs).toBe(ALGORITHM_META[c.id as (typeof ALGORITHM_IDS)[number]].differs);
    }
  });
});
```

- [ ] **Step 2: Write `revision.ts`**

```ts
import { richText } from "../core/rich";
import type { RevisionCard } from "../core/types";
import { ALGORITHM_META } from "./copy";
import { buildFrames } from "./frames";
import { ALGORITHM_IDS, paramsOf } from "./types";

export const MINI_TICKS = [4, 5, 5, 6, 6, 7, 7, 11];
export const MINI_PARAMS = paramsOf(3, 2);

export function rateLimitingRevision(): RevisionCard[] {
  return ALGORITHM_IDS.map((id) => {
    const meta = ALGORITHM_META[id];
    const run = buildFrames(id, MINI_PARAMS, MINI_TICKS, { compact: true });
    return {
      id,
      name: meta.name,
      steps: run.frames.length,
      render: (lit) => {
        if (lit <= 0) return { kind: "shape", model: run.empty };
        const model = run.frames[Math.min(lit, run.frames.length) - 1]?.model;
        if (!model) throw new Error(`no frame for ${id}`);
        return { kind: "shape", model };
      },
      stepsText: run.frames.map(
        (f) => `Request ${f.label}: ${f.badge.toLowerCase()}. ${richText(f.caption)}`,
      ),
      summary: meta.summary,
      glossaryTerm: meta.glossaryTerm,
      differs: meta.differs,
    };
  });
}
```

- [ ] **Step 3: Write the module tests**

`module.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { allFields, applyChange, SEED_MAX } from "../core/fields";
import { encodeState, parseState } from "../core/url-state";
import { ALGORITHM_META, RATE_LIMITING_ARTICLE } from "./copy";
import { RATE_LIMITING_SECTIONS, rateLimitingModule, toRateInput } from "./module";
import { ALGORITHM_IDS, WORKLOADS } from "./types";

const defaults = () => rateLimitingModule.defaults();

describe("rate-limiting module", () => {
  it("defaults are the hand-picked stream on the fixed window", () => {
    const d = defaults();
    expect(d).toMatchObject({
      algorithm: "fixed-window",
      limit: 3,
      pace: "2",
      workload: "straddle",
      sequence: ["4", "5", "5", "6", "6", "7", "7", "11"],
    });
    expect(typeof d.seed).toBe("number");
    expect(d.seed as number).toBeLessThanOrEqual(SEED_MAX);
  });

  it("declares algorithm as the variants field, in increasing difficulty", () => {
    expect(rateLimitingModule.variants).toEqual({ key: "algorithm" });
    const field = allFields(RATE_LIMITING_SECTIONS).find((f) => f.key === "algorithm");
    expect(field?.kind === "chips" && field.options.map((o) => o.value)).toEqual([...ALGORITHM_IDS]);
    expect(field?.kind === "chips" && field.options.map((o) => o.label)).toEqual([
      "Fixed window",
      "Sliding log",
      "Sliding counter",
      "Token bucket",
      "Leaky bucket",
    ]);
  });

  it("has exactly the fields the spec lists", () => {
    expect(allFields(RATE_LIMITING_SECTIONS).map((f) => f.key).sort()).toEqual([
      "algorithm",
      "limit",
      "pace",
      "seed",
      "sequence",
      "workload",
    ]);
    const pace = allFields(RATE_LIMITING_SECTIONS).find((f) => f.key === "pace");
    expect(pace?.kind === "chips" && pace.options).toEqual([
      { value: "1", label: "1 per tick" },
      { value: "2", label: "1 per 2 ticks" },
    ]);
    const workload = allFields(RATE_LIMITING_SECTIONS).find((f) => f.key === "workload");
    expect(workload?.kind === "chips" && workload.options.map((o) => o.value)).toEqual([...WORKLOADS]);
  });

  it("has no Requests slider", () => {
    expect(allFields(RATE_LIMITING_SECTIONS).some((f) => f.key === "length")).toBe(false);
  });

  it("runs the default stream and labels the metric with the derived window", () => {
    const r = rateLimitingModule.run(defaults());
    expect(r.frames).toHaveLength(8);
    expect(r.sequence).toEqual(["4", "5", "5", "6", "6", "7", "7", "11"]);
    expect(r.metricLabel).toBe("Peak in any 6 ticks");
    expect(r.frames.at(-1)?.metric).toBe("6");
    expect(r.info).toMatchObject({ heading: "Algorithm", name: "Fixed window", chip: "Timeline" });
    expect(r.info.articleHref).toBe(`${RATE_LIMITING_ARTICLE}#fixed-window-counter`);
  });

  it("each algorithm links to its own heading and the leaky bucket labels its metric as output", () => {
    for (const id of ALGORITHM_IDS) {
      const r = rateLimitingModule.run({ ...defaults(), algorithm: id });
      expect(r.info.articleHref, id).toBe(`${RATE_LIMITING_ARTICLE}#${ALGORITHM_META[id].anchor}`);
      expect(r.metricLabel, id).toBe(id === "leaky-bucket" ? "Peak out in any 6 ticks" : "Peak in any 6 ticks");
    }
  });

  it("the window follows Limit and Pace", () => {
    const r = rateLimitingModule.run({ ...defaults(), limit: 4, pace: "1" });
    expect(r.metricLabel).toBe("Peak in any 4 ticks");
  });

  it("one sequence runs through every algorithm with the same frame count", () => {
    const sequence = ["0", "3", "3", "9", "12"];
    for (const algorithm of ALGORITHM_IDS) {
      const r = rateLimitingModule.run({ ...defaults(), algorithm, sequence });
      expect(r.frames, algorithm).toHaveLength(5);
      expect(r.sequence).toEqual(sequence);
    }
  });

  it("generates a stream from the workload and seed when none is set", () => {
    const v = { ...defaults(), sequence: null, workload: "burst", seed: 0x7f3a };
    expect(rateLimitingModule.run(v).sequence).toEqual(rateLimitingModule.run(v).sequence);
    expect(rateLimitingModule.run(v).frames).toHaveLength(6);
  });

  it("falls back to a generated stream when the given one is invalid", () => {
    const r = rateLimitingModule.run({ ...defaults(), sequence: ["x"], workload: "steady", seed: 1 });
    expect(r.frames).toHaveLength(6);
  });

  it("toRateInput falls back on bad values", () => {
    expect(
      toRateInput({ algorithm: "nope", limit: 99, pace: "9", workload: "x", seed: -4, sequence: ["20"] }),
    ).toEqual({
      algorithm: "fixed-window",
      limit: 5,
      pace: 2,
      workload: "straddle",
      seed: 0,
      ticks: null,
    });
  });

  it("changing Limit, Pace, workload or seed regenerates the stream; changing the algorithm keeps it", () => {
    const v = defaults();
    for (const [key, value] of [["limit", 4], ["pace", "1"], ["workload", "steady"], ["seed", 5]] as const) {
      expect(applyChange(RATE_LIMITING_SECTIONS, v, key, value).sequence, key).toBeNull();
    }
    expect(applyChange(RATE_LIMITING_SECTIONS, v, "algorithm", "token-bucket").sequence).toEqual(v.sequence);
  });

  it("a regenerated stream is valid for the new Limit and Pace", () => {
    for (const [limit, pace] of [[5, "2"], [2, "1"], [4, "2"]] as const) {
      const v = applyChange(RATE_LIMITING_SECTIONS, applyChange(RATE_LIMITING_SECTIONS, defaults(), "limit", limit), "pace", pace);
      const r = rateLimitingModule.run({ ...v, workload: "straddle" });
      expect(r.frames.length).toBeGreaterThan(0);
    }
  });
});

describe("availability", () => {
  const hints = (v: Record<string, unknown>) => rateLimitingModule.availability?.({ ...defaults(), ...v }) ?? {};

  it("says what Limit means", () => {
    expect(hints({}).limit?.hint).toBe("Max per window · bucket size for the buckets");
  });

  it("states the shared rate and window for the current Limit and Pace", () => {
    expect(hints({}).pace?.hint).toBe(
      "1 request per 2 ticks = 3 per 6 ticks, the same average rate for every algorithm",
    );
    expect(hints({ limit: 4, pace: "1" }).pace?.hint).toBe(
      "1 request per tick = 4 per 4 ticks, the same average rate for every algorithm",
    );
  });

  it("never dims a field: every input applies to every algorithm", () => {
    for (const f of Object.values(hints({}))) expect(f.disabled).toBeFalsy();
  });
});

describe("url state", () => {
  it("round-trips a multi-digit tick sequence with an underscore separator", () => {
    const values = { ...defaults(), seed: 0x1234, sequence: ["4", "5", "11", "19"] };
    const search = encodeState(RATE_LIMITING_SECTIONS, values, { frame: 2, rotated: false });
    expect(search).toContain("q=4_5_11_19");
    const back = parseState(search, RATE_LIMITING_SECTIONS, defaults());
    expect(back.values.sequence).toEqual(["4", "5", "11", "19"]);
    expect(back.values.seed).toBe(0x1234);
    expect(back.view.frame).toBe(2);
  });

  it("a junk sequence in the URL falls back to a generated one instead of throwing", () => {
    expect(parseState("?q=abc", RATE_LIMITING_SECTIONS, defaults()).values.sequence).toBeNull();
    expect(parseState("?q=2.5", RATE_LIMITING_SECTIONS, defaults()).values.sequence).toBeNull();
  });
});
```

- [ ] **Step 4: Write `module.ts`**

```ts
import {
  clampInt,
  type FieldAvailability,
  type FieldSection,
  type InputValues,
  SEED_MAX,
} from "../core/fields";
import { randomSeed } from "../core/rng";
import type { InfoContent, RunResult, VisualizerModule } from "../core/types";
import { ALGORITHM_META, RATE_LIMITING_ARTICLE } from "./copy";
import { buildFrames } from "./frames";
import { rateLimitingRevision } from "./revision";
import { parseTicks } from "./ticks";
import { generateTicks } from "./trace";
import {
  ALGORITHM_IDS,
  type AlgorithmId,
  MAX_LIMIT,
  MAX_REQUESTS,
  MIN_LIMIT,
  type Pace,
  paramsOf,
  type RateInput,
  WORKLOADS,
  type Workload,
} from "./types";

const WORKLOAD_LABELS: Record<Workload, string> = {
  steady: "Steady",
  burst: "Burst",
  straddle: "Boundary straddle",
  "idle-burst": "Idle then burst",
};

export const RATE_LIMITING_SECTIONS: FieldSection[] = [
  {
    title: "Algorithm",
    fields: [
      {
        kind: "chips",
        key: "algorithm",
        label: "Algorithm",
        param: "a",
        hideLabel: true,
        options: ALGORITHM_IDS.map((id) => ({ value: id, label: ALGORITHM_META[id].name })),
      },
    ],
  },
  {
    title: "Input",
    fields: [
      { kind: "slider", key: "limit", label: "Limit", param: "l", min: MIN_LIMIT, max: MAX_LIMIT },
      {
        kind: "chips",
        key: "pace",
        label: "Pace",
        param: "pc",
        options: [
          { value: "1", label: "1 per tick" },
          { value: "2", label: "1 per 2 ticks" },
        ],
      },
      {
        kind: "chips",
        key: "workload",
        label: "Workload",
        param: "w",
        options: WORKLOADS.map((w) => ({ value: w, label: WORKLOAD_LABELS[w] })),
      },
      {
        kind: "sequence",
        key: "sequence",
        label: "Sequence",
        param: "q",
        maxLen: MAX_REQUESTS,
        hint: "Arrival ticks, e.g. 4 5 5 6 · Enter to apply",
        resetBy: ["limit", "pace", "workload", "seed"],
        parse: parseTicks,
        join: "_",
      },
    ],
  },
  { title: "", fields: [{ kind: "seed", key: "seed", label: "Seed", param: "s" }] },
];

// Chosen for learning: a burst that straddles the first window boundary plus one late request, so every algorithm shows its defining behaviour in eight requests.
const DEFAULTS = {
  algorithm: "fixed-window",
  limit: 3,
  pace: "2",
  workload: "straddle",
  sequence: ["4", "5", "5", "6", "6", "7", "7", "11"],
} as const;

const num = (x: unknown, fallback: number): number =>
  typeof x === "number" && Number.isFinite(x) ? x : fallback;

export function toRateInput(v: InputValues): RateInput {
  const parsed = Array.isArray(v.sequence) ? parseTicks(v.sequence.join(" ")) : null;
  return {
    algorithm: ALGORITHM_IDS.find((a) => a === v.algorithm) ?? DEFAULTS.algorithm,
    limit: clampInt(num(v.limit, DEFAULTS.limit), MIN_LIMIT, MAX_LIMIT),
    pace: (String(v.pace) === "1" ? 1 : 2) as Pace,
    workload: WORKLOADS.find((w) => w === v.workload) ?? DEFAULTS.workload,
    seed: clampInt(num(v.seed, 0), 0, SEED_MAX),
    ticks: parsed?.ok ? parsed.tokens.map(Number) : null,
  };
}

function availability(values: InputValues): Record<string, FieldAvailability> {
  const input = toRateInput(values);
  const p = paramsOf(input.limit, input.pace);
  const rate = input.pace === 1 ? "1 request per tick" : "1 request per 2 ticks";
  return {
    limit: { hint: "Max per window · bucket size for the buckets" },
    pace: {
      hint: `${rate} = ${p.limit} per ${p.window} ticks, the same average rate for every algorithm`,
    },
  };
}

function infoOf(id: AlgorithmId): InfoContent {
  const m = ALGORITHM_META[id];
  return {
    heading: "Algorithm",
    name: m.name,
    chip: m.chip,
    rule: m.rule,
    about: m.about,
    tries: m.tries,
    articleHref: `${RATE_LIMITING_ARTICLE}#${m.anchor}`,
  };
}

export const rateLimitingModule: VisualizerModule = {
  slug: "rate-limiting",
  title: "Rate limiting",
  subtitle: "Five ways to say no to too many requests.",
  unit: "request",
  subject: "Limiter",
  variants: { key: "algorithm" },
  revision: rateLimitingRevision(),
  sections: RATE_LIMITING_SECTIONS,
  defaults: () => ({ ...DEFAULTS, sequence: [...DEFAULTS.sequence], seed: randomSeed() }),
  availability,
  run(values): RunResult {
    const input = toRateInput(values);
    const params = paramsOf(input.limit, input.pace);
    const ticks = input.ticks ?? generateTicks(input.workload, params, input.seed);
    const { frames } = buildFrames(input.algorithm, params, ticks);
    return {
      frames,
      info: infoOf(input.algorithm),
      metricLabel: `Peak ${input.algorithm === "leaky-bucket" ? "out " : ""}in any ${params.window} ticks`,
      sequence: ticks.map(String),
    };
  },
};
```

- [ ] **Step 5: Register the visualizer**

`lib/visualizer/registry.ts`: add a third entry to `VISUALIZERS` after caching strategies:

```ts
  {
    slug: "rate-limiting",
    title: "Rate limiting",
    description:
      "Fixed window, sliding log, sliding counter, token bucket and leaky bucket — one request stream, five ways to say no.",
    icon: "🚦",
  },
```

`lib/visualizer/modules.ts`:

```ts
import { cachingModule } from "./caching/module";
import type { VisualizerModule } from "./core/types";
import { evictionModule } from "./eviction/module";
import { rateLimitingModule } from "./rate-limiting/module";

export const MODULES: Record<string, VisualizerModule> = {
  [evictionModule.slug]: evictionModule,
  [cachingModule.slug]: cachingModule,
  [rateLimitingModule.slug]: rateLimitingModule,
};
```

- [ ] **Step 6: Update the route tests**

In `app/visualizer.test.tsx`:

1. Replace

```ts
    expect(generateStaticParams()).toEqual([
      { slug: "eviction-policies" },
      { slug: "caching-strategies" },
    ]);
```

with

```ts
    expect(generateStaticParams()).toEqual([
      { slug: "eviction-policies" },
      { slug: "caching-strategies" },
      { slug: "rate-limiting" },
    ]);
```

2. After `expect(html).toContain("Caching strategies");` (in the landing test) add:

```ts
    expect(html).toMatch(/href="\/visualizer\/rate-limiting\/?"/);
    expect(html).toContain("Rate limiting");
```

3. Replace

```ts
    expect(html).not.toContain("viz-lanes");
  });
});
```

with

```ts
    expect(html).not.toContain("viz-lanes");
  });

  it("the rate-limiting page ships the app shell without a baked-in run", async () => {
    const page = await VisualizerPage({ params: Promise.resolve({ slug: "rate-limiting" }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("viz-app--loading");
    expect(html).not.toContain("viz-tl");
  });
});
```

---

### Task 10: Article-anchor content test and the e2e check

**Files:**
- Modify: `tests/content/artifacts.test.ts`, `tests/e2e/test_visualizer.py`

- [ ] **Step 1: Assert every deep link resolves to a real heading**

In `tests/content/artifacts.test.ts`:

1. After the line `import { CACHING_ARTICLE, POLICIES } from "../../lib/visualizer/eviction/module";` add:

```ts
import { ALGORITHM_META, RATE_LIMITING_ARTICLE } from "../../lib/visualizer/rate-limiting/copy";
```

2. Replace the line

```ts
    for (const def of Object.values(STRATEGIES)) expect(ids.has(def.anchor), def.anchor).toBe(true);
```

(the last line of the caching test's body) with the same line followed by the end of that test and the whole new test, leaving the file's original closing `  });` to close the new test:

```ts
    for (const def of Object.values(STRATEGIES)) expect(ids.has(def.anchor), def.anchor).toBe(true);
  });

  it("rate-limiting visualizer deep links resolve to the rate-limiting article headings", () => {
    const manifest = manifestSchema.parse(readJson("manifest.json"));
    const article = manifest.articles.find(
      (a) => `/${a.verticalId}/${a.slug.join("/")}/` === RATE_LIMITING_ARTICLE,
    );
    expect(article, RATE_LIMITING_ARTICLE).toBeDefined();
    const ids = new Set(article?.headings.map((h) => h.id));
    for (const meta of Object.values(ALGORITHM_META)) {
      expect(ids.has(meta.anchor), meta.anchor).toBe(true);
    }
```

- [ ] **Step 2: Append the browser check**

Append to `tests/e2e/test_visualizer.py`:

```python


RATE = "/visualizer/rate-limiting/"


def test_rate_limiting_switches_algorithm_and_keeps_the_step(page, base_url):
    """fixed window peaks at 6 on the default stream; switching to the sliding log keeps the step and drops the peak to 3; the leaky bucket shows its queue and output metric."""
    page.goto(f"{base_url}{RATE}?a=fixed-window&l=3&pc=2&q=4_5_5_6_6_7_7_11&i=8")
    expect(page.get_by_role("heading", level=1, name="Rate limiting")).to_be_visible()
    expect(page.locator(".viz-tl")).to_be_visible()
    expect(page.locator(".viz-stage__metric-label")).to_have_text("Peak in any 6 ticks")
    expect(page.locator(".viz-stage__metric-value")).to_have_text("6")
    page.get_by_role("button", name="Sliding log").click()
    expect(page.locator(".viz-stage__metric-value")).to_have_text("3")
    expect(page.locator(".viz-linear")).to_be_visible()
    page.get_by_role("button", name="Leaky bucket").click()
    expect(page.locator(".viz-stage__metric-label")).to_have_text("Peak out in any 6 ticks")
    expect(page.locator(".viz-composite")).to_be_visible()
    expect(page.get_by_label("Pace")).to_be_visible()
```

(`get_by_label("Pace")` resolves the chip group's accessible name; if the locator is ambiguous when the test is first run, replace its last line with `expect(page.get_by_text("the same average rate for every algorithm")).to_be_visible()`, which asserts the visible Pace hint instead.)

---

### Task 11: Docs — spec deltas, README, backlog, CLAUDE.md

**Files:**
- Modify: `docs/superpowers/specs/2026-10-09-rate-limiting-visualizer-design.md`, `docs/_meta/visualizer/README.md`, `docs/_meta/visualizer/backlog.md`, `CLAUDE.md`

- [ ] **Step 1: Write the deltas back into the spec**

In `docs/superpowers/specs/2026-10-09-rate-limiting-visualizer-design.md`, apply these edits (Read the file first; each is a small replacement):

1. **Axis rule.** In "Parameters", replace the bullet beginning `**Axis length** is` with: `- **Axis length** is `max(12, 2 × Window, last tick + 1)` ticks, at most 20, so there is always room for a window boundary and a gap, and a longer stream stretches the axis instead of clipping marks.`
2. **Tick grammar.** In "Left pane", replace the paragraph beginning `Tick grammar:` with: `Tick grammar: whole numbers 0–19 separated by spaces, commas or underscores, non-decreasing, 1–14 of them. Dots and minus signs are not separators, so `2.5` and `-3` are errors, not reinterpreted ticks. Errors are one-liners: "Ticks must be whole numbers from 0 to 19", "Ticks must not go backwards", "Use 1 to 14 requests". Parsing uses the module-owned `parse` hook on the sequence field, which receives only the text, so the 0–19 bound is the widest possible axis. In the URL the ticks are joined with `_` (`q=4_5_5_6_6_7_7_11`) through a new optional `join` on the sequence field.`
3. **Narrow stages.** Replace the "Narrow stages" paragraph's ladder with: `full tick labels and band headers at 36px per tick or more; thinned tick labels, short band and span labels and smaller marks at 14px or more; below that the Timeline scrolls horizontally and keeps `now` in view (`useFollowScroll`). At 320px and in a 250px Revision card the default 12-tick axis uses the middle rung; only a 20-tick axis in a 250px card scrolls.`
4. **Timeline model.** In the `TimelineModel` code block, add `stack: number; lanes: number;` after `now`, add `title?: string` to `TimelineMark`, and add `short?: string` to `TimelineBand` and `TimelineSpan`; add a sentence under the block: `stack and lanes are run-wide maxima (the tallest pile of simultaneous marks, capped at 4 with the rest shown as a "+n" chip, and the most labelled spans) so the stage keeps one height.`
5. **Frame changes.** Replace item 1 with: `1. **Availability hints render whenever present, and on chips; sequence fields may declare a URL separator.** Today the slider shows `availability.hint` only when disabled and chips take no availability; the sequence URL codec joins tokens with no separator, which cannot round-trip multi-digit ticks. After the change both hints show, and `SequenceField.join` supplies the separator (`"_"` here). Existing modules are unaffected.`
6. **Revision.** In "Revision", after the first sentence add: `The leaky bucket card shows the two-row timeline only, because a Revision card stage is 200px tall.`
7. **Generic layer.** After the Linear bullet add: `- **Linear's horizontal layout** gets a small height guard so its labels stay inside a short Composite part; taller stages are unchanged.`

- [ ] **Step 2: Update the README shape table**

Read `docs/_meta/visualizer/README.md`. In the "Shape library" table:

- Replace the row beginning `| **Composite** (planned) |` with these two rows (keep the table's existing column order: Shape, Looks like, Used for, Reuse candidates):

```markdown
| **Timeline** | tick axis with request marks in one or more rows, shaded window bands, boundaries, a bracket or labelled spans, a cursor at now; narrow stages thin the labels, then scroll | rate limiting (fixed window, sliding counter, the sliding log and the buckets' request strips) | TCP congestion windows, retry backoff, TTL expiry |
| **Composite** | several shapes stacked in one stage, each at its natural or remaining height | rate limiting (log + list, token pile, leaky queue + rows) | ARC, LSM tree, multi-level caches |
```

- In the Linear row's "Used for" cell, append `, token pile, request queue, timestamp log`.

- [ ] **Step 3: Remove the shipped topic from the backlog**

In `docs/_meta/visualizer/backlog.md`, delete the table row that begins `| Rate Limiting |`.

- [ ] **Step 4: Update CLAUDE.md's file map**

Read `CLAUDE.md`. In the `visualizer/shapes/` row of the Components table, add `TimelineShape` and `CompositeShape` to the list of shapes. In the Lib table, directly after the `visualizer/caching/` row, add:

```markdown
| `visualizer/rate-limiting/` | Rate-limiting module: `algorithms/*` (one limiter per algorithm), `engine` (steps, peak), `view` (state → Timeline / Linear / Composite models), `frames`, `trace`, `ticks`, `copy`, `revision` |
```

---

### Task 12: Verify once, then hand back

This is the only task that runs commands that execute tests, typecheck or lint. Run them in this order; fix every failure at its cause (do not dismiss any as unrelated) and rerun only what is needed.

**Files:** none new.

- [ ] **Step 1: Format the touched code**

```bash
pnpm exec biome format --write lib/visualizer components/visualizer css/view-visualizer app/visualizer.test.tsx tests/content/artifacts.test.ts
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors. If a file elsewhere switches exhaustively on `ShapeModel["kind"]`, add the two new kinds there (the compiler lists every site).

- [ ] **Step 3: Lint**

```bash
pnpm lint
```

Expected: no errors. Remove any unused import or export it reports.

- [ ] **Step 4: Run the unit, pipeline and content suites**

```bash
pnpm test:all
```

Expected: all pass, including the hand-checked algorithm fixtures, the Steady property test, the preset outcomes, the glossary-term check, the anchor check against the built manifest, and the shape component tests.

- [ ] **Step 5: Run only the new browser test**

```bash
pnpm build:e2e && PYTHONUNBUFFERED=1 PLAYWRIGHT_BROWSERS_PATH=$HOME/Library/Caches/ms-playwright .venv/bin/python3 -m pytest tests/e2e/test_visualizer.py -k rate_limiting -q --timeout=60 -o timeout_method=signal
```

Expected: 1 passed. Do not run the rest of the e2e suite.

- [ ] **Step 6: Hand back**

Tell the user what was built and the results of steps 2–5 verbatim (including any failure and how it was fixed). Do not stage, commit or push anything; the user owns version control.

---

## Self-review (done)

**Spec coverage.** Purpose and success criteria — Tasks 6–8 (waits, shared rate via Steady property + hints); Scope: route/registry — Task 9; five algorithms in variant order — Tasks 6, 9; Single + Revision — Tasks 8–9; Timeline and Composite — Tasks 3–4; neutral renames — Task 1; frame change (hints, plus the `join` found in planning) — Task 2; Step model, Parameters, Left pane, hints — Task 9 module; Algorithms table and the leaky wait formula — Task 6; State and metrics (peak, leave-tick metric, Step vars) — Tasks 6, 8; Views table — Task 7; narrow-stage ladder — Tasks 3–4; Generic layer incl. Linear height guard — Task 3; Frame changes (variants, revision, `availability(values)`) — Task 9 module; Revision cards with glossary terms — Task 9; Workload motifs — Task 5; Module content (Step lines, About, Try with pinned patches of sequence + Limit + Pace) — Task 8 `copy.ts` + `copy.test.ts` (the preset test runs the pinned outcomes from non-default slider positions by construction, because every patch sets all three); article links + anchor test — Tasks 8, 10; Files — File Structure; Testing list — every item has a task; docs (README, backlog, CLAUDE.md, spec deltas) — Task 11. The spec's "Try tab tests first move the sliders away from the defaults" is covered at the module level by `copy.test.ts` computing every preset from its own patched Limit and Pace; the module test `changing Limit… regenerates` covers slider changes.

**Placeholder scan.** No "TBD" or "similar to Task N"; every code step shows the code.

**Type consistency.** `Limiter` (`begin`, `request`, `snapshot`) is used identically by all five factories and by `engine.ts`; `Snapshot` kinds `fixed | log | counter | token | leaky` match every `snapOf(..., kind)` call and `varsOf` branch; `ViewContext` fields match `makeContext`; `TimelineModel` (`stack`, `lanes`, `rows`, `bands`, `spans`, `boundaries`) matches the shape component, `timelineLayout`'s `TimelineSizing` (`ticks`, `rows`, `stack`, `lanes`, `labeled`) and `compositeHeights`; `LeafModel`/`CompositeModel` are used the same way in `Shape.tsx`, `CompositeShape.tsx` and `view.ts`; the Pace value is the string `"1" | "2"` in field values, patches and URLs and the number `1 | 2` everywhere after `toRateInput`.
