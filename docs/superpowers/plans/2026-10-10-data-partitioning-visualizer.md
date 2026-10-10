# Data Partitioning Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `/visualizer/data-partitioning/` page: seven partitioning schemes (Mod-N, Range, Directory, Ring, Virtual nodes, Bounded-load, Rendezvous) placing one key set on nodes, with Add/Remove node events and a re-check phase per event, a Single view per scheme and seven Revision cards, built from three new generic shapes (Bins, Scale, Table) plus Ranking and Composite.

**Architecture:** A `VisualizerModule` under `lib/visualizer/data-partitioning/` resolves the inputs, runs a per-scheme `Scheme` (init, place, add, remove, order) through an engine that emits one step per key placement, per event and per key re-check, and turns each step into a `VizFrame` whose `model` comes from an adapter (`view.ts`) that builds vocabulary-neutral Bins / Scale / Table / Ranking / Composite models. The frame gains a `neutral` outcome, an `action` field kind (buttons that rewrite inputs and name the step to play from), sequence parsers that see the other inputs, per-field resolved sequences, disabled chips, a Ranking suffix and a side-by-side Composite.

**Tech Stack:** Next.js App Router (static export), React, TypeScript (strict, `noUncheckedIndexedAccess`), Vitest + Testing Library, Biome + ESLint, pytest + Playwright for the one e2e check.

**Spec:** `docs/superpowers/specs/2026-10-10-data-partitioning-visualizer-design.md`. Read it first. "Spec deltas" below lists where planning against the code changed a detail; Task 10 writes them back into the spec.

## Global Constraints

- Never run `git add`, `git commit` or `git push`; the user owns version control. This plan has no git steps.
- Write tests alongside the code: fixture-first against hand-checked expectations for everything in `lib/visualizer/**`, and a component test for every new component. Do **not** run any test, typecheck or lint command until Task 11; Task 11 is the single verification run, then one e2e test for the new page only.
- Every fixture value below was checked by hand against the spec's rules (and cross-checked by an independent reference simulation written while planning). If a value looks wrong while implementing, re-derive it by hand from the spec's rules before touching the code or the test; never copy a value from the implementation's output.
- Comments are one line, sparse, and say why, never what. No ticket IDs (`WIKI-xxx`, `DSA-xxx`, `SD-xxx`) anywhere in code, CSS or tests. No `console.*`.
- Generic code (`components/visualizer/**`, `lib/visualizer/core/**`) uses structural vocabulary only (bin, item, segment, anchor, point, walk, row, limit, meter, mark, new, removed, changed, heavy). Words like key, node, shard, hash, partition, scheme, ring appear only under `lib/visualizer/data-partitioning/`.
- Colours only through `--viz-*` aliases in `css/tokens.css`; CSS classes are `viz-*`; breakpoints only in `css/responsive.css`; nothing may break at 320px.
- Every new on-screen element has an enter animation using `--viz-move`, and every animation and transition is off under `prefers-reduced-motion`.
- React keys are stable and unique (bins by id, items by id, rows by first cell, Revision lines by index).
- Frames are pure and deterministic: the same inputs and seed always give the same frames; `run` has no side effects.
- Hash `h(k) = (37k + 11) mod 100`; keys 0–99, 1–12 of them, at most one hot (`*`, weight 5); nodes A–J, 1–6 alive, at most 4 events; the virtual-node table is the spec's table verbatim.
- Glossary keys are lowercase and singular.
- Markdown prose: one line per paragraph or list item, no hard wrapping outside code fences and tables.
- No new runtime dependencies. Use `.venv/bin/python3`, never bare `python3`.
- Do not start or stop daemons. A dev server is usually already on `http://localhost:3000` (base path `/wiki-fe/`).

## Review Focus

The spec implies these inputs but no ordinary task test would exercise them. Each has a test in the task that owns the code.

1. Typing events that remove a node already gone (`-B -B`), push the count outside 1–6 (`+` at 6 nodes), or use a bad token (`x`, `+B`) must show the matching one-line error in the Events field, and a junk `e=` in the URL must fall back to no events instead of throwing. (Task 4 keys test, Task 8 module test.)
2. All 12 keys landing on one node (Sequential on Range, or 12 typed keys in one range) must keep every chip inside the stage at 320×380 and inside a 250×200 Revision card; the Range composite's bins part is exempt from the 180px flex cap. (Task 2 geometry test, Task 3 Bins test.)
3. Removing down to one node and adding again must never reuse a letter, Mod-N at N = 1 must put every key on the one node, and a ring with one position must own the whole circle. (Task 4 hash test, Task 5 engine test.)
4. Seeking to any step of any scheme, including the step right after an event where the previous step has no bin for the new node, and switching scheme mid re-check, must build a model without throwing. (Task 6 view sweep test.)
5. Pressing Add node must keep the generated keys, move the slider, extend Events and jump playback to the new event step; dragging the slider afterwards must clear the events to an empty list that survives a URL round trip. (Task 1 fields test, Task 8 module and app tests.)

## Spec deltas found while planning

Task 10 applies these to the spec.

- The Mod-N heading id is `the-problem---why-modulo-hashing-breaks` (three hyphens: the build slugs " - " that way); the spec's two-hyphen anchor would not resolve.
- Keys reset on `workload` and `seed`, as in the other visualizers (a new seed means new generated keys).
- Extra generic changes the code needs: `SequenceField.parse` receives the current values (Events validates against the slider), `SequenceField.resetEmpty` (dragging the slider clears Events to `[]`, which round-trips through the URL, instead of `null`, which would fall back to the default), `RunResult.sequences` (each sequence field shows its own resolved tokens; the panel fed one run-sequence to every field), chips honour `availability.disabled`, and `RankingModel.suffix` (scores are not "96×").
- Composite `side` uses the stage aspect: side by side when `width ≥ 1.1 × height`, otherwise stacked; bins parts are exempt from the 180px flex cap so twelve chips fit a stacked 320px stage.
- The ring-based schemes get a fourth Step line for the event step, and Bounded-load's "keep walking" line lights only when a full node was skipped.
- Ring anchors are labelled with the node letter only; the virtual-node name and position (`B·3 at 62`) appear in the variables, the caption and the screen-reader text, because 48 labels do not fit a ring.
- The moved chip's flight is a CSS transition of the same element's position (it keeps its React key across frames); the trail draws in the same `--viz-move` time and its arrowhead appears when the trail completes.
- Title is "Data partitioning" (sentence case, like the other visualizers).
- New aliases in `tokens.css`: `--viz-slot-alt`, `--viz-ink`, `--viz-ink-strong`, `--viz-ink-muted`.

---

## File Structure

**Create**

- `lib/visualizer/data-partitioning/types.ts` — ids, constants, `KeyItem`, `NodeEvent`, `Settings`, `Range`, `World`, `Lookup`, `Scheme`, `PartitionInput`.
- `lib/visualizer/data-partitioning/hash.ts` — `hashKey`, `nodeNumber`, `VNODE_TABLE`, `ringPoints`, `clockwiseIndex`, `ringShares`, `rendezvousScore`, `capOf`.
- `lib/visualizer/data-partitioning/keys.ts` — keys and events grammar, `replay`, `aliveAfter`, error strings.
- `lib/visualizer/data-partitioning/trace.ts` — `generateKeys`, `pickRemoval`.
- `lib/visualizer/data-partitioning/schemes/{membership,mod-n,range,directory,ring,bounded-load,rendezvous,index}.ts`.
- `lib/visualizer/data-partitioning/engine.ts` — `runSteps`, `stepOfEvent`.
- `lib/visualizer/data-partitioning/view.ts` — `makeContext`, `viewOf`, `positionsOf`.
- `lib/visualizer/data-partitioning/copy.ts` — `SCHEME_META`, article constants.
- `lib/visualizer/data-partitioning/frames.ts` — `buildFrames`, `explainLookup`.
- `lib/visualizer/data-partitioning/revision.ts` — `partitionRevision`.
- `lib/visualizer/data-partitioning/module.ts` — sections, defaults, `resolve`, actions, availability, `partitionModule`.
- `lib/visualizer/data-partitioning/test-helpers.ts`.
- `components/visualizer/shapes/{BinsShape,ScaleShape,TableShape}.tsx`.
- `css/view-visualizer/bins.css`, `css/view-visualizer/scale.css`.
- Tests next to each of the above, plus `lib/visualizer/core/partition-shapes.test.ts`, `components/visualizer/frame/action-field.test.tsx`.

**Modify**

- `lib/visualizer/core/{types,fields,url-state,shapes,geometry}.ts`.
- `components/visualizer/frame/{ConfigFields,ConfigPanel,VisualizerApp}.tsx`, `components/visualizer/ui/ChoiceGroup.tsx`, `components/visualizer/shapes/{Shape,CompositeShape,RankingShape}.tsx`.
- `css/tokens.css`, `css/wiki.css`, `css/view-visualizer/{playback,ui,panels,timeline}.css`.
- `data/glossary.json`, `lib/visualizer/registry.ts`, `lib/visualizer/modules.ts`, `app/visualizer.test.tsx`, `tests/content/artifacts.test.ts`, `tests/e2e/test_visualizer.py`, `components/visualizer/frame/VisualizerApp.test.tsx`, `components/visualizer/shapes/CompositeShape.test.tsx`.
- Docs: the spec, `docs/_meta/visualizer/README.md`, `docs/_meta/visualizer/backlog.md`, `CLAUDE.md`.

---

### Task 1: Frame — neutral outcome, action fields, value-aware sequence parsing, per-field sequences, disabled chips, Ranking suffix

**Files:**
- Modify: `lib/visualizer/core/types.ts`, `lib/visualizer/core/fields.ts`, `lib/visualizer/core/url-state.ts`, `lib/visualizer/core/shapes.ts` (Ranking suffix only), `components/visualizer/frame/ConfigFields.tsx`, `components/visualizer/frame/ConfigPanel.tsx`, `components/visualizer/frame/VisualizerApp.tsx`, `components/visualizer/ui/ChoiceGroup.tsx`, `components/visualizer/shapes/RankingShape.tsx`, `css/view-visualizer/playback.css`, `css/view-visualizer/ui.css`, `css/view-visualizer/panels.css`
- Test: `lib/visualizer/core/fields.test.ts`, `lib/visualizer/core/url-state.test.ts`, `components/visualizer/frame/action-field.test.tsx`, `components/visualizer/shapes/shapes.test.tsx`

**Interfaces:**
- Produces: `Outcome = "good" | "bad" | "neutral"`; `RunResult.sequences?: Record<string, string[]>`; `ActionField { kind: "action"; key; label; apply(values): ActionResult }`; `ActionResult { values: InputValues; step?: number }`; `SequenceField.parse?: (raw: string, values: InputValues) => SequenceParse`; `SequenceField.resetEmpty?: boolean`; `parseSequenceField(field, raw, values = {})`; `RankingModel.suffix?: string`; `ConfigField` props `values`, `onAction`; `ConfigPanel` props `sequences`, `onAction`; `ChoiceGroup` prop `disabled`.

- [ ] **Step 1: Core types.** In `lib/visualizer/core/types.ts` change `Outcome` and add `sequences` to `RunResult`:

```ts
export type Outcome = "good" | "bad" | "neutral";
```

```ts
export interface RunResult {
  frames: VizFrame[];
  info: InfoContent;
  metricLabel: string;
  sequence: string[];
  // Resolved tokens per sequence field when a module has more than one; falls back to sequence.
  sequences?: Record<string, string[]>;
}
```

- [ ] **Step 2: Fields.** In `lib/visualizer/core/fields.ts` replace `SequenceField`, add the action field, widen the union, and update `applyChange` and `parseSequenceField`:

```ts
export interface SequenceField extends FieldBase {
  kind: "sequence";
  maxLen: number;
  hint: string;
  resetBy: string[];
  // A module with its own grammar supplies this; it sees the other inputs for rules that span fields.
  parse?: (raw: string, values: InputValues) => SequenceParse;
  // Separator between tokens in the URL; tokens that can run together (numbers) need one.
  join?: string;
  // Clears to an empty list instead of null (regenerate) when a resetBy field changes.
  resetEmpty?: boolean;
}
export interface SeedField extends FieldBase {
  kind: "seed";
}
export interface ActionResult {
  values: InputValues;
  step?: number;
}
// A button: it rewrites the inputs itself and may name the step to play from; it has no URL param.
export interface ActionField {
  kind: "action";
  key: string;
  label: string;
  apply: (values: InputValues) => ActionResult;
}
export type FieldSpec = ChipsField | SliderField | SequenceField | SeedField | ActionField;
```

```ts
export function applyChange(
  sections: FieldSection[],
  values: InputValues,
  key: string,
  value: FieldValue,
): InputValues {
  const next: InputValues = { ...values, [key]: value };
  for (const f of allFields(sections)) {
    if (f.kind === "sequence" && f.resetBy.includes(key)) next[f.key] = f.resetEmpty ? [] : null;
  }
  return next;
}
```

```ts
export function parseSequenceField(
  field: SequenceField,
  raw: string,
  values: InputValues = {},
): SequenceParse {
  if (field.parse) return field.parse(raw, values);
  const keys = parseSequence(raw, field.maxLen);
  return keys ? { ok: true, tokens: keys } : { ok: false, error: "Use letters A–Z" };
}
```

Then run `grep -rn "\.param\b" lib components app --include=*.ts --include=*.tsx` and make every place that reads `param` from a `FieldSpec` skip or narrow out `kind === "action"` (only `url-state.ts` is expected; fix any other hit the same way).

- [ ] **Step 3: URL state.** In `lib/visualizer/core/url-state.ts`, `encodeState` loop starts with `if (f.kind === "action") continue;`. In `parseState` the loop also starts with `if (f.kind === "action") continue;`, and the sequence branch becomes:

```ts
    } else {
      const parsed = parseSequenceField(f, raw, values);
      values[f.key] = parsed.ok ? parsed.tokens : null;
    }
```

An empty array already encodes as `param=` (via `joinSequence`) and parses back through the field's parser; no other change.

- [ ] **Step 4: Ranking suffix.** In `lib/visualizer/core/shapes.ts` add to `RankingModel`:

```ts
  // Printed after each count; defaults to "×" (times seen).
  suffix?: string;
```

In `components/visualizer/shapes/RankingShape.tsx` replace `<span className="viz-rank__count">{r.count}×</span>` with:

```tsx
            <span className="viz-rank__count">
              {r.count}
              {model.suffix ?? "×"}
            </span>
```

- [ ] **Step 5: ChoiceGroup disabled.** In `components/visualizer/ui/ChoiceGroup.tsx` add `disabled?: boolean` to the props, destructure it, and give each button `disabled={disabled}`.

- [ ] **Step 6: ConfigFields.** In `components/visualizer/frame/ConfigFields.tsx`:

Import `ActionField` and `InputValues` alongside the other field types.

`ChipsInput` honours `availability.disabled`:

```tsx
  const disabled = availability?.disabled === true;
  return (
    <div className={`viz-field${disabled ? " is-disabled" : ""}`}>
      {!field.hideLabel && <div className="viz-field__label">{field.label}</div>}
      <div className="viz-field__chips-row">
        <ChoiceGroup
          label={field.label}
          options={field.options}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          disabled={disabled}
        />
```

(the rest of `ChipsInput` is unchanged).

`SequenceInput` takes `values: InputValues` and parses with it: change its props to `FieldProps<SequenceField> & { sequence: string[]; values: InputValues }` and the Enter handler to `const parsed = parseSequenceField(field, draft, values);`.

Add the action input:

```tsx
function ActionInput({
  field,
  onAction,
  availability,
}: {
  field: ActionField;
  onAction: () => void;
  availability?: FieldAvailability;
}) {
  const disabled = availability?.disabled === true;
  return (
    <div className={`viz-field viz-field--action${disabled ? " is-disabled" : ""}`}>
      <button type="button" className="viz-btn" disabled={disabled} onClick={onAction}>
        {field.label}
      </button>
      {availability?.hint && <p className="viz-field__hint">{availability.hint}</p>}
    </div>
  );
}
```

`ConfigFieldProps` gains `values?: InputValues` (optional, so existing callers and tests keep compiling) and `onAction?: (field: ActionField) => void`; `ConfigField` destructures them with `values = {}`, passes `values={values}` to `SequenceInput`, and adds:

```tsx
    case "action":
      return (
        <ActionInput
          field={field}
          onAction={() => onAction?.(field)}
          availability={availability}
        />
      );
```

- [ ] **Step 7: ConfigPanel.** In `components/visualizer/frame/ConfigPanel.tsx` add props `sequences?: Record<string, string[]>` and `onAction?: (field: ActionField) => void` (import `ActionField`), and pass to each `ConfigField`:

```tsx
              values={values}
              sequence={sequences?.[f.key] ?? sequence}
              onAction={onAction}
```

Also change the field's React key to `key={f.key}` (already) and keep `onChange={(v) => onChange(f.key, v)}`.

- [ ] **Step 8: VisualizerApp.** In `components/visualizer/frame/VisualizerApp.tsx` import `ActionField` from `@/lib/visualizer/core/fields`, then after `runTry` add:

```tsx
  // An action names the step to play from; seek once the rebuilt frames have landed.
  const pendingSeek = useRef<number | null>(null);
  const act = useCallback(
    (field: ActionField) => {
      const r = field.apply(values);
      pendingSeek.current = r.step ?? null;
      setValues(r.values);
      restart();
    },
    [values, restart],
  );
  useEffect(() => {
    const at = pendingSeek.current;
    if (at === null) return;
    pendingSeek.current = null;
    seek(at);
  }, [result.frames, seek]);
```

and pass to `ConfigPanel`: `sequences={result.sequences}` and `onAction={act}`.

- [ ] **Step 9: CSS.** `css/view-visualizer/playback.css`, after `.viz-strip__cell.is-bad`:

```css
.viz-strip__cell.is-neutral {
  border-color: var(--viz-slot-border);
  background: var(--viz-slot-bg);
}
```

`css/view-visualizer/ui.css`, after `.viz-badge--bad`:

```css
.viz-badge--neutral {
  color: var(--viz-ink-muted);
  background: var(--viz-slot-bg);
}
```

`css/view-visualizer/panels.css`, after `.viz-field.is-disabled .viz-field__range`:

```css
.viz-field.is-disabled .viz-choice__btn,
.viz-field.is-disabled .viz-btn {
  cursor: not-allowed;
}
.viz-field--action {
  display: inline-flex;
  margin-right: var(--s2);
}
```

(`--viz-ink-muted` is added in Task 3; the alias must exist before the CSS is used, which is true once Task 3 lands.)

- [ ] **Step 10: Tests — fields.** Append to `lib/visualizer/core/fields.test.ts`:

```ts
describe("resetEmpty and value-aware parsing", () => {
  const seq = (extra: Partial<SequenceField> = {}): SequenceField => ({
    kind: "sequence",
    key: "events",
    label: "Events",
    param: "e",
    maxLen: 4,
    hint: "",
    resetBy: ["nodes"],
    ...extra,
  });

  it("a resetEmpty sequence clears to [] and a plain one to null", () => {
    const sections: FieldSection[] = [
      { title: "", fields: [seq({ resetEmpty: true }), { ...seq(), key: "keys", param: "k" }] },
    ];
    const next = applyChange(sections, { events: ["+"], keys: ["1"] }, "nodes", 5);
    expect(next.events).toEqual([]);
    expect(next.keys).toBeNull();
  });

  it("parseSequenceField hands the current values to the field's parser", () => {
    const parse = vi.fn((raw: string, values: InputValues) => ({
      ok: true as const,
      tokens: [raw, String(values.nodes)],
    }));
    expect(parseSequenceField(seq({ parse }), "+", { nodes: 4 })).toEqual({
      ok: true,
      tokens: ["+", "4"],
    });
    expect(parse).toHaveBeenCalledWith("+", { nodes: 4 });
  });
});
```

(add `vi` to the vitest import and `type FieldSection, type InputValues, type SequenceField, parseSequenceField` to the fields import if missing).

- [ ] **Step 11: Tests — URL state.** Append to `lib/visualizer/core/url-state.test.ts`:

```ts
describe("action fields and empty sequences", () => {
  const sections: FieldSection[] = [
    {
      title: "",
      fields: [
        { kind: "slider", key: "nodes", label: "Nodes", param: "n", min: 1, max: 6 },
        { kind: "action", key: "add", label: "Add", apply: (v) => ({ values: v }) },
        {
          kind: "sequence",
          key: "events",
          label: "Events",
          param: "e",
          maxLen: 4,
          hint: "",
          resetBy: ["nodes"],
          resetEmpty: true,
          join: "_",
          parse: (raw, values) =>
            values.nodes === 3
              ? { ok: true, tokens: raw.split("_").filter(Boolean) }
              : { ok: false, error: "needs 3 nodes" },
        },
      ],
    },
  ];

  it("an action has no URL param", () => {
    const search = encodeState(sections, { nodes: 3, events: ["+"] }, { frame: 0, rotated: false });
    expect(search).toBe("?n=3&e=%2B&i=1");
  });

  it("an empty sequence round-trips as an empty list", () => {
    const search = encodeState(sections, { nodes: 3, events: [] }, { frame: 0, rotated: false });
    expect(search).toBe("?n=3&e=&i=1");
    expect(parseState(search, sections, { nodes: 4, events: ["+"] }).values.events).toEqual([]);
  });

  it("the parser sees fields parsed before it", () => {
    expect(parseState("?n=3&e=%2B", sections, { nodes: 4, events: [] }).values.events).toEqual([
      "+",
    ]);
    expect(parseState("?n=5&e=%2B", sections, { nodes: 4, events: [] }).values.events).toBeNull();
  });
});
```

(import `type FieldSection` from `./fields` if missing).

- [ ] **Step 12: Tests — action field, disabled chips, neutral strip.** Create `components/visualizer/frame/action-field.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ActionField, ChipsField, SequenceField } from "@/lib/visualizer/core/fields";
import type { VizFrame } from "@/lib/visualizer/core/types";
import { ConfigField } from "./ConfigFields";
import { LogTab } from "./InfoTabs";
import { TimelineStrip } from "./TimelineStrip";

const action: ActionField = {
  kind: "action",
  key: "grow",
  label: "Grow",
  apply: (v) => ({ values: v }),
};

describe("action field", () => {
  it("renders a button that reports the press", () => {
    const onAction = vi.fn();
    render(
      <ConfigField
        field={action}
        value={null}
        values={{}}
        sequence={[]}
        onChange={vi.fn()}
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Grow" }));
    expect(onAction).toHaveBeenCalledWith(action);
  });

  it("is disabled, with its hint, when availability says so", () => {
    const onAction = vi.fn();
    render(
      <ConfigField
        field={action}
        value={null}
        values={{}}
        sequence={[]}
        onChange={vi.fn()}
        onAction={onAction}
        availability={{ disabled: true, hint: "At most 4" }}
      />,
    );
    const btn = screen.getByRole<HTMLButtonElement>("button", { name: "Grow" });
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByText("At most 4")).toBeTruthy();
  });
});

describe("chips availability", () => {
  it("a disabled chips field dims and disables every chip", () => {
    const chips: ChipsField = {
      kind: "chips",
      key: "v",
      label: "Size",
      param: "v",
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2" },
      ],
    };
    const { container } = render(
      <ConfigField
        field={chips}
        value="1"
        values={{}}
        sequence={[]}
        onChange={vi.fn()}
        availability={{ disabled: true }}
      />,
    );
    expect(container.querySelector(".viz-field.is-disabled")).toBeTruthy();
    for (const b of screen.getAllByRole<HTMLButtonElement>("button")) expect(b.disabled).toBe(true);
  });
});

describe("sequence parsing sees the other inputs", () => {
  it("passes the current values to the parser on Enter", () => {
    const parse = vi.fn(() => ({ ok: false as const, error: "Too many" }));
    const field: SequenceField = {
      kind: "sequence",
      key: "events",
      label: "Events",
      param: "e",
      maxLen: 4,
      hint: "hint",
      resetBy: [],
      parse,
    };
    render(
      <ConfigField
        field={field}
        value={["+"]}
        values={{ nodes: 6 }}
        sequence={["+"]}
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByLabelText("Events");
    fireEvent.change(input, { target: { value: "+ +" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(parse).toHaveBeenCalledWith("+ +", { nodes: 6 });
    expect(screen.getByText("Too many")).toBeTruthy();
  });
});

describe("neutral outcome", () => {
  const frame = (index: number): VizFrame => ({
    index,
    label: String(index),
    outcome: "neutral",
    badge: "PLACED",
    caption: [],
    lines: [],
    path: [0],
    vars: [],
    logNote: [],
    metric: "—",
    model: {
      kind: "table",
      head: ["a", "b"],
      rows: [],
      active: null,
    },
  });

  it("a played neutral step gets the neutral strip cell and log badge", () => {
    const frames = [frame(0), frame(1)];
    const { container } = render(
      <TimelineStrip frames={frames} current={1} unit="step" onSeek={vi.fn()} />,
    );
    expect(container.querySelector(".viz-strip__cell.is-neutral")).toBeTruthy();
    const log = render(<LogTab frames={frames} current={1} onSeek={vi.fn()} />);
    expect(log.container.querySelector(".viz-badge--neutral")).toBeTruthy();
  });
});
```

(the `table` model kind is added in Task 2; this test compiles once Task 2 lands, and nothing runs before Task 11).

- [ ] **Step 13: Tests — Ranking suffix.** Append to `components/visualizer/shapes/shapes.test.tsx`:

```tsx
describe("Ranking suffix", () => {
  it("prints the module's suffix instead of ×", () => {
    const { container } = render(
      <RankingShape
        model={{
          kind: "ranking",
          rows: [
            { key: "B", count: 89 },
            { key: "A", count: 72 },
          ],
          capacity: 3,
          next: null,
          active: "B",
          tone: "new",
          removed: null,
          suffix: "",
        }}
        subject="Scores"
      />,
    );
    const counts = [...container.querySelectorAll(".viz-rank__count")].map((c) => c.textContent);
    expect(counts.sort()).toEqual(["72", "89"]);
  });
});
```

(import `RankingShape` from `./RankingShape` if the file does not already).

---

### Task 2: Core shape models and geometry — Bins, Scale, Table, Composite side

**Files:**
- Modify: `lib/visualizer/core/shapes.ts`, `lib/visualizer/core/geometry.ts`
- Test: `lib/visualizer/core/partition-shapes.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces (exact names used by Tasks 3, 6): `ItemTone`, `PartState`, `BinItem`, `Bin`, `BinMove`, `BinsModel`, `ScaleSegment`, `ScaleAnchor`, `ScalePoint`, `ScaleModel`, `TableRow`, `TableModel`, `CompositeModel.layout`, `binsLabel`, `scaleLabel`; geometry `binsLayout`, `BinsLayout`, `trailBetween`, `Trail`, `scaleLine`, `ScaleLine`, `scaleCircle`, `ScaleCircle`, `arcPath`, `labelLanes`, `compositeColumns`, `compositeSideHeight`, `SCALE_LINE_H`, `SCALE_LINE_H_DENSE`.

- [ ] **Step 1: Models.** In `lib/visualizer/core/shapes.ts`, before `export type LeafModel`, add:

```ts
export type ItemTone = "changed" | "heavy";
export type PartState = "new" | "removed";

export interface BinItem {
  id: string;
  text: string;
  tone?: ItemTone;
}
export interface Bin {
  id: string;
  label: string;
  items: BinItem[];
  state?: PartState;
  meter?: number;
}
export interface BinMove {
  item: string;
  from: string;
  to: string;
  // The item's position in its old bin, where the trail starts.
  fromSlot: number;
}
// slots is the run-wide tallest bin so the stage keeps one height.
export interface BinsModel {
  kind: "bins";
  bins: Bin[];
  active: string | null;
  move: BinMove | null;
  limit: number | null;
  meter: { max: number; mark: number } | null;
  slots: number;
}

export interface ScaleSegment {
  from: number;
  to: number;
  owner: string;
  label: string;
  state?: PartState;
}
export interface ScaleAnchor {
  at: number;
  label: string;
  owner: string;
  // Spoken and shown on hover; the drawn label stays short.
  title?: string;
  state?: PartState;
}
export interface ScalePoint {
  id: string;
  at: number;
  label: string;
  tone?: ItemTone;
  active?: boolean;
}
// Positions 0 … size − 1 on a line or a circle (0 at the top, clockwise).
export interface ScaleModel {
  kind: "scale";
  layout: "line" | "circle";
  size: number;
  segments: ScaleSegment[];
  anchors: ScaleAnchor[];
  points: ScalePoint[];
  walk: { from: number; to: number } | null;
  ticks: number[];
}

export interface TableRow {
  cells: [string, string];
  tone?: "changed";
}
export interface TableModel {
  kind: "table";
  head: [string, string];
  rows: TableRow[];
  active: number | null;
}
```

Extend the unions and Composite:

```ts
export type LeafModel =
  | LinearModel
  | HistogramModel
  | RankingModel
  | RingModel
  | LanesModel
  | TimelineModel
  | BinsModel
  | ScaleModel
  | TableModel;
export interface CompositeModel {
  kind: "composite";
  // "side" puts parts in a row when the stage is wide enough; "stack" (default) stacks them.
  layout?: "stack" | "side";
  parts: LeafModel[];
}
```

Update `modelKeys` (add before the final `return`):

```ts
  if (model.kind === "bins") return model.bins.flatMap((b) => b.items.map((i) => i.id));
  if (model.kind === "scale") return model.points.map((p) => p.id);
  if (model.kind === "table") return model.rows.map((r) => r.cells[0]);
```

Add the screen-reader labels at the end of the file:

```ts
export function binsLabel(model: BinsModel, subject: string): string {
  const bins = model.bins.map((b) => {
    const state = b.state ? ` (${b.state})` : "";
    return `${b.label}${state}: ${b.items.map((i) => i.text).join(", ") || "empty"}`;
  });
  return `${subject}: ${bins.join("; ")}`;
}

export function scaleLabel(model: ScaleModel, subject: string): string {
  const anchors = model.anchors.map((a) => a.title ?? `${a.label} at ${a.at}`);
  const points = model.points.map((p) => `${p.label} at ${p.at}`);
  return `${subject}: ${[...anchors, ...points].join(", ") || "empty"}`;
}
```

Then run `grep -rn "model.kind ===\|case \"" components/visualizer lib/visualizer/core --include=*.ts --include=*.tsx` and confirm no exhaustive switch over `ShapeModel` kinds exists outside `Shape.tsx` and `modelKeys`; if one does, add the three kinds there.

- [ ] **Step 2: Geometry.** In `lib/visualizer/core/geometry.ts`:

Replace `compositeHeights` with a version that treats a line Scale like a Timeline (fixed natural height) and exempts bins from the flex cap:

```ts
export const SCALE_LINE_H = 64;
export const SCALE_LINE_H_DENSE = 48;

function fixedHeight(size: Size, p: LeafModel): number | null {
  if (p.kind === "timeline") {
    return timelineLayout(size, {
      ticks: p.ticks,
      rows: p.rows.length,
      stack: p.stack,
      lanes: p.lanes,
      labeled: p.rows.some((r) => r.label !== ""),
    }).height;
  }
  if (p.kind === "scale" && p.layout === "line") {
    return isDense(size) ? SCALE_LINE_H_DENSE : SCALE_LINE_H;
  }
  return null;
}

// Timelines and line scales keep their natural height; the other parts share what is left.
// A tall single-view stage reserves room for the metric and caption; a 200px revision card does not.
export function compositeHeights(size: Size, parts: LeafModel[]): number[] {
  const budget = size.h >= CHROME_MIN_H ? size.h - CHROME : size.h;
  const natural = parts.map((p) => fixedHeight(size, p));
  const flex = natural.filter((n) => n === null).length;
  const rest = Math.max(0, budget - natural.reduce<number>((a, b) => a + (b ?? 0), 0));
  return parts.map((p, i) => {
    const fixed = natural[i];
    if (fixed !== null && fixed !== undefined) return fixed;
    // Bins grow with their tallest column, so they may take the whole remainder.
    const cap = isDense(size) || p.kind === "bins" ? Number.POSITIVE_INFINITY : FLEX_MAX_H;
    const floor = isDense(size) ? FLEX_MIN_H_DENSE : FLEX_MIN_H;
    return Math.min(cap, Math.max(floor, Math.floor(rest / Math.max(1, flex))));
  });
}

const SIDE_RATIO = 1.1;

export const compositeSideHeight = (size: Size): number =>
  size.h >= CHROME_MIN_H ? size.h - CHROME : size.h;

function sideWidth(w: number, h: number, p: LeafModel): number {
  if (p.kind === "scale") return Math.min(h, w * 0.45);
  if (p.kind === "table") return clamp(w * 0.28, 80, 150);
  return clamp(w * 0.36, 110, 220);
}

// Side by side when the stage is wide for its height; null means stack.
export function compositeColumns(size: Size, parts: LeafModel[]): number[] | null {
  if (parts.length < 2 || size.w < size.h * SIDE_RATIO) return null;
  const h = compositeSideHeight(size);
  const lead = parts.slice(0, -1).map((p) => sideWidth(size.w, h, p));
  const used = lead.reduce((a, b) => a + b, 0);
  return [...lead, Math.max(0, size.w - used)];
}
```

Append the bins, trail and scale geometry:

```ts
const BIN_GAP = 4;
const BIN_PAD = 8;
const BIN_MIN_W = 30;
const BIN_MAX_W = 64;

export interface BinsLayout {
  width: number;
  height: number;
  binW: number;
  itemH: number;
  headH: number;
  meterH: number;
  top: number;
  colTop: number;
  colH: number;
  binX: (i: number) => number;
  itemY: (slot: number) => number;
}

// Chips shrink to fit the tallest column; a tall stage keeps clear of the metric and caption.
export function binsLayout(
  size: Size,
  bins: number,
  slots: number,
  meter: boolean,
  dense: boolean = isDense(size),
): BinsLayout {
  const n = Math.max(1, bins);
  const rows = Math.max(1, slots);
  const tall = size.h >= CHROME_MIN_H;
  const roomH = tall ? size.h - CHROME : size.h;
  const offset = tall ? CHROME / 2 : 0;
  const binW = clamp((size.w - BIN_PAD * 2 - (n - 1) * BIN_GAP) / n, BIN_MIN_W, BIN_MAX_W);
  const headH = dense ? 16 : 22;
  const meterH = meter ? (dense ? 20 : 34) : 0;
  const gap = dense ? 2 : 4;
  const room = roomH - BIN_PAD * 2 - headH - meterH - 6;
  const itemH = clamp(room / rows - gap, 12, dense ? 16 : 20);
  const colH = headH + rows * (itemH + gap) + 6;
  const height = meterH + colH;
  const width = n * binW + (n - 1) * BIN_GAP;
  // At the minimum bin width the side padding gives way first, so a narrow card never overflows.
  const left = Math.max(0, (size.w - width) / 2);
  const top = offset + Math.max(BIN_PAD, (roomH - height) / 2);
  return {
    width,
    height,
    binW,
    itemH,
    headH,
    meterH,
    top,
    colTop: top + meterH,
    colH,
    binX: (i) => left + i * (binW + BIN_GAP),
    itemY: (s) => top + meterH + headH + s * (itemH + gap),
  };
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export interface Trail {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  head: string;
}

// The trail stops `stop` short of the target so the head sits at the chip's edge.
export function trailBetween(x1: number, y1: number, x2: number, y2: number, stop: number): Trail {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const tx = round1(x2 - Math.cos(a) * stop);
  const ty = round1(y2 - Math.sin(a) * stop);
  const bx = tx - Math.cos(a) * 8;
  const by = ty - Math.sin(a) * 8;
  const px = -Math.sin(a) * 5;
  const py = Math.cos(a) * 5;
  const pt = (x: number, y: number) => `${round1(x)},${round1(y)}`;
  return {
    x1: round1(x1),
    y1: round1(y1),
    x2: tx,
    y2: ty,
    head: `${pt(tx, ty)} ${pt(bx + px, by + py)} ${pt(bx - px, by - py)}`,
  };
}

const SCALE_PAD = 14;

export interface ScaleLine {
  height: number;
  unit: number;
  barY: number;
  barH: number;
  axisY: number;
  x: (at: number) => number;
  labelY: (lane: number) => number;
}

export function scaleLine(size: Size, scale: number, dense: boolean): ScaleLine {
  const unit = Math.max(0, size.w - SCALE_PAD * 2) / Math.max(1, scale);
  const barY = dense ? 20 : 28;
  const barH = dense ? 10 : 14;
  return {
    height: dense ? SCALE_LINE_H_DENSE : SCALE_LINE_H,
    unit,
    barY,
    barH,
    axisY: barY + barH + 11,
    x: (at) => SCALE_PAD + at * unit,
    labelY: (lane) => barY - 9 - lane * (dense ? 7 : 10),
  };
}

export interface ScaleCircle {
  cx: number;
  cy: number;
  r: number;
  pt: (at: number, scale: number, radius?: number) => Point;
}

export function scaleCircle(size: Size, dense: boolean): ScaleCircle {
  const s = Math.min(size.w, size.h);
  const r = Math.max(12, s / 2 - (dense ? 16 : 26));
  const cx = size.w / 2;
  const cy = size.h / 2;
  return {
    cx,
    cy,
    r,
    pt: (at, scale, radius = r) => {
      const a = (at / scale) * 2 * Math.PI - Math.PI / 2;
      return { x: round1(cx + radius * Math.cos(a)), y: round1(cy + radius * Math.sin(a)) };
    },
  };
}

// Clockwise arc from `from` to `to`; equal ends mean the whole circle unless asked otherwise.
export function arcPath(
  c: ScaleCircle,
  from: number,
  to: number,
  scale: number,
  radius: number = c.r,
  fullWhenEqual = true,
): string {
  const span = (((to - from) % scale) + scale) % scale;
  const a = c.pt(from, scale, radius);
  if (span === 0) {
    if (!fullWhenEqual) return "";
    const b = c.pt(from + scale / 2, scale, radius);
    return `M${a.x} ${a.y} A${radius} ${radius} 0 1 1 ${b.x} ${b.y} A${radius} ${radius} 0 1 1 ${a.x} ${a.y}`;
  }
  const b = c.pt(to, scale, radius);
  return `M${a.x} ${a.y} A${radius} ${radius} 0 ${span > scale / 2 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

// Two label lanes: a point closer than minGap to the previous one moves to the other lane.
export function labelLanes(ats: number[], minGap: number): number[] {
  const order = ats.map((at, i) => ({ at, i })).sort((a, b) => a.at - b.at);
  const lanes = ats.map(() => 0);
  let prevAt = Number.NEGATIVE_INFINITY;
  let prevLane = 1;
  for (const { at, i } of order) {
    const lane = at - prevAt < minGap && prevLane === 0 ? 1 : 0;
    lanes[i] = lane;
    prevAt = at;
    prevLane = lane;
  }
  return lanes;
}
```

- [ ] **Step 3: Tests.** Create `lib/visualizer/core/partition-shapes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  arcPath,
  binsLayout,
  compositeColumns,
  compositeHeights,
  labelLanes,
  SCALE_LINE_H,
  SCALE_LINE_H_DENSE,
  scaleCircle,
  scaleLine,
  trailBetween,
} from "./geometry";
import { type BinsModel, binsLabel, modelKeys, type ScaleModel, scaleLabel } from "./shapes";

const bins = (n: number, slots: number): BinsModel => ({
  kind: "bins",
  bins: Array.from({ length: n }, (_, i) => ({ id: `b${i}`, label: `b${i}`, items: [] })),
  active: null,
  move: null,
  limit: null,
  meter: null,
  slots,
});
const line: ScaleModel = {
  kind: "scale",
  layout: "line",
  size: 100,
  segments: [],
  anchors: [],
  points: [],
  walk: null,
  ticks: [],
};

describe("binsLayout", () => {
  it("six bins of twelve chips fit a 320 × 380 stage, clear of the metric and caption", () => {
    const L = binsLayout({ w: 320, h: 380 }, 6, 12, true, false);
    expect(L.binX(0)).toBeGreaterThanOrEqual(8);
    expect(L.binX(5) + L.binW).toBeLessThanOrEqual(320 - 8);
    expect(L.top).toBeGreaterThanOrEqual(40);
    expect(L.itemY(11) + L.itemH).toBeLessThanOrEqual(380 - 40);
  });

  it("four bins of five chips fit the bins part of a 250 × 200 Revision card", () => {
    const L = binsLayout({ w: 138, h: 200 }, 4, 5, false, true);
    expect(L.binX(3) + L.binW).toBeLessThanOrEqual(138);
    expect(L.itemY(4) + L.itemH).toBeLessThanOrEqual(200);
  });

  it("twelve chips fit the bins part of a stacked Range at 320 × 380", () => {
    const heights = compositeHeights({ w: 320, h: 380 }, [line, bins(4, 12)]);
    expect(heights[0]).toBe(SCALE_LINE_H);
    const h = heights[1] ?? 0;
    expect(h).toBe(380 - 80 - SCALE_LINE_H);
    const L = binsLayout({ w: 320, h }, 4, 12, false, false);
    expect(L.itemY(11) + L.itemH).toBeLessThanOrEqual(h);
  });

  it("a dense line scale is shorter", () => {
    expect(compositeHeights({ w: 250, h: 200 }, [line, bins(4, 3)])[0]).toBe(SCALE_LINE_H_DENSE);
  });
});

describe("compositeColumns", () => {
  it("goes side by side on a wide stage and in a 250 × 200 card", () => {
    const wide = compositeColumns({ w: 800, h: 520 }, [{ ...line, layout: "circle" }, bins(4, 4)]);
    expect(wide).not.toBeNull();
    expect((wide ?? []).reduce((a, b) => a + b, 0)).toBe(800);
    expect(wide?.[0]).toBe(Math.min(440, 360));
    const card = compositeColumns({ w: 250, h: 200 }, [{ ...line, layout: "circle" }, bins(4, 3)]);
    expect(card?.[0]).toBe(112.5);
  });

  it("stacks on a narrow stage or with one part", () => {
    expect(compositeColumns({ w: 320, h: 380 }, [line, bins(4, 4)])).toBeNull();
    expect(compositeColumns({ w: 800, h: 520 }, [bins(4, 4)])).toBeNull();
  });
});

describe("trail, scale and lanes", () => {
  it("a horizontal trail stops short of the target with the head at its end", () => {
    expect(trailBetween(0, 0, 100, 0, 10)).toEqual({
      x1: 0,
      y1: 0,
      x2: 90,
      y2: 0,
      head: "90,0 82,5 82,-5",
    });
  });

  it("a line scale maps positions across the padded width", () => {
    const g = scaleLine({ w: 228, h: 64 }, 100, false);
    expect(g.x(0)).toBe(14);
    expect(g.x(100)).toBe(214);
    expect(g.unit).toBe(2);
  });

  it("a circle puts 0 at the top and 25 on the right", () => {
    const c = scaleCircle({ w: 200, h: 200 }, false);
    expect(c.r).toBe(74);
    expect(c.pt(0, 100)).toEqual({ x: 100, y: 26 });
    expect(c.pt(25, 100)).toEqual({ x: 174, y: 100 });
  });

  it("equal ends draw the whole circle unless told not to", () => {
    const c = scaleCircle({ w: 200, h: 200 }, false);
    expect(arcPath(c, 48, 48, 100)).toContain("A74 74 0 1 1");
    expect(arcPath(c, 48, 48, 100, c.r, false)).toBe("");
    expect(arcPath(c, 0, 25, 100)).toBe("M100 26 A74 74 0 0 1 174 100");
    expect(arcPath(c, 0, 75, 100)).toBe("M100 26 A74 74 0 1 1 26 100");
  });

  it("close points alternate label lanes", () => {
    expect(labelLanes([55, 53, 0], 4)).toEqual([1, 0, 0]);
    expect(labelLanes([10, 20, 30], 4)).toEqual([0, 0, 0]);
  });
});

describe("labels and keys", () => {
  it("bins and scale read out their contents", () => {
    const m: BinsModel = {
      ...bins(2, 2),
      bins: [
        { id: "A", label: "A", items: [{ id: "12", text: "12" }], state: "new" },
        { id: "B", label: "B", items: [] },
      ],
    };
    expect(binsLabel(m, "Nodes")).toBe("Nodes: A (new): 12; B: empty");
    expect(modelKeys(m)).toEqual(["12"]);
    const s: ScaleModel = {
      ...line,
      anchors: [{ at: 48, label: "A", owner: "A" }],
      points: [{ id: "12", at: 55, label: "12" }],
    };
    expect(scaleLabel(s, "Ring")).toBe("Ring: A at 48, 12 at 55");
  });
});
```

Hand-checks for the values above: 800 × 520 → side height 440, scale width `min(440, 0.45 × 800 = 360)` = 360; card 250 × 200 → `min(200, 112.5)` = 112.5. Circle 200 × 200 not dense → r = 100 − 26 = 74; `pt(0)` = (100, 100 − 74) = (100, 26); `pt(25)` = (174, 100); a 0 → 75 span is 75 > 50 so the large-arc flag is 1, ending at (26, 100). Line 228 wide → unit (228 − 28)/100 = 2. Trail (0,0)→(100,0) stop 10 → tip (90, 0), base (82, 0), perpendicular (0, ±5). Lanes [55, 53, 0] sorted 0 (lane 0), 53 (53 − 0 ≥ 4, lane 0), 55 (55 − 53 < 4 after lane 0 → lane 1).

---

### Task 3: Shape components — Bins, Scale, Table, Composite side — and their CSS

**Files:**
- Create: `components/visualizer/shapes/BinsShape.tsx`, `components/visualizer/shapes/ScaleShape.tsx`, `components/visualizer/shapes/TableShape.tsx`, `css/view-visualizer/bins.css`, `css/view-visualizer/scale.css`
- Modify: `components/visualizer/shapes/Shape.tsx`, `components/visualizer/shapes/CompositeShape.tsx`, `css/tokens.css`, `css/wiki.css`, `css/view-visualizer/timeline.css`
- Test: `components/visualizer/shapes/partition-shapes.test.tsx`, `components/visualizer/shapes/CompositeShape.test.tsx`

**Interfaces:**
- Consumes: Task 2 models and geometry.
- Produces: `BinsShape`, `ScaleShape`, `TableShape` (props `{ model; size; subject; dense }`, Table `{ model; subject }`), Composite `side` rendering; `--viz-slot-alt`, `--viz-ink`, `--viz-ink-strong`, `--viz-ink-muted`.

- [ ] **Step 1: Tokens.** In `css/tokens.css`, right after `--viz-slot-border: var(--border-2);`:

```css
  --viz-slot-alt: var(--surface-3);
  --viz-ink: var(--text-body);
  --viz-ink-strong: var(--text-heading);
  --viz-ink-muted: var(--text-muted);
```

In `css/wiki.css`, after `@import "./view-visualizer/timeline.css";`:

```css
@import "./view-visualizer/bins.css";
@import "./view-visualizer/scale.css";
```

- [ ] **Step 2: BinsShape.** Create `components/visualizer/shapes/BinsShape.tsx`:

```tsx
import { type BinsLayout, binsLayout, type Size, trailBetween } from "@/lib/visualizer/core/geometry";
import { type BinsModel, binsLabel } from "@/lib/visualizer/core/shapes";

interface BinsShapeProps {
  model: BinsModel;
  size: Size;
  subject: string;
  dense: boolean;
}

interface Placed {
  id: string;
  text: string;
  tone: string;
  x: number;
  y: number;
}

function Meter({ model, L }: { model: BinsModel; L: BinsLayout }) {
  const meter = model.meter;
  if (!meter) return null;
  const scale = (v: number) => (Math.min(v, meter.max) / Math.max(1, meter.max)) * (L.meterH - 6);
  const base = L.top + L.meterH - 2;
  return (
    <>
      {model.bins.map((b, i) => {
        const h = scale(b.meter ?? 0);
        return (
          <span
            key={`meter-${b.id}`}
            className={`viz-bins__meter${(b.meter ?? 0) > meter.mark ? " is-over" : ""}`}
            style={{ left: L.binX(i) + L.binW / 4, width: L.binW / 2, top: base - h, height: h }}
          />
        );
      })}
      <span
        className="viz-bins__mark"
        style={{ left: L.binX(0) - 3, width: L.width + 6, top: base - scale(meter.mark) }}
      />
    </>
  );
}

export function BinsShape({ model, size, subject, dense }: BinsShapeProps) {
  const L = binsLayout(size, model.bins.length, model.slots, model.meter !== null, dense);
  const items: Placed[] = model.bins.flatMap((b, i) =>
    b.items.map((it, j) => ({
      id: it.id,
      text: it.text,
      tone: it.tone ? ` viz-bins__item--${it.tone}` : "",
      x: L.binX(i),
      y: L.itemY(j),
    })),
  );
  const move = model.move;
  const from = move ? model.bins.findIndex((b) => b.id === move.from) : -1;
  const target = move ? items.find((p) => p.id === move.item) : undefined;
  const trail =
    move && from >= 0 && target
      ? trailBetween(
          L.binX(from) + L.binW / 2,
          L.itemY(move.fromSlot) + L.itemH / 2,
          target.x + L.binW / 2,
          target.y + L.itemH / 2,
          L.binW / 2 - 2,
        )
      : null;
  const limit = model.limit;
  return (
    <div className="viz-bins" role="img" aria-label={binsLabel(model, subject)}>
      {model.bins.map((b, i) => (
        <div
          key={b.id}
          className={`viz-bins__bin${b.state ? ` is-${b.state}` : ""}`}
          style={{ left: L.binX(i), top: L.colTop, width: L.binW, height: L.colH }}
        >
          <span className="viz-bins__label" style={{ height: L.headH, lineHeight: `${L.headH}px` }}>
            {b.label}
          </span>
        </div>
      ))}
      <Meter model={model} L={L} />
      {limit !== null &&
        model.bins.map((b, i) => (
          <span
            key={`limit-${b.id}`}
            className="viz-bins__limit"
            style={{ left: L.binX(i) + 2, width: L.binW - 4, top: L.itemY(limit) - 1 }}
          />
        ))}
      {trail && move && (
        // Keyed by the move so each new move replays the trail.
        <svg
          key={`${move.item}-${move.from}-${move.to}`}
          className="viz-bins__arrow"
          width={size.w}
          height={size.h}
          aria-hidden="true"
        >
          <path
            className="viz-bins__trail"
            pathLength={1}
            d={`M${trail.x1} ${trail.y1} L${trail.x2} ${trail.y2}`}
          />
          <polygon className="viz-bins__head" points={trail.head} />
        </svg>
      )}
      {items.map((it) => (
        // Keyed by item so a moved chip is the same element and slides to its new bin.
        <span
          key={it.id}
          className={`viz-bins__item${it.tone}${it.id === model.active ? " is-active" : ""}`}
          style={{
            left: it.x + 2,
            top: it.y,
            width: L.binW - 4,
            height: L.itemH,
            lineHeight: `${L.itemH}px`,
          }}
        >
          {it.text}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: ScaleShape.** Create `components/visualizer/shapes/ScaleShape.tsx`:

```tsx
import {
  arcPath,
  labelLanes,
  type Size,
  scaleCircle,
  scaleLine,
} from "@/lib/visualizer/core/geometry";
import {
  type ScaleAnchor,
  type ScaleModel,
  type ScalePoint,
  type ScaleSegment,
  scaleLabel,
} from "@/lib/visualizer/core/shapes";

interface ScaleShapeProps {
  model: ScaleModel;
  size: Size;
  subject: string;
  dense: boolean;
}

// Owners alternate between two fills in the order they first appear.
function ownerTones(model: ScaleModel): Map<string, "a" | "b"> {
  const out = new Map<string, "a" | "b">();
  for (const s of model.segments) {
    if (!out.has(s.owner)) out.set(s.owner, out.size % 2 === 0 ? "a" : "b");
  }
  return out;
}

const segClass = (s: ScaleSegment, tones: Map<string, "a" | "b">): string =>
  `viz-scale__part viz-scale__part--${s.state ?? tones.get(s.owner) ?? "a"}`;
const pointClass = (p: ScalePoint): string =>
  `viz-scale__point${p.tone ? ` viz-scale__point--${p.tone}` : ""}${p.active ? " is-active" : ""}`;
const anchorClass = (a: ScaleAnchor): string =>
  `viz-scale__node${a.state ? ` viz-scale__node--${a.state}` : ""}`;

function LineScale({ model, size, subject, dense }: ScaleShapeProps) {
  const g = scaleLine(size, model.size, dense);
  const tones = ownerTones(model);
  const lanes = labelLanes(
    model.points.map((p) => p.at),
    dense ? 6 : 4,
  );
  return (
    <svg
      className="viz-scale viz-scale--line"
      width={size.w}
      height={g.height}
      role="img"
      aria-label={scaleLabel(model, subject)}
    >
      {model.segments.map((s) => {
        const x = g.x(s.from);
        const w = Math.max(0, g.x(s.to) - x);
        return (
          <g key={`${s.owner}-${s.from}`} className={segClass(s, tones)}>
            <rect className="viz-scale__seg" x={x} y={g.barY} width={w} height={g.barH} />
            {w >= 14 && (
              <text
                className="viz-scale__seg-label"
                x={x + w / 2}
                y={g.barY + g.barH / 2 + 4}
                textAnchor="middle"
              >
                {s.label}
              </text>
            )}
          </g>
        );
      })}
      {model.points.map((p, i) => {
        const x = g.x(p.at) + g.unit / 2;
        return (
          <g key={p.id} className={pointClass(p)}>
            <line className="viz-scale__tick" x1={x} x2={x} y1={g.barY - 7} y2={g.barY} />
            <text className="viz-scale__label" x={x} y={g.labelY(lanes[i] ?? 0)} textAnchor="middle">
              {p.label}
            </text>
          </g>
        );
      })}
      {model.ticks.map((t) => (
        <text key={`tick-${t}`} className="viz-scale__axis" x={g.x(t)} y={g.axisY} textAnchor="middle">
          {t}
        </text>
      ))}
    </svg>
  );
}

function CircleScale({ model, size, subject, dense }: ScaleShapeProps) {
  const g = scaleCircle(size, dense);
  const tones = ownerTones(model);
  const lanes = labelLanes(
    model.points.map((p) => p.at),
    3,
  );
  const pointR = (lane: number) => g.r - (dense ? 7 : 11) - lane * (dense ? 5 : 9);
  const labelR = g.r + (dense ? 9 : 14);
  return (
    <svg
      className="viz-scale viz-scale--circle"
      width={size.w}
      height={size.h}
      role="img"
      aria-label={scaleLabel(model, subject)}
    >
      <circle className="viz-scale__track" cx={g.cx} cy={g.cy} r={g.r} />
      {model.segments.map((s) => (
        <path
          key={`${s.owner}-${s.from}`}
          className={`${segClass(s, tones)} viz-scale__seg`}
          d={arcPath(g, s.from, s.to, model.size)}
        />
      ))}
      {model.walk && (
        <path
          key={`walk-${model.walk.from}-${model.walk.to}`}
          className="viz-scale__walk"
          pathLength={1}
          d={arcPath(g, model.walk.from, model.walk.to, model.size, g.r, false)}
        />
      )}
      {model.points.map((p, i) => {
        const c = g.pt(p.at, model.size, pointR(lanes[i] ?? 0));
        const t = g.pt(p.at, model.size, pointR(lanes[i] ?? 0) - 11);
        return (
          <g key={p.id} className={pointClass(p)}>
            <circle className="viz-scale__dot" cx={c.x} cy={c.y} r={dense ? 2 : 3} />
            {!dense && (
              <text className="viz-scale__label" x={t.x} y={t.y + 3} textAnchor="middle">
                {p.label}
              </text>
            )}
          </g>
        );
      })}
      {model.anchors.map((a) => {
        const c = g.pt(a.at, model.size);
        const l = g.pt(a.at, model.size, labelR);
        return (
          <g key={`${a.owner}-${a.at}`} className={anchorClass(a)}>
            <title>{a.title ?? `${a.label} at ${a.at}`}</title>
            <circle className="viz-scale__anchor" cx={c.x} cy={c.y} r={dense ? 3 : 5} />
            <text className="viz-scale__anchor-label" x={l.x} y={l.y + 4} textAnchor="middle">
              {a.label}
            </text>
          </g>
        );
      })}
      {model.ticks.map((t) => {
        const c = g.pt(t, model.size, g.r * 0.6);
        return (
          <text key={`tick-${t}`} className="viz-scale__axis" x={c.x} y={c.y + 4} textAnchor="middle">
            {t}
          </text>
        );
      })}
    </svg>
  );
}

export function ScaleShape(props: ScaleShapeProps) {
  return props.model.layout === "line" ? <LineScale {...props} /> : <CircleScale {...props} />;
}
```

- [ ] **Step 4: TableShape.** Create `components/visualizer/shapes/TableShape.tsx`:

```tsx
import { useEffect, useRef } from "react";
import type { TableModel } from "@/lib/visualizer/core/shapes";

export function TableShape({ model, subject }: { model: TableModel; subject: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLTableRowElement>(null);
  // Scroll only the table, never the page, so the active row stays in view during autoplay.
  useEffect(() => {
    const wrap = wrapRef.current;
    const row = activeRef.current;
    if (!wrap || !row) return;
    wrap.scrollTop = Math.max(0, row.offsetTop - wrap.clientHeight / 2);
  }, [model.active]);
  return (
    <div className="viz-table" ref={wrapRef} role="group" aria-label={subject}>
      <table>
        <thead>
          <tr>
            <th scope="col">{model.head[0]}</th>
            <th scope="col">{model.head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {model.rows.map((r, i) => {
            const cls = [r.tone ? `is-${r.tone}` : "", i === model.active ? "is-active" : ""]
              .filter(Boolean)
              .join(" ");
            return (
              <tr
                key={r.cells[0]}
                ref={i === model.active ? activeRef : undefined}
                className={cls || undefined}
              >
                <td>{r.cells[0]}</td>
                <td>{r.cells[1]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Shape and Composite.** In `components/visualizer/shapes/Shape.tsx` import the three components and add, before the composite branch:

```tsx
  if (model.kind === "bins")
    return <BinsShape model={model} size={size} subject={subject} dense={dense} />;
  if (model.kind === "scale")
    return <ScaleShape model={model} size={size} subject={subject} dense={dense} />;
  if (model.kind === "table") return <TableShape model={model} subject={subject} />;
```

Replace `components/visualizer/shapes/CompositeShape.tsx` with:

```tsx
import type { ReactNode } from "react";
import {
  compositeColumns,
  compositeHeights,
  compositeSideHeight,
  type Size,
} from "@/lib/visualizer/core/geometry";
import type { CompositeModel, LeafModel } from "@/lib/visualizer/core/shapes";

interface CompositeShapeProps {
  model: CompositeModel;
  size: Size;
  subject: string;
  renderPart: (part: LeafModel, size: Size) => ReactNode;
}

export function CompositeShape({ model, size, subject, renderPart }: CompositeShapeProps) {
  const widths = model.layout === "side" ? compositeColumns(size, model.parts) : null;
  if (widths) {
    const h = compositeSideHeight(size);
    return (
      <div className="viz-composite viz-composite--side" role="group" aria-label={subject}>
        {model.parts.map((part, i) => {
          const w = widths[i] ?? 0;
          return (
            // Parts are positional and fixed per module, so the index is a stable key.
            <div key={`${i}-${part.kind}`} className="viz-composite__part" style={{ width: w, height: h }}>
              {renderPart(part, { w, h })}
            </div>
          );
        })}
      </div>
    );
  }
  const heights = compositeHeights(size, model.parts);
  return (
    <div className="viz-composite" role="group" aria-label={subject}>
      {model.parts.map((part, i) => {
        const h = heights[i] ?? 0;
        return (
          // Parts are positional and fixed per module, so the index is a stable key.
          <div key={`${i}-${part.kind}`} className="viz-composite__part" style={{ height: h }}>
            {renderPart(part, { w: size.w, h })}
          </div>
        );
      })}
    </div>
  );
}
```

In `css/view-visualizer/timeline.css`, after `.viz-composite__part { … }`:

```css
.viz-composite--side {
  flex-direction: row;
  align-items: center;
}
```

- [ ] **Step 6: CSS.** Create `css/view-visualizer/bins.css`:

```css
/* Bins: columns of chips; Table: two-column rows */
.viz-bins {
  position: absolute;
  inset: 0;
}
.viz-bins__bin {
  position: absolute;
  box-sizing: border-box;
  border: 1px solid var(--viz-slot-border);
  border-radius: var(--r-sm);
  background: var(--viz-slot-bg);
  transition:
    left var(--viz-move),
    width var(--viz-move),
    border-color var(--t);
  animation: viz-bins-in var(--viz-move);
}
.viz-bins__bin.is-new {
  border-color: var(--viz-active);
}
.viz-bins__bin.is-removed {
  border-style: dashed;
  opacity: 0.55;
}
.viz-bins__label {
  display: block;
  overflow: hidden;
  color: var(--viz-ink-strong);
  font-size: var(--text-xs);
  font-weight: var(--fw-extrabold);
  text-align: center;
  white-space: nowrap;
}
.viz-bins__bin.is-new .viz-bins__label {
  color: var(--viz-active);
}
.viz-bins__item {
  position: absolute;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: var(--r-sm);
  background: var(--viz-slot-alt);
  color: var(--viz-ink);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-align: center;
  white-space: nowrap;
  transition:
    left var(--viz-move),
    top var(--viz-move);
  animation: viz-bins-drop var(--viz-move);
}
.viz-bins__item--changed {
  background: var(--viz-exit-bg);
  color: var(--viz-exit);
}
.viz-bins__item--heavy {
  background: var(--viz-bad-bg);
  color: var(--viz-bad);
}
.viz-bins__item.is-active {
  outline: 2px solid var(--viz-active);
  outline-offset: -1px;
}
.viz-bins__limit,
.viz-bins__mark {
  position: absolute;
  border-top: 1px dashed var(--viz-ink-muted);
}
.viz-bins__meter {
  position: absolute;
  border-radius: 2px 2px 0 0;
  background: var(--viz-slot-alt);
  transition:
    top var(--viz-move),
    height var(--viz-move);
}
.viz-bins__meter.is-over {
  background: var(--viz-bad);
}
.viz-bins__arrow {
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
  pointer-events: none;
}
.viz-bins__trail {
  fill: none;
  stroke: var(--viz-exit);
  stroke-width: 1.5;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: viz-bins-trail var(--viz-move) forwards;
}
.viz-bins__head {
  fill: var(--viz-exit);
  opacity: 0;
  animation: viz-bins-head var(--viz-move) step-end forwards;
}
@keyframes viz-bins-trail {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes viz-bins-head {
  to {
    opacity: 1;
  }
}
@keyframes viz-bins-in {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
}
@keyframes viz-bins-drop {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
}

.viz-table {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: var(--s2);
}
.viz-table table {
  border-collapse: collapse;
  color: var(--viz-ink);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}
.viz-table th {
  padding: 2px var(--s2);
  color: var(--viz-ink-muted);
  font-weight: var(--fw-extrabold);
  text-align: left;
}
.viz-table td {
  padding: 1px var(--s2);
}
.viz-table tr {
  animation: viz-bins-drop var(--viz-move);
}
.viz-table tr.is-changed td {
  color: var(--viz-exit);
}
.viz-table tr.is-active td {
  background: var(--viz-slot-alt);
  color: var(--viz-ink-strong);
}

@media (prefers-reduced-motion: reduce) {
  .viz-bins__bin,
  .viz-bins__item,
  .viz-bins__meter,
  .viz-table tr {
    animation: none;
    transition: none;
  }
  .viz-bins__trail {
    animation: none;
    stroke-dashoffset: 0;
  }
  .viz-bins__head {
    animation: none;
    opacity: 1;
  }
}
```

Create `css/view-visualizer/scale.css`:

```css
/* Scale: positions on a line or a circle, with owner segments, anchors and points */
.viz-scale {
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
}
.viz-scale text {
  fill: var(--viz-ink);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}
.viz-scale__track {
  fill: none;
  stroke: var(--viz-slot-bg);
  stroke-width: 10;
}
.viz-scale--line .viz-scale__seg {
  fill: var(--viz-slot-bg);
}
.viz-scale--line .viz-scale__part--b .viz-scale__seg {
  fill: var(--viz-slot-alt);
}
.viz-scale--line .viz-scale__part--new .viz-scale__seg {
  fill: var(--viz-active);
}
.viz-scale--circle .viz-scale__seg {
  fill: none;
  stroke: var(--viz-slot-bg);
  stroke-width: 10;
}
.viz-scale--circle .viz-scale__part--b.viz-scale__seg {
  stroke: var(--viz-slot-alt);
}
.viz-scale--circle .viz-scale__part--new.viz-scale__seg {
  stroke: var(--viz-active);
}
.viz-scale .viz-scale__seg-label,
.viz-scale .viz-scale__anchor-label {
  fill: var(--viz-ink-strong);
  font-weight: var(--fw-extrabold);
}
.viz-scale .viz-scale__part--new .viz-scale__seg-label {
  fill: var(--viz-on-accent);
}
.viz-scale__anchor {
  fill: var(--viz-ink-strong);
}
.viz-scale__node--new .viz-scale__anchor,
.viz-scale .viz-scale__node--new .viz-scale__anchor-label {
  fill: var(--viz-active);
}
.viz-scale__node--removed {
  opacity: 0.4;
}
.viz-scale__dot {
  fill: var(--viz-ink);
}
.viz-scale__tick {
  stroke: var(--viz-ink);
}
.viz-scale__point--changed .viz-scale__dot,
.viz-scale .viz-scale__point--changed .viz-scale__label {
  fill: var(--viz-exit);
}
.viz-scale__point--changed .viz-scale__tick {
  stroke: var(--viz-exit);
}
.viz-scale__point--heavy .viz-scale__dot,
.viz-scale .viz-scale__point--heavy .viz-scale__label {
  fill: var(--viz-bad);
}
.viz-scale__point.is-active .viz-scale__dot {
  stroke: var(--viz-active);
  stroke-width: 2;
}
.viz-scale .viz-scale__axis {
  fill: var(--viz-ink-muted);
}
.viz-scale__walk {
  fill: none;
  stroke: var(--viz-active);
  stroke-width: 3;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: viz-scale-walk var(--viz-move) forwards;
}
.viz-scale__node,
.viz-scale__point {
  animation: viz-scale-in var(--viz-move);
}
@keyframes viz-scale-walk {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes viz-scale-in {
  from {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .viz-scale__walk {
    animation: none;
    stroke-dashoffset: 0;
  }
  .viz-scale__node,
  .viz-scale__point {
    animation: none;
  }
}
```

- [ ] **Step 7: Component tests.** Create `components/visualizer/shapes/partition-shapes.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BinsModel, ScaleModel, TableModel } from "@/lib/visualizer/core/shapes";
import { Shape } from "./Shape";

const binsModel: BinsModel = {
  kind: "bins",
  bins: [
    { id: "A", label: "A", items: [{ id: "29", text: "29" }] },
    { id: "B", label: "B", items: [{ id: "65", text: "65" }], state: "removed" },
    { id: "D", label: "D", items: [{ id: "12", text: "12", tone: "changed" }], state: "new" },
  ],
  active: "12",
  move: { item: "12", from: "B", to: "D", fromSlot: 0 },
  limit: 2,
  meter: { max: 6, mark: 3 },
  slots: 3,
};

describe("Bins", () => {
  it("draws one bin per column with its state, and chips with tone and focus", () => {
    const { container } = render(
      <Shape model={binsModel} rotated={false} size={{ w: 600, h: 400 }} subject="Nodes" />,
    );
    expect(container.querySelectorAll(".viz-bins__bin")).toHaveLength(3);
    expect(container.querySelector(".viz-bins__bin.is-removed")?.textContent).toBe("B");
    expect(container.querySelector(".viz-bins__bin.is-new")?.textContent).toBe("D");
    expect(container.querySelector(".viz-bins__item--changed.is-active")?.textContent).toBe("12");
    expect(container.querySelector(".viz-bins")?.getAttribute("aria-label")).toBe(
      "Nodes: A: 29; B (removed): 65; D (new): 12",
    );
  });

  it("draws the move trail, a limit line per bin and a meter per bin", () => {
    const { container } = render(
      <Shape model={binsModel} rotated={false} size={{ w: 600, h: 400 }} subject="Nodes" />,
    );
    expect(container.querySelector(".viz-bins__trail")).toBeTruthy();
    expect(container.querySelector(".viz-bins__head")).toBeTruthy();
    expect(container.querySelectorAll(".viz-bins__limit")).toHaveLength(3);
    expect(container.querySelectorAll(".viz-bins__meter")).toHaveLength(3);
    expect(container.querySelector(".viz-bins__mark")).toBeTruthy();
  });

  it("twelve chips in one of six bins stay inside a 320 × 380 stage", () => {
    const crowded: BinsModel = {
      kind: "bins",
      bins: ["A", "B", "C", "D", "E", "F"].map((id, i) => ({
        id,
        label: id,
        items:
          i === 2
            ? Array.from({ length: 12 }, (_, k) => ({ id: String(k), text: `${k} ×5` }))
            : [],
      })),
      active: null,
      move: null,
      limit: null,
      meter: { max: 60, mark: 10 },
      slots: 12,
    };
    const { container } = render(
      <Shape model={crowded} rotated={false} size={{ w: 320, h: 380 }} subject="Nodes" />,
    );
    for (const el of container.querySelectorAll<HTMLElement>(".viz-bins__item")) {
      const left = Number.parseFloat(el.style.left);
      const top = Number.parseFloat(el.style.top);
      expect(left + Number.parseFloat(el.style.width)).toBeLessThanOrEqual(320);
      expect(top + Number.parseFloat(el.style.height)).toBeLessThanOrEqual(380);
    }
  });
});

const ring: ScaleModel = {
  kind: "scale",
  layout: "circle",
  size: 100,
  segments: [
    { from: 85, to: 22, owner: "C", label: "C" },
    { from: 22, to: 48, owner: "A", label: "A" },
    { from: 48, to: 85, owner: "B", label: "B" },
  ],
  anchors: [
    { at: 22, label: "C", owner: "C" },
    { at: 48, label: "A", owner: "A" },
    { at: 85, label: "B", owner: "B" },
  ],
  points: [{ id: "12", at: 55, label: "12", active: true }],
  walk: { from: 55, to: 85 },
  ticks: [0],
};

describe("Scale", () => {
  it("a circle draws arcs, labelled anchors, points and the walk", () => {
    const { container } = render(
      <Shape model={ring} rotated={false} size={{ w: 300, h: 300 }} subject="Ring" />,
    );
    expect(container.querySelectorAll("path.viz-scale__seg")).toHaveLength(3);
    expect(
      [...container.querySelectorAll(".viz-scale__anchor-label")].map((t) => t.textContent),
    ).toEqual(["C", "A", "B"]);
    expect(container.querySelector(".viz-scale__point.is-active")).toBeTruthy();
    expect(container.querySelector(".viz-scale__walk")?.getAttribute("d")).toMatch(/^M/);
    expect(container.querySelectorAll(".viz-scale__part--b")).toHaveLength(1);
  });

  it("a dense circle drops point labels but keeps anchor letters", () => {
    const { container } = render(
      <Shape model={ring} rotated={false} size={{ w: 112, h: 200 }} subject="Ring" />,
    );
    expect(container.querySelectorAll(".viz-scale__label")).toHaveLength(0);
    expect(container.querySelectorAll(".viz-scale__anchor-label")).toHaveLength(3);
  });

  it("a line draws bands, key ticks and axis numbers", () => {
    const line: ScaleModel = {
      kind: "scale",
      layout: "line",
      size: 100,
      segments: [
        { from: 0, to: 18, owner: "A", label: "A" },
        { from: 18, to: 33, owner: "D", label: "D", state: "new" },
        { from: 33, to: 100, owner: "B", label: "B" },
      ],
      anchors: [],
      points: [
        { id: "12", at: 12, label: "12" },
        { id: "18", at: 18, label: "18", tone: "changed" },
      ],
      walk: null,
      ticks: [0, 18, 33, 99],
    };
    const { container } = render(
      <Shape model={line} rotated={false} size={{ w: 400, h: 64 }} subject="Ranges" />,
    );
    expect(container.querySelectorAll("rect.viz-scale__seg")).toHaveLength(3);
    expect(container.querySelector(".viz-scale__part--new")).toBeTruthy();
    expect(container.querySelector(".viz-scale__point--changed")).toBeTruthy();
    expect([...container.querySelectorAll(".viz-scale__axis")].map((t) => t.textContent)).toEqual([
      "0",
      "18",
      "33",
      "99",
    ]);
  });
});

describe("Table", () => {
  it("draws rows with changed and active states", () => {
    const table: TableModel = {
      kind: "table",
      head: ["key", "node"],
      rows: [
        { cells: ["12", "A"] },
        { cells: ["79", "D"], tone: "changed" },
      ],
      active: 1,
    };
    const { container } = render(
      <Shape model={table} rotated={false} size={{ w: 200, h: 200 }} subject="Directory" />,
    );
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(container.querySelector("tr.is-changed.is-active")?.textContent).toBe("79D");
  });
});
```

Append to `components/visualizer/shapes/CompositeShape.test.tsx` (inside the `describe`):

```tsx
  it("a side composite sits in a row on a wide stage and stacks on a narrow one", () => {
    const circle = {
      kind: "scale" as const,
      layout: "circle" as const,
      size: 100,
      segments: [],
      anchors: [],
      points: [],
      walk: null,
      ticks: [],
    };
    const bins = {
      kind: "bins" as const,
      bins: [{ id: "A", label: "A", items: [] }],
      active: null,
      move: null,
      limit: null,
      meter: null,
      slots: 1,
    };
    const model: CompositeModel = { kind: "composite", layout: "side", parts: [circle, bins] };
    const wide = render(
      <Shape model={model} rotated={false} size={{ w: 800, h: 520 }} subject="Ring" />,
    );
    expect(wide.container.querySelector(".viz-composite--side")).toBeTruthy();
    const widths = [...wide.container.querySelectorAll<HTMLElement>(".viz-composite__part")].map(
      (p) => Number.parseFloat(p.style.width),
    );
    expect(widths).toEqual([360, 440]);
    const narrow = render(
      <Shape model={model} rotated={false} size={{ w: 320, h: 380 }} subject="Ring" />,
    );
    expect(narrow.container.querySelector(".viz-composite--side")).toBeNull();
  });
```

---

### Task 4: Partitioning types, hashing, grammar and workloads

**Files:**
- Create: `lib/visualizer/data-partitioning/types.ts`, `hash.ts`, `keys.ts`, `trace.ts`, `test-helpers.ts`
- Test: `lib/visualizer/data-partitioning/hash.test.ts`, `keys.test.ts`, `trace.test.ts`

**Interfaces:**
- Produces: everything in `types.ts`; `hashKey`, `nodeNumber`, `VNODE_TABLE`, `RingPoint`, `ringPoints`, `clockwiseIndex`, `ringShares`, `rendezvousScore`, `capOf`; `parseKeys`, `toKeyItems`, `parseEventTokens`, `toEvents`, `netChange`, `replay`, `aliveAfter`, `parseEvents`, the error constants; `generateKeys`, `pickRemoval`.

- [ ] **Step 1: types.ts.**

```ts
export const SCHEME_IDS = [
  "mod-n",
  "range",
  "directory",
  "ring",
  "virtual-nodes",
  "bounded-load",
  "rendezvous",
] as const;
export type SchemeId = (typeof SCHEME_IDS)[number];

export const NODE_LETTERS: readonly string[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
export const KEY_SPACE = 100;
export const MAX_KEY = KEY_SPACE - 1;
export const MIN_NODES = 1;
export const MAX_NODES = 6;
export const MAX_EVENTS = 4;
export const MAX_KEYS = 12;
export const HOT_WEIGHT = 5;
export const WORKLOAD_SIZE = 8;
export const DEFAULT_FINAL_NODES = 4;

export const VNODE_OPTIONS = ["1", "2", "4", "8"] as const;
export const CAP_OPTIONS = ["1", "1.25", "1.5", "2"] as const;
export type CapOption = (typeof CAP_OPTIONS)[number];
// Cap factors in quarters keep the cap arithmetic in whole numbers.
export const CAP_QUARTERS: Record<CapOption, number> = { "1": 4, "1.25": 5, "1.5": 6, "2": 8 };

export const WORKLOADS = ["random", "sequential", "hot"] as const;
export type Workload = (typeof WORKLOADS)[number];

export interface KeyItem {
  key: number;
  hot: boolean;
}
export type NodeEvent = { kind: "add" } | { kind: "remove"; node: string };
export interface Settings {
  vnodes: number;
  capQuarters: number;
}
export interface Range {
  lo: number;
  hi: number;
  node: string;
}
export interface World {
  nodes: string[];
  ranges: Range[];
  // Directory only: each node's keys in the order they were assigned to it.
  directory: Record<string, number[]>;
}

export type LookupDetail =
  | { kind: "mod"; hash: number; n: number; index: number }
  | { kind: "range"; range: Range }
  | { kind: "directory" }
  | { kind: "ring"; hash: number; at: number; point: string; skipped: string[] }
  | { kind: "score"; scores: { node: string; score: number }[] };
export interface Lookup {
  node: string;
  detail: LookupDetail;
}
export type Placement = Record<number, Lookup>;

export interface Scheme {
  init(nodes: string[], keys: KeyItem[]): World;
  place(world: World, keys: KeyItem[], settings: Settings): Placement;
  add(world: World, node: string, keys: KeyItem[]): World;
  remove(world: World, node: string, keys: KeyItem[]): World;
  // Bin order on screen: key-space order for ranges, letter order otherwise.
  order(world: World): string[];
}

export interface PartitionInput {
  scheme: SchemeId;
  keys: KeyItem[];
  start: number;
  events: NodeEvent[];
  settings: Settings;
}

export const weightOf = (k: KeyItem): number => (k.hot ? HOT_WEIGHT : 1);
export const keyToken = (k: KeyItem): string => `${k.key}${k.hot ? "*" : ""}`;
export const startNodes = (n: number): string[] => NODE_LETTERS.slice(0, n);
```

- [ ] **Step 2: hash.ts.**

```ts
import { KEY_SPACE, NODE_LETTERS } from "./types";

export const hashKey = (key: number): number => (37 * key + 11) % KEY_SPACE;

export function nodeNumber(node: string): number {
  const i = NODE_LETTERS.indexOf(node);
  if (i < 0) throw new Error(`Unknown node ${node}`);
  return i + 1;
}

// Curated so every node's share evens out at each step of 1 → 2 → 4 → 8 for 2 to 7 nodes; position 0 is the node's own hash.
export const VNODE_TABLE: Readonly<Record<string, readonly number[]>> = {
  A: [48, 88, 1, 45, 94, 35, 73, 13],
  B: [85, 90, 20, 62, 76, 38, 56, 32],
  C: [22, 11, 47, 80, 63, 31, 98, 37],
  D: [59, 87, 26, 97, 52, 82, 68, 4],
  E: [96, 66, 8, 34, 16, 71, 21, 86],
  F: [33, 12, 65, 28, 55, 41, 74, 51],
  G: [70, 0, 42, 39, 46, 19, 25, 29],
  H: [7, 58, 91, 10, 17, 79, 43, 3],
  I: [44, 18, 49, 72, 84, 77, 5, 53],
  J: [81, 40, 99, 69, 75, 78, 92, 54],
};

export interface RingPoint {
  at: number;
  node: string;
  replica: number;
}

export function ringPoints(nodes: string[], vnodes: number): RingPoint[] {
  return nodes
    .flatMap((node) =>
      (VNODE_TABLE[node] ?? []).slice(0, vnodes).map((at, replica) => ({ at, node, replica })),
    )
    .sort((a, b) => a.at - b.at);
}

// First point at or after x, wrapping past the top of the ring.
export function clockwiseIndex(points: RingPoint[], x: number): number {
  const i = points.findIndex((p) => p.at >= x);
  return i < 0 ? 0 : i;
}

// Each node's share of the ring in positions out of 100; a lone point owns all of it.
export function ringShares(nodes: string[], vnodes: number): Record<string, number> {
  const points = ringPoints(nodes, vnodes);
  const out: Record<string, number> = Object.fromEntries(nodes.map((n) => [n, 0]));
  points.forEach((p, j) => {
    const prev = points[(j - 1 + points.length) % points.length];
    if (!prev) return;
    const arc = points.length === 1 ? KEY_SPACE : (p.at - prev.at + KEY_SPACE) % KEY_SPACE;
    out[p.node] = (out[p.node] ?? 0) + arc;
  });
  return out;
}

export function rendezvousScore(key: number, node: string): number {
  const i = nodeNumber(node);
  return (hashKey(key) * (2 * i + 1) + 7 * i) % KEY_SPACE;
}

export const capOf = (keys: number, nodes: number, capQuarters: number): number =>
  Math.ceil((capQuarters * keys) / (4 * Math.max(1, nodes)));
```

- [ ] **Step 3: keys.ts.**

```ts
import type { InputValues, SequenceParse } from "../core/fields";
import {
  DEFAULT_FINAL_NODES,
  type KeyItem,
  MAX_EVENTS,
  MAX_KEY,
  MAX_KEYS,
  MAX_NODES,
  MIN_NODES,
  NODE_LETTERS,
  type NodeEvent,
} from "./types";

export const KEYS_ERROR_NUMBER = `Keys must be whole numbers from 0 to ${MAX_KEY}`;
export const KEYS_ERROR_REPEAT = "Each key can appear once";
export const KEYS_ERROR_COUNT = `Use 1 to ${MAX_KEYS} keys`;
export const KEYS_ERROR_HOT = "Only one key can be hot (*)";
export const EVENTS_ERROR_TOKEN = "Events are + or −X (X a node letter)";
export const EVENTS_ERROR_COUNT = `At most ${MAX_EVENTS} events`;
export const EVENTS_ERROR_RANGE = `Node count must stay between ${MIN_NODES} and ${MAX_NODES}`;
export const eventsErrorMissing = (node: string): string =>
  `Can't remove ${node}: it isn't there at that point`;

const split = (raw: string): string[] => raw.split(/[\s,_]+/).filter((p) => p !== "");

// Dots are not separators, so "2.5" fails instead of becoming two keys.
export function parseKeys(raw: string): SequenceParse {
  const parts = split(raw);
  if (parts.length === 0 || parts.length > MAX_KEYS) return { ok: false, error: KEYS_ERROR_COUNT };
  const seen = new Set<number>();
  let hot = 0;
  const tokens: string[] = [];
  for (const p of parts) {
    const m = /^(\d+)(\*?)$/.exec(p);
    const n = m ? Number(m[1]) : Number.NaN;
    if (!m || !(n <= MAX_KEY)) return { ok: false, error: KEYS_ERROR_NUMBER };
    if (seen.has(n)) return { ok: false, error: KEYS_ERROR_REPEAT };
    seen.add(n);
    if (m[2] === "*") hot += 1;
    tokens.push(`${n}${m[2] ?? ""}`);
  }
  if (hot > 1) return { ok: false, error: KEYS_ERROR_HOT };
  return { ok: true, tokens };
}

export const toKeyItems = (tokens: string[]): KeyItem[] =>
  tokens.map((t) => ({ key: Number(t.replace("*", "")), hot: t.endsWith("*") }));

// Accepts "-" or the typographic "−" before the letter, in either case.
export function parseEventTokens(raw: string): SequenceParse {
  const parts = split(raw);
  if (parts.length > MAX_EVENTS) return { ok: false, error: EVENTS_ERROR_COUNT };
  const tokens: string[] = [];
  for (const p of parts) {
    if (p === "+") {
      tokens.push("+");
      continue;
    }
    const letter = /^[-−]([a-j])$/i.exec(p)?.[1];
    if (!letter) return { ok: false, error: EVENTS_ERROR_TOKEN };
    tokens.push(`-${letter.toUpperCase()}`);
  }
  return { ok: true, tokens };
}

export const toEvents = (tokens: string[]): NodeEvent[] =>
  tokens.map((t) => (t === "+" ? { kind: "add" } : { kind: "remove", node: t.slice(1) }));

export const netChange = (events: NodeEvent[]): number =>
  events.reduce((n, e) => n + (e.kind === "add" ? 1 : -1), 0);

// Plays the events from the starting count; error is null when every event applies.
export function replay(
  start: number,
  events: NodeEvent[],
): { alive: string[]; error: string | null } {
  if (start < MIN_NODES || start > MAX_NODES) return { alive: [], error: EVENTS_ERROR_RANGE };
  const alive = NODE_LETTERS.slice(0, start);
  let used = start;
  for (const e of events) {
    if (e.kind === "add") {
      const next = NODE_LETTERS[used];
      if (!next) return { alive, error: EVENTS_ERROR_RANGE };
      alive.push(next);
      used += 1;
    } else {
      const i = alive.indexOf(e.node);
      if (i < 0) return { alive, error: eventsErrorMissing(e.node) };
      alive.splice(i, 1);
    }
    if (alive.length < MIN_NODES || alive.length > MAX_NODES) {
      return { alive, error: EVENTS_ERROR_RANGE };
    }
  }
  return { alive, error: null };
}

export const aliveAfter = (start: number, events: NodeEvent[]): string[] =>
  replay(start, events).alive;

// The slider shows the count after the events, so the starting count is derived from it.
export function parseEvents(raw: string, values: InputValues): SequenceParse {
  const parsed = parseEventTokens(raw);
  if (!parsed.ok) return parsed;
  const final = typeof values.nodes === "number" ? values.nodes : DEFAULT_FINAL_NODES;
  const events = toEvents(parsed.tokens);
  const { error } = replay(final - netChange(events), events);
  return error ? { ok: false, error } : parsed;
}
```

- [ ] **Step 4: trace.ts.**

```ts
import { mulberry32 } from "../core/rng";
import { KEY_SPACE, WORKLOAD_SIZE, type Workload } from "./types";

// Keys come back sorted so the sequence reads in key order.
export function generateKeys(workload: Workload, seed: number): string[] {
  const rand = mulberry32(seed);
  if (workload === "sequential") {
    const first = 60 + Math.floor(rand() * 33);
    return Array.from({ length: WORKLOAD_SIZE }, (_, i) => String(first + i));
  }
  const pool = Array.from({ length: KEY_SPACE }, (_, i) => i);
  for (let i = 0; i < WORKLOAD_SIZE; i++) {
    const j = i + Math.floor(rand() * (KEY_SPACE - i));
    const a = pool[i] ?? 0;
    pool[i] = pool[j] ?? 0;
    pool[j] = a;
  }
  const keys = pool.slice(0, WORKLOAD_SIZE).sort((a, b) => a - b);
  const hot = workload === "hot" ? Math.floor(rand() * WORKLOAD_SIZE) : -1;
  return keys.map((k, i) => `${k}${i === hot ? "*" : ""}`);
}

// Seeded per event, so the same seed and history always remove the same node.
export function pickRemoval(alive: string[], seed: number, eventIndex: number): string {
  const rand = mulberry32((seed + 0x9e37 * (eventIndex + 1)) >>> 0);
  const node = alive[Math.floor(rand() * alive.length)];
  if (!node) throw new Error("no node to remove");
  return node;
}
```

- [ ] **Step 5: test-helpers.ts.** (used by Tasks 5–8)

```ts
import { runSteps } from "./engine";
import { SCHEMES } from "./schemes";
import {
  type KeyItem,
  keyToken,
  type NodeEvent,
  type PartitionInput,
  type SchemeId,
  type Settings,
} from "./types";

export const DEFAULT_KEYS = [12, 18, 29, 61, 65, 66, 79, 97];
export const MINI = [12, 18, 29, 61, 65, 66];
export const SETTINGS: Settings = { vnodes: 4, capQuarters: 5 };
export const ADD: NodeEvent = { kind: "add" };
export const remove = (node: string): NodeEvent => ({ kind: "remove", node });

export const items = (keys: number[], hot?: number): KeyItem[] =>
  keys.map((key) => ({ key, hot: key === hot }));

export const input = (
  scheme: SchemeId,
  keys: KeyItem[],
  start: number,
  events: NodeEvent[] = [],
  settings: Settings = SETTINGS,
): PartitionInput => ({ scheme, keys, start, events, settings });

// Owners after a step, per live node in screen order, e.g. "A 29 97 · B 12 65 79".
export function layout(inp: PartitionInput, step?: number): string {
  const steps = runSteps(inp);
  const s = step === undefined ? steps.at(-1) : steps[step];
  if (!s) throw new Error("no such step");
  return SCHEMES[inp.scheme]
    .order(s.world)
    .map((node) => {
      const ks = inp.keys.filter((k) => s.shown[k.key] === node).map(keyToken);
      return `${node} ${ks.join(" ") || "—"}`;
    })
    .join(" · ");
}

// N for place and event steps, S for a key that stays, M for one that moves.
export const outcomes = (inp: PartitionInput): string =>
  runSteps(inp)
    .map((s) => (s.phase !== "recheck" ? "N" : s.moved ? "M" : "S"))
    .join("");
```

- [ ] **Step 6: hash.test.ts.**

```ts
import { describe, expect, it } from "vitest";
import {
  capOf,
  clockwiseIndex,
  hashKey,
  rendezvousScore,
  ringPoints,
  ringShares,
  VNODE_TABLE,
} from "./hash";
import { DEFAULT_KEYS } from "./test-helpers";
import { NODE_LETTERS } from "./types";

describe("hash", () => {
  it("hashes the default keys as the spec lists", () => {
    expect(DEFAULT_KEYS.map(hashKey)).toEqual([55, 77, 84, 68, 16, 53, 34, 0]);
  });

  it("is a bijection on 0–99", () => {
    expect(new Set(Array.from({ length: 100 }, (_, k) => hashKey(k))).size).toBe(100);
  });

  it("puts each node's first position at h(its number) and keeps all 80 positions distinct", () => {
    NODE_LETTERS.forEach((n, i) => expect(VNODE_TABLE[n]?.[0], n).toBe(hashKey(i + 1)));
    expect(new Set(Object.values(VNODE_TABLE).flat()).size).toBe(80);
  });

  it("orders ring points and walks clockwise with wrap", () => {
    const pts = ringPoints(["A", "B", "C"], 1);
    expect(pts.map((p) => `${p.node}${p.at}`)).toEqual(["C22", "A48", "B85"]);
    expect(pts[clockwiseIndex(pts, 90)]?.node).toBe("C");
    expect(pts[clockwiseIndex(pts, 48)]?.node).toBe("A");
    expect(pts[clockwiseIndex(pts, 49)]?.node).toBe("B");
  });

  it("plain-ring shares for A B C are 26 / 37 / 37 and one point owns everything", () => {
    expect(ringShares(["A", "B", "C"], 1)).toEqual({ A: 26, B: 37, C: 37 });
    expect(ringShares(["A"], 1)).toEqual({ A: 100 });
    expect(ringShares(["A", "B", "C"], 8)).toEqual({ A: 33, B: 33, C: 34 });
  });

  it("shares even out at every step of 1 → 2 → 4 → 8 for 2 to 7 nodes", () => {
    for (let n = 2; n <= 7; n++) {
      const spreads = [1, 2, 4, 8].map((v) => {
        const s = Object.values(ringShares(NODE_LETTERS.slice(0, n), v));
        return Math.max(...s) - Math.min(...s);
      });
      for (let j = 0; j < 3; j++) expect(spreads[j + 1], `${n} nodes`).toBeLessThan(spreads[j] ?? 0);
    }
  });

  it("scores key 29 against A–D and ties key 79 on A and E", () => {
    expect(["A", "B", "C", "D"].map((n) => rendezvousScore(29, n))).toEqual([59, 34, 9, 84]);
    expect(rendezvousScore(79, "A")).toBe(9);
    expect(rendezvousScore(79, "E")).toBe(9);
  });

  it("computes the cap from keys, nodes and c in quarters", () => {
    expect(capOf(8, 3, 5)).toBe(4);
    expect(capOf(8, 4, 5)).toBe(3);
    expect(capOf(8, 3, 4)).toBe(3);
    expect(capOf(8, 4, 4)).toBe(2);
    expect(capOf(6, 3, 5)).toBe(3);
    expect(capOf(6, 4, 5)).toBe(2);
  });
});
```

Hand-checks: h(12) = 444 + 11 = 455 → 55; h(18) = 677 → 77; h(29) = 1084 → 84; h(61) = 2268 → 68; h(65) = 2416 → 16; h(66) = 2453 → 53; h(79) = 2934 → 34; h(97) = 3600 → 0. Shares A B C: C (85, 22] = 37, A (22, 48] = 26, B (48, 85] = 37. Spreads per n for 1/2/4/8 from the table: 2: 26/22/16/0, 3: 11/10/8/1, 4: 26/19/13/2, 5: 15/14/8/2, 6: 15/13/10/1, 7: 15/13/12/1; 8 positions for 3 nodes give 33/33/34 (cross-checked by the reference simulation). Scores of 29 (h 84): A 84·3 + 7 = 259 → 59; B 84·5 + 14 = 434 → 34; C 84·7 + 21 = 609 → 9; D 84·9 + 28 = 784 → 84. Key 79 (h 34): A 34·3 + 7 = 109 → 9; E 34·11 + 35 = 409 → 9. Caps: ⌈40/12⌉ = 4, ⌈40/16⌉ = 3, ⌈32/12⌉ = 3, ⌈32/16⌉ = 2, ⌈30/12⌉ = 3, ⌈30/16⌉ = 2.

- [ ] **Step 7: keys.test.ts.**

```ts
import { describe, expect, it } from "vitest";
import {
  aliveAfter,
  EVENTS_ERROR_COUNT,
  EVENTS_ERROR_RANGE,
  EVENTS_ERROR_TOKEN,
  eventsErrorMissing,
  KEYS_ERROR_COUNT,
  KEYS_ERROR_HOT,
  KEYS_ERROR_NUMBER,
  KEYS_ERROR_REPEAT,
  parseEvents,
  parseKeys,
  toEvents,
  toKeyItems,
} from "./keys";

describe("keys grammar", () => {
  it("accepts numbers 0–99 with one optional hot key, separated by spaces, commas or underscores", () => {
    expect(parseKeys("12, 18_29* 0 99")).toEqual({
      ok: true,
      tokens: ["12", "18", "29*", "0", "99"],
    });
    expect(toKeyItems(["12", "29*"])).toEqual([
      { key: 12, hot: false },
      { key: 29, hot: true },
    ]);
  });

  it("names each error", () => {
    expect(parseKeys("100")).toEqual({ ok: false, error: KEYS_ERROR_NUMBER });
    expect(parseKeys("2.5")).toEqual({ ok: false, error: KEYS_ERROR_NUMBER });
    expect(parseKeys("-3")).toEqual({ ok: false, error: KEYS_ERROR_NUMBER });
    expect(parseKeys("x")).toEqual({ ok: false, error: KEYS_ERROR_NUMBER });
    expect(parseKeys("12 12")).toEqual({ ok: false, error: KEYS_ERROR_REPEAT });
    expect(parseKeys("1* 2*")).toEqual({ ok: false, error: KEYS_ERROR_HOT });
    expect(parseKeys("")).toEqual({ ok: false, error: KEYS_ERROR_COUNT });
    expect(parseKeys(Array.from({ length: 13 }, (_, i) => i).join(" "))).toEqual({
      ok: false,
      error: KEYS_ERROR_COUNT,
    });
  });
});

describe("events grammar", () => {
  it("accepts + and -X or −X in either case; an empty field means no events", () => {
    expect(parseEvents("+ -b −C", { nodes: 2 })).toEqual({ ok: true, tokens: ["+", "-B", "-C"] });
    expect(parseEvents("", { nodes: 3 })).toEqual({ ok: true, tokens: [] });
    expect(toEvents(["+", "-B"])).toEqual([{ kind: "add" }, { kind: "remove", node: "B" }]);
  });

  it("rejects bad tokens and more than four events", () => {
    expect(parseEvents("x", { nodes: 3 })).toEqual({ ok: false, error: EVENTS_ERROR_TOKEN });
    expect(parseEvents("+B", { nodes: 3 })).toEqual({ ok: false, error: EVENTS_ERROR_TOKEN });
    expect(parseEvents("-K", { nodes: 3 })).toEqual({ ok: false, error: EVENTS_ERROR_TOKEN });
    expect(parseEvents("+ + + + +", { nodes: 6 })).toEqual({ ok: false, error: EVENTS_ERROR_COUNT });
  });

  it("validates against the slider: the start is the slider minus the net change", () => {
    expect(parseEvents("+ -A", { nodes: 6 })).toEqual({ ok: false, error: EVENTS_ERROR_RANGE });
    expect(parseEvents("+", { nodes: 1 })).toEqual({ ok: false, error: EVENTS_ERROR_RANGE });
    expect(parseEvents("-E", { nodes: 2 })).toEqual({ ok: false, error: eventsErrorMissing("E") });
    expect(parseEvents("-B -B", { nodes: 1 })).toEqual({
      ok: false,
      error: eventsErrorMissing("B"),
    });
    expect(parseEvents("-A +", { nodes: 6 })).toEqual({ ok: true, tokens: ["-A", "+"] });
  });

  it("never reuses a letter: a removed node's letter stays retired", () => {
    expect(aliveAfter(3, toEvents(["-B", "+"]))).toEqual(["A", "C", "D"]);
    expect(aliveAfter(1, toEvents(["+", "-A", "+"]))).toEqual(["B", "C"]);
  });
});
```

Hand-checks: "+ -A" at slider 6 → start 6 − 0 = 6 → adding makes 7 → range error. "+" at slider 1 → start 0 → range error. "-E" at slider 2 → start 3 = A B C → E is not there. "-B -B" at slider 1 → start 3 → second removal of B fails. "-A +" at slider 6 → start 6 → 5 → 6 (new letter G) → valid. `aliveAfter(3, -B +)` → A C then D (letter index 3). `aliveAfter(1, + -A +)` → A B → B → B C.

- [ ] **Step 8: trace.test.ts.**

```ts
import { describe, expect, it } from "vitest";
import { parseKeys } from "./keys";
import { generateKeys, pickRemoval } from "./trace";
import { WORKLOADS } from "./types";

describe("workloads", () => {
  it("is deterministic per seed and always valid input", () => {
    for (const w of WORKLOADS) {
      for (const seed of [0, 1, 0x7f3a, 0xffff]) {
        const a = generateKeys(w, seed);
        expect(generateKeys(w, seed), `${w} ${seed}`).toEqual(a);
        expect(a, `${w} ${seed}`).toHaveLength(8);
        expect(parseKeys(a.join(" ")).ok, `${w} ${seed}`).toBe(true);
      }
    }
  });

  it("Random gives 8 distinct sorted keys and no hot key", () => {
    const k = generateKeys("random", 42).map(Number);
    expect([...k].sort((a, b) => a - b)).toEqual(k);
    expect(new Set(k).size).toBe(8);
  });

  it("Sequential gives 8 consecutive keys starting from 60 to 92", () => {
    for (const seed of [0, 9, 1234]) {
      const k = generateKeys("sequential", seed).map(Number);
      const first = k[0] ?? -1;
      expect(first).toBeGreaterThanOrEqual(60);
      expect(first).toBeLessThanOrEqual(92);
      expect(k).toEqual(Array.from({ length: 8 }, (_, i) => first + i));
    }
  });

  it("Hot key marks exactly one key", () => {
    expect(generateKeys("hot", 7).filter((t) => t.endsWith("*"))).toHaveLength(1);
  });

  it("the Remove pick is deterministic, varies by event, and is always alive", () => {
    const alive = ["A", "B", "C", "D"];
    expect(pickRemoval(alive, 5, 0)).toBe(pickRemoval(alive, 5, 0));
    for (let e = 0; e < 4; e++) expect(alive).toContain(pickRemoval(alive, 5, e));
  });
});
```

---

### Task 5: The seven schemes and the engine

**Files:**
- Create: `lib/visualizer/data-partitioning/schemes/{membership,mod-n,range,directory,ring,bounded-load,rendezvous,index}.ts`, `lib/visualizer/data-partitioning/engine.ts`
- Test: `lib/visualizer/data-partitioning/schemes/{mod-n,range,directory,ring,bounded-load,rendezvous}.test.ts`, `lib/visualizer/data-partitioning/engine.test.ts`

**Interfaces:**
- Consumes: Task 4.
- Produces: `SCHEMES: Record<SchemeId, Scheme>`, `equalRanges`, `splitPoint`; `Phase`, `Change`, `Step`, `runSteps(input)`, `stepOfEvent(keys, eventsBefore)`.

- [ ] **Step 1: membership.ts** (shared by the schemes whose world is just the node list)

```ts
import type { Scheme, World } from "../types";

export const membership: Pick<Scheme, "init" | "add" | "remove" | "order"> = {
  init: (nodes: string[]): World => ({ nodes: [...nodes], ranges: [], directory: {} }),
  add: (world: World, node: string): World => ({ ...world, nodes: [...world.nodes, node] }),
  remove: (world: World, node: string): World => ({
    ...world,
    nodes: world.nodes.filter((x) => x !== node),
  }),
  order: (world: World): string[] => world.nodes,
};
```

- [ ] **Step 2: mod-n.ts**

```ts
import { hashKey } from "../hash";
import type { Placement, Scheme } from "../types";
import { membership } from "./membership";

// New letters are always later, so the node list stays in letter order and index = hash mod N.
export const modN: Scheme = {
  ...membership,
  place(world, keys) {
    const out: Placement = {};
    const n = world.nodes.length;
    for (const k of keys) {
      const hash = hashKey(k.key);
      const index = hash % n;
      const node = world.nodes[index];
      if (!node) throw new Error(`no node at index ${index}`);
      out[k.key] = { node, detail: { kind: "mod", hash, n, index } };
    }
    return out;
  },
};
```

- [ ] **Step 3: range.ts**

```ts
import { KEY_SPACE, type Placement, type Range, type Scheme } from "../types";

export function equalRanges(nodes: string[]): Range[] {
  const n = nodes.length;
  return nodes.map((node, j) => ({
    lo: Math.floor((KEY_SPACE * j) / n),
    hi: Math.floor((KEY_SPACE * (j + 1)) / n) - 1,
    node,
  }));
}

// The median key starts the new range; with no usable median the range splits at its midpoint.
export function splitPoint(range: Range, inRange: number[]): number {
  const m = inRange[Math.floor(inRange.length / 2)];
  return m === undefined || m <= range.lo ? Math.floor((range.lo + range.hi) / 2) + 1 : m;
}

export const rangeScheme: Scheme = {
  init: (nodes) => ({ nodes: [...nodes], ranges: equalRanges(nodes), directory: {} }),
  place(world, keys) {
    const out: Placement = {};
    for (const k of keys) {
      const range = world.ranges.find((r) => r.lo <= k.key && k.key <= r.hi);
      if (!range) throw new Error(`no range holds ${k.key}`);
      out[k.key] = { node: range.node, detail: { kind: "range", range } };
    }
    return out;
  },
  add(world, node, keys) {
    const sorted = keys.map((k) => k.key).sort((a, b) => a - b);
    const inside = (r: Range) => sorted.filter((k) => r.lo <= k && k <= r.hi);
    const pick = world.ranges
      .map((r, i) => ({ r, i, count: inside(r).length }))
      .filter((c) => c.r.hi > c.r.lo)
      .sort((a, b) => b.count - a.count || a.i - b.i)[0];
    if (!pick) throw new Error("no range can split");
    const m = splitPoint(pick.r, inside(pick.r));
    const ranges = [...world.ranges];
    ranges.splice(pick.i, 1, { ...pick.r, hi: m - 1 }, { lo: m, hi: pick.r.hi, node });
    return { ...world, nodes: [...world.nodes, node], ranges };
  },
  remove(world, node) {
    const i = world.ranges.findIndex((r) => r.node === node);
    const gone = world.ranges[i];
    if (!gone) throw new Error(`no range for ${node}`);
    const ranges = [...world.ranges];
    const prev = ranges[i - 1];
    const next = ranges[i + 1];
    if (prev) ranges.splice(i - 1, 2, { ...prev, hi: gone.hi });
    else if (next) ranges.splice(i, 2, { ...next, lo: gone.lo });
    else throw new Error("cannot remove the only range");
    return { ...world, nodes: world.nodes.filter((x) => x !== node), ranges };
  },
  order: (world) => world.ranges.map((r) => r.node),
};
```

- [ ] **Step 4: directory.ts**

```ts
import { nodeNumber } from "../hash";
import { type KeyItem, type Placement, type Scheme, weightOf } from "../types";

type Dir = Record<string, number[]>;

const weights = (keys: KeyItem[]): Map<number, number> =>
  new Map(keys.map((k) => [k.key, weightOf(k)]));
const loadOf = (dir: Dir, node: string, w: Map<number, number>): number =>
  (dir[node] ?? []).reduce((s, k) => s + (w.get(k) ?? 1), 0);
const byLetter = (a: string, b: string): number => nodeNumber(a) - nodeNumber(b);
const copy = (dir: Dir): Dir =>
  Object.fromEntries(Object.entries(dir).map(([n, ks]) => [n, [...ks]]));

function leastLoaded(nodes: string[], dir: Dir, w: Map<number, number>): string {
  const pick = [...nodes].sort((a, b) => loadOf(dir, a, w) - loadOf(dir, b, w) || byLetter(a, b))[0];
  if (!pick) throw new Error("no node");
  return pick;
}

export const directoryScheme: Scheme = {
  init(nodes, keys) {
    const w = weights(keys);
    const directory: Dir = Object.fromEntries(nodes.map((n) => [n, []]));
    for (const k of keys) directory[leastLoaded(nodes, directory, w)]?.push(k.key);
    return { nodes: [...nodes], ranges: [], directory };
  },
  place(world) {
    const out: Placement = {};
    for (const [node, ks] of Object.entries(world.directory)) {
      for (const k of ks) out[k] = { node, detail: { kind: "directory" } };
    }
    return out;
  },
  // Moves the most recent entry off the fullest node while that still leaves it at least as loaded as the new one.
  add(world, node, keys) {
    const w = weights(keys);
    const dir = copy(world.directory);
    dir[node] = [];
    let moved = true;
    while (moved) {
      moved = false;
      const fullest = [...world.nodes].sort(
        (a, b) => loadOf(dir, b, w) - loadOf(dir, a, w) || byLetter(a, b),
      );
      for (const f of fullest) {
        const gap = loadOf(dir, f, w) - loadOf(dir, node, w);
        const list = dir[f] ?? [];
        const k = [...list].reverse().find((x) => gap >= 2 * (w.get(x) ?? 1));
        if (k === undefined) continue;
        list.splice(list.indexOf(k), 1);
        dir[node]?.push(k);
        moved = true;
        break;
      }
    }
    return { ...world, nodes: [...world.nodes, node], directory: dir };
  },
  remove(world, node, keys) {
    const w = weights(keys);
    const nodes = world.nodes.filter((x) => x !== node);
    const dir: Dir = Object.fromEntries(
      Object.entries(copy(world.directory)).filter(([n]) => n !== node),
    );
    for (const k of world.directory[node] ?? []) dir[leastLoaded(nodes, dir, w)]?.push(k);
    return { ...world, nodes, directory: dir };
  },
  order: (world) => world.nodes,
};
```

- [ ] **Step 5: ring.ts** (plain ring and virtual nodes)

```ts
import { clockwiseIndex, hashKey, type RingPoint, ringPoints } from "../hash";
import type { Placement, Scheme } from "../types";
import { membership } from "./membership";

export const pointName = (p: RingPoint, positions: number): string =>
  positions > 1 ? `${p.node}·${p.replica}` : p.node;

// The plain ring and virtual nodes differ only in how many positions each node takes.
function ringScheme(positions: (vnodes: number) => number): Scheme {
  return {
    ...membership,
    place(world, keys, settings) {
      const count = positions(settings.vnodes);
      const points = ringPoints(world.nodes, count);
      const out: Placement = {};
      for (const k of keys) {
        const hash = hashKey(k.key);
        const p = points[clockwiseIndex(points, hash)];
        if (!p) throw new Error("empty ring");
        out[k.key] = {
          node: p.node,
          detail: { kind: "ring", hash, at: p.at, point: pointName(p, count), skipped: [] },
        };
      }
      return out;
    },
  };
}

export const plainRing = ringScheme(() => 1);
export const virtualNodes = ringScheme((v) => v);
```

- [ ] **Step 6: bounded-load.ts**

```ts
import { capOf, clockwiseIndex, hashKey, ringPoints } from "../hash";
import type { Placement, Scheme } from "../types";
import { membership } from "./membership";

// Keys go in sequence order, so earlier keys claim their natural node first.
export const boundedLoad: Scheme = {
  ...membership,
  place(world, keys, settings) {
    const cap = capOf(keys.length, world.nodes.length, settings.capQuarters);
    const points = ringPoints(world.nodes, 1);
    const count = new Map<string, number>();
    const out: Placement = {};
    for (const k of keys) {
      const hash = hashKey(k.key);
      const start = clockwiseIndex(points, hash);
      const skipped: string[] = [];
      for (let j = 0; j < points.length; j++) {
        const p = points[(start + j) % points.length];
        if (!p) break;
        const c = count.get(p.node) ?? 0;
        if (c < cap) {
          count.set(p.node, c + 1);
          out[k.key] = {
            node: p.node,
            detail: { kind: "ring", hash, at: p.at, point: p.node, skipped },
          };
          break;
        }
        skipped.push(p.node);
      }
      if (!out[k.key]) throw new Error(`no node under the cap for ${k.key}`);
    }
    return out;
  },
};
```

- [ ] **Step 7: rendezvous.ts**

```ts
import { nodeNumber, rendezvousScore } from "../hash";
import type { Placement, Scheme } from "../types";
import { membership } from "./membership";

export const rendezvous: Scheme = {
  ...membership,
  place(world, keys) {
    const out: Placement = {};
    for (const k of keys) {
      const scores = world.nodes
        .map((node) => ({ node, score: rendezvousScore(k.key, node) }))
        .sort((a, b) => b.score - a.score || nodeNumber(a.node) - nodeNumber(b.node));
      const top = scores[0];
      if (!top) throw new Error("no nodes to score");
      out[k.key] = { node: top.node, detail: { kind: "score", scores } };
    }
    return out;
  },
};
```

- [ ] **Step 8: schemes/index.ts**

```ts
import type { Scheme, SchemeId } from "../types";
import { boundedLoad } from "./bounded-load";
import { directoryScheme } from "./directory";
import { modN } from "./mod-n";
import { rangeScheme } from "./range";
import { rendezvous } from "./rendezvous";
import { plainRing, virtualNodes } from "./ring";

export const SCHEMES: Record<SchemeId, Scheme> = {
  "mod-n": modN,
  range: rangeScheme,
  directory: directoryScheme,
  ring: plainRing,
  "virtual-nodes": virtualNodes,
  "bounded-load": boundedLoad,
  rendezvous,
};
```

- [ ] **Step 9: engine.ts**

```ts
import { SCHEMES } from "./schemes";
import {
  type KeyItem,
  type Lookup,
  NODE_LETTERS,
  type PartitionInput,
  type Placement,
  startNodes,
  type World,
} from "./types";

export type Phase = "place" | "event" | "recheck";
export interface Change {
  kind: "add" | "remove";
  node: string;
}
export interface Step {
  index: number;
  phase: Phase;
  // 0 during the place phase, then 1 for the first event, and so on.
  event: number;
  key: KeyItem | null;
  change: Change | null;
  lookup: Lookup | null;
  before: string | null;
  moved: boolean;
  world: World;
  prevWorld: World | null;
  // Where every key on screen sits once this step is done.
  shown: Record<number, string>;
  bins: string[];
  movedKeys: number[];
  fewest: number | null;
}

const ownerOf = (p: Placement, key: number): Lookup => {
  const l = p[key];
  if (!l) throw new Error(`key ${key} was not placed`);
  return l;
};

export const stepOfEvent = (keys: number, eventsBefore: number): number =>
  keys + eventsBefore * (1 + keys);

export function runSteps(input: PartitionInput): Step[] {
  const scheme = SCHEMES[input.scheme];
  const { keys, settings } = input;
  let world = scheme.init(startNodes(input.start), keys);
  let placed = scheme.place(world, keys, settings);
  const steps: Step[] = [];
  const shown: Record<number, string> = {};
  const push = (s: Omit<Step, "index" | "shown">) => {
    steps.push({ ...s, index: steps.length, shown: { ...shown } });
  };
  for (const k of keys) {
    const lookup = ownerOf(placed, k.key);
    shown[k.key] = lookup.node;
    push({
      phase: "place",
      event: 0,
      key: k,
      change: null,
      lookup,
      before: null,
      moved: false,
      world,
      prevWorld: null,
      bins: scheme.order(world),
      movedKeys: [],
      fewest: null,
    });
  }
  let used = input.start;
  input.events.forEach((ev, e) => {
    const node = ev.kind === "add" ? NODE_LETTERS[used] : ev.node;
    if (ev.kind === "add") used += 1;
    if (!node) throw new Error("no letter left for a new node");
    const change: Change = { kind: ev.kind, node };
    const prevWorld = world;
    const before = placed;
    world = ev.kind === "add" ? scheme.add(world, node, keys) : scheme.remove(world, node, keys);
    placed = scheme.place(world, keys, settings);
    // A removed node keeps its bin for the rest of its event so its keys can be seen leaving.
    const bins = ev.kind === "remove" ? scheme.order(prevWorld) : scheme.order(world);
    const fewest =
      ev.kind === "add"
        ? Math.round(keys.length / world.nodes.length)
        : keys.filter((k) => ownerOf(before, k.key).node === node).length;
    push({
      phase: "event",
      event: e + 1,
      key: null,
      change,
      lookup: null,
      before: null,
      moved: false,
      world,
      prevWorld,
      bins,
      movedKeys: [],
      fewest,
    });
    const movedKeys: number[] = [];
    for (const k of keys) {
      const was = ownerOf(before, k.key).node;
      const lookup = ownerOf(placed, k.key);
      const moved = lookup.node !== was;
      if (moved) movedKeys.push(k.key);
      shown[k.key] = lookup.node;
      push({
        phase: "recheck",
        event: e + 1,
        key: k,
        change,
        lookup,
        before: was,
        moved,
        world,
        prevWorld,
        bins,
        movedKeys: [...movedKeys],
        fewest,
      });
    }
  });
  return steps;
}
```

- [ ] **Step 10: Scheme tests.** All values are hand-checked from the spec's rules; the derivations follow each file.

`schemes/mod-n.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ADD, DEFAULT_KEYS, input, items, layout, remove } from "../test-helpers";

describe("Mod-N", () => {
  it("places the default keys on 3 nodes and moves 6 of 8 when D joins", () => {
    const inp = input("mod-n", items(DEFAULT_KEYS), 3, [ADD]);
    expect(layout(inp, 7)).toBe("A 29 97 · B 12 65 79 · C 18 61 66");
    expect(layout(inp)).toBe("A 29 61 65 97 · B 18 66 · C 79 · D 12");
  });

  it("removing B from four nodes still reshuffles: 5 of 8 move though B held 2", () => {
    const inp = input("mod-n", items(DEFAULT_KEYS), 4, [remove("B")]);
    expect(layout(inp, 7)).toBe("A 29 61 65 97 · B 18 66 · C 79 · D 12");
    expect(layout(inp)).toBe("A 29 97 · C 12 65 79 · D 18 61 66");
  });

  it("one node holds every key", () => {
    expect(layout(input("mod-n", items([3, 50]), 1))).toBe("A 3 50");
  });
});
```

Derivation: hashes 55 77 84 68 16 53 34 0. Mod 3: 1 2 0 2 1 2 1 0 → A 29 97, B 12 65 79, C 18 61 66. Mod 4: 3 1 0 0 0 1 2 0 → A 29 61 65 97, B 18 66, C 79, D 12. After removing B from A B C D the list is A C D; mod 3 indexes 1 2 0 2 1 2 1 0 → C D A D C D C A → A 29 97, C 12 65 79, D 18 61 66.

`schemes/range.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ADD, DEFAULT_KEYS, input, items, layout, remove } from "../test-helpers";
import { equalRanges, rangeScheme, splitPoint } from "./range";

describe("Range", () => {
  it("splits 0–99 equally", () => {
    expect(equalRanges(["A", "B", "C"])).toEqual([
      { lo: 0, hi: 32, node: "A" },
      { lo: 33, hi: 65, node: "B" },
      { lo: 66, hi: 99, node: "C" },
    ]);
    expect(equalRanges(["A", "B", "C", "D", "E", "F"]).map((r) => `${r.lo}-${r.hi}`)).toEqual([
      "0-15",
      "16-32",
      "33-49",
      "50-65",
      "66-82",
      "83-99",
    ]);
  });

  it("Add splits the fullest range (ties: lowest) at its median key, and the new node sits next to it", () => {
    const inp = input("range", items(DEFAULT_KEYS), 3, [ADD]);
    expect(layout(inp, 7)).toBe("A 12 18 29 · B 61 65 · C 66 79 97");
    expect(layout(inp)).toBe("A 12 · D 18 29 · B 61 65 · C 66 79 97");
  });

  it("sequential keys pile into one range, and a split hands half to the new node", () => {
    const seq = items([90, 91, 92, 93, 94, 95, 96, 97]);
    expect(layout(input("range", seq, 3))).toBe("A — · B — · C 90 91 92 93 94 95 96 97");
    expect(layout(input("range", seq, 3, [ADD]))).toBe(
      "A — · B — · C 90 91 92 93 · D 94 95 96 97",
    );
  });

  it("falls back to the midpoint when the median is the range's first value or there are no keys", () => {
    expect(splitPoint({ lo: 0, hi: 49, node: "A" }, [0])).toBe(25);
    expect(splitPoint({ lo: 1, hi: 99, node: "B" }, [])).toBe(51);
    expect(layout(input("range", items([0]), 2, [ADD]))).toBe("A 0 · C — · B —");
  });

  it("skips a one-value range", () => {
    const world = {
      nodes: ["A", "B"],
      ranges: [
        { lo: 0, hi: 0, node: "A" },
        { lo: 1, hi: 99, node: "B" },
      ],
      directory: {},
    };
    expect(rangeScheme.add(world, "C", items([0])).ranges).toEqual([
      { lo: 0, hi: 0, node: "A" },
      { lo: 1, hi: 50, node: "B" },
      { lo: 51, hi: 99, node: "C" },
    ]);
  });

  it("Remove merges into the lower neighbour, or the upper one for the first range", () => {
    expect(layout(input("range", items(DEFAULT_KEYS), 3, [remove("B")]))).toBe(
      "A 12 18 29 61 65 · C 66 79 97",
    );
    expect(layout(input("range", items(DEFAULT_KEYS), 3, [remove("A")]))).toBe(
      "B 12 18 29 61 65 · C 66 79 97",
    );
  });
});
```

Derivation: ranges A 0–32, B 33–65, C 66–99 → A 12 18 29, B 61 65, C 66 79 97; A and C tie at 3 keys, A is lower; A's sorted keys 12 18 29, median index 1 → 18 → A 0–17, D 18–32. Sequential 90–97 all in C; median index 4 → 94 → C 66–93, D 94–99. Keys [0] on 2 nodes: A 0–49 (1 key), median 0 = lo → midpoint ⌊49/2⌋ + 1 = 25 → A 0–24, C 25–49, B 50–99. One-value A skipped; B 1–99 has no keys → ⌊100/2⌋ + 1 = 51. Removing B → A 0–65; removing A → B 0–65.

`schemes/directory.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ADD, DEFAULT_KEYS, input, items, layout, remove } from "../test-helpers";

describe("Directory", () => {
  it("places each key on the least-loaded node (ties: earlier letter)", () => {
    expect(layout(input("directory", items(DEFAULT_KEYS), 3))).toBe(
      "A 12 61 79 · B 18 65 97 · C 29 66",
    );
  });

  it("Add moves only the balancer's picks: 79 and 97", () => {
    expect(layout(input("directory", items(DEFAULT_KEYS), 3, [ADD]))).toBe(
      "A 12 61 · B 18 65 · C 29 66 · D 79 97",
    );
  });

  it("balances by load, so the hot key's node gets one other key and then gives it up", () => {
    const inp = input("directory", items(DEFAULT_KEYS, 61), 3, [ADD]);
    expect(layout(inp, 7)).toBe("A 12 61* · B 18 65 79 · C 29 66 97");
    expect(layout(inp)).toBe("A 61* · B 18 65 · C 29 66 97 · D 12 79");
  });

  it("Remove hands the node's keys, in their assignment order, to the least loaded", () => {
    expect(layout(input("directory", items(DEFAULT_KEYS), 3, [remove("A")]))).toBe(
      "B 18 61 65 97 · C 12 29 66 79",
    );
  });
});
```

Derivation: in order 12→A, 18→B, 29→C, 61→A (all 1, A first), 65→B, 66→C, 79→A (2/2/2), 97→B. Add D: loads A 3, B 3, C 2, D 0 → A first, newest 79 (3 − 0 ≥ 2) moves; then B 3, A 2, C 2, D 1 → B's newest 97 (3 − 1 ≥ 2) moves; then all 2 → nothing moves. Hot 61 (weight 5): 12→A, 18→B, 29→C, 61*→A (A 6), 65→B (2), 66→C (2), 79→B (B and C tie at 2, B first), 97→C. Add D: A 6 first; newest 61* needs 6 − 0 ≥ 10, no; 12 needs ≥ 2, yes → D gets 12. Next A 5: only 61*, 5 − 1 ≥ 10 no; B 3: newest 79, 3 − 1 ≥ 2 → moves. Next A 5 no; C 3: 3 − 2 = 1 no for each; B 2: 2 − 2 no → stop. Remove A (12 61 79 in assignment order): 12 → C (B 3, C 2), 61 → B (B 3, C 3 tie, B first), 79 → C (B 4, C 3); B holds 18 65 97 61 and C holds 29 66 12 79, which read in key order as B 18 61 65 97 and C 12 29 66 79.

`schemes/ring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { runSteps } from "../engine";
import { ADD, DEFAULT_KEYS, input, items, layout, remove } from "../test-helpers";

describe("Ring and virtual nodes", () => {
  it("the plain ring starts lopsided and D takes 12 and 66 from B", () => {
    const inp = input("ring", items(DEFAULT_KEYS), 3, [ADD]);
    expect(layout(inp, 7)).toBe("A 79 · B 12 18 29 61 66 · C 65 97");
    expect(layout(inp)).toBe("A 79 · B 18 29 61 · C 65 97 · D 12 66");
  });

  it("removing B sends all of its keys to one neighbour, C", () => {
    expect(layout(input("ring", items(DEFAULT_KEYS), 3, [remove("B")]))).toBe(
      "A 79 · C 12 18 29 61 65 66 97",
    );
  });

  it("wraps past 99 and a key on a node's position belongs to that node", () => {
    expect(layout(input("ring", items([97, 1]), 3))).toBe("A 1 · B — · C 97");
  });

  it("four virtual nodes end even, and the lookup names the virtual node hit", () => {
    const inp = input("virtual-nodes", items(DEFAULT_KEYS), 3, [ADD]);
    expect(layout(inp, 7)).toBe("A 79 97 · B 12 29 65 66 · C 18 61");
    expect(layout(inp)).toBe("A 79 97 · B 29 65 · C 18 61 · D 12 66");
    const first = runSteps(inp)[0]?.lookup?.detail;
    expect(first).toEqual({ kind: "ring", hash: 55, at: 62, point: "B·3", skipped: [] });
  });

  it("removing B with virtual nodes spreads its keys over A and C", () => {
    expect(layout(input("virtual-nodes", items(DEFAULT_KEYS), 3, [remove("B")]))).toBe(
      "A 29 79 97 · C 12 18 61 65 66",
    );
  });
});
```

Derivation: ring C22 A48 B85: 55 77 84 68 53 → B, 16 0 → C, 34 → A. D59 takes (48, 59]: 55 (12) and 53 (66). Without B: C22 A48: everything past 48 wraps to C; 34 → A. Key 1 has h 48 = A's position → A; 97 has h 0 → C22. Four positions (A 48 88 1 45, B 85 90 20 62, C 22 11 47 80) sorted 1A 11C 20B 22C 45A 47C 48A 62B 80C 85B 88A 90B: 55→62B (B·3), 77→80C, 84→85B, 68→80C, 16→20B, 53→62B, 34→45A, 0→1A. Adding D (59 87 26 97): 55→59D, 53→59D, the rest unchanged. Removing B: 1A 11C 22C 45A 47C 48A 80C 88A: 55→80C, 77→80C, 84→88A, 68→80C, 16→22C, 53→80C, 34→45A, 0→1A.

`schemes/bounded-load.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { runSteps } from "../engine";
import { ADD, DEFAULT_KEYS, input, items, layout } from "../test-helpers";

describe("Bounded-load", () => {
  it("at c = 1.25 the cap of 4 pushes 66 from B on to C, and D later takes it back", () => {
    const inp = input("bounded-load", items(DEFAULT_KEYS), 3, [ADD]);
    expect(layout(inp, 7)).toBe("A 79 · B 12 18 29 61 · C 65 66 97");
    expect(layout(inp)).toBe("A 79 · B 18 29 61 · C 65 97 · D 12 66");
    const s66 = runSteps(inp)[5]?.lookup?.detail;
    expect(s66).toEqual({ kind: "ring", hash: 53, at: 22, point: "C", skipped: ["B"] });
  });

  it("at c = 1.0 the counts are even: 3/3/2 then 2 per node", () => {
    const inp = input("bounded-load", items(DEFAULT_KEYS), 3, [ADD], {
      vnodes: 4,
      capQuarters: 4,
    });
    expect(layout(inp, 7)).toBe("A 79 97 · B 12 18 29 · C 61 65 66");
    expect(layout(inp)).toBe("A 79 97 · B 18 29 · C 61 65 · D 12 66");
  });
});
```

Derivation: cap ⌈1.25 × 8 / 3⌉ = 4: 12 18 29 61 → B (4), 65 → C, 66 natural B full → wraps to C, 79 → A, 97 → C. After D cap 3: 12 → D, 18 29 61 → B, 65 → C, 66 → D, 79 → A, 97 → C. c = 1.0: cap 3: 12 18 29 → B, 61 natural B full → C, 65 → C, 66 → B full → C, 79 → A, 97 → C full (3) → A. After D cap 2: 12 → D, 18 29 → B, 61 → B full → C, 65 → C, 66 → D, 79 → A, 97 → C full → A.

`schemes/rendezvous.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { runSteps } from "../engine";
import { ADD, DEFAULT_KEYS, input, items, layout, remove } from "../test-helpers";

describe("Rendezvous", () => {
  it("the highest score wins and D wins 29 and 97", () => {
    const inp = input("rendezvous", items(DEFAULT_KEYS), 3, [ADD]);
    expect(layout(inp, 7)).toBe("A 29 · B 12 18 65 79 · C 61 66 97");
    expect(layout(inp)).toBe("A — · B 12 18 65 79 · C 61 66 · D 29 97");
    expect(runSteps(inp)[0]?.lookup?.detail).toEqual({
      kind: "score",
      scores: [
        { node: "B", score: 89 },
        { node: "A", score: 72 },
        { node: "C", score: 6 },
      ],
    });
  });

  it("removing B moves only B's keys, split between A and C", () => {
    expect(layout(input("rendezvous", items(DEFAULT_KEYS), 3, [remove("B")]))).toBe(
      "A 12 29 65 · C 18 61 66 79 97",
    );
  });

  it("a tie goes to the earlier letter", () => {
    expect(layout(input("rendezvous", items([79]), 5, [remove("B"), remove("C"), remove("D")]))).toBe(
      "A 79 · E —",
    );
  });
});
```

Derivation: score = (h·(2i + 1) + 7i) mod 100. Key 12 (h 55): A 172 → 72, B 289 → 89, C 406 → 6, D 523 → 23. Key 18 (77): A 38, B 99, C 60, D 21. Key 29 (84): 59, 34, 9, 84. Key 61 (68): 11, 54, 97, 40. Key 65 (16): 55, 94, 33, 72. Key 66 (53): 66, 79, 92, 5. Key 79 (34): 9, 84, 59, 34. Key 97 (0): 7, 14, 21, 28. Three nodes: 12 B, 18 B, 29 A, 61 C, 65 B, 66 C, 79 B, 97 C; D wins only 29 (84 > 59) and 97 (28 > 21). Without B: 12 A (72 > 6), 18 C (60 > 38), 65 A (55 > 33), 79 C (59 > 9). Key 79 with A and E: both 9 → A.

- [ ] **Step 11: Engine test.** `engine.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { runSteps, stepOfEvent } from "./engine";
import { ADD, DEFAULT_KEYS, input, items, outcomes, remove } from "./test-helpers";
import { SCHEME_IDS } from "./types";

describe("engine", () => {
  it("emits K place steps, then per event one event step and K re-checks", () => {
    const steps = runSteps(input("mod-n", items(DEFAULT_KEYS), 3, [ADD]));
    expect(steps).toHaveLength(17);
    expect(steps.map((s) => s.phase).join(",")).toBe(
      `${Array(8).fill("place").join(",")},event,${Array(8).fill("recheck").join(",")}`,
    );
    expect(stepOfEvent(8, 0)).toBe(8);
    expect(stepOfEvent(8, 1)).toBe(17);
  });

  it("marks stays and moves per key: Mod-N moves 6, the ring 2", () => {
    expect(outcomes(input("mod-n", items(DEFAULT_KEYS), 3, [ADD]))).toBe(
      "NNNNNNNNNMMSMMMMS",
    );
    expect(outcomes(input("ring", items(DEFAULT_KEYS), 3, [ADD]))).toBe("NNNNNNNNNMSSSSMSS");
  });

  it("counts moves within the event and the fewest possible", () => {
    const add = runSteps(input("mod-n", items(DEFAULT_KEYS), 3, [ADD]));
    expect(add.at(-1)?.movedKeys).toEqual([12, 18, 61, 65, 66, 79]);
    expect(add[8]?.fewest).toBe(2);
    const rm = runSteps(input("ring", items(DEFAULT_KEYS), 3, [remove("B")]));
    expect(rm[8]?.fewest).toBe(5);
  });

  it("keeps a removed node's bin through its event and never reuses its letter", () => {
    const steps = runSteps(input("ring", items(DEFAULT_KEYS), 3, [remove("B"), ADD]));
    expect(steps).toHaveLength(26);
    expect(steps[8]?.bins).toEqual(["A", "B", "C"]);
    expect(steps[16]?.bins).toEqual(["A", "B", "C"]);
    expect(steps[17]?.bins).toEqual(["A", "C", "D"]);
    expect(steps.at(-1)?.world.nodes).toEqual(["A", "C", "D"]);
  });

  it("every scheme gives the same step count for the same input", () => {
    for (const id of SCHEME_IDS) {
      expect(runSteps(input(id, items(DEFAULT_KEYS), 3, [ADD, remove("A")])), id).toHaveLength(26);
    }
  });

  it("removing down to one node then adding works for every scheme", () => {
    for (const id of SCHEME_IDS) {
      const steps = runSteps(input(id, items([5, 40, 80]), 2, [remove("A"), ADD]));
      expect(steps.at(-1)?.world.nodes, id).toEqual(["B", "C"]);
    }
  });
});
```

Derivation: re-check order 12 18 29 61 65 66 79 97; Mod-N moves all but 29 and 97; ring moves 12 and 66. Fewest: round(8 / 4) = 2; B held 5 on the ring. With −B then +: steps 8 (event) … 16 keep A B C; step 17 is the add event with A C D.

---

### Task 6: The view adapter (state → Bins / Scale / Table / Ranking / Composite)

**Files:**
- Create: `lib/visualizer/data-partitioning/view.ts`
- Test: `lib/visualizer/data-partitioning/view.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 4, 5.
- Produces: `ViewCtx`, `positionsOf(scheme, settings)`, `makeContext(scheme, keys, settings, steps, compact)`, `viewOf(ctx, i)` (`i = -1` is the empty start).

- [ ] **Step 1: view.ts.**

```ts
import type {
  Bin,
  BinMove,
  BinsModel,
  LeafModel,
  PartState,
  RankingModel,
  ScaleModel,
  ShapeModel,
  TableModel,
} from "../core/shapes";
import type { Step } from "./engine";
import { capOf, hashKey, ringPoints, ringShares } from "./hash";
import {
  HOT_WEIGHT,
  KEY_SPACE,
  type KeyItem,
  keyToken,
  type SchemeId,
  type Settings,
  weightOf,
} from "./types";

export interface ViewCtx {
  scheme: SchemeId;
  keys: KeyItem[];
  settings: Settings;
  steps: Step[];
  compact: boolean;
  slots: number;
  meterMax: number | null;
  maxNodes: number;
}

// Ring positions per node for the ring-based schemes; 0 for the others.
export function positionsOf(scheme: SchemeId, settings: Settings): number {
  if (scheme === "virtual-nodes") return settings.vnodes;
  return scheme === "ring" || scheme === "bounded-load" ? 1 : 0;
}

const keysIn = (keys: KeyItem[], shown: Record<number, string>, node: string): KeyItem[] =>
  keys.filter((k) => shown[k.key] === node);
const binLoad = (keys: KeyItem[], shown: Record<number, string>, node: string): number =>
  keysIn(keys, shown, node).reduce((s, k) => s + weightOf(k), 0);

export function makeContext(
  scheme: SchemeId,
  keys: KeyItem[],
  settings: Settings,
  steps: Step[],
  compact: boolean,
): ViewCtx {
  let slots = 1;
  let meterMax = 0;
  let maxNodes = 1;
  for (const s of steps) {
    maxNodes = Math.max(maxNodes, s.bins.length);
    for (const node of s.bins) {
      slots = Math.max(slots, keysIn(keys, s.shown, node).length);
      meterMax = Math.max(meterMax, binLoad(keys, s.shown, node));
    }
  }
  const hot = keys.some((k) => k.hot);
  return { scheme, keys, settings, steps, compact, slots, meterMax: hot ? meterMax : null, maxNodes };
}

const stateOf = (s: Step, node: string): PartState | undefined =>
  s.change?.node === node ? (s.change.kind === "add" ? "new" : "removed") : undefined;

function moveOf(ctx: ViewCtx, s: Step, prev: Step | null): BinMove | null {
  const key = s.key;
  if (s.phase !== "recheck" || !s.moved || !key || !s.before || !s.lookup || !prev) return null;
  const fromSlot = keysIn(ctx.keys, prev.shown, s.before).findIndex((k) => k.key === key.key);
  return { item: String(key.key), from: s.before, to: s.lookup.node, fromSlot: Math.max(0, fromSlot) };
}

function binsOf(ctx: ViewCtx, s: Step, prev: Step | null): BinsModel {
  const positions = positionsOf(ctx.scheme, ctx.settings);
  const shares = positions > 0 && !ctx.compact ? ringShares(s.world.nodes, positions) : null;
  const moved = new Set(s.movedKeys);
  const bins: Bin[] = s.bins.map((node) => {
    const share = shares?.[node];
    const state = stateOf(s, node);
    return {
      id: node,
      label: share === undefined ? node : `${node} ${share}%`,
      items: keysIn(ctx.keys, s.shown, node).map((k) => ({
        id: String(k.key),
        text: k.hot ? `${k.key} ×${HOT_WEIGHT}` : String(k.key),
        ...(moved.has(k.key)
          ? { tone: "changed" as const }
          : k.hot
            ? { tone: "heavy" as const }
            : {}),
      })),
      ...(state ? { state } : {}),
      ...(ctx.meterMax !== null ? { meter: binLoad(ctx.keys, s.shown, node) } : {}),
    };
  });
  const total = ctx.keys.reduce((a, k) => a + weightOf(k), 0);
  return {
    kind: "bins",
    bins,
    active: s.key ? String(s.key.key) : null,
    move: moveOf(ctx, s, prev),
    limit:
      ctx.scheme === "bounded-load"
        ? capOf(ctx.keys.length, s.world.nodes.length, ctx.settings.capQuarters)
        : null,
    meter: ctx.meterMax !== null ? { max: ctx.meterMax, mark: total / s.world.nodes.length } : null,
    slots: ctx.slots,
  };
}

function pointsOf(ctx: ViewCtx, s: Step, at: (k: KeyItem) => number): ScaleModel["points"] {
  const moved = new Set(s.movedKeys);
  return ctx.keys
    .filter((k) => s.shown[k.key] !== undefined)
    .map((k) => ({
      id: String(k.key),
      at: at(k),
      label: String(k.key),
      ...(moved.has(k.key) ? { tone: "changed" as const } : k.hot ? { tone: "heavy" as const } : {}),
      ...(s.key?.key === k.key ? { active: true } : {}),
    }));
}

function rangeScale(ctx: ViewCtx, s: Step): ScaleModel {
  const ranges = s.world.ranges;
  return {
    kind: "scale",
    layout: "line",
    size: KEY_SPACE,
    segments: ranges.map((r) => {
      const state = stateOf(s, r.node);
      return { from: r.lo, to: r.hi + 1, owner: r.node, label: r.node, ...(state ? { state } : {}) };
    }),
    anchors: [],
    points: pointsOf(ctx, s, (k) => k.key),
    walk: null,
    ticks: [0, ...ranges.slice(1).map((r) => r.lo), KEY_SPACE - 1],
  };
}

function ringScale(ctx: ViewCtx, s: Step): ScaleModel {
  const positions = positionsOf(ctx.scheme, ctx.settings);
  const live = ringPoints(s.world.nodes, positions);
  const gone = s.change?.kind === "remove" ? ringPoints([s.change.node], positions) : [];
  const d = s.lookup?.detail;
  return {
    kind: "scale",
    layout: "circle",
    size: KEY_SPACE,
    segments: live.map((p, j) => {
      const prev = live[(j - 1 + live.length) % live.length] ?? p;
      const state = stateOf(s, p.node);
      return { from: prev.at, to: p.at, owner: p.node, label: p.node, ...(state ? { state } : {}) };
    }),
    anchors: [...live, ...gone].map((p) => {
      const state = stateOf(s, p.node);
      return {
        at: p.at,
        label: p.node,
        owner: p.node,
        title: positions > 1 ? `${p.node}·${p.replica} at ${p.at}` : `${p.node} at ${p.at}`,
        ...(state ? { state } : {}),
      };
    }),
    points: pointsOf(ctx, s, (k) => hashKey(k.key)),
    walk: s.key && d?.kind === "ring" ? { from: d.hash, to: d.at } : null,
    ticks: [0],
  };
}

function tableOf(ctx: ViewCtx, s: Step): TableModel {
  const visible = ctx.keys.filter((k) => s.shown[k.key] !== undefined);
  const moved = new Set(s.movedKeys);
  const at = s.key ? visible.findIndex((k) => k.key === s.key?.key) : -1;
  return {
    kind: "table",
    head: ["key", "node"],
    rows: visible.map((k) => ({
      cells: [keyToken(k), s.shown[k.key] ?? ""],
      ...(moved.has(k.key) ? { tone: "changed" as const } : {}),
    })),
    active: at < 0 ? null : at,
  };
}

function rankingOf(ctx: ViewCtx, s: Step): RankingModel {
  const scores = s.lookup?.detail.kind === "score" ? s.lookup.detail.scores : [];
  return {
    kind: "ranking",
    rows: scores.map((x) => ({ key: x.node, count: x.score })),
    capacity: ctx.maxNodes,
    next: null,
    active: scores[0]?.node ?? null,
    tone: scores.length ? "new" : null,
    removed: null,
    suffix: "",
  };
}

export function viewOf(ctx: ViewCtx, i: number): ShapeModel {
  const first = ctx.steps[0];
  if (!first) throw new Error("empty run");
  const s: Step | undefined =
    i < 0 ? { ...first, key: null, lookup: null, shown: {}, movedKeys: [] } : ctx.steps[i];
  if (!s) throw new Error(`no step ${i}`);
  const prev = i > 0 ? (ctx.steps[i - 1] ?? null) : null;
  const bins = binsOf(ctx, s, prev);
  const side = (lead: LeafModel): ShapeModel => ({
    kind: "composite",
    layout: "side",
    parts: [lead, bins],
  });
  switch (ctx.scheme) {
    case "mod-n":
      return bins;
    case "range":
      return { kind: "composite", layout: "stack", parts: [rangeScale(ctx, s), bins] };
    case "directory":
      return side(tableOf(ctx, s));
    case "rendezvous":
      return side(rankingOf(ctx, s));
    default:
      return side(ringScale(ctx, s));
  }
}
```

- [ ] **Step 2: view.test.ts.**

```ts
import { describe, expect, it } from "vitest";
import type { BinsModel, CompositeModel, ShapeModel } from "../core/shapes";
import { runSteps } from "./engine";
import { ADD, DEFAULT_KEYS, input, items, remove } from "./test-helpers";
import { type PartitionInput, SCHEME_IDS } from "./types";
import { makeContext, viewOf } from "./view";

const ctxOf = (inp: PartitionInput, compact = false) =>
  makeContext(inp.scheme, inp.keys, inp.settings, runSteps(inp), compact);
const binsIn = (m: ShapeModel): BinsModel => {
  if (m.kind === "bins") return m;
  if (m.kind === "composite") {
    const b = m.parts.find((p) => p.kind === "bins");
    if (b?.kind === "bins") return b;
  }
  throw new Error("no bins");
};
const lead = (m: ShapeModel) => (m as CompositeModel).parts[0];

describe("view: Mod-N", () => {
  const inp = input("mod-n", items(DEFAULT_KEYS), 3, [ADD]);
  const ctx = ctxOf(inp);

  it("the first re-check flies 12 from B to D, from the top of B", () => {
    const b = binsIn(viewOf(ctx, 9));
    expect(b.bins.map((x) => x.id)).toEqual(["A", "B", "C", "D"]);
    expect(b.bins.find((x) => x.id === "D")?.state).toBe("new");
    expect(b.move).toEqual({ item: "12", from: "B", to: "D", fromSlot: 0 });
    expect(b.bins.find((x) => x.id === "D")?.items).toEqual([
      { id: "12", text: "12", tone: "changed" },
    ]);
    expect(b.bins.find((x) => x.id === "B")?.items.map((x) => x.id)).toEqual(["65", "79"]);
    expect(b.active).toBe("12");
  });

  it("keeps one height for the run: four chips at most in any bin", () => {
    expect(ctx.slots).toBe(4);
    expect(binsIn(viewOf(ctx, 0)).slots).toBe(4);
  });

  it("the empty start has every starting bin and no chips", () => {
    const b = binsIn(viewOf(ctx, -1));
    expect(b.bins.map((x) => `${x.id}:${x.items.length}`)).toEqual(["A:0", "B:0", "C:0"]);
    expect(b.move).toBeNull();
  });
});

describe("view: other schemes", () => {
  it("Range stacks a ruler of bands over bins, and the split's new band is marked", () => {
    const ctx = ctxOf(input("range", items(DEFAULT_KEYS), 3, [ADD]));
    const m = viewOf(ctx, 8);
    expect(m.kind === "composite" && m.layout).toBe("stack");
    const ruler = lead(m);
    expect(ruler?.kind === "scale" && ruler.segments).toEqual([
      { from: 0, to: 18, owner: "A", label: "A" },
      { from: 18, to: 33, owner: "D", label: "D", state: "new" },
      { from: 33, to: 66, owner: "B", label: "B" },
      { from: 66, to: 100, owner: "C", label: "C" },
    ]);
    expect(ruler?.kind === "scale" && ruler.ticks).toEqual([0, 18, 33, 66, 99]);
    expect(binsIn(m).bins.map((b) => b.id)).toEqual(["A", "D", "B", "C"]);
  });

  it("the ring shows anchors, shares in the bin labels, and the walk from the key to its node", () => {
    const ctx = ctxOf(input("ring", items(DEFAULT_KEYS), 3, [ADD]));
    const m = viewOf(ctx, 0);
    const ring = lead(m);
    expect(ring?.kind === "scale" && ring.anchors.map((a) => `${a.label}${a.at}`)).toEqual([
      "C22",
      "A48",
      "B85",
    ]);
    expect(ring?.kind === "scale" && ring.walk).toEqual({ from: 55, to: 85 });
    expect(binsIn(m).bins.map((b) => b.label)).toEqual(["A 26%", "B 37%", "C 37%"]);
  });

  it("a compact ring drops the shares so labels fit a Revision card", () => {
    const ctx = ctxOf(input("ring", items(DEFAULT_KEYS), 3, [ADD]), true);
    expect(binsIn(viewOf(ctx, 0)).bins.map((b) => b.label)).toEqual(["A", "B", "C"]);
  });

  it("a removed node's anchor stays, marked, through its event", () => {
    const ctx = ctxOf(input("ring", items(DEFAULT_KEYS), 3, [remove("B")]));
    const ring = lead(viewOf(ctx, 8));
    expect(ring?.kind === "scale" && ring.anchors.find((a) => a.owner === "B")?.state).toBe(
      "removed",
    );
    expect(binsIn(viewOf(ctx, 8)).bins.find((b) => b.id === "B")?.state).toBe("removed");
  });

  it("Bounded-load draws the cap: 4 while placing, 3 after D joins", () => {
    const ctx = ctxOf(input("bounded-load", items(DEFAULT_KEYS), 3, [ADD]));
    expect(binsIn(viewOf(ctx, 0)).limit).toBe(4);
    expect(binsIn(viewOf(ctx, 9)).limit).toBe(3);
  });

  it("a hot key turns on load meters on one scale with the average marked", () => {
    const ctx = ctxOf(input("directory", items(DEFAULT_KEYS, 61), 3, [ADD]));
    const start = binsIn(viewOf(ctx, 7));
    expect(start.meter).toEqual({ max: 6, mark: 4 });
    expect(start.bins.map((b) => b.meter)).toEqual([6, 3, 3]);
    expect(start.bins[0]?.items.find((x) => x.id === "61")).toEqual({
      id: "61",
      text: "61 ×5",
      tone: "heavy",
    });
    expect(binsIn(viewOf(ctx, 16)).meter?.mark).toBe(3);
  });

  it("Directory's table lists keys placed so far with the current row active", () => {
    const ctx = ctxOf(input("directory", items(DEFAULT_KEYS), 3, [ADD]));
    const t = lead(viewOf(ctx, 1));
    expect(t?.kind === "table" && t.rows).toEqual([
      { cells: ["12", "A"] },
      { cells: ["18", "B"] },
    ]);
    expect(t?.kind === "table" && t.active).toBe(1);
  });

  it("Rendezvous ranks the current key's scores with no suffix", () => {
    const ctx = ctxOf(input("rendezvous", items(DEFAULT_KEYS), 3, [ADD]));
    const r = lead(viewOf(ctx, 0));
    expect(r?.kind === "ranking" && r.rows).toEqual([
      { key: "B", count: 89 },
      { key: "A", count: 72 },
      { key: "C", count: 6 },
    ]);
    expect(r?.kind === "ranking" && r.suffix).toBe("");
    expect(r?.kind === "ranking" && r.capacity).toBe(4);
  });
});

describe("view sweep", () => {
  it("builds a model for every step of every scheme on default, extreme and removal inputs", () => {
    const keys12 = items([0, 7, 15, 22, 33, 41, 48, 59, 66, 77, 85, 99], 41);
    const inputs = (id: (typeof SCHEME_IDS)[number]) => [
      input(id, items(DEFAULT_KEYS), 3, [ADD]),
      input(id, keys12, 6, [remove("A"), remove("B"), ADD, ADD]),
      input(id, items([90, 91, 92, 93, 94, 95, 96, 97]), 2, [remove("A"), ADD, remove("C")]),
    ];
    for (const id of SCHEME_IDS) {
      for (const inp of inputs(id)) {
        const ctx = ctxOf(inp);
        for (let i = -1; i < ctx.steps.length; i++) expect(() => viewOf(ctx, i), `${id} ${i}`).not.toThrow();
      }
    }
  });
});
```

Derivation: Mod-N slots: start 2/3/3; during the re-check A grows to 4 (29 61 65 97) once 65 moves; no bin exceeds 4. Range after split: A 0–17, D 18–32, B 33–65, C 66–99 → segments `to` = hi + 1. Ring shares A 26, B 37, C 37. Bounded caps ⌈40/12⌉ = 4, ⌈40/16⌉ = 3. Hot Directory: total load 5 + 7 = 12; three nodes → mark 4; A 12 + 61* = 6, B 18 65 79 = 3, C 29 66 97 = 3; run-wide max 6; after D joins (step 16 is the last re-check) mark 12 / 4 = 3. Rendezvous key 12 scores B 89, A 72, C 6; four nodes appear in the run → capacity 4. The sweep's extreme input: 6 nodes, remove A and B (4 left), add G and H (6) — legal.

---

### Task 7: Copy and frame assembly

**Files:**
- Create: `lib/visualizer/data-partitioning/copy.ts`, `lib/visualizer/data-partitioning/frames.ts`
- Test: `lib/visualizer/data-partitioning/copy.test.ts`, `lib/visualizer/data-partitioning/frames.test.ts`

**Interfaces:**
- Consumes: Tasks 4–6.
- Produces: `CONSISTENT_HASHING_ARTICLE`, `SHARDING_ARTICLE`, `SchemeMeta`, `SCHEME_META`, `DEFAULT_KEY_TOKENS`; `BuiltRun`, `explainLookup(lookup, key)`, `buildFrames(input, opts?)`.

- [ ] **Step 1: copy.ts.**

```ts
import type { Experiment } from "../core/types";
import type { SchemeId } from "./types";

export const CONSISTENT_HASHING_ARTICLE = "/system-design/algorithms/consistent-hashing/";
export const SHARDING_ARTICLE = "/system-design/algorithms/sharding-strategies/";

export const DEFAULT_KEY_TOKENS = ["12", "18", "29", "61", "65", "66", "79", "97"];
const SEQUENTIAL = ["90", "91", "92", "93", "94", "95", "96", "97"];
const hot = (key: string): string[] => DEFAULT_KEY_TOKENS.map((k) => (k === key ? `${k}*` : k));

export interface SchemeMeta {
  id: SchemeId;
  name: string;
  chip: string;
  rule: string;
  lines: string[];
  paths: { place: number[]; event: number[]; recheck: number[] };
  // A line lit only when the lookup had to skip a full node.
  skipLine?: number;
  about: [string, string][];
  tries: Experiment[];
  article: string;
  anchor: string;
  summary: string;
  glossaryTerm: string;
  differs: string;
}

const RING_PATHS = { place: [0, 1, 2], event: [3], recheck: [0, 1, 2] };

export const SCHEME_META: Record<SchemeId, SchemeMeta> = {
  "mod-n": {
    id: "mod-n",
    name: "Mod-N",
    chip: "Bins",
    rule: "A key goes to node number hash mod N.",
    lines: [
      "Hash the key: h(k) = 37k + 11 mod 100.",
      "Divide by the node count; the remainder picks the node.",
      "After a node change, check every key again with the new count.",
    ],
    paths: { place: [0, 1], event: [2], recheck: [0, 1] },
    about: [
      ["Lookup", "O(1): one hash and one division"],
      ["Wins", "the simplest scheme, and perfectly even on average"],
      ["Loses", "changing N moves about (N − 1)/N of the keys"],
      ["Seen in", "simple client-side cache sharding"],
    ],
    tries: [
      {
        title: "Add one node, most keys move",
        blurb: "Going from 3 to 4 nodes changes the divisor for every key: 6 of 8 move.",
        patch: { keys: DEFAULT_KEY_TOKENS, nodes: 4, events: ["+"] },
      },
      {
        title: "Remove a node, still a reshuffle",
        blurb: "B held only 2 keys, yet 5 of 8 move because every remainder shifts.",
        patch: { keys: DEFAULT_KEY_TOKENS, nodes: 3, events: ["-B"] },
      },
    ],
    article: CONSISTENT_HASHING_ARTICLE,
    anchor: "the-problem---why-modulo-hashing-breaks",
    summary: "Node = hash mod N.",
    glossaryTerm: "modulo hashing",
    differs: "Even and simple, but changing N moves most keys.",
  },
  range: {
    id: "range",
    name: "Range",
    chip: "Ruler + bins",
    rule: "Each node owns a contiguous range of key values.",
    lines: [
      "Find the range that holds the key.",
      "That range's node owns it.",
      "Add splits the fullest range at its middle key; remove merges into a neighbour.",
    ],
    paths: { place: [0, 1], event: [2], recheck: [0, 1] },
    about: [
      ["Lookup", "O(log N): binary search over the range starts"],
      ["Wins", "range scans stay on one node; neighbouring keys stay together"],
      ["Loses", "sequential keys (timestamps, new IDs) pile onto one hot range"],
      ["Seen in", "Bigtable, HBase, CockroachDB"],
    ],
    tries: [
      {
        title: "Sequential keys, one hot range",
        blurb: "Eight new IDs in a row all land in C's range while A and B sit idle.",
        patch: { keys: SEQUENTIAL, nodes: 3, events: [] },
      },
      {
        title: "Split the hot range",
        blurb: "The new node takes the upper half of C's keys: 4 of 8 move.",
        patch: { keys: SEQUENTIAL, nodes: 4, events: ["+"] },
      },
    ],
    article: SHARDING_ARTICLE,
    anchor: "range-sharding",
    summary: "Each node owns a contiguous key range.",
    glossaryTerm: "range partitioning",
    differs: "Range scans stay on one node, but sequential keys pile onto one range.",
  },
  directory: {
    id: "directory",
    name: "Directory",
    chip: "Table + bins",
    rule: "A lookup table records which node holds each key.",
    lines: [
      "Look the key up in the directory.",
      "A new key goes to the least-loaded node.",
      "Add moves recent keys off the fullest nodes until even; remove hands its keys to the least loaded.",
    ],
    paths: { place: [1], event: [2], recheck: [0] },
    about: [
      ["Lookup", "O(1) in the table, plus a network hop to the directory"],
      ["Wins", "moves only what the balancer picks; can give one key its own node"],
      ["Loses", "the directory is an extra hop and a component that must stay up"],
      ["Seen in", "MongoDB's chunk map, Vitess lookup tables"],
    ],
    tries: [
      {
        title: "Add moves only the fair share",
        blurb: "The balancer moves 2 keys to D, the fewest that even the loads.",
        patch: { keys: DEFAULT_KEY_TOKENS, nodes: 4, events: ["+"] },
      },
      {
        title: "Give the hot key its own node",
        blurb: "Balancing by load leaves 61 alone on A once D joins.",
        patch: { keys: hot("61"), nodes: 4, events: ["+"] },
      },
    ],
    article: SHARDING_ARTICLE,
    anchor: "directory-based-lookup-table-sharding",
    summary: "A lookup table maps each key to a node.",
    glossaryTerm: "directory-based sharding",
    differs: "Moves only what the balancer picks, but every lookup adds a hop.",
  },
  ring: {
    id: "ring",
    name: "Ring",
    chip: "Ring + bins",
    rule: "A key belongs to the first node clockwise from its hash.",
    lines: [
      "Hash the key to a point on the ring.",
      "Walk clockwise to the first node.",
      "That node owns the key.",
      "A node change moves only the keys in the arc it gains or loses.",
    ],
    paths: RING_PATHS,
    about: [
      ["Lookup", "O(log N): binary search over the node positions"],
      ["Wins", "a node change moves about 1/N of the keys"],
      ["Loses", "one position per node gives uneven shares"],
      ["Seen in", "Dynamo, Cassandra"],
    ],
    tries: [
      {
        title: "Add takes one arc",
        blurb: "D lands between A and B and takes only the 2 keys in that arc.",
        patch: { keys: DEFAULT_KEY_TOKENS, nodes: 4, events: ["+"] },
      },
      {
        title: "Remove sends everything to one neighbour",
        blurb: "All 5 of B's keys go to C, the next node clockwise.",
        patch: { keys: DEFAULT_KEY_TOKENS, nodes: 2, events: ["-B"] },
      },
    ],
    article: CONSISTENT_HASHING_ARTICLE,
    anchor: "the-ring",
    summary: "Walk clockwise from the key's hash to the first node.",
    glossaryTerm: "consistent hashing",
    differs: "A node change moves about 1/N of keys, but shares are uneven.",
  },
  "virtual-nodes": {
    id: "virtual-nodes",
    name: "Virtual nodes",
    chip: "Ring + bins",
    rule: "Each node takes several ring positions; a key belongs to the first one clockwise.",
    lines: [
      "Hash the key to a point on the ring.",
      "Walk clockwise to the first virtual node.",
      "Its physical node owns the key.",
      "A node change moves the keys in all its small arcs, spread over many nodes.",
    ],
    paths: RING_PATHS,
    about: [
      ["Lookup", "O(log NV): binary search over every virtual position"],
      ["Wins", "shares even out as positions are added"],
      ["Loses", "a bigger position table to store and search"],
      ["Seen in", "Cassandra tokens, Riak"],
      ["Note", "positions come from a fixed table chosen to show the trend; real systems use 100–200 per node"],
    ],
    tries: [
      {
        title: "More positions, even shares",
        blurb: "At 8 virtual nodes the shares are 33/33/34; one position gives 26/37/37.",
        patch: { keys: DEFAULT_KEY_TOKENS, nodes: 3, events: [], vnodes: "8" },
      },
      {
        title: "Remove spreads over the survivors",
        blurb: "B's 4 keys split between A and C instead of all going to one neighbour.",
        patch: { keys: DEFAULT_KEY_TOKENS, nodes: 2, events: ["-B"], vnodes: "4" },
      },
    ],
    article: CONSISTENT_HASHING_ARTICLE,
    anchor: "virtual-nodes",
    summary: "Each node sits at many ring positions.",
    glossaryTerm: "virtual node",
    differs: "Shares even out as positions are added, at the cost of a bigger ring.",
  },
  "bounded-load": {
    id: "bounded-load",
    name: "Bounded-load",
    chip: "Ring + bins",
    rule: "Walk clockwise from the hash and take the first node under the cap.",
    lines: [
      "Hash the key and walk clockwise.",
      "Node already at the cap: keep walking.",
      "The first node under the cap owns the key.",
      "A node change recomputes the cap and places every key again.",
    ],
    paths: RING_PATHS,
    skipLine: 1,
    about: [
      ["Lookup", "O(log N) plus the walk past full nodes"],
      ["Wins", "no node holds more than c × the average number of keys"],
      ["Loses", "some keys leave their natural node; a hot key still lands whole"],
      ["Seen in", "HAProxy's hash balance factor"],
    ],
    tries: [
      {
        title: "c = 1.0 forces even counts",
        blurb: "A cap of 3, then 2: every node ends with the same number of keys.",
        patch: { keys: DEFAULT_KEY_TOKENS, nodes: 4, events: ["+"], cap: "1" },
      },
      {
        title: "The cap can't split a hot key",
        blurb: "B keeps 3 keys, under the cap, but its load is 7 against an average of 3.",
        patch: { keys: hot("29"), nodes: 4, events: ["+"], cap: "1.25" },
      },
    ],
    article: CONSISTENT_HASHING_ARTICLE,
    anchor: "bounded-load-consistent-hashing",
    summary: "A full node passes the key clockwise to the next.",
    glossaryTerm: "bounded-load consistent hashing",
    differs: "Caps keys per node, but some keys leave their natural node.",
  },
  rendezvous: {
    id: "rendezvous",
    name: "Rendezvous",
    chip: "Ranking + bins",
    rule: "Score the key against every node; the highest score wins.",
    lines: [
      "Score the key against every node.",
      "The highest score wins; a tie goes to the earlier letter.",
      "A node change moves only keys whose top score changes hands.",
    ],
    paths: { place: [0, 1], event: [2], recheck: [0, 1] },
    about: [
      ["Lookup", "O(N): one score per node"],
      ["Wins", "moves about 1/N of the keys with no ring and no position table"],
      ["Loses", "every lookup scores every node"],
      ["Seen in", "GitHub's GLB load balancer, Apache Ignite"],
    ],
    tries: [
      {
        title: "Add moves only what the new node wins",
        blurb: "D out-scores the old winner for just 29 and 97.",
        patch: { keys: DEFAULT_KEY_TOKENS, nodes: 4, events: ["+"] },
      },
      {
        title: "Remove spreads the lost node's keys",
        blurb: "Only B's 4 keys move, and they split between A and C.",
        patch: { keys: DEFAULT_KEY_TOKENS, nodes: 2, events: ["-B"] },
      },
    ],
    article: CONSISTENT_HASHING_ARTICLE,
    anchor: "often-confused-with",
    summary: "Score the key against every node; highest wins.",
    glossaryTerm: "rendezvous hashing",
    differs: "Moves about 1/N like the ring, with no ring, but lookup is O(N).",
  },
};
```

- [ ] **Step 2: frames.ts.**

```ts
import { badText, goodText, keyText, type Rich } from "../core/rich";
import type { ShapeModel } from "../core/shapes";
import type { VarRow, VizFrame } from "../core/types";
import { SCHEME_META } from "./copy";
import { runSteps, type Step } from "./engine";
import { capOf, ringPoints, ringShares } from "./hash";
import { keyToken, type Lookup, type PartitionInput, weightOf } from "./types";
import { makeContext, positionsOf, viewOf } from "./view";

export interface BuiltRun {
  frames: VizFrame[];
  // The empty start state, for Revision's reset frame.
  empty: ShapeModel;
}

export function explainLookup(l: Lookup, key: number): string {
  const d = l.detail;
  switch (d.kind) {
    case "mod":
      return `h(${key}) = ${d.hash} → ${d.hash} mod ${d.n} = ${d.index} → ${l.node}`;
    case "range":
      return `${key} in ${d.range.lo}–${d.range.hi} → ${l.node}`;
    case "directory":
      return `directory: ${key} → ${l.node}`;
    case "ring": {
      const via = d.point === l.node ? "" : ` (${d.point})`;
      const skip = d.skipped.length ? `, ${d.skipped.join(", ")} full` : "";
      return `h(${key}) = ${d.hash} → clockwise to ${l.node}${via} at ${d.at}${skip}`;
    }
    case "score":
      return `scores ${d.scores.map((s) => `${s.node} ${s.score}`).join(" · ")} → ${l.node}`;
  }
}

function eventDetail(inp: PartitionInput, s: Step): string {
  const c = s.change;
  const prev = s.prevWorld;
  if (!c || !prev) return "";
  const positions = positionsOf(inp.scheme, inp.settings);
  switch (inp.scheme) {
    case "mod-n":
      return `N is now ${s.world.nodes.length}; every key is checked again`;
    case "range": {
      if (c.kind === "add") {
        const i = s.world.ranges.findIndex((r) => r.node === c.node);
        const r = s.world.ranges[i];
        const src = s.world.ranges[i - 1];
        return r && src ? `${src.node}'s range splits at ${r.lo}: ${c.node} takes ${r.lo}–${r.hi}` : "";
      }
      const gone = prev.ranges.find((r) => r.node === c.node);
      const into = gone && s.world.ranges.find((r) => r.lo <= gone.lo && gone.hi <= r.hi);
      return into ? `${c.node}'s range merges into ${into.node}: ${into.node} now holds ${into.lo}–${into.hi}` : "";
    }
    case "directory": {
      if (c.kind === "remove") return `${c.node}'s keys go to the least-loaded nodes`;
      const moved = s.world.directory[c.node] ?? [];
      return moved.length ? `balancer moves ${moved.join(", ")} to ${c.node}` : "balancer moves nothing";
    }
    case "bounded-load": {
      const cap = capOf(inp.keys.length, s.world.nodes.length, inp.settings.capQuarters);
      return `cap is now ${cap} keys per node`;
    }
    case "rendezvous":
      return c.kind === "add" ? `${c.node} joins the scoring` : `${c.node} leaves the scoring`;
    default:
      return c.kind === "add"
        ? `${c.node} joins at ${ringPoints([c.node], positions)
            .map((p) => p.at)
            .join(", ")}`
        : `${c.node} leaves; its arcs pass clockwise`;
  }
}

function captionOf(inp: PartitionInput, s: Step): Rich {
  if (s.phase === "event" && s.change) {
    return [keyText(`${s.change.kind} ${s.change.node}`), ` — ${eventDetail(inp, s)}`];
  }
  const k = s.key;
  const l = s.lookup;
  if (!k || !l) return [];
  const text = explainLookup(l, k.key);
  if (s.phase === "place") return [keyText(`place ${keyToken(k)}`), ` ${text}`];
  return [
    keyText(`re-check ${keyToken(k)}`),
    ` ${text} · `,
    s.moved ? badText(`moved, was ${s.before}`) : goodText("stays"),
  ];
}

const sharesText = (inp: PartitionInput, s: Step): string => {
  const shares = ringShares(s.world.nodes, positionsOf(inp.scheme, inp.settings));
  return s.world.nodes.map((n) => `${n} ${shares[n] ?? 0}%`).join(" · ");
};

function schemeVars(inp: PartitionInput, s: Step): VarRow[] {
  const d = s.lookup?.detail;
  const hash = d && "hash" in d ? String(d.hash) : "—";
  switch (inp.scheme) {
    case "mod-n":
      return [
        { name: "h(k)", value: hash },
        { name: "N", value: String(s.world.nodes.length) },
        { name: "h(k) mod N", value: d?.kind === "mod" ? String(d.index) : "—" },
      ];
    case "range":
      return [
        { name: "owning range", value: d?.kind === "range" ? `${d.range.lo}–${d.range.hi}` : "—" },
        { name: "ranges", value: s.world.ranges.map((r) => `${r.node} ${r.lo}–${r.hi}`).join(" · ") },
      ];
    case "directory": {
      const loads = s.bins.map((n) => {
        const load = inp.keys.filter((k) => s.shown[k.key] === n).reduce((a, k) => a + weightOf(k), 0);
        return `${n} ${load}`;
      });
      return [
        { name: "directory entry", value: s.key && s.lookup ? `${s.key.key} → ${s.lookup.node}` : "—" },
        { name: "loads", value: loads.join(" · ") },
      ];
    }
    case "rendezvous": {
      const scores = d?.kind === "score" ? d.scores : [];
      return [
        { name: "scores", value: scores.map((x) => `${x.node} ${x.score}`).join(" · ") || "—" },
        { name: "winner", value: scores[0]?.node ?? "—" },
        { name: "runner-up", value: scores[1]?.node ?? "—" },
      ];
    }
    case "bounded-load":
      return [
        { name: "h(k)", value: hash },
        {
          name: "cap",
          value: String(capOf(inp.keys.length, s.world.nodes.length, inp.settings.capQuarters)),
        },
        {
          name: "natural node",
          value: d?.kind === "ring" ? (d.skipped[0] ?? s.lookup?.node ?? "—") : "—",
        },
        { name: "skipped (full)", value: d?.kind === "ring" && d.skipped.length ? d.skipped.join(", ") : "—" },
      ];
    default:
      return [
        { name: "h(k)", value: hash },
        { name: "point hit", value: d?.kind === "ring" ? `${d.point} at ${d.at}` : "—" },
        { name: "shares", value: sharesText(inp, s) },
      ];
  }
}

function varsOf(inp: PartitionInput, s: Step): VarRow[] {
  return [
    { name: "phase", value: s.phase === "recheck" ? "re-check" : s.phase },
    { name: "key", value: s.key ? keyToken(s.key) : "—" },
    { name: "node now", value: s.lookup?.node ?? "—" },
    { name: "node before", value: s.before ?? "—" },
    {
      name: "moved this event",
      value: s.phase === "place" ? "—" : `${s.movedKeys.length}/${inp.keys.length}`,
    },
    { name: "fewest possible", value: s.fewest === null ? "—" : String(s.fewest) },
    ...schemeVars(inp, s),
  ];
}

const labelOf = (s: Step): string =>
  s.phase === "event" && s.change
    ? `${s.change.kind === "add" ? "+" : "−"}${s.change.node}`
    : String(s.key?.key ?? "");

function badgeOf(s: Step): string {
  if (s.phase === "place") return "PLACED";
  if (s.phase === "event") return s.change?.kind === "add" ? "ADDED" : "REMOVED";
  return s.moved ? "MOVED" : "STAYS";
}

function logOf(inp: PartitionInput, s: Step): Rich {
  if (s.phase === "event") return [eventDetail(inp, s)];
  if (s.phase === "place") return [`on ${s.lookup?.node ?? ""}`];
  return s.moved
    ? [badText(`${s.before} → ${s.lookup?.node ?? ""}`)]
    : [goodText(`stays on ${s.lookup?.node ?? ""}`)];
}

export function buildFrames(inp: PartitionInput, opts: { compact?: boolean } = {}): BuiltRun {
  const meta = SCHEME_META[inp.scheme];
  const steps = runSteps(inp);
  const ctx = makeContext(inp.scheme, inp.keys, inp.settings, steps, opts.compact === true);
  const frames = steps.map((s): VizFrame => {
    const skipped = s.lookup?.detail.kind === "ring" && s.lookup.detail.skipped.length > 0;
    const path = meta.paths[s.phase].filter((n) => n !== meta.skipLine || skipped);
    return {
      index: s.index,
      label: labelOf(s),
      outcome: s.phase !== "recheck" ? "neutral" : s.moved ? "bad" : "good",
      badge: badgeOf(s),
      caption: captionOf(inp, s),
      lines: meta.lines.map((l) => [l]),
      path,
      vars: varsOf(inp, s),
      logNote: logOf(inp, s),
      metric: s.phase === "place" ? "—" : `${s.movedKeys.length}/${inp.keys.length}`,
      model: viewOf(ctx, s.index),
    };
  });
  return { frames, empty: viewOf(ctx, -1) };
}
```

- [ ] **Step 3: copy.test.ts.**

```ts
import { describe, expect, it } from "vitest";
import { CONSISTENT_HASHING_ARTICLE, SCHEME_META, SHARDING_ARTICLE } from "./copy";
import { SCHEME_IDS } from "./types";

describe("scheme copy", () => {
  it("has an entry per scheme keyed by its own id, in variant order", () => {
    for (const id of SCHEME_IDS) expect(SCHEME_META[id].id).toBe(id);
    expect(SCHEME_IDS.map((id) => SCHEME_META[id].name)).toEqual([
      "Mod-N",
      "Range",
      "Directory",
      "Ring",
      "Virtual nodes",
      "Bounded-load",
      "Rendezvous",
    ]);
  });

  it("links each scheme to its heading", () => {
    expect(SCHEME_IDS.map((id) => `${SCHEME_META[id].article}#${SCHEME_META[id].anchor}`)).toEqual([
      `${CONSISTENT_HASHING_ARTICLE}#the-problem---why-modulo-hashing-breaks`,
      `${SHARDING_ARTICLE}#range-sharding`,
      `${SHARDING_ARTICLE}#directory-based-lookup-table-sharding`,
      `${CONSISTENT_HASHING_ARTICLE}#the-ring`,
      `${CONSISTENT_HASHING_ARTICLE}#virtual-nodes`,
      `${CONSISTENT_HASHING_ARTICLE}#bounded-load-consistent-hashing`,
      `${CONSISTENT_HASHING_ARTICLE}#often-confused-with`,
    ]);
  });

  it("has 2 to 4 step lines and every path index is a real, non-empty line list", () => {
    for (const id of SCHEME_IDS) {
      const m = SCHEME_META[id];
      expect(m.lines.length, id).toBeGreaterThanOrEqual(2);
      expect(m.lines.length, id).toBeLessThanOrEqual(4);
      for (const path of Object.values(m.paths)) {
        expect(path.length, id).toBeGreaterThan(0);
        expect(path.every((n) => n >= 0 && n < m.lines.length), id).toBe(true);
      }
    }
  });

  it("each scheme has two Try presets patching keys, nodes and events together", () => {
    for (const id of SCHEME_IDS) {
      const tries = SCHEME_META[id].tries;
      expect(tries, id).toHaveLength(2);
      for (const t of tries) {
        expect(Array.isArray(t.patch.keys), `${id} ${t.title}`).toBe(true);
        expect(typeof t.patch.nodes, `${id} ${t.title}`).toBe("number");
        expect(Array.isArray(t.patch.events), `${id} ${t.title}`).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 4: frames.test.ts.**

```ts
import { describe, expect, it } from "vitest";
import { richText } from "../core/rich";
import { buildFrames } from "./frames";
import { ADD, DEFAULT_KEYS, input, items, MINI, remove } from "./test-helpers";

const captions = (inp: Parameters<typeof buildFrames>[0]) =>
  buildFrames(inp).frames.map((f) => richText(f.caption));

describe("frames", () => {
  it("Mod-N captions show the arithmetic with N filled in", () => {
    const c = captions(input("mod-n", items(DEFAULT_KEYS), 3, [ADD]));
    expect(c[0]).toBe("place 12 h(12) = 55 → 55 mod 3 = 1 → B");
    expect(c[8]).toBe("add D — N is now 4; every key is checked again");
    expect(c[9]).toBe("re-check 12 h(12) = 55 → 55 mod 4 = 3 → D · moved, was B");
    expect(c[11]).toBe("re-check 29 h(29) = 84 → 84 mod 4 = 0 → A · stays");
  });

  it("labels, badges, outcomes and the metric", () => {
    const { frames } = buildFrames(input("mod-n", items(DEFAULT_KEYS), 3, [ADD]));
    expect(frames.map((f) => f.label).slice(7, 10)).toEqual(["97", "+D", "12"]);
    expect([frames[0], frames[8], frames[9], frames[11]].map((f) => f?.badge)).toEqual([
      "PLACED",
      "ADDED",
      "MOVED",
      "STAYS",
    ]);
    expect([frames[0], frames[8], frames[9], frames[11]].map((f) => f?.outcome)).toEqual([
      "neutral",
      "neutral",
      "bad",
      "good",
    ]);
    expect([frames[0], frames[8], frames[9], frames.at(-1)].map((f) => f?.metric)).toEqual([
      "—",
      "0/8",
      "1/8",
      "6/8",
    ]);
    const rm = buildFrames(input("ring", items(DEFAULT_KEYS), 3, [remove("B")])).frames;
    expect(rm[8]?.label).toBe("−B");
    expect(rm[8]?.badge).toBe("REMOVED");
  });

  it("each scheme explains its own decision", () => {
    expect(captions(input("range", items(DEFAULT_KEYS), 3, [ADD]))[8]).toBe(
      "add D — A's range splits at 18: D takes 18–32",
    );
    expect(captions(input("range", items(DEFAULT_KEYS), 3, [remove("B")]))[8]).toBe(
      "remove B — B's range merges into A: A now holds 0–65",
    );
    expect(captions(input("directory", items(DEFAULT_KEYS), 3, [ADD]))[8]).toBe(
      "add D — balancer moves 79, 97 to D",
    );
    expect(captions(input("ring", items(DEFAULT_KEYS), 3, [ADD]))[0]).toBe(
      "place 12 h(12) = 55 → clockwise to B at 85",
    );
    expect(captions(input("ring", items(DEFAULT_KEYS), 3, [ADD]))[8]).toBe("add D — D joins at 59");
    expect(captions(input("virtual-nodes", items(DEFAULT_KEYS), 3, [ADD]))[0]).toBe(
      "place 12 h(12) = 55 → clockwise to B (B·3) at 62",
    );
    expect(captions(input("virtual-nodes", items(DEFAULT_KEYS), 3, [ADD]))[8]).toBe(
      "add D — D joins at 26, 59, 87, 97",
    );
    expect(captions(input("bounded-load", items(DEFAULT_KEYS), 3, [ADD]))[5]).toBe(
      "place 66 h(66) = 53 → clockwise to C at 22, B full",
    );
    expect(captions(input("bounded-load", items(DEFAULT_KEYS), 3, [ADD]))[8]).toBe(
      "add D — cap is now 3 keys per node",
    );
    expect(captions(input("rendezvous", items(DEFAULT_KEYS), 3, [ADD]))[0]).toBe(
      "place 12 scores B 89 · A 72 · C 6 → B",
    );
  });

  it("Bounded-load lights the keep-walking line only when a node was skipped", () => {
    const { frames } = buildFrames(input("bounded-load", items(DEFAULT_KEYS), 3, [ADD]));
    expect(frames[0]?.path).toEqual([0, 2]);
    expect(frames[5]?.path).toEqual([0, 1, 2]);
    expect(frames[8]?.path).toEqual([3]);
  });

  it("variables trace the decision", () => {
    const { frames } = buildFrames(input("mod-n", items(DEFAULT_KEYS), 3, [ADD]));
    expect(frames[9]?.vars).toEqual([
      { name: "phase", value: "re-check" },
      { name: "key", value: "12" },
      { name: "node now", value: "D" },
      { name: "node before", value: "B" },
      { name: "moved this event", value: "1/8" },
      { name: "fewest possible", value: "2" },
      { name: "h(k)", value: "55" },
      { name: "N", value: "4" },
      { name: "h(k) mod N", value: "3" },
    ]);
    const ring = buildFrames(input("ring", items(DEFAULT_KEYS), 3, [ADD])).frames;
    expect(ring[0]?.vars.find((v) => v.name === "shares")?.value).toBe("A 26% · B 37% · C 37%");
  });

  it("the empty start has no chips and the mini-run plays 13 steps", () => {
    const run = buildFrames(input("mod-n", items(MINI), 3, [ADD]), { compact: true });
    expect(run.frames).toHaveLength(13);
    expect(run.empty.kind).toBe("bins");
  });
});
```

Derivation: Range split as in Task 5; removing B merges B 33–65 into A 0–32 → A 0–65. Directory's new node holds 79 and 97 after the balancer. Virtual nodes D's four positions are 59 87 26 97, listed in ring order: 26, 59, 87, 97. Bounded step 5 is key 66 (index 5 in 12 18 29 61 65 66 …): natural B full. Bounded first key 12 skips nothing → path [0, 2].

---

### Task 8: Revision, the module, registration, glossary and routes

**Files:**
- Create: `lib/visualizer/data-partitioning/revision.ts`, `lib/visualizer/data-partitioning/module.ts`
- Modify: `lib/visualizer/registry.ts`, `lib/visualizer/modules.ts`, `data/glossary.json`, `app/visualizer.test.tsx`, `components/visualizer/frame/VisualizerApp.test.tsx`
- Test: `lib/visualizer/data-partitioning/revision.test.ts`, `lib/visualizer/data-partitioning/module.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 4–7.
- Produces: `MINI_KEYS`, `MINI_SETTINGS`, `partitionRevision()`; `PARTITION_SECTIONS`, `Resolved`, `resolve(values)`, `partitionModule`.

- [ ] **Step 1: revision.ts.**

```ts
import { richText } from "../core/rich";
import type { RevisionCard } from "../core/types";
import { SCHEME_META } from "./copy";
import { buildFrames } from "./frames";
import { SCHEME_IDS, type Settings } from "./types";

export const MINI_KEYS = [12, 18, 29, 61, 65, 66];
export const MINI_START = 3;
export const MINI_SETTINGS: Settings = { vnodes: 4, capQuarters: 5 };

export function partitionRevision(): RevisionCard[] {
  return SCHEME_IDS.map((id) => {
    const meta = SCHEME_META[id];
    const run = buildFrames(
      {
        scheme: id,
        keys: MINI_KEYS.map((key) => ({ key, hot: false })),
        start: MINI_START,
        events: [{ kind: "add" }],
        settings: MINI_SETTINGS,
      },
      { compact: true },
    );
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
      // Numbered so two steps that read alike stay distinct for screen readers.
      stepsText: run.frames.map((f, i) => `Step ${i + 1}: ${richText(f.caption)}`),
      summary: meta.summary,
      glossaryTerm: meta.glossaryTerm,
      differs: meta.differs,
    };
  });
}
```

- [ ] **Step 2: module.ts.**

```ts
import {
  type ActionResult,
  clampInt,
  type FieldAvailability,
  type FieldSection,
  type InputValues,
  SEED_MAX,
} from "../core/fields";
import { randomSeed } from "../core/rng";
import type { InfoContent, RunResult, VisualizerModule } from "../core/types";
import { DEFAULT_KEY_TOKENS, SCHEME_META } from "./copy";
import { stepOfEvent } from "./engine";
import { buildFrames } from "./frames";
import { capOf } from "./hash";
import { aliveAfter, netChange, parseEvents, parseKeys, toEvents, toKeyItems } from "./keys";
import { partitionRevision } from "./revision";
import { generateKeys, pickRemoval } from "./trace";
import {
  CAP_OPTIONS,
  CAP_QUARTERS,
  DEFAULT_FINAL_NODES,
  MAX_EVENTS,
  MAX_KEYS,
  MAX_NODES,
  MIN_NODES,
  type PartitionInput,
  SCHEME_IDS,
  type SchemeId,
  VNODE_OPTIONS,
  WORKLOADS,
  type Workload,
} from "./types";

const WORKLOAD_LABELS: Record<Workload, string> = {
  random: "Random",
  sequential: "Sequential",
  hot: "Hot key",
};

// Chosen for learning: Mod-N moves exactly 6 of 8 and the ring exactly 2 of 8 when D joins, the ring starts lopsided and Bounded-load overflows.
const DEFAULTS = {
  scheme: "mod-n",
  nodes: DEFAULT_FINAL_NODES,
  events: ["+"],
  vnodes: "4",
  cap: "1.25",
  workload: "random",
  keys: DEFAULT_KEY_TOKENS,
} as const;

const num = (x: unknown, fallback: number): number =>
  typeof x === "number" && Number.isFinite(x) ? x : fallback;

export interface Resolved {
  input: PartitionInput;
  final: number;
  seed: number;
  keyTokens: string[];
  eventTokens: string[];
}

export function resolve(v: InputValues): Resolved {
  const scheme: SchemeId = SCHEME_IDS.find((s) => s === v.scheme) ?? "mod-n";
  const final = clampInt(num(v.nodes, DEFAULTS.nodes), MIN_NODES, MAX_NODES);
  const workload = WORKLOADS.find((w) => w === v.workload) ?? "random";
  const seed = clampInt(num(v.seed, 0), 0, SEED_MAX);
  const parsedKeys = Array.isArray(v.keys) ? parseKeys(v.keys.join(" ")) : null;
  const keyTokens = parsedKeys?.ok ? parsedKeys.tokens : generateKeys(workload, seed);
  const parsedEvents = Array.isArray(v.events)
    ? parseEvents(v.events.join(" "), { nodes: final })
    : null;
  const eventTokens = parsedEvents?.ok ? parsedEvents.tokens : [];
  const events = toEvents(eventTokens);
  const vnodes = Number(VNODE_OPTIONS.find((o) => o === v.vnodes) ?? DEFAULTS.vnodes);
  const cap = CAP_OPTIONS.find((o) => o === v.cap) ?? DEFAULTS.cap;
  return {
    input: {
      scheme,
      keys: toKeyItems(keyTokens),
      start: final - netChange(events),
      events,
      settings: { vnodes, capQuarters: CAP_QUARTERS[cap] },
    },
    final,
    seed,
    keyTokens,
    eventTokens,
  };
}

const atLimit = (r: Resolved): boolean => r.eventTokens.length >= MAX_EVENTS;

// Keys are pinned so a generated set survives the rebuild, and playback jumps to the new event.
function addNode(values: InputValues): ActionResult {
  const r = resolve(values);
  if (atLimit(r) || r.final >= MAX_NODES) return { values };
  return {
    values: { ...values, nodes: r.final + 1, events: [...r.eventTokens, "+"], keys: r.keyTokens },
    step: stepOfEvent(r.input.keys.length, r.eventTokens.length),
  };
}

function removeNode(values: InputValues): ActionResult {
  const r = resolve(values);
  if (atLimit(r) || r.final <= MIN_NODES) return { values };
  const node = pickRemoval(aliveAfter(r.input.start, r.input.events), r.seed, r.eventTokens.length);
  return {
    values: {
      ...values,
      nodes: r.final - 1,
      events: [...r.eventTokens, `-${node}`],
      keys: r.keyTokens,
    },
    step: stepOfEvent(r.input.keys.length, r.eventTokens.length),
  };
}

export const PARTITION_SECTIONS: FieldSection[] = [
  {
    title: "Scheme",
    fields: [
      {
        kind: "chips",
        key: "scheme",
        label: "Scheme",
        param: "sc",
        hideLabel: true,
        options: SCHEME_IDS.map((id) => ({ value: id, label: SCHEME_META[id].name })),
      },
    ],
  },
  {
    title: "Nodes",
    fields: [
      { kind: "slider", key: "nodes", label: "Nodes", param: "n", min: MIN_NODES, max: MAX_NODES },
      { kind: "action", key: "add", label: "Add node", apply: addNode },
      { kind: "action", key: "remove", label: "Remove node", apply: removeNode },
      {
        kind: "sequence",
        key: "events",
        label: "Events",
        param: "e",
        maxLen: MAX_EVENTS,
        hint: "+ adds a node, −B removes B · Enter to apply",
        resetBy: ["nodes"],
        resetEmpty: true,
        parse: parseEvents,
        join: "_",
      },
      {
        kind: "chips",
        key: "vnodes",
        label: "Virtual nodes",
        param: "v",
        options: VNODE_OPTIONS.map((o) => ({ value: o, label: o })),
      },
      {
        kind: "chips",
        key: "cap",
        label: "Cap factor c",
        param: "c",
        options: CAP_OPTIONS.map((o) => ({ value: o, label: o })),
      },
    ],
  },
  {
    title: "Keys",
    fields: [
      {
        kind: "chips",
        key: "workload",
        label: "Workload",
        param: "w",
        options: WORKLOADS.map((w) => ({ value: w, label: WORKLOAD_LABELS[w] })),
      },
      {
        kind: "sequence",
        key: "keys",
        label: "Keys",
        param: "k",
        maxLen: MAX_KEYS,
        hint: "Numbers 0–99, * marks the hot key · Enter to apply",
        resetBy: ["workload", "seed"],
        parse: parseKeys,
        join: "_",
      },
    ],
  },
  { title: "", fields: [{ kind: "seed", key: "seed", label: "Seed", param: "s" }] },
];

function availability(values: InputValues): Record<string, FieldAvailability> {
  const r = resolve(values);
  const full = atLimit(r);
  const cap = capOf(r.input.keys.length, r.final, r.input.settings.capQuarters);
  const limitHint = full ? { hint: `At most ${MAX_EVENTS} events` } : {};
  return {
    nodes: { hint: "Add and Remove change this; dragging starts over" },
    add: { disabled: full || r.final >= MAX_NODES, ...limitHint },
    remove: { disabled: full || r.final <= MIN_NODES },
    vnodes: {
      disabled: r.input.scheme !== "virtual-nodes",
      hint: "Positions from a fixed table; real systems use 100–200",
    },
    cap: { disabled: r.input.scheme !== "bounded-load", hint: `cap = ${cap} keys per node` },
  };
}

function infoOf(id: SchemeId): InfoContent {
  const m = SCHEME_META[id];
  return {
    heading: "Scheme",
    name: m.name,
    chip: m.chip,
    rule: m.rule,
    about: m.about,
    tries: m.tries,
    articleHref: `${m.article}#${m.anchor}`,
  };
}

export const partitionModule: VisualizerModule = {
  slug: "data-partitioning",
  title: "Data partitioning",
  subtitle: "Sharding, consistent hashing and rebalancing",
  unit: "step",
  subject: "Nodes",
  variants: { key: "scheme" },
  revision: partitionRevision(),
  sections: PARTITION_SECTIONS,
  defaults: () => ({
    ...DEFAULTS,
    events: [...DEFAULTS.events],
    keys: [...DEFAULTS.keys],
    seed: randomSeed(),
  }),
  availability,
  run(values): RunResult {
    const r = resolve(values);
    const { frames } = buildFrames(r.input);
    return {
      frames,
      info: infoOf(r.input.scheme),
      metricLabel: "Keys moved",
      sequence: r.keyTokens,
      sequences: { keys: r.keyTokens, events: r.eventTokens },
    };
  },
};
```

- [ ] **Step 3: Registration.** `lib/visualizer/modules.ts`: import `partitionModule` from `./data-partitioning/module` and add `[partitionModule.slug]: partitionModule,`. `lib/visualizer/registry.ts`: append

```ts
  {
    slug: "data-partitioning",
    title: "Data partitioning",
    description:
      "Mod-N, range, directory, ring, virtual nodes, bounded-load and rendezvous — add or remove a node and watch which keys move.",
    icon: "🗂️",
  },
```

`app/visualizer.test.tsx`: add `{ slug: "data-partitioning" },` to the `generateStaticParams` expectation, and to the landing test:

```tsx
    expect(html).toMatch(/href="\/visualizer\/data-partitioning\/?"/);
    expect(html).toContain("Data partitioning");
```

- [ ] **Step 4: Glossary.** Open `data/glossary.json`, see how keys are ordered, and add these six entries in the same style (keys lowercase and singular; `consistent hashing` already exists):

```json
  "modulo hashing": "Assigning a key to node number hash(key) mod N; simple and even, but changing N moves almost every key.",
  "range partitioning": "Splitting data so each node owns a contiguous range of key values, which keeps range scans on one node but can create hot ranges.",
  "directory-based sharding": "Partitioning with a lookup table that records which node holds each key, so any key can be moved by updating its entry.",
  "virtual node": "One of several positions a physical node takes on a consistent-hashing ring, used to even out each node's share.",
  "bounded-load consistent hashing": "Consistent hashing with a cap of c times the average load per node; a key whose node is full moves on to the next node clockwise.",
  "rendezvous hashing": "Highest-random-weight hashing: score a key against every node and pick the highest; a node change moves only the keys it wins or held."
```

- [ ] **Step 5: revision.test.ts.**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEME_META } from "./copy";
import { partitionRevision } from "./revision";
import { SCHEME_IDS } from "./types";

describe("data-partitioning revision", () => {
  const cards = partitionRevision();

  it("has one card per scheme in variant order", () => {
    expect(cards.map((c) => c.id)).toEqual([...SCHEME_IDS]);
    expect(cards.map((c) => c.name)).toEqual(SCHEME_IDS.map((id) => SCHEME_META[id].name));
  });

  it("each card plays the 13 steps of the mini-run with unique screen-reader lines", () => {
    for (const c of cards) {
      expect(c.steps, c.id).toBe(13);
      expect(c.stepsText, c.id).toHaveLength(13);
      expect(new Set(c.stepsText).size, c.id).toBe(13);
      expect(c.stepsText[0], c.id).toMatch(/^Step 1: place 12 /);
    }
  });

  it("render(0) is the empty start and render(13) the finished state", () => {
    for (const c of cards) {
      expect(c.render(0).kind, c.id).toBe("shape");
      expect(c.render(13).kind, c.id).toBe("shape");
    }
  });

  it("every glossary term exists", () => {
    const glossary = JSON.parse(readFileSync(join(process.cwd(), "data/glossary.json"), "utf8"));
    for (const c of cards) expect(glossary[c.glossaryTerm ?? ""], c.id).toBeTruthy();
  });

  it("the mini-run shows each scheme's point: Mod-N moves 5 of 6, the ring 2", () => {
    const last = (id: string) => {
      const card = cards.find((c) => c.id === id);
      const v = card?.render(13);
      return v?.kind === "shape" ? v.model : null;
    };
    const items = (m: ReturnType<typeof last>) =>
      m?.kind === "bins"
        ? m.bins.flatMap((b) => b.items)
        : m?.kind === "composite"
          ? m.parts.flatMap((p) => (p.kind === "bins" ? p.bins.flatMap((b) => b.items) : []))
          : [];
    expect(items(last("mod-n")).filter((i) => i.tone === "changed")).toHaveLength(5);
    expect(items(last("ring")).filter((i) => i.tone === "changed")).toHaveLength(2);
    expect(items(last("bounded-load")).filter((i) => i.tone === "changed")).toHaveLength(2);
  });
});
```

Derivation (mini-run keys 12 18 29 61 65 66, hashes 55 77 84 68 16 53): Mod-N 3 → 4: B C A C B C → D B A A A B; 29 stays, 5 move. Ring: B 12 18 29 61 66, C 65 → D takes 55 and 53. Bounded cap 3: 12 18 29 → B, 61 66 → C (B full); cap 2 after D: 12 → D, 18 29 → B, 61 → C (B full), 65 → C, 66 → D → 12 and 66 move.

- [ ] **Step 6: module.test.ts.**

```ts
import { describe, expect, it } from "vitest";
import { allFields, applyChange, type InputValues } from "../core/fields";
import { encodeState, parseState } from "../core/url-state";
import { SCHEME_META } from "./copy";
import { runSteps } from "./engine";
import { PARTITION_SECTIONS, partitionModule, resolve } from "./module";
import { SCHEMES } from "./schemes";
import { keyToken, SCHEME_IDS } from "./types";

const defaults = () => partitionModule.defaults();
const action = (key: string) => {
  const f = allFields(PARTITION_SECTIONS).find((x) => x.key === key);
  if (f?.kind !== "action") throw new Error(`no action ${key}`);
  return f;
};
const finalLayout = (v: InputValues): string => {
  const { input } = resolve(v);
  const s = runSteps(input).at(-1);
  if (!s) throw new Error("empty run");
  return SCHEMES[input.scheme]
    .order(s.world)
    .map((n) => `${n} ${input.keys.filter((k) => s.shown[k.key] === n).map(keyToken).join(" ") || "—"}`)
    .join(" · ");
};

describe("data-partitioning module", () => {
  it("defaults: Mod-N, 3 nodes plus one Add, the hand-picked keys", () => {
    expect(defaults()).toMatchObject({
      scheme: "mod-n",
      nodes: 4,
      events: ["+"],
      vnodes: "4",
      cap: "1.25",
      workload: "random",
      keys: ["12", "18", "29", "61", "65", "66", "79", "97"],
    });
    const r = partitionModule.run(defaults());
    expect(r.frames).toHaveLength(17);
    expect(r.metricLabel).toBe("Keys moved");
    expect(r.frames.at(-1)?.metric).toBe("6/8");
    expect(r.sequences).toEqual({ keys: defaults().keys, events: ["+"] });
  });

  it("declares the scheme chips as variants that keep the step", () => {
    expect(partitionModule.variants).toEqual({ key: "scheme" });
    for (const id of SCHEME_IDS) {
      const r = partitionModule.run({ ...defaults(), scheme: id });
      expect(r.frames, id).toHaveLength(17);
      expect(r.info.articleHref, id).toBe(`${SCHEME_META[id].article}#${SCHEME_META[id].anchor}`);
    }
  });

  it("Add node keeps the keys, moves the slider, extends Events and names the new event's step", () => {
    const r = action("add").apply(defaults());
    expect(r.values).toMatchObject({ nodes: 5, events: ["+", "+"] });
    expect(r.step).toBe(17);
    expect(partitionModule.run(r.values).frames).toHaveLength(26);
    const fromGenerated = action("add").apply({ ...defaults(), keys: null, seed: 3 });
    expect(fromGenerated.values.keys).toEqual(resolve({ ...defaults(), keys: null, seed: 3 }).keyTokens);
  });

  it("Remove node records a seeded pick of a live node", () => {
    const v = { ...defaults(), seed: 0x1234 };
    const r = action("remove").apply(v);
    expect(r.values.nodes).toBe(3);
    const events = r.values.events as string[];
    expect(events[0]).toBe("+");
    expect(["-A", "-B", "-C", "-D"]).toContain(events[1]);
    expect(action("remove").apply(v)).toEqual(r);
    expect(r.step).toBe(17);
  });

  it("Add and Remove stop at their limits", () => {
    const hints = (v: InputValues) => partitionModule.availability?.({ ...defaults(), ...v }) ?? {};
    expect(hints({ nodes: 6, events: [] }).add?.disabled).toBe(true);
    expect(hints({ nodes: 1, events: [] }).remove?.disabled).toBe(true);
    const four = hints({ nodes: 4, events: ["+", "-A", "+", "-B"] });
    expect(four.add?.disabled).toBe(true);
    expect(four.remove?.disabled).toBe(true);
    expect(action("add").apply({ ...defaults(), nodes: 6, events: [] }).step).toBeUndefined();
  });

  it("dims the chips a scheme does not use and states the live cap", () => {
    const h = (scheme: string) => partitionModule.availability?.({ ...defaults(), scheme }) ?? {};
    expect(h("mod-n").vnodes?.disabled).toBe(true);
    expect(h("virtual-nodes").vnodes?.disabled).toBe(false);
    expect(h("bounded-load").cap?.disabled).toBe(false);
    expect(h("bounded-load").cap?.hint).toBe("cap = 3 keys per node");
  });

  it("dragging the slider clears Events to an empty list; workload or seed regenerate keys", () => {
    const v = defaults();
    expect(applyChange(PARTITION_SECTIONS, v, "nodes", 5).events).toEqual([]);
    expect(applyChange(PARTITION_SECTIONS, v, "workload", "hot").keys).toBeNull();
    expect(applyChange(PARTITION_SECTIONS, v, "seed", 7).keys).toBeNull();
    expect(applyChange(PARTITION_SECTIONS, v, "scheme", "ring").keys).toEqual(v.keys);
  });

  it("round-trips keys with a hot key and events through the URL, including no events", () => {
    const v = { ...defaults(), seed: 0x1234, keys: ["12", "61*"], events: ["+", "-B"], nodes: 3 };
    const search = encodeState(PARTITION_SECTIONS, v, { frame: 4, rotated: false });
    expect(search).toContain("k=12_61*");
    const back = parseState(search, PARTITION_SECTIONS, defaults());
    expect(back.values.keys).toEqual(["12", "61*"]);
    expect(back.values.events).toEqual(["+", "-B"]);
    expect(back.view.frame).toBe(4);
    const none = encodeState(PARTITION_SECTIONS, { ...v, events: [] }, { frame: 0, rotated: false });
    expect(parseState(none, PARTITION_SECTIONS, defaults()).values.events).toEqual([]);
  });

  it("junk in the URL falls back instead of throwing", () => {
    const back = parseState("?n=9&e=x_%2B&k=1_1&sc=nope", PARTITION_SECTIONS, defaults());
    expect(back.values.nodes).toBe(6);
    expect(back.values.events).toBeNull();
    expect(back.values.keys).toBeNull();
    expect(back.values.scheme).toBe("mod-n");
    expect(() => partitionModule.run(back.values)).not.toThrow();
    expect(resolve(back.values).eventTokens).toEqual([]);
  });
});

describe("Try presets", () => {
  // Moved away from the defaults first, so each preset proves it sets everything it needs.
  const away: InputValues = {
    ...partitionModule.defaults(),
    nodes: 6,
    events: [],
    keys: ["1", "2", "3"],
    vnodes: "1",
    cap: "2",
  };
  const run = (scheme: string, i: number) => {
    const t = SCHEME_META[scheme as keyof typeof SCHEME_META].tries[i];
    if (!t) throw new Error("no preset");
    const v = { ...away, scheme, ...t.patch };
    return { v, r: partitionModule.run(v) };
  };
  const expected: [string, number, string, string][] = [
    ["mod-n", 0, "A 29 61 65 97 · B 18 66 · C 79 · D 12", "6/8"],
    ["mod-n", 1, "A 29 97 · C 12 65 79 · D 18 61 66", "5/8"],
    ["range", 0, "A — · B — · C 90 91 92 93 94 95 96 97", "—"],
    ["range", 1, "A — · B — · C 90 91 92 93 · D 94 95 96 97", "4/8"],
    ["directory", 0, "A 12 61 · B 18 65 · C 29 66 · D 79 97", "2/8"],
    ["directory", 1, "A 61* · B 18 65 · C 29 66 97 · D 12 79", "2/8"],
    ["ring", 0, "A 79 · B 18 29 61 · C 65 97 · D 12 66", "2/8"],
    ["ring", 1, "A 79 · C 12 18 29 61 65 66 97", "5/8"],
    ["virtual-nodes", 0, "A 61 79 97 · B 12 29 65 66 · C 18", "—"],
    ["virtual-nodes", 1, "A 29 79 97 · C 12 18 61 65 66", "4/8"],
    ["bounded-load", 0, "A 79 97 · B 18 29 · C 61 65 · D 12 66", "2/8"],
    ["bounded-load", 1, "A 79 · B 18 29* 61 · C 65 97 · D 12 66", "2/8"],
    ["rendezvous", 0, "A — · B 12 18 65 79 · C 61 66 · D 29 97", "2/8"],
    ["rendezvous", 1, "A 12 29 65 · C 18 61 66 79 97", "4/8"],
  ];

  for (const [scheme, i, layout, metric] of expected) {
    it(`${scheme} preset ${i + 1}`, () => {
      const { v, r } = run(scheme, i);
      expect(finalLayout(v)).toBe(layout);
      expect(r.frames.at(-1)?.metric).toBe(metric);
    });
  }

  it("eight virtual nodes give 3 nodes shares of 33 / 33 / 34", () => {
    const { r } = run("virtual-nodes", 0);
    expect(r.frames.at(-1)?.vars.find((x) => x.name === "shares")?.value).toBe(
      "A 33% · B 33% · C 34%",
    );
  });

  it("the hot key keeps B at load 7 against an average of 3 under the cap", () => {
    const { r } = run("bounded-load", 1);
    const m = r.frames.at(-1)?.model;
    const bins = m?.kind === "composite" ? m.parts.find((p) => p.kind === "bins") : undefined;
    expect(bins?.kind === "bins" && bins.bins.find((b) => b.id === "B")?.meter).toBe(7);
    expect(bins?.kind === "bins" && bins.meter?.mark).toBe(3);
    expect(bins?.kind === "bins" && bins.limit).toBe(3);
  });
});
```

Derivation for the preset table: each line restates a Task 5 derivation (Mod-N add and remove; Range sequential and split; Directory default and hot; Ring add and remove; Virtual nodes at 8 with no events: A 61 79 97, B 12 29 65 66, C 18, cross-checked by the reference simulation; Virtual nodes remove B at 4; Bounded c = 1.0 and the hot key 29 at c = 1.25 (B 18 + 29* + 61 = 1 + 5 + 1 = 7; total 8 − 1 + 5 = 12 over 4 nodes = 3); Rendezvous add and remove B). Junk URL: `n=9` clamps to 6; `e=x_+` fails the grammar → null; `k=1_1` repeats → null; `sc=nope` is not an option → default kept.

- [ ] **Step 7: App test for the action button.** Append to `components/visualizer/frame/VisualizerApp.test.tsx` inside `describe("VisualizerApp", …)`:

```tsx
  it("an action button rewrites the inputs and plays from the step it names", () => {
    window.history.replaceState(
      null,
      "",
      "/visualizer/data-partitioning/?sc=mod-n&n=4&e=%2B&k=12_18_29_61_65_66_79_97&i=17",
    );
    render(<VisualizerApp slug="data-partitioning" glossary={{}} />);
    expect(screen.getByText("step 17 / 17")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add node" }));
    expect(screen.getByText("step 18 / 26")).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>("Events").value).toBe("+ +");
    expect(screen.getByLabelText<HTMLInputElement>("Keys").value).toBe(
      "12 18 29 61 65 66 79 97",
    );
  });
```

---

### Task 9: Article-anchor content test and the e2e check

**Files:**
- Modify: `tests/content/artifacts.test.ts`, `tests/e2e/test_visualizer.py`

- [ ] **Step 1: Content test.** In `tests/content/artifacts.test.ts` import `SCHEME_META` from `../../lib/visualizer/data-partitioning/copy` and add after the rate-limiting test:

```ts
  it("data-partitioning visualizer deep links resolve to their article headings", () => {
    const manifest = manifestSchema.parse(readJson("manifest.json"));
    for (const meta of Object.values(SCHEME_META)) {
      const article = manifest.articles.find(
        (a) => `/${a.verticalId}/${a.slug.join("/")}/` === meta.article,
      );
      expect(article, meta.article).toBeDefined();
      const ids = new Set(article?.headings.map((h) => h.id));
      expect(ids.has(meta.anchor), `${meta.article}#${meta.anchor}`).toBe(true);
    }
  });
```

- [ ] **Step 2: e2e.** Append to `tests/e2e/test_visualizer.py`:

```python
PART = "/visualizer/data-partitioning/"


def test_data_partitioning_add_node_and_switch_scheme(page, base_url):
    """Mod-N moves 6 of 8 keys when D joins; switching to Ring keeps the step and shows 2 of 8; Add node jumps to the new event."""
    page.emulate_media(reduced_motion="reduce")
    page.goto(f"{base_url}{PART}?sc=mod-n&n=4&e=%2B&k=12_18_29_61_65_66_79_97&i=17")
    expect(page.get_by_role("heading", level=1, name="Data partitioning")).to_be_visible()
    expect(page.locator(".viz-bins")).to_be_visible()
    expect(page.locator(".viz-stage__metric-label")).to_have_text("Keys moved")
    expect(page.locator(".viz-stage__metric-value")).to_have_text("6/8")
    page.get_by_role("button", name="Ring", exact=True).click()
    expect(page.get_by_text("step 17 / 17")).to_be_visible()
    expect(page.locator(".viz-stage__metric-value")).to_have_text("2/8")
    expect(page.locator(".viz-scale")).to_be_visible()
    page.get_by_role("button", name="Add node").click()
    expect(page.get_by_text("step 18 / 26")).to_be_visible()
```

---

### Task 10: Docs — spec deltas, README, backlog, CLAUDE.md

**Files:**
- Modify: `docs/superpowers/specs/2026-10-10-data-partitioning-visualizer-design.md`, `docs/_meta/visualizer/README.md`, `docs/_meta/visualizer/backlog.md`, `CLAUDE.md`

- [ ] **Step 1: Spec.** Apply every bullet of "Spec deltas found while planning" above: fix the Mod-N anchor to `#the-problem---why-modulo-hashing-breaks` in the Article links table; Keys `resetBy: ["workload", "seed"]` in Parameters; add the five extra generic changes to Frame changes; state the side-by-side rule and the bins flex exemption under Views; add the fourth ring-family Step line and the Bounded-load skip line to the Step tab table; note letter-only ring anchors under Views; describe the flight as a transition of the same chip with the head appearing on arrival; title "Data partitioning"; the four new `--viz-*` aliases in Files.

- [ ] **Step 2: README.** In `docs/_meta/visualizer/README.md`:
  - Shape table: add rows

    `| **Bins** | labelled columns of chips; a moved chip slides to its new column along a trail; optional limit line and load meters on one scale with an average mark | data partitioning (nodes and their keys) | buckets, shards, worker queues |`

    `| **Scale** | positions 0 … size − 1 on a line (bands, ticks) or a circle (owner arcs, labelled anchors, points, a clockwise walk) | data partitioning (key ruler for Range, hash ring) | consistent hashing elsewhere, number lines |`

    `| **Table** | two-column rows with an active row and changed rows; scrolls itself, never the page | data partitioning (the directory) | routing tables, lookup tables |`

  - Ranking row: "Used for" becomes `LFU, rendezvous scores (data partitioning)`. Ring row: drop "consistent hashing" from reuse candidates (the hash ring is a Scale).
  - Composite row: add `; side-by-side when the stage is wide (data partitioning)`.
  - Add a sentence under Variants and Revision: `A module may also add action fields (buttons that rewrite inputs and name the step to play from) and steps with a neutral outcome.`

- [ ] **Step 3: Backlog.** Remove the `Data Partitioning` row from `docs/_meta/visualizer/backlog.md`.

- [ ] **Step 4: CLAUDE.md FILE MAP.** In `CLAUDE.md`:
  - `visualizer/shapes/` row: add `BinsShape`, `ScaleShape`, `TableShape` to the shape list.
  - Add a Lib row after rate-limiting:

    `| \`visualizer/data-partitioning/\` | Data-partitioning module: \`schemes/*\` (one per scheme), \`engine\` (place / event / re-check steps), \`view\` (state → Bins / Scale / Table / Ranking / Composite), \`hash\` (hash, virtual-node table, shares, scores, cap), \`keys\` (keys and events grammar), \`frames\`, \`trace\`, \`copy\`, \`revision\` |`

  - CSS row `view-visualizer/`: add `bins`, `scale` to the file list.

---

### Task 11: Verify once, then look at it

- [ ] **Step 1: Static checks and the full unit/content run.**

Run: `cd wiki-fe && pnpm typecheck && pnpm lint && pnpm test:all`
Expected: all three pass. On a failure, find the root cause; if a fixture disagrees with the code, re-derive the value by hand from the spec before changing either.

- [ ] **Step 2: The one e2e test for the new page.**

Run: `cd wiki-fe && pnpm build:e2e && PLAYWRIGHT_BROWSERS_PATH=$HOME/Library/Caches/ms-playwright .venv/bin/python3 -m pytest tests/e2e/test_visualizer.py -k data_partitioning -q --timeout=60`
Expected: 1 passed.

- [ ] **Step 3: Look at it in a real browser.** With the dev server already on `http://localhost:3000/wiki-fe/` (do not start one; ask if it is down), write a throwaway script in the session scratchpad that uses `.venv/bin/python3` with `PLAYWRIGHT_BROWSERS_PATH=$HOME/Library/Caches/ms-playwright` and screenshots to the scratchpad:
  - Single view at 1440 × 900 for each scheme at step 10 (`?sc=<id>&n=4&e=%2B&k=12_18_29_61_65_66_79_97&i=10`), plus one mid-flight frame captured ~300 ms after pressing Next on a moved step.
  - Revision view at 1440 × 900 (`&view=revision`) after the cards have played.
  - 320 × 700 for Mod-N, Range, Directory and Ring.
  - Extreme input at 320 × 700 and 1440 × 900: `?sc=range&n=6&e=-A_-B_%2B_%2B&k=0_7_15_22_33_41*_48_59_66_77_85_99&i=60` and the same on `directory` and `bounded-load`.
  Check each screenshot: no chip, label or arrow outside the stage; captions readable; Revision cards' bins and ring inside 200px; the hot key's meter visible. Fix anything that breaks, then re-run only the affected checks.

## Self-review (done)

- Spec coverage: scope, step model, hashing, every scheme rule, parameters and grammar, defaults, workloads, metric and variables, views, generic layer, frame changes, Revision, module content (lines, About, Try, links), files and testing each map to Tasks 1–10; the browser look is Task 11.
- No placeholders: every code step carries its code; every expected value has its derivation next to it.
- Types: `Step`, `World`, `Lookup`, `ViewCtx`, `BinsModel`, `ScaleModel`, `TableModel`, `ActionField`, `ActionResult` and helper names match across tasks.
- Review Focus: each of the five lines has its test in the named task.
