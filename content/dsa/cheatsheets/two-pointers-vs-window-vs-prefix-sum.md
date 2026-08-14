# Two Pointers vs Sliding Window vs Prefix Sum Cheatsheet

The three commonly-confused array/string scanning patterns, disambiguated.

> 📖 Full articles:
> [Two Pointers](../patterns/two-pointers.md) · [Sliding Window](../patterns/sliding-window.md) · [Prefix Sum](../patterns/prefix-sum.md)

## Recognition table

| Trigger phrase | Pattern |
| --- | --- |
| "find a pair that sums to target", "3Sum", "container with most water" | Two Pointers |
| "remove duplicates in-place", "is this a palindrome?" | Two Pointers |
| "longest/shortest contiguous subarray...", "at most K distinct" | Sliding Window |
| "minimum window substring", "sliding window maximum" | Sliding Window |
| "subarray sum equals K", "range sum query", immutable array + many queries | Prefix Sum |
| "pivot index", "product of array except self" | Prefix Sum |

## Disambiguator

| Aspect | Two Pointers | Sliding Window | Prefix Sum |
| --- | --- | --- | --- |
| What's between the pointers | not tracked | tracked as a maintained aggregate | precomputed once, any range in O(1) |
| Input requirement | sorted (or sortable without breaking the problem) | any array/string | static/immutable (or rarely updated) |
| Output shape | pair/triplet/transformed array | single value or list of windows | answer to any [L,R] query |
| Complexity | O(n) | O(n) | O(n) preprocess, O(1) per query |
| Query pattern | one pass, converges to a condition | one pass, expand/contract | many arbitrary-order queries |

## Decision table

| Condition | Pick |
| --- | --- |
| Need to know what's between two positions (running aggregate) | Sliding Window |
| Don't need to know what's between, just converge two pointers to a condition | Two Pointers |
| Array is static, need many arbitrary-range sum queries | Prefix Sum |
| Array is static but mutated between queries | Fenwick Tree / Segment Tree, not Prefix Sum |
| Need O(1) range *updates* instead of reads | Difference Array (prefix sum's inverse) |

## Gotchas

- ⚠️ <abbr>Sliding window</abbr> IS two-pointers with window semantics - the test is "does the gap between L and R carry a maintained aggregate?" If yes, it's sliding window.
- ⚠️ <abbr>Prefix sum</abbr> requires the array to not change between queries - a single update forces an O(n) rebuild; if updates are frequent, use a Fenwick tree/segment tree instead.
- ⚠️ <abbr>Two-pointer</abbr> requires sorted input (or a convergence property) - using it on unsorted data without that property gives wrong answers, not just slow ones.
