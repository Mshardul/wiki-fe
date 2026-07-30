# DSA Worked Problems Dedup

Tracking doc. Two steps: (1) rewrite the spec, (2) apply it per-article.

**Prerequisite tickets - finish before starting Phase 2:** WIKI-512, WIKI-513.

Status: `[ ]` not started, `[x]` done.

---

## Background

`docs/_meta/ai-instructions/dsa-writer.md` currently prescribes, for the **Patterns** article type only, three overlapping code-bearing sections:

- **`## Skeleton` (PA3)** - generic pseudocode + one paste-and-adapt Python template. Present in all 25 filled Patterns articles, always right after "How it works", before "Complexity" (verified via `grep -n "^## " content/dsa/patterns/*.md`).
- **`## Worked problems` (PA6)** - spec says prose-only, no code, 2-3 sentence skeleton-mapping. In practice (e.g. `two-pointers.md`), this section has full code anyway.
- **`## Practice problems` (U6)** - full worked entry: statement + approach + code + complexity + duplicate-problems list.

Audit of `content/dsa/patterns/two-pointers.md` found the same problems (Two Sum II, Move Zeroes, Remove Duplicates, 3Sum) repeated near-verbatim across 2-3 of these sections, each copy diverging slightly (renamed function, reworded prose) - not intentional variants, just drift from hand-copying between sections. `## Skeleton` itself also violated its own spec: 3 of its 4 code blocks were fully-solved LC problems (`remove_duplicates`, `sort_colors`/Dutch National Flag, `three_sum`), not generic paste-and-adapt templates.

**Verified scope - this is a Patterns-only problem.** Checked actual headings across all three DSA article types:

- **Algorithms** (verified via `binary-search.md`, `dijkstra.md`) - no `## Skeleton`. Has `## Implementation` instead (the canonical algorithm implementation itself, pseudocode+Python - not a "paste-and-adapt for various problems" template, not solved-problem code). Only one problems section: `## Practice problems`. No separate Worked-problems section exists in this type.
- **Data Structures** (verified via `array.md`, `hash-table.md`) - same shape as Algorithms: `## Implementation` (not Skeleton), only `## Practice problems`, no separate Worked-problems section.

So Algorithms and Data Structures articles never had the 3-way overlap - they only ever specced one problems section. `## Implementation` in those two types is not equivalent to Patterns' `## Skeleton` and is **not in scope** for this dedup - it documents the algorithm/DS itself, not a set of solved practice problems, and can't be "duplicate" of a problem list.

**Verified: link/reference blast radius of removing `## Skeleton`.**

- **Internal ToC anchors - confirmed, 22 files affected.** Every Patterns article's own `## Table of Contents` section has a `- [Skeleton](#skeleton)` line (`grep -rn "#skeleton" content/dsa/patterns/*.md`). This is a same-file dead-anchor risk, not a cross-file one - each file's own ToC must have this line removed alongside the section itself. Confirmed present in: backtracking, binary-search-on-answer, bitmask-dp, difference-array, fast-slow-pointers, frequency-array, graph-coloring, in-place-reversal, interval-dp, k-way-merge, matrix-traversal, meet-in-the-middle, merge-intervals, modified-binary-search, monotonic-queue, monotonic-stack, prefix-sum, sliding-window, state-machine-dp, tree-graph-traversal, two-heaps, two-pointers. (3 filled Patterns articles - cyclic-sort, dp-patterns, subsets-permutations, top-k-elements - are still template-stub-sized per `dsa-cheatsheets-rollout.md`'s "known gaps" list and weren't checked individually; verify at their own Phase 2 turn.)
- **Cheatsheets - confirmed clean.** Zero matches for "skeleton"/"Skeleton" anywhere in `content/dsa/cheatsheets/*.md` or `pattern-selection-cheatsheet.md`.
- **Cross-file markdown links - confirmed clean.** Zero matches for `patterns/*.md#skeleton` anywhere under `content/`.
- **`content/backlinks.json` - confirmed clean.** Zero occurrences of "skeleton".
- **`docs/_meta/ai-instructions/dsa-rater.md` - confirmed CONFLICT, needs its own edit.** This companion quality-scoring spec actively grades PA3/Skeleton as a **gated weight-2 param** (line 112, listed alongside AL4/AL1/PA10/etc.), includes it in the V2 "pseudocode/code correctness" check's target list (line 154), and lists it among weight-2 gated params requiring a 2-line NOTE when scored (line 220). V6 (line 158) already carves out an n/a exception for PA3 re: invariant proofs specifically, but does not remove PA3 from scoring generally. **If `dsa-writer.md` drops PA3 but `dsa-rater.md` still scores it, every future Patterns-article rating pass will grade a section that no longer exists.** `dsa-rater.md` needs PA3 removed from: the weight-2 gated param list (line 112), the V2 check's target column (line 154), and the weight-2 NOTE-format param list (line 220) - same pass as the `dsa-writer.md` edit, not deferred to Phase 2.

---

## Decisions (user, 2026-07-30)

1. **Section name:** the surviving single section is called `## Practice problems` (not "Worked problems").
2. **`## Skeleton` is removed entirely** - the section itself, and every mention of it in `dsa-writer.md` (PA3 row, Patterns heading list, any cross-references). Patterns articles drop straight from `## How it works` to `## Complexity` in the heading list once this lands. No generic-template-only replacement section - full removal, not a trimmed-down version.
3. **One `## Practice problems` section per article**, full treatment per entry - see decision 9 for the exact subsection breakdown, visibility, and interaction model (supersedes the plain "statement + approach + code + complexity + duplicate-problems" description below, kept here as the content inventory): problem statement (2-3 sentences) + worked examples + approach prose (genuinely elaborated, dense, high-impact - not a one-liner, not padded) + runnable Python solution + time/space complexity + `**Duplicate problems:**` line (title + one-sentence reason, no code - this part is unchanged from current U6 rule).
4. **Distinct-technique constraint:** every problem in the section must be solved by a different core technique/mechanic than every other problem in the same section. Same core invariant/mechanic = same technique, regardless of surface framing (e.g. Container With Most Water and Trapping Rain Water both reduce to "track running max, advance the currently-shorter side" - same technique, so only one is a full entry; the other becomes a duplicate-problems line under it, not its own entry). No "same approach, different data/names" filler entries.
5. **Section position:** `## Practice problems` keeps the slot the surviving name already occupied in each type's heading list (last content section, after Related/What-the-interviewer-probes-for, before nothing - it's the final section). No reordering.
6. **Phase 2 (per-article rollout) is part of this plan**, not spun out separately.
7. **`## How it works` examples go generic - no LC/problem names.** Each variant's example trace (currently framed as "Two Sum on sorted array...", "Container With Most Water...", "Remove duplicates from...") keeps its exact numbers/arrays/diagram steps, but drops the named-problem framing in favor of a plain mechanic description (e.g. "pair summing to a target" instead of "Two Sum", "maximize `min(a,b) * width` over a height array" instead of "Container With Most Water"). Reason: How-it-works' job is teaching the mechanism, Practice Problems' job is the named real-world problem - keeping How-it-works nameless makes the two sections structurally unable to duplicate each other by name, no per-file judgment call needed in Phase 2. Applies per-variant (every `### Variant N` example gets this treatment), not just to Patterns generally.
8. **LC numbers are cited when a problem has one, but not mandatory for a problem to qualify.** `## Practice problems` entries keep the `(LC NNN)` tag where it applies (existing convention, ~40+ citations across the codebase, also the join key for `**Duplicate problems:**` cross-refs) - but a genuinely good problem without an LC number (classic/textbook problem, CP-primitive-style) is still eligible for a full entry; just omit the tag for that entry.
9. **Per-problem entry structure** (content-authoring contract - the reveal *mechanism* itself is app work, tracked as WIKI-513, a prerequisite for this plan):
   - **Subsections, in order:** Problem statement → Worked examples → Constraints → [answer, hidden by default via WIKI-513's toggle] Approach → Solution (code) → Complexity (one line immediately after the code block, not its own subsection) → Duplicate problems.
   - **Always visible:** Problem statement, Worked examples, Constraints, Duplicate problems.
   - **Answer bundle (hidden by default, WIKI-513):** Approach + Solution + Complexity, revealed together as one unit per problem.
   - **Worked examples format** - nested list, not a table (table rejected: breaks down on multi-line/grid/nested inputs common across Algorithms/DS articles - matrix, tree, graph problems - and risks mobile wrapping issues; list handles arbitrary input complexity without cramping):
     ```
     - **Example 1**
       - **Input:** nums = [2, 7, 11, 15], target = 9 | **Output:** [0, 1]
       - **Explanation:** nums[0] + nums[1] = 9
     - **Example 2**
       - **Input:** nums = [3, 2, 4], target = 6 | **Output:** [1, 2]
     ```
     Input and Output clubbed onto one nested bullet with a `|` separator (Output is typically short, so clubbing costs little space in practice; Input is the field that can get long, so it still wraps independently on its own line if needed). Explanation is a separate nested bullet, **always included** (not omitted even when the mapping looks self-evident), kept to a single sentence. 2 examples for simpler problems, 3 for complex ones - not a fixed count.

---

## Phase 1 - Spec rewrite

### `docs/_meta/ai-instructions/dsa-writer.md`

- [x] Remove the PA3 `## Skeleton` row/definition entirely (currently patterns-block only).
- [x] Remove the PA6 "Worked problems" definition (no-code, 2-3-sentence version).
- [x] Rewrite the U6 "Practice problems" definition to be the single merged spec: statement + worked examples + constraints + approach prose + code + complexity + duplicate-problems line, plus the explicit distinct-technique constraint.
- [x] Update the Patterns "Headings list per section" block (`dsa-writer.md`, Patterns section) - remove `## Skeleton` line, remove `## Worked problems` line, keep single `## Practice problems` line in its current end-of-list position.
- [x] Confirm Algorithms and Data Structures heading lists need no structural change - confirmed, untouched.
- [x] Sweep `dsa-writer.md` for any other PA3/Skeleton cross-references and remove - found and fixed the CP-coverage section's "Practice (U6) / Worked problems (PA6)" line in addition to the planned edits.

### `docs/_meta/ai-instructions/dsa-rater.md`

- [x] Remove PA3 from the weight-2 gated param list (line 112).
- [x] Remove PA3/Skeleton from the V2 "pseudocode/code correctness" check's target column (line 154) - AL7/U5/U4 remain as V2's Algorithms/DS targets.
- [x] Remove PA3 from the weight-2 NOTE-format param list (line 220).
- [x] V6's PA3 n/a-carve-out language (line 158) reworded - kept the n/a marker for Patterns, dropped the now-meaningless "PA3's skeleton is not a proof" justification.
- [x] Swept `dsa-rater.md` for other PA3 mentions - found one more than the original 4-line estimate: line 135's Phase-1-self-check note ("don't force-fit them onto PA3/PA9") also referenced PA3 and needed fixing.

**Phase 1 complete 2026-07-30.**

## Phase 2 - Per-article rollout (batch-fix stage)

Apply the new spec file by file. Do not start until Phase 1 is merged and confirmed.

**This phase tracks the mechanical, same-for-every-file steps only** (Skeleton removal, ToC cleanup, generic How-it-works, Prerequisites reason-text strip). The Practice Problems content itself - problem selection, distinct-technique judgment calls, final entry writing - is a separate deep-dive stage, discussed and recorded one file at a time in `docs/_meta/plans/dsa-worked-problems-dedup-steps.md`. A file isn't done until both this phase's checkboxes AND its section in the steps file are complete.

### Prerequisites: strip reason text (all DSA article types - Patterns, Algorithms, Data Structures)

Confirmed dead weight: `renderPrerequisites` (`js/content/formatting.js:65-117`) only ever reads the link/strong text into the chip (`chip.textContent = (link || li.querySelector("strong"))?.textContent.trim()`) and then deletes the original `## Prerequisites` heading and list from the DOM entirely (`heading.remove(); list.remove();`, line 115-116) - the trailing `- reason` sentence never reaches the reader in any form (no tooltip, no aria-label, no title attr). Originally served as an authoring self-check (per old U9 wording: "if the reason is topical adjacency not a real dependency, drop the entry") but that check is now silent per-author judgment, not recorded text (Phase 1's `dsa-writer.md`/`dsa-rater.md` edits already reflect this).

Per-file: strip every Prerequisites bullet from `[Title](./path.md) [Must read] - reason` down to `[Title](./path.md) [Must read]` (keep the tier marker - it renders as the badge; only the trailing prose after ` - ` goes). Applies to **every DSA article across all three types**, not just Patterns - this is a separate sweep from the Patterns-only Skeleton/Practice-problems work below. Pull the file list fresh at execution time (`grep -rl "^## Prerequisites" content/dsa/patterns/*.md content/dsa/algorithms/*.md content/dsa/data-structures/*.md`) rather than enumerating here, since it's effectively "every filled article."

- [ ] Sweep and strip reason text from all Patterns articles' Prerequisites blocks.
- [ ] Sweep and strip reason text from all Algorithms articles' Prerequisites blocks.
- [ ] Sweep and strip reason text from all Data Structures articles' Prerequisites blocks.

### Patterns (25 filled articles - Skeleton removal + Worked/Practice merge applies to all)

Per-file checklist, every article: (a) remove `## Skeleton` section body, (b) remove its `- [Skeleton](#skeleton)` line from that file's own `## Table of Contents` section (confirmed present in 22 of 25 - see verification above; check the remaining 3 stub-sized ones too), (c) merge `## Worked problems` + `## Practice problems` content into a single `## Practice problems` section per the Phase 1 spec - **problem selection/distinct-technique judgment happens in the steps file, not here**, (d) remove the now-redundant `- [Worked problems](#worked-problems)` ToC line if the merged section drops that anchor name, (e) rewrite `## How it works`'s per-variant examples to drop named-problem framing per decision 7 - same numbers/diagrams, generic mechanic description instead of the problem name.

- [ ] `two-pointers.md` - first candidate, already audited this session. Rough surviving-problem direction (re-derive fresh against final spec, don't copy verbatim): Two Sum II (opposite-ends), Container With Most Water (opposite-ends + running-max/greedy-wall; Trapping Rain Water becomes its duplicate-problems entry, confirmed same technique per decision 4), Remove Duplicates or Move Zeroes (same-direction write-head - pick one canonical, other becomes duplicate entry), 3Sum (kSum/fixed-pointer + two-pointer), Valid Palindrome (opposite-ends, non-numeric target).
- [ ] `backtracking.md`
- [ ] `binary-search-on-answer.md`
- [ ] `bitmask-dp.md`
- [ ] `cyclic-sort.md`
- [ ] `difference-array.md`
- [ ] `dp-patterns.md`
- [ ] `fast-slow-pointers.md`
- [ ] `frequency-array.md`
- [ ] `graph-coloring.md`
- [ ] `in-place-reversal.md`
- [ ] `interval-dp.md`
- [ ] `k-way-merge.md`
- [ ] `matrix-traversal.md`
- [ ] `meet-in-the-middle.md`
- [ ] `merge-intervals.md`
- [ ] `modified-binary-search.md`
- [ ] `monotonic-queue.md`
- [ ] `monotonic-stack.md`
- [ ] `prefix-sum.md`
- [ ] `sliding-window.md`
- [ ] `state-machine-dp.md`
- [ ] `subsets-permutations.md`
- [ ] `top-k-elements.md`
- [ ] `tree-graph-traversal.md`
- [ ] `two-heaps.md`

Not in scope: `pattern-selection-cheatsheet.md` (different format entirely, no Skeleton/Practice-problems structure).

### Algorithms and Data Structures (no Skeleton, no section merge needed - verify only)

These types never had the 3-way overlap, so no structural change is expected. Still need a per-file check (not assumed clean) against the shared rules landing in Phase 1: is `## Practice problems` already prose-elaborated per the new bar, and does it already respect the distinct-technique constraint, or did any individual file independently drift into padding/duplicate-technique entries the way `two-pointers.md` did. Check, don't skip.

- [ ] Sweep all 41 Algorithms articles' `## Practice problems` sections against the new bar.
- [ ] Sweep all 27 Data Structures articles' `## Practice problems` sections against the new bar.

(File lists intentionally not enumerated here - pull fresh via `grep -l "^## Practice problems" content/dsa/algorithms/*.md content/dsa/data-structures/*.md` at Phase 2 start, since new articles may land before this phase begins.)

### Every file touched, regardless of type

Regenerate search-index/backlinks per CLAUDE.md completion checklist, log in `content/CHANGELOG.md`.
