# Treap

## Prerequisites

- [Binary Search Tree](./binary-search-tree.md) [Must read]
- [Heap](./heap.md) [Must read]
- [Balanced BST](./balanced-bst.md) [Should read]

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [How it works](#how-it-works)
- [Operations](#operations)
- [Complexity summary](#complexity-summary)
- [When to use / when not](#when-to-use--when-not)
- [Comparison](#comparison)
- [Variants](#variants)
- [Traversal & invariant](#traversal--invariant)
- [Implementation](#implementation)
- [CP-primitives](#cp-primitives)
- [Gotchas / edge cases](#gotchas--edge-cases)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

## What it is

A **treap** (tree + heap) is a binary search tree that stays balanced **with high probability** by giving every node a second, randomly assigned **priority** and maintaining the **heap property on priorities** (each node's priority ≥ its children's) in addition to the **BST property on keys**. Insertion order stops mattering because the tree's shape is determined by random priorities, not by the order keys arrive.

Mental model: **a BST where every node also draws a lottery ticket, and the tree is always kept so the biggest ticket is on top.** Two invariants coexist on the same nodes: left-to-right the keys read in sorted BST order; top-to-bottom the priorities read in max-heap order. Because priorities are random, the resulting shape is (in expectation) the same shape you'd get from inserting keys into a BST in **random order** - even if the actual key insertion order was sorted and adversarial.

> **Takeaway (say this out loud):** "A treap is a BST with a random priority per node, kept heap-ordered on priority - so the tree's shape is always as balanced as a random BST, in expectation, no matter what order keys arrive in. Balance without rotation bookkeeping - the randomness does the work."

## How it works

Every node stores `(key, priority)`. **BST order** governs the keys (left < node < right, as always). **Max-heap order** governs the priorities (`node.priority ≥ child.priority` for every child). Priorities are assigned once, uniformly at random, when a node is created - never recomputed.

```
Insert keys 5, 3, 8, 1 with random priorities (shown in brackets):

insert (5, p=50):        (5,50)

insert (3, p=80):        (3,80)     ← 3 < 5 but priority(3)=80 > priority(5)=50
                             \        so 3 must become the new root - rotate right
                            (5,50)

insert (8, p=30):        (3,80)
                             \
                            (5,50)
                               \
                              (8,30)   ← BST-consistent AND heap-consistent, no rotation needed

insert (1, p=90):        priority(1)=90 is the highest seen - 1 must become the root.
                          Rotate 1 up past 3:

                            (1,90)
                                \
                              (3,80)
                                  \
                                (5,50)
                                    \
                                  (8,30)

Final treap: BST order left→right reads 1,3,5,8 (sorted).
Heap order top→bottom reads 90,80,50,30 (max-heap, strictly decreasing down this chain).
```

**Why this balances the tree:** a node's priority is independent of its key and independent of insertion order. The probability that a given node ends up at depth d falls off exponentially with d - the same guarantee you'd get from inserting keys in a **uniformly random order**, whether or not the actual arrival order was sorted or adversarial. **Expected height is O(log n)**, though (unlike AVL/Red-Black) there is no hard worst-case bound - an adversary who could predict the random priorities could still force a chain, but with a good PRNG this never happens in practice.

## Operations

| Operation | Time (expected) | Time (worst case) | Notes |
|-----------|------------------|--------------------|-------|
| Search | O(log n) | O(n) | Identical to plain BST search - priorities are irrelevant to lookup |
| Insert | O(log n) | O(n) | BST-insert as a leaf, then rotate up while it violates the heap property |
| Delete | O(log n) | O(n) | Rotate the node down (toward its higher-priority child) until it's a leaf, then remove |
| Split (key k) | O(log n) | O(n) | Partition into two treaps: all keys < k, all keys ≥ k |
| Merge (two treaps) | O(log n) | O(n) | Combine two treaps where every key in the left < every key in the right |

**Split and merge are the treap's signature operations** - no rotation-balanced scheme (AVL, Red-Black) supports them this simply, because split/merge there would require re-establishing a rigid invariant across an arbitrary cut point. A treap's randomized structure makes split/merge a natural O(log n) recursive walk (detailed under [CP-primitives](#cp-primitives)).

## Complexity summary

| Metric | Expected | Worst case |
|--------|----------|------------|
| Height | O(log n) | O(n) (probability → 0 as n grows, with good randomness) |
| Search / Insert / Delete (time) | O(log n) | O(n) |
| Insert / Delete call-stack space | O(log n) | O(n) - the recursive implementation above recurses one frame per level descended, so stack depth tracks height exactly |
| Total structure space | O(n) | O(n) - one extra priority field per node vs a plain BST node |

The **expected** bound is the number that matters in practice - the classic result (Seidel & Aragon, 1996) shows expected height is O(log n) via the same analysis as randomized quicksort's expected depth, and the worst case requires an adversary who can predict the RNG, which a correctly-seeded PRNG makes practically impossible. **Space complexity for the recursive insert/delete must include this call-stack term** - it is not O(1) auxiliary space; a converted-to-iterative version (walking down with an explicit stack or parent pointers) would trade the call-stack term for an explicit O(log n) data structure instead, not eliminate it.

Note there is **no amortized cost to prove here**, unlike a dynamic array or hash table: "expected" (averaged over random priority draws, for a single fixed sequence of operations) and "amortized" (worst-case-per-op cost averaged over a sequence, no randomness involved) are different guarantees. A treap has the former, not the latter - there's no accounting or potential-function argument to show because no operation is ever "paying off" a debt from an earlier cheap operation; every insert/delete is independently O(log n) in expectation.

## When to use / when not

Reach for a treap when you want **BST-balance with far simpler code than AVL or Red-Black rotations**, or when you specifically need **split/merge by key** - a capability rotation-balanced trees don't offer cleanly. Skip it when you need a **hard worst-case guarantee** (a security-sensitive service accepting adversarial input where an attacker controls both keys and, in a broken implementation, the RNG seed) - there, Red-Black's deterministic O(log n) worst case is the safer choice. Skip it also when the language's standard library already ships a production-grade balanced map (`std::map`, Java `TreeMap`) - hand-rolling a treap to replace a mature library structure is rarely justified outside of contest code or when split/merge is the actual feature you need.

Real-world usage: treaps back the implicit-treap technique for maintaining an **array under insert/delete/reverse at any position** in O(log n) (competitive programming's "sequence with range reversal" problems), and they appear in **CRDTs and persistent/functional data structures** where a treap's simple split/merge composes well with structural sharing. **At scale:** a treap's pointer-chasing structure means every operation touches O(log n) scattered heap allocations - at n > 10⁷ nodes, cache-miss cost per operation dominates the same way it does for any pointer-based tree (AVL, Red-Black), and a cache-friendlier flat structure (a B-tree, or an array-backed implicit treap) wins if throughput at that scale matters more than code simplicity.

## Comparison

| Structure | Balance mechanism | Height guarantee | Split/Merge | Code complexity | Pick it when… |
|-----------|--------------------|--------------------|--------------|-------------------|----------------|
| [AVL Tree](./avl-tree.md) | Deterministic rotations on strict height rule | O(log n) worst case | Not native - awkward to implement | High (4 rotation cases) | You need the tightest guaranteed height and writes are rare |
| [Red-Black Tree](./red-black-tree.md) | Deterministic rotations + recoloring | O(log n) worst case | Not native - awkward to implement | High (color-case analysis) | General-purpose library map; worst-case matters (adversarial input, real-time SLAs) |
| **Treap** | Randomized priority, heap property | O(log n) expected, no hard worst-case bound | **Native, O(log n), simple recursive split/merge** | Low (~30 lines, no case analysis) | You want simple code, or you specifically need split/merge by key (implicit sequences, persistent structures) |
| [Skip List](./skip-list.md) | Randomized tower heights | O(log n) expected, no hard worst-case bound | Not native | Low-medium | You want randomized simplicity without a tree at all - a sorted linked structure suffices |

**Pick it when…crossover:** a treap beats AVL/Red-Black specifically when split/merge-by-key is a requirement (e.g. "maintain a sequence supporting insert-at-position and reverse-a-range") - at that point AVL/Red-Black's rotation machinery doesn't generalize cleanly and a treap's O(log n) split/merge is the practical winner, not just the simpler one. Conversely, a treap loses to Red-Black the moment the workload is adversarial-input-facing in production (an attacker who can force worst-case shape via a compromised or predictable RNG is a real, if narrow, threat model) - Red-Black's deterministic worst case removes that risk entirely.

## Variants

- **Implicit treap (array-as-treap):** drop the explicit key field and instead define "key" implicitly as **in-order position** - subtree size replaces key comparisons. This turns the treap into a dynamic array supporting insert-at-index, delete-at-index, and **range reverse/rotate** all in O(log n), by lazily propagating a "reversed" flag down subtrees exactly like a lazy segment tree. The CP staple built on treaps.
- **Persistent treap:** on every "mutation," instead of modifying nodes in place, copy the O(log n) nodes on the path and leave the rest shared - gives O(log n) time and space per version while keeping every prior version queryable, useful for versioned/undo-supporting structures.
- **Treap with duplicate keys:** allow equal keys by breaking ties consistently (e.g. always insert duplicates to the right) - useful when the treap backs a multiset rather than a set.

## Traversal & invariant

A treap maintains **two simultaneous invariants** on the same node set:

1. **BST invariant** (on `key`): for every node, all keys in the left subtree < `node.key` < all keys in the right subtree.
2. **Max-heap invariant** (on `priority`): for every node, `node.priority ≥ child.priority` for both children.

**In-order traversal** reads keys in sorted order (invariant 1) - identical to any BST. **The heap invariant is what keeps the tree shallow**: because priorities are assigned uniformly at random and independent of key, the tree's shape is statistically indistinguishable from the shape you'd get inserting the same keys into a plain BST in a **uniformly random order** - a well-known result (the expected height of a randomly-built BST is O(log n), proven via linearity of expectation over each node's expected depth).

**Restoring both invariants after insert/delete is where rotation comes back in** - it's the same left/right rotation primitive from [Balanced BST](./balanced-bst.md#rotations-the-shared-mechanic), just triggered by a **priority violation** instead of a height-imbalance check: insert as a BST leaf, then rotate the new node upward past any parent with a smaller priority, until the heap property holds again. Delete does the reverse - rotate the node to be deleted downward (always toward whichever child has the higher priority) until it's a leaf, then splice it out.

## Implementation

**Pseudocode (CLRS style) - insert:**

```
Treap-Insert(T, key, priority):
    if T is null
        return Node(key, priority)
    if key < T.key
        T.left ← Treap-Insert(T.left, key, priority)
        if T.left.priority > T.priority
            T ← Rotate-Right(T)
    else
        T.right ← Treap-Insert(T.right, key, priority)
        if T.right.priority > T.priority
            T ← Rotate-Left(T)
    return T

Rotate-Right(y):                    ▷ pulls y.left up
    x ← y.left
    y.left ← x.right
    x.right ← y
    return x                        ▷ x is the new subtree root

Rotate-Left(x):                     ▷ pulls x.right up (inverse of above)
    y ← x.right
    x.right ← y.left
    y.left ← x
    return y                        ▷ y is the new subtree root
```

**Python template:**

```python
import random
from typing import Optional


class TreapNode:
    def __init__(self, key: int) -> None:
        self.key = key
        self.priority: float = random.random()
        self.left: Optional["TreapNode"] = None
        self.right: Optional["TreapNode"] = None


def rotate_right(y: TreapNode) -> TreapNode:
    x = y.left
    assert x is not None
    y.left = x.right
    x.right = y
    return x


def rotate_left(x: TreapNode) -> TreapNode:
    y = x.right
    assert y is not None
    x.right = y.left
    y.left = x
    return y


def insert(root: Optional[TreapNode], key: int) -> TreapNode:
    if root is None:
        return TreapNode(key)
    if key < root.key:
        root.left = insert(root.left, key)
        if root.left.priority > root.priority:
            root = rotate_right(root)
    else:
        root.right = insert(root.right, key)
        if root.right.priority > root.priority:
            root = rotate_left(root)
    return root


def delete(root: Optional[TreapNode], key: int) -> Optional[TreapNode]:
    if root is None:
        return None
    if key < root.key:
        root.left = delete(root.left, key)
    elif key > root.key:
        root.right = delete(root.right, key)
    else:
        # Found the node - rotate it down toward the higher-priority child
        # until it's a leaf, then drop it.
        if root.left is None:
            return root.right
        if root.right is None:
            return root.left
        if root.left.priority > root.right.priority:
            root = rotate_right(root)
            root.right = delete(root.right, key)
        else:
            root = rotate_left(root)
            root.left = delete(root.left, key)
    return root
```

Python's `random.random()` gives a float priority - collisions are astronomically unlikely, so no tie-breaking logic is needed in practice. In C++/Java contest code, a 32-bit `rand()` is standard; with small n, prefer a wider RNG (`mt19937`) to reduce collision probability.

## CP-primitives

### Split and merge (the treap's signature contest tool)

`split(T, key)` partitions a treap into two treaps `(L, R)` where every key in `L` is `< key` and every key in `R` is `≥ key` - O(log n), no rebalancing needed afterward because the heap property is preserved automatically on each half. `merge(L, R)` is the inverse: combine two treaps where every key in `L` is less than every key in `R`, by always attaching the lower-priority root as a child of the higher-priority one - O(log n).

**Why for CP:** split/merge is the primitive behind "implicit treap" range operations (insert at position i, delete range, reverse range) that appear constantly in competitive programming as "array with fast arbitrary insert/reverse." No rotation-balanced tree offers this as simply.

```python
def split(root: Optional[TreapNode], key: int) -> Tuple[Optional[TreapNode], Optional[TreapNode]]:
    if root is None:
        return None, None
    if root.key < key:
        l, r = split(root.right, key)
        root.right = l
        return root, r
    else:
        l, r = split(root.left, key)
        root.left = r
        return l, root


def merge(left: Optional[TreapNode], right: Optional[TreapNode]) -> Optional[TreapNode]:
    if left is None:
        return right
    if right is None:
        return left
    if left.priority > right.priority:
        left.right = merge(left.right, right)
        return left
    else:
        right.left = merge(left, right.left)
        return right
```

### Implicit treap for range operations

Replace `key` with **subtree size** (position), tracked as a `size` field updated on every rotation/split/merge. `split(T, k)` then means "split off the first k elements by position" rather than by key value - this is the mechanism behind O(log n) insert-at-index, delete-range, and (with a lazy `reversed` flag propagated like a lazy segment tree) range-reverse.

**Why for CP:** turns a treap into a "rope"-like structure - the standard answer to "maintain an array supporting insert/delete/reverse at arbitrary positions in O(log n)," a recurring hard-CP requirement plain arrays or linked lists can't meet.

## Gotchas / edge cases

- **Priority collisions.** If two nodes are assigned equal priority (rare with a good RNG and `float` priorities, more likely with a narrow 16-bit `rand()`), the heap-order tie-break becomes arbitrary and the tree's shape guarantee weakens slightly. Fix: use a wide-range RNG (`random.random()`'s float, or `mt19937` in C++), or break ties with a secondary random value.
- **Forgetting priorities are set once, never recomputed.** A common bug is regenerating a node's priority on every access (confusing it with a "recently used" score) - priorities must be assigned exactly once at insertion and never touched again, or the heap invariant analysis (and the balance guarantee) no longer holds.
- **At-scale trap: RNG predictability under adversarial input.** If the priority generator is a weak or seedable PRNG and an attacker can both choose the insertion key sequence *and* predict or influence priority values (e.g. a predictable seed, or a priority derived from a value the attacker controls), they can force worst-case O(n) chain shape - this is a real, documented attack class against naive treap implementations in adversarial-input services. Fix: use a cryptographically seeded RNG that the caller cannot observe or influence.
- **Recursion depth on the expected-case assumption.** The Python implementation above recurses per level; at expected O(log n) depth this is fine, but a treap given a maliciously-crafted or extremely unlucky priority sequence could in principle recurse to depth O(n), risking a Python recursion-limit error or stack overflow in languages without tail-call elimination - a risk plain AVL/Red-Black don't share, since their worst-case height is bounded by construction, not by chance.
- **Misconception: split/merge work because a treap is "balanced."** They work because of the **heap-ordered priority invariant specifically**, not balance as a general property - a plain balanced BST (AVL, Red-Black) is just as balanced but cannot split/merge this simply, because a height or color invariant doesn't decompose cleanly at an arbitrary cut point. A treap's balance is actually a *side effect* of the priority invariant; split/merge exploit the priority invariant directly, not "balance" in the abstract.

## What the interviewer probes for

**"Why would you use a treap instead of a Red-Black tree, given Red-Black has a guaranteed worst case?"**
Two reasons: implementation simplicity (a treap's insert/delete is ~30 lines with one rotation rule; Red-Black's fixup is a multi-case color analysis), and split/merge - a treap supports partitioning and combining by key in O(log n) natively, which Red-Black doesn't offer cleanly. If the workload needs split/merge (implicit sequences, persistent structures) or code simplicity matters more than a hard worst-case bound, treap wins; if adversarial-input safety matters (public-facing service, security-sensitive), Red-Black's deterministic bound is safer.

**"What breaks the O(log n) expected-height guarantee?"**
Only a broken or predictable random-priority source. The guarantee is probabilistic, derived from priorities being independent and uniformly random - it has nothing to do with key insertion order (that's the whole point). If an attacker can predict or influence priorities, they can force a degenerate chain; a correctly-seeded PRNG makes this practically impossible, but it is the treap's one real worst-case exposure that Red-Black doesn't share.

**"How would you support 'insert at array position i' and 'reverse range [l, r]' in O(log n) each?"**
Use an implicit treap: replace explicit keys with in-order position (tracked via a `size` field), and add a lazy `reversed` boolean per node that's propagated to children on descent (identical technique to a lazy segment tree). `split`/`merge` by position give O(log n) insert/delete at any index; toggling the `reversed` flag on the O(log n) nodes touched by a range gives O(log n) range-reverse.

## Practice problems

### 1. Design a Sorted Set with Fast Rank Queries

**Problem.** Design a data structure supporting `insert(x)`, `delete(x)`, `contains(x)`, and `rank(x)` (count of elements strictly less than x) - all in O(log n) expected time, on a stream of up to 10⁵ operations with values that may arrive in sorted (adversarial-for-a-plain-BST) order.

**Worked examples:**
- **Example 1**
  - **Input:** `insert(5); insert(3); insert(8); rank(6)` | **Output:** `2`
  - **Explanation:** elements less than 6 are `{3, 5}`, so rank is 2.
- **Example 2**
  - **Input:** `insert(1); insert(2); insert(3); insert(4); contains(3)` | **Output:** `True`
  - **Explanation:** insertion is in strictly sorted order - a plain BST would degrade to a chain here, but the treap's random priorities keep it balanced regardless.

**Constraints:** Up to `10⁵` operations; values fit in a 32-bit signed integer; insertion order may be adversarial (sorted) for a plain BST.

**Approach:** A treap augmented with a `subtree_size` field on each node answers `rank(x)` in O(log n): walk down as in a normal search, and at each node where you go right, add `size(left subtree) + 1` to a running rank counter. The key point for this problem is that insertion order being sorted - the exact case that breaks a plain BST - has no effect on the treap's expected height, because shape depends on random priorities, not arrival order.

```python
import random
from typing import Optional


class Node:
    def __init__(self, key: int) -> None:
        self.key = key
        self.priority = random.random()
        self.left: Optional["Node"] = None
        self.right: Optional["Node"] = None
        self.size = 1


def _size(n: Optional[Node]) -> int:
    return n.size if n else 0


def _update(n: Node) -> None:
    n.size = 1 + _size(n.left) + _size(n.right)


def rotate_right(y: Node) -> Node:
    x = y.left
    assert x is not None
    y.left = x.right
    x.right = y
    _update(y)
    _update(x)
    return x


def rotate_left(x: Node) -> Node:
    y = x.right
    assert y is not None
    x.right = y.left
    y.left = x
    _update(x)
    _update(y)
    return y


def insert(root: Optional[Node], key: int) -> Node:
    if root is None:
        return Node(key)
    if key < root.key:
        root.left = insert(root.left, key)
        if root.left.priority > root.priority:
            root = rotate_right(root)
    else:
        root.right = insert(root.right, key)
        if root.right.priority > root.priority:
            root = rotate_left(root)
    _update(root)
    return root


def rank(root: Optional[Node], key: int) -> int:
    if root is None:
        return 0
    if key <= root.key:
        return rank(root.left, key)
    return _size(root.left) + 1 + rank(root.right, key)
```

**Complexity:** O(log n) expected per operation, O(n) space.

**Duplicate problems:**
- Order-Statistics Tree (k-th smallest) - same augmented-size idea, answering "k-th smallest" instead of "rank of x"; identical treap-with-size-field mechanic.
- Count of Smaller Numbers After Self (LC 315) - solvable with the same rank-via-augmented-BST technique, processing the array right-to-left and querying rank before each insert.

### 2. Range Reverse and Query (Implicit Treap)

**Problem.** Given an initial array of n integers, support two operations any number of times: `reverse(l, r)` (reverse the subarray from index l to r, inclusive) and `query(i)` (return the value at index i after all reversals so far). n, queries ≤ 10⁵.

**Worked examples:**
- **Example 1**
  - **Input:** `arr = [1,2,3,4,5]; reverse(1,3); query(1)` | **Output:** `4`
  - **Explanation:** reversing indices 1..3 (0-indexed, values `[2,3,4]`) gives `[1,4,3,2,5]`; index 1 is now 4.
- **Example 2**
  - **Input:** `arr = [1,2,3]; reverse(0,2); reverse(0,2); query(0)` | **Output:** `1`
  - **Explanation:** two reversals of the same range cancel out, restoring the original array.

**Constraints:** `1 ≤ n ≤ 10⁵`; up to `10⁵` operations; a naive O(n) reverse per operation is `O(n · q)` ≈ `10¹⁰` - too slow, forcing the O(log n)-per-op structure.

**Approach:** This is the canonical implicit-treap application: build a treap keyed by **position** (not value), with a lazy `reversed` flag per node propagated to children on descent, exactly like a lazy segment tree. `split` at positions `l` and `r+1` isolates the target range as its own subtree; flip its lazy bit (swap left/right children, toggle the flag instead of eagerly recursing); `merge` the three pieces back together. Each reverse is two splits + a flag flip + two merges, all O(log n). The constraint (`n, q ≤ 10⁵` with naive O(n·q) too slow) is what forces this data structure rather than a plain array - a textbook "the constraint tells you the technique" case.

```python
import random
from typing import Optional


class INode:
    def __init__(self, value: int) -> None:
        self.value = value
        self.priority = random.random()
        self.size = 1
        self.rev = False
        self.left: Optional["INode"] = None
        self.right: Optional["INode"] = None


def _size(n: Optional[INode]) -> int:
    return n.size if n else 0


def _update(n: Optional[INode]) -> None:
    if n:
        n.size = 1 + _size(n.left) + _size(n.right)


def _push_down(n: Optional[INode]) -> None:
    if n and n.rev:                          # lazily swap children, propagate the flag
        n.left, n.right = n.right, n.left
        if n.left:
            n.left.rev = not n.left.rev
        if n.right:
            n.right.rev = not n.right.rev
        n.rev = False


def split(root: Optional[INode], k: int) -> tuple[Optional[INode], Optional[INode]]:
    """First k elements (by position) go left, the rest go right."""
    if root is None:
        return None, None
    _push_down(root)
    left_size = _size(root.left)
    if left_size < k:
        l, r = split(root.right, k - left_size - 1)
        root.right = l
        _update(root)
        return root, r
    else:
        l, r = split(root.left, k)
        root.left = r
        _update(root)
        return l, root


def merge(l: Optional[INode], r: Optional[INode]) -> Optional[INode]:
    if l is None:
        return r
    if r is None:
        return l
    _push_down(l)
    _push_down(r)
    if l.priority > r.priority:
        l.right = merge(l.right, r)
        _update(l)
        return l
    else:
        r.left = merge(l, r.left)
        _update(r)
        return r


def build(values: list[int]) -> Optional[INode]:
    root = None
    for v in values:
        root = merge(root, INode(v))          # append-only build keeps in-order = input order
    return root


def reverse_range(root: Optional[INode], l: int, r: int) -> Optional[INode]:
    left, mid_right = split(root, l)
    mid, right = split(mid_right, r - l + 1)
    if mid:
        mid.rev = not mid.rev                 # toggle instead of eagerly recursing
    return merge(merge(left, mid), right)


def query(root: Optional[INode], i: int) -> int:
    _push_down(root)
    left_size = _size(root.left)
    if i < left_size:
        return query(root.left, i)
    elif i == left_size:
        return root.value
    else:
        return query(root.right, i - left_size - 1)
```

**Complexity:** O(log n) expected per operation, O(n) space.

**Duplicate problems:**
- Rope data structure operations (used in text editors for large-document insert/delete/substring) - same split/merge-by-position idea applied to characters instead of integers.

### 3. Merge Two Treaps / Union of Two Sorted Sets

**Problem.** Given two treaps representing sorted sets where every key in treap A is guaranteed less than every key in treap B, combine them into a single treap representing the union, in O(log n) expected time (not O(n) by re-inserting every element).

**Worked examples:**
- **Example 1**
  - **Input:** `A = {1, 3, 5}` (as a treap), `B = {8, 9}` (as a treap) | **Output:** a single treap containing `{1, 3, 5, 8, 9}`
  - **Explanation:** since every key in A < every key in B, `merge(A, B)` combines them directly without violating BST order.
- **Example 2**
  - **Input:** `A = {}` (empty), `B = {2, 4}` | **Output:** a treap containing `{2, 4}`
  - **Explanation:** merging with an empty treap just returns the other treap unchanged - the base case of the recursion.

**Constraints:** Combined size of A and B up to `10⁵` nodes; must run in O(log(|A| + |B|)) expected time, not O(|A| + |B|).

**Approach:** This is the direct application of the `merge` primitive from CP-primitives: since every key in the left treap is less than every key in the right, recursively attach whichever root has the **lower** priority as a child of the higher-priority root, on the correct side to preserve BST order. The recursion depth is O(log n) expected because priorities are random - this is the "why for CP" that makes treap merge genuinely faster than rebuilding, unlike naively merging two AVL or Red-Black trees (which generally requires O(n) rebuilding or complex weight-balanced-tree join algorithms to stay within O(log n)).

```python
from typing import Optional

def merge(left: Optional[Node], right: Optional[Node]) -> Optional[Node]:
    if left is None:
        return right
    if right is None:
        return left
    if left.priority > right.priority:
        left.right = merge(left.right, right)
        _update(left)
        return left
    else:
        right.left = merge(left, right.left)
        _update(right)
        return right
```

**Complexity:** O(log n) expected time, O(log n) expected recursion depth/space.

**Duplicate problems:**
- Union of Two Balanced BSTs (weight-balanced tree "join" algorithm) - same goal, but the classic AVL/weight-balanced approach requires careful case analysis on height difference; the treap version is the simple case for comparison.
- Persistent Treap Version Merge - same merge primitive, applied with path-copying so both input versions remain independently queryable after the merge.
