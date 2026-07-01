# Deque

## Prerequisites

- **Big-O Notation** [Must read] - the deque's entire claim is O(1) at _both_ ends; you need the cost model to see why that's non-trivial over an array. <!-- U9: not-yet-written target — wire to `algorithms/big-o-notation.md` once that page exists. -->
- [Queue](./queue.md) [Must read] - a deque is the queue generalized to both ends; the queue's naive-array dequeue trap and circular-buffer fix are the foundation this page builds on.
- [Stack](./stack.md) [Should read] - a deque is also a stack (push/pop one end); seeing it subsume both LIFO and FIFO is the mental unlock.
- [Circular Buffer](./circular-buffer.md) [Should read] - the wrapping-index layout that gives a deque O(1) both ends without shifting.

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
- [CP-primitives](#cp-primitives)
  - [Monotonic deque — sliding-window max/min in O(n)](#monotonic-deque--sliding-window-maxmin-in-on)
  - [0/1-BFS — Dijkstra-free shortest path](#01-bfs--dijkstra-free-shortest-path)
- [Gotchas / edge cases](#gotchas--edge-cases)
- [Practice problems](#practice-problems)
  - [Sliding Window Maximum](#1-sliding-window-maximum--monotonic-deque)
  - [Design Circular Deque](#2-design-circular-deque--ring-buffer-both-ends)
  - [Shortest Subarray with Sum at Least K](#3-shortest-subarray-with-sum-at-least-k--monotonic-deque-on-prefix-sums)
  - [Sliding Window Median](#4-sliding-window-median--why-a-deque-is-not-enough)

## What it is

A **deque** (double-ended queue, pronounced "deck") is a linear collection that supports **add and remove at _both_ ends — front and back — in O(1)**. It is the union of a [queue](./queue.md) (FIFO) and a [stack](./stack.md) (LIFO): use only the back and it's a stack; push the back and pop the front and it's a queue.

Mental model: **a deck of cards you can deal from the top or the bottom, and add to either.** Nothing in the middle is reachable in O(1) — the power is strictly at the two ends, and that's exactly enough for sliding windows, BFS/DFS frontiers, and any "peek-or-drop from whichever end is stale" problem.

> **Takeaway (say this out loud):** "A deque is a queue and a stack at once — O(1) add/remove at both ends. It's the engine behind sliding-window max/min and 0/1-BFS."

## How it works

A deque exposes four O(1) end operations — `push_front`, `push_back`, `pop_front`, `pop_back` — plus `peek` at either end. There is **no O(1) random access**: indexing into the middle, or inserting there, is O(n). The structure is defined entirely by what it makes cheap (both ends) and what it gives up (the middle).

```
            push_front          push_back
                │                    │
                ▼                    ▼
   pop_front ◀ [ 4 | 7 | 1 | 9 | 2 ] ▶ pop_back
                ▲                    ▲
              front                back
```

Two layouts deliver O(1) both ends (detailed in [Memory layout](#memory-layout)):

- **Circular buffer** — `front` and `back` are indices that advance and **wrap** (`% capacity`); pushing front means `front = (front - 1) % cap`, pushing back means `back = (back + 1) % cap`. Nothing shifts. Cache-friendly, fixed capacity.
- **Doubly linked list of blocks** — what Python's `collections.deque` uses: a linked list of fixed-size arrays. O(1) at both ends, unbounded growth, decent locality within a block.

The deep idea: the deque doesn't add a new _capability_ over a queue so much as remove a _restriction_. A queue forbids touching the back's removal and the front's insertion; lift that and the same O(1)-ends machinery answers a whole class of "the useful element is at one end, the stale one at the other" problems — which is why the [monotonic deque](#monotonic-deque--sliding-window-maxmin-in-on) and [0/1-BFS](#01-bfs--dijkstra-free-shortest-path) live here and not on the queue page.

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

\*`collections.deque` allows `dq[i]`, but it walks from the nearest end — O(n) in the worst case (the middle), **not** the O(1) of a [dynamic array](./dynamic-array.md). If you index a deque in a loop you've picked the wrong structure.

## Complexity summary

| Operation        | Best | Average | Worst                                       |
| ---------------- | ---- | ------- | ------------------------------------------- |
| Push (either end) | O(1) | O(1)    | O(1) amortized (block alloc / ring resize)  |
| Pop (either end)  | O(1) | O(1)    | O(1)                                        |
| Peek (either end) | O(1) | O(1)    | O(1)                                        |
| Index `dq[i]`     | O(1) | O(n)    | O(n) (walks from nearest end)               |

**The `O(1)` push hides two different worst cases — know which layout you're on.** On a **block-linked deque** (`collections.deque`), a push that fills the end block triggers a single small block allocation, not a copy of the whole structure — so the worst case is genuinely O(blocksize) = O(1), and there is **no resize-pause spike** at all. On a **circular-buffer deque**, a push into a full ring forces an allocate-and-copy of every element — a true O(n) spike on that one push, amortized to O(1) only because the capacity doubles (the [dynamic-array argument](./dynamic-array.md#memory-layout)). The senior distinction: the block-linked form trades a worst-case *latency* spike for steady small allocations, which is exactly why a real-time or low-latency system prefers it over a doubling ring.

The constants differ too: the block-linked form chases a pointer **between** blocks (a cache miss at each block boundary) even though it's contiguous **within** a block, so a full traversal is slower than a contiguous array despite both being "O(n)". The ring buffer has no such boundary misses — fully contiguous — which is why bounded, cache-sensitive workloads (embedded, streaming) pick it.

**Space:** O(n) for n elements. The block-linked-list form carries a small per-block pointer overhead but packs elements within a block for locality; a circular-buffer deque is a single contiguous array with two indices and a `size` count, the tightest option when capacity is bounded.

## When to use / when not

**Reach for a deque when:**

- You need **O(1) access at both ends** — a sliding window that grows on the right and shrinks on the left, a work list you push/pop from either side, an undo/redo where both ends matter.
- You're running a **[monotonic-deque](#monotonic-deque--sliding-window-maxmin-in-on) sliding-window extremum** — window max/min in O(n), the deque's signature trick.
- You want **one structure that is both a queue and a stack** — BFS uses it as FIFO, DFS as LIFO, with no second type.
- You need **0/1-BFS** — shortest path on 0/1-weighted edges without Dijkstra's heap.

**Reach for something else when:**

- **You only ever touch one end** → a plain [stack](./stack.md) (LIFO) or [queue](./queue.md) (FIFO) states intent more clearly; the deque is a superset but a less specific signal in an interview.
- **You need random access or iteration by index** → an [array](./array.md) / [dynamic array](./dynamic-array.md). Indexing a deque is O(n); indexing an array is O(1).
- **You need priority order, not positional order** → a [heap](./heap.md). "Most urgent next" is a heap; "leftmost / rightmost next" is a deque.
- **You need the median or k-th element of the window** → a deque can't help (it only sees the ends); use two heaps or an ordered structure (see [practice problem 4](#4-sliding-window-median--why-a-deque-is-not-enough)).

Rule of thumb: **deque = both ends are cheap, the middle is not.** If the useful element is always at one of the two ends, it's a deque; if it's the largest/smallest regardless of position, it's a heap.

Real-world: `collections.deque` is the standard BFS frontier in Python, the backing store for bounded **sliding-window buffers** and **rate limiters** (drop stale entries from the front), the work-stealing **scheduler deques** in runtimes like Go and Java's ForkJoinPool (a worker pushes/pops its own end, thieves steal from the other), and the undo/redo ring in editors.

## Comparison

| Structure             | Add            | Remove         | Random access | Order       | Memory               | Pick it when…                            |
| --------------------- | -------------- | -------------- | ------------- | ----------- | -------------------- | ---------------------------------------- |
| **Deque**             | **O(1) both**  | **O(1) both**  | O(n)          | positional  | ring / block-list    | both ends cheap, sliding-window extremes |
| Queue                 | O(1) back      | O(1) front     | no            | FIFO        | ring / +ptr          | arrival order, BFS, buffering            |
| Stack                 | O(1) top       | O(1) top       | no            | LIFO        | array slack / +ptr   | nesting, undo, DFS                       |
| Dynamic array         | O(1)\* back    | O(1) back, O(n) front | **O(1)** | by index    | contiguous, tight    | random access, iteration, append-heavy  |
| Priority queue (heap) | O(log n)       | O(log n) min/max | no          | priority    | array, complete tree | "most urgent next", Dijkstra             |

The deque's identity is **both ends in O(1), middle in O(n)** — it strictly generalizes queue and stack (each restricts the deque to one discipline) while giving up the array's O(1) random access. Reach past it to a dynamic array the moment you need indexing, to a heap the moment "best" means priority rather than position.

## Variants

- **Circular-buffer deque** — fixed-capacity ring with wrapping `front`/`back` indices; O(1) both ends, cache-friendly, no shifting. The bounded-capacity choice; built in [practice problem 2](#2-design-circular-deque--ring-buffer-both-ends).
- **Doubly-linked-list deque** — a node with prev/next pointers per element; O(1) both ends, unbounded, at pointer-overhead + cache-miss cost. The textbook unbounded form.
- **Block-linked deque** — a linked list of fixed-size arrays (blocks), blending the two: O(1) ends, unbounded, with locality within a block. This is what `collections.deque` actually is.
- **Bounded deque (`deque(maxlen=k)`)** — a ring that **evicts from the opposite end** on overflow. `deque(maxlen=k)`: appending to a full deque drops the front automatically. The one-liner sliding-window-of-last-k buffer, and a rate-limiter primitive.
- **Monotonic deque** — a deque kept increasing or decreasing to answer window min/max in O(n). A _discipline_ on a deque, not a new structure; full treatment in [CP-primitives](#monotonic-deque--sliding-window-maxmin-in-on).
- **Output-restricted / input-restricted deque** — theoretical variants allowing insertion or removal at only one end. Rarely used in practice; named for completeness because interviews occasionally cite the taxonomy.

## Memory layout

The deque's whole difficulty is **O(1) at _both_ ends simultaneously** — the queue solved one-end-each, the deque must keep both ends cheap at once. Two layouts manage it; both avoid the O(n) shift that a naive front-at-0 array would force on every `push_front`.

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

- **Cache-friendly** (contiguous), no per-element pointer overhead — the tightest layout when capacity is bounded (embedded, streaming, fixed windows).
- Capacity is fixed; growing means allocate-and-copy, amortized O(1) like a [dynamic array](./dynamic-array.md#memory-layout).
- The empty-vs-full ambiguity at `front == back` is resolved by tracking `size` explicitly (same trap as the [circular queue](./queue.md#memory-layout)).

**The block-linked layout (scattered blocks, unbounded).** A doubly linked list of fixed-size arrays (blocks). Both ends point at a block; pushing appends within the end block, allocating a new block only when the end block fills. This is `collections.deque`'s real implementation.

```
block-linked deque (CPython's collections.deque):

   leftblock                          rightblock
   [ _ | _ | 4 | 7 ] ◀──▶ [ 1 | 9 | 2 | _ ] ◀──▶ ...
         ▲front                         ▲back
   push_front fills leftward in the left block, allocates a new
   block on the left when it's full — O(1) amortized, never a full copy
```

- **No resize spike** (a new block is one small allocation, not a copy of everything) — unbounded, with locality _within_ a block but pointer hops _between_ blocks.
- This is why `collections.deque` is the reflexive Python choice: O(1) both ends, no capacity to manage, no `list.pop(0)` O(n) trap.

**Which to pick:** `collections.deque` for essentially everything in Python; a circular-buffer deque when capacity is bounded and you want one contiguous cache-friendly array (and you're implementing it yourself, e.g. in C++ or for a `Design Circular Deque` problem).

## Implementation

A circular-buffer deque — the version that shows the both-ends wrapping arithmetic. Pseudocode is the contract; Python gives the from-scratch ring plus the `collections.deque` you'd actually reach for.

**Pseudocode (CLRS-style contract, ring of capacity `cap`):**

```
PUSH-FRONT(D, x)
1   if D.size == D.cap
2       error "overflow"
3   D.front = (D.front − 1 + D.cap) mod D.cap   ▷ walk front backward, wrap
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

**Python (reference — idiomatic ring):**

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
        self._front = (self._front - 1) % self._cap      # walk front back, wrap
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

**Contest velocity — `collections.deque`, never hand-roll under time pressure:**

```python
from collections import deque

dq = deque()         # or deque(iterable), or deque(maxlen=k) for a bounded ring
dq.append(x)         # push back   — O(1)
dq.appendleft(x)     # push front  — O(1)
dq.pop()             # pop back    — O(1)
dq.popleft()         # pop front   — O(1)
front, back = dq[0], dq[-1]          # peek both ends — O(1)
dq.rotate(k)         # rotate right by k — O(k), handy for cyclic problems
# deque(maxlen=k): appending when full evicts the OPPOSITE end automatically
```

## CP-primitives

The deque's contest leverage is two linear-time shortcuts that a queue or stack alone can't give: sliding-window extremes and a heap-free shortest path on 0/1 graphs.

### Monotonic deque — sliding-window max/min in O(n)

To get the maximum of every window of size `k`, keep a deque of **indices** whose values are strictly decreasing. Before pushing `i`, pop smaller-or-equal values off the **back** (they can never be the max while `nums[i]` is in the window); pop the **front** when its index slides out of the window. The front index is always the current window max. Each index is pushed and popped at most once → **O(n)** for all windows, beating the O(n·k) brute force and the O(n log n) heap.

```python
from collections import deque

def max_sliding_window(nums: list[int], k: int) -> list[int]:
    dq: deque[int] = deque()              # indices, values decreasing
    res = []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:   # back: drop dominated values
            dq.pop()
        dq.append(i)
        if dq[0] == i - k:                # front: index slid out of window
            dq.popleft()
        if i >= k - 1:
            res.append(nums[dq[0]])       # front = window max
    return res
```

**Why for CP:** collapses sliding-window extremum from O(n·k) / O(n log n) to **O(n)**. It's the deque cousin of the [monotonic stack](./stack.md#monotonic-stack--next-greatersmaller-element) and the core of the [sliding window](../patterns/sliding-window.md) pattern. Flip the comparison (`>=`) for window-min.

### 0/1-BFS — Dijkstra-free shortest path

When every edge weight is **0 or 1**, you don't need Dijkstra's heap. Use a deque: relax a 0-weight edge with **`appendleft`** (same distance — process it next, before any distance-+1 node) and a 1-weight edge with **`append`** (distance + 1 — process later). The deque stays sorted by distance automatically, so the first time you pop a node its distance is final → **O(V + E)**, beating Dijkstra's O(E log V).

```python
from collections import deque

def zero_one_bfs(graph, source, n):       # graph[u] = [(v, w in {0, 1}), ...]
    INF = float("inf")
    dist = [INF] * n
    dist[source] = 0
    dq = deque([source])
    while dq:
        u = dq.popleft()
        for v, w in graph[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                dq.appendleft(v) if w == 0 else dq.append(v)
    return dist
```

**Why for CP:** shortest path on 0/1-weighted graphs (grid problems with "free" vs "cost-1" moves, or "minimum walls to break") in **linear time**, no priority queue — a frequent contest shortcut over [Dijkstra](../algorithms/dijkstra.md). The deque's two ends encode the two possible distances.

## Gotchas / edge cases

- **Indexing a deque is O(n), not O(1).** `collections.deque` supports `dq[i]`, but it walks from the nearest end — innocuous-looking, O(n) in the middle, O(n²) in a loop. If you find yourself indexing a deque repeatedly you wanted a [dynamic array](./dynamic-array.md). The senior trap: the API permits `dq[i]`, so the cost is invisible until it TLEs.
- **Empty-deque underflow.** `pop`/`popleft`/`dq[0]` on an empty deque raises `IndexError`. Guard `while dq` / `if dq`; a stray `popleft()` after a BFS loop ends crashes.
- **Monotonic deque: indices vs values, and `<` vs `<=`.** Store **indices** (not values) so you can detect when the front slides out of the window. The comparison strictness (`<` vs `<=` when popping the back) decides duplicate handling — get it wrong and equal elements are dropped or double-counted. Same subtle bug as the [monotonic stack](./stack.md).
- **Full ring buffer: empty vs full at `front == back`.** With wrapping indices, `front == back` is ambiguous (empty _or_ full). Track an explicit `size` count (as the implementation does) or leave one slot always empty — otherwise you silently drop or duplicate elements.
- **`deque(maxlen=k)` evicts the _opposite_ end (CP-flavored trap).** Appending to a full bounded deque drops from the front; `appendleft` drops from the back. Convenient for last-k windows, but the silent eviction bites if you assumed it would refuse or grow.
- **Reaching for a deque when a heap is needed.** A deque only sees its two ends — it cannot give you the window median or k-th largest. Sliding-window _max_ is a monotonic deque; sliding-window _median_ needs two heaps. Misreading "extremum" as "any order statistic" is the classic over-reach.

## Practice problems

Four staples, each a **distinct** deque technique — no two solved the same way.

### 1. Sliding Window Maximum — _monotonic deque_

**Problem.** Given an array `nums` and window size `k`, return the maximum of each contiguous window. E.g. `nums=[1,3,-1,-3,5,3,6,7], k=3` → `[3,3,5,5,6,7]`. Constraints: `n ≤ 10⁵`, so O(n·k) brute force and even O(n log n) heaps are on the edge — O(n) is the intended bound.

**Approach.** A **decreasing monotonic deque of indices**: pop smaller values off the back before pushing `i`, pop the front when it leaves the window; the front index is always the window max. Each index enters and leaves once → O(n). This is the deque's signature primitive in its canonical problem.

```python
from collections import deque

def max_sliding_window(nums: list[int], k: int) -> list[int]:
    dq: deque[int] = deque()
    res = []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] == i - k:                # front slid out of the window
            dq.popleft()
        if i >= k - 1:
            res.append(nums[dq[0]])
    return res
```

**Complexity.** O(n) time, O(k) space. Pattern: [Sliding Window](../patterns/sliding-window.md).

### 2. Design Circular Deque — _ring buffer, both ends_

**Problem.** Design a fixed-capacity deque with `insertFront`, `insertLast`, `deleteFront`, `deleteLast`, `getFront`, `getRear`, `isEmpty`, `isFull` — all O(1).

**Approach.** A fixed array with a `front` index and a `size` count; the back slot is `(front + size) % cap`. `insertFront` walks `front` backward with wrap; `insertLast` writes the back slot. Tracking `size` explicitly resolves the empty-vs-full ambiguity. This makes the ring-buffer layout concrete and exercises both-end wrapping arithmetic — distinct from the monotonic-deque technique.

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

**Complexity.** O(1) per operation, O(k) space. See [Circular Buffer](./circular-buffer.md).

### 3. Shortest Subarray with Sum at Least K — _monotonic deque on prefix sums_

**Problem.** Given an integer array `nums` (values may be **negative**) and integer `k`, return the length of the shortest non-empty contiguous subarray with sum ≥ `k`, or -1. Constraints: `n ≤ 10⁵`; negatives rule out the simple two-pointer sliding window that works for all-positive arrays.

**Approach.** Build [prefix sums](../patterns/prefix-sum.md) `P`, where subarray `(i, j]` has sum `P[j] - P[i]`. For each `j` we want the smallest window, so the closest earlier `i` with `P[i] ≤ P[j] - k`. Keep an **increasing monotonic deque of prefix-sum indices**: pop the front while `P[j] - P[deque.front] ≥ k` (record the length — it can't help a later `j` better), and pop the back while `P[j] ≤ P[deque.back]` (a later, smaller prefix dominates). This is the monotonic deque applied to prefix sums rather than raw values — a distinct twist from problem 1, and the canonical "monotonic deque handles negatives where two-pointer can't" problem.

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

**Complexity.** O(n) time, O(n) space. Pattern: [Prefix Sum](../patterns/prefix-sum.md) + monotonic deque.

### 4. Sliding Window Median — _why a deque is **not** enough_

**Problem.** Return the median of every window of size `k`. E.g. `nums=[1,3,-1,-3,5,3,6,7], k=3` → `[1,-1,-1,3,5,6]`. Constraints: `n ≤ 10⁵`.

**Approach.** This problem looks like Sliding Window Maximum but a deque **cannot** solve it — a deque only exposes its two ends, and the median is an interior order statistic, not an extremum. The fix is **two heaps** (a max-heap for the lower half, a min-heap for the upper half) kept balanced, with lazy deletion of out-of-window elements. The teaching point: recognize when "sliding window + order statistic" exceeds the deque's reach and demands a [heap](./heap.md)-based structure instead — the distinct technique here is knowing the deque's limit.

```python
import heapq

def median_sliding_window(nums: list[int], k: int) -> list[float]:
    small: list[int] = []                 # max-heap (negated) — lower half
    large: list[int] = []                 # min-heap            — upper half
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

**Complexity.** O(n log k) time, O(k) space. Pattern: [Top-K / two-heaps](../patterns/top-k-elements.md) — the counterexample that defines the deque's boundary.
