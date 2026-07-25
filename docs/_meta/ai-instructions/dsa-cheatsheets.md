# AI Instructions - DSA Cheatsheet Pages

> This file is self-contained. Do NOT read `_base.md`, `dsa-writer.md`, or `dsa-rater.md` for cheatsheet pages - the format is fundamentally different (table-only, no prose, no code, cross-cutting not per-topic).

---

## WHAT THIS IS

A DSA cheatsheet answers ONE decision or comparison question - it is NOT a per-topic summary clone of a full article (the full articles already cover "what is this"; a 1:1 mini-clone of every article adds clicking, not recall speed).

The question can span many topics ("which sort do I pick", "which graph algorithm for this shape"), a pair of topics (greedy vs DP), or even one topic looked at from a decision angle (number theory formula reference, bit-manipulation trick reference). **Topic count is whatever the decision genuinely needs - not forced multi-topic, not forced single-topic.** The test is always: does this page answer a decision/lookup a candidate needs mid-recall, in one page, without re-deriving it from a full article.

Topics are **not mutually exclusive across files** - the same algorithm can legitimately appear as a row in more than one cheatsheet (e.g. Dijkstra shows up in the graph-decision sheet AND the complexity-master sheet). Don't dedupe across files; dedupe within a file.

---

## GOALS & AUDIENCE

- **Goal:** Last-hour-before-the-interview recall for a DECISION ("which do I use"), not a definition ("what is this").
- **Persona:** Candidate who already knows each topic from its full article and needs the comparison/selection logic back in under 10 seconds.
- **Scope boundary:** Table rows only. Conceptual explanation, proofs, diagrams, and code live in the per-topic companion articles - link out to them, never re-explain.

---

## NEVER

- Make a cheatsheet that only covers one DS/algorithm/pattern - that's a companion-article job, not a cheatsheet job
- Write prose sentences - every fact is a table row or a one-line note
- Include code blocks of any kind, including skeletons/templates
- Repeat conceptual content from a companion article - link to it instead
- Pad a cell for symmetry - empty cell beats a filler phrase
- Add decorative headers, intros, or "in this cheatsheet you will learn" framing

---

## NO PHASED PROTOCOL

Generate the full cheatsheet in one pass. No index phase, no "Proceed" / "Continue" checkpoints.

---

## FILE NAMING & LOCATION

- Lowercase, hyphen-separated, `.md` extension, named for the DECISION it answers, not for a topic slug.
- Lives in: `content/dsa/cheatsheets/<decision-name>.md` (flat).
- Examples: `complexity-master.md`, `sorting-comparison.md`, `graph-algorithms-decision.md`, `dp-recognition.md`, `data-structure-selection.md`, `input-size-complexity-lookup.md`, `string-algorithm-decision.md`, `two-pointers-vs-window-vs-prefix-sum.md`.
- Exception: the patterns family's trigger-phrase aggregator already has a reserved slot at `content/dsa/patterns/pattern-selection-cheatsheet.md` - fill it in place, don't duplicate it into this folder.

---

## PAGE STRUCTURE (FIXED - ALWAYS IN THIS ORDER)

1. **Title** - `# [Decision] Cheatsheet`
2. **One-line description** - the decision this page answers, no more.
3. **Companion links** - `> 📖 Full articles:` followed by a bullet list of every topic this sheet draws rows from, each linking to its companion article. This replaces the single-link pattern used by per-topic cheatsheets, since a decision sheet spans many articles.
4. **Comparison/decision table(s)** - the core content, see Table Shapes below.
5. **Gotchas** (optional) - max 3 bullets, one line each, only genuinely non-obvious traps that span multiple topics (a single-topic gotcha belongs in that topic's own article, not here).

---

## TABLE SHAPES (PICK WHICHEVER FITS THE DECISION - NOT FIXED LIKE THE OLD PER-TOPIC TEMPLATES)

Every cheatsheet in this family is fundamentally **rows = the things being compared, columns = the axes of comparison**. Pick columns that make the decision fall out by inspection. Common shapes:

### Comparison table (many topics, shared columns)

```markdown
| Algorithm   | Time       | Space | Stable? | Use when |
| ----------- | ---------- | ----- | ------- | -------- |
| Merge Sort  | O(n log n) | O(n)  | Yes     | ...      |
| Quicksort   | O(n log n) avg | O(log n) | No | ...  |
```

- Every row is a distinct topic (algorithm/structure), columns are the same across all rows.
- Sort rows by the most decision-relevant axis (frequency of use, or complexity), not alphabetically.

### Decision-tree / lookup table (condition -> answer)

```markdown
| Condition                       | Pick          | Why (one phrase) |
| -------------------------------- | ------------- | ----------------- |
| Non-negative weights              | Dijkstra      | fastest correct option |
| Negative edges, no negative cycle | Bellman-Ford  | tolerates negative weights |
```

- Rows are mutually exclusive conditions where possible; when two conditions overlap, order rows so the first match wins (like a cascading if/elif).

### Recognition table (signal -> category, PA1-style but compressed)

```markdown
| Trigger phrase / signal        | Maps to    |
| -------------------------------- | ---------- |
| "longest contiguous subarray..." | Sliding Window |
| "k-th largest", "top K"          | Heap       |
```

- Use for pattern/algorithm-family disambiguators (e.g. two-pointers vs sliding-window vs prefix-sum).
- Trigger column: literal quoted problem-statement phrasing where possible, not paraphrased.

A single cheatsheet may combine 2 of these shapes (e.g. a comparison table followed by a decision-tree table) if the decision genuinely needs both angles - keep them as clearly separate `##` sections, don't merge columns that don't share a schema.

### Exception: growth/scale references may use a diagram

A decision like "how bad is O(n²) actually at n=10⁶" is better shown than tabulated. For this narrow case (complexity-growth-reference style pages only), a single Mermaid or ASCII growth-curve diagram is allowed alongside the table - it must still be paired with a table giving the same data in rows (n values × complexity classes), so the page is still scannable/searchable as text. Don't extend this exception to other cheatsheets; it exists because growth curves are the one thing a table alone under-communicates.

---

## GOTCHAS SECTION

Use sparingly - only for a trap that spans topics (e.g. "people reach for DFS when the problem says 'shortest path' - that's BFS's job unless weighted").

```markdown
## Gotchas

- ⚠️ One line, the mistake + the fix.
```

No ✅/💡 tip callouts, no Interview Lens, no Decision Framework - those belong to the full articles, not the cheatsheet.

---

## CONSTRAINTS

- Zero code blocks, zero multi-sentence prose, anywhere in the file.
- Every row must be something a candidate would say out loud in 5 seconds, not read for 30.
- No duplicate rows within the same table; duplication ACROSS different cheatsheet files is fine and expected (topics are not mutually exclusive).
- Every topic referenced in a row must link to an existing, filled companion article - never cite a topic whose article is still a template/skeleton.
- Companion links list at the top must include every topic that appears in any table in the file.

---

## SELF-CHECK

Before outputting, verify:

- [ ] This sheet answers a DECISION/comparison spanning multiple topics, not a summary of one topic?
- [ ] Zero code blocks, zero prose paragraphs?
- [ ] Companion links list present, one per topic referenced in any table?
- [ ] Every linked companion article is actually filled (not a skeleton)?
- [ ] No row duplicated within the same table?
- [ ] File saved at `content/dsa/cheatsheets/<decision-name>.md` (or, for the patterns aggregator, in place at `content/dsa/patterns/pattern-selection-cheatsheet.md`)?
