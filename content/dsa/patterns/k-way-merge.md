# K-Way Merge

## Prerequisites

- [Heap](../data-structures/heap.md) [Must read]
- [Merge Sort](../algorithms/merge-sort.md) [Should read]
- [Top-K Elements](./top-k-elements.md) [Should read]

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [Recognition signals](#recognition-signals)
- [How it works](#how-it-works)
- [Complexity](#complexity)
- [Constraints & approach](#constraints--approach)
- [Variations](#variations)
- [CP-primitives](#cp-primitives)
- [Pitfalls](#pitfalls)
- [First 30 seconds](#first-30-seconds)
- [Related](#related)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

## What it is

**K-way merge** is the pattern of merging `k` sorted sequences into one sorted output by maintaining a **min-heap of size k** - one entry per sequence, always holding that sequence's current front element. At each step you extract the global minimum, emit it, and push the next element from that sequence. The heap never holds more than k elements, so each of the N total elements costs O(log k), giving O(N log k) overall.

Mental model: **k runners at k different starting lines, all running in order.** At each moment you pick the runner currently in front (the min-heap gives you this in O(log k)), advance that runner one step, and the heap self-corrects. You never look at more than one element per list at a time.

> **Takeaway (say this out loud):** "K-way merge - min-heap of the k list heads, pop the smallest, push its successor - O(N log k) where N is total elements and k is the number of sequences."

## Recognition signals

### (a) Trigger phrases

- "Given k sorted lists / arrays / linked lists, merge them into one sorted list"
- "Find the **smallest range** that includes at least one element from each of k sorted lists"
- "Given k sorted files / streams, produce a merged sorted output" (external sort)
- "Find the **k-th smallest element** across k sorted arrays"

### (b) Structural cues

- **Input:** k sorted sequences (lists, arrays, linked-list chains, or file streams) - sorted order within each is guaranteed, no ordering across sequences.
- **Output property:** a single merged sorted sequence, or a statistic derivable from the merge order (k-th element, smallest range, median of merged stream).
- **Key shape:** each sequence has a "current front" that advances one step at a time. The bottleneck is efficiently selecting the global minimum front - that's the heap's job.
- **Constraint signal:** when k is small (2–500) relative to total N, O(N log k) is a big win over the naive O(N·k) scan-all-heads approach.

### (c) Not to be confused with

- **Top-K Elements (one heap):** top-K pulls the k largest from one unsorted stream; k-way merge pulls one global minimum at a time from k *already-sorted* streams. The heap sizes go in opposite directions: top-K's heap stays size k; k-way merge's heap starts size k and drains to 0 as lists exhaust.
- **Merge Sort's merge step:** merge sort's merge is 2-way (k=2), offline (both halves in memory), and runs in O(n) with two pointers. K-way merge generalizes to arbitrary k, handles streams, and uses a heap because k pointers need an efficient minimum selection.
- **Sliding Window / Two Pointers:** those patterns move pointers over a single sequence; k-way merge moves one pointer per sequence, coordinated by a heap.

## How it works

Maintain a **min-heap** of tuples `(value, list_index, element_index)` - one per list, always pointing at that list's current unconsumed front.

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

## Complexity

| Metric | Value |
|--------|-------|
| Time | O(N log k), N = total elements across all lists |
| Space (heap) | O(k) - at most one entry per non-exhausted list |
| Space (output) | O(N) - the full merged sequence; if streaming, O(1) extra |
| Per-element cost | O(log k) - one heap pop + at most one push |

**Cache behavior:** the heap holds at most k elements, so at small k (≤ a few hundred) the entire heap fits in L1/L2 cache - every sift is a cache hit. At large k (thousands of lists) the heap's random-access sift pattern causes L2 misses; at that scale a tournament tree (losers tree) has better cache behavior because it accesses a fixed path of log k nodes rather than arbitrary heap positions.

## Constraints & approach

| k (lists) | N (total elements) | Approach |
|-----------|--------------------|----------|
| k = 2 | any | Two-pointer merge - O(N), no heap needed |
| k ≤ 500, N ≤ 10⁵ | total ≤ 10⁵ | **Min-heap k-way merge** - O(N log k) ≈ 10⁵ × 9 ops, fast enough |
| k ≤ 500, N ≤ 10⁶ | total ≤ 10⁶ | **Min-heap** - O(N log k) ≈ 10⁷, fine |
| k ≤ 10⁴, N > 10⁷ | very large | Tournament / losers tree - same O(N log k) but cache-friendlier |
| data doesn't fit in RAM | external | External merge sort: sort chunks, k-way merge from disk with buffered I/O |

**When the constraint pushes you off k-way merge:**
- k = 1: trivially the input list itself.
- k = 2 with both in memory: two-pointer merge in O(N), O(1) space - no heap needed.
- You need the k-th element only (not the full merge): binary search across the k arrays in O(k log(max_val)) beats the full merge.
- All N elements fit in memory and k is large: `sorted(chain(*lists))` - O(N log N) but constant factor is tiny and code is two lines.

**Real-world usage:** k-way merge is the second phase of **external merge sort** (used in every database's ORDER BY when data exceeds RAM - PostgreSQL, MySQL, SQLite all implement it). At scale, the heap's O(log k) per element becomes the bottleneck when k grows to thousands; production external sort systems use a **replacement selection** or a **losers tree** to reduce cache pressure while keeping the same asymptotic cost.

## Variations

- **Smallest range covering k lists (LC 632):** instead of emitting elements, track the current window `[min_val, max_val]` - `min_val` is the heap top, `max_val` is maintained as a running max. Advance the list contributing the current min, shrink the window until a list exhausts.
- **K-th smallest across k sorted arrays:** binary search on the answer + count elements ≤ mid in O(k log(max_val)) without materializing the merge.
- **Merge k sorted iterators / streams (online):** same heap, but each heap entry holds an iterator; advance with `next()` instead of indexing. Natural for reading k files line by line.
- **External sort:** sort n/M chunks of M elements each (k = n/M chunks), then k-way merge with buffered I/O. At n = 1B and M = 10⁶, k = 1000 - the heap has 1000 entries, each backed by a disk buffer.
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

When inputs are infinite streams or lazy iterators (competitive I/O), hold `(current_val, iterator)` pairs in the heap. `next()` advances each stream - no index needed, no list stored in memory.

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

## Pitfalls

- **Not including a tiebreaker in the heap tuple.** When two lists have equal values at their fronts, Python tries to compare the third element of the tuple. For linked lists that's a `ListNode` - which raises `TypeError`. Always include a unique integer tiebreaker (list index) as the second element: `(value, list_idx, node_or_index)`.
- **Advancing the wrong pointer.** The heap returns `(val, list_idx, elem_idx)` - you must push `lists[list_idx][elem_idx + 1]`, not `lists[list_idx + 1][elem_idx]`. A common bug in contests is swapping `li` and `ei` when indexing into `lists`.
- **Forgetting to handle empty lists in initialization.** Pushing `(lst[0], i, 0)` for all k lists crashes if any list is empty. Guard with `if lst:` before the initial push - empty lists contribute nothing to the merge.
- **Using k-way merge when two-pointer suffices.** If k = 2 and both lists are in memory, two-pointer merge is O(N) with no heap overhead. Reaching for the heap at k = 2 is over-engineering.
- **Heap vs sort confusion at small k.** At k = 3–5 and N ≤ 1000, `sorted(chain(*lists))` is simpler and fast enough. K-way merge's advantage only shows at large N or large k - don't apply it mechanically.

## First 30 seconds

"This is k-way merge - I have k sorted sequences and need the merged output. I'll use a min-heap of size k, one entry per sequence holding its current front element. Pop the global minimum, emit it, push that sequence's next element. The heap never exceeds k entries, so each of the N elements costs O(log k) - O(N log k) total. In Python, heap tuples need a unique tiebreaker index to avoid comparison errors on equal values."

## Related

- [Heap](../data-structures/heap.md) - the underlying engine; the pattern is just "heap of k list fronts."
- [Merge Sort](../algorithms/merge-sort.md) - 2-way merge is the base case; k-way merge is the generalization.
- [Top-K Elements](./top-k-elements.md) - sibling heap pattern; one heap of fixed size k over one stream vs k heaps of size 1 over k streams.
- [Two Pointers](./two-pointers.md) - the O(N) alternative for k=2 with both lists in memory.
- [Binary Search on Answer](./binary-search-on-answer.md) - alternative to k-way merge for "k-th smallest across k sorted arrays" when you want value rather than the full merged sequence.

## What the interviewer probes for

**"Why a heap and not just repeatedly scanning all k heads?"**
Scanning all k heads to find the minimum is O(k) per element → O(N·k) total. A heap does the same selection in O(log k), so k-way merge beats naive scanning whenever k is more than a handful. For k = 2 the heap has overhead and two-pointer at O(N) wins; the crossover is typically k ≥ 3–4 in practice.

**"What happens if one of the k lists is much longer than the others?"**
The heap size never exceeds k regardless of list lengths - it always holds exactly one entry per non-exhausted list. Long lists just contribute more pop-push cycles, but each cycle is still O(log k). The total cost is O(N log k) where N is the total element count across all lists, not the max single-list length.

**"Can you do this without O(N) output space - streaming the merged output?"**
Yes - use a generator (see CP-primitives: iterator-based variant). The heap stays O(k) and you yield each element as it's popped instead of appending to a list. The merged sequence is never materialized. This is how production external merge sort works: each of the k runs is read from disk one buffer-page at a time, and the merged output is streamed to the output file.

**"What if the lists are not fully sorted but nearly sorted (bounded disorder d)?"**
A min-heap of size k still works correctly - it makes no assumption about global order, only that each individual list is sorted. "Nearly sorted" is a property of each list independently; the heap tolerates it without modification. If d is the max displacement within each list, you can use a heap of size d instead of k for a bounded-disorder single-sequence problem (patience sort variant) - but that's a different problem shape.

## Practice problems

### 1. Merge K Sorted Lists (LC 23)

You are given an array of k linked lists, each sorted in ascending order. Merge all the linked lists into one sorted linked list and return it. k ≤ 10⁴, total nodes N ≤ 5 × 10⁴.

**Worked examples:**
- **Example 1**
  - **Input:** lists = [[1,4,5],[1,3,4],[2,6]] | **Output:** [1,1,2,3,4,4,5,6]
- **Example 2**
  - **Input:** lists = [] | **Output:** []

**Constraints:** `0 ≤ k ≤ 10⁴`, `0 ≤ list length ≤ 500`, total nodes N ≤ 5×10⁴, `-10⁴ ≤ Node.val ≤ 10⁴`.

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
- Merge K Sorted Arrays (classic) - same skeleton on arrays instead of linked-list nodes; heap of `(value, list_index, element_index)`.
- Merge Two Sorted Lists (LC 21) - k=2 special case; two-pointer merge is O(N) and simpler, no heap needed.
- Merge Sorted Array (LC 88) - in-place 2-way merge; same idea, fill from right to avoid shifting, O(m+n) time.
- Sort List (LC 148) - merge sort a linked list; the merge step is 2-way, but recognizing it as k-way (k=2) solidifies the pattern.

---

### 2. Kth Smallest Element in a Sorted Matrix (LC 378)

An n × n matrix where each row and column is sorted ascending. Find the k-th smallest element. n ≤ 300, k ≤ n².

**Worked examples:**
- **Example 1**
  - **Input:** matrix = [[1,5,9],[10,11,13],[12,13,15]], k = 8 | **Output:** 13
- **Example 2**
  - **Input:** matrix = [[-5]], k = 1 | **Output:** -5

**Constraints:** `1 ≤ n ≤ 300`, `-10⁹ ≤ matrix[i][j] ≤ 10⁹`, `1 ≤ k ≤ n²`.

**Approach:** treat each row as a sorted list - n-way merge with a heap. Pop k times; the k-th popped value is the answer. Push `(matrix[r][c+1], r, c+1)` after each pop (if in bounds). O(k log n) time. For large k (near n²), binary search on value with O(n) counting is O(n log(max−min)) and better.

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
- Kth Smallest in Multiplication Table (LC 668) - each row is `[m*1, m*2, ...]`; same n-way merge shape, or binary search on value.

---

### 3. Smallest Range Covering Elements from K Lists (LC 632)

Given k sorted lists of integers, find the smallest range [a, b] that includes at least one number from each list. k ≤ 3500, each list has ≤ 50 elements.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [[4,10,15,24,26],[0,9,12,20],[5,18,22,30]] | **Output:** [20,24]
- **Example 2**
  - **Input:** nums = [[1,2,3],[1,2,3],[1,2,3]] | **Output:** [1,1]

**Constraints:** `1 ≤ k ≤ 3500`, `1 ≤ each list length ≤ 50`, `-10⁵ ≤ element ≤ 10⁵`, each list sorted ascending.

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
- Minimum Window Substring (LC 76) - sliding window over one string with a character-count constraint; different pattern (not k-way merge) despite the "smallest window" framing.

---

### 4. Find K Pairs with Smallest Sums (LC 373)

Given two integer arrays `nums1` and `nums2`, both sorted ascending, and integer `k`, return the `k` pairs `(nums1[i], nums2[j])` with the smallest sums. `1 ≤ nums1.length, nums2.length ≤ 10⁵`, `1 ≤ k ≤ 10⁴`.

**Worked examples:**
- **Example 1**
  - **Input:** nums1 = [1,7,11], nums2 = [2,4,6], k = 3 | **Output:** [[1,2],[1,4],[1,6]]
- **Example 2**
  - **Input:** nums1 = [1,1,2], nums2 = [1,2,3], k = 2 | **Output:** [[1,1],[1,1]]

**Constraints:** `1 ≤ nums1.length, nums2.length ≤ 10⁵`, `-10⁹ ≤ nums1[i], nums2[i] ≤ 10⁹`, `1 ≤ k ≤ 10⁴`.

**Approach.** Materializing all `nums1.length × nums2.length` pairs and sorting is too slow. Instead, treat this as a heap-driven lazy generation: seed the heap with `(nums1[i] + nums2[0], i, 0)` for every `i` (each `i` is the head of an implicit sorted stream `nums1[i] + nums2[j]` for increasing `j`). Pop the smallest sum, record the pair, and push that stream's next element `(nums1[i] + nums2[j+1], i, j+1)`. This differs from Kth Smallest Matrix's mechanic: the "sorted lists" here aren't given directly, they're generated on demand as `(i, j+1)` pairs, and only `k` pops are needed rather than draining every stream.

```python
import heapq

def k_smallest_pairs(nums1: list[int], nums2: list[int], k: int) -> list[list[int]]:
    if not nums1 or not nums2:
        return []
    heap = [(nums1[i] + nums2[0], i, 0) for i in range(min(k, len(nums1)))]
    heapq.heapify(heap)
    result: list[list[int]] = []
    while heap and len(result) < k:
        s, i, j = heapq.heappop(heap)
        result.append([nums1[i], nums2[j]])
        if j + 1 < len(nums2):
            heapq.heappush(heap, (nums1[i] + nums2[j + 1], i, j + 1))
    return result
```

**Complexity.** O(k log k) time (heap bounded to O(min(k, len(nums1))) entries), O(k) space.

**Duplicate problems:**
- Kth Smallest Element in a Sorted Matrix (LC 378) - conceptually related (both merge sorted streams via a heap), but that problem's streams are literal matrix rows, not lazily-generated index pairs.
