# Backtracking Shapes Cheatsheet

Subset vs permutation vs combination vs partition - the loop-shape differences.

> 📖 Full articles:
> [Backtracking](../patterns/backtracking.md)
> <!-- Uncomment once written: [Subsets & Permutations](../patterns/subsets-permutations.md) -->

## Shape comparison

| Shape | Choice per step | Dedup mechanism | Depth |
| --- | --- | --- | --- |
| Subset (power set) | include or exclude each element once | none needed if elements are distinct; sort + skip-equal-sibling if duplicates | fixed = n (one decision per element) |
| Permutation | pick any unused element next | track a "used" set/array | fixed = n (arrangement of all elements) |
| Combination (fixed size k) | pick from `start` index onward, no reuse | `start` index prevents revisiting earlier elements | fixed = k |
| Combination Sum (unbounded reuse) | pick from `start` index onward, reuse allowed | recurse with the SAME start index (not start+1) | variable, bounded by target/prune |
| Partition (fixed segment count) | split remaining input into a fixed number of valid pieces | consume input left-to-right, prune invalid segments | fixed = segment count |

## Decision table

| Condition | Pick |
| --- | --- |
| "generate all subsets / power set" | Subset shape - include/exclude each element |
| "generate all arrangements/orderings" | Permutation shape - track used elements |
| "choose k elements, order doesn't matter" | Combination shape - start-index, no reuse |
| "each candidate may be used unlimited times, sum to target" | Combination Sum shape - start-index WITH reuse |
| "split into exactly N valid pieces" | Partition shape - bounded-depth segment recursion |

## Gotchas

- ⚠️ Combination vs Combination Sum: the only code difference is whether the recursive call passes `start` or `start+1` - reusing the same start index is what allows element reuse.
- ⚠️ Duplicate results with repeated input elements - fix with a `start` index (combinations) or a sorted "skip equal siblings" guard (`if i > start and a[i] == a[i-1]: continue`).
- ⚠️ Permutation search is O(n!) - only invites brute force at n ≤ ~10; subsets are O(2ⁿ), inviting brute force up to n ≤ ~20.
