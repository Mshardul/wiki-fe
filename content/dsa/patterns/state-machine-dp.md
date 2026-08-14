# State Machine DP

## Prerequisites

- [Dynamic Programming](../algorithms/dynamic-programming.md) [Must read]
- [DP Patterns](./dp-patterns.md) [Must read]
- [Hash Table](../data-structures/hash-table.md) [Must read]

## Table of Contents

- [What it is](#what-it-is)
- [Recognition signals](#recognition-signals)
- [How it works](#how-it-works)
  - [Step-by-step trace](#step-by-step-trace--prices--1-2-3-0-2)
- [Complexity](#complexity)
- [Constraints & approach](#constraints--approach)
- [Variations](#variations)
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

### State-transition diagram - buy/hold/sell with a mandatory cooldown after selling

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

Answer: `max(SOLD=3, REST=2) = 3`. The <abbr>invariant</abbr> holds at every step: HELD is only reachable from REST (never SOLD), so the cooldown constraint is enforced structurally.

**Why state machine DP and not plain DP?** The recurrence for `dp[i][HELD]` depends on whether you came from REST or SOLD - you cannot buy from SOLD. A plain `dp[i] = f(dp[i-1])` has no way to express this constraint. The state dimension carries the "memory" that makes the transition legal.

---

## Complexity

| Dimension | Time | Space (table) | Space (rolling) |
|---|---|---|---|
| n steps, S states | O(n · S) | O(n · S) | O(S) |
| n steps, S states, k extra dimension (e.g. transaction count) | O(n · k · S) | O(n · k · S) | O(k · S) |

**Typical values:** stock problems with 2–3 states → O(n) time, O(1) space with rolling arrays. k-transaction problems → O(n · k) time, O(k) space rolled.

**The S factor is constant:** since the number of states is fixed and small (2–5 in almost all interview problems), it drops out of the asymptotic analysis. O(n · S) = O(n) for fixed S.

**Rolling-array optimization:** the recurrence only reads `dp[i-1][*]`, never earlier rows. Replace the n×S table with two S-length arrays (`prev`, `curr`). The <abbr>amortized</abbr> cost is O(S) additional space regardless of n - a factor of n saving over the full table. This is nearly always the right default for state machine DP.

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

**Cache behavior:** The rolling-array form of state machine DP accesses two S-length arrays (`prev`, `curr`) per iteration - for S ≤ 5, both fit in a single cache line and every access is a hit. The full `n × S` table form accesses row i of a 2D array sequentially, which is stride-1 and <abbr>cache-friendly</abbr> (row-major layout). The k-transaction variant with an `n × k × 2` table is cache-hostile when k is large - rolling to `k × 2` (two 1D arrays) eliminates the n-dimension traversal and keeps the working set in L1.

**When NOT to use this pattern:**
- The "state" is not a small finite set of named modes - it's a numeric quantity that varies from 0 to n. That's plain DP with an extra dimension, not a state machine.
- The constraint is purely "no two adjacent" with no other history - consider <abbr>greedy</abbr> first (sometimes simpler).
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
- [Backtracking](./backtracking.md) - explores all transitions without <abbr>memoization</abbr>; state machine DP memoizes `(index, state)` pairs to avoid re-exploration

---

## Practice problems

### 1. Best Time to Buy and Sell Stock with Cooldown (LC 309)

Given daily stock prices, find the maximum profit with unlimited transactions, but after selling you must wait one day (cooldown) before buying again. Constraints: `1 ≤ n ≤ 5000`.

**Worked examples:**
- **Example 1**
  - **Input:** prices = [1,2,3,0,2] | **Output:** 3
  - **Explanation:** buy at 1, sell at 2 (profit 1), cooldown, buy at 0, sell at 2 (profit 2); total 3.
- **Example 2**
  - **Input:** prices = [1] | **Output:** 0

**Constraints:** `1 ≤ prices.length ≤ 5000`, `0 ≤ prices[i] ≤ 1000`.

**Approach.** Three-state machine: HELD (own stock), SOLD (just sold - in cooldown), REST (free to buy). `dp[i][HELD] = max(hold, buy from REST)`. `dp[i][SOLD] = sell from HELD`. `dp[i][REST] = max(rest, cooldown from SOLD)`. The crucial trap: you can only buy from REST, not from SOLD. Apply rolling arrays for O(1) space.

```python
def max_profit_cooldown(prices: list[int]) -> int:
    held, sold, rest = float("-inf"), 0, 0
    for price in prices:
        held, sold, rest = max(held, rest - price), held + price, max(rest, sold)
    return max(sold, rest)
```

**Complexity.** O(n) time, O(1) space.

**Duplicate problems:**
- Best Time to Buy and Sell Stock (LC 121) - degenerate one-transaction two-state machine.
- Best Time to Buy and Sell Stock II (LC 122) - unlimited transactions, no cooldown; two-state (HELD, CASH), simpler recurrence.
- Best Time to Buy and Sell Stock with Transaction Fee (LC 714) - two-state (HELD, CASH) with a fee subtracted at sell instead of a REST state; no cooldown needed.

---

### 2. Best Time to Buy and Sell Stock IV - At Most k Transactions (LC 188)

Given daily prices and integer k, find the maximum profit with at most k complete transactions (buy then sell = one transaction). Constraints: `1 ≤ k ≤ 100`, `1 ≤ n ≤ 1000`.

**Worked examples:**
- **Example 1**
  - **Input:** k = 2, prices = [2,4,1] | **Output:** 2
  - **Explanation:** buy at 2, sell at 4, profit 2; only one profitable transaction exists.
- **Example 2**
  - **Input:** k = 2, prices = [3,2,6,5,0,3] | **Output:** 7
  - **Explanation:** buy at 2 sell at 6 (profit 4), buy at 0 sell at 3 (profit 3); total 7.

**Constraints:** `1 ≤ k ≤ 100`, `1 ≤ prices.length ≤ 1000`, `0 ≤ prices[i] ≤ 1000`.

**Approach.** State machine over `(transaction_count, {HELD, CASH})`. Table is `k × 2`. `held[j]` = best profit using at most `j+1` buys, currently holding. `cash[j]` = best profit after at most `j+1` complete transactions, not holding. Critical: when `k ≥ n/2`, every price uptick is capturable - solve as unlimited transactions in O(n), bypassing the k-loop entirely. Iterate j in reverse order within each price step to avoid using updated-in-same-pass values.

```python
def max_profit_k_transactions(k: int, prices: list[int]) -> int:
    n = len(prices)
    if n == 0 or k == 0:
        return 0
    if k >= n // 2:
        return sum(max(0, prices[i + 1] - prices[i]) for i in range(n - 1))
    held = [float("-inf")] * k
    cash = [0] * k
    for price in prices:
        for j in range(k - 1, -1, -1):
            cash[j] = max(cash[j], held[j] + price)
            held[j] = max(held[j], (cash[j - 1] if j > 0 else 0) - price)
    return cash[-1]
```

**Complexity.** O(n · k) time, O(k) space (rolling).

**Duplicate problems:**
- Best Time to Buy and Sell Stock III (LC 123) - k=2 special case; can hard-code `buy1, sell1, buy2, sell2` scalars.

---

### 3. House Robber II (LC 213)

Houses are arranged in a **circle** - first and last are adjacent. You cannot rob adjacent houses. Find maximum money. Constraints: `1 ≤ n ≤ 100`, values `0 ≤ val ≤ 1000`.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [2,3,2] | **Output:** 3
  - **Explanation:** robbing house 0 and house 2 is illegal (circular adjacency), so the best is house 1 alone.
- **Example 2**
  - **Input:** nums = [1,2,3,1] | **Output:** 4
  - **Explanation:** rob houses 0 and 2 for 1+3=4.

**Constraints:** `1 ≤ nums.length ≤ 100`, `0 ≤ nums[i] ≤ 1000`.

**Approach.** The circular constraint means "can't rob both house 0 and house n-1." Decompose into two independent linear state machines: run House Robber I on `houses[0..n-2]` (exclude last) and on `houses[1..n-1]` (exclude first). Answer is the max of the two. Each linear run is a two-state machine: ROB, SKIP. `dp[i][ROB] = dp[i-1][SKIP] + val[i]`. `dp[i][SKIP] = max(dp[i-1][ROB], dp[i-1][SKIP])`.

```python
def rob_circular(nums: list[int]) -> int:
    if len(nums) == 1:
        return nums[0]

    def rob_linear(houses: list[int]) -> int:
        rob = skip = 0
        for val in houses:
            rob, skip = skip + val, max(rob, skip)
        return max(rob, skip)

    return max(rob_linear(nums[:-1]), rob_linear(nums[1:]))
```

**Complexity.** O(n) time, O(1) space (two scalar rolls per linear run).

**Duplicate problems:**
- House Robber (LC 198) - linear version; no circular split needed.
- House Robber III (LC 337) - tree structure; same ROB/SKIP states, DP on tree nodes via DFS.
- Delete and Earn (LC 740) - reframes to linear House Robber on a value-indexed points array (picking value `v` blocks `v-1` and `v+1`); same TAKE/SKIP recurrence.

---

### 4. Paint House (LC 256)

Given `n` houses and `costs[i][j]` (cost to paint house `i` with color `j`, three colors), paint all houses so no two adjacent houses have the same color. Minimize total cost. Constraints: `n ≤ 100`.

**Worked examples:**
- **Example 1**
  - **Input:** costs = [[17,2,17],[16,16,5],[14,3,19]] | **Output:** 10
  - **Explanation:** paint house 0 blue (2), house 1 green (5), house 2 blue (3); total 10.
- **Example 2**
  - **Input:** costs = [[7,6,2]] | **Output:** 2

**Constraints:** `1 ≤ n ≤ 100`, `costs.length == n`, `costs[i].length == 3`, `1 ≤ costs[i][j] ≤ 20`.

**Approach.** Three-state machine: COLOR_0, COLOR_1, COLOR_2 - the state is *which specific color* the current house is painted, an absolute label. `dp[i][c] = costs[i][c] + min(dp[i-1][c'] for c' ≠ c)`. At each step, the cheapest previous color is one of the other two - no scanning needed. Roll to O(1) space with three scalars. The pattern generalizes: for k colors, track top-2 minimums instead of scanning all k-1 rivals (see Problem 6, Paint House II, below).

```python
def min_cost_paint_house(costs: list[list[int]]) -> int:
    c0, c1, c2 = costs[0]
    for i in range(1, len(costs)):
        c0, c1, c2 = (
            costs[i][0] + min(c1, c2),
            costs[i][1] + min(c0, c2),
            costs[i][2] + min(c0, c1),
        )
    return min(c0, c1, c2)
```

**Complexity.** O(n · colors) = O(n) time (colors = 3, constant), O(1) space.


---

### 5. Paint Fence (LC 276)

There are `n` fence posts and `k` colors. Paint every post so that no more than two adjacent posts have the same color. Return the number of ways to paint. Constraints: `1 ≤ n ≤ 50`, `1 ≤ k ≤ 10⁵`.

**Worked examples:**
- **Example 1**
  - **Input:** n = 3, k = 2 | **Output:** 6
- **Example 2**
  - **Input:** n = 1, k = 1 | **Output:** 1

**Constraints:** `1 ≤ n ≤ 50`, `1 ≤ k ≤ 10⁵`.

**Approach.** Two-state machine over posts: SAME (current post same color as previous) and DIFF (different) - a **relative** state, unlike Paint House's absolute per-color state. This is the key distinction: Paint Fence's state count stays fixed at 2 regardless of k, because it tracks the *relationship* to the previous post, not which specific color was used. `same[i]` = ways where post i matches post i-1 = `diff[i-1]` (you can only continue a same-run from a diff transition - running three same in a row is illegal). `diff[i]` = ways where post i differs = `(same[i-1] + diff[i-1]) × (k-1)` (any prior state, any of k-1 other colors). The state machine enforces the "no three consecutive same" constraint without explicit look-back.

```python
def num_ways_fence(n: int, k: int) -> int:
    if n == 0:
        return 0
    if n == 1:
        return k
    same, diff = k, k * (k - 1)   # base: 2 posts
    for _ in range(n - 2):
        same, diff = diff, (same + diff) * (k - 1)
    return same + diff
```

**Complexity.** O(n) time, O(1) space.

**Duplicate problems:** none - the relative-state (same/different) design is distinct from every other entry in this file, which all track absolute state.

---

### 6. Paint House II (LC 265)

Given `n` houses and `costs[i][j]` (cost to paint house `i` with color `j`, `k` colors), paint all houses so no two adjacent houses share a color, minimizing total cost. Constraints: `1 ≤ n ≤ 100`, `2 ≤ k ≤ 100`.

**Worked examples:**
- **Example 1**
  - **Input:** costs = [[1,5,3],[2,9,4]] | **Output:** 5
  - **Explanation:** paint house 0 with color 0 (cost 1), house 1 with color 2 (cost 4); total 5.
- **Example 2**
  - **Input:** costs = [[1,3]] | **Output:** 1

**Constraints:** `1 ≤ n ≤ 100`, `1 ≤ k ≤ 100`, `1 ≤ costs[i][j] ≤ 20`.

**Approach.** This is Paint House's k-state machine, but the naive per-house scan of "cheapest color other than mine" is O(k) per color, giving O(n·k²) overall - at k = 100 that's 10⁶ per test, still fine here, but the technique that removes the k² factor entirely is the CP-relevant one: track only the two smallest total costs from the previous row (and which color index produced the smaller one). For any color `c` at the current house, the best previous cost is the row minimum if `c` didn't produce it, otherwise the second-smallest. This turns the O(k) inner lookup into O(1), collapsing the whole DP to O(n·k). Distinct from Paint House (k=3): here `k` is large enough that the k² factor actually matters, so the top-2 compression is the point of the problem, not an incidental optimization.

```python
def min_cost_ii(costs: list[list[int]]) -> int:
    n, k = len(costs), len(costs[0])
    if n == 0:
        return 0
    prev_min1 = prev_min2 = (0, -1)   # (cost, color_idx); -1 = no color yet
    for i in range(n):
        cur_min1 = cur_min2 = (float("inf"), -1)
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

**Complexity.** O(n·k) time, O(1) space (rolling top-2 pair).

---

### 7. Domino Tiling of a Grid

Given an `n × m` grid (`n` small, `m` up to 1000), count the number of ways to fully tile it with 1×2 dominoes (horizontal or vertical placement), modulo `10⁹+7`. Constraints: `1 ≤ n ≤ 11`, `1 ≤ m ≤ 1000`.

**Worked examples:**
- **Example 1**
  - **Input:** n = 2, m = 2 | **Output:** 2
  - **Explanation:** two vertical dominoes, or two horizontal dominoes - 2 tilings.
- **Example 2**
  - **Input:** n = 1, m = 2 | **Output:** 1
  - **Explanation:** a single 1×2 grid has exactly one horizontal-domino tiling.

**Constraints:** `1 ≤ n ≤ 11`, `1 ≤ m ≤ 1000` (grid area up to ~10⁴, but naive enumeration is exponential in area).

**Approach.** A grid-tiling state machine where the "state" isn't a small fixed label but a **bitmask profile**: at each column boundary, the state records which rows of the next column are already pre-filled by a horizontal domino placed from the current column. This is a genuinely different flavor of state machine DP from the rest of this article - the state count is `2ⁿ` (exponential in the grid height, not a constant 2-5), which is exactly the boundary condition this pattern's Recognition signals section calls out for reaching for [Bitmask DP](./bitmask-dp.md) instead. It's included here because the *transition* discipline (define named states, enumerate legal transitions, DP over state × position) is identical to the rest of the article even though the state space itself is exponential - recognizing when "state machine" tips into "profile/bitmask DP" is itself a CP-reading skill worth having anchored to a concrete problem.

```python
MOD = 10**9 + 7

def count_tilings(n: int, m: int) -> int:
    def place(row: int, in_mask: int, out_mask: int, ways: int, nxt: dict[int, int]) -> None:
        if row == n:
            nxt[out_mask] = (nxt.get(out_mask, 0) + ways) % MOD
            return
        if (in_mask >> row) & 1:
            place(row + 1, in_mask, out_mask, ways, nxt)
        else:
            place(row + 1, in_mask, out_mask | (1 << row), ways, nxt)
            if row + 1 < n and not ((in_mask >> (row + 1)) & 1):
                place(row + 2, in_mask, out_mask, ways, nxt)

    dp: dict[int, int] = {0: 1}
    for _ in range(m):
        nxt: dict[int, int] = {}
        for mask, ways in dp.items():
            place(0, mask, 0, ways, nxt)
        dp = nxt
    return dp.get(0, 0)
```

**Complexity.** O(m · 3ⁿ) time (each column's profile transition branches roughly 2-3 ways per row), O(2ⁿ) space for the state dictionary.

**Duplicate problems:** none - this is the article's sole bitmask-profile entry, included as the recognition boundary against [Bitmask DP](./bitmask-dp.md) rather than as a duplicate of a named-state problem.
