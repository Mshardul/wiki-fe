# Coding Standards - wiki-fe

Prescriptive standards for this repo. Rules, not suggestions. New code follows them; changed code is brought up to them. **Biome** (format + style + CSS lint) and **ESLint** (TS/React/hooks/Next/a11y correctness) run in pre-commit and CI. Semantic rules (module boundaries, island rule, no ticket IDs) remain on the author and reviewer.

This file is the *how to write the code*. The operational map (which file owns what, which skill to invoke, where to read for a task) lives in [CLAUDE.md](./CLAUDE.md).

---

## Core principles

- **SRP (Single Responsibility).** One module, one concern. Each file under `app/` / `lib/` / `components/` owns exactly one slice (see CLAUDE.md FILE MAP); a function does one thing. If you can't name what a module owns in one phrase, it's doing too much.
- **Size is a signal, not a rule to game.** A file crossing **~400 lines** is a prompt to split it by sub-concern into a domain subfolder (`lib/domain/sub-file.ts`, `components/feature/Sub.tsx`, `css/view-x/sub-file.css`) - don't wait for a "refactor" ticket to do it. Exception: a single cohesive pipeline (no independently reusable piece) may stay one file past the threshold if splitting would only fragment one linear flow - note the exception in a one-line comment at the top of that file.
- **DRY (Don't Repeat Yourself).** Logic lives in one place. Shared pure helpers belong in the owning `lib/` module. A repeated literal → a named constant. A CSS value used twice → a token in `tokens.css`, never copied. **Exception:** a small (**<20 line**) UI helper duplicated across exactly 2 files may stay duplicated rather than get its own shared module - the indirection cost of a module for one tiny function used twice outweighs the DRY win. Re-evaluate once a 3rd caller needs it.
- **SoC (Separation of Concerns).** Rendering (components), persistence (`lib/storage/`), content processing (`lib/content/`), and search (`lib/search/`) never bleed into each other. Keep the boundaries.
- **YAGNI.** Build for the current version. No abstraction layer, no config knob until a real second caller needs it.
- **Explicit over implicit.** Dynamic behaviour is wired in code you can grep, not inferred. Prefer typed props and named exports over magic globals.
- **Fail loud in dev.** A broken selector, a missing element, an unexpected API `code` should surface - don't silently swallow.

---

## Architecture

- **Next.js App Router, static export** (`output: 'export'` → `out/`). No Node server in production. Base path `/wiki-fe/`. TypeScript throughout.
- **Build:** `pnpm content:build` / `prebuild` runs `buildContent()`; `pnpm build` emits HTML + assets + Serwist SW. Markdown → HTML happens at **build time** via `lib/content/` (unified/remark/rehype + Shiki).
- **Routes:** App Router pages under `app/` — home, `[vertical]`, `[vertical]/[...slug]`, dashboard, changelog, admin, offline. Real URLs, not hash routing.
- **Islands:** Interactive behaviour attaches as client components under `components/`. See **The island rule** below.
- **Persistence:** `lib/storage/` → `localStorage` (+ cache-through sync when logged in). No server-side FE state.

### Domain map is a contract

Do not reach across a domain boundary - call the owning module. Never read every file in a domain folder to find something - CLAUDE.md FILE MAP says which file owns which behaviour.

| Domain | Owns |
| --- | --- |
| `app/` | Routes, root layout, Serwist SW source (`sw.ts`) |
| `lib/content/` | Discovery, pipeline, plugins, search-index/backlinks/broken-links/manifest/getArticle |
| `lib/storage/` | All `localStorage` + sync cache-through |
| `lib/search/` | Fuzzy/score/snippet over the search index |
| `lib/api.ts` | Sole `wiki-be` HTTP client |
| `lib/auth/` | Password rules + auth helpers |
| `lib/reader/` | Complexity matrix, text-offset helpers |
| `lib/pwa/` | Cache Storage article ops + install helpers |
| `components/*` | Per-feature client islands (see Components) |
| `css/` | Tokens-first styles (faithful port; unchanged ownership) |

### The island rule

Interactive behaviour attaches to the article body as **client islands**:

- **Markup comes from the build pipeline.** `lib/content/plugins/` emit structural markup and data attributes. An island **never re-parses markdown** and **never re-renders the article body**.
- **Behaviour lives in React** and works with React-rendered controls **where possible** — TOC, search, tabs, callout collapse, code-copy, table sort: these render their own React UI and only *read* the body or toggle classes/attributes on it.
- **Direct DOM mutation of the body is reserved** for cases that genuinely need it — Range-based highlight wrapping and emoji-marker insertion at text offsets. Keep those exceptions small and isolated.
- **`dangerouslySetInnerHTML` is allowed only** for trusted build-time article HTML (the pipeline output). Never for user input or unsanitised markdown at runtime.

---

## TypeScript / React

- **TypeScript strict.** Prefer named types/interfaces near their use; zod schemas for runtime-validated JSON (`public/data/*`, API envelopes where parsed).
- **`"use client"` only at the island boundary** — prefer server components for pages/layouts; push the directive down to the component that needs browser APIs, not every leaf.
- **No `console.*` in committed code.** Strip `console.log`/`warn`/`error`/`debug` before committing. Surface genuine error paths through the UI (toast / error state).
- **No inline styles** except dynamic values set programmatically (e.g. a computed width). Everything static is a CSS class.
- **Naming:** `camelCase` for vars/functions, `PascalCase` for components/types, `UPPER_SNAKE` for module-level constants with a one-line reason if non-obvious.
- **`load*` vs `get*`/`ensure*`:** reserve `load*` for async or network-backed work. Synchronous storage/session reads use `get*`; one-time sync DOM/setup uses `ensure*`.
- **Leading underscore (`_name`) marks "not part of this file's public contract"** — private helpers not exported, or methods not meant for outside callers.
- **No new runtime dependencies** without a deliberate decision — static-export + offline-first depends on staying lean.
- **Comments are sparse and short.** A comment earns its place only when the code can't say it itself - the *why*, a non-obvious constraint, a gotcha. Default to none. When you do comment, **one line**, not a paragraph. Never narrate *what* the next lines do, never restate the function name, never write multi-line block comments explaining mechanics. Section labels in TS are a single-line `/* … */` comment (not the multi-line box banners used in CSS).
- **Comments are project-level, never ticket- or task-level.** Never reference a ticket number (`WIKI-xxx`), task number, PR number, or branch name in a code comment or CSS section header.

---

## Components (`components/`)

Every runtime client island lives under `components/`, one folder per feature. Server-rendered markup comes from the build pipeline (`lib/content/`); an island never re-parses markdown or re-renders the article body.

- **Per-feature folders** - `components/<feature>/`. Shared modal/focus-trap shells in `components/common/`; app chrome (topbar, toast host, tooltips, breadcrumb, wiki-switcher, scroll-to-top) in `components/chrome/`.
- Folders in use:
  ```
  components/
    common/     Modal, focus trap, modal registry
    chrome/     Topbar, ToastHost, IconTooltip, ScrollToTop, Breadcrumb, WikiSwitcher, BookmarksModal
    reader/     Toc, StickyHeader, Highlights, Markers, NotesScratchpad, MermaidDiagrams,
                RelatedArticles, MentionedBy, ComplexityCompare, ArticleFind, …
    home/       Index strips, card swipe, pull-to-refresh, key nav, learning-path bars
    search/     SearchModal
    auth/       AuthModal, PasswordChecklist, AuthButton
    settings/   PreferencesModal, DistractionFree, PrintTrigger
    sync/       Session init + synced-domain hooks
    mobile/     TocDrawer, SwipeGestures, ViewportHandler
    pwa/        SaveOffline, InstallPrompt, IosNudge, OfflineShelf
    dashboard/  Dashboard shell / progress
    admin/      Admin view + report tables
    changelog/  Changelog filter
  ```
- **`lib/storage/`** owns all `localStorage` access + the cache-through sync half; **`lib/api.ts`** is the single `wiki-be` client (framework-agnostic, no Next coupling); **`lib/toast.ts`** owns the toast queue; **`lib/pwa/`** owns Cache Storage ops + install-prompt helpers. Components call these, never touch `localStorage`, `caches`, or `fetch` a backend directly.
- Comments follow the TypeScript rules above - sparse, one line, `why` not `what`, no ticket IDs.

---

## CSS

- **`tokens.css` is the single source of every value** - spacing, type scale, colours, radius, transitions. **Read it first for any CSS task.** Never hardcode a value that a token already expresses; never duplicate a token's value in another file.
- **Add a token before repeating a value.** If a CSS value (color, font-weight, z-index, transition duration, font-size) appears in more than one rule and no token exists yet, add the token to `tokens.css` first, then use `var(--token-name)` everywhere. Available token groups: `--fw-*` (font-weight), `--z-*` (z-index layers), `--text-*` (font-size scale - always prefer over raw rem/em values), `--color-*` (semantic status colors), `--overlay-*` (rgba scrim colors), `--t*` (transitions), `--s*` (spacing), `--r-*` (border-radius, including `--r-xs: 4px`), `--topbar-h` (topbar height - use in any `top`/`calc` offset that depends on topbar).
- **BEM-adjacent naming** (block-element pattern).
- **`wiki.css` is the aggregator** - it `@import`s the modules and **holds no rules of its own.**
- **Theming:** `data-theme` is binary `light`/`dark` for CSS-only overrides in `themes.css` (focus outline, shadows, code-block colors). Visual presets are JS-computed background entries in settings that set `--bg`/`--surface`/`--text-heading`/`--accent` on `:root` — not extra `[data-theme="…"]` named themes.
- View-specific rules live in `view-*.css` or a `view-*/` subfolder; shared components in `css/components/`. Don't put view styles in the shared files or vice versa.
- **`css/components/` and `view-content/` are split by sub-concern.** A new component/view rule set crossing ~400 lines gets its own file in the matching subfolder, imported from `wiki.css` in the same position.
- **Responsive:** mobile-first. All new CSS must work at 320px. Breakpoints live in `responsive.css` - not `tokens.css`, not scattered in view files. No new breakpoints outside `responsive.css` without a deliberate decision.
- **Modal scrim naming:** click-outside dismiss layers use the `-backdrop` suffix. Full-viewport layer containers that own their own chrome (zoom lightbox) keep `-overlay` on the root element; nested scrims inside those may still use `-backdrop`.
- **No fixed px for layout dimensions that must adapt.** Use fluid units for layout-level sizing: `min()`, `max()`, `clamp()`, `vw`, `vh`, `%`. Fixed `px` is correct for: borders, outlines, icon sizes, touch targets (44px min), blur radii, `transform` nudges. Fixed `px` is wrong for: panel widths, drawer widths, overlay heights, `top`/`scroll-margin-top` offsets tied to a layout measurement. For topbar-relative offsets use `var(--topbar-h)` or `calc(var(--topbar-h) + ...)` - never a raw px value.
- **Section-divider banners are a two-level hierarchy, nothing more.** A file has at most: one implicit "root" (the file itself) and, within it, section banners for genuinely distinct rule groups. No third tier. Section banners use the full box form:
  ```css
  /* ═══════════════════════════════════════════════
     SECTION NAME
     ═══════════════════════════════════════════════ */
  ```
  Never a ticket ID in the banner text. A one-line non-obvious "why" comment nested inside a section is a different thing entirely - keep those as ordinary one-line comments, not banners.

---

## State & persistence

- **Session / identity live in React state + memory**, never in `localStorage`. The httpOnly cookie + backend are the sole auth authority; `GET /auth/me` sets the in-memory session.
- **`lib/storage/` owns localStorage.** No other module touches `localStorage` directly.
- **Cache-through model (with auth):** localStorage is the instant read path and UI source of truth; the API is the durable source. Sync hooks inject *inside* the relevant `lib/storage/` save function so existing callers are unchanged. Writes go through a persisted outbox (`lib/storage/outbox.ts`, drained by `lib/storage/sync.ts`) and are replayed in order, so a failed or offline write is retried instead of dropped; a pull only runs once the outbox is empty.
- **Scroll position stays local-only** - ephemeral, device-specific, never synced.

For the full model and the *why*, see the decisions docs:
[auth-integration.md](./docs/_meta/auth-integration.md) (caching, session state) and [auth.md](./docs/_meta/auth.md) (data model). This file states the *practice*; those docs hold the *contract values*.

---

## Errors & API

- **All backend calls go through one wrapper (`lib/api.ts`).** No module makes its own `fetch` to the backend. The wrapper sets `credentials: "include"` once, parses JSON, and owns the base-URL detect.
- **Never read the session cookie in JS.** It's httpOnly by design. The "logged-in?" signal is the in-memory session from `GET /auth/me`.
- **Errors are typed, switched on `code`.** The wrapper throws `ApiError(code, message, status)` parsed from the backend error envelope. Callers `catch` and **switch on the machine `code`, never on the human `message` text.**

  ```ts
  // illustrative shape - not the implementation
  class ApiError extends Error {
    constructor(
      public code: string,
      message: string,
      public status: number,
    ) {
      super(message);
    }
  }
  ```

- **One global 401 handler** in the wrapper: any 401 → clear session, emit `wiki:session-expired`. Callers never repeat 401 logic.
- **`code` strings are a cross-repo contract** with the backend - switch on the same strings the BE emits; don't invent FE-local ones. The canonical list lives in [auth.md](./docs/_meta/auth.md) and the BE repo.
- **Password validation runs on both FE and BE** - one rule, two implementations, kept in sync via the decisions doc. The FE does the live checklist; the BE is the backstop. The 5 rules' values are in [auth.md](./docs/_meta/auth.md) (Password policy), not duplicated here.

---

## Security

- **XSS / sanitisation is an invariant.** User-influenced HTML must stay safe. Build-time article HTML is trusted pipeline output only. Regression-guarded by `tests/e2e/test_security.py` - don't weaken it without updating that guard deliberately.
- **No runtime sanitiser (decided 2026-10-02).** Article HTML is git-authored build output with no runtime user content, so the pipeline passes raw HTML through by design. Revisit (e.g. `rehype-sanitize`) if user-supplied content is ever rendered.
- **`BACKEND_URL` is public, not a secret.** The browser must call it, so it lives in code by design. Security comes from CORS + the httpOnly cookie + BE validation, not from hiding the URL.
- **No secrets, keys, or real email addresses in any tracked file** - including tests. Test emails use `@example.com`.

---

## Interactive elements

- Prefer React event handlers and controlled components over ad-hoc DOM listeners.
- Event delegation on a stable parent is fine inside an island when wiring many static children.
- Boolean UI-mode state (focus mode, distraction-free, etc.): React state + mirrored DOM class as needed. Prefer co-locating mode state with the island that owns the UX.

---

## Async

- **Surface loading, empty, and error states** in the owning island/page for any async operation that drives visible UI. One-off internal fetches that don't affect UI directly are exempt.
- **Fetches interruptible by navigation must accept an `AbortSignal`** (or equivalent cleanup in `useEffect`) and cancel cleanly on unmount/route change.
- **Two allowed shapes for backend calls, don't mix them:** (1) **background sync** (optimistic localStorage-then-outbox writes in `lib/storage/`) - queued via `enqueueSync`, never blocks the UI, never surfaces the error. (2) **user-initiated request flows** (auth login/register/verify/etc.) - always `await`ed, errors caught and surfaced via `ApiError`. Don't `await` a best-effort sync call and don't fire-and-forget a user-initiated one.

---

## Accessibility

- All interactive elements must be keyboard-accessible and have a discernible label (`aria-label`, visible text, or associated `<label>`).
- Semantic HTML first. Custom widgets only when no semantic element fits - if unavoidable, follow ARIA Authoring Practices for that widget role.
- Focus is managed explicitly on modal open/close and major view transitions.
- Never suppress `outline` without providing an equivalent visible focus indicator.

---

## Error surfacing

- **No `console.*` in committed code** (see TypeScript / React section). This means errors must go somewhere else.
- User-visible errors surface through the UI - a toast, an inline error state - not the console.
- No file-local `DEBUG` flags. Strip dev logging before committing.

---

## Service worker

- Offline caching is **Serwist** (`app/sw.ts` → `out/sw.js`). Precache manifests are hashed at build time — **no manual cache-version bump.**
- Custom article save/evict lives in `lib/pwa/` and is wired through the SW; don't invent a parallel cache layer.

---

## Testing

### Vitest (unit / component)

- Every new unit ships with a passing test.
- **Fixture-first (red-green)** for *new logic* — remark/rehype plugins under `lib/content/plugins/` and pure `lib/` functions (api client, storage, search scoring, matrix merge). Failing test → implement → pass.
- **Code-then-test** for *ports of known-good behaviour* — island ports where the behaviour is already specified by a prior implementation. Port first, then write the test that locks it. The island still ships with a test.
- Co-locate `*.test.ts` / `*.test.tsx` with the module (unit project). Full-corpus emit checks live in `tests/content/artifacts.test.ts` (content project) — never re-loop `getArticle`/`buildManifest` over the whole corpus in unit tests.
- Scripts: `pnpm test` = unit (parallel) + pipeline (single-fork, Shiki once); `pnpm test:content` = one `buildContent` + artifact asserts; `pnpm test:all` = both (CI). Local e2e: `pnpm test:e2e` (`-n 2`, match CI light lane).

### End-to-end (Playwright + pytest)

- Test behaviour as the user sees it against the static `out/` export (see `tests/conftest.py`).
- **Canary articles are the e2e content surface.** Feature behaviour in a rendered article (math, footnotes, prerequisites, TOC, callouts, and so on) is tested against fixtures in `tests/fixtures/canary/*.md`, served at `/e2e-canary/<name>/` only by an e2e build (`pnpm build:e2e`, `WIKI_E2E=1`). They render through the real pipeline and the real reader islands, so they test the full stack, but they are not in the manifest, search, backlinks or any index. Never inject markdown at runtime. A canary must stay above `STUB_THRESHOLD` (a unit test enforces it), and one that links to a real article breaks loudly if that article is renamed.
- **`content_page("<canary>")`** is a module-scoped, read-only page: one `goto` per canary per module, reset to the top for each test. Tests that change state (storage, settings, DOM, login) use the per-test `page` instead.
- **`logged_in(role=None, synced=None)`** stubs a signed-in session and the sync pulls before the first `goto`; re-route an endpoint after calling it to observe or fail that call (the latest route wins). **`seed_bookmarks(*entries)`** seeds bookmarks once per tab before the app boots.
- **No skip-marked placeholders.** A test for an unbuilt feature is written with the feature; its ticket tracks it. A runtime `pytest.skip` must never hide a missing precondition: assert it.
- Add a test here only if it needs a real browser (layout, scroll, focus, overlay geometry, rendered diagrams). Behaviour already covered by a Vitest pipeline fixture or island test is not re-asserted in e2e.
- **Read `tests/conftest.py` before writing any e2e test** - it defines every shared fixture and navigation helper. **Add a fixture or conftest helper only when it removes a shared race or a flow repeated across files** (e.g. the hotkeys-ready wait), with a one-line docstring saying why; otherwise use what exists.
- **Add tests to the existing file** matching the feature. Never create a new test file unless the feature genuinely has no home.
- Use `page.locator()` + `expect()`; avoid `page.query_selector()`.
- **Never use `page.evaluate("element.click()")` to interact with elements.** If Playwright's actionability checks reject a click, fix the production code so the element is genuinely reachable.
- **`page.wait_for_timeout()` is banned except for a genuine negative assertion** or waiting out a fixed internal timer with no completion hook. Prefer condition-based waits.
- **Selectors:** prefer user-visible text or ARIA roles. Use `data-testid` only when no semantic alternative exists.
- **Isolation:** every test resets localStorage via the conftest fixture.
- **Naming:** descriptive and behavior-focused (`test_login_unverified_shows_verify_panel`).
- Cover the **happy path and the error/edge path** (e.g. the anon-no-API-call invariant for sync).
- **Never run the full e2e suite unprompted** - may run the specific new/changed test file; the user owns full-suite runs.
- Follow-up epic (not this migration): port the Python Playwright e2e suite to `@playwright/test` (TypeScript) — tracked post-migration (spec §10, §14).

---

## Content code blocks (DSA/algorithm articles)

- **Comments in embedded Python/pseudocode follow the same bar as app TS** (see TypeScript / React → Comments above): earn their place only for the *why* - a non-obvious invariant, a gotcha, a constraint the next line depends on. Never restate what the line does.
- **Never justify an implementation choice by "so the article's prose matches."** If a data-structure/algorithm choice exists only to make a worked trace reproducible, that reasoning belongs in the surrounding prose (if anywhere), not as a code comment.
- **Verify runnable code before shipping it in an article** - actually execute it (or paste + run in a scratch file), don't eyeball it.

---

## Content changelog

- **One line per entry, ≤12 words (15 max if truly needed).** `content/CHANGELOG.md` is a scan list, not a commit log - `` `file.md` - what changed in a few words ``. No parenthetical breakdowns of every section/table/edge-case added.
- The detail belongs in the article itself and in the commit message, not the changelog.

---

## Content backlog

- Content work is tracked in `docs/content-backlog.md` (Done/Dropped in `docs/content-archive.md`). Schema: `docs/_meta/ai-instructions/content-backlog.md`.
- These are **not** app tickets. IDs are `DSA-xxx` / `SD-xxx`. Never file content findings as `WIKI-xxx`.
- Path column omits the `content/` prefix. Description: ≤30 words; short sentences separated by semicolons.
- Group by article or by shared change across articles when the work ships together.
- Pending `*-content-audit*` reports become backlog rows via `.prompts/fe-audit-reports-to-content-backlog.md`, not via the tickets prompt.

---

## Workflow

- Keep diffs focused - one concern per commit (mirrors the SRP rule for code).
- Never `git add` / `commit` / `push` unless explicitly asked. Never add `Co-Authored-By`.
- Never put `WIKI-xxx` ticket IDs in code comments, test names, skip reasons, docstrings or CSS section headers.
- Never put content-backlog IDs (`DSA-xxx` / `SD-xxx`) in app code/CSS either; they belong only in content-backlog docs and related content commits/changelog notes when useful.
- When reviewing, treat each section of this file as a checklist. If a repeated violation isn't covered by an existing rule, add the rule here.
- **Enforcement tooling:** ESLint + Biome in pre-commit and CI. Semantic rules (module boundaries, island rule, no ticket IDs) remain on author + reviewer until custom lint rules are added.

---

## Meta docs

- Living meta docs that can drift from the codebase they describe - currently `docs/_meta/audit-prompts/` and `docs/_meta/ai-instructions/` - open with a meta-info table, immediately under the title, before any other content:

  ```markdown
  | Created | Last updated | Status |
  |---|---|---|
  | YYYY-MM-DD | YYYY-MM-DD | current |
  ```

  - **Created** - date of the file's first commit (`git log --follow --diff-filter=A --format=%ad --date=short -- <file> | tail -1`), not guessed.
  - **Last updated** - date of the most recent substantive edit (today's date when you're making one).
  - **Status** - one word only: `current` or `outdated`. No reasoning in this field - if an `outdated` file needs explaining, say why in the file's own body, not the table.
  - Dated/historical-by-design docs (`docs/_meta/audit-reports/`, `docs/_meta/plans/`) are exempt - their filenames already carry a date and staleness is expected, not a defect to track.
  - Don't backfill this table onto a file until it's actually touched for another reason, or a meta-doc sweep explicitly asks for it across a directory.
