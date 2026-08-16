# DSA/SD Rater Content Audit — Prompt (wiki-fe)

Paste this as the prompt to the **orchestrating** Claude Code session in `wiki-fe`, or select it from `.prompts/fe-run-audit.md`'s menu. Like `practice-problems-audit-agent-prompt.md`, this one is not handed to a single subagent — the orchestrator dispatches multiple subagents, each rating a slice of files, then assembles their output itself. Read this whole file before starting; the dispatch/assembly steps are as load-bearing as the rating criteria.

---

## What this audits

Every article in **one chosen category** (folder) of either the DSA or System Design vertical, scored against the writer/rater rubric for that vertical - the same process that produced `docs/_meta/audit-reports/dsa-data-structures-content-audit - 20260803.md` (read that file first as the reference output; this prompt exists to reproduce that process repeatably, for any category, on demand).

This is a **rating run, not a fix run** - read-only, no content edits, no writer invoked. Output is a report + content-backlog candidates; turning candidates into rows happens via `.prompts/fe-audit-reports-to-content-backlog.md` (once that exists) or manually.

## Required reading, before dispatching or auditing anything

- `docs/_meta/ai-instructions/dsa-writer.md` / `sd-writer.md` (matching vertical) - what every param requires.
- `docs/_meta/ai-instructions/dsa-rater.md` / `sd-rater.md` (matching vertical) - how those params get scored, the gate, the report format.
- `docs/_meta/audit-reports/dsa-data-structures-content-audit - 20260803.md` - reference output shape (executive summary → scoreboard → SHIP list → systemic findings → content-backlog candidates → portfolio signals → per-article appendix).

## Orchestrator steps

### 0. Pick the scope

Ask the user (unless already stated in their request):

- **Vertical:** DSA or System Design.
- **Category:** the folder within that vertical. Show article counts so the user knows the size of what they're picking, e.g.:
  - DSA: `data-structures` (30), `algorithms` (47), `patterns` (28), `cheatsheets` (13), `paths` (3)
  - System Design: `components` (26), `algorithms` (12), `hld` (14), `paths` (3)
  - (counts drift - `find content/<vertical-dir>/<category>/*.md | wc -l` for the real current number, don't trust the numbers above)

`cheatsheets` and `paths` use their own lightweight rubric (per the writer's Article kinds section) - still ratable here, just expect most params n/a and a much shorter per-article table.

If the user names a specific article instead of a category, that's a different, smaller task - just rate that one file directly against the matching rater, no chunking/dispatch needed, skip the rest of this prompt.

### 1. Build the dispatch list

`find content/<dsa|system-design>/<category>/*.md` (exclude nothing by default - stubs and hubs get scored too, per their own kind's rubric, same as the reference report did). Sort alphabetically. Tell the user the exact count before dispatching.

Split the sorted list into chunks of **8-10 files each**.

Example shape (illustrative - pull the real current file list, do not hand-copy this):
```
data-structures: [array, avl-tree, b-plus-tree, b-tree, balanced-bst, binary-search-tree, binary-tree, bloom-filter, circular-buffer, deque] → chunk 1
                  [...] → chunk 2
                  ...
```

### 2. Dispatch one subagent per chunk

Use the `general-purpose` agent type. Each subagent gets **only its assigned chunk** - give it the exact list of file paths (do not let it discover files itself; the chunking is the orchestrator's job). Paste the "Subagent instructions" section below as its prompt, with the file list, vertical, and category filled in.

Dispatch all chunks in one message and wait for all to finish before proceeding (`run_in_background: false`, or wait for every completion notification - do not proceed to merge with partial results).

### 3. Merge into one report

The dispatching agent (never a new sub-agent) consolidates all chunk outputs into one report, matching the reference report's structure exactly:

1. **Header** - title, date, scope (`content/<vertical>/<category>/*.md`, article count), rubric file(s) referenced, mode (`read-only critique; no content edits in this pass`).
2. **Executive summary** - SHIP / NO-SHIP counts, any hub/cheatsheet/path articles scored on their own rubric (call out separately), any unfilled-skeleton stubs found, mean score (all / SHIP-only / NO-SHIP-excluding-stubs).
3. **Scoreboard** - one table, every article, columns `Article | Score | Gate | Kind`.
4. **SHIP list** - just the passing articles and their scores, for a quick skim.
5. **Systemic findings, P0-P3** - patterns that repeat across multiple articles (a gated param failing the same way on 5+ files is a systemic finding, not five separate blockers). P0 = unpublishable/empty, P1 = recurring gate failures on otherwise-strong articles, P2 = advisory-but-systemic portfolio gaps, P3 = coverage/polish. Don't just concatenate chunk rollups here - actually look across chunks for the repeating pattern; drop the per-chunk rollups from the final report once folded into this section (same as the reference report's own note about removing them as duplicative).
6. **Content-backlog candidates** - table, columns `Priority | Article | Fix type | Blocker summary`, one row per article that needs work (fold multiple blockers for the same article into one row's summary). This table is what a future backlog-filing pass consumes directly - keep it concrete and per-article, not vague.
7. **Portfolio signals (pre-rate)** - cheap, mechanical facts worth surfacing before the detailed ratings: stub markers found, hub markers found, missing-section greps if relevant, filesystem-check (`dsa-check.sh`/`sd-check.sh`) results across the batch.
8. **Per-article ratings** - the full score table for every article, in the same format the rater itself produces. This is the appendix - the sections above are the digest a human actually reads first.

### 4. Save the report

Follow `.prompts/fe-run-audit.md`'s own save step: `wiki-fe/docs/_meta/audit-reports/pending/<audit-name> - YYYYMMDD.md`, where `<audit-name>` derives from this file's own filename (strip `-agent-prompt.md`) plus the vertical/category picked, e.g. `dsa-sd-rater-content-audit-data-structures - 20260816.md` or `dsa-sd-rater-content-audit-sd-components - 20260816.md`. Filename **must contain `content-audit`** (already does, via this file's own name) so the ticketing prompt routes it to the content-backlog flow, never `WIKI-xxx`.

### 5. Log the run

Append one row to `wiki-fe/docs/_meta/audit-reports/audit-log.md`'s table: `| YYYY-MM-DD | <audit-name> | \`<report filename>\` |` (today's date, ISO format; the same `<audit-name>` and filename used in step 4). Add it as the last row - the log is newest-at-bottom. This step runs every time this prompt produces a report, no exceptions.

---

## Subagent instructions (paste per chunk, with the file list/vertical/category filled in)

You are rating a chunk of **{vertical}** articles in the `{category}` category against the publish rubric. Do not edit any article - this is read-only scoring.

1. Read `docs/_meta/ai-instructions/{dsa-rater.md | sd-rater.md}` in full (matching the vertical above).
2. For each file in your assigned list: `{paste exact file paths here}`
   - Read the article in full.
   - Detect its kind (specific / hub / cheatsheet / path) per the rater's own detection step.
   - Score every applicable param against that kind's rubric, producing the full score table exactly per the rater's Output format section - every applicable param, every n/a justified, gate verdict, blockers, ranked fixes.
3. **Cache isolation:** if the rater's claims-cache mechanism applies (see `sd-rater.md`'s [V9 claims cache](../ai-instructions/sd-rater.md#v9-claims-cache-cost-control) section), write to a chunk-suffixed cache file (`.v9-cache-chunk<N>.json`, `.rating-cache-chunk<N>.json`) in the category folder - never the real unsuffixed `.v9-cache.json` / `.rating-cache.json`. Multiple chunk agents writing the same unsuffixed file concurrently is a race condition; the orchestrator merges these after all chunks finish.
4. Return: every article's full score table, plus a short chunk-local rollup (what got flagged, nothing fancy - the orchestrator folds this into the final report's systemic findings and drops the rollup itself).

## Notes

- **Never invoke the writer, never edit article content.** This prompt only rates and reports. Fixing what it finds is a separate task.
- **Never call these findings tickets or file them as `WIKI-xxx`** - content backlog only, per `wiki-fe/CLAUDE.md`.
- If this category already has a pending, unprocessed rater-content-audit report sitting in `pending/`, don't generate a second one on top of it - tell the user and stop, same rule as `fe-run-audit.md` step 4 (user can override explicitly if they really want a re-run).
- Chunk agents rate cold against the rubric - no self-rating bias risk here (nothing is being written), so the independent-write/rate-process rule from `dsa-writer.md`/`sd-writer.md` doesn't apply to this prompt.
- After all chunks finish, merge any chunk-suffixed cache files into the real `.v9-cache.json` / `.rating-cache.json` for the category folder, then delete the suffixed per-chunk files - same cleanup discipline as the report merge itself.
