# Visualizer — Eviction Policies (v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (this repo's CLAUDE.md rules out subagent-driven-development). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/visualizer/` and `/visualizer/eviction-policies/` — a generic, module-driven visualizer app whose first module animates LRU, FIFO, LFU and CLOCK.

**Architecture:** Pure framework-free core (`lib/visualizer/core/`) defines frames, a field schema, URL codec, playback math and shape models. A visualizer is a `VisualizerModule` (fields + defaults + `run(values) → frames`); the eviction module lives in `lib/visualizer/eviction/`. Generic React components (`components/visualizer/{ui,hooks,shapes,frame}/`) render any module; nothing under `components/visualizer/` knows about caches.

**Tech Stack:** Next.js App Router (static export, base path `/wiki-fe/`), React 19, TypeScript strict (`noUncheckedIndexedAccess`), Vitest + Testing Library, Python Playwright e2e, plain CSS on `css/tokens.css`.

**Spec:** `docs/superpowers/specs/2026-10-07-cache-visualizer-design.md`

**Section reference:** `docs/_meta/visualizer/README.md` — principles, rules and decisions every task must respect.

## Global Constraints

- No git steps in this plan; the owner handles all version control.
- No new runtime dependencies (no animation/chart libraries).
- Comments: one line, *why* not *what*, never a ticket ID; no `console.*`.
- No inline styles except computed positions/sizes; static styling is CSS classes.
- CSS: every value from `css/tokens.css`; add a token before repeating a value; BEM-adjacent class names (`viz-block__element--modifier`, state `is-*`); breakpoints only in `css/responsive.css` using existing widths (1024px, 900px, 640px); page must not break at 320px.
- `"use client"` only on components that need browser APIs; route files stay server components.
- `lib/storage/` is the only module that touches `localStorage`.
- Files past ~400 lines get split by sub-concern.
- Policies in v1: LRU, FIFO, LFU, CLOCK only (OPT/ARC not shown). Compare toggle rendered disabled ("Compare — coming soon").
- Cache size 2–8 (default 4); requests 6–24 (default 12); custom sequence ≤40 keys A–Z; seed 0–0xffff, shown as 4-digit hex.
- One request = 2600 ms at 1×; speeds 0.5× / 1× / 2×; autoplay on load, stops at the last request; reduced motion → no autoplay, no transitions.
- Strip: current cell always centred; 15 cells visible desktop, 11 ≤1024px, 7 ≤640px; manual scroll pauses following, resumes after 2000 ms idle.
- Right panel starts collapsed below 1200px viewport width; panel state persists under `wiki-visualizer-panels`.
- Run every command from `wiki-fe/`.

## Review Focus

1. **Backgrounded tab** — browsers throttle intervals, so one tick can see seconds of elapsed time; playback must advance exactly one request per tick, never skip several or overrun the end. (Task 9, usePlayback tests.)
2. **Run shrinks under the current position** — e.g. at request 20 of 24, the user types a 5-key sequence; the frame index must clamp to the new last frame instead of rendering nothing. (Task 9, usePlayback tests.)
3. **Hand-edited / junk URL** — `?p=xyz&c=-5&i=999&s=zz&q=123` must load a valid run (defaults/clamps), never throw. (Task 2 url-state tests + Task 9 clamp test.)
4. **Degenerate sequences** — one key repeated, or fewer distinct keys than capacity: cache never fills, so `next`/victim stay null and every shape still renders. (Tasks 5–6 simulate tests, Task 10 shape tests.)
5. **Space key in the wrong place** — Space while typing in the sequence field, or while a button has focus, must not toggle playback (typing breaks / double toggle). (Task 9, useVizHotkeys tests.)

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/visualizer/core/rich.ts` | Tone-tagged rich text parts, `{placeholder}` fill, plain-text flatten |
| `lib/visualizer/core/fields.ts` | Field schema types, `applyChange`, `parseSequence`, `clampInt`, `SEED_MAX` |
| `lib/visualizer/core/rng.ts` | `mulberry32`, `randomSeed`, `formatSeed` |
| `lib/visualizer/core/url-state.ts` | Schema-driven `encodeState` / `parseState` |
| `lib/visualizer/core/playback.ts` | Timing constants + pure timing math |
| `lib/visualizer/core/shapes.ts` | Shape model types, `defaultAxis`, `resolveAxis`, `modelKeys` |
| `lib/visualizer/core/geometry.ts` | `linearLayout` |
| `lib/visualizer/core/types.ts` | `VizFrame`, `VarRow`, `InfoContent`, `Experiment`, `RunResult`, `VisualizerModule` |
| `lib/visualizer/eviction/types.ts` | Policy/pattern ids, `EvictionInput`, `PolicyDef`, `LinearState` |
| `lib/visualizer/eviction/trace.ts` | `generateTrace` |
| `lib/visualizer/eviction/simulate.ts` | `simulate` — PolicyDef + trace → `VizFrame[]` |
| `lib/visualizer/eviction/policies/{lru,fifo,lfu,clock}.ts` | One policy state machine + its copy each |
| `lib/visualizer/eviction/module.ts` | `evictionModule`, `POLICIES`, fields, `toEvictionInput` |
| `lib/visualizer/registry.ts` | Server-safe list of built visualizers |
| `lib/visualizer/modules.ts` | `slug → VisualizerModule` |
| `lib/storage/visualizer-prefs.ts` (+ `keys.ts`) | Panel collapse persistence |
| `components/visualizer/ui/*` | `ChoiceGroup`, `IconButton`, `Tabs`, `RichText`, `VarsTable` |
| `components/visualizer/hooks/*` | `usePlayback`, `useVizHotkeys`, `useFollowScroll`, `useUrlSync`, `usePanelPrefs`, `useElementSize` |
| `components/visualizer/shapes/*` | `Shape`, `LinearShape`, `HistogramShape`, `RingShape` |
| `components/visualizer/frame/*` | `VisualizerApp`, `VizHeader`, `SidePanel`, `ConfigPanel`, `ConfigFields`, `Stage`, `PlaybackBar`, `TimelineStrip`, `InfoPanel`, `InfoTabs` |
| `app/visualizer/page.tsx`, `app/visualizer/[slug]/page.tsx` | Landing + visualizer routes |
| `app/page.tsx`, `app/sw.ts` | Home card, offline runtime caching |
| `css/tokens.css`, `css/view-visualizer/*.css`, `css/wiki.css`, `css/responsive.css`, `css/view-home.css` | Styles |
| `tests/content/artifacts.test.ts`, `tests/e2e/test_visualizer.py` | Content anchor guard, browser e2e |

Single-file test command used throughout: `pnpm vitest run --project unit <path>`.

---

### Task 1: Core primitives — rich text, field schema, seeded RNG

**Files:**
- Create: `lib/visualizer/core/rich.ts`, `lib/visualizer/core/fields.ts`, `lib/visualizer/core/rng.ts`
- Test: `lib/visualizer/core/rich.test.ts`, `lib/visualizer/core/fields.test.ts`, `lib/visualizer/core/rng.test.ts`

**Interfaces:**
- Produces: `Tone`, `RichPart`, `Rich`, `keyText`, `goodText`, `badText`, `warnText`, `mutedText`, `richText(r): string`, `fill(template, vars): Rich`; `FieldValue`, `InputValues`, `ChipsField`, `SliderField`, `SequenceField`, `SeedField`, `FieldSpec`, `FieldSection`, `SEED_MAX`, `allFields`, `applyChange(sections, values, key, value): InputValues`, `parseSequence(raw, maxLen): string[] | null`, `clampInt(v, min, max)`; `mulberry32(seed): () => number`, `randomSeed(): number`, `formatSeed(seed): string`.

- [ ] **Step 1: Write the failing tests**

`lib/visualizer/core/rich.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { badText, fill, keyText, richText } from "./rich";

describe("rich text", () => {
  it("fill turns placeholders into key-toned parts", () => {
    expect(fill("Remove {victim} now", { victim: "C" })).toEqual([
      "Remove ",
      { text: "C", tone: "key" },
      " now",
    ]);
  });

  it("fill leaves unknown placeholders literal", () => {
    expect(fill("Is {key} in {where}?", { key: "A" })).toEqual([
      "Is ",
      { text: "A", tone: "key" },
      " in ",
      "{where}",
      "?",
    ]);
  });

  it("richText flattens parts to plain text", () => {
    expect(richText([keyText("F"), " ", badText("miss"), " — added"])).toBe("F miss — added");
  });
});
```

`lib/visualizer/core/fields.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { applyChange, clampInt, type FieldSection, parseSequence } from "./fields";

const SECTIONS: FieldSection[] = [
  {
    title: "Input",
    fields: [
      { kind: "slider", key: "capacity", label: "Cache size", param: "c", min: 2, max: 8 },
      {
        kind: "chips",
        key: "pattern",
        label: "Pattern",
        param: "pat",
        options: [
          { value: "hot", label: "Hot set" },
          { value: "scan", label: "Scan" },
        ],
      },
      {
        kind: "sequence",
        key: "sequence",
        label: "Sequence",
        param: "q",
        maxLen: 40,
        hint: "edit keys",
        resetBy: ["pattern"],
      },
    ],
  },
];

describe("fields", () => {
  it("applyChange discards a custom sequence when a resetBy field changes", () => {
    const next = applyChange(SECTIONS, { pattern: "hot", sequence: ["A", "B"] }, "pattern", "scan");
    expect(next).toEqual({ pattern: "scan", sequence: null });
  });

  it("applyChange keeps the custom sequence for other fields", () => {
    const next = applyChange(SECTIONS, { capacity: 4, sequence: ["A"] }, "capacity", 6);
    expect(next).toEqual({ capacity: 6, sequence: ["A"] });
  });

  it("parseSequence uppercases, strips non-letters and caps length", () => {
    expect(parseSequence("a b, c1d", 40)).toEqual(["A", "B", "C", "D"]);
    expect(parseSequence("abcdef", 3)).toEqual(["A", "B", "C"]);
  });

  it("parseSequence returns null when nothing usable is left", () => {
    expect(parseSequence("123 !!", 40)).toBeNull();
  });

  it("clampInt rounds and clamps", () => {
    expect(clampInt(9.6, 2, 8)).toBe(8);
    expect(clampInt(-3, 2, 8)).toBe(2);
    expect(clampInt(4.4, 2, 8)).toBe(4);
  });
});
```

`lib/visualizer/core/rng.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { SEED_MAX } from "./fields";
import { formatSeed, mulberry32, randomSeed } from "./rng";

describe("rng", () => {
  it("is deterministic per seed and stays in [0, 1)", () => {
    const a = mulberry32(0x7f3a);
    const b = mulberry32(0x7f3a);
    const xs = Array.from({ length: 50 }, () => a());
    expect(Array.from({ length: 50 }, () => b())).toEqual(xs);
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("differs between seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it("randomSeed stays within the seed range", () => {
    for (let i = 0; i < 100; i++) {
      const s = randomSeed();
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(SEED_MAX);
    }
  });

  it("formatSeed renders 4-digit lowercase hex", () => {
    expect(formatSeed(0x7f3a)).toBe("7f3a");
    expect(formatSeed(10)).toBe("000a");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run --project unit lib/visualizer/core/rich.test.ts lib/visualizer/core/fields.test.ts lib/visualizer/core/rng.test.ts`
Expected: FAIL — cannot resolve `./rich`, `./fields`, `./rng`.

- [ ] **Step 3: Implement**

`lib/visualizer/core/rich.ts`:
```ts
export type Tone = "key" | "good" | "bad" | "warn" | "muted";
export type RichPart = string | { text: string; tone: Tone };
export type Rich = RichPart[];

export const keyText = (text: string): RichPart => ({ text, tone: "key" });
export const goodText = (text: string): RichPart => ({ text, tone: "good" });
export const badText = (text: string): RichPart => ({ text, tone: "bad" });
export const warnText = (text: string): RichPart => ({ text, tone: "warn" });
export const mutedText = (text: string): RichPart => ({ text, tone: "muted" });

export function richText(value: Rich): string {
  return value.map((p) => (typeof p === "string" ? p : p.text)).join("");
}

export function fill(template: string, vars: Record<string, string>): Rich {
  const out: Rich = [];
  let last = 0;
  for (const m of template.matchAll(/\{(\w+)\}/g)) {
    const at = m.index ?? 0;
    if (at > last) out.push(template.slice(last, at));
    const v = vars[m[1] ?? ""];
    out.push(v === undefined ? m[0] : keyText(v));
    last = at + m[0].length;
  }
  if (last < template.length) out.push(template.slice(last));
  return out;
}
```

`lib/visualizer/core/fields.ts`:
```ts
export type FieldValue = string | number | string[] | null;
export type InputValues = Record<string, FieldValue>;

interface FieldBase {
  key: string;
  label: string;
  param: string;
  hideLabel?: boolean;
}
export interface ChipsField extends FieldBase {
  kind: "chips";
  options: { value: string; label: string }[];
}
export interface SliderField extends FieldBase {
  kind: "slider";
  min: number;
  max: number;
}
export interface SequenceField extends FieldBase {
  kind: "sequence";
  maxLen: number;
  hint: string;
  resetBy: string[];
}
export interface SeedField extends FieldBase {
  kind: "seed";
}
export type FieldSpec = ChipsField | SliderField | SequenceField | SeedField;
export interface FieldSection {
  title: string;
  fields: FieldSpec[];
}

export const SEED_MAX = 0xffff;

export function allFields(sections: FieldSection[]): FieldSpec[] {
  return sections.flatMap((s) => s.fields);
}

export function applyChange(
  sections: FieldSection[],
  values: InputValues,
  key: string,
  value: FieldValue,
): InputValues {
  const next: InputValues = { ...values, [key]: value };
  for (const f of allFields(sections)) {
    if (f.kind === "sequence" && f.resetBy.includes(key)) next[f.key] = null;
  }
  return next;
}

export function parseSequence(raw: string, maxLen: number): string[] | null {
  const keys = raw.toUpperCase().replace(/[^A-Z]/g, "").split("").slice(0, maxLen);
  return keys.length ? keys : null;
}

export function clampInt(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(v)));
}
```

`lib/visualizer/core/rng.ts`:
```ts
import { SEED_MAX } from "./fields";

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randomSeed = (): number => Math.floor(Math.random() * (SEED_MAX + 1));

export const formatSeed = (seed: number): string => seed.toString(16).padStart(4, "0");
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run --project unit lib/visualizer/core/rich.test.ts lib/visualizer/core/fields.test.ts lib/visualizer/core/rng.test.ts`
Expected: PASS (12 tests).

---

### Task 2: Core URL codec

**Files:**
- Create: `lib/visualizer/core/url-state.ts`
- Test: `lib/visualizer/core/url-state.test.ts`

**Interfaces:**
- Consumes: `FieldSection`, `InputValues`, `allFields`, `clampInt`, `parseSequence`, `SEED_MAX` (Task 1).
- Produces: `ViewState { frame: number; rotated: boolean }`, `encodeState(sections, values, view): string` (leading `?`), `parseState(search, sections, defaults): { values: InputValues; view: ViewState }`. URL `i` is the 1-based request number; `rot=1` when rotated.

- [ ] **Step 1: Write the failing test**

`lib/visualizer/core/url-state.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { FieldSection, InputValues } from "./fields";
import { encodeState, parseState } from "./url-state";

const SECTIONS: FieldSection[] = [
  {
    title: "Policy",
    fields: [
      {
        kind: "chips",
        key: "policy",
        label: "Policy",
        param: "p",
        options: [
          { value: "lru", label: "LRU" },
          { value: "fifo", label: "FIFO" },
        ],
      },
    ],
  },
  {
    title: "Input",
    fields: [
      { kind: "slider", key: "capacity", label: "Cache size", param: "c", min: 2, max: 8 },
      {
        kind: "sequence",
        key: "sequence",
        label: "Sequence",
        param: "q",
        maxLen: 40,
        hint: "",
        resetBy: [],
      },
    ],
  },
  { title: "", fields: [{ kind: "seed", key: "seed", label: "Seed", param: "s" }] },
];
const DEFAULTS: InputValues = { policy: "lru", capacity: 4, sequence: null, seed: 1 };

describe("url-state", () => {
  it("round-trips values and view", () => {
    const values: InputValues = { policy: "fifo", capacity: 6, sequence: ["A", "B"], seed: 0x7f3a };
    const search = encodeState(SECTIONS, values, { frame: 7, rotated: true });
    expect(search).toBe("?p=fifo&c=6&q=AB&s=7f3a&i=8&rot=1");
    expect(parseState(search, SECTIONS, DEFAULTS)).toEqual({
      values,
      view: { frame: 7, rotated: true },
    });
  });

  it("omits a null sequence and rotation when off", () => {
    expect(encodeState(SECTIONS, DEFAULTS, { frame: 0, rotated: false })).toBe("?p=lru&c=4&s=1&i=1");
  });

  it("falls back to defaults on junk and clamps numbers", () => {
    const { values, view } = parseState("?p=xyz&c=-5&s=zz&q=123&i=abc&rot=yes", SECTIONS, DEFAULTS);
    expect(values).toEqual({ policy: "lru", capacity: 2, sequence: null, seed: 1 });
    expect(view).toEqual({ frame: 0, rotated: false });
  });

  it("clamps an out-of-range seed and keeps a huge frame for playback to clamp", () => {
    const { values, view } = parseState("?s=fffffff&i=999", SECTIONS, DEFAULTS);
    expect(values.seed).toBe(0xffff);
    expect(view.frame).toBe(998);
  });

  it("empty search returns the defaults untouched", () => {
    expect(parseState("", SECTIONS, DEFAULTS)).toEqual({
      values: DEFAULTS,
      view: { frame: 0, rotated: false },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run --project unit lib/visualizer/core/url-state.test.ts`
Expected: FAIL — cannot resolve `./url-state`.

- [ ] **Step 3: Implement**

`lib/visualizer/core/url-state.ts`:
```ts
import {
  allFields,
  clampInt,
  type FieldSection,
  type InputValues,
  parseSequence,
  SEED_MAX,
} from "./fields";

export interface ViewState {
  frame: number;
  rotated: boolean;
}

export function encodeState(sections: FieldSection[], values: InputValues, view: ViewState): string {
  const q = new URLSearchParams();
  for (const f of allFields(sections)) {
    const v = values[f.key];
    if (v === null || v === undefined) continue;
    if (f.kind === "seed" && typeof v === "number") q.set(f.param, v.toString(16));
    else if (f.kind === "sequence" && Array.isArray(v)) q.set(f.param, v.join(""));
    else q.set(f.param, String(v));
  }
  q.set("i", String(view.frame + 1));
  if (view.rotated) q.set("rot", "1");
  return `?${q.toString()}`;
}

export function parseState(
  search: string,
  sections: FieldSection[],
  defaults: InputValues,
): { values: InputValues; view: ViewState } {
  const q = new URLSearchParams(search);
  const values: InputValues = { ...defaults };
  for (const f of allFields(sections)) {
    const raw = q.get(f.param);
    if (raw === null) continue;
    if (f.kind === "chips") {
      if (f.options.some((o) => o.value === raw)) values[f.key] = raw;
    } else if (f.kind === "slider") {
      const n = Number(raw);
      if (Number.isFinite(n)) values[f.key] = clampInt(n, f.min, f.max);
    } else if (f.kind === "seed") {
      const n = Number.parseInt(raw, 16);
      if (Number.isFinite(n)) values[f.key] = clampInt(n, 0, SEED_MAX);
    } else {
      values[f.key] = parseSequence(raw, f.maxLen);
    }
  }
  const i = Number(q.get("i"));
  return {
    values,
    view: { frame: Number.isFinite(i) && i >= 1 ? Math.floor(i) - 1 : 0, rotated: q.get("rot") === "1" },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run --project unit lib/visualizer/core/url-state.test.ts`
Expected: PASS (5 tests).

---

### Task 3: Core playback math, shape models, linear geometry

**Files:**
- Create: `lib/visualizer/core/playback.ts`, `lib/visualizer/core/shapes.ts`, `lib/visualizer/core/geometry.ts`
- Test: `lib/visualizer/core/playback.test.ts`, `lib/visualizer/core/shapes.test.ts`, `lib/visualizer/core/geometry.test.ts`

**Interfaces:**
- Produces:
  - `STEP_MS = 2600`, `SETTLE_MS = 300`, `TICK_MS = 100`, `SPEEDS = [0.5, 1, 2]`, `type Speed`, `frameDuration(speed)`, `subStepAt(elapsed, pathLen, speed)`, `isFrameDone(elapsed, speed)`, `clampFrame(i, total)`, `elapsedForSub(sub, pathLen, speed)`.
  - `Axis`, `ActiveTone`, `LinearModel`, `HistogramSlot`, `HistogramModel`, `RingSlot`, `RingModel`, `ShapeModel`, `defaultAxis(model): Axis | null`, `resolveAxis(model, rotated): Axis | null`, `modelKeys(model): string[]`.
  - `Size`, `Point`, `Rect`, `LinearLayout`, `linearLayout(size, capacity, axis): LinearLayout`.

- [ ] **Step 1: Write the failing tests**

`lib/visualizer/core/playback.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  clampFrame,
  elapsedForSub,
  frameDuration,
  isFrameDone,
  SETTLE_MS,
  STEP_MS,
  subStepAt,
} from "./playback";

describe("playback math", () => {
  it("frame duration scales with speed", () => {
    expect(frameDuration(1)).toBe(STEP_MS);
    expect(frameDuration(2)).toBe(STEP_MS / 2);
    expect(frameDuration(0.5)).toBe(STEP_MS * 2);
  });

  it("sub-step splits the frame evenly and clamps", () => {
    expect(subStepAt(0, 3, 1)).toBe(0);
    expect(subStepAt(STEP_MS / 3 + 1, 3, 1)).toBe(1);
    expect(subStepAt(STEP_MS * 5, 3, 1)).toBe(2);
    expect(subStepAt(-50, 3, 1)).toBe(0);
    expect(subStepAt(9999, 1, 1)).toBe(0);
  });

  it("a frame is done after its duration plus the settle time", () => {
    expect(isFrameDone(STEP_MS + SETTLE_MS - 1, 1)).toBe(false);
    expect(isFrameDone(STEP_MS + SETTLE_MS, 1)).toBe(true);
  });

  it("clampFrame keeps the index inside the run", () => {
    expect(clampFrame(998, 12)).toBe(11);
    expect(clampFrame(-4, 12)).toBe(0);
    expect(clampFrame(3.7, 12)).toBe(3);
    expect(clampFrame(5, 0)).toBe(0);
  });

  it("elapsedForSub is the start time of that sub-step", () => {
    expect(elapsedForSub(2, 4, 1)).toBe(STEP_MS / 2);
    expect(elapsedForSub(0, 0, 1)).toBe(0);
  });
});
```

`lib/visualizer/core/shapes.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { defaultAxis, type LinearModel, modelKeys, resolveAxis, type RingModel } from "./shapes";

const linear: LinearModel = {
  kind: "linear",
  items: ["F", "A"],
  capacity: 4,
  next: null,
  active: "F",
  tone: "new",
  evicted: null,
  labels: { entry: "newest", exit: "next out" },
  defaultAxis: "vertical",
};
const ring: RingModel = {
  kind: "ring",
  slots: [{ key: "A", bit: 1 }, null],
  hand: 0,
  turns: 0,
  cleared: [],
  active: 0,
  tone: "new",
};

describe("shape models", () => {
  it("rotation swaps the default axis; rings have no axis", () => {
    expect(defaultAxis(linear)).toBe("vertical");
    expect(resolveAxis(linear, false)).toBe("vertical");
    expect(resolveAxis(linear, true)).toBe("horizontal");
    expect(resolveAxis({ ...linear, defaultAxis: "horizontal" }, true)).toBe("vertical");
    expect(resolveAxis(ring, true)).toBeNull();
  });

  it("modelKeys lists the cached keys in shape order", () => {
    expect(modelKeys(linear)).toEqual(["F", "A"]);
    expect(modelKeys(ring)).toEqual(["A"]);
    expect(
      modelKeys({
        kind: "histogram",
        slots: [null, { key: "B", count: 2 }],
        next: null,
        active: null,
        tone: null,
        defaultAxis: "vertical",
      }),
    ).toEqual(["B"]);
  });
});
```

`lib/visualizer/core/geometry.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { linearLayout } from "./geometry";

describe("linearLayout", () => {
  it("vertical: centred column, slots stacked top to bottom", () => {
    const L = linearLayout({ w: 800, h: 600 }, 4, "vertical");
    expect(L.slot(0).x).toBeCloseTo((800 - L.block.w) / 2);
    expect(L.slot(1).y - L.slot(0).y).toBeCloseTo(L.block.h + 8);
    expect(L.exit.y).toBeGreaterThan(600);
    expect(L.enter.y).toBeLessThan(0);
    expect(L.block.w).toBeLessThanOrEqual(150);
  });

  it("horizontal: centred row, slots left to right", () => {
    const L = linearLayout({ w: 800, h: 400 }, 4, "horizontal");
    const first = L.slot(0).x - 6;
    const last = L.slot(3).x - 6 + L.block.w + 12;
    expect(first).toBeCloseTo(800 - last);
    expect(L.slot(1).x).toBeGreaterThan(L.slot(0).x);
    expect(L.exit.x).toBeGreaterThan(800);
    expect(L.enter.x).toBeLessThan(0);
  });

  it("keeps blocks usable on a 320px stage with 8 slots", () => {
    const L = linearLayout({ w: 320, h: 360 }, 8, "horizontal");
    expect(L.block.w).toBeGreaterThanOrEqual(18);
    const V = linearLayout({ w: 320, h: 300 }, 8, "vertical");
    expect(V.block.h).toBeGreaterThanOrEqual(28);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run --project unit lib/visualizer/core/playback.test.ts lib/visualizer/core/shapes.test.ts lib/visualizer/core/geometry.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`lib/visualizer/core/playback.ts`:
```ts
export const STEP_MS = 2600;
export const SETTLE_MS = 300;
export const TICK_MS = 100;
export const SPEEDS = [0.5, 1, 2] as const;
export type Speed = (typeof SPEEDS)[number];

export const frameDuration = (speed: Speed): number => STEP_MS / speed;

export function subStepAt(elapsed: number, pathLen: number, speed: Speed): number {
  if (pathLen <= 1) return 0;
  const per = frameDuration(speed) / pathLen;
  return Math.min(pathLen - 1, Math.max(0, Math.floor(elapsed / per)));
}

export const isFrameDone = (elapsed: number, speed: Speed): boolean =>
  elapsed >= frameDuration(speed) + SETTLE_MS;

export const clampFrame = (i: number, total: number): number =>
  Math.min(Math.max(0, total - 1), Math.max(0, Math.floor(i)));

// Resuming mid-frame restarts the clock at the start of the current sub-step.
export const elapsedForSub = (sub: number, pathLen: number, speed: Speed): number =>
  pathLen > 0 ? (sub * frameDuration(speed)) / pathLen : 0;
```

`lib/visualizer/core/shapes.ts`:
```ts
export type Axis = "vertical" | "horizontal";
export type ActiveTone = "new" | "hit";

export interface LinearModel {
  kind: "linear";
  items: string[];
  capacity: number;
  next: string | null;
  active: string | null;
  tone: ActiveTone | null;
  evicted: string | null;
  labels: { entry: string; exit: string };
  defaultAxis: Axis;
}

export interface HistogramSlot {
  key: string;
  count: number;
}
export interface HistogramModel {
  kind: "histogram";
  slots: (HistogramSlot | null)[];
  next: string | null;
  active: string | null;
  tone: ActiveTone | null;
  defaultAxis: Axis;
}

export interface RingSlot {
  key: string;
  bit: 0 | 1;
}
export interface RingModel {
  kind: "ring";
  slots: (RingSlot | null)[];
  hand: number;
  turns: number;
  cleared: number[];
  active: number | null;
  tone: ActiveTone | null;
}

export type ShapeModel = LinearModel | HistogramModel | RingModel;

export function defaultAxis(model: ShapeModel): Axis | null {
  return model.kind === "ring" ? null : model.defaultAxis;
}

export function resolveAxis(model: ShapeModel, rotated: boolean): Axis | null {
  const axis = defaultAxis(model);
  if (axis === null || !rotated) return axis;
  return axis === "vertical" ? "horizontal" : "vertical";
}

export function modelKeys(model: ShapeModel): string[] {
  if (model.kind === "linear") return model.items;
  return model.slots.flatMap((s) => (s ? [s.key] : []));
}
```

`lib/visualizer/core/geometry.ts`:
```ts
import type { Axis } from "./shapes";

export interface Size {
  w: number;
  h: number;
}
export interface Point {
  x: number;
  y: number;
}
export interface Rect extends Point, Size {}

export interface LinearLayout {
  block: Size;
  frame: Rect;
  slot: (i: number) => Point;
  enter: Point;
  exit: Point;
  entryLabel: Point;
  exitLabel: Point;
}

const GAP = 8;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function linearLayout(size: Size, capacity: number, axis: Axis): LinearLayout {
  const n = Math.max(1, capacity);
  if (axis === "vertical") {
    const bh = clamp((size.h - 140) / n - GAP, 28, 62);
    const bw = clamp(size.w * 0.18, 90, 150);
    const len = n * (bh + GAP);
    const x = (size.w - bw) / 2;
    const y = Math.max(50, (size.h - len) / 2 - 14);
    return {
      block: { w: bw, h: bh },
      frame: { x: x - 10, y: y - 8, w: bw + 20, h: len + 10 },
      slot: (i) => ({ x, y: y + i * (bh + GAP) }),
      enter: { x, y: -bh - 20 },
      exit: { x, y: size.h + 30 },
      entryLabel: { x: x + bw + 22, y: y + 8 },
      exitLabel: { x: x + bw + 22, y: y + (n - 1) * (bh + GAP) + bh / 2 - 6 },
    };
  }
  const pitch = clamp((size.w - 60) / n, 30, 96);
  const bw = pitch - 12;
  const bh = Math.min(76, bw);
  const len = pitch * n;
  const x = (size.w - len) / 2;
  const y = size.h / 2 - bh / 2 - 16;
  return {
    block: { w: bw, h: bh },
    frame: { x: x - 8, y: y - 10, w: len + 10, h: bh + 20 },
    slot: (i) => ({ x: x + i * pitch + 6, y }),
    enter: { x: -bw - 20, y },
    exit: { x: size.w + 30, y },
    entryLabel: { x, y: y - 32 },
    exitLabel: { x: x + len - 70, y: y - 32 },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run --project unit lib/visualizer/core/playback.test.ts lib/visualizer/core/shapes.test.ts lib/visualizer/core/geometry.test.ts`
Expected: PASS (10 tests).

---

### Task 4: Core module contract, eviction types, trace generator

**Files:**
- Create: `lib/visualizer/core/types.ts`, `lib/visualizer/eviction/types.ts`, `lib/visualizer/eviction/trace.ts`
- Test: `lib/visualizer/eviction/trace.test.ts`

**Interfaces:**
- Consumes: `FieldSection`, `InputValues` (Task 1), `Rich` (Task 1), `ShapeModel` (Task 3), `mulberry32` (Task 1).
- Produces:
  - `Outcome = "good" | "bad"`, `VarRow { name; value }`, `VizFrame { index; label; outcome; badge; caption: Rich; lines: Rich[]; path: number[]; vars: VarRow[]; logNote: Rich; metric: string; model: ShapeModel }`, `Experiment { title; blurb; patch: InputValues }`, `InfoContent { heading; name; chip; rule; about: [string, string][]; tries: Experiment[]; articleHref }`, `RunResult { frames; info; metricLabel; sequence: string[] }`, `VisualizerModule { slug; title; subtitle; unit; sections; defaults(): InputValues; run(values): RunResult }`.
  - `POLICY_IDS`, `PolicyId`, `PATTERNS`, `Pattern`, `EvictionInput`, `PolicyLines`, `PolicyMeta`, `StepOutcome<S>`, `PolicyDef<S>`, `LinearState`.
  - `generateTrace(pattern, length, seed, capacity): string[]`.

- [ ] **Step 1: Write the failing test**

`lib/visualizer/eviction/trace.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { generateTrace } from "./trace";

describe("generateTrace", () => {
  it("is deterministic per seed", () => {
    expect(generateTrace("hot", 24, 0x7f3a, 4)).toEqual(generateTrace("hot", 24, 0x7f3a, 4));
    expect(generateTrace("uniform", 24, 1, 4)).not.toEqual(generateTrace("uniform", 24, 2, 4));
  });

  it("returns the requested length", () => {
    for (const p of ["hot", "scan", "loop", "uniform"] as const) {
      expect(generateTrace(p, 17, 3, 4)).toHaveLength(17);
    }
  });

  it("hot set draws ~60% of requests from A/B and the rest from C–H", () => {
    const t = generateTrace("hot", 400, 9, 4);
    const hot = t.filter((k) => k === "A" || k === "B").length;
    expect(hot / t.length).toBeGreaterThan(0.5);
    expect(hot / t.length).toBeLessThan(0.7);
    expect(t.every((k) => "ABCDEFGH".includes(k))).toBe(true);
  });

  it("scan: hot keys, a sweep of one-off keys, hot keys again", () => {
    expect(generateTrace("scan", 12, 0, 4).join("")).toBe("ABABCDEFGHAB");
  });

  it("loop cycles over capacity + 1 keys", () => {
    expect(generateTrace("loop", 12, 0, 4).join("")).toBe("ABCDEABCDEAB");
    expect(generateTrace("loop", 6, 0, 2).join("")).toBe("ABCABC");
  });

  it("uniform stays inside A–H", () => {
    expect(generateTrace("uniform", 200, 5, 4).every((k) => "ABCDEFGH".includes(k))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run --project unit lib/visualizer/eviction/trace.test.ts`
Expected: FAIL — cannot resolve `./trace`.

- [ ] **Step 3: Implement**

`lib/visualizer/core/types.ts`:
```ts
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
  sections: FieldSection[];
  defaults: () => InputValues;
  run: (values: InputValues) => RunResult;
}
```

`lib/visualizer/eviction/types.ts`:
```ts
import type { ShapeModel } from "../core/shapes";
import type { Experiment, VarRow } from "../core/types";

export const POLICY_IDS = ["lru", "fifo", "lfu", "clock"] as const;
export type PolicyId = (typeof POLICY_IDS)[number];

export const PATTERNS = ["hot", "scan", "loop", "uniform"] as const;
export type Pattern = (typeof PATTERNS)[number];

export interface EvictionInput {
  policy: PolicyId;
  capacity: number;
  pattern: Pattern;
  length: number;
  seed: number;
  sequence: string[] | null;
}

// Templates use {key}, {victim} and any names a policy returns in StepOutcome.notes.
export interface PolicyLines {
  check: string;
  hit: string;
  missAny: string;
  evict: string;
  room: string;
  insert: string;
}

export interface PolicyMeta {
  id: PolicyId;
  name: string;
  chip: string;
  rule: string;
  hitCaption: string;
  lines: PolicyLines;
  about: [string, string][];
  tries: Experiment[];
  anchor: string;
}

export interface StepOutcome<S> {
  state: S;
  hit: boolean;
  evicted: string | null;
  notes?: Record<string, string>;
}

export interface PolicyDef<S> extends PolicyMeta {
  init(capacity: number): S;
  step(state: S, key: string, t: number): StepOutcome<S>;
  model(state: S, key: string, hit: boolean, evicted: string | null): ShapeModel;
  vars?(state: S, key: string): VarRow[];
}

export interface LinearState {
  capacity: number;
  order: string[];
}
```

`lib/visualizer/eviction/trace.ts`:
```ts
import { mulberry32 } from "../core/rng";
import type { Pattern } from "./types";

const KEYS = "ABCDEFGHIJKL";
const keyAt = (i: number): string => KEYS.charAt(i);

export function generateTrace(
  pattern: Pattern,
  length: number,
  seed: number,
  capacity: number,
): string[] {
  const rand = mulberry32(seed);
  const n = Math.max(0, length);
  switch (pattern) {
    case "hot":
      return Array.from({ length: n }, () =>
        rand() < 0.6 ? keyAt(Math.floor(rand() * 2)) : keyAt(2 + Math.floor(rand() * 6)),
      );
    case "scan":
      return Array.from({ length: n }, (_, i) =>
        i < 4 || i >= n - 2 ? keyAt(i % 2) : keyAt(2 + ((i - 4) % 10)),
      );
    case "loop":
      return Array.from({ length: n }, (_, i) => keyAt(i % (capacity + 1)));
    case "uniform":
      return Array.from({ length: n }, () => keyAt(Math.floor(rand() * 8)));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run --project unit lib/visualizer/eviction/trace.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck the core**

Run: `pnpm typecheck`
Expected: no errors.

---

### Task 5: Simulator + LRU and FIFO policies

**Files:**
- Create: `lib/visualizer/eviction/simulate.ts`, `lib/visualizer/eviction/policies/lru.ts`, `lib/visualizer/eviction/policies/fifo.ts`
- Test: `lib/visualizer/eviction/simulate.test.ts`

**Interfaces:**
- Consumes: `PolicyDef`, `LinearState` (Task 4); `fill`, `keyText`, `goodText`, `badText`, `warnText`, `mutedText`, `richText`, `Rich` (Task 1); `modelKeys`, `LinearModel` (Task 3); `VizFrame`, `VarRow`, `Outcome` (Task 4).
- Produces: `simulate<S>(def: PolicyDef<S>, capacity: number, trace: string[]): VizFrame[]` — path `[0, 1]` on hit, `[0, 2, 3]` on miss; lines are `[check, hit, (hit ? missAny : evicted ? evict : room), insert]`; vars rows in order: `request #`, `key`, `in cache?`, `removed`, `cache`, policy extras, `hits`, `misses`, `hit rate`. `lru`, `fifo` (`PolicyDef<LinearState>`).

Hand-checked reference for trace `ABCADEAFBAGC`, capacity 4:

| idx | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| key | A | B | C | A | D | E | A | F | B | A | G | C |
| LRU evicts | | | | hit | | B | hit | C | D | hit | E | F |
| FIFO evicts | | | | hit | | A | B | C | D | hit | E | A |

- [ ] **Step 1: Write the failing test**

`lib/visualizer/eviction/simulate.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { richText } from "../core/rich";
import type { LinearModel } from "../core/shapes";
import { fifo } from "./policies/fifo";
import { lru } from "./policies/lru";
import { simulate } from "./simulate";

const TRACE = "ABCADEAFBAGC".split("");
const hitsOf = (frames: { outcome: string }[]) =>
  frames.flatMap((f, i) => (f.outcome === "good" ? [i] : []));
const evictionsOf = (frames: { model: { kind: string } }[]) =>
  frames.map((f) => (f.model as LinearModel).evicted);
const varOf = (frame: { vars: { name: string; value: string }[] }, name: string) =>
  frame.vars.find((v) => v.name === name)?.value;

describe("simulate — LRU", () => {
  const frames = simulate(lru, 4, TRACE);

  it("hits and evictions match the reference", () => {
    expect(hitsOf(frames)).toEqual([3, 6, 9]);
    expect(evictionsOf(frames)).toEqual([
      null, null, null, null, null, "B", null, "C", "D", null, "E", "F",
    ]);
  });

  it("request 8 (get F): stack, next-out, path, lines, caption, metric", () => {
    const f = frames[7];
    if (!f) throw new Error("missing frame");
    const m = f.model as LinearModel;
    expect(m.items).toEqual(["F", "A", "E", "D"]);
    expect(m.next).toBe("D");
    expect(m.active).toBe("F");
    expect(m.tone).toBe("new");
    expect(f.path).toEqual([0, 2, 3]);
    expect(richText(f.lines[2] ?? [])).toBe("No → miss. Full → remove C from the bottom.");
    expect(richText(f.caption)).toBe("F miss — added · C out");
    expect(f.metric).toBe("25%");
    expect(varOf(f, "removed")).toBe("C");
    expect(varOf(f, "cache")).toBe("[F A E D]");
    expect(varOf(f, "hits")).toBe("2");
    expect(varOf(f, "misses")).toBe("6");
    expect(richText(f.logNote)).toBe("removed C");
  });

  it("a hit moves the key to the top and takes the hit path", () => {
    const f = frames[3];
    if (!f) throw new Error("missing frame");
    expect((f.model as LinearModel).items).toEqual(["A", "C", "B"]);
    expect(f.path).toEqual([0, 1]);
    expect(f.badge).toBe("HIT");
    expect(richText(f.caption)).toBe("A hit — moves to the newest end");
    expect(richText(f.logNote)).toBe("—");
  });

  it("before the cache fills there is no next-out and the room line is used", () => {
    const f = frames[2];
    if (!f) throw new Error("missing frame");
    expect((f.model as LinearModel).next).toBeNull();
    expect(richText(f.lines[2] ?? [])).toBe("No → miss. Space left, nothing removed.");
  });
});

describe("simulate — FIFO", () => {
  const frames = simulate(fifo, 4, TRACE);

  it("hits and evictions match the reference", () => {
    expect(hitsOf(frames)).toEqual([3, 9]);
    expect(evictionsOf(frames)).toEqual([
      null, null, null, null, null, "A", "B", "C", "D", null, "E", "A",
    ]);
  });

  it("a hit does not reorder the queue", () => {
    const f = frames[3];
    if (!f) throw new Error("missing frame");
    expect((f.model as LinearModel).items).toEqual(["C", "B", "A"]);
    expect(richText(f.caption)).toBe("A hit — queue doesn't move");
    expect((f.model as LinearModel).defaultAxis).toBe("horizontal");
  });
});

describe("simulate — degenerate sequences", () => {
  it("one repeated key never fills the cache", () => {
    for (const def of [lru, fifo]) {
      const frames = simulate(def, 4, ["A", "A", "A", "A"]);
      expect(hitsOf(frames)).toEqual([1, 2, 3]);
      for (const f of frames) {
        expect((f.model as LinearModel).next).toBeNull();
        expect((f.model as LinearModel).evicted).toBeNull();
      }
      expect(frames[3]?.metric).toBe("75%");
    }
  });

  it("an empty trace yields no frames", () => {
    expect(simulate(lru, 4, [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run --project unit lib/visualizer/eviction/simulate.test.ts`
Expected: FAIL — cannot resolve `./simulate`.

- [ ] **Step 3: Implement**

`lib/visualizer/eviction/simulate.ts`:
```ts
import { badText, fill, goodText, keyText, mutedText, type Rich, warnText } from "../core/rich";
import { modelKeys } from "../core/shapes";
import type { Outcome, VarRow, VizFrame } from "../core/types";
import type { PolicyDef } from "./types";

const HIT_PATH = [0, 1];
const MISS_PATH = [0, 2, 3];

function caption(hitCaption: string, key: string, hit: boolean, evicted: string | null): Rich {
  if (hit) return [keyText(key), " ", goodText("hit"), ` — ${hitCaption}`];
  const base: Rich = [keyText(key), " ", badText("miss"), " — added"];
  return evicted ? [...base, " · ", keyText(evicted), " ", warnText("out")] : base;
}

export function simulate<S>(def: PolicyDef<S>, capacity: number, trace: string[]): VizFrame[] {
  let state = def.init(capacity);
  let hits = 0;
  return trace.map((key, t) => {
    const out = def.step(state, key, t);
    state = out.state;
    if (out.hit) hits++;
    const rate = `${Math.round((hits / (t + 1)) * 100)}%`;
    const model = def.model(state, key, out.hit, out.evicted);
    const tv = { key, victim: out.evicted ?? "", ...out.notes };
    const missLine = out.hit ? def.lines.missAny : out.evicted ? def.lines.evict : def.lines.room;
    const outcome: Outcome = out.hit ? "good" : "bad";
    const vars: VarRow[] = [
      { name: "request #", value: String(t + 1) },
      { name: "key", value: key },
      { name: "in cache?", value: out.hit ? "yes" : "no" },
      { name: "removed", value: out.evicted ?? "—" },
      { name: "cache", value: `[${modelKeys(model).join(" ")}]` },
      ...(def.vars?.(state, key) ?? []),
      { name: "hits", value: String(hits) },
      { name: "misses", value: String(t + 1 - hits) },
      { name: "hit rate", value: rate },
    ];
    return {
      index: t,
      label: key,
      outcome,
      badge: out.hit ? "HIT" : "MISS",
      caption: caption(def.hitCaption, key, out.hit, out.evicted),
      lines: [
        fill(def.lines.check, tv),
        fill(def.lines.hit, tv),
        fill(missLine, tv),
        fill(def.lines.insert, tv),
      ],
      path: out.hit ? HIT_PATH : MISS_PATH,
      vars,
      logNote: out.evicted ? ["removed ", keyText(out.evicted)] : [mutedText("—")],
      metric: rate,
      model,
    };
  });
}
```

`lib/visualizer/eviction/policies/lru.ts`:
```ts
import type { LinearState, PolicyDef } from "../types";

export const lru: PolicyDef<LinearState> = {
  id: "lru",
  name: "LRU",
  chip: "Stack",
  rule: "Throw out whatever was used longest ago.",
  hitCaption: "moves to the newest end",
  lines: {
    check: "Is {key} in the cache?",
    hit: "Yes → hit. Move {key} to the top.",
    missAny: "No → miss. If full, remove the bottom key.",
    evict: "No → miss. Full → remove {victim} from the bottom.",
    room: "No → miss. Space left, nothing removed.",
    insert: "Put {key} on top.",
  },
  about: [
    ["Cost", "O(1) per request — hashmap + doubly linked list"],
    ["Wins", "recently used keys are likely to be used again"],
    ["Loses", "one big scan pushes every hot key out"],
    ["Seen in", "Redis (approximate LRU), CPU caches, OS page cache"],
  ],
  tries: [
    {
      title: "Scan wipes LRU",
      blurb: "A one-off sweep through many keys pushes the hot ones out.",
      patch: { pattern: "scan", capacity: 4, sequence: null },
    },
    {
      title: "Loop one bigger than the cache",
      blurb: "Cycle through 5 keys with room for 4 — every request misses.",
      patch: { pattern: "loop", capacity: 4, sequence: null },
    },
    {
      title: "Give it more room",
      blurb: "Same hot set, cache of 6 — watch the hit rate climb.",
      patch: { pattern: "hot", capacity: 6, sequence: null },
    },
  ],
  anchor: "lru-least-recently-used",
  init: (capacity) => ({ capacity, order: [] }),
  step(state, key) {
    const hit = state.order.includes(key);
    const rest = state.order.filter((k) => k !== key);
    const evicted = !hit && rest.length >= state.capacity ? (rest.pop() ?? null) : null;
    return { state: { capacity: state.capacity, order: [key, ...rest] }, hit, evicted };
  },
  model(state, key, hit, evicted) {
    const full = state.order.length >= state.capacity;
    return {
      kind: "linear",
      items: state.order,
      capacity: state.capacity,
      next: full ? (state.order[state.order.length - 1] ?? null) : null,
      active: key,
      tone: hit ? "hit" : "new",
      evicted,
      labels: { entry: "newest", exit: "next out" },
      defaultAxis: "vertical",
    };
  },
};
```

`lib/visualizer/eviction/policies/fifo.ts`:
```ts
import type { LinearState, PolicyDef } from "../types";

export const fifo: PolicyDef<LinearState> = {
  id: "fifo",
  name: "FIFO",
  chip: "Queue",
  rule: "Throw out whatever came in first. Hits don't matter.",
  hitCaption: "queue doesn't move",
  lines: {
    check: "Is {key} in the cache?",
    hit: "Yes → hit. Nothing moves.",
    missAny: "No → miss. If full, pop the oldest.",
    evict: "No → miss. Full → pop {victim}, the oldest.",
    room: "No → miss. Space left, nothing removed.",
    insert: "Push {key} in at the front.",
  },
  about: [
    ["Cost", "O(1) per request — just a queue"],
    ["Wins", "dead simple, no bookkeeping on hits"],
    ["Loses", "throws out hot keys just because they're old"],
    ["Seen in", "simple buffers, some CDN tiers"],
  ],
  tries: [
    {
      title: "Hot key thrown out anyway",
      blurb: "Watch a hot key get evicted even though it keeps being used.",
      patch: { pattern: "hot", capacity: 4, sequence: null },
    },
    {
      title: "Same loop trap",
      blurb: "5 keys looping through a cache of 4.",
      patch: { pattern: "loop", capacity: 4, sequence: null },
    },
  ],
  anchor: "fifo--segmented-variants",
  init: (capacity) => ({ capacity, order: [] }),
  step(state, key) {
    if (state.order.includes(key)) return { state, hit: true, evicted: null };
    const order = [...state.order];
    const evicted = order.length >= state.capacity ? (order.pop() ?? null) : null;
    return { state: { capacity: state.capacity, order: [key, ...order] }, hit: false, evicted };
  },
  model(state, key, hit, evicted) {
    const full = state.order.length >= state.capacity;
    return {
      kind: "linear",
      items: state.order,
      capacity: state.capacity,
      next: full ? (state.order[state.order.length - 1] ?? null) : null,
      active: key,
      tone: hit ? "hit" : "new",
      evicted,
      labels: { entry: "in", exit: "out" },
      defaultAxis: "horizontal",
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run --project unit lib/visualizer/eviction/simulate.test.ts`
Expected: PASS (8 tests).

---

### Task 6: LFU and CLOCK policies

**Files:**
- Create: `lib/visualizer/eviction/policies/lfu.ts`, `lib/visualizer/eviction/policies/clock.ts`
- Test: `lib/visualizer/eviction/policies/lfu.test.ts`, `lib/visualizer/eviction/policies/clock.test.ts`

**Interfaces:**
- Consumes: `simulate` (Task 5), `PolicyDef` (Task 4), `HistogramModel`, `RingModel`, `RingSlot` (Task 3).
- Produces: `lfu: PolicyDef<LfuState>` (counts reset when a key is evicted; ties go to the least recently used; extra vars `uses of key`, `lowest uses`), `clock: PolicyDef<ClockState>` (new keys and hits set bit 1; misses into an empty slot take the first empty slot; the evict line is `No → miss. Hand cleared {skipped}; removed {victim}.`; extra vars `hand at`, `bits`).

Hand-checked reference (trace `ABCADEAFBAGC`, capacity 4):

| idx | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LFU evicts | | | | hit | | B | hit | C | D | hit | E | F |
| CLOCK evicts | | | | hit | | A (cleared 0–3) | B | C | D | hit | E (cleared 0–3) | A |

- [ ] **Step 1: Write the failing tests**

`lib/visualizer/eviction/policies/lfu.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { HistogramModel } from "../../core/shapes";
import { simulate } from "../simulate";
import { lfu } from "./lfu";

const TRACE = "ABCADEAFBAGC".split("");
const frames = simulate(lfu, 4, TRACE);
const hist = (i: number) => frames[i]?.model as HistogramModel;

describe("LFU", () => {
  it("hits and evictions match the reference", () => {
    expect(frames.flatMap((f, i) => (f.outcome === "good" ? [i] : []))).toEqual([3, 6, 9]);
    const evicted = frames.map((f) => {
      const v = f.vars.find((r) => r.name === "removed")?.value;
      return v === "—" ? null : v;
    });
    expect(evicted).toEqual([null, null, null, null, null, "B", null, "C", "D", null, "E", "F"]);
  });

  it("request 8: bars keep slot positions, counts and the next-out flag", () => {
    expect(hist(7).slots).toEqual([
      { key: "A", count: 3 },
      { key: "E", count: 1 },
      { key: "F", count: 1 },
      { key: "D", count: 1 },
    ]);
    expect(hist(7).next).toBe("D");
    expect(frames[7]?.vars.find((v) => v.name === "uses of key")?.value).toBe("1");
    expect(frames[7]?.vars.find((v) => v.name === "lowest uses")?.value).toBe("1");
  });

  it("pads empty slots and has no next-out until full", () => {
    expect(hist(1).slots).toEqual([{ key: "A", count: 1 }, { key: "B", count: 1 }, null, null]);
    expect(hist(1).next).toBeNull();
  });

  it("an evicted key comes back with a fresh count", () => {
    // A ties with B and is older, so C evicts A; then A evicts B and restarts at 1.
    const f = simulate(lfu, 2, ["A", "B", "C", "A"]);
    expect(f[2]?.vars.find((v) => v.name === "removed")?.value).toBe("A");
    const last = f[3]?.model as HistogramModel;
    expect(last.slots).toEqual([{ key: "C", count: 1 }, { key: "A", count: 1 }]);
  });
});
```

`lib/visualizer/eviction/policies/clock.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { richText } from "../../core/rich";
import type { RingModel } from "../../core/shapes";
import { simulate } from "../simulate";
import { clock } from "./clock";

const TRACE = "ABCADEAFBAGC".split("");
const frames = simulate(clock, 4, TRACE);
const ring = (i: number) => frames[i]?.model as RingModel;

describe("CLOCK", () => {
  it("hits and evictions match the reference", () => {
    expect(frames.flatMap((f, i) => (f.outcome === "good" ? [i] : []))).toEqual([3, 9]);
    const evicted = frames.map((f) => {
      const v = f.vars.find((r) => r.name === "removed")?.value;
      return v === "—" ? null : v;
    });
    expect(evicted).toEqual([null, null, null, null, null, "A", "B", "C", "D", null, "E", "A"]);
  });

  it("request 6: full sweep clears every bit, then evicts at the hand", () => {
    expect(ring(5).cleared).toEqual([0, 1, 2, 3]);
    expect(ring(5).active).toBe(0);
    expect(ring(5).hand).toBe(1);
    expect(ring(5).turns).toBe(5);
    expect(richText(frames[5]?.lines[2] ?? [])).toBe(
      "No → miss. Hand cleared A, B, C, D; removed A.",
    );
  });

  it("request 8: bits and hand position", () => {
    expect(ring(7).slots).toEqual([
      { key: "E", bit: 1 },
      { key: "A", bit: 1 },
      { key: "F", bit: 1 },
      { key: "D", bit: 0 },
    ]);
    expect(ring(7).hand).toBe(3);
    expect(ring(7).turns).toBe(7);
    expect(richText(frames[7]?.lines[2] ?? [])).toBe("No → miss. Hand cleared no bits; removed C.");
  });

  it("a hit sets the bit and marks the slot active without moving the hand", () => {
    expect(ring(9).active).toBe(1);
    expect(ring(9).tone).toBe("hit");
    expect(ring(9).cleared).toEqual([]);
    expect(ring(9).hand).toBe(ring(8).hand);
  });

  it("turns keep counting across full sweeps", () => {
    expect(ring(10).turns).toBe(13);
    expect(ring(10).hand).toBe(1);
  });

  it("fills empty slots first and never sweeps a non-full ring", () => {
    const f = simulate(clock, 4, ["A", "B", "A"]);
    expect((f[2]?.model as RingModel).slots).toEqual([
      { key: "A", bit: 1 },
      { key: "B", bit: 1 },
      null,
      null,
    ]);
    expect((f[2]?.model as RingModel).turns).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run --project unit lib/visualizer/eviction/policies/lfu.test.ts lib/visualizer/eviction/policies/clock.test.ts`
Expected: FAIL — cannot resolve `./lfu`, `./clock`.

- [ ] **Step 3: Implement**

`lib/visualizer/eviction/policies/lfu.ts`:
```ts
import type { PolicyDef } from "../types";

export interface LfuState {
  capacity: number;
  slots: string[];
  counts: Record<string, number>;
  last: Record<string, number>;
}

const omit = (rec: Record<string, number>, key: string): Record<string, number> =>
  Object.fromEntries(Object.entries(rec).filter(([k]) => k !== key));

// Lowest count wins; ties go to the key used longest ago.
function victim(s: LfuState): string | null {
  let best: string | null = null;
  for (const k of s.slots) {
    if (best === null) {
      best = k;
      continue;
    }
    const c = s.counts[k] ?? 0;
    const bc = s.counts[best] ?? 0;
    if (c < bc || (c === bc && (s.last[k] ?? 0) < (s.last[best] ?? 0))) best = k;
  }
  return best;
}

export const lfu: PolicyDef<LfuState> = {
  id: "lfu",
  name: "LFU",
  chip: "Histogram",
  rule: "Throw out whatever is used least often.",
  hitCaption: "bar grows",
  lines: {
    check: "Is {key} in the cache?",
    hit: "Yes → hit. Add 1 to {key}'s count.",
    missAny: "No → miss. If full, remove the lowest count.",
    evict: "No → miss. Full → remove {victim} (lowest count).",
    room: "No → miss. Space left, nothing removed.",
    insert: "Add {key} with count 1.",
  },
  about: [
    ["Cost", "O(1) with frequency buckets (O(log n) with a heap)"],
    ["Wins", "popular keys survive one-off scans"],
    ["Loses", "old favourites linger; new keys go before they can prove themselves"],
    ["Seen in", "CDNs, Caffeine's W-TinyLFU (a refined variant)"],
  ],
  tries: [
    {
      title: "Survives the scan",
      blurb: "Hot keys build up counts, so a sweep can't push them out.",
      patch: { pattern: "scan", capacity: 4, sequence: null },
    },
    {
      title: "New keys starve",
      blurb: "Uniform traffic: fresh keys lose to anything with a higher count.",
      patch: { pattern: "uniform", capacity: 4, sequence: null },
    },
  ],
  anchor: "lfu-least-frequently-used",
  init: (capacity) => ({ capacity, slots: [], counts: {}, last: {} }),
  step(state, key, t) {
    const hit = state.slots.includes(key);
    const slots = [...state.slots];
    let counts = { ...state.counts };
    let last = { ...state.last };
    let evicted: string | null = null;
    if (hit) {
      counts[key] = (counts[key] ?? 0) + 1;
    } else {
      if (slots.length >= state.capacity) {
        evicted = victim(state);
        const at = evicted === null ? -1 : slots.indexOf(evicted);
        if (evicted !== null && at >= 0) {
          slots[at] = key;
          counts = omit(counts, evicted);
          last = omit(last, evicted);
        }
      } else {
        slots.push(key);
      }
      counts[key] = 1;
    }
    last[key] = t;
    return { state: { capacity: state.capacity, slots, counts, last }, hit, evicted };
  },
  model(state, key, hit) {
    const full = state.slots.length >= state.capacity;
    return {
      kind: "histogram",
      slots: Array.from({ length: state.capacity }, (_, i) => {
        const k = state.slots[i];
        return k === undefined ? null : { key: k, count: state.counts[k] ?? 0 };
      }),
      next: full ? victim(state) : null,
      active: key,
      tone: hit ? "hit" : "new",
      defaultAxis: "vertical",
    };
  },
  vars(state, key) {
    const lowest = Math.min(...state.slots.map((k) => state.counts[k] ?? 0));
    return [
      { name: "uses of key", value: String(state.counts[key] ?? 0) },
      { name: "lowest uses", value: String(lowest) },
    ];
  },
};
```

`lib/visualizer/eviction/policies/clock.ts`:
```ts
import type { RingSlot } from "../../core/shapes";
import type { PolicyDef } from "../types";

export interface ClockState {
  capacity: number;
  slots: (RingSlot | null)[];
  hand: number;
  turns: number;
  cleared: number[];
  at: number;
}

export const clock: PolicyDef<ClockState> = {
  id: "clock",
  name: "CLOCK",
  chip: "Ring",
  rule: "Second chance: sweep the ring, spare anything used since the last pass.",
  hitCaption: "bit set to 1",
  lines: {
    check: "Is {key} in the cache?",
    hit: "Yes → hit. Set {key}'s bit to 1.",
    missAny: "No → miss. Sweep: bit 1 → clear and skip, bit 0 → remove.",
    evict: "No → miss. Hand cleared {skipped}; removed {victim}.",
    room: "No → miss. Empty slot, nothing removed.",
    insert: "Place {key} with bit 1.",
  },
  about: [
    ["Cost", "O(1) amortised — a ring and one bit per slot"],
    ["Wins", "near-LRU hit rate without moving anything on a hit"],
    ["Loses", "a full sweep when every bit is 1"],
    ["Seen in", "OS page replacement, PostgreSQL buffer pool"],
  ],
  tries: [
    {
      title: "Every key gets a second chance",
      blurb: "Hot set: watch the hand clear bits before it evicts.",
      patch: { pattern: "hot", capacity: 4, sequence: null },
    },
    {
      title: "Loop trap again",
      blurb: "5 keys looping through 4 slots.",
      patch: { pattern: "loop", capacity: 4, sequence: null },
    },
  ],
  anchor: "eviction--expiry",
  init: (capacity) => ({
    capacity,
    slots: Array.from({ length: capacity }, () => null),
    hand: 0,
    turns: 0,
    cleared: [],
    at: -1,
  }),
  step(state, key) {
    const slots = [...state.slots];
    const found = slots.findIndex((s) => s?.key === key);
    if (found >= 0) {
      slots[found] = { key, bit: 1 };
      return { state: { ...state, slots, cleared: [], at: found }, hit: true, evicted: null };
    }
    const empty = slots.findIndex((s) => s === null);
    if (empty >= 0) {
      slots[empty] = { key, bit: 1 };
      return { state: { ...state, slots, cleared: [], at: empty }, hit: false, evicted: null };
    }
    let { hand, turns } = state;
    const cleared: number[] = [];
    // One pass clears every bit, so two passes always find a 0.
    for (let guard = 0; guard < state.capacity * 2; guard++) {
      const s = slots[hand];
      if (!s || s.bit === 0) break;
      slots[hand] = { key: s.key, bit: 0 };
      cleared.push(hand);
      hand = (hand + 1) % state.capacity;
      turns++;
    }
    const evicted = slots[hand]?.key ?? null;
    slots[hand] = { key, bit: 1 };
    const at = hand;
    hand = (hand + 1) % state.capacity;
    turns++;
    const skipped = cleared
      .map((i) => state.slots[i]?.key)
      .filter((k): k is string => typeof k === "string");
    return {
      state: { capacity: state.capacity, slots, hand, turns, cleared, at },
      hit: false,
      evicted,
      notes: { skipped: skipped.length ? skipped.join(", ") : "no bits" },
    };
  },
  model(state, _key, hit) {
    return {
      kind: "ring",
      slots: state.slots,
      hand: state.hand,
      turns: state.turns,
      cleared: state.cleared,
      active: state.at >= 0 ? state.at : null,
      tone: hit ? "hit" : "new",
    };
  },
  vars(state) {
    return [
      { name: "hand at", value: `slot ${state.hand + 1}` },
      { name: "bits", value: state.slots.map((s) => (s ? `${s.key}${s.bit}` : "·")).join(" ") },
    ];
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run --project unit lib/visualizer/eviction/policies/lfu.test.ts lib/visualizer/eviction/policies/clock.test.ts`
Expected: PASS (10 tests).

---

### Task 7: Eviction module, visualizer registry, article-anchor guard

**Files:**
- Create: `lib/visualizer/eviction/module.ts`, `lib/visualizer/registry.ts`, `lib/visualizer/modules.ts`
- Modify: `tests/content/artifacts.test.ts` (add one `it` inside the existing `describe("content build artifacts", …)` block)
- Test: `lib/visualizer/eviction/module.test.ts`, `lib/visualizer/registry.test.ts`

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces:
  - `CACHING_ARTICLE = "/system-design/components/caching/"`, `POLICIES: Record<PolicyId, { meta: PolicyMeta; run(capacity, trace): VizFrame[] }>`, `EVICTION_SECTIONS: FieldSection[]`, `toEvictionInput(values): EvictionInput`, `evictionModule: VisualizerModule` (slug `eviction-policies`, unit `request`, `metricLabel` `Hit rate`, `info.heading` `Policy`).
  - `VisualizerEntry { slug; title; description; icon }`, `VISUALIZERS: VisualizerEntry[]`, `getVisualizer(slug): VisualizerEntry | undefined`.
  - `MODULES: Record<string, VisualizerModule>`.

- [ ] **Step 1: Write the failing tests**

`lib/visualizer/eviction/module.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { allFields, SEED_MAX } from "../core/fields";
import { encodeState, parseState } from "../core/url-state";
import { CACHING_ARTICLE, evictionModule, POLICIES, toEvictionInput } from "./module";

describe("eviction module", () => {
  it("defaults are valid and seed is random within range", () => {
    const d = evictionModule.defaults();
    expect(d).toMatchObject({ policy: "lru", capacity: 4, pattern: "hot", length: 12, sequence: null });
    expect(typeof d.seed).toBe("number");
    expect(d.seed as number).toBeLessThanOrEqual(SEED_MAX);
  });

  it("every field key maps onto EvictionInput", () => {
    const keys = allFields(evictionModule.sections).map((f) => f.key).sort();
    expect(keys).toEqual(["capacity", "length", "pattern", "policy", "seed", "sequence"]);
  });

  it("runs the selected policy on a custom sequence", () => {
    const r = evictionModule.run({ ...evictionModule.defaults(), policy: "fifo", sequence: "ABCADEAFBAGC".split("") });
    expect(r.frames).toHaveLength(12);
    expect(r.sequence.join("")).toBe("ABCADEAFBAGC");
    expect(r.info).toMatchObject({ heading: "Policy", name: "FIFO", chip: "Queue" });
    expect(r.info.articleHref).toBe(`${CACHING_ARTICLE}#fifo--segmented-variants`);
    expect(r.metricLabel).toBe("Hit rate");
  });

  it("generates the trace from pattern, length and seed when no sequence is set", () => {
    const v = { ...evictionModule.defaults(), seed: 0x7f3a, length: 20 };
    expect(evictionModule.run(v).sequence).toEqual(evictionModule.run(v).sequence);
    expect(evictionModule.run(v).frames).toHaveLength(20);
  });

  it("toEvictionInput falls back on bad values", () => {
    expect(
      toEvictionInput({ policy: "opt", capacity: "x", pattern: 5, length: null, seed: Number.NaN, sequence: [] }),
    ).toEqual({ policy: "lru", capacity: 4, pattern: "hot", length: 12, seed: 0, sequence: null });
  });

  it("a junk URL still produces a valid run", () => {
    const { values } = parseState("?p=xyz&c=-5&s=zz&q=123&n=999", evictionModule.sections, evictionModule.defaults());
    const r = evictionModule.run(values);
    expect(r.frames).toHaveLength(24);
    expect(r.info.name).toBe("LRU");
  });

  it("URL round-trips through the module's own fields", () => {
    const values = { policy: "clock", capacity: 5, pattern: "loop", length: 9, seed: 42, sequence: null };
    const search = encodeState(evictionModule.sections, values, { frame: 2, rotated: false });
    expect(parseState(search, evictionModule.sections, evictionModule.defaults()).values).toEqual(values);
  });

  it("exposes all four v1 policies in display order", () => {
    expect(Object.keys(POLICIES)).toEqual(["lru", "fifo", "lfu", "clock"]);
  });
});
```

`lib/visualizer/registry.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { MODULES } from "./modules";
import { getVisualizer, VISUALIZERS } from "./registry";

describe("visualizer registry", () => {
  it("every registry entry has a module with the same title", () => {
    for (const v of VISUALIZERS) {
      expect(MODULES[v.slug]?.title).toBe(v.title);
      expect(MODULES[v.slug]?.slug).toBe(v.slug);
    }
  });

  it("every module is listed in the registry", () => {
    expect(Object.keys(MODULES).sort()).toEqual(VISUALIZERS.map((v) => v.slug).sort());
  });

  it("getVisualizer finds by slug", () => {
    expect(getVisualizer("eviction-policies")?.title).toBe("Eviction policies");
    expect(getVisualizer("nope")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run --project unit lib/visualizer/eviction/module.test.ts lib/visualizer/registry.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`lib/visualizer/eviction/module.ts`:
```ts
import type { FieldSection, InputValues } from "../core/fields";
import { randomSeed } from "../core/rng";
import type { InfoContent, RunResult, VisualizerModule, VizFrame } from "../core/types";
import { clock } from "./policies/clock";
import { fifo } from "./policies/fifo";
import { lfu } from "./policies/lfu";
import { lru } from "./policies/lru";
import { simulate } from "./simulate";
import { generateTrace } from "./trace";
import {
  type EvictionInput,
  PATTERNS,
  type Pattern,
  POLICY_IDS,
  type PolicyDef,
  type PolicyId,
  type PolicyMeta,
} from "./types";

export const CACHING_ARTICLE = "/system-design/components/caching/";

interface PolicyEntry {
  meta: PolicyMeta;
  run: (capacity: number, trace: string[]) => VizFrame[];
}

const entry = <S>(def: PolicyDef<S>): PolicyEntry => ({
  meta: def,
  run: (capacity, trace) => simulate(def, capacity, trace),
});

export const POLICIES: Record<PolicyId, PolicyEntry> = {
  lru: entry(lru),
  fifo: entry(fifo),
  lfu: entry(lfu),
  clock: entry(clock),
};

const PATTERN_LABELS: Record<Pattern, string> = {
  hot: "Hot set",
  scan: "Scan",
  loop: "Loop",
  uniform: "Uniform",
};

export const EVICTION_SECTIONS: FieldSection[] = [
  {
    title: "Policy",
    fields: [
      {
        kind: "chips",
        key: "policy",
        label: "Policy",
        param: "p",
        hideLabel: true,
        options: POLICY_IDS.map((id) => ({ value: id, label: POLICIES[id].meta.name })),
      },
    ],
  },
  {
    title: "Input",
    fields: [
      { kind: "slider", key: "capacity", label: "Cache size", param: "c", min: 2, max: 8 },
      {
        kind: "chips",
        key: "pattern",
        label: "Access pattern",
        param: "pat",
        options: PATTERNS.map((p) => ({ value: p, label: PATTERN_LABELS[p] })),
      },
      { kind: "slider", key: "length", label: "Requests", param: "n", min: 6, max: 24 },
      {
        kind: "sequence",
        key: "sequence",
        label: "Sequence",
        param: "q",
        maxLen: 40,
        hint: "Edit keys A–Z, press Enter",
        resetBy: ["pattern", "length", "seed"],
      },
    ],
  },
  { title: "", fields: [{ kind: "seed", key: "seed", label: "Seed", param: "s" }] },
];

const num = (x: unknown, fallback: number): number =>
  typeof x === "number" && Number.isFinite(x) ? x : fallback;

export function toEvictionInput(v: InputValues): EvictionInput {
  return {
    policy: POLICY_IDS.find((p) => p === v.policy) ?? "lru",
    capacity: num(v.capacity, 4),
    pattern: PATTERNS.find((p) => p === v.pattern) ?? "hot",
    length: num(v.length, 12),
    seed: num(v.seed, 0),
    sequence: Array.isArray(v.sequence) && v.sequence.length ? v.sequence : null,
  };
}

function infoOf(meta: PolicyMeta): InfoContent {
  return {
    heading: "Policy",
    name: meta.name,
    chip: meta.chip,
    rule: meta.rule,
    about: meta.about,
    tries: meta.tries,
    articleHref: `${CACHING_ARTICLE}#${meta.anchor}`,
  };
}

export const evictionModule: VisualizerModule = {
  slug: "eviction-policies",
  title: "Eviction policies",
  subtitle: "What a full cache throws out — and why.",
  unit: "request",
  sections: EVICTION_SECTIONS,
  defaults: () => ({
    policy: "lru",
    capacity: 4,
    pattern: "hot",
    length: 12,
    seed: randomSeed(),
    sequence: null,
  }),
  run(values): RunResult {
    const input = toEvictionInput(values);
    const sequence =
      input.sequence ?? generateTrace(input.pattern, input.length, input.seed, input.capacity);
    const policy = POLICIES[input.policy];
    return {
      frames: policy.run(input.capacity, sequence),
      info: infoOf(policy.meta),
      metricLabel: "Hit rate",
      sequence,
    };
  },
};
```

`lib/visualizer/registry.ts`:
```ts
export interface VisualizerEntry {
  slug: string;
  title: string;
  description: string;
  icon: string;
}

export const VISUALIZERS: VisualizerEntry[] = [
  {
    slug: "eviction-policies",
    title: "Eviction policies",
    description: "LRU, FIFO, LFU and CLOCK — watch what a full cache throws out, step by step.",
    icon: "🗃️",
  },
];

export function getVisualizer(slug: string): VisualizerEntry | undefined {
  return VISUALIZERS.find((v) => v.slug === slug);
}
```

`lib/visualizer/modules.ts`:
```ts
import type { VisualizerModule } from "./core/types";
import { evictionModule } from "./eviction/module";

export const MODULES: Record<string, VisualizerModule> = {
  [evictionModule.slug]: evictionModule,
};
```

- [ ] **Step 4: Add the article-anchor guard to the content suite**

In `tests/content/artifacts.test.ts`, add the import next to the existing `manifestSchema` import:
```ts
import { CACHING_ARTICLE, POLICIES } from "../../lib/visualizer/eviction/module";
```
and add this `it` inside `describe("content build artifacts", () => { … })`:
```ts
  it("eviction visualizer deep links resolve to caching article headings", () => {
    const manifest = manifestSchema.parse(readJson("manifest.json"));
    const article = manifest.articles.find(
      (a) => `/${a.verticalId}/${a.slug.join("/")}/` === CACHING_ARTICLE,
    );
    expect(article, CACHING_ARTICLE).toBeDefined();
    const ids = new Set(article?.headings.map((h) => h.id));
    for (const p of Object.values(POLICIES)) expect(ids.has(p.meta.anchor), p.meta.anchor).toBe(true);
  });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run --project unit lib/visualizer/eviction/module.test.ts lib/visualizer/registry.test.ts`
Expected: PASS (11 tests).

Run: `pnpm test:content`
Expected: PASS, including "eviction visualizer deep links resolve to caching article headings".

---

### Task 8: Panel-collapse persistence

**Files:**
- Modify: `lib/storage/keys.ts` (add one key to `KEYS`)
- Create: `lib/storage/visualizer-prefs.ts`
- Test: `lib/storage/visualizer-prefs.test.ts`

**Interfaces:**
- Produces: `KEYS.visualizerPanels = "wiki-visualizer-panels"`, `PanelPrefs { left: boolean; right: boolean }` (true = collapsed), `getVisualizerPanels(): PanelPrefs | null`, `setVisualizerPanels(p: PanelPrefs): void`.

- [ ] **Step 1: Write the failing test**

`lib/storage/visualizer-prefs.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { KEYS } from "./keys";
import { getVisualizerPanels, setVisualizerPanels } from "./visualizer-prefs";

beforeEach(() => localStorage.clear());

describe("visualizer-prefs", () => {
  it("returns null when nothing is stored", () => {
    expect(getVisualizerPanels()).toBeNull();
  });

  it("round-trips panel state", () => {
    setVisualizerPanels({ left: true, right: false });
    expect(getVisualizerPanels()).toEqual({ left: true, right: false });
    expect(localStorage.getItem(KEYS.visualizerPanels)).toBe('{"left":true,"right":false}');
  });

  it("ignores malformed stored values", () => {
    localStorage.setItem(KEYS.visualizerPanels, '{"left":"yes"}');
    expect(getVisualizerPanels()).toBeNull();
    localStorage.setItem(KEYS.visualizerPanels, "not json");
    expect(getVisualizerPanels()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run --project unit lib/storage/visualizer-prefs.test.ts`
Expected: FAIL — cannot resolve `./visualizer-prefs`.

- [ ] **Step 3: Implement**

In `lib/storage/keys.ts`, add inside `KEYS` (after `syncOutbox`):
```ts
  visualizerPanels: "wiki-visualizer-panels",
```

`lib/storage/visualizer-prefs.ts`:
```ts
import { KEYS } from "./keys";
import { getJSON, setJSON } from "./local";

export interface PanelPrefs {
  left: boolean;
  right: boolean;
}

export function getVisualizerPanels(): PanelPrefs | null {
  const v = getJSON<unknown>(KEYS.visualizerPanels, null);
  if (typeof v !== "object" || v === null) return null;
  const { left, right } = v as Record<string, unknown>;
  return typeof left === "boolean" && typeof right === "boolean" ? { left, right } : null;
}

export function setVisualizerPanels(prefs: PanelPrefs): void {
  setJSON(KEYS.visualizerPanels, prefs);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run --project unit lib/storage/visualizer-prefs.test.ts`
Expected: PASS (3 tests).

---

### Task 9: Design tokens + generic UI primitives

**Files:**
- Modify: `css/tokens.css` (append inside `:root`, right after `--diagram-cluster-stroke: var(--border);`)
- Modify: `css/wiki.css` (add the first visualizer import after `@import "./view-admin.css";`)
- Create: `css/view-visualizer/ui.css`
- Create: `components/visualizer/ui/ChoiceGroup.tsx`, `IconButton.tsx`, `Tabs.tsx`, `RichText.tsx`, `VarsTable.tsx`
- Test: `components/visualizer/ui/ui.test.tsx`

**Interfaces:**
- Consumes: `Rich` (Task 1), `VarRow` (Task 4).
- Produces:
  - `ChoiceGroup<T extends string | number>({ label, options: { value: T; label: string }[], value: T, onChange(v: T), variant?: "chips" | "segmented" })` — buttons with `aria-pressed`.
  - `IconButton({ label, onClick, children, variant?: "plain" | "primary", disabled? })` — `aria-label` + `title` = label.
  - `Tabs<T extends string>({ tabs: { id: T; label: string }[], active: T, onChange(id: T), idPrefix })` — `role="tablist"`, tab ids `${idPrefix}-tab-${id}`, controls `${idPrefix}-panel`.
  - `RichText({ value: Rich })`, `VarsTable({ now: VarRow[], before: VarRow[] | null })` — changed cells get `is-changed`.
  - CSS tokens: `--viz-hit`, `--viz-miss`, `--viz-evict`, `--viz-active`, `--viz-hit-bg`, `--viz-miss-bg`, `--viz-evict-bg`, `--viz-slot-bg`, `--viz-slot-border`, `--viz-on-accent`, `--viz-tracking`, `--viz-move`, `--viz-panel-left-w`, `--viz-panel-right-w`, `--viz-rail-w`, `--viz-cell-w`, `--viz-cell-gap`, `--viz-strip-cells`.

- [ ] **Step 1: Write the failing test**

`components/visualizer/ui/ui.test.tsx`:
```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { badText, keyText } from "@/lib/visualizer/core/rich";
import { ChoiceGroup } from "./ChoiceGroup";
import { IconButton } from "./IconButton";
import { RichText } from "./RichText";
import { Tabs } from "./Tabs";
import { VarsTable } from "./VarsTable";

describe("visualizer ui primitives", () => {
  it("ChoiceGroup marks the selected option and reports changes", () => {
    const onChange = vi.fn();
    render(
      <ChoiceGroup
        label="Policy"
        value="lru"
        onChange={onChange}
        options={[
          { value: "lru", label: "LRU" },
          { value: "fifo", label: "FIFO" },
        ]}
      />,
    );
    expect(screen.getByRole("group", { name: "Policy" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "LRU" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "FIFO" }));
    expect(onChange).toHaveBeenCalledWith("fifo");
  });

  it("ChoiceGroup works with numeric values", () => {
    const onChange = vi.fn();
    render(
      <ChoiceGroup
        label="Speed"
        variant="segmented"
        value={1}
        onChange={onChange}
        options={[
          { value: 0.5, label: "0.5×" },
          { value: 1, label: "1×" },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "0.5×" }));
    expect(onChange).toHaveBeenCalledWith(0.5);
  });

  it("IconButton exposes its label to assistive tech and hover", () => {
    const onClick = vi.fn();
    render(<IconButton label="Next request" onClick={onClick}>›</IconButton>);
    const btn = screen.getByRole("button", { name: "Next request" });
    expect(btn.getAttribute("title")).toBe("Next request");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("Tabs selects one tab and reports changes", () => {
    const onChange = vi.fn();
    render(
      <Tabs
        idPrefix="t"
        active="step"
        onChange={onChange}
        tabs={[
          { id: "step", label: "Step" },
          { id: "log", label: "Log" },
        ]}
      />,
    );
    expect(screen.getByRole("tab", { name: "Step" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "Log" }));
    expect(onChange).toHaveBeenCalledWith("log");
  });

  it("RichText renders tone classes", () => {
    const { container } = render(<RichText value={[keyText("F"), " ", badText("miss")]} />);
    expect(container.textContent).toBe("F miss");
    expect(container.querySelector(".viz-rich--key")?.textContent).toBe("F");
    expect(container.querySelector(".viz-rich--bad")?.textContent).toBe("miss");
  });

  it("VarsTable shows now/before and flags changed values", () => {
    render(
      <VarsTable
        now={[
          { name: "key", value: "F" },
          { name: "hits", value: "2" },
        ]}
        before={[
          { name: "key", value: "A" },
          { name: "hits", value: "2" },
        ]}
      />,
    );
    const keyRow = screen.getByRole("row", { name: /key/ });
    expect(keyRow.querySelector(".viz-vars__now")?.classList.contains("is-changed")).toBe(true);
    expect(keyRow.querySelector(".viz-vars__before")?.textContent).toBe("A");
    const hitsRow = screen.getByRole("row", { name: /hits/ });
    expect(hitsRow.querySelector(".viz-vars__now")?.classList.contains("is-changed")).toBe(false);
  });

  it("VarsTable with no previous frame shows dashes", () => {
    render(<VarsTable now={[{ name: "key", value: "A" }]} before={null} />);
    expect(screen.getByRole("row", { name: /key/ }).querySelector(".viz-vars__before")?.textContent).toBe("—");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run --project unit components/visualizer/ui/ui.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement components**

`components/visualizer/ui/ChoiceGroup.tsx`:
```tsx
interface ChoiceOption<T extends string | number> {
  value: T;
  label: string;
}

interface ChoiceGroupProps<T extends string | number> {
  label: string;
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: "chips" | "segmented";
}

export function ChoiceGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  variant = "chips",
}: ChoiceGroupProps<T>) {
  return (
    <div className={`viz-choice viz-choice--${variant}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={`viz-choice__btn${o.value === value ? " is-on" : ""}`}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

`components/visualizer/ui/IconButton.tsx`:
```tsx
import type { ReactNode } from "react";

interface IconButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
  variant?: "plain" | "primary";
  disabled?: boolean;
}

export function IconButton({ label, onClick, children, variant = "plain", disabled }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`viz-iconbtn viz-iconbtn--${variant}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
```

`components/visualizer/ui/Tabs.tsx`:
```tsx
interface TabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  idPrefix: string;
}

export function Tabs<T extends string>({ tabs, active, onChange, idPrefix }: TabsProps<T>) {
  return (
    <div className="viz-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${t.id}`}
          aria-selected={t.id === active}
          aria-controls={`${idPrefix}-panel`}
          className={`viz-tabs__tab${t.id === active ? " is-on" : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
```

`components/visualizer/ui/RichText.tsx`:
```tsx
import { Fragment } from "react";
import type { Rich } from "@/lib/visualizer/core/rich";

export function RichText({ value }: { value: Rich }) {
  return (
    <>
      {value.map((p, i) =>
        typeof p === "string" ? (
          // Parts are positional and never reorder, so the index is a stable key.
          <Fragment key={i}>{p}</Fragment>
        ) : (
          <span key={i} className={`viz-rich viz-rich--${p.tone}`}>
            {p.text}
          </span>
        ),
      )}
    </>
  );
}
```

`components/visualizer/ui/VarsTable.tsx`:
```tsx
import type { VarRow } from "@/lib/visualizer/core/types";

interface VarsTableProps {
  now: VarRow[];
  before: VarRow[] | null;
}

export function VarsTable({ now, before }: VarsTableProps) {
  const prev = new Map((before ?? []).map((r) => [r.name, r.value]));
  return (
    <div className="viz-vars">
      <table className="viz-vars__table">
        <thead>
          <tr>
            <th scope="col">name</th>
            <th scope="col">now</th>
            <th scope="col">before</th>
          </tr>
        </thead>
        <tbody>
          {now.map((r) => {
            const was = prev.get(r.name) ?? "—";
            return (
              <tr key={r.name}>
                <th scope="row">{r.name}</th>
                <td className={`viz-vars__now${was !== r.value ? " is-changed" : ""}`}>{r.value}</td>
                <td className="viz-vars__before">{was}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Add tokens**

In `css/tokens.css`, insert after `  --diagram-cluster-stroke: var(--border);` (still inside `:root`):
```css

  /* Visualizer roles — aliases only, so theme presets flow through */
  --viz-hit: var(--color-success);
  --viz-miss: var(--color-error);
  --viz-evict: var(--color-warning);
  --viz-active: var(--accent);
  --viz-hit-bg: color-mix(in srgb, var(--viz-hit) 16%, transparent);
  --viz-miss-bg: color-mix(in srgb, var(--viz-miss) 16%, transparent);
  --viz-evict-bg: color-mix(in srgb, var(--viz-evict) 16%, transparent);
  --viz-slot-bg: var(--surface-2);
  --viz-slot-border: var(--border-2);
  --viz-on-accent: #fff;
  --viz-tracking: 0.08em;
  --viz-move: 0.6s cubic-bezier(0.5, 0, 0.3, 1.15);
  --viz-panel-left-w: 256px;
  --viz-panel-right-w: 340px;
  --viz-rail-w: 48px;
  --viz-cell-w: 40px;
  --viz-cell-gap: 4px;
  --viz-strip-cells: 15;
```

- [ ] **Step 5: Add primitive styles**

`css/view-visualizer/ui.css`:
```css
/* ═══════════════════════════════════════════════
   VISUALIZER — SHARED UI PRIMITIVES
   ═══════════════════════════════════════════════ */
.viz-choice {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--s1);
}
.viz-choice__btn {
  padding: var(--s1) var(--s3);
  border: 1px solid var(--border-2);
  border-radius: var(--r-full);
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: var(--text-xs);
  font-weight: var(--fw-semibold);
  cursor: pointer;
  transition: background var(--t-fast), color var(--t-fast), border-color var(--t-fast);
}
.viz-choice__btn:hover:not(:disabled) {
  color: var(--text-heading);
}
.viz-choice__btn.is-on {
  background: var(--accent-dim);
  color: var(--accent-light);
  border-color: var(--accent);
}
.viz-choice__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.viz-choice--segmented {
  flex-wrap: nowrap;
  gap: 0;
  border: 1px solid var(--border-2);
  border-radius: var(--r-full);
  overflow: hidden;
  background: var(--surface);
}
.viz-choice--segmented .viz-choice__btn {
  border: 0;
  border-radius: 0;
}

.viz-iconbtn {
  width: var(--icon-btn-box);
  height: var(--icon-btn-box);
  flex: none;
  display: inline-grid;
  place-items: center;
  border: 1px solid var(--border-2);
  border-radius: var(--r-full);
  background: var(--surface-2);
  color: var(--text-heading);
  font-size: var(--text-sm);
  cursor: pointer;
}
.viz-iconbtn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.viz-iconbtn--primary {
  width: calc(var(--icon-btn-box) + var(--s1));
  height: calc(var(--icon-btn-box) + var(--s1));
  background: var(--accent);
  border-color: var(--accent);
  color: var(--viz-on-accent);
}

.viz-tabs {
  display: flex;
  gap: var(--s1);
  padding: 0 var(--s3);
  border-bottom: 1px solid var(--border);
}
.viz-tabs__tab {
  flex: 1;
  padding: var(--s2) var(--s1);
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: var(--fw-semibold);
  cursor: pointer;
}
.viz-tabs__tab.is-on {
  color: var(--accent-light);
  border-bottom-color: var(--accent);
}

.viz-rich--key {
  font-family: var(--font-mono);
  font-weight: var(--fw-extrabold);
  color: var(--text-heading);
}
.viz-rich--good {
  color: var(--viz-hit);
  font-weight: var(--fw-bold);
}
.viz-rich--bad {
  color: var(--viz-miss);
  font-weight: var(--fw-bold);
}
.viz-rich--warn {
  color: var(--viz-evict);
  font-weight: var(--fw-bold);
}
.viz-rich--muted {
  color: var(--text-subtle);
}

.viz-vars {
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
  background: var(--bg);
}
.viz-vars__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}
.viz-vars__table th,
.viz-vars__table td {
  padding: var(--s1) var(--s3);
  border-bottom: 1px solid var(--border);
  text-align: left;
  white-space: nowrap;
}
.viz-vars__table tr:last-child th,
.viz-vars__table tr:last-child td {
  border-bottom: 0;
}
.viz-vars__table thead th {
  background: var(--surface);
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: var(--fw-extrabold);
  letter-spacing: var(--viz-tracking);
  text-transform: uppercase;
}
.viz-vars__table tbody th {
  color: var(--text-muted);
  font-weight: var(--fw-semibold);
}
.viz-vars__now {
  font-family: var(--font-mono);
  font-weight: var(--fw-bold);
  color: var(--text-heading);
}
.viz-vars__now.is-changed {
  color: var(--accent-light);
}
.viz-vars__now.is-changed::after {
  content: " •";
  color: var(--accent);
}
.viz-vars__before {
  font-family: var(--font-mono);
  color: var(--text-subtle);
}

.viz-badge {
  padding: 2px var(--s2);
  border-radius: var(--r-full);
  font-size: var(--text-xs);
  font-weight: var(--fw-extrabold);
  letter-spacing: var(--viz-tracking);
  text-align: center;
}
.viz-badge--good {
  color: var(--viz-hit);
  background: var(--viz-hit-bg);
}
.viz-badge--bad {
  color: var(--viz-miss);
  background: var(--viz-miss-bg);
}
.viz-pill {
  padding: 2px var(--s2);
  border-radius: var(--r-full);
  background: var(--accent-dim);
  color: var(--accent-light);
  font-size: var(--text-xs);
  font-weight: var(--fw-extrabold);
  letter-spacing: var(--viz-tracking);
  text-transform: uppercase;
}
```

In `css/wiki.css`, add after `@import "./view-admin.css";`:
```css
@import "./view-visualizer/ui.css";
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run --project unit components/visualizer/ui/ui.test.tsx`
Expected: PASS (7 tests).

---

### Task 10: Hooks — playback clock, hotkeys, follow-scroll, URL sync, panel prefs, element size

**Files:**
- Create: `components/visualizer/hooks/usePlayback.ts`, `useVizHotkeys.ts`, `useFollowScroll.ts`, `useUrlSync.ts`, `usePanelPrefs.ts`, `useElementSize.ts`
- Test: `components/visualizer/hooks/usePlayback.test.tsx`, `useVizHotkeys.test.tsx`, `useFollowScroll.test.tsx`, `useUrlSync.test.tsx`, `usePanelPrefs.test.tsx`, `useElementSize.test.tsx`

**Interfaces:**
- Consumes: playback math (Task 3), `VizFrame` (Task 4), `encodeState` (Task 2), `getVisualizerPanels`/`setVisualizerPanels` (Task 8), `Size` (Task 3).
- Produces:
  - `Playback { frame; sub; playing; speed; seek(i); step(delta); toggle(); restart(); setSpeed(s) }`, `usePlayback(frames, initialFrame = 0): Playback` — `frame` is always clamped to the current run; `step` pauses; `seek` keeps the play state (paused seek shows the whole step); autoplay unless reduced motion.
  - `useVizHotkeys({ toggle, step })` — Space / ←/→, skipped while typing or modifier keys are held; Space skipped when a button/link/tab has focus.
  - `FOLLOW_IDLE_MS = 2000`, `useFollowScroll(wrapRef, index): { recenterNow(): void }` — cells carry `data-index`.
  - `useUrlSync(sections, values, frame, rotated)` — debounced 300 ms `history.replaceState`.
  - `PanelState { left; right; toggle(side) }`, `usePanelPrefs(): PanelState` — default `{ left: false, right: innerWidth < 1200 }`.
  - `useElementSize(ref): Size`.

- [ ] **Step 1: Write the failing tests**

`components/visualizer/hooks/usePlayback.test.tsx`:
```tsx
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SETTLE_MS, STEP_MS, TICK_MS } from "@/lib/visualizer/core/playback";
import type { VizFrame } from "@/lib/visualizer/core/types";
import { usePlayback } from "./usePlayback";

const frames = (n: number): VizFrame[] =>
  Array.from({ length: n }, (_, i) => ({
    index: i,
    label: "A",
    outcome: "bad",
    badge: "MISS",
    caption: [],
    lines: [[], [], [], []],
    path: [0, 2, 3],
    vars: [],
    logNote: [],
    metric: "0%",
    model: { kind: "ring", slots: [], hand: 0, turns: 0, cleared: [], active: null, tone: null },
  }));
const FRAME_MS = STEP_MS + SETTLE_MS + TICK_MS;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("usePlayback", () => {
  it("autoplays sub-steps, then moves to the next frame", () => {
    const run = frames(5);
    const { result } = renderHook(() => usePlayback(run));
    expect(result.current.playing).toBe(true);
    act(() => vi.advanceTimersByTime(STEP_MS / 3 + TICK_MS));
    expect(result.current.sub).toBe(1);
    act(() => vi.advanceTimersByTime(STEP_MS));
    expect(result.current.frame).toBe(1);
  });

  it("a backgrounded tab advances exactly one frame per tick", () => {
    const run = frames(5);
    const { result } = renderHook(() => usePlayback(run));
    act(() => {
      vi.setSystemTime(Date.now() + 60_000);
      vi.advanceTimersByTime(TICK_MS);
    });
    expect(result.current.frame).toBe(1);
  });

  it("stops at the last frame, and play restarts from the first", () => {
    const run = frames(2);
    const { result } = renderHook(() => usePlayback(run));
    act(() => vi.advanceTimersByTime(FRAME_MS * 3));
    expect(result.current.frame).toBe(1);
    expect(result.current.playing).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.frame).toBe(0);
    expect(result.current.playing).toBe(true);
  });

  it("step pauses and shows the whole step", () => {
    const run = frames(5);
    const { result } = renderHook(() => usePlayback(run));
    act(() => result.current.step(1));
    expect(result.current.playing).toBe(false);
    expect(result.current.frame).toBe(1);
    expect(result.current.sub).toBe(2);
    act(() => result.current.step(-5));
    expect(result.current.frame).toBe(0);
  });

  it("seek clamps and keeps playing", () => {
    const run = frames(5);
    const { result } = renderHook(() => usePlayback(run));
    act(() => result.current.seek(99));
    expect(result.current.frame).toBe(4);
    expect(result.current.playing).toBe(true);
    expect(result.current.sub).toBe(0);
  });

  it("clamps the initial frame and a frame left past the end of a shorter run", () => {
    const long = frames(10);
    const short = frames(3);
    const { result, rerender } = renderHook(({ run }) => usePlayback(run, 99), {
      initialProps: { run: long },
    });
    expect(result.current.frame).toBe(9);
    rerender({ run: short });
    expect(result.current.frame).toBe(2);
  });

  it("does not autoplay when the user prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") }));
    const run = frames(5);
    const { result } = renderHook(() => usePlayback(run));
    expect(result.current.playing).toBe(false);
  });

  it("restart jumps to the first frame and plays", () => {
    const run = frames(5);
    const { result } = renderHook(() => usePlayback(run));
    act(() => result.current.step(3));
    act(() => result.current.restart());
    expect(result.current.frame).toBe(0);
    expect(result.current.playing).toBe(true);
  });
});
```

`components/visualizer/hooks/useVizHotkeys.test.tsx`:
```tsx
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useVizHotkeys } from "./useVizHotkeys";

function Harness({ toggle, step }: { toggle: () => void; step: (d: number) => void }) {
  useVizHotkeys({ toggle, step });
  return (
    <div>
      <input aria-label="Sequence" />
      <button type="button">Play</button>
    </div>
  );
}

describe("useVizHotkeys", () => {
  it("Space toggles, arrows step", () => {
    const toggle = vi.fn();
    const step = vi.fn();
    render(<Harness toggle={toggle} step={step} />);
    fireEvent.keyDown(document.body, { key: " " });
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    expect(toggle).toHaveBeenCalledOnce();
    expect(step.mock.calls).toEqual([[1], [-1]]);
  });

  it("ignores keys while typing in a field", () => {
    const toggle = vi.fn();
    const step = vi.fn();
    const { getByLabelText } = render(<Harness toggle={toggle} step={step} />);
    fireEvent.keyDown(getByLabelText("Sequence"), { key: " " });
    fireEvent.keyDown(getByLabelText("Sequence"), { key: "ArrowRight" });
    expect(toggle).not.toHaveBeenCalled();
    expect(step).not.toHaveBeenCalled();
  });

  it("leaves Space to a focused button so playback doesn't toggle twice", () => {
    const toggle = vi.fn();
    const { getByRole } = render(<Harness toggle={toggle} step={vi.fn()} />);
    fireEvent.keyDown(getByRole("button", { name: "Play" }), { key: " " });
    expect(toggle).not.toHaveBeenCalled();
  });

  it("ignores keys with modifiers", () => {
    const step = vi.fn();
    render(<Harness toggle={vi.fn()} step={step} />);
    fireEvent.keyDown(document.body, { key: "ArrowRight", metaKey: true });
    expect(step).not.toHaveBeenCalled();
  });
});
```

`components/visualizer/hooks/useFollowScroll.test.tsx`:
```tsx
import { fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FOLLOW_IDLE_MS, useFollowScroll } from "./useFollowScroll";

let api: { recenterNow: () => void } | null = null;
function Harness({ index }: { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  api = useFollowScroll(ref, index);
  return (
    <div ref={ref} data-testid="wrap">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} data-index={i}>
          {i}
        </span>
      ))}
    </div>
  );
}

const scrollTo = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  scrollTo.mockClear();
  Object.defineProperty(HTMLElement.prototype, "offsetLeft", {
    configurable: true,
    get(this: HTMLElement) {
      return Number(this.dataset.index ?? 0) * 100;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 40 });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 300 });
  Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
});
afterEach(() => vi.useRealTimers());

describe("useFollowScroll", () => {
  it("centres the current cell, and follows index changes", () => {
    const { rerender } = render(<Harness index={2} />);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 70, behavior: "smooth" });
    rerender(<Harness index={3} />);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 170, behavior: "smooth" });
  });

  it("pauses while the user scrolls, then glides back after the idle time", () => {
    const { getByTestId, rerender } = render(<Harness index={1} />);
    fireEvent.wheel(getByTestId("wrap"));
    scrollTo.mockClear();
    rerender(<Harness index={4} />);
    expect(scrollTo).not.toHaveBeenCalled();
    vi.advanceTimersByTime(FOLLOW_IDLE_MS + 300);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 270, behavior: "smooth" });
  });

  it("recenterNow cancels the pause immediately", () => {
    const { getByTestId, rerender } = render(<Harness index={1} />);
    fireEvent.pointerDown(getByTestId("wrap"));
    scrollTo.mockClear();
    api?.recenterNow();
    rerender(<Harness index={2} />);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 70, behavior: "smooth" });
  });
});
```

`components/visualizer/hooks/useUrlSync.test.tsx`:
```tsx
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FieldSection } from "@/lib/visualizer/core/fields";
import { useUrlSync } from "./useUrlSync";

const SECTIONS: FieldSection[] = [
  { title: "", fields: [{ kind: "slider", key: "capacity", label: "Cache size", param: "c", min: 2, max: 8 }] },
];

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useUrlSync", () => {
  it("writes the encoded state after the debounce, replacing history", () => {
    const spy = vi.spyOn(window.history, "replaceState");
    const { rerender } = renderHook(({ frame }) => useUrlSync(SECTIONS, { capacity: 4 }, frame, true), {
      initialProps: { frame: 0 },
    });
    rerender({ frame: 2 });
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]?.[2]).toBe(`${window.location.pathname}?c=4&i=3&rot=1`);
  });
});
```

`components/visualizer/hooks/usePanelPrefs.test.tsx`:
```tsx
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getVisualizerPanels, setVisualizerPanels } from "@/lib/storage/visualizer-prefs";
import { usePanelPrefs } from "./usePanelPrefs";

const setWidth = (w: number) => Object.defineProperty(window, "innerWidth", { configurable: true, value: w });

beforeEach(() => localStorage.clear());
afterEach(() => setWidth(1024));

describe("usePanelPrefs", () => {
  it("starts with the right panel collapsed on narrow screens", () => {
    setWidth(1100);
    const { result } = renderHook(() => usePanelPrefs());
    expect(result.current).toMatchObject({ left: false, right: true });
  });

  it("starts expanded on wide screens", () => {
    setWidth(1440);
    const { result } = renderHook(() => usePanelPrefs());
    expect(result.current).toMatchObject({ left: false, right: false });
  });

  it("restores and persists the viewer's choice", () => {
    setVisualizerPanels({ left: true, right: false });
    const { result } = renderHook(() => usePanelPrefs());
    expect(result.current.left).toBe(true);
    act(() => result.current.toggle("left"));
    expect(result.current.left).toBe(false);
    expect(getVisualizerPanels()).toEqual({ left: false, right: false });
  });
});
```

`components/visualizer/hooks/useElementSize.test.tsx`:
```tsx
import { render } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { useElementSize } from "./useElementSize";

function Harness() {
  const ref = useRef<HTMLDivElement>(null);
  const size = useElementSize(ref);
  return (
    <div ref={ref} data-testid="box">
      {size.w}x{size.h}
    </div>
  );
}

describe("useElementSize", () => {
  it("reports the measured size", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 640,
      height: 360,
    } as DOMRect);
    const { getByTestId } = render(<Harness />);
    expect(getByTestId("box").textContent).toBe("640x360");
    vi.restoreAllMocks();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run --project unit components/visualizer/hooks`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`components/visualizer/hooks/usePlayback.ts`:
```ts
import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampFrame,
  elapsedForSub,
  isFrameDone,
  type Speed,
  subStepAt,
  TICK_MS,
} from "@/lib/visualizer/core/playback";
import type { VizFrame } from "@/lib/visualizer/core/types";

export interface Playback {
  frame: number;
  sub: number;
  playing: boolean;
  speed: Speed;
  seek: (i: number) => void;
  step: (delta: number) => void;
  toggle: () => void;
  restart: () => void;
  setSpeed: (speed: Speed) => void;
}

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function usePlayback(frames: VizFrame[], initialFrame = 0): Playback {
  const [rawFrame, setFrame] = useState(() => clampFrame(initialFrame, frames.length));
  const [sub, setSub] = useState(0);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [speed, setSpeedState] = useState<Speed>(1);
  const frame = clampFrame(rawFrame, frames.length);
  const startedAt = useRef(Date.now());
  // Interval and callbacks read the latest values without re-subscribing every render.
  const live = useRef({ frame, sub, playing, speed, frames });
  live.current = { frame, sub, playing, speed, frames };

  const seek = useCallback((i: number) => {
    const { frames: run, playing: isPlaying } = live.current;
    const f = clampFrame(i, run.length);
    setFrame(f);
    setSub(isPlaying ? 0 : Math.max(0, (run[f]?.path.length ?? 1) - 1));
    startedAt.current = Date.now();
  }, []);

  const step = useCallback(
    (delta: number) => {
      live.current.playing = false;
      setPlaying(false);
      seek(live.current.frame + delta);
    },
    [seek],
  );

  const restart = useCallback(() => {
    setFrame(0);
    setSub(0);
    setPlaying(true);
    startedAt.current = Date.now();
  }, []);

  const toggle = useCallback(() => {
    const { frame: f, sub: s, playing: isPlaying, speed: sp, frames: run } = live.current;
    if (isPlaying) {
      setPlaying(false);
      return;
    }
    const len = run[f]?.path.length ?? 1;
    if (f >= run.length - 1 && s >= len - 1) {
      restart();
      return;
    }
    startedAt.current = Date.now() - elapsedForSub(s, len, sp);
    setPlaying(true);
  }, [restart]);

  const setSpeed = useCallback((next: Speed) => {
    const elapsed = Date.now() - startedAt.current;
    startedAt.current = Date.now() - (elapsed * live.current.speed) / next;
    setSpeedState(next);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const { frame: f, speed: sp, frames: run } = live.current;
      const elapsed = Date.now() - startedAt.current;
      setSub(subStepAt(elapsed, run[f]?.path.length ?? 1, sp));
      if (!isFrameDone(elapsed, sp)) return;
      if (f >= run.length - 1) {
        setPlaying(false);
        return;
      }
      live.current.frame = f + 1;
      setFrame(f + 1);
      setSub(0);
      startedAt.current = Date.now();
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  return { frame, sub, playing, speed, seek, step, toggle, restart, setSpeed };
}
```

`components/visualizer/hooks/useVizHotkeys.ts`:
```ts
import { useEffect } from "react";
import type { Playback } from "./usePlayback";

const isEditable = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement &&
  (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT");

// A focused control already activates on Space; toggling here too would cancel it out.
const isActivatable = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement && t.closest("button, a, [role='tab']") !== null;

export function useVizHotkeys({ toggle, step }: Pick<Playback, "toggle" | "step">): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isEditable(e.target)) return;
      if (e.key === " ") {
        if (isActivatable(e.target)) return;
        e.preventDefault();
        toggle();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle, step]);
}
```

`components/visualizer/hooks/useFollowScroll.ts`:
```ts
import { type RefObject, useCallback, useEffect, useRef } from "react";

export const FOLLOW_IDLE_MS = 2000;
const POLL_MS = 250;
const USER_EVENTS = ["wheel", "touchstart", "touchmove", "pointerdown"] as const;

export function useFollowScroll(
  wrapRef: RefObject<HTMLElement | null>,
  index: number,
): { recenterNow: () => void } {
  const lastUser = useRef(Number.NEGATIVE_INFINITY);
  const indexRef = useRef(index);
  indexRef.current = index;

  const center = useCallback(() => {
    const wrap = wrapRef.current;
    const cell = wrap?.querySelector<HTMLElement>(`[data-index="${indexRef.current}"]`);
    if (!wrap || !cell || typeof wrap.scrollTo !== "function") return;
    const target = cell.offsetLeft + cell.offsetWidth / 2 - wrap.clientWidth / 2;
    if (Math.abs(wrap.scrollLeft - target) > 1) wrap.scrollTo({ left: target, behavior: "smooth" });
  }, [wrapRef]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const mark = () => {
      lastUser.current = Date.now();
    };
    for (const ev of USER_EVENTS) wrap.addEventListener(ev, mark, { passive: true });
    return () => {
      for (const ev of USER_EVENTS) wrap.removeEventListener(ev, mark);
    };
  }, [wrapRef]);

  useEffect(() => {
    if (Date.now() - lastUser.current > FOLLOW_IDLE_MS) center();
  }, [index, center]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (Date.now() - lastUser.current > FOLLOW_IDLE_MS) center();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [center]);

  const recenterNow = useCallback(() => {
    lastUser.current = Number.NEGATIVE_INFINITY;
  }, []);
  return { recenterNow };
}
```

`components/visualizer/hooks/useUrlSync.ts`:
```ts
import { useEffect } from "react";
import type { FieldSection, InputValues } from "@/lib/visualizer/core/fields";
import { encodeState } from "@/lib/visualizer/core/url-state";

const DEBOUNCE_MS = 300;

export function useUrlSync(
  sections: FieldSection[],
  values: InputValues,
  frame: number,
  rotated: boolean,
): void {
  useEffect(() => {
    const id = window.setTimeout(() => {
      const search = encodeState(sections, values, { frame, rotated });
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${search}`);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [sections, values, frame, rotated]);
}
```

`components/visualizer/hooks/usePanelPrefs.ts`:
```ts
import { useCallback, useState } from "react";
import {
  getVisualizerPanels,
  type PanelPrefs,
  setVisualizerPanels,
} from "@/lib/storage/visualizer-prefs";

const NARROW_PX = 1200;

export interface PanelState extends PanelPrefs {
  toggle: (side: keyof PanelPrefs) => void;
}

export function usePanelPrefs(): PanelState {
  const [prefs, setPrefs] = useState<PanelPrefs>(
    () => getVisualizerPanels() ?? { left: false, right: window.innerWidth < NARROW_PX },
  );
  const toggle = useCallback(
    (side: keyof PanelPrefs) => {
      const next = { ...prefs, [side]: !prefs[side] };
      setPrefs(next);
      setVisualizerPanels(next);
    },
    [prefs],
  );
  return { ...prefs, toggle };
}
```

`components/visualizer/hooks/useElementSize.ts`:
```ts
import { type RefObject, useLayoutEffect, useState } from "react";
import type { Size } from "@/lib/visualizer/core/geometry";

export function useElementSize(ref: RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize((s) => (s.w === r.width && s.h === r.height ? s : { w: r.width, h: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run --project unit components/visualizer/hooks`
Expected: PASS (20 tests).

---

### Task 11: Shapes — linear, histogram, ring

**Files:**
- Create: `components/visualizer/shapes/Shape.tsx`, `LinearShape.tsx`, `HistogramShape.tsx`, `RingShape.tsx`
- Create: `css/view-visualizer/stage.css` (stage + shapes)
- Modify: `css/wiki.css` (add `@import "./view-visualizer/stage.css";` after the `ui.css` import)
- Test: `components/visualizer/shapes/shapes.test.tsx`

**Interfaces:**
- Consumes: shape models + `resolveAxis` (Task 3), `linearLayout`, `Size` (Task 3).
- Produces: `Shape({ model: ShapeModel; rotated: boolean; size: Size })`, `LinearShape({ model, axis, size })`, `HistogramShape({ model, axis })`, `RingShape({ model })`. Every shape root has `role="img"` and an `aria-label` listing the cached keys. Block classes: `viz-blk` + `viz-blk--new` (+ `viz-blk--enter-{axis}`) / `viz-blk--hit` / `viz-blk--next` / `viz-blk--out`.

- [ ] **Step 1: Write the failing test**

`components/visualizer/shapes/shapes.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HistogramModel, LinearModel, RingModel } from "@/lib/visualizer/core/shapes";
import { HistogramShape } from "./HistogramShape";
import { LinearShape } from "./LinearShape";
import { RingShape } from "./RingShape";
import { Shape } from "./Shape";

const SIZE = { w: 800, h: 600 };
const linear: LinearModel = {
  kind: "linear",
  items: ["F", "A", "E", "D"],
  capacity: 4,
  next: "D",
  active: "F",
  tone: "new",
  evicted: "C",
  labels: { entry: "newest", exit: "next out" },
  defaultAxis: "vertical",
};

describe("LinearShape", () => {
  it("draws one block per key plus the leaving key, top to bottom", () => {
    const { container } = render(<LinearShape model={linear} axis="vertical" size={SIZE} />);
    const blocks = [...container.querySelectorAll<HTMLElement>(".viz-blk")];
    expect(blocks.map((b) => b.textContent)).toEqual(["F", "A", "E", "D", "C"]);
    const tops = blocks.slice(0, 4).map((b) => Number.parseFloat(b.style.top));
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    expect(screen.getByRole("img", { name: "Cache: F, A, E, D" })).toBeTruthy();
  });

  it("marks the new key, the next-out key and the evicted key", () => {
    const { container } = render(<LinearShape model={linear} axis="vertical" size={SIZE} />);
    const cls = (k: string) =>
      [...container.querySelectorAll(".viz-blk")].find((b) => b.textContent === k)?.className ?? "";
    expect(cls("F")).toContain("viz-blk--new");
    expect(cls("F")).toContain("viz-blk--enter-vertical");
    expect(cls("D")).toContain("viz-blk--next");
    expect(cls("C")).toContain("viz-blk--out");
    expect(cls("A")).toBe("viz-blk");
  });

  it("labels entry/exit with arrows that follow the axis", () => {
    const { rerender } = render(<LinearShape model={linear} axis="vertical" size={SIZE} />);
    expect(screen.getByText("newest")).toBeTruthy();
    expect(screen.getByText("next out ↓")).toBeTruthy();
    rerender(<LinearShape model={linear} axis="horizontal" size={SIZE} />);
    expect(screen.getByText("newest →")).toBeTruthy();
    expect(screen.getByText("→ next out")).toBeTruthy();
  });

  it("a hit is marked without the enter animation", () => {
    const { container } = render(
      <LinearShape model={{ ...linear, tone: "hit", evicted: null }} axis="vertical" size={SIZE} />,
    );
    const f = [...container.querySelectorAll(".viz-blk")].find((b) => b.textContent === "F");
    expect(f?.className).toBe("viz-blk viz-blk--hit");
  });
});

describe("HistogramShape", () => {
  const hist: HistogramModel = {
    kind: "histogram",
    slots: [{ key: "A", count: 3 }, { key: "E", count: 1 }, null, null],
    next: "E",
    active: "A",
    tone: "hit",
    defaultAxis: "vertical",
  };

  it("bar heights follow counts; empty slots stay empty; next-out is flagged", () => {
    const { container } = render(<HistogramShape model={hist} axis="vertical" />);
    const bars = [...container.querySelectorAll<HTMLElement>(".viz-hist__bar")];
    expect(bars.map((b) => b.style.height)).toEqual(["60%", "20%", "0%", "0%"]);
    expect(screen.getByText("next out")).toBeTruthy();
    expect(container.querySelector(".viz-hist__col--hit")?.textContent).toContain("A");
  });

  it("horizontal bars use width", () => {
    const { container } = render(<HistogramShape model={hist} axis="horizontal" />);
    expect(container.querySelector<HTMLElement>(".viz-hist__bar")?.style.width).toBe("60%");
  });

  it("a cache with no next-out shows no flag", () => {
    render(<HistogramShape model={{ ...hist, next: null }} axis="vertical" />);
    expect(screen.queryByText("next out")).toBeNull();
  });
});

describe("RingShape", () => {
  const ring: RingModel = {
    kind: "ring",
    slots: [{ key: "E", bit: 1 }, { key: "B", bit: 0 }, null, { key: "D", bit: 0 }],
    hand: 1,
    turns: 5,
    cleared: [3],
    active: 0,
    tone: "new",
  };

  it("draws every slot, bits, and rotates the hand by cumulative turns", () => {
    const { container } = render(<RingShape model={ring} />);
    expect(container.querySelectorAll(".viz-ring__slot")).toHaveLength(4);
    expect(container.querySelectorAll(".viz-ring__bit--1")).toHaveLength(1);
    expect(container.querySelectorAll(".viz-ring__bit--0")).toHaveLength(2);
    expect(container.querySelector<SVGGElement>(".viz-ring__hand")?.style.transform).toBe("rotate(450deg)");
    expect(container.querySelector(".viz-ring__slot--new")).toBeTruthy();
    expect(container.querySelector(".viz-ring__slot--cleared")).toBeTruthy();
  });
});

describe("Shape dispatcher", () => {
  it("rotation swaps the linear axis", () => {
    const { container, rerender } = render(<Shape model={linear} rotated={false} size={SIZE} />);
    expect(container.querySelector(".viz-linear")?.getAttribute("data-axis")).toBe("vertical");
    rerender(<Shape model={linear} rotated size={SIZE} />);
    expect(container.querySelector(".viz-linear")?.getAttribute("data-axis")).toBe("horizontal");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run --project unit components/visualizer/shapes/shapes.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`components/visualizer/shapes/LinearShape.tsx`:
```tsx
import type { CSSProperties } from "react";
import { linearLayout, type Point, type Size } from "@/lib/visualizer/core/geometry";
import type { Axis, LinearModel } from "@/lib/visualizer/core/shapes";

interface LinearShapeProps {
  model: LinearModel;
  axis: Axis;
  size: Size;
}

export function LinearShape({ model, axis, size }: LinearShapeProps) {
  const L = linearLayout(size, model.capacity, axis);
  const fontSize = Math.min(26, L.block.h * 0.42);
  const box = (p: Point): CSSProperties => ({
    left: p.x,
    top: p.y,
    width: L.block.w,
    height: L.block.h,
    fontSize,
  });
  const classOf = (key: string): string => {
    if (key === model.active && model.tone === "hit") return "viz-blk viz-blk--hit";
    if (key === model.active) return `viz-blk viz-blk--new viz-blk--enter-${axis}`;
    if (key === model.next) return "viz-blk viz-blk--next";
    return "viz-blk";
  };
  // The leaving key keeps its React key, so it slides from its slot to the exit.
  const blocks = model.items.map((key, i) => ({ key, style: box(L.slot(i)), className: classOf(key) }));
  if (model.evicted) {
    blocks.push({ key: model.evicted, style: box(L.exit), className: "viz-blk viz-blk--out" });
  }
  const entry = axis === "vertical" ? model.labels.entry : `${model.labels.entry} →`;
  const exit = axis === "vertical" ? `${model.labels.exit} ↓` : `→ ${model.labels.exit}`;
  return (
    <div className="viz-linear" data-axis={axis} role="img" aria-label={`Cache: ${model.items.join(", ")}`}>
      <div
        className={`viz-linear__frame viz-linear__frame--${axis}`}
        style={{ left: L.frame.x, top: L.frame.y, width: L.frame.w, height: L.frame.h }}
      />
      <span className="viz-linear__label" style={{ left: L.entryLabel.x, top: L.entryLabel.y }}>
        {entry}
      </span>
      <span
        className="viz-linear__label viz-linear__label--exit"
        style={{ left: L.exitLabel.x, top: L.exitLabel.y }}
      >
        {exit}
      </span>
      {blocks.map((b) => (
        <div key={b.key} className={b.className} style={b.style}>
          {b.key}
        </div>
      ))}
    </div>
  );
}
```

`components/visualizer/shapes/HistogramShape.tsx`:
```tsx
import type { Axis, HistogramModel } from "@/lib/visualizer/core/shapes";

const MIN_SCALE = 5;

interface HistogramShapeProps {
  model: HistogramModel;
  axis: Axis;
}

export function HistogramShape({ model, axis }: HistogramShapeProps) {
  const max = Math.max(MIN_SCALE, ...model.slots.map((s) => s?.count ?? 0));
  const keys = model.slots.flatMap((s) => (s ? [s.key] : []));
  return (
    <div className={`viz-hist viz-hist--${axis}`} role="img" aria-label={`Cache: ${keys.join(", ")}`}>
      {model.slots.map((s, i) => {
        const pct = s ? `${(Math.min(s.count, max) / max) * 100}%` : "0%";
        const isNext = s !== null && s.key === model.next;
        const tone = s && s.key === model.active ? ` viz-hist__col--${model.tone ?? "new"}` : "";
        return (
          // Slot position is the bar's identity: a replaced key reuses its slot.
          <div key={i} className={`viz-hist__col${tone}${isNext ? " viz-hist__col--next" : ""}`}>
            {isNext && <span className="viz-hist__flag">next out</span>}
            <span className="viz-hist__count">{s ? `${s.count}×` : ""}</span>
            <div className="viz-hist__track">
              <div className="viz-hist__bar" style={axis === "vertical" ? { height: pct } : { width: pct }} />
            </div>
            <span className="viz-hist__key">{s?.key ?? ""}</span>
          </div>
        );
      })}
    </div>
  );
}
```

`components/visualizer/shapes/RingShape.tsx`:
```tsx
import type { RingModel } from "@/lib/visualizer/core/shapes";

const C = 150;
const R = 100;
const SLOT_R = 32;

export function RingShape({ model }: { model: RingModel }) {
  const n = Math.max(1, model.slots.length);
  const at = (i: number) => {
    const a = ((i * 360) / n - 90) * (Math.PI / 180);
    return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
  };
  const keys = model.slots.flatMap((s) => (s ? [s.key] : []));
  return (
    <svg className="viz-ring" viewBox="0 0 300 300" role="img" aria-label={`Cache: ${keys.join(", ")}`}>
      <circle className="viz-ring__track" cx={C} cy={C} r={R} />
      {model.slots.map((s, i) => {
        const p = at(i);
        const state =
          i === model.active
            ? ` viz-ring__slot--${model.tone ?? "new"}`
            : model.cleared.includes(i)
              ? " viz-ring__slot--cleared"
              : "";
        return (
          // Slot position is the identity on a ring.
          <g key={i}>
            <circle className={`viz-ring__slot${state}`} cx={p.x} cy={p.y} r={SLOT_R} />
            {s && (
              <>
                <text className="viz-ring__key" x={p.x} y={p.y + 7} textAnchor="middle">
                  {s.key}
                </text>
                <circle className={`viz-ring__bit viz-ring__bit--${s.bit}`} cx={p.x + 28} cy={p.y - 24} r={7} />
                <text className="viz-ring__bitval" x={p.x + 39} y={p.y - 20}>
                  {s.bit}
                </text>
              </>
            )}
          </g>
        );
      })}
      {/* Cumulative turns keep the hand spinning forward across full sweeps. */}
      <g className="viz-ring__hand" style={{ transform: `rotate(${(model.turns * 360) / n}deg)` }}>
        <line x1={C} y1={C} x2={C} y2={C - 58} />
      </g>
      <circle className="viz-ring__hub" cx={C} cy={C} r={7} />
    </svg>
  );
}
```

`components/visualizer/shapes/Shape.tsx`:
```tsx
import type { Size } from "@/lib/visualizer/core/geometry";
import { resolveAxis, type ShapeModel } from "@/lib/visualizer/core/shapes";
import { HistogramShape } from "./HistogramShape";
import { LinearShape } from "./LinearShape";
import { RingShape } from "./RingShape";

interface ShapeProps {
  model: ShapeModel;
  rotated: boolean;
  size: Size;
}

export function Shape({ model, rotated, size }: ShapeProps) {
  if (model.kind === "ring") return <RingShape model={model} />;
  const axis = resolveAxis(model, rotated) ?? model.defaultAxis;
  if (model.kind === "linear") return <LinearShape model={model} axis={axis} size={size} />;
  return <HistogramShape model={model} axis={axis} />;
}
```

- [ ] **Step 4: Add stage + shape styles**

`css/view-visualizer/stage.css`:
```css
/* ═══════════════════════════════════════════════
   VISUALIZER — STAGE
   ═══════════════════════════════════════════════ */
.viz-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 40%, var(--surface-2), var(--bg) 75%);
}
.viz-stage__metric {
  position: absolute;
  top: var(--s3);
  right: var(--s4);
  z-index: var(--z-raised);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.viz-stage__metric-value {
  font-family: var(--font-mono);
  font-size: var(--text-2xl);
  font-weight: var(--fw-extrabold);
  line-height: 1;
  color: var(--text-heading);
}
.viz-stage__metric-label {
  font-size: var(--text-xs);
  font-weight: var(--fw-extrabold);
  letter-spacing: var(--viz-tracking);
  text-transform: uppercase;
  color: var(--text-muted);
}
.viz-stage__caption {
  position: absolute;
  left: var(--s4);
  right: var(--s4);
  bottom: var(--s4);
  z-index: var(--z-raised);
  margin: 0;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-heading);
  pointer-events: none;
}
.viz-rotate {
  position: absolute;
  right: var(--s4);
  bottom: var(--s4);
  z-index: var(--z-above);
  display: inline-flex;
  align-items: center;
  gap: var(--s1);
  padding: var(--s2) var(--s3);
  border: 1px solid var(--border-2);
  border-radius: var(--r-full);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur-sm);
  color: var(--text-heading);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: var(--fw-semibold);
  cursor: pointer;
}
.viz-rotate__glyph {
  display: inline-block;
  transition: transform var(--t-slow);
}
.viz-rotate.is-rotated .viz-rotate__glyph {
  transform: rotate(90deg);
}

/* ═══════════════════════════════════════════════
   VISUALIZER — LINEAR SHAPE (stack / queue)
   ═══════════════════════════════════════════════ */
.viz-linear {
  position: absolute;
  inset: 0;
}
.viz-linear__frame {
  position: absolute;
  border: 2px solid var(--border-2);
  transition: left var(--viz-move), top var(--viz-move), width var(--viz-move), height var(--viz-move);
}
.viz-linear__frame--vertical {
  border-top-color: transparent;
  border-bottom: 2px dashed var(--viz-evict);
  border-radius: 0 0 var(--r) var(--r);
}
.viz-linear__frame--horizontal {
  border-left-color: transparent;
  border-right: 2px dashed var(--viz-evict);
  border-radius: 0 var(--r) var(--r) 0;
}
.viz-linear__label {
  position: absolute;
  font-size: var(--text-xs);
  font-weight: var(--fw-extrabold);
  letter-spacing: var(--viz-tracking);
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--text-muted);
}
.viz-linear__label--exit {
  color: var(--viz-evict);
}
.viz-blk {
  position: absolute;
  display: grid;
  place-items: center;
  border: 2px solid var(--viz-slot-border);
  border-radius: var(--r);
  background: var(--viz-slot-bg);
  color: var(--text-heading);
  font-family: var(--font-mono);
  font-weight: var(--fw-extrabold);
  transition: left var(--viz-move), top var(--viz-move), width var(--t), height var(--t),
    opacity var(--t-slow), border-color var(--t), background var(--t);
}
.viz-blk--new {
  border-color: var(--viz-active);
  box-shadow: 0 0 0 4px var(--accent-dim);
}
.viz-blk--hit {
  border-color: var(--viz-hit);
  background: var(--viz-hit-bg);
}
.viz-blk--next {
  border-style: dashed;
  border-color: var(--viz-evict);
}
.viz-blk--out {
  border-color: var(--viz-evict);
  background: var(--viz-evict-bg);
  color: var(--viz-evict);
  opacity: 0;
}
.viz-blk--enter-vertical {
  animation: viz-enter-vertical var(--viz-move);
}
.viz-blk--enter-horizontal {
  animation: viz-enter-horizontal var(--viz-move);
}
@keyframes viz-enter-vertical {
  from {
    transform: translateY(-160px);
    opacity: 0;
  }
}
@keyframes viz-enter-horizontal {
  from {
    transform: translateX(-160px);
    opacity: 0;
  }
}

/* ═══════════════════════════════════════════════
   VISUALIZER — HISTOGRAM SHAPE
   ═══════════════════════════════════════════════ */
.viz-hist {
  position: absolute;
  inset: var(--s12) var(--s8) var(--s12);
  display: flex;
  gap: var(--s4);
}
.viz-hist__col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s1);
}
.viz-hist__track {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  border-bottom: 2px solid var(--border-2);
}
.viz-hist__bar {
  width: 100%;
  border: 2px solid var(--accent);
  border-radius: var(--r-sm) var(--r-sm) var(--r-xs) var(--r-xs);
  background: color-mix(in srgb, var(--accent) 40%, var(--surface-2));
  transition: height var(--viz-move), width var(--viz-move), background var(--t), border-color var(--t);
}
.viz-hist__count {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--fw-bold);
  color: var(--text-heading);
}
.viz-hist__key {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  font-weight: var(--fw-extrabold);
  color: var(--text-heading);
}
.viz-hist__flag {
  padding: 1px var(--s2);
  border-radius: var(--r-full);
  background: var(--viz-evict);
  color: var(--bg);
  font-size: var(--text-xs);
  font-weight: var(--fw-extrabold);
  letter-spacing: var(--viz-tracking);
  text-transform: uppercase;
}
.viz-hist__col--new .viz-hist__bar {
  box-shadow: 0 0 0 4px var(--accent-dim);
}
.viz-hist__col--hit .viz-hist__bar {
  border-color: var(--viz-hit);
  background: var(--viz-hit-bg);
}
.viz-hist__col--next .viz-hist__bar {
  border-style: dashed;
  border-color: var(--viz-evict);
  background: var(--viz-evict-bg);
}
.viz-hist--horizontal {
  flex-direction: column;
}
.viz-hist--horizontal .viz-hist__col {
  flex-direction: row;
}
.viz-hist--horizontal .viz-hist__key {
  order: -1;
  width: var(--s8);
}
.viz-hist--horizontal .viz-hist__track {
  height: 100%;
  align-items: stretch;
  border-bottom: 0;
  border-left: 2px solid var(--border-2);
}
.viz-hist--horizontal .viz-hist__bar {
  height: 100%;
  border-radius: var(--r-xs) var(--r-sm) var(--r-sm) var(--r-xs);
}

/* ═══════════════════════════════════════════════
   VISUALIZER — RING SHAPE
   ═══════════════════════════════════════════════ */
.viz-ring {
  position: absolute;
  top: var(--s8);
  left: 0;
  width: 100%;
  height: calc(100% - var(--s8) - var(--s12));
}
.viz-ring__track {
  fill: none;
  stroke: var(--border-2);
  stroke-width: 2;
  stroke-dasharray: 4 6;
}
.viz-ring__slot {
  fill: var(--viz-slot-bg);
  stroke: var(--viz-slot-border);
  stroke-width: 2;
  transition: fill var(--t), stroke var(--t);
}
.viz-ring__slot--new {
  stroke: var(--viz-active);
  stroke-width: 3;
}
.viz-ring__slot--hit {
  fill: var(--viz-hit-bg);
  stroke: var(--viz-hit);
}
.viz-ring__slot--cleared {
  stroke: var(--viz-evict);
  stroke-dasharray: 5 4;
}
.viz-ring__key {
  fill: var(--text-heading);
  font-family: var(--font-mono);
  font-size: var(--text-xl);
  font-weight: var(--fw-extrabold);
}
.viz-ring__bit--1 {
  fill: var(--accent);
}
.viz-ring__bit--0 {
  fill: transparent;
  stroke: var(--border-2);
  stroke-width: 1.5;
}
.viz-ring__bitval {
  fill: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--fw-bold);
}
.viz-ring__hand {
  stroke: var(--accent);
  stroke-width: 4;
  stroke-linecap: round;
  transform-box: view-box;
  transform-origin: 150px 150px;
  transition: transform var(--viz-move);
}
.viz-ring__hub {
  fill: var(--accent);
}

@media (prefers-reduced-motion: reduce) {
  .viz-blk,
  .viz-linear__frame,
  .viz-hist__bar,
  .viz-ring__hand {
    transition: none;
    animation: none;
  }
}
```

In `css/wiki.css`, add after `@import "./view-visualizer/ui.css";`:
```css
@import "./view-visualizer/stage.css";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run --project unit components/visualizer/shapes/shapes.test.tsx`
Expected: PASS (9 tests).

---

### Task 12: Frame — header, collapsible side panel, schema-driven config panel

**Files:**
- Create: `components/visualizer/frame/VizHeader.tsx`, `SidePanel.tsx`, `ConfigPanel.tsx`, `ConfigFields.tsx`
- Create: `css/view-visualizer/panels.css`
- Modify: `css/view-visualizer/ui.css` (append the `.viz-btn` block), `css/wiki.css` (add `@import "./view-visualizer/panels.css";` after the `stage.css` import)
- Test: `components/visualizer/frame/config.test.tsx`

**Interfaces:**
- Consumes: `ChoiceGroup`, `IconButton` (Task 9); field schema, `parseSequence` (Task 1); `formatSeed`, `randomSeed` (Task 1); `evictionModule.sections` (Task 7, test fixture only).
- Produces:
  - `VizHeader({ title, subtitle, articleHref, onCopyLink })` — Single/Compare (Compare disabled, title "Compare — coming soon"), "Read article" link, "Copy link" button.
  - `SidePanel({ side: "left" | "right", title, railLabel, railIcon, collapsed, onToggle, children })` — buttons named `Hide {railLabel}` / `Show {railLabel}`.
  - `ConfigPanel({ sections, values, sequence: string[], onChange(key, value) })` — first section's title is shown by `SidePanel`, later sections get a divider and a group heading (when titled).
  - `ConfigField({ field, value, sequence, onChange })`.

- [ ] **Step 1: Write the failing test**

`components/visualizer/frame/config.test.tsx`:
```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { evictionModule } from "@/lib/visualizer/eviction/module";
import { ConfigPanel } from "./ConfigPanel";
import { SidePanel } from "./SidePanel";
import { VizHeader } from "./VizHeader";

const VALUES = { policy: "lru", capacity: 4, pattern: "hot", length: 12, seed: 0x7f3a, sequence: null };
const SEQ = "ABCADEAFBAGC".split("");

describe("VizHeader", () => {
  it("shows title, a disabled Compare, the article link and Copy link", () => {
    const onCopy = vi.fn();
    render(
      <VizHeader
        title="Eviction policies"
        subtitle="What a full cache throws out — and why."
        articleHref="/system-design/components/caching/#lru-least-recently-used"
        onCopyLink={onCopy}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Eviction policies" })).toBeTruthy();
    const compare = screen.getByRole("button", { name: "Compare" });
    expect((compare as HTMLButtonElement).disabled).toBe(true);
    expect(compare.getAttribute("title")).toBe("Compare — coming soon");
    expect(screen.getByRole("link", { name: "Read article" }).getAttribute("href")).toBe(
      "/system-design/components/caching/#lru-least-recently-used",
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(onCopy).toHaveBeenCalledOnce();
  });
});

describe("SidePanel", () => {
  it("expanded shows content and a hide button; collapsed shows only the rail", () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <SidePanel side="left" title="Policy" railLabel="Configure" railIcon="⚙" collapsed={false} onToggle={onToggle}>
        <p>inside</p>
      </SidePanel>,
    );
    expect(screen.getByText("inside")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Policy" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Hide Configure" }));
    expect(onToggle).toHaveBeenCalledOnce();
    rerender(
      <SidePanel side="left" title="Policy" railLabel="Configure" railIcon="⚙" collapsed onToggle={onToggle}>
        <p>inside</p>
      </SidePanel>,
    );
    expect(screen.queryByText("inside")).toBeNull();
    expect(screen.getByRole("button", { name: "Show Configure" })).toBeTruthy();
  });
});

describe("ConfigPanel", () => {
  const setup = () => {
    const onChange = vi.fn();
    render(
      <ConfigPanel sections={evictionModule.sections} values={VALUES} sequence={SEQ} onChange={onChange} />,
    );
    return onChange;
  };

  it("renders policy chips without a duplicate visible label, plus the input group", () => {
    setup();
    expect(screen.getByRole("group", { name: "Policy" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Input" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "LRU" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("chips, sliders and the seed button report changes by field key", () => {
    const onChange = setup();
    fireEvent.click(screen.getByRole("button", { name: "FIFO" }));
    fireEvent.change(screen.getByLabelText("Cache size"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Scan" }));
    fireEvent.click(screen.getByRole("button", { name: "New random run" }));
    expect(onChange.mock.calls.slice(0, 3)).toEqual([
      ["policy", "fifo"],
      ["capacity", 6],
      ["pattern", "scan"],
    ]);
    expect(onChange.mock.calls[3]?.[0]).toBe("seed");
    expect(typeof onChange.mock.calls[3]?.[1]).toBe("number");
    expect(screen.getByText("7f3a")).toBeTruthy();
  });

  it("the sequence field shows the run and applies an edit on Enter", () => {
    const onChange = setup();
    const input = screen.getByLabelText("Sequence") as HTMLInputElement;
    expect(input.value).toBe("A B C A D E A F B A G C");
    fireEvent.change(input, { target: { value: "a b c" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("sequence", ["A", "B", "C"]);
  });

  it("an unusable sequence shows an error and changes nothing", () => {
    const onChange = setup();
    const input = screen.getByLabelText("Sequence");
    fireEvent.change(input, { target: { value: "123" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Use letters A–Z")).toBeTruthy();
  });

  it("the sequence draft resyncs when a new run arrives", () => {
    const { rerender } = render(
      <ConfigPanel sections={evictionModule.sections} values={VALUES} sequence={SEQ} onChange={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText("Sequence"), { target: { value: "zzz" } });
    rerender(
      <ConfigPanel sections={evictionModule.sections} values={VALUES} sequence={["Q", "R"]} onChange={vi.fn()} />,
    );
    expect((screen.getByLabelText("Sequence") as HTMLInputElement).value).toBe("Q R");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run --project unit components/visualizer/frame/config.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`components/visualizer/frame/VizHeader.tsx`:
```tsx
import Link from "next/link";

interface VizHeaderProps {
  title: string;
  subtitle: string;
  articleHref: string;
  onCopyLink: () => void;
}

export function VizHeader({ title, subtitle, articleHref, onCopyLink }: VizHeaderProps) {
  return (
    <header className="viz-head">
      <div className="viz-head__text">
        <h1 className="viz-head__title">{title}</h1>
        <p className="viz-head__sub">{subtitle}</p>
      </div>
      <div className="viz-head__actions">
        <div className="viz-choice viz-choice--segmented" role="group" aria-label="View">
          <button type="button" className="viz-choice__btn is-on" aria-pressed="true">
            Single
          </button>
          <button
            type="button"
            className="viz-choice__btn"
            aria-pressed="false"
            disabled
            title="Compare — coming soon"
          >
            Compare
          </button>
        </div>
        <Link className="viz-btn" href={articleHref}>
          <span aria-hidden="true">↗ </span>Read article
        </Link>
        <button type="button" className="viz-btn" onClick={onCopyLink}>
          <span aria-hidden="true">⧉ </span>Copy link
        </button>
      </div>
    </header>
  );
}
```

`components/visualizer/frame/SidePanel.tsx`:
```tsx
import type { ReactNode } from "react";
import { IconButton } from "../ui/IconButton";

interface SidePanelProps {
  side: "left" | "right";
  title: string;
  railLabel: string;
  railIcon: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function SidePanel({ side, title, railLabel, railIcon, collapsed, onToggle, children }: SidePanelProps) {
  return (
    <aside className={`viz-panel viz-panel--${side}${collapsed ? " is-collapsed" : ""}`} aria-label={railLabel}>
      {collapsed ? (
        <div className="viz-panel__rail">
          <IconButton label={`Show ${railLabel}`} onClick={onToggle}>
            {railIcon}
          </IconButton>
          <span className="viz-panel__rail-label" aria-hidden="true">
            {railLabel}
          </span>
        </div>
      ) : (
        <>
          <div className="viz-panel__head">
            <h2 className="viz-panel__title">{title}</h2>
            <IconButton label={`Hide ${railLabel}`} onClick={onToggle}>
              {side === "left" ? "«" : "»"}
            </IconButton>
          </div>
          <div className="viz-panel__body">{children}</div>
        </>
      )}
    </aside>
  );
}
```

`components/visualizer/frame/ConfigFields.tsx`:
```tsx
import { useEffect, useId, useState } from "react";
import {
  type ChipsField,
  type FieldSpec,
  type FieldValue,
  parseSequence,
  type SeedField,
  type SequenceField,
  type SliderField,
} from "@/lib/visualizer/core/fields";
import { formatSeed, randomSeed } from "@/lib/visualizer/core/rng";
import { ChoiceGroup } from "../ui/ChoiceGroup";

interface FieldProps<F extends FieldSpec> {
  field: F;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}

function ChipsInput({ field, value, onChange }: FieldProps<ChipsField>) {
  return (
    <div className="viz-field">
      {!field.hideLabel && <div className="viz-field__label">{field.label}</div>}
      <ChoiceGroup
        label={field.label}
        options={field.options}
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
      />
    </div>
  );
}

function SliderInput({ field, value, onChange }: FieldProps<SliderField>) {
  const id = useId();
  const v = typeof value === "number" ? value : field.min;
  return (
    <div className="viz-field">
      <div className="viz-field__row">
        <label className="viz-field__label" htmlFor={id}>
          {field.label}
        </label>
        <b className="viz-field__value">{v}</b>
      </div>
      <input
        id={id}
        className="viz-field__range"
        type="range"
        min={field.min}
        max={field.max}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function SequenceInput({
  field,
  sequence,
  onChange,
}: FieldProps<SequenceField> & { sequence: string[] }) {
  const id = useId();
  const joined = sequence.join(" ");
  const [draft, setDraft] = useState(joined);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    setDraft(joined);
    setInvalid(false);
  }, [joined]);
  return (
    <div className="viz-field">
      <label className="viz-field__label" htmlFor={id}>
        {field.label}
      </label>
      <input
        id={id}
        className="viz-field__seq"
        value={draft}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          const keys = parseSequence(draft, field.maxLen);
          if (!keys) {
            setInvalid(true);
            return;
          }
          onChange(keys);
        }}
      />
      <p className={`viz-field__hint${invalid ? " is-error" : ""}`}>{invalid ? "Use letters A–Z" : field.hint}</p>
    </div>
  );
}

function SeedInput({ field, value, onChange }: FieldProps<SeedField>) {
  return (
    <div className="viz-field">
      <div className="viz-field__label">{field.label}</div>
      <div className="viz-field__seed">
        <span className="viz-field__seed-value">{formatSeed(typeof value === "number" ? value : 0)}</span>
        <button type="button" className="viz-btn" onClick={() => onChange(randomSeed())}>
          <span aria-hidden="true">↻ </span>New random run
        </button>
      </div>
    </div>
  );
}

interface ConfigFieldProps {
  field: FieldSpec;
  value: FieldValue;
  sequence: string[];
  onChange: (value: FieldValue) => void;
}

export function ConfigField({ field, value, sequence, onChange }: ConfigFieldProps) {
  switch (field.kind) {
    case "chips":
      return <ChipsInput field={field} value={value} onChange={onChange} />;
    case "slider":
      return <SliderInput field={field} value={value} onChange={onChange} />;
    case "sequence":
      return <SequenceInput field={field} value={value} sequence={sequence} onChange={onChange} />;
    case "seed":
      return <SeedInput field={field} value={value} onChange={onChange} />;
  }
}
```

`components/visualizer/frame/ConfigPanel.tsx`:
```tsx
import type { FieldSection, FieldValue, InputValues } from "@/lib/visualizer/core/fields";
import { ConfigField } from "./ConfigFields";

interface ConfigPanelProps {
  sections: FieldSection[];
  values: InputValues;
  sequence: string[];
  onChange: (key: string, value: FieldValue) => void;
}

export function ConfigPanel({ sections, values, sequence, onChange }: ConfigPanelProps) {
  return (
    <div className="viz-config">
      {sections.map((s, i) => (
        <section key={s.title || `section-${i}`} className="viz-config__section" aria-label={s.title || undefined}>
          {i > 0 && <hr className="viz-config__divider" />}
          {i > 0 && s.title && <h3 className="viz-config__group">{s.title}</h3>}
          {s.fields.map((f) => (
            <ConfigField
              key={f.key}
              field={f}
              value={values[f.key] ?? null}
              sequence={sequence}
              onChange={(v) => onChange(f.key, v)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Add styles**

Append to `css/view-visualizer/ui.css`:
```css

.viz-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--s1);
  padding: var(--s1) var(--s3);
  border: 1px solid var(--border-2);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--text-body);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: var(--fw-semibold);
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}
.viz-btn:hover {
  color: var(--text-heading);
  border-color: var(--accent);
}
```

`css/view-visualizer/panels.css`:
```css
/* ═══════════════════════════════════════════════
   VISUALIZER — SIDE PANELS
   ═══════════════════════════════════════════════ */
.viz-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface);
}
.viz-panel--left {
  border-right: 1px solid var(--border);
}
.viz-panel--right {
  border-left: 1px solid var(--border);
}
.viz-panel__head {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--s2);
  padding: var(--s3) var(--s4) var(--s2);
}
.viz-panel__title {
  flex: 1;
  margin: 0;
  font-size: var(--text-xs);
  font-weight: var(--fw-extrabold);
  letter-spacing: var(--viz-tracking);
  text-transform: uppercase;
  color: var(--text-muted);
}
.viz-panel__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}
.viz-panel__rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s3);
  padding-top: var(--s3);
}
.viz-panel__rail-label {
  writing-mode: vertical-rl;
  font-size: var(--text-xs);
  font-weight: var(--fw-extrabold);
  letter-spacing: var(--viz-tracking);
  text-transform: uppercase;
  color: var(--text-muted);
}

/* ═══════════════════════════════════════════════
   VISUALIZER — CONFIG PANEL
   ═══════════════════════════════════════════════ */
.viz-config {
  padding: 0 var(--s4) var(--s4);
}
.viz-config__section {
  display: flex;
  flex-direction: column;
  gap: var(--s4);
}
.viz-config__divider {
  width: 100%;
  margin: var(--s4) 0 0;
  border: 0;
  border-top: 1px solid var(--border);
}
.viz-config__group {
  margin: 0;
  font-size: var(--text-xs);
  font-weight: var(--fw-extrabold);
  letter-spacing: var(--viz-tracking);
  text-transform: uppercase;
  color: var(--text-subtle);
}
.viz-field {
  display: flex;
  flex-direction: column;
  gap: var(--s2);
}
.viz-field__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.viz-field__label {
  font-size: var(--text-sm);
  font-weight: var(--fw-semibold);
  color: var(--text-body);
}
.viz-field__value {
  font-family: var(--font-mono);
  color: var(--accent-light);
}
.viz-field__range {
  width: 100%;
  accent-color: var(--accent);
}
.viz-field__seq {
  width: 100%;
  padding: var(--s2) var(--s3);
  border: 1px solid var(--border-2);
  border-radius: var(--r-sm);
  background: var(--surface-2);
  color: var(--text-heading);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  letter-spacing: var(--viz-tracking);
}
.viz-field__hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-subtle);
}
.viz-field__hint.is-error {
  color: var(--viz-miss);
}
.viz-field__seed {
  display: flex;
  align-items: center;
  gap: var(--s2);
}
.viz-field__seed-value {
  padding: var(--s1) var(--s2);
  border: 1px solid var(--border-2);
  border-radius: var(--r-sm);
  background: var(--surface-2);
  color: var(--text-heading);
  font-family: var(--font-mono);
  font-weight: var(--fw-bold);
}
```

In `css/wiki.css`, add after `@import "./view-visualizer/stage.css";`:
```css
@import "./view-visualizer/panels.css";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run --project unit components/visualizer/frame/config.test.tsx`
Expected: PASS (7 tests).

---

### Task 13: Frame — stage, playback bar, timeline strip, info panel

**Files:**
- Create: `components/visualizer/frame/Stage.tsx`, `PlaybackBar.tsx`, `TimelineStrip.tsx`, `InfoPanel.tsx`, `InfoTabs.tsx`
- Create: `css/view-visualizer/playback.css`
- Modify: `css/view-visualizer/panels.css` (append the info-panel block), `css/wiki.css` (add `@import "./view-visualizer/playback.css";` after the `panels.css` import)
- Test: `components/visualizer/frame/stage-playback.test.tsx`, `components/visualizer/frame/info.test.tsx`

**Interfaces:**
- Consumes: `useElementSize`, `useFollowScroll` (Task 10); `RichText`, `VarsTable`, `IconButton`, `ChoiceGroup`, `Tabs` (Task 9); `SPEEDS`, `Speed` (Task 3); `VizFrame`, `InfoContent`, `Experiment` (Task 4); `simulate`, `lru`, `evictionModule` (Tasks 5, 7 — test fixtures only).
- Produces:
  - `RotateControl { rotated; defaultName; onToggle }`, `Stage({ metric, metricLabel, caption, rotate: RotateControl | null, children(size) })` — renders children only once measured.
  - `PlaybackBar({ frame, total, unit, playing, speed, onSeek, onStep, onToggle, onSpeed })` — buttons `First {unit}`, `Previous {unit}`, `Play`/`Pause`, `Next {unit}`, `Last {unit}`; counter `{unit} {frame+1} / {total}`.
  - `TimelineStrip({ frames, current, unit, onSeek })` — cells named `{Unit} {n}: {label}[, hit|miss]`, current has `aria-current="step"`.
  - `InfoPanel({ info, frames, frame, sub, unit, onSeek, onTry })` with tabs Step / Log / About / Try.

- [ ] **Step 1: Write the failing tests**

`components/visualizer/frame/stage-playback.test.tsx`:
```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { badText, keyText } from "@/lib/visualizer/core/rich";
import { lru } from "@/lib/visualizer/eviction/policies/lru";
import { simulate } from "@/lib/visualizer/eviction/simulate";
import { PlaybackBar } from "./PlaybackBar";
import { Stage } from "./Stage";
import { TimelineStrip } from "./TimelineStrip";

const FRAMES = simulate(lru, 4, "ABCADEAFBAGC".split(""));

describe("Stage", () => {
  it("shows the metric and caption, and labels rotate by state", () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <Stage
        metric="25%"
        metricLabel="Hit rate"
        caption={[keyText("F"), " ", badText("miss")]}
        rotate={{ rotated: false, defaultName: "stack", onToggle }}
      >
        {() => <div>shape</div>}
      </Stage>,
    );
    expect(screen.getByText("25%")).toBeTruthy();
    expect(screen.getByText("Hit rate")).toBeTruthy();
    const btn = screen.getByRole("button", { name: "Rotate" });
    expect(btn.getAttribute("title")).toBe("Rotate 90°");
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledOnce();
    rerender(
      <Stage metric="25%" metricLabel="Hit rate" caption={[]} rotate={{ rotated: true, defaultName: "stack", onToggle }}>
        {() => <div>shape</div>}
      </Stage>,
    );
    expect(screen.getByRole("button", { name: "Default" }).getAttribute("title")).toBe(
      "Back to the default stack view",
    );
  });

  it("hides rotate for axis-less shapes and draws children once measured", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 500, height: 400 } as DOMRect);
    render(
      <Stage metric="0%" metricLabel="Hit rate" caption={[]} rotate={null}>
        {(size) => <div>{`${size.w}x${size.h}`}</div>}
      </Stage>,
    );
    expect(screen.queryByRole("button", { name: /Rotate|Default/ })).toBeNull();
    expect(screen.getByText("500x400")).toBeTruthy();
    vi.restoreAllMocks();
  });
});

describe("PlaybackBar", () => {
  it("counter, play/pause label and control callbacks", () => {
    const props = {
      frame: 2,
      total: 12,
      unit: "request",
      playing: true,
      speed: 1 as const,
      onSeek: vi.fn(),
      onStep: vi.fn(),
      onToggle: vi.fn(),
      onSpeed: vi.fn(),
    };
    render(<PlaybackBar {...props} />);
    expect(screen.getByText("request 3 / 12")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    fireEvent.click(screen.getByRole("button", { name: "First request" }));
    fireEvent.click(screen.getByRole("button", { name: "Last request" }));
    fireEvent.click(screen.getByRole("button", { name: "Next request" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous request" }));
    fireEvent.click(screen.getByRole("button", { name: "2×" }));
    expect(props.onToggle).toHaveBeenCalledOnce();
    expect(props.onSeek.mock.calls).toEqual([[0], [11]]);
    expect(props.onStep.mock.calls).toEqual([[1], [-1]]);
    expect(props.onSpeed).toHaveBeenCalledWith(2);
  });
});

describe("TimelineStrip", () => {
  it("colours played cells by outcome, marks the current one, and seeks on click", () => {
    const onSeek = vi.fn();
    render(<TimelineStrip frames={FRAMES} current={7} unit="request" onSeek={onSeek} />);
    expect(screen.getByRole("button", { name: "Request 4: A, hit" }).className).toContain("is-good");
    expect(screen.getByRole("button", { name: "Request 1: A, miss" }).className).toContain("is-bad");
    const current = screen.getByRole("button", { name: "Request 8: F" });
    expect(current.getAttribute("aria-current")).toBe("step");
    expect(current.className).toContain("is-current");
    expect(screen.getByRole("button", { name: "Request 9: B" }).className).toBe("viz-strip__cell");
    fireEvent.click(screen.getByRole("button", { name: "Request 2: B, miss" }));
    expect(onSeek).toHaveBeenCalledWith(1);
  });
});
```

`components/visualizer/frame/info.test.tsx`:
```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { evictionModule } from "@/lib/visualizer/eviction/module";
import { InfoPanel } from "./InfoPanel";

const RUN = evictionModule.run({ ...evictionModule.defaults(), sequence: "ABCADEAFBAGC".split("") });

const renderPanel = (frame: number, sub: number, extra: Partial<{ onSeek: () => void; onTry: () => void }> = {}) =>
  render(
    <InfoPanel
      info={RUN.info}
      frames={RUN.frames}
      frame={frame}
      sub={sub}
      unit="request"
      onSeek={extra.onSeek ?? vi.fn()}
      onTry={extra.onTry ?? vi.fn()}
    />,
  );

describe("InfoPanel", () => {
  it("shows the policy summary on top", () => {
    renderPanel(7, 0);
    expect(screen.getByRole("heading", { name: "LRU" })).toBeTruthy();
    expect(screen.getByText("Stack")).toBeTruthy();
    expect(screen.getByText("Throw out whatever was used longest ago.")).toBeTruthy();
  });

  it("Step tab: current line, lines already run, and the branch not taken", () => {
    const { container } = renderPanel(7, 1);
    const lines = [...container.querySelectorAll(".viz-steps__line")];
    expect(lines.map((l) => l.className.replace("viz-steps__line viz-steps__line--", ""))).toEqual([
      "ran",
      "skip",
      "now",
      "todo",
    ]);
    expect(lines[2]?.textContent).toBe("No → miss. Full → remove C from the bottom.");
    expect(screen.getByRole("row", { name: /removed/ }).textContent).toContain("C");
  });

  it("Log tab lists requests so far and seeks on click", () => {
    const onSeek = vi.fn();
    renderPanel(7, 0, { onSeek });
    fireEvent.click(screen.getByRole("tab", { name: "Log" }));
    const rows = screen.getAllByRole("button", { name: /^#\d+/ });
    expect(rows).toHaveLength(8);
    expect(rows[7]?.textContent).toContain("removed C");
    fireEvent.click(rows[3] as HTMLElement);
    expect(onSeek).toHaveBeenCalledWith(3);
  });

  it("About and Try tabs; Try runs an experiment", () => {
    const onTry = vi.fn();
    renderPanel(7, 0, { onTry });
    fireEvent.click(screen.getByRole("tab", { name: "About" }));
    expect(screen.getByText("O(1) per request — hashmap + doubly linked list")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Try" }));
    fireEvent.click(screen.getAllByRole("button", { name: /Run/ })[0] as HTMLElement);
    expect(onTry).toHaveBeenCalledWith(RUN.info.tries[0]);
  });

  it("keeps the chosen tab while playback moves on", () => {
    const { rerender } = renderPanel(7, 0);
    fireEvent.click(screen.getByRole("tab", { name: "About" }));
    rerender(
      <InfoPanel info={RUN.info} frames={RUN.frames} frame={8} sub={0} unit="request" onSeek={vi.fn()} onTry={vi.fn()} />,
    );
    expect(screen.getByRole("tab", { name: "About" }).getAttribute("aria-selected")).toBe("true");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run --project unit components/visualizer/frame/stage-playback.test.tsx components/visualizer/frame/info.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`components/visualizer/frame/Stage.tsx`:
```tsx
import { type ReactNode, useRef } from "react";
import type { Size } from "@/lib/visualizer/core/geometry";
import type { Rich } from "@/lib/visualizer/core/rich";
import { useElementSize } from "../hooks/useElementSize";
import { RichText } from "../ui/RichText";

export interface RotateControl {
  rotated: boolean;
  defaultName: string;
  onToggle: () => void;
}

interface StageProps {
  metric: string;
  metricLabel: string;
  caption: Rich;
  rotate: RotateControl | null;
  children: (size: Size) => ReactNode;
}

export function Stage({ metric, metricLabel, caption, rotate, children }: StageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const size = useElementSize(ref);
  return (
    <div className="viz-stage" ref={ref}>
      <div className="viz-stage__metric">
        <span className="viz-stage__metric-value">{metric}</span>
        <span className="viz-stage__metric-label">{metricLabel}</span>
      </div>
      {size.w > 0 && size.h > 0 && children(size)}
      <p className="viz-stage__caption" aria-live="polite">
        <RichText value={caption} />
      </p>
      {rotate && (
        <button
          type="button"
          className={`viz-rotate${rotate.rotated ? " is-rotated" : ""}`}
          title={rotate.rotated ? `Back to the default ${rotate.defaultName} view` : "Rotate 90°"}
          onClick={rotate.onToggle}
        >
          <span className="viz-rotate__glyph" aria-hidden="true">
            ⤾
          </span>
          {rotate.rotated ? "Default" : "Rotate"}
        </button>
      )}
    </div>
  );
}
```

`components/visualizer/frame/PlaybackBar.tsx`:
```tsx
import { SPEEDS, type Speed } from "@/lib/visualizer/core/playback";
import { ChoiceGroup } from "../ui/ChoiceGroup";
import { IconButton } from "../ui/IconButton";

interface PlaybackBarProps {
  frame: number;
  total: number;
  unit: string;
  playing: boolean;
  speed: Speed;
  onSeek: (i: number) => void;
  onStep: (delta: number) => void;
  onToggle: () => void;
  onSpeed: (speed: Speed) => void;
}

const SPEED_OPTIONS = SPEEDS.map((s) => ({ value: s, label: `${s}×` }));

export function PlaybackBar({ frame, total, unit, playing, speed, onSeek, onStep, onToggle, onSpeed }: PlaybackBarProps) {
  return (
    <div className="viz-playback">
      <span className="viz-playback__count">
        {unit} {frame + 1} / {total}
      </span>
      <div className="viz-playback__controls">
        <IconButton label={`First ${unit}`} onClick={() => onSeek(0)}>
          ⏮
        </IconButton>
        <IconButton label={`Previous ${unit}`} onClick={() => onStep(-1)}>
          ‹
        </IconButton>
        <IconButton label={playing ? "Pause" : "Play"} variant="primary" onClick={onToggle}>
          {playing ? "❚❚" : "▶"}
        </IconButton>
        <IconButton label={`Next ${unit}`} onClick={() => onStep(1)}>
          ›
        </IconButton>
        <IconButton label={`Last ${unit}`} onClick={() => onSeek(total - 1)}>
          ⏭
        </IconButton>
      </div>
      <div className="viz-playback__speed">
        <ChoiceGroup label="Speed" variant="segmented" options={SPEED_OPTIONS} value={speed} onChange={onSpeed} />
      </div>
    </div>
  );
}
```

`components/visualizer/frame/TimelineStrip.tsx`:
```tsx
import { useRef } from "react";
import type { VizFrame } from "@/lib/visualizer/core/types";
import { useFollowScroll } from "../hooks/useFollowScroll";

interface TimelineStripProps {
  frames: VizFrame[];
  current: number;
  unit: string;
  onSeek: (i: number) => void;
}

export function TimelineStrip({ frames, current, unit, onSeek }: TimelineStripProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { recenterNow } = useFollowScroll(wrapRef, current);
  const Unit = unit.charAt(0).toUpperCase() + unit.slice(1);
  return (
    <div className="viz-strip" ref={wrapRef}>
      <div className="viz-strip__track">
        {frames.map((f) => {
          const played = f.index < current;
          const state = f.index === current ? " is-current" : played ? ` is-${f.outcome}` : "";
          return (
            <button
              key={f.index}
              type="button"
              data-index={f.index}
              className={`viz-strip__cell${state}`}
              aria-label={`${Unit} ${f.index + 1}: ${f.label}${played ? `, ${f.badge.toLowerCase()}` : ""}`}
              aria-current={f.index === current ? "step" : undefined}
              onClick={() => {
                recenterNow();
                onSeek(f.index);
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

`components/visualizer/frame/InfoTabs.tsx`:
```tsx
import { memo } from "react";
import type { Experiment, VizFrame } from "@/lib/visualizer/core/types";
import { RichText } from "../ui/RichText";
import { VarsTable } from "../ui/VarsTable";

type LineState = "now" | "ran" | "todo" | "skip";

function lineState(frame: VizFrame, line: number, sub: number): LineState {
  const pos = frame.path.indexOf(line);
  if (pos === -1) return "skip";
  const at = Math.min(sub, frame.path.length - 1);
  if (pos === at) return "now";
  return pos < at ? "ran" : "todo";
}

interface StepTabProps {
  frame: VizFrame;
  prev: VizFrame | null;
  sub: number;
  unit: string;
}

export function StepTab({ frame, prev, sub, unit }: StepTabProps) {
  return (
    <>
      <h4 className="viz-info__label">Each {unit} runs</h4>
      <div className="viz-steps">
        <p className="viz-steps__head">
          for each {unit} → <span className="viz-rich viz-rich--key">{frame.label}</span>
        </p>
        <ol className="viz-steps__list">
          {frame.lines.map((line, i) => {
            const state = lineState(frame, i, sub);
            return (
              // Lines are a fixed template, so position is the identity.
              <li
                key={i}
                className={`viz-steps__line viz-steps__line--${state}`}
                aria-current={state === "now" ? "step" : undefined}
              >
                <RichText value={line} />
              </li>
            );
          })}
        </ol>
      </div>
      <h4 className="viz-info__label">Variables</h4>
      <VarsTable now={frame.vars} before={prev?.vars ?? null} />
    </>
  );
}

interface LogTabProps {
  frames: VizFrame[];
  current: number;
  onSeek: (i: number) => void;
}

export function LogTab({ frames, current, onSeek }: LogTabProps) {
  return (
    <ol className="viz-log">
      {frames.slice(0, current + 1).map((f) => (
        <li key={f.index}>
          <button
            type="button"
            className={`viz-log__row${f.index === current ? " is-current" : ""}`}
            onClick={() => onSeek(f.index)}
          >
            <span className="viz-log__n">#{f.index + 1}</span>
            <span className="viz-rich viz-rich--key">{f.label}</span>
            <span className={`viz-badge viz-badge--${f.outcome}`}>{f.badge}</span>
            <span className="viz-log__note">
              <RichText value={f.logNote} />
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

export const AboutTab = memo(function AboutTab({ about }: { about: [string, string][] }) {
  return (
    <dl className="viz-about">
      {about.map(([term, detail]) => (
        <div key={term} className="viz-about__row">
          <dt>{term}</dt>
          <dd>{detail}</dd>
        </div>
      ))}
    </dl>
  );
});

interface TryTabProps {
  tries: Experiment[];
  onTry: (e: Experiment) => void;
}

export const TryTab = memo(function TryTab({ tries, onTry }: TryTabProps) {
  return (
    <>
      <h4 className="viz-info__label">Guided experiments — sets the inputs for you</h4>
      {tries.map((t) => (
        <div key={t.title} className="viz-try">
          <h5 className="viz-try__title">{t.title}</h5>
          <p className="viz-try__blurb">{t.blurb}</p>
          <button type="button" className="viz-btn" onClick={() => onTry(t)}>
            Run <span aria-hidden="true">▶</span>
          </button>
        </div>
      ))}
    </>
  );
});
```

`components/visualizer/frame/InfoPanel.tsx`:
```tsx
import { useId, useState } from "react";
import type { Experiment, InfoContent, VizFrame } from "@/lib/visualizer/core/types";
import { Tabs } from "../ui/Tabs";
import { AboutTab, LogTab, StepTab, TryTab } from "./InfoTabs";

type TabId = "step" | "log" | "about" | "try";
const TABS: { id: TabId; label: string }[] = [
  { id: "step", label: "Step" },
  { id: "log", label: "Log" },
  { id: "about", label: "About" },
  { id: "try", label: "Try" },
];

interface InfoPanelProps {
  info: InfoContent;
  frames: VizFrame[];
  frame: number;
  sub: number;
  unit: string;
  onSeek: (i: number) => void;
  onTry: (e: Experiment) => void;
}

export function InfoPanel({ info, frames, frame, sub, unit, onSeek, onTry }: InfoPanelProps) {
  const [tab, setTab] = useState<TabId>("step");
  const id = useId();
  const current = frames[frame];
  return (
    <div className="viz-info">
      <div className="viz-info__top">
        <div className="viz-info__name">
          <h3>{info.name}</h3>
          <span className="viz-pill">{info.chip}</span>
        </div>
        <p className="viz-info__rule">{info.rule}</p>
      </div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} idPrefix={id} />
      <div className="viz-info__body" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`}>
        {tab === "step" && current && (
          <StepTab frame={current} prev={frames[frame - 1] ?? null} sub={sub} unit={unit} />
        )}
        {tab === "log" && <LogTab frames={frames} current={frame} onSeek={onSeek} />}
        {tab === "about" && <AboutTab about={info.about} />}
        {tab === "try" && <TryTab tries={info.tries} onTry={onTry} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add styles**

`css/view-visualizer/playback.css`:
```css
/* ═══════════════════════════════════════════════
   VISUALIZER — PLAYBACK FOOTER
   ═══════════════════════════════════════════════ */
.viz-foot {
  flex: none;
  border-top: 1px solid var(--border);
  background: var(--surface);
}
.viz-playback {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--s3);
  padding: var(--s2) var(--s4);
  border-bottom: 1px solid var(--border);
}
.viz-playback__count {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-muted);
  white-space: nowrap;
}
.viz-playback__controls {
  display: flex;
  align-items: center;
  gap: var(--s2);
}
.viz-playback__speed {
  justify-self: end;
}

/* ═══════════════════════════════════════════════
   VISUALIZER — TIMELINE STRIP
   ═══════════════════════════════════════════════ */
.viz-strip {
  position: relative;
  max-width: calc(var(--viz-strip-cells) * (var(--viz-cell-w) + var(--viz-cell-gap)));
  margin: 0 auto;
  overflow-x: auto;
  scrollbar-width: thin;
  mask-image: linear-gradient(to right, transparent, #000 10%, #000 90%, transparent);
}
.viz-strip__track {
  display: flex;
  gap: var(--viz-cell-gap);
  width: max-content;
  /* Half-width padding lets the first and last cells reach the centre. */
  padding: var(--s2) calc(50% - var(--viz-cell-w) / 2) var(--s3);
}
.viz-strip__cell {
  flex: none;
  width: var(--viz-cell-w);
  height: var(--icon-btn-box);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--fw-extrabold);
  cursor: pointer;
}
.viz-strip__cell.is-good {
  border-color: var(--viz-hit);
  background: var(--viz-hit-bg);
  color: var(--viz-hit);
}
.viz-strip__cell.is-bad {
  border-color: var(--viz-miss);
  background: var(--viz-miss-bg);
  color: var(--viz-miss);
}
.viz-strip__cell.is-current {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--viz-on-accent);
}
```

Append to `css/view-visualizer/panels.css`:
```css

/* ═══════════════════════════════════════════════
   VISUALIZER — INFO PANEL
   ═══════════════════════════════════════════════ */
.viz-info {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.viz-info__top {
  flex: none;
  padding: 0 var(--s4) var(--s4);
  border-bottom: 1px solid var(--border);
}
.viz-info__name {
  display: flex;
  align-items: center;
  gap: var(--s2);
}
.viz-info__name h3 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--fw-extrabold);
  color: var(--text-heading);
}
.viz-info__rule {
  margin: var(--s1) 0 0;
  font-size: var(--text-sm);
  color: var(--text-heading);
}
.viz-info__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: var(--s3);
  padding: var(--s3) var(--s4) var(--s4);
}
.viz-info__label {
  margin: 0;
  font-size: var(--text-xs);
  font-weight: var(--fw-extrabold);
  letter-spacing: var(--viz-tracking);
  text-transform: uppercase;
  color: var(--text-muted);
}
.viz-steps {
  padding: var(--s2) 0;
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--bg);
}
.viz-steps__head {
  margin: 0;
  padding: 0 var(--s3) var(--s1);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
}
.viz-steps__list {
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: viz-step;
}
.viz-steps__line {
  counter-increment: viz-step;
  display: grid;
  grid-template-columns: var(--s5) 1fr;
  padding: var(--s1) var(--s3) var(--s1) var(--s2);
  border-left: 3px solid transparent;
  font-size: var(--text-sm);
  color: var(--text-subtle);
}
.viz-steps__line::before {
  content: counter(viz-step);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}
.viz-steps__line--ran {
  color: var(--text-body);
}
.viz-steps__line--now {
  border-left-color: var(--accent);
  background: var(--accent-dim);
  color: var(--text-heading);
}
.viz-steps__line--skip {
  text-decoration: line-through;
}
.viz-log {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
  background: var(--bg);
}
.viz-log__row {
  width: 100%;
  display: grid;
  grid-template-columns: var(--s8) var(--s6) var(--s12) 1fr;
  align-items: center;
  gap: var(--s2);
  padding: var(--s1) var(--s3);
  border: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  color: var(--text-body);
  font: inherit;
  font-size: var(--text-sm);
  text-align: left;
  cursor: pointer;
}
.viz-log li:last-child .viz-log__row {
  border-bottom: 0;
}
.viz-log__row.is-current {
  background: var(--accent-dim);
}
.viz-log__n {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-subtle);
}
.viz-about {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--s3);
  font-size: var(--text-sm);
}
.viz-about__row {
  display: grid;
  grid-template-columns: var(--s20) 1fr;
  gap: var(--s2);
}
.viz-about dt {
  color: var(--text-muted);
  font-weight: var(--fw-semibold);
}
.viz-about dd {
  margin: 0;
  color: var(--text-heading);
}
.viz-try {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--s1);
  padding: var(--s3);
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--bg);
}
.viz-try__title {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-heading);
}
.viz-try__blurb {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}
```

In `css/wiki.css`, add after `@import "./view-visualizer/panels.css";`:
```css
@import "./view-visualizer/playback.css";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run --project unit components/visualizer/frame/stage-playback.test.tsx components/visualizer/frame/info.test.tsx`
Expected: PASS (9 tests).

---

### Task 14: VisualizerApp root + page layout

**Files:**
- Create: `components/visualizer/frame/VisualizerApp.tsx`, `css/view-visualizer/layout.css`
- Modify: `css/tokens.css` (add `--viz-stage-narrow-h: 380px;` after `--viz-strip-cells: 15;`), `css/wiki.css` (add `@import "./view-visualizer/layout.css";` after the `playback.css` import), `css/responsive.css` (append a VISUALIZER section at the end)
- Test: `components/visualizer/frame/VisualizerApp.test.tsx`

**Interfaces:**
- Consumes: everything above; `MODULES` (Task 7); `writeToClipboard` (`lib/clipboard.ts`); `showToast` (`lib/toast.ts`).
- Produces: `VisualizerApp({ slug }: { slug: string })` (client component). Boots from `window.location.search` after mount (renders an `aria-busy` placeholder first, so static HTML never contains a random seed); any input change or Try restarts playback from request 1 and plays.

- [ ] **Step 1: Write the failing test**

`components/visualizer/frame/VisualizerApp.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/clipboard", () => ({ writeToClipboard: vi.fn() }));
vi.mock("@/lib/toast", () => ({ showToast: vi.fn() }));

import { writeToClipboard } from "@/lib/clipboard";
import { showToast } from "@/lib/toast";
import { VisualizerApp } from "./VisualizerApp";

const at = (search: string) => window.history.replaceState(null, "", `/visualizer/eviction-policies/${search}`);

beforeEach(() => {
  localStorage.clear();
  vi.mocked(writeToClipboard).mockReset();
  vi.mocked(showToast).mockReset();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
});

describe("VisualizerApp", () => {
  it("boots from the URL: policy, sequence and step", () => {
    at("?p=fifo&q=ABCADEAFBAGC&i=8");
    render(<VisualizerApp slug="eviction-policies" />);
    expect(screen.getByRole("heading", { level: 1, name: "Eviction policies" })).toBeTruthy();
    expect(screen.getByText("request 8 / 12")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "FIFO" })).toBeTruthy();
  });

  it("controls move through the run", () => {
    at("?q=ABCADEAFBAGC&i=8");
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("button", { name: "Next request" }));
    expect(screen.getByText("request 9 / 12")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Request 3: C, miss" }));
    expect(screen.getByText("request 3 / 12")).toBeTruthy();
  });

  it("changing an input rebuilds the run and restarts", () => {
    at("?q=ABCADEAFBAGC&i=8");
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("button", { name: "CLOCK" }));
    expect(screen.getByRole("heading", { name: "CLOCK" })).toBeTruthy();
    expect(screen.getByText("request 1 / 12")).toBeTruthy();
    const seq = screen.getByLabelText("Sequence");
    fireEvent.change(seq, { target: { value: "ABCAB" } });
    fireEvent.keyDown(seq, { key: "Enter" });
    expect(screen.getByText("request 1 / 5")).toBeTruthy();
  });

  it("a Try experiment sets the inputs", () => {
    at("?q=ABCADEAFBAGC");
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("tab", { name: "Try" }));
    fireEvent.click(screen.getAllByRole("button", { name: /Run/ })[0] as HTMLElement);
    expect(screen.getByRole("button", { name: "Scan" }).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByLabelText("Sequence") as HTMLInputElement).value).toBe("A B A B C D E F G H A B");
  });

  it("collapsing a panel persists for next time", () => {
    at("");
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("button", { name: "Hide Configure" }));
    expect(screen.getByRole("button", { name: "Show Configure" })).toBeTruthy();
    expect(localStorage.getItem("wiki-visualizer-panels")).toBe('{"left":true,"right":false}');
  });

  it("Copy link copies the exact current state and confirms", async () => {
    vi.mocked(writeToClipboard).mockResolvedValue();
    at("?p=lfu&q=ABCADEAFBAGC&i=4");
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    const url = vi.mocked(writeToClipboard).mock.calls[0]?.[0] ?? "";
    expect(url).toContain("/visualizer/eviction-policies/?p=lfu");
    expect(url).toContain("q=ABCADEAFBAGC");
    expect(url).toContain("i=4");
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Link copied"));
  });

  it("a blocked clipboard surfaces an error toast", async () => {
    vi.mocked(writeToClipboard).mockRejectedValue(new Error("denied"));
    at("");
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Couldn't copy the link"));
  });

  it("an unknown slug fails loudly", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<VisualizerApp slug="nope" />)).toThrow("Unknown visualizer: nope");
    vi.restoreAllMocks();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run --project unit components/visualizer/frame/VisualizerApp.test.tsx`
Expected: FAIL — cannot resolve `./VisualizerApp`.

- [ ] **Step 3: Implement**

`components/visualizer/frame/VisualizerApp.tsx`:
```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { writeToClipboard } from "@/lib/clipboard";
import { showToast } from "@/lib/toast";
import { applyChange, type FieldValue, type InputValues } from "@/lib/visualizer/core/fields";
import { defaultAxis } from "@/lib/visualizer/core/shapes";
import type { Experiment, VisualizerModule } from "@/lib/visualizer/core/types";
import { encodeState, parseState, type ViewState } from "@/lib/visualizer/core/url-state";
import { MODULES } from "@/lib/visualizer/modules";
import { usePanelPrefs } from "../hooks/usePanelPrefs";
import { usePlayback } from "../hooks/usePlayback";
import { useUrlSync } from "../hooks/useUrlSync";
import { useVizHotkeys } from "../hooks/useVizHotkeys";
import { Shape } from "../shapes/Shape";
import { ConfigPanel } from "./ConfigPanel";
import { InfoPanel } from "./InfoPanel";
import { PlaybackBar } from "./PlaybackBar";
import { SidePanel } from "./SidePanel";
import { Stage } from "./Stage";
import { TimelineStrip } from "./TimelineStrip";
import { VizHeader } from "./VizHeader";

interface Boot {
  values: InputValues;
  view: ViewState;
}

export function VisualizerApp({ slug }: { slug: string }) {
  const mod = MODULES[slug];
  const [boot, setBoot] = useState<Boot | null>(null);
  // Booting after mount keeps the random default seed out of the static HTML.
  useEffect(() => {
    if (mod) setBoot(parseState(window.location.search, mod.sections, mod.defaults()));
  }, [mod]);
  if (!mod) throw new Error(`Unknown visualizer: ${slug}`);
  if (!boot) return <main className="viz-app viz-app--loading" aria-busy="true" />;
  return <VisualizerBody mod={mod} boot={boot} />;
}

function VisualizerBody({ mod, boot }: { mod: VisualizerModule; boot: Boot }) {
  const [values, setValues] = useState(boot.values);
  const [rotated, setRotated] = useState(boot.view.rotated);
  const result = useMemo(() => mod.run(values), [mod, values]);
  const pb = usePlayback(result.frames, boot.view.frame);
  const { restart, toggle, step } = pb;
  useVizHotkeys({ toggle, step });
  useUrlSync(mod.sections, values, pb.frame, rotated);
  const panels = usePanelPrefs();

  const change = useCallback(
    (key: string, value: FieldValue) => {
      setValues((v) => applyChange(mod.sections, v, key, value));
      restart();
    },
    [mod, restart],
  );
  const runTry = useCallback(
    (e: Experiment) => {
      setValues((v) => ({ ...v, ...e.patch }));
      restart();
    },
    [restart],
  );
  const copyLink = useCallback(() => {
    const search = encodeState(mod.sections, values, { frame: pb.frame, rotated });
    const url = `${window.location.origin}${window.location.pathname}${search}`;
    writeToClipboard(url).then(
      () => showToast("Link copied"),
      () => showToast("Couldn't copy the link"),
    );
  }, [mod, values, pb.frame, rotated]);

  const frame = result.frames[pb.frame];
  if (!frame) return null;
  const className = [
    "viz-app",
    panels.left && "viz-app--left-collapsed",
    panels.right && "viz-app--right-collapsed",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={className}>
      <VizHeader
        title={mod.title}
        subtitle={mod.subtitle}
        articleHref={result.info.articleHref}
        onCopyLink={copyLink}
      />
      <div className="viz-app__body">
        <SidePanel
          side="left"
          title={mod.sections[0]?.title || "Configure"}
          railLabel="Configure"
          railIcon="⚙"
          collapsed={panels.left}
          onToggle={() => panels.toggle("left")}
        >
          <ConfigPanel sections={mod.sections} values={values} sequence={result.sequence} onChange={change} />
        </SidePanel>
        <div className="viz-app__centre">
          <Stage
            metric={frame.metric}
            metricLabel={result.metricLabel}
            caption={frame.caption}
            rotate={
              defaultAxis(frame.model)
                ? {
                    rotated,
                    defaultName: result.info.chip.toLowerCase(),
                    onToggle: () => setRotated((r) => !r),
                  }
                : null
            }
          >
            {(size) => <Shape model={frame.model} rotated={rotated} size={size} />}
          </Stage>
          <div className="viz-foot">
            <PlaybackBar
              frame={pb.frame}
              total={result.frames.length}
              unit={mod.unit}
              playing={pb.playing}
              speed={pb.speed}
              onSeek={pb.seek}
              onStep={step}
              onToggle={toggle}
              onSpeed={pb.setSpeed}
            />
            <TimelineStrip frames={result.frames} current={pb.frame} unit={mod.unit} onSeek={pb.seek} />
          </div>
        </div>
        <SidePanel
          side="right"
          title={result.info.heading}
          railLabel="Details"
          railIcon="ⓘ"
          collapsed={panels.right}
          onToggle={() => panels.toggle("right")}
        >
          <InfoPanel
            info={result.info}
            frames={result.frames}
            frame={pb.frame}
            sub={pb.sub}
            unit={mod.unit}
            onSeek={pb.seek}
            onTry={runTry}
          />
        </SidePanel>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Add layout styles and the narrow-screen fallback**

In `css/tokens.css`, add after `  --viz-strip-cells: 15;`:
```css
  --viz-stage-narrow-h: 380px;
```

`css/view-visualizer/layout.css`:
```css
/* ═══════════════════════════════════════════════
   VISUALIZER — PAGE LAYOUT
   ═══════════════════════════════════════════════ */
.viz-app {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - var(--topbar-h));
  min-height: 0;
}
.viz-app--loading {
  background: var(--bg);
}
.viz-head {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s3) var(--s4);
  padding: var(--s3) var(--s5);
  border-bottom: 1px solid var(--border);
}
.viz-head__title {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--fw-extrabold);
  color: var(--text-heading);
}
.viz-head__sub {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}
.viz-head__actions {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s2);
}
.viz-app__body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: var(--viz-panel-left-w) minmax(0, 1fr) var(--viz-panel-right-w);
}
.viz-app--left-collapsed .viz-app__body {
  grid-template-columns: var(--viz-rail-w) minmax(0, 1fr) var(--viz-panel-right-w);
}
.viz-app--right-collapsed .viz-app__body {
  grid-template-columns: var(--viz-panel-left-w) minmax(0, 1fr) var(--viz-rail-w);
}
.viz-app--left-collapsed.viz-app--right-collapsed .viz-app__body {
  grid-template-columns: var(--viz-rail-w) minmax(0, 1fr) var(--viz-rail-w);
}
.viz-app__centre {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
```

In `css/wiki.css`, add after `@import "./view-visualizer/playback.css";`:
```css
@import "./view-visualizer/layout.css";
```

Append to the end of `css/responsive.css`:
```css

/* ═══════════════════════════════════════════════
   VISUALIZER
   ═══════════════════════════════════════════════ */
@media (max-width: 1024px) {
  .viz-strip {
    --viz-strip-cells: 11;
  }
}

/* Interim single-column fallback until the dedicated mobile layout ships. */
@media (max-width: 900px) {
  .viz-app {
    height: auto;
  }
  .viz-app__body {
    display: flex;
    flex-direction: column;
  }
  .viz-app__centre {
    order: -1;
  }
  .viz-stage {
    flex: none;
    height: var(--viz-stage-narrow-h);
  }
  .viz-panel--left,
  .viz-panel--right {
    border-left: 0;
    border-right: 0;
    border-top: 1px solid var(--border);
  }
  .viz-panel__rail {
    flex-direction: row;
    padding: var(--s2) var(--s4);
  }
  .viz-panel__rail-label {
    writing-mode: horizontal-tb;
  }
}

@media (max-width: 640px) {
  .viz-strip {
    --viz-strip-cells: 7;
  }
  .viz-head__actions {
    margin-left: 0;
  }
  .viz-playback {
    grid-template-columns: 1fr;
    justify-items: center;
  }
  .viz-playback__speed {
    justify-self: center;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run --project unit components/visualizer/frame/VisualizerApp.test.tsx`
Expected: PASS (8 tests).

- [ ] **Step 6: Run the whole visualizer unit suite**

Run: `pnpm vitest run --project unit lib/visualizer lib/storage/visualizer-prefs.test.ts components/visualizer`
Expected: PASS, 0 failures.

---

### Task 15: Routes, home card, offline caching

**Files:**
- Create: `app/visualizer/page.tsx`, `app/visualizer/[slug]/page.tsx`
- Modify: `app/page.tsx` (Visualizer card after the vertical grid), `css/view-home.css` (append `.wiki-grid--tools`), `app/sw.ts` (runtime-cache visualizer pages)
- Modify: `app/sw.test.ts` (one new `it`)
- Test: `app/visualizer.test.tsx`

**Interfaces:**
- Consumes: `VISUALIZERS`, `getVisualizer` (Task 7); `VisualizerApp` (Task 14); `IndexTopbar`, `CANONICAL_BASE` (existing).
- Produces: static routes `/visualizer/` and `/visualizer/eviction-policies/`; home card linking to `/visualizer/`.

- [ ] **Step 1: Write the failing tests**

`app/visualizer.test.tsx`:
```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CANONICAL_BASE } from "@/lib/config";

// IndexTopbar → Breadcrumb/AuthButton use the app-router hooks; the SSR-markup test doesn't mount the router.
vi.mock("next/navigation", async (orig) => ({
  ...(await orig<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/visualizer/",
}));

import VisualizerIndex, { metadata } from "./visualizer/page";
import VisualizerPage, { generateMetadata, generateStaticParams } from "./visualizer/[slug]/page";

describe("visualizer routes", () => {
  it("static params list every built visualizer", () => {
    expect(generateStaticParams()).toEqual([{ slug: "eviction-policies" }]);
  });

  it("metadata: titles, canonicals, no-index", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "eviction-policies" }) });
    expect(meta.title).toBe("Eviction policies");
    expect(meta.alternates?.canonical).toBe(`${CANONICAL_BASE}/visualizer/eviction-policies/`);
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toBe("Visualizer");
    expect(metadata.alternates?.canonical).toBe(`${CANONICAL_BASE}/visualizer/`);
  });

  it("landing links to each visualizer", () => {
    const html = renderToStaticMarkup(<VisualizerIndex />);
    expect(html).toContain('href="/visualizer/eviction-policies/"');
    expect(html).toContain("Eviction policies");
  });

  it("the visualizer page ships the app shell without a baked-in run", async () => {
    const page = await VisualizerPage({ params: Promise.resolve({ slug: "eviction-policies" }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("viz-app--loading");
    expect(html).not.toContain("viz-strip__cell");
  });
});
```

Add to `app/sw.test.ts` inside the existing `describe`:
```ts
  it("runtime-caches visualizer pages so they work offline after one visit", () => {
    expect(sw).toContain("\\/wiki-fe\\/visualizer\\/");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run --project unit app/visualizer.test.tsx app/sw.test.ts`
Expected: FAIL — cannot resolve `./visualizer/page`; sw test fails on the missing matcher.

- [ ] **Step 3: Implement routes**

`app/visualizer/page.tsx`:
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { IndexTopbar } from "@/components/chrome/IndexTopbar";
import { CANONICAL_BASE } from "@/lib/config";
import { VISUALIZERS } from "@/lib/visualizer/registry";

export const metadata: Metadata = {
  title: "Visualizer",
  description: "Animated, step-by-step explanations of DSA and system-design concepts.",
  alternates: { canonical: `${CANONICAL_BASE}/visualizer/` },
  robots: { index: false, follow: false },
};

export default function VisualizerIndex() {
  return (
    <>
      <IndexTopbar />
      <main className="index-main">
        <div className="page-hero">
          <div className="page-hero-inner">
            <h1 className="page-title">Visualizer</h1>
            <p className="page-subtitle">
              Animated, step-by-step explanations — watch a concept run, then drive it yourself.
            </p>
          </div>
        </div>
        <div className="wiki-grid">
          {VISUALIZERS.map((v) => (
            <Link key={v.slug} href={`/visualizer/${v.slug}/`} className="wiki-card">
              <div className="wiki-card-icon">{v.icon}</div>
              <div className="wiki-card-body">
                <h2 className="wiki-card-title">{v.title}</h2>
                <p className="wiki-card-desc">{v.description}</p>
              </div>
              <div className="wiki-card-footer">
                <span className="wiki-card-count">Open</span>
                <span className="wiki-card-arrow">→</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
```

`app/visualizer/[slug]/page.tsx`:
```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IndexTopbar } from "@/components/chrome/IndexTopbar";
import { VisualizerApp } from "@/components/visualizer/frame/VisualizerApp";
import { CANONICAL_BASE } from "@/lib/config";
import { getVisualizer, VISUALIZERS } from "@/lib/visualizer/registry";

export function generateStaticParams() {
  return VISUALIZERS.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const v = getVisualizer(slug);
  if (!v) return {};
  return {
    title: v.title,
    description: v.description,
    alternates: { canonical: `${CANONICAL_BASE}/visualizer/${v.slug}/` },
    robots: { index: false, follow: false },
  };
}

export default async function VisualizerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getVisualizer(slug)) notFound();
  return (
    <>
      <IndexTopbar />
      <VisualizerApp slug={slug} />
    </>
  );
}
```

- [ ] **Step 4: Home card**

In `app/page.tsx`, add the import:
```tsx
import { VISUALIZERS } from "@/lib/visualizer/registry";
```
and directly after the closing `</div>` of `<div className="wiki-grid">…</div>` (still inside `<main>`), add:
```tsx
        {/* Separate grid: PinnedWikis and card key-nav only manage the vertical cards. */}
        <div className="wiki-grid wiki-grid--tools">
          <Link href="/visualizer/" className="wiki-card">
            <div className="wiki-card-icon">🎞️</div>
            <div className="wiki-card-body">
              <h2 className="wiki-card-title">Visualizer</h2>
              <p className="wiki-card-desc">
                Animated, step-by-step explanations — starting with cache eviction.
              </p>
            </div>
            <div className="wiki-card-footer">
              <span className="wiki-card-count">
                {VISUALIZERS.length} {VISUALIZERS.length === 1 ? "visualizer" : "visualizers"}
              </span>
              <span className="wiki-card-arrow">→</span>
            </div>
          </Link>
        </div>
```

Append to `css/view-home.css`:
```css

.wiki-grid--tools {
  margin-top: var(--s6);
}
```

- [ ] **Step 5: Offline caching**

In `app/sw.ts`, add below `const STATIC_JS_RE = …;`:
```ts
const VISUALIZER_RE = /\/wiki-fe\/visualizer\//;
```
and add this entry to `runtimeCaching`, right after the `ARTICLE_RE` entry:
```ts
    {
      matcher: ({ url }) => VISUALIZER_RE.test(url.pathname),
      handler: new StaleWhileRevalidate({ cacheName: "wiki-articles" }),
    },
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm vitest run --project unit app/visualizer.test.tsx app/sw.test.ts app/page.test.tsx`
Expected: PASS.

---

### Task 16: End-to-end coverage, docs, full verification

**Files:**
- Create: `tests/e2e/test_visualizer.py`
- Modify: `CLAUDE.md` (FILE MAP code rows — the docs row and routing row already exist), `CONVENTIONS.md` (components folder list — the Visualizer section already exists), `docs/_meta/visualizer/README.md` (roadmap status + Last updated)

**Interfaces:**
- Consumes: the built `out/` export; `page` and `base_url` fixtures from `tests/conftest.py` (navigation waits for hotkeys-ready automatically; animations are disabled; localStorage is reset).

- [ ] **Step 1: Write the e2e tests**

`tests/e2e/test_visualizer.py`:
```python
"""Visualizer: home/landing navigation, autoplay, strip seek, panel collapse, shareable URL state."""

import re

from playwright.sync_api import expect

EVICTION = "/visualizer/eviction-policies/"
TRACE = "q=ABCADEAFBAGC"


def test_home_card_opens_visualizer_landing(page, base_url):
    """the home Visualizer card leads to the landing page, which lists eviction policies."""
    page.goto(f"{base_url}/")
    page.get_by_role("link", name=re.compile(r"^Visualizer")).click()
    expect(page.get_by_role("heading", level=1, name="Visualizer")).to_be_visible()
    page.get_by_role("link", name=re.compile(r"Eviction policies")).click()
    expect(page).to_have_url(re.compile(re.escape(EVICTION)))
    expect(page.get_by_role("heading", level=1, name="Eviction policies")).to_be_visible()


def test_autoplay_advances_the_request_counter(page, base_url):
    """with no interaction the run plays on its own."""
    page.goto(f"{base_url}{EVICTION}?{TRACE}")
    expect(page.get_by_text("request 1 / 12")).to_be_visible()
    expect(page.get_by_text("request 2 / 12")).to_be_visible(timeout=8_000)


def test_strip_click_jumps_and_centres(page, base_url):
    """clicking a strip cell jumps there and that cell becomes current."""
    page.goto(f"{base_url}{EVICTION}?{TRACE}")
    page.get_by_role("button", name="Pause").click()
    page.get_by_role("button", name=re.compile(r"^Request 8: F")).click()
    expect(page.get_by_text("request 8 / 12")).to_be_visible()
    expect(page.locator(".viz-strip__cell.is-current")).to_have_text("F")


def test_collapsing_configure_widens_the_stage(page, base_url):
    """hiding the left panel leaves a rail and gives the stage the space."""
    page.goto(f"{base_url}{EVICTION}?{TRACE}")
    stage = page.locator(".viz-stage")
    before = stage.bounding_box()["width"]
    page.get_by_role("button", name="Hide Configure").click()
    expect(page.get_by_role("button", name="Show Configure")).to_be_visible()
    assert stage.bounding_box()["width"] > before


def test_url_state_restores_policy_step_and_rotation(page, base_url):
    """a shared URL reopens the same policy, request and orientation."""
    page.goto(f"{base_url}{EVICTION}?p=fifo&{TRACE}&i=8&rot=1")
    page.get_by_role("button", name="Pause").click()
    expect(page.get_by_text("request 8 / 12")).to_be_visible()
    expect(page.get_by_role("heading", name="FIFO")).to_be_visible()
    expect(page.get_by_role("button", name="Default")).to_be_visible()
    expect(page.locator(".viz-linear")).to_have_attribute("data-axis", "vertical")
```

- [ ] **Step 2: Build the e2e export and run the new file**

Run: `pnpm build:e2e`
Expected: build succeeds; `out/visualizer/index.html` and `out/visualizer/eviction-policies/index.html` exist.

Run: `PLAYWRIGHT_BROWSERS_PATH=$HOME/Library/Caches/ms-playwright .venv/bin/python3 -m pytest tests/e2e/test_visualizer.py -q --timeout=60`
Expected: 5 passed.

- [ ] **Step 3: Update the repo maps**

In `CLAUDE.md` → FILE MAP → Routes table, add:
```markdown
| `visualizer/page.tsx`, `visualizer/[slug]/page.tsx` | Visualizer landing + one page per visualizer module |
```
→ Components table, add:
```markdown
| `visualizer/` | Generic visualizer app: `frame/` (VisualizerApp root, panels, stage, playback, strip, info tabs), `shapes/`, `hooks/`, `ui/` primitives |
```
→ Lib table, add:
```markdown
| `visualizer/` | `core/` (frame/field/URL/playback/shape contracts), one folder per visualizer module (`eviction/`), `registry.ts`, `modules.ts` |
```
→ TASK → FILE ROUTING, replace the existing Visualizer row's "Start here" cell with:
```markdown
`docs/_meta/visualizer/README.md` first, then `lib/visualizer/core/types.ts` (module contract), `lib/visualizer/<name>/`, `components/visualizer/frame/VisualizerApp.tsx`
```

In `CONVENTIONS.md` → Components → folder list, add the line:
```
    visualizer/ Generic visualizer app — frame/, shapes/, hooks/, ui/ (module-driven; no visualizer-specific code)
```

In `docs/_meta/visualizer/README.md`: set roadmap item 1 status to `shipped (v1)`, and set the meta table's **Last updated** to the ship date.

- [ ] **Step 4: Full verification**

Run: `pnpm typecheck`
Expected: no errors.

Run: `pnpm lint`
Expected: no errors.

Run: `pnpm test:all`
Expected: all unit, pipeline and content tests pass (including the anchor guard).

Run: `pnpm build`
Expected: production build succeeds (no e2e canary routes).

- [ ] **Step 5: Manual check in the browser**

Run: `pnpm dev`, open `http://localhost:3000/wiki-fe/visualizer/eviction-policies/` and confirm:
- dark and light themes, and a different accent preset, re-skin the page (no hard-coded colours);
- LRU stack, FIFO queue, LFU histogram and CLOCK ring animate; Rotate/Default flips stack and queue; ring has no Rotate button;
- strip keeps the current request centred from request 1; wheel-scrolling it pauses following and it glides back ~2 s later;
- at 900px and 320px wide the page stacks into one column with nothing cut off.
