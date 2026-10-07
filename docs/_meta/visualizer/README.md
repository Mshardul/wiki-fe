# Visualizer

| Created |
|---|
| 2026-10-07 |

The **Visualizer** section of the wiki: interactive, animated explanations of DSA and system-design concepts. This file is the durable reference — purpose, principles, shared page anatomy, architecture and rules. Read it before building or changing any visualizer.

Design spec for the shared frame and the first visualizer: [`../../superpowers/specs/2026-10-07-cache-visualizer-design.md`](../../superpowers/specs/2026-10-07-cache-visualizer-design.md).

---

## Purpose

- **Another layer of learning, for depth.** Articles explain; visualizers let a student *watch* a concept run, then *drive* it.
- **Audience:** the author plus a small known circle (friends, colleagues) — the same people as the rest of the wiki. Pages must make sense without the author present.
- **Part of the wiki app**, not a separate tool: same theme, same chrome, works offline after one visit, nothing stored on the backend.

## Long-term goal

A growing set of visualizers across DSA and HLD. Every visualizer page is built from **the same frame and the same reusable parts**, so adding one means writing its logic, not rebuilding UI. Design every piece with that reuse in mind; extract further only when a real second caller needs it.

## Roadmap (not built yet)

- **Compare mode** — up to 3 variants side by side on a common grid.
- **Mobile layout** for single and compare (until then the page only guarantees no breakage at 320px).
- **OPT and ARC** eviction — shapes not designed yet (OPT: next-use countdown; ARC: composite of 2 stacks + 2 ghost stacks + moving divider).
- **Caching strategies** visualizer (cache-aside, read-through, write-through, write-behind, write-around, refresh-ahead, stale-read race, crash cache) — lanes shape; refresh-ahead/TTL need expiry bars.
- **"▶ Visualize" links** from articles into visualizers.
- **DSA visualizers** — prior thinking in [`../../superpowers/specs/2026-09-22-algo-visualizer-design.md`](../../superpowers/specs/2026-09-22-algo-visualizer-design.md) (superseded, never built).

Remove an item when it ships.

---

## Design principles

1. **Shape follows structure.** Draw the concept in the shape of its real data structure — a vertical stack for LRU, a horizontal queue for FIFO, a ranked list for LFU, a ring for CLOCK, time lanes for strategies. *Why:* the shape teaches before any text does, and a wrong shape misleads.
2. **Native view for depth, common view for comparison.** Single view uses each item's own shape; compare mode uses one shared shape so differences line up.
3. **Watch by default, drive when wanted.** Autoplay on load; full controls always available. No quizzes or "predict the next step".
4. **Plain-English steps are the explanation.** The algorithm's loop body as 2–4 short plain-English lines, current line highlighted as it plays — never source code. The stage keeps only a one-line caption.
5. **Show the variables, now vs before.** A table of the loop's variables for the current step, previous values faded beside them, changes marked. *Why:* turns watching boxes into tracing an algorithm.
6. **Minimal information.** Every visible element must earn its place. No duplicated numbers, prose blocks or decorative panels.
7. **Abstract time.** Time-based visualizers use ticks, not milliseconds; playback speed is separate from simulated time.
8. **Reproducible and shareable.** Runs are deterministic from their inputs and a seed; the URL holds the whole setup and the current step.
9. **Theme-linked, never hard-coded.** Colours are `--viz-*` aliases of existing wiki tokens, so theme presets flow through automatically.
10. **Nothing on the backend.** State lives in the URL or per-viewer localStorage (panel collapse only).

## Shape library

Shapes are generic components fed a shape model; they never know which visualizer drives them.

| Shape | Looks like | Used for | Reuse candidates |
|---|---|---|---|
| **Linear** | stack (vertical) or queue (horizontal); open entry end, dashed exit end | LRU, FIFO, write-behind buffer | DFS, call stack, undo, BFS, message queue, rate limiter |
| **Ranking** | numbered rows by count, a hit glows then climbs, bottom row flagged; no axis | LFU | top-K, leaderboards, rate limiter |
| **Histogram** | bars by count, lowest flagged (built, unused so far) | — | frequency counting, distributions |
| **Ring** | slots on a circle with a hand | CLOCK | circular buffer, consistent hashing |
| **Lanes** (planned) | actor lanes (App / Cache / DB), time flows along the lane | caching strategies, TTL | TCP handshake, consensus rounds |
| **Composite** (planned) | several shapes in one stage | ARC | LSM tree, multi-level caches |
| **Common grid** (planned) | one row per variant, one column per key, lit = present | compare mode for any shape | — |

**Rotate:** shapes with an axis (linear, histogram) get an icon-only Rotate toggle in the playback footer that swaps the axis and keeps text upright — never a literal 90° CSS rotation. Its label names the default view while rotated. Shapes without an axis (ring) hide the button.

---

## Page anatomy (shared by every visualizer)

```
┌ wiki topbar ──────────────────────────────────────────────────────────────┐
├ header: title · subtitle               [Single|Compare] [Read article] [Copy link]
├───────────────┬──────────────────────────────────────┬────────────────────┤
│ LEFT «        │ STAGE                       metric   │ » RIGHT             │
│ chips (what)  │                                      │ name · shape chip   │
│ ───────────   │            [ shape ]                 │ one-line rule       │
│ inputs        │                                      │ ──────────────────  │
│ ───────────   │      one-line caption                │ Step│Log│About│Try  │
│ seed  ↻       ├──────────────────────────────────────┤ tab body            │
│               │ count     ⏮ ‹ ▶ › ⏭    ⟳ 🔁 0.5× 1× 2× │                     │
│               ├──────────────────────────────────────┤                     │
│               │   [·][·][·] [current] [·][·][·]      │                     │
└───────────────┴──────────────────────────────────────┴────────────────────┘
```

- **Left panel — configure.** Only choice chips and inputs, in groups: *what to show* → *inputs* → *seed*. No playback controls. Collapses to an icon rail.
- **Stage.** The shape fills it. A large metric in a corner, one-line caption at the bottom.
- **Footer row 1 — playback.** Counter left, controls centred; right group: Rotate (icon-only, axis shapes only), Repeat (icon-only, cycles off → once → forever; per-viewer, not in the URL), speed.
- **Footer row 2 — timeline strip.** One cell per step, coloured by outcome once played, accent for the current one; click to jump. The current cell is always centred. Longer runs scroll with faded edges; follow mode keeps the current step centred, pauses on manual scroll and resumes after ~2 s idle.
- **Right panel — inside the step.** Fixed top: name, shape chip, one-line rule. Tabs: **Step** (loop body + variables now/before), **Log** (every step so far, click to jump), **About** (cost, wins, loses, seen in), **Try** (guided experiments). Static tabs must not re-render per tick. Collapses to an icon rail; starts collapsed below 1200px.

Wording that differs per visualizer ("request", "Policy", "Hit rate") comes from the module, never from the frame.

## Playback & interaction rules

- Every control (buttons, keyboard, strip, log, autoplay) goes through one seek path.
- Autoplay stops at the last step; any input change restarts from step 1.
- `prefers-reduced-motion`: no autoplay, no transitions.
- The URL is rewritten on every input/step change; junk URLs fall back to defaults, never throw.

---

## Architecture

A visualizer is a **module** — pure data plus a `run` function. The page is one generic app that renders any module.

```ts
interface VisualizerModule {
  slug: string; title: string; subtitle: string;
  unit: string;                         // "request", "step", …
  sections: FieldSection[];             // drives BOTH the left panel and the URL
  defaults(): InputValues;              // fresh random seed each call
  run(values: InputValues): RunResult;  // eager: the whole run as frames
}
// Each frame carries everything the UI shows.
interface VizFrame {
  index; label; outcome: "good" | "bad"; badge;   // strip + log
  caption: Rich; lines: Rich[]; path: number[];   // stage caption + Step tab
  vars: VarRow[]; logNote: Rich; metric: string;  // variables, log, corner metric
  model: ShapeModel;                              // what the shape draws
}
```

| Layer | Where | Knows about a specific visualizer? |
|---|---|---|
| Core contracts (frames, field schema, URL codec, playback math, shape models, geometry, rich text, seeded RNG) | `lib/visualizer/core/` | no |
| A visualizer's logic (state machines, trace generator, copy) | `lib/visualizer/<name>/` | yes — only here |
| Registry (server-safe list) and slug → module map | `lib/visualizer/registry.ts`, `modules.ts` | lists them |
| UI primitives, hooks, shapes, frame components | `components/visualizer/{ui,hooks,shapes,frame}/` | no |
| Routes | `app/visualizer/page.tsx`, `app/visualizer/[slug]/page.tsx` | no |
| Styles | `css/view-visualizer/*.css` + `--viz-*` aliases in `tokens.css` | no |

### Adding a visualizer

1. Pick the shape(s) by **shape follows structure**; reuse an existing shape if the structure matches. A genuinely new structure gets a new generic shape (model type in `core/shapes.ts` + component in `components/visualizer/shapes/`).
2. Write the module in `lib/visualizer/<name>/`: field sections, defaults, `run` producing `VizFrame[]`.
3. Register it in `registry.ts` and `modules.ts`; the route, landing card and home count follow.
4. Tests first (see Rules), then mock the page in the browser before polishing.
5. Remove its item from the roadmap above.

---

## Rules

- **Generic stays generic.** No visualizer-specific code or copy under `components/visualizer/` or `lib/visualizer/core/`. If the frame needs a new word or knob, add it to the module contract.
- **Frames are pure and deterministic.** `run` has no side effects; the same inputs + seed always give the same frames.
- **Tests:** Vitest fixture-first for everything in `lib/visualizer/**`, against hand-checked expected frames. Component tests for every frame component and hook. Browser e2e only for what needs a real browser (`tests/e2e/test_visualizer.py`).
- **CSS:** tokens only (`--viz-*` aliases for roles); `viz-*` classes; breakpoints only in `css/responsive.css`; must not break at 320px.
- **Article links:** "Read article" deep-links to the matching article section; a content test asserts every target anchor exists so a heading rename fails loudly.

## How UI decisions are made

- Layout and visual choices are decided **from browser mockups**, not described options.
- Offer **genuinely different** options — different learner points of view, not variations of one layout — and keep each mockup light on text.
- Think from the **student's** point of view: what makes the concept clear and deep without overloading.
- Use real data in mockups, and make every mockup follow the real theme presets.
