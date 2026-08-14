# Consistency Models

## Prerequisites

- **[Replication Strategies](./replication-strategies.md)** [Should read]

## Table of Contents

- [Mental Model & Intuition](#mental-model--intuition)
- [Formal Definition](#formal-definition)
- [The Consistency Spectrum](#the-consistency-spectrum)
- [Core Mechanics](#core-mechanics)
- [Often Confused With](#often-confused-with)
- [Variants & Extensions](#variants--extensions)
- [When This Applies](#when-this-applies)
- [Real-World Applications](#real-world-applications)
- [Common Misapplications & Gotchas](#common-misapplications--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

## TLDR

A consistency model is a contract: how stale can a read be relative to the writes that happened before it, and in what order must different clients see those writes? Linearizability (every read sees the latest write, globally ordered) sits at the strong end; eventual consistency (reads converge "eventually", no ordering promised) sits at the weak end - with read-your-writes, monotonic reads, and causal consistency filling the space between. The choice is a spectrum, not a binary, and it's the axis CAP's C collapses into two extremes.

---

## Mental Model & Intuition

**Interviewer TL;DR:** A consistency model answers one question precisely: after a write happens, what can a reader see, and when? Different models answer it differently - from "always the latest value, instantly, everywhere" to "eventually, in some order, maybe not the order you expect."

**Mental model:** Think of consistency models as a dial, not a switch - CAP forces you to pick an extreme during a partition, but consistency models describe every point in between for how a replicated system behaves the rest of the time.

### The Group Chat Analogy

_A consistency model is a promise about what messages you'll see and in what order, when the group has multiple copies of the conversation._

Imagine a group chat replicated across three phones, each syncing over an unreliable connection. Someone sends "meet at 5pm", then a reply "actually make it 6". A consistency model is the answer to: does every phone show both messages? In what order? Can a phone show the reply before the original?

- **Linearizable:** every phone shows both messages, in the same order, the instant either is sent - as if there were only one phone.
- **Causally consistent:** every phone shows "meet at 5pm" before "actually make it 6" (the reply logically depends on the original), but unrelated messages from someone else may appear in a different order on different phones.
- **Eventually consistent:** all phones show both messages *eventually* - but for a while, one phone might show only the reply, or neither, or show them out of order.

> 🧠 **Thought Process**
> A senior engineer doesn't ask "is this system consistent?" - consistency is never binary. The real question is: "what ordering and staleness guarantee does this system make, and does my application's correctness depend on a stronger one?" Most bugs in distributed applications come from assuming a stronger consistency model than the system actually provides.

**Key Takeaway:** A consistency model isn't a yes/no property - it's a precise contract about staleness and ordering. Naming the exact model your system provides (not just "consistent" or "eventually consistent") is what separates a vague answer from a precise one.

---

## Formal Definition

**Interviewer TL;DR:** Each model is a constraint on the order operations may appear to execute in, relative to real time and to each other. Linearizability is the strongest useful constraint (real-time total order); eventual consistency is the weakest (no ordering constraint, only a convergence promise).

**Mental model:** Every model is defined by what it does **not** allow - the stronger the model, the more orderings it forbids.

**Linearizability:** every operation appears to take effect instantaneously at some point between its invocation and its response, and all operations across all clients appear in a single global order consistent with real time. If write W completes before read R begins (in real time), R must see W.

**Sequential consistency:** all clients see operations in *some* single global order, and each client's own operations appear in that order in the sequence they issued them - but that global order need not match real time. Two clients can disagree about which of two concurrent operations happened "first" in wall-clock terms, as long as everyone agrees on *a* single order.

**Causal consistency:** operations that are causally related (a read that influences a later write, a reply to a message) are seen in that order by everyone. Operations with no causal relationship may be seen in different orders by different clients.

**Eventual consistency:** if no new writes occur, all replicas will eventually converge to the same value. No ordering guarantee during convergence, no bound on how long convergence takes.

---

## The Consistency Spectrum

**Interviewer TL;DR:** From strongest to weakest: Linearizability → Sequential Consistency → Causal Consistency → Read-Your-Writes / Monotonic Reads → Eventual Consistency. Each step down trades a specific ordering guarantee for lower latency and higher availability.

**Mental model:** This is CAP's C, unpacked - CAP treats consistency as binary (linearizable or not), but production systems live at every point on this spectrum.

```
STRONGEST                                                          WEAKEST
│                                                                        │
Linearizability → Sequential → Causal → Read-Your-Writes → Eventual
(real-time         (global      (respects  Monotonic Reads   (converges,
 total order)       order,       causality) Monotonic Writes   no order
                    no real-                                    guarantee)
                    time bound)
│                                                                        │
Highest latency,                                          Lowest latency,
lowest availability                                    highest availability
```

### Linearizability

_Strongest practical model: reads always reflect the most recent write, globally, in real time._

Every operation behaves as if it executed atomically at a single instant, and that instant respects real-time order across every client. This is CAP's C - see [CAP Theorem](./cap-theorem.md) for the full impossibility argument. Achieved via consensus protocols (Raft, Paxos) or a single-writer architecture. The cost: every write must be acknowledged by a quorum, and every read must confirm it has the latest value - both add latency, and availability drops when a quorum can't be reached.

### Sequential Consistency

_All clients agree on one global order - it just doesn't have to match wall-clock time._

Weaker than linearizability in one specific way: it drops the real-time constraint. If two operations are concurrent (neither causally depends on the other), sequential consistency permits any single consistent ordering of them - linearizability requires the ordering to match which one actually completed first in real time. Each client's own operations still appear in program order. Rare as a named target in production systems - most that don't need full linearizability drop further, to causal consistency, rather than stopping here.

### Causal Consistency

_Preserves cause-and-effect ordering; unrelated operations can be seen in different orders by different observers._

If operation B causally depends on operation A (B reads a value A wrote, or B is a reply to A), every client that sees B must have already seen A. Operations with no causal link carry no ordering guarantee. This is the strongest model achievable without sacrificing availability during a partition - it's the model most "AP with sane guarantees" systems target, because it rules out the most confusing anomalies (seeing a reply before the message it replies to) while still allowing local, low-latency writes.

### Read-Your-Writes & Monotonic Reads

_Client-centric guarantees: weaker than causal consistency globally, but eliminate the specific anomalies that confuse a single user._

- **Read-your-writes:** a client always sees its own prior writes, even if it's reading from a replica that hasn't caught up with the rest of the system. Without this, a user can update their profile and then, on refresh, see the old value.
- **Monotonic reads:** once a client has seen a value, it never sees an older value on a subsequent read - even from a different replica. Without this, a user can refresh and watch a comment count go backwards.
- **Monotonic writes:** a client's writes are applied in the order it issued them, even if they land on different replicas.

These are per-client guarantees, not global ones - two different clients can still observe the system in different states. They're cheap to provide (often via sticky sessions or client-side version tracking) and eliminate the anomalies users actually notice.

### Eventual Consistency

_Weakest model: only promises convergence, not ordering or a time bound._

If writes stop, every replica eventually holds the same value. No promise about which value "wins" during convergence, no promise about ordering, no promise about how long convergence takes (though in practice it's milliseconds to seconds). This is the default for AP systems under [CAP Theorem](./cap-theorem.md) - it's the cheapest model to provide and the one with the fewest built-in guarantees for the application to rely on.

> ⚠️ **Warning / Gotcha**
> "Eventually consistent" is not one model - it's a floor. A system described as "eventually consistent" might also happen to provide read-your-writes (via sticky sessions) or causal consistency (via vector clocks) on top. Always ask what *additional* guarantees an "eventually consistent" system provides beyond the bare minimum - the label alone under-specifies the actual contract.

**Key Takeaway:** The spectrum isn't a ranking of "better" to "worse" - it's a menu of specific guarantees, each with a specific cost. The skill is matching the weakest model that still satisfies the application's correctness requirement, not defaulting to the strongest available.

---

## Core Mechanics

**Interviewer TL;DR:** Stronger models are implemented by making replicas coordinate before responding (quorums, consensus, single-writer routing); weaker models let replicas respond immediately and reconcile state afterward (via version vectors, CRDTs, or last-write-wins).

**Mental model:** Consistency strength is bought with coordination - the more replicas must agree before responding, the stronger the guarantee and the higher the latency.

### How Strong Models Are Achieved

_Coordinate before responding: don't answer until you know you're not about to contradict yourself._

Linearizability requires a mechanism that gives a total, real-time-respecting order to every operation. In practice: route all writes (and often reads) through a single leader, or require a quorum of replicas to acknowledge before the write completes. Consensus protocols like Raft and Paxos exist specifically to make this "who is the leader" question survive node failures without violating the ordering guarantee.

### How Weak Models Are Achieved

_Respond immediately, reconcile later: don't make the client wait for the rest of the system to agree._

Eventually consistent systems accept a write locally, respond to the client immediately, and propagate the write to other replicas asynchronously (gossip protocols, anti-entropy background jobs). Because two replicas can accept conflicting writes to the same key before either has heard from the other, the system needs a reconciliation strategy:

- **Last-write-wins (LWW):** attach a timestamp to every write, keep the one with the highest timestamp on conflict. Simple, but silently discards a concurrent write - clock skew can pick the "wrong" winner.
- **Vector clocks:** track causal history per replica so the system can detect when two writes are genuinely concurrent (neither caused the other) versus one superseding the other. Concurrent conflicts are surfaced to the application (or the client) to resolve, rather than silently picked.
- **CRDTs (Conflict-free Replicated Data Types):** data structures designed so that concurrent updates merge deterministically without coordination - a grow-only counter, an OR-set. No conflict resolution step needed because the merge function is mathematically guaranteed to converge.

### Client-Centric Guarantees in Practice

_Read-your-writes and monotonic reads are usually implemented at the routing layer, not the storage layer._

The simplest implementation: sticky sessions - route a given client's reads to the same replica that served its writes. More robust: the client tracks a version/timestamp of its last write and passes it along; the server routes the read to (or waits for) a replica that has caught up to at least that version. This is far cheaper than global linearizability because it only needs to satisfy one client's view, not a global order.

> ⚖️ **Decision Framework**
> Match the model to what actually breaks if violated:
>
> - Would a user notice if two of *their own* actions appeared out of order? → read-your-writes / monotonic reads is enough.
> - Would a wrong answer cause direct harm (double-spend, double-booking)? → linearizability.
> - Is "eventually correct, briefly stale" acceptable, and unrelated updates never need to be ordered? → causal consistency or eventual consistency.

**Key Takeaway:** Every consistency model above eventual consistency is bought by coordinating before responding to some degree. The engineering question is always: how much coordination does this specific operation actually need?

---

## Often Confused With

**Interviewer TL;DR:** Consistency models are routinely conflated with CAP's binary C, with ACID's C, and with "strong" vs "eventual" as if those were the only two points on the spectrum.

**Mental model:** Same vocabulary, different granularity - CAP asks a yes/no question about one property; consistency models describe a continuum most systems actually live on.

### Consistency Models vs CAP's C

_CAP's C is a single point on this spectrum - linearizability - not the whole spectrum._

[CAP Theorem](./cap-theorem.md) treats consistency as binary: a system either provides linearizability or it doesn't, and that binary choice is what's traded against availability during a partition. Consistency models are the full spectrum this binary collapses. A system can be "not CAP-consistent" (not linearizable) while still providing a meaningful, well-defined guarantee like causal consistency or read-your-writes - "not linearizable" does not mean "no guarantees at all."

### Consistency Models vs ACID's C

_ACID's C is about constraint satisfaction within a single transaction; consistency models are about cross-replica visibility of writes._

[ACID vs BASE](./acid-vs-base.md) uses "consistency" to mean a transaction moves the database between states that satisfy its constraints (foreign keys, invariants). That's orthogonal to how a value written on one replica becomes visible on another. A single-node database can be perfectly ACID-consistent and the question of consistency *models* (which apply to replicated systems) doesn't even arise until there's more than one copy of the data.

> ⚠️ **Warning / Gotcha**
> Three different "consistency" words show up in distributed systems interviews: ACID's C (constraint satisfaction), CAP's C (linearizability specifically), and "a consistency model" (the general spectrum covered on this page). Naming which one you mean, explicitly, is what separates a precise answer from a hand-wave.

### "Strong" vs "Eventual" as a False Binary

_Most real systems provide something between the two named extremes._

Marketing and casual conversation collapse the whole spectrum into "strong consistency" (usually meaning linearizable) and "eventual consistency" (usually meaning the weakest model). In practice, most production AP systems provide something in between - read-your-writes via sticky sessions, or causal consistency via vector clocks - and calling that "eventually consistent" undersells the actual guarantee.

**Key Takeaway:** Precision matters - "consistency" alone is an underspecified word in a distributed systems interview. Name the specific model (linearizable, causal, read-your-writes, eventual) and which axis it's answering (CAP's partition behaviour, ACID's transaction semantics, or general replica visibility).

---

## When This Applies

**Interviewer TL;DR:** Pick linearizability when a stale read causes direct harm; causal consistency when ordering matters to users but staleness doesn't; read-your-writes/monotonic reads as a cheap floor for any user-facing system; eventual consistency when only convergence matters, not ordering.

**Mental model:** Start from the weakest model the application can tolerate, then add guarantees only where a concrete anomaly would be user-visible or harmful.

- **Linearizability** - distributed locks, leader election, inventory counts, financial balances. Anywhere a stale read causes a wrong decision, not just a stale display.
- **Causal consistency** - comment threads, chat messages, collaborative editing. Users notice if a reply appears before the message it replies to; they don't notice if two unrelated updates from different users arrive in a different order.
- **Read-your-writes / monotonic reads** - almost every user-facing profile or settings update. Cheap to provide, and its absence is one of the most commonly-reported "bugs" in production systems ("I saved my settings and they reverted!").
- **Eventual consistency (bare)** - metrics, counters, caches, search index freshness. Nothing breaks if two counters converge a few hundred milliseconds apart in different orders.

**Key Takeaway:** Default to the cheapest model, add ordering guarantees only where a concrete, nameable user-visible anomaly would otherwise occur - not because "stronger" sounds safer.

---

## Real-World Applications

**Interviewer TL;DR:** Spanner and etcd target linearizability for coordination-critical state; DynamoDB and Cassandra default to eventual consistency but layer read-your-writes and tunable quorums on top; most collaborative apps (Google Docs, comment threads) build causal consistency via operational transforms or CRDTs.

**Mental model:** The model a system advertises is usually its floor, not its ceiling - most production systems layer stronger client-centric guarantees on top of a weaker base.

| System              | Base model              | Stronger guarantee layered on top                                  |
| ------------------- | ------------------------ | -------------------------------------------------------------------- |
| Google Spanner       | Linearizable (external consistency) | TrueTime bounds clock uncertainty to make global linearizability practical |
| etcd / ZooKeeper     | Linearizable              | Single-leader writes through Raft/ZAB consensus                      |
| DynamoDB             | Eventual (default)        | Optional strongly-consistent reads per request, at higher latency    |
| Cassandra            | Eventual (tunable)        | `QUORUM` consistency level approximates strong reads per query       |
| Google Docs          | Causal (operational transform) | Concurrent edits merge preserving intent, not just last-write-wins |
| Redis (single primary) | Linearizable on primary | Async replica reads are eventually consistent, opt-in per query      |

**DynamoDB's tunable model** is the clearest production illustration of the spectrum: the same table can serve eventually-consistent reads (cheap, default) or strongly-consistent reads (routed to the leader, more expensive) per request - the application chooses per operation, not per table.

**Google Docs** is the clearest illustration of causal consistency in a consumer product: two people typing in the same document see each other's edits applied in a way that preserves intent (via operational transforms or CRDTs), not necessarily in strict real-time order - what matters is that causally-related edits (a fix to a typo you just typed) never get lost or misordered.

> 🧠 **Thought Process**
> When asked "is DynamoDB consistent?", the strong answer names the axis: "eventually consistent by default per-read, with an opt-in strongly-consistent read mode - so it's tunable per operation, not a single system-wide answer." That's the same per-operation reasoning CAP requires, applied one level more precisely.

**Key Takeaway:** Production systems rarely commit to one model system-wide - they expose the strength of the guarantee as a per-operation or per-request knob, and the skill is knowing which knob position a given feature actually needs.

---

## Common Misapplications & Gotchas

**Interviewer TL;DR:** The recurring mistakes: treating "eventually consistent" as a single well-defined model, assuming a strongly-consistent read anywhere implies linearizability everywhere, and believing causal consistency requires the same coordination cost as linearizability.

**Mental model:** Most consistency bugs come from assuming a stronger guarantee than the system actually documents - the fix is always to name the exact model, not to assume based on the vendor's marketing term.

### Common Misconceptions

- **"Eventually consistent" fully describes the system's behavior.** It describes only the floor (convergence, eventually). It says nothing about ordering, staleness bound, or whether read-your-writes is also provided - those require checking the specific system's documentation, not inferring from the label.
- **A strongly-consistent read option means the whole system is linearizable.** DynamoDB's strongly-consistent reads apply to that single request, routed to the current leader for that partition - concurrent operations elsewhere in the system may still be only eventually consistent. One strong read doesn't retroactively make prior writes from other clients linearizable.
- **Causal consistency requires global coordination like linearizability does.** It doesn't - causal consistency only requires tracking *which* operations are causally related (via vector clocks or similar), not agreeing on a total order for every operation. This is why it's achievable with much lower latency and higher availability than linearizability.

### Ignoring the Staleness Bound

_Eventual consistency promises convergence with no time bound - assuming "usually fast" is "always fast" causes production incidents._

Teams often observe convergence happening in single-digit milliseconds in testing and design as if that bound were guaranteed. Under load, GC pauses, network congestion, or a lagging replica, the actual staleness window can grow to seconds or longer with no error signal - the read simply returns a stale value silently. Systems relying on eventual consistency for anything user-visible need an explicit strategy for bounding or surfacing staleness (e.g., a "last synced" timestamp shown to the user), not an assumption that convergence is always fast.

**What to do instead:** if a feature's correctness depends on a staleness bound, either use a model that provides one (bounded staleness, if the system offers it) or design the UI/application to tolerate and surface arbitrary staleness rather than assuming a typical-case latency.

**Key Takeaway:** Every consistency-model bug traces back to assuming a guarantee the system doesn't actually document. Read the specific model name, not the marketing term, before building correctness-dependent logic on top of it.

---

## Interview Scenario Bank

### Naming the Spectrum

> 🎯 **Interview Lens**
> **Q:** What consistency models exist between "strongly consistent" and "eventually consistent"?
> **Ideal answer:** Sequential consistency (global order, not real-time bound), causal consistency (preserves cause-effect ordering only), and the client-centric guarantees - read-your-writes and monotonic reads - which are cheaper and only apply per-client.
> **Common trap:** Treating consistency as a binary (strong vs eventual) and having no vocabulary for anything in between.
> **Next question:** "Which of these would you pick for a comment thread, and why?" → Causal consistency - a reply must never appear before the comment it replies to, but unrelated comments from different users don't need a global order.

### Distinguishing the Three "Consistency" Words

> 🎯 **Interview Lens**
> **Q:** You said "the system is consistent." What do you mean, precisely?
> **Ideal answer:** Name the axis - ACID's C (transaction moves between constraint-valid states), CAP's C (linearizability specifically), or a consistency model (the general spectrum of staleness/ordering guarantees for replicated reads). These are three different properties that happen to share a word.
> **Common trap:** Using "consistent" as if it's self-evidently one specific guarantee, without naming which.
> **Next question:** "Can a system be ACID-consistent but not CAP-consistent?" → Yes - a single-node relational database is ACID-consistent (constraints always hold) but the question of CAP consistency doesn't even apply until there's more than one replica; a multi-region replicated version of the same schema could satisfy ACID's C while serving CAP-inconsistent (stale) reads from a lagging region.

### Choosing a Model for a Feature

> 🎯 **Interview Lens**
> **Q:** You're building a "likes" counter on a social post. What consistency model do you need?
> **Ideal answer:** Eventual consistency is enough for the displayed count - a brief undercount or overcount is imperceptible. But the like *button's own state* for the acting user should be read-your-writes - a user who just liked a post shouldn't see the button revert to "unliked" on refresh.
> **Common trap:** Applying one model to the whole feature instead of splitting it by what each piece of state actually needs.
> **Next question:** "How would you implement read-your-writes for just the button state without paying for it on the counter?" → Route that specific read to the replica that served the write (sticky session or version-tagged read), while letting the aggregate counter read from any replica.

### Reconciling Conflicting Writes

> 🎯 **Interview Lens**
> **Q:** Two replicas each accept a write to the same key during a partition. How do you reconcile them?
> **Ideal answer:** Depends on the chosen strategy - last-write-wins (simple, timestamp-based, can silently drop a write on clock skew), vector clocks (detect true concurrency and surface the conflict rather than guessing), or CRDTs (data structures that merge deterministically with no conflict step at all).
> **Common trap:** Assuming "last write wins" is the only or the safe default - it silently discards data on genuine concurrent writes, which is unacceptable for some domains (e.g., a shopping cart should merge, not overwrite).
> **Next question:** "When would CRDTs not be a good fit even though they avoid conflicts entirely?" → When the data structure's merge semantics don't match the application's intent - a CRDT set naturally merges as a union, which is wrong if the application actually needs "last delete wins" semantics (e.g. a removed item reappearing after merge).

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form                          | One-line meaning                                                     |
| ------- | ----------------------------------- | ---------------------------------------------------------------------- |
| LWW     | Last-Write-Wins                     | Conflict resolution by keeping the write with the highest timestamp    |
| CRDT    | Conflict-free Replicated Data Type  | Data structure whose concurrent updates merge deterministically without coordination |

---

### Anti-patterns

- **Treating "eventually consistent" as a complete spec** - assuming it implies read-your-writes or a staleness bound; fails because the label only guarantees convergence with no ordering or timing promise; check the system's documentation for what's layered on top before relying on it.
- **Applying one consistency model to an entire feature** - using linearizability everywhere out of caution, or eventual consistency everywhere out of habit; fails because different pieces of state within the same feature usually have different real correctness requirements; classify per field/operation, not per feature.
- **Assuming last-write-wins is always safe** - relying on timestamp-based conflict resolution without checking whether concurrent writes should merge instead of overwrite; fails silently by discarding a legitimate concurrent write; use vector clocks or a CRDT when data loss on conflict is unacceptable.

---

### Selection Matrix

| Criteria              | Linearizable                        | Causal                              | Read-Your-Writes             | Eventual                       |
| ---------------------- | ------------------------------------ | ------------------------------------ | ------------------------------ | -------------------------------- |
| Ordering guarantee      | Global, real-time                    | Preserves cause-effect only          | Per-client only                | None                             |
| Coordination cost       | High - quorum/consensus per op       | Moderate - track causal history      | Low - route to known replica   | None - accept and propagate async |
| Availability under partition | Lowest                          | High                                  | High                            | Highest                          |
| Typical mechanism       | Raft/Paxos, single leader            | Vector clocks, causal broadcast      | Sticky sessions, version tags  | Gossip, anti-entropy             |
| Good fit                | Locks, balances, inventory           | Chat, comments, collaborative editing | User's own profile/settings    | Counters, caches, search freshness |
