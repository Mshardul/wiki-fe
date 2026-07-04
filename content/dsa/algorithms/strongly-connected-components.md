# Strongly Connected Components

## Prerequisites

- [Depth-First Search (DFS)](./dfs.md) [Must read] - both Kosaraju and Tarjan are DFS algorithms; understanding DFS post-order and the call stack is required.
- [Graph](../data-structures/graph.md) [Must read] - directed graphs, adjacency list representation, and the concept of reachability.
- [Topological Sort](./topological-sort.md) [Must read] - Kosaraju's second pass is topological order on the transpose; understanding finish-time ordering is essential.

## Table of Contents

- [Prerequisites](#prerequisites)
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

A **strongly connected component (SCC)** is a maximal set of vertices in a directed graph such that every vertex is reachable from every other vertex in the set - a group where you can get from any node to any other node by following directed edges.

**Mental model:** Think of one-way streets in a city. An SCC is a neighbourhood where, even though all roads are one-way, you can still reach any intersection from any other (possibly via a longer route). Two algorithms compute all SCCs in O(V + E): **Kosaraju's** (two DFS passes - one on the original graph, one on the transpose, in reverse finish-time order) and **Tarjan's** (single DFS pass using low-link values to detect when the DFS closes a cycle back to an SCC root).

> **Interview soundbite:** "An SCC is a maximal group where every node can reach every other - Kosaraju finds them with two DFS passes on the graph and its transpose; Tarjan finds them in one pass using low-link values."

**Complexity:** O(V + E) time, O(V + E) space - both algorithms.

## Intuition

**Why two passes work (Kosaraju):** In a DFS, a node gets a high finish time if it can reach many other nodes. If you run DFS and finish a node *u* after node *v*, then *u* can reach *v* in the original graph. Now reverse all edges. In the reversed graph, *v* can reach *u* - but nothing outside *u*'s SCC can reach *u* anymore (those edges are now reversed away from *u*). Processing nodes in decreasing finish time on the transposed graph therefore peels off one complete SCC per DFS tree: each tree is exactly one SCC.

**Why one pass works (Tarjan):** During DFS, track two values per node: `disc` (discovery time) and `low` (the lowest disc reachable from the subtree, including back edges). A node *u* is an **SCC root** when `low[u] == disc[u]` - no back edge from *u*'s subtree reaches an ancestor of *u*, so *u*'s subtree is sealed. All nodes stacked since *u* was entered form one SCC.

**Key insight both share:** SCCs are the "sink" groups in the DAG of SCCs (the condensation). Processing sinks first (Kosaraju: highest finish time = sink SCC in the transpose; Tarjan: completing the DFS subtree) ensures you never bleed across SCC boundaries.

## How it works

### Kosaraju's algorithm - trace

Graph: 5 nodes, directed edges: 0→1, 1→2, 2→0, 1→3, 3→4.

**Pass 1 - DFS on original graph, record finish order:**

```
Start DFS from 0:
  visit 0 → visit 1 → visit 2 → visit 0 (already visited, back edge)
    finish 2  (stack: [2])
    visit 3 → visit 4 → finish 4 (stack: [2,4])
    finish 3  (stack: [2,4,3])
  finish 1  (stack: [2,4,3,1])
finish 0  (stack: [2,4,3,1,0])
```

Finish order (bottom to top of stack): 2, 4, 3, 1, 0 → **pop order: 0, 1, 3, 4, 2**.

**Transpose graph edges:** 1→0, 2→1, 0→2, 3→1, 4→3.

**Pass 2 - DFS on transpose in pop order (0, 1, 3, 4, 2):**

```
Pop 0: DFS on transpose from 0
  0 → 2 → 1 → (3 and 4 not yet visited? 3's transpose edge is 4→3, so from 1 on transpose: 1→0 (visited), 1→3? No - original 3→1 means transpose 1→3)
```

Let's be precise. Transpose: 1→0, 2→1, 0→2, 3→1, 4→3.

```
Pop 0: DFS from 0 on transpose
  0 → 2 (via 0→2) → 1 (via 2→1) → 0 (visited)
  SCC 1: {0, 2, 1}  ← the cycle 0→1→2→0

Pop 1: already visited. Skip.

Pop 3: DFS from 3 on transpose
  3 → 1 (visited)
  SCC 2: {3}

Pop 4: DFS from 4 on transpose
  4 → 3 (visited)
  SCC 3: {4}

Pop 2: already visited. Skip.
```

**Result: SCCs = {0,1,2}, {3}, {4}**

**Diagram - Pass 2 pop order → SCC assignment:**

```
Finish stack (top = pop first): [0, 1, 3, 4, 2]

Transpose graph: 1→0, 2→1, 0→2, 3→1, 4→3

Pop 0 → DFS on transpose: 0→2→1 (cycle closes) ┐
  all reachable from 0 on transpose             │ SCC₁ = {0,1,2}
  none escape - 1→3 in transpose? No,           ┘
  original 3→1 means transpose 1→3: 3 unvisited
  but 3 is NOT reachable from 0 on transpose

Pop 3 → DFS: 3→1 (visited) ──────────────────── SCC₂ = {3}
Pop 4 → DFS: 4→3 (visited) ──────────────────── SCC₃ = {4}

Condensation (DAG of SCCs):
  [SCC₁: 0,1,2] → [SCC₂: 3] → [SCC₃: 4]
  (invariant: each DFS tree on transpose = exactly one SCC)
```

### Tarjan's algorithm - trace (same graph)

```
disc[], low[], on_stack[], stack=[]

DFS(0): disc[0]=low[0]=0, push 0
  DFS(1): disc[1]=low[1]=1, push 1
    DFS(2): disc[2]=low[2]=2, push 2
      edge 2→0: 0 is on_stack → low[2] = min(low[2], disc[0]) = 0
    finish 2: low[2]=0 ≠ disc[2]=2 → not root, propagate: low[1] = min(1,0) = 0
  edge 1→3: DFS(3): disc[3]=low[3]=3, push 3
    DFS(4): disc[4]=low[4]=4, push 4
    finish 4: low[4]=4 == disc[4]=4 → ROOT. Pop until 4: SCC={4}
    propagate: low[3] = min(3,4) = 3
  finish 3: low[3]=3 == disc[3]=3 → ROOT. Pop until 3: SCC={3}
  propagate: low[1] = min(0,3) = 0
finish 1: low[1]=0 ≠ disc[1]=1 → not root, propagate: low[0] = min(0,0) = 0
finish 0: low[0]=0 == disc[0]=0 → ROOT. Pop until 0: SCC={2,1,0}
```

**Result: SCCs = {4}, {3}, {0,1,2}** - same three groups, found in one pass.

## Correctness / invariant

### Kosaraju invariant

**Claim:** Each DFS tree in Pass 2 (on the transpose, in decreasing finish-time order) is exactly one SCC.

**Proof sketch:** Let *u* have the highest finish time among unvisited nodes in Pass 2. In the original graph, *u* can reach everything in its SCC (by definition). In the transpose, everything in *u*'s SCC can reach *u*. Since *u* has the highest finish time, the DFS from *u* on the transpose cannot escape *u*'s SCC: any node *v* outside *u*'s SCC that *u* can reach in the original graph (edge *u* → *v* in original = edge *v* → *u* in transpose) would have a higher finish time than *u* - but we're processing in decreasing order, so *v* was already processed and marked visited. Therefore the DFS from *u* on the transpose stays exactly within *u*'s SCC.

### Tarjan invariant

**Low-link invariant:** `low[u]` = the minimum discovery time reachable from any node in *u*'s DFS subtree via at most one back edge to an ancestor. A node *u* is an SCC root iff `low[u] == disc[u]` - meaning no back edge from *u*'s subtree reaches a node that was pushed onto the stack before *u*. At that point, all nodes pushed since *u* form a complete SCC, because they are mutually reachable (the DFS path from *u* reaches them, and the back edges bring them back to *u*'s discovery time).

## Complexity derivation

Both algorithms do two DFS passes over a graph with V vertices and E edges (Kosaraju) or one DFS pass (Tarjan).

**Time - Kosaraju:**
- Pass 1: DFS on original graph - each vertex visited once, each edge traversed once → O(V + E).
- Transpose construction: copy and reverse all edges → O(V + E).
- Pass 2: DFS on transpose - same bound → O(V + E).
- Total: **O(V + E)**.

**Time - Tarjan:**
- Single DFS: each vertex pushed and popped from the stack at most once → O(V). Each edge examined once → O(E). Low-link updates are O(1) per edge.
- Total: **O(V + E)**.

**Space - both:**
- Adjacency list: O(V + E).
- Call stack depth: O(V) in the worst case (a path graph).
- Kosaraju: transpose graph O(V + E) + finish-time stack O(V) → **O(V + E)**.
- Tarjan: DFS stack O(V) + low/disc arrays O(V) → **O(V)** auxiliary (but the input graph itself is O(V + E)).

**Cache behavior:** Both algorithms walk adjacency lists - pointer-chasing on sparse graphs. For dense graphs (adjacency matrix), cache is more friendly but space is O(V²). At large V, the recursion stack depth O(V) can overflow; iterative DFS is required in practice.

## Constraints & approach

| Input size | Expected complexity | Approach | Notes |
|---|---|---|---|
| V, E ≤ 10⁵ | O(V + E) | Kosaraju or Tarjan | Standard SCC - both work; Tarjan slightly faster (one pass, no transpose) |
| V ≤ 500, E ≤ V² | O(V + E) | Either | Dense graph - adjacency matrix fine; O(V + E) = O(V²) |
| V ≤ 10⁶ | O(V + E) | Tarjan (iterative) | Recursion depth → stack overflow risk at V > ~10⁵; must convert to iterative DFS |
| Need condensation DAG | O(V + E) | Either + label | Assign SCC IDs, rebuild edges between SCC nodes → condensation in same pass |
| Online (streaming edges) | - | Neither | SCC algorithms require the full graph; for dynamic connectivity use link-cut trees |

**What constraints rule out:**
- V > 10⁶ with recursive DFS → stack overflow; iterative Tarjan required.
- O(V²) or O(VE) → ruled out for any competitive graph size; both algorithms are linear.

## When to use / when not

**Reach for SCC when:**
- The graph is **directed** and you need to find groups where all nodes can reach each other (two-way reachability within the group).
- You need the **condensation** - the DAG of SCCs - for subsequent topological analysis (e.g., 2-SAT, finding feedback vertex sets, circuit analysis).
- Detecting **deadlocks** in dependency graphs (a cycle in a directed graph = an SCC of size > 1).
- Solving **2-SAT**: the SCC condensation gives a satisfying assignment in O(V + E).

**Do not reach for SCC when:**
- The graph is **undirected** - use simple DFS/BFS connected components; SCC is the same as connected components for undirected graphs.
- You only need **reachability from one source** - BFS/DFS from that source is sufficient.
- You need **bridges or articulation points** - those are different decompositions (Tarjan's bridge-finding is related but distinct from SCC).

**Choose Kosaraju vs Tarjan:**
- **Kosaraju** - simpler to implement correctly (two vanilla DFS passes); easier to debug; costs one extra O(V + E) pass for the transpose.
- **Tarjan** - single pass, no transpose needed, slightly faster in practice; harder to implement correctly (low-link update rule is subtle); iterative version is significantly more complex.
- In interviews, Kosaraju is safer to code under pressure. In contests with large V, Tarjan's single pass and lower constant win.

**Real-world usage:** Linux kernel uses SCC-style cycle detection in module dependency graphs to enforce that the dependency DAG is acyclic. Compilers use SCC condensation to find circular dependencies between translation units.

## Comparison

| Algorithm | Time | Space | Passes | Key constraint | Pick it when |
|---|---|---|---|---|---|
| **Kosaraju** | O(V + E) | O(V + E) | 2 DFS | Directed graph; needs transpose | Interview setting - simpler to code correctly |
| **Tarjan** | O(V + E) | O(V) aux | 1 DFS | Directed graph; stack + low-link | Contest/production - one pass, no extra graph copy |
| **Path-based (Pearce)** | O(V + E) | O(V) | 1 DFS | Directed graph | Memory-constrained; avoids Tarjan's on-stack array |
| **BFS/DFS components** | O(V + E) | O(V) | 1 | **Undirected** graph only | Undirected connected components - don't use SCC |
| **Floyd-Warshall** | O(V³) | O(V²) | - | Any directed graph | V ≤ ~300 AND need all-pairs reachability AND don't need the SCC decomposition itself - the O(V³) constant is acceptable only at small V |

## Graph/tree assumptions

**SCC algorithms assume:**

1. **Directed graph** - the directionality of edges is the whole point. On an undirected graph, every component is trivially strongly connected and simple DFS suffices.

2. **Visited state:** Both algorithms track `visited[]` (boolean) to avoid re-processing nodes. Tarjan additionally tracks `on_stack[]` - a node that is visited but not yet popped may still be part of an SCC being formed. A back edge to a node that is visited but *not* on the stack crosses SCC boundaries and must not update `low[]`.

3. **Queue vs stack vs PQ:**
   - Kosaraju Pass 1: DFS (call stack or explicit stack) - post-order finish times recorded on a stack.
   - Kosaraju Pass 2: DFS (call stack or explicit stack) - standard DFS, no PQ.
   - Tarjan: DFS + explicit auxiliary stack for SCC membership. No queue, no PQ.

4. **Transpose graph (Kosaraju only):** Build by iterating all edges (u, v) and adding (v, u). Same adjacency-list structure, O(V + E) to build.

5. **Weighted/unweighted:** Edge weights are irrelevant - SCC is purely a reachability question. Strip weights before running.

6. **Disconnected graphs:** Both handle disconnected graphs correctly by iterating over all vertices in the outer loop (`for v in 0..V: if not visited[v]: dfs(v)`). Every vertex is assigned to exactly one SCC.

7. **SCC vs weakly connected components (WCC):** A WCC treats all directed edges as undirected and finds connected groups - simpler (one BFS/DFS pass, no transpose), but coarser. Use WCC when you only need to know "are these nodes connected by some path ignoring direction?" Use SCC when direction matters and you need mutual reachability. On the same graph, WCC count ≤ SCC count (WCCs merge what SCCs keep separate). Conflating the two is a common design error: a deadlock detector needs SCC (the cycle must be directed); a "is the graph connected?" check needs WCC.

## Edge cases

**1. Single node, no edges:**
- Forms its own SCC of size 1. Both algorithms correctly output `{0}`.
- In Python: a graph `{0: []}` yields `[[0]]`. No special handling needed - the outer loop visits node 0, DFS immediately finishes.

**2. All nodes in one SCC (complete directed cycle):**
- A→B→C→A: one SCC `{A,B,C}`. Kosaraju: Pass 1 finishes in some order; Pass 2 DFS from the last-finished node reaches all three on the transpose. Tarjan: low-link of root equals its disc time only after completing the full cycle.

**3. Graph with no edges (V nodes, 0 edges):**
- Each node is its own SCC. `n` SCCs of size 1. Both algorithms handle this - DFS from each node immediately finishes, emitting a singleton SCC.

**4. Self-loops:**
- Node with a self-loop (A→A) is an SCC of size 1 - it forms a trivial cycle with itself. Tarjan: `disc[A]` is in the stack when the self-loop is processed; `low[A] = min(low[A], disc[A]) = disc[A]` - no effect, correctly a singleton SCC. No special case needed.

**5. CP-flavored trap - Tarjan `on_stack` vs `visited`:**
- Critical bug: when processing edge (u, v) in Tarjan, you must update `low[u] = min(low[u], disc[v])` **only if v is on the stack**. If `v` is visited but *not* on the stack, it belongs to an already-completed SCC; using `disc[v]` would incorrectly merge two SCCs. This is the most common Tarjan implementation bug.

**6. Recursion depth / stack overflow (CP trap):**
- For V = 10⁵ with a path graph (0→1→2→…→n), DFS recurses V levels deep. Python's default recursion limit is 1000; will crash. Fix: `sys.setrecursionlimit(200000)` or use iterative DFS. Always set this at the top of the CP submission file.

**7. Disconnected graph - missed components:**
- If the outer loop starts DFS only from node 0, disconnected nodes are silently skipped. Always loop `for v in range(V): if not visited[v]: dfs(v)`.

## Implementation

### Kosaraju's algorithm

**Pseudocode:**

```
KOSARAJU(G):
  n ← number of vertices
  visited ← array of FALSE, size n
  finish_stack ← empty stack

  ▷ Pass 1: DFS on original graph, push finish order
  for u = 0 to n-1:
    if not visited[u]:
      DFS1(G, u, visited, finish_stack)

  ▷ Build transpose
  G_T ← TRANSPOSE(G)

  ▷ Pass 2: DFS on transpose in reverse finish order
  visited ← array of FALSE, size n
  sccs ← empty list

  while finish_stack is not empty:
    u ← POP(finish_stack)
    if not visited[u]:
      scc ← empty list
      DFS2(G_T, u, visited, scc)
      APPEND(sccs, scc)

  return sccs

DFS1(G, u, visited, finish_stack):
  visited[u] ← TRUE
  for v in G[u]:
    if not visited[v]:
      DFS1(G, v, visited, finish_stack)
  PUSH(finish_stack, u)          ▷ push AFTER all neighbors done

DFS2(G_T, u, visited, scc):
  visited[u] ← TRUE
  APPEND(scc, u)
  for v in G_T[u]:
    if not visited[v]:
      DFS2(G_T, v, visited, scc)
```

**Python:**

```python
import sys
from collections import defaultdict
sys.setrecursionlimit(200000)

def kosaraju(n: int, edges: list[tuple[int, int]]) -> list[list[int]]:
    graph: dict[int, list[int]] = defaultdict(list)
    transpose: dict[int, list[int]] = defaultdict(list)

    for u, v in edges:
        graph[u].append(v)
        transpose[v].append(u)

    visited = [False] * n
    finish_stack: list[int] = []

    def dfs1(u: int) -> None:
        visited[u] = True
        for v in graph[u]:
            if not visited[v]:
                dfs1(v)
        finish_stack.append(u)

    for u in range(n):
        if not visited[u]:
            dfs1(u)

    visited = [False] * n
    sccs: list[list[int]] = []

    def dfs2(u: int, scc: list[int]) -> None:
        visited[u] = True
        scc.append(u)
        for v in transpose[u]:
            if not visited[v]:
                dfs2(v, scc)

    while finish_stack:
        u = finish_stack.pop()
        if not visited[u]:
            scc: list[int] = []
            dfs2(u, scc)
            sccs.append(scc)

    return sccs
```

---

### Tarjan's algorithm

**Pseudocode:**

```
TARJAN(G):
  n ← number of vertices
  disc ← array of -1, size n      ▷ -1 = unvisited
  low  ← array of 0,  size n
  on_stack ← array of FALSE, size n
  stack ← empty stack
  timer ← 0
  sccs ← empty list

  for u = 0 to n-1:
    if disc[u] == -1:
      DFS(G, u, disc, low, on_stack, stack, timer, sccs)

  return sccs

DFS(G, u, disc, low, on_stack, stack, timer, sccs):
  disc[u] ← low[u] ← timer
  timer ← timer + 1
  PUSH(stack, u)
  on_stack[u] ← TRUE

  for v in G[u]:
    if disc[v] == -1:                         ▷ tree edge
      DFS(G, v, disc, low, on_stack, stack, timer, sccs)
      low[u] ← min(low[u], low[v])
    else if on_stack[v]:                      ▷ back edge to ancestor in current SCC
      low[u] ← min(low[u], disc[v])
    ▷ if visited but NOT on_stack: cross edge to finished SCC - ignore

  if low[u] == disc[u]:                       ▷ u is SCC root
    scc ← empty list
    repeat:
      w ← POP(stack)
      on_stack[w] ← FALSE
      APPEND(scc, w)
    until w == u
    APPEND(sccs, scc)
```

**Python:**

```python
import sys
from collections import defaultdict
sys.setrecursionlimit(200000)

def tarjan(n: int, edges: list[tuple[int, int]]) -> list[list[int]]:
    graph: dict[int, list[int]] = defaultdict(list)
    for u, v in edges:
        graph[u].append(v)

    disc = [-1] * n
    low = [0] * n
    on_stack = [False] * n
    stack: list[int] = []
    timer = [0]
    sccs: list[list[int]] = []

    def dfs(u: int) -> None:
        disc[u] = low[u] = timer[0]
        timer[0] += 1
        stack.append(u)
        on_stack[u] = True

        for v in graph[u]:
            if disc[v] == -1:
                dfs(v)
                low[u] = min(low[u], low[v])
            elif on_stack[v]:
                low[u] = min(low[u], disc[v])

        if low[u] == disc[u]:
            scc: list[int] = []
            while True:
                w = stack.pop()
                on_stack[w] = False
                scc.append(w)
                if w == u:
                    break
            sccs.append(scc)

    for u in range(n):
        if disc[u] == -1:
            dfs(u)

    return sccs
```

**Contest velocity - condensation in one extra pass:**

```python
def condensation(n: int, edges: list[tuple[int, int]]) -> tuple[list[list[int]], list[tuple[int,int]]]:
    sccs = tarjan(n, edges)
    comp = [0] * n
    for i, scc in enumerate(sccs):
        for node in scc:
            comp[node] = i
    dag_edges = {(comp[u], comp[v]) for u, v in edges if comp[u] != comp[v]}
    return sccs, list(dag_edges)
```

## What the interviewer probes for

**"What's the difference between Kosaraju and Tarjan? Which would you use?"**
Kosaraju makes two DFS passes and requires building the transpose graph - simpler to reason about and implement correctly. Tarjan uses a single DFS with low-link values and an auxiliary stack - harder to get right but avoids the transpose and runs in one pass. In an interview, Kosaraju is safer. In a contest or production system with V > 10⁵, Tarjan's single pass and lower constant factor win.

**"What's a condensation, and why is it useful?"**
The condensation is the DAG formed by contracting each SCC to a single node and keeping only edges between different SCCs. It's a DAG by construction (any cycle would be inside an SCC). It's useful because many problems on directed graphs (2-SAT, feedback arc set, reachability between groups) reduce to reasoning on the condensation, which supports topological sort and DP in O(V + E) after O(V + E) SCC construction.

**"Scale probe: what if V = 10⁷?"**
DFS recursion will overflow the stack well before that - Python's default is 1000, and even with `sys.setrecursionlimit` you risk a C-stack overflow around V ≈ 10⁵. You need an **iterative** DFS. Iterative Kosaraju is straightforward (an explicit stack mimicking post-order). Iterative Tarjan is significantly more complex - you must emulate the implicit return address by storing the edge iterator position per frame.

**"Why can't you use SCC on an undirected graph?"**
On an undirected graph every edge goes both ways, so every connected component is trivially an SCC - every node can reach every other node in the component. Running Kosaraju or Tarjan on an undirected graph is wasteful; a single BFS/DFS connected-components pass suffices.

**"How does 2-SAT use SCC?"**
Each boolean variable x creates two nodes (x and ¬x). Each clause (a ∨ b) adds implications ¬a → b and ¬b → a. Run SCC on the implication graph. If any variable x and ¬x end up in the same SCC, the formula is UNSATISFIABLE (they force each other to be both true and false). Otherwise, assign truth values based on SCC order in the condensation - the SCC appearing later in topological order "wins."

## Practice problems

### 1. Number of Provinces (LC 547)

There are n cities, and some pairs are directly connected. Given an n×n `isConnected` matrix, return the number of provinces (groups of directly or indirectly connected cities). Note: this is an **undirected** connected-components problem - not SCC - but it's the canonical gateway to understand the outer loop needed in both algorithms.

**Approach:** DFS/BFS from each unvisited city, counting starts. Identical in structure to the outer `for v in range(n)` loop in Kosaraju/Tarjan. Forces the insight that disconnected graphs require iterating all nodes.

```python
def findCircleNum(isConnected: list[list[int]]) -> int:
    n = len(isConnected)
    visited = [False] * n
    count = 0

    def dfs(u: int) -> None:
        visited[u] = True
        for v in range(n):
            if isConnected[u][v] and not visited[v]:
                dfs(v)

    for u in range(n):
        if not visited[u]:
            dfs(u)
            count += 1
    return count
```

**Time:** O(V²) (adjacency matrix). **Space:** O(V) recursion stack.

**Duplicate problems:**
- Number of Connected Components in an Undirected Graph (LC 323) - identical BFS/DFS outer-loop structure, graph given as edge list instead of matrix.
- Graph Valid Tree (LC 261) - same connected-components check with an extra cycle-detection step.

---

### 2. Critical Connections in a Network (LC 1192)

There are n servers and a list of undirected connections. A **critical connection** (bridge) is one whose removal makes some server unreachable. Find all bridges. Constraints: n, edges ≤ 10⁵.

**Approach:** Tarjan's bridge-finding algorithm - a close relative of SCC. Run DFS tracking `disc[]` and `low[]`. An edge (u, v) is a bridge if `low[v] > disc[u]` after DFS from u → v: no back edge in v's subtree reaches u or above, so the edge is the only connection. This exercises the Tarjan low-link intuition directly - the same mechanic as SCC but the condition is strict inequality (bridge) vs equality (SCC root).

```python
from collections import defaultdict

def criticalConnections(n: int, connections: list[list[int]]) -> list[list[int]]:
    graph: dict[int, list[int]] = defaultdict(list)
    for u, v in connections:
        graph[u].append(v)
        graph[v].append(u)

    disc = [-1] * n
    low = [0] * n
    timer = [0]
    bridges: list[list[int]] = []

    def dfs(u: int, parent: int) -> None:
        disc[u] = low[u] = timer[0]
        timer[0] += 1
        for v in graph[u]:
            if disc[v] == -1:
                dfs(v, u)
                low[u] = min(low[u], low[v])
                if low[v] > disc[u]:
                    bridges.append([u, v])
            elif v != parent:
                low[u] = min(low[u], disc[v])

    for u in range(n):
        if disc[u] == -1:
            dfs(u, -1)

    return bridges
```

**Time:** O(V + E). **Space:** O(V + E).

**Duplicate problems:**
- Articulation Points (classic graph problem, no LC number) - same Tarjan low-link, condition `low[v] >= disc[u]` for non-root nodes and degree check for root; same solution mechanic.

---

### 3. Largest Component Size by Common Factor (LC 952)

Given an array of positive integers `nums`, consider each integer as a node. Connect two nodes with an edge if they share a common factor > 1. Return the size of the largest connected component. Constraints: 1 ≤ nums[i] ≤ 10⁵, len(nums) ≤ 2×10⁴.

**Approach:** This is a connected-components problem (undirected), but the naive O(n²) pairwise GCD approach times out. Instead, use a Union-Find (DSU): for each number, factorize it and union the number with each prime factor. Then find the largest group. Exercises the insight that "connected component" thinking applies even when edges are implicit - the same outer-loop structure, but the graph is never materialized explicitly. Constraints (n ≤ 2×10⁴, values ≤ 10⁵) invite O(n·√max_val) factorization.

```python
from collections import defaultdict

def largestComponentSize(nums: list[int]) -> int:
    parent = list(range(max(nums) + 1))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x: int, y: int) -> None:
        parent[find(x)] = find(y)

    for num in nums:
        d = 2
        n = num
        while d * d <= n:
            if n % d == 0:
                union(num, d)
                while n % d == 0:
                    n //= d
            d += 1
        if n > 1:
            union(num, n)

    count: dict[int, int] = defaultdict(int)
    for num in nums:
        count[find(num)] += 1
    return max(count.values())
```

**Time:** O(n · √max_val · α(n)) where α is the inverse Ackermann from DSU. **Space:** O(max_val).

**Duplicate problems:**
- Accounts Merge (LC 721) - union emails by shared account; same DSU pattern, different surface (strings instead of integers).
- Redundant Connection (LC 684) - union-find cycle detection; same find/union core, condition is when both nodes already share a root.

---

### 4. Find Eventual Safe States (LC 802)

A directed graph of `n` nodes. A node is **safe** if every path from it eventually leads to a terminal node (no outgoing edges) and never enters a cycle. Return all safe nodes in sorted order. Constraints: n ≤ 10⁴, edges ≤ 4×10⁴.

**Approach:** A node is unsafe iff it lies in or can reach a cycle - i.e., it belongs to or has a path into an SCC of size > 1 (or a size-1 SCC with a self-loop). Run Tarjan to find all SCCs. In the condensation DAG, a node is safe iff its SCC is a singleton with no self-loop AND all SCCs reachable from it are also singletons with no self-loops. Traversing the condensation in reverse topological order (sinks first) marks safe SCCs in O(V + E). This is the canonical problem that requires the full SCC pipeline - recognition → condensation → DP on the DAG.

```python
from collections import defaultdict

def eventualSafeNodes(graph: list[list[int]]) -> list[int]:
    n = len(graph)
    disc = [-1] * n
    low = [0] * n
    on_stack = [False] * n
    stack: list[int] = []
    timer = [0]
    comp = [-1] * n   # SCC id per node
    scc_id = [0]
    has_self_loop: list[bool] = []
    scc_sizes: list[int] = []

    def dfs(u: int) -> None:
        disc[u] = low[u] = timer[0]
        timer[0] += 1
        stack.append(u)
        on_stack[u] = True
        for v in graph[u]:
            if disc[v] == -1:
                dfs(v)
                low[u] = min(low[u], low[v])
            elif on_stack[v]:
                low[u] = min(low[u], disc[v])
        if low[u] == disc[u]:
            members: list[int] = []
            self_loop = False
            while True:
                w = stack.pop()
                on_stack[w] = False
                comp[w] = scc_id[0]
                members.append(w)
                if w == u:
                    break
            for m in members:
                if comp[m] in [comp[v] for v in graph[m]]:
                    self_loop = True
            has_self_loop.append(self_loop)
            scc_sizes.append(len(members))
            scc_id[0] += 1

    for u in range(n):
        if disc[u] == -1:
            dfs(u)

    num_sccs = scc_id[0]
    safe_scc = [scc_sizes[i] == 1 and not has_self_loop[i] for i in range(num_sccs)]

    # propagate: an SCC is safe only if all SCCs it points to are safe
    scc_edges: set[tuple[int, int]] = set()
    for u in range(n):
        for v in graph[u]:
            if comp[u] != comp[v]:
                scc_edges.add((comp[u], comp[v]))
    for cu, cv in scc_edges:
        if not safe_scc[cv]:
            safe_scc[cu] = False

    return sorted(u for u in range(n) if safe_scc[comp[u]])
```

**Time:** O(V + E). **Space:** O(V + E).

**Duplicate problems:**
- Course Schedule II (LC 210) - topological sort on condensation DAG; same "build condensation, process in order" skeleton but goal is ordering, not safety.
- Detect Cycles in a Directed Graph (classic) - SCC of size > 1 ⟺ cycle; same Tarjan run, different termination condition.
