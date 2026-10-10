# Visualizer compare mode: design

Date: 2026-10-07. Status: superseded by `2026-10-09-visualizer-variants-and-revision-design.md`; compare mode is retired.

## Goal

Let a learner watch 2–3 variants of one concept run at once on the same input, so divergence is visible in the same step. First use: LRU / FIFO / LFU / CLOCK on one request trace.

## What compare is

Compare shows the existing native animations side by side. It is not a merged grid. Each variant keeps its own shape (stack, queue, ranking, ring), its own caption, badge, hit rate and pseudocode. All variants advance on one shared clock and handle the same step their own way.

This supersedes the "common grid" idea in the README and in principle 2 of the cache visualizer spec; those are rewritten (see Docs).

## Decisions

- Only the variant field varies (policy). Cache size, pattern, request count, seed and sequence are shared.
- Layout is auto-fit tiles, not columns. 3 across on wide screens, 2 + 1 on medium, 1 per row on narrow; 2 variants sit side by side.
- Each tile: name, HIT/MISS badge, running hit rate, shape, caption, its own 4 pseudocode lines.
- Footer: one playback bar; the timeline has one lane per variant.
- Focus: one selected tile = the active policy tab in the details panel. It decides whose info tabs and vars table the panel shows.
- Pseudocode sub-steps follow the shared clock; a variant with a shorter path holds its last line while a longer one finishes.
- Out of scope: mobile layout (grid just collapses to one per row), capacity-sweep compare, more than 3 variants.

## Module contract

`VisualizerModule` gains an optional field:

```ts
compare?: { key: string; max: number }
```

`key` names the chips field that becomes multi-select in compare mode (`policy` for eviction, `max: 3`). `run` is unchanged. The frame calls `mod.run({ ...values, [key]: variant })` once per selected variant. Requirement on modules: every variant run returns the same number of frames and the same `sequence` for identical shared inputs. A module test enforces it.

## State and URL

- `variants: string[]` replaces the single value of the compare key in frame state. One entry = single mode; two or more = compare mode. There is no separate mode flag.
- URL: `p=lru` (single) or `p=lru,fifo,lfu` (compare). Existing single-policy links keep working.
- Parsing drops unknown and duplicate values, truncates to `max`, and falls back to the default variant when nothing valid is left.
- Header toggle: Single to Compare keeps the current variant and adds the next unused one in option order. Compare to Single keeps the first variant.
- Chips in compare mode toggle membership. Minimum 2: the last two selected cannot be deselected. At `max`, unselected chips are disabled.
- Seek and frame index (`i`) are shared, so one URL restores the same step for every tile.

## Playback

One `usePlayback` instance. Its frame list is the first variant's frames, with each frame's `path` replaced by the longest path among variants at that index, so the clock waits for the slowest variant. Each tile clamps `sub` to its own `path.length - 1`.

## Components

- `CompareGrid`: CSS grid `repeat(auto-fit, minmax(~340px, 1fr))`, one `CompareTile` per variant.
- `CompareTile`: header (name, badge, hit rate), `Stage` + `Shape`, `StepLines`. Click sets focus; the focused tile gets an accent border.
- `StepLines`: extracted from `StepTab` in `InfoTabs.tsx`, used by both the tile and the Step tab.
- `TimelineStrip`: accepts one or more lanes, each labelled; single mode renders one unlabelled lane as today.
- `InfoPanel`: in compare mode gets a policy tab strip on top (the focus), then the existing Step/Log/About/Try tabs and vars table for the focused policy. A Try experiment patches the shared inputs and restarts all tiles.
- `ChoiceGroup`: gains a multi-select mode for the compare chips.
- `VizHeader`: Compare toggle enabled when the module declares `compare`.
- Rotate: one global toggle applied to every axis shape; hidden when no selected variant has an axis.

## Testing

- Core: URL encode/parse round-trip with a variant list; junk, duplicate and over-limit lists; eviction module returns equal frame counts and the same sequence for every policy.
- Playback: shared clock holds a short-path variant on its last line while a longer one finishes.
- Components: N tiles render; one seek moves every tile; tile click and details tab stay in sync; chips enforce 2 minimum and 3 maximum; header toggle keeps and drops variants as specified; timeline renders one lane per variant.

## Docs to update when built

- `docs/_meta/visualizer/README.md`: compare section, remove the "Common grid" row.
- `docs/superpowers/specs/2026-10-07-cache-visualizer-design.md`: principle 2 and the "coming soon" Compare toggle note.
- `CONVENTIONS.md`: replace "Compare mode uses one common shape" with native shapes in a tile grid.
- `docs/_meta/visualizer/backlog.md`: no change needed unless a topic ships.
