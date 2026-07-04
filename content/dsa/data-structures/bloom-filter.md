# Bloom Filter

## Prerequisites

- [Hash Table](./hash-table.md) [Must read] - a bloom filter is built on the same hash-function principle: map a key to an index, set or test that slot. Understanding chaining and the hash-function contract is required.
- [Array](./array.md) [Must read] - the bit array underlying a bloom filter is a fixed-size contiguous array; O(1) indexed access is what makes insert and lookup O(k).
- [Hash Set](./hash-set.md) [Should read] - the bloom filter is a probabilistic, space-compressed replacement for a hash set; comparing the two concretely shows what you give up (exact membership) and what you gain (constant space).

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
  - [1. Design a Web Crawler URL Deduplication System](#1-design-a-web-crawler-url-deduplication-system)
  - [2. First Missing Positive](#2-first-missing-positive-membership--exact-fallback)
  - [3. Design a Counting Bloom Filter with Delete](#3-design-a-counting-bloom-filter-with-delete)
  - [4. Design a Spell Checker](#4-design-a-spell-checker)

## What it is

A **bloom filter** is a probabilistic membership structure: a bit array of `m` bits, probed at `k` positions per element (each position derived from a different hash function), that answers "definitely not in set" or "possibly in set" - it **never** produces false negatives, but it can produce **false positives**.

Mental model: **a fingerprint smear on a whiteboard.** When you add an element, you press `k` fingers onto the board, each finger leaving a mark at a different position. To query, you check whether all `k` fingerprint positions are marked. If any is blank → definitely not inserted. If all are marked → probably inserted (but someone else's fingers may have covered those spots). You can never erase individual marks, so deletion is impossible in the basic form.

> **Takeaway (say this out loud):** "A bloom filter answers membership in O(k) time and O(m) bits - never false negatives, tunable false positives, no deletion - the right call when you're checking billions of URLs or keys and can't afford a hash set."

## How it works

Three pieces: a **bit array** of `m` bits (all initialized to 0), **k independent hash functions** each mapping an element to a position in `[0, m)`, and the two operations built from them.

**Insert:** run all `k` hash functions on the element, set the bit at each resulting position to 1.

**Query:** run all `k` hash functions on the element, check every resulting position. If any bit is 0 → element definitely not in the filter. If all bits are 1 → element is **probably** in the filter (false positive possible).

```
Bit array (m = 14 bits), k = 3 hash functions

Initial:  [ 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ]
           0 1 2 3 4 5 6 7 8 9 ...   13

Insert "alice"  → h1=1, h2=5, h3=9
          [ 0 1 0 0 0 1 0 0 0 1 0 0 0 0 ]

Insert "bob"    → h1=3, h2=5, h3=11
          [ 0 1 0 1 0 1 0 0 0 1 0 1 0 0 ]
                    ^--- bit 5 already set (collision, not a problem)

Query "alice"   → check bits 1, 5, 9 → all 1 → MAYBE (correct: was inserted)
Query "carol"   → h1=3, h2=5, h3=9 → bits 3,5,9 are all 1 → MAYBE (false positive!)
Query "dave"    → h1=0, h2=5, h3=9 → bit 0 is 0 → DEFINITELY NOT (correct)
```

The false-positive rate depends on how full the bit array is. After inserting `n` elements into `m` bits with `k` hash functions, the probability that a given bit is still 0 is `(1 - 1/m)^(kn) ≈ e^(-kn/m)`. The false-positive rate is then:

```
p ≈ (1 - e^(-kn/m))^k
```

The optimal `k` for a given `m` and `n` that minimizes `p` is:

```
k_opt = (m/n) · ln 2 ≈ 0.693 · (m/n)
```

Plugging back in gives the minimum achievable false-positive rate for a given space budget:

```
p_min ≈ (0.6185)^(m/n)
```

So to hit `p = 1%` for `n` elements, you need `m ≈ 9.6 · n` bits - about 1.2 bytes per element regardless of how large each element is.

## Operations

| Operation | Time   | Space              | Note                                               |
| --------- | ------ | ------------------ | -------------------------------------------------- |
| Insert    | O(k)   | O(1) per element   | Set k bits; k is typically 5–15                    |
| Query     | O(k)   | O(1) per query     | May return false positive; never false negative    |
| Delete    | **N/A**| -                  | Unsupported in standard form; see Counting BF variant |
| Resize    | N/A    | -                  | Bit array is fixed; rebuild if n grows beyond plan |

Space for the structure itself: **O(m)** bits total, shared across all elements. The per-element space is O(m/n) - far below O(1) pointer-based structures for large n.

## Complexity summary

| Dimension        | Best | Average | Worst |
| ---------------- | ---- | ------- | ----- |
| Insert time      | O(k) | O(k)    | O(k)  |
| Query time       | O(k) | O(k)    | O(k)  |
| Space            | O(m) | O(m)    | O(m)  |
| False-positive rate | 0 (empty filter) | p ≈ (1−e^(−kn/m))^k | approaches 1 as n → ∞ with fixed m |

k is a small constant (typically 5–15), so insert and query are effectively **O(1)** in practice. Unlike a dynamic array or hash table, these costs are **worst-case every call** - there is no amortization, no resize, and no occasional O(n) spike.

## When to use / when not

**Reach for a bloom filter when:**

- You need membership testing over a very large set (billions of URLs, keys, passwords) and a hash set would exceed memory.
- False positives are acceptable and false negatives are not - "has this URL been crawled?" can tolerate an occasional re-crawl; it must not skip a URL that hasn't been crawled.
- You never need to delete elements (or can rebuild on a schedule).
- You can pre-commit to a maximum `n` at design time, so you can size `m` to hit a target false-positive rate.

**Avoid a bloom filter when:**

- You need exact membership - if the answer "possibly yes" is indistinguishable from "yes" in your system, use a hash set.
- You need deletions on individual elements - use a counting bloom filter or a cuckoo filter instead.
- Your `n` is small enough that a hash set fits in memory - the bloom filter's space win only matters at scale; at small n, you pay the false-positive cost for no benefit.
- You need to enumerate the elements - a bloom filter stores no element data, only a bit signature.

**Alternatives and the crossover:**

- **Hash set** - exact, supports deletion and enumeration, O(1) average ops; costs O(n · key_size) space. Switch to a bloom filter when that space is prohibitive.
- **Cuckoo filter** - supports deletion, slightly better space efficiency, same O(1) ops; more complex implementation. Prefer over counting bloom filter for deletion-heavy workloads.
- **Counting bloom filter** - supports deletion at the cost of replacing bits with small counters (4-bit each), roughly 4× more space than a standard bloom filter.

Bloom filters are production workhorses at scale: Google's BigTable uses one per SSTable to skip disk reads for missing keys; Cassandra, Redis, and most LSM-tree storage engines do the same. At `n = 10⁸` URLs with a 1% false-positive rate, a bloom filter needs ~114 MB vs ~1.6 GB for a hash set of 10-byte keys - a 14× win.

## Comparison

| Structure             | Insert  | Query  | Delete | Space          | False positives | Pick it when…                                                                                         |
| --------------------- | ------- | ------ | ------ | -------------- | --------------- | ----------------------------------------------------------------------------------------------------- |
| **Bloom Filter**      | O(k)    | O(k)   | ✗      | O(m) bits      | Yes (tunable)   | n is huge, memory is tight, false positives tolerable, no deletions needed                             |
| Hash Set              | O(1) avg| O(1) avg| O(1) | O(n·key_size)  | No              | n fits in memory, exact answers required, or you need deletion/enumeration                            |
| Cuckoo Filter         | O(1) avg| O(1) avg| O(1) | ~O(m) bits     | Yes (tunable)   | Same as bloom filter but deletions needed; slightly better space at same FP rate                      |
| Counting Bloom Filter | O(k)    | O(k)   | O(k)  | O(m) 4-bit counters | Yes (tunable) | Bloom filter but deletions needed; 4× space vs standard bloom filter                               |
| Sorted Array          | O(n)    | O(log n)| O(n) | O(n·key_size)  | No              | Read-heavy static set where binary search beats hashing; almost never wins over hash set in practice  |

## Variants

**Counting Bloom Filter** - replaces each bit with a small counter (typically 4 bits). Increment on insert, decrement on delete. Supports deletion at ~4× the space of a standard bloom filter; counter overflow (at 15) is a correctness risk at high load - see Gotchas.

**Cuckoo Filter** - stores compact fingerprints in a cuckoo-hashing table. Supports deletion, achieves better space efficiency than a counting bloom filter, and has slightly better cache performance. The practical replacement for a counting bloom filter when deletions are needed.

**Scalable Bloom Filter** - a chain of bloom filters with tightening false-positive budgets, added as the current filter fills. Handles unbounded `n` at the cost of multiple filter probes per query.

**Partitioned Bloom Filter** - divides the `m` bits into `k` equal-sized partitions, one per hash function. Improves cache locality for large filters because each probe touches a different cache-line-aligned partition.

**Blocked Bloom Filter** - forces all `k` probes for one element to land in a single CPU cache line (~512 bits). Sacrifices a small amount of FP rate optimality for dramatically better cache performance at large `m`.

## Hashing & collisions

### The k independent hash functions

A standard bloom filter needs `k` hash functions that are **pairwise independent** - knowing `h_i(x)` tells you nothing about `h_j(x)`. In practice, full independence is approximated by two tricks:

1. **Double hashing:** derive all `k` positions from two base hash functions `h1` and `h2`:
   ```
   g_i(x) = (h1(x) + i · h2(x)) mod m    for i = 0, 1, …, k-1
   ```
   This produces `k` nearly-independent positions from two MurmurHash or xxHash calls. Using a single hash function sliced into `k` parts also works for most practical cases.

2. **Good hash function choice:** use non-cryptographic, high-avalanche functions - MurmurHash3, xxHash, or FarmHash. Cryptographic hashes (SHA-256) are 10–100× slower with no benefit for a bloom filter.

### False-positive rate derivation

After inserting `n` elements with `k` hash functions into `m` bits:

- Probability a specific bit is **still 0** after one insertion: `(1 - 1/m)`
- After `n` insertions, probability bit is still 0: `(1 - 1/m)^(kn) ≈ e^(-kn/m)`
- Probability a query on a **non-inserted element** sees all `k` bits as 1 (false positive):
  ```
  p ≈ (1 - e^(-kn/m))^k
  ```

This is exact in expectation. In practice, hash functions are not perfectly independent, so real FP rates are slightly higher than the formula predicts - treat the formula as a lower bound.

### Optimal k

Minimizing `p` over `k` (treating `m` and `n` as fixed):

```
dp/dk = 0  →  k_opt = (m/n) · ln 2
```

Rounding to the nearest integer is fine - the FP curve is shallow near the optimum. The minimum FP rate at `k_opt` is:

```
p_min ≈ (0.6185)^(m/n)
```

Sizing guide for common targets:

| Target FP rate | Bits per element (m/n) | Optimal k |
| -------------- | ---------------------- | --------- |
| 10%            | 4.8                    | 3         |
| 1%             | 9.6                    | 7         |
| 0.1%           | 14.4                   | 10        |
| 0.01%          | 19.2                   | 13        |

### Load factor & the equivalent of "resize"

A bloom filter has no load factor concept in the hash-table sense - filling it doesn't cause a collision chain, it just raises the FP rate as more bits flip to 1. The analogy to hash-table resize is: when `n` exceeds the planned capacity (the `n` you used to size `m`), rebuild with a larger `m`. There is no in-place grow; you must re-insert all elements into the new filter. This means you **must know `n_max` at construction time** or use a Scalable Bloom Filter.

Cache behavior: for small `m` (fits in L2/L3), a bloom filter is extremely cache-friendly - `k` random reads into a contiguous bit array. For very large `m` (multi-GB filters), each of the `k` bit probes is likely a cache miss, and a Blocked Bloom Filter (all `k` probes in one cache line) recovers most of the lost throughput.

## Implementation

### Pseudocode

```
BloomFilter(m, k):
    bits ← array of m bits, all 0
    hash_fns ← list of k independent hash functions

Insert(x):
    for i = 0 to k - 1:
        pos ← hash_fns[i](x) mod m
        bits[pos] ← 1

Query(x) → {MAYBE, DEFINITELY_NOT}:
    for i = 0 to k - 1:
        pos ← hash_fns[i](x) mod m
        if bits[pos] = 0:
            return DEFINITELY_NOT
    return MAYBE
```

### Python

```python
from __future__ import annotations
import math
import mmh3  # pip install mmh3 - MurmurHash3 bindings


class BloomFilter:
    def __init__(self, n: int, fp_rate: float = 0.01) -> None:
        """Size the filter for n expected elements at the target false-positive rate."""
        self.m: int = self._bits_needed(n, fp_rate)
        self.k: int = self._optimal_k(self.m, n)
        self.bits: bytearray = bytearray(math.ceil(self.m / 8))
        self.n_inserted: int = 0

    @staticmethod
    def _bits_needed(n: int, p: float) -> int:
        return math.ceil(-n * math.log(p) / (math.log(2) ** 2))

    @staticmethod
    def _optimal_k(m: int, n: int) -> int:
        return max(1, round((m / n) * math.log(2)))

    def _positions(self, item: str) -> list[int]:
        # Double-hashing: derive k positions from two MurmurHash seeds
        h1 = mmh3.hash(item, seed=0, signed=False)
        h2 = mmh3.hash(item, seed=1, signed=False)
        return [(h1 + i * h2) % self.m for i in range(self.k)]

    def add(self, item: str) -> None:
        for pos in self._positions(item):
            self.bits[pos >> 3] |= 1 << (pos & 7)
        self.n_inserted += 1

    def __contains__(self, item: str) -> bool:
        return all(
            self.bits[pos >> 3] & (1 << (pos & 7))
            for pos in self._positions(item)
        )

    @property
    def estimated_fp_rate(self) -> float:
        fill = self.n_inserted * self.k / self.m
        return (1 - math.exp(-fill)) ** self.k
```

**Contest velocity - no-dependency version for CP:**

```python
import math

def bloom_positions(item: str, m: int, k: int) -> list[int]:
    """Double-hashing without mmh3: use Python's built-in hash with salted seeds."""
    h1 = hash(item)
    h2 = hash(item + "\x00")  # second seed via suffix - crude but fast for CP
    return [(h1 + i * h2) % m for i in range(k)]

# Construct: bits = bytearray(ceil(m/8)); insert/query as above.
# Python's hash() is salted per-process - fine for CP, wrong for distributed systems.
```

## Gotchas / edge cases

**1. False positives grow silently as you insert beyond planned capacity.**
The formula `p ≈ (1 − e^(−kn/m))^k` depends on `n`. If you insert 2× your planned `n`, your FP rate rises far above the target - at `n = 2n_planned`, roughly `p` becomes `(1 − e^(−2kn_planned/m))^k`, which can be 10–50× higher than the original target. The filter gives no warning; it just starts lying more often. **Always track `n_inserted` and alert (or rebuild) when it exceeds the planned capacity.**

**2. Standard bloom filters cannot delete.**
Setting a bit to 0 on "delete" would falsely clear bits that were set by *other* elements. This is the most common interview mistake. If you need deletion, use a counting bloom filter (4-bit counters) or cuckoo filter. A counting bloom filter has its own trap: if a counter overflows (reaches 15 with 4-bit counters), it saturates - decrement on delete then reads 15, not the correct count, causing false membership of deleted elements indefinitely. **Size counters to avoid overflow, or use 8-bit counters at 2× space cost.**

**3. Hash function quality dominates correctness.**
Two hash functions that are correlated (e.g. both derived from `CRC32` with slightly different seeds) will cluster bits and raise the actual FP rate well above the theoretical formula. The formula assumes pairwise independence. **Use MurmurHash3, xxHash, or FarmHash - not `hash()` in a production distributed system, because Python's `hash()` is salted per-process and non-deterministic across machines.**

**4. You cannot reconstruct the element set.**
A bloom filter stores no element data, only a bit mask. You cannot iterate members, find a sample element, or compute the set size (beyond `n_inserted` if you track it separately). Interviewers sometimes probe this: "can you list all inserted URLs?" - the answer is no.

**5. At-scale: large `m` destroys cache performance.**
For `n = 10⁸` elements at 1% FP rate, `m ≈ 10⁹` bits = 125 MB. Each of the `k = 7` probes is a random access into a 125 MB bit array - almost certainly a cache miss per probe, so 7 LLC misses (~100 ns each) per query. At 10⁶ queries/sec this dominates. **Use a Blocked Bloom Filter or partition the filter to pack all `k` probes into a single 512-bit cache line, trading a small FP rate increase for ~5–7× throughput at large m.**

**6. CP: Python's `hash()` is non-deterministic between runs.**
Python 3.3+ randomizes hash seeds by default (PYTHONHASHSEED). In a competitive-programming judge that runs multiple test cases in the same process, this is fine. Across test cases or runs, `hash("abc")` changes. Use `mmh3` or a custom polynomial hash if you need determinism.

## What the interviewer probes for

**"Can you delete from a bloom filter?"**
No - deleting by clearing bits is unsound because bits are shared across elements. A bit set to 0 might have been set by a different element. The fix is a counting bloom filter: replace each bit with a small counter, increment on insert, decrement on delete. The trade-off is ~4× space and counter-overflow risk at high load.

**"What happens if you insert 10× more elements than planned?"**
The false-positive rate degrades toward 1 - the filter becomes almost useless, answering "maybe" for nearly everything. Quantitatively: at `n = 10 × n_planned`, fill fraction is 10× higher, so `p → (1 − e^(−10k})^k` which approaches 1 fast. The filter still never produces false negatives, but "maybe" is an essentially meaningless answer. The correct response is to rebuild with a larger `m`, re-inserting all elements - which requires you to have kept the original data, not just the filter.

**"How is this different from a hash set? Why not just use a hash set?"**
A hash set gives exact membership with O(n · key_size) space. A bloom filter gives probabilistic membership with O(m) bits, where `m ≈ 10 × n` bits regardless of key size. For 10-byte keys, a hash set costs ~80 bits/element (pointer + key); a bloom filter at 1% FP costs ~9.6 bits/element - an 8× space win. At n = 10⁹, that's 1.2 GB vs ~10 GB. The right choice is a bloom filter when memory is the binding constraint and the application tolerates occasional false positives (re-fetching, re-crawling, redundant work).

**"What is the optimal number of hash functions k?"**
k_opt = (m/n) × ln 2 ≈ 0.693 × (m/n). More hash functions → more bits set per insert → higher fill rate; fewer hash functions → each probe is less informative. The optimum balances these. In practice, k = 7 for a 1% FP rate filter (m/n ≈ 9.6) is common. Changing k by ±1 from the optimum has small effect because the FP curve is flat near the minimum.

## Practice problems

### 1. Design a Web Crawler URL Deduplication System

Given a web crawler that processes millions of URLs per minute, design a component that tracks whether a URL has already been visited. URLs are up to 2000 characters; memory budget is 512 MB; occasional re-crawling is acceptable but missing unvisited URLs is not.

**Approach:** This is a canonical bloom filter use case. A hash set of 10⁹ URLs (∼10 bytes each after hashing) would need ∼10 GB. A bloom filter sized for n = 10⁹, FP rate = 0.1% costs m ≈ 14.4 × 10⁹ bits = 1.8 GB - still over budget. At FP = 1%, m ≈ 9.6 × 10⁹ bits = 1.2 GB - fits. Key insight: a false positive means the crawler skips a URL it hasn't visited (re-crawlable); a false negative is impossible, so no URL is permanently missed. Choose m = 512 MB × 8 = 4.3 × 10⁹ bits, giving n_max ≈ 4.5 × 10⁸ URLs at 1% FP. For larger n, chain multiple filters (Scalable BF) or rotate filters on a time window.

```python
from __future__ import annotations
import math
import mmh3


class UrlDeduplicator:
    def __init__(self, capacity: int = 450_000_000, fp_rate: float = 0.01) -> None:
        m = math.ceil(-capacity * math.log(fp_rate) / (math.log(2) ** 2))
        self.m = m
        self.k = max(1, round((m / capacity) * math.log(2)))
        self.bits: bytearray = bytearray(math.ceil(m / 8))

    def _positions(self, url: str) -> list[int]:
        h1 = mmh3.hash(url, seed=0, signed=False)
        h2 = mmh3.hash(url, seed=1, signed=False)
        return [(h1 + i * h2) % self.m for i in range(self.k)]

    def seen(self, url: str) -> bool:
        return all(self.bits[p >> 3] & (1 << (p & 7)) for p in self._positions(url))

    def mark(self, url: str) -> None:
        for p in self._positions(url):
            self.bits[p >> 3] |= 1 << (p & 7)
```

**Time:** O(k) per operation. **Space:** O(m) bits ≈ 512 MB for 4.5 × 10⁸ URLs at 1% FP.

**Duplicate problems:**
- Design a spam filter for email deduplication (same mechanic: large n, tolerate FP, no FN, no deletion).
- "Implement a visited-set for a large-scale graph crawler with a 1 GB memory cap" - bloom filter sizing + the scalable-BF extension when n is unbounded.

---

### 2. First Missing Positive (Membership + Exact Fallback)

Given an unsorted array `nums` of n integers (1 ≤ n ≤ 10⁵), find the smallest positive integer not present. Constraints: O(n) time, O(1) extra space.

**Approach:** This problem is NOT solved by a bloom filter - it's solved by using the input array itself as a presence bit array (cyclic sort / index marking). It's included to sharpen the "when NOT to use a bloom filter" instinct. The key insight is that the answer must lie in [1, n+1] (pigeonhole), so you can mark `nums[nums[i]-1]` negative to record presence of value `nums[i]`, then scan for the first positive index. A bloom filter would add O(m) space unnecessarily and still require a second pass - wrong tool.

```python
def first_missing_positive(nums: list[int]) -> int:
    n = len(nums)
    for i in range(n):
        while 1 <= nums[i] <= n and nums[nums[i] - 1] != nums[i]:
            nums[i], nums[nums[i] - 1] = nums[nums[i] - 1], nums[i]
    for i in range(n):
        if nums[i] != i + 1:
            return i + 1
    return n + 1
```

**Time:** O(n). **Space:** O(1) - each element swapped at most once.

**Duplicate problems:**
- "Find the duplicate number in [1..n] with O(1) space" (LC 287) - same index-as-presence trick, different termination.
- "Find all missing numbers in [1..n]" (LC 448) - same sign-marking mechanic, collect all gaps.

---

### 3. Design a Counting Bloom Filter with Delete

Implement a bloom filter that supports deletion. Support `add(item)`, `remove(item)`, `might_contain(item)`. Assume at most 10⁶ distinct elements, 1% FP rate target. Constraints: O(k) per operation; counters must not overflow.

**Approach:** Replace the bit array with an array of small unsigned integers (4-bit or 8-bit counters). Increment on `add`, decrement on `remove`, check `> 0` on `might_contain`. The critical senior insight: 4-bit counters saturate at 15. If an element is inserted 16 times (or 16 collisions land on one counter), the counter saturates and a subsequent `remove` decrements from 15, leaving a phantom 14 - a false positive that never clears. For correctness, either use 8-bit counters (2× space) or assert `counter < 255` before incrementing and refuse insertion at saturation.

```python
from __future__ import annotations
import math
import array
import mmh3


class CountingBloomFilter:
    def __init__(self, n: int = 1_000_000, fp_rate: float = 0.01) -> None:
        m_bits = math.ceil(-n * math.log(fp_rate) / (math.log(2) ** 2))
        self.m = m_bits
        self.k = max(1, round((m_bits / n) * math.log(2)))
        # 8-bit counters: 0–255, no overflow risk for normal workloads
        self.counters: array.array = array.array("B", [0] * m_bits)

    def _positions(self, item: str) -> list[int]:
        h1 = mmh3.hash(item, seed=0, signed=False)
        h2 = mmh3.hash(item, seed=1, signed=False)
        return [(h1 + i * h2) % self.m for i in range(self.k)]

    def add(self, item: str) -> None:
        for pos in self._positions(item):
            if self.counters[pos] < 255:
                self.counters[pos] += 1

    def remove(self, item: str) -> None:
        if item not in self:
            return
        for pos in self._positions(item):
            if self.counters[pos] > 0:
                self.counters[pos] -= 1

    def __contains__(self, item: str) -> bool:
        return all(self.counters[pos] > 0 for pos in self._positions(item))
```

**Time:** O(k) per operation. **Space:** O(m) bytes (8-bit counters, ~8× the standard bit array).

**Duplicate problems:**
- "Design a rate limiter using a sliding-window with probabilistic eviction" - counting BF is one option for the seen-set with TTL-based removal.
- "Design a distributed deduplication service where messages can be retracted" - same counting BF mechanic, deletion required, same counter-overflow risk to handle.

---

### 4. Design a Spell Checker

Given a dictionary of `n` valid English words (n ≈ 10⁵), design a spell checker that flags likely misspellings. A false positive (flagging a valid word as misspelled) is acceptable; a false negative (silently passing a misspelled word) is not. Memory budget: 256 KB.

**Approach:** Load the dictionary into a bloom filter sized for n = 10⁵ words at FP rate ≤ 1%. Required bits: m ≈ 9.6 × 10⁵ ≈ 960,000 bits = 120 KB - well within budget, vs ~1 MB for a hash set of 10-byte average word length. On query, "definitely not" → flag as misspelled (correct); "maybe" → accept as valid (FP: occasionally passes a misspelling that hashes to occupied bits). The FP asymmetry is the key insight: a spell checker must not miss real words, and can tolerate rare phantom passes of misspellings. This is exactly the bloom filter's guarantee. No deletion needed - the dictionary is static.

```python
from __future__ import annotations
import math
import mmh3


class SpellChecker:
    def __init__(self, dictionary: list[str], fp_rate: float = 0.01) -> None:
        n = len(dictionary)
        self.m = math.ceil(-n * math.log(fp_rate) / (math.log(2) ** 2))
        self.k = max(1, round((self.m / n) * math.log(2)))
        self.bits: bytearray = bytearray(math.ceil(self.m / 8))
        for word in dictionary:
            self._add(word)

    def _positions(self, word: str) -> list[int]:
        h1 = mmh3.hash(word, seed=0, signed=False)
        h2 = mmh3.hash(word, seed=1, signed=False)
        return [(h1 + i * h2) % self.m for i in range(self.k)]

    def _add(self, word: str) -> None:
        for pos in self._positions(word):
            self.bits[pos >> 3] |= 1 << (pos & 7)

    def is_valid(self, word: str) -> bool:
        """Returns True if word is probably in the dictionary (may FP), False if definitely not."""
        return all(self.bits[p >> 3] & (1 << (p & 7)) for p in self._positions(word))
```

**Time:** O(k) per lookup, O(n·k) to build. **Space:** O(m) bits ≈ 120 KB for 10⁵ words at 1% FP - 8× less than a hash set.

**Duplicate problems:**
- "Design a username availability checker for a social platform" (same mechanic: static set loaded once, FP = rare false "available" claim tolerable, FN = saying taken when free is the real sin).
- "Filter malicious URLs using a pre-built blocklist" - same static-dictionary BF pattern; FP = occasional innocent URL blocked (tolerable), FN = passing a malicious URL (not tolerable).
