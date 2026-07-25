# Sorting Comparison Cheatsheet

Which sort to pick, side by side.

> 📖 Full articles:
> [Sorting](../algorithms/sorting.md) (hub) · [Merge Sort](../algorithms/merge-sort.md) · [Quicksort](../algorithms/quicksort.md) · [Heapsort](../algorithms/heapsort.md) · [Insertion Sort](../algorithms/insertion-sort.md) · [Counting Sort](../algorithms/counting-sort.md) · [Radix Sort](../algorithms/radix-sort.md)
> <!-- Uncomment once written: [Bucket Sort](../algorithms/bucket-sort.md) · [Selection Sort](../algorithms/selection-sort.md) -->

## Comparison

| Algorithm | Best | Average | Worst | Space | Stable | Use when |
| --- | --- | --- | --- | --- | --- | --- |
| Merge Sort | n log n | n log n | n log n | O(n) | Yes | guaranteed worst-case bound needed, or stability required |
| Quicksort | n log n | n log n | **n²** | O(log n) | No | memory tight, average-case speed matters, in-place |
| Heapsort | n log n | n log n | n log n | O(1) | No | need worst-case O(n log n) AND O(1) space |
| Insertion Sort | **n** | n² | n² | O(1) | Yes | tiny or nearly-sorted input; Timsort's small-run sort |
| Counting Sort | n + k | n + k | n + k | O(n + k) | Yes | bounded integer keys, range k = O(n) |
| Radix Sort (LSD) | d·(n+b) | d·(n+b) | d·(n+b) | O(n + b) | Yes | fixed-width integer/string keys, beats n log n |
<!-- | Bucket Sort | n + k | n + k | n² | O(n + k) | Yes | uniform-distribution floats in a known range | -->
<!-- | Selection Sort | n² | n² | n² | O(1) | No | teaching baseline, minimal swaps | -->

## Decision table

| Condition | Pick | Why |
| --- | --- | --- |
| General-purpose, arbitrary comparable keys | Library sort (Timsort/introsort) | battle-tested, adaptive, O(n log n) |
| Need guaranteed worst-case O(n log n), adversarial input | Merge Sort | no O(n²) tail unlike quicksort |
| Need stability (equal keys keep input order) | Merge Sort, Insertion Sort, or Counting Sort | quicksort/heapsort are not stable |
| Memory tight, average speed matters | Quicksort | O(1)-extra in-place, small constant |
| Need worst-case O(n log n) AND O(1) space | Heapsort | only comparison sort with both; cache-unfriendly tradeoff |
| Keys are bounded integers, range k = O(n) | Counting Sort | O(n), breaks the comparison bound |
| Fixed-width integer/string keys, huge n | Radix Sort | O(d·(n+b)), digit-bucketing |
| Need only the k-th element, not full order | Quickselect (not a full sort) | O(n) average, one-sided partition |
| Need only the top-k, not full order | Heap (not a full sort) | O(n log k), sorting throws away work |

## Gotchas

- ⚠️ Comparison sorts cannot beat O(n log n) - proven lower bound (decision tree needs log₂(n!) ≈ n log n comparisons). Only escape by not comparing (counting/radix).
- ⚠️ Naive quicksort pivot degrades to O(n²) on sorted input - randomize the pivot or use median-of-three.
- ⚠️ Counting sort allocates a k-sized array - useless or OOMs when key range k is huge relative to n.
