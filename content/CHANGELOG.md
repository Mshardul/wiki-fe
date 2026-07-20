# Content Changelog

All notable changes to wiki articles. Filter by filename to track updates to a specific article.

## Format

```
## YYYY-MM-DD
- `filename.md` - what changed (new article / new section: "Section Name" / expanded: "Section Name" / new stub: "Topic")
```

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
