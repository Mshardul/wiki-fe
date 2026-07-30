# DSA Worked Problems Dedup - Problem Inventory

Per-file target problem list for each Patterns article's merged `## Practice problems` section. Each list applies the distinct-technique constraint (`dsa-writer.md` U6 / main plan decision 4): every problem in a section must exercise a different core mechanic, regardless of surface framing. Nested bullets are duplicate-problems entries - same technique as the parent, cited in the article's `**Duplicate problems:**` line, not a full worked entry.

Status: `[ ]` not yet applied to the content file, `[x]` applied - matches `content/dsa/patterns/<file>.md`.

---

## Cross-file notes

- **LC 239 (Sliding Window Maximum)** is a full entry in both `sliding-window.md` and `monotonic-queue.md` - each teaches it through a different lens (window+deque combo vs deque as the core primitive), so it isn't single-homed.
- **Rotting Oranges (LC 994)** lives only in `matrix-traversal.md` (dup-line under Pacific Atlantic Water Flow) - it's grid-shaped multi-source BFS, not `tree-graph-traversal.md`'s territory.

---

## `[x]` two-pointers.md

- Two Sum II - Input Array Is Sorted (LC 167) - opposite-ends convergence to a target sum
  - Two Sum IV - Input is a BST (LC 653), Sum of Square Numbers (LC 633)
- Trapping Rain Water (LC 42) - opposite-ends greedy, running max per side
  - Container With Most Water (LC 11)
- Remove Duplicates from Sorted Array (LC 26) - same-direction write-head compaction
  - Remove Duplicates from Sorted Array II (LC 80), Move Zeroes (LC 283), Remove Element (LC 27)
- 3Sum (LC 15) - fixed outer pointer + inner two-pointer, N-sum reduction
  - 4Sum (LC 18), 3Sum Closest (LC 16)
- Valid Palindrome (LC 125) - opposite-ends with skip-while-invalid + compare
  - Valid Palindrome II (LC 680), Longest Palindromic Substring (LC 5)

---

## `[x]` sliding-window.md

- Maximum Sum Subarray of Size K - fixed-size window, no shrink/grow
  - Maximum Average Subarray I (LC 643), Subarray Product Less Than K (LC 713)
- Longest Substring Without Repeating Characters (LC 3) - variable window, shrink-on-violation (set membership)
  - Longest Substring with At Most Two Distinct Characters (LC 159), Longest Substring with At Most K Distinct Characters (LC 340), Longest Repeating Character Replacement (LC 424), Fruit Into Baskets (LC 904), Max Consecutive Ones III (LC 1004)
- Minimum Window Substring (LC 76) - variable window, shrink-while-still-valid (coverage/count constraint)
  - Smallest Range Covering Elements from K Lists (LC 632), Substring with Concatenation of All Words (LC 30)
- Sliding Window Maximum (LC 239) - window + monotonic deque for running extremum
  - Jump Game VI (LC 1696), Constrained Subsequence Sum (LC 1425)
- Subarrays with K Different Integers (LC 992) - `atMost(k) - atMost(k-1)` counting trick
  - Binary Subarrays With Sum (LC 930), Count Number of Nice Subarrays (LC 1248)

---

## `[x]` fast-slow-pointers.md

- Linked List Cycle (LC 141) - Floyd's cycle detection, existence only
  - Happy Number (LC 202), Find the Duplicate Number (LC 287)
- Linked List Cycle II (LC 142) - Floyd's + find cycle start
  - Linked List Cycle (LC 141)
- Middle of the Linked List (LC 876) - slow/fast for midpoint, no cycle involved
- Palindrome Linked List (LC 234) - composes midpoint-finding + in-place reversal + compare
  - Reorder List (LC 143), Middle of the Linked List (LC 876)

---

## `[x]` in-place-reversal.md

Palindrome Linked List not included here - full entry lives in `fast-slow-pointers.md`.

- Reverse Linked List (LC 206) - iterative 3-pointer full reversal
  - Reverse String (LC 344), Reverse Words in a String III (LC 557)
- Reverse Linked List II (LC 92) - bounded-range reversal (splice reversed sublist back in)
  - Rotate List (LC 61)
- Reverse Nodes in k-Group (LC 25) - repeated bounded reversal in fixed-size chunks
  - Swap Nodes in Pairs (LC 24)
- Reorder List (LC 143) - find-middle + reverse-second-half + merge-interleave
  - Interleaving two lists (variant)

---

## `[x]` merge-intervals.md

- Merge Intervals (LC 56) - sort by start, merge overlapping in one sweep
  - Insert Interval (LC 57), Employee Free Time (LC 759), Merge Sorted Array (LC 88)
- Meeting Rooms II (LC 253) - sweep-line with a running concurrency counter
  - Car Pooling (LC 1094)
- Non-overlapping Intervals (LC 435) - greedy sort-by-end, count removals to eliminate overlap
  - Minimum Number of Arrows to Burst Balloons (LC 452)
- Interval List Intersections (LC 986) - two-pointer walk across two already-sorted interval lists
  - Merge Sorted Array (LC 88), Find Right Interval (LC 436)

---

## `[x]` matrix-traversal.md

- Number of Islands (LC 200) - DFS/BFS flood-fill component counting
  - Max Area of Island (LC 695), Number of Connected Components in an Undirected Graph (LC 323)
- Shortest Path in Binary Matrix (LC 1091) - single-source BFS shortest path on a grid
  - Minimum Knight Moves (LC 1197), Jump Game IV (LC 1345)
- Pacific Atlantic Water Flow (LC 417) - multi-source BFS, two reverse-flow passes + intersection
  - Walls and Gates (LC 286), Rotting Oranges (LC 994)
- Shortest Path in a Grid with Obstacles Elimination (LC 1293) - state-augmented BFS (position + remaining budget)
  - Minimum Obstacle Removal to Reach Corner (LC 2290), Cut Off Trees for Golf Event (LC 675)

---

## `[x]` tree-graph-traversal.md

- Binary Tree Level Order Traversal (LC 102) - BFS level-by-level, queue-size-snapshot technique
  - Binary Tree Right Side View (LC 199), Average of Levels in Binary Tree (LC 637), Find Bottom Left Tree Value (LC 513)
- Clone Graph (LC 133) - DFS/BFS with a visited-map for node identity preservation
  - Copy List with Random Pointer (LC 138)
- Course Schedule (LC 207) - topological ordering via DFS cycle detection (3-color state)
  - Course Schedule II (LC 210)
- Path Sum II (LC 113) - DFS with backtracking path accumulation (root-to-leaf, undo on return)
  - Path Sum (LC 112), Binary Tree Maximum Path Sum (LC 124)
- Number of Provinces (LC 547) - connected components via DFS on an adjacency-matrix graph
  - Number of Islands (LC 200, full entry in `matrix-traversal.md`), Number of Connected Components in an Undirected Graph (classic)

---

## `[x]` prefix-sum.md

- Range Sum Query - Immutable (LC 303) - static precompute, O(1) range query
  - Range Sum Query 2D - Immutable (LC 304), Running Sum of 1d Array (LC 1480)
- Subarray Sum Equals K (LC 560) - prefix-sum + hashmap, count pairs with a target difference
  - Subarray Sums Divisible by K (LC 974), Continuous Subarray Sum (LC 523)
- Product of Array Except Self (LC 238) - two-pass prefix/suffix product accumulation (no division)
  - Trapping Rain Water (LC 42), Range Sum Query - Immutable (LC 303)

---

## `[x]` difference-array.md

- Range Addition (LC 370) - classic diff array: `+val` at start, `-val` at end+1, prefix-sum to materialize
  - Corporate Flight Bookings (LC 1109), Points That Intersect With Cars (LC 2848)
- Meeting Rooms II (LC 253) - diff-array-as-event-sweep (treat interval start/end as +1/-1 delta events)
  - Divide Intervals Into Minimum Number of Groups (LC 2406), Car Pooling (LC 1094)
- Number of Flowers in Full Bloom (LC 2251) - per-flower +1/-1 delta, answered via binary search on sorted start/end lists instead of a materialized array
  - Meeting Rooms II (LC 253)

---

## `[x]` monotonic-stack.md

- Next Greater Element I (LC 496) - decreasing stack, resolve-on-pop for "next greater to the right"
  - Daily Temperatures (LC 739), Next Greater Element II (LC 503), Online Stock Span (LC 901)
- Largest Rectangle in Histogram (LC 84) - stack tracks span between resolved boundaries, area on pop
  - Maximal Rectangle (LC 85)
- Trapping Rain Water (LC 42) - stack-based, resolve trapped volume between two walls on pop
  - Largest Rectangle in Histogram (LC 84) - same "resolve on pop, span-based quantity" shape, applied to area instead of volume
- Remove K Digits (LC 402) - monotonic stack as a greedy digit-removal builder (increasing stack, remove-on-violation)
  - Remove Duplicate Letters (LC 316), Create Maximum Number (LC 321)

---

## `[x]` monotonic-queue.md

- Sliding Window Maximum (LC 239) - monotonic deque, O(1) amortized window-max
  - Jump Game VI (LC 1696), Constrained Subsequence Sum (LC 1425), Sliding Window Minimum (LC-adjacent), Maximum of Minimums of Every Window Size (GfG)
- Shortest Subarray with Sum at Least K (LC 862) - monotonic deque over prefix sums, no fixed window size
  - Subarray Sum Equals K (LC 560)
- Longest Continuous Subarray With Absolute Diff ≤ Limit (LC 1438) - dual monotonic deques (increasing + decreasing) jointly gating a variable window
  - Subarrays with Bounded Max/Min variants (interview-staple rephrasing)

---

## `[x]` k-way-merge.md

- Merge K Sorted Lists (LC 23) - min-heap over K list-heads, pop/push one step at a time
  - Merge K Sorted Arrays (classic), Merge Two Sorted Lists (LC 21), Merge Sorted Array (LC 88), Sort List (LC 148)
- Kth Smallest Element in a Sorted Matrix (LC 378) - min-heap over row/column frontier (grid treated as K sorted rows)
  - Kth Smallest in Multiplication Table (LC 668)
- Smallest Range Covering Elements from K Lists (LC 632) - min-heap + running max, shrink range as heap advances
- Find K Pairs with Smallest Sums (LC 373) - heap over lazily-generated index-pairs, not literal input lists

---

## `[x]` top-k-elements.md

- Kth Largest Element in an Array (LC 215) - fixed-size min-heap (or quickselect) over a static array
  - Kth Largest Element in a Stream (LC 703), Top K Frequent Elements (LC 347), Find K Pairs with Smallest Sums (LC 373, full entry in `k-way-merge.md`)
- Top K Frequent Elements (LC 347) - count first, then heap/bucket by frequency
  - Top K Frequent Words (LC 692), Sort Characters By Frequency (LC 451)
- K Closest Points to Origin (LC 973) - heap keyed by a computed distance rather than the raw value
  - Kth Smallest Element in a Sorted Matrix (LC 378, full entry in `k-way-merge.md`), Find K Closest Elements (LC 658)

---

## `[x]` two-heaps.md

- Find Median from Data Stream (LC 295) - two heaps (max-heap low half, min-heap high half), balance invariant
  - Running Average of Data Stream (not on LC), Kth Largest Element in a Stream (LC 703)
- Sliding Window Median (LC 480) - two heaps + lazy deletion, median over a fixed-size sliding window instead of an ever-growing stream
  - Maximum of Sliding Window (LC 239), Minimum Window Substring (LC 76)
- IPO (LC 502) - max-heap of "unlocked" projects, gated by a min-heap/sort of capital requirements
  - Reorganize String (LC 767)

---

## `[x]` binary-search-on-answer.md

- Koko Eating Bananas (LC 875) - binary search on answer space, "minimize the maximum", feasibility = ceiling-sum
  - Capacity To Ship Packages Within D Days (LC 1011), Split Array Largest Sum (LC 410), Find the Smallest Divisor Given a Threshold (LC 1283), Minimum Speed to Arrive on Time (LC 1870)
- Minimum Number of Days to Make m Bouquets (LC 1482) - binary search on answer, feasibility = greedy grouping/counting
- Magnetic Force Between Two Balls (LC 1552) - "maximize the minimum" mirror direction (mid rounds up, `lo=mid`/`hi=mid-1`)
  - Divide Chocolate (LC 1231)

---

## `[x]` modified-binary-search.md

- Search in Rotated Sorted Array (LC 33) - identify sorted half, decide which half to search
  - Search in Rotated Sorted Array II (LC 81), Find Minimum in Rotated Sorted Array (LC 153), Find Minimum in Rotated Sorted Array II (LC 154)
- Find Peak Element (LC 162) - binary search using local slope (compare mid to neighbor) instead of exact-match
  - Peak Index in a Mountain Array (LC 852), Find in Mountain Array (LC 1095), Find Peak Element in 2D Matrix (LC 1901)
- Find First and Last Position of Element in Sorted Array (LC 34) - lower-bound/upper-bound binary search (bisect_left/right)
  - Search Insert Position (LC 35), Count of Range Sum (LC 327), Time Based Key-Value Store (LC 981), Find Right Interval (LC 436), Online Election (LC 911)
- Search a 2D Matrix (LC 74) - flatten 2D index to 1D, single binary search
  - Search a 2D Matrix II (LC 240) - different algorithm (O(m+n) staircase from a corner), same problem shape

---

## `[x]` frequency-array.md

- Valid Anagram - fixed-alphabet frequency array, symmetric increment/decrement compare-to-zero
  - Ransom Note (LC 383), Check if Two String Arrays are Equivalent (LC 1662)
- Group Anagrams (LC 49) - frequency array converted to a hashable tuple, used as a grouping key
  - Find All Duplicates via Anagram Signature (informal variant)
- Find All Anagrams in a String (LC 438) - sliding window + frequency array, mismatch-counter equality check
  - Permutation in String (LC 567), Minimum Window Substring (LC 76)
- Sort Characters By Frequency (LC 451) - frequency-of-frequencies (bucket sort by count)
  - Top K Frequent Elements (LC 347), Top K Frequent Words (LC 692), Reorganize String (LC 767)

---

## `[x]` backtracking.md

- N-Queens (LC 51) - static conflict-set pruning (columns/diagonals), place-row-by-row
- Sudoku Solver (LC 37) - find-one short-circuit + MRV dynamic reordering + constraint propagation
- Combination Sum (LC 39) - unbounded reuse with a start-index to prevent permutation duplicates
- Restore IP Addresses (LC 93) - bounded-depth partition (exactly 4 cuts)
- Word Break II (LC 140) - backtracking + memoized suffix cache (bridge to DP)
  - Word Break (LC 139)
- Palindrome Partitioning (LC 131) - partition backtracking gated by a per-cut palindrome predicate
  - Palindrome Partitioning II (LC 132, DP version once only a count is needed)

---

## `[x]` graph-coloring.md

- Is Graph Bipartite? (LC 785) / Possible Bipartition (LC 886) - 2-coloring via BFS/DFS, conflict on same-color adjacency
  - Divide Nodes into the Maximum Number of Groups (LC 2493), Number of Connected Components (mutual cross-refs)
- Flower Planting With No Adjacent (LC 1042) - greedy k-coloring (assign first available color), bounded-degree guarantee
  - Graph Coloring general formulation (classic)
- Chromatic Number (bitmask DP over independent sets, n≤20, no LC citation) - exact minimum-colors via DP over subsets, distinct from both 2-coloring and greedy k-coloring

---

## `[x]` interval-dp.md

- Burst Balloons (LC 312) - split-point-combine, `dp[i][j]` chosen by *last* balloon burst in `(i,j)`
  - Minimum Cost Tree from Leaf Values (LC 1130), Matrix Chain Multiplication (classic), Zuma Game (LC 488)
- Minimum Cost to Merge Stones (LC 1000) - split-point-combine constrained to a stride (merge exactly k adjacent piles)
- Strange Printer (LC 664) - extend-earlier-turn recurrence (`dp[i][k] + dp[k+1][j-1]` when `s[k]==s[j]`), not a split-point-combine shape
  - Minimum Insertion Steps to Make a String Palindrome (LC 1312)
- Palindrome Partitioning II (LC 132) - shrink-inward interval-DP precompute (`is_pal[i][j]`) feeding a 1-D cut-count DP
  - Palindrome Partitioning (LC 131, backtracking enumeration instead of DP)
- Remove Boxes (LC 546) - 3-D state (`dp[i][j][k]`, k = same-color boxes queued outside the interval)

---

## `[x]` bitmask-dp.md

- Travelling Salesman Problem (classic) - `dp[mask][i]`, visited-set + explicit endpoint
  - Shortest Hamiltonian Path, Find the Shortest Superstring (LC 943), Minimum Cost to Visit All Nodes, Counting Hamiltonian Paths (classic)
- Partition to K Equal Sum Subsets (LC 698) - `dp[mask]` feasibility via submask enumeration
  - Fair Distribution of Cookies (LC 2305), Minimum Number of Work Sessions (LC 1986)
- Maximum Students Taking Exam (LC 1349) - broken-profile DP, per-row bitmask state depending on the previous row's mask
  - Domino Tiling (classic CP)
- Shortest Path Visiting All Nodes (LC 847) - BFS over `(node, mask)` states, not a DP recurrence
  - Minimum Cost to Connect All Points as a tour
- Optimal Assignment (LC 1947-style) - `dp[mask]` with `popcount(mask)` as the implicit next-worker index, no endpoint dimension
  - Minimum Cost to Assign Tasks (classic), Number of Ways to Wear Different Hats to Each Other (LC 1434), Maximum AND Sum of Array (LC 2172)

---

## `[x]` meet-in-the-middle.md

- Subset Sum with Large Values (classic) - split, enumerate all 2^(n/2) sums per half, sort one, binary-search the complement
  - Closest Subsequence Sum (LC 1755), Partition Equal Subset Sum (LC 416), Target Sum (LC 494), Sum of Squares (classic)
- Split Array With Same Average (LC 805) - enumerate (sum, size) pairs per half, hash-set membership combine
  - Fair Split (partition into two equal-sum groups)
- 4Sum II (LC 454) - MITM on pairs (not single elements), hash-map combine
  - Two Sum (LC 1)

---

## `[x]` state-machine-dp.md

- Best Time to Buy and Sell Stock with Cooldown (LC 309) - 3-state machine (HELD / SOLD-cooldown / REST)
  - Best Time to Buy and Sell Stock (LC 121), Best Time to Buy and Sell Stock II (LC 122), Best Time to Buy and Sell Stock with Transaction Fee (LC 714)
- Best Time to Buy and Sell Stock IV - At Most k Transactions (LC 188) - state indexed by transaction count, `k × {HELD, CASH}` table
  - Best Time to Buy and Sell Stock III (LC 123)
- House Robber II (LC 213) - two linear ROB/SKIP machines over a circular split
  - House Robber (LC 198), House Robber III (LC 337), Delete and Earn (LC 740)
- Paint House (LC 256) - absolute per-color state (COLOR_0/1/2), cheapest-of-other-two transition
  - Paint House II (LC 265)
- Paint Fence (LC 276) - relative state (SAME/DIFF vs previous post), fixed at 2 states regardless of k colors

---

## Stub-sized (not yet written - deferred)

- `cyclic-sort.md`
- `dp-patterns.md`
- `subsets-permutations.md`

Not in scope: `pattern-selection-cheatsheet.md` (different format, no Skeleton/Practice-problems structure).
