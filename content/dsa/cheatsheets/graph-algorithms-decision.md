# Graph Algorithms Decision Cheatsheet

Which graph algorithm for which graph shape/question.

> 📖 Full articles:
> [BFS](../algorithms/bfs.md) · [DFS](../algorithms/dfs.md) · [Strongly Connected Components](../algorithms/strongly-connected-components.md) · [Maximum Flow](../algorithms/maximum-flow.md) (hub) · [Ford-Fulkerson](../algorithms/ford-fulkerson.md) · [Edmonds-Karp](../algorithms/edmonds-karp.md) · [Dinic](../algorithms/dinic.md) · [Bipartite Matching](../algorithms/bipartite-matching.md)
> <!-- Uncomment once written: [Dijkstra](../algorithms/dijkstra.md) · [Bellman-Ford](../algorithms/bellman-ford.md) · [Floyd-Warshall](../algorithms/floyd-warshall.md) · [Minimum Spanning Tree](../algorithms/minimum-spanning-tree.md) · [Topological Sort](../algorithms/topological-sort.md) -->

## Decision table

| Condition | Pick | Why |
| --- | --- | --- |
| Unweighted graph, need shortest path / fewest steps | BFS | queue enforces distance ordering for free, O(V+E) |
| Need to explore all paths, detect cycles, or get finish-order | DFS | O(V+E), stack = ancestor chain, enables cycle/back-edge detection |
| Need maximal groups where every node reaches every other (directed) | SCC (Kosaraju or Tarjan) | O(V+E), two DFS passes or one pass with low-link |
| Need max flow, small graph, small guaranteed capacities | Ford-Fulkerson | simplest code, O(E·max_flow) - risky only if capacities are large |
| Need max flow, capacities large/unknown/adversarial | Edmonds-Karp | BFS-bounded augmenting path, O(VE²) independent of capacity |
| Need max flow, large/dense graph, or unit-capacity bipartite matching | Dinic | level graph + blocking flow, O(V²E) general, O(E√V) unit-cap |
| "Maximum pairs" / "maximum disjoint paths" / prerequisite-feasibility phrasing | Recognize as max-flow reduction first | reduce to a flow network, then pick from the 3 rows above by size/capacity |
<!-- | Weighted graph, non-negative edges, single source | Dijkstra | O((V+E) log V), priority-queue frontier | -->
<!-- | Weighted graph, negative edges allowed, need cycle detection | Bellman-Ford | O(VE), tolerates negative weights | -->
<!-- | Need shortest paths between ALL pairs, dense/small graph | Floyd-Warshall | O(V³), DP over intermediates | -->
<!-- | Need cheapest tree connecting all nodes | MST (Kruskal/Prim) | Kruskal sort+DSU or Prim PQ | -->
<!-- | Need a linear order respecting dependencies (DAG) | Topological Sort | Kahn's BFS or DFS post-order | -->

## Complexity

| Algorithm | Time | Space |
| --- | --- | --- |
| BFS | O(V + E) | O(V) |
| DFS | O(V + E) | O(V) |
| SCC (Kosaraju/Tarjan) | O(V + E) | O(V + E) |
| Ford-Fulkerson | O(E · max_flow) | O(V + E) |
| Edmonds-Karp | O(V E²) | O(V + E) |
| Dinic | O(V² E) general, O(E√V) unit-cap | O(V + E) |
<!-- | Dijkstra | O((V+E) log V) | O(V) | -->
<!-- | Bellman-Ford | O(V E) | O(V) | -->
<!-- | Floyd-Warshall | O(V³) | O(V²) | -->
<!-- | MST (Kruskal/Prim) | O(E log V) | O(V) | -->
<!-- | Topological Sort | O(V + E) | O(V) | -->

<!-- Uncomment the 5 rows above (in both tables) once dijkstra.md/bellman-ford.md/floyd-warshall.md/minimum-spanning-tree.md/topological-sort.md are filled, and add their links to the Full articles line above. -->

## Gotchas

- ⚠️ BFS on adjacency list is cache-hostile at n > 10⁶ - <abbr>pointer chasing</abbr> through scattered neighbor lists.
- ⚠️ Ford-Fulkerson's bound depends on the flow's numeric value, not graph size - can be catastrophically slow on large capacities even for a tiny graph.
- ⚠️ Mark-visited-on-dequeue instead of on-enqueue in BFS → duplicate enqueues, wrong distances.
