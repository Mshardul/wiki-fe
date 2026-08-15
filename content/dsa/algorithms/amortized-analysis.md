# Amortized Analysis

## Prerequisites

- [Dynamic Array](../data-structures/dynamic-array.md) [Should read]
- [Big-O Notation](./big-o-notation.md) [Must read]

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
- [State & recurrence](#state--recurrence)
- [Edge cases](#edge-cases)
- [Implementation](#implementation)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

## What it is

**Amortized analysis** is a technique for bounding the *average* cost of an operation over a worst-case sequence of operations, when individual operations vary wildly in cost but expensive ones are provably rare.

**Mental model: a subscription, not a per-visit fee.** A gym that charges $50/visit is expensive per visit. A gym with a $30/month membership averages far less per visit if you go often - even though the *month's bill* (paid all at once) looks like one big expensive event. Amortized cost is the membership fee, spread evenly: an occasional O(n) operation (the resize) gets divided across the many O(1) operations (the appends) that earned it, so the *sequence* average is small even though no single operation is uniformly cheap.

> **Takeaway (say this out loud):** "Amortized O(1) doesn't mean every operation is O(1) - it means the total cost of any n operations is O(n), so the average per operation is O(1), even though a single operation can spike to O(n)."

## Intuition

Worst-case-per-operation analysis asks "what's the most this single call can cost?" and answers pessimistically every time, even when that worst case can't repeat back-to-back. A dynamic array's `append` is O(n) on a resize call - but the *next* n-1 appends are all O(1), because the array just got twice as much room. Analyzing each call in isolation and taking the max (O(n) per append, always) massively overstates the real cost of using the structure, because it ignores that expensive calls *pay for* the cheap ones that follow by leaving behind spare capacity.

Amortized analysis works because it analyzes the *sequence*, not the *call*. It asks "what's the total cost of n calls?" and divides by n - which is mathematically sound precisely because the structure has an invariant (spare capacity, a bounded potential) that ties consecutive operations together. Without that invariant, amortization is meaningless - you can't amortize costs across operations on unrelated, independent inputs.

## How it works

There are three standard proof techniques, in increasing order of formal rigor. All three must arrive at the same bound for a correct analysis - they're different lenses on the same underlying argument, not competing answers.

**1. Aggregate method.** Directly sum the total cost of n operations and divide by n. Simplest, but only works when every operation sequence looks alike (no per-operation choice of "type" that changes the pattern).

**2. Accounting (banker's) method.** Assign each operation an *amortized charge* - possibly more than its actual immediate cost - and bank the surplus as "credit" stored on the data structure's elements. Later, expensive operations withdraw from that stored credit instead of being charged their full real cost. The bound holds if credit never goes negative (you never withdraw more than was banked).

**3. Potential method.** Define a potential function `Φ` mapping the data structure's state to a non-negative number (informally: "how much stored-up work is latent in the current state"). The amortized cost of an operation is `real_cost + Φ(after) - Φ(before)` - the operation's real cost plus how much it changed the potential. This is the most general and rigorous of the three; the accounting method is a special case where the "bank credit" *is* the potential function made concrete.

```
Aggregate:    amortized_cost = (Σ real_cost of n ops) / n
Accounting:   amortized_cost_i = real_cost_i + credit_charged_i - credit_used_i     (credit balance ≥ 0 always)
Potential:    amortized_cost_i = real_cost_i + Φ(state_i) - Φ(state_i-1)             (Φ(state_0) = 0, Φ(state) ≥ 0 always)
```

**Trace: 8 appends into an initially-empty dynamic array (capacity starts at 1, doubles on resize).** Every append is charged amortized cost 3, regardless of its real cost; the running total of charges must stay ≥ the running total of real cost, or the accounting is broken:

```
append #        1    2    3    4    5    6    7    8
size             1    2    3    4    5    6    7    8
capacity          1    2    4    4    8    8    8    8
real cost         1    2    3    1    5    1    1    1   ← resize copies old size, then +1 for the new element
                       ↑resize   ↑resize   ↑resize
cumulative real    1    3    6    7   12   13   14   15
cumulative charged 3    6    9   12   15   18   21   24   ← 3 × append number
credit balance     2    3    3    5    3    5    7    9   ← cumulative charged − cumulative real, stays > 0 throughout
```

Appends #2, #3, and #5 trigger a resize (capacity was full): append #2 copies the 1 existing element then inserts the new one (`1 + 1 = 2`); append #3 copies 2 elements (`2 + 1 = 3`); append #5 copies 4 elements (`4 + 1 = 5`). Resizes get rarer (every 1, then 2, then 4 appends) exactly as costlier (copying 1, then 2, then 4 elements) - the geometric-series argument from [Complexity derivation](#complexity-derivation) in miniature. The credit balance row never drops to 0 or below, confirming the accounting invariant holds across this trace: the fixed charge of 3 per append is always enough to cover the real cost incurred so far, banking the surplus for the next resize to spend.

## Correctness / invariant

The proof obligation differs by method, but all three share the same shape: show that a quantity which *could* go negative (leftover credit, or `Φ`) never does, and that it starts at zero.

**Accounting method - the invariant to prove:** `credit_balance ≥ 0` after every operation, for every possible sequence. If operation *i* is charged `amortized_cost_i` but really costs `real_cost_i`, the surplus `amortized_cost_i - real_cost_i` is banked; a later operation may spend banked credit to cover a real cost that exceeds its own amortized charge. The proof is an induction: base case (empty structure, zero credit, trivially ≥ 0), inductive step (assume credit ≥ 0 before operation *i*, show it's still ≥ 0 after, for every operation type the structure supports).

**Potential method - the invariant to prove:** `Φ(state) ≥ 0` for every reachable state, and `Φ(state_0) = 0`. Since `Σ amortized_cost_i = Σ real_cost_i + Φ(state_n) - Φ(state_0) = Σ real_cost_i + Φ(state_n)`, and `Φ(state_n) ≥ 0`, the sum of amortized costs is an upper bound on the sum of real costs - which is the entire point (the amortized bound you compute is a *provable ceiling* on the true total, not just a plausible estimate).

**Both methods require checking every operation the structure supports**, not just the common case - an inductive proof that only covers "append when there's room" and skips "append when resize is triggered" isn't a proof.

## Complexity derivation

**Worked example: dynamic array doubling, via the accounting method.** Charge every `append` an amortized cost of **3** (in units of "array-slot writes"), regardless of whether it triggers a resize:

- **1 unit** pays for writing the new element itself.
- **2 units** are banked as credit *on that element*, to be spent later when it gets copied during a future resize.

**Claim: this charge is always enough.** When a resize triggers at size `n` (array was full, now doubling to capacity `2n`), the resize must copy all `n` existing elements - a real cost of `n`. Where does that `n` cost get paid from? Each of the `n` elements currently in the array was appended since the *last* resize (which left the array at capacity `n/2`, size `n/2`), and each banked 2 credits when it was appended. That's `n/2` elements newly appended since the last resize (positions `n/2` through `n-1`)... but actually every one of the `n` elements present has 2 banked credits sitting on it at all times (the invariant holds continuously, not just right after insertion) - so the `n` elements collectively hold `2n` banked credits, more than enough to pay the resize's `n` real cost. After paying, `n` credits remain banked, correctly carried forward toward the *next* resize.

**Result:** every append is charged amortized cost 3 = O(1), and the accounting never goes negative, so **n appends cost O(n) total, i.e. O(1) amortized per append** - even though any single append can be O(n) in the worst case (the resize call itself).

**Verification via the potential method (same structure, different lens).** Define `Φ(array) = 2 · size - capacity` (the "how much banked slack is left" reading - grows as the array fills, resets after a resize). For a non-resizing append: `real_cost = 1`, `Φ` increases by 2 (size grows by 1, capacity unchanged) → `amortized_cost = 1 + 2 = 3`. For a resizing append: `real_cost = n + 1` (copy n elements, then insert) at the moment `size` was `n` and `capacity` was `n` (full); after resize, `capacity = 2n`, `size = n+1`, so `Φ` goes from `2n - n = n` to `2(n+1) - 2n = 2` → `ΔΦ = 2 - n` → `amortized_cost = (n+1) + (2 - n) = 3`. Both resizing and non-resizing appends cost amortized 3 - matching the accounting method exactly, as they must (same underlying operation, different proof lens).

## Constraints & approach

Amortized analysis is a proof *technique*, not an algorithm with an input-size-dependent approach choice - there's no tier where a different amortization method becomes "the right one" purely because `n` grew. What varies by scale isn't the method, but whether amortization is worth doing at all:

| Situation | Approach |
| --- | --- |
| Single call's worst case matters (hard real-time deadline, one request must never exceed X ms) | Amortized bound is **not sufficient** - use worst-case-per-operation analysis, or a data structure with a true worst-case guarantee (e.g. a hash table with incremental/tombstone-based rehashing instead of doubling). |
| Long-running sequence of calls, average throughput matters (batch processing, most application code) | Amortized bound is the **right** cost model - it's what actually predicts total runtime. |
| Structure has no invariant tying consecutive ops together (calls are truly independent) | Amortization doesn't apply - there's nothing to spread the cost across; each call must be bounded on its own. |

## When to use / when not

**Reach for amortized analysis when** a structure has occasional expensive operations that are *provably* rare because of an invariant the structure maintains (spare capacity, a bounded number of "markable" events) - dynamic arrays, hash tables with resizing, splay trees, the union-find "path compression + union by rank" combo. **Don't reach for it** when you need a hard per-call latency bound (real-time systems, SLA-backed single-request guarantees) - amortized O(1) is a statement about *sequences*, and a single unlucky call landing exactly on the expensive operation still pays the full worst-case cost. The alternative there is a data structure engineered for true worst-case bounds per operation, usually at the cost of more implementation complexity (e.g. incremental resizing that spreads the copy work across several small steps instead of one big one).

## Comparison

| Analysis type | What it bounds | Worst single call | Use when |
| --- | --- | --- | --- |
| **Worst-case (per-op)** | Every individual call | Same as the bound | Hard real-time / SLA-backed single-request guarantees; adversarial inputs |
| **Amortized** | Total cost of *n* calls, divided by *n* | Can spike above the amortized bound | Long sequences, average throughput matters, expensive ops are structurally rare |
| **Average-case (probabilistic)** | Expected cost under an input *distribution* | Depends entirely on the distribution assumed | You have a real, defensible model of "typical" input (e.g. random pivot in quicksort) - pick it when: the randomness comes from the *input* or an explicit random choice in the algorithm, not from a hoped-for usage pattern |

Amortized analysis is **not** average-case analysis - amortized bounds are worst-case-sequence guarantees with **no assumption about input distribution**; average-case bounds require an input distribution assumption and can be defeated by an adversarial input the assumption didn't cover (a bad pivot choice in quicksort under adversarial input degrades average-case O(n log n) to worst-case O(n²), while a dynamic array's amortized O(1) append holds for *any* sequence of appends, adversarial or not - the guarantee doesn't depend on what the caller does).

## State & recurrence

> **Family note:** Amortized analysis is a cross-cutting proof technique, not an algorithm with a single state/recurrence shape of its own - it doesn't fit any of the writer's five algorithm families cleanly (no loop invariant to shrink in the traditional sense, no graph to traverse, no greedy choice, no key/distribution to exploit). The closest fit is **Recursive/build**, because the accounting and potential methods are themselves inductive arguments over a state that accumulates and discharges "credit" step by step - structurally the same shape as proving a recurrence's correctness by induction. This section covers that inductive-proof state; [Correctness / invariant](#correctness--invariant) above already walked the accounting-method induction in full, so this section covers the complementary **potential-function state** instead of repeating it.

**State definition:** the potential function `Φ: state → ℝ≥0` maps the data structure's current configuration to a single non-negative number representing latent banked work. For the dynamic array example, `Φ(array) = 2 · size - capacity`.

**Base case:** `Φ(state_0) = 0` for the initial (typically empty) structure - required so the telescoping sum `Σ amortized_cost = Σ real_cost + Φ(state_n) - Φ(state_0)` reduces cleanly to `Σ real_cost + Φ(state_n)`.

**Transition (the "recurrence"):** each operation moves the structure from `state_{i-1}` to `state_i`, and the amortized cost of that step is defined as `real_cost_i + Φ(state_i) - Φ(state_{i-1})` - this is the transition rule, analogous to a recurrence's step from one subproblem to the next.

**Why the state-space is small enough to reason about:** unlike a DP state space (which can be exponential), the potential function collapses the entire structure down to a single scalar - the state that matters for the proof isn't "every possible array configuration" but just "the one number `Φ` reads off it," which is what makes the induction tractable in a page of algebra instead of a case explosion.

## Edge cases

- **Off-by-one in the doubling threshold.** Resizing *at* `size == capacity` (not `size == capacity - 1`) is required for the accounting proof above to hold exactly - resize one element too late and the write that triggers it has no slot, corrupting the invariant the proof depends on.
- **Shrinking as well as growing (thrashing).** A naive "shrink by half when `size < capacity / 2`" policy, combined with the "double when full" grow policy, can thrash: appending one element after a shrink can immediately trigger another grow, back-to-back, defeating the amortized bound entirely (each op individually looks cheap, but the sequence append-pop-append-pop hits O(n) work on every single call). The fix is a **hysteresis gap** - shrink only when `size < capacity / 4` (not `/2`) - so a shrink leaves enough slack that several ops must happen before the next resize either direction.
- **Integer overflow on the capacity-doubling multiply.** `capacity *= 2` on a capacity near the max representable integer overflows silently in languages without arbitrary-precision ints (wraps to a small or negative number) - production dynamic-array implementations check for this and either throw or cap growth before it happens.
- **Amortized bound invalidated by adversarial *inspection*, not just adversarial insertion.** If an attacker can trigger a worst-case call *and observe it* (e.g. via a timing side-channel on a security-sensitive system), the amortized *average* being low doesn't help them - they only need the one expensive call to matter. This is why amortized structures are a poor fit for code paths with per-call timing requirements even when the average cost is excellent.

## Implementation

**Pseudocode - accounting-method verification for dynamic array append (not the append itself, the *proof check*, which is what this article teaches):**

```
CREDIT-INVARIANT-CHECK(array)
    ▷ Verifies the accounting-method invariant holds after an append
    ▷ Each of the array's size elements should hold exactly 2 banked credits
    total-credit = 0
    for i = 1 to array.size
        total-credit = total-credit + array.creditPerElement[i]
    ▷ Invariant: total-credit must equal 2 × size at all times
    assert total-credit == 2 * array.size
```

**Python - measuring amortized cost empirically (a sanity-check tool, not a formal proof, but useful for building intuition):**

```python
def measure_amortized_append_cost(n: int) -> float:
    array = []
    capacity = 1
    total_slot_writes = 0

    for i in range(n):
        if len(array) == capacity:
            # Resize: copy every existing element into new backing store.
            total_slot_writes += len(array)
            capacity *= 2
        array.append(i)
        total_slot_writes += 1  # the write of the new element itself

    return total_slot_writes / n  # should converge toward ~3 as n grows
```

Running `measure_amortized_append_cost(n)` for growing `n` shows the ratio converging toward a small constant (≈3, matching the accounting-method charge derived above) rather than growing with `n` - the empirical signature of amortized O(1).

## What the interviewer probes for

**"If append is O(n) worst-case on a resize, how can you say a loop of n appends is O(n) total, not O(n²)?"** - Because resizes are geometrically rare: after a resize to capacity `c`, the *next* resize doesn't happen until `c` more appends have occurred, so the total copy work across all resizes in a sequence of `n` appends is `1 + 2 + 4 + ... + n ≈ 2n` (a geometric series), not `n` resizes each costing `O(n)`. The total work across n appends is O(n) + O(n) [element writes + total copy work], giving O(1) amortized, not O(n²) - the doubling growth factor is precisely what makes the geometric series converge to O(n) instead of blowing up.

**"Does amortized O(1) mean I can rely on any single call being fast?"** - No, and this is the single most common misapplication: amortized bounds say nothing about any individual call, only about the total over a sequence. A system with a hard per-request latency SLA cannot rely on amortized bounds - the one request that happens to trigger the resize pays the full O(n) cost, and if that request is the one being timed, the SLA is violated regardless of how good the average looks.

**"Growth factor 2x vs 1.5x vs a fixed increment (+1000 each time) - what's the amortized cost of each?"** - Any *constant multiplicative* factor `k > 1` (2x, 1.5x, 1.1x) gives amortized O(1) append - the geometric-series argument holds for any `k > 1`, just with a different constant (smaller `k` means more frequent, cheaper resizes; the sum still converges). A **fixed additive** increment (always grow by +1000 regardless of current size) does **not** give amortized O(1) - it gives amortized O(n): resizes happen every 1000 appends regardless of size, but each resize copies the *entire current array*, so total copy work across n appends is `Θ(n²/1000)`, which is Θ(n) *per operation on average only if you don't divide by n correctly* - concretely, the total work is quadratic in n, so per-append amortized cost is Θ(n), not O(1). This is the single sharpest interview trap in the whole topic.

## Practice problems

### 1. Design a Stack With Increment Operation (LC 1381)

**Problem.** Design a stack that supports `push`, `pop`, and `increment(k, val)` - add `val` to the bottom `k` elements of the stack (or all of them if there are fewer than `k`). All operations should be efficient on average across a long sequence of calls.

- **Example 1**
  - **Input:** `push(1); push(2); increment(5, 100); push(3); pop(); pop(); pop()` | **Output:** returns `3`, then `102`, then `101`
  - **Explanation:** `increment(5, 100)` adds 100 to the bottom 2 elements (only 2 exist, less than k=5) before the third push; popping unwinds in LIFO order, returning the values with the increment applied.
- **Example 2**
  - **Input:** `push(5); increment(1, 10); pop()` | **Output:** returns `15`
  - **Explanation:** incrementing the bottom 1 element when only 1 exists applies directly to it.

**Constraints.** Up to 1000 total calls across all operations; `k` and `val` bounded by small integers - the design question is about *when* to pay the increment's cost, not about overflow.

**Approach.** The naive approach walks the bottom `k` elements on every `increment` call - O(k) per call, which is fine per-call but the amortized-analysis insight is in a smarter variant: defer the increment by storing it as a *lazy delta* at the position where the increment's range ends, and only apply accumulated deltas when an element is actually popped. Each element then pays for at most one deferred-delta application over its entire lifetime (pushed once, popped once, delta applied once at pop) - the total work across all operations is O(total pushes + total pops), i.e. **amortized O(1) per operation** even though a naive per-call view of `increment` looks like it should cost O(k). This is the accounting method in disguise: the cost of "walking k elements" is pre-paid at increment time by writing one delta, and "charged" to each element exactly once when it's popped.

**Solution.**

```python
class CustomStack:
    def __init__(self, maxSize: int):
        self.stack: list[int] = []
        self.increments: list[int] = []  # increments[i] = pending delta for stack[i], applied at pop
        self.max_size = maxSize

    def push(self, x: int) -> None:
        if len(self.stack) < self.max_size:
            self.stack.append(x)
            self.increments.append(0)

    def pop(self) -> int:
        if not self.stack:
            return -1
        i = len(self.stack) - 1
        # Push the pending delta down to the element below before popping.
        if i > 0:
            self.increments[i - 1] += self.increments[i]
        val = self.stack.pop() + self.increments.pop()
        return val

    def increment(self, k: int, val: int) -> None:
        i = min(k, len(self.stack)) - 1
        if i >= 0:
            self.increments[i] += val
```

**Complexity.** O(1) amortized per operation (`push`, `pop`, `increment` are all O(1) real cost each - the O(k) work is never actually performed; it's replaced by O(1) delta bookkeeping that gets discharged one element at a time on pop). O(n) space for the stack and delta array.

**Duplicate problems:**
- Range Update range-sum queries via difference array (general technique) - same "defer the O(k) work, pay it back incrementally" mechanic applied to prefix sums instead of a stack.

### 2. Implement Queue using Stacks (LC 232)

**Problem.** Implement a FIFO queue using only two LIFO stacks, supporting `push`, `pop`, `peek`, and `empty`, each appearing to run in amortized O(1).

- **Example 1**
  - **Input:** `push(1); push(2); peek(); pop(); empty()` | **Output:** `1`, `1`, `False`
  - **Explanation:** despite using two stacks internally, the queue behaves FIFO - the first element pushed is the first one peeked/popped.
- **Example 2**
  - **Input:** `push(1); pop(); push(2); push(3); pop()` | **Output:** `1`, then `2`
  - **Explanation:** each pop drains in insertion order even across multiple push/pop interleavings.

**Constraints.** Up to 100 calls total across all four operations - the amortized argument is what makes "up to 100 calls, each individually cheap on average" a meaningful efficiency claim rather than a worst-case O(n) per call.

**Approach.** Maintain an `in_stack` (receives pushes) and an `out_stack` (serves pops/peeks). When `out_stack` is empty and a pop/peek is requested, drain all of `in_stack` into `out_stack` (reversing order, turning LIFO into FIFO) - this single drain is O(n) in the worst case, but **each element is moved from `in_stack` to `out_stack` at most once over its entire lifetime** (pushed once, moved once, popped once) - so across any sequence of n pushes and pops, total move-work is O(n), giving O(1) amortized per operation. This is the accounting method again: charge each push 1 extra unit "in advance" to pre-pay for its own eventual single transfer to `out_stack`.

**Solution.**

```python
class MyQueue:
    def __init__(self):
        self.in_stack: list[int] = []
        self.out_stack: list[int] = []

    def push(self, x: int) -> None:
        self.in_stack.append(x)

    def _transfer_if_needed(self) -> None:
        if not self.out_stack:
            while self.in_stack:
                self.out_stack.append(self.in_stack.pop())

    def pop(self) -> int:
        self._transfer_if_needed()
        return self.out_stack.pop()

    def peek(self) -> int:
        self._transfer_if_needed()
        return self.out_stack[-1]

    def empty(self) -> bool:
        return not self.in_stack and not self.out_stack
```

**Complexity.** O(1) amortized per operation (each element is transferred between the two stacks at most once across its lifetime, so total transfer work over n operations is O(n), giving O(1) amortized per call); O(n) space for the two stacks combined.

**Duplicate problems:**
- Min Stack (LC 155) - not a true duplicate (no amortized transfer involved, it's O(1) worst-case via an auxiliary min-tracking stack) - included here only to contrast: Min Stack achieves O(1) *worst-case*, while Queue-via-Stacks achieves O(1) only *amortized*, illustrating the distinction this article's Comparison section draws.

### 3. Union-Find with Path Compression and Union by Rank

**Problem.** Implement a disjoint-set (union-find) structure supporting `find(x)` (which root does x belong to) and `union(x, y)` (merge x and y's sets), such that a long sequence of `m` operations on `n` elements runs in amortized near-O(1) per operation (formally O(α(n)), the inverse Ackermann function, but the practical takeaway is "so close to constant it's constant for any n that fits in memory").

- **Example 1**
  - **Input:** `union(1,2); union(2,3); find(1)` on elements `{1,2,3,4}` | **Output:** `find(1) == find(3)` (same root)
  - **Explanation:** transitively unioning 1-2 and 2-3 merges all three into one set, regardless of implementation-internal root choice.
- **Example 2**
  - **Input:** `find(4)` before any union involving 4 | **Output:** `4` (its own root)
  - **Explanation:** an un-unioned element is its own singleton set, its own root.

**Constraints.** n up to 10⁵-10⁶ elements, m up to 10⁶ operations - at this scale, the difference between O(log n) per operation (union by rank alone) and O(α(n)) per operation (rank + path compression together) is the difference between a solution that passes and one that times out, making this a genuine amortized-analysis-at-CP-scale problem, not an academic distinction.

**Approach.** **Union by rank** alone (always attach the shorter tree under the taller one's root) bounds tree height at O(log n), giving O(log n) per `find`. Adding **path compression** (during `find`, repoint every node on the path directly to the root) doesn't change any single call's worst case, but it flattens the tree for *every future* `find` through that path - the amortized analysis (via the potential method, using a potential function based on tree rank and the number of "unflattened" descendants) proves that combined, the amortized cost per operation drops to O(α(n)), effectively constant. Neither technique alone achieves this bound; the amortized argument specifically requires *both* working together across the operation sequence.

**Solution.**

```python
class DisjointSet:
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x: int) -> int:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # path compression
        return self.parent[x]

    def union(self, x: int, y: int) -> None:
        root_x, root_y = self.find(x), self.find(y)
        if root_x == root_y:
            return
        # Union by rank: attach shorter tree under taller tree's root.
        if self.rank[root_x] < self.rank[root_y]:
            root_x, root_y = root_y, root_x
        self.parent[root_y] = root_x
        if self.rank[root_x] == self.rank[root_y]:
            self.rank[root_x] += 1
```

**Complexity.** O(α(n)) amortized per operation (α = inverse Ackermann, grows so slowly it's < 5 for any n representable in the observable universe's atom count) for any sequence of m union/find calls; O(n) space.

**Duplicate problems:**
- Number of Connected Components in an Undirected Graph (LC 323) - same union-find core, framed as a component-counting problem rather than a raw union/find API.
- Accounts Merge (LC 721) - same union-find core with a string-to-index mapping layer on top; the amortized-cost argument is identical.
