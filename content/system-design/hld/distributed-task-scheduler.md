# Design: Distributed Task Scheduler

## Prerequisites

- **[Leader Election](../algorithms/leader-election.md)** [Must read]
- **[Message Queues](../components/message-queues.md)** [Must read]
- **[Idempotency](../algorithms/idempotency.md)** [Should read]
- **[Consensus (Raft / Paxos)](../algorithms/consensus-raft-paxos.md)** [Should read]

## Table of Contents

- [TLDR](#tldr)
- [Requirements & Scope](#requirements--scope)
- [Capacity Estimation](#capacity-estimation)
- [High-Level Architecture](#high-level-architecture)
- [Data Model & Storage](#data-model--storage)
- [Scheduling Core: From Cron Expression to Fired Task](#scheduling-core-from-cron-expression-to-fired-task)
- [Distributing Work: Partitioning & Leader Election](#distributing-work-partitioning--leader-election)
- [Execution & Delivery Guarantees](#execution--delivery-guarantees)
- [DAG Scheduling: Dependencies Between Tasks](#dag-scheduling-dependencies-between-tasks)
- [Reliability & Fault Tolerance](#reliability--fault-tolerance)
- [Scalability & Performance](#scalability--performance)
- [Observability](#observability)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Trade-off Summary](#trade-off-summary)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

## TLDR

A distributed task scheduler fires tasks (cron-style recurring or DAG-dependent) at the right time, exactly where "right time" tolerates a defined skew, without a single node becoming both the clock and the crash point. The core architectural challenge of Distributed Task Scheduler is guaranteeing every due task fires **exactly once across the fleet** despite nodes crashing mid-fire, by separating "decide what's due" (a small, leader-owned, low-throughput job) from "execute the task" (a large, horizontally-scaled, idempotent-by-contract job). Getting this split wrong turns either into a single point of failure or a source of silent duplicate/dropped executions.

## Requirements & Scope

**Functional requirements:**
- Schedule a task to run once at a specific time, or recurring on a cron-style expression (`0 */6 * * *`).
- Support task dependencies (task B runs only after task A succeeds) - a DAG of tasks, not just independent cron entries.
- Retry a failed task per a configurable policy (max attempts, backoff).
- Expose task status (pending, running, succeeded, failed, retrying) and execution history.
- Support pause/resume and manual trigger of a scheduled task.

**Non-functional requirements:**
- **Exactly-once firing over at-least-once over at-most-once, resolved to "effectively-once" via idempotency**: dropping a due task silently (at-most-once) is the worse failure for most workloads (a billing job that never runs), so the design biases toward at-least-once firing at the scheduling layer and pushes true exactly-once semantics onto idempotent task execution (see [Execution & Delivery Guarantees](#execution--delivery-guarantees)) - true exactly-once delivery without an idempotency contract is not achievable across a crash-prone network, and claiming otherwise is the single most common design-review red flag for this system.
- **Availability over strict schedule precision**: a task firing a few seconds late during a scheduler-node failover is acceptable; a task never firing because the one node that knew about it died is not. Sub-second firing precision is explicitly not a requirement - "within one scheduling tick" (typically 1-10s) is the actual bar.
- **Scalability of task *volume* over task *density* at a single instant**: the design must handle millions of distinct scheduled tasks, but any single instant's fan-out (how many tasks are due in the same tick) is bounded by how evenly task times are distributed - a system that lets tasks cluster on exact-minute boundaries (`* * * * *` firing every task at :00) creates a self-inflicted thundering herd, addressed by jittering fire times.
- **Security**: task definitions and their payloads may carry credentials or sensitive parameters (a task that calls a downstream API with a secret) - authn/authz at minimum gates who can create/modify/trigger a task (RBAC on the scheduling API), and task payloads containing secrets must be encrypted at rest and injected into the execution environment rather than logged in plaintext in execution history.

**Out of scope:** the business logic of what a task actually does once triggered (out-of-process, arbitrary code); a general-purpose stream-processing/ETL DAG engine (Airflow's broader ecosystem of operators/sensors) beyond the scheduling and dependency-resolution core; long-running task supervision beyond firing and tracking terminal status (that's a workflow-orchestration concern, a step beyond scheduling).

## Capacity Estimation

**Users:** ~50K distinct scheduled task definitions across the org (cron jobs, batch pipelines, one-off delayed tasks) · **Read/Write ratio:** heavily read/scan-dominated on the internal "what's due" query, write-light on task definition changes (definitions change far less often than they fire) · **Peak QPS:** with tasks distributed across a day and 1-minute scheduling ticks, a worst-case clustered minute might need to identify and dispatch ~5K due tasks in a single tick - the "what's due" query must resolve well under the tick interval, not the raw task count · **Storage:** 50K task definitions (~1KB each, including cron expression, payload, retry policy) ≈ 50MB; execution history at ~10M executions/day retained 90 days (~1KB/execution row) ≈ 900GB, the actual storage-dominant dataset · **Bandwidth:** negligible for scheduling metadata; execution payload/result size is workload-dependent and typically small (task inputs are usually references, not inline blobs) · **Key constraint:** the due-task query pattern (efficiently finding "all tasks with next-fire-time ≤ now" without a full table scan) is the dominant bottleneck, not raw storage or task-definition count - this drives the data-model choice in [Data Model & Storage](#data-model--storage).

## High-Level Architecture

```
                          ┌──────────────────┐
   Task CRUD API  ───────▶│  Task Definitions │  (durable store: definitions,
   (create/pause/trigger) │       Store        │   cron expr, next-fire-time,
                          └──────────────────┘   dependency edges)
                                    │
                                    │ scan: next_fire_time <= now
                                    ▼
                          ┌──────────────────┐
                          │  Scheduler Leader │  ← elected via Leader Election,
                          │  (ticks every N s)│    only one active at a time
                          └──────────────────┘
                                    │ enqueue due tasks
                                    ▼
                          ┌──────────────────┐
                          │   Message Queue    │  (durable, at-least-once)
                          └──────────────────┘
                                    │ pull/consume
                                    ▼
                    ┌───────────────────────────────┐
                    │   Worker Fleet (horizontally    │
                    │   scaled, stateless executors)  │
                    └───────────────────────────────┘
                                    │ write status
                                    ▼
                          ┌──────────────────┐
                          │ Execution History  │
                          └──────────────────┘
```

Scheduling-to-execution path (sequence view):

```
Scheduler Leader (on tick, every N seconds):
  1. Query Task Store: SELECT tasks WHERE next_fire_time <= now() AND status = 'active'
  2. For each due task:
       a. Compute next_fire_time (advance cron expression) and write it back
          BEFORE dispatch (see Production Failure Modes: double-fire on crash)
       b. Publish {task_id, execution_id, payload} to Message Queue
  3. Commit tick checkpoint

Worker (on message received):
  1. Check Execution History for execution_id → already completed? ACK and skip (idempotency guard)
  2. Mark execution 'running' in Execution History
  3. Execute task payload (out-of-process call)
  4. On success: mark 'succeeded', ACK message
  5. On failure: mark 'failed', apply retry policy (requeue with backoff, or dead-letter after max attempts)
```

The critical design choice visible in the diagram: **only the leader touches the "what's due" decision** (a small, serialized, low-throughput responsibility), while **the worker fleet, which does the actual work, is entirely stateless and horizontally scaled** behind the queue. This split is what keeps the single-leader requirement from becoming a throughput bottleneck - the leader's job is cheap (a scan and a publish), not expensive (running the task).

## Data Model & Storage

**Task Definitions table** - one row per scheduled task:

| Column | Purpose |
| --- | --- |
| `task_id` | Primary key |
| `cron_expression` / `run_at` | Recurrence rule, or a single fire time for one-off tasks |
| `next_fire_time` | Indexed - the field the leader's due-task scan filters on |
| `dependency_ids` | Upstream task IDs this task waits on (DAG edge list, empty for plain cron tasks) |
| `payload` | Task parameters (encrypted if sensitive) |
| `retry_policy` | Max attempts, backoff strategy |
| `status` | active / paused / disabled |

**Indexing `next_fire_time` is the single most consequential storage decision** - a naive full-table scan of all 50K task definitions every tick does not scale past a modest fleet size, while a B-tree (or equivalent) index on `next_fire_time` turns the due-task query into a cheap range scan (`WHERE next_fire_time <= now()`) regardless of total task count.

**Execution History table** - append-only, one row per fired execution: `execution_id`, `task_id`, `fired_at`, `status`, `attempt_number`, `result`. This is the storage-dominant dataset (see [Capacity Estimation](#capacity-estimation)) and is a natural candidate for time-based partitioning (e.g. daily partitions) so old executions can be dropped or archived cheaply once past the retention window, without a costly `DELETE` scan.

> ⚖️ **Decision Framework**
> A relational store (indexed `next_fire_time`) suits task volumes in the tens-to-hundreds-of-thousands range with straightforward due-task queries. At extreme task counts (millions of definitions, sub-second precision), a **time-wheel** in-memory structure (bucket tasks by fire-time into a ring, advance a pointer each tick) trades persistence simplicity for near-O(1) due-task lookup - Kafka's purgatory and many timer-wheel libraries use this pattern. The relational approach is the senior default because most task-scheduler workloads never approach the volume where a time-wheel's added complexity pays for itself; reach for it only when profiling shows the scan itself is the bottleneck, not preemptively.

## Scheduling Core: From Cron Expression to Fired Task

A cron expression (`0 */6 * * *`) is parsed into a rule for computing the next fire time from a given timestamp - the scheduler never "watches the clock" for a specific task; it periodically re-evaluates "is `next_fire_time` in the past?" on a fixed tick interval.

**Two competing tick-loop designs:**

1. **Poll-based (scan-and-dispatch)**: the leader wakes every N seconds, scans for `next_fire_time <= now()`, dispatches, advances. Simple, and naturally handles the leader crashing mid-tick (the next tick's scan just picks up anything still due).
2. **Push-based (min-heap/timer-wheel)**: the leader holds an in-memory priority queue of `(next_fire_time, task_id)`, sleeps until the earliest deadline, fires exactly then. Lower latency and no wasted scan cycles, but the in-memory structure must be rebuilt from durable storage on every leader failover - a non-trivial rebuild cost proportional to task count.

> ⚖️ **Decision Framework**
> Poll-based trades a small, bounded firing-latency penalty (up to one tick interval) for a dramatically simpler failover story - a new leader just starts scanning, no state to rebuild. Push-based buys tighter latency at the cost of failover complexity and a rebuild window during which the new leader is effectively blind. Given this system's own NFR (availability and eventual firing over sub-second precision), poll-based is the senior default; push-based only pays for itself when tick-interval latency is a genuine product requirement, which most cron-style workloads do not have.

**Jittering fire times** prevents the self-inflicted thundering herd named in the NFRs: if many tasks share an exact cron boundary (`0 * * * *`, every hour on the hour), dispatching all of them in the same tick creates a burst the worker fleet and downstream systems must absorb simultaneously. Adding a small deterministic jitter (derived from `task_id`, so it's stable across recomputation) spreads dispatch across a few seconds without changing the task's semantic schedule.

## Distributing Work: Partitioning & Leader Election

Two distinct scaling axes get conflated if not named separately:

- **Deciding what's due** - must be serialized (only one actor computes "is this due, and has it been dispatched") to avoid double-firing, achieved via [Leader Election](../algorithms/leader-election.md): exactly one scheduler node is active leader at a time, holding a renewable lease (etcd/ZooKeeper/Raft-backed). A leader that loses its lease (crash, network partition) triggers a new election; the new leader resumes from durable state, not in-memory state.
- **Executing what's due** - trivially parallelizable once a task is on the queue; the worker fleet scales horizontally with zero coordination between workers beyond the queue's own delivery semantics.

**Sharding the due-task scan** becomes necessary only past the single-leader scan's throughput ceiling: partition task definitions by `task_id` hash across multiple leader-shards, each independently leader-elected and each owning a disjoint slice of the scan. This trades a simpler single-leader model for higher scan throughput, and is a scale-driven decision, not a default - most deployments never need it (see [Scalability & Performance](#scalability--performance)).

> 🧠 **Thought Process**
> The instinct to make the whole scheduler "highly available" by running multiple active leaders is the most common design mistake here - it directly reintroduces double-firing, the exact failure mode single-leader election exists to prevent. High availability for the scheduling *decision* comes from fast failover to a new single leader, not from parallel leaders; high availability for *throughput* comes from the stateless worker fleet, which was designed to scale independently for exactly this reason.

## Execution & Delivery Guarantees

The queue between leader and worker fleet delivers **at-least-once** by construction (any durable queue can redeliver on consumer crash before ACK) - a worker that crashes after executing a task but before ACKing will see that message redelivered. The scheduler cannot upgrade this to true exactly-once at the transport layer; it can only make redelivery **safe**.

**Idempotency is the mechanism that makes at-least-once behave like exactly-once from the caller's perspective** (see [Idempotency](../algorithms/idempotency.md)): every execution carries a unique `execution_id`, and a worker checks Execution History for that ID before running the task body. A redelivered message for an already-completed `execution_id` is a no-op ACK, not a re-execution.

> ⚠️ **Gotcha**
> Idempotency at the scheduler layer only protects against *redelivery* of the same `execution_id` - it does nothing if the task body itself is not safe to retry (a payment-capture call that isn't idempotent on the downstream side will double-charge on retry regardless of how carefully the scheduler dedupes). The scheduler's contract with task authors must be explicit: task bodies are expected to be idempotent, or must use their own downstream idempotency key.

**Retry policy** operates one layer below delivery guarantees: a task that executes but fails (application error, not a delivery failure) is requeued per its configured backoff (fixed, linear, exponential) up to `max_attempts`, then routed to a dead-letter destination for manual inspection rather than retried forever.

**Visibility-timeout tuning relative to task execution time** is a distinct knob from retry policy, and getting it wrong manufactures false failures independent of any application bug. The visibility timeout is how long the queue waits after delivery before assuming the consumer died and redelivering; if it's shorter than a task's actual execution time, a still-healthy worker gets its in-flight task redelivered to a second worker mid-execution, producing spurious duplicate runs the idempotency guard has to absorb even though nothing actually failed. The fix is either setting the timeout comfortably above the p99 execution time for that task class (with heartbeat-based extension for tasks whose duration is unpredictable, so a fixed timeout doesn't have to cover the worst case for every task) or, for scheduler workloads with wildly varying task durations, routing short and long tasks through separate queues with independently tuned timeouts rather than one timeout sized for the slowest task in the fleet.

## DAG Scheduling: Dependencies Between Tasks

Beyond independent cron entries, a task can declare upstream dependencies (`dependency_ids`), forming a DAG - task C only becomes eligible once tasks A and B have both reached `succeeded`.

Mechanically, this changes the due-task condition from purely time-based (`next_fire_time <= now()`) to a **combined gate**: a dependent task's "due" check additionally requires all upstream `dependency_ids` to be in `succeeded` status for the current run. The leader (or a dedicated DAG-resolution component) tracks per-run completion state and only enqueues a dependent task once its gate clears.

**Failure propagation** is a deliberate policy choice, not automatic: does an upstream failure skip the dependent task, block it pending manual intervention, or cascade-fail it? Airflow-style systems default to blocking (the dependent simply never becomes eligible) with an explicit manual "mark success" override, rather than silently cascading failures through the whole DAG - cascading by default hides which task was the actual root cause.

**Worked example - a 3-node DAG's gate-check sequence.** Task graph: `A → C`, `B → C` (C depends on both A and B; A and B are independent of each other). A single run of this DAG - a `run_id` grouping this occurrence of A, B, and C together - walks through the gate mechanically as follows:

```
Run starts (run_id = R1):
  1. Leader evaluates due-task condition for A, B: both are time-based only
     (no dependency_ids) → both eligible → both dispatched to queue.
  2. C's gate check: dependency_ids = [A, B]; per-run completion state for
     R1 shows A = pending, B = pending → gate closed, C is NOT enqueued.

Worker completes A (R1):
  3. Worker marks A's execution 'succeeded' in Execution History.
  4. Gate re-check triggered for C (A is one of its dependencies):
     A = succeeded, B = still pending → gate still closed → C stays un-enqueued.

Worker completes B (R1):
  5. Worker marks B's execution 'succeeded' in Execution History.
  6. Gate re-check triggered for C: A = succeeded, B = succeeded →
     gate clears → leader enqueues C for run R1.

Worker completes C (R1):
  7. Run R1 reaches a terminal state; per-run completion state for R1 can
     be archived once all leaf and root nodes are terminal.
```

The mechanically important part is step 2 and step 4: C's gate is re-evaluated **per completion event**, scoped to the specific `run_id`, not "has A ever succeeded" - a second run (`R2`) starting before R1's C has fired maintains its own independent gate state, so R1 and R2 never cross-pollinate each other's dependency completions. This per-run scoping is exactly what a plain FIFO queue cannot express on its own (see [Common Misconceptions](#common-misconceptions)), and it's why DAG gate state lives in a dedicated per-run tracking structure rather than being inferred from task status alone.

> ⚖️ **Decision Framework**
> A DAG-aware scheduler is meaningfully more complex than independent cron entries - it needs per-run state tracking (which run's A and B succeeded, not just "has A ever succeeded"), cycle detection at definition time, and a failure-propagation policy. Reach for DAG support only when tasks have genuine data or ordering dependencies (a pipeline where step 2 needs step 1's output); independent cron entries that merely run "around the same time" don't need this machinery and shouldn't be forced into a DAG for organizational convenience.

## Reliability & Fault Tolerance

- **Scheduler leader crash mid-tick**: because `next_fire_time` is advanced and persisted *before* dispatch (see the sequence diagram), a leader that crashes after persisting but before publishing to the queue leaves that task correctly scheduled for its *next* occurrence, but the *current* due firing is lost - this is a deliberate at-most-once gap in the tick loop unless dispatch is written to an outbox in the same transaction as the `next_fire_time` update (see [Production Failure Modes](#production-failure-modes--gotchas)).
- **Worker crash mid-execution**: the queue's redelivery (post-visibility-timeout) picks the task back up on another worker; idempotency via `execution_id` check protects against double-execution if the crashed worker had actually completed the work just before dying.
- **Message queue outage**: the leader continues its scan-and-advance loop but cannot dispatch; due tasks accumulate as a backlog to drain once the queue recovers - this bounds the blast radius to "delayed," not "lost," provided `next_fire_time` advancement and dispatch are transactionally linked (the outbox pattern again).
- **Task store outage**: the leader cannot determine what's due at all; this is a hard dependency with no graceful degradation short of pausing all scheduling until the store recovers - a strong argument for the task store's own replication/HA story being treated as seriously as the scheduler's.

## Scalability & Performance

- **Worker fleet scales linearly** - stateless, coordination-free beyond the queue, so adding workers directly increases execution throughput with no shared bottleneck.
- **The leader's scan-and-dispatch loop is the ceiling** - a single leader processing the due-task scan and publish loop caps total scheduling throughput regardless of worker count; this is deliberate (see [Distributing Work](#distributing-work-partitioning--leader-election)). Kubernetes' CronJob controller and similar single-active-controller schedulers are workhorse examples of this exact pattern at production scale. Past roughly **1-5 million task definitions on a 1-second tick** (the point where a single-node indexed range scan plus publish no longer reliably completes inside one tick interval), the single-leader scan becomes the actual bottleneck rather than a theoretical one, and sharded leader-election (below) stops being optional.
- **Sharded leaders past the single-leader ceiling** - partitioning task definitions across multiple independently-elected leader-shards multiplies scan throughput, at the cost of more complex failover (N leases to track instead of one) and requiring consistent-hash-style shard ownership if shard count changes.
- **Hot dependency-gate checks in DAG mode** - a wide DAG (one task with hundreds of dependents) means each upstream completion triggers a gate re-check across many dependents; batching gate re-evaluation rather than triggering it per-individual-completion avoids a fan-out storm on the task store.
- **Multi-tenant fairness on a shared worker fleet** - once the scheduler serves multiple teams' tasks against one worker pool, a burst from one tenant (a backfill job firing thousands of tasks) can starve another tenant's time-sensitive tasks unless the queue enforces fairness. The standard fix is per-tenant queues (or a partitioned single queue keyed by `tenant_id`) consumed under weighted fair-share or strict priority, plus a per-tenant concurrency quota (max in-flight executions) so one team's burst caps out instead of exhausting the shared worker pool - this is the same noisy-neighbor problem [Message Queues](../components/message-queues.md) covers in depth for consumer fairness; this page only owns naming it as a scheduler-specific instance (task priority tiers on top of per-tenant quotas, not just queue-level fairness).

## Observability

- **Scheduling lag** (`actual_dispatch_time - next_fire_time`) - the single most important health metric; a rising lag means the tick loop is falling behind (scan too slow, leader overloaded, or a stuck failover), and should page before it compounds into a visible SLA miss for scheduled jobs.
- **Leader election churn** - frequent re-elections signal an unstable leader (resource pressure, network flakiness to the coordination service) and directly correlates with scheduling gaps during each failover window.
- **Dead-letter rate** - tasks exhausting `max_attempts` and landing in the dead-letter destination; a rising rate usually points to a systemic downstream issue (a dependency outage) rather than isolated task bugs.
- **Duplicate-execution rate** (idempotency-guard hits) - not itself an error signal (redelivery is expected under at-least-once), but a rate that spikes sharply usually indicates the queue's visibility timeout is misconfigured relative to actual task execution time.

## Production Failure Modes & Gotchas

- **Double-fire on leader crash between advance and dispatch** - if `next_fire_time` is persisted before the dispatch message is durably published, and the leader crashes in between, the new leader's next scan sees `next_fire_time` already advanced and never dispatches the missed occurrence - the mirror-image bug from the one described in [Reliability](#reliability--fault-tolerance). The durable fix is a transactional outbox: persist the advance and the "to-be-dispatched" record in one atomic write, with a separate relay process publishing from the outbox to the queue and marking it dispatched - this makes the two-step operation crash-safe in either direction.
- **Missed-tick pileup after a long leader outage** - if the leader is down for several tick intervals, the recovering leader's first scan may find many overdue tasks at once; naively dispatching all of them simultaneously recreates the thundering-herd problem jitter was meant to prevent. A catch-up policy (dispatch only the most recent missed occurrence, or spread the backlog across several ticks) must be an explicit design decision, not an accident of "the scan just runs and finds whatever's due."
- **Clock drift between scheduler nodes** - if leader election and `next_fire_time` comparison rely on each node's local clock without NTP discipline, a failover to a node with a skewed clock can cause a burst of immediate re-firing (clock ahead) or a delayed gap (clock behind) independent of any application-level bug.

### Common Misconceptions

- "Exactly-once delivery means the scheduler guarantees no duplicates, full stop" - it doesn't, and can't, across a crash-prone network; what's actually guaranteed is at-least-once delivery plus an idempotency contract that makes duplicates harmless, which is a different (and achievable) guarantee than transport-level exactly-once.
- "A cron expression describes when a task fires" - more precisely, it describes a rule for computing the *next* fire time from a reference point; the scheduler still has to actively evaluate that rule on a tick, it isn't a passive timer that fires itself.
- "DAG dependencies are just a fancier queue ordering" - a queue guarantees FIFO-ish delivery order, not conditional eligibility; a DAG gate needs its own per-run state (has A succeeded for *this* run, not ever) that a plain queue has no concept of.

## Trade-off Summary

| Decision | Options Considered | Choice | Why |
| --- | --- | --- | --- |
| Scheduling-decision distribution | Multiple always-active leaders, single elected leader | Single elected leader with fast failover | Multiple active leaders directly causes double-firing; availability comes from fast failover, not parallelism, at this layer |
| Tick-loop design | Poll-based scan, push-based min-heap/timer-wheel | Poll-based | Simpler, stateless failover (new leader just scans) outweighs the latency win of push-based, given the NFR favors availability over sub-second precision |
| Delivery guarantee | Attempt true exactly-once at transport, at-least-once + idempotency | At-least-once + idempotency contract | True exactly-once isn't achievable across a crash-prone network; idempotency makes at-least-once behave correctly from the caller's side at much lower complexity |
| next_fire_time advance ordering | Advance-then-dispatch (simple), transactional outbox | Transactional outbox | Advance-then-dispatch has a crash window that silently drops or double-fires a single occurrence; outbox makes the two-step operation atomic |
| DAG failure propagation | Cascade-fail dependents, block pending manual intervention | Block pending manual intervention | Cascading hides the true root cause across a wide DAG; blocking keeps the failure visible and localized, with an explicit override |
| Scan scaling past single-leader ceiling | Vertical scaling of one leader, sharded leader-election | Sharded leader-election (only past demonstrated ceiling) | Sharding adds real failover complexity (N leases vs. one); not worth it until profiling shows the single-leader scan is the actual bottleneck |

## Interview Scenario Bank

> 🗣️ **First 30 seconds**
> "I'd clarify whether tasks are purely time-based (cron-style) or need dependency ordering (a DAG), and what firing-precision tolerance is acceptable, since that decides whether I need DAG-gate tracking on top of the base scheduler. Assuming cron-style with dependency support and a tolerance of a few seconds around each tick - the core challenge is making sure every due task fires despite the node that decides 'what's due' being a potential single point of failure, without letting that same node become the execution bottleneck."

> 🎯 **Interview Lens**
> **Q:** Design a system that reliably fires a scheduled job even if the machine responsible for deciding "it's time" crashes at the worst possible moment.
> **Ideal answer:** Separate the decision (a small, leader-elected, low-throughput scan-and-dispatch loop backed by durable state) from the execution (a stateless, horizontally-scaled worker fleet behind a durable queue). Failover for the decision-maker is fast re-election reading from durable storage, not in-memory state; correctness under crash-and-retry comes from idempotent execution, not from trying to prevent every possible crash window.
> **Common trap:** Running multiple always-active "leaders" for availability, which directly causes double-firing - the fix for availability here is fast failover to a single leader, not parallelism.
> **Next question:** Your leader persists the next scheduled time and then crashes before it manages to actually dispatch that occurrence to the queue. What happened to that task, and how do you fix it structurally?

> 🎯 **Interview Lens**
> **Q:** A worker executes a task successfully but crashes right before acknowledging the message. What happens, and is that a bug?
> **Ideal answer:** The queue redelivers the message to another worker after the visibility timeout expires - this is expected at-least-once behavior, not a bug. The worker checks the execution's status by its unique execution ID before re-running the task body; since it's already marked succeeded, the redelivery is a no-op ACK, not a duplicate execution.
> **Common trap:** Treating the redelivery itself as the bug to eliminate, rather than recognizing that redelivery is unavoidable under at-least-once and the actual job is making it safe via idempotency.
> **Next question:** The task being scheduled is a call to a third-party payment API that isn't idempotent on their end. Does your scheduler's idempotency guard protect you here?

> 🎯 **Interview Lens**
> **Q:** One task in your DAG has a hundred downstream dependents, and it just failed. What happens to those hundred tasks?
> **Ideal answer:** Policy-dependent, but the senior default is to block the dependents (they never become eligible for this run) rather than automatically cascade-failing all hundred, because cascading obscures which task was the actual root cause during triage; a manual override lets an operator force a dependent eligible if the upstream failure is judged non-blocking after investigation.
> **Common trap:** Assuming "propagate the failure" obviously means cascade-fail everything downstream, without considering that this destroys root-cause visibility across a wide DAG.
> **Next question:** How does your gate-check mechanism avoid re-evaluating all hundred dependents individually every time any single upstream task's status changes?

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| DAG | Directed Acyclic Graph | Dependency structure where tasks point to their prerequisites with no cycles |
| NFR | Non-Functional Requirement | A quality-of-service constraint (availability, latency) rather than a feature |
| TTL | Time To Live | Expiry duration on a lease or lock, e.g. a leader's election lease |

### Anti-patterns

- Running multiple simultaneously-active scheduler leaders "for availability" - directly causes double-firing; availability at this layer comes from fast failover to a single leader, not parallel leaders.
- Advancing `next_fire_time` and dispatching to the queue as two independent, non-transactional writes - creates a crash window that either drops or double-fires a single occurrence; use a transactional outbox.
- Treating the queue's at-least-once delivery as a bug to "fix" instead of designing task execution to be idempotent - redelivery is inherent to any durable queue; idempotency is the correct mitigation, not delivery-guarantee escalation.
- Cascading a DAG failure through every downstream dependent by default - hides the actual root cause; block with an explicit manual override instead.
