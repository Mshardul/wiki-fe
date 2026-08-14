# Hash Set

## Prerequisites

- [Big-O Notation](../algorithms/big-o-notation.md) [Must read]
- [Hash Table](./hash-table.md) [Must read]

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
- [Hashing & collisions](#hashing--collisions)
- [Implementation](#implementation)
- [Gotchas / edge cases](#gotchas--edge-cases)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)
  - [Contains Duplicate](#1-contains-duplicate)
  - [Intersection of Two Arrays](#2-intersection-of-two-arrays)
  - [Longest Consecutive Sequence](#3-longest-consecutive-sequence)
  - [Happy Number](#4-happy-number)

## What it is

A **hash set** is a [hash table](./hash-table.md) with the value dropped - it stores only keys and answers one question, "is `x` in here?", in **O(1) average**.

Mental model: **a guest list at a door.** The bouncer doesn't care what you brought, only whether your name is on the list - a yes/no lookup, not a lookup-and-return. That's the whole structural difference from a hash table: no payload, just membership.

> **Takeaway (say this out loud):** "A hash set is a hash table with the value thrown away - O(1) average membership, the backbone of every 'have I seen this?' and dedup problem."

## How it works

Structurally identical to a hash table minus the stored value: a **bucket array**, a **hash function** mapping each element to a bucket index, and a **collision strategy**. Where a hash table stores `(key, value)` pairs, a hash set stores just `key` (or `(key, sentinel)` internally, if the implementation reuses hash-table machinery - CPython's `set` does exactly this, backed by the same open-addressing table as `dict`).

```
add("apple")  ──hash──▶  3847122  ──% capacity (8)──▶  bucket 2
                                                          │
bucket array:   0     1     2       3     4     5     6     7
              [   ] [   ] [apple] [   ] [   ] [   ] [   ] [   ]
                            ▲ presence only - no value slot
```

**Membership test** (`x in s`) hashes `x`, jumps to the bucket, and checks whether `x` is present among the (possibly colliding) entries there - O(1) to compute the index, O(1) expected to confirm presence. **Add** does the same walk and inserts if absent. **Remove** does the same walk and deletes if present. Every mechanism that makes a hash table's lookup O(1) - a well-spread hash, a collision strategy, resizing before the load factor climbs - applies unchanged; a hash set is a hash table with the value column deleted, not a different structure.

## Operations

| Operation      | Time (avg) | Time (worst) | Space |
| -------------- | ---------- | ------------ | ----- |
| Add `s.add(x)` | O(1)       | O(n)         | O(1)  |
| Remove `s.discard(x)` | O(1) | O(n)        | O(1)  |
| Membership `x in s` | O(1)  | O(n)         | O(1)  |
| Iterate all elements | O(n + b) | O(n + b) | O(1)  |
| Union / intersection / difference | O(min(n, m)) or O(n + m)* | O(n · m) | O(n + m) |

`b` = number of buckets. Worst case O(n) is the same degenerate-collision scenario as a hash table. *Set algebra: CPython iterates the smaller set and probes the larger for intersection (O(min(n, m))), and iterates both for union (O(n + m)) - see [Practice problems › Intersection of Two Arrays](#2-intersection-of-two-arrays).

## Complexity summary

| Operation   | Best | Average | Worst                       |
| ----------- | ---- | ------- | ---------------------------- |
| Add         | O(1) | O(1)    | O(n) (all collide / resize)  |
| Remove      | O(1) | O(1)    | O(n) (all collide)           |
| Membership  | O(1) | O(1)    | O(n) (all collide)           |

**Space:** O(n) for n elements, plus the same slack a hash table carries - the bucket array is kept larger than the element count (load factor < 1) to hold collisions down, typically 1.3-2x the element count. The **amortized** O(1) add hides occasional O(n) resizes, identical to [hash table's resize argument](./hash-table.md#load-factor--resize) and a [dynamic array's](./dynamic-array.md) doubling - see [Hashing & collisions](#hashing--collisions) for the accounting.

## When to use / when not

**Reach for a hash set when:**

- The question is purely **"have I seen this?"** or **"is x present?"** - no associated value to store. Deduplicating a stream, tracking visited nodes in BFS/DFS, a seen-set for complement lookups.
- You need **set algebra** - union, intersection, difference between two collections - and don't care about order.
- You're **deduplicating** a collection: `list(set(items))` drops duplicates in O(n).

**Reach for something else when:**

- **You need to associate a value with each key** ("count how many", "map key to something") → a [hash table](./hash-table.md) - a hash set literally can't hold a value, so a `dict` mapping key→1 or key→count is the tool the moment you need more than yes/no.
- **You need sorted order or range queries** ("smallest element ≥ x", "all elements between a and b") → a balanced BST / sorted structure; a hash set has no order at all. <!-- balanced-bst.md exists but is a hub; keep plain-text if unsure -->
- **Elements are small bounded integers and you'd otherwise build a set of them** → a boolean [array](./array.md) (`seen[v]`) beats a hash set on constant factor, no hashing overhead at all (see [Set-vs-array for small bounded domains](#gotchas--edge-cases)).
- **You need prefix membership on strings** ("does any word start with this prefix?") → a [trie](./trie.md); a hash set of whole strings can't answer prefix queries without scanning every entry.

Rule of thumb: **hash table when you need to store something per key; hash set when the key's presence is the entire answer.** If the sentence is "map/count/associate", it's a hash table; if it's "have I seen/contains/is present", it's a hash set.

Real-world: hash sets back **deduplication pipelines** (log ingestion, ETL dedup keys), **visited-node tracking** in graph search, browser **"seen URL" caches**, and language-level `set` types everywhere. Where exact membership is too memory-heavy at huge scale (billions of items, some false positives tolerable), the probabilistic cousin is a [Bloom filter](./bloom-filter.md) - trading a small false-positive rate for O(1) space per element instead of O(1) time per stored key.

## Comparison

| Structure            | Membership | Add/remove | Ordered?  | Stores a value? | Memory              | Pick it when…                              |
| --------------------- | ---------- | ---------- | --------- | ---------------- | -------------------- | -------------------------------------------- |
| **Hash set**           | **O(1)** avg | **O(1)** avg | no      | no                | scattered + slack    | pure membership, dedup, seen-set             |
| Hash table             | O(1) avg   | O(1) avg   | no        | **yes**           | scattered + slack    | key needs an associated value/count          |
| Sorted array / BST     | O(log n)   | O(log n)/O(n) | **yes** | optional          | contiguous or ptrs   | need ordered iteration or range queries too - the O(log n) tax buys sortedness a hash set can't |
| Bloom filter           | O(k), **may false-positive** | O(k) add-only (no remove) | no | no    | **O(m) bits**, sublinear in n | billions of elements, a small false-positive rate is acceptable, memory is the binding constraint |
| Boolean array (direct-address) | **O(1)** | **O(1)** | by index | no        | contiguous, dense    | keys are small bounded integers (0..k) - zero hashing overhead, beats hash set's constant factor |

The hash set's column is the cheapest correct answer for "arbitrary key, yes/no, no value" - every rival either adds a capability (order, values, sub-linear memory) at a real cost (log n ops, false positives, or a bounded key domain).

## Variants

- **Multiset / counting set** - tracks how many times each element was added rather than just presence; really a hash table keyed by element with an integer count (`collections.Counter`). Covered in full on [Hash Table's Variants](./hash-table.md#variants).
- **Ordered set** - preserves insertion order on iteration (Python's `dict`-backed insertion order applies to `dict.fromkeys()`; some languages expose `LinkedHashSet`). Still O(1); the order is a side effect of implementation, not a sorted order.
- **Frozen / immutable set** - `frozenset` in Python - hashable itself, so it can be a key in another set or dict. The technique that lets you memoize on "which subset of items" as a compound key.
- **Concurrent set** - sharded/striped locking for thread-safe O(1) access (Java `ConcurrentHashMap.newKeySet()`), same concurrency story as a concurrent hash table.
- **Bloom filter** - the probabilistic, sub-linear-memory relative for when exact membership at billions-of-elements scale doesn't fit in RAM. One-line pointer here; full treatment on its own page: [Bloom Filter](./bloom-filter.md).

## Hashing & collisions

Everything that makes a hash set's membership test O(1) is inherited unchanged from the hash table - this section states the shared mechanism at the depth a hash-set article needs, without re-deriving what [Hash Table's Hashing & collisions](./hash-table.md#hashing--collisions) already covers in full.

**The hash function.** Same three properties as a hash table: deterministic (the same element always hashes the same), uniform (spreads elements evenly across buckets so no bucket gets crowded), fast (computed on every add/remove/membership check). A hash set has no keys-vs-values distinction to complicate this - the element itself is hashed, full stop.

**Collision resolution.** The same two families apply: **chaining** (each bucket holds a small list of colliding elements; membership walks the chain comparing elements) or **open addressing** (all elements live inline in the bucket array; a collision probes forward by a rule - linear, quadratic, or double hashing - until it finds the element or an empty slot). CPython's `set` uses open addressing with the same probing strategy as `dict`, since it's implemented as a `dict` with dummy values under the hood.

**Load factor & resize (the amortized argument, DS9a).** Let α = elements / buckets. As α climbs past a threshold (≈0.66 for open addressing, matching `dict`/`set`'s internal table), the structure **resizes**: allocate a bucket array roughly 2x the size and **rehash every element** into it, since `hash(x) % new_capacity` differs from the old index. A single resize costs O(n) - touching every element - but resizes happen only when the table has grown by a constant factor since the last one, so they occur O(log n) times over n insertions total.

**The accounting.** Charge every `add` 3 "credits": 1 to pay for its own insertion, 2 banked for a future resize. When a resize triggers at n elements (having doubled from n/2 since the last resize), the n/2 elements added since then have banked 2 × n/2 = n credits - exactly enough to pay the O(n) cost of moving every element into the new table. Every `add` is O(1) in banked-credit terms, so total cost over n adds is O(n) - i.e. **O(1) amortized per add**, even though any single add that triggers a resize costs O(n) in wall-clock time. This is the identical argument to a [dynamic array's doubling](./dynamic-array.md) and [hash table's resize](./hash-table.md#load-factor--resize) - a hash set's resize is a rehash of the same shape, just without values to carry along.

## Implementation

A separate-chaining hash set, mirroring [Hash Table's Implementation](./hash-table.md#implementation) with the value column removed.

**Pseudocode (CLRS-style contract):**

```
SET-ADD(S, x)
1   if S.size / S.capacity ≥ MAX_LOAD          ▷ resize before it gets crowded
2       SET-RESIZE(S, 2 × S.capacity)
3   i = HASH(x) mod S.capacity
4   for each y in S.buckets[i]
5       if y == x
6           return                              ▷ already present, no-op
7   append x to S.buckets[i]
8   S.size = S.size + 1

SET-CONTAINS(S, x)
1   i = HASH(x) mod S.capacity
2   for each y in S.buckets[i]
3       if y == x
4           return TRUE
5   return FALSE
```

**Python (reference - idiomatic):**

```python
from typing import Generic, Hashable, Iterator, TypeVar

T = TypeVar("T", bound=Hashable)

class HashSet(Generic[T]):
    """Separate-chaining hash set; resizes at load factor 0.75."""

    def __init__(self, capacity: int = 8) -> None:
        self._capacity = capacity
        self._size = 0
        self._buckets: list[list[T]] = [[] for _ in range(capacity)]

    def _index(self, x: T) -> int:
        return hash(x) % self._capacity

    def add(self, x: T) -> None:
        if self._size / self._capacity >= 0.75:
            self._resize(self._capacity * 2)
        bucket = self._buckets[self._index(x)]
        if x not in bucket:
            bucket.append(x)
            self._size += 1

    def __contains__(self, x: T) -> bool:
        return x in self._buckets[self._index(x)]

    def _resize(self, new_capacity: int) -> None:
        old = self._buckets
        self._capacity = new_capacity
        self._buckets = [[] for _ in range(new_capacity)]
        self._size = 0
        for bucket in old:
            for x in bucket:
                self.add(x)

    def __iter__(self) -> Iterator[T]:
        return (x for bucket in self._buckets for x in bucket)
```

**Contest velocity - never hand-roll this.** Python's built-in `set` is a C-implemented open-addressing table, orders of magnitude faster than the teaching class above:

```python
seen: set[int] = set()
seen.add(x)
x in seen                     # O(1) membership
seen.discard(x)                # remove without KeyError if absent

a, b = {1, 2, 3}, {2, 3, 4}
a & b, a | b, a - b            # intersection, union, difference - all near-linear
```

## Gotchas / edge cases

- **Elements must be hashable and immutable**, exactly like hash table keys. A `list` can't go in a `set` (unhashable); a `tuple` or `frozenset` can. Mutating an object after adding it (in languages that permit mutable set elements) corrupts the bucket it's stored under - the element becomes unfindable though still present in memory.
- **O(1) is average, not guaranteed.** Adversarial input crafted to collide every element degrades every operation to O(n) - identical hash-flooding risk to a hash table; Python's randomized hash seed (`PYTHONHASHSEED`) defends against it. Never claim worst-case O(1) membership in an interview.
- **A hash set has no "get" - only "contains".** A common beginner mistake is reaching for a hash set when the problem actually needs an associated value ("count of x", "index of x") - that's a hash table, not a set. If you catch yourself wanting `s[x]`, you picked the wrong structure.
- **Iteration order is not sorted and not guaranteed stable across languages.** CPython's `set` iteration order depends on hash values and insertion history, not insertion order (unlike `dict`, which is insertion-ordered since 3.7) - never rely on `set` iteration order for anything, including reproducibility across runs with different hash seeds.
- **Resize cost hides inside "O(1) amortized".** A single `add` that triggers a resize costs O(n) wall-clock, not O(1) - the same amortized-vs-worst-case distinction as a hash table and dynamic array. If a problem needs firm per-operation latency bounds, a hash set's occasional O(n) spike disqualifies it.
- **Set-vs-array for small bounded domains (CP trap).** Using `set()` for a fixed alphabet or a small integer range (e.g. tracking which of 26 letters appeared) burns hashing overhead a plain boolean array avoids entirely - a classic contest constant-factor mistake when the input size is large and every microsecond counts.

## What the interviewer probes for

- **"What if you need 10 billion elements and can't fit them all in memory?"** - A hash set stores every element, so memory is O(n) regardless of what the elements are; at 10 billion entries this may not fit in RAM at all. Reach for a [Bloom filter](./bloom-filter.md) instead - it trades exactness for O(m) bits total (m independent of n's growth rate at fixed false-positive rate), accepting a small false-positive rate in exchange.
- **"Why not just use a hash table with dummy values instead of a dedicated set type?"** - You could (and some languages' `set` is implemented exactly that way, keyed with a sentinel value), but a dedicated set type communicates intent, saves the memory of an unused value slot per entry, and exposes O(1) set-algebra operations (union/intersection/difference) that a hash table's API doesn't naturally offer.
- **"Does removing while iterating break anything?"** - Yes, in most languages - mutating a hash set's bucket structure (via add or remove, which can trigger a resize) while an iterator is mid-walk is undefined behavior or throws (`RuntimeError: Set changed size during iteration` in Python). Collect items to remove in a separate list first, then remove after the iteration completes.

## Practice problems

Four staples, each a **distinct** hash-set technique - no two solved the same way.

### 1. Contains Duplicate

Given an integer array, return true if any value appears at least twice. The seen-set primitive in its purest form.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [1, 2, 3, 1] | **Output:** true
  - **Explanation:** 1 appears at both index 0 and index 3.
- **Example 2**
  - **Input:** nums = [1, 2, 3, 4] | **Output:** false
  - **Explanation:** every value is unique - the set never re-encounters a member.

**Constraints:** `1 ≤ nums.length ≤ 10⁵`, `-10⁹ ≤ nums[i] ≤ 10⁹`.

**Approach:** Sweep once, adding each value to a set; the instant a value is already present, return true. This is the seen-set primitive with nothing else layered on - the simplest possible demonstration of trading O(n) memory for an O(n)-instead-of-O(n²) scan.

```python
def contains_duplicate(nums: list[int]) -> bool:
    seen: set[int] = set()
    for x in nums:
        if x in seen:
            return True
        seen.add(x)
    return False
```

**Complexity:** O(n) time, O(n) space.

**Duplicate problems:**
- Contains Duplicate II (LC 219) - same seen-set check, with an added sliding-window constraint on index distance (a set of the last k elements instead of all elements).

---

### 2. Intersection of Two Arrays

Given two integer arrays, return their intersection (each element at most once). The set-algebra technique - converting a nested-loop search into a single set operation.

**Worked examples:**
- **Example 1**
  - **Input:** nums1 = [1,2,2,1], nums2 = [2,2] | **Output:** [2]
  - **Explanation:** 2 is the only value present in both arrays; duplicates collapse to one.
- **Example 2**
  - **Input:** nums1 = [4,9,5], nums2 = [9,4,9,8,4] | **Output:** [4, 9] (any order)
  - **Explanation:** both 4 and 9 appear in each array at least once.

**Constraints:** `1 ≤ nums1.length, nums2.length ≤ 1000`, `0 ≤ nums[i] ≤ 1000`.

**Approach:** Convert both arrays to sets and intersect - `set(a) & set(b)` walks the smaller set and tests membership in the larger, giving O(min(n, m)) instead of the brute-force O(n·m) nested-loop comparison.

```python
def intersection(nums1: list[int], nums2: list[int]) -> list[int]:
    return list(set(nums1) & set(nums2))
```

**Complexity:** O(n + m) time (building both sets dominates; the intersection itself is O(min(n, m))), O(n + m) space.

---

### 3. Longest Consecutive Sequence

Given an unsorted integer array, return the length of the longest run of consecutive integers, in O(n) - no sorting allowed. The set-membership technique that turns "is the next value present?" into O(1), with a boundary check that keeps the total work linear.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [100, 4, 200, 1, 3, 2] | **Output:** 4
  - **Explanation:** the run 1, 2, 3, 4 is the longest consecutive run; 100 and 200 are isolated.
- **Example 2**
  - **Input:** nums = [0, 3, 7, 2, 5, 8, 4, 6, 0, 1] | **Output:** 9
  - **Explanation:** the run 0 through 8 spans nine consecutive values; the duplicate 0 doesn't extend it.

**Constraints:** `0 ≤ nums.length ≤ 10⁵`, `-10⁹ ≤ nums[i] ≤ 10⁹`.

**Approach:** Put every value in a set for O(1) membership. Only **start** counting a run at a value with no left neighbor (`x - 1 not in s`) - every other value gets skipped as a run-interior element, so each element is visited by the inner `while` at most once across the whole run of the outer loop, keeping total work O(n) despite the nested loop shape.

```python
def longest_consecutive(nums: list[int]) -> int:
    s = set(nums)
    best = 0
    for x in s:
        if x - 1 not in s:                 # only start at a run's beginning
            length = 1
            while x + length in s:
                length += 1
            best = max(best, length)
    return best
```

**Complexity:** O(n) time, O(n) space.

**Duplicate problems:**
- Longest Consecutive Sequence II (variants on trees/graphs) - same boundary-only-scan idea applied to a tree's parent/child structure instead of integer neighbors.

---

### 4. Happy Number

A number is "happy" if repeatedly replacing it with the sum of the squares of its digits eventually reaches 1; otherwise it loops forever in a cycle. Determine if a given number is happy. The seen-set-as-cycle-detector technique, distinct from the two-pointer Floyd's-cycle approach.

**Worked examples:**
- **Example 1**
  - **Input:** n = 19 | **Output:** true
  - **Explanation:** 19 → 82 → 68 → 100 → 1 reaches 1.
- **Example 2**
  - **Input:** n = 2 | **Output:** false
  - **Explanation:** 2 → 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4 repeats 4, entering a cycle that never reaches 1.

**Constraints:** `1 ≤ n ≤ 2³¹ - 1`.

**Approach:** Since a bounded process (digit-square-sum) applied repeatedly to a bounded range of values must either reach 1 or repeat a previously-seen value (pigeonhole), track every value seen in a set; if the process revisits one, it's a cycle that will never reach 1, so return false. This is the seen-set pattern used as a cycle detector - a hash-set-based alternative to Floyd's tortoise-and-hare for the same class of problem, trading O(n) space for not needing two pointers.

```python
def is_happy(n: int) -> bool:
    def digit_square_sum(x: int) -> int:
        return sum(int(d) ** 2 for d in str(x))

    seen: set[int] = set()
    while n != 1 and n not in seen:
        seen.add(n)
        n = digit_square_sum(n)
    return n == 1
```

**Complexity:** O(log n) time per digit-square-sum step, and the sequence provably enters a small bounded cycle or reaches 1 quickly for 32-bit inputs, so the loop runs a bounded number of iterations in practice; O(log n) space for the seen-set (bounded by the cycle/path length before repetition).

**Duplicate problems:**
- Linked List Cycle (LC 141) - same "seen-set as cycle detector" idea, applied to node identity in a linked list instead of numeric values in a sequence.
