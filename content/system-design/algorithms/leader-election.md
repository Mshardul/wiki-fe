# Leader Election

## Prerequisites

- **[Replication Strategies](./replication-strategies.md)** [Should read]
- **[Consensus (Raft / Paxos)](./consensus-raft-paxos.md)** [Should read]

---

## Table of Contents

- [TLDR](#tldr)
- [Mental Model](#mental-model)
- [Formal Definition](#formal-definition)
- [Assumptions & Preconditions](#assumptions--preconditions)
- [Failure Detection - the Trigger](#failure-detection---the-trigger)
- [Bully Algorithm](#bully-algorithm)
- [Ring Algorithm](#ring-algorithm)
- [Bully vs Ring](#bully-vs-ring)
- [Often Confused With](#often-confused-with)
- [Variants & Extensions](#variants--extensions)
- [Real-World Applications](#real-world-applications)
- [Performance & Complexity](#performance--complexity)
- [Common Misapplications & Gotchas](#common-misapplications--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

Leader election is the mechanism a cluster uses to pick exactly one coordinator node when the previous one is suspected dead, so writes, scheduling, or coordination don't need every node to agree ad-hoc on every request. The two classic algorithms - Bully (highest ID wins, announced by force) and Ring (a token circulates and only the highest ID survives each pass) - solve *who becomes leader* under a crash-fault model with no safety guarantee about split-brain. Modern systems don't run raw Bully or Ring; they layer election inside a quorum-based consensus protocol (Raft, Paxos) specifically because that adds the majority-vote safety net these two classics lack. The trap: an elected leader is a liveness mechanism, not a correctness one - electing *someone* fast is the whole point, but Bully/Ring alone can't stop two nodes from both believing they're leader.

---

## Mental Model

**Think of Bully as a loud argument where the highest-ranking person in the room simply declares themselves in charge and dares anyone higher to object** - if nobody with higher rank speaks up in time, the declaration stands. Ring, by contrast, is a **talking stick passed around a circle**: each person writes their ID on it before passing it on, and by the time it's gone all the way around, whoever wrote the highest ID knows they won - because everyone saw it.

Both approaches answer the same question - "given the current leader is unresponsive, which surviving node takes over?" - through pure ID comparison and message-passing, with no majority-vote safety net. That absence is the entire reason production systems don't run them standalone: see [Bully vs Ring](#bully-vs-ring) and [how consensus protocols layer election on top](#variants--extensions).

---

## Formal Definition

Leader election is the problem of getting a set of distributed processes to agree on a single distinguished process (the leader) from among themselves, using only message-passing, such that every non-faulty process eventually learns who the leader is. Formally: **safety** (at most one leader is recognized by any correct process at a time - not always guaranteed by Bully/Ring, see [Gotchas](#split-brain-is-not-prevented-by-election-alone)) and **liveness** (a leader is eventually elected if enough processes survive).

---

## Assumptions & Preconditions

- **Every node has a unique, comparable, totally-ordered ID.** Node ID, IP, or process ID - both Bully and Ring need a deterministic tie-breaker so "highest wins" is unambiguous.
- **Failure detection exists and is (imperfectly) timely.** Election is triggered by a *suspected* crash - typically a missed heartbeat or timeout - not a certain one; see [Failure Detection](#failure-detection---the-trigger).
- **Crash-fault, not Byzantine.** A dead node stops responding; it doesn't lie about its ID or impersonate another node. Both classic algorithms assume this.
- **Messages eventually arrive (partial synchrony), reordering tolerated.** Neither algorithm needs a hard real-time bound, but a network partition (rather than a true crash) breaks the "unique leader" property - see [Gotchas](#split-brain-is-not-prevented-by-election-alone).

What breaks when violated: without unique IDs, ties can't resolve deterministically and two nodes can both conclude they won. Under a network partition (as opposed to an actual crash), both sides can independently elect a leader, because neither Bully nor Ring has a quorum check - this is the core reason production systems wrap election in consensus.

---

## Failure Detection - the Trigger

Leader election doesn't run continuously - it's triggered when the current leader is suspected dead, almost always via a **heartbeat + timeout** failure detector: the leader periodically pings followers (or followers ping the leader), and a missed heartbeat past some timeout window starts an election. This is inherently a **suspicion**, not a fact - a slow-but-alive leader (GC pause, network blip) looks identical to a dead one from the follower's side, which is why timeout tuning is a real production lever, not a constant to set once and forget.

⚠️ **Warning / Gotcha** - A timeout set too aggressively turns transient slowness into unnecessary elections (a node that was merely slow gets deposed, then comes back and has to step down again); too conservative, and a genuinely dead leader leaves the cluster coordinator-less for longer than necessary. Raft's randomized-timeout trick (see [Variants & Extensions](#variants--extensions)) exists to avoid the specific failure mode of *simultaneous* timeouts causing repeated split votes, which is a different problem from picking the right absolute timeout value.

---

## Bully Algorithm

### Mechanics

Every node knows the IDs of all other nodes. When a node **P** notices the leader is unresponsive, it starts an election:

1. **P sends `ELECTION` to every node with a higher ID than itself.**
2. **If nobody with a higher ID responds** within a timeout, P declares itself leader and sends `COORDINATOR` to every node.
3. **If a higher-ID node responds `OK`,** that node takes over running its own election (repeat from step 1 with itself as P), and the original P drops out and waits for a `COORDINATOR` message.
4. The process recurses upward; the **highest-ID live node** always ends up winning, which is why it's called Bully - a higher-ID node always pre-empts a lower one mid-election.

```
Nodes: 1, 2, 3, 4, 5 (5 = old leader, now dead)

Node 3 notices leader (5) is down, starts election:
  3 ──ELECTION──► 4
  3 ──ELECTION──► 5   (no response, 5 is dead)

  4 responds OK to 3, then starts its own election:
  4 ──ELECTION──► 5   (no response, 5 is dead)

  4 gets no higher-ID response ⇒ 4 declares itself leader:
  4 ──COORDINATOR──► 1, 2, 3, 5(unreachable)
```

🧠 **Thought Process** - the "bully" behavior is what makes this algorithm's worst case expensive: if the lowest-ID node notices the crash first, it triggers a cascade where every higher node in turn starts and wins its own sub-election, in the worst case producing O(N²) messages for a single leader change. A high-ID node noticing first is the cheap case - it wins in one round.

### Recovery Case

When a previously-dead higher-ID node **rejoins**, it immediately starts its own election (it doesn't wait to be asked) - since it outranks the current leader, it always wins, deposing whoever was just elected. This is intentional (highest ID always leads) but means leadership can churn purely from a high-ID node's restart schedule, independent of any actual instability.

---

## Ring Algorithm

### Mechanics

Nodes are arranged in a **logical ring** (via a known successor pointer, not necessarily physical topology), each node knowing only its immediate successor. When a node notices the leader is down:

1. It creates an `ELECTION` message containing its own ID and sends it to its successor.
2. Each node that receives an `ELECTION` message **compares the ID inside it to its own**: if the incoming ID is higher, it forwards the message unchanged; if lower, it **overwrites the ID with its own** before forwarding; if the message already contains its own ID, that node knows its ID has survived a full trip around the ring and is the winner.
3. The winner sends a `COORDINATOR` message around the ring (same direction) so every node learns the result, then that message is removed once it's traveled the full loop.

```
Ring: 1 → 2 → 3 → 4 → 5 → 1  (5 = old leader, now dead)

Node 2 notices leader down, starts election:
  2 sends ELECTION(2) ──► 3
  3 sees 2 < 3, overwrites ──► ELECTION(3) ──► 4
  4 sees 3 < 4, overwrites ──► ELECTION(4) ──► 5   (dead, skip to next successor: 1)
  1 sees 4 > 1, forwards unchanged ──► ELECTION(4) ──► 2
  2 sees 4 > 2, forwards unchanged ──► ELECTION(4) ──► 3
  3 sees ELECTION(4), 4 ≠ 3, forwards ──► 4
  4 receives ELECTION(4) - its own ID came back ⇒ 4 is leader
  4 sends COORDINATOR(4) around the ring, all nodes update
```

⚖️ **Decision Framework** - Ring guarantees a fixed **2N message** upper bound per election (N to circulate the winning ID, N to announce it) regardless of who notices the crash first, versus Bully's worst case of roughly O(N²). The trade-off is topology dependence: Ring needs every node to correctly know its live successor, and a **second, simultaneous failure** (the old leader *and* a ring-neighbor both down) requires the ring to be repaired (skip to the next live successor) before election can even complete - a second concurrent failure is exactly where Ring's fixed message bound breaks down in practice.

---

## Bully vs Ring

| Dimension | Bully | Ring |
| --- | --- | --- |
| Topology requirement | None - any node can message any node | Logical ring - each node needs a live successor pointer |
| Message complexity (worst case) | O(N²) | O(N) - fixed ~2N regardless of who detects first |
| Who can trigger | Any node that suspects the leader is down | Any node that suspects the leader is down |
| Failure mid-election | Skips to next reachable node in the ring | Handled by contacting the next higher ID directly |
| Resilience to a second concurrent failure | Degrades gracefully - just retries the next ID | Requires ring repair (re-point around the dead successor) first |
| Production use today | Rare standalone; more common as a teaching model | Rare standalone; some legacy token-ring cluster managers |

**Pick it when:** in practice, neither is chosen standalone for anything handling real production writes - both are taught as the classic distributed-systems-101 building blocks that motivate *why* quorum-based consensus exists. Where a raw election algorithm still shows up unmodified, Ring's fixed message bound makes it the better fit for large, stable, well-connected clusters; Bully's simplicity (no topology to maintain) makes it easier to reason about in smaller or more dynamic membership sets.

---

## Often Confused With

**Leader election vs Consensus** - leader election picks *who* coordinates; consensus (see **[Consensus (Raft / Paxos)](./consensus-raft-paxos.md)**) is the broader guarantee that a cluster agrees on a *value* (which can be "who the leader is," but also "what the next log entry is") with a majority-quorum safety proof. Raft's leader election phase is leader election *implemented inside* a consensus protocol - it borrows the same problem statement as Bully/Ring but adds the overlapping-quorum safety property neither classic algorithm has. See [Variants & Extensions](#variants--extensions) for exactly how Raft's version differs.

**Leader election vs Distributed locking** - a lock (e.g. via ZooKeeper ephemeral znodes, or a Redis-based lock) grants exclusive access to a *resource* for a bounded time and is typically reacquired per-operation; a leader election result is a longer-lived role assignment that many operations reuse without re-electing each time. In practice, distributed locks are a common way to *implement* leader election (whoever holds the lock is leader) but the two solve different-shaped problems - locking is per-critical-section, election is a standing role.

---

## Variants & Extensions

**Raft's leader election** - layers Bully-like "highest term wins" comparison inside a **quorum vote**: a candidate must win a majority of votes, not just be unopposed, and voters enforce an *election restriction* (only vote for a candidate whose log is at least as up-to-date as their own) so the winner is guaranteed to hold every previously committed entry. Randomized election timeouts (typically 150-300ms) solve a problem neither Bully nor Ring has to deal with - simultaneous candidacies splitting the vote repeatedly - by making one node almost always time out first. Full mechanics, the safety proof, and the term/log-matching machinery live in **[Consensus (Raft / Paxos)](./consensus-raft-paxos.md#leader-election)** - this page owns the general Bully/Ring mechanics, that page owns how Raft's version specifically achieves safety.

**Paxos's implicit leader** - classic Paxos doesn't have an explicit election phase at all; any node can act as Proposer, and Phase 1 (`Prepare`/`Promise`) doubles as an implicit, informal leader-suggestion mechanism - competing Proposers can even live-lock each other with dueling proposal numbers. Multi-Paxos in practice elects a stable "distinguished proposer" via a side-channel (often a lease or a Bully-style ID comparison) specifically to avoid that live-lock, but it's not part of the core Paxos safety proof the way Raft's election restriction is. See **[Consensus (Raft / Paxos)](./consensus-raft-paxos.md#paxos-vs-raft)**.

**ZooKeeper-style election via ephemeral sequential znodes** - candidates create an ephemeral sequential node under a shared path; the candidate holding the lowest sequence number is leader, and each other candidate watches only the node immediately below its own (not all of them) to avoid a herd of nodes all waking up on every leader change. This is a practical, widely-used election recipe built *on top of* ZooKeeper's own ZAB consensus - it inherits ZAB's safety, it isn't a from-scratch Bully/Ring implementation.

**Lease-based election** - a node acquires a time-bounded lease (e.g. via a strongly-consistent store) and is leader only while the lease is valid, requiring periodic renewal; this trades election-message complexity for a **bounded clock-skew assumption** - if a leader's clock or the network is skewed enough that it thinks its lease is still valid after the store has expired it, a brief dual-leader window is possible unless reads are fenced.

---

## Real-World Applications

**Kafka's KRaft controller quorum** elects its active controller via Raft, not raw Bully/Ring, and **etcd** and **Consul** elect their Raft leader the same way. A lease-based mechanism built on top of one of these consistent stores (like Kubernetes' controller-manager leader election via an etcd/Lease resource) is a common pattern for application-level singleton coordinators that don't want to implement election themselves. **HDFS NameNode HA** and older **ZooKeeper**-based cluster managers use the ephemeral-sequential-znode recipe described above.

🧠 **Thought Process** - at scale, the actual engineering question stops being "which election algorithm" and becomes "how many independent election groups am I running, and how expensive is churn in each one." A Kafka cluster with thousands of partitions doesn't run one leader election per partition through the controller quorum - partition leadership is a separate, lighter-weight assignment the controller manages once it itself is elected, precisely because running full quorum-based election per partition wouldn't scale.

---

## Performance & Complexity

Bully's message complexity is **O(N²)** in the worst case (lowest-ID node detects first, triggering a cascade of sub-elections) and **O(N)** in the best case (highest-ID node detects first and wins immediately). Ring is a fixed **O(N)** - specifically about `2N` messages - regardless of who detects the failure, at the cost of requiring ring topology maintenance. Quorum-based election (Raft) is **O(N)** messages per candidacy (one `RequestVote` round-trip per voter) but adds latency proportional to the randomized timeout window before a candidacy even starts, plus possible repeated rounds if a split vote occurs - the trade is bounded message count for a probabilistic (not fixed) time-to-elect.

---

## Common Misapplications & Gotchas

### Split-Brain Is Not Prevented by Election Alone

Bully and Ring both assume a **true crash**, not a network partition. Under partition, both halves of a split cluster can independently run an election and each conclude *they* have the highest-ID live node from their own vantage point - producing two leaders simultaneously, because neither algorithm has a quorum check verifying "did a majority actually see me win." This is precisely the gap consensus protocols close: Raft/Paxos require a **majority** vote, so a minority partition can structurally never elect a leader of its own. See **[Consensus (Raft / Paxos)](./consensus-raft-paxos.md#split-brain-despite-consensus)** for the full safety argument.

### Election Storms From Poorly Tuned Timeouts

A too-aggressive failure-detection timeout, or clock drift that makes heartbeats consistently look late, causes repeated unnecessary elections - especially in Bully, where a flapping node repeatedly declares itself leader, gets deposed when it appears to recover, and re-triggers the cascade. This shows up in production as coordinator churn that looks like a network problem but is actually detector tuning.

### Common Misconceptions

- "Leader election guarantees exactly one leader at all times" - no, Bully/Ring guarantee it under a crash-only model; under partitions they can both elect independently. Only the quorum property in consensus protocols closes that gap.
- "A new leader immediately has all the data the old leader had" - not automatically; Bully/Ring only decide *who*, not *what state that node has*. Consensus protocols solve this jointly (Raft's election restriction ties "who can win" to "who has the most up-to-date log") - a standalone election algorithm has no such guarantee unless the application layer adds it.
- "Ring topology means physical network ring" - it's a logical successor ordering maintained in software; the physical network can be anything (mesh, star), the ring is just the order messages are forwarded in.

---

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** Why does Bully's worst case cost O(N²) messages, and when does that worst case actually happen?
> **Ideal answer:** It happens when the lowest-ID surviving node is the one that notices the crash first - it messages every higher node, the next-lowest of those starts its own sub-election messaging everyone above it, and so on, cascading through nearly every node in the cluster before the true highest-ID node finally wins. If the highest-ID node detects the crash first instead, it wins in a single round with no cascade.
> **Common trap:** Saying "Bully is O(N²) because it messages everyone" without identifying that the actual driver is *which* node detects the failure first - that's the variable that determines best vs worst case.
> **Next question:** How would you change the algorithm to make the average case closer to the best case?

> 🎯 **Interview Lens**
> **Q:** A cluster runs raw Bully with no quorum check and gets network-partitioned into two halves, each with a highest-ID node on its side. What happens?
> **Ideal answer:** Each half independently runs its own election and each concludes its own highest-ID node has won, since Bully has no mechanism to check whether a majority of the *whole* cluster agrees - both halves end up with a leader simultaneously, a genuine split-brain, until the partition heals and the two leaders' state has to be reconciled.
> **Common trap:** Assuming Bully or Ring inherently prevent this the way Raft/Paxos do - they don't; the majority-quorum safety property is specific to consensus protocols, not to leader election algorithms in general.
> **Next question:** What's the minimal change you'd make to this election scheme to prevent that dual-leader outcome?

> 🎯 **Interview Lens**
> **Q:** Your cluster has frequent, disruptive leadership changes even though nodes rarely actually crash. What's the likely cause and how do you diagnose it?
> **Ideal answer:** Almost always a failure-detection timeout tuned too aggressively relative to real jitter (GC pauses, transient network blips, or clock drift), so a node that's merely slow gets treated as dead and deposed, then rejoins and (in Bully) immediately re-triggers an election since it outranks the current leader. Diagnose by correlating election-trigger timestamps against heartbeat latency and GC/pause logs, not by assuming the algorithm itself is broken.
> **Common trap:** Jumping straight to "the algorithm has a bug" instead of first checking whether the failure detector's suspicion is even accurate.
> **Next question:** Raft solves one specific version of this problem with randomized timeouts - what failure mode does randomization prevent that a fixed timeout can't?

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| ZAB | ZooKeeper Atomic Broadcast | Paxos-family consensus protocol underlying ZooKeeper, used by its election recipes |
| HA | High Availability | System design goal of minimizing downtime, often via automated leader failover |

### Anti-patterns

- Running raw Bully or Ring for anything handling production writes without a quorum layer on top - fix by using a consensus protocol (Raft/Paxos) or a consensus-backed election recipe (ZooKeeper ephemeral znodes, etcd leases) instead.
- Treating a missed heartbeat as certain proof of death rather than a suspicion - fix by tuning timeout windows against real observed jitter, and by fencing a demoted leader's writes rather than assuming it has stopped acting.
- Assuming the newly elected leader automatically has the most up-to-date state - fix by pairing election with an explicit state-recency check (Raft's election restriction, or an application-level log-position comparison) rather than trusting ID order alone.

### Selection Matrix

| | Bully | Ring | Quorum-based (Raft) |
| --- | --- | --- | --- |
| Split-brain safety | None | None | Yes - majority quorum |
| Message complexity | O(N²) worst, O(N) best | O(N) fixed | O(N) per candidacy |
| Topology requirement | None | Logical ring | None (all-to-all voting) |
| Production-grade alone | No | No | Yes |
