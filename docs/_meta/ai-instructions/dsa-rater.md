# DSA Article Rater

Scores a written DSA article (`content/dsa/**/*.md`) for interview-readiness and gives a **publish gate** (ship / no-ship). Given an article path, follow the steps below and produce a scored report. Scoring is LLM judgment - no separate parser. The same article may vary slightly run-to-run on judgment params; that is accepted. Filesystem params (U8/U11/U12) are deterministic and supplied by a script - see step 5.

**Rules live in [dsa-writer.md](./dsa-writer.md).** That file defines every param (U1, DS2, PA1, FB, …) - what must be present, in what shape. This file does **not** redefine them; it scores against them by ID and decides publishability. If you need to know what a param _requires_, read the writer. This file owns: detection, the scoring scale, weights, the gate, the filesystem pre-check, the [content verification checks](#content-verification-pass-v-checks) (V1–V14, correctness not structure), and the report format.

Input accepts one article, several articles, a subgroup (folder/family), several subgroups, or "all" - the same selection applies to every check in this file, structural and content-verification alike, in one pass.

---

## How to use

Input: one article path (or a glob to batch-rate several, one report each).

1. **Read the article.**
2. **Detect the article kind** (see [dsa-writer.md › Article kinds](./dsa-writer.md#article-kinds--specific-vs-consolidated)). Three possible kinds:
   - `> **Hub article.**` marker present → **consolidated hub** - score with the hub rubric below, skip per-section scoring.
   - `> **Cheatsheet.**` marker present → **cheatsheet/meta** - score U7/U8/U9/U10/U11/U12 only; mark all other params n/a with reason "cheatsheet article"; gate = SHIP if those six pass and every table row has ≥1 working cross-link.
   - Neither marker → **specific article** - proceed with steps 3–6 as normal. An article without either marker is always treated as specific.
3. **Detect the section** from the folder:
   - `content/dsa/data-structures/…` → **DS**
   - `content/dsa/algorithms/…` → **Algorithm**
   - `content/dsa/patterns/…` → **Pattern**
4. **Detect the family** (DS and Algorithm only - Pattern has none) using the family tables in the writer. **Tie-breaker:** family = the article's _primary subject_, not techniques touched in passing (Backtracking = Recursive/build even though it recurses). When genuinely split, pick the family whose must-cover block the article covers at most depth, and name the runner-up in the report. _(Hubs have no family - skip this step.)_
5. **Apply params in four tiers:** universal (every article) + the matching section block + the matching family block + the [content verification checks](#content-verification-pass-v-checks) (V1–V14) - all scored in the same pass, same table. Params that don't apply (e.g. recognition-signals on an algorithm) are marked **n/a** and dropped from the total.
6. **Resolve filesystem checks via the pre-check script - facts supplied, not guessed.** U8, U11, U12 are deterministic and must not vary run-to-run. Run `./scripts/dsa-check.sh <article.md>` (Bash wrapper over `dsa_check.py`) and paste its PASS/FAIL lines into the U8/U11/U12 rows. Do **not** judge these three from reading alone. If the script can't run, say so in the report and fall back to a manual tree check - never silently guess.
7. **Score, gate, and report** in the output format at the bottom - one table, structural params and V-checks together.

---

## Hub (consolidated) article rubric

A hub article surveys a family and routes to member pages; it is **exempt from the per-section structure** (no worked example, single invariant, family block, or practice problems - those live on the member pages). Do **not** score it against DS/AL/PA section params or the family block; mark those **n/a** with the reason "hub article - covered on member pages."

Score a hub against **only** these:

| #   | Param                | Gate | What to check                                                                                                                                                     |
| --- | -------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1  | Family definition    | gate | What the family is + a mental model - at the family level, not one member's.                                                                                      |
| H1  | Member list          | gate | Every member named, each with a 2–3 sentence description; **one working link per member, or plain-text name** until that page exists (never a broken `.md` link). |
| H2  | Decision layer       | gate | A "which one when" - comparison table and/or selection prose that genuinely helps the reader choose between members.                                              |
| H3  | Shared theory        | adv  | Any genuinely family-level reasoning (the lower bound, the shared recurrence, the unifying invariant) - where one exists.                                         |
| U7  | Format spine         | gate | Title → Prerequisites → TOC → body; the `> **Hub article.**` marker present.                                                                                      |
| U8  | Title ↔ filename     | gate | Script.                                                                                                                                                           |
| U9  | Prerequisites format | adv  | Standard prerequisites block.                                                                                                                                     |
| U10 | TOC                  | adv  | Reflects headings.                                                                                                                                                |
| U11 | Filename convention  | gate | Script.                                                                                                                                                           |
| U12 | Links resolve        | gate | Script - every live `.md` link resolves (member links not yet wired must be plain text, not broken links).                                                        |
| U13 | Soundbite            | adv  | One spoken-aloud family summary.                                                                                                                                  |

Scoring scale, weights (U1/H-params weight 1; U8–U13 weight 0.5), the ≥9 gate, and the report format are unchanged. The gate is SHIP only if every gated hub param scores ≥9.

---

## Scoring

- Each applicable param scored **0–10** against its definition in the writer:

  - **9–10** - fully present, correct, **at senior depth** (per the writer's "Depth bar"): goes past the obvious, names the trade not just the choice, and the senior-only insight is there. Present-and-correct-but-shallow does **not** reach this band.
  - **6–8** - present and correct but **shallow** (the strong-junior answer), thin, partially correct, or missing a sub-part. Most "looks complete" articles land here until depth is added.
  - **3–5** - gestured at but weak / vague / mostly absent.
  - **0–2** - missing or wrong.

  **Depth is the gate between 8 and 9.** If you can't point to the specific senior-level insight (amortized-vs-worst-case, the constant that bites, the trap a junior misses), it's an 8, not a 9.

- Each param has a **weight** (below). Overall = weighted average, scaled to **/100**:
  `overall = round( 100 * Σ(score_i × weight_i) / Σ(10 × weight_i) )` over applicable params only.
- **n/a params** are excluded from both sums - weights renormalize automatically.

### What "9" means for high-weight gated params

The 9–10 band requires **senior depth** - something beyond the obvious that separates a senior answer from a junior one. For the three highest-weight params:

- **U5 (pseudocode, weight 2): 9 means** - CLRS form throughout (`for i ← 1 to n`, `▷ comment`, explicit swap/assign, no Python syntax leaking in); every non-trivial op has pseudocode; any skip is justified inline with the trivial-op note.
- **FB family block (weight 2): 9 means** - **DS families:** for Memory layout: cache line / cache miss stated explicitly (not just "arrays are fast"), resize doubling argument shown with the accounting math (not just asserted), amortized vs worst-case called out by name; for Hashing & collisions: load factor threshold named with a number, both chaining and open-addressing covered, amortized rehash cost derived; for Traversal & invariant: heap's O(n) build proven with the `Σ h/2^h` convergence argument, not just stated; for Representations: matrix vs list tradeoff given with a concrete density crossover (e.g. `O(V²)` space for matrix makes it worth it only when `E ≈ V²`). **Algorithm families:** for Loop/recurrence invariant: the search-space-shrink argument stated precisely (e.g. binary search's "half discarded each step" tied to the log factor), and any recurrence solved via Master theorem with the case named (not just "it works out to O(n log n)"); for Graph/tree assumptions: the visited-state mechanism named explicitly (color array / seen-set / distance array) and directed-vs-undirected, weighted-vs-unweighted stated as assumptions the algorithm depends on, with what breaks if violated (e.g. Dijkstra + negative weights); for State & recurrence: the state definition precise enough to reconstruct the DP table shape, base case given explicitly, memo-vs-tabulation tradeoff named, and the state-space size tied back to the complexity; for Greedy-choice proof: a real exchange argument (assume an optimal solution differs, show swapping toward the greedy choice doesn't hurt) - not just "greedy works here"; for Bit-tricks table: each trick's identity is justified (why `n & (n-1)` clears the lowest set bit - not just asserted), not a bare table of tricks with no derivation. **Distribution family:** for Key & distribution: the key range `k` (or digit/bucket count) is stated as a variable the reader can plug real numbers into, the comparison-lower-bound-sidestep is explained (why O(n+k) beats Ω(n log n) - because it's not comparison-based), and the space-for-time cost is quantified, not just asserted.
- **PA1 (recognition signals, weight 3): 9 means** - all three labeled parts present (trigger phrases / structural cues / not to be confused with); ≥2 literal quoted phrases under (a); (c) names ≥1 concrete neighbor pattern and states the distinction in one crisp sentence that would survive a follow-up ("two-pointers differ because they don't require the subarray to be contiguous in value-space" is a distinction; "they're different" is not).

### Publish gate (separate from the score)

Each param is **gated** or **advisory**:

- **Gated** params must score **≥9** to publish. Any gated param scoring **≤8** → **NO-SHIP**, regardless of the /100.
- **Advisory** params never block - they only inform fixes.
- A gated param scoring ≤8 is a **blocker** and is listed first in the report.

So a 91/100 article with one gated param at 8 still reads **NO-SHIP** until that param is fixed. The score measures quality; the gate measures publishability.

### Param caps (judgment notes the score scale can't carry)

A few params have a hard cap regardless of how good the rest reads - apply these when scoring:

- **PA1 (recognition signals)** - if any of the three labeled parts (trigger phrases / structural cues / not-to-be-confused-with) is missing or vague, **cap at 5** (→ blocker).
- **U5 (pseudocode ≠ Python)** - if it could be pasted as valid Python, **cap at 5**. Pseudocode absent where non-trivial logic exists, or an **unjustified n/a**, scores **0–2** (never a free n/a pass - an n/a must name the trivial op in NOTE).
- **DS1 / AL2 / PA2 (diagram)** - a `<!-- diagram -->` placeholder or TODO instead of a real mermaid/ASCII diagram scores **≤2**.
- **DS8 / AL9 (comparison)** - must be an actual **table** of this-vs-rivals, not prose duplicating DS4/AL5. Prose-only, or a table with a single row (no rival), **caps at 5** (→ blocker). It must add the scannable view DS4/AL5 don't.
- **AL10 / PA10 (constraints & approach)** - must map concrete **input sizes → complexity/approach** (`n ≤ 10⁵ → O(n log n)`). Generic "consider the constraints" with no size→approach mapping **caps at 5** (→ blocker).
- **CP / PA11 (CP-primitives)** - must be **≥2 real, topic-appropriate** contest tools with the "why for CP" line. Filler, a single primitive, or tools that don't actually apply to the structure **caps at 5**. (For DS this only blocks when the family is **Linear or Graph** - see conditional gate.)
- **DS7 (at-scale trap) / U18 (cache behavior) - per-family strength.** Per [dsa-writer.md's per-family applicability table](./dsa-writer.md#at-scale-trap-ds7-and-cache-behavior-u18---per-family-applicability): Linear and Hash-based families require both at full strength; Tree/heap requires both but the trap should match the specific member (heap ≠ trie ≠ BST - don't accept a copy-pasted heap example on a trie article); Graph requires the at-scale trap (representation-dependent - matrix memory wall vs list pointer-chasing) but U18 is advisory-only for Graph, since it's often already covered by DS8's comparison table - do not penalize a Graph article for folding cache commentary into DS8 instead of restating it under U18.
- **DS9a (amortized proof)** - if the structure has amortized behavior (dynamic array, hash table, heap) and the article only asserts "O(1) amortized" without showing the accounting or potential-function argument, **cap at 5** (→ blocker when gated). An n/a is accepted only for structures with no amortized behavior; an unjustified n/a on a dynamic array scores **0–2**.
- **DS8 (comparison table) crossover condition** - a rival row that states O() but omits the practical crossover condition (the threshold or workload where the rival actually wins) **caps the row's contribution at 6**. A table where every rival row is missing the crossover caps DS8 at **5** (→ blocker).
- **DS5 (variants) ↔ CP boundary - do not double-penalize.** Per the writer, DS5 lists CP-relevant variants as **one-line structural entries** and defers the technique/diagram to `## CP-primitives`. A variant named in DS5 with its depth in CP-primitives is **full credit** - do **not** score DS5 down for "could go deeper on the CP variant" when that depth correctly lives in CP-primitives. DS5 is judged on naming the structural shapes; CP-primitives is judged on wielding them.
- **U14 (section layering)** - advisory, so never a blocker. Score it: **9–10** if adjacent sections demonstrably add a new layer (U1 = definition, `## How it works` opens at the mechanism without re-defining; AL1 = why-it-works, AL2 opens with a trace not an explanation). **6–8** if there's minor restatement but the deeper content is there. **3–5** if `## How it works` (DS) or `## How it works` (AL) opens by re-defining the thing U1 or AL1 just said. **0–2** if sections are copy-pastes of each other.
- **U6 (practice problems) - duplicate-problems gate.** Each worked problem should include a `**Duplicate problems:**` line (title + 1 sentence per entry). **If not a single worked problem has one**, cap U6 at **5** (→ blocker). Having duplicate-problems lists on 3–5 problems raises the score ceiling to 9–10 (advisory); having it on at least 1 is the gated floor. Do not penalize if a problem genuinely has no close duplicates - an n/a with justification is acceptable on individual problems, but at least one problem in the section must carry the list.
- **U20 (misconceptions)** - advisory, never a blocker. Score it: **9–10** if bullets correct plausible wrong beliefs (not just edge cases or bugs) and each is something a candidate could genuinely hold going in. **6–8** if present but the "misconceptions" listed are really gotchas (implementation bugs) rather than wrong mental models. **3–5** if only one bullet and it's shallow. **0–2** if absent. An explicit n/a with justification ("no plausible misconceptions for this topic") is full credit - do not require filler.
- **PA6 vs U6 - do not conflate.** PA6 (worked problems in patterns) = brief approach sketches, no code. U6 (practice problems) = full worked entries with code + duplicate list. If the article's PA6 entries contain code blocks, score PA6 down for being over-written (it should look like 2–3 sentences, not a solution). If U6 entries are sketch-only with no code, score U6 down. The two sections must look visually different on the page.

### Weights

| Weight  | Params                                                                                                                                                                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3**   | PA1 Recognition signals (pattern)                                                                                                                                                 |
| **2**   | AL4 Complexity derivation · AL1 Intuition · U5 Pseudocode ≠ Python · FB Family block · PA3 Skeleton · AL10 Constraints & approach · PA10 Constraints & approach · DS9a Amortized proof · V1 Complexity re-derivation · V2 Pseudocode/code correctness · V6 Invariant inductive proof · V9 Recursion stack space honesty |
| **1**   | All other section-core params + U1 def · U2 complexity · U3 when-to-use · U4 Python · U6 practice · U12 links · DS8 / AL9 Comparison · CP CP-primitives (DS) · PA11 CP-primitives · DS9 Interviewer probes |
| **0.5** | U8 Title↔filename · U9 Prerequisites format · U10 TOC · U11 Filename convention · U13 soundbite · U14 section layering · U17 real-world + at-scale · U18 cache behavior · U20 misconceptions · advisory params · V3 Worked example fidelity · V4 Comparison table accuracy · V5 Edge case coverage · V7 Diagram-text agreement · V8 Terminology precision · V10 Duplicate-problems relevance · V11 Prerequisite necessity · V13 Probe answer correctness · V14 General factual accuracy |

### Gate per param

| Gate            | Params                                                                                                                                                                                                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **gated**       | U1–U8, U11, U12 · all DS except DS5, DS9, DS9a · DS8 · all AL except AL8 · AL9, AL10 · PA1–PA4, PA6–PA8, PA10, PA11 · FB · V1, V2, V6, V9                                                                                                                                                                                                                               |
| **advisory**    | U9, U10, U13, U14, U17, U18, U20 · DS5 · DS9 · AL8 · PA5, PA9 · V3, V4, V5, V7, V8, V10, V11, V13, V14                                                                                                                                                                                                                                                                    |
| **conditional** | **CP (CP-primitives, DS only)** - **gated** when the article's DS family is **Linear** (array, string, linked-list, stack, queue) **or Graph**; **advisory** for Tree/heap and Hash-based. Determine from the detected family (step 3) and state which applies in the NOTE. Not present on Algorithms or Patterns (Algorithms carry CP via AL10+AL6; Patterns have their own gated PA11). |
| **conditional** | **DS9a (Amortized proof, DS only)** - **gated** when family is **Linear** (dynamic array) or **Hash-based**; **advisory** when family is **Tree/heap**; **n/a** for Graph and fixed arrays (mark n/a with justification). State which applies in the NOTE. |
| **conditional** | **U18 (Cache behavior, DS only)** - **advisory for Graph** (often already covered by DS8's comparison table - don't double-penalize), **advisory but expected** for Linear/Hash-based/Tree-heap (writer treats it as required by default for these three; rater still scores it as advisory-weight, per [dsa-writer.md's per-family table](./dsa-writer.md#at-scale-trap-ds7-and-cache-behavior-u18---per-family-applicability), but a missing U18 on Linear/Hash-based/Tree-heap should read as a real gap in NOTE, not a shrug). |
| **manual**      | **V12 (Cross-article consistency)** - no score, no gate contribution; NOTE-only flag for human/agent follow-up. |

---

## Content verification pass (V-checks)

Everything above (U/DS/AL/PA/FB/H) scores whether required content is *present, in shape, at depth*. It does not check whether the article's claims are *true*. This section does - it fact-checks the article against its own stated complexity, traces, invariants, and comparisons. **Part of every rate, not a separate pass** - score V1–V14 in the same table, same run, alongside the structural params, using the same input (one article, several, a subgroup, several subgroups, or "all").

- **Cost:** each check requires independent reasoning (re-derive, hand-trace, cross-check) - not a lookup. This makes the rate as a whole heavier than pure structural scoring; that's expected now that correctness is part of the gate. See **Triggering the expensive checks** below for how the four costliest checks scope their own effort.
- **Trust model:** run by whichever LLM/agent is invoked - there is no hard-coded ground truth or forced hedging. Rely on the model's own DSA knowledge. **Show the derivation, not just the verdict** - every V row's NOTE must contain the actual re-derivation/trace/proof sketch performed, so a human (or another model) can sanity-check the checker itself. A V row with only a pass/fail and no shown work is incomplete.
- **Scope:** V-checks apply to **specific articles only** (DS/AL/PA structure). Mark them **n/a** ("hub/cheatsheet article - not scored on content verification") for hubs and cheatsheets - both are already exempt from the section-core params these checks verify. **Within Patterns specifically**, V4 (comparison-table accuracy), V6 (invariant proof), and V13 (probe-answer correctness) are structurally n/a - Patterns have no comparison table, no correctness/invariant section, and no interviewer-probes section (see each check's Targets column). Mark them n/a with that reason, don't force-fit them onto PA3/PA9.
- **Dead-link checking is out of scope here - decided, don't re-discuss.** CI's lychee (`.github/workflows/ci.yml` job `dead-links`) and pre-commit's local lychee hook both run with `--exclude-path content` - `content/**` (including all DSA articles) is explicitly excluded because most wiki content uses app-internal hash routes, not real URLs. DSA articles are the exception - they use real `.md` cross-links (U12) - but that gap is already covered by **U12 + `./scripts/dsa-check.sh`** (step 6 above), which is the deterministic link-resolution check for this content. No new V-check needed; V12 (cross-article consistency) is a different concern - content contradiction between siblings, not link resolution - and doesn't overlap.

### Triggering the expensive checks (V1, V2, V6, V9)

These four are the costliest - full re-derivation, full hand-trace, full inductive proof, full recursion audit. Running them at maximum rigor on every claim in every article is wasteful when most claims are unremarkable. **Scope effort to suspicion, not to a fixed size threshold:**

1. **Fast skim first.** Read the complexity claims, pseudocode, invariant statement, and space-complexity claim once, quickly - the way a reviewer eyeballs a page before deciding what to double-check.
2. **Flag what looks off.** An unusual or surprising complexity claim, an `O(1)` space claim next to visible recursion, a pseudocode block that looks too short for what it claims to do, an invariant stated in one line with no visible justification, a comparison-table number that doesn't match common knowledge.
3. **Spend the deep-verification effort where something was flagged.** Full re-derivation / hand-trace / proof-check on flagged claims. For claims that skimmed clean, a lighter confirmation is enough - state in the NOTE that the claim was skimmed and looked sound, rather than showing a full derivation for something unremarkable.
4. **When in doubt, verify.** This is a suspicion filter, not a permission slip to skip work - if unsure whether something is skim-clean, treat it as flagged.

This keeps cost proportional to risk instead of applying uniform maximum effort everywhere. It does not change the gate: a flagged-and-failed check still blocks exactly like before.

### The checks

| #   | Check                          | Verifies                                                                                                                                                  | Targets (writer rule)     | Gate |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---- |
| V1  | Complexity re-derivation        | Independently re-derive the stated time/space complexity from the pseudocode/algorithm logic shown - solve the recurrence or count steps yourself. Mismatch vs the article's claim → fail. | U2, DS3, AL4, PA4                | gate |
| V2  | Pseudocode/code correctness     | Hand-trace the pseudocode (and the Python, if logic differs) on a small concrete input. Wrong output, infinite loop, off-by-one → fail.                    | U5, U4, AL7, PA3            | gate |
| V3  | Worked example fidelity         | Re-trace the worked example's stated steps against the algorithm's actual logic - does the described trace actually happen?                                | AL2, DS1, PA2                | adv  |
| V4  | Comparison table accuracy       | Independently verify each rival row's stated Big-O in the comparison table - not from the article's own claim.                                            | DS8, AL9 - **n/a for Patterns** (no PA comparison-table param exists) | adv  |
| V5  | Edge case coverage              | Check the article's edge cases are the ones **actually relevant to its family** (per [dsa-writer.md's AL6 family-menu note](./dsa-writer.md#section-block---algorithms) - e.g. negative-key/adversarial-clustering for Distribution, not a copy-pasted "empty/duplicates/cycles" list that doesn't fit), and that the stated complexity still holds for each one handled. | DS2, AL6, pseudocode        | adv  |
| V6  | Invariant inductive proof       | Check the stated loop/recurrence invariant actually has a base case AND an inductive step shown, not just asserted.                                        | AL3, DS9a - **n/a for Patterns** (no PA correctness/invariant param exists - PA3's skeleton is not a proof) | gate |
| V7  | Diagram-text agreement          | Check the diagram's node/step count and values match the prose walkthrough exactly (per writer's diagram-fidelity rule).                                  | DS1, AL2, PA2                | adv  |
| V8  | Terminology precision           | Flag loose/incorrect use of near-synonyms: "stable" sort claims, "in-place" claims, "balanced" vs "self-balancing", etc.                                    | all                          | adv  |
| V9  | Recursion stack space honesty   | For any recursive algorithm, check the space complexity includes the call-stack term (per writer's U2 rule) unless tail-call/iterative conversion is stated. | U2                          | gate |
| V10 | Duplicate-problems relevance    | For each `**Duplicate problems:**` entry (U6), check it genuinely shares the core solving mechanic, not just topic adjacency.                              | U6                          | adv  |
| V11 | Prerequisite necessity          | For each prerequisite (U9), check it's a genuine concept dependency, not a merely-related topic (per writer's U9 rule).                                    | U9                          | adv  |
| V12 | Cross-article consistency       | Spot-check this article's claims (U1 definition, U3/DS4/AL5 decision cues, DS8/AL9 comparison rows) against 1-2 sibling articles in the same family for contradictions. Requires reading sibling files. | U1, U3, DS4/AL5, DS8/AL9     | manual |
| V13 | Interviewer-probe answer correctness | For each DS9/AL8 follow-up question, check the 2–3 sentence answer sketch is itself factually correct - not just present and well-formatted.          | DS9, AL8 - **n/a for Patterns** (no PA interviewer-probes param exists - PA9 "First 30 seconds" is a recognition script, not a probe/answer pair) | adv  |
| V14 | General factual accuracy (residual sweep) | A bounded, secondary sweep of the remaining prose (U1 definition, U3 decision cues, gotchas, misconceptions - anything not already covered by V1–V13) for plain factual errors. **Explicitly secondary**: do not re-verify what V1–V13 already checked, and do not turn this into an unbounded audit - flag only clear, confident errors encountered while reading, not a hunt. | all (residual)              | adv  |

**Weight:** gated V-checks (V1, V2, V6, V9) carry weight **2**, same tier as other high-stakes gated params (FB, AL4, U5). Advisory V-checks (V3, V4, V5, V7, V8, V10, V11, V13, V14) carry weight **0.5**, same tier as other advisory params. V12 carries no score - it produces a NOTE flag only, for manual follow-up; it never contributes to the /100 or the gate.

**Report shape:** V rows are **regular rows in the one param table** - not a separate block. They sit alongside U/DS/AL/PA/FB/H rows, same columns (SCORE / W / GATE / NOTE), and fold into the same weighted /100 and the same SHIP/NO-SHIP gate (a V1/V2/V6/V9 failure is a blocker exactly like any other gated param ≤8). V12 gets a row too, but with no SCORE/W/GATE - just a NOTE flagging any contradiction found, or "no contradiction found" / "not checked - no sibling articles exist".

**Uncertainty:** no forced escape hatch - if the checking model is genuinely unsure, it should say so in the NOTE and score conservatively, but this is judgment-call territory, not a hard rule requiring an n/a.

---

## Output format

**Always produce the full score table.** Do not substitute a bullet list, a prose summary, or an ad-hoc table with different columns. The exact format below is required - every time, including self-ratings after edits.

```
<filename>  -  <overall>/100  -  <SHIP | NO-SHIP>   [section: <DS|Algo|Pattern>, family: <name|n/a>]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   clean one-liner + analogy
U5 pseudocode present/≠py     4/10    2    gate   pseudocode is just python with comments - BLOCKER
DS2 operations table          9/10    1    gate   all ops have O(); space col present
DS8 comparison table          8/10    1    gate   table vs linked-list/hash; missing BST row - BLOCKER
CP cp-primitives              5/10    1    gate   Linear family → gated; only prefix-sum, needs ≥2 - BLOCKER
FB memory layout              9/10    2    gate   covers cache, resize cost, amortized argument
U17 real-world + at-scale     9/10   0.5   adv    real-world system named; at-scale failure stated
U18 cache behavior            9/10   0.5   adv    cache-friendly vs hostile contrast present
DS9 interviewer probes        8/10    1    adv    2 probes present; missing scale probe
DS9a amortized proof          5/10    2    cond   Linear family → gated; asserts O(1) amort. but no accounting argument - BLOCKER
U9 prerequisites format       9/10   0.5   adv    all prereqs have [Must read] + reason text
AL10 constraints & approach   n/a     -     -     (DS article - AL10 is algorithms/patterns only)
PA1 recognition signals       n/a     -     -     (not a pattern article)
V1 complexity re-derivation   9/10    2    gate   re-derived from pseudocode: T(n)=2T(n/2)+O(n) → O(n log n), matches claim
V2 pseudocode correctness     3/10    2    gate   traced on [3,1,4]: swap indices off-by-one on last pass - BLOCKER
V9 recursion stack honesty    9/10    2    gate   space stated O(log n) incl. call stack, matches recursion depth
V4 comparison table accuracy  8/10   0.5   adv    rival "hash table O(1) worst-case" checked - actually O(n) worst-case, minor
V12 cross-article consistency n/a     -     -     no sibling articles yet in this family - not checked
--------------------------------------------------------------------------------

GATE: NO-SHIP - 2 gated params below 9 (1 structural, 1 content verification).

BLOCKERS (gated, score ≤8 - fix before publish):
- U5: rewrite pseudocode in CLRS form (for i = 1 to n; ▷ comment; swap A[i] A[j])
- V2: fix off-by-one in the swap on the last pass - pseudocode produces wrong output on [3,1,4]

FIXES (ranked, highest-impact first = score-gain × weight):
1. ...
2. ...
```

Rules for the report:

- Every applicable param gets a row. **n/a** params still listed (as n/a) so the reader sees nothing was skipped silently. Any **n/a must carry a one-line justification** in NOTE (which param, why it doesn't apply) - an unjustified n/a is treated as a low score, never a free pass. This applies especially to U5.
- **GATE verdict** = SHIP only if every gated param scores ≥9; otherwise NO-SHIP. State it on the header line and again in the GATE line with the count.
- **NOTE** is one line for weight-0.5 and weight-1 params - what's there / what's missing, never vague. For **weight-2 gated params** (U5, FB, AL4, AL1, PA3, AL10, PA10, DS9a, V1, V2, V6, V9), allow **two lines max** when the fix requires specifying what exactly is missing (e.g. which accounting argument is absent, which CLRS element is wrong, or - for V-checks - the derivation/trace performed). Mark it `(2-line: weight-2)` at the end of the second line.
- **BLOCKERS** (gated ≤5) listed first in FIXES. Remaining FIXES ranked by **weight tier first** (weight-2 before weight-1 before weight-0.5), then by score gap within the tier (higher gap first). Do not compute `score-gain × weight` - use weight tier as the primary sort, it is deterministic and avoids LLM arithmetic errors.
- Fixes are concrete and actionable - name the section, the change, the form. "Add a recurrence → Master theorem step to the derivation", not "improve complexity".
- **V1–V14** (see [Content verification pass](#content-verification-pass-v-checks)) are always scored, in the same table as the structural params - never a separate block. A V1/V2/V6/V9 failure reads exactly like any other gated blocker, just tagged with its V-check ID so the reader can trace it back to the check that caught it.

---

## Batch audit (maintenance)

Run these after a batch of new articles to surface systemic advisory gaps across the vertical. These are not per-article checks - they identify portfolio-level patterns.

```bash
# DS articles missing ## What the interviewer probes for
grep -rL 'What the interviewer probes for' content/dsa/data-structures/*.md

# All articles missing at-scale / cache mentions (U17/U18) - rough signal only.
# content/dsa/data-structures/graph.md is a known, legitimate exception: U18 is
# advisory-for-Graph (per dsa-writer.md's DS7/U18 per-family table) and its cache
# story is often folded into DS8's comparison table instead of stated standalone -
# a hit here on graph.md is not automatically a gap, check DS8 before flagging it.
grep -rL 'at-scale\|cache-friendly\|cache-hostile\|cache miss\|real-world' \
  content/dsa/data-structures/*.md content/dsa/algorithms/*.md

# Algorithm articles missing ## Constraints & approach (AL10)
grep -rL 'Constraints & approach' content/dsa/algorithms/*.md

# Pattern articles missing ## First 30 seconds (PA9)
grep -rL 'First 30 seconds' content/dsa/patterns/*.md

# Articles with broken .md links (run from wiki-fe/)
./docs/_meta/ai-instructions/scripts/dsa-check.sh content/dsa/**/*.md
```

These don't gate any article individually - they help prioritize which advisory sections to add next across the board.
