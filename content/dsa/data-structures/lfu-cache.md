# LFU Cache

## Prerequisites

- [Big-O Notation](../algorithms/big-o-notation.md) [Must read]
- [LRU Cache](./lru-cache.md) [Must read]
- [Hash Table](./hash-table.md) [Must read]
- [Doubly Linked List](./linked-list.md) [Should read]

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

An **LFU (Least Frequently Used) cache** is a fixed-capacity key→value store that, when full, evicts the key with the **lowest access count**, breaking ties by least-recently-used among the least-frequent. It bets that _popularity_ - how often a key is touched - predicts reuse better than recency alone.

The mental model: **a leaderboard where every access bumps a key up one rank, and when you're out of room you drop whoever sits at the bottom.** Two keys tied at the bottom rank? The one nobody's touched in the longest time loses - so recency is the tie-breaker baked _inside_ each frequency level.

The interview tension is identical to [LRU](./lru-cache.md): the obvious implementation ("find the min-frequency key") is O(n) or O(log n). Getting **both** `get` and `put` to true O(1) - eviction included - is the whole puzzle, and it needs more machinery than LRU.

> **Soundbite:** "An LFU cache evicts by hit-count, not recency - frequency buckets of LRU-ordered keys plus a `min_freq` pointer, so a touch is a bucket-hop and an eviction pops the front of the min bucket, all O(1)."

## How it works

The definition says _evict the least-frequent_; the mechanism is how you do that in O(1) without ever searching for the minimum.

**Why LRU's structure isn't enough.** LRU needs one ordering (recency). LFU needs to group keys by frequency _and_ keep recency order _within_ each group _and_ find the smallest group's oldest member instantly. A single list can't express "lowest count, then oldest." So you build a **two-level structure**:

- **`val_map: key → value`** - the plain lookup.
- **`freq_map: key → frequency`** - how many times this key has been touched.
- **`buckets: frequency → doubly linked list of keys at that frequency`**, each bucket ordered **MRU-front, LRU-back** (an LRU list, exactly like the LRU cache, one per frequency).
- **`min_freq`** - an integer pointing at the lowest non-empty frequency. **This is the trick that buys O(1) eviction**: instead of scanning buckets for the minimum, you keep the minimum cached and update it in O(1).

**A touch is a bucket-hop.** When you `get` or update a key currently at frequency `f`:

1. Remove it from `buckets[f]` (O(1) splice - it's a known node in a doubly linked list).
2. If `buckets[f]` is now empty **and** `f == min_freq`, increment `min_freq` (the smallest non-empty bucket just moved up by one).
3. Add it to the **front** of `buckets[f+1]` (now both more-frequent and most-recent).
4. Bump `freq_map[key]` to `f+1`.

**Eviction pops the min bucket's back.** When full and inserting a new key: take `buckets[min_freq]`, remove its **last** node (the LRU key among the least-frequent - the tie-break in action), delete it from all maps. Then the new key enters at frequency **1**, so `buckets[1]` gets it and `min_freq` resets to **1**.

```
freq buckets (each an LRU list, MRU←front, back→LRU):

 freq 1:  HEAD ⇄ [D] ⇄ [E] ⇄ TAIL      ← min_freq points here
 freq 2:  HEAD ⇄ [A] ⇄ [B] ⇄ TAIL
 freq 3:  HEAD ⇄ [C] ⇄ TAIL

get(E):  E is freq 1 → hop to freq 2, front.  buckets[1] still has D ⇒ min_freq stays 1
 freq 1:  HEAD ⇄ [D] ⇄ TAIL
 freq 2:  HEAD ⇄ [E] ⇄ [A] ⇄ [B] ⇄ TAIL

put(X), full:  evict buckets[min_freq=1].back = D  (least-freq, then LRU)
               X enters freq 1, min_freq ← 1
 freq 1:  HEAD ⇄ [X] ⇄ TAIL
```

Why `min_freq` never needs a search: it only ever **increases by exactly 1** (when the min bucket empties on a touch) or **resets to 1** (when a new key is inserted). Both are O(1) updates - there is no case where you must hunt for the new minimum, because a new insert always creates a freq-1 key.

## Operations

| Operation         | What it does                                                                     | Time     | Space |
| ----------------- | -------------------------------------------------------------------------------- | -------- | ----- |
| `get(key)`        | Return value, bump its frequency (bucket-hop); miss → sentinel (`-1`/`None`)     | O(1) avg | O(1)  |
| `put(key, value)` | Insert at freq 1 / update + bump; if full, evict `buckets[min_freq]`'s LRU back  | O(1) avg | O(1)  |
| _evict_ (internal) | Pop the back of `buckets[min_freq]`, delete from all three maps                  | O(1)     | O(1)  |
| `contains(key)`   | Membership only - must **not** bump frequency                                    | O(1) avg | O(1)  |

Times are **average**, inheriting the hash maps' average-O(1) (worst-case O(n) only under adversarial hash collisions - see [hash table](./hash-table.md)). The bucket-list splices are **always** O(1).

**The O(1) hides a 2× constant vs LRU.** Every `get`/`put` does *two* bucket splices (remove from `buckets[f]`, add to `buckets[f+1]`) where LRU does one move-to-front - same O(1), roughly double the pointer work and double the cache misses ([Memory layout](#memory-layout)). And the `evict` cell hides a subtlety: it's O(1) **only because `min_freq` is cached**; the moment you compute the victim's bucket by scanning for the minimum frequency, `put` silently becomes O(distinct-frequencies). The cell is O(1) iff you never search for the min.

## Complexity summary

|         | get / put                              | space        |
| ------- | -------------------------------------- | ------------ |
| Best    | O(1)                                   | O(capacity)  |
| Average | O(1)                                   | O(capacity)  |
| Worst   | O(n) - adversarial hash collisions only | O(capacity)  |

**No amortization anywhere - best, average, and worst are all O(1) for the same reason.** Unlike a [dynamic array](./dynamic-array.md) whose O(1) is *amortized* (occasional O(n) resize spikes), LFU's per-op work is bounded by a fixed number of splices regardless of cache state - there is no "every k-th op is expensive" tail. The only variance is the hash maps' collision behavior, which is why worst-case degrades to O(n) and *nothing else does*.

**Space is O(capacity)** - at most `capacity` keys live across all buckets. Each key costs three map entries (value, freq, and its node inside a bucket list) **plus** the bucket-list node, so LFU's constant factor is **larger than LRU's** (~3× a plain dict vs LRU's ~2×) - the price of tracking frequency on top of recency. Concretely on 64-bit: ~4 words of bucket-list node + 3 map slots per key, vs LRU's ~4-word node + 1 slot. The extra word that bites in practice isn't the count itself (one int) - it's the third hash map's bucket array and the per-frequency list headers, which is exactly the overhead Window-TinyLFU deletes by swapping exact counts for a [Count-Min Sketch](#variants).

## When to use / when not

**Reach for LFU when access _frequency_ predicts reuse better than recency** - a key hammered a thousand times shouldn't be evicted just because it went quiet for one moment while a one-off scan streamed past. Classic homes: **Redis** ships LFU eviction as a first-class policy (`maxmemory-policy allkeys-lfu`) using an aged 8-bit counter per key - the canonical production LFU; **CDN / content caches** (a viral asset stays hot long after the last hit); **database buffer pools** for skewed-popularity workloads; and **DNS / API response caches** where a few keys dominate traffic. See the system-design [caching](../../system-design/components/caching.md) component for where eviction policy sits in a larger cache design.

**Reach for something else when:**

- **Recency matters more than frequency** - most general workloads have temporal locality, not stable popularity. Use **[LRU](./lru-cache.md)**; it's simpler and cheaper.
- **Popularity shifts over time** - plain LFU has a fatal flaw: **cache pollution by stale winners.** A key that was hot last week keeps its huge count and squats in the cache forever, even if it's now cold, because nothing decays the count. Use **[LFU with aging / Window-TinyLFU](#variants)**, which decays old frequencies.
- **You need no eviction** - everything fits → a plain [hash table](./hash-table.md), a third of the memory.
- **Frequency ties are rare and you can afford O(log n)** - a simpler heap-of-(count, key) is easier to write and fine if O(1) isn't required.

## Comparison

| Structure                       | get   | put / evict | Evicts by                  | Tie-break        | Extra memory vs dict |
| ------------------------------- | ----- | ----------- | -------------------------- | ---------------- | -------------------- |
| **LFU cache** (buckets + min_freq) | O(1)  | O(1)        | lowest frequency           | LRU within freq  | ~3×                  |
| [LRU cache](./lru-cache.md)     | O(1)  | O(1)        | least-recently-used        | n/a              | ~2×                  |
| FIFO cache ([queue](./queue.md)) | O(1)  | O(1)        | insertion age              | n/a              | ~2×                  |
| Heap-based LFU ([heap](./heap.md)) | O(log n) | O(log n) | lowest frequency           | manual           | ~2×                  |
| Plain [hash table](./hash-table.md) | O(1)  | O(1) - no evict | nothing (unbounded)        | n/a              | 1×                   |

The two rows that matter: the **heap LFU** gets you the same eviction policy in ~10 lines but at O(log n) - the `min_freq` + bucket design exists purely to drop that `log n`. And **LRU vs LFU** is the policy choice itself: recency vs popularity, ~2× vs ~3× memory.

## Variants

- **LFU with aging (decay)** - periodically halve every count, or store `count` as `frequency / time_since_insert`, so yesterday's hot key doesn't squat forever. Fixes plain LFU's cache-pollution flaw at the cost of a decay pass.
- **Window-TinyLFU** - the policy real high-performance caches ship (Java's **Caffeine**, the successor to Guava cache). A small LRU admission window guards a frequency-sketch-backed main region; a **Count-Min Sketch** approximates frequencies in *sublinear* space instead of exact per-key counts. The production answer to "LFU but memory-bounded and scan-resistant."
- **LFRU (Least Frequent Recently Used)** - splits the cache into a privileged (frequency-protected) and an unprivileged (LRU) partition; used in CDN/edge caches.
- **Heap-backed LFU** - a min-heap keyed by `(count, insertion_order)`. Simpler to write, O(log n) per op - the version to reach for when O(1) isn't a hard requirement.
- **Redis aged-counter LFU** - drops exact counts for an **8-bit logarithmic counter** per key (probabilistic increment that saturates, halved on a decay clock). Trades exactness for one byte/key and built-in aging - the real-world answer to both the memory and the pollution problems at once.
- **LIRS** - reuses *inter-reference recency* (the gap between the last two accesses) instead of a raw count, dominating LFU on database/scan workloads; the policy behind MySQL's InnoDB buffer-pool midpoint insertion.

## Memory layout

LFU's layout is **[LRU's layout, replicated per frequency**](./lru-cache.md#memory-layout), plus an outer map of buckets - so it inherits LRU's pointer-chasing cache behavior and adds one more level of indirection.

**Three heap regions, joined by references.** The maps (`val`, `freq`, `buckets`) are contiguous bucket-arrays - cache-friendly on the hash lookup. But the actual key nodes are **scattered heap allocations** inside the per-frequency doubly linked lists, and `buckets[f]` itself holds a reference to *another* list head living elsewhere:

```
buckets map (contiguous)        per-freq DLL nodes (scattered heap allocations)
┌─────────────┐
│ 1 → list●───┼──────▶ HEAD ⇄ [D] ⇄ [E] ⇄ TAIL
│ 2 → list●───┼──▶ HEAD ⇄ [A] ⇄ [B] ⇄ TAIL
│ 3 → list●───┼─▶ HEAD ⇄ [C] ⇄ TAIL
└─────────────┘
min_freq = 1   (an int - the whole reason eviction is O(1), no scan)
```

**Cache-behavior consequence.** A `get` does: `freq_map` lookup (one bucket), then find the key's node inside `buckets[f]` (an arbitrary heap address → likely miss), splice it (chase `prev`/`next` → more misses), then splice into `buckets[f+1]`'s front (another scattered list → more misses). So LFU pays **more** pointer-chasing than LRU - two list operations per touch instead of one. This is exactly why Window-TinyLFU swaps exact per-key nodes for a flat **Count-Min Sketch array**: trading exactness for contiguous, cache-friendly memory.

**Resize cost.** The bucket lists never resize (capped at `capacity` total, one node at a time). The three hash maps resize/rehash on load-factor overflow while filling toward capacity - amortized-O(1), at most O(log capacity) times total, then never again (same bound as [LRU](./lru-cache.md#memory-layout)). One extra subtlety: empty buckets are typically left in the `buckets` map (cheap) and skipped via `min_freq`, so the bucket map's size is bounded by the number of *distinct frequencies*, not keys.

## Implementation

Pseudocode (the contract), then idiomatic Python (the reference). The skeleton reuses [LRU](./lru-cache.md#implementation)'s splice/add-front primitives - the new logic is entirely the `min_freq` bookkeeping.

**Pseudocode (CLRS-style):**

```
LFU-CACHE(capacity):
 1  cap ← capacity;  size ← 0;  min_freq ← 0
 2  val  ← empty map        ▷ key → value
 3  freq ← empty map        ▷ key → frequency
 4  buckets ← empty map     ▷ frequency → LRU-list of keys (MRU front, LRU back)

TOUCH(key):                 ▷ bump key's frequency by 1
 5  f ← freq[key]
 6  REMOVE buckets[f], key
 7  if buckets[f] is empty
 8      if f = min_freq
 9          min_freq ← min_freq + 1     ▷ only ever +1 - never a search
10  freq[key] ← f + 1
11  ADD-FRONT buckets[f+1], key

GET(key):
12  if key ∉ val
13      return NIL
14  TOUCH(key)
15  return val[key]

PUT(key, value):
16  if cap = 0
17      return
18  if key ∈ val
19      val[key] ← value
20      TOUCH(key)
21      return
22  if size = cap                       ▷ full → evict
23      victim ← BACK(buckets[min_freq]) ▷ least-freq, then LRU
24      REMOVE buckets[min_freq], victim
25      delete val[victim], freq[victim]
26      size ← size − 1
27  val[key] ← value;  freq[key] ← 1
28  ADD-FRONT buckets[1], key
29  min_freq ← 1                         ▷ new key is always freq 1
30  size ← size + 1
```

**Python (idiomatic - `OrderedDict` is the per-frequency LRU list):**

```python
from collections import defaultdict, OrderedDict

class LFUCache:
    def __init__(self, capacity: int) -> None:
        self.cap = capacity
        self.min_freq = 0
        self.val: dict[int, int] = {}                       # key -> value
        self.freq: dict[int, int] = {}                      # key -> frequency
        # frequency -> keys at that freq, in LRU order (first = LRU, last = MRU)
        self.buckets: dict[int, "OrderedDict[int, None]"] = defaultdict(OrderedDict)

    def _touch(self, key: int) -> None:
        f = self.freq[key]
        del self.buckets[f][key]
        if not self.buckets[f]:
            del self.buckets[f]                             # drop empty bucket
            if f == self.min_freq:
                self.min_freq += 1                          # O(1) - never a scan
        self.freq[key] = f + 1
        self.buckets[f + 1][key] = None                    # appended = MRU end

    def get(self, key: int) -> int:
        if key not in self.val:
            return -1
        self._touch(key)
        return self.val[key]

    def put(self, key: int, value: int) -> None:
        if self.cap == 0:
            return
        if key in self.val:                                 # update is a use
            self.val[key] = value
            self._touch(key)
            return
        if len(self.val) >= self.cap:                       # full → evict
            victim, _ = self.buckets[self.min_freq].popitem(last=False)  # LRU of min freq
            if not self.buckets[self.min_freq]:
                del self.buckets[self.min_freq]
            del self.val[victim]
            del self.freq[victim]
        self.val[key] = value
        self.freq[key] = 1
        self.buckets[1][key] = None
        self.min_freq = 1                                   # new key is always freq 1
```

`OrderedDict.popitem(last=False)` pops the LRU end in O(1); appending a key puts it at the MRU end - the same two splices the hand-rolled doubly linked list does, with the pointer juggling hidden. Write the DLL from scratch only if asked to prove you understand the per-frequency LRU ordering.

## CP-primitives

LFU is rarely a contest problem by name, but its engine - **counted buckets with an O(1) min pointer** - is a reusable trick worth recognizing.

### Value-bucketed lists with a cached extreme - O(1) min/max-by-count

When you must repeatedly pull the element with the smallest (or largest) *count* and counts only move by ±1, bucket elements by count and cache the current min/max bucket index. Because counts step by one, the cached extreme updates in O(1) - no heap, no scan.

```python
buckets = defaultdict(OrderedDict)   # count -> elements at that count
min_c = 0
def bump(x, c):                      # move x from count c to c+1
    del buckets[c][x]
    if not buckets[c] and c == min_c: min_c += 1
    buckets[c + 1][x] = None
```

**Why for CP:** collapses "repeatedly extract-min-by-frequency with frequency updates" from O(log n)/heap to O(1) - the standard way to keep a sliding extreme when the key is an integer count that changes by one. Named appearances: **LeetCode 432 "All O`one` Data Structure"** (two-sided version of this exact trick - see practice #2), **460 "LFU Cache"**, and the count-bucket step inside the linear-time **Top-K Frequent** (#3). The recognition cue: *"all operations O(1)" + "the ordering key is an integer count that only ±1"* → bucket by count, cache the extreme, never heap.

### Three-map cross-index - O(1) lookup from any axis

Keeping `key→value`, `key→freq`, and `freq→keys` simultaneously means you can jump in O(1) from *any* of {a key, its value, its frequency} to the others. The general move: when a problem needs O(1) access along multiple keys, **maintain one map per access axis and update all of them together** on every mutation.

```python
val, freq, buckets = {}, {}, defaultdict(OrderedDict)
# any mutation updates ALL three so every axis stays O(1)-queryable
```

**Why for CP:** turns "search the structure along a secondary key" from O(n) into O(1), the backbone of all-O(1) design problems (LFU, "All O`one` Data Structure", insert/delete/getRandom).

## Gotchas / edge cases

- **`min_freq` updates are the whole correctness story.** It increments **only** when the current min bucket empties during a touch, and resets to **1** on every new insertion. Get either rule wrong and eviction silently picks the wrong victim. The reset-to-1 is the most-missed: a fresh key is always frequency 1, so it *is* the new minimum.
- **A new key enters at frequency 1, not 0.** Off-by-one here breaks the bucket math - `get` immediately after `put` should move the key to bucket 2. Seed at 1.
- **Update is a use.** `put` on an existing key must bump its frequency (like `get`), not just overwrite. Forgetting this means written-but-unread keys never gain frequency and get evicted wrongly - the same trap as [LRU](./lru-cache.md#gotchas--edge-cases), one level deeper.
- **Capacity 0.** `put` must no-op (don't seed a freq-1 key into a zero-capacity cache, or the next eviction underflows). Guard at the top.
- **Empty buckets must be removed (or skipped).** If you leave an empty `buckets[f]` in the map and later read its back to evict, you get a wrong/None victim. Either `del` the bucket when it empties, or guarantee `min_freq` only ever points at a non-empty one.
- **Plain LFU never forgets - the pollution trap.** Counts only grow; a once-popular key keeps a huge count and is effectively un-evictable even when cold. This is LFU's defining weakness and the reason production caches use **aging / Window-TinyLFU** ([Variants](#variants)). A senior answer names this unprompted.
- **At n > 10⁷ entries, the frequency-bucket map itself becomes the bottleneck (at-scale trap).** `buckets: freq → LRU-list` is a hash table keyed by frequency, so it inherits [hash table's rehash-stall risk](./hash-table.md#load-factor--resize) under a write-heavy `put` burst - a resize landing mid-burst stalls every concurrent cache access, not just one key's operation. Layered on top is LFU-specific: at huge n, the frequency distribution tends to concentrate (a small set of keys accumulate enormous counts under Zipfian access patterns typical of real caches), so `min_freq` rarely moves and the bucket at frequency 1 becomes a hot, high-churn structure - the opposite of the flat, evenly-spread access the design assumes at small n.

## What the interviewer probes for

**What changes if the cache needs to hold 10⁹ keys across a fleet, not 10⁴ on one box?** - A single-process `buckets` hash table stops being the bottleneck concern; the real shift is that no one machine can hold the working set, so you shard by key hash across many LFU instances, each independently tracking frequency for its own slice. That breaks *global* frequency ranking (a key hot only on one shard looks cold fleet-wide), which is exactly why production systems like Redis and CDN caches use per-node approximate counters (aged 8-bit counters, Count-Min Sketch) rather than a fleet-synchronized exact count - synchronizing exact frequencies across machines on every access would dominate the cache's own latency budget.

**Why not just use LRU instead of building this frequency machinery?** - LRU is simpler, cheaper (roughly 2x memory vs LFU's 3x per this article's Complexity summary), and correct for workloads with temporal locality. LFU earns its extra bucket-list and `min_freq` bookkeeping only when *popularity*, not recency, predicts reuse - a key hit constantly but with an occasional gap shouldn't be evicted just because a one-off scan streamed through. The Comparison table's tie-break column names the real cost: LFU also inherits LRU's ordering as its tie-breaker, so you're never getting LFU "instead of" LRU, only LRU plus a frequency axis on top.

**Does LFU need locking under concurrent access?** - Yes, more than LRU does. A single `get` touches three structures (`val`, `freq`, `buckets`) across two bucket-list splices, so a naive global lock serializes every cache access; the `min_freq` pointer update on a lock-free design is a genuine race (two threads emptying the same min bucket simultaneously could both try to increment it, or a delete could race an increment). Production implementations typically shard the cache into N independently-locked partitions by key hash rather than attempt fine-grained locking on the bucket structure itself.

## Practice problems

Five problems, each a **distinct** technique that LFU's design teaches - no two solved the same way.

### 1. LFU Cache - _frequency buckets + min_freq pointer, O(1)_

Design an LFU cache with O(1) `get` and `put`, evicting the least-frequently-used key (ties broken by LRU). Capacity given at construction; up to ~10⁵ operations. The canonical bucketed-frequency design this article teaches.

**Worked examples:**
- **Example 1**
  - **Input:** capacity = 2; put(1,1), put(2,2), get(1), put(3,3), get(2), get(3), put(4,4), get(1), get(3), get(4) | **Output:** get(1) → 1, get(2) → -1, get(3) → 3, get(1) → -1, get(3) → 3, get(4) → 4
  - **Explanation:** put(3,3) evicts key 2 (freq 1, the only min-freq candidate); put(4,4) evicts key 1 (tied at freq 2 with key 3, but key 1 is the older touch).
- **Example 2**
  - **Input:** capacity = 0; put(0,0), get(0) | **Output:** get(0) → -1
  - **Explanation:** zero capacity means every put is a no-op.

**Constraints:** `0 ≤ capacity ≤ 10⁴`, `0 ≤ key ≤ 10⁵`, `0 ≤ value ≤ 10⁹`, up to `2 × 10⁵` calls to `get`/`put`.

**Approach:** The canonical design: `val`/`freq` maps, `buckets: freq → LRU-list`, and a `min_freq` pointer that increments when the min bucket empties and resets to 1 on insert. The O(1)-on-eviction requirement is exactly what forces the `min_freq` cache instead of a heap or a scan.

```python
from collections import defaultdict, OrderedDict
class LFUCache:
    def __init__(self, capacity: int):
        self.cap, self.min_freq = capacity, 0
        self.val, self.freq = {}, {}
        self.buckets = defaultdict(OrderedDict)
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
        self.val[key], self.freq[key] = value, 1
        self.buckets[1][key] = None; self.min_freq = 1
```

**Complexity:** O(1) per op, O(capacity) space.

---

### 2. All O`one` Data Structure - _bucketed counts, O(1) min and max_

Support `inc(key)`, `dec(key)`, `getMaxKey()`, `getMinKey()`, all O(1). Counts move by ±1. Generalizes LFU's single-ended bucket trick to both extremes at once.

**Worked examples:**
- **Example 1**
  - **Input:** inc("hello"), inc("hello") | **Output:** getMaxKey() → "hello", getMinKey() → "hello"
  - **Explanation:** with only one distinct key, it's simultaneously both the max and min.
- **Example 2**
  - **Input:** inc("hello"), inc("hello"), inc("leet"), getMaxKey(), getMinKey() | **Output:** "hello", "leet"
  - **Explanation:** "hello" has count 2, "leet" has count 1, so the bucket list has two nodes and the ends read off directly.

**Constraints:** `1 ≤ key.length ≤ 10`, lowercase English letters, at most `5 × 10⁴` calls total, `getMaxKey`/`getMinKey` return `""` on an empty structure.

**Approach:** Generalizes LFU's bucket trick to **both** extremes. Keep a doubly linked list of count-buckets ordered by count, each bucket holding the set of keys at that count; `inc`/`dec` move a key to the adjacent bucket (creating/removing buckets as needed). `getMax`/`getMin` read the two ends of the bucket list. The ±1-step property is what keeps every operation O(1) - same engine as LFU's `min_freq`, made two-sided.

```python
class Bucket:
    __slots__ = ("count", "keys", "prev", "next")
    def __init__(self, count: int) -> None:
        self.count = count
        self.keys: set[str] = set()
        self.prev = self.next = None

class AllOne:
    def __init__(self) -> None:
        self.key_bucket: dict[str, Bucket] = {}
        self.head = Bucket(0)              # sentinel, count always 0 (below every real bucket)
        self.tail = Bucket(0)              # sentinel, count always +inf (above every real bucket)
        self.head.next = self.tail
        self.tail.prev = self.head

    def _insert_after(self, node: Bucket, count: int) -> Bucket:
        b = Bucket(count)
        b.prev, b.next = node, node.next
        node.next.prev = b
        node.next = b
        return b

    def _remove(self, b: Bucket) -> None:
        b.prev.next, b.next.prev = b.next, b.prev

    def inc(self, key: str) -> None:
        if key not in self.key_bucket:
            cur = self.head
        else:
            cur = self.key_bucket[key]
            cur.keys.discard(key)
        nxt = cur.next
        if nxt is self.tail or nxt.count != cur.count + 1:
            nxt = self._insert_after(cur, cur.count + 1)
        nxt.keys.add(key)
        self.key_bucket[key] = nxt
        if key not in cur.keys and cur is not self.head and not cur.keys:
            self._remove(cur)

    def dec(self, key: str) -> None:
        if key not in self.key_bucket:
            return
        cur = self.key_bucket[key]
        cur.keys.discard(key)
        if cur.count == 1:
            del self.key_bucket[key]
        else:
            prv = cur.prev
            if prv is self.head or prv.count != cur.count - 1:
                prv = self._insert_after(cur.prev, cur.count - 1)
            prv.keys.add(key)
            self.key_bucket[key] = prv
        if not cur.keys:
            self._remove(cur)

    def getMaxKey(self) -> str:
        return next(iter(self.tail.prev.keys)) if self.tail.prev is not self.head else ""

    def getMinKey(self) -> str:
        return next(iter(self.head.next.keys)) if self.head.next is not self.tail else ""
```

**Complexity:** O(1) per op, O(n) space.

---

### 3. Top K Frequent Elements - _bucket sort by frequency_

Given an array, return the `k` most frequent elements. Better than O(n log n) if possible. The *static* cousin of LFU's idea - buckets built once, not maintained live.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [1,1,1,2,2,3], k = 2 | **Output:** [1, 2]
  - **Explanation:** 1 appears 3 times, 2 appears twice, 3 appears once - the top 2 by frequency are 1 and 2.
- **Example 2**
  - **Input:** nums = [1], k = 1 | **Output:** [1]
  - **Explanation:** a single distinct value is trivially the most frequent.

**Constraints:** `1 ≤ nums.length ≤ 10⁵`, `-10⁴ ≤ nums[i] ≤ 10⁴`, `k` is guaranteed valid (`1 ≤ k ≤` number of distinct elements).

**Approach:** Instead of maintaining buckets live, build them once. Count with a [hash table](./hash-table.md), then **bucket by frequency** into an array indexed `0..n` (frequency can't exceed `n`), and sweep from the high-frequency end collecting `k`. O(n) total - no heap, no sort - because frequencies live in a bounded range, exactly why LFU buckets by count.

```python
def top_k_frequent(nums: list[int], k: int) -> list[int]:
    counts = {}
    for x in nums: counts[x] = counts.get(x, 0) + 1
    buckets = [[] for _ in range(len(nums) + 1)]      # index = frequency
    for x, c in counts.items(): buckets[c].append(x)
    out = []
    for c in range(len(nums), 0, -1):                 # high freq first
        for x in buckets[c]:
            out.append(x)
            if len(out) == k: return out
    return out
```

**Complexity:** O(n) time, O(n) space.

**Duplicate problems:**
- Top K Frequent Words (LC 692) - identical count-then-bucket-by-frequency-then-sweep technique, only the tie-break (lexicographic instead of arbitrary) differs.
- Sort Characters By Frequency (LC 451) - same static bucket-by-frequency array and high-to-low sweep, but emits every element in frequency order instead of stopping at k.

---

### 4. Maximum Frequency Stack (LC 895) - _live frequency-bucket eviction, LIFO within a bucket_

Design a stack-like structure: `push(val)` adds an element, and `pop()` removes and returns the **most frequent** element seen so far; ties broken by which was pushed most recently. Distinct from every entry above: eviction tracks the **maximum**, not the minimum, and each bucket is a plain stack (LIFO), not an LRU-ordered structure - there's no recency tie-break dimension at all, just push order within a frequency group.

**Worked examples:**
- **Example 1**
  - **Input:** push(5), push(7), push(5), push(7), push(4), push(5), then pop() ×4 | **Output:** 5, 7, 5, 4
  - **Explanation:** 5 has the highest frequency (3) so it pops first; the next pop re-evaluates and 7 (frequency 2, now the max among what remains) pops next; then 5 again (its second-most-recent push); then 4 (frequency 1).
- **Example 2**
  - **Input:** push(1), pop() | **Output:** 1
  - **Explanation:** a single element is trivially both the most frequent and the most recent.

**Constraints:** `0 ≤ val ≤ 10⁹`, at most `2 × 10⁴` calls to `push`, `pop` is only called when the structure is non-empty.

**Approach:** Maintain `freq: value → current count` and `group: frequency → stack of values pushed at that frequency`, plus a `max_freq` counter. `push` bumps the value's frequency and appends it to the new frequency's group stack; if that frequency is a new high, bump `max_freq`. `pop` pops from `group[max_freq]` (LIFO breaks the tie among equally-frequent values), decrements that value's tracked frequency, and drops `max_freq` by one if its group just emptied. This is live frequency-bucket eviction like LFU's `min_freq`, but mirrored to track a maximum and with no per-bucket ordering beyond push order - simpler than LFU because there's only one axis to tie-break on (recency-of-push), not two.

```python
from collections import defaultdict

class FreqStack:
    def __init__(self) -> None:
        self.freq: dict[int, int] = defaultdict(int)
        self.group: dict[int, list[int]] = defaultdict(list)   # freq -> stack of values
        self.max_freq = 0

    def push(self, val: int) -> None:
        f = self.freq[val] + 1
        self.freq[val] = f
        if f > self.max_freq:
            self.max_freq = f
        self.group[f].append(val)

    def pop(self) -> int:
        val = self.group[self.max_freq].pop()
        self.freq[val] -= 1
        if not self.group[self.max_freq]:      # bucket emptied → max drops by exactly 1
            self.max_freq -= 1
        return val
```

**Complexity:** O(1) per op, O(n) space.

**Duplicate problems:**
- LRU Cache - the recency-only sibling: no frequency dimension, no `min_freq`, no per-count buckets, just move-to-front on touch and pop-back on evict. Solving it right after LFU makes the extra machinery explicit - LFU is this plus a frequency axis and a min-pointer. See [LRU Cache](./lru-cache.md#1-lru-cache--map--doubly-linked-list-o1) for the full treatment.

