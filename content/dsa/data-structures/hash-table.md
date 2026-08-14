# Hash Table

## Prerequisites

- [Big-O Notation](../algorithms/big-o-notation.md) [Must read]
- [Array](./array.md) [Must read]
- [Linked List](./linked-list.md) [Should read]

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
- [<abbr>Hashing</abbr> & collisions](#hashing--collisions)
  - [The hash function](#the-hash-function)
  - [Collisions are inevitable](#collisions-are-inevitable)
  - [Chaining](#chaining)
  - [Open addressing](#open-addressing)
  - [Load factor & resize](#load-factor--resize)
- [Implementation](#implementation)
- [Gotchas / edge cases](#gotchas--edge-cases)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)
  - [1. Two Sum](#1-two-sum)
  - [2. Group Anagrams](#2-group-anagrams)
  - [3. Longest Consecutive Sequence](#3-longest-consecutive-sequence)
  - [4. Subarray Sum Equals K](#4-subarray-sum-equals-k)
  - [5. First Unique Character](#5-first-unique-character)
  - [6. Longest Common Subsequence](#6-longest-common-subsequence)

## What it is

A **hash table** maps keys to values by running each key through a **hash function** that computes an array index, so lookup, insert, and delete are **O(1) on average** - no search, just compute-where-it-goes and jump there.

Mental model: **a coat check.** You hand over a coat (the key); the attendant runs a rule on it (the hash function) to pick a numbered hook (the bucket), and hangs it there. To get it back, the same rule recomputes the same hook - no walking the racks. Two coats can hash to the same hook (a **<abbr>collision</abbr>**); the table needs a plan for that, and that plan is what separates a toy from a real hash table.

> **Takeaway (say this out loud):** "A hash table turns a key into an array index via a hash function, giving O(1) average lookup - the catch is collisions and the resize that keeps them rare."

## How it works

Three pieces: a backing **bucket array**, a **hash function** that maps a key to a bucket index, and a **collision strategy** for when two keys land in the same bucket.

```
key "apple"  ──hash──▶  3847122  ──% capacity (8)──▶  bucket 2
                                                         │
bucket array:   0     1     2      3     4     5     6     7
              [   ] [   ] [apple] [   ] [   ] [   ] [   ] [   ]
                            ▲ store (key, value) here; O(1) to compute + jump
```

**Lookup** runs the same hash on the query key, recomputes the same index, and checks that bucket - O(1) to compute, O(1) to jump. **Insert** does the same and writes there. **Delete** does the same and clears it. The array's [O(1) indexed access](./array.md) is what makes the jump free; the hash function is what turns an arbitrary key (a string, a tuple) into a valid index.

The whole structure rests on one bet: **the hash function spreads keys evenly across buckets**, so each bucket holds ~1 entry and the operations stay O(1). When that bet fails - many keys collide into one bucket - the bucket degrades into a linear scan and operations slide toward O(n). Keeping the bet good (a strong hash + resizing before buckets fill) is the entire engineering of a hash table, covered in [Hashing & collisions](#hashing--collisions).

## Operations

| Operation           | Time (avg) | Time (worst) | Space |
| ------------------- | ---------- | ------------ | ----- |
| Insert `m[k] = v`   | O(1)       | O(n)         | O(1)  |
| Lookup `m[k]`       | O(1)       | O(n)         | O(1)  |
| Delete `del m[k]`   | O(1)       | O(n)         | O(1)  |
| Membership `k in m` | O(1)       | O(n)         | O(1)  |
| Iterate all entries | O(n + b)   | O(n + b)     | O(1)  |

Worst case is O(n) when every key collides into one bucket (a degenerate hash or an adversarial input). `b` = number of buckets; iteration walks the whole bucket array, so a sparse table with many empty buckets still costs O(b). **There is no ordering** - iteration order is unspecified (insertion-ordered in CPython dicts since 3.7, but never sorted).

## Complexity summary

| Operation | Best | Average | Worst                       |
| --------- | ---- | ------- | --------------------------- |
| Insert    | O(1) | O(1)    | O(n) (all collide / resize) |
| Lookup    | O(1) | O(1)    | O(n) (all collide)          |
| Delete    | O(1) | O(1)    | O(n) (all collide)          |

**Space:** O(n) for n entries, **plus slack** - a hash table deliberately keeps its bucket array larger than the entry count (load factor < 1) to keep collisions rare, so true footprint is O(capacity), typically 1.3–2× the entries. The **amortized** O(1) insert hides occasional O(n) **resizes** (rehash every key into a bigger array), exactly like a [dynamic array's](./dynamic-array.md) doubling.

## When to use / when not

**Reach for a hash table when:**

- You need **key→value lookup or membership** by an arbitrary key - "have I seen x?", "what's the value for k?" - in O(1) average. This is the single most common interview data structure.
- You're **counting frequencies**, deduplicating, grouping by a key, or caching computed results (memoization).
- Order doesn't matter and you have a **good hash** for your key type.

**Reach for something else when:**

- **You need sorted order or range queries** ("all keys between a and b", "the smallest key") → a **balanced BST** / sorted structure gives O(log n) ordered ops; a hash table has no order at all. <!-- balanced-bst not yet written -->
- **You need guaranteed worst-case <abbr>latency</abbr>** → the O(n) resize/collision tail makes hash tables unsuitable for hard-real-time; a balanced tree's O(log n) is a firm ceiling.
- **Keys are small bounded integers** → a plain [array](./array.md) indexed directly (`freq[v]`) beats a hash table on constant factor with zero hashing overhead.
- **You need prefix lookups on string keys** → a [<abbr>trie</abbr>](./trie.md) gives prefix/autocomplete queries a hash table can't.

Rule of thumb: **hash table for "lookup by key, order irrelevant"; tree for "lookup by key, order matters."** If the problem says "sorted", "range", "next-greater-key", or "k-th smallest", it's not a hash table.

Real-world: hash tables back **database hash indexes and hash joins**, every language's `dict`/`map`/`object`, **in-memory caches** (Redis is essentially a giant hash table), symbol tables in compilers, and deduplication everywhere. The distributed cousin - spreading keys across many servers with minimal reshuffling on resize - is [<abbr>consistent hashing</abbr>](../../system-design/algorithms/consistent-hashing.md).

## Comparison

How the hash table stacks up against the structures you'd weigh it against in an interview:

| Structure            | Lookup by key | Insert/delete | Ordered?  | Range / min / k-th | Memory                 | Pick it when…                              |
| -------------------- | ------------- | ------------- | --------- | ------------------ | ---------------------- | ------------------------------------------ |
| **Hash table**       | **O(1)** avg  | **O(1)** avg  | no        | no (O(n))          | scattered + slack      | key→value lookup, counting, dedup          |
| Balanced BST         | O(log n)      | O(log n)      | **yes**   | **O(log n)**       | scattered + ptrs       | ordered keys, range queries, k-th smallest |
| Sorted array         | O(log n)      | O(n)          | yes       | O(log n) lookup    | contiguous, tight      | static data, binary search, cache-tight    |
| Direct-address array | **O(1)**      | **O(1)**      | by index  | by index           | contiguous, dense      | keys are small bounded integers            |
| Trie                 | O(L) by len   | O(L)          | by prefix | prefix queries     | scattered + child ptrs | string keys, prefix/autocomplete           |

The hash table's column is the only one with **O(1) average lookup for arbitrary keys**. Every rival either restricts the key type or buys ordering by giving up that O(1).

## Variants

- **Hash set** - values dropped, keys only; an O(1) membership structure (`x in s`). The dedup/seen-set workhorse. Its own page: [Hash Set](./hash-set.md).
- **Multimap** - one key → many values (a hash map whose value is a list/set). Used for grouping; Python's `collections.defaultdict(list)`.
- **Counter / multiset** - key → count; insertion increments rather than overwrites. `collections.Counter`. A frequency-map shape; see [First Unique Character](#5-first-unique-character) in Practice problems.
- **Ordered / insertion-ordered map** - preserves insertion order on iteration (Python `dict` since 3.7, Java `LinkedHashMap`). Still O(1); order is a free bonus, not a sorted order.
- **Concurrent hash map** - sharded/striped locking for thread-safe O(1) access (Java `ConcurrentHashMap`). The concurrency story, not a different algorithm.
- **Consistent hashing** - distributes keys across N servers so adding/removing a server reshuffles only ~1/N of keys, not all. The distributed-systems variant: [consistent hashing](../../system-design/algorithms/consistent-hashing.md).

## Hashing & collisions

This is the heart of the structure - everything that separates a real hash table from "an array with a `%`" lives here.

### The hash function

A **hash function** maps a key of any type to a fixed-size integer (the hash code), which is then reduced to a bucket index, usually `hash(key) % capacity`. A good hash function has three properties:

- **Deterministic** - the same key always hashes to the same code (or lookup can't find what insert stored).
- **Uniform** - codes spread evenly across the range, so keys spread evenly across buckets. Clustering is what kills O(1).
- **Fast** - computed on every operation; a slow hash erases the speed win.

```
"cat"  ──▶  3,138,9912  ──% 8──▶  bucket 0
"dog"  ──▶  4,001,2233  ──% 8──▶  bucket 1
"cot"  ──▶  3,138,0012  ──% 8──▶  bucket 4    small key change → very different code (avalanche)
```

The **avalanche** property - a one-bit change in the key flips ~half the output bits - is why `"cat"` and `"cot"` don't cluster. For integer keys, `% capacity` with a **prime** capacity (or a good multiplicative/Fibonacci hash) avoids patterns; for strings, a polynomial rolling hash (`h = h*31 + c`) is the classic.

### Collisions are inevitable

By the **pigeonhole principle**, mapping an unbounded key space into `b` buckets _must_ produce collisions - two distinct keys with the same bucket index. And by the **birthday paradox**, they come far sooner than intuition suggests: with just ~√b inserted keys you already expect a collision. So a hash table is defined not by avoiding collisions (impossible) but by **resolving** them. Two families:

### Chaining

Each bucket holds a **[linked list](./linked-list.md)** (or small dynamic array) of all entries that hash there. Collisions just append to the chain; lookup hashes to the bucket, then walks its chain comparing keys.

```
bucket 2: ──▶ [("apple", 3)] ──▶ [("grape", 9)] ──▶ /     two keys collided here
```

- **Pro:** simple; handles high load factor gracefully (degrades smoothly); deletion is trivial (unlink).
- **Con:** pointer overhead per entry; chains scatter in memory → cache misses; a bad hash degrades a bucket to an O(n) list. Java's `HashMap` upgrades a long chain to a balanced tree (O(log n)) past a threshold to bound the damage.

### Open addressing

All entries live **in the bucket array itself** - no chains. On collision, **probe** for the next free slot by a rule: **linear probing** (`+1, +2, …` - cache-friendly but suffers primary clustering), **quadratic probing** (`+1, +4, +9, …` - breaks clusters), or **double hashing** (step size from a second hash - best spread). Lookup probes the same sequence until it finds the key or an empty slot.

```
linear probing, "grape" wants bucket 2 but it's taken:
   0     1     2        3        4
 [   ] [   ] [apple] [grape] [   ]     probe 2 → full → try 3 → free → place
```

- **Pro:** no pointers, everything inline → excellent cache locality, lower memory. CPython's `dict` uses open addressing.
- **Con:** clustering degrades probes; **deletion needs tombstones** (a "was-here" marker), or lookups for later keys stop early at the gap; performance collapses as load factor nears 1, so it must resize earlier (typically ≤ 0.66).

### Load factor & resize

The **load factor** α = entries / buckets is the dial that controls collision rate. As α rises, chains lengthen / probes grow, and O(1) slips toward O(n). The fix: when α crosses a threshold (chaining ~0.75, open addressing ~0.66), **resize** - allocate a bigger bucket array (usually 2×) and **rehash every entry** into it (the index `hash % capacity` changes when capacity changes, so you can't just copy).

```
α = 6/8 = 0.75 → resize to 16 buckets → rehash all 6 keys → α = 6/16 = 0.375
```

Resize is **O(n)** - but it happens rarely (every doubling), so it amortizes to **O(1) per insert**, the same geometric argument as [dynamic-array doubling](./dynamic-array.md#memory-layout). This is why insert is "O(1) average/amortized, O(n) worst": the worst is a resize landing on your insert.

**The accounting, shown on-page.** Charge every `insert` 3 credits: 1 pays for its own bucket write, 2 are banked toward a future resize. A resize triggers when the table has grown to `n` entries, having last resized at `n/2` - so the `n/2` inserts since then banked `2 × n/2 = n` credits, exactly enough to pay the O(n) cost of rehashing every one of the `n` entries into the new table. Every single `insert` is O(1) in banked-credit terms; the resize's real O(n) cost is paid out of credits accumulated earlier, never charged to any one insert on the spot. Summed over `n` inserts, total cost is O(n) → **O(1) amortized per insert**, and the O(n) figure that shows up on one unlucky insert is real wall-clock time, not a violation of the amortized bound - amortized means the *average* over a sequence, not a guarantee on any single call.

## Implementation

A separate-chaining hash table with the core ops. Pseudocode states the contract; Python is the idiomatic reference (in real life you'd just use `dict` - this is to show the machinery).

**Pseudocode (CLRS-style contract):**

```
HASH-INSERT(T, k, v)
1   if T.size / T.capacity ≥ MAX_LOAD          ▷ resize before it gets crowded
2       HASH-RESIZE(T, 2 × T.capacity)
3   i = HASH(k) mod T.capacity
4   for each (key, val) in T.buckets[i]
5       if key == k
6           update its value to v; return
7   append (k, v) to T.buckets[i]
8   T.size = T.size + 1

HASH-GET(T, k)
1   i = HASH(k) mod T.capacity
2   for each (key, val) in T.buckets[i]
3       if key == k
4           return val
5   return NOT-FOUND
```

**Python (reference - idiomatic):**

```python
from typing import Generic, Hashable, Iterator, Optional, TypeVar

K = TypeVar("K", bound=Hashable)
V = TypeVar("V")

class HashMap(Generic[K, V]):
    """Separate-chaining hash map; resizes at load factor 0.75."""

    def __init__(self, capacity: int = 8) -> None:
        self._capacity = capacity
        self._size = 0
        self._buckets: list[list[tuple[K, V]]] = [[] for _ in range(capacity)]

    def _index(self, key: K) -> int:
        return hash(key) % self._capacity

    def put(self, key: K, value: V) -> None:
        if self._size / self._capacity >= 0.75:
            self._resize(self._capacity * 2)
        bucket = self._buckets[self._index(key)]
        for i, (k, _) in enumerate(bucket):
            if k == key:
                bucket[i] = (key, value)
                return
        bucket.append((key, value))
        self._size += 1

    def get(self, key: K) -> Optional[V]:
        for k, v in self._buckets[self._index(key)]:
            if k == key:
                return v
        return None

    def _resize(self, new_capacity: int) -> None:
        old = self._buckets
        self._capacity = new_capacity
        self._buckets = [[] for _ in range(new_capacity)]
        self._size = 0
        for bucket in old:
            for k, v in bucket:
                self.put(k, v)

    def __iter__(self) -> Iterator[K]:
        return (k for bucket in self._buckets for k, _ in bucket)
```

**Contest velocity - never hand-roll this.** In a contest you use the built-ins, which are the fast path:

```python
from collections import defaultdict, Counter

d = defaultdict(int)          # missing keys default to 0 - no `if k in d` guard
d[x] += 1

c = Counter(words)
c.most_common(3)

seen = set()                  # O(1) membership - the seen-set pattern
```

`dict`/`set`/`Counter`/`defaultdict` are C-implemented open-addressing tables - orders of magnitude faster than the teaching class above. The class is for explaining collisions, not for the contest.

## Gotchas / edge cases

- **Mutable keys are a landmine.** A key's hash must never change while it's in the table. Using a `list` as a key fails (unhashable in Python); worse, mutating an object after insertion (in languages that allow it) makes its old slot unreachable - the entry is "lost" though still in memory. **Keys must be immutable** (`tuple`, not `list`; `frozenset`, not `set`).
- **O(1) is _average_, not guaranteed.** A degenerate hash or adversarial input (all keys colliding) degrades every op to O(n). Hash-flooding DoS attacks exploit exactly this; production hash tables use **randomized seeds** (Python's `PYTHONHASHSEED`) to defeat crafted-collision attacks. Never claim worst-case O(1) in an interview - say "O(1) average, O(n) worst on collisions".
- **Resize cost hides in the average.** Insert is <abbr>amortized</abbr> O(1), but a single insert that triggers a rehash is O(n). If the problem cares about worst-case per-op latency (real-time systems), the hash table's resize spike disqualifies it - reach for a balanced tree's firm O(log n).
- **Iteration order is not sorted.** CPython preserves _insertion_ order, but that is not sorted order and is not portable across languages. If you need sorted output, sort explicitly or use a tree - relying on dict order for sortedness is a classic bug.
- **`==` and `hash` must agree (the contract).** Two keys equal by `==` must have the same hash, or lookup misses entries it should find. When you make a custom class a key, override **both** `__hash__` and `__eq__` consistently - overriding one without the other silently breaks the table.
- **`float` keys and NaN.** `NaN != NaN`, so a `NaN` key can never be looked up again (it won't equal itself); float keys also suffer precision surprises. Avoid floats as keys; use a rounded/int representation.

## What the interviewer probes for

**What changes at n = 10⁹ entries - is O(1) lookup still true?** - The per-lookup cost stays O(1) average, but the *system* around it changes: a table that large won't fit in one machine's memory, so you shard across nodes ([consistent hashing](../../system-design/algorithms/consistent-hashing.md)), and even in-memory the O(n) resize/rehash pass becomes a multi-second stall that a live service can't absorb on the thread doing the insert. Production systems at that scale use incremental resizing (rehash a few buckets per operation instead of all at once) specifically to avoid that stall - "O(1) amortized" hides a real latency cliff that gets worse, not better, as n grows.

**Why not always use open addressing instead of chaining, since it has better cache locality?** - Open addressing packs everything inline (no pointer chasing), which is why CPython's `dict` uses it, but it degrades sharply as load factor approaches 1 (probe sequences lengthen) and deletion needs tombstones or lookups break; chaining degrades more gracefully under high load and deletes trivially by unlinking, at the cost of pointer overhead and scattered chain memory. Pick open addressing when memory and cache locality dominate (CPython's choice); pick chaining when load factor is hard to bound in advance or deletions are frequent.

**How would this work with concurrent writers from multiple threads?** - A single lock around the whole table serializes every operation, killing the O(1) win under contention. Java's `ConcurrentHashMap` instead shards the bucket array into independent segments, each with its own lock (or lock-free CAS on modern versions), so unrelated keys rarely contend - the same idea as [consistent hashing](../../system-design/algorithms/consistent-hashing.md) applied to a single process instead of a cluster.

## Practice problems

Five staples, each a **distinct** hashing technique - no two solved the same way.

### 1. Two Sum

Given an integer array `nums` and a target, return the indices of the two numbers that add to `target`. Exactly one solution exists. The seen-map/complement-lookup primitive in its purest form.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [2, 7, 11, 15], target = 9 | **Output:** [0, 1]
  - **Explanation:** nums[0] + nums[1] = 2 + 7 = 9.
- **Example 2**
  - **Input:** nums = [3, 2, 4], target = 6 | **Output:** [1, 2]
  - **Explanation:** nums[1] + nums[2] = 2 + 4 = 6; note the answer isn't necessarily the first pair scanned.

**Constraints:** `2 ≤ nums.length ≤ 10⁴`, `-10⁹ ≤ nums[i] ≤ 10⁹`, exactly one valid answer exists.

**Approach:** The seen-map primitive: sweep once, storing each value→index. For each `x`, check if `target - x` is already in the map - if so, you've found the pair in O(1). One pass, trading O(n) memory to drop the brute-force O(n²) double loop. Storing the index (not just the value) lets you return positions.

```python
def two_sum(nums: list[int], target: int) -> list[int]:
    seen: dict[int, int] = {}            # value -> index
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []
```

**Complexity:** O(n) time, O(n) space.

**Duplicate problems:**
- Two Sum IV - Input is a BST (LC 653) - same seen-set complement lookup, applied during a tree traversal instead of a linear array scan.
- 4Sum II (LC 454) - same complement-lookup trick generalized to pairwise sums from two arrays stored in a hashmap.

---

### 2. Group Anagrams

Given a list of strings, group the anagrams together (any order). The canonical-key/bucketing technique - hashing a derived signature rather than the raw value.

**Worked examples:**
- **Example 1**
  - **Input:** words = ["eat","tea","tan","ate","nat","bat"] | **Output:** [["eat","tea","ate"],["tan","nat"],["bat"]]
  - **Explanation:** "eat", "tea", "ate" all sort to "aet"; "tan", "nat" both sort to "ant"; "bat" is alone.
- **Example 2**
  - **Input:** words = [""] | **Output:** [[""]]
  - **Explanation:** a single empty string forms its own group of one.

**Constraints:** `1 ≤ words.length ≤ 10⁴`, `0 ≤ words[i].length ≤ 100`, lowercase English letters only.

**Approach:** Two strings are anagrams iff their sorted characters match - so the **sorted string is a canonical key**. Bucket each word under its sorted-char signature in a `defaultdict(list)`. (Faster signature: a 26-count tuple, avoiding the O(L log L) sort.) Hashing a derived canonical key is the grouping primitive.

```python
def group_anagrams(words: list[str]) -> list[list[str]]:
    groups: dict[str, list[str]] = {}
    for w in words:
        key = "".join(sorted(w))
        groups.setdefault(key, []).append(w)
    return list(groups.values())
```

**Complexity:** O(n · L log L) time (L = max word length), O(n · L) space.

**Duplicate problems:**
- Group Shifted Strings (LC 249) - same canonical-key bucketing technique; the key is a shift-normalized signature (difference between consecutive letters) instead of a sorted string, but the grouping mechanic is identical.

---

### 3. Longest Consecutive Sequence

Given an unsorted integer array, return the length of the longest run of consecutive integers. Must run in O(n) - no sorting. The set-membership technique: turning "is the next value present?" into O(1).

**Worked examples:**
- **Example 1**
  - **Input:** nums = [100,4,200,1,3,2] | **Output:** 4
  - **Explanation:** the run 1,2,3,4 is the longest consecutive sequence (100 and 200 are isolated).
- **Example 2**
  - **Input:** nums = [0,3,7,2,5,8,4,6,0,1] | **Output:** 9
  - **Explanation:** the run 0,1,2,3,4,5,6,7,8 spans nine consecutive values; duplicates in the input don't extend it.

**Constraints:** `0 ≤ nums.length ≤ 10⁵`, `-10⁹ ≤ nums[i] ≤ 10⁹`.

**Approach:** Put everything in a set for O(1) membership. Only start counting a run at a value that has **no left neighbor** (`x-1 not in set`) - that guarantees each run is walked once, keeping it O(n) overall despite the inner while. The set turns "is x+1 present?" into O(1), which is the whole trick.

```python
def longest_consecutive(nums: list[int]) -> int:
    s = set(nums)
    best = 0
    for x in s:
        if x - 1 not in s:                # only start at a run's beginning
            length = 1
            while x + length in s:
                length += 1
            best = max(best, length)
    return best
```

**Complexity:** O(n) time, O(n) space.

---

### 4. Subarray Sum Equals K

Count contiguous subarrays of `nums` (values may be negative) whose sum equals `k`. The prefix-sum-plus-hashmap technique - the hashmap is the load-bearing structure that makes this problem's home here rather than on [Array](./array.md), since a plain sliding window can't handle negative values.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [1,1,1], k = 2 | **Output:** 2
  - **Explanation:** the two adjacent pairs [1,1] (indices 0-1 and 1-2) both sum to 2.
- **Example 2**
  - **Input:** nums = [1,2,3], k = 3 | **Output:** 2
  - **Explanation:** [1,2] and the standalone [3] both sum to 3.

**Constraints:** `1 ≤ nums.length ≤ 2 × 10⁴`, `-1000 ≤ nums[i] ≤ 1000`, `-10⁷ ≤ k ≤ 10⁷`.

**Approach:** `sum(i..j] == k` ⟺ `prefix[j] - prefix[i] == k` ⟺ `prefix[i] == prefix[j] - k`. Sweep keeping a running prefix and a **hashmap of how many times each prefix value has occurred**; at each step add the count of `prefix - k`. Hashing prefix sums turns an O(n²) range scan into O(n) - and handles negatives, which a sliding window can't.

```python
def subarray_sum(nums: list[int], k: int) -> int:
    count = prefix = 0
    seen: dict[int, int] = {0: 1}         # empty prefix
    for x in nums:
        prefix += x
        count += seen.get(prefix - k, 0)
        seen[prefix] = seen.get(prefix, 0) + 1
    return count
```

**Complexity:** O(n) time, O(n) space.

**Duplicate problems:**
- Contiguous Array (LC 525) - same prefix-sum + hashmap-of-first-occurrence technique, with values transformed to +1/-1 before accumulating.
- Subarray Sums Divisible by K (LC 974) - same prefix-sum + hashmap counting, keyed by remainder mod K instead of raw prefix value.

---

### 5. First Unique Character

Given a string, return the index of the first non-repeating character, or -1 if none. The counter primitive in its plainest form - two passes over a frequency map.

**Worked examples:**
- **Example 1**
  - **Input:** s = "leetcode" | **Output:** 0
  - **Explanation:** 'l' at index 0 is the first character that appears exactly once.
- **Example 2**
  - **Input:** s = "aabb" | **Output:** -1
  - **Explanation:** every character repeats, so no unique character exists.

**Constraints:** `1 ≤ s.length ≤ 10⁵`, lowercase English letters only.

**Approach:** Two passes with a frequency map: first count every character, then scan left to right for the first with count 1. The counter primitive in its plainest form - O(n) instead of an O(n²) "for each char, scan the rest". A bounded 26-array would shave the constant (see [Array's Counter / bucket array variant](./array.md#variants)).

```python
def first_uniq_char(s: str) -> int:
    freq: dict[str, int] = {}
    for ch in s:
        freq[ch] = freq.get(ch, 0) + 1
    for i, ch in enumerate(s):
        if freq[ch] == 1:
            return i
    return -1
```

**Complexity:** O(n) time, O(1) space (alphabet bounded at 26).

**Duplicate problems:**
- Sort Characters By Frequency (LC 451) - same count-then-scan frequency map, but sorts by count instead of scanning for the first count-1 character.

---

### 6. Longest Common Subsequence

Given two strings, return the length of their longest common subsequence (a sequence that appears in both, not necessarily contiguous).

**Worked examples:**
- **Example 1**
  - **Input:** text1 = "abcde", text2 = "ace" | **Output:** 3
  - **Explanation:** "ace" is a subsequence of both strings, and no longer common subsequence exists.
- **Example 2**
  - **Input:** text1 = "abc", text2 = "def" | **Output:** 0
  - **Explanation:** the two strings share no characters at all, so the longest common subsequence is empty.

**Constraints:** `1 ≤ text1.length, text2.length ≤ 1000`, lowercase English letters only.

**Approach:** The recurrence `lcs(i, j) = lcs(i+1, j+1) + 1` if `text1[i] == text2[j]`, else `max(lcs(i+1, j), lcs(i, j+1))` has overlapping subproblems indexed by a **pair** `(i, j)` - a compound state that a single-integer key can't represent. Python hashes any immutable value, so a `dict[tuple[int, int], int]` memoizes directly on the `(i, j)` pair with no need to invent a flat encoding (like `i * len(text2) + j`) the way a language without tuple-hashing would require. This is a different use of hashing than a canonical-key bucketing problem (entry 2): here the hashed key isn't grouping equal items, it's addressing a point in a multi-dimensional recursion state space.

```python
from functools import lru_cache

def longest_common_subsequence(text1: str, text2: str) -> int:
    @lru_cache(maxsize=None)
    def lcs(i: int, j: int) -> int:            # memo key is the tuple (i, j)
        if i == len(text1) or j == len(text2):
            return 0
        if text1[i] == text2[j]:
            return 1 + lcs(i + 1, j + 1)
        return max(lcs(i + 1, j), lcs(i, j + 1))

    return lcs(0, 0)
```

**Complexity:** O(n · m) time and space (n, m = string lengths; each of the n·m `(i, j)` states memoized once).

**Duplicate problems:**
- Edit Distance (LC 72) - same `(i, j)`-tuple-keyed memoization over two string pointers, with insert/delete/replace costs added to the recurrence instead of a match/no-match choice.
- Distinct Subsequences (LC 115) - same two-pointer `(i, j)` state space hashed via a tuple key, counting ways instead of taking a max/min.

