# Longest Common Subsequence

## Prerequisites

- [Dynamic Programming](./dynamic-programming.md) [Must read] - LCS is the canonical 2D-DP teaching example; you need memo-vs-tabulation, state definition, and the recurrence-as-optimal-substructure argument before this page adds anything new.
- [Recursion](./recursion.md) [Must read] - the brute-force recursive form (branch on match/no-match) is what the DP recurrence collapses; you should be able to write it before caching it.
- [Arrays](../data-structures/array.md) [Must read] - the 2D DP table is a 2D array; row-major fill order and indexing are the whole mechanic.
- [DP Patterns](../patterns/dp-patterns.md) - LCS is one of the recurring 2D-grid DP shapes catalogued there, alongside edit distance and interval DP.

## Table of Contents

- [What it is](#what-it-is)
- [Intuition](#intuition)
- [How it works](#how-it-works)
- [Correctness / invariant](#correctness--invariant)
- [Complexity derivation](#complexity-derivation)
- [Constraints & approach](#constraints--approach)
- [When to use / when not](#when-to-use--when-not)
- [Comparison](#comparison)
- [State & recurrence](#state--recurrence)
- [Edge cases](#edge-cases)
- [Implementation](#implementation)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

## What it is

The **Longest Common Subsequence (LCS)** of two strings is the longest sequence of characters that appears in both, **in the same relative order but not necessarily contiguously** - characters can be skipped on either side.

**Mental model:** picture the two strings written on separate strips of paper; you're allowed to punch holes in either strip (deleting characters) but never reorder what's left. LCS asks for the longest string you can produce by punching holes in *both* strips independently until they read identically. `"ABCBDAB"` and `"BDCABA"` are not equal and share no long contiguous run, yet punching the right holes in each leaves `"BCBA"` (length 4) in both.

> **Takeaway (say it out loud):** "LCS is the classic 2D grid DP - `dp[i][j]` is the LCS length of the first `i` and first `j` characters; match the diagonal, mismatch takes the best of dropping one character from either side."

## Intuition

Think about comparing the last characters of the two prefixes you're currently considering, `A[:i]` and `B[:j]`.

- **If `A[i-1] == B[j-1]`:** that character can always be part of *some* longest common subsequence of the two prefixes - there's no reason to ever throw it away, because keeping it costs nothing and only helps. So the answer is "1 + whatever the best answer was for the prefixes with that character stripped from both sides."
- **If `A[i-1] != B[j-1]`:** at least one of these two trailing characters cannot be in the LCS (they can't both be the last matched character since they differ). So the LCS of `A[:i], B[:j]` is *either* the LCS ignoring `A`'s last character, *or* the LCS ignoring `B`'s last character - whichever is longer. You don't know which side to drop, so you try both and keep the max.

That's the entire idea: at every pair of prefix endpoints, you either get a free extension (characters match) or you're forced to make a binary choice and take the better branch. Because the same `(i, j)` prefix pair recurs across many decision paths in the naive recursion, this is a textbook overlapping-subproblems setup - exactly the shape DP exists for.

## How it works

Trace `A = "ABCBDAB"` (length 7) and `B = "BDCABA"` (length 6). Build `dp[i][j]` = LCS length of `A[:i]` and `B[:j]`, with row `0` and column `0` as the all-zero base case (empty prefix ⇒ LCS length 0).

Fill row by row, left to right. Each cell reads only already-finalized cells above, to the left, or diagonally above-left:

```
          ""   B    D    C    A    B    A
      ┌─────────────────────────────────────
   "" │  0    0    0    0    0    0    0
    A │  0    0    0    0    1    1    1
    B │  0    1    1    1    1    2    2
    C │  0    1    1    2    2    2    2
    B │  0    1    1    2    2    3    3
    D │  0    1    2    2    2    3    3
    A │  0    1    2    2    3    3    4
    B │  0    1    2    2    3    4    4
```

Row/column headers are `""` then each string's characters (`A` down the rows, `B` across the columns). `dp[7][6] = 4` in the bottom-right corner: the LCS length is **4**.

Backtrack from `dp[7][6]` to recover the actual subsequence - at each cell, if the corresponding characters match (`A[i-1] == B[j-1]`), step diagonally to `(i-1, j-1)` and record that character; otherwise step to whichever of `(i-1, j)` (`up`) or `(i, j-1)` (`left`) holds the larger (or equal) value:

```
          ""   B    D    C    A    B    A
      ┌─────────────────────────────────────
   "" │  0    0    0    0    0    0    0
    A │  0    0    0    0    1    1    1
    B │  0    1    1    1    1    2    2
    C │  0    1    1    2    2    2    2
    B │  0    1    1 ←2    2    2    2
    D │  0    1    2    2    2    3    3
    A │  0    1    2    2 ↖3 ←  3    3
    B │  0    1    2    2    3 ↖4 ←  4
                              ↑         ↖(start: dp[7][6]=4)
```

The actual walk, cell by cell from `(i=7, j=6)` back to the top-left, verified against the recurrence:

| Step | Cell `(i, j)` | `A[i-1]` vs `B[j-1]` | Move | Character recorded |
| --- | --- | --- | --- | --- |
| 1 | `(7, 6)` | `A[6]='B'` vs `B[5]='A'` - mismatch | `up` → `(6, 6)` | - |
| 2 | `(6, 6)` | `A[5]='A'` vs `B[5]='A'` - **match** | `diag` → `(5, 5)` | `A` |
| 3 | `(5, 5)` | `A[4]='D'` vs `B[4]='B'` - mismatch | `up` → `(4, 5)` | - |
| 4 | `(4, 5)` | `A[3]='B'` vs `B[4]='B'` - **match** | `diag` → `(3, 4)` | `B` |
| 5 | `(3, 4)` | `A[2]='C'` vs `B[3]='A'` - mismatch | `left` → `(3, 3)` | - |
| 6 | `(3, 3)` | `A[2]='C'` vs `B[2]='C'` - **match** | `diag` → `(2, 2)` | `C` |
| 7 | `(2, 2)` | `A[1]='B'` vs `B[1]='D'` - mismatch | `left` → `(2, 1)` | - |
| 8 | `(2, 1)` | `A[1]='B'` vs `B[0]='B'` - **match** | `diag` → `(1, 0)` | `B` |

Loop ends (`j = 0`). Matched characters collected in reverse-walk order are `A, B, C, B` - reverse them to get forward order: **`"BCBA"`**, length 4, matching the corner value `dp[7][6] = 4`. (Ties in the backtrack - a cell where `dp[i-1][j] == dp[i][j-1]` - mean either direction is valid and there can be more than one distinct LCS of the same length; see Edge cases.)

## Correctness / invariant

**Claim:** for every `0 ≤ i ≤ n`, `0 ≤ j ≤ m`, `dp[i][j]` equals the length of the longest common subsequence of `A[0..i)` and `B[0..j)` (the first `i` and first `j` characters).

**Proof by strong induction on `i + j`.**

*Base case:* `i = 0` or `j = 0` means one prefix is empty, so no common subsequence can have positive length - `dp[i][0] = dp[0][j] = 0`. Correct by definition.

*Inductive step:* assume the claim holds for all `(i', j')` with `i' + j' < i + j`. Consider `dp[i][j]`, comparing `A[i-1]` and `B[j-1]`:

- **Case `A[i-1] == B[j-1]`:** Let `L` be any LCS of `A[:i], B[:j]`. If `L` doesn't end by matching this shared character, we can always modify `L` to include it: since the character exists at the end of both prefixes, appending it to the LCS of `A[:i-1], B[:j-1]` (which is optimal by the inductive hypothesis) yields a common subsequence of length `dp[i-1][j-1] + 1`, and no longer LCS can exist (any common subsequence of `A[:i], B[:j]` restricted to before this matched pair is a common subsequence of the smaller prefixes, bounded by `dp[i-1][j-1]`). So `dp[i][j] = dp[i-1][j-1] + 1` is exactly the optimum. ✓.
- **Case `A[i-1] != B[j-1]`:** the LCS of `A[:i], B[:j]` cannot use *both* `A[i-1]` and `B[j-1]` as its final matched character (they're different characters). So either the LCS doesn't use `A[i-1]` at all - in which case it's a common subsequence of `A[:i-1], B[:j]`, bounded by `dp[i-1][j]` (optimal by hypothesis) - or it doesn't use `B[j-1]`, bounded by `dp[i][j-1]`. The true optimum is the better of these two mutually exhaustive cases, so `dp[i][j] = max(dp[i-1][j], dp[i][j-1])`. ✓.

Since every dependency `(i-1, j-1)`, `(i-1, j)`, `(i, j-1)` has a strictly smaller `i + j`, the induction is well-founded and a row-major (or any order respecting `i` then `j` increasing) fill guarantees every read is already finalized. This is the same DAG-of-states argument from [Dynamic Programming › Correctness](./dynamic-programming.md#correctness--invariant), specialized to a 2D grid instead of a 1D line.

## Complexity derivation

**States:** the table has `(n+1) × (m+1)` cells, one per prefix pair `(i, j)`. **Transition cost:** each cell does O(1) work - one character comparison and either one addition or one max of two lookups. By the DP master formula (`states × transition cost`):

**Time: O(n·m). Space: O(n·m)** for the full table.

**Space optimization to O(min(n, m)).** `dp[i][j]` only ever reads row `i-1` (never row `i-2` or earlier) and column `j-1` within the current/previous row. So if you only need the *length*, you don't need the full table - keep two rows (or one row plus a rolling scalar for the diagonal) and roll forward, always iterating over the *shorter* string as the inner dimension to bound the row length: `O(min(n, m))` space, same `O(n·m)` time.

**The senior-depth trade-off, named explicitly:** rolling the rows **destroys the backtrack path**. Reconstructing the actual subsequence (not just its length) requires walking backward through `dp[i-1][j-1]`, `dp[i-1][j]`, `dp[i][j-1]` - cells that, under the rolled-row optimization, have already been overwritten by the time you'd want to walk back. If you need both `O(min(n,m))` space *and* the reconstructed string, you need extra bookkeeping: either (a) **Hirschberg's algorithm**, which recursively splits the problem using a forward pass from one end and a backward pass from the other to find the midpoint of the LCS in `O(n·m)` time but only `O(min(n,m))` space, recursing on halves - the space-optimal reconstruction technique - or (b) store direction bits alongside a rolled table and accept that only the length is truly free; full reconstruction with O(min(n,m)) space genuinely costs more machinery, not less. **This is exactly the probe interviewers use to separate "knows the DP" from "understands the trade-off."**

**Cache behavior:** the table fill is a sequential scan of a flat 2D array in row-major order - each row read/write is contiguous, so it's cache-friendly (unlike, say, a pointer-chasing tree DP). The rolled-row version is friendlier still: two rows of length `O(min(n,m))` fit in L1/L2 far more often than the full `O(n·m)` table for large inputs.

## Constraints & approach

| Input size (`n`, `m` = string lengths) | Expected complexity | Approach |
| --- | --- | --- |
| `n, m ≤ 1000` | `O(n·m)` ≈ `10^6` | Full 2D DP table, length + reconstruction both fine. |
| `n, m ≤ 5000` | `O(n·m)` ≈ `2.5×10^7` | Standard 2D DP still comfortable; roll to `O(min(n,m))` space if memory-constrained and only the length is needed. |
| `n, m ≤ 10^4`–`10^5`, only length needed | `O(n·m)` may be `10^9`–`10^10` - too slow | Reconsider: if one string is far shorter, `O(n·m)` may still be fine (bounded by the smaller dimension in practice for some variants) - otherwise this constraint usually signals a *different* problem (bounded alphabet, or LCS isn't actually required, e.g. only a similarity threshold). |
| `n, m` very large (genome-scale, `10^6`+) | Sub-quadratic needed | **Hunt-Szymanski algorithm** - when the alphabet is such that matching-position pairs are sparse, reduces to an LIS-style problem over match positions, `O((r + n) log n)` where `r` = number of matching pairs; or **hashing/k-mer** based approximate alignment (as used in real bioinformatics tools like BLAST) trades exactness for speed. Mention only as an aside - don't over-build unless the constraint explicitly demands it. |

The rule of thumb: `n·m` up to roughly `10^7`-`10^8` is the safe zone for a contest/interview 2D DP. Beyond that, the constraint is telling you either the intended solution isn't plain LCS DP, or it wants an approximate/heuristic alignment method instead.

## When to use / when not

**Reach for LCS when** the problem compares **two sequences** and asks for the longest **order-preserving, not-necessarily-contiguous** shared structure - phrases like "longest common subsequence", "minimum deletions to make two strings equal" (= `n + m - 2·LCS`), or "interleaving/alignment of two sequences."

**Prefer an alternative when:**

- The match must be **contiguous** → **Longest Common Substring**, a different (simpler) DP - see Comparison below.
- Substitutions are allowed, not just insertions/deletions → **[Edit Distance](./dynamic-programming.md#practice-problems)** (Levenshtein) generalizes LCS by adding a replace operation with its own cost.
- You only have **one sequence** and want the longest strictly-increasing run within it, not a match against a second sequence → **[Longest Increasing Subsequence](./longest-increasing-subsequence.md)** is a different problem (single array, no second string) but there's a neat reduction: `LIS(A) = LCS(A, sorted(dedup(A)))` - sort and dedupe `A` to get `B`, then the LCS of `A` and `B` is exactly the LIS of `A`. It's rarely the efficient way to *solve* LIS (LIS has its own `O(n log n)` patience-sorting method), but it's a genuinely useful mental bridge between the two DP shapes.

**Real system:** `diff`/`git diff` compute a line-based LCS to show minimal add/remove hunks between file versions; bioinformatics tools (Needleman-Wunsch style global alignment) use an LCS/edit-distance variant to align DNA/protein sequences; plagiarism detectors and code-similarity tools use LCS-style alignment to find copied structure despite reordering/insertions; spell-checkers and autocorrect use LCS or edit-distance as a similarity/distance measure between a typo and dictionary words. **At scale**, comparing very large documents or whole genomes with plain `O(n·m)` DP becomes infeasible (a `10^6`-character genome pair would need `10^12` cells) - production diff/alignment tools switch to Hunt-Szymanski, Myers' O(ND) diff algorithm, or heuristic seed-and-extend (BLAST-style) methods that exploit sparsity or approximate the answer.

## Comparison

| Approach | Time | Space | Key distinction |
| --- | --- | --- | --- |
| **LCS** | `O(n·m)` | `O(n·m)` (rollable to `O(min(n,m))`, loses reconstruction) | Subsequence (order preserved, gaps allowed); only insert/delete, no substitution. |
| **Edit Distance (Levenshtein)** | `O(n·m)` | `O(n·m)` (rollable) | Adds a **substitution** operation with its own cost - `dp[i][j] = 1 + min(insert, delete, replace)` on mismatch, vs LCS's `max` (no replace, no cost model). `n + m - 2·LCS` gives the insert/delete-only edit distance as a special case. |
| **Longest Common Substring** | `O(n·m)` | `O(n·m)` (rollable to `O(min(n,m))`) | Must be **contiguous** in both strings. Different recurrence: on mismatch the cell **resets to 0** (`dp[i][j] = 0` if `A[i-1] != B[j-1]`) rather than taking a max of neighbors - a single broken match kills the run entirely. Answer is the **max cell value anywhere in the table**, not the corner. |
| **LIS (single-sequence analog)** | `O(n log n)` (patience sorting) | `O(n)` | Operates on **one** array, not two strings; "increasing" is a value-order constraint, not a match-against-a-second-sequence constraint. Reducible to LCS via `LCS(A, sorted(dedup(A)))` but has its own faster direct algorithm. |

## State & recurrence

> Family: **Recursive/build** - LCS is fully specified by its state, base case, recurrence, and fill order, exactly like every DP in this family.

**1. State.** `dp[i][j]` = the length of the longest common subsequence of `A`'s first `i` characters and `B`'s first `j` characters (`A[0..i)`, `B[0..j)`). Two indices are necessary and sufficient - you need to know exactly how much of *each* string has been consumed, because future matches depend on both remaining suffixes independently. A single index (just "how far into `A`") would conflate genuinely different subproblems.

**2. Base case.** `dp[0][j] = 0` for all `j`, and `dp[i][0] = 0` for all `i` - an empty prefix on either side means the common subsequence is necessarily empty. This is the entire first row and first column of the table, all zeros.

**3. Recurrence.**

```
             ⎧ dp[i-1][j-1] + 1              if A[i-1] == B[j-1]   (match: extend the diagonal)
dp[i][j]  =  ⎨
             ⎩ max(dp[i-1][j], dp[i][j-1])    if A[i-1] != B[j-1]   (no match: best of dropping from either side)
```

**4. Fill order.** Any order that finalizes `(i-1, j-1)`, `(i-1, j)`, `(i, j-1)` before `(i, j)` - simplest is row-major: `i` from `1` to `n`, and for each `i`, `j` from `1` to `m`.

**Memo vs tabulation.** Top-down: recurse on `(i, j)`, branch on the character comparison, `@lru_cache` (or a dict) on `(i, j)` to avoid recomputation - visits only the reachable `(i, j)` pairs, which for LCS is usually the *entire* table anyway (nearly every prefix pair is reachable from `(n, m)` by *some* path of match/no-match decisions), so memoization rarely beats tabulation here on states-visited. Bottom-up: fill the grid row by row - no recursion overhead, no stack-depth risk on long strings (Python's default recursion limit is a real concern for `n, m` in the thousands), and it's what enables the row-rolling space optimization directly. **For LCS specifically, tabulation is the default choice** precisely because nearly all states are reachable and long strings make recursion depth a genuine risk.

**State-space size.** `O(n·m)` cells for the full table; collapses to `O(min(n, m))` rolling rows when only the length is needed (see Complexity derivation for the reconstruction trade-off this optimization costs).

## Edge cases

- **One or both strings empty:** `LCS("", anything) = 0`. Falls straight out of the base case - no special-casing needed if the table is sized `(n+1) × (m+1)` and row/column 0 are seeded to 0.
- **No common characters at all** (e.g. `"abc"` vs `"xyz"`): every cell stays 0 except it never leaves 0 - `dp[n][m] = 0`, correctly signaling no common subsequence exists beyond the empty one.
- **One string fully contains the other as a subsequence** (e.g. `A = "abcde"`, `B = "ace"`): `dp[n][m] = len(B) = 3` - the shorter string *is* the LCS. Sanity check: LCS length can never exceed `min(n, m)`.
- **Duplicate characters causing multiple valid LCS of the same length:** e.g. `A = "AABC"`, `B = "ABAC"` can have more than one length-3 common subsequence (`"AAC"` and `"ABC"` are both valid depending on which occurrence you match). The DP length is unique and correct, but the **backtrack path is not unique** - at a mismatch cell where `dp[i-1][j] == dp[i][j-1]`, either direction is a valid reconstruction; a single backtrack only recovers *one* of possibly several LCS strings of that length. If the problem needs "count all distinct LCS" or "list them", that's a different (harder) counting variant, not plain reconstruction.
- **CP-flavored trap - the 1-indexed table vs 0-indexed strings off-by-one:** `dp` is conventionally sized `(n+1) × (m+1)` and indexed `1..n`, `1..m`, but the strings themselves are 0-indexed. The recurrence compares `A[i-1]` and `B[j-1]`, **not** `A[i]` and `B[j]` - forgetting the `-1` shift is the single most common bug in a from-scratch LCS implementation, and it silently produces a plausible-looking but wrong table (often off by exactly one row/column, sometimes crashing with an index-out-of-range on the last character instead).
- **Common misconception:** "LCS is the same as Longest Common Substring, just with a friendlier name" - it is not; substring requires contiguity and uses a completely different recurrence (reset-to-0 on mismatch, answer is the table max, not the corner). Conflating the two is the most common wrong-mental-model bug candidates bring into an LCS interview question.

## Implementation

**Pseudocode (CLRS-style) - build the table and reconstruct the subsequence:**

```
LCS-LENGTH(A, B)
n ← length(A)
m ← length(B)
let dp[0..n, 0..m] be a new table
for i ← 0 to n
    dp[i, 0] ← 0                              ▷ base case: empty B-prefix
for j ← 0 to m
    dp[0, j] ← 0                              ▷ base case: empty A-prefix
for i ← 1 to n
    for j ← 1 to m
        if A[i] = B[j]
            dp[i, j] ← dp[i-1, j-1] + 1        ▷ match: extend the diagonal
        else
            dp[i, j] ← max(dp[i-1, j], dp[i, j-1])   ▷ no match: best of dropping either side
return dp

LCS-RECONSTRUCT(A, B, dp)
i ← length(A)
j ← length(B)
let result be an empty stack
while i > 0 and j > 0
    if A[i] = B[j]
        push(result, A[i])                    ▷ matched character belongs to the LCS
        i ← i - 1
        j ← j - 1
    elseif dp[i-1, j] ≥ dp[i, j-1]
        i ← i - 1                             ▷ follow the neighbor that preserved the value
    else
        j ← j - 1
return pop-all(result)                        ▷ reverse order of the walk = forward order of the LCS
```

**Python - from scratch, builds the table and reconstructs the string:**

```python
def lcs(a: str, b: str) -> tuple[int, str]:
    """Returns (lcs_length, one_valid_lcs_string)."""
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

    # Backtrack from the bottom-right corner to reconstruct the subsequence.
    i, j = n, m
    chars: list[str] = []
    while i > 0 and j > 0:
        if a[i - 1] == b[j - 1]:
            chars.append(a[i - 1])
            i, j = i - 1, j - 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1
        else:
            j -= 1

    return dp[n][m], "".join(reversed(chars))


def lcs_length_rolled(a: str, b: str) -> int:
    """O(min(n, m)) space - length only, reconstruction is NOT possible from this alone."""
    if len(a) < len(b):
        a, b = b, a  # inner dimension iterates over the shorter string
    m = len(b)
    prev = [0] * (m + 1)
    for i in range(1, len(a) + 1):
        curr = [0] * (m + 1)
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                curr[j] = prev[j - 1] + 1
            else:
                curr[j] = max(prev[j], curr[j - 1])
        prev = curr
    return prev[m]
```

The pseudocode is the contract (`1..n` bounds, `▷` comments, explicit stack push/pop for reconstruction); the Python is the reference (list comprehensions for the table, tuple return, idiomatic reversed-list join). They intentionally look different - the pseudocode couldn't be pasted as valid Python (no `for i ← 1 to n`, no `let ... be a new table` in Python syntax).

## What the interviewer probes for

- **"Can you reduce space to O(min(n, m))?"** - Yes: `dp[i][j]` only depends on the previous row and the current row's left neighbor, so keep two 1D arrays (or one array updated carefully) sized to the shorter string's length, rolling forward row by row. See `lcs_length_rolled` above.
- **"How would you reconstruct the actual subsequence, not just the length, under the space-optimized version?"** - You can't, directly - the rolled version has already discarded the rows you'd need to walk back through. Two real options: (1) **Hirschberg's algorithm** - recursively find the LCS midpoint using one forward DP pass and one backward DP pass (each `O(min(n,m))` space), splitting the problem in half and recursing, achieving `O(n·m)` time with `O(min(n,m))` space *and* full reconstruction; (2) keep the full `O(n·m)` table (or direction bits) if memory allows and only optimize space when reconstruction genuinely isn't needed. Naming Hirschberg's algorithm by name is the senior signal here.
- **"How does this differ from Longest Common Substring?"** - Substring requires the match to be **contiguous** in both strings; the recurrence resets to 0 on any mismatch (`dp[i][j] = 0` if characters differ) instead of taking a max of neighbors, and the answer is the **maximum value anywhere in the table**, not necessarily the bottom-right corner. LCS tolerates gaps; substring does not.
- **"What if you needed to allow substitutions too?"** - That's Edit Distance (Levenshtein): add a `1 + dp[i-1][j-1]` "replace" option to the mismatch case, and the base cases become `dp[i][0] = i`, `dp[0][j] = j` (cost of inserting/deleting the whole prefix) instead of 0. LCS is edit distance restricted to insert/delete only.
- **"What's the time complexity if the alphabet is small / one string is much shorter than the other?"** - The straightforward DP stays `O(n·m)` regardless of alphabet size. If the *number of matching position pairs* is small relative to `n·m` (common with large alphabets or low character reuse), Hunt-Szymanski reformulates the problem as an LIS over match positions, potentially much faster in practice - worth mentioning as the "I know when plain DP isn't the ceiling" answer.

## Practice problems

### 1. Longest Common Subsequence (LC 1143)

**Problem.** Given two strings `text1` and `text2`, return the length of their longest common subsequence, or 0 if none exists. Constraints: `1 ≤ text1.length, text2.length ≤ 1000` - squarely in the `O(n·m)` comfort zone.

**Approach.** This is the article's core algorithm verbatim: build `dp[i][j]` over both prefixes, match extends the diagonal, mismatch takes the max of dropping a character from either side. No reconstruction needed here, just the length, so the rolled `O(min(n,m))` space version is the efficient submission.

```python
def longest_common_subsequence(text1: str, text2: str) -> int:
    if len(text1) < len(text2):
        text1, text2 = text2, text1
    m = len(text2)
    prev = [0] * (m + 1)
    for ch1 in text1:
        curr = [0] * (m + 1)
        for j, ch2 in enumerate(text2, start=1):
            curr[j] = prev[j - 1] + 1 if ch1 == ch2 else max(prev[j], curr[j - 1])
        prev = curr
    return prev[m]
```

**Complexity.** `O(n·m)` time, `O(min(n, m))` space.

**Duplicate problems:**
- Uncrossed Lines (LC 1035) - identical problem restated as non-crossing connecting lines between two arrays; same LCS DP with numbers instead of characters.

### 2. Edit Distance (LC 72)

**Problem.** Given two strings `word1` and `word2`, return the minimum number of insert/delete/replace operations to convert `word1` into `word2`. Constraints: `0 ≤ word1.length, word2.length ≤ 500`.

**Approach.** The sibling problem to LCS in the same 2D-DP family: same state `dp[i][j]`, but the mismatch case gets a third option (`1 + dp[i-1][j-1]` for substitution) alongside insert/delete, and the base cases are `i`/`j` (cost of inserting or deleting an entire empty-matched prefix) instead of 0. Seeing both problems side by side is the fastest way to internalize what LCS's `max`-only recurrence is missing relative to full edit distance.

```python
def min_distance(word1: str, word2: str) -> int:
    n, m = len(word1), len(word2)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[n][m]
```

**Complexity.** `O(n·m)` time, `O(n·m)` space (rollable to `O(min(n,m))`).

**Duplicate problems:**
- One Edit Distance (LC 161) - checks if edit distance is exactly ≤ 1 without the full DP; same underlying mechanic at a tiny fixed bound.

### 3. Delete Operation for Two Strings (LC 583)

**Problem.** Given two strings `word1` and `word2`, return the minimum number of deletions (from either string) needed to make them equal. Constraints: `1 ≤ word1.length, word2.length ≤ 500`.

**Approach.** This is LCS wearing a different hat: the minimum deletions to equalize two strings is exactly `n + m - 2·LCS(word1, word2)` - keep the LCS untouched in both strings, delete everything else. Recognizing this reduction (rather than inventing a new DP) is the "distinct technique" this problem tests: transfer, not re-derivation.

```python
def min_distance_delete_only(word1: str, word2: str) -> int:
    n, m = len(word1), len(word2)
    if n < m:
        word1, word2, n, m = word2, word1, m, n
    prev = [0] * (m + 1)
    for ch1 in word1:
        curr = [0] * (m + 1)
        for j, ch2 in enumerate(word2, start=1):
            curr[j] = prev[j - 1] + 1 if ch1 == ch2 else max(prev[j], curr[j - 1])
        prev = curr
    lcs_len = prev[m]
    return n + m - 2 * lcs_len
```

**Complexity.** `O(n·m)` time, `O(min(n, m))` space.

**Duplicate problems:**
- Shortest Common Supersequence (LC 1092) - same LCS core, but reconstructs the actual shortest supersequence string (`n + m - LCS` length) instead of just counting deletions; requires the full reconstruction backtrack, not just the length.
- Minimum ASCII Delete Sum for Two Strings (LC 712) - weighted variant of the same deletion idea, where cost is character ASCII value instead of a flat 1 per deletion; same recurrence shape with a weighted base case.

