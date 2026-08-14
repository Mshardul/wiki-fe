# LRU Cache

## Prerequisites

- [Big-O Notation](../algorithms/big-o-notation.md) [Must read]
- [Hash Table](./hash-table.md) [Must read]
- [Doubly Linked List](./linked-list.md) [Must read]
- [Hash Set](./hash-set.md) [Should read]

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
- [Gotchas / edge cases](#gotchas--edge-cases)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

## What it is

An **LRU (Least Recently Used) cache** is a fixed-capacity key→value store that, when full, evicts the key that was accessed longest ago. It answers two questions in O(1): _"what's the value for key k?"_ and _"who do I throw out to make room?"_

The mental model: **a stack of plates you always take from and return to the top.** Every time you touch a plate (read or write), it goes back on top; when you need space, you remove the bottom plate - the one nobody has touched in the longest time. The trick that makes it interview-famous is doing _both_ the lookup and the "find the bottom plate" in O(1), which a single structure can't - so you bolt two together.

> **Soundbite:** "An LRU cache is a hash map for O(1) lookup welded to a doubly linked list for O(1) recency ordering - touch a key, it jumps to the front; evict, you pop the back."

## How it works

The definition above says _what_; here's the _mechanism_ that makes the two O(1) claims true.

The core insight: **no single structure does both.** A hash map finds a key in O(1) but has no notion of order. An ordered list knows what's oldest but finds a key in O(n). So you compose them, and crucially you make them **point at the same nodes**:

- A **doubly linked list** holds one node per cached entry, ordered most-recently-used (MRU) at the front to least-recently-used (LRU) at the back. The node stores both `key` and `value`.
- A **hash map** maps `key → the list node holding that key`. Not key→value - **key→node**. That indirection is the whole design.

Why doubly linked, why store the key in the node - three forced choices:

1. **Doubly, not singly.** To move a touched node to the front you must splice it out of its current spot, which needs its predecessor. A singly list would force an O(n) scan to find `prev`; a doubly list reads `node.prev` in O(1).
2. **Map points to the node, not the value.** Given a key, you need its node to re-link it - so the map's value _is_ the node. The node carries the cached value as a field.
3. **The node stores its own key.** On eviction you pop the back node and must delete its entry from the map - but the map is keyed by `key`, and the back node only knows its position. So the node carries its key, letting eviction do `del map[tail.key]` in O(1).

Two **<abbr>sentinel</abbr> (dummy) nodes** - a permanent `head` and `tail` that never hold data - bracket the list. They erase every "is this the first/last node?" branch: a real node always has a real `prev` and `next`, so splice and insert are one unconditional code path. (This is the dummy-node trick from the [linked list](./linked-list.md) page, doubled.)

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

Every `get` and `put` is: **map lookup (O(1)) → pointer splice (O(1)) → re-link at front (O(1))**. Eviction is: **read `tail.prev` (O(1)) → unlink (O(1)) → `del map[key]` (O(1))**. No loops anywhere - that's the O(1) guarantee.

## Operations

| Operation         | What it does                                                              | Time     | Space |
| ----------------- | ------------------------------------------------------------------------ | -------- | ----- |
| `get(key)`        | Return value, move node to MRU front; miss → sentinel (e.g. `-1`/`None`) | O(1) avg | O(1)  |
| `put(key, value)` | Insert/update, move node to front; if over capacity, evict LRU back      | O(1) avg | O(1)  |
| _evict_ (internal) | Unlink `tail.prev`, delete its key from the map                          | O(1)     | O(1)  |
| `contains(key)`   | Membership test (does **not** count as a use, so no reorder)             | O(1) avg | O(1)  |

All times are **average** - they inherit the hash map's average-O(1), which degrades to O(n) only in the pathological all-collisions case (see [hash table](./hash-table.md)). The list operations are **always** O(1) (worst-case), so the cache's only soft spot is the map's.

## Complexity summary

|        | get / put                | space         |
| ------ | ------------------------ | ------------- |
| Best   | O(1)                     | O(capacity)   |
| Average| O(1)                     | O(capacity)   |
| Worst  | O(n) - adversarial hash collisions only | O(capacity)   |

**Space is O(capacity), not O(n-keys-ever-seen)** - the cache holds at most `capacity` entries; everything else has been evicted. Each entry costs one map slot **plus** one list node (two pointers + key + value), so the constant factor is roughly double a plain dict - the price of O(1) eviction order.

## When to use / when not

**Reach for an LRU cache when** you have a bounded memory budget and a workload with **temporal locality** - recently used things are likely to be used again (page caches, DB query/result caches, DNS resolvers, the read-through cache in front of a slow store). The "recently touched ⇒ keep" heuristic is the single best general-purpose eviction policy when you know nothing else about access patterns.

This is the workhorse behind real systems: **OS page caches**, database buffer pools, CDN edge caches, and the in-process caches in libraries like Guava (`CacheBuilder.maximumSize`) and Python's [`functools.lru_cache`](#variants) all use LRU or an LRU approximation. See the system-design [caching](../../system-design/components/caching.md) component for where this sits in a larger architecture.

**Reach for something else when:**

- **Access frequency matters more than recency** - a key hit a thousand times then quiet for a moment shouldn't lose to a one-off scan. Use **[LFU](#variants)** (least-frequently-used).
- **You scan large data once** (a full table sweep) - LRU is _pessimal_ here: the scan evicts your hot working set in favor of data you'll never see again ("cache pollution"). Use **[LRU-K / ARC / 2Q](#variants)**, which resist one-touch promotion.
- **You don't need eviction at all** - if everything fits, a plain [hash table](./hash-table.md) is simpler and half the memory.
- **TTL/expiry is the real requirement** (not capacity) - that's a time-ordered structure (heap or timing wheel), not recency ordering.

## Comparison

| Structure                  | get   | put / evict | Eviction policy      | Order tracked        | Extra memory vs dict |
| -------------------------- | ----- | ----------- | -------------------- | -------------------- | -------------------- |
| **LRU cache** (map + DLL)  | O(1)  | O(1)        | least-recently-used  | recency              | ~2× (one node/entry) |
| Plain [hash table](./hash-table.md) | O(1)  | O(1) - no evict | none (unbounded)     | none                 | 1×                   |
| [LFU](#variants) cache     | O(1)  | O(1)        | least-frequently-used | frequency + recency  | ~3× (freq buckets)   |
| FIFO cache ([queue](./queue.md)) | O(1)  | O(1)        | first-in (insertion) | insertion only       | ~2×                  |
| Ordered map ([balanced BST](./balanced-bst.md)) | O(log n) | O(log n) | manual           | key order            | ~2×                  |

The row that matters: LRU buys recency-based eviction at O(1) for the cost of one list node per entry. FIFO is cheaper to reason about but evicts by age-in-cache, not age-since-use - it'll throw out a hot key just because it was inserted early.

See the [Data Structure Selection cheatsheet](../cheatsheets/data-structure-selection.md) for the full cross-structure comparison.

## Variants

- **LFU (Least Frequently Used)** - evicts the lowest hit-count key; needs frequency buckets (a map of `count → DLL of keys` plus a `min-count` pointer) to stay O(1). Reach for it when popularity, not recency, predicts reuse.
- **`functools.lru_cache`** - Python's stdlib memoization decorator _is_ an LRU cache over a function's call arguments. `@lru_cache(maxsize=128)` gives you the whole design for free on any pure function; `maxsize=None` makes it unbounded (a plain memo).
- **`OrderedDict`-backed LRU** - `collections.OrderedDict` maintains insertion order over a hash map with a C-level doubly linked list inside it; `move_to_end` and `popitem(last=False)` are the two O(1) primitives that collapse the whole hand-rolled design into ~10 lines. See [Implementation](#implementation).
- **TTL + LRU (hybrid)** - pairs recency eviction with per-entry expiry timestamps; an entry leaves when it's either stale (TTL) or coldest (LRU).
- **LRU-K / 2Q / ARC** - scan-resistant refinements that require a key to be touched K times (or survive a probationary queue) before it's promoted, so a one-pass scan can't evict the hot set. The policies real databases (PostgreSQL's clock-sweep, many buffer pools) actually ship.

## Memory layout

LRU is a **composite** structure, and its layout question is exactly the [linked list](./linked-list.md) one - pointer-based, not contiguous - with a hash map's array bolted alongside. Understanding the layout is understanding why it's O(1) but cache-unfriendly.

**Two regions, joined by references.** The hash map is (under the hood) a contiguous array of buckets - good cache behavior on the lookup itself. The list nodes are **scattered heap allocations**, each holding `prev`, `next`, `key`, `value` (4 words ≈ 32 bytes on 64-bit, before allocator header). The map's bucket doesn't store the value inline; it stores a **reference to a node living elsewhere on the heap**:

```
hash map (contiguous buckets)          DLL nodes (scattered heap allocations)
┌──────────────┐
│ slot │ A → ●─┼──────────────────▶ [prev|key=A|val=10|next]
│ slot │       │                         ▲          │
│ slot │ C → ●─┼──────────────▶ [prev|key=C|val=30|next]
│ slot │ B → ●─┼──────▶ [prev|key=B|val=20|next]
└──────────────┘
```

**Cache-behavior consequence.** Every `get` does: hash the key (touch one bucket - cheap), follow the reference to a node **at an arbitrary address** (likely cache miss), then chase `prev`/`next` to re-link (more arbitrary addresses, more misses). So while the cache is O(1) in operation _count_, each operation can incur **multiple cache misses** from pointer-chasing - the same tax a plain linked list pays. This is why high-performance caches sometimes use an **array-indexed intrusive list** (node indices into a flat array instead of heap pointers): same O(1), far better locality.

**<abbr>Hashing</abbr> & <abbr>collision</abbr>s (the map half).** The `key → node` map is an ordinary [hash table](./hash-table.md#hashing--collisions): keys hash to buckets, collisions resolve via chaining or open addressing, and lookup degrades from O(1) average to O(n) worst-case only in the pathological all-collisions case. Nothing about the LRU composition changes this - the map's collision behavior is exactly the hash table's, the DLL half is untouched by it. What LRU adds on top is that the map's *value* is a node reference, not the cached value itself - so a collision-heavy bucket slows down finding the node, but once found, the splice into the DLL is still O(1) regardless of how the map got there.

**Resize cost - full <abbr>amortized</abbr> accounting.** The list never resizes - it's capped at `capacity` and grows/shrinks one node at a time, no amortized doubling. The hash map is the one piece that can resize, and only while the cache is still filling toward capacity (once at `capacity`, every `put` either updates an existing key or evicts before inserting, so the map's entry count never grows past `capacity` - no further resize is ever triggered again). While filling:

1. **Which operation pays.** `put` on a new key, while `len(map) < capacity`, is the only operation that can trigger a rehash.
2. **The accounting.** Same geometric argument as a [dynamic array's doubling](./dynamic-array.md#memory-layout) or a [hash table's resize](./hash-table.md#hashing--collisions): the map doubles its bucket array when the <abbr>load factor</abbr> crosses its threshold, and a resize touches every existing entry once (O(current size) to rehash). Charging 2 "credits" to every insert (1 to insert the new entry, 1 pre-paid toward a future entry's share of the next resize) covers the cost - summed over the fill-up to `capacity`, total resize work is O(capacity), so each `put` is O(1) amortized over that fill phase.
3. **Worst-case single-op cost.** A `put` that happens to trigger the resize is O(capacity) for that one call, not O(1) - amortized-O(1) is a guarantee on the *average* over a sequence, not on any individual call. A latency-sensitive system that cannot tolerate an occasional O(capacity) spike must pre-size the map to `capacity` up front (most hash-map constructors accept an initial-capacity hint) to skip resizing entirely.
4. **Bound on total resizes.** Because the map only grows while under `capacity`, it resizes at most O(log capacity) times total across the cache's entire lifetime, then never again - unlike an unbounded hash table, which keeps resizing for as long as the caller keeps inserting new keys.

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

**Python (from scratch - the version you whiteboard):**

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
        self._add_front(node)
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

**Python (contest velocity - `OrderedDict` does the linked list for you):**

```python
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int) -> None:
        self.cap = capacity
        self.od: OrderedDict[int, int] = OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.od:
            return -1
        self.od.move_to_end(key)
        return self.od[key]

    def put(self, key: int, value: int) -> None:
        if key in self.od:
            self.od.move_to_end(key)
        self.od[key] = value
        if len(self.od) > self.cap:
            self.od.popitem(last=False)
```

`OrderedDict` keeps a C-level doubly linked list internally, so `move_to_end` and `popitem(last=False)` are the same two O(1) splices - write the from-scratch version when asked to _prove_ you understand the design, reach for `OrderedDict` (or `functools.lru_cache`) when you just need it to work.

## Gotchas / edge cases

- **Update is a use.** `put` on an existing key must move it to the front, not just overwrite the value. Forgetting this means a frequently-_written_ key still ages out - a classic silent bug that passes small tests and fails on the recency sequence. The same goes for `get`: a successful read **must** reorder.
- **`contains`/peek must not reorder.** If you expose a "is this cached?" check, it must _not_ count as a use - otherwise membership tests pollute the recency order. Keep the reorder strictly inside `get`/`put`.
- **The node must store its key (the eviction trap).** On eviction you have the LRU _node_ (`tail.prev`) but must delete from a map keyed by _key_. If the node doesn't carry its key, you can't do `del map[key]` and you've leaked a map entry - a memory leak that grows unboundedly while the list stays capped. This is the single most-missed detail.
- **Capacity 0.** A zero-capacity cache should accept `put` and immediately drop it (or no-op), with every `get` a miss. Guard it or the evict-then-insert logic underflows the sentinels.
- **Singly linked list is a trap.** You _can't_ do O(1) move-to-front with a singly list - finding `prev` is O(n). If an interviewer lets you use a singly list "to save a pointer," the O(1) claim quietly breaks. Insist on doubly (or `OrderedDict`).
- **Thread-safety is not free.** The two-structure invariant (map and list agree on contents) is only consistent _between_ operations. Concurrent `get`/`put` without a lock can splice a node mid-relink and corrupt both - production caches wrap the whole op in a lock or use a concurrent variant (segmented/striped). Interviewers love this follow-up.

## What the interviewer probes for

**What changes if the cache has to serve millions of QPS?** - A single lock around the map+DLL composition becomes the bottleneck long before the O(1) operations themselves do, since every `get` also mutates the list (moving the touched node to the front) and so can't be made read-only. The standard fix is **<abbr>sharding</abbr>**: split the keyspace across N independent LRU instances by `hash(key) % N`, each with its own lock, so contention drops by roughly N× - at the cost of the global eviction order becoming approximate (a key hot in one shard doesn't protect a cold key in another from being evicted, even if the second key is globally "more recent").

**Why not just use a plain hash table with no eviction, or LFU instead?** - A plain hash table is simpler and uses half the memory, but only works if the working set is bounded by something other than the cache itself - once memory is the constraint, something has to decide what to throw away, and LRU's "recently touched stays" heuristic is the best default with zero knowledge of access patterns. LFU is the alternative when frequency, not recency, predicts reuse (a key hit constantly then briefly quiet shouldn't lose to a one-off scan) - but it costs an extra dimension of bookkeeping (frequency buckets plus a min-frequency pointer) for a win that only pays off on workloads with a real popularity skew.

**Where's the actual lock contention, precisely?** - It's not the hash map lookup - it's the doubly linked list pointer updates. Every `get`, not just every `put`, mutates `prev`/`next` pointers to move the touched node to the front, so even a read-heavy workload serializes on the list splice. This is why some high-<abbr>throughput</abbr> caches relax strict LRU to an **approximate** scheme (e.g. CLOCK/second-chance, which uses a reference bit instead of a full reorder) - it trades exact recency ordering for lock-free or near-lock-free reads.

## Practice problems

Three problems, each exercising a **distinct** technique that the LRU design teaches - no two solved the same way, and every entry genuinely depends on the map→node + doubly-linked-list splice mechanism this article is about.

### 1. LRU Cache

Design a data structure for an LRU cache with `get(key)` and `put(key, value)`, both O(1), evicting the least-recently-used key when capacity is exceeded. The canonical hashmap+DLL composition - every other entry here is a variation on this splice.

**Worked examples:**
- **Example 1**
  - **Input:** capacity = 2; put(1,1), put(2,2), get(1), put(3,3), get(2) | **Output:** get(1) → 1, get(2) → -1
  - **Explanation:** put(3,3) evicts key 2 - it was the LRU entry after get(1) refreshed key 1's recency.
- **Example 2**
  - **Input:** capacity = 1; put(2,1), get(2), put(3,2), get(2), get(3) | **Output:** get(2) → 1, then get(2) → -1, get(3) → 2
  - **Explanation:** capacity 1 means put(3,2) immediately evicts key 2.

**Constraints:** `1 ≤ capacity ≤ 3000`, `0 ≤ key, value ≤ 10⁴`, up to `2 × 10⁵` calls to `get`/`put`.

**Approach:** The canonical design: hash map `key → node`, doubly linked list ordered MRU→LRU with sentinels, `get`/`put` both = unlink + add-front, evict = pop `tail.prev` and delete its key. The O(1) requirement on _both_ operations is exactly what forces the two-structure composition - a single dict can't give O(1) eviction order.

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

**Complexity:** O(1) per op, O(capacity) space.

**Duplicate problems:**
- Design In-Memory File System with LRU eviction (variant, no canonical LC number) - same map→node→splice mechanism applied to file handles instead of key/value pairs; the eviction and reorder logic is identical.
- All O(1) Data Structure (LC 432) - a different data shape (needs both max and min in O(1)), but shares this problem's core insight of a hash map pointing into a doubly linked structure instead of storing values directly.

---

### 2. LFU Cache

Same as LRU, but evict the **least-frequently-used** key; break ties by least-recently-used among that frequency. Both operations O(1). Kept here as the intentional contrast entry: same map→node backbone, but recency alone is no longer the eviction key.

**Worked examples:**
- **Example 1**
  - **Input:** capacity = 2; put(1,1), put(2,2), get(1), put(3,3), get(2), get(3), put(4,4), get(1), get(3), get(4) | **Output:** get(1) → 1, get(2) → -1, get(3) → 3, get(1) → -1, get(3) → 3, get(4) → 4
  - **Explanation:** put(3,3) evicts key 2 (freq 1, the only candidate at min_freq); put(4,4) evicts key 1 (freq 2, same as key 3, but key 1 is the older touch at that frequency).
- **Example 2**
  - **Input:** capacity = 0; put(0,0), get(0) | **Output:** get(0) → -1
  - **Explanation:** zero capacity means every put is a no-op.

**Constraints:** `0 ≤ capacity ≤ 10⁴`, `0 ≤ key ≤ 10⁵`, `0 ≤ value ≤ 10⁹`, up to `2 × 10⁵` calls to `get`/`put`.

**Approach:** A different structure entirely - recency alone is wrong. Keep `key → (value, freq)`, plus `freq → OrderedDict of keys at that frequency` (LRU order within a freq), plus a `min_freq` pointer. A touch moves a key from bucket `f` to bucket `f+1`; eviction pops the LRU key from bucket `min_freq`. This is why LFU is "LRU with an extra dimension" - recency tie-breaking _inside_ frequency.

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

**Complexity:** O(1) per op, O(capacity) space.

---

### 3. LRU Cache with TTL

Design an LRU cache where each entry also carries a **time-to-live**: `put(key, value, ttl)` and `get(key, now)`, and a `get` on an expired entry must act as a miss (and lazily evict it) even if it's still the MRU node. Genuinely distinct from entry 1: eviction is no longer purely recency-driven - a check against a wall-clock timestamp gates every access before the splice happens.

**Worked examples:**
- **Example 1**
  - **Input:** capacity = 2; put(1, "a", ttl=10, now=0); get(1, now=5) | **Output:** "a"
  - **Explanation:** at time 5 the entry (expires at time 10) is still valid, so it's returned and moved to MRU front.
- **Example 2**
  - **Input:** capacity = 2; put(1, "a", ttl=10, now=0); get(1, now=11) | **Output:** -1
  - **Explanation:** at time 11 the entry has passed its expiry (10), so `get` treats it as a miss and lazily unlinks it from both the map and the list.

**Constraints:** `1 ≤ capacity ≤ 3000`, `1 ≤ ttl ≤ 10⁹`, `0 ≤ now ≤ 10⁹` and non-decreasing across calls, up to `2 × 10⁵` operations.

**Approach:** Same hashmap `key → node` plus doubly linked list as the canonical design, but each node also stores `expires_at`. `get` first checks `node.expires_at <= now`; if expired, unlink the node and delete the map entry (a miss), rather than touching it. If still valid, `get` proceeds with the normal unlink + add-front splice. `put` always evicts a genuinely-expired entry lazily rather than scanning for one - there's no active background sweep, so a stale entry can sit in the structure until it's next touched or until it becomes the LRU victim on overflow. This is the same map→node→splice mechanism as entry 1, gated by one extra field and one extra branch.

```python
class Node:
    __slots__ = ("key", "value", "expires_at", "prev", "next")
    def __init__(self, key=0, value=0, expires_at=0):
        self.key, self.value, self.expires_at = key, value, expires_at
        self.prev = self.next = None

class LRUCacheTTL:
    def __init__(self, capacity: int) -> None:
        self.cap = capacity
        self.map: dict[int, Node] = {}
        self.head, self.tail = Node(), Node()
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, node: Node) -> None:
        node.prev.next, node.next.prev = node.next, node.prev

    def _add_front(self, node: Node) -> None:
        node.prev, node.next = self.head, self.head.next
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int, now: int) -> int:
        node = self.map.get(key)
        if node is None:
            return -1
        if node.expires_at <= now:            # lazy expiry check gates the splice
            self._unlink(node)
            del self.map[key]
            return -1
        self._unlink(node)
        self._add_front(node)
        return node.value

    def put(self, key: int, value: int, ttl: int, now: int) -> None:
        if key in self.map:
            self._unlink(self.map[key])
        elif len(self.map) == self.cap:
            lru = self.tail.prev
            self._unlink(lru)
            del self.map[lru.key]
        node = Node(key, value, now + ttl)
        self._add_front(node)
        self.map[key] = node
```

**Complexity:** O(1) per op, O(capacity) space.

