# Design: Distributed ID Generator

## Prerequisites

- **[Consensus (Raft / Paxos)](../algorithms/consensus-raft-paxos.md)** [Should read]
- **[Sharding Strategies](../algorithms/sharding-strategies.md)** [Should read]

## Table of Contents

- [TLDR](#tldr)
- [Requirements & Scope](#requirements--scope)
- [Capacity Estimation](#capacity-estimation)
- [High-Level Architecture](#high-level-architecture)
- [ID Generation Strategies](#id-generation-strategies)
- [Snowflake Deep-Dive: Bit Layout & Clock Skew](#snowflake-deep-dive-bit-layout--clock-skew)
- [Worker ID Assignment](#worker-id-assignment)
- [Reliability & Fault Tolerance](#reliability--fault-tolerance)
- [Scalability & Performance](#scalability--performance)
- [Observability](#observability)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Trade-off Summary](#trade-off-summary)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

## TLDR

A distributed ID generator produces unique, roughly-ordered IDs across many nodes with zero hot-path coordination. The core architectural challenge of Distributed ID Generator is trusting each node's clock and a pre-assigned identity to compose a globally-unique ID with no per-request coordination, handling the case where clocks lie: clock skew.

## Requirements & Scope

**Functional requirements:**
- `generate() → id` - each call returns a 64-bit integer ID, unique across the entire fleet.
- IDs should be roughly time-sortable (an ID generated later sorts higher), so they double as a natural primary-key index order for the systems that consume them.
- Support tens of thousands of ID-generation nodes concurrently, each capable of generating IDs independently.

**Non-functional requirements:**
- **Latency over strict global ordering**: generation must be sub-millisecond, in-process, with zero network round-trips per ID. Perfect cross-node chronological ordering is not required - "roughly time-ordered, uniqueness guaranteed" is the actual bar, not "ID N+1 was generated strictly after ID N across all nodes."
- **Availability over coordination**: the generator must keep issuing IDs even if a coordination service (used only at node startup) is temporarily unreachable - a generation node should never block a live request waiting on a remote call.
- **Uniqueness is non-negotiable**: a duplicate ID is a correctness bug (primary-key collision, data overwrite), not a degraded-mode acceptable outcome - unlike availability or ordering, this NFR cannot be relaxed under any failure mode.
- **Security**: worker/node identity assignment must prevent two nodes from ever being handed the same worker ID (the actual root cause of duplicate IDs in practice) - enforced via a coordination service with exclusive-lease semantics, not application-level convention. IDs themselves carry no PII and need no encryption, but predictable IDs can leak creation-rate/volume information, which matters if IDs are ever user-facing (order numbers, resource identifiers).

**Out of scope:** globally strict total ordering (that requires the coordination this design deliberately avoids); the business logic of whatever system consumes the IDs.

## Capacity Estimation

**Users:** upstream services issuing ~500M new entities/day across the fleet · **Read/Write ratio:** N/A - pure generation workload, no read path · **Peak QPS:** 500M/day ÷ 86,400s ≈ 5.8K/sec average, ~25K/sec at peak (write-heavy bursts, e.g. flash-sale order creation) · **Storage:** none - IDs are generated in-memory and returned, not persisted by the generator itself · **Bandwidth:** negligible - an 8-byte ID per response, no payload · **Key constraint:** per-node throughput ceiling, not cluster-wide capacity - a Snowflake-style generator with a 12-bit per-millisecond sequence counter caps a single node at 4096 IDs/ms (4.09M/sec), so even the 25K/sec peak is trivially absorbed by one node; the real constraint is worker-ID address space (how many concurrent nodes the bit layout supports), not raw throughput.

## High-Level Architecture

```
┌──────────────┐     ┌───────────────────┐
│  App Server  │────▶│  ID Gen Node (local,│  ← in-process library, not a network service
│              │     │  in-process library) │
└──────────────┘     └───────────────────┘
        (embedded in every app server / service instance)

Startup only:
┌───────────────────┐     lease worker_id      ┌──────────────────┐
│  ID Gen Node       │──────────────────────────▶│ Coordination Svc │
│  (on process boot) │◀─────────────────────────│ (ZooKeeper/etcd) │
└───────────────────┘     exclusive lease        └──────────────────┘
```

Generation path (sequence view):

```
App → ID Gen Node (in-process call, no network hop)
  Read local monotonic clock → timestamp
  timestamp == last_timestamp? → increment local sequence counter
  timestamp > last_timestamp?  → reset sequence counter to 0
  timestamp < last_timestamp?  → CLOCK SKEW DETECTED → see Production Failure Modes
  Compose: [timestamp bits][worker_id bits][sequence bits] → return ID
```

The critical design choice is visible directly in the diagram: the coordination service is contacted **once, at startup**, to lease a worker ID - never on the per-request generation path. This is what makes generation itself a pure in-process, zero-network-hop operation.

## ID Generation Strategies

Three broad approaches, each trading off a different axis:

1. **Centralized auto-increment counter (single DB sequence)** - a synchronous round-trip to one database row per ID.
2. **UUID (v4, random)** - fully decentralized, generated in-process with no shared state.
3. **Snowflake-style composite ID (timestamp + worker ID + sequence)** - a single 64-bit integer built from a timestamp prefix, a worker ID, and a per-millisecond sequence counter.

| Dimension | Centralized counter | UUID (v4) | Snowflake composite |
| --- | --- | --- | --- |
| Uniqueness guarantee | Single source of truth (DB row) | Probabilistic (birthday-bound collision odds, negligible in practice) | Structural (worker ID + clock + sequence composed, no overlap possible) |
| Ordering | Strictly ordered | Not sortable (random) | Roughly time-ordered (per-node exact, cross-node approximate) |
| Size | Compact (32/64-bit int) | Large (128-bit) | Compact (64-bit int) |
| Collision risk | None (serialized by DB) | Near-zero but non-zero at massive scale | None if worker IDs are structurally unique |
| Coordination need | Per-request (synchronous DB round-trip) | None, ever | One-time, at node startup only (worker-ID lease) |

> ⚖️ **Decision Framework**
> See the comparison table above: the counter and Snowflake both give rough-to-strict time-ordering, but the counter pays its coordination cost per request while Snowflake pays it once, at startup. UUIDs remove all coordination but sacrifice sortability and compactness. Almost every production system at ID-generation scale (Twitter's original Snowflake, Instagram, Discord) converges on the composite-ID approach specifically because it's the only option that is simultaneously coordination-free per request, compact, and sortable.

## Snowflake Deep-Dive: Bit Layout & Clock Skew

The canonical 64-bit layout:

```
| 1 bit (unused/sign) | 41 bits (timestamp, ms since epoch) | 10 bits (worker ID) | 12 bits (sequence) |
```

- **41-bit timestamp** - milliseconds since a custom epoch (not Unix epoch, to maximize usable range). 41 bits gives ~69 years of range from the chosen epoch - the epoch is chosen close to system launch, not 1970, specifically to not waste bits on decades before the system existed.
- **10-bit worker ID** - supports 1024 concurrent generator nodes; assigned once at startup (see [Worker ID Assignment](#worker-id-assignment)).
- **12-bit sequence** - resets to 0 each new millisecond, increments for each ID generated within the same millisecond on the same node; caps a single node at 4096 IDs/ms.

> 🧠 **Thought Process**
> The bit-width split (41/10/12) is itself a capacity-planning decision, not an arbitrary default: widening the worker-ID field to support more nodes narrows the sequence field, lowering per-node peak throughput - and vice versa. A candidate should be able to justify the specific split against the system's actual node count and peak-QPS-per-node requirements, not just recite "Twitter uses 41/10/12."

**Clock skew** is the one failure mode this design cannot coordinate its way around: if a node's system clock moves backward (NTP correction, VM migration, manual clock adjustment), a newly-generated timestamp could be *less than* the last timestamp used on that node, risking a duplicate ID if the sequence counter also happens to collide.

> ⚠️ **Gotcha**
> Backward clock jumps are not hypothetical at scale - NTP drift correction, hypervisor live-migration pauses, and leap-second handling have all caused real backward jumps in production fleets. A generator that doesn't explicitly detect `current_timestamp < last_timestamp` and refuse to generate (or wait it out) will silently produce a plausible-looking but potentially duplicate ID.

## Worker ID Assignment

Each node needs a unique worker ID before it can generate its first ID - this is the one coordination step in the whole design, and it happens exactly once per node lifecycle (startup), never per request.

- **Coordination-service lease (ZooKeeper/etcd)** - on boot, a node requests an exclusive lease on a worker ID from a sequential znode/key range; the coordination service guarantees no two live nodes hold the same ID. If the node crashes, its lease expires (via a TTL/heartbeat) and the ID becomes available for reassignment.
- **Static configuration** - worker IDs are hardcoded per deployment (e.g. via environment variable, tied to a Kubernetes StatefulSet's ordinal index). Zero runtime dependency on a coordination service, but requires careful operational discipline (a mis-configured duplicate ID at deploy time is a silent, production-breaking bug with no automatic detection).

> ⚖️ **Decision Framework**
> Coordination-service leasing self-heals (a crashed node's ID is automatically reclaimed) and prevents human error at the cost of a startup-time dependency on ZooKeeper/etcd being available. Static configuration removes that runtime dependency entirely but pushes correctness onto deploy-time process - the choice tracks how much you trust your deployment tooling versus how much startup-time coupling to a coordination service you're willing to accept.

## Reliability & Fault Tolerance

- **Coordination service unavailable at startup** - a node that can't lease a worker ID should fail to start (fail-closed), not fall back to a default/random worker ID that risks colliding with a live node. This is a deliberate availability-vs-correctness trade at startup only, not on the hot path.
- **Coordination service unavailable mid-run** - once a worker ID is leased, the generation path has zero further dependency on the coordination service; a coordination-service outage mid-run does not affect already-running nodes' ability to generate IDs, only new node startups.
- **Node crash and restart** - a restarting node must either recover its previous worker ID and last-used timestamp (to detect any skew) or lease a fresh worker ID; reusing a worker ID without persisting the last timestamp risks generating a lower/duplicate ID if the node restarts within the same millisecond window it crashed in under clock skew.

## Scalability & Performance

- **Horizontal scaling is trivial on the generation side** - since generation is a pure in-process, zero-coordination operation, adding more app-server instances (each embedding its own ID-gen node) scales linearly with no shared bottleneck, up to the worker-ID address space limit (1024 nodes at 10 bits).
- **Worker-ID exhaustion at extreme fleet size**: past 1024 concurrent nodes (10-bit field), the bit layout must be re-partitioned (e.g. borrow a bit from the sequence field) - a capacity-planning decision made at design time based on expected fleet size, not something fixed reactively in production.
- **Per-node sequence exhaustion**: if a single node needs to generate more than 4096 IDs within one millisecond (a very high per-node burst), the generator must either block until the next millisecond tick or widen the sequence field - most production systems never approach this ceiling per node given typical service-instance counts.

## Observability

- **Clock skew detection rate** - the single most important health metric; any non-zero rate of `current_timestamp < last_timestamp` events should page, since it signals a node either handled the event silently-wrong or paused generation, both worth investigating.
- **Worker-ID lease churn** - frequent lease acquisition/expiry (nodes repeatedly losing and re-acquiring worker IDs) signals flaky heartbeating to the coordination service or nodes crash-looping.
- **Per-node sequence-counter saturation** - tracks how close any node is running to the 4096/ms ceiling; a node consistently near saturation is a signal to re-evaluate the bit-layout split before it becomes a production incident.
- **ID generation latency (p99)** - should be sub-microsecond given the in-process design; a rising p99 usually indicates something has broken the zero-coordination invariant (e.g. an accidental synchronous call creeping into the hot path).

## Production Failure Modes & Gotchas

- **Duplicate worker IDs from static configuration drift** - two nodes deployed with the same hardcoded worker ID (a copy-paste config error, or a scaling event that doesn't correctly increment the ordinal) silently produces colliding IDs with no automatic detection until a downstream primary-key conflict surfaces. Coordination-service leasing structurally prevents this; static config requires deploy-time validation to catch it.
- **Backward clock jumps producing duplicate IDs** - see [Snowflake Deep-Dive](#snowflake-deep-dive-bit-layout--clock-skew); the generator must detect and refuse (or wait out) a backward timestamp rather than silently proceeding.
- **Epoch exhaustion is a real long-term risk, not just theoretical** - a 41-bit millisecond timestamp field exhausts its range roughly 69 years after the chosen epoch; systems launched decades ago on a poorly-chosen epoch (or Unix epoch directly) have materially less runway left. Worth stating explicitly in a design review, not assumed as infinite.

### Common Misconceptions

- "Distributed IDs need a central authority to guarantee uniqueness" - the entire point of the Snowflake approach is that uniqueness comes from composing independently-guaranteed pieces (a unique worker ID + a monotonic per-node clock+sequence), not from any node checking with a central authority per ID.
- "Roughly time-ordered means strictly ordered" - Snowflake IDs generated on different nodes in the same millisecond are not guaranteed to reflect true causal order across nodes; only ordering *within a single node* is exact. Cross-node clock differences (even sub-millisecond) mean two IDs a millisecond apart could have been generated in either real-world order.

## Trade-off Summary

| Decision | Options Considered | Choice | Why |
| --- | --- | --- | --- |
| ID generation approach | Centralized DB counter, random UUID, Snowflake composite ID | Snowflake composite ID | Zero coordination per request unlike the counter, and compact + sortable unlike random UUIDs |
| Worker ID assignment | Coordination-service lease, static configuration | Coordination-service lease | Self-heals on node crash and structurally prevents duplicate-ID collisions from deploy-time human error, at the cost of a startup-time dependency |
| Coordination-service startup failure | Fail-open (default ID), fail-closed (refuse to start) | Fail-closed | A default/random worker ID risks colliding with a live node - uniqueness is non-negotiable, so refusing to start is the safer failure mode |
| Bit layout split (41/10/12) | Wider worker-ID field, wider sequence field | 41/10/12 (Twitter default), tuned per fleet size | Must be sized against expected concurrent node count vs. peak per-node throughput - not a universal constant |
| Ordering guarantee | Strict global order, rough time-order | Rough time-order | Strict global ordering requires coordination per ID, which reintroduces the exact bottleneck this design avoids |

## Interview Scenario Bank

> 🗣️ **First 30 seconds**
> "I'd confirm whether IDs need to be strictly globally ordered or just roughly time-sortable, and how many concurrent generator nodes the fleet expects, since that sizes the bit layout. Assuming rough ordering is acceptable and coordination-per-request is off the table for latency reasons - the core challenge is composing a unique ID from pieces that are locally guaranteed (a leased worker ID, a local clock, a local counter) with zero network calls on the generation hot path."

> 🎯 **Interview Lens**
> **Q:** Design a service that generates unique IDs for 25K requests/sec across a large fleet with sub-millisecond latency.
> **Ideal answer:** A Snowflake-style composite ID (timestamp + worker ID + sequence), generated entirely in-process with no network call per request; the only coordination is a one-time worker-ID lease at node startup via ZooKeeper/etcd, which structurally prevents two nodes from colliding.
> **Common trap:** Proposing a centralized counter or database sequence "for simplicity," missing that it reintroduces a synchronous per-request bottleneck the whole design is meant to avoid.
> **Next question:** A node's system clock jumps backward by 50ms due to an NTP correction. Walk through exactly what your generator does at that moment.

> 🎯 **Interview Lens**
> **Q:** Why not just use random UUIDs and skip all this coordination complexity entirely?
> **Ideal answer:** UUIDs are genuinely zero-coordination and simpler, but they're not time-sortable (hurting B-tree index locality on insert) and are roughly 2-4x larger than a 64-bit composite ID - both real costs at high insert volume into an indexed store. Snowflake-style IDs trade a small amount of one-time coordination for sortability and compactness.
> **Common trap:** Treating "zero coordination" as strictly better without weighing the downstream storage/indexing cost of non-sortable, larger IDs.
> **Next question:** If the consuming system doesn't actually care about ID sortability at all, does that change your recommendation?

> 🎯 **Interview Lens**
> **Q:** Two nodes somehow end up with the same worker ID in production. How did that happen, and how do you prevent it?
> **Ideal answer:** Almost always a static-configuration error (deploy-time duplicate, or a scaling event that reuses an ordinal). The structural fix is a coordination-service lease with exclusive-acquisition semantics, so the assignment mechanism itself makes duplication impossible rather than relying on deploy-time discipline.
> **Common trap:** Treating this as a one-off deploy bug to fix rather than recognizing static configuration has no structural prevention mechanism at all.
> **Next question:** Your coordination service (ZooKeeper) is down and a new node needs to start. What should happen?

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| UUID | Universally Unique Identifier | 128-bit randomly-generated identifier, not inherently sortable |
| NTP | Network Time Protocol | Clock-synchronization protocol; corrections from it can cause backward clock jumps |

### Anti-patterns

- A single centralized auto-increment counter for ID generation at scale - caps throughput at one database's write capacity and is a single point of failure; use a coordination-free composite-ID scheme instead.
- Assigning worker IDs via undisciplined static configuration with no validation - a silent, production-breaking duplicate-ID bug waiting to happen; use coordination-service leasing or enforce deploy-time validation.
- Ignoring backward clock jumps - silently generating IDs without detecting `timestamp < last_timestamp` risks real duplicate IDs; always detect and handle explicitly.
