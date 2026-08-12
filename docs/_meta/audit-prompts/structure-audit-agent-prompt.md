# Structure Audit — Prompt (wiki-fe)

Paste this as the prompt to the **orchestrating** Claude Code session in `wiki-fe`. Like `practice-problems-audit-agent-prompt.md`, the orchestrator dispatches parallel subagents, each covering a slice of the repo, then assembles their output itself. Read this whole file before starting.

---

## What this audits

File/directory **structure** of `wiki-fe`, excluding `content/`: does every file live in the right place, is naming consistent with its siblings, are any files/directories dead or orphaned, are any oversized files past CONVENTIONS.md's split threshold with no documented exception, and has any doc's file/path references gone stale relative to the actual repo. This is **not** a code-quality audit (`codebase-quality-audit`), not a content audit, not a bug hunt. It exists to answer: does the repo's physical layout still make sense, and does documentation about that layout still match reality.

## Required reading, before dispatching or auditing anything

- `CLAUDE.md` / `CONVENTIONS.md` (repo root) — the file-size threshold (~400 lines, `js/`/`css/` only, not `tests/`), the module-map-as-contract convention, naming conventions.
- The most recent prior `docs/_meta/audit-reports/structure-audit - *.md` (by filename date; check `pending/` too), if one exists. For each new finding, note whether it's a **regression** (fixed in the prior run, broken again), a **repeat** (still open), or **new**. Don't drop a prior open item just because this run's method differs.

## Concerns to check

### Concern 1 — Naming & casing consistency

- Sibling files/directories that should share a naming convention but don't (space vs hyphen, inconsistent casing, a prefix duplicating its parent folder's name — e.g. `components-auth.css` sitting outside `components/` instead of as `components/auth.css`).
- A file's own declared identity (its header/title, or what it says about itself) vs. its actual location — does it claim to belong to a category whose directory it isn't in.

### Concern 2 — File size / single-responsibility (CONVENTIONS.md's own threshold)

- Any `js/` or `css/` file over ~400 lines with no one-line "single cohesive pipeline" exception comment at the top (see `js/render/content-view.js` for the correct pattern). This threshold does **not** apply to `tests/` — CONVENTIONS.md's Testing rules explicitly favor adding to an existing test file over creating new ones, so large test files are expected, not a violation.
- For each oversized file, look for a genuine internal seam (e.g. a large object literal doing 3+ unrelated things, a clearly separable sub-concern with its own line range) before proposing a split — not every oversized file has a clean cut; some are legitimately one cohesive pipeline and just need the documented exception comment instead.

### Concern 3 — Directory topology

- Two or more files that are genuinely coupled (check actual imports, not just name similarity) sitting loose at a directory's top level instead of grouped into their own subfolder, when every *other* multi-file feature area in that same directory already is one (e.g. `js/app/`, `js/content/`, `js/render/`, `js/storage/` are all folders — a loose 2+-file cluster elsewhere is the outlier).
- **Before proposing a new folder, check whether the cluster is transient.** A cluster of related files that exists to track a specific in-progress initiative (has its own status checklist, is expected to be deleted once that initiative finishes) should generally **stay flat, not be reorganized into a folder** — restructuring something destined for deletion is wasted effort. A permanent structural category (a feature area that will keep growing files indefinitely) is the case that actually warrants a folder. State which case applies and why for each candidate.

### Concern 4 — Dead / orphaned files

- Empty tracked directories.
- Zero-byte or otherwise-empty tracked files, especially ones with a name confusable with a real, actively-used file elsewhere (e.g. a stray `changelog.md` sitting near the real changelog).
- Utility scripts sitting outside the repo's canonical location for that category of thing (e.g. a build/check script nested inside a docs subfolder when a root-level `scripts/` already exists and holds everything else of that kind).
- A doc/report file that duplicates another file's purpose without being a proven subset or superset — verify by diffing actual content/structure (e.g. every `#### [SEVERITY] Title` heading, for audit reports) before concluding "duplicate" or "superseded"; don't guess from a header line alone.

### Concern 5 — Documentation drift (stale file/path references)

This is the concern most prone to false positives — a stale reference is only a real finding if the file containing it is meant to describe **current** state. Apply this classification before flagging anything:

**Frozen (staleness expected, do NOT flag path references here):**
- `docs/_meta/audit-reports/**` (including `pending/`) — dated snapshots by design.
- `docs/_meta/plans/**` — a plan doc records what was decided/planned *at the time*; it's meant to be read as history of a feature's original design, not corrected as the codebase moves past it. Staleness here is intentional and valuable (lets you trace what the original plan was), not a bug.
- `docs/tickets-archive.md`, `docs/content-archive.md` — terminal historical records; rows are never edited after archiving.

**Live (staleness is a real finding):**
- `docs/_meta/ai-instructions/**` — actively read every time content is written; must route to real files/paths.
- `docs/_meta/audit-prompts/**` — instructions handed to a *future* agent; a stale file/feature reference sends that agent chasing something that no longer exists (this class of bug already happened once — two prompts kept referencing a removed feature's files after the feature was deleted).
- Flat `docs/_meta/*.md` files (decisions/reference docs) — describe ongoing product/tech decisions expected to stay accurate as the thing they describe evolves.
- `docs/tickets-backlog.md`, `docs/content-backlog.md` — active work lists.
- Root `CLAUDE.md`, `CONVENTIONS.md`, `readme.md` — the project's living, continuously-read documentation.

For every live doc, check specifically for: (a) a referenced file/directory that doesn't exist on disk, (b) a file-ownership/module breakdown that's a **hand-copy of what CLAUDE.md's FILE MAP already says**, re-described in different prose elsewhere — flag this as a duplication risk even if it's currently accurate, since a hand-copy has no mechanism to stay in sync when the original updates (this exact pattern caused independent drift in three different files in a prior run — CLAUDE.md itself, `readme.md`, and `ai-instructions/tickets.md`, none of which noticed when the others were fixed). Prefer "replace with a pointer to the canonical source" as the fix direction over "correct the copy in place," when the content is a genuine duplicate rather than something that has its own independent reason to name files (e.g. an audit prompt's scope, CLAUDE.md's own FILE MAP, a ticket's Remarks column citing where a fix landed — these aren't duplicates, they're the file's actual job).

## Orchestrator steps

### 1. Build the file inventory

```
find . \( -path ./.venv -o -path ./content -o -path ./.git -o -path ./.pytest_cache -o -name __pycache__ -o -path "*/.cdn-cache*" -o -name .DS_Store \) -prune -o -type f -print
```

This is today's full non-content file list — the ground truth every subagent checks against.

### 2. Partition into batches, one per subagent

Split by natural category, mirroring how the repo itself is organized — each batch should be self-contained enough that a subagent doesn't need to read outside it to do its job, though cross-references to `CLAUDE.md`/`CONVENTIONS.md` are fine (every batch needs those for the size threshold and naming rules):

- **Batch: `docs/` full tree** — every file under `docs/`, all subdirectories, all root doc files (`tickets-backlog.md`, etc.), plus root `CLAUDE.md`/`CONVENTIONS.md`/`readme.md`/`CHANGELOG.md`. This batch does almost all of Concern 5's work, plus Concern 1/4 for anything doc-shaped.
- **Batch: `js/` + `css/`** — full line-count sweep (Concern 2), directory-topology check (Concern 3), naming consistency (Concern 1) across both trees.
- **Batch: `tests/` + `scripts/` + root config** (`.github/`, `Makefile`, `biome.json`, `.pre-commit-config*.yaml`, `pytest.ini`, `requirements-dev.txt`, `manifest.json`, `index.html`, `404.html`, `wiki-sw.js`, `icon.svg`, `sprite.svg`, `icons/`, `data/`) — placement/naming checks; note CONVENTIONS.md's file-size threshold does not apply to `tests/`.

Adjust batch boundaries if the repo has grown a new top-level area since this prompt was last edited — the split above is a starting point, not a fixed roster (unlike `ui-components-audit`'s fixed component list, file trees change shape over time, so re-derive the split from the Step 1 inventory each run).

### 3. Dispatch one subagent per batch

Use the `general-purpose` agent type, `dispatching-parallel-agents` skill. Give each subagent:
- Its exact file list (from Step 1, filtered to its batch) — don't let it re-discover files itself.
- The full "Concerns to check" section above, especially the frozen/live classification table (Concern 5) — this is the part most likely to cause false positives if skipped.
- Instruction to write findings to its own scratch file only (e.g. `/tmp/.../structure-audit-<batch>.md` in the session's scratchpad dir) and stop. **Subagents never write to the real report file** — only the orchestrator does, after all subagents return.
- **Findings only, no decisions.** Each finding states the issue, the evidence (file sizes, grep counts, import traces — verified, not guessed), and 1-2 concrete options with a one-line why/why-not each, matching the format below. Do not resolve the finding yourself — that happens in a follow-up human review pass, same as every other audit in this folder.

### Entry format (each subagent uses this per finding)

```markdown
#### [CONCERN] Short title

- **Files:** exact paths involved
- **Observation:** what's wrong, with verified evidence (line counts, grep hit counts, import traces) — not "this looks off," state the fact
- **Options:** 1-2 concrete directions, each with a one-line why / why-not
```

Concern tag is one of: `naming` | `file-size` | `directory-topology` | `dead-orphaned` | `doc-drift`.

No severity tiers for this audit (unlike bug-hunting audits) — every finding here is either worth fixing or worth explicitly deciding "leave as-is," not triaged by urgency.

### 4. Assemble

Collect all subagents' scratch files. Merge into `docs/_meta/audit-reports/structure-audit - YYYYMMDD.md` (today's date), grouped by Concern (not by batch — a reader wants "all naming issues," not "everything batch 2 found"). If a prior structure-audit report exists, mark each finding new/repeat/regression per the Required Reading step.

Final file structure:

```markdown
# Structure Audit (wiki-fe)

Generated by structure audit agent. File/directory structure and doc-drift review — not a code-quality
audit (see `codebase-quality-audit`) or a content audit. Findings only; decisions happen in a follow-up
human review pass, same as every other audit in this folder.

## Findings by concern

### Naming & casing consistency
### File size / single-responsibility
### Directory topology
### Dead / orphaned files
### Documentation drift
```

## Constraints

- **Do not fix anything, and do not decide anything.** Report findings with options only — this produces input for a human discussion pass, not a final action list. (Contrast with the *previous* structure-audit session, which discussed and decided each finding live with the user — that's the human-in-the-loop step this prompt's output feeds into, not something the audit agent does itself.)
- **Do not read `content/**/*.md`** — irrelevant to this audit.
- **Do not run any tests.**
- **Respect the frozen/live classification in Concern 5** — flagging a stale reference inside `docs/_meta/plans/` or an archive file is a false positive; skip those.
- No `git add`/`commit`/`push`.

## When done

Summarize in your final message: total findings by concern count, and every finding that's a likely regression (previously fixed, broken again) by name. Full detail lives in the report file, not in your response.
