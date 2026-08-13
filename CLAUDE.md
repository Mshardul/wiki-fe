# Wiki App - Claude Instructions

**Coding standards live in [CONVENTIONS.md](./CONVENTIONS.md) - read it before writing or changing code.** This file is operational: how to classify a task, which skill to invoke, where code lives. CONVENTIONS.md is prescriptive: how the code must be written.

## Tech Stack

- **Hosting** - GitHub Pages - static, no build step
- **Framework** - none - vanilla JS (ES modules), no bundler, no TypeScript
- **Markdown rendering** - Showdown
- **Diagrams** - Mermaid
- **Syntax highlighting** - highlight.js
- **Offline** - service worker (`wiki-sw.js`), localStorage-only persistence (no server-side FE state)
- **Backend** - calls `wiki-be` (Render) via `js/api.js`
- **Lint/format** - Biome (`biome.json`)
- **Tests** - pytest + Playwright (e2e, Python-driven browser tests)
- **CI** - GitHub Actions (`.github/workflows/ci.yml`)

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
| CSS / JS change, clear scope (1–3 files)            | none                                                        | all skills                                   |
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
- `test-driven-development` - user runs tests manually; write correct code, skip the TDD loop
- `playground` - no interactive HTML playground tasks in this project
- `netlify-skills` - project is not deployed on Netlify
- `subagent-driven-development` - too heavyweight; use `dispatching-parallel-agents` for isolation instead
- `grill-with-docs`, `context-mode-ops`, `writing-skills`, `claude-automation-recommender` - meta/setup skills; invoke only if explicitly asked

---

## FILE MAP

### JS (`js/`)

| File / domain      | Owns                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app.js` + `app/`  | ES module entry; bootstraps app, wires hash router, exposes window globals for inline onclick handlers, keyboard shortcuts, click delegation, scroll-to-top. `app/` holds mobile gestures, wiki switcher, debug overlay, home parallax, print, distraction-free, study feedback, bookmarks modal - see subtable below |
| `state.js`         | WIKIS registry, Showdown/Mermaid config, shared caches (readTimeCache, indexCache, allSearchCache), app state object, shared pure utilities (escHtml, fuzzyMatch)        |
| `content/`         | Content post-processing after markdown→HTML - see subtable below                                                                                                        |
| `render/`          | Routing + view rendering - see subtable below                                                                                                                            |
| `search.js`        | ⌘K modal: open/close lifecycle, search entry loading, fuzzy scoring, result rendering, section-filter mode (>)                                                           |
| `auth.js`          | Auth domain: password-rule validation, auth modal controller (login/register/verify panels), login/register/logout/resend flows, anon→login migration |
| `api.js`           | Single wrapper for all backend (`wiki-be`) calls: base-URL detect, credentials, `ApiError`, global 401 handler, typed endpoint helpers |
| `storage/`         | All localStorage operations - see subtable below                                                                                                                         |
| `search-features.js` | Search snippet extraction, recent-searches list, synonym cache use                                                                    |
| `icon-sprite.js`   | Loads and inlines `sprite.svg` for the Tabler icon system                                                                              |
| `toc-companion.js` | Standalone script for the sidecar TOC popup window (`toc-companion.html`) - receives BroadcastChannel payloads, renders nav, click-to-scroll |
| `modal-registry.js` | Shared focus-trap + open-state tracking helpers reused by modal controllers (search, auth, bookmarks, wiki-switcher, etc.) |

**Never read every file in a domain folder** (`content/`, `render/`, `storage/`, `app/`) - the subtables below say exactly which file owns which behavior.

#### `js/app/`

| File                  | Owns                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| `mobile-panels.js`    | Mobile TOC drawer, swipe gestures, panel-close registry, viewport resize  |
| `wiki-switcher.js`    | Wiki switcher modal open/close/render                                     |
| `debug-overlay.js`    | `?debug` diagnostic overlay                                                |
| `home-parallax.js`    | Home hero mouse-parallax effect                                            |
| `print.js`            | Print-article trigger                                                     |
| `distraction-free.js` | Distraction-free mode toggle                                              |
| `study-feedback.js`   | Haptic + tone feedback on study milestones, gated by settings flag         |
| `bookmarks-modal.js`  | Bookmarks modal open/close/render, focus trap, entry click → navigate     |
| `install-prompt.js`   | PWA `beforeinstallprompt` banner + iOS Add-to-Home-Screen nudge toast     |
| `icon-tooltip.js`     | Custom short-delay tooltips for topbar/overflow icon buttons (keeps native `title` as fallback) |
| `graph-engine.js`     | Shared force-directed sim primitives (node/edge builder, tick/damping) used by link-graph, section-map, index-graph |
| `reading-progress.js` | Content-view reading-progress bar scroll handler, drives `toc.js` progress ring |
| `link-graph.js`       | `g` link-graph overlay: cross-wiki node graph from backlinks, click-to-navigate |
| `section-map.js`      | `Shift+G` / pinch section-map overlay: zoomed-out node map of current wiki section, read-state colored |
| `complexity-compare.js` | Complexity comparator modal: picker, merged Big-O matrix from Data Structures tables |

#### `js/content/`

| File                  | Owns                                                                             |
| --------------------- | ----------------------------------------------------------------------------------- |
| `zoom-lightbox.js`    | Zoom overlay (image + diagram), pinch/pan/swipe gestures                            |
| `code-blocks.js`      | Code block header, copy buttons, clipboard helper, line numbers, hljs theme sync     |
| `mermaid.js`          | Diagram render/re-render, node hover captions, step-through walkthrough              |
| `tables.js`           | Column sort, quiz-me mode, table scroll cues                                        |
| `toc.js`              | TOC build, sticky section header, per-heading collapse, progress ring               |
| `formatting.js`       | Callouts, prerequisites chips, anchor links, LaTeX toggle/copy, focus mode, tabbed code blocks, footnotes, in-article find |
| `glossary-caveats.js` | Inline caveat reveals, glossary popovers/expand, rendered-HTML session cache          |
| `highlights.js`       | Per-article text highlights + inline emoji markers, freeze-frame export hookup       |
| `freeze-frame.js`     | Exports a text selection as a shareable image card                                   |
| `structure-viz.js`    | Inline ` ```viz ` fenced-block renderer for data-structure diagrams (bst, array, etc.) |
| `video-embed.js`      | Converts bare YouTube/Vimeo URLs on their own line into a responsive iframe embed     |
| `practice-toggle.js`  | Wraps DSA "Approach/Complexity" answer blocks into a collapsed reveal-on-click toggle |
| `section-wrap.js`     | Wraps flat markdown-derived siblings under a heading into nested containers for downstream features |

#### `js/render/`

| File                   | Owns                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `router.js`            | Hash router (`navigate`/`route`), view switching, slug resolution                    |
| `home-index.js`        | Home grid, wiki index sections render/controls, card filter/hover, key nav              |
| `home-gestures.js`     | Index-card swipe (bookmark/read toggle), pull-to-refresh, index refresh                |
| `home-parse.js`        | `index.md` parser, shared index-fetch cache, article counts, ⌘K search-entry builder    |
| `content-view.js`      | Content render pipeline: fetch → parse → post-process → wire links/hover-preview      |
| `related-articles.js` | Related-article ranking + rendering, backlink spine ("Mentioned by" panel)            |
| `changelog-view.js`   | `#changelog` view: parses `content/CHANGELOG.md`, date-grouped entries, filename filter, filename→article resolution via search index |
| `nav-utils.js`         | Path resolution, breadcrumb, page title, `fetchText`, `readingTime`                   |
| `toast.js`             | Toast queue + display                                                                |
| `admin-view.js`        | Admin panel view: broken-links/backlinks/search-index reports for admin-role users    |
| `index-graph.js`       | Home/index-view node graph overlay (per-wiki), built on `app/graph-engine.js`         |
| `offline-view.js`      | `#offline` view: lists cached articles, last-cached date, per-article evict button    |
| `dashboard-view.js`    | Progress dashboard view: wiki cards → per-section bars → per-learning-path bars, hash-nav drill-down |
| `learning-paths.js`    | Parses learning-track tables from index markdown, per-track completion counts for dashboard/index cards |

#### `js/storage/`

| File                 | Owns                                                                     |
| -------------------- | ----------------------------------------------------------------------------- |
| `bookmarks.js`       | Bookmark CRUD, bookmarks section render                                       |
| `recents.js`         | Recently-visited CRUD, recents section render                                 |
| `read-tracking.js`   | Read/unread state, quiz-reveal tracking                                       |
| `completions.js`     | Per-wiki-per-article completion Set (`wiki-completed-*`), sync via `api.completions` |
| `offline.js`         | Offline cache download/remove/check, offline button state                     |
| `settings-theme.js`  | Settings object + swatches, `Settings`/`Theme`/`Sync`, multi-tab sync listener |
| `scroll-collapse.js` | Scroll-position cache, section collapse, TOC scroll, recent searches          |
| `highlights.js`      | Per-article highlight/marker CRUD, keyed by wiki+article path                 |
| `notes.js`           | Per-article notes scratchpad CRUD                                             |
| `data-clear.js`      | "Clear my data" settings action - wipes bookmarks/highlights/notes/pinned-wikis |
| `install-prompt.js`  | PWA iOS install-nudge dismissal state (localStorage flag read/write)          |

### CSS (`css/`)

| File / folder           | Owns                                                                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.css`            | ALL CSS custom properties: spacing scale, typography scale, colour tokens, border-radius, transition durations - **read this first for any CSS task** |
| `base.css`              | Global reset and base styles: body, headings, inline code, scrollbar, text selection                                                                  |
| `themes.css`            | Per-theme CSS token overrides for dark, light, matrix, terminal, amber-term via `data-theme` attribute                                                |
| `components/`           | Shared UI components - see subtable below                                                                                                              |
| `components/auth.css`   | Auth modal + topbar auth button styles (tokens only)                                                                                              |
| `view-home.css`         | Home view: background grid/glow, wiki card grid, home topbar, hero section                                                                            |
| `view-index.css`        | Index view: hero, section headers, index card grid, recents strip, bookmarks strip                                                                    |
| `view-changelog.css`    | Changelog view: date groups, entry list, filename-link chips                                                                                          |
| `view-admin.css`        | Admin view: admin-nav visibility, report layout                                                                                                        |
| `view-dashboard.css`    | Progress dashboard view: wiki/section/track card layout                                                                                                |
| `view-offline.css`      | Offline-shelf view: cached-article list, status, evict button                                                                                          |
| `view-content/`         | Content view - see subtable below                                                                                                                      |
| `responsive.css`        | Mobile/tablet media queries - overrides layout, TOC visibility, topbar density for narrow viewports                                                   |
| `print.css`             | Print stylesheet - study-sheet output, strips chrome, expands collapsed regions, footers source URL                                                    |
| `wiki.css`              | CSS aggregator - imports all CSS modules via @import; never add rules here                                                                            |

#### `css/components/`

| File                    | Owns                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `topbar.css`            | Breadcrumb, back button, topbar, scroll-to-top, topbar title, icon buttons, reading progress bar, anchor links, reading-time badge |
| `search-modal.css`      | ⌘K global search modal (all `.gsearch-*` rules)                                     |
| `preferences-modal.css` | Settings swatches, preferences modal, keyboard-shortcuts tab                        |
| `toast.css`             | Toast notification                                                                  |
| `wiki-switcher.css`     | Wiki switcher modal, debug overlay                                                  |
| `bookmarks-modal.css`   | Global bookmarks modal (⌘B)                                                          |
| `link-graph.css`        | Link-graph overlay modal                                                            |

#### `css/view-content/`

| File                     | Owns                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `layout.css`             | Sticky header, article hero, TOC sidebar, markdown-body base, headings/lists/links/inline-code, content stub |
| `code.css`               | Code blocks, line numbers, code header, table scroll cue, tables, tabbed code blocks |
| `mermaid.css`            | Mermaid diagrams/tooltip/step-through, zoom overlay, image error fallback           |
| `callouts-prereqs.css`   | Callout variants, prerequisites chips, collapsible callouts                          |
| `interactive.css`        | Focus mode, details/summary, distraction-free mode, in-article find bar, per-heading collapse, formula toggle |
| `glossary-related.css`  | Related articles, hover previews, inline caveats/glossary, footnotes, article-end marker |
| `highlights.css`        | Per-article text highlight marks + inline emoji markers                              |
| `notes-scratchpad.css`  | Notes scratchpad widget in content-view right rail                                   |
| `toc-sidebar.css`       | TOC sidebar widget in content-view right rail                                        |

### Tests (`tests/`)

| File                                    | Covers                                                             |
| --------------------------------------- | ------------------------------------------------------------------ |
| `conftest.py`                           | Fixtures: browser setup, local HTTP server, navigation helpers     |
| `e2e/test_home.py`                      | Home view, wiki cards, article counts, search button, theme toggle |
| `e2e/test_search.py`                    | Search modal, results, keyboard nav                                |
| `e2e/test_navigation.py`                | Sidebar, routing, breadcrumbs                                      |
| `e2e/test_content.py`                   | Article rendering, markdown, code blocks, math                     |
| `e2e/test_content_enhancements.py`      | Copy-code button, line numbers, enhanced content features          |
| `e2e/test_html_markup.py`               | HTML markup rendering correctness                                  |
| `e2e/test_bookmarks.py`                 | Bookmark add / remove / persist; anon-no-API-call invariant        |
| `e2e/test_auth.py`                      | Auth modal, password checklist, login/register/verify, error states |
| `e2e/test_recents.py`                   | Recent articles list                                               |
| `e2e/test_settings.py`                  | Theme, font, content width settings                                |
| `e2e/test_routing_pathing.py`           | URL routing, direct links, 404                                     |
| `e2e/test_links.py`                     | Internal links, cross-references                                   |
| `e2e/test_scroll_toc.py`                | TOC scroll tracking, active heading highlight                      |
| `e2e/test_keyboard_scroll.py`           | Keyboard scroll shortcuts                                          |
| `e2e/test_a11y_hotkeys.py`              | Accessibility, hotkeys                                             |
| `e2e/test_ux_hotkeys_errors.py`         | UX hotkeys, error states                                           |
| `e2e/test_read_toggle.py`               | Reading mode toggle                                                |
| `e2e/test_index_ux.py`                  | Index / sidebar UX interactions                                    |
| `e2e/test_data_backup.py`               | Data export / import                                               |
| `e2e/test_content_width.py`             | Content width setting                                              |
| `e2e/test_line_numbers_pathing_help.py` | Line numbers, pathing, help modal                                  |
| `e2e/test_security.py`                  | XSS, sanitisation, security invariants                             |
| `e2e/test_behavioral_fixes.py`          | Regression / behavioural fixes                                     |
| `e2e/test_complexity_comparator.py`     | Complexity comparator modal, picker, merged Big-O matrix           |
| `e2e/test_section_map.py`               | Section map overlay (Shift+G / pinch), node click nav              |

### Docs

| File                                               | Read when                                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `docs/tickets-backlog.md`                          | WIKI-xxx mentioned OR any ticket intent detected - active tickets                        |
| `docs/tickets-archive.md`                          | Need Done/Dropped ticket history (e.g. checking for duplicates, superseded-by refs)      |
| `docs/_meta/ai-instructions/tickets.md`            | Ticket intent - read alongside tickets-backlog.md                                        |
| `docs/content-backlog.md`                           | DSA-xxx / SD-xxx / content-backlog intent - active content rows                          |
| `docs/content-archive.md`                           | Content-backlog Done/Dropped history                                                     |
| `docs/_meta/ai-instructions/content-backlog.md`     | Content-backlog intent - schema + rules (not tickets)                                    |
| `docs/_meta/ai-instructions/sd-writer.md`          | Writing / fixing system design articles (components / algorithms / HLD / devops-tools / cheatsheets) |
| `docs/_meta/ai-instructions/sd-rater.md`           | Rating / publish-gate for system design articles                                        |
| `docs/_meta/ai-instructions/dsa-writer.md`         | Writing / fixing DSA articles (after content-backlog or Content task)                    |
| `docs/_meta/ai-instructions/dsa-rater.md`          | Rating / publish-gate for DSA articles                                                   |
| `docs/_meta/decisions/ui-ux.md`                    | UI / UX decision needed                                                                 |
| `docs/_meta/decisions/auth.md`                     | Auth/personal-layer decisions - product model, tech, DB schema, password/session/error contracts |
| `docs/_meta/decisions/auth-integration.md`         | [Archive] How auth wires into the FE SPA - reference only; superseded by implemented code |
| `docs/_meta/plans/fe-be-integration.md` | Step-by-step plan for the FE auth+sync integration work                          |
| `docs/tasks.md`                                    | Context on recently completed work or implementation notes                              |
| `docs/changelog.md`                                | [removed — use `content/CHANGELOG.md` and `docs/tickets-archive.md`]                    |

---

## TASK → FILE ROUTING

| Task                      | Read these only                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| Search bug                | `js/search.js`, `js/state.js`                                                                   |
| Rendering / markdown bug  | `js/render/content-view.js` (pipeline) or the specific `js/content/*.js` file for the enhancement in question |
| Navigation / routing bug  | `js/render/router.js`, `js/state.js`                                                            |
| Bookmark / recents bug    | `js/storage/bookmarks.js` or `js/storage/recents.js`, `js/state.js`                             |
| Auth / sync bug           | `js/api.js`, `js/auth.js`, `js/storage/settings-theme.js` (Sync), `js/state.js`                  |
| Settings bug              | `js/storage/settings-theme.js`, `css/themes.css`, `css/tokens.css`                               |
| UI / visual bug           | `css/tokens.css` + relevant view/component CSS file                                              |
| New CSS feature           | `css/tokens.css` first, then target view/component CSS file                                      |
| Mobile gesture / TOC drawer bug | `js/app/mobile-panels.js`                                                                  |
| Service worker issue      | `wiki-sw.js` only                                                                               |
| Write tests for feature X | Relevant `tests/e2e/test_*.py` + `tests/conftest.py`                                            |
| Content article           | `docs/_meta/ai-instructions/sd-writer.md` (system design) or `dsa-writer.md` (DSA)              |
| Content backlog row       | `docs/_meta/ai-instructions/content-backlog.md` + `docs/content-backlog.md` + writer/rater for that vertical |

---

## APP ARCHITECTURE

See **[CONVENTIONS.md](./CONVENTIONS.md) → Architecture** for the boot sequence, view model, content-loading flow, persistence model, and the module-map-as-contract.

---

## TOOL USAGE

- **`Read`** - only for files you will edit immediately after
- **`ctx_batch_execute`** - multi-file exploration, any output >20 lines
- Never raw `Bash` for reading files
- **Running tests** - may run individual tests when debugging (e.g. `pytest tests/e2e/test_x.py::test_y -v`). Never run the full suite unprompted; user runs that manually.
- **Icon needed but missing from `sprite.svg`** - don't stop at "not in the local sprite." `sprite.svg` is a hand-picked ~27-icon subset of Tabler's full 5,900+ icon set (no build/generator script - see `js/icon-sprite.js`, it just fetches and inlines the static file), so a missing icon is almost always available upstream and just hasn't been pulled in yet. Use `WebSearch`/`WebFetch` against `tabler.io/icons` to find and confirm the right icon name before concluding it doesn't exist. To add it: get the outline SVG, strip to `<path>` elements only, add as a new `<symbol id="icon-name" viewBox="0 0 24 24">` block in `sprite.svg`, matching the existing entries' format exactly.

---

## COMPLETION CHECKLIST

After finishing any coding task:

1. **Tests** - decide if new behaviour needs coverage. Add tests if: a new user-visible interaction was added, a bug was fixed (regression test), or a new code path exists that existing tests don't reach. Use the test file map below to pick the right file. May run the specific new/changed test to confirm it passes; never run the full suite unprompted.
2. **Ticket closure** - if the task came from a ticket (`WIKI-xxx`), move its row from `docs/tickets-backlog.md` to `docs/tickets-archive.md`: set Status = `Done` and Impl. Date = today's date (YYYY-MM-DD).
3. **Content-backlog closure** - if the task came from a content-backlog row (`DSA-xxx` / `SD-xxx`), move it to `docs/content-archive.md`: set Status = `Done` and Done Date = today's date. Never put these in tickets-archive.

After finishing any **content task**:

4. **Content changelog** - update `content/CHANGELOG.md` with an entry under today's date. Log: new article, new section, expanded/rewritten section, new stub. Skip: typo fixes, grammar, cross-reference links. Format:
   ```
   ## YYYY-MM-DD
   - `filename.md` - what changed (new article / new section: "Section Name" / expanded: "Section Name" / new stub: "Topic")
   ```
5. **Search index** - after adding, renaming, or removing an article, regenerate `content/search-index.json`: run `python3 scripts/build_search_index.py` and commit the result alongside the content change. CI's `search-index` job runs the same generator and fails the build (`git diff --exit-code`) if the committed file is stale.
6. **Backlinks** - after adding, renaming, removing, or changing internal links in an article, regenerate `content/backlinks.json`: run `python3 scripts/build_backlinks.py` (reads `search-index.json`, so regenerate that first) and commit the result. CI's `backlinks` job does the same and fails the build if the committed file is stale.

---

## TEST PATTERNS

Prescriptive test rules live in **[CONVENTIONS.md](./CONVENTIONS.md) → Testing** (e2e-only, `conftest.py` first, no new fixtures, happy + error path). Use the **test file map** above to pick which file a test belongs in.

---

## NEVER

**App dev tasks:**

- Never read `content/**/*.md` - irrelevant to app code
- Never read every file in a domain folder (`content/`, `render/`, `storage/`, `app/`) - use the subtables above to pick the right one
- Never read all CSS files - always start with `tokens.css`

**Content tasks:**

- Never read `js/` or `css/` files
- Never write or run tests
- Never file content findings as `WIKI-xxx` tickets — use the content backlog (`DSA-xxx` / `SD-xxx`) per `docs/_meta/ai-instructions/content-backlog.md`
- Never call content-backlog rows "tickets"

**All tasks:**

- Never `git add` / `git commit` / `git push` unless explicitly asked
- Never add `Co-Authored-By` to commit messages
- Never put WIKI-xxx ticket IDs in code comments or CSS section headers
- Never hard-wrap prose in Markdown files (manually inserting a newline mid-paragraph at some column width). Write each paragraph/list-item as one single line, no matter how long - let the editor soft-wrap for display. Applies to every `.md` file: audit reports, CLAUDE.md/CONVENTIONS.md, decisions, changelogs, tickets, content-backlog files. Manual line breaks are fine only inside code fences, tables, and where Markdown requires them (e.g. two-space hard break).

---

## CONVENTIONS

Full coding standards: **[CONVENTIONS.md](./CONVENTIONS.md)**. Repeated non-negotiables:

- Never `git add` / `commit` / `push` unless explicitly asked; never add `Co-Authored-By`.
- Never put `WIKI-xxx` ticket IDs in code comments or CSS section headers.
- Any `wiki-sw.js` change ⇒ cache-version bump.
- No `console.*` in committed code.
- Content filenames: lowercase, hyphen-separated, `.md` extension.
