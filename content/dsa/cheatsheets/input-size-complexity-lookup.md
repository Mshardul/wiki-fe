# Input Size → Complexity Lookup Cheatsheet

Given n, what Big-O is even feasible - the constraint-reading gut check.

> 📖 Full articles:
> [Sorting](../algorithms/sorting.md) · [Dynamic Programming](../algorithms/dynamic-programming.md) · [Bitmask DP](../patterns/bitmask-dp.md) · [Meet in the Middle](../patterns/meet-in-the-middle.md) · [Sliding Window](../patterns/sliding-window.md)

## Lookup table

| n | Feasible complexity | Typical approach |
| --- | --- | --- |
| n ≤ 10-12 | O(n!), O(2ⁿ · n) | brute-force permutations, full backtracking |
| n ≤ 20-22 | O(2ⁿ), O(2ⁿ · n) | bitmask DP, meet-in-the-middle (splits to 2^(n/2)) |
| n ≤ 40 | O(2^(n/2)) | meet-in-the-middle only - 2ⁿ itself is too slow |
| n ≤ 500 | O(n³) | interval DP, Floyd-Warshall-style triple loop |
| n ≤ 2,000-5,000 | O(n²) | double loop, simple DP over pairs |
| n ≤ 10⁵-10⁶ | O(n log n) | sorting-based, heap, binary search, divide & conquer |
| n ≤ 10⁶-10⁸ | O(n) or O(n log n) | single pass, two pointers, sliding window, prefix sum |
| n ≤ 10⁸+ | O(log n) or O(1) | binary search on answer, math formula, modular exponentiation |

## Gotchas

- ⚠️ "n ≤ 20" is the classic bitmask-DP tell - O(2ⁿ) fits comfortably, O(n²·2ⁿ) usually still does, O(n!) does not.
- ⚠️ O(n²) at n = 10⁵ is ~10¹⁰ operations - too slow (>1s) even though it "only" looks quadratic on paper; re-check the actual n before assuming O(n²) is safe.
- ⚠️ Multiple constraints in one problem (e.g. "n ≤ 10⁵ but values ≤ 10⁹") - the SMALLEST bound usually dictates the achievable complexity, not the largest.
