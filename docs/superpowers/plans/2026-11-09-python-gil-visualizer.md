# Inside the Python GIL — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/visualizer/python-gil/` as a mechanism visualizer that steps through the four GIL scenarios on the shared timeline component.

**Architecture:** Registry entries gain `kind`. Compare slugs keep `VisualizerApp`. Mechanism slugs render `MechanismApp`, which plays a `VizFrame[]` from the module. A new generic `ScheduleModel` / `ScheduleShape` draws rows over continuous time, revealed up to `now`. The timeline component is untouched. The GIL module copies its scenario copy from the HTML draft and builds one `ScheduleModel` per frame.

**Revision (2026-11-09):** the first pass put the GIL on `TimelineShape` with row spans. In the browser every step looked the same (nothing was revealed up to now), the GIL row showed timers instead of the holder, drop requests and checkpoints were invisible dots, the race counter was dropped, the cursor ran off the right edge at the last step, legend swatches were blank, and the page overflowed its viewport-high container. Task 2 below replaces that work; the timeline row-span changes were reverted.

**Tech Stack:** Next.js, TypeScript, Vitest, the existing visualizer frame, `css/tokens.css`.

**Spec:** `docs/superpowers/specs/2026-11-09-python-gil-visualizer-design.md`

## Global Constraints

- `kind` is `"compare"` or `"mechanism"`. Eviction, caching, and rate limiting are `"compare"`.
- Slug `python-gil`. Title `Inside the Python GIL`.
- Index group headings, in order: `Compare algorithms`, `Watch a mechanism`. Subtitles: `Pick one, change the inputs, and watch what changes.` and `Step through it, then through the cases where it breaks it.`
- GIL card description: `Step through who holds the lock, then the cases where a CPU thread, a convoy, or a checkpoint breaks it.`
- Kicker: `CPython 3.12+ · default build · switch interval 5 ms`.
- Scenario field key: `scenario`. Values in order: `happy`, `cpu`, `convoy`, `race`. Default `happy`. Switching restarts at step 1.
- Frame counts: happy 4, cpu 5, convoy 5, race 6.
- The race scenario's last frame is the only `outcome: "bad"` frame.
- Component CSS uses `var(--…)` from `css/tokens.css` only. No new color token.
- Do not delete `content/Visualizer/Inside the Python GIL.html`.
- Do not add revision, an input panel, rotate, or repeat on the mechanism page.

## Review Focus

- The rate-limiting timeline is unchanged: `TimelineShape`, `timeline.css` and the timeline geometry have no diff.
- Each step of a scenario shows more of the diagram than the step before. A reader would expect stepping to change the picture, not only the text.
- An arrow, pin or meter that names a row that does not exist is not drawn. A reader would expect it omitted rather than painted on the wrong thread.
- `now` equal to `end` puts the playhead on the right edge, not past it, and nothing scrolls sideways on a wide stage.
- Opening a compare slug still renders `VisualizerApp`, including Single / Revision. A reader of eviction would expect the current page.
- `articleHref: ""` renders no Read article control. A reader would expect no link to a missing article.

## File structure

- `lib/visualizer/registry.ts` — `kind` plus the GIL entry. The index and the route read this.
- `lib/visualizer/gil/module.ts` — the `VisualizerModule`.
- `lib/visualizer/gil/scenarios.ts` — scenario copy and the frame list, ported from the draft.
- `lib/visualizer/gil/schedule.ts` — one draft trace plus a time → `ScheduleModel`.
- `components/visualizer/frame/MechanismApp.tsx` — mechanism page.
- `lib/visualizer/core/shapes.ts`, `lib/visualizer/core/geometry.ts`, `components/visualizer/shapes/ScheduleShape.tsx`, `components/visualizer/shapes/Shape.tsx` — the schedule shape.
- `css/view-visualizer/schedule.css`, `css/view-visualizer/layout.css` — token-only styles for the schedule shape, legend swatches and the mechanism page.

### Task 1: Registry kind and the two index groups

**Files:**
- Modify: `lib/visualizer/registry.ts`
- Modify: `lib/visualizer/registry.test.ts`
- Modify: `app/visualizer/page.tsx`
- Modify: `app/visualizer/[slug]/page.tsx`
- Test: `lib/visualizer/registry.test.ts`

**Interfaces:**
- Consumes: `VISUALIZERS`, `getVisualizer`
- Produces: `VisualizerEntry.kind: "compare" | "mechanism"`. `getVisualizer("python-gil")` returns the GIL entry. Existing slugs return `kind: "compare"`.

- [ ] **Step 1: Write the failing test**

Assert `getVisualizer("eviction-policies")?.kind === "compare"`, the same for `caching-strategies` and `rate-limiting`, and that a `python-gil` entry has `kind: "mechanism"`, title `Inside the Python GIL`, and the card description from Global Constraints.

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm exec vitest run lib/visualizer/registry.test.ts`

- [ ] **Step 3: Add `kind` to the entry type and the three existing entries. Add the GIL entry. Group the index by `kind` with the two headings and subtitles from Global Constraints. In the slug page, render `MechanismApp` when `kind` is `mechanism`.**

`MechanismApp` may be a stub that renders the title until Task 4. Compare slugs still render `VisualizerApp`.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm exec vitest run lib/visualizer/registry.test.ts`

### Task 2: Schedule shape

**Files:**
- Modify: `lib/visualizer/core/shapes.ts`, `lib/visualizer/core/geometry.ts`, `components/visualizer/shapes/Shape.tsx`, `css/wiki.css`
- Create: `components/visualizer/shapes/ScheduleShape.tsx`, `css/view-visualizer/schedule.css`
- Test: `lib/visualizer/core/schedule-layout.test.ts`, `components/visualizer/shapes/ScheduleShape.test.tsx`

**Interfaces:**
- Produces: `ScheduleModel` (see spec), `ScheduleSwatch = "solid" | "hatch" | "outline" | "meter" | "arrow" | "pin"`, `scheduleLayout(model)` returning `x(t)`, `rowY(i)`, `summaryY`, `valuesY`, `width`, `height`.

- [ ] **Step 1: Write the failing tests**

Layout: `x(0)` is the plot left, `x(end)` the plot right, `x(t > end)` clamps to the right. Rows stack below the summary row; the values row sits under the last row; height grows with rows and with a values row.

Shape: at `now = 4` a segment `0–10` is drawn only up to `x(4)`; a segment starting at `6` is not drawn; an arrow at `5` is not drawn and appears at `now = 5`; a meter shows its track and a fill up to `now`; a pin on an unknown row is not drawn; the playhead sits at `x(now)`, clamped to `x(end)`; a segment label shows only once the segment is complete.

- [ ] **Step 2: Run the tests and confirm they fail**

- [ ] **Step 3: Implement the model, the layout, the shape, the CSS (tokens only) and route `kind: "schedule"` in `Shape`.**

- [ ] **Step 4: Run the schedule tests and the shape tests**

Run: `pnpm exec vitest run lib/visualizer/core/schedule-layout.test.ts components/visualizer/shapes`

### Task 3: GIL scenario data and timeline models

**Files:**
- Create: `lib/visualizer/gil/scenarios.ts`
- Create: `lib/visualizer/gil/schedule.ts`
- Create: `lib/visualizer/gil/module.ts`
- Create: `lib/visualizer/gil/module.test.ts`
- Modify: `lib/visualizer/modules.ts`
- Source: `content/Visualizer/Inside the Python GIL.html`

**Interfaces:**
- Consumes: `ScheduleModel`, `VisualizerModule`
- Produces: `gilModule: VisualizerModule` with `slug "python-gil"`, `sections` containing only the `scenario` chips, `defaults()` returning `{ scenario: "happy" }`, no `revision`. `gilModule.run(values).frames` is the `VizFrame[]` for that scenario. `run(values).info.about` is `[["Takeaway", take], ["Generalizes to", gen]]`.

- [ ] **Step 1: Write the failing test**

Assert the four ids and frame counts from Global Constraints. Assert the happy-path question starts with `I/O-bound threads interleave`. Assert the happy-path takeaway is `The GIL serializes Python bytecode, not waiting. Threads are a valid tool for blocking I/O.` Assert frame 0 of `happy` has label `T1 runs` and a model of `kind: "schedule"` whose `now` equals that frame's draft time. Assert the last `race` frame has `outcome: "bad"` and the earlier race frames have `outcome: "good"`. Assert `cpu` builds a `solid` segment on row `T1`, a `summary` segment labelled `T1`, meters, arrows and pins. Assert race frames carry the `counter` values and switch from trace A to trace B.

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm exec vitest run lib/visualizer/gil/module.test.ts`

- [ ] **Step 3: Port the four scenarios from the HTML draft. Build each frame's `ScheduleModel` with the mapping in the spec. Register `gilModule` in `modules.ts`.**

Copy `q`, `take`, `gen`, frame `h`, and frame `b` from the draft. Do not invent a fifth scenario.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm exec vitest run lib/visualizer/gil/module.test.ts`

### Task 4: Mechanism page

**Files:**
- Create: `components/visualizer/frame/MechanismApp.tsx`
- Create: `components/visualizer/frame/MechanismApp.test.tsx`
- Modify: `css/view-visualizer/layout.css`
- Modify: `app/visualizer/[slug]/page.tsx` if Task 1 left a stub

**Interfaces:**
- Consumes: `gilModule`, `usePlayback`, the playback bar, `ScheduleShape` through the existing stage `Shape`
- Produces: `MechanismApp({ slug, glossary })` rendering kicker, title, subtitle, scenario tabs, stage, legend, playback, step heading, step body, Takeaway, Generalizes to, and the muted timings line.

- [ ] **Step 1: Write the failing test**

Render `MechanismApp` with slug `python-gil`. Assert the title, the kicker, the happy-path question, the takeaway, a button named `Copy link`, and legend text `Running Python` and `Drop request`. Assert no button named `Revision` and no link named `Read article`. Click `Scenario 1` and assert the CPU-bound question and that the step counter reads step 1.

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm exec vitest run components/visualizer/frame/MechanismApp.test.tsx`

- [ ] **Step 3: Implement `MechanismApp`.**

Tabs write the `scenario` value through the existing URL state and restart at step 1. Playback is the shared step controls with rotate and repeat omitted. The stage renders `frame.model` at its natural height, and the page scrolls inside the viewport-high visualizer page. Legend swatches are HTML elements styled with `background` / `border` (not SVG `fill`) in the schedule colours. The timings line is the exact sentence in the spec.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm exec vitest run components/visualizer/frame/MechanismApp.test.tsx components/visualizer/frame/VisualizerApp.test.tsx`

Expected: PASS. The eviction tests still find Single and Revision.

### Task 5: Look at it in the browser

- [ ] **Step 1: Open `/visualizer/python-gil/` and `/visualizer/`.**

Confirm the two index groups, the four scenarios, next and previous, the theme from Preferences recoloring the bars, and that `/visualizer/eviction-policies/` is unchanged. Leave the HTML draft in place.
