# Logging

## Prerequisites

- **[Observability](./observability.md)** [Must read]
- **[Message Queues](./message-queues.md)** [Should read]

## Table of Contents

- [TLDR](#tldr)
- [Core Mechanics](#core-mechanics)
- [Structured vs Unstructured Logging](#structured-vs-unstructured-logging)
- [Log Aggregation Pipeline](#log-aggregation-pipeline)
- [Quick Decision Guide](#quick-decision-guide)
- [Storage & Indexing Trade-offs](#storage--indexing-trade-offs)
- [Resilience & Failure Handling](#resilience--failure-handling)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

## TLDR

Logging captures discrete, timestamped events - the highest-resolution and most expensive observability signal (see [Observability](./observability.md) for how it fits alongside metrics and traces). The real engineering problem past a handful of services isn't "how do I write a log line" - it's building a pipeline that can ingest, ship, index, and query a high-volume, high-cardinality event stream fast enough to be useful during an incident, without the pipeline itself becoming the bottleneck or the outage.

## Core Mechanics

A log entry moves through four stages between being emitted and being queryable:

```
App emits log line → Local agent (buffer + batch) → Aggregation pipeline (ship, parse, enrich) → Indexed store (search/query)
```

1. **Emission** - the application writes a log line, ideally structured (see below), to stdout/stderr or a local file. Writing directly to a remote system synchronously from the request path is an anti-pattern - see [Production Failure Modes](#production-failure-modes--gotchas).
2. **Local agent** - a sidecar or node-level daemon (Fluent Bit, Filebeat, the OTel Collector's log receiver) tails the output, buffers it locally, and batches shipment to the aggregation layer. This decouples the application's request latency from the aggregation pipeline's availability.
3. **Aggregation & enrichment** - the pipeline parses each line into fields, attaches metadata (service name, pod/host, environment), and often injects the correlation ID if it isn't already present in the structured payload.
4. **Indexed storage** - logs land in a store built for full-text and field-based search (Elasticsearch, Loki, ClickHouse-backed systems) rather than a general-purpose database, because log query patterns (recent-time-range + field filters + free-text) don't match what a relational index is optimized for.

## Structured vs Unstructured Logging

> ⚖️ **Decision Framework**
> Unstructured (`"User 4521 failed login at 10:32"`) is faster to write and reads naturally in a terminal, but is nearly unsearchable at scale - finding every failed login for user 4521 across a week of logs means regex-scanning free text. Structured (`{"event": "login_failed", "user_id": 4521, "ts": "..."}`) costs a small amount of upfront discipline (a schema, a logging library convention) but makes every field independently filterable and aggregatable in the index - the difference between a query and a full-text guess.

Structured logging is the production default past a single-service prototype specifically because the aggregation pipeline (above) can only enrich and index what it can parse - unstructured free text forces the pipeline to either skip structured indexing entirely or maintain fragile regex-based field extraction that breaks on format changes.

> ⚠️ **Gotcha**
> Structured logging discipline erodes at the edges - a single `printf`-style debug line dropped into otherwise-structured code either breaks the parser (if strict) or silently becomes an unindexed blob (if lenient). Enforce structure at the logging-library level (a wrapper that requires a fields map, not a raw string) so it can't be bypassed per call site.

## Log Aggregation Pipeline

At small scale, an application can ship logs directly to a central store. Past a handful of services this breaks down - hence the local-agent layer in [Core Mechanics](#core-mechanics). The pipeline's job is threefold:

- **Decoupling** - the app never blocks on the aggregation backend being available; the local agent absorbs backend slowness or outages via local buffering.
- **Enrichment** - attaching context the application itself doesn't (or shouldn't) know: which node/pod emitted this, which deployment version, which region.
- **Routing** - different log streams (application logs, access logs, audit logs) often need different retention, indexing, and access-control policies, and the pipeline is where that routing decision is made, not in application code.

```
[App instances] → [Local agent: buffer + batch] → [Message queue / buffer tier] → [Log processor: parse + enrich] → [Indexed store] → [Query UI]
```

A message-queue buffer tier (Kafka is the common choice) between shipping and processing is standard at high volume - it absorbs bursty ingestion spikes without requiring the processing tier to be provisioned for peak, and gives the pipeline replay capability if the indexing tier falls behind or needs to be reprocessed.

## Quick Decision Guide

- **Small system, ≤3 services** - direct shipping to a managed log service (CloudWatch Logs, a hosted ELK/Loki instance) is fine; a full local-agent + queue-buffer pipeline is over-engineering at this scale.
- **High-volume, multi-team system** - the full pipeline (local agent → queue buffer → processor → indexed store) earns its complexity; skipping the queue buffer tier is what causes ingestion-spike data loss at this scale.
- **Cost-sensitive at high volume**: retention window and log level (see [Observability § Log Verbosity](./observability.md#sampling--cost-trade-offs)) are the two levers that actually move the storage bill - indexing engine choice matters less than how much you choose to keep and at what verbosity.
- **Audit/compliance logs** - route to a separate, immutable, longer-retention stream from general application logs; mixing them into the same pipeline with the same retention policy either over-retains debug noise or under-retains audit trails.

## Storage & Indexing Trade-offs

| Approach | Query speed | Storage cost | Best fit |
| --- | --- | --- | --- |
| Full-text inverted index (Elasticsearch) | Fast for free-text + field search | High (index overhead on every field) | Ad-hoc debugging, unpredictable query patterns |
| Label-indexed, content-unindexed (Loki) | Fast for label filters, slower for full-text within a stream | Low (only labels indexed, log body stored compressed) | High-volume systems where queries are mostly "logs from service X in time range Y" |
| Columnar/OLAP-backed (ClickHouse-based) | Fast for structured field aggregation | Medium | Structured logs queried more like analytics events than free text |

> 🧠 **Thought Process**
> The instinct is to reach for "the best search engine" (Elasticsearch) by default. The senior framing asks what's actually being queried: if most production queries are "give me logs from service X, pod Y, in the last 15 minutes" - a label-indexed system (Loki) is both cheaper and often faster, because it avoids indexing log bodies that are rarely searched by free text. Full inverted-text indexing earns its cost when free-text search across arbitrary fields is the common case, not the exception.

## Resilience & Failure Handling

- **Local buffering absorbs backend outages** - the local agent (Fluent Bit, Filebeat) holds unshipped logs on local disk if the aggregation backend is unreachable, up to a configured buffer size/duration, then ships once connectivity restores. Beyond that buffer limit, logs are dropped - this is a deliberate backpressure decision, not a bug.
- **Queue buffer tier absorbs ingestion spikes** - during a traffic spike or an incident (which is exactly when log volume spikes hardest, from repeated error logging), the Kafka-style buffer tier lets the processing/indexing tier fall behind temporarily without losing data, catching up once volume normalizes.
- **Graceful degradation over blocking** - a logging pipeline should never apply backpressure onto the application's request path; if the pipeline is overwhelmed, the correct failure mode is dropping or sampling logs, not slowing down user-facing requests.

## Production Failure Modes & Gotchas

- **Synchronous remote logging on the request path** - writing a log line via a blocking network call to a remote aggregator inside a request handler ties the request's latency to the logging backend's health; a slow or down log backend then takes down the application itself. Fix: always log locally (stdout/file) and let an out-of-process agent handle shipping.
- **Pipeline overload during the exact incident it's meant to help debug** - log volume spikes hardest during an incident (more errors logged, more retries), which is precisely when the aggregation pipeline is most likely to fall behind or drop data - see [Observability § Observability Pipeline as a Single Point of Failure](./observability.md#production-failure-modes--gotchas) for the general pattern; logging's specific instance is queue-buffer sizing for peak-during-incident volume, not average volume.
- **Unbounded log line size** - a single log line containing a large payload (a full request/response body, a stack trace with embedded data) can be disproportionately expensive to index and store; cap and truncate large fields at emission time, not after ingestion.
- **PII/secrets leaking into logs** - request bodies, headers, or error messages logged verbatim can capture passwords, tokens, or personal data that then persists in a system with broader read access than the original request path. Requires explicit field-level redaction at the logging-library level, not manual per-call-site discipline.

### Common Misconceptions

- "Structured logging is only about making logs look nicer" - the actual reason it matters is indexability; unstructured logs force the aggregation pipeline into fragile regex parsing or unindexed full-text-only search.
- "More log retention is always safer" - retention past the window anything is realistically queried against (usually days to a few weeks for hot storage) is pure storage cost with no debugging benefit; compliance/audit retention is a separate, deliberate policy, not a default extension of application log retention.

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** Your logging pipeline falls over during every major incident, right when you need it most. Why, and how do you fix it?
> **Ideal answer:** Log volume spikes hardest exactly during incidents (more errors, more retries), and if the pipeline is sized for average volume rather than incident-time peak, the processing/indexing tier falls behind or drops data. Fix: a message-queue buffer tier sized for peak-during-incident volume, local agent buffering to survive backend hiccups, and never letting the application block on the logging backend.
> **Common trap:** Proposing "just scale up the indexing cluster" without addressing that the local-agent-to-application coupling (synchronous remote logging) is often the actual root cause of cascading slowness.
> **Next question:** How would you distinguish "the pipeline is behind but catching up" from "the pipeline is actively dropping data" during an incident, from the outside?

> 🎯 **Interview Lens**
> **Q:** Should you use Elasticsearch or a label-indexed system like Loki for a high-volume microservices logging system?
> **Ideal answer:** Depends on the dominant query pattern - if most queries are free-text search across arbitrary fields, a full inverted index (Elasticsearch) earns its cost; if most queries are "logs from service X in time range Y" (label-scoped), a label-indexed system is both cheaper and often faster since it avoids indexing log bodies that are rarely searched by free text.
> **Common trap:** Defaulting to "Elasticsearch, it's the standard" without examining the actual query pattern, which at high volume is a real cost decision, not a stylistic one.
> **Next question:** Your team's actual usage shows 80% of queries are free-text searches within a single already-known service - does that change the choice?

> 🎯 **Interview Lens**
> **Q:** A production incident revealed that a customer's password was captured in plaintext in application logs. How does this happen and how do you prevent it structurally?
> **Ideal answer:** Verbatim request-body or header logging (often added for debugging and never removed) captured a field never meant to be persisted; the structural fix is field-level redaction enforced at the logging-library layer (a deny-list or allow-list of loggable fields) so it can't be bypassed by a single careless call site, not a code-review-only policy.
> **Common trap:** Treating this as a one-off bug to patch at the call site that leaked it, rather than a missing structural control across the whole logging path.
> **Next question:** How would you retroactively handle the data that already leaked into the log store and any downstream backups/exports of it?

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| PII | Personally Identifiable Information | Data that can identify an individual; must not leak into logs unredacted |
| OTel | OpenTelemetry | Vendor-neutral instrumentation SDK, includes a log-receiver component |

### Anti-patterns

- Synchronous remote logging inside a request handler - couples request latency to the logging backend's health; log locally and ship via an out-of-process agent instead.
- No queue buffer tier at high volume - the pipeline falls behind precisely during incidents, when log volume spikes hardest; add a message-queue buffer sized for peak-during-incident volume.
- Logging request/response bodies verbatim without field-level redaction - leaks PII/secrets into a system with broader access than the original request path.
- Retaining all logs indefinitely at INFO+ verbosity - pure storage cost past the window anything is realistically queried against; set a deliberate retention policy per log stream.
