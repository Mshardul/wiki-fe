# State Machine DP

## Prerequisites

- [Dynamic Programming](../algorithms/dynamic-programming.md) [Must read] - state machine DP is DP where states have explicit transition constraints, not just an index
- [DP Patterns](./dp-patterns.md) [Must read] - covers general DP pattern recognition before specializing here
- [Hash Table](../data-structures/hash-table.md) [Must read] - memoization maps (index, state) pairs to values; understanding the structure helps

## Table of Contents

- [What it is](#what-it-is)
- [Recognition signals](#recognition-signals)
- [How it works](#how-it-works)
  - [Step-by-step trace](#step-by-step-trace--prices--1-2-3-0-2)
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

---

## What it is

**State machine DP** models a problem as a finite set of named states with explicit allowed transitions, then runs DP over `(index, state)` pairs - where the value at each pair is the best outcome reachable when you are at position `i` in state `s`.

**Mental model:** picture a vending machine with labeled modes (e.g. IDLE, DISPENSING, LOCKED). At each coin-insert step you can transition to certain modes but not others. State machine DP is exactly that: you decide at each step which state to be in, your options are constrained by your previous state, and you want the sequence of transitions that maximizes (or minimizes) a cumulative reward.

The key insight separating this from plain 1D DP: the *decision at step i* doesn't just depend on the index - it depends on which state you arrived in. States encode the "memory" that constrains future decisions without blowing up the state space.

> **Interview soundbite:** "State machine DP - finite named states, explicit allowed transitions between them, DP over `(index, state)`. Define what each state means, write the transition for each one, and the DP fills in the table."

---

## Recognition signals

### (a) Trigger phrases

Look for these literal phrasings in the problem statement:

- *"at most k transactions"* / *"you may complete at most k transactions"*
- *"with cooldown"* / *"after you sell you must wait one day before buying again"*
- *"with transaction fee"* / *"you must pay a fee for each transaction you complete"*
- *"hold at most one share at a time"*
- *"you cannot buy on the same day you sell"*
- *"you may rob houses along a street, but not two adjacent houses"* (circular/linear constraint on allowed next actions)
- *"each house can be painted one of k colors; no two adjacent houses the same color"*

### (b) Structural cues

- There is a **finite set of 2–5 named modes or decisions** the agent can be in at any step - "holding a stock / not holding", "painted red / blue / green", "robbed / skipped".
- The **legality of the current action depends on the previous action**, not just the current index.
- You want an optimal (max/min) cumulative value over a sequence of such constrained decisions.
- The problem involves **sequential decisions** where each decision locks or unlocks future choices.
- The state count is small and enumerable - if there are exponentially many states, look at [Bitmask DP](./bitmask-dp.md) instead.

### (c) Not to be confused with

| Pattern | Distinction |
|---|---|
| **Plain 1D DP** | Plain 1D DP's recurrence depends only on index (or index + a numeric quantity like remaining weight). State machine DP's recurrence depends on *which named mode you're in* - the state encodes a qualitative constraint on which transitions are legal, not just a numeric bound. If only the index matters, plain DP suffices. |
| **Bitmask DP** | Bitmask DP handles exponentially many states compressed into a bitmask (e.g. "which cities have been visited"). State machine DP has a *constant, small* number of explicit states. If you need to track a subset, reach for bitmask DP; if you have 2–5 named modes, state machine DP. |
| **Backtracking** | Backtracking re-explores states and prunes; it does not memoize. State machine DP memoizes every `(index, state)` pair exactly once - overlapping subproblems are the key. If the problem has no overlapping subproblems (pure combinatorial enumeration), backtracking is correct but DP is not applicable. |

---

## How it works

The core mechanic is a 2D DP table `dp[i][s]` = best total value when processing element `i` while in state `s`. For each `(i, s)` cell, you ask: which states `s'` could I have been in at step `i-1` that would legally let me transition into state `s`? The answer is the state machine's transition arrows read backwards.

### State-transition diagram - stock buy/sell with cooldown (LC 309)

Three states: **HELD** (own a share), **SOLD** (just sold - entering cooldown), **REST** (do not own, not in cooldown).

```
                     ┌─────────────────────────────┐
                     │           buy               │
                     ▼                             │
              ┌──────────┐     sell        ┌───────┴──┐
        ┌────►│  HELD    ├────────────────►│  SOLD    │
        │     └──────────┘                 └──────────┘
        │hold                                   │ cooldown ends
        │                                       ▼
        │                                 ┌──────────┐
        └─────────────────────────────────┤  REST    │◄──┐
                                          └──────────┘   │
                                               │         │ rest
                                               └─────────┘
```

**Allowed transitions (reading forward):**
- `HELD → HELD`: hold (do nothing)
- `HELD → SOLD`: sell today at `prices[i]`
- `SOLD → REST`: mandatory cooldown (no choice - the sold→rest transition is *not* optional)
- `REST → REST`: rest (do nothing)
- `REST → HELD`: buy today at `prices[i]`

**DP recurrences:**

```
dp[i][HELD] = max(dp[i-1][HELD],        ▷ hold
                  dp[i-1][REST] - price) ▷ buy (only from REST, not from SOLD)

dp[i][SOLD] = dp[i-1][HELD] + price     ▷ sell (only from HELD)

dp[i][REST] = max(dp[i-1][REST],         ▷ rest
                  dp[i-1][SOLD])          ▷ cooldown complete
```

**Answer:** `max(dp[n-1][SOLD], dp[n-1][REST])` - you cannot end holding a share.

### Step-by-step trace - `prices = [1, 2, 3, 0, 2]`

Start: `HELD = -∞, SOLD = -∞, REST = 0` (haven't bought anything; REST is the only reachable start state).

| Day | price | HELD (hold or buy from REST) | SOLD (sell from HELD) | REST (rest or cooldown from SOLD) | Invariant |
|-----|-------|-----------------------------|-----------------------|-----------------------------------|-----------|
| 0   | 1     | max(-∞, 0−1) = **−1**      | -∞ + 1 = **−∞**      | max(0, -∞) = **0**               | Can't sell yet (HELD=-1 means we bought at 1) |
| 1   | 2     | max(−1, 0−2) = **−1**      | −1+2 = **1**          | max(0, −∞) = **0**               | Sold at 2 after buying at 1 → profit 1 |
| 2   | 3     | max(−1, 0−3) = **−1**      | −1+3 = **2**          | max(0, 1) = **1**                | Cooldown from day 1's sell now clears; REST=1 |
| 3   | 0     | max(−1, 1−0) = **1**       | −1+0 = **−1**         | max(1, 2) = **2**                | Bought at 0 after cooldown cleared (REST→HELD); SOLD=2 is stale |
| 4   | 2     | max(1, 2−2) = **1**        | 1+2 = **3**           | max(2, −1) = **2**               | Sold at 2 after buying at 0 → total profit 3 |

Answer: `max(SOLD=3, REST=2) = 3`. The invariant holds at every step: HELD is only reachable from REST (never SOLD), so the cooldown constraint is enforced structurally.

**Why state machine DP and not plain DP?** The recurrence for `dp[i][HELD]` depends on whether you came from REST or SOLD - you cannot buy from SOLD. A plain `dp[i] = f(dp[i-1])` has no way to express this constraint. The state dimension carries the "memory" that makes the transition legal.

---

## Skeleton

### Pseudocode (CLRS style)

```
STATE-MACHINE-DP(values, n, states, transitions, base)
  ▷ states: list of state names, e.g. [HELD, SOLD, REST]
  ▷ transitions[s]: list of (prev_state, delta(i)) pairs that can lead into s at step i
  ▷ base: initial dp values at i = -1 or i = 0 for each state

  for each state s in states
    dp[-1][s] = base[s]              ▷ sentinel row before any element

  for i = 0 to n - 1
    for each state s in states
      dp[i][s] = -∞                  ▷ impossible until proven reachable
      for each (prev_s, delta) in transitions[s]
        if dp[i-1][prev_s] ≠ -∞
          dp[i][s] = max(dp[i][s], dp[i-1][prev_s] + delta(i))

  return max(dp[n-1][s] for each valid terminal state s)
```

### Python template

```python
def state_machine_dp(values: list[int]) -> int:
    n = len(values)
    if n == 0:
        return 0

    NEG_INF = float('-inf')

    # --- define states as indices or use a dict ---
    # Example shape: 3 states (adapt state names and count to the problem)
    HELD, SOLD, REST = 0, 1, 2
    NUM_STATES = 3

    # dp[state] = best value in that state after processing current element
    # Use rolling arrays: only previous row needed
    prev = [NEG_INF] * NUM_STATES

    # --- base case: before index 0 ---
    prev[REST] = 0       # start with no stock, not in cooldown: value 0
    # prev[HELD] = NEG_INF (impossible - haven't bought anything)
    # prev[SOLD] = NEG_INF (impossible - haven't sold anything)

    for i, val in enumerate(values):
        curr = [NEG_INF] * NUM_STATES

        # --- transitions: fill in curr from prev ---
        # your logic here: for each state, which prev states can reach it?
        curr[HELD] = max(
            prev[HELD],
            prev[REST] - val,       # buy (only legal from REST)
        )
        curr[SOLD] = prev[HELD] + val  # sell (only from HELD)
        curr[REST] = max(
            prev[REST],
            prev[SOLD],
        )

        prev = curr

    # answer: best value in any valid terminal state
    return max(prev[SOLD], prev[REST])
```

**Key rules for adapting the template:**
1. Define one constant per state; `float('-inf')` for impossible, `0` for the neutral start.
2. For each state `curr[s]`, enumerate every `prev[s']` that can transition into `s` and the delta value.
3. Use rolling arrays (`prev` / `curr`) unless you need to reconstruct the path.
4. The answer is the max over all *legal* terminal states (never a state that means "mid-action").

---

## Complexity

| Dimension | Time | Space (table) | Space (rolling) |
|---|---|---|---|
| n steps, S states | O(n · S) | O(n · S) | O(S) |
| n steps, S states, k extra dimension (e.g. transaction count) | O(n · k · S) | O(n · k · S) | O(k · S) |

**Typical values:** stock problems with 2–3 states → O(n) time, O(1) space with rolling arrays. k-transaction problems → O(n · k) time, O(k) space rolled.

**The S factor is constant:** since the number of states is fixed and small (2–5 in almost all interview problems), it drops out of the asymptotic analysis. O(n · S) = O(n) for fixed S.

**Rolling-array optimization:** the recurrence only reads `dp[i-1][*]`, never earlier rows. Replace the n×S table with two S-length arrays (`prev`, `curr`). The amortized cost is O(S) additional space regardless of n - a factor of n saving over the full table. This is nearly always the right default for state machine DP.

---

## Constraints & approach

| Input size | Context signal | Expected complexity | Reach for |
|---|---|---|---|
| n ≤ 10⁵, S ≤ 5 states | "cooldown / fee / hold-one-share" | O(n · S) = O(n) | State machine DP with rolling arrays |
| n ≤ 10⁵, k ≤ 100 transactions | "at most k transactions" | O(n · k) | State machine DP, k×2 table, rolled |
| n ≤ 10⁵, k ~ n | "at most n/2 transactions" | O(n²) - may TLE | Note: when k ≥ n/2, unlimited-transaction case applies; solve as `k = ∞` in O(n) |
| n ≤ 10³ | General DP, no state constraint | O(n²) or O(n³) | Plain DP or interval DP |
| n ≤ 20 | "every subset of decisions" | O(2ⁿ) | Bitmask DP |
| Colors/states = 3, n ≤ 10⁵ | "paint houses, adjacent different color" | O(n · colors) | State machine DP with color as state |

**Real-world usage:** Stock trading engines model "holding / not holding / in cooldown" as explicit state machines over time series data - the same HELD/SOLD/REST formulation runs in production risk systems. Game AI planners use state machine DP over player modes (attacking, defending, stunned) where mode transitions are constrained and cumulative score must be maximized. At scale: when the state count grows with input (not a fixed small S), the O(n · S) table becomes O(n²) - switch to a different DP formulation or approximate with beam search.

**Cache behavior:** The rolling-array form of state machine DP accesses two S-length arrays (`prev`, `curr`) per iteration - for S ≤ 5, both fit in a single cache line and every access is a hit. The full `n × S` table form accesses row i of a 2D array sequentially, which is stride-1 and cache-friendly (row-major layout). The k-transaction variant with an `n × k × 2` table is cache-hostile when k is large - rolling to `k × 2` (two 1D arrays) eliminates the n-dimension traversal and keeps the working set in L1.

**When NOT to use this pattern:**
- The "state" is not a small finite set of named modes - it's a numeric quantity that varies from 0 to n. That's plain DP with an extra dimension, not a state machine.
- The constraint is purely "no two adjacent" with no other history - consider greedy first (sometimes simpler).
- k is unconstrained and large (k ≥ n/2 for buy/sell): collapse the state machine to just two states (held, cash) and run the unlimited-transactions O(n) solution.

**The CP constraint-reading skill for this pattern:** look for a small vocabulary of named *modes* in the problem description, then count them. If there are 2–5 modes and the legality of each step depends on the current mode, reach for state machine DP. If the count of modes scales with n, it's a different DP formulation.

---

## Variations

| Variant | States | Key twist |
|---|---|---|
| Cooldown (LC 309) | HELD, SOLD, REST | SOLD → REST is mandatory (not optional); REST is the only buy-eligible state |
| Transaction fee (LC 714) | HELD, CASH | Fee paid on sell; only 2 states needed - no cooldown, so no REST state |
| At most k transactions (LC 188) | k × {HELD, CASH} | Add transaction index as a second dimension; k × 2 table |
| Unlimited transactions (LC 122) | HELD, CASH | Special case of transaction fee with fee=0; two-state O(n) |
| One transaction only (LC 121) | HELD, CASH | Degenerate two-state machine; equivalent to "track minimum so far" |
| Circular constraint (LC 213) | HELD, SKIP | Two runs of linear house-robber (LC 198), one excluding first house, one excluding last |
| Paint house - 3 colors (LC 256) | COLOR_0, COLOR_1, COLOR_2 | 3-state machine; transition from state s is to any state ≠ s |
| Paint house - k colors (LC 265) | k color states | Keep track of top-2 minimums per row to avoid O(n · k²); reduces to O(n · k) |

---

## CP-primitives

### 1. Rolling-array space compression: O(S) instead of O(n · S)

**The trick:** state machine DP recurrences only read `dp[i-1][*]` when computing `dp[i][*]`. Replace the full `n × S` table with two `S`-length arrays, swapping them each iteration.

**Why for CP:** for n = 10⁵ and S = 3, the full table is 300 000 integers - fine. But for k-transaction problems with n = 10⁵ and k = 10⁴, the naive table is 10⁹ integers (OOM). Rolling to `O(k · S)` = `O(2k)` fits in memory. The amortized cost of the rolling approach is O(S) extra space - constant relative to problem size.

```python
# k-transaction rolling: O(k) space instead of O(n*k)
def max_profit_k_tx(k: int, prices: list[int]) -> int:
    n = len(prices)
    if n == 0 or k == 0:
        return 0
    if k >= n // 2:
        return sum(max(0, prices[i+1] - prices[i]) for i in range(n - 1))
    # held[j] = best profit after at most j+1 buys, currently holding
    # cash[j] = best profit after at most j+1 complete transactions, not holding
    held = [float('-inf')] * k
    cash = [0] * k
    for price in prices:
        for j in range(k - 1, -1, -1):    # iterate in reverse to avoid using updated values
            cash[j] = max(cash[j], held[j] + price)
            held[j] = max(held[j], (cash[j-1] if j > 0 else 0) - price)
    return cash[-1]
```

### 2. Top-2 tracking for k-color paint house in O(n · k)

**The problem:** paint house with k colors, no two adjacent same. Naive state machine is O(n · k²) - for each house and each color, scan all k-1 other colors. When k = 100 and n = 10⁵, this is 10⁹ operations: TLE.

**The trick:** for each row, instead of storing all k costs, track only the **two smallest costs and their color indices** (the minimum and the second-minimum). For any color c at house i+1, the cheapest previous color is either the global min (if it's a different color) or the second-global-min. Look-up is O(1) per color instead of O(k).

**Why for CP:** reduces paint-house-k from O(n · k²) to O(n · k) - a factor of k improvement, critical when k is large.

```python
def min_cost_k_colors(costs: list[list[int]]) -> int:
    # costs[i][j] = cost to paint house i with color j
    n, k = len(costs), len(costs[0])
    if n == 0:
        return 0
    prev_min1 = prev_min2 = (0, -1)   # (cost, color_idx); -1 = no color constraint
    for i in range(n):
        cur_min1 = cur_min2 = (float('inf'), -1)
        for c in range(k):
            prev = prev_min1[0] if prev_min1[1] != c else prev_min2[0]
            total = costs[i][c] + prev
            if total <= cur_min1[0]:
                cur_min2 = cur_min1
                cur_min1 = (total, c)
            elif total < cur_min2[0]:
                cur_min2 = (total, c)
        prev_min1, prev_min2 = cur_min1, cur_min2
    return prev_min1[0]
```

### 3. Profile DP: state = bitmask of last row (grid tiling problems)

**The problem:** tile an n × m grid with dominoes. Naively O(2^(n·m)). With profile DP: the "state" at column j is the bitmask of which cells in column j are already filled by tiles starting in column j-1. Only the last row's profile matters for valid transitions.

**Why for CP:** transforms a 2D tiling problem into a state machine over columns where state = bitmask of row coverage (2^n states). For n ≤ 10, this is 1024 states - tractable even with n · 2^n · 2^n transitions. The key is that "past column j-1" is fully summarized by the profile - no need to remember deeper history.

**Signal to use it:** grid problem, n or m ≤ 20, question about tilings/placements. State = bitmask of last column profile.

```python
def domino_tiling(n: int, m: int) -> int:
    """Count ways to tile an n-row × m-col grid with 1×2 dominoes."""
    # profile DP: dp[mask] = ways to reach this column where `mask` encodes
    # which rows of the current column are already filled by a horizontal
    # domino extending from the previous column.

    def place(row: int, in_mask: int, out_mask: int, ways: int,
              nxt: dict[int, int]) -> None:
        # in_mask:  rows pre-filled in this column (from left neighbour)
        # out_mask: rows pre-filled in NEXT column (horizontal placed now)
        if row == n:
            nxt[out_mask] = nxt.get(out_mask, 0) + ways
            return
        if (in_mask >> row) & 1:
            place(row + 1, in_mask, out_mask, ways, nxt)      # already filled
        else:
            # horizontal: fills this row here + same row in next column
            place(row + 1, in_mask, out_mask | (1 << row), ways, nxt)
            # vertical: fills this row + row+1 here (both must be free in in_mask)
            if row + 1 < n and not ((in_mask >> (row + 1)) & 1):
                place(row + 2, in_mask, out_mask, ways, nxt)

    dp: dict[int, int] = {0: 1}
    for _ in range(m):
        nxt: dict[int, int] = {}
        for mask, ways in dp.items():
            place(0, mask, 0, ways, nxt)
        dp = nxt

    return dp.get(0, 0)  # mask=0: no overhang beyond the last column
```

`dp[mask]` holds the count of ways to complete all columns so far, given that `mask` describes which rows of the next column are pre-filled by a horizontal domino. `place` recurses row-by-row within a column, choosing horizontal (fills this cell + marks next column) or vertical (fills two rows here) for each free row. After processing all m columns, only `mask=0` is valid - no domino extends beyond the grid.


## Worked problems

### 1. Best Time to Buy and Sell Stock with Cooldown (LC 309)

Given daily stock prices, find the maximum profit with unlimited transactions, but after selling you must wait one day (cooldown) before buying again. Constraints: `1 ≤ n ≤ 5000`.

**Approach:** Three-state machine: HELD (own stock), SOLD (just sold - in cooldown), REST (free to buy). `dp[i][HELD] = max(hold, buy from REST)`. `dp[i][SOLD] = sell from HELD`. `dp[i][REST] = max(rest, cooldown from SOLD)`. The crucial trap: you can only buy from REST, not from SOLD. Apply rolling arrays for O(1) space.

**Complexity:** O(n) time, O(1) space.

**Duplicate problems:**
- Best Time to Buy and Sell Stock (LC 121) - degenerate one-transaction two-state machine.
- Best Time to Buy and Sell Stock II (LC 122) - unlimited transactions, no cooldown; two-state (HELD, CASH), simpler recurrence.

---

### 2. Best Time to Buy and Sell Stock with Transaction Fee (LC 714)

Given daily prices and a transaction fee paid on each sell, find the maximum profit with unlimited transactions. Constraints: `1 ≤ n ≤ 5×10⁴`, `0 ≤ fee ≤ 5×10⁴`.

**Approach:** Two-state machine: HELD, CASH. No cooldown, so no REST state needed. `dp[i][HELD] = max(hold, buy from CASH)`. `dp[i][CASH] = max(rest, sell from HELD - fee)`. The fee is deducted at sell time, making it equivalent to reducing the sell price. Because there are only two states, this reduces to two scalar variables and O(1) space naturally.

**Complexity:** O(n) time, O(1) space.

**Duplicate problems:**
- Best Time to Buy and Sell Stock II (LC 122) - same two-state machine with fee = 0.

---

### 3. Best Time to Buy and Sell Stock IV - At Most k Transactions (LC 188)

Given daily prices and integer k, find the maximum profit with at most k complete transactions (buy then sell = one transaction). Constraints: `1 ≤ k ≤ 100`, `1 ≤ n ≤ 1000`.

**Approach:** State machine over `(transaction_count, {HELD, CASH})`. Table is `k × 2`. `held[j]` = best profit using at most `j+1` buys, currently holding. `cash[j]` = best profit after at most `j+1` complete transactions, not holding. Critical: when `k ≥ n/2`, every price uptick is capturable - solve as unlimited transactions in O(n), bypassing the k-loop entirely. Iterate j in reverse order within each price step to avoid using updated-in-same-pass values.

**Complexity:** O(n · k) time, O(k) space (rolling).

**Duplicate problems:**
- Best Time to Buy and Sell Stock III (LC 123) - k=2 special case; can hard-code `buy1, sell1, buy2, sell2` scalars.

---

### 4. House Robber II (LC 213)

Houses are arranged in a **circle** - first and last are adjacent. You cannot rob adjacent houses. Find maximum money. Constraints: `1 ≤ n ≤ 100`, values `0 ≤ val ≤ 1000`.

**Approach:** The circular constraint means "can't rob both house 0 and house n-1." Decompose into two independent linear state machines: run House Robber I on `houses[0..n-2]` (exclude last) and on `houses[1..n-1]` (exclude first). Answer is the max of the two. Each linear run is a two-state machine: ROB, SKIP. `dp[i][ROB] = dp[i-1][SKIP] + val[i]`. `dp[i][SKIP] = max(dp[i-1][ROB], dp[i-1][SKIP])`.

**Complexity:** O(n) time, O(1) space (two scalar rolls per linear run).

**Duplicate problems:**
- House Robber (LC 198) - linear version; no circular split needed.
- House Robber III (LC 337) - tree structure; same ROB/SKIP states, DP on tree nodes via DFS.

---

### 5. Paint House (LC 256)

Given `n` houses and `costs[i][j]` (cost to paint house `i` with color `j`, three colors), paint all houses so no two adjacent houses have the same color. Minimize total cost. Constraints: `n ≤ 100`.

**Approach:** Three-state machine: COLOR_0, COLOR_1, COLOR_2. `dp[i][c] = costs[i][c] + min(dp[i-1][c'] for c' ≠ c)`. At each step, the cheapest previous color is one of the other two - no scanning needed. Roll to O(1) space with three scalars. The pattern generalizes: for k colors, track top-2 minimums (see CP-primitives).

**Complexity:** O(n · colors) = O(n) time (colors = 3, constant), O(1) space.

**Duplicate problems:**
- Paint House II (LC 265) - k colors; use top-2 minimum tracking for O(n · k) instead of O(n · k²).
- Non-Adjacent Color Assignment (various) - same 3-state structure with different cost matrix shapes.

---

## Pitfalls

1. **Buying from SOLD in cooldown problems.** The cooldown rule means SOLD → REST is *mandatory* and REST is the *only* state from which you can buy. Writing `dp[i][HELD] = max(prev[HELD], prev[SOLD] - price)` is wrong - you can't buy immediately after selling. The correct recurrence is `dp[i][HELD] = max(prev[HELD], prev[REST] - price)`. This is the single most common bug in LC 309.

2. **Treating "sold → rest" as optional.** After a sell you *must* enter REST (cooldown). It is not a choice. Students sometimes model SOLD as a state you can voluntarily stay in - but the machine forces REST at `i+1` regardless. If your transition table allows `SOLD → SOLD`, it's wrong.

3. **Off-by-one in k-transaction count.** Confusing "at most k transactions" with "at most k buys". One buy + one sell = one transaction. Starting `held[j]` as "best profit after j+1 buys" and `cash[j]` as "after j+1 complete transactions" must be consistent. The k=0 base case must correctly return 0.

4. **Not short-circuiting when k ≥ n/2.** The k-transaction O(n·k) loop becomes O(n²) when k ~ n. For `k ≥ n//2`, every price uptick is independently exploitable - switch to the unlimited-transaction greedy scan and return in O(n). Forgetting this causes TLE on LC 188 with large k inputs.

5. **Initializing impossible states to 0 instead of −∞.** A state that hasn't been reached yet should be `float('-inf')`, not `0`. Setting `held = 0` before any buy has happened implies you're "holding for free" - every `max(held, ...)` call will propagate this phantom profit through the DP. Initialize: only the reachable start states get `0`; all others get `float('-inf')`.

---

## First 30 seconds

*"State machine DP. I see a finite set of named modes - [list them]. Decisions at each step are constrained by which mode I'm in. I'll define `dp[i][state]` = best value at step i in that state, write the allowed transitions, and roll to O(states) space. Let me name the states and draw the transition arrows first."*

Then: enumerate every (prev_state → curr_state) edge, name the cost/gain on each edge, and you have the recurrence. The code falls out of the transition diagram.

---

## Related

- [Dynamic Programming](../algorithms/dynamic-programming.md) - the foundational technique; state machine DP is a specialization with explicit transition constraints
- [DP Patterns](./dp-patterns.md) - survey of DP pattern types; state machine DP is the "multiple explicit states" branch
- [Bitmask DP](./bitmask-dp.md) - reach for when state count is exponential (subsets); state machine DP is for small, named, enumerable states
- [Backtracking](./backtracking.md) - explores all transitions without memoization; state machine DP memoizes `(index, state)` pairs to avoid re-exploration

---

## Practice problems

### 1. Delete and Earn (LC 740)

You are given an integer array `nums`. Each time you pick a number `nums[i]`, you delete every element equal to `nums[i] - 1` and `nums[i] + 1` from the array, and earn `nums[i]` points. Return the maximum points you can earn. Constraints: `1 ≤ nums.length ≤ 2×10⁴`, `1 ≤ nums[i] ≤ 10⁴`.

**Approach:** The non-obvious move is the reframe: picking all copies of value `v` earns `v × count(v)` points and blocks values `v-1` and `v+1` - identical to house robber on an array indexed by value. Build a `points[v] = v × count(v)` array over the value range, then run a two-state machine (TAKE, SKIP) over it. `take = skip_prev + points[v]`; `skip = max(take_prev, skip_prev)`. The state machine encodes the adjacency constraint implicitly via the value-indexed array.

```python
from collections import Counter

def delete_and_earn(nums: list[int]) -> int:
    if not nums:
        return 0
    count = Counter(nums)
    max_val = max(count)
    points = [v * count[v] for v in range(max_val + 1)]
    take = skip = 0
    for p in points:
        take, skip = skip + p, max(take, skip)
    return max(take, skip)
```

**Complexity:** O(n + k) time where k = max value, O(k) space for the points array.

**Duplicate problems:**
- House Robber (LC 198) - the linear two-state machine this reduces to; same TAKE/SKIP recurrence, direct application.
- House Robber II (LC 213) - circular adjacency constraint; split into two linear runs of the same machine.

---

### 2. Paint Fence (LC 276)

There are `n` fence posts and `k` colors. Paint every post so that no more than two adjacent posts have the same color. Return the number of ways to paint. Constraints: `1 ≤ n ≤ 50`, `1 ≤ k ≤ 10⁵`.

**Approach:** Two-state machine over posts: SAME (current post same color as previous) and DIFF (different). `same[i]` = ways where post i matches post i-1 = `diff[i-1]` (you can only continue a same-run from a diff transition - running three same in a row is illegal). `diff[i]` = ways where post i differs = `(same[i-1] + diff[i-1]) × (k-1)` (any prior state, any of k-1 other colors). The state machine enforces the "no three consecutive same" constraint without explicit look-back.

```python
def num_ways(n: int, k: int) -> int:
    if n == 0:
        return 0
    if n == 1:
        return k
    same, diff = k, k * (k - 1)   # base: 2 posts
    for _ in range(n - 2):
        same, diff = diff, (same + diff) * (k - 1)
    return same + diff
```

**Complexity:** O(n) time, O(1) space.

**Duplicate problems:**
- Paint House (LC 256) - 3-color state machine with costs; same structure, adds min-cost objective.
- Paint House II (LC 265) - k-color variant; same pattern, top-2 minimum tracking for O(n·k).

---

### 3. Best Time to Buy and Sell Stock with Transaction Fee (LC 714)

Given daily stock `prices` and a `fee` paid per transaction (on sell), find the maximum profit with unlimited transactions. You may not hold more than one share at a time. Constraints: `1 ≤ n ≤ 5×10⁴`, `0 ≤ fee ≤ 5×10⁴`.

**Approach:** Two-state machine: HELD (own a share) and CASH (free). No cooldown means no third state needed. `held = max(held, cash - price)` (hold or buy); `cash = max(cash, held + price - fee)` (rest or sell minus fee). Fee deducted at sell time is equivalent to reducing the effective sell price - the two-state machine handles it naturally without restructuring. Both states update from the *previous* iteration's values; the tuple-assignment trick ensures no intra-step contamination.

```python
def max_profit_with_fee(prices: list[int], fee: int) -> int:
    held, cash = float('-inf'), 0
    for price in prices:
        held, cash = (
            max(held, cash - price),
            max(cash, held + price - fee),
        )
    return cash
```

**Complexity:** O(n) time, O(1) space.

**Duplicate problems:**
- Best Time to Buy and Sell Stock II (LC 122) - same two-state machine with fee=0; pure greedy on positive deltas also works.
- Best Time to Buy and Sell Stock with Cooldown (LC 309) - adds a REST state for the cooldown constraint; three-state version of this machine.
