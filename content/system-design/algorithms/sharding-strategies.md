# Sharding Strategies

## Prerequisites

- **[Consistent Hashing](./consistent-hashing.md)** [Must read]
- **[Replication Strategies](./replication-strategies.md)** [Should read]

---

## Table of Contents

- [TLDR](#tldr)
- [What It Is](#what-it-is)
- [Sharding Strategies](#sharding-strategies-1)
- [Rebalancing](#rebalancing)
- [Cross-Shard Operations](#cross-shard-operations)
- [Choosing a Shard Key](#choosing-a-shard-key)
- [Often Confused With](#often-confused-with)
- [When To Use](#when-to-use)
- [Common Misapplications & Gotchas](#common-misapplications--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

Sharding splits data into disjoint subsets ("shards") across multiple nodes so no single node needs to hold or serve the whole dataset. It is the fix for write throughput and storage capacity limits that replication alone can't solve, since replication only copies the same data - it doesn't divide it. The strategy choice - range, hash, or directory-based - is a trade-off between even load distribution and the ability to run efficient range queries: hash sharding distributes load near-perfectly but destroys range-query locality, range sharding preserves it but risks hot shards on sequential keys. Every sharding scheme also introduces cross-shard queries and rebalancing as new, structural costs a single-node system never had to pay.

---

## What It Is

**Analogy:** a library too large for one building splits its collection across branches. Range sharding is alphabetical branches (A-M, N-Z) - easy to find a specific author, but a popular author near "S" makes that branch overloaded. Hash sharding assigns each book a branch by a scrambled code - even load across branches, but "browse everything by Author M" now means checking every branch.

**Mental model:** sharding answers "which node owns this data" the way [consistent hashing](./consistent-hashing.md) answers "which node owns this key" for a cache - the two are related but not the same problem: consistent hashing is one *mechanism* often used to implement hash sharding's node-assignment; sharding is the broader decision of *how to partition a dataset* in the first place, of which consistent hashing is one possible implementation.

---

## Sharding Strategies

### Range Sharding

Each shard owns a contiguous range of the shard key's value space (e.g. user IDs 1-1,000,000 on Shard A, 1,000,001-2,000,000 on Shard B).

```
Shard A: keys [A ... M]
Shard B: keys [N ... S]
Shard C: keys [T ... Z]
```

**Strength:** range queries (`WHERE user_id BETWEEN 500000 AND 500100`) stay on one shard - no scatter-gather required. **Weakness:** sequential or skewed key patterns (timestamps, auto-incrementing IDs, an alphabetically-popular prefix) concentrate load onto whichever shard currently owns the active range, producing a hot shard even though total system capacity is well within limits.

⚠️ **Gotcha - at the point it happens:** a hot range doesn't show up as "shard is down" - it shows up as one shard's latency/CPU climbing while every other shard reports healthy, easy to misread as a single bad node rather than a range-sharding design consequence until the pattern (newest range always hot) is recognized.

### Hash Sharding

Each key is hashed, and the hash determines the owning shard (`hash(key) % N`, or via [consistent hashing](./consistent-hashing.md) for a scheme that tolerates `N` changing).

```
hash("user-8821") = 0x7f3a...  →  % N  →  Shard B
hash("user-8822") = 0x2c91...  →  % N  →  Shard A
hash("user-8823") = 0xe410...  →  % N  →  Shard C
      adjacent keys scatter to unrelated shards - no locality left to exploit
```

**Strength:** hash output is close to uniformly distributed regardless of the key's real-world distribution, so load spreads evenly across shards even under skewed input patterns (sequential IDs, popular prefixes) that would hot-spot range sharding. **Weakness:** range queries now require querying every shard and merging results (scatter-gather) - there's no locality left to exploit, since adjacent keys in the original space land on essentially random shards.

> ⚖️ **Decision Framework**
> Range query support needed (time-series scans, alphabetical listing, pagination by ID) → range sharding, and actively manage hot-range risk (see [Rebalancing](#rebalancing)). No meaningful range-query requirement, load distribution matters more → hash sharding. Uncertain or both matter → some systems (MongoDB's hashed shard keys with zone sharding, Cassandra's compound partition keys) let a coarse hash-sharded prefix hold a range-sharded suffix, getting even distribution across the prefix while preserving range locality within it.

### Directory-Based (Lookup Table) Sharding

A separate lookup service or table maps each key (or key range) explicitly to a shard, instead of deriving the mapping from a formula.

```
Client → lookup("tenant-4521") → [Directory Service] → "Shard C"  (extra hop)
                                        │
                              tenant-4521 → Shard C
                              tenant-4522 → Shard A
                              tenant-4523 → Shard C   (explicit, arbitrary mapping)
```

**Strength:** rebalancing is a metadata update - move an entry in the directory, migrate the underlying data at leisure, and reads immediately route correctly with no client-side remapping logic. Supports arbitrary, non-formulaic partitioning logic (e.g. "this one enterprise customer gets a dedicated shard"). **Weakness:** the directory itself becomes a new single point of failure and a request-path dependency - every shard lookup now costs an extra hop (or a cached copy that can go stale) that hash/range sharding's formula-based approach doesn't need.

---

## Rebalancing

Rebalancing moves data between shards when the shard count changes (scaling out) or load becomes uneven (a hot shard). The cost profile differs sharply by strategy:

- **Range sharding:** rebalancing means splitting or merging ranges - a hot range is split into two narrower ranges, each assigned to (or migrated to) a different shard. Requires migrating a contiguous, identifiable slice of data - operationally straightforward to reason about, but the split has to happen *before* the hot range causes an outage, not after.
- **Hash sharding (plain modulo):** changing `N` in `hash(key) % N` reshuffles nearly every key's assignment (`(N-1)/N` of them) - the same problem [consistent hashing](./consistent-hashing.md#the-problem--why-modulo-hashing-breaks) exists specifically to solve. Production hash-sharded systems use consistent hashing (or an equivalent) for exactly this reason, bounding a rebalance to `~1/N` of keys instead of nearly all of them.
- **Directory-based:** rebalancing is a metadata write (update the lookup entry) plus a background data-copy - no formula-driven mass remap, since the mapping was never formula-derived in the first place.

> 🧠 **Thought Process**
> The real design question when picking a sharding strategy isn't just "how do reads perform on day one" - it's "what does resharding cost on the day this shard count needs to double." A scheme that's simple at fixed `N` but reshuffles the entire dataset on every scale-out event (plain modulo hash sharding) is a trap that only shows up months later, once the dataset is too large to easily migrate wholesale.

---

## Cross-Shard Operations

Splitting data across shards makes two categories of operation structurally harder than on a single node:

**Cross-shard queries.** A query that can't be satisfied by one shard (a range scan under hash sharding, an aggregate across all users) requires **scatter-gather**: fan the query out to every shard, collect partial results, merge/sort them at the application or a coordinator layer. Latency becomes bounded by the slowest shard to respond, not the average - a single slow or unavailable shard degrades every scatter-gather query, not just queries that would have hit it directly.

**Cross-shard transactions.** A transaction touching rows on two different shards can't use a single node's local ACID guarantees - it needs a distributed transaction protocol (two-phase commit) or the [Saga pattern](./saga-pattern.md) to maintain atomicity across shards, both of which are slower and more failure-prone than a single-node transaction. The strongest lever against this cost is shard-key design itself: choosing a shard key that keeps naturally-related rows (a user's orders, a tenant's records) on the same shard eliminates most cross-shard transactions before they're needed, rather than solving them after the fact.

---

## Choosing a Shard Key

The shard key decision drives every other property of the system - it determines both the write-distribution and the cross-shard-operation cost, and it is expensive to change later (changing the shard key means re-sharding the entire dataset under a new scheme).

**Look for:** high cardinality (many distinct values, so no single value's data overwhelms one shard), even access distribution (no small set of "hot" key values), and alignment with the dominant query pattern (co-locating data that's usually queried or transacted together, e.g. `tenant_id` for a multi-tenant SaaS system where nearly every query is scoped to one tenant).

**Common anti-pattern:** a low-cardinality key (`status: active/inactive`, `country`) creates a small number of enormous, unevenly-loaded shards regardless of sharding strategy - the shard boundary is only ever as good as the key's real-world distribution.

**Preconditions for a shard key to actually work.** These aren't optional refinements - if a candidate shard key fails any of them, sharding provides no real benefit regardless of which strategy (range/hash/directory) is chosen on top of it: **cardinality must exceed the target shard count** (a boolean or 3-value enum can never populate more than 3 shards, no matter how the values are distributed); **the value must be known at write time** (a key derived from data only available after the write completes can't route the write); **access must not concentrate on a small subset of values** (even high cardinality doesn't help if 90% of traffic hits one value, e.g. one dominant tenant). A shard key satisfying cardinality but failing the access-distribution precondition is a silent failure mode - the system looks correctly sharded (many distinct key values exist) while behaving as if it weren't (most load still lands on one shard).

---

## Often Confused With

**Replication:** replication makes multiple **copies** of the *same* data for availability and read scale; sharding splits data into **disjoint subsets** across nodes for write scale and storage capacity. Production systems typically do both simultaneously - each shard is itself replicated. See **[Replication Strategies](./replication-strategies.md#often-confused-with)**.

**Consistent hashing:** consistent hashing is a *mechanism* for assigning keys to nodes such that pool-size changes remap a minimal fraction of keys - it's the standard implementation technique underlying hash sharding's node-assignment step, not a competing strategy. A system can be hash-sharded via plain modulo (simple, expensive to rebalance) or hash-sharded via consistent hashing (more moving parts, cheap to rebalance) - "hash sharding" names the partitioning approach, "consistent hashing" names one way to implement its rebalancing behavior. See **[Consistent Hashing](./consistent-hashing.md#often-confused-with)**.

**Partitioning:** sharding is horizontal partitioning across separate server nodes specifically. "Partitioning" is the broader general term and also covers partitioning within a single node (e.g. a database table partitioned by date range on one server, for query/maintenance efficiency, with no distributed-systems angle at all).

---

## When To Use

Reach for sharding when a single node's write throughput or storage capacity is the actual bottleneck - not preemptively, since every sharding scheme adds cross-shard query/transaction complexity a single-node (or single-leader-replicated) system doesn't have. If the bottleneck is read throughput or availability with data that comfortably fits one node, replication alone is the simpler fix (see [Often Confused With](#often-confused-with)).

DynamoDB and Cassandra both shard via consistent hashing as a first-class default, but differ in how much control that leaves the caller: DynamoDB derives the shard (partition) purely from the partition key's hash with no manual placement control, while Cassandra additionally exposes compound partition keys, letting an application co-locate related rows (e.g. all of one user's events) within a single partition deliberately rather than relying on hash luck. MongoDB takes a third approach - range, hash, or zoned sharding are all explicit configuration choices, not a fixed default, since MongoDB targets a broader range of access patterns than either DynamoDB or Cassandra assume. At real scale, the failure mode is rarely "sharding was implemented incorrectly" - it's a shard key chosen for day-one convenience (auto-incrementing ID, signup timestamp) that becomes a hot shard once one access pattern dominates, forcing a costly re-shard under production load rather than a planned one.

---

## Common Misapplications & Gotchas

**Sharding before it's needed.** Adding cross-shard query/transaction complexity to solve a bottleneck that replication or vertical scaling would have fixed more simply - sharding is the more operationally expensive option and should be reached for when the simpler fixes are provably insufficient, not by default.

**Choosing a shard key by convenience, not access pattern.** An auto-incrementing primary key or creation timestamp is the easiest key to add, and also the most likely to produce a hot shard under range sharding (all new writes land on the newest range) or fail to co-locate related data under hash sharding (a user's records scattered across every shard, forcing scatter-gather for a query that should have hit one shard).

**Underestimating cross-shard transaction cost.** Treating cross-shard writes as "just add two-phase commit" without accounting for its latency and failure-mode cost - see [Cross-Shard Operations](#cross-shard-operations). Often cheaper to redesign the shard key to co-locate the data than to engineer around frequent cross-shard transactions.

### Common Misconceptions

**"Sharding and partitioning are the same thing."** Partitioning is the general concept (splitting data into subsets, possibly on one node); sharding is horizontal partitioning across separate server nodes specifically - every shard is a partition, not every partition is a shard.

**"More shards always means more throughput."** Only for the portion of the workload that stays shard-local. A workload dominated by cross-shard scatter-gather queries or cross-shard transactions can get *slower* as shard count increases, since more shards means more participants per cross-shard operation and a higher chance one of them is slow.

---

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** Your single-leader database is struggling under write load, but you also have replicas serving reads fine. Do you shard or add more replicas?
> **Ideal answer:** More replicas doesn't help - replicas copy the same write stream from the same leader, so they scale read throughput, not write throughput. If the leader's write IOPS is genuinely the bottleneck, sharding (splitting writes across multiple independent leaders, one per shard) is the fix; adding replicas to an already-saturated leader does nothing for writes.
> **Common trap:** Conflating "add capacity" with "add replicas" without asking which resource (reads or writes) is actually constrained.
> **Next question:** Once sharded, each shard can still be replicated - what does that buy you that sharding alone doesn't?

> 🎯 **Interview Lens**
> **Q:** You're sharding a multi-tenant SaaS product's database by `tenant_id`. What could still go wrong even with high-cardinality tenant IDs?
> **Ideal answer:** Cardinality alone doesn't guarantee even load - if a small number of enterprise tenants generate disproportionately more traffic/data than the median tenant, their shards become hot regardless of how many distinct `tenant_id` values exist overall. High cardinality prevents *one shard from being empty*, it doesn't prevent *one shard from being overloaded* by a skewed-usage tenant.
> **Common trap:** Treating "high cardinality" as sufficient justification for a shard key without separately checking access-pattern evenness.
> **Next question:** How would you handle one specific tenant whose load genuinely exceeds what a single shard can serve?

> 🎯 **Interview Lens**
> **Q:** Range or hash sharding for a time-series metrics system where the dominant query is "give me all data points for sensor X in the last hour"?
> **Ideal answer:** Range sharding on sensor ID (not timestamp) keeps each sensor's time-ordered data on one shard, making the dominant range query shard-local. Range sharding on timestamp instead would hot-spot the shard owning "now," since all sensors write to the current time range simultaneously.
> **Common trap:** Defaulting to "time-series data → shard by timestamp" without checking what the actual query pattern needs - the shard key should match the query's filter dimension, not the data's most obvious axis.
> **Next question:** What happens to this scheme if one sensor produces 1000x the data volume of a typical sensor?

---

## Appendices

### Acronyms & Abbreviations

None specific to this article.

### Anti-patterns

- Sharding preemptively before replication or vertical scaling has been ruled out - adds cross-shard complexity to solve a problem that didn't require it.
- Choosing a shard key for implementation convenience (auto-increment ID, signup timestamp) instead of access-pattern fit - produces hot shards or scatter-gather-heavy queries.
- Plain modulo hash sharding in production without consistent hashing (or an equivalent) - makes every scale-out event a near-total data reshuffle.
- Designing around frequent cross-shard transactions instead of redesigning the shard key to co-locate the data that needs to transact together.

### Selection Matrix

| Dimension | Range Sharding | Hash Sharding | Directory-Based |
| --- | --- | --- | --- |
| Range query support | Yes, shard-local | No, scatter-gather required | Depends on underlying scheme |
| Load distribution | Risk of hot ranges | Even (uniform hash) | Depends on directory design |
| Rebalancing cost | Split/merge ranges | High unless consistent hashing used | Metadata update + background copy |
| Extra request-path hop | No | No | Yes (directory lookup) |
| Best for | Time-series scans, ordered pagination | Even load, no range-query need | Custom/non-formulaic partitioning (e.g. dedicated shards for specific tenants) |
