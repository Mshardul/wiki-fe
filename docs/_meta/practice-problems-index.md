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
- Partition to K Equal Sum Subsets
  - Matchsticks to Square (LC 473)
  - Fair Distribution of Cookies (LC 2305)
- Closest Subsequence Sum

## `content/dsa/patterns/binary-search-on-answer.md`

- Koko Eating Bananas (LC 875)
  - Capacity To Ship Packages Within D Days (LC 1011)
  - Split Array Largest Sum (LC 410)
  - Find the Smallest Divisor Given a Threshold (LC 1283)
  - Minimum Speed to Arrive on Time (LC 1870)
- Minimum Number of Days to Make m Bouquets (LC 1482)
- Magnetic Force Between Two Balls (LC 1552)
  - Divide Chocolate (LC 1231)
- Minimize Max Distance to Gas Station (LC 774)
  - Any "minimize the maximum interval after inserting k points into sorted gaps" restatement
- Maximum Average Subarray II (LC 644)
  - Any "maximize/minimize a ratio over a variable-length window or subsequence" restatement (density, rate, score-per-item)

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
- Sum Over All Subsets (SOS DP)
  - Counting pairs with AND = 0 (classic CP)
- Smallest Sufficient Team (LC 1125)
  - Partition to K Equal Sum Subsets (LC 698)
- Closest Subsequence Sum (LC 1755)
  - Partition array into two subsets minimizing sum difference, n ≤ 40 (classic CP)

## `content/dsa/patterns/cyclic-sort.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/patterns/difference-array.md`

- Range Addition (LC 370)
  - Corporate Flight Bookings (LC 1109)
  - Points That Intersect With Cars (LC 2848)
- Meeting Rooms II (LC 253)
  - Divide Intervals Into Minimum Number of Groups (LC 2406)
  - Car Pooling (LC 1094)
  - Floating / event-sweep difference array (CP-primitive)
- Number of Flowers in Full Bloom (LC 2251)
  - Meeting Rooms II (LC 253)
- Increment Submatrix by One (LC 2536)
  - Range Sum Query 2D

## `content/dsa/patterns/dp-patterns.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/patterns/fast-slow-pointers.md`

- Linked List Cycle (LC 141)
  - Happy Number (LC 202)
  - Find the Duplicate Number (LC 287)
- Linked List Cycle II (LC 142)
  - Linked List Cycle (LC 141)
  - Cycle length computation (CP-primitive)
  - Brent's cycle detection (CP-primitive)
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
  - Sliding-window frequency array (CP-primitive framing)
- Sort Characters By Frequency (LC 451) - frequency of frequencies
  - Top K Frequent Elements (LC 347)
  - Top K Frequent Words (LC 692)
  - Reorganize String (LC 767)
- Sort Colors (LC 75)
  - Frequency array as counting sort (CP-primitive, general k)
- Single Number (LC 136)
  - Missing Number (LC 268)

## `content/dsa/patterns/graph-coloring.md`

- Possible Bipartition (LC 886)
  - Is Graph Bipartite? (LC 785)
  - Divide Nodes into the Maximum Number of Groups (LC 2493)
  - Odd-cycle detection (CP-primitive framing)
- Flower Planting With No Adjacent (LC 1042)
  - Graph Coloring
- Chromatic Number (bitmask DP)
  - Minimum number of teams / groups such that no two conflicting members share a team (classic/CP framing)
- Maximum Number of Accepted Invitations (LC 1820)
  - Bipartite matching via 2-coloring (CP-primitive, general graph)

## `content/dsa/patterns/in-place-reversal.md`

- Reverse Linked List (LC 206)
  - Reverse String (LC 344)
  - Reverse Words in a String III (LC 557)
- Reverse Linked List II (LC 92)
  - Rotate List (LC 61)
- Reverse Nodes in k-Group (LC 25)
  - Swap Nodes in Pairs (LC 24)
  - Reverse Nodes in k-Group (iterative, contest variant)
- Reorder List (LC 143)
  - Interleaving two lists (variant)
- Palindrome Linked List (LC 234)
  - Valid Palindrome (LC 125)
- Rotate List (LC 61)

## `content/dsa/patterns/interval-dp.md`

- Burst Balloons (LC 312)
  - Minimum Cost Tree from Leaf Values (LC 1130)
  - Zuma Game (LC 488)
  - Minimum Cost to Cut a Stick (LC 1547)
- Minimum Cost to Merge Stones (LC 1000)
- Strange Printer (LC 664)
  - Minimum Insertion Steps to Make a String Palindrome (LC 1312)
- Palindrome Partitioning II (LC 132)
  - Palindrome Partitioning (LC 131)
- Matrix Chain Multiplication (classic)
  - Optimal Binary Search Tree (classic)
- Remove Boxes (LC 546)

## `content/dsa/patterns/k-way-merge.md`

- Merge K Sorted Lists (LC 23)
  - Merge K Sorted Arrays (classic)
  - Merge Two Sorted Lists (LC 21)
  - Merge Sorted Array (LC 88)
  - Sort List (LC 148)
  - Merge k sorted streams/generators (online variant)
- Kth Smallest Element in a Sorted Matrix (LC 378)
  - Kth Smallest in Multiplication Table (LC 668)
- Smallest Range Covering Elements from K Lists (LC 632)
  - Minimum Window Substring (LC 76)
  - Smallest Range II / running-window variants (classic)
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
  - 01 Matrix (LC 542)
- Shortest Path in a Grid with Obstacles Elimination (LC 1293) - state-augmented BFS
  - Cut Off Trees for Golf Event (LC 675)
- Minimum Obstacle Removal to Reach Corner (LC 2290) - 0-1 BFS
  - Shortest Path in a Grid with Obstacles Elimination (LC 1293)

## `content/dsa/patterns/meet-in-the-middle.md`

- Subset Sum with Large Values (classic)
  - Closest Subsequence Sum (LC 1755)
  - Partition Equal Subset Sum (LC 416)
  - Target Sum (LC 494)
  - Sum of Squares (find four perfect squares summing to N)
  - Subset Sum, two-pointer combine variant (contest optimization)
- Split Array With Same Average (LC 805)
  - Fair Split (partition into two equal-sum groups)
- 4Sum II (LC 454)
  - Two Sum (LC 1)
  - k-sum via MITM (6-sum, 8-sum generalization)

## `content/dsa/patterns/merge-intervals.md`

- Merge Intervals (LC 56)
  - Insert Interval (LC 57)
  - Employee Free Time (LC 759)
  - Merge Sorted Array (LC 88)
- Meeting Rooms II (LC 253)
  - Car Pooling (LC 1094)
  - Max overlap via event points (contest form)
- Non-overlapping Intervals (LC 435)
  - Minimum Number of Arrows to Burst Balloons (LC 452)
- Interval List Intersections (LC 986)
  - Merge Sorted Array (LC 88)
  - Find Right Interval (LC 436)
- My Calendar III (LC 732)

## `content/dsa/patterns/modified-binary-search.md`

- Search in Rotated Sorted Array (LC 33)
  - Search in Rotated Sorted Array II (LC 81)
  - Find Minimum in Rotated Sorted Array (LC 153)
  - Find Minimum in Rotated Sorted Array II (LC 154)
- Find Peak Element (LC 162)
  - Peak Index in a Mountain Array (LC 852)
  - Find in Mountain Array (LC 1095)
  - Find Peak Element in 2D Matrix (LC 1901)
  - Generalized "first True" <abbr>predicate</abbr> search (contest template)
- Find First and Last Position of Element in Sorted Array (LC 34)
  - Search Insert Position (LC 35)
  - Count of Range Sum (LC 327)
  - Time Based Key-Value Store (LC 981)
  - Find Right Interval (LC 436)
  - Online Election (LC 911)
  - Python `bisect` module as drop-in (contest velocity)
- Search a 2D Matrix (LC 74)
  - Search a 2D Matrix II (LC 240)
- Search in a Sorted Array of Unknown Size (LC 702)
  - First Bad Version (LC 278)

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
- Sliding Window Maximum II (grid version)

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
- Sum of Subarray Minimums (LC 907)
  - Sum of Subarray Ranges (LC 2104)

## `content/dsa/patterns/prefix-sum.md`

- Range Sum Query - Immutable (LC 303)
  - Running Sum of 1d Array (LC 1480)
- Subarray Sum Equals K (LC 560)
  - Subarray Sums Divisible by K (LC 974)
  - Continuous Subarray Sum (LC 523)
- Product of Array Except Self (LC 238)
  - Trapping Rain Water (LC 42)
  - Range Sum Query
- Range Sum Query 2D - Immutable (LC 304)

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
- Find All Anagrams in a String (LC 438)
  - Permutation in String (LC 567)

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
- Paint Fence (LC 276)
- Paint House II (LC 265)
- Domino Tiling of a Grid

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
- Top K Frequent Elements, bucket-sort variant (LC 347)
  - Sort Characters By Frequency (LC 451)

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
- Rotting Oranges (LC 994)
  - Walls and Gates (classic, not on LC)
  - As Far from Land as Possible (LC 1162)
- Shortest Path Visiting All Nodes (LC 847)

## `content/dsa/patterns/two-heaps.md`

- Find Median from Data Stream (LC 295)
  - Running Average of Data Stream (not on LC)
  - Kth Largest Element in a Stream (LC 703)
- Sliding Window Median (LC 480)
  - Maximum of Sliding Window (LC 239)
  - Minimum Window Substring (LC 76)
  - Count of Smaller Numbers After Self (LC 315)
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
- Closest Subsequence Sum (LC 1755)
  - Partition Equal Subset Sum-style subset-sum with n ≤ 40 (classic, not on LC in this exact form)

# Data Structures

## `content/dsa/data-structures/array.md`

- Trapping Rain Water
  - Container With Most Water (LC 11)
- Next Permutation
  - Previous Permutation With One Swap (LC 1053)
- Maximum Subarray
  - Maximum Sum Circular Subarray (LC 918)
  - Maximum Product Subarray (LC 152)
- Minimum Size Subarray Sum
  - Minimum Window Substring (LC 76)
- Range Sum Query - Immutable
  - Range Sum Query 2D
  - Contiguous Array (LC 525)
- Range Addition
  - My Calendar II (LC 731)
- Group Anagrams
  - Find All Anagrams in a String (LC 438)

## `content/dsa/data-structures/avl-tree.md`

- Insert into an AVL tree
  - Balance a Binary Search Tree (LC 1382)
- Validate height-balanced
- Build a balanced BST from sorted data
  - Convert Sorted List to Binary Search Tree (LC 109)
- AVL delete with rebalance-on-removal
- Count of Smaller Numbers After Self
  - Kth Largest Element in a Stream (LC 703)

## `content/dsa/data-structures/b-plus-tree.md`

- Range query on a sorted structure
  - Find first and last position of element in sorted array (LC 34)
- Design an index for a database column
  - Design a key-value store with range queries (system design)
- Insert-with-leaf-split (copy-up)

## `content/dsa/data-structures/b-tree.md`

- Why B-trees for databases
- B-tree search
  - Search in a Binary Search Tree (LC 700)
- Choose the order for a disk block
- B-tree vs B+-tree for range scans
- Insert-with-node-split
- Range Sum Query - Mutable
  - Range Sum Query 2D
- Merge k Sorted Lists
  - Smallest Range Covering Elements from K Lists (LC 632)
  - Find K Pairs with Smallest Sums (LC 373)

## `content/dsa/data-structures/binary-search-tree.md`

- Validate Binary Search Tree
- Kth Smallest Element in a BST
  - Binary Search Tree Iterator (LC 173)
- Lowest Common Ancestor of a BST
  - Lowest Common Ancestor of a Binary Tree III (LC 1650)
- Insert into a BST
- Convert Sorted Array to BST
  - Convert Sorted List to Binary Search Tree (LC 109)
- Delete Node in a BST
  - Delete Leaves With a Given Value (LC 1325)
- Inorder Successor in BST
  - Inorder Successor in BST II (LC 510)

## `content/dsa/data-structures/binary-tree.md`

- Maximum Depth of Binary Tree
  - Minimum Depth of Binary Tree (LC 111)
- Binary Tree Level Order Traversal
  - Binary Tree Zigzag Level Order Traversal (LC 103)
  - Average of Levels in Binary Tree (LC 637)
- Invert Binary Tree
- Diameter of Binary Tree
  - Binary Tree Maximum Path Sum (LC 124)
  - Balanced Binary Tree (LC 110)
  - House Robber III (LC 337)
- Lowest Common Ancestor
  - Lowest Common Ancestor of a Binary Tree II (LC 1644)

## `content/dsa/data-structures/bloom-filter.md`

- Design a Web Crawler URL Deduplication System
  - Design a spam filter for email deduplication (same mechanic: large n, tolerate FP, no FN, no deletion).
  - Implement a visited-set for a large-scale graph crawler with a 1 GB memory cap"
  - Design a Spell Checker (static dictionary load, FP-rate-vs-memory sizing)
- First Missing Positive (Membership + Exact Fallback)
  - Find the duplicate number in [1..n] with O(1) space" (LC 287)
  - Find all missing numbers in [1..n]" (LC 448)
- Design a Counting Bloom Filter with Delete
  - Design a rate limiter using a sliding-window with probabilistic eviction"
  - Design a distributed deduplication service where messages can be retracted"

## `content/dsa/data-structures/circular-buffer.md`

- Design Circular Queue
  - Design Circular Deque (LC 641)
  - Design a Stack With Increment Operation (LC 1381)
- Design Hit Counter
  - Moving Average from Data Stream (below)
  - Logger Rate Limiter (LC 359)
- Moving Average from Data Stream
  - Design Hit Counter (above)
  - Sliding Window Average of All Subarrays of Size K (variant framing)
  - Fixed-window rolling aggregate (running sum/min/max over the last k elements, no LC number)
- Design a Rate Limiter
  - Design a Logger Rate Limiter (LC 359)
  - Design Hit Counter (above)
- Rotate Array
  - Rotate List (LC 61)

## `content/dsa/data-structures/deque.md`

- Sliding Window Maximum
  - Jump Game VI (LC 1696)
  - Constrained Subsequence Sum (LC 1425)
- Design Circular Deque
  - Design Circular Queue (LC 622)
- Shortest Subarray with Sum at Least K (LC 862)
- Sliding Window Median
  - Find Median from Data Stream (LC 295)
- Minimum Cost to Make at Least One Valid Path in a Grid
  - Shortest Path in Binary Matrix (LC 1091)
  - Number of Ways to Arrive at Destination (LC 1976)

## `content/dsa/data-structures/dynamic-array.md`

- Implement a Dynamic Array from Scratch - grow-and-shrink resize policy
  - Design a ArrayList / Vector class (common systems-interview phrasing)
- O(1) Removal at an Arbitrary Index
- Amortized Copy-Count Walkthrough - aggregate-method proof by simulation
- Growth Factor Comparison - geometric vs fixed-increment resizing
- Insert Delete GetRandom O(1)
  - Insert Delete GetRandom O(1)
- Min Stack
  - Max Stack (design variant)
- Implement Queue using Stacks - amortized analysis across two buffers
  - Implement Stack using Queues (LC 225)
- Next Greater Element
  - Daily Temperatures (LC 739)
  - Largest Rectangle in Histogram (LC 84)
- Sliding Window Median
  - Find Median from Data Stream (LC 295)

## `content/dsa/data-structures/fenwick-tree.md`

- Range Sum Query - Mutable
  - Range Sum Query 2D
- Count of Smaller Numbers After Self
  - Reverse Pairs (LC 493)
  - Count of Range Sum (LC 327)
  - Count inversions in an array (classic)
- Range Sum Query - Range Update and Range Sum
- Range Addition
  - My Calendar III (LC 732)

## `content/dsa/data-structures/graph.md`

- Number of Islands (LC 200)
  - Flood Fill (LC 733)
  - Max Area of Island (LC 695)
  - Count Sub Islands (LC 1905)
- Clone Graph (LC 133)
  - Copy List with Random Pointer (LC 138)
  - Graph Valid Tree (LC 261)
  - Pacific Atlantic Water Flow (LC 417)
- Course Schedule (LC 207)
  - Course Schedule II (LC 210)
  - Find Eventual Safe States (LC 802)
  - Alien Dictionary (LC 269)
- Network Delay Time (LC 743)
  - Path with Minimum Effort (LC 1631)
  - Cheapest Flights Within K Stops (LC 787)
- Redundant Connection (LC 684)
  - Number of Provinces (LC 547)
  - Accounts Merge (LC 721)
- Count of Smaller Numbers After Self on a Tree (subtree-sum queries via Euler tour)
  - Kth Ancestor of a Tree Node (LC 1483)

## `content/dsa/data-structures/hash-set.md`

- Contains Duplicate
  - Contains Duplicate II (LC 219)
- Intersection of Two Arrays
- Longest Consecutive Sequence
  - Longest Consecutive Sequence II (variants on trees/graphs)
- Happy Number
  - Linked List Cycle (LC 141)

## `content/dsa/data-structures/hash-table.md`

- Two Sum
  - Two Sum IV
  - 4Sum II (LC 454)
- Group Anagrams
  - Group Shifted Strings (LC 249)
- Longest Consecutive Sequence
- Subarray Sum Equals K
  - Contiguous Array (LC 525)
  - Subarray Sums Divisible by K (LC 974)
- First Unique Character
  - Sort Characters By Frequency (LC 451)
- Longest Common Subsequence
  - Edit Distance (LC 72)
  - Distinct Subsequences (LC 115)

## `content/dsa/data-structures/heap.md`

- Kth Largest Element in a Stream
  - Kth Largest Element in an Array (LC 215)
- Top K Frequent Elements
  - Top K Frequent Words (LC 692)
  - K Closest Points to Origin (LC 973)
- Merge K Sorted Lists (LC 23)
  - Kth Smallest Element in a Sorted Matrix (LC 378)
- Find Median from Data Stream
  - Sliding Window Median (LC 480)
- Swim in Rising Water (LC 778)
  - Path with Minimum Effort (LC 1631)
  - Path with Maximum Probability (LC 1514)
- Network Delay Time (LC 743)
  - Cheapest Flights Within K Stops (LC 787)

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

- LFU Cache
- All O`one` Data Structure
- Top K Frequent Elements
  - Top K Frequent Words (LC 692)
  - Sort Characters By Frequency (LC 451)
- Maximum Frequency Stack (LC 895)
  - LRU Cache

## `content/dsa/data-structures/linked-list.md`

- Reverse a Linked List - _iterative pointer rewiring_
  - Reverse Linked List II (LC 92)
- Linked List Cycle II - _Floyd's tortoise and hare_
  - Find the Duplicate Number (LC 287)
- Merge Two Sorted Lists - _dummy head + splice_
  - Merge Sorted Array (LC 88)
- Remove Nth Node From End - _two pointers, one pass_
  - LRU Cache

## `content/dsa/data-structures/lru-cache.md`

- LRU Cache
  - Design In-Memory File System with LRU eviction (variant, no canonical LC number)
  - All O(1) Data Structure (LC 432)
- LFU Cache
- LRU Cache with TTL

## `content/dsa/data-structures/queue.md`

- Implement Queue using Stacks
  - Implement Stack using Queues (LC 225)
- Number of Recent Calls
- Sliding Window Maximum
  - Shortest Subarray with Sum at Least K (LC 862)
- Rotting Oranges
  - 01 Matrix (LC 542)
- 0/1 Matrix Shortest Path
  - Minimum Cost to Make at Least One Valid Path in a Grid (LC 1368)

## `content/dsa/data-structures/red-black-tree.md`

- Why libraries pick red-black over AVL - _reasoning_
- Verify red-black properties - _black-height check_
  - Balanced Binary Tree (LC 110)
- Red-black insert fixup - _recolor then rotate_
- Order-statistics with a red-black tree - _augmentation_
  - Count of Smaller Numbers After Self (LC 315)

## `content/dsa/data-structures/segment-tree.md`

- Range Sum Query - Mutable
  - Range Sum Query 2D
- Range Minimum Query with updates
  - Range Maximum Query variants (implicit in many sliding-window/stack problems reframed with updates)
  - Sliding Window Maximum (LC 239)
- Range Addition
  - Range Sum Query
  - My Calendar III (LC 732)
- Range Frequency Query
  - Count of Range Sum (LC 327)

## `content/dsa/data-structures/skip-list.md`

- Design Skiplist (LeetCode 1206)
  - Design a Sorted Set / Ordered Map from scratch
- Range Sum Query with Frequent Insert/Delete (design variant)
  - Count of Smaller Numbers After Self (LeetCode 315)
- LRU-style Ordered Eviction by Score (Redis ZSET-style design)
  - Leaderboard design problems (LeetCode 1244 "Design A Leaderboard")

## `content/dsa/data-structures/stack.md`

- Valid Parentheses
  - Remove All Adjacent Duplicates In String (LC 1047)
  - Minimum Remove to Make Valid Parentheses (LC 1249)
- Daily Temperatures
  - Next Greater Element I (LC 496)
- Min Stack
  - Max Stack (LC 716)
- Evaluate Reverse Polish Notation
- Largest Rectangle in Histogram
  - Maximal Rectangle (LC 85)
- Iterative Postorder Traversal
  - Iterative Inorder Traversal (variant, no distinct LC number beyond LC 94)

## `content/dsa/data-structures/string.md`

- Valid Anagram
  - Ransom Note (LC 383)
  - First Unique Character in a String (LC 387)
- Implement strStr / Find the Index
  - Repeated DNA Sequences (LC 187)
- Longest Substring Without Repeating Characters
  - Longest Substring with At Most Two Distinct Characters (LC 159)
  - Max Consecutive Ones III (LC 1004)

## `content/dsa/data-structures/suffix-tree.md`

- Longest Repeated Substring (via suffix tree)
  - Longest Repeated Substring via Suffix Array (LC-style, SPOJ)
  - Longest Repeated Non-Overlapping Substring
  - Longest Duplicate Substring (LC 1044)
  - Deepest-node-via-explicit-tree-walk variants (competitive-programming judges)
- Count Distinct Substrings (via suffix tree)
  - Number of Distinct Substrings via Suffix Array (SPOJ DISUBSTR)
  - Count of Distinct Substrings of Length K
- Longest Common Substring Across k Strings (Generalized Suffix Tree)
  - Longest Common Substring of Two Strings (Suffix Array version)
  - Bottom-up subtree-bitmask queries (competitive-programming judges)
- Count Pattern Occurrences with Many Queries (LCP + RMQ)
  - Number of Distinct Substrings (this article, Practice #2)

## `content/dsa/data-structures/treap.md`

- Design a Sorted Set with Fast Rank Queries
  - Order-Statistics Tree (k-th smallest)
  - Count of Smaller Numbers After Self (LC 315)
- Range Reverse and Query (Implicit Treap)
  - Rope data structure operations (used in text editors for large-document insert/delete/substring)
  - Insert/delete at arbitrary array index in O(log n)
- Merge Two Treaps / Union of Two Sorted Sets
  - Union of Two Balanced BSTs (weight-balanced tree "join" algorithm)
  - Persistent Treap Version Merge
  - Split treap at key k (the inverse operation)

## `content/dsa/data-structures/trie.md`

- Implement a Trie - _insert, search, startsWith_
  - Map Sum Pairs (LC 677)
  - Longest Word in Dictionary (LC 720)
- Word Search II
- Replace Words
- Maximum XOR of Two Numbers (LC 421)
  - Maximum XOR With an Element From Array (LC 1707)
- Design Add and Search Words
- Count Words With a Given Prefix
  - Map Sum Pairs (LC 677)

## `content/dsa/data-structures/union-find.md`

- Number of Connected Components in an Undirected Graph
  - Number of Provinces (LC 547)
  - Number of Islands (LC 200)
  - Largest component / max size after unions
- Kruskal's MST (edge-sort + DSU cycle detection)
  - Min Cost to Connect All Points (LC 1584)
  - Connecting Cities With Minimum Cost (LC 1135)
  - Any "minimum cost to connect all nodes" / "build a minimum-weight spanning forest" restatement
- Accounts Merge
  - Sentence Similarity II (LC 737)
  - Largest Component Size by Common Factor (LC 952)
- Redundant Connection - cycle detection
  - Redundant Connection II (LC 685)
  - Graph Valid Tree (LC 261)
  - Online "add edge, is the graph still acyclic?" streaming queries
- Satisfiability of Equality Equations (LC 990)

# Algorithms

## `content/dsa/algorithms/aho-corasick.md`

- Implement Aho-Corasick / Multi-pattern string matching
  - Stream of Characters (LC 1032)
  - Word Filter / Multi-keyword Content Moderation
  - Multi-String Matching / Word Break II variants that ask "which dictionary words appear in this text" (various online-judge phrasings)
  - Detect all forbidden substrings in a document (content-moderation-flavored judge problems)
- Short Encoding of Words (LC 820) - trie suffix links, *not* Aho-Corasick (but the neighbor to not confuse)

## `content/dsa/algorithms/amortized-analysis.md`

- Design a Stack With Increment Operation (LC 1381)
  - Range Update range-sum queries via difference array (general technique)
- Implement Queue using Stacks (LC 232)
  - Min Stack (LC 155)
- Union-Find with Path Compression and Union by Rank
  - Number of Connected Components in an Undirected Graph (LC 323)
  - Accounts Merge (LC 721)

## `content/dsa/algorithms/backtracking.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/algorithms/bellman-ford.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/algorithms/bfs.md`

_(stub - no Practice problems entries yet)_

## `content/dsa/algorithms/big-o-notation.md`

- Merge two sorted arrays - derive the bound
  - Merge Sorted Array (LC 88)
- Nested loop with a shrinking bound
- Recurrence solving via Master theorem
  - Pow(x, n) (LC 50)
- Amortized cost of a dynamic array - accounting method
  - Design a HashSet / Design HashMap (LC 705/706)

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
