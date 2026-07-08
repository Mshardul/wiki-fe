# B-Plus Tree

## Prerequisites

- [B-Tree](./b-tree.md) [Must read] - B+ tree is a B-tree variant; understand B-tree structure, splits, and merges first.
- [Balanced BST](./balanced-bst.md) [Must read] - context for why disk-aware trees differ from in-memory balanced BSTs.
- [Linked List](./linked-list.md) [Should read] - the leaf layer is a doubly linked list; the range-scan superpower depends on it.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [How it works](#how-it-works)
  - [Internal nodes as pure routers](#internal-nodes-as-pure-routers)
  - [Leaf layer: all values, linked](#leaf-layer-all-values-linked)
  - [Search](#search)
  - [Insert: push copies up, never data](#insert-push-copies-up-never-data)
  - [Delete: borrow or merge](#delete-borrow-or-merge)
- [Operations](#operations)
- [Complexity summary](#complexity-summary)
- [When to use / when not](#when-to-use--when-not)
- [Comparison](#comparison)
- [Variants](#variants)
- [Traversal & invariant](#traversal--invariant)
- [Implementation](#implementation)
- [Gotchas / edge cases](#gotchas--edge-cases)
- [Practice problems](#practice-problems)

## What it is

A **B+ tree** is a B-tree variant where **all values live at the leaves** and internal nodes hold only routing keys - pure separators with no data payloads - so each internal node packs far more keys per page, raising fan-out and cutting tree height, with all leaf nodes linked in a sorted doubly linked list for O(k/m) range scans after a single root-to-leaf descent.

Mental model: **a book's index page pointing into a numbered data section.** The internal nodes are the index: key labels only, nothing else. The leaf layer is the data section: every record in sorted order, linked left-to-right so a range query walks the list without ever climbing back up the tree.

> **Takeaway (say this out loud):** "B+ tree: all data at the leaves, leaves linked in a sorted list - O(log n) to find the start, O(k/m) to scan the range. Every database index is this."

## How it works

A B+ tree of order `m` (minimum degree `t`) has two structurally different node types that are always in play simultaneously:

```
B+ tree order 5 (max 4 keys per node):

            [ 30 | 60 ]                 ← internal node: routing keys only, no data
           /     |      \
     [10|20]   [40|50]  [70|80|90]      ← internal nodes (still just keys)
      / | \     / | \    /  |  | \
  [.] [.] [.]  ...       ...            ← leaf nodes: key+value pairs, all at same depth
   ↔   ↔   ↔   ↔   ↔   ↔   ↔   ↔       ← leaves are linked: → for range scan
```

### Internal nodes as pure routers

Internal nodes store **only keys** (no pointers to actual records). A key `k` in an internal node is a **copy** - the real record lives at a leaf. Because internal nodes carry no data payloads, they are far smaller than B-tree internal nodes and therefore pack far more keys per page, raising the fan-out and cutting the tree height further. A typical B+ tree with 16 KB pages and 8-byte integer keys plus 6-byte child pointers holds ~1000 keys per internal node - a billion records fit in 3 levels.

### Leaf layer: all values, linked

Every key-value pair is stored exactly once: at a leaf. Leaves are linked in a **doubly linked list** in sorted order (right pointer to next leaf, left pointer to previous). A range query `WHERE k BETWEEN a AND b` needs only:

1. One root-to-leaf traversal to find the first leaf containing `a` - `O(log_m n)` I/Os.
2. A horizontal scan along the linked list until `b` is exceeded - `O(k/m)` I/Os for `k` matching records.

No backtracking, no re-traversal of the tree.

### Search

Descend the tree using the routing keys exactly as in a B-tree. At every internal node, binary-search the sorted key list to find the correct child pointer. At the leaf level, binary-search within the leaf for the exact key. If not found, the record does not exist. Total I/Os: `O(log_m n)`.

### Insert: push copies up, never data

1. Descend to the correct leaf.
2. If the leaf has room (fewer than `2t−1` keys), insert in sorted order - done.
3. If the leaf is **full**, split it: the right half stays as a new leaf, the **smallest key of the right half is copied up** into the parent as a routing key (unlike a B-tree, where the median moves up and is gone from the leaves). The original leaf retains the left half.
4. If the parent internal node is full, split it too (the median routing key moves up - internal splits behave exactly like B-tree splits).
5. Splits propagate up; a root split creates a new root.

```
Insert 35 into a full leaf [30|32|34|36] (order 5):

Before:  ... → [30|32|34|36] → ...

Split:   ... → [30|32] → [34|36] → ...      (both leaves stay in linked list)
                           ↑
               34 COPIED up to parent        (34 still exists at the leaf - the B+ tree difference)
```

### Delete: borrow or merge

1. Descend to the leaf, remove the key.
2. If the leaf underflows (fewer than `t−1` keys), try to **borrow** from an immediate sibling first: steal one key (and update the separator in the parent to reflect the new boundary).
3. If no sibling has a spare key, **merge** the underflowing leaf with one sibling: concatenate their keys into one leaf, remove the separator from the parent, update the linked-list pointers.
4. Deleting a key from a leaf **does not** require removing the corresponding routing key from an internal node - the routing key is a copy and can remain as a valid routing label even after deletion. This is the key asymmetry with B-trees.
5. If the parent underflows after a merge, propagate the merge up. Merges cascade at most `h` levels (the tree height).

```
Delete 34 from leaf [34|36] (t=3, min keys = t-1 = 2 → now 1 key → underflow):

Before:  parent [...|34|...]
                      |
         ... → [30|32] → [34|36] → [40|50] → ...

Step 1 - try borrow from left sibling [30|32]: it has 2 keys = t-1 = minimum → can't spare.
Step 2 - try borrow from right sibling [40|50]: it has 2 keys = minimum → can't spare.
Step 3 - merge [36] with left sibling [30|32]:

         merged leaf: [30|32|36]        (linked list re-wired: merged → [40|50])
         separator 34 pulled from parent (parent loses one key; may underflow → propagate)
```

**Borrow vs merge decision:** borrow first (cheaper - no parent key removal); merge only when both siblings are at minimum. Borrow from the left sibling by preference (implementation convention - pick one and stick to it).

## Operations

| Operation       | Time         | Space  | Notes                                              |
| --------------- | ------------ | ------ | -------------------------------------------------- |
| Point search    | O(log_m n)   | O(1)   | Root-to-leaf traversal; m = fan-out (~100s–1000s)  |
| Range scan      | O(log_m n + k/m) | O(1) | k = matching records; leaf-list horizontal walk  |
| Insert          | O(log_m n)   | O(1)   | Leaf split at most; copy pushed up, not moved      |
| Delete          | O(log_m n)   | O(1)   | Routing key may remain after leaf delete           |
| Min/Max         | O(log_m n)   | O(1)   | Leftmost / rightmost leaf; or O(1) if pointer cached |
| Full table scan | O(n/m)       | O(1)   | Walk leaf linked list; bypasses tree entirely      |

## Complexity summary

| Dimension     | Best      | Average      | Worst        |
| ------------- | --------- | ------------ | ------------ |
| Time (search) | O(1) *    | O(log_m n)   | O(log_m n)   |
| Time (range)  | O(1) *    | O(log_m n + k/m) | O(n/m)  |
| Time (insert) | O(1) *    | O(log_m n)   | O(log_m n)   |
| Time (delete) | O(1) *    | O(log_m n)   | O(log_m n)   |
| Space         | O(n)      | O(n)         | O(n)         |

\* "Best" when the root fits in cache or the target is the first leaf.

**Why O(log_m n)?** Each internal node holds between `t−1` and `2t−1` keys, giving a fan-out of at least `t` children. A tree of height `h` contains at most `(2t)^h` leaves and at most `(2t)^h × (2t−1)` keys total. Inverting: `h ≤ log_t(n/2) + 1 = O(log_t n)`. With `m ≈ 2t` (fan-out), `h = O(log_m n)`. Search touches exactly one node per level → O(log_m n) node reads.

**Why insert is O(log_m n) even with splits?** A split divides one full node into two half-full nodes and pushes one key up. Each split costs O(1) work (copy half the keys, update parent). Splits cascade at most `h` levels, so worst-case insert = `h` splits × O(1) each = O(h) = O(log_m n). Crucially, splits never cascade *across* the tree - each level has at most one split per insert.

**Why range scan is O(log_m n + k/m)?** After the O(log_m n) descent to the first leaf, each subsequent leaf holds up to `2t−1 ≈ m` records. Reading `k` records requires ⌈k/m⌉ leaf I/Os - each a sequential read (the linked list is physically adjacent on disk when packed). Total: O(log_m n) to find the entry point + O(k/m) leaf reads.

`m` (fan-out) is typically 100–1000 for disk-based storage, so `log_m n` is 2–4 for billions of records. For in-memory B+ trees (used in some DB buffer managers), `m` is smaller (cache-line-sized) but still >> 2.

**Cache behavior:** internal nodes are small (keys only, no payloads) and permanently hot - in a working database, the top 2–3 levels of a B+ tree total only a few MB (e.g. a 3-level tree with 1000-way fan-out: root = 1 node × 16 KB, level 2 = 1000 nodes × 16 KB = 16 MB) and stay resident in the buffer pool across all queries. Only the final leaf I/O is cold. This is structurally better than a B-tree, where payload data in internal nodes crowds out routing keys, cutting fan-out and pushing more levels out of the buffer pool.

## When to use / when not

**Reach for B+ tree when:**
- The primary workload includes **range queries** (`BETWEEN`, `ORDER BY`, `LIKE 'prefix%'`) - the linked leaf layer makes these O(k/m) after the initial descent.
- **Sequential scans** matter - a full table scan walks the leaf list, never touching the tree.
- Data lives on **disk or SSD** and block I/O is the cost driver - the high fan-out keeps the tree at 3–5 levels even for billions of rows.
- You need **sorted order** as a free property (pagination, `MIN`, `MAX` without aggregate pass).

**Do not reach for B+ tree when:**
- Data fits in RAM and you want fastest in-memory performance - a hash table is O(1) point lookup with lower constant; a red-black tree is O(log n) with better cache behavior at small n.
- You only need point lookups with no range queries - a B-tree (without the linked leaf layer overhead) or a hash index is simpler.
- The key space is dense integers in a small range - a direct-address or counting structure wins.
- You want **single-record equality** with lowest possible latency at high concurrency - hash indexes on SSDs rival B+ tree point-lookup latency below ~10M rows; MySQL's `MEMORY` engine and PostgreSQL's hash indexes are faster for pure equality at that scale. The crossover point where hash wins: equality-only workloads on tables that fit in RAM, where the constant-factor O(1) beats O(log_m n) even though `log_m n ≈ 3`.

**Real-world usage:** MySQL InnoDB, PostgreSQL, SQLite, and virtually every RDBMS use B+ trees for primary and secondary indexes. At scale the bottleneck shifts from tree depth (already 3–4 levels) to two specific failure modes: **(1) latch contention** on the root and upper internal nodes under concurrent writes (mitigation: B-link trees with right-sibling pointers for lock-coupling, or optimistic latching); **(2) hot-spot insert problem** - monotonically increasing PKs (auto-increment, UUID v7, timestamps) always insert into the rightmost leaf, serializing all writers onto one page and causing a throughput cliff at ~10⁵ inserts/sec on a single table. InnoDB's `innodb_autoinc_lock_mode` and UUID v4 (random) PKs are the standard mitigations, at the cost of index fragmentation.

## Comparison

| Structure        | Point search | Range scan      | Insert/Delete | Sorted order | Space | Pick it when…                                                                                          |
| ---------------- | ------------ | --------------- | ------------- | ------------ | ----- | ------------------------------------------------------------------------------------------------------ |
| **B+ Tree**      | O(log_m n)   | O(log_m n + k/m)| O(log_m n)    | Yes (free)   | O(n)  | Disk-based storage + range queries - the default DB index choice                                       |
| B-Tree           | O(log_m n)   | O(log_m n + k) * | O(log_m n)  | Yes          | O(n)  | When point lookup only, or when key+value must be co-located at any level (no range scan needed)       |
| Hash Table       | O(1) avg     | O(n)            | O(1) avg      | No           | O(n)  | Pure equality lookups with no ordering or range requirement; in-memory or hash index on a DB heap table |
| Red-Black Tree   | O(log n)     | O(log n + k)    | O(log n)      | Yes          | O(n)  | In-memory ordered map at small-to-medium n; `std::map`, `TreeMap` - no disk concern                   |
| [Skip List](./skip-list.md) | O(log n) avg | O(log n + k) | O(log n) avg | Yes | O(n) | In-memory ordered structure with simpler concurrent implementation (Redis sorted sets) |

\* B-tree range scan requires backtracking through the tree (no linked leaf list), so k matching records may each cost a separate root-to-node traversal in the worst case.

## Variants

- **B-link tree** - adds a right-sibling pointer to every node (not just leaves). Enables lock-coupling: a thread can release a parent lock before acquiring a child lock, reducing contention under concurrent writes. Used by PostgreSQL's index access method.
- **Clustered B+ tree (index-organized table)** - the actual row data is stored in the leaf nodes, not just the key. The table IS the B+ tree; there is no separate heap file. InnoDB's primary key index is always clustered - a primary key lookup costs one root-to-leaf traversal and the row is right there at the leaf.
- **Unclustered (secondary) B+ tree** - leaves store `(search_key, primary_key)` pairs only; fetching the row requires a second traversal of the clustered index by primary key. A point lookup costs 2 tree traversals (~6–8 I/Os total vs ~3–4 for a clustered lookup). Range scans are worse: each of `k` matching keys may require a separate clustered-index lookup if the rows aren't physically sorted by the secondary key - the "index range scan + heap fetch" pattern that causes InnoDB's "Using index condition" warning in EXPLAIN.
- **Fractal tree index** - buffers updates ("message buffers") inside internal nodes and flushes them downward in batches, converting random leaf writes into sequential I/Os. Writes are O(log² n / B) vs B+ tree's O(log_B n) but with far smaller constant per write; reads are O(log_B n) - same as B+ tree. The tradeoff: lower write amplification at high insert rates, but higher implementation complexity and larger memory footprint per node. Used by TokuDB/PerconaFT; the same principle underlies LSM tree write buffering.

## Traversal & invariant

### The invariants

A B+ tree of minimum degree `t` maintains all of the following simultaneously:

1. **All leaves at the same depth.** Every root-to-leaf path has length exactly `h` (the tree height). Balance is structural, not probabilistic.
2. **All values at leaves.** Internal nodes hold only routing keys - copies of keys that partition child ranges. No satellite data lives above the leaf level.
3. **Leaf linked list.** All leaf nodes form a sorted doubly linked list. Every leaf knows its left and right siblings.
4. **Key counts.** Every non-root node has between `t−1` and `2t−1` keys (equivalently, between `t` and `2t` children for internal nodes). The root has between 1 and `2t−1` keys.
5. **Internal routing invariant.** For an internal node with keys `[k₁, k₂, …, kₙ]` and children `[c₀, c₁, …, cₙ]`: all keys in subtree `cᵢ` satisfy `kᵢ ≤ key < kᵢ₊₁` (left-inclusive by convention). The smallest key of a right-half split is **copied** into the parent, not moved - so it still exists at the leaf.

### Ordering and search correctness

The routing keys partition the key space at each level: descending child `cᵢ` guarantees the target key is in the range `[kᵢ, kᵢ₊₁)`. Because every key-value pair exists exactly once (at a leaf), a search either finds the exact leaf or conclusively determines absence. There is no "check multiple nodes for the same key" scenario.

### Why the copy-up (not move-up) on leaf splits matters

In a B-tree, the median of a full node moves up and disappears from the child. In a B+ tree, the smallest key of the new right leaf is **copied** up - it stays at the leaf (that's where the data lives). Consequence: deleting a key from a leaf never requires updating an internal routing key, even if that key is a routing key. The internal key remains valid as a routing label. This asymmetry simplifies deletion and is the reason B+ trees are structurally cleaner for deletion-heavy workloads than B-trees.

### Height derivation

With `n` records, minimum keys per leaf = `t−1`, so maximum leaves = `⌈n/(t−1)⌉`. Height `h` satisfies `(2t)^(h−1) ≥ ⌈n/(2t−1)⌉` → `h = O(log_t n)`. With `t = 500` (a realistic disk-based fan-out), a trillion records: `h = log₅₀₀(10¹²) ≈ 4`. Four disk reads to find any record in a trillion-row table.

### What breaks if an invariant is violated

Each invariant has a specific failure consequence - knowing these is what separates an implementer from someone who memorized the definition:

| Invariant violated | Symptom |
| --- | --- |
| Leaves not at same depth | Search terminates early or walks off a null pointer; some records unreachable |
| Values above leaf level | Records duplicated (exist at internal node and leaf); delete from leaf leaves a ghost |
| Leaf linked list broken | Range scan terminates early; `range_query(lo, hi)` returns fewer than `k` results silently |
| Key count below `t−1` (underflow) | Routing invariant weakened; future searches may miss keys if a merge is skipped |
| Routing invariant wrong (key in wrong child range) | Search descends into wrong subtree; `search(k)` returns NOT-FOUND for an existing key |

## Implementation

### Pseudocode

```
B+Tree-Search(root, k):
  node ← root
  while node is not a leaf:
    i ← largest index such that node.key[i] ≤ k
    node ← node.child[i]
  ▷ now at leaf
  if k ∈ node.keys:
    return node.value[k]
  else:
    return NOT-FOUND

B+Tree-Range(root, lo, hi):
  leaf ← B+Tree-FindLeaf(root, lo)
  result ← []
  while leaf ≠ NIL and leaf.keys[0] ≤ hi:
    for each key k in leaf with k ≤ hi:
      if k ≥ lo: result.append(leaf.value[k])
    leaf ← leaf.next
  return result

B+Tree-Insert(root, k, v):
  if root is full:
    new_root ← new InternalNode()
    new_root.child[0] ← root
    Split-Child(new_root, 0, root)
    root ← new_root
  Insert-Nonfull(root, k, v)

Insert-Nonfull(node, k, v):
  if node is a leaf:
    insert (k, v) into node.keys/values in sorted position
  else:
    i ← largest index such that node.key[i] ≤ k
    if node.child[i] is full:
      Split-Child(node, i, node.child[i])
      if k > node.key[i]: i ← i + 1
    Insert-Nonfull(node.child[i], k, v)

Split-Child(parent, i, child):
  if child is a leaf:
    new_leaf ← new LeafNode(right half of child.keys/values)
    push_up_key ← new_leaf.keys[0]                    ▷ COPY smallest key of right half up
    child.keys/values ← left half
    new_leaf.next ← child.next
    child.next ← new_leaf
    insert push_up_key into parent at position i+1
    parent.child[i+1] ← new_leaf
  else:
    ▷ internal node split: median moves up (same as B-tree)
    mid ← child.keys[t-1]
    new_node ← new InternalNode(child.keys[t:], child.children[t:])
    child.keys ← child.keys[:t-1]
    child.children ← child.children[:t]
    insert mid into parent at position i+1
    parent.child[i+1] ← new_node

B+Tree-Delete(root, k):
  Delete-From(root, k)
  if root is InternalNode and root.keys is empty:     ▷ root lost its only key after merge
    root ← root.children[0]                           ▷ tree shrinks by one level

Delete-From(node, k):
  if node is a leaf:
    remove k from node.keys/values                    ▷ key may not exist - that's ok
  else:
    i ← index such that node.child[i] is the subtree containing k
    Delete-From(node.child[i], k)
    if node.child[i] underflows:                      ▷ fewer than t-1 keys
      Fix-Underflow(node, i)

Fix-Underflow(parent, i):
  child ← parent.children[i]
  ▷ try borrow from left sibling
  if i > 0 and parent.children[i-1].keys.length > t-1:
    left ← parent.children[i-1]
    if child is a leaf:
      child.keys.prepend(left.keys.pop_last())        ▷ steal rightmost key of left leaf
      child.values.prepend(left.values.pop_last())
      parent.keys[i-1] ← child.keys[0]               ▷ update separator
    else:
      ▷ rotate through parent for internal nodes
      child.keys.prepend(parent.keys[i-1])
      parent.keys[i-1] ← left.keys.pop_last()
      child.children.prepend(left.children.pop_last())
  ▷ try borrow from right sibling
  else if i < len(parent.children)-1 and parent.children[i+1].keys.length > t-1:
    right ← parent.children[i+1]
    if child is a leaf:
      child.keys.append(right.keys.pop_first())
      child.values.append(right.values.pop_first())
      parent.keys[i] ← right.keys[0]                 ▷ update separator to new first key of right
    else:
      child.keys.append(parent.keys[i])
      parent.keys[i] ← right.keys.pop_first()
      child.children.append(right.children.pop_first())
  ▷ merge - neither sibling can spare a key
  else:
    if i > 0: Merge-Leaves(parent, i-1)               ▷ merge child with left sibling
    else:     Merge-Leaves(parent, i)                 ▷ merge child with right sibling

Merge-Leaves(parent, i):
  left ← parent.children[i]
  right ← parent.children[i+1]
  if left is a leaf:
    left.keys.extend(right.keys)
    left.values.extend(right.values)
    left.next ← right.next
  else:
    left.keys.append(parent.keys[i])                  ▷ pull separator down for internal merge
    left.keys.extend(right.keys)
    left.children.extend(right.children)
  remove parent.keys[i] and parent.children[i+1]      ▷ separator gone; right node discarded
```

### Python

```python
from dataclasses import dataclass, field
from typing import Any, Optional, Union

MIN_DEGREE = 3  # t: each node has between t-1 and 2t-1 keys


Node = Union["LeafNode", "InternalNode"]


@dataclass
class LeafNode:
    keys: list[int] = field(default_factory=list)
    values: list[Any] = field(default_factory=list)
    next: Optional["LeafNode"] = None


@dataclass
class InternalNode:
    keys: list[int] = field(default_factory=list)          # routing keys
    children: list[Node] = field(default_factory=list)


class BPlusTree:
    def __init__(self, t: int = MIN_DEGREE) -> None:
        self.t = t
        self.max_keys = 2 * t - 1
        self.root: Node = LeafNode()

    # --- search ---

    def search(self, k: int) -> Optional[Any]:
        leaf = self._find_leaf(k)
        for i, key in enumerate(leaf.keys):
            if key == k:
                return leaf.values[i]
        return None

    def range_query(self, lo: int, hi: int) -> list[tuple[int, Any]]:
        leaf = self._find_leaf(lo)
        result: list[tuple[int, Any]] = []
        while leaf is not None:
            for key, val in zip(leaf.keys, leaf.values):
                if key > hi:
                    return result
                if key >= lo:
                    result.append((key, val))
            leaf = leaf.next
        return result

    def _find_leaf(self, k: int) -> LeafNode:
        node = self.root
        while isinstance(node, InternalNode):
            # find rightmost key <= k; its position + 1 is the child to descend into
            i = 0
            while i < len(node.keys) and k >= node.keys[i]:
                i += 1
            node = node.children[i]
        return node

    # --- insert ---

    def insert(self, k: int, v: Any) -> None:
        if len(self.root.keys) == self.max_keys:
            old_root = self.root
            new_root = InternalNode(children=[old_root])
            self._split_child(new_root, 0, old_root)
            self.root = new_root
        self._insert_nonfull(self.root, k, v)

    def _insert_nonfull(self, node: Node, k: int, v: Any) -> None:
        if isinstance(node, LeafNode):
            idx = 0
            while idx < len(node.keys) and node.keys[idx] < k:
                idx += 1
            node.keys.insert(idx, k)
            node.values.insert(idx, v)
        else:
            # same forward scan as _find_leaf: child idx = number of keys <= k
            idx = 0
            while idx < len(node.keys) and k >= node.keys[idx]:
                idx += 1
            child = node.children[idx]
            if len(child.keys) == self.max_keys:
                self._split_child(node, idx, child)
                if k >= node.keys[idx]:
                    idx += 1
            self._insert_nonfull(node.children[idx], k, v)

    def _split_child(self, parent: InternalNode, idx: int, child: Node) -> None:
        t = self.t
        if isinstance(child, LeafNode):
            # Leaf split: copy up smallest key of right half
            mid = t  # right half starts at index t
            right = LeafNode(
                keys=child.keys[mid:],
                values=child.values[mid:],
                next=child.next,
            )
            child.keys = child.keys[:mid]
            child.values = child.values[:mid]
            child.next = right
            push_up = right.keys[0]  # copy, not move
            parent.keys.insert(idx, push_up)
            parent.children.insert(idx + 1, right)
        else:
            # Internal node split: move up median (same as B-tree)
            mid = t - 1
            right = InternalNode(
                keys=child.keys[mid + 1 :],
                children=child.children[mid + 1 :],
            )
            push_up = child.keys[mid]
            child.keys = child.keys[:mid]
            child.children = child.children[: mid + 1]
            parent.keys.insert(idx, push_up)
            parent.children.insert(idx + 1, right)

    # --- delete ---

    def delete(self, k: int) -> None:
        self._delete_from(self.root, k)
        # if root became empty internal node after a merge, shrink the tree
        if isinstance(self.root, InternalNode) and not self.root.keys:
            self.root = self.root.children[0]

    def _delete_from(self, node: Node, k: int) -> None:
        if isinstance(node, LeafNode):
            if k in node.keys:
                idx = node.keys.index(k)
                node.keys.pop(idx)
                node.values.pop(idx)
            return
        i = 0
        while i < len(node.keys) and k >= node.keys[i]:
            i += 1
        self._delete_from(node.children[i], k)
        if len(node.children[i].keys) < self.t - 1:
            self._fix_underflow(node, i)

    def _fix_underflow(self, parent: InternalNode, i: int) -> None:
        child = parent.children[i]
        t = self.t

        # borrow from left sibling
        if i > 0 and len(parent.children[i - 1].keys) > t - 1:
            left = parent.children[i - 1]
            if isinstance(child, LeafNode):
                child.keys.insert(0, left.keys.pop())
                child.values.insert(0, left.values.pop())
                parent.keys[i - 1] = child.keys[0]      # new separator = new first key of child
            else:
                child.keys.insert(0, parent.keys[i - 1])
                parent.keys[i - 1] = left.keys.pop()
                child.children.insert(0, left.children.pop())
            return

        # borrow from right sibling
        if i < len(parent.children) - 1 and len(parent.children[i + 1].keys) > t - 1:
            right = parent.children[i + 1]
            if isinstance(child, LeafNode):
                child.keys.append(right.keys.pop(0))
                child.values.append(right.values.pop(0))
                parent.keys[i] = right.keys[0]          # separator = new first key of right
            else:
                child.keys.append(parent.keys[i])
                parent.keys[i] = right.keys.pop(0)
                child.children.append(right.children.pop(0))
            return

        # merge - no sibling can spare a key
        if i > 0:
            self._merge(parent, i - 1)   # merge child into left sibling
        else:
            self._merge(parent, i)       # merge right sibling into child

    def _merge(self, parent: InternalNode, i: int) -> None:
        left = parent.children[i]
        right = parent.children[i + 1]
        if isinstance(left, LeafNode):
            left.keys.extend(right.keys)
            left.values.extend(right.values)
            left.next = right.next
        else:
            left.keys.append(parent.keys[i])   # pull separator down
            left.keys.extend(right.keys)
            left.children.extend(right.children)
        parent.keys.pop(i)
        parent.children.pop(i + 1)
```

## Gotchas / edge cases

**1. Leaf split copies up, internal split moves up - different behavior.** On a leaf split, the smallest key of the right leaf is *copied* into the parent; that key still exists at the leaf with its value. On an internal node split, the median key *moves* into the parent and is gone from the child. Mixing these up in an implementation corrupts the tree: if you accidentally move a key out of a leaf, you lose the record. Test: insert then immediately search for the exact key that triggered a split.

**2. Routing key retained after leaf deletion.** Deleting a key from a leaf does not require updating the parent's routing key, even if that routing key equals the deleted key. The routing key is a separator, not a promise that the key exists. Beginners delete from the parent unnecessarily - this is both wrong and expensive. Only update a routing key if a leaf merge changes the boundary so much that the separator misleads future searches (rare and implementation-specific).

**3. Range scan boundary conditions.** In `range_query(lo, hi)`, finding the starting leaf by searching for `lo` works even if `lo` is not in the tree - you land at the leaf where `lo` *would* be inserted, then scan forward. The off-by-one: make sure you include `lo` itself if present (`key >= lo`, not `key > lo`), and stop *after* you exceed `hi` (`key > hi`), not at `key == hi`.

**4. Duplicate keys - the silent corruption trap.** Standard B+ tree implementations assume unique keys. For non-unique secondary indexes, the two correct approaches are: **(a)** store a list of row IDs per leaf key (one key → `[rowid1, rowid2, …]`), or **(b)** make the key composite by appending the primary key as a tiebreaker (`(search_key, pk)` is always unique). Approach (b) is what InnoDB does. The trap: if you naively allow duplicate keys with a simple insert, the routing invariant breaks - two leaves can both "own" the same key value, and a search terminates at the first one, silently missing records in the second. Test: insert 3 identical keys, then count results of an equality search - it must return 3.

**5. Concurrent write contention on upper levels.** The top 2–3 internal levels are hot under concurrent writes. A naive global tree lock is a throughput bottleneck. Production systems use **lock coupling** (acquire child lock before releasing parent lock) or **optimistic latching** (validate no split happened after descending). For interviews: know that B+ tree concurrency is non-trivial and that B-link trees solve part of it by adding right-sibling pointers.

**6. At-scale: write amplification.** Every insert that splits a leaf writes a new leaf node and updates the parent - even for a single-key insert. At `10⁷` inserts/sec on HDDs, split cascades cause bursts of random writes. SSDs mitigate this (faster random writes), but at very high insert rates, log-structured merge trees (LSM trees, as in RocksDB/LevelDB) outperform B+ trees on write throughput by converting random writes to sequential. The tradeoff: LSM read amplification vs B+ tree write amplification.

## Practice problems

### 1. Range query on a sorted structure

**Problem:** Given a sorted list of integers and a query `[lo, hi]`, return all integers in that range. The list may have millions of entries and must support both point lookups and range queries efficiently. Assume a B+ tree backed structure is available. Constraints: `1 ≤ n ≤ 10⁷`, `10⁵` queries.

**Approach:** Build a B+ tree over the integers (key = value). For each query, `_find_leaf(lo)` descends the tree in `O(log_m n)`, then `range_query` walks the linked leaf list until exceeding `hi` in `O(k/m)`. Total per query: `O(log_m n + k/m)`. This directly exercises the linked-leaf superpower: a B-tree without the leaf list would require a separate root-to-leaf descent per matching record.

```python
def solve(nums: list[int], queries: list[tuple[int, int]]) -> list[list[int]]:
    tree = BPlusTree(t=3)
    for n in nums:
        tree.insert(n, n)   # key = value for this problem

    results = []
    for lo, hi in queries:
        pairs = tree.range_query(lo, hi)   # O(log_m n + k/m)
        results.append([v for _, v in pairs])
    return results
```

**Complexity:** O(n log_m n) build, O(log_m n + k/m) per query, O(n) space.

**Duplicate problems:**
- Count of numbers in a range (LC 2250) - same bisect-left/right pattern; count instead of slice.
- Find first and last position of element in sorted array (LC 34) - boundary search is exactly leaf-descent + boundary walk.
- Kth smallest element in sorted matrix (LC 378) - range-scan intuition extends to 2D; same O(log n) entry-point idea.

---

### 2. Design an index for a database column

**Problem:** You are asked to choose a data structure to index a `timestamp` column in a database table with 500 million rows. The workload is 70% range queries (`WHERE ts BETWEEN a AND b`), 20% point lookups, and 10% inserts. Explain your choice and the key structural properties that make it efficient.

**Approach:** B+ tree is the correct choice. The linked leaf layer makes range scans `O(log n + k/m)` - after a single root-to-leaf descent, the result is a sequential walk along the leaf list, which is friendly to disk prefetching. Point lookups are `O(log n)` - same as a B-tree. The high fan-out (`m ~ 500` for a 16KB page) keeps height at 3–4 for 500M rows, so even point lookups cost ≤ 4 I/Os. A hash index is eliminated by the range workload. A B-tree (no leaf links) would re-traverse the tree per record on range scans, costing `O(k log n)` instead of `O(log n + k/m)`.

```python
from dataclasses import dataclass

@dataclass
class Workload:
    range_pct: int    # % range queries
    point_pct: int    # % point lookups
    insert_pct: int   # % inserts
    rows: int         # table size
    fits_in_ram: bool

def choose_index(w: Workload) -> str:
    if w.range_pct > 0:
        # Hash index: O(n) range scan - eliminated immediately
        # B-tree: no leaf links → O(k log_m n) range scan - inferior
        # B+ tree: O(log_m n + k/m) - wins on any range workload
        return "B+ tree (clustered on timestamp)"
    if w.fits_in_ram and w.point_pct == 100:
        # O(1) hash beats O(log_m n) when log_m n ≈ 3 and RAM eliminates I/O cost
        return "Hash index"
    return "B+ tree"  # default: sorted order, pagination, future range queries

# This workload: range_pct=70 → B+ tree immediately
print(choose_index(Workload(range_pct=70, point_pct=20, insert_pct=10,
                            rows=500_000_000, fits_in_ram=False)))
# → "B+ tree (clustered on timestamp)"
```

**Complexity:** B+ tree point lookup O(log_m n), range scan O(log_m n + k/m). With m=500 and n=5×10⁸: height ≈ 5, so ≤5 I/Os per point lookup.

**Duplicate problems:**
- Design a key-value store with range queries (system design) - same reasoning, B+ tree at storage layer.
- Implement a time series range query (LC 732 "My Calendar III" extended) - interval overlap is a range-scan variant.

---

### 3. Count of smaller numbers after self

**Problem (LC 315):** Given an integer array `nums`, return an array `counts` where `counts[i]` is the number of elements to the right of `nums[i]` that are smaller than `nums[i]`. Constraints: `1 ≤ n ≤ 10⁵`, `-10⁴ ≤ nums[i] ≤ 10⁴`.

**Approach:** Process from right to left, maintaining a sorted structure. Use a Fenwick tree (or sorted list with bisect) as a proxy for a B+ tree leaf layer: each key maps to a count of times seen. For each `nums[i]`, query "how many keys < nums[i] have been inserted?" (a prefix-sum range query), then insert `nums[i]`. This is a range-query-then-insert pattern - exactly what a B+ tree's linked leaf layer supports, here simulated with coordinate compression + prefix sums.

```python
from sortedcontainers import SortedList

def count_smaller(nums: list[int]) -> list[int]:
    sl = SortedList()
    result = []
    for n in reversed(nums):
        # bisect_left = index of first element >= n = count of elements < n
        result.append(sl.bisect_left(n))
        sl.add(n)
    return result[::-1]
```

**Complexity:** O(n log n) time (SortedList insert + bisect, each O(log n)), O(n) space.

**Duplicate problems:**
- Number of inversions (merge sort variant) - same "count smaller to the right" semantics.
- Count of range sum (LC 327) - range sum ∈ [lower, upper]: prefix sums + sorted structure range query.
- Reverse pairs (LC 493) - count pairs `(i,j)` where `i<j` and `nums[i] > 2*nums[j]`; same right-to-left sorted-structure pattern.
