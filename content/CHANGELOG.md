# Content Changelog

All notable changes to wiki articles. Filter by filename to track updates to a specific article.

## Format

```
## YYYY-MM-DD
- `filename.md` - what changed (new article / new section: "Section Name" / expanded: "Section Name" / new stub: "Topic")
```

## 2026-07-31
- `dsa/data-structures/array.md`, `avl-tree.md`, `b-plus-tree.md`, `b-tree.md`, `binary-search-tree.md`, `binary-tree.md`, `bloom-filter.md`, `deque.md`, `fenwick-tree.md`, `graph.md`, `hash-table.md`, `heap.md`, `interval-tree.md`, `lfu-cache.md`, `linked-list.md`, `lru-cache.md`, `queue.md`, `red-black-tree.md`, `skip-list.md`, `stack.md`, `string.md`, `suffix-tree.md`, `treap.md`, `trie.md`, `union-find.md` - expanded: "Practice problems" - retrofitted worked examples (Input/Output/Explanation) and standalone Constraints line per entry per the merged dedup spec; resolved 2 cross-file exact duplicates (Subarray Sum Equals K kept in hash-table.md only, Find the Duplicate Number relocated from array.md to a linked-list.md duplicate-problems line); dropped 1 fake-distinct entry (avl-tree.md's Count rotations) and 1 near-duplicate (lfu-cache.md's Sort Characters By Frequency); fixed 3 topic-fit misses by dropping non-representative entries and adding genuine replacements (lru-cache.md, interval-tree.md, b-plus-tree.md); added coverage-gap entries exercising previously-unexercised canonical techniques (avl-tree.md delete-with-rebalance, binary-search-tree.md two-child delete, b-tree.md insert-with-node-split, b-plus-tree.md insert-with-leaf-split, graph.md and heap.md Dijkstra/weighted-shortest-path); fixed union-find.md's duplicate-problems formatting to one-bullet-per-line; added missing duplicate-problems lines across 8 files found in a post-fix verification pass
- `dsa/data-structures/suffix-array.md` - expanded: "Practice problems" - retrofitted worked examples and standalone Constraints line on all 3 entries, fixed period-style labels to colon-form; file was mislabeled as an unwritten stub in the dedup plan and missed the main DS sweep, caught and fixed separately
- `dsa/data-structures/dynamic-array.md` - new section: "Practice problems" - 7 entries (grow-and-shrink from-scratch implementation, O(1) index removal via swap-and-pop, amortized copy-count walkthrough, growth-factor comparison, plus 3 problems migrated and reformatted from a legacy, mis-filed block under "Gotchas / edge cases": Insert Delete GetRandom O(1), Min Stack, Implement Queue using Stacks)
- `dsa/algorithms/aho-corasick.md`, `backtracking.md`, `bfs.md`, `binary-search.md`, `bipartite-matching.md`, `bit-manipulation.md`, `counting-sort.md`, `dfs.md`, `dijkstra.md`, `dinic.md`, `divide-and-conquer.md`, `dynamic-programming.md`, `edmonds-karp.md`, `euclidean-gcd.md`, `ford-fulkerson.md`, `greedy.md`, `heapsort.md`, `insertion-sort.md`, `kadane.md`, `longest-common-subsequence.md`, `longest-increasing-subsequence.md`, `lowest-common-ancestor.md`, `manacher-algorithm.md`, `merge-sort.md`, `modular-arithmetic.md`, `modular-exponentiation.md`, `quicksort.md`, `rabin-karp.md`, `radix-sort.md`, `recursion.md`, `sieve-of-eratosthenes.md`, `string-hashing.md`, `string-matching.md`, `strongly-connected-components.md` - expanded: "Practice problems" - retrofitted worked examples (Input/Output/Explanation) and standalone Constraints line per entry per the merged dedup spec; resolved distinct-technique violations (collapsed near-duplicate entries in aho-corasick, merge-sort, modular-arithmetic, modular-exponentiation into a single full entry + duplicate-problems line); reformatted greedy.md from prose into the standard entry structure; added new entries to dinic.md (vertex-disjoint paths via vertex-splitting, replacing a cross-file duplicate with bipartite-matching.md), manacher-algorithm.md (Palindrome Partitioning II), and sieve-of-eratosthenes.md (linear-sieve omega-count)
- `dsa/patterns/two-pointers.md`, `sliding-window.md`, `fast-slow-pointers.md`, `in-place-reversal.md`, `merge-intervals.md`, `matrix-traversal.md`, `tree-graph-traversal.md`, `prefix-sum.md`, `difference-array.md`, `monotonic-stack.md`, `monotonic-queue.md`, `k-way-merge.md`, `top-k-elements.md`, `two-heaps.md`, `binary-search-on-answer.md`, `modified-binary-search.md`, `frequency-array.md`, `backtracking.md`, `graph-coloring.md`, `interval-dp.md`, `bitmask-dp.md`, `meet-in-the-middle.md`, `state-machine-dp.md` - expanded: "Practice problems" - merged the legacy `## Worked problems` + `## Practice problems` sections into one, per-file distinct-technique problem selection (worked examples, constraints, full solution, complexity, duplicate-problems line per entry)
- `dsa/patterns/top-k-elements.md` - new article: size-k heap over a stream, min-heap-for-k-largest inversion, quickselect/two-heaps/k-way-merge disambiguation
- `dsa/data-structures/treap.md` - new article: BST + randomized heap-priority balancing, split/merge primitives, implicit-treap CP variant
- `dsa/data-structures/suffix-tree.md` - new article: compressed suffix trie, Ukkonen's O(n) construction via suffix links, generalized suffix tree for multi-string LCS
- `dsa/data-structures/suffix-array.md` deleted, merged into `suffix-tree.md` as a new section: "Suffix array (array-based variant)" - prefix-doubling construction, Kasai's LCP array, and when the array beats the tree (memory footprint, cache-friendliness, simplicity); article consolidated to remove practice-problem duplication (all 3 of suffix-array's Practice Problems entries mirrored suffix-tree's 3 entries solving the same named problems via a different structure) - the array-based LCP techniques were folded into suffix-tree's existing 3 worked entries as "the array alternative" rather than dropped; suffix-array's CP-primitive (LCP array for pattern counting) folded into suffix-tree's CP-primitives section; fixed two pre-existing bugs surfaced while verifying the moved code (count-distinct-substrings formula was off by `n+1`, k-string LCS leaf-index lookup crashed on the tree's own sentinel leaf); repointed all referring articles (`string.md`, `string-hashing.md`, `data-structure-selection.md`, `cp-weighted.md`, `dsa/index.md`) to `suffix-tree.md`

## 2026-07-25
- `dsa/algorithms/dijkstra.md` - new article: shortest paths with a priority queue, finalized-node correctness proof, negative-weight failure mode
- `dsa/patterns/tree-graph-traversal.md` - new article: BFS/DFS recognition + transfer layer over the existing bfs.md/dfs.md algorithm pages
- `dsa/patterns/merge-intervals.md` - new article: sort-and-sweep, meeting-rooms heap variant, insert-interval, sweep-line CP primitives
- `dsa/cheatsheets/complexity-master.md` - new article: DS+algorithm Big-O aggregator across all filled topics
- `dsa/cheatsheets/sorting-comparison.md` - new article: all 6 filled sorts, stable/in-place/time/space/when-to-pick
- `dsa/cheatsheets/graph-algorithms-decision.md` - new article: BFS/DFS/SCC/max-flow family decision table; shortest-path/MST/topo-sort rows commented pending their articles
- `dsa/cheatsheets/dp-recognition.md` - new article: problem shape → DP state signature → transition shape
- `dsa/cheatsheets/data-structure-selection.md` - new article: "need fast X+Y" → structure, merged comparison across 27 structures
- `dsa/cheatsheets/input-size-complexity-lookup.md` - new article: n → feasible Big-O → algorithm class
- `dsa/cheatsheets/string-algorithm-decision.md` - new article: KMP/Z/Rabin-Karp/Manacher/Aho-Corasick/String Hashing decision table
- `dsa/cheatsheets/two-pointers-vs-window-vs-prefix-sum.md` - new article: disambiguator between the three patterns
- `dsa/cheatsheets/complexity-growth-reference.md` - new article: growth-curve diagram + real-n operation counts
- `dsa/cheatsheets/greedy-vs-dp-disambiguator.md` - new article: exchange argument vs overlapping subproblems, coin-change counterexample
- `dsa/cheatsheets/backtracking-shapes.md` - new article: subset/permutation/combination/partition loop shapes
- `dsa/cheatsheets/bit-manipulation-tricks.md` - new article: bit trick lookup table
- `dsa/cheatsheets/number-theory-reference.md` - new article: GCD/LCM/modular arithmetic/sieve formula reference
- `dsa/patterns/pattern-selection-cheatsheet.md` - filled (was empty template): trigger phrase → pattern, covers 14 filled patterns
- `dsa/index.md` - new section: "Cheatsheets", links all 13 new cheatsheet pages; removed stale "Complexity Cheat Sheet" deferred entry

## 2026-07-18
- `recursion.md` - new article: base case + recursive case as induction, call-stack space honesty, memo-vs-tabulation state/recurrence
- `binary-search-on-answer.md` - new article: minimize-max/maximize-min feasibility search, Koko/ship-capacity/max-min-gap worked problems
- `fast-slow-pointers.md` - new article: Floyd's cycle detection, μ/λ cycle-start argument, Happy Number and Find-the-Duplicate as implicit-sequence variants
- `monotonic-stack.md` - new article: next-greater/smaller via amortized O(n) stack discipline, histogram span trick, sum-of-subarray-minimums contribution technique
- `prefix-sum.md` - new article: O(1) range-sum queries, 2D inclusion-exclusion, subarray-sum-equals-K hash-map generalization

## 2026-07-10
- `longest-increasing-subsequence.md` - new article
- `aho-corasick.md` - new article
- `longest-common-subsequence.md` - new article
- `dinic.md` - new article

## 2026-07-09
- `monotonic-queue.md` - new article: sliding-window max/min pattern via monotonic deque, DP-transition speedup, dual-queue variable-window variant
- `string-hashing.md` - new article: polynomial prefix hashing, O(1) substring equality, double hashing, collision-probability correctness argument
- `manacher-algorithm.md` - new article: O(n) longest palindromic substring via mirror-seeded center expansion, amortized correctness proof

## 2026-07-07
- `ford-fulkerson.md` - new article: max-flow via DFS augmenting paths
- `edmonds-karp.md` - new article: Ford-Fulkerson with BFS augmenting paths
- `maximum-flow.md` - hub completed: survey and decision layer for max-flow
- `fenwick-tree.md` - new article: BIT point-update and prefix-sum in O(log n)
- `lowest-common-ancestor.md` - new article: binary lifting for O(log n) LCA queries
- `dsa_check.py` - fixed: link check now strips HTML comments before scanning
- `bipartite-matching.md` - new article: Kuhn's and Hopcroft-Karp augmenting-path matching
- `skip-list.md` - new article: randomized express-lane linked list, expected O(log n)
- `ford-fulkerson.md` / `edmonds-karp.md` - fixed buggy path-reconstruction code

## 2026-07-06
- `euclidean-gcd.md` - new article: Euclidean GCD derivation, correctness proof, worked problems
- `sieve-of-eratosthenes.md` - new article: Sieve of Eratosthenes, variants, worked problems
- `euclidean-gcd.md` / `sieve-of-eratosthenes.md` - post-ship polish: comparison tables, extra interviewer probes
- `number-theory.md` - wired live cross-links to GCD, mod-exp, and sieve members
- `data-structures/fenwick-tree.md` - deleted empty stub; removed dead cross-links
- `data-structures/treap.md` - deleted empty stub; updated deferred-content note
- `algorithms/dinic.md` - deleted empty stub; removed row from index

## 2026-07-03
- `dfs.md` - new article: DFS traversal, correctness proof, worked problems
- `bfs.md` - new article: BFS traversal, 0-1 and multi-source variants

## 2026-07-02
- `union-find.md` - new article: Union-Find with path compression and rank
- `bit-manipulation.md` - new article: bit manipulation operators, tricks, worked problems
- `difference-array.md` - expanded: swapped worked problem, added usage and cache notes
- `meet-in-the-middle.md` - new article: split-enumerate-combine pattern with worked problems

## 2026-06-30
- `rabin-karp.md` - new article: Rabin-Karp rolling-hash pattern search
- `modular-exponentiation.md` - new article: binary exponentiation, modular inverse, overflow traps
- `suffix-array.md` - new article: prefix-doubling build, Kasai LCP, applications
- `k-way-merge.md` - new article: k-way merge pattern via min-heap
- `interval-dp.md` - new article: interval DP pattern with Knuth-Yao speedup
- `state-machine-dp.md` - new article: state-machine DP pattern, rolling-array variants

## 2026-06-29
- `graph-coloring.md` - new article: graph coloring, bipartite check, chromatic number
- `in-place-reversal.md` - new article: in-place linked-list reversal pattern

**What gets logged:** new article, new section, expanded/rewritten section, new stub.  
**What doesn't:** typo fixes, grammar, cross-reference links.

---

## 2026-06-24
- `interval-tree.md` - expanded stub to full article: augmented BST, overlap search, comparisons
- `two-heaps.md` - expanded stub to full article: median-stream pattern, sliding-window median
- `kadane.md` - expanded stub to full article: extend-or-restart DP, edge cases
- `modified-binary-search.md` - new article: rotated search, peak finding, predicate-template pattern
- `strongly-connected-components.md` - expanded stub to full article: Kosaraju and Tarjan, condensation
- `sliding-window.md` - new article: fixed, variable, and minimum-window sliding-window templates
- `two-pointers.md` - new article: opposite-ends, same-direction, and three-way-partition patterns

## 2026-06-23
- `bitmask-dp.md` - new article: Bitmask DP pattern (recognition signals, TSP skeleton, SOS DP + submask iteration + meet-in-the-middle CP-primitives, 3 fully worked practice problems, 6 pitfalls)
- `bloom-filter.md` - new article: Bloom Filter (Hash-based DS family; covers false-positive rate derivation, optimal k, counting/cuckoo/scalable variants, at-scale cache behavior, 3 worked practice problems)

## 2026-06-22
- `dsa/patterns/frequency-array.md` - expanded
- `dsa/patterns/matrix-traversal.md` - promoted from stub to full article; expanded: "Skeleton" (added ZERO-ONE-BFS pseudocode), "Variations" (added Dijkstra-on-grid entry), "Constraints & approach" (sharpened cache-behavior note with L2 specifics)

## 2026-06-21
- `dsa/algorithms/dinic.md` - new stub
- `dsa/algorithms/divide-and-conquer.md` - new article
- `dsa/algorithms/edmonds-karp.md` - new stub
- `dsa/algorithms/euclidean-gcd.md` - new stub
- `dsa/algorithms/ford-fulkerson.md` - new stub
- `dsa/algorithms/kadane.md` - new stub
- `dsa/algorithms/maximum-flow.md` - new stub
- `dsa/algorithms/modular-exponentiation.md` - new stub
- `dsa/algorithms/number-theory.md` - new article
- `dsa/algorithms/rabin-karp.md` - new stub
- `dsa/algorithms/sieve-of-eratosthenes.md` - new stub
- `dsa/data-structures/b-plus-tree.md` - new stub
- `dsa/data-structures/bloom-filter.md` - new stub
- `dsa/data-structures/interval-tree.md` - new stub
- `dsa/data-structures/suffix-array.md` - new stub
- `dsa/data-structures/treap.md` - new stub
- `dsa/patterns/bitmask-dp.md` - new stub
- `dsa/patterns/frequency-array.md` - new stub
- `dsa/patterns/in-place-reversal.md` - new stub
- `dsa/patterns/matrix-traversal.md` - new stub
- `dsa/patterns/state-machine-dp.md` - new stub
- `dsa/patterns/two-heaps.md` - new stub

## 2026-06-20
- `dsa/algorithms/backtracking.md` - expanded
- `dsa/algorithms/dynamic-programming.md` - expanded
- `dsa/algorithms/greedy.md` - expanded
- `dsa/algorithms/string-matching.md` - new article
- `dsa/algorithms/z-algorithm.md` - new article
- `dsa/data-structures/deque.md` - new article
- `dsa/data-structures/lfu-cache.md` - new article
- `dsa/data-structures/lru-cache.md` - new article
- `dsa/patterns/backtracking.md` - new article

## 2026-06-18
- `dsa/algorithms/backtracking.md` - new stub
- `dsa/algorithms/bellman-ford.md` - new stub
- `dsa/algorithms/bfs.md` - new stub
- `dsa/algorithms/bit-manipulation.md` - new stub
- `dsa/algorithms/bucket-sort.md` - new stub
- `dsa/algorithms/dfs.md` - new stub
- `dsa/algorithms/dijkstra.md` - new stub
- `dsa/algorithms/dynamic-programming.md` - new stub
- `dsa/algorithms/floyd-warshall.md` - new stub
- `dsa/algorithms/greedy.md` - new stub
- `dsa/algorithms/minimum-spanning-tree.md` - new stub
- `dsa/algorithms/quickselect.md` - new stub
- `dsa/algorithms/recursion.md` - new stub
- `dsa/algorithms/selection-sort.md` - new stub
- `dsa/algorithms/topological-sort.md` - new stub
- `dsa/data-structures/avl-tree.md` - new article
- `dsa/data-structures/b-tree.md` - new article
- `dsa/data-structures/balanced-bst.md` - new article
- `dsa/data-structures/binary-search-tree.md` - new article
- `dsa/data-structures/binary-tree.md` - new article
- `dsa/data-structures/fenwick-tree.md` - new stub
- `dsa/data-structures/graph.md` - new stub
- `dsa/data-structures/hash-set.md` - new stub
- `dsa/data-structures/hash-table.md` - new article
- `dsa/data-structures/linked-list.md` - new article
- `dsa/data-structures/queue.md` - new article
- `dsa/data-structures/red-black-tree.md` - new article
- `dsa/data-structures/segment-tree.md` - new stub
- `dsa/data-structures/stack.md` - new article
- `dsa/data-structures/string.md` - new article
- `dsa/data-structures/trie.md` - new article
- `dsa/data-structures/union-find.md` - new stub
- `dsa/patterns/binary-search-on-answer.md` - new stub
- `dsa/patterns/cyclic-sort.md` - new stub
- `dsa/patterns/dp-patterns.md` - new stub
- `dsa/patterns/fast-slow-pointers.md` - new stub
- `dsa/patterns/merge-intervals.md` - new stub
- `dsa/patterns/monotonic-stack.md` - new stub
- `dsa/patterns/prefix-sum.md` - new stub
- `dsa/patterns/sliding-window.md` - new stub
- `dsa/patterns/subsets-permutations.md` - new stub
- `dsa/patterns/top-k-elements.md` - new stub
- `dsa/patterns/tree-graph-traversal.md` - new stub
- `dsa/patterns/two-pointers.md` - new stub

## 2026-06-17
- `dsa/algorithms/binary-search.md` - new article
- `dsa/algorithms/counting-sort.md` - new article
- `dsa/algorithms/heapsort.md` - new article
- `dsa/algorithms/insertion-sort.md` - new article
- `dsa/algorithms/merge-sort.md` - new article
- `dsa/algorithms/quicksort.md` - new article
- `dsa/algorithms/radix-sort.md` - new article
- `dsa/algorithms/sorting.md` - new article
- `dsa/data-structures/heap.md` - new article

## 2026-06-16
- `dsa/data-structures/array.md` - new article
- `dsa/data-structures/circular-buffer.md` - new article
- `dsa/data-structures/dynamic-array.md` - new article

## 2026-05-25
- `system-design/components/rate-limiter.md` - new article

## 2026-05-05
- `system-design/components/authentication.md` - new article
- `system-design/components/jwt.md` - new article
- `system-design/components/logging.md` - new stub
- `system-design/components/metrics.md` - new stub
- `system-design/components/mtls.md` - new article
- `system-design/components/observability.md` - new article
- `system-design/components/tracing.md` - new stub

## 2026-05-04
- `system-design/algorithms/acid-vs-base.md` - new stub
- `system-design/algorithms/bloom-filter.md` - new stub
- `system-design/algorithms/cap-theorem.md` - new article
- `system-design/algorithms/saga-pattern.md` - new stub
- `system-design/components/api-gateway.md` - new stub
- `system-design/components/caching.md` - new article
- `system-design/components/cdn.md` - new stub
- `system-design/components/databases.md` - new stub
- `system-design/components/dns.md` - new stub
- `system-design/components/load-balancer.md` - new article
- `system-design/components/message-queues.md` - new article
- `system-design/components/proxies.md` - new stub
- `system-design/components/rate-limiter.md` - new stub
- `system-design/components/search.md` - new stub
- `system-design/hld/distributed-cache.md` - new stub
- `system-design/hld/key-value-store.md` - new stub
- `system-design/hld/notification-system.md` - new stub
- `system-design/hld/payment-system.md` - new stub
- `system-design/hld/search-autocomplete.md` - new stub
- `system-design/hld/ticketmaster-booking.md` - new stub
- `system-design/hld/twitter-news-feed.md` - new stub
- `system-design/hld/uber-ride-sharing.md` - new stub
- `system-design/hld/url-shortener.md` - new stub
- `system-design/hld/web-crawler.md` - new stub
- `system-design/hld/whatsapp-chat-system.md` - new stub
