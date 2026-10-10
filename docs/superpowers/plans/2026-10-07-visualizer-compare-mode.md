# Visualizer Compare Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a learner run 2–3 policies of one visualizer at once, in an auto-fit tile grid, on one shared clock and one shared input.

**Architecture:** `VisualizerModule` gains an optional `compare: { key, max }`. The frame calls `mod.run` once per selected variant with identical shared inputs, drives all runs from one `usePlayback` over a "clock" frame list (longest path per index), and renders one `CompareTile` per run. Variants live in URL state as a comma list (`p=lru,fifo,lfu`); two or more means compare mode.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest + Testing Library, plain CSS with tokens, Biome + ESLint, pnpm.

**Spec:** [docs/superpowers/specs/2026-10-07-visualizer-compare-mode-design.md](../specs/2026-10-07-visualizer-compare-mode-design.md)

## Global Constraints

- No git, commit, branch or staging steps anywhere; the user owns version control.
- No ticket or backlog IDs (`WIKI-xxx`, `DSA-xxx`, `SD-xxx`) in code comments or CSS section headers.
- Comments and docstrings (TS and CSS) are one line, never multi-line prose blocks, including in tests.
- Nothing under `components/visualizer/` or `lib/visualizer/core/` may name a specific visualizer; eviction specifics live in `lib/visualizer/eviction/`.
- Never hard-wrap prose in Markdown files; one line per paragraph or list item.
- CSS tasks start in `css/tokens.css`; colours come from existing `--viz-*` tokens; the new stylesheet is imported from `css/wiki.css`.
- Compare limits: minimum 2 variants, maximum from the module (`3` for eviction); only the variant field varies, every other input is shared.
- Verification commands: `pnpm exec vitest run <path>`, `pnpm typecheck`, `pnpm exec biome check <paths>`, `pnpm lint`. Do not run the e2e suite.

## Review Focus

- A URL such as `?p=lru,lru,xyz,fifo,lfu,clock` must dedupe, drop unknown ids, cap at the module max, and keep the first-seen order (task 1 tests).
- An old single-policy link (`?p=fifo`) and a junk or empty list (`?p=`, `?p=,`) must still open a valid single run (task 1 tests).
- Deselecting the focused variant must move focus to the first remaining variant, never leave the details panel empty (task 5 test).
- At a step where one variant takes the 2-line hit path and another the 3-line miss path, the short-path tile must hold its last line instead of showing no active line (task 3 and task 5 tests).
- A module without `compare` must behave exactly as before: no `variants` in the URL, no Compare toggle, no tiles (task 1, task 2 and task 5 tests).

---

### Task 1: Compare contract, helpers and URL state

**Files:**
- Create: `lib/visualizer/core/compare.ts`
- Create: `lib/visualizer/core/compare.test.ts`
- Modify: `lib/visualizer/core/types.ts`
- Modify: `lib/visualizer/core/url-state.ts`
- Modify: `lib/visualizer/core/url-state.test.ts`
- Modify: `lib/visualizer/eviction/module.ts`
- Modify: `lib/visualizer/eviction/module.test.ts`
- Modify: `components/visualizer/hooks/useUrlSync.ts`
- Modify: `components/visualizer/hooks/useUrlSync.test.tsx`

**Interfaces:**
- Consumes: `FieldSection`, `allFields`, `clampInt`, `parseSequence`, `SEED_MAX` from `core/fields`; `VizFrame` from `core/types`.
- Produces (from `core/compare.ts`):
  - `COMPARE_MIN = 2`
  - `toggleVariant(variants: string[], id: string, max: number): string[]`
  - `enterCompare(variants: string[], order: string[]): string[]`
  - `leaveCompare(variants: string[]): string[]`
  - `normalizeVariants(raw: string[], valid: string[], max: number): string[]`
  - `clockFrames(runs: VizFrame[][]): VizFrame[]`
  - `variantOptions(sections: FieldSection[], key: string): { value: string; label: string }[]`
- Produces (from `core/types.ts`): `CompareSpec { key: string; max: number }` and `VisualizerModule.compare?: CompareSpec`.
- Produces (from `core/url-state.ts`): `ViewState` gains `variants: string[]`; `encodeState(sections, values, view, compare?)` and `parseState(search, sections, defaults, compare?)`; `view` passed to `encodeState` may omit `variants`.
- Produces (from `useUrlSync`): trailing optional params `variants?: string[]`, `compare?: CompareSpec`.

- [ ] **Step 1: Write the failing helper tests**

Create `lib/visualizer/core/compare.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  clockFrames,
  COMPARE_MIN,
  enterCompare,
  leaveCompare,
  normalizeVariants,
  toggleVariant,
  variantOptions,
} from "./compare";
import type { FieldSection } from "./fields";
import type { VizFrame } from "./types";

const ORDER = ["lru", "fifo", "lfu", "clock"];

const frame = (index: number, path: number[]): VizFrame => ({
  index,
  label: "A",
  outcome: "good",
  badge: "HIT",
  caption: [],
  lines: [],
  path,
  vars: [],
  logNote: [],
  metric: "0%",
  model: { kind: "ring", slots: [], hand: 0, turns: 0, cleared: [], active: null, tone: null },
});

describe("compare helpers", () => {
  it("minimum is two variants", () => {
    expect(COMPARE_MIN).toBe(2);
  });

  it("toggleVariant appends up to max and ignores extra adds", () => {
    expect(toggleVariant(["lru", "fifo"], "lfu", 3)).toEqual(["lru", "fifo", "lfu"]);
    expect(toggleVariant(["lru", "fifo", "lfu"], "clock", 3)).toEqual(["lru", "fifo", "lfu"]);
  });

  it("toggleVariant removes a variant but never goes below the minimum", () => {
    expect(toggleVariant(["lru", "fifo", "lfu"], "fifo", 3)).toEqual(["lru", "lfu"]);
    expect(toggleVariant(["lru", "fifo"], "fifo", 3)).toEqual(["lru", "fifo"]);
  });

  it("enterCompare keeps the current variant first and adds the next unused option", () => {
    expect(enterCompare(["lru"], ORDER)).toEqual(["lru", "fifo"]);
    expect(enterCompare(["fifo"], ORDER)).toEqual(["fifo", "lru"]);
  });

  it("leaveCompare keeps only the first variant", () => {
    expect(leaveCompare(["fifo", "lru", "lfu"])).toEqual(["fifo"]);
    expect(leaveCompare(["lru"])).toEqual(["lru"]);
  });

  it("normalizeVariants dedupes, drops unknown ids, caps at max and keeps first-seen order", () => {
    expect(normalizeVariants(["lru", "lru", "xyz", "fifo", "lfu", "clock"], ORDER, 3)).toEqual([
      "lru",
      "fifo",
      "lfu",
    ]);
    expect(normalizeVariants(["", ","], ORDER, 3)).toEqual([]);
  });

  it("clockFrames keeps the first run's frames but swaps in the longest path at each index", () => {
    const hit = [frame(0, [0, 1]), frame(1, [0, 1])];
    const miss = [frame(0, [0, 2, 3]), frame(1, [0, 1])];
    const clock = clockFrames([hit, miss]);
    expect(clock.map((f) => f.path)).toEqual([[0, 2, 3], [0, 1]]);
    expect(clock[1]).toBe(hit[1]);
    expect(clockFrames([])).toEqual([]);
  });

  it("variantOptions reads the chips options of the named field", () => {
    const sections: FieldSection[] = [
      {
        title: "",
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
    ];
    expect(variantOptions(sections, "policy")).toEqual([
      { value: "lru", label: "LRU" },
      { value: "fifo", label: "FIFO" },
    ]);
    expect(variantOptions(sections, "missing")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run lib/visualizer/core/compare.test.ts`
Expected: FAIL, "Failed to resolve import ./compare".

- [ ] **Step 3: Add the contract types**

In `lib/visualizer/core/types.ts`, add above `VisualizerModule` and add the optional field:

```ts
export interface CompareSpec {
  // The chips field whose options are the variants, and the most that can run at once.
  key: string;
  max: number;
}
```

```ts
export interface VisualizerModule {
  slug: string;
  title: string;
  subtitle: string;
  unit: string;
  subject: string;
  compare?: CompareSpec;
  sections: FieldSection[];
  defaults: () => InputValues;
  run: (values: InputValues) => RunResult;
}
```

(Keep every field the interface already has; the only change is the added `compare?: CompareSpec;` line and the new `CompareSpec` interface.)

- [ ] **Step 4: Write the helpers**

Create `lib/visualizer/core/compare.ts`:

```ts
import { allFields, type FieldSection } from "./fields";
import type { VizFrame } from "./types";

export const COMPARE_MIN = 2;

export function toggleVariant(variants: string[], id: string, max: number): string[] {
  if (variants.includes(id)) {
    return variants.length <= COMPARE_MIN ? variants : variants.filter((v) => v !== id);
  }
  return variants.length >= max ? variants : [...variants, id];
}

export function enterCompare(variants: string[], order: string[]): string[] {
  const extra = order.find((o) => !variants.includes(o));
  return extra === undefined ? variants : [...variants, extra];
}

export function leaveCompare(variants: string[]): string[] {
  return variants.slice(0, 1);
}

export function normalizeVariants(raw: string[], valid: string[], max: number): string[] {
  const out: string[] = [];
  for (const id of raw) {
    if (valid.includes(id) && !out.includes(id)) out.push(id);
  }
  return out.slice(0, max);
}

// The shared clock waits for the slowest variant, so each index uses the longest path among runs.
export function clockFrames(runs: VizFrame[][]): VizFrame[] {
  const first = runs[0] ?? [];
  return first.map((f, i) => {
    const path = runs.reduce<number[]>((best, run) => {
      const p = run[i]?.path ?? [];
      return p.length > best.length ? p : best;
    }, f.path);
    return path === f.path ? f : { ...f, path };
  });
}

export function variantOptions(
  sections: FieldSection[],
  key: string,
): { value: string; label: string }[] {
  const field = allFields(sections).find((f) => f.kind === "chips" && f.key === key);
  return field?.kind === "chips" ? field.options : [];
}
```

- [ ] **Step 5: Run the helper tests to verify they pass**

Run: `pnpm exec vitest run lib/visualizer/core/compare.test.ts`
Expected: PASS (all tests).

- [ ] **Step 6: Write the failing URL tests**

In `lib/visualizer/core/url-state.test.ts`, change the three existing view expectations to include `variants: []`: the `round-trips` test (`view: { frame: 7, rotated: true, variants: [] }`), the `falls back to defaults` test (`expect(view).toEqual({ frame: 0, rotated: false, variants: [] })`), and the `empty search` test (`view: { frame: 0, rotated: false, variants: [] }`). Then add these tests inside the `describe("url-state", ...)` block:

```ts
  const COMPARE = { key: "policy", max: 2 } as const;

  it("encodes a variant list under the compare field's param", () => {
    expect(
      encodeState(SECTIONS, DEFAULTS, { frame: 0, rotated: false, variants: ["lru", "fifo"] }, COMPARE),
    ).toBe("?p=lru%2Cfifo&c=4&s=1&i=1");
  });

  it("parses a variant list, sets the key to the first variant and exposes the list", () => {
    const { values, view } = parseState("?p=fifo,lru", SECTIONS, DEFAULTS, COMPARE);
    expect(values.policy).toBe("fifo");
    expect(view.variants).toEqual(["fifo", "lru"]);
  });

  it("dedupes, drops unknown ids and caps at max", () => {
    const { view } = parseState("?p=lru,lru,xyz,fifo,lfu", SECTIONS, DEFAULTS, COMPARE);
    expect(view.variants).toEqual(["lru", "fifo"]);
  });

  it("an old single-policy link yields one variant", () => {
    const { values, view } = parseState("?p=fifo", SECTIONS, DEFAULTS, COMPARE);
    expect(values.policy).toBe("fifo");
    expect(view.variants).toEqual(["fifo"]);
  });

  it("a junk or empty list falls back to the default policy", () => {
    for (const search of ["?p=", "?p=,", "?p=xyz", ""]) {
      const { values, view } = parseState(search, SECTIONS, DEFAULTS, COMPARE);
      expect(values.policy).toBe("lru");
      expect(view.variants).toEqual(["lru"]);
    }
  });

  it("without a compare spec the variants list stays empty", () => {
    expect(parseState("?p=fifo,lru", SECTIONS, DEFAULTS).view.variants).toEqual([]);
  });
```

(The `SECTIONS` fixture in this file only has `lru` and `fifo` options, so `lfu` and `xyz` are both unknown there.)

- [ ] **Step 7: Run them to verify they fail**

Run: `pnpm exec vitest run lib/visualizer/core/url-state.test.ts`
Expected: FAIL (`variants` missing from `view`, compare param unsupported).

- [ ] **Step 8: Implement the URL changes**

Replace `lib/visualizer/core/url-state.ts` with:

```ts
import { normalizeVariants } from "./compare";
import {
  allFields,
  clampInt,
  type FieldSection,
  type InputValues,
  parseSequence,
  SEED_MAX,
} from "./fields";
import type { CompareSpec } from "./types";

export interface ViewState {
  frame: number;
  rotated: boolean;
  variants: string[];
}

export type ViewInput = Omit<ViewState, "variants"> & { variants?: string[] };

export function encodeState(
  sections: FieldSection[],
  values: InputValues,
  view: ViewInput,
  compare?: CompareSpec,
): string {
  const q = new URLSearchParams();
  for (const f of allFields(sections)) {
    const v = values[f.key];
    if (compare && f.key === compare.key && view.variants?.length) {
      q.set(f.param, view.variants.join(","));
      continue;
    }
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
  compare?: CompareSpec,
): { values: InputValues; view: ViewState } {
  const q = new URLSearchParams(search);
  const values: InputValues = { ...defaults };
  let variants: string[] = [];
  for (const f of allFields(sections)) {
    const raw = q.get(f.param);
    if (raw === null) continue;
    if (f.kind === "chips") {
      if (compare && f.key === compare.key) {
        const list = normalizeVariants(
          raw.split(","),
          f.options.map((o) => o.value),
          compare.max,
        );
        if (list.length) {
          variants = list;
          values[f.key] = list[0] ?? "";
        }
      } else if (f.options.some((o) => o.value === raw)) {
        values[f.key] = raw;
      }
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
  if (compare && variants.length === 0) variants = [String(values[compare.key] ?? "")];
  const i = Number(q.get("i"));
  return {
    values,
    view: {
      frame: Number.isFinite(i) && i >= 1 ? Math.floor(i) - 1 : 0,
      rotated: q.get("rot") === "1",
      variants,
    },
  };
}
```

- [ ] **Step 9: Run the URL tests to verify they pass**

Run: `pnpm exec vitest run lib/visualizer/core/url-state.test.ts`
Expected: PASS.

- [ ] **Step 10: Write the failing module tests**

In `lib/visualizer/eviction/module.test.ts`, add the imports `PATTERNS`, `POLICY_IDS` from `./types` if not present, update the existing round-trip test's `encodeState`/`parseState` calls to pass `evictionModule.compare` as the fourth argument, and add:

```ts
  it("declares policy as the compare field with a maximum of three", () => {
    expect(evictionModule.compare).toEqual({ key: "policy", max: 3 });
  });

  it("every policy returns the same frame count and sequence for identical shared inputs", () => {
    const base = evictionModule.defaults();
    for (const pattern of PATTERNS) {
      const runs = POLICY_IDS.map((policy) => evictionModule.run({ ...base, pattern, policy }));
      const first = runs[0];
      expect(runs.every((r) => r.frames.length === first?.frames.length)).toBe(true);
      expect(runs.every((r) => r.sequence.join("") === first?.sequence.join(""))).toBe(true);
    }
  });
```

- [ ] **Step 11: Run them to verify they fail**

Run: `pnpm exec vitest run lib/visualizer/eviction/module.test.ts`
Expected: FAIL (`compare` is undefined).

- [ ] **Step 12: Declare compare on the eviction module**

In `lib/visualizer/eviction/module.ts`, add `compare: { key: "policy", max: 3 },` to `evictionModule`, right after `subject: "Cache",`.

- [ ] **Step 13: Thread compare through `useUrlSync`**

Replace the body of `components/visualizer/hooks/useUrlSync.ts` with:

```ts
import { useEffect } from "react";
import type { FieldSection, InputValues } from "@/lib/visualizer/core/fields";
import type { CompareSpec } from "@/lib/visualizer/core/types";
import { encodeState } from "@/lib/visualizer/core/url-state";

const DEBOUNCE_MS = 300;

export function useUrlSync(
  sections: FieldSection[],
  values: InputValues,
  frame: number,
  rotated: boolean,
  variants?: string[],
  compare?: CompareSpec,
): void {
  useEffect(() => {
    const id = window.setTimeout(() => {
      const search = encodeState(sections, values, { frame, rotated, variants }, compare);
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${search}`);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [sections, values, frame, rotated, variants, compare]);
}
```

In `components/visualizer/hooks/useUrlSync.test.tsx`, add one test after the existing ones:

```ts
  it("writes the variant list when a compare spec is given", () => {
    const spy = vi.spyOn(window.history, "replaceState");
    const sections: FieldSection[] = [
      {
        title: "",
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
    ];
    renderHook(() =>
      useUrlSync(sections, { policy: "lru" }, 0, false, ["lru", "fifo"], { key: "policy", max: 3 }),
    );
    vi.advanceTimersByTime(300);
    expect(spy.mock.calls[0]?.[2]).toBe(`${window.location.pathname}?p=lru%2Cfifo&i=1`);
  });
```

- [ ] **Step 14: Run the task's tests and typecheck**

Run: `pnpm exec vitest run lib/visualizer components/visualizer/hooks/useUrlSync.test.tsx && pnpm typecheck`
Expected: PASS. Typecheck may flag `VisualizerApp.tsx` for the changed `parseState` result shape only if it reads `view` strictly; it should still compile because `variants` is an added field. Fix any real error before continuing.

---

### Task 2: Multi-select chips and the header Compare toggle

**Files:**
- Modify: `components/visualizer/ui/ChoiceGroup.tsx`
- Modify: `components/visualizer/ui/ui.test.tsx`
- Modify: `components/visualizer/frame/ConfigFields.tsx`
- Modify: `components/visualizer/frame/ConfigPanel.tsx`
- Modify: `components/visualizer/frame/VizHeader.tsx`
- Modify: `components/visualizer/frame/config.test.tsx`

**Interfaces:**
- Consumes: `COMPARE_MIN` from `core/compare` (task 1).
- Produces:
  - `MultiChoiceGroup({ label, options, selected, min, max, onToggle })` exported from `ui/ChoiceGroup.tsx`.
  - `CompareControl { selected: string[]; min: number; max: number; onToggle: (id: string) => void }` exported from `frame/ConfigFields.tsx`.
  - `ConfigPanel` gains optional prop `compare?: CompareControl & { key: string }`.
  - `VizHeader` gains optional prop `compare?: { on: boolean; onChange: (on: boolean) => void }`; without it the Single/Compare group is not rendered.

- [ ] **Step 1: Write the failing `MultiChoiceGroup` test**

Append to `components/visualizer/ui/ui.test.tsx` (add `MultiChoiceGroup` to the existing `ChoiceGroup` import):

```tsx
describe("MultiChoiceGroup", () => {
  const options = [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
    { value: "c", label: "C" },
  ];

  it("marks selected chips pressed and calls onToggle with the id", () => {
    const onToggle = vi.fn();
    render(
      <MultiChoiceGroup label="Pick" options={options} selected={["a", "b"]} min={1} max={3} onToggle={onToggle} />,
    );
    expect(screen.getByRole("button", { name: "A" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "C" }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "C" }));
    expect(onToggle).toHaveBeenCalledWith("c");
  });

  it("locks selected chips at the minimum", () => {
    render(
      <MultiChoiceGroup label="Pick" options={options} selected={["a", "b"]} min={2} max={3} onToggle={() => {}} />,
    );
    expect((screen.getByRole("button", { name: "A" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "C" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("disables unselected chips at the maximum", () => {
    render(
      <MultiChoiceGroup label="Pick" options={options} selected={["a", "b", "c"]} min={2} max={3} onToggle={() => {}} />,
    );
    expect((screen.getByRole("button", { name: "A" }) as HTMLButtonElement).disabled).toBe(false);
    render(
      <MultiChoiceGroup label="Other" options={options} selected={["a", "b"]} min={2} max={2} onToggle={() => {}} />,
    );
    expect(
      (screen.getAllByRole("button", { name: "C" })[1] as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
```

If `vi`, `fireEvent` or `screen` are not already imported in that file, add them to the existing imports from `vitest` and `@testing-library/react`.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run components/visualizer/ui/ui.test.tsx`
Expected: FAIL, `MultiChoiceGroup` is not exported.

- [ ] **Step 3: Implement `MultiChoiceGroup`**

Append to `components/visualizer/ui/ChoiceGroup.tsx`:

```tsx
interface MultiChoiceGroupProps {
  label: string;
  options: ChoiceOption<string>[];
  selected: string[];
  min: number;
  max: number;
  onToggle: (value: string) => void;
}

export function MultiChoiceGroup({
  label,
  options,
  selected,
  min,
  max,
  onToggle,
}: MultiChoiceGroupProps) {
  return (
    <div className="viz-choice viz-choice--chips" role="group" aria-label={label}>
      {options.map((o) => {
        const on = selected.includes(o.value);
        // A selected chip is locked at the minimum; an unselected one is locked at the maximum.
        const locked = on ? selected.length <= min : selected.length >= max;
        return (
          <button
            key={o.value}
            type="button"
            className={`viz-choice__btn${on ? " is-on" : ""}`}
            aria-pressed={on}
            disabled={locked}
            onClick={() => onToggle(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm exec vitest run components/visualizer/ui/ui.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing config and header tests**

In `components/visualizer/frame/config.test.tsx`, replace the existing header test with these two, and add the `ConfigPanel` compare test:

```tsx
describe("VizHeader", () => {
  const baseProps = {
    title: "Eviction policies",
    subtitle: "What a full cache throws out — and why.",
    articleHref: "/system-design/components/caching/#lru-least-recently-used",
  };

  it("shows title, the article link and Copy link, and no view toggle without compare", () => {
    const onCopy = vi.fn();
    render(<VizHeader {...baseProps} onCopyLink={onCopy} />);
    expect(screen.getByRole("heading", { level: 1, name: "Eviction policies" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Compare" })).toBeNull();
    // next/link drops the slash before "#" unless the app's trailingSlash config is loaded.
    expect(screen.getByRole("link", { name: "Read article" }).getAttribute("href")).toMatch(
      /^\/system-design\/components\/caching\/?#lru-least-recently-used$/,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(onCopy).toHaveBeenCalledOnce();
  });

  it("the view toggle reflects the mode and reports changes", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <VizHeader {...baseProps} onCopyLink={() => {}} compare={{ on: false, onChange }} />,
    );
    expect(screen.getByRole("button", { name: "Single" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));
    expect(onChange).toHaveBeenLastCalledWith(true);
    rerender(<VizHeader {...baseProps} onCopyLink={() => {}} compare={{ on: true, onChange }} />);
    expect(screen.getByRole("button", { name: "Compare" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Single" }));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });
});
```

```tsx
describe("ConfigPanel compare chips", () => {
  it("turns the compare field into a multi-select and leaves other fields alone", () => {
    const onToggle = vi.fn();
    render(
      <ConfigPanel
        sections={evictionModule.sections}
        values={VALUES}
        sequence={SEQ}
        onChange={() => {}}
        compare={{ key: "policy", selected: ["lru", "fifo"], min: 2, max: 3, onToggle }}
      />,
    );
    expect(screen.getByRole("button", { name: "LRU" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "FIFO" }).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("button", { name: "LRU" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "LFU" }));
    expect(onToggle).toHaveBeenCalledWith("lfu");
    expect(screen.getByLabelText("Cache size")).toBeTruthy();
  });
});
```

- [ ] **Step 6: Run them to verify they fail**

Run: `pnpm exec vitest run components/visualizer/frame/config.test.tsx`
Expected: FAIL (no `compare` props yet).

- [ ] **Step 7: Implement the config and header changes**

In `components/visualizer/frame/ConfigFields.tsx`:

1. Change the `ChoiceGroup` import to `import { ChoiceGroup, MultiChoiceGroup } from "../ui/ChoiceGroup";`.
2. Export the control type and rewrite `ChipsInput`:

```tsx
export interface CompareControl {
  selected: string[];
  min: number;
  max: number;
  onToggle: (id: string) => void;
}

function ChipsInput({
  field,
  value,
  onChange,
  compare,
}: FieldProps<ChipsField> & { compare?: CompareControl }) {
  return (
    <div className="viz-field">
      {!field.hideLabel && <div className="viz-field__label">{field.label}</div>}
      {compare ? (
        <MultiChoiceGroup
          label={field.label}
          options={field.options}
          selected={compare.selected}
          min={compare.min}
          max={compare.max}
          onToggle={compare.onToggle}
        />
      ) : (
        <ChoiceGroup
          label={field.label}
          options={field.options}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
        />
      )}
    </div>
  );
}
```

3. Add `compare?: CompareControl;` to `ConfigFieldProps`, destructure it in `ConfigField`, and change the chips case to `return <ChipsInput field={field} value={value} onChange={onChange} compare={compare} />;`.

In `components/visualizer/frame/ConfigPanel.tsx`: import `type CompareControl` alongside `ConfigField`, add `compare?: CompareControl & { key: string };` to `ConfigPanelProps`, destructure it, and pass `compare={compare && compare.key === f.key ? compare : undefined}` to each `ConfigField`.

Replace `components/visualizer/frame/VizHeader.tsx` with:

```tsx
import Link from "next/link";

interface VizHeaderProps {
  title: string;
  subtitle: string;
  articleHref: string;
  onCopyLink: () => void;
  compare?: { on: boolean; onChange: (on: boolean) => void };
}

export function VizHeader({ title, subtitle, articleHref, onCopyLink, compare }: VizHeaderProps) {
  return (
    <header className="viz-head">
      <div className="viz-head__text">
        <h1 className="viz-head__title">{title}</h1>
        <p className="viz-head__sub">{subtitle}</p>
      </div>
      <div className="viz-head__actions">
        {compare && (
          <div className="viz-choice viz-choice--segmented" role="group" aria-label="View">
            <button
              type="button"
              className={`viz-choice__btn${compare.on ? "" : " is-on"}`}
              aria-pressed={!compare.on}
              onClick={() => compare.onChange(false)}
            >
              Single
            </button>
            <button
              type="button"
              className={`viz-choice__btn${compare.on ? " is-on" : ""}`}
              aria-pressed={compare.on}
              onClick={() => compare.onChange(true)}
            >
              Compare
            </button>
          </div>
        )}
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

- [ ] **Step 8: Run the task's tests**

Run: `pnpm exec vitest run components/visualizer/ui components/visualizer/frame/config.test.tsx`
Expected: PASS. (`VisualizerApp.test.tsx` still passes only after task 5 wires the header; if it fails now only on the header, that is expected until task 5.)

---

### Task 3: Extract `StepLines`, add `VariantTabs` and a labelled timeline lane

**Files:**
- Modify: `components/visualizer/frame/InfoTabs.tsx`
- Create: `components/visualizer/frame/VariantTabs.tsx`
- Modify: `components/visualizer/frame/InfoPanel.tsx`
- Modify: `components/visualizer/frame/TimelineStrip.tsx`
- Modify: `components/visualizer/frame/info.test.tsx`
- Modify: `components/visualizer/frame/stage-playback.test.tsx`

**Interfaces:**
- Consumes: `VizFrame`, `Rich` types.
- Produces:
  - `StepLines({ frame, sub, unit }: { frame: VizFrame; sub: number; unit: string })` exported from `InfoTabs.tsx`; `StepTab` renders it.
  - `VariantTabs({ variants, active, onChange }: { variants: { id: string; label: string }[]; active: string; onChange: (id: string) => void })`.
  - `InfoPanel` gains optional `switcher?: ReactNode` rendered above the policy header.
  - `TimelineStrip` gains optional `label?: string`.

- [ ] **Step 1: Write the failing tests**

In `components/visualizer/frame/info.test.tsx` append (reuse the file's existing imports; add `StepLines` to the `./InfoTabs` import and `VariantTabs` from `./VariantTabs`; build frames with `simulate(lru, 4, "ABCADEAFBAGC".split(""))` the same way `stage-playback.test.tsx` does, importing `simulate` and `lru` if the file lacks them):

```tsx
describe("StepLines", () => {
  const frames = simulate(lru, 4, "ABCADEAFBAGC".split(""));
  const hit = frames.find((f) => f.badge === "HIT");
  const miss = frames.find((f) => f.badge === "MISS");

  it("marks the line for the current sub-step", () => {
    if (!hit) throw new Error("fixture needs a hit frame");
    const { container } = render(<StepLines frame={hit} sub={1} unit="request" />);
    expect(container.querySelectorAll(".viz-steps__line--now")).toHaveLength(1);
  });

  it("a short path holds its last line when sub runs past it", () => {
    if (!hit || !miss) throw new Error("fixture needs a hit and a miss frame");
    expect(hit.path.length).toBeLessThan(miss.path.length);
    const { container } = render(<StepLines frame={hit} sub={miss.path.length - 1} unit="request" />);
    expect(container.querySelectorAll(".viz-steps__line--now")).toHaveLength(1);
  });
});

describe("VariantTabs", () => {
  it("lists variants, marks the active one and reports changes", () => {
    const onChange = vi.fn();
    render(
      <VariantTabs
        variants={[
          { id: "lru", label: "LRU" },
          { id: "fifo", label: "FIFO" },
        ]}
        active="lru"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("tab", { name: "LRU" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "FIFO" }));
    expect(onChange).toHaveBeenCalledWith("fifo");
  });
});
```

In `components/visualizer/frame/stage-playback.test.tsx`, add inside the existing TimelineStrip describe (or a new one) a test:

```tsx
  it("shows a lane label when given one", () => {
    render(<TimelineStrip frames={FRAMES} current={0} unit="request" onSeek={() => {}} label="LRU" />);
    expect(screen.getByText("LRU")).toBeTruthy();
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm exec vitest run components/visualizer/frame/info.test.tsx components/visualizer/frame/stage-playback.test.tsx`
Expected: FAIL (missing exports and prop).

- [ ] **Step 3: Extract `StepLines`**

In `components/visualizer/frame/InfoTabs.tsx`, replace the `StepTab` function with:

```tsx
interface StepLinesProps {
  frame: VizFrame;
  sub: number;
  unit: string;
}

export function StepLines({ frame, sub, unit }: StepLinesProps) {
  return (
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
              {/* One grid cell: bare text/chips would each become their own grid item. */}
              <span>
                <RichText value={line} />
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function StepTab({ frame, prev, sub, unit }: StepTabProps) {
  return (
    <>
      <h4 className="viz-info__label">Each {unit} runs</h4>
      <StepLines frame={frame} sub={sub} unit={unit} />
      <h4 className="viz-info__label">Variables</h4>
      <VarsTable now={frame.vars} before={prev?.vars ?? null} />
    </>
  );
}
```

- [ ] **Step 4: Create `VariantTabs`**

Create `components/visualizer/frame/VariantTabs.tsx`:

```tsx
import { useId } from "react";
import { Tabs } from "../ui/Tabs";

interface VariantTabsProps {
  variants: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}

export function VariantTabs({ variants, active, onChange }: VariantTabsProps) {
  const id = useId();
  return (
    <Tabs
      tabs={variants.map((v) => ({ id: v.id, label: v.label }))}
      active={active}
      onChange={onChange}
      idPrefix={`${id}-variant`}
    />
  );
}
```

- [ ] **Step 5: Add the `switcher` slot to `InfoPanel`**

In `components/visualizer/frame/InfoPanel.tsx`: add `import type { ReactNode }` to the react import, add `switcher?: ReactNode;` to `InfoPanelProps`, destructure it, and render it as the first child inside `<div className="viz-info">`:

```tsx
    <div className="viz-info">
      {switcher}
      <div className="viz-info__top">
```

- [ ] **Step 6: Add the lane label to `TimelineStrip`**

In `components/visualizer/frame/TimelineStrip.tsx`: add `label?: string;` to `TimelineStripProps`, destructure it, wrap the existing returned `<div className="viz-strip" ...>` in a lane wrapper, and render the label only when given:

```tsx
  return (
    <div className="viz-strip-lane">
      {label && <span className="viz-strip-lane__label">{label}</span>}
      <div className="viz-strip" ref={wrapRef}>
        {/* existing <div className="viz-strip__track"> ... </div> unchanged */}
      </div>
    </div>
  );
```

(Move the existing `viz-strip__track` block inside the inner `viz-strip` div unchanged.)

- [ ] **Step 7: Run the task's tests**

Run: `pnpm exec vitest run components/visualizer/frame/info.test.tsx components/visualizer/frame/stage-playback.test.tsx`
Expected: PASS.

---

### Task 4: `CompareGrid`, `CompareTile` and styles

**Files:**
- Create: `components/visualizer/frame/CompareGrid.tsx`
- Create: `components/visualizer/frame/CompareTile.tsx`
- Create: `components/visualizer/frame/compare.test.tsx`
- Create: `css/view-visualizer/compare.css`
- Modify: `css/tokens.css`
- Modify: `css/wiki.css`

**Interfaces:**
- Consumes: `Stage`, `Shape`, `StepLines` (task 3), `VizFrame`.
- Produces:
  - `CompareGrid({ children }: { children: ReactNode })`.
  - `CompareTile({ name, frame, sub, unit, metricLabel, subject, rotated, focused, onFocus })` with `frame: VizFrame`, `sub: number`, `rotated: boolean`, `focused: boolean`, `onFocus: () => void`, the rest strings.

- [ ] **Step 1: Write the failing tests**

Create `components/visualizer/frame/compare.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { fifo } from "@/lib/visualizer/eviction/policies/fifo";
import { lru } from "@/lib/visualizer/eviction/policies/lru";
import { simulate } from "@/lib/visualizer/eviction/simulate";
import { CompareGrid } from "./CompareGrid";
import { CompareTile } from "./CompareTile";

const SEQ = "ABCADEAFBAGC".split("");
const LRU = simulate(lru, 4, SEQ);
const FIFO = simulate(fifo, 4, SEQ);

const props = (frame = LRU[3], focused = false, onFocus = () => {}) => {
  if (!frame) throw new Error("fixture frame missing");
  return {
    name: "LRU",
    frame,
    sub: 0,
    unit: "request",
    metricLabel: "Hit rate",
    subject: "Cache",
    rotated: false,
    focused,
    onFocus,
  };
};

describe("CompareTile", () => {
  it("shows the name, outcome badge, hit rate, caption and its own pseudocode lines", () => {
    const frame = LRU[3];
    render(<CompareTile {...props(frame)} />);
    expect(screen.getByRole("region", { name: "LRU" })).toBeTruthy();
    expect(screen.getByText(frame?.badge ?? "")).toBeTruthy();
    expect(screen.getByText(frame?.metric ?? "")).toBeTruthy();
    expect(document.querySelectorAll(".viz-steps__line")).toHaveLength(frame?.lines.length ?? -1);
  });

  it("marks the focused tile and reports focus on click", () => {
    const onFocus = vi.fn();
    const { rerender } = render(<CompareTile {...props(LRU[3], false, onFocus)} />);
    expect(screen.getByRole("region", { name: "LRU" }).className).not.toContain("is-focused");
    fireEvent.click(screen.getByRole("button", { name: "LRU" }));
    expect(onFocus).toHaveBeenCalled();
    rerender(<CompareTile {...props(LRU[3], true, onFocus)} />);
    expect(screen.getByRole("region", { name: "LRU" }).className).toContain("is-focused");
    expect(screen.getByRole("button", { name: "LRU" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("a short-path tile still has an active line when the shared sub-step runs past it", () => {
    const hit = LRU.find((f) => f.badge === "HIT");
    if (!hit) throw new Error("fixture needs a hit frame");
    render(<CompareTile {...props(hit)} sub={5} />);
    expect(document.querySelectorAll(".viz-steps__line--now")).toHaveLength(1);
  });
});

describe("CompareGrid", () => {
  it("renders its tiles", () => {
    render(
      <CompareGrid>
        <CompareTile {...props(LRU[3])} />
        <CompareTile {...props(FIFO[3])} name="FIFO" />
      </CompareGrid>,
    );
    expect(screen.getByRole("region", { name: "LRU" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "FIFO" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run components/visualizer/frame/compare.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Create the components**

Create `components/visualizer/frame/CompareGrid.tsx`:

```tsx
import type { ReactNode } from "react";

export function CompareGrid({ children }: { children: ReactNode }) {
  return <div className="viz-compare">{children}</div>;
}
```

Create `components/visualizer/frame/CompareTile.tsx`:

```tsx
import type { VizFrame } from "@/lib/visualizer/core/types";
import { Shape } from "../shapes/Shape";
import { StepLines } from "./InfoTabs";
import { Stage } from "./Stage";

interface CompareTileProps {
  name: string;
  frame: VizFrame;
  sub: number;
  unit: string;
  metricLabel: string;
  subject: string;
  rotated: boolean;
  focused: boolean;
  onFocus: () => void;
}

export function CompareTile({
  name,
  frame,
  sub,
  unit,
  metricLabel,
  subject,
  rotated,
  focused,
  onFocus,
}: CompareTileProps) {
  return (
    // The header button is the keyboard path; a click anywhere on the tile also focuses it.
    <section
      className={`viz-tile${focused ? " is-focused" : ""}`}
      aria-label={name}
      onClick={onFocus}
    >
      <header className="viz-tile__head">
        <button type="button" className="viz-tile__name" aria-pressed={focused}>
          {name}
        </button>
        <span className={`viz-badge viz-badge--${frame.outcome}`}>{frame.badge}</span>
      </header>
      <Stage metric={frame.metric} metricLabel={metricLabel} caption={frame.caption}>
        {(size) => <Shape model={frame.model} rotated={rotated} size={size} subject={subject} />}
      </Stage>
      <StepLines frame={frame} sub={sub} unit={unit} />
    </section>
  );
}
```

If Biome rejects the `onClick` on `section` (a11y static-element-interaction rule), add a one-line `// biome-ignore lint/a11y/<rule reported by biome>: header button is the keyboard path` directly above the `<section` line, using the rule name Biome prints. Do not remove the click handler.

- [ ] **Step 4: Add tokens and styles**

In `css/tokens.css`, next to the other `--viz-*` sizing tokens (find them with `grep -n "viz-cell-w" css/tokens.css`), add:

```css
  --viz-tile-min-w: 340px;
  --viz-tile-min-h: 380px;
```

Create `css/view-visualizer/compare.css`:

```css
/* ═══════════════════════════════════════════════
   VISUALIZER — COMPARE GRID
   ═══════════════════════════════════════════════ */
.viz-compare {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--viz-tile-min-w)), 1fr));
  grid-auto-rows: minmax(var(--viz-tile-min-h), 1fr);
  gap: var(--s3);
  padding: var(--s3);
  overflow-y: auto;
}
.viz-tile {
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--surface);
  overflow: hidden;
  cursor: pointer;
}
.viz-tile.is-focused {
  border-color: var(--accent);
}
.viz-tile__head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s2);
  padding: var(--s2) var(--s3);
  border-bottom: 1px solid var(--border);
}
.viz-tile__name {
  border: 0;
  background: transparent;
  color: var(--text-heading);
  font-size: var(--text-md);
  font-weight: var(--fw-extrabold);
  cursor: pointer;
}
.viz-tile .viz-stage {
  flex: 1;
  height: auto;
  min-height: 0;
}
.viz-tile .viz-steps {
  flex: none;
  padding: var(--s2) var(--s3) var(--s3);
}
.viz-strip-lane {
  display: flex;
  flex-direction: column;
}
.viz-strip-lane__label {
  padding: var(--s1) var(--s4) 0;
  font-size: var(--text-xs);
  font-weight: var(--fw-extrabold);
  letter-spacing: var(--viz-tracking);
  text-transform: uppercase;
  color: var(--text-muted);
}
```

Before writing, confirm each token used above exists (`--r-md`, `--text-md`, `--s1`..`--s3`): run `grep -n -e "--r-md" -e "--text-md" css/tokens.css`; if one is missing, use the nearest existing token from the same scale rather than inventing a value.

In `css/wiki.css` add after the `layout.css` import line:

```css
@import "./view-visualizer/compare.css";
```

- [ ] **Step 5: Run the task's tests**

Run: `pnpm exec vitest run components/visualizer/frame/compare.test.tsx && pnpm exec biome check components/visualizer css`
Expected: PASS, no Biome errors.

---

### Task 5: Wire compare into `VisualizerApp`

**Files:**
- Modify: `components/visualizer/frame/VisualizerApp.tsx`
- Modify: `components/visualizer/frame/VisualizerApp.test.tsx`

**Interfaces:**
- Consumes: everything from tasks 1–4 (`clockFrames`, `enterCompare`, `leaveCompare`, `toggleVariant`, `variantOptions`, `COMPARE_MIN`, `CompareSpec`, `CompareGrid`, `CompareTile`, `VariantTabs`, `CompareControl`, `TimelineStrip` `label`, `InfoPanel` `switcher`, `VizHeader` `compare`, `useUrlSync` extras, `parseState`/`encodeState` compare param).
- Produces: the finished feature; no new exports.

- [ ] **Step 1: Write the failing integration tests**

Add `within` to the `@testing-library/react` import in `components/visualizer/frame/VisualizerApp.test.tsx`, then append to its `describe("VisualizerApp", ...)` block:

```tsx
  it("a list in the URL boots compare mode with one tile per policy on one shared step", () => {
    at("?p=lru,fifo,lfu&q=ABCADEAFBAGC&i=4");
    render(<VisualizerApp slug="eviction-policies" />);
    for (const name of ["LRU", "FIFO", "LFU"]) {
      expect(screen.getByRole("region", { name })).toBeTruthy();
    }
    expect(screen.getByText("request 4 / 12")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next request" }));
    expect(screen.getByText("request 5 / 12")).toBeTruthy();
    expect(screen.getAllByText("request 5 / 12")).toHaveLength(1);
  });

  it("the header toggle enters compare keeping the current policy first, and leaving keeps it", () => {
    at("?p=fifo&q=ABCADEAFBAGC");
    render(<VisualizerApp slug="eviction-policies" />);
    expect(screen.queryByRole("region", { name: "LRU" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));
    const names = screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"));
    expect(names.filter((n) => n === "FIFO" || n === "LRU")).toEqual(["FIFO", "LRU"]);
    fireEvent.click(screen.getByRole("button", { name: "Single" }));
    expect(screen.queryByRole("region", { name: "LRU" })).toBeNull();
    expect(screen.getByRole("heading", { name: "FIFO" })).toBeTruthy();
  });

  it("clicking a tile moves the details panel to that policy", () => {
    at("?p=lru,fifo&q=ABCADEAFBAGC");
    render(<VisualizerApp slug="eviction-policies" />);
    expect(screen.getByRole("heading", { name: "LRU" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "FIFO", pressed: false }));
    expect(screen.getByRole("heading", { name: "FIFO" })).toBeTruthy();
  });

  it("deselecting the focused policy moves focus to the first remaining one", () => {
    at("?p=lru,fifo,lfu&q=ABCADEAFBAGC");
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("tab", { name: "LFU" }));
    expect(screen.getByRole("heading", { name: "LFU" })).toBeTruthy();
    const chips = within(screen.getByRole("group", { name: "Policy" }));
    fireEvent.click(chips.getByRole("button", { name: "LFU" }));
    expect(screen.queryByRole("region", { name: "LFU" })).toBeNull();
    expect(screen.getByRole("heading", { name: "LRU" })).toBeTruthy();
  });

  it("chips cannot drop below two policies", () => {
    at("?p=lru,fifo&q=ABCADEAFBAGC");
    render(<VisualizerApp slug="eviction-policies" />);
    const chips = within(screen.getByRole("group", { name: "Policy" }));
    for (const name of ["LRU", "FIFO"]) {
      expect((chips.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
    }
    expect((chips.getByRole("button", { name: "LFU" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("changing a shared input keeps the selected policies and restarts every tile", () => {
    at("?p=lru,fifo&q=ABCADEAFBAGC&i=8");
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("button", { name: "Loop" }));
    expect(screen.getByRole("region", { name: "LRU" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "FIFO" })).toBeTruthy();
    expect(screen.getByText(/request 1 \//)).toBeTruthy();
  });

  it("Copy link carries the whole variant list", async () => {
    at("?p=lru,fifo&q=ABCADEAFBAGC");
    vi.mocked(writeToClipboard).mockResolvedValue(undefined);
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(writeToClipboard).toHaveBeenCalled());
    expect(String(vi.mocked(writeToClipboard).mock.calls[0]?.[0])).toContain("p=lru%2Cfifo");
  });
```

The "Next request" test relies on the shared `request N / 12` count text appearing exactly once because there is one `PlaybackBar`.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm exec vitest run components/visualizer/frame/VisualizerApp.test.tsx`
Expected: FAIL (no tiles, header has no Compare button).

- [ ] **Step 3: Rewrite `VisualizerBody`**

In `components/visualizer/frame/VisualizerApp.tsx`, add the imports:

```tsx
import {
  clockFrames,
  COMPARE_MIN,
  enterCompare,
  leaveCompare,
  toggleVariant,
  variantOptions,
} from "@/lib/visualizer/core/compare";
import { CompareGrid } from "./CompareGrid";
import { CompareTile } from "./CompareTile";
import { VariantTabs } from "./VariantTabs";
```

Replace the whole `VisualizerBody` function with:

```tsx
function VisualizerBody({ mod }: { mod: VisualizerModule }) {
  const compare = mod.compare;
  const [boot] = useState(() =>
    parseState(window.location.search, mod.sections, mod.defaults(), compare),
  );
  const [values, setValues] = useState(boot.values);
  const [variants, setVariants] = useState(boot.view.variants);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [rotated, setRotated] = useState(boot.view.rotated);
  const runs = useMemo(
    () =>
      compare
        ? variants.map((v) => mod.run({ ...values, [compare.key]: v }))
        : [mod.run(values)],
    [mod, compare, variants, values],
  );
  const frames = useMemo(() => clockFrames(runs.map((r) => r.frames)), [runs]);
  const pb = usePlayback(frames, boot.view.frame);
  const { restart, toggle, step } = pb;
  useVizHotkeys({ toggle, step });
  useUrlSync(mod.sections, values, pb.frame, rotated, compare ? variants : undefined, compare);
  const panels = usePanelPrefs();

  const isCompare = variants.length >= COMPARE_MIN;
  const focusIndex = Math.max(0, variants.indexOf(focusId ?? ""));
  const focusRun = runs[focusIndex] ?? runs[0];
  const options = useMemo(
    () => (compare ? variantOptions(mod.sections, compare.key) : []),
    [mod, compare],
  );

  // The compare key always mirrors the first variant so single mode and the config panel agree.
  const applyVariants = useCallback(
    (next: string[]) => {
      if (!compare) return;
      setVariants(next);
      setValues((v) => ({ ...v, [compare.key]: next[0] ?? "" }));
    },
    [compare],
  );
  const change = useCallback(
    (key: string, value: FieldValue) => {
      if (compare && key === compare.key && typeof value === "string") setVariants([value]);
      setValues((v) => applyChange(mod.sections, v, key, value));
      restart();
    },
    [mod, compare, restart],
  );
  const toggleOne = useCallback(
    (id: string) => {
      if (compare) applyVariants(toggleVariant(variants, id, compare.max));
    },
    [compare, variants, applyVariants],
  );
  const setCompareOn = useCallback(
    (on: boolean) =>
      applyVariants(
        on ? enterCompare(variants, options.map((o) => o.value)) : leaveCompare(variants),
      ),
    [variants, options, applyVariants],
  );
  const runTry = useCallback(
    (e: Experiment) => {
      setValues((v) => ({ ...v, ...e.patch }));
      restart();
    },
    [restart],
  );
  const copyLink = useCallback(() => {
    const search = encodeState(
      mod.sections,
      values,
      { frame: pb.frame, rotated, variants: compare ? variants : undefined },
      compare,
    );
    const url = `${window.location.origin}${window.location.pathname}${search}`;
    writeToClipboard(url).then(
      () => showToast("Link copied"),
      () => showToast("Couldn't copy the link"),
    );
  }, [mod, compare, values, variants, pb.frame, rotated]);

  const first = runs[0];
  const frame = first?.frames[pb.frame];
  if (!first || !focusRun || !frame) return null;
  const axisRun = runs.find((r) => {
    const m = r.frames[pb.frame]?.model;
    return m ? defaultAxis(m) !== null : false;
  });
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
        articleHref={focusRun.info.articleHref}
        onCopyLink={copyLink}
        compare={compare ? { on: isCompare, onChange: setCompareOn } : undefined}
      />
      <div className="viz-app__body">
        <SidePanel
          side="left"
          title={mod.sections[0]?.title || "Configure"}
          railLabel="Configure"
          railIcon={<Icon name="settings" />}
          collapsed={panels.left}
          onToggle={() => panels.toggle("left")}
        >
          <ConfigPanel
            sections={mod.sections}
            values={values}
            sequence={first.sequence}
            onChange={change}
            compare={
              compare && isCompare
                ? {
                    key: compare.key,
                    selected: variants,
                    min: COMPARE_MIN,
                    max: compare.max,
                    onToggle: toggleOne,
                  }
                : undefined
            }
          />
        </SidePanel>
        <div className="viz-app__centre">
          {isCompare ? (
            <CompareGrid>
              {runs.map((run, i) => {
                const f = run.frames[pb.frame];
                const id = variants[i] ?? "";
                if (!f) return null;
                return (
                  <CompareTile
                    key={id}
                    name={run.info.name}
                    frame={f}
                    sub={pb.sub}
                    unit={mod.unit}
                    metricLabel={run.metricLabel}
                    subject={mod.subject}
                    rotated={rotated}
                    focused={i === focusIndex}
                    onFocus={() => setFocusId(id)}
                  />
                );
              })}
            </CompareGrid>
          ) : (
            <Stage metric={frame.metric} metricLabel={first.metricLabel} caption={frame.caption}>
              {(size) => (
                <Shape model={frame.model} rotated={rotated} size={size} subject={mod.subject} />
              )}
            </Stage>
          )}
          <div className="viz-foot">
            <PlaybackBar
              frame={pb.frame}
              total={frames.length}
              unit={mod.unit}
              playing={pb.playing}
              speed={pb.speed}
              repeat={pb.repeat}
              rotate={
                axisRun
                  ? {
                      rotated,
                      defaultName: axisRun.info.chip.toLowerCase(),
                      onToggle: () => setRotated((r) => !r),
                    }
                  : null
              }
              onSeek={pb.seek}
              onStep={step}
              onToggle={toggle}
              onSpeed={pb.setSpeed}
              onRepeat={pb.cycleRepeat}
            />
            {runs.map((run, i) => (
              <TimelineStrip
                key={variants[i] ?? "single"}
                frames={run.frames}
                current={pb.frame}
                unit={mod.unit}
                onSeek={pb.seek}
                label={isCompare ? run.info.name : undefined}
              />
            ))}
          </div>
        </div>
        <SidePanel
          side="right"
          title={focusRun.info.heading}
          railLabel="Details"
          railIcon={<Icon name="help" />}
          collapsed={panels.right}
          onToggle={() => panels.toggle("right")}
        >
          <InfoPanel
            info={focusRun.info}
            frames={focusRun.frames}
            frame={pb.frame}
            sub={pb.sub}
            unit={mod.unit}
            onSeek={pb.seek}
            onTry={runTry}
            switcher={
              isCompare ? (
                <VariantTabs
                  variants={runs.map((run, i) => ({ id: variants[i] ?? "", label: run.info.name }))}
                  active={variants[focusIndex] ?? ""}
                  onChange={setFocusId}
                />
              ) : undefined
            }
          />
        </SidePanel>
      </div>
    </main>
  );
}
```

`variants` is `[]` for a module without `compare`, so `isCompare` is false, `runs` has one entry, the timeline renders one unlabelled lane, and the URL carries no variants, matching today's behaviour.

- [ ] **Step 4: Run the integration tests**

Run: `pnpm exec vitest run components/visualizer/frame/VisualizerApp.test.tsx`
Expected: PASS. If a role query is ambiguous (for example two elements named "LRU"), tighten the query in the test (scope with `within(screen.getByRole("region", { name: "LRU" }))`) rather than changing component markup.

- [ ] **Step 5: Run the whole visualizer suite, typecheck, lint, format**

Run: `pnpm exec vitest run lib/visualizer components/visualizer app/visualizer.test.tsx && pnpm typecheck && pnpm exec biome check components lib app css && pnpm lint`
Expected: all PASS with no Biome or ESLint errors. Fix real failures; do not suppress them.

- [ ] **Step 6: Check the layout in a browser at three widths**

Run `pnpm dev`, open `/visualizer/eviction-policies/?p=lru,fifo,lfu` and confirm: 3 tiles across at ~1440px, 2 + 1 at ~900px, one per row at 320px with no horizontal page scroll; the playback bar stays below the grid; clicking a tile moves the highlight border and the details tab. Report what you saw, including anything off, instead of declaring it done.

---

### Task 6: Docs

**Files:**
- Modify: `docs/_meta/visualizer/README.md`
- Modify: `docs/superpowers/specs/2026-10-07-cache-visualizer-design.md`
- Modify: `CONVENTIONS.md`

**Interfaces:**
- Consumes: the shipped behaviour from tasks 1–5.
- Produces: docs that match the code.

- [ ] **Step 1: Rewrite the compare statements**

Find each statement with `grep -n -i "compare\|common grid\|common shape" docs/_meta/visualizer/README.md docs/superpowers/specs/2026-10-07-cache-visualizer-design.md CONVENTIONS.md` and change them as follows:

- `docs/_meta/visualizer/README.md`: replace the roadmap bullet "Compare mode — up to 3 variants side by side on a common grid." with a shipped description: "Compare mode — 2–3 variants as an auto-fit tile grid on one shared clock and input; each tile keeps its own shape and pseudocode; the details panel follows the focused tile." Delete the "Common grid (planned)" row from the shapes table. Replace principle 2 ("Native view for depth, common view for comparison...") with "Compare keeps each variant's native shape; variants share one input and one clock so divergence shows in the same step." Update the page-anatomy header line so `[Single|Compare]` is described as enabled when the module declares `compare`.
- `docs/superpowers/specs/2026-10-07-cache-visualizer-design.md`: replace "Compare mode (common grid, up to 3 policies)" in the follow-ups list with a pointer to `2026-10-07-visualizer-compare-mode-design.md`, and replace the "Compare toggle is rendered disabled in v1" line with "Compare is specified in 2026-10-07-visualizer-compare-mode-design.md".
- `CONVENTIONS.md` line ending "Compare mode uses one common shape.": replace that sentence with "Compare mode renders each variant's native shape in a tile grid on one shared clock."

Keep every changed Markdown paragraph on a single line.

- [ ] **Step 2: Verify no stale statement remains**

Run: `grep -rn -i "common grid\|common shape\|coming soon" docs/_meta/visualizer docs/superpowers/specs CONVENTIONS.md components/visualizer`
Expected: no match describing compare as a common grid or as unavailable. A hit inside this plan or the compare spec describing what was superseded is fine.
