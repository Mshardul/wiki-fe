# Backtracking

## Prerequisites

- [Backtracking (algorithm)](../algorithms/backtracking.md) [Must read] - this page is the _recognition + transfer_ layer; the algorithm page owns the procedure, its correctness proof, and the complexity derivation. Read it for the mechanics; read this for how to spot and shape a backtracking problem.
- [Recursion](../algorithms/recursion.md) [Must read] - backtracking is a recursion that mutates shared state on the way down and undoes it on the way up; you need the call-stack model cold.
- [Depth-First Search](../algorithms/dfs.md) [Should read] - backtracking _is_ DFS over an implicit decision tree; seeing them as the same traversal locks in the structure.
- [Subsets & Permutations](./subsets-permutations.md) [Should read] - the most common _enumeration_ instance of this pattern; this page generalizes it to constraint-satisfaction and routes back to it.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [Recognition signals](#recognition-signals)
- [How it works](#how-it-works)
- [Skeleton](#skeleton)
- [Complexity](#complexity)
- [Constraints & approach](#constraints--approach)
- [Variations](#variations)
- [CP-primitives](#cp-primitives)
- [Worked problems](#worked-problems)
- [Pitfalls](#pitfalls)
- [First 30 seconds](#first-30-seconds)
- [Related](#related)
- [Practice problems](#practice-problems)
  - [N-Queens](#1-n-queens--constraint-checks--symmetry)
  - [Sudoku Solver](#2-sudoku-solver--constraint-propagation--mrv)
  - [Combination Sum](#3-combination-sum--reuse-with-a-start-index)
  - [Restore IP Addresses](#4-restore-ip-addresses--bounded-segment-partition)

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

## Skeleton

**Pseudocode (CLRS-style contract):**

```
BACKTRACK(state, choices)
1   if IS-COMPLETE(state)
2       RECORD(state)                       ▷ a full valid solution
3       return
4   for each candidate in choices(state)
5       if not IS-VALID(state, candidate)   ▷ PRUNE: skip dead branches
6           continue
7       MAKE-CHOICE(state, candidate)        ▷ choose
8       BACKTRACK(state, choices)            ▷ explore
9       UNMAKE-CHOICE(state, candidate)      ▷ un-choose (restore state)
```

**Python template - real signature, paste and adapt:**

```python
from typing import TypeVar

State = TypeVar("State")
Candidate = TypeVar("Candidate")


def solve(start_state: State) -> list[State]:
    results: list[State] = []
    path: list[Candidate] = []          # the current partial solution

    def backtrack(state: State) -> None:
        if is_complete(state):
            results.append(snapshot(path))   # COPY the path - it mutates
            return
        for candidate in candidates(state):
            if not is_valid(state, candidate):
                continue                # prune: this branch can't lead to a solution
            make_choice(state, path, candidate)     # choose
            backtrack(state)                        # explore
            unmake_choice(state, path, candidate)   # un-choose - restore exactly

    backtrack(start_state)
    return results

    # your logic here: fill in is_complete / candidates / is_valid /
    # make_choice / unmake_choice for the specific problem. The frame never changes.
```

The four problem-specific holes are `candidates`, `is_valid` (the prune), and the symmetric `make_choice` / `unmake_choice` pair. Get the choose/un-choose **exactly symmetric** and snapshot the path on record - those are the two places bugs live.

**The skeleton invariant that decides speed: prune _before_ recursing, never after.** There are two valid places to reject a dead branch - at the parent (test `is_valid(candidate)` before `make_choice`, as above) or at the child (recurse, then bail at the top via an `is_invalid(state)` guard). They produce the same answers but **not** the same speed: the child-guard form still pays a function call, a make, and an unmake for every dead candidate, whereas the parent-test form skips the branch entirely. Always push the check to the parent so a pruned subtree costs _zero_ recursion. The deeper version is **incremental validity** - maintain the constraint state (occupied columns, running sum) _inside_ `state` so `is_valid` is O(1) per candidate instead of an O(n) re-scan of the whole partial solution; that single change is often what turns a TLE into an accept, and it's why real backtracking carries conflict-sets/bitmasks in the state rather than recomputing validity from `path`. The frame never changes; where and how cheaply you prune is the entire performance story.

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

## CP-primitives

The contest-flavored upgrades that separate a TLE from an accepted solution - none of these appear in a basic interview, all show up in contests:

- **Bitmask state for "used" sets** - represent which elements/columns/diagonals are taken as bits in an integer; `make/unmake` becomes `mask ^= (1 << k)`, and validity is a single `&`. Collapses an O(n) "is it used?" scan to O(1) and makes the state hashable for memoization. **Why for CP:** turns O(n!·n) into O(n!) constant-factor wins and enables bitmask-DP fusion (`n ≤ 20`).
- **Forward checking / constraint propagation** - after each choice, eagerly remove now-illegal candidates from future variables and bail if any variable's domain empties. **Why for CP:** prunes orders of magnitude more than a leaf-only validity test; the difference between Sudoku in milliseconds and in minutes.
- **Symmetry breaking** - fix a canonical first choice to skip mirror-image solutions (N-Queens: only place the first queen in the left half, double the count). **Why for CP:** divides the explored tree by the symmetry group size - a 2×–8× speedup for free.
- **Meet-in-the-middle** - for `n ≤ ~40` subset problems too big for `2ⁿ`, split in half, enumerate each `2^(n/2)` side, and combine. **Why for CP:** turns `2⁴⁰` (infeasible) into `2²⁰` (instant) - the standard escape when `n` is just past the backtracking ceiling.

## Worked problems

Five constraint-satisfaction staples - each a **distinct** facet of the pattern, none overlapping the enumeration problems on [Subsets & Permutations](./subsets-permutations.md) or the algorithm page.

- **N-Queens** - place `N` queens on an `N×N` board, none attacking. Track occupied columns and both diagonals as sets (or bitmasks); the prune is "is this column/diagonal taken?" before placing. Recurse row by row; record a board when all `N` rows are filled. The canonical "place with conflict constraints" problem.
- **Sudoku Solver** - fill a 9×9 grid so every row, column, and 3×3 box has 1–9. Find the next empty cell, try each digit valid by the three constraints, recurse, undo on failure. Add **MRV** (fill the most-constrained empty cell first) and it solves instantly. Showcases constraint propagation + ordering heuristics.
- **Combination Sum** - all multisets of candidates summing to a target, reuse allowed. Pass a `start` index so each recursion only considers candidates ≥ the last picked (prevents permutation duplicates); prune when the running sum exceeds the target. The "unbounded choice with a start-index dedup" technique.
- **Restore IP Addresses** - split a digit string into 4 valid octets (0–255, no leading zeros). Recurse over 4 segments, each taking 1–3 digits, pruning octets > 255 or with leading zeros. A **bounded-depth partition** - exactly 4 cuts - distinct from the open-ended sum search.
- **Word Break II** - return all sentences formed by inserting spaces so every word is in a dictionary. Backtrack over prefixes that are valid words; **memoize** suffixes that recur to avoid re-exploring - the bridge from pure backtracking to memoized search.

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

**Approach.** Place one queen per row (forces the row constraint for free). Track occupied **columns**, **↘ diagonals** (`row - col`), and **↗ diagonals** (`row + col`) in three sets; a placement is valid iff none of the three is occupied - an O(1) prune. Recurse to the next row, undo on return. The distinct facet: **conflict-set pruning** across three simultaneous constraints, with the diagonal-indexing trick.

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
                continue               # prune: column or a diagonal is attacked
            cols.add(col); diag.add(row - col); anti.add(row + col)   # choose
            placement.append(col)
            backtrack(row + 1)                                        # explore
            placement.pop()                                          # un-choose
            cols.discard(col); diag.discard(row - col); anti.discard(row + col)

    backtrack(0)
    return results
```

Time O(N!) worst case (far less with pruning), space O(N). Technique: multi-constraint conflict-set pruning.

### 2. Sudoku Solver - constraint propagation + MRV

**Problem.** Fill a 9×9 grid (some cells given) so every row, column, and 3×3 box contains 1–9 exactly once. Modify the board in place. Constraints: a single solution exists; the board is 9×9.

**Approach.** Find an empty cell, try each digit that doesn't already appear in its row, column, or box, recurse, undo on failure, and **return on the first complete fill** (find-one). The senior speedup is **MRV**: always fill the empty cell with the _fewest_ legal candidates next - failing fast prunes enormous subtrees. Distinct facet: **find-one short-circuit + ordering heuristic**, not collect-all.

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
            return True                # no empty cell → solved
        r, c = cell
        for d in cs:
            board[r][c] = d            # choose
            if backtrack():            # explore - return on first success
                return True
            board[r][c] = "."          # un-choose
        return False                   # dead end → trigger backtrack above

    backtrack()
```

Time exponential worst case, near-instant with MRV; space O(1) extra (in-place). Technique: find-one + constraint propagation + MRV ordering.

### 3. Combination Sum - reuse with a start index

**Problem.** Given distinct positive `candidates` and a `target`, return all unique combinations summing to `target`; each candidate may be used **unlimited** times. Constraints: `candidates ≤ 30`, `target ≤ 40` - small enough for exhaustive search.

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
                continue               # prune: overshoots the target
            path.append(candidates[i])             # choose
            backtrack(i, remaining - candidates[i])  # explore - i, not i+1: reuse
            path.pop()                             # un-choose

    candidates.sort()                  # lets the prune also break early if desired
    backtrack(0, target)
    return results
```

Time O(2^target) worst case, space O(target/min) depth. Technique: start-index dedup with reuse.

### 4. Restore IP Addresses - bounded-segment partition

**Problem.** Given a string of digits, return all valid IP addresses formable by inserting three dots - four octets, each 0–255, no leading zeros (except "0" itself). Constraints: `|s| ≤ 20`.

**Approach.** Recurse over exactly **four** segments; at each, take 1–3 leading digits, pruning any octet > 255 or with a leading zero. The fixed depth of 4 and the "consume the whole string in exactly 4 cuts" requirement make this a **bounded partition** - distinct from Combination Sum's open-ended depth. Stop when 4 segments are placed _and_ the string is fully consumed.

```python
def restore_ip_addresses(s: str) -> list[str]:
    results: list[str] = []
    n = len(s)

    def backtrack(start: int, segment: int, parts: list[str]) -> None:
        if segment == 4:
            if start == n:
                results.append(".".join(parts))   # all 4 octets, string consumed
            return
        for length in (1, 2, 3):
            if start + length > n:
                break
            piece = s[start:start + length]
            if (piece[0] == "0" and length > 1) or int(piece) > 255:
                continue               # prune: leading zero or out of range
            parts.append(piece)                       # choose
            backtrack(start + length, segment + 1, parts)  # explore
            parts.pop()                               # un-choose

    backtrack(0, 0, [])
    return results
```

Time O(1) effectively (≤ 3⁴ = 81 leaf attempts), space O(1). Technique: fixed-depth bounded-segment partition.
