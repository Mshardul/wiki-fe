# Fit-to-stage scaling and Sorting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add fit-to-stage scaling for new shapes (the picture fills the whole stage and scales uniformly with it), the generic Array (bars) shape, and the Sorting visualizer with seven algorithms.

**Architecture:** The stage stays one block. A generic `useFitScale` helper turns the stage size a shape already receives into one uniform scale, so nothing changes for the 19 shipped visualizers. Counters and loop variables go to frame `vars` and the corner metric; the colour legend is dropped (compare modules have no footer legend and the colours are self-evident from the bars and zone labels). Array is a new generic shape (model in `core/shapes.ts`, component in `components/visualizer/shapes/`). Sorting is a module under `lib/visualizer/sorting/` whose per-algorithm step generators produce `ArrayModel` snapshots that a shared converter turns into `VizFrame[]`.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest + Testing Library, pnpm, plain CSS with `--viz-*` tokens.

**Spec:** `docs/superpowers/specs/2026-11-14-backlog-visualizers-design.md` (stage layout, Array shape, per-visualizer table). Read `docs/_meta/visualizer/README.md` and CONVENTIONS.md § Visualizer and § CSS first.

## Global Constraints

- Generic code (`components/visualizer/**`, `lib/visualizer/core/**`) uses structural words only; sorting words (pivot, merge, bucket) live under `lib/visualizer/sorting/`.
- Colours only via `--viz-*` tokens; new sizes become tokens in `css/tokens.css`; breakpoints only in `css/responsive.css`; nothing may break at 320px.
- Frames are pure and deterministic from inputs plus seed. Every change gets its own step; a step never skips a change.
- Comments and docstrings are one line. No ticket IDs in code or CSS. No `console.*`.
- Tests are written together with the code (fixture-first, hand-checked values below). Run the whole suite once at the end (Task 8), not per step.
- No git steps anywhere; the user owns version control.
- Step copy is plain English, 2–4 loop lines per algorithm, never source code.
- Bars look: opaque fills, ground line, value above each bar, index row, pointer tags under bars (only real pointers get a tag), white glow on the compared bar.
- New shapes never draw at a fixed size: one uniform scale (aspect ratio kept) from the shape's natural width and height and the stage size, capped at a token maximum, recomputed on resize. The figure fills the stage and grows when the side panels collapse. There is no second block beside the picture.
- Sorting ships without the heap sort variant; it is added by the Heap plan because it needs the Heap shape.

## Review Focus

- All-equal, already-sorted and size-4 inputs: every algorithm still ends on a "Done" frame with no empty or repeated steps.
- A custom sequence with junk, out-of-range or too few numbers falls back to the preset instead of throwing.
- Switching algorithm restarts at step 1; a URL frame index past the new run's length falls back to the first step.
- Two pointers on the same index (i equals j) both show their tag.
- At 320px a 12-bar row shrinks to fit the stage and the page never scrolls sideways; collapsing both side panels makes the bars larger, capped at the token maximum.
- Stability on with duplicates: tags appear only on repeated values, and selection sort visibly reorders equal values.

---

### Task 1: Fit-to-stage scaling

**Files:** Create `lib/visualizer/core/fit.ts`, `components/visualizer/shapes/FitBox.tsx`. Modify `css/tokens.css` (`--viz-fit-scale-max: 2`, `--viz-stage-metric-room`, `--viz-stage-caption-room`), `css/view-visualizer/stage.css` (`.viz-fit`). Test `lib/visualizer/core/fit.test.ts`, `components/visualizer/shapes/FitBox.test.tsx`.

**Interfaces:**
- `fit.ts`: `FIT_SCALE_MAX` (mirrors the token; a test keeps them equal); `fitScale(natural, stage, max = FIT_SCALE_MAX): number` returns `min(stage.width / natural.width, stage.height / natural.height, max)`, and 1 while either size is not measured yet.
- `FitBox({ className, children })`: sits inside the stage with room left for the corner metric and the caption, measures its own box and the natural size of its children (layout size, ignoring the transform), and renders them with one uniform `transform: scale(s)` centred, recomputed on resize.

- [x] **Step 1: Tests** in `fit.test.ts`: "limited by stage height on a wide stage"; "limited by stage width on a tall stage"; "capped at max"; "aspect ratio kept"; "unmeasured returns 1"; "cap equals the css token". In `FitBox.test.tsx`: "shrinks to a smaller stage"; "grows to a bigger stage up to the cap"; "scale 1 until measured".
- [x] **Step 2:** Implement both. `Stage` only loses its split layout; shipped shapes do not use `FitBox`.

### Task 2: Array shape

**Files:** Modify `lib/visualizer/core/shapes.ts` (add to `LeafModel`, `modelKeys`), `components/visualizer/shapes/Shape.tsx`, `css/tokens.css` (`--viz-array-pitch: 46px`, `--viz-array-bar: 34px`, `--viz-array-unit-max: 16px`, `--viz-array-height-max: 180px`; these are the natural, unscaled sizes), `css/wiki.css` (import). Create `components/visualizer/shapes/ArrayShape.tsx`, `css/view-visualizer/array.css`. Test `components/visualizer/shapes/ArrayShape.test.tsx`.

**Interfaces:**
- Produces: `type ArrayTone = "plain" | "good" | "warn" | "accent" | "focus"`; `ArrayBar { value: number; tone: ArrayTone; tag?: string; faded?: boolean }`; `ArrayPointer { label: string; index: number; tone?: "accent" }`; `ArrayZone { from: number; to: number; label: string; tone: "good" | "warn" | "plain" }` (inclusive indexes); `ArrayRow { label?: string; bars: (ArrayBar | null)[]; indices: string[]; pointers: ArrayPointer[]; zones: ArrayZone[]; next?: number }`; `ArrayModel { kind: "array"; rows: ArrayRow[]; scale: number }`. `ArrayShape({ model, subject, size })`.

- [x] **Step 1: Tests**: "draws one bar per value with the number above it and tags like 5a"; "applies the tone as a class and `focus` as the glow"; "renders exactly one tag per pointer and no empty tags"; "stacks two pointers on one index"; "draws zones across from..to with their label"; "null bars are dashed slots and `next` outlines one"; "bar height is value times a unit capped so `scale` fits `--viz-array-height-max`"; "each row shows its `indices` and optional `label`"; "scales the whole drawing uniformly to the stage size, capped at the token maximum, so a bigger stage gives a bigger figure"; "role img label lists the first row's values".
- [x] **Step 2:** Implement the component (natural-size grid of `repeat(n, var(--viz-array-pitch))`, wrapped by `useFitScale` so the whole figure scales to the stage; unit set inline as a CSS variable from `scale`) and the Shape dispatch before the linear/histogram fallthrough; `modelKeys` returns the first row's non-null values as strings.

### Task 3: Sorting module with Insertion

**Files:** Create under `lib/visualizer/sorting/`: `types.ts`, `input.ts`, `frames.ts`, `algos/insertion.ts`, `module.ts`; tests `input.test.ts`, `module.test.ts`, `algos/insertion.test.ts`. Modify `lib/visualizer/registry.ts`, `lib/visualizer/modules.ts`, `lib/visualizer/registry.test.ts`.

**Interfaces:**
- `types.ts`: `SORT_IDS = ["insertion","selection","merge","quick","counting","radix","bucket"] as const` (chip order, easier first, as in the spec); `SortId`; `PRESETS = ["random","nearly-sorted","reversed","duplicates"] as const`; `Item { value: number; tag?: string }`; `SortInput { algo; preset; size; seed; stable: boolean; values: number[] | null }`; `SortStep { badge: string; caption: Rich; array: ArrayModel; counters: { value: string; label: string }[]; outcome: Outcome; vars: VarRow[]; path: number[] }`; `SortDef { id; name; chip; rule; lines: string[]; about: [string,string][]; tries: Experiment[]; articleHref: string; steps(items: Item[]): SortStep[] }`.
- `input.ts`: `domainOf(algo: SortId): { min: number; max: number }` (radix 10..99, others 1..9); `makeValues(preset: Preset, size: number, seed: number, domain): number[]`; `tagItems(values: number[], stable: boolean): Item[]`; `parseValues(raw: string): SequenceParse`; `toSortInput(v: InputValues): SortInput`.
- `frames.ts`: `toFrames(def: SortDef, steps: SortStep[]): VizFrame[]` sets `label` and `badge` from the step badge, `lines` from `def.lines`, `metric` to the first counter's value (corner metric), and `vars` to the loop variables now versus before plus the remaining counters. There is no colour legend; the shared colour language is in the README.
- `module.ts`: `sortingModule: VisualizerModule` (slug `sorting`, `variants: { key: "algo", restartOnSwitch: true }`, `subject: "Array"`, unit `"step"`). Sections: algorithm chips (param `a`); input: preset chips (`pre`), size slider 4–12 (`n`), stability chips off/on (`t`), sequence field (`q`, `join: ","`, `parse: parseValues`, `resetBy: ["algo","preset","size","seed"]`); seed (`s`). `defaults()` uses algo insertion, hand-picked sequence `5,2,4,6,1,3`, a fresh seed. `info.articleHref` is `/dsa/algorithms/<id>-sort/` (quick uses `/dsa/algorithms/quicksort/`; merge `/dsa/algorithms/merge-sort/`).
- Registry entry: slug `sorting`, title `Sorting`, kind `compare`.

**Step grammar (shared):** first frame badge "Start" (no change), last badge "Done". Outcome is "good" when the step moves data, "bad" when it only inspects. Counters per algorithm: comparisons and swaps (insertion, selection, quick), comparisons and writes (merge), comparisons (always 0) and writes (counting, radix, bucket).

- [x] **Step 1: Tests.** `input.test.ts`: `makeValues` is deterministic per seed, stays inside the domain, `reversed` is non-increasing, `duplicates` uses at most 3 distinct values, `nearly-sorted` differs from sorted by at most `ceil(size/6)` adjacent swaps; `tagItems([4,5,2,5,3], true)` tags only the two 5s as `a`,`b` in input order and `tagItems(..., false)` tags none; `parseValues("5, 2 x")` is an error and `parseValues("5,2,9")` gives tokens `["5","2","9"]`; `toSortInput` with junk fields falls back to insertion, size 4–12, and `values: null` when fewer than 2 valid numbers remain (numbers clamp into the domain). `insertion.test.ts` on `[3,1,2]`: badges `Start, Compare, Swap, Compare, Swap, Compare, Done`; final values `[1,2,3]`; final counters comparisons 3, swaps 2; the sorted prefix is a green zone; on `[2a,2b,1]` the result keeps `2a` before `2b`. `module.test.ts`: defaults valid; field keys `algo, preset, size, stable, sequence, seed`; `variants.restartOnSwitch` true; run returns frames whose first badge is Start and last is Done for the default input.
- [x] **Step 2:** Implement `types.ts`, `input.ts`, `frames.ts`, `algos/insertion.ts` (swap-based: one step per compare, one per swap; pointers `i`,`j`), `module.ts`; register in `registry.ts` and `modules.ts`; extend `registry.test.ts` for the new slug and kind.

### Task 4: Selection and Quick

**Files:** Create `algos/selection.ts`, `algos/quick.ts` with tests; modify `module.ts` (add to the chips and the algo map).

- [x] **Step 1: Tests.** Selection on `[3,1,2]`: badges `Start, Compare, New min, Compare, Swap, Compare, New min, Swap, Done`; final `[1,2,3]`; comparisons 3, swaps 2; pointers `i`,`j`,`min`. Selection on `[2a,2b,1]` with tags ends `1, 2b, 2a`. Quick (pivot is the last item of the range, Lomuto) on `[3,1,2]`: badges `Start, Pick pivot, Compare, Compare, Swap, Place pivot, Done`; final `[1,2,3]`; comparisons 2, swaps 2; zones green "< pivot", amber "≥ pivot", grey "not looked at"; pointers `i`,`j`,`pivot`. Quick on an all-equal input still terminates and ends Done.
- [x] **Step 2:** Implement both; a range of one item emits no steps; "Place pivot" is emitted even when the pivot is already in place; settled items turn green.

### Task 5: Merge

**Files:** Create `algos/merge.ts` and test; modify `module.ts`.

- [x] **Step 1: Tests.** Top-down merge sort on `[3,1,2]`: badges `Start, Split, Split, Compare, Take, Take, Copy back, Compare, Take, Compare, Take, Take, Copy back, Done`; final `[1,2,3]`; comparisons 3, writes 5 (writes count Take steps only). The array model has two rows: the main row with L and R pointers, and an aux row labelled "merged so far" whose empty slots are null and whose next slot is `next`; taken main-row bars are `faded`.
- [x] **Step 2:** Implement: Compare only while both halves have items, Take for each placed item (including the leftover run), Copy back as a single step per merge.

### Task 6: Counting, Radix, Bucket

**Files:** Create `algos/counting.ts`, `algos/radix.ts`, `algos/bucket.ts` with tests; modify `module.ts`.

- [x] **Step 1: Tests.** Counting (stable) on `[2,1,2]`: badges `Start, Count, Count, Count, Running totals, Place, Place, Place, Done`; final `[1,2,2]`; with tags the output is `1, 2a, 2b`; counters comparisons "0", writes 3; the array model has three rows (input, counts by value 1–9, output with null slots filling left to right). Radix (least significant digit first, base 10) on `[21,13,22]`: badges `Start, Drop ×3, Collect, Drop ×3, Collect, Done` (ten frames), after the first Collect the order is `21,22,13`, final `[13,21,22]`; the counts row is the ten digit buckets. Bucket (3 buckets: 1–3, 4–6, 7–9) on `[7,2,5,8,1]`: `Start, Drop ×5, Sort bucket ×2, Collect, Done` (ten frames; only buckets with two or more items get a Sort step), final `[1,2,5,7,8]`.
- [x] **Step 2:** Implement the three; counts and bucket rows use the Array shape with `indices` set to the value, digit or range label, and the bar showing how many items are in it.

### Task 7: Revision, copy, shape docs

**Files:** Create `lib/visualizer/sorting/revision.ts`, `copy.ts`, tests `revision.test.ts`, `steps.test.ts`. Modify `module.ts`, `docs/_meta/visualizer/README.md` (add an Array row to the Shape library table).

**Interfaces:** `sortingRevision(defs: Record<SortId, SortDef>): RevisionCard[]` — one looping card per algorithm on a fixed mini input (`[4,2,5,1,3]`; radix `[31,12,23,14]`), card name, summary, `differs` copy, `stepsText` from frame captions.

- [x] **Step 1: Tests.** `revision.test.ts`: seven cards in chip order, each `steps` equals its frame count, `render(0)` is the unsorted array and `render(steps)` is sorted, summary and differs are non-empty. `steps.test.ts`: for every algorithm on random, sorted, all-equal and size-4 inputs, no two adjacent frames have identical array models, the last frame is sorted ascending by value, and for insertion, selection and quick at most two bar positions differ between consecutive frames; every `path` index is inside `lines`, and `lines.length` is 2–4. Confirm the existing `lib/visualizer/steps.test.ts` still passes with the new module (its schedule check must ignore array frames).
- [x] **Step 2:** Write the copy (rule, 2–4 plain-English lines, About cost/wins/loses/seen-in, 2–3 Try experiments per algorithm such as "already sorted", "reversed", "all equal" for quick, and "Stability on" for selection versus insertion). Wire `revision` into the module. Add the Array row to the README table.

### Task 8: Browser check and full verification

**Files:** Modify `tests/e2e/test_visualizer.py` (existing).

- [ ] **Step 1:** Add one e2e test: open `/visualizer/sorting/`, assert the stage shows the bars with no second block beside them and the corner metric, step through to the end and see "Done", switch algorithm and see step 1; collapse both side panels and assert the bars grow; at a 320px viewport assert the document has no horizontal scroll. Do not run the full e2e suite; run only this test after `pnpm build:e2e`, and only if the user agrees.
- [x] **Step 2:** Run once: `pnpm typecheck && pnpm lint && pnpm test:all`. Expected: all pass. Fix anything that fails at its cause (including failures in files this plan did not touch).
