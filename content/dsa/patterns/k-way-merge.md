# K-Way Merge

## Prerequisites

- [Heap](../data-structures/heap.md) [Must read] - the pattern is a min-heap of the k list heads; you need push/pop/peek and the heap property to understand why it works and why it's O(N log k).
- [Merge Sort](../algorithms/merge-sort.md) [Should read] - the 2-way merge is the base case; k-way merge generalizes it by replacing the "take the smaller of two heads" step with a heap that does the same for k heads in O(log k).
- [Top-K Elements](./top-k-elements.md) [Should read] - sibling pattern; both use a size-bounded heap, but top-K extracts from one stream while k-way merge tracks one frontier pointer per sorted sequence.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [Recognition signals](#recognition-signals)
- [How it works](#how-it-works)
- [Skeleton](#skeleton)
- [Complexity](#complexity)
- [Constraints & approach](#constraints--approach)
- [Variations](#variations)
- [CP-primitives](#cp-primitives)
- [Worked problems](#worked-problems)
- [Pitfalls](#pitfalls)
- [First 30 seconds](#first-30-seconds)
- [Related](#related)
- [Practice problems](#practice-problems)

## What it is

**K-way merge** is the pattern of merging `k` sorted sequences into one sorted output by maintaining a **min-heap of size k** — one entry per sequence, always holding that sequence's current front element. At each step you extract the global minimum, emit it, and push the next element from that sequence. The heap never holds more than k elements, so each of the N total elements costs O(log k), giving O(N log k) overall.

Mental model: **k runners at k different starting lines, all running in order.** At each moment you pick the runner currently in front (the min-heap gives you this in O(log k)), advance that runner one step, and the heap self-corrects. You never look at more than one element per list at a time.

> **Takeaway (say this out loud):** "K-way merge — min-heap of the k list heads, pop the smallest, push its successor — O(N log k) where N is total elements and k is the number of sequences."

## Recognition signals

### (a) Trigger phrases

- "Given k sorted lists / arrays / linked lists, merge them into one sorted list"
- "Find the **smallest range** that includes at least one element from each of k sorted lists"
- "Given k sorted files / streams, produce a merged sorted output" (external sort)
- "Find the **k-th smallest element** across k sorted arrays"

### (b) Structural cues

- **Input:** k sorted sequences (lists, arrays, linked-list chains, or file streams) — sorted order within each is guaranteed, no ordering across sequences.
- **Output property:** a single merged sorted sequence, or a statistic derivable from the merge order (k-th element, smallest range, median of merged stream).
- **Key shape:** each sequence has a "current front" that advances one step at a time. The bottleneck is efficiently selecting the global minimum front — that's the heap's job.
- **Constraint signal:** when k is small (2–500) relative to total N, O(N log k) is a big win over the naive O(N·k) scan-all-heads approach.

### (c) Not to be confused with

- **Top-K Elements (one heap):** top-K pulls the k largest from one unsorted stream; k-way merge pulls one global minimum at a time from k *already-sorted* streams. The heap sizes go in opposite directions: top-K's heap stays size k; k-way merge's heap starts size k and drains to 0 as lists exhaust.
- **Merge Sort's merge step:** merge sort's merge is 2-way (k=2), offline (both halves in memory), and runs in O(n) with two pointers. K-way merge generalizes to arbitrary k, handles streams, and uses a heap because k pointers need an efficient minimum selection.
- **Sliding Window / Two Pointers:** those patterns move pointers over a single sequence; k-way merge moves one pointer per sequence, coordinated by a heap.

## How it works

Maintain a **min-heap** of tuples `(value, list_index, element_index)` — one per list, always pointing at that list's current unconsumed front.

```
Input:
  L0: [1, 4, 7]
  L1: [2, 5, 8]
  L2: [3, 6, 9]

Initial heap (value, list, pos):
  (1, 0, 0)  (2, 1, 0)  (3, 2, 0)
  min = 1

Step 1: pop (1, L0, pos=0) → emit 1, push (4, L0, pos=1)
  heap: (2, L1, 0)  (3, L2, 0)  (4, L0, 1)
  min = 2

Step 2: pop (2, L1, 0) → emit 2, push (5, L1, 1)
  heap: (3, L2, 0)  (4, L0, 1)  (5, L1, 1)
  min = 3

Step 3: pop (3, L2, 0) → emit 3, push (6, L2, 1)
  heap: (4, L0, 1)  (5, L1, 1)  (6, L2, 1)
  ...

Output: 1, 2, 3, 4, 5, 6, 7, 8, 9
```

**Invariant:** after every pop-and-push, the heap contains exactly one "current front" per non-exhausted list, and the heap minimum is the global minimum across all fronts. When a list exhausts, its slot simply disappears from the heap (no push). The heap shrinks from k to 0 as lists drain.

**Why O(N log k):** N total pops, each followed by at most one push, each O(log k) since the heap size never exceeds k.

## Skeleton

**Pseudocode (CLRS style):**

```
KWayMerge(lists[0..k-1]) → sorted array:
    result ← []
    H ← MinHeap()
    for i = 0 to k-1
        if lists[i] is not empty
            H.push( (lists[i][0], i, 0) )   ▷ (value, list_idx, elem_idx)
    while H is not empty
        (val, li, ei) ← H.pop()
        result.append(val)
        if ei + 1 < len(lists[li])
            H.push( (lists[li][ei+1], li, ei+1) )
    return result
```

**Python template:**

```python
import heapq
from typing import Iterator

def k_way_merge(lists: list[list[int]]) -> list[int]:
    result: list[int] = []
    heap: list[tuple[int, int, int]] = []

    for i, lst in enumerate(lists):
        if lst:
            heapq.heappush(heap, (lst[0], i, 0))

    while heap:
        val, li, ei = heapq.heappop(heap)
        result.append(val)
        if ei + 1 < len(lists[li]):
            heapq.heappush(heap, (lists[li][ei + 1], li, ei + 1))

    return result

# For linked-list inputs, store (node.val, list_index, node) in the heap.
# For iterator/stream inputs, call next() on the iterator instead of advancing an index.
# your logic here
```

**Linked-list variant (LC 23 shape):**

```python
import heapq
from typing import Optional

class ListNode:
    def __init__(self, val: int = 0, next: "Optional[ListNode]" = None) -> None:
        self.val = val
        self.next = next

def merge_k_lists(lists: list[Optional[ListNode]]) -> Optional[ListNode]:
    heap: list[tuple[int, int, ListNode]] = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))

    dummy = ListNode()
    curr = dummy
    while heap:
        val, i, node = heapq.heappop(heap)
        curr.next = node
        curr = curr.next
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next
```

The `i` tiebreaker in the tuple prevents Python from comparing `ListNode` objects when values are equal — without it, the heap raises `TypeError`.

## Complexity

| Metric | Value |
|--------|-------|
| Time | O(N log k), N = total elements across all lists |
| Space | O(k) for the heap + O(N) for output |
| Per-element cost | O(log k) — one heap pop + at most one push |

**Cache behavior:** the heap holds at most k elements, so at small k (≤ a few hundred) the entire heap fits in L1/L2 cache — every sift is a cache hit. At large k (thousands of lists) the heap's random-access sift pattern causes L2 misses; at that scale a tournament tree (losers tree) has better cache behavior because it accesses a fixed path of log k nodes rather than arbitrary heap positions.

## Constraints & approach

| k (lists) | N (total elements) | Approach |
|-----------|--------------------|----------|
| k = 2 | any | Two-pointer merge — O(N), no heap needed |
| k ≤ 500, N ≤ 10⁵ | total ≤ 10⁵ | **Min-heap k-way merge** — O(N log k) ≈ 10⁵ × 9 ops, fast enough |
| k ≤ 500, N ≤ 10⁶ | total ≤ 10⁶ | **Min-heap** — O(N log k) ≈ 10⁷, fine |
| k ≤ 10⁴, N > 10⁷ | very large | Tournament / losers tree — same O(N log k) but cache-friendlier |
| data doesn't fit in RAM | external | External merge sort: sort chunks, k-way merge from disk with buffered I/O |

**When the constraint pushes you off k-way merge:**
- k = 1: trivially the input list itself.
- k = 2 with both in memory: two-pointer merge in O(N), O(1) space — no heap needed.
- You need the k-th element only (not the full merge): binary search across the k arrays in O(k log(max_val)) beats the full merge.
- All N elements fit in memory and k is large: `sorted(chain(*lists))` — O(N log N) but constant factor is tiny and code is two lines.

**Real-world usage:** k-way merge is the second phase of **external merge sort** (used in every database's ORDER BY when data exceeds RAM — PostgreSQL, MySQL, SQLite all implement it). At scale, the heap's O(log k) per element becomes the bottleneck when k grows to thousands; production external sort systems use a **replacement selection** or a **losers tree** to reduce cache pressure while keeping the same asymptotic cost.

## Variations

- **Smallest range covering k lists (LC 632):** instead of emitting elements, track the current window `[min_val, max_val]` — `min_val` is the heap top, `max_val` is maintained as a running max. Advance the list contributing the current min, shrink the window until a list exhausts.
- **K-th smallest across k sorted arrays:** binary search on the answer + count elements ≤ mid in O(k log(max_val)) without materializing the merge.
- **Merge k sorted iterators / streams (online):** same heap, but each heap entry holds an iterator; advance with `next()` instead of indexing. Natural for reading k files line by line.
- **External sort:** sort n/M chunks of M elements each (k = n/M chunks), then k-way merge with buffered I/O. At n = 1B and M = 10⁶, k = 1000 — the heap has 1000 entries, each backed by a disk buffer.
- **Merge k sorted linked lists (LC 23):** heap holds `(node.val, tiebreak_index, node)`; on pop, link node into result and push `node.next` if it exists.

## CP-primitives

### Smallest range covering k lists

Pop the heap min, track running `cur_max`, record `[heap_min, cur_max]` if it's narrower than the best seen, then push the next element from the popped list's sequence. Stop when any list exhausts.

**Why for CP:** avoids the O(N² · k) brute-force over all possible ranges; the heap encodes the "minimum left boundary" efficiently. O(N log k) total. Appears in Codeforces problems as "choose one from each group, minimize range."

```python
import heapq

def smallest_range(nums: list[list[int]]) -> list[int]:
    heap = [(lst[0], i, 0) for i, lst in enumerate(nums)]
    heapq.heapify(heap)
    cur_max = max(lst[0] for lst in nums)
    best = [heap[0][0], cur_max]

    while heap:
        val, i, j = heapq.heappop(heap)
        if j + 1 == len(nums[i]):
            break
        nxt = nums[i][j + 1]
        cur_max = max(cur_max, nxt)
        heapq.heappush(heap, (nxt, i, j + 1))
        lo = heap[0][0]
        if cur_max - lo < best[1] - best[0]:
            best = [lo, cur_max]
    return best
```

### Online k-way merge (iterator-based)

When inputs are infinite streams or lazy iterators (competitive I/O), hold `(current_val, iterator)` pairs in the heap. `next()` advances each stream — no index needed, no list stored in memory.

**Why for CP:** lets you merge sorted generators without materializing all N elements. Useful for "process events from k logs in time order" problems.

```python
import heapq
from typing import Iterator

def merge_iterators(iters: list[Iterator[int]]) -> Iterator[int]:
    heap: list[tuple[int, int, Iterator[int]]] = []
    for idx, it in enumerate(iters):
        try:
            heapq.heappush(heap, (next(it), idx, it))
        except StopIteration:
            pass
    while heap:
        val, idx, it = heapq.heappop(heap)
        yield val
        try:
            heapq.heappush(heap, (next(it), idx, it))
        except StopIteration:
            pass
```

## Worked problems

### 1. Merge K Sorted Lists (LC 23)

k linked lists, each sorted ascending. Merge into one sorted linked list. k ≤ 10⁴, total nodes N ≤ 5 × 10⁴.

**Approach (k ≤ 10⁴, N ≤ 5 × 10⁴):** heap of `(node.val, tiebreak_idx, node)`. Pop the minimum, link it into the result, push `node.next` if it exists. The tiebreak index prevents Python from comparing `ListNode` objects when values tie. O(N log k). At k = 10⁴ and N = 5 × 10⁴ each list averages 5 nodes — the heap is often much smaller than k.

### 2. Kth Smallest Element in a Sorted Matrix (LC 378)

n × n matrix where each row and each column is sorted. Find the k-th smallest element. n ≤ 300, k ≤ n².

**Approach:** treat each row as one sorted list — n-way merge. Pop k times from the heap; the k-th pop is the answer. Time O(k log n). Alternative: binary search on value in O(n log(max−min)) — prefer this when k is large (close to n²) since it avoids O(k log n) heap ops. The constraint tells you which: k ≤ n ≈ 300 → heap; k ≈ n² → binary search.

### 3. Smallest Range Covering Elements from K Lists (LC 632)

k sorted lists. Find the smallest range [a, b] such that at least one element from each list lies in [a, b]. k ≤ 3500, each list length ≤ 50.

**Approach:** k-way merge with a running max. Heap tracks the current minimum across all list fronts; `cur_max` is maintained as elements are pushed. The range at any step is `[heap.top, cur_max]`. Advance the list contributing the current minimum (to try to shrink the range). Stop when any list exhausts. O(N log k) where N = total elements = k × avg_list_length.

### 4. Merge K Sorted Arrays

Given k sorted integer arrays, merge into one sorted array. Classic external-sort simulation; k ≤ 500, total N ≤ 10⁶.

**Approach (N ≤ 10⁶):** heap of `(value, list_index, element_index)`. Standard k-way merge skeleton. O(N log k) ≈ 10⁶ × 9 ops. If k = 2, two-pointer merge is faster in practice (no heap overhead). The pattern is unambiguous when k > 2 and lists are pre-sorted.

## Pitfalls

- **Not including a tiebreaker in the heap tuple.** When two lists have equal values at their fronts, Python tries to compare the third element of the tuple. For linked lists that's a `ListNode` — which raises `TypeError`. Always include a unique integer tiebreaker (list index) as the second element: `(value, list_idx, node_or_index)`.
- **Advancing the wrong pointer.** The heap returns `(val, list_idx, elem_idx)` — you must push `lists[list_idx][elem_idx + 1]`, not `lists[list_idx + 1][elem_idx]`. A common bug in contests is swapping `li` and `ei` when indexing into `lists`.
- **Forgetting to handle empty lists in initialization.** Pushing `(lst[0], i, 0)` for all k lists crashes if any list is empty. Guard with `if lst:` before the initial push — empty lists contribute nothing to the merge.
- **Using k-way merge when two-pointer suffices.** If k = 2 and both lists are in memory, two-pointer merge is O(N) with no heap overhead. Reaching for the heap at k = 2 is over-engineering.
- **Heap vs sort confusion at small k.** At k = 3–5 and N ≤ 1000, `sorted(chain(*lists))` is simpler and fast enough. K-way merge's advantage only shows at large N or large k — don't apply it mechanically.

## First 30 seconds

"This is k-way merge — I have k sorted sequences and need the merged output. I'll use a min-heap of size k, one entry per sequence holding its current front element. Pop the global minimum, emit it, push that sequence's next element. The heap never exceeds k entries, so each of the N elements costs O(log k) — O(N log k) total. In Python, heap tuples need a unique tiebreaker index to avoid comparison errors on equal values."

## Related

- [Heap](../data-structures/heap.md) — the underlying engine; the pattern is just "heap of k list fronts."
- [Merge Sort](../algorithms/merge-sort.md) — 2-way merge is the base case; k-way merge is the generalization.
- [Top-K Elements](./top-k-elements.md) — sibling heap pattern; one heap of fixed size k over one stream vs k heaps of size 1 over k streams.
- [Two Pointers](./two-pointers.md) — the O(N) alternative for k=2 with both lists in memory.
- [Binary Search on Answer](./binary-search-on-answer.md) — alternative to k-way merge for "k-th smallest across k sorted arrays" when you want value rather than the full merged sequence.

## Practice problems

### 1. Merge K Sorted Lists (LC 23)

You are given an array of k linked lists, each sorted in ascending order. Merge all the linked lists into one sorted linked list and return it. k ≤ 10⁴, total nodes N ≤ 5 × 10⁴.

**Approach:** min-heap of `(node.val, list_index, node)`. Pop min, link to result, push `node.next` if non-null. Include list index as tiebreaker to avoid comparing `ListNode` objects. O(N log k) time, O(k) heap space.

```python
import heapq
from typing import Optional

class ListNode:
    def __init__(self, val: int = 0, next: "Optional[ListNode]" = None) -> None:
        self.val = val
        self.next = next

def mergeKLists(lists: list[Optional[ListNode]]) -> Optional[ListNode]:
    heap: list[tuple[int, int, ListNode]] = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))

    dummy = ListNode()
    curr = dummy
    while heap:
        val, i, node = heapq.heappop(heap)
        curr.next = node
        curr = curr.next
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next
```

**Complexity:** O(N log k) time, O(k) space.

**Duplicate problems:**
- Merge Two Sorted Lists (LC 21) — k=2 special case; two-pointer merge is O(N) and simpler, no heap needed.
- Merge Sorted Array (LC 88) — in-place 2-way merge; same idea, fill from right to avoid shifting, O(m+n) time.
- Sort List (LC 148) — merge sort a linked list; the merge step is 2-way, but recognizing it as k-way (k=2) solidifies the pattern.

### 2. Kth Smallest Element in a Sorted Matrix (LC 378)

An n × n matrix where each row and column is sorted ascending. Find the k-th smallest element. n ≤ 300, k ≤ n².

**Approach:** treat each row as a sorted list — n-way merge with a heap. Pop k times; the k-th popped value is the answer. Push `(matrix[r][c+1], r, c+1)` after each pop (if in bounds). O(k log n) time. For large k (near n²), binary search on value with O(n) counting is O(n log(max−min)) and better.

```python
import heapq
from typing import List

def kthSmallest(matrix: List[List[int]], k: int) -> int:
    n = len(matrix)
    heap = [(matrix[r][0], r, 0) for r in range(n)]
    heapq.heapify(heap)

    val = 0
    for _ in range(k):
        val, r, c = heapq.heappop(heap)
        if c + 1 < n:
            heapq.heappush(heap, (matrix[r][c + 1], r, c + 1))
    return val
```

**Complexity:** O(k log n) time, O(n) space.

**Duplicate problems:**
- Find K Pairs with Smallest Sums (LC 373) — same heap structure; pairs `(nums1[i] + nums2[j], i, j)` form k sorted streams indexed by `i`; k-way merge over them.
- Kth Smallest in Multiplication Table (LC 668) — each row is `[m*1, m*2, ...]`; same n-way merge shape, or binary search on value.

### 3. Smallest Range Covering Elements from K Lists (LC 632)

Given k sorted lists of integers, find the smallest range [a, b] that includes at least one number from each list. k ≤ 3500, each list has ≤ 50 elements.

**Approach:** k-way merge with a running max. Initialize heap with all list heads and track `cur_max`. At each step the range is `[heap.min, cur_max]`. If it's the best seen, record it. Pop the min, push the next from its list (updating `cur_max`). Stop when any list runs out (you can't cover all k lists anymore). O(N log k) where N = total elements.

```python
import heapq
from typing import List

def smallestRange(nums: List[List[int]]) -> List[int]:
    heap = [(lst[0], i, 0) for i, lst in enumerate(nums)]
    heapq.heapify(heap)
    cur_max = max(lst[0] for lst in nums)
    best_lo, best_hi = heap[0][0], cur_max

    while heap:
        lo, i, j = heapq.heappop(heap)
        if j + 1 == len(nums[i]):
            break
        nxt = nums[i][j + 1]
        cur_max = max(cur_max, nxt)
        heapq.heappush(heap, (nxt, i, j + 1))
        if cur_max - heap[0][0] < best_hi - best_lo:
            best_lo, best_hi = heap[0][0], cur_max
    return [best_lo, best_hi]
```

**Complexity:** O(N log k) time, O(k) space.

**Duplicate problems:**
- Minimum Window Substring (LC 76) — sliding window over one string with a character-count constraint; different pattern (not k-way merge) despite the "smallest window" framing.
