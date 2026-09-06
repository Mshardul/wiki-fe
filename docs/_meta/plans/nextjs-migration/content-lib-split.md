# Epic: split `lib/content` into `build/` (renderer) and `read/` (accessor)

**Status:** proposed, post-cutover. Not part of the Next.js migration's five sub-specs — a follow-on refactor with zero user-facing change.

**Raised:** 2026-09-06, during `app-skeleton.md` Phase 7 (build benchmark). The benchmark surfaced that the corpus render runs twice per full build; investigating the fix showed the real issue is an architectural one in `lib/content`, too large to land inside a benchmark phase and too entangled with signed-off code to land alongside the cutover.

---

## The problem

`lib/content` today is **a library that renders markdown on import**. Calling `getArticle(vertical, slug)` fires a full `unified` pipeline (remark → rehype → Shiki → KaTeX → the custom plugins). Consequences:

1. **Double render per build.** `content:build` renders the whole corpus to produce `manifest.json` / `search-index.json` / `backlinks.json` / `previews.json` / `complexity-tables.json`. Then `next build`'s route rendering calls `getArticle()` for all ~170 pages, which renders the whole corpus *again* — there is no on-disk cache of rendered HTML. Measured cost of the duplicate: ~25 s of a ~66 s full build (`build-benchmark.md`).

2. **The accessor and the renderer are the same function.** `getArticle` is called in two unrelated contexts:
   - *inside* `buildContent()` (via `manifest.ts` `buildManifest`, `build.ts`, `complexity-tables.ts`) — the render pass, which must render;
   - *inside* `next build` route rendering (`app/[vertical]/[...slug]/page.tsx`) — which should only read a finished artifact.

3. **Framework coupling risk.** Every consumer of `lib/content` (the app now, any future framework) pulls in the entire `unified` dependency tree, because the read path and the render path share a module. A framework swap — or a Next major bump that changes how RSC data-loading works — drags the whole pipeline along with it. This violates the migration's principle #7 (isolate content logic from framework; the stack churns, the content doesn't).

The double render is the visible symptom; #2 and #3 are the actual debt.

---

## Target shape

`lib/content` becomes a build tool **and** a typed reader, with **no shared runtime between them**.

```
lib/content/
  build/          renderer — remark/rehype/Shiki/KaTeX, the plugins,
                  renderArticle(), buildManifest(), buildSearchIndex(),
                  buildBacklinks(), buildBrokenLinks(), buildPreviews(),
                  buildComplexityTables(), validateLinks(), validateBridges().
                  Depends on `unified` & friends. Runs once (CI + local
                  `pnpm content:build`). NOTHING in the app imports this.

  read/           accessor — getArticle(), getArticleSlugs(), getVerticals(),
                  getVertical(), getVerticalIndex(), getManifest(),
                  getBacklinks(), getRelated(). Pure I/O over generated/.
                  Zero pipeline dependencies. This is the entire surface the
                  app (and any future framework) imports.

  generated/      the contract between them — a versioned, schema-validated
                  artifact set. Add manifest + a full rendered-article
                  artifact (html + headings + prerequisites + excerpt +
                  fingerprint + readingTimeMin per article). git-ignored,
                  server-only (not copied to public/).
```

- `getArticle()` reads the rendered-article artifact and returns the `Article`. No `renderMarkdown` import. Missing artifact → a clear "run `pnpm content:build`" error (same assumption `getManifestSync` already makes about `generated/manifest.json`).
- `buildContent()` orchestrates: render every article once via `renderArticle()`, hand the `Article[]` to `buildManifest` / `buildSearchIndex` / `buildPreviews` / `buildComplexityTables` (which stop calling `getArticle` themselves), write all artifacts.
- `next build` becomes a pure emit step — take `read/` output, wrap in the route shell, write HTML.

**Payoff:** full build ~66 s → ~40 s (second render gone); `getArticle` is framework-agnostic pure I/O; one render, one source of truth; a framework swap touches only how `read/` output is wrapped in HTML.

---

## Dev workflow

`next dev` needs `generated/` populated. Decision: a `predev` script (`"predev": "pnpm content:build"`) — ~26 s once per dev session. Keeps `getArticle` a pure reader with no conditional render branch and no `renderMarkdown` in the accessor's dependency graph. Content edits mid-session are rare and `content:build` is re-runnable; a `dev:fast` that skips it (accepting stale content) can be added if the 26 s proves annoying.

Rejected: a "fall back to `renderMarkdown()` when the artifact is missing" branch in `getArticle` — it keeps the render path in the accessor, defeating the split.

---

## Why post-cutover, not now

- It is a restructure of signed-off `content-foundation.md` work — the whole `lib/content` internal boundary redrawn, every existing test migrated. Not localized.
- The migration does not need it. 66 s builds are ~7× under the CI ceiling (`build-benchmark.md`); cutover works on the current shape.
- Cutover is the risky, sequenced part. Landing a `lib/content` restructure in the same window doubles the blast radius. After cutover the app is stable, this lands in isolation, tests prove it, nothing else is moving.
- Same bucket as the other `post-cutover.md` Part B hardening (retire Python generators, CI final form) — a refactor with zero user-facing change, done once the live site is stable.

---

## Scope when picked up

**Files restructured:** `lib/content/get-article.ts`, `manifest.ts`, `build.ts`, `complexity-tables.ts`, `index.ts` (surface re-export), plus new `build/` and `read/` module layout.

**New artifact:** `generated/articles.json` (or per-file) — full `Article` map, ~3–5 MB, git-ignored, server-only. Add a `version` field + zod schema; `read/` validates on load.

**Tests:**
- `lib/content/get-article.test.ts` → becomes the accessor test (reads from `generated/`). New `render-article.test.ts` for the pipeline. Both rely on `global-setup`'s `buildContent()` (already runs).
- `tests/content/corpus-smoke.test.ts` — still iterates `getArticleSlugs()` + `getArticle()`, now disk-backed; still a valid contract check. `buildContent()` in `global-setup` already fails the suite on any render throw.
- `tests/content/equivalence.test.ts` (Python parity) — unaffected; `search-index.json` / `backlinks.json` output shape unchanged.
- `app/article.test.tsx`, `app/vertical.test.tsx`, `app/page.test.tsx` — verify still green against the disk-backed accessor.

**Spec first:** this epic gets its own short spec before code — the `generated/` artifact schema + version, the `build/` vs `read/` API surfaces, the test migration list, the dev workflow. Do not start from this stub.

**Constraints carried:** no git steps in the plan; single-line comments; `pnpm`; `.venv/bin/python3`; faithful behaviour (the `Article` shape `read/` returns must be byte-identical to what `getArticle` returns today — a fixture test pins it).
