# Codebase Quality Audit Agent — Prompt (wiki-fe)

Paste this as the prompt when spawning the agent (e.g. `general-purpose` subagent, or a fresh
Claude Code session in `wiki-fe`).

---

You are auditing the `wiki-fe` repo (`/Users/shardul/Documents/Github/wiki/wiki-fe`) from the
perspective of a senior frontend engineer doing a codebase-health review — not a bug hunt, not a
UX review. This is a **build-free, vanilla JS/HTML/CSS wiki app** — no React, no bundler, no
TypeScript, no linter yet (see `CLAUDE.md` / `CONVENTIONS.md` in repo root, read them first — note
the project is deliberately no-build/no-node for now, so this audit is *not* a substitute for
mechanical lint rules like quote style or semicolon use; it's the higher-level review a linter
wouldn't do anyway).

Your job: find inconsistencies, structural smells, and correctness-adjacent design issues across
the whole codebase — the kind of thing that shows up when comparing file A's approach to file B's,
not the kind of thing visible from reading one file alone. Log each one to a running file as you
find it — not at the end, not from memory.

This audit is **not**: a functional/state bug hunt (see `ui-components-audit`), a UX/viewport audit
(see `auth-ux-audit`/`mobile-ux-audit`), or a mechanical style/formatting pass (no linter exists;
don't invent one via this audit).

## Goal

Sweep the codebase **concern by concern** (not file by file) — each pass compares every relevant
file against every other file for that concern, since the point is catching cross-file drift, not
auditing files in isolation.

### Concern 1 — Naming & terminology consistency

- Same concept, different names across files (e.g. "login" vs "sign in" vs "signin" as
  identifiers/function names — separate from the UX copy-tone check the auth-ux-audit already
  does; this is about *code* identifiers, not user-facing strings).
- Function/variable naming pattern drift (verb-noun vs noun-verb, `get*`/`fetch*`/`load*` used
  interchangeably for the same kind of operation across modules).
- File and module naming pattern consistency against `CLAUDE.md`'s stated conventions.

### Concern 2 — Data types & structures

- Same kind of data modeled differently in different places (e.g. does every "modal" module track
  open/closed state the same way — boolean flag vs class-on-element vs separate state object?).
- Structure-choice appropriateness: Map vs plain object vs array-of-objects for lookups/caches —
  flag places where the choice causes an O(n) scan where a Map/Set would be O(1), or where a
  structure is over-engineered for what it holds.
- Duplicated shape: is the same data re-derived/re-shaped in multiple files instead of computed
  once and shared (e.g. `state.js` already centralizes some shared caches — check nothing
  duplicates that pattern locally instead of using it).

### Concern 3 — Design patterns & coupling

- Repeated boilerplate across files that should be a shared helper (e.g. repeated modal
  open/close/focus-trap logic across `search.js`, `bookmarks-modal.js`, `wiki-switcher.js`,
  `auth.js`'s modal — are they following one shared pattern or four subtly different
  reimplementations?).
- Event-delegation pattern consistency — some modules attach listeners directly, others delegate
  from a parent; is this a deliberate split or accidental drift?
- Module coupling/layering — does `content/*` reach into `storage/*` directly, or go through
  `state.js`/a clean accessor? Does anything bypass `api.js` to call the backend directly (a real
  finding already surfaced once in a prior manual note — see
  `docs/_meta/audit-reports/manual-ui-audit - 20260714.md`, the `/auth/me` direct-call complaint —
  confirm whether that's still true and whether it's an isolated case or a pattern).
- Dead code: unused exports, functions defined but never called, leftover feature-flag branches
  with no live caller.

### Concern 4 — Error handling consistency

- Are error/failure paths handled the same way across modules (toast vs silent console vs thrown
  exception vs swallowed)? `CLAUDE.md` bans `console.*` in committed code — confirm no violations,
  but also check for the inverse: failures that are silently swallowed with no user-visible
  signal at all.
- Consistent use of `ApiError`/`api.js`'s error shape across every caller, vs ad-hoc error handling
  per call site.

Be exhaustive — quantity and precision both matter more than brevity here. This is a review of the
whole `js/` tree (and `css/` only where a concern is structural, e.g. duplicated component patterns
reflected in duplicated CSS) — not a partial sample.

## Method

**Single pass, concern by concern**, not file by file:

1. Read every file in `js/` (use `CLAUDE.md`'s file map to know what each owns, but do not skip
   files because they weren't flagged elsewhere — this audit's whole point is the cross-file
   comparison).
2. For **Concern 1**, build a mental (or scratch) index of identifier names for the same concepts
   across files, then diff for drift.
3. For **Concern 2**, build an index of "what shape does each module use to represent X" for
   repeated concepts (modal state, cache, list-of-items-with-metadata) and diff.
4. For **Concern 3**, trace actual call graphs for the repeated-pattern candidates listed above
   (modals, event delegation, layering) and confirm/deny the hypothesis with real file:line
   references.
5. For **Concern 4**, grep every `catch`, `.catch(`, and `throw` in `js/` and classify each by
   handling pattern.

No live browser verification needed for this audit — it's a static code-structure review, not a
runtime-behavior review (that's `ui-components-audit`'s job). If a hypothesis truly can't be
confirmed from code alone (e.g. "is this dead code actually unreachable"), note it as unconfirmed
rather than spinning up a browser to check.

## Output file

Log to **`docs/_meta/audit-reports/codebase-quality-audit - YYYYMMDD.md`** (today's date, one file
per run). Two-stage write pattern within that single file:

- **As you find each issue**, immediately append it as a flat entry under a top-level `## Raw log`
  section at the bottom of the file (create on first write).
- **Periodically (after finishing each concern above)**, move that concern's raw-log entries up
  into the proper section under `## Findings by concern`, sorted critical → major → minor, and
  delete them from the raw log.

### Entry format

```markdown
### [SEVERITY] Short title

- **Concern:** naming | data-structures | design-patterns | error-handling
- **Files:** `js/search.js:40`, `js/app/bookmarks-modal.js:22`, `js/app/wiki-switcher.js:15`
- **Observation:** three separate modal-open implementations, each manually toggling a CSS class
  and manually managing focus-trap, instead of a shared helper
- **Impact:** any future modal-behavior fix (e.g. focus-trap bug) has to be applied in 3+ places
  and will drift again
- **Fix direction:** extract a shared `openModal(el, {onClose, trapFocus})` helper
```

Severity = `MAJOR` (drift that actively causes or will cause bugs — e.g. inconsistent error
handling hiding real failures), `MINOR` (drift that's a maintenance cost but not currently causing
bugs), `POLISH` (cosmetic/naming nitpick). This audit rarely produces `CRITICAL` findings since it's
not behavior-verified — if something looks critical, note it but flag for follow-up verification via
`ui-components-audit` or manual testing.

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

## Raw log
(empty once fully organized)
```

## Constraints

- **Do not fix anything.** Report, don't patch. Note fix direction, leave code untouched.
- **Do not read `content/**/*.md`** — irrelevant to this audit.
- **Do not propose introducing a linter/formatter/build step** — out of scope per
  `CLAUDE.md`/project memory; this audit is a manual substitute until that lands, not an argument
  for it.
- No `git add`/`commit`/`push`.

## When done

Summarize in your final message: total findings by severity count, and the 3–5 most impactful
consistency/structure issues by name. Full detail lives in the file, not in your response.
