# AI Instructions - Content backlog

> Reference this file whenever content-backlog intent is detected: `DSA-xxx` / `SD-xxx` IDs, or phrases like "content backlog", "work content backlog", "file content backlog items", or running `.prompts/fe-audit-reports-to-content-backlog.md`.
>
> These are **not tickets**. Never call them tickets. Never file them in `docs/tickets-backlog.md`. App work stays on `WIKI-xxx`; content work stays here.

## Files (split by vertical)

| Vertical | Active backlog | Archive (Done / Dropped) |
| --- | --- | --- |
| DSA | `docs/content-backlog-dsa.md` | `docs/content-archive-dsa.md` |
| System Design | `docs/content-backlog-system-design.md` | `docs/content-archive-system-design.md` |

IDs are unique across a vertical's backlog + archive pair. Do not reuse an ID.

## Schema

Same columns in backlog and archive files:

| Column | Values / Notes |
| --- | --- |
| ID | `DSA-xxx` or `SD-xxx` — sequential within that vertical; never reuse across that vertical's backlog+archive |
| Entry Date | ISO date added to backlog |
| Summary | ≤7 words |
| Kind | `fill-stub` / `fix-gate` / `add-section` / `restructure` / `hygiene` / `new-article` / `portfolio` — see below |
| Path | Path(s) under `content/`, **without** the `content/` prefix (e.g. `dsa/data-structures/heap.md`). Multiple paths: `path1.md; path2.md` |
| Description | ≤30 words. Short sentences separated by semicolons. No padding. |
| Status | `Backlog` / `In Progress` (active files); `Done` / `Dropped` (archive files) |
| Done Date | ISO date completed; `-` if not done |
| Source | Provenance, e.g. `dsa-data-structures-content-audit 2026-08-03` |
| Priority | `p0` → `p3` |

### Kind values

| Kind | When to use |
| --- | --- |
| `fill-stub` | Unpublished skeleton / empty template still listed as an article |
| `fix-gate` | Make an existing article clear `dsa-rater` publish gate (gated param blockers) |
| `add-section` | Add a missing section shape (e.g. DS9 probes) across one or many articles |
| `restructure` | Wrong spine/headings for the article kind (e.g. Algorithm headings in a DS file) |
| `hygiene` | Stale comments, bad links, wording-only cleanup |
| `new-article` | Create a page that does not exist yet |
| `portfolio` | Cross-cutting content work not owned by a single article path |

### Grouping

- Prefer **one row per coherent unit of work**, not one row per gated param.
- Club multiple fixes for the **same article** into one row when they ship together.
- Club the **same change across many articles** into one row (Path lists every file; Kind often `add-section` or `portfolio`).
- Split when work would not ship together or priorities differ.

### Description style

Good: `Add DS7 at-scale trap in Gotchas; name cache-miss failure around n=1e7.`

Bad: long multi-clause paragraphs, restated audit prose, or a laundry list of every score-table NOTE.

## Hard rules

- **Never** create a `WIKI-xxx` ticket for a content-backlog finding.
- **Never** move a content-backlog row into `tickets-backlog.md` / `tickets-archive.md`.
- Content audits (`*-content-audit*.md` under `docs/_meta/audit-reports/`) feed this backlog via `.prompts/fe-audit-reports-to-content-backlog.md`, not via `.prompts/fe-audit-reports-to-tickets.md`.
- App/UX/code audits still go through the tickets prompt.

## Completing a row

1. Do the content work (follow `dsa-writer.md` / `dsa-rater.md` or the SD writer rules for that vertical).
2. Update `content/CHANGELOG.md` per CONVENTIONS.
3. Move the row to the matching archive file: `Status = Done`, `Done Date = <today>`, keep Source. Remove it from the active backlog file.
