# Visualizer — Caching Strategies — Design

Section-wide principles and rules live in `docs/_meta/visualizer/README.md`; this spec is the detail for this visualizer. It builds on the frame from `2026-10-07-cache-visualizer-design.md` and with `2026-10-09-visualizer-variants-and-revision-design.md`.

## Purpose

Let a student watch each caching strategy move data between App, Cache and DB, then see where it breaks. Eviction answers what leaves the cache; this answers how data gets in and stays correct.

Success: after one run a student can say what each strategy trades away — write-through's latency, write-behind's durability, cache-aside's stale-read window.

Audience: the author plus a small known circle. Inherits the wiki theme; works offline.

## Scope

- Route `/visualizer/caching-strategies/`, slug `caching-strategies`, registered in `registry.ts` and `modules.ts`; the landing card and home count follow.
- Strategies: **cache-aside, read-through, write-through, write-behind, write-around, refresh-ahead**.
- Scenarios: cold miss, hit, write, stale-read race, flush with coalescing, cache crash, expiry, proactive refresh.
- New generic shape: **Lanes**.
- Small generic frame additions (see Frame changes).

Non-goals: no backend, no quizzes, no embedding in articles, no new runtime dependencies, no cache capacity or eviction (that is the eviction visualizer), no write-through concurrent-writer race.

## Step model

One step is one **request**, the same unit as eviction. The stage shows all of that request's hops as numbered arrows that fade in order; the timeline strip has one cell per request, coloured by outcome. A race is one step holding two overlapping requests, with hops numbered in global time order. A background hop (write-behind flush, refresh-ahead refresh) belongs to the request that triggered it and is drawn in a second thread colour.

Time is abstract. One request is one tick. Cost per request is the round trips on its critical path: a cache round trip is 1 tick, a DB round trip is 3. Background hops cost the request nothing.

## Left pane

Same field kinds as eviction.

| Group | Field | Kind | Notes |
|---|---|---|---|
| Strategy | Strategy | chips | six strategies; the variants field |
| Input | Keys | slider 1–3 | default 1; keys are drawn uniformly, so more of them only dilute hits |
| Input | Requests | slider 4–12 | default 6, the length of the default sequence; beyond about 12 nothing new appears |
| Input | Entry lifetime | slider 2–8 ticks | dimmed unless the strategy bounds staleness with it (read-through, write-around, refresh-ahead) |
| Input | Flush every | slider 2–6 requests | dimmed unless write-behind |
| Input | Workload | chips | Read-heavy, Mixed, Write-heavy, Racing writes, Cache crash |
| Input | Sequence | sequence | editable tokens, Enter applies |
| (none) | Seed | seed | as eviction |

Defaults, chosen for this visualizer: cache-aside, Keys 1, Requests 6, lifetime 5, flush every 3, Mixed, random seed, and the hand-picked sequence `RA RA WA WA RA !` (miss, hit, two writes, a read after them, a crash), which shows every strategy's defining behaviour on one key. Touching a slider, workload chip or seed regenerates a random sequence. Chip, slider and seed changes regenerate the sequence; editing the sequence applies on Enter. Dimmed fields show a one-line hint saying which strategies use them.

## Operations and tokens

A token is `R`, `W` or `X` followed by a key `A`–`E`, or `!` alone. Tokens are uppercase so they survive the URL; input is case-insensitive.

| Token | Meaning |
|---|---|
| `R k` | read key k |
| `W k` | write key k |
| `X k` | read k overlapped by a write to k. Under cache-aside the engine drops k's entry first, as if it had just expired, so the read misses and races; the caption says so. Under every other strategy it runs the read and the write in one frame, the write drawn as the second thread |
| `!` | the cache node crashes and restarts empty |

Every token is valid under every strategy, so one sequence runs unchanged through any strategy (required so switching strategy keeps the step). Strategies without a distinct behaviour for a token run the plain version: `X k` runs the read and the write overlapped with no anomaly, and `!` under a strategy with no buffer just empties the cache.

## Strategies

Hops are arrows between the App, Cache and DB lanes.

| Strategy | Read hit | Read miss | Write | Background |
|---|---|---|---|---|
| Cache-aside | get → hit | get → miss → read DB → value → set cache | write DB → delete cache key | — |
| Read-through | get → value | get → cache loads from DB → value → value to app | write DB only | — |
| Write-through | get → value | read-through loading | set cache → cache writes DB → ok → ok | — |
| Write-behind | get → value | read-through loading | set cache → ok; entry joins the buffer | flush hops on every Nth tick |
| Write-around | get → value | app-driven fill, as cache-aside | write DB only; cached copy left alone | — |
| Refresh-ahead | get → value, then refresh if in the last third of lifetime | read-through loading | write DB only | refresh hops |

Entries expire at the start of the request in which their lifetime ends; the caption says so. The refresh threshold is ⅓ of lifetime rounded up, minimum 1, and is fixed.

Write-behind coalesces: the buffer keeps the last write per key, and a flush raises the DB write count by the number of distinct keys. A crash step shows the Cache lane dead, entries gone and buffer chips struck through; the next request sees a live, empty cache.

## State and metrics

State: `db` (version per key, all start at v1), `cache` (version and load tick per key), `buffer` (pending version per key), counters for stale reads, lost writes and DB writes. Every write bumps the key's version. A read is **stale** when the cache's version is below the DB's.

Corner metric, per run: **Stale reads** for every strategy except write-behind, which shows **Lost writes** (buffered writes wiped by a crash). Cost metrics live in the Step tab's variables table: the request's key version in cache and DB (rows named by key, e.g. `cache A`, so now and before compare the same key), latency in ticks, DB writes, buffer size, with now vs before.

## Workload generator

Independent of the strategy, so one seed gives one sequence under every strategy. Seeded with `core/rng`.

| Chip | Behaviour |
|---|---|
| Read-heavy | 85% reads |
| Mixed | 60% reads |
| Write-heavy | 35% reads |
| Racing writes | 65% reads, with seeded `X` tokens in place of some reads |
| Cache crash | Mixed plus one `!` about 70% through |

## Lanes shape

Generic: no caching words. Lives in `core/shapes.ts` and `core/geometry.ts` with `components/visualizer/shapes/LanesShape.tsx`, picked by `Shape.tsx`.

```ts
interface LanesModel {
  kind: "lanes";
  lanes: Lane[];
  hops: Hop[];
  slots: number;
  cardRows: number;
  epoch?: number;
  note?: string;
}
interface Lane { id: string; name: string; dead?: boolean; sections: CardSection[] }
interface CardSection { title: string; layout: "rows" | "chips"; items: CardItem[] }
interface CardItem { text: string; tone?: "changed" | "stale" | "lost" | "muted"; bar?: { value: number; max: number } }
interface Hop { from: string; to: string; label: string; thread: 0 | 1; reply?: boolean; flag?: boolean }
```

- `sections` are the state cards under each lane header: Entries as rows, the write buffer as chips, expiry as `bar`.
- Tones map to `--viz-*` colours inside the shape; `dead` draws a red header with ✕ and a red lifeline; `reply` is dashed; `thread` colours a hop by request or background job.
- `epoch` is the step number; it is part of each hop's key so a hop that looks like the previous step's still replays its fade-in.
- `slots` is the run-wide maximum number of hop rows and `cardRows` the run-wide number of text rows reserved for the tallest state card, so the stage height stays fixed while stepping.
- No axis: the Rotate button is hidden, as for the ring. Hops fade in staggered by index; no animation under `prefers-reduced-motion`. The screen-reader label lists the hops in order.

## Frame changes

All optional and generic; eviction is unaffected.

1. **Lanes shape** wired into `Shape.tsx`.
2. **Availability hook.** The module may export `availability(values)` returning, per field key, `{ disabled, hint }`. Sliders render it dimmed with the hint; other field kinds ignore it. This dims Entry lifetime and Flush every.
3. **Module-owned sequence parsing.** The sequence field takes an optional `parse(raw)` returning `{ ok: true, tokens }` or `{ ok: false, error }`; the config field and the URL parser both use it. Default stays A–Z. `RunResult.sequence` is already `string[]`, so tokens like `Ra`, `Wb`, `Xc`, `!` fit.
4. **Per-run metric label** already exists in `RunResult`; no change.

Changes 2 and 3 touch `ConfigFields.tsx`, which also carries the previous/next variant buttons.

## Module content

- **Step tab:** two to four plain-English lines per strategy with the executed lines highlighted, e.g. "Ask the cache · hit: answer · miss: read the DB and fill the cache".
- **About tab:** cost, wins, loses, seen-in per strategy. **Try tab:** two presets per strategy, each patching a hand-picked sequence (plus lifetime or flush-every where needed) so it shows its point on every click, e.g. force the race (`XA RA WA RA`), lose a write (`WA WB ! RA`, flush every 5), four writes become one DB write (`WA WA WA WA`, flush every 4). A test per preset pins the outcome.
- **Article links:** the frame carries one link per run, so each strategy deep-links to its own heading in `content/system-design/components/caching.md`. Write-around links to the "Write-Around" heading added to the article for it.

## Files

`lib/visualizer/caching/`: `module.ts`, `engine.ts` (driver: ticks, frame assembly), `trace.ts` (generator), `tokens.ts` (parse and format), `lanes.ts` (state to LanesModel), `copy.ts`, `types.ts`, and `strategies/{cache-aside,read-through,write-through,write-behind,write-around,refresh-ahead}.ts`, each implementing one interface: given state and the next token, return that request's hops, the new state and the outcome.

Also: `core/shapes.ts`, `core/geometry.ts`, `components/visualizer/shapes/LanesShape.tsx`, CSS in `css/view-visualizer/stage.css` with `--viz-*` aliases only, `registry.ts`, `modules.ts`, README (Lanes in the shape table, roadmap item removed) and `docs/_meta/visualizer/backlog.md` (topic removed).

## Variants and Revision

Satisfies the equal-frames rule: one frame per token under every strategy, and the sequence does not depend on the strategy. The module declares `strategy` as the variants field, and its six strategies each have a flow-diagram revision card. The per-run corner metric label differs by strategy (Stale reads vs Lost writes), which only matters in Single since Revision shows no metrics.

## Testing

Vitest, fixture-first, against hand-checked frames:
- One file per strategy over scripted sequences: cold miss, hit, write, race, flush coalescing, crash loss, stale until expiry, refresh threshold.
- Generator determinism per seed and independence from the strategy.
- Token parsing and error messages, `availability` rules, equal frame counts across strategies for one sequence.
- Lanes geometry, `LanesShape` and dimmed-slider component tests, URL round trip with the new token format, and the article-anchor content test.
- One browser e2e check for the page.

## Decisions and notes

- **Write-around article section.** Added to `caching.md` before implementation, so every strategy has its own anchor.
- **Decided:** `X` and `!` are valid under every strategy, so the Racing writes and Cache crash chips are never disabled. Switching strategy keeps the step, so one sequence must run unchanged through every strategy.
