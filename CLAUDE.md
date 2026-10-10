# Wiki App - Claude Instructions

**Coding standards live in [CONVENTIONS.md](./CONVENTIONS.md) - read it before writing or changing code.** This file is operational: how to classify a task, which skill to invoke, where code lives. CONVENTIONS.md is prescriptive: how the code must be written.

## Tech Stack

- **Hosting** - GitHub Pages - static export (`next build` → `out/`), no server runtime. Base path `/wiki-fe/`.
- **Package manager / Node** - pnpm `10.34.5`, Node `24.x` (see `.nvmrc` / `package.json` `engines` + `packageManager`)
- **Framework** - Next.js (App Router), React, TypeScript
- **Markdown rendering** - remark/rehype pipeline (`lib/content/pipeline.ts` + `lib/content/plugins/`); `pnpm content:build` / `prebuild` runs `buildContent()`
- **Diagrams** - Mermaid (client island `components/reader/MermaidDiagrams.tsx`)
- **Syntax highlighting** - Shiki (`@shikijs/rehype`) at build time
- **Offline** - Serwist service worker (`app/sw.ts` → `out/sw.js`); localStorage-only FE persistence (no server-side FE state)
- **Backend** - `wiki-be` (Render) via `lib/api.ts`
- **Lint/format** - Biome + ESLint (`biome.json`, `eslint.config.*`); `pnpm typecheck` / `pnpm lint` / `pnpm test:all` are CI gates
- **Tests** - Vitest: `pnpm test` (unit parallel + pipeline single-fork for Shiki/renderMarkdown) + `pnpm test:content` (one `buildContent` + artifact asserts); CI runs `pnpm test:all`. E2e: `pnpm build:e2e` (adds canary pages) then `pnpm test:e2e` (pytest `-n 2` against `out/`)
- **CI** - GitHub Actions (`.github/workflows/ci.yml`)

**SEO / discoverability is not a project goal** (personal tool; `robots` Disallow). Never optimise content or tickets for search engines.

---

## Playwright MCP browser

Browsers are pre-installed under `~/Library/Caches/ms-playwright` (chromium, not system Chrome channel). If the `playwright` MCP tool errors with `Chromium distribution 'chrome' is not found at /Applications/Google Chrome.app/...`, that's the MCP server defaulting to the system-Chrome channel instead of the installed bundle - don't run `npx playwright install chrome`; the browser already exists, it's an MCP server config issue.

---

## SESSION START PROTOCOL

Do this before any file reads or skill invocations - every session:

1. Classify the task using the table below.
2. MEMORY.md is already in context - no need to fetch it.
3. If task type is **Ticket**: read `docs/tickets-backlog.md` for the backlog list (active tickets only - Done/Dropped history lives separately in `docs/tickets-archive.md`).
4. If task type is **Content backlog**: read `docs/_meta/ai-instructions/content-backlog.md`, then `docs/content-backlog.md`. These are not app tickets — never use `WIKI-xxx` for them.
5. If task type is anything else: go directly to the FILE MAP section and route.

---

## TASK CLASSIFICATION

| Signal in user message                                                                    | Task type                                     |
| ----------------------------------------------------------------------------------------- | --------------------------------------------- |
| `WIKI-xxx` / "work on tickets" / "which ticket" / "decide ticket" / "let's pick a ticket" | **Ticket**                                    |
| `DSA-xxx` / `SD-xxx` / "content backlog" / "work content backlog" / content-audit → backlog | **Content backlog**                         |
| Explicit filename or component named                                                      | **Direct** - skip exploration, read that file |
| "bug" / "broken" / "not working" / "doesn't" / "wrong"                                    | **Debugging**                                 |
| "add" / "implement" / "build" + vague or no spec                                          | **Feature**                                   |
| "add content" / "write article" / "create page" / topic name for article                  | **Content**                                   |
| Simple "change X to Y", clear target file and scope                                       | **Direct edit**                               |

---

## SKILL ROUTING

| Task type                                           | Invoke                                                      | Never invoke                                 |
| --------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------- |
| Real bug, unknown root cause                        | `systematic-debugging`                                      | `brainstorming`, `feature-dev`, `TDD`        |
| Hard bug or perf regression (multi-hypothesis)      | `diagnose`                                                  | `brainstorming`                              |
| New feature, design unclear                         | `brainstorming` (scope only, not full feature-dev pipeline) | `systematic-debugging`, `TDD`                |
| New feature, spec clear                             | none                                                        | all skills                                   |
| Ticket with clear spec                              | none - or `executing-plans` if multi-step                   | `brainstorming`, `feature-dev`, `TDD`        |
| Content backlog row with clear spec                 | none - follow `docs/_meta/ai-instructions/content-backlog.md` | `brainstorming`, `feature-dev`, `TDD`      |
| Commit                                              | `caveman-commit`                                            | -                                            |
| Inline diff / code review                           | `caveman-review`                                            | -                                            |
| Content article                                     | `brainstorming` (outline/scope only), then write            | `TDD`, `systematic-debugging`, `feature-dev` |
| CSS / TS change, clear scope (1–3 files)            | none                                                        | all skills                                   |
| PR / code review                                    | `code-review`                                               | -                                            |
| 2+ independent subtasks with zero shared state      | `dispatching-parallel-agents`                               | -                                            |
| Modularise / find coupling / architectural refactor | `improve-codebase-architecture`                             | `brainstorming`                              |
| Audit or improve CLAUDE.md                          | `claude-md-improver`                                        | -                                            |
| Wrapping up branch before PR                        | `finishing-a-development-branch`                            | -                                            |

**`verification-before-completion`**: skip for single-file edits, CSS-only changes, and content `.md` changes.

**`dispatching-parallel-agents`**: only when subtasks share zero state. Example - two independent content articles = yes. CSS change + its test = no.

**Always on - no invocation needed:**

- `caveman` - active via SessionStart hook; controls response terseness for all sessions
- `context-mode` - active via SessionStart hook; governs tool selection (use ctx_batch_execute over raw Bash for >20 lines)
- `security-guidance` - passive PreToolUse hook; warns on file edits automatically

**Never in this project:**

- `frontend-design` - project has a fixed, established aesthetic; do not apply creative reinterpretation
- `test-driven-development` (the skill loop) - Vitest tests are required (see CONVENTIONS Testing); do not run the full e2e suite or the TDD skill ritual unprompted
- `playground` - no interactive HTML playground tasks in this project
- `netlify-skills` - project is not deployed on Netlify
- `subagent-driven-development` - too heavyweight; use `dispatching-parallel-agents` for isolation instead
- `grill-with-docs`, `context-mode-ops`, `writing-skills`, `claude-automation-recommender` - meta/setup skills; invoke only if explicitly asked

---

## FILE MAP

**Never read every file in a domain folder** - the tables below say which file owns which behaviour. Prefer one targeted read over `find` dumps.

### Routes (`app/`)

| Path | Owns |
| --- | --- |
| `layout.tsx` | Root shell: CSS, sprite, chrome hosts, global islands (search/auth/prefs/SW registration) |
| `page.tsx` | Home (`/`) |
| `[vertical]/page.tsx` | Vertical index |
| `[vertical]/[...slug]/page.tsx` | Article reader (RSC HTML + `ReaderIslands`) |
| `dashboard/**` | Progress dashboard |
| `changelog/page.tsx` | Changelog |
| `admin/page.tsx` | Admin site-health |
| `offline/page.tsx` | Offline shelf |
| `visualizer/page.tsx` / `visualizer/[slug]/page.tsx` | Visualizer landing / one visualizer (mounts `VisualizerApp`) |
| `sw.ts` | Serwist service worker source |

### Components (`components/`) — per-feature islands

Markup for articles comes from the build pipeline. Islands add behaviour; they do not re-parse markdown.

| Folder | Owns |
| --- | --- |
| `common/` | `Modal`, focus trap, modal registry, scroll-lock helpers |
| `chrome/` | Topbars, toast host, breadcrumbs, wiki switcher, bookmarks modal, scroll-to-top, tooltips |
| `reader/` | TOC, sticky header, highlights/markers, notes, Mermaid, find, related/mentioned-by, complexity comparator, code/table/glossary islands; `ReaderIslands` mounts the set |
| `home/` | Index/home strips, card swipe, pull-to-refresh, learning-path bars, key nav |
| `search/` | ⌘K `SearchModal` |
| `auth/` | Auth button + modal + password checklist |
| `settings/` | Preferences modal, distraction-free, print, settings init |
| `sync/` | Session init + synced-domain hooks |
| `mobile/` | TOC drawer, swipe gestures, viewport handler |
| `pwa/` | Install prompt, iOS nudge, offline shelf, save-offline |
| `dashboard/` | Dashboard shell/grid/progress bar |
| `admin/` | Admin view + report tables |
| `changelog/` | Changelog filter |
| `visualizer/frame/` | Shared visualizer page: `VisualizerApp`, header, config/info side panels, `Stage`, playback bar, timeline strip; Revision view: `RevisionView`, `RevisionGrid`, `RevisionPopup`, `RevisionFooter` |
| `visualizer/shapes/` | Generic, vocabulary-neutral data-structure shapes (`LinearShape`, `RankingShape`, `HistogramShape`, `RingShape`, `LanesShape`, `TimelineShape`, `CompositeShape`) picked by `Shape`, plus `FlowDiagram` for revision cards; fed models by each visualizer's adapter in `lib/visualizer/<name>/`, never domain words (see CONVENTIONS Visualizer) |
| `visualizer/ui/` / `visualizer/hooks/` | Reusable primitives (buttons, tabs, choice group, rich text, vars table) / playback, URL sync, hotkeys, follow-scroll, panel prefs |

### Lib (`lib/`) — non-UI logic

| Path | Owns |
| --- | --- |
| `api.ts` | Sole `wiki-be` HTTP client (`ApiError`, credentials, 401) |
| `config.ts` | App constants / base path helpers |
| `hotkeys.ts` | Global keyboard shortcuts |
| `toast.ts` | Toast queue |
| `clipboard.ts` | Clipboard helpers |
| `content/` | Discovery, pipeline, `getArticle`, `buildContent`, search-index/backlinks/broken-links/bridges/previews/complexity-tables, vertical index |
| `content/plugins/` | remark/rehype transforms |
| `storage/` | All `localStorage` + sync cache-through (bookmarks, recents, read, notes, highlights, settings, …) |
| `search/` | Fuzzy/score/snippet/synonyms over the search index |
| `auth/` | Password rules + auth flow helpers |
| `reader/` | Complexity matrix merge, text-offset helpers for highlights |
| `pwa/` | Cache Storage article ops + install helpers |
| `admin/` | Admin report shaping |
| `dashboard/` | Progress aggregation |
| `visualizer/core/` | Module contract + generic engine: field schema, URL state, playback, shapes geometry, rich text, seeded rng, variants, revision layout/loop/order/flow |
| `visualizer/eviction/` | Eviction-policies module: trace, simulate, `policies/{lru,fifo,lfu,clock}` |
| `visualizer/caching/` | Caching-strategies module: `strategies/*` (one file per strategy), `engine` (frames), `lanes` (world → lanes model), `tokens`, `trace`, `copy` |
| `visualizer/rate-limiting/` | Rate-limiting module: `algorithms/*` (one limiter per algorithm), `engine` (steps, peak), `view` (state → Timeline / Linear / Composite models), `frames`, `trace`, `ticks`, `copy`, `revision` |
| `visualizer/registry.ts` / `modules.ts` | Server-safe visualizer list (landing/home) / slug → module loader (client only) |

### CSS (`css/`)

Tokens-first. **Start any CSS task in `tokens.css`.**

| File / folder | Owns |
| --- | --- |
| `tokens.css` | Design tokens (spacing, type, colour, z-index, …) |
| `base.css` / `themes.css` | Base element styles; light/dark overrides |
| `components/` | Shared chrome: topbar, search/prefs modals, toast, wiki-switcher, bookmarks, auth |
| `view-*.css` | Per-route view styles (home, index, dashboard, admin, changelog, offline) |
| `view-visualizer/` | Visualizer styles: `ui`, `stage`, `panels`, `playback`, `layout` (colours via `--viz-*` tokens) |
| `view-content/` | Article layout, code, mermaid, callouts, interactive, glossary, highlights, notes, TOC |
| `responsive.css` | Breakpoints only |
| `print.css` | Print stylesheet |
| `wiki.css` | Aggregator (`@import` only — no rules) |

### Tests

| Path | Covers |
| --- | --- |
| `tests/conftest.py` | Serve `out/` under `/wiki-fe/`, browser fixtures, `wiki_page`, `force_paint` |
| `tests/e2e/test_*.py` | Python Playwright e2e (see filenames for domain) |
| `tests/fixtures/canary/*.md` | Canary articles served at `/e2e-canary/<name>/` by an e2e build only; see CONVENTIONS Testing |
| `*.test.ts` / `*.test.tsx` | Vitest unit project — co-located under `lib/` / `components/` / `app/` |
| `tests/content/artifacts.test.ts` | Vitest content project — asserts `lib/content/generated/*` after globalSetup `buildContent()` |

### Docs

| File | Read when |
| --- | --- |
| `docs/tickets-backlog.md` | WIKI-xxx / ticket intent — active tickets |
| `docs/tickets-archive.md` | Done/Dropped ticket history |
| `docs/_meta/ai-instructions/tickets.md` | Ticket schema/rules |
| `docs/content-backlog.md` / `docs/content-archive.md` | DSA-xxx / SD-xxx content rows |
| `docs/_meta/ai-instructions/content-backlog.md` | Content-backlog schema |
| `docs/_meta/ai-instructions/sd-writer*.md` / `dsa-writer*.md` / `*-rater.md` | Writing / rating articles |
| `docs/_meta/visualizer/README.md` | Any Visualizer work — principles, page anatomy, architecture, rules, roadmap (read first) |

---

## TASK → FILE ROUTING

| Task | Start here |
| --- | --- |
| Article render / markdown dialect | `lib/content/pipeline.ts`, `lib/content/plugins/`, then the matching reader island |
| Visualizer (new visualizer or any change) | `docs/_meta/visualizer/README.md` first, then the spec it links |
| ⌘K search | `components/search/SearchModal.tsx`, `lib/search/` |
| Auth / login | `components/auth/`, `lib/auth/`, `lib/api.ts` |
| Bookmarks / recents / read | `lib/storage/*`, chrome/home islands that consume them |
| Theme / prefs | `components/settings/PreferencesModal.tsx`, `lib/storage/settings.ts` |
| Highlights / notes | `components/reader/Highlights.tsx` / `NotesScratchpad.tsx`, `lib/storage/highlights.ts` / `notes.ts` |
| Complexity comparator | `components/reader/ComplexityCompare.tsx`, `lib/reader/complexity-matrix.ts` |
| Dashboard / admin / changelog | `app/dashboard/**`, `app/admin/`, `app/changelog/`, matching `components/` + `lib/` |
| SW / offline | `app/sw.ts`, `components/pwa/`, `lib/pwa/` |
| Hotkeys | `lib/hotkeys.ts` |
| CSS / theme tokens | `css/tokens.css` first |
| Content article | `docs/_meta/ai-instructions/*-writer*.md`, then the `.md` under `content/` |
| e2e failure | Matching `tests/e2e/test_*.py` + `tests/conftest.py` |

---

## COMPLETION CHECKLIST

After finishing any coding task:

1. **Tests** - new behaviour needs coverage. Vitest for `lib/` / islands; e2e only when user-visible interaction needs a browser. Prefer the existing test file for that domain. May run the specific new/changed test; never run the full e2e suite unprompted.
2. **Ticket closure** - if `WIKI-xxx`, move the row from `docs/tickets-backlog.md` to `docs/tickets-archive.md` (Status `Done`, Impl. Date today).
3. **Content-backlog closure** - if `DSA-xxx` / `SD-xxx`, move to `docs/content-archive.md`. Never put these in tickets-archive.

After finishing any **content task**:

4. **Content changelog** - update `content/CHANGELOG.md` under today's date (new/expanded article or section; skip typos/grammar-only).
5. **Search index / backlinks / broken-links** - produced by `next build` (`buildContent()` via `prebuild`) — no manual regeneration. CI's `build` job `git diff --exit-code`s the committed `content/{search-index,backlinks,broken-links}.json` against the Node emit. Run `pnpm build` (or `pnpm content:build`) and commit those JSON files with the content change.
6. **`content/bridges.json`** - hand-authored; validated inside `buildContent()`.

---

## NEVER

**App dev tasks:**

- Never read `content/**/*.md` for app-code tasks (irrelevant)
- Never read every file in a domain folder — use the FILE MAP
- Never start CSS work without opening `tokens.css`
- Never put a visualizer's domain words or rules in generic visualizer code (`components/visualizer/**`, `lib/visualizer/core/**`); domain logic and the model adapter live in `lib/visualizer/<name>/`

**Content tasks:**

- Never read `app/` / `components/` / `lib/` / `css/` unless the task is about app behaviour
- Never write or run app tests for content-only work
- Never file content findings as `WIKI-xxx` — use `DSA-xxx` / `SD-xxx`

**All tasks:**

- Never `git add` / `git commit` / `git push` unless explicitly asked
- Never add `Co-Authored-By` to commit messages
- Never put WIKI-xxx / DSA-xxx / SD-xxx IDs in code comments or CSS section headers
- Never hard-wrap prose in Markdown files (one line per paragraph/list-item; soft-wrap in the editor). Manual breaks only inside code fences, tables, and where Markdown requires them.

---

## CONVENTIONS

Full coding standards: **[CONVENTIONS.md](./CONVENTIONS.md)**. Repeated non-negotiables:

- Never `git add` / `commit` / `push` unless explicitly asked; never add `Co-Authored-By`.
- Never put ticket/content-backlog IDs in code comments or CSS section headers.
- Service worker cache versioning is Serwist-hashed — no manual cache-version bump.
- No `console.*` in committed code.
- Content filenames: lowercase, hyphen-separated, `.md` extension.
