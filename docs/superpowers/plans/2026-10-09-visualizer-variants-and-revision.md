# Visualizer Variants and Revision View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire compare mode, make variant switching keep the current step (with prev/next buttons and Shift+←/→), and add a Revision view of looping concept cards that can be reordered and opened in Single.

**Architecture:** `VisualizerModule.compare` becomes `variants: { key }` plus an optional `revision: RevisionCard[]`. Single stays the one-variant path and switches variant by re-seeking the current frame. Revision is a separate `RevisionView` (grid of cards on one loop clock, drag and keyboard reorder, info popup) chosen by a `view` URL param and a header toggle; its visuals are existing shape models or a new generic `FlowDiagram`.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest + Testing Library, plain CSS with tokens, Biome + ESLint, pnpm.

**Spec:** [docs/superpowers/specs/2026-10-09-visualizer-variants-and-revision-design.md](../specs/2026-10-09-visualizer-variants-and-revision-design.md)

## Global Constraints

- No git, commit, branch or staging steps anywhere; the user owns version control.
- No ticket or backlog IDs (`WIKI-xxx`, `DSA-xxx`, `SD-xxx`) in code comments or CSS section headers.
- Comments and docstrings (TS and CSS) are one line, never multi-line prose blocks, including in tests.
- Nothing under `components/visualizer/` or `lib/visualizer/core/` may name a specific visualizer; eviction and caching specifics live in `lib/visualizer/eviction/` and `lib/visualizer/caching/`.
- Never hard-wrap prose in Markdown files; one line per paragraph or list item.
- CSS tasks start in `css/tokens.css`; colours come from existing tokens; each new stylesheet is imported from `css/wiki.css`.
- Revision timing starts at `900ms` per step, `2000ms` hold, `600ms` reset; column groups are 4 from `1090px`, 3 from `810px`, 2 from `540px`, 1 below, measured on the grid's inner width (`clientWidth`).
- Line styles are fixed everywhere: solid is a synchronous step on the request path, dashed is asynchronous or background work, dotted is conditional or fallback.
- Write the tests inside each task but run nothing until Task 11; the whole set is run once at the end, after everything is locked. Do not run the e2e suite.

## Review Focus

- A saved card order that holds ids no longer in the module, misses a newly added variant, or is malformed JSON must still give every variant exactly once (task 3 tests).
- Switching variant while paused on a frame where the new variant's path is longer than the old one must show the new variant's last line, not an early line (task 2 test).
- Card counts of 1 and 2, a zero or negative column count, and a width of 0 (jsdom) must never throw or produce an empty grid (task 3 and task 8 tests).
- Under reduced motion Revision must show every card's finished state with no loop and no toggle button (task 8 test).
- The info popup must fall back to the module's summary when the glossary has no entry, close on Escape, and its Open in Single button must land on that variant (task 9 and task 10 tests).

---

### Task 1: Retire compare and introduce the `variants` contract

**Files:**
- Delete: `lib/visualizer/core/compare.ts`, `lib/visualizer/core/compare.test.ts`, `components/visualizer/frame/CompareGrid.tsx`, `components/visualizer/frame/CompareTile.tsx`, `components/visualizer/frame/VariantTabs.tsx`, `components/visualizer/frame/compare.test.tsx`, `css/view-visualizer/compare.css`
- Modify: `css/wiki.css`, `css/tokens.css`, `lib/visualizer/core/types.ts`, `lib/visualizer/core/url-state.ts`, `lib/visualizer/eviction/module.ts`, `lib/visualizer/eviction/types.ts`, `lib/visualizer/caching/module.ts`, `components/visualizer/hooks/useUrlSync.ts`, `components/visualizer/ui/ChoiceGroup.tsx`, `components/visualizer/ui/Tabs.tsx`, `components/visualizer/frame/{Stage,TimelineStrip,InfoPanel,VizHeader,ConfigFields,ConfigPanel,VisualizerApp}.tsx`
- Modify tests: `components/visualizer/ui/ui.test.tsx`, `components/visualizer/frame/{config,info,stage-playback,VisualizerApp}.test.tsx`, `components/visualizer/hooks/useUrlSync.test.tsx`, `lib/visualizer/core/url-state.test.ts`, `lib/visualizer/eviction/module.test.ts`, `lib/visualizer/caching/module.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `VariantsSpec { key: string }` and `VisualizerModule.variants?: VariantsSpec` in `core/types.ts`; `VisualizerModule.availability?: (values: InputValues) => Record<string, FieldAvailability>`; `ViewState { frame: number; rotated: boolean }` and `encodeState(sections, values, view)` / `parseState(search, sections, defaults)` without any compare argument; `useUrlSync(sections, values, frame, rotated)`; `POLICY_IDS = ["fifo", "lru", "lfu", "clock"]` (chip order is difficulty order, default policy stays `"lru"`).

- [ ] **Step 1: Write the failing contract tests**

In `lib/visualizer/eviction/module.test.ts` replace the test `declares policy as the compare field with a maximum of three` with:

```ts
  it("declares policy as the variants field, in difficulty order", () => {
    expect(evictionModule.variants).toEqual({ key: "policy" });
    expect(POLICY_IDS).toEqual(["fifo", "lru", "lfu", "clock"]);
    expect(evictionModule.defaults().policy).toBe("lru");
  });
```

and in the `URL round-trips through the module's own fields` test change the two calls back to the three-argument forms:

```ts
    const { sections } = evictionModule;
    const search = encodeState(sections, values, { frame: 2, rotated: false });
    expect(parseState(search, sections, evictionModule.defaults()).values).toEqual(values);
```

In `lib/visualizer/caching/module.test.ts` change the helper at the top of the availability describe to:

```ts
  const availability = (strategy: string) =>
    cachingModule.availability?.({ ...defaults(), strategy }) ?? {};
```

delete the test `in compare mode a slider is dimmed only when no selected strategy uses it`, delete the `const compare = cachingModule.compare;` line, and change the round-trip test to use `encodeState(CACHING_SECTIONS, values, { frame: 2, rotated: false })` and `parseState(search, CACHING_SECTIONS, defaults())` with no `variants` and no `compare`, dropping the `back.view.variants` assertion. Add:

```ts
  it("declares strategy as the variants field", () => {
    expect(cachingModule.variants).toEqual({ key: "strategy" });
  });
```

- [ ] **Step 2: Change the contract and the two modules**

In `lib/visualizer/core/types.ts` replace `CompareSpec` and the module field with:

```ts
export interface VariantsSpec {
  // The chips field whose options are the variants; option order is the default order.
  key: string;
}
```

and in `VisualizerModule` replace `compare?: CompareSpec;` with `variants?: VariantsSpec;` and the `availability` member with:

```ts
  // Per field key, which inputs matter for the current choice.
  availability?: (values: InputValues) => Record<string, FieldAvailability>;
```

In `lib/visualizer/eviction/types.ts` set `export const POLICY_IDS = ["fifo", "lru", "lfu", "clock"] as const;`. In `lib/visualizer/eviction/module.ts` replace `compare: { key: "policy", max: 3 },` with `variants: { key: "policy" },`. In `lib/visualizer/caching/module.ts` replace `compare: { key: "strategy", max: 3 },` with `variants: { key: "strategy" },` and replace the `availability` function with:

```ts
function availability(values: InputValues): Record<string, FieldAvailability> {
  const def = isStrategy(String(values.strategy)) ? STRATEGIES[values.strategy as StrategyId] : null;
  return {
    lifetime: def?.usesLifetime
      ? {}
      : { disabled: true, hint: "Used by read-through, write-around and refresh-ahead." },
    flushEvery: def?.usesFlush ? {} : { disabled: true, hint: "Used by write-behind." },
  };
}
```

(Keep the existing `isStrategy`, `STRATEGIES`, `StrategyId` imports; delete any import that becomes unused, such as `StrategyDef`.)

- [ ] **Step 3: Remove the compare code**

Run:

```bash
rm lib/visualizer/core/compare.ts lib/visualizer/core/compare.test.ts components/visualizer/frame/CompareGrid.tsx components/visualizer/frame/CompareTile.tsx components/visualizer/frame/VariantTabs.tsx components/visualizer/frame/compare.test.tsx css/view-visualizer/compare.css
```

Then make these edits:
- `css/wiki.css`: delete the `@import "./view-visualizer/compare.css";` line.
- `css/tokens.css`: delete `--viz-tile-min-w` and `--viz-tile-min-h`.
- `components/visualizer/ui/ChoiceGroup.tsx`: delete `MultiChoiceGroupProps` and `MultiChoiceGroup`.
- `components/visualizer/ui/Tabs.tsx`: remove the `label` and `controlsPanel` props, restoring `aria-controls={`${idPrefix}-panel`}` and a plain `role="tablist"` div.
- `components/visualizer/frame/Stage.tsx`: remove the `announce` prop; the caption always has `aria-live="polite"`.
- `components/visualizer/frame/TimelineStrip.tsx`: replace the file with:

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

- `components/visualizer/frame/InfoPanel.tsx`: remove the `switcher` prop, its `ReactNode` import and the `{switcher}` line.
- `components/visualizer/frame/ConfigFields.tsx`: remove `CompareControl`, the `compare` props, the `MultiChoiceGroup` import, and make `ChipsInput` render only `ChoiceGroup`.
- `components/visualizer/frame/ConfigPanel.tsx`: remove the `compare` prop and its `CompareControl` import; keep `availability`.
- `components/visualizer/frame/VizHeader.tsx`: remove the `compare` prop and the whole `viz-choice--segmented` View group (the view toggle returns in task 10).
- `components/visualizer/hooks/useUrlSync.ts`: replace with:

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

- `lib/visualizer/core/url-state.ts`: remove the `normalizeVariants` and `CompareSpec` imports, `variants` from `ViewState`, the `ViewInput` type, the `compare` parameters and branches in `encodeState` and `parseState`, and the `variants` local; the chips branch in `parseState` becomes `if (f.options.some((o) => o.value === raw)) values[f.key] = raw;`.

- [ ] **Step 4: Rewrite `VisualizerBody` as the single-variant path**

In `components/visualizer/frame/VisualizerApp.tsx` delete the compare imports (`COMPARE_MIN`, `clockFrames`, `enterCompare`, `leaveCompare`, `toggleVariant`, `variantOptions`, `CompareGrid`, `CompareTile`, `VariantTabs`) and replace `VisualizerBody` with:

```tsx
function VisualizerBody({ mod }: { mod: VisualizerModule }) {
  const [boot] = useState(() => parseState(window.location.search, mod.sections, mod.defaults()));
  const [values, setValues] = useState(boot.values);
  const [rotated, setRotated] = useState(boot.view.rotated);
  const result = useMemo(() => mod.run(values), [mod, values]);
  const pb = usePlayback(result.frames, boot.view.frame);
  const { restart, toggle, step } = pb;
  useVizHotkeys({ toggle, step });
  useUrlSync(mod.sections, values, pb.frame, rotated);
  const panels = usePanelPrefs();
  const availability = useMemo(() => mod.availability?.(values), [mod, values]);

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
          railIcon={<Icon name="settings" />}
          collapsed={panels.left}
          onToggle={() => panels.toggle("left")}
        >
          <ConfigPanel
            sections={mod.sections}
            values={values}
            sequence={result.sequence}
            onChange={change}
            availability={availability}
          />
        </SidePanel>
        <div className="viz-app__centre">
          <Stage metric={frame.metric} metricLabel={result.metricLabel} caption={frame.caption}>
            {(size) => (
              <Shape model={frame.model} rotated={rotated} size={size} subject={mod.subject} />
            )}
          </Stage>
          <div className="viz-foot">
            <PlaybackBar
              frame={pb.frame}
              total={result.frames.length}
              unit={mod.unit}
              playing={pb.playing}
              speed={pb.speed}
              repeat={pb.repeat}
              rotate={
                defaultAxis(frame.model)
                  ? {
                      rotated,
                      defaultName: result.info.chip.toLowerCase(),
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
            <TimelineStrip
              frames={result.frames}
              current={pb.frame}
              unit={mod.unit}
              onSeek={pb.seek}
            />
          </div>
        </div>
        <SidePanel
          side="right"
          title={result.info.heading}
          railLabel="Details"
          railIcon={<Icon name="help" />}
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

- [ ] **Step 5: Delete the compare tests and fix the remaining ones**

- `components/visualizer/ui/ui.test.tsx`: delete the `describe("MultiChoiceGroup", ...)` block and the `MultiChoiceGroup` import.
- `components/visualizer/frame/config.test.tsx`: replace the two `VizHeader` tests with one that renders `<VizHeader title="Eviction policies" subtitle="What a full cache throws out — and why." articleHref="/system-design/components/caching/#lru-least-recently-used" onCopyLink={onCopy} />` and checks the h1, the article link (`/^\/system-design\/components\/caching\/?#lru-least-recently-used$/`) and that the Copy link button calls `onCopy`; delete the `ConfigPanel compare chips` describe.
- `components/visualizer/frame/info.test.tsx`: delete the `VariantTabs` describe and its import; keep the `StepLines` tests.
- `components/visualizer/frame/stage-playback.test.tsx`: delete the `combined compare lane` describe and the `fifo` import.
- `components/visualizer/hooks/useUrlSync.test.tsx`: delete the `writes the variant list when a compare spec is given` test.
- `lib/visualizer/core/url-state.test.ts`: remove the `variants: []` additions from the three view expectations (back to `{ frame, rotated }`) and delete the tests `encodes a variant list...`, `parses a variant list...`, `dedupes, drops unknown ids...`, `an old single-policy link yields one variant`, `a junk or empty list falls back...`, `without a compare spec...` and the `COMPARE` constant.
- `components/visualizer/frame/VisualizerApp.test.tsx`: delete the compare tests (`a list in the URL boots compare mode...`, `the header toggle enters compare...`, `clicking a tile moves the details panel...`, `deselecting the focused policy...`, `chips cannot drop below two policies`, `changing a shared input keeps the selected policies...`, `Copy link carries the whole variant list`, `a deselected policy does not take focus back...`, `only the focused tile announces its caption`) and the now unused `within` import.
- `components/visualizer/frame/VisualizerApp.test.tsx` also has a test that clicks `CLOCK` and expects the heading; it still passes. Any test that selected a policy by chip order needs no change because it selects by name.

### Task 2: Variant switching keeps the step; prev/next and Shift+←/→

**Files:**
- Create: `lib/visualizer/core/variants.ts`, `lib/visualizer/core/variants.test.ts`
- Modify: `components/visualizer/hooks/usePlayback.ts`, `components/visualizer/hooks/usePlayback.test.tsx`, `components/visualizer/hooks/useVizHotkeys.ts`, `components/visualizer/hooks/useVizHotkeys.test.tsx`, `components/visualizer/frame/ConfigFields.tsx`, `components/visualizer/frame/ConfigPanel.tsx`, `components/visualizer/frame/VisualizerApp.tsx`, `components/visualizer/frame/VisualizerApp.test.tsx`, `css/view-visualizer/ui.css`

**Interfaces:**
- Consumes: `VariantsSpec` and `FieldSection` from task 1.
- Produces:
  - `variantOptions(sections: FieldSection[], key: string): { value: string; label: string }[]`
  - `stepVariant(ids: string[], current: string, delta: number): string` (wraps around)
  - `Playback.pause: () => void`
  - `useVizHotkeys({ toggle, step?, variant?, enabled? })` where `variant(delta)` fires on Shift+←/→
  - `ConfigPanel` prop `variantNav?: { key: string; onStep: (delta: number) => void }`

- [ ] **Step 1: Write the failing pure tests**

Create `lib/visualizer/core/variants.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { FieldSection } from "./fields";
import { stepVariant, variantOptions } from "./variants";

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
          { value: "fifo", label: "FIFO" },
          { value: "lru", label: "LRU" },
          { value: "lfu", label: "LFU" },
        ],
      },
    ],
  },
];

describe("variants", () => {
  it("variantOptions reads the chips options of the named field", () => {
    expect(variantOptions(sections, "policy").map((o) => o.value)).toEqual(["fifo", "lru", "lfu"]);
    expect(variantOptions(sections, "missing")).toEqual([]);
  });

  it("stepVariant moves by one and wraps in both directions", () => {
    const ids = ["fifo", "lru", "lfu"];
    expect(stepVariant(ids, "fifo", 1)).toBe("lru");
    expect(stepVariant(ids, "lfu", 1)).toBe("fifo");
    expect(stepVariant(ids, "fifo", -1)).toBe("lfu");
  });

  it("stepVariant starts from the first id when current is unknown and handles an empty list", () => {
    expect(stepVariant(["a", "b"], "zzz", 1)).toBe("b");
    expect(stepVariant([], "x", 1)).toBe("x");
  });
});
```

- [ ] **Step 2: Implement the helpers**

Create `lib/visualizer/core/variants.ts`:

```ts
import { allFields, type FieldSection } from "./fields";

export function variantOptions(
  sections: FieldSection[],
  key: string,
): { value: string; label: string }[] {
  const field = allFields(sections).find((f) => f.kind === "chips" && f.key === key);
  return field?.kind === "chips" ? field.options : [];
}

export function stepVariant(ids: string[], current: string, delta: number): string {
  if (ids.length === 0) return current;
  const at = Math.max(0, ids.indexOf(current));
  const next = (((at + delta) % ids.length) + ids.length) % ids.length;
  return ids[next] ?? current;
}
```

- [ ] **Step 3: Write the failing hotkey and playback tests**

In `components/visualizer/hooks/useVizHotkeys.test.tsx` add inside the `describe`:

```tsx
  it("Shift+arrows switch variant and never step", () => {
    const step = vi.fn();
    const variant = vi.fn();
    function VariantHarness() {
      useVizHotkeys({ toggle: () => {}, step, variant });
      return null;
    }
    render(<VariantHarness />);
    fireEvent.keyDown(document.body, { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(document.body, { key: "ArrowLeft", shiftKey: true });
    expect(variant.mock.calls).toEqual([[1], [-1]]);
    expect(step).not.toHaveBeenCalled();
  });

  it("ignores Shift+arrows in fields and with Ctrl, Meta or Alt held", () => {
    const variant = vi.fn();
    function VariantHarness() {
      useVizHotkeys({ toggle: () => {}, variant });
      return <input aria-label="Sequence" />;
    }
    const { getByLabelText } = render(<VariantHarness />);
    fireEvent.keyDown(getByLabelText("Sequence"), { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(document.body, { key: "ArrowRight", shiftKey: true, ctrlKey: true });
    fireEvent.keyDown(document.body, { key: "ArrowRight", shiftKey: true, metaKey: true });
    fireEvent.keyDown(document.body, { key: "ArrowRight", shiftKey: true, altKey: true });
    expect(variant).not.toHaveBeenCalled();
  });

  it("does nothing when disabled and skips arrows when no step handler is given", () => {
    const toggle = vi.fn();
    function Disabled({ enabled }: { enabled: boolean }) {
      useVizHotkeys({ toggle, enabled });
      return null;
    }
    const { rerender } = render(<Disabled enabled={false} />);
    fireEvent.keyDown(document.body, { key: " " });
    expect(toggle).not.toHaveBeenCalled();
    rerender(<Disabled enabled />);
    fireEvent.keyDown(document.body, { key: " " });
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(toggle).toHaveBeenCalledOnce();
  });
```

In `components/visualizer/hooks/usePlayback.test.tsx` add (use the file's existing frame fixture helper; if it builds frames inline, build two frames the same way):

```tsx
  it("pause stops playback without moving the frame", () => {
    const { result } = renderHook(() => usePlayback(FRAMES, 2));
    expect(result.current.playing).toBe(true);
    act(() => result.current.pause());
    expect(result.current.playing).toBe(false);
    expect(result.current.frame).toBe(2);
  });
```

(`FRAMES` is whatever frames fixture the file already uses; reuse its name.)

- [ ] **Step 4: Implement hotkeys and `pause`**

Replace `components/visualizer/hooks/useVizHotkeys.ts` with:

```ts
import { useEffect } from "react";

const isEditable = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement &&
  (t.isContentEditable ||
    t.tagName === "INPUT" ||
    t.tagName === "TEXTAREA" ||
    t.tagName === "SELECT");

// A focused control already activates on Space; toggling here too would cancel it out.
const isActivatable = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement && t.closest("button, a, [role='tab']") !== null;

interface VizHotkeys {
  toggle: () => void;
  step?: (delta: number) => void;
  variant?: (delta: number) => void;
  enabled?: boolean;
}

export function useVizHotkeys({ toggle, step, variant, enabled = true }: VizHotkeys): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isEditable(e.target)) return;
      if (e.key === " ") {
        if (isActivatable(e.target)) return;
        e.preventDefault();
        toggle();
        return;
      }
      const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (dir === 0) return;
      if (e.shiftKey) {
        if (!variant) return;
        e.preventDefault();
        variant(dir);
      } else if (step) {
        e.preventDefault();
        step(dir);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle, step, variant, enabled]);
}
```

In `components/visualizer/hooks/usePlayback.ts` add `pause: () => void;` to the `Playback` interface, define inside the hook (after `step`):

```ts
  const pause = useCallback(() => {
    live.current.playing = false;
    setPlaying(false);
  }, []);
```

and add `pause` to the returned object.

- [ ] **Step 5: Write the failing frame tests**

Append to the `describe("VisualizerApp", ...)` block in `components/visualizer/frame/VisualizerApp.test.tsx` (add `within` to the Testing Library import):

```tsx
  it("switching policy keeps the step and does not restart", () => {
    at("?p=lru&q=ABCADEAFBAGC&i=8");
    render(<VisualizerApp slug="eviction-policies" />);
    expect(screen.getByText("request 8 / 12")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "FIFO" }));
    expect(screen.getByRole("heading", { name: "FIFO" })).toBeTruthy();
    expect(screen.getByText("request 8 / 12")).toBeTruthy();
  });

  it("changing an input still restarts the run", () => {
    at("?p=lru&q=ABCADEAFBAGC&i=8");
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("button", { name: "Loop" }));
    expect(screen.getByText(/request 1 \//)).toBeTruthy();
  });

  it("next and previous policy buttons follow the chip order and wrap", () => {
    at("?p=clock&q=ABCADEAFBAGC&i=3");
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("button", { name: "Next policy" }));
    expect(screen.getByRole("heading", { name: "FIFO" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Previous policy" }));
    expect(screen.getByRole("heading", { name: "CLOCK" })).toBeTruthy();
    expect(screen.getByText("request 3 / 12")).toBeTruthy();
  });

  it("Shift+arrows switch policy and plain arrows still step", () => {
    at("?p=lru&q=ABCADEAFBAGC&i=3");
    render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.keyDown(document.body, { key: "ArrowRight", shiftKey: true });
    expect(screen.getByRole("heading", { name: "LFU" })).toBeTruthy();
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(screen.getByText("request 4 / 12")).toBeTruthy();
  });

  it("a paused frame shows the new policy's last line after switching", () => {
    at("?p=lru&q=ABCADEAFBAGC&i=5");
    const { container } = render(<VisualizerApp slug="eviction-policies" />);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    fireEvent.click(screen.getByRole("button", { name: "CLOCK" }));
    const group = within(container.querySelector(".viz-steps") as HTMLElement);
    expect(group.getAllByRole("listitem").some((li) => li.getAttribute("aria-current") === "step")).toBe(true);
  });
```

(If the play/pause button has a different accessible name, use the name `PlaybackBar` renders for it; check with `screen.getByRole("button", { name: /pause|play/i })`.)

- [ ] **Step 6: Implement the nav buttons and switching**

In `components/visualizer/frame/ConfigFields.tsx` import `IconButton` (`import { IconButton } from "../ui/IconButton";`) and change `ChipsInput` to:

```tsx
function ChipsInput({
  field,
  value,
  onChange,
  nav,
}: FieldProps<ChipsField> & { nav?: { onStep: (delta: number) => void } }) {
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
    </div>
  );
}
```

add `nav?: { onStep: (delta: number) => void };` to `ConfigFieldProps`, destructure it in `ConfigField`, and pass `nav={nav}` in the chips case. In `ConfigPanel.tsx` add `variantNav?: { key: string; onStep: (delta: number) => void };`, destructure it, and pass `nav={variantNav && variantNav.key === f.key ? variantNav : undefined}` to each `ConfigField`. In `css/view-visualizer/ui.css` add:

```css
.viz-field__chips-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s2);
}
.viz-variant-nav {
  display: inline-flex;
  gap: var(--s1);
}
```

In `VisualizerApp.tsx` add imports `useEffect, useRef` to the react import and `stepVariant, variantOptions` from `@/lib/visualizer/core/variants`, then inside `VisualizerBody`:

```tsx
  const variantKey = mod.variants?.key;
  const variantIds = useMemo(
    () => (variantKey ? variantOptions(mod.sections, variantKey).map((o) => o.value) : []),
    [mod, variantKey],
  );
  const variant = variantKey ? String(values[variantKey] ?? "") : "";
  const switchVariant = useCallback(
    (id: string) => {
      if (variantKey) setValues((v) => ({ ...v, [variantKey]: id }));
    },
    [variantKey],
  );
  const stepVariantBy = useCallback(
    (delta: number) => switchVariant(stepVariant(variantIds, variant, delta)),
    [switchVariant, variantIds, variant],
  );
  // Re-seek once the new variant's frames have landed so the sub-step matches its path.
  const seenVariant = useRef(variant);
  const { seek } = pb;
  useEffect(() => {
    if (seenVariant.current === variant) return;
    seenVariant.current = variant;
    seek(pb.frame);
  }, [variant, seek, pb.frame]);
```

change `useVizHotkeys({ toggle, step });` to `useVizHotkeys({ toggle, step, variant: variantIds.length > 1 ? stepVariantBy : undefined });`, change `change` to:

```tsx
  const change = useCallback(
    (key: string, value: FieldValue) => {
      if (key === variantKey && typeof value === "string") {
        switchVariant(value);
        return;
      }
      setValues((v) => applyChange(mod.sections, v, key, value));
      restart();
    },
    [mod, variantKey, switchVariant, restart],
  );
```

and pass `variantNav={variantKey && variantIds.length > 1 ? { key: variantKey, onStep: stepVariantBy } : undefined}` to `ConfigPanel`.

### Task 3: Pure layout, loop and order logic plus order storage

**Files:**
- Create: `lib/visualizer/core/layout.ts`, `lib/visualizer/core/layout.test.ts`, `lib/visualizer/core/loop.ts`, `lib/visualizer/core/loop.test.ts`, `lib/visualizer/core/order.ts`, `lib/visualizer/core/order.test.ts`
- Modify: `lib/storage/keys.ts`, `lib/storage/visualizer-prefs.ts`, `lib/storage/visualizer-prefs.test.ts`

**Interfaces:**
- Consumes: `getJSON`, `setJSON` from `lib/storage/local`.
- Produces:
  - `layoutRows(n: number, maxCols: number): number[]`; `maxColsFor(width: number): number`; constants `COLS_4_MIN = 1090`, `COLS_3_MIN = 810`, `COLS_2_MIN = 540`
  - `LOOP = { stepMs: 900, holdMs: 2000, resetMs: 600 }`; `loopState(elapsed: number, maxSteps: number): LoopState` with `LoopState { phase: "play" | "hold" | "reset"; lit: number }`
  - `reconcileOrder(saved: unknown, defaults: string[]): string[]`; `moveItem<T>(items: T[], from: number, to: number): T[]`
  - `getVisualizerOrder(slug: string): string[] | null`; `setVisualizerOrder(slug: string, order: string[]): void`; `clearVisualizerOrder(slug: string): void`

- [ ] **Step 1: Write the failing tests**

Create `lib/visualizer/core/layout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { layoutRows, maxColsFor } from "./layout";

describe("layoutRows", () => {
  it("four columns: rows are even, longer rows first", () => {
    expect(layoutRows(1, 4)).toEqual([1]);
    expect(layoutRows(2, 4)).toEqual([2]);
    expect(layoutRows(4, 4)).toEqual([4]);
    expect(layoutRows(5, 4)).toEqual([3, 2]);
    expect(layoutRows(6, 4)).toEqual([3, 3]);
    expect(layoutRows(7, 4)).toEqual([4, 3]);
    expect(layoutRows(8, 4)).toEqual([4, 4]);
    expect(layoutRows(9, 4)).toEqual([3, 3, 3]);
  });

  it("three columns", () => {
    expect(layoutRows(3, 3)).toEqual([3]);
    expect(layoutRows(4, 3)).toEqual([2, 2]);
    expect(layoutRows(7, 3)).toEqual([3, 2, 2]);
  });

  it("two columns: an odd count ends in a single card", () => {
    expect(layoutRows(3, 2)).toEqual([2, 1]);
    expect(layoutRows(5, 2)).toEqual([2, 2, 1]);
    expect(layoutRows(9, 2)).toEqual([2, 2, 2, 2, 1]);
  });

  it("never throws and never loses a card", () => {
    expect(layoutRows(0, 4)).toEqual([]);
    expect(layoutRows(-3, 4)).toEqual([]);
    expect(layoutRows(3, 0)).toEqual([1, 1, 1]);
    expect(layoutRows(3, -2)).toEqual([1, 1, 1]);
    expect(layoutRows(3, Number.NaN)).toEqual([1, 1, 1]);
    for (let n = 1; n <= 12; n++) {
      for (let c = 1; c <= 4; c++) {
        expect(layoutRows(n, c).reduce((a, b) => a + b, 0)).toBe(n);
        expect(Math.max(...layoutRows(n, c))).toBeLessThanOrEqual(c);
      }
    }
  });
});

describe("maxColsFor", () => {
  it("steps at the group thresholds", () => {
    expect(maxColsFor(0)).toBe(1);
    expect(maxColsFor(539)).toBe(1);
    expect(maxColsFor(540)).toBe(2);
    expect(maxColsFor(809)).toBe(2);
    expect(maxColsFor(810)).toBe(3);
    expect(maxColsFor(1089)).toBe(3);
    expect(maxColsFor(1090)).toBe(4);
    expect(maxColsFor(3000)).toBe(4);
  });
});
```

Create `lib/visualizer/core/loop.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { LOOP, loopState } from "./loop";

describe("loopState", () => {
  const steps = 3;
  const play = steps * LOOP.stepMs;

  it("lights one more step every stepMs", () => {
    expect(loopState(0, steps)).toEqual({ phase: "play", lit: 1 });
    expect(loopState(LOOP.stepMs - 1, steps)).toEqual({ phase: "play", lit: 1 });
    expect(loopState(LOOP.stepMs, steps)).toEqual({ phase: "play", lit: 2 });
    expect(loopState(play - 1, steps)).toEqual({ phase: "play", lit: 3 });
  });

  it("holds the finished state, then resets, then restarts", () => {
    expect(loopState(play, steps)).toEqual({ phase: "hold", lit: 3 });
    expect(loopState(play + LOOP.holdMs - 1, steps)).toEqual({ phase: "hold", lit: 3 });
    expect(loopState(play + LOOP.holdMs, steps)).toEqual({ phase: "reset", lit: 0 });
    const cycle = play + LOOP.holdMs + LOOP.resetMs;
    expect(loopState(cycle, steps)).toEqual({ phase: "play", lit: 1 });
    expect(loopState(cycle * 4 + LOOP.stepMs, steps)).toEqual({ phase: "play", lit: 2 });
  });

  it("treats a bad step count as one step and a negative time as the start", () => {
    expect(loopState(0, 0)).toEqual({ phase: "play", lit: 1 });
    expect(loopState(-5, steps)).toEqual({ phase: "play", lit: 1 });
  });
});
```

Create `lib/visualizer/core/order.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { moveItem, reconcileOrder } from "./order";

const DEFAULTS = ["fifo", "lru", "lfu", "clock"];

describe("reconcileOrder", () => {
  it("keeps a valid saved order", () => {
    expect(reconcileOrder(["clock", "lru", "fifo", "lfu"], DEFAULTS)).toEqual([
      "clock",
      "lru",
      "fifo",
      "lfu",
    ]);
  });

  it("drops unknown and duplicate ids and appends missing ones in default order", () => {
    expect(reconcileOrder(["lru", "gone", "lru", "clock"], DEFAULTS)).toEqual([
      "lru",
      "clock",
      "fifo",
      "lfu",
    ]);
  });

  it("falls back to the defaults for malformed input", () => {
    for (const bad of [null, undefined, "lru", 7, {}, [1, 2], [{}]]) {
      expect(reconcileOrder(bad, DEFAULTS)).toEqual(DEFAULTS);
    }
  });
});

describe("moveItem", () => {
  it("moves an item to a new index", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"]);
  });

  it("clamps the target and returns the same array when nothing moves", () => {
    const items = ["a", "b", "c"];
    expect(moveItem(items, 0, 99)).toEqual(["b", "c", "a"]);
    expect(moveItem(items, 2, -4)).toEqual(["c", "a", "b"]);
    expect(moveItem(items, 1, 1)).toBe(items);
    expect(moveItem(items, 2, 99)).toBe(items);
    expect(moveItem(items, 7, 0)).toBe(items);
  });
});
```

Append to `lib/storage/visualizer-prefs.test.ts` (extend its import to the three new functions):

```ts
describe("visualizer order", () => {
  it("returns null when nothing is saved", () => {
    expect(getVisualizerOrder("eviction-policies")).toBeNull();
  });

  it("round-trips per slug without touching other visualizers", () => {
    setVisualizerOrder("a", ["x", "y"]);
    setVisualizerOrder("b", ["p"]);
    expect(getVisualizerOrder("a")).toEqual(["x", "y"]);
    expect(getVisualizerOrder("b")).toEqual(["p"]);
    clearVisualizerOrder("a");
    expect(getVisualizerOrder("a")).toBeNull();
    expect(getVisualizerOrder("b")).toEqual(["p"]);
  });

  it("ignores malformed stored values", () => {
    localStorage.setItem(KEYS.visualizerOrder, "not json");
    expect(getVisualizerOrder("a")).toBeNull();
    localStorage.setItem(KEYS.visualizerOrder, '{"a":"x","b":[1]}');
    expect(getVisualizerOrder("a")).toBeNull();
    expect(getVisualizerOrder("b")).toBeNull();
  });
});
```

- [ ] **Step 2: Implement**

Create `lib/visualizer/core/layout.ts`:

```ts
export const COLS_4_MIN = 1090;
export const COLS_3_MIN = 810;
export const COLS_2_MIN = 540;

export function maxColsFor(width: number): number {
  if (width >= COLS_4_MIN) return 4;
  if (width >= COLS_3_MIN) return 3;
  if (width >= COLS_2_MIN) return 2;
  return 1;
}

// Fewest rows that fit, then as even as possible with the longer rows first; short rows are centred by the caller.
export function layoutRows(n: number, maxCols: number): number[] {
  const count = Math.floor(n);
  if (!Number.isFinite(count) || count <= 0) return [];
  const cols = Number.isFinite(maxCols) && maxCols >= 1 ? Math.floor(maxCols) : 1;
  const rows = Math.ceil(count / cols);
  const base = Math.floor(count / rows);
  const extra = count % rows;
  return Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0));
}
```

Create `lib/visualizer/core/loop.ts`:

```ts
export const LOOP = { stepMs: 900, holdMs: 2000, resetMs: 600 } as const;

export type LoopPhase = "play" | "hold" | "reset";
export interface LoopState {
  phase: LoopPhase;
  // How many steps are lit: 1..maxSteps while playing, maxSteps while holding, 0 on reset.
  lit: number;
}

export function loopState(elapsed: number, maxSteps: number): LoopState {
  const steps = Number.isFinite(maxSteps) && maxSteps >= 1 ? Math.floor(maxSteps) : 1;
  const playMs = steps * LOOP.stepMs;
  const cycle = playMs + LOOP.holdMs + LOOP.resetMs;
  const t = Number.isFinite(elapsed) && elapsed > 0 ? elapsed % cycle : 0;
  if (t < playMs) return { phase: "play", lit: Math.floor(t / LOOP.stepMs) + 1 };
  if (t < playMs + LOOP.holdMs) return { phase: "hold", lit: steps };
  return { phase: "reset", lit: 0 };
}
```

Create `lib/visualizer/core/order.ts`:

```ts
// A saved order may be stale or malformed: keep known ids once, then append anything new in default order.
export function reconcileOrder(saved: unknown, defaults: string[]): string[] {
  const kept: string[] = [];
  if (Array.isArray(saved)) {
    for (const id of saved) {
      if (typeof id === "string" && defaults.includes(id) && !kept.includes(id)) kept.push(id);
    }
  }
  return [...kept, ...defaults.filter((d) => !kept.includes(d))];
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length) return items;
  const target = Math.min(items.length - 1, Math.max(0, to));
  if (target === from) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved as T);
  return next;
}
```

In `lib/storage/keys.ts` add `visualizerOrder: "wiki-visualizer-order",` next to `visualizerPanels`. Append to `lib/storage/visualizer-prefs.ts`:

```ts
type OrderMap = Record<string, string[]>;

function readOrders(): OrderMap {
  const v = getJSON<unknown>(KEYS.visualizerOrder, null);
  if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
  const out: OrderMap = {};
  for (const [slug, ids] of Object.entries(v)) {
    if (Array.isArray(ids) && ids.every((id) => typeof id === "string")) out[slug] = ids;
  }
  return out;
}

export function getVisualizerOrder(slug: string): string[] | null {
  return readOrders()[slug] ?? null;
}

export function setVisualizerOrder(slug: string, order: string[]): void {
  setJSON(KEYS.visualizerOrder, { ...readOrders(), [slug]: order });
}

export function clearVisualizerOrder(slug: string): void {
  const next = readOrders();
  delete next[slug];
  setJSON(KEYS.visualizerOrder, next);
}
```

### Task 4: Flow diagram model, layout and component

**Files:**
- Create: `lib/visualizer/core/flow.ts`, `lib/visualizer/core/flow.test.ts`, `components/visualizer/shapes/FlowIcon.tsx`, `components/visualizer/shapes/FlowDiagram.tsx`, `components/visualizer/shapes/FlowDiagram.test.tsx`, `css/view-visualizer/revision.css`
- Modify: `css/wiki.css`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - Types `FlowNodeKind = "app" | "cache" | "db"`, `FlowStyle = "solid" | "dashed" | "dotted"`, `FlowNode { id; kind; label }`, `FlowEdge { from; to; step; style; label? }`, `FlowModel { nodes: FlowNode[]; edges: FlowEdge[]; lit: number }`
  - `FLOW_W = 300`, `FLOW_H = 160`, `FLOW_HALF = 22`
  - `flowLayout(nodes, edges): { nodes: PlacedNode[]; edges: PlacedEdge[] }` with `PlacedEdge { step; style; label?; d; bx; by; lx; ly }`
  - `FlowDiagram({ flow, title, pulse })` component

- [ ] **Step 1: Write the failing layout tests**

Create `lib/visualizer/core/flow.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FLOW_HALF, type FlowEdge, type FlowNode, flowLayout } from "./flow";

const NODES: FlowNode[] = [
  { id: "app", kind: "app", label: "App" },
  { id: "cache", kind: "cache", label: "Cache" },
  { id: "db", kind: "db", label: "DB" },
];

const edge = (from: string, to: string, step: number): FlowEdge => ({
  from,
  to,
  step,
  style: "solid",
});

describe("flowLayout", () => {
  it("spreads nodes evenly on one row", () => {
    const { nodes } = flowLayout(NODES, []);
    expect(nodes.map((n) => n.x)).toEqual([50, 150, 250]);
    expect(new Set(nodes.map((n) => n.y)).size).toBe(1);
  });

  it("draws an edge between neighbours as a straight horizontal line", () => {
    const { nodes, edges } = flowLayout(NODES, [edge("app", "cache", 1)]);
    const [e] = edges;
    expect(e?.d.startsWith("M ")).toBe(true);
    expect(e?.d).toContain(" L ");
    expect(e?.by).toBe(nodes[0]?.y);
  });

  it("separates parallel edges between the same pair", () => {
    const { edges } = flowLayout(NODES, [
      edge("app", "cache", 1),
      edge("cache", "app", 2),
      edge("app", "cache", 3),
    ]);
    expect(new Set(edges.map((e) => e.by)).size).toBe(3);
  });

  it("arcs an edge that skips a node above the row, the return arc higher than the outbound", () => {
    const { nodes, edges } = flowLayout(NODES, [edge("app", "db", 1), edge("db", "app", 2)]);
    const rowY = nodes[0]?.y ?? 0;
    const [out, back] = edges;
    expect(out?.d).toContain(" Q ");
    expect(out?.by).toBeLessThan(rowY - FLOW_HALF);
    expect(back?.by).toBeLessThan(out?.by ?? 0);
  });

  it("keeps every edge in input order with its step, style and label", () => {
    const { edges } = flowLayout(NODES, [
      { from: "app", to: "cache", step: 1, style: "dotted", label: "miss" },
    ]);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ step: 1, style: "dotted", label: "miss" });
  });

  it("ignores an edge that names an unknown node and tolerates no nodes", () => {
    expect(flowLayout(NODES, [edge("app", "ghost", 1)]).edges).toEqual([]);
    expect(flowLayout([], [edge("a", "b", 1)])).toEqual({ nodes: [], edges: [] });
  });
});
```

- [ ] **Step 2: Implement the model and layout**

Create `lib/visualizer/core/flow.ts`:

```ts
export type FlowNodeKind = "app" | "cache" | "db";
export type FlowStyle = "solid" | "dashed" | "dotted";

export interface FlowNode {
  id: string;
  kind: FlowNodeKind;
  label: string;
}
export interface FlowEdge {
  from: string;
  to: string;
  step: number;
  style: FlowStyle;
  label?: string;
}
// Edges with step <= lit are drawn lit; the one equal to lit pulses while the loop is playing.
export interface FlowModel {
  nodes: FlowNode[];
  edges: FlowEdge[];
  lit: number;
}

export const FLOW_W = 300;
export const FLOW_H = 160;
export const FLOW_HALF = 22;
const NODE_Y = 82;
const PAIR_GAP = 18;
const ARC = 50;
const RETURN_LIFT = 24;
const STACK_LIFT = 10;

export interface PlacedNode extends FlowNode {
  x: number;
  y: number;
}
export interface PlacedEdge {
  step: number;
  style: FlowStyle;
  label?: string;
  d: string;
  // Badge centre and label anchor.
  bx: number;
  by: number;
  lx: number;
  ly: number;
}

const pairKey = (e: FlowEdge): string => [e.from, e.to].sort().join("|");

export function flowLayout(
  nodes: FlowNode[],
  edges: FlowEdge[],
): { nodes: PlacedNode[]; edges: PlacedEdge[] } {
  const placed = nodes.map((n, i) => ({
    ...n,
    x: (FLOW_W * (i + 0.5)) / nodes.length,
    y: NODE_Y,
  }));
  const groups = new Map<string, FlowEdge[]>();
  for (const e of [...edges].sort((a, b) => a.step - b.step)) {
    groups.set(pairKey(e), [...(groups.get(pairKey(e)) ?? []), e]);
  }
  const out: PlacedEdge[] = [];
  for (const e of edges) {
    const ia = placed.findIndex((n) => n.id === e.from);
    const ib = placed.findIndex((n) => n.id === e.to);
    const a = placed[ia];
    const b = placed[ib];
    if (!a || !b) continue;
    const group = groups.get(pairKey(e)) ?? [e];
    const k = group.indexOf(e);
    const dir = Math.sign(b.x - a.x);
    const base = { step: e.step, style: e.style, label: e.label };
    if (Math.abs(ia - ib) === 1) {
      const y = NODE_Y + (k - (group.length - 1) / 2) * PAIR_GAP;
      const sx = a.x + dir * (FLOW_HALF + 4);
      const ex = b.x - dir * (FLOW_HALF + 6);
      const mx = (sx + ex) / 2;
      out.push({ ...base, d: `M ${sx} ${y} L ${ex} ${y}`, bx: mx, by: y, lx: mx, ly: y - 11 });
    } else {
      const y0 = NODE_Y - (FLOW_HALF + 2);
      const lift = ARC + (dir > 0 ? 0 : RETURN_LIFT) + k * STACK_LIFT;
      const ctrl = y0 - lift;
      const mid = (a.x + b.x) / 2;
      const ym = 0.5 * y0 + 0.5 * ctrl;
      out.push({
        ...base,
        d: `M ${a.x} ${y0} Q ${mid} ${ctrl} ${b.x} ${y0}`,
        bx: mid,
        by: ym,
        lx: mid,
        ly: ym - 11,
      });
    }
  }
  return { nodes: placed, edges: out };
}
```

- [ ] **Step 3: Write the failing component tests**

Create `components/visualizer/shapes/FlowDiagram.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FlowModel } from "@/lib/visualizer/core/flow";
import { FlowDiagram } from "./FlowDiagram";

const flow = (lit: number): FlowModel => ({
  lit,
  nodes: [
    { id: "app", kind: "app", label: "App" },
    { id: "cache", kind: "cache", label: "Cache" },
    { id: "db", kind: "db", label: "DB" },
  ],
  edges: [
    { from: "app", to: "cache", step: 1, style: "solid", label: "get" },
    { from: "cache", to: "app", step: 2, style: "dotted", label: "miss" },
    { from: "cache", to: "db", step: 3, style: "dashed", label: "flush" },
  ],
});

describe("FlowDiagram", () => {
  it("is one labelled image with a node per kind and a numbered badge per edge", () => {
    const { container, getByRole, getByText } = render(
      <FlowDiagram flow={flow(0)} title="Cache-aside read" pulse={false} />,
    );
    expect(getByRole("img", { name: "Cache-aside read" })).toBeTruthy();
    for (const label of ["App", "Cache", "DB"]) expect(getByText(label)).toBeTruthy();
    expect(container.querySelectorAll(".viz-flow__badge")).toHaveLength(3);
    expect(container.querySelectorAll(".viz-flow__node")).toHaveLength(3);
  });

  it("lights edges up to the lit step and pulses only the current one while playing", () => {
    const { container, rerender } = render(
      <FlowDiagram flow={flow(2)} title="t" pulse />,
    );
    const lit = () => [...container.querySelectorAll(".viz-flow__edge")].map((e) => e.classList.contains("is-lit"));
    const cur = () => [...container.querySelectorAll(".viz-flow__edge")].map((e) => e.classList.contains("is-current"));
    expect(lit()).toEqual([true, true, false]);
    expect(cur()).toEqual([false, true, false]);
    rerender(<FlowDiagram flow={flow(2)} title="t" pulse={false} />);
    expect(cur()).toEqual([false, false, false]);
    rerender(<FlowDiagram flow={flow(0)} title="t" pulse />);
    expect(lit()).toEqual([false, false, false]);
  });

  it("uses a distinct class per line style", () => {
    const { container } = render(<FlowDiagram flow={flow(3)} title="t" pulse={false} />);
    expect(container.querySelector(".viz-flow__edge--solid")).toBeTruthy();
    expect(container.querySelector(".viz-flow__edge--dashed")).toBeTruthy();
    expect(container.querySelector(".viz-flow__edge--dotted")).toBeTruthy();
  });

  it("each node kind draws a different icon", () => {
    const { container } = render(<FlowDiagram flow={flow(0)} title="t" pulse={false} />);
    const icons = [...container.querySelectorAll(".viz-flow__node .viz-flow__icon")].map((i) =>
      i.getAttribute("data-kind"),
    );
    expect(icons).toEqual(["app", "cache", "db"]);
  });
});
```

- [ ] **Step 4: Implement the icons, the diagram and the styles**

Create `components/visualizer/shapes/FlowIcon.tsx`:

```tsx
import type { FlowNodeKind } from "@/lib/visualizer/core/flow";

// Drawn around (0, 0), about 44 by 44, so a node can place it with a translate.
export function FlowIcon({ kind }: { kind: FlowNodeKind }) {
  return (
    <g className="viz-flow__icon" data-kind={kind}>
      {kind === "app" && (
        <>
          <rect x={-20} y={-16} width={40} height={32} rx={4} />
          <path d="M -20 -8 H 20" />
          <circle cx={-14} cy={-12} r={1.5} className="viz-flow__dot" />
          <circle cx={-9} cy={-12} r={1.5} className="viz-flow__dot" />
        </>
      )}
      {kind === "cache" && (
        <>
          <rect x={-18} y={-18} width={36} height={36} rx={8} />
          <path d="M 3 -11 L -7 2 H 0 L -3 11 L 7 -2 H 0 Z" className="viz-flow__dot" />
        </>
      )}
      {kind === "db" && (
        <>
          <ellipse cx={0} cy={-12} rx={16} ry={6} />
          <path d="M -16 -12 V 12 A 16 6 0 0 0 16 12 V -12" />
          <path d="M -16 0 A 16 6 0 0 0 16 0" />
        </>
      )}
    </g>
  );
}
```

Create `components/visualizer/shapes/FlowDiagram.tsx`:

```tsx
import { useId, useMemo } from "react";
import { FLOW_H, FLOW_HALF, FLOW_W, type FlowModel, flowLayout } from "@/lib/visualizer/core/flow";
import { FlowIcon } from "./FlowIcon";

interface FlowDiagramProps {
  flow: FlowModel;
  title: string;
  // True while the loop is playing, so the current edge pulses; false when holding or paused.
  pulse: boolean;
}

export function FlowDiagram({ flow, title, pulse }: FlowDiagramProps) {
  const uid = useId().replace(/:/g, "");
  const layout = useMemo(() => flowLayout(flow.nodes, flow.edges), [flow.nodes, flow.edges]);
  return (
    <svg className="viz-flow" viewBox={`0 0 ${FLOW_W} ${FLOW_H}`} role="img" aria-label={title}>
      <defs>
        {(["off", "on"] as const).map((tone) => (
          <marker
            key={tone}
            id={`${uid}-${tone}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className={`viz-flow__head viz-flow__head--${tone}`} />
          </marker>
        ))}
      </defs>
      {layout.edges.map((e) => {
        const lit = e.step <= flow.lit;
        const current = pulse && e.step === flow.lit;
        return (
          <g
            key={`${e.step}-${e.d}`}
            className={`viz-flow__edge viz-flow__edge--${e.style}${lit ? " is-lit" : ""}${current ? " is-current" : ""}`}
          >
            <path d={e.d} markerEnd={`url(#${uid}-${lit ? "on" : "off"})`} />
            {e.label && (
              <text className="viz-flow__label" x={e.lx} y={e.ly} textAnchor="middle">
                {e.label}
              </text>
            )}
            <g className="viz-flow__badge" transform={`translate(${e.bx} ${e.by})`}>
              <circle r={7} />
              <text textAnchor="middle" dy="3.5">
                {e.step}
              </text>
            </g>
          </g>
        );
      })}
      {layout.nodes.map((n) => (
        <g key={n.id} className="viz-flow__node" transform={`translate(${n.x} ${n.y})`}>
          <FlowIcon kind={n.kind} />
          <text className="viz-flow__name" y={FLOW_HALF + 14} textAnchor="middle">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
```

In `css/tokens.css` add next to the other `--viz-*` size tokens:

```css
  --viz-card-min-w: 250px;
  --viz-card-stage-h: 200px;
```

Create `css/view-visualizer/revision.css` (the file grows in later tasks):

```css
/* ═══════════════════════════════════════════════
   VISUALIZER — FLOW DIAGRAM
   ═══════════════════════════════════════════════ */
.viz-flow {
  display: block;
  width: 100%;
  height: 100%;
}
.viz-flow__icon rect,
.viz-flow__icon ellipse,
.viz-flow__icon path {
  fill: var(--surface-2);
  stroke: var(--text-muted);
  stroke-width: 2;
  stroke-linejoin: round;
}
.viz-flow__icon .viz-flow__dot {
  fill: var(--text-muted);
  stroke: none;
}
.viz-flow__name {
  fill: var(--text-heading);
  font-size: 11px;
  font-weight: var(--fw-extrabold);
}
.viz-flow__edge path {
  fill: none;
  stroke: var(--border-2);
  stroke-width: 2;
  stroke-linecap: round;
}
.viz-flow__edge--dashed path {
  stroke-dasharray: 7 5;
}
.viz-flow__edge--dotted path {
  stroke-dasharray: 1 6;
  stroke-width: 2.5;
}
.viz-flow__edge.is-lit path {
  stroke: var(--text-body);
}
.viz-flow__edge.is-current path {
  stroke: var(--accent);
}
.viz-flow__head--off {
  fill: var(--border-2);
}
.viz-flow__head--on {
  fill: var(--text-body);
}
.viz-flow__label {
  fill: var(--text-muted);
  font-size: 9px;
}
.viz-flow__edge.is-lit .viz-flow__label {
  fill: var(--text-body);
}
.viz-flow__badge circle {
  fill: var(--surface);
  stroke: var(--border-2);
  stroke-width: 1.5;
}
.viz-flow__badge text {
  fill: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: var(--fw-extrabold);
}
.viz-flow__edge.is-lit .viz-flow__badge circle {
  fill: var(--accent);
  stroke: var(--accent);
}
.viz-flow__edge.is-lit .viz-flow__badge text {
  fill: var(--viz-on-accent);
}
.viz-flow__edge.is-current path,
.viz-flow__edge.is-current .viz-flow__badge {
  animation: viz-flow-pulse 0.9s ease-in-out infinite alternate;
}
@keyframes viz-flow-pulse {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .viz-flow__edge.is-current path,
  .viz-flow__edge.is-current .viz-flow__badge {
    animation: none;
  }
}
```

Before relying on `--surface`, `--surface-2`, `--border-2`, `--accent`, `--text-body`, `--text-muted`, `--text-heading`, `--font-mono`, `--fw-extrabold` and `--viz-on-accent`, confirm each exists with `grep -n -e "--surface:" -e "--surface-2:" -e "--border-2:" -e "--accent:" -e "--viz-on-accent:" css/tokens.css`; use the nearest existing token if one is missing. In `css/wiki.css` add after the `layout.css` import:

```css
@import "./view-visualizer/revision.css";
```

### Task 5: Revision contract and eviction cards

**Files:**
- Create: `lib/visualizer/eviction/revision.ts`, `lib/visualizer/eviction/revision.test.ts`
- Modify: `lib/visualizer/core/types.ts`, `lib/visualizer/eviction/module.ts`

**Interfaces:**
- Consumes: `FlowModel` (task 4), `ShapeModel`, `richText`, `PolicyEntry`-style entries from `eviction/module.ts`.
- Produces:
  - `RevisionVisual = { kind: "shape"; model: ShapeModel } | { kind: "flow"; flow: FlowModel }`
  - `RevisionCard { id: string; name: string; steps: number; render: (lit: number) => RevisionVisual; stepsText: string[]; summary: string; glossaryTerm?: string; differs: string }`
  - `RevisionSpec = RevisionCard[]` and `VisualizerModule.revision?: RevisionSpec`
  - `evictionRevision(): RevisionCard[]` and constants `MINI_TRACE`, `MINI_CAPACITY`

- [ ] **Step 1: Write the failing tests**

Create `lib/visualizer/eviction/revision.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { evictionModule } from "./module";
import { evictionRevision, MINI_CAPACITY, MINI_TRACE } from "./revision";
import { POLICY_IDS } from "./types";

describe("evictionRevision", () => {
  const cards = evictionRevision();

  it("has one card per policy, in the module's default order", () => {
    expect(cards.map((c) => c.id)).toEqual([...POLICY_IDS]);
    expect(cards.map((c) => c.name)).toEqual(["FIFO", "LRU", "LFU", "CLOCK"]);
    expect(evictionModule.revision?.map((c) => c.id)).toEqual([...POLICY_IDS]);
  });

  it("plays the fixed mini-trace: five steps of shape models", () => {
    expect(MINI_TRACE.join("")).toBe("ABCAD");
    expect(MINI_CAPACITY).toBe(3);
    for (const card of cards) {
      expect(card.steps).toBe(5);
      expect(card.stepsText).toHaveLength(5);
      for (let lit = 0; lit <= card.steps; lit++) {
        expect(card.render(lit).kind).toBe("shape");
      }
    }
  });

  it("the policies visibly evict different keys on the last request", () => {
    const removed = Object.fromEntries(
      cards.map((c) => [c.id, c.stepsText[4]]),
    );
    expect(removed.fifo).toContain("A");
    expect(removed.lru).toContain("B");
    expect(removed.lfu).toContain("B");
    expect(removed.clock).toContain("A");
    expect(removed.fifo).not.toEqual(removed.lru);
  });

  it("render clamps lit to the card's own range", () => {
    const card = cards[0];
    expect(card?.render(-3)).toEqual(card?.render(0));
    expect(card?.render(99)).toEqual(card?.render(5));
  });

  it("every card carries popup copy; only LRU has a glossary term", () => {
    for (const card of cards) {
      expect(card.summary.length).toBeGreaterThan(20);
      expect(card.differs.length).toBeGreaterThan(20);
    }
    expect(cards.filter((c) => c.glossaryTerm).map((c) => c.id)).toEqual(["lru"]);
    expect(cards.find((c) => c.id === "lru")?.glossaryTerm).toBe("lru");
  });
});
```

- [ ] **Step 2: Add the contract types**

In `lib/visualizer/core/types.ts` add `import type { FlowModel } from "./flow";` at the top and, above `VisualizerModule`:

```ts
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
```

and add `revision?: RevisionSpec;` to `VisualizerModule` after `variants`.

- [ ] **Step 3: Implement the eviction cards**

In `lib/visualizer/eviction/module.ts` change `interface PolicyEntry` to `export interface PolicyEntry`, add `import { evictionRevision } from "./revision";`, and add `revision: evictionRevision(),` to `evictionModule` after `variants`. Create `lib/visualizer/eviction/revision.ts`:

```ts
import { richText } from "../core/rich";
import type { RevisionCard } from "../core/types";
import { POLICIES } from "./module";
import { POLICY_IDS, type PolicyId } from "./types";

export const MINI_TRACE = "ABCAD".split("");
export const MINI_CAPACITY = 3;

const COPY: Record<PolicyId, { summary: string; glossaryTerm?: string; differs: string }> = {
  fifo: {
    summary:
      "First in, first out: the key that arrived earliest is evicted, whether or not it is still being used.",
    differs:
      "Ignores use entirely. A hit changes nothing, so a hot key can be evicted just for being old.",
  },
  lru: {
    summary: "Least recently used: the key untouched for the longest time is evicted.",
    glossaryTerm: "lru",
    differs:
      "Unlike FIFO, a hit renews a key. Unlike LFU, it remembers only when a key was used, not how often.",
  },
  lfu: {
    summary:
      "Least frequently used: the key with the fewest hits is evicted; ties go to the one used longest ago.",
    differs:
      "Remembers how often, not when, so popular keys survive a scan, but a new key starts at the bottom and can be evicted before it proves itself.",
  },
  clock: {
    summary:
      "CLOCK (second chance): a hand sweeps a ring of slots; a slot used since the last pass is spared once, and the first unused one is evicted.",
    differs:
      "An LRU approximation that moves nothing on a hit; it only sets one bit, so hits are cheap.",
  },
};

// POLICIES is a module-level record, so this is safe to call while the module object is being built.
export function evictionRevision(): RevisionCard[] {
  return POLICY_IDS.map((id) => {
    const entry = POLICIES[id];
    const frames = entry.run(MINI_CAPACITY, MINI_TRACE);
    return {
      id,
      name: entry.meta.name,
      steps: frames.length,
      render: (lit) => {
        const at = Math.max(0, Math.min(lit, frames.length) - 1);
        const model = frames[at]?.model;
        if (!model) throw new Error(`no frame for ${id}`);
        return { kind: "shape", model };
      },
      stepsText: frames.map((f) => `Request ${f.label}: ${f.badge.toLowerCase()}. ${richText(f.caption)}`),
      ...COPY[id],
    };
  });
}
```

The module imports `revision.ts` and `revision.ts` imports `POLICIES` from the module, which is a cycle. Break it: in `revision.ts` take the policies as a parameter instead. Replace the import line `import { POLICIES } from "./module";` with `import type { PolicyEntry } from "./module";` and change the signature to:

```ts
export function evictionRevision(policies: Record<PolicyId, PolicyEntry>): RevisionCard[] {
  return POLICY_IDS.map((id) => {
    const entry = policies[id];
```

and in the test use `evictionRevision(POLICIES)` with `POLICIES` imported from `./module`. In `module.ts` call `revision: evictionRevision(POLICIES),`.

### Task 6: Caching revision cards

**Files:**
- Create: `lib/visualizer/caching/revision.ts`, `lib/visualizer/caching/revision.test.ts`
- Modify: `lib/visualizer/caching/module.ts`

**Interfaces:**
- Consumes: `FlowEdge`, `FlowNode`, `RevisionCard` (tasks 4 and 5), `STRATEGY_IDS`, `StrategyId`, `STRATEGY_META`.
- Produces: `cachingRevision(): RevisionCard[]`; `cachingModule.revision`.

- [ ] **Step 1: Write the failing tests**

Create `lib/visualizer/caching/revision.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cachingModule } from "./module";
import { cachingRevision } from "./revision";
import { STRATEGY_IDS } from "./types";

describe("cachingRevision", () => {
  const cards = cachingRevision();

  it("has one flow card per strategy, in the module's option order", () => {
    expect(cards.map((c) => c.id)).toEqual([...STRATEGY_IDS]);
    expect(cachingModule.revision?.map((c) => c.id)).toEqual([...STRATEGY_IDS]);
    for (const card of cards) expect(card.render(0).kind).toBe("flow");
  });

  it("steps are numbered 1..n with no gaps and match the screen-reader list", () => {
    for (const card of cards) {
      const visual = card.render(card.steps);
      if (visual.kind !== "flow") throw new Error("expected a flow");
      expect(visual.flow.edges.map((e) => e.step)).toEqual(
        visual.flow.edges.map((_, i) => i + 1),
      );
      expect(card.steps).toBe(visual.flow.edges.length);
      expect(card.stepsText).toHaveLength(card.steps);
      expect(visual.flow.lit).toBe(card.steps);
    }
  });

  it("every edge names a real node", () => {
    for (const card of cards) {
      const visual = card.render(1);
      if (visual.kind !== "flow") throw new Error("expected a flow");
      const ids = visual.flow.nodes.map((n) => n.id);
      for (const e of visual.flow.edges) {
        expect(ids).toContain(e.from);
        expect(ids).toContain(e.to);
      }
    }
  });

  it("render clamps lit to the card's own range", () => {
    const card = cards[0];
    const flow = (lit: number) => {
      const v = card?.render(lit);
      return v?.kind === "flow" ? v.flow.lit : -1;
    };
    expect(flow(-2)).toBe(0);
    expect(flow(99)).toBe(card?.steps);
  });

  it("the defining line style appears where the strategy depends on it", () => {
    const styles = (id: string) => {
      const v = cards.find((c) => c.id === id)?.render(99);
      return v?.kind === "flow" ? v.flow.edges.map((e) => e.style) : [];
    };
    expect(styles("write-behind")).toContain("dashed");
    expect(styles("refresh-ahead")).toContain("dashed");
    expect(styles("read-through")).toContain("dotted");
    expect(styles("write-through")).not.toContain("dashed");
  });

  it("every card carries popup copy", () => {
    for (const card of cards) {
      expect(card.summary.length).toBeGreaterThan(20);
      expect(card.differs.length).toBeGreaterThan(20);
    }
  });
});
```

- [ ] **Step 2: Implement the six flows**

Create `lib/visualizer/caching/revision.ts`. These flows are drafts for the user to review against the caching article before they ship.

```ts
import type { FlowEdge, FlowNode, FlowStyle } from "../core/flow";
import type { RevisionCard } from "../core/types";
import { STRATEGY_META } from "./copy";
import { STRATEGY_IDS, type StrategyId } from "./types";

const NODES: FlowNode[] = [
  { id: "app", kind: "app", label: "App" },
  { id: "cache", kind: "cache", label: "Cache" },
  { id: "db", kind: "db", label: "DB" },
];
const NAME: Record<string, string> = { app: "App", cache: "Cache", db: "DB" };

type Hop = [from: string, to: string, style: FlowStyle, label: string];

interface FlowDef {
  scenario: string;
  hops: Hop[];
  summary: string;
  differs: string;
}

const FLOWS: Record<StrategyId, FlowDef> = {
  "cache-aside": {
    scenario: "A read that misses",
    hops: [
      ["app", "cache", "solid", "get"],
      ["cache", "app", "dotted", "miss"],
      ["app", "db", "solid", "read"],
      ["db", "app", "solid", "value"],
      ["app", "cache", "solid", "set"],
    ],
    summary:
      "The app checks the cache first; on a miss it reads the database itself and then fills the cache.",
    differs:
      "The app owns the caching code and the cache never talks to the database. Simple, but a read racing a write can cache an old value.",
  },
  "read-through": {
    scenario: "A read that misses",
    hops: [
      ["app", "cache", "solid", "get"],
      ["cache", "db", "dotted", "miss: load"],
      ["db", "cache", "solid", "value"],
      ["cache", "app", "solid", "value"],
    ],
    summary: "The app only ever talks to the cache; on a miss the cache loads from the database itself.",
    differs:
      "The same read path as cache-aside, but the cache owns the load, so the app code is simpler and misses are loaded in one place.",
  },
  "write-through": {
    scenario: "A write",
    hops: [
      ["app", "cache", "solid", "write"],
      ["cache", "db", "solid", "write"],
      ["db", "cache", "solid", "ack"],
      ["cache", "app", "solid", "ack"],
    ],
    summary: "Every write goes through the cache to the database before it is acknowledged.",
    differs:
      "Writes are slower than cache-aside's, but the cache is never stale after a write and nothing is lost if the cache crashes.",
  },
  "write-behind": {
    scenario: "A write",
    hops: [
      ["app", "cache", "solid", "write"],
      ["cache", "app", "solid", "ack"],
      ["cache", "db", "dashed", "flush later"],
    ],
    summary: "A write is acknowledged once it reaches the cache; the database is updated later in a batch.",
    differs:
      "The fastest writes, but anything still buffered in the cache is lost if it crashes before the flush.",
  },
  "write-around": {
    scenario: "A write, then a later read",
    hops: [
      ["app", "db", "solid", "write"],
      ["db", "app", "solid", "ack"],
      ["app", "cache", "dotted", "later read: miss"],
      ["app", "db", "solid", "read"],
    ],
    summary: "Writes go straight to the database and skip the cache; the cache only fills on reads.",
    differs:
      "Keeps rarely re-read data out of the cache, but the first read after a write is always a miss.",
  },
  "refresh-ahead": {
    scenario: "A hit on an entry near expiry",
    hops: [
      ["app", "cache", "solid", "get"],
      ["cache", "app", "solid", "value"],
      ["cache", "db", "dashed", "refresh"],
      ["db", "cache", "dashed", "fresh value"],
    ],
    summary: "The cache reloads a hot entry in the background before it expires.",
    differs:
      "Readers rarely see a miss on hot keys, at the cost of extra database reads for entries that may not be read again.",
  },
};

const edgesOf = (hops: Hop[]): FlowEdge[] =>
  hops.map(([from, to, style, label], i) => ({ from, to, style, label, step: i + 1 }));

export function cachingRevision(): RevisionCard[] {
  return STRATEGY_IDS.map((id) => {
    const def = FLOWS[id];
    const edges = edgesOf(def.hops);
    const name = STRATEGY_META[id].name;
    return {
      id,
      name,
      steps: edges.length,
      render: (lit) => ({
        kind: "flow",
        flow: { nodes: NODES, edges, lit: Math.max(0, Math.min(lit, edges.length)) },
      }),
      stepsText: [
        `${def.scenario}.`,
        ...edges.map(
          (e) => `${e.step}. ${NAME[e.from]} to ${NAME[e.to]}: ${e.label}${e.style === "solid" ? "" : ` (${e.style === "dashed" ? "asynchronous" : "conditional"})`}`,
        ),
      ].slice(1),
      summary: def.summary,
      differs: def.differs,
    };
  });
}
```

Remove the `[ ... ].slice(1)` trick: `stepsText` must have exactly one entry per step, so use `stepsText: edges.map((e) => ...)` and keep `def.scenario` for the card's accessible title in the next task. Replace the `stepsText` expression with:

```ts
      stepsText: edges.map(
        (e) =>
          `${e.step}. ${NAME[e.from]} to ${NAME[e.to]}: ${e.label}${e.style === "solid" ? "" : e.style === "dashed" ? " (asynchronous)" : " (conditional)"}`,
      ),
```

Add `revision: cachingRevision(),` to `cachingModule` in `lib/visualizer/caching/module.ts` after `variants`, with `import { cachingRevision } from "./revision";`.

### Task 7: Revision loop clock, grid, cards and reordering

**Files:**
- Create: `components/visualizer/hooks/useLoopClock.ts`, `components/visualizer/hooks/useLoopClock.test.tsx`, `components/visualizer/frame/RevisionGrid.tsx`, `components/visualizer/frame/RevisionGrid.test.tsx`
- Modify: `css/view-visualizer/revision.css`

**Interfaces:**
- Consumes: `loopState`, `LoopPhase`, `LoopState`, `layoutRows`, `maxColsFor`, `moveItem`, `RevisionCard`, `Shape`, `FlowDiagram`, `useElementSize`, `prefersReducedMotion`, `TICK_MS` (from `core/playback`).
- Produces:
  - `useLoopClock(maxSteps: number): { lit: number; phase: LoopPhase; running: boolean; reduced: boolean; toggle: () => void }`
  - `RevisionGrid({ cards, order, onOrder, lit, pulse, subject, onInfo })` where `cards: RevisionCard[]`, `order: string[]`, `onOrder(next: string[])`, `lit: number`, `pulse: boolean`, `subject: string`, `onInfo(id: string)`

- [ ] **Step 1: Write the failing clock tests**

Create `components/visualizer/hooks/useLoopClock.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOOP } from "@/lib/visualizer/core/loop";
import { useLoopClock } from "./useLoopClock";

const reduced = (on: boolean) =>
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches: on, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );

beforeEach(() => {
  vi.useFakeTimers();
  reduced(false);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useLoopClock", () => {
  it("starts running at the first step and advances every step interval", () => {
    const { result } = renderHook(() => useLoopClock(3));
    expect(result.current).toMatchObject({ lit: 1, phase: "play", running: true });
    act(() => vi.advanceTimersByTime(LOOP.stepMs));
    expect(result.current.lit).toBe(2);
  });

  it("holds the finished state, resets, then loops again", () => {
    const { result } = renderHook(() => useLoopClock(2));
    act(() => vi.advanceTimersByTime(2 * LOOP.stepMs));
    expect(result.current).toMatchObject({ phase: "hold", lit: 2 });
    act(() => vi.advanceTimersByTime(LOOP.holdMs));
    expect(result.current).toMatchObject({ phase: "reset", lit: 0 });
    act(() => vi.advanceTimersByTime(LOOP.resetMs));
    expect(result.current).toMatchObject({ phase: "play", lit: 1 });
  });

  it("toggle pauses in place and resumes from the same spot", () => {
    const { result } = renderHook(() => useLoopClock(3));
    act(() => vi.advanceTimersByTime(LOOP.stepMs));
    expect(result.current.lit).toBe(2);
    act(() => result.current.toggle());
    expect(result.current.running).toBe(false);
    act(() => vi.advanceTimersByTime(10 * LOOP.stepMs));
    expect(result.current.lit).toBe(2);
    act(() => result.current.toggle());
    act(() => vi.advanceTimersByTime(LOOP.stepMs));
    expect(result.current.lit).toBe(3);
  });

  it("under reduced motion shows the finished state, never runs and says so", () => {
    reduced(true);
    const { result } = renderHook(() => useLoopClock(4));
    expect(result.current).toMatchObject({ lit: 4, phase: "hold", running: false, reduced: true });
    act(() => vi.advanceTimersByTime(10 * LOOP.stepMs));
    expect(result.current.lit).toBe(4);
  });
});
```

- [ ] **Step 2: Implement the clock**

Create `components/visualizer/hooks/useLoopClock.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/visualizer/core/motion";
import { TICK_MS } from "@/lib/visualizer/core/playback";
import { type LoopPhase, type LoopState, loopState } from "@/lib/visualizer/core/loop";

export interface LoopClock {
  lit: number;
  phase: LoopPhase;
  running: boolean;
  reduced: boolean;
  toggle: () => void;
}

export function useLoopClock(maxSteps: number): LoopClock {
  const reduced = prefersReducedMotion();
  const [running, setRunning] = useState(!reduced);
  const [state, setState] = useState<LoopState>(() => loopState(0, maxSteps));
  const elapsed = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    if (!running || reduced) return;
    last.current = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      elapsed.current += now - last.current;
      last.current = now;
      const next = loopState(elapsed.current, maxSteps);
      setState((s) => (s.phase === next.phase && s.lit === next.lit ? s : next));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, reduced, maxSteps]);

  const toggle = useCallback(() => setRunning((r) => !r), []);
  if (reduced) return { lit: maxSteps, phase: "hold", running: false, reduced: true, toggle };
  return { lit: state.lit, phase: state.phase, running, reduced: false, toggle };
}
```

- [ ] **Step 3: Write the failing grid tests**

Create `components/visualizer/frame/RevisionGrid.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cachingRevision } from "@/lib/visualizer/caching/revision";
import { POLICIES } from "@/lib/visualizer/eviction/module";
import { evictionRevision } from "@/lib/visualizer/eviction/revision";
import { RevisionGrid } from "./RevisionGrid";

const cards = evictionRevision(POLICIES);
const ORDER = cards.map((c) => c.id);

const setWidth = (w: number) =>
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: w });

beforeEach(() => setWidth(1200));
afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
});

const names = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

function setup(order = ORDER, onOrder = vi.fn(), onInfo = vi.fn(), source = cards) {
  render(
    <RevisionGrid
      cards={source}
      order={order}
      onOrder={onOrder}
      lit={3}
      pulse={false}
      subject="Cache"
      onInfo={onInfo}
    />,
  );
  return { onOrder, onInfo };
}

describe("RevisionGrid", () => {
  it("renders every card in the given order, showing only its name and animation", () => {
    setup(["clock", "fifo", "lru", "lfu"]);
    expect(names()).toEqual(["CLOCK", "FIFO", "LRU", "LFU"]);
  });

  it("splits cards into rows by the measured width", () => {
    setup();
    expect(document.querySelectorAll(".viz-rev__row")).toHaveLength(1);
  });

  it("at a medium width four cards become two rows of two", () => {
    setWidth(900);
    setup();
    const rows = [...document.querySelectorAll(".viz-rev__row")];
    expect(rows.map((r) => r.querySelectorAll(".viz-card").length)).toEqual([2, 2]);
  });

  it("an odd count at two columns ends in one card on its own row", () => {
    setWidth(600);
    setup(["fifo", "lru", "lfu"].concat([]), vi.fn(), vi.fn(), cards.slice(0, 3));
    const rows = [...document.querySelectorAll(".viz-rev__row")];
    expect(rows.map((r) => r.querySelectorAll(".viz-card").length)).toEqual([2, 1]);
  });

  it("a width of zero still shows every card", () => {
    setWidth(0);
    setup();
    expect(names()).toHaveLength(4);
  });

  it("the card itself is not clickable; its info button reports the id", () => {
    const { onInfo } = setup();
    fireEvent.click(screen.getByRole("heading", { name: "LRU" }));
    expect(onInfo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "About LRU" }));
    expect(onInfo).toHaveBeenCalledWith("lru");
  });

  it("reorders with the keyboard: Space picks up, arrows move, Space drops", () => {
    const { onOrder } = setup();
    const grip = screen.getByRole("button", { name: "Reorder FIFO" });
    fireEvent.keyDown(grip, { key: " " });
    fireEvent.keyDown(grip, { key: "ArrowRight" });
    expect(onOrder).toHaveBeenLastCalledWith(["lru", "fifo", "lfu", "clock"]);
  });

  it("arrow keys do nothing until a card is picked up", () => {
    const { onOrder } = setup();
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder FIFO" }), { key: "ArrowRight" });
    expect(onOrder).not.toHaveBeenCalled();
  });

  it("Escape cancels a pickup and restores the order it started from", () => {
    const { onOrder } = setup();
    const grip = screen.getByRole("button", { name: "Reorder FIFO" });
    fireEvent.keyDown(grip, { key: " " });
    fireEvent.keyDown(grip, { key: "ArrowRight" });
    fireEvent.keyDown(grip, { key: "Escape" });
    expect(onOrder).toHaveBeenLastCalledWith(ORDER);
  });

  it("the first card cannot move left and the last cannot move right", () => {
    const { onOrder } = setup();
    const first = screen.getByRole("button", { name: "Reorder FIFO" });
    fireEvent.keyDown(first, { key: " " });
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(onOrder).not.toHaveBeenCalled();
  });

  it("drags a card onto another to reorder", () => {
    const { onOrder } = setup();
    const lru = screen.getByRole("heading", { name: "LRU" }).closest(".viz-card") as HTMLElement;
    const clock = screen.getByRole("heading", { name: "CLOCK" }).closest(".viz-card") as HTMLElement;
    const grip = within(lru).getByRole("button", { name: "Reorder LRU" });
    const dataTransfer = { setData: vi.fn(), effectAllowed: "" };
    fireEvent.mouseDown(grip);
    fireEvent.dragStart(lru, { dataTransfer });
    fireEvent.dragOver(clock, { dataTransfer });
    fireEvent.drop(clock, { dataTransfer });
    expect(onOrder).toHaveBeenCalledWith(["fifo", "lfu", "clock", "lru"]);
  });

  it("a drag that did not start on the grip is cancelled", () => {
    const { onOrder } = setup();
    const lru = screen.getByRole("heading", { name: "LRU" }).closest(".viz-card") as HTMLElement;
    const clock = screen.getByRole("heading", { name: "CLOCK" }).closest(".viz-card") as HTMLElement;
    const dataTransfer = { setData: vi.fn(), effectAllowed: "" };
    fireEvent.dragStart(lru, { dataTransfer });
    fireEvent.drop(clock, { dataTransfer });
    expect(onOrder).not.toHaveBeenCalled();
  });

  it("flow cards render a labelled diagram and a screen-reader step list", () => {
    setup(
      cachingRevision().map((c) => c.id),
      vi.fn(),
      vi.fn(),
      cachingRevision(),
    );
    expect(screen.getByRole("img", { name: /Cache-aside/ })).toBeTruthy();
    expect(screen.getAllByRole("list").length).toBeGreaterThan(0);
  });

  it("ids in the order that no card has are skipped", () => {
    setup(["gone", ...ORDER]);
    expect(names()).toEqual(["FIFO", "LRU", "LFU", "CLOCK"]);
  });
});
```

- [ ] **Step 4: Implement the grid**

Create `components/visualizer/frame/RevisionGrid.tsx`:

```tsx
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { layoutRows, maxColsFor } from "@/lib/visualizer/core/layout";
import { moveItem } from "@/lib/visualizer/core/order";
import type { RevisionCard } from "@/lib/visualizer/core/types";
import { useElementSize } from "../hooks/useElementSize";
import { FlowDiagram } from "../shapes/FlowDiagram";
import { Shape } from "../shapes/Shape";

interface RevisionGridProps {
  cards: RevisionCard[];
  order: string[];
  onOrder: (next: string[]) => void;
  lit: number;
  pulse: boolean;
  subject: string;
  onInfo: (id: string) => void;
}

function useInnerWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

interface TileProps {
  card: RevisionCard;
  lit: number;
  pulse: boolean;
  subject: string;
  state: { grabbed: boolean; dragging: boolean; over: boolean };
  handlers: {
    onInfo: () => void;
    onGripDown: () => void;
    onGripKey: (e: KeyboardEvent) => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
}

function RevisionTile({ card, lit, pulse, subject, state, handlers }: TileProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(stageRef);
  const own = Math.max(0, Math.min(lit, card.steps));
  const visual = card.render(own);
  const cls = ["viz-card", state.grabbed && "is-grabbed", state.dragging && "is-dragging", state.over && "is-over"]
    .filter(Boolean)
    .join(" ");
  return (
    <section
      className={cls}
      aria-label={card.name}
      draggable
      onDragStart={handlers.onDragStart}
      onDragOver={handlers.onDragOver}
      onDrop={handlers.onDrop}
      onDragEnd={handlers.onDragEnd}
    >
      <header className="viz-card__head">
        <button
          type="button"
          className="viz-card__grip"
          aria-label={`Reorder ${card.name}`}
          aria-pressed={state.grabbed}
          onMouseDown={handlers.onGripDown}
          onKeyDown={handlers.onGripKey}
        >
          <span aria-hidden="true">⠿</span>
        </button>
        <h3 className="viz-card__name">{card.name}</h3>
        <button
          type="button"
          className="viz-card__info"
          aria-label={`About ${card.name}`}
          onClick={handlers.onInfo}
        >
          <span aria-hidden="true">i</span>
        </button>
      </header>
      <div className="viz-stage viz-card__stage" ref={stageRef}>
        {visual.kind === "flow" ? (
          <FlowDiagram flow={visual.flow} title={card.name} pulse={pulse} />
        ) : (
          size.w > 0 &&
          size.h > 0 && <Shape model={visual.model} rotated={false} size={size} subject={subject} />
        )}
      </div>
      <ol className="viz-rev__sr">
        {card.stepsText.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
    </section>
  );
}

export function RevisionGrid({ cards, order, onOrder, lit, pulse, subject, onInfo }: RevisionGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useInnerWidth(ref);
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const ordered = useMemo(
    () => order.flatMap((id) => byId.get(id) ?? []),
    [order, byId],
  );
  const ids = ordered.map((c) => c.id);
  const rows = layoutRows(ordered.length, maxColsFor(width));
  const cols = Math.max(1, ...rows);

  const [grabbed, setGrabbed] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const startOrder = useRef<string[] | null>(null);
  const gripDown = useRef(false);

  const onGripKey = (id: string, name: string) => (e: KeyboardEvent) => {
    const at = ids.indexOf(id);
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (grabbed === id) {
        setGrabbed(null);
        startOrder.current = null;
        setSaid(`${name} dropped at position ${at + 1} of ${ids.length}.`);
      } else {
        setGrabbed(id);
        startOrder.current = ids;
        setSaid(`${name} picked up at position ${at + 1} of ${ids.length}. Use the arrow keys to move it.`);
      }
    } else if (grabbed === id && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      const to = at + (e.key === "ArrowRight" ? 1 : -1);
      const next = moveItem(ids, at, to);
      if (next === ids) return;
      onOrder(next);
      setSaid(`${name} moved to position ${next.indexOf(id) + 1} of ${ids.length}.`);
    } else if (grabbed === id && e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (startOrder.current) onOrder(startOrder.current);
      setGrabbed(null);
      startOrder.current = null;
      setSaid(`Move cancelled. ${name} is back at its original position.`);
    }
  };

  const clearDrag = () => {
    setDragging(null);
    setOver(null);
    gripDown.current = false;
  };

  let start = 0;
  const lines = rows.map((n) => {
    const line = ordered.slice(start, start + n);
    start += n;
    return line;
  });

  return (
    <div className="viz-rev__scroll" ref={ref}>
      <div className="viz-rev__inner" style={{ ["--viz-cols" as string]: cols }}>
        {lines.map((line) => (
          <div className="viz-rev__row" key={line.map((c) => c.id).join("|")}>
            {line.map((card) => (
              <RevisionTile
                key={card.id}
                card={card}
                lit={lit}
                pulse={pulse}
                subject={subject}
                state={{ grabbed: grabbed === card.id, dragging: dragging === card.id, over: over === card.id }}
                handlers={{
                  onInfo: () => onInfo(card.id),
                  onGripDown: () => {
                    gripDown.current = true;
                  },
                  onGripKey: onGripKey(card.id, card.name),
                  onDragStart: (e) => {
                    if (!gripDown.current) {
                      e.preventDefault();
                      return;
                    }
                    e.dataTransfer.setData("text/plain", card.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragging(card.id);
                  },
                  onDragOver: (e) => {
                    if (dragging === null) return;
                    e.preventDefault();
                    setOver(card.id);
                  },
                  onDrop: (e) => {
                    if (dragging === null) return;
                    e.preventDefault();
                    const next = moveItem(ids, ids.indexOf(dragging), ids.indexOf(card.id));
                    if (next !== ids) onOrder(next);
                    clearDrag();
                  },
                  onDragEnd: clearDrag,
                }}
              />
            ))}
          </div>
        ))}
        <p className="viz-rev__sr" aria-live="polite">
          {said}
        </p>
      </div>
    </div>
  );
}
```

Add to `css/view-visualizer/revision.css`:

```css
/* ═══════════════════════════════════════════════
   VISUALIZER — REVISION GRID
   ═══════════════════════════════════════════════ */
.viz-rev {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}
.viz-rev__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.viz-rev__inner {
  display: flex;
  flex-direction: column;
  gap: var(--s3);
  padding: var(--s3);
}
.viz-rev__row {
  display: flex;
  justify-content: center;
  gap: var(--s3);
}
.viz-card {
  flex: 0 0 calc((100% - (var(--viz-cols) - 1) * var(--s3)) / var(--viz-cols));
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--surface);
  overflow: hidden;
}
.viz-card.is-dragging {
  opacity: 0.45;
}
.viz-card.is-over,
.viz-card.is-grabbed {
  border-color: var(--accent);
}
.viz-card__head {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--s2);
  padding: var(--s2) var(--s3);
  border-bottom: 1px solid var(--border);
}
.viz-card__name {
  flex: 1;
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--fw-extrabold);
  color: var(--text-heading);
}
.viz-card__grip,
.viz-card__info {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--s6);
  height: var(--s6);
  border: 1px solid var(--border);
  border-radius: var(--r-full);
  background: transparent;
  color: var(--text-muted);
  font-weight: var(--fw-extrabold);
  cursor: pointer;
}
.viz-card__grip {
  cursor: grab;
  border-radius: var(--r-sm);
}
.viz-card__grip[aria-pressed="true"] {
  border-color: var(--accent);
  color: var(--accent);
}
.viz-card__stage {
  flex: none;
  height: var(--viz-card-stage-h);
}
.viz-rev__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
```

Confirm `--s6` exists with `grep -n -e "--s6:" css/tokens.css`; use `--s5` if it does not.

### Task 8: Info popup, footer and `RevisionView`

**Files:**
- Create: `components/visualizer/frame/RevisionPopup.tsx`, `components/visualizer/frame/RevisionFooter.tsx`, `components/visualizer/frame/RevisionView.tsx`, `components/visualizer/frame/RevisionView.test.tsx`
- Modify: `css/view-visualizer/revision.css`

**Interfaces:**
- Consumes: `RevisionGrid`, `useLoopClock`, `useVizHotkeys`, `reconcileOrder`, `getVisualizerOrder`, `setVisualizerOrder`, `clearVisualizerOrder`, `Modal`, `VisualizerModule`.
- Produces: `RevisionView({ mod, glossary, onOpen })` with `glossary: Record<string, string>` and `onOpen(id: string): void`; `RevisionPopup({ card, glossary, onClose, onOpen })`; `RevisionFooter({ running, reduced, onToggle, onReset })`.

- [ ] **Step 1: Write the failing tests**

Create `components/visualizer/frame/RevisionView.test.tsx`:

```tsx
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KEYS } from "@/lib/storage/keys";
import { cachingModule } from "@/lib/visualizer/caching/module";
import { evictionModule } from "@/lib/visualizer/eviction/module";
import { RevisionView } from "./RevisionView";

const reduced = (on: boolean) =>
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches: on, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );

beforeEach(() => {
  localStorage.clear();
  reduced(false);
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 1200 });
});
afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
});

const names = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

describe("RevisionView", () => {
  it("shows the default order, the legend and the loop toggle", () => {
    render(<RevisionView mod={evictionModule} glossary={{}} onOpen={() => {}} />);
    expect(names()).toEqual(["FIFO", "LRU", "LFU", "CLOCK"]);
    expect(screen.getByText("Synchronous")).toBeTruthy();
    expect(screen.getByText("Asynchronous or background")).toBeTruthy();
    expect(screen.getByText("Conditional or fallback")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pause loop" })).toBeTruthy();
  });

  it("the toggle and Space pause and resume the loop", () => {
    render(<RevisionView mod={evictionModule} glossary={{}} onOpen={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause loop" }));
    expect(screen.getByRole("button", { name: "Play loop" })).toBeTruthy();
    fireEvent.keyDown(document.body, { key: " " });
    expect(screen.getByRole("button", { name: "Pause loop" })).toBeTruthy();
  });

  it("under reduced motion there is no loop toggle", () => {
    reduced(true);
    render(<RevisionView mod={evictionModule} glossary={{}} onOpen={() => {}} />);
    expect(screen.queryByRole("button", { name: /loop/i })).toBeNull();
    expect(names()).toHaveLength(4);
  });

  it("loads a saved order, repairs it, and ignores junk", () => {
    localStorage.setItem(
      KEYS.visualizerOrder,
      JSON.stringify({ "eviction-policies": ["clock", "ghost", "lru"] }),
    );
    render(<RevisionView mod={evictionModule} glossary={{}} onOpen={() => {}} />);
    expect(names()).toEqual(["CLOCK", "LRU", "FIFO", "LFU"]);
  });

  it("keyboard reorder is saved per visualizer and Reset order restores the default", () => {
    render(<RevisionView mod={evictionModule} glossary={{}} onOpen={() => {}} />);
    const grip = screen.getByRole("button", { name: "Reorder FIFO" });
    fireEvent.keyDown(grip, { key: " " });
    fireEvent.keyDown(grip, { key: "ArrowRight" });
    expect(names()).toEqual(["LRU", "FIFO", "LFU", "CLOCK"]);
    expect(JSON.parse(localStorage.getItem(KEYS.visualizerOrder) ?? "{}")).toEqual({
      "eviction-policies": ["lru", "fifo", "lfu", "clock"],
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset order" }));
    expect(names()).toEqual(["FIFO", "LRU", "LFU", "CLOCK"]);
    expect(localStorage.getItem(KEYS.visualizerOrder)).not.toContain("lru\",\"fifo");
  });

  it("another visualizer keeps its own order", () => {
    localStorage.setItem(KEYS.visualizerOrder, JSON.stringify({ "eviction-policies": ["clock"] }));
    render(<RevisionView mod={cachingModule} glossary={{}} onOpen={() => {}} />);
    expect(names()[0]).toBe("Cache-aside");
  });

  it("the info popup shows the glossary definition, how it differs, and opens the variant", () => {
    const onOpen = vi.fn();
    render(<RevisionView mod={evictionModule} glossary={{ lru: "GLOSSARY LRU TEXT" }} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "About LRU" }));
    const dialog = screen.getByRole("dialog", { name: "About LRU" });
    expect(within(dialog).getByText("GLOSSARY LRU TEXT")).toBeTruthy();
    expect(within(dialog).getByText(/Unlike FIFO, a hit renews a key/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: /Open in Single/ }));
    expect(onOpen).toHaveBeenCalledWith("lru");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("falls back to the module summary when the glossary has no entry, and Escape closes", () => {
    render(<RevisionView mod={evictionModule} glossary={{}} onOpen={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "About LRU" }));
    expect(screen.getByText(/Least recently used: the key untouched/)).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("the popup works for a flow card too", () => {
    render(<RevisionView mod={cachingModule} glossary={{}} onOpen={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "About Write-behind" }));
    expect(screen.getByRole("dialog", { name: "About Write-behind" })).toBeTruthy();
  });

  it("a module with no revision renders an empty grid without throwing", () => {
    act(() => {
      render(
        <RevisionView mod={{ ...evictionModule, revision: undefined }} glossary={{}} onOpen={() => {}} />,
      );
    });
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Implement the popup, footer and view**

Create `components/visualizer/frame/RevisionPopup.tsx`:

```tsx
import { Modal } from "@/components/common/Modal";
import type { RevisionCard } from "@/lib/visualizer/core/types";

interface RevisionPopupProps {
  card: RevisionCard;
  glossary: Record<string, string>;
  onClose: () => void;
  onOpen: () => void;
}

export function RevisionPopup({ card, glossary, onClose, onOpen }: RevisionPopupProps) {
  const definition = (card.glossaryTerm ? glossary[card.glossaryTerm] : undefined) ?? card.summary;
  return (
    <Modal
      open
      onClose={onClose}
      label={`About ${card.name}`}
      className="viz-popup"
      backdropClassName="viz-popup-backdrop"
    >
      <h2 className="viz-popup__title">{card.name}</h2>
      <h3 className="viz-popup__label">Definition</h3>
      <p className="viz-popup__text">{definition}</p>
      <h3 className="viz-popup__label">How it differs</h3>
      <p className="viz-popup__text">{card.differs}</p>
      <div className="viz-popup__actions">
        <button type="button" className="viz-btn" onClick={onClose}>
          Close
        </button>
        <button type="button" className="viz-btn viz-btn--primary" onClick={onOpen}>
          Open in Single <span aria-hidden="true">→</span>
        </button>
      </div>
    </Modal>
  );
}
```

Create `components/visualizer/frame/RevisionFooter.tsx`:

```tsx
import { IconButton } from "../ui/IconButton";

interface RevisionFooterProps {
  running: boolean;
  reduced: boolean;
  onToggle: () => void;
  onReset: () => void;
}

const LEGEND = [
  { style: "solid", label: "Synchronous" },
  { style: "dashed", label: "Asynchronous or background" },
  { style: "dotted", label: "Conditional or fallback" },
] as const;

export function RevisionFooter({ running, reduced, onToggle, onReset }: RevisionFooterProps) {
  return (
    <div className="viz-foot viz-rev__foot">
      <ul className="viz-legend" aria-label="Legend">
        {LEGEND.map((l) => (
          <li key={l.style} className="viz-legend__item">
            <svg className="viz-legend__swatch" width="28" height="8" aria-hidden="true">
              <line x1="1" x2="27" y1="4" y2="4" className={`viz-legend__line viz-legend__line--${l.style}`} />
            </svg>
            <span>{l.label}</span>
          </li>
        ))}
        <li className="viz-legend__item">
          <span className="viz-legend__badge" aria-hidden="true">
            1
          </span>
          <span>Step order</span>
        </li>
      </ul>
      <div className="viz-rev__controls">
        <button type="button" className="viz-btn" onClick={onReset}>
          Reset order
        </button>
        {!reduced && (
          <IconButton label={running ? "Pause loop" : "Play loop"} onClick={onToggle} variant="primary">
            {running ? "⏸" : "▶"}
          </IconButton>
        )}
      </div>
    </div>
  );
}
```

Create `components/visualizer/frame/RevisionView.tsx`:

```tsx
import { useCallback, useMemo, useState } from "react";
import {
  clearVisualizerOrder,
  getVisualizerOrder,
  setVisualizerOrder,
} from "@/lib/storage/visualizer-prefs";
import { reconcileOrder } from "@/lib/visualizer/core/order";
import type { VisualizerModule } from "@/lib/visualizer/core/types";
import { useLoopClock } from "../hooks/useLoopClock";
import { useVizHotkeys } from "../hooks/useVizHotkeys";
import { RevisionFooter } from "./RevisionFooter";
import { RevisionGrid } from "./RevisionGrid";
import { RevisionPopup } from "./RevisionPopup";

interface RevisionViewProps {
  mod: VisualizerModule;
  glossary: Record<string, string>;
  onOpen: (id: string) => void;
}

export function RevisionView({ mod, glossary, onOpen }: RevisionViewProps) {
  const cards = useMemo(() => mod.revision ?? [], [mod]);
  const defaults = useMemo(() => cards.map((c) => c.id), [cards]);
  const [order, setOrder] = useState(() => reconcileOrder(getVisualizerOrder(mod.slug), defaults));
  const [infoId, setInfoId] = useState<string | null>(null);
  const maxSteps = Math.max(1, ...cards.map((c) => c.steps));
  const clock = useLoopClock(maxSteps);
  useVizHotkeys({ toggle: clock.toggle, enabled: infoId === null });

  const saveOrder = useCallback(
    (next: string[]) => {
      setOrder(next);
      setVisualizerOrder(mod.slug, next);
    },
    [mod.slug],
  );
  const resetOrder = useCallback(() => {
    clearVisualizerOrder(mod.slug);
    setOrder(defaults);
  }, [mod.slug, defaults]);

  const infoCard = cards.find((c) => c.id === infoId) ?? null;
  return (
    <div className="viz-rev">
      <RevisionGrid
        cards={cards}
        order={order}
        onOrder={saveOrder}
        lit={clock.lit}
        pulse={clock.phase === "play" && clock.running}
        subject={mod.subject}
        onInfo={setInfoId}
      />
      <RevisionFooter
        running={clock.running}
        reduced={clock.reduced}
        onToggle={clock.toggle}
        onReset={resetOrder}
      />
      {infoCard && (
        <RevisionPopup
          card={infoCard}
          glossary={glossary}
          onClose={() => setInfoId(null)}
          onOpen={() => {
            setInfoId(null);
            onOpen(infoCard.id);
          }}
        />
      )}
    </div>
  );
}
```

Add to `css/view-visualizer/revision.css`:

```css
/* ═══════════════════════════════════════════════
   VISUALIZER — REVISION FOOTER AND POPUP
   ═══════════════════════════════════════════════ */
.viz-rev__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3) var(--s4);
  padding: var(--s2) var(--s4);
}
.viz-rev__controls {
  display: flex;
  align-items: center;
  gap: var(--s2);
}
.viz-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s2) var(--s4);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-sm);
  color: var(--text-muted);
}
.viz-legend__item {
  display: inline-flex;
  align-items: center;
  gap: var(--s2);
}
.viz-legend__line {
  stroke: var(--text-body);
  stroke-width: 2;
  stroke-linecap: round;
}
.viz-legend__line--dashed {
  stroke-dasharray: 7 5;
}
.viz-legend__line--dotted {
  stroke-dasharray: 1 6;
  stroke-width: 2.5;
}
.viz-legend__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: var(--r-full);
  background: var(--accent);
  color: var(--viz-on-accent);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--fw-extrabold);
}
.viz-popup-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--s4);
  background: rgba(0, 0, 0, 0.55);
}
.viz-popup {
  width: min(480px, 100%);
  max-height: 100%;
  overflow-y: auto;
  padding: var(--s5);
  border: 1px solid var(--border-2);
  border-radius: var(--r);
  background: var(--surface);
  outline: none;
}
.viz-popup__title {
  margin: 0 0 var(--s3);
  font-size: var(--text-xl);
  font-weight: var(--fw-extrabold);
  color: var(--text-heading);
}
.viz-popup__label {
  margin: var(--s3) 0 var(--s1);
  font-size: var(--text-xs);
  font-weight: var(--fw-extrabold);
  letter-spacing: var(--viz-tracking);
  text-transform: uppercase;
  color: var(--text-muted);
}
.viz-popup__text {
  margin: 0;
  color: var(--text-body);
  line-height: 1.5;
}
.viz-popup__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--s2);
  margin-top: var(--s5);
}
```

Confirm `--s5` and `.viz-btn--primary` exist (`grep -n "viz-btn--primary" css/view-visualizer/ui.css`); if `.viz-btn--primary` does not exist, drop that class and keep `.viz-btn`.

### Task 9: Wire the view toggle, URL, glossary and Open in Single

**Files:**
- Modify: `lib/visualizer/core/url-state.ts`, `lib/visualizer/core/url-state.test.ts`, `components/visualizer/hooks/useUrlSync.ts`, `components/visualizer/hooks/useUrlSync.test.tsx`, `components/visualizer/frame/VizHeader.tsx`, `components/visualizer/frame/config.test.tsx`, `components/visualizer/frame/VisualizerApp.tsx`, `components/visualizer/frame/VisualizerApp.test.tsx`, `lib/content/get-article.ts`, `app/visualizer/[slug]/page.tsx`, `app/visualizer.test.tsx`

**Interfaces:**
- Consumes: `RevisionView` (task 8), `Playback.pause` and `useVizHotkeys` `enabled` (task 2).
- Produces: `ViewMode = "single" | "revision"` exported from `core/url-state.ts`; `ViewState { frame; rotated; view: ViewMode }`; `encodeState(sections, values, view)` where `view.view?` is optional; `useUrlSync(sections, values, frame, rotated, view?)`; `VizHeader` prop `view?: { value: ViewMode; onChange: (v: ViewMode) => void }`; `VisualizerApp({ slug, glossary })`; `getGlossary(): Record<string, string>` exported from `lib/content/get-article.ts`.

- [ ] **Step 1: Write the failing URL and header tests**

In `lib/visualizer/core/url-state.test.ts` change the three view expectations to include `view: "single"` and add:

```ts
  it("writes view=revision only for the revision view and reads it back", () => {
    expect(encodeState(SECTIONS, DEFAULTS, { frame: 0, rotated: false })).not.toContain("view=");
    expect(encodeState(SECTIONS, DEFAULTS, { frame: 0, rotated: false, view: "single" })).not.toContain("view=");
    const search = encodeState(SECTIONS, DEFAULTS, { frame: 0, rotated: false, view: "revision" });
    expect(search).toContain("view=revision");
    expect(parseState(search, SECTIONS, DEFAULTS).view.view).toBe("revision");
  });

  it("an unknown view value falls back to single", () => {
    expect(parseState("?view=zzz", SECTIONS, DEFAULTS).view.view).toBe("single");
  });
```

In `components/visualizer/hooks/useUrlSync.test.tsx` add:

```tsx
  it("writes view=revision when the revision view is active", () => {
    const spy = vi.spyOn(window.history, "replaceState");
    renderHook(() => useUrlSync(SECTIONS, { capacity: 4 }, 0, false, "revision"));
    vi.advanceTimersByTime(300);
    expect(String(spy.mock.calls[0]?.[2])).toContain("view=revision");
  });
```

In `components/visualizer/frame/config.test.tsx` add inside the `VizHeader` describe:

```tsx
  it("the view toggle reflects the view and reports changes", () => {
    const onChange = vi.fn();
    const props = {
      title: "T",
      subtitle: "S",
      articleHref: "/x/",
      onCopyLink: () => {},
    };
    const { rerender } = render(<VizHeader {...props} view={{ value: "single", onChange }} />);
    expect(screen.getByRole("button", { name: "Single" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Revision" }));
    expect(onChange).toHaveBeenLastCalledWith("revision");
    rerender(<VizHeader {...props} view={{ value: "revision", onChange }} />);
    expect(screen.getByRole("button", { name: "Revision" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Single" }));
    expect(onChange).toHaveBeenLastCalledWith("single");
  });

  it("without a view prop no toggle is shown", () => {
    render(<VizHeader title="T" subtitle="S" articleHref="/x/" onCopyLink={() => {}} />);
    expect(screen.queryByRole("button", { name: "Revision" })).toBeNull();
  });
```

- [ ] **Step 2: Implement URL, hook and header changes**

In `lib/visualizer/core/url-state.ts` add and wire:

```ts
export type ViewMode = "single" | "revision";

export interface ViewState {
  frame: number;
  rotated: boolean;
  view: ViewMode;
}

export type ViewInput = Omit<ViewState, "view"> & { view?: ViewMode };
```

change `encodeState`'s third parameter type to `ViewInput`, add `if (view.view === "revision") q.set("view", "revision");` after the `rot` line, and in `parseState`'s returned `view` add `view: q.get("view") === "revision" ? "revision" : "single",`. In `useUrlSync.ts` add a fifth parameter `view?: ViewMode` (import `type ViewMode` from the same module), pass `{ frame, rotated, view }` to `encodeState`, and add `view` to the effect's dependency list. In `VizHeader.tsx` add `import type { ViewMode } from "@/lib/visualizer/core/url-state";`, the prop `view?: { value: ViewMode; onChange: (v: ViewMode) => void };`, and, as the first child of `viz-head__actions`:

```tsx
        {view && (
          <div className="viz-choice viz-choice--segmented" role="group" aria-label="View">
            <button
              type="button"
              className={`viz-choice__btn${view.value === "single" ? " is-on" : ""}`}
              aria-pressed={view.value === "single"}
              onClick={() => view.onChange("single")}
            >
              Single
            </button>
            <button
              type="button"
              className={`viz-choice__btn${view.value === "revision" ? " is-on" : ""}`}
              aria-pressed={view.value === "revision"}
              onClick={() => view.onChange("revision")}
            >
              Revision
            </button>
          </div>
        )}
```

- [ ] **Step 3: Write the failing frame tests**

Append to the `describe("VisualizerApp", ...)` block in `components/visualizer/frame/VisualizerApp.test.tsx`:

```tsx
  it("shows the view toggle for a module with revision cards and boots the revision view from the URL", () => {
    at("?view=revision");
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
    expect(screen.getByRole("button", { name: "Revision" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "FIFO",
      "LRU",
      "LFU",
      "CLOCK",
    ]);
    expect(screen.queryByRole("button", { name: "Next request" })).toBeNull();
    expect(screen.queryByLabelText("Sequence")).toBeNull();
  });

  it("switching views swaps the single page for the revision grid and back", () => {
    at("?p=lru&q=ABCADEAFBAGC&i=5");
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Revision" }));
    expect(screen.getByRole("button", { name: "Pause loop" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Next request" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Single" }));
    expect(screen.getByText("request 5 / 12")).toBeTruthy();
  });

  it("plain arrows and Shift+arrows do nothing in revision, and Space toggles the loop", () => {
    at("?view=revision&p=lru&q=ABCADEAFBAGC&i=5");
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    fireEvent.keyDown(document.body, { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(document.body, { key: " " });
    expect(screen.getByRole("button", { name: "Play loop" })).toBeTruthy();
  });

  it("Open in Single from the popup lands on that policy at the first request", () => {
    at("?view=revision&q=ABCADEAFBAGC");
    render(<VisualizerApp slug="eviction-policies" glossary={{ lru: "LRU GLOSSARY" }} />);
    fireEvent.click(screen.getByRole("button", { name: "About LRU" }));
    fireEvent.click(screen.getByRole("button", { name: /Open in Single/ }));
    expect(screen.getByRole("heading", { name: "LRU" })).toBeTruthy();
    expect(screen.getByText(/request 1 \//)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Single" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("the copied link carries view=revision", async () => {
    at("?view=revision");
    vi.mocked(writeToClipboard).mockResolvedValue(undefined);
    render(<VisualizerApp slug="eviction-policies" glossary={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(writeToClipboard).toHaveBeenCalled());
    expect(String(vi.mocked(writeToClipboard).mock.calls[0]?.[0])).toContain("view=revision");
  });

  it("the caching visualizer has the same two views", () => {
    at("?view=revision");
    render(<VisualizerApp slug="caching-strategies" glossary={{}} />);
    expect(screen.getByRole("heading", { level: 3, name: "Cache-aside" })).toBeTruthy();
  });
```

Also add `glossary={{}}` to every existing `render(<VisualizerApp slug=... />)` call in this file (or give the prop a default; the plan makes the prop required, so update the calls).

- [ ] **Step 4: Implement the wiring**

In `components/visualizer/frame/VisualizerApp.tsx` change the component signature and add the glossary and view:

```tsx
export function VisualizerApp({ slug, glossary }: { slug: string; glossary: Record<string, string> }) {
  const mod = MODULES[slug];
  // Server and hydration render the placeholder, so the random default seed never lands in static HTML.
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  if (!mod) throw new Error(`Unknown visualizer: ${slug}`);
  if (!isClient) return <main className="viz-app viz-app--loading" aria-busy="true" />;
  return <VisualizerBody mod={mod} glossary={glossary} />;
}
```

Change `function VisualizerBody({ mod }: { mod: VisualizerModule })` to `function VisualizerBody({ mod, glossary }: { mod: VisualizerModule; glossary: Record<string, string> })`, import `RevisionView` from `./RevisionView` and `type ViewMode` from the url-state module, and inside the body add:

```tsx
  const hasRevision = (mod.revision?.length ?? 0) > 0;
  const [view, setView] = useState<ViewMode>(hasRevision ? boot.view.view : "single");
```

Change the hook calls to `useVizHotkeys({ toggle, step, variant: ..., enabled: view === "single" });` and `useUrlSync(mod.sections, values, pb.frame, rotated, hasRevision ? view : undefined);`, change `copyLink`'s `encodeState` view argument to `{ frame: pb.frame, rotated, view: hasRevision ? view : undefined }` (add `view`, `hasRevision` to its dependencies), and add:

```tsx
  const changeView = useCallback(
    (next: ViewMode) => {
      if (next === "revision") pb.pause();
      setView(next);
    },
    [pb],
  );
  const openInSingle = useCallback(
    (id: string) => {
      switchVariant(id);
      setView("single");
      restart();
    },
    [switchVariant, restart],
  );
```

Pass `view={hasRevision ? { value: view, onChange: changeView } : undefined}` to `VizHeader`. Wrap the body so the Revision view replaces the three-column body: replace `<div className="viz-app__body"> ... </div>` with:

```tsx
      {view === "revision" ? (
        <RevisionView mod={mod} glossary={glossary} onOpen={openInSingle} />
      ) : (
        <div className="viz-app__body">
          {/* the existing left SidePanel, centre column and right SidePanel, unchanged */}
        </div>
      )}
```

(Keep the three existing children exactly as they are inside the `else` branch.) In `lib/content/get-article.ts` export the glossary accessor:

```ts
export function getGlossary(): Record<string, string> {
  return loadGlossary();
}
```

In `app/visualizer/[slug]/page.tsx` import `getGlossary` from `@/lib/content/get-article` and render `<VisualizerApp slug={slug} glossary={getGlossary()} />`. In `app/visualizer.test.tsx`, if a test renders the page and inspects props or markup, make sure it still passes with the extra prop; add one assertion that the server markup of `VisualizerPage` renders without throwing.

### Task 10: Docs

**Files:**
- Modify: `docs/_meta/visualizer/README.md`, `docs/superpowers/specs/2026-10-07-cache-visualizer-design.md`, `docs/superpowers/specs/2026-10-07-caching-strategies-visualizer-design.md`, `CONVENTIONS.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: the shipped behaviour from tasks 1 to 9.
- Produces: docs that match the code.

- [ ] **Step 1: Find every stale statement**

Run: `grep -n -i "compare\|common grid\|common shape\|availability(values, variants)\|Single|Compare" docs/_meta/visualizer/README.md docs/superpowers/specs/2026-10-07-cache-visualizer-design.md docs/superpowers/specs/2026-10-07-caching-strategies-visualizer-design.md CONVENTIONS.md CLAUDE.md`

- [ ] **Step 2: Rewrite them**

- `docs/_meta/visualizer/README.md`: replace the "Compare mode" section with a "Variants and Revision" section: a module declares `variants: { key }` and optionally `revision` cards; Single switches variant without restarting (prev/next buttons, Shift+←/→); Revision is a grid of looping cards (layout rows rule, drag and keyboard reorder saved locally, info popup with Open in Single, legend and loop toggle in the footer). Update the header anatomy line to `[Single|Revision]`, add the Flow diagram to the shapes table (nodes, numbered edges, three fixed line styles), and keep the Histogram row.
- `docs/superpowers/specs/2026-10-07-cache-visualizer-design.md`: replace the compare statements with a pointer to `2026-10-09-visualizer-variants-and-revision-design.md`.
- `docs/superpowers/specs/2026-10-07-caching-strategies-visualizer-design.md`: replace the "Compare-mode compatibility" section with a "Variants and Revision" note (the module declares `strategy` as the variants field, the equal-frames rule still applies because switching keeps the step, six flow cards), and change the `availability(values, variants)` signature to `availability(values)` and the sentence about dimming "in compare mode" accordingly.
- `CONVENTIONS.md`: replace the sentence about compare mode with "Revision cards reuse a generic shape or the flow diagram; nothing in `components/visualizer/` names a specific visualizer."
- `CLAUDE.md`: in the Components table, change the `visualizer/frame/` row to mention `RevisionView`/`RevisionGrid` and the `visualizer/shapes/` row to mention `FlowDiagram`; add `lib/visualizer/core/` mentions of layout, loop and order.

Keep every changed Markdown paragraph on a single line.

- [ ] **Step 3: Verify no stale statement remains**

Run: `grep -rn -i "compare mode\|common grid\|common shape\|availability(values, variants)" docs/_meta/visualizer docs/superpowers/specs/2026-10-07-cache-visualizer-design.md docs/superpowers/specs/2026-10-07-caching-strategies-visualizer-design.md CONVENTIONS.md CLAUDE.md components lib app css`
Expected: no match describing compare as a current feature. A hit inside the superseded compare spec or plan, or in this plan and the variants spec describing what was retired, is fine.

---

### Task 11: Final verification

**Files:**
- None; this task only runs checks and fixes what they report.

**Interfaces:**
- Consumes: every earlier task.
- Produces: a green tree, ready for the user to commit.

- [ ] **Step 1: Format and fix mechanical issues**

Run: `pnpm exec biome check --write components lib app css`
Expected: no remaining errors.

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS. If ESLint reports the jsx-a11y drag rules on the card `section`, add `// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the grip button is the keyboard path` directly above the `<section` line in `RevisionGrid.tsx`.

- [ ] **Step 3: Check for leftover compare code**

Run: `grep -rn "compare\b\|CompareSpec\|clockFrames\|MultiChoiceGroup\|VariantTabs\|CompareGrid\|CompareTile" components lib app css --include="*.ts" --include="*.tsx" --include="*.css" | grep -v "reader/\|settings/\|ComplexityCompare\|ComparisonTable"`
Expected: no output.

- [ ] **Step 4: Run the full unit and pipeline suite once**

Run: `pnpm test`
Expected: PASS. If a test fails, fix the cause, not the test, unless the test is wrong, and rerun only that file until it passes, then rerun the whole suite once.
Known spots to check if they fail: the eviction revision "different keys" test (assert on the frame's `removed` variable row, which is `A`, `B`, `B`, `A` for fifo, lru, lfu, clock, if a caption names a different key), the `Pause` button's accessible name in the paused-frame test (use whatever name `PlaybackBar` renders), and `Modal` focus behaviour in the popup tests under jsdom.

- [ ] **Step 5: Check the layout in a browser at three widths**

The dev server is already running on port 3000 in the user's session; use it and do not start another. Open `/wiki-fe/visualizer/eviction-policies/?view=revision` and `/wiki-fe/visualizer/caching-strategies/?view=revision` at about 1440px, 900px and 320px, driving Chromium through `.venv/bin/python3` with Playwright, because the Playwright MCP cannot find system Chrome. Confirm: 4 across at 1440px, 2 + 2 at 900px, one per row at 320px with no horizontal page scroll; the loop plays, pauses and holds; the legend and toggle stay fixed while the grid scrolls; the info popup opens and Open in Single works; no failed requests in the console. Also open the single view and confirm switching policy keeps the step. Report what you saw, including anything off, instead of declaring it done.
