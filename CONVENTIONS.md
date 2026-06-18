# Coding Standards — wiki-fe

Prescriptive standards for this repo. Rules, not suggestions. New code follows them; changed code
is brought up to them. The app has **no build step and no linter wired up yet** — until that lands
(see Workflow), enforcement is on the **author and reviewer**, not a tool.

This file is the *how to write the code*. The operational map (which file owns what, which skill to
invoke, where to read for a task) lives in [CLAUDE.md](./CLAUDE.md).

---

## Core principles

- **SRP (Single Responsibility).** One module, one concern. Each `js/` file owns exactly one slice
  of the app (see the module map below); a function does one thing. If you can't name what a module
  owns in one phrase, it's doing too much.
- **DRY (Don't Repeat Yourself).** Logic lives in one place. Shared pure helpers belong in
  `state.js` (`escHtml`, `fuzzyMatch`). A repeated literal → a named constant. A CSS value used
  twice → a token in `tokens.css`, never copied.
- **SoC (Separation of Concerns).** Rendering, persistence, content processing, and search never
  bleed into each other — that's why they're separate modules. Keep the boundaries.
- **YAGNI.** Build for the current version. No framework, no abstraction layer, no config knob until
  a real second caller needs it. The app is deliberately small and dependency-light.
- **Explicit over implicit.** No magic globals beyond the documented `window.*` handlers. Dynamic
  behaviour is wired in code you can grep, not inferred.
- **Fail loud in dev.** A broken selector, a missing element, an unexpected API `code` should
  surface — don't silently swallow.

---

## Architecture

Single-page app. **No build step, no framework, no TypeScript.** Plain ES6 modules served as-is.

**Boot:** `index.html` → `wiki.css` → `app.js` → registers service worker → reads state → routes
to the correct view.

**Views:** `#view-home`, `#view-index`, `#view-content` — exactly one active at a time. View state
is owned by `state.js`.

**Content loading:** `content.js` fetches `.md` files from `content/` over HTTP → parses front
matter → builds the search index. `render.js` converts markdown to DOM.

**Persistence:** `storage.js` → `localStorage` (today). With auth, localStorage becomes a
cache-through layer over the backend — see State & persistence below.

### Module map is a contract

Each `js/` module owns one concern. Do not reach across the boundary — call the owning module.

| Module       | Owns                                                                                   |
| ------------ | -------------------------------------------------------------------------------------- |
| `app.js`     | Entry/bootstrap, hash router, `window.*` globals for inline handlers, keyboard shortcuts |
| `state.js`   | App state object, WIKIS registry, shared caches, shared pure utilities                 |
| `content.js` | Post-markdown content processing (callouts, copy buttons, Mermaid, highlight.js, …)    |
| `render.js`  | View rendering (home grid, index sections, content layout, TOC, breadcrumbs)           |
| `search.js`  | ⌘K modal lifecycle, fuzzy scoring, result rendering                                    |
| `storage.js` | All `localStorage` access + cache-through backend sync hooks when logged in            |
| `auth.js`    | Auth domain: password-rule validation, auth modal controller, login/register/logout/resend, anon→login migration |
| `api.js`     | Single wrapper for all `wiki-be` calls (base-URL detect, credentials, `ApiError`, global 401) |

`state.js` is the **single source of app state.** Other modules read/write state through it, not via
their own parallel globals.

---

## JavaScript

- **ES6 modules only.** No bundler, no transpile, no TypeScript. Code ships exactly as written.
- **No `console.*` in committed code.** Strip `console.log`/`warn`/`error`/`debug` before committing
  — they're dev scaffolding, not a logging system. If a genuine error path must surface, surface it
  through the UI (toast / error state), not the console.
- **No inline styles** except dynamic values set programmatically via JS (e.g. a computed width).
  Everything static is a CSS class.
- **Inline `onclick` handlers require a `window.*` global** (see the WINDOW GLOBALS block in
  `app.js`). Prefer the existing `data-action` delegation for new static buttons over adding globals.
- **Naming:** `camelCase` for vars/functions, `UPPER_SNAKE` for module-level constants with a
  one-line reason if non-obvious.
- **No new runtime dependencies** without a deliberate decision — the no-build, offline-first model
  depends on staying lean.

---

## CSS

- **`tokens.css` is the single source of every value** — spacing, type scale, colours, radius,
  transitions. **Read it first for any CSS task.** Never hardcode a value that a token already
  expresses; never duplicate a token's value in another file.
- **BEM-adjacent naming** (block-element pattern).
- **`wiki.css` is the aggregator** — it `@import`s the modules and **holds no rules of its own.**
- **Theming via `data-theme`** — per-theme overrides live in `themes.css`, never scattered.
- View-specific rules live in their `view-*.css`; shared components in `components.css` /
  `components-auth.css`. Don't put view styles in the shared files or vice versa.

---

## State & persistence

- **`state.js` owns app state.** Identity, view, caches — read and mutate through it.
- **`storage.js` owns localStorage.** No other module touches `localStorage` directly.
- **Cache-through model (with auth):** localStorage is the instant read path and UI source of truth;
  the API is the durable source. Sync hooks inject *inside* `storage.js` save functions so existing
  callers are unchanged. Writes are **fire-and-forget**; a load-time pull reconciles drift.
- **Identity is never cached in localStorage** — `state.session` lives in memory only; the
  httpOnly cookie + backend are the sole authority.
- **Scroll position stays local-only** — ephemeral, device-specific, never synced.

For the full model and the *why*, see the decisions docs:
[decisions/auth-integration.md](./docs/_meta/decisions/auth-integration.md) (caching, session state)
and [decisions/auth.md](./docs/_meta/decisions/auth.md) (data model). This file states the
*practice*; those docs hold the *contract values*.

---

## Errors & API

> Applies fully once `js/api.js` lands; the rules below are the standing contract for that code.

- **All backend calls go through one wrapper (`api.js`).** No module makes its own `fetch` to the
  backend. The wrapper sets `credentials: "include"` once, parses JSON, and owns the base-URL detect.
- **Never read the session cookie in JS.** It's httpOnly by design — JS cannot and must not try.
  The "logged-in?" signal is `state.session`, set from `GET /auth/me`.
- **Errors are typed, switched on `code`.** The wrapper throws `ApiError(code, message, status)`
  parsed from the backend error envelope. Callers `catch` and **switch on the machine `code`, never
  on the human `message` text.**

  ```js
  // illustrative shape — not the implementation
  class ApiError extends Error {
    constructor(code, message, status) { super(message); this.code = code; this.status = status; }
  }
  ```

- **One global 401 handler** in the wrapper: any 401 → flip `state.session` to logged-out, emit
  `wiki:session-expired`. Callers never repeat 401 logic.
- **`code` strings are a cross-repo contract** with the backend — switch on the same strings the BE
  emits; don't invent FE-local ones. The canonical list lives in
  [decisions/auth.md](./docs/_meta/decisions/auth.md) (Auth flow + Security guards) and the BE repo.
- **Password validation runs on both FE and BE** — one rule, two implementations, kept in sync via
  the decisions doc. The FE does the live checklist; the BE is the backstop. The 5 rules' values are
  in [decisions/auth.md](./docs/_meta/decisions/auth.md) (Password policy), not duplicated here.

---

## Security

- **XSS / sanitisation is an invariant.** User-influenced or markdown-derived HTML must stay safe.
  This is regression-guarded by `tests/e2e/test_security.py` — don't weaken it without updating that
  guard deliberately.
- **`BACKEND_URL` is public, not a secret.** The browser must call it, so it lives in code by design.
  Security comes from CORS + the httpOnly cookie + BE validation, not from hiding the URL.
- **No secrets, keys, or real email addresses in any tracked file** — including tests. Test emails
  use `@example.com`.

---

## Service worker

- **Any change to `wiki-sw.js` requires a cache-version bump.** Never skip it — stale caches ship
  broken assets to returning users. Adding new files to the app (e.g. `js/api.js`) counts as a
  change that must be reflected on the next deploy.

---

## Testing

- **End-to-end only, through the UI** (Playwright + pytest). Test behaviour as the user sees it,
  never JS functions directly.
- **Read `tests/conftest.py` before writing any test** — it defines every shared fixture and
  navigation helper. **Never add new fixtures or conftest helpers** — use what exists.
- **Add tests to the existing file** matching the feature (see the test map in CLAUDE.md). Never
  create a new test file unless the feature genuinely has no home.
- **Match the existing structure** in that file (function- vs class-based, fixture usage).
- Use `page.locator()` + `expect()`; avoid `page.query_selector()`.
- Cover the **happy path and the error/edge path** (e.g. the anon-no-API-call invariant for sync).
- **Never run the tests** — write correct test code; the user runs them.

---

## Workflow

- Keep diffs focused — one concern per commit (mirrors the SRP rule for code).
- Never `git add` / `commit` / `push` unless explicitly asked. Never add `Co-Authored-By`.
- Never put `WIKI-xxx` ticket IDs in code comments or CSS section headers.
- **Enforcement tooling — [TBD].** No linter / formatter / pre-commit is wired up yet. When one is
  added (the auth work notes adding pre-commit to FE to mirror the BE), document the mechanical
  rules it enforces here and move those from "author + reviewer own it" to "tool-enforced."
