# Visualizer variants and revision view: design

Date: 2026-10-09. Status: awaiting review. Supersedes `2026-10-07-visualizer-compare-mode-design.md`.

## Goal

Two views per visualizer, each with one job. Single is for learning: one variant, a trace, steps and details. Revision is for revising: every variant of the page as a small card with a simple looping animation, so the whole concept can be reviewed at once.

## What changes

- Compare mode is retired: the tile grid, the shared multi-variant clock, the multi-select variant chips, the variant list in the URL, the per-variant timeline marks and the policy tabs in the details panel. The Single/Compare header toggle becomes Single/Revision.
- Single gains variant switching that keeps the current step, plus prev/next variant controls.
- Revision is new. It is independent of the trace and the inputs.
- Kept from the compare work: the review fixes, the console-error fixes, `StepLines` and the `subject` prop. `clockFrames` is removed with compare.

## Module contract

`compare: { key, max }` is replaced by:

```ts
variants?: { key: string }
revision?: RevisionSpec
```

- `variants.key` names the chips field whose options are the variants. Option order is the default order, and it is by increasing difficulty. Eviction: FIFO, LRU, LFU, CLOCK.
- `availability(values, variants)` loses its `variants` argument; it takes `values` only, since only one variant is ever active.
- The equal-frames rule stays: every variant returns the same frame count and the same sequence for identical shared inputs, because switching variant keeps the step. The module test that enforces it stays.

## Single view

- Switching variant (chip click, prev/next, Shift+←/→) keeps the current frame and play state, and sets the sub-step the way a seek does: the first line while playing, the end of the path while paused. Changing a shared input (size, pattern, length, seed, sequence) still restarts the run.
- Prev/next buttons sit beside the variant chips. Shift+← and Shift+→ do the same. Both wrap around. They are ignored while typing in an input and when Ctrl, Meta or Alt is held. Plain ←/→ keep stepping through requests.
- Order is the chip order, which is the module's default order. It does not follow the Revision card order.
- The URL stays `p=lru` (one variant) and `i=<step>`. A `view=revision` param records the view.

## Revision view

- Layout: both side panels and the playback bar are hidden. The footer shows the legend on the left, a loop play/pause button on the right, and a Reset order link.
- Grid: the main area scrolls and the footer stays fixed. Card width is at least 250px. The maximum columns come from the grid's measured inner width (excluding the scrollbar): 4 from about 1090px, 3 from about 810px, 2 from about 540px, 1 below that.
- Rows rule: `rows = ceil(n / maxCols)`, `cols = ceil(n / rows)`, tiles spread as evenly as possible with longer rows first, all cards the same width, short rows centred. This is one pure function, `layoutRows(n, maxCols): number[]` returning the row sizes. Examples at 4 columns: 5 is 3+2, 6 is 3+3, 7 is 4+3, 9 is 3+3+3. At 2 columns an odd count ends in one centred card.
- Card: grip handle, name, an "i" button, and the animation. Nothing else, and the card itself is not clickable.
- Reorder: drag the grip with the mouse, or use the keyboard (focus the grip, Space picks up, ←/→ move, Space drops, Esc cancels). Touch dragging is out of scope. The order is saved per visualizer in localStorage under one key, a map of slug to variant ids, and is never in the URL. On load, unknown ids are dropped and new variants are appended in default order. Reset order clears the saved order.
- "i" popup: uses the shared `Modal`. Content: the definition (the glossary entry named by the variant's `glossaryTerm` if there is one, otherwise the module's `summary` line), how this variant differs from the others (`differs`), and at the end an Open in Single button, the only way into Single from Revision. It opens that variant at the first step, playing per the user's default.
- Glossary lookup happens on the server page, which passes the needed entries to the client component, because the glossary file is read from disk at build time.

## Revision animation

- One shared loop clock drives every card. A cycle plays each card's steps in order, holds the finished state, resets briefly, then restarts. Starting values: 900ms per step, 2000ms hold, 600ms reset. A cycle lasts as long as the card with the most steps, and shorter cards hold their finished state until the next loop.
- Loop is on by default. Space toggles it, as in Single. Under reduced motion every card shows its finished state, nothing moves, and the toggle is hidden.
- Each card supplies `steps` and `render(step)`. A visual is either an existing shape model or a flow diagram.
- Flow diagram (new, generic, no domain words): nodes with a kind and label, and edges with a step number, a line style and an optional label. Edges up to the current step are lit and the current one pulses. Node kinds have distinct silhouettes (app, cache, database as a cylinder), not plain boxes, and are inline SVG in the visualizer UI folder, not the Tabler sprite.
- Line styles are fixed everywhere: solid is a synchronous step on the request path, dashed is asynchronous or background work, dotted is conditional or fallback (such as the miss path). Meaning never relies on style alone: every edge also carries its step number, and each card has a screen-reader list of its steps.
- Eviction cards reuse the existing shapes. Each policy runs the real simulator over a fixed mini-trace, `A B C A D` at capacity 3, chosen so the policies visibly evict different keys. The loop plays its five frames.
- Caching strategies use flow diagrams, one per strategy (six). The flows are drafted from the existing strategy definitions and the caching article, then reviewed by the user before they ship.

## State and structure

- `VisualizerBody` becomes a thin switch over `SingleView` and `RevisionView`. Single is today's single-variant path unchanged except for variant switching. Revision owns the loop clock, order and popup state.
- New pure code in `lib/visualizer/core/`: `layoutRows`, a loop-phase function (time to step, hold or reset), and the order-reconciliation helper. New storage helpers join `lib/storage/visualizer-prefs.ts`.
- Compare code removed: `CompareGrid`, `CompareTile`, `VariantTabs`, `MultiChoiceGroup`, the header toggle's compare wiring, `compare.ts` and its tests, `compare.css`, the variants parts of `url-state`, `useUrlSync` and `TimelineStrip`, and the `variants` argument of `availability`.

## Testing

- Pure functions: `layoutRows` for 1 to 9 cards at 1 to 4 columns, the loop phases including a card that finishes early, order reconciliation.
- Single: switching variant keeps the frame and play state, and an input change restarts; prev/next wrap; Shift+←/→ work and are ignored in inputs and with modifiers; every variant returns equal frame counts.
- Revision: all variants render, in saved order; reorder by drag and by keyboard persists to localStorage and survives reload; Reset order restores the default; the "i" popup shows the definition, the difference text and a working Open in Single button; Space and the toggle pause the loop; reduced motion shows the finished state.
- Flow diagram: renders nodes, edges lit by step, the three line styles, and the step list text.

## Docs to update when built

- `docs/_meta/visualizer/README.md`: replace the compare section with Revision and variants, update the shape table and roadmap.
- `docs/superpowers/specs/2026-10-07-caching-strategies-visualizer-design.md`: the compare-compatibility section and the `availability(values, variants)` signature.
- `docs/superpowers/specs/2026-10-07-cache-visualizer-design.md` and `CONVENTIONS.md` line 106: replace the compare statements.
- `CLAUDE.md` file map rows for the visualizer folders, once the new components exist.

## Out of scope

- Touch drag, the mobile layout, a hit-rate scoreboard, and any trace-driven all-variants view.
