# Lowest Common Ancestor

## Prerequisites

- [Binary Tree](../data-structures/binary-tree.md) [Must read] - LCA is defined over a rooted tree; you need depth, ancestor, and the recursive tree-DP shape before the algorithm makes sense.
- [Depth-First Search (DFS)](./dfs.md) [Must read] - both the naive recursive LCA and the binary-lifting preprocessing walk the tree via DFS to compute depth and parent pointers.
- [Dynamic Programming](./dynamic-programming.md) [Must read] - binary lifting **is** a DP over `(node, power-of-two-jump)` states; the doubling trick is the same "build big answers from precomputed small ones" idea as any DP-on-exponents.
- [Bit Manipulation](./bit-manipulation.md) [Should read] - decomposing a jump distance into powers of two (the same `i & -i` / bit-decomposition idea as a [Fenwick tree](../data-structures/fenwick-tree.md)) is how binary lifting answers "jump k steps" in O(log n).

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
- [Graph/tree assumptions](#graphtree-assumptions)
- [Edge cases](#edge-cases)
- [Implementation](#implementation)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)
  - [Lowest Common Ancestor of a Binary Tree](#1-lowest-common-ancestor-of-a-binary-tree--recursive-onepass)
  - [Lowest Common Ancestor of a Binary Search Tree](#2-lowest-common-ancestor-of-a-binary-search-tree--ordering-shortcut)
  - [Kth Ancestor of a Tree Node](#3-kth-ancestor-of-a-tree-node--binary-lifting)

## What it is

The **lowest common ancestor** of two nodes `u` and `v` in a rooted tree is the deepest node that is an ancestor of both - the point where the root-to-`u` and root-to-`v` paths diverge.

Mental model: **two people walking up their own family tree toward the root, one step at a time - LCA is the first ancestor they have in common.** Every tree query about "distance between two nodes" or "does this node lie between these two" routes through LCA, because the path between `u` and `v` always goes up through the LCA and back down - there's no other way through a tree (no cycles, one path between any two nodes).

> **Takeaway (say this out loud):** "LCA is where two root-to-node paths split - the naive one-pass DFS answers a single query in O(n), but if you have many queries, precompute binary-lifting tables in O(n log n) once and answer each query in O(log n)."

## Intuition

If you had **unlimited queries but only one pair**, you'd just walk up from both nodes to the root, record both paths, and find the deepest shared node - or better, do one DFS: recurse into both children, and the node where **both sides report "found something"** is the split point (this is exactly the binary-tree LCA already shown in [Binary Tree - Practice problems](../data-structures/binary-tree.md#5-lowest-common-ancestor--recursive-search)).

The problem is **repeated queries**. If you ask "LCA(u, v)" a thousand times on the same tree, redoing an O(n) walk each time is wasteful - the tree doesn't change between queries, only `u` and `v` do. The fix is the same idea behind every "preprocess once, answer fast" structure in this vertical (a [Fenwick tree](../data-structures/fenwick-tree.md) preprocesses prefix decomposition; a [sparse table](../patterns/prefix-sum.md) preprocesses range-min blocks): spend O(n log n) once building **jump tables** - "who is `2^0` steps above me, `2^1` steps above me, `2^2` steps above me, …" for every node - then answer any query by **binary-searching the ancestor chain** instead of walking it one node at a time. Lifting the deeper node up to the same depth, then jumping both nodes upward in decreasing powers of two until they're about to meet, turns an O(n) walk into O(log n) jumps.

## How it works

**Step-by-step trace** of binary lifting, LCA(node 7, node 9) on this rooted tree (root = 1):

```
                1 (depth 0)
              / | \
            2   3   4        (depth 1)
           /       / \
          5       8   9      (depth 2)
         /
        6                    (depth 3)
       /
      7                      (depth 4)
```

Concretely, with parent pointers: `parent[1]=null, parent[2]=1, parent[3]=1, parent[4]=1, parent[5]=2, parent[6]=5, parent[7]=6, parent[8]=4, parent[9]=4`. Depths: `depth[1]=0, depth[2]=1, depth[3]=1, depth[4]=1, depth[5]=2, depth[6]=3, depth[7]=4, depth[8]=2, depth[9]=2`.

**Step 1 - build the jump table** `up[node][k]` = the ancestor `2^k` steps above `node`, via DP: `up[node][0] = parent[node]`, `up[node][k] = up[up[node][k-1]][k-1]` (jump `2^(k-1)`, then jump another `2^(k-1)` = jump `2^k` total).

**Step 2 - equalize depth.** `depth[7]=4`, `depth[9]=2` - lift node 7 up by `4-2=2` steps using the binary decomposition of 2 (`2 = 0b10`, so one jump of `2^1`): `7 → up[7][1] = 5`. Now both at depth 2: comparing `5` and `9`.

```
Depth-equalize: 7 (depth 4) lifts 2 steps → lands on 5 (depth 2)
                9 stays at depth 2
                Now compare 5 vs 9 at equal depth
```

**Step 3 - binary-search the split point.** `5 ≠ 9`, so they haven't met - jump **both** upward by the largest power of two that keeps them **still distinct**, repeat with smaller powers:

```
Try jump 2^1=2: up[5][1]=1, up[9][1]=1 → EQUAL → too far, skip this jump (would overshoot past the LCA)
Try jump 2^0=1: up[5][0]=2, up[9][0]=4 → still distinct → take this jump
5 → 2, 9 → 4
```

**Step 4 - one final step to the answer.** After exhausting all powers of two, `5` and `9` (now `2` and `4`) are **one step below** their true LCA (by construction - the loop only takes jumps that keep them distinct, so it stops just short). The answer is `parent[2] = parent[4] = 1`.

```
result: LCA(7, 9) = 1
```

Every step either **lifts the deeper node** (depth-equalize) or **jumps both nodes together** (binary-search the split) - never overshoots past the actual LCA, because a jump is only taken when it keeps the two nodes distinct.

## Correctness / invariant

**Invariant (depth-equalize phase):** after lifting the deeper node by `depth_diff` steps (decomposed into powers of two, largest first), both nodes are at the same depth and the LCA is still an ancestor of both - lifting the deeper node alone never skips past the LCA, since the LCA's depth is `≤ min(depth[u], depth[v])` and the lift only closes the depth gap.

**Invariant (binary-search phase):** at each power-of-two jump size `2^k` (tried largest to smallest), jump both nodes **only if** `up[u][k] ≠ up[v][k]`. This is the crux: if jumping both by `2^k` would make them equal, that common ancestor **might be the LCA or might be higher** - jumping there **can't be undone** by the algorithm's forward-only structure, so the algorithm conservatively **skips that jump** and tries a smaller one. If jumping by `2^k` keeps them distinct, it's always safe to take - the true LCA is strictly above both, so moving both up together (while staying distinct) never passes it.

**Why skipping matters (concrete).** In the worked trace above, at `k=1` both `5` and `9` jump to `up[·][1] = 1` - equal, so the rule **skips** this jump and tries `k=0` instead, landing on `2` and `4` (still distinct), then takes one final `parent[]` step to `1`. If the algorithm ignored the skip rule and jumped anyway at `k=1`, `u` and `v` would both **already be `1`** - the loop would then read `parent[1]`, which is `NIL` (the root has no parent), and either crash or silently return the wrong value. Worse, on a deeper tree the "jump anyway" version can land **past** the true LCA onto one of *its* ancestors, reporting a correct-looking but wrong node - the bug wouldn't even be obviously wrong on inspection, just silently too high in the tree.

**Termination / correctness:** after trying every power of two from `log₂(depth)` down to `0`, `u` and `v` are guaranteed to be **exactly one edge below the LCA** - any remaining gap smaller than every power of two tried must be zero (the powers of two span every possible remaining distance), and the loop's skip-if-equal rule guarantees they haven't jumped past it. So `parent[u] == parent[v] == LCA`.

## Complexity derivation

**Preprocessing:** the jump table `up[node][k]` has `n` nodes × `log₂(n)` levels = **O(n log n)** entries, each computed in O(1) from two already-computed entries (`up[node][k] = up[up[node][k-1]][k-1]`) - so **O(n log n) time and space** to build, once, for the whole tree. **Cache behavior:** stored row-major (`up[node]` contiguous), building column-by-column (all nodes at level `k` before level `k+1`, as the pseudocode does) streams sequentially through each row - cache-friendly; but a single `query` call jumps between arbitrary `(node, k)` cells scattered across rows, the same unpredictable-hop pattern a [Fenwick tree](../data-structures/fenwick-tree.md)'s `i & -i` walk has, so per-query cache misses are the norm even though the table itself is a flat array.

**Per query:** depth-equalizing lifts the deeper node using at most `log₂(n)` bit-decomposed jumps (the depth difference is `< n`, so it has at most `log₂ n` set bits worth of jump sizes) - **O(log n)**. The binary-search phase tries each of the `log₂(n)` powers of two exactly once, each a O(1) table lookup - **O(log n)**. Total: **O(log n) per query**, after the one-time O(n log n) build.

**q queries total:** O(n log n) preprocessing + O(q log n) querying = **O((n + q) log n)**, versus the naive recursive approach's O(n) per query = **O(n·q)** for q queries. The crossover: binary lifting wins once `q` is large enough that `q log n < n · q` minus the one-time build cost is recovered - concretely, once `q ≳ log n` queries are asked on the same static tree, preprocessing pays for itself.

## Constraints & approach

| Input size / query count                        | Expected approach                                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| n ≤ 10³, single query                              | Naive recursive DFS, O(n) - binary lifting's O(n log n) build isn't worth it for one query. |
| n ≤ 10⁵, q ≤ 10⁵ queries, **static tree**          | Binary lifting, O(n log n) preprocess + O(log n)/query - the standard competitive-programming answer. |
| n ≤ 10⁵, q ≤ 10⁵ queries, need O(1) per query      | Euler tour + sparse table RMQ, O(n log n) preprocess + **O(1)**/query - trades preprocessing for the fastest possible query when q is huge. |
| Tree is **updated** between queries (edges change) | Binary lifting/sparse-table tables are invalidated by structural change - fall back to per-query O(n) DFS, or a link-cut tree for full dynamic support (rare outside specialized CP). |
| n ≤ 20, LCA is a minor step in a larger DP          | Bitmask over ancestors sometimes substitutes; usually still cheaper to just binary-lift. |

The constraint that matters most: **is the tree static and are there many queries?** One query → naive O(n) wins on simplicity. Many queries on a static tree → binary lifting (O(log n)/query) or Euler tour + sparse table (O(1)/query, more code) - never re-derive LCA from scratch per query at scale.

## When to use / when not

**Reach for binary-lifting LCA when:**

- You have a **static tree** and **many LCA queries** - the O(n log n) one-time cost amortizes across queries. The single most common CP/interview trigger: "answer Q queries of `(u, v)` pairs asking for their LCA / the distance between them / whether `u` is an ancestor of `v`."
- You need **k-th ancestor queries** too - the same `up[node][k]` table answers "who is my k-th ancestor" in O(log n) by decomposing `k` into powers of two, for free once built.
- You need **distance between two nodes** in a tree - `dist(u, v) = depth[u] + depth[v] - 2 * depth[LCA(u, v)]`, an O(log n) query once LCA is fast.

**Reach for something else when:**

- **Only one query, or very few** - the naive O(n) recursive DFS from [Binary Tree](../data-structures/binary-tree.md#5-lowest-common-ancestor--recursive-search) is simpler to write and asymptotically fine; don't build a jump table for one lookup.
- **The tree is a BST** - use the **ordering shortcut**: walk down from the root, and the first node where `u` and `v` fall on opposite sides (or equal the node) is the LCA, O(h) with zero preprocessing - no need for lifting at all (see [Practice problems](#2-lowest-common-ancestor-of-a-binary-search-tree--ordering-shortcut)).
- **You need O(1) per query and can afford heavier preprocessing** - Euler tour the tree into a flat array, reduce LCA to a **range-minimum query** on depths, and answer with a [sparse table](../patterns/prefix-sum.md) in O(1). More code, same O(n log n) build, but no log-n per query. The reduction, concretely: DFS the tree, appending each node to a flat array **every time the walk touches it** - on first entry and again after returning from each child (a node of degree d appears d+1 times, so the array has O(n) entries total). Record each node's **first** occurrence index and the **depth** at every array position. Now `LCA(u, v)` = the node with **minimum depth** in the array slice between `u`'s and `v`'s first occurrences - intuitively, the walk between visiting `u` and visiting `v` must pass back through their common ancestor, and no shallower node, exactly once. A depth-array range-min query, precomputed into a sparse table, answers that in O(1).
- **The tree is dynamic** (edges inserted/deleted between queries) - jump tables and Euler tours are invalidated by structural changes; that's the domain of link-cut trees or Euler-tour trees, well beyond interview scope.

Real-world: LCA underlies **version-control merge-base computation** (`git merge-base` finds the common ancestor commit of two branches in the commit DAG - conceptually the same problem, generalized to a DAG), and **taxonomy/org-chart "closest shared manager" queries** in HR and category systems. At scale, the failure mode is **query volume outgrowing O(log n)**: a system serving millions of "closest common category" lookups per second on a static taxonomy will often pay the extra Euler-tour-plus-sparse-table preprocessing to get O(1) queries, since even O(log n) per query adds up under enough QPS.

## Comparison

| Approach                          | Preprocess    | Per-query | Handles k-th ancestor | Handles dynamic tree | Pick it when…                                                        |
| ---------------------------------- | -------------- | ---------- | ----------------------- | ---------------------- | ------------------------------------------------------------------------ |
| **Naive recursive DFS**            | O(1)           | O(n)       | no (separate walk)      | yes (recompute freely) | one-off query, or tree changes between every query                        |
| **Binary lifting**                 | O(n log n)     | **O(log n)** | **yes**, same table   | no (static only)        | many queries on a static tree - the default CP/interview choice           |
| **Euler tour + sparse table (RMQ)**| O(n log n)     | **O(1)**   | no (needs separate table) | no (static only)     | query volume is huge enough that O(log n) itself becomes the bottleneck   |
| **BST ordering walk**              | O(1)           | O(h)       | no                       | yes                     | tree is specifically a BST - use the order property, skip general LCA entirely |

The crossover between naive and binary lifting: at **q ≥ log n** queries on the same tree, the O(n log n) build pays for itself versus q separate O(n) walks (`n log n + q log n < n q` once `q` clears `log n`, ignoring constants). Sparse-table RMQ only wins over binary lifting when the O(log n) query cost itself matters - rare outside very high query volume, since both share the same O(n log n) build.

## Graph/tree assumptions

LCA algorithms assume a **rooted tree** - no cycles, exactly one path between any two nodes, and a designated root that fixes "up" and "depth" unambiguously. This is stricter than the general graph assumptions BFS/DFS tolerate:

- **Rooted, not just connected.** An unrooted tree has no notion of "ancestor" - LCA requires picking a root first (DFS from any node, since a tree has a unique root once you fix a starting point and orient every edge away from it). Re-rooting changes every LCA answer.
- **No cycles.** A tree with `n` nodes has exactly `n-1` edges and a unique path between any two nodes - this uniqueness is exactly what makes "the path goes up through the LCA and back down" well-defined. On a general graph (with cycles), "lowest common ancestor" isn't defined the same way; the DAG generalization (used by `git merge-base`) needs a different algorithm entirely (it can have **multiple** lowest common ancestors).
- **Unweighted, structurally.** LCA itself ignores edge weights - it's a purely structural (depth/ancestor) query. If you need **weighted distance** between nodes, combine LCA with edge-weight prefix sums from root (`dist(u,v) = distFromRoot[u] + distFromRoot[v] - 2*distFromRoot[LCA]`), not the depth formula.
- **Static during the query phase.** Binary lifting and Euler-tour approaches both assume the tree doesn't change between build and query - inserting a node mid-query-batch invalidates the jump table and Euler-tour array, forcing a full rebuild.

## Edge cases

- **u equals v.** LCA(u, u) = u by definition - both loop phases (depth-equalize, binary-search) trivially return immediately since the depth difference is 0 and the nodes are already identical, but explicitly guard for it if a bug elsewhere could pass the same node twice.
- **One node is an ancestor of the other.** E.g. LCA(root, deep_leaf) = root. Depth-equalizing lifts the deeper node all the way up to the shallower one; if they become **equal after the lift** (not just close), the answer is that node itself - the binary-search phase must special-case "already equal, skip it" rather than always doing one final `parent[]` step.
- **k exceeds a node's depth (k-th ancestor).** Querying "50th ancestor" of a node at depth 10 has no answer - return null/sentinel rather than following jump-table entries into undefined territory (`up[node][k]` for an out-of-range `k` may point at a stale/zero entry if not explicitly bounds-checked).
- **Overflow on `log₂(n)` table width.** For `n` up to `10⁵-10⁶`, `LOG = ceil(log2(n)) + 1` (typically 17-21) - allocating `up[node][k]` with too few levels silently truncates long jumps and produces wrong ancestors for deep trees; always compute `LOG` from the actual max depth, not a hardcoded guess.
- **1-vs-0 indexing on depth/root.** Whether the root has `depth = 0` or `depth = 1` must be fixed once and used consistently in both the depth-equalize step and the `dist(u,v)` formula - an off-by-one here silently shifts every distance calculation by 2.
- **Misconception: "many queries still means O(n) each."** A candidate who correctly writes the O(n) recursive LCA sometimes assumes that's the ceiling even when told there are 10⁵ queries on the same static tree - missing that a static tree with repeated queries is exactly the signal to preprocess once (binary lifting) rather than re-derive the answer from scratch every call.

## Implementation

**Pseudocode (CLRS-style contract):**

```
BUILD-LIFTING-TABLE(root, n, LOG)
1   run DFS from root, recording parent[v] and depth[v] for every v
2   for v = 1 to n
3       up[v][0] = parent[v]                    ▷ base case: 2^0 = 1 step up
4   for k = 1 to LOG - 1
5       for v = 1 to n
6           if up[v][k-1] ≠ NIL
7               up[v][k] = up[ up[v][k-1] ][k-1]  ▷ jump 2^(k-1), then another 2^(k-1)
8           else
9               up[v][k] = NIL

LCA(u, v, depth, up, LOG)
1   if depth[u] < depth[v]
2       swap(u, v)                              ▷ ensure u is the deeper node
3   diff = depth[u] - depth[v]
4   for k = 0 to LOG - 1
5       if (diff >> k) AND 1 = 1
6           u = up[u][k]                        ▷ lift u by 2^k where diff has that bit set
7   if u = v
8       return u                                 ▷ v was an ancestor of the original u
9   for k = LOG - 1 downto 0
10      if up[u][k] ≠ NIL AND up[u][k] ≠ up[v][k]
11          u = up[u][k]                        ▷ jump both - safe, still distinct
12          v = up[v][k]
13  return parent[u]                             ▷ one step above where they just met
```

**Python (reference - idiomatic):**

```python
from __future__ import annotations
from collections import deque


class LCA:
    """Binary-lifting LCA over a rooted tree given as an adjacency list."""

    def __init__(self, n: int, adj: list[list[int]], root: int = 0) -> None:
        self.n = n
        self.LOG = max(1, (n).bit_length())          # enough levels to cover any depth < n
        self.up = [[-1] * self.LOG for _ in range(n)]   # -1 = "no such ancestor"
        self.depth = [0] * n
        self._bfs_build(adj, root)
        for k in range(1, self.LOG):
            for v in range(n):
                prev = self.up[v][k - 1]
                self.up[v][k] = self.up[prev][k - 1] if prev != -1 else -1

    def _bfs_build(self, adj: list[list[int]], root: int) -> None:
        """Iterative BFS to fill parent (up[.][0]) and depth - avoids recursion
        depth limits on skewed/deep trees, unlike a naive recursive DFS."""
        visited = [False] * self.n
        visited[root] = True
        q = deque([root])
        while q:
            node = q.popleft()
            for nxt in adj[node]:
                if not visited[nxt]:
                    visited[nxt] = True
                    self.up[nxt][0] = node
                    self.depth[nxt] = self.depth[node] + 1
                    q.append(nxt)

    def query(self, u: int, v: int) -> int:
        if self.depth[u] < self.depth[v]:
            u, v = v, u
        diff = self.depth[u] - self.depth[v]
        for k in range(self.LOG):
            if (diff >> k) & 1:
                u = self.up[u][k]
        if u == v:
            return u
        for k in range(self.LOG - 1, -1, -1):
            if self.up[u][k] != -1 and self.up[u][k] != self.up[v][k]:
                u = self.up[u][k]
                v = self.up[v][k]
        return self.up[u][0]

    def kth_ancestor(self, node: int, k: int) -> int:
        """Bonus query the same table answers for free: k-th ancestor of node."""
        for i in range(self.LOG):
            if node == -1:
                return -1
            if (k >> i) & 1:
                node = self.up[node][i]
        return node
```

**Contest velocity.** Build the `up` table once per tree with the class above; every `query(u, v)` call afterward is O(log n). For a **single** LCA query, skip the class entirely and use the naive recursive version from [Binary Tree](../data-structures/binary-tree.md#5-lowest-common-ancestor--recursive-search) - building a full jump table for one lookup is asymptotic overkill.

## What the interviewer probes for

- **"What if there are thousands of queries on the same tree?"** - This is the trigger for binary lifting: amortize an O(n log n) build across all queries, dropping each query to O(log n) instead of redoing an O(n) walk every time. Name the crossover explicitly: worth it once query count clears roughly `log n`.
- **"Can you get O(1) per query instead of O(log n)?"** - Yes, via Euler tour + sparse table: flatten the tree into a visit-order array, reduce LCA to a range-minimum-query on depths over that array, and a sparse table answers RMQ in O(1) after O(n log n) build. More code for a query-time win; only worth it at very high query volume.
- **"What changes if the tree gets updated between queries?"** - Binary lifting and sparse-table RMQ both assume a static tree; any edge insertion/deletion invalidates the precomputed tables. Falling back to per-query O(n) DFS is the simple fix; fully supporting dynamic updates needs a link-cut tree, well outside typical interview scope - name it, don't implement it live.
- **"How would you find the distance between two nodes?"** - `dist(u, v) = depth[u] + depth[v] - 2 * depth[LCA(u, v)]`: both root-to-node depths, minus twice the shared prefix (the path up to the LCA and back down cancels the ancestor portion counted twice). O(log n) once LCA is fast.

## Practice problems

### 1. Lowest Common Ancestor of a Binary Tree - _recursive one-pass_

**Problem.** Given the root of a binary tree and two nodes `p` and `q` guaranteed to exist in the tree, return their lowest common ancestor. No parent pointers, no depth/ancestor preprocessing assumed.

**Approach.** Single post-order DFS: if the current node is `p`, `q`, or null, return it up. Recurse both children; if **both** sides return non-null, the current node is the split point (found `p` on one side, `q` on the other) - it's the LCA. If only one side is non-null, bubble that answer further up. This is the O(n) single-query baseline every heavier LCA technique optimizes away.

```python
def lowest_common_ancestor(root, p, q):
    if root is None or root is p or root is q:
        return root
    left = lowest_common_ancestor(root.left, p, q)
    right = lowest_common_ancestor(root.right, p, q)
    if left and right:
        return root
    return left or right
```

**Complexity.** O(n) time (visits every node once, worst case), O(h) space (recursion stack).

**Duplicate problems:**
- Lowest Common Ancestor of a Binary Tree III (LC 1650) - identical problem with parent pointers given instead of the root; solved by walking both nodes up to equal depth then together, the two-pointer analogue of binary lifting's depth-equalize step.
- Smallest Common Region (LC 1257) - LCA reframed as a multi-way tree of named regions; same post-order "both sides found something" recognition.

### 2. Lowest Common Ancestor of a Binary Search Tree - _ordering shortcut_

**Problem.** Given the root of a **binary search tree** and two nodes `p` and `q`, return their lowest common ancestor. Both values exist in the tree.

**Approach.** The BST ordering property makes this simpler than the general case: starting at the root, if both `p.val` and `q.val` are less than the current node, the LCA must be in the left subtree; if both are greater, it's in the right subtree; the moment they're **not** on the same side (or one equals the current node), the current node is the split point - stop there. No recursion into both children needed, unlike the general binary-tree version; a single downward walk suffices because ordering tells you which way to go.

```python
def lowest_common_ancestor_bst(root, p, q):
    node = root
    while node:
        if p.val < node.val and q.val < node.val:
            node = node.left
        elif p.val > node.val and q.val > node.val:
            node = node.right
        else:
            return node          # split point, or node is p or q itself
    return None
```

**Complexity.** O(h) time (h = tree height, O(log n) balanced / O(n) skewed), O(1) space (iterative, no recursion stack).

**Duplicate problems:**
- Two Sum IV - Input is a BST (LC 653) - not LCA itself, but the same "use BST ordering to skip the general-tree algorithm" recognition, applied to a different query.

### 3. Kth Ancestor of a Tree Node - _binary lifting_

**Problem.** Design a data structure that, given a rooted tree via parent pointers, answers repeated `getKthAncestor(node, k)` queries - the ancestor `k` steps above `node`, or `-1` if `k` exceeds the node's depth.

**Approach.** Exactly the jump table binary lifting builds for LCA, used directly rather than as a subroutine: precompute `up[node][i]` = ancestor `2^i` steps above `node` in O(n log n), then answer each query by decomposing `k` into its binary representation and following the corresponding jumps, in O(log k) per query. This is the "free" second capability the same table gives you once built for LCA - worth calling out explicitly as the connection.

```python
class TreeAncestor:
    def __init__(self, n: int, parent: list[int]) -> None:
        self.LOG = max(1, n.bit_length())
        self.up = [[-1] * self.LOG for _ in range(n)]
        for node in range(n):
            self.up[node][0] = parent[node]
        for k in range(1, self.LOG):
            for node in range(n):
                prev = self.up[node][k - 1]
                self.up[node][k] = self.up[prev][k - 1] if prev != -1 else -1

    def getKthAncestor(self, node: int, k: int) -> int:
        for i in range(self.LOG):
            if node == -1:
                return -1
            if (k >> i) & 1:
                node = self.up[node][i]
        return node
```

**Complexity.** O(n log n) preprocessing, O(log k) per query. O(n log n) space.

**Duplicate problems:**
- Binary Lifting for LCA (this article's core algorithm) - identical table, different query on top of it: LCA jumps both nodes to equal depth then binary-searches the split; this jumps one node by a fixed k.
