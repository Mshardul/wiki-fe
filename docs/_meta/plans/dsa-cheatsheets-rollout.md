# DSA Cheatsheets Rollout

Tracking doc for `content/dsa/cheatsheets/*.md` generation. Format rules: `docs/_meta/ai-instructions/dsa-cheatsheets.md`.

Cheatsheets are **cross-cutting decisions/comparisons**, not per-topic summaries. A topic can appear as a row in more than one sheet - no dedup across files.

Status: `[ ]` not started, `[x]` done.

---

## Phase 1 - all shipped 2026-07-25

- [x] `complexity-master.md` - every DS + algorithm, Big-O side by side, one page
- [x] `sorting-comparison.md` - all sort algorithms: stable/in-place/time-best-avg-worst/when-to-pick
- [x] `graph-algorithms-decision.md` - BFS/DFS/SCC/max-flow family only for now - Dijkstra/Bellman-Ford/Floyd-Warshall/MST/Topo-Sort rows added but HTML-commented out (their companion articles are still empty templates); uncomment once those are written
- [x] `dp-recognition.md` - problem shape -> DP state signature -> transition shape, across DP patterns, no code
- [x] `data-structure-selection.md` - "need fast X+Y" -> which structure, cross-structure merged comparison
- [x] `input-size-complexity-lookup.md` - n -> feasible Big-O -> which algorithms qualify
- [x] `string-algorithm-decision.md` - KMP vs Z vs Rabin-Karp vs Manacher vs Aho-Corasick, which for which string task
- [x] `two-pointers-vs-window-vs-prefix-sum.md` - disambiguator between the three commonly-confused patterns
- [x] `patterns/pattern-selection-cheatsheet.md` - filled in place (NOT in cheatsheets/ folder) - trigger phrase -> pattern; only the 14 filled patterns included, 6 unfilled pattern articles (cyclic-sort, merge-intervals, subsets-permutations, top-k-elements, tree-graph-traversal, dp-patterns) HTML-commented, add once written
- [x] `complexity-growth-reference.md` - growth-curve Mermaid diagram + table, at real n values (format exception per instructions file)
- [x] `greedy-vs-dp-disambiguator.md` - exchange argument vs overlapping subproblems, coin-change counterexample
- [x] `backtracking-shapes.md` - subset/permutation/combination/partition loop shapes; subsets-permutations.md link commented out (still an empty template) - uncomment once written
- [x] `bit-manipulation-tricks.md` - isolate lowest set bit, XOR swap, popcount, subset enumeration, power-of-two check
- [x] `number-theory-reference.md` - GCD/LCM, modular arithmetic, primality checks, fast exponentiation formulas

Scope note: a cheatsheet can cover ONE topic, a pair, or many - whatever the decision genuinely needs. Not forced multi-topic.

### Known gaps to close later (unfilled companion articles blocking full rows)

- `algorithms/dijkstra.md`, `bellman-ford.md`, `floyd-warshall.md`, `minimum-spanning-tree.md`, `topological-sort.md` - all empty templates; rows prepped and commented in `graph-algorithms-decision.md` and `complexity-master.md`
- `patterns/cyclic-sort.md`, `merge-intervals.md`, `subsets-permutations.md`, `top-k-elements.md`, `tree-graph-traversal.md`, `dp-patterns.md` - all empty templates; referenced/commented in `pattern-selection-cheatsheet.md` and `backtracking-shapes.md`
- `data-structures/hash-set.md`, `segment-tree.md` - empty templates, not yet referenced in any cheatsheet row (no sheet needed them directly)

When any of the above gets written, search the cheatsheets folder for its filename in an HTML comment and uncomment.

---

## Phase 2/3 - Deferred

Ideas raised but not accepted for phase 1 (parking, not rejected forever): recursion-vs-iteration tradeoff, in-place-vs-extra-space tradeoff, divide-and-conquer-vs-DP disambiguator, union-find-vs-graph-traversal-for-connectivity, binary-search-variants disambiguator, tree-traversal-variant decision (recursive/iterative/Morris), interview complexity red-flags gut-check, space-time tradeoff (memoization vs tabulation), hashing pitfalls, two-sum-family decision, interval-problems decision, matrix/grid-traversal decision, sliding-window-variant reference, linked-list trick reference, off-by-one/boundary-bug reference, string/array in-place manipulation tricks, graph representation decision, heap-vs-sort-vs-quickselect for top-K, problem-name-to-technique reverse index, recursion-recurrence-to-Big-O table. Revisit after Phase 1 ships and format is proven.
