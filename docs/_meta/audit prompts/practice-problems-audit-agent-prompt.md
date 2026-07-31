# Practice Problems Audit — Prompt (wiki-fe)

Paste this as the prompt to the **orchestrating** Claude Code session in `wiki-fe`. Unlike the other audit prompts in this folder, this one is not handed to a single subagent — the orchestrator dispatches multiple subagents, each auditing a slice of files, then assembles their output itself. Read this whole file before starting; the dispatch/assembly steps are as load-bearing as the audit criteria.

---

## What this audits

Every `## Practice problems` section across `content/dsa/{patterns,data-structures,algorithms}/*.md` — roughly 98 files, ~315 entries as of this prompt's last edit (re-run the generator to get the current count; do not trust this number). Two questions, applied per file:

1. **Are the full worked-problem entries the right set?** Genuinely distinct from each other (not just renamed/reparametrized), genuinely on-topic for the article, and is there anything currently demoted to a duplicate-problems bullet that actually deserves to be its own full entry — or anything currently a full entry that doesn't deserve one?
2. **For each entry that survives #1, are its `**Duplicate problems:**` citations actually duplicates?** Right count (2-8 is acceptable, 3-5 is the sweet spot — flag both too few and too many), and each citation's name/LC-number/description checks out.

This is a **content-quality audit**, not a sync-check against `docs/_meta/plans/dsa-worked-problems-dedup*-inventory.md` — those hand-written files are themselves known to be stale (see `dsa-worked-problems-dedup.md`'s log of the 2026-07-31 manual sync pass) and are not ground truth. The generator script's output (`docs/_meta/practice-problems-index.md`) is used here only as a **worklist** — a checklist of what currently exists to walk through — never as an answer key to reconcile against. Judge content on its own merits against `dsa-writer.md`/`dsa-rater.md`'s actual rules, the same way a human would.

## Required reading, before dispatching or auditing anything

- `docs/_meta/ai-instructions/dsa-writer.md` — distinct-technique constraint (U6), duplicate-problems citation format, topic-fit expectations.
- `docs/_meta/ai-instructions/dsa-rater.md` — how these sections get scored; use its bar for what "genuinely distinct" and "genuinely on-topic" mean.
- `docs/_meta/plans/dsa-worked-problems-dedup.md` — background on why this section shape exists, and precedent rulings worth knowing before judging similar cases (e.g. combining-function swaps ruled non-distinct for `dijkstra.md`'s max-probability/max-elevation pair, but scalar-vs-matrix exponentiation ruled distinct for `modular-arithmetic.md`/`modular-exponentiation.md` — these are the kind of precedent a judgment call should be checked against, not reinvented from scratch each time).

## Orchestrator steps

### 0. Run the generator

```
.venv/bin/python3 scripts/build_practice_problems_index.py
```

This produces a fresh `docs/_meta/practice-problems-index.md`, grouped by type (`# Patterns`, `# Data Structures`, `# Algorithms`), each file's entries and duplicate-problems bullets listed as they currently exist in content. This is today's worklist. Do not skip this step even if the file already exists — content may have changed since it was last generated.

### 1. Build the dispatch list

For each of the three types, take the real content directory's `*.md` files (excluding known stub/unwritten files and out-of-scope overview pages — cross-check against the generator's output: a file with zero entries and a `_(stub - no Practice problems entries yet)_` marker is a stub, skip it; a file absent from the generator's output entirely because it has no `## Practice problems` heading at all is out of scope, skip it), sort **alphabetically by filename**, and split into chunks of **up to 5 files each**. Three separate alphabetical runs — do not pool files across types into one flat list.

Example shape (illustrative — pull the real current file list, do not hand-copy this):
```
Patterns: [backtracking, binary-search-on-answer, bitmask-dp, binary-search-on-answer, difference-array] → chunk 1
          [...] → chunk 2
          ...
Data Structures: [array, avl-tree, b-plus-tree, b-tree, binary-search-tree] → chunk 1
          ...
Algorithms: [...] → chunk 1
          ...
```

### 2. Dispatch one subagent per chunk

Use the `general-purpose` agent type. Each subagent gets **only its assigned ≤5 files** — give it the exact list of file paths (do not let it discover files itself; the alphabetical chunking is the orchestrator's job, not the subagent's). Paste the "Subagent instructions" section below as its prompt, with the file list filled in.

Dispatch chunks **in the same run** (parallel is fine — that's the point of chunking), but track which chunk corresponds to which position in the alphabetical order, since assembly must happen in that order, not completion order.

Each subagent writes its findings to its own scratch file only (e.g. `/tmp/.../chunk-<type>-<NN>.md` in the session's scratchpad dir) and stops. **Subagents must never write to the real report file or the verification-state file directly** — only the orchestrator touches those, and only after a chunk's subagent has fully returned.

### 3. Assemble, in dispatch order

As each chunk's subagent completes, do not immediately append it — wait until you can append chunks **in their original alphabetical dispatch order** (chunk 1 before chunk 2 before chunk 3, within each type, types in the order Patterns → Data Structures → Algorithms). If chunk 2 finishes before chunk 1, hold it and append chunk 1 first once it lands. This is a single-writer, ordered-append pattern specifically to avoid two concurrent writers racing on the same file — the orchestrator is the only thing that ever writes the real output files, and it does so strictly in order.

Append each completed chunk's findings into `docs/_meta/audit-reports/practice-problems-audit - YYYYMMDD.md` (today's date, one file per full run across all three types — not one file per chunk).

Also merge each chunk's WebSearch-verification results into the verification-state file (see below) at the same time, same ordering rule.

### 4. When fully done

Tell the user: total files audited, total findings by verdict-tag count, and the 5-10 most impactful findings by name (entries that should clearly be removed/reassigned, and any file whose full-entry set looks structurally wrong). Full detail lives in the report file, not the summary message.

---

## Subagent instructions

*(Orchestrator: paste everything below this line into each subagent's prompt, with the file list and chunk label filled in.)*

You are auditing a slice of `wiki-fe`'s DSA Practice Problems sections for content quality — not syncing files, not fixing anything, just judging and reporting. Read `docs/_meta/ai-instructions/dsa-writer.md`, `docs/_meta/ai-instructions/dsa-rater.md`, and `docs/_meta/plans/dsa-worked-problems-dedup.md` first if you haven't already (the orchestrator should have told you whether this context carries over).

**Your assigned files (audit only these, in this order):**
```
<orchestrator fills in the exact ≤5 file paths for this chunk, e.g.:>
content/dsa/patterns/backtracking.md
content/dsa/patterns/binary-search-on-answer.md
...
```

For each file, read its full `## Practice problems` section (it is always the last section in the file, runs to EOF). Then work through two passes:

### Pass 1 — the full-entry set

For every full worked-problem entry in the file:

1. **Is it genuinely distinct from every other full entry in the same file?** Same core invariant/mechanic under different surface framing does not count as distinct (e.g. Container With Most Water and Trapping Rain Water both reduce to "track running max, advance the shorter side" — not distinct). Check against the precedent rulings in `dsa-worked-problems-dedup.md` before making a fresh call on a shape that's already been ruled on elsewhere in the codebase.
2. **Does it actually belong to this article's topic?** Does solving it genuinely exercise the data structure/pattern/algorithm this article is about, or could it be solved the same way with a completely different structure (a "topic-fit miss," the same failure mode the original DS audit found and fixed in `lru-cache.md`/`interval-tree.md`/`b-plus-tree.md`).
3. **Is there a duplicate-problems citation anywhere in this file (or a problem you know of that isn't cited at all) that is actually distinct enough to deserve promotion to its own full entry** — provided promoting it doesn't collide with an existing entry per check #1?
4. **Verify the entry's own facts**: title, LC number (if cited), problem statement, constraints, and worked examples are internally consistent and correct. Read the approach prose and code together — does the code actually implement the described approach, does the stated complexity match what the code does, are there off-by-one or logic errors. **The Solution code block must be real, complete, and runnable standalone** (per U6) — not a skeleton with method signatures and comments instead of bodies, and not a stub/driver that points back to the article's own Implementation section instead of showing the actual logic. A reader who only reads this one entry must be able to run the code and get the stated worked-example outputs. Flag any entry whose code doesn't meet this bar as a hard fact/correctness issue (not a NEEDS-DECISION) — it's gated by U6, not a judgment call.
5. WebSearch to confirm the LC number matches the real LeetCode problem's actual title (only if not already verified and unchanged — see caching rule below).

Verdict per full entry: `KEEP`, `REASSIGN` (same technique, belongs as a duplicate-problems bullet under a different entry — name which one, in this file or another), or `NEEDS-DECISION` (genuinely ambiguous, needs a human call — write out the tradeoff like a real option, don't force a verdict).

### Pass 2 — duplicate-problems citations, for every entry that survived Pass 1 as `KEEP`

For each `**Duplicate problems:**` bullet under a kept entry:

1. **Is it actually the same core technique**, not just a similar-sounding problem name? Read the citation's own reasoning text critically — vague hand-waving ("range-scan intuition extends to 2D," "conceptually related") is a signal to look harder, not a pass.
2. **Verify name/LC-number/description** against the real problem (WebSearch, subject to the caching rule below). A citation that references a made-up or unverifiable problem (e.g. "LC 732 'extended'" when LC 732 is a specific different problem) is a hard fail.
3. **Count check per entry**: fewer than 2 citations — is that genuinely because no other LC-known problem shares this technique (acceptable, note it in your findings output only), or is the file just under-researched? More than 8 — likely padding, look for weak ones to cut. 3-5 is the target; outside that range isn't automatically wrong, but justify why.

**Never recommend, and never add, an explicit "none found" / "no duplicates exist" note inside the article content itself.** This is not part of U6 or any other written rule — it does not exist in `dsa-writer.md`. A zero-citation entry with a genuine thin pool is handled by simply having no `**Duplicate problems:**` line at all; do not propose adding one that says there's nothing to cite. If you flag a zero-citation entry as under-researched, the fix is to find and add real citations (WebSearch, per the sweet spot of 3-5), not to add a note admitting the gap. This applies to your findings/recommendations only — you are report-only and must not edit content either way (see Constraints).

Verdict per citation: `KEEP`, `REMOVE` (not actually a duplicate, or unverifiable), or `PROMOTE` (strong enough to be pulled out as its own full entry — cross-reference back to Pass 1 item 3).

### WebSearch caching rule

Before WebSearching a citation or entry's LC-number/title, check `docs/_meta/.practice-problems-verify-state/<type>/<filename>.json` (create the directory/file if absent — treat a missing file as "nothing verified yet"). If a record exists for this exact entry/citation **and** its cited name+LC-number text is byte-identical to what's recorded, skip the WebSearch and reuse the stored verdict (note in your findings that it was reused, not re-verified). If the record is absent or the text differs, WebSearch fresh and write a new record: `{name, lc_number, verified_date, verdict, source_text_snapshot}`.

**Do not read or write other chunks' state files** — only touch the record(s) for your assigned files' entries. Write your updates to your own scratch temp file alongside your findings; the orchestrator merges them into the real state file during assembly, not you.

**Judgment (Pass 1 and Pass 2 verdicts) is never cached** — always evaluate fresh, even if WebSearch verification was skipped as unchanged. Judgment is relative to every other entry in the file, so a change elsewhere in the file (or the article's own topic framing) can invalidate a previously-fine verdict even when this specific entry's text hasn't moved.

### Output — write to your own scratch temp file only

One markdown block per file you audited, this shape:

```markdown
## `content/dsa/<type>/<filename>.md`

### Pass 1 — full entries

- **Possible Bipartition (LC 886)** — KEEP. Distinct 2-coloring BFS/DFS technique, on-topic for graph-coloring.md.
- **<entry>** — REASSIGN to `<other-entry>` in this file / `<other-file>.md`. <reasoning>
- **<entry>** — NEEDS-DECISION. <the actual tradeoff, both sides, like a real option not a hedge>

### Pass 2 — duplicate-problems citations

- Under **<parent entry>**:
  - **<citation>** — KEEP. <why the technique genuinely matches>
  - **<citation>** — REMOVE. <why it doesn't hold up — cite the actual mechanic mismatch, not just a feeling>
  - **<citation>** — PROMOTE candidate. <why it's strong enough to be its own entry, and where>
  - Count: N citations, <in-range / too few - justified because X / too many - recommend cutting Y and Z>

### Facts/correctness notes

- <any LC-number mismatch, code/approach inconsistency, wrong complexity claim, etc., found during verification — file:line where possible>
```

If a file has zero issues across both passes, still include it with a one-line "no findings" note — silence is not the same as "checked and clean," and the orchestrator needs to know every file in your chunk was actually covered.

### Constraints

- **Report only. Do not edit any content file, inventory file, or the generator script.**
- Do not run the generator script yourself — the orchestrator already ran it before dispatching you.
- Do not touch git.
- Stay inside your assigned ≤5 files. If you notice something suspicious in a file outside your chunk (e.g. a cross-file duplicate candidate), note it in your output as a cross-reference, but do not go audit that file yourself.

---

## Report file format (orchestrator assembles this)

```markdown
# Practice Problems Audit (wiki-fe)

Generated by practice-problems-audit. Content-quality review of every `## Practice problems`
section against dsa-writer.md's distinct-technique constraint and topic-fit bar — not a sync
check against the hand-written dsa-worked-problems-dedup*-inventory.md files.

Run against: docs/_meta/practice-problems-index.md generated <timestamp>, <N> files, <M> entries.

## Patterns

<chunk 1 output, chunk 2 output, ... in alphabetical dispatch order>

## Data Structures

<...>

## Algorithms

<...>

## Summary

- Files audited: N
- Full entries: KEEP <n> / REASSIGN <n> / NEEDS-DECISION <n>
- Duplicate citations: KEEP <n> / REMOVE <n> / PROMOTE candidates <n>
- Facts/correctness issues found: <n>
```

## Constraints (orchestrator)

- Do not fix anything in content, inventory files, or elsewhere based on this audit's findings — this produces a report for the user to work through, same as every other audit in this folder. Follow-up fixes are a separate, explicit, user-directed pass (as demonstrated in the 2026-07-31 manual sync session that led to this prompt existing).
- No `git add`/`commit`/`push`.
- The verification-state file and the report file are the only two artifacts written to `docs/_meta/` by this process; do not create anything else there.
