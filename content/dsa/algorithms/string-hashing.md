# String Hashing

## Prerequisites

- [Modular Arithmetic](./modular-arithmetic.md) [Must read] - every hash value lives mod a prime; overflow, modular subtraction, and modular inverse (for rolling-hash removal) are used throughout.
- [String](../data-structures/string.md) [Must read] - the structure being hashed; immutability is why prefix hashes can be precomputed once and reused.
- [Rabin-Karp](./rabin-karp.md) [Should read] - the canonical single-hash sliding-window application; this article generalizes the hash function itself (multi-query prefix hashing, collision-safety) rather than the sliding-window search that page owns.

## Table of Contents

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

## What it is

**String hashing** maps a string (or any substring of it) to a fixed-size integer via a polynomial function evaluated mod a large prime, so that **comparing two substrings for equality collapses from O(length) to O(1)** after O(n) preprocessing.

Mental model: **treat the string as a number in a large base** (base = alphabet size or larger), and reduce that number mod a prime so it fits in a machine word. Two substrings that hash to the same value are (almost certainly) equal - "almost certainly" is the entire subject of this article.

> **Takeaway (say this out loud):** "String hashing turns a string into a polynomial mod a prime - equal substrings hash equal, so I can compare any two substrings in O(1) after one O(n) prefix-hash pass, as long as I engineered the hash to survive adversarial collisions."

## Intuition

Think of a string `s = s_0 s_1 ... s_{n-1}` as digits of a number in base `B`: `H(s) = s_0·B^{n-1} + s_1·B^{n-2} + ... + s_{n-1}·B^0`. Two strings that are character-for-character equal produce the identical polynomial, so their hashes are trivially equal. The useful direction is the risky one: if two *different* strings collide to the same value mod `M`, you get a false positive. The entire design of a good string hash is about making that collision probability negligible - picking `B` and `M` so that an adversary (or bad luck) can't easily force two different substrings to the same residue.

The reason this beats brute-force character comparison isn't the hash of one string - it's that once you've hashed the **whole string's prefixes**, you can derive the hash of **any substring** in O(1) via a rolling formula, the same way [prefix sums](../patterns/prefix-sum.md) give O(1) range-sum after an O(n) pass. String hashing is prefix sums, but the "sum" is polynomial evaluation instead of addition.

## How it works

**Step 1 - precompute prefix hashes.** Define `H[0] = 0` and `H[i] = (H[i-1]·B + s[i-1]) mod M` for `i = 1..n`. `H[i]` is the hash of the prefix `s[0..i)`.

**Step 2 - precompute powers of B.** `pow[i] = B^i mod M` for `i = 0..n`, needed to "shift" a shorter prefix hash up to align with a longer one.

**Step 3 - answer any substring hash in O(1).** The hash of `s[l..r)` (0-indexed, exclusive `r`) is:

```
hash(l, r) = (H[r] - H[l] · pow[r - l]) mod M
```

This mirrors prefix-sum subtraction (`sum(l,r) = P[r] - P[l]`), except the left term must first be "shifted" by `pow[r-l]` to align its base-`B` place value with the right term before subtracting - a string prefix isn't just added on, it's multiplied in.

```
s = "abcab"     B = 31, M = a large prime

prefix hashes:  H[0]=0
                H[1] = hash("a")
                H[2] = hash("ab")
                H[3] = hash("abc")
                H[4] = hash("abca")
                H[5] = hash("abcab")

substring "cab" = s[2..5):
  hash(2,5) = (H[5] - H[2]·pow[3]) mod M
              ^^^^   ^^^^^^^^^^^^^
              full    shift H[2] "abcab"-length places over,
              hash    then subtract to strip the "ab" contribution
```

Comparing two substrings for equality is then: compute both O(1) hashes, compare integers. No character scan.

## Correctness / invariant

**Invariant:** after processing `i` characters, `H[i]` is the polynomial value of `s[0..i)` mod `M`, and `pow[i] = B^i mod M` exactly. Both are maintained by simple induction: `H[i] = H[i-1]·B + s[i-1]` and `pow[i] = pow[i-1]·B`, each mod `M`.

**Why the subtraction formula is correct:** `H[r]` encodes `s[0..r)` with `s[l..r)` sitting in its low-order `(r-l)` "digits" and `s[0..l)` shifted left by `(r-l)` places (multiplied by `B^{r-l}`). `H[l]·pow[r-l]` reconstructs exactly that shifted contribution of `s[0..l)`. Subtracting it away mod `M` leaves precisely the polynomial value of `s[l..r)`.

**Why it can be wrong (the actual "proof" that matters here):** this is a **randomized correctness** argument, not a deterministic one. Two distinct strings hashing equal mod `M` is a collision; by the birthday bound, with `M` random-ish prime and hashes uniformly distributed over `[0, M)`, the probability any two of `k` compared strings collide is roughly `k² / M`. For `M ≈ 10^9`, comparing `10^5` substrings gives collision probability on the order of `10^10 / 10^9` - **greater than 1**, i.e. collisions become likely. This is why single-hash Rabin-Karp-style solutions are graded "probably correct," and why competitive programmers either use **double hashing** (two independent `(B, M)` pairs, combine into one comparison - collision probability multiplies to ~`(k²/M)²`) or a `M ≈ 10^18` hash with 64-bit arithmetic, or accept the small risk on problems where it's not adversarially tested.

## Complexity derivation

**Preprocessing:** one pass computing `H[i]` and `pow[i]` for `i = 1..n`, each step O(1) work (one multiply, one add, one mod) → **O(n)** total.

**Per-query substring hash:** the formula `(H[r] - H[l]·pow[r-l]) mod M` is three arithmetic ops → **O(1)** per query, after the O(n) preprocessing. `q` queries after preprocessing: **O(n + q)** total, vs. **O(n·q)** for naive substring comparison (or O((n+q)·L) if comparing length-L substrings character by character).

**Space:** O(n) for the two prefix arrays (`H` and `pow`).

## Constraints & approach

| Input size | Query pattern | Reach for |
|---|---|---|
| `n ≤ 10³`, few queries | any | direct substring comparison / brute force is simpler and safe |
| `n ≤ 10⁵`–`10⁶`, many substring-equality queries | repeated equality checks on varying ranges | **string hashing, O(n) preprocess + O(1) per query** |
| Need a *guaranteed* correct answer (adversarial tests, hacks likely) | equality-critical (e.g. judging distinctness for a final count) | **double hashing** (two independent mod pairs) or suffix array/suffix automaton - single hash risks an adversarial collision |
| Need lexicographic comparison, not just equality | substring "less than" comparisons, e.g. longest common prefix ordering | hash + binary search on LCP length works, but a [suffix array](../data-structures/suffix-array.md) directly supports comparison and is often simpler once you need many such comparisons |
| One sliding window sweeping the whole string once | fixed-length pattern search | plain single-hash rolling window ([Rabin-Karp](./rabin-karp.md)) is simpler than full prefix-hash machinery |

The tell: if you need to compare **arbitrary, non-adjacent substrings** repeatedly (not just one sliding window), you want the prefix-hash-array form here, not Rabin-Karp's rolling window.

## When to use / when not

**Reach for string hashing when:**

- You need O(1) equality checks between **arbitrary substrings** of a fixed string, queried many times (e.g. "is `s[2:7]` equal to `s[10:15]`?").
- You're binary-searching on a substring property (longest common prefix, longest duplicate substring) and need O(1) comparison inside the search.
- You need a fast, simple multi-pattern or fingerprint check where a small false-positive risk (mitigated by double hashing) is acceptable in exchange for huge speed - contest settings where suffix structures are overkill.

**Reach for something else when:**

- You need **guaranteed zero false positives** and can't double-hash for some reason → build a [suffix array](../data-structures/suffix-array.md) or suffix automaton; O(n log n) build, exact comparisons via LCP, no probabilistic risk.
- You're doing a **single left-to-right scan for one pattern** → plain [Rabin-Karp](./rabin-karp.md)'s rolling window (or [KMP](./string-matching.md)/[Z-algorithm](./z-algorithm.md), which are also deterministic) - simpler, no prefix array needed.
- You need substring **ordering** (not just equality) across many pairs → a suffix array gives you that natively; hashing needs an extra binary-search-on-LCP layer to simulate it.

Real-world: rolling/prefix hashing is the backbone of `rsync`'s and `rdiff`'s block-matching (finding which file chunks changed), Git's content-addressable storage conceptually parallels it (though Git uses cryptographic SHA-1/256, not a rolling polynomial hash), and plagiarism-detection / duplicate-content systems use k-gram rolling hashes (Rabin fingerprinting) to fingerprint documents before comparing.

## Comparison

| Technique | Preprocess | Per-query equality | Guarantees | Pick it when… |
|---|---|---|---|---|
| **String hashing (prefix hash array)** | O(n) | **O(1)** | probabilistic (collision risk ~k²/M unless double-hashed) | many arbitrary-substring equality checks, contest time pressure |
| Rabin-Karp (single rolling hash) | O(1) | O(1) amortized per window slide | probabilistic, same caveat | one pattern, one left-to-right sweep |
| Suffix array + LCP | O(n log n) (or O(n) with SA-IS) | O(log n) via LCP binary search, or O(1) with sparse-table RMQ | exact, deterministic | need ordering too, or zero false-positive tolerance, and can afford the build |
| Direct character comparison | O(1) | O(L) per comparison | exact | few queries, small strings - hashing's setup isn't worth it |
| Z-algorithm / KMP | O(n) | n/a (built for pattern search, not arbitrary-pair comparison) | exact | one-pattern-in-one-text search, not general substring comparison |

String hashing wins on raw query speed and simplicity of implementation; it trades that for a (controllable, but nonzero) correctness risk that a suffix array doesn't carry. The crossover: once you need **many** comparisons **and** absolute correctness, the O(n log n) suffix-array build pays for itself.

## Loop/recurrence invariant

The prefix-hash computation is a single forward loop building a recurrence, structurally identical to how [modular exponentiation](./modular-exponentiation.md) or [Euclidean GCD](./euclidean-gcd.md) accumulate a running value:

```
H[0] = 0
H[i] = (H[i-1] * B + ord(s[i-1])) mod M     for i = 1..n
```

**Invariant maintained at the top of each iteration:** `H[i-1]` correctly equals the polynomial hash of `s[0..i-1)` mod `M`. **Base case** (`i=0`): `H[0] = 0` is vacuously the hash of the empty prefix. **Inductive step:** given `H[i-1]` correct, appending character `s[i-1]` shifts every prior digit one base-`B` place left (`· B`) and adds the new low-order digit (`+ ord(s[i-1])`) - exactly the recurrence, so `H[i]` is correct by construction. **Termination:** after `n` iterations, `H[n]` is the hash of the entire string, and every intermediate `H[i]` is simultaneously valid for O(1) substring queries via the subtraction formula. The `pow[i]` array satisfies the identical recurrence (`pow[i] = pow[i-1] · B`) and is computed alongside in the same pass.

## Edge cases

- **`l == r` (empty substring).** `hash(l, l) = 0` by the formula (since `H[l] - H[l]·pow[0] = H[l] - H[l] = 0`) - decide upfront whether your problem treats empty-string comparisons as trivially equal (usually yes) and don't special-case it away by accident.
- **Integer overflow in the multiply before the mod.** `H[i-1] * B` can overflow 64-bit if `M` is close to `2^63` and `B` isn't kept small - use Python's arbitrary precision (no risk) but in C++/Java, use `__int128` or a mod that leaves headroom, or switch to `unsigned long long` with mod `2^64` (the "no explicit mod, let it overflow" trick - fast, but simultaneously breaks the collision-resistance guarantee against adversarial inputs, a well-known CP gotcha).
- **Single hash on a Codeforces-style problem with adversarial test data.** Problems that reward hacking submissions specifically target single natural-mod hashes (`M = 10^9+7` with small `B`) with precomputed collisions. **Always double-hash** (two different `(B, M)` pairs, compare the pair) on any problem where the judge accepts hacks or the setter is known to test against naive hashing.
- **Negative intermediate result after subtraction.** `(H[r] - H[l]*pow[r-l]) mod M` can go negative before the mod in languages where `%` doesn't force a non-negative result (C++, Java) - add `M` before the final mod: `((H[r] - H[l]*pow[r-l]) % M + M) % M`.
- **Reusing `pow[]` across different strings with different lengths.** `pow[i]` only depends on `B` and `M`, not the string - safe and encouraged to precompute once up to the max length needed across all strings in a problem, rather than per-string.

## Implementation

**Pseudocode (CLRS-style contract):**

```
BUILD-PREFIX-HASH(s, B, M)
1   n = s.length
2   let H[0..n] and pow[0..n] be new arrays
3   H[0] = 0
4   pow[0] = 1
5   for i = 1 to n
6       H[i] = (H[i-1] · B + ORD(s[i-1])) mod M
7       pow[i] = (pow[i-1] · B) mod M
8   return H, pow

SUBSTRING-HASH(H, pow, l, r, M)          ▷ hash of s[l..r), 0-indexed, r exclusive
1   return ((H[r] − H[l] · pow[r − l]) mod M + M) mod M
```

**Python (reference - from scratch, the mechanism):**

```python
class PrefixHash:
    """Polynomial rolling hash with O(1) substring-hash queries after O(n) build."""

    def __init__(self, s: str, base: int = 131, mod: int = 1_000_000_007) -> None:
        n = len(s)
        self.mod = mod
        self.h = [0] * (n + 1)
        self.pow = [1] * (n + 1)
        for i, ch in enumerate(s, start=1):
            self.h[i] = (self.h[i - 1] * base + ord(ch)) % mod
            self.pow[i] = (self.pow[i - 1] * base) % mod

    def hash_range(self, l: int, r: int) -> int:
        """Hash of s[l:r], 0-indexed, r exclusive. O(1)."""
        return (self.h[r] - self.h[l] * self.pow[r - l]) % self.mod


class DoubleHash:
    """Two independent PrefixHash instances combined - collision-safe for contest hacks."""

    def __init__(self, s: str) -> None:
        self.a = PrefixHash(s, base=131, mod=1_000_000_007)
        self.b = PrefixHash(s, base=137, mod=998_244_353)

    def hash_range(self, l: int, r: int) -> tuple[int, int]:
        return (self.a.hash_range(l, r), self.b.hash_range(l, r))
```

**Contest velocity - comparing two substrings once built:**

```python
ph = PrefixHash("abcabcabc")
same = ph.hash_range(0, 3) == ph.hash_range(3, 6)   # "abc" == "abc" -> True, O(1)
```

## What the interviewer probes for

- **"How confident are you this hash never collides?" - I'm not, for a single hash.** A single 64-bit or `10^9`-range mod hash has a real, quantifiable collision probability (birthday bound `~k²/M`); for a guarantee, either double-hash (multiply two independent collision probabilities together) or fall back to a deterministic structure like a suffix array.
- **"Why not just use Python's built-in `hash()` or `==` on strings?" - Different problem.** Built-in string equality is already O(L); the whole point of rolling/prefix hashing is to make *repeated substring* comparisons O(1) after preprocessing, which built-in hashing of ad-hoc slices doesn't give you (slicing a string in Python is itself O(L), defeating the purpose).
- **"What breaks with a bad choice of base `B`?" - Collisions cluster if `B` shares structure with the alphabet or `M`.** If `B` is too small (e.g. `B=1`) or has a common factor with `M`, distinct strings collide far more often than the random-hash analysis assumes; pick `B` larger than the alphabet size and coprime-ish with `M` (a random prime works well in practice).

## Practice problems

### 1. Longest Duplicate Substring

**Problem.** Given a string `s`, return the longest substring that appears at least twice (as a contiguous substring), or empty string if none exists. Constraints: `n ≤ 3·10⁴`, so an O(n²) or O(n³) direct approach is too slow; O(n log n) is intended.

**Approach.** Binary search on the answer length `L`: for a candidate `L`, hash every length-`L` substring (O(n) with prefix hashing) and check for a duplicate via a hash set - O(n) per check. Binary search over `L` (O(log n) iterations) gives **O(n log n)** total. This is the canonical "hash + binary search on answer" combination that only works because substring-hash lookup is O(1).

```python
def longest_dup_substring(s: str) -> str:
    n = len(s)
    base, mod = 131, (1 << 61) - 1

    def has_dup_of_length(L: int) -> int:
        if L == 0:
            return 0
        h = 0
        p = pow(base, L - 1, mod)
        seen: dict[int, list[int]] = {}
        for i in range(L):
            h = (h * base + ord(s[i])) % mod
        seen[h] = [0]
        for i in range(1, n - L + 1):
            h = ((h - ord(s[i - 1]) * p) * base + ord(s[i + L - 1])) % mod
            if h in seen:
                for j in seen[h]:
                    if s[j:j + L] == s[i:i + L]:   # verify - guards single-hash collision
                        return i
                seen[h].append(i)
            else:
                seen[h] = [i]
        return -1

    lo, hi = 1, n - 1
    start, best_len = 0, 0
    while lo <= hi:
        mid = (lo + hi) // 2
        idx = has_dup_of_length(mid)
        if idx != -1:
            start, best_len = idx, mid
            lo = mid + 1
        else:
            hi = mid - 1
    return s[start:start + best_len]
```

**Complexity.** O(n log n) time average, O(n) space.

**Duplicate problems:**
- Longest Common Substring of two strings - same binary-search-on-length + rolling-hash-set technique, checking across two strings instead of within one.
- Distinct Substrings Count - same rolling hash per length, but counting unique hashes at each length instead of finding a duplicate.

### 2. Shortest Palindrome (via string hashing)

**Problem.** Given a string `s`, add characters in front of it to make the whole string a palindrome, and return the shortest such palindrome. Constraints: `n ≤ 5·10⁴`.

**Approach.** Compute a forward hash of `s` and a forward hash of `s` **reversed** (`rs`), using the same base/mod, and precompute powers of `B` once. Find the longest prefix of `s` that is also a palindrome by scanning the largest `k` such that `hash(s[0:k])` equals `hash(rs[n-k:n])` - the last `k` characters of `rs`, read forward, are exactly `s[0:k]` read backward, so this comparison directly tests "does `s[0:k]` read the same forwards and backwards". Prepend the reverse of the remaining suffix `s[k:]`. This shows string hashing used for **palindrome-prefix detection**, a genuinely different query shape than problem 1's duplicate-detection.

**The trap this problem exposes:** it's tempting to compare `hash(s[0:k])` directly against a `rev[k]` array built the same way as `fwd` (`rev[i] = rev[i-1]*B + ord(s[n-1-i])`). That's wrong - `rev[k]` built that way is the hash of `s`'s **last** `k` characters read in reverse, not of `s[0:k]` reversed, and the two only coincide by accident at `k = n`. The fix is to hash the *entire reversed string* once, then take a **substring hash query** (`rev[n] - rev[n-k]·pow[k]`, the same formula from [How it works](#how-it-works)) on its trailing `k` characters - not a raw prefix hash of `rev`.

```python
def shortest_palindrome(s: str) -> str:
    if not s:
        return s
    n = len(s)
    base, mod = 131, (1 << 61) - 1
    rs = s[::-1]

    fwd = [0] * (n + 1)   # prefix hashes of s
    rev = [0] * (n + 1)   # prefix hashes of s reversed
    p = [1] * (n + 1)
    for i in range(n):
        p[i + 1] = (p[i] * base) % mod
        fwd[i + 1] = (fwd[i] * base + ord(s[i])) % mod
        rev[i + 1] = (rev[i] * base + ord(rs[i])) % mod

    def rev_range_hash(l: int, r: int) -> int:   # hash of rs[l:r], 0-indexed
        return (rev[r] - rev[l] * p[r - l]) % mod

    best_k = 0
    for k in range(n, -1, -1):
        # s[0:k] forward vs rs[n-k:n] forward (== s[0:k] read backward)
        if fwd[k] == rev_range_hash(n - k, n):
            best_k = k
            break

    suffix_to_prepend = s[best_k:][::-1]
    return suffix_to_prepend + s
```

**Complexity.** O(n) time, O(n) space.

**Duplicate problems:**
- Palindrome Pairs - same forward/reverse hash comparison technique, applied pairwise across a list of words instead of within one string.

### 3. Distinct Echo Substrings

**Problem.** Return the number of distinct substrings of `s` that can be written as `t + t` for some non-empty string `t` (i.e. a string that is two identical halves concatenated). Constraints: `n ≤ 2000`.

**Approach.** For every even-length substring `s[i:j]`, split it in half and use O(1) hash comparison to check whether the first half equals the second half - turning an O(n) character comparison per candidate into O(1). Collect distinct valid `t` values in a hash set (comparing the underlying strings, not just hash values, to guard against collisions - or use double hashing to trust the hash alone). Demonstrates hashing used purely as an O(1) **equality primitive** inside a different enumeration (halves of substrings), a third distinct query shape from problems 1 and 2.

```python
def distinct_echo_substrings(s: str) -> int:
    n = len(s)
    base, mod = 131, (1 << 61) - 1
    h = [0] * (n + 1)
    p = [1] * (n + 1)
    for i, ch in enumerate(s):
        h[i + 1] = (h[i] * base + ord(ch)) % mod
        p[i + 1] = (p[i] * base) % mod

    def get_hash(l: int, r: int) -> int:   # s[l:r), 0-indexed
        return (h[r] - h[l] * p[r - l]) % mod

    seen: set[str] = set()
    for start in range(n):
        for half_len in range(1, (n - start) // 2 + 1):
            mid = start + half_len
            end = mid + half_len
            if get_hash(start, mid) == get_hash(mid, end):
                seen.add(s[start:end])   # store actual string - collision-safe final check
    return len(seen)
```

**Complexity.** O(n² ) time (all substring halves checked in O(1) each via hashing, vs O(n³) with direct comparison), O(n) space for hashes plus the found substrings.

**Duplicate problems:**
- Repeated Substring Pattern (LC 459) - same halves-equality-via-hash idea applied to the whole string instead of every substring.
