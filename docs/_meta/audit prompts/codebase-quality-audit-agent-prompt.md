# Codebase Quality Audit Agent — Prompt (wiki-fe)

Paste this as the prompt when spawning the agent (e.g. `general-purpose` subagent, or a fresh Claude Code session in `wiki-fe`).

---

You are auditing the `wiki-fe` repo (`/Users/shardul/Documents/Github/wiki/wiki-fe`) from the perspective of a senior frontend engineer doing a codebase-health review — not a bug hunt, not a UX review. This is a **build-free, vanilla JS/HTML/CSS wiki app** — no React, no bundler, no TypeScript, no linter yet (see `CLAUDE.md` / `CONVENTIONS.md` in repo root, read them first — note the project is deliberately no-build/no-node for now, so this audit is *not* a substitute for mechanical lint rules like quote style or semicolon use; it's the higher-level review a linter wouldn't do anyway).

Your job: find inconsistencies, structural smells, and correctness-adjacent design issues across the whole codebase — the kind of thing that shows up when comparing file A's approach to file B's, not the kind of thing visible from reading one file alone. Log each one to a running file as you find it — not at the end, not from memory.

This audit is **not**: a functional/state bug hunt (see `ui-components-audit`), a UX/viewport audit (see `auth-ux-audit`/`mobile-ux-audit`), or a mechanical style/formatting pass (no linter exists; don't invent one via this audit).

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
- Event-delegation pattern consistency — some modules attach listeners directly, others delegate from a parent; is this a deliberate split or accidental drift?
- Module coupling/layering — does `content/*` reach into `storage/*` directly, or go through `state.js`/a clean accessor? Does anything bypass `api.js` to call the backend directly (a prior manual note flagged a `/auth/me` direct-call bypass in `docs/_meta/audit-reports/manual-ui-audit - 20260714.md` — as of this prompt's last edit that's confirmed fixed, `/auth/me` only goes through `Api.auth.me()` in `api.js`; re-check it hasn't regressed rather than re-investigating from scratch, and check for *other* instances of the same bypass pattern elsewhere).
- Dead code: for every exported function/const across `js/`, grep all other files for a usage site; zero-hit exports are dead-code candidates. Caveat: `window.*` globals wired for inline `onclick` handlers won't show up as JS import usages — cross-check those against the WINDOW GLOBALS block in `app.js` before flagging as dead.

### Concern 4 — Error handling consistency

- Are error/failure paths handled the same way across modules (toast vs silent console vs thrown exception vs swallowed)? `CLAUDE.md` bans `console.*` in committed code — confirm no violations, but also check for the inverse: failures that are silently swallowed with no user-visible signal at all.
- Consistent use of `ApiError`/`api.js`'s error shape across every caller, vs ad-hoc error handling per call site.
- **Async shape discipline** (CONVENTIONS.md → Async): CONVENTIONS.md defines exactly two allowed shapes for backend calls — best-effort background sync (un-awaited, `.catch(() => {})`, never blocks UI, e.g. `storage/bookmarks.js`/`storage/recents.js`) and user-initiated flows (always `await`ed, errors caught and surfaced, e.g. `auth.js`). Check every backend call site against this: a best-effort sync that's `await`ed (blocks UI unnecessarily) or a user-initiated flow that's fire-and-forget (swallows an error the user needs to see) is a violation.

### Concern 5 — Test quality

- Violations of CONVENTIONS.md's own Testing rules: banned `page.evaluate("element.click()")` clicks, banned `page.wait_for_timeout()` outside its two sanctioned exceptions (genuine negative assertion, or a fixed internal timer with no completion hook), use of `page.query_selector()` instead of `page.locator()` + `expect()`.
- Duplicated setup/fixture-like logic hand-rolled inside individual test files instead of using what `conftest.py` already provides (CONVENTIONS.md bans adding new fixtures/helpers — check nothing reinvents one locally).
- Inconsistent assertion style or structure (function- vs class-based) within a single test file, per CONVENTIONS.md's "match the existing structure in that file" rule.

### Concern 6 — Documented-rule violations (mechanical checks)

Checks straight from CONVENTIONS.md/CLAUDE.md's own explicit, numeric, or pattern-matchable rules — these are objective yes/no checks, not judgment calls:

- **File size** (CONVENTIONS.md → Core principles): any `js/` or `css/` file over ~400 lines without the one-line "single cohesive pipeline" exception comment at the top.
- **CSS token discipline** (CONVENTIONS.md → CSS): hardcoded values (colors, spacing, font-sizes, z-index, transition durations) that duplicate an existing token in `tokens.css` instead of using `var(--token-name)`; any breakpoint declared outside `responsive.css`.
- **Comment-block discipline** (CONVENTIONS.md → JavaScript → Comments): multi-line prose comment blocks (should be one line or none), comments that just restate what the next line does.
- **No ticket IDs anywhere in code, ever** (CLAUDE.md → NEVER, CONVENTIONS.md → Workflow): grep the entire `js/` and `css/` tree for the pattern `WIKI-\d+`. The rule is a hard zero-tolerance ban, not a style preference — there should be **no matches, period**. Any hit (comment, string literal, CSS section header, anywhere) is a violation to flag regardless of context; don't editorialize about whether a specific instance is "harmless."

Be exhaustive — quantity and precision both matter more than brevity here. This is a review of the whole `js/` tree, `css/` tree, and `tests/` tree (Concern 5 only) — not a partial sample.

## Method

**Single pass, concern by concern**, not file by file:

1. Use `ctx_batch_execute`/`ctx_execute_file` (not `Read`) to go through every file in `js/`, `css/`, and (for Concern 5 only) `tests/e2e/` (use `CLAUDE.md`'s file map to know what each owns, but do not skip files because they weren't flagged elsewhere — this audit's whole point is the cross-file comparison). All grepping in every step below goes through `ctx_batch_execute`, not raw `Bash`.
2. For **Concern 1**, build a mental (or scratch) index of identifier names for the same concepts across files, then diff for drift.
3. For **Concern 2**, build an index of "what shape does each module use to represent X" for repeated concepts (modal state, cache, list-of-items-with-metadata) and diff.
4. For **Concern 3**, trace actual call graphs for the repeated-pattern candidates listed above (modals, event delegation, layering) and confirm/deny the hypothesis with real file:line references. For dead-code, grep every export's name across the tree for usage sites as described above.
5. For **Concern 4**, grep every `catch`, `.catch(`, and `throw` in `js/` and classify each by handling pattern; separately, grep every `Api.*` call site and classify as best-effort-sync vs user-initiated-flow, checking each against its required shape.
6. For **Concern 5**, grep `tests/e2e/*.py` for `page.evaluate("`, `wait_for_timeout(`, and `query_selector(`; read `conftest.py` once to know the sanctioned fixture set, then check each test file only uses what's there.
7. For **Concern 6**, run each mechanical check as its own grep pass: file line counts (`wc -l` equivalent) against the 400-line threshold, a scan of `tokens.css` values against literal color/spacing/etc. occurrences elsewhere, multi-line comment blocks, and `WIKI-\d+` across `js/` + `css/`.

No live browser verification needed for this audit — it's a static code-structure review, not a runtime-behavior review (that's `ui-components-audit`'s job). If a hypothesis truly can't be confirmed from code alone (e.g. "is this dead code actually unreachable"), note it as unconfirmed rather than spinning up a browser to check.

## Output file

Log to **`docs/_meta/audit-reports/codebase-quality-audit - YYYYMMDD.md`** (today's date, one file per run). Two-stage write pattern within that single file:

- **As you find each issue**, immediately append it as a flat entry under a top-level `## Raw log` section at the bottom of the file (create on first write).
- **Periodically (after finishing each concern above)**, move that concern's raw-log entries up into the proper section under `## Findings by concern`, sorted critical → major → minor, and delete them from the raw log.

### Entry format

```markdown
### [SEVERITY] Short title

- **Concern:** naming | data-structures | design-patterns | error-handling | test-quality | documented-rule-violation
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

## Raw log
(empty once fully organized)
```

## Constraints

- **Do not fix anything.** Report, don't patch. Note fix direction, leave code untouched.
- **Do not read `content/**/*.md`** — irrelevant to this audit.
- **Do not run any tests.** Concern 5 is a static read/grep of `tests/e2e/*.py` for rule violations — never execute the suite, in full or in part.
- **Do not propose introducing a linter/formatter/build step** — out of scope per `CLAUDE.md`/project memory; this audit is a manual substitute until that lands, not an argument for it.
- No `git add`/`commit`/`push`.

## When done

Summarize in your final message: total findings by severity count, and the 3–5 most impactful consistency/structure issues by name. Full detail lives in the file, not in your response.
