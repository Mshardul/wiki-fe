# Design: Key-Value Store

## Prerequisites

- **[Consistent Hashing](../algorithms/consistent-hashing.md)** [Must read]
- **[Replication Strategies](../algorithms/replication-strategies.md)** [Must read]
- **[CAP Theorem](../algorithms/cap-theorem.md)** [Should read]
- **[B-Plus Tree](../../dsa/data-structures/b-plus-tree.md)** [Should read]

## Table of Contents

- [TLDR](#tldr)
- [Requirements & Scope](#requirements--scope)
- [Capacity Estimation](#capacity-estimation)
- [High-Level Architecture](#high-level-architecture)
- [Storage Engine: LSM-Tree vs B-Tree](#storage-engine-lsm-tree-vs-b-tree)
- [Partitioning & Replication](#partitioning--replication)
- [Consistency & Conflict Resolution](#consistency--conflict-resolution)
- [Reliability & Fault Tolerance](#reliability--fault-tolerance)
- [Scalability & Performance](#scalability--performance)
- [Deep-Dive: Compaction Without Stalling Writes](#deep-dive-compaction-without-stalling-writes)
- [Observability](#observability)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Trade-off Summary](#trade-off-summary)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

## TLDR

A distributed key-value store is a sharded, replicated cluster exposing `get(key)`/`put(key, value)` with no joins or range-scan requirements beyond the key itself - the core architectural challenge is that this simplicity at the API layer hides real complexity underneath: choosing a storage engine that keeps writes fast as data grows past memory (LSM-tree vs B-tree), and choosing how far to relax consistency in exchange for availability during a partition, since CAP forces that choice explicitly rather than letting you have both.

## Requirements & Scope

**Functional requirements:**
- `PUT(key, value)`, `GET(key) → value`, `DELETE(key)` - no joins, no secondary indexes, no range queries in the base design.
- Automatic horizontal scaling as data volume or request rate grows.
- Configurable durability (how many replicas must acknowledge a write before it's considered committed).

**Non-functional requirements:**
- **Availability over strict consistency for most workloads** - a key-value store is frequently the backing layer for session data, user preferences, or product catalogs where a brief staleness window is acceptable but an outright write/read failure is not; default posture is AP, with a tunable knob (quorum reads/writes) for callers that need stronger guarantees on specific keys.
- **Low, predictable per-key latency** - single-digit milliseconds for both reads and writes is the target; this is a lookup-by-key system, and any design choice that turns a `GET` into a multi-hop fan-out (rather than routing directly to the owning shard) breaks that promise.
- **Horizontal scalability with no resharding downtime** - adding capacity must not require a full-cluster stop-the-world migration; see [Partitioning & Replication](#partitioning--replication).
- **Security**: authn/authz is typically enforced at the client-library or proxy layer (API keys or mTLS between calling services and the store, since this is internal infrastructure, not a user-facing endpoint) - state this explicitly rather than leaving it implicit. Encrypt data in transit between nodes and across AZ/region boundaries; encryption at rest is a configurable, workload-dependent decision (mandatory if the store holds anything sensitive, skippable for pure-cache-shaped workloads where the store isn't the system of record).

**Out of scope:** secondary indexing / range queries (that pushes toward a different storage model, e.g. a wide-column or document store); complex multi-key transactions across shards.

## Capacity Estimation

**Users:** 200M keys, average value size 1KB, replication factor 3 · **Read/Write ratio:** 10:1 (read-heavy, typical for a config/session/profile store) · **Peak QPS:** ~30K reads/sec, ~3K writes/sec at peak · **Storage:** 200M keys × 1KB × 3 replicas ≈ 600GB total cluster storage, comfortably split across 10-20 mid-size nodes · **Bandwidth:** 30K QPS × 1KB ≈ 30MB/s read egress at peak, well within single-NIC capacity per node · **Key constraint:** write amplification from the storage engine, not raw storage capacity - an LSM-tree's background compaction (see [Deep-Dive](#deep-dive-compaction-without-stalling-writes)) can consume more disk I/O than the actual write traffic itself if compaction falls behind, which is the real ceiling on sustained write throughput, not the 3K/sec figure alone.

## High-Level Architecture

```
┌────────────┐    consistent-hash(key)    ┌─────────┐  ┌─────────┐  ┌─────────┐
│  Client /  │───────────────────────────▶│ Node A  │  │ Node B  │  │ Node C  │
│  Coord.    │                             │(+repl.) │  │(+repl.) │  │(+repl.) │
│  layer     │                             └─────────┘  └─────────┘  └─────────┘
└────────────┘                                   │            │            │
                                                  └── gossip / cluster ────┘
                                                        membership
```

Write path (sequence view):

```
Client → Coordinator node (any node, via consistent hashing routes to owner)
  Coordinator → Replica 1 (owner), Replica 2, Replica 3  (write to N replicas)
  Wait for W acks (write quorum, e.g. W=2 of N=3)
  W acks received → return success to client
  W acks not received in time → return failure (or degrade per configured durability)
```

Any node in the cluster can act as coordinator for a request (a **leaderless / Dynamo-style** design, as opposed to a single leader per shard) - the coordinator forwards to the key's owning replicas based on the hash ring and collects quorum acknowledgments before responding.

## Storage Engine: LSM-Tree vs B-Tree

The single-node storage engine choice underneath each replica is the first major decision, and it's a direct read/write trade-off:

| Engine | Write path | Read path | Best fit |
| --- | --- | --- | --- |
| B-Tree (e.g. classic B+Tree, used by many relational stores) | In-place update, random disk I/O per write | Single lookup, predictable latency | Read-heavy or balanced workloads where write volume is moderate |
| LSM-Tree (Log-Structured Merge-Tree, e.g. Cassandra, RocksDB, LevelDB) | Append-only sequential write to an in-memory memtable, flushed to disk in sorted segments | May check multiple segments (mitigated by bloom filters), background compaction merges them | Write-heavy workloads, since sequential writes are far cheaper than in-place random writes on both spinning disk and (to a lesser degree) SSD |

> ⚖️ **Decision Framework**
> A B-Tree updates a page in place, which means every write is a random I/O - fine at moderate write volume, a bottleneck at high sustained write throughput. An LSM-tree converts writes into sequential appends (fast) at the cost of read complexity (a key might exist in the memtable, or any of several on-disk sorted segments, requiring either a scan or a bloom filter to short-circuit "definitely not in this segment" checks) and ongoing background compaction work. Given this design's read/write ratio (10:1, read-heavy) an LSM-tree is still the common production choice specifically because compaction and bloom filters keep read cost low while write throughput headroom matters even at moderate write volume - most Dynamo-style stores (Cassandra, RocksDB-backed systems) default to LSM for exactly this reason.

## Partitioning & Replication

Keys are distributed via [consistent hashing](../algorithms/consistent-hashing.md) with virtual nodes, so adding or removing a node remaps only `~1/N` of keys rather than the near-total reshuffle a naive `hash(key) % N` scheme causes. Each key's data is replicated to `N` nodes (replication factor, typically 3) - the next `N-1` nodes clockwise on the hash ring from the key's primary position, so replica placement follows automatically from the ring topology with no separate replica-assignment bookkeeping.

**Quorum consistency** (the Dynamo model): for `N` replicas, define `W` (write quorum) and `R` (read quorum). A write succeeds once `W` replicas acknowledge; a read queries `R` replicas and returns the most recent version among them. **`W + R > N` guarantees every read overlaps with the most recent write** on at least one replica, giving strong-ish consistency without requiring all `N` replicas to be involved in every operation.

> 🧠 **Thought Process**
> The quorum formula `W + R > N` is the mechanism, but the interview-relevant judgment is *which* quorum to pick for a given workload. `W=1, R=N` favors fast writes at the cost of slow, all-replica reads. `W=N, R=1` is the inverse. The common middle ground, `W=2, R=2` with `N=3`, balances both while still tolerating one replica being down for either a read or a write - the actual design conversation is picking the point on that spectrum that matches the read/write ratio, not reciting the formula.

## Consistency & Conflict Resolution

Even with `W + R > N`, concurrent writes to the same key from different clients (during a partition, or simply racing) can produce conflicting versions across replicas that quorum alone doesn't resolve - something has to decide which version wins, or that both are kept.

- **Last-Write-Wins (LWW)** - each write carries a timestamp; on conflict, the higher timestamp wins, the other is discarded. Simple, but silently loses data if clocks are skewed or two writes are genuinely concurrent (neither causally follows the other) - there's no "correct" winner in that case, LWW just picks one.
- **Vector clocks** - each value carries a per-replica version vector; on read, if one version's vector strictly dominates another's, the dominant one wins automatically. If neither dominates (genuinely concurrent, conflicting writes), **both versions are returned to the application**, which resolves the conflict with domain knowledge (e.g. merging two shopping-cart-add events) rather than silently picking one and losing the other.

> ⚖️ **Decision Framework**
> LWW is simpler to implement and reason about, and is the right choice when losing a genuinely-concurrent write is an acceptable trade (e.g. a "last profile edit wins" field). Vector clocks are the right choice when silently losing a write is unacceptable (e.g. a shopping cart, where dropping a concurrent "add item" write is a customer-visible bug) - the cost is pushing conflict resolution up to the application layer, which must know how to merge two versions meaningfully.

## Reliability & Fault Tolerance

- **Node failure detection** - gossip-based cluster membership (each node periodically exchanges liveness state with peers); a node missing enough heartbeats is marked down, and requests route around it to the next node on the hash ring.
- **Hinted handoff** - if a replica is temporarily down during a write, a neighboring node accepts the write on its behalf, holding a "hint" to replay to the original replica once it recovers - keeps write availability high during transient node failures without waiting for a full re-replication.
- **Read repair** - during a quorum read, if replicas disagree, the coordinator can proactively push the latest version back to the stale replica(s) as a side effect of the read, gradually healing inconsistency without a dedicated repair process.
- **Anti-entropy (background)** - periodic background comparison of replica state (e.g. via Merkle trees) catches and reconciles divergence that hinted handoff and read repair don't reach (e.g. a replica down long enough that hints expire).

## Scalability & Performance

- **Horizontal scaling** - adding nodes remaps `~1/N` of keys via consistent hashing and each node independently handles its owned key range's read/write load; no shared bottleneck at the coordination layer since any node can coordinate any request.
- **Hot key problem** - consistent hashing distributes *keys* evenly, not *traffic*; a single very-hot key still concentrates load on the small set of nodes that own it. Mitigated with client-side caching of hot keys or explicit key-splitting (sharding one hot key's value across several sub-keys).
- **Read scaling via replica reads** - with a relaxed `R` (e.g. `R=1`), reads can be served by any single replica, multiplying read throughput roughly linearly with replica count at the cost of potentially stale reads on that path.

## Deep-Dive: Compaction Without Stalling Writes

An LSM-tree's write path (sequential append to an in-memory memtable, periodic flush to an immutable on-disk sorted segment) is fast, but it leaves behind an ever-growing number of on-disk segments - and reads get slower as they check more segments (even with bloom filters short-circuiting most misses, a read for a key that exists still checks segments until found). **Compaction** merges multiple smaller segments into fewer, larger ones in the background, both bounding read-path segment-scan cost and reclaiming space from overwritten/deleted keys.

The operational tension: compaction competes for the same disk I/O and CPU that live write/read traffic needs. Naively running compaction at full speed stalls foreground traffic; deferring it indefinitely lets segment count (and read latency) grow unbounded.

> ⚠️ **Gotcha**
> **Compaction falling behind write volume is the most common LSM-tree production incident** - if sustained write throughput consistently outpaces compaction's ability to merge segments, on-disk segment count grows unbounded, read latency degrades progressively, and eventually the memtable-flush path itself can stall waiting for disk headroom. This isn't a rare edge case; it's the predictable failure mode of any LSM-tree store under sustained write pressure past its provisioned I/O budget.

Mitigation is rate-limiting compaction to a bounded fraction of available I/O (so it never fully stalls foreground traffic) while still keeping pace with write volume on average - a tuning parameter every production LSM-tree deployment (Cassandra's `compaction_throughput`, RocksDB's rate limiter) exposes explicitly, because the right value is workload-dependent, not a universal default.

## Observability

- **Compaction backlog (pending segment count / bytes)** - the leading indicator of the failure mode above; alert on a rising trend, not just an absolute threshold, since "rising and not catching up" is the actual signal.
- **Quorum failure rate** - writes/reads failing to reach `W`/`R` acknowledgments signals either genuine node failures or a replication-factor/quorum configuration that's too aggressive for current cluster health.
- **Per-node p99 read/write latency** - tracked per-node, not just cluster-aggregate, since a single degraded node (compaction-starved, disk-saturated) can hide inside a healthy cluster average.
- **Hinted-handoff queue depth** - a persistently non-zero or growing queue signals a replica has been down long enough that hints are accumulating faster than they can be replayed once it recovers.

## Production Failure Modes & Gotchas

- **Compaction falling behind write volume** - see [Deep-Dive](#deep-dive-compaction-without-stalling-writes); the single most common LSM-tree-backed store incident, degrading read latency progressively rather than failing outright, which makes it easy to miss until it's severe.
- **Silent data loss from LWW under clock skew** - if node clocks aren't tightly synchronized (NTP drift), Last-Write-Wins conflict resolution can pick the *wrong* winner based on a skewed timestamp, silently discarding a legitimately later write. Mitigated by tight NTP discipline or switching to vector clocks for keys where this risk is unacceptable.
- **Quorum overlap misconfiguration** - setting `W + R ≤ N` (e.g. `W=1, R=1, N=3` for max speed) silently drops the "every read sees the latest write" guarantee; this is sometimes an intentional trade for latency, but it must be a deliberate choice, not an accidental default.
- **Hot key overwhelming its owning replica set** - even with even key distribution, one viral key concentrates all its traffic on a fixed `N` replicas regardless of overall cluster size; requires explicit hot-key detection and mitigation, not something consistent hashing solves automatically.

### Common Misconceptions

- "A key-value store with quorum reads/writes is strongly consistent" - `W + R > N` guarantees a read overlaps the latest *acknowledged* write, but concurrent writes can still race and resolve via LWW/vector-clock rules that are not the same guarantee as linearizability; call it "quorum consistency," not "strong consistency," without qualification.
- "More replicas always means better durability with no cost" - each additional replica adds write-path latency (more nodes to reach for quorum) and storage cost; replication factor is a durability/cost/latency trade, not a free dial to turn up.

## Trade-off Summary

| Decision | Options Considered | Choice | Why |
| --- | --- | --- | --- |
| Storage engine | B-Tree, LSM-Tree | LSM-Tree | Sequential-write path suits the write-throughput headroom this design needs; read cost is kept low via bloom filters and bounded compaction |
| Partitioning scheme | Modulo hashing, static hash-slot sharding, consistent hashing | Consistent hashing (virtual nodes) | Bounds remapping to ~1/N of keys on scale events, avoiding a full-cluster reshuffle |
| Coordination model | Single leader per shard, leaderless (Dynamo-style) | Leaderless | Any node can coordinate a request, avoiding a per-shard leader as a bottleneck/failure point; cost is needing quorum logic instead of simple leader-forwarding |
| Consistency model | Strong (all-replica), quorum (`W+R>N`), eventual | Quorum | Balances availability and consistency without requiring every replica for every operation, tunable per workload via W/R |
| Conflict resolution | Last-Write-Wins, vector clocks | Configurable, LWW default / vector clocks for loss-sensitive keys | LWW is simpler and sufficient where losing a concurrent write is acceptable; vector clocks avoid silent data loss where it isn't, at the cost of app-layer merge logic |

## Interview Scenario Bank

> 🗣️ **First 30 seconds**
> "I'd confirm the read/write ratio and whether the workload needs range queries or secondary indexes, since a pure key lookup workload is what this design targets. Assuming a read-heavy, key-only access pattern with tolerance for tunable consistency - the core tension is choosing a storage engine suited to the write volume, and deciding how much consistency to trade for availability, since CAP means I can't have both during a partition. I'll size the cluster, then build up from partitioning and replication through consistency."

> 🎯 **Interview Lens**
> **Q:** Design a key-value store handling 30K reads/sec and 3K writes/sec with sub-10ms latency. Walk through the storage engine choice.
> **Ideal answer:** An LSM-tree-based engine (memtable + sorted on-disk segments + background compaction) fits the write-throughput profile better than a B-tree's in-place random writes; bloom filters keep read cost low despite checking multiple segments, and compaction is rate-limited to avoid stalling foreground traffic.
> **Common trap:** Defaulting to "use a B-tree, it's simpler" without weighing the random-write-I/O cost against this workload's actual write volume.
> **Next question:** Your compaction process starts falling behind sustained write traffic. What happens to read latency, and how do you detect it before it becomes a customer-visible incident?

> 🎯 **Interview Lens**
> **Q:** How do you guarantee a read sees the most recent write without requiring every replica to participate in every request?
> **Ideal answer:** Quorum consistency - define write quorum `W` and read quorum `R` such that `W + R > N`; this guarantees at least one replica in any read set also received the most recent acknowledged write, without needing all `N` replicas involved in either operation.
> **Common trap:** Confusing quorum consistency with strong/linearizable consistency - quorum only guarantees overlap with the latest *acknowledged* write, not a global total order across concurrent writes.
> **Next question:** Two clients write to the same key concurrently during a network partition. Both writes succeed on different replica subsets. How does your design detect and resolve the conflict?

> 🎯 **Interview Lens**
> **Q:** A single key is receiving 50x the traffic of any other key in the cluster. What breaks, and how do you fix it?
> **Ideal answer:** Consistent hashing distributes keys evenly but not traffic - the hot key's fixed `N` replicas absorb all of that load regardless of overall cluster size, potentially overwhelming just those nodes. Mitigate with client-side caching of the hot key or explicit key-splitting (sharding the value across several sub-keys, merged on read).
> **Common trap:** Assuming even key distribution from consistent hashing automatically means even traffic distribution - it doesn't, by design, since hashing only controls placement, not access frequency.
> **Next question:** How would you detect a hot key forming in production before it causes a latency spike, rather than after?

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| LSM | Log-Structured Merge (Tree) | Write-optimized storage engine using sequential appends + background compaction |
| LWW | Last-Write-Wins | Conflict-resolution strategy picking the higher-timestamped write on conflict |
| N/W/R | Replicas / Write quorum / Read quorum | Dynamo-style quorum parameters; `W + R > N` guarantees read/write overlap |
| NTP | Network Time Protocol | Clock-synchronization protocol; skew here can break Last-Write-Wins correctness |

### Anti-patterns

- Choosing a B-Tree storage engine for a sustained high-write-volume workload - random-write I/O becomes the bottleneck; an LSM-tree's sequential-write path suits this workload better.
- Setting `W + R ≤ N` without it being a deliberate, documented trade - silently drops the read-sees-latest-write guarantee, often discovered only after a stale-read incident.
- Leaving compaction unthrottled or unmonitored - either stalls foreground traffic (unthrottled) or lets segment count grow unbounded (unmonitored), both eventually customer-visible.
- Using Last-Write-Wins for data where losing a concurrent write is unacceptable (e.g. shopping carts) - use vector clocks and application-level merge instead.

### Selection Matrix

| | B-Tree | LSM-Tree |
| --- | --- | --- |
| Write path | In-place update, random I/O | Sequential append, background compaction |
| Read path | Single lookup, predictable latency | May check multiple segments, mitigated by bloom filters |
| Best fit | Read-heavy or balanced workloads | Write-heavy workloads |
| Example | Many relational-store indexes | Cassandra, RocksDB, LevelDB |
