# BFS

## Prerequisites

[Queue](../data-structures/queue.md) [Must read] - BFS uses a queue as its frontier; understanding FIFO ordering is essential
[Graph](../data-structures/graph.md) [Must read] - adjacency list vs matrix representation shapes BFS performance

## Table of Contents

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

## What it is

BFS explores a graph level by level using a queue - it finds the shortest path in unweighted graphs because it visits all nodes at distance k before any node at distance k+1.

Time: **O(V + E)**. Space: **O(V)** for the visited set and queue frontier.

> **Soundbite:** BFS is a flooding algorithm - it spreads outward one ring at a time, so the first time it reaches a node, it's guaranteed to have taken the shortest route.

## Intuition

The key insight is that a queue enforces **distance ordering for free**. When you enqueue all neighbors of a node at distance d, those neighbors are at distance d+1. Because a queue is FIFO, you will finish processing every node at distance d before you touch any node at distance d+1 - no extra bookkeeping required.

Think of dropping a stone in still water: rings ripple outward, each ring one hop farther than the last. The queue is the wavefront. Every node dequeued at a given step sits on the same ring; every node enqueued in that step sits on the next ring. This is why BFS finds the **shortest path** in unweighted graphs: the path you used to reach a node for the first time is always the path from the outermost completed ring to the current ring - exactly d edges.

Contrast with DFS: DFS uses a stack (or recursion) which reverses the order - it dives deep before widening, so the first path it finds to a node is not necessarily the shortest.

## How it works

**Step-by-step trace** on an unweighted directed graph with 7 nodes:

```
Graph edges: 0→1, 0→2, 1→3, 1→4, 2→5, 4→6
Source: 0
```

```
     0
    / \
   1   2
  / \   \
 3   4   5
      \
       6
```

| Step | Dequeue | Enqueue    | Queue after      | Visited           | dist[]         |
|------|---------|------------|------------------|-------------------|----------------|
| init | -       | 0          | [0]              | {0}               | 0:0            |
| 1    | 0       | 1, 2       | [1, 2]           | {0,1,2}           | 1:1, 2:1       |
| 2    | 1       | 3, 4       | [2, 3, 4]        | {0,1,2,3,4}       | 3:2, 4:2       |
| 3    | 2       | 5          | [3, 4, 5]        | {0,1,2,3,4,5}     | 5:2            |
| 4    | 3       | (none)     | [4, 5]           | {0,1,2,3,4,5}     |                |
| 5    | 4       | 6          | [5, 6]           | {0,1,2,3,4,5,6}   | 6:3            |
| 6    | 5       | (none)     | [6]              | {0,1,2,3,4,5,6}   |                |
| 7    | 6       | (none)     | []               | {0,1,2,3,4,5,6}   |                |

Notice that all distance-1 nodes (1, 2) are dequeued before any distance-2 node (3, 4, 5). Node 6 at distance 3 is the last node reached. The queue always holds a contiguous window of distances - either [d] nodes only, or a mix of [d, d+1] nodes during the transition between levels.

**Queue state at each transition:**

```
Level 0: Queue=[0]
         dequeue 0, enqueue neighbors 1,2
Level 1: Queue=[1,2]
         dequeue 1, enqueue 3,4; dequeue 2, enqueue 5
Level 2: Queue=[3,4,5]
         dequeue 3 (no new); dequeue 4, enqueue 6; dequeue 5 (no new)
Level 3: Queue=[6]
         dequeue 6 (no new) → done
```

## Correctness / invariant

**Invariant:** At the start of each iteration, every node in the queue is at distance exactly d or d+1 from the source; all nodes at distance < d are already finalized (visited and will not be re-enqueued).

**Proof sketch:**
- *Base case:* After enqueuing the source, the queue contains exactly {source} at distance 0. The invariant holds trivially.
- *Inductive step:* Suppose the invariant holds with the queue containing nodes at distance d or d+1. When we dequeue a node u at distance d and enqueue its unvisited neighbors, those neighbors are at distance d+1. We mark them visited immediately on enqueue. Once all d-nodes are dequeued, the queue contains only d+1 nodes, and we begin processing the next level. The invariant is maintained.
- *Termination:* Each node is enqueued at most once (the visited check prevents re-enqueue). The graph is finite, so the queue empties.
- *Optimality:* When node v is first reached, it is reachable in dist[v] hops. Any alternative path to v must also pass through the frontier; since the frontier progresses monotonically, any later path has length ≥ dist[v]. Therefore the first path found is shortest.

**The critical mark-on-enqueue rule:** Mark a node visited *when you enqueue it*, not when you dequeue it. If you mark on dequeue, the same node can be enqueued multiple times from different neighbors before it is processed, causing O(E) enqueues instead of O(V) and potentially incorrect distance assignments.

## Complexity derivation

**Time: O(V + E)**

Every vertex is enqueued exactly once (the visited check prevents re-enqueue). That accounts for O(V) enqueue + dequeue operations.

Every edge (u, v) is examined exactly once from u's perspective - when u is dequeued, we scan all edges leaving u. In a directed graph, each edge is scanned once; in an undirected graph, edge (u, v) is examined from both u and v, but the neighbor v is only enqueued once (visited check stops the second attempt). Total edge scans: O(E).

Combined: **O(V + E)**.

For dense graphs where E = O(V²), this is O(V²). For sparse graphs (trees, road networks) where E = O(V), this is O(V).

**Space: O(V)**

- The visited set holds at most V entries: O(V).
- The queue holds at most one level of the BFS tree at a time. In the worst case (a star graph - one center connected to all other nodes), the entire frontier is enqueued in one step: O(V) entries.
- The distance array (if tracking distances) is O(V).
- The parent/predecessor array (if tracking paths) is O(V).

Total auxiliary space: **O(V)**.

> **Cache behavior (U18):** BFS on an adjacency list is cache-hostile at large n. Each dequeue accesses an arbitrary node's neighbor list - pointer-chasing through scattered heap allocations. At n > 10⁶, this means a cache miss per neighbor lookup. In contrast, BFS on a matrix (grid problems) is cache-friendly: the 2D array is laid out contiguously, and neighbor accesses (±row, ±col) are within a few cache lines. For graph BFS at scale, CSR (Compressed Sparse Row) format improves cache behavior by packing neighbor lists contiguously in memory.

## Constraints & approach

| Input size          | Expected complexity    | Use BFS? | Notes                                                                       |
|---------------------|------------------------|----------|-----------------------------------------------------------------------------|
| n, m ≤ 10⁵         | O(V + E)               | Yes      | Classic BFS; adjacency list representation mandatory                        |
| Grid m×n ≤ 10⁶     | O(m·n)                 | Yes      | Treat each cell as a node; 4-directional neighbors; visited = 2D boolean   |
| n ≤ 500, dense     | O(V²) via matrix       | Yes      | Adjacency matrix fine at this scale; BFS unchanged                          |
| Weighted edges      | O((V+E) log V)         | No       | BFS gives wrong shortest path; use Dijkstra (non-neg) or Bellman-Ford      |
| Negative weights    | O(V·E)                 | No       | Use Bellman-Ford; Dijkstra also fails                                       |
| n > 10⁸ (implicit) | Problem-specific       | Careful  | Queue holds O(V) nodes; at 10⁸ nodes that's gigabytes of memory - bidirectional BFS or A* needed |
| Word/state ladders  | O(V + E) implicit graph | Yes     | BFS on implicit graphs: generate neighbors on-the-fly; visited = hash set  |
| Layered/level questions | O(V + E)           | Yes      | "Minimum steps", "minimum turns", "shortest transformation" → BFS signal   |

**What rules BFS out:**
- Weighted edges (use Dijkstra/Bellman-Ford)
- Memory constraints on very large sparse graphs (bidirectional BFS halves the frontier, cutting memory O(V) → O(√V) in the best case)
- Cycle detection only, no shortest path needed (DFS is simpler and uses O(log V) stack space vs O(V) queue)

## When to use / when not

**Reach for BFS when:**

- You need the **shortest path** in an **unweighted** graph or grid - this is BFS's defining use case. Any time the problem says "minimum hops", "minimum steps", or "minimum turns" and all edge weights are 1, BFS is the default.
- You need **level-order processing** - BFS naturally groups nodes by distance from the source. Binary tree level-order traversal, "nodes at depth k", "flood fill by layers" all fall here.
- You need to find if a path exists between two nodes and the graph is sparse-to-moderate (connected component detection).
- You want to explore an **implicit graph** whose nodes are generated on the fly - word ladders, sliding puzzles, game states - BFS finds the shortest sequence.

**Do not use BFS when:**

- Edges have **different weights** → Dijkstra (non-negative weights) or Bellman-Ford (negative weights allowed).
- You need **topological order** → topological sort (DFS-based or Kahn's BFS-based; if using BFS, it's Kahn's specifically).
- You need to detect **back edges** or determine **articulation points** - DFS provides discovery/finish times that BFS does not.
- Memory is the bottleneck on a huge graph - DFS uses O(depth) stack space, which is O(log V) on balanced graphs; BFS uses O(V) queue space. When the source and destination are both known, **bidirectional BFS** cuts the frontier: run BFS from both ends simultaneously, stopping when the frontiers meet. The search radius halves from d to d/2, shrinking the explored set from O(b^d) to O(2·b^(d/2)) where b is the branching factor - a square-root reduction. Implementation: maintain two visited sets and two queues; at each step expand whichever frontier is smaller; stop when a node appears in both visited sets.
- The **solution is deep** in the tree and the **branching factor is large** - a BFS queue can consume enormous memory before reaching the answer (use iterative deepening DFS or A* instead).

**Real-world usage:** BFS is the backbone of network routing protocols (finding shortest hops in a network topology), web crawlers (crawl pages level by level from a seed URL), and social graph queries ("find all friends within 2 degrees of separation" - LinkedIn's People You May Know is a BFS on the social graph). At scale, a naive BFS on the Facebook social graph (3×10⁹ nodes) would require terabytes of memory for the queue - production systems use approximate BFS (sampling, partitioned BFS across shards) rather than exact traversal.

See also: [Tree/Graph Traversal pattern](../patterns/tree-graph-traversal.md) for recognition signals and the reusable BFS skeleton in contest contexts, and [Matrix Traversal pattern](../patterns/matrix-traversal.md) for grid-specific BFS application.

## Comparison

| Algorithm       | Time              | Space      | Edge weights?     | Shortest path? | Key constraint / use case                          | Pick it when…                                                                                 |
|-----------------|-------------------|------------|-------------------|----------------|----------------------------------------------------|-----------------------------------------------------------------------------------------------|
| BFS             | O(V + E)          | O(V)       | Unweighted (=1)   | Yes            | Level-by-level; all edge costs equal               | All edges cost 1 (or 0/1 with deque variant) and you need minimum hops                       |
| DFS             | O(V + E)          | O(depth)   | Unweighted        | No             | Topological sort, cycle detect, back edges         | Shortest path is irrelevant; graph is deep-and-narrow so BFS queue would blow up in memory   |
| Dijkstra        | O((V+E) log V)    | O(V)       | Non-negative      | Yes            | Weighted shortest path; uses a min-heap            | Edge weights differ and are all ≥ 0 - the log V overhead only beats BFS once weights vary    |
| Bellman-Ford    | O(V·E)            | O(V)       | Any (incl. neg.)  | Yes            | Negative weights; detects negative cycles          | Graph has negative-weight edges or you must detect negative cycles; accept O(VE) cost        |
| A*              | O(E) best-case    | O(V)       | Non-negative      | Yes (w/ admissible h) | Heuristic-guided; faster in practice on grids | You have a good distance heuristic (grid, map) and the graph is too large for blind BFS/Dijkstra |

**When BFS beats Dijkstra:** When all edge weights are 1, BFS runs in O(V+E) vs Dijkstra's O((V+E) log V). Dijkstra uses a priority queue that has O(log V) overhead per operation; BFS uses a plain FIFO queue with O(1) operations. For unweighted graphs, never use Dijkstra - it is always slower by a log factor.

**When DFS beats BFS:** For pure reachability (is there any path?), DFS uses O(depth) stack space vs BFS's O(width) queue space. On a balanced binary tree, both are O(log n). But on a "broom" graph (long chain with a wide fan at the end), DFS uses O(n) stack but BFS would use O(1) until the fan - BFS explodes at the fan while DFS stays lean. Conversely, on a wide star graph, BFS uses O(n) in one level while DFS traverses linearly with O(1) stack depth at each step.

For more details on DFS, see [Depth-First Search (DFS)](./dfs.md). For weighted shortest paths, see [Dijkstra's algorithm](./dijkstra.md).

## Graph/tree assumptions

**Visited state**

BFS requires a visited (or "enqueued") set to avoid infinite loops. The semantics matter:

- **Mark on enqueue, not dequeue.** If you mark a node visited when you dequeue it, the same node can be enqueued multiple times by different neighbors before being processed. In the worst case on a dense graph, this bloats the queue to O(E) entries and produces incorrect distances. The invariant breaks: the first dequeue of a node is not necessarily from the shortest path.
- **Representation:** For graphs with integer node IDs ≤ 10⁵, a boolean array is fastest (O(1) lookup, cache-friendly). For implicit graphs (word ladders, puzzle states), use a hash set. For grids, a 2D boolean array or in-place mutation of the grid (mark visited with a sentinel value) works.

**Directed vs undirected**

- **Undirected graphs:** When you process node u and see neighbor v, you would ordinarily enqueue v and then later process v and see u as a "neighbor" again. The visited check prevents re-enqueueing u, so this is handled automatically. Do not add a special reverse-edge filter.
- **Directed graphs:** Only follow edges in their directed direction. BFS from source s finds all nodes reachable from s - but nodes that have paths *to* s but not *from* s will not be discovered. If you need reachability in both directions (e.g. finding nodes in the same strongly connected component), you need a second BFS on the reversed graph or Kosaraju's algorithm.

**Weighted edges**

BFS computes shortest path only when all edge weights are equal (typically 1). If edges have non-uniform weights, BFS will compute shortest hop count, not shortest distance. For **0-1 graphs** (edges are either weight 0 or weight 1), use a **deque-based BFS (0-1 BFS)**: prepend weight-0 edges to the front of the deque, append weight-1 edges to the back. This gives O(V+E) shortest path for 0-1 weighted graphs - cheaper than Dijkstra's O((V+E) log V). See [Deque](../data-structures/deque.md) for the data structure underlying 0-1 BFS.

**Queue vs stack vs priority queue**

| Frontier structure | Algorithm it gives you       | Shortest path? |
|--------------------|------------------------------|----------------|
| Queue (FIFO)       | BFS                          | Yes (unweighted) |
| Stack (LIFO)       | DFS (iterative)              | No             |
| Deque (0-1 BFS)    | BFS for 0/1-weight graphs    | Yes (0-1 weights) |
| Min-heap (PQ)      | Dijkstra                     | Yes (non-neg weights) |

The data structure determines the traversal order and therefore what optimality guarantee you get. Swapping a queue for a stack turns BFS into DFS with the same code skeleton - a useful mental model, and a common interview follow-up.

**Multi-source BFS**

When you need shortest distance from any of multiple sources simultaneously (e.g. "distance to nearest 0 in a matrix"), initialize the queue with all sources at distance 0 and run BFS normally. This is correct because the first time BFS reaches any cell, it reaches it from the nearest source. Single-source BFS is a special case of multi-source BFS with |sources| = 1.

**Trees vs graphs**

On trees, there are no cycles, so the visited check is optional (you can pass `parent` to skip the edge back to the parent). BFS on a tree gives level-order traversal. On graphs, the visited check is mandatory - without it, BFS on a cycle runs forever.

## Edge cases

**1. Disconnected graph**

If the graph is disconnected and you only run BFS from one source, nodes in other components are never reached. Fix: loop over all nodes and start a new BFS from any unvisited node.

```
for each node u in G:
    if u not in visited:
        BFS(G, u)   ▷ starts a new component traversal
```

**2. Single node, no edges**

The queue starts with just the source, which is immediately dequeued with no neighbors to process. The algorithm terminates correctly after one dequeue. Distance to source is 0.

**3. Cycles**

Cycles are handled by the visited check. The first time a node is reached, it is marked visited. Later edges pointing to it from other nodes find it already visited and do not enqueue it again. Without the visited check, BFS on a cycle loops forever.

**4. The mark-on-dequeue bug (classic off-by-one)**

This is the most common BFS implementation error in interviews and CP submissions. If you mark a node visited when you *dequeue* it (instead of when you *enqueue* it):

```python
# WRONG - mark on dequeue
while queue:
    u = queue.popleft()
    visited.add(u)          # ← bug: too late
    for v in adj[u]:
        if v not in visited:
            queue.append(v) # same node can be appended multiple times
```

On a dense graph, the queue can grow to O(E) entries instead of O(V). More critically, on a grid, a cell can be enqueued from 4 directions before any of them is dequeued - the cell's distance is set 4 times, 3 of which are wrong. Always mark on enqueue:

```python
# CORRECT - mark on enqueue
visited.add(source)
queue.append(source)
while queue:
    u = queue.popleft()
    for v in adj[u]:
        if v not in visited:
            visited.add(v)   # ← mark here
            queue.append(v)
```

**5. Implicit graphs and infinite state spaces**

BFS on game states (sliding puzzle, word ladder) operates on an implicit graph where neighbors are computed on-the-fly. The visited set must use a hash set (not an array) since node IDs are strings or tuples. Crucially, the state space can be astronomically large - always verify that the problem guarantees a finite number of reachable states, or use iterative deepening DFS to avoid memory exhaustion.

**6. CP-flavored trap: using a list instead of deque**

In Python, `list.pop(0)` is O(n) because it shifts all elements. BFS with a list frontier has O(V²) time instead of O(V+E) - it looks correct but TLEs on large inputs. Always use `collections.deque` with `popleft()`.

**7. Grid BFS boundary checks**

A common off-by-one: when checking `0 <= nr < rows and 0 <= nc < cols`, note the order of the bounds. Some implementations use `rows` vs `len(grid)` inconsistently. Cache `rows = len(grid); cols = len(grid[0])` once at the start.

## Implementation

### Pseudocode (CLRS-style)

```
BFS(G, s)
  ▷ Initialize all vertices
  for each vertex u ∈ G.V - {s}
      color[u] ← WHITE
      dist[u]  ← ∞
      parent[u] ← NIL
  color[s] ← GRAY     ▷ source discovered but not finished
  dist[s]  ← 0
  parent[s] ← NIL
  Q ← empty queue
  ENQUEUE(Q, s)
  while Q ≠ ∅
      u ← DEQUEUE(Q)
      for each v ∈ G.Adj[u]
          if color[v] = WHITE
              color[v]  ← GRAY
              dist[v]   ← dist[u] + 1
              parent[v] ← u
              ENQUEUE(Q, v)
      color[u] ← BLACK  ▷ u is fully explored

PRINT-PATH(G, s, v)
  ▷ Reconstruct shortest path from s to v using parent[]
  if v = s
      print s
  else if parent[v] = NIL
      print "no path from" s "to" v "exists"
  else
      PRINT-PATH(G, s, parent[v])
      print v
```

**Note on colors:** CLRS uses WHITE/GRAY/BLACK to distinguish undiscovered / discovered-in-queue / fully-explored. In practice, a boolean `visited[]` array suffices because we never need to distinguish GRAY from BLACK - we only need to know if a node has been enqueued. The color scheme above is included for formal correctness alignment.

### Python (idiomatic)

```python
from collections import deque
from typing import Optional

def bfs(
    graph: dict[int, list[int]],
    source: int,
    target: Optional[int] = None,
) -> dict[int, int]:
    """
    BFS from source. Returns dist[v] = shortest distance from source to v.
    If target is given, returns early when target is reached.
    graph: adjacency list as {node: [neighbors]}
    """
    dist: dict[int, int] = {source: 0}
    parent: dict[int, Optional[int]] = {source: None}
    queue: deque[int] = deque([source])

    while queue:
        u = queue.popleft()
        if u == target:
            break
        for v in graph.get(u, []):
            if v not in dist:           # mark on enqueue
                dist[v] = dist[u] + 1
                parent[v] = u
                queue.append(v)

    return dist


def reconstruct_path(
    parent: dict[int, Optional[int]],
    source: int,
    target: int,
) -> list[int]:
    """Reconstruct shortest path from source to target using parent map."""
    if target not in parent:
        return []          # target unreachable
    path: list[int] = []
    node: Optional[int] = target
    while node is not None:
        path.append(node)
        node = parent[node]
    path.reverse()
    return path            # path[0] == source, path[-1] == target


def bfs_grid(
    grid: list[list[int]],
    start: tuple[int, int],
    end: tuple[int, int],
) -> int:
    """BFS on a 2D grid. Returns shortest distance or -1 if unreachable.
    Assumes 0 = passable, 1 = blocked."""
    rows, cols = len(grid), len(grid[0])
    sr, sc = start
    er, ec = end

    if grid[sr][sc] == 1 or grid[er][ec] == 1:
        return -1

    visited: set[tuple[int, int]] = {start}
    queue: deque[tuple[int, int, int]] = deque([(sr, sc, 0)])
    directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]

    while queue:
        r, c, d = queue.popleft()
        if (r, c) == end:
            return d
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in visited and grid[nr][nc] == 0:
                visited.add((nr, nc))
                queue.append((nr, nc, d + 1))

    return -1


def bfs_level_order(root) -> list[list[int]]:
    """Level-order traversal of a binary tree. Returns nodes grouped by level."""
    if not root:
        return []
    result: list[list[int]] = []
    queue: deque = deque([root])
    while queue:
        level_size = len(queue)              # snapshot the level boundary
        level: list[int] = []
        for _ in range(level_size):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)
    return result
```

**Contest note:** For multi-source BFS (e.g., 01-Matrix), initialize `deque` with all sources at distance 0 and run the same loop. The `len(queue)` snapshot trick for level separation is idiomatic Python - it avoids a sentinel `None` element in the queue.

## What the interviewer probes for

**"Why `collections.deque` and not a list?"**
`list.pop(0)` is O(n) - it shifts all remaining elements left. `deque.popleft()` is O(1) amortized because a deque is implemented as a doubly-linked list of fixed-size blocks. On n = 10⁵ BFS iterations, using a list gives O(n²) = 10¹⁰ operations - a TLE that looks like a correctness bug. Always use `deque`.

**"How do you reconstruct the shortest path, not just the distance?"**
During BFS, maintain a `parent[v] = u` map whenever you enqueue v from u. After BFS terminates, walk backwards from the target to the source via `parent[]`, then reverse. This adds O(V) space and O(path length) time to reconstruct. For problems that ask "does a path exist?", you can omit the parent map entirely.

**"How would you implement bidirectional BFS, and when would you use it?"**
Run two simultaneous BFS frontiers - one from the source, one from the target. At each step, expand the smaller frontier. When the two frontiers intersect (a node appears in both visited sets), the shortest path is the sum of the two distances at the meeting node. Bidirectional BFS reduces the queue size from O(b^d) to O(b^(d/2)) where b is the branching factor and d is the answer depth - a quadratic improvement in frontier size. Use it when the graph is large and symmetric (undirected or when you can reverse edges for the backward BFS), and the answer depth is expected to be large.

**"How do you handle BFS on an implicit graph?"**
An implicit graph has no explicit adjacency list - neighbors are computed on the fly (e.g., word ladder: all strings at edit distance 1, puzzle states: all valid moves). The BFS code is identical; replace `graph[u]` with a `generate_neighbors(u)` function. The visited set must be a hash set (not an array) since node IDs are arbitrary objects. Be careful: pre-computing all neighbors is often more efficient than recomputing them repeatedly.

**"What happens if you forget the visited check?"**
On an acyclic graph (tree), BFS without a visited check still terminates but may re-explore nodes (exponential in worst case). On a graph with cycles, BFS without a visited check loops forever. The visited check is not optional - it is what makes BFS O(V+E) instead of infinite.

**"Can BFS be done recursively?"**
Yes, but it is awkward - you'd pass the current queue as a parameter and call yourself with the next level's queue. In practice this is never done because it provides no benefit over the iterative version and the stack depth is proportional to the number of levels (O(V) in the worst case), which can overflow. BFS is inherently iterative.

**"How do you detect a bipartite graph with BFS?"**
During BFS, assign alternating colors (0/1) to nodes: source gets 0, each neighbor gets 1 - parent_color. If any edge connects two nodes with the same color, the graph is not bipartite. This runs in O(V+E) - the same as standard BFS.

## Practice problems

### Problem 1: Word Ladder (LC 127)

**Problem statement:** Given two words `beginWord` and `endWord` and a dictionary `wordList`, find the length of the shortest transformation sequence from `beginWord` to `endWord` where each intermediate word must differ from its predecessor by exactly one letter and must be in `wordList`. Return the sequence length (counting both endpoints), or 0 if no such sequence exists. Constraints: words have length 1–10, dictionary has up to 5000 words.

**Approach:** Model as BFS on an implicit graph. Each word is a node; two words share an edge if they differ by exactly one letter. We want the shortest path from `beginWord` to `endWord`. Key optimization: instead of comparing all pairs of words to build the adjacency list upfront (O(n² × L)), build neighbor lists lazily by replacing each character position with a wildcard and using a pattern-to-words map. This turns neighbor generation from O(n × L) per node to O(L × 26) per node.

```python
from collections import deque, defaultdict

def ladderLength(beginWord: str, endWord: str, wordList: list[str]) -> int:
    word_set = set(wordList)
    if endWord not in word_set:
        return 0

    # Pattern map: "*ot" → ["hot", "dot", "lot"]
    pattern_map: dict[str, list[str]] = defaultdict(list)
    for word in wordList:
        for i in range(len(word)):
            pattern = word[:i] + "*" + word[i+1:]
            pattern_map[pattern].append(word)

    visited = {beginWord}
    queue: deque[tuple[str, int]] = deque([(beginWord, 1)])

    while queue:
        word, dist = queue.popleft()
        for i in range(len(word)):
            pattern = word[:i] + "*" + word[i+1:]
            for neighbor in pattern_map[pattern]:
                if neighbor == endWord:
                    return dist + 1
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, dist + 1))

    return 0
```

**Complexity:** O(M² × N) time where M = word length, N = dictionary size (pattern map construction). Space: O(M² × N) for pattern map.

**Duplicate problems:**
- Minimum Genetic Mutation (LC 433) - same BFS on an implicit graph, genes differ by one character; bank plays the role of wordList.
- Word Ladder II (LC 126) - same BFS but must return all shortest paths; requires storing multiple parents per node, not just one.
- Open the Lock (LC 752) - BFS on 4-digit lock states where each turn changes one digit by ±1; same implicit graph structure with a dead-ends set acting as blocked nodes.

---

### Problem 2: Binary Tree Level Order Traversal (LC 102)

**Problem statement:** Given the root of a binary tree, return the node values grouped by level (top to bottom, left to right within each level) as a list of lists. The tree can have up to 2000 nodes.

**Approach:** Standard BFS with a level-size snapshot. Before processing each level, record `len(queue)` - this tells you exactly how many nodes belong to the current level. Process exactly that many nodes, appending their children to the queue for the next level. This avoids using a sentinel `None` value or two-queue rotation.

The level-size trick is the canonical idiom for any problem requiring per-level processing: "rightmost node per level", "average per level", "zigzag level order". Memorize it.

```python
from collections import deque
from typing import Optional

class TreeNode:
    def __init__(self, val: int = 0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def levelOrder(root: Optional[TreeNode]) -> list[list[int]]:
    if not root:
        return []
    result: list[list[int]] = []
    queue: deque[TreeNode] = deque([root])
    while queue:
        level_size = len(queue)    # snapshot: all nodes at this depth
        level: list[int] = []
        for _ in range(level_size):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)
    return result
```

**Complexity:** O(n) time (each node processed once), O(w) space where w = maximum width of the tree (at most n/2 for a complete binary tree, so O(n) worst case).

**Duplicate problems:**
- Binary Tree Right Side View (LC 199) - same level-order BFS; take the last element of each level.
- Average of Levels in Binary Tree (LC 637) - same BFS; compute mean per level instead of collecting all values.
- Maximum Width of Binary Tree (LC 662) - same level BFS but track position indices to compute width; requires (node, col_index) pairs in the queue.
- Binary Tree Zigzag Level Order Traversal (LC 103) - same BFS; alternate between appending and prepending each level's values.

---

### Problem 3: 01 Matrix / Multi-source BFS (LC 542)

**Problem statement:** Given an m×n binary matrix, return a matrix of the same size where each cell contains the distance to the nearest 0 (using 4-directional movement). The matrix has at least one 0. Constraints: m, n ≤ 10⁴ (so up to 10⁸ cells in theory, but 10⁴ × 10⁴ is the practical max, i.e., m·n ≤ 10⁴).

**Approach:** Multi-source BFS. Initialize the queue with all cells that contain 0 at distance 0. Then run BFS outward - each step adds 1 to the distance. The first time BFS reaches any cell containing 1, it has found that cell's nearest 0. This is O(m·n) - strictly better than running a separate BFS from each 1-cell (which would be O((m·n)²) in the worst case).

This is the canonical multi-source BFS pattern. The insight is that starting from all sources simultaneously is equivalent to adding a virtual super-source connected to all real sources at zero cost.

```python
from collections import deque

def updateMatrix(mat: list[list[int]]) -> list[list[int]]:
    rows, cols = len(mat), len(mat[0])
    dist = [[float('inf')] * cols for _ in range(rows)]
    queue: deque[tuple[int, int]] = deque()

    # Initialize: all 0-cells are sources at distance 0
    for r in range(rows):
        for c in range(cols):
            if mat[r][c] == 0:
                dist[r][c] = 0
                queue.append((r, c))

    directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]
    while queue:
        r, c = queue.popleft()
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                if dist[r][c] + 1 < dist[nr][nc]:   # found shorter path
                    dist[nr][nc] = dist[r][c] + 1
                    queue.append((nr, nc))

    return dist
```

**Complexity:** O(m·n) time and space - each cell is processed at most once.

**Duplicate problems:**
- Rotting Oranges (LC 994) - multi-source BFS from all initially-rotten oranges simultaneously; each step represents one minute of spreading; same pattern as 01 Matrix.
- Walls and Gates (LC 286) - multi-source BFS from all gate cells (value 0); fill each empty room with distance to nearest gate; conceptually identical to 01 Matrix.
- As Far from Land as Possible (LC 1162) - multi-source BFS from all land cells (value 1); find the water cell farthest from any land; same pattern, different starting cells.
- Pacific Atlantic Water Flow (LC 417) - two simultaneous multi-source BFS, one from Pacific borders and one from Atlantic borders; cells reachable by both are the answer.
