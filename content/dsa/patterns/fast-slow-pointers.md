# Fast & Slow Pointers

## Prerequisites

- [Linked List](../data-structures/linked-list.md) [Must read] - this pattern's canonical use case is cycle detection and middle-finding on a singly linked list, where there's no O(1) random access to fall back on
- [Two Pointers](./two-pointers.md) [Must read] - fast & slow is a same-direction, different-speed specialization of the two-pointer idea

## Table of Contents

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

---

## What it is

**Fast & slow pointers** (Floyd's tortoise and hare) walks two pointers over the same sequence at different speeds - typically one step and two steps per iteration - to detect cycles or find structural midpoints **without any extra memory**, which matters most on a linked list where there's no index to jump to directly.

**Mental model:** two runners on a circular track, one twice as fast as the other. If the track is a loop, the fast runner eventually **laps** the slow one - they must meet again, because the fast runner is gaining exactly one step of relative distance per iteration inside a finite loop. If the track is a straight line (no loop), the fast runner simply reaches the end first - it never "meets" the slow one again, which is itself the signal that there's no cycle.

> **Interview soundbite:** "Fast & slow pointers - slow moves 1, fast moves 2, they meet iff there's a cycle. No hash set of visited nodes needed - O(1) space instead of O(n)."

---

## Recognition signals

### (a) Trigger phrases

- *"detect a cycle in a linked list"*
- *"find the starting node of the cycle"*
- *"find the middle of a linked list"*
- *"determine if a number is happy"* (the "Happy Number" framing - a cycle-detection problem in disguise on an implicit sequence, not a linked list)
- *"linked list is a palindrome"*

### (b) Structural cues

- The input is a **linked list** (or an implicitly-defined sequence via a function, like `next(x) = sum of squares of digits of x`) - no random access, so a naive "compute length first" pass requires an extra traversal, and hash-set tracking of visited nodes costs O(n) space.
- You need to determine **whether the sequence loops back on itself**, or find a **midpoint / kth-from-end** position, in a single pass.
- O(1) space is explicitly desired or implied (a common explicit interview constraint: "can you do it without extra space?").

### (c) Not to be confused with

| Pattern | Distinction |
|---|---|
| **Two Pointers** | Fast & slow *is* a two-pointer variant, but specifically same-direction with a **speed difference** (not opposite-ends convergence). Classic two-pointers on a sorted array converges from both ends; fast & slow chases from behind at 2× speed. |
| **Sliding Window** | Sliding window maintains an aggregate over a contiguous range `[L, R]` on an array, expanding/contracting based on a condition. Fast & slow has no "window" or maintained aggregate - it's purely about relative position/speed to detect looping structure. |
| **Hash-set cycle detection** | Also detects a cycle (by tracking visited nodes in a set), and is easier to reason about at first - but costs O(n) space. Fast & slow achieves the same result in O(1) space at the cost of a slightly less obvious correctness argument. Use hash-set version when you also need to know *which* nodes are in the cycle, not just whether one exists. |

---

## How it works

**Worked example: cycle detection on `1 → 2 → 3 → 4 → 5 → 3` (node 5 points back to node 3, forming a cycle).**

```
Node values:   1    2    3    4    5
Node index:    A    B    C    D    E
Links:         A→B, B→C, C→D, D→E, E→C  (cycle: C→D→E→C)
```

```
Step 0: slow=A, fast=A
Step 1: slow=B, fast=C          (fast moved A→B→C)
Step 2: slow=C, fast=E          (fast moved C→D→E)
Step 3: slow=D, fast=D          (fast moved E→C→D; slow moved C→D)  → MEET at D
```

**Diagram - why they must meet inside a cycle:**

```
        A → B → C → D
                ↑     ↓
                └──E──┘

slow takes 1 step/iteration, fast takes 2.
Once fast enters the cycle, every iteration fast gains exactly
1 extra step of RELATIVE distance on slow (2 - 1 = 1).
The cycle is finite (length L), so the relative distance mod L
must eventually hit 0 - i.e. they occupy the same node. Meeting
is not a coincidence, it's forced by the pigeonhole principle
on a finite loop.
```

**Trace check against the invariant:** at every step, `fast` has moved exactly twice as many total nodes as `slow`. If the list were acyclic, `fast` would hit `None` and the loop would terminate cleanly (no cycle found). The invariant "fast is always exactly 2× slow's total step count" is what makes the closing argument ("they meet iff a cycle exists") valid - it's not a heuristic, it's forced by the arithmetic once fast is inside a loop of finite length.

**Finding the cycle's start (Floyd's second phase):** once slow and fast meet inside the cycle, resetting one pointer to the head and advancing both **one step at a time** makes them meet exactly at the cycle's entry node. This works because of a distance argument: let `μ` = distance from head to cycle start, `λ` = cycle length. When they first meet, the fast pointer has traveled `μ + λ·k + r` for some `k`, slow has traveled `μ + r` (both measured from head, `r` = distance into the cycle at meeting point). Since fast always covers exactly 2× slow's distance: `μ + λ·k + r = 2(μ + r)`, which simplifies to `λ·k - r = μ`, i.e. `r ≡ -μ (mod λ)`. So walking `μ` more steps from the meeting point lands on the same node as walking `μ` steps from the head - because both trips end at a position that's `μ` steps past a point `r` into the cycle, and `r + μ ≡ 0 (mod λ)` puts that landing spot exactly at the cycle's start. That's why resetting one pointer to `head` and advancing both at speed 1 converges precisely at the cycle entrance.

---

## Skeleton

**Pseudocode (CLRS style):**

```
HAS-CYCLE(head)
  slow = head
  fast = head
  while fast != NIL and fast.next != NIL
    slow = slow.next             ▷ 1 step
    fast = fast.next.next        ▷ 2 steps
    if slow == fast
      return TRUE                ▷ they met - cycle exists
  return FALSE                   ▷ fast hit NIL - no cycle

FIND-CYCLE-START(head)
  slow = head
  fast = head
  while fast != NIL and fast.next != NIL
    slow = slow.next
    fast = fast.next.next
    if slow == fast
      break                      ▷ met inside the cycle
  if fast == NIL or fast.next == NIL
    return NIL                   ▷ no cycle
  slow = head                    ▷ reset one pointer to head
  while slow != fast
    slow = slow.next             ▷ both now move at speed 1
    fast = fast.next
  return slow                    ▷ meeting point = cycle start
```

**Python template:**

```python
class ListNode:
    def __init__(self, val: int = 0, next: "ListNode | None" = None):
        self.val = val
        self.next = next


def has_cycle(head: ListNode | None) -> bool:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next            # your logic here: 1 step
        fast = fast.next.next       # your logic here: 2 steps
        if slow is fast:
            return True
    return False


def find_middle(head: ListNode | None) -> ListNode | None:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow                     # for even length, this is the second middle
```

---

## Complexity

Typical time: **O(n)** - fast traverses at most 2n steps total before either hitting `None` (no cycle) or meeting slow (cycle found); the second phase (finding cycle start) is another O(n) at worst. Space: **O(1)** - only two pointers, regardless of list length. This O(1) space is the entire point of the pattern - the hash-set alternative for the same problem is O(n) space.

---

## Constraints & approach

| Input size | Keywords | Reach for | Don't reach for |
|---|---|---|---|
| Linked list, any n, O(1) space required or implied | "detect a cycle", "find the middle", "without extra space" | Fast & slow pointers: O(n) time, O(1) space | Hash set of visited nodes: O(n) space |
| Linked list, O(n) space acceptable, need to know *all* cycle nodes | "list the nodes in the cycle" | Hash set (fast & slow only finds *whether*/*where* a cycle starts, not the full node list without extra work) | - |
| Implicit sequence via a function (not a literal linked list) | "happy number", "determine if a sequence of transformations cycles" | Fast & slow over the function's iterates (`slow = f(slow)`, `fast = f(f(fast))`) | Storing all seen values in a set (works, but O(n) space when O(1) is achievable) |
| Array-based "find duplicate number" where values act as implicit next-pointers | "find the duplicate number", values in `[1, n]` | Fast & slow treating `nums[i]` as a pointer to index `nums[i]` | Sorting (mutates input) or a frequency array (O(n) space) |

The constraint that matters isn't really `n` here - it's **whether O(1) space is required**. If extra space is free, a hash set is simpler to reason about and just as fast asymptotically; fast & slow earns its keep specifically when memory is the bottleneck or the interviewer explicitly asks for constant space.

**Real-world usage:** garbage collectors use Floyd-style cycle detection to find reference cycles among objects without allocating an O(n) visited-set proportional to heap size - the same O(1)-space constraint that motivates this pattern in interviews is a hard requirement in a GC running inside the same memory it's trying to reclaim. **At-scale failure:** because each `.next` hop on a linked list is a potential cache miss (nodes are typically scattered across non-contiguous heap allocations), fast & slow's pointer-chasing degrades in wall-clock time as the list grows large enough to exceed cache/TLB reach - even though the *asymptotic* O(n) time and O(1) space never change, real hardware makes each step progressively more expensive than the equivalent step over a contiguous array.

**Cache behavior:** linked-list traversal (which this pattern is built for) is cache-hostile - each `.next` dereference can land anywhere in the heap, unlike a contiguous-array two-pointer scan where sequential prefetch keeps most accesses in cache. This is a structural cost of the *data structure*, not the pointer technique itself, but it's the reason fast & slow's real-world performance on a large linked list is worse than the same O(n) bound achieved via array indexing would suggest.

---

## Variations

| Variant | Shape | Canonical example |
|---|---|---|
| Cycle detection (boolean) | Slow 1×, fast 2×, check if they meet | Linked List Cycle (LC 141) |
| Cycle start location | Detect meeting, then reset + walk both at 1× | Linked List Cycle II (LC 142) |
| Middle of list | Fast reaches end when slow is at the midpoint | Middle of the Linked List (LC 876) |
| Happy Number (sequence cycle, not list) | Same idea over `f(x) = sum of squares of digits` | Happy Number (LC 202) |
| Find the Duplicate Number (array as implicit linked list) | `nums[i]` treated as a "next pointer" into the array | Find the Duplicate Number (LC 287) |
| Palindrome check via fast/slow + reversal | Find middle with fast/slow, reverse second half, compare | Palindrome Linked List (LC 234) |

---

## CP-primitives

### 1. Cycle length computation

**The trick:** once slow and fast meet inside a cycle, keep one pointer fixed and advance the other, counting steps until it returns to the same node - that count is the cycle's length `λ`. This is a small addition to the basic detection skeleton that shows up whenever a problem needs the cycle's *size*, not just its existence.

```python
def cycle_length(meeting_node: ListNode) -> int:
    length = 1
    current = meeting_node.next
    while current is not meeting_node:
        current = current.next
        length += 1
    return length
```

**Why for CP:** several "functional graph" contest problems (each node has exactly one outgoing edge, forming rho-shaped/"tadpole" structures) ask for both the tail length (`μ`) and cycle length (`λ`) - this is the standard O(n) time, O(1) space way to extract both without building an explicit visited-array.

### 2. Brent's cycle detection (faster in practice than Floyd's)

**The trick:** Floyd's algorithm restarts comparison every iteration; Brent's algorithm uses **exponentially growing power-of-two step counts** before checking for a match, which reduces the constant factor - fewer total pointer moves in practice (though still O(n) asymptotically), and also directly yields the cycle length as a side effect without the extra "walk from the meeting point" pass.

```python
def brent_cycle_length(f, x0):
    power = lam = 1
    tortoise, hare = x0, f(x0)
    while tortoise != hare:
        if power == lam:
            tortoise = hare
            power *= 2
            lam = 0
        hare = f(hare)
        lam += 1
    return lam
```

**Why for CP:** in contest settings with tight time limits and large functional-graph inputs, Brent's lower constant factor (roughly half the function evaluations of Floyd's in the worst case) can matter, and it directly returns `λ` without a second pass. Same asymptotic bound as Floyd's: O(n) time, O(1) space - the win is a smaller constant factor, not a better Big-O.

---

## Worked problems

### 1. Linked List Cycle (LC 141)

Given the head of a linked list, determine if it has a cycle.

**Approach sketch:** direct application of the skeleton's `has_cycle` - slow moves one node, fast moves two, per iteration. If they ever occupy the same node, a cycle exists; if fast reaches `None` first, it doesn't. No extra data structure needed, in contrast to a hash-set-of-visited-nodes approach.

### 2. Linked List Cycle II (LC 142)

Given the head of a linked list, return the node where the cycle begins, or `None` if there is no cycle.

**Approach sketch:** run the detection phase first (`find_cycle_start`'s first loop) to find a meeting point inside the cycle. Then reset one pointer to `head` and advance both pointers one step at a time; the node where they next meet is the cycle's entry - a direct consequence of the μ/λ distance argument covered in How it works.

### 3. Middle of the Linked List (LC 876)

Given the head of a singly linked list, return the middle node (the second of two middles if the length is even).

**Approach sketch:** slow and fast both start at head; fast moves two steps for every one of slow's. When fast reaches the end (`None` or `.next is None`), slow sits exactly at the midpoint - this falls directly out of the 2:1 speed ratio without needing to know the list's length up front.

### 4. Happy Number (LC 202)

A number is "happy" if repeatedly replacing it with the sum of squares of its digits eventually reaches 1; otherwise it loops forever in a cycle that never includes 1. Determine if a given number is happy.

**Approach sketch:** this isn't a linked list at all - but define `next(x)` as the digit-square-sum function, and apply the same slow/fast pointer idea over the *sequence of values* it generates: `slow = next(slow)`, `fast = next(next(fast))`. If they ever meet, there's a cycle (unhappy) unless the cycle degenerates to just `{1}` (happy); this shows the pattern generalizes beyond literal linked-list nodes to any function-defined implicit sequence.

### 5. Find the Duplicate Number (LC 287)

Given an array of `n+1` integers where each value is in `[1, n]`, find the one duplicate value, without modifying the array and using O(1) extra space.

**Approach sketch:** treat the array as an implicit linked list where `nums[i]` is the "next pointer" from index `i` - because there are `n+1` values crammed into the range `[1, n]`, by pigeonhole this functional graph *must* contain a cycle, and the duplicate value is exactly the cycle's entry point. Run the same two-phase Floyd's algorithm (`slow = nums[slow]`, `fast = nums[nums[fast]]`, then reset-and-walk-at-1×) treating array indices as node identities. This only works because every value is constrained to `[1, n]` - guaranteeing each is a valid index to jump to next; a value of `0` or `> n` would break the "array as linked list" mapping entirely.

---

## Pitfalls

1. **Off-by-one in the loop condition, causing a null-pointer dereference.** The loop guard must check `fast and fast.next` (not just `fast`) before computing `fast.next.next` - otherwise, on an odd-vs-even length edge case, `fast.next` can be `None` and `.next.next` crashes. This is the single most common bug when first implementing this pattern.

2. **Forgetting the cycle-start reset step is single-speed, not the original 2:1 ratio.** After the initial meeting, the second phase resets one pointer to `head` and advances **both** pointers at speed 1 (not 2) - reusing the original speeds in phase two gives a wrong (or non-terminating) result (see [How it works](#how-it-works) for why equal-speed convergence is what the math requires).

3. **Applying to a doubly linked list or array with true random access without checking if it's actually needed.** If O(n) space is acceptable and the structure supports fast lookups, a hash set of visited references is simpler to reason about and equally fast - reaching for fast & slow purely out of habit when the interviewer hasn't asked for O(1) space adds unnecessary subtlety with no benefit.

4. **Misidentifying "meet" as pointer equality when values (not references) are compared.** On a linked list, "slow == fast" must mean the same *node object* (reference equality), not equal values - two different nodes coincidentally holding the same value are not a cycle. In Python, this means comparing with `is`, not `==`, if `ListNode.__eq__` is ever overridden to compare values.

**Common misconceptions:** *"the pointers met because their values matched."* False - it's node *identity* that makes them meet, not their stored values. Two distinct nodes can hold equal values without a cycle existing; the algorithm's correctness depends entirely on `slow` and `fast` becoming literally the same node object, which only happens by chasing around an actual cycle in the structure.

---

## First 30 seconds

*"This is fast & slow pointers - Floyd's cycle detection. Slow moves one step, fast moves two; if there's a cycle they must meet, because fast gains one step of relative distance per iteration inside a finite loop. O(n) time, O(1) space - no hash set needed."*

Then, if the problem asks for the cycle's *start* (not just existence), name the second phase up front: reset one pointer to head, advance both at speed 1, they meet at the entry.

---

## Related

- [Two Pointers](./two-pointers.md) - the general two-pointer family this pattern specializes; two-pointers converges from opposite ends, fast & slow chases at different speeds
- [Linked List](../data-structures/linked-list.md) - the primary data structure this pattern targets, specifically because it lacks O(1) random access
- [In-place Reversal](./in-place-reversal.md) - often combined with fast & slow (find the middle, then reverse the second half) for palindrome-check-style problems

---

## Practice problems

### 1. Linked List Cycle (LC 141)

Given the head of a linked list, determine if it has a cycle. Constraints: `0 ≤ n ≤ 10⁴` nodes.

**Approach.** Slow moves one node per iteration, fast moves two. If they ever reference the same node, a cycle exists; if fast reaches `None`, it doesn't.

```python
class ListNode:
    def __init__(self, val: int = 0, next: "ListNode | None" = None):
        self.val = val
        self.next = next


def has_cycle(head: ListNode | None) -> bool:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False
```

**Complexity.** O(n) time, O(1) space.

**Duplicate problems:**
- Happy Number (LC 202) - identical cycle-detection logic over a function-defined sequence instead of list nodes.
- Find the Duplicate Number (LC 287) - same Floyd's algorithm, array values as implicit next-pointers.

---

### 2. Linked List Cycle II (LC 142)

Given the head of a linked list, return the node where the cycle begins, or `None` if none exists. Constraints: `0 ≤ n ≤ 10⁴` nodes.

**Approach.** Two-phase Floyd's: detect a meeting point inside the cycle first, then reset one pointer to head and advance both at speed 1 until they meet again - that node is the cycle's start, by the μ/λ distance argument.

```python
def detect_cycle(head: ListNode | None) -> ListNode | None:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            break
    else:
        return None                 # fast hit None - no cycle

    slow = head
    while slow is not fast:
        slow = slow.next
        fast = fast.next
    return slow
```

**Complexity.** O(n) time, O(1) space.

**Duplicate problems:**
- Linked List Cycle (LC 141) - the detection-only subset of this same algorithm.

---

### 3. Palindrome Linked List (LC 234)

Determine if a singly linked list is a palindrome, ideally in O(1) space. Constraints: `1 ≤ n ≤ 5×10⁴`.

**Approach.** Use fast & slow to find the middle in one pass, reverse the second half in-place, then walk two pointers (one from head, one from the reversed second-half's head) comparing values. This combines fast & slow (finding the midpoint without knowing length up front) with in-place reversal - a common pairing.

```python
def is_palindrome(head: ListNode | None) -> bool:
    if not head or not head.next:
        return True

    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next

    prev = None
    while slow:
        nxt = slow.next
        slow.next = prev
        prev = slow
        slow = nxt

    left, right = head, prev
    while right:
        if left.val != right.val:
            return False
        left = left.next
        right = right.next
    return True
```

**Complexity.** O(n) time, O(1) space (in-place reversal, no auxiliary array).

**Duplicate problems:**
- Reorder List (LC 143) - same "find middle + reverse second half" combo, then interleave instead of compare.
- Middle of the Linked List (LC 876) - the fast & slow midpoint-finding half of this problem in isolation.

