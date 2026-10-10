# Visualizer — Rate Limiting — Design

Section-wide principles and rules live in `docs/_meta/visualizer/README.md`; layering rules (generic shapes vs per-visualizer adapters) live in `CONVENTIONS.md` under Visualizer. This spec is the detail for this visualizer. It builds on the frame from `2026-10-07-cache-visualizer-design.md`, the Lanes and hook changes from `2026-10-07-caching-strategies-visualizer-design.md`, and the variants and Revision contract from `2026-10-09-visualizer-variants-and-revision-design.md`.

## Purpose

Let a student watch one stream of requests hit each rate-limiting algorithm and see why the five differ, then revise all five side by side. The articles explain the trade-offs; this makes them visible.

Success: after one run a student can say what each algorithm trades away — fixed window's boundary spike, sliding log's memory, sliding counter's approximation, token bucket's burst, leaky bucket's waiting and dropped tail — and that all five enforce the same average rate.

Audience: the author plus a small known circle. Inherits the wiki theme; works offline.

## Scope

- Route `/visualizer/rate-limiting/`, slug `rate-limiting`, registered in `registry.ts` and `modules.ts`; the landing card and home count follow.
- Algorithms, in variant order (increasing difficulty): **fixed window counter, sliding window log, sliding window counter, token bucket, leaky bucket** (queue variant).
- One client against one limiter. Each algorithm gets its own single view, drawn in the shape of its real structure.
- Single view and Revision view (five looping cards).
- New generic shapes: **Timeline** and **Composite**. Linear is reused.
- Small generic frame change: availability hints render when present, and on chips (see Frame changes).
- Prerequisite cleanup: neutral names for the remaining cache-flavoured generic terms (see Generic layer).

Non-goals: no distributed counting or atomic-increment race, no fractional tokens, no leaky-bucket-as-meter variant, no per-identifier fan-out, no per-tick stepping, no backend, no new runtime dependencies.

## Step model

One step is one **request**, the same unit as eviction and caching. The sequence is a list of **arrival ticks**; repeats mean simultaneous arrivals and are decided in order. Before each step the limiter is advanced to that request's tick, so idle gaps are skipped: refill, drain and expiry happen in the jump. The step's caption names what the gap did (e.g. "+1 token refilled"). The timeline strip has one cell per request, coloured by outcome.

Time is abstract: ticks, never milliseconds. A request at tick t is taken at the end of tick t. Within a tick, scheduled work (refill, drain, expiry, window roll) happens before that tick's requests.

## Parameters

Two shared inputs, so one stream runs through all five at the same average rate.

| Field | Kind | Values | Default | Reason |
|---|---|---|---|---|
| Limit | slider | 2–5 | 3 | max per window, and the bucket size for the bucket algorithms; above 5 the marks crowd the stage and nothing new appears |
| Pace | chips | "1 per tick", "1 per 2 ticks" | 1 per 2 ticks | one request allowed per Pace ticks, so every rate is an integer; slower paces make the window too long for the axis |

- **Window** is derived: Limit × Pace (2–10 ticks).
- **Axis length** is `max(12, 2 × Window, last tick + 1)` ticks, at most 20, so there is always room for a window boundary and a gap, and a longer stream stretches the axis instead of clipping marks.
- Fixed start state: bucket full, queue empty, counters zero.
- **Hints**, rendered through `availability` (see Frame changes): Limit says "Max per window · bucket size for the buckets"; Pace says "1 request per 2 ticks = 3 per 6 ticks, the same average rate for every algorithm" with the live numbers.
- Changing Limit, Pace or the workload regenerates the sequence (they are the sequence field's `resetBy`).

## Left pane

Same field kinds as eviction and caching.

| Group | Field | Kind | Notes |
|---|---|---|---|
| Algorithm | Algorithm | chips | the variants field; Prev/Next and Shift+←/→ come from the frame |
| Input | Limit | slider 2–5 | hint as above |
| Input | Pace | chips | hint shows the live rate and Window |
| Input | Workload | chips | Steady, Burst, Boundary straddle, Idle then burst |
| Input | Sequence | sequence | editable arrival ticks, Enter applies |
| (none) | Seed | seed | as eviction |

There is no Requests slider: each workload chip generates a whole motif sized to the axis, and the sequence field (at most 14 ticks) is the length control.

Defaults, chosen for this visualizer: fixed window, Limit 3, Pace 1 per 2 ticks, workload Boundary straddle, random seed, and the hand-picked sequence `4 5 5 6 6 7 7 11`. The same stream is the default for every algorithm, and switching the algorithm chip keeps the current sequence and restarts from step 1.

Tick grammar: whole numbers 0–19 separated by spaces, commas or underscores, non-decreasing, 1–14 of them. Dots and minus signs are not separators, so `2.5` and `-3` are errors, not reinterpreted ticks. Errors are one-liners: "Ticks must be whole numbers from 0 to 19", "Ticks must not go backwards", "Use 1 to 14 requests". Parsing uses the module-owned `parse` hook on the sequence field, which receives only the text, so the 0–19 bound is the widest possible axis. In the URL the ticks are joined with `_` (`q=4_5_5_6_6_7_7_11`) through a new optional `join` on the sequence field.

## Algorithms

Let L = Limit, K = Pace, W = Window = L × K. Each is a state machine behind one interface: given the state, the next tick and the request, return the new state, the decision and the gap effect. The scheduled ticks are the positive multiples of K.

| Algorithm | State | Per tick | Decision |
|---|---|---|---|
| Fixed window | counter per clock-aligned window (window = ⌊t / W⌋) | the window rolls when ⌊t / W⌋ changes | allow if the window's count < L, then count it |
| Sliding window log | timestamps of allowed requests | drop timestamps ≤ t − W | allow if fewer than L kept, then keep t |
| Sliding window counter | counts of the current and previous window | on a roll, the old current becomes previous (a skipped window is 0) | estimate = previous × (W − 1 − t mod W) / W + current; allow if estimate < L, then count it |
| Token bucket | tokens, capacity L, starts full | at each scheduled tick, +1 token if below L | allow if ≥ 1 token, then take one |
| Leaky bucket | FIFO queue, capacity L, starts empty | at each scheduled tick, one queued request is processed | allow (join the queue) if fewer than L queued, otherwise drop |

Outcome mapping: good = allowed or queued, bad = rejected or dropped. Rejected requests change no state (no timestamp, no count, no token).

**Leaky bucket wait.** A request that joins at tick t with q requests ahead leaves at `next + q × K`, where `next` is the first scheduled tick after t; it waits `leave − t` ticks. Both are known when it joins, because the drain never pauses while the queue is non-empty. On the default stream the five joins wait 2, 3, 5, 6 and 3 ticks and leave at 6, 8, 10, 12 and 14.

**Sliding counter weight.** The previous window is weighted by `(W − 1 − t mod W) / W` — the share of its ticks still inside the bracket `(t − W, t]` — instead of the article's continuous `1 − elapsed / W`, so the highlighted cells and the formula agree. The article's formula is the continuous-time idealisation; nothing in the article changes.

## State and metrics

Corner metric, per run: **Peak in any W ticks** — the most allowed requests in any span of W consecutive ticks. For the leaky bucket it counts leave ticks of the queued requests (processed and already scheduled), and the label is **Peak out in any W ticks**; this makes the value exact at every step with no hidden tail. It is the one number that separates the algorithms: fixed window exceeds L (6 on the default stream), the sliding log never does, the others sit in between, and the leaky bucket never exceeds L by construction.

Step tab variables (now vs before, changes marked): the request's tick, the gap since the previous request, then per algorithm:

| Algorithm | Rows |
|---|---|
| Fixed window | window, count in window, limit |
| Sliding counter | previous count, weight, current count, estimate |
| Sliding log | timestamps kept, oldest kept |
| Token bucket | tokens, next refill in |
| Leaky bucket | queued, processed, dropped, waits (ticks, and the tick it leaves) |

## Views

One native view per algorithm, decided from browser mockups. Each is a model built by the adapter and drawn by generic shapes.

| Algorithm | View | Shapes |
|---|---|---|
| Fixed window | time axis with fixed window bands; each band header shows its count and "full" once at the limit; the boundary is marked; an alert span labels "N allowed in k ticks" when the peak exceeds L | Timeline |
| Sliding counter | the same bands plus a bracket covering the last W ticks; the previous-window ticks inside the bracket are hatched; the bracket label shows the estimate; the previous band's header shows `count × weight` | Timeline |
| Sliding log | a bracket over the last W ticks labelled "kept k/L"; allowed marks that aged out are faded; below it the log as a Linear list of timestamps (newest in, oldest ages out) so the O(limit) memory shows | Composite: Timeline + Linear |
| Token bucket | a Linear pile of tokens (refill in at one end, a request takes one at the other, "next token in n ticks") over a thin time strip of the marks | Composite: Linear + Timeline |
| Leaky bucket | a small Linear queue (in → out, dropped count) over a two-row timeline: arrivals, and leaves as evenly spaced marks labelled "one every K ticks"; leaves that have not happened yet are drawn faded at their scheduled tick (clipped at the axis end) | Composite: Linear + Timeline (two rows) |

The stage caption is one line: outcome, tick, the algorithm's decision detail, and a chip for the gap effect when there was one. For a queued request the chip also says how long it waits.

**Narrow stages.** Timeline geometry comes from the measured width (`useElementSize`). A degrade ladder keeps it legible down to 320px and in Revision cards (at least 250px wide): full tick labels and band headers at 36px per tick or more; thinned tick labels, short band and span labels and smaller marks at 14px or more; below that the Timeline scrolls horizontally and keeps `now` in view (`useFollowScroll`). At 320px and in a 250px Revision card the default 12-tick axis uses the middle rung; only a 20-tick axis in a 250px card scrolls.

## Generic layer

Vocabulary-neutral, per CONVENTIONS. Lives in `core/shapes.ts`, `core/geometry.ts` and `components/visualizer/shapes/`, picked by `Shape.tsx`.

```ts
interface TimelineModel {
  kind: "timeline";
  ticks: number;
  now: number;
  stack: number;
  lanes: number;
  rows: TimelineRow[];
  bands: TimelineBand[];
  spans: TimelineSpan[];
  boundaries: number[];
}
interface TimelineRow { label: string; marks: TimelineMark[] }
interface TimelineMark { at: number; tone: "good" | "bad" | "faded"; current?: boolean; title?: string }
interface TimelineBand { from: number; to: number; label: string; short?: string }
interface TimelineSpan { from: number; to: number; label: string; short?: string; style: "outline" | "fill" | "hatch" | "alert" }

interface CompositeModel {
  kind: "composite";
  parts: Exclude<ShapeModel, CompositeModel>[];
}
```

`stack` and `lanes` are run-wide maxima (the tallest pile of simultaneous marks, capped at 4 with the rest shown as a "+n" chip, and the most labelled spans) so the stage keeps one height.

- **Timeline** draws a tick axis, one or more mark rows (simultaneous marks stack), shaded bands with headers, boundary lines, labelled spans, and a cursor at `now`. The current mark gets a ring. Rejected marks are drawn hollow with a cross so tone is never colour-only. `faded` means inactive (aged out, or not yet happened). The screen-reader label lists the marks in order.
- **Composite** stacks its parts vertically at their natural heights. It has no axis (`defaultAxis` is null), so Rotate is hidden; Linear parts keep their own orientation. The stage height is fixed per run (the adapter reports the tallest part), as for Lanes.
- **Linear** is reused: tokens are items with capacity L; the queue is items with capacity L and `removed` for the processed one; the log is items with the timestamps as text. Entry and exit labels come from the adapter.
- **Linear's horizontal layout** gets a small height guard so its labels stay inside a short Composite part; taller stages are unchanged.
- **Variants stay config, not classes:** bands, spans and rows are optional arrays on one Timeline shape; the degrade ladder is a function of measured width, not a second component.
- **Neutral renames, pinned** (done first, with their tests): the active tone `"hit"` becomes `"existing"` and the class `viz-blk--hit` becomes `viz-blk--existing`; the aliases `--viz-hit`, `--viz-miss`, `--viz-evict` and their `-bg` variants become `--viz-good`, `--viz-bad`, `--viz-exit` and `-bg` variants. The change reaches the Linear and Ranking shapes, the eviction and caching modules that set the tone, `tokens.css`, and the `ui`, `playback`, `panels` and `stage` stylesheets. `evicted` → `removed` is already done.

## Frame changes

Two small generic changes, plus what comes free from the variants contract.

1. **Availability hints render whenever present, and on chips; sequence fields may declare a URL separator.** Today the slider shows `availability.hint` only when disabled and chips take no availability; the sequence URL codec joins tokens with no separator, which cannot round-trip multi-digit ticks. After the change both hints show, and `SequenceField.join` supplies the separator (`"_"` here). Existing modules are unaffected.
2. **Variants:** the module declares `variants: { key: "algorithm" }`; Prev/Next and Shift+←/→ come from the frame. `restartOnSwitch: true` (new optional flag on the variants spec, off for the other modules) restarts the run from step 1 on every switch so each algorithm plays from the start. The equal-frames rule holds because every algorithm returns one frame per request for the same sequence, and a test enforces it.
3. **Revision:** the module supplies `revision` cards, so the `[Single|Revision]` toggle appears.
4. The `availability` hook takes `values` only, as in the variants contract.

## Revision

Five cards, in variant order. The leaky bucket card shows the two-row timeline only, because a Revision card stage is 200px tall. Each runs the real algorithm over the fixed mini-stream `4 5 5 6 6 7 7 11` at Limit 3, Pace 1 per 2 ticks, and plays its 8 steps by drawing the Single-view model at each step (`render(0)` is the empty start state), in the compact Timeline. Cards are independent of the inputs and the trace. Each card supplies `steps`, `render`, `stepsText` (a screen-reader line per step, such as "Request 4 at tick 6: rejected, window 1 already has 3"), `summary`, `glossaryTerm` and `differs`. Every card sets `glossaryTerm`, so the "i" popup shows the glossary definition and `summary` is only the fallback. The five entries are added to `data/glossary.json` as part of this work (keys lowercase and singular, distinct from the existing `sliding window`, which is the array technique).

| Card | glossaryTerm | summary | differs |
|---|---|---|---|
| Fixed window | `fixed window counter` | Count requests in clock-aligned windows; reset at each boundary. | Cheapest, but a burst split across a boundary gets double the limit. |
| Sliding log | `sliding window log` | Keep a timestamp for every allowed request; count those in the last window. | Exact, no spike, but memory grows with the limit. |
| Sliding counter | `sliding window counter` | Weight the previous window's count by how much of it the last window still covers. | Close to the log's accuracy in two counters, but only an estimate. |
| Token bucket | `token bucket` | Spend a token per request; tokens refill at a steady pace up to a cap. | Allows a burst up to the bucket size after idle time. |
| Leaky bucket | `leaky bucket` | Queue requests and release them at a constant pace; drop when the queue is full. | Output is always smooth, but requests wait and a burst's tail is dropped. |

## Workload generator

Independent of the algorithm, so one seed gives one sequence under every algorithm. Seeded with `core/rng`, relative to the current Limit, Pace, Window and axis. Each chip generates a whole motif; none is padded or trimmed.

| Chip | Motif |
|---|---|
| Steady | one request every Pace ticks from a seeded first tick (0 to Pace − 1) to the end of the axis, so nothing is rejected under any algorithm |
| Burst | Limit + 2 requests at one seeded tick in the first half of the axis, then one request a window later (clamped to the last tick) |
| Boundary straddle | at a seeded window boundary b: Limit requests in the two ticks before it (the first alone, the rest together), Limit + 1 in the two ticks from b (split evenly), and one late request at `min(last tick, b + W − 1)`; for Limit 3 and Pace 2 this is exactly the default shape |
| Idle then burst | Limit requests at tick 0 (draining the bucket), a gap of at least one window, then Limit + 1 at once at a seeded tick from W to the last tick |

No motif exceeds the 14-tick maximum: the longest is 12 requests (Steady at Pace 1, or Boundary straddle at Limit 5).

## Module content

- **Step tab:** two to four plain-English lines per algorithm with the executed lines highlighted, e.g. "Move to this request's tick · count it in its window · over the limit: reject".
- **About tab:** cost, wins, loses, seen-in per algorithm, and the sustained rate ("1 request per 2 ticks, like the others").
- **Try tab:** two presets per algorithm. Every preset patches `sequence`, `limit` and `pace` together, so it shows its point on every click whatever the sliders were. A test per preset first moves the sliders away from the defaults, then applies the preset and pins the outcome.

| Algorithm | Preset | Sequence | Limit | Pace | Pinned result |
|---|---|---|---|---|---|
| Fixed window | Straddle the boundary | `4 5 5 6 6 7 7 11` | 3 | 2 | AAAAAARR, peak 6 |
| Fixed window | Move the burst off the boundary | `1 2 2 3 3 4 4` | 3 | 2 | AAARRRR, peak 3 |
| Sliding log | Same stream, no spike | `4 5 5 6 6 7 7 11` | 3 | 2 | AAARRRRA, peak 3 |
| Sliding log | Memory grows with Limit | `2 2 2 2 2 3` | 5 | 2 | five timestamps kept, sixth rejected |
| Sliding counter | Estimate too generous | `5 5 5 6 7 7` | 3 | 2 | AAAARR, peak 4 (the sliding log gives AAARRR, peak 3) |
| Sliding counter | Estimate too strict | `0 0 0 6 6 6` | 3 | 2 | AAAARR, peak 3 (the sliding log gives AAAAAA) |
| Token bucket | Idle buys a burst | `10 10 10 10` | 3 | 2 | AAAR |
| Token bucket | Refill is the real limit | `0 0 0 1 2 3` | 3 | 2 | AAARAR |
| Leaky bucket | Smooth output | `4 5 5 6 6 7 7 11` | 3 | 2 | AAAARRRA, leaves at 6, 8, 10, 12, 14 |
| Leaky bucket | A full queue drops the tail | `0 0 0 0 0 0 11` | 3 | 2 | AAARRRA, leaves at 2, 4, 6, 12 |

Default stream under each algorithm: fixed AAAAAARR (peak 6), log AAARRRRA (3), counter AAAARRRA (4), token AAAARRRA (4), leaky AAAARRRA (3 out). The preset and default-stream results above were produced by simulating the rules in this spec; the tests must pin them against hand-checked frames, not copy them from the implementation.

**Same average rate.** Steady is fully allowed under all five algorithms for every Limit, Pace and starting tick (verified by simulation); a property test pins it, and the Pace hint and each About tab state it.

**Article links:** the frame carries one link per run, so each algorithm deep-links to its heading in `content/system-design/algorithms/rate-limiting-algorithms.md`: `#fixed-window-counter`, `#sliding-window-log`, `#sliding-window-counter`, `#token-bucket`, `#leaky-bucket`. All five headings exist, so no article change is needed first. A content test asserts every target anchor exists.

## Files

`lib/visualizer/rate-limiting/`: `module.ts`, `engine.ts` (driver: advance to tick, frame assembly), `trace.ts` (workload generator), `ticks.ts` (parse and format), `view.ts` (state → Timeline / Linear / Composite models; split per algorithm if it nears 400 lines), `revision.ts` (the five cards), `copy.ts`, `types.ts`, and `algorithms/{fixed-window,sliding-log,sliding-counter,token-bucket,leaky-bucket}.ts`, each implementing one interface.

Also: `data/glossary.json` (five new entries; the git-ignored `public/data/` copy is refreshed by the content build), `core/shapes.ts`, `core/geometry.ts`, `components/visualizer/shapes/{TimelineShape,CompositeShape}.tsx`, `Shape.tsx`, `components/visualizer/frame/ConfigFields.tsx` (hint rendering), CSS in `css/view-visualizer/stage.css` with `--viz-*` aliases only (including the neutral renames in `tokens.css`), `registry.ts`, `modules.ts`, the README (Timeline and Composite in the shape table, Composite removed from planned, shape reuse notes), `docs/_meta/visualizer/backlog.md` (topic removed) and the CLAUDE.md FILE MAP (`lib/visualizer/rate-limiting/`, new shapes).

## Testing

Vitest, fixture-first, against hand-checked frames:

- One file per algorithm over scripted sequences: window roll and boundary spike, the sliding bracket and aging out, estimate weights, refill cap and empty bucket, queue full, drain timing, wait and leave ticks, rejected requests changing no state.
- Generator determinism per seed and independence from the algorithm; each motif's shape, its length (at most 14) and its fit on the axis for every Limit and Pace.
- Tick parsing and error messages; the Limit and Pace hints; equal frame counts across algorithms for one sequence; the peak metric for each algorithm on the default stream.
- The Steady property test across every Limit and Pace.
- A test per Try preset, run after moving the sliders away from the defaults.
- Variants: Prev/Next and Shift+←/→ flip the algorithm in chip order and restart from step 1.
- Revision: five cards render in order, each plays 8 steps and holds its finished state; the compact Timeline; every card's `glossaryTerm` exists in `data/glossary.json`.
- Timeline and Composite geometry and component tests (stacked marks, hollow rejected marks, bands, spans, faded scheduled marks, fixed composite height) and the degrade ladder at 250px and 320px; the hint rendering on sliders and chips, including that a disabled hint still shows; the renamed tone and token tests.
- URL round trip with the tick sequence, and the article-anchor content test.
- One browser e2e check for the page.

## Decisions and notes

- **One native view per algorithm.** A single chart for all five was rejected for the Single view (shape follows structure); Revision uses the same compact views.
- **One shared stream.** The default stream and the algorithm-independent generator keep "same requests, five behaviours" true; switching the algorithm chip never changes the sequence, and a switch restarts from step 1 so the student watches each algorithm handle the same stream from the beginning.
- **Integer pace.** Pace is ticks per request, with Window derived, so token and queue counts are whole numbers and Linear can draw them.
- **No Requests slider.** A slider could not be honoured (Steady fits 6 requests at the defaults, a Burst fits one motif); motifs set the length and the sequence field can be edited.
- **Leaky bucket metric uses leave ticks,** so the value is exact at every step and no tooltip (a frame change) is needed.
- **Tick-inclusive sliding counter weight** as described under Algorithms.
- **Composite is built here.** Three of the five views need it; ARC reuses it later.
