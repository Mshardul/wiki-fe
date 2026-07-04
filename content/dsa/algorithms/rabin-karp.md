# Rabin-Karp

## Prerequisites

- [String](../data-structures/string.md) [Must read] - the input is text and pattern; you need slicing, indexing, and the modular arithmetic vocabulary for rolling hashes.
- [Hash Table](../data-structures/hash-table.md) [Must read] - rolling hash is a numeric fingerprint; collision semantics, load and prime selection all come from hashing fundamentals.
- [String Matching](./string-matching.md) [Must read] - KMP is the primary single-pattern alternative; understanding it clarifies exactly when Rabin-Karp is the better choice and when it isn't.

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
  - [Find all anagrams in a string](#1-find-all-anagrams-in-a-string--rolling-hash-over-character-counts)
  - [Repeated DNA sequences](#2-repeated-dna-sequences--multi-pattern-via-hash-set)
  - [Longest duplicate substring](#3-longest-duplicate-substring--binary-search--rolling-hash)

## What it is

**Rabin-Karp** finds every occurrence of a pattern `P` (length `m`) inside a text `T` (length `n`) by maintaining a rolling **numeric fingerprint** (hash) of the current text window as it slides one character at a time. Rather than comparing `m` characters per window position - O(n·m) - it computes one hash value per slide in O(1), and only does a full character-by-character verification when two hashes match. On average this is O(n + m); worst case O(n·m).

Mental model: **slide a fingerprint, not a string**. The hash is a summary of the current window; recomputing it from scratch each step would be O(m), but subtracting the outgoing character's contribution and adding the incoming character's gives the new hash in O(1). You're keeping a "fingerprint" of the window up to date at constant cost per slide.

> **Takeaway (say this out loud):** "Rabin-Karp maintains a rolling hash of the window - slide the fingerprint in O(1), verify with character comparison only on a hash match. Average O(n + m); worst case O(n·m) if collisions are adversarial."

**Complexity:** O(n + m) time on average, O(n·m) worst case. O(1) extra space beyond the hash value (the text and pattern are read in place).

## Intuition

Why does a rolling hash help? The naive scan computes `hash(text[i:i+m])` from scratch at each position - that's O(m) per window and O(n·m) total. The key insight is that sliding one character to the right changes the window in a highly structured way: the leftmost character leaves and a new character enters. If the hash function is **polynomial in the character values**, the old hash contains the new hash almost completely - just subtract the leaving character's contribution and add the entering character's. One arithmetic operation per slide instead of `m` comparisons.

The specific formula - Rabin-Karp most often uses the **polynomial rolling hash** mod a prime `q`:

```
H(s) = (s[0] · base^(m-1) + s[1] · base^(m-2) + … + s[m-1] · base^0) mod q
```

The slide step from window `i` to window `i+1` is:

```
H(i+1) = (H(i) − text[i] · base^(m-1)) · base + text[i+m]    (all mod q)
```

Three parts:
1. `H(i) − text[i] · base^(m-1)` - remove the leaving character's contribution (it was multiplied by `base^(m-1)` because it was the leftmost position).
2. `· base` - shift every remaining character left by one position (equivalent to multiplying all exponents by one more `base`).
3. `+ text[i+m]` - add the new character at the rightmost position (exponent 0, so just the raw value).

The subtraction trick is the key: removing the leftmost character requires knowing `base^(m-1) mod q` (precomputed once before the scan, O(m) or O(log m) with fast exponentiation). After that every slide is a constant number of multiplications, additions, and mod operations - O(1) regardless of `m`.

The hash is only a **filter**: a match in hashes is necessary but not sufficient for a true match. Whenever `H(window) == H(pattern)`, you verify character by character. This is safe because if there's no hash match there's definitely no text match (hash equality is the necessary condition). Spurious hash matches - windows where `H(window) == H(pattern)` but the actual characters differ - are called **spurious hits**. A good choice of `q` (a large prime) keeps them rare.

## How it works

Two phases: **precompute** the pattern hash and the high-power constant, then **slide** the window.

**Setup.** Compute `H(pattern)` and `H(text[0:m])` - both O(m). Also compute `high = base^(m-1) mod q` - used to subtract the leaving character's contribution.

**Slide.** For each window starting at position `i` from `0` to `n−m`:

1. If `window_hash == pattern_hash`, compare characters: if equal, record a match.
2. If `i < n−m`, roll forward: `window_hash = ((window_hash − text[i]·high) · base + text[i+m]) % q`.

**Worked trace.** `T = "abcabc"`, `P = "abc"`, `base = 26`, `q = 101`. Char map: a=0, b=1, c=2.

```
Setup:
  high = 26² mod 101 = 676 mod 101 = 70        ← multiplier for the leaving char
  H("abc") = (0·70 + 1·26 + 2) mod 101 = 28   ← pattern hash (target)
  H(text[0:3]) = same formula                  = 28   ← initial window

Text:  a   b   c   a   b   c
idx:   0   1   2   3   4   5

i=0  window="abc"  H=28  == 28 → verify → MATCH at 0
     slide:  H = ((28 − 0·70) · 26 + 0) % 101
               = (28 · 26) % 101
               = 728 % 101 = 21

i=1  window="bca"  H=21  ≠ 28 → skip
     slide:  H = ((21 − 1·70) · 26 + 1) % 101
               = (−49 · 26 + 1) % 101
               = −1273 % 101 = 40          ← Python % always returns non-negative

i=2  window="cab"  H=40  ≠ 28 → skip
     slide:  H = ((40 − 2·70) · 26 + 2) % 101
               = (−100 · 26 + 2) % 101
               = −2598 % 101 = 28

i=3  window="abc"  H=28  == 28 → verify → MATCH at 3
```

Two matches found at indices 0 and 3. Each comparison costs O(1) in hash work; the O(m) verification only fires on hash matches (twice here, both genuine).

> **Pitfall - negative residues in C++/Java.** Python's `%` always returns a non-negative result (`-1273 % 101 = 40`), so the slide formula works as written. In C++ and Java, `%` can return negative values. Always write the update as:
> ```cpp
> w_hash = ((w_hash - (long long)text[i] * high % q + q) * base + text[i+m]) % q;
> ```
> The `+ q` before the outer `% q` ensures the result stays in `[0, q)`. Forgetting it causes hash drift - the rolling hash diverges from the true window hash after the first subtraction, producing missed matches.

## Correctness / invariant

**Why hash matches need verification.** Two windows with identical hash values may have different characters - a **spurious hit**. Example: if `q = 11` and the window `"bd"` hashes to the same value as `"ac"`, a hash match falsely signals a pattern match. Rabin-Karp is correct because it **always verifies on hash match**: the character comparison is the source of truth. Hashing is only a filter that eliminates mismatches cheaply.

**Rabin-Karp is Las Vegas, not Monte Carlo.** A Las Vegas algorithm is always correct but has a random running time; a Monte Carlo algorithm is always fast but may return wrong answers. Rabin-Karp is Las Vegas: every hash match triggers a character verification, so it never returns a false match or misses a true match. The randomness (from the choice of `q` and `base`) affects only *how many spurious hits occur*, not *whether the output is correct*. If you skip verification on hash match (treating it as sufficient), you'd have a Monte Carlo variant - fast, sometimes wrong.

**The correctness argument precisely:**
- If `text[i:i+m] == pattern`, their hashes are equal (the hash function is deterministic), so the check `window_hash == pattern_hash` passes, verification passes, and we correctly record a match.
- If `text[i:i+m] != pattern` but `window_hash == pattern_hash` (spurious hit), verification fails and we correctly do not record a match.
- If `window_hash != pattern_hash`, we skip - and by the deterministic hash this is correct: unequal windows cannot have equal hashes (the other direction: equal hashes are necessary but not sufficient for equal strings, but *unequal hashes are sufficient for unequal strings*).

So Rabin-Karp is unconditionally correct, with time cost depending on the number of spurious hits.

## Complexity derivation

**Preprocessing: O(m).** Computing the pattern hash and the initial window hash both take O(m) by one linear pass over `m` characters. Computing `high = base^(m-1) mod q` takes O(m) by repeated multiplication (or O(log m) with fast exponentiation, but O(m) suffices).

**Average case: O(n + m).** After preprocessing, the main loop runs `n - m + 1` iterations. Each iteration does O(1) work (one hash update, one comparison) unless `window_hash == pattern_hash`. When hashes match, character verification costs O(m). The key question: **how many spurious hits are expected?**

For a uniformly random prime `q`, the probability that a random window's hash collides with the pattern hash is exactly `1/q` (there are `q` residues, the window's hash is one of them, so the chance it happens to equal the pattern's hash by coincidence is `1/q`). Over `n` windows, the expected number of spurious hits is `n/q`. Each spurious hit costs O(m) in verification, so:

```
Expected total verification cost = (n/q) · O(m) = O(nm/q)
```

For a prime `q ≥ n·m` (e.g., `q = 10^9 + 7` for typical `n, m ≤ 10^5`), this expected cost is O(1). Even for moderate `q` like `10^9 + 7`, with `n = 10^5` and `m = 10^5`:

```
nm/q ≈ 10^10 / 10^9 ≈ 10
```

Expected 10 spurious hits - negligible. Total expected time: O(n + m).

**Worst case: O(n·m).** The worst case occurs when **every window is a spurious hit**: `window_hash == pattern_hash` for all `n - m + 1` windows, triggering O(m) verification every time. This happens with the right adversarial text/pattern pair for any fixed `q`. A classic example: set `P = "aaa…a"` (m a's) and `T = "aaa…a"` (n a's). Every window IS an actual match (not even spurious), so every window triggers O(m) verification. But if you change `P = "aaa…ab"`, every window `text[i:i+m]` is all a's with hash matching `"aaa…a"`'s hash (not matching the actual pattern since `P` ends in `b`), causing O(n) spurious hits each costing O(m) - total O(n·m).

**Cache behavior.** The rolling hash computation is cache-friendly: `text[i]` and `text[i+m]` are the only two text characters accessed per slide. The window is never fully loaded into registers - the hash computation is arithmetic on two characters. This is better cache behavior than naive sliding-window character comparison, which accesses all `m` characters of the window. For very large texts with large patterns, Rabin-Karp's O(1)-access-per-slide property means the main loop operates almost entirely from L1 cache (two characters and three integers).

**Space: O(1).** Only the hash values (integers) and the `high` constant are maintained. No extra array proportional to `n` or `m` is needed.

## Constraints & approach

| Input constraints                                | Expected complexity | What it tells you                                                                                                                                         |
| ------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `n, m ≤ 10³`                                     | O(n·m) fine         | Naive nested loop or `text.find(pattern)` passes. Rabin-Karp adds complexity with no speed benefit at this scale.                                        |
| `n ≤ 10⁵`, single pattern                        | O(n + m)            | Adversarial self-similar input (`"aa…a"` text, `"aa…ab"` pattern) pushes naive to O(n·m) and TLEs. Use **KMP or Z-algorithm** for a deterministic O(n + m) guarantee; Rabin-Karp is average-case O(n + m) but gambleable. |
| `k` patterns, sum of lengths ≤ 10⁵               | O(n + k·m) or better | Rabin-Karp shines: hash all `k` patterns into a set; each window does O(1) set membership lookup → O(n + k·m) total. **Aho-Corasick** achieves O(n + Σm + matches) deterministically but requires building a trie. |
| `n ≤ 10⁶`, rolling hash / substring equality    | O(n) average        | "Count occurrences", "check equality of many substrings", "2-D pattern matching" → **Rabin-Karp rolling hash** is the natural tool. KMP needs modification for these; Rabin-Karp is off-the-shelf. |
| Exact worst-case guarantee needed, single pattern | O(n + m)            | Do not use Rabin-Karp - its worst case is O(n·m). Use **KMP** (unconditional O(n + m)) or **Z-algorithm**. Use Rabin-Karp only if the input distribution is known to be non-adversarial. |

## When to use / when not

**Reach for Rabin-Karp when:**

- You need **multi-pattern search** and don't want to build Aho-Corasick. Hash all `k` patterns into a Python `set`; for each window compute the rolling hash in O(1) and check `hash in pattern_set` in O(1). Total: O(n + k·m) - one pass over the text, `k` pattern hashes precomputed. **Caveat: a single rolling hash window has fixed length `m`, so this works directly only when all patterns have the same length.** For variable-length patterns, group by length and run one pass per length group (O(L · n) for L distinct lengths), or use Aho-Corasick for a fully general O(n + Σm) solution. This is Rabin-Karp's principal advantage over KMP, which handles only one pattern at a time.
- You need to **compare or identify many substrings** - checking if two arbitrary windows are equal without comparing all characters, deduplicating substring multisets, or 2-D grid pattern matching. Rolling hash as a data structure (precompute prefix hashes, query O(1) per substring) is the natural tool here.
- You want a **simpler implementation** than KMP for a probabilistic context where the occasional worst-case is acceptable or the hash can be seeded randomly.

**Do not use Rabin-Karp when:**

- You need a **deterministic worst-case guarantee** for single-pattern search: use KMP (O(n + m) unconditionally) or Z-algorithm. A contest setter can craft `q`-specific adversarial inputs; Rabin-Karp gives up the guarantee.
- You're searching for **one pattern** and a library `str.find` / `pattern in text` is permitted - built-ins are C-optimized, faster in practice, and correct.
- You need the **failure function as a byproduct** (smallest repeating period, longest prefix-that-is-suffix) - that's a KMP-specific artefact; rolling hash doesn't produce it.

**At scale in real systems.** Rabin-Karp powers **plagiarism-detection engines** (Moss, JPlag): a document's rolling hashes fingerprint every k-gram; two documents sharing many k-gram hashes are likely plagiarized. The failure mode at scale: if the prime `q` is small or predictable, adversarial content can be constructed to force collisions, causing false plagiarism alerts. Production systems use **double hashing** (two independent (base, q) pairs) to reduce collision probability from `1/q` to `1/(q₁·q₂)` - making adversarial construction infeasible without knowing both primes.

## Comparison

| Algorithm       | Preprocess | Search per text char     | Space    | Worst case       | Pick it when…                                                                                         |
| --------------- | ---------- | ------------------------ | -------- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| **Rabin-Karp**  | O(m)       | O(1) avg, O(m) worst     | O(1)     | O(n·m)           | Multi-pattern search (hash set of patterns); substring equality; 2-D matching; k-gram fingerprinting. Crossover vs Aho-Corasick: `k` patterns but you don't want trie overhead. |
| KMP             | O(m)       | O(1) amortized           | O(m)     | O(n + m)         | Single pattern with a deterministic linear guarantee; failure function needed as a byproduct. Crossover vs Rabin-Karp: you can't tolerate adversarial worst case. |
| Z-algorithm     | O(n + m)   | O(1) amortized           | O(n + m) | O(n + m)         | Same power as KMP, often easier to derive; use over `P$T`. Crossover vs KMP: the concatenation trick `P$T` is more intuitive than failure function to you. Pay O(n + m) extra space. |
| Aho-Corasick    | O(Σm · σ)  | O(1) per char + matches  | O(Σm·σ)  | O(n + Σm + occ)  | Many patterns, deterministic, all occurrences needed. Crossover vs Rabin-Karp: you need a hard guarantee, not probabilistic; the trie cost is worth it at large `k`. |
| Naive scan      | -          | O(m) worst               | O(1)     | O(n·m)           | `n, m ≤ 10³`; prototyping; the probability-of-worst-case is negligible on random text. Never in a contest with n ≥ 10⁵ and self-similar input. |

## Loop/recurrence invariant

The rolling hash gives Rabin-Karp its efficiency through a **sliding window invariant** maintained across every step of the scan.

**The invariant:** at the start of iteration `i`, `window_hash` equals `H(text[i : i+m]) mod q` - the polynomial hash of exactly the current window of length `m`, computed fresh from the window's characters.

The invariant is established before the loop by computing `H(text[0:m])` directly. It is maintained across each slide: the update formula

```
window_hash = ((window_hash − text[i] · high) · base + text[i+m]) mod q
```

is a *proof* of the invariant, not just an optimization. One can verify algebraically:

```
H(text[i+1 : i+m+1]) = H(text[i : i+m] without text[i], then shifted left, then text[i+m] added)
                      = (H(text[i:i+m]) − text[i]·base^(m-1)) · base + text[i+m]   (mod q)
```

This derivation holds because the polynomial hash distributes over the subtraction and the shift is a multiplication by `base`. The invariant therefore holds after every slide by the algebraic identity alone - no look-ahead required, no dependency on the next window's characters.

The invariant has two consequences:
1. **O(1) slide**: the invariant is maintained by three arithmetic operations, so iterating over all `n − m + 1` windows costs O(n) total in the hash computation (no summation of inner work).
2. **Correctness of the filter**: because `window_hash == H(text[i:i+m]) mod q` always holds, when `window_hash == pattern_hash`, the window genuinely *could* be a match - the hashes are truly equal, not accidentally the result of an invariant violation. The subsequent character comparison is authoritative.

**The invariant that makes O(1) slide possible** is that each step builds directly on the previous hash value: no character in the interior of the window is re-examined. This is structurally analogous to the amortized invariant in KMP (the scan pointer never rewinds) - both algorithms achieve O(n) scan by ensuring each text character is processed at most a constant number of times in the main loop's accounting.

## Edge cases

- **Hash collision (spurious hit).** Window hash equals pattern hash but strings differ. Always verify by character comparison on every hash match. This is the most common source of bugs - implementations that skip verification for speed are Monte Carlo (incorrect). Always write: `if window_hash == pattern_hash and text[i:i+m] == pattern`.
- **Pattern longer than text (`m > n`).** No window of length `m` fits in `T`. The slide loop never executes (range is empty). Guard with `if m > n: return []` before allocating the hash.
- **Single-character pattern (`m = 1`).** `high = base^0 = 1`. The rolling hash degenerates to tracking one character value. Correct but over-engineered - `text.index(ch)` or a linear scan is cleaner. The hash formula still works; test this case to verify the modular arithmetic doesn't break.
- **All-same-character text and pattern (adversarial worst case).** `T = "aaaa…a"` (n a's), `P = "aaaa…a"` (m a's). Every window is a true match - O(n−m+1) verifications, each O(m) - total O(n·m). This is not a bug; it's unavoidable when every position is a genuine match. The mitigation: if multi-match output is the goal, accept O(nm) here; otherwise, use the algorithm only when expected matches are few.
- **All-same-character text, different pattern suffix (adversarial spurious hit).** `T = "aaaa…a"`, `P = "aaaa…ab"`. Every window's hash may equal the pattern hash for a poorly chosen `q`, causing O(n) spurious hits each costing O(m). Use a **large prime** (10⁹ + 7, 10⁹ + 9) or **double hashing** (two (base, q) pairs) to reduce per-window collision probability from 1/q to 1/(q₁·q₂).
- **Negative residues from modular subtraction.** `(window_hash − text[i] * high) % q` can yield a negative number in Python (`-3 % 5 = 2` in Python, fine - Python's `%` always returns non-negative, but this is not true in C++/Java). In Python this is handled automatically, but in other languages always write `((h - leaving) % q + q) % q`.
- **Prime selection matters.** A small prime (e.g., `q = 7`) means a collision probability of `1/7` per window - with `n = 10^5` windows you expect ~14,000 spurious hits. A large prime like `10^9 + 7` reduces this to ~0.0001 expected spurious hits. The "large prime" rule-of-thumb: `q > n · m` to push expected spurious hits below 1.

## Implementation

**Pseudocode** (CLRS style - 1-indexed):

```
RABIN-KARP-MATCH(T, P, base, q)
n ← T.length
m ← P.length
high ← 1
for i = 1 to m − 1                          ▷ compute base^(m-1) mod q
    high ← (high · base) mod q
p_hash ← 0
w_hash ← 0
for i = 1 to m                              ▷ initial pattern and window hashes
    p_hash ← (base · p_hash + ord(P[i])) mod q
    w_hash ← (base · w_hash + ord(T[i])) mod q
for s = 0 to n − m                          ▷ s = window start, 0-indexed offset
    if p_hash = w_hash
        if P[1..m] = T[s+1..s+m]            ▷ character-by-character verification
            report match at position s
    if s < n − m
        w_hash ← (base · (w_hash − ord(T[s+1]) · high) + ord(T[s+m+1])) mod q
        w_hash ← (w_hash + q) mod q         ▷ guard against negative residue
```

**Python** - idiomatic, 0-indexed, returning all match start indices:

```python
def rabin_karp(text: str, pattern: str, base: int = 31, q: int = 10**9 + 9) -> list[int]:
    """
    Return all start indices where pattern occurs in text.
    Average O(n + m); worst case O(n·m) on adversarial hash collisions.
    """
    n, m = len(text), len(pattern)
    if m > n:
        return []
    if not pattern:
        return list(range(n + 1))          # empty pattern matches everywhere

    # Precompute base^(m-1) mod q - the "leaving character" multiplier
    high: int = 1
    for _ in range(m - 1):
        high = high * base % q

    # Initial hashes for pattern and first window
    p_hash: int = 0
    w_hash: int = 0
    for i in range(m):
        p_hash = (p_hash * base + ord(pattern[i])) % q
        w_hash = (w_hash * base + ord(text[i])) % q

    matches: list[int] = []

    for i in range(n - m + 1):
        if w_hash == p_hash:
            # Hash match - verify character by character (avoid spurious hits)
            if text[i : i + m] == pattern:
                matches.append(i)

        if i < n - m:
            # Slide the window: remove text[i], add text[i+m]
            # +q guards against negative residue from subtraction
            w_hash = (w_hash - ord(text[i]) * high) % q
            w_hash = (w_hash * base + ord(text[i + m])) % q
            w_hash = (w_hash + q) % q      # ensure non-negative

    return matches


def rabin_karp_multi(text: str, patterns: list[str], base: int = 31, q: int = 10**9 + 9) -> dict[str, list[int]]:
    """
    Multi-pattern variant: hash all patterns into a set, one pass over text.
    O(n + k·m) average where k = number of patterns, m = max pattern length.
    All patterns must have the same length (for the rolling hash to work directly).
    For variable lengths, run per-length groups or use Aho-Corasick instead.
    """
    if not patterns:
        return {}
    m = len(patterns[0])           # assume uniform length for this demo
    n = len(text)
    if m > n:
        return {p: [] for p in patterns}

    # Build a set of (hash, pattern) for fast lookup
    high: int = 1
    for _ in range(m - 1):
        high = high * base % q

    pattern_hashes: dict[int, list[str]] = {}
    for p in patterns:
        h: int = 0
        for ch in p:
            h = (h * base + ord(ch)) % q
        pattern_hashes.setdefault(h, []).append(p)

    results: dict[str, list[int]] = {p: [] for p in patterns}
    w_hash: int = 0
    for i in range(m):
        w_hash = (w_hash * base + ord(text[i])) % q

    for i in range(n - m + 1):
        if w_hash in pattern_hashes:
            window = text[i : i + m]
            for p in pattern_hashes[w_hash]:
                if window == p:           # verify; handles spurious hits
                    results[p].append(i)
        if i < n - m:
            w_hash = (w_hash - ord(text[i]) * high) % q
            w_hash = (w_hash * base + ord(text[i + m])) % q
            w_hash = (w_hash + q) % q

    return results
```

## What the interviewer probes for

- **"What's the worst case and when does it happen?"** The worst case is O(n·m) and it occurs when every sliding window produces a hash collision with the pattern - either because every window is a genuine match (e.g., all same characters) or because the prime `q` is too small and many windows coincidentally hash to the same value. For a fixed `q`, an adversary who knows `q` can construct a text with all-collision windows in O(nm) time. The mitigation is to pick `q` randomly from a set of large primes, making adversarial construction infeasible; this is the randomized Rabin-Karp. Even so, the algorithm remains Las Vegas (always correct) since hash matches are always verified.

- **"How do you handle multi-pattern search?"** Hash all `k` patterns into a Python dictionary keyed by hash value. In the main loop, look up the window hash in the dictionary in O(1); if found, verify the matching patterns by character comparison. This gives O(n + k·m) average time in one pass over the text - far better than running `k` independent Rabin-Karp searches (which would be O(k·n + k·m)). The caveat: this works directly only when all patterns have the same length. For variable-length patterns, group patterns by length and run one rolling hash per length group, or use Aho-Corasick for a fully general solution with a hard time bound.

- **"Why use a prime modulus?"** A prime `q` ensures the hash values are uniformly distributed across `{0, 1, …, q−1}`. If `q` were composite - say a power of 2 - the lower bits of the hash are dominated by the lower bits of the characters, creating structural collisions for inputs with characters whose values share factors with `q`. A prime breaks this structure: no character value divides `q`, so the contribution of each position is "spread" independently. By the Birthday paradox, the probability that any two distinct strings of length `m` have the same hash is approximately `1/q`; a large prime maximizes the denominator and minimizes collision probability. Concretely: `q = 10^9 + 7` (a standard prime) gives a collision probability of roughly `10^{-9}` per window - negligible in all practical scenarios.

- **"How does double hashing work?"** Compute two independent rolling hashes `(h1, h2)` using different `(base1, q1)` and `(base2, q2)` pairs. Treat the pair `(h1, h2)` as the fingerprint. A spurious hit requires both hashes to collide simultaneously - probability `1/(q1·q2)`. With `q1 = 10^9 + 7` and `q2 = 10^9 + 9`, the collision probability per window is `~10^{-18}`, making adversarial attack practically infeasible. The cost is doubling the arithmetic: two hash updates per slide instead of one. In competitive programming this is the standard defense when a setter is known to test with anti-hash data.

## Practice problems

### 1. Find all anagrams in a string - rolling hash over character counts

Given strings `s` and `p`, return all start indices of `p`'s anagrams in `s`. An anagram is any permutation of `p`'s characters. Constraints: `1 ≤ |p| ≤ |s| ≤ 3·10⁴`, lowercase letters only.

**Approach:** Rabin-Karp applied to a character-count fingerprint rather than a polynomial hash. Since anagrams have the same character counts, two windows are anagram-equivalent iff their sorted character frequency vectors are equal. The rolling update: when sliding the window, decrement the count for the leaving character and increment for the entering character, then compare the 26-element count array to the pattern's count array. Use a running `equal_count` variable tracking how many of the 26 letters currently match between the window and pattern - decrement on a count becoming unequal, increment on a count becoming equal again - so each slide is O(1) average. This is rolling hash where the "hash" is the count vector, and the "collision-free" property holds because count equality implies anagram equality (no verification step needed - count equality is exact).

```python
def find_anagrams(s: str, p: str) -> list[int]:
    if len(p) > len(s):
        return []
    p_count = [0] * 26
    w_count = [0] * 26
    for ch in p:
        p_count[ord(ch) - ord('a')] += 1
    for ch in s[:len(p)]:
        w_count[ord(ch) - ord('a')] += 1

    matches: list[int] = []
    equal = sum(1 for i in range(26) if p_count[i] == w_count[i])
    if equal == 26:
        matches.append(0)

    for i in range(len(p), len(s)):
        # Add incoming character
        inc = ord(s[i]) - ord('a')
        if w_count[inc] == p_count[inc]:
            equal -= 1
        w_count[inc] += 1
        if w_count[inc] == p_count[inc]:
            equal += 1
        # Remove outgoing character
        out = ord(s[i - len(p)]) - ord('a')
        if w_count[out] == p_count[out]:
            equal -= 1
        w_count[out] -= 1
        if w_count[out] == p_count[out]:
            equal += 1
        if equal == 26:
            matches.append(i - len(p) + 1)

    return matches
```

Time O(n + m), space O(1) (fixed 26-element arrays). Pattern: rolling frequency count as an exact fingerprint.

**Duplicate problems:** LeetCode 567 (Permutation in String) - identical logic, just return `True` on first match instead of collecting all indices.

### 2. Repeated DNA sequences - multi-pattern via hash set

Given a string `s` of nucleotides (A, C, G, T), find all 10-letter-long sequences that appear more than once. Return all such sequences. Constraints: `1 ≤ |s| ≤ 10⁵`.

**Approach:** This is Rabin-Karp applied as a substring deduplication tool - not searching for a fixed pattern, but identifying which 10-grams appear more than once. Compute a rolling hash over the string with window size 10; maintain a `seen` set of hashes and a `repeated_hashes` set. When a hash from `seen` appears again, it's a candidate repeat; verify by string comparison (or use a `seen_strings` set directly if memory is acceptable). For this small window size and small alphabet, storing the actual 10-character substrings in a set is also O(n) in time and O(n) in space - and simpler. The rolling hash version avoids the O(m) substring construction cost per window, trading it for hash computation.

```python
def find_repeated_dna_sequences(s: str) -> list[str]:
    if len(s) <= 10:
        return []
    seen: set[int] = set()
    repeated: set[str] = set()
    base, q = 4, 10**9 + 7
    char_map = {'A': 0, 'C': 1, 'G': 2, 'T': 3}
    m = 10

    # Compute base^(m-1) mod q
    high = 1
    for _ in range(m - 1):
        high = high * base % q

    # Initial window hash
    h = 0
    for ch in s[:m]:
        h = (h * base + char_map[ch]) % q

    seen.add(h)

    for i in range(1, len(s) - m + 1):
        # Slide
        h = (h - char_map[s[i - 1]] * high) % q
        h = (h * base + char_map[s[i + m - 1]]) % q
        h = (h + q) % q
        if h in seen:
            repeated.add(s[i : i + m])   # verify implicitly via string store
        else:
            seen.add(h)

    return list(repeated)
```

Time O(n), space O(n). Pattern: rolling hash for substring deduplication.

**Duplicate problems:**
- Find All Anagrams in a String (LC 438) - same sliding-window dedup idea but checking anagram equality via frequency count rather than hash; the +q guard and window-slide structure are identical.
- Contains Duplicate (LC 217) - degenerate case: fixed window = entire string; rolling hash overkill here but the membership-check pattern is the same.

### 3. Longest duplicate substring - binary search + rolling hash

Given a string `s`, find the longest substring that appears at least twice. Return the substring (empty string if none). Constraints: `2 ≤ |s| ≤ 3·10⁴`.

**Approach:** Binary search on the answer length `L`, then use Rabin-Karp with window size `L` to check whether any L-gram appears more than once in O(n) average time. The binary search runs O(log n) iterations; each iteration runs Rabin-Karp in O(n). Total: O(n log n) average. This combination - binary search on length + rolling hash for the existence check - is the canonical "longest repeated substring" pattern. The hash check must handle collisions (store actual substrings in the seen set or use double hashing to reduce false positive probability to negligible).

```python
def longest_dup_substring(s: str) -> str:
    def has_dup(length: int) -> str:
        """Return one duplicate substring of the given length, or empty string."""
        base, q = 31, 10**9 + 9
        high = 1
        for _ in range(length - 1):
            high = high * base % q
        h = 0
        for ch in s[:length]:
            h = (h * base + ord(ch)) % q
        seen: dict[int, list[int]] = {h: [0]}
        for i in range(1, len(s) - length + 1):
            h = (h - ord(s[i - 1]) * high) % q
            h = (h * base + ord(s[i + length - 1])) % q
            h = (h + q) % q
            if h in seen:
                window = s[i : i + length]
                for start in seen[h]:
                    if s[start : start + length] == window:  # verify
                        return window
                seen[h].append(i)
            else:
                seen[h] = [i]
        return ""

    lo, hi = 1, len(s) - 1
    result = ""
    while lo <= hi:
        mid = (lo + hi) // 2
        candidate = has_dup(mid)
        if candidate:
            result = candidate
            lo = mid + 1
        else:
            hi = mid - 1
    return result
```

Time O(n log n) average, O(n² log n) worst case (all hash collisions and verification). Space O(n). Pattern: binary search on answer length combined with rolling hash existence check - a compound technique distinct from the previous two problems.

**Duplicate problems:**
- Longest Duplicate Substring (LC 1044) - same problem, same binary search + rolling hash approach; this IS LC 1044.
- Longest Repeated Substring (SPOJ REPSTR) - identical mechanic; suffix array is the cleaner O(n log n) solution but binary search + Rabin-Karp is the contest fallback when SA isn't in your template.
