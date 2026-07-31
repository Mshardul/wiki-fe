# DSA Worked Problems Dedup - Data Structures Sweep Inventory

Per-file target problem list for each Data Structures article's `## Practice problems` section, audited against the merged U6 spec (`dsa-writer.md`) and the distinct-technique constraint (main plan decision 4). Same format as `dsa-worked-problems-dedup-inventory.md` (Patterns) and `dsa-worked-problems-dedup-algo-inventory.md` (Algorithms). Nested bullets are duplicate-problems entries - same technique as the parent, cited in the article's `**Duplicate problems:**` line, not a full worked entry.

Status: `[ ]` not yet applied to the content file, `[x]` applied - matches `content/dsa/data-structures/<file>.md`.

---

## `[x]` array.md

- Trapping Rain Water - converging two pointers, advance the shorter side
  - Container With Most Water (LC 11)
- Next Permutation - pivot scan + suffix reverse
  - Previous Permutation With One Swap (LC 1053)
- Maximum Subarray - Kadane's DP
  - Maximum Sum Circular Subarray (LC 918), Maximum Product Subarray (LC 152)
- Minimum Size Subarray Sum - sliding window
  - Minimum Window Substring (LC 76)

## `[x]` avl-tree.md

- Insert into an AVL tree - rebalance on the way up via rotation cases
  - Balance a Binary Search Tree (LC 1382)
- Validate height-balanced - bottom-up height computation with early-exit sentinel
- Build a balanced BST from sorted data - static midpoint construction
  - Convert Sorted List to Binary Search Tree (LC 109)
- AVL delete with rebalance-on-removal - multi-ancestor rebalance on the way back up

Not in scope: `balanced-bst.md` (overview/category page, no Practice problems section).

## `[x]` b-plus-tree.md

- Range query on a sorted structure - leaf-descent + linked-leaf sequential walk
  - Count of numbers in a range (LC 2250), Find first and last position of element in sorted array (LC 34)
- Design an index for a database column - range-workload tradeoff reasoning
  - Design a key-value store with range queries
- Insert-with-leaf-split (copy-up)

## `[x]` b-tree.md

- Why B-trees for databases - memory-hierarchy/seek-count reasoning (conceptual, no code by design)
- B-tree search - multi-key-node descent
- Choose the order for a disk block - sizing arithmetic for fan-out/height (conceptual)
- B-tree vs B+-tree for range scans - linked-leaf sequential scan vs hop-around reasoning (conceptual)
- Insert-with-node-split (median push-up)

## `[x]` binary-search-tree.md

- Validate Binary Search Tree - bounded interval recursion
- Kth Smallest Element in a BST - iterative in-order with early-exit counting
  - Binary Search Tree Iterator (LC 173)
- Lowest Common Ancestor of a BST - ordering-based split-point shortcut
  - Lowest Common Ancestor of a Binary Search Tree III (LC 1650)
- Insert into a BST - recursive descent to null child
- Convert Sorted Array to BST - balanced build via midpoint divide-and-conquer
  - Convert Sorted List to Binary Search Tree (LC 109)
- Delete Node in a BST (LC 450) - two-child successor-replacement
  - Delete Leaves With a Given Value (LC 1325)

## `[x]` binary-tree.md

- Maximum Depth of Binary Tree - post-order recurse-and-combine
  - Minimum Depth of Binary Tree (LC 111)
- Binary Tree Level Order Traversal - BFS with per-level queue-length snapshot
  - Binary Tree Zigzag Level Order Traversal (LC 103)
- Invert Binary Tree - recursive child-swap
- Diameter of Binary Tree - tree DP, track max leftH+rightH globally
  - Binary Tree Maximum Path Sum (LC 124)
- Lowest Common Ancestor - recursive search, bubble up at split point
  - Lowest Common Ancestor of a Binary Tree II (LC 1644)

## `[x]` bloom-filter.md

- Design a Web Crawler URL Deduplication System - bloom filter sizing under memory budget
  - Design a spam filter for email deduplication
- First Missing Positive - index-as-presence marking (intentional "when NOT to use a bloom filter" counter-example)
  - Find the duplicate number in [1..n] O(1) space (LC 287)
- Design a Counting Bloom Filter with Delete - counters replace bits, saturation/overflow handling
  - Design a rate limiter with sliding-window probabilistic eviction
- Design a Spell Checker - static-set FP-asymmetry sizing
  - Design a username availability checker

## `[x]` deque.md

- Sliding Window Maximum - decreasing monotonic deque of indices
  - Jump Game VI (LC 1696)
- Design Circular Deque - ring buffer, both-end wrap arithmetic
  - Design Circular Queue (LC 622)
- Shortest Subarray with Sum at Least K - increasing monotonic deque over prefix sums
- Sliding Window Median - two-heap order-statistic (intentional "deque is not enough" counter-example)
  - Find Median from Data Stream (LC 295)

## `[x]` dynamic-array.md

- Implement a Dynamic Array from Scratch - grow-and-shrink resize policy
  - Design a ArrayList / Vector class
- O(1) Removal at an Arbitrary Index - swap-with-last-then-pop
- Amortized Copy-Count Walkthrough - aggregate-method proof by simulation
- Growth Factor Comparison - geometric vs fixed-increment resizing
- Insert Delete GetRandom O(1) - swap-with-last + index map
  - Insert Delete GetRandom O(1) - Duplicates allowed (LC 381)
- Min Stack - parallel auxiliary buffer
  - Max Stack (design variant)
- Implement Queue using Stacks - amortized analysis across two buffers
  - Implement Stack using Queues (LC 225)

## `[x]` fenwick-tree.md

- Range Sum Query - Mutable (LC 307) - point-update + range-sum BIT
  - Range Sum Query 2D - Mutable (LC 308)
- Count of Smaller Numbers After Self (LC 315) - BIT as order-statistics/rank structure
  - Reverse Pairs (LC 493)
- Range Addition/Range Update and Range Sum (LC 370-style) - two-BIT range-update/range-query trick
  - Range Addition (LC 370)

## `[x]` graph.md

- Number of Islands (LC 200) - BFS/DFS connected components on grid
  - Flood Fill (LC 733)
- Clone Graph (LC 133) - BFS + hashmap original-to-clone
  - Copy List with Random Pointer (LC 138)
- Course Schedule (LC 207) - DFS three-color cycle detection / topo sort
  - Course Schedule II (LC 210)
- Network Delay Time (LC 743) - weighted shortest path / Dijkstra
  - Path with Minimum Effort (LC 1631)

## `[x]` hash-table.md

- Two Sum - complement lookup via seen-map
  - Two Sum IV - Input is a BST (LC 653)
- Group Anagrams - canonical key bucketing
- Longest Consecutive Sequence - set membership, run-start detection
- Subarray Sum Equals K - prefix sum + hashmap of counts
  - Contiguous Array (LC 525)
- First Unique Character - two-pass frequency map

## `[x]` heap.md

- Kth Largest Element in a Stream - bounded min-heap of size k
  - Kth Largest Element in an Array (LC 215)
- Top K Frequent Elements - min-heap of size k keyed on frequency
  - Top K Frequent Words (LC 692)
- Merge K Sorted Lists - k-way merge with heap of current heads
  - Kth Smallest Element in a Sorted Matrix (LC 378)
- Find Median from Data Stream - two balanced heaps
  - Sliding Window Median (LC 480)
- Swim in Rising Water (LC 778) - Dijkstra / heap-based shortest path
  - Path with Minimum Effort (LC 1631)

## `[x]` interval-tree.md

- My Calendar I - interval tree insert + overlap search
  - My Calendar II (LC 731)
- Find All Conflicting Meetings - multi-result overlap query via `max_hi` pruning
  - Remove Interval (LC 1272)
- Employee Free Time - multi-interval merge via tree sweep
  - Insert Interval (LC 57)

## `[x]` lfu-cache.md

- LFU Cache - frequency buckets + min_freq pointer, O(1)
- All O`one` Data Structure - two-sided bucketed counts, O(1) min/max
- Top K Frequent Elements - static bucket sort by frequency
  - Top K Frequent Words (LC 692)
- Maximum Frequency Stack (LC 895) - live frequency-bucket eviction with LIFO tie-break
- LRU Cache - recency-only hashmap+OrderedDict, intentional contrast entry

## `[x]` linked-list.md

- Reverse a Linked List - iterative pointer rewiring
  - Reverse Linked List II (LC 92)
- Linked List Cycle II - Floyd's tortoise and hare
  - Find the Duplicate Number (LC 287) - identical Floyd's-cycle technique
- Merge Two Sorted Lists - dummy head + splice
  - Merge Sorted Array (LC 88)
- Remove Nth Node From End - two-pointer gap trick
- LRU Cache - hashmap + doubly linked list O(1)

## `[x]` lru-cache.md

- LRU Cache - map + doubly linked list, O(1)
- LFU Cache - frequency buckets, O(1), intentional contrast entry
- LRU Cache with TTL - map + DLL splice with expiry-on-access

## `[x]` queue.md

- Implement Queue using Stacks - two-stack amortized transfer
  - Implement Stack using Queues (LC 225)
- Number of Recent Calls (LC 933) - sliding-window queue, evict stale front
- Sliding Window Maximum (LC 239) - monotonic decreasing deque of indices
  - Shortest Subarray with Sum at Least K (LC 862)
- Rotting Oranges (LC 994) - multi-source BFS seeded from all sources at once
  - 01 Matrix (LC 542)
- Design Circular Queue (LC 622) - ring buffer, front index + size
  - First Unique Character in a Stream - queue-based stale-front eviction, no LRU-specific mechanism

## `[x]` red-black-tree.md

- Why libraries pick red-black over AVL - reasoning/trade-off, no code by design
- Verify red-black properties (LC 444) - recursive black-height check with sentinel violation signal
- Red-black insert fixup - recolor-then-rotate via uncle-color case analysis
- Order-statistics with a red-black tree - subtree-size augmentation for select/rank
  - Count of Smaller Numbers After Self (LC 315)

## `[x]` skip-list.md

- Design Skip List (LC 1206) - multi-level linked list, randomized tower height + update-array splice
  - Design a Sorted Set / Ordered Map from scratch
- Range Sum Query with Frequent Insert/Delete - span-augmented rank/order-statistics query
  - Count of Smaller Numbers After Self (LC 315)
- LRU-style Ordered Eviction by Score (Redis ZSET-style design) - hash table + skip list composition
  - Design A Leaderboard (LC 1244)

## `[x]` stack.md

- Valid Parentheses (LC 20) - LIFO bracket matching
  - Remove All Adjacent Duplicates In String (LC 1047)
- Daily Temperatures (LC 739) - decreasing monotonic stack of indices
  - Next Greater Element I (LC 496)
- Min Stack (LC 155) - auxiliary stack tracking running min
  - Max Stack (LC 716)
- Evaluate Reverse Polish Notation (LC 150) - operand stack, pop-two-apply-push
- Largest Rectangle in Histogram (LC 84) - increasing monotonic stack with width calc via stored indices
  - Maximal Rectangle (LC 85)

## `[x]` string.md

- Valid Anagram (LC 242) - 26-length count array
  - same problem/technique as `patterns/frequency-array.md`'s entry 1
- Longest Substring Without Repeating Characters (LC 3) - expanding/contracting sliding window with last-seen index map
  - same problem/technique as `patterns/sliding-window.md`'s entry 2
- Valid Palindrome (LC 125) - converging two pointers
  - same problem/technique as `patterns/two-pointers.md`'s entry 5
- Find All Anagrams in a String (LC 438) - fixed-size sliding window + count-array match
  - same problem/technique as `patterns/frequency-array.md`'s entry 3 and `algorithms/rabin-karp.md`'s entry 1
- Implement strStr (LC 28) - rolling hash (Rabin-Karp)
  - same problem/technique as `algorithms/string-matching.md`'s entry 1

## `[x]` suffix-array.md

- Longest repeated substring - LCP-array max
  - Longest Duplicate Substring (LC 1044)
- Number of distinct substrings - `n(n+1)/2 - sum(LCP)`
  - Distinct Substrings (SPOJ DISUBSTR)
- Longest common substring of two strings - concatenate with separator, cross-string adjacent-suffix LCP
  - Longest Common Substring (SPOJ LCS)

## `[x]` suffix-tree.md

- Longest Repeated Substring (via suffix tree) - deepest internal node by string-depth
- Count Distinct Substrings (via suffix tree) - sum of edge-label lengths across tree
- Longest Common Substring Across k Strings (Generalized Suffix Tree) - bitmask-per-node bottom-up DFS

## `[x]` treap.md

- Design a Sorted Set with Fast Rank Queries - subtree-size augmentation for rank(x)
  - Order-Statistics Tree (k-th smallest)
- Range Reverse and Query (Implicit Treap) - position-keyed implicit treap with lazy reverse flag, split/merge
  - Codeforces range-reverse variants
- Merge Two Treaps / Union of Two Sorted Sets - priority-based recursive merge
  - Union of Two Balanced BSTs (weight-balanced join)

## `[x]` trie.md

- Implement a Trie (LC 208) - children-map node + is_end flag, prefix walk
  - Map Sum Pairs (LC 677)
- Word Search II (LC 212) - trie + DFS-on-grid with prefix pruning
- Replace Words (LC 648) - shortest-prefix lookup, stop at first is_end
- Maximum XOR of Two Numbers (LC 421) - bitwise trie, greedy opposite-bit walk
  - Maximum XOR With an Element From Array (LC 1707)
- Design Add and Search Words (LC 211) - wildcard DFS, branch on `.`

## `[x]` union-find.md

- Number of Connected Components in an Undirected Graph (LC 323) - decremental component counter on union
  - Number of Provinces (LC 547)
- Kruskal's MST - edge-sort + DSU cycle detection
  - Min Cost to Connect All Points (LC 1584)
- Accounts Merge (LC 721) - DSU over implicit shared-property grouping
  - Sentence Similarity II (LC 737)
- Redundant Connection (LC 684) - per-edge cycle-detection gate before union
  - Redundant Connection II (LC 685)
- Satisfiability of Equality Equations (LC 990) - two-pass union-then-check equality propagation

---

## Unwritten (stub) files - not audited, tracked for completeness

Heading present, section body is only the authoring-instruction HTML comment placeholder, no real entries yet. Not in scope until written.

- [ ] `circular-buffer.md`
- [ ] `hash-set.md`
- [ ] `segment-tree.md`

---

## Out of scope

- `balanced-bst.md` - overview/category-index article, no Practice problems section at all.
