# LRU Cache

## Prerequisites

- **Big-O Notation** [Must read] - every operation here is sold as **O(1)**; you can't judge an LRU cache without the cost model that makes "O(1) get _and_ O(1) eviction" the whole point. <!-- U9: not-yet-written target — wire to `algorithms/big-o-notation.md` once that page exists. -->
- [Hash Table](./hash-table.md) [Must read] - the map half of the design. The cache leans entirely on average-O(1) lookup to find a key's node without scanning; if you don't trust hashing's cost model, the LRU O(1) claim looks like magic.
- [Doubly Linked List](./linked-list.md) [Must read] - the recency half. O(1) splice-out and move-to-front at a **known node** is exactly what a doubly linked list gives and a singly list does not. Read its pointer-rewiring and dummy-node sections first.
- [Hash Set](./hash-set.md) [Should read] - the membership intuition (key present or not) that the map's `key → node` lookup generalizes.

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
- [Practice problems](#practice-problems)

## What it is

An **LRU (Least Recently Used) cache** is a fixed-capacity key→value store that, when full, evicts the key that was accessed longest ago. It answers two questions in O(1): _"what's the value for key k?"_ and _"who do I throw out to make room?"_

The mental model: **a stack of plates you always take from and return to the top.** Every time you touch a plate (read or write), it goes back on top; when you need space, you remove the bottom plate — the one nobody has touched in the longest time. The trick that makes it interview-famous is doing _both_ the lookup and the "find the bottom plate" in O(1), which a single structure can't — so you bolt two together.

> **Soundbite:** "An LRU cache is a hash map for O(1) lookup welded to a doubly linked list for O(1) recency ordering — touch a key, it jumps to the front; evict, you pop the back."

## How it works

The definition above says _what_; here's the _mechanism_ that makes the two O(1) claims true.

The core insight: **no single structure does both.** A hash map finds a key in O(1) but has no notion of order. An ordered list knows what's oldest but finds a key in O(n). So you compose them, and crucially you make them **point at the same nodes**:

- A **doubly linked list** holds one node per cached entry, ordered most-recently-used (MRU) at the front to least-recently-used (LRU) at the back. The node stores both `key` and `value`.
- A **hash map** maps `key → the list node holding that key`. Not key→value — **key→node**. That indirection is the whole design.

Why doubly linked, why store the key in the node — three forced choices:

1. **Doubly, not singly.** To move a touched node to the front you must splice it out of its current spot, which needs its predecessor. A singly list would force an O(n) scan to find `prev`; a doubly list reads `node.prev` in O(1).
2. **Map points to the node, not the value.** Given a key, you need its node to re-link it — so the map's value _is_ the node. The node carries the cached value as a field.
3. **The node stores its own key.** On eviction you pop the back node and must delete its entry from the map — but the map is keyed by `key`, and the back node only knows its position. So the node carries its key, letting eviction do `del map[tail.key]` in O(1).

Two **sentinel (dummy) nodes** — a permanent `head` and `tail` that never hold data — bracket the list. They erase every "is this the first/last node?" branch: a real node always has a real `prev` and `next`, so splice and insert are one unconditional code path. (This is the dummy-node trick from the [linked list](./linked-list.md) page, doubled.)

```
map:  { A→●, C→●, B→● }          values live in the nodes, map holds node refs
                │  │  │
        ┌───────┘  │  └────────────┐
        ▼          ▼               ▼
HEAD ⇄ [C:30] ⇄ [A:10] ⇄ [B:20] ⇄ TAIL
 (MRU front)                  (LRU back)
   evict here ◀── newest        oldest ──▶ first to go

get(A):  splice A out, move behind HEAD →   HEAD ⇄ [A:10] ⇄ [C:30] ⇄ [B:20] ⇄ TAIL
put(D), full:  pop B (LRU), del map[B], push D front
```

Every `get` and `put` is: **map lookup (O(1)) → pointer splice (O(1)) → re-link at front (O(1))**. Eviction is: **read `tail.prev` (O(1)) → unlink (O(1)) → `del map[key]` (O(1))**. No loops anywhere — that's the O(1) guarantee.

## Operations

| Operation         | What it does                                                              | Time     | Space |
| ----------------- | ------------------------------------------------------------------------ | -------- | ----- |
| `get(key)`        | Return value, move node to MRU front; miss → sentinel (e.g. `-1`/`None`) | O(1) avg | O(1)  |
| `put(key, value)` | Insert/update, move node to front; if over capacity, evict LRU back      | O(1) avg | O(1)  |
| _evict_ (internal) | Unlink `tail.prev`, delete its key from the map                          | O(1)     | O(1)  |
| `contains(key)`   | Membership test (does **not** count as a use, so no reorder)             | O(1) avg | O(1)  |

All times are **average** — they inherit the hash map's average-O(1), which degrades to O(n) only in the pathological all-collisions case (see [hash table](./hash-table.md)). The list operations are **always** O(1) (worst-case), so the cache's only soft spot is the map's.

## Complexity summary

|        | get / put                | space         |
| ------ | ------------------------ | ------------- |
| Best   | O(1)                     | O(capacity)   |
| Average| O(1)                     | O(capacity)   |
| Worst  | O(n) — adversarial hash collisions only | O(capacity)   |

**Space is O(capacity), not O(n-keys-ever-seen)** — the cache holds at most `capacity` entries; everything else has been evicted. Each entry costs one map slot **plus** one list node (two pointers + key + value), so the constant factor is roughly double a plain dict — the price of O(1) eviction order.

## When to use / when not

**Reach for an LRU cache when** you have a bounded memory budget and a workload with **temporal locality** — recently used things are likely to be used again (page caches, DB query/result caches, DNS resolvers, the read-through cache in front of a slow store). The "recently touched ⇒ keep" heuristic is the single best general-purpose eviction policy when you know nothing else about access patterns.

This is the workhorse behind real systems: **OS page caches**, database buffer pools, CDN edge caches, and the in-process caches in libraries like Guava (`CacheBuilder.maximumSize`) and Python's [`functools.lru_cache`](#variants) all use LRU or an LRU approximation. See the system-design [caching](../../system-design/components/caching.md) component for where this sits in a larger architecture.

**Reach for something else when:**

- **Access frequency matters more than recency** — a key hit a thousand times then quiet for a moment shouldn't lose to a one-off scan. Use **[LFU](#variants)** (least-frequently-used).
- **You scan large data once** (a full table sweep) — LRU is _pessimal_ here: the scan evicts your hot working set in favor of data you'll never see again ("cache pollution"). Use **[LRU-K / ARC / 2Q](#variants)**, which resist one-touch promotion.
- **You don't need eviction at all** — if everything fits, a plain [hash table](./hash-table.md) is simpler and half the memory.
- **TTL/expiry is the real requirement** (not capacity) — that's a time-ordered structure (heap or timing wheel), not recency ordering.

## Comparison

| Structure                  | get   | put / evict | Eviction policy      | Order tracked        | Extra memory vs dict |
| -------------------------- | ----- | ----------- | -------------------- | -------------------- | -------------------- |
| **LRU cache** (map + DLL)  | O(1)  | O(1)        | least-recently-used  | recency              | ~2× (one node/entry) |
| Plain [hash table](./hash-table.md) | O(1)  | O(1) — no evict | none (unbounded)     | none                 | 1×                   |
| [LFU](#variants) cache     | O(1)  | O(1)        | least-frequently-used | frequency + recency  | ~3× (freq buckets)   |
| FIFO cache ([queue](./queue.md)) | O(1)  | O(1)        | first-in (insertion) | insertion only       | ~2×                  |
| Ordered map ([balanced BST](./balanced-bst.md)) | O(log n) | O(log n) | manual           | key order            | ~2×                  |

The row that matters: LRU buys recency-based eviction at O(1) for the cost of one list node per entry. FIFO is cheaper to reason about but evicts by age-in-cache, not age-since-use — it'll throw out a hot key just because it was inserted early.

## Variants

- **LFU (Least Frequently Used)** — evicts the lowest hit-count key; needs frequency buckets (a map of `count → DLL of keys` plus a `min-count` pointer) to stay O(1). Reach for it when popularity, not recency, predicts reuse.
- **`functools.lru_cache`** — Python's stdlib memoization decorator _is_ an LRU cache over a function's call arguments. `@lru_cache(maxsize=128)` gives you the whole design for free on any pure function; `maxsize=None` makes it unbounded (a plain memo).
- **`OrderedDict`-backed LRU** — `collections.OrderedDict` maintains insertion order over a hash map with a C-level doubly linked list inside it; `move_to_end` and `popitem(last=False)` are the two O(1) primitives that collapse the whole hand-rolled design into ~10 lines. See [Implementation](#implementation).
- **TTL + LRU (hybrid)** — pairs recency eviction with per-entry expiry timestamps; an entry leaves when it's either stale (TTL) or coldest (LRU).
- **LRU-K / 2Q / ARC** — scan-resistant refinements that require a key to be touched K times (or survive a probationary queue) before it's promoted, so a one-pass scan can't evict the hot set. The policies real databases (PostgreSQL's clock-sweep, many buffer pools) actually ship.

## Memory layout

LRU is a **composite** structure, and its layout question is exactly the [linked list](./linked-list.md) one — pointer-based, not contiguous — with a hash map's array bolted alongside. Understanding the layout is understanding why it's O(1) but cache-unfriendly.

**Two regions, joined by references.** The hash map is (under the hood) a contiguous array of buckets — good cache behavior on the lookup itself. The list nodes are **scattered heap allocations**, each holding `prev`, `next`, `key`, `value` (4 words ≈ 32 bytes on 64-bit, before allocator header). The map's bucket doesn't store the value inline; it stores a **reference to a node living elsewhere on the heap**:

```
hash map (contiguous buckets)          DLL nodes (scattered heap allocations)
┌──────────────┐
│ slot │ A → ●─┼──────────────────▶ [prev|key=A|val=10|next]
│ slot │       │                         ▲          │
│ slot │ C → ●─┼──────────────▶ [prev|key=C|val=30|next]
│ slot │ B → ●─┼──────▶ [prev|key=B|val=20|next]
└──────────────┘
```

**Cache-behavior consequence.** Every `get` does: hash the key (touch one bucket — cheap), follow the reference to a node **at an arbitrary address** (likely cache miss), then chase `prev`/`next` to re-link (more arbitrary addresses, more misses). So while the cache is O(1) in operation _count_, each operation can incur **multiple cache misses** from pointer-chasing — the same tax a plain linked list pays. This is why high-performance caches sometimes use an **array-indexed intrusive list** (node indices into a flat array instead of heap pointers): same O(1), far better locality.

**Resize cost.** The list never resizes — it's capped at `capacity` and grows/shrinks one node at a time, no amortized doubling. The hash map _does_ resize/rehash if it ever exceeds its load factor while filling toward capacity, paying the [hash table](./hash-table.md)'s amortized-O(1) resize tax — but since the cache is capacity-bounded, this happens at most O(log capacity) times total, then never again.

## Implementation

Pseudocode first (the contract), then idiomatic Python (the reference), then the one-liner you'd actually reach for.

**Pseudocode (CLRS-style):**

```
LRU-CACHE(capacity):
 1  cap ← capacity
 2  map ← empty hash map           ▷ key → node
 3  head, tail ← new sentinel nodes
 4  head.next ← tail;  tail.prev ← head

ADD-FRONT(node):                   ▷ splice node in just after head
 5  node.prev ← head
 6  node.next ← head.next
 7  head.next.prev ← node
 8  head.next ← node

UNLINK(node):                      ▷ remove node from its current spot
 9  node.prev.next ← node.next
10  node.next.prev ← node.prev

GET(key):
11  if key ∉ map
12      return NIL
13  node ← map[key]
14  UNLINK(node)                   ▷ pull out, then re-add at front = "touch"
15  ADD-FRONT(node)
16  return node.value

PUT(key, value):
17  if key ∈ map
18      node ← map[key]
19      node.value ← value
20      UNLINK(node);  ADD-FRONT(node)
21      return
22  if SIZE(map) = cap             ▷ full → evict LRU
23      lru ← tail.prev
24      UNLINK(lru)
25      delete map[lru.key]        ▷ why the node stores its key
26  node ← new node(key, value)
27  ADD-FRONT(node)
28  map[key] ← node
```

**Python (from scratch — the version you whiteboard):**

```python
class Node:
    __slots__ = ("key", "value", "prev", "next")
    def __init__(self, key: int = 0, value: int = 0) -> None:
        self.key, self.value = key, value
        self.prev: "Node | None" = None
        self.next: "Node | None" = None

class LRUCache:
    def __init__(self, capacity: int) -> None:
        self.cap = capacity
        self.map: dict[int, Node] = {}
        # sentinels: head <-> tail, no edge cases
        self.head, self.tail = Node(), Node()
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, node: Node) -> None:
        node.prev.next, node.next.prev = node.next, node.prev

    def _add_front(self, node: Node) -> None:
        node.prev, node.next = self.head, self.head.next
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        node = self.map.get(key)
        if node is None:
            return -1
        self._unlink(node)
        self._add_front(node)        # touch → MRU
        return node.value

    def put(self, key: int, value: int) -> None:
        if (node := self.map.get(key)) is not None:
            node.value = value
            self._unlink(node)
            self._add_front(node)
            return
        if len(self.map) == self.cap:        # full → evict LRU
            lru = self.tail.prev
            self._unlink(lru)
            del self.map[lru.key]            # node carries its key for this
        node = Node(key, value)
        self._add_front(node)
        self.map[key] = node
```

**Python (contest velocity — `OrderedDict` does the linked list for you):**

```python
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int) -> None:
        self.cap = capacity
        self.od: OrderedDict[int, int] = OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.od:
            return -1
        self.od.move_to_end(key)             # O(1) touch → MRU end
        return self.od[key]

    def put(self, key: int, value: int) -> None:
        if key in self.od:
            self.od.move_to_end(key)
        self.od[key] = value
        if len(self.od) > self.cap:
            self.od.popitem(last=False)       # O(1) evict LRU (front)
```

`OrderedDict` keeps a C-level doubly linked list internally, so `move_to_end` and `popitem(last=False)` are the same two O(1) splices — write the from-scratch version when asked to _prove_ you understand the design, reach for `OrderedDict` (or `functools.lru_cache`) when you just need it to work.

## CP-primitives

LRU rarely appears _named_ in contests, but its two engines do — both are reusable O(1) tricks worth pattern-matching.

### Intrusive doubly linked list over a flat array — pointer-chasing without the heap

Instead of heap-allocated nodes, keep `prev[]` / `next[]` arrays indexed by entry id. Splicing is `next[prev[i]] = next[i]; prev[next[i]] = prev[i]` — same O(1), but contiguous memory means no cache misses and no allocator calls, which is what makes it fast enough for a contest.

```python
# entries 0..n-1; prev[i], next[i] hold neighbor indices; -1 = sentinel
def unlink(i):  next[prev[i]] = next[i];  prev[next[i]] = prev[i]
```

**Why for CP:** collapses an ordered-with-O(1)-deletion-at-known-position requirement from O(n)-shift (array) or pointer-soup (heap nodes) into flat-array O(1) — the standard way to do "remove the k-th surviving element repeatedly" (Josephus-style) in time.

### Hash map → node indirection — O(1) "find and relocate this key"

The map-points-at-the-node pattern generalizes: whenever a problem needs _"given a value, jump to its position in some ordering and move it"_ in O(1), store `value → position/node` alongside the ordering. It's the backbone of LFU's `count → bucket` map and of O(1) `remove(arbitrary key)` on a [queue](./queue.md).

```python
pos = {}                  # value → its node/index in the ordered structure
# touch(v): node = pos[v]; relocate(node)   — no scan, ever
```

**Why for CP:** turns "search the ordering for this key" from O(n) into O(1), the move that makes recency/frequency caches and lazy-deletion heaps run in time.

## Gotchas / edge cases

- **Update is a use.** `put` on an existing key must move it to the front, not just overwrite the value. Forgetting this means a frequently-_written_ key still ages out — a classic silent bug that passes small tests and fails on the recency sequence. The same goes for `get`: a successful read **must** reorder.
- **`contains`/peek must not reorder.** If you expose a "is this cached?" check, it must _not_ count as a use — otherwise membership tests pollute the recency order. Keep the reorder strictly inside `get`/`put`.
- **The node must store its key (the eviction trap).** On eviction you have the LRU _node_ (`tail.prev`) but must delete from a map keyed by _key_. If the node doesn't carry its key, you can't do `del map[key]` and you've leaked a map entry — a memory leak that grows unboundedly while the list stays capped. This is the single most-missed detail.
- **Capacity 0.** A zero-capacity cache should accept `put` and immediately drop it (or no-op), with every `get` a miss. Guard it or the evict-then-insert logic underflows the sentinels.
- **Singly linked list is a trap.** You _can't_ do O(1) move-to-front with a singly list — finding `prev` is O(n). If an interviewer lets you use a singly list "to save a pointer," the O(1) claim quietly breaks. Insist on doubly (or `OrderedDict`).
- **Thread-safety is not free.** The two-structure invariant (map and list agree on contents) is only consistent _between_ operations. Concurrent `get`/`put` without a lock can splice a node mid-relink and corrupt both — production caches wrap the whole op in a lock or use a concurrent variant (segmented/striped). Interviewers love this follow-up.

## Practice problems

Five problems, each exercising a **distinct** technique that the LRU design teaches — no two solved the same way.

### 1. LRU Cache — _map + doubly linked list, O(1)_

**Problem.** Design a data structure for an LRU cache with `get(key)` and `put(key, value)`, both O(1), evicting the least-recently-used key when capacity is exceeded. Capacity is given at construction; up to ~10⁵ operations.

**Approach.** The canonical design above: hash map `key → node`, doubly linked list ordered MRU→LRU with sentinels, `get`/`put` both = unlink + add-front, evict = pop `tail.prev` and delete its key. The O(1) requirement on _both_ operations is exactly what forces the two-structure composition — a single dict can't give O(1) eviction order.

```python
from collections import OrderedDict
class LRUCache:
    def __init__(self, capacity: int): self.cap, self.od = capacity, OrderedDict()
    def get(self, key: int) -> int:
        if key not in self.od: return -1
        self.od.move_to_end(key);  return self.od[key]
    def put(self, key: int, value: int) -> None:
        if key in self.od: self.od.move_to_end(key)
        self.od[key] = value
        if len(self.od) > self.cap: self.od.popitem(last=False)
```

Time: O(1) per op. Space: O(capacity).

### 2. LFU Cache — _frequency buckets, O(1)_

**Problem.** Same as LRU, but evict the **least-frequently-used** key; break ties by least-recently-used among that frequency. Both operations O(1).

**Approach.** A different structure entirely — recency alone is wrong. Keep `key → (value, freq)`, plus `freq → OrderedDict of keys at that frequency` (LRU order within a freq), plus a `min_freq` pointer. A touch moves a key from bucket `f` to bucket `f+1`; eviction pops the LRU key from bucket `min_freq`. This is why LFU is "LRU with an extra dimension" — recency tie-breaking _inside_ frequency.

```python
from collections import defaultdict, OrderedDict
class LFUCache:
    def __init__(self, capacity: int):
        self.cap = capacity; self.min_freq = 0
        self.val = {}; self.freq = {}
        self.buckets = defaultdict(OrderedDict)   # freq -> {key: None} in LRU order
    def _touch(self, key):
        f = self.freq[key]; del self.buckets[f][key]
        if not self.buckets[f] and f == self.min_freq: self.min_freq += 1
        self.freq[key] = f + 1; self.buckets[f + 1][key] = None
    def get(self, key: int) -> int:
        if key not in self.val: return -1
        self._touch(key); return self.val[key]
    def put(self, key: int, value: int) -> None:
        if self.cap == 0: return
        if key in self.val: self.val[key] = value; self._touch(key); return
        if len(self.val) >= self.cap:
            k, _ = self.buckets[self.min_freq].popitem(last=False)
            del self.val[k]; del self.freq[k]
        self.val[key] = value; self.freq[key] = 1
        self.buckets[1][key] = None; self.min_freq = 1
```

Time: O(1) per op. Space: O(capacity).

### 3. Design a HashMap — _the lookup half, from scratch_

**Problem.** Implement `put`, `get`, `remove` for an integer-keyed map without using a built-in hash map. Keys in a large range, ~10⁴ operations.

**Approach.** The O(1)-lookup engine LRU depends on, stripped of recency. Bucket array of fixed size `B`; `index = key % B`; each bucket is a list (chaining) for collisions. `get`/`remove` scan only the (short, average-O(1)) collision chain. Understanding this is understanding _why_ LRU's lookup is O(1) average and where the worst case comes from.

```python
class MyHashMap:
    def __init__(self): self.B = 769; self.buckets = [[] for _ in range(self.B)]
    def _b(self, key): return self.buckets[key % self.B]
    def put(self, key: int, value: int) -> None:
        b = self._b(key)
        for i, (k, _) in enumerate(b):
            if k == key: b[i] = (key, value); return
        b.append((key, value))
    def get(self, key: int) -> int:
        return next((v for k, v in self._b(key) if k == key), -1)
    def remove(self, key: int) -> None:
        b = self._b(key); b[:] = [(k, v) for k, v in b if k != key]
```

Time: O(1) average per op. Space: O(n).

### 4. First Unique Character in a Stream — _ordered structure + O(1) relocation_

**Problem.** Process a stream of characters; after each, report the first character so far that has appeared exactly once (or a sentinel if none). The recency-ordering + O(1)-removal-of-a-known-key skill, applied.

**Approach.** Keep a [queue](./queue.md) of candidate "seen-once" characters in arrival order, plus a count map. On each new char, increment its count; lazily pop from the queue's front while the front's count > 1. The front is always the answer. This reuses LRU's _"maintain an ordering with O(1) removal of entries that fall out of contention"_ idea — the queue is the ordering, the count map is the side index.

```python
from collections import deque
def first_unique_stream(chars):
    counts, q, out = {}, deque(), []
    for c in chars:
        counts[c] = counts.get(c, 0) + 1; q.append(c)
        while q and counts[q[0]] > 1: q.popleft()   # lazy eviction
        out.append(q[0] if q else "#")
    return out
```

Time: O(n) amortized (each char enqueued/dequeued once). Space: O(alphabet).

### 5. Insert / Delete / GetRandom O(1) — _array + map back-reference_

**Problem.** Build a set supporting `insert`, `remove`, and `getRandom` (uniform) all in O(1) average.

**Approach.** Not recency, but the **same map→position back-reference trick** LRU uses for O(1) eviction. Keep a dynamic [array](./array.md) of values plus a map `value → index in the array`. `getRandom` indexes the array; `remove` swaps the target with the last element (using the map to find its index in O(1)), pops the tail, and fixes the swapped element's index — O(1) deletion from the middle of an array, exactly the move LRU makes against a list.

```python
import random
class RandomizedSet:
    def __init__(self): self.vals = []; self.idx = {}
    def insert(self, x: int) -> bool:
        if x in self.idx: return False
        self.idx[x] = len(self.vals); self.vals.append(x); return True
    def remove(self, x: int) -> bool:
        if x not in self.idx: return False
        i, last = self.idx[x], self.vals[-1]
        self.vals[i] = last; self.idx[last] = i          # swap target with tail
        self.vals.pop(); del self.idx[x]; return True
    def getRandom(self) -> int: return random.choice(self.vals)
```

Time: O(1) average per op. Space: O(n).
