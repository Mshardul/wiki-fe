# Circular Buffer

## Prerequisites

- [Array](./array.md) [Must read]
- **Modular arithmetic** [Must read]

## Table of Contents

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
- [Gotchas / edge cases](#gotchas--edge-cases)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

## What it is

A **circular buffer** (ring buffer) is a fixed-size array treated as if its ends were joined into a ring: when an index runs off the end, it wraps back to 0 via `% capacity`. Two pointers - **head** (read) and **tail** (write) - chase each other around the ring, giving O(1) enqueue and dequeue at both ends with **zero shifting and zero reallocation**.

Mental model: **a revolving sushi conveyor belt with a fixed number of plates.** Chefs add plates at the tail; diners take them from the head; both move in the same direction around the loop. Nobody renumbers the belt - when the tail reaches the last slot, the next plate goes back to slot 0.

> **Takeaway (say this out loud):** "A ring buffer is a fixed array with head and tail indices that wrap via modulo - O(1) push and pop at both ends, no shifting, perfect for a fixed-capacity FIFO or a sliding window over a stream."

## How it works

Keep a fixed array of `capacity` slots plus two indices:

- **head** - index of the next element to read (front of the queue).
- **tail** - index of the next free slot to write.

Enqueue writes at `tail`, then advances `tail = (tail + 1) % capacity`. Dequeue reads at `head`, then advances `head = (head + 1) % capacity`. The modulo is what makes the array "circular" - no element ever moves.

```
capacity 6.  head=1 (read here), tail=4 (write here):

 index:   0     1     2     3     4     5
        +-----+-----+-----+-----+-----+-----+
        |     |  A  |  B  |  C  |     |     |
        +-----+-----+-----+-----+-----+-----+
               ▲head             ▲tail

enqueue(D): write at tail=4, tail → 5
        +-----+-----+-----+-----+-----+-----+
        |     |  A  |  B  |  C  |  D  |     |
        +-----+-----+-----+-----+-----+-----+
               ▲head                   ▲tail

…three more enqueues later tail wraps 5 → 0:
        +-----+-----+-----+-----+-----+-----+
        |  G  |  A  |  B  |  C  |  D  |  E  |   (tail wrapped to 0 after writing F at 5)
        +-----+-----+-----+-----+-----+-----+
         ▲tail  ▲head
```

**Full vs empty are the hard part.** Both states can show `head == tail`. Two standard fixes: (a) keep an explicit **count** of elements, or (b) **waste one slot** so "full" means `(tail + 1) % capacity == head` and "empty" means `head == tail`. The count approach is clearer; the wasted-slot approach saves a field. This article uses an explicit count.

## Operations

| Operation               | Time | Space |
| ----------------------- | ---- | ----- |
| Enqueue (push back)     | O(1) | O(1)  |
| Dequeue (pop front)     | O(1) | O(1)  |
| Peek front / back       | O(1) | O(1)  |
| `is_empty` / `is_full`  | O(1) | O(1)  |
| Access by logical index | O(1) | O(1)  |
| Search                  | O(n) | O(1)  |

Every core operation is true O(1) - no amortization, no resize, no shift. That worst-case guarantee is the buffer's whole reason to exist.

## Complexity summary

| Operation | Best               | Average | Worst |
| --------- | ------------------ | ------- | ----- |
| Enqueue   | O(1)               | O(1)    | O(1)  |
| Dequeue   | O(1)               | O(1)    | O(1)  |
| Peek      | O(1)               | O(1)    | O(1)  |
| Search    | O(1) (first match) | O(n)    | O(n)  |

No best/average/worst split for the core ops - that's the point. Unlike a [Dynamic Array](./dynamic-array.md), there's no hidden O(n) resize lurking in the worst case.

**Space:** O(capacity), fixed at construction. The buffer never grows, so memory is bounded and predictable - the property that makes it safe for real-time and embedded systems.

## When to use / when not

**Reach for a circular buffer when:**

- You need a **fixed-capacity FIFO queue** with hard O(1) guarantees - producer/consumer pipelines, task queues, request buffers.
- You're holding a **sliding window over a stream** - last N samples, last N log lines, a rate-limiter's recent timestamps.
- **Worst-case latency must be bounded** - real-time audio/video, embedded, kernel ring buffers. No resize spike, ever.

**Reach for something else when:**

- **The collection must grow unbounded** → a [Dynamic Array](./dynamic-array.md) or linked-list-backed queue; a ring buffer's capacity is fixed and overflow forces a policy decision (drop or overwrite).
- **You need random insert/delete in the middle** → a ring buffer is FIFO-shaped; arbitrary splices aren't its job.
- **You want a simple growable stack/queue and don't care about latency spikes** → a plain dynamic array is less fiddly (no wraparound index math).

Rule of thumb: **fixed capacity + FIFO + must-not-spike → ring buffer.** Unbounded growth → don't.

## Comparison

| Structure | Enqueue/Dequeue | Space | Resize spike | Ordering | Pick it when… |
| --- | --- | --- | --- | --- | --- |
| **Circular buffer** | O(1) worst-case, both ends | O(capacity), fixed | Never | FIFO | Fixed-capacity FIFO with hard latency bounds - crossover: any workload where a resize pause is unacceptable, regardless of size |
| [Dynamic Array](./dynamic-array.md) (as queue via `.pop(0)`) | O(n) dequeue from front | O(n), grows | Yes - 2x transient during grow | FIFO (but O(n) dequeue) | Never for a queue - front-removal is O(n); only fine as a growable stack (`.append`/`.pop()` at the back) |
| [Linked List](./linked-list.md)-backed queue | O(1) both ends | O(n), grows | No single spike, but per-node allocation overhead | FIFO | Unbounded growth needed and per-node allocation cost (~2-3x more memory per element than a packed array) is acceptable |
| [Deque](./deque.md) (dynamic, e.g. `collections.deque`) | O(1) amortized both ends | O(n), grows in blocks | Smaller, chunked (block allocation, not doubling) | FIFO or LIFO | Need unbounded growth **and** O(1) both-end ops - the general-purpose default when capacity isn't known upfront |

**Crossover condition:** a circular buffer beats a growable deque only when the **capacity ceiling is a real, known requirement** (bounded memory, bounded latency) - once growth is genuinely unbounded, a circular buffer's fixed capacity becomes a liability (drop-or-block policy needed) rather than a feature, and `collections.deque` wins on flexibility with only a small constant-factor cost from its block-based (not single-array) allocation.

## Variants

- **Overwriting (lossy) ring buffer.** When full, enqueue **overwrites the oldest** element and advances `head` too. This is the classic "last N" log/telemetry buffer - newest data always wins. Non-overwriting buffers instead reject or block on full.
- **Power-of-two capacity.** Fix capacity to a power of two and replace `% capacity` with `& (capacity - 1)` - a bitmask, faster than modulo. Common in high-performance and lock-free implementations (e.g. the LMAX Disruptor).
- **Lock-free single-producer/single-consumer (SPSC) ring.** With one writer and one reader, head and tail can be updated without locks using memory barriers - a staple of low-latency messaging.
- **Double-ended (deque on a ring).** Allow push/pop at both head and tail for an O(1) fixed-capacity deque.

## Memory layout

**Contiguous and fixed - the source of its guarantees.** Storage is a single array block, allocated once. Elements never move; only the two index integers change. Logical order ("oldest to newest") is _decoupled_ from physical order - element 0 of the queue may sit anywhere in the block, wherever `head` points.

```
physical block (capacity 6), logically [C, D, E, F, G] oldest→newest:

 index:   0     1     2     3     4     5
        +-----+-----+-----+-----+-----+-----+
        |  G  |     |  C  |  D  |  E  |  F  |
        +-----+-----+-----+-----+-----+-----+
         ▲tail head▲ ▲─── logical order wraps around ───▲
```

**Cache behavior.** Same contiguity benefit as a plain array - sequential producer/consumer access streams through cache lines well. The wraparound point causes one non-sequential jump per lap, negligible in practice.

**No resize, ever.** Unlike a dynamic array, there is no doubling, no copy, no transient 2× memory. Allocate `capacity` slots up front; memory is constant and known at compile time - exactly why kernels and embedded systems use ring buffers where a heap allocation mid-operation would be unacceptable.

## Implementation

Fixed backing array + head, tail, count. Core ops: `enqueue`, `dequeue` - both pure index arithmetic.

**Pseudocode (CLRS-style contract):**

```
CIRCULAR-ENQUEUE(R, x)
1   if R.count == R.capacity
2       error "buffer full"                       ▷ or overwrite head (lossy variant)
3   R.data[R.tail] = x
4   R.tail = (R.tail + 1) mod R.capacity
5   R.count = R.count + 1

CIRCULAR-DEQUEUE(R)
1   if R.count == 0
2       error "buffer empty"
3   x = R.data[R.head]
4   R.data[R.head] = NIL                            ▷ release reference
5   R.head = (R.head + 1) mod R.capacity
6   R.count = R.count − 1
7   return x
```

**Python (reference - idiomatic):**

```python
from typing import TypeVar, Generic, Iterator

T = TypeVar("T")


class CircularBuffer(Generic[T]):
    """Fixed-capacity ring buffer with explicit count for full/empty."""

    def __init__(self, capacity: int) -> None:
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self._data: list[T | None] = [None] * capacity
        self._capacity = capacity
        self._head = 0
        self._tail = 0
        self._count = 0

    def __len__(self) -> int:
        return self._count

    def is_full(self) -> bool:
        return self._count == self._capacity

    def is_empty(self) -> bool:
        return self._count == 0

    def enqueue(self, x: T) -> None:
        if self.is_full():
            raise OverflowError("circular buffer is full")
        self._data[self._tail] = x
        self._tail = (self._tail + 1) % self._capacity
        self._count += 1

    def dequeue(self) -> T:
        if self.is_empty():
            raise IndexError("dequeue from empty buffer")
        x = self._data[self._head]
        self._data[self._head] = None  # release reference for GC
        self._head = (self._head + 1) % self._capacity
        self._count -= 1
        return x  # type: ignore[return-value]

    def __iter__(self) -> Iterator[T]:
        # logical (oldest → newest) order, not physical
        return (
            self._data[(self._head + i) % self._capacity]  # type: ignore[misc]
            for i in range(self._count)
        )
```

Note Python's standard library gives you this for free: `collections.deque(maxlen=N)` is a fixed-capacity ring buffer with overwrite-on-full - reach for it in real code, implement the above to show you understand the mechanism in an interview.

## CP-primitives

- **Fixed-window rolling aggregate.** Keep a ring buffer of the last `k` values plus a running sum/min/max maintained incrementally on enqueue/overwrite - turns "aggregate of the last k elements" from an O(k) rescan per step into O(1) amortized per step. The classic use: streaming moving average, or a fixed-size monotonic structure layered on top (see [Monotonic Queue](../patterns/monotonic-queue.md) for the sliding-window-max variant of this idea).

  ```python
  class RollingSum:
      def __init__(self, k: int) -> None:
          self.buf = CircularBuffer(k)
          self.total = 0

      def add(self, x: int) -> int:
          if self.buf.is_full():
              self.total -= self.buf.dequeue()   # evict oldest before adding
          self.buf.enqueue(x)
          self.total += x
          return self.total
  ```

  **Why for CP:** collapses the naive "sum the last k elements every step" from O(n·k) total to O(n) total across a whole stream - the ring buffer's O(1) evict-oldest is what makes the running total maintainable incrementally.

- **Two-buffer bit-reversal / rotation trick.** For problems needing a fixed-size circular scan starting at an arbitrary offset (e.g. "rotate array by k, then process"), index into the buffer via `(start + i) % capacity` instead of physically rotating the underlying array - avoids an O(n) rotation entirely when the buffer is already ring-shaped.

  **Why for CP:** replaces an O(n) array-rotate-then-scan with O(1) offset arithmetic per access - relevant whenever a problem's "rotate the array" framing is really just "start scanning from a different logical origin."

## Gotchas / edge cases

- **Full vs empty ambiguity.** Both can satisfy `head == tail`. Forgetting to disambiguate (via a count or a wasted slot) is _the_ classic ring-buffer bug - you'll dequeue from an empty buffer or silently drop a write. State your choice explicitly.
- **Off-by-one in wraparound.** `(tail + 1) % capacity` not `tail % capacity`; advance the pointer _after_ the read/write, not before. A single misplaced `+1` corrupts ordering. Trace one full lap on paper.
- **Overflow policy is a design decision, not a default.** On full, do you reject, block, or overwrite the oldest? Each is correct for a different use case (queue vs telemetry buffer). Saying "it's full" without naming the policy is an incomplete answer.
- **`%` on negative indices.** If a variant decrements an index (deque on a ring), `-1 % capacity` is `capacity - 1` in Python but _implementation-defined / negative_ in C and Java. Add `capacity` before the modulo in those languages: `(i - 1 + capacity) % capacity`.
- **Iteration order ≠ storage order.** Iterating the raw backing array gives physical order, which is meaningless. Always iterate logically from `head` for `count` steps.

## What the interviewer probes for

- **"Why not just use `collections.deque` with no `maxlen`?"** - Without `maxlen`, a deque grows unbounded, defeating the entire point of a ring buffer (bounded memory, no drop/overwrite policy needed). With `maxlen=N` set, Python's `deque` *is* a circular buffer under the hood - the interview signal is knowing when the fixed-capacity behavior is required by the problem (a rate limiter must bound memory) versus incidental.
- **"What happens under concurrent producers and consumers?"** - The single-count-field version here isn't thread-safe (a race between `is_full()` check and `enqueue()`'s write is a classic TOCTOU bug). Production concurrent ring buffers use atomic CAS on head/tail (lock-free SPSC, see Variants) or a mutex around the whole structure for MPMC; interview answer should name the race, not just say "add a lock."
- **"How would this scale to a 10 GB buffer that doesn't fit in one process's memory?"** - A single-process ring buffer caps out at available RAM; beyond that, the pattern generalizes to a **distributed ring** (Kafka partitions are conceptually a disk-backed, replicated circular buffer per partition, with head/tail becoming the consumer offset and the log-end offset). Naming Kafka's partition log as "ring buffer at scale" is the senior answer here.

## Practice problems

### 1. Design Circular Queue

**Problem.** Design a fixed-size circular queue supporting `enQueue(value)`, `deQueue()`, `Front()`, `Rear()`, `isEmpty()`, and `isFull()`, all in O(1), backed by a fixed-capacity array.

**Worked examples:**
- **Example 1**
  - **Input:** `MyCircularQueue(3)`, `enQueue(1)`, `enQueue(2)`, `enQueue(3)`, `enQueue(4)`, `Rear()` | **Output:** `true, true, true, false, 3`
  - **Explanation:** capacity 3 fills after three enqueues; the fourth `enQueue(4)` fails (`isFull()` is true), so `Rear()` still reports 3, the last successfully-inserted element.
- **Example 2**
  - **Input:** `MyCircularQueue(2)`, `enQueue(1)`, `enQueue(2)`, `deQueue()`, `enQueue(3)`, `Front()` | **Output:** `true, true, true, true, 3`
  - **Explanation:** after dequeuing 1, one slot frees up; enqueuing 3 wraps into that freed slot, and `Front()` now reports 2's successor in the queue... concretely the remaining logical order is [2, 3], so `Front()` returns 2 - matches the head-pointer semantics traced in How it works.

**Constraints:** `1 ≤ k ≤ 1000`, `0 ≤ value ≤ 1000`, at most `3000` calls to `enQueue`, `deQueue`, `Front`, `Rear`, `isEmpty`, `isFull` combined.

**Approach:** Direct application of this page's `CircularBuffer` - `enQueue`/`deQueue` map straight to `enqueue`/`dequeue`, guarded by `isFull()`/`isEmpty()` instead of raising, since LeetCode's API returns a bool rather than throwing. This is the canonical version of the structure itself, so the "approach" *is* the article's Implementation section.

```python
class MyCircularQueue:
    def __init__(self, k: int) -> None:
        self.buf = CircularBuffer(k)

    def enQueue(self, value: int) -> bool:
        if self.buf.is_full():
            return False
        self.buf.enqueue(value)
        return True

    def deQueue(self) -> bool:
        if self.buf.is_empty():
            return False
        self.buf.dequeue()
        return True

    def Front(self) -> int:
        return -1 if self.buf.is_empty() else self.buf._data[self.buf._head]

    def Rear(self) -> int:
        if self.buf.is_empty():
            return -1
        last = (self.buf._tail - 1) % self.buf._capacity
        return self.buf._data[last]

    def isEmpty(self) -> bool:
        return self.buf.is_empty()

    def isFull(self) -> bool:
        return self.buf.is_full()
```

**Complexity:** O(1) time for every operation, O(k) space.

**Duplicate problems:**
- Design Circular Deque (LC 641) - identical shape with insert/remove at both ends instead of just front/back; the Double-ended variant from Variants.
- Design a Stack With Increment Operation (LC 1381) - different structure (stack, not ring), but the same "wrap a fixed-capacity array with bounds-checked ops" design pattern.

### 2. Design Hit Counter

**Problem.** Design a hit counter that counts hits received in the past 5 minutes (300 seconds). `hit(timestamp)` records a hit at the given second; `getHits(timestamp)` returns the number of hits in `[timestamp - 299, timestamp]`. Timestamps arrive in non-decreasing order across calls.

**Worked examples:**
- **Example 1**
  - **Input:** `hit(1)`, `hit(2)`, `hit(3)`, `getHits(4)` | **Output:** `3`
  - **Explanation:** all three hits (at 1, 2, 3) fall within `[4-299, 4] = [-295, 4]`, so the count is 3.
- **Example 2**
  - **Input:** `hit(1)`, `hit(2)`, `hit(3)`, `getHits(4)`, `hit(300)`, `getHits(300)`, `getHits(301)` | **Output:** `3, 4, 3`
  - **Explanation:** at `getHits(300)`, hit at t=1 is still within `[1, 300]`, so all 4 hits count; at `getHits(301)`, the window becomes `[2, 301]` and the hit at t=1 ages out, leaving 3.

**Constraints:** `1 ≤ timestamp ≤ 2 × 10⁹`, calls to `hit` are in non-decreasing timestamp order, at most `300` calls to `hit` and `getHits` combined.

**Approach:** A ring buffer of size 300, indexed by `timestamp % 300`, storing `(timestamp, count)` per slot - each slot represents "the count of hits that landed on this second, the last time this second-of-cycle was used." On `hit`, if the slot's stored timestamp doesn't match the current timestamp, the slot is stale (from ≥300 seconds ago) and gets overwritten with count 1; otherwise increment. `getHits` sums every slot whose stored timestamp falls within the 300-second window - this is the overwriting-ring-buffer variant applied to a fixed time window rather than a fixed element count.

```python
class HitCounter:
    def __init__(self) -> None:
        self.window = 300
        self.times = [0] * self.window
        self.counts = [0] * self.window

    def hit(self, timestamp: int) -> None:
        idx = timestamp % self.window
        if self.times[idx] != timestamp:
            self.times[idx] = timestamp
            self.counts[idx] = 1
        else:
            self.counts[idx] += 1

    def getHits(self, timestamp: int) -> int:
        total = 0
        for i in range(self.window):
            if timestamp - self.times[i] < self.window:
                total += self.counts[i]
        return total
```

**Complexity:** O(1) for `hit`, O(window) = O(300) = O(1) for `getHits` (fixed window size, not input-dependent), O(window) space.

**Duplicate problems:**
- Moving Average from Data Stream (below) - same fixed-window-over-a-stream shape, simpler because it tracks a raw value sum instead of per-second hit counts.
- Logger Rate Limiter (LC 359) - same "has this key been seen in the last N seconds" ring-buffer-of-timestamps idea, keyed by message instead of aggregated globally.

### 3. Moving Average from Data Stream

**Problem.** Given a stream of integers and a window size `size`, calculate the moving average of all integers in the sliding window, one new value at a time.

**Worked examples:**
- **Example 1**
  - **Input:** `MovingAverage(3)`, `next(1)`, `next(10)`, `next(3)`, `next(5)` | **Output:** `1.0, 5.5, 4.666..., 6.0`
  - **Explanation:** window fills to `[1]` → avg 1.0, `[1,10]` → avg 5.5, `[1,10,3]` → avg 4.67; once full, `next(5)` evicts 1, window becomes `[10,3,5]` → avg 6.0.
- **Example 2**
  - **Input:** `MovingAverage(1)`, `next(5)`, `next(9)` | **Output:** `5.0, 9.0`
  - **Explanation:** window size 1 means every `next` call immediately evicts the previous value - the "moving average" degenerates to "the last value seen."

**Constraints:** `1 ≤ size ≤ 1000`, `-10⁵ ≤ val ≤ 10⁵`, at most `10⁴` calls to `next`.

**Approach:** This is the [CP-primitives](#cp-primitives) rolling-sum ring buffer applied directly - maintain a fixed-capacity ring of the last `size` values plus a running `total`; on each `next`, evict-and-subtract the oldest value if the buffer is full, then enqueue-and-add the new one, and return `total / len(buffer)`. O(1) per call regardless of window size, versus O(size) if the window were rescanned every time.

```python
class MovingAverage:
    def __init__(self, size: int) -> None:
        self.buf = CircularBuffer(size)
        self.total = 0

    def next(self, val: int) -> float:
        if self.buf.is_full():
            self.total -= self.buf.dequeue()
        self.buf.enqueue(val)
        self.total += val
        return self.total / len(self.buf)
```

**Complexity:** O(1) per `next` call, O(size) space.

**Duplicate problems:**
- Design Hit Counter (above) - same fixed-window-over-a-stream shape, generalized to per-second bucketing instead of a raw running sum.
- Sliding Window Average of All Subarrays of Size K (variant framing) - identical mechanic applied to a static array instead of a live stream.

### 4. Design a Rate Limiter

**Problem.** Design a rate limiter that allows at most `N` requests per client within any rolling `T`-second window, rejecting requests over the limit. `allow(client_id, timestamp)` returns whether the request is permitted.

**Worked examples:**
- **Example 1**
  - **Input:** N=2, T=10, `allow("A", 1)`, `allow("A", 3)`, `allow("A", 5)` | **Output:** `true, true, false`
  - **Explanation:** first two requests at t=1,3 are within the limit; the third at t=5 would be the 3rd request within the last 10 seconds (all three fall in `[t-10, t]`), exceeding N=2, so it's rejected.
- **Example 2**
  - **Input:** N=1, T=5, `allow("A", 1)`, `allow("A", 7)` | **Output:** `true, true`
  - **Explanation:** the request at t=7 looks back only to t=2 (`7-5`); the request at t=1 has already aged out of the window, so the client effectively has a fresh quota.

**Constraints:** up to `10⁴` distinct clients, up to `10⁵` total `allow` calls, `1 ≤ N ≤ 1000`, `1 ≤ T ≤ 3600`.

**Approach:** Per-client ring buffer of the last `N` request timestamps (sliding-window log algorithm). On each request, evict timestamps older than `timestamp - T` from the front of the ring (they're in sorted order since requests arrive in non-decreasing time per client), then check if the ring has room for one more within the window - if `len(ring) < N` after eviction, allow and enqueue; otherwise reject. This is a bounded-size variant of the general "sliding window log" rate-limiting algorithm, capped at O(N) memory per client instead of unbounded log growth.

```python
from collections import defaultdict

class RateLimiter:
    def __init__(self, n: int, window: int) -> None:
        self.n = n
        self.window = window
        self.history: dict[str, CircularBuffer] = defaultdict(lambda: CircularBuffer(n))

    def allow(self, client_id: str, timestamp: int) -> bool:
        buf = self.history[client_id]
        while not buf.is_empty() and timestamp - buf._data[buf._head] >= self.window:
            buf.dequeue()
        if len(buf) < self.n:
            buf.enqueue(timestamp)
            return True
        return False
```

**Complexity:** O(1) amortized per `allow` call (each timestamp is enqueued once and dequeued at most once), O(N) space per client.

**Duplicate problems:**
- Design a Logger Rate Limiter (LC 359) - simpler single-timestamp-per-key version of the same eviction idea, no count threshold.
- Design Hit Counter (above) - same bounded-recent-history shape, aggregated as a count rather than gated as an allow/reject decision.
