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

Logging captures discrete, timestamped events - the highest-resolution, most expensive observability signal. The engineering problem is a pipeline that ingests and indexes a high-cardinality stream fast enough to help mid-incident, without becoming the outage itself. **The pipeline's real job isn't storing text - it's surviving the moment it's needed most.**

## Core Mechanics

A log entry moves through four stages between being emitted and being queryable:

```
App emits log line → Local agent (buffer + batch) → Aggregation pipeline (ship, parse, enrich) → Indexed store (search/query)
                            │                                    │
                            │ backend unreachable                │ falling behind / overloaded
                            ▼                                    ▼
                     buffer on local disk                 processing lags, then
                     up to configured limit,               drops or samples incoming
                     then drops oldest                      logs rather than blocking
```

Each arrow above is a happy-path handoff; each stage also has a failure branch, shown below it - the local agent's disk buffer caps out and drops rather than blocking the app, and the aggregation pipeline degrades by dropping/sampling rather than applying backpressure onto emission. This diagram is the canonical version of that failure behavior - other sections reference it rather than re-explaining it.

1. **Emission** - the application writes a log line, ideally structured (see below), to stdout/stderr or a local file. Writing directly to a remote system synchronously from the request path is an anti-pattern - see [Production Failure Modes](#production-failure-modes--gotchas).
2. **Local agent** - a sidecar or node-level daemon (Fluent Bit, Filebeat, the OTel Collector's log receiver) tails the output, buffers it locally, and batches shipment to the aggregation layer. This decouples the application's request latency from the aggregation pipeline's availability.
3. **Aggregation & enrichment** - the pipeline parses each line into fields, attaches metadata (service name, pod/host, environment), and often injects the correlation ID if it isn't already present in the structured payload.
4. **Indexed storage** - logs land in a store built for full-text and field-based search (Elasticsearch, Loki, ClickHouse-backed systems) rather than a general-purpose database, because log query patterns (recent-time-range + field filters + free-text) don't match what a relational index is optimized for.

### Correlation ID Propagation

A correlation ID (or trace ID) ties every log line from a single request together across services, and it has to be generated once, at the edge, then carried forward - not regenerated per hop. The entry point (gateway or first service) generates it if the inbound request doesn't already carry one, then every downstream call propagates it forward, typically as a request header (e.g. `X-Correlation-ID`) that each service reads on the way in and re-attaches on the way out, including onto any async work (queue messages, background jobs) it spawns. The logging library then pulls it from request-scoped context (thread-local, async-local, or an explicit context object depending on the language's concurrency model) so every log line emitted during that request carries it automatically, without every call site passing it manually.

> ⚠️ **Gotcha**
> A correlation ID that isn't propagated across an async boundary (a message dropped onto a queue, a fire-and-forget goroutine) silently breaks the trace at exactly that hop - the async consumer's logs exist but can't be joined back to the originating request. Fix: the producer must inject the ID into the message payload/headers, and the consumer must read it into its own logging context before emitting anything.

### High-Cardinality Field Cost

Cardinality - the number of distinct values a field can take - is the single biggest lever on both indexing cost and query speed, and it's easy to get wrong without noticing until the bill or the query latency spikes. A field like `http.status_code` (a few dozen values) is cheap to index; a field like `user_id`, `request_id`, or a raw URL with embedded query params (millions of distinct values) is expensive, because most indexes (inverted or columnar) build a distinct structure per unique value, and free-text search over a wide value space forces broader scans. The failure pattern is gradual: someone adds a well-intentioned field (a full URL, a session token, a UUID) to every log line, cardinality silently multiplies index size, and query latency degrades weeks later with no single obvious cause. Fix: keep genuinely high-cardinality identifiers (user IDs, request IDs) as **unindexed or lightly-indexed fields** usable for exact-match lookup, but exclude them from full-text/label indexing paths, and periodically audit which fields the aggregation pipeline is indexing against actual query patterns.

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
                                                            │                              │
                                                            │ ingestion spike               │ indexing tier slow/down
                                                            ▼                              ▼
                                                   queue absorbs burst              consumer lag grows,
                                                   (see Core Mechanics for           replay once healthy
                                                   the local-agent-side branch)      (see below)
```

Without the queue buffer tier, an ingestion spike or a slow indexing tier has nowhere to absorb into - the processor either drops logs immediately or pushes the same backpressure back onto the local agent, which then hits its own disk-buffer limit faster (see [Core Mechanics](#core-mechanics) for that failure branch). The queue turns a hard failure into a bounded, monitorable lag: depth grows under load, and messages replay from the queue once the indexing tier recovers, up to the queue's own retention window - past that window, unreplayed messages are lost.

A message-queue buffer tier (Kafka is the common choice) between shipping and processing is standard at high volume - it absorbs bursty ingestion spikes without requiring the processing tier to be provisioned for peak, and gives the pipeline replay capability if the indexing tier falls behind or needs to be reprocessed.

## Quick Decision Guide

- **Small system, ≤3 services** - direct shipping to a managed log service (CloudWatch Logs, a hosted ELK/Loki instance) is fine; a full local-agent + queue-buffer pipeline is over-engineering at this scale.
- **High-volume, multi-team system** - the full pipeline (local agent → queue buffer → processor → indexed store) earns its complexity; skipping the queue buffer tier is what causes ingestion-spike data loss at this scale.
- **Cost-sensitive at high volume**: retention window and log level (see [Observability § Log Verbosity](./observability.md#sampling--cost-trade-offs)) are the two levers that move the storage bill directly - indexing engine choice matters less than how much you choose to keep and at what verbosity. **Sampling** is a third, distinct lever: instead of lowering verbosity for everyone, keep 100% of error/warn-level logs but deliberately keep only a fraction (e.g. 1-in-N, or a percentage) of high-volume routine INFO/DEBUG lines - a deliberate, tunable cost decision made at emission or the local agent, not the same thing as the pipeline dropping logs under backpressure (that's a failure response, not a policy - see [Core Mechanics](#core-mechanics)).
- **Audit/compliance logs** - route to a separate, immutable, longer-retention stream from general application logs; mixing them into the same pipeline with the same retention policy either over-retains debug noise or under-retains audit trails.

## Storage & Indexing Trade-offs

| Approach | Query speed | Storage cost | Best fit |
| --- | --- | --- | --- |
| Full-text inverted index (Elasticsearch) | Fast for free-text + field search | High (index overhead on every field) | Ad-hoc debugging, unpredictable query patterns |
| Label-indexed, content-unindexed (Loki) | Fast for label filters, slower for full-text within a stream | Low (only labels indexed, log body stored compressed) | High-volume systems where queries are mostly "logs from service X in time range Y" |
| Columnar/OLAP-backed (ClickHouse-based) | Fast for structured field aggregation | Medium | Structured logs queried more like analytics events than free text |

> 🧠 **Thought Process**
> The instinct is to reach for "the best search engine" (Elasticsearch) by default. The senior framing asks what's actually being queried: if most production queries are "give me logs from service X, pod Y, in the last 15 minutes" - a label-indexed system (Loki) is both cheaper and often faster, because it avoids indexing log bodies that are rarely searched by free text. Full inverted-text indexing earns its cost when free-text search across arbitrary fields is the common case, not the exception.

Elasticsearch (the ELK stack) is the workhorse full-text choice most teams reach for first, and runs at large production scale at companies like Netflix and Uber; what actually breaks past real production volume isn't query throughput, it's index bloat from unindexed high-cardinality fields (see [Core Mechanics § High-Cardinality Field Cost](#high-cardinality-field-cost)) silently multiplying cluster storage and degrading query latency over weeks, long after the field was added.

## Resilience & Failure Handling

- **Local buffer and queue buffer failure branches** - see the [Core Mechanics](#core-mechanics) and [Log Aggregation Pipeline](#log-aggregation-pipeline) diagrams for exactly where each tier absorbs load and where it starts shedding it; this is deliberate backpressure design, not a bug.
- **Graceful degradation over blocking** - a logging pipeline should never apply backpressure onto the application's request path; if the pipeline is overwhelmed, the correct failure mode is dropping or sampling logs, not slowing down user-facing requests.

## Production Failure Modes & Gotchas

- **Synchronous remote logging on the request path** - writing a log line via a blocking network call to a remote aggregator inside a request handler ties the request's latency to the logging backend's health; a slow or down log backend then takes down the application itself. Fix: always log locally (stdout/file) and let an out-of-process agent handle shipping.
- **Pipeline overload during the exact incident it's meant to help debug** - log volume spikes hardest during an incident (more errors logged, more retries); see the failure branches in [Core Mechanics](#core-mechanics) and [Log Aggregation Pipeline](#log-aggregation-pipeline) for where that load gets absorbed vs. shed, and [Observability § Observability Pipeline as a Single Point of Failure](./observability.md#production-failure-modes--gotchas) for the general pattern. Logging's specific instance is queue-buffer sizing for peak-during-incident volume, not average volume.
- **Unbounded log line size** - a single log line containing a large payload (a full request/response body, a stack trace with embedded data) can be disproportionately expensive to index and store; cap and truncate large fields at emission time, not after ingestion.
- **PII/secrets leaking into logs** - request bodies, headers, or error messages logged verbatim can capture passwords, tokens, or personal data that then persists in a system with broader read access than the original request path. Requires explicit field-level redaction at the logging-library level, not manual per-call-site discipline.
- **Schema drift breaking the parser** - a deployed service changes a field's type or name (an `error_code` field flips from int to string, a field is renamed) without coordinating with the aggregation pipeline's parsing schema; strict parsers reject the whole line, lenient parsers silently index it as an unstructured blob or drop the offending field. Fix: version the log schema explicitly (a `schema_version` field), validate new fields in CI/staging against the pipeline's parser before rollout, and configure the pipeline to quarantine (not silently drop) unparseable lines to a dead-letter stream for visibility.
- **Malformed lines silently disappearing** - a partially-written line (process killed mid-write), a line exceeding a parser's length limit, or invalid encoding can fail parsing and vanish from the index with no error surfaced to the emitting service; the gap is only noticed later as "missing logs" during an investigation. Fix: the aggregation pipeline should count and expose parse-failure metrics (lines received vs. lines successfully indexed) as its own observability signal, not just process successfully-parsed lines silently.

### Common Misconceptions

- "Structured logging is only about making logs look nicer" - the actual reason it matters is indexability; unstructured logs force the aggregation pipeline into fragile regex parsing or unindexed full-text-only search.
- "More log retention is always safer" - retention past the window anything is realistically queried against (usually days to a few weeks for hot storage) is pure storage cost with no debugging benefit; compliance/audit retention is a separate, deliberate policy, not a default extension of application log retention.

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** Your logging pipeline falls over during every major incident, right when you need it most. Why, and how do you fix it?
> **Ideal answer:** Log volume spikes hardest exactly during incidents, and if the pipeline is sized for average rather than incident-time peak, it falls behind or drops data at exactly the wrong moment - see the failure branches in [Core Mechanics](#core-mechanics) and [Log Aggregation Pipeline](#log-aggregation-pipeline) for where each tier absorbs vs. sheds load. Fix: size the queue buffer for peak-during-incident volume, not average, and never let the application block on the logging backend.
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
