# Data Structure Selection Cheatsheet

Which structure to reach for, given the operations you need fast.

> 📖 Full articles:
> [Array](../data-structures/array.md) · [Dynamic Array](../data-structures/dynamic-array.md) · [Circular Buffer](../data-structures/circular-buffer.md) · [Heap](../data-structures/heap.md) · [String](../data-structures/string.md) · [Linked List](../data-structures/linked-list.md) · [Stack](../data-structures/stack.md) · [Queue](../data-structures/queue.md) · [Deque](../data-structures/deque.md) · [Hash Table](../data-structures/hash-table.md) · [LRU Cache](../data-structures/lru-cache.md) · [LFU Cache](../data-structures/lfu-cache.md) · [Binary Tree](../data-structures/binary-tree.md) · [Binary Search Tree](../data-structures/binary-search-tree.md) · [Trie](../data-structures/trie.md) · [Balanced BST](../data-structures/balanced-bst.md) · [Skip List](../data-structures/skip-list.md) · [AVL Tree](../data-structures/avl-tree.md) · [Red-Black Tree](../data-structures/red-black-tree.md) · [B-Tree](../data-structures/b-tree.md) · [Fenwick Tree](../data-structures/fenwick-tree.md) · [Union-Find](../data-structures/union-find.md) · [Graph](../data-structures/graph.md) · [Bloom Filter](../data-structures/bloom-filter.md) · [B+ Tree](../data-structures/b-plus-tree.md) · [Interval Tree](../data-structures/interval-tree.md) · [Suffix Tree](../data-structures/suffix-tree.md)

## Comparison

| Structure | Access/Search | Insert | Delete | Peek min/max | Use when |
| --- | --- | --- | --- | --- | --- |
| Array (fixed) | O(1) index / O(n) search | O(n) | O(n) | - | random access, cache-tight iteration |
| Dynamic Array | O(1) index / O(n) search | O(1) amortized end, O(n) mid | O(n) mid, O(1) end | - | default growable sequence |
| Circular Buffer | O(1) peek / O(n) search | O(1) fixed cap | O(1) | O(1) front | fixed-capacity FIFO, no resize spikes |
| Linked List (doubly) | O(n) | O(1) at held node | O(1) at held node | - | O(1) splice, no resize spikes |
| Stack | - | O(1) top | O(1) top | O(1) top | nesting, matching, undo, DFS |
| Queue | O(n) | O(1) back | O(1) front | O(1) front | arrival order, BFS, buffering |
| Deque | O(n) | O(1) both ends | O(1) both ends | O(1) both ends | sliding window, both-end push/pop |
| String (immutable) | O(1) index | O(n²) via repeated `+=` | - | - | scanning fixed text |
| Hash Table | O(1) avg by key | O(1) avg | O(1) avg | - | key→value lookup, counting, dedup |
| Heap | O(n) search | O(log n) | O(log n) extreme | **O(1)** | repeated min/max, priority queue, top-K |
| LRU Cache | O(1) | O(1) | O(1) evict | LRU O(1) | fixed-capacity cache, evict least-recent |
| LFU Cache | O(1) | O(1) | O(1) evict | LFU O(1) | fixed-capacity cache, evict least-frequent |
| Binary Tree (plain) | O(n) | O(1) at spot | O(n) find+unlink | - | hierarchy base, not perf-critical |
| Binary Search Tree | O(log n) balanced, O(n) skewed | O(log n) / O(n) | O(log n) / O(n) | O(log n) | ordered keys, unguaranteed balance |
| Balanced BST (generic) | O(log n) | O(log n) | O(log n) | O(log n) | ordered map, frequent insert + range |
| AVL Tree | O(log n), tightest height | O(log n), more rotations | O(log n) | O(log n) | read-heavy, lookup-optimized |
| Red-Black Tree | O(log n) | O(log n), fewer rotations | O(log n) | O(log n) | general ordered map, write-heavy (lib default) |
| Skip List | O(log n) expected | O(log n) expected | O(log n) expected | - | concurrent ordered structure, no rotations |
| Trie | O(L) exact, O(p) prefix | O(L) | O(L) | - | prefix queries, autocomplete |
| Fenwick Tree (BIT) | O(log n) prefix/range sum | O(log n) point update | O(log n) point update | not supported | range-sum queries with point updates |
| Union-Find (DSU) | O(α(n)) connected? | O(α(n)) union | not supported | - | dynamic connectivity, MST, cycle detection |
| Graph (adjacency list) | O(deg) neighbor iter | O(1) add edge | O(deg) remove edge | - | sparse graphs, traversal, shortest path |
| Bloom Filter | O(k), false-positives possible | O(k) | not supported | - | huge n, tight memory, false positives OK |
| B-Tree | O(log_m n), few disk seeks | O(log_m n) | O(log_m n) | O(log_m n) | on-disk/DB index |
| B+ Tree | O(log_m n) point, O(log_m n + k/m) range | O(log_m n) | O(log_m n) | leftmost leaf O(log_m n) | disk storage + range scans (default DB index) |
| Interval Tree | O(log n) one overlap, O(log n + k) all | O(log n) | O(log n) | - | dynamic intervals, repeated overlap queries |
| Suffix Tree / Suffix Array | O(m) tree / O(m log n) array pattern query | O(n) tree / O(n log² n) array build, static | - | - | multi-query text search, CP string tasks |

## Gotchas

- ⚠️ Heap gives O(1) peek-extreme but O(n) search - don't reach for a heap when you need "does X exist?", that's a hash table or BST.
- ⚠️ BST is O(log n) only when balanced - a plain BST degrades to O(n) on sorted/adversarial input; use a balanced variant (AVL/Red-Black) when balance isn't guaranteed by construction.
- ⚠️ Union-Find answers "connected?" and "merge" in near-O(1), but can't delete/split a union or list members - use graph traversal when you need those.
