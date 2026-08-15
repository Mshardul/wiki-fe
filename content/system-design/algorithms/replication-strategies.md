# Replication Strategies

## Prerequisites

- **[CAP Theorem](./cap-theorem.md)** [Must read]
- **[Consistency Models](./consistency-models.md)** [Should read]

---

## Table of Contents

- [TLDR](#tldr)
- [What It Is](#what-it-is)
- [Synchronous vs Asynchronous Replication](#synchronous-vs-asynchronous-replication)
- [Topologies](#topologies)
- [Leader Election & Failover](#leader-election--failover)
- [Conflict Resolution (Multi-Leader)](#conflict-resolution-multi-leader)
- [Replication Lag](#replication-lag)
- [Quorum-Based Replication](#quorum-based-replication)
- [Often Confused With](#often-confused-with)
- [When To Use](#when-to-use)
- [Common Misapplications & Gotchas](#common-misapplications--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

Replication keeps copies of the same data on multiple nodes for availability and read scalability, and every strategy is a trade-off between write latency, consistency, and failure tolerance - synchronous replication guarantees the copies agree at the cost of write latency, asynchronous replication is fast but risks reading (or losing) stale data. The topology - single-leader, multi-leader, or leaderless/quorum - decides where write conflicts can occur and who resolves them. PostgreSQL streaming replication and MySQL replication default to single-leader async; DynamoDB and Cassandra use leaderless quorum replication specifically to avoid a single-leader bottleneck at global scale, accepting eventual consistency and conflict resolution as the cost.

---

## What It Is

**Analogy:** a company with a headquarters and regional branch offices, all supposed to have the same customer records. If every branch must confirm a record update with headquarters before continuing (synchronous), everyone stays in sync but branches wait on every change. If branches update locally and headquarters catches up later (asynchronous), branches stay fast but a customer calling two different branches on the same day might get different answers.

**Mental model:** replication strategy is fundamentally a decision about **where the coordination cost is paid** - upfront on every write (synchronous), deferred to eventual convergence (asynchronous), or shared across a quorum of nodes on every operation (quorum-based). There is no strategy that avoids paying it somewhere.

---

## Synchronous vs Asynchronous Replication

**Synchronous:** the primary waits for acknowledgment from replica(s) before confirming the write to the client. A replica is guaranteed to have the data before the client is told it succeeded - if the primary fails immediately after, no acknowledged write is lost.

**Asynchronous:** the primary confirms the write to the client immediately, then propagates to replicas in the background. Lower write latency (the client isn't waiting on network round-trips to replicas), but a primary failure between confirming the write and replicating it means that write is lost - the replica promoted to new primary never received it.

**Semi-synchronous** (the common production middle ground): the primary waits for acknowledgment from **at least one** replica (not all), then confirms to the client. Bounds data loss to "at most what the slowest lagging replica missed" while avoiding the full latency cost of waiting for every replica.

```
Synchronous:        Client → Primary → Replica (ack) → Primary confirms → Client
Asynchronous:        Client → Primary → Primary confirms → Client
                                  └──────→ Replica (async, no wait)
Semi-synchronous:   Client → Primary → Replica A (ack) → Primary confirms → Client
                                  └──────→ Replica B (async, no wait)
```

> ⚖️ **Decision Framework**
> Synchronous when losing any acknowledged write is unacceptable (financial ledgers, inventory decrements) and the latency cost is affordable - typically same-region replicas only, since cross-region round-trips make synchronous replication's latency cost prohibitive. Asynchronous when write latency matters more than the small risk of losing the last few unreplicated writes on primary failure (most read-heavy consumer apps). Semi-synchronous is the default production compromise when full synchronous is too slow but zero data loss guarantee on a single replica is still required.

This is the same tension [CAP Theorem](./cap-theorem.md#core-mechanics) names for the partition case, applied to normal operation: synchronous replication trades latency for durability guarantees; asynchronous trades durability risk for latency. See [Replication Lag](#replication-lag) for what asynchronous replication's deferred cost actually looks like in practice.

---

## Topologies

### Single-Leader (Primary-Replica)

One node (the leader/primary) accepts all writes; replicas apply the leader's write stream and serve reads. The default for PostgreSQL, MySQL, and most relational databases.

```
        writes
Client ────────► [Leader]
                     │  replication stream
          ┌──────────┼──────────┐
          ▼          ▼          ▼
     [Replica 1] [Replica 2] [Replica 3]  ← reads (optionally)
```

**Strength:** no write conflicts possible - there's only one writer, so ordering is trivially consistent at the source. **Weakness:** the leader is a single point of write throughput and write availability; if it's down, no writes succeed until failover completes (see [Leader Election & Failover](#leader-election--failover)).

### Multi-Leader

Multiple nodes each accept writes independently and replicate to each other. Used when write availability across multiple regions matters more than avoiding conflicts - each region gets a local leader so writes never leave the region synchronously.

**Strength:** no single point of write failure; each leader keeps accepting writes even if other leaders are unreachable. **Weakness:** the same logical record can be written differently on two leaders concurrently, requiring [conflict resolution](#conflict-resolution-multi-leader) - a cost single-leader never incurs.

### Leaderless (Quorum-Based)

No designated leader; any replica can accept a write, and reads/writes use a quorum (see [Quorum-Based Replication](#quorum-based-replication)) to stay consistent despite any individual node being stale or unreachable. DynamoDB and Cassandra use this topology.

**Strength:** highest write availability - a write succeeds as long as enough nodes are reachable, with no single leader to fail over. **Weakness:** most operationally complex; requires read-repair or anti-entropy processes to converge stale replicas, and still needs conflict resolution for concurrent writes to the same key.

> ⚖️ **Decision Framework**
> Single-leader when writes naturally have one authoritative source and conflicts should be structurally impossible, not resolved after the fact - most transactional/relational workloads. Multi-leader when write availability across geographically distributed regions outweighs the cost of occasional conflicts (collaborative editing, multi-region active-active). Leaderless when the workload is write-heavy at massive scale and the data model tolerates eventual consistency with application-level conflict handling (session state, shopping carts, activity feeds).

---

## Leader Election & Failover

When a single-leader's leader fails, a new leader must be chosen and writes redirected to it - the mechanics that decide how much downtime and data loss a failure costs.

**Detection:** replicas (or a separate coordination service like ZooKeeper or etcd) detect leader failure via missed heartbeats, typically after a timeout of a few seconds to avoid false positives on transient network blips.

**Election:** among the remaining replicas, one is promoted - commonly the replica with the most up-to-date replication log (least data loss), decided via a consensus protocol (Raft, Paxos - see [Consensus](./consensus-raft-paxos.md)) or an external coordinator.

**Redirection:** clients and any proxy/load balancer in front of the database must learn the new leader's identity and redirect writes to it - often the step that actually determines total failover time, not the election itself.

> ⚠️ **Warning / Gotcha**
> **Split-brain:** if the old leader wasn't actually dead - just slow or network-partitioned from the coordination service - it may still believe it's the leader and keep accepting writes after a new leader has been promoted. Two nodes accepting writes as "the leader" simultaneously produces silently diverging, conflicting data with no single source of truth. Mitigated by fencing tokens (a monotonically increasing epoch number the new leader includes on every write, letting downstream systems reject stale-epoch writes from an old leader) or STONITH ("shoot the other node in the head" - forcibly terminating the suspected-dead node before promoting a replacement).

**Failover data loss:** if the old leader had unreplicated writes (only possible under asynchronous or semi-synchronous replication) at the moment of failure, those writes are gone once a replica without them is promoted - this is the concrete cost asynchronous replication's latency advantage is paid against.

---

## Conflict Resolution (Multi-Leader)

When two leaders accept concurrent writes to the same logical record, the system needs a deterministic way to reconcile them once the writes reach each other.

- **Last-Write-Wins (LWW)** - the write with the latest timestamp wins, the other is silently discarded. Simplest to implement; **silently loses data** - the "losing" write simply vanishes, which is unacceptable for anything where both writes carried meaningful information (e.g., two different field updates to the same record).
- **Vector clocks / version vectors** - track causal history per replica, letting the system detect genuine concurrent writes (as opposed to one write causally following another) and surface true conflicts for resolution rather than guessing via timestamp.
- **CRDTs (Conflict-free Replicated Data Types)** - data structures (counters, sets, sequences) designed so concurrent updates merge deterministically without conflict by construction - no resolution step needed because the merge function is commutative and associative by design. Used for collaborative editing (Google Docs-style operational transforms are a related but distinct approach) and distributed counters.
- **Application-level merge** - surface the conflict to application logic (or the end user) to resolve semantically - e.g., a shopping cart merges by taking the union of both versions' items rather than picking one arbitrarily. Highest implementation cost, but the only option when the "correct" merge requires domain knowledge a generic algorithm can't have.

> 🧠 **Thought Process**
> LWW's appeal is that it requires no extra data structure and no application involvement - but "requires nothing" is exactly why it silently drops data with no record that a conflict even occurred. The real decision isn't "which algorithm is best" - it's "does this data model tolerate silent last-write-wins loss, or does a lost concurrent write constitute a real bug?" Shopping cart items lost to LWW is a customer complaint; a financial ledger entry lost to LWW is an audit failure.

---

## Replication Lag

The gap between a write completing on the leader/primary and that write becoming visible on a given replica - the concrete, observable cost of asynchronous replication.

**Causes:** network latency between leader and replica, replica applying writes slower than the leader produces them (replica falling behind under write-heavy load), or a replica temporarily disconnected and catching up from a backlog.

**Consequences:**
- **Read-after-write inconsistency** - a client writes, then immediately reads from a lagging replica and doesn't see their own write. The most common user-facing symptom ("I just updated my profile and it reverted").
- **Monotonic-read violations** - a client reads from replica A (caught up), then a subsequent read routes to replica B (further behind) and appears to go *backward* in time.

**Mitigations:**
- Route read-after-write-sensitive reads to the leader (or a replica known to be caught up) for a short window after a write.
- Sticky sessions - route a given client's reads consistently to the same replica, avoiding the monotonic-read violation even if that replica is somewhat behind.
- Track and expose replica lag as a metric; route reads away from any replica whose lag exceeds a threshold.

---

## Quorum-Based Replication

Used by leaderless topologies to bound consistency without requiring every replica to agree. Defined by three tunable numbers: **N** (total replicas), **W** (replicas that must acknowledge a write), **R** (replicas that must respond to a read).

**The core guarantee:** if `W + R > N`, every read quorum overlaps with every write quorum by at least one node - guaranteeing at least one replica in any read has seen the most recent write. This doesn't guarantee linearizability (see [Consistency Models](./consistency-models.md)) but does guarantee the read *can* see the latest write, with the client responsible for resolving which of the returned versions is newest (often via vector clocks).

```
N = 3, W = 2, R = 2:  W + R = 4 > N = 3  → overlap guaranteed

  Write acknowledged by:  [Node A] [Node B]        (2 of 3)
  Read queries:                     [Node B] [Node C]   (2 of 3)
                                        ↑ overlap - B has the latest write
```

| Configuration | Meaning | Trade-off |
| --- | --- | --- |
| `W = N, R = 1` | Every replica must ack writes; any single replica can serve reads | Slow, safe writes; fast reads |
| `W = 1, R = N` | One replica acks the write; every replica must be read | Fast writes; slow, safe reads |
| `W = R = (N/2)+1` (majority) | Balanced - the common default | Moderate latency both ways, tunable per-operation |

DynamoDB and Cassandra expose W and R as per-request tunables, letting a single system serve both "fast, eventually-consistent" reads and "slower, stronger-guarantee" reads from the same dataset depending on the caller's needs.

> 🧠 **Thought Process**
> Quorum overlap guarantees you *can* find the latest write among the responses, not that you'll trivially know *which* response is the latest one - the client (or the database's internal read-repair logic) still needs a way to compare versions, which is exactly what vector clocks or timestamps are for. Quorum membership and conflict detection are two separate mechanisms that quorum-based systems always pair together.

---

## Often Confused With

**Sharding/partitioning:** replication makes multiple **copies** of the *same* data for availability and read scale; sharding splits data into **disjoint subsets** across nodes for write scale and storage capacity. Production systems typically do both simultaneously (each shard is itself replicated) - they solve different problems and aren't substitutes for each other. See [Sharding Strategies](./sharding-strategies.md) for the partitioning side.

**Backup:** a backup is a point-in-time, typically offline copy for disaster recovery, restored manually after data loss. A replica is a live, continuously-updated copy serving traffic (or ready to be promoted) in normal operation. A replica is not a backup substitute - a bug or malicious `DELETE` that replicates to all live replicas destroys all of them simultaneously; only an offline, versioned backup protects against that class of failure.

---

## When To Use

Replication is close to universal in production systems handling any meaningful traffic - the decision is rarely "replicate or not" but **which topology and sync mode**. Single-leader is the correct default absent a specific reason to deviate (multi-region write availability, or write throughput exceeding what one leader can sustain). Reach for multi-leader or leaderless only when the availability/latency benefit is worth taking on conflict resolution as a genuine engineering cost, not a hypothetical one.

Google Spanner is the notable exception that achieves both strong consistency and multi-region write availability, but does so via synchronized atomic clocks (TrueTime) and Paxos groups per shard - a level of infrastructure investment most systems don't have access to. At the scale where a single-leader's write throughput becomes the bottleneck (a leader saturating on write IOPS with replicas otherwise healthy), the fix is usually sharding to add more independent leaders, not switching the existing leader to multi-leader replication - the two problems (write throughput vs write availability) are often conflated but call for different fixes.

---

## Common Misapplications & Gotchas

**Assuming asynchronous replicas are always caught up.** Routing all reads to replicas without checking lag, or without a read-after-write strategy, produces user-visible staleness that looks like a bug rather than an accepted trade-off - see [Replication Lag](#replication-lag).

**Treating a replica as a backup.** A replicated `DELETE` or corruption propagates to every replica within the normal replication lag window - see [Often Confused With](#often-confused-with).

**No fencing on failover.** Promoting a new leader without invalidating the old one's ability to accept writes risks split-brain the moment the "dead" leader turns out to be merely slow - see [Leader Election & Failover](#leader-election--failover).

**Choosing LWW by default without checking if silent data loss is acceptable.** The simplest conflict resolution strategy is also the one most likely to be wrong for the data model in question - see [Conflict Resolution](#conflict-resolution-multi-leader).

### Common Misconceptions

**"Replication guarantees no data loss."** No - only synchronous replication (or a quorum write with `W = N`) guarantees an acknowledged write survives a single node failure. Asynchronous replication trades exactly that guarantee for lower latency.

**"More replicas always means more consistency."** No - replica count (N) affects availability and read scale; consistency is governed by W, R, and the sync mode, not raw replica count. A system with 10 async replicas and `W=1` is no more consistent than one with 2.

---

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** Your leader fails and a replica is promoted. Under what conditions can acknowledged writes be lost?
> **Ideal answer:** Only if those writes hadn't yet reached the promoted replica - which requires asynchronous or semi-synchronous replication (where the write was acknowledged to the client before all replicas confirmed it). Under fully synchronous replication to that replica specifically, no acknowledged write can be lost, at the cost of higher write latency during normal operation.
> **Common trap:** Assuming replication alone (regardless of sync mode) prevents data loss on failover - the sync mode is what actually determines this, not the presence of replicas.
> **Next question:** "How would you detect that this data loss happened, after the fact?" → Compare the old leader's write-ahead log (if recoverable) against the promoted replica's log to find the gap - this is why WAL retention and failover post-mortems matter even after the incident is "resolved."

> 🎯 **Interview Lens**
> **Q:** You're designing a multi-region system and need writes to succeed even if one region is unreachable. What replication topology do you choose, and what do you give up?
> **Ideal answer:** Multi-leader, with one leader per region - each region keeps accepting writes independently during a cross-region network partition. What's given up is automatic conflict avoidance: concurrent writes to the same record in two regions will conflict and need resolution (LWW, vector clocks, or application-level merge) once the regions reconnect.
> **Common trap:** Proposing single-leader with cross-region synchronous replication - this technically guarantees consistency but makes every write pay a cross-region round-trip in latency, and during a partition the non-leader region can't write at all, which usually fails the stated requirement.
> **Next question:** "Your conflict resolution strategy is last-write-wins. What's the risk?" → Concurrent writes to the same record silently drop one version with no record a conflict occurred - acceptable for low-stakes fields (a "last viewed" timestamp), a real correctness bug for anything where both versions carried meaningful, non-mergeable information.

> 🎯 **Interview Lens**
> **Q:** In a quorum-based system with N=3, what W and R values would you pick, and why?
> **Ideal answer:** `W=2, R=2` is the common majority-quorum default: `W+R=4 > N=3` guarantees read/write quorum overlap (a strong-ish consistency read always sees the latest acknowledged write), while tolerating one node being down or slow for either operation. Skewing toward `W=1` trades this overlap guarantee for lower write latency; skewing toward `R=1` trades it for lower read latency - the choice depends on whether the workload is read-heavy or write-heavy and how much staleness risk is acceptable.
> **Common trap:** Picking `W=1, R=1` for speed without recognizing this breaks the overlap guarantee entirely (`1+1=2 ≤ N=3`) - reads can silently miss the latest write with no way to detect it happened.
> **Next question:** "Does W+R > N give you linearizability?" → No - it guarantees a read *can* see the latest write among the quorum's responses, but the client (or the database's internal logic) still has to determine which of the returned versions is actually newest, typically via vector clocks or timestamps - overlap alone doesn't resolve that.

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| LWW | Last-Write-Wins | Conflict resolution that keeps the write with the latest timestamp, discarding the other |
| CRDT | Conflict-free Replicated Data Type | Data structure whose concurrent updates merge deterministically without a conflict-resolution step |
| WAL | Write-Ahead Log | Durable log of writes applied before being reflected in the main data structure, used for replication and recovery |

### Selection Matrix

| Dimension | Single-Leader | Multi-Leader | Leaderless (Quorum) |
| --- | --- | --- | --- |
| Write conflicts possible | No | Yes | Yes |
| Write availability on node failure | Blocked until failover | High (other leaders keep accepting) | High (any reachable replica) |
| Operational complexity | Low | Medium (conflict resolution) | High (read-repair, anti-entropy) |
| Best for | Most transactional/relational workloads | Multi-region active-active | Massive-scale, high write availability with tolerant data model |
