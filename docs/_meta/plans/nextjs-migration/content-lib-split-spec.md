# `lib/content` build/read split — Executable Spec (Phase 8b)

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:executing-plans`. Phases in order, inline, stop for review at each boundary. `- [ ]` checkboxes. No git steps. `pnpm` only. Single-line comments. Read [`content-lib-split.md`](./content-lib-split.md) first for the problem and rationale; this file is the executable form and supersedes its "Scope when picked up" test list (several tests it names were deleted in Phase 8).

**Goal:** the app reads finished artifacts; only `pnpm content:build` renders markdown. `next build` stops re-running the unified pipeline (~25 s of a ~66 s build). Zero user-facing change.

**Exit criteria:** (1) `read/` has no import of `unified`, `remark*`, `rehype*`, `shiki`, `hast*`, `unist*`, `mdast*`, or any `build/` module — enforced by a lint rule and a test. (2) Every `Article` returned by `read/` deep-equals what `getArticle` returns today, for every article. (3) `pnpm build` wall time measurably below the Phase 0 baseline. (4) `pnpm typecheck`, `pnpm lint`, `pnpm test:all`, full e2e green.

---

## Current state (verified 2026-10-02)

- `get-article.ts` is both renderer and accessor: `assemble()` runs `renderMarkdown`, `fromHtml`, `extractHeadings`, `deriveExcerpt`, `computeShapeFingerprint`; results cached in-process.
- `getArticle` callers: `app/[vertical]/[...slug]/page.tsx` (`generateMetadata` + page), `buildContent()` (heading-id pass), `buildManifest()`, `buildComplexityTables()`.
- Accessors that silently fall back to rendering when `generated/manifest.json` is absent: `getManifest()` (`manifest.ts`) and `getVerticalIndex()` (`vertical-index.ts`) call `buildManifest()`; `getVerticals()` falls back to `discoverArticlePaths`. These fallbacks keep the render path alive inside the accessor and must go.
- `lib/content/index.ts` mixes read exports (`getArticle`, `getVerticals`, `getBacklinks`, `getRelated`, `getVerticalIndex`) with build exports (`buildContent`, `buildManifest`, `buildSearchIndex`, `buildBacklinks`, `buildBrokenLinks`, `buildPreviews`, `buildComplexityTables`, `validate*`, `extractHeadings`, `computeShapeFingerprint`, `deriveExcerpt`).
- `generated/` (git-ignored) holds manifest, search-index, backlinks, broken-links, bridges, previews, complexity-tables, anchor-discrepancies — no rendered articles. 828 KB today.
- Consumers outside `lib/content` import from `@/lib/content`, `@/lib/content/manifest`, `.../broken-links`, `.../backlinks`, `.../changelog`, `.../verticals`, `.../types` (see `app/`, `components/reader/`, `lib/admin/`, `lib/dashboard/`, `lib/storage/`, `lib/search/`, `lib/auth/`).
- `scripts/build-content.mjs` and `tests/content/global-setup.ts` call `buildContent()`.

## Target layout

```
lib/content/
  types.ts verticals.ts constants.ts paths.ts   shared, pure (no pipeline deps)
  artifacts.ts                                    schema + paths + version for generated/ (zod; shared)
  build/    pipeline.ts plugins/ article.ts derive.ts toc.ts links.ts discovery.ts
            render-article.ts manifest.ts search-index.ts backlinks.ts broken-links.ts
            bridges.ts previews.ts complexity-tables.ts build.ts (buildContent)
  read/     get-article.ts manifest.ts vertical-index.ts backlinks.ts verticals.ts index.ts
  index.ts  re-exports read/ only
```

Audit first (Phase 1 Step 1): `article.ts`, `discovery.ts`, `links.ts`, `changelog.ts`, `vertical-index.ts`, `backlinks.ts` — any that import `hast*`/`unified` or parse markdown stay on the `build/` side and `read/` gets a generated-artifact equivalent instead.

## Decisions

| Question | Decision | Why |
| --- | --- | --- |
| Artifact shape | One file per article: `generated/articles/<vertical>/<slug>.json`, envelope `{ schemaVersion, article }` | Static export renders 184 routes across 7 workers; per-file avoids every worker parsing one multi-MB blob. Manifest stays the index. |
| Version + validation | `schemaVersion` integer in `artifacts.ts`; `read/` zod-validates every file it loads and throws a clear "run `pnpm content:build`" error on missing or mismatched version | Same assumption `getManifestSync` already makes. |
| Missing artifact | Throw, never render | A render fallback keeps `unified` in the accessor's graph. |
| Slugs for `generateStaticParams` | Derived from the manifest, not by parsing markdown | `getArticleSlugs()` currently calls `loadArticle` per path. |
| Dev workflow | `"predev": "pnpm content:build"` (~26 s once per session) | Keeps `read/` pure. Add `dev:fast` only if the wait proves annoying. |
| `Article` equality | Dump every `Article` from today's `getArticle` before touching code; deep-equal against `read/` at the end | Byte-faithful requirement from the epic stub. |
| Tests needing real articles | Run in the `content` Vitest project (its `globalSetup` already runs `buildContent()`), not `unit` | Avoids adding ~26 s to every unit run. |

---

## Phase 0 — Baseline

- [ ] **Step 1: Time the current build** — `pnpm build` twice, record wall time and the `content:build` portion; note in this file.
- [ ] **Step 2: Dump every Article** — script in the session scratchpad (not the repo) that calls today's `getArticle` for every slug and writes `{path: Article}` JSON; keep for Phase 6.

## Phase 1 — Artifact contract (fixture-first)

- [ ] **Step 1: Audit** the files listed under Target layout for pipeline imports; record which land in `build/` vs `read/`.
- [ ] **Step 2: Failing tests** for `artifacts.ts`: round-trip an `Article` fixture through write → read; reject missing file, bad `schemaVersion`, schema-violating payload with the "run `pnpm content:build`" message.
- [ ] **Step 3: Implement** `articleSchema`, `ARTICLE_SCHEMA_VERSION`, `articleArtifactPath(vertical, slug)`, `writeArticleArtifact`, `readArticleArtifact`. Reuse types from `types.ts`; do not duplicate the `Article` shape.

## Phase 2 — Move files (no behaviour change)

- [ ] **Step 1: Create `build/` and `read/`; move files per Target layout**, fix relative imports only. Tests move beside their subjects.
- [ ] **Step 2: Re-point external imports** — `app/`, `components/`, `lib/**`, `scripts/build-content.mjs`, `tests/content/global-setup.ts`. App code imports only `@/lib/content` (read) plus pure shared modules; `buildContent` is imported from `lib/content/build`.
- [ ] **Step 3: Update `vitest.workspace.ts`** project include/exclude globs for the new paths.
- [ ] **Step 4: Gate** — `pnpm typecheck`, `pnpm lint`, `pnpm test:all`, `pnpm build` all still green. This phase must be a pure move.

## Phase 3 — Render once in `build/`

- [ ] **Step 1: Failing test** — `renderArticle(path)` returns the `Article` (rename of `assemble`); `get-article.test.ts` logic moves to `build/render-article.test.ts` (pipeline project).
- [ ] **Step 2: `buildContent()`** renders every article once, then passes `Article[]` into the heading-id pass, `buildManifest(articles)`, `buildComplexityTables(articles)`, and writes each article artifact. `buildManifest`/`buildComplexityTables` stop calling `getArticle`.
- [ ] **Step 3: Remove the `runContentBuild` manifest-only path** if nothing uses it (grep first).
- [ ] **Step 4: Gate** — `pnpm test:all`, `pnpm content:build`; confirm `generated/articles/` exists and the other artifacts are byte-identical to before (diff against the committed `content/{search-index,backlinks,broken-links}.json`).

## Phase 4 — Pure `read/`

- [ ] **Step 1: `read/get-article.ts`** — `getArticle` reads and validates the artifact (module-level cache); `getArticleSlugs` from the manifest.
- [ ] **Step 2: Remove render fallbacks** — `getManifest`, `getVerticalIndex`, `getVerticals` throw the "run `pnpm content:build`" error when `generated/` is missing; no `buildManifest()` calls under `read/`.
- [ ] **Step 3: `read/index.ts`** re-exports only the read surface; `lib/content/index.ts` re-exports `read/`.
- [ ] **Step 4: Enforce purity** — ESLint `no-restricted-imports` for `lib/content/read/**` (patterns: `unified`, `remark*`, `rehype*`, `@shikijs/*`, `shiki`, `hast*`, `unist*`, `mdast*`, `**/build/**`) plus a Vitest test that scans `read/` import statements for the same list.

## Phase 5 — Tests

| File | Action |
| --- | --- |
| `lib/content/get-article.test.ts` | Becomes `build/render-article.test.ts` (pipeline project) + a new `read/get-article.test.ts` (content project) |
| `app/article.test.tsx`, `app/page.test.tsx` | Move to the `content` project (they call real `getArticle`/`getVerticals`) |
| `lib/content/vertical-index.test.ts`, `lib/content/changelog.test.ts` | Check whether they hit the manifest fallback; move to `content` project or inject a manifest fixture |
| `lib/content/pipeline.test.ts`, `plugins/*.test.ts`, `tests/content/math-equivalence.test.ts` | Unchanged (pipeline project) |
| `tests/content/artifacts.test.ts` | Extend: article artifacts exist for every manifest article and validate |
| `tests/content/equivalence.test.ts` | Unaffected; confirm green |

- [ ] **Step 1–N:** apply each row, then run the whole matrix.

## Phase 6 — Verify and finish

- [ ] **Step 1: Equivalence** — dump every Article via `read/` and deep-equal against the Phase 0 dump; zero diffs.
- [ ] **Step 2: Benchmark** — `pnpm build` twice; compare to Phase 0; record in this file (target ~40 s).
- [ ] **Step 3: Dev workflow** — add `predev`; start `pnpm dev`, load an article and a vertical index.
- [ ] **Step 4: Full gate** — `pnpm typecheck && pnpm lint && pnpm test:all && pnpm build`; full e2e (`.venv/bin/python3 -m pytest tests/e2e/ -q -n 2`), run twice.
- [ ] **Step 5: Docs** — `CLAUDE.md` FILE MAP `lib/content/` rows (build/ vs read/), `CONVENTIONS.md` if it describes the content lib, tick Phase 8b in `post-cutover.md`, update `content-lib-split.md` status to done.

## Risks

- **Hidden accessor fallbacks.** The three fallbacks above are the known ones; the purity lint and test (Phase 4 Step 4) are what catch any others.
- **Static export reading from disk at build time** — route modules run in Next build workers; artifact reads must use paths relative to the repo root the way `getManifestSync` already does.
- **Stale `generated/`** after editing a markdown file mid-`next dev`: accepted (re-run `pnpm content:build`); the schema version only guards shape, not freshness.
- **Phase 2 is a large mechanical diff.** Keep it a pure move so a failing gate points at an import path, not logic.
