# DSA Practice Problems Index

Generated file - do not hand-edit. Regenerate with `python3 scripts/build_practice_problems_index.py`.

Source of truth for what each article's `## Practice problems` section actually contains: entry titles and their `**Duplicate problems:**` citations, read directly from `content/dsa/`. Reasoning prose is dropped from duplicate citations, keeping only the problem title.

# Patterns

## `content/dsa/patterns/backtracking.md`

- N-Queens - constraint checks + symmetry
- Sudoku Solver - constraint propagation + MRV
- Combination Sum - reuse with a start index
- Restore IP Addresses - bounded-segment partition
- Word Break II - backtracking + memoization
  - Word Break (LC 139)
- Palindrome Partitioning - predicate-gated cut
  - Palindrome Partitioning II (LC 132)

## `content/dsa/patterns/binary-search-on-answer.md`

- Koko Eating Bananas (LC 875)
  - Capacity To Ship Packages Within D Days (LC 1011)
  - Split Array Largest Sum (LC 410)
  - Find the Smallest Divisor Given a Threshold (LC 1283)
  - Minimum Speed to Arrive on Time (LC 1870)
- Minimum Number of Days to Make m Bouquets (LC 1482)
- Magnetic Force Between Two Balls (LC 1552)
  - Divide Chocolate (LC 1231)

## `content/dsa/patterns/bitmask-dp.md`

- Travelling Salesman Problem (classic)
  - Shortest Hamiltonian Path (no return)
  - Find the Shortest Superstring (LC 943)
  - Minimum Cost to Visit All Nodes (directed, any start)
  - Counting Hamiltonian Paths (classic)
- Partition to K Equal Sum Subsets (LC 698)
  - Fair Distribution of Cookies (LC 2305)
  - Minimum Number of Work Sessions (LC 1986)
- Maximum Students Taking Exam (LC 1349)
  - Domino Tiling (classic CP)
- Shortest Path Visiting All Nodes (LC 847)
  - Minimum Cost to Connect All Points as a tour
- Optimal Assignment (LC 1947-style)
  - Minimum Cost to Assign Tasks (classic)
  - Number of Ways to Wear Different Hats to Each Other (LC 1434)
  - Maximum AND Sum of Array (LC 2172)

## `content/dsa/patterns/cyclic-sort.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/patterns/difference-array.md`

- Range Addition (LC 370)
  - Corporate Flight Bookings (LC 1109)
  - Points That Intersect With Cars (LC 2848)
- Meeting Rooms II (LC 253)
  - Divide Intervals Into Minimum Number of Groups (LC 2406)
  - Car Pooling (LC 1094)
- Number of Flowers in Full Bloom (LC 2251)
  - Meeting Rooms II (LC 253)

## `content/dsa/patterns/dp-patterns.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/patterns/fast-slow-pointers.md`

- Linked List Cycle (LC 141)
  - Happy Number (LC 202)
  - Find the Duplicate Number (LC 287)
- Linked List Cycle II (LC 142)
  - Linked List Cycle (LC 141)
- Middle of the Linked List (LC 876)
  - (none - see Palindrome Linked List below for a problem that composes this technique with another)
- Palindrome Linked List (LC 234)
  - Reorder List (LC 143)
  - Middle of the Linked List (LC 876)

## `content/dsa/patterns/frequency-array.md`

- Valid Anagram - character frequency comparison
  - Ransom Note (LC 383)
  - Check if Two String Arrays are Equivalent (LC 1662)
- Group Anagrams (LC 49)
  - Find All Duplicates via Anagram Signature (informal variant)
- Find All Anagrams in a String - sliding window + freq array
  - Permutation in String (LC 567)
  - Minimum Window Substring (LC 76)
- Sort Characters By Frequency (LC 451) - frequency of frequencies
  - Top K Frequent Elements (LC 347)
  - Top K Frequent Words (LC 692)
  - Reorganize String (LC 767)

## `content/dsa/patterns/graph-coloring.md`

- Possible Bipartition (LC 886)
  - Is Graph Bipartite? (LC 785)
  - Divide Nodes into the Maximum Number of Groups (LC 2493)
- Flower Planting With No Adjacent (LC 1042)
  - Graph Coloring
- Chromatic Number (bitmask DP)
  - Minimum number of teams / groups such that no two conflicting members share a team (classic/CP framing)

## `content/dsa/patterns/in-place-reversal.md`

- Reverse Linked List (LC 206)
  - Reverse String (LC 344)
  - Reverse Words in a String III (LC 557)
- Reverse Linked List II (LC 92)
  - Rotate List (LC 61)
- Reverse Nodes in k-Group (LC 25)
  - Swap Nodes in Pairs (LC 24)
- Reorder List (LC 143)
  - Interleaving two lists (variant)

## `content/dsa/patterns/interval-dp.md`

- Burst Balloons (LC 312)
  - Minimum Cost Tree from Leaf Values (LC 1130)
  - Matrix Chain Multiplication (classic)
  - Zuma Game (LC 488)
- Minimum Cost to Merge Stones (LC 1000)
- Strange Printer (LC 664)
  - Minimum Insertion Steps to Make a String Palindrome (LC 1312)
- Palindrome Partitioning II (LC 132)
  - Palindrome Partitioning (LC 131)
- Remove Boxes (LC 546)

## `content/dsa/patterns/k-way-merge.md`

- Merge K Sorted Lists (LC 23)
  - Merge K Sorted Arrays (classic)
  - Merge Two Sorted Lists (LC 21)
  - Merge Sorted Array (LC 88)
  - Sort List (LC 148)
- Kth Smallest Element in a Sorted Matrix (LC 378)
  - Kth Smallest in Multiplication Table (LC 668)
- Smallest Range Covering Elements from K Lists (LC 632)
  - Minimum Window Substring (LC 76)
- Find K Pairs with Smallest Sums (LC 373)
  - Kth Smallest Element in a Sorted Matrix (LC 378)

## `content/dsa/patterns/matrix-traversal.md`

- Number of Islands (LC 200) - DFS component counting
  - Max Area of Island (LC 695)
  - Number of Connected Components in an Undirected Graph (LC 323)
- Shortest Path in Binary Matrix (LC 1091) - BFS shortest path
  - Minimum Knight Moves (LC 1197)
  - Jump Game IV (LC 1345)
- Pacific Atlantic Water Flow (LC 417) - multi-source BFS
  - Walls and Gates (LC 286)
  - Rotting Oranges (LC 994)
- Shortest Path in a Grid with Obstacles Elimination (LC 1293) - state-augmented BFS
  - Minimum Obstacle Removal to Reach Corner (LC 2290)
  - Cut Off Trees for Golf Event (LC 675)

## `content/dsa/patterns/meet-in-the-middle.md`

- Subset Sum with Large Values (classic)
  - Closest Subsequence Sum (LC 1755)
  - Partition Equal Subset Sum (LC 416)
  - Target Sum (LC 494)
  - Sum of Squares (find four perfect squares summing to N)
- Split Array With Same Average (LC 805)
  - Fair Split (partition into two equal-sum groups)
- 4Sum II (LC 454)
  - Two Sum (LC 1)

## `content/dsa/patterns/merge-intervals.md`

- Merge Intervals (LC 56)
  - Insert Interval (LC 57)
  - Employee Free Time (LC 759)
  - Merge Sorted Array (LC 88)
- Meeting Rooms II (LC 253)
  - Car Pooling (LC 1094)
- Non-overlapping Intervals (LC 435)
  - Minimum Number of Arrows to Burst Balloons (LC 452)
- Interval List Intersections (LC 986)
  - Merge Sorted Array (LC 88)
  - Find Right Interval (LC 436)

## `content/dsa/patterns/modified-binary-search.md`

- Search in Rotated Sorted Array (LC 33)
  - Search in Rotated Sorted Array II (LC 81)
  - Find Minimum in Rotated Sorted Array (LC 153)
  - Find Minimum in Rotated Sorted Array II (LC 154)
- Find Peak Element (LC 162)
  - Peak Index in a Mountain Array (LC 852)
  - Find in Mountain Array (LC 1095)
  - Find Peak Element in 2D Matrix (LC 1901)
- Find First and Last Position of Element in Sorted Array (LC 34)
  - Search Insert Position (LC 35)
  - Count of Range Sum (LC 327)
  - Time Based Key-Value Store (LC 981)
  - Find Right Interval (LC 436)
  - Online Election (LC 911)
- Search a 2D Matrix (LC 74)
  - Search a 2D Matrix II (LC 240)

## `content/dsa/patterns/monotonic-queue.md`

- Sliding Window Maximum (LC 239)
  - Sliding Window Minimum (LC-adjacent, no canonical number)
  - Jump Game VI (LC 1696)
  - Constrained Subsequence Sum (LC 1425)
  - Maximum of Minimums of Every Window Size (GfG)
- Shortest Subarray with Sum at Least K (LC 862)
  - Subarray Sum Equals K (LC 560)
- Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit (LC 1438)
  - Subarrays with Bounded Max/Min variants (interview-staple rephrasing)

## `content/dsa/patterns/monotonic-stack.md`

- Next Greater Element I (LC 496)
  - Daily Temperatures (LC 739)
  - Next Greater Element II (LC 503)
  - Online Stock Span (LC 901)
- Largest Rectangle in Histogram (LC 84)
  - Maximal Rectangle (LC 85)
- Trapping Rain Water (LC 42)
  - Largest Rectangle in Histogram (LC 84)
- Remove K Digits (LC 402)
  - Remove Duplicate Letters (LC 316)
  - Create Maximum Number (LC 321)

## `content/dsa/patterns/prefix-sum.md`

- Range Sum Query - Immutable (LC 303)
  - Range Sum Query 2D
  - Running Sum of 1d Array (LC 1480)
- Subarray Sum Equals K (LC 560)
  - Subarray Sums Divisible by K (LC 974)
  - Continuous Subarray Sum (LC 523)
- Product of Array Except Self (LC 238)
  - Trapping Rain Water (LC 42)
  - Range Sum Query

## `content/dsa/patterns/sliding-window.md`

- Maximum Sum Subarray of Size K
  - Maximum Average Subarray I (LC 643)
  - Subarray Product Less Than K (LC 713)
- Longest Substring Without Repeating Characters (LC 3)
  - Longest Substring with At Most Two Distinct Characters (LC 159)
  - Longest Substring with At Most K Distinct Characters (LC 340)
  - Longest Repeating Character Replacement (LC 424)
  - Fruit Into Baskets (LC 904)
  - Max Consecutive Ones III (LC 1004)
- Minimum Window Substring (LC 76)
  - Smallest Range Covering Elements from K Lists (LC 632)
  - Substring with Concatenation of All Words (LC 30)
- Sliding Window Maximum (LC 239)
  - Jump Game VI (LC 1696)
  - Constrained Subsequence Sum (LC 1425)
- Subarrays with K Different Integers (LC 992)
  - Binary Subarrays With Sum (LC 930)
  - Count Number of Nice Subarrays (LC 1248)

## `content/dsa/patterns/state-machine-dp.md`

- Best Time to Buy and Sell Stock with Cooldown (LC 309)
  - Best Time to Buy and Sell Stock (LC 121)
  - Best Time to Buy and Sell Stock II (LC 122)
  - Best Time to Buy and Sell Stock with Transaction Fee (LC 714)
- Best Time to Buy and Sell Stock IV - At Most k Transactions (LC 188)
  - Best Time to Buy and Sell Stock III (LC 123)
- House Robber II (LC 213)
  - House Robber (LC 198)
  - House Robber III (LC 337)
  - Delete and Earn (LC 740)
- Paint House (LC 256)
  - Paint House II (LC 265)
- Paint Fence (LC 276)

## `content/dsa/patterns/subsets-permutations.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/patterns/top-k-elements.md`

- Kth Largest Element in an Array (LC 215)
  - Kth Largest Element in a Stream (LC 703)
  - Top K Frequent Elements (LC 347)
  - Find K Pairs with Smallest Sums (LC 373)
- Top K Frequent Elements (LC 347)
  - Top K Frequent Words (LC 692)
  - Sort Characters By Frequency (LC 451)
- K Closest Points to Origin (LC 973)
  - Kth Smallest Element in a Sorted Matrix (LC 378)
  - Find K Closest Elements (LC 658)

## `content/dsa/patterns/tree-graph-traversal.md`

- Binary Tree Level Order Traversal (LC 102)
  - Binary Tree Right Side View (LC 199)
  - Average of Levels in Binary Tree (LC 637)
  - Find Bottom Left Tree Value (LC 513)
- Clone Graph (LC 133)
  - Copy List with Random Pointer (LC 138)
- Course Schedule (LC 207)
  - Course Schedule II (LC 210)
- Path Sum II (LC 113)
  - Path Sum (LC 112)
  - Binary Tree Maximum Path Sum (LC 124)
- Number of Provinces (LC 547)
  - Number of Islands (LC 200)
  - Number of Connected Components in an Undirected Graph (classic)

## `content/dsa/patterns/two-heaps.md`

- Find Median from Data Stream (LC 295)
  - Running Average of Data Stream (not on LC)
  - Kth Largest Element in a Stream (LC 703)
- Sliding Window Median (LC 480)
  - Maximum of Sliding Window (LC 239)
  - Minimum Window Substring (LC 76)
- IPO (LC 502)
  - Reorganize String (LC 767)

## `content/dsa/patterns/two-pointers.md`

- Two Sum II - Input Array Is Sorted (LC 167)
  - Two Sum IV
  - Sum of Square Numbers (LC 633)
- Trapping Rain Water (LC 42)
  - Container With Most Water (LC 11)
- Remove Duplicates from Sorted Array (LC 26)
  - Remove Duplicates from Sorted Array II (LC 80)
  - Move Zeroes (LC 283)
  - Remove Element (LC 27)
- 3Sum (LC 15)
  - 4Sum (LC 18)
  - 3Sum Closest (LC 16)
- Valid Palindrome (LC 125)
  - Valid Palindrome II (LC 680)
  - Longest Palindromic Substring (LC 5)

# Data Structures

## `content/dsa/data-structures/array.md`

- Trapping Rain Water - _converging two pointers_
  - Container With Most Water (LC 11)
- Next Permutation - _in-place index manipulation_
  - Previous Permutation With One Swap (LC 1053)
- Maximum Subarray - _Kadane's dynamic programming_
  - Maximum Sum Circular Subarray (LC 918)
  - Maximum Product Subarray (LC 152)
- Minimum Size Subarray Sum - _sliding window_
  - Minimum Window Substring (LC 76)

## `content/dsa/data-structures/avl-tree.md`

- Insert into an AVL tree - _rebalance on the way up_
  - Balance a Binary Search Tree (LC 1382)
- Validate height-balanced - _bottom-up heights_
- Build a balanced BST from sorted data - _vs AVL_
  - Convert Sorted List to Binary Search Tree (LC 109)
- AVL delete with rebalance-on-removal - _multi-ancestor fixup_

## `content/dsa/data-structures/b-plus-tree.md`

- Range query on a sorted structure
  - Count of numbers in a range (LC 2250)
  - Find first and last position of element in sorted array (LC 34)
- Design an index for a database column
  - Design a key-value store with range queries (system design)
- Insert-with-leaf-split (copy-up)

## `content/dsa/data-structures/b-tree.md`

- Why B-trees for databases - _reasoning_
- B-tree search - _multi-key-node descent_
- Choose the order for a disk block - _sizing_
- B-tree vs B+-tree for range scans - _reasoning_
- Insert-with-node-split - _median push-up_

## `content/dsa/data-structures/binary-search-tree.md`

- Validate Binary Search Tree - _bounded recursion_
- Kth Smallest Element in a BST - _in-order counting_
  - Binary Search Tree Iterator (LC 173)
- Lowest Common Ancestor of a BST - _ordering shortcut_
  - Lowest Common Ancestor of a Binary Search Tree III (LC 1650)
- Insert into a BST - _recursive descent_
- Convert Sorted Array to BST - _balanced build_
  - Convert Sorted List to Binary Search Tree (LC 109)
- Delete Node in a BST - _two-child successor-replacement_
  - Delete Leaves With a Given Value (LC 1325)

## `content/dsa/data-structures/binary-tree.md`

- Maximum Depth of Binary Tree - _DFS recursion_
  - Minimum Depth of Binary Tree (LC 111)
- Binary Tree Level Order Traversal - _BFS_
  - Binary Tree Zigzag Level Order Traversal (LC 103)
  - Average of Levels in Binary Tree (LC 637)
- Invert Binary Tree - _recursive swap_
- Diameter of Binary Tree - _tree DP_
  - Binary Tree Maximum Path Sum (LC 124)
- Lowest Common Ancestor - _recursive search_
  - Lowest Common Ancestor of a Binary Tree II (LC 1644)

## `content/dsa/data-structures/bloom-filter.md`

- Design a Web Crawler URL Deduplication System
  - Design a spam filter for email deduplication (same mechanic: large n, tolerate FP, no FN, no deletion).
  - Implement a visited-set for a large-scale graph crawler with a 1 GB memory cap"
- First Missing Positive (Membership + Exact Fallback)
  - Find the duplicate number in [1..n] with O(1) space" (LC 287)
  - Find all missing numbers in [1..n]" (LC 448)
- Design a Counting Bloom Filter with Delete
  - Design a rate limiter using a sliding-window with probabilistic eviction"
  - Design a distributed deduplication service where messages can be retracted"
- Design a Spell Checker
  - Design a username availability checker for a social platform" (same mechanic: static set loaded once, FP = rare false "available" claim tolerable, FN = saying taken when free is the real sin).
  - Filter malicious URLs using a pre-built blocklist"

## `content/dsa/data-structures/circular-buffer.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/data-structures/deque.md`

- Sliding Window Maximum - _monotonic deque_
  - Jump Game VI (LC 1696)
  - Constrained Subsequence Sum (LC 1425)
- Design Circular Deque - _ring buffer, both ends_
  - Design Circular Queue (LC 622)
- Shortest Subarray with Sum at Least K - _monotonic deque on prefix sums_
- Sliding Window Median - _why a deque is **not** enough_
  - Find Median from Data Stream (LC 295)

## `content/dsa/data-structures/dynamic-array.md`

- Implement a Dynamic Array from Scratch - grow-and-shrink resize policy
  - Design a ArrayList / Vector class (common systems-interview phrasing)
- O(1) Removal at an Arbitrary Index - swap-with-last-then-pop
- Amortized Copy-Count Walkthrough - aggregate-method proof by simulation
- Growth Factor Comparison - geometric vs fixed-increment resizing
- Insert Delete GetRandom O(1) - swap-with-last + index map
  - Insert Delete GetRandom O(1)
- Min Stack - parallel auxiliary buffer
  - Max Stack (design variant)
- Implement Queue using Stacks - amortized analysis across two buffers
  - Implement Stack using Queues (LC 225)

## `content/dsa/data-structures/fenwick-tree.md`

- Range Sum Query - Mutable - _point update, range query_
  - Range Sum Query 2D
  - My Calendar III (LC 732)
- Count of Smaller Numbers After Self - _BIT as order statistics_
  - Reverse Pairs (LC 493)
  - Count of Range Sum (LC 327)
- Range Sum Query - Range Update and Range Sum - _two BITs_
  - Range Addition (LC 370)

## `content/dsa/data-structures/graph.md`

- Number of Islands (LC 200) - BFS/DFS connected components
  - Flood Fill (LC 733)
  - Max Area of Island (LC 695)
  - Count Sub Islands (LC 1905)
- Clone Graph (LC 133) - BFS + hashmap original-to-clone
  - Copy List with Random Pointer (LC 138)
  - Graph Valid Tree (LC 261)
  - Pacific Atlantic Water Flow (LC 417)
- Course Schedule (LC 207) - DFS three-color cycle detection / topo sort
  - Course Schedule II (LC 210)
  - Find Eventual Safe States (LC 802)
  - Alien Dictionary (LC 269)
- Network Delay Time (LC 743) - weighted shortest path (Dijkstra)
  - Path with Minimum Effort (LC 1631)
  - Cheapest Flights Within K Stops (LC 787)

## `content/dsa/data-structures/hash-set.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/data-structures/hash-table.md`

- Two Sum - _complement lookup_
  - Two Sum IV
  - 4Sum II (LC 454)
- Group Anagrams - _canonical key_
- Longest Consecutive Sequence - _set membership_
- Subarray Sum Equals K - _prefix sum + hashing_
  - Contiguous Array (LC 525)
  - Subarray Sums Divisible by K (LC 974)
- First Unique Character - _frequency map_

## `content/dsa/data-structures/heap.md`

- Kth Largest Element in a Stream - bounded min-heap
  - Kth Largest Element in an Array (LC 215)
- Top K Frequent Elements - heap of size K
  - Top K Frequent Words (LC 692)
  - K Closest Points to Origin (LC 973)
- Merge K Sorted Lists - k-way merge with a heap
  - Kth Smallest Element in a Sorted Matrix (LC 378)
- Find Median from Data Stream - two heaps
  - Sliding Window Median (LC 480)
- Swim in Rising Water - Dijkstra-style heap shortest path
  - Path with Minimum Effort (LC 1631)
  - Path with Maximum Probability (LC 1514)

## `content/dsa/data-structures/interval-tree.md`

- My Calendar I - single booking conflict detection (interval tree approach)
  - My Calendar II (LC 731)
  - My Calendar III (LC 732)
- Find All Conflicting Meetings - multi-result overlap query
  - Remove Interval (LC 1272)
  - Minimum Number of Arrows to Burst Balloons (LC 452)
- Employee Free Time - multi-interval merge via tree sweep
  - Insert Interval (LC 57)
  - Merge Intervals (LC 56)

## `content/dsa/data-structures/lfu-cache.md`

- LFU Cache - _frequency buckets + min_freq pointer, O(1)_
- All O`one` Data Structure - _bucketed counts, O(1) min and max_
- Top K Frequent Elements - _bucket sort by frequency_
  - Top K Frequent Words (LC 692)
  - Sort Characters By Frequency (LC 451)
- Maximum Frequency Stack - _live frequency-bucket eviction, LIFO within a bucket_
- LRU Cache - _the recency-only sibling, for contrast_

## `content/dsa/data-structures/linked-list.md`

- Reverse a Linked List - _iterative pointer rewiring_
  - Reverse Linked List II (LC 92)
- Linked List Cycle II - _Floyd's tortoise and hare_
  - Find the Duplicate Number (LC 287)
- Merge Two Sorted Lists - _dummy head + splice_
  - Merge Sorted Array (LC 88)
- Remove Nth Node From End - _two pointers, one pass_
- LRU Cache - _hashmap + doubly linked list_

## `content/dsa/data-structures/lru-cache.md`

- LRU Cache - _map + doubly linked list, O(1)_
- LFU Cache - _frequency buckets, O(1)_
- LRU Cache with TTL - _map + DLL splice, with expiry-on-access_

## `content/dsa/data-structures/queue.md`

- Implement Queue using Stacks - amortized transfer
  - Implement Stack using Queues (LC 225)
- Number of Recent Calls - sliding-window queue
- Sliding Window Maximum - monotonic deque
  - Shortest Subarray with Sum at Least K (LC 862)
- Rotting Oranges - multi-source BFS
  - 01 Matrix (LC 542)
- Design Circular Queue - ring buffer
  - First Unique Character in a Stream

## `content/dsa/data-structures/red-black-tree.md`

- Why libraries pick red-black over AVL - _reasoning_
- Verify red-black properties - _black-height check_
- Red-black insert fixup - _recolor then rotate_
- Order-statistics with a red-black tree - _augmentation_
  - Count of Smaller Numbers After Self (LC 315)

## `content/dsa/data-structures/segment-tree.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/data-structures/skip-list.md`

- Design Skip List (LeetCode 1206)
  - Design a Sorted Set / Ordered Map from scratch
- Range Sum Query with Frequent Insert/Delete (design variant)
  - Count of Smaller Numbers After Self (LeetCode 315)
- LRU-style Ordered Eviction by Score (Redis ZSET-style design)
  - Leaderboard design problems (LeetCode 1244 "Design A Leaderboard")

## `content/dsa/data-structures/stack.md`

- Valid Parentheses - _matching with a stack_
  - Remove All Adjacent Duplicates In String (LC 1047)
  - Minimum Remove to Make Valid Parentheses (LC 1249)
- Daily Temperatures - _monotonic stack_
  - Next Greater Element I (LC 496)
- Min Stack - _auxiliary stack_
  - Max Stack (LC 716)
- Evaluate Reverse Polish Notation - _operand stack_
- Largest Rectangle in Histogram - _monotonic stack with widths_
  - Maximal Rectangle (LC 85)

## `content/dsa/data-structures/string.md`

- Valid Anagram - _character count_
  - Valid Anagram (LC 242)
  - Ransom Note (LC 383)
- Longest Substring Without Repeating Characters - _sliding window_
  - Longest Substring Without Repeating Characters (LC 3)
- Valid Palindrome - _two pointers_
  - Valid Palindrome (LC 125)
- Find All Anagrams in a String - _fixed window + count match_
  - Find All Anagrams in a String (LC 438)
  - Permutation in String (LC 567)
- Implement strStr / Find the Index - _rolling hash (Rabin–Karp)_
  - Implement strStr() (LC 28)

## `content/dsa/data-structures/suffix-array.md`

- Longest repeated substring
  - Longest Duplicate Substring" (LeetCode 1044, though that problem expects a binary-search + hashing or SA approach; the SA approach is cleaner), "Longest Repeated Non-Overlapping Substring" (requires the additional constraint `SA[i] - SA[i-1] ≥ lcp_len`).
- Number of distinct substrings
  - Count Different Palindromic Subsequences" is related but distinct (requires different structure); "Distinct Substrings" is the canonical name on SPOJ (DISUBSTR).
- Longest common substring of two strings
  - Longest Common Substring" appears as SPOJ LCS, as a sub-problem in many sequence-alignment tasks, and as the baseline for generalized suffix array problems (extend to k strings).

## `content/dsa/data-structures/suffix-tree.md`

- Longest Repeated Substring (via suffix tree)
  - Longest Repeated Substring via Suffix Array (LC-style, SPOJ)
  - Longest Duplicate Substring (LC 1044)
- Count Distinct Substrings (via suffix tree)
  - Number of Distinct Substrings via Suffix Array (SPOJ DISUBSTR)
  - Count of Distinct Substrings of Length K
- Longest Common Substring Across k Strings (Generalized Suffix Tree)
  - Longest Common Substring of Two Strings (Suffix Array version)
  - Shortest Common Superstring (a related but distinct problem - requires a different technique, typically greedy merging or DP over overlaps, not a generalized suffix tree).

## `content/dsa/data-structures/treap.md`

- Design a Sorted Set with Fast Rank Queries
  - Order-Statistics Tree (k-th smallest)
  - Count of Smaller Numbers After Self (LC 315)
- Range Reverse and Query (Implicit Treap)
  - Reverse Substring range-update variants in competitive programming judges (Codeforces "array with range reverse")
  - Rope data structure operations (used in text editors for large-document insert/delete/substring)
- Merge Two Treaps / Union of Two Sorted Sets
  - Union of Two Balanced BSTs (weight-balanced tree "join" algorithm)
  - Persistent Treap Version Merge

## `content/dsa/data-structures/trie.md`

- Implement a Trie - _insert, search, startsWith_
  - Map Sum Pairs (LC 677)
  - Longest Word in Dictionary (LC 720)
- Word Search II - _trie + DFS on a grid_
- Replace Words - _shortest-prefix lookup_
- Maximum XOR of Two Numbers - _bitwise trie_
  - Maximum XOR With an Element From Array (LC 1707)
- Design Add and Search Words - _wildcard DFS_

## `content/dsa/data-structures/union-find.md`

- Number of Connected Components in an Undirected Graph
  - Number of Provinces (LC 547)
  - Number of Islands (LC 200)
- Kruskal's MST (edge-sort + DSU cycle detection)
  - Min Cost to Connect All Points (LC 1584)
  - Connecting Cities With Minimum Cost (LC 1135)
- Accounts Merge
  - Sentence Similarity II (LC 737)
  - Largest Component Size by Common Factor (LC 952)
- Redundant Connection - cycle detection
  - Redundant Connection II (LC 685)
  - Graph Valid Tree (LC 261)
- Satisfiability of Equality Equations

# Algorithms

## `content/dsa/algorithms/aho-corasick.md`

- Implement Aho-Corasick / Multi-pattern string matching
  - Stream of Characters (LC 1032)
  - Word Filter / Multi-keyword Content Moderation
  - Multi-String Matching / Word Break II variants that ask "which dictionary words appear in this text" (various online-judge phrasings)
  - Detect all forbidden substrings in a document (content-moderation-flavored judge problems)
- Short Encoding of Words (LC 820) - trie suffix links, *not* Aho-Corasick (but the neighbor to not confuse)

## `content/dsa/algorithms/backtracking.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/algorithms/bellman-ford.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/algorithms/bfs.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/algorithms/binary-search.md`

- First Bad Version - binary search on a predicate
  - Find Peak Element (LC 162)
- Search in Rotated Sorted Array - half is always sorted
  - Search in Rotated Sorted Array II (LC 81)
  - Find Minimum in Rotated Sorted Array (LC 153)
- Koko Eating Bananas - binary search on the answer
  - Capacity To Ship Packages Within D Days (LC 1011)
- Median of Two Sorted Arrays - partition search

## `content/dsa/algorithms/bipartite-matching.md`

- Maximum Bipartite Matching (canonical, CSES "School Dance")
  - Job Assignment (CSES "Task Assignment" variants)
  - Any "maximum number of one-to-one compatible pairs" problem framed as two groups with a compatibility list.
- Minimum Vertex Cover in a Bipartite Graph (König's theorem application)
  - Maximum Independent Set in a bipartite graph
- Assignment Problem with Costs (Hungarian algorithm territory, contrast case)
  - Minimum Cost Bipartite Matching (general)

## `content/dsa/algorithms/bit-manipulation.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/algorithms/bucket-sort.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/algorithms/counting-sort.md`

- Sort an Array of Bounded Integers - plain counting sort
  - Sort Colors (LC 75)
  - Height Checker (LC 1051)
- Sort Characters by Frequency - count then emit
  - Top K Frequent Elements (LC 347)
- Relative Sort Array - counting with a custom order
  - Custom Sort String (LC 791)
- H-Index - counting buckets to skip the sort

## `content/dsa/algorithms/dfs.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/algorithms/dijkstra.md`

- Network Delay Time (LC 743)
  - Path with Maximum Probability (LC 1514)
  - Cheapest Flights Within K Stops (LC 787)
- Swim in Rising Water (LC 778)
  - Path with Maximum Probability (LC 1514)
  - Path With Minimum Effort (LC 1631)
- Cheapest Flights Within K Stops (LC 787)
  - Path With Minimum Effort (LC 1631)

## `content/dsa/algorithms/dinic.md`

- Maximum Flow (canonical, CSES "Download Speed" / general max-flow template)
  - Police Chase (CSES)
  - Any "maximum number of edge/vertex-disjoint paths" problem
- Maximum Bipartite Matching at scale (canonical, CSES "School Dance" generalized to large n)
  - Job Assignment / Task-Worker compatibility problems at scale
  - Any "maximum number of one-to-one pairs" problem large enough that Kuhn's O(VE) risks TLE.
- Vertex-Disjoint Paths via Vertex-Splitting (CSES "Distinct Routes")
  - Any "maximum number of vertex-disjoint paths / node-independent routes" problem
  - Menger's theorem applications (minimum vertex cut between two nodes equals maximum vertex-disjoint paths)

## `content/dsa/algorithms/divide-and-conquer.md`

- Count Inversions
  - Reverse Pairs (LC 493)
  - Count of Smaller Numbers After Self (LC 315)
- Maximum Subarray (D&C)
  - Maximum Sum Circular Subarray (LC 918)
- Closest Pair of Points
  - Count of Range Sum (LC 327)
- Karatsuba Multiplication
  - Strassen's Matrix Multiplication (name only, no standard LC number)

## `content/dsa/algorithms/dynamic-programming.md`

- House Robber (1D linear DP)
  - House Robber II (LC 213)
  - Delete and Earn (LC 740)
- Edit Distance (2D sequence alignment)
  - Delete Operation for Two Strings (LC 583)
- Coin Change II - count ways (unbounded knapsack, order matters)
  - Combination Sum IV (LC 377)
  - Partition Equal Subset Sum (LC 416)
- Longest Increasing Subsequence (DP → binary-search acceleration)
  - Russian Doll Envelopes (LC 354)
  - Maximum Length of Pair Chain (LC 646)

## `content/dsa/algorithms/edmonds-karp.md`

- Maximum Flow (canonical, CSES "Download Speed" / general max-flow template)
  - Police Chase (CSES)
  - Any "maximum number of edge/vertex-disjoint paths" problem
- Maximum Bipartite Matching (canonical, CSES "School Dance")
  - Job Assignment / Task-Worker compatibility problems
  - Any "maximum number of pairs satisfying a compatibility constraint" problem phrased as a bipartite graph.
- Baseball Elimination (advanced max-flow modeling, canonical algorithmic-modeling problem)
  - Project Selection Problem (max-profit under prerequisite constraints via min-cut)

## `content/dsa/algorithms/euclidean-gcd.md`

- Greatest Common Divisor of Strings - LC 1071
  - Repeated String Match (LC 686)
- Water and Jug Problem - LC 365
  - Any "can you reach target T using steps of size a and b" reachability problem
- Modular inverse for combinatorics with a non-prime modulus
  - Any "combinations mod m" problem where m is explicitly stated as composite or unspecified
  - Diophantine equation solvers (`ax + by = c`, does a solution exist / find one)

## `content/dsa/algorithms/floyd-warshall.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/algorithms/ford-fulkerson.md`

- Max Flow / Min Cut (generic network, LC-style: "Maximum Flow" is not on LeetCode directly - canonical reference: CSES "Download Speed")
  - Police Chase (CSES)
  - School Dance (CSES)
- Maximum Bipartite Matching (LC 1349 - Maximum Students Taking Exam, reducible; canonical: CSES "School Dance")
  - Assignment Problem (jobs to workers, unweighted feasibility variant)
  - Team Formation / Task Assignment style problems
- Min-Cost to Connect All Points... (not flow) → use instead: Circulation with Lower Bounds (conceptual/advanced, canonical: CSES "Distinct Routes")
  - Download Speed variant with path output

## `content/dsa/algorithms/greedy.md`

- Non-overlapping Intervals (LC 435)
  - Minimum Number of Arrows to Burst Balloons (LC 452)
- Assign Cookies (LC 455)
  - Maximum Matching of Players With Trainers (LC 2410)
  - Boats to Save People (LC 881)
- Minimum Cost to Connect Sticks (LC 1167)
- Jump Game (LC 55)
  - Jump Game II (LC 45)

## `content/dsa/algorithms/heapsort.md`

- Sort an Array - heapsort in place
- Kth Largest Element - partial heapsort
- Sort a Nearly Sorted Array - heap of window size
- Last Stone Weight - repeated extract-max

## `content/dsa/algorithms/insertion-sort.md`

- Sort an Array (small / nearly sorted) - insertion sort
- Insertion Sort List - insertion into a linked list
- Sort a K-Sorted Array - bounded displacement
- Insert Interval - insertion into a sorted sequence
  - Merge Intervals (LC 56)

## `content/dsa/algorithms/kadane.md`

- Maximum Subarray (LC 53)
  - Maximum Sum Circular Subarray (LC 918)
  - Maximum Subarray Sum with One Deletion (LC 1186)
- Maximum Sum Circular Subarray (LC 918)
  - Maximum Sum of Two Non-Overlapping Subarrays (LC 1031)
- Maximum Product Subarray (LC 152)
  - Maximum Absolute Value Expression (LC 1131)
  - Minimum Product Subarray (no LC number, classic variant)

## `content/dsa/algorithms/longest-common-subsequence.md`

- Longest Common Subsequence (LC 1143)
  - Uncrossed Lines (LC 1035)
- Edit Distance (LC 72)
  - One Edit Distance (LC 161)
- Delete Operation for Two Strings (LC 583)
  - Shortest Common Supersequence (LC 1092)
  - Minimum ASCII Delete Sum for Two Strings (LC 712)

## `content/dsa/algorithms/longest-increasing-subsequence.md`

- Longest Increasing Subsequence (LC 300)
  - Longest String Chain (LC 1048)
  - Largest Divisible Subset (LC 368)
- Russian Doll Envelopes (LC 354) - the 2D extension
  - Maximum Length of Pair Chain (LC 646)
- Maximum Length of Pair Chain (LC 646)
  - Non-overlapping Intervals (LC 435)

## `content/dsa/algorithms/lowest-common-ancestor.md`

- Lowest Common Ancestor of a Binary Tree - _recursive one-pass_
  - Lowest Common Ancestor of a Binary Tree III (LC 1650)
  - Smallest Common Region (LC 1257)
- Lowest Common Ancestor of a Binary Search Tree - _ordering shortcut_
  - Two Sum IV
- Kth Ancestor of a Tree Node - _binary lifting_
  - Binary Lifting for LCA (this article's core algorithm)

## `content/dsa/algorithms/manacher-algorithm.md`

- Longest Palindromic Substring
  - Longest Palindromic Substring II (multi-query variants on the same string)
  - Palindromic Substrings Count (LC 647)
- Shortest Palindrome (prepend minimum characters)
  - Shortest Palindrome via KMP failure function
- Palindromic Substrings Count with Length Constraint
  - Count Palindromic Substrings within a length range `[minLen, maxLen]`
- Palindrome Partitioning II (LC 132)
  - Palindrome Partitioning (LC 131)

## `content/dsa/algorithms/merge-sort.md`

- Sort an Array - merge sort from scratch
- Count Inversions - cross-pair counting during merge
  - Count of Smaller Numbers After Self (LC 315)
- Merge k Sorted Lists - k-way merge

## `content/dsa/algorithms/minimum-spanning-tree.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/algorithms/modular-arithmetic.md`

- Fibonacci Number (large n variant)
  - Climbing Stairs (LC 70)
  - K-th Symbol in Grammar (LC 779)
  - Pow(x, n) (LC 50)
- Count Vowel Permutations (LC 1220)
  - House Robber (LC 198)
  - Distinct Subsequences (LC 115)
- Combination Sum IV / nCr mod p
  - Unique Paths (LC 62)
  - Binomial Coefficient (LC 1569 / many contest variants)

## `content/dsa/algorithms/modular-exponentiation.md`

- Pow(x, n) - LC 50
  - Super Pow (LC 372)
  - Fast Matrix Power
  - Fibonacci Number for large n (matrix exponentiation)
- Fermat's last step - modular inverse for combinations
  - Unique Paths II (LC 63)
  - Binomial Coefficient (many contest variants)

## `content/dsa/algorithms/quickselect.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/algorithms/quicksort.md`

- Sort an Array - quicksort with a randomized pivot
- Kth Largest Element - quickselect
  - Top K Frequent Elements (LC 347)
- Sort Colors - three-way partition
  - Partition Array According to Given Pivot (LC 2161)
- Wiggle Sort II - quickselect + three-way partition

## `content/dsa/algorithms/rabin-karp.md`

- Find all anagrams in a string - rolling hash over character counts
  - Permutation in String (LC 567)
- Repeated DNA sequences - multi-pattern via hash set
  - Find All Anagrams in a String (LC 438)
  - Contains Duplicate (LC 217)
- Longest duplicate substring - binary search + rolling hash
  - Longest Duplicate Substring (LC 1044)
  - Longest Repeated Substring (SPOJ REPSTR)

## `content/dsa/algorithms/radix-sort.md`

- Sort an Array of Large Integers - LSD radix sort
- Maximum Gap - radix sort then scan
- Sort Strings of Equal Length - MSD vs LSD radix
- Maximum Number from Concatenation - digit-aware ordering

## `content/dsa/algorithms/recursion.md`

- Fibonacci Number (LC 509)
  - Climbing Stairs (LC 70)
  - Tribonacci (LC 1137)
  - N-th Tribonacci Number
- Reverse a Linked List (LC 206)
  - Swap Nodes in Pairs (LC 24)
  - Reverse Linked List II (LC 92)
- Pow(x, n) - Fast Exponentiation (LC 50)
  - Super Pow (LC 372)
- Generate Parentheses (LC 22)
  - Letter Combinations of a Phone Number (LC 17)
  - Combination Sum (LC 39)
- Maximum Depth of Binary Tree (LC 104)
  - Balanced Binary Tree (LC 110)
  - Diameter of Binary Tree (LC 543)
  - Path Sum (LC 112)

## `content/dsa/algorithms/selection-sort.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/algorithms/sieve-of-eratosthenes.md`

- Count Primes - LC 204
  - Four Divisors (LC 1390)
- Prime Factorization via Smallest Prime Factor
  - Smallest Factorization (LC 625)
  - Count Primes with factor constraints (various contest variants)
- Prime Range Query (segmented sieve)
  - Closest prime pairs in a range (various contest variants)
- Count Numbers with Exactly K Distinct Prime Factors
  - Four Divisors (LC 1390)

## `content/dsa/algorithms/string-hashing.md`

- Longest Duplicate Substring
  - Longest Common Substring of two strings
  - Distinct Substrings Count
- Shortest Palindrome (via string hashing)
  - Palindrome Pairs
- Distinct Echo Substrings
  - Repeated Substring Pattern (LC 459)

## `content/dsa/algorithms/string-matching.md`

- Implement strStr() (LC 28) - the canonical search
- Repeated Substring Pattern (LC 459) - the failure function's period trick
- Shortest Palindrome (LC 214) - KMP on `s + # + reverse(s)`
- Longest Happy Prefix (LC 1392) - the failure function itself

## `content/dsa/algorithms/strongly-connected-components.md`

- Number of Provinces (LC 547)
  - Number of Connected Components in an Undirected Graph (LC 323)
  - Graph Valid Tree (LC 261)
- Critical Connections in a Network (LC 1192)
  - Articulation Points (classic graph problem, no LC number)
- Largest Component Size by Common Factor (LC 952)
  - Accounts Merge (LC 721)
  - Redundant Connection (LC 684)
- Find Eventual Safe States (LC 802)
  - Course Schedule II (LC 210)
  - Detect Cycles in a Directed Graph (classic)

## `content/dsa/algorithms/topological-sort.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/algorithms/z-algorithm.md`

- Implement strStr() - pattern search via the Z-array
- Longest Happy Prefix - Z-array self-match
- Shortest Period - Z-box covers the string
- Concatenation Search - separator guards the boundary
