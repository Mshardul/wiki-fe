# Complexity Master Cheatsheet

Every data structure and algorithm's Big-O, one page.

> 📖 Full articles: see [Data Structure Selection](./data-structure-selection.md) and [Sorting Comparison](./sorting-comparison.md) for per-topic links - this page aggregates both plus the remaining algorithm families.

## Data structures

See [Data Structure Selection](./data-structure-selection.md) for the full per-operation breakdown (access/insert/delete/peek) across all 27 filled structures.

## Sorting algorithms

See [Sorting Comparison](./sorting-comparison.md) for the full best/average/worst/space/stability table across all 6 filled sorts.

## Searching & recursion

| Algorithm | Time | Space |
| --- | --- | --- |
| Binary Search | O(log n) | O(1) iterative |
| Recursion (naive, no memo) | O(2ⁿ) typical worst case | O(n) stack depth |
| Divide and Conquer | T(n) = aT(n/b) + f(n), solved via Master Theorem | varies by recurrence |
| Backtracking | O(k · C(n,k)) typical | O(k) |

## Graph algorithms

| Algorithm | Time | Space |
| --- | --- | --- |
| BFS | O(V + E) | O(V) |
| DFS | O(V + E) | O(V) |
| Strongly Connected Components | O(V + E) | O(V + E) |
| Ford-Fulkerson | O(E · max_flow) | O(V + E) |
| Edmonds-Karp | O(V E²) | O(V + E) |
| Dinic | O(V² E) general, O(E√V) unit-cap | O(V + E) |
| Bipartite Matching | O(V · E) | O(V + E) |
<!-- Uncomment once written: Dijkstra O((V+E) log V) / O(V); Bellman-Ford O(VE) / O(V); Floyd-Warshall O(V³) / O(V²); MST O(E log V) / O(V); Topological Sort O(V+E) / O(V) -->

## Dynamic programming

| Shape | Time | Space |
| --- | --- | --- |
| Generic DP (states × transition) | O(states × transition cost) | O(states), often rollable |
| Longest Increasing Subsequence | O(n log n) | O(n) |
| Longest Common Subsequence | O(n·m) | O(min(n,m)) |
| Kadane (max subarray) | O(n) | O(1) |
| Bitmask DP | O(2ⁿ · n) typical | O(2ⁿ) |
| Interval DP | O(n³) | O(n²) |

## Greedy

| Algorithm | Time | Space |
| --- | --- | --- |
| Greedy (generic) | O(n log n) - dominated by sort | O(1) |

## String algorithms

See [String Algorithm Decision](./string-algorithm-decision.md) for the full table (KMP, Z, Rabin-Karp, Manacher, Aho-Corasick, String Hashing).

## Bit manipulation

| Operation | Time | Space |
| --- | --- | --- |
| Single-bit ops (check/set/clear/toggle) | O(1) | O(1) |
| Popcount (Brian Kernighan) | O(k), k = set bits | O(1) |
| Subset enumeration over a bitmask | O(3ⁿ) total across all submasks | O(1) |

## Number theory

| Operation | Time | Space |
| --- | --- | --- |
| GCD (Euclidean) | O(log min(a,b)) | O(1) iterative, O(log min(a,b)) recursive |
| Modular exponentiation | O(log exp) | O(1) |
| Sieve of Eratosthenes | O(n log log n) | O(n) |

## Gotchas

- ⚠️ "O(n log n)" hides which constant dominates - quicksort's average case and merge sort's guaranteed case are the same Big-O but different real-world speed.
- ⚠️ Graph algorithm complexity depends on representation - adjacency list gives O(V+E), adjacency matrix forces O(V²) regardless of actual edge count.
- ⚠️ DP's stated complexity is `states × transition` - always verify both factors before trusting a memorized bound.
