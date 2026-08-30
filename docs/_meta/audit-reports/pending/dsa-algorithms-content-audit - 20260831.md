# DSA Algorithms Content Audit (wiki-fe)

**Date:** 2026-08-31
**Scope:** `content/dsa/algorithms/*.md` — 47 articles
**Rubric:** `docs/_meta/ai-instructions/dsa-writer.md` + `dsa-writer-algorithm.md` (rules), `dsa-rater.md` (scoring, gate, V-checks)
**Mode:** read-only critique; no content edits in this pass
**Method:** 5 chunks of 8–10 files, one `general-purpose` rater sub-agent per chunk, merged here. Deterministic pre-check via `scripts/dsa-check.sh` on every file.

---

## Executive summary

- **SHIP: 2** — `sorting.md` (95, hub), `maximum-flow.md` (91, hub).
- **NO-SHIP: 45** — of which **7 are unfilled skeletons** (score ≤7, entire article unwritten): `bellman-ford`, `bucket-sort`, `floyd-warshall`, `minimum-spanning-tree`, `quickselect`, `selection-sort`, `topological-sort`.
- **1 hub scored NO-SHIP on a technicality:** `number-theory.md` (90) — every gated hub param ≥9 except H1 at 8 (member list blurs extended-GCD / modular-inverse as unlisted quasi-members). A small fix.
- **The 37 specific articles that are written (32 of them) are strong:** mean **84.1/100**. None is weak writing. Every NO-SHIP among them is driven by a **small, repeating, mostly mechanical set of defects** — not by missing depth. 10 written specifics score ≥88 and are one or two fixes from SHIP.
- **Mean score:** all 47 = 72.5 (dragged by the 7 stubs); SHIP-only = 93.0; NO-SHIP excluding stubs = 84.2.
- **Hard correctness bugs found (V2/V14): 3** — `euclidean-gcd` (wrong Extended-Euclid worked trace), `bipartite-matching` (impossible worked example, matching of 3 on 2 right-nodes), `strongly-connected-components` (Practice #4 "Eventual Safe States" solution returns a wrong answer). Plus 2 factual prose errors: `modular-exponentiation` ("65537-bit public exponent"), `longest-increasing-subsequence` (reconstruction code labelled O(n log n), is O(n²)).

---

## Scoreboard

| Article | Score | Gate | Kind |
| --- | --- | --- | --- |
| sorting | 95 | SHIP | hub |
| maximum-flow | 91 | SHIP | hub |
| number-theory | 90 | NO-SHIP | hub |
| string-matching | 90 | NO-SHIP | specific |
| binary-search | 89 | NO-SHIP | specific |
| z-algorithm | 89 | NO-SHIP | specific |
| backtracking | 88 | NO-SHIP | specific |
| bfs | 88 | NO-SHIP | specific |
| bit-manipulation | 88 | NO-SHIP | specific |
| longest-common-subsequence | 88 | NO-SHIP | specific |
| manacher-algorithm | 88 | NO-SHIP | specific |
| recursion | 88 | NO-SHIP | specific |
| sieve-of-eratosthenes | 88 | NO-SHIP | specific |
| longest-increasing-subsequence | 87 | NO-SHIP | specific |
| quicksort | 87 | NO-SHIP | specific |
| aho-corasick | 86 | NO-SHIP | specific |
| insertion-sort | 86 | NO-SHIP | specific |
| lowest-common-ancestor | 86 | NO-SHIP | specific |
| big-o-notation | 85 | NO-SHIP | specific |
| greedy | 85 | NO-SHIP | specific |
| heapsort | 85 | NO-SHIP | specific |
| merge-sort | 85 | NO-SHIP | specific |
| radix-sort | 85 | NO-SHIP | specific |
| ford-fulkerson | 84 | NO-SHIP | specific |
| kadane | 84 | NO-SHIP | specific |
| string-hashing | 84 | NO-SHIP | specific |
| dinic | 83 | NO-SHIP | specific |
| edmonds-karp | 83 | NO-SHIP | specific |
| rabin-karp | 83 | NO-SHIP | specific |
| amortized-analysis | 82 | NO-SHIP | specific |
| bipartite-matching | 82 | NO-SHIP | specific |
| divide-and-conquer | 82 | NO-SHIP | specific |
| dynamic-programming | 82 | NO-SHIP | specific |
| dijkstra | 81 | NO-SHIP | specific |
| dfs | 80 | NO-SHIP | specific |
| modular-exponentiation | 80 | NO-SHIP | specific |
| strongly-connected-components | 79 | NO-SHIP | specific |
| counting-sort | 78 | NO-SHIP | specific |
| modular-arithmetic | 76 | NO-SHIP | specific |
| euclidean-gcd | 66 | NO-SHIP | specific |
| bellman-ford | 7 | NO-SHIP | stub (unfilled skeleton) |
| bucket-sort | 7 | NO-SHIP | stub (unfilled skeleton) |
| topological-sort | 4 | NO-SHIP | stub (unfilled skeleton) |
| floyd-warshall | 3 | NO-SHIP | stub (unfilled skeleton) |
| minimum-spanning-tree | 0 | NO-SHIP | stub (unfilled skeleton) |
| quickselect | 0 | NO-SHIP | stub (unfilled skeleton) |
| selection-sort | 0 | NO-SHIP | stub (unfilled skeleton) |

---

## SHIP list

| Article | Score | Note |
| --- | --- | --- |
| sorting | 95 | Consolidated hub. Every gated hub param ≥9. One stale sentence ("each name above becomes a link as its page lands" — all links already resolve). |
| maximum-flow | 91 | Consolidated hub. Every gated hub param ≥9. One bare code fence (U21, advisory). |

---

## Systemic findings (P0 → P3)

### P0 — Unpublishable / empty inventory

**Seven `content/dsa/algorithms/*.md` files are the verbatim unfilled skeleton** — the template header comment (`Algorithms skeleton. Copy to ... and fill`) is still present, every section body is an empty HTML comment, and the family heading is the literal `## <Family heading>` placeholder. They are registered in `index.md` (do not re-add rows on fill).

| File | Family it needs | Note |
| --- | --- | --- |
| `bellman-ford.md` | Traversal (`## Graph/tree assumptions`) | V−1 relax passes, negative-cycle detection via V-th pass, O(VE), vs-Dijkstra, SPFA |
| `bucket-sort.md` | Distribution (`## Key & distribution`) | scatter → sort-each-bucket → concat; O(n) expected under uniformity, O(n²) adversarial clustering |
| `floyd-warshall.md` | Traversal (DP-over-intermediate-vertices; flag the tension in a Family note) | `dist[k][i][j]` recurrence, O(V³), negative-cycle via `dist[i][i]<0`, transitive closure |
| `minimum-spanning-tree.md` | Traversal; **also fix U8** — H1 "Minimum Spanning Tree (Kruskal / Prim)" slug ≠ filename | cut property, Kruskal vs Prim vs Borůvka; likely wants hub + member pages |
| `quickselect.md` | Search/divide (`## Loop/recurrence invariant`) | `T(n)=T(n/2)+O(n)→O(n)`, worst O(n²), median-of-medians. Note: `quicksort.md` already carries a full quickselect worked problem — decide the article boundary |
| `selection-sort.md` | no-clean-fit → nearest family + `> Family note` | sorted-prefix invariant, Θ(n²) compares, Θ(n) swaps, not adaptive/stable |
| `topological-sort.md` | Traversal (`## Graph/tree assumptions`) | Kahn's BFS vs DFS post-order, the "all prerequisites emitted" invariant, O(V+E), cycle → no order |

**Action:** each is a full authoring task (`dsa-writer-algorithm.md`), not an edit. These 7 are the single biggest content gap in the vertical.

### P1 — Recurring gate failures across otherwise-strong articles

1. **U21 bare code fences — universal (all 40 written files fail, or pass only vacuously).** Every article opens its CLRS pseudocode blocks and its ASCII trace/diagram blocks with a bare ` ``` ` instead of ` ```text `. `dsa-check.sh` names the exact block numbers per file. U21 is advisory-weight so it never independently gates — but it is a 100% hit rate and a one-pass mechanical fix. For `binary-search.md` it is the **only** thing between the article and SHIP; for `bit-manipulation.md`, `backtracking.md`, `bfs.md` it is one of two.

2. **U22 practice-title technique leak — ~12 articles, BLOCKER on ~6.** Recurring shape: `### N. Problem Name — <solving technique>` in the practice-problem heading itself (e.g. "Kth Largest Element — partial heapsort", "Maximum Gap — radix sort then scan", "Longest duplicate substring — binary search + rolling hash", "Kth Ancestor — _binary lifting_"). This is **not** the `Technique: **X**` label the batch-audit grep catches — it's a prose-shaped leak in the H3 heading. Caps U22 at 5 → NO-SHIP on `quicksort`, `radix-sort`, `heapsort`, `insertion-sort`, `merge-sort`, `lowest-common-ancestor`. Milder versions (score 6–7, not capped) on `rabin-karp`, `modular-exponentiation`, `modular-arithmetic`, `recursion`, `dynamic-programming`, `divide-and-conquer`, `counting-sort`, `dinic`, `euclidean-gcd`, `z-algorithm`, `longest-increasing-subsequence`. Uniform fix: title names the problem only; the technique/shape moves to the first line of Approach. (Judgment note for the human: for an article *dedicated* to one technique, Problem 1 is often "Sort an Array — <this article's algorithm>", which is arguably a disambiguator not a spoiler. Problems 2–4 genuinely spoil real puzzles. If the U22 cap is meant to be read leniently for the dedicated-technique case, several of these clear.)

3. **U25 duplicate-problems gated floor missed or thin — ~10 articles, BLOCKER on ~4.** Zero `**Duplicate problems:**` lines anywhere (caps at 5, BLOCKER): `radix-sort`, `heapsort`, `string-matching`, `z-algorithm`. Exactly one line (floor met, sits at 6, far below the advisory ceiling): `insertion-sort`, `merge-sort`, `quicksort` (3 of 4). The max-flow family (`dinic`, `edmonds-karp`, `ford-fulkerson`) and `euclidean-gcd` list **generic categories** ("any max edge-disjoint paths problem", "Job Assignment / Task-Worker") instead of named LC/CSES problems with a one-sentence shared-mechanic note. Several "duplicates" are self-contradictory — flagged in the article's own text as *not* actually duplicates (`euclidean-gcd` #1, `dijkstra` #1/#3, `longest-increasing-subsequence` #2). That's a V10 relevance miss too.

4. **U5 / AL7 pseudocode quality is bimodal — 3 articles gate on it.** Most articles have genuine CLRS-form pseudocode with `▷` comments (9s). Three fall to 6–8 on a gated param: `greedy` (no `▷` comments, too terse — "sort activities by finish time" hides the mechanism), `kadane` (trailing colons, Python-shaped `if n == 0: / return 0`), `heapsort` (Python-style colons in MAX-HEAPIFY conditionals). `amortized-analysis` is worse — its "pseudocode" is a near-Python `for i = 1 to size` assert loop (`CREDIT-INVARIANT-CHECK`), capping U5 at 5. `divide-and-conquer` uses `function` headers and angle-bracket tuple returns. All are quick de-Python passes.

5. **Forced-family-fit `> Family note` applied inconsistently.** Correctly present: `heapsort`, `insertion-sort`, `kadane`, `manacher`, `string-matching`, `z-algorithm`, `modular-arithmetic`, `amortized-analysis`, `big-o-notation`, `aho-corasick`, `recursion` context. **Missing where required:** `rabin-karp` (repurposes `## Loop/recurrence invariant` but isn't Search/divide — no note), `string-hashing` (identical repurposed heading, no note — this is its **single gate failure**, FB capped at 6), `euclidean-gcd` (only a parenthetical "(Family: Recursive/build.)", not a flagged stretch). The writer requires the blockquote for any forced fit.

### P2 — Interview-prep portfolio gaps (advisory but systemic)

1. **U18 cache-behavior one-liner omitted on the string / concept articles.** `string-hashing` (5), `string-matching` (6), `z-algorithm` (6), `divide-and-conquer` (7), `binary-search` (7), `dynamic-programming` (6). Authors treat U18 as optional for algorithm articles even where the memory access pattern (sequential array scan vs pointer-chasing) is worth one sentence.

2. **TOC missing `Prerequisites` / `Table of Contents` self-entries — ~11 articles.** `aho-corasick`, `amortized-analysis`, `backtracking`, `bfs`, `bipartite-matching`, `bit-manipulation`, `greedy`, `kadane`, `longest-common-subsequence`, `longest-increasing-subsequence`, `manacher`. Drags U7 to 8 (gated) on several. `big-o-notation`, `binary-search`, `heapsort`, `insertion-sort`, `lowest-common-ancestor`, `merge-sort` get it right.

3. **Prerequisites: list-bullet marker dropped (render bug) — 5 articles.** `bfs`, `bipartite-matching`, `dijkstra`, `dinic`, `edmonds-karp`, `ford-fulkerson` (the graph/flow cluster) write prerequisite lines with no leading `- `, so the app renders them as one run-together paragraph. Real user-visible defect. Looks template-inherited across the cluster.

4. **Prerequisites: over-tiering / wrong dependencies — ~6 articles.** `bit-manipulation` lists Dynamic Programming as `[Must read]` — backwards (bitmask DP consumes bit manipulation). `lowest-common-ancestor` marks DP `[Must read]` (the `up[][]` recurrence is elementary). `kadane` marks Prefix Sum `[Must read]` (used only as a contrast). `dynamic-programming` has an untiered "DP Patterns" prereq. `euclidean-gcd` marks Number Theory + Modular Exponentiation `[Must read]` (re-explains Bézout/inverse itself). `greedy` has untiered Heap/Merge-Intervals.

5. **U20 misconceptions written as gotchas, not wrong-mental-model bullets — ~8 articles.** `circular-buffer`-style: the edge-case list carries the trap, but there's no dedicated "false belief a candidate holds" bullet. `recursion` and `dijkstra` do this well; `quicksort`, `radix-sort`, `dfs`, `divide-and-conquer` don't.

6. **Circular `[Must read]` prerequisites** between `modular-arithmetic` ↔ `number-theory` and (one-directional, OK) `modular-exponentiation` → `modular-arithmetic`. The two `modular-*` articles also **heavily duplicate each other** (same modpow trace, same loop invariant, same Fermat inverse, same matrix-expo Fibonacci, same nCr-mod-p practice problem). A human should decide the scope split.

### P3 — Coverage / polish

1. **Draft-polish leaked into published prose.** `strongly-connected-components` — the Kosaraju Pass-2 trace (lines ~68–73) contains abandoned self-correcting reasoning ("3 and 4 not yet visited? ... Let's be precise."). `ford-fulkerson` — practice-problem #3 title is near-incoherent leftover editing scaffolding ("Min-Cost to Connect All Points... (not flow) → use instead: Circulation with Lower Bounds..."). `topological-sort` still carries the "Delete every HTML comment before publishing" template header.

2. **Worked examples that trail off.** `manacher` — the "babad" trace stops at "...continuing the scan finds" instead of carrying every `P[i]` to the final read-off (AL2 → 8, blocker). `string-hashing` — the "abcab" trace is schematic (`H[i]=hash("...")` labels, no numeric values), so nothing is checkable (AL2 → 8).

3. **Invented / unanchored duplicate-problem entries.** `manacher` ("Longest Palindromic Substring II", "Count within a length range" — no LC numbers). `sieve` lists "Four Divisors LC 1390" twice.

4. **Practice-problem topical drift.** `strongly-connected-components` fills 2 of 4 practice slots with undirected connected-components / DSU problems (Number of Provinces, Largest Component by Common Factor) that aren't SCC problems. `radix-sort` — practice #2/#3 are thin re-applications of #1; #4 is self-admittedly not a radix sort. `dijkstra` — practice #3's solution is Bellman-Ford, not Dijkstra.

5. **Runnable-solution gaps.** `aho-corasick` has only 2 worked practice problems (need ≥3). `bipartite-matching` has 3 but #3 is `raise NotImplementedError` and #1/#2 are one-line wrappers.

6. **V6 invariant proofs asserted-with-intuition rather than base+step** on the flow articles (`edmonds-karp` monotone-distance lemma, `dinic` strict-distance-increase, `strongly-connected-components` Kosaraju/Tarjan). The counting arguments built on top are rigorous; the lemmas underneath are hand-waved.

---

## Content-backlog candidates

One row per article that needs work. Priority: **p0** unfilled skeletons, **p1** correctness bugs + capped-gate blockers on strong articles, **p2** near-SHIP mechanical fixes, **p3** advisory polish.

| Priority | Article | Fix type | Blocker summary |
| --- | --- | --- | --- |
| p0 | bellman-ford.md | new-article | Unfilled skeleton. Write full Traversal-family article (V−1 relax, negative-cycle detection, O(VE), vs-Dijkstra, SPFA). |
| p0 | bucket-sort.md | new-article | Unfilled skeleton. Write full Distribution-family article (scatter/sort/concat, O(n) expected, O(n²) adversarial). |
| p0 | floyd-warshall.md | new-article | Unfilled skeleton. Write full article (DP-over-intermediate-vertices recurrence, O(V³), negative-cycle, transitive closure). |
| p0 | minimum-spanning-tree.md | new-article | Unfilled skeleton **+ U8 filename mismatch** (H1 slug ≠ file). Write Kruskal/Prim/Borůvka; consider hub + members. |
| p0 | quickselect.md | new-article | Unfilled skeleton. Write Search/divide article; decide boundary vs quicksort.md's existing quickselect problem. |
| p0 | selection-sort.md | new-article | Unfilled skeleton. Write no-clean-fit article with `> Family note` (sorted-prefix invariant, Θ(n²), Θ(n) swaps). |
| p0 | topological-sort.md | new-article | Unfilled skeleton. Write Traversal article (Kahn's vs DFS post-order, O(V+E), cycle handling). |
| p1 | euclidean-gcd.md | fix-gate | Extended-Euclid worked trace is arithmetically wrong (derives 6 = 3·48 − 8·18 = 0; correct x=−1, y=3). Fix trace + ASCII block + diagram; add `> Family note`; fix U22 title #3; U21. |
| p1 | bipartite-matching.md | fix-gate | Practice #1 Example 1 impossible (matching 3 with 2 right-nodes; explanation invents a node). Practice #3 is `raise NotImplementedError`. Fix example; make #3 runnable; U9 bullet render; TOC `&amp;amp;`. |
| p1 | strongly-connected-components.md | fix-gate | Practice #4 "Eventual Safe States" solution wrong (unordered single-pass safe-SCC propagation; returns `[0]` on `0→1→2→3→3`). Fix to fixpoint / reverse-topo. Delete draft-leak lines 68–73. U21 (7 fences). Swap 2 undirected-CC practice problems. |
| p1 | number-theory.md | fix-gate | Hub, 90/100. H1 at 8 — member list blurs extended-GCD / modular-inverse as unlisted quasi-members. Tighten to 3 clean linked entries. Break circular prereq with modular-arithmetic. U21 (1 fence). |
| p1 | heapsort.md | fix-gate | U22 (all 4 practice titles name the technique — capped) + U25 (zero duplicate-problems lines — capped) + U5 (Python-style colons in MAX-HEAPIFY). U21. |
| p1 | radix-sort.md | fix-gate | U22 (all 4 titles capped) + U25 (zero duplicate-problems lines — capped). U5 undefined `digit(x,i,b)` helper. AL9 needs per-row "when the rival wins". U21. |
| p1 | string-matching.md | fix-gate | U25 (zero duplicate-problems lines — capped at 3). U6 (all 4 entries missing the duplicate component). U7 blank line before TOC. U21. |
| p1 | z-algorithm.md | fix-gate | U25 (zero duplicate-problems lines — capped at 3). U6 (entries 1/3/4 missing Worked-examples block). U22 (2 titles leak). U7 blank line. U21. |
| p2 | quicksort.md | fix-gate | U22 (all 4 practice titles name the technique — capped at 4). Add duplicate-problems line to #1. `find_kth_largest` needs a `lo>hi` return guard. U21 (3 fences). |
| p2 | merge-sort.md | fix-gate | U22 (3 practice titles capped at 5). U25 (only 1 duplicate-problems line). U21 (3 fences). |
| p2 | insertion-sort.md | fix-gate | U22 (all 4 practice titles capped at 5). U25 (only 1 line). Wrap module-scope online-stream snippet in a function. U21. |
| p2 | lowest-common-ancestor.md | fix-gate | U22 (all 3 practice titles carry an italic technique suffix — capped). Demote DP prereq to `[Should read]`. Label V6 invariant base case. U21 (5 fences). |
| p2 | longest-increasing-subsequence.md | fix-gate | V2 — `lis_sequence` reconstruction is O(n²) but docstring claims O(n log n); fix code or label. Remove LC646 from #2's duplicate list (article's own #3 argues it's a different mechanic). AL9 LIS-as-LCS row is filler. U22 #2 title. U21. TOC self-entries. |
| p2 | manacher-algorithm.md | fix-gate | AL2 — carry the "babad" trace to completion (all `P[i]`, final read-off). U25 — swap invented duplicate entries for real LC problems. Add a 4th probe on the amortized argument. U21. TOC self-entries. |
| p2 | greedy.md | fix-gate | U5/AL7 — rewrite GREEDY-ACTIVITY-SELECT with `▷` comments, explicit sort key. AL9 per-row crossover. U25 line on #3. U21. Tier Heap/Merge-Intervals prereqs. TOC self-entries. |
| p2 | kadane.md | fix-gate | U5/AL7 — de-Python the pseudocode (drop trailing colons, `if n == 0: / return 0`). Trim AL10 filler rows. AL9 "never" rows need real crossover. Demote Prefix Sum prereq. U21 (5 fences). TOC self-entry. |
| p2 | dfs.md | fix-gate | U6 — add a 4th worked problem exercising a distinct DFS technique; normalise "### Problem N —" to "### N.". U9 bullet render. TOC self-entries. U20 misconception bullets. U21 (8 fences). |
| p2 | dijkstra.md | fix-gate | U25 — fix muddled duplicate-problems lists (Path With Minimum Effort is minimax-Dijkstra, misfiled under the stops-constrained problem). Make #3 an actual modified-Dijkstra or frame the Bellman-Ford fallback explicitly. U9 bullet render. U21. |
| p2 | backtracking.md | fix-gate | U5 — the generic `backtrack(state)` recurrence block reads as pasteable Python. Add TOC self-entries. Tier the "Subsets & Permutations" prereq. U21 (2 fences). |
| p2 | bfs.md | fix-gate | U9 — add `- ` bullet markers to the two Prerequisites lines (render bug). TOC self-entries. Fix double blank line before Word Ladder's duplicate list. U20 misconception bullet. U21 (5 fences). |
| p2 | binary-search.md | fix-gate | **U21 is the only blocker** — tag the 3 bare fences. U18 cache one-liner. U20 "needs a sorted array" misconception bullet. |
| p2 | bit-manipulation.md | fix-gate | TOC self-entries (sole structural blocker). Fix backwards prereqs — DP/D&C are downstream, not prerequisites; use Big-O / binary-representation. U21 (7 fences). Swap one bitmask-DP practice problem for a non-DP bit problem. |
| p2 | recursion.md | fix-gate | U5/AL7 — FACTORIAL pseudocode thin; add a branching (backtracking) skeleton. Practice #1 `fib_memo(n, memo={})` models a mutable-default anti-pattern silently. U22 #3 title. U21 (5 fences). Drop Array from prereqs. |
| p2 | sieve-of-eratosthenes.md | fix-gate | U5 — the single marking loop reads thin for a weight-2 gated param; note the omitted-as-trivial init/return or add the helper. U7/U21 — tag 5 bare fences. Drop the duplicate "Four Divisors" mention. |
| p2 | string-hashing.md | fix-gate | FB — add the `> Family note` blockquote flagging the repurposed `## Loop/recurrence invariant` heading (this is the single gate failure). Put numeric values in the "abcab" trace. U7/U21. U18 one-liner. |
| p2 | aho-corasick.md | fix-gate | U6 — add a 3rd worked practice problem (Stream of Characters as a full entry). FB — tighten the Traversal block to read as traversal-state, not construction-ordering. U21 (6 fences). |
| p2 | modular-exponentiation.md | fix-gate | U6 — only 2 worked problems (need ≥3). V14 — "65537-bit public exponent" is wrong (65537 is the value, ~17 bits). U22 #2 title names Fermat/modular-inverse. U21 (10 fences). |
| p3 | modular-arithmetic.md | fix-gate | U5/AL1/AL4/FB/V9 — state the O(log m) call-stack term for recursive `extended_gcd`; make the bit-manipulation FB connection concrete. Concrete outputs in worked Example 2s. Fix Wilson's-theorem misattribution (AL8). Drop Binary Search prereq; break circular prereq with number-theory. U21 (12 fences). |
| p3 | dynamic-programming.md | fix-gate | U22 — strip the shape parenthetical from all 4 practice titles. U9 — tier the "DP Patterns" prereq. Demote Backtracking prereq. U18 cache one-liner. U20 misconception bullets. U21 (1 fence). |
| p3 | divide-and-conquer.md | fix-gate | U5/AL7 — CLRS-ify the generic skeleton (drop `function`, tuple-return syntax). AL2/V7 — mermaid call tree must trace `[3,1,2]`, not generic nodes. U22 — 2 titles name the technique. U2 — commit to a headline complexity. Move skeleton out of the `python` fence. U21 (5 fences). U14 opening restates the skeleton. |
| p3 | dinic.md | fix-gate | V9 — name the blocking-flow DFS recursion-stack term (O(V)). U22 #3 title ("via Vertex-Splitting"). U25 — named CSES/LC duplicates, not generic categories. U9 bullet render. U21 (2 fences). |
| p3 | edmonds-karp.md | fix-gate | V6 — give the monotone-distance lemma an actual base + inductive step. U25 — named duplicates. U9 bullet render. U18 one-liner. U21 (2 fences). |
| p3 | ford-fulkerson.md | fix-gate | U6/U22 — rewrite the practice-problem titles (#3 is near-incoherent editing scaffolding). U25 — named duplicates. U9 bullet render. U18 one-liner. U21 (2 fences). |
| p3 | counting-sort.md | fix-gate | AL1 — deepen the intuition (decision-tree-height argument tied to k=O(n) break-even). V6 — tighten the invariant maintenance step. U22 — rename 4 practice titles. U18 cache sentence. U20 misconception bullets. U21 (5 fences). |
| p3 | amortized-analysis.md | fix-gate | U5/AL7 — replace the near-Python `CREDIT-INVARIANT-CHECK` with real CLRS or a justified n/a. AL2 — add a real diagram (cost-spike bar chart or credit-banking mermaid). FB — the Recursive/build fit is a stretch even flagged; consider a `## Key insight` block instead. U2 explicit line. U21 (3 fences). |
| p3 | big-o-notation.md | fix-gate | AL2 — "How it works" needs a real diagram (move the recursion tree here, or a growth-curve chart with a marked crossover). FB/U5/V6 — reframe AL3/V6 as "the invariant is the O(·) inequality itself". U2 — n/a justification. U21 (6 fences). Duplicate-problems line on #2. |

---

## Portfolio signals (pre-rate, mechanical)

- **Filesystem check (`dsa-check.sh`) across all 47:** U8, U11, U12 **PASS on all** except `minimum-spanning-tree.md` (U8 FAIL — H1 "Minimum Spanning Tree (Kruskal / Prim)" → slug `minimum-spanning-tree-kruskal-prim` ≠ filename). U21 **FAIL on every written file** (2–12 bare fences each); PASS only on the 7 skeletons (vacuous — no code) plus `floyd-warshall` (no code).
- **Unfilled-skeleton markers found:** 7 files still contain `Algorithms skeleton. Copy to ...` and `## <Family heading>` (listed in P0).
- **Hub markers (`> **Hub article.**`) found:** 3 — `sorting.md`, `maximum-flow.md`, `number-theory.md`. All correctly placed after the TOC. Scored on the hub rubric.
- **`## Constraints & approach` (AL10) present:** all 32 written specific articles. Consistently strong — `recursion`'s is the standout ("input size determines feasibility of the recursion itself"). Not a portfolio risk.
- **`**Duplicate problems:**` line count per file (P1.3):** 0 on `radix-sort`, `heapsort`, `string-matching`, `z-algorithm`; 1 on `insertion-sort`, `merge-sort`; ≥3 on the rest.
- **`Technique: **X**` literal-label leak (U22 grep):** none found — every U22 leak in this batch is prose-shaped in the H3 heading (P1.2).
- **V2 hand-trace results:** every practice-problem solution and worked-example trace across all 32 written articles hand-traces to the correct output **except 3** — `bipartite-matching` #1 example, `strongly-connected-components` #4 solution, `longest-increasing-subsequence` reconstruction-code complexity label. Plus `euclidean-gcd`'s Extended-Euclid teaching trace (code is correct, the hand-worked illustration is not).
- **Cross-article consistency (V12):** the max-flow trio (`dinic` / `edmonds-karp` / `ford-fulkerson`) is internally consistent — same worked network, same answer (13), consistent E-vs-V crossover, consistent O(E√V) unit-capacity framing. `string-matching` ↔ `z-algorithm` deliberately cross-reference the Z↔π duality and agree. `sorting` / `quicksort` / `merge-sort` / `heapsort` comparison rows agree. The `modular-arithmetic` ↔ `modular-exponentiation` overlap is the one flagged concern (P2.6).

---

## Per-article ratings (appendix)

Full score tables for all 47 articles were produced by the 5 chunk rater sub-agents. They are large; the digest above (systemic findings + per-article backlog candidates) is what a human reads first. The raw per-article tables follow the `dsa-rater.md` Output-format spec (PARAM / SCORE / W / GATE / NOTE rows, gate verdict, blockers-first, ranked fixes) and are retained in the audit run transcript. Key per-article notes are folded into the **Content-backlog candidates** table above — every article that needs work has a row there with its concrete blocker summary.

### Highest-quality written specifics (≥88, one or two fixes from SHIP)

`string-matching` (90), `binary-search` (89), `z-algorithm` (89), `backtracking` (88), `bfs` (88), `bit-manipulation` (88), `longest-common-subsequence` (88), `manacher-algorithm` (88), `recursion` (88), `sieve-of-eratosthenes` (88).

`binary-search` is the closest to SHIP in the entire batch — U21 (3 bare fences) is its only blocker.

### Lowest written specifics

`euclidean-gcd` (66) — wrong worked trace, forced-family-fit not flagged, 8 gated params <9. `modular-arithmetic` (76) — 12 U21 fences, recursive-stack term omitted, heavy overlap with `modular-exponentiation`. `counting-sort` (78) — AL1 restates rather than deepens, U18/U20 gaps. `strongly-connected-components` (79) — Practice #4 correctness bug + draft-leak prose. `dfs` (80) / `modular-exponentiation` (80) — U6 practice-count / 3rd-problem gaps.
