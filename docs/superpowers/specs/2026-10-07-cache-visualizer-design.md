# Visualizer — Eviction Policies (v1) — Design

Section-wide principles and rules live in `docs/_meta/visualizer/README.md`; this spec is the v1 detail.

Supersedes `2026-09-22-algo-visualizer-design.md` (vanilla-JS era, never built). Its core ideas carry over — eager run into a frame array, one "set index" code path, a variables panel — re-targeted to `app/` + `components/` + `lib/` and generalised beyond DSA.

## Purpose

A new **Visualizer** section of the wiki: interactive, animated explanations of concepts across DSA and HLD, built for in-depth learning (watch by default, drive when wanted). It starts with caching. This spec covers the shared frame every visualizer reuses plus the first visualizer, **Eviction policies**.

Audience: the author plus a small circle of known users (friends, colleagues). Inherits the wiki theme; works offline like the rest of the site.

## Scope

**In v1**
- `/visualizer/` landing page and `/visualizer/eviction-policies/`.
- Shared visualizer frame (layout, config panel, stage, playback, request strip, info panel).
- Policies: **LRU, FIFO, LFU, CLOCK**, each drawn in its own shape.
- Shapes: **linear** (stack / queue), **ranking**, **ring**; **histogram** is built and tested but unused by v1.
- Shareable URL state + Copy link.
- Home-page card linking to the Visualizer section.

**Later (separate specs, in this order)**
1. Variants and Revision view (specified in 2026-10-09-visualizer-variants-and-revision-design.md).
2. Mobile layout for Single and Revision views. v1 only guarantees a working, non-broken page down to 320px.
3. OPT and ARC (shapes not yet designed — OPT next-use countdown, ARC composite stacks).
4. Caching strategies visualizer (lanes shape: cache-aside, read-through, write-through, write-behind, write-around, refresh-ahead, stale-read race, crash cache).

**Non-goals**
- No backend / sync — nothing goes to wiki-be.
- No predict-the-answer quizzes.
- No embedding inside article markdown (articles link out).
- No new runtime dependencies (no animation or chart library).

## Routes & navigation

| Route | Page |
|---|---|
| `/visualizer/` | Landing: one card per built visualizer (icon, title, one-line description), same card styling as the home vertical cards. |
| `/visualizer/[slug]/` | Visualizer page; `generateStaticParams` from the visualizer registry. v1 emits `eviction-policies`. |

- Static segment `visualizer` sits beside `[vertical]`; Next resolves the static segment first.
- Home page: a **Visualizer** card after the vertical cards, from the visualizer registry (not `verticalRegistry` — visualizers are not markdown verticals and have no article count).
- Topbar: reuse `IndexTopbar` (back to Home, breadcrumb, search, preferences, auth).
- Service worker: add `/visualizer/` to the runtime-cached navigation matcher so the page works offline after one visit.

## Page layout (desktop)

```
┌ wiki topbar ───────────────────────────────────────────────────────────┐
├ header: title · one-line subtitle        [Single|Revision] [Read article] [Copy link]
├──────────────┬──────────────────────────────────────┬──────────────────┤
│ CONFIGURE «  │ stage                       hit rate │ » POLICY          │
│ policy chips │                                      │ name · shape chip │
│ ──────────   │          [ shape ]                   │ one-line rule     │
│ INPUT        │                                      │ ───────────────── │
│ cache size   │      caption (one line)   [Rotate]   │ Step│Log│About│Try│
│ pattern      ├──────────────────────────────────────┤ tab body          │
│ requests     │ req 8/12   ⏮ ‹ ▶ › ⏭      0.5× 1× 2× │                   │
│ sequence     ├──────────────────────────────────────┤                   │
│ ──────────   │   [B][A][G] [F] [B][A][G]  (strip)   │                   │
│ seed  ↻      │                                      │                   │
└──────────────┴──────────────────────────────────────┴──────────────────┘
```

- **Revision** is specified in 2026-10-09-visualizer-variants-and-revision-design.md; the header toggle is shown when the module declares revision cards.
- Both side panels collapse to 48px icon rails (`«` / `»`); the stage grows. Collapsed state persists per viewer (localStorage, see Persistence). Below 1200px the right panel starts collapsed.

### Left panel — Configure
Three groups separated by horizontal dividers:
1. **Policy** — chips for every built policy (v1: LRU, FIFO, LFU, CLOCK). Unbuilt policies are not shown.
2. **Input**
   - Cache size: slider 2–8 (default 4).
   - Access pattern: chips Hot set / Scan / Loop / Uniform (default Hot set).
   - Requests: slider 6–24 (default 12).
   - Sequence: editable text field showing the generated keys; typing A–Z keys + Enter replaces the run with a custom sequence (max 40 keys, other characters stripped). Changing pattern/requests/seed discards a custom sequence.
3. **Seed** — current seed (hex) + "↻ New random run".

No speed control here (it lives in playback). No reset button.

### Stage (centre)
- Shape fills the stage, sized from the stage's measured size (ResizeObserver), so it adapts when panels collapse.
- Hit rate (large) top-right. One-line caption bottom-centre (e.g. "F miss — added · C out"); `aria-live="polite"`.
- **Rotate** button bottom-right: label is **Rotate** in the default orientation and **Default** when rotated (tooltip names the default, e.g. "Back to the default stack view"). Rotation swaps the shape's axis; text stays upright. Hidden for shapes without an axis (ring). Persists across policy changes and in the URL.

### Footer (two rows)
- **Row 1 — playback:** request counter (left) · ⏮ ‹ ▶/❚❚ › ⏭ centred · speed 0.5× / 1× / 2× (right).
- **Row 2 — request strip:** one fixed-width cell per request, coloured green (hit) / red (miss) once played, accent for the current request. Clicking a cell jumps there.
  - The current cell is **always centred**, including at request 1 and for short runs — the strip never re-centres based on item count.
  - Visible width capped (15 cells desktop, 11 ≤1024px, 7 ≤640px — existing `responsive.css` breakpoints); overflow scrolls horizontally with faded edges.
  - **Follow mode (synced-lyrics behaviour):** the strip auto-scrolls to keep the current request centred. Wheel / touch / drag on the strip pauses following; playback continues and cells keep updating. After 2 s with no strip interaction it glides back to the current request (also when paused). Clicking a cell re-centres immediately.

### Right panel — Policy info
- **Top (fixed):** policy name, shape chip, one-line rule.
- **Tabs:**
  - **Step** — "Each request runs": the policy's loop body as 2–4 plain-English lines; the current line is highlighted as sub-steps play, lines already run this request are normal, the untaken branch is struck through; the eviction line names the victim. Below: **Variables** table — `name | now | before` (before = previous request, faded); values that changed get the accent + dot. Common rows: request #, key, in cache?, removed, cache, hits, misses, hit rate; policies add their own (LFU: count of key, min count; CLOCK: hand, bits).
  - **Log** — every request so far (`#`, key, HIT/MISS, removed); current row highlighted; click jumps; keeps its scroll position on update.
  - **About** — cost, wins, loses, seen in.
  - **Try** — 2–3 guided experiments per policy (title, one line, **Run ▶** which sets the inputs, restarts and plays).
- Only the Step and Log tabs re-render per tick; About/Try/top render on policy change only (so expanded content never collapses mid-read).

## Shapes

Each policy maps to one shape. Shapes are generic components fed a shape model; they never know which policy drives them.

| Policy | Shape | Model | Default axis | Labels (entry / exit) |
|---|---|---|---|---|
| LRU | linear | ordered keys, newest first; `next` = victim-if-miss | vertical | newest / next out |
| FIFO | linear | ordered keys, newest first; hits don't reorder | horizontal | in / out |
| LFU | ranking | rows ranked by use count, ties by recency; last row = `next` | — | next out |
| CLOCK | ring | slots with ref bit; hand index; bits cleared this step | — | — |

- **Linear** — container open at the entry end, dashed exit edge at the other; blocks animate between positions; new block enters from the entry side, evicted block leaves through the exit and fades. `next` block dashed in the evict colour.
- **Ranking** — numbered rows, one per key: key, count meter, count. A step glows the requested key, updates its count (+1 on a hit), holds, then slides rows into their new ranks and fades the glow. "NEXT OUT" flags the bottom row (lowest count, tie → least recently used); a victim fades out at the bottom before the reorder. No axis, so no Rotate.
- **Histogram** — bars by count with the count on each bar; available for later visualizers, not used by v1.
- **Ring** — slots on a circle, each with a ref-bit dot (1 filled / 0 hollow); hand rotates (cumulative angle so it never spins backwards when playing forward); slots whose bit was cleared this step get a dashed evict outline.
- State colours: new = accent, hit = success, next-out / evicted = warning, miss = error.

## Engine (lib)

Pure, deterministic, framework-free TypeScript.

```ts
// Each policy is a pure state machine over keys.
interface PolicyDef<S> {
  id: "lru" | "fifo" | "lfu" | "clock";
  name: string;
  shape: "linear" | "histogram" | "ranking" | "ring";
  defaultAxis: "vertical" | "horizontal" | null;
  labels: { entry: string; exit: string };
  rule: string;                        // one-line rule
  lines: [string, string, string, string]; // check · hit branch · miss/evict branch · insert
  about: { cost: string; wins: string; loses: string; seenIn: string };
  tries: { title: string; blurb: string; input: Partial<EvictionInput> }[];
  init(capacity: number): S;
  step(state: S, key: string, t: number): StepResult<S>;
  view(state: S): ShapeModel;          // what the shape draws
  extraVars?(state: S, key: string): Record<string, string>;
}
interface StepResult<S> { state: S; hit: boolean; evicted: string | null; path: number[] }
interface Frame {
  index: number; key: string; hit: boolean; evicted: string | null;
  path: number[];                      // line indices run, in order (hit [0,1]; miss [0,2,3])
  model: ShapeModel; vars: VarRow[];   // vars carry now values; "before" = previous frame's
}
```

- `simulate(policy, input): Frame[]` runs the whole sequence eagerly (≤40 requests — trivial cost). Playback is index lookups.
- `generateTrace(input): string[]` — seeded PRNG (mulberry32) so a seed always reproduces the same run. Patterns: **hot set** (~60% of requests to 2 hot keys), **scan** (hot keys, a sweep of one-off keys, hot keys again), **loop** (cycle over capacity + 1 keys), **uniform** (8 keys).
- `EvictionInput = { policy, capacity, pattern, length, seed, sequence | null }`.
- First load with no URL state: random seed, default inputs, autoplay.

## Playback

- State: `{ frame, sub, playing, speed }`; every control (buttons, keys, strip click, log click, autoplay tick) goes through one `seek(frame, sub = 0)`.
- One request lasts 2600 ms at 1×, split evenly across its path lines (sub-steps). The shape moves at the start of the request; the Step tab advances line by line.
- Autoplay starts on load and stops at the last request (▶ then restarts from the first).
- Keyboard (ignored while typing in an input): **Space** play/pause, **←/→** previous/next request.
- `prefers-reduced-motion`: no autoplay; shape transitions become instant.

## URL state & Copy link

- Query string mirrors the run: `?p=lru&c=4&pat=hot&n=12&s=7f3a&i=8&rot=1`, plus `q=ABCA…` only for a custom sequence.
- Written with `history.replaceState` (debounced) on input/step change; parsed and clamped on load (invalid values fall back to defaults, never throw).
- **Copy link** copies the current URL via `lib/clipboard.ts` and confirms with a toast.

## Persistence

- Panel collapse state only: `lib/storage/visualizer-prefs.ts`, key `wiki-visualizer-panels` (`{ left: boolean, right: boolean }`). Everything else lives in the URL.

## Theming

- No new colours. A small alias layer in `css/tokens.css` maps visualizer roles to existing tokens (`--viz-hit → --color-success`, `--viz-miss → --color-error`, `--viz-evict → --color-warning`, `--viz-active → --accent`, `--viz-slot-bg → --surface-2`, `--viz-slot-border → --border-2`, tinted backgrounds via `color-mix`). Theme presets and future token redesigns flow through automatically.

## Code layout — modular by design

Every visualizer page is the same generic app driven by one **module** (pure data + a `run` function). Adding a visualizer = writing a module under `lib/visualizer/<name>/` (+ a new shape if its structure needs one). Nothing in `components/visualizer/` knows about caches.

```
lib/visualizer/core/                         generic, pure, framework-free
  types.ts        VizFrame, VarRow, InfoContent, Experiment, RunResult, VisualizerModule
  fields.ts       FieldSpec/FieldSection schema (chips · slider · sequence · seed), applyChange, parseSequence
  url-state.ts    schema-driven encode / parse+clamp (+ frame index, rotation)
  playback.ts     timing math (frame duration, sub-step, speeds)
  rich.ts         Rich text (tone-tagged parts) + {placeholder} fill
  rng.ts          seeded PRNG, seed format
  shapes.ts       ShapeModel types (linear · histogram · ranking · ring), axis resolution
  geometry.ts     linear-shape layout math
lib/visualizer/eviction/                     the eviction module
  types.ts · trace.ts · simulate.ts · module.ts · policies/{lru,fifo,lfu,clock}.ts
lib/visualizer/registry.ts                   built visualizers (slug, title, description, icon) — server-safe
lib/visualizer/modules.ts                    slug → VisualizerModule
lib/storage/visualizer-prefs.ts              panel collapse state

components/visualizer/ui/                    generic primitives: ChoiceGroup (chips/segmented), IconButton, Tabs, RichText, VarsTable
components/visualizer/hooks/                 usePlayback, useFollowScroll, useVizHotkeys, useUrlSync, usePanelPrefs, useElementSize
components/visualizer/shapes/                Shape (dispatcher), LinearShape, HistogramShape, RankingShape, RingShape
components/visualizer/frame/                 VisualizerApp (root), VizHeader, SidePanel, ConfigPanel + ConfigFields,
                                             Stage (+ rotate), PlaybackBar, TimelineStrip, InfoPanel + InfoTabs
app/visualizer/page.tsx · app/visualizer/[slug]/page.tsx
css/view-visualizer/{ui,layout,panels,stage,playback}.css
```

The module declares its config fields once; the same schema renders the left panel and encodes/decodes the URL. Frames carry everything the UI shows (strip label + outcome, caption, step lines + path, variables, log note, metric, shape model), so the frame components stay visualizer-agnostic. Wording that differs per visualizer ("request", "Policy", "Hit rate") comes from the module.

## Error handling

- Sequence field: invalid characters stripped; empty after stripping → keep the previous run, inline hint under the field.
- URL params out of range or unknown → clamped / defaulted silently.
- Unknown `[slug]` cannot occur (static params); landing lists only registry entries.

## Testing

- **Vitest, fixture-first** for all `lib/visualizer/**`: each policy against a fixed trace with hand-checked frames (hits, evictions, order, path, CLOCK hand/bits, LFU counts + tie-break); `generateTrace` determinism per seed and per pattern; `url-state` round-trip + clamping; `visualizer-prefs` storage.
- **Vitest component tests**: RequestStrip follow mode (fake timers: centres current, pauses on wheel, returns after 2 s, click re-centres); InfoPanel (Step highlights the current line, About/Try don't re-render on tick); PlaybackBar (seek path, keyboard); ConfigPanel (sequence edit, pattern change discards custom sequence); Stage rotate label.
- **E2e** (`tests/e2e/test_visualizer.py`, new — feature has no existing home): landing → page navigation; autoplay advances the strip; strip click jumps; panels collapse and the stage widens; a copied URL restores the same run and step.

## Read article targets

"Read article" deep-links to the current policy's section of `system-design/components/caching` (anchors verified against the built page): LRU → `#lru-least-recently-used`, LFU → `#lfu-least-frequently-used`, FIFO → `#fifo--segmented-variants`, CLOCK (no own section) → `#eviction--expiry`. A Vitest content test asserts each anchor exists in the built article so a heading rename fails loudly.

## Open items (not blocking v1)

- Whether `caching.md` sections get "▶ Visualize" links back to the visualizer (content task + changelog), done after v1 ships.
