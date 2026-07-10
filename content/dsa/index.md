# Data Structures & Algorithms

Interview-ready DSA reference. Understand a structure or algorithm, know its complexity, know when to reach for it, see a clean implementation, and practice on representative problems.

Three sections: **data structures** (structural reference), **algorithms** (procedure + proof), **patterns** (recognition + transfer).

---

## Data Structures

Structural references. Each page covers how it works, operations with their complexity, when to use it, variants, and an implementation.

| Structure                                                           | Description                                                                                                                                           |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Array](./data-structures/array.md)                                 | Contiguous block, O(1) indexed access, O(n) middle insert/delete. The foundation every other structure builds on.                                     |
| [Dynamic Array](./data-structures/dynamic-array.md)                 | Growable array that doubles when full. Amortized O(1) append - the canonical amortization argument.                                                   |
| [Circular Buffer](./data-structures/circular-buffer.md)             | Fixed-size ring with head/tail wraparound. True O(1) enqueue/dequeue, no resize - fixed-capacity FIFO and sliding windows.                            |
| [Heap](./data-structures/heap.md)                                   | Binary tree where every parent beats its children, stored in a flat array. O(1) peek, O(log n) push/pop - the priority queue and "top-K" workhorse.   |
| [String](./data-structures/string.md)                               | Immutable sequence of characters. Indexing, slicing, and the building/scanning patterns that dominate text problems.                                  |
| [Linked List](./data-structures/linked-list.md)                     | Nodes chained by pointers. O(1) insert/delete at a known node, O(n) search - the pointer-manipulation classic.                                        |
| [Stack](./data-structures/stack.md)                                 | LIFO. O(1) push/pop - function calls, matching, undo, and the monotonic-stack trick.                                                                  |
| [Queue](./data-structures/queue.md)                                 | FIFO. O(1) enqueue/dequeue - BFS frontier, scheduling, and the deque generalization.                                                                  |
| [Deque](./data-structures/deque.md)                                 | Double-ended queue. O(1) add/remove at both ends - generalizes stack + queue; engine of sliding-window max/min and 0/1-BFS.                            |
| [Hash Table](./data-structures/hash-table.md)                       | Key→value via a hash function. Average O(1) insert/lookup/delete - the workhorse map; chaining vs open addressing, load factor, resize.               |
| [Hash Set](./data-structures/hash-set.md)                           | Membership-only hash structure. Average O(1) contains/add - dedup and seen-set patterns.                                                              |
| [LRU Cache](./data-structures/lru-cache.md)                         | Hash map welded to a doubly linked list: O(1) get/put with least-recently-used eviction. The canonical "design a cache" interview build.              |
| [LFU Cache](./data-structures/lfu-cache.md)                         | Frequency buckets of LRU lists + a min-freq pointer: O(1) get/put evicting the least-frequently-used key. LRU with a popularity axis.                 |
| [Binary Tree](./data-structures/binary-tree.md)                     | Each node has up to two children. The traversal orderings and the base for BST, heap, and trie.                                                       |
| [Binary Search Tree (BST)](./data-structures/binary-search-tree.md) | Ordered tree: left < node < right. O(log n) search/insert/delete when balanced, O(n) when skewed.                                                     |
| [Trie](./data-structures/trie.md)                                   | Prefix tree keyed by character path. O(L) lookup by length, not by count - autocomplete and prefix queries.                                           |
| [Balanced BST](./data-structures/balanced-bst.md)                   | **Hub** - survey + decision layer for self-balancing BSTs: what balancing buys, rotations, and which scheme when. Routes to AVL / Red-Black / B-tree. |
| [Skip List](./data-structures/skip-list.md)                         | Sorted linked list with randomized express-lane towers - expected O(log n) search/insert/delete, no rotations. Redis sorted sets' backbone.          |
| [AVL Tree](./data-structures/avl-tree.md)                           | Strictly height-balanced BST (subtree heights differ ≤ 1). Tighter balance → faster lookups, more rotations on writes. Read-heavy workloads.          |
| [Red-Black Tree](./data-structures/red-black-tree.md)               | Loosely balanced via color invariants; recolor-first, rotate-rarely. Fewer write rotations - the library default (`std::map`, `TreeMap`, kernel).     |
| [B-Tree](./data-structures/b-tree.md)                               | High-fan-out balanced tree, many keys per node, block-aligned to minimize disk seeks. The structure behind database and filesystem indexes.           |
| [Segment Tree](./data-structures/segment-tree.md)                   | Tree over array ranges. O(log n) range query + point/range update - the CP range-aggregate workhorse.                                                 |
| [Fenwick Tree (BIT)](./data-structures/fenwick-tree.md)             | Array where index `i` owns a range sized by its lowest set bit. O(log n) point update + prefix sum - segment tree's lighter sum-only sibling.        |
| [Union-Find (DSU)](./data-structures/union-find.md)                 | Disjoint-set forest with path compression + union by rank. Near-O(1) connectivity - Kruskal's MST, cycle detection, grouping.                         |
| [Graph](./data-structures/graph.md)                                 | Nodes + edges. Adjacency list vs matrix, directed/weighted variants - the substrate every traversal algorithm walks.                                  |
| [Bloom Filter](./data-structures/bloom-filter.md)                   | Probabilistic membership structure - never false negatives, tunable false-positive rate. O(k) insert/lookup, O(m) bits for m bits and k hash functions.             |
| [B-Plus Tree](./data-structures/b-plus-tree.md)                     | B-tree variant with all values at leaves, internal nodes as pure routing keys, leaves linked for range scans - the structure behind MySQL InnoDB and PostgreSQL indexes. |
| [Interval Tree](./data-structures/interval-tree.md)                 | Augmented BST storing intervals; O(log n + k) stabbing and overlap queries - the structure for sweep-line and scheduling problems.                     |
| [Suffix Array](./data-structures/suffix-array.md)                   | Sorted array of suffix indices. O(n log² n) prefix-doubling build, O(m log n) pattern search - lighter than a suffix tree; the CP string and genomics workhorse.         |

---

## Algorithms

Procedures with correctness intuition. Each page covers the worked example, the invariant, complexity _derivation_, edge cases, and an implementation.

| Algorithm                                                                       | Description                                                                                                                                                 |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Binary Search](./algorithms/binary-search.md)                                  | Halve a sorted search space each step - O(log n). Generalizes to any monotonic predicate, the basis of "binary search on the answer".                       |
| [Sorting](./algorithms/sorting.md)                                              | Comparison sorts bottom out at O(n log n) (merge/quick/heap); counting & radix break it to O(n) on bounded keys. Stability, the lower bound.                |
| [Merge Sort](./algorithms/merge-sort.md)                                        | Divide in half, sort each, merge. Guaranteed O(n log n) in all cases and stable, at O(n) space - the safe choice and the basis of external sort.            |
| [Quicksort](./algorithms/quicksort.md)                                          | Partition around a pivot in place, recurse on each side. O(n log n) average with the smallest constant; O(n²) tail unless randomized. Holds quickselect.    |
| [Insertion Sort](./algorithms/insertion-sort.md)                                | Grow a sorted prefix, sliding each new element into place. O(n²) worst but O(n) on nearly-sorted data; stable, in-place, online - Timsort's small-run sort. |
| [Counting Sort](./algorithms/counting-sort.md)                                  | Tally each key, emit in key order. O(n + k), beating the comparison bound by not comparing - integer keys in a small range only. Radix's inner pass.        |
| [Radix Sort](./algorithms/radix-sort.md)                                        | Stable counting sort per digit, least-significant first. O(d·(n + b)) - linear for fixed-width keys, where counting sort's range would explode.             |
| [Heapsort](./algorithms/heapsort.md)                                            | Build a max-heap, repeatedly extract the max into a sorted suffix. The only comparison sort with both worst-case O(n log n) and O(1) space; not stable.     |
| [Selection Sort](./algorithms/selection-sort.md)                                | Repeatedly pick the min of the unsorted suffix. O(n²) always, minimal swaps - the simplest sort, mostly a teaching baseline.                                |
| [Bucket Sort](./algorithms/bucket-sort.md)                                      | Scatter into buckets by value range, sort each, concatenate. O(n) average on uniform data - the distribution sort for floats in a range.                    |
| [Quickselect](./algorithms/quickselect.md)                                      | Quicksort's partition without recursing on both sides. O(n) average to find the k-th smallest - selection without full sort.                                |
| [Breadth-First Search (BFS)](./algorithms/bfs.md)                               | Explore level by level with a queue. Shortest path in unweighted graphs, O(V + E).                                                                          |
| [Depth-First Search (DFS)](./algorithms/dfs.md)                                 | Explore as deep as possible, backtrack. O(V + E) - cycle detection, components, topological order.                                                          |
| [Topological Sort](./algorithms/topological-sort.md)                            | Linear order of a DAG respecting edges. Kahn's BFS or DFS post-order - dependency resolution, build order.                                                  |
| [Lowest Common Ancestor (LCA)](./algorithms/lowest-common-ancestor.md)          | Deepest shared ancestor of two tree nodes. Binary lifting: O(n log n) preprocess, O(log n) per query - the many-queries-on-a-static-tree workhorse.         |
| [Dijkstra's Algorithm](./algorithms/dijkstra.md)                                | Shortest paths from a source with non-negative weights via a priority queue. O((V + E) log V).                                                              |
| [Bellman-Ford](./algorithms/bellman-ford.md)                                    | Shortest paths that tolerate negative edges and detect negative cycles. O(V·E) - slower than Dijkstra, more general.                                        |
| [Floyd-Warshall](./algorithms/floyd-warshall.md)                                | All-pairs shortest paths by DP over intermediates. O(V³) - dense graphs, small V, transitive closure.                                                       |
| [Minimum Spanning Tree (Kruskal / Prim)](./algorithms/minimum-spanning-tree.md) | Cheapest tree connecting all nodes. Kruskal (sort + DSU) or Prim (PQ) - network design.                                                                     |
| [Recursion](./algorithms/recursion.md)                                          | A function defined in terms of itself: base case + recursive case. The substrate under divide-and-conquer, backtracking, and DP.                            |
| [Divide and Conquer](./algorithms/divide-and-conquer.md)                        | Split into independent subproblems, solve each recursively, combine. The paradigm behind merge sort, Karatsuba, and closest pair - O(n log n) via the Master Theorem. |
| [Backtracking](./algorithms/backtracking.md)                                    | Build candidates incrementally, abandon dead ends (prune). The systematic search for subsets, permutations, and constraint problems.                        |
| [Dynamic Programming](./algorithms/dynamic-programming.md)                      | Solve overlapping subproblems once, reuse via memo or table. Optimal substructure → the recurrence that collapses exponential to polynomial.                |
| [Longest Increasing Subsequence](./algorithms/longest-increasing-subsequence.md) | O(n²) DP comparing every pair, or O(n log n) patience sorting via a binary-searched `tails` array - same answer, different state representation.            |
| [Longest Common Subsequence](./algorithms/longest-common-subsequence.md)        | Compare two strings with a 2D `dp[i][j]` table - match extends the diagonal, mismatch takes the max of dropping a char from either side. O(n·m) time/space, the basis of `diff`, edit distance, and DNA alignment. |
| [Bit Manipulation](./algorithms/bit-manipulation.md)                            | Operate on individual bits: masks, shifts, XOR tricks. O(1) set operations and the bitmask-DP enabler.                                                      |
| [Greedy](./algorithms/greedy.md)                                                | Take the locally best choice each step; prove it's globally optimal by an exchange argument. Interval scheduling, Huffman, MST choices.                     |
| [String Matching (KMP)](./algorithms/string-matching.md)                        | Find a pattern in a text in O(n + m) via the failure function - slide the pattern on a mismatch without ever rewinding the text. The substring-search workhorse. |
| [Z-Algorithm](./algorithms/z-algorithm.md)                                      | Computes, for each position, the longest prefix starting there (the Z-array) in O(n) by reusing a sliding match window. KMP's twin; pattern search via `P$T`. |
| [Manacher Algorithm](./algorithms/manacher-algorithm.md)                        | Finds the longest palindromic substring in O(n) by mirroring already-computed radii across a known palindrome's center - collapses O(n²) expand-around-center to linear. |
| [Aho-Corasick](./algorithms/aho-corasick.md)                                    | KMP's failure function generalized to a trie - build once over all patterns, scan the text once, O(n + Σm + matches) deterministic multi-pattern matching. |
| [Number Theory](./algorithms/number-theory.md)                                  | **Hub** - survey + decision layer for the contest math toolkit: GCD, modular exponentiation, the sieve. Routes to each member; ties them together via mod-prime arithmetic. |
| [Modular Arithmetic](./algorithms/modular-arithmetic.md)                        | Arithmetic under a modulus: add/mul/pow in O(log n), modular inverse, the Chinese Remainder Theorem - the foundation of every contest problem that says "answer mod 10⁹+7". |
| [Modular Exponentiation](./algorithms/modular-exponentiation.md)                | Compute base^exp mod m in O(log exp) by squaring instead of multiplying exp times - the engine behind RSA, Fermat's modular inverse, and matrix exponentiation for Fibonacci. |
| [Euclidean GCD](./algorithms/euclidean-gcd.md)                                  | `gcd(a,b) = gcd(b, a mod b)` in O(log min(a,b)) - the extended version recovers Bézout's coefficients, giving a modular inverse for any modulus, not just primes. |
| [Sieve of Eratosthenes](./algorithms/sieve-of-eratosthenes.md)                  | Mark every composite up to n in O(n log log n) by striking multiples of each prime from p² on. Bulk primality/factorization - linear-sieve and segmented-sieve variants. |

| [Strongly Connected Components](./algorithms/strongly-connected-components.md)  | Find all maximal groups where every node can reach every other. Kosaraju (two-pass DFS + transpose) or Tarjan (single-pass, low-link values) - both O(V + E). Foundation of 2-SAT and condensation DAG analysis. |
| [Maximum Flow](./algorithms/maximum-flow.md)                                    | **[Hub]** Survey + decision layer for max-flow algorithms: Ford-Fulkerson, Edmonds-Karp, Dinic, and the bipartite-matching reduction.            |
| [Ford-Fulkerson](./algorithms/ford-fulkerson.md)                                | Augment flow along any path in the residual graph. O(E·\|max_flow\|) - can fail to terminate on irrational capacities; the conceptual baseline. |
| [Edmonds-Karp](./algorithms/edmonds-karp.md)                                    | Ford-Fulkerson with BFS for shortest augmenting paths. O(VE²) - polynomial regardless of capacity values.                                   |
| [Dinic](./algorithms/dinic.md)                                                  | BFS level graph + DFS blocking flow with current-arc optimization. O(V²E) general, O(E√V) on unit-capacity graphs - the fast max-flow choice. |
| [Bipartite Matching](./algorithms/bipartite-matching.md)                        | Maximum set of non-overlapping pairs in a bipartite graph via augmenting paths - Kuhn's O(VE) or Hopcroft-Karp O(E√V). Job/task assignment, König's theorem for min vertex cover. |
| [Rabin-Karp](./algorithms/rabin-karp.md)                                        | Rolling polynomial hash over a sliding window. O(n + m) average, O(nm) worst case - the primary choice for multi-pattern search and substring fingerprinting.                     |
| [String Hashing](./algorithms/string-hashing.md)                                | Prefix-hash a string once in O(n), then compare any two substrings in O(1) - the general polynomial-hash toolkit behind Rabin-Karp, double hashing, and hash + binary-search-on-answer.  |
| [Kadane](./algorithms/kadane.md)                                    | Maximum subarray sum in O(n) via a single pass - extend the running subarray or restart, whichever is larger. The canonical space-compressed DP; extends to circular arrays and 2-D max-sum rectangle.                   |

---

## Patterns

Recognition and transfer. Each page covers trigger phrases, structural cues, a reusable skeleton, and problems that reuse the pattern.

| Pattern                                                                     | Description                                                                                                                    |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [Two Pointers](./patterns/two-pointers.md)                                  | Two indices walking a sequence (same or opposite ends). Pair-sum, dedup, partition - O(n) where brute force is O(n²).          |
| [Sliding Window](./patterns/sliding-window.md)                              | A moving sub-range over a sequence: expand right, contract left on a constraint. Longest/shortest contiguous subarray in O(n). |
| [Prefix Sum](./patterns/prefix-sum.md)                                      | Precompute cumulative sums for O(1) range queries. The "subarray sum equals K" and difference-array family.                    |
| [Difference Array](./patterns/difference-array.md)                          | Two O(1) point writes per range update, one prefix-sum pass to reconstruct - O(n + q) vs O(n·q) naive. Batch range-increment problems.   |
| [Fast & Slow Pointers](./patterns/fast-slow-pointers.md)                    | Two pointers at different speeds. Cycle detection, middle of a list, cycle start - Floyd's tortoise and hare.                  |
| [Merge Intervals](./patterns/merge-intervals.md)                            | Sort by start, sweep, merge overlaps. The interval-overlap, meeting-rooms, insert-interval family.                             |
| [Cyclic Sort](./patterns/cyclic-sort.md)                                    | Place each value at its index in O(n) when values are 1..n. Finds the missing/duplicate number without extra space.            |
| [Monotonic Stack](./patterns/monotonic-stack.md)                            | A stack kept increasing or decreasing. Next-greater-element, daily temperatures, histogram - amortized O(n).                   |
| [Monotonic Queue](./patterns/monotonic-queue.md)                            | A deque kept increasing or decreasing. Sliding-window max/min in O(n) - the two-ended sibling of monotonic stack.              |
| [Top-K Elements](./patterns/top-k-elements.md)                              | A size-k heap over a stream. K largest/smallest/most-frequent in O(n log k) without sorting everything.                        |
| [Binary Search on Answer](./patterns/binary-search-on-answer.md)            | Binary search the answer space when feasibility is monotonic. "Minimize the max" / "maximize the min" problems.                |
| [Modified Binary Search](./patterns/modified-binary-search.md)              | Binary search on a transformed array (rotated, peaked, partially sorted) - same halving, different monotonic signal at `mid`. Rotated search, peak element, first/last position. |
| [Subsets & Permutations](./patterns/subsets-permutations.md)                | Backtracking templates for the power set, permutations, and combinations - with dedup for repeats.                             |
| [Backtracking](./patterns/backtracking.md)                                  | Choose / explore / un-choose over a decision tree, pruning dead branches - the recognition + transfer layer for constraint-satisfaction search. |
| [Tree & Graph Traversal](./patterns/tree-graph-traversal.md)                | The BFS/DFS skeletons applied as a problem pattern: level-order, path-sum, connected components, flood fill.                   |
| [DP Patterns](./patterns/dp-patterns.md)                                    | The recurring DP shapes: 0/1 knapsack, unbounded, LIS, LCS, grid paths, interval DP - recognition and the state to pick.       |
| [Pattern Selection Cheat Sheet](./patterns/pattern-selection-cheatsheet.md) | The aggregator: trigger phrase → which pattern. The fast lookup that ships last, once every pattern exists.                    |
| [Two Heaps](./patterns/two-heaps.md)                                        | A max-heap of the lower half + min-heap of the upper half. Median of a stream and sliding-window median in O(log n) per element.                       |
| [K-Way Merge](./patterns/k-way-merge.md)                                    | Min-heap of k sorted sequence heads - pop the global minimum, push its successor. O(N log k) to merge N total elements across k sorted lists.          |
| [Interval DP](./patterns/interval-dp.md)                                    | State is `dp[i][j]` for subrange `[i,j]`; fill by interval length, try every split point k. O(n³) - matrix chain, burst balloons, palindrome cost.     |
| [In-place Reversal of a Linked List](./patterns/in-place-reversal.md)       | Rewire next pointers with three variables (prev, curr, next). Reverse a list, reverse k-groups, palindrome check - O(n) time, O(1) space.  |
| [Matrix Traversal](./patterns/matrix-traversal.md)                          | BFS/DFS on a 2D grid with direction vectors. Island count, flood fill, shortest path in grid - the implicit-graph pattern.                  |
| [State Machine DP](./patterns/state-machine-dp.md)                          | Finite named states with explicit allowed transitions, DP over (index, state). Stock cooldown, k-transactions, paint-house - O(n · S) time, O(S) space with rolling arrays.                   |
| [Bitmask DP](./patterns/bitmask-dp.md)                                      | Encode a subset of n ≤ 20 items as an integer bitmask, DP over all 2ⁿ subsets. TSP, optimal assignment, minimum coverage - O(2ⁿ · n) or O(2ⁿ · n²). |
| [Frequency Array](./patterns/frequency-array.md)                            | Array indexed by value: O(1) increment/lookup for bounded integer or character keys. Replaces a hash map when the key range fits - anagram detection, counting sort, sliding-window distribution matching. |
| [Graph Coloring](./patterns/graph-coloring.md)                              | Assign colors to nodes so no two adjacent nodes match. 2-coloring (bipartite check) in O(V + E); k-coloring for k ≥ 3 is NP-complete - backtracking for small n, bitmask DP for n ≤ 20. |
| [Meet in the Middle](./patterns/meet-in-the-middle.md)                      | Split an exponential search space in half, enumerate each independently (2^(n/2) each), sort one, binary-search from the other. Turns O(2ⁿ) into O(2^(n/2) · n) - the go-to for n ≤ 40 subset-sum problems. |

---

## Deferred / Not yet filed

- Count-Min Sketch - probabilistic frequency sketch; better fits system-design vertical
- Skip List - randomized ordered map; deferred, low priority vs balanced BST family
- Treap - randomized BST+heap; deferred, low priority vs balanced BST family
- Suffix Tree - suffix array covers 90% of interview need; suffix tree deferred
- Bidirectional BFS - will live as a section inside bfs.md
- Tree BFS vs Tree DFS - will live as a section inside tree-graph-traversal.md
- 0/1 Knapsack / Unbounded Knapsack - covered in dp-patterns.md
- Fibonacci Heap - one sentence in dijkstra.md suffices
- Memoization Table - technique inside dynamic-programming.md, not a standalone DS
- Adjacency List / Matrix - covered in graph.md (Representations section)
- Complexity Cheat Sheet - meta article, non-standard format; pending
- Problem-Solving Framework - meta article, non-standard format; pending

---
