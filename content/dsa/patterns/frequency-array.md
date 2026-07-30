# Frequency Array

## Prerequisites

- [Array](../data-structures/array.md) [Must read]
- [Hash Table](../data-structures/hash-table.md) [Must read]

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [Recognition signals](#recognition-signals)
- [How it works](#how-it-works)
- [Complexity](#complexity)
- [Constraints & approach](#constraints--approach)
- [Variations](#variations)
- [CP-primitives](#cp-primitives)
- [Pitfalls](#pitfalls)
- [First 30 seconds](#first-30-seconds)
- [Related](#related)
- [Practice problems](#practice-problems)
  - [Valid Anagram](#1-valid-anagram---character-frequency-comparison)
  - [Group Anagrams](#2-group-anagrams-lc-49)
  - [Find All Anagrams in a String](#3-find-all-anagrams-in-a-string---sliding-window--freq-array)
  - [Sort Characters By Frequency](#4-sort-characters-by-frequency-lc-451---frequency-of-frequencies)

## What it is

A **frequency array** is an array of size `k` (the key range) indexed directly by value, where `freq[v]` stores how many times value `v` appears - a hash map for bounded integer or character keys with O(1) get/set and zero hash-function overhead.

Mental model: **a tally sheet with pre-labeled slots.** Instead of writing down each item and searching for it later, you have a slot numbered 0 to k-1 and you tick the right slot in one step. Looking up the count is equally instant - just read slot `v`.

The senior insight: a frequency array is not "simpler than a hash map" - it's a **specialisation that trades space for a constant-factor speedup**. A `Counter` or `dict` hashes every key, handles collisions, and resizes; under the hood, each lookup may follow a pointer to a separate bucket list (chaining) or probe multiple slots (open addressing), both of which scatter memory accesses. A frequency array skips all of that because the key *is* the index - every increment is a single array write at a predictable address, and the whole array (k = 26 → 104 bytes) fits in one or two cache lines. In practice, for character-frequency problems, this gives ~5–10× throughput over a hash map on hot paths.

> **Takeaway (say this out loud):** "Frequency array - when keys are bounded integers or chars, skip the hash map and use the value as the index. O(1) everywhere, cache-friendly, and trivial to compare two distributions by subtracting arrays."

**Complexity:** O(n + k) time to build, O(1) per increment/lookup, O(k) space.

## Recognition signals

**(a) Trigger phrases** - literal problem-statement snippets that signal this pattern:

- "Given a string, determine if it is an anagram of another string"
- "Find all characters that appear more than k times"
- "Check if two strings contain the same characters"
- "Count the frequency of each element in the array where elements are in range [0, n]"
- "Given that all values are in the range [1, n], find the missing or duplicate number"

**(b) Structural cues** - input shape + output property regardless of wording:

- Input is a sequence of **bounded integers** (values in [0, k) for small k, typically k ≤ 10⁶) or **characters** (ASCII / lowercase alpha).
- The query is about **counts** or **distributions**: how many times does X appear? Do two inputs have the same distribution? Which value appears most/least?
- Output property: a boolean (same distribution?), a count, or a list of values meeting a frequency threshold.
- No ordering on the values is needed - if sorted output is required, you can bucket-sort from the freq array.

**(c) Not to be confused with:**

- **Hash map counting (`Counter`, `dict`)** - use a hash map when key range is unknown, unbounded, or when keys are strings/tuples (non-integer). Frequency array is strictly for bounded integer / character keys; when the key range is large (k > 10⁷) the space cost outweighs the speed gain.
- **Prefix sum** - prefix sums answer "how many values in range [l, r]?" built *on top of* a frequency array; the freq array is the raw count structure, prefix sum is a query layer over it.
- **Bucket sort** - bucket sort *uses* a frequency array to emit values in sorted order; recognizing the frequency array doesn't mean you're doing a sort.

## How it works

Build phase: scan the input once, incrementing `freq[v]` for each value `v`. Query phase: access `freq[v]` in O(1).

Example: count character frequencies in `"banana"` (lowercase alpha, k = 26, offset `ord('a') = 97`).

```
input:  b  a  n  a  n  a
index:  0  1  2  3  4  5

freq array (size 26, initially all 0):

  a  b  c  d  e  f  g  h  i  j  k  l  m  n  o  p ...
[ 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, ...]
  ↑                                       ↑
  'a' seen 3×                             'n' seen 2×

Increment trace:
  'b' → freq[1]++  → freq[1] = 1
  'a' → freq[0]++  → freq[0] = 1
  'n' → freq[13]++ → freq[13] = 1
  'a' → freq[0]++  → freq[0] = 2
  'n' → freq[13]++ → freq[13] = 2
  'a' → freq[0]++  → freq[0] = 3
```

To check if two strings are anagrams: build `freq` for string A (incrementing), then walk string B (decrementing). If any `freq[v] != 0` at the end, they differ.

```
"anagram" vs "nagaram"

After processing "anagram" (increment):
  a→3, g→1, n→1, r→1, m→1

Processing "nagaram" (decrement), step by step:
  'n' → freq[n]-- → n:0          slots: a=3 g=1 n=0 r=1 m=1
  'a' → freq[a]-- → a:2          slots: a=2 g=1 n=0 r=1 m=1
  'g' → freq[g]-- → g:0          slots: a=2 g=0 n=0 r=1 m=1
  'a' → freq[a]-- → a:1          slots: a=1 g=0 n=0 r=1 m=1
  'r' → freq[r]-- → r:0          slots: a=1 g=0 n=0 r=0 m=1
  'a' → freq[a]-- → a:0          slots: a=0 g=0 n=0 r=0 m=1
  'm' → freq[m]-- → m:0          slots: a=0 g=0 n=0 r=0 m=0

All slots zero → anagram ✓

Counter-example - "rat" vs "car":
After increment "rat":  r=1 a=1 t=1
After decrement "car":  r=0 a=0 t=1 c=-1  ← c slot goes negative → NOT anagram
```

## Complexity

| Operation        | Time | Space |
|-----------------|------|-------|
| Build (n elements) | O(n) | O(k) |
| Increment / decrement | O(1) | - |
| Lookup `freq[v]` | O(1) | - |
| Compare two distributions | O(k) | O(k) |
| Full reset | O(k) | - |

k = key range (26 for lowercase alpha, 128 for ASCII, n for [0,n]-bounded integers).

## Constraints & approach

| Input constraint | Signal | Approach |
|-----------------|--------|----------|
| `k ≤ 26` (lowercase alpha) | Tiny key range | Frequency array - fits in a cache line, zero overhead |
| `k ≤ 128` (ASCII) | Small key range | Frequency array - still faster than hash map |
| `k ≤ 10⁶` | Moderate range | Frequency array still viable; watch the O(k) reset cost per test case |
| `k > 10⁷` or keys are strings/floats | Large / non-integer range | Hash map (`Counter`, `dict`) - space cost of freq array exceeds the gain |
| Values are unbounded or negative | No natural bound | Coordinate-compress first, then freq array; or use hash map |
| Query is "how many values in [l, r]?" | Range count | Prefix sum *on top of* freq array |
| Output must be sorted by value | Sorted output | Emit freq array left-to-right - implicit counting sort |

**The key read:** when the problem gives you `1 ≤ values ≤ 10⁵` or "lowercase English letters only", that's the green light. When it says "arbitrary integers" or "strings as keys", go to hash map.

**Real-world anchor:** Linux's `perf` subsystem tracks hardware-event counts per CPU core using fixed-size integer-indexed arrays (one slot per event ID) - the same frequency-array idea, chosen over a hash map precisely because the event-ID space is bounded and the cache footprint must stay minimal in a hot interrupt path.

## Variations

- **Character frequency (anagram family):** k = 26 or 128, offset by `ord('a')`. The canonical use.
- **Delta array (increment A, decrement B, check all-zero):** checks distribution equality without comparing the two freq arrays element-by-element.
- **Frequency of frequencies:** `freq_of_freq[c]` = how many distinct values appear exactly `c` times. Used in "one edit to make all frequencies equal" problems.
- **Counting sort as a side-effect:** iterating the freq array left-to-right and emitting each value `freq[v]` times produces a sorted output - O(n + k), the same pass that built the array.
- **Difference array for range increments:** a related-but-distinct structure where `diff[l] += x` and `diff[r+1] -= x` represents a range update; a prefix sum of `diff` recovers the actual values. Not a frequency array - use it for range-update, point-query problems.

## CP-primitives

**1. Frequency array as counting sort - O(n + k)**

When the problem asks you to "sort" n integers in [0, k) and k is small, skip the comparison sort entirely: build the freq array in O(n), then emit in O(k). Total O(n + k), beating O(n log n) for small k. Contest signal: `n ≤ 10⁶` and values are bounded characters or small integers - counting sort is the expected solution.

```python
def counting_sort(nums: list[int], k: int) -> list[int]:
    freq = [0] * k
    for v in nums:
        freq[v] += 1
    return [v for v in range(k) for _ in range(freq[v])]
```

**2. Sliding-window frequency array - O(n) anagram / substring search**

For "find all windows of size k with the same character distribution as pattern P", maintain a freq array for the window. On each slide: `freq[outgoing]--`, `freq[incoming]++`, then check if `freq == pattern_freq` in O(1) by tracking a mismatch counter (the number of characters where `freq[c] != pattern_freq[c]`). Comparing two 26-element arrays per slide is O(26) = O(1), giving O(n) overall instead of O(n·k).

```python
def count_anagram_windows(s: str, p: str) -> list[int]:
    from collections import defaultdict
    pf = [0] * 26
    wf = [0] * 26
    for c in p:
        pf[ord(c) - 97] += 1

    result = []
    k = len(p)
    mismatches = sum(1 for i in range(26) if pf[i] != wf[i])

    for r in range(len(s)):
        inc = ord(s[r]) - 97
        if wf[inc] == pf[inc]:
            mismatches += 1
        wf[inc] += 1
        if wf[inc] == pf[inc]:
            mismatches -= 1

        if r >= k:
            out = ord(s[r - k]) - 97
            if wf[out] == pf[out]:
                mismatches += 1
            wf[out] -= 1
            if wf[out] == pf[out]:
                mismatches -= 1

        if r >= k - 1 and mismatches == 0:
            result.append(r - k + 1)
    return result
```

**3. XOR parity via frequency array - O(n) odd-occurrence detection**

For "find the element that appears an odd number of times", XOR all elements: `reduce(xor, nums)`. This is equivalent to a frequency array mod 2 - XOR collapses the even counts to 0 and leaves the odd one. Generalization: `freq[v] % 2` tells you parity without storing full counts. Useful in bitmask-DP problems where you only care whether a value appears an even or odd number of times.

## Pitfalls

**1. Off-by-one on the key range / wrong offset.**
For lowercase alpha, `freq[ord(c) - ord('a')]` - if you forget the offset and use `freq[ord(c)]`, you need an array of size 128 and you'll silently write out-of-bounds in languages without bounds checking. Always make the offset explicit. For integers in [1, n], allocate size `n + 1` (not `n`).

**2. Using a freq array when keys are unbounded or non-integer.**
If the problem says "integers up to 10⁹" or "string keys", a freq array of that size is either impossible or absurd. The signal is whether the *value* fits as an array index. When in doubt, check: `k ≤ 10⁶` → freq array; `k > 10⁷` or non-integer → `Counter` / `dict`.

**3. Forgetting to reset between test cases - or resetting the wrong range (CP-specific).**
In competitive programming with T test cases and a global freq array of size k, a naive `freq = [0] * k` reset per case costs O(T × k) total. When k = 10⁶ and T = 10⁵, that's 10¹¹ operations - instant TLE regardless of your algorithm. The fix: only reset the *used range*. After each test case, walk the elements you actually touched and zero those slots (`for v in seen: freq[v] = 0`), keeping reset cost at O(n) per case instead of O(k). Alternatively, use a generation counter (`if tag[v] != current_gen: freq[v] = 0`) to make "reset" O(1). This gap - O(k) vs O(n) reset - is the exact trap that separates contest veterans from juniors on problems with large k and many test cases.

**4. Treating "same freq array" as "same multiset" without length check.**
Two strings of different lengths can never be anagrams, but a buggy freq-array comparison (A increments, B decrements, check all-zero) might pass if A has `"a"` and B has `""` and you only check a subset of the array. Always verify `len(A) == len(B)` first, or let the delta check catch it (the total delta across all slots will be non-zero if lengths differ).

## First 30 seconds

"The keys here are bounded - lowercase letters, so k = 26 - which means I can use a frequency array instead of a hash map: allocate `freq[26]`, index by `ord(c) - ord('a')`, O(1) per increment and lookup with no hashing overhead. If the key range were unbounded or non-integer I'd switch to `Counter`, but with k = 26 the array fits in a cache line. I'll scan the input once to build it, then answer the query directly. If the task is comparing two distributions, I'll use the delta trick - increment for one string, decrement for the other, anagram iff all slots are zero."

## Related

- [Array](../data-structures/array.md) - the underlying structure; freq array is just an array with a semantic indexing contract.
- [Hash Table](../data-structures/hash-table.md) - the general alternative; use when keys are unbounded, non-integer, or sparse.
- [Sliding Window](./sliding-window.md) - combines with freq array for the O(n) anagram / substring-distribution pattern.
- [Counting Sort](../algorithms/counting-sort.md) - is a freq array build followed by an emit pass; the two algorithms share the same O(n + k) structure.
- [Prefix Sum](./prefix-sum.md) - can be built *on top of* a freq array to answer range-count queries in O(1).

## Practice problems

### 1. Valid Anagram - character frequency comparison

Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise. `1 ≤ len(s), len(t) ≤ 5 × 10⁴`, lowercase English letters only.

**Worked examples:**
- **Example 1**
  - **Input:** s = "anagram", t = "nagaram" | **Output:** true
- **Example 2**
  - **Input:** s = "rat", t = "car" | **Output:** false

**Constraints:** `1 ≤ s.length, t.length ≤ 5×10⁴`, `s` and `t` consist of lowercase English letters.

**Approach:** classic freq array delta. Increment for every character in `s`, decrement for every character in `t`. If all 26 slots are zero at the end, same multiset → anagram. Guard: if `len(s) != len(t)`, return early - the delta check won't catch differing lengths cleanly.

```python
def is_anagram(s: str, t: str) -> bool:
    if len(s) != len(t):
        return False
    freq = [0] * 26
    for c in s:
        freq[ord(c) - 97] += 1
    for c in t:
        freq[ord(c) - 97] -= 1
    return all(f == 0 for f in freq)
```

**Time:** O(n). **Space:** O(1) (k = 26 constant).

**Duplicate problems:**
- Ransom Note (LC 383) - one-directional delta: magazine freq must cover ransom note freq; same increment/decrement mechanic, no length guard needed.
- Check if Two String Arrays are Equivalent (LC 1662) - iterate both arrays as a single implicit string and apply the same all-zero delta check.

---

### 2. Group Anagrams (LC 49)

Given an array of strings, group the anagrams together (any order). `1 ≤ strs.length ≤ 10⁴`, `0 ≤ strs[i].length ≤ 100`, lowercase English letters.

**Worked examples:**
- **Example 1**
  - **Input:** strs = ["eat","tea","tan","ate","nat","bat"] | **Output:** [["bat"],["nat","tan"],["ate","eat","tea"]]
- **Example 2**
  - **Input:** strs = [""] | **Output:** [[""]]

**Constraints:** `1 ≤ strs.length ≤ 10⁴`, `0 ≤ strs[i].length ≤ 100`, `strs[i]` consists of lowercase English letters.

**Approach.** Distinct from Valid Anagram's direct two-string comparison: here the freq array itself becomes a **grouping key**. For each string, build its 26-slot character-frequency array, convert it to an immutable hashable form (a tuple), and use that as a dictionary key mapping to the list of strings sharing that exact distribution. Two strings are anagrams iff their freq-array tuples are identical, so this buckets all of them in one O(total characters) pass with no pairwise comparison.

```python
from collections import defaultdict

def group_anagrams(strs: list[str]) -> list[list[str]]:
    groups: dict[tuple[int, ...], list[str]] = defaultdict(list)
    for s in strs:
        freq = [0] * 26
        for c in s:
            freq[ord(c) - 97] += 1
        groups[tuple(freq)].append(s)
    return list(groups.values())
```

**Complexity.** O(n·k) time (n strings, average length k), O(n·k) space.

**Duplicate problems:**
- Find All Duplicates via Anagram Signature (informal variant) - same freq-array-as-key idea applied to deduplication instead of grouping.

---

### 3. Find All Anagrams in a String - sliding window + freq array

Given strings `s` and `p`, return a list of all start indices where `p` is an anagram of the substring of `s`. `1 ≤ len(s), len(p) ≤ 3 × 10⁴`, lowercase.

**Worked examples:**
- **Example 1**
  - **Input:** s = "cbaebabacd", p = "abc" | **Output:** [0,6]
- **Example 2**
  - **Input:** s = "abab", p = "ab" | **Output:** [0,1,2]

**Constraints:** `1 ≤ s.length, p.length ≤ 3×10⁴`, `s` and `p` consist of lowercase English letters.

**Approach:** sliding-window with mismatch counter (see Worked Problems above and CP-primitive 2). The O(n) solution uses the freq array for the window and a single integer `mismatches` so each slide is O(1) - no per-slide array comparison.

```python
def find_anagrams(s: str, p: str) -> list[int]:
    k, n = len(p), len(s)
    if k > n:
        return []
    pf, wf = [0] * 26, [0] * 26
    for c in p:
        pf[ord(c) - 97] += 1
    mismatches = sum(1 for i in range(26) if pf[i] != wf[i])
    result = []
    for r in range(n):
        inc = ord(s[r]) - 97
        mismatches += (1 if wf[inc] == pf[inc] else 0)
        wf[inc] += 1
        mismatches -= (1 if wf[inc] == pf[inc] else 0)
        if r >= k:
            out = ord(s[r - k]) - 97
            mismatches += (1 if wf[out] == pf[out] else 0)
            wf[out] -= 1
            mismatches -= (1 if wf[out] == pf[out] else 0)
        if r >= k - 1 and mismatches == 0:
            result.append(r - k + 1)
    return result
```

**Time:** O(n + m). **Space:** O(1).

**Duplicate problems:**
- Permutation in String (LC 567) - identical mismatch-counter sliding window; returns a boolean instead of all start indices.
- Minimum Window Substring (LC 76) - same freq-array window but variable-size: shrink from left until the coverage constraint is met.

### 4. Sort Characters By Frequency (LC 451) - frequency of frequencies

Given a string `s`, sort it so characters appear in decreasing order of frequency. `1 ≤ len(s) ≤ 5 × 10⁵`, ASCII.

**Worked examples:**
- **Example 1**
  - **Input:** s = "tree" | **Output:** "eert"
  - **Explanation:** 'e' appears twice, 'r' and 't' once each; any valid ordering of the ties is accepted.
- **Example 2**
  - **Input:** s = "cccaaa" | **Output:** "cccaaa"
  - **Explanation:** 'c' and 'a' both appear 3 times; both orderings are valid.

**Constraints:** `1 ≤ s.length ≤ 5×10⁵`, `s` consists of uppercase/lowercase letters and digits.

**Approach:** build a freq array for all 128 ASCII characters. Then use a bucket indexed by frequency (freq-of-freq variant): `bucket[freq]` holds all characters appearing exactly `freq` times. Scan buckets from high to low, appending each character `freq` times. This is O(n + k) - no comparison sort on the characters needed.

**Distinct technique:** this exercises *bucket grouping by frequency*, not just raw counting - the two-level structure (freq array → bucket array → output) is the key pattern.

```python
def frequency_sort(s: str) -> str:
    freq = [0] * 128
    for c in s:
        freq[ord(c)] += 1
    bucket: list[list[str]] = [[] for _ in range(len(s) + 1)]
    for i, f in enumerate(freq):
        if f > 0:
            bucket[f].append(chr(i))
    result = []
    for f in range(len(s), 0, -1):
        for c in bucket[f]:
            result.append(c * f)
    return ''.join(result)
```

**Time:** O(n). **Space:** O(n + k).

**Duplicate problems:**
- Top K Frequent Elements (LC 347) - same bucket-by-frequency structure, stops early once k elements are collected instead of emitting the full sorted output.
- Top K Frequent Words (LC 692) - same bucket-by-frequency structure; only difference is lexicographic tiebreaking within a frequency bucket.
- Reorganize String (LC 767) - build freq array, check max freq ≤ ⌈n/2⌉, then greedily interleave using a heap over the freq array.
