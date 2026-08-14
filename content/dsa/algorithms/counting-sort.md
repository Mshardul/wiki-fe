# Counting Sort

## Prerequisites

- [Big-O Notation](./big-o-notation.md) [Must read]
- [Array](../data-structures/array.md) [Must read]
- [Sorting](./sorting.md) [Should read]

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [Intuition](#intuition)
- [How it works](#how-it-works)
- [Correctness / invariant](#correctness--invariant)
- [Complexity derivation](#complexity-derivation)
- [Constraints & approach](#constraints--approach)
- [When to use / when not](#when-to-use--when-not)
- [Comparison](#comparison)
- [Key & distribution](#key--distribution)
- [Edge cases](#edge-cases)
- [Implementation](#implementation)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)
  - [Sort an Array of Bounded Integers](#1-sort-an-array-of-bounded-integers--plain-counting-sort)
  - [Sort Characters by Frequency](#2-sort-characters-by-frequency--count-then-emit)
  - [Relative Sort Array](#3-relative-sort-array--counting-with-a-custom-order)
  - [H-Index](#4-h-index--counting-buckets-to-skip-the-sort)

## What it is

**Counting sort** sorts without comparing any two elements. Instead it **tallies** how many times each key value occurs, then walks the tally from smallest key to largest, emitting each key as many times as it was counted. The key _is_ the index into the count array - so "where does this value go?" is answered by direct address, not comparison.

Mental model: **sorting exam papers by score when scores run 0–100.** You don't compare papers pairwise - you make 101 piles labelled 0…100, drop each paper on its pile, then collect the piles in order. The collecting is already sorted because the piles are in score order.

The payoff and its catch: counting sort runs in **O(n + k)** where `k` is the size of the key range - **linear when `k = O(n)`**, which _beats the O(n log n) comparison lower bound_ because it never compares. It's **stable** if you build it carefully (the prefix-sum version), which is exactly why it's the **inner loop of [radix sort](./radix-sort.md)**. The catch is `k`: it allocates an array of size `k`, so for huge key ranges (`k = 10⁹`) it's useless - you'd OOM. Counting sort only works on **integers (or things mappable to a small integer range)**, never arbitrary comparables.

> **Takeaway (say this out loud):** "Counting sort tallies occurrences of each key and emits them in key order - O(n + k), beating the comparison bound because it never compares - but only for integer keys in a small range `k`."

**Complexity:** O(n + k) time, O(n + k) space, where `k` = key range.

## Intuition

Why does this escape the O(n log n) floor? Because the **lower bound only applies to comparison sorts** - algorithms that learn order through pairwise "is a < b?" tests, each yielding one bit. Counting sort never asks that question. It reads each key _once_ and uses its value to address a slot directly. There's no decision tree of comparisons, so the `log₂(n!)` argument simply doesn't bind.

The cost of the escape is the assumption it buys with: keys must be **small integers**, because the count array has one slot per possible key. You've traded generality (any comparable type) for the key range being a usable index space. When that trade is available - bounded integer keys - you get linear sorting; when it isn't, you're back to comparison sorts.

## How it works

Sort `a = [2, 5, 3, 0, 2, 3, 0, 3]` with keys in range `0..5` (`k = 6`).

**Step 1 - count occurrences.** One pass; `count[v]` = how many times `v` appears.

```
value v:   0  1  2  3  4  5
count[v]:  2  0  2  3  0  1        ← 0 appears 2×, 2 appears 2×, 3 appears 3×, 5 once
```

**Step 2 - prefix-sum the counts** so `count[v]` becomes the number of elements **≤ v**, i.e. the position _just past_ where `v`'s block ends in the output:

```
value v:        0  1  2  3  4  5
prefix count:   2  2  4  7  7  8        ← cumulative; count[3]=7 means values ≤3 fill out[0..6]
```

**Step 3 - place elements, scanning the input right-to-left** (this is what makes it **stable**): for each key, `count[key] - 1` is its output slot; decrement after placing.

```
read a[7]=3 → slot count[3]-1 = 6 → out[6]=3, count[3]→6
read a[6]=0 → slot count[0]-1 = 1 → out[1]=0, count[0]→1
read a[5]=3 → slot count[3]-1 = 5 → out[5]=3, count[3]→5
read a[4]=2 → slot count[2]-1 = 3 → out[3]=2, count[2]→3
read a[3]=0 → slot count[0]-1 = 0 → out[0]=0, count[0]→0
read a[2]=3 → slot count[3]-1 = 4 → out[4]=3, count[3]→4
read a[1]=5 → slot count[5]-1 = 7 → out[7]=5, count[5]→7
read a[0]=2 → slot count[2]-1 = 2 → out[2]=2, count[2]→2

out: [0, 0, 2, 2, 3, 3, 3, 5]   ✓ sorted, and equal keys kept input order (stable)
```

No two elements were ever compared - every placement was an array index computed from the key's value.

## Correctness / invariant

Counting sort's correctness rests on the **prefix-sum <abbr>invariant</abbr>**, not a loop/recurrence:

- **After Step 2**, `count[v]` equals the number of input elements with key **≤ v**. So the elements with key exactly `v` must occupy output slots `[count[v-1], count[v] - 1]` - a contiguous block whose size is exactly `count[v] - count[v-1]` = the occurrence count of `v`. This is the placement contract.
- **Step 3 maintains it:** each time we place a key `v`, we write to `count[v] - 1` and decrement `count[v]`, so successive elements of the same key fill that key's block from its **right end leftward**. Every key lands inside its own block, and blocks are in ascending key order → the output is sorted.
- **Stability** comes from the right-to-left input scan combined with right-to-left block filling: the _last_ occurrence of `v` in the input is placed at the _rightmost_ slot of `v`'s block, the second-to-last just left of it, and so on - so input order is preserved among equal keys. Reverse the scan direction and you reverse equal keys, breaking stability. (This stability is the non-negotiable requirement for counting sort to serve as radix sort's inner pass.)

## Complexity derivation

Add up the passes:

- **Step 1 (count):** one pass over `n` inputs → Θ(n). Initializing the count array → Θ(k).
- **Step 2 (prefix sum):** one pass over `k` counts → Θ(k).
- **Step 3 (place):** one pass over `n` inputs, O(1) per placement → Θ(n).

```
T(n) = Θ(n) + Θ(k) + Θ(k) + Θ(n) = Θ(n + k)
```

**When `k = O(n)`** (the key range is proportional to the element count), this is **Θ(n)** - linear, beating O(n log n). **When `k = ω(n)`** (range much larger than the data - e.g. `n = 1000` keys spread over `0..10⁹`), the Θ(k) terms dominate and counting sort is _worse_ than a comparison sort, besides needing 10⁹ slots of memory. **Space** is Θ(n + k): the count array (`k`) plus the output buffer (`n`). The `k` term is the whole story - it's both the speed condition and the memory ceiling.

## Constraints & approach

| Constraint                                   | Expected complexity | What it tells you                                                                              |
| -------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| integer keys, range `k = O(n)`               | O(n)                | The home case - small range _invites_ counting sort, beating O(n log n).                       |
| keys `0..10⁵`, `n ≤ 10⁶`                     | O(n + k) ≈ O(n)     | `k` comfortably ≤ `n`; allocate a `10⁵+1` count array and go.                                  |
| keys huge (`0..10⁹`) but few elements        | use comparison sort | `k ≫ n` → the Θ(k) term and the `k`-sized array kill it; O(n log n) wins. **OOM risk.**        |
| fixed-width keys, range too big for one pass | O(d·(n + b))        | Don't widen `k` - switch to [radix sort](./radix-sort.md): counting-sort each digit, base `b`. |

The senior reading: the tells are **"scores 0–100", "lowercase letters", "ages", "values ≤ 10⁵"** - a _bounded_ integer key range. The anti-tell is a large or unbounded range, which routes you to radix sort (fixed-width keys) or back to comparison sorting.

## When to use / when not

Reach for counting sort when keys are **integers in a range `k` no bigger than ~the element count** - bounded scores, ages, byte values, small-alphabet characters. It's the fastest possible sort there (linear, beating the comparison bound) and it's stable. It also shines as a **subroutine**: it's the stable inner pass of [radix sort](./radix-sort.md), and the "count then emit" structure solves frequency and bucketing problems directly (see practice).

Don't use it when the key range is **large or unbounded** (`k ≫ n`) - the `k`-sized count array makes it slower than [quicksort](./quicksort.md)/[merge sort](./merge-sort.md) _and_ a memory hazard (sorting a handful of 64-bit integers would demand an astronomically large array). Don't use it on **arbitrary comparable types** with no integer key (floats, strings without a fixed small alphabet, custom objects) - there's nothing to index by. For fixed-width keys with a range too big for a single count array, **radix sort** is the escape: it keeps `k` small by sorting one digit at a time.

Counting sort is the engine inside **radix sort** (used in some database and big-data sort implementations) and the natural tool whenever a problem reduces to "tally values in a bounded range" - histograms, frequency tables, and bucket-based selection.

## Comparison

| Algorithm                     | Time           | Space    | Stable | Compares? | Works on                                |
| ----------------------------- | -------------- | -------- | ------ | --------- | --------------------------------------- |
| **Counting sort**             | O(n + k)       | O(n + k) | ✅     | ❌        | integer keys, small range `k`           |
| [Radix sort](./radix-sort.md) | O(d·(n + b))   | O(n + b) | ✅     | ❌        | fixed-width integer/string keys         |
| Bucket sort                   | O(n) avg       | O(n)     | ✅\*   | ❌/✅     | uniformly distributed keys over a range |
| [Quicksort](./quicksort.md)   | O(n log n) avg | O(log n) | ❌     | ✅        | any comparable                          |
| [Merge sort](./merge-sort.md) | O(n log n)     | O(n)     | ✅     | ✅        | any comparable                          |

Counting sort is the _building block_: radix sort runs counting sort once per digit to handle big key ranges, and bucket sort is the generalization to non-integer keys (distribute into ranges, sort each bucket). The dividing line from quicksort/merge sort is the **Compares?** column - the non-comparison sorts trade generality for linear time on bounded keys.

## Key & distribution

The **Distribution** family: sort by _placing each element where its key says it goes_, never by comparing two elements.

- **The key.** Counting sort needs an **integer key in `[0, k)`** (or a cheap map to one). The key directly indexes the count array - that direct-address step is the whole algorithm and the reason there's no comparison.
- **The range `k`.** This is the single dial. `k = O(n)` → linear time and acceptable space. `k ≫ n` → the Θ(k) work and the `k`-sized array dominate, and the algorithm collapses. Always reason about `k` _before_ reaching for counting sort - it's both the speed condition and the memory ceiling.
- **Why it sidesteps the lower bound.** The O(n log n) floor is a theorem _about comparison sorts_ - it counts the comparisons needed to distinguish `n!` orderings. Counting sort makes **zero** comparisons; it reads keys and addresses slots, so the bound has no purchase. The cost of the loophole is the bounded-integer-key assumption.
- **The space the range buys.** O(n + k): you spend `k` slots of memory to gain comparison-free placement. That's the explicit trade - memory for the ability to index by value. Radix sort exists precisely to keep this trade affordable when keys are wide, by bounding `k` to one digit's range at a time.

## Edge cases

- **Empty / single element** - `n ≤ 1` is already sorted; the count/place passes are no-ops or trivial. Still allocate the count array safely (guard against deriving `k` from an empty input).
- **All-equal elements** - one count slot holds `n`, all others zero; the place pass writes the same value `n` times. O(n + k), perfectly stable. No degeneracy (unlike quicksort).
- **Negative keys (CP-flavored trap)** - the count array is 0-indexed, so negative values can't index directly. **Offset by `-min`**: map key `v` to index `v - min`, making the range `max - min + 1`. Forgetting the offset is the classic counting-sort bug - an index-out-of-bounds or silently wrong sort.
- **Sparse keys / large range** - `k = max - min + 1` blows up when values are few but spread out (`[1, 10⁹]` → a billion-slot array). This is the OOM hazard; detect it by checking the _range_, not `n`, and fall back to a comparison sort or radix sort.
- **Stability dependence** - building counts without the prefix-sum + reverse-scan (e.g. naively overwriting the input from the tallies) loses stability. That's fine for plain integers but **breaks radix sort**, which _requires_ a stable inner pass. Know which variant you're writing.
- **Overflow** - the prefix-sum accumulates up to `n`; harmless in Python, but in fixed-width languages a count array of 32-bit ints is fine for `n ≤ 2³¹`, and the index arithmetic `v - min` must not overflow for extreme values.

## Implementation

**Pseudocode** (CLRS - the stable prefix-sum version, the one radix sort needs):

```
COUNTING-SORT(A, k)                       ▷ keys in 0..k-1
let C[0..k-1] and B[1..A.length] be new arrays
for v ← 0 to k − 1
    C[v] ← 0
for i ← 1 to A.length                 ▷ Step 1: tally occurrences
    C[A[i]] ← C[A[i]] + 1
for v ← 1 to k − 1                     ▷ Step 2: prefix sum → #elements ≤ v
    C[v] ← C[v] + C[v − 1]
for i ← A.length downto 1             ▷ Step 3: place, right-to-left ⇒ STABLE
    B[C[A[i]]] ← A[i]
    C[A[i]] ← C[A[i]] − 1
return B
```

**Python** - idiomatic, handling negative keys via an offset, plus the contest-velocity shortcut:

```python
def counting_sort(a: list[int]) -> list[int]:
    """Stable O(n + k). Handles negatives by offsetting to a 0-based range."""
    if not a:
        return a
    lo, hi = min(a), max(a)
    k = hi - lo + 1                              # key range; OOM risk if hi-lo is huge
    count = [0] * k
    for v in a:
        count[v - lo] += 1                       # offset so negatives index validly
    for i in range(1, k):
        count[i] += count[i - 1]                 # prefix sum
    out = [0] * len(a)
    for v in reversed(a):                        # right-to-left ⇒ stable
        count[v - lo] -= 1
        out[count[v - lo]] = v
    return out


# Contest velocity: when you only need the multiset sorted (not stability over satellite
# data), a Counter + flatten is the one-liner counting sort.
from collections import Counter
def counting_sort_fast(a: list[int]) -> list[int]:
    c = Counter(a)
    return [v for v in range(min(a), max(a) + 1) for _ in range(c[v])]
```

## What the interviewer probes for

- **"How does counting sort beat O(n log n)?"** - It isn't a comparison sort. The lower bound counts comparisons; counting sort makes none - it indexes by key value. The bound only constrains comparison-based algorithms, so it doesn't apply.
- **"What's the catch - when does it fall apart?"** - The key range `k`. It's O(n + k), so a large or unbounded range (`k ≫ n`) makes it slower than quicksort _and_ allocates a `k`-sized array → OOM. Only use it when keys are bounded small integers.
- **"How do you make it stable, and why does that matter?"** - Prefix-sum the counts, then place scanning the input right-to-left. Stability matters because counting sort is the inner pass of radix sort, which is only correct if each digit-pass preserves the order from previous passes.
- **"It has negative numbers - now what?"** - Offset every key by `-min` so the smallest maps to index 0; the range becomes `max - min + 1`. Forgetting this is the standard bug.
- **"Keys are 64-bit integers - still use counting sort?"** - No; `k` is astronomical. Switch to radix sort, which counting-sorts one digit (a small bounded range) at a time, keeping `k` per pass tiny.

## Practice problems

### 1. Sort an Array of Bounded Integers - plain counting sort

Sort an array where all values lie in a known small range, e.g. `0 ≤ a[i] ≤ 10⁵`, with `n` up to `10⁶`. Constraints: the bounded range plus large `n` is the explicit tell - O(n log n) works but O(n) is available.

**Worked examples:**
- **Example 1**
  - **Input:** a = [4, 2, 2, 8, 3, 3, 1] | **Output:** [1, 2, 2, 3, 3, 4, 8]
  - **Explanation:** each value is tallied by a count array indexed by the value itself, then emitted in ascending index order.
- **Example 2**
  - **Input:** a = [0, 0, 0] | **Output:** [0, 0, 0]
  - **Explanation:** all-equal input fills one count slot with 3 and emits it unchanged.

**Constraints:** `0 ≤ a[i] ≤ 10⁵`, `n ≤ 10⁶`.

**Approach:** Direct counting sort. The range `k = 10⁵ + 1` is ≤ `n`, so O(n + k) = O(n). Tally, prefix-sum (or skip it and just emit from raw counts if stability over satellite data isn't needed), and write out. Linear time, no comparisons.

```python
def sort_bounded(a: list[int], k: int = 100_001) -> list[int]:
    count = [0] * k
    for v in a:
        count[v] += 1
    out = []
    for v in range(k):
        out.extend([v] * count[v])
    return out
```

**Complexity:** O(n + k) time, O(k) space.

**Duplicate problems:**
- Sort Colors (LC 75) - same plain counting sort with a tiny fixed range (`k = 3`, the Dutch National Flag values).
- Height Checker (LC 1051) - counting-sort the array, then compare index-by-index against the original to count mismatches.

---

### 2. Sort Characters by Frequency - count then emit

Given a string, return it with characters ordered by **descending frequency** (ties any order). Constraints: input is ASCII/lowercase, so the key alphabet is small (≤ 128) - a counting/bucketing problem.

**Worked examples:**
- **Example 1**
  - **Input:** s = "tree" | **Output:** "eert" (or "eetr")
  - **Explanation:** 'e' appears twice, 't' and 'r' once each; 'e' is emitted first since its bucket has the highest count.
- **Example 2**
  - **Input:** s = "cccaaa" | **Output:** "cccaaa" (or "aaaccc")
  - **Explanation:** 'c' and 'a' both appear 3 times, tying for the highest bucket; either order satisfies the problem.

**Constraints:** `1 ≤ s.length ≤ 5 × 10⁵`, `s` consists of uppercase/lowercase letters and digits.

**Approach:** Counting sort's "tally then emit" applied to frequencies. Count each character (a bounded-range tally), then bucket characters by their _count_ (counts are in `[1, n]`, another bounded range) and emit from the highest-count bucket down. Two layers of counting, zero comparisons of characters.

```python
from collections import Counter

def frequency_sort(s: str) -> str:
    freq = Counter(s)
    buckets = [[] for _ in range(len(s) + 1)]    # bucket[count] = chars with that count
    for ch, c in freq.items():
        buckets[c].append(ch)
    out = []
    for c in range(len(s), 0, -1):               # high frequency first
        for ch in buckets[c]:
            out.append(ch * c)
    return "".join(out)
```

**Complexity:** O(n + alphabet) time, O(n) space.

**Duplicate problems:**
- Top K Frequent Elements (LC 347) - same count-then-bucket-by-frequency technique, stopping after collecting the top `k` buckets instead of emitting all of them.

---

### 3. Relative Sort Array - counting with a custom order

Sort `arr1` so elements appear in the order given by `arr2`; elements of `arr1` not in `arr2` go at the end in ascending order. Constraints: `0 ≤ arr1[i], arr2[i] ≤ 1000` - a bounded range, the counting-sort signal.

**Worked examples:**
- **Example 1**
  - **Input:** arr1 = [2,3,1,3,2,4,6,7,9,2,19], arr2 = [2,1,4,3,9,6] | **Output:** [2,2,2,1,4,3,3,9,6,7,19]
  - **Explanation:** values are emitted in arr2's given order first (with repeats), then leftover values (7, 19) ascending at the end.
- **Example 2**
  - **Input:** arr1 = [28,6,22,8,44,17], arr2 = [22,28,8,6] | **Output:** [22,28,8,6,17,44]
  - **Explanation:** the four values in arr2 are emitted in that order; 17 and 44 aren't in arr2, so they go at the end ascending.

**Constraints:** `1 ≤ arr1.length ≤ 1000`, `1 ≤ arr2.length ≤ 1000`, `0 ≤ arr1[i], arr2[i] ≤ 1000`, `arr2` has distinct elements, every element of `arr2` is in `arr1`.

**Approach:** Tally `arr1` with a counting array (range 0–1000). Emit in two phases: first walk `arr2` in its given order, emitting each value `count[v]` times (and zeroing it); then walk the count array ascending for the leftovers. The bounded range lets you impose an arbitrary key order at O(n + k) with no comparisons.

```python
def relative_sort(arr1: list[int], arr2: list[int]) -> list[int]:
    count = [0] * 1001
    for v in arr1:
        count[v] += 1
    out = []
    for v in arr2:                               # custom order first
        out.extend([v] * count[v]); count[v] = 0
    for v in range(1001):                        # remaining values, ascending
        out.extend([v] * count[v])
    return out
```

**Complexity:** O(n + k) time, O(k) space.

**Duplicate problems:**
- Custom Sort String (LC 791) - same "custom key order" counting technique, applied to characters instead of integers.

---

### 4. H-Index - counting buckets to skip the sort

Given citation counts, find the h-index: the largest `h` such that `h` papers each have ≥ `h` citations. Constraints: `n ≤ 5000`; the obvious solution sorts (O(n log n)), but counting buckets gives O(n).

**Worked examples:**
- **Example 1**
  - **Input:** citations = [3, 0, 6, 1, 5] | **Output:** 3
  - **Explanation:** 3 papers (citations 3, 6, 5) have at least 3 citations each, and no larger h works.
- **Example 2**
  - **Input:** citations = [1, 3, 1] | **Output:** 1
  - **Explanation:** only 1 paper needs at least 1 citation to satisfy h=1; h=2 would need 2 papers with ≥2 citations, but only one qualifies.

**Constraints:** `n ≤ 5000`, `0 ≤ citations[i] ≤ 1000`.

**Approach:** A counting-sort _insight_ without a full sort. Bucket papers by citation count, capping at `n` (citations beyond `n` can't raise the h-index past `n`). Then sweep buckets from high to low, accumulating paper counts; the first point where the running total reaches the citation level is the h-index. The bounded range (`0..n`) is what makes the bucket array legal and the whole thing linear.

```python
def h_index(citations: list[int]) -> int:
    n = len(citations)
    buckets = [0] * (n + 1)
    for c in citations:
        buckets[min(c, n)] += 1                  # cap at n - excess can't help
    total = 0
    for h in range(n, -1, -1):                   # high citation count downward
        total += buckets[h]
        if total >= h:                           # h papers with ≥ h citations
            return h
    return 0
```

**Complexity:** O(n) time, O(n) space.

**Duplicate problems:** none found at verified confidence - the bucket-sweep-to-skip-a-sort insight is distinctive enough that no close LC duplicate shares this exact mechanic.
