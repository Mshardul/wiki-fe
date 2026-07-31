# DSA Worked Problems Dedup - Algorithms Sweep Inventory

Per-file target problem list for each Algorithms article's `## Practice problems` section, audited against the merged U6 spec (`dsa-writer.md`) and the distinct-technique constraint (main plan decision 4). Same format as `dsa-worked-problems-dedup-inventory.md` (Patterns). Nested bullets are duplicate-problems entries - same technique as the parent, cited in the article's `**Duplicate problems:**` line, not a full worked entry.

Status: `[ ]` not yet applied to the content file, `[x]` applied - matches `content/dsa/algorithms/<file>.md`.

All entries also need the worked-examples block (nested Input/Output/Explanation, decision 9) - missing across all 34 written files below, not re-noted per file.

---

## `[x]` aho-corasick.md

- Implement Aho-Corasick / Multi-pattern string matching - build automaton once, scan text against it
  - Stream of Characters (LC 1032), Word Filter / Content Moderation - same build+scan mechanic, collapse from full entries
- Short Encoding of Words (LC 820) - trie suffix links, not Aho-Corasick

## `[x]` backtracking.md

- Combinations - `C(n, k)` - index-based combination build
  - Combination Sum (LC 39), Letter Combinations of a Phone Number (LC 17)
- Word Search - grid in-place-marking DFS
  - Word Search II (LC 212)
- Palindrome Partitioning - partition+validity gating
  - Restore IP Addresses (LC 93)
- Generate Parentheses - counter-based pruning
  - (none found at verified confidence)

## `[x]` bfs.md

- Word Ladder (LC 127) - implicit-graph shortest path via pattern-map
  - Minimum Genetic Mutation (LC 433), Word Ladder II (LC 126), Open the Lock (LC 752)
- Binary Tree Level Order Traversal (LC 102) - level-order snapshot
  - Binary Tree Right Side View (LC 199), Average of Levels (LC 637), Maximum Width of Binary Tree (LC 662), Zigzag Level Order (LC 103)
- 01 Matrix / Multi-source BFS (LC 542) - multi-source BFS
  - Rotting Oranges (LC 994), Walls and Gates (LC 286), As Far from Land as Possible (LC 1162), Pacific Atlantic Water Flow (LC 417)

## `[x]` binary-search.md

- First Bad Version - binary search on a predicate
  - Find Peak Element (LC 162)
- Search in Rotated Sorted Array - half is always sorted
  - Search in Rotated Sorted Array II (LC 81), Find Minimum in Rotated Sorted Array (LC 153)
- Koko Eating Bananas - binary search on the answer
  - Capacity To Ship Packages Within D Days (LC 1011)
- Median of Two Sorted Arrays - partition search
  - (none found - technique distinctive enough on its own)

## `[x]` bipartite-matching.md

- Maximum Bipartite Matching (canonical, CSES "School Dance")
  - Job Assignment variants, "one-to-one compatible pairs" problems generally
- Minimum Vertex Cover in a Bipartite Graph (König's theorem application)
  - Maximum Independent Set (complement of vertex cover)
- Assignment Problem with Costs (Hungarian algorithm territory)
  - Minimum Cost Bipartite Matching (general)

## `[x]` bit-manipulation.md

- Single Number - pair-cancellation via XOR
  - Missing Number (LC 268), Find the Difference (LC 389), Single Number III (LC 260)
- Counting Bits - popcount over a range
  - Number of 1 Bits (LC 191), Hamming Distance (LC 461)
- Subsets - enumerate the power set via bitmask
  - Subsets II (LC 90), Letter Case Permutation (LC 784)
- Number of Ways to Wear Different Hats - bitmask DP over persons
  - Assign K Workers to Jobs, Minimum XOR Sum of Two Arrays (LC 1879)
- Find Minimum Time to Finish All Jobs - bitmask DP with min-max objective
  - LC 1986, LC 2305 Fair Distribution of Cookies

## `[x]` counting-sort.md

- Sort an Array of Bounded Integers - plain counting sort
  - Sort Colors (LC 75), Height Checker (LC 1051)
- Sort Characters by Frequency - count then emit
  - Top K Frequent Elements (LC 347)
- Relative Sort Array - counting with a custom order
  - Custom Sort String (LC 791)
- H-Index - counting buckets to skip the sort
  - (none found at verified confidence)

## `[x]` dfs.md

- Number of Islands (LC 200) - flood-fill DFS
  - Max Area of Island (LC 695), Number of Provinces (LC 547), Surrounded Regions (LC 130), Count Sub Islands (LC 1905)
- Course Schedule / Directed Cycle Detection (LC 207) - three-color DFS
  - Course Schedule II (LC 210), Find Eventual Safe States (LC 802) - see cross-file note below, Detect Cycle in Directed Graph (classic)
- Clone Graph (LC 133) - register-before-recurse DFS
  - Copy List with Random Pointer (LC 138), Clone N-ary Tree (LC 1490)

Cross-file note: Find Eventual Safe States (LC 802) is a dup-line here (simple 3-color DFS solves it) AND a full entry in `strongly-connected-components.md` (heavier canonical Tarjan+condensation pipeline). Kept in both intentionally - genuinely different techniques, same precedent as LC 239 Sliding Window Maximum living in both `sliding-window.md` and `monotonic-queue.md`.

## `[x]` dijkstra.md

- Network Delay Time (LC 743) - plain single-source Dijkstra
  - Path with Maximum Probability (LC 1514), Cheapest Flights Within K Stops (LC 787) - contrast only, not a true dup
- Path with Maximum Probability (LC 1514) OR Swim in Rising Water (LC 778) - pick one as full entry, combining-function swap (product/max) ruled not distinct from entry 1's relaxation loop
  - the other of the pair, folded in as a dup-line
- Cheapest Flights Within K Stops (LC 787) - state-augmented Bellman-Ford, genuinely not Dijkstra
  - Path With Minimum Effort (LC 1631) - contrast case

## `[x]` dinic.md

- Maximum Flow (canonical, CSES "Download Speed")
  - Police Chase (CSES), "maximum disjoint paths" problems generally
- Maximum Bipartite Matching at scale (CSES "School Dance" generalized)
  - Job Assignment at scale
- ~~Minimum Vertex Cover via Max Flow~~ - dropped, duplicates `bipartite-matching.md` entry 2 (same König's-theorem reduction, only the matching engine changes). Replace with: vertex-disjoint paths via vertex-splitting (CSES "Distinct Routes") - split each node into in/out pair joined by a capacity-1 edge, caps paths through a node not just along an edge, exercises the O(E√V) unit-capacity bound

## `[x]` divide-and-conquer.md

- Count Inversions - augmented merge-sort combine
  - Reverse Pairs (LC 493), Count of Smaller Numbers After Self (LC 315)
- Maximum Subarray (D&C) - left/right/crossing split
  - Maximum Sum Circular Subarray (LC 918)
- Closest Pair of Points - geometric strip bounding
  - Count of Range Sum (LC 327)
- Karatsuba Multiplication - algebraic-trick recurrence reduction
  - Strassen's Matrix Multiplication (name only, no standard LC number)

## `[x]` dynamic-programming.md

- House Robber - 1D rolling DP
  - House Robber II (LC 213), Delete and Earn (LC 740)
- Edit Distance - 2D alignment DP
  - Delete Operation for Two Strings (LC 583)
- Coin Change II - unbounded knapsack, order matters
  - Combination Sum IV (LC 377), Partition Equal Subset Sum (LC 416)
- Longest Increasing Subsequence - DP → binary-search acceleration
  - Russian Doll Envelopes (LC 354), Maximum Length of Pair Chain (LC 646)

## `[x]` edmonds-karp.md

- Maximum Flow (canonical, CSES "Download Speed")
  - Police Chase (CSES), disjoint-paths problems generally
- Maximum Bipartite Matching (CSES "School Dance")
  - Job Assignment / Task-Worker compatibility
- Baseball Elimination - advanced max-flow modeling from a word problem
  - Project Selection Problem (max-profit under prerequisites via min-cut)

## `[x]` euclidean-gcd.md

- Greatest Common Divisor of Strings (LC 1071)
  - Repeated String Match (LC 686) - different technique, similar reasoning
- Water and Jug Problem (LC 365)
  - "reach target using steps of size a, b" reachability problems generally
- Modular inverse for combinatorics, non-prime modulus
  - "combinations mod m" with composite/unspecified m, Diophantine equation solvers

## `[x]` ford-fulkerson.md

- Max Flow / Min Cut (generic, canonical CSES "Download Speed")
  - Police Chase (CSES), School Dance (CSES) bipartite-matching reduction
- Maximum Bipartite Matching (LC 1349, canonical CSES "School Dance")
  - Assignment Problem (unweighted feasibility variant)
- Circulation with Lower Bounds (conceptual/advanced, canonical CSES "Distinct Routes")
  - Download Speed variant with path output

## `[x]` greedy.md

Reformatted to standard `### N. Title` + bold Approach/Complexity/Duplicate-problems structure, worked examples and constraints added to all 4 entries.

- Non-overlapping Intervals (LC 435) - interval scheduling, minimize removals
  - Minimum Number of Arrows to Burst Balloons (LC 452) - WebSearch-verified, identical sort-by-end greedy
- Assign Cookies (LC 455) - sort-then-two-pointer greedy
  - Maximum Matching of Players With Trainers (LC 2410), Boats to Save People (LC 881) - WebSearch-verified
- Minimum Cost to Connect Sticks (LC 1167) - heap-driven dynamic priority
  - no dup-line added: "Minimum Cost to Merge Stones" (LC 1000) surfaced in search but is interval DP on adjacent-k groups, not the same heap-greedy technique - correctly left with no dup-list rather than padded
- Jump Game (LC 55) - greedy reachability, "stays ahead"
  - Jump Game II (LC 45) - WebSearch-verified, same frontier-tracking mechanic extended to count jumps

## `[x]` heapsort.md

- Sort an Array - heapsort in place
- Kth Largest Element - partial heapsort
- Sort a Nearly Sorted Array - heap of window size
- Last Stone Weight - repeated extract-max, ruled distinct from Kth Largest (push-back-and-reinsert changes the loop invariant)

## `[x]` insertion-sort.md

- Sort an Array (small/nearly sorted) - insertion sort
  - (none found)
- Insertion Sort List - insertion into a linked list
  - (none found)
- Sort a K-Sorted Array - bounded displacement
  - (none found at verified confidence - note: the well-known accepted solution to this problem is actually min-heap O(n log k), not repeated insertion; worth a wording check at fix time)
- Insert Interval - insertion into a sorted sequence
  - Merge Intervals (LC 56)

## `[x]` kadane.md

- Maximum Subarray (LC 53)
  - Maximum Sum Circular Subarray (LC 918), Maximum Subarray Sum with One Deletion (LC 1186)
- Maximum Sum Circular Subarray (LC 918)
  - Maximum Sum of Two Non-Overlapping Subarrays (LC 1031)
- Maximum Product Subarray (LC 152)
  - Maximum Absolute Value Expression (LC 1131), Minimum Product Subarray (classic, no LC number)

## `[x]` longest-common-subsequence.md

- Longest Common Subsequence (LC 1143)
  - Uncrossed Lines (LC 1035)
- Edit Distance (LC 72)
  - One Edit Distance (LC 161)
- Delete Operation for Two Strings (LC 583)
  - Shortest Common Supersequence (LC 1092), Minimum ASCII Delete Sum (LC 712)

## `[x]` longest-increasing-subsequence.md

- Longest Increasing Subsequence (LC 300)
  - Longest String Chain (LC 1048), Largest Divisible Subset (LC 368)
- Russian Doll Envelopes (LC 354)
  - Maximum Length of Pair Chain (LC 646) - contrast case, greedy suffices there
- Maximum Length of Pair Chain (LC 646)
  - Non-overlapping Intervals (LC 435)

## `[x]` lowest-common-ancestor.md

- Lowest Common Ancestor of a Binary Tree - recursive one-pass
  - LCA of a Binary Tree III (LC 1650), Smallest Common Region (LC 1257)
- Lowest Common Ancestor of a BST - ordering shortcut
  - Two Sum IV - Input is a BST (LC 653) - same recognition, different query
- Kth Ancestor of a Tree Node - binary lifting
  - Binary Lifting for LCA (this article's own core algorithm, different query on the same table)

## `[x]` manacher-algorithm.md

- Longest Palindromic Substring
  - Longest Palindromic Substring II (multi-query variant), Palindromic Substrings Count (LC 647)
- Shortest Palindrome (prepend minimum characters)
  - Shortest Palindrome via KMP failure function - different technique, same problem
- Palindromic Substrings Count with Length Constraint
  - Count Palindromic Substrings within `[minLen, maxLen]`
- **New 4th entry to add:** Palindrome Partitioning II (LC 132) - P[] as an O(1) palindrome-check oracle feeding a separate min-cuts DP, distinct usage pattern from entries 1-3's direct P[] reads

## `[x]` merge-sort.md

- Sort an Array - merge sort from scratch
- Count of Smaller Numbers After Self OR Count Inversions - pick one as full entry (both are merge-step cross-pair counting, same core invariant); Count Inversions is the more canonical pick
  - the other, folded in as a dup-line
- Merge k Sorted Lists - k-way merge

## `[x]` modular-arithmetic.md

- Fibonacci Number (large n) OR Pow(x, n) - pick one as full entry (both are binary exponentiation, matrix vs scalar, ruled not distinct)
  - the other, folded in as a dup-line
- Count Vowel Permutations (LC 1220) - mod-DP counting
- Combination Sum IV / nCr mod p - factorial-inverse nCr

Note: sibling article `modular-exponentiation.md` has the same Pow(x,n)/Fibonacci-matrix-expo pair - worth checking at fix time whether the two articles' surviving entries should also differ from each other, not just be internally consistent.

## `[x]` modular-exponentiation.md

- Pow(x, n) (LC 50) OR Fibonacci Number for large n (matrix exponentiation) - pick one as full entry, same collision as `modular-arithmetic.md` above
  - the other, folded in as a dup-line
- Fermat's last step - modular inverse for combinations

## `[x]` quicksort.md

- Sort an Array - quicksort with a randomized pivot
  - (none found - close relatives already claimed by entries below)
- Kth Largest Element - quickselect
  - Top K Frequent Elements (LC 347, quickselect-on-frequency variant)
- Sort Colors - three-way partition
  - Partition Array According to Given Pivot (LC 2161)
- Wiggle Sort II - quickselect + three-way partition
  - (none found)

## `[x]` rabin-karp.md

- Find all anagrams in a string - rolling hash over character counts
  - Permutation in String (LC 567)
- Repeated DNA sequences - multi-pattern via hash set
  - Find All Anagrams in a String (LC 438), Contains Duplicate (LC 217, degenerate case)
- Longest duplicate substring - binary search + rolling hash
  - Longest Duplicate Substring (LC 1044, same problem), Longest Repeated Substring (SPOJ REPSTR)

## `[x]` radix-sort.md

- Sort an Array of Large Integers - LSD radix sort
  - (none found)
- Maximum Gap - radix sort then scan
  - (none - genuinely singular, verified)
- Sort Strings of Equal Length - MSD vs LSD radix
  - (none found)
- Maximum Number from Concatenation - digit-aware ordering
  - (none found)

## `[x]` recursion.md

- Fibonacci Number (LC 509)
  - Climbing Stairs (LC 70), Tribonacci (LC 1137), N-th Tribonacci Number
- Reverse a Linked List (LC 206)
  - Swap Nodes in Pairs (LC 24), Reverse Linked List II (LC 92)
- Pow(x, n) - Fast Exponentiation (LC 50)
  - Super Pow (LC 372). ~~Sqrt(x) (LC 69)~~ - dropped, not actually the same technique (own text admitted it uses binary search instead)
- Generate Parentheses (LC 22)
  - Letter Combinations of a Phone Number (LC 17), Combination Sum (LC 39)
- Maximum Depth of Binary Tree (LC 104)
  - Balanced Binary Tree (LC 110), Diameter of Binary Tree (LC 543), Path Sum (LC 112)

## `[x]` sieve-of-eratosthenes.md

- Count Primes (LC 204)
  - Four Divisors (LC 1390)
- Prime Factorization via Smallest Prime Factor
  - Smallest Factorization (LC 625)
- Prime Range Query (segmented sieve)
  - Closest prime pairs in a range (contest variants)
- **New 4th entry to add:** linear-sieve `omega[i]`-tracking (count of numbers ≤ N with exactly K distinct prime factors) - derives the multiplicative function inline during the sieve pass, distinct from entry 2's post-hoc per-query SPF lookup

## `[x]` string-hashing.md

- Longest Duplicate Substring
  - Longest Common Substring of two strings, Distinct Substrings Count
- Shortest Palindrome (via string hashing)
  - Palindrome Pairs
- Distinct Echo Substrings
  - Repeated Substring Pattern (LC 459)

## `[x]` string-matching.md

- Implement strStr() (LC 28) - canonical KMP search
- Repeated Substring Pattern (LC 459) - failure function's period trick
- Shortest Palindrome (LC 214) - KMP on `s + # + reverse(s)`
- Longest Happy Prefix (LC 1392) - the failure function itself

(These 4 entries are themselves the complete well-known KMP-failure-function LC family - verified via WebSearch. No external dup-lines exist to add.)

## `[x]` strongly-connected-components.md

- Number of Provinces (LC 547)
  - Number of Connected Components (LC 323), Graph Valid Tree (LC 261)
- Critical Connections in a Network (LC 1192)
  - Articulation Points (classic)
- Largest Component Size by Common Factor (LC 952)
  - Accounts Merge (LC 721), Redundant Connection (LC 684)
- Find Eventual Safe States (LC 802) - full Tarjan+condensation pipeline (see cross-file note under `dfs.md` above - kept in both files intentionally)
  - Course Schedule II (LC 210), Detect Cycles in a Directed Graph (classic)

---

## Unwritten (stub) files - not audited, tracked for completeness

Heading present, section body is only the authoring-instruction HTML comment placeholder, no real entries yet. Not in scope until written.

- [ ] `bellman-ford.md`
- [ ] `bucket-sort.md`
- [ ] `floyd-warshall.md`
- [ ] `minimum-spanning-tree.md`
- [ ] `quickselect.md`
- [ ] `selection-sort.md`
- [ ] `topological-sort.md`
- [ ] `z-algorithm.md`

---

## Out of scope

`maximum-flow.md`, `number-theory.md`, `sorting.md` - overview/category-index articles, no `## Practice problems` section at all.

---

## Cross-file finding: worked-examples block missing, all 34 written files above

No entry in any file above has the spec-required nested Input/Output/Explanation block; Constraints is inlined into problem-statement prose instead of its own line (sole partial exception: `divide-and-conquer.md`). Predates decision 9 - these articles were written before that format landed and were never retrofitted, unlike Patterns' 23 files. One fix pass needed across all 34 files, tracked here rather than per-file.
