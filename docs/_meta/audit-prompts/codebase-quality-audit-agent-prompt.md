# Codebase Quality Audit Agent — Prompt (wiki-fe)

Paste this as the prompt when spawning the agent (e.g. `general-purpose` subagent, or a fresh Claude Code session in `wiki-fe`).

---

You are auditing the `wiki-fe` repo (`/Users/shardul/Documents/Github/wiki/wiki-fe`) from the perspective of a senior frontend engineer doing a codebase-health review — not a bug hunt, not a UX review. This is a **build-free, vanilla JS/HTML/CSS wiki app** — no React, no bundler, no TypeScript (see `CLAUDE.md` / `CONVENTIONS.md` in repo root, read them first). **Biome** already owns formatting and mechanical lint (pre-commit + CI via `biome.json`). This audit is *not* a substitute for Biome and must not re-check quote style, semicolons, import sorting, or other mechanics Biome enforces — it is the higher-level semantic / cross-file review Biome cannot do.

Your job: find inconsistencies, structural smells, and correctness-adjacent design issues across the whole codebase — the kind of thing that shows up when comparing file A's approach to file B's, not the kind of thing visible from reading one file alone. Log each one to a running file as you find it — not at the end, not from memory.

This audit is **not**: a functional/state bug hunt (see `ui-components-audit`), a UX/viewport audit (see `auth-ux-audit`/`mobile-ux-audit`), a security trust-boundary review (see `security-audit`), an e2e CI resource/drift review (see `e2e-ci-health-audit`), or a mechanical style/formatting pass (Biome owns that; don't invent a second one via this audit).

## Goal

Sweep the codebase **concern by concern** (not file by file) — each pass compares every relevant file against every other file for that concern, since the point is catching cross-file drift, not auditing files in isolation.

### Concern 1 — Naming & terminology consistency

- Same concept, different names across files (e.g. "login" vs "sign in" vs "signin" as identifiers/function names — separate from the UX copy-tone check the auth-ux-audit already does; this is about *code* identifiers, not user-facing strings).
- Function/variable naming pattern drift (verb-noun vs noun-verb, `get*`/`fetch*`/`load*` used interchangeably for the same kind of operation across modules).
- File and module naming pattern consistency against `CLAUDE.md`'s stated conventions.

### Concern 2 — Data types & structures

- Same kind of data modeled differently in different places (e.g. does every "modal" module track open/closed state the same way — boolean flag vs class-on-element vs separate state object?).
- Structure-choice appropriateness: Map vs plain object vs array-of-objects for lookups/caches — flag places where the choice causes an O(n) scan where a Map/Set would be O(1), or where a structure is over-engineered for what it holds. Only flag if the collection can realistically grow large (hundreds+ items) or the scan runs on a hot path (every keystroke/render) — not one-off small lookups. CONVENTIONS.md's YAGNI principle applies to this audit too; don't generate premature-optimization noise.
- Duplicated shape: is the same data re-derived/re-shaped in multiple files instead of computed once and shared (e.g. `state.js` already centralizes some shared caches — check nothing duplicates that pattern locally instead of using it).

### Concern 3 — Design patterns & coupling

- Repeated boilerplate across files that should be a shared helper (e.g. repeated modal open/close/focus-trap logic across `search.js`, `bookmarks-modal.js`, `wiki-switcher.js`, `auth.js`'s modal — are they following one shared pattern or four subtly different reimplementations?). Check CONVENTIONS.md for documented, deliberate duplication exceptions first (e.g. the `_buildChipStrip` exception at CONVENTIONS.md's DRY section, <20-line helper duplicated across exactly 2 files) — don't flag a sanctioned exception as drift.
- **Modal registry conformance**: modals should go through `js/modal-registry.js` where that shared path exists. Flag any modal that reimplements open/close/focus-trap/Escape handling outside the registry without a documented reason.
- Event-delegation pattern consistency — some modules attach listeners directly, others delegate from a parent; is this a deliberate split or accidental drift?
- **Custom-event contract consistency**: grep for `dispatchEvent` / `CustomEvent` / `wiki:` event names (e.g. `wiki:session-expired`). Every emit must have at least one listener, and every listener must match an emit that still exists. Flag orphan emits, orphan listeners, and the same logical event under different name strings.
- Module coupling/layering — does `content/*` reach into `storage/*` directly, or go through `state.js`/a clean accessor? Does anything bypass `api.js` to call the backend directly (a prior manual note flagged a `/auth/me` direct-call bypass in `docs/_meta/audit-reports/manual-ui-audit - 20260714.md` — as of this prompt's last edit that's confirmed fixed, `/auth/me` only goes through `Api.auth.me()` in `api.js`; re-check it hasn't regressed rather than re-investigating from scratch, and check for *other* instances of the same bypass pattern elsewhere). Deeper mechanical boundary checks live in Concern 9.
- Dead code: for every exported function/const across `js/`, grep all other files for a usage site; zero-hit exports are dead-code candidates. Caveat: `window.*` globals wired for inline `onclick` handlers won't show up as JS import usages — cross-check those against the WINDOW GLOBALS block in `app.js` before flagging as dead.
- **Fragile DOM-traversal + shared-mutable-state collision risk**: grep `js/content/*.js` and `js/render/*.js` for the shape `heading.nextElementSibling` (or `el.nextElementSibling`) used in a `while` loop to re-derive "everything under this heading" (a section/subsection boundary), each paired with its own `heading.parentElement?.querySelectorAll(...)` scoping call. This pattern is inherently fragile (any DOM nesting change silently breaks the walk) and, more importantly, when **two or more** independent modules each do this walk and both end up writing the same DOM property (commonly `.hidden`) on overlapping elements, the two writes silently clobber each other with no error - whichever runs later in the pipeline wins, and the loser's effect is invisibly lost. Flag every instance of the walk pattern individually, and separately flag as MAJOR any case where two or more instances' tagged/targeted element sets can overlap (e.g. both walk from the same heading level, or one's walk range is nested inside another's).

  This will not be an abstract worry once flagged in wiki-fe specifically: `js/content/toc.js`'s `injectHeadingCollapseToggles`/`_setSectionCollapsed` (h2-level) and any per-h3-or-narrower feature both re-derive section boundaries via this exact shape, and a live collision between them was confirmed via property-setter instrumentation during WIKI-516 - always check both `toc.js` and `js/content/formatting.js`'s study-mode functions (`_wireStudySection`/`_setH3Revealed`) are still using the shared `.section`/`.subsection` wrapper divs introduced by WIKI-516's post-processing rewrite (`js/content/section-wrap.js`), not a reintroduced sibling-walk - a regression here would silently reintroduce the exact bug WIKI-516 fixed.

### Concern 4 — Error handling consistency

- Are error/failure paths handled the same way across modules (toast vs silent console vs thrown exception vs swallowed)? `CLAUDE.md` bans `console.*` in committed code — confirm no violations, but also check for the inverse: failures that are silently swallowed with no user-visible signal at all.
- Consistent use of `ApiError`/`api.js`'s error shape across every caller, vs ad-hoc error handling per call site.
- **Switch on `ApiError.code`, never on `message` text** (CONVENTIONS.md → Errors & API). Flag any caller that branches on human-readable message strings or invents FE-local code strings not in the cross-repo contract (`docs/_meta/auth.md` + BE).
- **No duplicated 401 handling** outside `api.js`. The wrapper owns the global 401 → clear session + emit `wiki:session-expired` path; callers must not re-implement logout-on-401 locally.
- **Loading / empty / error state flags** (CONVENTIONS.md → Async): any async operation that drives visible UI should surface loading/empty/error via `state.js` flags (or an established equivalent). Flag UI-driving fetches that leave the UI with no loading or error representation.
- **Async shape discipline** (CONVENTIONS.md → Async): CONVENTIONS.md defines exactly two allowed shapes for backend calls — best-effort background sync (un-awaited, `.catch(() => {})`, never blocks UI, e.g. `storage/bookmarks.js`/`storage/recents.js`) and user-initiated flows (always `await`ed, errors caught and surfaced, e.g. `auth.js`). Check every backend call site against this: a best-effort sync that's `await`ed (blocks UI unnecessarily) or a user-initiated flow that's fire-and-forget (swallows an error the user needs to see) is a violation.

### Concern 5 — Test quality

- Violations of CONVENTIONS.md's own Testing rules: banned `page.evaluate("element.click()")` clicks, banned `page.wait_for_timeout()` outside its two sanctioned exceptions (genuine negative assertion, or a fixed internal timer with no completion hook), use of `page.query_selector()` instead of `page.locator()` + `expect()`.
- Duplicated setup/fixture-like logic hand-rolled inside individual test files instead of using what `conftest.py` already provides (CONVENTIONS.md bans adding new fixtures or helpers — check nothing reinvents one locally).
- Inconsistent assertion style or structure (function- vs class-based) within a single test file, per CONVENTIONS.md's "match the existing structure in that file" rule.
- **Test-map home**: new or significantly changed UI behavior should land in the existing file matching the feature (CLAUDE.md test map). Flag behavior that has no obvious home, or a new test file created when an existing one already owns that area.
- **Selector preference**: prefer user-visible text or ARIA roles; `data-testid` only when no semantic alternative exists. Flag new `data-testid` usage that could have been a role/text selector.

### Concern 6 — Documented-rule violations (mechanical checks)

Checks straight from CONVENTIONS.md/CLAUDE.md's own explicit, numeric, or pattern-matchable rules — these are objective yes/no checks, not judgment calls:

- **File size** (CONVENTIONS.md → Core principles): any `js/` or `css/` file over ~400 lines without the one-line "single cohesive pipeline" exception comment at the top.
- **CSS token discipline** (CONVENTIONS.md → CSS): hardcoded values (colors, spacing, font-sizes, z-index, transition durations) that duplicate an existing token in `tokens.css` instead of using `var(--token-name)`; any breakpoint declared outside `responsive.css`.
- **Duplicate/conflicting CSS selectors**: the same selector (exact string match, e.g. `.markdown-body > p:first-of-type`) declared more than once outside a `@media`/`@supports`/theme (`[data-theme=...]`) conditional block within the same file - i.e. two unconditional rule blocks targeting the same selector, where the later one silently wins by cascade order and the earlier one is dead. Flag both locations; note which properties differ between the two declarations.
- **Comment-block discipline** (CONVENTIONS.md → JavaScript → Comments): multi-line prose comment blocks (should be one line or none), comments that just restate what the next line does.
- **No ticket IDs anywhere in code, ever** (CLAUDE.md → NEVER, CONVENTIONS.md → Workflow): grep the entire `js/` and `css/` tree for the pattern `WIKI-\d+`. The rule is a hard zero-tolerance ban, not a style preference — there should be **no matches, period**. Any hit (comment, string literal, CSS section header, anywhere) is a violation to flag regardless of context; don't editorialize about whether a specific instance is "harmless."
- **No file-local `DEBUG` flags** (CONVENTIONS.md → Error surfacing): grep for `DEBUG`, `debugMode`, or similar toggles left in committed modules.
- **No inline styles** except dynamic values set programmatically via JS (CONVENTIONS.md → JavaScript). Flag static `style="..."` in HTML and static style strings assigned in JS that should be CSS classes.
- **`wiki.css` aggregator purity** (CONVENTIONS.md → CSS): `wiki.css` `@import`s modules and must hold **no rules of its own**. Flag any rule blocks in it.
- **Fluid layout units** (CONVENTIONS.md → CSS): fixed `px` used for layout-level sizing (panel/drawer widths, overlay heights, `top`/`scroll-margin-top` offsets tied to layout) instead of fluid units / `var(--topbar-h)` / `calc(var(--topbar-h) + ...)`. Fixed `px` remains correct for borders, outlines, icon sizes, 44px touch targets, blur radii, and transform nudges — don't flag those.

### Concern 7 — Lifecycle, teardown & listener hygiene

(CONVENTIONS.md → Async / Interactive elements.) Hash-router apps accumulate leaks when listeners and timers outlive the view that created them.

- For every `addEventListener` in `js/content/`, `js/render/`, and `js/app/` (and high-churn files like `auth.js`, `search.js`): confirm there is a matching `removeEventListener`, **or** the listener is delegated from a stable parent that outlives navigations (document/body/long-lived shell). Flag per-element listeners attached on each render/navigate with no teardown.
- Interruptible fetches that drive a view must accept an `AbortSignal` (or equivalent) and cancel cleanly on route/view change. Flag UI-driving `fetch`/`Api.*` calls with no abort path when the user can navigate away mid-flight.
- View teardown (managed via the hash router in `app.js` / `router.js`): confirm navigation away cancels in-flight work, clears transient UI (open modals, focus traps, popovers), and stops `setTimeout` / `requestAnimationFrame` / `MutationObserver` loops owned by the leaving view.
- **Init idempotency**: modules that wire events or start observers must be safe if called twice (re-render, revisit, re-open). Flag init paths that would double-bind listeners or stack duplicate observers on a second call.

### Concern 8 — Async races & stale UI writes

Separate from Concern 4's error-*shape* rules — this is about **ordering and staleness**.

- Rapid navigation A → B where A's late response can still mutate DOM or `state` for a view that is no longer current. Look for article fetch, index fetch, search, auth, and offline-download flows missing a generation token, abort, or "is this still the active view?" guard before applying results.
- `setTimeout` / `requestAnimationFrame` / promise `.then` closures that write into DOM nodes or state belonging to a view that may already be torn down.
- Parallel writers to the same UI surface (e.g. two overlapping renders of content-view, or search results applying out of order) with no last-write-wins guard keyed to the request that should win.
- Flag as MAJOR when a stale write can silently clobber fresher UI with no error (same failure mode class as the Concern 3 DOM-walk collision).

### Concern 9 — Module-boundary contract (mechanical)

Objective checks against CONVENTIONS.md's Architecture / State & persistence / Errors & API rules — not judgment calls about "nice layering":

- **`localStorage` ownership**: only `js/storage/` may touch `localStorage` (plus any helper that CONVENTIONS/`state.js` explicitly documents as a shared primitive, e.g. a bulk-clear helper living in `state.js`). Grep `localStorage` across all of `js/`; every hit outside `js/storage/` (and documented exceptions) is a violation. Prior drift has appeared in `auth.js`, `render/home-index.js`, `render/content-view.js`, `api.js`, `app.js` — re-check those and scan for new ones.
- **Backend `fetch` ownership**: all backend calls go through `api.js`. Grep `fetch(` in `js/`; flag any call whose URL targets the backend / `BACKEND_URL` / Render host outside `api.js`. (Same-origin static asset fetches are out of scope.)
- **`state` mutation discipline**: `state.js` owns app state. Flag direct `state.foo =` / `state.foo.bar =` assignments from outside `state.js` when an exported mutator already exists or should exist; scattered writes are a smell even when technically possible.
- **Private API leakage**: leading `_name` marks non-public contract. Flag cross-module imports/calls of `_`-prefixed functions/methods (except within the same file / same object literal).
- **Import direction vs module map**: using `CLAUDE.md`/`CONVENTIONS.md` ownership tables, flag imports that invert layers — e.g. `content/` owning persistence concerns that belong in `storage/`, `render/` bypassing `storage/` for reads/writes it shouldn't own, or feature modules reaching past their documented accessor.

### Concern 10 — Cache / key / dual-source-of-truth consistency

Across in-memory `state.js` caches and `localStorage` key families:

- **Key naming drift**: inventory every `localStorage` key string (and key-prefix helper) across `js/`. Flag inconsistent schemes for the same concept family (`wiki-*` vs `scroll-*` vs ad-hoc unprefixed keys) and near-duplicate keys that mean the same thing under different names.
- **Dual owners**: the same logical data cached both in a `state.js` structure and in `localStorage` (or in two modules' local caches) with no single documented owner / invalidate path. Flag places where one can update and the other stays stale.
- **Clear / logout / data-clear completeness**: trace `storage/data-clear.js`, logout, and wiki-switch clear paths — does every key family get removed, or do orphans survive? Flag key families written somewhere but never cleared by the documented wipe paths.
- **Identity never persisted**: confirm `state.session` / auth identity is still memory-only (CONVENTIONS.md). Any write of session/identity into `localStorage` is MAJOR.

### Concern 11 — HTML ↔ JS ↔ CSS contract

Static structure sync across `index.html`, `js/`, and `css/` — not a UX review:

- **JS → HTML**: IDs, `data-action` values, and class names queried/selected in JS that have no matching element/attribute in HTML (orphaned selectors — feature broken or dead).
- **HTML → JS**: `data-action` / inline handlers / IDs in HTML with no listener or handler wiring in JS.
- **`window.*` vs `data-action`**: CONVENTIONS prefers `data-action` delegation for new static buttons. Flag new `window.*` globals added for inline `onclick` when a `data-action` path would fit; cross-check the WINDOW GLOBALS block in `app.js` against actual inline handlers still present in HTML.
- **CSS ↔ markup/JS**: class names constructed or toggled in JS / present in HTML with no CSS rules; CSS selectors for classes/IDs that nothing in HTML/JS ever applies (dead styles). Prefer exact-string matches; don't flag dynamic BEM variants you can't prove unused.
- Scope includes `index.html` and class/ID string literals in `js/` + selectors in `css/`.

### Concern 12 — Service-worker asset inventory (quality, not security)

Security audit owns cache-poisoning / trust of responses. This concern owns **completeness and version discipline**:

- Inventory every shipped frontend asset referenced from `index.html` (scripts, stylesheets, and other static deps) plus top-level app shells (`wiki-sw.js` itself, companion HTML if cached). Compare against the precache / install-time cache list in `wiki-sw.js`. Flag assets that ship to users but are missing from the SW precache (or are not intentionally excluded with a clear comment/reason).
- **Cache-version bump discipline** (CONVENTIONS.md → Service worker): any change to `wiki-sw.js` *or* to the set of files it caches requires a cache-version bump. On this audit, if the precache list and the live asset set disagree, flag both the missing/extra entry *and* whether the version string still looks stale relative to that drift. Do not require git-history archaeology for every historical bump — focus on current inventory mismatch.
- New modules present under `js/` / `css/` and linked from HTML but forgotten in the SW list are the primary hunt pattern.
- Do **not** re-litigate response.ok / cross-origin caching policy here — that is `security-audit`'s Concern 4.

### Concern 13 — Hash / router URL contract

Deep links are a structural contract, not a UX concern. One canonical hash shape must be shared by every builder and every parser.

- Identify the **canonical** hash/route format from `js/render/router.js` (and any helpers in `nav-utils.js` / `state.js` / `app.js` that parse or build hashes). Document the expected segments (wiki id, article path, section/heading fragment, query-like extras if any) in the finding notes so mismatches are concrete.
- Inventory every site that **builds** a hash or `location`/link target (`href="#..."`, `location.hash =`, `history.*`, template strings that produce `#/...` or `#...` navigations) across `js/` and any hardcoded hashes in HTML.
- Inventory every site that **parses** a hash (`location.hash`, `hashchange`, split/regex/parse helpers) across router and callers.
- Flag builder/parser drift: half-migrated formats (old vs new segment order), optional segments handled in one path but ignored in another, section/heading deep links that encode differently than TOC/scroll restore expects, wiki-switch links that omit or reorder fields the router requires.
- Flag dead or legacy parse branches that still accept a format nothing builds anymore (or builders that emit a format nothing parses).
- This is static contract comparison — do not click through routes in a browser (that's `ui-components-audit`).

### Concern 14 — Theme token completeness

(CONVENTIONS.md → CSS: theming via `data-theme`, overrides in `themes.css`.) Missing theme vars fall back silently and look like "random" visual bugs.

- Treat `tokens.css` (or the default theme's full token set) as the **baseline** inventory of theme-overridable custom properties.
- For every `[data-theme="..."]` (or equivalent) block in `themes.css`, diff the set of custom properties it defines against the baseline (and against each other theme).
- Flag tokens present in the baseline or in theme A but missing in theme B — especially colors, surfaces, borders, and overlay tokens where a missing override causes an unintended fallback to another theme's value or the root default.
- Flag themes that redefine a token under a different name for the same role (rename drift) or that leave a token commented-out/half-migrated.
- Do not turn this into a visual/UX polish pass — only completeness and name-alignment of the token contract. Viewport contrast/readability belongs to UX audits.

Be exhaustive — quantity and precision both matter more than brevity here. This is a review of the whole `js/` tree, `css/` tree (including `tokens.css` / `themes.css`), `index.html` (+ companion HTML), `wiki-sw.js`, and (for Concern 5 only) `tests/` tree — not a partial sample.

## Method

**Single pass, concern by concern**, not file by file:

1. Use `ctx_batch_execute`/`ctx_execute_file` (not `Read`) to go through every file in `js/`, `css/`, `index.html`, companion HTML if present, `wiki-sw.js`, and (for Concern 5 only) `tests/e2e/` (use `CLAUDE.md`'s file map to know what each owns, but do not skip files because they weren't flagged elsewhere — this audit's whole point is the cross-file comparison). All grepping in every step below goes through `ctx_batch_execute`, not raw `Bash`.
2. Read the most recent prior `docs/_meta/audit-reports/codebase-quality-audit - *.md` (by filename date; check `pending/` too). For each new finding, note if it is a **regression** (was absent/fixed in the prior report), a **repeat** (still open), or **new**. Do not drop prior open items from consideration just because this pass is concern-based — if a prior MAJOR still matches the code, re-log it as a repeat.
3. For **Concern 1**, build a mental (or scratch) index of identifier names for the same concepts across files, then diff for drift.
4. For **Concern 2**, build an index of "what shape does each module use to represent X" for repeated concepts (modal state, cache, list-of-items-with-metadata) and diff.
5. For **Concern 3**, trace actual call graphs for the repeated-pattern candidates listed above (modals, modal-registry, event delegation, custom events, layering) and confirm/deny the hypothesis with real file:line references. For dead-code, grep every export's name across the tree for usage sites as described above. For the DOM-traversal-fragility check, grep `js/content/*.js` + `js/render/*.js` for `.nextElementSibling` inside a `while` loop, list every match with the heading level it walks from, then check for overlap between matches' target element sets (same heading level walking the same content, or one nested inside another's range) and whether each match's target elements are also written to (`.hidden =`, `.dataset.* =`) by any *other* matched function.
6. For **Concern 4**, grep every `catch`, `.catch(`, and `throw` in `js/` and classify each by handling pattern; separately, grep every `Api.*` call site and classify as best-effort-sync vs user-initiated-flow, checking each against its required shape; also grep for message-text switches, local 401 handlers, and UI-driving async missing loading/error flags.
7. For **Concern 5**, grep `tests/e2e/*.py` for `page.evaluate("`, `wait_for_timeout(`, `query_selector(`, and `data-testid`; read `conftest.py` once to know the sanctioned fixture set; cross-check test files against CLAUDE.md's test map for orphan/mis-homed coverage.
8. For **Concern 6**, run each mechanical check as its own grep pass: file line counts (`wc -l` equivalent) against the 400-line threshold, a scan of `tokens.css` values against literal color/spacing/etc. occurrences elsewhere, multi-line comment blocks, `WIKI-\d+` across `js/` + `css/`, per-CSS-file selector-string counts (extract every top-level selector line, count occurrences, flag any exact-string duplicate not inside a `@media`/`@supports`/`[data-theme=...]` block), `DEBUG` flags, inline styles, `wiki.css` rule purity, and layout-level fixed `px`.
9. For **Concern 7**, grep `addEventListener` / `removeEventListener` / `AbortController` / `AbortSignal` / `setTimeout` / `requestAnimationFrame` / `MutationObserver` across `js/`; pair adds with removes or justify via stable-parent delegation; trace router teardown paths in `app.js` / `router.js`.
10. For **Concern 8**, for each major async UI flow (content load, index load, search, auth, offline), trace from kickoff to DOM/`state` write and check for abort/generation guards; grep timer/rAF closures that capture view-specific elements.
11. For **Concern 9**, grep `localStorage`, `fetch(`, `state\.`, and cross-file `_`-prefixed symbol uses; classify each hit against the ownership rules above.
12. For **Concern 10**, inventory all localStorage keys/prefixes and in-memory caches; map each to owner module + clear path; flag dual owners and clear gaps.
13. For **Concern 11**, extract IDs/`data-action`/classes from HTML and from JS string literals; diff against each other and against CSS selectors.
14. For **Concern 12**, parse `wiki-sw.js` precache/install lists and diff against assets linked from `index.html` (+ companion HTML) and other clearly shipped static entrypoints.
15. For **Concern 13**, read the router/parse helpers first to lock the canonical hash shape, then grep all hash/link builders and parsers across `js/` (+ HTML hash hrefs) and diff them against that shape.
16. For **Concern 14**, extract the baseline custom-property set from `tokens.css` / default theme, then per-theme property sets from `themes.css`, and diff for missing or renamed tokens.

No live browser verification needed for this audit — it's a static code-structure review, not a runtime-behavior review (that's `ui-components-audit`'s job). If a hypothesis truly can't be confirmed from code alone (e.g. "is this dead code actually unreachable"), note it as unconfirmed rather than spinning up a browser to check.

## Output file

Log to **`docs/_meta/audit-reports/codebase-quality-audit - YYYYMMDD.md`** (today's date, one file per run). Two-stage write pattern within that single file:

- **As you find each issue**, immediately append it as a flat entry under a top-level `## Raw log` section at the bottom of the file (create on first write).
- **Periodically (after finishing each concern above)**, move that concern's raw-log entries up into the proper section under `## Findings by concern`, sorted critical → major → minor, and delete them from the raw log.

### Entry format

```markdown
### [SEVERITY] Short title

- **Concern:** naming | data-structures | design-patterns | error-handling | test-quality | documented-rule-violation | lifecycle-teardown | async-races | module-boundaries | cache-keys | html-js-css-contract | service-worker-inventory | hash-router-contract | theme-token-completeness
- **Prior:** new | repeat | regression
- **Files:** `js/search.js:40`, `js/app/bookmarks-modal.js:22`, `js/app/wiki-switcher.js:15`
- **Observation:** three separate modal-open implementations, each manually toggling a CSS class
  and manually managing focus-trap, instead of a shared helper
- **Impact:** any future modal-behavior fix (e.g. focus-trap bug) has to be applied in 3+ places
  and will drift again
- **Fix direction:** extract a shared `openModal(el, {onClose, trapFocus})` helper
```

Severity is one of exactly 3 values — `MAJOR` (drift that actively causes or will cause bugs — e.g. inconsistent error handling hiding real failures), `MINOR` (drift that's a maintenance cost but not currently causing bugs), `POLISH` (cosmetic/naming nitpick). No `CRITICAL` tier in this audit — it's not behavior-verified, so severity can't be assessed at that level. If something looks critical, log it as `MAJOR` and add a line flagging it for behavioral follow-up via `ui-components-audit` or manual testing.

Final file structure:

```markdown
# Codebase Quality Audit (wiki-fe)

Generated by codebase quality audit agent. Cross-cutting consistency/structure review — not a bug
hunt (see `ui-components-audit`) or UX audit (see `auth-ux-audit`/`mobile-ux-audit`).

## Findings by concern

### Naming & terminology consistency
### Data types & structures
### Design patterns & coupling
### Error handling consistency
### Test quality
### Documented-rule violations
### Lifecycle, teardown & listener hygiene
### Async races & stale UI writes
### Module-boundary contract
### Cache / key / dual-source-of-truth consistency
### HTML ↔ JS ↔ CSS contract
### Service-worker asset inventory
### Hash / router URL contract
### Theme token completeness

## Raw log
(empty once fully organized)
```

## Constraints

- **Do not fix anything.** Report, don't patch. Note fix direction, leave code untouched.
- **Do not read `content/**/*.md`** — irrelevant to this audit.
- **Do not run any tests.** Concern 5 is a static read/grep of `tests/e2e/*.py` for rule violations — never execute the suite, in full or in part. (`pytest --collect-only` is also out of scope here; that belongs to `e2e-ci-health-audit`.)
- **Do not propose introducing a bundler, TypeScript, or replacing Biome.** Biome already covers mechanical lint/format. This audit stays on semantic/cross-file issues Biome cannot see — do not turn findings into an argument for a build step.
- **Do not duplicate sibling audits.** XSS/DOMPurify/localStorage-trust/SW cache-poisoning → `security-audit`. Lane A/B and CI workers → `e2e-ci-health-audit`. Viewport/copy/focus UX → `auth-ux-audit` / `mobile-ux-audit`. Runtime behavior verification → `ui-components-audit`.
- No `git add`/`commit`/`push`.

## When done

Summarize in your final message: total findings by severity count (and new/repeat/regression breakdown), and the 3–5 most impactful consistency/structure issues by name. Full detail lives in the file, not in your response.
