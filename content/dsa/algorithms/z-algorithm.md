# Z-Algorithm

## Prerequisites

- [String](../data-structures/string.md) [Must read] - the algorithm computes a per-position array over a string; you need indexing, slicing, and the prefix/suffix vocabulary.
- [String Matching](./string-matching.md) [Must read] - the Z-algorithm is KMP's twin and solves the same pattern-search problem; reading KMP first frames what the Z-array buys you and when to prefer each.
- [Array](../data-structures/array.md) [Must read] - the Z-array is an integer array indexed by string position; the whole algorithm is array bookkeeping with a sliding `[l, r]` window.
- **Big-O Notation** [Must read] - the payoff is computing all Z-values in O(n) instead of the naive O(n²); the win is meaningless without complexity. <!-- U9: not-yet-written target - wire to `algorithms/big-o-notation.md` once that page exists. -->

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
- [Loop/recurrence invariant](#looprecurrence-invariant)
- [Edge cases](#edge-cases)
- [Implementation](#implementation)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)
  - [Implement strStr()](#1-implement-strstr--pattern-search-via-the-z-array)
  - [Longest Happy Prefix](#2-longest-happy-prefix--z-array-self-match)
  - [Count Distinct Substrings / String Periodicity](#3-shortest-period--z-box-covers-the-string)
  - [Pattern Matching with a Wildcard Split](#4-concatenation-search--separator-guards-the-boundary)

## What it is

The **Z-algorithm** computes, for a string `S` of length `n`, the **Z-array**: `Z[i]` is the length of the longest substring starting at position `i` that is also a **prefix** of `S`. It does this in **O(n)** by maintaining a window `[l, r]` - the rightmost prefix-match seen so far (the "Z-box") - and reusing its contents instead of re-comparing characters.

Mental model: **at every position, ask "how much of the string's own beginning do I see starting here?"** `Z[i]` answers that. To find a pattern `P` in a text `T`, run the Z-algorithm on `P + separator + T`: wherever `Z[i] == |P|`, the pattern occurs - because that position matches `|P|` characters of the prefix, which _is_ `P`.

> **Takeaway (say this out loud):** "The Z-array gives, for each position, how long a prefix of the string starts there - computed in O(n) by reusing a sliding match window. Run it on `P$T` and every `Z[i] == |P|` is a match."

**Complexity:** O(n) time to build the Z-array, O(n) extra space. Pattern search on `P + sep + T` is O(n + m).

## Intuition

Why is this O(n) and not O(n²)? The naive method computes each `Z[i]` by comparing `S[i..]` against `S[0..]` character by character - O(n) per position, O(n²) total. The Z-algorithm's insight is that **a match you already found tells you about positions inside it for free.**

Suppose you've matched a prefix starting at some earlier position `l` that extends to `r` - call `[l, r]` the **Z-box**. Everything inside it, `S[l..r]`, equals a prefix `S[0..r-l]`. Now for a new position `i` inside the box, the character `S[i]` mirrors the character `S[i-l]` near the front of the string - and you _already computed_ `Z[i-l]`. So you can **copy** that value as a starting estimate for `Z[i]` instead of re-comparing from scratch. Only when the copied value would run past `r` (the edge of what you've verified) do you fall back to explicit character comparison - and every such comparison pushes `r` forward, which can only happen `n` times total.

The senior framing: the Z-box is a **verified mirror of the prefix**. The algorithm is "reuse the mirror when `i` is inside it; extend the mirror by brute force only when you must." That reuse is what collapses O(n²) to O(n), and it's the same amortized "the work to extend `r` is bounded by `n`" argument that makes [KMP](./string-matching.md) linear.

The one subtlety a junior conflates: inside the box there are **two** mirror outcomes, and only one is free. If the mirrored value `Z[i-l]` ends _strictly before_ the box edge `r`, it is exact - `Z[i] = Z[i-l]`, no comparison, because the mismatch that bounded `Z[i-l]` is itself inside the verified region and so applies identically at `i`. But if `Z[i-l]` reaches _to or past_ `r`, the mirror only proves the match up to `r`; the character at `r+1` was never verified against the prefix, so you **must** resume explicit comparison from there. Treating both cases as a free copy is the canonical Z-algorithm bug - it over-reports `Z[i]` by trusting unverified characters. That edge distinction is exactly the `min(r - i, z[i - l])` clamp in the code.

## How it works

Compute the Z-array of `S = "aabxaabxcaabxaab"` (`n = 16`). `Z[0]` is conventionally undefined (or set to `n`); start at `i = 1`. Maintain the Z-box `[l, r]`, initially `[0, 0]`.

```
S:   a  a  b  x  a  a  b  x  c  a  a  b  x  a  a  b
i:   0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15

i=1: outside box (1 > r=0). Compare from scratch:
     S[1]=a == S[0]=a ✓, S[2]=b != S[1]=a ✗ → Z[1]=1, box=[1,1]
i=2: S[2]=b != S[0]=a → Z[2]=0
i=3: S[3]=x != S[0]=a → Z[3]=0
i=4: S[4]=a == S[0], extend: "aabx" matches prefix "aabx", S[8]=c != S[4]=a
     → Z[4]=4, box=[4,7]
i=5: inside box [4,7]. mirror = i-l = 1, Z[1]=1, and 5+1=6 ≤ r=7
     → copy: Z[5]=1   (no character comparison needed)
i=6: inside box. mirror=2, Z[2]=0 → Z[6]=0  (copied, free)
i=7: inside box. mirror=3, Z[3]=0 → Z[7]=0  (copied, free)
...
i=9: S[9]=a starts another prefix "aabxaab" (length 7), extend by compare
     → Z[9]=7, box=[9,15]
i=13: inside box [9,15]. mirror=4, Z[4]=4, but 13+4=17 > r=15
      → copied value would overshoot the verified edge: clamp to r,
        then extend by explicit compare past r → Z[13]=3, box=[13,15]
```

Two regimes drive every step: **`i > r`** (outside the box → compare from scratch, then open a new box) and **`i ≤ r`** (inside → copy `Z[i-l]`, but if it would reach past `r`, clamp and extend by comparison). Only the "extend by comparison" path moves `r`, and `r` only ever increases - that's the invariant doing the work.

## Correctness / invariant

The loop maintains one **invariant:** `[l, r]` is the prefix-match with the **largest `r`** discovered so far - i.e. `S[l..r] == S[0..r-l]`, and no earlier-started prefix-match extends further right.

- **Initialization:** `l = r = 0`, the box is empty; the invariant holds vacuously.
- **Maintenance, case `i > r`:** position `i` is beyond any verified prefix-match. Compare `S[i..]` to `S[0..]` directly until mismatch; this sets `Z[i]` correctly by definition and, if `Z[i] > 0`, opens a new box `[i, i + Z[i] - 1]` whose `r` is at least the old `r` (since `i > r`). Invariant preserved.
- **Maintenance, case `i ≤ r`:** `i` lies inside `S[l..r]`, which mirrors the prefix, so `S[i]` corresponds to `S[i - l]`. Let `k = i - l`.
  - If `Z[k] < r - i + 1`, the mirrored match fits entirely inside the box, so `Z[i] = Z[k]` exactly - the box already proves it, no comparison needed.
  - If `Z[k] ≥ r - i + 1`, the mirror reaches the box edge; everything up to `r` is verified, but beyond `r` is unknown. Set `Z[i]` to `r - i + 1` and **extend by explicit comparison past `r`**, updating `[l, r] = [i, new r]`. The new `r` strictly exceeds the old, preserving "largest `r`."
- **Termination:** `i` runs `1..n-1`; each `Z[i]` is set exactly once and correctly by the case it falls into.

The crux is the `≤` vs `<` boundary in `Z[k] < r - i + 1`: misjudging whether the mirrored match _fits_ versus _touches the edge_ is the single bug that breaks the algorithm (see [Edge cases](#edge-cases)).

## Complexity derivation

Split the work into the two cases.

- **Copy case (`i ≤ r`, mirror fits):** O(1) per position - a single array read, no character comparison. Across all `i`, that's O(n).
- **Comparison case (`i > r`, or mirror reaches the edge and extends):** each successful character comparison **advances `r` by one**, and `r` only ever increases, from 0 to at most `n - 1`. So the total number of successful comparisons across the entire run is ≤ n. Each position also does at most one _failing_ comparison (the mismatch that stops extension). Total comparisons ≤ 2n.

```
total = O(n)  [O(1) copies]  +  O(n)  [comparisons, bounded by r's monotone rise]  =  O(n)
```

This is the same **amortized / potential** argument as KMP: define the potential `Φ = r`. Comparisons that succeed raise `Φ` (total rise ≤ n); nothing lowers it below 0. So the comparison work is bounded by `n`, not multiplied by it - the nested-looking extension is linear, not quadratic.

Making the constant precise: each character comparison is one of two kinds. A **successful** comparison increments both `Z[i]` and (when it pushes past the old edge) `r` - and since `r` is monotone non-decreasing with ceiling `n - 1`, there are at most `n` of these across the _entire_ run, not per position. A **failing** comparison is the single mismatch that terminates one position's extension loop - at most one per `i`, so ≤ n total. Hence ≤ 2n comparisons exactly, and the bound is tight (the all-distinct string `"abc…"` does ≈ n failing comparisons; `"aaaa…"` does ≈ n successful ones). The senior point versus KMP: identical O(n) and the _same_ ≤ 2n comparison count, so the choice between them is constant-factor-neutral - it's about which invariant you can write bug-free, not speed. Space is O(n) for the Z-array; for pattern search add the O(n + m) concatenation `P + sep + T`.

## Constraints & approach

The constraints decide whether the naive O(n·m) / O(n²) scan survives or you need the linear Z build.

| Input size                     | Expected complexity | What it tells you                                                                                                  |
| ------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `n, m ≤ 10³`                   | O(n·m) is fine      | Naive substring scan / pairwise prefix compare passes - the constraint _rules out_ needing the Z-array; use `find`. |
| `n ≤ 10⁶`, single pattern      | O(n + m)            | A quadratic scan TLEs on a self-similar input → Z-algorithm on `P$T` (or [KMP](./string-matching.md)).             |
| String self-structure query    | O(n)                | "Longest prefix that recurs", "shortest period", "is it a rotation/repetition" → build the Z-array and read it.    |
| Many prefix-match queries       | O(n) build, O(1) each | Precompute the Z-array once; each "does the prefix start at `i`, how far?" is then an O(1) lookup.                  |
| Counting / probabilistic match | O(n + m) expected   | "Count occurrences", multi-substring equality → [Rabin–Karp](./string-matching.md) rolling hash may be simpler.    |
| `n` near a memory limit, search | O(n + m) time, O(n) space | Z needs the full `P + sep + T` concatenation in memory; if `n` is at the RAM ceiling this pushes you _off_ Z → **KMP**, which keeps only the O(m) failure array and streams the text. |
| Many patterns vs one text       | O(Σm) preprocess    | Z per pattern is O(k·n); the constraint _rules it out_ → **Aho–Corasick** (a trie + failure links), which Z does not generalize to. |

The senior reading: the Z-array shines specifically when the question is **about the string's relationship to its own prefix** (periodicity, borders, prefix recurrence). For raw single-pattern search, Z and KMP are interchangeable in cost - pick the one you can derive correctly under pressure; Z is often easier to reason about because there's no separate failure-function recurrence to recall. The two off-ramps above are where the constraint stops being neutral and actively picks against Z: a memory ceiling favors KMP's O(m) footprint, and multiple patterns force Aho–Corasick because the failure function generalizes and the Z-array doesn't.

## When to use / when not

Reach for the Z-algorithm when you need **linear-time pattern search** or a **prefix-structure query** and you find the Z-array easier to derive than KMP's failure function - many people do, because the Z-box reuse is a single visual idea (a sliding verified window) with no second recurrence to memorize. It's the natural tool for "where does a prefix of `S` recur?", shortest-period detection, and string-rotation checks.

Don't hand-roll it when a **library substring search** (`str.find`, `in`, C++ `std::string::find`) suffices - those are faster to type and well-optimized; use Z only when asked to implement it or when you need the Z-array itself. Prefer **[KMP](./string-matching.md)** when you specifically want the **failure function** as a reusable byproduct (it generalizes to Aho–Corasick for multi-pattern search; the Z-array does not as directly). For **many patterns at once** use Aho–Corasick; for **probabilistic / counting / 2-D** matching use [Rabin–Karp](./string-matching.md) rolling hashes; for natural-language text where the pattern rarely self-overlaps, Boyer–Moore can be faster in practice.

Real-world: the Z-array's period/border computation is the workhorse behind **tandem-repeat detection in genomics** - tools like Tandem Repeats Finder locate repeated DNA motifs by finding the shortest period of a window, exactly the `Z[p] == n - p` test below - and it backs the linear string primitives in competitive-programming libraries and `grep`-style engines.

## Comparison

| Algorithm        | Preprocess | Search           | Space    | Worst case        | Assumes / best for                                         | Reusable byproduct                          |
| ---------------- | ---------- | ---------------- | -------- | ----------------- | ---------------------------------------------------------- | ------------------------------------------- |
| **Z-algorithm**  | -          | O(n + m)         | O(n + m) | O(n + m)          | single pattern, prefix-structure queries, easy to derive   | Z-array (prefix-recurrence at every index)  |
| KMP              | O(m)       | O(n)             | O(m)     | O(n + m)          | single pattern, want the failure function                  | failure/prefix function → Aho–Corasick      |
| Naive scan       | -          | O(n·m)           | O(1)     | O(n·m)            | tiny inputs, random text, one-off                          | none                                        |
| Rabin–Karp       | O(m)       | O(n) avg         | O(1)     | O(n·m) collisions | counting, multi-substring equality, 2-D                    | rolling hash (reusable across substrings)   |
| Boyer–Moore      | O(m + σ)   | O(n/m) best      | O(m + σ) | O(n·m) basic      | long patterns, large alphabet, natural text                | bad-char / good-suffix skip tables          |
| Suffix automaton | O(n)       | O(m)             | O(n·σ)   | O(n·σ)            | many queries on one fixed text                             | full substring index of the text           |

Z vs KMP is the decision that matters most here: **identical asymptotics** (both O(n + m), linear preprocessing), so pick on byproduct and recall. KMP's failure function generalizes to multi-pattern (Aho–Corasick) and answers "longest border of every prefix"; the Z-array answers "longest prefix-match starting at every position" and is leaner to derive. Z pays O(n + m) space for the concatenation, where KMP keeps O(m); on a huge text that tips toward KMP (`σ` = alphabet size).

## Loop/recurrence invariant

> **Family note.** Like [string matching / KMP](./string-matching.md), the Z-algorithm doesn't sit cleanly in any DSA family block (not divide-and-conquer, graph traversal, recursive-build, or greedy/bit). The nearest fit is **Search/divide** - it _searches_ a string - so this block is repurposed from "recurrence → Master theorem" to the **loop invariant** that carries correctness and the **amortized count** that gives O(n). The depth lives there, not in a recurrence.

The signature is a **monotone right-edge `r`** paired with **copy-or-extend reuse** of an already-verified window:

- **Invariant:** `[l, r]` is the prefix-match with the largest `r` seen so far - `S[l..r] == S[0..r-l]`. Proven above by cases.
- **The amortized cost (the crux):** define the potential `Φ = r`. The only character comparisons that do real work are the ones that **extend `r`**, and `r` rises monotonically from 0 to ≤ n − 1, so total extending comparisons ≤ n. Inside-the-box positions cost O(1) via a single Z-array copy. The inner extension loop therefore does O(n) work _across the whole run_ - not O(n) per position. This is the identical "descent/ascent can't exceed `n`" potential argument that bounds [KMP](./string-matching.md), the [dynamic array](../data-structures/dynamic-array.md) doubling, and the [monotonic stack](../patterns/monotonic-stack.md).
- **Z ↔ failure-function duality (the unifying theory):** the Z-array and KMP's prefix function `π` are not merely "both linear" - they are **two encodings of one object**, a string's self-similarity, and are interconvertible in O(n) _without re-scanning the string_. From the Z-array, every match `Z[i] = ℓ` says positions `i..i+ℓ-1` copy the prefix, so it implies a border of length `ℓ` ending at `i+ℓ-1`; sweeping `i` and writing `π[i+Z[i]-1] = max(π[...], Z[i])` reconstructs the prefix function. The reverse direction unrolls `π`'s border chain into prefix-start lengths. The difference is purely **viewpoint**: Z measures the longest prefix _starting_ at each index (forward), `π` the longest border _ending_ at each index (backward). This is the genuine family-level insight a "Search/divide" recurrence couldn't give - the two canonical linear string-matchers are the same self-similarity read in opposite directions, which is _why_ they share the O(n) bound, the ≤ 2n comparison count, and the same amortized potential argument. Pick the direction the problem phrases itself in; convert if you need the other.

## Edge cases

- **`Z[0]` convention** - the whole string is trivially a prefix of itself, so `Z[0]` is either left undefined or set to `n`. Pick one explicitly; an off-by-one here corrupts pattern-search counts. The loop starts at `i = 1`.
- **Empty string / empty pattern** - `n = 0` returns an empty Z-array. For pattern search with empty `P`, decide the contract (matches everywhere, or at index 0) up front, as with KMP.
- **Separator collision (CP-flavored trap)** - for pattern search on `P + sep + T`, the separator must be a character that appears in **neither** `P` nor `T`, otherwise a Z-value can run across the boundary and report a false match spanning `P` and `T`. Using a real alphabet character (e.g. `#` when `#` can occur in input) is the classic bug; pick a sentinel outside the alphabet or compare against `|P|` with an explicit boundary guard.
- **The `≤` vs `<` at the box edge** - the case split `Z[i-l] < r - i + 1` (mirror fits, copy) vs `≥` (mirror touches edge, must extend) is the single most error-prone line. Using `<` where `≤` is meant either skips a needed extension (under-reports `Z[i]`) or compares past unverified data (over-reports). The senior trap mirrors KMP's `lps[j-1]` indexing subtlety.
- **All-same string (`"aaaa…a"`)** - every position matches a long prefix; `Z[i] = n - i`. This maximally stresses the box reuse (the box spans almost the whole string) and is the adversarial input that makes the _naive_ O(n²) version blow up while Z stays O(n).
- **Overflow in derived counts** - when using the Z-array to count occurrences or substrings over a huge string, the running count can exceed 32-bit range; accumulate in 64-bit (`long` / Python int) and reduce mod `10⁹+7` if the problem asks for it.

## Implementation

**Pseudocode** (CLRS style - 1-indexed string `S[1..n]`, Z-box `[l, r]`):

```
Z-ARRAY(S)
n ← S.length
let Z[1..n] be a new array
Z[1] ← n                                ▷ convention: whole string
l ← 0;  r ← 0                            ▷ current Z-box (empty)
for i = 2 to n
    if i ≤ r                             ▷ inside the box: reuse the mirror
        Z[i] ← min(r − i + 1, Z[i − l + 1])
    while i + Z[i] ≤ n and S[Z[i] + 1] = S[i + Z[i]]
        Z[i] ← Z[i] + 1                  ▷ extend by explicit comparison
    if i + Z[i] − 1 > r                  ▷ a farther-right box was found
        l ← i
        r ← i + Z[i] − 1
return Z
```

**Python** - idiomatic, 0-indexed, plus a `pattern_search` built on it and the contest-velocity built-in for when you don't need the array:

```python
def z_array(s: str) -> list[int]:
    """Z[i] = length of the longest substring starting at i that is a
    prefix of s. Z[0] = len(s) by convention. O(n) time, O(n) space."""
    n = len(s)
    z = [0] * n
    z[0] = n
    l = r = 0                                 # current Z-box [l, r]
    for i in range(1, n):
        if i < r:                             # inside the box: copy the mirror,
            z[i] = min(r - i, z[i - l])       # clamped to the verified edge
        while i + z[i] < n and s[z[i]] == s[i + z[i]]:
            z[i] += 1                          # extend by explicit comparison
        if i + z[i] > r:                       # found a farther-right box
            l, r = i, i + z[i]
    return z


def pattern_search(text: str, pattern: str, sep: str = "\x00") -> list[int]:
    """All start indices where pattern occurs in text, via Z on pattern+sep+text.
    sep must not appear in pattern or text. O(n + m)."""
    if not pattern:
        return [0]
    combined = pattern + sep + text
    z = z_array(combined)
    m = len(pattern)
    offset = m + 1                            # where text begins in combined
    return [i - offset for i in range(offset, len(combined)) if z[i] == m]


# Contest velocity: if you only need ONE occurrence (or yes/no), don't build
# the Z-array - the built-in is C-optimized and fine in practice:
#   text.find(pattern)   # first index, or -1
#   pattern in text      # membership
# Reach for z_array when you need ALL positions, a linear worst case, or the
# Z-array itself (periodicity, borders, prefix-recurrence queries).
```

## What the interviewer probes for

- **"What does `Z[i]` actually mean?"** - The length of the longest substring starting at index `i` that equals a _prefix_ of the string. `Z[i] = 3` means `S[i:i+3] == S[0:3]`. It's a per-position measure of "how much of the beginning recurs here."
- **"Why is it O(n) - there's a `while` loop inside the `for`?"** - Amortization. The inner loop only does work when it extends the right edge `r`, and `r` rises monotonically from 0 to ≤ n, so total inner-loop iterations across the whole run are ≤ n. The nested loop is linear, not quadratic.
- **"How do you search for a pattern with it?"** - Concatenate `P + sep + T` with a separator absent from both, compute the Z-array, and report every index `i` (in the text region) where `Z[i] == |P|` - that position matches `|P|` prefix characters, and the prefix is `P`. The separator stops a Z-value from spanning the boundary.
- **"Z-algorithm vs KMP - when each?"** - Same O(n + m) cost. KMP if you want the failure function (generalizes to Aho–Corasick, answers prefix-border queries); Z if you find the box reuse easier to derive or you want the prefix-recurrence array directly. They're interconvertible in O(n).
- **"Can it find the shortest period of a string?"** - Yes. A string `S` of length `n` has period `p` iff `p` divides `n` and `Z[p] == n - p` (the suffix starting at `p` matches the prefix all the way to the end). Scan for the smallest such `p`.

## Practice problems

### 1. Implement strStr() - pattern search via the Z-array

Given `haystack` and `needle`, return the index of the first occurrence of `needle`, or -1. Constraints: lengths up to `5·10⁴`, so a self-similar input can push a naive nested loop toward O(n·m).

**Approach:** Build the Z-array of `needle + sep + haystack` with a separator absent from both. The first text-region index where `Z[i] == len(needle)` is the answer (subtract the offset). The Z-value equals the pattern length exactly when the full pattern (a prefix of the combined string) recurs there. Return on the first hit.

```python
def str_str(haystack: str, needle: str) -> int:
    if not needle:
        return 0
    combined = needle + "\x00" + haystack
    z = z_array(combined)
    m = len(needle)
    for i in range(m + 1, len(combined)):
        if z[i] == m:
            return i - (m + 1)            # first occurrence in haystack
    return -1
```

Time O(n + m), space O(n + m). Pattern: Z-array pattern search.

### 2. Longest Happy Prefix - Z-array self-match

Given a string `s`, return the longest **proper prefix** that is also a suffix (the empty string if none). Constraints: `|s| ≤ 10⁵`, ruling out an O(n²) compare-all-prefixes approach.

**Approach:** A proper prefix that is also a suffix means: there's a position `i` where the substring starting at `i` reaches exactly to the end _and_ matches the prefix - i.e. `i + Z[i] == n`. Among all such `i`, the longest border has length `Z[i] = n - i`, maximized at the smallest qualifying `i`. Scan `i` from 1 and take the first where `i + Z[i] == n`. Distinct from problem 1: no separate text, the query is about `s` against itself.

```python
def longest_prefix(s: str) -> str:
    z = z_array(s)
    n = len(s)
    for i in range(1, n):
        if i + z[i] == n:                 # suffix from i matches prefix to the end
            return s[:z[i]]               # longest such border
    return ""
```

Time O(n), space O(n). Pattern: Z-array border detection.

### 3. Shortest Period - Z-box covers the string

Given a string `s`, find the length of its shortest period: the smallest `p` such that `s` is `s[:p]` repeated `n/p` times (`"abcabcabc"` → 3). If none, the period is `n` itself. Constraints: `|s| ≤ 10⁶`.

**Approach:** `p` is a valid period iff `p` divides `n` **and** the suffix starting at `p` matches the prefix all the way to the end, i.e. `Z[p] == n - p`. Build the Z-array once, then scan `p = 1..n` for the smallest divisor of `n` satisfying `Z[p] == n - p`. This is the failure-function period trick from KMP expressed through the Z-array - a distinct technique from problems 1 and 2 (periodicity, not search or border).

```python
def shortest_period(s: str) -> int:
    n = len(s)
    z = z_array(s)
    for p in range(1, n):
        if n % p == 0 and z[p] == n - p:  # period p tiles the whole string
            return p
    return n                              # no smaller period: s is aperiodic
```

Time O(n), space O(n). Pattern: Z-array periodicity.

### 4. Concatenation Search - separator guards the boundary

Given strings `a` and `b`, find every position where `a` occurs inside `b`, but you must do it by building **one** Z-array over a combined string - exercising the separator-safety rule. Constraints: `|a|, |b| ≤ 10⁵`, adversarial inputs include `a` and `b` sharing characters with any naive separator.

**Approach:** Concatenate `a + sep + b` where `sep` is a sentinel **outside** the alphabet of both `a` and `b` (here `\x00`, assuming printable input). Without a guaranteed-absent separator, a Z-value could extend across the join and report a false match spanning `a` and `b` - the classic CP trap. With the sentinel, every `Z[i] == |a|` in the `b` region is a true occurrence. The distinct lesson: separator choice _is_ the correctness condition, not an afterthought.

```python
def search_all(a: str, b: str) -> list[int]:
    sep = "\x00"                          # MUST be absent from both a and b
    assert sep not in a and sep not in b, "separator collides with input"
    combined = a + sep + b
    z = z_array(combined)
    m = len(a)
    start = m + 1                         # b begins here in combined
    return [i - start for i in range(start, len(combined)) if z[i] == m]
```

Time O(|a| + |b|), space O(|a| + |b|). Pattern: Z-array search with separator-safety.
