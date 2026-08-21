# Consensus (Raft / Paxos)

## Prerequisites

- **[Replication Strategies](./replication-strategies.md)** [Must read]
- **[CAP Theorem](./cap-theorem.md)** [Should read]

---

## Table of Contents

- [TLDR](#tldr)
- [Mental Model](#mental-model)
- [Formal Definition](#formal-definition)
- [Assumptions & Preconditions](#assumptions--preconditions)
- [Paxos](#paxos)
- [Raft](#raft)
- [Paxos vs Raft](#paxos-vs-raft)
- [Often Confused With](#often-confused-with)
- [Variants & Extensions](#variants--extensions)
- [Real-World Applications](#real-world-applications)
- [Performance & Complexity](#performance--complexity)
- [Common Misapplications & Gotchas](#common-misapplications--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

Consensus is how a cluster of unreliable nodes agrees on a single value - who's leader, what the next log entry is - even when some nodes crash or messages get delayed, by requiring every decision to win a majority quorum before it's considered final. The core insight is that overlapping majorities can never disagree: any two quorums share at least one node, so a stale minority can't silently commit a conflicting decision. Raft and Paxos both deliver this guarantee; Raft trades Paxos's generality for understandability by making leader election and log replication explicit, separable steps. The trap: consensus guarantees agreement on **committed** entries, not liveness during a partition - a minority partition simply stalls, it doesn't diverge.

**Interview soundbite:** Consensus isn't about getting nodes to agree - a single node with no peers "agrees" with itself trivially - it's about guaranteeing that no two disjoint quorums can ever commit conflicting values, which is what turns "probably agree" into "provably can't disagree."

---

## Mental Model

**Think of consensus as a jury that requires a strict majority to convict, and once convicted the verdict can never be un-decided.** Any later jury pulled from the same pool must overlap with the first by at least one juror, so two juries can never reach opposing verdicts on the same case. The remaining minority - or a juror who was in the hallway when the vote happened - just missed it; they can't overturn it later, only catch up.

Consensus in distributed systems maps directly: a proposal must be accepted by more than half the nodes (a **quorum**) before it's considered decided. Because any two quorums out of N nodes mathematically must overlap by at least one node, no second quorum can commit a conflicting value - the overlapping node remembers and blocks it.

---

## Formal Definition

A consensus protocol lets a set of nodes agree on a single value despite crashes and message delays, guaranteeing **safety** (never two different committed values) and, once enough of the network is healthy, **liveness** (the system eventually commits something). Formally: agreement, validity (the decided value was actually proposed), and termination under partial synchrony.

---

## Assumptions & Preconditions

- **Majority of nodes reachable.** A quorum (⌊N/2⌋ + 1) must be alive and able to communicate; below that, the protocol correctly stalls rather than guesses.
- **Crash-fault, not Byzantine, by default.** Nodes can crash or be slow/partitioned, but don't lie or send conflicting messages to different peers - Raft/Paxos assume this. (Byzantine fault tolerance is a separate, stronger model - see [Variants & Extensions](#variants--extensions).)
- **Eventual message delivery, not bounded time.** Messages can be arbitrarily delayed or reordered but aren't silently corrupted; the protocol only needs partial synchrony (things settle down long enough to make progress), not a hard real-time bound.
- **Persistent local state survives crashes.** Each node durably logs its votes/log entries before replying - a node that crashes and restarts must not "forget" a promise it already made, or safety breaks.

What breaks when violated: if more than a minority of nodes can be Byzantine (lying), both protocols lose safety - a lying node can vote for two conflicting proposals in the same round. If durable state isn't actually fsync'd before replying, a crash-and-restart node can re-promise something it already promised differently, reintroducing a split decision.

---

## Paxos

### Roles

Three logical roles (a single physical node commonly plays more than one): **Proposer** puts forward a value; **Acceptor** votes on proposals and is the actual source of the quorum guarantee; **Learner** finds out what was decided. In practice, in an odd-sized cluster (e.g. 5 nodes), every node is typically an Acceptor, and one is elected to also act as the (usual) Proposer.

### Two-Phase Protocol

Basic ("single-decree") Paxos runs in two phases, both requiring a majority:

**Phase 1 - Prepare/Promise.** A Proposer picks a proposal number `n` higher than any it's used before and sends `Prepare(n)` to all Acceptors. An Acceptor that hasn't seen a higher `n` replies `Promise(n)`, plus the highest-numbered value it has already accepted (if any), and promises to reject any future proposal numbered below `n`.

**Phase 2 - Accept/Accepted.** If the Proposer hears `Promise` from a majority, it sends `Accept(n, v)` - where `v` is either its own value, or (critically) the highest-numbered value any Acceptor already reported back in Phase 1, to preserve safety. Each Acceptor accepts unless it has since promised a higher `n`. Once a majority accept, the value is chosen; Learners find out via a broadcast or by asking a majority.

🧠 **Thought Process** - Phase 1 isn't just "asking permission" - it's how a new Proposer discovers whether an earlier round might already have chosen a value, so it can finish that decision rather than overwrite it. This is the single trickiest part of Paxos and the main source of implementation bugs.

```
Proposer                 Acceptor 1   Acceptor 2   Acceptor 3
   │── Prepare(n) ──────────►│            │            │
   │── Prepare(n) ─────────────────────────►│            │
   │── Prepare(n) ────────────────────────────────────►│
   │◄───── Promise(n) ───────│            │            │
   │◄───── Promise(n) ────────────────────│            │      (majority reached)
   │
   │── Accept(n, v) ─────────►│            │            │
   │── Accept(n, v) ───────────────────────►│            │
   │◄───── Accepted ─────────│            │            │
   │◄───── Accepted ──────────────────────│            │      (majority accepted → v is chosen)
```

### Why Majority Quorums Guarantee Safety

Any two majorities out of N nodes intersect in at least one node (pigeonhole: two sets each bigger than N/2 can't be disjoint). That overlapping Acceptor has already promised not to accept a conflicting lower-numbered proposal, and Phase 2's rule (reuse the highest already-accepted value) forces any later Proposer to carry forward a decision that's already in flight rather than clobber it. This single overlap property is the entire safety argument - no clock synchronization, no leader-uniqueness enforcement required.

---

## Raft

Raft decomposes consensus into three separable sub-problems - leader election, log replication, and safety - explicitly, trading some of Paxos's generality for a protocol engineers can actually reason about and implement correctly.

### Roles

Every node is **Leader**, **Follower**, or **Candidate**. Exactly one Leader per **term** (a monotonically increasing epoch number). Followers passively replicate; a Candidate is a Follower attempting to become Leader.

```
                  election timeout elapses
                  (no heartbeat received)
     ┌──────────┐ ───────────────────────► ┌───────────┐
     │ Follower │                          │ Candidate │
     └──────────┘ ◄─────────────────────── └───────────┘
          ▲          discovers current           │
          │          Leader/term                 │ wins majority vote
          │                                       ▼
          │                                 ┌──────────┐
          └────────────────────────────────│  Leader  │
             steps down on higher term seen  └──────────┘
```

### Leader Election

Followers expect periodic heartbeats from the Leader. If a **randomized election timeout** (typically 150-300ms, re-randomized each time) elapses with no heartbeat, a Follower becomes a Candidate, increments the term, votes for itself, and requests votes from peers. A node grants its vote at most once per term, and only to a candidate whose log is at least as up-to-date as its own (the **election restriction** - see below). First candidate to a majority becomes Leader for that term.

⚖️ **Decision Framework** - Randomized timeouts exist specifically to avoid split votes: if every Follower timed out at the same instant, they'd all become Candidates simultaneously and repeatedly split the vote. Randomization makes one Candidate almost always time out first and win before others even start.

### Log Replication

The Leader appends every client command to its own log first, then replicates it to Followers via `AppendEntries` RPCs (also doubling as heartbeats when empty). An entry is **committed** once a majority of nodes have durably stored it - only then does the Leader apply it to its state machine and reply to the client. `AppendEntries` carries the index/term of the immediately preceding entry so a Follower can detect and reject a gap, forcing the Leader to walk backward and resend until logs align (log repair).

### Safety - Election Restriction and Log Matching

Two mechanisms keep committed entries from ever being lost:

- **Election restriction:** a candidate can only win a vote if its log is at least as up-to-date (by last-entry term, then length) as the voter's. Since a committed entry lives on a majority, and a candidate needs a majority to win, the candidate is mathematically guaranteed to have seen every committed entry.
- **Log Matching Property:** if two logs share an entry at the same index and term, every entry before that index is identical in both. This lets `AppendEntries`'s consistency check (comparing just the previous entry) stand in for comparing entire logs.

---

## Paxos vs Raft

| Dimension | Paxos | Raft |
| --- | --- | --- |
| Leader | Implicit, can rotate mid-round via Phase 1 | Explicit, single Leader per term, enforced by protocol structure |
| Log handling | Not part of core protocol - Multi-Paxos bolts it on | Log replication is a first-class, specified mechanism |
| Understandability | Notoriously hard to implement correctly from the paper alone | Explicitly designed to be teachable/implementable |
| Membership changes | No standard mechanism in classic Paxos | Joint consensus defined in the original paper |
| Production use | ZooKeeper (ZAB, Paxos-derived), Chubby, Spanner | etcd, Consul, CockroachDB, Kafka KRaft |

**Pick it when:** greenfield systems needing a from-scratch consensus implementation almost always reach for Raft - the explicit leader and log make correctness easier to verify and debug in production. Paxos (or a derivative like ZAB) shows up where an existing battle-tested implementation is already the dependency (ZooKeeper), not because Paxos itself was chosen fresh.

---

## Often Confused With

**Consensus vs Replication** - replication is the mechanism of copying data to multiple nodes; consensus is the algorithm that decides what gets replicated and in what order, so all replicas agree despite failures. See **[Replication Strategies](./replication-strategies.md)** for how leader-follower and multi-leader replication use (or avoid) consensus.

**Consensus vs Two-Phase Commit (2PC)** - 2PC coordinates an atomic outcome (commit/abort) across independent participants for a single transaction and blocks indefinitely if the coordinator crashes mid-protocol; consensus elects a durable leader and keeps making progress as long as a majority survives. 2PC has no majority-quorum safety net - a single coordinator failure can leave participants stuck.

---

## Variants & Extensions

**Multi-Paxos** - runs repeated rounds of Paxos to agree on a *sequence* of values (a log), electing a stable Leader so most rounds can skip Phase 1 (only needed once per leadership change) - this is what real Paxos-based systems (ZooKeeper's ZAB) actually run, not textbook single-decree Paxos.

**Raft joint consensus** - membership changes (adding/removing nodes) go through an intermediate joint configuration requiring majorities from *both* the old and new node sets, preventing a window where two disjoint majorities could each elect a different Leader during the transition.

**Byzantine Fault Tolerance (BFT)** - a stronger model where nodes may act maliciously, not just crash (PBFT, and blockchain consensus like Tendermint). Requires 3f+1 nodes to tolerate f Byzantine faults (vs 2f+1 for crash faults) and extra message rounds to detect conflicting claims - out of scope here; assume crash-fault only unless BFT is explicitly asked about.

---

## Real-World Applications

**etcd** and **Consul** run Raft directly for their coordination/config store. **CockroachDB** runs a Raft group per data range for replication. **Kafka** replaced its ZooKeeper dependency with **KRaft** (Raft-based) for the controller quorum. **ZooKeeper** itself runs **ZAB**, a Paxos-family protocol, underneath Chubby-style coordination for HBase, older Kafka, and Solr.

🧠 **Thought Process** - at scale, the failure mode isn't the algorithm - it's running one giant consensus group instead of many small ones. CockroachDB's per-range Raft groups exist specifically so a slow quorum in one shard doesn't stall writes to every other shard; past a few thousand ranges on one node, the real engineering problem becomes managing thousands of concurrent Raft groups' heartbeat overhead, not the consensus math itself.

---

## Performance & Complexity

Committing one entry costs one network round-trip to a majority (not all N nodes) - latency is bound by the **slowest node in the fastest majority**, not the slowest node overall. Tolerating `f` crash failures requires `2f+1` nodes (a 5-node cluster tolerates 2 failures); adding nodes beyond that trades no extra fault tolerance for strictly worse write latency, since every write still needs a majority and a bigger majority is slower to assemble. This is why production clusters are almost always sized 3 or 5, rarely more.

---

## Common Misapplications & Gotchas

### Split-Brain Despite Consensus

Consensus is specifically designed to prevent split-brain (two nodes both believing they're Leader and accepting conflicting writes) - a correctly majority-gated protocol cannot produce two committed-but-conflicting values. What *does* happen under partition is a stale Leader on the minority side continuing to think it's Leader and serving reads from data that can no longer be updated - a **stale-leader read**, not split-brain. Guarding against it requires either routing reads through the same quorum check as writes (a "read index"), or a lease mechanism with a bounded clock-skew assumption.

### Leader Election Storms

If election timeouts aren't well-randomized (or clocks drift so heartbeats consistently arrive late), a cluster can cycle through repeated failed elections - split votes trigger new elections that split again - burning through terms without ever electing a stable Leader. This shows up in production as intermittent write unavailability that looks like a network problem but is actually election-timeout tuning.

### Log Replication Lag vs Consistency Guarantee Confusion

A Follower being behind on replicated log entries does **not** weaken Raft/Paxos's consistency guarantee - reads only need to be safe if they're served by (or routed through) the current committed state, and a lagging Follower simply isn't authoritative yet. The actual risk is application-level: a client reading directly from a lagging Follower (common for read-scaling) can see stale data, which is a deliberate trade-off, not a consensus bug.

### Common Misconceptions

- "Consensus means every node has identical data at all times" - no, it means every node **agrees on the order and content of committed entries**; uncommitted or lagging state can differ transiently without violating the guarantee.
- "More nodes always means more reliability" - past the fault-tolerance threshold you actually need, more nodes strictly slow down writes (bigger majority to assemble) for no added safety.
- "The Leader is a single point of failure" - it's a single point of *unavailability during election* (typically hundreds of ms), not of data loss; a new Leader is elected from the same durably-replicated log.

---

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** Why does consensus require a majority, not just any two nodes agreeing?
> **Ideal answer:** Because any two majority sets out of N nodes are guaranteed to overlap by at least one node (pigeonhole principle), that shared node can never have made two conflicting promises, which is the entire mechanism that prevents two different values from ever being committed.
> **Common trap:** Saying "majority just means more votes than not" without connecting it to the overlap property - that's the part that actually delivers safety, not vote-counting itself.
> **Next question:** What happens to write availability if you go from a 3-node to a 5-node cluster?

> 🎯 **Interview Lens**
> **Q:** Walk through what happens during a network partition that splits a 5-node Raft cluster 3-2.
> **Ideal answer:** The 3-node majority side can still elect a Leader (or keep its existing one) and keep committing writes normally. The 2-node minority side can't reach a majority, so any node there that tries to become Candidate keeps losing elections and the side simply stalls - it does not elect its own Leader and diverge.
> **Common trap:** Assuming the minority side "keeps working independently" and creates two Leaders (true split-brain) - Raft's majority requirement structurally prevents this.
> **Next question:** If the old Leader was on the minority side and doesn't yet know about the partition, what does it do when a client sends it a write?

> 🎯 **Interview Lens**
> **Q:** Why did the Raft paper explicitly optimize for understandability over Paxos's generality?
> **Ideal answer:** Paxos's core safety argument is provably correct but the paper describes single-decree consensus, leaving practitioners to independently derive log replication, leader election, and membership changes - a process that produced years of subtly buggy real-world implementations. Raft specifies all three as part of the core protocol so implementers aren't reinventing the hard parts.
> **Common trap:** Framing this as "Raft is simpler because it's less powerful" - Raft is equivalent in the guarantees it provides; the difference is in specification completeness and implementability, not theoretical power.
> **Next question:** What's the actual mechanism (not just "it's simpler") that makes Raft's leader election safe against split votes?

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| ZAB | ZooKeeper Atomic Broadcast | Paxos-family protocol underlying ZooKeeper's coordination guarantees |
| PBFT | Practical Byzantine Fault Tolerance | Consensus protocol tolerating malicious (not just crashed) nodes |
| RPC | Remote Procedure Call | Network call mechanism (`AppendEntries`, `RequestVote` in Raft) |

### Anti-patterns

- Sizing a consensus cluster larger than the fault tolerance actually needed - slows every write for no safety gain, fix by sizing to `2f+1` for the `f` you actually need to tolerate.
- Serving reads directly from a Follower without a freshness check when strong consistency is required - reintroduces staleness the consensus layer was supposed to prevent, fix via read-index/lease-based reads or explicit "read from Leader" routing.
- Treating consensus as a substitute for idempotency on the client side - consensus guarantees the log is agreed-upon, not that a retried client request won't be double-applied; fix by pairing with request IDs, see **[Idempotency](./idempotency.md)**.
