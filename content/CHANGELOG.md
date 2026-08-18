# Content Changelog

All notable changes to wiki articles. Filter by filename to track updates to a specific article.

## Format

```
## YYYY-MM-DD
- `filename.md` - what changed (new article / new section: "Section Name" / expanded: "Section Name" / new stub: "Topic")
```

## 2026-08-18
- `system-design/components/rate-limiter.md` - trimmed TLDR to Component word cap
- `system-design/components/search.md` - trimmed TLDR to Component word cap
- `system-design/components/databases.md` - fixed broken bloom-filter.md link to plain-text + pending-link comment
- `system-design/components/dns.md` - restructured Quick Decision Guide from bullet list to table
- `system-design/algorithms/bloom-filter.md` - filled stub: FP/FN mechanics, sizing formulas, variants (Counting/Cuckoo/Scalable/Blocked), LSM/SSTable usage
- `system-design/components/proxies.md` - filled stub: forward vs reverse, termination/tunneling/re-encryption, header rewriting, WebSocket upgrade, deployment contexts
- `system-design/components/jwt.md` - filled partial stub: mental model, Quick Decision Guide, Comparison Matrix, key-rotation mermaid diagram, Production Failure Modes, Interview Scenario Bank
- `system-design/components/service-discovery.md` - filled empty stub: registration/health-checking/resolution mechanics, registry consistency trade-offs, Comparison Matrix, Interview Scenario Bank

## 2026-08-16
- `system-design/hld/distributed-id-generator.md` - filled stub: Snowflake bit layout, worker ID leasing, clock skew handling, generation strategy trade-offs
- `system-design/hld/key-value-store.md` - filled stub: LSM-tree vs B-tree, consistent hashing + quorum consistency, LWW vs vector clocks, compaction deep-dive
- `system-design/components/metrics.md` - filled stub: metric types, push vs pull collection, cardinality cost, aggregation trade-offs
- `system-design/algorithms/sharding-strategies.md` - filled stub: range/hash/directory-based sharding, rebalancing cost per strategy, cross-shard operations, shard key selection
- `system-design/components/distributed-file-system.md` - filled stub: metadata/data split, metadata federation, rack-aware placement, HDFS HA failover mechanics
- `system-design/components/search.md` - filled stub: inverted index mechanics, TF-IDF/BM25 ranking, distributed scatter-gather search, indexing freshness
- `system-design/algorithms/consensus-raft-paxos.md` - filled stub: Paxos two-phase protocol, Raft leader election/log replication, quorum safety, split-brain vs stale-leader-read distinction
- `system-design/algorithms/rate-limiting-algorithms.md` - filled stub: token/leaky bucket, fixed/sliding window mechanics, complexity comparison, boundary spike problem
- `system-design/components/blob-object-storage.md` - filled stub: immutable-object model, multipart upload, erasure coding vs replication, storage-class selection

## 2026-08-15
- `system-design/components/dns.md` - filled stub: record types, resolution hierarchy, DNS as a traffic-steering layer, TTL failover limits
- `system-design/hld/distributed-cache.md` - filled stub: consistent-hash partitioning, async replication, eviction, rebalancing without a stampede
- `system-design/hld/url-shortener.md` - filled stub: distributed short-code generation, key-value storage, redirect-path caching
- `system-design/components/logging.md` - filled stub: structured logging, aggregation pipeline, storage/indexing trade-offs
- `system-design/algorithms/circuit-breaker.md` - filled stub: three-state failure detection, half-open recovery, fallback strategies
- `system-design/algorithms/replication-strategies.md` - filled stub: sync vs async replication, single/multi-leader/leaderless topologies, quorum reads/writes
- `system-design/components/databases.md` - filled stub: SQL vs NoSQL, B-tree vs LSM-tree storage engines, indexing, isolation levels
- `system-design/algorithms/acid-vs-base.md` - filled stub: ACID transaction guarantees vs BASE eventual-consistency model, isolation levels, real-world usage
- `system-design/algorithms/saga-pattern.md` - filled stub: distributed transactions via compensating actions, choreography vs orchestration
- `system-design/components/api-gateway.md` - filled stub: edge routing/auth/rate-limiting/transformation layer, gateway vs load balancer vs mesh
- `system-design/components/cdn.md` - filled stub: edge PoP topology, anycast/GeoDNS routing, cache invalidation propagation, origin offload
- `dsa/patterns/problem-solving-framework.md` - new article (cheatsheet): the clarify/plan/code/verify/optimize loop for an unseen interview problem
- `system-design/algorithms/idempotency.md` - new article: natural/key-based/server-derived idempotency, retriable vs idempotent, exactly-once vs idempotent consumers
- `dsa/algorithms/amortized-analysis.md` - new article: aggregate/accounting/potential-method proofs, worked dynamic-array doubling derivation
- `dsa/algorithms/divide-and-conquer.md`, `dsa/algorithms/counting-sort.md` - hygiene: stripped manual CLRS step numbers from pseudocode
- `dsa/data-structures/stack.md`, `dsa/data-structures/queue.md`, `dsa/data-structures/hash-set.md`, `dsa/algorithms/big-o-notation.md`, `dsa/data-structures/graph.md` - hygiene: replaced undefined snippet placeholder variables with literals/bound values
- `dsa/data-structures/queue.md` - restructure: removed duplicate "Design Circular Queue" worked Practice entry (already canonical on circular-buffer.md); merged duplicate Variants entries for circular buffer/queue naming
- 29 files across `dsa/data-structures/` - added cross-link to the Data Structure Selection cheatsheet at the end of each local Comparison section
- `dsa/data-structures/dynamic-array.md` - hygiene: fixed missing blank line between Prerequisites and Table of Contents headings
- `dsa/data-structures/interval-tree.md`, `dsa/algorithms/ford-fulkerson.md`, `dsa/algorithms/dfs.md`, `dsa/algorithms/number-theory.md` - linked prerequisite chips whose targets (Balanced BST, Edmonds-Karp, Recursion, Modular Arithmetic) now exist as written articles
- `dsa/data-structures/hash-table.md`, `dsa/data-structures/trie.md`, `dsa/data-structures/array.md`, `dsa/data-structures/dynamic-array.md` - linked inline cross-references (Balanced BST, Suffix Tree, Linked List, Hash Table, Heap) whose targets now exist

## 2026-08-14
- `dsa/data-structures/hash-set.md` - new article
- `dsa/data-structures/hash-table.md` - fix-gate: added on-page amortized-accounting proof for resize; new section: "What the interviewer probes for"
- `dsa/data-structures/deque.md` - fix-gate: added on-page amortized-accounting proof for ring-buffer resize; new section: "What the interviewer probes for"
- `dsa/data-structures/stack.md` - fix-gate: added on-page amortized-accounting proof for array-backed resize; new section: "What the interviewer probes for"
- `dsa/data-structures/heap.md` - add-section: at-scale Gotchas trap (cache-miss growth); new section: "What the interviewer probes for"
- `dsa/data-structures/lfu-cache.md` - add-section: at-scale Gotchas trap (bucket-map rehash stall + Zipfian concentration); new section: "What the interviewer probes for"
- `dsa/data-structures/binary-search-tree.md` - add-section: at-scale Gotchas trap (pointer-chasing depth); new section: "What the interviewer probes for"
- `dsa/data-structures/binary-tree.md` - fix-gate: Comparison table crossover thresholds added; new section: "What the interviewer probes for"
- `dsa/data-structures/trie.md` - fix-gate: Comparison table crossover thresholds added; new section: "What the interviewer probes for"
- `dsa/data-structures/array.md` - new section: "What the interviewer probes for"
- `dsa/data-structures/dynamic-array.md` - new section: "What the interviewer probes for"
- `dsa/data-structures/linked-list.md` - new section: "What the interviewer probes for"
- `dsa/data-structures/queue.md` - new section: "What the interviewer probes for"
- `dsa/data-structures/string.md` - new section: "What the interviewer probes for"
- `dsa/data-structures/graph.md` - new section: "What the interviewer probes for"
- `dsa/data-structures/b-plus-tree.md` - new section: "What the interviewer probes for"
- `dsa/data-structures/lru-cache.md` - new section: "What the interviewer probes for"
- `system-design/algorithms/consistency-models.md` - new article
- `dsa/data-structures/interval-tree.md` - fix-gate: qualified O(log n) claims throughout as balanced-tree-only with unbalanced worst-case noted; unified overlap convention mismatch between main implementation (closed) and My Calendar I practice problem (half-open)
- `dsa/data-structures/lru-cache.md` - fix-gate: added duplicate-problems line to "LRU Cache" practice problem; expanded "Memory layout" with hashing/collisions depth and full amortized rehash accounting
- `dsa/data-structures/linked-list.md` - expanded: "Implementation" - added `LIST-APPEND` and `LIST-INSERT-AFTER` pseudocode + `insert_after` Python method
- `dsa/data-structures/skip-list.md` - expanded: "Operations" - added Space column; "Traversal & invariant" - added base case and inductive step to search invariant proof
- `dsa/data-structures/segment-tree.md` - new article
- `dsa/data-structures/circular-buffer.md` - expanded: "Comparison", "CP-primitives", "What the interviewer probes for" added; Practice problems rewritten as full worked entries
- `dsa/data-structures/b-plus-tree.md` - expanded: "Leaf-split invariant proof (induction)" added under Traversal & invariant
- `dsa/algorithms/big-o-notation.md` - new article
- `dsa/data-structures/avl-tree.md` - restructured: DS spine (Operations, Complexity summary, Variants, CP-primitives added; Algo-shaped headings folded into family section)
- `dsa/data-structures/b-tree.md` - restructured: DS spine (Operations, Complexity summary, Variants, CP-primitives added; Algo-shaped headings folded into family section)
- `dsa/data-structures/red-black-tree.md` - restructured: DS spine (Operations, Complexity summary, Variants, CP-primitives added; Algo-shaped headings folded into family section)
- `dsa/data-structures/graph.md` - new section: "CP-primitives"; expanded: "Comparison" - crossover conditions per row; expanded: "Implementation" - explicit DFS recursion stack space
- `dsa/data-structures/union-find.md` - expanded: "Traversal & invariant" - array-vs-explicit-node representation note
- `dsa/index.md` - new row: Big-O Notation
- 28 files across `dsa/data-structures/` and `dsa/algorithms/` - fixed dangling Big-O Notation prerequisite links now that the target article exists
- 49 files across `dsa/data-structures/` and `dsa/patterns/` - restructured: merged `CP-primitives` section into Practice problems as full worked entries or duplicate-problems lines; section removed article-wide; all Practice-problem titles made technique-neutral (no longer name the solving approach)
- `system-design/index.md` - fixed broken table rows for Session-Based Authentication, JWT, OAuth 2.0 & OIDC, MFA, Service-to-Service Authentication, mTLS - registered 6 already-written but unlisted articles
- `data/glossary.json` - expanded from 30 to 55 terms (24 new CS/system-design terms added, e.g. monotonic stack, quorum, leader election, back-of-the-envelope)
- 111 files across `dsa/**` and `system-design/**` - wrapped glossary terms in `<abbr>` where they appear in prose, per expanded glossary.json

## 2026-08-12
- `dsa/index.md` - new section: "Learning Paths" - links the 3 existing track pages

## 2026-08-01
- `stack.md`, `array.md`, `linked-list.md`, `hash-table.md`, `heap.md`, `trie.md`, `recursion.md`, `dynamic-programming.md`, `greedy.md`, `two-pointers.md`, `caching.md`, `load-balancer.md`, `cap-theorem.md` - wrapped glossary terms in `<abbr>`

## 2026-07-31
- DSA data-structures (25 files) - expanded: "Practice problems" - retrofitted worked examples, Constraints line, deduped/fixed entries per merged spec
- `dsa/data-structures/suffix-array.md` - expanded: "Practice problems" - retrofitted worked examples, fixed label formatting
- `dsa/data-structures/dynamic-array.md` - new section: "Practice problems" - 7 entries, 3 migrated from a mis-filed block
- DSA algorithms (33 files) - expanded: "Practice problems" - retrofitted worked examples, deduped near-duplicate entries, added new entries
- DSA patterns (23 files) - expanded: "Practice problems" - merged legacy worked/practice sections, per-file distinct-technique selection
- `dsa/patterns/top-k-elements.md` - new article: size-k heap over a stream, quickselect/two-heaps/k-way-merge disambiguation
- `dsa/data-structures/treap.md` - new article: BST + randomized heap-priority balancing, implicit-treap CP variant
- `dsa/data-structures/suffix-tree.md` - new article: compressed suffix trie, Ukkonen's O(n) construction, generalized suffix tree
- `dsa/data-structures/suffix-array.md` deleted, merged into `suffix-tree.md` as new section: "Suffix array (array-based variant)"

## 2026-07-25
- `dsa/algorithms/dijkstra.md` - new article: shortest paths with a priority queue, finalized-node correctness proof
- `dsa/patterns/tree-graph-traversal.md` - new article: BFS/DFS recognition + transfer layer
- `dsa/patterns/merge-intervals.md` - new article: sort-and-sweep, meeting-rooms heap variant, insert-interval
- `dsa/cheatsheets/complexity-master.md` - new article: DS+algorithm Big-O aggregator
- `dsa/cheatsheets/sorting-comparison.md` - new article: all 6 filled sorts compared
- `dsa/cheatsheets/graph-algorithms-decision.md` - new article: BFS/DFS/SCC/max-flow decision table
- `dsa/cheatsheets/dp-recognition.md` - new article: problem shape → DP state signature
- `dsa/cheatsheets/data-structure-selection.md` - new article: "need fast X+Y" → structure, 27 structures
- `dsa/cheatsheets/input-size-complexity-lookup.md` - new article: n → feasible Big-O → algorithm class
- `dsa/cheatsheets/string-algorithm-decision.md` - new article: string algorithm decision table
- `dsa/cheatsheets/two-pointers-vs-window-vs-prefix-sum.md` - new article: disambiguator between the three patterns
- `dsa/cheatsheets/complexity-growth-reference.md` - new article: growth-curve diagram + real-n counts
- `dsa/cheatsheets/greedy-vs-dp-disambiguator.md` - new article: exchange argument vs overlapping subproblems
- `dsa/cheatsheets/backtracking-shapes.md` - new article: subset/permutation/combination/partition loop shapes
- `dsa/cheatsheets/bit-manipulation-tricks.md` - new article: bit trick lookup table
- `dsa/cheatsheets/number-theory-reference.md` - new article: GCD/LCM/modular arithmetic/sieve reference
- `dsa/patterns/pattern-selection-cheatsheet.md` - filled (was empty template): trigger phrase → pattern
- `dsa/index.md` - new section: "Cheatsheets", links all 13 new cheatsheet pages

## 2026-07-18
- `recursion.md` - new article: base case + recursive case as induction
- `binary-search-on-answer.md` - new article: minimize-max/maximize-min feasibility search
- `fast-slow-pointers.md` - new article: Floyd's cycle detection, implicit-sequence variants
- `monotonic-stack.md` - new article: next-greater/smaller via amortized O(n) stack
- `prefix-sum.md` - new article: O(1) range-sum queries, 2D inclusion-exclusion

## 2026-07-10
- `longest-increasing-subsequence.md` - new article
- `aho-corasick.md` - new article
- `longest-common-subsequence.md` - new article
- `dinic.md` - new article

## 2026-07-09
- `monotonic-queue.md` - new article: sliding-window max/min via monotonic deque
- `string-hashing.md` - new article: polynomial prefix hashing, O(1) substring equality
- `manacher-algorithm.md` - new article: O(n) longest palindromic substring

## 2026-07-07
- `ford-fulkerson.md` - new article: max-flow via DFS augmenting paths
- `edmonds-karp.md` - new article: Ford-Fulkerson with BFS augmenting paths
- `maximum-flow.md` - hub completed: survey and decision layer for max-flow
- `fenwick-tree.md` - new article: BIT point-update and prefix-sum in O(log n)
- `lowest-common-ancestor.md` - new article: binary lifting for O(log n) LCA
- `dsa_check.py` - fixed: link check now strips HTML comments before scanning
- `bipartite-matching.md` - new article: Kuhn's and Hopcroft-Karp augmenting-path matching
- `skip-list.md` - new article: randomized express-lane linked list
- `ford-fulkerson.md` / `edmonds-karp.md` - fixed buggy path-reconstruction code

## 2026-07-06
- `euclidean-gcd.md` - new article: derivation, correctness proof, worked problems
- `sieve-of-eratosthenes.md` - new article: variants, worked problems
- `euclidean-gcd.md` / `sieve-of-eratosthenes.md` - post-ship polish: comparison tables, extra probes
- `number-theory.md` - wired live cross-links to GCD, mod-exp, sieve
- `data-structures/fenwick-tree.md` - deleted empty stub; removed dead cross-links
- `data-structures/treap.md` - deleted empty stub; updated deferred-content note
- `algorithms/dinic.md` - deleted empty stub; removed row from index

## 2026-07-03
- `dfs.md` - new article: DFS traversal, correctness proof, worked problems
- `bfs.md` - new article: BFS traversal, 0-1 and multi-source variants

## 2026-07-02
- `union-find.md` - new article: path compression and rank
- `bit-manipulation.md` - new article: operators, tricks, worked problems
- `difference-array.md` - expanded: swapped worked problem, added usage and cache notes
- `meet-in-the-middle.md` - new article: split-enumerate-combine pattern with worked problems

## 2026-06-30
- `rabin-karp.md` - new article: rolling-hash pattern search
- `modular-exponentiation.md` - new article: binary exponentiation, modular inverse, overflow traps
- `suffix-array.md` - new article: prefix-doubling build, Kasai LCP, applications
- `k-way-merge.md` - new article: k-way merge pattern via min-heap
- `interval-dp.md` - new article: interval DP pattern with Knuth-Yao speedup
- `state-machine-dp.md` - new article: state-machine DP pattern, rolling-array variants

## 2026-06-29
- `graph-coloring.md` - new article: bipartite check, chromatic number
- `in-place-reversal.md` - new article: in-place linked-list reversal pattern

**What gets logged:** new article, new section, expanded/rewritten section, new stub.  
**What doesn't:** typo fixes, grammar, cross-reference links.

---

## 2026-06-24
- `interval-tree.md` - expanded stub to full article: augmented BST, overlap search
- `two-heaps.md` - expanded stub to full article: median-stream pattern
- `kadane.md` - expanded stub to full article: extend-or-restart DP, edge cases
- `modified-binary-search.md` - new article: rotated search, peak finding
- `strongly-connected-components.md` - expanded stub to full article: Kosaraju and Tarjan
- `sliding-window.md` - new article: fixed, variable, minimum-window templates
- `two-pointers.md` - new article: opposite-ends, same-direction, three-way-partition patterns

## 2026-06-23
- `bitmask-dp.md` - new article: TSP skeleton, SOS DP, 3 worked problems
- `bloom-filter.md` - new article: false-positive rate derivation, variants, worked problems

## 2026-06-22
- `dsa/patterns/frequency-array.md` - expanded
- `dsa/patterns/matrix-traversal.md` - promoted from stub; added ZERO-ONE-BFS, Dijkstra-on-grid entries

## 2026-06-21
- `dsa/algorithms/dinic.md` - new stub
- `dsa/algorithms/divide-and-conquer.md` - new article
- `dsa/algorithms/edmonds-karp.md` - new stub
- `dsa/algorithms/euclidean-gcd.md` - new stub
- `dsa/algorithms/ford-fulkerson.md` - new stub
- `dsa/algorithms/kadane.md` - new stub
- `dsa/algorithms/maximum-flow.md` - new stub
- `dsa/algorithms/modular-exponentiation.md` - new stub
- `dsa/algorithms/number-theory.md` - new article
- `dsa/algorithms/rabin-karp.md` - new stub
- `dsa/algorithms/sieve-of-eratosthenes.md` - new stub
- `dsa/data-structures/b-plus-tree.md` - new stub
- `dsa/data-structures/bloom-filter.md` - new stub
- `dsa/data-structures/interval-tree.md` - new stub
- `dsa/data-structures/suffix-array.md` - new stub
- `dsa/data-structures/treap.md` - new stub
- `dsa/patterns/bitmask-dp.md` - new stub
- `dsa/patterns/frequency-array.md` - new stub
- `dsa/patterns/in-place-reversal.md` - new stub
- `dsa/patterns/matrix-traversal.md` - new stub
- `dsa/patterns/state-machine-dp.md` - new stub
- `dsa/patterns/two-heaps.md` - new stub

## 2026-06-20
- `dsa/algorithms/backtracking.md` - expanded
- `dsa/algorithms/dynamic-programming.md` - expanded
- `dsa/algorithms/greedy.md` - expanded
- `dsa/algorithms/string-matching.md` - new article
- `dsa/algorithms/z-algorithm.md` - new article
- `dsa/data-structures/deque.md` - new article
- `dsa/data-structures/lfu-cache.md` - new article
- `dsa/data-structures/lru-cache.md` - new article
- `dsa/patterns/backtracking.md` - new article

## 2026-06-18
- `dsa/algorithms/backtracking.md` - new stub
- `dsa/algorithms/bellman-ford.md` - new stub
- `dsa/algorithms/bfs.md` - new stub
- `dsa/algorithms/bit-manipulation.md` - new stub
- `dsa/algorithms/bucket-sort.md` - new stub
- `dsa/algorithms/dfs.md` - new stub
- `dsa/algorithms/dijkstra.md` - new stub
- `dsa/algorithms/dynamic-programming.md` - new stub
- `dsa/algorithms/floyd-warshall.md` - new stub
- `dsa/algorithms/greedy.md` - new stub
- `dsa/algorithms/minimum-spanning-tree.md` - new stub
- `dsa/algorithms/quickselect.md` - new stub
- `dsa/algorithms/recursion.md` - new stub
- `dsa/algorithms/selection-sort.md` - new stub
- `dsa/algorithms/topological-sort.md` - new stub
- `dsa/data-structures/avl-tree.md` - new article
- `dsa/data-structures/b-tree.md` - new article
- `dsa/data-structures/balanced-bst.md` - new article
- `dsa/data-structures/binary-search-tree.md` - new article
- `dsa/data-structures/binary-tree.md` - new article
- `dsa/data-structures/fenwick-tree.md` - new stub
- `dsa/data-structures/graph.md` - new stub
- `dsa/data-structures/hash-set.md` - new stub
- `dsa/data-structures/hash-table.md` - new article
- `dsa/data-structures/linked-list.md` - new article
- `dsa/data-structures/queue.md` - new article
- `dsa/data-structures/red-black-tree.md` - new article
- `dsa/data-structures/segment-tree.md` - new stub
- `dsa/data-structures/stack.md` - new article
- `dsa/data-structures/string.md` - new article
- `dsa/data-structures/trie.md` - new article
- `dsa/data-structures/union-find.md` - new stub
- `dsa/patterns/binary-search-on-answer.md` - new stub
- `dsa/patterns/cyclic-sort.md` - new stub
- `dsa/patterns/dp-patterns.md` - new stub
- `dsa/patterns/fast-slow-pointers.md` - new stub
- `dsa/patterns/merge-intervals.md` - new stub
- `dsa/patterns/monotonic-stack.md` - new stub
- `dsa/patterns/prefix-sum.md` - new stub
- `dsa/patterns/sliding-window.md` - new stub
- `dsa/patterns/subsets-permutations.md` - new stub
- `dsa/patterns/top-k-elements.md` - new stub
- `dsa/patterns/tree-graph-traversal.md` - new stub
- `dsa/patterns/two-pointers.md` - new stub

## 2026-06-17
- `dsa/algorithms/binary-search.md` - new article
- `dsa/algorithms/counting-sort.md` - new article
- `dsa/algorithms/heapsort.md` - new article
- `dsa/algorithms/insertion-sort.md` - new article
- `dsa/algorithms/merge-sort.md` - new article
- `dsa/algorithms/quicksort.md` - new article
- `dsa/algorithms/radix-sort.md` - new article
- `dsa/algorithms/sorting.md` - new article
- `dsa/data-structures/heap.md` - new article

## 2026-06-16
- `dsa/data-structures/array.md` - new article
- `dsa/data-structures/circular-buffer.md` - new article
- `dsa/data-structures/dynamic-array.md` - new article

## 2026-05-25
- `system-design/components/rate-limiter.md` - new article

## 2026-05-05
- `system-design/components/authentication.md` - new article
- `system-design/components/jwt.md` - new article
- `system-design/components/logging.md` - new stub
- `system-design/components/metrics.md` - new stub
- `system-design/components/mtls.md` - new article
- `system-design/components/observability.md` - new article
- `system-design/components/tracing.md` - new stub

## 2026-05-04
- `system-design/algorithms/acid-vs-base.md` - new stub
- `system-design/algorithms/bloom-filter.md` - new stub
- `system-design/algorithms/cap-theorem.md` - new article
- `system-design/algorithms/saga-pattern.md` - new stub
- `system-design/components/api-gateway.md` - new stub
- `system-design/components/caching.md` - new article
- `system-design/components/cdn.md` - new stub
- `system-design/components/databases.md` - new stub
- `system-design/components/dns.md` - new stub
- `system-design/components/load-balancer.md` - new article
- `system-design/components/message-queues.md` - new article
- `system-design/components/proxies.md` - new stub
- `system-design/components/rate-limiter.md` - new stub
- `system-design/components/search.md` - new stub
- `system-design/hld/distributed-cache.md` - new stub
- `system-design/hld/key-value-store.md` - new stub
- `system-design/hld/notification-system.md` - new stub
- `system-design/hld/payment-system.md` - new stub
- `system-design/hld/search-autocomplete.md` - new stub
- `system-design/hld/ticketmaster-booking.md` - new stub
- `system-design/hld/twitter-news-feed.md` - new stub
- `system-design/hld/uber-ride-sharing.md` - new stub
- `system-design/hld/url-shortener.md` - new stub
- `system-design/hld/web-crawler.md` - new stub
- `system-design/hld/whatsapp-chat-system.md` - new stub
