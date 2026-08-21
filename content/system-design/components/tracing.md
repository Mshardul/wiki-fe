# Distributed Tracing

## Prerequisites

- **[Observability](./observability.md)** [Must read]
- **[Message Queues](./message-queues.md)** [Should read]

## Table of Contents

- [TLDR](#tldr)
- [Core Mechanics](#core-mechanics)
- [Context Propagation Across Boundaries](#context-propagation-across-boundaries)
- [Sampling Strategies](#sampling-strategies)
- [Quick Decision Guide](#quick-decision-guide)
- [Instrumentation Approaches](#instrumentation-approaches)
- [Storage & Query at Scale](#storage--query-at-scale)
- [Resilience & Failure Handling](#resilience--failure-handling)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

## TLDR

Distributed tracing reconstructs the path of a single request as it crosses service boundaries, recording each hop as a **span** - service, operation, duration, status, parent link - stitched into a tree by a shared trace ID (see [Observability](./observability.md#the-three-pillars) for how it fits alongside logs and metrics). The core engineering problem isn't emitting spans - it's propagating trace context through every hop, sync or async, without a single uninstrumented service silently breaking the chain, and doing it at a sampling rate that stays affordable at scale without discarding the failures you actually need. A trace that stops at service C tells you nothing about D, E, or F.

## Core Mechanics

A trace is a tree of **spans**. Each span represents one unit of work - typically one service handling one operation - and carries:

- `trace_id` - shared by every span in the request, the thing that ties the tree together
- `span_id` - unique to this span
- `parent_span_id` - the span that called this one (absent only on the root span)
- service name, operation name, start time, duration, status (ok/error)
- optional key-value **tags** (e.g. `http.status_code`, `db.statement`) and timestamped **events** (e.g. a retry, a cache miss) attached to the span

```
trace_id: abc123
  span: api-gateway        (root, 0-180ms)
    span: order-service    (parent: api-gateway, 10-150ms)
      span: inventory-svc  (parent: order-service, 20-70ms)
      span: payment-svc    (parent: order-service, 75-145ms)
        span: fraud-check  (parent: payment-svc, 80-140ms)
```

The tree shape is the point: it shows not just *that* the request took 180ms, but *where* - `payment-svc` and its child `fraud-check` account for 70ms of it, run sequentially after `inventory-svc` rather than in parallel. That's a concrete optimization target (parallelize `inventory-svc` and `payment-svc`) a flat log line or an aggregate latency metric can't hand you directly.

A **collector** (the OpenTelemetry Collector, or a vendor agent) receives spans emitted by each service, batches them, and forwards them to a backend (Jaeger, Tempo, a vendor SaaS) that assembles spans sharing a `trace_id` into the tree and serves the query UI.

## Context Propagation Across Boundaries

> ⚖️ **Decision Framework**
> A trace is only as complete as its weakest propagation hop. Synchronous HTTP/gRPC calls propagate context via headers automatically once instrumented; anything that breaks the direct call chain - a message queue, a background job, a fan-out into a thread pool - requires the trace context to be explicitly carried in the message payload or a threadlocal, because there's no header to inherit it from.

**Synchronous calls (HTTP, gRPC):** the caller injects the trace context into outgoing request headers; the callee's instrumentation extracts it and starts a new child span under the same `trace_id`. This is largely automatic once both sides use a compatible tracing library - see [W3C TraceContext](./observability.md#trace-context-propagation---w3c-tracecontext) for the standardized header format.

**Asynchronous boundaries (queues, event streams):** there is no request/response leg to attach a header to. The producer must serialize the trace context into the message envelope (a metadata field alongside the payload, not the payload itself); the consumer extracts it before processing and links its span as a child of the producer's span, or as a "follows-from" reference if the two are only causally, not temporally, related (a producer that finishes before the consumer even runs).

**In-process boundaries (thread pools, async/await):** context normally lives in a thread-local or async-local. Spawning work onto a different thread or an unmanaged goroutine/executor without manually propagating the context silently orphans that work from the trace - it still runs, but the span tree has a gap.

> ⚠️ **Gotcha**
> A trace with a gap is easy to mistake for a trace that shows the system is fast: the missing span's duration doesn't appear anywhere, so the parent looks like it returned quickly when it actually spent that time in unpropagated work. Verify propagation exists at every async/queue boundary explicitly during instrumentation review - a healthy-looking trace is not proof the chain is complete.

## Sampling Strategies

Storing every span of every trace is rarely affordable past a moderate request volume - see [Observability § Sampling & Cost Trade-offs](./observability.md#sampling--cost-trade-offs) for the general cost pressure shared with logs and metrics. Tracing's specific decision is *which* traces to keep.

| Strategy | When decided | Pro | Con |
| --- | --- | --- | --- |
| Head-based (probabilistic) | At the root span, before the request executes | Cheap, simple, no buffering | Samples blind to outcome - a 1% rate keeps 1% of your errors too |
| Tail-based | After the full trace completes, at the collector | Can bias toward errors/high-latency traces | Requires buffering the whole trace until it finishes - memory and collector cost |
| Rate-limiting | Cap traces/sec regardless of source | Bounds worst-case cost predictably | Can starve a low-traffic but important service during a shared spike |

> 🧠 **Thought Process**
> Head-based sampling at a flat rate is the naive default and the wrong one for debugging: if 1% of requests are sampled uniformly and only 0.1% of requests error, most errors are never captured. Tail-based sampling flips the priority - decide *after* seeing the outcome, so "this trace had an error" or "this trace was in the p99" can force a keep regardless of the baseline rate. The cost is holding every span of every in-flight trace in the collector until it's known whether to keep it, which is real memory pressure at high concurrency.

## Quick Decision Guide

- **≤3 services, no async boundaries** - tracing overhead (context propagation work, collector infra) isn't justified yet; structured logs with a correlation ID cover most debugging needs at this scale - see [Observability § Which Pillar First?](./observability.md#which-pillar-first).
- **4+ services or any async hop (queue, event stream) in the call chain** - this is where tracing stops being optional; "which service was slow" is no longer answerable from logs or metrics alone once a request fans out or crosses a queue.
- **Debugging a live incident, tracing not yet instrumented** - too late to retrofit mid-incident; this is the argument for instrumenting *before* it's needed, not a reason to skip it.
- **Cost-sensitive at high volume** - head-based sampling at a low flat rate is cheapest to run but blind to which traces matter; tail-based sampling costs more collector-side memory but is the lever that actually preserves error/outlier visibility - pick based on whether the current pain is "we're blind to errors" (go tail-based) or "the bill is the problem" (go head-based, lower rate).
- **Managed backend (Grafana Cloud, Datadog APM, Honeycomb) vs self-hosted (Jaeger/Tempo)** - a managed backend removes storage/ops burden and scales sampling/retention with the vendor's infra, at a cost that grows with span volume; self-hosting caps the recurring cost but shifts the operational burden (storage sizing, index tuning, upgrades) onto the team - the crossover point is usually when span volume growth would make the vendor bill exceed the cost of an engineer-week per quarter running the self-hosted stack.

## Instrumentation Approaches

- **Auto-instrumentation** - a language-runtime agent (OpenTelemetry auto-instrumentation, a vendor APM agent) hooks common libraries (HTTP clients/servers, DB drivers, queue clients) at load time with no code changes. Fast to adopt, covers the common span boundaries, but produces generic span names and misses business-meaningful boundaries (a checkout flow spanning three internal function calls the agent has no reason to treat as one unit).
- **Manual instrumentation** - explicit `startSpan`/`endSpan` calls (or a decorator/middleware) around the operations that matter for debugging or that auto-instrumentation can't see (an in-process cache lookup, a business-logic retry loop). Higher effort, but the resulting traces map to how engineers actually reason about the system.
- **Hybrid (the practical default)** - auto-instrumentation for the boundary spans (HTTP, DB, queue), manual spans layered on top for the handful of operations that are opaque without one. Instrumenting everything manually is rarely worth the ongoing maintenance cost as code changes.

## Storage & Query at Scale

Traces are typically stored as spans indexed by `trace_id` (for full-tree lookup by ID) and by a smaller set of high-value tags (service name, operation, status, a coarse time bucket) for search - not full-text indexed the way logs are, because trace queries are structured ("show me traces where `payment-svc` errored, p99 latency, last hour") rather than free-text.

> ⚠️ **Gotcha**
> Trace storage volume grows with `span count`, not `request count` - a single request that fans out into 40 downstream spans costs 40x what a flat single-hop request does. A service that adds a new internal fan-out (e.g. querying 10 shards instead of 1) silently multiplies trace storage cost even though request volume didn't change; this is a common source of an unexplained tracing-bill spike after what looked like an unrelated architecture change.

## Resilience & Failure Handling

- **Collector as buffer, not blocking dependency** - spans are emitted to a local collector agent (sidecar or node-level) asynchronously; a slow or unreachable tracing backend must never block the request path. If the collector's local buffer fills, the correct behavior is dropping spans, not backpressure onto the application.
- **Partial traces are still useful** - if one hop's spans are lost (collector restart, network blip) the remaining spans still assemble into a partial tree; treat a broken chain as a data-quality signal for that service's instrumentation, not evidence the whole tracing pipeline is worthless.
- **Sampling decision must survive service restarts** - for tail-based sampling, if the collector holding a buffered trace crashes mid-request, that trace is lost regardless of whether it would have been sampled in; running a collector fleet resilient to individual node loss (not a single collector instance) matters more here than it does for head-based sampling, which makes its keep/drop decision instantly at the root.

## Production Failure Modes & Gotchas

- **One uninstrumented service breaks the chain** - if a hop in the call path doesn't propagate or doesn't emit a span, the trace tree has a silent gap at exactly that hop; the trace still "completes" and looks plausible, which is worse than an obvious error because it's easy to miss during debugging. Fix: instrumentation coverage checks (e.g. alerting on services with zero span emission) as part of onboarding a new service, not an afterthought.
- **100% sampling as a default that quietly becomes the incident** - enabling full sampling temporarily to debug an issue and forgetting to revert it is a common way to 10x tracing infra cost or overload the collector fleet during exactly the traffic spike that triggered the original debugging need.
- **Clock skew across hosts distorts span ordering** - spans are timestamped by each host's local clock; without NTP-synchronized clocks, a child span can appear to start before its parent in the trace UI, making the causality picture actively misleading rather than just incomplete.
- **High-cardinality tags on spans** - attaching a unique value (a user ID, a full request body) as a span tag on every span, rather than as an indexed field with a bounded value set, inflates storage and can degrade query performance the same way high-cardinality labels do for metrics (see [Observability § Pillar Trade-offs](./observability.md#pillar-trade-offs)).

### Common Misconceptions

- "Adding tracing means every service call is now automatically traceable" - true only for the boundaries auto-instrumentation covers *and* only once every hop, including async ones, explicitly propagates context; a single unpropagated queue hop silently ends the chain.
- "A complete-looking trace means nothing was missed" - a trace with no visible gap can still be missing async work that never propagated context in the first place (see [Context Propagation § in-process boundaries](#context-propagation-across-boundaries)); "looks complete" and "is complete" are not the same guarantee.
- "Sampling means losing data you didn't need anyway" - head-based sampling at a flat rate discards a proportional share of your errors and outliers along with the routine traffic; what you lose is disproportionately the traces you'd most want during an incident, unless the strategy is tail-based or otherwise outcome-aware.

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** Your trace for a slow request shows the request took 400ms, but every visible span only accounts for 250ms of that. Where did the other 150ms go, and how do you find out?
> **Ideal answer:** The gap is almost certainly an unpropagated boundary - a background thread, an async callback, or a queue hop that ran real work but never carried the trace context, so it never emitted a child span. The fix is auditing every boundary the request crosses (thread pool submission, queue publish/consume, any fire-and-forget call) for explicit context propagation, not assuming the visible spans are the complete picture.
> **Common trap:** Concluding the "missing" 150ms was idle/network time between spans rather than checking whether an entire unpropagated unit of work is hiding in the gap.
> **Next question:** How would you detect this class of gap systematically across hundreds of services, rather than by manually inspecting one slow trace at a time?

> 🎯 **Interview Lens**
> **Q:** Your tracing bill 3x'd in a week with no change in request volume. What's your first hypothesis and how do you confirm it?
> **Ideal answer:** Storage cost scales with span count, not request count - the likely cause is a service change that increased fan-out per request (more downstream calls, a new N-way shard query, a retry loop that got noisier) rather than more traffic. Confirm by checking span-count-per-trace trends per service, not just total trace volume, to isolate which service's fan-out changed.
> **Common trap:** Assuming the sampling rate must have been misconfigured, without first checking whether span-per-trace volume itself grew.
> **Next question:** The fan-out turns out to be legitimate and necessary - how do you keep tracing cost under control without losing visibility into that service?

> 🎯 **Interview Lens**
> **Q:** You need to keep every trace that contains an error for debugging, but can't afford to store every trace. What sampling approach do you pick and what does it cost you operationally?
> **Ideal answer:** Tail-based sampling - the keep/drop decision is made after the trace completes, so it can be biased toward errors and high latency instead of sampled blind. The operational cost is that the collector must buffer every span of every in-flight trace until it's known whether to keep it, which is real memory pressure that scales with concurrent in-flight request volume, and requires a collector fleet resilient to individual node loss so a crash doesn't silently drop buffered traces.
> **Common trap:** Proposing a lower head-based sampling rate as a fix, which reduces cost but doesn't solve the actual problem - it still discards errors proportionally rather than preferentially keeping them.
> **Next question:** Your collector fleet needs to make a consistent keep/drop decision on a trace whose spans arrive at different collector nodes - how do you avoid two nodes disagreeing on whether to keep it?

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| APM | Application Performance Monitoring | Vendor category covering tracing plus related latency/error tooling |
| OTel | OpenTelemetry | Vendor-neutral instrumentation SDK and collector used to emit and forward spans |

### Anti-patterns

- Leaving 100% sampling on after a debugging session - quietly multiplies collector and storage cost until the next traffic spike turns it into an incident.
- Treating auto-instrumentation as sufficient coverage - it stops at the boundaries the agent hooks; async and in-process propagation gaps still require manual attention.
- Attaching high-cardinality, unbounded values as span tags - inflates storage and degrades query performance the same way high-cardinality metric labels do.
- Sizing the collector fleet as a single instance - fine for head-based sampling, but a single point of failure for tail-based sampling, where a crash drops every trace it was buffering.
