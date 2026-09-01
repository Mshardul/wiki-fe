# Next.js Migration — Implementation Plan Overview

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:executing-plans` to run each phase file task-by-task, inline in-session, stopping for review at every phase boundary. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `wiki-fe` from vanilla-JS/no-build to Next.js (App Router, static export, TypeScript, pnpm) with no UI/UX changes and no new features — replicate today's feature set on a new stack. The driver is maintainability: a typed component model, a testable build-time content pipeline, and real per-article URLs. **SEO/discoverability is not a goal** — the wiki is a personal reference tool with no users but the author; search-facing work is a separate public-launch epic (spec §14).

**Architecture:** Next.js runs at **build time only**; production is static files (`output: 'export'`), no Node server. Markdown renders at build time through an in-house `lib/content/` layer wrapping `unified` (remark/rehype). Article bodies are HTML at real URLs, readable before JS; interactive features attach as per-feature client islands on top. Static `out/` deploys to GitHub Pages at the `/wiki-fe` subpath exactly as today. The **first real Pages deploy is the cutover** (`cutover.md`) — earlier phase files verify the build locally (`pnpm build` + a static server over `out/`), because this is a single-person repo with one `github.io` site and a staging deploy would just overwrite the live vanilla app.

**Spec:** [`../nextjs-migration-design.md`](../nextjs-migration-design.md) — the plan argues from the spec; executors read both. Spec section numbers (§N) referenced throughout the phase files point there.

---

## How this plan is organised

The spec (§5) defines **five serial sub-specs**. This plan groups them into **four phase files**, named by content, not numbered — Sub-specs 4 and 5 are both small, post-cutover, low-risk cleanup and share one file:

| Phase file | Spec sub-spec | What | Touches vanilla app? |
| --- | --- | --- | --- |
| [`content-foundation.md`](./content-foundation.md) | Sub-spec 1 | Toolchain + in-house build-time content layer as an importable library | No — pure addition |
| [`app-skeleton.md`](./app-skeleton.md) | Sub-spec 2 | Next project + route skeleton + local build-pipeline proof + `wiki-be` CORS check | No — pure addition |
| [`cutover.md`](./cutover.md) | Sub-spec 3 | Cutover-critical app; deletes `index.html` + `js/**` + `wiki-sw.js` in the same change; first real Pages deploy | Yes — deletes it |
| [`post-cutover.md`](./post-cutover.md) | Sub-specs 4 + 5 | Port the six deferred features onto the live Next app, then docs / memory / CI final form / retire Python scripts / confirm the `wiki-be` ticket | No — adds to live Next app; docs/CI |

**Inside each phase file:** numbered **Phases** (a coherent block of work with one testable deliverable) → numbered **Steps** (one 2–5 minute action each). A phase file stays one file as long as it is one coherent unit; split a single phase out into its own named file only if the file stops being holdable in one read (roughly ~1500 lines), never for line count alone. No file-count padding — grouping is preferred.

**Ordering** comes from the sub-spec sequence above, not from filenames. Do not start a phase file until the previous one's exit criteria are met and reviewed.

---

## Execution model

- **Inline, in-session.** Run phases with `superpowers:executing-plans`. Do not dispatch subagents per phase.
- **Checkpoint at every phase boundary.** After a phase's last step, stop. Report what shipped against the phase's exit criteria. Wait for review before the next phase.
- **A phase ends at "code works + tests green"** — see the git rule below.

---

## Global Constraints

Every step in every phase file implicitly includes this section. Values are copied verbatim from the spec and the repo; do not re-derive them.

### No version control in this plan

**No git steps anywhere** — no `git add`, no `git commit`, no "commit per step", no branch/merge/PR instructions, no CI-gating-of-deploy framed around commits. A phase or step ends at "code works and its tests pass." Where deploy sequencing matters (the Sub-spec 3 cutover), it is described as *state that must be true*, never as commits. The user owns all version control. (This overrides the `writing-plans` skill's frequent-commit convention.)

### Target stack (spec §3)

| Concern | Choice | Fixed value |
| --- | --- | --- |
| Framework | Next.js, App Router | RSC-by-default |
| Build output | `output: 'export'` | static `.html` + hashed assets, no Node server in prod |
| Hosting | GitHub Pages, project subpath | `basePath: '/wiki-fe'`, `assetPrefix` set, SW scope `/wiki-fe/` |
| Language | TypeScript | strict |
| Package manager | pnpm via `corepack` | pinned to an **exact** version (`corepack prepare pnpm@10.34.5 --activate`), matched in `packageManager`. Never `@latest`. |
| Node | 24 LTS, **exact** | the same exact version (e.g. `24.8.0` — use the current 24 LTS at execution) in `.nvmrc`, `package.json` `engines`, and `setup-node`. Not a floating `24`. (Was 22 in an earlier draft; 24 is the current active LTS as of execution and nothing in the stack caps below it.) |
| Schema validation | zod | validates `data/*.json` on load and the build-time `manifest.json` |
| Trailing slash | `trailingSlash: true` | static-export default; canonical URLs carry the slash (spec §4) |
| Styling | faithful CSS port | `css/**` moved nearly as-is, `tokens.css` unchanged bar an appended `--diagram-*` token block, imported in root layout. No Tailwind, no CSS Modules, no CSS-in-JS. |
| Markdown | in-house `lib/content/` + `unified` plugins | see `content-foundation.md` |
| Syntax highlighting | Shiki (build-time) | replaces highlight.js; no client highlighting JS |
| Math | `remark-math` + `rehype-katex` (build-time) | replaces the custom `$$` Showdown extension in `js/state.js` |
| Diagrams | `rehype-mermaid` (build-time SVG) preferred; client-island fallback pre-authorised | spike-gated — see below |
| Offline / PWA | `@serwist/next`, `injectManifest` mode | Workbox under the hood; replaces hand-rolled `wiki-sw.js` |
| Lint (correctness) | ESLint flat config | `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `@next/eslint-plugin-next`, `eslint-plugin-jsx-a11y` |
| Format + style + CSS lint | Biome (retargeted to TS/TSX) | already in repo at 1.9.4; `noConsole: error` stays; ESLint owns correctness, Biome owns style — zero rule overlap |
| e2e | pytest + Playwright (Python) through the migration | selector/URL updates only; TS port is a post-migration epic (spec §10, §14) |
| Unit / integration tests | Vitest | see the testing rule below |
| CI | GitHub Actions | a `frontend` (typecheck+lint+test) job + a `build` job; **no deploy job until cutover** |

### Testing rule

The TS/Next codebase is tested with **Vitest**, and every unit ends with a passing test. How the test is written depends on what the code is:

- **Fixture-first (red-green)** for the `content-foundation.md` remark/rehype plugins and pure `lib/` logic (api client, storage, search scoring, matrix merge): write the failing fixture test → run it → implement → pass. Spec §12 requires "each transform gets a fixture test before app code depends on it", and for new logic the test earns its cost by pinning the design.
- **Code-then-test** for **ports of known-good vanilla modules** (the `cutover.md` / `post-cutover.md` island ports): port the behaviour from the existing `js/` file, then write the test that locks it. Writing a failing test first here is transcription theatre — the behaviour is already known — but the island still ships with a test.

This **supersedes** the `wiki-fe/CLAUDE.md` line "`test-driven-development` - user runs tests manually; write correct code, skip the TDD loop" — that was for the vanilla-JS/no-build era. `post-cutover.md` updates `CLAUDE.md` / `CONVENTIONS.md` to match; `content-foundation.md` Phase 0 stands up Vitest.

The **corpus smoke** (run every `content/**/*.md` file through the public `lib/content` functions, assert zero throws + schema-valid manifest) is a regression net, written as a Vitest suite but not via failing-test-first.

The **Python e2e suite stays user-run manually** — never run the full suite from a plan step. Individual e2e tests may be run when adjusting a selector.

### Content corpus

- **All files under `content/**/*.md`** (~176 at time of writing — the exact count is never load-bearing; the corpus-smoke test counts them at runtime), two verticals: `system-design`, `dsa`.
- Content dirs: `system-design/{algorithms,components,hld,paths}` + `system-design/index.md`; `dsa/{algorithms,cheatsheets,data-structures,paths,patterns}` + `dsa/index.md`. These folder names become URL path segments (spec §4).
- Articles have **no YAML frontmatter** today — the loader treats frontmatter as optional and derives title from the leading `# H1`.
- `STUB_THRESHOLD = 5000` bytes (from `js/state.js`) — the stub-detection constant to preserve.
- Existing committed generated files: `content/search-index.json` (`scripts/build_search_index.py`), `content/backlinks.json` (`scripts/build_backlinks.py`), `content/broken-links.json` (`scripts/build_broken_links.py`), `content/bridges.json` (`scripts/validate_bridges.py`).

### Routing rules (spec §4)

- URL shape `/{vertical}/{...slug}` — slug is the article path under the vertical, minus `.md`. `content/dsa/patterns/sliding-window.md` → `/dsa/patterns/sliding-window`.
- **No hash routing.** Today's `/#dsa` / `/#/system-design/load-balancer` URLs break and are **not** redirected — no redirect shim is built. (No users but the author; an accepted decision, not an accident.)
- `trailingSlash: true` in `next.config.js`.
- `app/not-found.tsx` → static export emits `404.html`, which GitHub Pages serves for any unmatched path.
- Every internal link and asset resolves under `/wiki-fe` via `next/link` and `assetPrefix`-aware helpers — never hand-built absolute paths.
- **Per-page metadata is for the reader, not crawlers:** each route gets a `<title>` and a description (browser tabs, bookmarks, history, link-sharing) and a canonical link. **No sitemap. `robots` is `Disallow: /`.** No SEO metric is an exit gate. Full SEO is the public-launch epic (spec §14).

### The island rule

Interactive behaviour attaches to the article body as **client islands**. The rule:

- **Markup comes from the build pipeline.** The `unified` plugins (`content-foundation.md` Phase 4) emit the structural markup and data attributes; an island never re-parses markdown and never re-renders the article body.
- **Behaviour lives in React** and works with React-rendered controls **where possible** — TOC, search, tabs, callout collapse, code-copy, table sort: these render their own React UI and only *read* the body or toggle classes/attributes on it. They do not fight hydration.
- **Direct DOM mutation of the body is reserved for the cases that genuinely need it** — Range-based highlight wrapping and emoji-marker insertion at text offsets (`post-cutover.md` Phase 1), which operate on `Range` objects across the rendered text nodes. These are the exception, kept small and isolated.

### Dropped — not ported at all (spec §5, §9)

quiz-me table mode · home parallax (`js/app/home-parallax.js`) · study-feedback haptic/tone (`js/app/study-feedback.js`) · `?debug` overlay (`js/app/debug-overlay.js`) · freeze-frame selection→image export (`js/content/freeze-frame.js`) · all three node-graph overlays — link-graph (`js/app/link-graph.js`), section-map (`js/app/section-map.js`), index-graph (`js/render/index-graph.js`) — plus their shared `js/app/graph-engine.js`.

**Kept:** the "Mentioned by" backlink spine — it is a text panel (`js/render/related-articles.js`), not a graph.

No phase file has steps for any dropped feature. If a dropped file is imported by a file being ported, the import is removed, not replaced.

### Explicitly NOT in this migration (spec §2, §14)

OAuth / social login, Postgres, contribution CMS, moderation, billing, analytics dashboards, a re-architected search index (the migration only moves the *existing* `search-index.json` generator from Python to Node with an unchanged output shape), SVG pan-zoom for large diagrams, interview-mode content layer, quiz mode, **and all SEO/discoverability work** (sitemap, `robots` allow, structured data, OG/social images, a Lighthouse-SEO gate). Each is a separate future epic. No phase file scaffolds any of them — not even a placeholder route.

### wiki is a personal tool

No users but the author. It is reachable on the public internet (GitHub Pages) and that is fine — the content is not sensitive — but it is not advertised, indexed, or search-optimised. Consequence for the plan: **do not** add steps whose only justification is "someone might notice" — no interim-breakage mitigations, no content-edit freeze, no old-URL redirect shim, no dual-render verification window, **no SEO metric as a gate**. **Do** keep every step justified by "this must be right for the author using the tool" or "this must be right for a future public launch that we are not doing now": correctness, real URLs, accessibility, data integrity, a testable pipeline. Deploy straight to `main`; the first Pages deploy is the cutover (`cutover.md`).

---

## §13 open items — decisions for this plan

The spec §13 lists these as "resolve during implementation, not blockers." This plan takes a stance on each; the named phase carries it out.

| Item | Decision | Carried out in |
| --- | --- | --- |
| PWA integration package | `@serwist/next`, `injectManifest` mode. Only maintained option (`next-pwa` is stale); `injectManifest` is required anyway for §8's custom save/evict over the article cache. Re-confirm it is still maintained at the start of `app-skeleton.md`. | `app-skeleton.md` |
| `components/` shape | **Per-feature** folders — each runtime island from spec §5 is a folder (`components/reader/`, `components/search/`, `components/auth/`, …). Shared shells (modal, focus-trap, toast) live in `components/common/`; chrome in `components/chrome/`. Mirrors today's `js/` domain layout. Exact folder list settled in `cutover.md` Phase 1 and recorded in `CONVENTIONS.md`. | `cutover.md` Phase 1 |
| Lint / format | **ESLint flat config (correctness) + Biome (format/style/CSS-lint).** ESLint owns TS/React/hooks/Next/a11y rules; Biome owns formatting and keeps `noConsole: error`. All stylistic ESLint rules disabled so the two never conflict. **The entire toolchain stands up once** in `content-foundation.md` Phase 0 (React/Next ESLint plugins installed then too, inert until `app/` exists). `app-skeleton.md` only verifies those rules now have `.tsx` files to lint and adds the CI `frontend` job — no second setup. | `content-foundation.md` Phase 0 |
| `data/*.json` load mechanism | `fetch` from `public/data/` for `glossary.json`, `synonyms.json`, `shortcuts.json`, `summaries.json`, behind a small typed loader in `lib/` that validates shape with **zod** on load. Parity with today, runtime-swappable, precacheable by the SW (spec §8 precache list names `data/*.json`). Static `import` only if a build-time consumer appears — none does in this migration. | `cutover.md` (loader), `app-skeleton.md` (precache) |
| `summaries.json` / `glossary.json` regeneration | Keep as hand-authored assets for the migration. Revisit build-time regeneration later (spec §13). | — (no work) |
| Icon sprite load | Inline `sprite.svg` once in the root layout (single request, no FOUC). Replaces today's runtime fetch in `js/icon-sprite.js`. | `app-skeleton.md` (layout), `cutover.md` (tooltips island) |
| `search-index.json` / `backlinks.json` schema | **Keep the same schema.** Node output must be *semantically equivalent* to the Python output (parse both, deep-compare objects with key order normalised — not `git diff`; Python `json.dumps` vs Node `JSON.stringify` will never byte-match). The Node-generated files become the new committed baseline. Any schema change needs its own justification and consumer updates — out of scope here. | `content-foundation.md` |
| `broken-links.json` + `bridges.json` (not in spec §5, found in repo) | `scripts/build_broken_links.py` and `scripts/validate_bridges.py` also produce committed JSON that feeds the admin view (spec §9). **Decision:** fold `broken-links.json` generation into the same Node content build (same link-graph data as backlinks); port the `bridges.json` validation to Node alongside it. Both Python scripts retire with the other two in `post-cutover.md`. | `content-foundation.md` (broken-links + bridges), `post-cutover.md` (retire scripts) |
| `wiki-be` CORS timing | The personal layer ships at cutover. **Verify CORS and file the `wiki-be` ticket in `app-skeleton.md`**, not at the end — the production origin is `mshardul.github.io` (same as today, so likely no change), but this is confirmed before cutover, not assumed after. | `app-skeleton.md` |

---

## Mermaid — spike-gated, fallback pre-authorised (spec §7)

**Hard requirement:** diagrams must re-theme with the app (text colour, background, border, node fill, edge lines) instantly, no reload.

**First task of `content-foundation.md` (Phase 1) is a spike:** confirm the current Mermaid version's SVG output can be fully driven by CSS variables through `themeCSS` / `themeVariables` referencing `var(--diagram-*)` tokens, **and** that the full-corpus build cost is acceptable.

- **Clean pass + acceptable build cost** → `rehype-mermaid` renders each ` ```mermaid ` block to SVG at build time (headless Chromium), SVG inlined in the page HTML, zero client rendering JS, no load flash, works offline. `--diagram-*` tokens in `tokens.css` drive theming; inlined SVGs inherit new values with no JavaScript. The rest of the plan assumes this path.
- **Spike not cleanly green, OR build-time cost / CI flake is high** → **repo-wide shared `mermaid.js` client island**: mermaid.js added to the app-shell precache (~500 KB, one-time, cached after the first diagram page), diagrams render client-side on mount and re-theme by re-render. **Pre-authorised — not a failure.** The site is not public, so the build-time path's SEO benefit does not apply; the theming requirement is met either way. This is **one paragraph** in the phase file, not a full step branch; if the fallback is taken, resume planning it then.

**Do not treat Chromium-in-CI as a hard blocker.** If the build-time path is chosen, CI installs and caches Chromium before `next build` and reuses one browser instance across all diagrams; build-time cost is measured once locally on the full corpus in `app-skeleton.md` and a ceiling recorded; CI renders diagrams only for **changed** articles via a per-diagram SVG content-hash cache built in `content-foundation.md`. If any of that proves troublesome, switch to the client-island fallback without ceremony.

---

## Feature disposition summary (spec §9)

The **Phase** column below is the spec's sub-spec number (1–5), i.e. which phase file ships it. Full per-feature table is in spec §9 — not duplicated here. High-level:

- **`content-foundation.md` (1):** `search-index.json` + `backlinks.json` + `broken-links.json` + `bridges` produced by the Node content build.
- **`app-skeleton.md` (2):** local build-pipeline proof (no deploy); `wiki-be` CORS check + ticket; dead-link check folded into the build as a hard gate.
- **`cutover.md` (3):** everything cutover-critical — reader, home + index, routing, search, auth UI, `lib/api.ts`, synced domains, settings, mobile, core chrome, PWA save/evict, per-page `<title>`/description/canonical (reader-facing) + `robots: Disallow: /`. First real Pages deploy. Spec §5 Sub-spec 3 "In scope" list is the authoritative checklist.
- **`post-cutover.md` (4 + 5):** the six deferred features — highlights + inline markers, notes scratchpad, complexity-comparator modal, changelog view, dashboard view, admin view (ported highest-value-first) — then ESLint/Biome final form, e2e selector sweep for the ported features, CI final form, retire the four Python generator scripts + `bump_cache_version.py`, docs + memory rewrite, confirm the `wiki-be` ticket.

**Accepted tradeoff (spec §5):** between the `cutover.md` cutover and `post-cutover.md` Part A completion, the live site is missing the six deferred features. Acceptable — no users but the author.

---

## wiki-be impact (spec §11)

Near-zero. The FE→BE contract is HTTP + cookie/bearer, framework-agnostic. **One ticket** filed in the `wiki-be` backlog during **`app-skeleton.md`** (`WIKI-BE-xxx`), before the personal layer ships at cutover: confirm `/api/v1` contract unchanged, update the CORS allowlist if the Pages origin string changes (same `mshardul.github.io` origin as today, so likely no change — but verify against the real origin, not assumed), record "server-to-server auth for a future BFF/SSR layer" as a deferred item. `post-cutover.md` only confirms the ticket is resolved. No `wiki-be` spec for this pass.

---

## Spec coverage map

Where each spec section is carried out:

| Spec | Phase file |
| --- | --- |
| §1 why / §14 public-launch epic | spec only — SEO deliberately not built; `robots: Disallow: /`, no sitemap, no Lighthouse gate |
| §3 target stack | Global Constraints above; toolchain in `content-foundation.md` Phase 0 (once); `app-skeleton.md` verifies + adds the CI `frontend` job |
| §4 routing | `app-skeleton.md` Phase 2, 4; reader-facing metadata in `cutover.md` Phase 12 |
| §5 Sub-spec 1 / §6 content pipeline | `content-foundation.md` |
| §5 Sub-spec 2 | `app-skeleton.md` — local proof, no deploy |
| §5 Sub-spec 3 / §9 shipped-at-cutover | `cutover.md` — first real Pages deploy |
| §5 Sub-specs 4 + 5 / §9 deferred | `post-cutover.md` |
| §7 Mermaid | `content-foundation.md` Phase 1 (spike) + Phase 4; `app-skeleton.md` Phase 3 (tokens), build-cost benchmark |
| §8 offline / PWA | `app-skeleton.md` Phase 5; `cutover.md` Phase 11 |
| §9 dropped | no steps in any phase file — see Global Constraints "Dropped" above |
| §10 testing | Python e2e sweep in `cutover.md` Phase 13 + `post-cutover.md`; Vitest per the testing rule above |
| §11 wiki-be | `app-skeleton.md` (CORS check + file the ticket); `post-cutover.md` (confirm resolved) |
| §13 open items | decisions in the table above; carried out in the named phase files |

**Before executing**, and after drafting each phase file, check: every §5 deliverable and §9 row maps to a phase; no step says "TBD" / "add error handling" / "write tests for the above" without code / "similar to Phase N"; `lib/content` signatures match across files; no phase has steps for a dropped feature; no phase file contains a git/commit/branch/PR step; no SEO metric appears as an exit gate.
