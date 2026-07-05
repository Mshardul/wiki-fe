# Coding Standards - wiki-fe

Prescriptive standards for this repo. Rules, not suggestions. New code follows them; changed code is brought up to them. **Biome** runs as a pre-commit hook and in CI (standalone binary, no node_modules) - it enforces formatting and lint mechanics automatically. Semantic rules (module boundaries, no `console.*`, etc.) remain on the author and reviewer.

This file is the *how to write the code*. The operational map (which file owns what, which skill to invoke, where to read for a task) lives in [CLAUDE.md](./CLAUDE.md).

---

## Core principles

- **SRP (Single Responsibility).** One module, one concern. Each `js/` file owns exactly one slice of the app (see the module map below); a function does one thing. If you can't name what a module owns in one phrase, it's doing too much.
- **Size is a signal, not a rule to game.** A file crossing **~400 lines** is a prompt to split it by sub-concern into a domain subfolder (`js/domain/sub-file.js`, `css/view-x/sub-file.css`) - don't wait for a "refactor" ticket to do it. Exception: a single cohesive pipeline (fetch → render → wire, no independently reusable piece) may stay one file past the threshold if splitting would only fragment one linear flow - note the exception in a one-line comment at the top of that file.
- **DRY (Don't Repeat Yourself).** Logic lives in one place. Shared pure helpers belong in `state.js` (`escHtml`, `fuzzyMatch`). A repeated literal → a named constant. A CSS value used twice → a token in `tokens.css`, never copied.
- **SoC (Separation of Concerns).** Rendering, persistence, content processing, and search never bleed into each other - that's why they're separate modules. Keep the boundaries.
- **YAGNI.** Build for the current version. No framework, no abstraction layer, no config knob until a real second caller needs it. The app is deliberately small and dependency-light.
- **Explicit over implicit.** No magic globals beyond the documented `window.*` handlers. Dynamic behaviour is wired in code you can grep, not inferred.
- **Fail loud in dev.** A broken selector, a missing element, an unexpected API `code` should surface - don't silently swallow.

---

## Architecture

- Single-page app. **No build step, no framework, no TypeScript.** Plain ES6 modules served as-is.
- **Boot:** `index.html` → `wiki.css` → `app.js` → registers service worker → reads state → routes to the correct view.
- **Views:** `#view-home`, `#view-index`, `#view-content` - exactly one active at a time. View state is owned by `state.js`.
- **Content loading:** `js/content/` post-processes fetched `.md` after markdown→HTML. `js/render/` fetches `.md`, parses it, and converts it to DOM (routing, home/index views, content pipeline, related articles).
- **Persistence:** `js/storage/` → `localStorage` (today). With auth, localStorage becomes a cache-through layer over the backend - see State & persistence below.

### Module map is a contract

Each `js/` domain owns one concern; each file inside it owns one sub-concern. Do not reach across a domain boundary - call the owning module. Never read every file in a domain folder to find something - the tables below say exactly which file owns which behavior.

| Domain            | Owns                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `app.js` + `app/`  | Entry/bootstrap, hash router wiring, `window.*` globals, keyboard shortcuts, mobile gestures, wiki switcher, debug overlay |
| `state.js`         | App state object, WIKIS registry, shared caches, shared pure utilities                                           |
| `content/`         | Post-markdown content processing (callouts, copy buttons, Mermaid, TOC, focus mode, glossary, footnotes, …)      |
| `render/`          | Routing + view rendering (home grid, index sections, content pipeline, breadcrumbs, related articles, toast)     |
| `search.js`        | ⌘K modal lifecycle, fuzzy scoring, result rendering                                                              |
| `storage/`         | All `localStorage` access + cache-through backend sync hooks when logged in                                      |
| `auth.js`          | Auth domain: password-rule validation, auth modal controller, login/register/logout/resend, anon→login migration |
| `api.js`           | Single wrapper for all `wiki-be` calls (base-URL detect, credentials, `ApiError`, global 401)                    |

#### `js/content/` - post-markdown enhancement

| File                   | Owns                                                                            |
| ---------------------- | -------------------------------------------------------------------------------- |
| `zoom-lightbox.js`     | Zoom overlay (shared by image + diagram zoom), pinch/pan/swipe gestures          |
| `code-blocks.js`       | Code block header, copy buttons, clipboard helper, line numbers, hljs theme sync |
| `mermaid.js`           | Diagram render/re-render, node captions, step-through walkthrough                |
| `tables.js`            | Column sort, quiz-me mode, table scroll cues                                     |
| `toc.js`               | TOC build, sticky section header, per-heading collapse, progress ring            |
| `formatting.js`        | Callouts, prerequisites chips, anchor links, LaTeX toggle/copy, focus mode, tabbed code blocks, footnotes, in-article find |
| `glossary-caveats.js`  | Inline caveat reveals, glossary popovers/expand, rendered-HTML session cache      |

#### `js/render/` - routing + view rendering

| File                    | Owns                                                                          |
| ----------------------- | -------------------------------------------------------------------------------- |
| `router.js`             | Hash router (`navigate`/`route`), view switching, slug resolution               |
| `home-index.js`         | Home grid, wiki index sections, card filter/swipe/hover, article counts         |
| `content-view.js`       | Content render pipeline (fetch → parse → post-process → wire links/preview) - kept as one file, see size-threshold exception |
| `related-articles.js`  | Related-article ranking + rendering                                             |
| `nav-utils.js`          | Path resolution, breadcrumb, page title, `fetchText`, `readingTime`             |
| `toast.js`              | Toast queue + display                                                           |

#### `js/storage/` - localStorage + sync

| File                  | Owns                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `bookmarks.js`        | Bookmark CRUD, bookmarks section render                             |
| `recents.js`          | Recently-visited CRUD, recents section render                       |
| `read-tracking.js`    | Read/unread state, quiz-reveal tracking                             |
| `offline.js`          | Service-worker cache download/remove/check for offline articles      |
| `settings-theme.js`   | Settings object, theme/background/accent/font data, `Settings`/`Theme`/`Sync`, multi-tab sync listener |
| `scroll-collapse.js`  | Scroll-position cache, section collapse state, TOC scroll, recent searches |

#### `js/app/` - bootstrap-adjacent behaviors

| File                  | Owns                                          |
| --------------------- | ------------------------------------------------ |
| `mobile-panels.js`    | Mobile TOC drawer, swipe gestures, panel-close registry, viewport resize |
| `wiki-switcher.js`    | Wiki switcher modal open/close/render             |
| `debug-overlay.js`    | `?debug` diagnostic overlay                       |
| `home-parallax.js`    | Home hero mouse-parallax effect                   |
| `print.js`            | Print-article trigger                             |
| `distraction-free.js` | Distraction-free mode toggle                      |

`state.js` is the **single source of app state.** Other modules read/write state through it, not via their own parallel globals.

---

## JavaScript

- **ES6 modules only.** No bundler, no transpile, no TypeScript. Code ships exactly as written.
- **No `console.*` in committed code.** Strip `console.log`/`warn`/`error`/`debug` before committing - they're dev scaffolding, not a logging system. If a genuine error path must surface, surface it through the UI (toast / error state), not the console.
- **No inline styles** except dynamic values set programmatically via JS (e.g. a computed width). Everything static is a CSS class.
- **Inline `onclick` handlers require a `window.*` global** (see the WINDOW GLOBALS block in `app.js`). Prefer the existing `data-action` delegation for new static buttons over adding globals.
- **Naming:** `camelCase` for vars/functions, `UPPER_SNAKE` for module-level constants with a one-line reason if non-obvious.
- **No new runtime dependencies** without a deliberate decision - the no-build, offline-first model depends on staying lean.
- **Comments are sparse and short.** A comment earns its place only when the code can't say it itself - the *why*, a non-obvious constraint, a gotcha. Default to none. When you do comment, **one line**, not a paragraph. Never narrate *what* the next lines do (the code shows that), never restate the function name, never write multi-line block comments explaining mechanics. Section-divider banners (`/* ─── X ─── */`) are fine; prose explanations of straightforward code are not.
- **Comments are project-level, never ticket- or task-level.** Never reference a ticket number (`WIKI-xxx`), task number, PR number, or branch name in a code comment or CSS section header. Those belong in the commit message or PR description - not in the source file, where they rot.

---

## CSS

- **`tokens.css` is the single source of every value** - spacing, type scale, colours, radius, transitions. **Read it first for any CSS task.** Never hardcode a value that a token already expresses; never duplicate a token's value in another file.
- **Add a token before repeating a value.** If a CSS value (color, font-weight, z-index, transition duration, font-size) appears in more than one rule and no token exists yet, add the token to `tokens.css` first, then use `var(--token-name)` everywhere. Available token groups: `--fw-*` (font-weight), `--z-*` (z-index layers), `--text-*` (font-size scale - always prefer over raw rem/em values), `--color-*` (semantic status colors), `--overlay-*` (rgba scrim colors), `--t*` (transitions), `--s*` (spacing), `--r-*` (border-radius, including `--r-xs: 4px`), `--topbar-h` (topbar height - use in any `top`/`calc` offset that depends on topbar).
- **BEM-adjacent naming** (block-element pattern).
- **`wiki.css` is the aggregator** - it `@import`s the modules and **holds no rules of its own.**
- **Theming via `data-theme`** - per-theme overrides live in `themes.css`, never scattered.
- View-specific rules live in `view-*.css` or a `view-*/` subfolder; shared components in `components/` / `components-auth.css`. Don't put view styles in the shared files or vice versa.
- **`components/` and `view-content/` are split by sub-concern** (see the module map above for the JS equivalent). `components/topbar.css`, `search-modal.css`, `preferences-modal.css`, `toast.css`, `wiki-switcher.css`; `view-content/layout.css`, `code.css`, `mermaid.css`, `callouts-prereqs.css`, `interactive.css`, `glossary-related.css`. A new component/view rule set crossing ~400 lines gets its own file in the matching subfolder, imported from `wiki.css` in the same position.
- **Responsive:** mobile-first. All new CSS must work at 320px. Breakpoints live in `responsive.css` - not `tokens.css`, not scattered in view files. No new breakpoints outside `responsive.css` without a deliberate decision.
- **No fixed px for layout dimensions that must adapt.** Use fluid units for layout-level sizing: `min()`, `max()`, `clamp()`, `vw`, `vh`, `%`. Fixed `px` is correct for: borders, outlines, icon sizes, touch targets (44px min), blur radii, `transform` nudges. Fixed `px` is wrong for: panel widths, drawer widths, overlay heights, `top`/`scroll-margin-top` offsets tied to a layout measurement. For topbar-relative offsets use `var(--topbar-h)` or `calc(var(--topbar-h) + ...)` - never a raw px value.

---

## State & persistence

- **`state.js` owns app state.** Identity, view, caches - read and mutate through it.
- **Avoid direct property assignment to `state` from outside `state.js`.** Mutations from other modules should go through exported functions where they exist; adding direct `state.foo = …` in a caller is a smell.
- **`js/storage/` owns localStorage.** No other module touches `localStorage` directly.
- **Cache-through model (with auth):** localStorage is the instant read path and UI source of truth; the API is the durable source. Sync hooks inject *inside* the relevant `js/storage/` save function so existing callers are unchanged. Writes are **fire-and-forget**; a load-time pull reconciles drift.
- **Identity is never cached in localStorage** - `state.session` lives in memory only; the httpOnly cookie + backend are the sole authority.
- **Scroll position stays local-only** - ephemeral, device-specific, never synced.

For the full model and the *why*, see the decisions docs:
[decisions/auth-integration.md](./docs/_meta/decisions/auth-integration.md) (caching, session state) and [decisions/auth.md](./docs/_meta/decisions/auth.md) (data model). This file states the *practice*; those docs hold the *contract values*.

---

## Errors & API

> Applies fully once `js/api.js` lands; the rules below are the standing contract for that code.

- **All backend calls go through one wrapper (`api.js`).** No module makes its own `fetch` to the backend. The wrapper sets `credentials: "include"` once, parses JSON, and owns the base-URL detect.
- **Never read the session cookie in JS.** It's httpOnly by design - JS cannot and must not try. The "logged-in?" signal is `state.session`, set from `GET /auth/me`.
- **Errors are typed, switched on `code`.** The wrapper throws `ApiError(code, message, status)` parsed from the backend error envelope. Callers `catch` and **switch on the machine `code`, never on the human `message` text.**

  ```js
  // illustrative shape - not the implementation
  class ApiError extends Error {
    constructor(code, message, status) { super(message); this.code = code; this.status = status; }
  }
  ```

- **One global 401 handler** in the wrapper: any 401 → flip `state.session` to logged-out, emit `wiki:session-expired`. Callers never repeat 401 logic.
- **`code` strings are a cross-repo contract** with the backend - switch on the same strings the BE emits; don't invent FE-local ones. The canonical list lives in [decisions/auth.md](./docs/_meta/decisions/auth.md) (Auth flow + Security guards) and the BE repo.
- **Password validation runs on both FE and BE** - one rule, two implementations, kept in sync via the decisions doc. The FE does the live checklist; the BE is the backstop. The 5 rules' values are in [decisions/auth.md](./docs/_meta/decisions/auth.md) (Password policy), not duplicated here.

---

## Security

- **XSS / sanitisation is an invariant.** User-influenced or markdown-derived HTML must stay safe. This is regression-guarded by `tests/e2e/test_security.py` - don't weaken it without updating that guard deliberately.
- **`BACKEND_URL` is public, not a secret.** The browser must call it, so it lives in code by design. Security comes from CORS + the httpOnly cookie + BE validation, not from hiding the URL.
- **No secrets, keys, or real email addresses in any tracked file** - including tests. Test emails use `@example.com`.

---

## Interactive elements

- **Prefer plain functions + event delegation on a stable parent** over attaching listeners to individual elements.
- **No classes** unless per-instance state must outlive the handler lifecycle. That case is rare - prefer a closure or a data attribute.
- **No Custom Elements** - the app doesn't use that API.

---

## Async

- **Surface loading, empty, and error states** via `state.js` flags for any async operation that drives visible UI. One-off internal fetches that don't affect UI directly are exempt.
- **Fetches interruptible by a view change must accept an `AbortSignal`** and cancel cleanly on signal.
- **Clean up on view teardown** (cancel in-flight work, reset transient UI state). Teardown is managed in `app.js` via the hash router.

---

## Accessibility

- All interactive elements must be keyboard-accessible and have a discernible label (`aria-label`, visible text, or associated `<label>`).
- Semantic HTML first. Custom widgets only when no semantic element fits - if unavoidable, follow ARIA Authoring Practices for that widget role.
- Focus is managed explicitly on view changes; see `app.js`.
- Never suppress `outline` without providing an equivalent visible focus indicator.

---

## Error surfacing

- **No `console.*` in committed code** (see JavaScript section). This means errors must go somewhere else.
- User-visible errors surface through the UI - a toast, an inline error state - not the console.
- No file-local `DEBUG` flags. Strip dev logging before committing.

---

## Service worker

- **Any change to `wiki-sw.js` requires a cache-version bump.** Never skip it - stale caches ship broken assets to returning users. Adding new files to the app (e.g. `js/api.js`) counts as a change that must be reflected on the next deploy.

---

## Testing

- **End-to-end only, through the UI** (Playwright + pytest). Test behaviour as the user sees it, never JS functions directly.
- **Read `tests/conftest.py` before writing any test** - it defines every shared fixture and navigation helper. **Never add new fixtures or conftest helpers** - use what exists.
- **Add tests to the existing file** matching the feature (see the test map in CLAUDE.md). Never create a new test file unless the feature genuinely has no home.
- **Match the existing structure** in that file (function- vs class-based, fixture usage).
- Use `page.locator()` + `expect()`; avoid `page.query_selector()`.
- **Never use `page.evaluate("element.click()")` to interact with elements.** If Playwright's actionability checks reject a click, fix the production code (e.g. remove a static `aria-hidden`, correct a CSS visibility issue) so the element is genuinely reachable. `evaluate`-based clicks bypass the checks and will miss real regressions.
- **`page.wait_for_timeout()` is banned except for a genuine negative assertion** - proving something did *not* happen (no toast, no API call, no re-open) where no DOM state ever flips to signal "done," or waiting out a fixed internal timer (e.g. a debounce) that exposes no completion hook. Anything with an observable end state - element appears, class toggles, network settles - uses `wait_for_selector` / `expect(...).to_have_*` / `wait_for_function` instead. A sleep-based wait is CPU-load-dependent and is the first thing to flake when tests run in parallel; a condition-based wait isn't.
- **Selectors:** prefer user-visible text or ARIA roles. Use `data-testid` only when no semantic alternative exists.
- **Isolation:** every test resets localStorage via the conftest fixture - don't assume state from other tests.
- **Naming:** descriptive and behavior-focused (`test_login_unverified_shows_verify_panel`). No rigid template - match the style of the file you're adding to.
- Cover the **happy path and the error/edge path** (e.g. the anon-no-API-call invariant for sync).
- **Never run the tests** - write correct test code; the user runs them.

---

## Workflow

- Keep diffs focused - one concern per commit (mirrors the SRP rule for code).
- Never `git add` / `commit` / `push` unless explicitly asked. Never add `Co-Authored-By`.
- Never put `WIKI-xxx` ticket IDs in code comments or CSS section headers.
- When reviewing, treat each section of this file as a checklist. If a repeated violation isn't covered by an existing rule, add the rule here.
- **Enforcement tooling:** Biome runs in pre-commit and CI (formatting + lint mechanics). Semantic rules (module boundaries, no `console.*`, etc.) remain on author + reviewer until custom lint rules are added.

---
