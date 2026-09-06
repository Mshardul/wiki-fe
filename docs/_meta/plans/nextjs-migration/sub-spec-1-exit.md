# Sub-spec 1 exit checklist — `content-foundation.md`

Signed off 2026-09-03. `lib/content/` is a complete, tested, typed build-time content library with the public surface `app-skeleton.md` imports. The vanilla app (`index.html`, `js/**`, `wiki-sw.js`) is byte-for-byte untouched.

## Evidence against each spec §5 Sub-spec 1 exit criterion

| Criterion | Status | Evidence |
| --- | --- | --- |
| Render harness (corpus smoke) — zero errors | ✅ | `tests/content/corpus-smoke.test.ts` renders every `content/**/*.md` (170 articles across `system-design` + `dsa`) through `getArticle`; zero throws, every article has non-empty `html`, and satisfies the `Article` contract (title, headings tree, fingerprint, stub → `readingTimeMin` 0). |
| `manifest.json` produced + schema-validated | ✅ | `buildContent()` writes `lib/content/generated/manifest.json`; `manifestSchema` (zod, `lib/content/manifest.schema.ts`) parses it clean in `manifest-schema.test.ts` and `corpus-smoke.test.ts`. `articleCount` per vertical = total index.md count incl. stubs, matching `js/render/home-parse.js` `updateArticleCounts`. |
| `search-index.json` + `backlinks.json` + `broken-links.json` + `bridges.json` semantically equivalent to Python | ✅ | `tests/content/equivalence.test.ts` deep-compares each Node output against the Python reference in `tests/content/reference/` under `normalize()` (recursive key sort + arrays-of-objects sort — Python `json.dumps` vs Node `JSON.stringify` never byte-match). All four pass. Node-generated `search-index.json` / `bridges.json` are byte-identical to the committed files; `backlinks.json` / `broken-links.json` differ only in object key order (`{title,path}` vs Python's `sort_keys` `{path,title}`) and are now the committed baseline (spec §13). |
| Link-check passes on real content | ✅ | `validateLinks` (`lib/content/links.ts`) is a hard gate in `buildContent()`: a link whose target file does not exist fails the build. Zero missing-target links in the corpus (`build.test.ts` runs the full gate and passes). The 6 `paths/*.md → index.md` links the Python `broken-links.json` records resolve to real files (index.md is not an "article" but exists on disk) — not build failures. |
| Math output diffed vs Showdown, discrepancies resolved or logged | ✅ | `math-discrepancies.md`: **no discrepancies** — the corpus has zero `$$`/LaTeX; formulas are inline code spans; the Showdown math extension was wired but unused. `tests/content/math-equivalence.test.ts` renders 8 LaTeX-shaped expressions through `remark-math` + `rehype-katex`, all produce valid KaTeX, no `katex-error`. |
| Mermaid spike resolved | ✅ | `mermaid-spike-result.md`: **NOT CLEANLY GREEN → client-island fallback** (pre-authorised). `remark-mermaid` (`lib/content/plugins/mermaid.ts`) emits `<pre class="mermaid" data-mermaid-src>` markup only — no build-time render, no Chromium. `MermaidDiagrams.tsx` render + re-theme is `cutover.md` Phase 3. |

## Additional derived assets (Phase 7, no Python reference)

| Asset | Status | Evidence |
| --- | --- | --- |
| `previews.json` (hover-previews) | ✅ | `buildPreviews` maps the manifest to `{ "<vertical>/<slug>": { title, excerpt } }`, non-stub only. `previews.test.ts`: entry count = non-stub count, excerpts plain-text non-empty. |
| `complexity-tables.json` (comparator) | ✅ | `buildComplexityTables` renders DSA Data-Structures articles, extracts the Big-O table from hast (`isComplexityTable` / `extractTable` port `js/content/tables.js`). `complexity-tables.test.ts`: `hash-table` produces a table with operations; DS articles with no table are absent, not an error. |
| `anchor-discrepancies.json` (logged, non-blocking) | ✅ | `validateLinks` collects `#anchor` links whose fragment does not match a heading id on a known article — 11 in the corpus, all pre-existing content drift (mostly the Showdown ` - ` → `--` vs github-slugger `---` slug change). Logged to `link-anchor-discrepancies.md` for a content-side fix; does **not** fail the build (spec §12 pattern). |

## Toolchain / test infra notes for `app-skeleton.md`

- `pnpm typecheck` + `pnpm lint` (ESLint flat + Biome) clean across `lib/**` and `tests/content/**`.
- `pnpm test` — 134 tests, 21 files, all green. Vitest configured `pool: "forks"` + `reporters: ["dot"]` — the default pool + reporter hit `onTaskUpdate` RPC timeouts under the long full-corpus render (a vitest reporter-starvation bug, not a test failure). `hookTimeout` / `teardownTimeout` raised to 180s for `global-setup` (which runs `buildContent()` once to emit `generated/*` so most suites read `getManifest()` instead of re-rendering).
- Full run is ~275s wall (three suites still do an independent full render — `corpus-smoke`, `manifest-schema`, `build.test`). `app-skeleton.md` Phase 1 designs the CI `frontend` job — shard or split the corpus suite there if needed.
- `pnpm run content:build` emits `lib/content/generated/*.json` via `build.test.ts`. There is no bare-Node CLI for `runContentBuild` / `buildContent` — `lib/content` uses extensionless imports (`moduleResolution: "Bundler"`), which `next build` resolves but bare Node does not. `next build` imports `buildContent`; CI uses the script.
- `getVerticalIndex` is **async** (the interface block in `content-foundation.md` declares it sync). Unavoidable — it transitively needs rendered manifest data and `renderMarkdown`/`unified` is async. `getArticleSlugs` stayed sync. App-skeleton routes are async RSC, so no impact.

## Public surface produced (exact, for `app-skeleton.md` / `cutover.md`)

```ts
// lib/content/index.ts
getVerticals(): Vertical[]
getVertical(id: string): Vertical | undefined
getArticleSlugs(): { vertical: string; slug: string[] }[]
getArticle(vertical: string, slug: string[]): Promise<Article | undefined>
getManifest(): Promise<Manifest>
buildManifest(): Promise<Manifest>
getVerticalIndex(id: string): Promise<VerticalIndex>
getBacklinks(targetPath: string): BacklinkRef[]
getRelated(vertical: string, slug: string[]): RelatedRef[]
buildContent(): Promise<ContentBuildPaths>
validateLinks(articlePaths, headingIdsByPath): LinkError[]
buildSearchIndex(): SearchIndex
buildBacklinks(index): Backlinks
buildBrokenLinks(index): BrokenLinks
validateBridges(): BridgeValidation
buildPreviews(manifest): Previews
buildComplexityTables(): Promise<ComplexityTables>
extractHeadings(hast): Heading[]
computeShapeFingerprint(hast): ShapeFingerprint
deriveExcerpt(hast): string
```
