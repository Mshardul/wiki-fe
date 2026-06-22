# String Matching

## Prerequisites

- [String](../data-structures/string.md) [Must read] - the input is a text and a pattern; you need indexing, slicing, and the prefix/suffix vocabulary the string page establishes.
- [Array](../data-structures/array.md) [Must read] - the failure function is just an integer array indexed by pattern position; the whole algorithm is array bookkeeping over the pattern.
- **Big-O Notation** [Must read] - the entire payoff is replacing the naive O(n·m) scan with O(n + m); the win is meaningless without complexity. <!-- U9: not-yet-written target — wire to `algorithms/big-o-notation.md` once that page exists. -->

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
  - [Implement strStr()](#1-implement-strstr--the-canonical-search)
  - [Repeated Substring Pattern](#2-repeated-substring-pattern--the-failure-functions-period-trick)
  - [Shortest Palindrome](#3-shortest-palindrome--kmp-on-s--reverses)
  - [Longest Happy Prefix](#4-longest-happy-prefix--the-failure-function-itself)

## What it is

**String matching** finds every occurrence of a **pattern** `P` (length `m`) inside a **text** `T` (length `n`). The naive scan tries every start position and re-compares from scratch — O(n·m). **KMP (Knuth–Morris–Pratt)** does it in O(n + m) by **never re-examining a text character**: when a partial match fails, it uses a precomputed table to slide the pattern forward by as much as is provably safe, instead of backing the text pointer up.

Mental model: **you've already read part of the pattern, so you already know about its own internal repetition — don't throw that knowledge away on a mismatch.** If you matched `ABCAB` and then mismatched, the trailing `AB` you just matched is _also_ a prefix of the pattern, so the pattern can be slid to line that `AB` up — no need to recheck those characters. KMP precomputes "on a mismatch at position `j`, where in the pattern do I resume?" once, in the **failure function** (a.k.a. prefix function / LPS array), then sweeps the text once.

> **Takeaway (say this out loud):** "KMP precomputes, for each prefix of the pattern, the longest proper prefix that's also a suffix — so on a mismatch it slides the pattern forward without ever rewinding the text. O(n + m)."

**Complexity:** O(n + m) time — O(m) to build the failure function, O(n) to scan the text. O(m) extra space for the failure array.

## Intuition

Why is the naive scan wasteful? Consider matching `P = "ABABC"` against `T = "ABABABC"`. The naive method matches `ABAB`, mismatches at `T[4]='A'` vs `P[4]='C'`, then **restarts the pattern at `T[1]`** and recompares everything. But we _already know_ `T[0..3] = "ABAB"` — that's not new information. The piece we just matched, `ABAB`, has the property that its suffix `AB` equals its prefix `AB`. So instead of restarting at `T[1]`, we can keep the matched `AB` and resume comparing the pattern from index 2. The text pointer never moves backward.

The failure function captures exactly this. For each position `j` in the pattern, it answers: **"if I've matched `P[0..j-1]` and the next character fails, what's the longest pattern prefix I can keep, because it's also a suffix of what I matched?"** That length is the **longest proper prefix that is also a suffix** (LPS) of `P[0..j-1]`. Knowing it lets the mismatch "fall back" to a shorter already-matched state rather than to zero.

The deeper idea — the senior framing — is that **the failure function is a property of the pattern alone**, independent of the text. It encodes the pattern's self-similarity. That's why the same precomputed table also solves "find the smallest repeating block of a string" and "longest prefix that is also a suffix" — those are questions about a single string's structure, and the failure function _is_ that structure.

## How it works

Two phases. **Phase 1** builds the failure function `lps` for the pattern. **Phase 2** sweeps the text using it.

**Phase 1 — build `lps` for `P = "ABABC"`.** `lps[j]` = length of the longest proper prefix of `P[0..j]` that is also a suffix of it.

```
P:     A   B   A   B   C
idx:   0   1   2   3   4

lps[0] = 0   "A"      — no proper prefix
lps[1] = 0   "AB"     — prefixes {A}, suffixes {B}: no match
lps[2] = 1   "ABA"    — prefix "A" == suffix "A"         → 1
lps[3] = 2   "ABAB"   — prefix "AB" == suffix "AB"       → 2
lps[4] = 0   "ABABC"  — nothing matches (ends in C)      → 0

lps = [0, 0, 1, 2, 0]
```

**Phase 2 — scan `T = "ABABABC"` with `P` and `lps`.** Pointer `i` walks the text (never rewinds); pointer `j` walks the pattern (falls back via `lps` on mismatch).

```
T:  A   B   A   B   A   B   C
    0   1   2   3   4   5   6

i=0 j=0  T[0]=A == P[0]=A  → i=1 j=1
i=1 j=1  T[1]=B == P[1]=B  → i=2 j=2
i=2 j=2  T[2]=A == P[2]=A  → i=3 j=3
i=3 j=3  T[3]=B == P[3]=B  → i=4 j=4
i=4 j=4  T[4]=A != P[4]=C  → MISMATCH at j=4
                             fall back: j = lps[j-1] = lps[3] = 2
                             (keep the matched suffix "AB", resume at P[2])
                             ── i stays at 4, no text rewind ──
i=4 j=2  T[4]=A == P[2]=A  → i=5 j=3
i=5 j=3  T[5]=B == P[3]=B  → i=6 j=4
i=6 j=4  T[6]=C == P[4]=C  → i=7 j=5  → j==m → MATCH ending at i=7, start = 7-5 = 2
```

Notice the single fallback step at `i=4`: the naive scan would have reset `j=0` and re-read `T[4]` from a new start. KMP instead jumped `j` to 2 — keeping the `AB` it had already verified — and **`i` never went backward**. That non-rewinding `i` is the whole game (see the invariant).

## Correctness / invariant

KMP rests on two invariants, one per phase.

**Failure-function invariant (Phase 1):** after computing `lps[j]`, `lps[j]` equals the length of the longest proper prefix of `P[0..j]` that is also a suffix. The build maintains a length `len` of the current longest prefix-suffix; on a character match it extends (`len += 1`), and on a mismatch it falls back to `lps[len-1]` — the next-longest prefix-suffix candidate — which is correct precisely because a shorter prefix-suffix of `P[0..j]` must itself be a prefix-suffix of the longer one. This is the same fallback idea applied to the pattern against itself.

**Scan invariant (Phase 2):** whenever the scan is at text index `i` with pattern index `j`, the last `j` characters read — `T[i-j .. i-1]` — exactly equal `P[0 .. j-1]`. So `j` is always "how much of the pattern is currently matched, ending just before `i`."

- **Maintenance on match:** `T[i] == P[j]` extends the matched run by one, so `i += 1, j += 1` preserves the invariant.
- **Maintenance on mismatch:** `T[i] != P[j]` with `j > 0`. The matched suffix `T[i-j..i-1] = P[0..j-1]` has a longest prefix-suffix of length `lps[j-1]`; setting `j = lps[j-1]` re-establishes the invariant with a shorter (still valid) matched run — **without moving `i`**, because those `lps[j-1]` characters are still genuinely matched. If `j == 0`, nothing is matched, so `i += 1`.
- **Termination / completeness:** when `j == m`, the invariant says `T[i-m..i-1] = P[0..m-1]` — a full occurrence ending at `i`. We record it and fall back via `j = lps[m-1]` to keep finding overlapping matches.

The non-rewinding `i` is what guarantees we never miss or double-count an occurrence: every text character is consulted in order, and `j` always reflects exactly the verified overlap.

## Complexity derivation

**Phase 1 (build).** The outer loop runs `m-1` times. The inner `while len > 0` only ever _decreases_ `len`, and `len` increases by at most 1 per outer iteration — so total decreases ≤ total increases ≤ `m`. Build is O(m).

**Phase 2 (scan).** Here `i` advances `n` times and never retreats → at most `n` matches. On each mismatch `j` strictly decreases (`j = lps[j-1] < j`); `j` only increases by 1 per text advance, so across the whole scan the total decrease in `j` is bounded by the total increase, which is ≤ `n`. Hence the fallback work is O(n) amortized, not O(n·m). Scan is O(n).

```
total = O(m)  [build]  +  O(n)  [scan]  =  O(n + m)
```

This **amortized** argument — "the inner loop can't undo more than the outer loop did" — is the senior insight: a careless reading sees a nested `while` and guesses O(n·m), but the potential `j` can never drop below 0, so its total descent is capped by its total ascent. Space is O(m) for the `lps` array (the text is read in place, O(1) beyond it).

## Constraints & approach

The constraints tell you whether the naive O(n·m) scan survives or you must reach for a linear algorithm.

| Input size                     | Expected complexity | What it tells you                                                                                              |
| ------------------------------ | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `n, m ≤ 10³`                   | O(n·m) is fine      | The naive scan (`text.find` / nested loop) passes — the constraint _rules out_ needing KMP; reach for it only for clarity. |
| `n ≤ 10⁶`, single pattern      | O(n + m)            | A quadratic scan TLEs on an adversarial input (`"aa…a"` text, `"aa…ab"` pattern) → KMP, or the language's built-in `find`. |
| `n ≤ 10⁶`, **many** patterns   | O(n + Σm)           | Repeated KMP per pattern is O(n·k); switch to **Aho–Corasick** (KMP generalized to a trie) for k patterns at once.          |
| Substring **count** / hashing  | O(n + m) expected   | "Count occurrences", "compare many substrings" → **Rabin–Karp** rolling hash, O(1) per window after O(n) preprocessing.     |
| Pattern self-structure query   | O(m)                | "Smallest period", "longest prefix = suffix", "is it a rotation/repetition" → build the failure function and read it off.   |

The senior reading: the worst case that separates KMP from naive is the **highly self-similar input** (`"aaaaab"` against `"aaaa…a"`). On random text the naive scan is already near-linear, so KMP's win shows up specifically when the pattern almost-matches repeatedly — exactly the adversarial case a contest setter plants.

## When to use / when not

Reach for KMP when you need **single-pattern** substring search with a **worst-case linear** guarantee — you can't tolerate the O(n·m) blow-up on a self-similar input, and you need the matching done by hand (no library `find`, or you need the match positions _and_ the failure-function byproduct). Its real superpower in interviews and contests is the **failure function as a standalone tool**: smallest repeating period, longest prefix-that-is-also-suffix, string-rotation checks all fall out of `lps` for free.

Don't hand-roll KMP when a **library substring search** suffices — Python's `str.find` / `in`, C++ `std::string::find`, Java `indexOf` are well-optimized (often Boyer–Moore-flavored) and faster to type under interview pressure; use KMP only when asked to implement it or when you need its byproducts. For **multiple patterns** searched against one text, KMP per pattern is wasteful — reach for **Aho–Corasick** (a trie with KMP-style failure links). For **fast probabilistic** matching, equality of many substrings, or 2-D pattern search, prefer **Rabin–Karp** rolling hashes. And for typical English text where the pattern rarely self-overlaps, **Boyer–Moore** can beat KMP in practice by skipping ahead via the bad-character rule (sublinear on average), though its worst case isn't better.

KMP is the textbook engine behind `grep`-style search and the conceptual basis of Aho–Corasick, which powers multi-keyword scanners like intrusion-detection signature matching and spam filters.

## Comparison

| Algorithm        | Preprocess | Search           | Space    | Worst case        | Assumes / best for                                         | When the worst case bites                                  |
| ---------------- | ---------- | ---------------- | -------- | ----------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| **KMP**          | O(m)       | O(n)             | O(m)     | O(n + m)          | single pattern, guaranteed-linear, want the failure func   | **never** — the linear bound is unconditional; that guarantee is the whole reason to pick it |
| Naive scan       | —          | O(n·m)           | O(1)     | O(n·m)            | tiny inputs, random text, one-off                          | self-similar input (`"aa…ab"` vs `"aa…a"`) → quadratic and TLE; fine only because random text rarely hits it |
| Rabin–Karp       | O(m)       | O(n) avg / O(nm) worst | O(1)     | O(n·m) (hash collisions) | counting, multi-substring equality, 2-D search | a setter picks a hash-colliding text → every window re-verifies char-by-char, degrading to O(n·m); mitigate with double hashing |
| Boyer–Moore      | O(m + σ)   | O(n/m) best, O(n) avg | O(m + σ) | O(n·m) (basic)    | long patterns, large alphabet, natural-language text       | small alphabet / periodic pattern kills the skip → near-linear, no better than KMP; basic (bad-char-only) version is O(n·m) worst |
| Z-algorithm      | —          | O(n + m)         | O(n + m) | O(n + m)          | same power as KMP, often simpler to derive (Z over `P$T`)  | needs O(n + m) extra space for the Z-array over the concatenation — KMP's O(m) is leaner when the text is huge |
| Aho–Corasick     | O(Σm + σ)  | O(n + matches)   | O(Σm·σ)  | O(n + Σm + occ)   | **many** patterns at once (KMP generalized to a trie)      | overkill for one pattern — the trie + failure links cost O(Σm·σ) space; a single KMP is far cheaper |

The "when it bites" column is the senior read: every rival's headline complexity hides a worst case, and the input that triggers it is exactly what a contest setter plants. KMP's row is the outlier — its O(n + m) is **unconditional**, which is precisely why you reach for it when you can't reason about the input distribution. Rabin–Karp and basic Boyer–Moore _look_ fast but share the naive scan's O(n·m) worst case under adversarial input; Z-algorithm matches KMP's time but pays O(n + m) space (it's KMP's twin — it computes, for each position, the longest substring starting there that matches a prefix of `P$T`, finding all matches in O(n + m) too); and Aho–Corasick only earns its space once you have _many_ patterns. Under interview pressure, pick whichever of KMP/Z you remember — but KMP's failure function is the more reusable byproduct (`σ` = alphabet size).

## Loop/recurrence invariant

> **Family note.** String matching doesn't sit cleanly in any DSA family block (it's neither divide-and-conquer, graph traversal, recursive-build, nor greedy/bit). The nearest fit is **Search/divide** — KMP _searches_ a text — so this block is repurposed from "recurrence → Master theorem" to the **two loop invariants** that carry KMP's correctness and its amortized cost. The depth lives in the invariants and the amortized count, not in a recurrence.

The signature of KMP is a **monotone, never-rewinding scan pointer** paired with a **fallback pointer bounded by an amortization argument**:

- **Build invariant:** after step `j`, `lps[j]` = length of the longest proper prefix of `P[0..j]` that is also a suffix. The fallback `len ← lps[len-1]` walks the chain of nested prefix-suffixes, which is correct because any prefix-suffix of `P[0..j]` shorter than the maximal one is itself a prefix-suffix of that maximal one.
- **Scan invariant:** at `(i, j)`, `T[i-j..i-1] == P[0..j-1]`. The text index `i` is **monotone non-decreasing** and the pattern index `j` falls back only via `lps`.
- **The amortized cost (the crux):** the inner fallback `while` looks nested but isn't quadratic. Define the potential `Φ = j`. Each match raises `Φ` by 1 (`n` times total, so total rise ≤ `n`); each fallback strictly lowers `Φ` and `Φ ≥ 0`, so total fall ≤ total rise ≤ `n`. The fallback loop therefore does O(n) work _across the entire scan_, giving O(n + m). This "the descent can't exceed the ascent" potential argument is the same shape that proves the [dynamic array](../data-structures/dynamic-array.md) doubling is amortized O(1) and the [monotonic stack](../patterns/monotonic-stack.md) is amortized O(n).

## Edge cases

- **Empty pattern (`m = 0`)** — by convention matches at index 0 (and arguably at every position). Decide the contract explicitly; Python's `"abc".find("") == 0`. Guard with `if not pattern: return 0`.
- **Empty text (`n = 0`)** with non-empty pattern — no match, return -1. The scan loop never runs.
- **Pattern longer than text (`m > n`)** — no match possible; the scan simply never reaches `j == m`. No special-casing needed, but worth stating.
- **All-same / highly periodic input (CP-flavored trap)** — `T = "aaaa…a"`, `P = "aaa…ab"` is the adversarial case that makes the _naive_ scan O(n·m) and TLE. KMP stays O(n + m) here; this is precisely the input a contest plants to punish the naive solution, and the reason to reach for KMP at all.
- **Overlapping matches** — searching `"aa"` in `"aaaa"` has occurrences at indices 0, 1, 2 (overlapping). On a full match, fall back via `j = lps[m-1]` (not `j = 0`) to catch them; resetting to 0 would miss the overlaps — a common implementation bug.
- **Off-by-one in `lps` indexing** — the fallback on mismatch is `j = lps[j-1]`, **not** `lps[j]`. Using `lps[j]` re-reads the failed position's own table entry and loops or skips. The senior trap: `lps[j-1]` answers "given `P[0..j-1]` matched, where do I resume?", which is the state _before_ the mismatched `P[j]`.

## Implementation

**Pseudocode** (CLRS style — 1-indexed pattern, `π` is the failure/prefix function):

```
COMPUTE-PREFIX-FUNCTION(P)
m ← P.length
let π[1..m] be a new array
π[1] ← 0
len ← 0                              ▷ length of current longest prefix-suffix
for j = 2 to m
    while len > 0 and P[len + 1] ≠ P[j]
        len ← π[len]                 ▷ fall back to next-longest prefix-suffix
    if P[len + 1] = P[j]
        len ← len + 1
    π[j] ← len
return π

KMP-MATCH(T, P)
n ← T.length;  m ← P.length
π ← COMPUTE-PREFIX-FUNCTION(P)
q ← 0                                ▷ number of pattern chars matched
for i = 1 to n
    while q > 0 and P[q + 1] ≠ T[i]
        q ← π[q]                     ▷ mismatch: slide pattern, DON'T move i
    if P[q + 1] = T[i]
        q ← q + 1
    if q = m
        report match ending at i     ▷ start = i − m + 1
        q ← π[q]                     ▷ keep finding overlapping matches
```

**Python** — idiomatic, 0-indexed, returning all match start indices, plus the contest-velocity built-in for when you _don't_ need to hand-roll:

```python
def build_lps(pattern: str) -> list[int]:
    """lps[j] = length of the longest proper prefix of pattern[:j+1]
    that is also a suffix. O(m) time, O(m) space."""
    m = len(pattern)
    lps = [0] * m
    length = 0                          # current longest prefix-suffix length
    for j in range(1, m):
        while length > 0 and pattern[j] != pattern[length]:
            length = lps[length - 1]    # fall back, not to 0
        if pattern[j] == pattern[length]:
            length += 1
        lps[j] = length
    return lps


def kmp_search(text: str, pattern: str) -> list[int]:
    """All start indices where pattern occurs in text. O(n + m)."""
    if not pattern:                     # contract: empty pattern matches at 0
        return [0]
    lps = build_lps(pattern)
    n, m = len(text), len(pattern)
    matches: list[int] = []
    j = 0                               # chars of pattern matched so far
    for i in range(n):                  # i never rewinds
        while j > 0 and text[i] != pattern[j]:
            j = lps[j - 1]              # slide pattern forward
        if text[i] == pattern[j]:
            j += 1
        if j == m:                      # full match ending at i
            matches.append(i - m + 1)
            j = lps[j - 1]              # allow overlapping matches
    return matches


# Contest velocity: if you only need ONE occurrence (or a yes/no), don't
# hand-roll KMP — the built-in is C-optimized and worst-case fine in practice:
#   text.find(pattern)        # first index, or -1
#   pattern in text           # membership
# Reach for kmp_search when you need ALL (possibly overlapping) positions,
# a guaranteed-linear worst case, or the lps array itself as a byproduct.
```

## What the interviewer probes for

- **"Why is it O(n + m) and not O(n·m) — there's a nested `while`?"** — Amortization. The text pointer `i` never moves backward, and the pattern pointer `j` can only fall back via `lps` as many times as it was incremented, which is ≤ n across the whole scan. The inner loop's total work is bounded by the outer loop's, not multiplied by it.
- **"What exactly does `lps[j]` mean?"** — The length of the longest _proper_ prefix of `pattern[:j+1]` that is also a suffix of it. "Proper" excludes the whole string. It tells you, on a mismatch, how much already-matched overlap you can keep instead of restarting at 0.
- **"How do you find overlapping matches?"** — On a full match, fall back via `j = lps[m-1]` rather than resetting `j = 0`. That preserves the longest already-matched suffix so an immediately-following overlapping occurrence isn't missed.
- **"Could you use this to find the smallest repeating block of a string?"** — Yes. For a string of length `m`, `k = m - lps[m-1]` is the candidate period; if `m % k == 0`, the string is `m/k` repetitions of its first `k` characters. That's the failure function used as a pure structural tool, no text involved.
- **"KMP vs Rabin–Karp vs Boyer–Moore?"** — KMP: guaranteed O(n + m), single pattern, reusable failure function. Rabin–Karp: rolling hash, great for counting / many-substring equality / 2-D, but worst-case O(n·m) on hash collisions. Boyer–Moore: sublinear average on natural text by skipping via the bad-character rule, but no better worst case. For _many_ patterns, generalize KMP to Aho–Corasick.

## Practice problems

### 1. Implement strStr() — the canonical search

Given `haystack` and `needle`, return the index of the first occurrence of `needle` in `haystack`, or -1 if absent. Constraints: lengths up to `5·10⁴`, so an adversarial self-similar input can push a naive nested loop toward O(n·m).

**Approach:** Build the `lps` for `needle`, then scan `haystack` once with the KMP loop and return the first `i - m + 1` when `j` reaches `m`. The non-rewinding scan guarantees linear time even on `"aaaa…"` haystacks. This is the textbook KMP application — first match only, so return immediately.

```python
def str_str(haystack: str, needle: str) -> int:
    if not needle:
        return 0
    lps = build_lps(needle)
    j = 0
    for i, ch in enumerate(haystack):
        while j > 0 and ch != needle[j]:
            j = lps[j - 1]
        if ch == needle[j]:
            j += 1
        if j == len(needle):
            return i - j + 1            # first occurrence
    return -1
```

Time O(n + m), space O(m). Pattern: KMP single-occurrence search.

### 2. Repeated Substring Pattern — the failure function's period trick

Given a string `s`, return whether it can be built by taking a substring of it and concatenating it ≥ 2 times (`"abab"` → true, `"aba"` → false). Constraints: `|s| ≤ 10⁴`. The elegant solution is pure `lps`, no text scan.

**Approach:** Build `lps` for `s`. The smallest period is `k = m - lps[m-1]` (the part not covered by the longest prefix-suffix overlap). `s` is a repetition iff `lps[m-1] > 0` **and** `m % k == 0` — i.e. the period divides the length evenly. This is the failure function used as a self-structure query, distinct from problem 1's text search.

```python
def repeated_substring_pattern(s: str) -> bool:
    m = len(s)
    lps = build_lps(s)
    k = m - lps[-1]                     # smallest period candidate
    return lps[-1] > 0 and m % k == 0
```

Time O(m), space O(m). Pattern: failure-function period analysis.

### 3. Shortest Palindrome — KMP on `s + # + reverse(s)`

Given `s`, prepend the fewest characters to make it a palindrome; return the result. Constraints: `|s| ≤ 5·10⁴`, ruling out the O(n²) "try every prefix" check for the longest leading palindromic prefix.

**Approach:** The answer is `reverse(tail) + s`, where the longest **palindromic prefix** of `s` stays put. Find that prefix's length by running the failure function over the combined string `s + "#" + reverse(s)`: `lps[-1]` is exactly the longest prefix of `s` that equals a suffix of `reverse(s)` — i.e. the longest palindromic prefix of `s`. The separator `#` prevents overlap from crossing the boundary. This reuses KMP's machinery on a _constructed_ string, a distinct technique from problems 1 and 2.

```python
def shortest_palindrome(s: str) -> str:
    if not s:
        return s
    combined = s + "#" + s[::-1]
    lps = build_lps(combined)
    pal_len = lps[-1]                   # longest palindromic prefix of s
    return s[pal_len:][::-1] + s
```

Time O(n), space O(n). Pattern: KMP failure function over a constructed string.

### 4. Longest Happy Prefix — the failure function itself

Given a string `s`, return the longest **happy prefix**: the longest proper prefix that is also a suffix (the empty string if none). Constraints: `|s| ≤ 10⁵`, so an O(n²) compare-all-prefixes approach is too slow.

**Approach:** This _is_ the definition of `lps[m-1]` — the last entry of the failure function. Build the array and slice. The problem exists to confirm you recognize that the failure function's final value answers the prefix-equals-suffix question directly, with no search at all. Distinct from the others: no text, no construction, just reading the table.

```python
def longest_prefix(s: str) -> str:
    lps = build_lps(s)
    return s[:lps[-1]]                  # longest proper prefix that is also a suffix
```

Time O(m), space O(m). Pattern: direct failure-function readout.
