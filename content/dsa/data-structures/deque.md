# Deque

## Prerequisites

- [Big-O Notation](../algorithms/big-o-notation.md) [Must read]
- [Queue](./queue.md) [Must read]
- [Stack](./stack.md) [Should read]
- [Circular Buffer](./circular-buffer.md) [Should read]

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
  - [Sliding Window Maximum](#1-sliding-window-maximum)
  - [Design Circular Deque](#2-design-circular-deque)
  - [Shortest Subarray with Sum at Least K](#3-shortest-subarray-with-sum-at-least-k-lc-862)
  - [Sliding Window Median](#4-sliding-window-median)
  - [Minimum Cost to Make at Least One Valid Path in a Grid](#5-minimum-cost-to-make-at-least-one-valid-path-in-a-grid)

## What it is

A **deque** (double-ended queue, pronounced "deck") is a linear collection that supports **add and remove at _both_ ends - front and back - in O(1)**. It is the union of a [queue](./queue.md) (FIFO) and a [stack](./stack.md) (LIFO): use only the back and it's a stack; push the back and pop the front and it's a queue.

Mental model: **a deck of cards you can deal from the top or the bottom, and add to either.** Nothing in the middle is reachable in O(1) - the power is strictly at the two ends, and that's exactly enough for <abbr>sliding window</abbr>s, BFS/DFS frontiers, and any "peek-or-drop from whichever end is stale" problem.

> **Takeaway (say this out loud):** "A deque is a queue and a stack at once - O(1) add/remove at both ends. It's the engine behind sliding-window max/min and 0/1-BFS."

## How it works

A deque exposes four O(1) end operations - `push_front`, `push_back`, `pop_front`, `pop_back` - plus `peek` at either end. There is **no O(1) random access**: indexing into the middle, or inserting there, is O(n). The structure is defined entirely by what it makes cheap (both ends) and what it gives up (the middle).

```
            push_front          push_back
                │                    │
                ▼                    ▼
   pop_front ◀ [ 4 | 7 | 1 | 9 | 2 ] ▶ pop_back
                ▲                    ▲
              front                back
```

Two layouts deliver O(1) both ends (detailed in [Memory layout](#memory-layout)):

- **Circular buffer** - `front` and `back` are indices that advance and **wrap** (`% capacity`); pushing front means `front = (front - 1) % cap`, pushing back means `back = (back + 1) % cap`. Nothing shifts. <abbr>Cache-friendly</abbr>, fixed capacity.
- **Doubly linked list of blocks** - what Python's `collections.deque` uses: a linked list of fixed-size arrays. O(1) at both ends, unbounded growth, decent locality within a block.

The deep idea: the deque doesn't add a new _capability_ over a queue so much as remove a _restriction_. A queue forbids touching the back's removal and the front's insertion; lift that and the same O(1)-ends machinery answers a whole class of "the useful element is at one end, the stale one at the other" problems - which is why the [monotonic deque](#1-sliding-window-maximum) and [0/1-BFS](#5-minimum-cost-to-make-at-least-one-valid-path-in-a-grid) live here and not on the queue page.

## Operations

| Operation                | Time | Space |
| ------------------------ | ---- | ----- |
| `push_front` / `appendleft` | O(1) | O(1)  |
| `push_back` / `append`   | O(1) | O(1)  |
| `pop_front` / `popleft`  | O(1) | O(1)  |
| `pop_back` / `pop`       | O(1) | O(1)  |
| `peek` front / back      | O(1) | O(1)  |
| Random access by index   | O(n)\* | O(1)  |
| Insert / delete middle   | O(n) | O(1)  |
| Search by value          | O(n) | O(1)  |

\*`collections.deque` allows `dq[i]`, but it walks from the nearest end - O(n) in the worst case (the middle), **not** the O(1) of a [dynamic array](./dynamic-array.md). If you index a deque in a loop you've picked the wrong structure.

## Complexity summary

| Operation        | Best | Average | Worst                                       |
| ---------------- | ---- | ------- | ------------------------------------------- |
| Push (either end) | O(1) | O(1)    | O(1) amortized (block alloc / ring resize)  |
| Pop (either end)  | O(1) | O(1)    | O(1)                                        |
| Peek (either end) | O(1) | O(1)    | O(1)                                        |
| Index `dq[i]`     | O(1) | O(n)    | O(n) (walks from nearest end)               |

**The `O(1)` push hides two different worst cases - know which layout you're on.** On a **block-linked deque** (`collections.deque`), a push that fills the end block triggers a single small block allocation, not a copy of the whole structure - so the worst case is genuinely O(blocksize) = O(1), and there is **no resize-pause spike** at all. On a **circular-buffer deque**, a push into a full ring forces an allocate-and-copy of every element - a true O(n) spike on that one push, <abbr>amortized</abbr> to O(1) only because the capacity doubles (the [dynamic-array argument](./dynamic-array.md#memory-layout)). The senior distinction: the block-linked form trades a worst-case *<abbr>latency</abbr>* spike for steady small allocations, which is exactly why a real-time or low-latency system prefers it over a doubling ring.

The constants differ too: the block-linked form chases a pointer **between** blocks (a cache miss at each block boundary) even though it's contiguous **within** a block, so a full traversal is slower than a contiguous array despite both being "O(n)". The ring buffer has no such boundary misses - fully contiguous - which is why bounded, cache-sensitive workloads (embedded, streaming) pick it.

**The accounting for the ring-buffer resize, shown on-page.** Charge every `push_front`/`push_back` 2 credits: 1 pays for writing its own slot, 1 is banked toward the next grow-and-copy. When the ring fills at capacity `c` (having last resized from `c/2`), the `c/2` pushes since then banked `c/2` credits - exactly covering the O(c) cost of copying all `c` elements (unwrapping the ring into a fresh, larger contiguous array) during the resize. Every push looks O(1) in credit terms; the one push that lands on a full ring and triggers the O(n) copy is paid for by credits banked by every push before it, not charged fresh in the moment. Summed over `n` pushes, total credit spend is O(n) → **O(1) amortized per push** - the block-linked form sidesteps this entire argument by never needing a full-structure copy at all, which is the senior distinction already drawn above.

**Space:** O(n) for n elements. The block-linked-list form carries a small per-block pointer overhead but packs elements within a block for locality; a circular-buffer deque is a single contiguous array with two indices and a `size` count, the tightest option when capacity is bounded.

## When to use / when not

**Reach for a deque when:**

- You need **O(1) access at both ends** - a <abbr>sliding window</abbr> that grows on the right and shrinks on the left, a work list you push/pop from either side, an undo/redo where both ends matter.
- You're running a **[monotonic-deque](#1-sliding-window-maximum) sliding-window extremum** - window max/min in O(n), the deque's signature trick.
- You want **one structure that is both a queue and a stack** - BFS uses it as FIFO, DFS as LIFO, with no second type.
- You need **0/1-BFS** - shortest path on 0/1-weighted edges without Dijkstra's heap.

**Reach for something else when:**

- **You only ever touch one end** → a plain [stack](./stack.md) (LIFO) or [queue](./queue.md) (FIFO) states intent more clearly; the deque is a superset but a less specific signal in an interview.
- **You need random access or iteration by index** → an [array](./array.md) / [dynamic array](./dynamic-array.md). Indexing a deque is O(n); indexing an array is O(1).
- **You need priority order, not positional order** → a [heap](./heap.md). "Most urgent next" is a heap; "leftmost / rightmost next" is a deque.
- **You need the median or k-th element of the window** → a deque can't help (it only sees the ends); use two heaps or an ordered structure (see [practice problem 4](#4-sliding-window-median)).

Rule of thumb: **deque = both ends are cheap, the middle is not.** If the useful element is always at one of the two ends, it's a deque; if it's the largest/smallest regardless of position, it's a <abbr>heap</abbr>.

Real-world: `collections.deque` is the standard BFS frontier in Python, the backing store for bounded **sliding-window buffers** and **rate limiters** (drop stale entries from the front), the work-stealing **scheduler deques** in runtimes like Go and Java's ForkJoinPool (a worker pushes/pops its own end, thieves steal from the other), and the undo/redo ring in editors.

## Comparison

| Structure             | Add            | Remove         | Random access | Order       | Memory               | Pick it when…                            |
| --------------------- | -------------- | -------------- | ------------- | ----------- | -------------------- | ---------------------------------------- |
| **Deque**             | **O(1) both**  | **O(1) both**  | O(n)          | positional  | ring / block-list    | both ends cheap, sliding-window extremes |
| Queue                 | O(1) back      | O(1) front     | no            | FIFO        | ring / +ptr          | arrival order, BFS, buffering            |
| Stack                 | O(1) top       | O(1) top       | no            | LIFO        | array slack / +ptr   | nesting, undo, DFS                       |
| Dynamic array         | O(1)\* back    | O(1) back, O(n) front | **O(1)** | by index    | contiguous, tight    | random access, iteration, append-heavy  |
| Priority queue (heap) | O(log n)       | O(log n) min/max | no          | priority    | array, complete tree | "most urgent next", Dijkstra             |

The deque's identity is **both ends in O(1), middle in O(n)** - it strictly generalizes queue and stack (each restricts the deque to one discipline) while giving up the array's O(1) random access. Reach past it to a dynamic array the moment you need indexing, to a <abbr>heap</abbr> the moment "best" means priority rather than position.

See the [Data Structure Selection cheatsheet](../cheatsheets/data-structure-selection.md) for the full cross-structure comparison.

## Variants

- **Circular-buffer deque** - fixed-capacity ring with wrapping `front`/`back` indices; O(1) both ends, <abbr>cache-friendly</abbr>, no shifting. The bounded-capacity choice; built in [practice problem 2](#2-design-circular-deque).
- **Doubly-linked-list deque** - a node with prev/next pointers per element; O(1) both ends, unbounded, at pointer-overhead + cache-miss cost. The textbook unbounded form.
- **Block-linked deque** - a linked list of fixed-size arrays (blocks), blending the two: O(1) ends, unbounded, with locality within a block. This is what `collections.deque` actually is.
- **Bounded deque (`deque(maxlen=k)`)** - a ring that **evicts from the opposite end** on overflow. `deque(maxlen=k)`: appending to a full deque drops the front automatically. The one-liner sliding-window-of-last-k buffer, and a rate-limiter primitive.
- **Monotonic deque** - a deque kept increasing or decreasing to answer window min/max in O(n). A _discipline_ on a deque, not a new structure; full treatment in [Practice problems](#1-sliding-window-maximum).
- **Output-restricted / input-restricted deque** - theoretical variants allowing insertion or removal at only one end. Rarely used in practice; named for completeness because interviews occasionally cite the taxonomy.

## Memory layout

The deque's whole difficulty is **O(1) at _both_ ends simultaneously** - the queue solved one-end-each, the deque must keep both ends cheap at once. Two layouts manage it; both avoid the O(n) shift that a naive front-at-0 array would force on every `push_front`.

**The circular-buffer layout (contiguous, wrapping).** A single array with `front` and `size`; the back slot is `(front + size) % cap`. Pushing the front walks `front` _backward_ with wrap (`(front - 1 + cap) % cap`); pushing the back writes at the back slot. Nothing shifts.

```
ring deque, capacity 6:    front=4, size=3   (wraps past the end)

index:  0    1    2    3    4    5
      [ 1 | 9 |   |   | 4 | 7 ]
        ▲ back slots          ▲front
        (elements: 4 7 1 9 wrapping front→back: 4 @4, 7 @5, 1 @0, 9 @1)

push_front(8): front = (4 - 1) % 6 = 3, write data[3]=8
push_back(2):  back = (front + size) % 6, write there, size++
```

- **Cache-friendly** (contiguous), no per-element pointer overhead - the tightest layout when capacity is bounded (embedded, streaming, fixed windows).
- Capacity is fixed; growing means allocate-and-copy, <abbr>amortized</abbr> O(1) like a [dynamic array](./dynamic-array.md#memory-layout).
- The empty-vs-full ambiguity at `front == back` is resolved by tracking `size` explicitly (same trap as the [circular queue](./queue.md#memory-layout)).

**The block-linked layout (scattered blocks, unbounded).** A doubly linked list of fixed-size arrays (blocks). Both ends point at a block; pushing appends within the end block, allocating a new block only when the end block fills. This is `collections.deque`'s real implementation.

```
block-linked deque (CPython's collections.deque):

   leftblock                          rightblock
   [ _ | _ | 4 | 7 ] ◀──▶ [ 1 | 9 | 2 | _ ] ◀──▶ ...
         ▲front                         ▲back
   push_front fills leftward in the left block, allocates a new
   block on the left when it's full - O(1) amortized, never a full copy
```

- **No resize spike** (a new block is one small allocation, not a copy of everything) - unbounded, with locality _within_ a block but pointer hops _between_ blocks.
- This is why `collections.deque` is the reflexive Python choice: O(1) both ends, no capacity to manage, no `list.pop(0)` O(n) trap.

**Which to pick:** `collections.deque` for essentially everything in Python; a circular-buffer deque when capacity is bounded and you want one contiguous <abbr>cache-friendly</abbr> array (and you're implementing it yourself, e.g. in C++ or for a `Design Circular Deque` problem).

## Implementation

A circular-buffer deque - the version that shows the both-ends wrapping arithmetic. Pseudocode is the contract; Python gives the from-scratch ring plus the `collections.deque` you'd actually reach for.

**Pseudocode (CLRS-style contract, ring of capacity `cap`):**

```
PUSH-FRONT(D, x)
1   if D.size == D.cap
2       error "overflow"
3   D.front = (D.front − 1 + D.cap) mod D.cap
4   D.data[D.front] = x
5   D.size = D.size + 1

PUSH-BACK(D, x)
1   if D.size == D.cap
2       error "overflow"
3   back = (D.front + D.size) mod D.cap          ▷ next back slot
4   D.data[back] = x
5   D.size = D.size + 1

POP-FRONT(D)
1   if D.size == 0
2       error "underflow"
3   x = D.data[D.front]
4   D.front = (D.front + 1) mod D.cap
5   D.size = D.size − 1
6   return x

POP-BACK(D)
1   if D.size == 0
2       error "underflow"
3   back = (D.front + D.size − 1) mod D.cap
4   x = D.data[back]
5   D.size = D.size − 1
6   return x
```

**Python (reference - idiomatic ring):**

```python
from typing import Generic, Optional, TypeVar

T = TypeVar("T")

class CircularDeque(Generic[T]):
    """Fixed-capacity double-ended queue over a ring buffer; O(1) both ends."""

    def __init__(self, capacity: int) -> None:
        self._data: list[Optional[T]] = [None] * capacity
        self._cap = capacity
        self._front = 0
        self._size = 0

    def push_front(self, x: T) -> None:
        if self._size == self._cap:
            raise OverflowError("deque is full")
        self._front = (self._front - 1) % self._cap
        self._data[self._front] = x
        self._size += 1

    def push_back(self, x: T) -> None:
        if self._size == self._cap:
            raise OverflowError("deque is full")
        back = (self._front + self._size) % self._cap    # next back slot
        self._data[back] = x
        self._size += 1

    def pop_front(self) -> T:
        if self._size == 0:
            raise IndexError("pop from empty deque")
        x = self._data[self._front]
        self._data[self._front] = None                   # release reference
        self._front = (self._front + 1) % self._cap
        self._size -= 1
        return x                                         # type: ignore[return-value]

    def pop_back(self) -> T:
        if self._size == 0:
            raise IndexError("pop from empty deque")
        back = (self._front + self._size - 1) % self._cap
        x = self._data[back]
        self._data[back] = None
        self._size -= 1
        return x                                         # type: ignore[return-value]

    def __len__(self) -> int:
        return self._size
```

**Contest velocity - `collections.deque`, never hand-roll under time pressure:**

```python
from collections import deque

dq = deque()         # or deque(iterable), or deque(maxlen=k) for a bounded ring
dq.append(x)         # push back   - O(1)
dq.appendleft(x)     # push front  - O(1)
dq.pop()             # pop back    - O(1)
dq.popleft()         # pop front   - O(1)
front, back = dq[0], dq[-1]          # peek both ends - O(1)
dq.rotate(k)         # rotate right by k - O(k), handy for cyclic problems
# deque(maxlen=k): appending when full evicts the OPPOSITE end automatically
```

## Gotchas / edge cases

- **Indexing a deque is O(n), not O(1).** `collections.deque` supports `dq[i]`, but it walks from the nearest end - innocuous-looking, O(n) in the middle, O(n²) in a loop. If you find yourself indexing a deque repeatedly you wanted a [dynamic array](./dynamic-array.md). The senior trap: the API permits `dq[i]`, so the cost is invisible until it TLEs.
- **Empty-deque underflow.** `pop`/`popleft`/`dq[0]` on an empty deque raises `IndexError`. Guard `while dq` / `if dq`; a stray `popleft()` after a BFS loop ends crashes.
- **Monotonic deque: indices vs values, and `<` vs `<=`.** Store **indices** (not values) so you can detect when the front slides out of the window. The comparison strictness (`<` vs `<=` when popping the back) decides duplicate handling - get it wrong and equal elements are dropped or double-counted. Same subtle bug as the [monotonic stack](./stack.md).
- **Full ring buffer: empty vs full at `front == back`.** With wrapping indices, `front == back` is ambiguous (empty _or_ full). Track an explicit `size` count (as the implementation does) or leave one slot always empty - otherwise you silently drop or duplicate elements.
- **`deque(maxlen=k)` evicts the _opposite_ end (CP-flavored trap).** Appending to a full bounded deque drops from the front; `appendleft` drops from the back. Convenient for last-k windows, but the silent eviction bites if you assumed it would refuse or grow.
- **Reaching for a deque when a <abbr>heap</abbr> is needed.** A deque only sees its two ends - it cannot give you the window median or k-th largest. Sliding-window _max_ is a monotonic deque; sliding-window _median_ needs two heaps. Misreading "extremum" as "any order statistic" is the classic over-reach.

## What the interviewer probes for

**What changes at n = 10⁹ elements - does a circular-buffer deque still make sense?** - At that scale a fixed-capacity ring either needs a capacity you can't pre-size correctly or repeated allocate-and-copy resizes, each an O(n) pause on the unlucky push (see [Memory layout](#memory-layout)). A block-linked deque (`collections.deque`'s design) sidesteps this entirely: growth is one small block allocation, never a full-structure copy, so it has no resize-pause spike at any n - the reason it's the default for unbounded, high-volume workloads.

**Why not always use a block-linked deque instead of a circular buffer, since it has no resize spike?** - Because the block-linked form pays a cache miss at every block boundary (pointer-chasing between blocks) even though it's contiguous within a block, so a full traversal is measurably slower than the ring buffer's fully-contiguous layout despite both being O(n). Pick the circular buffer when capacity is genuinely bounded and cache-tight iteration matters (embedded, streaming); pick block-linked (i.e. just use `collections.deque`) everywhere else.

## Practice problems

Five staples, each a **distinct** deque technique - no two solved the same way.

### 1. Sliding Window Maximum

**Problem.** Given an array `nums` and window size `k`, return the maximum of each contiguous window. E.g. `nums=[1,3,-1,-3,5,3,6,7], k=3` → `[3,3,5,5,6,7]`. Constraints: `n ≤ 10⁵`, so O(n·k) brute force and even O(n log n) <abbr>heap</abbr>s are on the edge - O(n) is the intended bound.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [1,3,-1,-3,5,3,6,7], k = 3 | **Output:** [3,3,5,5,6,7]
  - **Explanation:** the monotonic deque holds decreasing values per window; for window [1,3,-1] the front is 3, and as the window slides the front updates to 5 once 5 enters and dominates.
- **Example 2**
  - **Input:** nums = [9,8,7,6], k = 2 | **Output:** [9,8,7]
  - **Explanation:** values are already strictly decreasing, so every element stays in the deque only until it slides out the front - the max of each window is always its leftmost (oldest) element.

**Constraints:** `1 ≤ nums.length ≤ 10⁵`, `-10⁴ ≤ nums[i] ≤ 10⁴`, `1 ≤ k ≤ nums.length`.

**Approach:** A **decreasing monotonic deque of indices**: pop smaller values off the back before pushing `i`, pop the front when it leaves the window; the front index is always the window max. Each index enters and leaves once → O(n). This is the deque's signature primitive in its canonical problem.

```python
from collections import deque

def max_sliding_window(nums: list[int], k: int) -> list[int]:
    dq: deque[int] = deque()
    res = []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] == i - k:
            dq.popleft()
        if i >= k - 1:
            res.append(nums[dq[0]])
    return res
```

**Complexity:** O(n) time, O(k) space. Pattern: [Sliding Window](../patterns/sliding-window.md).

**Duplicate problems:**
- Jump Game VI (LC 1696) - same monotonic-deque max-in-window extraction, run over a `dp` array computed on the fly instead of a given input array.
- Constrained Subsequence Sum (LC 1425) - same monotonic-deque DP-transition shape as Jump Game VI, with a max-with-zero clamp.

### 2. Design Circular Deque

**Problem.** Design a fixed-capacity deque with `insertFront`, `insertLast`, `deleteFront`, `deleteLast`, `getFront`, `getRear`, `isEmpty`, `isFull` - all O(1).

**Worked examples:**
- **Example 1**
  - **Input:** MyCircularDeque(3); insertLast(1); insertLast(2); insertFront(3); insertLast(4) | **Output:** True, True, True, False
  - **Explanation:** the first three inserts fill the capacity-3 ring (front=3, back has 1,2); the fourth insert fails because `_size == _cap`, correctly rejecting the overflow.
- **Example 2**
  - **Input:** same deque after the above; getRear(); isFull() | **Output:** 2, True
  - **Explanation:** the rear slot is computed as `(front + size - 1) % cap`, which still points at value 2 since the failed `insertLast(4)` never mutated state; `isFull` reads `size == cap` directly.

**Constraints:** `1 ≤ k ≤ 1000` (deque capacity), `0 ≤ value ≤ 1000`, at most `2000` calls to the deque methods.

**Approach:** A fixed array with a `front` index and a `size` count; the back slot is `(front + size) % cap`. `insertFront` walks `front` backward with wrap; `insertLast` writes the back slot. Tracking `size` explicitly resolves the empty-vs-full ambiguity. This makes the ring-buffer layout concrete and exercises both-end wrapping arithmetic - distinct from the monotonic-deque technique.

```python
class MyCircularDeque:
    def __init__(self, k: int) -> None:
        self._data = [0] * k
        self._cap = k
        self._front = 0
        self._size = 0

    def insertFront(self, value: int) -> bool:
        if self._size == self._cap:
            return False
        self._front = (self._front - 1) % self._cap
        self._data[self._front] = value
        self._size += 1
        return True

    def insertLast(self, value: int) -> bool:
        if self._size == self._cap:
            return False
        self._data[(self._front + self._size) % self._cap] = value
        self._size += 1
        return True

    def deleteFront(self) -> bool:
        if self._size == 0:
            return False
        self._front = (self._front + 1) % self._cap
        self._size -= 1
        return True

    def deleteLast(self) -> bool:
        if self._size == 0:
            return False
        self._size -= 1
        return True

    def getFront(self) -> int:
        return -1 if self._size == 0 else self._data[self._front]

    def getRear(self) -> int:
        return -1 if self._size == 0 else self._data[(self._front + self._size - 1) % self._cap]

    def isEmpty(self) -> bool:
        return self._size == 0

    def isFull(self) -> bool:
        return self._size == self._cap
```

**Complexity:** O(1) per operation, O(k) space. See [Circular Buffer](./circular-buffer.md).

**Duplicate problems:**
- Design Circular Queue (LC 622) - identical ring-buffer wrapping-index technique (`front`/`size`, `% cap` arithmetic), restricted to single-ended enqueue/dequeue.

### 3. Shortest Subarray with Sum at Least K (LC 862)

**Problem.** Given an integer array `nums` (values may be **negative**) and integer `k`, return the length of the shortest non-empty contiguous subarray with sum ≥ `k`, or -1. Constraints: `n ≤ 10⁵`; negatives rule out the simple <abbr>two-pointer</abbr> sliding window that works for all-positive arrays.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [1], k = 1 | **Output:** 1
  - **Explanation:** the single-element subarray [1] already sums to 1 ≥ k, so the shortest length is 1.
- **Example 2**
  - **Input:** nums = [1,2], k = 4 | **Output:** -1
  - **Explanation:** the maximum possible sum (the whole array) is 3, which never reaches k = 4, so no valid subarray exists.
- **Example 3**
  - **Input:** nums = [2,-1,2], k = 3 | **Output:** 3
  - **Explanation:** <abbr>prefix sum</abbr>s are [0,2,1,3]; the negative value makes the length-2 windows fail, but the deque finds that the full array (prefix[3]-prefix[0] = 3 ≥ k) is the shortest qualifying window, showing why negatives defeat plain two-pointer.

**Constraints:** `1 ≤ nums.length ≤ 10⁵`, `-10⁵ ≤ nums[i] ≤ 10⁵`, `1 ≤ k ≤ 10⁹`.

**Approach:** Build [prefix sums](../patterns/prefix-sum.md) `P`, where subarray `(i, j]` has sum `P[j] - P[i]`. For each `j` we want the smallest window, so the closest earlier `i` with `P[i] ≤ P[j] - k`. Keep an **increasing monotonic deque of prefix-sum indices**: pop the front while `P[j] - P[deque.front] ≥ k` (record the length - it can't help a later `j` better), and pop the back while `P[j] ≤ P[deque.back]` (a later, smaller prefix dominates). This is the monotonic deque applied to prefix sums rather than raw values - a distinct twist from problem 1, and the canonical "monotonic deque handles negatives where two-pointer can't" problem.

```python
from collections import deque

def shortest_subarray(nums: list[int], k: int) -> int:
    n = len(nums)
    prefix = [0] * (n + 1)
    for i, x in enumerate(nums):
        prefix[i + 1] = prefix[i] + x
    dq: deque[int] = deque()              # indices into prefix, values increasing
    best = n + 1
    for j in range(n + 1):
        while dq and prefix[j] - prefix[dq[0]] >= k:
            best = min(best, j - dq.popleft())   # shortest valid window ending at j
        while dq and prefix[j] <= prefix[dq[-1]]:
            dq.pop()                      # dominated: a smaller later prefix is better
        dq.append(j)
    return best if best <= n else -1
```

**Complexity:** O(n) time, O(n) space. Pattern: [Prefix Sum](../patterns/prefix-sum.md) + monotonic deque.

### 4. Sliding Window Median

**Problem.** Return the median of every window of size `k`. E.g. `nums=[1,3,-1,-3,5,3,6,7], k=3` → `[1,-1,-1,3,5,6]`. Constraints: `n ≤ 10⁵`.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [1,3,-1,-3,5,3,6,7], k = 3 | **Output:** [1,-1,-1,3,5,6]
  - **Explanation:** for window [1,3,-1] the two heaps balance to lower half {-1,1} and upper half {3}, giving median = max(lower) = 1; the deque cannot produce this because -1 is neither the min nor max of the window.
- **Example 2**
  - **Input:** nums = [1,2], k = 2 | **Output:** [1.5]
  - **Explanation:** the only window [1,2] has an even size, so the median is the average of the two balanced-heap tops (1 and 2) = 1.5 - an order-statistic average a deque's two ends alone cannot expose.

**Constraints:** `1 ≤ k ≤ nums.length ≤ 2 × 10⁴`, `-2³¹ ≤ nums[i] ≤ 2³¹ - 1`.

**Approach:** This problem looks like Sliding Window Maximum but a deque **cannot** solve it - a deque only exposes its two ends, and the median is an interior order statistic, not an extremum. The fix is **two heaps** (a max-heap for the lower half, a min-heap for the upper half) kept balanced, with lazy deletion of out-of-window elements. The teaching point: recognize when "sliding window + order statistic" exceeds the deque's reach and demands a [heap](./heap.md)-based structure instead - the distinct technique here is knowing the deque's limit.

```python
import heapq

def median_sliding_window(nums: list[int], k: int) -> list[float]:
    small: list[int] = []                 # max-heap (negated) - lower half
    large: list[int] = []                 # min-heap            - upper half
    delayed: dict[int, int] = {}          # lazy-delete counts
    res: list[float] = []

    def prune(heap: list[int]) -> None:   # drop stale tops
        sign = -1 if heap is small else 1
        while heap and delayed.get(sign * heap[0], 0) > 0:
            delayed[sign * heap[0]] -= 1
            heapq.heappop(heap)

    def rebalance() -> None:
        if len(small) > len(large) + 1:
            heapq.heappush(large, -heapq.heappop(small)); prune(small)
        elif len(small) < len(large):
            heapq.heappush(small, -heapq.heappop(large)); prune(large)

    for i, x in enumerate(nums):
        if not small or x <= -small[0]:
            heapq.heappush(small, -x)
        else:
            heapq.heappush(large, x)
        if i >= k:                         # remove nums[i-k] lazily
            out = nums[i - k]
            delayed[out] = delayed.get(out, 0) + 1
            prune(small); prune(large)
        rebalance(); prune(small); prune(large)
        if i >= k - 1:
            med = -small[0] if k % 2 else (-small[0] + large[0]) / 2
            res.append(med)
    return res
```

**Complexity:** O(n log k) time, O(k) space. Pattern: [Top-K / two-heaps](../patterns/top-k-elements.md) - the counterexample that defines the deque's boundary.

**Duplicate problems:**
- Find Median from Data Stream (LC 295) - the same two-heap balancing + lazy-deletion-free core technique, without the sliding-window eviction.

### 5. Minimum Cost to Make at Least One Valid Path in a Grid

**Problem.** Given an `m x n` grid where each cell has a direction arrow (one of 4), moving along the arrow costs 0 and moving against it costs 1 (you may change any cell's arrow). Return the minimum cost to build a path from the top-left to the bottom-right corner.

**Worked examples:**
- **Example 1**
  - **Input:** grid = [[1,1,1,1],[2,2,2,2],[1,1,1,1],[2,2,2,2]] | **Output:** 3
  - **Explanation:** every "free" move (following the arrow) costs 0 and every "against the arrow" move costs 1 - the shortest-cost path changes direction 3 times.
- **Example 2**
  - **Input:** grid = [[1,1,3],[3,2,2],[1,1,4]] | **Output:** 0
  - **Explanation:** the arrows already point along a valid top-left-to-bottom-right path, so no direction changes (0-cost moves only) are needed.

**Constraints:** `1 ≤ m, n ≤ 100`, grid values are 1-4 (arrow directions).

**Approach:** Model the grid as a graph where each cell has 4 outgoing edges (one per direction): weight **0** if it matches the cell's arrow, weight **1** otherwise. This is exactly a **0/1-weighted shortest-path** problem - Dijkstra's O(E log V) heap works, but a deque solves it in O(V + E) instead: `appendleft` a neighbor reached via a 0-cost (arrow-following) move so it's processed next at the same distance, `append` a neighbor reached via a 1-cost move so it's processed after all current-distance nodes are exhausted. The deque naturally stays sorted by distance, so the first pop of any cell is its final shortest cost - no heap needed. This is the deque's contest-signature "two ends encode the two possible edge weights" trick, distinct from every other entry in this section.

```python
from collections import deque

def min_cost(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    # direction encodings 1..4 map to (dr, dc); index 0 unused
    moves = [(0, 0), (0, 1), (0, -1), (1, 0), (-1, 0)]
    INF = float("inf")
    dist = [[INF] * n for _ in range(m)]
    dist[0][0] = 0
    dq = deque([(0, 0)])
    while dq:
        r, c = dq.popleft()
        for d in range(1, 5):
            dr, dc = moves[d]
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n:
                cost = 0 if grid[r][c] == d else 1
                if dist[r][c] + cost < dist[nr][nc]:
                    dist[nr][nc] = dist[r][c] + cost
                    if cost == 0:
                        dq.appendleft((nr, nc))     # free move - process next
                    else:
                        dq.append((nr, nc))         # cost-1 move - process later
    return dist[m - 1][n - 1]
```

**Complexity:** O(m·n) time (V + E on a grid graph with O(1) out-degree), O(m·n) space.

**Duplicate problems:**
- Shortest Path in Binary Matrix (LC 1091) - a related but distinct plain-BFS problem (all edge weights equal 1, no 0-weight edges) - only the queue-based BFS mechanic is shared, not the two-ended 0/1 distinction.
- Number of Ways to Arrive at Destination (LC 1976) - same weighted-shortest-path shape but with arbitrary positive weights, requiring Dijkstra's heap rather than 0/1-BFS's deque.
