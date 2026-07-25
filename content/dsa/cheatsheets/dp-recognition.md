# DP Recognition Cheatsheet

Problem shape → DP state signature → transition shape.

> 📖 Full articles:
> [Dynamic Programming](../algorithms/dynamic-programming.md) · [Longest Increasing Subsequence](../algorithms/longest-increasing-subsequence.md) · [Longest Common Subsequence](../algorithms/longest-common-subsequence.md) · [Kadane](../algorithms/kadane.md) · [Bitmask DP](../patterns/bitmask-dp.md) · [Interval DP](../patterns/interval-dp.md) · [State Machine DP](../patterns/state-machine-dp.md)
> <!-- Uncomment once written: [DP Patterns hub](../patterns/dp-patterns.md) -->

## Recognition table

| Trigger phrase / signal | DP shape | State |
| --- | --- | --- |
| "fewest coins to make amount N" | 1D DP (unbounded choice) | `dp[a]` = best ending at amount a |
| "maximum subarray sum" | 1D DP / Kadane | `dp[i]` = best subarray ending at i |
| "longest increasing subsequence" | 1D DP (LIS) | `dp[i]` = LIS length ending at i |
| n items, capacity W, "at most once per item" | 0/1 Knapsack | `dp[i][w]` = best using first i items, capacity w |
| two strings, "longest common..." | 2D DP (LCS-family) | `dp[i][j]` = first string prefix i vs second prefix j |
| "visit every city exactly once", n ≤ 20, subset over small set | Bitmask DP | `dp[mask][last]` = best having visited subset mask, ending at last |
| "burst all balloons", "optimal parenthesization", merge/split adjacent segments | Interval DP | `dp[i][j] = min/max over k of dp[i][k] + dp[k+1][j] + cost` |
| "at most k transactions", "with cooldown", "hold at most one share" | State Machine DP | `dp[i][state]` = best at index i in named state |
| "paint houses, no two adjacent same color" | State Machine DP | `dp[i][color]` = best up to house i ending in color |

## Not-to-confuse-with

| Pair | Distinction |
| --- | --- |
| Bitmask DP vs plain Knapsack | Bitmask tracks *which* items (subset matters, n ≤ 20); knapsack tracks *how much capacity used* (n up to 10⁵, doesn't need to know which items) |
| Interval DP vs 1D DP (LIS/Kadane) | Interval DP state is a pair `[i,j]` (contiguous range); 1D DP state is a single index |
| Interval DP vs Bitmask DP | Interval DP = contiguous range, order fixed; Bitmask DP = arbitrary subset, order doesn't matter |
| State Machine DP vs plain 1D DP | State machine's recurrence depends on *which named mode* you're in, not just the index or a numeric bound |
| State Machine DP vs Bitmask DP | State machine = constant small number of named states (2-5); bitmask = exponentially many subset-states |
| Any DP vs Backtracking | DP memoizes each state once (overlapping subproblems exist); backtracking re-explores without memoizing (use when subproblems don't overlap) |
| Any DP vs Divide & Conquer | D&C subproblems are independent; DP subproblems overlap and get cached |

## Gotchas

- ⚠️ n ≤ 20 is the near-universal signal for bitmask DP - if you see it and a subset/ordering question, don't reach for plain backtracking.
- ⚠️ DP requires the state dependency graph to be a DAG (no cycles) - if a subproblem's answer depends on the path taken to reach it (not just the state), DP doesn't apply; that's when you need full search.
- ⚠️ Complexity is always `states × transition cost` - count distinct states first, then the per-state work, don't guess.
