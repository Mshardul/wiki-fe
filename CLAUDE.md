# Wiki App - Claude Instructions

**Coding standards live in [CONVENTIONS.md](./CONVENTIONS.md) - read it before writing or changing
code.** This file is operational: how to classify a task, which skill to invoke, where code lives.
CONVENTIONS.md is prescriptive: how the code must be written.

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

---

## SESSION START PROTOCOL

Do this before any file reads or skill invocations - every session:

1. Classify the task using the table below.
2. MEMORY.md is already in context - no need to fetch it.
3. If task type is **Ticket**: run `python3 docs/_meta/ai-instructions/scripts/fetch-backlog-tickets.py` first to get the backlog list. Do not read `docs/tickets.md` raw for the list.
4. If task type is anything else: go directly to the FILE MAP section and route.

---

## TASK CLASSIFICATION

| Signal in user message                                                                    | Task type                                     |
| ----------------------------------------------------------------------------------------- | --------------------------------------------- |
| `WIKI-xxx` / "work on tickets" / "which ticket" / "decide ticket" / "let's pick a ticket" | **Ticket**                                    |
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
| `app.js` + `app/`  | ES module entry; bootstraps app, wires hash router, exposes window globals for inline onclick handlers, keyboard shortcuts, click delegation, scroll-to-top. `app/` holds mobile gestures, wiki switcher, debug overlay, home parallax, print, distraction-free |
| `state.js`         | WIKIS registry, Showdown/Mermaid config, shared caches (readTimeCache, indexCache, allSearchCache), app state object, shared pure utilities (escHtml, fuzzyMatch)        |
| `content/`         | Content post-processing after markdown→HTML - see subtable below                                                                                                        |
| `render/`          | Routing + view rendering - see subtable below                                                                                                                            |
| `search.js`        | ⌘K modal: open/close lifecycle, search entry loading, fuzzy scoring, result rendering, section-filter mode (>)                                                           |
| `auth.js`          | Auth domain: password-rule validation, auth modal controller (login/register/verify panels), login/register/logout/resend flows, anon→login migration |
| `api.js`           | Single wrapper for all backend (`wiki-be`) calls: base-URL detect, credentials, `ApiError`, global 401 handler, typed endpoint helpers |
| `storage/`         | All localStorage operations - see subtable below                                                                                                                         |

**Never read every file in a domain folder** (`content/`, `render/`, `storage/`, `app/`) - the subtables below say exactly which file owns which behavior.

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

#### `js/render/`

| File                   | Owns                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `router.js`            | Hash router (`navigate`/`route`), view switching, slug resolution                    |
| `home-index.js`        | Home grid, wiki index sections, card filter/swipe/hover, article counts              |
| `content-view.js`      | Content render pipeline: fetch → parse → post-process → wire links/hover-preview      |
| `related-articles.js` | Related-article ranking + rendering                                                  |
| `nav-utils.js`         | Path resolution, breadcrumb, page title, `fetchText`, `readingTime`                   |
| `toast.js`             | Toast queue + display                                                                |

#### `js/storage/`

| File                 | Owns                                                                     |
| -------------------- | ----------------------------------------------------------------------------- |
| `bookmarks.js`       | Bookmark CRUD, bookmarks section render                                       |
| `recents.js`         | Recently-visited CRUD, recents section render                                 |
| `read-tracking.js`   | Read/unread state, quiz-reveal tracking                                       |
| `offline.js`         | Offline cache download/remove/check, offline button state                     |
| `settings-theme.js`  | Settings object + swatches, `Settings`/`Theme`/`Sync`, multi-tab sync listener |
| `scroll-collapse.js` | Scroll-position cache, section collapse, TOC scroll, recent searches          |

### CSS (`css/`)

| File / folder           | Owns                                                                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.css`            | ALL CSS custom properties: spacing scale, typography scale, colour tokens, border-radius, transition durations - **read this first for any CSS task** |
| `base.css`              | Global reset and base styles: body, headings, inline code, scrollbar, text selection                                                                  |
| `themes.css`            | Per-theme CSS token overrides for dark, light, matrix, terminal, amber-term via `data-theme` attribute                                                |
| `components/`           | Shared UI components - see subtable below                                                                                                              |
| `components-auth.css`   | Auth modal + topbar auth button styles (tokens only)                                                                                              |
| `view-home.css`         | Home view: background grid/glow, wiki card grid, home topbar, hero section                                                                            |
| `view-index.css`        | Index view: hero, section headers, index card grid, recents strip, bookmarks strip                                                                    |
| `view-content/`         | Content view - see subtable below                                                                                                                      |
| `responsive.css`        | Mobile/tablet media queries - overrides layout, TOC visibility, topbar density for narrow viewports                                                   |
| `wiki.css`              | CSS aggregator - imports all CSS modules via @import; never add rules here                                                                            |

#### `css/components/`

| File                    | Owns                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `topbar.css`            | Breadcrumb, back button, topbar, scroll-to-top, topbar title, icon buttons, reading progress bar, anchor links, reading-time badge |
| `search-modal.css`      | ⌘K global search modal (all `.gsearch-*` rules)                                     |
| `preferences-modal.css` | Settings swatches, preferences modal, keyboard-shortcuts tab                        |
| `toast.css`             | Toast notification                                                                  |
| `wiki-switcher.css`     | Wiki switcher modal, debug overlay                                                  |

#### `css/view-content/`

| File                     | Owns                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `layout.css`             | Sticky header, article hero, TOC sidebar, markdown-body base, headings/lists/links/inline-code, content stub |
| `code.css`               | Code blocks, line numbers, code header, table scroll cue, tables, tabbed code blocks |
| `mermaid.css`            | Mermaid diagrams/tooltip/step-through, zoom overlay, image error fallback           |
| `callouts-prereqs.css`   | Callout variants, prerequisites chips, collapsible callouts                          |
| `interactive.css`        | Focus mode, details/summary, distraction-free mode, in-article find bar, per-heading collapse, formula toggle |
| `glossary-related.css`  | Related articles, hover previews, inline caveats/glossary, footnotes, article-end marker |

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

### Docs

| File                                               | Read when                                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `docs/tickets.md`                                  | WIKI-xxx mentioned OR any ticket intent detected                                        |
| `docs/_meta/ai-instructions/tickets.md`            | Ticket intent - read alongside tickets.md                                               |
| `docs/_meta/ai-instructions/_base.md`              | **Every content task** (components / algorithms / HLD / devops-tools) - read this first |
| `docs/_meta/ai-instructions/components.md`         | Writing system design component article (after \_base.md)                               |
| `docs/_meta/ai-instructions/algorithms.md`         | Writing algorithm / concept article (after \_base.md)                                   |
| `docs/_meta/ai-instructions/hld.md`                | Writing HLD / system design article (after \_base.md)                                   |
| `docs/_meta/ai-instructions/devops-tools.md`       | Writing DevOps tool article (after \_base.md)                                           |
| `docs/_meta/ai-instructions/devops-cheatsheets.md` | Writing DevOps cheatsheet - self-contained, skip \_base.md                              |
| `docs/_meta/decisions/ui-ux.md`                    | UI / UX decision needed                                                                 |
| `docs/_meta/decisions/auth.md`                     | Auth/personal-layer decisions - product model, tech, DB schema, password/session/error contracts |
| `docs/_meta/decisions/auth-integration.md`         | [Archive] How auth wires into the FE SPA - reference only; superseded by implemented code |
| `docs/_meta/plans/fe-be-integration.md` | Step-by-step plan for the FE auth+sync integration work                          |
| `docs/tasks.md`                                    | Context on recently completed work or implementation notes                              |
| `docs/changelog.md`                                | Context on recent feature history or what changed                                       |

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
| Content article           | `docs/_meta/ai-instructions/_base.md` + relevant type file (except cheatsheets: type file only) |

---

## APP ARCHITECTURE

See **[CONVENTIONS.md](./CONVENTIONS.md) → Architecture** for the boot sequence, view model,
content-loading flow, persistence model, and the module-map-as-contract.

---

## TOOL USAGE

- **`Read`** - only for files you will edit immediately after
- **`ctx_batch_execute`** - multi-file exploration, any output >20 lines
- Never raw `Bash` for reading files
- **Never run tests** - user runs tests manually; write correct test code only

---

## COMPLETION CHECKLIST

After finishing any coding task:

1. **Tests** - decide if new behaviour needs coverage. Add tests if: a new user-visible interaction was added, a bug was fixed (regression test), or a new code path exists that existing tests don't reach. Use the test file map below to pick the right file. Never run tests - write correct test code only.
2. **Ticket closure** - if the task came from a ticket (`WIKI-xxx`), update its row in `docs/tickets.md`: set Status = `Done` and Impl. Date = today's date (YYYY-MM-DD).

After finishing any **content task**:

3. **Content changelog** - update `content/CHANGELOG.md` with an entry under today's date. Log: new article, new section, expanded/rewritten section, new stub. Skip: typo fixes, grammar, cross-reference links. Format:
   ```
   ## YYYY-MM-DD
   - `filename.md` - what changed (new article / new section: "Section Name" / expanded: "Section Name" / new stub: "Topic")
   ```

---

## TEST PATTERNS

Prescriptive test rules live in **[CONVENTIONS.md](./CONVENTIONS.md) → Testing** (e2e-only,
`conftest.py` first, no new fixtures, happy + error path, never run). Use the **test file map**
above to pick which file a test belongs in.

---

## NEVER

**App dev tasks:**

- Never read `content/**/*.md` - irrelevant to app code
- Never read every file in a domain folder (`content/`, `render/`, `storage/`, `app/`) - use the subtables above to pick the right one
- Never read all CSS files - always start with `tokens.css`

**Content tasks:**

- Never read `js/` or `css/` files
- Never write or run tests

**All tasks:**

- Never `git add` / `git commit` / `git push` unless explicitly asked
- Never add `Co-Authored-By` to commit messages
- Never put WIKI-xxx ticket IDs in code comments or CSS section headers

---

## CONVENTIONS

Full coding standards: **[CONVENTIONS.md](./CONVENTIONS.md)**. Repeated non-negotiables:

- Never `git add` / `commit` / `push` unless explicitly asked; never add `Co-Authored-By`.
- Never put `WIKI-xxx` ticket IDs in code comments or CSS section headers.
- Any `wiki-sw.js` change ⇒ cache-version bump.
- No `console.*` in committed code.
- Content filenames: lowercase, hyphen-separated, `.md` extension.
