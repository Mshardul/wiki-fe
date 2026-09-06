# Next.js Migration — Architecture Design

**Status:** Draft for review
**Scope:** Frontend technology transition only. `wiki-fe` moves from vanilla-JS/no-build to Next.js (App Router, static export, TypeScript, pnpm). No UI/UX changes, no new features, no `wiki-be` changes beyond a CORS allowlist ticket.
**Companion docs:** `interview-mode-content-stub.md` (separate, content strategy — not part of this pass).
**Structure:** one spec, five serial sub-specs (§5). Sub-spec 3 is the atomic cutover; it ships a deliberately reduced feature set and Sub-spec 4 ports the rest onto the live app.

---

## 1. Why

The app has outgrown the no-build stance that `fe-no-node-phase1` recorded. Concretely:

- **~13,150 lines of JS across ~60 ES modules**, ~29 CSS files. This is past the size where hand-wired modules, `window.*` globals for inline `onclick`, and a hand-maintained service-worker precache list stay manageable. There is no component model, no type checking, and no lint/format that understands the code.
- **The content pipeline is the app's backbone and it is currently client-side** (Showdown in the browser, a custom `$$` math extension, client-rendered Mermaid, client syntax highlighting, plus offline `search-index.json` / `backlinks.json` generators). Moving rendering to build time removes a class of runtime failure, shrinks the client shell, and makes the pipeline testable — the single highest-value change.
- **Hash routing** (`/#dsa`, `/#/system-design/load-balancer`) means no real per-article URLs — browser history, bookmarks, and copy-paste links all degrade. Real paths fix that for the reader today; they also make the site crawlable, which matters at public launch (§14) but is not a driver now.
- **Two new surfaces are coming** — an interview-prep content layer and a quiz mode — both of which want a real component model and real routing rather than more view modules bolted onto `router.js`.

**What the new stack actually delivers (honest model):** the article *body* is HTML rendered at build time at a real URL — readable before any JavaScript runs, correct in browser history and bookmarks. Interactive features (TOC controls, hover-previews, search, auth, highlights, notes) attach on top as islands; they do not block first paint. This is **not** a JavaScript-free reader — the client shell is still substantial (§9). The concrete wins over today: no client-side markdown parsing, no client Mermaid rendering, no client syntax highlighting, a typed component model, a testable pipeline, faster first contentful paint, and real per-article URLs.

**The wiki is a personal reference tool.** It is reachable on the public internet (GitHub Pages) but has no users other than the author and is not advertised, indexed, or search-optimised. Discoverability / SEO / social unfurling become relevant only at a future public launch (§14) and are **not** goals of this migration. Migration exit gates test maintainability, correctness, and the reader experience — not search ranking.

Next.js runs **at build time only**; production is static files (`output: 'export'`) with no Node server, hosted on GitHub Pages exactly as today (`git`-authored markdown, offline-first, ~zero infra cost) while giving a build step, a component model, TypeScript, and real multi-page URLs.

---

## 2. Long-term direction (Shape C) — forks kept open, nothing designed here

The stated long-term vision is a **multi-user product**: accounts at scale, community-contributed content, moderation, possibly paid tiers. That is a different product with its own epics and is explicitly **out of scope** for this migration. It is recorded here only so today's choices do not force a second migration later.

**Forks this migration deliberately keeps open:**

| Fork | Kept open by |
| --- | --- |
| Static export → server runtime (Vercel/Fly) for auth'd SSR pages, contribution APIs | Not adopting any static-only pattern that a server-runtime build could not also serve. App Router structure is server-capable; `output: 'export'` in config makes it static. Flipping it is bounded — not a re-architecture — but it is more than one line: remove `output: 'export'`, pick a Node host, revisit the service-worker registration scope, move `lib/api` calls behind route handlers if a BFF is wanted, and re-check the `wiki-be` CORS allowlist for the new origin. `lib/api`'s framework-independence and the App Router structure are what keep the change bounded. |
| Client-direct API calls → BFF layer (Next route handlers in front of `wiki-be`) | `lib/api` is a single typed client module with no framework coupling — a server-side caller can reuse it unchanged. |
| Subpath (`/wiki-fe`) → custom domain / root | `basePath` is centralised in `next.config.js` + one runtime constant. A domain move is a config change plus DNS. |
| Python e2e → `@playwright/test` (TS) | Tracked as a **post-migration epic** (§10). Python suite is retained through all five sub-specs as the regression net, then retired once its TS replacement is proven. |

**Explicitly NOT in this migration:** OAuth / social login, Postgres, contribution CMS, moderation tooling, billing, analytics dashboards, a re-architected search index (e.g. a proper inverted index / a search library — the migration only moves the *existing* `search-index.json` generator from Python to Node with an unchanged shape), SVG pan-zoom for large diagrams. Each is a separate future epic. The migration replicates today's feature set on a new stack — nothing more.

---

## 3. Target stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | **Next.js, App Router** | RSC-by-default; layout segments map cleanly to future surfaces (wiki / interview / quiz / dashboards). |
| Build output | **`output: 'export'`** (static) | Emits plain `.html` + hashed assets. No Node server in production. Hosts on GitHub Pages exactly as today. |
| Hosting | **GitHub Pages**, project subpath `mshardul.github.io/wiki-fe/` | `basePath: '/wiki-fe'`, `assetPrefix` set, service-worker scope `/wiki-fe/`. Custom domain deferred (§2). |
| Language | **TypeScript** | Supersedes `fe-no-node-phase1`. Content model, API client, and components are typed. |
| Package manager | **pnpm** via `corepack` | Pinned to an exact version (`corepack prepare pnpm@<x.y.z>`), not `@latest`. Lighter `node_modules`, faster CI, strict resolution. |
| Node | **24 LTS, exact** | Same exact version in `.nvmrc`, `package.json` `engines`, and `setup-node` — not a floating `24`. |
| Schema validation | **zod** | Validates `data/*.json` on load and the build-time `manifest.json`. |
| Styling | **Faithful CSS port** | Existing `css/**` moved nearly as-is, imported in the root layout. `tokens.css` unchanged (one addition: `--diagram-*` tokens for §7). No Tailwind, no CSS Modules, no CSS-in-JS. UI/UX revamp is a separate later effort. |
| Markdown | **In-house content layer + `unified` (remark/rehype) plugins** | §6. |
| Syntax highlighting | **Shiki** (build-time) | Replaces highlight.js. No client highlighting JS. |
| Math | **`remark-math` + `rehype-katex`** (build-time) | Replaces the custom `$$` Showdown extension. |
| Diagrams | **`rehype-mermaid`** (build-time SVG) + CSS-variable theming, spike-gated | §7. Client-island fallback (mermaid.js, precached) is pre-authorised if the spike is not cleanly green or the build cost is high. |
| Offline / PWA | **`@serwist/next`** (injectManifest mode; Workbox under the hood) | Precache shell + assets; runtime-cache articles on visit; user-driven save/evict over the article cache. Replaces the hand-maintained SW. §8. |
| Lint / format | **ESLint flat config (correctness) + Biome (format/style)** | ESLint owns TS/React/hooks/Next/a11y; Biome owns formatting and keeps `noConsole`. Zero rule overlap. Single-line-comment rule (`feedback-single-line-comments`) carries. |
| e2e | **pytest + Playwright (Python)** through the migration | Selector/URL updates only. TS port is a post-migration epic (§14). |
| Unit / integration | **Vitest** | Fixture-first (red-green) for the remark/rehype plugins and pure `lib/` logic; code-then-test for ports of known-good vanilla modules. |
| CI | **GitHub Actions**: pnpm build → deploy `out/` to Pages | New build job precedes the Pages deploy. First real Pages deploy is the cutover itself; earlier sub-specs verify the build locally. |

---

## 4. App structure & routing

### Target directory layout

```
wiki-fe/
  app/                      Next App Router tree
    layout.tsx              root layout: imports global CSS, mounts chrome (topbar, toast, modals), SW registration
    page.tsx                home — vertical cards
    [vertical]/
      page.tsx              one vertical's index (sections parsed from its index.md)
      [...slug]/
        page.tsx            one article — generateStaticParams over the manifest
    changelog/page.tsx
    offline/page.tsx
    dashboard/page.tsx
    admin/page.tsx
    not-found.tsx           → emitted as 404.html by static export
  components/               React components (shape — per-view vs per-feature — settled in §13, recorded in CONVENTIONS.md)
  lib/
    content/               in-house content layer (§6): discovery, pipeline, manifest, links, toc
    verticals.ts           the vertical registry (replaces the WIKIS array in js/state.js) — see below
    api.ts                 single typed wiki-be client (ported from js/api.js in Sub-spec 3)
    search/                client-side ⌘K index + scoring, built from the manifest
    storage/               localStorage domains + cache-through sync hooks
  content/                 unchanged — git-authored markdown, same paths
  css/                     unchanged — faithful port, imported by app/layout.tsx
  public/
    data/*.json            glossary, shortcuts, summaries, synonyms — served as static assets
    sprite.svg             Tabler icon sprite
  scripts/                 the four Python generators + bump_cache_version.py retired in Sub-spec 5
  next.config.js           output: 'export', basePath: '/wiki-fe', assetPrefix
  tests/                   Python + Playwright e2e — unchanged location, selectors updated
```

### The vertical registry

Today `js/state.js` holds a `WIKIS` array — `{ id, title, description, icon, color, indexPath, articleCount }` per vertical — and that one array gives each vertical a home card, an index view, and routing. This becomes `lib/verticals.ts`, a typed config, consumed at build time:

- Drives `generateStaticParams` for `app/[vertical]/` (one entry per `id`).
- `indexPath` → the vertical's `index.md`, parsed by the content layer for its section structure.
- `articleCount` is **derived** from the manifest at build, not hand-maintained (today's values drift — `dsa` is stored as `0`).
- Adding a vertical (interview mode, later) stays "add one config entry", same as today.

### Routing rules

- **URL shape:** `/{vertical}/{...slug}` where slug is the article's path under the vertical, minus `.md`. `content/dsa/patterns/sliding-window.md` → `/dsa/patterns/sliding-window`. Nested folders (`data-structures/`, `algorithms/`, `patterns/`, `hld/`, `components/`, `paths/`, `cheatsheets/`) become path segments.
- **No hash routing.** Today's `/#dsa` / `/#/system-design/load-balancer` URLs **break** and are not redirected — the site is not in production, so no redirect shim is built. Documented here so it is a decision, not an accident.
- **Trailing slash:** pick one and set `trailingSlash` in `next.config.js` explicitly (static export + Pages serves `/{vertical}/{slug}/index.html`; the config decides whether the canonical URL carries the slash). Lean: `trailingSlash: true` — it is the static-export default and avoids per-asset path surprises under `basePath`.
- **404:** `app/not-found.tsx` → static export emits `404.html`, which GitHub Pages serves for any unmatched path.
- **`basePath`:** every internal link and asset resolves under `/wiki-fe`. Use `next/link` and the `assetPrefix`-aware helpers, never hand-built absolute paths.

---

## 5. Migration strategy — five serial, finish-to-completion sub-specs

**Hard rule (user constraint): no wasted effort.** Nothing built in an earlier sub-spec is replaced, removed, or rewritten by a later one. Once a sub-spec's implementation starts, it runs to completion.

**What "no wasted effort" does and does not mean.** It forbids building something and then tearing it out. It does **not** require every feature to land at cutover. Porting feature X to the new stack *after* the vanilla app is deleted is not rework — vanilla-X is gone, Next-X is new code, nothing is replaced. So the migration cuts over on a **deliberately reduced feature set** (Sub-spec 3), then ports the remaining features onto the now-live Next app (Sub-spec 4). The conventional "scaffold → shim → port piece by piece" approach is still ruled out, because its shims are throwaway.

**Accepted tradeoff (user-confirmed):** between the Sub-spec 3 cutover and Sub-spec 4 completion, the live site is **missing** the non-critical features (dashboard, admin view, changelog view, highlights, notes, complexity-comparator). The site is not in production; a few weeks of a leaner live app is acceptable.

**Deploy-on-merge (user decision):** work goes straight to `main`, and the CI build auto-deploys `out/` to Pages. So each sub-spec's state — including the reduced Sub-spec 3 cutover — goes live the moment it merges. This is consistent with the accepted tradeoff above (not in production). Sub-specs 1–2 are pure addition and do not change what the live vanilla app serves; Sub-spec 3 is the switch.

**Dropped, not ported (user decision — see §9):** quiz-me table mode, home parallax, study-feedback (haptic/tone), `?debug` overlay, freeze-frame export, and all three node-graph overlays (link-graph, section-map, index-graph) plus their shared `graph-engine`. The "Mentioned by" backlink spine stays — it is a text panel, not the graph. Reasons: decoration the coming UI/UX revamp will redo (parallax), niche/settings-gated (study-feedback), dev-only (`?debug`), high port cost / low use (freeze-frame, graph overlays), or superseded by the future quiz surface (quiz-me).

| Sub-spec | What | Touches vanilla app? |
| --- | --- | --- |
| 1 | Content foundation | No — pure addition |
| 2 | App skeleton + deploy pipeline proof | No — pure addition |
| 3 | Cutover-critical app, **atomic replacement** | Yes — deletes it |
| 4 | Post-cutover feature port | No — adds to the live Next app |
| 5 | Meta + hardening | Docs/CI only |

### Sub-spec 1 — Content foundation (pure addition)

Build the complete build-time content system as a **real, importable library** — `lib/content/*` with the exact function signatures the Sub-spec 2 route files will call (`getVerticals()`, `getArticle(slug)`, `getArticleSlugs()`, `getManifest()`, …). **Touches nothing in the running vanilla app.** It is exercised by its own unit tests plus a thin render harness that *calls those same public functions* — a caller, not a second implementation. Sub-spec 2 imports this library unchanged; nothing here is rewired or replaced later.

Vanilla keeps shipping from `index.html` throughout.

Delivers:

- **`lib/content/` — in-house content layer:**
  - Discovery: walk each vertical's `index.md`, resolve the ordered article list (preserve today's "nothing globs the directory" rule).
  - Frontmatter: `gray-matter`. Today's articles have **no YAML front matter** — the loader treats frontmatter as optional and derives title from the leading `# H1`.
  - Typed model: `Article { path, slug, verticalId, title, headings[], prerequisites[], html, excerpt, byteSize, isStub, shapeFingerprint, readingTimeMin }`.
- **`lib/content/pipeline.ts` — the `unified` processor:** `remark-parse` → `remark-gfm` → `remark-math` → custom remark plugins for the app's markdown dialect → `remark-rehype` → `rehype-katex` → `rehype-slug` → `rehype-autolink-headings` → `rehype-mermaid` → Shiki highlight → `rehype-stringify`. Config owned in-house; plugins are dependencies.
- **Build-time vs runtime — the split that governs what becomes a pipeline plugin.** The vanilla `js/content/*.js` files each do two jobs: (a) *produce markup* from the markdown, and (b) *wire browser interactions* onto rendered content. Only (a) belongs in the pipeline. (b) is a React island in Sub-spec 3, attaching handlers to the markup the pipeline already emitted.
  - **Pipeline plugins (Sub-spec 1)** — callout syntax → `<div class="callout …">`, prerequisites block → chip markup, tabbed-code-block markup, footnotes (`remark-gfm`), anchor-link injection (`rehype-autolink-headings`), `viz` fenced blocks → SVG (`structure-viz.js`), bare-video-URL → embed markup (`video-embed.js`), DSA practice-answer wrappers (`practice-toggle.js`), flat-siblings→nested containers (`section-wrap.js`), glossary/caveat **markers** (`glossary-caveats.js` — the `<span>` markup only), comparison-table markup + column metadata (`tables.js` — table only). Roughly the markup-producing ~200 lines of `formatting.js` plus the four small transform files.
  - **Runtime islands (Sub-spec 3)** — in-article find, focus mode, LaTeX toggle-to-source + copy buttons, code-block copy/line-number wiring, zoom-lightbox, glossary/caveat popover *reveal behavior*, comparison-table sort + column-toggle + scroll cues, collapsible-callout toggle. The interaction half of `formatting.js`, `code-blocks.js`, `glossary-caveats.js`, `tables.js`.
  - **Do NOT port all 823 lines of `formatting.js` as markdown plugins** — it is roughly half markup, half runtime behavior; splitting it is the point.
- **`lib/content/manifest.ts` — build-time `manifest.json`:** every article's path, slug, title, heading tree, prerequisites, excerpt, byte size, stub flag, shape fingerprint, reading time. Drives search, hover-previews, index views, related-articles, and the changelog view's filename→article resolution.
- **`search-index.json` + `backlinks.json` — reconcile with the existing generators.** The repo commits `content/search-index.json` (via `scripts/build_search_index.py`, CI-gated) and `content/backlinks.json` (via `scripts/build_backlinks.py`, reads the search index, CI-gated). Decision for Sub-spec 1: **fold both into the Node content build** so one `next build` produces manifest + search index + backlinks, and retire the two Python scripts + their CI jobs. The **data** the consumers (`search`, related-articles) see must be equivalent; the serialization will not be byte-identical (Python `json.dumps` vs Node `JSON.stringify` differ on key order, whitespace, unicode escaping) and that is fine. The Node-generated files become the new committed baseline.
- **`lib/content/links.ts` — build-time cross-link validation:** every `[text](./x.md)` and cross-vertical link must resolve to a real article, else the build fails. Replaces the lychee pre-commit hook with an unskippable check.
- **`lib/content/toc.ts` — heading-tree extraction** from hast, attached to the article model.
- **Mermaid CSS-variable theming — spike first (§7), then implement.** Acceptance: diagram text colour, background, borders, node fills, edge lines all change with the app theme via CSS variables, no reload, no diagram JS.

Exit criteria: the render harness runs every file under `content/**` through the public `lib/content` functions with zero errors; `manifest.json` is produced and schema-validated; `search-index.json` + `backlinks.json` are produced and **semantically equivalent** to the Python output (parse both, deep-compare objects with key order normalised — not `git diff`); link-check passes on real content; math output diffed against the current Showdown render with discrepancies resolved; the Mermaid theming spike is resolved (pass → CSS-variable theming; fail → documented fallback to a diagram-only client island).

### Sub-spec 2 — App skeleton + build pipeline proof (pure addition)

Stand up the Next project and prove the riskiest infra assumptions **before** porting any feature. New directory, does not touch vanilla. **No remote deploy in this sub-spec** — this is a single-person repo with one `github.io` site; a staging deploy would only overwrite the live vanilla app. Everything is verified against a local production build (`pnpm build` + a static server over `out/`). The first real Pages deploy is the cutover itself (Sub-spec 3).

Delivers:

- Next App Router project, TypeScript, pnpm, exact-pinned Node. `output: 'export'`, `basePath: '/wiki-fe'`, `assetPrefix` set.
- A skeleton route tree (`/`, `/{vertical}`, `/{vertical}/{...slug}`) whose `page.tsx` / `generateStaticParams` **import Sub-spec 1's `lib/content` functions directly** — no new content logic here, just wiring the library into routes. Renders real article HTML. Content rendering proven end to end, no interactivity yet.
- CSS port: `css/**` moved in nearly as-is, `tokens.css` unchanged (bar the `--diagram-*` addition), imported in the root layout. Verify the cascade still resolves.
- PWA integration wired (`@serwist/next`), service-worker scope `/wiki-fe/`, offline model per §8 — shell precache + runtime article caching. No save/evict UI yet.
- CI `build` job: pnpm install (frozen lockfile) → (if the Mermaid spike chose build-time SVG) install + cache Chromium → `next build` → link-check gate. The job **builds and validates**; it does not deploy. A `frontend` job runs typecheck + lint + test on every push.
- **`wiki-be` CORS check:** confirm the production origin the FE will call from (`mshardul.github.io`, same as today) against `wiki-be`'s current CORS allowlist. File the `wiki-be` ticket now if any change is needed — the personal layer ships at cutover and cannot break at the switch.
- Local verification: `pnpm build` then serve `out/` statically — confirm every asset loads under `/wiki-fe`, routing works, SW registers in scope, an article renders and re-themes (including its Mermaid diagrams). Measure the full-corpus build time and record a ceiling.

Exit criteria: local production build renders every route correctly under `/wiki-fe/`; `basePath`/asset/SW-scope verified against the served `out/`; article HTML renders and themes correctly; full-corpus build time recorded; CI `frontend` + `build` jobs green; `wiki-be` CORS confirmed (ticket filed if needed).

### Sub-spec 3 — Cutover-critical app, atomic replacement

The reduced-but-complete app. When this ships, `index.html` + `js/**` + `wiki-sw.js` are **deleted** in the same release. No dual router, no dual service worker.

**In scope — the cutover-critical set:**

- Reader: server-rendered article HTML, TOC sidebar + progress ring + sticky section header + per-heading collapse, hover link-previews (manifest excerpts), prerequisites chips, related-articles + "Mentioned by" backlink spine (text panel, from `backlinks.json`), callouts (all variants, collapsible), anchor links, LaTeX toggle/copy, tabbed code blocks, footnotes, in-article find, glossary popovers + inline caveat reveals, `viz` diagrams, code-block header/copy/line-numbers, comparison-table interactive layer (sort, column-toggle, scroll cues), zoom-lightbox, reading-time, read-tracking + fade-by-days, stub detection + treatment, focus mode.
- Home + index: wiki cards, per-vertical index sections, index-card swipe (bookmark/read), pull-to-refresh, key nav, learning-path progress bars.
- Routing: real deep-linkable paths, back/bookmarkable, breadcrumb + page title, wiki-switcher, scroll-to-top, 404.
- Search: ⌘K modal, client-side index from the build output, synonym expansion, fuzzy scoring, section-filter (`>`), snippet extraction, recent searches.
- Auth UI: login / register / email-verify / logout, live 5-rule password checklist, anon→logged-in migration. Ported from `js/auth.js`.
- `lib/api.ts`: single typed `wiki-be` client — base-URL detect (localhost → `:8001`, else Render), bearer token, `ApiError`, global 401 → session-expired. Client-direct (no BFF). Cache-through preserved: local read path, API durable, fire-and-forget writes, graceful offline degradation.
- Synced domains: bookmarks (+ ⌘B modal), recents, read-tracking, completions.
- Settings: theme (light/dark/system + computed background presets), preferences modal, distraction-free, keyboard-shortcuts tab, print stylesheet + print-article trigger, "clear my data".
- Per-article local: table-column prefs, scroll-position/collapse cache.
- Mobile: TOC drawer, swipe gestures, panel-close registry, viewport handling, responsive layout.
- Core chrome: topbar, toast queue, icon system (sprite inlined) + icon tooltips, modal registry (shared focus-trap + open-state).
- PWA: save-for-offline + per-article evict (`/offline` view), offline fallback for uncached articles, install prompt + iOS add-to-home nudge, web app manifest.

**Deferred to Sub-spec 4 (NOT on the live site during the gap):** progress dashboard view; admin view; changelog view; per-article highlights + inline markers; per-article notes scratchpad; complexity-comparator modal.

Exit criteria: cutover-critical checklist green; Python e2e suite (subset covering shipped features) passes against the Next build; static export deploys to Pages at the subpath (the first real deploy), every route loads, offline verified, each page has a correct `<title>` and the old service worker is cleanly replaced; vanilla app deleted in the same commit range. No SEO metric is a gate (§14).

### Sub-spec 4 — Post-cutover feature port (adds to the live Next app)

Port the deferred features onto the now-live Next app, one coherent group at a time. Each is new code; nothing is replaced. Suggested order (highest user-visible value first): highlights + notes → complexity-comparator → changelog view → dashboard → admin view.

Exit criteria: every Phase-4 row in §9 shipped; full Python e2e suite passes against the Next build.

### Sub-spec 5 — Meta + hardening (only after 3 ships; may overlap 4 in the plan)

- Rewrite `CLAUDE.md` (tech stack, FILE MAP for the new `app/` + `lib/` + `components/` layout, task→file routing, session protocol, the search-index/backlinks generator change), `CONVENTIONS.md` (TS + Next conventions; the new Vitest testing rule; keep SRP / size-signal / DRY / single-line-comment rules), `readme.md` (architecture section).
- Supersede the `fe-no-node-phase1` memory; add a memory recording the new stack.
- Update the `wiki` root `CLAUDE.md` fe-stack line and the `js/api.js` → `lib/api.ts` coupling-point line.
- Python e2e: final selector/URL sweep, CI wiring against the built site.
- Retire `scripts/build_search_index.py`, `scripts/build_backlinks.py`, `scripts/build_broken_links.py`, `scripts/validate_bridges.py`, `scripts/bump_cache_version.py`, and their CI jobs (superseded by the Node build in Sub-spec 1; no `wiki-sw.js` to version-bump).
- CI final form: pnpm install → (if build-time Mermaid) Chromium install (cached) → `next build` (one step produces manifest + search index + backlinks + broken-links + bridges + Mermaid SVGs) → link-check gate → deploy `out/` to Pages. Lint = ESLint + Biome, both targeting TS.
- Confirm the `wiki-be` CORS ticket filed in Sub-spec 2 is resolved.

Exit criteria: docs match shipped code; CI green end to end; the `wiki-be` ticket is resolved.

---

## 6. Content pipeline — in-house glue, off-the-shelf parsing

**Line drawn:** the app owns discovery, validation, and app-specific derived data. It does **not** own markdown parsing or standard transforms.

**In-house (`lib/content/`):** discovery via `index.md`, the typed `Article` model, `manifest.json` + `search-index.json` + `backlinks.json` generation (the latter two replacing `scripts/build_search_index.py` and `scripts/build_backlinks.py` — same output shapes), cross-link validation, TOC extraction, excerpt generation, stub detection (byte-size threshold — today ~5000 bytes), shape fingerprints, the `unified` pipeline *configuration*, and custom remark/rehype plugins for the app's own markdown dialect (prerequisites blocks, callout syntax, `viz` fenced blocks, bare-video-URL embeds, DSA practice-answer toggles, glossary/caveat markers, the flat-siblings→nested-container transform from `section-wrap.js`).

**Dependencies (not reimplemented):** `unified`, `remark-parse`, `remark-gfm`, `remark-math`, `remark-rehype`, `rehype-katex`, `rehype-slug`, `rehype-autolink-headings`, `rehype-mermaid`, `rehype-stringify`, `shiki`, `gray-matter`.

**Rationale:** the parser and standard plugins are a decade of CommonMark/GFM edge cases and get spec + security updates for free. The convenience wrappers (Contentlayer — semi-abandoned; Velite) own discovery and schema in a way that would fight the `index.md` convention, stub detection, and shape fingerprints — ejection would follow within weeks. Owning ~250 lines of stable loader is cheaper than fighting a wrapper's assumptions permanently. This layer is built once in Sub-spec 1 and never replaced — it is the app's core.

**MDX:** not used for wiki content (plain markdown pipeline). Whether interview-mode / quiz pages need MDX for embedded interactive components is decided in the interview-mode doc, not here. The pipeline stays plain and swap-friendly.

---

## 7. Mermaid — build-time render preferred, client-island fallback pre-authorised

> **RESOLVED (spike executed 2026-09-01, `nextjs-migration/mermaid-spike-result.md`):** the preferred build-time-SVG path is **NOT** used. `theme: "base"` + a `themeCSS` block re-themes flowcharts (26 of 32 corpus blocks) but not sequence / gantt / xychart-beta — those bake presentation attributes on text and bars that CSS can't override, unreadable in dark mode. The **pre-authorised client-island fallback is taken**: the pipeline emits `<pre class="mermaid">` raw source, `components/reader/MermaidDiagrams.tsx` renders it client-side with `mermaid.run()` and re-themes on theme change via `themeVariables` read from the live `--diagram-*` tokens. `mermaid` is a precached client dependency. No Chromium anywhere. The §12 risk row and all `nextjs-migration/*` phase files reflect this. The rest of this section is the original design rationale, kept for context.

**Requirement (hard):** diagrams must re-theme with the app — text colour, background, border colour, node fill, edge lines — instantly, no reload.

**Preferred approach (build-time SVG):**

1. `rehype-mermaid` renders each ` ```mermaid ` block to SVG **at build time** (headless Chromium). SVG is inlined in the page HTML. Zero client rendering JS, no load flash, works fully offline. CI installs Chromium before the build, caches the browser between runs, and reuses one instance across all diagrams to bound the cost.
2. Mermaid is configured to emit **CSS-variable-driven colours** (via `themeCSS` / `themeVariables` referencing `var(--diagram-*)` tokens defined in `tokens.css`) rather than hardcoded hex. The existing theme system already flips CSS variables on theme change; the inlined SVGs inherit the new values with **no JavaScript**.

**Spike (Sub-spec 1, before anything builds on it):** confirm the current Mermaid version's SVG output can be fully driven by CSS variables through `themeCSS`, and that the full-corpus build cost is acceptable.
- **Clean pass + acceptable build cost** → build-time SVG as above.
- **Spike not cleanly green, OR the build-time cost / CI flake is high** → **client-island fallback**: mermaid.js added to the app-shell precache (~500 KB, one-time, cached after the first diagram page), diagrams render client-side on mount and re-theme by re-render. This is a pre-authorised fallback, not a failure — the site is not public, so the build-time path's SEO benefit does not apply, and the theming requirement is met either way. Do not treat Chromium-in-CI as a hard blocker; if it is troublesome, take the fallback.

**Not in scope:** interactive pan/zoom on large diagrams. Tracked as a separate post-migration ticket (opt-in ~10 KB `svg-pan-zoom` island per diagram, not global, not mermaid.js).

---

## 8. Offline / PWA

**Requirement:** offline reading stays a first-class feature and keeps today's model — a small precached shell plus user-chosen articles, not the whole site.

**Model (a) — shell precache + user-chosen articles.** A Next PWA integration (Workbox under the hood) replaces the hand-rolled `wiki-sw.js`:

- **Precache at SW install:** the app shell only — hashed CSS/JS/font assets, the web app manifest, the home and per-vertical index routes, `data/*.json`. **Not** article bodies.
- **Runtime-cache on visit:** when the user opens an article, its pre-rendered HTML + page-specific assets are cached (stale-while-revalidate) so recently-read articles work offline without an explicit save.
- **"Save for offline"** (today `js/storage/offline.js`): explicitly fetches and caches an article + its assets into the article cache. The `/offline` shelf lists saved articles with last-cached date and a per-article evict button. Evict removes from the article cache.
- **Offline fallback:** an uncached article requested offline shows an offline-state page (replaces today's `OFFLINE_FALLBACK_MD` string hack with a real route).
- **Why not precache everything:** the catalog is growing (interview mode, quiz mode content will multiply it); shipping the entire site into every visitor's Cache Storage is wasteful for the majority who read a handful of articles, and it makes save/evict meaningless. Model (a) keeps the cache small and user-controlled — and matches current behaviour (faithful-port principle).
- **`wiki-be` calls degrade gracefully offline** — already true (cache-through, fire-and-forget writes); preserve that.
- **Service-worker scope** must be `/wiki-fe/` to match the subpath.

Net vs today: articles are cached as whole pre-rendered HTML documents instead of fetch-the-`.md`-and-client-render, so offline reading is more robust — but the *what gets cached* policy is unchanged.

---

## 9. Feature disposition — shipped / deferred / dropped

Where each feature lands, matching §5. The **Phase** column: **1/2** = built in the foundation/skeleton sub-specs; **3** = cutover-critical (live at cutover); **4** = ported after cutover (absent from the live site during the gap); **5** = hardening. Features **dropped** (not ported at all) are listed after the table, with rationale — matching the drop list in §5.

| Feature | Phase |
| --- | --- |
| **Content / reading** | |
| Two verticals (SD, DSA), home cards, per-vertical index | 3 |
| `index.md`-driven discovery; GFM, tables, fenced code | 3 |
| Syntax highlighting (→ Shiki, build-time) | 3 |
| Math (→ `remark-math`/KaTeX, build-time) | 3 |
| Mermaid (→ build-time SVG + live CSS-variable theming) | 3 |
| TOC + sticky section header + per-heading collapse + progress ring | 3 |
| Hover link-previews (manifest excerpts) | 3 |
| Prerequisites chips (Must/Should); cross-vertical links | 3 |
| Stub detection + visual treatment; shape fingerprint | 3 |
| Reading-time estimate; read-tracking + fade-by-days-since-read | 3 |
| Callouts (all variants, collapsible); anchor links | 3 |
| LaTeX toggle/copy; tabbed code blocks; footnotes; in-article find | 3 |
| Glossary popovers + inline caveat reveals | 3 |
| `viz` fenced-block data-structure diagrams | 3 |
| Bare YouTube/Vimeo → responsive embed | 3 |
| DSA practice-answer collapse toggle | 3 |
| Code-block header + copy + line numbers | 3 |
| Comparison-table interactive layer (sort, column-toggle, scroll cues) + table-column prefs | 3 |
| Zoom-lightbox (image + diagram, pinch/pan) | 3 |
| Focus mode | 3 |
| Per-article highlights + inline emoji markers | 4 |
| Per-article notes scratchpad | 4 |
| **Navigation / routing** | |
| Real deep-linkable paths; back-button + bookmarkable | 3 |
| Wiki-switcher; scroll-to-top; breadcrumb + page title; 404 | 3 |
| Related-articles ranking + "Mentioned by" backlink spine (text panel) | 3 |
| Learning-path table parsing + per-track completion bars | 3 |
| Changelog view (`content/CHANGELOG.md` parsed, filename filter, filename→article) | 4 |
| **Search** | |
| ⌘K modal; client-side index from build output; synonym expansion; fuzzy scoring; section-filter (`>`); snippet extraction; recent searches | 3 |
| **Personal layer (via `wiki-be`)** | |
| Login / register / email-verify / logout; live 5-rule password checklist; anon→logged-in migration | 3 |
| Bearer-token session + 401→session-expired | 3 |
| Synced bookmarks (+ ⌘B modal), recents, read-tracking, completions | 3 |
| Cache-through model; graceful degradation offline / BE-down | 3 |
| Admin view (broken-links / backlinks / search-index reports, admin role) | 4 |
| **PWA / offline** | |
| Service worker (Workbox); shell precache + runtime article caching (§8) | 3 |
| "Save articles for offline" + per-article evict (`/offline` view) | 3 |
| Offline fallback for uncached articles; install prompt + iOS add-to-home nudge; web app manifest | 3 |
| **Settings / preferences** | |
| Theme (light/dark/system) + computed background presets; preferences modal | 3 |
| Distraction-free mode; keyboard-shortcuts tab; "clear my data" | 3 |
| Print stylesheet + print-article trigger | 3 |
| **Mobile** | |
| TOC drawer + swipe gestures + panel-close registry + viewport handling | 3 |
| Index-card swipe (bookmark/read); pull-to-refresh; responsive layout | 3 |
| **Chrome / polish** | |
| Topbar; toast queue; icon system (Tabler sprite inlined) + icon tooltips; modal registry | 3 |
| Progress dashboard view (wiki → section → learning-path bars, drill-down) | 4 |
| Complexity-comparator modal | 4 |
| **Build / infra / quality** | |
| Deploy to GitHub Pages (→ via CI build, incl. Chromium install for Mermaid); dead-link check (→ folded into build, hard gate) | 2 |
| `search-index.json` + `backlinks.json` (→ produced by the Node content build) | 1 |
| Biome (→ retargeted to TS); pytest + Playwright e2e (→ selectors updated, logic preserved); GitHub Actions CI | 5 |

**Dropped (user decision, §5):** quiz-me table mode · home parallax · study-feedback (haptic + tone) · `?debug` overlay · freeze-frame selection→image export · node-graph overlays link-graph / section-map / index-graph + shared `graph-engine`. Each is decoration the UI/UX revamp will redo, niche/settings-gated, dev-only, or high-cost/low-use. The "Mentioned by" backlink spine is **kept** (text panel, not a graph).

---

## 10. Testing

- **Through the migration:** the existing pytest + Playwright suite is the regression net. Tests are behavioural (drive a browser, assert DOM/behaviour) and survive a framework change; only selectors and URLs (hash → real paths) change. Sub-spec 3 runs the subset covering shipped (cutover-critical) features; Sub-spec 4 brings the rest back as features are re-ported; Sub-spec 5 does the final sweep.
- **`tests/conftest.py`** and existing fixtures are read before any selector change; no new fixtures added (existing repo rule).
- **Post-migration epic (tracked separately):** port the suite to `@playwright/test` (TypeScript). Rationale — one language across the FE, typed page objects, trace viewer / UI mode, component testing for the growing interactive surface, and alignment with every Next testing resource. Sequenced *after* the migration so known-good tests guard the risky cutover first, then are translated against a stable app with the Python suite as reference. No wasted effort: the Python suite does its job, then retires.

---

## 11. `wiki-be` impact

Near-zero. The FE→BE contract is HTTP + cookie/bearer, framework-agnostic; Next calls it identically to the vanilla app.

**One ticket** (filed in `wiki-be` backlog during **Sub-spec 2**, before the personal layer ships at cutover, `WIKI-BE-xxx`):

- Confirm the `/api/v1` contract is unchanged by the migration.
- Update the CORS allowlist if the Pages origin string changes (it should not — same `mshardul.github.io` origin, same `/wiki-fe/` path; CORS is origin-scoped so likely no change, but verify).
- Record "server-to-server auth for a future BFF/SSR layer" as a deferred item tied to the Shape C / Vercel fork.

No `wiki-be` spec for this pass (user decision).

---

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Mermaid SVG can't be CSS-variable-themed in the current version | **REALISED** (spike 2026-09-01, `nextjs-migration/mermaid-spike-result.md`): `themeCSS` re-themes flowcharts but not sequence/gantt/xychart. Fallback taken — client-island `mermaid` render + re-theme (`MermaidDiagrams.tsx`), library precached as shell. No build-time render, no Chromium. |
| Custom `$$` math extension has content that `remark-math`/KaTeX renders differently | Sub-spec 1 renders **every** article and diffs math output; discrepancies fixed in content or via a small compat remark plugin. |
| Sub-spec 3 cutover is still sizeable even reduced | Split from feature-parity-everything (§5); the implementation plan has internal checkpoints (skeleton proven in Sub-spec 2 → reader → nav → search → auth/sync → offline → cutover). User reviews between plan phases and can resume in a fresh thread. |
| `search-index.json` / `backlinks.json` data drift when moving generation from Python to Node | Sub-spec 1 exit criterion is **semantic equivalence** (parse both, deep-compare objects, key order normalised) — not `git diff` / byte match, which Python vs Node will never satisfy. Python scripts stay as the reference until Sub-spec 5 retires them; Node output becomes the new committed baseline. |
| Interim live site (post-cutover, pre-Sub-spec-4) is missing features users may notice | Accepted, user-confirmed — not in production, deploy-on-merge understood. Sub-spec 4 ordered highest-value-first. |
| `basePath` / SW-scope misconfiguration breaks all asset loading | Verified against a real Pages deploy as the whole point of Sub-spec 2, before any feature port. |
| `formatting.js` (823 lines) is half markup, half runtime behaviour — wrong to port wholesale as pipeline plugins | Explicit build-time-markup / runtime-island split in §6: ~200 lines become remark/rehype transforms, the rest become React islands in Sub-spec 3. Each transform gets a fixture test before app code depends on it. |
| Mermaid render fails in CI (no browser on a fresh runner) | **MOOT** — client-island fallback taken (see above), CI does no diagram render, no Chromium in any job. |
| Static export + App Router edge cases (`generateStaticParams`, no route handlers) | Known constraint; the design uses only build-time data fetching and client-direct API calls, which export supports. |
| CI build becomes a new point of deploy failure, and deploy-on-merge puts each state live | Frozen lockfile, pinned Node, link-check + Mermaid + semantic-JSON checks as explicit gates; a failed build blocks deploy rather than shipping broken. Not in production, so a bad deploy is low-stakes. |

---

## 13. Open items to resolve during implementation (not blockers)

- Next PWA integration — **decided: `@serwist/next`, injectManifest mode** (only maintained option; injectManifest is required for the custom save/evict over the article cache). Re-confirm it is still maintained at the start of Sub-spec 2.
- Whether `data/summaries.json` / `glossary.json` are better regenerated from content at build time or kept as hand-authored assets (lean: keep as-is for the migration, revisit later).
- `data/*.json` load mechanism — static import (bundled, type-checked) vs `fetch` from `public/data/` (matches today, runtime-swappable, precacheable). Lean: `fetch` from `public/data/` for `synonyms.json` / `shortcuts.json` / `glossary.json` (parity + PWA precache), static import only if a build-time consumer needs it.
- Icon sprite — today `js/icon-sprite.js` fetches and inlines `sprite.svg` at runtime. In Next: inline it once in the root layout (single request, no FOUC) or keep the runtime fetch from `public/sprite.svg`. Lean: inline in the root layout.
- Biome vs ESLint+Prettier for TS — Biome is already in the repo; confirm its TS/TSX rule coverage is sufficient or add ESLint.
- Shape of the `components/` directory (per-view vs per-feature) — settle before Sub-spec 3 implementation, record in `CONVENTIONS.md`.
- Whether the `search-index.json` / `backlinks.json` schemas should change at all while being reimplemented in Node (default: keep the same schema — semantic equivalence to the Python output — and let the Node serialization differ; any *schema* change needs its own justification and consumer updates).

---

## 14. What this unlocks (not built here)

- **Public-launch readiness epic** — SEO (sitemap, `robots` allow, canonical strategy, structured data, OG/social images, a Lighthouse-SEO gate), discoverability, and whatever access/analytics decisions a real launch needs. This migration deliberately builds none of it: `robots` is `Disallow: /`, no sitemap is emitted, and no SEO metric is an exit gate. Per-page `<title>` / description / canonical link are added — but for the reader's browser history and link-sharing, not for crawlers.
- Interview-prep content layer (`interview-mode-content-stub.md` → its own full spec later).
- Quiz mode.
- A re-architected search index (proper inverted index / search library) — separate from this migration's like-for-like generator port.
- Custom domain + eventual Vercel cutover for Shape C server features.
- `@playwright/test` (TypeScript) migration of the e2e suite.
