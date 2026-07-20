# Recursion

## Prerequisites

- [Stack](../data-structures/stack.md) [Must read] - every recursive call is a frame pushed onto the call stack; recursion depth *is* stack depth
- [Array](../data-structures/array.md) [Must read] - most recursive walkthroughs trace over arrays/strings, and the worked example here does too

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [Intuition](#intuition)
- [How it works](#how-it-works)
- [Correctness / invariant](#correctness--invariant)
- [Complexity derivation](#complexity-derivation)
- [Constraints \& approach](#constraints--approach)
- [When to use / when not](#when-to-use--when-not)
- [Comparison](#comparison)
- [State \& recurrence](#state--recurrence)
- [Edge cases](#edge-cases)
- [Implementation](#implementation)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)
  - [1. Fibonacci Number (LC 509)](#1-fibonacci-number-lc-509)
  - [2. Reverse a Linked List (LC 206)](#2-reverse-a-linked-list-lc-206)
  - [3. Pow(x, n) - Fast Exponentiation (LC 50)](#3-powx-n---fast-exponentiation-lc-50)
  - [4. Generate Parentheses (LC 22)](#4-generate-parentheses-lc-22)
  - [5. Maximum Depth of Binary Tree (LC 104)](#5-maximum-depth-of-binary-tree-lc-104)

---

## What it is

**Recursion** is a function that solves a problem by calling itself on a smaller version of the same problem, until it reaches a **base case** small enough to answer directly - then the answers combine back up.

**Mental model:** Russian nesting dolls. You can't open the outermost doll and see the answer - you have to open it, find a smaller doll inside, open that one too, and so on until you hit the smallest doll (the base case) that opens directly. Then you close them back up in reverse order, and each shell adds its own bit of work on the way back out.

> **Interview soundbite:** "Recursion = base case + recursive case, trusting the recursive call to solve the smaller subproblem correctly - that trust is exactly a proof by induction."

---

## Intuition

The reason recursion works - and the reason it *feels* like magic the first time you see it - is a leap of faith: **you don't trace the whole call tree in your head. You assume the recursive call already works correctly on a smaller input, and you only reason about how to combine that answer with the current level's work.**

This is precisely mathematical induction. To prove `P(n)` for all `n`:

1. Prove `P(base case)` directly.
2. Assume `P(k)` holds for some smaller `k` (the **inductive hypothesis** - this is the "leap of faith").
3. Show `P(n)` follows from `P(k)` plus whatever work you do at this level.

A recursive function *is* that proof, executed. `factorial(n)` doesn't need to know how `factorial(n-1)` computes its answer - it only needs to trust that it does, and multiply by `n`. This is why the single hardest skill in reading or writing recursion is **not tracing every call** - it's identifying the base case and the one relationship between a problem and its smaller version, then trusting it.

The other half of the intuition: recursion is just the call stack doing bookkeeping you'd otherwise do by hand with an explicit stack (see [How it works](#how-it-works) and the [State & recurrence](#state--recurrence) section below) - "the function calls itself" is really "push a frame with this call's local state, and don't resume this frame until the pushed one returns."

---

## How it works

**Worked example: `factorial(4)`**

```
factorial(4)
  needs: 4 * factorial(3)
    factorial(3)
      needs: 3 * factorial(2)
        factorial(2)
          needs: 2 * factorial(1)
            factorial(1)
              base case → return 1
          2 * 1 = 2  → return 2
        3 * 2 = 6  → return 6
    4 * 6 = 24  → return 24
```

**Diagram - the call stack growing then unwinding:**

```
CALL (stack grows downward):        RETURN (stack unwinds upward):
┌─────────────────┐
│ factorial(4)    │ waiting on f(3)              returns 24  ▲
├─────────────────┤
│ factorial(3)    │ waiting on f(2)               returns 6  │
├─────────────────┤
│ factorial(2)    │ waiting on f(1)               returns 2  │
├─────────────────┤
│ factorial(1)    │ base case: return 1 immediately          │
└─────────────────┘
    stack depth 4                      unwinds back to depth 0
```

Every recursive call pushes a **new stack frame** holding that call's local variables (here, just `n`) and a return address. The frame is not popped until the nested call returns a value. This is why recursion depth is bounded by the **call stack size** - each pending call is real memory sitting on the stack, not "free" the way a mental trace might suggest.

**Trace check against the invariant:**

at each level, the invariant is "`factorial(n)` returns `n!` given that the nested call correctly returns `(n-1)!`."

- Level `n=2` trusts `factorial(1) = 1` (`1!`), multiplies by 2 → `2!` ✓.
- Level `n=3` trusts `factorial(2) = 2` (`2!`), multiplies by 3 → `6 = 3!` ✓.
- Level `n=4` trusts `factorial(3) = 6` (`3!`), multiplies by 4 → `24 = 4!` ✓.

The invariant holds at every level - that's the inductive step made concrete.

---

## Correctness / invariant

Recursion's correctness argument is a direct instance of the **recursive/build family's proof shape**: base case + inductive step, not a loop invariant (there's no loop).

**Claim:** `factorial(n)` returns `n!` for all `n ≥ 0`.

- **Base case:** `factorial(0) = 1 = 0!`. Directly true, no recursive call needed.
- **Inductive hypothesis:** assume `factorial(k) = k!` for some `k ≥ 0`.
- **Inductive step:** show `factorial(k+1) = (k+1)!`.
  - By definition, `factorial(k+1)` computes `(k+1) * factorial(k)`.
  - By the hypothesis, `factorial(k) = k!`.
  - So `factorial(k+1) = (k+1) * k! = (k+1)!` - exactly the claim, for `k+1`.
- **Conclusion:** by induction, `factorial(n) = n!` for all `n ≥ 0`.

The general template for *any* recursive function's correctness proof:

1. State what the function claims to return, as a function of `n` (or of the input's structure).
2. Prove the base case directly - no recursion involved, just evaluate it.
3. Assume the recursive call(s) on strictly smaller input(s) are correct (the inductive hypothesis).
4. Show that the current level's combining step, given correct subresults, produces the correct answer for the current level.
5. Note that the input **strictly shrinks** on every recursive call (this is what guarantees termination - see next section) - without this, steps 1-4 prove correctness *conditional on termination*, but not termination itself.

---

## Complexity derivation

**Time:** for `factorial`, each call does O(1) work (one multiplication) plus one recursive call. Let `T(n)` be the time for input `n`:

```
T(n) = T(n-1) + O(1)
T(0) = O(1)
```

Unrolling: `T(n) = T(n-1) + c = T(n-2) + 2c = ... = T(0) + nc = O(n)`. Time is **O(n)**.

**Space:** this is the parameter recursion articles get wrong most often. Every pending call sits on the stack as a live frame until its recursive call returns - `factorial(4)` has 5 frames alive simultaneously at the deepest point (`factorial(4)` down to `factorial(0)`), each holding its own copy of `n`. Space is **O(n)**, not O(1) - the call stack depth equals the recursion depth, and each frame is real memory. A recursive `factorial` is **not** O(1) space unless the language does **tail-call elimination** (Python's CPython does not) or you manually convert to an iterative loop with an accumulator.

**General recurrence-solving pattern** (this is the technique to reuse on any recursive algorithm, not just factorial): write `T(n)` in terms of `T(smaller)`, unroll a few levels until the pattern is clear, then either sum the arithmetic/geometric series directly (as above) or apply the [Master theorem](./divide-and-conquer.md) when the recurrence has the divide-and-conquer shape `T(n) = a·T(n/b) + f(n)`.

**Cache behavior:** call-stack frames are allocated contiguously and sequentially by the runtime as recursion descends, so a recursive call chain is mildly cache-friendlier than heap-based pointer-chasing structures (each new frame sits right next to the last) - but it's still far less cache-friendly than a flat iterative loop with a single reused set of registers/locals and no frame churn at all.

---

## Constraints & approach


| Input size (`n` = recursion depth or input length)                                                                                   | Expected complexity                                       | Approach                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `n ≤ 20` (exponential branching, e.g. subsets/permutations)                                                                         | O(2ⁿ) or O(n!)                                           | Plain recursion/backtracking - exponential is acceptable at this size                                                              |
| `n ≤ 40`                                                                                                                            | O(2ⁿ/²)                                                 | Meet-in-the-middle recursion (split the branching in half)                                                                         |
| `n ≤ 500` - `10⁴`, overlapping subproblems                                                                                         | O(n²)                                                    | **Recursion**+ **memoization** (turns exponential tree into polynomial DAG) - see [Dynamic Programming](./dynamic-programming.md) |
| `n ≤ 10⁵` - `10⁶`, single-branch recursion (one recursive call per level, e.g. linear scan)                                       | O(n)                                                      | Plain recursion is fine*time*-wise, but **stack depth becomes the limiting factor** - see next row                                |
| `n ≥ 10⁴` and default stack limits apply (Python's default recursion limit is 1000; C++/Java thread stacks are typically ~1MB-8MB) | risk of **stack overflow** regardless of time complexity | Convert to iteration with an explicit stack, or raise the recursion limit / stack size, or restructure into a loop                 |

The critical thing this table encodes that a plain "count operations" table misses: for recursion specifically, **input size determines feasibility of the recursion itself**, not just the runtime. An O(n) algorithm that recurses to depth `n` can still crash on `n = 10⁵` in Python (default limit 1000) even though the time complexity looks fine on paper. This is the single most common "surprising" bug in a recursion-heavy submission.

---

## When to use / when not

Use recursion when the problem has a **natural self-similar decomposition** - the answer for `n` is expressible in terms of the answer for a strictly smaller version of the same problem (tree traversals, divide-and-conquer, backtracking's state-space exploration, anything defined by a mathematical recurrence). It's also the natural fit whenever the underlying data is itself recursively structured - trees, nested lists, recursive grammars - because the code structure mirrors the data structure.

Don't reach for recursion over **iteration** when: the recursion is a simple linear chain with no branching and no need to "return up" (a plain accumulator loop does the same job with O(1) space instead of O(n)); the recursion depth could exceed the language's stack limit for realistic inputs; or the overhead of function-call setup (parameter passing, stack frame allocation) matters in a tight inner loop where a loop is just as readable. The alternative to name explicitly: **iteration with an explicit stack/queue** replicates any recursive algorithm's control flow while keeping memory on the heap (which can grow far larger than a call stack) instead of the call stack.

**Real-world usage:** compilers and interpreters use recursive-descent parsing to parse nested grammar (an expression inside parentheses inside an expression) - the grammar's recursive structure maps directly onto function-call recursion. **At-scale failure:** deeply nested or maliciously crafted input (e.g. a JSON payload with 100,000 nested arrays) can crash a recursive-descent parser with a stack overflow long before it becomes slow - production parsers cap nesting depth or convert to an explicit-stack iterative parser specifically to avoid this.

---

## Comparison


| Approach                             | Time                                                       | Space                                 | Key constraint / trade-off                                                                                                                    | Pick it when...                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Recursion**                        | same as iterative equivalent (recurrence-dependent)        | O(depth) call stack, always           | Simplest to write for self-similar problems; risks stack overflow at depth > ~1000-10⁴ depending on language/config                          | The problem is naturally self-similar (trees, divide-and-conquer, backtracking) and expected depth is bounded well under the stack limit        |
| **Iteration (loop + accumulator)**   | same                                                       | O(1) extra (beyond loop variables)    | Requires manually tracking what the call stack would have tracked; harder to write for tree/branching recursion                               | The recursion is a single linear chain (no branching) - e.g. factorial, linear scan - and O(1) space matters, e.g. embedded systems or n > 10⁵ |
| **Iteration + explicit stack/queue** | same                                                       | O(depth) heap, not call-stack         | All the expressiveness of recursion (branching, backtracking) but memory lives on the heap, which is typically far larger than the call stack | Recursion depth would overflow the call stack (deep trees, large n) but the branching structure still needs a stack/queue to replicate          |
| **Recursion + memoization (DP)**     | reduces exponential to polynomial when subproblems overlap | O(depth) stack + O(states) memo table | Only helps when subproblems repeat; no benefit on already-non-overlapping recursion (e.g. plain factorial, binary search)                     | Recursive calls solve the *same* subproblem multiple times (e.g. naive Fibonacci) - see [Dynamic Programming](./dynamic-programming.md)        |

---

## State & recurrence

**State definition:** for a recursive function, the "state" is exactly the parameter(s) passed on each call - the piece of the problem still unsolved. For `factorial(n)`, the state is just the integer `n`. For a tree-traversal recursion, the state is "the current node." For backtracking, the state is "the partial solution built so far plus what's still available to choose from." **The single most important design question when writing any recursive function is: what is the minimal state that fully determines the answer to the subproblem?** Get this wrong (too little state) and the recursion is incorrect; too much state, and you waste memory/time re-deriving things that could have been passed down.

**Base case:** the state value(s) at which the answer is known without recursing - `n = 0` for factorial, `node is None` for a tree traversal, "no more choices to make" for backtracking. **Every recursive function must have at least one base case, and every recursive call must move strictly closer to it** - this is what the [Correctness / invariant](#correctness--invariant) section's induction argument depends on, and what guarantees the recursion terminates instead of looping forever.

**Memo vs. tabulation (when subproblems overlap):** if the same state is reached via multiple call paths (classic case: naive Fibonacci calls `fib(n-2)` from both `fib(n-1)` and directly from `fib(n)`, so `fib(n-2)` gets computed twice, `fib(n-3)` four times, and so on - the call tree has O(2ⁿ) nodes but only O(n) *distinct* states), two fixes exist:

- **Memoization (top-down):** keep recursion's natural call structure, but cache `state → answer` in a dict/array; before recursing, check the cache. Turns the O(2ⁿ) call tree into an O(n) DAG of distinct states, each computed once.
- **Tabulation (bottom-up):** replace recursion entirely with an explicit loop that fills a table from the base case upward, in dependency order. Same asymptotic improvement, but avoids call-stack depth entirely - relevant when `n` is large enough that even the memoized recursive version would overflow the stack.

The trade-off: memoization keeps the code structurally closer to the natural recursive definition (often easier to write correctly first), while tabulation avoids recursion's O(depth) stack cost and is usually faster in practice due to lower per-call overhead. See [Dynamic Programming](./dynamic-programming.md) for the full treatment.

**State-space size:** the total number of *distinct* states the recursion can reach bounds the work when memoized - e.g. Fibonacci has O(n) distinct states (just the integers 0..n), so memoized Fibonacci is O(n) time and space; a recursion over "subsets of an n-element set" has O(2ⁿ) distinct states, so memoization doesn't rescue it from exponential blowup the way it does for Fibonacci. Recognizing the state-space size *before* writing the recursion tells you up front whether memoization will help or whether the problem is inherently exponential.

---

## Edge cases

1. **Missing or unreachable base case → infinite recursion → stack overflow.** If the recursive call never reaches the base case (e.g. `factorial(n)` called with a negative `n`, which counts down through 0 without ever hitting exactly the base-case check written as `n == 0`), the function recurses forever until the stack overflows. Guard: validate input range, or write the base case as `n <= 0` instead of `n == 0`.
2. **Recursion depth exceeding the language's stack limit.** Python's default recursion limit is 1000 frames (`sys.setrecursionlimit` can raise it, but the OS thread stack is still a hard ceiling); this is a real production concern for anything that recurses linearly over `n > 1000` elements (e.g. a naive recursive linked-list traversal over a 10,000-node list). Fix: convert to iteration, or explicitly raise the limit *and* increase the thread stack size (raising `sys.setrecursionlimit` alone without also increasing the OS stack size just changes *where* it crashes, from a clean `RecursionError` to a raw segfault).
3. **Duplicate/overlapping subproblems recomputed exponentially.** Naive recursive Fibonacci recomputes `fib(k)` an exponential number of times without memoization - correct, but O(2ⁿ) instead of O(n). Not a bug, but a performance trap that looks identical to a correct base case + inductive step until you check the time complexity.
4. **Integer overflow in the accumulated result (CP-flavored).** Recursive computations that multiply or sum across many levels (factorial, recursive combinatorics) overflow 32-bit or even naive 64-bit integer ranges quickly - `20! ≈ 2.4 × 10¹⁸` fits under the signed-64-bit ceiling (~9.2 × 10¹⁸), but `21! ≈ 5.1 × 10¹⁹` already overflows it. In contest settings, apply modular arithmetic (`% (10⁹+7)`) at each multiplication step rather than at the end, since the intermediate value itself may already overflow before a final mod is applied.

**Common misconceptions:**

- *"Recursion is inherently slower than iteration."* False as a blanket claim - the overhead is per-call-frame setup (a few extra instructions), not a property of "the technique." A tail-recursive or log-depth recursive call (e.g. divide-and-conquer) costs about the same as its iterative equivalent; the meaningful slowdown shows up specifically in deep linear recursion, not recursion in general.
- *"A recursive solution with no extra arrays or lists allocated is O(1) space."* False - see U2/the Complexity derivation above. The call stack itself is memory; "no extra data structure" and "no extra space" are not the same claim.

Handled in the Python below: input validation for the base case, and a note on Python's arbitrary-precision integers (which sidesteps edge case 4 in Python specifically, but not in C++/Java).

---

## Implementation

**Pseudocode (CLRS style):**

```
FACTORIAL(n)
  if n == 0                    ▷ base case
    return 1
  return n * FACTORIAL(n - 1)  ▷ recursive case: trust the smaller call
```

```
TREE-SUM(node)
  if node == NIL               ▷ base case: empty subtree contributes 0
    return 0
  left_sum = TREE-SUM(node.left)     ▷ trust the left recursive call
  right_sum = TREE-SUM(node.right)   ▷ trust the right recursive call
  return node.value + left_sum + right_sum
```

**Python:**

```python
from functools import lru_cache


def factorial(n: int) -> int:
    if n < 0:
        raise ValueError("factorial undefined for negative n")
    if n == 0:                      # base case
        return 1
    return n * factorial(n - 1)      # recursive case


class TreeNode:
    def __init__(self, value: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.value = value
        self.left = left
        self.right = right


def tree_sum(node: TreeNode | None) -> int:
    if node is None:                 # base case: empty subtree
        return 0
    return node.value + tree_sum(node.left) + tree_sum(node.right)


# Memoized recursion (top-down DP) - contest velocity via lru_cache
@lru_cache(maxsize=None)
def fib_memo(n: int) -> int:
    if n <= 1:
        return n
    return fib_memo(n - 1) + fib_memo(n - 2)


# Converting linear recursion to iteration - the O(1)-space alternative
def factorial_iterative(n: int) -> int:
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result
```

---

## What the interviewer probes for

**"What's the space complexity of your recursive solution?" -** The honest answer includes the call stack: O(depth), not O(1), unless you've converted to iteration or the language guarantees tail-call elimination (most mainstream languages, including Python, C++, and Java, do not). This is the single most common trap - candidates state O(1) space out of habit from thinking only about "extra data structures allocated," forgetting the stack itself is memory.

**"Can you rewrite this without recursion?" -** Yes, via an explicit stack/queue that manually replicates what the call stack was doing: push state before "recursing," pop and resume after. For simple linear (tail-recursive-shaped) recursion, an accumulator loop suffices with no auxiliary structure at all - see `factorial_iterative` above.

**"What happens on very large `n`?" -** Depends on the recursion shape: linear recursion (one call per level, like factorial) will hit the language's stack depth limit around `n` in the low thousands (Python's default is 1000); divide-and-conquer recursion (like merge sort, depth O(log n)) is essentially immune to this for realistic `n` since log-depth stays small even at `n = 10⁹` (depth ≈ 30).

**"How would you detect infinite recursion before it crashes?" -** State-space or depth tracking: pass a depth counter or a visited-set alongside the recursive state, and raise/bail out past a sanity threshold rather than letting the stack overflow uncontrolled - useful in production code parsing untrusted input (e.g. a JSON parser capping nesting depth).

---

## Practice problems

### 1. Fibonacci Number (LC 509)

Compute the n-th Fibonacci number, where `F(0) = 0`, `F(1) = 1`, `F(n) = F(n-1) + F(n-2)`. Constraints: `0 ≤ n ≤ 30` (small on purpose - the naive version is exponential).

**Approach.** Direct translation of the recurrence into recursive code is the natural first instinct; the interview follow-up is almost always "what's the time complexity, and can you improve it?" - naive recursion is O(2ⁿ) because `F(n-2)` is recomputed independently down every branch. Adding memoization (top-down) or converting to an iterative bottom-up loop both bring it to O(n).

```python
def fib(n: int) -> int:
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)          # naive: O(2^n)


def fib_memo(n: int, memo: dict[int, int] = {}) -> int:
    if n <= 1:
        return n
    if n not in memo:
        memo[n] = fib_memo(n - 1, memo) + fib_memo(n - 2, memo)
    return memo[n]                           # memoized: O(n)
```

**Complexity.** Naive: O(2ⁿ) time, O(n) space (stack depth). Memoized: O(n) time, O(n) space (stack depth + memo table).

**Duplicate problems:**

- Climbing Stairs (LC 70) - identical recurrence `f(n) = f(n-1) + f(n-2)` in disguise.
- Tribonacci (LC 1137) - same idea, three-term recurrence instead of two.
- N-th Tribonacci Number - same pattern generalized.

---

### 2. Reverse a Linked List (LC 206)

Given the head of a singly linked list, reverse it and return the new head. Constraints: `0 ≤ n ≤ 5000` nodes.

**Approach.** The recursive formulation: `reverse(head)` reverses everything after `head`, and trusts that the returned new head is correct; then it fixes up `head.next.next = head` and `head.next = None` to splice `head` onto the end. The base case is an empty list or single node, which is already "reversed." This is a clean demonstration of the induction argument: assume `reverse(head.next)` correctly reverses the rest of the list, then show how to attach `head`.

```python
class ListNode:
    def __init__(self, val: int = 0, next: "ListNode | None" = None):
        self.val = val
        self.next = next


def reverse_list(head: ListNode | None) -> ListNode | None:
    if head is None or head.next is None:    # base case
        return head
    new_head = reverse_list(head.next)        # trust: reverses the rest
    head.next.next = head                     # attach head to the end
    head.next = None
    return new_head
```

**Complexity.** O(n) time, O(n) space (call stack depth equals list length - note the constraint caps at 5000, near Python's default recursion limit, which is itself an interview-relevant observation).

**Duplicate problems:**

- Swap Nodes in Pairs (LC 24) - same recursive linked-list restructuring idea, pairwise instead of full reversal.
- Reverse Linked List II (LC 92) - reverse only a sublist; same recursive skeleton with boundary tracking.

---

### 3. Pow(x, n) - Fast Exponentiation (LC 50)

Implement `pow(x, n)` computing `x` raised to the integer power `n`, including negative `n`. Constraints: `-2^31 ≤ n ≤ 2^31 - 1`, `-100 < x < 100`.

**Approach.** Naive recursion (`x * pow(x, n-1)`) is O(n) - too slow if `n` is near 2³¹. The key insight is a **different recursive decomposition**: `x^n = (x^(n/2))^2` when `n` is even, and `x^n = x * (x^(n/2))^2` (integer division) when `n` is odd. This halves the problem size each call instead of decrementing by 1, turning O(n) into O(log n) - the same idea as binary exponentiation used throughout number theory and modular arithmetic.

```python
def my_pow(x: float, n: int) -> float:
    if n < 0:
        return 1 / my_pow(x, -n)
    if n == 0:                       # base case
        return 1.0
    half = my_pow(x, n // 2)
    if n % 2 == 0:
        return half * half
    return half * half * x
```

**Complexity.** O(log n) time, O(log n) space (recursion depth halves each level).

**Duplicate problems:**

- Super Pow (LC 372) - same halving recursion, combined with modular arithmetic for a huge exponent given digit-by-digit.
- Sqrt(x) (LC 69) - not the same recursion shape, but the same "logarithmic-depth recursion beats linear" lesson via binary search instead.

---

### 4. Generate Parentheses (LC 22)

Generate all combinations of `n` pairs of well-formed parentheses. Constraints: `1 ≤ n ≤ 8`.

**Approach.** This is recursion with **branching state** (as opposed to the single-child recursion above) - at each call, there are up to two choices: add `(` if fewer than `n` opens used so far, add `)` if fewer closes than opens so far. The base case is "used `2n` characters total." This is the bridge from plain recursion into backtracking: the recursive state (open count, close count, partial string) fully determines what's legal next, exactly per the [State & recurrence](#state--recurrence) section's state-definition question.

```python
def generate_parenthesis(n: int) -> list[str]:
    result: list[str] = []

    def backtrack(current: list[str], open_count: int, close_count: int) -> None:
        if len(current) == 2 * n:            # base case
            result.append("".join(current))
            return
        if open_count < n:
            current.append("(")
            backtrack(current, open_count + 1, close_count)
            current.pop()                      # undo - explore other branch
        if close_count < open_count:
            current.append(")")
            backtrack(current, open_count, close_count + 1)
            current.pop()

    backtrack([], 0, 0)
    return result
```

**Complexity.** O(4ⁿ / n^1.5) time (the nth Catalan number, the count of valid sequences), O(n) space for recursion depth (each level adds one character, max depth `2n`).

**Duplicate problems:**

- Letter Combinations of a Phone Number (LC 17) - same branching-recursion-with-undo shape, different branching factor per level.
- Combination Sum (LC 39) - branching recursion choosing to include/exclude, with a stopping condition on running sum.

---

### 5. Maximum Depth of Binary Tree (LC 104)

Given the root of a binary tree, return its maximum depth. Constraints: `0 ≤ n ≤ 10⁴` nodes.

**Approach.** The canonical tree recursion: `depth(node) = 0` if `node` is `None` (base case), else `1 + max(depth(node.left), depth(node.right))`. This is the simplest possible instance of "trust the recursive call on a smaller (sub)tree, combine at this level" - and it generalizes directly to every other tree-recursion problem (sum, diameter, balanced-check).

```python
def max_depth(root: TreeNode | None) -> int:
    if root is None:                 # base case
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))
```

**Complexity.** O(n) time (visits every node once), O(h) space where `h` is tree height - O(log n) for a balanced tree, O(n) worst case for a completely skewed (linked-list-shaped) tree. This worst case is exactly why "recursion is O(log n) space" is a claim that needs the balance assumption stated explicitly, not assumed.

**Duplicate problems:**

- Balanced Binary Tree (LC 110) - same recursive depth computation, checking the left/right depth difference at each node along the way.
- Diameter of Binary Tree (LC 543) - same depth recursion, tracking a running max of `left_depth + right_depth` as a side effect.
- Path Sum (LC 112) - same tree recursion shape, threading a running sum instead of a depth count.
