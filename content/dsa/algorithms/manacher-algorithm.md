# Manacher Algorithm

## Prerequisites

- [String](../data-structures/string.md) [Must read] - the structure being scanned; indexing and the odd/even-length palindrome distinction drive the whole algorithm.
- [Array](../data-structures/array.md) [Must read] - the auxiliary `P[]` radius array is a plain array walked left to right, reused across the expansion steps.
- [Two Pointers](../patterns/two-pointers.md) [Should read] - the center-expansion step is a two-pointer expand-outward move; Manacher's adds the trick that avoids repeating it from scratch at every center.

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

**Manacher's algorithm** finds the longest palindromic substring of a string in **O(n)**, by computing the palindrome radius centered at *every* position in a single pass, reusing previously-computed radii instead of re-expanding from scratch each time.

Mental model: **expand-around-center, but never redo work a mirror already did for you.** Every palindrome has a center; naive expand-around-center tries all `2n-1` centers independently at O(n) each (O(n²) total). Manacher's notices that once you know a *large* palindrome exists, positions inside it are **mirror images** of each other, so their radii are already known (or bounded below) without a fresh expansion.

> **Takeaway (say this out loud):** "Manacher's is expand-around-center with a mirror trick - once you're inside a known palindrome, you get a head start on every new center's radius for free, because it mirrors a position you've already solved. That collapses O(n²) to O(n)."

## Intuition

Start from the brute-force idea: the longest palindromic substring is found by trying every possible center (each single character, and each gap between two characters, since palindromes can be odd or even length) and expanding outward while the two sides match. That's `2n-1` centers, each expansion up to O(n) - **O(n²)** worst case (e.g. `"aaaaaaaa"`).

The insight that makes it linear: suppose you've already found a palindrome centered at `C` with right edge at `R` (the furthest-right boundary any palindrome has reached so far). For a new center `i` inside `[C, R]`, its **mirror position** `i' = 2C - i` (reflected across `C`) has *already* been fully processed. Because the region around `C` out to `R` is itself a palindrome, whatever palindrome structure existed around `i'` is **mirrored** around `i` - up to the boundary `R`. So instead of expanding `i` from radius 0, you start from `min(P[i'], R - i)` and only expand *further* if that lower bound is tight against the boundary. Most positions need zero or few extra comparisons; the total extra work across the whole string is bounded by how far `R` moves, which only moves forward - giving amortized O(n).

## How it works

**Step 0 - transform the string.** Insert a sentinel separator (commonly `#`) between every character and at both ends: `"abba"` → `"#a#b#b#a#"`. This unifies odd- and even-length palindromes into one case - every palindrome in the transformed string has odd length, centered on either an original character or a separator.

**Step 1 - scan left to right, tracking the rightmost-reaching palindrome.** Maintain `C` (center) and `R` (right boundary, exclusive or inclusive per convention) of the palindrome that currently extends furthest right. For each position `i`:

1. If `i < R`, use the mirror `i' = 2C - i` to seed `P[i] = min(P[i'], R - i)` - the guaranteed-correct lower bound from the mirror, capped so it doesn't overrun the known boundary.
2. **Attempt to expand** `P[i]` further by comparing characters directly outward from `i`, past `R` if necessary.
3. If the expansion pushed the palindrome's right edge past `R`, **update** `C = i`, `R = i + P[i]`.

**Step 2 - read off the answer.** The largest `P[i]` across the transformed string is the radius of the longest palindrome; map its center back to the original string's coordinates to extract the substring.

```
s  = "babad"
t  = "#b#a#b#a#d#"     (transformed, sentinels inserted)
idx: 0 1 2 3 4 5 6 7 8 9 10

Scanning t, tracking (C, R):

i=0..2: no mirror benefit yet (i >= R), expand from scratch
        at i=3 ('a' in t, orig index 1): expand -> palindrome "#b#a#b#" (t[0..6])
        radius P[3] = 3, this reaches further right than anything before
        update C=3, R=6

i=4: i < R=6, mirror i' = 2*3-4 = 2, P[2] was 0 (just '#')
     seed P[4] = min(P[2], R-4) = min(0, 2) = 0
     try expanding from that seed: t[3]='a', t[5]='b' -> mismatch, stop
     P[4] = 0, no update to C,R (didn't reach past R)

i=5: i < R=6, mirror i' = 2*3-5 = 1, P[1] was 0
     seed P[5] = min(0, 1) = 0, try expand: t[4]='#',t[6]='#' match! continue...
     expansion reaches past R -> update C=5, R=... (new best center found here)

...continuing the scan finds the true longest palindrome "bab" or "aba" (both length 3)
```

The mirror step at `i=4` shows the payoff directly: instead of blindly re-expanding from radius 0 with fresh character comparisons in both directions, the algorithm consults the already-computed `P[2]` and only does the (cheap, here zero) confirmation work needed.

## Correctness / invariant

**Invariant maintained at the start of each iteration `i`:** `P[j]` is the exact palindrome radius centered at `j`, for every `j < i`; and `(C, R)` describe the palindrome among those already found whose right edge `R` reaches furthest right, with `C` its center.

**Why the mirror seed `min(P[i'], R - i)` is always a valid *lower bound* on `P[i]`, never an overestimate:** the substring `t[C-(R-C) .. R]` (centered at `C`, extending to `R`) is a palindrome by definition of `R`. Reflecting position `i` (inside this palindrome) across `C` gives `i'`, and because the region is a palindrome, `t[i - k] == t[i + k]` for any `k` such that both `i-k` and `i+k` stay within `[C-(R-C), R]` - which mirrors `t[i'-k] == t[i'+k]`. Since `P[i']` is already known to be correct (by the loop invariant, as `i' < i`), any match/mismatch pattern within the mirrored region at `i'` is guaranteed to replay at `i`, **up to the point where the outer boundary `R` is reached** - beyond `R`, nothing is known yet, so the seed is capped at `R - i` and must be *verified* by direct comparison, not assumed.

**Why total expansion work is O(n), not O(n²):** every direct character comparison that succeeds during an expansion attempt either (a) stays within the already-known mirrored region and is redundant work bounded by the seed (not counted against the "new" work budget), or (b) pushes `R` strictly further right. Case (b) can happen at most `n` times total across the entire algorithm, because `R` only increases and is bounded by `n`. So the amortized argument is exactly the same *shape* as the dynamic array's doubling argument or the two-pointer sliding window's argument: a monotone potential (`R`) that only moves forward bounds the total "new" comparisons to O(n), even though any single step's comparisons could look like they cost more.

## Complexity derivation

**Naive expand-around-center:** `2n - 1` centers, each expansion up to O(n) in the worst case (e.g., all-same-character string) → **O(n²)**.

**Manacher's amortized argument:** define the potential `Φ = R` (the current rightmost boundary reached). Each iteration `i` does O(1) work to seed `P[i]` from the mirror, then performs some number of direct comparisons during expansion. Every comparison that *fails* costs O(1) and stops that iteration's expansion (bounded: at most 1 extra failed comparison per iteration, since expansion stops at the first mismatch). Every comparison that *succeeds and extends past the current* `R` increases `Φ` by 1 - and `Φ` can increase at most `n` times total across the whole run (bounded by the string length). Comparisons that succeed *within* the already-known mirrored region are **not new work** - they're skipped because the seed already accounts for them (the algorithm does not re-verify positions strictly inside the mirror bound; it starts expanding from the seed, not from 0). Summing: O(n) seed-setup work + O(n) total boundary-extending comparisons + O(n) total failed final comparisons = **O(n)** total.

**Space:** O(n) for the transformed string `t` and the radius array `P[]`.

## Constraints & approach

| Input size | Task | Reach for |
|---|---|---|
| `n ≤ 10³` | longest palindromic substring, one query | O(n²) expand-around-center is fine, simpler to write correctly under time pressure |
| `n ≤ 10⁵`–`10⁷`, one query | longest palindromic substring | **Manacher's, O(n)** - the DP alternative is also O(n²) space/time, Manacher's wins on both |
| Need **count** of all palindromic substrings, not just the longest | counting, not extremal | Manacher's `P[]` array directly gives this too: `sum((P[i]+1)//2 for all i)` in the transformed string - same O(n) pass answers both questions |
| Need palindromic substrings under **edits** (one character change allowed) | approximate palindrome | Manacher's does not extend cleanly - reach for a different DP formulation |
| Need to check if a string **can be rearranged** into a palindrome | anagram-of-palindrome, not substring | wrong tool entirely - that's a character-frequency parity check, O(n), no Manacher's needed |

The tell: "longest/all palindromic substring(s) of a fixed string, one pass, `n` large enough that O(n²) risks TLE" → Manacher's. Anything about *rearranging* characters or *approximate* palindromes is off this algorithm.

## When to use / when not

**Reach for Manacher's when:**

- You need the longest palindromic substring (or all palindrome radii) in **O(n)**, and `n` is large enough (`10^5`+) that O(n²) DP or expand-around-center risks timing out.
- You need palindrome radii at **every** center for a downstream computation (e.g., counting all palindromic substrings, or as a subroutine in a larger string algorithm).

**Reach for something else when:**

- `n` is small (`≤ 10^3`) and you want the simplest-to-write-correctly solution under interview time pressure → **plain expand-around-center**, O(n²), far less error-prone to implement live.
- You need palindromic **subsequences** (not substrings - characters need not be contiguous) → that's a completely different problem, solved by [DP over intervals](../../dsa/patterns/interval-dp.md) (`dp[i][j]` = longest palindromic subsequence in `s[i..j]`), O(n²) time, no Manacher's applicability at all.
- You need to check if a string is **already** a palindrome (not find one inside it) → a single O(n) two-pointer scan from both ends; Manacher's is overkill.

Real-world: palindrome detection at this scale shows up in **bioinformatics** (finding palindromic sequences in DNA, which mark restriction-enzyme cut sites), and the *technique* (mirror-based reuse of prior computation to avoid redundant scans) generalizes to other "avoid re-deriving what a symmetric/already-solved region already tells you" algorithms, though Manacher's itself is a narrow, purpose-built tool rather than a general workhorse.

## Comparison

| Approach | Time | Space | Handles | Pick it when… |
|---|---|---|---|---|
| **Manacher's** | **O(n)** | O(n) | longest palindromic substring, all-center radii | `n` large, need guaranteed linear time |
| Expand around center | O(n²) worst | O(1) | longest palindromic substring | `n` small, simplest to write correctly live |
| DP (`dp[i][j]` = is `s[i..j]` palindrome) | O(n²) time, O(n²) space | O(n²) | longest palindromic substring, **and** answers arbitrary-range palindrome queries after the table is built | need repeated arbitrary-range "is this a palindrome" queries, not just the longest one - the table itself is the payoff, not the speed |
| Suffix automaton / Eertree (palindromic tree) | O(n) | O(n) | **all distinct** palindromic substrings, not just the longest, with counts | need every distinct palindromic substring (not just the longest), or online insertion |

Manacher's crossover condition: it strictly dominates expand-around-center on asymptotic time once `n` is large enough that O(n²) is a real risk (`n` beyond a few thousand in a tight time limit) - but expand-around-center's O(1) space and much simpler code make it the pragmatic choice for small `n` or under interview pressure where a subtle off-by-one in Manacher's mirror logic is a real risk. The DP table is worth it only when you need many arbitrary-range queries, not just the single longest palindrome - Manacher's doesn't give you that for free.

## Loop/recurrence invariant

The scanning loop maintains a recurrence on `(C, R)` bounded by a monotone potential, structurally the same shape as the two-pointer / sliding-window amortized argument, applied here to a palindrome-boundary rather than a window:

```
for i = 1 to len(t) - 2:
    mirror = 2*C - i
    P[i] = min(P[mirror], R - i)  if i < R else 0     ▷ seed from mirror, capped at boundary
    while t[i + P[i] + 1] == t[i - P[i] - 1]:          ▷ attempt to extend past the seed
        P[i] += 1
    if i + P[i] > R:                                    ▷ new rightmost reach - update center
        C, R = i, i + P[i]
```

**Invariant:** at the top of iteration `i`, `(C, R)` is the center/right-edge of the *best* (furthest-right-reaching) palindrome found among indices `< i`, and every `P[j]` for `j < i` is final and correct. **Base case:** `i = 1` (Just past the leading sentinel), `C = R = 0`, no prior palindrome, seed is trivially 0. **Inductive step:** the mirror-seed argument (proven in [Correctness / invariant](#correctness--invariant)) guarantees `P[i]`'s seed is a valid lower bound; the `while` loop only adds comparisons that either fail immediately (O(1), bounded) or succeed and necessarily push `i + P[i]` past the old `R` (since anything up to the old `R` was already guaranteed by the mirror, not re-verified) - so every successful loop iteration of the `while` strictly increases `R`. **Termination:** after scanning all `len(t)` positions, `R` has been extended at most `len(t)` times total (it's bounded by the string length and only moves forward), bounding total `while`-loop work across the *entire outer loop* to O(n), which is the amortized argument that makes this loop-invariant argument also a complexity proof, not just a correctness one.

## Edge cases

- **Empty string or single character.** `n = 0` → return `""`. `n = 1` → the single character is trivially a palindrome of length 1; the transformed-string machinery still handles this correctly (`t = "#a#"`), but it's worth a guard clause for clarity/speed rather than relying on the general path.
- **All-same-character string (`"aaaaaa"`).** This is the worst case for naive expand-around-center (O(n²)) and the case that most clearly demonstrates Manacher's payoff - every center's radius reaches nearly `n`, and the mirror seeding avoids re-verifying the same matches over and over. A correct Manacher's implementation should be tested against this explicitly.
- **Off-by-one in the sentinel transform / index mapping back.** The transformed string's index `i` maps back to the original string's center via `(i - 1) // 2` (integer division) - getting this wrong silently shifts every reported palindrome by one character. This is the single most common bug in a from-scratch Manacher's implementation; test against a known answer (`"babad"` → `"bab"` or `"aba"`) to catch it.
- **Choice of sentinel character colliding with input alphabet.** If the input string can contain `#` (or whatever separator is chosen) as a real character, the transform corrupts the result. Use a sentinel guaranteed absent from the input's alphabet (or two *distinct* guard sentinels at the very ends, `^...$`, if the alphabet is unconstrained) - a CP-flavored trap when the problem allows arbitrary byte values.
- **Integer index underflow at the mirror computation `2*C - i` when `C` is still 0 early in the scan.** Guard with `if i < R` before using the mirror at all (as in the pseudocode); skipping this check risks reading `P[]` at a negative or otherwise invalid index in a naive implementation.

## Implementation

**Pseudocode (CLRS-style contract):**

```
MANACHER(s)
1   t = TRANSFORM(s)                        ▷ insert sentinels: "abba" -> "#a#b#b#a#"
2   n = t.length
3   let P[0..n-1] be a new array, initialized to 0
4   C = 0
5   R = 0
6   for i = 1 to n − 2
7       if i < R
8           mirror = 2·C − i
9           P[i] = MIN(P[mirror], R − i)
10      while i + P[i] + 1 < n and i − P[i] − 1 ≥ 0 and t[i + P[i] + 1] = t[i − P[i] − 1]
11          P[i] = P[i] + 1
12      if i + P[i] > R
13          C = i
14          R = i + P[i]
15  return P
```

**Python (reference - from scratch, the mechanism):**

```python
def manacher(s: str) -> str:
    """Longest palindromic substring in O(n) via Manacher's algorithm."""
    if not s:
        return ""

    t = "#" + "#".join(s) + "#"
    n = len(t)
    p = [0] * n
    center = right = 0

    for i in range(1, n - 1):
        if i < right:
            mirror = 2 * center - i
            p[i] = min(p[mirror], right - i)

        while i + p[i] + 1 < n and i - p[i] - 1 >= 0 and t[i + p[i] + 1] == t[i - p[i] - 1]:
            p[i] += 1

        if i + p[i] > right:
            center, right = i, i + p[i]

    max_len, center_index = max((length, idx) for idx, length in enumerate(p))
    start = (center_index - max_len) // 2   # map back to original string coordinates
    return s[start:start + max_len]
```

**Contest velocity - counting all palindromic substrings from the same `P[]` array:**

```python
def count_palindromic_substrings(s: str) -> int:
    t = "#" + "#".join(s) + "#"
    n = len(t)
    p = [0] * n
    center = right = 0
    for i in range(1, n - 1):
        if i < right:
            p[i] = min(p[2 * center - i], right - i)
        while i + p[i] + 1 < n and i - p[i] - 1 >= 0 and t[i + p[i] + 1] == t[i - p[i] - 1]:
            p[i] += 1
        if i + p[i] > right:
            center, right = i, i + p[i]
    return sum((radius + 1) // 2 for radius in p)   # each radius contributes (radius+1)//2 real palindromes
```

## What the interviewer probes for

- **"Why does the mirror trick not risk giving a wrong answer?" - because the seed is only a lower bound, always re-verified against the boundary.** The mirrored radius is guaranteed correct *within* the known palindrome region (`[C-(R-C), R]`); the algorithm caps the seed at `R - i` and only *extends* past that with real character comparisons - it never trusts the mirror beyond what's actually been proven.
- **"What's the worst case for plain expand-around-center that Manacher's fixes?" - an all-same-character string.** `"aaaa...a"` makes every one of the `2n-1` centers expand almost to the full string length, giving genuine O(n²) - Manacher's mirror-seeding means most of those centers get their radius for free from an already-verified neighbor.
- **"Could you get the same result with a DP table instead?" - yes, but at O(n²) space, not just O(n²) time.** `dp[i][j] = s[i]==s[j] and dp[i+1][j-1]` correctly finds the longest palindromic substring, and additionally answers arbitrary-range "is `s[i..j]` a palindrome" queries the table already has - a real advantage Manacher's doesn't give you. Manacher's wins specifically when you only need the single longest palindrome and can't afford O(n²) space.

## Practice problems

### 1. Longest Palindromic Substring

**Problem.** Given a string `s`, return the longest substring of `s` that is a palindrome. E.g. `s = "babad"` → `"bab"` or `"aba"` (either is accepted). Constraints: `n ≤ 1000` in the classic LeetCode version, but treat `n` up to `10^5`–`10^6` as the real target to justify Manacher's over O(n²) DP.

**Approach.** Direct application of Manacher's: transform the string with sentinels, run the linear scan maintaining `(C, R)` and the radius array `P[]`, take the max radius and map its center back to the original string's coordinates. This is the algorithm's namesake problem.

```python
def longest_palindrome(s: str) -> str:
    if not s:
        return ""
    t = "#" + "#".join(s) + "#"
    n = len(t)
    p = [0] * n
    center = right = 0
    for i in range(1, n - 1):
        if i < right:
            p[i] = min(p[2 * center - i], right - i)
        while i + p[i] + 1 < n and i - p[i] - 1 >= 0 and t[i + p[i] + 1] == t[i - p[i] - 1]:
            p[i] += 1
        if i + p[i] > right:
            center, right = i, i + p[i]
    max_len, center_index = max((length, idx) for idx, length in enumerate(p))
    start = (center_index - max_len) // 2
    return s[start:start + max_len]
```

**Complexity.** O(n) time, O(n) space.

**Duplicate problems:**
- Longest Palindromic Substring II (multi-query variants on the same string) - same `P[]` array reused across queries once computed.
- Palindromic Substrings Count (LC 647) - same `P[]` array, summed differently (see [contest velocity](#implementation) snippet) instead of maxed.

### 2. Shortest Palindrome (prepend minimum characters)

**Problem.** Given a string `s`, find the shortest palindrome you can form by adding characters **only in front of** `s`. E.g. `s = "aacecaaa"` → `"aaacecaaa"`. Constraints: `n ≤ 5·10⁴`.

**Approach.** The answer only requires finding the **longest palindromic prefix** of `s` - once you know it, the characters after it (reversed) get prepended. Manacher's `P[]` array, restricted to radii **centered such that the palindrome touches index 0**, gives exactly this: find the largest `i` where the palindrome centered at `i` extends all the way to the string's start (`i - P[i] == 0` in transformed coordinates). This is a genuinely different read of the same `P[]` array than problem 1 - extremal-radius-at-a-boundary rather than global-max-radius.

```python
def shortest_palindrome(s: str) -> str:
    if not s:
        return s
    t = "#" + "#".join(s) + "#"
    n = len(t)
    p = [0] * n
    center = right = 0
    for i in range(1, n - 1):
        if i < right:
            p[i] = min(p[2 * center - i], right - i)
        while i + p[i] + 1 < n and i - p[i] - 1 >= 0 and t[i + p[i] + 1] == t[i - p[i] - 1]:
            p[i] += 1
        if i + p[i] > right:
            center, right = i, i + p[i]

    best_prefix_len = 0
    for i in range(n):
        if i - p[i] == 0:                 # palindrome touches the very start
            best_prefix_len = max(best_prefix_len, p[i])

    to_prepend = s[best_prefix_len:][::-1]
    return to_prepend + s
```

**Complexity.** O(n) time, O(n) space.

**Duplicate problems:**
- Shortest Palindrome via KMP failure function - a completely different technique (fail-function on `s + '#' + reverse(s)`) solving the identical problem; useful to know both exist but not a Manacher's duplicate in mechanism, only in problem statement.

### 3. Palindromic Substrings Count with Length Constraint

**Problem.** Given a string `s` and an integer `minLen`, count the number of palindromic substrings with length **at least** `minLen`. Constraints: `n ≤ 10^5`.

**Approach.** Run Manacher's once to get `P[]` (radius at every center in transformed coordinates). For each center, the number of real palindromes centered there with length `≥ minLen` is `max(0, (P[i] - (minLen_transformed - 1)) // 2 + 1)`-shaped arithmetic on the radius, rather than the simple `(radius+1)//2` full count used in problem 1's variant - a constrained-counting read of the same array, distinct from both prior problems' unconstrained max/count.

```python
def count_palindromes_min_length(s: str, min_len: int) -> int:
    t = "#" + "#".join(s) + "#"
    n = len(t)
    p = [0] * n
    center = right = 0
    for i in range(1, n - 1):
        if i < right:
            p[i] = min(p[2 * center - i], right - i)
        while i + p[i] + 1 < n and i - p[i] - 1 >= 0 and t[i + p[i] + 1] == t[i - p[i] - 1]:
            p[i] += 1
        if i + p[i] > right:
            center, right = i, i + p[i]

    total = 0
    for radius in p:
        max_real_len = radius                      # real-length palindromes centered here: 1,3,...,radius (odd steps in transformed len == real len steps of 1)
        count_at_center = max(0, (max_real_len - min_len) // 2 + 1) if max_real_len >= min_len else 0
        total += count_at_center
    return total
```

**Complexity.** O(n) time, O(n) space.

**Duplicate problems:**
- Count Palindromic Substrings within a length range `[minLen, maxLen]` - same per-center arithmetic on `P[]`, bounded on both ends instead of one.
