# Binary Tree

## Prerequisites

- [Big-O Notation](../algorithms/big-o-notation.md) [Must read]
- [Linked List](./linked-list.md) [Must read]
- [Queue](./queue.md) [Should read]
- [Stack](./stack.md) [Should read]

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
  - [Depth-first: pre / in / post-order](#depth-first-pre--in--post-order)
  - [Breadth-first: level-order](#breadth-first-level-order)
  - [The shape invariants: full, complete, balanced](#the-shape-invariants-full-complete-balanced)
- [Implementation](#implementation)
- [Gotchas / edge cases](#gotchas--edge-cases)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)
  - [Maximum Depth of Binary Tree](#1-maximum-depth-of-binary-tree)
  - [Binary Tree Level Order Traversal](#2-binary-tree-level-order-traversal)
  - [Invert Binary Tree](#3-invert-binary-tree)
  - [Diameter of Binary Tree](#4-diameter-of-binary-tree)
  - [Lowest Common Ancestor](#5-lowest-common-ancestor)

## What it is

A **binary tree** is a hierarchical structure of nodes where each node has at most **two children** - a left and a right - and exactly one node (the root) has no parent.

Mental model: **a family tree, or an org chart, where everyone has at most two reports.** Start at the root and branch downward; every node is itself the root of a smaller subtree. That **self-similarity** - a tree is a node plus a left subtree plus a right subtree - is why almost every tree algorithm is naturally recursive: solve the children, combine, done.

> **Takeaway (say this out loud):** "A binary tree is nodes with up to two children - recursive by nature, so most operations are 'recurse left, recurse right, combine', running in O(height)."

## How it works

Each **node** holds a value and two child pointers, `left` and `right`, either of which can be null. The tree is just a pointer to the **root**; from there, every node is reachable by following child links. A node with no children is a **leaf**.

```
            (1)            ← root, depth 0
           /   \
        (2)     (3)        ← depth 1
        /  \       \
     (4)   (5)     (6)     ← depth 2 (4,5,6 are leaves)
```

Two definitions that every tree problem leans on:

- **Height** of a node = the longest downward path to a leaf (the tree's height is the root's). **Depth** = distance from the root. The tree above has height 2.
- **O(height), not O(n).** Search/insert/delete in a search tree are O(height): **O(log n)** when the tree is balanced (height ~log n), but **O(n)** when it degenerates into a chain. Balance is the difference between a tree and a glorified linked list - and the entire reason [balanced BSTs](./balanced-bst.md) exist.

The structure's self-similarity is the key working insight: **`tree = node + left subtree + right subtree`**. Any property you want (height, sum, whether it's balanced) you compute by recursing into both subtrees and combining their answers at the current node - the [tree-DP](#4-diameter-of-binary-tree) pattern. Iteratively, the same walk uses an explicit [stack](./stack.md) (depth-first) or [queue](./queue.md) (breadth-first).

## Operations

| Operation                       | Time  | Space  |
| ------------------------------- | ----- | ------ |
| Traverse (visit all nodes)      | O(n)  | O(h)\* |
| Search (unordered tree)         | O(n)  | O(h)   |
| Insert at a known position      | O(1)  | O(1)   |
| Delete a known node             | O(1)† | O(1)   |
| Height / depth computation      | O(n)  | O(h)   |
| Search/insert/delete (as a BST) | O(h)  | O(h)   |

\*Recursion (or an explicit stack) holds up to `h` frames - O(h) space, where h = height. †Deleting an arbitrary node and re-parenting its children is O(1) only with the node and parent in hand; in a [BST](./binary-search-tree.md), maintaining the order invariant on delete is O(h). A plain binary tree has **no ordering**, so search is O(n) - ordering is what a [BST](./binary-search-tree.md) adds.

## Complexity summary

| Operation             | Best (balanced) | Average  | Worst (skewed) |
| --------------------- | --------------- | -------- | -------------- |
| Traversal             | O(n)            | O(n)     | O(n)           |
| Search (as BST)       | O(log n)        | O(log n) | O(n)           |
| Insert (as BST)       | O(log n)        | O(log n) | O(n)           |
| Recursion stack depth | O(log n)        | O(log n) | O(n)           |

**Space:** O(n) for the nodes (two child pointers each). The crucial hidden cost is the **recursion stack**: O(height) frames - fine at O(log n) for a balanced tree, but a degenerate (skewed) tree makes it O(n) and can **overflow the call stack** on large inputs. Morris traversal achieves O(1) space by temporarily threading pointers, at the cost of mutating the tree during the walk (see [Gotchas](#gotchas--edge-cases)).

## When to use / when not

**Reach for a binary tree when:**

- Your data is **naturally hierarchical** - file systems, the DOM, org charts, expression/parse trees, decision trees.
- You need **ordered operations with fast insert** → a [binary search tree](./binary-search-tree.md) (O(log n) search _and_ in-order = sorted), or a [balanced BST](./balanced-bst.md) to guarantee it.
- You need **priority access** → a [heap](./heap.md), a complete binary tree giving O(1) min/max.
- You need **prefix queries on strings** → a [trie](./trie.md), a tree branching on characters.

**Reach for something else when:**

- **You only need key→value lookup, no order** → a [hash table](./hash-table.md) is O(1) average vs the tree's O(log n). Trees earn their keep when _order_ matters (range queries, k-th smallest, sorted iteration).
- **The data is flat / index-addressed** → an [array](./array.md); imposing a tree adds pointer overhead and cache misses for nothing.
- **You can't guarantee balance and need worst-case bounds** → an unbalanced BST degrades to O(n); use a [balanced BST](./balanced-bst.md) or a hash table.

Rule of thumb: **a binary tree is the answer when the problem is hierarchical or needs order-plus-fast-insert.** Plain binary trees are mostly a teaching/structural base; in practice you reach for a _specialized_ one - BST, heap, or trie.

Real-world: the **DOM** and any UI view hierarchy, file-system directory trees, database **B-tree/B+-tree indexes** (a generalization), Huffman coding trees in compression, expression trees in compilers and spreadsheets, and the [heap](./heap.md) behind every priority queue and scheduler.

## Comparison

How a binary tree relates to the structures you'd weigh against it:

| Structure       | Search        | Insert       | Ordered iteration  | Range / k-th | Memory                 | Pick it when…                      |
| --------------- | ------------- | ------------ | ------------------ | ------------ | ---------------------- | ---------------------------------- |
| **Binary tree** | O(n)          | O(1) at spot | no (unordered)     | no           | 2 ptrs/node, scattered | the data is **inherently hierarchical** (an expression, a file system, a decision tree) - no key ordering to exploit, so paying for a BST's invariant buys nothing; wins whenever the shape of the tree *is* the answer, not a lookup-speed device |
| BST (balanced)  | **O(log n)**  | **O(log n)** | **yes** (in-order) | **O(log n)** | 2 ptrs/node            | ordered keys need search **and** insert both faster than O(n) - crosses over from a plain binary tree the moment you also need lookup by key, not just traversal; crosses over from a sorted array the moment inserts/deletes happen after the initial build (array insert is O(n), BST is O(log n)) |
| Heap            | O(n) (search) | O(log n)     | no                 | min/max only | array, complete tree   | you only ever need the **current extremum**, never an arbitrary key - beats a BST by skipping full-order maintenance for a guarantee it doesn't need; loses the moment anything but min/max is needed (a mid-range key search is O(n) on a heap vs O(log n) on a BST) |
| Trie            | O(L) by char  | O(L)         | by prefix          | prefix       | child ptrs/node        | keys are **strings and prefix queries matter** - crosses over from a BST once "all keys starting with X" needs to beat the BST's O(k + log n) range-scan, at the cost of O(alphabet × nodes) memory a BST doesn't pay |
| Hash table      | **O(1)** avg  | **O(1)** avg | no                 | no           | scattered + slack      | lookup speed matters and **order is irrelevant** - beats every tree here the instant "sorted"/"range"/"k-th smallest" isn't part of the problem; a tree wins back the trade the moment one of those three phrases appears |

The plain binary tree's value is **structure and recursion**, not speed - its specialized children (BST, heap, trie) are where the O(log n)/O(1) guarantees live. A hash table beats them all on unordered lookup; trees win the moment _order_ enters.

## Variants

- **[Binary Search Tree (BST)](./binary-search-tree.md)** - ordering invariant (`left < node < right`) gives O(log n) search and sorted in-order traversal. The most important specialization.
- **[Balanced BST (AVL / Red-Black)](./balanced-bst.md)** - a BST that self-balances via rotations to guarantee O(log n) height, defeating the skew that ruins a plain BST.
- **[Heap](./heap.md)** - a **complete** binary tree with the heap invariant (parent beats children); stored in a flat array, O(1) min/max. The priority-queue workhorse.
- **[Trie (prefix tree)](./trie.md)** - branches on characters rather than comparisons; O(L) string lookup and prefix queries.
- **N-ary tree** - each node has any number of children (the DOM, file systems). Generalizes the binary tree; often re-encoded as binary via "left-child / right-sibling".
- **Segment tree / Fenwick tree (BIT)** - tree-shaped indexes over array ranges for O(log n) range queries; [segment tree](./segment-tree.md). Structurally trees, used as range-query engines.
- **Threaded binary tree** - leaf null-pointers repurposed to point at in-order predecessor/successor, enabling O(1)-space traversal (the idea behind Morris traversal).

## Traversal & invariant

The two things that define a binary tree in interviews: **the orders you can walk it** and **the shape constraints that bound its height**.

### Depth-first: pre / in / post-order

DFS visits a whole subtree before moving on, using a [stack](./stack.md) (the call stack, or an explicit one). The three orders differ only in **when the node itself is visited** relative to its children:

```
            (1)
           /   \
        (2)     (3)
        /  \
     (4)   (5)

Pre-order  (node, left, right):   1 2 4 5 3      ▷ "visit before descending" - copy/serialize a tree
In-order   (left, node, right):   4 2 5 1 3      ▷ on a BST → SORTED order
Post-order (left, right, node):   4 5 2 3 1      ▷ "children first" - delete a tree, compute size/height
```

Each is the same O(n) walk; the choice encodes _when_ you need a node's answer relative to its subtrees:

- **Pre-order** - act on a node before its children: serialize, clone, render top-down.
- **In-order** - on a [BST](./binary-search-tree.md), produces keys in **sorted** order. The defining BST property.
- **Post-order** - need both children's results first: compute height/size, delete (free children before parent), [tree DP](#4-diameter-of-binary-tree).

### Breadth-first: level-order

BFS visits the tree **level by level**, using a [queue](./queue.md): dequeue a node, enqueue its children, repeat. Snapshotting the queue size at the start of each loop iteration groups nodes by level.

```
level 0:  1
level 1:  2 3
level 2:  4 5

queue walk: enqueue 1 → [1]; dequeue 1, enqueue 2,3 → [2,3]; dequeue 2, enqueue 4,5 → [3,4,5]; …
```

Use level-order for "process by depth": shortest path in an unweighted tree, level averages, right-side view, zig-zag traversal.

### The shape invariants: full, complete, balanced

The single number that governs tree performance is **height**, and these invariants bound it:

- **Full** - every node has 0 or 2 children (no node has exactly one). A structural curiosity, not a performance guarantee.
- **Complete** - every level filled except possibly the last, which fills left-to-right. Guarantees height = ⌊log₂ n⌋ and packs perfectly into an array with **no gaps** (children of index `i` at `2i+1`/`2i+2`, parent at `(i-1)//2`) - this is exactly the [heap](./heap.md)'s shape and why a heap needs no pointers.
- **Balanced** - every node's two subtree heights differ by ≤ 1 (AVL's definition), keeping height O(log n). This is the invariant a [balanced BST](./balanced-bst.md) maintains via rotations - and the difference between O(log n) and a skewed O(n) chain.

The invariant matters because **a binary tree with no balance guarantee can degenerate into a linked list** (insert sorted data into a plain BST → a right-leaning chain, every op O(n)). Balance is not decoration; it's what makes the tree a tree.

## Implementation

A binary tree node plus the canonical traversals. Pseudocode states the recursive contract; Python gives the idiomatic recursion and the iterative equivalents you reach for to dodge stack overflow.

**Pseudocode (CLRS-style contract):**

```
INORDER-TRAVERSE(node, visit)
1   if node == NIL
2       return                    ▷ base case: empty subtree
3   INORDER-TRAVERSE(node.left, visit)
4   visit(node.key)
5   INORDER-TRAVERSE(node.right, visit)

LEVEL-ORDER(root, visit)
1   if root == NIL
2       return
3   Q = new QUEUE();  ENQUEUE(Q, root)
4   while not EMPTY(Q)
5       node = DEQUEUE(Q)
6       visit(node.key)
7       if node.left  ≠ NIL:  ENQUEUE(Q, node.left)
8       if node.right ≠ NIL:  ENQUEUE(Q, node.right)
```

**Python (reference - idiomatic):**

```python
from __future__ import annotations
from collections import deque
from dataclasses import dataclass
from typing import Optional

@dataclass
class TreeNode:
    val: int
    left: Optional["TreeNode"] = None
    right: Optional["TreeNode"] = None

def inorder(root: Optional[TreeNode]) -> list[int]:
    """Recursive in-order: left, node, right → sorted on a BST."""
    if root is None:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)

def inorder_iterative(root: Optional[TreeNode]) -> list[int]:
    """Same walk with an explicit stack - no recursion-depth limit."""
    out, stack, cur = [], [], root
    while cur or stack:
        while cur:
            stack.append(cur)
            cur = cur.left
        cur = stack.pop()                # backtrack: visit, then go right
        out.append(cur.val)
        cur = cur.right
    return out

def level_order(root: Optional[TreeNode]) -> list[list[int]]:
    """BFS grouped by level using a queue."""
    if root is None:
        return []
    out, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):          # snapshot this level's size
            node = q.popleft()
            level.append(node.val)
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        out.append(level)
    return out
```

**Contest velocity.** Recursion is the fastest to write for tree DFS - but Python's ~1000-frame recursion cap means a deep/skewed tree (10⁵ nodes) overflows. Either `sys.setrecursionlimit(10**6)` (and raise the OS stack) or switch to the iterative stack version. For BFS, `collections.deque` is the queue (never `list.pop(0)`).

## Gotchas / edge cases

- **The empty tree (null root).** Every traversal and computation must handle `root is None` as the base case - it's the most-forgotten edge and the first thing an interviewer tests. Height of empty = 0 (or -1 by some conventions - state which), traversal = empty list.
- **Single node vs deep skew.** A one-node tree (root, no children) and a fully skewed tree (every node has only a right child → a [linked list](./linked-list.md)) are the boundary cases. The skew is where O(log n) silently becomes O(n) and recursion overflows - never assume balance unless it's a [balanced BST](./balanced-bst.md).
- **Recursion-depth overflow.** Recursive DFS on a deep/skewed tree (10⁵+ nodes) blows Python's ~1000-frame stack (`RecursionError`) or the OS stack in C/Java. Convert to an explicit-[stack](./stack.md) iterative walk, or raise the limit - a frequent cause of "works on small input, crashes on big".
- **Height vs depth, and 0 vs 1 conventions.** Height (to deepest leaf) and depth (from root) are opposite directions, and whether a single node has height 0 or 1 varies by source. Pin the convention down before coding; off-by-one here is a classic bug.
- **In-order on a non-BST isn't sorted.** In-order gives sorted output **only** on a [BST](./binary-search-tree.md). On a plain binary tree it's just left-node-right with no ordering meaning - don't assume sortedness from a generic tree.
- **Mutating during traversal (Morris caveat).** O(1)-space Morris traversal temporarily rewires leaf pointers; if the walk aborts midway (an exception, an early return), the tree is left corrupted. Restore pointers or use the explicit stack unless O(1) space is genuinely required.

## What the interviewer probes for

**What breaks if this tree has 10⁹ nodes?** - Two separate things degrade: recursive traversal blows the call stack long before 10⁹ (Python's ~1000-frame default limit is the first wall, and even a raised limit hits the OS stack eventually on a skewed tree), so at that scale you switch to the iterative explicit-stack/queue forms shown in Implementation. Second, even with iteration fixed, pointer-chasing between scattered heap-allocated nodes means each traversal step is a likely cache miss - the same cost the Gotchas section's skew case hints at, just now hitting even a balanced tree because 10⁹ nodes can't fit in cache regardless of shape.

**Why not always use a BST instead of a plain binary tree?** - A plain binary tree is the right choice when the data is **inherently hierarchical** and there's no key ordering to exploit - an expression tree, a file-system tree, a decision tree - the shape of the tree *is* the answer, not a lookup mechanism. Imposing a BST's ordering invariant on that data buys nothing since there's no "search by key" need. The Comparison table's crossover is explicit: reach for a BST the moment you also need fast lookup **by key**, not just structural traversal - at that point a plain binary tree is strictly worse (O(n) search vs the BST's O(log n)) for no benefit.

**Why does the choice between DFS and BFS matter, and does it change at scale?** - Pre/in/post-order (DFS, O(h) space via the call stack) versus level-order (BFS, O(w) space via an explicit queue, where w is the widest level) is a space trade-off that flips depending on tree shape: a tall, narrow tree makes BFS's queue balloon to hold a wide level, while a short, bushy tree makes DFS's stack shallow. At large n with an unbalanced or very wide tree, the "wrong" choice can dominate memory - a senior answer picks the traversal based on the tree's expected shape, not habit.

## Practice problems

Five staples, each a **distinct** tree technique - no two solved the same way.

### 1. Maximum Depth of Binary Tree

Return the maximum depth (number of nodes on the longest root-to-leaf path) of a binary tree.

**Worked examples:**
- **Example 1**
  - **Input:** root = [3,9,20,null,null,15,7] | **Output:** 3
  - **Explanation:** the longest root-to-leaf path is 3→20→15 (or 3→20→7), 3 nodes deep.
- **Example 2**
  - **Input:** root = [] | **Output:** 0
  - **Explanation:** an empty tree has no nodes, so depth is 0 by convention.

**Constraints:** `0 ≤ number of nodes ≤ 10⁴`, `-100 ≤ node.val ≤ 100`.

**Approach:** The self-similar definition is the solution: depth of a node = 1 + max(depth of left, depth of right), with empty = 0. A direct post-order recursion - solve both subtrees, combine. The cleanest demonstration of "recurse, combine" on a tree.

```python
def max_depth(root: Optional[TreeNode]) -> int:
    if root is None:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))
```

**Complexity:** O(n) time, O(h) space (recursion stack).

**Duplicate problems:**
- Minimum Depth of Binary Tree (LC 111) - same post-order recurse-and-combine shape, but must special-case a single-child node (it's not a leaf, so the shorter side doesn't count).

### 2. Binary Tree Level Order Traversal

Return the node values grouped by level, top to bottom.

**Worked examples:**
- **Example 1**
  - **Input:** root = [3,9,20,null,null,15,7] | **Output:** [[3],[9,20],[15,7]]
  - **Explanation:** level 0 has just the root; level 1 has 9 and 20; level 2 has 15 and 7.
- **Example 2**
  - **Input:** root = [1] | **Output:** [[1]]
  - **Explanation:** a single-node tree has exactly one level.

**Constraints:** `0 ≤ number of nodes ≤ 2000`, `-1000 ≤ node.val ≤ 1000`.

**Approach:** BFS with a [queue](./queue.md), snapshotting the queue length at the start of each iteration so you process exactly one level before moving down. The FIFO order guarantees left-to-right within a level. The canonical "process by depth" tree problem.

```python
from collections import deque

def level_order(root: Optional[TreeNode]) -> list[list[int]]:
    if root is None:
        return []
    out, q = [], deque([root])
    while q:
        level = [None] * len(q)
        for i in range(len(level)):
            node = q.popleft()
            level[i] = node.val
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        out.append(level)
    return out
```

**Complexity:** O(n) time, O(n) space (queue holds up to a full level). Pattern: [Tree & Graph Traversal](../patterns/tree-graph-traversal.md).

**Duplicate problems:**
- Binary Tree Zigzag Level Order Traversal (LC 103) - identical BFS-by-level mechanic, alternating the append direction per level.
- Average of Levels in Binary Tree (LC 637) - same level-snapshot BFS, averaging instead of collecting.

### 3. Invert Binary Tree

Mirror a binary tree: swap every node's left and right children.

**Worked examples:**
- **Example 1**
  - **Input:** root = [4,2,7,1,3,6,9] | **Output:** [4,7,2,9,6,3,1]
  - **Explanation:** each node's children are swapped, recursively, so the whole tree becomes its mirror image.
- **Example 2**
  - **Input:** root = [] | **Output:** []
  - **Explanation:** an empty tree inverts to itself - the base case returns immediately.

**Constraints:** `0 ≤ number of nodes ≤ 100`, `-100 ≤ node.val ≤ 100`.

**Approach:** Recurse: swap the current node's two children, then invert each subtree. A pre-order (swap then descend) or post-order (descend then swap) both work - the swap is local and the recursion handles the rest. The "famous whiteboard" one-liner of tree recursion.

```python
def invert_tree(root: Optional[TreeNode]) -> Optional[TreeNode]:
    if root is None:
        return None
    root.left, root.right = invert_tree(root.right), invert_tree(root.left)
    return root
```

**Complexity:** O(n) time, O(h) space.

### 4. Diameter of Binary Tree

Return the length of the longest path between any two nodes (counted in edges), which may or may not pass through the root.

**Worked examples:**
- **Example 1**
  - **Input:** root = [1,2,3,4,5] | **Output:** 3
  - **Explanation:** the longest path is `4→2→1→3` (or `5→2→1→3`), 3 edges.
- **Example 2**
  - **Input:** root = [1,2] | **Output:** 1
  - **Explanation:** the only path is the single edge from 1 to 2.

**Constraints:** `1 ≤ number of nodes ≤ 10⁴`, `-100 ≤ node.val ≤ 100`.

**Approach:** **Tree DP**: at each node, the longest path _through_ it is `leftHeight + rightHeight`; update a global max with that, while _returning_ `1 + max(leftHeight, rightHeight)` (the height) to the parent. The two-values trick - return one thing, track another - is the heart of tree DP. One post-order pass.

```python
def diameter_of_binary_tree(root: Optional[TreeNode]) -> int:
    best = 0
    def height(node: Optional[TreeNode]) -> int:
        nonlocal best
        if node is None:
            return 0
        lh, rh = height(node.left), height(node.right)
        best = max(best, lh + rh)         # edges in path through node
        return 1 + max(lh, rh)            # height upward
    height(root)
    return best
```

**Complexity:** O(n) time, O(h) space.

**Duplicate problems:**
- Binary Tree Maximum Path Sum (LC 124) - same return-one-track-another tree DP shape, summing values instead of counting edges (and clamping negative subtree contributions to 0).
- Balanced Binary Tree (LC 110) - same post-order tree-DP skeleton (recurse both children, combine at the node) computing a balance check instead of a diameter.
- House Robber III (LC 337) - same post-order tree-DP skeleton, returning a pair of values (rob-this-node / skip-this-node) instead of a single height, to combine at each node.

### 5. Lowest Common Ancestor

Given two nodes `p` and `q` in a binary tree, return their lowest common ancestor (the deepest node having both as descendants). Both nodes exist in the tree.

**Worked examples:**
- **Example 1**
  - **Input:** root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1 | **Output:** 3
  - **Explanation:** 5 and 1 are on opposite sides of the root, so the root itself is the split point.
- **Example 2**
  - **Input:** root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 4 | **Output:** 5
  - **Explanation:** 4 is a descendant of 5 (via 2), so 5 is its own ancestor and the LCA.

**Constraints:** `2 ≤ number of nodes ≤ 10⁵`, all node values unique, `p` and `q` both exist in the tree and `p ≠ q`.

**Approach:** Recurse: if the current node is `p`, `q`, or null, return it. Recurse into both subtrees; if **both** sides return non-null, the current node is the split point → it's the LCA. If only one side does, the LCA is up that side. The recursion "bubbles up" the answer from where the two targets first diverge.

```python
def lowest_common_ancestor(root, p, q):
    if root is None or root is p or root is q:
        return root                        # found a target or hit the bottom
    left = lowest_common_ancestor(root.left, p, q)
    right = lowest_common_ancestor(root.right, p, q)
    if left and right:
        return root
    return left or right                    # both on one side (or neither)
```

**Complexity:** O(n) time, O(h) space.

**Duplicate problems:**
- Lowest Common Ancestor of a Binary Tree II (LC 1644) - same bubble-up recursion, but must handle the case where `p` or `q` might not exist in the tree at all.
