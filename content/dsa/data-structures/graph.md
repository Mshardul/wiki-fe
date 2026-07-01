# Graph

## Prerequisites

[Binary Tree](./binary-tree.md) [Must read] - trees are graphs with no cycles; understanding tree traversal primes you for graph traversal
[Hash Table](./hash-table.md) [Must read] - adjacency lists use hash maps for O(1) neighbor lookup
[Array](./array.md) [Must read] - adjacency matrix is a 2D array; index arithmetic is the core op

## Table of Contents

- [What it is](#what-it-is)
- [How it works](#how-it-works)
- [Operations](#operations)
- [Complexity summary](#complexity-summary)
- [When to use / when not](#when-to-use--when-not)
- [Comparison](#comparison)
- [Variants](#variants)
- [Representations](#representations)
- [Implementation](#implementation)
- [Gotchas / edge cases](#gotchas--edge-cases)
- [Practice problems](#practice-problems)

## What it is

A graph is a set of **nodes (vertices)** connected by **edges** — the most general structure for modeling relationships, with no ordering constraint and no restriction on connectivity.

**Mental model:** A road map. Cities are nodes; roads are edges. A one-way road is a directed edge; a road with a distance sign is a weighted edge. Every tree, every linked list, every lattice is a restricted graph.

> **Interview soundbite:** "A graph is nodes + edges — the structure when 'connected to' is the relationship. Represent it as an adjacency list for sparse graphs, a matrix for dense or when edge-existence lookups dominate."

## How it works

A graph G = (V, E) is defined by a vertex set V and an edge set E ⊆ V × V.

**Directed vs undirected:** In a directed graph (digraph), each edge (u → v) has a source and a target; u → v does not imply v → u. In an undirected graph, each edge {u, v} is bidirectional — stored as two directed edges in an adjacency list.

**Weighted vs unweighted:** Edges can carry a weight (cost, distance, capacity). An unweighted graph is a weighted graph where all weights are 1.

**Structural taxonomy:**

```
Undirected          Directed (digraph)    Weighted
  A --- B               A --→ B             A --(3)-- B
  |     |               ↑     ↓             |          |
  C --- D               C ←-- D            (1)        (7)
                                             C --(2)-- D
```

**Adjacency list layout (most common):**

```
graph = {
  0: [(1, w), (2, w)],   ← node 0 connects to 1 and 2
  1: [(2, w)],
  2: []
}
```

Each node maps to its neighbor list. For unweighted graphs, omit the weight.

**Adjacency matrix layout:**

```
     0  1  2
  0 [0, 1, 1]   ← row i, col j: 1 if edge i→j exists
  1 [0, 0, 1]
  2 [0, 0, 0]
```

Entry `M[i][j]` = 1 (or the weight) if edge i → j exists, else 0.

## Operations

| Operation | List Time | List Space | Matrix Time | Matrix Space |
| --------- | --------- | ---------- | ----------- | ------------ |
| Add vertex | O(1) | O(1) | O(V²) — resize | O(V²) |
| Add edge | O(1) | O(1) | O(1) | O(1) |
| Remove edge | O(degree) | O(1) | O(1) | O(1) |
| Remove vertex | O(V + E) | O(V + E) | O(V²) | O(V²) |
| Edge exists (u, v)? | O(degree(u)) | O(1) | O(1) | O(1) |
| Iterate neighbors of u | O(degree(u)) | O(1) | O(V) | O(1) |
| Iterate all edges | O(V + E) | O(1) | O(V²) | O(1) |
| Total space | — | O(V + E) | — | O(V²) |

**The critical asymmetry:** matrix gives O(1) edge-existence checks; list gives O(degree) neighbor iteration. Most traversal algorithms (BFS, DFS, Dijkstra) iterate neighbors in the inner loop → adjacency list wins for sparse graphs.

## Complexity summary

Graph complexity always has two variables: V (vertices) and E (edges).

| Representation | Space | Edge lookup | Neighbor iteration |
| -------------- | ----- | ----------- | ------------------ |
| Adjacency list | O(V + E) | O(degree) | O(degree) |
| Adjacency matrix | O(V²) | O(1) | O(V) |
| Edge list | O(E) | O(E) | O(E) |

E ranges from O(V) for sparse trees/chains to O(V²) for complete graphs. When E ≈ V², matrix and list have the same space; the lookup advantage of the matrix breaks even. The tipping point in practice: once E > V log V, the O(V²) matrix space becomes acceptable — and when E = V(V-1)/2 (complete graph), an adjacency list stores V² tuples anyway, so the matrix's O(1) edge-lookup is a pure win.

## When to use / when not

**Reach for a graph when** the problem is fundamentally about relationships between entities: shortest path, connectivity, cycle detection, dependency ordering, flow, matching. The signal is "can I reach X from Y?" or "what is the minimum cost connection?"

**Adjacency list** is the default. Use it when the graph is sparse (E ≪ V²) — social networks, road maps, dependency graphs. Every traversal algorithm (BFS, DFS, Dijkstra, topological sort) runs in O(V + E) on a list; on a matrix they degrade to O(V²) because iterating neighbors costs O(V) per node.

**Adjacency matrix** when:
- Graph is dense (E close to V²) — the O(V²) space is unavoidable anyway.
- You need O(1) edge-existence queries in the hot path (Floyd-Warshall all-pairs DP, some DP on grids).
- V is small (≤ a few thousand) — the V² memory fits.

**Not a graph** when hierarchy is the only relationship → use a tree. When the access pattern is sequential → use an array/list. When the relationship is purely key-value → use a hash map.

Real-world workhorse: operating system kernels use directed graphs (DAGs) for package dependency resolution; Google Maps uses weighted directed graphs for routing. See [Dijkstra's Algorithm](../algorithms/dijkstra.md) for the canonical shortest-path use case.

## Comparison

| Structure | Space | Edge lookup | Neighbor iter | Ordered? | Best for |
| --------- | ----- | ----------- | ------------- | -------- | -------- |
| Adjacency list | O(V+E) | O(deg) | O(deg) | No | Sparse graphs, traversal |
| Adjacency matrix | O(V²) | O(1) | O(V) | No | Dense graphs, O(1) edge check |
| Edge list | O(E) | O(E) | O(E) | No | Kruskal's MST (sort edges) |
| Incidence matrix | O(V·E) | O(E) | O(E) | No | Hypergraph theory |

## Variants

**Directed Acyclic Graph (DAG):** No directed cycles. Enables topological sort and DP on the topology. Dependency graphs, build systems, scheduling.

**Weighted graph:** Edges carry numeric weights (distances, costs, capacities). Required for Dijkstra, Bellman-Ford, MST algorithms.

**Bipartite graph:** Vertices split into two disjoint sets; every edge goes between sets, never within. Used in matching problems (job assignments, network flow). Detectable via 2-coloring BFS.

**Multigraph:** Multiple edges between the same pair of nodes. Rare in interviews; adjacency list still works — just allow duplicates.

**Implicit graph:** No explicit node/edge list — the structure is defined by a rule (grid cells, state transitions, subsets of a bitmask). BFS/DFS applies unchanged; no adjacency structure is built.

**Complete graph (Kₙ):** Every pair of nodes connected. E = V(V-1)/2 — the densest possible. Use the matrix.

## Representations

The representation choice is the single most impactful decision when coding a graph problem. It sets the complexity of every algorithm that follows.

**Quick-pick table:**

| Signal | Reach for |
| ------ | --------- |
| Traversal (BFS/DFS/Dijkstra), sparse graph | Adjacency list |
| Dense graph (E ≈ V²) or O(1) edge-existence in hot loop | Adjacency matrix |
| Sort all edges globally (Kruskal's MST), or reading from stdin | Edge list |
| All-pairs shortest path (Floyd-Warshall) | Adjacency matrix (algorithm operates on it directly) |
| Grid / implicit graph | No structure — compute neighbors on the fly |

### Adjacency list

**Implementation:** Each vertex maps to a list of `(neighbor, weight)` pairs. In Python, a `defaultdict(list)` or `dict[int, list[tuple[int, int]]]`.

**Memory:** O(V + E) — stores exactly the edges that exist, nothing else.

**Why it wins for traversal:** The inner loop of BFS/DFS/Dijkstra is "for each neighbor of u" — this loop runs in O(degree(u)) on a list. On a matrix, the same loop scans an entire row of V entries regardless of how many neighbors u actually has. For a sparse graph with E = O(V), that's O(V) wasted work per node → total O(V²) instead of O(V + E).

**Trade-off accepted:** Edge-existence check (is there an edge u → v?) is O(degree(u)) in the worst case, not O(1). If you need repeated O(1) edge checks, you can augment the list with a hash set per node, paying O(V + E) extra space.

### Adjacency matrix

**Implementation:** A V × V array (or `list[list[int]]`). `matrix[i][j]` = weight (or 1/0 for unweighted).

**Memory:** O(V²) — stores all V² possible edges, even absent ones.

**When it wins:**
- **Floyd-Warshall:** The algorithm is literally `dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])` — it operates directly on the matrix. Building a list first and converting adds overhead.
- **Dense graphs:** When E ≈ V², you'd store V² entries in the list too (as weight tuples), so the matrix's V² space has no asymptotic disadvantage.
- **Small V (≤ 1000):** 1000² = 10⁶ entries, easily fits in memory.

**Trade-off accepted:** Adding a vertex requires resizing the matrix — O(V²) copy. Iterating neighbors is always O(V), even if a node has degree 2.

### Edge list

**Implementation:** A flat list of `(u, v, weight)` tuples. No per-node index.

**Memory:** O(E).

**When it wins:** Kruskal's MST — the algorithm sorts all edges by weight and processes them globally. An adjacency list would require flattening first. Edge list is also the natural format for reading graph input from stdin in contests.

**Trade-off accepted:** No efficient neighbor lookup. Cannot answer "who are the neighbors of u?" without scanning the whole list.

### Direction + weight encoding tips (CP)

```
# Undirected weighted → add both directions
graph[u].append((v, w))
graph[v].append((u, w))

# Directed → one direction only
graph[u].append((v, w))

# Unweighted → omit weight, or set w=1
graph[u].append(v)
```

**Visited state for directed vs undirected:** In BFS/DFS on an undirected graph, when you visit a neighbor you must mark it visited before enqueueing, not after popping — otherwise the same node gets enqueued multiple times via different neighbors, blowing up from O(V + E) to O(E) enqueue operations (which matters when E = V²).

## Implementation

### Pseudocode — build graph from edge list

```
FUNCTION BUILD-GRAPH(edges, n, directed):
  graph ← empty adjacency list of size n
  FOR each (u, v, w) IN edges:
    graph[u].APPEND((v, w))
    IF NOT directed:
      graph[v].APPEND((u, w))
  RETURN graph
```

### Pseudocode — BFS (unweighted shortest path)

```
FUNCTION BFS(graph, source):
  dist ← array of ∞, size |V|
  dist[source] ← 0
  queue ← [source]
  WHILE queue NOT EMPTY:
    u ← DEQUEUE(queue)
    FOR each neighbor v OF u IN graph[u]:
      IF dist[v] = ∞:
        dist[v] ← dist[u] + 1
        ENQUEUE(queue, v)
  RETURN dist
```

### Python — adjacency list graph

```python
from collections import deque
from typing import Optional

def build_graph(
    n: int,
    edges: list[tuple[int, int, int]],
    directed: bool = False,
) -> dict[int, list[tuple[int, int]]]:
    graph: dict[int, list[tuple[int, int]]] = {}
    for u, v, w in edges:
        graph.setdefault(u, []).append((v, w))
        if not directed:
            graph.setdefault(v, []).append((u, w))
    return graph


def bfs(
    graph: dict[int, list[tuple[int, int]]],
    source: int,
    n: int,
) -> list[int]:
    dist = [float("inf")] * n
    dist[source] = 0
    queue: deque[int] = deque([source])
    while queue:
        u = queue.popleft()
        for v, _w in graph.get(u, []):
            if dist[v] == float("inf"):
                dist[v] = dist[u] + 1
                queue.append(v)
    return dist


def dfs(
    graph: dict[int, list[tuple[int, int]]],
    source: int,
    visited: Optional[set[int]] = None,
) -> set[int]:
    if visited is None:
        visited = set()
    visited.add(source)
    for v, _w in graph.get(source, []):
        if v not in visited:
            dfs(graph, v, visited)
    return visited
```

### Python — adjacency matrix graph

```python
def build_matrix(
    n: int,
    edges: list[tuple[int, int, int]],
    directed: bool = False,
) -> list[list[int]]:
    INF = float("inf")
    matrix = [[INF] * n for _ in range(n)]
    for i in range(n):
        matrix[i][i] = 0
    for u, v, w in edges:
        matrix[u][v] = w
        if not directed:
            matrix[v][u] = w
    return matrix
```

## Gotchas / edge cases

**1. Disconnected graphs — not every node is reachable from the source.**
BFS/DFS from a single source only visits the source's connected component. To visit all nodes, wrap the traversal in a loop over all vertices:
```python
for start in range(n):
    if start not in visited:
        dfs(graph, start, visited)
```
Missing this is the most common graph bug in interviews — the "number of connected components" problem fails silently on disconnected input.

**2. Self-loops and parallel edges.**
Adjacency list handles both naturally, but your algorithm may not. Cycle-detection DFS must distinguish "parent edge" from "back edge" — a self-loop is a back edge to yourself. With an undirected adjacency list, when you traverse edge u→v, skip v if v is the parent (not just if v is visited), otherwise the undirected edge looks like a cycle.

**3. Directed vs undirected cycle detection — two-color is wrong for directed graphs.**
In an undirected graph, a simple `visited` boolean correctly detects cycles: if DFS reaches an already-visited node that isn't the parent, it's a cycle. In a directed graph, this fails — a visited node reachable via a different path is a cross edge (not a back edge), and cross edges don't form cycles. You need three-color marking: WHITE (unvisited) → GRAY (in current DFS stack) → BLACK (done). A back edge is GRAY → GRAY; a cross edge is WHITE/BLACK → BLACK. Juniors apply the undirected two-color approach to directed graphs and get false positives on cross edges. Additionally, in undirected BFS/DFS, mark nodes visited *before* enqueueing, not after popping — otherwise the same node is enqueued multiple times via different neighbors, degrading O(V + E) to O(E) enqueue operations (catastrophic when E = V²).

**4. V and E — know which to use in complexity.**
`O(V + E)` and `O(V²)` look close when E is dense, but for sparse graphs (E = O(V)), the difference is O(V) vs O(V²). State complexity in terms of both; never say "O(n)" for a graph problem.

**5. CP: implicit graphs from grids.**
Grid problems are graphs — cells are nodes, valid moves are edges. Don't build an explicit adjacency structure; compute neighbors on the fly:
```python
DIRS = [(0,1),(0,-1),(1,0),(-1,0)]
for dr, dc in DIRS:
    nr, nc = r + dr, c + dc
    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] != '#':
        # enqueue (nr, nc)
```
Bounds-checking before enqueuing is cleaner than try/except and avoids index errors on the boundary.

**6. Integer overflow in weighted graphs.**
When summing path weights, the running total can exceed 32-bit int range. In Python this is not an issue (arbitrary precision), but in Java/C++, use `long`. In contests, initialize dist arrays to `float('inf')` in Python or `LLONG_MAX / 2` in C++ (not `LLONG_MAX`, or adding any weight overflows).

## Practice problems

### Number of Islands (LC 200)

Given a 2D binary grid of `'1'`s (land) and `'0'`s (water), count the number of islands. An island is a maximal group of connected `'1'`s (4-directional). Grid size up to 300 × 300.

**Approach:** Classic implicit-graph BFS/DFS. Each `'1'` cell is a node; valid 4-directional moves to adjacent `'1'` cells are edges. Iterate all cells; when an unvisited `'1'` is found, run BFS/DFS to mark the entire island visited and increment the count. This is the "connected components" pattern.

```python
from collections import deque

def numIslands(grid: list[list[str]]) -> int:
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    visited: set[tuple[int, int]] = set()
    count = 0

    def bfs(r: int, c: int) -> None:
        queue: deque[tuple[int, int]] = deque([(r, c)])
        visited.add((r, c))
        while queue:
            cr, cc = queue.popleft()
            for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]:
                nr, nc = cr + dr, cc + dc
                if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in visited and grid[nr][nc] == "1":
                    visited.add((nr, nc))
                    queue.append((nr, nc))

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1" and (r, c) not in visited:
                bfs(r, c)
                count += 1
    return count
```

**Complexity:** O(V + E) = O(rows × cols) time; O(rows × cols) space for the visited set.

**Duplicate problems:**
- Flood Fill (LC 733) — same BFS/DFS component-marking, different action (paint cells instead of count).
- Max Area of Island (LC 695) — same traversal, track size during BFS instead of just counting components.
- Count Sub Islands (LC 1905) — two grids, same connected-component BFS with an extra cross-grid membership check.

---

### Clone Graph (LC 133)

Given a reference to a node in a connected undirected graph (each node has a value and a list of neighbors), return a deep copy. Nodes have values 1 to n; n ≤ 100.

**Approach:** BFS from the given node. Maintain a `clone_map: dict[Node, Node]` mapping original nodes to their clones. When first encountering a neighbor, create its clone and enqueue it. After BFS, wire each clone's neighbor list by looking up neighbors in `clone_map`. The visited check is `node in clone_map`.

```python
from collections import deque
from typing import Optional

class Node:
    def __init__(self, val: int = 0, neighbors: Optional[list["Node"]] = None):
        self.val = val
        self.neighbors: list[Node] = neighbors or []

def cloneGraph(node: Optional[Node]) -> Optional[Node]:
    if not node:
        return None
    clone_map: dict[Node, Node] = {}
    queue: deque[Node] = deque([node])
    clone_map[node] = Node(node.val)
    while queue:
        curr = queue.popleft()
        for neighbor in curr.neighbors:
            if neighbor not in clone_map:
                clone_map[neighbor] = Node(neighbor.val)
                queue.append(neighbor)
            clone_map[curr].neighbors.append(clone_map[neighbor])
    return clone_map[node]
```

**Complexity:** O(V + E) time; O(V) space for the clone map.

**Duplicate problems:**
- Copy List with Random Pointer (LC 138) — identical pattern: BFS/DFS + hash map from original to clone, then wire pointers. Linked list instead of graph nodes.
- Graph Valid Tree (LC 261) — BFS from node 0 with a visited set; valid tree iff exactly V-1 edges and all nodes reached (same "build adjacency list + BFS + check all visited" skeleton).
- Pacific Atlantic Water Flow (LC 417) — multi-source BFS from ocean borders inward; same "mark reachable" traversal, answer is intersection of two visited sets.

---

### Course Schedule (LC 207)

Given `numCourses` and a list of `[a, b]` prerequisites (must take b before a), determine if all courses can be finished. Up to 2000 courses, 5000 prerequisites.

**Approach:** Build a directed graph; the problem reduces to cycle detection in a DAG. Use DFS with three-color marking: WHITE (unvisited), GRAY (in current DFS path), BLACK (fully processed). If DFS reaches a GRAY node, a cycle exists → return False. This is topological-sort cycle detection, not simple visited/unvisited.

```python
def canFinish(numCourses: int, prerequisites: list[list[int]]) -> bool:
    graph: dict[int, list[int]] = {}
    for a, b in prerequisites:
        graph.setdefault(b, []).append(a)

    WHITE, GRAY, BLACK = 0, 1, 2
    color = [WHITE] * numCourses

    def dfs(u: int) -> bool:
        color[u] = GRAY
        for v in graph.get(u, []):
            if color[v] == GRAY:
                return False  # back edge → cycle
            if color[v] == WHITE and not dfs(v):
                return False
        color[u] = BLACK
        return True

    return all(dfs(i) for i in range(numCourses) if color[i] == WHITE)
```

**Complexity:** O(V + E) time; O(V + E) space for the graph and call stack.

**Duplicate problems:**
- Course Schedule II (LC 210) — same cycle detection + topological sort; return the order instead of just True/False.
- Find Eventual Safe States (LC 802) — same three-color DFS; nodes that are not on any cycle (BLACK nodes) are "safe."
- Alien Dictionary (LC 269) — build a directed graph from character ordering constraints, then topological sort + cycle detection.
