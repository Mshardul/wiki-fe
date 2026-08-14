# Backtracking

## Prerequisites

- [Backtracking (algorithm)](../algorithms/backtracking.md) [Must read]
- [Recursion](../algorithms/recursion.md) [Must read]
- [Depth-First Search](../algorithms/dfs.md) [Should read]
- [Subsets & Permutations](./subsets-permutations.md) [Should read]

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [Recognition signals](#recognition-signals)
- [How it works](#how-it-works)
- [Complexity](#complexity)
- [Constraints & approach](#constraints--approach)
- [Variations](#variations)
- [Pitfalls](#pitfalls)
- [First 30 seconds](#first-30-seconds)
- [Related](#related)
- [Practice problems](#practice-problems)
  - [N-Queens](#1-n-queens---constraint-checks--symmetry)
  - [Sudoku Solver](#2-sudoku-solver---constraint-propagation--mrv)
  - [Combination Sum](#3-combination-sum---reuse-with-a-start-index)
  - [Restore IP Addresses](#4-restore-ip-addresses---bounded-segment-partition)
  - [Word Break II](#5-word-break-ii---backtracking--memoization)
  - [Palindrome Partitioning](#6-palindrome-partitioning---predicate-gated-cut)
  - [Partition to K Equal Sum Subsets](#7-partition-to-k-equal-sum-subsets)
  - [Closest Subsequence Sum](#8-closest-subsequence-sum)

## What it is

**Backtracking** is the pattern for problems that ask you to **build a solution incrementally**, one choice at a time, and **abandon a partial solution the instant it can't possibly lead to a valid full one** - then undo the last choice and try the next. It's a depth-first walk of an implicit **decision tree**, with pruning: you never expand a branch you can already prove is dead.

Mental model: **exploring a maze with a ball of string.** At each junction you pick a corridor and unspool string; when you hit a dead end you reel the string back to the last junction and try a different corridor. The string is your undo log - the "un-choose" step that lets one recursion explore exponentially many configurations without losing its place.

> **Takeaway (say this out loud):** "This is backtracking - choose, explore, un-choose. I'm walking a decision tree depth-first and pruning any branch that violates a constraint before it grows."

## Recognition signals

**(a) Trigger phrases** - literal snippets that should fire this pattern:

- "find **all** valid …" / "generate **all** combinations / arrangements / placements that satisfy …"
- "is there a way to **place / assign / partition** … such that **no two** … conflict"
- "**how many** ways to … subject to constraints" (when you must enumerate, not count via formula/DP)
- "fill the grid / board so that every row/column/region …" (Sudoku, N-Queens, crosswords)
- "split the string into valid segments" / "partition into pieces each of which …"

**(b) Structural cues** - independent of wording:

- The output is a **sequence of decisions** (which item, which cell, which cut), and a candidate is valid only if **every** decision is consistent with the others.
- The search space is **exponential** (`bᵈ` - branching `b`, depth `d`), but **most branches die early** to constraints - so pruning, not raw enumeration, is what makes it tractable.
- There's a clear **partial-solution validity test** you can apply _before_ a candidate is complete (the prune predicate).
- Small input bounds (`n ≤ ~15–20`, board ≤ 9×9) - the constraint signature that says "exponential search is intended."

**(c) Not to be confused with:**

- **Dynamic programming** - DP applies when subproblems **overlap and you only need an optimum or a count**; backtracking applies when you must **enumerate actual configurations** or the state can't be memoized cheaply. **The decisive test: does the answer depend only on a small canonical _state_, or on the full _path_ taken to reach it?** If two different partial paths reaching the same state have identical futures (count of completions, best value) - the state is memoizable, it's DP. If the path itself is the output, or the validity of the next choice depends on the whole history (which exact queens are placed, not just how many) - it's backtracking. "Number of ways to climb stairs" collapses to a state (DP); "list every distinct climb" does not (backtracking). Many problems admit both; the question "is my future a function of state alone?" decides it, and the input bound confirms (`n ≤ 20` → exponential is affordable → backtracking; `n` large with overlap → memoize).
- **[Subsets & Permutations](./subsets-permutations.md)** - that's the _unconstrained enumeration_ special case (every branch is valid, no pruning). Plain backtracking adds a **prune predicate**; if there's no constraint to prune on, you're really doing subset/permutation generation.
- **Greedy** - greedy commits to one choice and never reconsiders; backtracking _reconsiders_ by undoing. If a single locally-best choice provably works, it's greedy, not backtracking.

## How it works

The mechanic is **choose → explore → un-choose**, recursing over the decision tree. At each node: try every candidate choice; for each, _make_ it (mutate shared state), _recurse_ to the next decision, then _undo_ it (restore state) before trying the next candidate. A **prune** check at the top of each call kills dead branches before they expand.

```
decision tree for "place items with a constraint", branching ≤ 3:

                      [ ] start, no choices made
                   /        |        \
              choose A   choose B   choose C
                /            |          ✗ prune (C violates constraint)
          [A]              [B]
         /   \            /   \
    +B (ok) +C(prune)  +A(ok) +C(ok)
      /                  |        \
   [A,B] ✓ emit       [B,A]✓    [B,C]✓ emit
      |                            |
   un-choose B  ◀── reel back ──▶ un-choose C
   (try next candidate at this level)

  ✓ = complete valid solution, recorded
  ✗ = pruned: never expanded, the whole subtree is skipped
```

The pruned `C` subtree is the entire point: without the prune predicate this is brute-force enumeration of every leaf; _with_ it, whole exponential subtrees vanish the moment a partial solution is provably dead. The depth-first order means only **one root-to-current path** of state is live at a time - that's why the space is O(depth), not O(number of solutions). The procedure-level correctness (why the undo restores state exactly, why every solution is reached once) lives in the [backtracking algorithm](../algorithms/backtracking.md#correctness--invariant) page.

This choose/explore/un-choose-with-pruning frame is the engine of real **constraint-satisfaction solvers** - SAT solvers (DPLL, the backbone of hardware verification and dependency resolvers like `apt`/`pip`) are backtracking with unit-propagation as the prune, and regex backtracking engines (PCRE, Python's `re`) walk exactly this decision tree over match alternatives - which is why a pathological pattern can trigger catastrophic exponential backtracking.

## Complexity

- **Time: O(b^d · c)** in the worst case - branching factor `b`, depth `d` (decisions), `c` = cost of the validity check + recording per node. This is the size of the explored tree; **pruning shrinks the effective `b^d` dramatically** but doesn't change the worst-case bound (an adversarial input prunes nothing). For permutations `b·d ≈ n!`; for subsets `2ⁿ`; for a k-ary grid `kᶜᵉˡˡˢ`.
- **Space: O(d)** for the recursion stack + the live `path` - proportional to the **depth**, not the number of solutions. Add O(total output size) if you store every solution. This O(depth) footprint is backtracking's quiet advantage over generating-then-filtering.

The honest senior point: backtracking's stated complexity is exponential, and that's _fine_ when the constraints cap `n` small (the [Constraints & approach](#constraints--approach) bounds). The art is making the prune predicate cheap and early so the _actual_ tree explored is a tiny fraction of `b^d`.

## Constraints & approach

The input bound is the loudest signal that exponential search is intended - and which exponential.

| Input size / shape              | Reach for                          | Why the constraint says so                                                                                  |
| ------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `n ≤ ~10`                       | backtracking, even `O(n!)`         | `10! ≈ 3.6M` - full permutation search runs in time; the tiny bound _invites_ exhaustive exploration.       |
| `n ≤ ~20`                       | backtracking `O(2ⁿ)`, or bitmask DP | `2²⁰ ≈ 10⁶`; subset/placement search fits. Past ~22, pure backtracking risks TLE → add memo or meet-in-middle. |
| `n ≤ ~40`, subset/sum search    | **meet-in-the-middle**, `O(2^(n/2))` | `2⁴⁰` is infeasible but `2²⁰` per half is instant - split, enumerate each half by backtracking, combine. The exact bound that says "backtracking, but only on half." |
| board ≤ 9×9 (Sudoku), N ≤ ~12   | backtracking + strong pruning      | The branching is large but constraints kill most branches; MRV / forward-checking make it instant.          |
| "count the ways", `n` large     | **off** backtracking → **DP**      | If you only need a count or an optimum and subproblems overlap, enumerating every configuration is wasteful → memoize. |
| "find one / any valid"          | backtracking, return on first hit  | No need to enumerate all - short-circuit the recursion the moment one solution completes.                    |
| `n ≤ 10⁵` and "all subarrays/…" | **off** backtracking → linear/2-ptr | A large bound _rules out_ exponential search; the intended solution is polynomial (sliding window, DP, greedy). |

The senior reading: **a small `n` (≤ ~20) next to "find all / place / partition / satisfy" is the backtracking tell.** A large `n` with the same words means the problem wants a polynomial reformulation, not exhaustive search - the constraint is pushing you _off_ this pattern.

## Variations

- **Find-one vs find-all** - return a boolean and short-circuit on the first complete solution (Sudoku: "solve it"), versus collecting every solution (N-Queens: "all distinct boards"). The frame is identical; only the record/return step changes.
- **Constraint propagation** - beyond the local prune, _deduce_ forced values and shrink future candidates (Sudoku: a cell with one legal value is filled immediately). Turns a slow search fast.
- **Ordering heuristics (MRV / LCV)** - choose the **most-constrained variable next** (fewest legal candidates) to fail fast and prune more; pick the **least-constraining value** to keep options open. Reorders the tree so dead branches die sooner.
- **Iterative deepening** - bound the depth and increase it, when solutions are shallow and the tree is infinite/huge (game search, word ladders).
- **Backtracking + memoization** - when partial states recur, cache them; this is the bridge to DP (e.g. word-break with memo).

## Pitfalls

- **Forgetting to un-choose (asymmetric make/unmake).** The single most common backtracking bug: you mutate shared state going down but don't restore it coming up, so sibling branches inherit a polluted state and emit garbage. Every `make_choice` needs an exactly-mirroring `unmake_choice`; verify the state is byte-for-byte restored after the recursive call returns.
- **Recording a reference instead of a snapshot.** Appending the live `path` list to `results` stores a _pointer_ that keeps mutating - every result ends up identical (the final/empty path). Always append a **copy** (`path[:]` / `list(path)`).
- **No prune predicate → brute force.** Omitting `is_valid` turns backtracking into raw enumeration of every leaf; the whole point is to kill dead branches early. If your solution TLEs, the prune is missing, too late, or too weak (move it _before_ the recursive call, make it cheaper).
- **Generating duplicate solutions.** With repeated input elements or unordered choices, the naive tree emits the same configuration multiple times. Fix with a `start` index (combinations) or a "skip equal siblings after sorting" guard (`if i > start and a[i] == a[i-1]: continue`) - see [Subsets & Permutations](./subsets-permutations.md#pitfalls).
- **Using backtracking where DP is intended.** Re-exploring overlapping subproblems exponentially when a memo would make it polynomial. If the same partial state recurs and you only need a count/optimum, you wanted DP (or backtracking + memo).

## First 30 seconds

> "I need to build the answer one decision at a time and I can check validity before it's complete, so this is **backtracking** - DFS over a decision tree with `choose / explore / un-choose`. The branching is exponential but `n` is small (≤ ~20), and I'll **prune** any branch that violates a constraint before recursing. I'll pick the most-constrained choice first to fail fast, snapshot each complete solution, and make sure every make-choice has a mirroring un-choose."

## Related

- **Leans on:** [Backtracking (algorithm)](../algorithms/backtracking.md) (the procedure + proof), [Recursion](../algorithms/recursion.md), [DFS](../algorithms/dfs.md) (backtracking is DFS on an implicit tree).
- **Specialized by:** [Subsets & Permutations](./subsets-permutations.md) - the unconstrained-enumeration instance of this pattern.
- **Bridges to:** [Dynamic Programming](../algorithms/dynamic-programming.md) and [DP Patterns](./dp-patterns.md) when subproblems overlap (backtracking + memo → DP); [Bit Manipulation](../algorithms/bit-manipulation.md) for bitmask state.
- **Sibling decision-tree patterns:** [Tree & Graph Traversal](./tree-graph-traversal.md) (explicit graphs vs backtracking's implicit decision tree).

## Practice problems

### 1. N-Queens - constraint checks + symmetry

**Problem.** Place `N` queens on an `N×N` board so no two share a row, column, or diagonal; return all distinct solutions. Constraints: `N ≤ 9`, so an `O(N!)`-ish search with pruning is intended.

**Worked examples:**
- **Example 1**
  - **Input:** n = 4 | **Output:** [[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]
- **Example 2**
  - **Input:** n = 1 | **Output:** [["Q"]]

**Constraints:** `1 ≤ n ≤ 9`.

**Approach.** Place one queen per row (forces the row constraint for free). Track occupied **columns**, **↘ diagonals** (`row - col`), and **↗ diagonals** (`row + col`) in three sets; a placement is valid iff none of the three is occupied - an O(1) prune. Recurse to the next row, undo on return. The distinct facet: **conflict-set pruning** across three simultaneous constraints, with the diagonal-indexing trick. A further contest-flavored speedup: fix the first queen's column to the left half of the board only (`col < n // 2`) and double the resulting count (or mirror boards for odd `n`'s center column) - this **symmetry-breaking** trick skips exploring every mirror-image solution twice, cutting the explored tree by roughly half for free.

```python
def solve_n_queens(n: int) -> list[list[str]]:
    results: list[list[str]] = []
    cols: set[int] = set()
    diag, anti = set(), set()          # row-col, row+col
    placement: list[int] = []          # placement[r] = column of queen in row r

    def backtrack(row: int) -> None:
        if row == n:
            results.append(["." * c + "Q" + "." * (n - c - 1) for c in placement])
            return
        for col in range(n):
            if col in cols or (row - col) in diag or (row + col) in anti:
                continue
            cols.add(col); diag.add(row - col); anti.add(row + col)
            placement.append(col)
            backtrack(row + 1)
            placement.pop()
            cols.discard(col); diag.discard(row - col); anti.discard(row + col)

    backtrack(0)
    return results
```

Time O(N!) worst case (far less with pruning), space O(N). Technique: multi-constraint conflict-set pruning.

### 2. Sudoku Solver - constraint propagation + MRV

**Problem.** Fill a 9×9 grid (some cells given) so every row, column, and 3×3 box contains 1–9 exactly once. Modify the board in place. Constraints: a single solution exists; the board is 9×9.

**Worked examples:**
- **Example 1**
  - **Input:** board (81 cells, '.' = empty, partially filled) | **Output:** board fully filled in-place, no return value
  - **Explanation:** each empty cell gets a digit 1-9 such that no row, column, or 3×3 box repeats a digit.

**Constraints:** board is exactly 9×9, guaranteed to have exactly one solution.

**Approach.** Find an empty cell, try each digit that doesn't already appear in its row, column, or box, recurse, undo on failure, and **return on the first complete fill** (find-one). The senior speedup is **MRV**: always fill the empty cell with the _fewest_ legal candidates next - failing fast prunes enormous subtrees. Recomputing each cell's legal-candidate set before choosing is itself a lightweight form of **forward checking / constraint propagation**: eagerly narrowing what's still possible for a variable instead of discovering the conflict only when a leaf is reached - the difference between Sudoku solving in milliseconds versus minutes. Distinct facet: **find-one short-circuit + ordering heuristic**, not collect-all.

```python
def solve_sudoku(board: list[list[str]]) -> None:
    def candidates(r: int, c: int) -> set[str]:
        used = {board[r][k] for k in range(9)} | {board[k][c] for k in range(9)}
        br, bc = 3 * (r // 3), 3 * (c // 3)
        used |= {board[br + i][bc + j] for i in range(3) for j in range(3)}
        return set("123456789") - used

    def next_cell():                   # MRV: empty cell with fewest candidates
        best, best_cands = None, None
        for r in range(9):
            for c in range(9):
                if board[r][c] == ".":
                    cs = candidates(r, c)
                    if best_cands is None or len(cs) < len(best_cands):
                        best, best_cands = (r, c), cs
                        if len(cs) == 1:
                            return best, cs
        return best, best_cands

    def backtrack() -> bool:
        cell, cs = next_cell()
        if cell is None:
            return True
        r, c = cell
        for d in cs:
            board[r][c] = d
            if backtrack():            # return on first success (find-one)
                return True
            board[r][c] = "."
        return False

    backtrack()
```

Time exponential worst case, near-instant with MRV; space O(1) extra (in-place). Technique: find-one + constraint propagation + MRV ordering.

### 3. Combination Sum - reuse with a start index

**Problem.** Given distinct positive `candidates` and a `target`, return all unique combinations summing to `target`; each candidate may be used **unlimited** times. Constraints: `candidates ≤ 30`, `target ≤ 40` - small enough for exhaustive search.

**Worked examples:**
- **Example 1**
  - **Input:** candidates = [2,3,6,7], target = 7 | **Output:** [[2,2,3],[7]]
- **Example 2**
  - **Input:** candidates = [2,3,5], target = 8 | **Output:** [[2,2,2,2],[2,3,3],[3,5]]

**Constraints:** `1 ≤ candidates.length ≤ 30`, `2 ≤ candidates[i] ≤ 40`, all candidates distinct, `1 ≤ target ≤ 40`.

**Approach.** Recurse carrying a `start` index and the remaining target. At each step, try candidates from `start` onward (allowing reuse by recursing with the _same_ index, but never going backward - that kills permutation duplicates). Prune the moment `remaining < 0`. Distinct facet: **unbounded reuse with start-index deduplication** - neither a fixed-length nor a permutation search.

```python
def combination_sum(candidates: list[int], target: int) -> list[list[int]]:
    results: list[list[int]] = []
    path: list[int] = []

    def backtrack(start: int, remaining: int) -> None:
        if remaining == 0:
            results.append(path[:])    # snapshot - path keeps mutating
            return
        for i in range(start, len(candidates)):
            if candidates[i] > remaining:
                continue
            path.append(candidates[i])
            backtrack(i, remaining - candidates[i])  # i, not i+1: allows reuse of the same candidate
            path.pop()

    candidates.sort()                  # lets the prune also break early if desired
    backtrack(0, target)
    return results
```

Time O(2^target) worst case, space O(target/min) depth. Technique: start-index dedup with reuse.

### 4. Restore IP Addresses - bounded-segment partition

**Problem.** Given a string of digits, return all valid IP addresses formable by inserting three dots - four octets, each 0–255, no leading zeros (except "0" itself). Constraints: `|s| ≤ 20`.

**Worked examples:**
- **Example 1**
  - **Input:** s = "25525511135" | **Output:** ["255.255.11.135","255.255.111.35"]
- **Example 2**
  - **Input:** s = "0000" | **Output:** ["0.0.0.0"]

**Constraints:** `1 ≤ s.length ≤ 20`, `s` consists of digits only.

**Approach.** Recurse over exactly **four** segments; at each, take 1–3 leading digits, pruning any octet > 255 or with a leading zero. The fixed depth of 4 and the "consume the whole string in exactly 4 cuts" requirement make this a **bounded partition** - distinct from Combination Sum's open-ended depth. Stop when 4 segments are placed _and_ the string is fully consumed.

```python
def restore_ip_addresses(s: str) -> list[str]:
    results: list[str] = []
    n = len(s)

    def backtrack(start: int, segment: int, parts: list[str]) -> None:
        if segment == 4:
            if start == n:
                results.append(".".join(parts))
            return
        for length in (1, 2, 3):
            if start + length > n:
                break
            piece = s[start:start + length]
            if (piece[0] == "0" and length > 1) or int(piece) > 255:
                continue
            parts.append(piece)
            backtrack(start + length, segment + 1, parts)
            parts.pop()

    backtrack(0, 0, [])
    return results
```

Time O(1) effectively (≤ 3⁴ = 81 leaf attempts), space O(1). Technique: fixed-depth bounded-segment partition.

**Duplicate problems:** none - the fixed-depth-4 bounded partition here is distinct from every other entry in this file.

---

### 5. Word Break II - backtracking + memoization

**Problem.** Given a string `s` and a dictionary `wordDict`, return all sentences formed by inserting spaces so every resulting word is in the dictionary. Constraints: `|s| ≤ 20`, `wordDict.length ≤ 1000`.

**Worked examples:**
- **Example 1**
  - **Input:** s = "catsanddog", wordDict = ["cat","cats","and","sand","dog"] | **Output:** ["cats and dog","cat sand dog"]
- **Example 2**
  - **Input:** s = "pineapplepenapple", wordDict = ["apple","pen","applepen","pine","pineapple"] | **Output:** ["pine apple pen apple","pineapple pen apple","pine applepen apple"]

**Constraints:** `1 ≤ s.length ≤ 20`, `1 ≤ wordDict.length ≤ 1000`, all dictionary words distinct.

**Approach.** Backtrack over prefixes of the remaining suffix: at each position, try every dictionary word that matches the upcoming characters, recurse on the rest, and join words with spaces on a complete parse. The bridge from pure backtracking to memoized search: cache the list of sentences producible from each suffix (`memo[suffix] = [sentence, ...]`) so a suffix reachable via multiple different prefixes is only explored once. Without the memo, overlapping suffixes get re-explored exponentially; with it, each distinct suffix is solved once and reused.

```python
def word_break(s: str, word_dict: list[str]) -> list[str]:
    words = set(word_dict)
    memo: dict[str, list[str]] = {}

    def backtrack(suffix: str) -> list[str]:
        if suffix in memo:
            return memo[suffix]
        if not suffix:
            return [""]
        sentences: list[str] = []
        for end in range(1, len(suffix) + 1):
            word = suffix[:end]
            if word in words:
                for rest in backtrack(suffix[end:]):
                    sentences.append(word if not rest else f"{word} {rest}")
        memo[suffix] = sentences
        return sentences

    return backtrack(s)
```

**Complexity.** O(n³ + 2ⁿ) worst case without memo pruning the overlap; with the suffix memo, each of the O(n) distinct suffixes is computed once, each costing O(n) to try all split points - O(n²) plus the cost of joining sentences. Space O(n) for the memo, plus output size.

**Duplicate problems:**
- Word Break (LC 139) - same suffix-backtracking shape, but only needs a boolean existence check instead of enumerating every sentence - no need to collect or join strings, memo stores `True`/`False` per suffix.

---

### 6. Palindrome Partitioning - predicate-gated cut

**Problem.** Given a string `s`, partition it so every substring is a palindrome; return all such partitions. Constraints: `1 ≤ |s| ≤ 16`.

**Worked examples:**
- **Example 1**
  - **Input:** s = "aab" | **Output:** [["a","a","b"],["aa","b"]]
- **Example 2**
  - **Input:** s = "a" | **Output:** [["a"]]

**Constraints:** `1 ≤ s.length ≤ 16`, `s` consists of lowercase English letters only.

**Approach.** Recurse over cut positions: at each step, try every prefix of the remaining suffix, and only recurse into it if that prefix is itself a palindrome (the prune predicate). This differs from both bounded-depth partition (Restore IP Addresses, which gates on a fixed numeric range and exactly 4 cuts) and dictionary-lookup partition (Word Break II, which gates on set membership) - here the gate is a **computed predicate over the substring itself** (is this a palindrome?), and the depth is unbounded (any number of cuts, not a fixed count).

```python
def partition(s: str) -> list[list[str]]:
    results: list[list[str]] = []
    path: list[str] = []
    n = len(s)

    def is_palindrome(sub: str) -> bool:
        return sub == sub[::-1]

    def backtrack(start: int) -> None:
        if start == n:
            results.append(path[:])
            return
        for end in range(start + 1, n + 1):
            piece = s[start:end]
            if is_palindrome(piece):
                path.append(piece)
                backtrack(end)
                path.pop()

    backtrack(0)
    return results
```

**Complexity.** O(n · 2ⁿ) worst case (2ⁿ possible partitions, O(n) palindrome check each, though precomputing a palindrome table reduces the per-check cost to O(1)). Space O(n) recursion depth, plus output.

**Duplicate problems:**
- Palindrome Partitioning II (LC 132) - same palindrome-gated cut concept, but asks for the minimum number of cuts (an optimization, not enumeration) - solved with DP instead of backtracking once only a count is needed, illustrating the backtracking-vs-DP boundary from Recognition signals.

---

### 7. Partition to K Equal Sum Subsets

**Problem.** Given an array `nums` and an integer `k`, determine whether it's possible to divide the array into `k` non-empty subsets with equal sums, using every element exactly once.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [4,3,2,3,5,2,1], k = 4 | **Output:** true
  - **Explanation:** the array can be split into `[5]`, `[1,4]`, `[2,3]`, `[2,3]` - four subsets each summing to 5.
- **Example 2**
  - **Input:** nums = [1,2,3,4], k = 3 | **Output:** false
  - **Explanation:** the total is 10, which doesn't divide evenly by 3, so no valid partition can exist.

**Constraints:** `1 ≤ k ≤ nums.length ≤ 16`, `1 ≤ nums[i] ≤ 10⁴`.

**Approach:** First reject immediately if `sum(nums) % k != 0` - the target per-subset sum must be an integer. Then backtrack, but represent "which elements have been used" as a **bitmask** over up to 16 elements instead of a set or boolean array: `used |= (1 << i)` to mark an element placed, and checking membership is a single `&`. The bound `nums.length ≤ 16` is the tell - it's small enough that the full `2¹⁶` used-mask state space is enumerable, and the bitmask makes each state hashable for memoization (`(mask, remaining_in_current_bucket)` pairs that fail don't need re-exploring). Try building one bucket to the target sum at a time; when a bucket completes, start the next one from a fresh running total.

```python
from functools import lru_cache

def can_partition_k_subsets(nums: list[int], k: int) -> bool:
    total = sum(nums)
    if total % k != 0:
        return False
    target = total // k
    nums.sort(reverse=True)              # try largest first - fails fast, prunes harder
    if nums[0] > target:
        return False
    n = len(nums)

    @lru_cache(maxsize=None)
    def backtrack(mask: int, remaining: int) -> bool:
        if mask == (1 << n) - 1:
            return True
        if remaining == 0:
            remaining = target
        for i in range(n):
            if mask & (1 << i):
                continue                 # already used
            if nums[i] > remaining:
                continue
            if backtrack(mask | (1 << i), remaining - nums[i]):
                return True
            if remaining == target:
                break                    # this element could never start a bucket - neither can any other at this depth
        return False

    return backtrack(0, target)
```

**Complexity:** O(k · 2ⁿ) time (each of the 2ⁿ masks visited once per memo, bounded by the k-bucket structure), O(2ⁿ) space for the memo. The recursion depth is O(n).

**Duplicate problems:**
- Matchsticks to Square (LC 473) - identical bitmask-used-set backtracking with `k` fixed to 4.
- Fair Distribution of Cookies (LC 2305) - same bitmask-subset-partition shape, minimizing the maximum bucket sum instead of checking equal sums.

---

### 8. Closest Subsequence Sum

**Problem.** Given an array `nums` and an integer `goal`, choose a subsequence (possibly empty) of `nums` whose sum is as close as possible to `goal`; return the minimum absolute difference achievable.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [5,-7,3,5], goal = 6 | **Output:** 0
  - **Explanation:** the subsequence `{3, -7, 5, 5}` sums to exactly `3 + (-7) + 5 + 5 = 6`, matching the goal exactly, so the minimum possible difference is 0.
- **Example 2**
  - **Input:** nums = [7,-9,15,-2], goal = -5 | **Output:** 1
  - **Explanation:** the closest achievable subsequence sum is -6 or -4, one unit away from -5.

**Constraints:** `1 ≤ nums.length ≤ 40`, `-10⁷ ≤ nums[i] ≤ 10⁷`, `-10⁹ ≤ goal ≤ 10⁹`.

**Approach:** `nums.length ≤ 40` is the exact tell for **meet-in-the-middle**: a full subset backtrack is `2⁴⁰` (infeasible), but splitting the array into two halves of ≤20 elements each and backtracking every subset sum of each half separately is `2 × 2²⁰` (instant). Backtrack (choose/skip each element) over the left half to collect all achievable sums into a sorted list; do the same for the right half. Then for every sum in the left list, binary-search the right list for the value that best complements it toward `goal`, tracking the minimum absolute difference across all combinations. The two independent backtracking passes are each a plain, unconstrained subset enumeration - what makes this meet-in-the-middle rather than two isolated Subsets problems is the O(n log n) combine step that stitches the halves back into one answer.

```python
from bisect import bisect_left

def min_abs_difference(nums: list[int], goal: int) -> int:
    def subset_sums(arr: list[int]) -> list[int]:
        sums: list[int] = []
        path_sum = 0

        def backtrack(i: int, current: int) -> None:
            if i == len(arr):
                sums.append(current)
                return
            backtrack(i + 1, current + arr[i])   # choose arr[i]
            backtrack(i + 1, current)             # skip arr[i]

        backtrack(0, path_sum)
        return sorted(sums)

    mid = len(nums) // 2
    left_sums = subset_sums(nums[:mid])
    right_sums = subset_sums(nums[mid:])

    best = float("inf")
    for ls in left_sums:
        target = goal - ls
        idx = bisect_left(right_sums, target)
        for j in (idx - 1, idx):
            if 0 <= j < len(right_sums):
                best = min(best, abs(ls + right_sums[j] - goal))
    return best
```

**Complexity:** O(2^(n/2) log(2^(n/2))) time = O(2^(n/2) · n) for the two backtracking passes plus sorting, O(2^(n/2)) space for the sum lists.

No close duplicates in this file - the 40-element meet-in-the-middle split is a distinct shape from every other backtracking problem here.
