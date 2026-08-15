# ACID vs BASE

## Prerequisites

- **[CAP Theorem](./cap-theorem.md)** [Must read]
- **[Consistency Models](./consistency-models.md)** [Should read]
- **[Replication Strategies](./replication-strategies.md)** [Should read]

## Table of Contents

- [Mental Model & Intuition](#mental-model--intuition)
- [Formal Definition](#formal-definition)
- [Core Mechanics](#core-mechanics)
- [Often Confused With](#often-confused-with)
- [Variants & Extensions](#variants--extensions)
- [When This Applies](#when-this-applies)
- [Real-World Applications](#real-world-applications)
- [Performance & Complexity](#performance--complexity)
- [Common Misapplications & Gotchas](#common-misapplications--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

## TLDR

ACID (Atomicity, Consistency, Isolation, Durability) guarantees a transaction either fully happens or doesn't, leaves the database in a valid state, appears isolated from concurrent transactions, and survives a crash - the contract relational databases sell. BASE (Basically Available, Soft state, Eventually consistent) drops that contract in exchange for horizontal scale: the system stays up under partition, state may be in flux, and replicas converge on their own schedule rather than instantly. Neither is strictly better - ACID buys correctness guarantees at the cost of coordination latency and scale ceiling; BASE buys availability and throughput at the cost of pushing conflict handling onto the application.

---

## Mental Model & Intuition

**Interviewer TL;DR:** ACID is a single cashier with one till - every transaction is handled completely, correctly, and in order, or not at all. BASE is a chain of self-checkout kiosks - always open, each operating on its own local view, syncing totals with headquarters later.

**Mental model:** ACID buys correctness by making operations wait for each other; BASE buys availability by letting operations proceed independently and reconciling afterward.

### The Bank Teller vs Self-Checkout Analogy

_ACID is one teller with one ledger; BASE is many self-checkout kiosks that sync later - the trade-off is coordination now vs reconciliation later._

A single bank teller processes one transaction fully before starting the next: debit account A, credit account B, done - both changes happen together or neither does, and the next customer sees the updated balance immediately. This is ACID. There is exactly one source of truth, and every operation waits its turn.

Now replace the teller with a chain of self-checkout kiosks in different cities, each keeping a local running total and syncing with headquarters every few minutes. Every kiosk stays open even if the sync link to headquarters drops - that's the point of having many of them. But for a window after a sale, the local total and headquarters' total disagree. Eventually they converge. This is BASE: available now, correct eventually.

Neither design is wrong. A bank vault needs the teller model - a phantom balance is a lawsuit. A retail chain's dashboard can tolerate a kiosk's total lagging by a few minutes - a stale total is a Tuesday.

> 🧠 **Thought Process**
> A senior engineer doesn't ask "should this system be ACID or BASE?" as a global label - they ask it per operation: "does this specific write need to be immediately, provably correct everywhere, or can it be locally correct now and globally correct soon?" A single application routinely needs both: ACID for the payment ledger, BASE for the activity feed.

**Key Takeaway:** ACID trades availability and latency for immediate, provable correctness. BASE trades immediate correctness for availability and horizontal scale. The choice is per-operation, not per-system.

---

## Formal Definition

**Interviewer TL;DR:** ACID is four independent guarantees a transaction must satisfy: all-or-nothing (Atomicity), valid-state-to-valid-state (Consistency), no visible interference from concurrent transactions (Isolation), and survives a crash once committed (Durability). BASE is a looser three-part description, not a formal proof: available most of the time, state that may not reflect the latest write, and a promise that replicas converge given enough time.

**Mental model:** ACID is a checklist a transaction must pass; BASE is a description of what a system gives up to stay available.

**Atomicity:** a transaction's operations either all commit or all roll back - there is no partial application visible to any other transaction or to a crash recovery.

**Consistency (ACID's C):** a transaction takes the database from one state that satisfies all defined constraints (foreign keys, uniqueness, application invariants) to another such state. This is *not* CAP's C (linearizability) - see [Often Confused With](#often-confused-with).

**Isolation:** concurrent transactions produce the same result as if they had executed one at a time, in some order - the strength of that guarantee is tunable via isolation levels (see [Variants & Extensions](#variants--extensions)).

**Durability:** once a transaction commits, its effects survive any subsequent crash, typically via a write-ahead log flushed to durable storage before acknowledging the commit.

**BASE** has no equivalent formal proof - it names a design posture: **B**asically Available (the system responds, possibly with stale or partial data), **S**oft state (state may change over time even without new input, as replicas converge), **E**ventually consistent (given no new writes, replicas converge to the same value, with no bound on how long that takes).

---

## Core Mechanics

**Interviewer TL;DR:** ACID is implemented by making writers coordinate before committing - locks, write-ahead logs, two-phase commit for cross-node transactions. BASE is implemented by letting writers commit locally and immediately, then propagating and reconciling asynchronously.

**Mental model:** ACID pays a latency cost up front (coordinate, then respond) so nothing downstream has to detect or fix a conflict. BASE pays no latency cost up front but pushes conflict detection and resolution to a later step - or to the application.

### How ACID Is Achieved

_Coordinate before committing: nothing is visible until the whole transaction is guaranteed durable and valid._

A relational database implements ACID with a combination of mechanisms working together:

- **Write-ahead log (WAL):** every change is written to an append-only log and flushed to disk before the transaction is acknowledged as committed. On crash recovery, the log replays committed transactions and discards uncommitted ones - this is what gives Durability and, combined with rollback, Atomicity.
- **Locking / MVCC:** row or table locks (or multi-version concurrency control, which gives each transaction a consistent snapshot instead of blocking readers) prevent one transaction from seeing another's uncommitted changes - this is what gives Isolation.
- **Constraint checking:** foreign keys, unique indexes, and check constraints are validated before commit; a violation rolls back the whole transaction - this is what gives Consistency.
- **Two-phase commit (2PC):** when a transaction spans multiple nodes (a distributed database, or two databases coordinated by an application), a coordinator asks every participant to prepare (durably log the intent to commit) before telling any of them to actually commit - ensuring all nodes commit or all abort, never a split outcome.

```
Single-node ACID transaction:

  BEGIN → [write A] → [write B] → validate constraints → WAL flush → COMMIT
                                         │
                                    fail anywhere → ROLLBACK (all-or-nothing)
```

> ⚠️ **Warning / Gotcha**
> Two-phase commit guarantees atomicity across nodes but is a blocking protocol - if the coordinator crashes after participants have prepared but before it sends commit/abort, every participant holds its locks indefinitely waiting for a decision. This is why 2PC does not scale to large clusters and why most horizontally-scaled databases avoid it in favor of consensus-based commit (e.g. Spanner's Paxos groups) or avoid cross-shard transactions entirely.

### How BASE Is Achieved

_Respond immediately, reconcile later: a write is accepted locally and durability/propagation happen in the background._

A BASE-style system accepts a write on whichever node receives it, acknowledges the client immediately, and propagates the change to other replicas asynchronously (gossip, anti-entropy background jobs, or a replication log consumed at each replica's own pace). Because two replicas can accept conflicting writes to the same key before either has heard from the other, the system needs a reconciliation strategy - typically last-write-wins, vector clocks, or CRDTs; the full mechanics of each live in [Consistency Models → How Weak Models Are Achieved](./consistency-models.md#how-weak-models-are-achieved).

```
BASE write path:

  Client → write accepted on N1 → ACK to client (fast)
                    │
                    └──async──► propagate to N2, N3, ... → eventually converge
```

**Soft state in practice:** a BASE system's state can change without a new external write - a background anti-entropy job merging two replicas' divergent values changes what a read returns, even though no client wrote anything in between. This is the concrete meaning of "soft state": the value at a given node is not stable until convergence completes.

> ⚖️ **Decision Framework**
> The core mechanical trade-off: ACID pays coordination cost per write (locks, quorum, log flush) to guarantee correctness before responding. BASE pays reconciliation cost per conflict (merge logic, vector clocks, application-level resolution) after responding. Choose ACID when a wrong answer is worse than a slow answer; choose BASE when no answer is worse than a stale answer.

**Key Takeaway:** ACID's mechanisms all serve one goal - make sure nothing is visible until it's guaranteed correct. BASE's mechanisms serve the opposite goal - make sure something is always visible, and fix correctness afterward.

---

## Often Confused With

**Interviewer TL;DR:** ACID's C is constraint satisfaction within a transaction, not CAP's C (linearizability) - a system can be fully ACID-consistent on a single node while the question of CAP consistency doesn't even arise until there's more than one replica. BASE is not "no guarantees" - eventual consistency is a specific, bounded promise (convergence, not correctness-in-the-meantime).

**Mental model:** ACID and BASE answer different questions - ACID is about what a *single transaction* guarantees; CAP and BASE are about what a *replicated system* guarantees between nodes. They intersect but are not the same axis.

### ACID's C vs CAP's C

_Two properties that share a letter and nothing else - full comparison lives on [CAP Theorem](./cap-theorem.md#caps-c-vs-acids-c)._

ACID's Consistency means a transaction moves the database between states that satisfy its own constraints - foreign keys hold, invariants are preserved. CAP's Consistency means linearizability - every read reflects the most recent write, globally ordered. A single-node relational database can be perfectly ACID-consistent; the question of CAP consistency doesn't apply until there's more than one copy of the data. See [CAP Theorem's dedicated comparison table](./cap-theorem.md#caps-c-vs-acids-c) for the full breakdown - it is not restated here.

### ACID vs BASE Is Not "Correct vs Incorrect"

_BASE systems are not sloppy - eventual consistency is a precise, if weaker, guarantee._

A common misreading: ACID means "the data is right" and BASE means "the data might be wrong." That's imprecise. BASE systems guarantee convergence - given no new writes, every replica eventually agrees. What BASE gives up is the *timing* guarantee (when convergence happens) and often the *ordering* guarantee during the convergence window, not correctness itself. A BASE system with vector clocks or CRDTs can be exactly as free of data loss as an ACID system - it just resolves conflicts after the fact instead of preventing them up front.

### ACID vs Isolation Levels

_"ACID" names the four guarantees; "isolation level" tunes how strictly one of them (Isolation) is enforced - they are not interchangeable terms._

"This database is ACID" is often used loosely to mean "fully serializable." In practice, most production databases default to a weaker isolation level (Read Committed, Repeatable Read) that still satisfies Atomicity, Consistency, and Durability fully, but relaxes Isolation to trade concurrency for throughput. A database can be ACID-compliant while running at an isolation level that permits phenomena like non-repeatable reads. See [Variants & Extensions](#variants--extensions) for the full isolation-level spectrum.

> ⚠️ **Warning / Gotcha**
> When a candidate says "we need ACID so we'll use Postgres" in a distributed-systems context, the right follow-up is: "ACID guarantees what, exactly, and at what isolation level, and does that guarantee extend across nodes if you shard this later?" Single-node ACID says nothing about cross-node behavior - sharding a "fully ACID" database usually forfeits cross-shard transactional atomicity unless the system explicitly implements distributed transactions (2PC, consensus-based commit).

**Key Takeaway:** Name the axis before using the word "consistent" - ACID's C (constraints within a transaction), CAP's C (linearizability across nodes), or an isolation level (concurrency behavior within ACID's I). Conflating them is the single most common mistake in this area.

---

## Variants & Extensions

**Interviewer TL;DR:** ACID's Isolation is itself a spectrum - Serializable, Repeatable Read, Read Committed, Read Uncommitted - each permitting more concurrency anomalies than the last in exchange for throughput. BASE has no formal spectrum, but production systems commonly layer stronger client-centric guarantees (read-your-writes, bounded staleness) on top of a bare eventual-consistency floor.

**Mental model:** Both ACID and BASE are less binary in practice than their four/three-letter acronyms suggest - each names one end of a spectrum that real systems tune.

### ACID Isolation Levels

| Level            | Prevents                                              | Permits                                  | Typical cost                          |
| ----------------- | ------------------------------------------------------ | ------------------------------------------ | ---------------------------------------- |
| Serializable       | All anomalies - equivalent to fully sequential execution | Nothing                                    | Highest - most locking/retry contention  |
| Repeatable Read     | Dirty reads, non-repeatable reads                        | Phantom reads (new rows matching a prior query appear) | Moderate - common default (e.g. MySQL InnoDB) |
| Read Committed      | Dirty reads (reading another transaction's uncommitted write) | Non-repeatable reads, phantom reads        | Lower - common default (e.g. Postgres, Oracle) |
| Read Uncommitted    | Nothing                                                  | Dirty reads and everything above           | Lowest - rarely used in production        |

The database still satisfies Atomicity, ACID's Consistency, and Durability fully at every level above - only Isolation's strictness changes. Choosing a weaker level is a deliberate throughput-for-anomaly-risk trade, not a partial ACID implementation.

### BASE Extensions

Production BASE systems rarely ship with bare eventual consistency alone - they commonly layer:

- **Read-your-writes** - a client always sees its own prior writes, implemented via sticky sessions or version-tagged reads. See [Consistency Models](./consistency-models.md#read-your-writes--monotonic-reads) for the mechanics.
- **Bounded staleness** - a system-enforced upper limit on how stale a read can be (e.g. "never more than 5 seconds behind"), trading some latency for a concrete SLA the application can rely on instead of an unbounded "eventually."
- **Tunable consistency** - exposing the ACID/BASE choice as a per-query knob rather than a system-wide default, e.g. Cassandra's `QUORUM` vs `ONE` read/write consistency levels.

**Key Takeaway:** Neither ACID nor BASE is truly binary in production - Isolation level tunes ACID's strictness, and layered guarantees (read-your-writes, bounded staleness, tunable consistency) tune how "eventual" a BASE system's eventual consistency actually is.

---

## When This Applies

**Interviewer TL;DR:** Choose ACID when a wrong or partially-applied write causes direct harm - money, inventory, anything with a uniqueness or referential-integrity requirement. Choose BASE when availability is user-visible and staleness is tolerable, or when the write volume/geographic spread makes cross-node coordination too expensive. Most production systems apply both, per data domain.

**Mental model:** The question is not "is this application ACID or BASE?" - it's "for this specific piece of state, is an unavailable-but-correct answer better than an available-but-stale one?"

### Choosing ACID

_Use ACID when partial application or a stale/conflicting read causes a concrete, unrecoverable error._

- **Financial ledgers** - a debit without its matching credit is a corrupted books, not a stale display.
- **Inventory with hard limits** - overselling the last unit of a physical item is a real-world commitment the system made incorrectly.
- **Anything with foreign-key or uniqueness constraints that matter** - a user record referencing a deleted account, or two accounts claiming the same username.
- **Multi-step workflows that must not partially apply** - reserving a seat and charging a card must both happen or neither should.

### Choosing BASE

_Use BASE when availability is directly user-visible and the cost of temporary staleness or a resolvable conflict is low._

- **Social feeds and activity streams** - a like or comment count that's briefly behind is imperceptible.
- **Shopping cart contents** - Amazon's original Dynamo paper targeted exactly this: cart availability during a partition matters more than perfect consistency, and conflicting cart states can be merged.
- **Product catalogs, search indexes, recommendation data** - a few seconds of staleness is invisible to the user and cheap to tolerate.
- **High write-volume telemetry and analytics counters** - approximate, eventually-correct counts are fine; blocking writes to guarantee exactness is not worth the throughput cost.

### Per-Domain, Not Per-System

_A single application almost always needs both, split by data domain - this is the same per-operation reasoning CAP requires, applied to transactions instead of partition behavior._

An e-commerce platform is the canonical example: payment processing and inventory decrement need ACID (a relational database, a transaction wrapping both). The product catalog, recommendations, and browsing history can run BASE (a document or wide-column store optimized for read throughput and availability). Polyglot persistence - using different databases for different domains within one system - exists largely because of this split.

> ⚖️ **Decision Framework**
> For each piece of state, ask: **"If two writes to this conflict, can the conflict be resolved after the fact (merge, last-write-wins, re-fetch), or does it need to be prevented before either write completes?"** If resolution after the fact is acceptable and cheap - BASE. If prevention is the only safe option because the wrong outcome is unrecoverable (double-spent money, oversold inventory) - ACID.

**Key Takeaway:** ACID vs BASE is a per-data-domain decision within a system, not a single label for the whole application. Naming which domains need which, and why, is the practical skill this trade-off tests.

---

## Real-World Applications

**Interviewer TL;DR:** ACID systems - PostgreSQL, MySQL/InnoDB, Spanner - anchor financial, inventory, and any strongly-constrained data. BASE systems - Cassandra, DynamoDB, CouchDB - anchor high-throughput, geographically-distributed, user-facing data where availability outranks immediate correctness.

**Mental model:** The database a team reaches for is usually a materialized opinion on this trade-off for that specific workload - understanding why they chose it matters more than the product name.

| System                | Model | Primary use case                            | Why                                                                                          |
| ---------------------- | ----- | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| PostgreSQL / MySQL     | ACID  | Transactional business data, financial records | Mature single-node (or single-writer) transactional guarantees, well-understood isolation levels |
| Google Spanner         | ACID  | Global relational transactions at scale       | TrueTime bounds clock uncertainty, enabling externally-consistent distributed transactions - ACID guarantees stretched across a globally distributed system |
| Cassandra               | BASE  | High-throughput write workloads                | Tunable consistency per query; defaults to availability and write throughput over immediate consistency |
| DynamoDB                | BASE  | User-facing always-on applications             | Amazon's founding design principle - a shopping cart write must never fail, even under partition |
| CouchDB                 | BASE  | Offline-first / occasionally-connected apps    | Local writes always succeed; conflicts surface via revision history for later resolution     |

**PostgreSQL** enforces full ACID on a single primary via MVCC and WAL-based durability; scaling writes beyond one primary (sharding, multi-master) forfeits cross-shard transactional atomicity unless distributed-transaction machinery is added explicitly.

**Spanner** is the notable exception that blurs the line: it delivers ACID transactions - including cross-region ones - by using TrueTime (GPS and atomic clocks bounding clock skew) to order transactions globally, at a stated latency cost of tens of milliseconds per global transaction. It demonstrates that ACID and horizontal, multi-region scale are not fundamentally incompatible - just expensive to reconcile.

**At scale, Cassandra's reconciliation cost becomes the bottleneck it was designed to avoid:** wide, frequently-updated partitions accumulate conflicting writes faster than anti-entropy repair can converge them, and unresolved tombstones (deletion markers) from `last-write-wins` conflicts can accumulate past the `gc_grace_seconds` window, silently resurrecting deleted data on the next repair - a failure mode invisible until write volume and node count both climb past what worked in staging.

> 🧠 **Thought Process**
> When asked "is this database ACID or BASE?", the sharp answer names the specific trade the vendor made and why: "Cassandra is BASE by default - it favors write availability and lets conflicting writes reconcile via tunable strategies - but it exposes per-query consistency levels, so a `QUORUM` write/read pair behaves close to strongly consistent when a specific operation needs it." That's more useful than reciting the acronym.

**Key Takeaway:** No production system commits to one model system-wide when the workload doesn't force it - the mature answer names the default and the escape hatch (Cassandra's tunable consistency, DynamoDB's strongly-consistent read option, Spanner's ACID-at-scale approach).

---

## Performance & Complexity

**Interviewer TL;DR:** ACID's cost is coordination latency per write - locks, quorum acknowledgment, log flushes - which caps single-record write throughput and degrades under contention or geographic spread. BASE's cost is pushed to reconciliation - conflict resolution logic, storage overhead for version history (vector clocks, tombstones), and application complexity for handling a value that might still be converging.

**Mental model:** ACID trades throughput for correctness-at-write-time; BASE trades application simplicity for throughput - the total complexity doesn't vanish, it moves.

- **ACID write latency** scales with coordination cost: a single-node commit is dominated by the WAL fsync (typically low single-digit milliseconds on SSD); a cross-node 2PC or consensus-based commit adds a full round trip to every participant, often tens of milliseconds and growing with geographic distance between replicas.
- **ACID throughput ceiling** is set by lock contention - hot rows serialize writers, and Serializable isolation can force retries under high concurrency, which is why most systems default to a weaker isolation level (see [Variants & Extensions](#variants--extensions)).
- **BASE write latency** is dominated by the local write path only - typically sub-millisecond to low single-digit milliseconds, since the client is acknowledged before cross-replica propagation completes.
- **BASE's hidden cost** shows up later: vector-clock metadata grows with the number of concurrent writers per key, tombstones from deletes must be retained until repair windows close, and conflict-resolution logic (merge functions, application-level reconciliation) is complexity the application now owns instead of the database.

**Key Takeaway:** Neither model is "faster" in an absolute sense - ACID pays its cost up front and predictably (per write, before acknowledgment); BASE pays its cost later and less predictably (per conflict, during reconciliation, or as accumulated metadata overhead).

---

## Common Misapplications & Gotchas

**Interviewer TL;DR:** The recurring mistakes: treating BASE as "no guarantees at all," assuming a NoSQL label means BASE and a SQL label means ACID, and reaching for full ACID by default without checking whether the specific write actually needs it.

**Mental model:** Most misapplications come from treating ACID/BASE as a property of the *database product* rather than a property of the *specific operation* being designed.

### Common Misconceptions

- **"BASE means the data is wrong for a while."** It doesn't - it means no staleness bound is guaranteed by default. A BASE system's replicas could converge within milliseconds or, under partition, not until connectivity is restored - "eventually" is a promise about direction, not a promise about timing (see [Consistency Models' staleness-bound gotcha](./consistency-models.md#ignoring-the-staleness-bound) for the full mechanics).
- **"NoSQL = BASE, SQL = ACID."** Product category doesn't determine the model. MongoDB supports multi-document ACID transactions; Spanner is a horizontally-scaled relational system that is fully ACID; conversely, a "SQL" database can be configured with relaxed durability (e.g. asynchronous replication, `fsync` disabled) that forfeits Durability guarantees in practice. Check the specific configuration, not the category label.
- **"Sharding a relational database preserves ACID."** Sharding a single-node ACID database across multiple nodes without adding distributed-transaction machinery (2PC, consensus-based commit like Spanner's) silently forfeits cross-shard atomicity and isolation - a transaction touching two shards is no longer guaranteed all-or-nothing unless the system explicitly implements that guarantee.

### Defaulting to ACID Without Checking the Cost

_Reaching for a fully ACID, strongly-consistent design by default because it "sounds safer" ignores the throughput and availability cost paid on every write, even for data that never needed the guarantee._

Teams often wrap every write in a transaction at Serializable isolation "to be safe," without checking whether the specific data actually has a correctness requirement that demands it. This caps throughput and increases contention on data - view counts, non-critical logs, cached derived values - that would have been perfectly fine as BASE.

**What to do instead:** classify each write by what actually breaks on a conflict or partial application. Reserve ACID for data where that answer is "an unrecoverable, harmful error." Default lower-stakes data to BASE and only add guarantees (read-your-writes, bounded staleness) where a concrete user-visible anomaly would otherwise occur.

### Underestimating BASE's Reconciliation Complexity

_Choosing BASE for throughput without designing the conflict-resolution strategy up front pushes an unsolved problem into production._

A team picks a BASE-model database for scale, ships with the default `last-write-wins` conflict resolution, and only later discovers it silently drops legitimate concurrent writes (e.g. two users adding different items to the same cart, where the second write should merge, not overwrite the first).

**What to do instead:** design the reconciliation strategy - merge semantics, vector clocks, or CRDTs - as part of the initial data model, not as a fix after data loss is reported. The full mechanics of each strategy are covered in [Consistency Models → How Weak Models Are Achieved](./consistency-models.md#how-weak-models-are-achieved) and are not restated here.

**Key Takeaway:** The most common mistake with both models is applying them by category label (the product name, "NoSQL" vs "SQL") instead of by the actual correctness requirement of the specific data being written.

---

## Interview Scenario Bank

> 🗣️ **First 30 seconds:** "I'd first ask which pieces of this system's data have a hard correctness requirement - money, inventory, uniqueness constraints - versus which are user-visible but tolerant of brief staleness, like feeds or counters. That split usually determines whether I reach for a single ACID-transactional store for the critical path and a BASE-model store for everything else, rather than picking one model for the whole system."

### Explaining ACID vs BASE Cold

> 🎯 **Interview Lens**
> **Q:** What's the difference between ACID and BASE?
> **Ideal answer:** ACID guarantees a transaction is atomic, leaves the database in a valid state, is isolated from concurrent transactions, and survives a crash - the contract traditional relational databases provide. BASE trades that immediate-correctness contract for availability - the system stays responsive under partition, accepts that state may be in flux (soft state), and only promises replicas converge eventually, with no bound on when.
> **Common trap:** Describing BASE as "the data can just be wrong" instead of naming what it actually guarantees (eventual convergence) and what it gives up (a timing/ordering bound).
> **Next question:** "Can a single system use both models?" → Yes - most production systems split by data domain: ACID for payments/inventory, BASE for feeds/catalogs/analytics, often as genuinely different databases (polyglot persistence) within the same application.

### ACID's C vs CAP's C

> 🎯 **Interview Lens**
> **Q:** Is ACID's Consistency the same as CAP's Consistency?
> **Ideal answer:** No - ACID's C means a transaction moves the database between states that satisfy its own constraints (foreign keys, invariants). CAP's C means linearizability - every read reflects the most recent write, globally ordered across nodes. A single-node database can be fully ACID-consistent while the question of CAP consistency doesn't even apply, since that requires more than one replica.
> **Common trap:** Treating "consistent" as one property and assuming a database that's "ACID" is therefore also strongly consistent across a distributed deployment.
> **Next question:** "If you shard an ACID-compliant single-node database across multiple nodes without adding anything else, what guarantee do you lose first?" → Cross-shard atomicity and isolation - a transaction touching two shards is no longer all-or-nothing unless the system adds distributed-transaction machinery like two-phase commit or consensus-based commit.

### Choosing a Model for a Feature

> 🎯 **Interview Lens**
> **Q:** You're designing an e-commerce checkout flow. Where would you use ACID, and where would you use BASE?
> **Ideal answer:** Payment processing and inventory decrement need ACID - a charge without a matching inventory decrement, or an oversold item, is an unrecoverable error, so wrap both in a transaction. The product catalog, recommendations, and browsing/order history can be BASE - a few seconds of staleness on a recommended-items list is invisible and cheap to tolerate, and that data benefits from BASE's availability and throughput.
> **Common trap:** Picking one model for the entire checkout system instead of splitting by which specific writes have a hard correctness requirement.
> **Next question:** "What happens to the shopping cart itself - ACID or BASE?" → Typically BASE, following Amazon's original Dynamo design - a cart write must never fail even under partition, and conflicting concurrent cart states (added from two devices) can be merged rather than requiring one to overwrite the other.

### Reconciling a BASE Conflict

> 🎯 **Interview Lens**
> **Q:** Two replicas in a BASE system each accept a conflicting write to the same key. How do you resolve it?
> **Ideal answer:** Depends on the chosen strategy - last-write-wins (simplest, timestamp-based, can silently drop a concurrent write on clock skew), vector clocks (detect genuine concurrency and surface the conflict instead of guessing), or CRDTs (data structures whose merge function is mathematically guaranteed to converge without a manual resolution step).
> **Common trap:** Assuming last-write-wins is always an acceptable default - it silently discards data on genuinely concurrent writes, which is unacceptable when both writes carry independent information (e.g. two items added to the same cart from different devices).
> **Next question:** "Your BASE system just recovered from a long partition - what's the operational risk during reconciliation?" → A backlog of conflicting writes reconciling all at once can spike write amplification and, for last-write-wins systems, silently resurrect deleted data if a delete's tombstone has already expired past the repair window - both are why the reconciliation strategy needs to be designed up front, not discovered in an incident.

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form                                             | One-line meaning                                                        |
| ------- | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| ACID    | Atomicity, Consistency, Isolation, Durability           | The four guarantees a traditional transactional database provides           |
| BASE    | Basically Available, Soft state, Eventually consistent  | The availability-favoring alternative posture for distributed data stores    |
| WAL     | Write-Ahead Log                                         | Append-only log flushed before a transaction is acknowledged as committed    |
| MVCC    | Multi-Version Concurrency Control                       | Isolation mechanism giving each transaction a consistent snapshot instead of locking |
| 2PC     | Two-Phase Commit                                        | Protocol coordinating atomic commit of a transaction across multiple nodes   |
| CRDT    | Conflict-free Replicated Data Type                      | Data structure whose concurrent updates merge deterministically without coordination |

---

### Anti-patterns

- **Wrapping every write in Serializable ACID "to be safe"** - fails because it caps throughput and increases contention on data that never needed the guarantee; classify by actual correctness requirement and default lower-stakes writes to a cheaper isolation level or BASE.
- **Shipping BASE with default last-write-wins and no reconciliation design** - fails because it silently drops legitimate concurrent writes; design the merge strategy (vector clocks, CRDTs, or explicit application-level resolution) as part of the initial data model.
- **Assuming a database's SQL/NoSQL category determines its model** - fails because several modern databases (MongoDB, Spanner) blur the line; check the specific product's transactional guarantees and configuration, not its category label.
- **Sharding an ACID database and assuming ACID still holds across shards** - fails because cross-shard atomicity requires explicit distributed-transaction machinery the sharding itself doesn't provide; add 2PC/consensus-based commit or scope transactions to a single shard.
- **Conflating ACID's C with CAP's C** - fails because they are orthogonal properties (transaction-local constraint satisfaction vs cross-node linearizability); name which one a specific requirement actually needs before choosing a storage system - full breakdown on [CAP Theorem](./cap-theorem.md#caps-c-vs-acids-c).

---

### Selection Matrix

| Criteria                   | ACID                                                        | BASE                                                           |
| ---------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| Correctness timing            | Guaranteed at commit time                                     | Guaranteed eventually, no fixed bound                              |
| Availability under partition   | Lower - may reject/block to preserve correctness               | Higher - accepts writes locally regardless of partition            |
| Write latency (normal)         | Higher - coordination (locks, quorum, log flush) before ACK    | Lower - local write acknowledged immediately                       |
| Conflict handling               | Prevented via locking/isolation before commit                  | Resolved after the fact (LWW, vector clocks, CRDTs, app-level merge) |
| Complexity location             | Database engine (transaction manager)                          | Application + database (reconciliation logic)                      |
| Typical use cases               | Financial ledgers, inventory with hard limits, uniqueness constraints | Feeds, shopping carts, catalogs, analytics counters, offline-first apps |
| Example systems                 | PostgreSQL, MySQL/InnoDB, Spanner                                | Cassandra, DynamoDB, CouchDB                                        |
