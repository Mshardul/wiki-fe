---
role: plan
created: 2026-11-15
last_updated: 2026-11-15
status: in-progress
---

# Doc headers for non-code markdown

Implemented across `wiki-fe`, `wiki-be` and the untracked root folder, pending senior review. This file describes the intent, the design, every file touched, how the backfill was done, and what was and was not verified.

## Problem

Plans, specs, audit reports, audit prompts, agent instructions and decisions have no common metadata. Nothing says what kind of document a file is, when it was written, whether it is still current, or whether the work it describes shipped. Agents and humans both read stale plans as live. One earlier convention existed (a `Created | Last updated | Status` table on about two dozen files in `wiki-fe`), but it covered only some directories, used a different status vocabulary, and was never enforced.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Format | YAML front-matter, four fields: `role`, `created`, `last_updated`, `status` | One uniform, machine-checkable block at the top of the file. Fewer fields than first proposed (`audience`, `repo`, `supersedes`, `related`, `ticket`, `scope` were dropped as low value or already implied by path). |
| `role` | Fixed set: `plan`, `spec`, `audit-report`, `audit-prompt`, `instructions`, `decision`, `prompt`, `reference` | An open vocabulary drifts (`plan` vs `Plan` vs `planning`). |
| `status` | Valid values depend on role (table below) | One shared list is either too loose or meaningless for most roles. |
| Dates | ISO `YYYY-MM-DD`; `last_updated` never earlier than `created` | Sortable, unambiguous. |
| Where the spec lives | A "Doc headers" section in each repo's `CONVENTIONS.md`, with an identical lint script in each repo | The root folder is not git-tracked, so a root copy would be lost. The two repos are independent by design (separate CI, separate history), so each owns its copy. |
| Enforcement | Pre-commit hook, plus CI | A header that nothing checks goes stale within weeks. |
| Keeping `last_updated` honest | Check-only by default: a staged doc whose `last_updated` is not today fails. `--fix` bumps it. | File mtime is unusable (checkouts and edits rewrite it). The check only looks at staged files, so a full-tree CI run never fails on age. |
| Status values | Set only after checking the code, not inferred | See "Backfill". |

### Valid status values per role

| role | status |
|---|---|
| plan | `draft`, `open`, `in-progress`, `done`, `dropped` |
| spec | `draft`, `approved`, `implemented`, `superseded` |
| audit-report | `pending`, `triaged`, `closed` |
| decision | `proposed`, `accepted`, `superseded` |
| audit-prompt, instructions, prompt, reference | `active`, `deprecated` |

## Design

**Lint script** (`scripts/check_doc_headers.py`, standard library only, identical in both repos):

- Checks the header is present, has exactly the four fields, no duplicates, valid role, valid status for that role, ISO dates, and `last_updated >= created`.
- Cross-checks `role` against the nearest mapped ancestor directory (underscores read as hyphens): `ai-instructions` → `instructions` or `reference`; `audit-prompts` → `audit-prompt`; `audit-reports` → `audit-report` or `reference`; `plans` → `plan`; `specs` → `spec`; `decisions` → `decision`; `visualizer` → `reference`, `spec`, `plan` or `instructions`; `.prompts` → `prompt`. A directory with no mapping only warns.
- Default scan roots: `docs/_meta`, `docs/superpowers`, `.prompts`; hidden directories are skipped. Explicit file or directory arguments are accepted, which is how the untracked root folder is checked by hand.
- Staged-file freshness: reads `git diff --cached`; outside a repository it finds nothing staged and skips the check.
- Skips generated files that a header would not survive (`docs/_meta/practice-problems-index.md`).
- Single-line comments and docstrings, typed, passes ruff and mypy under the `wiki-be` configuration.

**Wiring:**

- `wiki-fe`: a local `doc-headers` hook in both `.pre-commit-config.yaml` and `.pre-commit-config.ci.yaml` (CI uses the second file); `make docs-headers` and `make docs-headers-fix`.
- `wiki-be`: a local hook in `.pre-commit-config.yaml`; `make docs-headers` (also part of `make check`) and `make docs-headers-fix`; a new "Doc headers" step in `.github/workflows/ci.yml`. CI there does not run pre-commit, so the explicit step is required.
- Both hooks use `language: python` with no dependencies, so they do not depend on the repo's own `.venv` existing in CI.

**Scope.** In scope: everything under `docs/_meta/`, `docs/superpowers/` and root `.prompts/`. Out of scope: `CLAUDE.md`, `CONVENTIONS.md`, readme and changelog files, wiki content articles, test fixtures, the `docs/*.md` ticket and content-backlog files (read by scripts, so a header could break them), and the generated practice-problems index.

**Agent rule.** One line in each of the three `CLAUDE.md` files (root, `wiki-fe`, `wiki-be`): create or edit a doc under the in-scope directories only with a valid header, and set `last_updated` to today on every edit.

## Files touched

Tooling and rules (what a reviewer should read closely):

| Location | File | Change |
|---|---|---|
| `wiki-fe` | `scripts/check_doc_headers.py` | new |
| `wiki-fe` | `.pre-commit-config.yaml` | new `doc-headers` hook |
| `wiki-fe` | `.pre-commit-config.ci.yaml` | new `doc-headers` hook |
| `wiki-fe` | `Makefile` | `docs-headers`, `docs-headers-fix` targets |
| `wiki-fe` | `CONVENTIONS.md` | "Meta docs" section replaced by "Doc headers" |
| `wiki-fe` | `CLAUDE.md` | one bullet under Never, All tasks |
| `wiki-be` | `scripts/check_doc_headers.py` | new, byte-identical to the `wiki-fe` copy |
| `wiki-be` | `.pre-commit-config.yaml` | new `doc-headers` hook |
| `wiki-be` | `Makefile` | two targets; `docs-headers` added to `check` |
| `wiki-be` | `.github/workflows/ci.yml` | new "Doc headers" step |
| `wiki-be` | `CONVENTIONS.md` | new "Doc headers" section |
| `wiki-be` | `CLAUDE.md` | one bullet under Never |
| root (untracked) | `CLAUDE.md` | one bullet under cross-cutting facts |
| `wiki-fe` | `docs/superpowers/plans/2026-11-15-doc-headers.md` | this file |

Backfilled docs: every in-scope markdown file except the generated index received a header at the very top. Nothing else in those files changed except the removal of the old top-of-file block described below. To review them without noise, diff only the first lines of each file: the change is the added header plus, in 28 files, a removed block.

- `wiki-fe`: 117 files under `docs/_meta/` and `docs/superpowers/`.
- `wiki-be`: 14 files under `docs/_meta/` and `docs/superpowers/`.
- root (untracked): 11 files under `.prompts/` and `docs/`.

Parallel work in the same trees will overlap with these paths. The tooling table above is the complete list of non-doc changes. Any doc that someone created after the backfill and that lacks a header will fail the lint until it gets one.

## Backfill method

Dates:

- Tracked files: `created` is the date of the file's first commit (following renames) and `last_updated` the date of its last commit.
- Audit reports: `created` comes from the date in the filename.
- Files carrying the old meta table: dates come from that table.
- Untracked root files and files not yet committed: file times, the only source available.

Status, set only after checking, not guessed:

- Plans and specs were compared with what is actually integrated: the visualizer registry and module loader, the shared manifest, e2e test files, `ci.yml`, `render.yaml`, the ticket backlog and archive, and the real content files. Unticked checkboxes were not trusted either way (several shipped features had never been ticked off).
- Documents tagged with the old table's `current` / `outdated` became `active` / `deprecated`.
- Audit reports outside `pending/` are `closed`. The `.prompts` workflow moves a report out of `pending/` only after every finding has become a ticket or been dropped, and the owner confirmed they were processed. There is no per-report record to cross-check.
- Statuses the code could not settle were confirmed by the owner: the cutover plan is `done` although its live logged-in-sync check was deferred; four recent visualizer plans are `done` and verified by hand; the GIL visualizer plan was checked by hand.

Old blocks removed from 28 files: 24 `Created | Last updated | Status` tables, 3 variant tables (`Created` alone, `Created | Status`), and one invalid `--- > 14th July 2026 ---` block.

Safety:

- Before writing, the original text of every file was copied outside the repositories, with a SHA-256 manifest.
- A dry run checked, per file, that the diff against the original contains no added lines and removes only the announced block.
- After writing, every file was re-read and compared with the approved table, and the diff against the backup was re-checked independently of the apply script.

## Verification

Done:

- The lint passes in `wiki-fe` and `wiki-be` (default scan) and on the root `.prompts/` and `docs/` folders. It emits warnings, not failures, for the nine files whose directory has no role mapping.
- The script was exercised on valid and invalid samples, and in a throwaway git repository for the staged-freshness check and `--fix`.
- `ruff check`, `ruff format` and `mypy` are clean on the script under the `wiki-be` configuration.
- The edited YAML files parse.

Not done:

- The hook has not been run through real `pre-commit`, and the new `wiki-be` CI step has not run in CI.
- The e2e and unit suites were not run; nothing in application code changed.
- Whether the e2e tests for the four recent visualizers pass was not checked (owner confirmed by hand).

## Risks and questions for review

1. **Two mirrored copies.** The script and the "Doc headers" text exist in both repos and can drift. Mitigated by a comment at the top of the script, not by tooling. Is that acceptable, or should one repo own it?
2. **Directory-to-role map.** It is hard-coded in the script, so a new docs directory needs a one-line change; until then it only warns. Is a warning the right default?
3. **`last_updated` friction.** Every edited staged doc must carry today's date or the hook fails. `--fix` makes this one command. Is a hard fail too strict, compared with a warning?
4. **Backfilled dates versus the freshness check.** Dates come from history, so the first staged run over the backfilled docs would flag them as stale. The first commit that includes them needs the hook bypassed once; it is a one-time effect.
5. **Judgment-based statuses.** A handful of statuses reflect a call, not a fact in the repository: the plan whose approach shipped under different files (`fe-be-integration`), the deployment plan whose second phase was abandoned (`v0-deployment-plan`), the e2e hardening plan that is only partly present in CI (`e2e-ci-resource-hardening`), and the unwritten-stub tracking in the DSA dedup inventories. Reviewers who know these areas should check them.
6. **Backlog files excluded.** `docs/tickets-backlog.md`, `docs/tickets-archive.md`, the content-backlog files and the `wiki-be` ticket and changelog files are parsed by scripts and carry no header. If they should be covered, the parsers need checking first.
7. **Replaced convention.** The old `Created | Last updated | Status` table rule in `wiki-fe/CONVENTIONS.md` (including its "do not backfill until touched" and "plans are exempt" clauses) was removed, not extended.
8. **Python hook environment.** `language: python` with an empty dependency list makes pre-commit create a throwaway environment on each machine. Confirm that is acceptable for the toolchain here.

## Out of scope

Moving, renaming or deleting any document; cleaning up stale content inside docs; header support for the ticket and backlog files; custom lint rules for application code.
