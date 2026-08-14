# Top-K Elements

## Prerequisites

- [Heap](../data-structures/heap.md) [Must read]
- [Quickselect](../algorithms/quickselect.md) [Should read]

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [Recognition signals](#recognition-signals)
- [How it works](#how-it-works)
- [Complexity](#complexity)
- [Constraints & approach](#constraints--approach)
- [Variations](#variations)
- [Pitfalls](#pitfalls)
- [First 30 seconds](#first-30-seconds)
- [Related](#related)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

## What it is

**Top-K Elements** maintains a **size-bounded heap of k entries** over a stream or array, so the k largest (or smallest, or most-frequent) elements are always available without sorting everything.

Mental model: **a bouncer at a club with exactly k seats.** Every new arrival is compared to the *worst-currently-seated* guest (the heap top). If the newcomer beats them, the worst guest is evicted and the newcomer takes the seat; otherwise the newcomer is turned away. The heap top is always "the worst of the best k so far."

> **Takeaway (say this out loud):** "Top-K - keep a heap of size k, opposite-ordered to what you want, evict the top on every element that beats it. O(n log k) beats sorting everything in O(n log n) whenever k is small."

## Recognition signals

### (a) Trigger phrases

- "Find the **k largest / smallest** elements in an array or stream"
- "Return the **k-th largest** element"
- "**Top k frequent** elements / words"
- "Find the **k closest** points to the origin (or to a target)"

### (b) Structural cues

- **Input:** an array or stream of n items where n is large relative to k.
- **Output property:** only k items (or their extreme, the k-th one) are needed - not a full sorted order of all n.
- **Key shape:** you need "the best k so far" available at any point, or just once at the end, without paying O(n log n) to sort everything.

### (c) Not to be confused with

- **Quickselect:** quickselect finds a single static answer (the k-th largest of a fixed array) in O(n) average with in-place partitioning; top-K's heap is for an ongoing stream or when you need all k elements (not just the boundary one) with a worse but simpler O(n log k) bound.
- **Two Heaps:** two heaps track the **center** (median) of a stream with a balanced max-heap/min-heap pair; top-K tracks a **one-sided extreme** with a single fixed-size heap.
- **K-Way Merge:** k-way merge combines k *already-sorted* sequences with a heap of size k (one slot per sequence); top-K filters the k best items out of *one* unsorted stream with a heap of size k (one slot per candidate answer). Same heap size k, opposite roles.

## How it works

Keep a heap of at most k elements, **ordered opposite to what you want**: for "k largest," use a **min-heap** so the smallest of the current top-k sits at the top, ready to be evicted the moment something bigger arrives.

```
Stream: 3, 1, 5, 12, 2, 11    find k=3 largest

min-heap (size ≤ 3), top shown first:

push 3:   [3]                          size 1 < k, just push
push 1:   [1, 3]                       size 2 < k, just push
push 5:   [1, 3, 5]                    size 3 = k, just push
push 12:  12 > top(1) → evict 1, push 12
          [3, 5, 12]
push 2:   2 < top(3) → skip (would shrink the top-k)
          [3, 5, 12]
push 11:  11 > top(3) → evict 3, push 11
          [5, 11, 12]

Final heap: {5, 11, 12} - the 3 largest, min-heap top = 5 = the 3rd largest
```

**Why min-heap for "k largest":** the heap's job is to answer "what's the weakest member of my current top-k?" in O(1) - that's exactly a min-heap's peek. Flip the ordering for "k smallest" (use a max-heap instead).

**Invariant:** after processing any prefix of the stream, the heap holds exactly the k largest elements seen so far (or fewer, if fewer than k have arrived) - the top is always the smallest of those k, i.e. the current k-th-largest overall.

## Complexity

| Operation | Time | Space |
|-----------|------|-------|
| Process one element | O(log k) | - |
| Process n elements total | O(n log k) | O(k) |
| `heapq.nlargest(k, iterable)` (stdlib) | O(n log k) | O(k) |

**Cache behavior:** the heap never exceeds k entries, so for k in the tens-to-low-thousands the entire heap fits in L1/L2 cache - every sift is a cache hit, which is why top-K beats a full O(n log n) sort even before counting the asymptotic win. At very large k (approaching n), the heap degenerates toward heapsort's cache profile and the constant-factor advantage shrinks.

## Constraints & approach

| n, k | Approach |
|------|----------|
| n ≤ 10³, any k | Sort everything, slice - O(n log n), simplest code, no heap needed |
| n ≤ 10⁶, k ≪ n (k ≤ 10³) | **Top-K heap** - O(n log k), the sweet spot this pattern targets |
| n ≤ 10⁶, k close to n | Sorting (O(n log n)) or quickselect (O(n) average, single boundary value) beats a heap - `log k ≈ log n` erases the heap's advantage |
| n ≤ 10⁶, need only the k-th value (not all k) | [Quickselect](../algorithms/quickselect.md) - O(n) average, no heap, in-place |
| stream too large for memory, k fixed | Top-K heap still works - O(k) space regardless of stream length, the heap **is** the streaming answer |

**When the constraint pushes you off top-K:** if k scales with n (e.g. k = n/2), the `log k` factor stops being small and a full sort is simpler and just as fast. If you need one value, not a collection, quickselect's O(n) average beats O(n log k) outright.

**Real-world usage:** recommendation systems and search engines use top-K heaps to serve "top 10 results" out of millions of scored candidates without a full sort (Elasticsearch's scoring pipeline, ad-auction top-bid selection). **At scale:** at n > 10⁸ candidates, even O(n log k) becomes the bottleneck if done single-threaded; production systems shard the stream, compute a local top-k heap per shard in parallel, then merge the shards' heaps (a k-way merge of k sorted top-k lists) - the heap step stays cheap, the parallelism absorbs the n.

## Variations

- **K smallest:** flip to a max-heap (or negate values with Python's `heapq`) - evict the largest of the current bottom-k when something smaller arrives.
- **Top-k frequent elements:** first build a frequency map (hashmap, O(n)), then run top-K over the `(count, value)` pairs, O(m log k) where m = distinct elements. `collections.Counter(arr).most_common(k)` is the stdlib shortcut.
- **K closest points (or any custom distance):** heap ordered by a computed key (`-distance` for a min-heap simulating "k closest" eviction), not the raw value - the mechanic is identical, only the comparison key changes.
- **Streaming top-k with removal:** if elements can also leave the stream (not just arrive), plain top-K breaks - that shape belongs to [Two Heaps](./two-heaps.md)'s lazy-deletion technique or an order-statistics structure, not this pattern.

## Pitfalls

- **Using a max-heap for "k largest."** The natural instinct is "I want the largest, so max-heap" - but a max-heap of *all* elements just gives you O(1) access to the single largest, not an efficient size-k window. The trick is inverting: a **min-heap of size k** lets you cheaply find and evict the *weakest* of your current top-k. Getting this backwards means the heap grows unbounded or evicts the wrong element.
- **Forgetting to compare against the top before pushing.** Once the heap has k elements, a new element that's smaller than the current min-heap top must be **skipped**, not pushed-then-popped - pushing it first and immediately popping it back out is wasted work (and with `heapq.heapreplace`, actively wrong if you don't check `x > heap[0]` first, since `heapreplace` unconditionally swaps).
- **Off-by-one on "at most k" vs "exactly k."** When fewer than k elements have arrived, just push unconditionally - the `if len(heap) < k` guard is doing real work, not padding; skipping it corrupts the heap by comparing against `heap[0]` on an empty heap.
- **Ties at the boundary.** When multiple elements equal the k-th value, "the k largest" is ambiguous about which equal element is included - read the problem statement's tie-breaking rule (often "any valid answer" or "by original index") before assuming strict `>` vs `≥` in the eviction comparison.
- **Misconception: the heap yields sorted output.** Finishing with a size-k heap gives you the *set* of k largest elements, not that set *in sorted order* - the heap's internal array order is heap-order (parent ≥ children in a min-heap-of-max-k setup), not a total order. If the problem wants the k largest returned sorted, add one more O(k log k) sort on just those k elements - negligible next to the O(n log k) already spent building the heap.

## First 30 seconds

"This is top-K - I need the k largest (or smallest, or most frequent) out of a bigger stream. I'll keep a min-heap of size k, ordered opposite to what I want, so the top is always the weakest of my current top-k. New elements that beat the top evict it; elements that don't, get skipped. O(n log k) total, O(k) space - beats sorting everything when k is small relative to n."

## Related

- [Heap](../data-structures/heap.md) - the underlying structure; push/pop/peek and the heap property.
- [Quickselect](../algorithms/quickselect.md) - O(n) average alternative when only the k-th value (not the full top-k set) is needed.
- [Two Heaps](./two-heaps.md) - sibling pattern; one heap finds a one-sided extreme, two heaps find the center.
- [K-Way Merge](./k-way-merge.md) - also a size-k heap, but over k pre-sorted sequences rather than one unsorted stream.
- [Frequency Array](./frequency-array.md) - the O(n + V) bucket-counting alternative when values are bounded.

## What the interviewer probes for

**"Why not just sort and take the first k?"**
Sorting is O(n log n) regardless of k. If k ≪ n (say k = 10, n = 10⁶), a size-k heap does O(n log k) ≈ O(n · 3) - dramatically less work than O(n log n) ≈ O(n · 20). The crossover favors sorting only when k approaches n.

**"Why min-heap for the k *largest* - isn't that backwards?"**
The heap doesn't hold "the largest" as its top - it holds the **weakest of the current top-k** as its top, because that's the one candidate for eviction. A min-heap gives O(log k) access to exactly that element. This inversion is the single most-tested comprehension check for this pattern.

**"Can this run in true streaming fashion, with unbounded input?"**
Yes - that's the pattern's main strength over sorting. Space stays O(k) regardless of how long the stream runs, since the heap never grows past k. Sorting requires materializing and holding all n elements first.

**"What if k changes dynamically, or you need top-k for many different k values on the same data?"**
A single size-k heap only answers one fixed k efficiently. For repeated queries at different k, presort once (O(n log n)) and slice, or build a persistent order-statistics structure (Fenwick tree over ranks, or a balanced BST) that answers arbitrary-k queries in O(log n) each after O(n log n) preprocessing.

## Practice problems

### 1. Kth Largest Element in an Array (LC 215)

**Problem.** Given an unsorted array of integers, find the k-th largest element - not the k-th distinct element, duplicates count by position in sorted order.

- **Example 1**
  - **Input:** `nums = [3,2,1,5,6,4], k = 2` | **Output:** `5`
  - **Explanation:** sorted descending is `[6,5,4,3,2,1]`; the 2nd largest is 5.
- **Example 2**
  - **Input:** `nums = [3,2,3,1,2,4,5,5,6], k = 4` | **Output:** `4`
  - **Explanation:** sorted descending is `[6,5,5,4,3,3,2,2,1]`; the 4th largest is 4.

**Constraints.** `1 ≤ k ≤ nums.length ≤ 10⁵`; `-10⁴ ≤ nums[i] ≤ 10⁴`.

**Approach.** At n ≤ 10⁵, a size-k min-heap (top-K pattern) gives O(n log k). Since only the *boundary value* is needed (not the full top-k set), quickselect is the asymptotically better choice at O(n) average - the constraint doesn't force one over the other here, so this problem is the canonical place to show both and name the trade: heap is simpler and worst-case-safe at O(n log k); quickselect is faster average-case but O(n²) worst-case unless pivots are randomized. Contest velocity note: `heapq.nlargest(k, nums)[-1]` does the same size-k heap internally in one stdlib call - faster to type than the hand-rolled loop below when you don't need to interleave the eviction with other per-element logic.

```python
import heapq
from typing import List

def find_kth_largest(nums: List[int], k: int) -> int:
    heap: list[int] = []
    for x in nums:
        if len(heap) < k:
            heapq.heappush(heap, x)
        elif x > heap[0]:
            heapq.heapreplace(heap, x)
    return heap[0]
```

**Complexity.** O(n log k) time, O(k) space.

**Duplicate problems:**
- Kth Largest Element in a Stream (LC 703) - identical heap mechanic, but the heap persists across repeated `add()` calls instead of one-shot over a fixed array.
- Top K Frequent Elements (LC 347) - same top-K heap, but ordered by a computed frequency count instead of the raw value.
- Find K Pairs with Smallest Sums (LC 373) - same "bound the heap to size k, evict the weakest" discipline; full entry lives in [K-Way Merge](./k-way-merge.md) since the candidates are lazily-generated sorted streams, not a flat unsorted array.

### 2. Top K Frequent Elements (LC 347)

**Problem.** Given an integer array, return the k elements that appear most frequently, in any order.

- **Example 1**
  - **Input:** `nums = [1,1,1,2,2,3], k = 2` | **Output:** `[1,2]`
  - **Explanation:** 1 appears 3 times, 2 appears 2 times, 3 appears once - the top 2 by frequency are 1 and 2.
- **Example 2**
  - **Input:** `nums = [1], k = 1` | **Output:** `[1]`
  - **Explanation:** only one distinct value exists, so it's trivially the top 1.

**Constraints.** `1 ≤ nums.length ≤ 10⁵`; `k` is guaranteed valid (`1 ≤ k ≤` number of distinct elements); answer is guaranteed unique in this problem's grading.

**Approach.** Build a frequency map first (O(n), a hashmap pass) - this is the mandatory layering step that turns "top-k frequent" into a plain top-K-by-value problem over `(count, value)` pairs. Then run the size-k min-heap over the m ≤ n distinct `(count, value)` pairs, O(m log k). Recognize this as top-K wrapped around a counting pre-pass, not a new pattern.

```python
import heapq
from collections import Counter
from typing import List

def top_k_frequent(nums: List[int], k: int) -> List[int]:
    counts = Counter(nums)
    heap: list[tuple[int, int]] = []
    for val, cnt in counts.items():
        if len(heap) < k:
            heapq.heappush(heap, (cnt, val))
        elif cnt > heap[0][0]:
            heapq.heapreplace(heap, (cnt, val))
    return [val for _, val in heap]
```

**Complexity.** O(n + m log k) time (m = distinct elements), O(m) space.

**Duplicate problems:**
- Top K Frequent Words (LC 692) - identical mechanic; tie-break is lexicographic instead of numeric, so the heap key becomes `(count, reversed-alphabetical-key)`.
- Sort Characters By Frequency (LC 451) - same counting + ordering idea, but emits *all* elements sorted by frequency rather than just the top k.

### 3. K Closest Points to Origin (LC 973)

**Problem.** Given an array of 2D points, return the k points closest to the origin `(0, 0)`, by Euclidean distance (any order in the output).

- **Example 1**
  - **Input:** `points = [[1,3],[-2,2]], k = 1` | **Output:** `[[-2,2]]`
  - **Explanation:** distance² of `(1,3)` is 10, of `(-2,2)` is 8 - `(-2,2)` is closer.
- **Example 2**
  - **Input:** `points = [[3,3],[5,-1],[-2,4]], k = 2` | **Output:** `[[3,3],[-2,4]]`
  - **Explanation:** distances² are 18, 26, 20 - the two smallest belong to `(3,3)` and `(-2,4)`.

**Constraints.** `1 ≤ k ≤ points.length ≤ 10⁴`; coordinates bounded by `±10⁴`.

**Approach.** This is "k smallest," not "k largest" - the heap flips to a **max-heap** (or negate the key) so the top is the *worst* (farthest) of the current best-k, evicted when a closer point arrives. Use squared distance (`x² + y²`) as the key to avoid an unnecessary `sqrt` call per comparison - distance ordering is preserved without the square root, a small but real constant-factor win at n = 10⁴.

```python
import heapq
from typing import List

def k_closest(points: List[List[int]], k: int) -> List[List[int]]:
    heap: list[tuple[int, int, int]] = []
    for x, y in points:
        dist_sq = x * x + y * y
        if len(heap) < k:
            heapq.heappush(heap, (-dist_sq, x, y))
        elif -dist_sq > heap[0][0]:
            heapq.heapreplace(heap, (-dist_sq, x, y))
    return [[x, y] for _, x, y in heap]
```

**Complexity.** O(n log k) time, O(k) space.

**Duplicate problems:**
- Kth Smallest Element in a Sorted Matrix (LC 378) - different key structure, actually a [K-Way Merge](./k-way-merge.md) problem once treated as n sorted rows - included here as a reminder that "smallest" framing doesn't automatically mean top-K.
- Find K Closest Elements (LC 658) - closest to a target value in a *sorted* array; solvable with two pointers or binary search instead of a heap, since sortedness gives a cheaper approach - a good contrast case for when top-K is overkill.

---

### 4. Top K Frequent Elements, bucket-sort variant (LC 347)

**Problem.** Same problem as entry 2 (given an integer array, return the k elements that appear most frequently) - solved here with a different technique to show the O(n) alternative that exists whenever the ranking key is bounded.

**Worked examples:**
- **Example 1**
  - **Input:** `nums = [1,1,1,2,2,3], k = 2` | **Output:** `[1,2]`
  - **Explanation:** frequency 3→[1], frequency 2→[2], frequency 1→[3]; bucket index = frequency, so walking buckets from n down to 1 yields 1 then 2 first.
- **Example 2**
  - **Input:** `nums = [1], k = 1` | **Output:** `[1]`

**Constraints.** `1 ≤ nums.length ≤ 10⁵`; `k` is guaranteed valid.

**Approach.** The heap approach (entry 2) is O(m log k) where m = distinct elements, and it's the right default. But frequency is a bounded key: any element's count is between 1 and n, so a frequency *cannot* exceed n. That bound means you can skip comparison-based selection entirely - build `buckets[f]` = list of values with frequency exactly `f` (a [Frequency Array](./frequency-array.md) indexed by count, not value), then walk buckets from `n` down to `1`, collecting values until `k` are gathered. This is O(n) total, no `log` factor, because placement is by direct indexing rather than comparison. Distinct from entry 2: this trades a heap's O(log k) per-operation cost for O(1) bucket placement, exploiting that the key range is known and small (bounded by n) rather than arbitrary.

```python
from collections import Counter

def top_k_frequent_bucket(nums: list[int], k: int) -> list[int]:
    counts = Counter(nums)
    n = len(nums)
    buckets: list[list[int]] = [[] for _ in range(n + 1)]
    for val, freq in counts.items():
        buckets[freq].append(val)

    result: list[int] = []
    for freq in range(n, 0, -1):
        for val in buckets[freq]:
            result.append(val)
            if len(result) == k:
                return result
    return result
```

**Complexity.** O(n) time, O(n) space.

**Duplicate problems:**
- Sort Characters By Frequency (LC 451) - same bucket-by-frequency idea, walking every bucket instead of stopping at k.
