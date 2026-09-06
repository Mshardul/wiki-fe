# Full-corpus build benchmark

Measured 2026-09-06, `app-skeleton.md` Phase 7. Local machine (Apple Silicon, 7 build workers). Numbers are indicative, not a CI SLA.

## Article count

170 articles (`getArticleSlugs().length`), 2 verticals — 49 system-design + 121 dsa. 176 static routes total (170 articles + 2 vertical index + home + 404 + `/offline`).

## Timings

| Step | Cold | Warm (`.next` cache present) |
| --- | --- | --- |
| `pnpm content:build` (`tsx scripts/build-content.mjs`) | 26.3 s | 27.6 s |
| `pnpm build` (`next build` + `serwist build`) | 39.3 s | 38.7 s |
| **Total** | **~66 s** | **~66 s** |

Peak RSS: `content:build` ~855 MB, `pnpm build` ~1.16 GB.

`next build` internal split (warm): compile 0.7 s (cached), static page generation 25.3 s, rest ~13 s (collect + finalize + `serwist build`).

## Dominant cost

The `unified` render pipeline over the corpus — remark/rehype plugins + **Shiki** syntax highlighting + **KaTeX** math. It runs **twice per full build**:

1. `content:build` renders every article to build `manifest.json` + `search-index.json` + backlinks + previews + complexity-tables.
2. `next build`'s `generateStaticParams` + 170 page renders each call `getArticle()` → `renderMarkdown()` fresh. `getArticle` memoises per process but Next's page workers are separate processes, and there is no on-disk cache of rendered HTML.

Neither step has an incremental mode, so **warm ≈ cold** — the `.next` cache only saves the ~4 s TS compile.

## Ceiling

CI cold build must stay under **~8 min** wall and **~7 GB** RSS (GitHub Actions `ubuntu-latest`, 2 vCPU / 7 GB). Current: ~66 s / ~1.2 GB — **~7× headroom on time, ~6× on memory**. Not near the ceiling.

## Not optimised (deliberate) — tracked as an epic

The double render is wasteful (~25 s of duplicate work), and investigating it showed the cause is architectural: `lib/content` renders markdown on import, so `getArticle` is both the renderer and the accessor, and `next build`'s route rendering re-runs the whole pipeline that `content:build` already ran.

The fix is **not** a cache. An on-disk rendered-HTML cache was built and **deleted** in `content-foundation.md` Phase 7 (`render-cache.ts`) as an unrequested optimisation with a stale-cache footgun — re-adding one repeats that. The fix is to split `lib/content` into a `build/` renderer (dev/CI-only) and a `read/` pure accessor over `generated/`, so there is one render and `next build` becomes a pure emit step.

That is a restructure of signed-off `content-foundation.md` work — too large for a benchmark phase, and landing it alongside the cutover would double the blast radius. Deferred to a post-cutover epic: **`content-lib-split.md`**.

Until then: we are ~7× under the time ceiling and ~6× under memory. CI's 2 vCPU runner is ~3–4× slower than this machine → est. ~4–5 min cold, still under 8 min. If future corpus growth (2–3×) pushes CI past ~6 min before the epic lands, the stopgap is `actions/cache` on `lib/content/generated/` keyed on a `content/**` hash.
