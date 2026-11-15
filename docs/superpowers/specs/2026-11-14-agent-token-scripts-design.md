---
role: spec
created: 2026-11-14
last_updated: 2026-11-15
status: draft
---

# Agent token-reduction scripts - design

## Intent

AI coding agents spend tokens on mechanical work: reading whole backlog/archive files to find an ID or a duplicate, re-parsing audit reports, hand-checking filesystem facts in rater params, copying a sibling to scaffold a visualizer, and reading raw test output. Move that work into small deterministic scripts so the agent reads a compact result instead of the source.

## Goals

- Each mechanical task has one script; the agent calls it instead of reading the underlying files.
- Script output is always smaller than what it replaces.
- Prompts and `CLAUDE.md` route agents to the scripts; a hook enforces it where raw reads have no legitimate use.
- Deterministic facts leave the LLM: results do not vary run to run.

## Non-goals

- Extractors (`extract-*-scenarios.mjs`) - one-off ports from legacy HTML, not worth a generator.
- Deleting tickets - scripts only archive (Dropped/Done), never delete.
- Editing article content, or any git step.
- Changing what the agents judge (rater scoring, audit re-verification of meaning); only mechanical facts move to scripts.
- Cleaning malformed legacy rows in the archives; the scripts tolerate and report them.
- A cross-repo CI check for the OpenAPI types.

## Anti-goals

- A script whose output is as large as the file it replaces.
- A script that silently writes outside the files it owns.
- Duplicating schema rules in code that already live in `docs/_meta/ai-instructions/tickets.md` / `content-backlog.md` without a single source.

## Constraints

- Scripts live in their own repo's `scripts/` folder (fe: `wiki-fe/scripts/`, be: `wiki-be/scripts/`), Python, run via that repo's `.venv/bin/python3` (never bare `python3`). The two repos share no code.
- One purpose per script; no shared umbrella CLI.
- Single-line comments and docstrings only.
- Parsers get fixture-first pytest tests (fixtures are small real-shaped excerpts).
- Table files keep their current column schema; scripts read and write rows without reformatting the rest of the file.

## Schema source

- Each repo has one machine-readable schema file (fe: `docs/_meta/ticket-schema.json`; be: its own) holding types, components, priorities, statuses and the story-point scale. Scripts read it; the prose docs keep the rules and drop their own value tables in favor of a pointer.
- Priority scale is p0-p5 in every backlog (fe tickets, be tickets, content backlog): p0 critical, p1 high, p2 medium, p3 low, p4 very low, p5 speculative. The fe audit prompt, the content-backlog schema and the be ticket docs are aligned to it; existing rows need no migration.
- Components in use but missing from the prose (for example `api`) are added to the schema; whether `js` stays is the builder's call from actual usage.
- Legacy archive values (`chore`, `test`, `content`, `polish`, `design`) are readable but rejected on write.
- A pytest asserts every Type, Component, priority and status in the current backlog rows exists in the schema, so drift fails loudly in either direction.

## Contracts

- Output is line-oriented, one record per line, tab-separated fields, with a final summary line (count and any warnings). Prompts depend on this, so the contract is fixed before any prompt is edited.
- Exit codes: 0 ok, 1 not found or nothing to do, 2 usage error, 3 data error (unparsable or invalid input).
- `find` is a case-insensitive all-token match over Summary, Description and Remarks, across backlog and archive; it returns ID, status and summary. It returns candidates only; the agent judges duplicates, with no fuzzy scoring.

## Safety and strictness

- Writes go to a temp file and are renamed into place. `archive` appends to the archive first, then removes from the backlog, so a rerun after a partial failure finishes the job: an ID in both files completes the removal; an ID already archived and absent from the backlog exits 0 with a message.
- Untouched lines stay byte-identical. New rows match their neighbours' shape, with pipes inside cells escaped. `--dry-run` shows the change without writing.
- Parsing is strict for the active backlog, for every write, and for audit reports: an unrecognised shape is an error that names the line, never a silent skip. The audit parser also checks that parsed findings equal the count of finding headings, and refuses a content audit with a message pointing to the content-backlog flow.
- Archive reads are tolerant: legacy rows that do not parse are counted in a warning on the summary line, and `tickets.py lint` lists them. Cleaning those rows is a separate task, not part of this work.

## Approaches considered

| Decision | Options | Picked | Why |
|---|---|---|---|
| Structure | one `wikictl` CLI with subcommands / separate scripts | separate scripts | Matches the existing helpers; user's call |
| Language | Python / Node+TS | Python | All three existing checkers and the backlog helper are Python; markdown/table parsing is simple there (builder-agnostic call) |
| Enforcement | prompts and `CLAUDE.md` only / also a hook | also a hook, archive only | Nothing legitimately needs the full archive; other files are still read in parts |
| Audit scope | ticket script only / plus report parser and stale-check | plus parser and stale-check | Audits will return; stale-check cheaply handles "re-verify against live code" |

## Deliverables

1. **`tickets.py`** - `show ID`, `find TEXT`, `next-id`, `list [--status] [--priority]`, `add`, `archive ID --as done|dropped`. `next-id` spans backlog and archive. `add` validates Type, Component, priority and story points against the schema file (see Schema source). `archive` moves the row and sets Impl. Date and Status; it never deletes. `find` also searches `wiki-be/docs/tickets.md`.
2. **`audit_findings.py`** - parse an audit report into a compact finding list (severity, concern, files, one-line observation). Stale-check each finding: cited file exists, cited line is in range, quoted code snippet still present. Dedup candidates via `tickets.py find` logic. A `file` command moves a finished report out of `pending/` and appends to `audit-log.md`. Content audits (scoreboard format) are out of scope for the finding parser; they stay with the content-backlog flow.
3. **`content_backlog_helper.py`** (extend) - add `find`, `add`, `archive`, and a stub gap-scan emitting one row per file (per the content-backlog rule). A stub is an article whose leading comment contains "skeleton. Copy to", or that has no prose outside headings and HTML comments; files already listed by Path in the backlog are excluded. `hinted-gaps` finds missing pages (new-article candidates) and stays a separate command.
4. **`dsa_check.py` / `sd_check.py`** (extend) - move every purely structural rater param into the scripts. DSA known: U7 spine, U9 prereq format, U10 TOC vs headings. SD: derive the list by reading `sd-rater.md`. Update the rater docs so those params read "Script" and bump their meta tables.
5. **`new-visualizer.py`** - scaffold the module folder, registry entry, test stub and docs row per `docs/_meta/visualizer/README.md`.
6. **`check.sh`**, exposed as `pnpm check` - run typecheck, lint, `test:all`; one pass line per step; on failure print that tool's own output capped at N lines plus a "truncated, full log at <path>" line, with the full output always saved to the log. No parsing of tool output. Non-zero exit on any failure. Never runs e2e.
7. **OpenAPI to TS types** - source of truth stays `make openapi` in wiki-be (its CI already enforces sync). `pnpm api:types` generates committed types for `lib/api.ts` from `../wiki-be/openapi.json` with a pinned `openapi-typescript` (new dev dependency), with the spec hash in the file header. `pnpm api:check` compares that hash to the current be spec locally; where `wiki-be` is absent (fe CI checks out only its own repo) it prints "skipped, wiki-be not found" and exits 0. No cross-repo CI check.

8. **`wiki-be/scripts/tickets.py`** - same commands and rules as the fe script, over `wiki-be/docs/tickets.md` and its archive (`WIKI-BE-xxx`), run with the be venv. Schema validation follows `wiki-be`'s own ticket rules, not fe's. A separate script in the be repo; no shared code across repos.

## Around the scripts

- Update `.prompts/fe-work-tickets.md`, `fe-audit-reports-to-tickets.md`, `fe-audit-reports-to-content-backlog.md`, `fe-write-content.md` and `ai-instructions/tickets.md` / `content-backlog.md` to call the scripts instead of reading files.
- `CLAUDE.md` (fe): add a short "use these scripts" routing table; trim or generate the FILE MAP; change Session Start step 3 (reads the whole ticket backlog) and Completion Checklist steps 2-3 (manual row moves) to use `tickets.py` / `content_backlog_helper.py`.
- Archive-read hooks: Claude loads settings only from the launch folder, so each of `wiki/.claude/settings.json`, `wiki-fe/.claude/settings.json` and `wiki-be/.claude/settings.json` gets a hook on the archive files it can reach, covering `Read`, `Grep`, the context-mode file tools, and Bash commands that name the archive path. It answers "ask" (a prompt to you, not a hard block) with a message pointing to that repo's `tickets.py`. It is steering, not security: indirect reads such as `python -c` are not covered, and `tickets.py` reads the archive itself without hitting the hook. The root hook covers both repos' archives for sessions launched from `wiki/`.
- Root `wiki/CLAUDE.md`: add a short scripts table (script, repo, one-line use) as a pointer only. No `@`-import of the repo `CLAUDE.md` files, since that would load both into every root session.
- `wiki-be/CLAUDE.md` and its `.prompts` (`be-work-tickets`, `be-audit-reports-to-tickets`): route to the BE ticket script the same way as fe.
- Run `caveman:compress` on the `ai-instructions/*.md` files (backups kept as `.original.md` by the skill).

## Left to the builder

- Exact output formats, as long as they are compact and one item per line.
- Audit finding field names and the exact line layout, within the Contracts above.
- The SD structural-param list.
- The cap N for `check.sh` failure output.
