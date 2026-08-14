# Matrix Traversal

## Prerequisites

- [Array](../data-structures/array.md) [Must read]
- [BFS](../algorithms/bfs.md) [Must read]
- [DFS](../algorithms/dfs.md) [Must read]
- [Graph](../data-structures/graph.md) [Must read]

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [Recognition signals](#recognition-signals)
- [How it works](#how-it-works)
- [Complexity](#complexity)
- [Constraints & approach](#constraints--approach)
- [Variations](#variations)
- [Pitfalls](#pitfalls)
- [First 30 seconds](#first-30-seconds)
- [Related](#related)
- [Practice problems](#practice-problems)
  - [Number of Islands](#1-number-of-islands-lc-200--dfs-component-counting)
  - [Shortest Path in Binary Matrix](#2-shortest-path-in-binary-matrix-lc-1091--bfs-shortest-path)
  - [Pacific Atlantic Water Flow](#3-pacific-atlantic-water-flow-lc-417--multi-source-bfs)
  - [Shortest Path with Obstacle Elimination](#4-shortest-path-in-a-grid-with-obstacles-elimination-lc-1293--state-augmented-bfs)
  - [Minimum Obstacle Removal to Reach Corner](#5-minimum-obstacle-removal-to-reach-corner-lc-2290--0-1-bfs)

## What it is

**Matrix traversal** is the pattern of applying BFS or DFS on a 2D grid by encoding each cell as a node and each valid move (up/down/left/right, sometimes diagonal) as an edge - treating the grid as an implicit graph without building it explicitly.

Mental model: **a maze walk.** Each cell is a room; the direction vectors are the doorways. BFS explores all rooms at distance 1 before distance 2 - use it for shortest paths. DFS dives into one corridor until it dead-ends, then backtracks - use it for connected regions and flood fill.

The senior insight: the grid's implicit structure is the key advantage. A real adjacency list for an m×n grid would use O(mn) nodes and O(mn) edges; instead you derive neighbors on-the-fly in O(1) with four arithmetic operations - `(r±1, c)` and `(r, c±1)` - and a bounds check. This keeps the constant factor small and lets the traversal run in true O(mn) with no preprocessing.

> **Takeaway (say this out loud):** "Grid problem with connectivity or shortest path - treat each cell as a graph node, use direction vectors for neighbors, BFS for distance, DFS for regions. The whole traversal is O(mn)."

**Complexity:** O(mn) time, O(mn) space for the visited set and queue/stack (m×n grid).

## Recognition signals

**(a) Trigger phrases** - literal problem-statement snippets that signal this pattern:

- "Given an m × n grid, count the number of islands (connected groups of 1s)"
- "Find the shortest path from the top-left to the bottom-right of the grid"
- "Starting from each 1-cell on the border, mark all 1-cells reachable from the border"
- "Return the number of distinct connected components in the matrix"
- "Flood fill: given a starting cell, replace all connected cells of the same color"
- "Find all cells reachable from both the top/left border and the bottom/right border"

**(b) Structural cues** - input shape + output property regardless of wording:

- Input is a 2D array (grid/matrix/board) where cell values encode a property (passable/blocked, land/water, color, cost).
- The query is about **reachability**, **connectivity**, **shortest distance**, or a **region property** (area, perimeter, count).
- Movement is constrained to adjacent cells (4-directional is default; 8-directional for diagonal; sometimes single-direction for flow).
- The output is a count, a distance, a set of coordinates, or a modified grid.

**(c) Not to be confused with:**

- **Two pointers / sliding window on a matrix** - if the problem is about row/column aggregates (row max, column prefix sums) with no cell-to-cell movement, it's not graph traversal; it's a 1D technique applied per row/column.
- **Dynamic programming on a grid** - if movement is strictly one-directional (top→bottom, left→right) and the problem asks for a count or min/max cost of paths, use DP, not BFS/DFS; DP avoids the visited-set and runs in the same O(mn) with lower constant.
- **Tree & Graph Traversal pattern** - overlapping sibling; this pattern is specifically the implicit-graph encoding of a grid. When the graph is explicit (adjacency list given), use the Tree & Graph Traversal pattern instead.

## How it works

**Step 1 - encode movement.** Define a direction vector list; 4-directional is the default:

```
dirs = [(0,1), (0,-1), (1,0), (-1,0)]   ▷ right, left, down, up
```

For 8-directional (including diagonals), add `(±1, ±1)`. For knight moves, enumerate all 8 knight offsets.

**Step 2 - pick BFS or DFS.** BFS (queue) guarantees shortest-path distance in unweighted grids. DFS (recursion or stack) is simpler for region counting and flood fill where distance doesn't matter.

**Step 3 - track visited.** Use a `visited` boolean matrix or modify the grid in-place (mark visited cells with a sentinel like `'#'` or `0`) to prevent re-visiting.

**Step 4 - bounds check every neighbor.** Before enqueuing/recursing, verify `0 ≤ nr < m` and `0 ≤ nc < n`.

**BFS trace - shortest path on a 4×4 grid:**

```
Grid (0=open, 1=wall):
  0 0 0 0
  0 1 1 0
  0 0 0 0
  0 0 0 0

Start: (0,0), Goal: (3,3)

BFS queue state (cell: distance):
Step 0: queue = [(0,0):0]
Step 1: dequeue (0,0), enqueue (0,1), (1,0) → queue = [(0,1):1, (1,0):1]
Step 2: dequeue (0,1), enqueue (0,2) → queue = [(1,0):1, (0,2):2]
         dequeue (1,0), enqueue (2,0) → queue = [(0,2):2, (2,0):2]
Step 3: dequeue (0,2), enqueue (0,3) → queue = [(2,0):2, (0,3):3]
         dequeue (2,0), enqueue (2,1), (3,0) → queue = [(0,3):3, (2,1):3, (3,0):3]
...
Goal (3,3) reached at distance 6.

Visited cells (marked with their BFS distance):
  0  1  2  3
  1  #  #  3
  2  3  4  5
  3  4  5  6
                  (# = wall, skipped)
```

**DFS trace - island counting on a 3×4 grid:**

```
Grid (1=land, 0=water):         Call stack grows down; ← marks backtrack.
  1 1 0 0
  1 0 0 1
  0 0 1 1

─── Island 1: DFS launched from (0,0) ───

dfs(0,0)  grid[0][0]='0'  try down(1,0)✓ right(0,1)✓ up(-1,0)✗ left(0,-1)✗
  dfs(1,0)  grid[1][0]='0'  try down(2,0)✓ right(1,1)=0✗ up(0,0)='0'✗ left(1,-1)✗
    dfs(2,0)  grid[2][0]='0'  try down(3,0)✗ right(2,1)=0✗ up(1,0)='0'✗ left(2,-1)✗
    ← return                  (no unvisited land neighbors)
  ← return from dfs(1,0)
  dfs(0,1)  grid[0][1]='0'  try down(1,1)=0✗ right(0,2)=0✗ up(-1,1)✗ left(0,0)='0'✗
  ← return                  (no unvisited land neighbors)
← return from dfs(0,0)

Grid after Island 1:
  0 0 0 0     ← all connected 1s marked 0
  0 0 0 1
  0 0 1 1

─── Island 2: DFS launched from (1,3) ───

dfs(1,3)  grid[1][3]='0'  try down(2,3)✓ right(1,4)✗ up(0,3)=0✗ left(1,2)=0✗
  dfs(2,3)  grid[2][3]='0'  try down(3,3)✗ right(2,4)✗ up(1,3)='0'✗ left(2,2)✓
    dfs(2,2)  grid[2][2]='0'  try down(3,2)✗ right(2,3)='0'✗ up(1,2)=0✗ left(2,1)=0✗
    ← return
  ← return from dfs(2,3)
← return from dfs(1,3)

Total islands = 2.
```

The invariant: every cell is visited at most once (marked before enqueue/recurse), so total work is O(mn) regardless of grid structure.

## Complexity

| Variant | Time | Space |
|---------|------|-------|
| BFS (single source) | O(mn) | O(mn) - queue + visited |
| DFS (recursive) | O(mn) | O(mn) - call stack worst case |
| DFS (iterative, stack) | O(mn) | O(mn) - explicit stack |
| Multi-source BFS | O(mn) | O(mn) - all sources enqueued at step 0 |
| 0-1 BFS (deque) | O(mn) | O(mn) - deque |

Every cell is visited at most once; each visit does O(1) work (4 neighbor checks). Total work is proportional to cells, not edges - the implicit-graph encoding means there's no separate edge list to traverse.

**Stack overflow risk (DFS):** a fully connected m×n grid triggers recursion depth up to mn. For n = 300 (LC constraints), depth can reach 90 000 - well above Python's default 1 000 limit. Either raise `sys.setrecursionlimit` or use an iterative DFS with an explicit stack. BFS has no stack-overflow risk.

## Constraints & approach

| Grid size | Expected complexity | Approach |
|-----------|---------------------|----------|
| m,n ≤ 10 | O(mn) trivially | Any traversal; brute-force fine |
| m,n ≤ 300 (LC standard) | O(mn) = O(90 000) | BFS or DFS; iterative DFS to avoid recursion-limit |
| m,n ≤ 10³ | O(mn) = O(10⁶) | BFS/DFS; profile constant (4-directional = small) |
| m,n ≤ 10⁴ | O(mn) = O(10⁸) | BFS/DFS borderline; needs fast I/O and minimal overhead |
| Weighted edges, shortest path | O(mn log mn) | Dijkstra on implicit graph (PQ + dist array) |
| Edge weights in {0,1} | O(mn) | 0-1 BFS with deque - no PQ needed |
| Strictly top→bottom or left→right | O(mn) | DP, not BFS/DFS - no backtracking needed |

**The key read:** `m × n` in the problem title and a movement / connectivity query → matrix traversal. "Shortest path" + unweighted → BFS. "Count components" or "fill region" → DFS. "Minimum cost path" with varying weights → Dijkstra or 0-1 BFS.

**When to push OFF this pattern:** if movement has no directional constraint and the problem is about row/column aggregates (max in a row, column prefix sums), it's a linear-scan or DP problem; the implicit-graph framing adds no value.

**Real-world anchor:** game engines (A* / BFS on tile maps), Google Maps routing (road network as implicit graph over discretised space), robotics path planning, and image segmentation (connected-component labelling on pixel grids) all implement variants of this exact pattern. **At scale:** a 10⁴ × 10⁴ grid has 10⁸ cells; a BFS queue holding up to 10⁸ `(r,c)` tuples consumes ~1.6 GB - at that size, switch to a compact bit-array for the visited set and a ring-buffer queue with integer-encoded coordinates rather than Python tuples. **Cache behavior:** BFS processes cells in wave-front (breadth-first) order - the frontier spans non-contiguous rows simultaneously, so memory accesses jump across cache lines and evict L2 entries before they're reused, making it cache-hostile for large n. DFS dives deep along one corridor first, giving better row-major spatial locality on narrow paths (sequential cell accesses stay in L2), but degrades to O(mn) random hops on wide, fully connected grids. A plain row-major scan is the most cache-friendly access pattern on a grid; BFS/DFS trade that off for traversal correctness.

## Variations

- **4-directional vs 8-directional:** add diagonal offsets `(±1, ±1)` for problems where diagonal moves are valid (e.g., "number of islands" with 8-connectivity, word search).
- **Multi-source BFS:** enqueue all source cells at distance 0 simultaneously. Equivalent to adding a virtual super-source; finds minimum distance from *any* source to every cell in one BFS pass. Used for "distance to nearest 0" (LC 542), "Pacific Atlantic water flow".
- **DFS with return value:** instead of just marking visited, accumulate a value (area, perimeter, path) during the DFS. Used for "max area of island" (area = 1 + sum of recursive returns).
- **In-place visited marking:** overwrite the grid with a sentinel (e.g., `'#'`, `2`) instead of a separate `visited` array - saves O(mn) space but mutates the input (restore after if the grid is reused).
- **Iterative DFS (explicit stack):** push `(r, c)` onto a list; pop and process - same traversal order as recursive DFS but avoids Python's recursion limit. Critical for large grids.
- **Topological traversal (peeling layers):** BFS from the boundary inward, processing cells with no unvisited neighbors first - used for "surrounded regions" and "remove invalid leaves".
- **Dijkstra on grid:** when edge weights are arbitrary (cell cost varies per terrain type), replace the BFS queue with a min-heap keyed by distance - O(mn log mn). Completes the continuum: BFS (uniform cost) → 0-1 BFS (binary cost) → Dijkstra (arbitrary cost).

## Pitfalls

**1. Forgetting the bounds check - the most common silent bug.**
Every neighbor computation `(nr, nc) = (r + dr, c + dc)` must be guarded by `0 ≤ nr < m and 0 ≤ nc < n` *before* accessing `grid[nr][nc]`. Python raises `IndexError` for out-of-bounds row access but silently wraps negative indices (e.g., `grid[-1][c]` accesses the last row). A check like `nr >= 0` is not optional - `nr = -1` is valid Python indexing but semantically wrong.

**2. Enqueuing/recursing before marking visited - causes exponential re-visits.**
Mark a cell visited (set `dist[nr][nc]`, flip `visited[nr][nc]`, or overwrite `grid[nr][nc]`) *at the time you enqueue/recurse*, not when you process it. If you mark visited on dequeue instead, the same cell can be enqueued multiple times from different neighbors before it's processed - exponential blowup.

Concrete example - a fully connected 2×2 grid, mark-on-dequeue (wrong):

```
Grid: all 0 (all passable). Start: (0,0).
Cells: A=(0,0), B=(0,1), C=(1,0), D=(1,1).

Step 0: queue = [A:0]
Dequeue A, mark A visited. Enqueue B, C (neighbors of A).
queue = [B:1, C:1]

Dequeue B, mark B visited. Enqueue A (already visited, skip), D, C again (not yet dequeued!).
queue = [C:1, D:2, C:2]    ← C enqueued twice

Dequeue C (first copy), mark C. Enqueue A (skip), B (skip), D again.
queue = [D:2, C:2, D:3]    ← D enqueued twice

Dequeue D (first copy), mark D. Enqueue B (skip), C (skip).
queue = [C:2, D:3]

Dequeue C (second copy) - already marked, but was enqueued before marking.
Dequeue D (second copy) - same.
```

On a 4×4 fully-connected grid this compounds: each cell can be re-enqueued by up to 4 neighbors before it's dequeued, and each of those re-enqueues triggers further re-enqueues. Mark visited **at enqueue time** - `dist[nr][nc] = dist[r][c] + 1` before `queue.append((nr, nc))` - and none of this happens.

**3. Using DFS for shortest path - gives wrong answer.**
DFS finds *a* path, not the shortest. For unweighted grids, BFS always gives the minimum number of steps; DFS would require exploring all paths and taking the minimum, which is exponential. If the problem says "minimum steps" or "shortest path", reach for BFS immediately.

**4. Python recursion limit on large grids.**
For a 300×300 grid (LC maximum), DFS recursion depth can reach 90 000 - Python's default `sys.getrecursionlimit()` is 1 000. Either call `sys.setrecursionlimit(300 * 300 + 10)` at the top, or use iterative DFS with an explicit stack. In contests, prefer iterative DFS to avoid this class of runtime error entirely.

**5. Modifying input grid as a visited marker without restoring - breaks reuse.**
In-place marking (`grid[r][c] = 0` to mark land as visited) is fine when the grid is consumed once. If the same grid is queried multiple times (e.g., multiple calls to a class method), the mutation corrupts subsequent queries. Either use a separate `visited` array, restore the sentinel after DFS, or document the mutation clearly.

## First 30 seconds

"This is a grid connectivity / shortest-path problem - I'll treat each cell as a graph node and use direction vectors `[(0,1),(0,-1),(1,0),(-1,0)]` for 4-directional neighbors. If the problem asks for shortest path or minimum steps, I'll use BFS (level-order guarantees shortest distance). If it asks for connected components, flood fill, or region properties, I'll use DFS. I'll mark cells visited at enqueue/recurse time to prevent re-visits, and I'll guard every neighbor with a bounds check. Total complexity is O(mn) - each cell visited at most once."

## Related

- [BFS](../algorithms/bfs.md) - the queue-based traversal underlying matrix BFS; matrix traversal is BFS on an implicit graph.
- [DFS](../algorithms/dfs.md) - the recursive/stack-based traversal underlying matrix DFS; understand backtracking before applying to grids.
- [Graph](../data-structures/graph.md) - conceptual foundation; a grid is an implicit adjacency-list graph with 4 (or 8) neighbors per node.
- [Tree & Graph Traversal](./tree-graph-traversal.md) - sibling pattern for explicit graphs (adjacency list given); matrix traversal is the implicit-graph specialization.
- [Sliding Window](./sliding-window.md) - contrasting pattern: for row/column aggregates without cell-to-cell movement, sliding window is the tool; not a graph problem.
- [Dijkstra's Algorithm](../algorithms/dijkstra.md) - use instead of BFS when edge weights vary; for grids with non-uniform costs, Dijkstra (or 0-1 BFS for {0,1} weights) applies.

## Practice problems

### 1. Number of Islands (LC 200) - DFS component counting

Given an m×n grid of `'1'` (land) and `'0'` (water), return the number of islands. Two land cells form part of the same island if they are 4-directionally adjacent. `m, n ≤ 300`.

**Worked examples:**
- **Example 1**
  - **Input:** grid = [["1","1","0","0"],["1","1","0","0"],["0","0","1","0"],["0","0","0","1"]] | **Output:** 3
- **Example 2**
  - **Input:** grid = [["1","1","1"],["0","1","0"],["1","1","1"]] | **Output:** 1
  - **Explanation:** all land cells connect through the middle column.

**Constraints:** `1 ≤ m, n ≤ 300`, `grid[i][j]` is `'0'` or `'1'`.

**Approach:** scan for unvisited `'1'` cells; launch DFS to flood-fill each island (mark land `'0'` in-place). Count each launch.

```python
def num_islands(grid: list[list[str]]) -> int:
    m, n = len(grid), len(grid[0])

    def dfs(r: int, c: int) -> None:
        if not (0 <= r < m and 0 <= c < n) or grid[r][c] != '1':
            return
        grid[r][c] = '0'
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)

    count = 0
    for r in range(m):
        for c in range(n):
            if grid[r][c] == '1':
                dfs(r, c)
                count += 1
    return count
```

**Time:** O(mn). **Space:** O(mn) call stack.

**Duplicate problems:**
- Max Area of Island (LC 695) - DFS returning island size instead of void; track max.
- Number of Connected Components in an Undirected Graph (LC 323) - same component-counting, explicit adjacency list instead of implicit grid.

### 2. Shortest Path in Binary Matrix (LC 1091) - BFS shortest path

n×n binary grid; find length of shortest 8-directional path from `(0,0)` to `(n-1,n-1)` through `0`-cells. Return `-1` if none. `n ≤ 100`.

**Worked examples:**
- **Example 1**
  - **Input:** grid = [[0,1],[1,0]] | **Output:** 2
- **Example 2**
  - **Input:** grid = [[0,0,0],[1,1,0],[1,1,0]] | **Output:** 4

**Constraints:** `1 ≤ n ≤ 100`, `grid[i][j]` is `0` or `1`.

**Approach:** BFS from `(0,0)`, 8-directional neighbors, mark visited on enqueue. Return distance when goal dequeued.

```python
from collections import deque

def shortest_path_binary_matrix(grid: list[list[int]]) -> int:
    n = len(grid)
    if grid[0][0] or grid[n-1][n-1]:
        return -1
    dirs = [(dr,dc) for dr in (-1,0,1) for dc in (-1,0,1) if (dr,dc) != (0,0)]
    queue: deque[tuple[int,int,int]] = deque([(0,0,1)])
    grid[0][0] = 1
    while queue:
        r, c, d = queue.popleft()
        if r == n-1 and c == n-1:
            return d
        for dr,dc in dirs:
            nr,nc = r+dr, c+dc
            if 0 <= nr < n and 0 <= nc < n and grid[nr][nc] == 0:
                grid[nr][nc] = 1
                queue.append((nr,nc,d+1))
    return -1
```

**Time:** O(n²). **Space:** O(n²).

**Duplicate problems:**
- Minimum Knight Moves (LC 1197) - BFS with knight-move offsets, same distance-tracking BFS.
- Jump Game IV (LC 1345) - BFS on index-graph with jump-to-same-value edges; conceptually same shortest-path BFS, different edge structure.

### 3. Pacific Atlantic Water Flow (LC 417) - multi-source BFS

m×n height grid; return cells where water can flow to both Pacific (top/left border) and Atlantic (bottom/right border) oceans. Water flows to equal or lower height. `m, n ≤ 200`.

**Worked examples:**
- **Example 1**
  - **Input:** heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]] | **Output:** [[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]
- **Example 2**
  - **Input:** heights = [[1]] | **Output:** [[0,0]]
  - **Explanation:** the single cell touches both oceans' borders at once.

**Constraints:** `1 ≤ m, n ≤ 200`, `0 ≤ heights[r][c] ≤ 10⁵`.

**Approach:** reverse the flow. Run two multi-source BFS - one from Pacific border, one from Atlantic border - expanding to neighbors with height ≥ current (reverse flow direction). Answer = intersection of both reachable sets.

```python
from collections import deque

def pacific_atlantic(heights: list[list[int]]) -> list[list[int]]:
    m, n = len(heights), len(heights[0])
    dirs = [(0,1),(0,-1),(1,0),(-1,0)]

    def bfs(sources: list[tuple[int,int]]) -> set[tuple[int,int]]:
        visited: set[tuple[int,int]] = set(sources)
        queue: deque[tuple[int,int]] = deque(sources)
        while queue:
            r, c = queue.popleft()
            for dr, dc in dirs:
                nr, nc = r+dr, c+dc
                if 0<=nr<m and 0<=nc<n and (nr,nc) not in visited and heights[nr][nc] >= heights[r][c]:
                    visited.add((nr,nc))
                    queue.append((nr,nc))
        return visited

    pac = bfs([(0,c) for c in range(n)] + [(r,0) for r in range(1,m)])
    atl = bfs([(m-1,c) for c in range(n)] + [(r,n-1) for r in range(m-1)])
    return [[r,c] for r,c in pac & atl]
```

**Time:** O(mn). **Space:** O(mn).

**Duplicate problems:**
- Walls and Gates (LC 286) - multi-source BFS from gates; fill room distances. No intersection step.
- Rotting Oranges (LC 994) - multi-source BFS from rotten oranges; answer is max distance reached (time to rot all fresh oranges).
- 01 Matrix (LC 542) - multi-source BFS from every 0-cell simultaneously; distance to nearest 0 for every cell, same enqueue-all-sources-at-once template.

---

### 4. Shortest Path in a Grid with Obstacles Elimination (LC 1293) - state-augmented BFS

Given an m×n grid of `0`s (empty) and `1`s (obstacles), find the minimum number of steps to walk from `(0,0)` to `(m-1,n-1)`. You can eliminate at most `k` obstacles. `m, n ≤ 40`, `k ≤ mn`.

**Worked examples:**
- **Example 1**
  - **Input:** grid = [[0,0,0],[1,1,0],[0,0,0],[0,1,1],[0,0,0]], k = 1 | **Output:** 6
- **Example 2**
  - **Input:** grid = [[0,1,1],[1,1,1],[1,0,0]], k = 1 | **Output:** -1
  - **Explanation:** not enough eliminations to clear a path.

**Constraints:** `1 ≤ m, n ≤ 40`, `1 ≤ k ≤ m*n`.

**Approach:** plain BFS on `(r, c)` is wrong - the optimal path depends on how many obstacles remain eliminable, so two visits to the same cell with different remaining `k` are distinct states. Augment state to `(r, c, remaining_k)`. BFS still finds the shortest path because all edges cost 1 step; the state space is `m × n × (k+1)` and each state is visited at most once. Mark `visited[r][c][rem]` on enqueue.

The key insight separating this from plain BFS: the visited set must key on the full state `(r, c, rem)`, not just `(r, c)`. A cell reached with `rem=3` and again later with `rem=5` should not suppress the second visit - more remaining eliminations means the second path may reach the goal faster via a different obstacle sequence.

```python
from collections import deque

def shortest_path(grid: list[list[int]], k: int) -> int:
    m, n = len(grid), len(grid[0])
    if m == 1 and n == 1:
        return 0
    visited = [[[False] * (k + 1) for _ in range(n)] for _ in range(m)]
    visited[0][0][k] = True
    queue: deque[tuple[int, int, int, int]] = deque([(0, 0, k, 0)])  # r, c, rem, steps
    dirs = [(0, 1), (0, -1), (1, 0), (-1, 0)]

    while queue:
        r, c, rem, steps = queue.popleft()
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if not (0 <= nr < m and 0 <= nc < n):
                continue
            new_rem = rem - grid[nr][nc]  # subtract 1 if obstacle, 0 if empty
            if new_rem < 0:
                continue
            if nr == m - 1 and nc == n - 1:
                return steps + 1
            if not visited[nr][nc][new_rem]:
                visited[nr][nc][new_rem] = True
                queue.append((nr, nc, new_rem, steps + 1))
    return -1
```

**Complexity:** O(mn·k) time, O(mn·k) space - visited array dominates.

**Duplicate problems:**
- Cut Off Trees for Golf Event (LC 675) - BFS repeated between targets with augmented ordering state; same state-extension idea applied to multi-leg pathfinding.

---

### 5. Minimum Obstacle Removal to Reach Corner (LC 2290) - 0-1 BFS

Given an m×n grid of `0`s (empty) and `1`s (obstacles), return the minimum number of obstacles to remove to travel from `(0,0)` to `(m-1,n-1)`. `m, n ≤ 10⁵`, `m × n ≤ 10⁵`.

**Worked examples:**
- **Example 1**
  - **Input:** grid = [[0,1,1],[1,1,0],[1,1,0]] | **Output:** 2
  - **Explanation:** remove the obstacles at (0,1) and (0,2), or an equivalent pair, to clear a path.
- **Example 2**
  - **Input:** grid = [[0,1,0,0,0],[0,1,0,1,0],[0,0,0,1,0]] | **Output:** 0
  - **Explanation:** a path exists entirely through 0-cells.

**Constraints:** `1 ≤ m, n ≤ 10⁵`, `2 ≤ m × n ≤ 10⁵`, `grid[i][j]` is `0` or `1`, `grid[0][0] == grid[m-1][n-1] == 0`.

**Approach:** moving into an empty cell (`0`) costs 0, moving into an obstacle cell (`1`) costs 1 (the cost of removing it) - edge weights are binary, so a plain BFS queue is wrong (it doesn't respect the cost ordering) and a full Dijkstra with a heap is overkill (O(mn log mn)). Use a deque: push weight-0 moves to the front (`appendleft`) and weight-1 moves to the back (`append`). Because the deque always processes strictly-non-decreasing distances in order, popping from the front always yields the next-smallest tentative distance without any heap bookkeeping.

```python
from collections import deque

def minimumObstacles(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])
    dist = [[float('inf')] * n for _ in range(m)]
    dist[0][0] = 0
    dq: deque[tuple[int, int]] = deque([(0, 0)])
    dirs = [(0, 1), (0, -1), (1, 0), (-1, 0)]
    while dq:
        r, c = dq.popleft()
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n:
                w = grid[nr][nc]
                if dist[r][c] + w < dist[nr][nc]:
                    dist[nr][nc] = dist[r][c] + w
                    if w == 0:
                        dq.appendleft((nr, nc))
                    else:
                        dq.append((nr, nc))
    return dist[m - 1][n - 1]
```

**Complexity:** O(mn) time and space - every cell enters the deque a bounded number of times, no log factor.

**Duplicate problems:**
- Shortest Path in a Grid with Obstacles Elimination (LC 1293) - same grid, but `k` is bounded rather than unlimited, so the state must be augmented to `(r, c, remaining_k)` instead of using edge-weight 0-1 BFS; see the state-augmented BFS entry above.
