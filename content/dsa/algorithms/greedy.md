# Greedy

## Prerequisites

- [Sorting](./sorting.md) [Must read] - almost every greedy algorithm begins by sorting on the "greedy key" (end time, ratio, weight); the `O(n log n)` sort dominates the runtime.
- [Dynamic Programming](./dynamic-programming.md) [Must read] - greedy is DP's faster, riskier cousin; you must know what DP buys (exploring all choices) to see what greedy gambles (committing to one). The greedy-vs-DP boundary is the whole interview.
- [Heap](../data-structures/heap.md) - many greedy algorithms (Dijkstra, Huffman, task scheduling) pick the local best via a priority queue rather than a one-time sort.
- [Merge Intervals](../patterns/merge-intervals.md) - interval-scheduling greedy is the algorithmic core under that pattern.

## Table of Contents

- [What it is](#what-it-is)
- [Intuition](#intuition)
- [How it works](#how-it-works)
- [Correctness / invariant](#correctness--invariant)
- [Complexity derivation](#complexity-derivation)
- [Constraints & approach](#constraints--approach)
- [When to use / when not](#when-to-use--when-not)
- [Comparison](#comparison)
- [Greedy-choice proof](#greedy-choice-proof)
- [Edge cases](#edge-cases)
- [Implementation](#implementation)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

## What it is

A greedy algorithm builds a solution **one step at a time, always taking the choice that looks best right now, and never reconsidering it.** It commits to each local optimum and moves on. This is correct _only_ when the problem has two properties: the **greedy-choice property** (a globally optimal solution can be reached by a sequence of locally optimal choices) and **optimal substructure** (an optimal solution contains optimal solutions to subproblems).

**Mental model:** filling a backpack by always grabbing the single most valuable thing that still fits, never putting anything back. Fast and obvious - and _correct only when no later item could have made an earlier swap worthwhile._ The entire skill of greedy is recognizing when "never put anything back" is safe.

- **Time:** usually `O(n log n)` - dominated by the initial sort (or `O(n log n)` of heap operations); the greedy pass itself is `O(n)`.
- **Space:** `O(1)`–`O(n)` - often constant beyond the input, since you keep only the running choice, not a table.

> **Takeaway (say it out loud):** "Greedy takes the locally best choice and never looks back. It's only correct if you can _prove_ the greedy choice is safe - via an exchange argument. No proof, no greedy."

## Intuition

Dynamic programming is thorough: it considers every choice at every step and remembers the results, paying `O(states × transition)` to guarantee optimality. That's overkill if you can _prove_ that the obvious local choice is always part of some optimal solution - then you don't need to explore alternatives at all, because you already know the best first move.

Greedy's bet: **if grabbing the locally best option never closes off the optimum, then a chain of locally best options _is_ the optimum.** When that bet holds, you collapse DP's whole search to a single sorted pass.

The danger is that the bet is **silent when wrong.** A greedy algorithm always returns _an_ answer; it just returns a _suboptimal_ one when the greedy-choice property fails - no crash, no obvious tell. Coin change with denominations `[1, 3, 4]` for amount `6`: greedy grabs the biggest coin first (`4`), then needs `1 + 1` → 3 coins, but the optimum is `3 + 3` → 2 coins. The local choice (`4`) poisoned the global answer. **This is why greedy without a correctness proof is worthless** - the only thing separating a correct greedy from a plausible-but-wrong one is the exchange argument, not the code.

## How it works

Trace **Activity Selection** (interval scheduling): given activities with `(start, end)`, select the maximum number that don't overlap. The greedy key: **sort by end time, then repeatedly take the next activity that starts at or after the last one taken finishes.**

Activities: `A(1,3) B(2,5) C(4,7) D(6,8) E(5,9) F(8,10)`. Sorted by end time: `A(1,3), B(2,5), C(4,7), D(6,8), E(5,9), F(8,10)`.

```
time →  1   2   3   4   5   6   7   8   9   10
A      [=======]
B          [===========]
C                  [===========]
D                          [=======]
E                      [===============]
F                                  [=======]

pick:  A(end 3) ──► next start ≥ 3 ──► C(start 4) ✓ (end 7)
       ──► next start ≥ 7 ──► D(start 6) ✗ overlaps, F(start 8) ✓
result: A, C, F  →  3 activities
```

Step-by-step (`last_end` = finish of the most recently chosen activity):

| Activity (by end) | start ≥ `last_end`? | Action | `last_end` after |
| ----------------- | ------------------- | ------ | ---------------- |
| A(1,3) | yes (last_end = −∞) | **take** | 3 |
| B(2,5) | 2 ≥ 3? no | skip (overlaps A) | 3 |
| C(4,7) | 4 ≥ 3? yes | **take** | 7 |
| D(6,8) | 6 ≥ 7? no | skip (overlaps C) | 7 |
| E(5,9) | 5 ≥ 7? no | skip | 7 |
| F(8,10) | 8 ≥ 7? yes | **take** | 10 |

Result: `{A, C, F}`, three activities - optimal. **The invariant - "after processing the first `k` sorted activities, the set chosen is the maximum compatible set that finishes as early as possible" - holds at every step.** Taking the earliest-finishing compatible activity each time leaves the most room for everything after it; that "leaves the most room" is exactly what the exchange argument below proves is safe.

## Correctness / invariant

**Invariant:** after each pick, the chosen set is a valid (non-overlapping) selection, and the last chosen activity has **the earliest possible finish time** among all valid selections of that size. Earliest finish = maximum remaining room.

The greedy-choice property here, proved by the **exchange argument** (the universal greedy proof technique):

> **Claim:** there exists an optimal solution that includes the activity with the earliest finish time, `a₁`.
> **Proof:** take any optimal solution `O`. Let `f` be its earliest-finishing activity. Since `a₁` finishes no later than `f` (it's _the_ earliest), swapping `f` for `a₁` in `O` cannot create an overlap - `a₁` ends at or before `f`, so anything compatible with `f` is compatible with `a₁`. The swapped set `O' = O − {f} + {a₁}` is still valid and has the **same size**, so it's also optimal - and it contains `a₁`. ∎

Then **optimal substructure** finishes it: after committing to `a₁`, the remaining problem is "select max activities starting after `a₁` ends" - a smaller instance of the _same_ problem. By induction, greedy on the rest is optimal, and prepending `a₁` gives a global optimum.

The "prove it" one-liner: *greedy is correct here because the earliest-finishing activity is always swappable into some optimal solution without loss (exchange argument), and what remains is the same problem on a shorter timeline (optimal substructure).* **Every correct greedy needs both halves - exchange safety + optimal substructure. If you can't produce the exchange argument, you cannot claim the greedy is correct.**

## Complexity derivation

- **Sort by the greedy key:** `O(n log n)` - this dominates.
- **Greedy pass:** one linear scan, `O(1)` work per element (compare `start` to `last_end`, maybe take) → `O(n)`.
- **Total:** `O(n log n) + O(n) = O(n log n)`. **Space:** `O(1)` beyond the input - only `last_end` and a count, no table.

The shape is almost always the same: **the sort (or the heap) is the cost; the greedy decision is free.** Contrast with the DP that would solve the _same family_ of problems without the greedy-choice property: weighted interval scheduling (each interval has a value, maximize total value) loses the greedy property and needs `O(n log n)` DP with a binary-search transition - same sort, but now an `O(n)` table and a `dp[i] = max(skip, take + dp[prev])` recurrence. The greedy-choice property is exactly what lets you drop the table.

**Why the sort key matters more than the loop (senior point):** greedy's correctness lives entirely in the **choice of sort key**, not the scan. Sort activity selection by _start_ time instead of _end_ time and the same linear scan returns a wrong answer - you'd greedily take a long early activity that blocks many short ones. The asymptotic cost is identical either way; only one key is _correct_. The interview failure mode is picking a plausible key without proving it - the code looks right, runs fast, and is silently suboptimal.

## Constraints & approach

Greedy is the **`O(n log n)` answer when the greedy-choice property holds** - so the constraint that _invites_ greedy is a large `n` (`10^5`–`10^6`) where DP's higher-dimensional table would be too slow, _combined with_ a problem structure where a provable local choice exists.

| Input size | Expected complexity | Approach |
| ---------- | ------------------- | -------- |
| `n ≤ 20` | `O(2^n)` | Brute force / bitmask - small enough to check all; greedy unnecessary (and you can _verify_ greedy against brute force here). |
| `n ≤ 5000` | `O(n^2)` / `O(n·W)` | DP - if no greedy-choice property, the table is affordable. |
| `n ≤ 10^5` | `O(n log n)` | **Greedy** (sort + scan) or DP-with-binary-search; greedy wins _if_ the exchange argument holds. |
| `n ≤ 10^6–10^7` | `O(n)` / `O(n log n)` | **Greedy** is often the _only_ thing fast enough - DP tables won't fit/finish. |

**What the constraint rules out / invites:** `n ≤ 10^6` with "maximum/minimum number of …" and an obvious ordering → greedy _invited_; nothing else is fast enough. But the constraint **cannot tell you greedy is _correct_** - that's the trap unique to greedy. Unlike DP (where `n ≤ 20 → bitmask` is a safe mechanical read), a large `n` only says "greedy would be _fast_ enough," not "greedy is _right_." You still owe the exchange argument. When `n` is small (`≤ 20`), exploit it: run brute force _and_ greedy, compare - if they ever disagree, your greedy key is wrong.

## When to use / when not

**Reach for greedy when** you can **prove** (exchange argument) that a locally optimal choice is always extendable to a global optimum - typically problems with a natural ordering: "schedule the most …", "minimum number of …", "earliest/largest/cheapest first". The proof is the entry fee, not an afterthought.

**Prefer an alternative when:**

- **No safe local choice exists** → **[dynamic programming](./dynamic-programming.md)**. This is _the_ greedy-vs-DP decision. If a locally optimal choice can be regretted later (taking coin `4` blocked the `3+3` optimum), greedy fails and you must explore alternatives - that's DP. **Litmus test:** can you construct a small input where the greedy choice leads to a worse final answer? If yes → DP. If you can prove no such input exists → greedy. Weighted interval scheduling is the textbook flip: unweighted = greedy, _weighted_ = DP, because now a high-value long interval may beat two short ones and the earliest-finish heuristic breaks.
- You must **enumerate all solutions**, not find one optimum → **backtracking**.
- The greedy choice needs a **priority that changes as you go** → still greedy, but via a **[heap](../data-structures/heap.md)** (Dijkstra, Huffman, "minimum cost to connect ropes") rather than a one-time sort.

**Real system:** greedy is everywhere in infrastructure - Huffman coding in `gzip`/`zip` and JPEG, Dijkstra's shortest path in routing, scheduling heuristics in OS task schedulers and CDN request routing, and Kruskal/Prim for minimum-spanning-tree network design ([minimum-spanning-tree.md](./minimum-spanning-tree.md)).

## Comparison

| Approach | Time | Space | Key assumption / when it wins |
| -------- | ---- | ----- | ----------------------------- |
| **Greedy** | `O(n log n)` | `O(1)`–`O(n)` | Greedy-choice property holds (exchange argument provable); want optimum. |
| Dynamic programming | `O(states · transition)` | `O(states)` | Local choices can be regretted; must compare alternatives. Safe when greedy fails. |
| Backtracking | `O(b^d)` pruned | `O(d)` | Want _all_ valid configurations, not one optimum. |
| Brute force | `O(2^n)` | `O(n)` | `n` tiny; also the _oracle_ to verify a greedy key on small inputs. |

The decision that matters: **greedy vs DP.** Same problem family, and the question is always "can the local choice be regretted later?" No → greedy (drop the table, `O(n log n)`). Yes → DP (keep the table, explore alternatives). The weighted-vs-unweighted interval scheduling pair is the canonical example of the boundary in one problem.

## Greedy-choice proof

> Family: **Bit/greedy** - this section carries the greedy half: the **exchange argument**, the single proof technique that establishes (or refutes) every greedy algorithm. A greedy without this proof is a guess.

**The exchange argument, as a reusable recipe.** To prove "greedy choice `g` is safe":

1. **Assume an optimal solution `O`** that does _not_ make the greedy choice `g`.
2. **Exchange:** modify `O` by swapping in `g` (and swapping out whatever `O` chose instead), producing `O'`.
3. **Show `O'` is still valid** (no constraint broken by the swap).
4. **Show `O'` is no worse** than `O` (same or better objective).
5. **Conclude:** since `O'` is optimal _and_ contains `g`, some optimal solution makes the greedy choice. Induct on the remaining subproblem (optimal substructure) to extend to the full solution.

Applied to activity selection: `O` is an optimal schedule, `g = a₁` is the earliest-finishing activity. If `O` doesn't include `a₁`, swap `O`'s earliest activity for `a₁`; since `a₁` finishes no later, validity is preserved and the count is unchanged - `O'` is optimal and contains `a₁`. ∎

**When the exchange argument _fails_ - and how to spot it.** The proof breaks at step 4: you swap in the greedy choice and the result is **strictly worse**. That failure _is_ your counterexample, and it's the fastest way to kill a wrong greedy:

- **Coin change `[1,3,4]`, amount 6:** greedy choice = largest coin `4`. Any optimal solution (`{3,3}`) that doesn't use `4` _cannot_ have `4` swapped in without exceeding or worsening it - the exchange produces a worse answer. Proof fails → greedy fails → use DP.
- **0/1 knapsack by value/weight ratio:** greedily taking the best-ratio item can leave capacity that a different (lower-ratio but better-fitting) item would have filled; the exchange makes it worse. Fails → DP. (_Fractional_ knapsack: the exchange _holds_, because you can take a fraction to fill exactly - that's why fractional is greedy and 0/1 is DP.)

**Two standard proof structures** beyond the basic exchange: **"greedy stays ahead"** (show that after each step, greedy's partial solution is at least as good as any other on a chosen metric - used for activity selection's earliest-finish) and the **matroid framework** (greedy is provably optimal iff the problem's independent sets form a matroid - the deep theory under "why does greedy work here"). For interviews the exchange argument suffices; naming the matroid result is the staff-level flourish.

## Edge cases

- **Empty input** (`[]`): return the identity - `0` activities, empty schedule, `0` cost. Guard `if not arr: return 0` so the sort and scan don't index into nothing.
- **Single element:** always take it; flushes out the `last_end = −∞` initialization and the first-iteration boundary.
- **Ties on the greedy key** (two activities with the same end time): the algorithm stays correct, but be deliberate - the tiebreak can matter in _variants_ (e.g. when also minimizing some secondary cost). State your tiebreak; don't let it be accidental.
- **All-overlapping input** (every interval covers a common point): greedy correctly returns exactly `1`. A good sanity case that the "skip on overlap" branch fires.
- **Integer overflow on cost-accumulating greedy** (CP): greedy on costs/weights (Huffman, "connect ropes") sums values - with `n = 10^6` and values up to `10^9`, the running total overflows 32-bit. Use 64-bit (`long`/Python int is fine, but flag it in Java/C++), and `% (10**9 + 7)` if the problem asks for a count.
- **Sorting stability / wrong key** (the senior trap): the single most common greedy bug isn't a crash - it's **sorting by the wrong key** (start vs end time) and silently returning a suboptimal answer that passes small hand-tests. Always verify the key against the exchange argument, and on `n ≤ 20` against brute force.

## Implementation

**Pseudocode (CLRS-style) - Activity Selection:**

```
GREEDY-ACTIVITY-SELECT(activities)
sort activities by finish time ascending
chosen ← empty list
last-finish ← −∞
for each act in activities
    if act.start ≥ last-finish
        append act to chosen
        last-finish ← act.finish
return chosen
```

**Python (idiomatic - sort by end, single scan):**

```python
from typing import List, Tuple

def activity_selection(activities: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
    """Max set of non-overlapping (start, end) activities."""
    if not activities:
        return []
    activities.sort(key=lambda a: a[1])       # greedy key: finish time ascending
    chosen = [activities[0]]
    last_finish = activities[0][1]
    for start, finish in activities[1:]:
        if start >= last_finish:
            chosen.append((start, finish))
            last_finish = finish
    return chosen
```

**Python (heap-based greedy - when the priority changes as you go):** "connect `n` ropes at minimum total cost; cost to connect two ropes = sum of their lengths." The greedy choice (always merge the two _shortest_) needs a priority queue, not a one-time sort, because each merge creates a new length to reconsider.

```python
import heapq

def min_connect_cost(ropes: List[int]) -> int:
    if len(ropes) < 2:
        return 0
    heapq.heapify(ropes)                      # O(n) build; min on top
    total = 0
    while len(ropes) > 1:
        a = heapq.heappop(ropes)              # two shortest = the safe greedy choice
        b = heapq.heappop(ropes)
        cost = a + b
        total += cost
        heapq.heappush(ropes, cost)           # the merged rope re-enters the queue
    return total
```

The pseudocode is the contract (`sort by finish`, `▷ greedy choice`); the Python is the reference - `sort(key=...)`, tuple unpacking in the loop, `heapq` for the dynamic-priority variant. They look different on purpose.

## What the interviewer probes for

- **"Prove your greedy is correct."** - Produce the exchange argument: assume an optimal solution without your greedy choice, swap your choice in, show it stays valid and no worse, conclude an optimal solution contains it; then induct via optimal substructure. "It seems to work on examples" is not a proof and interviewers will push until you give the swap.
- **"Why greedy here but DP for the weighted version?"** - Adding weights breaks the greedy-choice property: a high-value long interval can beat two short ones, so earliest-finish no longer dominates and a local choice can be regretted. Once a choice can be regretted, you must compare alternatives → DP. Name the concrete flip (unweighted activity selection = greedy; weighted = `O(n log n)` DP).
- **"What's your sort key, and why _that_ key?"** - The key _is_ the algorithm; state it and tie it to the exchange argument (end time, because earliest finish maximizes remaining room). Mention that a plausible-but-wrong key (start time, or duration) gives a fast, silently-suboptimal answer - the most common greedy mistake.
- **"How would you check a greedy you're unsure about?"** - On small `n` (≤ 20), brute-force all subsets and compare to greedy; any disagreement proves the greedy key wrong. This is the practical CP move when you can't immediately produce the proof.
- **"When is greedy _provably_ optimal in general?"** - When the problem's independent sets form a matroid (matroid theory), greedy is guaranteed optimal - the unifying reason MST (Kruskal) and scheduling work. For most interviews the exchange argument is enough; the matroid answer signals depth.

## Practice problems

Each problem below exercises a **distinct** greedy structure - interval scheduling, sort-then-pair, heap-driven dynamic priority, and a stay-ahead reachability sweep.

### Non-overlapping Intervals (interval scheduling, minimize removals)

Given intervals, find the minimum number to **remove** so the rest don't overlap. Constraints: `n ≤ 10^5`. Technique: **the activity-selection greedy in disguise** - sort by end time, greedily keep the earliest-finishing compatible intervals; removals = total − kept. Keeping the most is the same as removing the fewest.

```python
def erase_overlap_intervals(intervals: List[List[int]]) -> int:
    if not intervals:
        return 0
    intervals.sort(key=lambda x: x[1])        # greedy key: end time
    kept, last_end = 1, intervals[0][1]
    for s, e in intervals[1:]:
        if s >= last_end:
            kept += 1
            last_end = e
    return len(intervals) - kept
```

**Complexity:** `O(n log n)` time, `O(1)` space. Pattern: interval scheduling - see [Merge Intervals](../patterns/merge-intervals.md).

### Assign Cookies (sort-then-two-pointer greedy)

Each child has a greed factor `g[i]`; each cookie a size `s[j]`. A child is content if assigned a cookie with `s[j] ≥ g[i]`; maximize content children. Constraints: `n, m ≤ 5·10^4`. Technique: **sort both, greedily give the smallest sufficient cookie to the least-greedy child** - never "waste" a big cookie on a small need. The exchange argument: swapping to the smallest sufficient cookie never reduces the count.

```python
def find_content_children(g: List[int], s: List[int]) -> int:
    g.sort(); s.sort()
    child = cookie = 0
    while child < len(g) and cookie < len(s):
        if s[cookie] >= g[child]:
            child += 1
        cookie += 1                           # cookie consumed either way
    return child
```

**Complexity:** `O(n log n + m log m)` time, `O(1)` space. Pattern: sort-both + two-pointer greedy.

### Minimum Cost to Connect Sticks (heap-driven greedy)

Connect all sticks into one; cost of each connection = sum of the two stick lengths; minimize total cost. Constraints: `n ≤ 10^4`. Technique: **dynamic-priority greedy via a min-heap** - always merge the two shortest sticks (a Huffman-style choice); the merged length re-enters the heap, so the priority changes as you go and a one-time sort won't do.

```python
import heapq

def connect_sticks(sticks: List[int]) -> int:
    heapq.heapify(sticks)
    total = 0
    while len(sticks) > 1:
        cost = heapq.heappop(sticks) + heapq.heappop(sticks)
        total += cost
        heapq.heappush(sticks, cost)
    return total
```

**Complexity:** `O(n log n)` time, `O(n)` space. Pattern: heap greedy (Huffman family) - cross-link [Heap](../data-structures/heap.md).

### Jump Game (greedy reachability, "stays ahead")

Given an array where `nums[i]` is the max jump length from `i`, determine if you can reach the last index. Constraints: `n ≤ 10^4`. Technique: **track the farthest reachable index in one sweep** - a "greedy stays ahead" argument: maintain `reach = max(reach, i + nums[i])`; if any `i > reach`, you're stuck. No DP table needed because the farthest-reach frontier dominates.

```python
def can_jump(nums: List[int]) -> bool:
    reach = 0
    for i, n in enumerate(nums):
        if i > reach:
            return False
        reach = max(reach, i + n)
    return True
```

**Complexity:** `O(n)` time, `O(1)` space. Pattern: greedy reachability / stays-ahead - distinct from the sort-based greedies above.
