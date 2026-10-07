# Algorithm Visualizer — Design

> **Status 2026-10-07:** superseded by [2026-10-07-cache-visualizer-design.md](./2026-10-07-cache-visualizer-design.md). Never built; kept as reference for future DSA visualizers.

## Purpose

Interactive visualizer for DSA algorithms. User enters input values, runs the real algorithm, and watches it execute step by step — array bars, graph nodes, tree, or DP grid depending on algo type — with a debugger-style panel showing current variable values.

Lives as its own top-level route, not embedded in article markdown. Articles link out to it.

## Non-goals

- Not replacing `structure-viz.js` (static inline data-structure diagrams stay as-is).
- No visual graph/tree editor (drag-and-drop node placement) — text/array input only.
- No call-stack view for recursion — scalar vars only, current frame.
- No new-tab or modal presentation — same-tab dedicated route.

## Routing & shell

- Top-level route family, sibling to `dashboard`/`admin`/`changelog` in `js/render/router.js`'s `_execRoute`:
  - `#visualizer` → landing page, grouped grid of all algos
  - `#visualizer/<algo-slug>` → single algo detail page
- New `js/render/visualizer-view.js`: `renderVisualizerIndex()`, `renderVisualizerDetail(slug)`.
- New `VIEW_DEPTH` entries: `view-visualizer-index: 1`, `view-visualizer-detail: 2` (matches existing depth-based transition direction logic).
- DSA articles get a "Visualize" link on relevant algo pages → `navigate('visualizer/<slug>')`. Plain in-app navigation, no modal, no new tab.

## Algo registry & data shape

Each algo is a plain object in its own module under `js/visualizer/algos/`, aggregated into a registry by `js/visualizer/registry.js`, grouped by `vizType` for the landing page.

```js
{
  id: "bubble-sort",
  title: "Bubble Sort",
  vizType: "array",              // "array" | "graph" | "tree" | "dp-grid" — selects renderer
  params: [
    { name: "nums", type: "array<number>", default: [5, 3, 8, 1, 4] },
  ],
  presets: [
    { label: "Random", values: { nums: [9, 2, 7, 4, 1] } },
    { label: "Worst case (reversed)", values: { nums: [9, 8, 7, 6, 5] } },
  ],
  run(params, record) {
    const nums = [...params.nums];
    for (let i = 0; i < nums.length; i++) {
      for (let j = 0; j < nums.length - i - 1; j++) {
        record({ array: [...nums], highlights: { compare: [j, j + 1] }, vars: { i, j } });
        if (nums[j] > nums[j + 1]) {
          [nums[j], nums[j + 1]] = [nums[j + 1], nums[j]];
          record({ array: [...nums], highlights: { swap: [j, j + 1] }, vars: { i, j } });
        }
      }
    }
    return nums;
  },
}
```

- `run()` executes eagerly against the real algorithm and calls `record(snapshot)` at each meaningful step. Not a generator — runs once, produces a full `states[]` array up front. Playback is index lookups into that array (fine at teaching-scale input sizes).
- Snapshot shape is per-`vizType`:
  - `array` → `{ array, highlights, vars }`
  - `graph` → `{ nodes, edges, highlights, vars }`
  - `tree` → `{ tree, highlights, vars }`
  - `dp-grid` → `{ grid, highlights, vars }`
- `highlights` keys are renderer-specific (e.g. array supports `compare`/`swap`; graph supports `visited`/`current`/`path`) — algo authors use whatever keys their chosen renderer understands.
- If `run()` throws, the error is caught, an `{ error: message }` snapshot is appended, and everything recorded before the throw still plays back normally. Playback stops there.

## Input form generation

Detail view reads `algo.params` and renders one labeled input per param, by `type`:

| type | widget |
|---|---|
| `number` | number input |
| `array<number>` | text field, comma-separated, parsed on change |
| `string` | text field |
| `graph` | textarea, edge-list syntax: `A-B` per line/comma, optional weight `A-B:4` |
| `tree` | text field, level-order array (reuses `structure-viz.js` parsing conventions) |

- Validation runs on change/submit and shows an inline warning under the field on bad input — **Run stays enabled regardless**. Actual failure (parse error or algo throw) surfaces at runtime as an error snapshot in the vars panel, not as a blocking upfront error.
- Preset buttons (from `algo.presets`) sit above the form; clicking one fills the fields with that preset's values.

## Landing page

`#visualizer`: cards grouped under four headings — Array, Graph, Tree, DP Grid — built by grouping the registry on `vizType`. Each card navigates to `visualizer/<id>`.

## Playback controls

One shared component (`js/visualizer/playback.js`), reused across all four vizTypes:

- Prev / next step buttons
- Play / pause with speed selector (0.5x / 1x / 2x / 4x)
- Scrub slider bound to snapshot index
- Step counter (`Step 12 / 47`)

All controls funnel through one "set current index" function, so prev/next/scrub/autoplay-tick are a single code path.

## Debugger / vars panel

Fixed side panel next to the visualization canvas. Renders the current snapshot's `vars` as `name → value` rows. Updates on every index change. Shows the `error` message (if present) instead of/alongside vars when the current snapshot is an error snapshot.

## Renderers (one per `vizType`)

Array and tree draw to SVG (consistent with `structure-viz.js` precedent); graph draws to canvas (reusing the existing canvas-based sim engine); dp-grid is an HTML/CSS grid.

- **array** — bar chart; bar height = value; indices in `highlights` colored by highlight key (e.g. compare vs. swap get distinct colors).
- **graph** — reuses `js/app/graph-engine.js`'s `createGraphSim(canvas, nodes, edges, { colorForNode })` (the same canvas-based force sim already shared by `link-graph.js`/`section-map.js`/`index-graph.js`). `colorForNode` is driven by the current snapshot's `highlights` (visited/current/path), re-evaluated on every step change — the sim itself doesn't need modification, only a coloring function keyed on playback state.
- **tree** — `structure-viz.js` currently only exports `renderStructureViz` (the whole ` ```viz ` block handler); its level-order position math (`posOf`, the depth/width/height layout in `_renderTree`) is private. This task extracts that math into an exported pure function (e.g. `layoutTreePositions(data)`) from `structure-viz.js` so both it and the new tree renderer share one source of truth, rather than duplicating the layout logic.
- **dp-grid** — CSS grid table; cell background colored by highlight key (computed/current/base-case); computed value shown in cell text.

Renderer selection is a straight switch on `algo.vizType` — playback bar and vars panel are identical regardless of which renderer is active.

## Error handling summary

- Bad input: inline warning, non-blocking.
- Runtime throw during `run()`: caught, shown as an error snapshot at the point of failure, prior steps still playable.

## Testing

Per `CONVENTIONS.md`: end-to-end only, through the UI, via Playwright + pytest — no direct JS unit tests. New file `tests/e2e/test_visualizer.py` (feature has no existing home). Cover: landing page renders grouped cards; navigating to an algo renders its input form; running with default params advances through steps (bar/node/cell highlight changes observable in DOM); prev/next/scrub controls move the step counter; invalid input shows the inline warning but Run still works; a deliberately bad input that makes the algo throw surfaces the error in the vars panel without crashing playback of prior steps.

## Open scope (deliberately unbounded at design time)

- Exact list of algos per vizType is a content/authoring decision, not an architecture decision — the framework is generic over any algo conforming to the registry shape above. Algos get added incrementally.
- DP grid input params vary per algo (edit distance = two strings; knapsack = weights + values + capacity) — each algo's own `params` array declares what it needs; there is no single fixed DP input shape.
