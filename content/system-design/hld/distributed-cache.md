# Design: Distributed Cache

## Prerequisites

- **[Caching](../components/caching.md)** [Must read]
- **[Consistent Hashing](../algorithms/consistent-hashing.md)** [Must read]
- **[Replication Strategies](../algorithms/replication-strategies.md)** [Should read]

## Table of Contents

- [TLDR](#tldr)
- [Requirements & Scope](#requirements--scope)
- [Capacity Estimation](#capacity-estimation)
- [High-Level Architecture](#high-level-architecture)
- [Data Partitioning & Rebalancing](#data-partitioning--rebalancing)
- [Replication & Consistency](#replication--consistency)
- [Eviction & Memory Management](#eviction--memory-management)
- [Reliability & Fault Tolerance](#reliability--fault-tolerance)
- [Scalability & Performance](#scalability--performance)
- [Deep-Dive: Rebalancing Without a Stampede](#deep-dive-rebalancing-without-a-stampede)
- [Observability](#observability)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Trade-off Summary](#trade-off-summary)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

## TLDR

A distributed cache is a cluster of in-memory nodes that together hold far more data than one machine can, using consistent hashing to shard keys and replication to survive node loss. The core architectural challenge is that a cache's entire value proposition is speed, so every mechanism protecting availability or consistency (replication, rebalancing, coordination) has to cost almost nothing on the read path - unlike a database, you cannot trade latency for durability here without defeating the point of the system.

## Requirements & Scope

**Functional requirements:**
- `GET(key)`, `SET(key, value, ttl)`, `DELETE(key)` with sub-millisecond typical latency.
- Automatic sharding across nodes as the dataset or traffic grows.
- Graceful handling of node failure without a full cache wipe.

**Non-functional requirements:**
- **Latency over durability** - a cache miss just falls through to the backing store; losing a shard's data on a node crash is acceptable, losing 10ms of tail latency on every read is not. This is the opposite trade-off priority of a primary database.
- **Availability over strict consistency** - stale reads for a bounded window are acceptable (this is a cache, not the source of truth); an unavailable cache that forces every request to the backing store during a partition is the actual failure mode to avoid. AP over CP, explicitly, because the backing store remains the consistency source of truth.
- **Horizontal scalability** - adding nodes must redistribute load without a full-cluster resize event; see [Data Partitioning & Rebalancing](#data-partitioning--rebalancing).
- **Security**: cache nodes sit inside the private network/VPC, not internet-facing; authn is typically a shared cluster secret or mTLS between app servers and cache nodes rather than per-request user auth, since the cache holds derived/non-authoritative data. Encrypt in transit if the cache crosses AZ/region boundaries; encryption at rest is often skipped by design since the entire dataset is a disposable, regeneratable cache of the backing store - state this explicitly as a scoped-out decision, not silence.

**Out of scope:** the backing store's own durability and consistency; user-facing authentication (this is an internal infra component).

## Capacity Estimation

**Users:** 50M DAU on the upstream service · **Read/Write ratio:** 20:1 (cache-heavy read workload) · **Peak QPS:** ~40K reads/sec, ~2K writes/sec at peak (3x average) · **Storage:** 10M hot keys × ~2KB average value = ~20GB working set · **Bandwidth:** 40K QPS × 2KB ≈ 80MB/s peak egress · **Key constraint:** memory capacity per node, not CPU or network - a distributed cache is provisioned for RAM headroom first; 20GB working set fits comfortably split across even 4-6 mid-size nodes with room for replication overhead, but a working set that outgrows available cluster RAM causes evictions to outpace hit rate regardless of node count added carelessly (see [Deep-Dive](#deep-dive-rebalancing-without-a-stampede)).

## High-Level Architecture

```
                    ┌──────────────┐
  App Server ──────▶│ Cache Client │──── consistent-hash(key) ────┐
                    │  (routing)   │                              │
                    └──────────────┘                              ▼
                                              ┌─────────┐    ┌─────────┐    ┌─────────┐
                                              │ Node A  │    │ Node B  │    │ Node C  │
                                              │ (+ repl)│    │ (+ repl)│    │ (+ repl)│
                                              └─────────┘    └─────────┘    └─────────┘
                                                    │              │              │
                                                    └────── gossip / cluster ─────┘
                                                           membership protocol
```

Read path (sequence view):

```
Client → Cache Client (hash key → node) → Cache Node
  Cache Node: key found?  → HIT → return value (µs-ms)
  Cache Node: key absent? → MISS → return null
Client (on MISS) → Backing Store (DB) → gets value → SET into cache → return to caller
```

Two dominant client-routing models: a **smart client** (app-side library holds the hash ring, talks directly to the right node - lowest latency, no proxy hop) versus a **proxy layer** (e.g. Twemproxy/Envoy in front of the cluster - simpler clients, one more network hop, and a proxy tier to operate). Most large-scale deployments (Twitter, Instagram-era Memcached fleets) use smart clients specifically to avoid that extra hop at this QPS.

## Data Partitioning & Rebalancing

Keys are distributed using [consistent hashing](../algorithms/consistent-hashing.md) rather than `hash(key) % N` - the modulo approach remaps nearly every key when `N` changes, causing a near-total cache wipe on every scale event. Consistent hashing with virtual nodes bounds remapping to roughly `1/N` of keys per node added or removed.

> ⚖️ **Decision Framework**
> Consistent hashing (virtual nodes) vs. static sharding (fixed key ranges per shard, e.g. Redis Cluster's 16384 hash slots): consistent hashing rebalances automatically and gradually; static hash-slot sharding gives predictable, explicit control over which keys live where (useful for manual capacity planning) at the cost of a coordinated resharding step to move slot ownership. Redis Cluster picks the static-slot model specifically for that predictability; most homegrown Memcached-style clusters pick consistent hashing for its lower operational overhead.

## Replication & Consistency

Each shard's data is typically replicated to 1-2 replica nodes (leader-follower, async replication is standard - see [Replication Strategies](../algorithms/replication-strategies.md)) so a single node failure doesn't wipe that shard's hot keys. Because this is a cache and not the system of record, **async replication is the default choice** - waiting for replica acknowledgment on every write would add latency for a durability guarantee the cache doesn't actually need (a lost write just means a future cache miss, not data loss, since the backing store still has it).

> 🧠 **Thought Process**
> A candidate reaching for synchronous replication "to be safe" is applying database instincts to a cache. The correct question isn't "how do we prevent losing this write" - it's "what's the cost of losing this write?" For a cache, that cost is one extra read-through to the backing store on the next access. That asymmetry is what licenses async replication and looser consistency everywhere in this design.

## Eviction & Memory Management

When a node's memory fills, an eviction policy reclaims space - LRU (Least Recently Used) is the default for general workloads; LFU (Least Frequently Used) suits workloads with a stable hot set and occasional bursty one-off reads that shouldn't evict the hot set. TTLs provide a second, independent expiration mechanism (a key can be evicted for space *or* expire on schedule, whichever comes first).

> ⚠️ **Gotcha**
> Setting every key's TTL to the same value creates a **thundering herd on expiry** - a large batch of keys set at deploy time all expire simultaneously, sending a synchronized wave of cache misses to the backing store. Fix: jitter TTLs (`base_ttl + random(0, jitter_window)`) so expirations spread out.

## Reliability & Fault Tolerance

- **Node failure detection** - cluster membership via a gossip protocol (each node periodically exchanges liveness state with peers) or a coordination service (ZooKeeper/etcd); a node missing enough heartbeats is marked down and its keys' ownership shifts to its replica or the next node on the hash ring.
- **Graceful degradation on cache unavailability** - the application layer must be built to survive the cache being fully down (fall through to the backing store for every request); a cache outage should degrade latency, not become a total outage. This is a design requirement on the *caller*, not just the cache cluster.
- **Split-brain during partition** - if the cluster splits into two membership views, both sides may believe they own a key range; resolved either by a coordination service acting as source of truth for membership, or accepting the staleness (since this is a cache, not a CP system) and letting normal TTL/write-through reconcile it.

## Scalability & Performance

- **Read-heavy scaling**: add replica nodes and route reads across replicas (eventually consistent with the leader) to multiply read throughput without touching the partition scheme.
- **Write-heavy or dataset-growth scaling**: add shards (more partitions on the consistent-hash ring), which requires the rebalancing dance below.
- **Hot key problem**: consistent hashing distributes *keys* evenly, not *traffic* - a single viral key (e.g. a trending post) can overwhelm the one node that owns it regardless of cluster size. Mitigated by client-side local caching of the hottest keys, or explicit key replication (writing the same hot value under N sharded key variants and randomly picking one on read).

## Deep-Dive: Rebalancing Without a Stampede

Adding a node to the ring is the trickiest operational moment: naively, the new node starts empty and every request routed to it is a guaranteed miss until its share of keys is populated, producing a burst of backing-store load exactly when the cluster is already mid-change.

Two mitigations, usually combined:
1. **Gradual traffic shifting** - route a small percentage of the new node's key range to it initially, ramping up, rather than flipping the hash ring atomically.
2. **Pre-warming** - before serving traffic, the new node proactively pulls its assigned key range from the node(s) that previously owned it (or from the backing store), so it isn't starting cold.

> ⚠️ **Gotcha**
> Rebalancing during peak traffic compounds the stampede - the newly-assigned node is simultaneously cold *and* absorbing peak load. Production rebalancing is typically scheduled for low-traffic windows or throttled explicitly (cap the rate of key migration) even if it takes longer wall-clock time.

## Observability

- **Hit ratio** (per-node and cluster-wide) - the primary health signal; a dropping hit ratio under stable traffic usually means either eviction pressure (undersized cluster) or a hot-key/rebalancing event.
- **Per-node memory utilization** - tracked to catch imbalance (one node holding disproportionately more keys, usually a sign of a hashing bug or a hot key skew, not normal variance).
- **Eviction rate** - a rising eviction rate under a flat working-set size signals the cluster needs more memory headroom before hit ratio visibly degrades.
- **Replication lag** (async replicas) - bounds how stale a replica read can be; alerted on separately from application-facing latency.

## Production Failure Modes & Gotchas

- **Cache stampede on a single key** - many concurrent requests for the same expired/missing key all miss simultaneously and hammer the backing store at once. Mitigated with request coalescing (single in-flight fetch, others wait on it) or probabilistic early expiration.
- **Cascading failure into the backing store** - if the cache goes down entirely with no circuit breaker, 100% of traffic hits the database instantly, often taking it down too (this is the most common real-world cache-outage incident pattern). A [circuit breaker](../algorithms/circuit-breaker.md) or shed-load strategy on the backing store path is the actual mitigation, not the cache design itself.
- **Serialization/deserialization overhead dominating at scale** - at high QPS, CPU time spent serializing values (especially large objects) can rival network time; binary formats over JSON are a common late-stage optimization.

### Common Misconceptions

- "A distributed cache guarantees the same key always hits the same node forever" - false once cluster membership changes; consistent hashing minimizes remapping but doesn't eliminate it.
- "Caching makes the system eventually consistent with the database automatically" - no, a write-around or lazily-invalidated cache can serve stale data indefinitely if nothing ever triggers invalidation; consistency is a property of the invalidation strategy, not an automatic side effect of caching.

## Trade-off Summary

| Decision | Options Considered | Choice | Why |
| --- | --- | --- | --- |
| Partitioning scheme | Modulo hashing, static hash-slot sharding, consistent hashing | Consistent hashing (virtual nodes) | Bounds remapping to ~1/N of keys on scale events; avoids full-cluster wipe modulo hashing causes |
| Replication mode | Synchronous, asynchronous | Asynchronous | Cache correctness tolerates a lost write (backing store is source of truth); sync replication would add write latency for a durability guarantee not needed here |
| Consistency model | Strong, eventual | Eventual (AP) | Cache's job is speed and availability; strict consistency isn't required since the backing store remains authoritative |
| Client routing | Smart client, proxy layer | Smart client | Avoids the extra network hop a proxy adds at 40K QPS peak; accepted cost is routing-logic duplication across app services |
| Eviction policy | LRU, LFU | LRU (default), LFU where hot-set is stable | LRU is the safer general default; LFU chosen only where a bursty one-off read pattern would otherwise evict the genuinely hot set |
| Rebalancing strategy | Atomic ring flip, gradual shift + pre-warm | Gradual shift + pre-warm | Atomic flip creates an instant stampede of misses on the new node; gradual shift trades rebalance duration for avoiding backing-store overload |

## Interview Scenario Bank

> 🗣️ **First 30 seconds**
> "Before I design this, I'd confirm: is this a general-purpose cache in front of a database, or a specific workload (session store, rate-limiter counters)? Assuming general-purpose read-through caching with a large working set - the core tension is that everything protecting availability or consistency here has to cost almost nothing on the read path, or the cache stops being faster than just hitting the database. I'll size the working set, then build up partitioning, replication, and eviction from that."

> 🎯 **Interview Lens**
> **Q:** Design a distributed cache for a service doing 40K reads/sec. Walk through the architecture.
> **Ideal answer:** Start from requirements (latency-first, availability over strict consistency), size the working set, then build up: consistent hashing for partitioning, async replication for fault tolerance without write-latency cost, smart client for routing, LRU eviction with jittered TTLs, and explicit fallback-to-backing-store behavior in the app layer for when the cache is unavailable.
> **Common trap:** Jumping straight to "use Redis Cluster" without justifying the partitioning/replication/consistency trade-offs that make it the right choice, or over-engineering strong consistency into a system that doesn't need it.
> **Next question:** A single key is suddenly getting 10x the traffic of any other key. What happens, and how do you fix it?

> 🎯 **Interview Lens**
> **Q:** You add 3 new nodes to a 10-node cluster to handle growth. What happens immediately after, and what could go wrong?
> **Ideal answer:** With consistent hashing, roughly 3/13 of keys remap to the new nodes; those nodes start cold, so every request routed to them is a guaranteed miss until pre-warmed, producing a burst of backing-store load. Mitigate with gradual traffic shifting and pre-warming, ideally scheduled off-peak.
> **Common trap:** Assuming consistent hashing means zero disruption on scale-out - it minimizes remapping, it doesn't eliminate the cold-start stampede for the keys that do move.
> **Next question:** How would you detect that a rebalancing event is currently in progress and causing a hit-ratio dip, versus a genuine capacity problem?

> 🎯 **Interview Lens**
> **Q:** The cache cluster goes fully down. What's the blast radius, and how do you prevent it from taking down the whole system?
> **Ideal answer:** Without protection, 100% of previously-cached read traffic falls through to the backing store instantly, which can overload and take down the database too - a cascading failure. Protect with a circuit breaker or load-shedding on the backing-store path, and capacity-plan the backing store to survive a full cache-miss burst for some bounded window.
> **Common trap:** Treating the cache outage as the end of the analysis instead of tracing the cascading effect on the backing store.
> **Next question:** How would you size the backing store's capacity to survive a full cache outage, and is that even the right target to design for?

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| TTL | Time To Live | Duration a cached value stays valid before expiring |
| LRU | Least Recently Used | Eviction policy removing the longest-unaccessed key first |
| LFU | Least Frequently Used | Eviction policy removing the least-accessed key first |
| AP | Availability + Partition tolerance | CAP-theorem stance prioritizing uptime over strict consistency during a partition |

### Anti-patterns

- Synchronous cross-node replication for cache writes - adds latency for a durability guarantee the cache doesn't need; use async replication instead.
- Uniform TTLs across a large batch of keys set together - causes synchronized mass-expiry stampedes; jitter TTLs instead.
- No circuit breaker between the app and the backing store - turns a cache outage into a cascading database outage; add load-shedding/circuit-breaking on that path.

### Selection Matrix

| | Consistent Hashing | Static Hash-Slot Sharding |
| --- | --- | --- |
| Rebalance cost on scale event | ~1/N keys remap automatically | Explicit slot-migration step required |
| Operational predictability | Lower - ring topology shifts implicitly | Higher - explicit slot-to-node mapping |
| Example | Homegrown Memcached fleets | Redis Cluster (16384 fixed hash slots) |
