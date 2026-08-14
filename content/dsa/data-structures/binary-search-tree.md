# Binary Search Tree

## Prerequisites

- [Big-O Notation](../algorithms/big-o-notation.md) [Must read]
- [Binary Tree](./binary-tree.md) [Must read]
- [Binary Search](../algorithms/binary-search.md) [Should read]

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
  - [The BST ordering invariant](#the-bst-ordering-invariant)
  - [In-order traversal = sorted](#in-order-traversal--sorted)
  - [Why balance is everything](#why-balance-is-everything)
- [Implementation](#implementation)
- [Gotchas / edge cases](#gotchas--edge-cases)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)
  - [Validate Binary Search Tree](#1-validate-binary-search-tree)
  - [Kth Smallest Element in a BST](#2-kth-smallest-element-in-a-bst)
  - [Lowest Common Ancestor of a BST](#3-lowest-common-ancestor-of-a-bst)
  - [Insert into a BST](#4-insert-into-a-bst)
  - [Convert Sorted Array to BST](#5-convert-sorted-array-to-bst)
  - [Delete Node in a BST](#6-delete-node-in-a-bst)
  - [Inorder Successor in BST](#7-inorder-successor-in-bst)

## What it is

A **binary search tree** is a [binary tree](./binary-tree.md) with one ordering rule: for **every** node, all keys in its left subtree are smaller and all keys in its right subtree are larger.

Mental model: **binary search frozen into a structure.** Every node is a yes/no comparison - "smaller? go left; larger? go right" - and each step throws away half the remaining tree, exactly like [binary search](../algorithms/binary-search.md) on a sorted array. The difference: an array gives O(log n) search but O(n) insert; the BST keeps **both** search and insert at O(log n) (when balanced), and gives you sorted order for free via in-order traversal.

> **Takeaway (say this out loud):** "A BST keeps keys ordered so search, insert, and delete are O(log n) - and in-order traversal spits them out sorted. The catch is it degrades to O(n) if it gets skewed."

## How it works

The BST **<abbr>invariant</abbr>** holds at every node: `left subtree keys < node.key < right subtree keys`. That single rule turns search into a guided descent - at each node you compare, then go left or right, never both.

```
            (8)
           /   \
        (3)     (10)
        /  \        \
     (1)   (6)      (14)
           /  \      /
        (4)  (7)  (13)

search 7:  8 → 7<8 go left → 3 → 7>3 go right → 6 → 7>6 go right → 7 ✓   (3 comparisons)
insert 5:  8 → left → 3 → right → 6 → left → 4 → right → null → place 5 there
```

Each comparison **halves** the candidate set, so a search visits at most `height` nodes. When the tree is balanced, height ≈ log₂ n → **O(log n)**. The <abbr>recursion</abbr> is the same `tree = node + left + right` self-similarity as the [binary tree](./binary-tree.md), now with the comparison deciding _which_ subtree to recurse into (one, not both - that's the speedup over an unordered tree's O(n) search).

**Delete is the one tricky operation.** Removing a node with two children would orphan a subtree, so you replace the node with its **in-order successor** (the smallest key in its right subtree - the leftmost node there), which preserves the invariant, then delete that successor (which has at most one child). Leaf and one-child deletes are trivial splices.

## Operations

| Operation                   | Time (balanced) | Time (skewed) | Space |
| --------------------------- | --------------- | ------------- | ----- |
| Search                      | O(log n)        | O(n)          | O(h)  |
| Insert                      | O(log n)        | O(n)          | O(h)  |
| Delete                      | O(log n)        | O(n)          | O(h)  |
| Min / Max                   | O(log n)        | O(n)          | O(1)  |
| Predecessor / successor     | O(log n)        | O(n)          | O(1)  |
| In-order traversal (sorted) | O(n)            | O(n)          | O(h)  |
| Range query `[lo, hi]`      | O(log n + k)    | O(n)          | O(h)  |

Every operation is **O(height)**, which is the whole story: O(log n) if balanced, O(n) if skewed. `k` = number of results in a range query. Min/max are just "walk all the way left / all the way right".

## Complexity summary

| Operation | Best        | Average  | Worst (skewed) |
| --------- | ----------- | -------- | -------------- |
| Search    | O(1) (root) | O(log n) | O(n)           |
| Insert    | O(log n)    | O(log n) | O(n)           |
| Delete    | O(log n)    | O(log n) | O(n)           |

**Space:** O(n) for nodes (two child pointers each), plus O(height) recursion stack. The defining caveat: **a plain BST does not guarantee balance.** Insert already-sorted data and it builds a right-leaning chain - height n, every operation O(n), a [linked list](./linked-list.md) wearing a tree costume. The fix is a [self-balancing BST](./balanced-bst.md) (AVL / red-black), which keeps height O(log n) via rotations. Average-case O(log n) assumes random insertion order; never assume it for adversarial input.

## When to use / when not

**Reach for a BST when:**

- You need **both fast lookup AND sorted order** - a [hash table](./hash-table.md) gives O(1) lookup but no order; a sorted [array](./array.md) gives order but O(n) insert. The BST is the structure that does both at O(log n).
- You need **range queries, k-th smallest, predecessor/successor, or ordered iteration** - all natural O(log n)/O(log n + k) on a BST, all awkward or O(n) on a hash table.
- The data **changes** (frequent insert/delete) and must stay ordered - a sorted array would pay O(n) per insert to keep order.

**Reach for something else when:**

- **You only need unordered key→value lookup** → a [hash table](./hash-table.md) is O(1) average, beating the BST's O(log n). Order is the only reason to pay the log.
- **The data is static** (build once, query many) → sort into an [array](./array.md) and [binary search](../algorithms/binary-search.md) it: same O(log n) lookup, better cache locality, no per-node pointers.
- **You need only the min or max repeatedly** → a [heap](./heap.md) gives O(1) peek and O(log n) pop, simpler than a full BST.
- **You can't guarantee balance** → use a [balanced BST](./balanced-bst.md) (or `sortedcontainers` in Python), not a hand-rolled plain BST that an adversary can skew to O(n).

Rule of thumb: **BST = "I need a hash table, but ordered."** If you ever say "and also give me them in sorted order / the next-bigger one / everything in a range", that's the BST (balanced) over the hash table.

Real-world: database and filesystem indexes use the BST's disk-friendly generalization, the **B-tree / B+-tree**; language ordered-map types (`std::map`, Java `TreeMap`) are red-black BSTs; and any "leaderboard with rank queries" or "interval scheduling with nearest-neighbor" leans on a balanced BST.

## Comparison

How a BST relates to the structures you'd weigh against it:

| Structure          | Search       | Insert       | Min/Max  | Range / k-th / successor | Ordered iter | Pick it when…                          |
| ------------------ | ------------ | ------------ | -------- | ------------------------ | ------------ | -------------------------------------- |
| **BST (balanced)** | **O(log n)** | **O(log n)** | O(log n) | **O(log n)**             | **yes**      | ordered keys + fast insert + range     |
| BST (plain/skewed) | O(n)         | O(n)         | O(n)     | O(n)                     | yes          | (avoid - use balanced)                 |
| Hash table         | **O(1)** avg | **O(1)** avg | O(n)     | O(n)                     | no           | unordered lookup, no order needed      |
| Sorted array       | O(log n)     | O(n)         | O(1)     | O(log n + k)             | yes          | static data, lookup-heavy, cache-tight |
| Heap               | O(n)         | O(log n)     | **O(1)** | min/max only             | no           | repeated min/max only                  |

The BST's column is the only one with **O(log n) on every ordered operation at once** - search, insert, range, successor, sorted iteration. The hash table beats it on raw lookup but offers no order; the sorted array matches its order but pays O(n) per insert.

See the [Data Structure Selection cheatsheet](../cheatsheets/data-structure-selection.md) for the full cross-structure comparison.

## Variants

- **[Balanced BST (AVL / Red-Black)](./balanced-bst.md)** - self-balances via rotations to guarantee O(log n) height. The version you actually use in production; a plain BST is the teaching baseline.
- **Plain BST** - no balancing; O(log n) average but O(n) worst on sorted/adversarial input. The subject of this page (the invariant and operations), with balancing deferred to its own page.
- **Treap / randomized BST** - assigns each node a random priority and keeps a heap order on priorities, making the expected height O(log n) without explicit balancing logic. A simpler-to-implement alternative to AVL/red-black.
- **B-tree / B+-tree** - a BST generalized to many keys per node, minimizing disk seeks; the structure behind database and filesystem indexes. The BST idea scaled to block storage.
- **Order-statistic tree** - a balanced BST augmented with subtree sizes, giving O(log n) "k-th smallest" and "rank of x". See the [order-statistics worked entry on AVL Tree](./avl-tree.md#5-count-of-smaller-numbers-after-self) for the full augmentation.
- **Self-balancing ordered map/set** - the library form: `std::map`/`std::set` (red-black), Java `TreeMap`, Python `sortedcontainers.SortedList`. What you reach for instead of hand-rolling.

## Traversal & invariant

The BST adds exactly one thing to the [binary tree](./binary-tree.md): an **ordering invariant**. Everything that makes a BST useful flows from it.

### The BST ordering invariant

For every node: **all keys in the left subtree < node.key < all keys in the right subtree.** Crucially, this is a constraint on the _whole subtree_, not just the immediate children - a common bug is checking only `left.key < node < right.key` (see [Gotchas](#gotchas--edge-cases)).

```
valid BST:              INVALID (looks local-OK, breaks globally):
       (8)                       (8)
      /   \                     /   \
   (3)     (10)             (3)     (10)
   /  \                     /  \
 (1)  (6)               (1)  (9)  ← 9 > 8 but sits in 8's LEFT subtree → invalid
```

The invariant is what lets search ignore an entire subtree at each step: if your target is less than the node, it _cannot_ be on the right, so you discard the right subtree wholesale - the halving that buys O(log n).

### In-order traversal = sorted

Because left < node < right everywhere, an **in-order traversal** (left, node, right) visits keys in **ascending sorted order**. This is the BST's signature property and the source of half its problems.

```
in-order of the valid tree above:  1 3 6 8 10   ← sorted, for free, in O(n)
```

Consequences you exploit constantly: the **k-th smallest** is the k-th node of an in-order walk (stop early); **validating** a BST is checking the in-order sequence is strictly increasing; **two-sum / closest** problems on a BST use the sorted walk directly.

### Why balance is everything

A BST's operations are O(height), and height depends entirely on insertion order:

```
insert 1,2,3,4,5 in order → fully skewed:        insert 3,1,5,2,4 → balanced:
   (1)                                                   (3)
      \                                                 /   \
       (2)         height = n − 1                    (1)     (5)
          \        every op O(n)                        \    /
           (3)     (a linked list!)                     (2)(4)   height = log n, ops O(log n)
              \
               (4)
                  \
                   (5)
```

This is **the** BST gotcha: sorted input produces the worst tree. A plain BST has no defense; a [balanced BST](./balanced-bst.md) detects the imbalance and **rotates** to restore O(log n) height. Never deploy a hand-rolled plain BST where input order is uncontrolled - reach for the balanced variant or a library ordered-set.

## Implementation

A plain BST with search, insert, and the tricky delete. Pseudocode states the recursive contract; Python gives the idiomatic version. (Balancing is deferred to [Balanced BST](./balanced-bst.md).)

**Pseudocode (CLRS-style contract):**

```
BST-SEARCH(node, k)
1   while node ≠ NIL and k ≠ node.key
2       if k < node.key
3           node = node.left          ▷ discard the right subtree
4       else
5           node = node.right         ▷ discard the left subtree
6   return node                       ▷ NIL if not found

BST-INSERT(node, k)
1   if node == NIL
2       return new NODE(k)            ▷ empty spot → place here
3   if k < node.key
4       node.left  = BST-INSERT(node.left, k)
5   elif k > node.key
6       node.right = BST-INSERT(node.right, k)
7   return node                       ▷ duplicates ignored (policy choice)

BST-DELETE(node, k)                   ▷ two-child case: replace with in-order successor
1   ... find node; leaf → remove; one child → splice;
2   two children → copy successor's key into node, then delete successor from right subtree
```

**Python (reference - idiomatic):**

```python
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional

@dataclass
class Node:
    key: int
    left: Optional["Node"] = None
    right: Optional["Node"] = None

def search(root: Optional[Node], k: int) -> Optional[Node]:
    while root and root.key != k:
        root = root.left if k < root.key else root.right   # halve each step
    return root

def insert(root: Optional[Node], k: int) -> Node:
    if root is None:
        return Node(k)
    if k < root.key:
        root.left = insert(root.left, k)
    elif k > root.key:
        root.right = insert(root.right, k)
    # k == root.key → duplicate; ignore (or store a count)
    return root

def delete(root: Optional[Node], k: int) -> Optional[Node]:
    if root is None:
        return None
    if k < root.key:
        root.left = delete(root.left, k)
    elif k > root.key:
        root.right = delete(root.right, k)
    else:
        if root.left is None:
            return root.right                # 0 or 1 child → splice
        if root.right is None:
            return root.left
        succ = root.right                    # in-order successor = leftmost of right subtree
        while succ.left:
            succ = succ.left
        root.key = succ.key
        root.right = delete(root.right, succ.key)
    return root
```

**Contest velocity - don't hand-roll a balanced BST under time pressure.** Python has no built-in balanced tree, but `sortedcontainers.SortedList` gives O(log n) add/remove and O(log n) index/bisect - the practical stand-in for "I need an ordered multiset with O(log n) insert/delete/rank" (C++ reaches for `std::set`/`std::multiset`, Java for `TreeMap`/`TreeSet`). For static data, just `sorted()` + `bisect`.

## Gotchas / edge cases

- **Validating with only local checks.** The #1 BST bug: checking `node.left.key < node.key < node.right.key` per node passes invalid trees (a deep-left descendant can exceed an ancestor). Validate by passing **down a (low, high) range** that each subtree must fit, or by checking the in-order traversal is strictly increasing.
- **Skew on sorted input.** Inserting already-sorted (or reverse-sorted) keys into a plain BST builds a height-n chain - every operation O(n). This is the BST's defining failure; use a [balanced BST](./balanced-bst.md) when input order is uncontrolled.
- **Delete with two children.** The hard case: you must replace the node with its in-order **successor** (or predecessor) to preserve the <abbr>invariant</abbr>, then delete that successor. Forgetting this - or splicing wrongly - corrupts the ordering. It's the most-tested BST coding detail.
- **Duplicate keys policy.** Decide up front: reject duplicates, store a per-node count, or always send equals to one side (consistently!). Inconsistent handling breaks search and in-order order. State your choice.
- **<abbr>Recursion</abbr> depth on a tall tree.** Recursive search/insert/delete is O(height) stack frames - fine balanced, but a skewed tree overflows Python's ~1000-frame limit. Iterative search (shown above) avoids it; recursive insert/delete on adversarial input does not.
- **In-order-sorted only holds for a _valid_ BST.** "Just do an in-order traversal to sort" assumes the tree already satisfies the invariant. If you're not certain it's a valid BST, in-order gives garbage order - validate first.
- **At n > 10⁷ nodes, pointer-chasing dominates even on a balanced tree (at-scale trap).** Every level of descent follows a `left`/`right` pointer to a node allocated somewhere else on the heap - there's no locality between a parent and its children the way an array has between adjacent indices. At small n the whole tree fits in cache and this is invisible; at large n, each level of the O(log n) descent is a fresh cache miss, so wall-clock lookup time grows noticeably faster than the O(log n) comparison count alone suggests. This is the concrete reason database indexes use **B-trees**, not BSTs - a B-tree's high fan-out packs many keys per node so one cache-line/disk-page fetch resolves several comparisons at once, trading comparison count for far fewer pointer hops.

## What the interviewer probes for

**What happens to this BST at n = 10⁹ keys?** - Height stops being the concern if the tree is genuinely balanced (`log₂ 10⁹ ≈ 30`), but as the Gotchas section notes, pointer-chasing dominates at that scale: each level of descent is a fresh cache miss because parent and child nodes live at unrelated heap addresses, so wall-clock lookup grows faster than the comparison count suggests. At real 10⁹-key scale you also can't fit the tree in memory at all - this is precisely why database indexes switch to a **B-tree**, which packs many keys per node so one disk-page/cache-line fetch resolves several comparisons instead of one pointer hop per comparison.

**Why not just keep the data in a sorted array and binary search it?** - For static data, a sorted array wins outright: same O(log n) lookup, better cache locality (contiguous memory, no pointer overhead), and no per-node allocation cost. The BST only earns its keep once the data **changes** - a sorted array pays O(n) to shift elements on every insert, while a balanced BST keeps insert at O(log n) alongside the same ordered search. The decision cue from this article's own When-to-use section: reach for the array when you build once and query many; reach for the BST the moment inserts/deletes are frequent and order still matters.

**Why not use a plain (unbalanced) BST instead of always reaching for a self-balancing variant?** - A plain BST is simpler to implement and fine when insertion order is random or controlled, since expected height stays O(log n). But it has no defense against adversarial or already-sorted input - as the Traversal & invariant section shows, inserting 1,2,3,4,5 in order degenerates it into a height-n chain, a linked list wearing a tree costume, with every operation O(n). A senior answer names the crossover explicitly: use a hand-rolled plain BST only when you control insertion order; otherwise pay the rotation overhead of an AVL/red-black tree (or reach for a library ordered-set) to guarantee the bound.

## Practice problems

Seven staples, each a **distinct** BST technique - no two solved the same way.

### 1. Validate Binary Search Tree

Determine if a binary tree is a valid BST: every node's left subtree is strictly less and right subtree strictly greater, _globally_.

**Worked examples:**
- **Example 1**
  - **Input:** root = [2,1,3] | **Output:** true
  - **Explanation:** 1 < 2 < 3, and the invariant holds globally, not just locally.
- **Example 2**
  - **Input:** root = [5,1,4,null,null,3,6] | **Output:** false
  - **Explanation:** node 4 sits in 5's right subtree but has a child 3, which is less than 5 - invalid even though `1 < 5 < 4` locally passes at node 4's parent.

**Constraints:** `1 ≤ number of nodes ≤ 10⁴`, `-2³¹ ≤ node.val ≤ 2³¹ - 1`.

**Approach:** Recurse carrying a valid **(low, high) open interval** each node must lie in. Going left tightens the upper bound to the node's key; going right tightens the lower bound. A null subtree is valid; any key outside its bound fails. This enforces the _global_ invariant that naive child-only checks miss.

```python
def is_valid_bst(root, low=float("-inf"), high=float("inf")) -> bool:
    if root is None:
        return True
    if not (low < root.val < high):
        return False
    return (is_valid_bst(root.left, low, root.val) and
            is_valid_bst(root.right, root.val, high))
```

**Complexity:** O(n) time, O(h) space.

### 2. Kth Smallest Element in a BST

Return the k-th smallest key (1-indexed) in a BST.

**Worked examples:**
- **Example 1**
  - **Input:** root = [3,1,4,null,2], k = 1 | **Output:** 1
  - **Explanation:** in-order walk visits 1,2,3,4 - the 1st is 1.
- **Example 2**
  - **Input:** root = [5,3,6,2,4,null,null,1], k = 3 | **Output:** 3
  - **Explanation:** in-order walk visits 1,2,3,4,5,6 - the 3rd is 3.

**Constraints:** `1 ≤ number of nodes ≤ 10⁴`, `1 ≤ k ≤ number of nodes`.

**Approach:** In-order traversal visits keys in sorted order, so the k-th visited node is the answer. Use an **iterative in-order with an explicit stack** and stop as soon as you've popped k nodes - no need to walk the whole tree. The sorted-walk property turned into early-exit counting.

```python
def kth_smallest(root, k: int) -> int:
    stack, cur = [], root
    while cur or stack:
        while cur:
            stack.append(cur)
            cur = cur.left
        cur = stack.pop()
        k -= 1
        if k == 0:
            return cur.val
        cur = cur.right
    return -1
```

**Complexity:** O(h + k) time, O(h) space.

**Duplicate problems:**
- Binary Search Tree Iterator (LC 173) - same stack-based iterative in-order, wrapped as a stateful `next()`/`hasNext()` API instead of a one-shot k-th lookup.

### 3. Lowest Common Ancestor of a BST

Find the LCA of two nodes `p` and `q` in a BST.

**Worked examples:**
- **Example 1**
  - **Input:** root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8 | **Output:** 6
  - **Explanation:** 2 and 8 sit on opposite sides of 6 (2 < 6 < 8), so 6 is the split point.
- **Example 2**
  - **Input:** root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4 | **Output:** 2
  - **Explanation:** both 2 and 4 are ≥ 2 (4 is in 2's own right subtree), so descent stops at 2 itself.

**Constraints:** `2 ≤ number of nodes ≤ 10⁵`, all node values unique, `p` and `q` both exist in the tree and `p ≠ q`.

**Approach:** Unlike a [general binary tree](./binary-tree.md#5-lowest-common-ancestor--recursive-search), a BST lets you use the ordering: if both keys are smaller than the current node, the LCA is in the left subtree; if both larger, the right; the moment they **split** (one each side, or one equals the node), the current node is the LCA. O(h), no full search.

```python
def lca_bst(root, p, q):
    while root:
        if p.val < root.val and q.val < root.val:
            root = root.left
        elif p.val > root.val and q.val > root.val:
            root = root.right
        else:
            return root
    return None
```

**Complexity:** O(h) time, O(1) space.

**Duplicate problems:**
- Lowest Common Ancestor of a Binary Tree III (LC 1650) - same ordering-based split-point shortcut, adapted to nodes carrying a `parent` pointer instead of descending from the root.

### 4. Insert into a BST

Insert a value into a BST and return the (possibly new) root, keeping it a valid BST. The value is guaranteed not already present.

**Worked examples:**
- **Example 1**
  - **Input:** root = [4,2,7,1,3], val = 5 | **Output:** [4,2,7,1,3,5]
  - **Explanation:** 5 > 4 → go right to 7; 5 < 7 → go left to null → place 5 as 7's left child.
- **Example 2**
  - **Input:** root = null, val = 10 | **Output:** [10]
  - **Explanation:** an empty tree's insert creates the root directly.

**Constraints:** `0 ≤ number of nodes ≤ 10⁴`, all values unique, `-10⁸ ≤ val ≤ 10⁸`.

**Approach:** Descend by comparison - go left if smaller, right if larger - until you hit a null child, and place the new node there. The new node is always inserted as a **leaf**, so no restructuring is needed (in a plain BST). Pure invariant-guided recursion; the base case creates the node.

```python
def insert_into_bst(root, val: int):
    if root is None:
        return Node(val)
    if val < root.val:
        root.left = insert_into_bst(root.left, val)
    else:
        root.right = insert_into_bst(root.right, val)
    return root
```

**Complexity:** O(h) time, O(h) space.

### 5. Convert Sorted Array to BST

Given a sorted array, build a **height-balanced** BST from it.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [-10,-3,0,5,9] | **Output:** a balanced tree rooted at 0, e.g. [0,-3,9,-10,null,5]
  - **Explanation:** the midpoint 0 becomes the root; each half recurses the same way.
- **Example 2**
  - **Input:** nums = [1,3] | **Output:** [3,1] or [1,null,3]
  - **Explanation:** a 2-element array has two valid midpoint choices - either produces a height-balanced (height-1) tree.

**Constraints:** `1 ≤ nums.length ≤ 10⁴`, `nums` sorted strictly ascending.

**Approach:** Pick the **middle** element as the root (so left and right halves are equal size), then recursively build the left subtree from the left half and the right from the right half. Choosing the midpoint each time guarantees height O(log n) - the inverse of the skew problem: balanced input order by construction. Divide-and-conquer on the array.

```python
def sorted_array_to_bst(nums: list[int]):
    def build(lo: int, hi: int):
        if lo > hi:
            return None
        mid = (lo + hi) // 2
        node = Node(nums[mid])
        node.left = build(lo, mid - 1)
        node.right = build(mid + 1, hi)
        return node
    return build(0, len(nums) - 1)
```

**Complexity:** O(n) time, O(log n) space (balanced recursion).

**Duplicate problems:**
- Convert Sorted List to Binary Search Tree (LC 109) - same midpoint-recursion technique, adapted to a linked list's lack of random access (usually solved via slow/fast pointer to find the midpoint, or an in-order simulation).

### 6. Delete Node in a BST

Delete a node with the given key from a BST and return the root of the resulting tree, keeping it a valid BST.

**Worked examples:**
- **Example 1**
  - **Input:** root = [5,3,6,2,4,null,7], key = 3 | **Output:** [5,4,6,2,null,null,7] (or [5,2,6,null,4,null,7] - either valid successor/predecessor choice)
  - **Explanation:** 3 has two children (2 and 4); replace it with its in-order successor 4 (the leftmost node of 3's right subtree), then delete 4 from its original spot.
- **Example 2**
  - **Input:** root = [5,3,6,2,4,null,7], key = 6 | **Output:** [5,3,7,2,4]
  - **Explanation:** 6 has one child (7); splice 6 out and promote 7 directly - no successor search needed.

**Constraints:** `0 ≤ number of nodes ≤ 10⁴`, all node values unique, `-10⁵ ≤ key, node.val ≤ 10⁵`.

**Approach:** This is [the one tricky BST operation](#how-it-works) - "the most-tested BST coding detail" per this article's own gotchas. Descend to find the key. Two of the three cases are trivial splices: a leaf is removed outright, and a one-child node is replaced by its single child. The hard case is **two children**: you cannot simply remove the node without orphaning a subtree, so you copy in the value of the **in-order successor** (the smallest key in the right subtree - found by walking left from `node.right` until there's no more left child), then recursively delete that successor from the right subtree. Because the successor has no left child by definition, deleting it recurses into one of the two easy cases - the two-child case always reduces to a simpler one exactly once.

```python
def delete_node(root, key: int):
    if root is None:
        return None
    if key < root.val:
        root.left = delete_node(root.left, key)
    elif key > root.val:
        root.right = delete_node(root.right, key)
    else:
        if root.left is None:
            return root.right                 # 0 or 1 child (right) → splice
        if root.right is None:
            return root.left                  # 1 child (left) → splice
        succ = root.right                     # two children → in-order successor
        while succ.left:
            succ = succ.left
        root.val = succ.val                   # copy successor's value up
        root.right = delete_node(root.right, succ.val)  # remove successor from its original spot
    return root
```

**Complexity:** O(h) time, O(h) space (recursion) - one descent to find the key, plus at most one more descent to find/remove the successor, both bounded by height.

**Duplicate problems:**
- Delete Leaves With a Given Value (LC 1325) - a related but distinct splice-only variant (no two-child successor case, since only leaves are ever removed).

### 7. Inorder Successor in BST

Given a BST and a node `p`, find `p`'s in-order successor (the node with the smallest key strictly greater than `p.val`), or `null` if `p` is the last node in-order.

**Worked examples:**
- **Example 1**
  - **Input:** root = [2,1,3], p = 1 | **Output:** 2
  - **Explanation:** 1 has a right child? No - 1 has no right subtree, so the successor is the lowest ancestor for which 1 sits in the left subtree, which is 2.
- **Example 2**
  - **Input:** root = [5,3,6,2,4], p = 3 | **Output:** 4
  - **Explanation:** 3 has a right child (4) with no left subtree, so the successor is the leftmost node of 3's right subtree - 4 itself.

**Constraints:** `1 ≤ number of nodes ≤ 10⁴`, all node values unique, `p` exists in the tree.

**Approach:** This is the ordering invariant's **navigation** operation, distinct from the traversal-counting used in problem 2 and the split-point search in problem 3. Two cases: if `p` has a right child, the successor is that subtree's **leftmost** node (walk `right`, then `left` until none remain). If `p` has no right child, the successor is the **lowest ancestor for which `p` lies in the left subtree** - found by descending from the root, going left whenever the current node is greater than `p.val` (recording it as a successor candidate) and right otherwise, since only a "went-left" ancestor can have `p` entirely in its left subtree. No parent pointers needed if you track candidates during the single root-to-`p` descent.

```python
def inorder_successor(root, p) -> "Node | None":
    if p.right:                             # case 1: successor is leftmost of right subtree
        node = p.right
        while node.left:
            node = node.left
        return node
    successor = None                        # case 2: lowest ancestor where we went left
    node = root
    while node:
        if p.val < node.val:
            successor = node                # candidate: p is in this node's left subtree
            node = node.left
        elif p.val > node.val:
            node = node.right
        else:
            break
    return successor
```

**Complexity:** O(h) time, O(1) space.

**Duplicate problems:**
- Inorder Successor in BST II (LC 510) - same two-case successor logic, adapted to nodes carrying an explicit `parent` pointer instead of re-descending from the root.
