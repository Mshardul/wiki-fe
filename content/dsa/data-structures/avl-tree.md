# AVL Tree

## Prerequisites

- [Balanced BST](./balanced-bst.md) [Must read]
- [Binary Search Tree](./binary-search-tree.md) [Must read]
- [Binary Tree](./binary-tree.md) [Should read]

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [How it works](#how-it-works)
  - [Insert: the four rotation cases](#insert-the-four-rotation-cases)
  - [Delete](#delete)
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
  - [Insert into an AVL tree](#1-insert-into-an-avl-tree--rebalance-on-the-way-up)
  - [Validate height-balanced](#2-validate-height-balanced--bottom-up-heights)
  - [Build a balanced BST from sorted data](#3-build-a-balanced-bst-from-sorted-data--vs-avl)
  - [AVL delete with rebalance-on-removal](#4-avl-delete-with-rebalance-on-removal--multi-ancestor-fixup)

## What it is

An **AVL tree** is a [binary search tree](./binary-search-tree.md) that keeps itself strictly height-balanced: for **every** node, the heights of its two subtrees differ by at most 1. After each insert or delete it restores this rule with rotations, guaranteeing height ≤ 1.44 log₂ n and so O(log n) on every operation.

Mental model: **the strictest building inspector among the [balanced BSTs](./balanced-bst.md).** It tolerates almost no lean - the moment any node's two sides differ in height by 2, it rotates immediately. That strictness is its identity: the tightest height of any common balanced tree, bought with more rotations on writes.

> **Takeaway (say this out loud):** "An AVL tree is a BST where every node's subtree heights differ by at most 1, enforced by rotations - strictest balance, so the fastest lookups, at the cost of more rotations per write."

## How it works

The named inventors (Adelson-Velsky and Landis) added one number to each BST node: a **balance factor** = `height(left) − height(right)`. The invariant is simply "every balance factor is −1, 0, or +1." When an insert or delete pushes some node to ±2, the tree has leaned too far there, and a rotation pulls the tall side up to flatten it.

Why does fixing it _locally_ work globally? An insert changes heights only along the **single path** from the new leaf up to the root. So only nodes on that path can become unbalanced, and rebalancing the **lowest** unbalanced node restores the whole tree's height to what it was before the insert - which is why an AVL insert needs at most **one** rotation (single or double). That "one path, one fix" property is the whole elegance.

Each node stores its **height** (or balance factor). Insert/delete proceeds as a normal [BST](./binary-search-tree.md) operation, then you **retrace the path to the root**, updating heights and rotating wherever a node's balance factor reaches ±2.

A node becomes unbalanced in one of **four shapes**, named by the direction of the two steps from the unbalanced node down into the heavy subtree:

### Insert: the four rotation cases

```
LL (left-left, heavy on left's left)      →  single RIGHT rotation
RR (right-right, heavy on right's right)   →  single LEFT rotation
LR (left-right, heavy on left's right)     →  LEFT child, then RIGHT  (double)
RL (right-left, heavy on right's left)     →  RIGHT child, then LEFT  (double)
```

**LL - single right rotation** (the new node went into the left child's left subtree):

```
        (z) bf=+2                 (y)
       /    \                    /   \
     (y)     T4    ─────▶     (x)    (z)
    /   \                    / \     / \
  (x)    T3                T1 T2   T3  T4
  / \
T1  T2
```

**LR - double rotation** (new node in the left child's _right_ subtree): first left-rotate `y`, turning it into the LL shape, then right-rotate `z`:

```
      (z) bf=+2            (z)                  (x)
     /    \               /   \                /   \
   (y)     T4   left(y) (x)    T4   right(z) (y)    (z)
   / \      ───────▶    / \      ───────▶    / \    / \
  T1  (x)             (y)  T3              T1 T2   T3 T4
      / \             / \
    T2  T3          T1  T2
```

RR and RL are the mirror images (single left, and double right-then-left). The double cases exist because a single rotation on a "zig-zag" shape just moves the imbalance to the other side - you must straighten the zig-zag into a zig-zig first.

### Delete

Delete as a normal BST (leaf → remove; one child → splice; two children → replace with in-order successor, then delete it). Then retrace to the root, rebalancing. **The key difference from insert:** a delete can require rebalancing at **multiple** nodes along the path - fixing one can shorten its subtree and unbalance an ancestor - so you don't stop after the first rotation; you continue to the root. (Insert needs at most one rotation; delete can need O(log n).)

## Operations

| Operation | Time     | Space (recursion) | Notes                                         |
| --------- | -------- | ------------------ | ---------------------------------------------- |
| Search    | O(log n) | O(log n)           | plain BST descent, height-bounded              |
| Insert    | O(log n) | O(log n)           | BST insert + retrace, ≤ 1 rotation             |
| Delete    | O(log n) | O(log n)           | BST delete + retrace, up to O(log n) rotations |

All bounds are **worst-case**, not just average - that's the guarantee a plain [BST](./binary-search-tree.md) can't make. Insert does ≤ 1 rotation; delete does O(log n) in the worst case; both are O(log n) overall (the retrace dominates, not the rotation count).

## Complexity summary

**Height bound - why ≤ 1.44 log₂ n.** Let `N(h)` be the _minimum_ number of nodes in an AVL tree of height `h`. The most-unbalanced legal AVL tree has, at the root, one subtree of height `h−1` and the other of height `h−2` (differing by exactly 1). So:

```
N(h) = 1 + N(h−1) + N(h−2),   N(0) = 1, N(1) = 2
```

This is the **Fibonacci recurrence** (shifted): `N(h) ≈ φ^h` where `φ = (1+√5)/2 ≈ 1.618`. Inverting, `h ≈ log_φ(n) = log₂(n) / log₂(φ) ≈ 1.44 log₂ n`. So the height is at most ~1.44× the perfect-tree height - tightly bounded, hence **O(log n)** for every operation, best/average/worst alike (no degenerate case can arise once the invariant holds).

| Time (best/avg/worst)          | Space (total / per-op recursion) |
| -------------------------------- | ---------------------------------- |
| O(log n) / O(log n) / O(log n) | O(n) total, O(log n) per op       |

## When to use / when not

**Reach for an AVL tree when:**

- Lookups dominate writes and you want the **tightest height** → AVL's strict balance shaves comparisons off every search; the extra write rotations rarely matter if writes are infrequent.
- You need a **hard worst-case O(log n)** guarantee (not amortized, not average) on ordered operations - real-time-ish systems, or data structures where a single slow op is unacceptable.

**Reach for something else when:**

- **Writes are frequent / mixed read-write** → a [red-black tree](./red-black-tree.md) does fewer rotations per write (recolor-first), which is why standard libraries pick it over AVL. The slightly taller tree costs little on lookups.
- **Data is on disk** → a [B-tree](./b-tree.md); AVL's binary fan-out means too many levels and too many disk seeks.
- **You don't need order** → a [hash table](./hash-table.md) is O(1) average; the log is only worth paying for ordered operations.
- **The data is static** → sort an [array](./array.md) and [binary search](../algorithms/binary-search.md) it; no need to maintain a tree.

Real-world: AVL trees show up in read-heavy in-memory indexes and some database engines (early MySQL `MEMORY`/`HEAP` indexes, some in-memory stores) where lookup latency is the priority; red-black is the more common general default.

## Comparison

| Tree                                 | Balance rule                 | Height       | Lookup      | Rotations/write             | Pick it when…                       |
| ------------------------------------ | ---------------------------- | ------------ | ----------- | --------------------------- | ----------------------------------- |
| **AVL**                              | subtree heights differ ≤ 1   | ≤ 1.44 log n | **fastest** | more (≤1 ins, O(log n) del) | read-heavy, tightest height         |
| [Red-Black](./red-black-tree.md)     | color rules (≈ black-height) | ≤ 2 log n    | fast        | **fewer**                   | general / write-heavy (lib default) |
| [Plain BST](./binary-search-tree.md) | none                         | up to n      | O(n) worst  | none                        | (avoid)                             |
| [B-Tree](./b-tree.md)                | wide nodes, equal leaf depth | log_m n      | few seeks   | split/merge                 | on-disk indexes                     |

AVL and red-black are the same asymptotics; AVL trades more write-work for a shorter tree (faster reads). Pick on your read/write ratio.

## Variants

- **Weight-balanced tree** - balances on subtree *size* instead of height (a subtree's size stays within a constant factor of its sibling's). Different invariant, same goal (O(log n) ops); rarer in practice than AVL/red-black.
- **AVL with parent pointers** - stores an explicit `parent` link per node so retrace-to-root doesn't need recursion or an explicit stack - common in iterative/production implementations, trades a pointer per node for simpler retrace code.
- **Relaxed-balance AVL** - some concurrent/lock-free AVL variants allow temporary balance-factor violations (bf up to ±2 briefly) to reduce rotation contention under concurrent writes, fixing up lazily. A CP-irrelevant, systems-flavored variant.
- **[Red-Black tree](./red-black-tree.md)** - the loosely-balanced sibling; same "self-balancing BST" family, different invariant (color rules vs strict height), see [Comparison](#comparison) above for the trade.

## Traversal & invariant

The traversals are the [binary tree](./binary-tree.md)'s - and because an AVL is a valid [BST](./binary-search-tree.md), **in-order traversal yields sorted keys**. The AVL-specific invariant is the **height-balance** condition, maintained by tracking a height (or balance factor) per node and rotating on violation.

```
balance factor bf(v) = height(v.left) − height(v.right)

bf ∈ {−1, 0, +1}  → balanced (OK)
bf = +2           → left-heavy  → LL or LR rotation
bf = −2           → right-heavy → RR or RL rotation
```

The discipline: every structural change retraces the path to the root, recomputes heights bottom-up, and rotates the first node it finds at ±2. The **balanced** shape invariant from the [binary tree](./binary-tree.md#the-shape-invariants-full-complete-balanced) page is exactly AVL's enforced rule - AVL is the structure that _guarantees_ it.

**Invariant, stated precisely:** for every node `v`, `|height(v.left) − height(v.right)| ≤ 1`.

**Base case:** an empty tree (or single node) trivially satisfies the invariant - no subtree pair to compare, or both heights are 0.

**Inductive step (why rotations preserve it):** assume every node was balanced before the insert. The insert lengthens exactly one root-to-leaf path by 1, so the only node that can newly violate the invariant is on that path - and the **lowest** such node `z` has balance factor exactly ±2, because it was ±1 before the insert and children are only 1 level from their parent. Rotating at `z` restores its subtree height to the pre-insert value (verified case-by-case for LL/LR/RR/RL - each rotation reduces the taller side's height by exactly 1 and raises the shorter side's by 1), which means no ancestor above `z` sees a height change either - so the invariant holds inductively all the way to the root after exactly one fix.

**Why rotations preserve BST order:** a rotation only re-parents nodes; the in-order sequence is identical before and after (see [Balanced BST › Rotations](./balanced-bst.md#rotations-the-shared-mechanic)). So the BST ordering invariant and the height-balance invariant are maintained independently - rotations are "order-safe height surgery."

## Implementation

Insert with height tracking and the four rotation cases. Pseudocode states the rebalance contract; Python is the idiomatic reference.

**Pseudocode (CLRS-style contract):**

```
AVL-INSERT(node, k)
1   node = BST-INSERT(node, k)                  ▷ ordinary BST insert
2   UPDATE-HEIGHT(node)                          ▷ 1 + max(child heights)
3   bf = BALANCE-FACTOR(node)                    ▷ h(left) − h(right)
4   if bf > 1 and k < node.left.key              ▷ LL
5       return ROTATE-RIGHT(node)
6   if bf < −1 and k > node.right.key            ▷ RR
7       return ROTATE-LEFT(node)
8   if bf > 1 and k > node.left.key              ▷ LR
9       node.left = ROTATE-LEFT(node.left)
10      return ROTATE-RIGHT(node)
11  if bf < −1 and k < node.right.key            ▷ RL
12      node.right = ROTATE-RIGHT(node.right)
13      return ROTATE-LEFT(node)
14  return node                                  ▷ already balanced
```

**Python (reference - idiomatic):**

```python
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional

@dataclass
class Node:
    key: int
    height: int = 1
    left: Optional["Node"] = None
    right: Optional["Node"] = None

def _h(n: Optional[Node]) -> int:
    return n.height if n else 0

def _bf(n: Node) -> int:
    return _h(n.left) - _h(n.right)

def _update(n: Node) -> None:
    n.height = 1 + max(_h(n.left), _h(n.right))

def _rotate_right(z: Node) -> Node:
    y = z.left                       # y becomes the new root of this subtree
    z.left, y.right = y.right, z     # rewire; in-order order preserved
    _update(z); _update(y)           # heights: children before parent
    return y

def _rotate_left(z: Node) -> Node:
    y = z.right
    z.right, y.left = y.left, z
    _update(z); _update(y)
    return y

def insert(node: Optional[Node], key: int) -> Node:
    if node is None:
        return Node(key)
    if key < node.key:
        node.left = insert(node.left, key)
    elif key > node.key:
        node.right = insert(node.right, key)
    else:
        return node                  # duplicate: ignore
    _update(node)
    bf = _bf(node)
    if bf > 1 and key < node.left.key:               # LL
        return _rotate_right(node)
    if bf < -1 and key > node.right.key:             # RR
        return _rotate_left(node)
    if bf > 1 and key > node.left.key:               # LR
        node.left = _rotate_left(node.left)
        return _rotate_right(node)
    if bf < -1 and key < node.right.key:             # RL
        node.right = _rotate_right(node.right)
        return _rotate_left(node)
    return node
```

**Contest velocity.** You almost never hand-roll AVL in a contest - reach for the language's balanced structure ([Red-Black-backed](./red-black-tree.md) `std::map`/`TreeMap`, or Python `sortedcontainers.SortedList`). Code AVL only when an interviewer explicitly asks for the rotation logic.

## CP-primitives

Tree/heap family - advisory, but AVL's height guarantee unlocks two contest-relevant tricks:

- **Order-statistics augmentation.** Store a `size` (subtree node count) per node alongside `height`, updated the same way during rotations. This turns the tree into an order-statistics tree: "find the k-th smallest" and "count elements less than x" both become O(log n) tree walks instead of an O(n) scan - the classic augmentation for offline rank queries.
- **Guaranteed-height recursion bound.** Because AVL height is provably ≤ 1.44 log₂ n, any recursive tree algorithm run on an AVL (not a plain BST) has a *guaranteed* O(log n) stack depth - useful in contest problems that build a balanced tree specifically to bound recursion depth for a follow-up computation, rather than risking a degenerate O(n)-deep plain BST.

**Why for CP:** both tricks lean on the property a plain BST can't offer - a *provable* height bound - to turn otherwise-linear operations logarithmic.

## Gotchas / edge cases

- **Empty tree / single node.** Insert into empty creates the root (height 0/1 per convention); no rotation possible with < 3 nodes. Handle `root is None` as the base case in every recursive op.
- **Rotation choosing the wrong case (LL vs LR).** The classic AVL bug: deciding single vs double rotation from the _grandparent's_ balance factor alone. You must inspect the **child's** balance factor too - `bf(z)=+2` is LL if `bf(z.left) ≥ 0`, but LR if `bf(z.left) < 0`. Getting this wrong leaves the tree unbalanced or unsorted.
- **Forgetting to update heights after a rotation.** Rotations change the heights of the two rotated nodes; if you don't recompute them (in the right order - children before parents) the balance factors go stale and later rebalancing misfires.
- **Delete stopping after one rotation.** Unlike insert, a delete may unbalance multiple ancestors - you must continue rebalancing all the way to the root, not return early. A frequent correctness bug.
- **Recursion depth.** Height is O(log n), so the recursion stack is safe even for large n - one of AVL's quiet advantages over a plain BST (which can recurse O(n) deep and overflow).
- **Duplicate keys.** Decide a policy (reject, or store a count per node); inserting duplicates as real nodes complicates the balance bookkeeping and the in-order order.
- **At-scale trap (n > 10⁷): pointer-chasing depth under concurrent load.** Every AVL op walks ~1.44 log₂ n pointer hops, each a potential cache miss (unlike a heap's flat array). At n = 10⁸, that's ~40 hops of scattered heap allocations per lookup - and under high-write concurrency, the retrace-to-root on every insert/delete means writes serialize around overlapping root-to-leaf paths, so a single global AVL becomes a lock-contention bottleneck long before the O(log n) time bound itself is the problem. Real systems shard or use a lock-free/relaxed-balance variant at this scale rather than a single AVL instance.
- **Cache behavior.** AVL nodes are heap-allocated and pointer-linked, not contiguous - each hop down the tree is a likely cache miss, unlike a heap's flat-array layout (sequential, cache-friendly). This is the structural reason a red-black tree (fewer rotations, same pointer-chasing cost) rather than an AVL is the typical library default: the cache-miss cost per hop dwarfs the difference between 1.44 log n and 2 log n hops.

## What the interviewer probes for

- **"Why at most one rotation on insert but possibly many on delete?"** - Insert lengthens one path; rebalancing the lowest violator restores the pre-insert height, so no ancestor changes. Delete _shortens_ a subtree, which can unbalance an ancestor after you fix a node - so you must rebalance up to the root.
- **"AVL vs red-black - which and why?"** - AVL is stricter (height ≤ 1.44 log n) → faster lookups but more write rotations; red-black is looser (≤ 2 log n) → fewer write rotations, so libraries default to it for mixed workloads. Pick on read/write ratio.
- **"Where does the 1.44 come from?"** - The minimum-nodes recurrence `N(h)=1+N(h−1)+N(h−2)` is Fibonacci, so n grows like φ^h, giving h ≈ 1.44 log₂ n.
- **"How do you detect which rotation case?"** - From the unbalanced node's balance factor _and_ its heavy child's balance factor: matching signs → single rotation; opposite signs → double (zig-zag must be straightened first).

## Practice problems

Four problems, each a **distinct** facet of AVL - no two the same.

### 1. Insert into an AVL tree - _rebalance on the way up_

Implement AVL insert: insert a key as in a BST, then restore the height-balance invariant with rotations, returning the new subtree root.

**Worked examples:**
- **Example 1**
  - **Input:** insert [10, 20, 30] into an empty AVL tree | **Output:** root = 20, left = 10, right = 30
  - **Explanation:** inserting 30 after 10,20 makes node 10's balance factor −2 (RR case) - a single left rotation at 10 makes 20 the new root.
- **Example 2**
  - **Input:** insert [30, 20, 10] into an empty AVL tree | **Output:** root = 20, left = 10, right = 30
  - **Explanation:** mirror of example 1 - inserting 10 last makes 30's balance factor +2 (LL case), a single right rotation at 30 makes 20 the root.

**Constraints:** keys are distinct integers, `1 ≤ number of inserts ≤ 10⁴`, duplicates ignored on insert.

**Approach:** Recurse down to insert (BST rule), then on the way back up: update height, compute balance factor, and apply the matching one of the four rotation cases (LL/RR/LR/RL). The case is chosen by the node's bf and its heavy child's bf. Only the lowest unbalanced node needs fixing, so insert does ≤ 1 (single or double) rotation.

```python
# (uses the helpers and insert() from Implementation above)
root = None
for k in [10, 20, 30, 40, 50, 25]:
    root = insert(root, k)
# tree stays height-balanced after every insert; height ~ log n
```

**Complexity:** O(log n) time, O(log n) space (recursion).

**Duplicate problems:**
- Balance a Binary Search Tree (LC 1382) - same rotation-based rebalancing goal, framed as one-shot rebalance of an existing tree rather than incremental insert.

### 2. Validate height-balanced - _bottom-up heights_

Given a binary tree, decide whether it satisfies the AVL invariant: every node's subtree heights differ by ≤ 1.

**Worked examples:**
- **Example 1**
  - **Input:** root = [3,9,20,null,null,15,7] | **Output:** true
  - **Explanation:** every node's left/right subtree heights differ by at most 1.
- **Example 2**
  - **Input:** root = [1,2,2,3,3,null,null,4,4] | **Output:** false
  - **Explanation:** the leftmost chain makes node 2's subtrees differ in height by 2.

**Constraints:** `0 ≤ number of nodes ≤ 5000`, `-10⁴ ≤ node value ≤ 10⁴`.

**Approach:** Compute heights **bottom-up**, returning a sentinel (−1) the moment any subtree is unbalanced, so you abort early instead of recomputing heights repeatedly (the naive O(n²) version recomputes height at every node). One post-order pass - the tree-DP shape.

```python
def is_balanced(root) -> bool:
    def check(node) -> int:           # returns height, or -1 if unbalanced
        if node is None:
            return 0
        lh = check(node.left)
        if lh == -1: return -1
        rh = check(node.right)
        if rh == -1: return -1
        if abs(lh - rh) > 1: return -1
        return 1 + max(lh, rh)
    return check(root) != -1
```

**Complexity:** O(n) time, O(h) space.

### 3. Build a balanced BST from sorted data - _vs AVL_

Given a sorted array, build a height-balanced BST. Contrast with inserting the same keys one-by-one into an AVL.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [-10, -3, 0, 5, 9] | **Output:** root = 0, left subtree from [-10,-3], right subtree from [5,9]
  - **Explanation:** the midpoint 0 becomes the root; each half recurses the same way, giving height ⌈log₂ 5⌉.
- **Example 2**
  - **Input:** nums = [1, 2, 3, 4] | **Output:** root = 3 (or 2, either valid midpoint), height 2
  - **Explanation:** an even-length array has two valid midpoints - either produces a height-balanced tree.

**Constraints:** `1 ≤ nums.length ≤ 10⁴`, `nums` strictly sorted ascending.

**Approach:** Pick the middle element as the root and recurse on each half - balance _by construction_, no rotations, O(n). This is what you'd do for **static** data; AVL is for when keys arrive over time and must stay balanced through inserts/deletes. The contrast is the lesson: build-balanced (cheap, static) vs maintain-balanced (AVL, dynamic).

```python
def sorted_to_balanced(nums: list[int]):
    def build(lo, hi):
        if lo > hi:
            return None
        mid = (lo + hi) // 2
        return Node(nums[mid], left=build(lo, mid - 1), right=build(mid + 1, hi))
    return build(0, len(nums) - 1)
```

**Complexity:** O(n) time, O(log n) space.

**Duplicate problems:**
- Convert Sorted List to Binary Search Tree (LC 109) - identical midpoint-recursion technique, adapted to a linked list's lack of random access.

### 4. AVL delete with rebalance-on-removal - _multi-ancestor fixup_

Delete a node from an AVL tree and return the new root. The tree must remain height-balanced after the delete - unlike insert, a delete can require rebalancing at **multiple** ancestors on the way back up, not just the lowest violator.

**Worked examples:**
- **Example 1**
  - **Input:** tree built by inserting [10, 20, 30], then delete(10) | **Output:** root = 20, left = null, right = 30
  - **Explanation:** 10 is a leaf; splice it out, retrace to 20 - already balanced, no rotation needed.
- **Example 2**
  - **Input:** tree built by inserting [5, 2, 8, 1, 3, 7, 9, 6], then delete(2) | **Output:** height-balanced tree with 2 removed and no residual imbalance
  - **Explanation:** 2 has two children (1 and 3); replace it with in-order successor 3, delete 3 from its original spot, then retrace from 3's old parent to the root - the removal shortens the left side, so the ancestor at 5 may need rebalancing even though the deletion happened two levels below it, which is the multi-ancestor case insert never triggers.

**Constraints:** keys are distinct integers, `1 ≤ number of nodes ≤ 10⁴`, the key to delete is guaranteed present.

**Approach:** First delete exactly as in a plain BST: a leaf splices out directly, a one-child node is replaced by its child, and a two-child node is replaced by its in-order successor (leftmost of the right subtree), which is then deleted from its original position - the same three cases as [BST delete](./binary-search-tree.md#implementation). The AVL-specific part starts after the splice: retrace the path from the deleted node's **parent** back to the root, updating each ancestor's height and checking its balance factor. Because removing a node can shorten a subtree, an ancestor several levels up can become unbalanced even though the rotation at a lower node already fixed *its* local imbalance - so, unlike insert, you do not stop at the first fix. Continue checking and rotating (LL/RR/LR/RL, same four cases as insert) all the way to the root; delete can trigger up to O(log n) rotations in the worst case, versus insert's at most one.

```python
def delete(node: Optional[Node], key: int) -> Optional[Node]:
    if node is None:
        return None
    if key < node.key:
        node.left = delete(node.left, key)
    elif key > node.key:
        node.right = delete(node.right, key)
    else:
        if node.left is None:
            return node.right                 # 0 or 1 child → splice
        if node.right is None:
            return node.left
        succ = node.right                     # in-order successor = leftmost of right subtree
        while succ.left:
            succ = succ.left
        node.key = succ.key
        node.right = delete(node.right, succ.key)   # remove successor from its original spot

    _update(node)
    bf = _bf(node)
    # unlike insert, delete must check-and-rotate at EVERY ancestor on the way up,
    # since a fix here can still leave an ancestor further up unbalanced
    if bf > 1 and _bf(node.left) >= 0:                # LL
        return _rotate_right(node)
    if bf > 1 and _bf(node.left) < 0:                 # LR
        node.left = _rotate_left(node.left)
        return _rotate_right(node)
    if bf < -1 and _bf(node.right) <= 0:              # RR
        return _rotate_left(node)
    if bf < -1 and _bf(node.right) > 0:                # RL
        node.right = _rotate_right(node.right)
        return _rotate_left(node)
    return node
```

**Complexity:** O(log n) time, O(log n) space (recursion) - the retrace touches every node on the root-to-deleted-node path, and each can trigger a rotation, unlike insert's single rebalance point.

