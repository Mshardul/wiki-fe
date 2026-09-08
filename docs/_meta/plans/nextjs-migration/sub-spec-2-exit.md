# Sub-spec 2 exit checklist — `app-skeleton.md`

Signed off 2026-09-06. The Next.js App Router project, the skeleton route tree rendering real article HTML from `lib/content`, the faithful CSS port, PWA wiring via `@serwist/cli`, a CI `build` job (build + validate, no deploy), the full-corpus build benchmark, and the `wiki-be` CORS check + ticket are all complete and verified against a local production build. **No remote deploy** (that is `cutover.md` Phase 14). The vanilla app (`index.html`, `js/**`, `wiki-sw.js`, `manifest.json`, `icons/`, `sprite.svg`, `404.html`) is byte-for-byte untouched; `css/**` has only two additive changes the plan explicitly allows (see below).

## Evidence against each spec §5 Sub-spec 2 exit criterion

| Criterion | Status | Evidence |
| --- | --- | --- |
| Local production build renders every route correctly under `/wiki-fe/` | ✅ | `pnpm content:build && pnpm build` emits a flat `out/` — 170 article pages (= `manifest.articles.length`), 2 vertical index pages, home, `/offline/`, `404.html`. Served under `/wiki-fe/` (symlink → `npx serve`): home shows 2 vertical cards with counts 49 / 121; `dsa` index shows 4 sections + article links; an article renders real server HTML with Shiki-highlighted code, KaTeX math (8 corpus pages), headings, tables, callouts. |
| `basePath` / `assetPrefix` / SW-scope verified against the served `out/` | ✅ | Asset sweep on the article page — 14 unique CSS/JS/font assets, **0 non-200**, every URL `/wiki-fe/`-prefixed. `next/link` emits `/wiki-fe/dsa/...` with trailing slash. `sw.js` served 200 `application/javascript`; registration script in the layout targets `/wiki-fe/sw.js` scope `/wiki-fe/`. `http://localhost:3000/` (no basePath) → 404. |
| Article HTML renders correctly (Mermaid as raw source, island pending) | ✅ | `remark-mermaid` emits `<pre class="mermaid" data-mermaid-src="…">` — confirmed present in `out/system-design/algorithms/saga-pattern/`. No build-time render (client island is `cutover.md` Phase 3). |
| Full-corpus build time recorded, ceiling documented | ✅ | [`build-benchmark.md`](./build-benchmark.md): cold ~66 s (`content:build` 26 s + `pnpm build` 39 s), warm ≈ cold, peak RSS ~1.2 GB. Ceiling 8 min / 7 GB → ~7× time headroom, ~6× memory. The corpus renders twice per build (architectural, not a cache gap) — deferred to the post-cutover epic [`content-lib-split.md`](./content-lib-split.md). |
| CI `frontend` + `build` jobs green (no deploy job) | ✅ (local equivalents) | `frontend` (typecheck + lint + test) and `build` (`content:build` → `build` → upload `out` artifact, `needs: [frontend]`) added to `ci.yml`; YAML valid; `build` has no deploy step, no Chromium. **Cannot trigger CI from here** (no push) — every step verified locally: `pnpm typecheck` ✅ (main + `tsconfig.sw.json`), `pnpm lint` ✅ (101 files), `pnpm test` ✅ 145/145 (25 files), `pnpm content:build` ✅, `pnpm build` ✅. |
| `wiki-be` CORS confirmed; ticket filed | ✅ | Origin confirmed via `gh api repos/Mshardul/wiki-fe/pages` → `https://mshardul.github.io/wiki-fe/`, `cname: null`. **Unchanged** — same origin the live vanilla app calls from. `wiki-be` uses `allow_origins=[settings.FRONTEND_URL]`; the live app proves prod `FRONTEND_URL` is `https://mshardul.github.io`. **No CORS change; not a cutover blocker.** Ticket **WIKI-BE-58** filed (`wiki-be/docs/tickets.md`, Backlog, `chore`, `core \| security`). |
| Vanilla app unaffected — `index.html` + `js/**` + `wiki-sw.js` byte-unchanged, still serving | ✅ | `git status` shows zero changes to `index.html`, `js/**`, `wiki-sw.js`, `manifest.json`, `icons/**`, `icon.svg`, `sprite.svg`, `404.html`. `css/tokens.css` (+9) and `css/view-content/code.css` (+15) are the only `css/**` changes — both purely additive, both allowed by the plan, both inert in the vanilla app (`--diagram-*` tokens unread; `.shiki` selectors match nothing — vanilla uses `.hljs`). |

## Deviations from the plan (plan doc updated in place)

| Area | Plan said | Actual | Why |
| --- | --- | --- | --- |
| Node / pnpm | `pnpm@9.12.0` / Node 22 (stale spots) | Node 24.8.0 / pnpm 10.34.5 | Repo already on these; `overview.md` stack table already says Node 24. |
| Next config | `next.config.js`, literal `"/wiki-fe"` string | `next.config.ts` importing `lib/config.ts` | Next 16 runs TS config natively — single home for `BASE_PATH`, no duplication. |
| Static export layout | `out/wiki-fe/index.html` (nested under basePath) | `out/index.html` (flat) | Next 16 static export does not nest under `basePath`; GitHub Pages supplies the `/wiki-fe/` path segment, `assetPrefix` makes the HTML reference `/wiki-fe/_next/...`. |
| tsconfig `jsx` | `preserve` | `react-jsx` (+ `isolatedModules: true`) | `next build` rewrites tsconfig with these mandatory Next 16 values; verified `lib/**` typecheck + the 145-test suite stay green. |
| `next dev` CLAUDE.md | — | `agentRules: false` in `next.config.ts` | Next 16's `next dev` otherwise appends an agent-rules block to `CLAUDE.md` on every run. |
| `content:build` | `vitest run lib/content/build.test.ts` wrapper | `tsx scripts/build-content.mjs` (standalone) | A build is not a test. `tsx` resolves `lib/content`'s extensionless imports (bare `node` can't); the script also copies the 6 browser JSON files into `public/data/`. Discussed 2026-09-03. |
| `public/data/` copy | `buildContent()` writes both dirs | `scripts/build-content.mjs` copies after `buildContent()` | Keeps `lib/content` framework-agnostic; `build.ts` (signed-off) untouched, its tests unaffected. |
| Vitest test isolation | `pool: "forks"` + `reporters: ["dot"]` sufficient | added `fileParallelism: false` | vitest 2.1.8's `onTaskUpdate` RPC times out when several forks run the full-corpus render at once. Serial → deterministic; ~66 s → faster than the flaky parallel run. |
| Path alias in tests | (not addressed) | added `vite-tsconfig-paths` | `@/*` didn't resolve in Vitest; needed for the `app/**` render tests. |
| RSC render tests | `@testing-library/react` with RSC support, or render the function | `react-dom/server` `renderToStaticMarkup(await Component(...))` | App Router server components are async functions — await + stringify works in the `node` env, no jsdom / RTL needed. |
| Per-page metadata | wholly deferred to `cutover.md` Phase 12 | `generateMetadata` (title / description / canonical / `robots: noindex`) added now | Phase 6 exit criteria checks `<title>`; it is cheap and the reader-facing rationale (bookmarks, history, tabs) applies from the skeleton. |
| Inter font | (not addressed in Phase 3) | raw Google Fonts `<link>` in `layout.tsx` `<head>` + one-line `eslint-disable` for `@next/next/no-page-custom-font` | Faithful to the vanilla app's `<head>`; the lint rule is a false positive for App Router. `next/font/google` considered — deferred; `--font` token wiring was fragile and offline falls back to system fonts either way. |
| PWA | `@serwist/next` (`withSerwistInit` wrapping the config), `injectManifest` mode | `@serwist/cli build` — post-build SW generation over `out/` | `@serwist/next` 9.x is a webpack plugin; Next 16 builds with Turbopack, which ignores it. Serwist's Turbopack path needs a Route Handler — forbidden by `output: 'export'`. `@serwist/cli` is framework-agnostic, runs against the finished static output, and is cleaner for static export (decoupled from the framework build). Discussed + approved 2026-09-06. |
| SW `runtimeCaching.handler` | `"StaleWhileRevalidate"` string + `...defaultCache` | `new StaleWhileRevalidate({ cacheName })` instances, no `defaultCache` | String handlers and `defaultCache` are `@serwist/next/worker` only; core `serwist` `RuntimeCaching.handler` wants a `Strategy` instance. |
| `icons/` + `icon.svg` | referenced from `/wiki-fe/...` | copied into `public/` (root copies kept for the vanilla app) | Next `output: 'export'` only emits from `public/`. Root copies + `public/` copies coexist until `cutover.md` deletes the vanilla app; deduped then. |

## Toolchain / infra notes for `cutover.md`

- `pnpm build` = `next build && pnpm sw:build`. `next build` invokes `next/font/google` which fetches Inter from Google at **build time** — GitHub Actions runners have open outbound network. If it ever fails: `next/font` accepts a local font file, or revert to the runtime `<link>`.
- SW: `out/sw.js`, 69 precache URLs / 1.53 MB — `_next/static/**` + 4 shell HTML (`index`, `dsa/index`, `system-design/index`, `offline/index`) + webmanifest + icons. **No article HTML in precache** (verified in `out/sw.js`). Articles + `data/*.json` are `StaleWhileRevalidate` runtime-cached. The Mermaid client chunk (`cutover.md` Phase 3) lands in `_next/static/chunks/` → auto-precached by `globPatterns`' `_next/static/**`; revisit if precache size is a problem.
- `tsconfig.sw.json` typechecks `app/sw.ts` separately (`lib: ["ESNext","WebWorker"]` conflicts with the app's `DOM`). `pnpm typecheck` runs both. ESLint has a dedicated `app/sw.ts` block.
- Full browser verification (SW register/activate/offline-reload cycle, visual rendering) is **not done** — playwright MCP was unavailable this session. Everything checkable headless (route shapes, asset 200s, precache-manifest scope, titles, canonical, `basePath`) passes. `cutover.md` Phase 13 (e2e sweep) is the browser pass.

### Browser verification — done 2026-09-06 (skeleton-fixup pass, playwright MCP)

Served `out/` under `/wiki-fe/` (symlink → `python3 -m http.server`), Chrome-for-Testing via playwright MCP. All four cutover-blocking checks pass:

| Check | Result |
| --- | --- |
| SW registers, scope `/wiki-fe/`, controls the page | ✅ `navigator.serviceWorker.controller` = `/wiki-fe/sw.js`, scope `/wiki-fe/`, `clientsClaim` |
| Article renders styled — dark bg, Shiki themed, KaTeX math | ✅ body bg `#06070e` (always-on dark, faithful); Shiki light by default, dark-swaps to `#24292e` bg / `#F97583` token under `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)` — the `--shiki-dark-bg` / `--shiki-dark` inline vars the pipeline emits are wired to the `code.css` +15 rule; KaTeX HTML-rendered with `KaTeX_Main` @font-face live |
| Offline reload of a visited article → served from cache | ✅ 200 from `wiki-articles` SWR cache, full article body |
| Offline nav to an unvisited article → `/offline/` shelf | ✅ **after a fix** — shows the "You're offline / this article hasn't been downloaded" shelf |

**Bug found + fixed:** `app/sw.ts` `fallbacks.entries[0].url` was `/wiki-fe/offline/` but the precache key serwist writes (from `globPatterns: "offline/index.html"` + `modifyURLPrefix`) is `/wiki-fe/offline/index.html`. The fallback lookup is an exact precache-URL match → not found → offline nav to an uncached article hit `net::ERR_FAILED` (raw browser error page), not the shelf. Changed the fallback `url` to `/wiki-fe/offline/index.html`. Rebuilt; typecheck (main + sw) ✅, lint ✅ (99 files), `pnpm test` ✅ 145/145, `pnpm build` ✅ (SW 69 URLs / 1.53 MB). Re-verified all four checks green. No other skeleton fix needed.

## Public surface consumed from `content-foundation.md` — confirmed sufficient

All of the following were called from real route files and returned usable data; no gap found:

```ts
getVerticals(): Vertical[]                              // home cards + generateStaticParams
getVertical(id): Vertical | undefined                   // vertical index + generateMetadata
getArticleSlugs(): { vertical, slug: string[] }[]        // generateStaticParams (both dynamic routes)
getArticle(vertical, slug): Promise<Article | undefined> // article body + generateMetadata
getVerticalIndex(id): Promise<VerticalIndex>             // vertical index sections
```

`Article.html` renders correctly via `dangerouslySetInnerHTML` (build-time trusted content, no runtime sanitiser). `Article.excerpt` feeds the description meta. `VerticalIndex.sections[].articles[]` (`{ title, slug, path, isStub }`) is enough for the index card grid.

## Local check (2026-09-06)

`pnpm content:build` ✅ · `pnpm typecheck` ✅ (main + sw) · `pnpm lint` ✅ (101 files) · `pnpm test` ✅ 145/145 (25 files) · `pnpm build` ✅ (SW: 69 URLs / 1.53 MB).

## Pre-commit fixes made before the Sub-spec 1 + 2 commit (2026-09-06)

Running `pre-commit` surfaced three things, all fixed:

1. **Biome pre-commit hook pinned to 1.9.4** in both `.pre-commit-config.yaml` and `.pre-commit-config.ci.yaml` — can't parse the 2.x `biome.json` schema (`includes`, `preset`). Bumped both to `@biomejs/biome@2.5.11` (matches `package.json` + `$schema`). `biome check --write` at 2.5.11 then re-sorted imports in 28 `lib/content/**` + `app/**` files (`organizeImports`, no logic change) — the prior session migrated `biome.json` to 2.x but never ran `biome check`/`format` after, so those files kept 1.x import ordering. Accepted the one-time reformat (typecheck + 145 tests still green); those files are heavily edited in `cutover.md` anyway.
2. **`tsconfig.json` was in Biome's scope** — Biome and `next build` (which rewrites `tsconfig.json` every run) would fight over its formatting forever. Added `!tsconfig*.json` + `!next-env.d.ts` to `biome.json` `files.includes`.
3. **`codespell` false positives in `pnpm-lock.yaml`** — real npm package names and integrity-hash fragments flagged as typos. Added `pnpm-lock.yaml` to the `--skip` list in both configs.
4. **`content/backlinks.json` + `content/broken-links.json` committed as Python output, not the Node baseline.** sub-spec-1-exit.md says the Node-generated versions "become the new committed baseline" — but `ci.yml` still has `backlinks` / `broken-links` / `search-index` / `cache-version` jobs that run the Python scripts and `git diff --exit-code`. Committing Node key-order would turn those 4 CI jobs red. The pre-commit `build-backlinks` / `build-broken-links` hooks also regenerate them from Python on every commit. So the files stay Python-ordered until `post-cutover.md` Phase 8 retires the Python generators + those CI jobs; the Node build's semantic equivalence is already proven (`tests/content/equivalence.test.ts`). `search-index.json` is byte-identical either way.
5. **Deleted `lib/content/.render-cache/`** — 171 stale hashed HTML files, zero code references, leftover from the removed `render-cache.ts` optimisation (`content-foundation.md` Phase 7). Never committed. Tests green without it.
