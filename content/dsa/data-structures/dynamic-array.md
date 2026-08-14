# Dynamic Array

## Prerequisites

- [Array](./array.md) [Must read]
- [Big-O Notation](../algorithms/big-o-notation.md) [Must read]
## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [How it works](#how-it-works)
- [Operations](#operations)
- [Complexity summary](#complexity-summary)
- [When to use / when not](#when-to-use--when-not)
- [Comparison](#comparison)
- [Variants](#variants)
- [Memory layout](#memory-layout)
- [Implementation](#implementation)
- [Gotchas / edge cases](#gotchas--edge-cases)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)
  - [1. Implement a Dynamic Array from Scratch - grow-and-shrink resize policy](#1-implement-a-dynamic-array-from-scratch--grow-and-shrink-resize-policy)
  - [2. O(1) Removal at an Arbitrary Index](#2-o1-removal-at-an-arbitrary-index)
  - [3. Amortized Copy-Count Walkthrough - aggregate-method proof by simulation](#3-amortized-copy-count-walkthrough--aggregate-method-proof-by-simulation)
  - [4. Growth Factor Comparison - geometric vs fixed-increment resizing](#4-growth-factor-comparison--geometric-vs-fixed-increment-resizing)
  - [5. Insert Delete GetRandom O(1)](#5-insert-delete-getrandom-o1)
  - [6. Min Stack](#6-min-stack)
  - [7. Implement Queue using Stacks - amortized analysis across two buffers](#7-implement-queue-using-stacks---amortized-analysis-across-two-buffers)
  - [8. Next Greater Element](#8-next-greater-element)
  - [9. Sliding Window Median](#9-sliding-window-median)

## What it is

A **dynamic array** is a growable array: a fixed-size array underneath, wrapped in logic that allocates a bigger block and copies everything over when it fills. It gives you array-speed indexing (O(1)) plus the ability to append without knowing the size in advance.

Mental model: **a parking lot that paves itself bigger when it's full.** You keep parking cars; most of the time there's a free spot and parking is instant. Occasionally the lot is full, so you pave a lot twice as big, tow every car over, and carry on. That one expensive move is rare enough that _parking-on-average_ is still cheap - that's <abbr>amortized</abbr> cost.

> **Takeaway (say this out loud):** "A dynamic array is a fixed array that doubles when full - append is amortized O(1) because doubling makes the total copy work across all resizes sum to ~2n, even though any single resize is O(n)."

## How it works

A dynamic array tracks two numbers: **size** (how many elements are in use) and **capacity** (how many the current block can hold). `size ≤ capacity` always.

- **Append with room** (`size < capacity`): drop the element at `data[size]`, bump `size`. O(1).
- **Append when full** (`size == capacity`): allocate a new block (typically `2 × capacity`), copy all `size` elements over, free the old block, _then_ append. O(n) for this one call.

```
capacity 4, size 4 - FULL.  append(99):

old block:  [ 42 | 17 | 99 |  8 ]                       size=4 cap=4
                  │ allocate 2× = cap 8, copy over │
new block:  [ 42 | 17 | 99 |  8 |    |    |    |    ]   size=4 cap=8
                  │ now there is room - place 99    │
            [ 42 | 17 | 99 |  8 | 99 |    |    |    ]   size=5 cap=8
```

The next 3 appends are O(1) (room to spare). The 8th append triggers another doubling to 16, and so on. Resizes get rarer as the array grows - that's the key to why it averages out.

## Operations

| Operation                    | Time           | Space |
| ---------------------------- | -------------- | ----- |
| Access by index `arr[i]`     | O(1)           | O(1)  |
| Update by index `arr[i] = x` | O(1)           | O(1)  |
| Append (amortized)           | O(1) amortized | O(1)  |
| Append (single worst case)   | O(n)           | O(n)  |
| Pop from end                 | O(1) amortized | O(1)  |
| Insert at index `i`          | O(n)           | O(1)  |
| Delete at index `i`          | O(n)           | O(1)  |
| Search (unsorted, linear)    | O(n)           | O(1)  |

## Complexity summary

| Operation       | Best                 | Average        | Worst                         |
| --------------- | -------------------- | -------------- | ----------------------------- |
| Access by index | O(1)                 | O(1)           | O(1)                          |
| Append          | O(1) (room to spare) | O(1) amortized | O(n) (the resize-and-copy)    |
| Pop from end    | O(1)                 | O(1) amortized | O(n) (if shrinking below 1/4) |
| Insert at index | O(1) (at end, room)  | O(n)           | O(n) (at front, or + resize)  |
| Delete at index | O(1) (at end)        | O(n)           | O(n) (at front)               |

**Space:** O(n) elements, but actual footprint is O(capacity). Because capacity can be up to 2× the size right after a doubling, a dynamic array wastes up to ~50% memory in the worst case - the time-for-space trade behind <abbr>amortized</abbr> append.

## When to use / when not

**Reach for a dynamic array when:**

- You need indexed access **and** don't know the final size up front - the default "list" in nearly every language.
- Workload is append-at-end and read-by-index (collecting results, building a buffer, stacks).

**Reach for something else when:**

- **Worst-case <abbr>latency</abbr> matters** (real-time, low-latency systems) → the occasional O(n) resize is a latency spike. A [Circular Buffer](./circular-buffer.md) with fixed capacity gives true O(1) with no resize, or pre-size the array to a known bound.
- **Heavy front/middle insertion** → still O(n) here, same as a plain array; a **linked list** does O(1) splices once you hold the node. <!-- linked-list.md not yet written -->
- **Memory is tight** → the up-to-2× over-allocation can hurt; a fixed array or pre-sized block avoids the slack.

Rule of thumb: **dynamic array is the right default; reach past it only when you need worst-case O(1) appends or can't afford the over-allocation.**

Real-world: this _is_ the default list type in nearly every language - Python `list`, Java `ArrayList`, C++ `std::vector`, Go slices, JS arrays - and the backing store under stacks, growable buffers, and most "collect results then process" code.

## Comparison

Against the structures you'd weigh it against when "I need a growable sequence" comes up:

| Structure                               | Access by index | Append (end)       | Insert/delete (middle/front) | Memory                 | Worst-case append        | Pick it when…                                    |
| --------------------------------------- | --------------- | ------------------ | ---------------------------- | ---------------------- | ------------------------ | ------------------------------------------------ |
| **Dynamic array**                       | **O(1)**        | **O(1)** amortized | O(n) (shift)                 | contiguous + ~2× slack | O(n) (resize)            | growable sequence, random access, default choice |
| Fixed [array](./array.md)               | O(1)            | n/a (can't grow)   | O(n)                         | contiguous, exact      | n/a                      | size known up front, no slack tolerable          |
| Linked list                             | O(n)            | O(1)               | **O(1)** (with node ref)     | scattered, +ptr/node   | **O(1)** (no resize)     | heavy splicing, no random access, hard real-time |
| [Circular buffer](./circular-buffer.md) | O(1)            | **O(1)** true      | n/a (FIFO-shaped)            | contiguous, fixed      | **O(1)** (never resizes) | fixed-capacity FIFO, bounded latency             |
| Deque (`collections.deque`)             | O(n)            | O(1) both ends     | O(n) middle                  | block-linked           | O(1)                     | push/pop at _both_ ends                          |

The dynamic array is the only row giving **O(1) random access AND amortized-O(1) append** - that combination is why it's the default. Its weakness is the lone column where it loses: worst-case append spikes to O(n) on resize.

See the [Data Structure Selection cheatsheet](../cheatsheets/data-structure-selection.md) for the full cross-structure comparison.

## Variants

- **Growth factor is a time/space dial.** Doubling isn't a law - _any_ factor `> 1` preserves <abbr>amortized</abbr> O(1); what changes is the constant, and it's a direct **memory-vs-time trade**:

  - **Larger factor (2×)** → resizes are rarer, so fewer total copies (**less time**), but right after a grow up to ~50% of the block is unused slack (**more wasted memory**).
  - **Smaller factor (1.5×)** → ~33% worst-case slack (**less memory**), but resizes happen more often, so more total copy work (**more time**).

  Real libraries sit at different points on this dial: C++ `std::vector` and Java `ArrayList` use **1.5×**, Python `list` grows by **~1.125** after an initial ramp, many older `vector`s used **2×**. A factor of exactly 1 (fixed increment, `+k`) breaks amortization entirely → O(n) per append.

  **Why so many libraries chose 1.5× over 2× - allocator reuse (golden-ratio bonus).** With **2×**, the sum of all previously freed blocks is always _smaller_ than the next request (`1 + 2 + 4 = 7 < 8`), so the allocator can never reuse freed space in place - it must grab fresh memory, fragmenting the heap. For any growth factor below the **golden ratio φ ≈ 1.618**, the freed blocks eventually coalesce to satisfy a future grow, letting memory be reused. 1.5× sits just under φ - that, not the copy count, is the real reason it's the common default.

- **Shrinking dynamic array.** Some implementations halve capacity when size drops below 1/4 (not 1/2 - that hysteresis avoids thrashing on alternating push/pop at the boundary).
- **Geometric vs `realloc`.** In C, `realloc` may extend the block in place if adjacent memory is free, dodging the copy entirely - an optimization the abstract model ignores.

## Memory layout

**Contiguous, like a plain array - that's the whole appeal.** Elements sit inline in one block, so indexing is still `base + i × element_size` and iteration is still <abbr>cache-friendly</abbr>. The dynamic array adds only a thin header (`size`, `capacity`, pointer-to-block); the _data_ layout is identical to a fixed array.

```
DynamicArray header           backing block (capacity 8)
+--------+----------+         +----+----+----+----+----+----+----+----+
| size=5 | cap=8    |  data──▶| 42 | 17 | 99 |  8 | 23 |    |    |    |
+--------+----------+         +----+----+----+----+----+----+----+----+
                               └──────── in use ──────┘ └─── slack ──┘
```

**Cache behavior.** Same as a plain array - adjacent elements share cache lines, sequential scans are fast. The slack at the end costs memory but not access speed.

**Resize cost (the doubling argument - the headline result).** Starting from capacity 1 and appending n elements, resizes happen at sizes 1, 2, 4, 8, …, up to n. The copy work at each resize equals the size at that moment, so total copying across all n appends is:

```
1 + 2 + 4 + 8 + … + n  =  2n − 1  ≈  2n     (geometric series)
```

Total work for n appends is ~2n element-moves → **O(n) total → O(1) <abbr>amortized</abbr> per append.** Contrast a fixed-increment growth (`+1` each time): resizes at every size, total work `1 + 2 + … + n = n(n+1)/2 ≈ n²/2` → O(n) per append. **The geometric growth factor is exactly what collapses the cost.**

This is _amortized_, not _average-case-over-random-inputs_: it's a worst-case guarantee that any sequence of n appends costs O(n) total, even though one individual append can spike to O(n).

## Implementation

Definition + the resize-driven `append`, the operation that defines this structure.

**Pseudocode (CLRS-style contract):**

```
DYNAMIC-ARRAY-APPEND(A, x)
1   if A.size == A.capacity
2       new_cap = max(1, GROWTH × A.capacity)    ▷ GROWTH > 1, e.g. 2
3       B = ALLOCATE-BLOCK(new_cap)
4       for i = 0 to A.size − 1                   ▷ O(size) copy - the amortized cost
5           B[i] = A.data[i]
6       FREE-BLOCK(A.data)
7       A.data = B
8       A.capacity = new_cap
9   A.data[A.size] = x                            ▷ room guaranteed now
10  A.size = A.size + 1

DYNAMIC-ARRAY-POP(A)
1   if A.size == 0
2       error "pop from empty array"
3   A.size = A.size − 1
4   x = A.data[A.size]
5   if A.size > 0 and A.size ≤ A.capacity / 4     ▷ shrink at 1/4, not 1/2
6       RESIZE(A, A.capacity / 2)
7   return x
```

**Python (reference - idiomatic):**

```python
from typing import TypeVar, Generic, Iterator

T = TypeVar("T")

_GROWTH = 2  # doubling → amortized O(1) append

class DynamicArray(Generic[T]):
    """A growable array over a fixed-capacity backing list."""

    def __init__(self) -> None:
        self._size: int = 0
        self._capacity: int = 1
        self._data: list[T | None] = [None] * self._capacity

    def __len__(self) -> int:
        return self._size

    def __getitem__(self, i: int) -> T:
        if not 0 <= i < self._size:
            raise IndexError(f"index {i} out of bounds for size {self._size}")
        return self._data[i]  # type: ignore[return-value]  # O(1)

    def append(self, x: T) -> None:
        if self._size == self._capacity:
            self._resize(_GROWTH * self._capacity)  # the O(n) step, rare
        self._data[self._size] = x
        self._size += 1

    def pop(self) -> T:
        if self._size == 0:
            raise IndexError("pop from empty array")
        self._size -= 1
        x = self._data[self._size]
        self._data[self._size] = None  # release reference for GC
        if 0 < self._size <= self._capacity // 4:
            self._resize(self._capacity // 2)  # shrink at 1/4 to avoid thrashing
        return x  # type: ignore[return-value]

    def _resize(self, new_capacity: int) -> None:
        new_capacity = max(1, new_capacity)
        bigger: list[T | None] = [None] * new_capacity
        for i, value in enumerate(self._data[: self._size]):
            bigger[i] = value
        self._data = bigger
        self._capacity = new_capacity

    def __iter__(self) -> Iterator[T]:
        return (self._data[i] for i in range(self._size))  # type: ignore[misc]
```

## Gotchas / edge cases

- **"Append is O(1)" is <abbr>amortized</abbr>, not worst-case.** If the interviewer asks for _worst-case per operation_, a single append is O(n) (the resize). In <abbr>latency</abbr>-sensitive contexts this matters - say "amortized O(1), worst-case O(n) on the resize."
- **Resize transiently doubles memory.** During the copy, both old and new blocks are live, so peak memory is ~1.5–2× the data. A dynamic array near the memory ceiling can throw `OutOfMemoryError` mid-resize even though the final size fits. Pre-size to the known capacity to avoid this.
- **Shrink at 1/4, not 1/2.** A naive "halve when half-empty" thrashes: push/pop right at the 1/2 boundary forces O(n) resize every operation, making the amortization collapse. Shrinking at 1/4 leaves hysteresis so each resize is "paid for" by enough cheap operations.
- **Insertion in the middle is still O(n).** Growable ≠ cheap-to-splice. Inserting at index i shifts everything after it, same as a plain array. Dynamic only buys cheap _append_.
- **Iterator invalidation.** Appending during iteration may trigger a resize that reallocates the backing block - references/iterators into the old block dangle (C++ `vector`) or raise (`RuntimeError` in Python if you mutate a `list` mid-loop). Snapshot or index explicitly.

## What the interviewer probes for

**What changes at n = 10⁹ appends?** - The amortized-O(1) argument still holds asymptotically (total copy work stays ~2n regardless of n), but the *constants* start to bite: a doubling resize at n = 10⁹ elements copies ~10⁹ elements in one call, which is a multi-second pause and a transient ~2× memory spike (potentially tens of GB) rather than a negligible blip. At that scale you'd pre-size to a known capacity to skip the resize path entirely, or pick a growth factor closer to 1.5× (less wasted slack per resize) if memory ceiling matters more than resize count.

**Why not always over-allocate generously (say, 4× or start at capacity 10⁶) to avoid resizes altogether?** - Because the up-to-~2× memory slack after a doubling is already the cost side of this trade; over-allocating further wastes memory for collections that never grow that large, and most callers don't know the final size up front (that's the whole reason to reach for a dynamic array instead of a fixed one). The better lever is choosing the growth factor to match the workload's read/write and memory-vs-time priorities (see [Variants](#variants)), not blindly padding the initial capacity.

**Why not use a linked list instead, since it never has a resize spike at all?** - A linked list trades away O(1) random access and cache locality to get that smoothness - every node is a separate heap allocation, so iteration is dominated by cache misses even though Big-O looks the same. The dynamic array's occasional O(n) resize is worse for worst-case *<abbr>latency</abbr>* but better for aggregate *<abbr>throughput</abbr>*; pick the list only when a single worst-case pause is unacceptable (real-time systems) and access is genuinely sequential, not random.

## Practice problems

Seven problems, each exercising a **distinct** dynamic-array mechanic - resize-with-shrink policy, index-based O(1) deletion, <abbr>amortized</abbr>-cost accounting by hand, growth-factor trade-offs, swap-with-map deletion, a parallel auxiliary buffer, and amortized analysis across two buffers.

### 1. Implement a Dynamic Array from Scratch - grow-and-shrink resize policy

Implement a growable array supporting `get(i)`, `append(x)`, and `pop()` from a fixed backing block, without the language's built-in growable list. `append` must be amortized O(1); `pop` must also shrink the backing block when it gets sparse, without thrashing.

**Worked examples:**
- **Example 1**
  - **Input:** append 0..9 in order onto an empty array (starts at capacity 1) | **Output:** size = 10, capacity = 16
  - **Explanation:** capacity doubles each time size catches up: 1 → 2 → 4 → 8 → 16, so 10 elements land in a capacity-16 block.
- **Example 2**
  - **Input:** starting from the size=10, capacity=16 array above, pop 8 times | **Output:** size = 2, capacity = 4
  - **Explanation:** capacity only halves when size drops to `≤ capacity / 4`: it stays at 16 through the first five pops (size 9→5, threshold is 4), shrinks to 8 at size 4 (4 ≤ 16/4), then shrinks again to 4 at size 2 (2 ≤ 8/4) - the 1/4 threshold, not 1/2, is what prevents alternating push/pop from thrashing the resize.

**Constraints:** number of operations `≤ 10⁵`; growth factor 2 on append-when-full; shrink factor 1/2, triggered only when `size ≤ capacity / 4`.

**Approach:** Track `size` and `capacity` on the array object. On `append` when `size == capacity`, allocate a block of `2 × capacity`, copy every live element over, then place the new one - the amortized argument is the geometric series from [Memory layout](#memory-layout) (copies sum to ~2n over n appends). On `pop`, after removing the last element, shrink to `capacity / 2` only when `size` has fallen to `capacity / 4` or below - shrinking at the 1/2 boundary instead would thrash (an alternating push/pop right at that line forces an O(n) resize on every single call), so the 1/4 threshold leaves slack that "pays for" the eventual resize with enough cheap operations first.

```python
class DynamicArray:
    def __init__(self) -> None:
        self._size = 0
        self._cap = 1
        self._data: list[int | None] = [None]

    def __len__(self) -> int:
        return self._size

    def get(self, i: int) -> int:
        if not 0 <= i < self._size:
            raise IndexError(f"index {i} out of bounds for size {self._size}")
        return self._data[i]

    def append(self, x: int) -> None:
        if self._size == self._cap:
            self._resize(2 * self._cap)          # grow: doubling
        self._data[self._size] = x
        self._size += 1

    def pop(self) -> int:
        if self._size == 0:
            raise IndexError("pop from empty array")
        self._size -= 1
        x = self._data[self._size]
        self._data[self._size] = None
        if self._size > 0 and self._size <= self._cap // 4:
            self._resize(self._cap // 2)          # shrink: at 1/4, not 1/2
        return x  # type: ignore[return-value]

    def _resize(self, new_cap: int) -> None:
        new_cap = max(1, new_cap)
        bigger: list[int | None] = [None] * new_cap
        for i in range(self._size):
            bigger[i] = self._data[i]
        self._data = bigger
        self._cap = new_cap
```

**Complexity:** `append`/`pop` amortized O(1) (worst-case O(n) on a resize); `get` O(1) worst-case.

**Duplicate problems:**
- Design a ArrayList / Vector class (common systems-interview phrasing) - identical grow-and-shrink mechanic, different problem title.

---

### 2. O(1) Removal at an Arbitrary Index

Given a dynamic array and an index `i`, delete the element at `i` in O(1) time **without preserving order**. A naive delete-at-index shifts every element after `i`, which is O(n) - the task is to avoid that shift entirely using only index arithmetic on the array itself (no auxiliary hash map).

**Worked examples:**
- **Example 1**
  - **Input:** arr = [10, 20, 30, 40, 50], remove_at(1) | **Output:** arr = [10, 50, 30, 40]
  - **Explanation:** the element at index 1 (20) is overwritten by the last element (50), then the array shrinks by one - no shift of indices 2..4.
- **Example 2**
  - **Input:** arr = [7, 8, 9], remove_at(2) | **Output:** arr = [7, 8]
  - **Explanation:** removing the last index is the degenerate case - the element "swaps with itself" and the array just shrinks; no copy needed.

**Constraints:** `0 ≤ i < size`; up to `10⁵` removals; order of remaining elements need not be preserved.

**Approach:** Deleting at an arbitrary index is O(n) only because a plain array must close the gap by shifting everything after it. If order doesn't matter, skip the shift: copy the **last** element into slot `i`, then shrink `size` by one (an O(1) `pop`-from-end). This works because the last slot is always safe to vacate - it has nothing after it to preserve - so overwriting `i` with it never disturbs any other element's relative position except the one that moved. This is a different resize-avoidance trick from entry 5's array-plus-hashmap "Insert Delete GetRandom" below: there's no map here at all, because the caller supplies the index directly instead of looking a value up first.

```python
class ResizableArray:
    def __init__(self) -> None:
        self._size = 0
        self._cap = 1
        self._data: list[int | None] = [None]

    def __len__(self) -> int:
        return self._size

    def get(self, i: int) -> int:
        return self._data[i]  # type: ignore[return-value]

    def append(self, x: int) -> None:
        if self._size == self._cap:
            self._cap *= 2
            bigger: list[int | None] = [None] * self._cap
            for i in range(self._size):
                bigger[i] = self._data[i]
            self._data = bigger
        self._data[self._size] = x
        self._size += 1

    def remove_at(self, i: int) -> int:
        if not 0 <= i < self._size:
            raise IndexError(f"index {i} out of bounds for size {self._size}")
        removed = self._data[i]
        last = self._size - 1
        self._data[i] = self._data[last]      # overwrite target with the last element
        self._data[last] = None
        self._size -= 1
        return removed  # type: ignore[return-value]
```

**Complexity:** `remove_at` O(1) (no shift, no resize on delete); `append` amortized O(1).

---

### 3. Amortized Copy-Count Walkthrough - aggregate-method proof by simulation

Given `n` appends starting from an empty dynamic array (capacity 1, doubling on full), compute the **total number of element copies** performed across all resizes triggered by those `n` appends - the number that the amortized-O(1) claim rests on. Then verify it stays under the `2n` bound the article's [Memory layout](#memory-layout) section asserts.

**Worked examples:**
- **Example 1**
  - **Input:** n = 10 | **Output:** 15 total copies
  - **Explanation:** resizes fire when size hits capacity: at size 1 (copy 1 elem, cap→2), size 2 (copy 2, cap→4), size 4 (copy 4, cap→8), size 8 (copy 8, cap→16); total copies = 1+2+4+8 = 15, comfortably under 2n−1 = 19.
- **Example 2**
  - **Input:** n = 17 | **Output:** 31 total copies
  - **Explanation:** resizes at size 1, 2, 4, 8, 16 copy 1+2+4+8+16 = 31 elements; the 2n−1 bound for n=17 is 33, so 31 ≤ 33 holds.

**Constraints:** `1 ≤ n ≤ 10⁹` (the count is derived analytically for large `n`, not by actually running `n` appends); growth factor fixed at 2, starting capacity 1.

**Approach:** This is the **aggregate method** of amortized analysis, made concrete: instead of asserting the O(1)-per-append bound abstractly, walk the sequence and total the actual copy cost. A resize triggers exactly when `size` equals the current `capacity`, and each resize's cost is `size` copies (every live element moves). Since capacity doubles, resizes happen at sizes `1, 2, 4, 8, …` up to the largest power of two `≤ n`. Summing that geometric series gives `1 + 2 + 4 + … + 2^k ≈ 2n − 1` (see the derivation already on this page). The point of doing it by simulation rather than citing the formula is to make the "any single append can be O(n), but the running total never exceeds ~2n" claim checkable against real numbers, which is the crux interviewers probe for when they ask "prove amortized O(1)" instead of just stating it.

```python
def total_copies(n: int, growth: int = 2) -> int:
    """Total element-copies across all resizes triggered by n appends
    on a dynamic array starting at capacity 1, growing by `growth`x."""
    size = 0
    cap = 1
    copies = 0
    for _ in range(n):
        if size == cap:
            copies += size          # this resize copies every live element
            cap *= growth
        size += 1
    return copies

for n in (10, 17):
    total = total_copies(n)
    bound = 2 * n - 1
    print(n, total, total <= bound)   # True for both - stays under the 2n-1 bound
```

**Complexity:** O(n) time to simulate directly (O(log n) if computed analytically by summing the geometric series in closed form), O(1) space.

---

### 4. Growth Factor Comparison - geometric vs fixed-increment resizing

Given `n` appends, compare **total copy work** and **resize count** under three growth policies: doubling (2×), a smaller geometric factor (1.5×), and a fixed increment (`+k` capacity each time). Show why only the geometric policies keep amortized append at O(1), while the fixed-increment policy does not.

**Worked examples:**
- **Example 1**
  - **Input:** n = 1000, doubling (2×) from capacity 1 | **Output:** 10 resizes, 1023 total copies
  - **Explanation:** resizes fire at sizes 1, 2, 4, …, 512 (10 of them, since 1024 > 1000 never triggers); total copies are the sum of sizes at each resize, `1+2+4+...+512 = 1023` - under the `2n − 1 = 1999` bound with room to spare because `n` isn't itself a power of two.
- **Example 2**
  - **Input:** n = 1000, fixed increment (+64) from capacity 64 | **Output:** 15 resizes, 7680 total copies
  - **Explanation:** with a constant increment, resizes fire every 64 elements regardless of how large the array already is, so late resizes still cost proportionally to `n` each time - total copy work grows roughly quadratically in the number of resizes, far more than doubling's ~1023 for the same `n`.

**Constraints:** `1 ≤ n ≤ 10⁶`; growth factor `> 1` for the geometric policies; increment `k ≥ 1` for the fixed policy.

**Approach:** This is the [Variants](#variants) section's memory-vs-time dial, turned into a measurable comparison instead of an assertion. Simulate all three policies over the same `n` appends and tally resize count and total copies. Geometric growth (any factor `> 1`) keeps resizes **logarithmic** in `n` because capacity itself grows exponentially, so the copy series stays a convergent-ish geometric sum (~`n · factor/(factor−1)`). Fixed-increment growth keeps the *absolute* growth constant, so the number of resizes is **linear** in `n` (`n / k` of them), and because later resizes still each cost `O(size)` - which keeps growing - the total work becomes `O(n²/k)`: quadratic, not linear. That quadratic blowup is exactly why "amortized O(1) append" requires *geometric*, not additive, growth - the one line the [How it works](#how-it-works) section asserts but doesn't demonstrate numerically.

```python
def simulate(n: int, mode: str, factor: float = 2, increment: int = 64, start_cap: int = 1) -> tuple[int, int]:
    """Return (resize_count, total_copies) for n appends under a growth policy."""
    size = 0
    cap = start_cap
    resizes = 0
    copies = 0
    for _ in range(n):
        if size == cap:
            copies += size
            resizes += 1
            if mode == "geometric":
                cap = max(cap + 1, int(cap * factor))   # avoid stalling at cap=1 under int truncation
            else:
                cap += increment
        size += 1
    return resizes, copies

n = 1000
print("doubling (2x):   ", simulate(n, "geometric", factor=2))     # (10, 1023)
print("1.5x geometric:  ", simulate(n, "geometric", factor=1.5))   # (17, 2137)
print("fixed (+64):     ", simulate(n, "fixed", increment=64, start_cap=64))  # (15, 7680)
```

**Complexity:** O(n) time per simulated policy, O(1) space; the *conclusion* (geometric → O(n) total copy work, fixed-increment → O(n²) total copy work) is the point, not the simulation's own cost.

---

### 5. Insert Delete GetRandom O(1)

Design a set supporting `insert(val)`, `remove(val)`, and `getRandom()` - returning a uniformly random current element - **all in average O(1)**. Values are distinct.

**Worked examples:**
- **Example 1**
  - **Input:** insert(1), insert(2), remove(1), insert(3), getRandom() | **Output:** getRandom() returns 2 or 3, each with probability 0.5
  - **Explanation:** after remove(1), the array holds [2, 3] in some order with no gaps, so a uniform index pick is a uniform value pick.
- **Example 2**
  - **Input:** insert(5), insert(5) (second call) | **Output:** first insert returns True, second returns False
  - **Explanation:** 5 is already tracked in the index map, so the second insert is a no-op that reports failure.

**Constraints:** up to `2 × 10⁵` calls total across `insert`/`remove`/`getRandom`; values are distinct 32-bit integers.

**Approach:** A dynamic array gives O(1) random access (pick `arr[randint(0, n-1)]`) and O(1) append, but deleting an arbitrary value looks O(n) because of the shift. The trick: keep a `{value: index}` map alongside the array, and to delete, **swap the target with the last element**, then `pop()` the end - O(1), no shift. Update the moved element's index in the map. The array stays gap-free so `getRandom` is a single index. This differs from entry 2's swap-with-last-then-pop in one key way: entry 2 deletes by a caller-supplied *index*, this entry deletes by *value* - the map is what makes value-based O(1) lookup possible before the same swap-and-pop trick applies.

```python
import random

class RandomizedSet:
    def __init__(self) -> None:
        self._vals: list[int] = []
        self._pos: dict[int, int] = {}      # value -> its index in _vals

    def insert(self, val: int) -> bool:
        if val in self._pos:
            return False
        self._pos[val] = len(self._vals)
        self._vals.append(val)
        return True

    def remove(self, val: int) -> bool:
        if val not in self._pos:
            return False
        i = self._pos[val]
        last = self._vals[-1]
        self._vals[i] = last
        self._pos[last] = i
        self._vals.pop()                    # O(1) - drop the end
        del self._pos[val]
        return True

    def getRandom(self) -> int:
        return random.choice(self._vals)    # O(1) on a gap-free array
```

**Complexity:** O(1) average per operation, O(n) space.

**Duplicate problems:**
- Insert Delete GetRandom O(1) - Duplicates allowed (LC 381) - same swap-with-map trick, but the map now holds a set of indices per value since duplicates are allowed.

---

### 6. Min Stack

Design a stack supporting `push`, `pop`, `top`, and `getMin` (the minimum element currently in the stack) - **all in O(1)**.

**Worked examples:**
- **Example 1**
  - **Input:** push(-2), push(0), push(-3), getMin(), pop(), top() | **Output:** getMin() → -3, then after pop(), top() → 0
  - **Explanation:** the aux buffer tracks [-2, -2, -3] alongside the main stack; popping -3 off both leaves the aux top at -2's depth, but the main stack's new top is 0.
- **Example 2**
  - **Input:** push(5), push(5), pop(), getMin() | **Output:** getMin() → 5
  - **Explanation:** duplicate values are tracked independently per depth in the aux buffer, so popping one 5 still leaves the min correct.

**Constraints:** up to `3 × 10⁴` calls total; values fit a 32-bit signed integer; `pop`/`top`/`getMin` never called on an empty stack.

**Approach:** The main stack is a dynamic array (`append`/`pop`-from-end). `getMin` can't scan (that's O(n)), so maintain a **second growable buffer** holding the running minimum _at each depth_: when you push `x`, push `min(x, current_min)` onto the aux buffer. Both stacks grow and shrink in lockstep, so the min for the current depth is always the aux top.

```python
class MinStack:
    def __init__(self) -> None:
        self._stack: list[int] = []
        self._mins: list[int] = []          # _mins[i] = min of _stack[0..i]

    def push(self, x: int) -> None:
        self._stack.append(x)
        self._mins.append(x if not self._mins else min(x, self._mins[-1]))

    def pop(self) -> None:
        self._stack.pop()
        self._mins.pop()

    def top(self) -> int:
        return self._stack[-1]

    def getMin(self) -> int:
        return self._mins[-1]
```

**Complexity:** O(1) per operation, O(n) space.

**Duplicate problems:**
- Max Stack (design variant) - identical parallel-buffer technique tracking a running max instead of min.

---

### 7. Implement Queue using Stacks - amortized analysis across two buffers

Implement a FIFO queue (`push`, `pop`, `peek`, `empty`) using only two stacks (two growable arrays with append/pop-from-end). Each operation must be **amortized O(1)**.

**Worked examples:**
- **Example 1**
  - **Input:** push(1), push(2), pop() | **Output:** 1
  - **Explanation:** the first pop is empty on `out`, so `in` [1, 2] pours into `out` as [2, 1]; popping `out`'s top gives 1, the oldest pushed value - correct FIFO order.
- **Example 2**
  - **Input:** push(1), push(2), pop(), push(3), pop() | **Output:** 1, then 2
  - **Explanation:** after the first pop, `out` still holds [2]; push(3) goes to `in` without disturbing `out`, so the second pop drains `out` first (2) before any future pour would touch `in`'s [3].

**Constraints:** up to `100` calls total; values fit a 32-bit signed integer; `pop`/`peek` never called on an empty queue.

**Approach:** Keep an `in` stack and an `out` stack. `push` always appends to `in`. `pop`/`peek` take from `out`; when `out` is empty, **pour all of `in` into `out`** (reversing order, so the oldest ends up on top). Each element is moved between stacks at most twice (once in, once out) over its lifetime → the expensive pour is amortized away, giving O(1) average even though a single `pop` can be O(n). Same amortization shape as the array's own doubling.

```python
class MyQueue:
    def __init__(self) -> None:
        self._in: list[int] = []
        self._out: list[int] = []

    def push(self, x: int) -> None:
        self._in.append(x)

    def _shift(self) -> None:
        if not self._out:
            while self._in:
                self._out.append(self._in.pop())

    def pop(self) -> int:
        self._shift()
        return self._out.pop()

    def peek(self) -> int:
        self._shift()
        return self._out[-1]

    def empty(self) -> bool:
        return not self._in and not self._out
```

**Complexity:** Amortized O(1) per operation (worst-case O(n) on the pour), O(n) space.

**Duplicate problems:**
- Implement Stack using Queues (LC 225) - the mirror-image problem, same amortized-pour argument in the opposite direction.

---

### 8. Next Greater Element

Given an array, return for each element the next element to its right that is strictly greater, or -1 if none exists. Must run in O(n), not the O(n²) brute-force scan-right-for-each-element.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [2, 1, 2, 4, 3] | **Output:** [4, 2, 4, -1, -1]
  - **Explanation:** for index 0 (2), the next greater value scanning right is 4; for index 1 (1), it's 2; index 3 (4) and index 4 (3) have nothing greater to their right, so -1.
- **Example 2**
  - **Input:** nums = [5, 4, 3, 2, 1] | **Output:** [-1, -1, -1, -1, -1]
  - **Explanation:** the array is strictly decreasing, so no element ever has a greater value to its right.

**Constraints:** `1 ≤ nums.length ≤ 10⁵`, `-10⁹ ≤ nums[i] ≤ 10⁹`.

**Approach:** A dynamic array's amortized-O(1) `append`/`pop`-from-end **is** a stack - no separate structure needed, just a plain `list`. Scan left to right, keeping the stack **monotonically decreasing** (indices whose answer isn't found yet): before pushing the current value, pop every stack index whose value is smaller than it - each pop means "the current element is that index's next-greater," so record it. Every element is pushed once and popped at most once, so total work is O(n) despite the nested-looking `while`. This is the same amortized cost model as the array's own doubling - each `append`/`pop` is O(1) amortized, which is exactly what a monotonic-stack sweep assumes.

```python
def next_greater_element(nums: list[int]) -> list[int]:
    result = [-1] * len(nums)
    stack: list[int] = []            # holds indices, values monotonically decreasing
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:   # monotonic pop
            result[stack.pop()] = x            # x is that index's next-greater
        stack.append(i)              # amortized O(1)
    return result
```

**Complexity:** O(n) time (each index pushed once, popped at most once), O(n) space for the stack and output.

**Duplicate problems:**
- Daily Temperatures (LC 739) - identical monotonic-stack-of-indices sweep; the answer stored is the index gap instead of the value.
- Largest Rectangle in Histogram (LC 84) - same monotonic-stack mechanic, popping to find each bar's next-smaller boundary on both sides instead of next-greater.

---

### 9. Sliding Window Median

Given an array and a window size `k`, return the median of every contiguous window of size `k` as it slides across the array.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3 | **Output:** [1, -1, -1, 3, 5, 6]
  - **Explanation:** the first window [1,3,-1] sorted is [-1,1,3], median 1; the window then slides one at a time, each median read off the middle of the current sorted window.
- **Example 2**
  - **Input:** nums = [1, 2, 3, 4, 2, 3, 1, 4, 2], k = 3 | **Output:** [2, 3, 3, 3, 2, 3, 2]
  - **Explanation:** each window's median is the middle value (or average of the two middle values for even k) of that window's 3 elements in sorted order.

**Constraints:** `1 ≤ k ≤ nums.length ≤ 10⁵`, `-2³¹ ≤ nums[i] ≤ 2³¹ - 1`.

**Approach:** Keep a dynamic array **sorted** as the window slides, using `bisect.insort` to insert the incoming element (binary-search the slot, O(log k) to find it, O(k) to shift) and `bisect.bisect_left` + list deletion to remove the outgoing one. The median is then a direct O(1) read of the middle index (or average of the two middle indices for even `k`). This trades a real shift cost for avoiding a full re-sort per window - read-heavy (one median read per window) against a write cost (O(k) insert/remove) that's fine because `k` is the window size, not `n`.

```python
import bisect

def median_sliding_window(nums: list[int], k: int) -> list[float]:
    window = sorted(nums[:k])
    result = []

    def current_median() -> float:
        mid = k // 2
        if k % 2:
            return float(window[mid])
        return (window[mid - 1] + window[mid]) / 2

    result.append(current_median())
    for i in range(k, len(nums)):
        outgoing = nums[i - k]
        idx = bisect.bisect_left(window, outgoing)
        window.pop(idx)                      # remove the element leaving the window
        bisect.insort(window, nums[i])       # O(log k) find slot, O(k) shift
        result.append(current_median())
    return result
```

**Complexity:** O(n·k) time (n windows, each O(k) for the insert/remove shift), O(k) space for the sorted window.

**Duplicate problems:**
- Find Median from Data Stream (LC 295) - same "maintain order, read the middle" goal, but solved with two balanced heaps instead of a sorted array, since there's no sliding-window removal to handle.
