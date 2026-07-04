# In-place Reversal

## Prerequisites

- [Linked List](../data-structures/linked-list.md) [Must read] - the pattern rewires `next` pointers; you must understand node structure and traversal first
- [Two Pointers](./two-pointers.md) [Must read] - prev/curr/next is a specialised two-pointer walk; the mental model transfers directly

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

## What it is

In-place reversal rewires the `next` pointers of a linked list (or a subrange) using three variables - `prev`, `curr`, `next` - in a single O(n) pass, consuming O(1) extra space.

**Mental model:** think of flipping arrows one at a time. At each step you save where you're going (`next = curr.next`), flip the arrow (`curr.next = prev`), then shuffle the trio one node forward (`prev = curr; curr = next`). When `curr` is `None`, `prev` is the new head.

> **Interview soundbite:** "Three variables, one pass - save the next, flip the arrow, advance. Reversal is just arrow-flipping."

## Recognition signals

**(a) Trigger phrases** - literal problem-statement snippets that flag this pattern:

- "reverse a linked list" / "reverse a singly linked list in place"
- "reverse the nodes of a linked list k at a time"
- "reverse a sublist from position m to n"
- "check whether a linked list is a palindrome"
- "rotate the linked list to the right by k places"

**(b) Structural cues** - regardless of wording:

- Input is a **singly or doubly linked list** (not an array).
- The required output is a **reordering of the same nodes** - no new nodes, no extra data structure.
- The constraint is **O(1) extra space** (or the problem says "in place").
- Sublist reversal: two positions (`m`, `n`) or a group size (`k`) are given that define the range to flip.

**(c) Not to be confused with:**

- **Two Pointers on arrays** - two pointers reverse arrays by swapping values at indices; in-place reversal on lists rewires pointers, not values, because random access doesn't exist. The swap approach reads and writes values; the pointer-rewire approach never touches values at all.
- **Fast & Slow Pointers** - Floyd's tortoise/hare finds the middle or detects cycles; it does not reverse anything. In-place reversal uses fast/slow only to locate a boundary (e.g. palindrome midpoint), then runs the three-pointer flip from there. When both appear in the same problem, they are sequential steps, not the same mechanic.
- **Rotate (deque-style)** - rotating a list by k looks similar to reversal (both change node order) but the optimal implementation is ring-cut, not reversal. Candidates who confuse the two reach for the three-reversal algorithm (`reverse all`, `reverse [0..k-1]`, `reverse [k..n-1]`) which is correct but requires three passes where ring-cut needs one; on a linked list specifically the ring-cut is also O(1) additional pointer operations.

## How it works

**Core operation - reverse an entire list:**

Three pointers march forward together. At each node, the `next` pointer is flipped to point backward.

```
Initial:  None ← ? ? ?    head → [1] → [2] → [3] → [4] → None
                  prev    curr

Step 1: save next=2, flip 1→None, advance
         prev=[1]  curr=[2]  [1]→None, [2]→[3]→[4]→None

Step 2: save next=3, flip 2→1, advance
         prev=[2]  curr=[3]  [2]→[1]→None, [3]→[4]→None

Step 3: save next=4, flip 3→2, advance
         prev=[3]  curr=[4]  [3]→[2]→[1]→None, [4]→None

Step 4: save next=None, flip 4→3, advance
         prev=[4]  curr=None  [4]→[3]→[2]→[1]→None

curr is None → stop. New head = prev = [4].
```

**Sublist reversal (positions m to n, 1-indexed):**

Walk to node `m-1` (the node just before the sublist), keep a pointer `tail_of_first` to it and `tail_of_sub` to node `m`. Reverse exactly `n - m + 1` nodes. Then re-stitch:

```
Before: ... → [m-1] → [m] → [m+1] → ... → [n] → [n+1] → ...
                ↑                             ↑
           tail_of_first                 tail_of_sub (after reversal = new tail)

After reversal of sublist:
[m] ← [m+1] ← ... ← [n]   (prev = [n], new sublist head)

Stitch:
tail_of_first.next = prev   (= [n])
tail_of_sub.next   = curr   (= [n+1], the node after the sublist)
```

**Reverse k-group:**

Repeatedly locate the next k nodes, reverse them as a sublist, stitch, and advance. If fewer than k nodes remain, leave them as-is (or reverse them, per the problem).

```
k=3, list: [1]→[2]→[3]→[4]→[5]→[6]→None

Group 1: reverse [1],[2],[3] → [3]→[2]→[1]
Group 2: reverse [4],[5],[6] → [6]→[5]→[4]
Result:  [3]→[2]→[1]→[6]→[5]→[4]→None
```

## Skeleton

**CLRS pseudocode - reverse entire list:**

```
REVERSE-LIST(head)
  prev ← None
  curr ← head
  while curr ≠ None
    next_node ← curr.next    ▷ save the forward link
    curr.next  ← prev        ▷ flip the arrow
    prev       ← curr        ▷ advance prev
    curr       ← next_node   ▷ advance curr
  return prev                ▷ new head
```

**CLRS pseudocode - reverse sublist [m, n] (1-indexed):**

```
REVERSE-SUBLIST(head, m, n)
  dummy ← new node; dummy.next ← head
  tail_of_first ← dummy
  for i = 1 to m-1
    tail_of_first ← tail_of_first.next
  tail_of_sub ← tail_of_first.next
  prev ← None; curr ← tail_of_sub
  for i = 1 to n-m+1
    next_node ← curr.next
    curr.next  ← prev
    prev       ← curr
    curr       ← next_node
  tail_of_first.next ← prev      ▷ attach reversed sublist
  tail_of_sub.next   ← curr      ▷ attach remainder
  return dummy.next
```

**Python template - reverse entire list:**

```python
from __future__ import annotations
from typing import Optional

class ListNode:
    def __init__(self, val: int = 0, nxt: Optional["ListNode"] = None):
        self.val = val
        self.next = nxt

def reverse_list(head: Optional[ListNode]) -> Optional[ListNode]:
    prev: Optional[ListNode] = None
    curr = head
    while curr:
        next_node = curr.next   # save
        curr.next = prev        # flip
        prev = curr             # advance prev
        curr = next_node        # advance curr
    return prev                 # new head

# your logic here - adapt boundary (sublist start/end, k-group size)
```

**Python template - reverse sublist:**

```python
def reverse_sublist(
    head: Optional[ListNode], m: int, n: int
) -> Optional[ListNode]:
    dummy = ListNode(0, head)
    tail_of_first: ListNode = dummy
    for _ in range(m - 1):
        tail_of_first = tail_of_first.next  # guaranteed non-None by valid m

    tail_of_sub = tail_of_first.next
    assert tail_of_sub is not None
    prev: Optional[ListNode] = None
    curr: Optional[ListNode] = tail_of_sub
    for _ in range(n - m + 1):
        assert curr is not None
        next_node = curr.next
        curr.next = prev
        prev = curr
        curr = next_node

    tail_of_first.next = prev
    tail_of_sub.next = curr
    return dummy.next
```

## Complexity

| Variant | Time | Space |
|---------|------|-------|
| Reverse entire list | O(n) | O(1) |
| Reverse sublist [m, n] | O(n) | O(1) |
| Reverse k-groups | O(n) | O(1) iterative; O(n/k) recursive call stack |
| Palindrome check | O(n) | O(1) |
| Rotate right by k | O(n) | O(1) |

## Constraints & approach

| Input size | Constraint signal | Reach for this pattern? |
|------------|-------------------|------------------------|
| n ≤ 10⁵, linked list | "in place", O(1) space | **Yes** - the defining case |
| n ≤ 10⁵, **array** | "reverse in place" | **No** - swap by index instead; no pointer rewiring needed |
| n ≤ 10⁵, k-groups specified | k ≥ 1, reverse k at a time | **Yes** - iterative k-group reversal |
| n ≤ 10⁵, "palindrome" on list | no extra space allowed | **Yes** - find mid (fast/slow), reverse second half, compare |
| n ≤ 10⁵, "palindrome" on list | O(n) space allowed | **No** - copy values to array, two-pointer check is simpler |
| n > 10⁵ (large list), recursive reversal asked | deep stack risk | **Caution** - iterative always; recursive hits O(n) stack frames and will stack-overflow in Python at n ≈ 10³ |

**When the constraint pushes you off:** if the input is an array (not a linked list), use index swaps - pointer rewiring is irrelevant. If extra O(n) space is allowed and the code simplicity matters more, copy to a list and reverse with slicing.

**Real-world usage:** in-place list reversal is the kernel of undo/redo stacks in editors (reverse the operation list to undo a batch), and the basis of doubly-linked-list re-splicing in Linux kernel's `list_del` + `list_add` - the same three-pointer rewire, just with both `prev` and `next` updated. **At scale:** for very long lists (n > 10⁷), the bottleneck shifts from pointer count to TLB pressure - each `curr.next` dereference is a pointer-chase to an arbitrary heap address, and at large n those addresses stop fitting in L3. A chunked approach (reverse in cache-sized segments, then stitch) is measurably faster on hardware even though Big-O is the same O(n).

## Variations

- **Reverse entire list** - the base case; all other variants build on it.
- **Reverse sublist [m, n]** - one extra walk to position `m`, same core loop, two re-stitch operations.
- **Reverse k-groups** (LC 25) - repeat sublist reversal in chunks; the hardest variant because you must detect when fewer than k nodes remain.
- **Palindrome check** (LC 234) - find the midpoint with fast/slow pointers, reverse the second half in place, compare front-to-back, optionally restore.
- **Rotate right by k** (LC 61) - find the tail, form a ring (tail.next = head), walk to the new tail at position `n - k % n`, cut.
- **Reorder list** (LC 143) - find mid, reverse second half, interleave the two halves.
- **Reverse in pairs** - k=2 special case of k-groups; simpler stitching.

## CP-primitives

**1. Iterative k-group reversal with a dummy head sentinel**

The standard k-group recursive solution has O(n/k) call-stack depth - fine for small k, but contest judges sometimes set k close to n. The iterative version uses a dummy head and a `group_prev` pointer that advances by k each iteration:

```python
def reverse_k_group(head: Optional[ListNode], k: int) -> Optional[ListNode]:
    dummy = ListNode(0, head)
    group_prev = dummy
    while True:
        kth = get_kth(group_prev, k)   # walk k steps; None if < k remain
        if not kth:
            break
        group_next = kth.next
        prev, curr = kth.next, group_prev.next
        while curr != group_next:
            nxt = curr.next
            curr.next = prev
            prev = curr
            curr = nxt
        tmp = group_prev.next
        group_prev.next = kth
        group_prev = tmp
    return dummy.next

def get_kth(node: Optional[ListNode], k: int) -> Optional[ListNode]:
    while node and k > 0:
        node = node.next
        k -= 1
    return node
```

Why for CP: O(n) time, O(1) space - avoids stack-overflow on n = 10⁵ with k = 10⁵.

**2. In-place palindrome check (reverse + compare + restore)**

Contests occasionally ask to verify palindrome without extra space AND restore the original list after. The trick: reverse second half in place, compare, reverse back.

```python
def is_palindrome(head: Optional[ListNode]) -> bool:
    slow: Optional[ListNode] = head
    fast = head
    while fast and fast.next:
        slow = slow.next if slow else None
        fast = fast.next.next
    second = reverse_list(slow)
    copy = second
    result = True
    p, q = head, second
    while q:
        assert p is not None
        if p.val != q.val:
            result = False
            break
        p = p.next
        q = q.next
    reverse_list(copy)
    return result
```

Why for CP: O(n) time, O(1) space - passes strict memory constraints; the restore step is required when the judge checks the original list post-call.

**3. Right-rotation as ring-cut**

Rotation by k is equivalent to: form a ring, find the new tail at position `n - k % n - 1`, cut. Avoids a full reversal entirely.

```python
def rotate_right(head: Optional[ListNode], k: int) -> Optional[ListNode]:
    if not head or not head.next or k == 0:
        return head
    tail = head
    n = 1
    while tail.next:
        tail = tail.next
        n += 1
    tail.next = head          # form ring
    steps = n - k % n
    new_tail = head
    for _ in range(steps - 1):
        assert new_tail.next is not None
        new_tail = new_tail.next
    assert new_tail.next is not None
    new_head = new_tail.next
    new_tail.next = None          # cut
    return new_head
```

Why for CP: O(n) single pass to find length + O(n) walk to cut - cleaner than three-reversal approach and harder to get wrong under contest time pressure.

## Worked problems

### Reverse Linked List (LC 206)

Reverse a singly linked list and return the new head. No space constraint stated, but O(1) is expected.

Apply the three-pointer core directly - `prev=None`, `curr=head`, flip and advance until `curr` is `None`, return `prev`. The simplest case; no stitching needed.

**Constraint:** n ≤ 5000; O(n)/O(1).

### Reverse Linked List II (LC 92)

Given a linked list and integers `left` and `right` (1-indexed), reverse the nodes from position `left` to `right` in one pass.

Walk `left - 1` steps to find `tail_of_first`. The node at `left` becomes `tail_of_sub`. Run the core reversal loop `right - left + 1` times, then stitch: `tail_of_first.next = prev`, `tail_of_sub.next = curr`. A dummy head avoids a special case when `left = 1`.

**Constraint:** n ≤ 500, 1 ≤ left ≤ right ≤ n; O(n)/O(1).

### Reverse Nodes in k-Group (LC 25)

Reverse every consecutive group of k nodes. If the final group has fewer than k nodes, leave it as-is.

Use `get_kth` to probe whether k nodes remain before committing to a reversal. Reverse the group using `group_next = kth.next` as the stopping sentinel, then advance `group_prev`. The dummy head keeps the stitching uniform for the first group.

**Constraint:** n ≤ 5000, 1 ≤ k ≤ n; O(n)/O(1) iterative. The recursive O(n/k) stack solution is also accepted but risks stack overflow at large n on some judges.

### Palindrome Linked List (LC 234)

Return true if the linked list is a palindrome. O(n) time, O(1) space.

Fast/slow pointers find the midpoint; `slow` lands at the start of the second half. Reverse the second half in place. Walk both halves from their heads, comparing values - a mismatch means not a palindrome. Optionally reverse the second half back.

**Constraint:** n ≤ 10⁵; O(n)/O(1) required.

### Reorder List (LC 143)

Reorder L₀ → Lₙ → L₁ → Lₙ₋₁ → L₂ → Lₙ₋₂ → … in place.

Three sequential applications of the pattern: (1) fast/slow finds the midpoint and cuts the list; (2) three-pointer reversal turns the second half into a reversed list; (3) the interleave merge alternates nodes from front and reversed-back. The invariant for step 3: at each iteration `first` points to the current front node and `second` to the current back node - after wiring `first.next = second` and `second.next = old_first.next`, both pointers advance to their successors. No new nodes created.

**Constraint:** n ≤ 5 × 10⁴; O(n)/O(1).

## Pitfalls

**1. Losing the forward link before flipping.**
The single most common bug: `curr.next = prev` before saving `next_node = curr.next`. The forward half of the list is now unreachable. Save first, flip second - always.

**2. Forgetting the dummy head for sublist reversal when `m = 1`.**
Without a dummy, `tail_of_first` would be `None` (there's no node before position 1), and `tail_of_first.next = prev` crashes. The dummy gives `tail_of_first` a valid node even when the sublist starts at the head.

**3. Off-by-one in loop count for k-group.**
Reversing k nodes requires exactly k iterations of the flip loop. Fenceposting on `curr != group_next` vs. `i < k` is equivalent, but mixing them with boundary conditions (dummy, tail sentinel) produces off-by-one corruptions. Pick one style and verify on k=1 and k=n.

**4. Stitching in the wrong order for sublist reversal.**
After reversing `[m..n]`, you have two re-stitch operations: `tail_of_first.next = prev` (attach the reversed head) and `tail_of_sub.next = curr` (attach the remainder). Doing them in reverse order - attaching `curr` to `tail_of_sub` first - is correct only if `tail_of_first` and `tail_of_sub` are not the same node. If `m = 1`, `tail_of_first` is the dummy and `tail_of_sub` is the original head, so either order works - but for `m > 1`, doing `tail_of_first.next = prev` first is the safe pattern because `tail_of_sub` is still reachable before you change `tail_of_first.next`.

**5. Stack overflow on recursive reversal with large n.**
Python's default recursion limit is ~1000. A recursive reverse on n = 10⁵ nodes will crash. Always use the iterative three-pointer version in interviews and contests.

**6. Not restoring the list after palindrome check.**
Some problems (and some interviewers) expect the original list to be intact after the check. Reverse the second half back before returning.

## First 30 seconds

"This is in-place reversal - I need to rewire `next` pointers without extra space. Three variables: `prev = None`, `curr = head`, `next_node`. Each step: save `curr.next`, flip `curr.next = prev`, advance both. For a sublist I walk to position `m-1` first, reverse `n-m+1` nodes, then re-stitch at both ends. Dummy head handles `m = 1` cleanly."

## Related

**Structures this pattern operates on:**
- [Linked List](../data-structures/linked-list.md) - the only structure this pattern applies to directly

**Sibling patterns - same family of pointer techniques:**
- [Fast & Slow Pointers](./fast-slow-pointers.md) - combined with in-place reversal for palindrome check and reorder list
- [Two Pointers](./two-pointers.md) - the conceptual ancestor; in-place reversal is two pointers specialised to pointer rewiring
- [Two Heaps](./two-heaps.md) - unrelated mechanism but often appears in the same "linked list hard" problem cluster

## Practice problems

### Reverse Linked List (LC 206)

Given the head of a singly linked list, reverse it and return the new head. n ≤ 5000.

**Approach:** Three-pointer core - `prev=None`, `curr=head`. Each iteration: save `curr.next`, set `curr.next = prev`, advance `prev = curr`, `curr = saved`. Return `prev` when `curr` is `None`.

```python
from typing import Optional

class ListNode:
    def __init__(self, val: int = 0, next: Optional["ListNode"] = None):
        self.val = val
        self.next = next

def reverseList(head: Optional[ListNode]) -> Optional[ListNode]:
    prev: Optional[ListNode] = None
    curr = head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev
```

**Complexity:** O(n) time, O(1) space.

**Duplicate problems:**
- Reverse String (LC 344) - same flip-in-place idea but on an array; swap by index instead of rewiring pointers, same O(n)/O(1).
- Reverse Words in a String III (LC 557) - split on spaces, reverse each word's character list in place; identical three-pointer mechanic on a character slice.

---

### Reverse Nodes in k-Group (LC 25)

Given the head of a linked list and integer k, reverse every k consecutive nodes. If the tail group has fewer than k nodes, leave it as-is. n ≤ 5000.

**Approach:** Iterative with dummy head. Before each group, call `get_kth` to verify k nodes remain. If not, stop. Reverse k nodes using `group_next` (the node after the group) as the sentinel for the inner loop. Stitch `group_prev.next = kth` and advance `group_prev` to the old group head (now tail).

```python
from typing import Optional

def reverseKGroup(head: Optional[ListNode], k: int) -> Optional[ListNode]:
    def get_kth(node: Optional[ListNode], k: int) -> Optional[ListNode]:
        while node and k > 0:
            node = node.next
            k -= 1
        return node

    dummy = ListNode(0, head)
    group_prev = dummy

    while True:
        kth = get_kth(group_prev, k)
        if not kth:
            break
        group_next = kth.next
        prev: Optional[ListNode] = kth.next
        curr: Optional[ListNode] = group_prev.next
        while curr != group_next:
            assert curr is not None
            nxt = curr.next
            curr.next = prev
            prev = curr
            curr = nxt
        tmp = group_prev.next
        group_prev.next = kth
        assert tmp is not None
        group_prev = tmp

    return dummy.next
```

**Complexity:** O(n) time, O(1) space.

**Duplicate problems:**
- Swap Nodes in Pairs (LC 24) - k=2 special case; same iterative k-group template with k hardcoded to 2.

---

### Palindrome Linked List (LC 234)

Given the head of a singly linked list, return true if it is a palindrome. n ≤ 10⁵; O(n) time, O(1) space required.

**Approach:** Fast/slow pointers find the midpoint (`slow` lands at start of second half). Reverse the second half in place. Walk both halves simultaneously comparing values - any mismatch → false. Reverse the second half back before returning (restores the original list).

```python
from typing import Optional

def isPalindrome(head: Optional[ListNode]) -> bool:
    def reverse(node: Optional[ListNode]) -> Optional[ListNode]:
        prev = None
        while node:
            nxt = node.next
            node.next = prev
            prev = node
            node = nxt
        return prev

    slow: Optional[ListNode] = head
    fast = head
    while fast and fast.next:
        slow = slow.next if slow else None
        fast = fast.next.next

    second = reverse(slow)
    copy = second
    p, q = head, second
    result = True
    while q:
        assert p is not None
        if p.val != q.val:
            result = False
            break
        p = p.next
        q = q.next
    reverse(copy)
    return result
```

**Complexity:** O(n) time, O(1) space.

**Duplicate problems:**
- Valid Palindrome II (LC 680) - on a string, skip at most one character; same two-pointer compare logic without pointer rewiring.
- Linked List Palindrome check on circular list - same algorithm; find mid, reverse, compare; break the cycle first.

---

### Reorder List (LC 143)

Given a linked list L₀ → L₁ → … → Lₙ, reorder it to L₀ → Lₙ → L₁ → Lₙ₋₁ → L₂ → Lₙ₋₂ → … in place. n ≤ 5 × 10⁴.

**Approach:** Three steps - (1) find the midpoint with fast/slow; (2) reverse the second half; (3) interleave: alternate `p1.next = p2`, then advance `p1 = old_p1_next`, repeat until one half is exhausted. No extra space - all pointer rewiring.

```python
from typing import Optional

def reorderList(head: Optional[ListNode]) -> None:
    if not head or not head.next:
        return

    slow: ListNode = head
    fast = head
    while fast.next and fast.next.next:
        slow = slow.next  # guaranteed non-None while fast.next.next exists
        fast = fast.next.next

    second = slow.next
    slow.next = None
    prev = None
    while second:
        nxt = second.next
        second.next = prev
        prev = second
        second = nxt
    second = prev

    first: Optional[ListNode] = head
    while second:
        tmp1, tmp2 = first.next, second.next  # type: narrowed by loop guard
        first.next = second
        second.next = tmp1
        first = tmp1
        second = tmp2
```

**Complexity:** O(n) time, O(1) space.

**Duplicate problems:**
- Interleaving two lists (variant) - same merge step; the only difference is the second list isn't the reversed tail of the first.
