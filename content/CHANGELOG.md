# Content Changelog

All notable changes to wiki articles. Filter by filename to track updates to a specific article.

## Format

```
## YYYY-MM-DD
- `filename.md` - what changed (new article / new section: "Section Name" / expanded: "Section Name" / new stub: "Topic")
```

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
- `ford-fulkerson.md` - new article: max-flow via DFS augmenting paths, residual graph
- `edmonds-karp.md` - new article: Ford-Fulkerson + BFS augmenting paths, O(VE²) bound
- `maximum-flow.md` - hub completed: survey + decision layer for max-flow algorithms
- `fenwick-tree.md` - new article: BIT point-update/prefix-sum in O(log n), i&-i decomposition, range-update variants
- `lowest-common-ancestor.md` - new article: binary lifting for O(log n) LCA queries after O(n log n) preprocess
- `dsa_check.py` - fixed: link check now strips HTML comments before scanning
- `bipartite-matching.md` - new article: Kuhn's + Hopcroft-Karp augmenting-path matching, König's theorem
- `skip-list.md` - new article: randomized express-lane linked list, expected O(log n), Redis ZSET backbone
- `ford-fulkerson.md` / `edmonds-karp.md` - fixed buggy path-reconstruction code, unverified trace claims

## 2026-07-06
- `euclidean-gcd.md` - new article: Euclidean GCD (Recursive/build family via "State & recurrence"; two-direction ⊇/⊆ correctness proof of gcd(a,b)=gcd(b,a mod b); O(log min(a,b)) derivation via a mod b < a/2 case-split lemma + Fibonacci worst-case + Lamé's theorem; extended Euclid bottom-up Bézout-coefficient trace; 5-row comparison incl. Stein's/binary GCD; 6 edge cases incl. C++ negative-mod trap and LCM-overflow ordering; 2 misconceptions; 3 worked problems: GCD of Strings, Water and Jug Problem (LC 365, Bézout feasibility), modular inverse for composite modulus via extended Euclid; registered in index.md and linked from number-theory.md hub)
- `sieve-of-eratosthenes.md` - new article: Sieve of Eratosthenes (Distribution family via "Key & distribution"; both-direction correctness proof; O(n log log n) derivation via harmonic-of-primes sum and Mertens' second theorem; n=30 worked trace with per-prime ASCII marking grid; linear sieve (SPF/O(n) factorization), bytearray/bit-packed, and segmented-sieve Python variants; 6-row constraints table (plain vs segmented vs Miller-Rabin crossover); 6 edge cases incl. p² marking-start off-by-one and Python bool-list memory blowup; 2 misconceptions; 3 worked problems: Count Primes, SPF-table factorization, segmented range-prime-count; registered in index.md and linked from number-theory.md hub)
- `euclidean-gcd.md` / `sieve-of-eratosthenes.md` - post-ship polish: gcd split imprecise naive-GCD comparison row into list-divisors vs subtraction-based, added Euclid's historical subtraction-form note, added negative-input (Python vs C++ `%` sign) interviewer probe, swapped weak practice problem 2 for LC 365 Water and Jug; sieve cleaned up double-slice in bytearray variant, added wheel-factorization interviewer probe
- `number-theory.md` - wired live cross-links to all 3 members (Euclidean GCD, Modular Exponentiation, Sieve of Eratosthenes) now that all are fully written, replacing plain-text member names in the hub marker and member-list bullets
- `data-structures/fenwick-tree.md` - deleted (empty stub); removed row from `index.md` and dead cross-link from `binary-tree.md` and `patterns/difference-array.md`
- `data-structures/treap.md` - deleted (empty stub); removed row from `index.md`; updated "Deferred" note that referenced it
- `algorithms/dinic.md` - deleted (empty stub); removed row from `index.md`

## 2026-07-03
- `dfs.md` - new article: Depth-First Search (DFS, Traversal family; O(V+E) derivation with Σ|Adj(u)|=|E| argument; parenthesis theorem proof; white-gray-black coloring invariant; 8-vertex directed graph trace with step-by-step stack states and discovery/finish timestamps; CLRS pseudocode for DFS, DFS-VISIT, ITERATIVE-DFS, and TOPOLOGICAL-SORT; Python recursive + iterative + undirected cycle detection; 3 worked problems: Number of Islands, Course Schedule / directed cycle detection, Clone Graph; senior trap: parent tracking in undirected cycle detection; cache behavior: pointer-chasing on adjacency lists)
- `bfs.md` - new article: Breadth-First Search (BFS, Traversal family; O(V+E) derivation; mark-on-enqueue invariant proof; CLRS pseudocode; 0-1 BFS and multi-source BFS in Graph/tree assumptions; 3 worked problems: Word Ladder, Binary Tree Level Order, 01 Matrix with multi-source BFS; 7 edge cases including mark-on-dequeue bug and list-vs-deque CP trap)

## 2026-07-02
- `union-find.md` - new article: Union-Find (DSU) data structure (path compression + union by rank/size; O(α(n)) amortized proof via iterated-log intuition; forest invariant + why rank is an upper bound post-compression; 4 CP-primitives: Kruskal's MST, cycle detection, component counting, rollback DSU; 4 worked problems: connected components, Kruskal's MST, accounts merge, redundant connection)
- `bit-manipulation.md` - new article: Bit Manipulation algorithm (AND/OR/XOR/NOT/shift operators; two's complement proofs for n&(n-1) and n&(-n); Brian Kernighan popcount; XOR find-unique; bitmask DP TSP; subset enumeration via (sub-1)&mask; bitmask memory budget table; 4 worked problems: Single Number, Counting Bits, Subsets, Number of Ways to Wear Different Hats)
- `difference-array.md` - expanded: replaced Car Fleet worked problem with LC 2251 (Flowers in Full Bloom, genuine diff-array + coord-compress); added real-world usage (game servers, ad-impression) and cache-behavior note (sequential prefix-sum pass = cache-friendly) to Constraints section; registered in index.md Patterns table
- `meet-in-the-middle.md` - new article: Meet in the Middle pattern (split → enumerate 2^(n/2) sums per half → sort + binary-search combine; two-pointer combine CP-primitive; 4-sum MITM reduction; closest subset sum variant; pitfalls on empty-subset, integer overflow, off-by-one; worked problems LC 1755, LC 805, LC 454)

## 2026-06-30
- `rabin-karp.md` - new article: Rabin-Karp algorithm (rolling hash sliding window, multi-pattern search, spurious hit / Las Vegas correctness, O(n+m) average / O(nm) worst derivation, binary search + rolling hash for longest duplicate substring)
- `modular-exponentiation.md` - new article: Modular Exponentiation algorithm (binary exponentiation, loop invariant proof, Fermat modular inverse, matrix exponentiation for Fibonacci, overflow traps, 3-arg pow contest idiom)
- `suffix-array.md` - new article: Suffix Array data structure (prefix-doubling build, Kasai LCP, pattern search, longest repeated substring, distinct substrings, longest common substring)
- `k-way-merge.md` - new article: K-Way Merge pattern (merge k sorted lists/arrays/streams via min-heap; smallest range, k-th smallest in matrix; lazy-deletion and iterator-based CP-primitives)
- `interval-dp.md` - new article: Interval DP pattern (burst balloons, matrix chain, merge stones, strange printer; Knuth-Yao speedup and sentinel padding CP-primitives)
- `state-machine-dp.md` - new article: State Machine DP pattern (cooldown, transaction fee, k-transactions, circular house robber, paint house; rolling-array and top-2 CP-primitives)

## 2026-06-29
- `graph-coloring.md` - new article: Graph Coloring pattern (2-coloring / bipartite check, k-coloring via backtracking, bitmask DP for chromatic number)
- `in-place-reversal.md` - new article: In-place Reversal of a Linked List pattern (full reversal, sublist reversal, k-groups, palindrome check, rotate right)

**What gets logged:** new article, new section, expanded/rewritten section, new stub.  
**What doesn't:** typo fixes, grammar, cross-reference links.

---

## 2026-06-24
- `interval-tree.md` - expanded stub to full article: augmented BST invariant + max-endpoint annotation, overlap search correctness proof, all-overlaps O(log n + k) algorithm, comparison table vs segment tree / sorted array / brute force, lazy-deletion and rotation-fixup gotchas, at-scale cache-hostility note, 3 practice problems (LC 253 Meeting Rooms II, LC 729 My Calendar I, LC 352 Data Stream as Disjoint Intervals)
- `two-heaps.md` - expanded stub to full article: median-stream pattern with max-heap/min-heap partition, skeleton + Python template with negation idiom, sliding window median via lazy deletion, CP-primitives (lazy deletion + SortedList alternative), 3 practice problems (LC 295, LC 480 Sliding Window Median, LC 502 IPO)
- `kadane.md` - expanded stub to full article: extend-or-restart DP derivation, full trace with diagram, correctness invariant + exchange argument, all-negative/overflow/circular edge cases, 2-D extension and circular array interviewer probes, 3 practice problems (LC 53, LC 918, LC 152 max-product variant)
- `modified-binary-search.md` - new article: Modified Binary Search pattern (rotated search, peak finding, first/last position, 2D matrix, exponential search + bisect + predicate-template CP-primitives, 3 worked problems LC 33/162/34 + 3 practice problems LC 875/1095/981)
- `strongly-connected-components.md` - expanded stub to full article: Kosaraju + Tarjan (both algorithms, full pseudocode + Python), correctness invariants, low-link trace, condensation, 2-SAT connection, iterative DFS note for large V, 3 worked problems (LC 547, LC 1192 bridge-finding, LC 952)
- `sliding-window.md` - new article: Sliding Window pattern (fixed + variable + minimum-window templates, monotonic deque + atMost decomposition CP-primitives, 5 worked problems including LC 76/239/340, 3 practice problems)
- `two-pointers.md` - new article: Two Pointers pattern (opposite-ends, same-direction write-head, three-way partition templates, meet-in-the-middle + kSum CP-primitives, 5 worked problems including 3Sum/Trapping Rain Water, 3 practice problems)

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
