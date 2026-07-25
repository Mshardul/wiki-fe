# Pattern Selection Cheatsheet

Trigger phrase → which pattern.

> 📖 Full articles:
> [Two Pointers](./two-pointers.md) · [Sliding Window](./sliding-window.md) · [Prefix Sum](./prefix-sum.md) · [Difference Array](./difference-array.md) · [Fast & Slow Pointers](./fast-slow-pointers.md) · [Monotonic Stack](./monotonic-stack.md) · [Monotonic Queue](./monotonic-queue.md) · [Binary Search on Answer](./binary-search-on-answer.md) · [Modified Binary Search](./modified-binary-search.md) · [Backtracking](./backtracking.md) · [Two Heaps](./two-heaps.md) · [K-Way Merge](./k-way-merge.md) · [Interval DP](./interval-dp.md) · [In-place Reversal](./in-place-reversal.md) · [Matrix Traversal](./matrix-traversal.md) · [State Machine DP](./state-machine-dp.md) · [Bitmask DP](./bitmask-dp.md) · [Frequency Array](./frequency-array.md) · [Graph Coloring](./graph-coloring.md) · [Meet in the Middle](./meet-in-the-middle.md)
> <!-- Uncomment once written: [Cyclic Sort](./cyclic-sort.md) · [Merge Intervals](./merge-intervals.md) · [Subsets & Permutations](./subsets-permutations.md) · [Top-K Elements](./top-k-elements.md) · [Tree & Graph Traversal](./tree-graph-traversal.md) · [DP Patterns](./dp-patterns.md) -->

## Recognition table

| Trigger phrase / signal | Maps to |
| --- | --- |
| "find a pair that sums to target", "3Sum", "container with most water" | Two Pointers |
| "longest/shortest contiguous subarray...", "minimum window substring" | Sliding Window |
| "subarray sum equals K", "range sum query" (immutable, many queries) | Prefix Sum |
| "add val to each element in range [l,r]", "each booking reserves seats..." | Difference Array |
| "detect a cycle in a linked list", "find the starting node of the cycle" | Fast & Slow Pointers |
| "next greater element", "daily temperatures" | Monotonic Stack |
| "maximum/minimum of every sliding window of size k" | Monotonic Queue |
| "minimize the maximum", "maximize the minimum" | Binary Search on Answer |
| "array was sorted then rotated at an unknown pivot", "find the peak element" | Modified Binary Search |
| "find all valid...", "generate all combinations/arrangements that satisfy..." | Backtracking |
| "find the median of a data stream", "sliding window median" | Two Heaps |
| "merge k sorted lists", "smallest range including one element from each of k lists" | K-Way Merge |
| "burst all balloons", "optimal parenthesization of a matrix chain" | Interval DP |
| "reverse a linked list", "reverse nodes k at a time" | In-place Reversal |
| "count islands in a grid", "shortest path top-left to bottom-right" | Matrix Traversal |
| "at most k transactions", "with cooldown", "hold at most one share" | State Machine DP |
| "visit every city exactly once", n ≤ 20, subset over small set | Bitmask DP |
| "is this an anagram", "characters appearing more than k times" | Frequency Array |
| "determine if the graph is bipartite", "odd-length cycle check" | Graph Coloring |
| "n ≤ 40, subset sums to target T", "count pairs from two halves" | Meet in the Middle |

## Gotchas

- ⚠️ Sliding window IS two-pointers with a maintained aggregate over the gap - if you don't need to know what's between the pointers, it's plain two-pointers.
- ⚠️ Bitmask DP vs meet-in-the-middle: both handle small n, but bitmask needs a DP recurrence over subsets (n ≤ 20); meet-in-the-middle splits into two independent halves with no recurrence (n ≤ 40).
- ⚠️ "Find all X" doesn't always mean backtracking - if the same state recurs via different paths, that's overlapping subproblems, meaning DP, not backtracking.
