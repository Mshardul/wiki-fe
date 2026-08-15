# Circuit Breaker

## Prerequisites

- **[Idempotency](./idempotency.md)** [Must read]
- **[Load Balancer](../components/load-balancer.md)** [Should read]

---

## Table of Contents

- [TLDR](#tldr)
- [What It Is](#what-it-is)
- [The Three States](#the-three-states)
- [State Transition Mechanics](#state-transition-mechanics)
- [Failure Detection Strategies](#failure-detection-strategies)
- [Configuration Parameters](#configuration-parameters)
- [Fallback Strategies](#fallback-strategies)
- [Observability & Debugging](#observability--debugging)
- [Often Confused With](#often-confused-with)
- [When To Use](#when-to-use)
- [Common Misapplications & Gotchas](#common-misapplications--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

A circuit breaker wraps a remote call and stops issuing it once failures cross a threshold, failing fast locally instead of piling up timeouts against a struggling dependency. It moves through three states - Closed (calling normally), Open (rejecting immediately), Half-Open (a trial call to test recovery) - and the core decision is tuning that transition: too sensitive and it trips on noise, too slow and it doesn't protect anything. Netflix's Hystrix popularized the pattern at scale; the failure mode that shows up past a few hundred dependent services is breaker storms, where one slow dependency trips breakers in every caller simultaneously and the aggregate fallback traffic becomes its own incident.

---

## What It Is

**Analogy:** an electrical circuit breaker in a house - when current draw spikes (a short circuit), the breaker trips and cuts power to that circuit rather than letting the wiring overheat and start a fire. It doesn't fix the short; it stops the damage from spreading while someone investigates.

**Mental model:** a circuit breaker is a client-side safety valve, not a retry mechanism - retries try harder against a failing dependency, a circuit breaker gives up on purpose to protect the caller (and, indirectly, the callee) from a failure that retrying can't fix.

---

## The Three States

```
        failure threshold exceeded
   ┌──────────────────────────────────┐
   │                                   ▼
[CLOSED] ────────────────────────► [OPEN]
   ▲          (calls flow through,       │
   │           failures counted)         │ timeout elapses
   │                                     ▼
   └──────────────────────────── [HALF-OPEN]
     trial call succeeds          (one/few trial calls)
                                        │
                                        │ trial call fails
                                        ▼
                                     [OPEN]
```

**Closed:** the default state. Requests pass through to the dependency normally. The breaker counts failures (and successes) in a rolling window, watching for the trip condition.

**Open:** the breaker trips when the failure count/rate crosses its configured threshold. While open, every call fails immediately without contacting the dependency at all - no network call, no timeout wait, just an instant local rejection (typically routed to a fallback, see [Fallback Strategies](#fallback-strategies)).

**Half-Open:** after a configured timeout, the breaker allows a small number of trial requests through to test whether the dependency has recovered. A trial success transitions back to Closed; a trial failure sends it back to Open and resets the timeout clock.

> ⚠️ **Warning / Gotcha**
> Open state's value is entirely in the local, instant rejection. If "open" is implemented as "still send the call but immediately return the fallback anyway," the dependency never gets relief and the breaker isn't actually protecting anything - it's decorative.

---

## State Transition Mechanics

**Closed → Open:** triggered by a failure-rate or failure-count threshold within a rolling window (e.g. "≥50% of the last 20 calls failed" or "≥10 failures in 10 seconds"), not a single failure - a single timeout on an otherwise healthy dependency shouldn't trip the whole breaker.

**Open → Half-Open:** a fixed reset timeout (commonly 5-60 seconds, tuned to the dependency's typical recovery time). This is a timer, not a health check - the breaker doesn't know the dependency has recovered, it's just willing to find out.

**Half-Open → Closed:** the trial call (or calls - some implementations allow a small burst, e.g. 5 trial requests) succeeds. Some implementations require multiple consecutive trial successes before fully closing, to avoid flapping on a dependency that's still borderline.

**Half-Open → Open:** the trial call fails. The reset timeout restarts from zero - the breaker doesn't get more lenient after repeated failed recovery attempts, it goes back to waiting the full interval again.

> 🧠 **Thought Process**
> The half-open trial count is itself a trade-off: one trial call recovers fastest (minimal extra load on a struggling dependency) but is more prone to a false-positive close if that one call got lucky; five trial calls is a more reliable signal but sends more load at exactly the moment the dependency is least able to take it. Most production breakers default to 1, favoring caution over speed of recovery detection.

---

## Failure Detection Strategies

What counts as a "failure" for the threshold isn't just connection errors - the strategy determines what the breaker actually protects against.

| Strategy | Counts as failure | Misses |
| --- | --- | --- |
| Exception-based | Thrown exceptions, connection errors, non-2xx status | Slow-but-successful calls (the classic gap) |
| Timeout-based | Calls exceeding a latency threshold | Fast failures that aren't the real problem |
| Combined (production default) | Exceptions, non-2xx, AND calls exceeding a latency SLA | Nothing meaningful - most complete signal |

**Latency as a failure signal matters as much as errors.** A dependency returning HTTP 200 after 30 seconds is not "working" from the caller's perspective - it's holding a thread/connection slot the caller needed back. Production breakers (Hystrix, resilience4j) treat "too slow" as a failure type distinct from "errored," often with its own threshold, because a dependency that's merely slow degrades every caller's own latency budget even without throwing a single exception.

> ⚖️ **Decision Framework**
> Exception-only detection is simpler to reason about but blind to the most common real-world degradation pattern (a dependency getting slow before it starts erroring outright). Combined detection catches this earlier at the cost of one more tunable threshold (the latency SLA) that needs calibrating per dependency - too tight and normal p99 tail latency trips it; too loose and it doesn't help.

---

## Configuration Parameters

| Parameter | What it controls | Typical starting point |
| --- | --- | --- |
| Failure threshold | Rate or count that trips Closed → Open | 50% failure rate over a rolling window |
| Rolling window size | How many recent calls (or how much recent time) the threshold is measured over | 10-20 calls, or 10-second window |
| Minimum request volume | Calls required in the window before the threshold can trip at all | 20 requests - prevents tripping on 2 failures out of 3 calls during low traffic |
| Reset timeout | How long Open waits before trying Half-Open | 5-60s, tuned to dependency's typical recovery time |
| Trial call count | Requests allowed through in Half-Open | 1 (conservative default) |
| Latency SLA (if combined detection) | Call duration counted as a failure | p99 of healthy baseline + margin |

**Minimum request volume** is the parameter most often missing from a naive implementation and the one that causes the most false trips: without it, a low-traffic dependency can trip its breaker from 2 failures out of 3 total calls, which is statistical noise, not a real outage signal.

---

## Fallback Strategies

Open state must resolve to *something* returned to the caller - the fallback is as much a design decision as the breaker itself.

- **Static default** - a hardcoded safe value (empty list, `false`, cached "reasonable default"). Simplest, works when staleness is acceptable and a wrong-but-safe answer beats no answer.
- **Cached last-known-good** - return the last successful response, possibly stale. Better UX than a static default when the data changes slowly (product catalog, user profile) but risks serving meaningfully outdated data silently unless staleness is surfaced to the caller.
- **Degraded/secondary path** - call a cheaper, less-accurate, or less-personalized alternative (a simpler ranking algorithm, a different cheaper provider). Preserves function at reduced quality rather than failing outright.
- **Fail fast to the caller** - propagate the failure immediately with no fallback. Correct when there's no safe default and pretending to succeed is worse than an honest error (a payment authorization has no acceptable "best guess" fallback).

> ⚖️ **Decision Framework**
> The fallback choice tracks the same cost-of-being-wrong reasoning as everywhere else in resilience design: cheap-to-be-wrong data (recommendation rankings, a "trending now" widget) tolerates cached/degraded fallbacks; expensive-to-be-wrong data (payment state, inventory counts, auth decisions) should fail fast rather than fabricate a plausible-looking wrong answer.

---

## Observability & Debugging

**Interviewer TL;DR:** The signal that matters most is state transitions per breaker, not just the count of open breakers right now - a breaker flapping between Half-Open and Open every few seconds is a different (and worse) problem than one cleanly Open for an hour.

**Per-breaker state gauge** - export current state (Closed/Open/Half-Open) as a labeled metric per dependency. The first thing to check when a downstream call is failing: is the breaker even letting calls through right now.

**Trip rate and trip reason** - count state transitions to Open, labeled by which detection strategy triggered it (exception vs latency-SLA breach, see [Failure Detection Strategies](#failure-detection-strategies)). A breaker tripping repeatedly on latency alone versus repeatedly on hard errors points to different root causes.

**Fallback invocation rate** - how often the fallback path is actually being served, separate from raw error rate. A high fallback rate with a low raw error rate means the breaker (not the dependency) is the thing currently shaping user-facing behavior - worth knowing before assuming the dependency itself is unhealthy.

> ⚠️ **Gotcha:** A breaker cleanly stuck Open for a long stretch is easy to spot; one flapping Open → Half-Open → Open in a tight loop often isn't, because each individual state shows up briefly and self-resolves. Alert on transition *frequency* over a window, not just on time-in-Open, or repeated flapping against a still-broken dependency looks like intermittent health from a dashboard glancing at current state alone.

---

## Often Confused With

**Retries:** a retry re-attempts the *same* call, assuming the failure might be transient (a single dropped packet). A circuit breaker stops attempting the call altogether once failures indicate the problem isn't transient. They compose, not compete: retry a handful of times for genuine blips, and let the circuit breaker trip after sustained failure to stop retrying into a dependency that's actually down. Retrying against an open circuit breaker defeats the entire point of the breaker - always check breaker state before retrying, never retry unconditionally.

**Timeouts:** a timeout bounds how long *one call* waits before giving up; a circuit breaker decides whether to *attempt the call at all* based on recent history across many calls. A system needs both - a timeout without a breaker still hammers a dead dependency with new calls that each individually time out slowly; a breaker without a timeout can't detect the "slow but not yet failed" calls that should count toward tripping it.

**Bulkheads:** a bulkhead isolates resource pools (thread pools, connection pools) per dependency so one dependency's exhaustion can't starve calls to a different, healthy dependency. A circuit breaker decides *whether to call*; a bulkhead limits *how much of your capacity a single dependency can consume even while healthy*. Hystrix implements both together for exactly this reason - the breaker alone doesn't stop a slow dependency from exhausting a shared thread pool before the trip threshold is even reached.

---

## When To Use

Circuit breakers protect **callers** of a dependency, and are most valuable when: the dependency can genuinely fail or degrade independently of the caller, a fallback exists that's better than propagating the failure, and failing fast matters more than trying harder (user-facing request paths, not batch jobs with generous time budgets). Applied to internal service-to-service calls, third-party API integrations, and database/cache connections behind a connection pool.

Skip it for calls where there's no meaningful fallback and failing fast provides no benefit over the caller's own timeout - a background job that can simply retry on its next scheduled run doesn't need the added complexity.

Netflix's Hystrix was the reference implementation that popularized this pattern for microservices at scale, though it's now in maintenance mode in favor of resilience4j and service-mesh-level circuit breaking (Envoy, Istio). At scale (hundreds of interdependent services), the failure mode that dominates isn't a single breaker misfiring - it's **breaker storms**: one genuinely slow dependency causes every caller's breaker to trip near-simultaneously, and the resulting fallback traffic (all callers hitting their cache/degraded path at once) becomes a secondary load spike of its own.

---

## Common Misapplications & Gotchas

**Treating the breaker as a retry mechanism.** A breaker that reopens and closes rapidly without any backoff on the calling side just adds latency variance without providing protection - see [Often Confused With](#often-confused-with).

**No minimum request volume.** Low-traffic dependencies trip on statistical noise (2 failures out of 3 calls) without this guard - see [Configuration Parameters](#configuration-parameters).

**Per-instance breaker state in a horizontally scaled caller.** If each caller instance tracks its own breaker state independently, one instance can be Open while nine others are still Closed and hammering the same struggling dependency - the aggregate protection is much weaker than the per-instance configuration implies. Shared breaker state (via a coordination service) fixes this but adds a new dependency of its own; most production systems accept per-instance state as good-enough since each instance's traffic share is a fraction of the total load anyway.

**Fallback that silently masks a real outage.** A cached-last-known-good fallback that never expires or surfaces staleness can hide a dependency being down for hours - the caller "succeeds" while serving increasingly stale data with no alert firing. Always pair a fallback with a metric/alert on breaker-open duration, not just on raw error rate (which the fallback suppresses).

### Common Misconceptions

**"A circuit breaker fixes the failing dependency."** No - it protects the *caller* from a failing dependency; the dependency itself still needs its own remediation (scaling, restart, rollback). The breaker only stops the caller from making things worse via retry pressure.

**"Open state means the dependency is definitely down."** No - it means the failure threshold was crossed, which could be a real outage, a transient blip that happened to cluster in the window, or the caller's own network issue. The breaker reacts to observed symptoms, not root cause.

---

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** Why not just use a retry with backoff instead of a circuit breaker?
> **Ideal answer:** Retries assume the failure is transient and worth re-attempting; a circuit breaker recognizes when it isn't and stops trying altogether. Retrying into a genuinely down dependency multiplies load on something already struggling and burns the caller's own latency/thread budget on calls that will fail anyway. The two compose: retry a bounded number of times for real blips, let the breaker trip if failures persist past that.
> **Common trap:** Presenting them as alternatives rather than composable layers - a mature resilience stack has both, plus timeouts and often bulkheads.
> **Next question:** "Your breaker just tripped to Open. What should the client's retry logic do?" → Stop retrying immediately and use the fallback - checking breaker state before retrying is what prevents retries from defeating the breaker's purpose.

> 🎯 **Interview Lens**
> **Q:** How do you decide the failure threshold and reset timeout for a new circuit breaker?
> **Ideal answer:** Threshold should be set against the dependency's normal failure-rate baseline plus margin (not a global default like "50%" applied blindly) - a dependency with a normal 5% error rate needs a different threshold than one that's normally at 0.1%. Reset timeout should track the dependency's typical recovery time (a database failover might take 30s; a downstream service restart might take 2 minutes) - too short wastes trial calls on a still-recovering dependency, too long delays recovery detection unnecessarily.
> **Common trap:** Copying a fixed threshold/timeout pair across every breaker in the system regardless of the dependency's actual behavior profile.
> **Next question:** "Your reset timeout is 30 seconds but the dependency actually takes 5 minutes to recover from this failure class. What happens?" → The breaker cycles Open → Half-Open → Open every 30 seconds, sending a small trial-call trickle the whole time - mostly harmless but not actively helpful; tune the timeout empirically per dependency and failure class, not once, generically, up front.

> 🎯 **Interview Lens**
> **Q:** What's a breaker storm, and how would you prevent one?
> **Ideal answer:** When one shared dependency degrades, every caller's breaker trips at roughly the same time (they're all observing the same failure signal), and the resulting simultaneous shift to fallback paths (cache lookups, degraded-mode calls, alerting) becomes a load spike in its own right - sometimes worse than the original degradation. Mitigations: jitter on reset timeouts so callers don't all retry the trial call in the same instant, and making sure the fallback path itself has capacity headroom sized for "every caller uses it at once," not just occasional use.
> **Common trap:** Treating each caller's circuit breaker as an isolated concern and not considering what happens when hundreds of them react to the same signal simultaneously.

---

## Appendices

### Acronyms & Abbreviations

None specific to this article.

### Anti-patterns

- **Breaker with no minimum request volume** - trips on statistical noise during low traffic; see [Common Misapplications & Gotchas](#common-misapplications--gotchas).
- **Exception-only failure detection on a latency-sensitive path** - misses the "slow but technically successful" degradation pattern that's often the earliest real signal; see [Failure Detection Strategies](#failure-detection-strategies).
- **Fallback with no staleness signal or alert** - masks a real outage as a quiet success; see [Common Misapplications & Gotchas](#common-misapplications--gotchas).
- **Unconditional retry against an open breaker** - defeats the breaker's purpose entirely; see [Often Confused With](#often-confused-with).
