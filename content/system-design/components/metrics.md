# Metrics

## Prerequisites

- **[Observability](./observability.md)** [Must read]
- **[Message Queues](./message-queues.md)** [Should read]

## Table of Contents

- [TLDR](#tldr)
- [Core Mechanics](#core-mechanics)
- [Metric Types](#metric-types)
- [Push vs Pull Collection Models](#push-vs-pull-collection-models)
- [Quick Decision Guide](#quick-decision-guide)
- [Cardinality & Cost](#cardinality--cost)
- [Aggregation & Query Trade-offs](#aggregation--query-trade-offs)
- [Resilience & Failure Handling](#resilience--failure-handling)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

## TLDR

Metrics are numeric measurements aggregated over time - `http_requests_total`, `db_query_duration_p99` - the cheapest and fastest-to-query of the three [observability](./observability.md) pillars, and the one purpose-built for alerting and capacity planning rather than per-event debugging. The engineering problem isn't emitting a number, it's choosing an aggregation type (counter, gauge, histogram) that actually supports the query you'll need at 3am, and controlling label cardinality before it silently turns a cheap time-series database into an out-of-memory incident.

## Core Mechanics

A metric moves through three stages between being emitted and being queryable:

```
App increments/observes a value → Collector scrapes or receives it → Time-series DB stores it, aggregated per interval
```

1. **Emission** - application code increments a counter, sets a gauge, or observes a value into a histogram, via a client library (Prometheus client, StatsD client, OpenTelemetry SDK). This is an in-process, in-memory operation with no network call on the request path itself.
2. **Collection** - either the collector pulls the current values (Prometheus scraping a `/metrics` endpoint) or the application pushes them to a collector (StatsD-style UDP push) - see [Push vs Pull Collection Models](#push-vs-pull-collection-models).
3. **Storage & aggregation** - a time-series database stores each metric as a stream of `(timestamp, value, labels)` points, pre-aggregated into fixed intervals (e.g. one point per 15s) rather than storing every raw emission - this interval-based aggregation is what makes metrics orders of magnitude cheaper to store and query than logs.

## Metric Types

Each metric type supports a different query shape - picking the wrong one means the query you need later simply isn't answerable from the stored data.

| Type | What it represents | Can go down? | Example |
| --- | --- | --- | --- |
| Counter | Monotonically increasing total | No (only resets on restart) | `http_requests_total`, `errors_total` |
| Gauge | A value that goes up or down | Yes | `queue_depth`, `active_connections`, `memory_used_bytes` |
| Histogram | Distribution of observed values, bucketed | N/A (each observation adds to a bucket) | `http_request_duration_seconds` |
| Summary | Client-side pre-calculated quantiles | N/A | Client-computed p50/p99 (rarely preferred over histogram - see below) |

> ⚖️ **Decision Framework**
> A counter answers "how many total" (compute rate via `rate()` over a window at query time). A gauge answers "what's the value right now." A histogram answers "what's the distribution" - critical for latency, where an average hides the p99 tail that actually determines user experience. Histograms are generally preferred over summaries because a histogram's buckets can be aggregated *server-side* across instances (sum bucket counts across 50 pods, then compute p99 for the whole fleet); a summary's quantiles are pre-computed per-instance and mathematically cannot be merged across instances after the fact.

> ⚠️ **Gotcha**
> Choosing histogram bucket boundaries wrong is a common, hard-to-fix-later mistake: buckets are baked in at emission time (`le="0.1", le="0.5", le="1.0"`), so a p99 query can only be as precise as the bucket boundaries actually recorded - if real latency clusters between two buckets you defined too far apart, the interpolated percentile is inaccurate, and fixing it requires a code change and redeploy, not a query change.

## Push vs Pull Collection Models

| | Pull (scrape) | Push |
| --- | --- | --- |
| How | Collector polls a `/metrics` endpoint on a schedule | Service actively sends data to a collector |
| Canonical system | Prometheus | StatsD, OpenTelemetry push exporter |
| Service discovery | Collector needs to know all scrape targets | Service just needs the collector's address |
| Short-lived / batch jobs | Poor fit - a job that finishes before the next scrape interval is never collected | Natural fit - the job pushes on completion regardless of lifetime |
| Network posture | Collector needs inbound network access to every service | Service only needs outbound access - friendlier to strict firewall/NAT setups |
| Debuggability | `curl` the `/metrics` endpoint directly to see exactly what a service is reporting | Harder to inspect in isolation - the data is already in flight to the collector |

> ⚖️ **Decision Framework**
> Pull-based (Prometheus) is the default for long-running services because it centralizes collection-interval control at the collector (easy to change scrape frequency fleet-wide without redeploying services) and makes debugging trivial (curl the endpoint). Push-based fits short-lived jobs and environments where the collector genuinely cannot reach every service (serverless functions, jobs behind restrictive NAT) - the trade-off is the service now owns a dependency on the collector's address and availability.

## Quick Decision Guide

- **Counting occurrences (requests, errors)** → counter, queried with `rate()` over a window - never read a counter's raw value directly, since it only resets on process restart and the raw total is rarely the useful number.
- **Current state (queue depth, connections, memory)** → gauge.
- **Latency or size distributions where the tail matters** → histogram, not an average - see [Metric Types](#metric-types) for why averages hide the p99 that determines actual user experience.
- **Long-running services on a network the collector can reach** → pull-based (Prometheus) for centralized scrape-interval control and easy debugging.
- **Short-lived jobs, serverless, or NAT-restricted services** → push-based, since the job may not exist by the time a pull would occur.
- **Any label with unbounded or user-specific values (`user_id`, `request_id`, raw IP)** → never as a label; see [Cardinality & Cost](#cardinality--cost) - this single decision is the most common source of a metrics-backend outage.

## Cardinality & Cost

Metrics are cheap per data point, but total cost scales with **cardinality** - the number of unique label-value combinations, since each unique combination becomes its own stored time series. A metric with `service` (50 values) × `endpoint` (20 values) × `status_code` (10 values) already creates 10,000 time series; adding a `user_id` label with 10 million distinct values multiplies that by 10 million, instantly.

> ⚠️ **Gotcha**
> **The cardinality wall is the single most common cause of a metrics-backend outage.** A well-intentioned engineer adds `user_id` or `request_id` as a label to debug a specific issue, ships it, and the metrics backend's memory usage grows unboundedly within hours as millions of new time series are created - this is not a gradual degradation, it can OOM a Prometheus instance within a single deploy cycle. The fix is structural, not just code review discipline: enforce a per-metric cardinality ceiling at the backend (reject or drop new series past a threshold) so a missed review degrades gracefully instead of taking down the whole backend.

**Bounded-cardinality labels are safe**: service name, HTTP status code, region, endpoint route (not raw path with IDs interpolated). **Unbounded-cardinality labels are not**: user ID, request ID, session token, raw client IP, or any free-form string. If per-request or per-user granularity is genuinely needed, that's a signal to reach for [logs or traces](./observability.md#the-three-pillars) instead, which are built for high-cardinality per-event data - not to force it into the metrics pillar.

## Aggregation & Query Trade-offs

Metrics are pre-aggregated at collection/storage time (e.g. one point per 15s interval, not every raw emission), which is exactly what makes them cheap and fast to query - and exactly what limits what they can tell you. A metric answers "how much/how often" across a population of events; it cannot answer "show me the one request that failed" the way a log line or trace can, because the individual event's identity is discarded at aggregation time in exchange for that storage efficiency.

> 🧠 **Thought Process**
> The instinct when debugging is often "let's add more metrics." The senior framing recognizes metrics and logs solve different problems: a metric tells you *that* something is wrong and roughly how much, a log or trace tells you *which specific request* and *why*. Reaching for a high-cardinality label to get per-request detail out of a metric is solving a logs/traces problem with the wrong tool, at real cost (see [Cardinality & Cost](#cardinality--cost)).

## Resilience & Failure Handling

- **Local buffering on the emitting service** - a client library should buffer metric updates in-process and never block application request handling on the collector being reachable; a slow or down collector must degrade to "metrics not reported" for that window, not "requests slow down."
- **Collector redundancy** - for pull-based systems, running multiple scraper replicas (or a federated hierarchy) avoids the collector itself being a single point of failure for the entire fleet's visibility.
- **Graceful scrape/push failure** - a missed scrape or dropped push should show up as a gap in the time series (visible, honest) rather than the collector inventing an interpolated value that masks the outage.

## Production Failure Modes & Gotchas

- **Cardinality explosion from an unbounded label** - see [Cardinality & Cost](#cardinality--cost); the leading real-world cause of metrics-backend outages, and the reason label review belongs in code review *and* as an enforced backend limit, not either alone.
- **Reading a counter's raw value instead of its rate** - a counter only ever increases (until a process restart resets it to zero), so displaying the raw value on a dashboard is nearly meaningless; every counter must be queried through `rate()`/`increase()` over a window, and a restart-induced reset can otherwise look like a real traffic drop if not handled by the query layer.
- **Histogram bucket boundaries chosen without real latency data** - buckets are fixed at emission time; boundaries picked from a guess rather than actual production latency distribution produce inaccurate percentile interpolation that isn't fixable without a redeploy.
- **Collector as an unmonitored single point of failure** - if the metrics pipeline itself goes down silently, the fleet appears "quiet" rather than visibly broken, and the team loses the exact signal needed to detect the outage that's happening. The pipeline needs its own health check independent of the metrics it collects.

### Common Misconceptions

- "A metrics backend can scale to any cardinality if you just give it more resources" - unbounded cardinality growth (e.g. a user-ID label at millions of users) outpaces any reasonable vertical or horizontal scaling; the label itself is the bug, not the backend's capacity.
- "An average latency metric is good enough for SLOs" - an average hides tail behavior; a service with a 50ms average and a 3-second p99 has a real user-facing latency problem an average alone will never surface, which is why histograms (not averages) back latency SLOs.

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** You want to track request latency for a service. Would you use a gauge, a counter, or a histogram, and why?
> **Ideal answer:** A histogram - latency is a distribution, and a single aggregate number (like an average, which is what a naive gauge-per-request would degrade into) hides the tail behavior that actually determines user experience. Histogram buckets let you compute p50/p95/p99 at query time, and can be aggregated server-side across many service instances, unlike client-computed summary quantiles.
> **Common trap:** Proposing a gauge updated per-request, which can only ever show the single most recent value, or a summary, which can't be aggregated across instances after the fact.
> **Next question:** Your p99 latency query looks suspiciously flat even though users are reporting slowness. What's the first thing you'd check?

> 🎯 **Interview Lens**
> **Q:** An engineer adds `user_id` as a label on your request-count metric to help debug an issue. What happens, and what's the correct fix?
> **Ideal answer:** Each unique `user_id` value creates a brand-new time series; at millions of users, this can create millions of series almost instantly and OOM the metrics backend. The correct fix isn't "don't do that" as a policy alone - it's enforcing a per-metric cardinality ceiling at the backend itself (reject/drop new series past a threshold) so a missed code-review catch degrades gracefully instead of taking the backend down, and routing per-user debugging needs to logs or traces instead, which are built for that cardinality.
> **Common trap:** Treating this purely as a code-review process failure rather than recognizing it needs a structural, backend-enforced safety net.
> **Next question:** How would you detect this class of incident within minutes of a bad deploy, rather than after the backend has already degraded?

> 🎯 **Interview Lens**
> **Q:** Should a new short-lived batch job that runs for 30 seconds use Prometheus-style pull metrics or push-based metrics?
> **Ideal answer:** Push-based - a pull-based collector on a typical 15-30s scrape interval may never actually scrape the job before it exits, silently losing that job's metrics entirely. Push (or a Prometheus Pushgateway, which exists specifically for this case) ensures the metric is recorded on completion regardless of the job's lifetime relative to the scrape interval.
> **Common trap:** Defaulting to "use Prometheus, it's the standard" without checking whether the workload's lifetime is compatible with a pull model at all.
> **Next question:** If you have thousands of these short-lived jobs running per minute, does pushing to a single Pushgateway introduce a new bottleneck or single point of failure?

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| OOM | Out Of Memory | Process crash from exceeding available memory, the typical failure mode of a cardinality explosion |
| NAT | Network Address Translation | Networking layer that can block a pull-based collector from reaching a service directly |

### Anti-patterns

- Adding an unbounded-cardinality label (`user_id`, `request_id`, raw IP) to a metric - creates a time series per unique value and is the leading cause of metrics-backend outages; use logs/traces for per-request granularity instead.
- Reading a counter's raw value on a dashboard instead of its rate over a window - counters only increase and reset on restart, so the raw value is close to meaningless without a `rate()` query.
- Using an average instead of a histogram for latency - hides p99 tail behavior that actually determines user-facing experience.
- Choosing histogram bucket boundaries without checking real production latency data first - baked in at emission time, wrong boundaries aren't fixable without a redeploy.
