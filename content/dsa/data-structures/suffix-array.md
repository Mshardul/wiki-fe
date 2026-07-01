# Suffix Array

## Prerequisites

- [Array](./array.md) [Must read] - a suffix array is literally an array of sorted integer indices; you need array indexing, slicing, and sorting concepts before the build algorithm makes sense.
- [String](./string.md) [Must read] - a suffix array is built on top of a string's suffixes; the character-comparison model and substring intuition transfer directly.
- [Binary Search](../algorithms/binary-search.md) [Must read] - pattern matching on a built suffix array is binary search; the O(m log n) query cost only makes sense once binary search is second nature.
- [Trie](./trie.md) [Should read] - the suffix trie / suffix tree is the conceptual ancestor; contrasting the two sharpens why the suffix array exists and what it trades away.

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
- [Traversal & invariant](#traversal--invariant)
- [Implementation](#implementation)
- [CP-primitives](#cp-primitives)
  - [LCP array for pattern counting](#lcp-array-for-pattern-counting)
  - [Longest repeated substring](#longest-repeated-substring)
  - [Z-array vs suffix array](#z-array-vs-suffix-array)
- [Gotchas / edge cases](#gotchas--edge-cases)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)
  - [Longest repeated substring](#1-longest-repeated-substring)
  - [Number of distinct substrings](#2-number-of-distinct-substrings)
  - [Longest common substring of two strings](#3-longest-common-substring-of-two-strings)

## What it is

A **suffix array** (`SA`) is an array of integers in `[0, n)`, sorted so that `SA[i]` is the starting index of the `i`-th lexicographically smallest suffix of the string — giving you the power of a sorted suffix dictionary without the pointer-per-character overhead of a suffix tree.

Mental model: **a yellow-pages index for every tail of your string.** Imagine ripping a book into all its "chapters-and-everything-after" tails, then alphabetizing them and keeping only the page numbers in that alphabetical order. Looking up a pattern means binary-searching those page numbers to find which sorted tail it sits in — no scanning, no hash collision, no extra memory beyond one array of ints.

> **Takeaway (say this out loud):** "A suffix array is a sorted index into a string's suffixes — it's what you get when you want a suffix tree's query power but the cache-friendly footprint of a plain array."

## How it works

Every position `i` in a string `s` of length `n` defines a suffix `s[i:]`. The suffix array `SA` is the permutation of `{0, 1, …, n-1}` that sorts those suffixes in lexicographic order.

**Construction on `"banana"` (n = 6):**

```
index  suffix
  0    banana
  1    anana
  2    nana
  3    ana
  4    na
  5    a

sorted lexicographically:
  rank 0:  "a"      → SA[0] = 5
  rank 1:  "ana"    → SA[1] = 3
  rank 2:  "anana"  → SA[2] = 1
  rank 3:  "banana" → SA[3] = 0
  rank 4:  "na"     → SA[4] = 4
  rank 5:  "nana"   → SA[5] = 2

SA = [5, 3, 1, 0, 4, 2]
```

**Pattern search.** To find pattern `P = "ana"` in `s`, binary-search `SA` twice: once for the first position where `s[SA[i]:]` is `≥ P` and once for where it is `> P`. The range `[lo, hi)` in `SA` is the set of all starting positions of occurrences. Each binary-search step compares at most `|P|` characters, so search is `O(|P| log n)`.

```
SA = [5, 3, 1, 0, 4, 2]
     "a" "ana" "anana" "banana" "na" "nana"

binary search for "ana":
  lo = 1  (first SA[i] where suffix ≥ "ana")
  hi = 3  (first SA[i] where suffix > "ana...")
  matches at SA[1]=3, SA[2]=1  → "ana" starts at positions {1, 3}
```

**LCP array.** The companion **Longest Common Prefix array** (`LCP[i]`) stores the length of the longest common prefix between `SA[i-1]`'s suffix and `SA[i]`'s suffix. Together, `SA` and `LCP` unlock almost every suffix-query task. LCP construction via **Kasai's algorithm** runs in O(n) and is the standard post-build step (see [Variants](#variants)).

**Cache behavior.** Because `SA` is a contiguous array of integers and binary search strides across it predictably, the pattern-match inner loop is far more cache-friendly than traversing the pointer-threaded nodes of a suffix tree — this is why suffix arrays beat suffix trees in practice even at the same asymptotic complexity.

## Operations

| Operation                           | Time                     | Space          |
| ----------------------------------- | ------------------------ | -------------- |
| Build suffix array (prefix-doubling)| O(n log² n)              | O(n)           |
| Build suffix array (SA-IS / DC3)    | O(n)                     | O(n)           |
| Pattern search (binary search)      | O(m log n)               | O(1) extra     |
| Pattern search (with LCP array)     | O(m + log n)             | O(1) extra     |
| Build LCP array (Kasai's algorithm) | O(n)                     | O(n)           |
| LCP query between two suffixes      | O(1) with sparse table   | O(n log n)     |
| Count occurrences of pattern        | O(m log n) or O(m+log n) | O(1) extra     |
| Longest repeated substring          | O(n) (scan LCP array)    | O(n)           |
| Number of distinct substrings       | O(n) (n(n+1)/2 − ΣLCP)  | O(n)           |

`n` = text length, `m` = pattern length.

## Complexity summary

| Task                    | Best         | Average      | Worst        | Space       |
| ----------------------- | ------------ | ------------ | ------------ | ----------- |
| Build (prefix-doubling) | O(n log² n)  | O(n log² n)  | O(n log² n)  | O(n)        |
| Build (SA-IS)           | O(n)         | O(n)         | O(n)         | O(n)        |
| Pattern search          | O(m)         | O(m log n)   | O(m log n)   | O(1)        |
| LCP array build (Kasai) | O(n)         | O(n)         | O(n)         | O(n)        |
| RMQ on LCP (LCP query)  | O(1) query   | O(1) query   | O(1) query   | O(n log n)  |

There is **no amortized behavior** in a suffix array: build is one-shot, queries are independent. Pattern search is the same cost every call — no hot-path amortization applies.

## When to use / when not

**Reach for a suffix array when:**

- You need to answer **multiple pattern-matching queries** on a fixed text — build the SA once in O(n log n) or O(n), then answer each O(m log n); better than re-running KMP/Z per query.
- You need **all occurrences** of a pattern rather than just one — the SA's contiguous hit-range gives them all in one binary search.
- You need **longest common extension**, **longest repeated substring**, or **number of distinct substrings** — these collapse to LCP-array scans after a single O(n) build.
- Memory is constrained — suffix arrays use 4–8 bytes per character vs suffix trees' 20–40 bytes per node.

**Reach for something else when:**

- **Single-query, single-pattern** matching on a short-lived text → [KMP](../algorithms/string-matching.md) or [Z-algorithm](../algorithms/z-algorithm.md) at O(n+m) with O(n) build, no O(n log n) up-front cost.
- **Rolling hash / existence check with no repeats** → [Rabin-Karp](../algorithms/rabin-karp.md) is O(n) build and O(1) per sliding window — far cheaper if you only need one scan.
- **Prefix queries** (autocomplete, "all strings starting with…") → a [trie](./trie.md) is purpose-built; a suffix array's binary search gives prefix ranges but doesn't enumerate them as cleanly.
- **Online (streaming) text** where you can't afford to rebuild → KMP or Aho-Corasick pattern automata work online; suffix arrays require a complete, static text.

**At scale:** Bioinformatics tools (BWA, Bowtie, samtools) build suffix arrays over genomes of 3 × 10⁹ characters. At that size, prefix-doubling's O(n log² n) is roughly 10¹² comparisons — unusable; SA-IS with a compressed (FM-index) representation is the standard. For typical competitive programming constraints (n ≤ 10⁵–10⁶), prefix-doubling is fine.

## Comparison

| Structure                      | Build time    | Space          | Pattern query    | Prefix enum | Implementation | Pick it when…                                    |
| ------------------------------ | ------------- | -------------- | ---------------- | ----------- | -------------- | ------------------------------------------------ |
| **Suffix Array**               | O(n log² n)   | **O(n)**       | O(m log n)       | via bisect  | medium         | multi-query text search, genome tools, CP        |
| Suffix Tree                    | O(n) (Ukkonen)| O(n) (30–40B/node) | **O(m)**   | O(p)        | **hard**       | single-query O(m) is required; willing to code Ukkonen |
| [Trie](./trie.md)              | O(total chars)| O(n·alphabet) | O(m)             | **O(p)**    | easy           | prefix queries, autocomplete, sparse dictionaries |
| [Rabin-Karp](../algorithms/rabin-karp.md) | O(n) | O(1)      | O(n) per pattern | no          | easy           | one-shot sliding-window search, plagiarism check |
| [Z-algorithm](../algorithms/z-algorithm.md) | O(n) | O(n)  | O(n+m) per query | no          | easy           | single pattern, many texts, online match         |

The suffix array is the **sweet spot**: nearly as fast as a suffix tree for queries, dramatically simpler to implement, and uses flat memory that the CPU loves. The suffix tree wins only if you need O(m) queries and are willing to implement Ukkonen's algorithm.

## Variants

**Standard suffix array (prefix-doubling, O(n log² n)).** The taught version. Sort suffixes by their length-1 prefix, then iteratively sort by doubled prefix lengths (1, 2, 4, 8, …). Each doubling round is a radix sort in O(n), and there are O(log n) rounds — total O(n log n) rounds × O(log n) sort = O(n log² n). Concrete and implementable in contest conditions (see [Implementation](#implementation)).

**SA-IS (Suffix Array by Induced Sorting, O(n)).** The gold standard. Classifies each suffix as S-type or L-type based on its suffix's first character vs its right neighbor, then uses a clever induced-sorting pass over LMS (leftmost-S-type) suffixes to build the SA in linear time. Requires O(alphabet) auxiliary space. The algorithm behind most production tools; conceptually more involved but the code is ~100 lines.

**DC3 / Skew algorithm (O(n)).** An alternative linear construction: partition suffix positions into those at indices `i % 3 ≠ 0` and `i % 3 = 0`, sort the first group recursively (reducing the problem to ⅔ size), then use the result to sort the remaining group. Two recursive calls on ⅔-size problems gives T(n) = T(2n/3) + O(n) = O(n). Theoretically clean; SA-IS has a smaller constant in practice.

**Enhanced suffix array (SA + LCP + child table).** Augmenting `SA` with the `LCP` array (Kasai, O(n)) and a range-minimum-query structure on `LCP` (sparse table, O(n log n) build, O(1) query) gives O(m + log n) pattern matching — one binary search step per LCP comparison rather than one character per step. This is the production version for high-query workloads.

**Compressed suffix array / FM-index.** For texts of gigabytes (genomics), the O(n) space of an explicit SA is still too large. The FM-index represents the SA implicitly via the Burrows-Wheeler Transform and wavelet trees, using O(n log σ) bits (σ = alphabet size). Querying runs in O(m) via backward search. The standard in bioinformatics.

## Traversal & invariant

A suffix array's **ordering invariant** is precisely: for all `0 ≤ i < j < n`, the suffix starting at `SA[i]` is strictly lexicographically less than the suffix starting at `SA[j]`. This is a **total order on suffixes** — no ties are possible because no two suffixes of the same string are equal (they differ at least in length, with the shorter one being a strict prefix of the longer, but in the standard `$`-terminated construction they differ at the terminator; in Python's string comparison, the shorter suffix wins on equal prefix).

**Binary search for pattern matching.** Because `SA` is sorted, `std::lower_bound` / `bisect_left` on suffix comparisons finds the first position in `SA` whose suffix is `≥ P`, and `bisect_right` finds the first whose suffix is `> P`. The range `[lo, hi)` in `SA` contains all occurrence positions. Each comparison takes O(m), and O(log n) comparisons are made → **O(m log n)** per query.

```
SA over "banana$" = [6, 5, 3, 1, 0, 4, 2]
               suffixes sorted: "$" "a$" "ana$" "anana$" "banana$" "na$" "nana$"

query P = "na":
  bisect_left  → lo = 4  (first suffix ≥ "na")
  bisect_right → hi = 6  (first suffix > "na...")
  SA[4]=4, SA[5]=2 → "na" starts at positions {4, 2}
```

**LCP array and O(m + log n) matching.** The LCP array stores `LCP[i] = len(longest common prefix of suffix SA[i-1] and suffix SA[i])`, with `LCP[0] = 0`. Once the initial binary-search bounds `[lo, hi)` are found, the LCP within that range is at least `|P|` — you can use this to skip re-comparing matched characters in subsequent binary steps, reducing total character comparisons from O(m log n) to O(m + log n). An RMQ structure on `LCP` enables O(1) range-minimum queries, making this practical.

**The LCP array as a compact suffix tree.** Every internal node of the conceptual suffix tree corresponds to a **range** in `SA` with its LCP value as the "string depth." The LCP array is, in effect, a flattened suffix tree — enabling suffix-tree algorithms (longest repeated substring, etc.) to run on the cache-friendly flat array.

## Implementation

**CLRS-style pseudocode — prefix-doubling construction:**

```
procedure BUILD-SUFFIX-ARRAY(s, n)
    ▷ Append sentinel '$' (smallest char) to s; n becomes n+1
    SA[0..n-1]  ← indices sorted by s[i]           ▷ initial rank = single char
    rank[i]     ← character rank of s[i]

    k = 1
    while k < n do
        ▷ Two-pass radix sort on pair (rank[i], rank[i+k]):
        ▷ Pass 1 — stable sort SA by secondary key rank[i+k]
        cnt[0..n] ← 0
        for i = 0 to n-1 do
            r2 ← rank[SA[i] + k] if SA[i]+k < n else 0
            cnt[r2] ← cnt[r2] + 1
        for i = 1 to n do cnt[i] ← cnt[i] + cnt[i-1]   ▷ prefix sums
        for i = n-1 downto 0 do                          ▷ right-to-left for stability
            r2 ← rank[SA[i] + k] if SA[i]+k < n else 0
            cnt[r2] ← cnt[r2] - 1
            tmp[cnt[r2]] ← SA[i]
        SA ← tmp

        ▷ Pass 2 — stable sort SA by primary key rank[i]
        cnt[0..n] ← 0
        for i = 0 to n-1 do cnt[rank[SA[i]]] ← cnt[rank[SA[i]]] + 1
        for i = 1 to n do cnt[i] ← cnt[i] + cnt[i-1]
        for i = n-1 downto 0 do
            cnt[rank[SA[i]]] ← cnt[rank[SA[i]]] - 1
            tmp[cnt[rank[SA[i]]]] ← SA[i]
        SA ← tmp

        ▷ Re-rank: equal pairs get same new rank
        new_rank[SA[0]] ← 0
        for i = 1 to n-1 do
            if (rank[SA[i]], rank[SA[i]+k]) = (rank[SA[i-1]], rank[SA[i-1]+k])
                new_rank[SA[i]] ← new_rank[SA[i-1]]   ▷ same pair, same rank
            else
                new_rank[SA[i]] ← new_rank[SA[i-1]] + 1
        rank ← new_rank

        if rank[SA[n-1]] = n-1 then break             ▷ all ranks distinct, done
        k ← 2k
    return SA
```

**Why O(n log n) with radix sort, O(n log² n) with comparison sort.** There are O(log n) doubling rounds. Each round sorts by a pair of integer ranks — a two-pass counting sort (one pass per key component) runs in O(n) per round because the rank values are bounded by n. Total: O(n) × O(log n) rounds = **O(n log n)**. If you replace the two-pass radix sort with Python's `sorted()` (Timsort, O(n log n) per round), the total becomes O(n log n · log n) = **O(n log² n)**. The Python implementation below uses `sorted()` for clarity; the pseudocode above shows the O(n log n) radix path.

**Python — from-scratch prefix-doubling construction:**

```python
from __future__ import annotations


def build_suffix_array(s: str) -> list[int]:
    """O(n log^2 n) prefix-doubling suffix array construction."""
    s = s + "\x00"          # sentinel: smallest ASCII character
    n = len(s)

    # Initial rank = character ordinal; SA = sorted by single char
    sa = sorted(range(n), key=lambda i: s[i])
    rank = [0] * n
    rank[sa[0]] = 0
    for i in range(1, n):
        rank[sa[i]] = rank[sa[i - 1]] + (0 if s[sa[i]] == s[sa[i - 1]] else 1)

    k = 1
    while k < n:
        # Sort by (rank[i], rank[i+k]) pairs
        sa = sorted(range(n), key=lambda i: (rank[i], rank[i + k] if i + k < n else -1))

        # Re-rank based on the pair
        new_rank = [0] * n
        new_rank[sa[0]] = 0
        for i in range(1, n):
            prev, cur = sa[i - 1], sa[i]
            prev_pair = (rank[prev], rank[prev + k] if prev + k < n else -1)
            cur_pair  = (rank[cur],  rank[cur  + k] if cur  + k < n else -1)
            new_rank[cur] = new_rank[prev] + (0 if cur_pair == prev_pair else 1)

        rank = new_rank
        if rank[sa[-1]] == n - 1:
            break               # all ranks distinct; SA is complete
        k *= 2

    return sa


def build_lcp_array(s: str, sa: list[int]) -> list[int]:
    """Kasai's algorithm: O(n) LCP array construction."""
    n = len(s)
    rank = [0] * n          # inverse of SA
    for i, v in enumerate(sa):
        rank[v] = i

    lcp = [0] * n
    h = 0
    for i in range(n):
        if rank[i] > 0:
            j = sa[rank[i] - 1]
            while i + h < n and j + h < n and s[i + h] == s[j + h]:
                h += 1
            lcp[rank[i]] = h
            if h > 0:
                h -= 1      # key insight: LCP can only drop by 1 between adjacent positions
    return lcp


def search(s: str, sa: list[int], pattern: str) -> list[int]:
    """Binary-search the suffix array; returns sorted list of match positions."""
    n = len(sa)
    m = len(pattern)

    # Manual binary search — works on all Python 3.x versions
    lo, hi = 0, n
    while lo < hi:
        mid = (lo + hi) // 2
        if s[sa[mid]:sa[mid] + m] < pattern:
            lo = mid + 1
        else:
            hi = mid
    left = lo

    lo, hi = 0, n
    while lo < hi:
        mid = (lo + hi) // 2
        if s[sa[mid]:sa[mid] + m] <= pattern:
            lo = mid + 1
        else:
            hi = mid
    right = lo

    return sorted(sa[left:right])


# --- quick smoke test ---
if __name__ == "__main__":
    text = "banana"
    sa   = build_suffix_array(text)          # built on "banana\x00" internally
    lcp  = build_lcp_array(text + "\x00", sa)
    print("SA:", sa)          # [6, 5, 3, 1, 0, 4, 2] — index 6 is sentinel '\x00'
    print("LCP:", lcp)
    print("search 'ana':", search(text + "\x00", sa, "ana"))  # [1, 3]
```

**Kasai's algorithm insight.** When you compute `LCP` for suffix at position `i` (rank `r`), the result is `h`. Move to position `i+1` (rank `r'`). The suffix starting at `i+1` is `s[i:]` with its first character stripped — its LCP with its SA-neighbor can only be `h-1` at minimum (the neighbor's first character changes, but the remaining `h-1` characters still match). So Kasai's algorithm starts each LCP computation at `h-1` from the previous step — amortized O(n) total.

## CP-primitives

Three suffix-array techniques that unlock hard string problems in contests.

### LCP array for pattern counting

After building `SA` and `LCP`, counting the number of occurrences of pattern `P` is a binary search on `SA` for the range `[lo, hi)` — the count is `hi - lo`. But with the `LCP` array and a **sparse table for range-minimum queries (RMQ)**, you can accelerate the binary search from O(m log n) to **O(m + log n)**: once you've matched `m` characters to land in the correct SA range, subsequent binary-search pivots can use `RMQ(LCP, lo, mid)` to skip characters already known to match, reducing character comparisons to O(m) total.

**Why for CP:** Any "count occurrences of P in T" problem with many queries goes from O(q · m log n) to O(n log n build + q(m + log n)) — the LCP RMQ is the difference between TLE and AC on large test cases.

### Longest repeated substring

The longest repeated substring equals `max(LCP)` — the maximum value in the LCP array. `LCP[i]` is the length of the longest common prefix between the `(i-1)`-th and `i`-th suffixes in sorted order; if two suffixes share `k` characters, those `k` characters form a repeated substring. Taking the maximum identifies the longest one.

```python
def longest_repeated_substring(s: str) -> str:
    sa  = build_suffix_array(s)
    lcp = build_lcp_array(s + "\x00", sa)
    best_len = max(lcp)
    best_pos = lcp.index(best_len)
    return s[sa[best_pos]: sa[best_pos] + best_len]
```

**Why for CP:** Collapses a non-obvious O(n²) brute-force into a one-liner O(n) scan after the O(n log² n) build — a classic suffix-array showcase problem.

### Z-array vs suffix array

The **Z-array** (Z-function) `Z[i]` = length of the longest string starting at `s[i]` that matches a prefix of `s`. Both Z-array and SA/LCP answer substring queries, but differently:

| Tool       | Build  | Single pattern match | Multiple patterns | Repeated substrings |
| ---------- | ------ | -------------------- | ----------------- | ------------------- |
| Z-array    | O(n+m) | O(n+m) per query     | O(q(n+m))         | non-trivial         |
| SA + LCP   | O(n log² n) | O(m log n)    | O(q · m log n)    | O(n) scan           |

**Rule:** use the [Z-algorithm](../algorithms/z-algorithm.md) for a single pattern in a single text; use the suffix array when you have a fixed text with many queries, or need structural properties (longest repeated, distinct substrings).

## Gotchas / edge cases

**1. Sentinel character is mandatory (CP trap).** The standard prefix-doubling algorithm assumes no two suffixes are identical — impossible for a proper string, but the comparison `s[i:]` vs `s[j:]` (where one is a prefix of the other) can tie without a sentinel. Appending `$` (or `\x00`) — strictly smaller than any character in the alphabet — ensures the shorter suffix sorts before the longer one and all suffixes are distinct. Forgetting the sentinel produces incorrect `SA` ranks, breaking LCP construction silently. Every hand-rolled SA should start with `s += "$"`.

**2. 0-vs-1 indexing in LCP (CP trap).** `LCP[0]` is conventionally `0` (no predecessor for the first suffix). `LCP[i]` is the LCP between `SA[i-1]` and `SA[i]`. It's `LCP[i]` not `LCP[i+1]` that describes the gap between adjacent SA entries — off-by-one here corrupts longest-repeated and distinct-substring computations. When porting code, double-check the convention in the reference (some implementations use 1-indexed `SA` and `LCP`).

**3. Comparing suffix lengths without sentinels.** In Python, `"banana" < "ban"` is `False` (longer wins on equal prefix) — this is the opposite of what suffix array construction wants. Without the sentinel, the suffix `"an"` (starting at index 4) should sort before `"anana"` (starting at index 1) because it's shorter; Python's string comparison would say `"an" < "anana"` — coincidentally correct here, but the convention breaks when the shorter suffix is a strict prefix of the longer. The sentinel short-circuits this by making the terminator sort smallest, so the shorter suffix always comes first.

**4. O(n log² n) is fine up to n ≈ 10⁶, then you need SA-IS (scale trap).** At n = 10⁷ (10 MB text, e.g. a gene sequence fragment), prefix-doubling does O(n log² n) ≈ 10⁷ × 23 × 23 ≈ 5 × 10⁹ character comparisons — several minutes in Python, multiple seconds in C++. SA-IS is O(n) with a small constant and handles this comfortably. For contest constraints n ≤ 10⁵ prefix-doubling is fine; for genomics or large corpus work, reach for SA-IS.

**5. LCP ≠ suffix array length.** The LCP value at position `i` is not the length of `SA[i]`'s suffix — it's the overlap with the previous suffix. Indexing `lcp[sa[i]]` vs `lcp[rank[i]]` is a common confusion in implementations that blend the two arrays.

## What the interviewer probes for

**"You said O(m log n) for pattern search — can you get it to O(m + log n)?"**

The LCP array + RMQ (range-minimum query with a sparse table) cuts the per-query character comparisons from O(m log n) to O(m + log n): build a sparse table on the LCP array in O(n log n); during binary search, instead of re-comparing all m characters at each pivot, use `RMQ(lcp, lo, mid)` to determine how many leading characters already match, starting the character comparison where they diverge. Total work per query is O(m) for the initial landing plus O(log n) binary-search steps with O(1) LCP comparisons each.

**"Why is a suffix array faster in practice than a suffix tree even when their query complexities are the same?"**

Cache behavior. A suffix tree is a pointer-linked tree where each node holds 4–8 pointers plus metadata — traversing it during a query pointer-chases unpredictably through memory, blowing L1/L2 cache. A suffix array is a flat `int[]`; binary search accesses it in a predictable halving pattern, and the LCP array lives alongside it in cache. On modern hardware the constant-factor cache advantage of the flat array often exceeds 3–5× over the pointer-threaded suffix tree, which is why bioinformatics tools universally prefer the SA + FM-index over Ukkonen-tree implementations.

## Practice problems

Three problems, each exercising a distinct suffix-array technique.

### 1. Longest repeated substring

**Problem.** Given a string `s` of length up to 10⁵, find the longest substring that appears at least twice. For example, in `"banana"` the answer is `"ana"` (appears at indices 1 and 3). If no character repeats, return `""`.

**Approach.** Build the suffix array `SA` and LCP array. Because `LCP[i]` equals the longest common prefix of the adjacent suffixes `SA[i-1]` and `SA[i]`, the longest repeated substring is exactly the maximum value in `LCP`. Record which SA index achieves that maximum to recover the starting position in `s`.

```python
def longest_repeated_substring(s: str) -> str:
    if not s:
        return ""
    sa  = build_suffix_array(s)
    lcp = build_lcp_array(s + "\x00", sa)
    best_len = max(lcp)
    if best_len == 0:
        return ""
    best_i = lcp.index(best_len)
    return s[sa[best_i]: sa[best_i] + best_len]

print(longest_repeated_substring("banana"))   # "ana"
print(longest_repeated_substring("abcde"))    # ""
```

**Complexity.** O(n log² n) build, O(n) LCP scan → O(n log² n) overall. Space O(n).

**Duplicate problems:** "Longest Duplicate Substring" (LeetCode 1044, though that problem expects a binary-search + hashing or SA approach; the SA approach is cleaner), "Longest Repeated Non-Overlapping Substring" (requires the additional constraint `SA[i] - SA[i-1] ≥ lcp_len`).

### 2. Number of distinct substrings

**Problem.** Given a string `s` of length up to 10⁵, count the number of distinct (non-empty) substrings. For example, `"aab"` has 5 distinct substrings: `"a"`, `"aa"`, `"aab"`, `"ab"`, `"b"`. Strings may contain repeated characters.

**Approach.** The total number of substrings is `n(n+1)/2`. Each pair of adjacent suffixes in sorted SA order shares `LCP[i]` substrings. Subtracting those shared (already counted) prefixes gives the distinct count: `n(n+1)/2 − sum(LCP)`. This works because the suffix array in sorted order introduces exactly `(suffix_length − LCP[i])` new distinct substrings at each step — the non-shared suffixes.

```python
def count_distinct_substrings(s: str) -> int:
    n = len(s)
    sa  = build_suffix_array(s)
    lcp = build_lcp_array(s + "\x00", sa)
    # n suffixes of lengths n, n-1, ..., 1  — but SA includes the sentinel suffix (len 1)
    # Work over original string: suffix lengths are (n - sa[i]) for sa[i] < n
    total = n * (n + 1) // 2
    return total - sum(lcp)

print(count_distinct_substrings("aab"))   # 5
print(count_distinct_substrings("abc"))   # 6
```

**Complexity.** O(n log² n) build + O(n) sum → O(n log² n). Space O(n).

**Duplicate problems:** "Count Different Palindromic Subsequences" is related but distinct (requires different structure); "Distinct Substrings" is the canonical name on SPOJ (DISUBSTR).

### 3. Longest common substring of two strings

**Problem.** Given two strings `s` and `t` (each up to 10⁵ characters), find the longest substring that appears in both. For example, `s = "abcde"`, `t = "bcdf"` → `"bcd"` (length 3). Constraints: `1 ≤ |s|, |t| ≤ 10⁵`.

**Approach.** Concatenate `s + "#" + t` where `#` is a separator smaller than any alphabet character but larger than the sentinel. Build the SA and LCP array on the combined string. Scan adjacent SA entries: whenever one suffix comes from `s` (start < `|s|`) and the other from `t` (start > `|s|`), the `LCP[i]` value is a common substring length. Track the maximum such value. The separator `#` ensures no match spans the boundary.

```python
def longest_common_substring(s: str, t: str) -> str:
    ns, nt = len(s), len(t)
    combined = s + "#" + t          # "#" = chr(1), below all lowercase
    sa  = build_suffix_array(combined)
    lcp = build_lcp_array(combined + "\x00", sa)

    best_len, best_pos = 0, 0
    for i in range(1, len(sa)):
        a, b = sa[i - 1], sa[i]
        # check one from s, one from t
        from_s_a = a < ns
        from_s_b = b < ns
        if from_s_a != from_s_b:   # different strings
            if lcp[i] > best_len:
                best_len = lcp[i]
                best_pos = a if from_s_a else b
    return combined[best_pos: best_pos + best_len]

print(longest_common_substring("abcde", "bcdf"))   # "bcd"
print(longest_common_substring("abc", "xyz"))       # ""
```

**Complexity.** O((ns+nt) log²(ns+nt)) build + O(ns+nt) scan. Space O(ns+nt).

**Duplicate problems:** "Longest Common Substring" appears as SPOJ LCS, as a sub-problem in many sequence-alignment tasks, and as the baseline for generalized suffix array problems (extend to k strings).
